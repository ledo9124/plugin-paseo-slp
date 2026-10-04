// Paseo agent and workspace updates, as one signal for the header buttons and
// the open panels. The plugin server cannot push to the client, so ledger
// changes show up through the agent updates they come with (a turn starting or
// ending, a permission request); a slow poll in each consumer covers the rest.

/** The workspace an update belongs to, or null when it cannot be told. */
type Listener = (workspaceId: string | null) => void;

const COALESCE_MS = 300;
const listeners = new Set<Listener>();
const pending = new Set<string | null>();
let timer: ReturnType<typeof setTimeout> | null = null;

export function onSlpActivity(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Agents emit bursts of updates while they work; one refresh per burst is enough. */
export function announceSlpActivity(workspaceId: string | null): void {
  pending.add(workspaceId);
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    const batch = [...pending];
    pending.clear();
    for (const id of batch) for (const listener of [...listeners]) listener(id);
  }, COALESCE_MS);
}

export function stopSlpActivity(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  pending.clear();
}
