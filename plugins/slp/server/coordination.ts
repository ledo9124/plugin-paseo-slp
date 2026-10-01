import type { Assignment, Brief, Decision, Finding, Ledger, Role } from "../shared/contracts";
import type { SlpSettings } from "../shared/settings";
import type { PaseoHost } from "./paseo-host";
import type { WorkspaceQueue } from "./queue";
import { roleInstructions } from "./roles";
import { GROUP_LABEL, PREAPPROVED_TOOLS, ROLE_LABEL, SlpError, slpMcpServers } from "./slp-service";
import type { GroupRecord, HeldMessage, MemberRecord, SlpStore, WorkspaceRecord } from "./store";

// Group coordination: messaging (decision 0004), delegation, handback,
// acceptance, findings, and decisions in the ledger (decisions 0001, 0003).

export type Delivery = "after-turn" | "steer";

const BUSY_STATUSES = new Set(["running", "initializing"]);

export interface CoordinationDeps {
  store: SlpStore;
  queue: WorkspaceQueue;
  mcpUrl(secret: string): string;
  settings(): Promise<SlpSettings>;
  now(): string;
  newId(): string;
  newSecret(): string;
}

interface Caller {
  record: WorkspaceRecord;
  group: GroupRecord;
  member: MemberRecord;
}

export interface DelegateInput {
  title: string;
  kind: Assignment["kind"];
  scope: string;
  brief: Brief;
  /** One of the allowed `provider/model` values; the first is the default. */
  model?: string;
  /** Give the assignment to this existing Peer instead of creating one. */
  peerAgentId?: string;
}

export interface DecideInput {
  text: string;
  source: Decision["source"];
  status: Decision["status"];
  findingId?: string;
  projectRecord?: string;
  /** Settle this pending decision instead of recording a new one. */
  settles?: string;
  /** Members whose work the decision affects; each is told after its turn. */
  notify?: string[];
}

export class Coordination {
  constructor(private readonly deps: CoordinationDeps) {}

  // ---- Tools ----------------------------------------------------------------

  groupInfo(secret: string) {
    const caller = this.resolve(secret);
    return {
      workspaceId: caller.record.workspaceId,
      groupId: caller.group.id,
      you: { role: caller.member.role, agentId: caller.member.agentId },
      members: caller.group.members.map(({ role, agentId, title }) => ({ role, agentId, title: title ?? null })),
    };
  }

  async ledger(secret: string) {
    const caller = this.resolve(secret);
    const settings = await this.deps.settings();
    return {
      you: { role: caller.member.role, agentId: caller.member.agentId },
      ...caller.group.ledger,
      ...(caller.member.role === "lead"
        ? { peerModels: settings.peers.models, maxActivePeers: settings.peers.maxActive }
        : {}),
    };
  }

  send(host: PaseoHost, secret: string, input: { to: string; text: string; delivery?: Delivery }) {
    return this.withCaller(secret, async (caller) => {
      const recipient = this.findMember(caller.group, input.to);
      if (!recipient?.agentId) throw new SlpError("invalid", `No group member "${input.to}". Use slp_group for ids.`);
      if (recipient.agentId === caller.member.agentId) throw new SlpError("invalid", "You cannot message yourself.");
      const outcome = await this.deliver(
        host,
        caller.group,
        {
          fromAgentId: caller.member.agentId,
          fromRole: caller.member.role,
          toAgentId: recipient.agentId,
          kind: "message",
          text: input.text,
        },
        input.delivery ?? "after-turn",
      );
      this.save(caller);
      return { delivered: outcome, to: { role: recipient.role, agentId: recipient.agentId } };
    });
  }

  delegate(host: PaseoHost, secret: string, input: DelegateInput) {
    return this.withCaller(secret, async (caller) => {
      this.requireRole(caller, ["lead"], "slp_delegate");
      const settings = await this.deps.settings();
      const assignment: Assignment = {
        id: this.shortId("A", caller.group.ledger.assignments.length),
        title: input.title,
        kind: input.kind,
        scope: input.scope,
        brief: input.brief,
        peerAgentId: null,
        status: "assigned",
        createdAt: this.deps.now(),
        handbacks: 0,
        lastHandbackAt: null,
        acceptance: null,
      };

      if (input.peerAgentId) {
        const peer = caller.group.members.find((m) => m.role === "peer" && m.agentId === input.peerAgentId);
        if (!peer?.agentId) throw new SlpError("invalid", `${input.peerAgentId} is not a Peer of this group.`);
        const agent = await host.getAgent(peer.agentId);
        if (!agent || agent.archivedAt) throw new SlpError("invalid", `Peer ${peer.agentId} is archived.`);
        const open = this.openAssignmentOf(caller.group.ledger, peer.agentId);
        if (open) {
          throw new SlpError(
            "invalid",
            `Peer ${peer.agentId} still holds ${open.id} (${open.status}). Accept or drop it with slp_accept first.`,
          );
        }
        assignment.peerAgentId = peer.agentId;
        caller.group.ledger.assignments.push(assignment);
        await this.deliver(
          host,
          caller.group,
          {
            fromAgentId: caller.member.agentId,
            fromRole: "lead",
            toAgentId: peer.agentId,
            kind: "message",
            text: renderBrief(assignment),
          },
          "after-turn",
        );
        this.event(caller.group, "delegate", { assignmentId: assignment.id, peer: peer.agentId, reused: true });
        this.save(caller);
        return { assignmentId: assignment.id, peerAgentId: peer.agentId, created: false };
      }

      const model = input.model ?? settings.peers.models[0];
      if (!settings.peers.models.includes(model)) {
        throw new SlpError("invalid", `Model ${model} is not allowed. Allowed: ${settings.peers.models.join(", ")}.`);
      }
      const modeId = settings.peers.modes[model.split("/")[0]];
      if (!modeId) throw new SlpError("invalid", `No Peer mode is configured for provider ${model.split("/")[0]}.`);
      const active = await this.activePeers(host, caller.group);
      if (active.length >= settings.peers.maxActive) {
        const free = active.filter((peer) => !this.openAssignmentOf(caller.group.ledger, peer.agentId!));
        throw new SlpError(
          "limit",
          `${active.length} Peers are active (max ${settings.peers.maxActive}). ` +
            (free.length
              ? `Reassign one with no open assignment via peerAgentId: ${free.map((p) => p.agentId).join(", ")}.`
              : "Accept or drop an assignment, then reassign its Peer."),
        );
      }

      const peerNumber = caller.group.members.filter((m) => m.role === "peer").length + 1;
      const member: MemberRecord = {
        role: "peer",
        secret: this.deps.newSecret(),
        agentId: null,
        title: `SLP Peer ${peerNumber}`,
      };
      caller.group.members.push(member);
      caller.group.ledger.assignments.push(assignment);
      this.save(caller);
      try {
        const agent = await host.createAgent({
          workspaceId: caller.record.workspaceId,
          provider: model,
          modeId,
          title: member.title,
          systemPrompt: roleInstructions("peer"),
          mcpServers: slpMcpServers(this.deps.mcpUrl(member.secret)),
          preapprovedTools: PREAPPROVED_TOOLS,
          labels: { [GROUP_LABEL]: caller.group.id, [ROLE_LABEL]: "peer" },
          idempotencyKey: `slp:${caller.group.id}:peer:${assignment.id}`,
          prompt: renderBrief(assignment),
        });
        member.agentId = agent.id;
        assignment.peerAgentId = agent.id;
      } catch (error) {
        caller.group.members = caller.group.members.filter((m) => m !== member);
        caller.group.ledger.assignments = caller.group.ledger.assignments.filter((a) => a !== assignment);
        this.save(caller);
        throw error;
      }
      this.event(caller.group, "delegate", { assignmentId: assignment.id, peer: member.agentId, model, reused: false });
      this.save(caller);
      return { assignmentId: assignment.id, peerAgentId: member.agentId, created: true };
    });
  }

  accept(
    host: PaseoHost,
    secret: string,
    input: { assignmentId: string; outcome: "accepted" | "rework" | "dropped"; reason: string },
  ) {
    return this.withCaller(secret, async (caller) => {
      this.requireRole(caller, ["lead"], "slp_accept");
      const assignment = caller.group.ledger.assignments.find((a) => a.id === input.assignmentId);
      if (!assignment) throw new SlpError("invalid", `No assignment ${input.assignmentId}.`);
      if (assignment.status === "accepted" || assignment.status === "dropped") {
        throw new SlpError("invalid", `${assignment.id} is already ${assignment.status}.`);
      }
      if (input.outcome === "accepted" && assignment.status !== "handed-back") {
        throw new SlpError("invalid", `${assignment.id} has not been handed back yet; judge a result, not a promise.`);
      }
      assignment.acceptance = { outcome: input.outcome, reason: input.reason, at: this.deps.now() };
      assignment.status = input.outcome === "rework" ? "assigned" : input.outcome;
      if (input.outcome !== "accepted" && assignment.peerAgentId) {
        const verb = input.outcome === "rework" ? "needs rework" : "was dropped";
        await this.deliver(
          host,
          caller.group,
          {
            fromAgentId: caller.member.agentId,
            fromRole: "lead",
            toAgentId: assignment.peerAgentId,
            kind: "message",
            text: `Assignment ${assignment.id} "${assignment.title}" ${verb}: ${input.reason}`,
          },
          "after-turn",
        );
      }
      this.event(caller.group, "acceptance", { assignmentId: assignment.id, outcome: input.outcome });
      this.save(caller);
      return { assignmentId: assignment.id, status: assignment.status };
    });
  }

  finding(
    host: PaseoHost,
    secret: string,
    input: { kind: Finding["kind"]; assignmentId?: string; text: string; evidence: string },
  ) {
    return this.withCaller(secret, async (caller) => {
      if (input.assignmentId && !caller.group.ledger.assignments.some((a) => a.id === input.assignmentId)) {
        throw new SlpError("invalid", `No assignment ${input.assignmentId}.`);
      }
      const finding: Finding = {
        id: this.shortId("F", caller.group.ledger.findings.length),
        kind: input.kind,
        assignmentId: input.assignmentId ?? null,
        text: input.text,
        evidence: input.evidence,
        by: { role: caller.member.role, agentId: caller.member.agentId },
        status: "open",
        resolvedBy: null,
        at: this.deps.now(),
      };
      caller.group.ledger.findings.push(finding);
      const lead = caller.group.members.find((m) => m.role === "lead");
      if (lead?.agentId && caller.member.role !== "lead") {
        await this.deliver(
          host,
          caller.group,
          {
            fromAgentId: caller.member.agentId,
            fromRole: caller.member.role,
            toAgentId: lead.agentId,
            kind: "notice",
            text:
              `Finding ${finding.id} (${finding.kind}${finding.assignmentId ? `, ${finding.assignmentId}` : ""}): ${finding.text}\n` +
              `Evidence: ${finding.evidence}\nDecide with slp_decide (findingId ${finding.id}): change the plan or consciously keep it.`,
          },
          "after-turn",
        );
      }
      this.event(caller.group, "finding", { findingId: finding.id, kind: finding.kind, by: caller.member.role });
      this.save(caller);
      return { findingId: finding.id };
    });
  }

  decide(host: PaseoHost, secret: string, input: DecideInput) {
    return this.withCaller(secret, async (caller) => {
      this.requireRole(caller, ["lead", "supervisor"], "slp_decide");
      if (input.source === "human" && caller.member.role !== "supervisor") {
        throw new SlpError("forbidden", "Only the Supervisor records Human's decisions (source \"human\").");
      }
      const ledger = caller.group.ledger;
      const finding = input.findingId ? ledger.findings.find((f) => f.id === input.findingId) : undefined;
      if (input.findingId && !finding) throw new SlpError("invalid", `No finding ${input.findingId}.`);

      let decision: Decision;
      if (input.settles) {
        if (caller.member.role !== "supervisor") {
          throw new SlpError("forbidden", "A pending decision waits for Human; only the Supervisor settles it.");
        }
        const pending = ledger.decisions.find((d) => d.id === input.settles);
        if (!pending || pending.status !== "pending") {
          throw new SlpError("invalid", `${input.settles} is not a pending decision.`);
        }
        Object.assign(pending, {
          text: input.text,
          source: input.source,
          status: input.status,
          by: { role: caller.member.role, agentId: caller.member.agentId },
          projectRecord: input.projectRecord ?? pending.projectRecord,
          at: this.deps.now(),
        });
        decision = pending;
      } else {
        decision = {
          id: this.shortId("D", ledger.decisions.length),
          text: input.text,
          source: input.source,
          status: input.status,
          by: { role: caller.member.role, agentId: caller.member.agentId },
          findingId: finding?.id ?? null,
          projectRecord: input.projectRecord ?? null,
          at: this.deps.now(),
        };
        ledger.decisions.push(decision);
      }
      const resolved = finding ?? ledger.findings.find((f) => f.id === decision.findingId);
      if (decision.status === "settled" && resolved?.status === "open") {
        resolved.status = "resolved";
        resolved.resolvedBy = decision.id;
      }

      const recipients = new Set(input.notify ?? []);
      if (decision.status === "pending" && caller.member.role === "lead") {
        const supervisor = caller.group.members.find((m) => m.role === "supervisor");
        if (supervisor?.agentId) recipients.add(supervisor.agentId);
      }
      if (input.settles && caller.member.role === "supervisor") {
        const lead = caller.group.members.find((m) => m.role === "lead");
        if (lead?.agentId) recipients.add(lead.agentId);
      }
      recipients.delete(caller.member.agentId ?? "");
      for (const agentId of recipients) {
        if (!caller.group.members.some((m) => m.agentId === agentId)) {
          throw new SlpError("invalid", `notify: ${agentId} is not a group member.`);
        }
      }
      for (const agentId of recipients) {
        await this.deliver(
          host,
          caller.group,
          {
            fromAgentId: caller.member.agentId,
            fromRole: caller.member.role,
            toAgentId: agentId,
            kind: "notice",
            text: renderDecision(decision),
          },
          "after-turn",
        );
      }
      this.event(caller.group, "decision", {
        decisionId: decision.id,
        source: decision.source,
        status: decision.status,
        findingId: decision.findingId,
        settled: Boolean(input.settles),
      });
      this.save(caller);
      return { decisionId: decision.id, status: decision.status, notified: [...recipients] };
    });
  }

  // ---- Lifecycle ------------------------------------------------------------

  /** Delivers held messages and relays a Peer's reply to the Lead (handback). */
  async onTurnEnded(
    host: PaseoHost,
    event: {
      agentId: string;
      workspaceId: string | null;
      outcome: { kind: string; error?: { message: string } };
      lastReply: string | null;
    },
  ): Promise<void> {
    if (!event.workspaceId) return;
    await this.deps.queue.run(event.workspaceId, async () => {
      const record = this.deps.store.get(event.workspaceId!);
      const group = record?.group;
      if (!record || !group || group.endedAt) return;
      const member = group.members.find((m) => m.agentId === event.agentId);
      if (!member) return;

      if (member.role === "peer" && event.outcome.kind !== "canceled") {
        await this.relayPeerReply(host, group, member, event);
      }
      await this.flush(host, group, event.agentId);
      this.deps.store.put(record);
    });
  }

  /** Delivers held messages whose recipient is idle; covers missed turn events. */
  async reconcile(host: PaseoHost): Promise<number> {
    let delivered = 0;
    for (const { workspaceId } of this.deps.store.all()) {
      await this.deps.queue.run(workspaceId, async () => {
        const record = this.deps.store.get(workspaceId);
        const group = record?.group;
        if (!record || !group || group.endedAt || group.held.length === 0) return;
        for (const agentId of new Set(group.held.map((m) => m.toAgentId))) {
          const agent = await host.getAgent(agentId).catch(() => null);
          if (agent?.archivedAt) {
            group.held = group.held.filter((m) => m.toAgentId !== agentId);
            this.event(group, "held-dropped", { to: agentId, reason: "archived" });
          } else if (agent && !BUSY_STATUSES.has(agent.status)) {
            delivered += await this.flush(host, group, agentId);
          }
        }
        this.deps.store.put(record);
      });
    }
    return delivered;
  }

  ledgerView(workspaceId: string) {
    const group = this.deps.store.get(workspaceId)?.group ?? null;
    return {
      groupId: group?.id ?? null,
      ledger: group?.ledger ?? { assignments: [], findings: [], decisions: [] },
      heldMessages: group?.held.length ?? 0,
      events: group?.events.slice(-200) ?? [],
    };
  }

  // ---- Internals ------------------------------------------------------------

  private async relayPeerReply(
    host: PaseoHost,
    group: GroupRecord,
    peer: MemberRecord,
    event: { outcome: { kind: string; error?: { message: string } }; lastReply: string | null },
  ): Promise<void> {
    const lead = group.members.find((m) => m.role === "lead");
    if (!lead?.agentId || !peer.agentId) return;
    const assignment = this.openAssignmentOf(group.ledger, peer.agentId);
    let text: string;
    let kind: HeldMessage["kind"] = "message";
    if (event.outcome.kind === "failed") {
      text = `${peer.title ?? "Peer"} (${peer.agentId}) turn failed: ${event.outcome.error?.message ?? "unknown error"}`;
      kind = "notice";
    } else if (assignment?.status === "assigned") {
      assignment.status = "handed-back";
      assignment.handbacks += 1;
      assignment.lastHandbackAt = this.deps.now();
      kind = "handback";
      text =
        `Handback for ${assignment.id} "${assignment.title}" from ${peer.title ?? "Peer"} (${peer.agentId}):\n\n` +
        `${event.lastReply ?? "(no reply text)"}\n\n` +
        `Judge it against the goal, then slp_accept ${assignment.id} with accepted, rework, or dropped.`;
      this.event(group, "handback", { assignmentId: assignment.id, peer: peer.agentId });
    } else {
      text = `Reply from ${peer.title ?? "Peer"} (${peer.agentId}):\n\n${event.lastReply ?? "(no reply text)"}`;
    }
    await this.deliver(
      host,
      group,
      { fromAgentId: peer.agentId, fromRole: "peer", toAgentId: lead.agentId, kind, text },
      "after-turn",
    );
  }

  /** after-turn: hold while the recipient is busy. Delivery itself always steers (decision 0004). */
  private async deliver(
    host: PaseoHost,
    group: GroupRecord,
    message: Omit<HeldMessage, "id" | "at">,
    delivery: Delivery,
  ): Promise<"delivered" | "held" | "steered"> {
    const full: HeldMessage = { ...message, id: this.deps.newId(), at: this.deps.now() };
    if (delivery === "after-turn") {
      const recipient = await host.getAgent(message.toAgentId);
      if (recipient && BUSY_STATUSES.has(recipient.status)) {
        group.held.push(full);
        this.event(group, "message", { ...summary(full), delivery, outcome: "held" });
        return "held";
      }
    }
    await host.sendPrompt(message.toAgentId, renderMessages([full]), { activeTurnBehavior: "steer" });
    const outcome = delivery === "steer" ? "steered" : "delivered";
    this.event(group, "message", { ...summary(full), delivery, outcome });
    return outcome;
  }

  private async flush(host: PaseoHost, group: GroupRecord, agentId: string): Promise<number> {
    const pending = group.held.filter((m) => m.toAgentId === agentId);
    if (pending.length === 0) return 0;
    group.held = group.held.filter((m) => m.toAgentId !== agentId);
    try {
      await host.sendPrompt(agentId, renderMessages(pending), { activeTurnBehavior: "steer" });
    } catch (error) {
      group.held.push(...pending);
      throw error;
    }
    this.event(group, "held-delivered", { to: agentId, count: pending.length });
    return pending.length;
  }

  private async activePeers(host: PaseoHost, group: GroupRecord): Promise<MemberRecord[]> {
    const active: MemberRecord[] = [];
    for (const member of group.members) {
      if (member.role !== "peer" || !member.agentId) continue;
      const agent = await host.getAgent(member.agentId).catch(() => null);
      if (agent && !agent.archivedAt) active.push(member);
    }
    return active;
  }

  private openAssignmentOf(ledger: Ledger, agentId: string): Assignment | undefined {
    return ledger.assignments.find(
      (a) => a.peerAgentId === agentId && (a.status === "assigned" || a.status === "handed-back"),
    );
  }

  private findMember(group: GroupRecord, to: string): MemberRecord | undefined {
    return group.members.find((m) => m.agentId === to) ?? group.members.find((m) => m.role === to && m.role !== "peer");
  }

  private resolve(secret: string): Caller {
    const found = this.deps.store.memberForSecret(secret);
    if (!found || found.group.endedAt) throw new SlpError("forbidden", "Unknown or ended SLP member.");
    const record = this.deps.store.get(found.workspaceId)!;
    return { record, group: record.group!, member: found.member };
  }

  private async withCaller<T>(secret: string, work: (caller: Caller) => Promise<T>): Promise<T> {
    const workspaceId = this.resolve(secret).record.workspaceId;
    return this.deps.queue.run(workspaceId, () => work(this.resolve(secret)));
  }

  private requireRole(caller: Caller, roles: Role[], tool: string): void {
    if (!roles.includes(caller.member.role)) {
      throw new SlpError("forbidden", `${tool} is for the ${roles.join(" or ")}; you are the ${caller.member.role}.`);
    }
  }

  private save(caller: Caller): void {
    this.deps.store.put(caller.record);
  }

  private event(group: GroupRecord, kind: string, data: Record<string, unknown>): void {
    group.events.push({ at: this.deps.now(), kind, data });
  }

  private shortId(prefix: string, count: number): string {
    return `${prefix}${count + 1}`;
  }
}

function summary(message: HeldMessage) {
  return { from: message.fromRole, fromAgentId: message.fromAgentId, to: message.toAgentId, kind: message.kind };
}

export function renderMessages(messages: HeldMessage[]): string {
  const blocks = messages.map(
    (m) => `<slp-message from="${m.fromRole}${m.fromAgentId ? ` ${m.fromAgentId}` : ""}" kind="${m.kind}">\n${m.text}\n</slp-message>`,
  );
  const intro =
    messages.length > 1 ? "SLP messages that arrived while you were working:" : "SLP message:";
  return `${intro}\n\n${blocks.join("\n\n")}`;
}

export function renderBrief(assignment: Assignment): string {
  const { brief } = assignment;
  const list = (items: string[]) => (items.length ? items.map((item) => `- ${item}`).join("\n") : "- none recorded");
  return [
    `SLP assignment ${assignment.id}: ${assignment.title}`,
    `Kind: ${assignment.kind}`,
    `You own this scope until the Lead hands it elsewhere: ${assignment.scope}`,
    "",
    `Goal: ${brief.goal}`,
    "",
    "Binding constraints (each with its source):",
    list(brief.constraints.map((c) => `${c.text} (source: ${c.source})`)),
    "",
    `Current design choice (the Lead's working choice, not a binding constraint): ${brief.currentChoice}`,
    "",
    "Open uncertainties:",
    list(brief.uncertainties),
    "",
    "Evidence that would reopen this direction:",
    list(brief.reopenEvidence),
    "",
    "End your turn with a handback: what you did, the evidence, what is unresolved, and anything that",
    "should change the plan. If the premise looks wrong, record slp_finding (kind reopen) with evidence.",
  ].join("\n");
}

function renderDecision(decision: Decision): string {
  const state =
    decision.status === "pending"
      ? "PENDING: needs Human through the Supervisor"
      : `settled (source: ${decision.source})`;
  return [
    `Decision ${decision.id} ${state}: ${decision.text}`,
    decision.findingId ? `Resolves finding ${decision.findingId}.` : null,
    decision.projectRecord ? `Project record: ${decision.projectRecord}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}
