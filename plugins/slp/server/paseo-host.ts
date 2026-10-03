import type { PluginHandlerContext } from "@getpaseo/plugin/server";

// A plugin installed from Git is built without node_modules, so only the
// plugin SDK resolves: the Paseo API and its types come from the context the
// host hands handlers and hooks, not from `@getpaseo/client` or the protocol.
export type PaseoApi = PluginHandlerContext["paseo"];
type AgentCreateOptions = Parameters<PaseoApi["agents"]["create"]>[0];
type McpServerConfig = NonNullable<NonNullable<AgentCreateOptions["config"]>["mcpServers"]>[string];

// The only seam between SLP logic and the Paseo API. Keep it to the calls the
// plugin makes; tests use FakePaseoHost instead.

export interface HostAgent {
  id: string;
  workspaceId: string | null;
  provider: string;
  status: string;
  title: string | null;
  labels: Record<string, string>;
  parentAgentId: string | null;
  archivedAt: string | null;
  /** Last message sent to the agent as a user turn, by Human or a client. */
  lastUserMessageAt: string | null;
  /** Usage the provider reported for the agent's latest turn, if any. */
  lastUsage?: HostUsage | null;
}

export interface HostUsage {
  inputTokens?: number;
  cachedInputTokens?: number;
  outputTokens?: number;
  totalCostUsd?: number;
}

export interface CreateAgentInput {
  /** `provider/model`, for example `claude/haiku`. */
  provider: string;
  /** Provider mode id. Omitted, the provider's own default applies, not the app's. */
  modeId?: string;
  /** Place the agent in this workspace; Paseo then uses the workspace's directory. */
  workspaceId?: string;
  /** Required when no workspaceId is given. */
  cwd?: string;
  title?: string;
  systemPrompt?: string;
  mcpServers?: Record<string, McpServerConfig>;
  /** MCP tools the provider may call without a permission prompt. */
  preapprovedTools?: Array<{ server: string; tool: string }>;
  labels?: Record<string, string>;
  idempotencyKey?: string;
  parent?: string;
  prompt?: string;
  /** Provider-native options, validated by the provider (for Claude, `disallowedTools`). */
  providerOptions?: Record<string, string[]>;
}

export type ActiveTurnBehavior = "interrupt" | "steer";

export interface PaseoHost {
  createAgent(input: CreateAgentInput): Promise<HostAgent>;
  listAgents(filter?: { labels?: Record<string, string>; includeArchived?: boolean }): Promise<HostAgent[]>;
  getAgent(agentId: string): Promise<HostAgent | null>;
  sendPrompt(agentId: string, text: string, options?: { activeTurnBehavior?: ActiveTurnBehavior }): Promise<void>;
  archiveAgent(agentId: string): Promise<void>;
  /** Whether the daemon injects Paseo's own tools into agents. */
  injectsPaseoTools(): Promise<boolean>;
}

const PARENT_LABEL = "paseo.parent-agent-id";

type Snapshot = {
  id: string;
  workspaceId?: string;
  provider: string;
  status: string;
  title?: string | null;
  labels?: Record<string, string>;
  archivedAt?: string | null;
  lastUserMessageAt?: string | null;
  lastUsage?: HostUsage | null;
};

function toHostAgent(snapshot: Snapshot): HostAgent {
  const labels = snapshot.labels ?? {};
  return {
    id: snapshot.id,
    workspaceId: snapshot.workspaceId ?? null,
    provider: snapshot.provider,
    status: snapshot.status,
    title: snapshot.title ?? null,
    labels,
    parentAgentId: labels[PARENT_LABEL] ?? null,
    archivedAt: snapshot.archivedAt ?? null,
    lastUserMessageAt: snapshot.lastUserMessageAt ?? null,
    lastUsage: snapshot.lastUsage ?? null,
  };
}

export function createPaseoHost(paseo: PaseoApi): PaseoHost {
  return {
    async createAgent(input) {
      const options = {
        config: {
          provider: input.provider,
          modeId: input.modeId,
          systemPrompt: input.systemPrompt,
          mcpServers: input.mcpServers,
          ...(input.providerOptions ? { options: input.providerOptions } : {}),
          toolPolicy: input.preapprovedTools
            ? { preapproved: input.preapprovedTools.map((ref) => ({ kind: "mcp" as const, ...ref })) }
            : undefined,
        },
        title: input.title,
        labels: input.labels,
        idempotencyKey: input.idempotencyKey,
        parent: input.parent,
        prompt: input.prompt,
      };
      let handle;
      if (input.workspaceId) {
        handle = await paseo.workspaces.ref(input.workspaceId).agents.create(options);
      } else if (input.cwd) {
        handle = await paseo.agents.create({ ...options, cwd: input.cwd });
      } else {
        throw new Error("createAgent needs a workspaceId or a cwd");
      }
      const refreshed = await handle.refresh();
      if (!refreshed) throw new Error(`created agent ${handle.id} has no snapshot`);
      return toHostAgent(refreshed.agent);
    },

    async listAgents(filter) {
      const agents: HostAgent[] = [];
      let cursor: string | undefined;
      do {
        const result = await paseo.agents.list({ filter, page: { limit: 200, cursor } });
        agents.push(...result.entries.map((entry) => toHostAgent(entry.agent)));
        cursor = result.pageInfo.hasMore ? (result.pageInfo.nextCursor ?? undefined) : undefined;
      } while (cursor);
      return agents;
    },

    async getAgent(agentId) {
      const refreshed = await paseo.agents.ref(agentId).refresh();
      return refreshed ? toHostAgent(refreshed.agent) : null;
    },

    async sendPrompt(agentId, text, options) {
      // SDK 0.10.2 forwards activeTurnBehavior to the daemon but omits it from
      // PaseoAgentSendOptions, hence the widened type.
      const handle = paseo.agents.ref(agentId) as unknown as {
        send(text: string, options?: { activeTurnBehavior?: ActiveTurnBehavior }): Promise<void>;
      };
      await handle.send(text, options);
    },

    async archiveAgent(agentId) {
      await paseo.agents.ref(agentId).archive();
    },

    async injectsPaseoTools() {
      const { config } = await paseo.config.get();
      return config.mcp.enabled !== false && config.mcp.injectIntoAgents;
    },
  };
}
