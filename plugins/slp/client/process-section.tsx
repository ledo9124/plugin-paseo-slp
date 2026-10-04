import { useCallback, useEffect, useState } from "react";
import { useRpc } from "@getpaseo/plugin/client";
import { copyText, useToast } from "@getpaseo/plugin/client/react-native";
import { SettingsAction, SettingsRow, SettingsSection } from "@getpaseo/plugin/client/ui";
import { getReport, type Report } from "../shared/contracts";
import { counts, nativeQuestionBreaks, total } from "../shared/format";
import { Card } from "./card";

// The group's process report (slice 5, required behavior 10): which
// coordination mechanisms ran and what they cost. Tokens are estimates. It is
// collapsed, and fetched only while it is open.

const REFRESH_MS = 5000;

function ReportRows({ report, markdown }: { report: Report; markdown: string }) {
  const toast = useToast();
  const e = report.escalations;
  const copy = async () => {
    try {
      await copyText(markdown);
      toast.show("Process report copied as Markdown", { variant: "success" });
    } catch (cause) {
      toast.error(`Could not copy: ${String(cause instanceof Error ? cause.message : cause)}`);
    }
  };

  return (
    <Card>
      <SettingsRow
        label={`Human messages to the Lead or a Peer: ${total(report.humanInterventions)}`}
        hint={`Human's own choice, not a break (${counts(report.humanInterventions)}). Messages to the Supervisor: ${report.humanMessagesToSupervisor}. Decisions: ${report.humanDecisions.fromPanel} from this panel, ${report.humanDecisions.relayedBySupervisor} relayed by the Supervisor.`}
        testID="slp-process-human"
      />
      <SettingsRow
        label={`Escalations: ${e.raised}`}
        hint={`Answered from the panel ${e.answeredFromPanel}, through the Supervisor ${e.answeredThroughSupervisor}; withdrawn ${e.withdrawn}; revised ${e.revised}; still open ${e.open}. Asked through the Supervisor's question tool ${report.nativeQuestions.byRole.supervisor ?? 0}; unanswered native questions ${report.nativeQuestions.unanswered}.`}
        testID="slp-process-escalations"
      />
      <SettingsRow
        label={`Findings: ${total(report.findings.byKind)}`}
        hint={`${counts(report.findings.byKind)}; recorded by ${counts(report.findings.byRole)}; open ${report.findings.open}.`}
      />
      <SettingsRow
        label={`Assignments: ${report.assignments.total}`}
        hint={`Handbacks ${report.assignments.handbacks}; Lead outcomes ${counts(report.assignments.outcomes)}.`}
      />
      <SettingsRow
        label={`Member messages: ${total(report.messages)}`}
        hint={`${counts(report.messages)}. Delivery: ${report.delivery.delivered} at once, ${report.delivery.held} held for a busy recipient, ${report.delivery.steered} steered. Plugin notices: ${report.notices}.`}
      />
      <SettingsRow
        label={`Convention breaks: ${
          total(report.busySendViolations) +
          report.outsideAgents.created +
          total(report.outsideAgents.builtinCreateCalls) +
          total(nativeQuestionBreaks(report.nativeQuestions.byRole)) +
          report.supervisorWork.shellCommands +
          report.supervisorWork.fileChanges
        }`}
        hint={`Questions to Human through a provider's own tool by the Lead or a Peer ${total(nativeQuestionBreaks(report.nativeQuestions.byRole))} (${counts(nativeQuestionBreaks(report.nativeQuestions.byRole))}); built-in send_agent_prompt calls ${total(report.busySendViolations)} (${counts(report.busySendViolations)}); agents created outside slp_delegate ${report.outsideAgents.created}; built-in create_agent calls ${total(report.outsideAgents.builtinCreateCalls)}; Supervisor shell commands ${report.supervisorWork.shellCommands} and file changes ${report.supervisorWork.fileChanges} on the project.`}
        testID="slp-process-breaks"
      />
      <SettingsRow
        label={`Instructions: ${report.instructions.filter((entry) => entry.custom).length} custom of ${report.instructions.length}`}
        hint={report.instructions
          .map((entry) => `${entry.role} ${entry.hash ?? "not recorded"}${entry.custom ? " (custom)" : ""}`)
          .join("; ")}
        testID="slp-process-instructions"
      />
      {Object.entries(report.usage).map(([role, usage]) => (
        <SettingsRow
          key={role}
          label={`Tokens, ${role} (estimate)`}
          hint={`${usage.turns} turns; input ${usage.inputTokens} (cached ${usage.cachedInputTokens}), output ${usage.outputTokens}; cost ${
            usage.costUsd === null ? "not reported" : `$${usage.costUsd.toFixed(4)}`
          }.`}
          testID={`slp-process-usage-${role}`}
        />
      ))}
      <SettingsAction
        label="Copy as Markdown"
        hint="For comparing groups"
        actionLabel="Copy"
        onPress={() => void copy()}
        testID="slp-process-copy"
      />
    </Card>
  );
}

export function ProcessSection({ workspaceId }: { workspaceId: string }) {
  const fetchReport = useRpc(getReport);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{ report: Report; markdown: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await fetchReport({ workspaceId });
      setData(next.report && next.markdown ? { report: next.report, markdown: next.markdown } : null);
      setError(null);
    } catch (cause) {
      setError(String(cause instanceof Error ? cause.message : cause));
    }
  }, [fetchReport, workspaceId]);

  useEffect(() => {
    if (!open) return;
    void load();
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [open, load]);

  return (
    <SettingsSection title="Process" testID="slp-process">
      <Card>
        <SettingsAction
          label="Process report"
          hint="Which coordination steps ran and what they cost, for comparing groups"
          error={open ? error : null}
          actionLabel={open ? "Hide" : "Show"}
          onPress={() => setOpen(!open)}
          testID="slp-process-toggle"
        />
      </Card>
      {open && data ? <ReportRows report={data.report} markdown={data.markdown} /> : null}
      {open && !data && !error ? (
        <Card>
          <SettingsRow label="Loading the report..." />
        </Card>
      ) : null}
    </SettingsSection>
  );
}
