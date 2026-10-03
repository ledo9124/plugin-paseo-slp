import { useEffect, useState } from "react";
import { usePaseo } from "@getpaseo/plugin/client";

// The daemon's providers, models, modes, and efforts for the settings
// selects (0009). Null until loaded, or when the daemon cannot list them:
// the settings screen then falls back to text inputs.

type Api = ReturnType<typeof usePaseo>;
type Snapshot = Awaited<ReturnType<Api["providers"]["snapshot"]>>;
export type ProviderEntry = Snapshot["entries"][number];
export type ModelEntry = NonNullable<ProviderEntry["models"]>[number];

export interface Option {
  label: string;
  value: string;
}

function usePaseoOrNull(): Api | null {
  try {
    return usePaseo();
  } catch {
    return null;
  }
}

export function useProviderCatalog(): ProviderEntry[] | null {
  const paseo = usePaseoOrNull();
  const [entries, setEntries] = useState<ProviderEntry[] | null>(null);
  useEffect(() => {
    if (!paseo) return;
    let live = true;
    paseo.providers
      .waitForReady()
      .then((snapshot) => {
        const usable = snapshot.entries.filter((entry) => entry.enabled !== false && entry.models?.length);
        if (live) setEntries(usable.length ? usable : null);
      })
      .catch(() => {
        if (live) setEntries(null);
      });
    return () => {
      live = false;
    };
  }, [paseo]);
  return entries;
}

export function splitModel(value: string): { provider: string; model: string } {
  const [provider = "", ...rest] = value.split("/");
  return { provider, model: rest.join("/") };
}

export function findModel(entries: readonly ProviderEntry[], value: string): ModelEntry | undefined {
  const { provider, model } = splitModel(value);
  return entries
    .find((entry) => entry.provider === provider)
    ?.models?.find((m) => m.id === model || m.aliases?.includes(model));
}

/** Options with the current value kept, so a saved value the daemon no longer lists stays visible. */
export function withCurrent(options: Option[], current: string | undefined): Option[] {
  if (!current || options.some((option) => option.value === current)) return options;
  return [...options, { label: `${current} (not listed)`, value: current }];
}

export const DEFAULT_EFFORT = "";

/** Effort options for a set of models: their listed efforts, plus the provider default. */
export function effortOptions(models: readonly (ModelEntry | undefined)[], current: string | undefined): Option[] {
  const seen = new Map<string, string>();
  for (const model of models) for (const option of model?.thinkingOptions ?? []) seen.set(option.id, option.label);
  return withCurrent(
    [{ label: "Provider default", value: DEFAULT_EFFORT }, ...[...seen].map(([value, label]) => ({ label, value }))],
    current,
  );
}
