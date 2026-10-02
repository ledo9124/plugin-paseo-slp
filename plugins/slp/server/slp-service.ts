import type { Mode, Role, WorkspaceView } from "../shared/contracts";
import type { SlpSettings } from "../shared/settings";
import type { HostAgent, PaseoHost } from "./paseo-host";
import type { WorkspaceQueue } from "./queue";
import { providerOptionsFor, ROLE_TITLES, ROLE_TOOLS, roleInstructions } from "./roles";
import { emptyLedger, type GroupRecord, type MemberRecord, type SlpStore, type WorkspaceRecord } from "./store";

export const GROUP_LABEL = "slp.group";
export const ROLE_LABEL = "slp.role";
export const MCP_SERVER_NAME = "slp";
/** Every plugin MCP tool; each role is offered only its own (ROLE_TOOLS). */
export const MEMBER_TOOLS = [
  "slp_group",
  "slp_ledger",
  "slp_send",
  "slp_finding",
  "slp_delegate",
  "slp_accept",
  "slp_decide",
  "slp_revise_decision",
] as const;

const GROUP_ROLES: readonly Role[] = ["supervisor", "lead"];

export function slpMcpServers(url: string) {
  return { [MCP_SERVER_NAME]: { type: "http" as const, url, alwaysLoad: true } };
}

/** The role's own plugin tools, callable without a permission prompt. */
export function preapprovedTools(role: Role) {
  return ROLE_TOOLS[role].map((tool) => ({ server: MCP_SERVER_NAME, tool }));
}

export class SlpError extends Error {
  constructor(
    readonly code: "locked" | "inject-disabled" | "forbidden" | "invalid" | "limit",
    message: string,
  ) {
    super(message);
  }
}

export interface SlpServiceDeps {
  store: SlpStore;
  queue: WorkspaceQueue;
  mcpUrl(secret: string): string;
  settings(): Promise<SlpSettings>;
  now(): string;
  newId(): string;
  newSecret(): string;
}

// SLP mode, lock, and group lifecycle per workspace (decisions 0002, 0005).
export class SlpService {
  constructor(private readonly deps: SlpServiceDeps) {}

  async view(host: PaseoHost, workspaceId: string): Promise<WorkspaceView> {
    return this.serialize(workspaceId, async () => this.toView(host, await this.refreshLock(host, workspaceId)));
  }

  async setMode(host: PaseoHost, workspaceId: string, mode: Mode): Promise<WorkspaceView> {
    return this.serialize(workspaceId, async () => {
      const record = await this.refreshLock(host, workspaceId);
      if (record.lockedAt) {
        throw new SlpError(
          "locked",
          `SLP mode is locked ${record.mode} since Human's first message at ${record.lockedAt}. Use a new workspace to change it.`,
        );
      }
      if (record.mode !== mode) {
        if (mode === "on") await this.startGroup(host, record);
        else await this.stopGroup(host, record);
      }
      return this.toView(host, this.deps.store.getOrDefault(workspaceId));
    });
  }

  /** Human's first message in a workspace locks its mode (decision 0005). */
  async onTurnStarted(agent: { workspaceId: string | null }): Promise<void> {
    const { workspaceId } = agent;
    if (!workspaceId) return;
    await this.serialize(workspaceId, async () => {
      const record = this.deps.store.getOrDefault(workspaceId);
      if (record.lockedAt) return;
      this.deps.store.put({ ...record, lockedAt: this.deps.now() });
    });
  }

  /** Archiving the workspace ends its group; Paseo archives the members. */
  async onWorkspaceArchived(workspaceId: string): Promise<void> {
    await this.serialize(workspaceId, async () => {
      const record = this.deps.store.get(workspaceId);
      if (!record?.group || record.group.endedAt) return;
      this.deps.store.put({ ...record, group: { ...record.group, endedAt: this.deps.now() } });
    });
  }

  listModes(): Array<{ workspaceId: string; mode: Mode; locked: boolean }> {
    return this.deps.store.all().map((record) => ({
      workspaceId: record.workspaceId,
      mode: record.mode,
      locked: record.lockedAt !== null,
    }));
  }

  /** Group facts for the member behind an MCP secret, or null if unknown. */
  groupForSecret(secret: string) {
    const found = this.deps.store.memberForSecret(secret);
    if (!found || found.group.endedAt) return null;
    return {
      workspaceId: found.workspaceId,
      groupId: found.group.id,
      you: { role: found.member.role, agentId: found.member.agentId },
      members: found.group.members.map(({ role, agentId }) => ({ role, agentId })),
    };
  }

  private async refreshLock(host: PaseoHost, workspaceId: string): Promise<WorkspaceRecord> {
    const record = this.deps.store.getOrDefault(workspaceId);
    if (record.lockedAt) return record;
    // Fallback for a missed agent.turn_started: any message in the workspace,
    // or any agent SLP did not create, means work has started. Members of an
    // earlier group switched off before the lock are SLP's own and unmessaged.
    const agents = (await host.listAgents({ includeArchived: true })).filter(
      (agent) => agent.workspaceId === workspaceId,
    );
    const started = agents.some((agent) => agent.lastUserMessageAt !== null || !agent.labels[GROUP_LABEL]);
    if (!started) return record;
    const locked = { ...record, lockedAt: this.deps.now() };
    this.deps.store.put(locked);
    return locked;
  }

  private async startGroup(host: PaseoHost, record: WorkspaceRecord): Promise<void> {
    if (!(await host.injectsPaseoTools())) {
      throw new SlpError(
        "inject-disabled",
        "SLP needs daemon.mcp.injectIntoAgents enabled on this daemon. Enable it and try again.",
      );
    }
    const settings = await this.deps.settings();
    const previous = this.deps.store.get(record.workspaceId);
    const group: GroupRecord = {
      id: this.deps.newId(),
      startedAt: this.deps.now(),
      endedAt: null,
      members: GROUP_ROLES.map((role) => ({ role, secret: this.deps.newSecret(), agentId: null })),
      ledger: emptyLedger(),
      held: [],
      events: [],
      seen: [],
    };
    // Persist secrets before creating agents, so their first MCP call resolves.
    this.deps.store.put({ ...record, mode: "on", group });
    try {
      for (const member of group.members) {
        const agent = await this.createMember(host, record.workspaceId, group, member, settings);
        member.agentId = agent.id;
        this.deps.store.put({ ...record, mode: "on", group });
      }
    } catch (error) {
      await this.archiveMembers(host, group);
      // Leave no trace of a failed start, not even for an unknown workspace.
      if (previous) this.deps.store.put(previous);
      else this.deps.store.remove(record.workspaceId);
      throw error;
    }
  }

  private async stopGroup(host: PaseoHost, record: WorkspaceRecord): Promise<void> {
    if (record.group) await this.archiveMembers(host, record.group);
    this.deps.store.put({ ...record, mode: "off", group: null });
  }

  private createMember(
    host: PaseoHost,
    workspaceId: string,
    group: GroupRecord,
    member: MemberRecord,
    settings: SlpSettings,
  ): Promise<HostAgent> {
    const config = settings[member.role as "supervisor" | "lead"];
    return host.createAgent({
      workspaceId,
      provider: config.provider,
      modeId: config.modeId,
      title: ROLE_TITLES[member.role],
      systemPrompt: roleInstructions(member.role, config.provider),
      mcpServers: slpMcpServers(this.deps.mcpUrl(member.secret)),
      preapprovedTools: preapprovedTools(member.role),
      labels: { [GROUP_LABEL]: group.id, [ROLE_LABEL]: member.role },
      idempotencyKey: `slp:${group.id}:${member.role}`,
      providerOptions: providerOptionsFor(member.role, config.provider),
    });
  }

  private async archiveMembers(host: PaseoHost, group: GroupRecord): Promise<void> {
    for (const member of group.members) {
      if (!member.agentId) continue;
      const agent = await host.getAgent(member.agentId).catch(() => null);
      if (agent && !agent.archivedAt) await host.archiveAgent(member.agentId);
    }
  }

  private async toView(host: PaseoHost, record: WorkspaceRecord): Promise<WorkspaceView> {
    const members = [];
    for (const member of record.group?.members ?? []) {
      const agent = member.agentId ? await host.getAgent(member.agentId).catch(() => null) : null;
      members.push({
        role: member.role,
        agentId: member.agentId,
        title: agent?.title ?? null,
        provider: agent?.provider ?? null,
        status: agent?.status ?? null,
        archived: agent ? agent.archivedAt !== null : false,
      });
    }
    return {
      workspaceId: record.workspaceId,
      mode: record.mode,
      lockedAt: record.lockedAt,
      injectIntoAgents: await host.injectsPaseoTools(),
      group: record.group
        ? { id: record.group.id, startedAt: record.group.startedAt, endedAt: record.group.endedAt, members }
        : null,
    };
  }

  private serialize<T>(workspaceId: string, work: () => Promise<T>): Promise<T> {
    return this.deps.queue.run(workspaceId, work);
  }
}
