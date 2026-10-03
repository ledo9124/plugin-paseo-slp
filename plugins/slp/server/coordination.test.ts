import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Brief } from "../shared/contracts";
import { Coordination } from "./coordination";
import { FakePaseoHost } from "./paseo-host.fake";
import { buildReport, renderReport } from "./report";
import { WorkspaceQueue } from "./queue";
import { SlpService } from "./slp-service";
import { SlpStore } from "./store";
import { TemplateStore } from "./template-store";

const SETTINGS = {
  supervisor: { provider: "claude/claude-opus-5-5", modeId: "auto" },
  lead: { provider: "claude/claude-sonnet-5-5", modeId: "auto" },
  peers: {
    models: ["claude/claude-sonnet-5-5", "codex/gpt-6-luna"],
    maxActive: 2,
    modes: { claude: "auto", codex: "full-access" },
  },
};

const skill = (name: string, when: string) =>
  `---\nname: ${name}\ndescription: The ${name} way\n---\n# ${name}\nWhen to use: ${when}\n1. Step one\n`;
const REVIEW = skill("review", "a diff needs review");
const BUGFIX = skill("bugfix", "something is broken");

const BRIEF: Brief = {
  goal: "Users can export reports as CSV",
  constraints: [{ text: "No new runtime dependency", source: "Human" }],
  currentChoice: "Stream rows from the existing query",
  uncertainties: ["Row count limits"],
  reopenEvidence: ["Exports over 100k rows time out"],
};

async function setup() {
  let counter = 0;
  const deps = {
    store: new SlpStore(mkdtempSync(join(tmpdir(), "slp-coord-"))),
    templates: new TemplateStore(mkdtempSync(join(tmpdir(), "slp-coord-tpl-")), [REVIEW, BUGFIX]),
    queue: new WorkspaceQueue(),
    mcpUrl: (secret: string) => `http://mcp.test/mcp/${secret}`,
    settings: async () => SETTINGS,
    now: () => `t${++counter}`,
    newId: () => `id-${++counter}`,
    newSecret: () => `secret-${++counter}`,
  };
  const host = new FakePaseoHost();
  const service = new SlpService(deps);
  const coordination = new Coordination(deps);
  await service.setMode(host, "ws", "on");
  const members = () => deps.store.get("ws")!.group!.members;
  const secretOf = (role: string, index = 0) => members().filter((m) => m.role === role)[index].secret;
  const idOf = (role: string, index = 0) => members().filter((m) => m.role === role)[index].agentId!;
  const group = () => deps.store.get("ws")!.group!;
  host.sends.length = 0;
  return { host, service, coordination, deps, secretOf, idOf, group };
}

const delegateInput = { title: "CSV export", kind: "implement" as const, scope: "src/export/", brief: BRIEF };

describe("slp_send", () => {
  it("delivers at once, by steering, when the recipient is idle", async () => {
    const { host, coordination, secretOf, idOf } = await setup();
    const result = await coordination.send(host, secretOf("supervisor"), { to: "lead", text: "Goal: CSV export" });

    expect(result.delivered).toBe("delivered");
    expect(host.sends).toEqual([
      { agentId: idOf("lead"), text: expect.stringContaining("Goal: CSV export"), activeTurnBehavior: "steer" },
    ]);
    expect(host.sends[0].text).toContain('from="supervisor');
  });

  it("holds after-turn messages for a busy recipient and delivers them together when its turn ends", async () => {
    const { host, coordination, secretOf, idOf, group } = await setup();
    host.agents.get(idOf("lead"))!.status = "running";
    await coordination.send(host, secretOf("supervisor"), { to: "lead", text: "first" });
    await coordination.send(host, secretOf("supervisor"), { to: idOf("lead"), text: "second" });

    expect(host.sends).toEqual([]);
    expect(group().held).toHaveLength(2);

    host.agents.get(idOf("lead"))!.status = "idle";
    await coordination.onTurnEnded(host, {
      agentId: idOf("lead"),
      workspaceId: "ws",
      outcome: { kind: "completed" },
      lastReply: null,
    });
    expect(group().held).toHaveLength(0);
    expect(host.sends).toHaveLength(1);
    expect(host.sends[0].text).toMatch(/first[\s\S]*second/);
    expect(host.sends[0].activeTurnBehavior).toBe("steer");
  });

  it("relays the Lead's reply only for a turn the Supervisor or Human started, or when no work is open", async () => {
    const { host, coordination, secretOf, idOf } = await setup();
    const leadTurn = (lastReply: string, timeline: unknown[] = []) =>
      coordination.onTurnEnded(host, {
        agentId: idOf("lead"),
        workspaceId: "ws",
        outcome: { kind: "completed" },
        lastReply,
        timeline: timeline as never,
      });
    const toSupervisor = () => host.sends.filter((s) => s.agentId === idOf("supervisor")).map((s) => s.text);

    // The Supervisor's goal starts a turn: its reply is relayed even with work open.
    await coordination.send(host, secretOf("supervisor"), { to: "lead", text: "Goal: CSV export" });
    const { peerAgentId } = await coordination.delegate(host, secretOf("lead"), delegateInput);
    host.sends.length = 0;
    await leadTurn("Workflow: docs/WORKFLOW.md, Bounded Change. Delegated A1.");
    expect(toSupervisor()).toEqual([expect.stringContaining("Delegated A1")]);

    // A Peer reply wakes the Lead while A1 is still open: not relayed.
    host.sends.length = 0;
    await leadTurn("Waiting for A1.");
    expect(toSupervisor()).toEqual([]);

    // Human talks to the Lead directly: relayed.
    await leadTurn("Answered Human.", [{ type: "user_message", text: "Lead, status?", messageId: "h1" }]);
    expect(toSupervisor()).toEqual([expect.stringContaining("Answered Human.")]);

    // The handback turn that closes the work: relayed.
    host.sends.length = 0;
    await coordination.onTurnEnded(host, { agentId: peerAgentId!, workspaceId: "ws", outcome: { kind: "completed" }, lastReply: "Done" });
    await coordination.accept(host, secretOf("lead"), { assignmentId: "A1", outcome: "accepted", reason: "ok" });
    await leadTurn("Done: A1 accepted, tests pass.");
    expect(toSupervisor()).toEqual([expect.stringContaining("Done: A1 accepted")]);
  });

  it("passes the Lead's end-of-turn reply to the Supervisor, so the Lead reports nothing itself", async () => {
    const { host, coordination, idOf, group } = await setup();
    const turn = (kind: string, lastReply: string | null) =>
      coordination.onTurnEnded(host, { agentId: idOf("lead"), workspaceId: "ws", outcome: { kind }, lastReply });
    await turn("completed", "list does not sort; evidence notes.py:67");
    await turn("completed", "   ");
    await turn("canceled", "half a thought");
    expect(host.sends).toEqual([
      expect.objectContaining({ agentId: idOf("supervisor"), text: expect.stringContaining("list does not sort") }),
    ]);
    expect(group().events.filter((e) => e.kind === "message").map((e) => e.data.from)).toEqual(["lead"]);
  });

  it("steers into a busy recipient when asked to", async () => {
    const { host, coordination, secretOf, idOf } = await setup();
    host.agents.get(idOf("lead"))!.status = "running";
    const result = await coordination.send(host, secretOf("supervisor"), {
      to: "lead",
      text: "stop",
      delivery: "steer",
    });
    expect(result.delivered).toBe("steered");
    expect(host.sends).toHaveLength(1);
  });

  it("rejects unknown recipients and self-messages", async () => {
    const { host, coordination, secretOf } = await setup();
    await expect(coordination.send(host, secretOf("lead"), { to: "nobody", text: "x" })).rejects.toThrow(
      "No group member",
    );
    await expect(coordination.send(host, secretOf("lead"), { to: "lead", text: "x" })).rejects.toThrow("yourself");
  });
});

describe("slp_delegate", () => {
  it("is for the Lead only", async () => {
    const { host, coordination, secretOf } = await setup();
    await expect(coordination.delegate(host, secretOf("supervisor"), delegateInput)).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("creates a Peer with the default model, its provider's mode, the Peer role, and the brief as prompt", async () => {
    const { host, coordination, secretOf, group } = await setup();
    const result = await coordination.delegate(host, secretOf("lead"), delegateInput);

    const created = host.created.at(-1)!;
    expect(created).toMatchObject({
      workspaceId: "ws",
      provider: "claude/claude-sonnet-5-5",
      modeId: "auto",
      title: "SLP Peer 1",
      labels: { "slp.role": "peer", "slp.group": group().id },
    });
    // Only the Supervisor asks Human (0008); a Peer gets only its own SLP tools.
    expect(created.providerOptions).toEqual({ disallowedTools: ["AskUserQuestion"] });
    expect(created.preapprovedTools?.map((t) => t.tool)).toEqual(["slp_ledger", "slp_send", "slp_finding"]);
    expect(created.systemPrompt).toContain("Your role: Peer");
    expect(created.prompt).toContain("Goal: Users can export reports as CSV");
    expect(created.prompt).toContain("No new runtime dependency (source: Human)");
    expect(created.prompt).toContain("not a binding constraint");
    expect(result).toMatchObject({ assignmentId: "A1", created: true });
    expect(group().ledger.assignments[0]).toMatchObject({ id: "A1", status: "assigned", peerAgentId: result.peerAgentId });
  });

  it("uses the allowed model's provider mode and rejects models off the list", async () => {
    const { host, coordination, secretOf } = await setup();
    await coordination.delegate(host, secretOf("lead"), { ...delegateInput, model: "codex/gpt-6-luna" });
    expect(host.created.at(-1)).toMatchObject({ provider: "codex/gpt-6-luna", modeId: "full-access" });
    // Codex has no per-agent tool block; its Peers follow the instructions.
    expect(host.created.at(-1)!.providerOptions).toBeUndefined();
    await expect(
      coordination.delegate(host, secretOf("lead"), { ...delegateInput, model: "claude/claude-opus-5-5" }),
    ).rejects.toThrow("not allowed");
  });

  it("caps Peers holding open assignments; an idle Peer never forces reuse", async () => {
    const { host, coordination, secretOf } = await setup();
    const first = await coordination.delegate(host, secretOf("lead"), delegateInput);
    await coordination.delegate(host, secretOf("lead"), delegateInput);
    await expect(coordination.delegate(host, secretOf("lead"), delegateInput)).rejects.toMatchObject({
      code: "limit",
    });

    // Close A1: its Peer is idle, so a fresh Peer may start (0009).
    await coordination.onTurnEnded(host, {
      agentId: first.peerAgentId!,
      workspaceId: "ws",
      outcome: { kind: "completed" },
      lastReply: "Done.",
    });
    await coordination.accept(host, secretOf("lead"), { assignmentId: "A1", outcome: "accepted", reason: "ok" });
    const fresh = await coordination.delegate(host, secretOf("lead"), delegateInput);
    expect(fresh).toMatchObject({ assignmentId: "A3", created: true });
    await coordination.onTurnEnded(host, {
      agentId: fresh.peerAgentId!,
      workspaceId: "ws",
      outcome: { kind: "completed" },
      lastReply: "Done.",
    });
    await coordination.accept(host, secretOf("lead"), { assignmentId: "A3", outcome: "accepted", reason: "ok" });
    host.sends.length = 0;
    const reused = await coordination.delegate(host, secretOf("lead"), {
      ...delegateInput,
      peerAgentId: first.peerAgentId!,
    });
    expect(reused).toMatchObject({ assignmentId: "A4", peerAgentId: first.peerAgentId, created: false });
    expect(host.sends[0]).toMatchObject({ agentId: first.peerAgentId, text: expect.stringContaining("SLP assignment A4") });
  });

  it("creates Peers under the Supervisor, with the provider's effort when the model lists it (0009)", async () => {
    const { host, coordination, secretOf, idOf, deps, group } = await setup();
    host.efforts.set("claude/claude-sonnet-5-5", ["low", "medium", "high"]);
    host.efforts.set("codex/gpt-6-luna", ["low", "medium"]);
    const settings = { ...SETTINGS, peers: { ...SETTINGS.peers, maxActive: 4, efforts: { claude: "high", codex: "max" } } };
    deps.settings = async () => settings;
    await coordination.delegate(host, secretOf("lead"), delegateInput);
    expect(host.created.at(-1)).toMatchObject({ parent: idOf("supervisor"), thinkingOptionId: "high" });
    await coordination.delegate(host, secretOf("lead"), { ...delegateInput, model: "codex/gpt-6-luna" });
    expect(host.created.at(-1)!.thinkingOptionId).toBeUndefined();
    expect(group().events.find((e) => e.kind === "effort-dropped")?.data).toMatchObject({ thinkingOptionId: "max" });
  });

  it("refuses to reassign a Peer that still holds an open assignment", async () => {
    const { host, coordination, secretOf } = await setup();
    const first = await coordination.delegate(host, secretOf("lead"), delegateInput);
    await expect(
      coordination.delegate(host, secretOf("lead"), { ...delegateInput, peerAgentId: first.peerAgentId! }),
    ).rejects.toThrow("still holds A1");
  });
});

describe("templates", () => {
  it("slp_template returns the body and records the load; unknown names list the known ones", async () => {
    const { coordination, secretOf, idOf, group } = await setup();
    const loaded = await coordination.template(secretOf("lead"), { name: "review" });
    expect(loaded.name).toBe("review");
    expect(loaded.body).toContain("1. Step one");
    expect(loaded.body).not.toContain("description:");
    expect(group().events.at(-1)).toMatchObject({
      kind: "template-load",
      data: { name: "review", agentId: idOf("lead"), role: "lead" },
    });
    await expect(coordination.template(secretOf("lead"), { name: "nope" })).rejects.toThrow(/Known: review, bugfix/);
  });

  it("slp_delegate stores the template, shows it in the brief, and refuses an unknown one", async () => {
    const { host, coordination, secretOf, group } = await setup();
    await expect(
      coordination.delegate(host, secretOf("lead"), { ...delegateInput, template: "nope" }),
    ).rejects.toMatchObject({ code: "invalid" });
    expect(group().ledger.assignments).toHaveLength(0);

    await coordination.delegate(host, secretOf("lead"), { ...delegateInput, template: "review" });
    expect(group().ledger.assignments[0].template).toBe("review");
    expect(host.created.at(-1)?.prompt).toContain("Template: review");
    expect(group().events.find((e) => e.kind === "delegate")?.data.template).toBe("review");

    await coordination.delegate(host, secretOf("lead"), delegateInput);
    expect(group().ledger.assignments[1].template).toBeUndefined();
    expect(host.created.at(-1)?.prompt).not.toContain("Template:");
  });

  it("keeps the template when an existing Peer is reassigned", async () => {
    const { host, coordination, secretOf, group } = await setup();
    const first = await coordination.delegate(host, secretOf("lead"), delegateInput);
    await coordination.accept(host, secretOf("lead"), { assignmentId: first.assignmentId, outcome: "dropped", reason: "x" });
    await coordination.delegate(host, secretOf("lead"), {
      ...delegateInput,
      peerAgentId: first.peerAgentId!,
      template: "bugfix",
    });
    expect(group().ledger.assignments[1].template).toBe("bugfix");
    expect(host.sends.at(-1)?.text).toContain("Template: bugfix");
  });

  it("counts loads, assignments, outcomes, rework, and reopens per template in the report", async () => {
    const { host, coordination, secretOf, group } = await setup();
    await coordination.template(secretOf("lead"), { name: "review" });
    await coordination.template(secretOf("lead"), { name: "review" });
    const a1 = await coordination.delegate(host, secretOf("lead"), { ...delegateInput, template: "review" });
    const a2 = await coordination.delegate(host, secretOf("lead"), { ...delegateInput, template: "review" });
    await coordination.delegate(host, secretOf("lead"), { ...delegateInput, template: "bugfix" }).catch(() => null);
    await coordination.accept(host, secretOf("lead"), { assignmentId: a1.assignmentId, outcome: "rework", reason: "again" });
    await coordination.accept(host, secretOf("lead"), { assignmentId: a1.assignmentId, outcome: "dropped", reason: "no" });
    await coordination.finding(host, secretOf("lead"), {
      kind: "reopen",
      assignmentId: a2.assignmentId,
      text: "t",
      evidence: "e",
    });
    const report = buildReport(group());
    expect(report.templates.review).toEqual({ loads: 2, assignments: 2, accepted: 0, rework: 1, dropped: 1, reopens: 1 });
    expect(renderReport(report)).toContain("- review: loaded 2; assignments 2 (accepted 0, dropped 1); rework 1; reopens 1");
  });
});

describe("handback and acceptance", () => {
  it("hands a Peer's reply back to the Lead after the Lead's turn, then accepts it", async () => {
    const { host, coordination, secretOf, idOf, group } = await setup();
    const { peerAgentId } = await coordination.delegate(host, secretOf("lead"), delegateInput);
    host.sends.length = 0;
    host.agents.get(idOf("lead"))!.status = "running";

    await coordination.onTurnEnded(host, {
      agentId: peerAgentId!,
      workspaceId: "ws",
      outcome: { kind: "completed" },
      lastReply: "Implemented; tests pass.",
    });
    expect(group().ledger.assignments[0]).toMatchObject({ status: "handed-back", handbacks: 1 });
    expect(host.sends).toEqual([]);
    expect(group().held[0]).toMatchObject({ kind: "handback", toAgentId: idOf("lead") });

    host.agents.get(idOf("lead"))!.status = "idle";
    await coordination.onTurnEnded(host, {
      agentId: idOf("lead"),
      workspaceId: "ws",
      outcome: { kind: "completed" },
      lastReply: null,
    });
    expect(host.sends[0].text).toContain("Implemented; tests pass.");
    expect(host.sends[0].text).toContain("slp_accept A1");

    await coordination.accept(host, secretOf("lead"), { assignmentId: "A1", outcome: "accepted", reason: "meets goal" });
    expect(group().ledger.assignments[0]).toMatchObject({
      status: "accepted",
      acceptance: { outcome: "accepted", reason: "meets goal" },
    });
  });

  it("does not accept work that was never handed back, and sends rework reasons to the Peer", async () => {
    const { host, coordination, secretOf, group } = await setup();
    const { peerAgentId } = await coordination.delegate(host, secretOf("lead"), delegateInput);
    await expect(
      coordination.accept(host, secretOf("lead"), { assignmentId: "A1", outcome: "accepted", reason: "x" }),
    ).rejects.toThrow("not been handed back");

    await coordination.onTurnEnded(host, {
      agentId: peerAgentId!,
      workspaceId: "ws",
      outcome: { kind: "completed" },
      lastReply: "Done.",
    });
    host.sends.length = 0;
    await coordination.accept(host, secretOf("lead"), {
      assignmentId: "A1",
      outcome: "rework",
      reason: "Missing tests for empty reports",
    });
    expect(group().ledger.assignments[0].status).toBe("assigned");
    expect(host.sends[0]).toMatchObject({ agentId: peerAgentId, text: expect.stringContaining("Missing tests") });
  });

  it("does not count a reassigned Peer's unrelated turn as a handback before the brief reaches it", async () => {
    const { host, coordination, secretOf, idOf, group } = await setup();
    const first = await coordination.delegate(host, secretOf("lead"), delegateInput);
    const peer = first.peerAgentId!;
    const done = { agentId: peer, workspaceId: "ws", outcome: { kind: "completed" }, lastReply: "Done." };
    await coordination.onTurnEnded(host, done);
    await coordination.accept(host, secretOf("lead"), { assignmentId: "A1", outcome: "accepted", reason: "ok" });

    // The Peer is busy answering something else when A2 is assigned, so its brief is held.
    host.agents.get(peer)!.status = "running";
    await coordination.delegate(host, secretOf("lead"), { ...delegateInput, peerAgentId: peer });
    expect(group().ledger.assignments[1].briefDeliveredAt).toBeNull();

    host.sends.length = 0;
    host.agents.get(peer)!.status = "idle";
    await coordination.onTurnEnded(host, { ...done, lastReply: "Answer to an unrelated question." });
    expect(group().ledger.assignments[1]).toMatchObject({ status: "assigned", handbacks: 0 });
    expect(group().ledger.assignments[1].briefDeliveredAt).not.toBeNull();
    expect(host.sends.map((s) => s.agentId).sort()).toEqual([idOf("lead"), peer].sort());
    expect(host.sends.find((s) => s.agentId === idOf("lead"))!.text).toContain("Reply from");

    await coordination.onTurnEnded(host, { ...done, lastReply: "A2 done." });
    expect(group().ledger.assignments[1]).toMatchObject({ status: "handed-back", handbacks: 1 });
  });

  it("ignores a canceled Peer turn", async () => {
    const { host, coordination, secretOf, group } = await setup();
    const { peerAgentId } = await coordination.delegate(host, secretOf("lead"), delegateInput);
    host.sends.length = 0;
    await coordination.onTurnEnded(host, {
      agentId: peerAgentId!,
      workspaceId: "ws",
      outcome: { kind: "canceled" },
      lastReply: "partial",
    });
    expect(host.sends).toEqual([]);
    expect(group().ledger.assignments[0].status).toBe("assigned");
  });
});

describe("findings and decisions", () => {
  it("runs a Peer finding through a Lead decision that resolves it and tells the affected owner", async () => {
    const { host, coordination, secretOf, idOf, group } = await setup();
    const { peerAgentId } = await coordination.delegate(host, secretOf("lead"), delegateInput);
    const peerSecret = secretOf("peer");
    host.sends.length = 0;

    const { findingId } = await coordination.finding(host, peerSecret, {
      kind: "reopen",
      assignmentId: "A1",
      text: "Streaming is not needed; reports are capped at 5k rows",
      evidence: "config/report-limits.ts sets maxRows=5000",
    });
    expect(host.sends[0]).toMatchObject({ agentId: idOf("lead"), text: expect.stringContaining(findingId) });

    host.sends.length = 0;
    const decision = await coordination.decide(host, secretOf("lead"), {
      text: "Build the CSV in memory; drop streaming",
      source: "agent",
      status: "settled",
      findingId,
      notify: [peerAgentId!],
    });
    expect(group().ledger.findings[0]).toMatchObject({ status: "resolved", resolvedBy: decision.decisionId });
    expect(host.sends).toEqual([
      { agentId: peerAgentId, text: expect.stringContaining("drop streaming"), activeTurnBehavior: "steer" },
    ]);
  });

  it("shows a Peer only its own assignments, findings, and the decisions it was told about", async () => {
    const { host, coordination, secretOf, idOf } = await setup();
    const first = await coordination.delegate(host, secretOf("lead"), delegateInput);
    await coordination.delegate(host, secretOf("lead"), { ...delegateInput, title: "PDF export", scope: "src/pdf/" });
    const { findingId } = await coordination.finding(host, secretOf("peer", 1), {
      kind: "blocker",
      assignmentId: "A2",
      text: "PDF fonts missing",
      evidence: "fc-list is empty",
    });
    await coordination.decide(host, secretOf("lead"), { text: "Bundle a font", source: "agent", status: "settled", findingId });
    await coordination.decide(host, secretOf("lead"), {
      text: "Both exports share one header row",
      source: "agent",
      status: "settled",
      notify: [first.peerAgentId!],
    });

    const view = await coordination.ledger(secretOf("peer", 0));
    expect(view.assignments.map((a) => a.id)).toEqual(["A1"]);
    expect(view.findings).toEqual([]);
    expect(view.decisions.map((d) => d.text)).toEqual(["Both exports share one header row"]);
    const other = await coordination.ledger(secretOf("peer", 1));
    expect(other.assignments.map((a) => a.id)).toEqual(["A2"]);
    expect(other.findings.map((f) => f.id)).toEqual([findingId]);
    expect(other.decisions.map((d) => d.text)).toEqual(["Bundle a font"]);
    // The Lead and the Supervisor still see everything.
    expect((await coordination.ledger(secretOf("lead"))).assignments).toHaveLength(2);
    expect(other.you.agentId).toBe(idOf("peer", 1));
  });

  it("sends pending Lead decisions to the Supervisor, who settles them for Human", async () => {
    const { host, coordination, secretOf, idOf, group } = await setup();
    const pending = await coordination.decide(host, secretOf("lead"), {
      text: "Should exports include archived reports?",
      source: "agent",
      status: "pending",
    });
    expect(host.sends[0]).toMatchObject({ agentId: idOf("supervisor"), text: expect.stringContaining("PENDING") });

    await expect(
      coordination.decide(host, secretOf("lead"), {
        text: "yes",
        source: "agent",
        status: "settled",
        settles: pending.decisionId,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });

    host.sends.length = 0;
    await coordination.decide(host, secretOf("supervisor"), {
      text: "Exclude archived reports",
      source: "human",
      status: "settled",
      settles: pending.decisionId,
    });
    expect(group().ledger.decisions[0]).toMatchObject({ source: "human", status: "settled", text: "Exclude archived reports" });
    // The Supervisor's own message carries it to the Lead (0009).
    expect(host.sends).toEqual([]);
  });

  it("accepts a role name in notify, and records nothing when a notify entry is unknown", async () => {
    const { host, coordination, secretOf, idOf, group } = await setup();
    await expect(
      coordination.decide(host, secretOf("supervisor"), { text: "x", source: "human", status: "settled", notify: ["nobody"] }),
    ).rejects.toThrow("not a group member");
    expect(group().ledger.decisions).toEqual([]);

    host.sends.length = 0;
    const lead = await coordination.decide(host, secretOf("lead"), { text: "y/n first", source: "agent", status: "settled", notify: ["supervisor"] });
    expect(lead.notified).toEqual([idOf("supervisor")]);
    expect(host.sends[0]).toMatchObject({ agentId: idOf("supervisor"), text: expect.stringContaining("y/n first") });
  });

  it("never notifies the Lead of a Supervisor decision; the Supervisor's message carries it (0009)", async () => {
    const { host, coordination, secretOf, group } = await setup();
    const result = await coordination.decide(host, secretOf("supervisor"), {
      text: "Report only",
      source: "human",
      status: "settled",
      notify: ["lead"],
    });
    expect(result).toMatchObject({ notified: [], lead: expect.stringContaining("dropped from notify") });
    expect(group().ledger.decisions[0].notified).toEqual([]);
    expect(host.sends).toEqual([]);
  });

  it("keeps Human as the only source the Lead cannot claim, and Peers out of decisions", async () => {
    const { host, coordination, secretOf } = await setup();
    await coordination.delegate(host, secretOf("lead"), delegateInput);
    await expect(
      coordination.decide(host, secretOf("lead"), { text: "x", source: "human", status: "settled" }),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      coordination.decide(host, secretOf("peer"), { text: "x", source: "agent", status: "settled" }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("revising pending decisions", () => {
  it("lets the author update a pending decision in place and tells the Supervisor", async () => {
    const { host, coordination, secretOf, idOf, group } = await setup();
    const pending = await coordination.decide(host, secretOf("lead"), {
      text: "Transliterate or drop? Drop gives caf-d-j-vu",
      source: "agent",
      status: "pending",
    });
    host.sends.length = 0;

    const result = await coordination.reviseDecision(host, secretOf("lead"), {
      decisionId: pending.decisionId,
      action: "update",
      text: "Transliterate or drop? Drop gives caf-dj-vu",
      reason: "wrong example",
    });

    expect(result).toEqual({ decisionId: pending.decisionId, status: "pending", notified: [idOf("supervisor")] });
    expect(group().ledger.decisions).toHaveLength(1);
    expect(group().ledger.decisions[0]).toMatchObject({ text: "Transliterate or drop? Drop gives caf-dj-vu", status: "pending" });
    expect(group().ledger.decisions[0].revisedAt).toBeTruthy();
    expect(host.sends[0]).toMatchObject({ agentId: idOf("supervisor"), text: expect.stringContaining("caf-dj-vu") });
  });

  it("withdraws a pending decision, which Human can then no longer settle and which keeps its id", async () => {
    const { host, coordination, secretOf, group } = await setup();
    const first = await coordination.decide(host, secretOf("lead"), { text: "q1", source: "agent", status: "pending" });
    await coordination.reviseDecision(host, secretOf("lead"), {
      decisionId: first.decisionId,
      action: "withdraw",
      reason: "answered by the project docs",
    });

    expect(group().ledger.decisions[0]).toMatchObject({
      status: "withdrawn",
      withdrawnReason: "answered by the project docs",
    });
    await expect(coordination.humanDecide(host, "ws", { text: "x", settles: first.decisionId })).rejects.toMatchObject({
      code: "invalid",
    });
    const next = await coordination.decide(host, secretOf("lead"), { text: "q2", source: "agent", status: "pending" });
    expect(next.decisionId).not.toBe(first.decisionId);
    expect(group().events.filter((e) => e.kind === "decision-revised")).toEqual([
      expect.objectContaining({ data: { decisionId: first.decisionId, action: "withdraw", by: "lead" } }),
    ]);
  });

  it("refuses other members, settled decisions, and an update without text", async () => {
    const { host, coordination, secretOf } = await setup();
    await coordination.delegate(host, secretOf("lead"), delegateInput);
    const pending = await coordination.decide(host, secretOf("lead"), { text: "q", source: "agent", status: "pending" });
    const settled = await coordination.decide(host, secretOf("lead"), { text: "s", source: "agent", status: "settled" });
    const revise = (role: string, decisionId: string, action: "update" | "withdraw", text?: string) =>
      coordination.reviseDecision(host, secretOf(role), { decisionId, action, text, reason: "r" });

    await expect(revise("supervisor", pending.decisionId, "withdraw")).rejects.toMatchObject({ code: "forbidden" });
    await expect(revise("peer", pending.decisionId, "withdraw")).rejects.toMatchObject({ code: "forbidden" });
    await expect(revise("lead", settled.decisionId, "withdraw")).rejects.toMatchObject({ code: "invalid" });
    await expect(revise("lead", pending.decisionId, "update")).rejects.toMatchObject({ code: "invalid" });
  });
});

describe("Human decisions from the panel", () => {
  it("settles a pending decision as Human's and tells only the Supervisor", async () => {
    const { host, coordination, secretOf, idOf, group } = await setup();
    const pending = await coordination.decide(host, secretOf("lead"), {
      text: "Should exports include archived reports?",
      source: "agent",
      status: "pending",
    });
    host.sends.length = 0;

    const result = await coordination.humanDecide(host, "ws", {
      text: "Exclude archived reports",
      settles: pending.decisionId,
    });

    expect(result).toEqual({ decisionId: pending.decisionId, notified: [idOf("supervisor")] });
    expect(group().ledger.decisions[0]).toMatchObject({
      source: "human",
      status: "settled",
      text: "Exclude archived reports",
      by: { role: "human", agentId: null },
    });
    expect(host.sends).toEqual([
      { agentId: idOf("supervisor"), text: expect.stringContaining("Exclude archived reports"), activeTurnBehavior: "steer" },
    ]);
    expect(host.sends[0].text).toContain('from="human"');
    expect(group().events.filter((e) => e.kind === "decision").at(-1)).toMatchObject({
      data: { by: "human", settled: true },
    });
  });

  it("records a new decision on a finding, resolves it, and holds the notice for a busy Supervisor", async () => {
    const { host, coordination, secretOf, idOf, group } = await setup();
    await coordination.delegate(host, secretOf("lead"), delegateInput);
    const { findingId } = await coordination.finding(host, secretOf("peer"), {
      kind: "reopen",
      text: "Streaming is not needed",
      evidence: "maxRows=5000",
    });
    host.sends.length = 0;
    host.agents.get(idOf("supervisor"))!.status = "running";

    const result = await coordination.humanDecide(host, "ws", { text: "Keep streaming anyway", findingId });

    expect(group().ledger.decisions.at(-1)).toMatchObject({
      id: result.decisionId,
      source: "human",
      status: "settled",
      findingId,
    });
    expect(group().ledger.findings[0]).toMatchObject({ status: "resolved", resolvedBy: result.decisionId });
    expect(host.sends).toEqual([]);
    expect(group().held).toEqual([expect.objectContaining({ toAgentId: idOf("supervisor"), fromRole: "human" })]);
  });

  it("refuses unknown or settled decisions, unknown findings, both targets, and ended groups", async () => {
    const { host, coordination, service, secretOf } = await setup();
    const settled = await coordination.decide(host, secretOf("lead"), { text: "x", source: "agent", status: "settled" });
    await expect(coordination.humanDecide(host, "ws", { text: "y", settles: settled.decisionId })).rejects.toMatchObject({
      code: "invalid",
    });
    await expect(coordination.humanDecide(host, "ws", { text: "y", settles: "D9" })).rejects.toMatchObject({
      code: "invalid",
    });
    await expect(coordination.humanDecide(host, "ws", { text: "y", findingId: "F9" })).rejects.toMatchObject({
      code: "invalid",
    });
    await expect(
      coordination.humanDecide(host, "ws", { text: "y", settles: settled.decisionId, findingId: "F1" }),
    ).rejects.toMatchObject({ code: "invalid" });
    await expect(coordination.humanDecide(host, "other", { text: "y" })).rejects.toMatchObject({ code: "invalid" });
    await service.onWorkspaceArchived("ws");
    await expect(coordination.humanDecide(host, "ws", { text: "y" })).rejects.toMatchObject({ code: "invalid" });
  });
});

describe("telemetry", () => {
  const turn = (agentId: string, timeline: Array<Record<string, unknown>>, kind = "completed") => ({
    agentId,
    workspaceId: "ws",
    outcome: { kind },
    lastReply: null,
    timeline: timeline as Array<{ type: string }>,
  });

  it("counts built-in sends and creates, Human messages, and usage once each, ignoring plugin prompts", async () => {
    const { host, coordination, idOf, group } = await setup();
    const lead = idOf("lead");
    host.agents.get(lead)!.lastUsage = { inputTokens: 100, cachedInputTokens: 40, outputTokens: 20, totalCostUsd: 0.01 };
    const timeline = [
      { type: "user_message", text: "Please also check the README", messageId: "m1" },
      { type: "user_message", text: "SLP message:\n\n<slp-message ...>", messageId: "m2" },
      { type: "tool_call", callId: "c1", name: "mcp__paseo__send_agent_prompt", status: "completed" },
      { type: "tool_call", callId: "c2", name: "paseo.create_agent", status: "completed" },
      { type: "tool_call", callId: "c3", name: "mcp__slp__slp_send", status: "completed" },
    ];
    await coordination.onTurnEnded(host, turn(lead, timeline));
    // A reload repeats earlier turns in the timeline; a canceled turn reports no usage.
    await coordination.onTurnEnded(host, turn(lead, timeline, "canceled"));

    const kinds = group().events.map((e) => e.kind);
    expect(kinds.filter((k) => k === "human-message")).toHaveLength(1);
    expect(kinds.filter((k) => k === "builtin-send")).toHaveLength(1);
    expect(kinds.filter((k) => k === "builtin-create")).toHaveLength(1);
    expect(group().events.filter((e) => e.kind === "usage")).toEqual([
      expect.objectContaining({ data: expect.objectContaining({ role: "lead", inputTokens: 100, totalCostUsd: 0.01 }) }),
    ]);
  });

  it("does not report built-in sends or Paseo notices as Human messages, and counts cumulative cost once", async () => {
    const { host, coordination, idOf, group } = await setup();
    const lead = idOf("lead");
    const supervisor = idOf("supervisor");
    // The recipient's turn can end before the sender's.
    await coordination.onTurnEnded(host, turn(supervisor, [{ type: "user_message", text: "ping", messageId: "p1" }]));
    host.agents.get(lead)!.lastUsage = { inputTokens: 10, outputTokens: 1, totalCostUsd: 0.1 };
    await coordination.onTurnEnded(
      host,
      turn(lead, [
        { type: "user_message", text: "<paseo-system>\nAgent x finished.\n</paseo-system>", messageId: "n1" },
        {
          type: "tool_call",
          callId: "c9",
          name: "mcp__paseo__send_agent_prompt",
          detail: { type: "unknown", input: { agentId: supervisor.slice(0, 7), prompt: "ping" } },
        },
      ]),
    );
    host.agents.get(lead)!.lastUsage = { inputTokens: 20, outputTokens: 2, totalCostUsd: 0.25 };
    await coordination.onTurnEnded(host, turn(lead, []));

    const report = buildReport(group());
    expect(report.humanMessagesToSupervisor).toBe(0);
    expect(report.humanInterventions).toEqual({});
    expect(report.busySendViolations).toEqual({ lead: 1 });
    expect(report.usage.lead).toMatchObject({ turns: 2, inputTokens: 30, outputTokens: 3 });
    expect(report.usage.lead.costUsd).toBeCloseTo(0.25);
  });

  it("reports which instructions each member was created with", async () => {
    const { group } = await setup();
    const report = buildReport(group());
    expect(report.instructions.map((entry) => [entry.role, entry.custom])).toEqual([
      ["supervisor", false],
      ["lead", false],
    ]);
    expect(renderReport(report)).toMatch(/- supervisor \S+: [0-9a-f]{12} \(default\)/);
  });

  it("counts the Supervisor's shell commands and file changes on the project, once each", async () => {
    const { host, coordination, idOf, group } = await setup();
    const timeline = [
      { type: "tool_call", callId: "s1", name: "Bash", detail: { type: "shell", command: "git pull" } },
      { type: "tool_call", callId: "s2", name: "Write", detail: { type: "write", filePath: "notes.py" } },
      { type: "tool_call", callId: "s3", name: "Read", detail: { type: "read", filePath: "docs/plan.md" } },
    ];
    await coordination.onTurnEnded(host, turn(idOf("supervisor"), timeline));
    await coordination.onTurnEnded(host, turn(idOf("supervisor"), timeline));
    // The Lead works on the project by design.
    await coordination.onTurnEnded(host, turn(idOf("lead"), [{ ...timeline[0], callId: "l1" }]));

    const report = buildReport(group());
    expect(report.supervisorWork).toEqual({ shellCommands: 1, fileChanges: 1 });
    expect(renderReport(report)).toContain("Supervisor working on the project: 1 shell commands, 1 file changes");
  });

  it("records agents created in the workspace without the group label, not the group's own Peers", async () => {
    const { host, coordination, secretOf, group } = await setup();
    const { peerAgentId } = await coordination.delegate(host, secretOf("lead"), delegateInput);
    await coordination.onAgentCreated(host, { id: peerAgentId!, workspaceId: "ws" });
    const stray = host.addHumanAgent("ws");
    await coordination.onAgentCreated(host, { id: stray.id, workspaceId: "ws" });

    expect(group().events.filter((e) => e.kind === "outside-agent")).toEqual([
      expect.objectContaining({ data: { agentId: stray.id, parentAgentId: null } }),
    ]);
  });

  it("builds a per-group report from events and the ledger", async () => {
    const { host, coordination, secretOf, idOf, group } = await setup();
    await coordination.send(host, secretOf("supervisor"), { to: "lead", text: "goal" });
    const { peerAgentId } = await coordination.delegate(host, secretOf("lead"), delegateInput);
    host.agents.get(idOf("lead"))!.status = "running";
    await coordination.onTurnEnded(host, turn(peerAgentId!, []));
    host.agents.get(idOf("lead"))!.status = "idle";
    await coordination.accept(host, secretOf("lead"), { assignmentId: "A1", outcome: "rework", reason: "tests" });
    await coordination.finding(host, secretOf("peer"), { kind: "reopen", text: "t", evidence: "e" });
    const d1 = await coordination.decide(host, secretOf("lead"), { text: "q1", source: "agent", status: "pending" });
    const d2 = await coordination.decide(host, secretOf("lead"), { text: "q2", source: "agent", status: "pending" });
    await coordination.decide(host, secretOf("lead"), { text: "q3", source: "agent", status: "pending" });
    await coordination.humanDecide(host, "ws", { text: "a1", settles: d1.decisionId });
    await coordination.decide(host, secretOf("supervisor"), {
      text: "a2",
      source: "human",
      status: "settled",
      settles: d2.decisionId,
    });
    await coordination.reviseDecision(host, secretOf("lead"), { decisionId: "D3", action: "withdraw", reason: "moot" });
    host.agents.get(peerAgentId!)!.lastUsage = { inputTokens: 50, outputTokens: 5 };
    await coordination.onTurnEnded(host, turn(peerAgentId!, [{ type: "user_message", text: "Human here", messageId: "h1" }]));

    const report = buildReport(group());
    expect(report.escalations).toEqual({
      raised: 3,
      answeredFromPanel: 1,
      answeredThroughSupervisor: 1,
      withdrawn: 1,
      revised: 0,
      open: 0,
    });
    expect(report.humanDecisions).toEqual({ fromPanel: 1, relayedBySupervisor: 1 });
    expect(report.humanInterventions).toEqual({ peer: 1 });
    expect(report.findings).toEqual({ byKind: { reopen: 1 }, byRole: { peer: 1 }, open: 1 });
    // The Peer's turn after the rework request is its second handback.
    expect(report.assignments).toMatchObject({ total: 1, handbacks: 2, outcomes: { rework: 1 } });
    expect(report.messages["supervisor→lead"]).toBe(1);
    expect(report.delivery.held).toBeGreaterThanOrEqual(1);
    expect(report.usage.peer).toEqual({ turns: 1, inputTokens: 50, cachedInputTokens: 0, outputTokens: 5, costUsd: null });

    const markdown = renderReport(report);
    expect(markdown).toContain("Messages straight to the Lead or a Peer (Human's choice, not a break): 1 (peer 1)");
    expect(markdown).toContain("| peer | 1 | 50 | 0 | 5 | not reported |");
  });
});

describe("workflow and compaction (0009)", () => {
  it("puts the brief's workflow in the Peer's prompt and asks the handback to cover what the change touches", async () => {
    const { host, coordination, secretOf } = await setup();
    await coordination.delegate(host, secretOf("lead"), {
      ...delegateInput,
      brief: { ...BRIEF, workflow: "docs/WORKFLOW.md, Bounded Change" },
    });
    const prompt = host.created.at(-1)!.prompt!;
    expect(prompt).toContain("Project workflow (read it before you start): docs/WORKFLOW.md, Bounded Change");
    expect(prompt).toContain("the records and constraints your change");
  });

  it("asks the Lead to check the real change, and to question with evidence, at each handback", async () => {
    const { host, coordination, secretOf } = await setup();
    const { peerAgentId } = await coordination.delegate(host, secretOf("lead"), delegateInput);
    host.sends.length = 0;
    await coordination.onTurnEnded(host, { agentId: peerAgentId!, workspaceId: "ws", outcome: { kind: "completed" }, lastReply: "Done" });
    expect(host.sends[0].text).toContain("Check the diff and the evidence, not the summary");
    expect(host.sends[0].text).toContain("open question");
  });

  it("records each completed compaction once, though the timeline repeats earlier turns", async () => {
    const { host, coordination, idOf, group } = await setup();
    const compaction = { type: "compaction", status: "completed", trigger: "auto", preTokens: 219120 };
    const turn = (timeline: unknown[]) =>
      coordination.onTurnEnded(host, {
        agentId: idOf("lead"),
        workspaceId: "ws",
        outcome: { kind: "completed" },
        lastReply: null,
        timeline: timeline as never,
      });
    await turn([{ type: "compaction", status: "loading" }, compaction]);
    await turn([compaction, { type: "assistant_message", text: "x" }]);
    await turn([compaction, compaction]);
    const events = group().events.filter((e) => e.kind === "compaction");
    expect(events).toHaveLength(2);
    expect(events[0].data).toMatchObject({ role: "lead", trigger: "auto", preTokens: 219120 });
  });
});

describe("native questions (slice 7, I2)", () => {
  const askUserQuestion = (id: string) => ({
    id,
    kind: "question",
    name: "AskUserQuestion",
    input: {
      questions: [
        { question: "Allow 5 extra runs?", options: [{ label: "Yes" }, { label: "No" }] },
        { question: "Keep the strict reading?" },
      ],
    },
  });

  it("records a member's native question until it is resolved, and counts it in the report", async () => {
    const { coordination, deps, idOf, group } = await setup();
    await coordination.onPermissionRequested({
      agentId: idOf("supervisor"),
      workspaceId: "ws",
      request: askUserQuestion("perm-1"),
    });

    expect(coordination.ledgerView("ws").nativeQuestions).toEqual([
      {
        requestId: "perm-1",
        role: "supervisor",
        agentId: idOf("supervisor"),
        text: "Allow 5 extra runs? (Yes / No)\nKeep the strict reading?",
        at: expect.any(String),
      },
    ]);
    expect(buildReport(group()).nativeQuestions).toEqual({ byRole: { supervisor: 1 }, unanswered: 1 });

    await coordination.onPermissionResolved({ agentId: idOf("supervisor"), workspaceId: "ws", requestId: "perm-1" });
    expect(coordination.ledgerView("ws").nativeQuestions).toEqual([]);
    const report = buildReport(deps.store.get("ws")!.group!);
    expect(report.nativeQuestions).toEqual({ byRole: { supervisor: 1 }, unanswered: 0 });
    expect(renderReport(report)).toContain("Asked through the Supervisor's question tool: 1; unanswered native questions 0");
    expect(renderReport(report)).toContain("Questions to Human through a provider's own tool, by the Lead or a Peer: 0 (none)");
  });

  it("counts a Lead's native question as a convention break, not as the Supervisor asking", async () => {
    const { coordination, idOf, group } = await setup();
    await coordination.onPermissionRequested({
      agentId: idOf("lead"),
      workspaceId: "ws",
      request: askUserQuestion("perm-4"),
    });

    const markdown = renderReport(buildReport(group()));
    expect(markdown).toContain("Asked through the Supervisor's question tool: 0; unanswered native questions 1");
    expect(markdown).toContain("Questions to Human through a provider's own tool, by the Lead or a Peer: 1 (lead 1)");
  });

  it("ignores tool permissions, agents outside the group, and resolutions it never recorded", async () => {
    const { coordination, idOf, group } = await setup();
    await coordination.onPermissionRequested({
      agentId: idOf("lead"),
      workspaceId: "ws",
      request: { id: "perm-2", kind: "tool", name: "Bash" },
    });
    await coordination.onPermissionRequested({
      agentId: "stranger",
      workspaceId: "ws",
      request: askUserQuestion("perm-3"),
    });
    await coordination.onPermissionResolved({ agentId: idOf("lead"), workspaceId: "ws", requestId: "perm-2" });

    expect(group().events.filter((e) => e.kind.startsWith("native-question"))).toEqual([]);
    expect(coordination.ledgerView("ws").nativeQuestions).toEqual([]);
  });
});

describe("reconcile and lifecycle", () => {
  it("delivers held messages whose recipient became idle without a turn event, and drops archived ones", async () => {
    const { host, coordination, secretOf, idOf, group } = await setup();
    host.agents.get(idOf("lead"))!.status = "running";
    host.agents.get(idOf("supervisor"))!.status = "running";
    await coordination.send(host, secretOf("supervisor"), { to: "lead", text: "for lead" });
    await coordination.send(host, secretOf("lead"), { to: "supervisor", text: "for supervisor" });

    // Archiving the Supervisor would archive its children (0009), so archive the Lead.
    host.agents.get(idOf("supervisor"))!.status = "idle";
    await host.archiveAgent(idOf("lead"));
    expect(await coordination.reconcile(host)).toBe(1);
    expect(host.sends[0]).toMatchObject({ agentId: idOf("supervisor") });
    expect(group().held).toEqual([]);
  });

  it("stops serving members once the workspace is archived", async () => {
    const { host, coordination, service, secretOf } = await setup();
    const secret = secretOf("lead");
    await service.onWorkspaceArchived("ws");
    await expect(coordination.send(host, secret, { to: "supervisor", text: "x" })).rejects.toMatchObject({
      code: "forbidden",
    });
  });
});
