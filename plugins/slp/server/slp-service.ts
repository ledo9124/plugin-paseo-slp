import type { Mode, Role, WorkspaceView } from "../shared/contracts";
import type { SlpSettings } from "../shared/settings";
import type { HostAgent, PaseoHost } from "./paseo-host";
import { ROLE_TITLES, roleInstructions } from "./roles";
import type { GroupRecord, MemberRecord, SlpStore, WorkspaceRecord } from "./store";

export const GROUP_LABEL = "slp.group";
export const ROLE_LABEL = "slp.role";
export const MCP_SERVER_NAME = "slp";
/** Plugin MCP tools every member may call without a permission prompt. */
export const MEMBER_TOOLS = ["slp_group"] as const;

const GROUP_ROLES: readonly Role[] = ["supervisor", "lead"];

export class SlpError extends Error {
  constructor(
    readonly code: "locked" | "inject-disabled",
    message: string,
  ) {
    super(message);
  }
}

export interface SlpServiceDeps {
  store: SlpStore;
  mcpUrl(secret: string): string;
  settings(): Promise<SlpSettings>;
  now(): string;
  newId(): string;
  newSecret(): string;
}

// SLP mode, lock, and group lifecycle per workspace (decisions 0002, 0005).
export class SlpService {
  private readonly queues = new Map<string, Promise<unknown>>();

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
    const config = settings[member.role];
    return host.createAgent({
      workspaceId,
      provider: config.provider,
      modeId: config.modeId,
      title: ROLE_TITLES[member.role],
      systemPrompt: roleInstructions(member.role),
      mcpServers: { [MCP_SERVER_NAME]: { type: "http", url: this.deps.mcpUrl(member.secret), alwaysLoad: true } },
      preapprovedTools: MEMBER_TOOLS.map((tool) => ({ server: MCP_SERVER_NAME, tool })),
      labels: { [GROUP_LABEL]: group.id, [ROLE_LABEL]: member.role },
      idempotencyKey: `slp:${group.id}:${member.role}`,
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

  /** Runs workspace operations one at a time, so two switches cannot start two groups. */
  private serialize<T>(workspaceId: string, work: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(workspaceId) ?? Promise.resolve();
    const next = previous.then(work, work);
    this.queues.set(
      workspaceId,
      next.catch(() => undefined),
    );
    return next;
  }
}
