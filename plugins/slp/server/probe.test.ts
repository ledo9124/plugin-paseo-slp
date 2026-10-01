import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FakePaseoHost } from "./paseo-host.fake";
import { lastAssistantText, MEMBER_LABEL, ProbeService, ProbeStore } from "./probe";

function setup() {
  const store = new ProbeStore(mkdtempSync(join(tmpdir(), "slp-probe-")));
  const service = new ProbeService(store, (secret) => `http://mcp.test/mcp/${secret}`);
  return { store, service, host: new FakePaseoHost() };
}

const base = { provider: "claude/haiku", cwd: "/repo", withMcp: true, handback: false };

describe("ProbeService", () => {
  it("creates a member with its own secret URL, labels, and idempotency key", async () => {
    const { store, service, host } = setup();
    const agent = await service.createMember(host, { ...base, key: "lead" });

    const [input] = host.created;
    const [member] = store.members();
    expect(input.idempotencyKey).toBe("slp-probe:lead");
    expect(input.labels?.[MEMBER_LABEL]).toBe("lead");
    expect(input.mcpServers?.slp).toMatchObject({ type: "http", url: `http://mcp.test/mcp/${member.secret}` });
    expect(member.agentId).toBe(agent.id);
    expect(service.memberForSecret(member.secret)?.key).toBe("lead");
  });

  it("keeps the secret and agent when the same key is created again", async () => {
    const { store, service, host } = setup();
    const first = await service.createMember(host, { ...base, key: "lead" });
    const secret = store.members()[0].secret;
    const second = await service.createMember(host, { ...base, key: "lead" });

    expect(second.id).toBe(first.id);
    expect(store.members()).toHaveLength(1);
    expect(store.members()[0].secret).toBe(secret);
  });

  it("reconciles stored members against labeled agents", async () => {
    const { service, host } = setup();
    await service.createMember(host, { ...base, key: "lead" });
    const peer = await service.createMember(host, { ...base, key: "peer-1" });
    await host.archiveAgent(peer.id);
    await host.createAgent({ provider: "claude/haiku", cwd: "/repo", labels: { "slp.probe": "1", [MEMBER_LABEL]: "stray" } });

    const result = await service.reconcile(host);
    expect(result.matched.map((entry) => entry.key)).toEqual(["lead"]);
    expect(result.missing).toEqual(["peer-1"]);
    expect(result.orphans).toHaveLength(1);
  });

  it("relays a handback child's last reply to its parent by steering", async () => {
    const { service, host } = setup();
    const lead = await service.createMember(host, { ...base, key: "lead" });
    const peer = await service.createMember(host, { ...base, key: "peer-1", parent: lead.id, handback: true });

    expect(await service.relayHandback(host, peer, "done")).toBe(true);
    expect(host.sends).toEqual([
      { agentId: lead.id, text: expect.stringContaining("done"), activeTurnBehavior: "steer" },
    ]);
  });

  it("does not relay for a child without the handback label", async () => {
    const { service, host } = setup();
    const lead = await service.createMember(host, { ...base, key: "lead" });
    const peer = await service.createMember(host, { ...base, key: "peer-1", parent: lead.id });

    expect(await service.relayHandback(host, peer, "done")).toBe(false);
    expect(host.sends).toEqual([]);
  });
});

describe("FakePaseoHost", () => {
  it("cascades archive from parent to children", async () => {
    const host = new FakePaseoHost();
    const parent = await host.createAgent({ provider: "claude/haiku", cwd: "/repo" });
    const child = await host.createAgent({ provider: "claude/haiku", cwd: "/repo", parent: parent.id });
    await host.archiveAgent(parent.id);
    expect((await host.getAgent(child.id))?.archivedAt).not.toBeNull();
  });
});

describe("lastAssistantText", () => {
  it("returns the latest assistant message", () => {
    expect(
      lastAssistantText([
        { type: "assistant_message", text: "first" },
        { type: "tool_call" },
        { type: "assistant_message", text: "last" },
        { type: "user_message", text: "hi" },
      ]),
    ).toBe("last");
  });
});
