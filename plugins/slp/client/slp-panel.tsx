import { useCallback, useEffect, useState } from "react";
import { Text } from "react-native";
import type { PluginWorkspacePanelProps } from "@getpaseo/plugin/client";
import { useRpc } from "@getpaseo/plugin/client";
import { ScrollView } from "@getpaseo/plugin/client/react-native";
import { SettingsAction, SettingsRow, SettingsSection, SettingsSwitch } from "@getpaseo/plugin/client/ui";
import {
  getLedger,
  getWorkspace,
  setWorkspaceMode,
  type Ledger,
  type MemberView,
  type Mode,
  type WorkspaceView,
} from "../shared/contracts";
import { headerModeSink } from "./header-buttons";
import { LedgerSections } from "./ledger-sections";

const REFRESH_MS = 5000;

function memberState(member: MemberView): string | null {
  if (member.archived) return "archived";
  // A member the daemon has not loaded since a restart reports "closed".
  if (member.status === "closed") return "inactive";
  return member.status;
}

/** The assignment a member owns now, so Human sees ownership at a glance. */
function holding(member: MemberView, ledger: Ledger | null): string | null {
  const open = ledger?.assignments.find(
    (a) => a.peerAgentId === member.agentId && (a.status === "assigned" || a.status === "handed-back"),
  );
  return open ? `owns ${open.id} (${open.status})` : null;
}

export function SlpPanel({ workspaceId, navigation, theme }: PluginWorkspacePanelProps) {
  const fetchView = useRpc(getWorkspace);
  const fetchLedger = useRpc(getLedger);
  const sendMode = useRpc(setWorkspaceMode);
  const [view, setView] = useState<WorkspaceView | null>(null);
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const apply = useCallback(
    (next: WorkspaceView) => {
      setView(next);
      headerModeSink.current?.(workspaceId, { mode: next.mode, locked: next.lockedAt !== null });
    },
    [workspaceId],
  );

  const refresh = useCallback(async () => {
    try {
      const [nextView, nextLedger] = await Promise.all([fetchView({ workspaceId }), fetchLedger({ workspaceId })]);
      apply(nextView);
      setLedger(nextLedger.groupId ? nextLedger.ledger : null);
    } catch (cause) {
      setError(String(cause instanceof Error ? cause.message : cause));
    }
  }, [apply, fetchView, fetchLedger, workspaceId]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const changeMode = async (mode: Mode) => {
    setBusy(true);
    setError(null);
    try {
      apply(await sendMode({ workspaceId, mode }));
    } catch (cause) {
      setError(String(cause instanceof Error ? cause.message : cause));
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const muted = { color: theme.colors.foregroundMuted };
  if (!view) {
    return <Text style={muted}>{error ?? "Loading SLP state…"}</Text>;
  }

  const locked = view.lockedAt !== null;
  const lockHint = locked
    ? `Locked ${view.mode} since your first message here (${new Date(view.lockedAt!).toLocaleString()}). Use a new workspace to change it.`
    : "You can change this until you send the first message in this workspace. That message locks it.";

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <SettingsSection title="SLP mode">
        <SettingsSwitch
          label="Supervisor–Lead–Peer coordination"
          hint={lockHint}
          error={error}
          value={view.mode === "on"}
          disabled={busy || locked || (view.mode === "off" && !view.injectIntoAgents)}
          onValueChange={(value) => void changeMode(value ? "on" : "off")}
          testID="slp-mode-switch"
        />
        {!view.injectIntoAgents ? (
          <SettingsRow
            label="Paseo tools are not injected"
            hint="SLP needs daemon.mcp.injectIntoAgents enabled on this daemon before it can start a group."
          />
        ) : null}
      </SettingsSection>

      {view.group ? (
        <SettingsSection
          title={view.group.endedAt ? "Group (ended with the workspace)" : "Group"}
          info={<Text style={muted}>Started {new Date(view.group.startedAt).toLocaleString()}</Text>}
        >
          {view.group.members.map((member, index) => (
            <SettingsAction
              key={member.agentId ?? `${member.role}-${index}`}
              label={member.title ?? member.role}
              hint={[member.provider, memberState(member), holding(member, ledger)].filter(Boolean).join(" · ")}
              actionLabel="Open"
              disabled={!member.agentId || !navigation}
              onPress={() => member.agentId && navigation?.openAgent({ agentId: member.agentId })}
              testID={member.role === "peer" ? `slp-member-peer-${index}` : `slp-member-${member.role}`}
            />
          ))}
        </SettingsSection>
      ) : null}

      {view.group && ledger ? (
        <LedgerSections
          workspaceId={workspaceId}
          ledger={ledger}
          members={view.group.members}
          running={!view.group.endedAt}
          onChanged={() => void refresh()}
        />
      ) : null}

      {view.group ? null : (
        <Text style={muted}>
          {view.mode === "on" ? "Starting the group…" : "SLP is off. Agents in this workspace behave normally."}
        </Text>
      )}
    </ScrollView>
  );
}
