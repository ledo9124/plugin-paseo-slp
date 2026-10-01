import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Ledger, Mode, Role } from "../shared/contracts";

// Plugin-owned coordination state (decision 0003): which workspaces run SLP,
// when their mode locked, and who occupies each group role.

export interface MemberRecord {
  role: Role;
  /** Identifies the member to the plugin MCP endpoint. Never sent to clients. */
  secret: string;
  /** Current occupant of the role. */
  agentId: string | null;
  /** Display name, set for Peers ("SLP Peer 1"). */
  title?: string;
}

/** A message waiting for its recipient's turn to end (decision 0004). */
export interface HeldMessage {
  id: string;
  fromAgentId: string | null;
  fromRole: Role | "plugin";
  toAgentId: string;
  kind: "message" | "handback" | "notice";
  text: string;
  /** Set when the message carries an assignment's brief or rework request. */
  assignmentId?: string;
  at: string;
}

/** Append-only process data for telemetry (slice 5). */
export interface EventRecord {
  at: string;
  kind: string;
  data: Record<string, unknown>;
}

export interface GroupRecord {
  id: string;
  startedAt: string;
  endedAt: string | null;
  members: MemberRecord[];
  ledger: Ledger;
  held: HeldMessage[];
  events: EventRecord[];
}

export function emptyLedger(): Ledger {
  return { assignments: [], findings: [], decisions: [] };
}

export interface WorkspaceRecord {
  workspaceId: string;
  mode: Mode;
  lockedAt: string | null;
  group: GroupRecord | null;
}

interface StateFile {
  version: 1;
  workspaces: Record<string, WorkspaceRecord>;
}

export class SlpStore {
  private readonly path: string;
  private state: StateFile;

  constructor(dir: string) {
    mkdirSync(dir, { recursive: true });
    this.path = join(dir, "state.json");
    this.state = existsSync(this.path)
      ? (JSON.parse(readFileSync(this.path, "utf8")) as StateFile)
      : { version: 1, workspaces: {} };
    // Groups started before slice 3 have no ledger, held messages, or events.
    for (const record of Object.values(this.state.workspaces)) {
      if (!record.group) continue;
      record.group.ledger ??= emptyLedger();
      record.group.held ??= [];
      record.group.events ??= [];
      for (const assignment of record.group.ledger.assignments) assignment.briefDeliveredAt ??= assignment.createdAt;
    }
  }

  get(workspaceId: string): WorkspaceRecord | null {
    return this.state.workspaces[workspaceId] ?? null;
  }

  getOrDefault(workspaceId: string): WorkspaceRecord {
    return this.get(workspaceId) ?? { workspaceId, mode: "off", lockedAt: null, group: null };
  }

  all(): WorkspaceRecord[] {
    return Object.values(this.state.workspaces);
  }

  put(record: WorkspaceRecord): void {
    this.state.workspaces[record.workspaceId] = record;
    this.write();
  }

  private write(): void {
    const temp = `${this.path}.tmp`;
    writeFileSync(temp, JSON.stringify(this.state, null, 2));
    renameSync(temp, this.path);
  }

  remove(workspaceId: string): void {
    delete this.state.workspaces[workspaceId];
    this.write();
  }

  memberForSecret(secret: string): { workspaceId: string; group: GroupRecord; member: MemberRecord } | null {
    for (const record of this.all()) {
      const member = record.group?.members.find((candidate) => candidate.secret === secret);
      if (record.group && member) return { workspaceId: record.workspaceId, group: record.group, member };
    }
    return null;
  }
}
