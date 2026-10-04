import { randomBytes, randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import type { PluginServerContext } from "@getpaseo/plugin/server";
import {
  getLedger,
  getReport,
  getWorkspace,
  humanDecide,
  importTemplates,
  listTemplates,
  listWorkspaceModes,
  removeTemplate,
  saveTemplate,
  setWorkspaceMode,
} from "./shared/contracts";
import { slpSettings } from "./shared/settings";
import { startMcpHttp, type McpHttpHandle } from "./server/mcp-http";
import { Coordination } from "./server/coordination";
import { createPaseoHost, type PaseoApi, type PaseoHost } from "./server/paseo-host";
import { WorkspaceQueue } from "./server/queue";
import { buildReport, renderReport } from "./server/report";
import { lastAssistantText } from "./server/timeline";
import { memberTools } from "./server/tools";
import { MCP_SERVER_NAME, SlpError, SlpService, memberAllows } from "./server/slp-service";
import { SlpStore } from "./server/store";
import { TemplateStore } from "./server/template-store";

const MCP_HOST = "127.0.0.1";
// Keep stable: member MCP URLs are persisted with each agent.
const MCP_PORT = Number(process.env.SLP_MCP_PORT ?? 6791);
const dataDir = join(process.env.PASEO_HOME ?? join(homedir(), ".paseo"), "plugin-data", "slp");
// Delivers held messages a missed agent.turn_ended left behind (decision 0004).
const RECONCILE_MS = 30_000;

export default function contribute(server: PluginServerContext) {
  const settings = server.registerSettings(slpSettings);
  const deps = {
    store: new SlpStore(dataDir),
    templates: new TemplateStore(dataDir),
    queue: new WorkspaceQueue(),
    mcpUrl: (secret: string) => `http://${MCP_HOST}:${MCP_PORT}/mcp/${secret}`,
    settings: async () => {
      const state = await settings.read();
      if (state.status !== "ready") throw new Error(`SLP settings are invalid: ${state.error}`);
      return state.values;
    },
    now: () => new Date().toISOString(),
    newId: () => randomUUID(),
    newSecret: () => randomBytes(24).toString("base64url"),
  };
  const service = new SlpService(deps);
  const coordination = new Coordination(deps);

  // The Paseo API arrives only with hooks and RPCs; the plugin process keeps
  // one long-lived instance, so the first one is reused.
  let host: PaseoHost | null = null;
  const bind = (paseo: PaseoApi) => {
    if (!host) {
      host = createPaseoHost(paseo);
      void reconcile();
    }
    return host;
  };
  const requireHost = () => {
    if (!host) throw new Error("SLP is still starting; retry in a moment.");
    return host;
  };
  const reconcile = async () => {
    if (!host) return;
    try {
      const delivered = await coordination.reconcile(host);
      if (delivered) console.log(`[slp] reconcile delivered ${delivered} held message(s)`);
    } catch (error) {
      console.error(`[slp] reconcile failed: ${String(error)}`);
    }
  };
  const timer = setInterval(() => void reconcile(), RECONCILE_MS);

  let mcp: McpHttpHandle | null = null;
  void startMcpHttp({
    host: MCP_HOST,
    port: MCP_PORT,
    serverName: MCP_SERVER_NAME,
    resolveCaller: (secret) => (service.groupForSecret(secret) ? secret : null),
    tools: memberTools(coordination, requireHost),
    toolAllowed: (secret, name) => {
      const found = deps.store.memberForSecret(secret);
      return found !== null && !found.group.endedAt && memberAllows(found.member, name);
    },
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
  server.handle(listWorkspaceModes, () => ({
    workspaces: service.listModes().map((entry) => ({ ...entry, waiting: coordination.waitingForHuman(entry.workspaceId) })),
  }));
  server.handle(getLedger, ({ workspaceId }) => coordination.ledgerView(workspaceId));
  server.handle(getReport, ({ workspaceId }) => {
    const group = deps.store.get(workspaceId)?.group;
    if (!group) return { report: null, markdown: null };
    const report = buildReport(group);
    return { report, markdown: renderReport(report) };
  });
  server.handle(humanDecide,({ workspaceId, ...input }, { paseo }) =>
    userFacing(() => coordination.humanDecide(bind(paseo), workspaceId, input)),
  );

  server.handle(listTemplates, () => ({ templates: deps.templates.list() }));
  server.handle(saveTemplate, ({ text, previousName }) =>
    userFacing(async () => ({ template: deps.templates.save(text, previousName) })),
  );
  server.handle(removeTemplate, ({ name }) => ({ removed: deps.templates.remove(name) }));
  server.handle(importTemplates, ({ path }) => userFacing(async () => deps.templates.importFolder(path)));

  const unsubscribers = [
    server.on("agent.turn_started", ({ agent }, { paseo }) => {
      bind(paseo);
      return service.onTurnStarted(agent);
    }),
    server.on("agent.turn_ended", ({ agent, outcome, timeline }, { paseo }) =>
      coordination.onTurnEnded(bind(paseo), {
        agentId: agent.id,
        workspaceId: agent.workspaceId,
        outcome,
        lastReply: lastAssistantText(timeline),
        timeline,
      }),
    ),
    server.on("agent.created", ({ agent }, { paseo }) => coordination.onAgentCreated(bind(paseo), agent)),
    server.on("agent.permission_requested", ({ agent, request }, { paseo }) => {
      bind(paseo);
      return coordination.onPermissionRequested({ agentId: agent.id, workspaceId: agent.workspaceId, request });
    }),
    server.on("agent.permission_resolved", ({ agent, requestId }) =>
      coordination.onPermissionResolved({ agentId: agent.id, workspaceId: agent.workspaceId, requestId }),
    ),
    server.on("workspace.archived", ({ workspace }) => service.onWorkspaceArchived(workspace.id)),
  ];

  return async () => {
    clearInterval(timer);
    for (const unsubscribe of unsubscribers) unsubscribe();
    await mcp?.close();
  };
}
