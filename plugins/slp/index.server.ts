import { randomBytes, randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import type { PaseoApi } from "@getpaseo/client";
import type { PluginServerContext } from "@getpaseo/plugin/server";
import { getWorkspace, listWorkspaceModes, setWorkspaceMode } from "./shared/contracts";
import { slpSettings } from "./shared/settings";
import { startMcpHttp, type McpHttpHandle } from "./server/mcp-http";
import { createPaseoHost, type PaseoHost } from "./server/paseo-host";
import { MCP_SERVER_NAME, SlpError, SlpService } from "./server/slp-service";
import { SlpStore } from "./server/store";

const MCP_HOST = "127.0.0.1";
// Keep stable: member MCP URLs are persisted with each agent.
const MCP_PORT = Number(process.env.SLP_MCP_PORT ?? 6791);
const dataDir = join(process.env.PASEO_HOME ?? join(homedir(), ".paseo"), "plugin-data", "slp");

export default function contribute(server: PluginServerContext) {
  const settings = server.registerSettings(slpSettings);
  const service = new SlpService({
    store: new SlpStore(dataDir),
    mcpUrl: (secret) => `http://${MCP_HOST}:${MCP_PORT}/mcp/${secret}`,
    settings: async () => {
      const state = await settings.read();
      if (state.status !== "ready") throw new Error(`SLP settings are invalid: ${state.error}`);
      return state.values;
    },
    now: () => new Date().toISOString(),
    newId: () => randomUUID(),
    newSecret: () => randomBytes(24).toString("base64url"),
  });

  // The Paseo API arrives only with hooks and RPCs; the plugin process keeps
  // one long-lived instance, so the first one is reused.
  let host: PaseoHost | null = null;
  const bind = (paseo: PaseoApi) => (host ??= createPaseoHost(paseo));

  let mcp: McpHttpHandle | null = null;
  void startMcpHttp({
    host: MCP_HOST,
    port: MCP_PORT,
    serverName: MCP_SERVER_NAME,
    resolveCaller: (secret) => (service.groupForSecret(secret) ? secret : null),
    tools: [
      {
        name: "slp_group",
        description:
          "Your SLP group: your role and agent id, and every member's role and agent id. Use the agent ids with Paseo's get_agent_status.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        call: (_args, secret) => service.groupForSecret(secret),
      },
    ],
  })
    .then((handle) => {
      mcp = handle;
      console.log(`[slp] MCP endpoint listening on ${MCP_HOST}:${MCP_PORT}; state in ${dataDir}`);
    })
    .catch((error) => console.error(`[slp] MCP endpoint failed to start: ${String(error)}`));

  const userFacing = async <T>(work: () => Promise<T>): Promise<T> => {
    try {
      return await work();
    } catch (error) {
      if (error instanceof SlpError) throw new Error(error.message);
      throw error;
    }
  };

  server.handle(getWorkspace, ({ workspaceId }, { paseo }) => service.view(bind(paseo), workspaceId));
  server.handle(setWorkspaceMode, ({ workspaceId, mode }, { paseo }) =>
    userFacing(() => service.setMode(bind(paseo), workspaceId, mode)),
  );
  server.handle(listWorkspaceModes, () => ({ workspaces: service.listModes() }));

  const unsubscribers = [
    server.on("agent.turn_started", ({ agent }) => service.onTurnStarted(agent)),
    server.on("workspace.archived", ({ workspace }) => service.onWorkspaceArchived(workspace.id)),
  ];

  return async () => {
    for (const unsubscribe of unsubscribers) unsubscribe();
    await mcp?.close();
  };
}
