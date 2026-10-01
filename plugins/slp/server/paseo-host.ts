import type { PaseoApi } from "@getpaseo/client";
import type { McpServerConfig } from "@getpaseo/protocol/agent-types";

// The only seam between SLP logic and the Paseo API. Keep it to the calls the
// plugin makes; tests use FakePaseoHost instead.

export interface HostAgent {
  id: string;
  provider: string;
  status: string;
  title: string | null;
  labels: Record<string, string>;
  parentAgentId: string | null;
  archivedAt: string | null;
}

export interface CreateAgentInput {
  /** `provider/model`, for example `claude/haiku`. */
  provider: string;
  /** Provider mode id. Omitted, the provider's own default applies, not the app's. */
  modeId?: string;
  cwd: string;
  title?: string;
  systemPrompt?: string;
  mcpServers?: Record<string, McpServerConfig>;
  /** MCP tools the provider may call without a permission prompt. */
  preapprovedTools?: Array<{ server: string; tool: string }>;
  labels?: Record<string, string>;
  idempotencyKey?: string;
  parent?: string;
  prompt?: string;
}

export type ActiveTurnBehavior = "interrupt" | "steer";

export interface PaseoHost {
  createAgent(input: CreateAgentInput): Promise<HostAgent>;
  listAgents(filter?: { labels?: Record<string, string>; includeArchived?: boolean }): Promise<HostAgent[]>;
  getAgent(agentId: string): Promise<HostAgent | null>;
  sendPrompt(agentId: string, text: string, options?: { activeTurnBehavior?: ActiveTurnBehavior }): Promise<void>;
  archiveAgent(agentId: string): Promise<void>;
}

const PARENT_LABEL = "paseo.parent-agent-id";

type Snapshot = {
  id: string;
  provider: string;
  status: string;
  title?: string | null;
  labels?: Record<string, string>;
  archivedAt?: string | null;
};

function toHostAgent(snapshot: Snapshot): HostAgent {
  const labels = snapshot.labels ?? {};
  return {
    id: snapshot.id,
    provider: snapshot.provider,
    status: snapshot.status,
    title: snapshot.title ?? null,
    labels,
    parentAgentId: labels[PARENT_LABEL] ?? null,
    archivedAt: snapshot.archivedAt ?? null,
  };
}

export function createPaseoHost(paseo: PaseoApi): PaseoHost {
  return {
    async createAgent(input) {
      const handle = await paseo.agents.create({
        config: {
          provider: input.provider,
          modeId: input.modeId,
          systemPrompt: input.systemPrompt,
          mcpServers: input.mcpServers,
          toolPolicy: input.preapprovedTools
            ? { preapproved: input.preapprovedTools.map((ref) => ({ kind: "mcp" as const, ...ref })) }
            : undefined,
        },
        cwd: input.cwd,
        title: input.title,
        labels: input.labels,
        idempotencyKey: input.idempotencyKey,
        parent: input.parent,
        prompt: input.prompt,
      });
      const refreshed = await handle.refresh();
      if (!refreshed) throw new Error(`created agent ${handle.id} has no snapshot`);
      return toHostAgent(refreshed.agent);
    },

    async listAgents(filter) {
      const result = await paseo.agents.list({ filter });
      return result.entries.map((entry) => toHostAgent(entry.agent));
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
  };
}
