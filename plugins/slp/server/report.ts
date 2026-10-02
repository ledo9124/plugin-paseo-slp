import type { Report } from "../shared/contracts";
import { counts, nativeQuestionBreaks, total } from "../shared/format";
import { openNativeQuestions } from "./coordination";
import type { GroupRecord } from "./store";

// Per-group process report (slice 5, required behavior 10), derived from the
// append-only event list and the ledger. Definitions are in the active plan.

type Data = Record<string, unknown>;

function bump(counts: Record<string, number>, key: string, by = 1): void {
  counts[key] = (counts[key] ?? 0) + by;
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function buildReport(group: GroupRecord): Report {
  const roleOf = (agentId: unknown) =>
    group.members.find((m) => m.agentId === agentId)?.role ?? (agentId ? "unknown" : "none");
  const report: Report = {
    groupId: group.id,
    startedAt: group.startedAt,
    endedAt: group.endedAt,
    escalations: { raised: 0, answeredFromPanel: 0, answeredThroughSupervisor: 0, withdrawn: 0, revised: 0, open: 0 },
    humanDecisions: { fromPanel: 0, relayedBySupervisor: 0 },
    humanInterventions: {},
    humanMessagesToSupervisor: 0,
    findings: { byKind: {}, byRole: {}, open: 0 },
    assignments: { total: group.ledger.assignments.length, handbacks: 0, outcomes: {} },
    messages: {},
    delivery: { delivered: 0, held: 0, steered: 0 },
    notices: 0,
    busySendViolations: {},
    nativeQuestions: { byRole: {}, unanswered: 0 },
    outsideAgents: { created: 0, builtinCreateCalls: {} },
    supervisorWork: { shellCommands: 0, fileChanges: 0 },
    instructions: group.members.map((member) => ({
      role: member.role,
      agentId: member.agentId,
      hash: member.instructionsHash ?? null,
      custom: member.customInstructions ?? false,
    })),
    usage: {},
    templates: {},
  };

  const events = group.events as Array<{ kind: string; data: Data }>;
  // A built-in send reaches its recipient as a plain user message; drop the
  // matching "Human" message, whichever turn ended first.
  const builtinSends = events
    .filter((e) => e.kind === "builtin-send" && typeof e.data.to === "string" && e.data.textKey)
    .map((e) => ({ to: e.data.to as string, key: e.data.textKey }));
  const fromAgent = (data: Data) =>
    builtinSends.some(
      (send) => send.key === data.textKey && typeof data.agentId === "string" && data.agentId.startsWith(send.to),
    );
  // Providers such as Claude report cost cumulatively per session: count the
  // increase per agent, and a drop as a new session starting from zero.
  const lastCost = new Map<string, number>();

  const templateEntry = (name: string) =>
    (report.templates[name] ??= { loads: 0, assignments: 0, accepted: 0, rework: 0, dropped: 0, reopens: 0 });
  const templateOf = (assignmentId: unknown) => {
    const name = group.ledger.assignments.find((a) => a.id === assignmentId)?.template;
    return name ? templateEntry(name) : null;
  };
  for (const assignment of group.ledger.assignments) {
    if (!assignment.template) continue;
    const entry = templateEntry(assignment.template);
    entry.assignments += 1;
    if (assignment.status === "accepted") entry.accepted += 1;
    if (assignment.status === "dropped") entry.dropped += 1;
  }
  for (const finding of group.ledger.findings) {
    if (finding.kind === "reopen") {
      const entry = templateOf(finding.assignmentId);
      if (entry) entry.reopens += 1;
    }
  }

  for (const { kind, data } of events) {
    switch (kind) {
      case "decision":
        if (data.status === "pending" && !data.settled) report.escalations.raised += 1;
        if (data.settled && data.by === "human") report.escalations.answeredFromPanel += 1;
        if (data.settled && data.by === "supervisor") report.escalations.answeredThroughSupervisor += 1;
        break;
      case "decision-revised":
        if (data.action === "withdraw") report.escalations.withdrawn += 1;
        else report.escalations.revised += 1;
        break;
      case "human-message":
        if (fromAgent(data)) break;
        if (data.to === "supervisor") report.humanMessagesToSupervisor += 1;
        else bump(report.humanInterventions, String(data.to));
        break;
      case "finding":
        bump(report.findings.byKind, String(data.kind));
        bump(report.findings.byRole, String(data.by));
        break;
      case "handback":
        report.assignments.handbacks += 1;
        break;
      case "acceptance": {
        bump(report.assignments.outcomes, String(data.outcome));
        const entry = templateOf(data.assignmentId);
        if (entry && data.outcome === "rework") entry.rework += 1;
        break;
      }
      case "template-load":
        templateEntry(String(data.name)).loads += 1;
        break;
      case "message":
        if (data.outcome === "held") report.delivery.held += 1;
        else if (data.outcome === "steered") report.delivery.steered += 1;
        else report.delivery.delivered += 1;
        if (data.kind === "notice") report.notices += 1;
        else if (data.kind === "message") bump(report.messages, `${String(data.from)}→${roleOf(data.to)}`);
        break;
      case "builtin-send":
        bump(report.busySendViolations, String(data.role));
        break;
      case "native-question":
        bump(report.nativeQuestions.byRole, String(data.role));
        break;
      case "builtin-create":
        bump(report.outsideAgents.builtinCreateCalls, String(data.role));
        break;
      case "outside-agent":
        report.outsideAgents.created += 1;
        break;
      case "supervisor-work":
        if (data.kind === "shell") report.supervisorWork.shellCommands += 1;
        else report.supervisorWork.fileChanges += 1;
        break;
      case "usage": {
        const role = String(data.role);
        const totals = (report.usage[role] ??= {
          turns: 0,
          inputTokens: 0,
          cachedInputTokens: 0,
          outputTokens: 0,
          costUsd: null,
        });
        totals.turns += 1;
        totals.inputTokens += num(data.inputTokens);
        totals.cachedInputTokens += num(data.cachedInputTokens);
        totals.outputTokens += num(data.outputTokens);
        if (typeof data.totalCostUsd === "number") {
          const agentId = String(data.agentId);
          const previous = lastCost.get(agentId) ?? 0;
          const increase = data.totalCostUsd >= previous ? data.totalCostUsd - previous : data.totalCostUsd;
          lastCost.set(agentId, data.totalCostUsd);
          totals.costUsd = (totals.costUsd ?? 0) + increase;
        }
        break;
      }
    }
  }

  report.escalations.open = group.ledger.decisions.filter((d) => d.status === "pending").length;
  for (const decision of group.ledger.decisions) {
    if (decision.source !== "human") continue;
    if (decision.by.role === "human") report.humanDecisions.fromPanel += 1;
    else report.humanDecisions.relayedBySupervisor += 1;
  }
  report.findings.open = group.ledger.findings.filter((f) => f.status === "open").length;
  report.nativeQuestions.unanswered = openNativeQuestions(group).length;
  return report;
}

export function renderReport(report: Report): string {
  const e = report.escalations;
  const usageRows = Object.entries(report.usage).map(
    ([role, u]) =>
      `| ${role} | ${u.turns} | ${u.inputTokens} | ${u.cachedInputTokens} | ${u.outputTokens} | ${
        u.costUsd === null ? "not reported" : `$${u.costUsd.toFixed(4)}`
      } |`,
  );
  return [
    `# SLP process report: group ${report.groupId}`,
    "",
    `Started ${report.startedAt}${report.endedAt ? `, ended ${report.endedAt}` : ", still running"}.`,
    "",
    "## Human",
    `- Interventions (messages straight to the Lead or a Peer): ${total(report.humanInterventions)} (${counts(report.humanInterventions)})`,
    `- Messages to the Supervisor: ${report.humanMessagesToSupervisor}`,
    `- Decisions: ${report.humanDecisions.fromPanel} from the panel, ${report.humanDecisions.relayedBySupervisor} relayed by the Supervisor`,
    "",
    "## Escalations",
    `- Raised: ${e.raised}; answered from the panel ${e.answeredFromPanel}, through the Supervisor ${e.answeredThroughSupervisor}; withdrawn ${e.withdrawn}; still open ${e.open}`,
    `- Revised while pending: ${e.revised}`,
    `- Asked through the Supervisor's question tool: ${report.nativeQuestions.byRole.supervisor ?? 0}; unanswered native questions ${report.nativeQuestions.unanswered}`,
    "",
    "## Findings and acceptance",
    `- Findings: ${counts(report.findings.byKind)}; by ${counts(report.findings.byRole)}; open ${report.findings.open}`,
    `- Assignments: ${report.assignments.total}; handbacks ${report.assignments.handbacks}; Lead outcomes ${counts(report.assignments.outcomes)}`,
    "",
    ...(Object.keys(report.templates).length
      ? [
          "## Templates",
          ...Object.entries(report.templates).map(
            ([name, t]) =>
              `- ${name}: loaded ${t.loads}; assignments ${t.assignments} (accepted ${t.accepted}, dropped ${t.dropped}); rework ${t.rework}; reopens ${t.reopens}`,
          ),
          "",
        ]
      : []),
    "## Messages",
    `- Member messages: ${total(report.messages)} (${counts(report.messages)})`,
    `- Delivery: ${report.delivery.delivered} delivered, ${report.delivery.held} held for a busy recipient, ${report.delivery.steered} steered into a running turn`,
    `- Plugin notices: ${report.notices}`,
    "",
    "## Convention breaks",
    `- Questions to Human through a provider's own tool, by the Lead or a Peer: ${total(nativeQuestionBreaks(report.nativeQuestions.byRole))} (${counts(nativeQuestionBreaks(report.nativeQuestions.byRole))})`,
    `- Busy-send violations (built-in send_agent_prompt): ${total(report.busySendViolations)} (${counts(report.busySendViolations)})`,
    `- Agents created outside slp_delegate: ${report.outsideAgents.created}; built-in create_agent calls ${total(report.outsideAgents.builtinCreateCalls)} (${counts(report.outsideAgents.builtinCreateCalls)})`,
    `- Supervisor working on the project: ${report.supervisorWork.shellCommands} shell commands, ${report.supervisorWork.fileChanges} file changes`,
    "",
    "## Instructions",
    ...report.instructions.map(
      (entry) =>
        `- ${entry.role} ${entry.agentId?.slice(0, 7) ?? "(not created)"}: ${entry.hash ?? "not recorded"}${entry.custom ? " (custom)" : entry.hash ? " (default)" : ""}`,
    ),
    "",
    "## Tokens and cost (estimates)",
    "Tokens are summed from the usage each provider reported after completed turns. Cost counts the growth of each agent's cumulative session cost. Codex reports no cost.",
    "",
    "| Role | Turns | Input | Cached input | Output | Cost |",
    "| --- | --- | --- | --- | --- | --- |",
    ...(usageRows.length ? usageRows : ["| none | 0 | 0 | 0 | 0 | not reported |"]),
    "",
  ].join("\n");
}
