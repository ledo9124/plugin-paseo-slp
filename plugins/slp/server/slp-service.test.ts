import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FakePaseoHost } from "./paseo-host.fake";
import { GROUP_LABEL, ROLE_LABEL, SlpError, SlpService } from "./slp-service";
import { WorkspaceQueue } from "./queue";
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

function setup() {
  let counter = 0;
  const store = new SlpStore(mkdtempSync(join(tmpdir(), "slp-service-")));
  const service = new SlpService({
    store,
    queue: new WorkspaceQueue(),
    mcpUrl: (secret) => `http://mcp.test/mcp/${secret}`,
    settings: async () => SETTINGS,
    now: () => `2026-10-01T00:00:${String(counter++).padStart(2, "0")}Z`,
    newId: () => `group-${++counter}`,
    newSecret: () => `secret-${++counter}`,
  });
  return { store, service, host: new FakePaseoHost() };
}

describe("SlpService.setMode", () => {
  it("starts a Supervisor and a Lead in the workspace with their configured model, mode, and role", async () => {
    const { service, host, store } = setup();
    const view = await service.setMode(host, "ws-1", "on");

    expect(view.mode).toBe("on");
    expect(view.lockedAt).toBeNull();
    expect(view.group?.members.map((member) => member.role)).toEqual(["supervisor", "lead"]);
    const [supervisor, lead] = host.created;
    expect(supervisor).toMatchObject({
      workspaceId: "ws-1",
      provider: "claude/claude-opus-5-5",
      modeId: "auto",
      title: "SLP Supervisor",
    });
    expect(lead).toMatchObject({ provider: "claude/claude-sonnet-5-5", modeId: "auto", title: "SLP Lead" });
    expect(supervisor.systemPrompt).toContain("Your role: Supervisor");
    expect(lead.systemPrompt).toContain("Your role: Lead");
    expect(supervisor.labels?.[ROLE_LABEL]).toBe("supervisor");
    expect(supervisor.labels?.[GROUP_LABEL]).toBe(view.group?.id);
    const secrets = store.get("ws-1")!.group!.members.map((member) => member.secret);
    expect(supervisor.mcpServers?.slp).toMatchObject({ type: "http", url: `http://mcp.test/mcp/${secrets[0]}` });
    expect(supervisor.preapprovedTools).toContainEqual({ server: "slp", tool: "slp_group" });
    expect(supervisor.preapprovedTools).toContainEqual({ server: "slp", tool: "slp_send" });
    expect(supervisor.prompt).toBeUndefined();
  });

  it("archives the members when switched off before the lock, and can start again", async () => {
    const { service, host } = setup();
    const on = await service.setMode(host, "ws-1", "on");
    const off = await service.setMode(host, "ws-1", "off");

    expect(off.mode).toBe("off");
    expect(off.group).toBeNull();
    for (const member of on.group!.members) expect(host.agents.get(member.agentId!)?.archivedAt).not.toBeNull();

    const again = await service.setMode(host, "ws-1", "on");
    expect(again.lockedAt).toBeNull();
    expect(again.group?.id).not.toBe(on.group?.id);
  });

  it("refuses to start while the daemon does not inject Paseo tools", async () => {
    const { service, host } = setup();
    host.injectIntoAgents = false;
    await expect(service.setMode(host, "ws-1", "on")).rejects.toMatchObject({ code: "inject-disabled" });
    expect(host.created).toHaveLength(0);
  });

  it("rolls back a half-started group", async () => {
    const { service, host, store } = setup();
    host.failCreateFor = "SLP Lead";
    await expect(service.setMode(host, "ws-1", "on")).rejects.toThrow("create failed");

    const [supervisor] = [...host.agents.values()];
    expect(supervisor.archivedAt).not.toBeNull();
    expect(store.get("ws-1")).toBeNull();
    expect(service.listModes()).toEqual([]);
  });

  it("restores the earlier record after a failed restart of the group", async () => {
    const { service, host, store } = setup();
    await service.setMode(host, "ws-1", "on");
    await service.setMode(host, "ws-1", "off");
    const before = store.get("ws-1");
    host.failCreateFor = "SLP Supervisor";
    await expect(service.setMode(host, "ws-1", "on")).rejects.toThrow("create failed");
    expect(store.get("ws-1")).toEqual(before);
  });

  it("starts one group when two switches race", async () => {
    const { service, host } = setup();
    await Promise.all([service.setMode(host, "ws-1", "on"), service.setMode(host, "ws-1", "on")]);
    expect(host.created).toHaveLength(2);
  });
});

describe("SLP mode lock", () => {
  it("locks an SLP workspace at the first turn, in both directions", async () => {
    const { service, host } = setup();
    await service.setMode(host, "ws-on", "on");
    await service.onTurnStarted({ workspaceId: "ws-on" });
    await service.onTurnStarted({ workspaceId: "ws-off" });

    await expect(service.setMode(host, "ws-on", "off")).rejects.toBeInstanceOf(SlpError);
    await expect(service.setMode(host, "ws-off", "on")).rejects.toMatchObject({ code: "locked" });
    expect((await service.view(host, "ws-on")).mode).toBe("on");
    expect((await service.view(host, "ws-off")).mode).toBe("off");
  });

  it("locks from workspace activity when the turn event was missed", async () => {
    const { service, host } = setup();
    host.addHumanAgent("ws-1");
    const view = await service.view(host, "ws-1");
    expect(view.lockedAt).not.toBeNull();
    await expect(service.setMode(host, "ws-1", "on")).rejects.toMatchObject({ code: "locked" });
  });

  it("locks a workspace that already has an agent, even one never messaged", async () => {
    const { service, host } = setup();
    host.addHumanAgent("ws-1", { messaged: false });
    expect((await service.view(host, "ws-1")).lockedAt).not.toBeNull();
  });

  it("does not lock on another workspace's activity", async () => {
    const { service, host } = setup();
    host.addHumanAgent("ws-other");
    expect((await service.view(host, "ws-1")).lockedAt).toBeNull();
  });
});

describe("SlpService group end and identity", () => {
  it("ends the group when the workspace is archived", async () => {
    const { service, host } = setup();
    await service.setMode(host, "ws-1", "on");
    await service.onWorkspaceArchived("ws-1");
    expect((await service.view(host, "ws-1")).group?.endedAt).not.toBeNull();
  });

  it("resolves a member secret to its group, and stops after the group ends", async () => {
    const { service, host, store } = setup();
    const view = await service.setMode(host, "ws-1", "on");
    const lead = store.get("ws-1")!.group!.members[1];

    expect(service.groupForSecret(lead.secret)).toEqual({
      workspaceId: "ws-1",
      groupId: view.group!.id,
      you: { role: "lead", agentId: lead.agentId },
      members: view.group!.members.map(({ role, agentId }) => ({ role, agentId })),
    });
    expect(service.groupForSecret("unknown")).toBeNull();

    await service.onWorkspaceArchived("ws-1");
    expect(service.groupForSecret(lead.secret)).toBeNull();
  });

  it("lists the stored workspace modes", async () => {
    const { service, host } = setup();
    await service.setMode(host, "ws-1", "on");
    await service.onTurnStarted({ workspaceId: "ws-2" });
    expect(service.listModes()).toEqual([
      { workspaceId: "ws-1", mode: "on", locked: false },
      { workspaceId: "ws-2", mode: "off", locked: true },
    ]);
  });
});
