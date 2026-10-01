import type { ActiveTurnBehavior, CreateAgentInput, HostAgent, PaseoHost } from "./paseo-host";

export interface FakeSend {
  agentId: string;
  text: string;
  activeTurnBehavior?: ActiveTurnBehavior;
}

// In-memory PaseoHost that mirrors the upstream behavior the plugin relies on:
// idempotent create per key, label filtering, and parent archive cascade.
export class FakePaseoHost implements PaseoHost {
  readonly agents = new Map<string, HostAgent>();
  readonly created: CreateAgentInput[] = [];
  readonly sends: FakeSend[] = [];
  private readonly byKey = new Map<string, string>();
  private nextId = 1;

  async createAgent(input: CreateAgentInput): Promise<HostAgent> {
    const existing = input.idempotencyKey ? this.byKey.get(input.idempotencyKey) : undefined;
    if (existing) return this.agents.get(existing)!;
    this.created.push(input);
    const labels = { ...input.labels };
    if (input.parent) labels["paseo.parent-agent-id"] = input.parent;
    const agent: HostAgent = {
      id: `agent-${this.nextId++}`,
      provider: input.provider.split("/")[0],
      status: "idle",
      title: input.title ?? null,
      labels,
      parentAgentId: input.parent ?? null,
      archivedAt: null,
    };
    this.agents.set(agent.id, agent);
    if (input.idempotencyKey) this.byKey.set(input.idempotencyKey, agent.id);
    return agent;
  }

  async listAgents(filter?: { labels?: Record<string, string>; includeArchived?: boolean }): Promise<HostAgent[]> {
    return [...this.agents.values()].filter(
      (agent) =>
        (filter?.includeArchived || agent.archivedAt === null) &&
        Object.entries(filter?.labels ?? {}).every(([key, value]) => agent.labels[key] === value),
    );
  }

  async getAgent(agentId: string): Promise<HostAgent | null> {
    return this.agents.get(agentId) ?? null;
  }

  async sendPrompt(agentId: string, text: string, options?: { activeTurnBehavior?: ActiveTurnBehavior }) {
    this.sends.push({ agentId, text, activeTurnBehavior: options?.activeTurnBehavior });
  }

  async archiveAgent(agentId: string): Promise<void> {
    const archivedAt = new Date(0).toISOString();
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`unknown agent ${agentId}`);
    agent.archivedAt = archivedAt;
    for (const child of this.agents.values()) {
      if (child.parentAgentId === agentId && child.archivedAt === null) await this.archiveAgent(child.id);
    }
  }
}
