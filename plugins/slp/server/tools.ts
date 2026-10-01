import { z } from "zod";
import { AssignmentKindSchema, BriefSchema, FindingKindSchema } from "../shared/contracts";
import type { Coordination } from "./coordination";
import type { McpTool } from "./mcp-http";
import type { PaseoHost } from "./paseo-host";

// SLP member tools. The caller is the member secret from the MCP URL; each
// tool checks the caller's role inside Coordination.

const SendInput = z.object({
  to: z.string().min(1),
  text: z.string().min(1),
  delivery: z.enum(["after-turn", "steer"]).default("after-turn"),
});
const DelegateInput = z.object({
  title: z.string().min(1),
  kind: AssignmentKindSchema,
  scope: z.string().min(1),
  brief: BriefSchema,
  model: z.string().optional(),
  peerAgentId: z.string().optional(),
});
const AcceptInput = z.object({
  assignmentId: z.string(),
  outcome: z.enum(["accepted", "rework", "dropped"]),
  reason: z.string().min(1),
});
const FindingInput = z.object({
  kind: FindingKindSchema,
  assignmentId: z.string().optional(),
  text: z.string().min(1),
  evidence: z.string().min(1),
});
const DecideInput = z.object({
  text: z.string().min(1),
  source: z.enum(["human", "agent"]),
  status: z.enum(["pending", "settled"]),
  findingId: z.string().optional(),
  projectRecord: z.string().optional(),
  settles: z.string().optional(),
  notify: z.array(z.string()).optional(),
});

const ReviseDecisionInput = z.object({
  decisionId: z.string(),
  action: z.enum(["update", "withdraw"]),
  text: z.string().min(1).optional(),
  reason: z.string().min(1),
});

function schema(type: z.ZodType): Record<string, unknown> {
  const { $schema: _ignored, ...json } = z.toJSONSchema(type, { io: "input" }) as Record<string, unknown>;
  return json;
}

function parse<T extends z.ZodType>(type: T, args: Record<string, unknown>): z.infer<T> {
  const result = type.safeParse(args);
  if (!result.success) throw new Error(`Invalid input: ${z.prettifyError(result.error)}`);
  return result.data;
}

export function memberTools(coordination: Coordination, host: () => PaseoHost): McpTool<string>[] {
  const empty = { type: "object", properties: {}, additionalProperties: false };
  return [
    {
      name: "slp_group",
      description: "Your SLP group: your role and agent id, and every member's role, agent id, and title.",
      inputSchema: empty,
      call: (_args, secret) => coordination.groupInfo(secret),
    },
    {
      name: "slp_ledger",
      description:
        "The coordination ledger: assignments with their briefs and status, findings, and decisions with their source. The Lead also sees the allowed Peer models.",
      inputSchema: empty,
      call: (_args, secret) => coordination.ledger(secret),
    },
    {
      name: "slp_send",
      description:
        'Message a group member by agent id or by role ("supervisor", "lead"). delivery "after-turn" (default) waits until the recipient finishes its current turn; "steer" joins its running turn now, for interventions only.',
      inputSchema: schema(SendInput),
      call: (args, secret) => coordination.send(host(), secret, parse(SendInput, args)),
    },
    {
      name: "slp_finding",
      description:
        "Record a finding with evidence: reopen (a premise looks wrong), dependency, blocker, or other. The Lead is told.",
      inputSchema: schema(FindingInput),
      call: (args, secret) => coordination.finding(host(), secret, parse(FindingInput, args)),
    },
    {
      name: "slp_delegate",
      description:
        "Lead only. Create an assignment with a structured brief and give it to a new Peer (model from the allowed list) or to an existing Peer with no open assignment (peerAgentId). Constraints need a source (\"Human\" only for what Human said; inferences name who inferred them and from what); the current choice is not a constraint.",
      inputSchema: schema(DelegateInput),
      call: (args, secret) => coordination.delegate(host(), secret, parse(DelegateInput, args)),
    },
    {
      name: "slp_accept",
      description:
        "Lead only. Judge a handed-back assignment against the goal: accepted, rework (the reason goes to the Peer), or dropped.",
      inputSchema: schema(AcceptInput),
      call: (args, secret) => coordination.accept(host(), secret, parse(AcceptInput, args)),
    },
    {
      name: "slp_decide",
      description:
        'Lead or Supervisor. Record a decision with its source. status "pending" sends it to Human through the Supervisor; "settled" resolves its finding. source "human" and settling a pending decision (settles) are for the Supervisor relaying Human\'s own answer or delegation, never an inference from it. An agent decision names what it rests on in its text (a delegation\'s decision id, or the project record). notify lists the members whose work it changes.',
      inputSchema: schema(DecideInput),
      call: (args, secret) => coordination.decide(host(), secret, parse(DecideInput, args)),
    },
    {
      name: "slp_revise_decision",
      description:
        'Lead or Supervisor, for a pending decision you recorded. action "update" replaces its text (to correct or sharpen the question); "withdraw" removes it from what Human must answer. The reason is required; the Supervisor is told.',
      inputSchema: schema(ReviseDecisionInput),
      call: (args, secret) => coordination.reviseDecision(host(), secret, parse(ReviseDecisionInput, args)),
    },
  ];
}
