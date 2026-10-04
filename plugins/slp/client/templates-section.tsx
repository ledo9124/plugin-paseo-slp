import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import { useRpc } from "@getpaseo/plugin/client";
import { TextInput } from "@getpaseo/plugin/client/react-native";
import { Card } from "./card";
import { SettingsAction, SettingsInput, SettingsRow, SettingsSection } from "@getpaseo/plugin/client/ui";
import { importTemplates, listTemplates, removeTemplate, saveTemplate, type TemplateView } from "../shared/contracts";

const NEW_TEMPLATE = `---
name: my-template
description: One line on what this template is for.
---

When to use: one line on when a Lead should pick this template.

Steps the assignment follows...
`;

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// The stored templates, fetched once and again after every change.
export function useTemplates() {
  const fetchList = useRpc(listTemplates);
  const [templates, setTemplates] = useState<TemplateView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setTemplates((await fetchList({})).templates);
      setError(null);
    } catch (caught) {
      setError(message(caught));
    }
  }, [fetchList]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { templates, error, refresh };
}

// Templates are SKILL.md texts in plugin data (decision 0008), not settings:
// every change here applies at once and does not wait for the Save button.
export function TemplatesSection({
  templates,
  listError,
  refresh,
  theme,
}: {
  templates: TemplateView[] | null;
  listError: string | null;
  refresh(): Promise<void>;
  theme: PluginSurfaceProps["theme"];
}) {
  const save = useRpc(saveTemplate);
  const remove = useRpc(removeTemplate);
  const importFolder = useRpc(importTemplates);
  // null: closed; previousName undefined: a new template.
  const [editing, setEditing] = useState<{ text: string; previousName?: string } | null>(null);
  const [folder, setFolder] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);

  const run = async (action: () => Promise<void>): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await refresh();
      return true;
    } catch (caught) {
      setError(message(caught));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const onSave = async () => {
    if (!editing) return;
    const { text, previousName } = editing;
    if (await run(async () => void (await save({ text, previousName })))) setEditing(null);
  };

  const onImport = async () => {
    setImportResult(null);
    await run(async () => {
      const result = await importFolder({ path: folder });
      const lines = [
        result.imported.length ? `Imported: ${result.imported.join(", ")}.` : "Imported nothing.",
        ...result.errors.map((item) => `${item.file}: ${item.error}`),
      ];
      setImportResult(lines.join("\n"));
    });
  };

  return (
    <SettingsSection title="Templates">
      <Card>
      <SettingsRow
        label="Applied at once"
        hint="SKILL.md texts the Supervisor and the Lead can load into an assignment. Changes apply at once; Save is not needed."
      />
      {listError ? <SettingsRow label="Templates unavailable" error={listError} /> : null}
      {templates?.length === 0 ? <SettingsRow label="No templates stored" /> : null}
      {templates?.map((template) => (
        <SettingsRow
          key={template.name}
          label={template.name}
          hint={`${template.description}\n${template.whenToUse ? `When to use: ${template.whenToUse}` : "No when-to-use line."}`}
        >
          <SettingsAction
            label="Edit"
            actionLabel="Edit"
            disabled={busy}
            onPress={() => setEditing({ text: template.text, previousName: template.name })}
          />
          <SettingsAction
            label="Remove"
            actionLabel="Remove"
            disabled={busy}
            onPress={() => void run(async () => void (await remove({ name: template.name })))}
          />
        </SettingsRow>
      ))}
      {editing ? (
        <>
          <View style={{ padding: 12 }}>
          <TextInput
            multiline
            value={editing.text}
            onChangeText={(text) => setEditing({ ...editing, text })}
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
            testID="slp-settings-template-text"
          />
          </View>
          <SettingsAction
            label={editing.previousName ? `Editing ${editing.previousName}` : "New template"}
            hint="The name comes from the front matter. Changing it renames the template."
            error={error}
            actionLabel={busy ? "Saving..." : "Save template"}
            disabled={busy || !editing.text.trim()}
            onPress={() => void onSave()}
          />
          <SettingsAction
            label="Cancel"
            actionLabel="Cancel"
            disabled={busy}
            onPress={() => {
              setEditing(null);
              setError(null);
            }}
          />
        </>
      ) : (
        <SettingsAction
          label="Add a template"
          hint="Paste a SKILL.md"
          error={error}
          actionLabel="New template"
          onPress={() => {
            setError(null);
            setEditing({ text: NEW_TEMPLATE });
          }}
        />
      )}
      <SettingsInput
        label="Import from a folder"
        hint="A path on the plugin's host: its own SKILL.md and each subfolder's SKILL.md. Same names replace stored templates."
        initialValue={folder}
        onChangeText={setFolder}
        placeholder="C:\path\to\skills"
      />
      <SettingsAction
        label="Import"
        hint={importResult ?? undefined}
        actionLabel={busy ? "Working..." : "Import"}
        disabled={busy || !folder.trim()}
        onPress={() => void onImport()}
      />
      </Card>
    </SettingsSection>
  );
}
