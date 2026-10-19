import { AUTO_COMPACT_MAX, AUTO_COMPACT_MIN } from "../shared/settings";

/**
 * Reads the auto-compact window typed in Settings: tokens, or with a k or m
 * suffix ("600k", "1m"). Empty means Claude Code's default (null); text that
 * is not a whole number of tokens in range is an error.
 */
export function parseAutoCompact(text: string): { value: number | null } | { error: string } {
  const trimmed = text.trim().toLowerCase().replace(/[,_\s]/g, "");
  if (!trimmed) return { value: null };
  const match = /^(\d+(?:\.\d+)?)([km]?)$/.exec(trimmed);
  const tokens = match ? Number(match[1]) * (match[2] === "m" ? 1_000_000 : match[2] === "k" ? 1_000 : 1) : NaN;
  if (!Number.isInteger(tokens) || tokens < AUTO_COMPACT_MIN || tokens > AUTO_COMPACT_MAX) {
    return { error: "Use 100k to 1M tokens, for example 600k, or leave it empty." };
  }
  return { value: tokens };
}

/** The stored window as Settings shows it: "600k", "1m", or the raw count. */
export function formatAutoCompact(value: number | undefined): string {
  if (!value) return "";
  if (value % 1_000_000 === 0) return `${value / 1_000_000}m`;
  if (value % 1_000 === 0) return `${value / 1_000}k`;
  return String(value);
}
