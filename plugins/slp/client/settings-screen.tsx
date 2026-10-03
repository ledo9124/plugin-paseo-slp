import { Fragment, useEffect, useState } from "react";
import { Text } from "react-native";
import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import { useSettings } from "@getpaseo/plugin/client";
import { ScrollView, TextInput } from "@getpaseo/plugin/client/react-native";
import {
  SettingsAction,
  SettingsInput,
  SettingsSection,
  SettingsSelect,
  SettingsSwitch,
} from "@getpaseo/plugin/client/ui";
import type { Role } from "../shared/contracts";
import { TemplatesSection, useTemplates } from "./templates-section";
import {
  DEFAULT_EFFORT,
  effortOptions,
  findModel,
  splitModel,
  useProviderCatalog,
  withCurrent,
  type ProviderEntry,
} from "./provider-catalog";
import { roleInstructions } from "../shared/roles";
import { DEFAULT_ROLE_TOOLS, SLP_TOOLS, slpSettings, type SlpSettings, type SlpTool } from "../shared/settings";

const ROLES = [
  { key: "supervisor", title: "Supervisor" },
  { key: "lead", title: "Lead" },
] as const;

type Overrides = { instructions?: string; tools?: SlpTool[]; templates?: string[] };

function splitList(text: string): string[] {
  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseModes(text: string): Record<string, string> {
  return Object.fromEntries(
    splitList(text).map((pair) => {
      const [provider, mode = ""] = pair.split("=").map((part) => part.trim());
      return [provider, mode];
    }),
  );
}

function parseEfforts(text: string): Record<string, string> | undefined {
  const pairs = parseModes(text);
  return Object.keys(pairs).length ? pairs : undefined;
}

const MODE_HINT = "Members must not depend on permission prompts (default bypassPermissions).";
const PEER_LIMITS = Array.from({ length: 16 }, (_, i) => ({ label: String(i + 1), value: String(i + 1) }));

type ModelChoice = { provider: string; modeId: string; thinkingOptionId?: string };

// Provider, model, mode, and effort of the Supervisor or the Lead, as selects
// from the daemon's lists (0009); text inputs when the daemon cannot list.
function RoleModelFields({
  catalog,
  value,
  onChange,
}: {
  catalog: ProviderEntry[] | null;
  value: ModelChoice;
  onChange(next: ModelChoice): void;
}) {
  if (!catalog) {
    return (
      <>
        <SettingsInput
          label="Provider/model"
          hint="For example claude/claude-opus-5-5 or codex/gpt-6-luna."
          initialValue={value.provider}
          onChangeText={(provider) => onChange({ ...value, provider })}
        />
        <SettingsInput label="Mode" hint={MODE_HINT} initialValue={value.modeId} onChangeText={(modeId) => onChange({ ...value, modeId })} />
        <SettingsInput
          label="Effort"
          hint="Empty for the provider default, for example high."
          initialValue={value.thinkingOptionId ?? ""}
          onChangeText={(text) => onChange({ ...value, thinkingOptionId: text.trim() || undefined })}
        />
      </>
    );
  }
  const { provider } = splitModel(value.provider);
  const entry = catalog.find((e) => e.provider === provider);
  const pickProvider = (next: string) => {
    const nextEntry = catalog.find((e) => e.provider === next);
    const model = nextEntry?.models?.find((m) => m.isDefault) ?? nextEntry?.models?.[0];
    onChange({
      provider: `${next}/${model?.id ?? ""}`,
      modeId: nextEntry?.defaultModeId ?? nextEntry?.modes?.[0]?.id ?? value.modeId,
      thinkingOptionId: undefined,
    });
  };
  return (
    <>
      <SettingsSelect
        label="Provider"
        value={provider}
        options={withCurrent(catalog.map((e) => ({ label: e.label ?? e.provider, value: e.provider })), provider)}
        onValueChange={pickProvider}
      />
      <SettingsSelect
        label="Model"
        value={value.provider}
        options={withCurrent(
          (entry?.models ?? []).map((m) => ({ label: m.label, value: `${provider}/${m.id}` })),
          value.provider,
        )}
        onValueChange={(next) => onChange({ ...value, provider: next, thinkingOptionId: undefined })}
      />
      <SettingsSelect
        label="Mode"
        hint={MODE_HINT}
        value={value.modeId}
        options={withCurrent((entry?.modes ?? []).map((m) => ({ label: m.label, value: m.id })), value.modeId)}
        onValueChange={(modeId) => onChange({ ...value, modeId })}
      />
      <SettingsSelect
        label="Effort"
        hint="Reasoning effort. An effort the model does not list falls back to the provider default."
        value={value.thinkingOptionId ?? DEFAULT_EFFORT}
        options={effortOptions([findModel(catalog, value.provider)], value.thinkingOptionId)}
        onValueChange={(next) => onChange({ ...value, thinkingOptionId: next || undefined })}
      />
    </>
  );
}

type PeerChoice = Pick<SlpSettings["peers"], "models" | "modes" | "efforts" | "maxActive">;

// The Peer allowlist, default model, mode and effort per provider, and the cap.
function PeerModelFields({
  catalog,
  value,
  onChange,
}: {
  catalog: ProviderEntry[] | null;
  value: PeerChoice;
  onChange(next: Partial<PeerChoice>): void;
}) {
  const limit = (
    <SettingsSelect
      label="Most Peers with open work"
      hint="Idle Peers do not count."
      value={String(value.maxActive)}
      options={PEER_LIMITS}
      onValueChange={(next) => onChange({ maxActive: Number(next) })}
    />
  );
  if (!catalog) {
    return (
      <>
        <SettingsInput
          label="Models"
          hint="provider/model values, separated by commas; the first is the default."
          initialValue={value.models.join(", ")}
          onChangeText={(text) => onChange({ models: splitList(text) })}
        />
        <SettingsInput
          label="Mode per provider"
          hint="provider=mode pairs, separated by commas. Default claude=bypassPermissions, codex=full-access."
          initialValue={Object.entries(value.modes)
            .map(([provider, mode]) => `${provider}=${mode}`)
            .join(", ")}
          onChangeText={(text) => onChange({ modes: parseModes(text) })}
        />
        <SettingsInput
          label="Effort per provider"
          hint="provider=effort pairs, separated by commas; empty for the provider defaults."
          initialValue={Object.entries(value.efforts ?? {})
            .map(([provider, effort]) => `${provider}=${effort}`)
            .join(", ")}
          onChangeText={(text) => onChange({ efforts: parseEfforts(text) })}
        />
        {limit}
      </>
    );
  }
  const listed = catalog.flatMap((e) => (e.models ?? []).map((m) => ({ value: `${e.provider}/${m.id}`, label: `${e.label ?? e.provider}: ${m.label}` })));
  const all = [...listed, ...value.models.filter((m) => !listed.some((l) => l.value === m)).map((m) => ({ value: m, label: `${m} (not listed)` }))];
  const setAllowed = (model: string, on: boolean) => {
    const models = on ? [...value.models, model] : value.models.filter((m) => m !== model);
    if (!models.length) return;
    const providers = new Set(models.map((m) => splitModel(m).provider));
    const modes = { ...value.modes };
    for (const provider of providers) {
      const entry = catalog.find((e) => e.provider === provider);
      modes[provider] ??= entry?.defaultModeId ?? entry?.modes?.[0]?.id ?? "bypassPermissions";
    }
    onChange({ models, modes });
  };
  const providers = [...new Set(value.models.map((m) => splitModel(m).provider))];
  return (
    <>
      <SettingsSelect
        label="Default model"
        hint="Peers run on it unless Human names another."
        value={value.models[0]}
        options={value.models.map((m) => ({ label: all.find((o) => o.value === m)?.label ?? m, value: m }))}
        onValueChange={(next) => onChange({ models: [next, ...value.models.filter((m) => m !== next)] })}
      />
      {all.map((option) => (
        <SettingsSwitch
          key={option.value}
          label={option.label}
          hint={option.value === value.models[0] ? "Default" : undefined}
          value={value.models.includes(option.value)}
          disabled={option.value === value.models[0]}
          onValueChange={(on) => setAllowed(option.value, on)}
        />
      ))}
      {providers.map((provider) => {
        const entry = catalog.find((e) => e.provider === provider);
        const effort = value.efforts?.[provider];
        const setEffort = (next: string) => {
          const efforts = { ...(value.efforts ?? {}) };
          if (next) efforts[provider] = next;
          else delete efforts[provider];
          onChange({ efforts: Object.keys(efforts).length ? efforts : undefined });
        };
        return (
          <Fragment key={provider}>
            <SettingsSelect
              label={`Mode on ${entry?.label ?? provider}`}
              hint={MODE_HINT}
              value={value.modes[provider] ?? ""}
              options={withCurrent((entry?.modes ?? []).map((m) => ({ label: m.label, value: m.id })), value.modes[provider])}
              onValueChange={(modeId) => onChange({ modes: { ...value.modes, [provider]: modeId } })}
            />
            <SettingsSelect
              label={`Effort on ${entry?.label ?? provider}`}
              hint="For every Peer on this provider; a model that does not list it uses the provider default."
              value={effort ?? DEFAULT_EFFORT}
              options={effortOptions(
                value.models.filter((m) => splitModel(m).provider === provider).map((m) => findModel(catalog, m)),
                effort,
              )}
              onValueChange={setEffort}
            />
          </Fragment>
        );
      })}
      {limit}
    </>
  );
}

function sameTools(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((tool) => b.includes(tool));
}

// A role's instructions and SLP tools (decision 0008). An absent field means
// the default; editing back to the default removes the override.
function RoleOverrides({
  role,
  provider,
  draft,
  value,
  onChange,
  theme,
  catalog,
}: {
  role: Role;
  provider: string;
  draft: SlpSettings;
  value: Overrides;
  onChange(next: Overrides): void;
  theme: PluginSurfaceProps["theme"];
  /** Stored template names; set only for roles with a catalog. */
  catalog?: string[];
}) {
  const tools = value.tools ?? [...DEFAULT_ROLE_TOOLS[role]];
  const defaultText = roleInstructions(role, {
    provider: provider.split("/")[0],
    maxActivePeers: draft.peers.maxActive,
    tools,
  });
  const custom = value.instructions !== undefined;
  const setTools = (next: SlpTool[]) =>
    onChange({ ...value, tools: sameTools(next, DEFAULT_ROLE_TOOLS[role]) ? undefined : next });

  // Absent means every stored template; choosing them all again removes the override.
  const shown = catalog ? catalog.filter((name) => !value.templates || value.templates.includes(name)) : [];
  const setCatalog = (name: string, on: boolean) => {
    const next = (catalog ?? []).filter((n) => (n === name ? on : shown.includes(n)));
    onChange({ ...value, templates: next.length === (catalog ?? []).length ? undefined : next });
  };

  return (
    <>
      <SettingsAction
        label="Instructions"
        hint={
          custom
            ? "Custom text: it replaces the whole default, including the tool list and limits."
            : "Default text, filled in with this role's provider, tools, and Peer limit."
        }
        actionLabel="Reset to default"
        disabled={!custom}
        onPress={() => onChange({ ...value, instructions: undefined })}
      />
      <TextInput
        multiline
        value={value.instructions ?? defaultText}
        onChangeText={(text) =>
          onChange({ ...value, instructions: [defaultText.trim(), ""].includes(text.trim()) ? undefined : text })
        }
        style={{
          minHeight: 240,
          padding: 8,
          borderWidth: 1,
          borderRadius: 6,
          borderColor: theme.colors.border,
          color: theme.colors.foreground,
          backgroundColor: theme.colors.surface1,
          fontFamily: "monospace",
          fontSize: 12,
          textAlignVertical: "top",
        }}
        testID={`slp-settings-${role}-instructions`}
      />
      <SettingsAction
        label="SLP tools"
        hint={value.tools ? "Custom list." : "Default list for this role."}
        actionLabel="Reset to default"
        disabled={!value.tools}
        onPress={() => onChange({ ...value, tools: undefined })}
      />
      {SLP_TOOLS.map((tool) => (
        <SettingsSwitch
          key={tool}
          label={tool}
          value={tools.includes(tool)}
          onValueChange={(on) => setTools(on ? [...tools, tool] : tools.filter((t) => t !== tool))}
        />
      ))}
      {catalog?.length ? (
        <>
          <SettingsAction
            label="Template catalog"
            hint={value.templates ? "Only the templates switched on are listed for this role." : "Every stored template."}
            actionLabel="Show all"
            disabled={!value.templates}
            onPress={() => onChange({ ...value, templates: undefined })}
          />
          {catalog.map((name) => (
            <SettingsSwitch
              key={name}
              label={name}
              value={shown.includes(name)}
              onValueChange={(on) => setCatalog(name, on)}
            />
          ))}
        </>
      ) : null}
    </>
  );
}

// Provider, model, mode, effort, instructions, and SLP tools per role, and the
// Peer allowlist. Applies to members created after saving; running members
// keep what they were created with.
export function SlpSettingsScreen({ theme }: PluginSurfaceProps) {
  const settings = useSettings(slpSettings);
  const [draft, setDraft] = useState<SlpSettings | null>(null);
  const stored = useTemplates();
  const catalog = useProviderCatalog();

  useEffect(() => {
    if (settings.status === "ready") setDraft(settings.values);
  }, [settings.status, settings.status === "ready" ? settings.revision : null]);

  if (settings.status === "loading" || !draft) return <Text>Loading settings…</Text>;
  if (settings.status === "error") return <Text>Settings unavailable: {settings.error}</Text>;

  const save = () => {
    if (settings.status === "ready" || settings.status === "invalid") void settings.save(draft, settings.revision);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text style={{ color: theme.colors.foregroundMuted }}>
        Used when SLP creates a member. Members already running keep what they were created with.
      </Text>
      {ROLES.map(({ key, title }) => (
        <SettingsSection key={key} title={title}>
          <RoleModelFields
            catalog={catalog}
            value={draft[key]}
            onChange={(next) => setDraft({ ...draft, [key]: { ...draft[key], ...next } })}
          />
          <RoleOverrides
            role={key}
            provider={draft[key].provider}
            draft={draft}
            value={draft[key]}
            onChange={(next) => setDraft({ ...draft, [key]: { ...draft[key], ...next } })}
            theme={theme}
            catalog={stored.templates?.map((template) => template.name)}
          />
        </SettingsSection>
      ))}
      <TemplatesSection templates={stored.templates} listError={stored.error} refresh={stored.refresh} theme={theme} />
      <SettingsSection title="Peers">
        <PeerModelFields
          catalog={catalog}
          value={draft.peers}
          onChange={(next) => setDraft({ ...draft, peers: { ...draft.peers, ...next } })}
        />
        <RoleOverrides
          role="peer"
          provider={draft.peers.models[0] ?? "claude/default"}
          draft={draft}
          value={draft.peers}
          onChange={(next) => setDraft({ ...draft, peers: { ...draft.peers, ...next } })}
          theme={theme}
        />
      </SettingsSection>
      <SettingsAction
        label="Save"
        error={settings.saveError ?? (settings.status === "invalid" ? settings.error : null)}
        actionLabel={settings.saving ? "Saving…" : "Save"}
        disabled={settings.saving}
        onPress={save}
      />
    </ScrollView>
  );
}
