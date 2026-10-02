import { useEffect, useState } from "react";
import { Text } from "react-native";
import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import { useSettings } from "@getpaseo/plugin/client";
import { ScrollView, TextInput } from "@getpaseo/plugin/client/react-native";
import { SettingsAction, SettingsInput, SettingsSection, SettingsSwitch } from "@getpaseo/plugin/client/ui";
import type { Role } from "../shared/contracts";
import { roleInstructions } from "../shared/roles";
import { DEFAULT_ROLE_TOOLS, SLP_TOOLS, slpSettings, type SlpSettings, type SlpTool } from "../shared/settings";

const ROLES = [
  { key: "supervisor", title: "Supervisor" },
  { key: "lead", title: "Lead" },
] as const;

type Overrides = { instructions?: string; tools?: SlpTool[] };

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
}: {
  role: Role;
  provider: string;
  draft: SlpSettings;
  value: Overrides;
  onChange(next: Overrides): void;
  theme: PluginSurfaceProps["theme"];
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
    </>
  );
}

// Provider, model, mode, instructions, and SLP tools per role, and the Peer
// allowlist. Applies to members created after saving; running members keep
// what they were created with.
export function SlpSettingsScreen({ theme }: PluginSurfaceProps) {
  const settings = useSettings(slpSettings);
  const [draft, setDraft] = useState<SlpSettings | null>(null);

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
          <SettingsInput
            label="Provider/model"
            hint="For example claude/claude-opus-5-5 or codex/gpt-6-luna."
            initialValue={draft[key].provider}
            onChangeText={(provider) => setDraft({ ...draft, [key]: { ...draft[key], provider } })}
          />
          <SettingsInput
            label="Mode"
            hint="Default bypassPermissions. Members must not depend on permission prompts."
            initialValue={draft[key].modeId}
            onChangeText={(modeId) => setDraft({ ...draft, [key]: { ...draft[key], modeId } })}
          />
          <RoleOverrides
            role={key}
            provider={draft[key].provider}
            draft={draft}
            value={draft[key]}
            onChange={(next) => setDraft({ ...draft, [key]: { ...draft[key], ...next } })}
            theme={theme}
          />
        </SettingsSection>
      ))}
      <SettingsSection title="Peers">
        <SettingsInput
          label="Models"
          hint="provider/model values the Lead may pick, separated by commas; the first is the default."
          initialValue={draft.peers.models.join(", ")}
          onChangeText={(text) => setDraft({ ...draft, peers: { ...draft.peers, models: splitList(text) } })}
        />
        <SettingsInput
          label="Mode per provider"
          hint="provider=mode pairs, separated by commas. Default claude=bypassPermissions, codex=full-access."
          initialValue={Object.entries(draft.peers.modes)
            .map(([provider, mode]) => `${provider}=${mode}`)
            .join(", ")}
          onChangeText={(text) => setDraft({ ...draft, peers: { ...draft.peers, modes: parseModes(text) } })}
        />
        <SettingsInput
          label="Most active Peers"
          hint="From 1 to 16."
          initialValue={String(draft.peers.maxActive)}
          onChangeText={(text) => setDraft({ ...draft, peers: { ...draft.peers, maxActive: Number(text.trim()) } })}
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
