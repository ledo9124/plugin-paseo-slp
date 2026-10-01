/** Runs operations on one workspace one at a time; different workspaces run freely. */
export class WorkspaceQueue {
  private readonly tails = new Map<string, Promise<unknown>>();

  run<T>(workspaceId: string, work: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(workspaceId) ?? Promise.resolve();
    const next = previous.then(work, work);
    this.tails.set(
      workspaceId,
      next.catch(() => undefined),
    );
    return next;
  }
}
