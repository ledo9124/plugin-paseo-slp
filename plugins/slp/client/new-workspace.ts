// The "New SLP workspace" entry: which project is preselected, the create
// request, and the create -> turn on -> open sequence. Pure, so it is tested
// without Paseo; the screen in new-workspace-surface.tsx supplies the calls.

export type Isolation = "local" | "worktree";

/** The parts of a Paseo project the entry uses. */
export interface ProjectChoice {
  projectId: string;
  projectDisplayName: string;
  projectRootPath: string;
  projectKind: "git" | "non_git" | "directory";
}

/** The parts of a Paseo workspace the entry uses. */
export interface WorkspaceActivity {
  projectId: string;
  activityAt: string | null;
  archivingAt?: string | null;
}

/**
 * The project of the most recently active workspace (its `activityAt`), among
 * the projects offered. Null when no workspace has activity: Human then picks.
 * The only project is preselected too, since there is nothing to choose.
 */
export function preselectProject(
  projects: readonly ProjectChoice[],
  workspaces: readonly WorkspaceActivity[],
): string | null {
  const known = new Set(projects.map((project) => project.projectId));
  let best: { projectId: string; at: number } | null = null;
  for (const workspace of workspaces) {
    if (workspace.archivingAt || !known.has(workspace.projectId) || !workspace.activityAt) continue;
    const at = Date.parse(workspace.activityAt);
    if (Number.isNaN(at)) continue;
    if (!best || at > best.at) best = { projectId: workspace.projectId, at };
  }
  if (best) return best.projectId;
  return projects.length === 1 ? (projects[0]?.projectId ?? null) : null;
}

/** Worktrees need a git repository. */
export function canUseWorktree(project: ProjectChoice | undefined): boolean {
  return project?.projectKind === "git";
}

/** Worktree only where the project allows it; otherwise Local. */
export function effectiveIsolation(project: ProjectChoice | undefined, wanted: Isolation): Isolation {
  return wanted === "worktree" && canUseWorktree(project) ? "worktree" : "local";
}

export interface CreateRequest {
  idempotencyKey: string;
  source:
    | { kind: "directory"; path: string; projectId: string }
    // The daemon names the worktree and its branch when no slug is given.
    | { kind: "worktree"; cwd: string; projectId: string };
}

/** Local backs the workspace with the project's checkout, as Paseo's own screen does. */
export function buildCreateRequest(project: ProjectChoice, isolation: Isolation, idempotencyKey: string): CreateRequest {
  const { projectId, projectRootPath } = project;
  return effectiveIsolation(project, isolation) === "worktree"
    ? { idempotencyKey, source: { kind: "worktree", cwd: projectRootPath, projectId } }
    : { idempotencyKey, source: { kind: "directory", path: projectRootPath, projectId } };
}

/** A new key for every press: a failed attempt's key could replay its failure. */
export function newIdempotencyKey(random: () => number = Math.random, now: () => number = Date.now): string {
  return `slp-new-workspace-${now().toString(36)}-${random().toString(36).slice(2, 12)}`;
}

export const OPEN_RETRY = { intervalMs: 250, attempts: 12 } as const; // about 3 s

/**
 * Runs `attempt` until it stops throwing, up to `attempts` times, `intervalMs`
 * apart. The app learns of a just-created workspace a moment after the daemon
 * answers, and opening a panel in it fails until then.
 */
export async function retry(
  attempt: () => void,
  policy: { intervalMs: number; attempts: number },
  sleep: (ms: number) => Promise<void>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let error = "";
  for (let n = 0; n < policy.attempts; n++) {
    if (n > 0) await sleep(policy.intervalMs);
    try {
      attempt();
      return { ok: true };
    } catch (cause) {
      error = messageOf(cause);
    }
  }
  return { ok: false, error };
}

export function messageOf(cause: unknown): string {
  return String(cause instanceof Error ? cause.message : cause);
}

export interface FlowDeps {
  create(request: CreateRequest): Promise<{ id: string }>;
  turnOn(workspaceId: string): Promise<unknown>;
  /** Opens the SLP panel; throws while the app does not know the workspace yet. */
  openPanel(workspaceId: string): void;
  /** Fallback when the panel cannot be opened: at least land in the workspace. */
  openWorkspace?(workspaceId: string): void;
  sleep(ms: number): Promise<void>;
  onStep?(step: "creating" | "turning-on" | "opening"): void;
}

export interface FlowResult {
  workspaceId: string;
  /** SLP could not be turned on; the panel's own switch is the way on. */
  modeError: string | null;
  /** The panel could not be opened; null when it opened. */
  openError: string | null;
}

/**
 * Create the workspace, turn SLP on, open the panel there. A failed create
 * rejects (nothing exists then). Once the workspace exists, later failures are
 * reported in the result and the sequence goes on, so Human always lands in it.
 */
export async function createSlpWorkspace(request: CreateRequest, deps: FlowDeps): Promise<FlowResult> {
  deps.onStep?.("creating");
  const { id: workspaceId } = await deps.create(request);

  deps.onStep?.("turning-on");
  let modeError: string | null = null;
  try {
    await deps.turnOn(workspaceId);
  } catch (cause) {
    modeError = messageOf(cause);
  }

  deps.onStep?.("opening");
  const opened = await retry(() => deps.openPanel(workspaceId), OPEN_RETRY, deps.sleep);
  if (opened.ok) return { workspaceId, modeError, openError: null };

  const { openWorkspace } = deps;
  const fallback = openWorkspace
    ? await retry(() => openWorkspace(workspaceId), OPEN_RETRY, deps.sleep)
    : { ok: false as const };
  const detail = fallback.ok ? "The workspace is open; open the SLP panel from its header." : "Open it from the sidebar.";
  return { workspaceId, modeError, openError: `Could not open the SLP panel (${opened.error}). ${detail}` };
}

/**
 * What Human must be told after the flow, or null when all went well. Shown
 * inline and as a toast, because the panel opening replaces this screen.
 */
export function flowNotice(result: FlowResult): string | null {
  const parts = [
    result.modeError
      ? `The workspace was created, but SLP could not be turned on: ${result.modeError}. Turn it on from the SLP panel.`
      : null,
    result.openError,
  ].filter((part): part is string => part !== null);
  return parts.length ? parts.join("\n") : null;
}
