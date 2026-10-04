// Paseo agent and workspace updates, as one signal for the header buttons and
// the open panels. The plugin server cannot push to the client, so ledger
// changes show up through the agent updates they come with (a turn starting or
// ending, a permission request); a slow poll in each consumer covers the rest.

/** The workspaces a burst of updates touched; null stands for an update whose workspace cannot be told. */
type Listener = (workspaceIds: ReadonlyArray<string | null>) => void;

const COALESCE_MS = 300;
const listeners = new Set<Listener>();
const pending = new Set<string | null>();
let timer: ReturnType<typeof setTimeout> | null = null;

/** Whether a batch concerns one workspace: it names it, or holds an update of unknown workspace. */
export function touches(workspaceIds: ReadonlyArray<string | null>, workspaceId: string): boolean {
  return workspaceIds.some((id) => id === null || id === workspaceId);
}

export function onSlpActivity(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Agents emit bursts of updates while they work; each listener is called once per burst. */
export function announceSlpActivity(workspaceId: string | null): void {
  pending.add(workspaceId);
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    const batch = [...pending];
    pending.clear();
    for (const listener of [...listeners]) listener(batch);
  }, COALESCE_MS);
}

export function stopSlpActivity(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  pending.clear();
}
