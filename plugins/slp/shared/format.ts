// Formatting shared by the server's Markdown report and the panel.

export function counts(values: Record<string, number>): string {
  const entries = Object.entries(values);
  return entries.length ? entries.map(([key, value]) => `${key} ${value}`).join(", ") : "none";
}

export function total(values: Record<string, number>): number {
  return Object.values(values).reduce((sum, value) => sum + value, 0);
}

/** Native questions by Lead and Peers: only the Supervisor may ask Human through its question tool. */
export function nativeQuestionBreaks(byRole: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(byRole).filter(([role]) => role !== "supervisor"));
}

/**
 * Items waiting for Human in a group: pending decisions plus unanswered native
 * questions, the count the panel's "Needs you" section shows. An ended group
 * (its workspace archived) can no longer be answered, so it waits for nobody.
 */
export function waitingForHuman(
  decisions: ReadonlyArray<{ status: string }>,
  nativeQuestions: ReadonlyArray<unknown>,
  running: boolean,
): number {
  if (!running) return 0;
  return decisions.filter((d) => d.status === "pending").length + nativeQuestions.length;
}
