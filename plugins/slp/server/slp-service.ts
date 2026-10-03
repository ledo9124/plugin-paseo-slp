import { createHash } from "node:crypto";
import type { Mode, Role, TemplateView, WorkspaceView } from "../shared/contracts";
import { ROLE_TITLES, catalogSection, roleInstructions } from "../shared/roles";
import { DEFAULT_ROLE_TOOLS, SLP_TOOLS, type SlpSettings } from "../shared/settings";
import type { HostAgent, PaseoHost } from "./paseo-host";
import type { WorkspaceQueue } from "./queue";
import type { TemplateStore } from "./template-store";
import { emptyLedger, type GroupRecord, type MemberRecord, type SlpStore, type WorkspaceRecord } from "./store";

export const GROUP_LABEL = "slp.group";
export const ROLE_LABEL = "slp.role";
export const MCP_SERVER_NAME = "slp";
/** Plugin MCP tools; each member is offered only its own list (decision 0008). */
export const MEMBER_TOOLS = SLP_TOOLS;

/** Whether a member may use an SLP tool: its list from creation, else its role's default. */
export function memberAllows(member: MemberRecord, tool: string): boolean {
  return (member.tools ?? (DEFAULT_ROLE_TOOLS[member.role] as readonly string[])).includes(tool);
}

const GROUP_ROLES: readonly Role[] = ["supervisor", "lead"];

/** Claude Code's subagent tool; older versions call it Task (decision 0006). */
export const CLAUDE_SUBAGENT_TOOLS = ["Agent", "Task"];
/** Claude Code's tool for asking the user; only the Supervisor asks Human (0008). */
export const CLAUDE_QUESTION_TOOL = "AskUserQuestion";

/**
 * Claude tools removed per role. The Supervisor does not work on the project,
 * the Lead delegates only through slp_delegate (0006), and only the
 * Supervisor asks Human (0008). Other providers follow the role instructions.
 */
const CLAUDE_DISALLOWED: Record<Role, readonly string[]> = {
  supervisor: ["Edit", "Write", "NotebookEdit", ...CLAUDE_SUBAGENT_TOOLS],
  lead: [...CLAUDE_SUBAGENT_TOOLS, CLAUDE_QUESTION_TOOL],
  peer: [CLAUDE_QUESTION_TOOL],
};

/** The Supervisor's agent id: the parent of every other member (0009). */
export function supervisorOf(group: GroupRecord): string | null {
  return group.members.find((m) => m.role === "supervisor")?.agentId ?? null;
}

export function providerId(provider: string): string {
  return provider.split("/")[0];
}

export function slpMcpServers(url: string) {
  return { [MCP_SERVER_NAME]: { type: "http" as const, url, alwaysLoad: true } };
}

/** How SLP creates a member of a role, from the settings at creation (decision 0008). */
export interface MemberSetup {
  systemPrompt: string;
  tools: string[];
  /** Short hash of systemPrompt, shown in the process report. */
  instructionsHash: string;
  /** Human replaced the role's default text in Settings. */
  customInstructions: boolean;
  preapprovedTools: Array<{ server: string; tool: string }>;
  providerOptions?: { disallowedTools: string[] };
}

export function memberSetup(
  role: Role,
  provider: string,
  settings: SlpSettings,
  templates: readonly TemplateView[] = [],
): MemberSetup {
  const config = role === "peer" ? settings.peers : settings[role];
  const tools = [...(config.tools ?? DEFAULT_ROLE_TOOLS[role])];
  const text =
    config.instructions ??
    roleInstructions(role, { provider: providerId(provider), maxActivePeers: settings.peers.maxActive, tools });
  // The catalog is data after the text, default or custom; Peers get none.
  const allowed = role === "peer" ? [] : (settings[role].templates ?? templates.map((t) => t.name));
  const catalog = catalogSection(
    role,
    templates.filter((template) => allowed.includes(template.name)),
  );
  const systemPrompt = catalog ? `${text}\n\n${catalog}` : text;
  return {
    systemPrompt,
    tools,
    instructionsHash: createHash("sha256").update(systemPrompt).digest("hex").slice(0, 12),
    customInstructions: config.instructions !== undefined,
    preapprovedTools: tools.map((tool) => ({ server: MCP_SERVER_NAME, tool })),
    providerOptions:
      providerId(provider) === "claude" ? { disallowedTools: [...CLAUDE_DISALLOWED[role]] } : undefined,
  };
}

/** Records on the member what it was created with; the MCP endpoint and report read it. */
export function applySetup(member: MemberRecord, setup: MemberSetup): void {
  member.tools = setup.tools;
  member.instructionsHash = setup.instructionsHash;
  member.customInstructions = setup.customInstructions;
}

/**
 * The effort id to create a member with (0009): Human's setting when the
 * model lists it, or when the daemon cannot list efforts; otherwise none, so
 * the provider default applies instead of a failed create.
 */
export async function resolveEffort(
  host: PaseoHost,
  providerModel: string,
  wanted: string | undefined,
): Promise<{ thinkingOptionId?: string; dropped?: string }> {
  if (!wanted) return {};
  const listed = await host.thinkingOptions(providerModel);
  return listed === null || listed.includes(wanted) ? { thinkingOptionId: wanted } : { dropped: wanted };
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
  templates: TemplateStore;
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
    const setups = new Map(
      group.members.map((member) => {
        const setup = memberSetup(
          member.role,
          settings[member.role as "supervisor" | "lead"].provider,
          settings,
          this.deps.templates.list(),
        );
        applySetup(member, setup);
        return [member, setup] as const;
      }),
    );
    // Persist secrets and tool lists before creating agents, so their first MCP call resolves.
    this.deps.store.put({ ...record, mode: "on", group });
    try {
      for (const member of group.members) {
        const agent = await this.createMember(host, record.workspaceId, group, member, settings, setups.get(member)!);
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

  private async createMember(
    host: PaseoHost,
    workspaceId: string,
    group: GroupRecord,
    member: MemberRecord,
    settings: SlpSettings,
    setup: MemberSetup,
  ): Promise<HostAgent> {
    const config = settings[member.role as "supervisor" | "lead"];
    const effort = await resolveEffort(host, config.provider, config.thinkingOptionId);
    if (effort.dropped) {
      group.events.push({
        at: this.deps.now(),
        kind: "effort-dropped",
        data: { role: member.role, provider: config.provider, thinkingOptionId: effort.dropped },
      });
    }
    return host.createAgent({
      workspaceId,
      provider: config.provider,
      modeId: config.modeId,
      thinkingOptionId: effort.thinkingOptionId,
      // Only the Supervisor notifies Human: Paseo skips the finish attention
      // of an agent with a parent (Human, 2026-10-03; 0009).
      parent: member.role === "supervisor" ? undefined : (supervisorOf(group) ?? undefined),
      title: ROLE_TITLES[member.role],
      systemPrompt: setup.systemPrompt,
      mcpServers: slpMcpServers(this.deps.mcpUrl(member.secret)),
      preapprovedTools: setup.preapprovedTools,
      labels: { [GROUP_LABEL]: group.id, [ROLE_LABEL]: member.role },
      idempotencyKey: `slp:${group.id}:${member.role}`,
      providerOptions: setup.providerOptions,
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
