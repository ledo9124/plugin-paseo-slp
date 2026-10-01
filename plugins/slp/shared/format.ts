// Formatting shared by the server's Markdown report and the panel.

export function counts(values: Record<string, number>): string {
  const entries = Object.entries(values);
  return entries.length ? entries.map(([key, value]) => `${key} ${value}`).join(", ") : "none";
}

export function total(values: Record<string, number>): number {
  return Object.values(values).reduce((sum, value) => sum + value, 0);
}
