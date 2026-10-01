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
