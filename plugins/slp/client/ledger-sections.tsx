import { useRef, useState, type ReactNode } from "react";
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
import {
  humanDecide,
  type Assignment,
  type Decision,
  type Ledger,
  type MemberView,
  type NativeQuestion,
} from "../shared/contracts";
import { Card } from "./card";
import { assignmentStatusLabel, findingKindLabel, memberName, roleLabel } from "./labels";

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
  return by.role === "human" ? "Human" : roleLabel(by.role);
}

function decisionSource(decision: Decision): string {
  const who = actorLabel(decision.by);
  if (decision.status === "withdrawn") return `Withdrawn by the ${who}, no answer needed`;
  if (decision.source === "agent") return `Agent choice (${who})`;
  return decision.by.role === "human" ? "Human, from the panel" : `Human, relayed by the ${who}`;
}

function DecisionForm(props: {
  workspaceId: string;
  label: string;
  hint: string;
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
          ? `Decision ${result.decisionId} recorded and sent to the Supervisor`
          : `Decision ${result.decisionId} recorded; no Supervisor to tell`,
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
    <Card>
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
          hint="A decision on a finding resolves it"
          value={findingId}
          options={[{ label: "No finding", value: NO_FINDING }, ...props.findings.map((f) => ({ label: f.label, value: f.id }))]}
          onValueChange={setFindingId}
          disabled={props.disabled || busy}
          testID={`${props.testID}-finding`}
        />
      ) : null}
      <SettingsAction
        label="Send to the Supervisor"
        error={error}
        actionLabel={busy ? "Sending..." : "Send"}
        disabled={props.disabled || busy || text.trim().length === 0}
        onPress={() => void submit()}
        testID={`${props.testID}-submit`}
      />
    </Card>
  );
}

/**
 * What waits for Human: decisions the agents raised, and questions a member
 * asked through its provider's own tool (slice 7, I2). Those block the
 * member's turn and are answered in its chat, so the panel only points there.
 */
export function NeedsYouSection(props: {
  workspaceId: string;
  decisions: Decision[];
  nativeQuestions: NativeQuestion[];
  /** False once the group ended with its workspace. */
  running: boolean;
  onOpenAgent?: (agentId: string) => void;
  onChanged(): void;
}) {
  const pending = props.decisions.filter((d) => d.status === "pending");
  const count = pending.length + props.nativeQuestions.length;
  if (count === 0) return null;
  return (
    <SettingsSection title={`Needs you (${count})`} testID="slp-needs-you">
      {pending.map((decision) => (
        <DecisionForm
          key={decision.id}
          workspaceId={props.workspaceId}
          label={decision.text}
          hint={[
            `From the ${actorLabel(decision.by)}${decision.revisedAt ? " (revised)" : ""} · ${decision.id}`,
            decision.findingId ? `On finding ${decision.findingId}` : null,
          ]
            .filter(Boolean)
            .join("\n")}
          settles={decision.id}
          disabled={!props.running}
          onChanged={props.onChanged}
          testID={`slp-settle-${decision.id}`}
        />
      ))}
      {props.nativeQuestions.length > 0 ? (
        <Card testID="slp-native-questions">
          {props.nativeQuestions.map((question) => (
            <SettingsAction
              key={question.requestId}
              label={question.text}
              hint={`The ${question.role} is waiting in its own chat. It asked through its provider's question tool, which blocks its turn.`}
              actionLabel="Open chat"
              disabled={!props.onOpenAgent}
              onPress={() => props.onOpenAgent?.(question.agentId)}
              testID={`slp-native-question-${question.requestId}`}
            />
          ))}
        </Card>
      ) : null}
    </SettingsSection>
  );
}

function briefRows(assignment: Assignment): ReactNode[] {
  const { brief } = assignment;
  const list = (items: string[]) => (items.length ? items.map((item) => `• ${item}`).join("\n") : "None recorded");
  return [
    <SettingsRow key="goal" label="Goal" hint={brief.goal} />,
    <SettingsRow
      key="constraints"
      label="Binding constraints"
      hint={list(brief.constraints.map((c) => `${c.text} (source: ${c.source})`))}
    />,
    <SettingsRow key="choice" label="Current choice (the Lead's, not binding)" hint={brief.currentChoice} />,
    <SettingsRow key="uncertainties" label="Open uncertainties" hint={list(brief.uncertainties)} />,
    <SettingsRow key="reopen" label="Evidence that would reopen it" hint={list(brief.reopenEvidence)} />,
    assignment.acceptance ? (
      <SettingsRow key="acceptance" label={`Lead: ${assignment.acceptance.outcome}`} hint={assignment.acceptance.reason} />
    ) : null,
  ];
}

export function LedgerSections({ workspaceId, ledger, members, running, onChanged }: Props) {
  const [openBrief, setOpenBrief] = useState<string | null>(null);
  const ownerName = (agentId: string | null) => {
    if (!agentId) return "no Peer yet";
    const member = members.find((m) => m.agentId === agentId);
    return member ? memberName(member) : "a former member";
  };

  const closed = ledger.decisions.filter((d) => d.status !== "pending");
  const openFindings = ledger.findings.filter((f) => f.status === "open");

  return (
    <>
      <SettingsSection title={`Open findings (${openFindings.length})`} testID="slp-findings">
        <Card>
          {openFindings.length === 0 ? <SettingsRow label="No open findings" /> : null}
          {openFindings.map((finding) => (
            <SettingsRow
              key={finding.id}
              label={`${findingKindLabel(finding.kind)}${finding.assignmentId ? ` on ${finding.assignmentId}` : ""}, from the ${actorLabel(finding.by)}`}
              hint={`${finding.text}\nEvidence: ${finding.evidence}\n${finding.id}`}
              testID={`slp-finding-${finding.id}`}
            />
          ))}
        </Card>
      </SettingsSection>

      <SettingsSection title={`Assignments (${ledger.assignments.length})`} testID="slp-assignments">
        {ledger.assignments.length === 0 ? (
          <Card>
            <SettingsRow label="Nothing delegated yet" />
          </Card>
        ) : null}
        {ledger.assignments.map((assignment) => (
          <Card key={assignment.id}>
            <SettingsAction
              label={`${assignment.title} · ${assignment.id}`}
              hint={`${assignment.kind} · ${assignmentStatusLabel(assignment.status)} · owner ${ownerName(assignment.peerAgentId)}\nScope: ${assignment.scope}`}
              actionLabel={openBrief === assignment.id ? "Hide brief" : "Brief"}
              onPress={() => setOpenBrief(openBrief === assignment.id ? null : assignment.id)}
              testID={`slp-assignment-${assignment.id}`}
            />
            {openBrief === assignment.id ? briefRows(assignment) : null}
          </Card>
        ))}
      </SettingsSection>

      <SettingsSection title={`Decisions (${closed.length})`} testID="slp-decisions">
        <Card>
          {closed.length === 0 ? <SettingsRow label="No settled decisions" /> : null}
          {closed.map((decision) => (
            <SettingsRow
              key={decision.id}
              label={decisionSource(decision)}
              hint={[
                decision.text,
                decision.withdrawnReason ? `Reason: ${decision.withdrawnReason}` : null,
                decision.findingId ? `Resolves ${decision.findingId}` : null,
                decision.projectRecord ? `Project record: ${decision.projectRecord}` : null,
                decision.id,
              ]
                .filter(Boolean)
                .join("\n")}
              testID={`slp-decision-${decision.id}`}
            />
          ))}
        </Card>
      </SettingsSection>

      {running ? (
        <SettingsSection title="Record a decision" testID="slp-record">
          <DecisionForm
            workspaceId={workspaceId}
            label="Decision"
            hint="Recorded as yours (source Human) and sent only to the Supervisor, which decides who else needs it"
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
