import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Brief } from "../shared/contracts";
import { Coordination } from "./coordination";
import { FakePaseoHost } from "./paseo-host.fake";
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
