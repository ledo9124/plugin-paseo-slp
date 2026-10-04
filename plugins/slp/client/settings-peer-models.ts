// The Peer model switches, grouped by provider so about 25 models scan as a few
// rows. Pure: the settings screen renders the groups.

interface CatalogProvider {
  provider: string;
  label?: string;
  models?: readonly { id: string; label: string }[];
}

export interface ModelRow {
  /** `provider/model`, as stored in the allowlist. */
  value: string;
  label: string;
  on: boolean;
}

export interface ModelGroup {
  provider: string;
  label: string;
  models: ModelRow[];
  enabled: number;
  /** "2 of 8 on: Sonnet, Haiku", readable while the group is collapsed. */
  summary: string;
}

function describe(models: readonly ModelRow[]): string {
  const on = models.filter((m) => m.on);
  const head = `${on.length} of ${models.length} on`;
  return on.length ? `${head}: ${on.map((m) => m.label).join(", ")}` : head;
}

/**
 * Catalog providers in catalog order, then providers only the allowlist
 * mentions. Rows keep catalog order, so a switch never moves when toggled;
 * stored models the daemon no longer lists follow, marked "(not listed)".
 */
export function groupPeerModels(catalog: readonly CatalogProvider[], selected: readonly string[]): ModelGroup[] {
  const groups = new Map<string, { label: string; rows: ModelRow[] }>();
  for (const entry of catalog) {
    groups.set(entry.provider, {
      label: entry.label ?? entry.provider,
      rows: (entry.models ?? []).map((m) => {
        const value = `${entry.provider}/${m.id}`;
        return { value, label: m.label, on: selected.includes(value) };
      }),
    });
  }
  for (const value of selected) {
    const provider = value.split("/")[0];
    const group = groups.get(provider) ?? { label: provider, rows: [] };
    groups.set(provider, group);
    if (!group.rows.some((row) => row.value === value)) {
      group.rows.push({ value, label: `${value.slice(provider.length + 1)} (not listed)`, on: true });
    }
  }
  return [...groups].map(([provider, { label, rows }]) => ({
    provider,
    label,
    models: rows,
    enabled: rows.filter((row) => row.on).length,
    summary: describe(rows),
  }));
}
