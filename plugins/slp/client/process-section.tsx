import { copyText, useToast } from "@getpaseo/plugin/client/react-native";
import { SettingsAction, SettingsRow, SettingsSection } from "@getpaseo/plugin/client/ui";
import type { Report } from "../shared/contracts";
import { counts, total } from "../shared/format";

// The group's process report (slice 5, required behavior 10): which
// coordination mechanisms ran and what they cost. Tokens are estimates.

export function ProcessSection({ report, markdown }: { report: Report; markdown: string }) {
  const toast = useToast();
  const e = report.escalations;
  const copy = async () => {
    try {
      await copyText(markdown);
      toast.show("Process report copied as Markdown.", { variant: "success" });
    } catch (cause) {
      toast.error(`Could not copy: ${String(cause instanceof Error ? cause.message : cause)}`);
    }
  };

  return (
    <SettingsSection title="Process" testID="slp-process">
      <SettingsRow
        label={`Human interventions: ${total(report.humanInterventions)}`}
        hint={`Messages straight to the Lead or a Peer (${counts(report.humanInterventions)}). Messages to the Supervisor: ${report.humanMessagesToSupervisor}. Decisions: ${report.humanDecisions.fromPanel} from this panel, ${report.humanDecisions.relayedBySupervisor} relayed by the Supervisor.`}
        testID="slp-process-human"
      />
      <SettingsRow
        label={`Escalations: ${e.raised}`}
        hint={`Answered from the panel ${e.answeredFromPanel}, through the Supervisor ${e.answeredThroughSupervisor}; withdrawn ${e.withdrawn}; revised ${e.revised}; still open ${e.open}.`}
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
        label={`Convention breaks: ${total(report.busySendViolations) + report.outsideAgents.created + total(report.outsideAgents.builtinCreateCalls)}`}
        hint={`Built-in send_agent_prompt calls ${total(report.busySendViolations)} (${counts(report.busySendViolations)}); agents created outside slp_delegate ${report.outsideAgents.created}; built-in create_agent calls ${total(report.outsideAgents.builtinCreateCalls)}.`}
        testID="slp-process-breaks"
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
        label="Report"
        hint="Markdown version of this section, for comparing groups."
        actionLabel="Copy"
        onPress={() => void copy()}
        testID="slp-process-copy"
      />
    </SettingsSection>
  );
}
