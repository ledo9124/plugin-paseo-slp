import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Brief, Ledger } from "../shared/contracts";
import { Coordination, peerView } from "./coordination";
import { FakePaseoHost } from "./paseo-host.fake";
import { buildReport, renderReport } from "./report";
import { WorkspaceQueue } from "./queue";
import { SlpService } from "./slp-service";
import { SlpStore } from "./store";

const SETTINGS = {
  supervisor: { provider: "claude/claude-opus-5-5", modeId: "auto" },
  lead: { provider: "claude/claude-sonnet-5-5", modeId: "auto" },
  peers: {
    models: ["claude/claude-sonnet-5-5", "codex/gpt-6-luna"],
    maxActive: 2,
    modes: { claude: "auto", codex: "full-access" },
  },
  experiment: { noSupervisor: false },
};

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
      lastReply: "done",
    });
    expect(group().held).toHaveLength(0);
    expect(host.sends).toHaveLength(1);
    expect(host.sends[0].text).toMatch(/first[\s\S]*second/);
    expect(host.sends[0].activeTurnBehavior).toBe("steer");
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
    // Decision 0008: a Claude Peer has no question tool; it keeps its others.
    expect(created.providerOptions).toEqual({ disallowedTools: ["AskUserQuestion"] });
    expect(created.preapprovedTools?.map((tool) => tool.tool)).toEqual(["slp_ledger", "slp_send", "slp_finding"]);
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
    await expect(
      coordination.delegate(host, secretOf("lead"), { ...delegateInput, model: "claude/claude-opus-5-5" }),
    ).rejects.toThrow("not allowed");
  });

  it("caps active Peers and points the Lead at Peers it can reassign", async () => {
    const { host, coordination, secretOf } = await setup();
    const first = await coordination.delegate(host, secretOf("lead"), delegateInput);
    await coordination.delegate(host, secretOf("lead"), delegateInput);
    await expect(coordination.delegate(host, secretOf("lead"), delegateInput)).rejects.toMatchObject({
      code: "limit",
    });

    // Close A1, then reassign its Peer.
    await coordination.onTurnEnded(host, {
      agentId: first.peerAgentId!,
      workspaceId: "ws",
      outcome: { kind: "completed" },
      lastReply: "Done.",
    });
    await coordination.accept(host, secretOf("lead"), { assignmentId: "A1", outcome: "accepted", reason: "ok" });
    await expect(coordination.delegate(host, secretOf("lead"), delegateInput)).rejects.toThrow(first.peerAgentId!);
    host.sends.length = 0;
    const reused = await coordination.delegate(host, secretOf("lead"), {
      ...delegateInput,
      peerAgentId: first.peerAgentId!,
    });
    expect(reused).toMatchObject({ assignmentId: "A3", peerAgentId: first.peerAgentId, created: false });
    expect(host.sends[0]).toMatchObject({ agentId: first.peerAgentId, text: expect.stringContaining("SLP assignment A3") });
  });

  it("refuses to reassign a Peer that still holds an open assignment", async () => {
    const { host, coordination, secretOf } = await setup();
    const first = await coordination.delegate(host, secretOf("lead"), delegateInput);
    await expect(
      coordination.delegate(host, secretOf("lead"), { ...delegateInput, peerAgentId: first.peerAgentId! }),
    ).rejects.toThrow("still holds A1");
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

  it("records nothing when a notify target is unknown, and accepts a role name", async () => {
    const { host, coordination, secretOf, idOf, group } = await setup();
    const input = { text: "Keep it as is", source: "human" as const, status: "settled" as const };
    await expect(coordination.decide(host, secretOf("supervisor"), { ...input, notify: ["nobody"] })).rejects.toMatchObject(
      { code: "invalid" },
    );
    expect(group().ledger.decisions).toHaveLength(0);

    await coordination.decide(host, secretOf("supervisor"), { ...input, notify: ["lead"] });
    expect(group().ledger.decisions).toHaveLength(1);
    expect(host.sends.at(-1)).toMatchObject({ agentId: idOf("lead") });
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
    expect(host.sends[0]).toMatchObject({ agentId: idOf("lead") });
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
    expect(markdown).toContain("Interventions (messages straight to the Lead or a Peer): 1 (peer 1)");
    expect(markdown).toContain("| peer | 1 | 50 | 0 | 5 | not reported |");
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

    host.agents.get(idOf("lead"))!.status = "idle";
    await host.archiveAgent(idOf("supervisor"));
    expect(await coordination.reconcile(host)).toBe(1);
    expect(host.sends[0]).toMatchObject({ agentId: idOf("lead") });
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

describe("peerView", () => {
  it("shows a Peer its own work and Human's decisions, not other Peers' briefs", () => {
    const actor = (agentId: string) => ({ role: "peer" as const, agentId });
    const assignment = (id: string, peerAgentId: string) =>
      ({ id, peerAgentId, title: id }) as unknown as Ledger["assignments"][number];
    const ledger = {
      assignments: [assignment("A1", "p1"), assignment("A2", "p2")],
      findings: [
        { id: "F1", assignmentId: "A1", by: actor("p1") },
        { id: "F2", assignmentId: "A2", by: actor("p2") },
      ],
      decisions: [
        { id: "D1", source: "human", status: "settled", findingId: null },
        { id: "D2", source: "agent", status: "settled", findingId: "F1" },
        { id: "D3", source: "agent", status: "settled", findingId: "F2" },
        { id: "D4", source: "agent", status: "pending", findingId: null },
      ],
    } as unknown as Ledger;
    const view = peerView(ledger, "p1");
    expect(view.assignments.map((a) => a.id)).toEqual(["A1"]);
    expect(view.findings.map((f) => f.id)).toEqual(["F1"]);
    expect(view.decisions.map((d) => d.id)).toEqual(["D1", "D2"]);
  });
});
