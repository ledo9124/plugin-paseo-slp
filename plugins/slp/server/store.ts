import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Mode, Role } from "../shared/contracts";

// Plugin-owned coordination state (decision 0003): which workspaces run SLP,
// when their mode locked, and who occupies each group role.

export interface MemberRecord {
  role: Role;
  /** Identifies the member to the plugin MCP endpoint. Never sent to clients. */
  secret: string;
  /** Current occupant of the role. */
  agentId: string | null;
}

export interface GroupRecord {
  id: string;
  startedAt: string;
  endedAt: string | null;
  members: MemberRecord[];
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
