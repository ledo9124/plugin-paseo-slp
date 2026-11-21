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
  /** Context the provider reports in use, and its window (Paseo 0.10.2+). */
  contextWindowUsedTokens?: number;
  contextWindowMaxTokens?: number;
}

export interface CreateAgentInput {
  /** `provider/model`, for example `claude/haiku`. */
  provider: string;
  /** Provider mode id. Omitted, the provider's own default applies, not the app's. */
  modeId?: string;
  /** Reasoning effort id the model lists; omitted, the provider default applies. */
  thinkingOptionId?: string;
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
  /** Provider-native options, validated by the provider (for Claude, `disallowedTools` and `extraArgs`). */
  providerOptions?: Record<string, unknown>;
}

export type ActiveTurnBehavior = "interrupt" | "steer";

export interface SendPromptOptions {
  activeTurnBehavior?: ActiveTurnBehavior;
  /**
   * The member the message is from. Paseo 0.12 shows it as the sender; older
   * hosts drop it, and a host without agent provenance gets a plain send.
   */
  sourceAgentId?: string;
}

/** One row of an agent's timeline, as the plugin reads it. */
export interface HostTimelineEntry {
  item: { type: string; text?: string; [field: string]: unknown };
  /** The turn the row belongs to; user messages may carry none. */
  turnId?: string;
  /** Position in the agent's timeline, stable within an epoch. */
  seq?: number;
  epoch?: string;
}

export interface PaseoHost {
  createAgent(input: CreateAgentInput): Promise<HostAgent>;
  listAgents(filter?: { labels?: Record<string, string>; includeArchived?: boolean }): Promise<HostAgent[]>;
  getAgent(agentId: string): Promise<HostAgent | null>;
  sendPrompt(agentId: string, text: string, options?: SendPromptOptions): Promise<void>;
  archiveAgent(agentId: string): Promise<void>;
  /**
   * The timeline rows of the turn that ended, oldest first, read from the
   * agent: Paseo 0.13+ sends `agent.turn_ended` with an empty timeline. The
   * rows may reach a little before the turn (its user message can carry no
   * turn id); callers dedupe by call, message and seq.
   */
  turnEntries(agentId: string, turnId: string | null): Promise<HostTimelineEntry[]>;
  /** Effort ids a `provider/model` lists, or null when the daemon cannot say. */
  thinkingOptions(providerModel: string): Promise<string[] | null>;
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

const TURN_PAGE = 50;
const TURN_MAX_PAGES = 10;

function toHostEntry(entry: { item: unknown; turnId?: string; seqStart: number }, epoch: string): HostTimelineEntry {
  return { item: entry.item as HostTimelineEntry["item"], turnId: entry.turnId, seq: entry.seqStart, epoch };
}

/**
 * Whether the rows show where the turn starts: a row of another turn lies
 * before the turn's first row. Null when none of the rows is the turn's (a
 * turn with no rows, or already pushed out by a newer one): not worth paging.
 */
function startsBefore(entries: readonly HostTimelineEntry[], turnId: string): boolean | null {
  const first = entries.findIndex((entry) => entry.turnId === turnId);
  if (first < 0) return null;
  return entries.slice(0, first).some((entry) => entry.turnId !== undefined);
}

export function createPaseoHost(paseo: PaseoApi): PaseoHost {
  return {
    async createAgent(input) {
      const options = {
        config: {
          provider: input.provider,
          modeId: input.modeId,
          ...(input.thinkingOptionId ? { thinkingOptionId: input.thinkingOptionId } : {}),
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
      const handle = paseo.agents.ref(agentId);
      try {
        await handle.send(text, options);
      } catch (error) {
        // A 0.12 client refuses a source the host cannot carry.
        if (!options?.sourceAgentId || !/provenance/i.test(String(error))) throw error;
        await handle.send(text, { activeTurnBehavior: options.activeTurnBehavior });
      }
    },

    async turnEntries(agentId, turnId) {
      // The tail is the end of the turn. "projected" merges streamed chunks and
      // tool lifecycles, so a page is a count of messages and calls. A turn
      // longer than a page is read back, page by page, until a row of an
      // earlier turn shows its start (or the cap).
      const timeline = paseo.agents.ref(agentId).timeline;
      let page = await timeline.refetch({ direction: "tail", limit: TURN_PAGE, projection: "projected" });
      let entries = page.entries.map((entry) => toHostEntry(entry, page.epoch));
      for (let pages = 1; turnId && startsBefore(entries, turnId) === false && page.hasOlder && page.startCursor; pages += 1) {
        if (pages >= TURN_MAX_PAGES) {
          console.error(`[slp] the turn of ${agentId} is longer than ${pages} pages; its start is not read`);
          break;
        }
        page = await timeline.refetch({ direction: "before", cursor: page.startCursor, limit: TURN_PAGE, projection: "projected" });
        entries = [...page.entries.map((entry) => toHostEntry(entry, page.epoch)), ...entries];
      }
      return entries;
    },

    async archiveAgent(agentId) {
      await paseo.agents.ref(agentId).archive();
    },

    async thinkingOptions(providerModel) {
      const [provider, ...rest] = providerModel.split("/");
      const modelId = rest.join("/");
      try {
        const { models } = await paseo.providers.listModels(provider);
        const model = models?.find((m) => m.id === modelId || m.aliases?.includes(modelId));
        return model ? (model.thinkingOptions ?? []).map((option) => option.id) : null;
      } catch {
        return null;
      }
    },

    async injectsPaseoTools() {
      const { config } = await paseo.config.get();
      return config.mcp.enabled !== false && config.mcp.injectIntoAgents;
    },
  };
}
