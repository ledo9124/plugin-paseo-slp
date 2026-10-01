import { useRef, useState } from "react";
import { useRpc } from "@getpaseo/plugin/client";
import { useToast } from "@getpaseo/plugin/client/react-native";
import {
  SettingsAction,
  SettingsInput,
  SettingsRow,
  SettingsSection,
  SettingsSelect,
  type SettingsInputHandle,
} from "@getpaseo/plugin/client/ui";
import { humanDecide, type Assignment, type Decision, type Ledger, type MemberView } from "../shared/contracts";

// Human's view of the coordination ledger (required behavior 7, slice 4):
// briefs with constraint sources, open findings, pending decisions, and
// ownership, readable without transcripts. A Human decision goes only to the
// Supervisor, which decides who else needs it.

interface Props {
  workspaceId: string;
  ledger: Ledger;
  members: MemberView[];
  /** False once the group ended with its workspace. */
  running: boolean;
  onChanged(): void;
}

const NO_FINDING = "none";

function actorLabel(by: Decision["by"]): string {
  return by.role === "human" ? "Human" : by.role.charAt(0).toUpperCase() + by.role.slice(1);
}

function decisionSource(decision: Decision): string {
  const who = actorLabel(decision.by);
  if (decision.status === "withdrawn") return `withdrawn by the ${who}, no answer needed`;
  if (decision.source === "agent") return `agent choice (${who})`;
  return decision.by.role === "human" ? "Human, from the panel" : `Human, relayed by the ${who}`;
}

function DecisionForm(props: {
  workspaceId: string;
  label: string;
  hint: string;
  actionLabel: string;
  settles?: string;
  findings?: { id: string; label: string }[];
  disabled: boolean;
  onChanged(): void;
  testID: string;
}) {
  const decide = useRpc(humanDecide);
  const toast = useToast();
  const input = useRef<SettingsInputHandle>(null);
  const [text, setText] = useState("");
  const [findingId, setFindingId] = useState(NO_FINDING);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await decide({
        workspaceId: props.workspaceId,
        text,
        ...(props.settles ? { settles: props.settles } : {}),
        ...(findingId !== NO_FINDING ? { findingId } : {}),
      });
      input.current?.replaceText("");
      setText("");
      setFindingId(NO_FINDING);
      toast.show(
        result.notified.length
          ? `${result.decisionId} recorded and sent to the Supervisor.`
          : `${result.decisionId} recorded; no Supervisor to tell.`,
        { variant: "success" },
      );
      props.onChanged();
    } catch (cause) {
      setError(String(cause instanceof Error ? cause.message : cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SettingsInput
        ref={input}
        label={props.label}
        hint={props.hint}
        placeholder="Your decision"
        onChangeText={setText}
        disabled={props.disabled || busy}
        testID={`${props.testID}-text`}
      />
      {props.findings && props.findings.length > 0 ? (
        <SettingsSelect
          label="On finding"
          hint="A decision on a finding resolves it."
          value={findingId}
          options={[{ label: "No finding", value: NO_FINDING }, ...props.findings.map((f) => ({ label: f.label, value: f.id }))]}
          onValueChange={setFindingId}
          disabled={props.disabled || busy}
          testID={`${props.testID}-finding`}
        />
      ) : null}
      <SettingsAction
        label=""
        error={error}
        actionLabel={busy ? "Recording…" : props.actionLabel}
        disabled={props.disabled || busy || text.trim().length === 0}
        onPress={() => void submit()}
        testID={`${props.testID}-submit`}
      />
    </>
  );
}

function BriefRows({ assignment }: { assignment: Assignment }) {
  const { brief } = assignment;
  const list = (items: string[]) => (items.length ? items.map((item) => `• ${item}`).join("\n") : "None recorded.");
  return (
    <>
      <SettingsRow label="Goal" hint={brief.goal} />
      <SettingsRow
        label="Binding constraints"
        hint={list(brief.constraints.map((c) => `${c.text} (source: ${c.source})`))}
      />
      <SettingsRow label="Current choice (the Lead's, not binding)" hint={brief.currentChoice} />
      <SettingsRow label="Open uncertainties" hint={list(brief.uncertainties)} />
      <SettingsRow label="Evidence that would reopen it" hint={list(brief.reopenEvidence)} />
      {assignment.acceptance ? (
        <SettingsRow label={`Lead: ${assignment.acceptance.outcome}`} hint={assignment.acceptance.reason} />
      ) : null}
    </>
  );
}

export function LedgerSections({ workspaceId, ledger, members, running, onChanged }: Props) {
  const [openBrief, setOpenBrief] = useState<string | null>(null);
  const memberName = (agentId: string | null) =>
    members.find((m) => m.agentId === agentId)?.title ?? agentId ?? "nobody";

  const pending = ledger.decisions.filter((d) => d.status === "pending");
  const closed = ledger.decisions.filter((d) => d.status !== "pending");
  const openFindings = ledger.findings.filter((f) => f.status === "open");

  return (
    <>
      {pending.length > 0 ? (
        <SettingsSection title={`Waiting for you (${pending.length})`} testID="slp-pending">
          {pending.map((decision) => (
            <DecisionForm
              key={decision.id}
              workspaceId={workspaceId}
              label={`${decision.id}, raised by the ${actorLabel(decision.by)}${decision.revisedAt ? " (revised)" : ""}`}
              hint={decision.text + (decision.findingId ? `\nOn finding ${decision.findingId}.` : "")}
              actionLabel={`Settle ${decision.id}`}
              settles={decision.id}
              disabled={!running}
              onChanged={onChanged}
              testID={`slp-settle-${decision.id}`}
            />
          ))}
        </SettingsSection>
      ) : null}

      <SettingsSection title={`Open findings (${openFindings.length})`} testID="slp-findings">
        {openFindings.length === 0 ? <SettingsRow label="No open findings." /> : null}
        {openFindings.map((finding) => (
          <SettingsRow
            key={finding.id}
            label={`${finding.id} ${finding.kind}${finding.assignmentId ? ` on ${finding.assignmentId}` : ""}, from the ${actorLabel(finding.by)}`}
            hint={`${finding.text}\nEvidence: ${finding.evidence}`}
            testID={`slp-finding-${finding.id}`}
          />
        ))}
      </SettingsSection>

      <SettingsSection title={`Assignments (${ledger.assignments.length})`} testID="slp-assignments">
        {ledger.assignments.length === 0 ? <SettingsRow label="The Lead has not delegated anything yet." /> : null}
        {ledger.assignments.map((assignment) => (
          <AssignmentEntry
            key={assignment.id}
            assignment={assignment}
            owner={memberName(assignment.peerAgentId)}
            open={openBrief === assignment.id}
            onToggle={() => setOpenBrief(openBrief === assignment.id ? null : assignment.id)}
          />
        ))}
      </SettingsSection>

      <SettingsSection title={`Decisions (${closed.length})`} testID="slp-decisions">
        {closed.length === 0 ? <SettingsRow label="No settled decisions." /> : null}
        {closed.map((decision) => (
          <SettingsRow
            key={decision.id}
            label={`${decision.id}: ${decisionSource(decision)}`}
            hint={[
              decision.text,
              decision.withdrawnReason ? `Reason: ${decision.withdrawnReason}` : null,
              decision.findingId ? `Resolves ${decision.findingId}.` : null,
              decision.projectRecord ? `Project record: ${decision.projectRecord}` : null,
            ]
              .filter(Boolean)
              .join("\n")}
            testID={`slp-decision-${decision.id}`}
          />
        ))}
      </SettingsSection>

      {running ? (
        <SettingsSection title="Record a decision" testID="slp-record">
          <DecisionForm
            workspaceId={workspaceId}
            label="Decision"
            hint="Recorded as yours (source Human) and sent only to the Supervisor, which decides who else needs it."
            actionLabel="Record"
            findings={openFindings.map((f) => ({ id: f.id, label: `${f.id}: ${f.text.slice(0, 60)}` }))}
            disabled={false}
            onChanged={onChanged}
            testID="slp-record"
          />
        </SettingsSection>
      ) : null}
    </>
  );
}

function AssignmentEntry(props: { assignment: Assignment; owner: string; open: boolean; onToggle(): void }) {
  const { assignment } = props;
  return (
    <>
      <SettingsAction
        label={`${assignment.id} ${assignment.title}`}
        hint={`${assignment.kind} · ${assignment.status} · owner ${props.owner}\nScope: ${assignment.scope}`}
        actionLabel={props.open ? "Hide brief" : "Brief"}
        onPress={props.onToggle}
        testID={`slp-assignment-${assignment.id}`}
      />
      {props.open ? <BriefRows assignment={assignment} /> : null}
    </>
  );
}
