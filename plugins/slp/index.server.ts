import { homedir } from "node:os";
import { join } from "node:path";
import { defineRpc } from "@getpaseo/plugin";
import type { PluginServerContext } from "@getpaseo/plugin/server";
import type { PaseoApi } from "@getpaseo/client";
import { z } from "zod";
import { startMcpHttp, type McpHttpHandle } from "./server/mcp-http";
import { createPaseoHost, type PaseoHost } from "./server/paseo-host";
import { lastAssistantText, MCP_SERVER_NAME, PROBE_LABEL, ProbeService, ProbeStore } from "./server/probe";

// Slice 1 probe build (docs/plans/active/slp-plugin-v0.1.md). Throwaway: it
// observes platform behavior and carries no SLP logic.

const MCP_HOST = "127.0.0.1";
const MCP_PORT = Number(process.env.SLP_PROBE_MCP_PORT ?? 6791);
const dataDir = join(process.env.PASEO_HOME ?? join(homedir(), ".paseo"), "plugin-data", "slp-probe");

const AgentSchema = z.object({
  id: z.string(),
  provider: z.string(),
  status: z.string(),
  title: z.string().nullable(),
  labels: z.record(z.string(), z.string()),
  parentAgentId: z.string().nullable(),
  archivedAt: z.string().nullable(),
});

const createMember = defineRpc({
  name: "probe.create",
  input: z.object({
    key: z.string().regex(/^[a-z0-9-]+$/),
    provider: z.string(),
    cwd: z.string(),
    title: z.string().optional(),
    systemPrompt: z.string().optional(),
    parent: z.string().optional(),
    prompt: z.string().optional(),
    withMcp: z.boolean().default(true),
    handback: z.boolean().default(false),
  }),
  output: AgentSchema,
});

const listMembers = defineRpc({
  name: "probe.list",
  input: z.object({ includeArchived: z.boolean().default(true) }),
  output: z.object({ agents: z.array(AgentSchema), members: z.array(z.unknown()) }),
});

const sendPrompt = defineRpc({
  name: "probe.send",
  input: z.object({
    agentId: z.string(),
    text: z.string(),
    activeTurnBehavior: z.enum(["interrupt", "steer"]).optional(),
  }),
  output: z.object({ ok: z.literal(true) }),
});

const archiveAgent = defineRpc({
  name: "probe.archive",
  input: z.object({ agentId: z.string() }),
  output: z.object({ ok: z.literal(true) }),
});

const reconcile = defineRpc({
  name: "probe.reconcile",
  input: z.object({}),
  output: z.object({
    matched: z.array(z.object({ key: z.string(), agentId: z.string() })),
    missing: z.array(z.string()),
    orphans: z.array(z.string()),
  }),
});

const events = defineRpc({
  name: "probe.events",
  input: z.object({ limit: z.number().int().positive().default(50) }),
  output: z.object({ events: z.array(z.unknown()) }),
});

export default function contribute(server: PluginServerContext) {
  const store = new ProbeStore(dataDir);
  let mcp: McpHttpHandle | null = null;
  const service = new ProbeService(store, (secret) => `http://${MCP_HOST}:${MCP_PORT}/mcp/${secret}`);

  // The Paseo API arrives only with the first hook or RPC. Reconciliation runs
  // once, at that first contact.
  let host: PaseoHost | null = null;
  let firstContact: Promise<void> | null = null;
  function bind(paseo: PaseoApi, via: string): Promise<PaseoHost> {
    host ??= createPaseoHost(paseo);
    firstContact ??= service
      .reconcile(host)
      .then((result) => store.record({ kind: "first-contact", via, ...result }))
      .catch((error) => store.record({ kind: "first-contact.failed", via, error: String(error) }));
    return firstContact.then(() => host!);
  }

  void startMcpHttp({
    host: MCP_HOST,
    port: MCP_PORT,
    serverName: MCP_SERVER_NAME,
    resolveCaller: (secret) => service.memberForSecret(secret),
    onRequest: ({ method, known }) => store.record({ kind: "mcp.request", method, known }),
    tools: [
      {
        name: "slp_whoami",
        description: "Probe: return the SLP member identity bound to this connection.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        call: (_args, member) => {
          store.record({ kind: "mcp.whoami", key: member.key, agentId: member.agentId });
          return { key: member.key, agentId: member.agentId };
        },
      },
      {
        name: "slp_sleep",
        description: "Probe: wait the given number of seconds (max 180), then return.",
        inputSchema: {
          type: "object",
          properties: { seconds: { type: "number" } },
          required: ["seconds"],
          additionalProperties: false,
        },
        call: async (args, member) => {
          const seconds = Math.min(180, Math.max(0, Number(args.seconds) || 0));
          store.record({ kind: "mcp.sleep.start", key: member.key, seconds });
          await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
          store.record({ kind: "mcp.sleep.end", key: member.key, seconds });
          return { slept: seconds };
        },
      },
    ],
  })
    .then((handle) => {
      mcp = handle;
      store.record({ kind: "mcp.listening", port: MCP_PORT, dataDir });
    })
    .catch((error) => store.record({ kind: "mcp.failed", error: String(error) }));

  server.handle(createMember, async (input, { paseo }) => service.createMember(await bind(paseo, "rpc"), input));
  server.handle(listMembers, async (input, { paseo }) => ({
    agents: await (await bind(paseo, "rpc")).listAgents({ labels: { [PROBE_LABEL]: "1" }, includeArchived: input.includeArchived }),
    members: store.members().map(({ secret: _secret, ...member }) => member),
  }));
  server.handle(sendPrompt, async (input, { paseo }) => {
    await (await bind(paseo, "rpc")).sendPrompt(input.agentId, input.text, { activeTurnBehavior: input.activeTurnBehavior });
    store.record({ kind: "send", agentId: input.agentId, activeTurnBehavior: input.activeTurnBehavior ?? null });
    return { ok: true as const };
  });
  server.handle(archiveAgent, async (input, { paseo }) => {
    await (await bind(paseo, "rpc")).archiveAgent(input.agentId);
    return { ok: true as const };
  });
  server.handle(reconcile, async (_input, { paseo }) => service.reconcile(await bind(paseo, "rpc")));
  server.handle(events, async (input) => ({ events: store.events(input.limit) }));

  const unsubscribers = [
    server.on("agent.created", async ({ agent }, { paseo }) => {
      await bind(paseo, "agent.created");
      store.record({ kind: "agent.created", agentId: agent.id, parentAgentId: agent.parentAgentId, provider: agent.provider });
    }),
    server.on("agent.turn_started", async ({ agent, turnId }, { paseo }) => {
      await bind(paseo, "agent.turn_started");
      store.record({ kind: "agent.turn_started", agentId: agent.id, turnId });
    }),
    server.on("agent.turn_ended", async ({ agent, turnId, outcome, timeline }, { paseo }) => {
      const bound = await bind(paseo, "agent.turn_ended");
      const reply = lastAssistantText(timeline);
      const tools = timeline.filter((item) => item.type === "tool_call").map((item) => ("name" in item ? item.name : "?"));
      store.record({
        kind: "agent.turn_ended",
        agentId: agent.id,
        parentAgentId: agent.parentAgentId,
        turnId,
        outcome,
        tools,
        reply: reply?.slice(0, 2000) ?? null,
      });
      if (outcome.kind === "completed") await service.relayHandback(bound, agent, reply);
    }),
    server.on("agent.archived", async ({ agent, archivedAt }) => {
      store.record({ kind: "agent.archived", agentId: agent.id, parentAgentId: agent.parentAgentId, archivedAt });
    }),
  ];

  return async () => {
    for (const unsubscribe of unsubscribers) unsubscribe();
    await mcp?.close();
  };
}
