import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, appendFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { HostAgent, PaseoHost } from "./paseo-host";

// Slice 1 probe logic (docs/plans/active/slp-plugin-v0.1.md). Throwaway: it
// exists to observe platform behavior, not to implement SLP.

export const PROBE_LABEL = "slp.probe";
export const MEMBER_LABEL = "slp.member";
export const HANDBACK_LABEL = "slp.handback";
export const MCP_SERVER_NAME = "slp";

export interface ProbeMember {
  key: string;
  secret: string;
  agentId: string | null;
  createdAt: string;
}

export class ProbeStore {
  private readonly membersPath: string;
  private readonly eventsPath: string;

  constructor(dir: string) {
    mkdirSync(dir, { recursive: true });
    this.membersPath = join(dir, "members.json");
    this.eventsPath = join(dir, "events.jsonl");
  }

  members(): ProbeMember[] {
    if (!existsSync(this.membersPath)) return [];
    return JSON.parse(readFileSync(this.membersPath, "utf8")) as ProbeMember[];
  }

  saveMembers(members: ProbeMember[]): void {
    writeFileSync(this.membersPath, JSON.stringify(members, null, 2));
  }

  record(event: Record<string, unknown>): void {
    const line = { at: new Date().toISOString(), ...event };
    appendFileSync(this.eventsPath, `${JSON.stringify(line)}\n`);
    console.log(`[slp-probe] ${JSON.stringify(line)}`);
  }

  events(limit: number): unknown[] {
    if (!existsSync(this.eventsPath)) return [];
    return readFileSync(this.eventsPath, "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .slice(-limit)
      .map((line) => JSON.parse(line));
  }
}

export interface CreateMemberInput {
  key: string;
  provider: string;
  cwd: string;
  title?: string;
  systemPrompt?: string;
  parent?: string;
  prompt?: string;
  withMcp: boolean;
  handback: boolean;
}

export interface ReconcileResult {
  matched: Array<{ key: string; agentId: string }>;
  missing: string[];
  orphans: string[];
}

export class ProbeService {
  constructor(
    private readonly store: ProbeStore,
    private readonly mcpUrl: (secret: string) => string,
  ) {}

  memberForSecret(secret: string): ProbeMember | null {
    return this.store.members().find((member) => member.secret === secret) ?? null;
  }

  async createMember(host: PaseoHost, input: CreateMemberInput): Promise<HostAgent> {
    const members = this.store.members();
    let member = members.find((candidate) => candidate.key === input.key);
    if (!member) {
      member = { key: input.key, secret: randomBytes(24).toString("base64url"), agentId: null, createdAt: new Date().toISOString() };
      members.push(member);
      this.store.saveMembers(members);
    }
    const labels: Record<string, string> = { [PROBE_LABEL]: "1", [MEMBER_LABEL]: input.key };
    if (input.handback) labels[HANDBACK_LABEL] = "1";
    const agent = await host.createAgent({
      provider: input.provider,
      cwd: input.cwd,
      title: input.title ?? `slp-probe ${input.key}`,
      systemPrompt: input.systemPrompt,
      mcpServers: input.withMcp
        ? { [MCP_SERVER_NAME]: { type: "http", url: this.mcpUrl(member.secret), alwaysLoad: true } }
        : undefined,
      preapprovedTools: input.withMcp
        ? [
            { server: MCP_SERVER_NAME, tool: "slp_whoami" },
            { server: MCP_SERVER_NAME, tool: "slp_sleep" },
            // Probe 4: v0.10.2 rejects preapproving Paseo's injected `paseo`
            // server ("requires MCP server 'paseo' in the same agent request").
          ]
        : undefined,
      labels,
      idempotencyKey: `slp-probe:${input.key}`,
      parent: input.parent,
      prompt: input.prompt,
    });
    member.agentId = agent.id;
    this.store.saveMembers(members);
    this.store.record({ kind: "member.created", key: input.key, agentId: agent.id, parentAgentId: agent.parentAgentId });
    return agent;
  }

  async reconcile(host: PaseoHost): Promise<ReconcileResult> {
    const members = this.store.members();
    const agents = await host.listAgents({ labels: { [PROBE_LABEL]: "1" } });
    const result: ReconcileResult = { matched: [], missing: [], orphans: [] };
    for (const member of members) {
      const agent = agents.find((candidate) => candidate.labels[MEMBER_LABEL] === member.key);
      if (agent) {
        member.agentId = agent.id;
        result.matched.push({ key: member.key, agentId: agent.id });
      } else {
        result.missing.push(member.key);
      }
    }
    for (const agent of agents) {
      if (!members.some((member) => member.key === agent.labels[MEMBER_LABEL])) result.orphans.push(agent.id);
    }
    this.store.saveMembers(members);
    this.store.record({ kind: "reconciled", ...result });
    return result;
  }

  /** Relays a handback-labeled child's last reply to its parent. */
  async relayHandback(
    host: PaseoHost,
    agent: { id: string; parentAgentId: string | null },
    lastReply: string | null,
  ): Promise<boolean> {
    if (!agent.parentAgentId) return false;
    const snapshot = await host.getAgent(agent.id);
    if (snapshot?.labels[HANDBACK_LABEL] !== "1") return false;
    const text = `<slp-handback from="${agent.id}">\n${lastReply ?? "(no reply text)"}\n</slp-handback>`;
    await host.sendPrompt(agent.parentAgentId, text, { activeTurnBehavior: "steer" });
    this.store.record({ kind: "handback.relayed", from: agent.id, to: agent.parentAgentId });
    return true;
  }
}

export function lastAssistantText(timeline: readonly { type: string; text?: string }[]): string | null {
  for (let index = timeline.length - 1; index >= 0; index -= 1) {
    const item = timeline[index];
    if (item.type === "assistant_message" && typeof item.text === "string") return item.text;
  }
  return null;
}
