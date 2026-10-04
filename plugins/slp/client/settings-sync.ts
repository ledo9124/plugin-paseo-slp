import type { SlpSettings } from "../shared/settings";

// How the settings screen's draft follows the stored settings when they change
// under it (another window, a plugin command, or its own Save).

export type Section = "supervisor" | "lead" | "peers";
export const SECTIONS: readonly Section[] = ["supervisor", "lead", "peers"];

// Key-order-independent text of a value, to tell whether two values differ.
export function stable(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
      : item,
  );
}

export interface DraftSync {
  draft: SlpSettings;
  /** Sections the user had not touched that took the stored change. */
  replaced: Section[];
  /** Sections edited here and changed in storage too: the draft is kept. */
  conflicts: Section[];
}

/**
 * Three-way merge per section. `base` is what the draft started from,
 * `incoming` what is stored now. A section only the stored side changed takes
 * the stored value; one only the draft changed stays; one both changed keeps
 * the draft and is reported, unless the draft already is the stored value
 * (the draft's own Save, which the schema may normalise, hence `normalize`).
 */
export function syncDraft(
  base: SlpSettings,
  draft: SlpSettings,
  incoming: SlpSettings,
  normalize: (values: SlpSettings) => SlpSettings = (values) => values,
): DraftSync {
  const normalized = normalize(draft);
  let next = draft;
  const replaced: Section[] = [];
  const conflicts: Section[] = [];
  for (const section of SECTIONS) {
    if (stable(incoming[section]) === stable(base[section])) continue;
    if (stable(draft[section]) === stable(base[section])) {
      next = { ...next, [section]: incoming[section] };
      replaced.push(section);
    } else if (stable(normalized[section]) === stable(incoming[section])) {
      next = { ...next, [section]: incoming[section] };
    } else {
      conflicts.push(section);
    }
  }
  return { draft: next, replaced, conflicts };
}
