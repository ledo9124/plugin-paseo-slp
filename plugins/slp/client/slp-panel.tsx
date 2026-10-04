import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import type { PluginWorkspacePanelProps } from "@getpaseo/plugin/client";
import { useAgent, useRpc } from "@getpaseo/plugin/client";
import { ScrollView } from "@getpaseo/plugin/client/react-native";
import { SettingsAction, SettingsRow, SettingsSection, SettingsSwitch } from "@getpaseo/plugin/client/ui";
import {
  getLedger,
  getWorkspace,
  setWorkspaceMode,
  type Ledger,
  type MemberView,
  type Mode,
  type NativeQuestion,
  type WorkspaceView,
} from "../shared/contracts";
import { waitingForHuman } from "../shared/format";
import { Card } from "./card";
import { headerModeSink } from "./header-buttons";
import { assignmentStatusLabel, memberName, memberState } from "./labels";
import { LedgerSections, NeedsYouSection } from "./ledger-sections";
import { onSlpActivity, touches } from "./live-updates";
import { ProcessSection } from "./process-section";

// Slow fallback: agent and workspace updates refresh the panel sooner, but a
// ledger change that comes with no agent update waits for this.
const REFRESH_MS = 10_000;

function messageOf(cause: unknown): string {
  return String(cause instanceof Error ? cause.message : cause);
}

/** The assignment a member owns now, so Human sees ownership at a glance. */
function holding(member: MemberView, ledger: Ledger | null): string | null {
  const open = ledger?.assignments.find(
    (a) => a.peerAgentId === member.agentId && (a.status === "assigned" || a.status === "handed-back"),
  );
  return open ? `owns ${open.id} (${assignmentStatusLabel(open.status)})` : null;
}

/** One group member. Status comes live from the client's agent state; the fetched status is the fallback. */
function MemberRow({
  member,
  ledger,
  index,
  onOpen,
}: {
  member: MemberView;
  ledger: Ledger | null;
  index: number;
  onOpen?: (agentId: string) => void;
}) {
  const liveStatus = useAgent(member.agentId ?? "", (agent) => agent.status);
  const state = memberState({ ...member, status: liveStatus ?? member.status });
  return (
    <SettingsAction
      label={memberName(member)}
      hint={[member.provider, state, holding(member, ledger)].filter(Boolean).join(" · ")}
      actionLabel="Open"
      disabled={!member.agentId || !onOpen}
      onPress={() => member.agentId && onOpen?.(member.agentId)}
      testID={member.role === "peer" ? `slp-member-peer-${index}` : `slp-member-${member.role}`}
    />
  );
}

export function SlpPanel({ workspaceId, navigation, theme }: PluginWorkspacePanelProps) {
  const fetchView = useRpc(getWorkspace);
  const fetchLedger = useRpc(getLedger);
  const sendMode = useRpc(setWorkspaceMode);
  const [view, setView] = useState<WorkspaceView | null>(null);
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [nativeQuestions, setNativeQuestions] = useState<NativeQuestion[]>([]);
  // A failed refresh and a failed mode change are different problems: the first
  // clears when a refresh succeeds, the second when Human tries again.
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modeError, setModeError] = useState<string | null>(null);
  const [changing, setChanging] = useState<Mode | null>(null);
  // What waits for Human, from the last refresh; the header button shows it.
  const waiting = useRef(0);

  const apply = useCallback(
    (next: WorkspaceView) => {
      setView(next);
      headerModeSink.current?.(workspaceId, {
        mode: next.mode,
        locked: next.lockedAt !== null,
        waiting: waiting.current,
      });
    },
    [workspaceId],
  );

  const refresh = useCallback(async () => {
    try {
      const [nextView, nextLedger] = await Promise.all([fetchView({ workspaceId }), fetchLedger({ workspaceId })]);
      const nextDecisions = nextLedger.groupId ? nextLedger.ledger.decisions : [];
      waiting.current = waitingForHuman(nextDecisions, nextLedger.nativeQuestions, !!nextView.group && !nextView.group.endedAt);
      apply(nextView);
      setLedger(nextLedger.groupId ? nextLedger.ledger : null);
      setNativeQuestions(nextLedger.nativeQuestions);
      setLoadError(null);
    } catch (cause) {
      setLoadError(messageOf(cause));
    }
  }, [apply, fetchView, fetchLedger, workspaceId]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), REFRESH_MS);
    const off = onSlpActivity((ids) => {
      if (touches(ids, workspaceId)) void refresh();
    });
    return () => {
      clearInterval(timer);
      off();
    };
  }, [refresh, workspaceId]);

  const changeMode = async (mode: Mode) => {
    setChanging(mode);
    setModeError(null);
    try {
      const next = await sendMode({ workspaceId, mode });
      // A mode change starts or ends the group, so nothing waits for Human yet; the old count is stale.
      waiting.current = 0;
      apply(next);
    } catch (cause) {
      setModeError(messageOf(cause));
      await refresh();
    } finally {
      setChanging(null);
    }
  };

  if (!view) {
    return (
      <View style={{ padding: 16 }}>
        {loadError ? (
          <Card>
            <SettingsAction
              label="Could not load SLP state"
              error={loadError}
              actionLabel="Retry"
              onPress={() => void refresh()}
              testID="slp-load-retry"
            />
          </Card>
        ) : (
          <Card>
            <SettingsRow label="Loading SLP state..." />
          </Card>
        )}
      </View>
    );
  }

  const locked = view.lockedAt !== null;
  const toolsMissing = view.mode === "off" && !view.injectIntoAgents;
  let modeHint: string;
  if (changing === "on") modeHint = "Starting the Supervisor and the Lead...";
  else if (changing === "off") modeHint = "Stopping the group...";
  else if (locked)
    modeHint = `Locked ${view.mode} since your first message here (${new Date(view.lockedAt!).toLocaleString()}). Use a new workspace to change it.`;
  else if (toolsMissing) modeHint = "Not available until this daemon injects Paseo tools (see below)";
  else if (view.mode === "off")
    modeHint =
      "Turning this on starts a Supervisor and a Lead in this workspace. You can change it until you send the first message here; that message locks it.";
  else modeHint = "You can change this until you send the first message in this workspace. That message locks it.";

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      {view.group ? (
        <NeedsYouSection
          workspaceId={workspaceId}
          theme={theme}
          decisions={ledger?.decisions ?? []}
          nativeQuestions={nativeQuestions}
          running={!view.group.endedAt}
          onOpenAgent={navigation ? (agentId) => navigation.openAgent({ agentId }) : undefined}
          onChanged={() => void refresh()}
        />
      ) : null}

      <SettingsSection title="SLP mode">
        <Card>
          <SettingsSwitch
            label="Supervisor–Lead–Peer coordination"
            hint={modeHint}
            error={modeError}
            value={view.mode === "on"}
            disabled={changing !== null || locked || toolsMissing}
            onValueChange={(value) => void changeMode(value ? "on" : "off")}
            testID="slp-mode-switch"
          />
          {!view.injectIntoAgents ? (
            <SettingsRow
              label="Paseo tools are not injected"
              hint="SLP needs daemon.mcp.injectIntoAgents enabled on this daemon before it can start a group"
            />
          ) : null}
          {loadError ? (
            <SettingsAction
              label="Could not refresh"
              error={loadError}
              actionLabel="Retry"
              onPress={() => void refresh()}
              testID="slp-refresh-retry"
            />
          ) : null}
        </Card>
      </SettingsSection>

      {view.group ? (
        <SettingsSection title={view.group.endedAt ? "Group (ended with the workspace)" : "Group"}>
          <Card>
            <SettingsRow label="Started" hint={new Date(view.group.startedAt).toLocaleString()} />
            {view.group.members.map((member, index) => (
              <MemberRow
                key={member.agentId ?? `${member.role}-${index}`}
                member={member}
                ledger={ledger}
                index={index}
                onOpen={navigation ? (agentId) => navigation.openAgent({ agentId }) : undefined}
              />
            ))}
          </Card>
        </SettingsSection>
      ) : null}

      {view.group && ledger ? (
        <LedgerSections
          workspaceId={workspaceId}
          theme={theme}
          ledger={ledger}
          members={view.group.members}
          running={!view.group.endedAt}
          onChanged={() => void refresh()}
        />
      ) : null}

      {view.group ? <ProcessSection workspaceId={workspaceId} /> : null}

      {view.group ? null : (
        <SettingsSection title="Group">
          <Card>
            <SettingsRow
              label={view.mode === "on" ? "Starting the group..." : "SLP is off"}
              hint={view.mode === "on" ? undefined : "Agents in this workspace behave normally"}
            />
          </Card>
        </SettingsSection>
      )}
    </ScrollView>
  );
}
