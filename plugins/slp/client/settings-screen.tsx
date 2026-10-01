import { useEffect, useState } from "react";
import { Text } from "react-native";
import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import { useSettings } from "@getpaseo/plugin/client";
import { ScrollView } from "@getpaseo/plugin/client/react-native";
import { SettingsAction, SettingsInput, SettingsSection } from "@getpaseo/plugin/client/ui";
import { slpSettings, type SlpSettings } from "../shared/settings";

const ROLES = [
  { key: "supervisor", title: "Supervisor" },
  { key: "lead", title: "Lead" },
] as const;

// Provider, model, and mode for the members SLP starts. Applies to groups
// started after saving.
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
        Used when SLP starts a group. Groups already running keep their members.
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
            hint="Members must not depend on permission prompts: Claude auto or bypassPermissions, Codex full-access."
            initialValue={draft[key].modeId}
            onChangeText={(modeId) => setDraft({ ...draft, [key]: { ...draft[key], modeId } })}
          />
        </SettingsSection>
      ))}
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
