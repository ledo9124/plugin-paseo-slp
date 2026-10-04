import { Fragment, useEffect, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
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
import { Card } from "./card";
import { TabBar, type Tab } from "./tab-bar";
import { groupPeerModels } from "./settings-peer-models";
import { SECTIONS, stable, syncDraft, type Section } from "./settings-sync";
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

type TabKey = "supervisor" | "lead" | "peer" | "templates";
const TABS: readonly { key: TabKey; title: string }[] = [
  { key: "supervisor", title: "Supervisor" },
  { key: "lead", title: "Lead" },
  { key: "peer", title: "Peers" },
  { key: "templates", title: "Templates" },
];

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

const MODE_HINT = "Members must not depend on permission prompts (default bypassPermissions)";
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
      <Card>
        <SettingsInput
          label="Provider/model"
          hint="For example claude/claude-opus-5-5 or codex/gpt-6-luna"
          initialValue={value.provider}
          onChangeText={(provider) => onChange({ ...value, provider })}
        />
        <SettingsInput label="Mode" hint={MODE_HINT} initialValue={value.modeId} onChangeText={(modeId) => onChange({ ...value, modeId })} />
        <SettingsInput
          label="Effort"
          hint="Empty for the provider default, for example high"
          initialValue={value.thinkingOptionId ?? ""}
          onChangeText={(text) => onChange({ ...value, thinkingOptionId: text.trim() || undefined })}
        />
      </Card>
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
    <Card>
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
    </Card>
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
  // Provider groups whose switches are shown; all start collapsed.
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const limit = (
    <SettingsSelect
      label="Most Peers with open work"
      hint="Idle Peers do not count"
      value={String(value.maxActive)}
      options={PEER_LIMITS}
      onValueChange={(next) => onChange({ maxActive: Number(next) })}
    />
  );
  if (!catalog) {
    return (
      <>
        <SettingsSection title="Models">
          <Card>
            <SettingsInput
              label="Models"
              hint="provider/model values, separated by commas; the first is the default"
              initialValue={value.models.join(", ")}
              onChangeText={(text) => onChange({ models: splitList(text) })}
            />
          </Card>
        </SettingsSection>
        <SettingsSection title="Mode and effort">
          <Card>
            <SettingsInput
              label="Mode per provider"
              hint="provider=mode pairs, separated by commas. Default claude=bypassPermissions, codex=full-access"
              initialValue={Object.entries(value.modes)
                .map(([provider, mode]) => `${provider}=${mode}`)
                .join(", ")}
              onChangeText={(text) => onChange({ modes: parseModes(text) })}
            />
            <SettingsInput
              label="Effort per provider"
              hint="provider=effort pairs, separated by commas; empty for the provider defaults"
              initialValue={Object.entries(value.efforts ?? {})
                .map(([provider, effort]) => `${provider}=${effort}`)
                .join(", ")}
              onChangeText={(text) => onChange({ efforts: parseEfforts(text) })}
            />
          </Card>
        </SettingsSection>
        <SettingsSection title="Limit">
          <Card>{limit}</Card>
        </SettingsSection>
      </>
    );
  }
  const groups = groupPeerModels(catalog, value.models);
  const labelOf = (model: string) => {
    for (const group of groups) {
      const row = group.models.find((m) => m.value === model);
      if (row) return `${group.label}: ${row.label}`;
    }
    return model;
  };
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
      <SettingsSection title="Models">
        <Card>
          <SettingsSelect
            label="Default model"
            hint="Peers run on it unless Human names another"
            value={value.models[0]}
            options={value.models.map((m) => ({ label: labelOf(m), value: m }))}
            onValueChange={(next) => onChange({ models: [next, ...value.models.filter((m) => m !== next)] })}
          />
          {groups.map((group) => {
            const shown = open.has(group.provider);
            return (
              <Fragment key={group.provider}>
                <SettingsAction
                  label={group.label}
                  hint={group.summary}
                  actionLabel={shown ? "Hide models" : "Show models"}
                  onPress={() => {
                    const next = new Set(open);
                    if (shown) next.delete(group.provider);
                    else next.add(group.provider);
                    setOpen(next);
                  }}
                  testID={`slp-settings-peer-group-${group.provider}`}
                />
                {shown
                  ? group.models.map((row) => (
                      <SettingsSwitch
                        key={row.value}
                        label={row.label}
                        hint={row.value === value.models[0] ? "Default" : undefined}
                        value={row.on}
                        disabled={row.value === value.models[0]}
                        onValueChange={(on) => setAllowed(row.value, on)}
                      />
                    ))
                  : null}
              </Fragment>
            );
          })}
        </Card>
      </SettingsSection>
      <SettingsSection title="Mode and effort">
      <Card>
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
              hint="For every Peer on this provider; a model that does not list it uses the provider default"
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
      </Card>
      </SettingsSection>
      <SettingsSection title="Limit">
        <Card>{limit}</Card>
      </SettingsSection>
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
  const [editingText, setEditingText] = useState(false);
  const [listingTools, setListingTools] = useState(false);

  // Absent means every stored template; choosing them all again removes the override.
  const shown = catalog ? catalog.filter((name) => !value.templates || value.templates.includes(name)) : [];
  const setCatalog = (name: string, on: boolean) => {
    const next = (catalog ?? []).filter((n) => (n === name ? on : shown.includes(n)));
    onChange({ ...value, templates: next.length === (catalog ?? []).length ? undefined : next });
  };

  return (
    <>
      <SettingsSection title="Instructions">
        <Card>
        <SettingsAction
          label={custom ? "Custom instructions" : "Default instructions"}
          hint={
            custom
              ? "Custom text: it replaces the whole default, including the tool list and limits"
              : "Default text, filled in with this role's provider, tools, and Peer limit"
          }
          actionLabel={editingText ? "Hide text" : "Edit text"}
          onPress={() => setEditingText(!editingText)}
          testID={`slp-settings-${role}-instructions-toggle`}
        />
        {editingText ? (
          <View style={{ padding: 12 }}>
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
          </View>
        ) : null}
        <SettingsAction
          label="Reset instructions"
          actionLabel="Reset to default"
          disabled={!custom}
          onPress={() => onChange({ ...value, instructions: undefined })}
        />
        </Card>
      </SettingsSection>
      <SettingsSection title="SLP tools">
        <Card>
        <SettingsAction
          label={`${tools.length} of ${SLP_TOOLS.length} tools on`}
          hint={value.tools ? "Custom list" : "Default list for this role"}
          actionLabel={listingTools ? "Hide list" : "Show list"}
          onPress={() => setListingTools(!listingTools)}
        />
        {listingTools
          ? SLP_TOOLS.map((tool) => (
              <SettingsSwitch
                key={tool}
                label={tool}
                value={tools.includes(tool)}
                onValueChange={(on) => setTools(on ? [...tools, tool] : tools.filter((t) => t !== tool))}
              />
            ))
          : null}
        <SettingsAction
          label="Reset tools"
          actionLabel="Reset to default"
          disabled={!value.tools}
          onPress={() => onChange({ ...value, tools: undefined })}
        />
        </Card>
      </SettingsSection>
      {catalog?.length ? (
        <SettingsSection title="Template catalog">
          <Card>
          <SettingsAction
            label="Templates this role can load"
            hint={value.templates ? "Only the templates switched on are listed for this role" : "Every stored template"}
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
          </Card>
        </SettingsSection>
      ) : null}
    </>
  );
}

// One tab each for the Supervisor, the Lead, the Peers, and the templates.
// Provider, model, mode, effort, instructions, and SLP tools per role, and the
// Peer allowlist. Applies to members created after saving; running members
// keep what they were created with.
// What the draft is built on: `base` is the stored settings it last followed,
// `conflicts` the sections edited here and changed in storage meanwhile, and
// `version` changes when the draft is replaced from outside, so uncontrolled
// inputs start again from it.
interface DraftView {
  draft: SlpSettings;
  base: SlpSettings;
  conflicts: Section[];
  version: number;
}

const SECTION_TITLES: Record<Section, string> = { supervisor: "Supervisor", lead: "Lead", peers: "Peers" };

function normalize(values: SlpSettings): SlpSettings {
  const parsed = slpSettings.schema.safeParse(values);
  return parsed.success ? parsed.data : values;
}

function Problem({ children }: { children: ReactNode }) {
  return <ScrollView contentContainerStyle={{ padding: 16 }}>{children}</ScrollView>;
}

// One tab each for the Supervisor, the Lead, the Peers, and the templates.
// Provider, model, mode, effort, instructions, and SLP tools per role, and the
// Peer allowlist. Applies to members created after saving; running members
// keep what they were created with.
export function SlpSettingsScreen({ theme }: PluginSurfaceProps) {
  const settings = useSettings(slpSettings);
  const [view, setView] = useState<DraftView | null>(null);
  const [tab, setTab] = useState<TabKey>("supervisor");
  const [confirmReset, setConfirmReset] = useState(false);
  const stored = useTemplates();
  const catalog = useProviderCatalog();

  // Follow the stored settings: the first load fills the draft; a later change
  // (a Save here, or elsewhere) merges per section and keeps unsaved edits.
  useEffect(() => {
    if (settings.status !== "ready") return;
    const incoming = settings.values;
    setView((current) => {
      if (!current) return { draft: incoming, base: incoming, conflicts: [], version: 0 };
      const sync = syncDraft(current.base, current.draft, incoming, normalize);
      return {
        draft: sync.draft,
        base: incoming,
        conflicts: [...new Set([...current.conflicts, ...sync.conflicts])],
        version: current.version + (sync.replaced.length ? 1 : 0),
      };
    });
  }, [settings.status, settings.status === "ready" ? settings.revision : null]);

  // Nothing was ever loaded: there is no editor to keep.
  if (settings.status === "error" && !view) {
    return (
      <Problem>
        <Card>
          <SettingsAction
            label="Settings unavailable"
            error={settings.error}
            actionLabel="Try again"
            onPress={() => void settings.reload()}
          />
        </Card>
      </Problem>
    );
  }
  if (!view) {
    if (settings.status !== "invalid") return <Text>Loading settings...</Text>;
    // The stored file does not match the schema: Save cannot fix it, so offer a
    // reset to the defaults, behind a second press.
    return (
      <Problem>
        <SettingsSection title="Stored settings are invalid">
          <Card>
            <SettingsAction
              label="The stored SLP settings cannot be read"
              hint="Nothing was changed. Check again if they were just fixed elsewhere."
              error={settings.error}
              actionLabel="Check again"
              onPress={() => void settings.reload()}
            />
            <SettingsAction
              label="Start over"
              hint="Replaces the stored settings with the defaults: models, modes, instructions, and tools. The stored text is not kept."
              error={settings.saveError}
              actionLabel={settings.saving ? "Resetting..." : confirmReset ? "Press again to replace them" : "Reset to defaults"}
              disabled={settings.saving}
              onPress={() => {
                if (confirmReset) void settings.reset();
                else setConfirmReset(true);
              }}
            />
          </Card>
        </SettingsSection>
      </Problem>
    );
  }
  const { draft } = view;
  const setDraft = (next: SlpSettings) => setView((current) => current && { ...current, draft: next });

  // One draft and one Save for the Supervisor, Lead, and Peers tabs. A dot on a
  // tab marks changes on it that are not saved yet.
  const saved = settings.status === "ready" ? settings.values : view.base;
  const changed = (key: Section) => stable(draft[key]) !== stable(saved[key]);
  const marks: Record<TabKey, boolean> = {
    supervisor: changed("supervisor"),
    lead: changed("lead"),
    peer: changed("peers"),
    templates: false,
  };
  const dirty = marks.supervisor || marks.lead || marks.peer;
  const tabs: Tab<TabKey>[] = TABS.map((item) => ({ ...item, marked: marks[item.key] }));

  // Sections edited here that were also changed in storage and still differ.
  const clashes = SECTIONS.filter((key) => view.conflicts.includes(key) && changed(key));
  const loadSaved = () => setView((current) => current && { draft: saved, base: saved, conflicts: [], version: current.version + 1 });

  // A failed read leaves the editor in place, but there is no revision to save
  // against until a read succeeds again.
  const readFailed = settings.status === "error" ? settings.error : null;
  const save = () => {
    if (settings.status === "ready" || settings.status === "invalid") void settings.save(draft, settings.revision);
  };

  // Keyed by role: the Supervisor and Lead tabs share one tree shape, and the
  // uncontrolled inputs and collapse state must not carry over between them.
  const roleTab = (key: "supervisor" | "lead") => (
    <Fragment key={`${key}-${view.version}`}>
      <SettingsSection title="Model">
        <RoleModelFields
          catalog={catalog}
          value={draft[key]}
          onChange={(next) => setDraft({ ...draft, [key]: { ...draft[key], ...next } })}
        />
      </SettingsSection>
      <RoleOverrides
        role={key}
        provider={draft[key].provider}
        draft={draft}
        value={draft[key]}
        onChange={(next) => setDraft({ ...draft, [key]: { ...draft[key], ...next } })}
        theme={theme}
        catalog={stored.templates?.map((template) => template.name)}
      />
    </Fragment>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} stickyHeaderIndices={[0]}>
      <TabBar<TabKey> tabs={tabs} active={tab} onSelect={setTab} theme={theme} />
      {readFailed !== null ? (
        <SettingsSection title="Settings unavailable">
          <Card>
            <SettingsAction
              label="Reading the saved settings failed"
              hint="Your edits are kept. Save is off until the saved settings can be read again."
              error={readFailed}
              actionLabel="Try again"
              onPress={() => void settings.reload()}
              testID="slp-settings-read-retry"
            />
          </Card>
        </SettingsSection>
      ) : null}
      {clashes.length ? (
        <SettingsSection title="Changed elsewhere">
          <Card>
            <SettingsAction
              label="The saved settings changed while you were editing"
              hint={`Your unsaved edits on ${clashes.map((key) => SECTION_TITLES[key]).join(", ")} are kept, and Save would overwrite the other change. Load the saved settings to drop your edits instead.`}
              actionLabel="Load saved settings"
              onPress={loadSaved}
              testID="slp-settings-load-saved"
            />
          </Card>
        </SettingsSection>
      ) : null}
      {tab === "supervisor" || tab === "lead" ? roleTab(tab) : null}
      {tab === "peer" ? (
        <Fragment key={view.version}>
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
        </Fragment>
      ) : null}
      {/* Kept mounted so a template being written survives a tab switch. */}
      <View style={tab === "templates" ? undefined : { display: "none" }}>
        <TemplatesSection templates={stored.templates} listError={stored.error} refresh={stored.refresh} theme={theme} />
      </View>
      {tab === "templates" ? null : (
        <>
          <Card>
            <SettingsAction
              label="Save"
              hint={[
                dirty ? "Unsaved changes on the tabs marked with a dot; Save covers all of them" : null,
                "Used when SLP creates a member. Members already running keep what they were created with.",
              ]
                .filter(Boolean)
                .join("\n")}
              error={settings.saveError ?? (settings.status === "invalid" ? settings.error : null)}
              actionLabel={settings.saving ? "Saving..." : "Save"}
              disabled={settings.saving || readFailed !== null}
              onPress={save}
            />
          </Card>
        </>
      )}
    </ScrollView>
  );
}
