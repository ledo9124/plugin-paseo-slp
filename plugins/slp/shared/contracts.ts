import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const RoleSchema = z.enum(["supervisor", "lead", "peer"]);
export type Role = z.infer<typeof RoleSchema>;

export const ModeSchema = z.enum(["on", "off"]);
export type Mode = z.infer<typeof ModeSchema>;

export const MemberViewSchema = z.object({
  role: RoleSchema,
  agentId: z.string().nullable(),
  title: z.string().nullable(),
  provider: z.string().nullable(),
  status: z.string().nullable(),
  archived: z.boolean(),
});
export type MemberView = z.infer<typeof MemberViewSchema>;

export const WorkspaceViewSchema = z.object({
  workspaceId: z.string(),
  mode: ModeSchema,
  /** Set at Human's first message in the workspace (decision 0005). */
  lockedAt: z.string().nullable(),
  /** Whether the daemon injects Paseo tools; SLP requires it. */
  injectIntoAgents: z.boolean(),
  group: z
    .object({
      id: z.string(),
      startedAt: z.string(),
      endedAt: z.string().nullable(),
      members: z.array(MemberViewSchema),
    })
    .nullable(),
});
export type WorkspaceView = z.infer<typeof WorkspaceViewSchema>;

export const getWorkspace = defineRpc({
  name: "slp.workspace.get",
  input: z.object({ workspaceId: z.string() }),
  output: WorkspaceViewSchema,
});

export const setWorkspaceMode = defineRpc({
  name: "slp.workspace.set-mode",
  input: z.object({ workspaceId: z.string(), mode: ModeSchema }),
  output: WorkspaceViewSchema,
});

export const listWorkspaceModes = defineRpc({
  name: "slp.workspace.list",
  input: z.object({}),
  output: z.object({
    workspaces: z.array(z.object({ workspaceId: z.string(), mode: ModeSchema, locked: z.boolean() })),
  }),
});

// Coordination ledger (decisions 0001, 0003). Agent entries are not Human
// authority; a decision's source says who settled it.

export const ConstraintSchema = z.object({
  text: z.string().min(1),
  /** Where the constraint comes from: Human, a project decision, a hard technical limit. */
  source: z.string().min(1),
});

export const BriefSchema = z.object({
  goal: z.string().min(1),
  constraints: z.array(ConstraintSchema),
  /** The design currently chosen; not a binding constraint unless a constraint says so. */
  currentChoice: z.string().min(1),
  uncertainties: z.array(z.string().min(1)),
  reopenEvidence: z.array(z.string().min(1)).min(1),
});
export type Brief = z.infer<typeof BriefSchema>;

export const AssignmentKindSchema = z.enum(["investigate", "design", "implement", "review", "benchmark", "audit"]);
export const AssignmentStatusSchema = z.enum(["assigned", "handed-back", "accepted", "dropped"]);

/** "human" when Human acted from the SLP panel (slice 4); agentId is then null. */
const ActorSchema = z.object({ role: z.union([RoleSchema, z.literal("human")]), agentId: z.string().nullable() });

export const AssignmentSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: AssignmentKindSchema,
  /** The changing scope this assignment owns until a handoff. */
  scope: z.string(),
  brief: BriefSchema,
  peerAgentId: z.string().nullable(),
  status: AssignmentStatusSchema,
  createdAt: z.string(),
  /**
   * When the Peer received the brief or the latest rework request. A Peer turn
   * that ends before then is not a handback of this assignment.
   */
  briefDeliveredAt: z.string().nullable(),
  /** The template the assignment follows, by name (0008); absent or null for none. */
  template: z.string().nullable().optional(),
  handbacks: z.number().int(),
  lastHandbackAt: z.string().nullable(),
  acceptance: z
    .object({ outcome: z.enum(["accepted", "rework", "dropped"]), reason: z.string(), at: z.string() })
    .nullable(),
});
export type Assignment = z.infer<typeof AssignmentSchema>;

export const FindingKindSchema = z.enum(["reopen", "dependency", "blocker", "other"]);
export const FindingSchema = z.object({
  id: z.string(),
  kind: FindingKindSchema,
  assignmentId: z.string().nullable(),
  text: z.string(),
  evidence: z.string(),
  by: ActorSchema,
  status: z.enum(["open", "resolved"]),
  resolvedBy: z.string().nullable(),
  at: z.string(),
});
export type Finding = z.infer<typeof FindingSchema>;

export const DecisionSchema = z.object({
  id: z.string(),
  text: z.string(),
  /** "human" only for Human's own choice: from the panel, or relayed by the Supervisor. */
  source: z.enum(["human", "agent"]),
  /** Pending decisions wait for Human through the Supervisor; their author may withdraw them. */
  status: z.enum(["pending", "settled", "withdrawn"]),
  by: ActorSchema,
  findingId: z.string().nullable(),
  /** Where a lasting decision is recorded in the project, if anywhere. */
  projectRecord: z.string().nullable(),
  at: z.string(),
  /** Set when the author last revised the text while it was pending. */
  revisedAt: z.string().nullable().optional(),
  /** Why the author withdrew it. */
  withdrawnReason: z.string().nullable().optional(),
  /** Agent ids told about it; a Peer's ledger view shows these (0008). */
  notified: z.array(z.string()).optional(),
});
export type Decision = z.infer<typeof DecisionSchema>;

export const LedgerSchema = z.object({
  assignments: z.array(AssignmentSchema),
  findings: z.array(FindingSchema),
  decisions: z.array(DecisionSchema),
});
export type Ledger = z.infer<typeof LedgerSchema>;

/**
 * A member asking Human through its provider's own question tool (slice 7,
 * I2). It blocks the member's turn and is answered in that agent's chat, so
 * the panel shows it. Recorded, not blocked (decision 0001).
 */
export const NativeQuestionSchema = z.object({
  requestId: z.string(),
  role: RoleSchema,
  agentId: z.string(),
  text: z.string(),
  at: z.string(),
});
export type NativeQuestion = z.infer<typeof NativeQuestionSchema>;

export const getLedger = defineRpc({
  name: "slp.ledger.get",
  input: z.object({ workspaceId: z.string() }),
  output: z.object({
    groupId: z.string().nullable(),
    ledger: LedgerSchema,
    /** Native questions still waiting for an answer. */
    nativeQuestions: z.array(NativeQuestionSchema),
    heldMessages: z.number().int(),
    events: z.array(z.object({ at: z.string(), kind: z.string(), data: z.record(z.string(), z.unknown()) })),
  }),
});

// Process report (slice 5, required behavior 10): which coordination
// mechanisms ran and what they cost. Tokens are provider-reported estimates.

const CountsSchema = z.record(z.string(), z.number().int());

export const UsageTotalsSchema = z.object({
  turns: z.number().int(),
  inputTokens: z.number(),
  cachedInputTokens: z.number(),
  outputTokens: z.number(),
  /** Null when no turn reported a cost (Codex reports none). */
  costUsd: z.number().nullable(),
});

export const ReportSchema = z.object({
  groupId: z.string(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  escalations: z.object({
    raised: z.number().int(),
    answeredFromPanel: z.number().int(),
    answeredThroughSupervisor: z.number().int(),
    withdrawn: z.number().int(),
    revised: z.number().int(),
    open: z.number().int(),
  }),
  humanDecisions: z.object({ fromPanel: z.number().int(), relayedBySupervisor: z.number().int() }),
  /** Human messages straight to the Lead or a Peer, bypassing the Supervisor. */
  humanInterventions: CountsSchema,
  humanMessagesToSupervisor: z.number().int(),
  findings: z.object({ byKind: CountsSchema, byRole: CountsSchema, open: z.number().int() }),
  assignments: z.object({
    total: z.number().int(),
    handbacks: z.number().int(),
    outcomes: CountsSchema,
  }),
  /** slp_send messages, keyed "from→to". */
  messages: CountsSchema,
  delivery: z.object({ delivered: z.number().int(), held: z.number().int(), steered: z.number().int() }),
  notices: z.number().int(),
  busySendViolations: CountsSchema,
  /** Questions to Human through a provider's own tool (slice 7, I2), by role. */
  nativeQuestions: z.object({ byRole: CountsSchema, unanswered: z.number().int() }),
  outsideAgents: z.object({ created: z.number().int(), builtinCreateCalls: CountsSchema }),
  /** The Supervisor working on the project, which roles.md rules out (0008). */
  supervisorWork: z.object({ shellCommands: z.number().int(), fileChanges: z.number().int() }),
  /** Which instruction text each member was created with (decision 0008). */
  instructions: z.array(
    z.object({
      role: RoleSchema,
      agentId: z.string().nullable(),
      hash: z.string().nullable(),
      custom: z.boolean(),
    }),
  ),
  usage: z.record(z.string(), UsageTotalsSchema),
  /**
   * Per template name (0008, behavior 10): slp_template loads, assignments
   * that name it, their latest outcomes, and reopen findings on them.
   */
  templates: z.record(
    z.string(),
    z.object({
      loads: z.number().int(),
      assignments: z.number().int(),
      accepted: z.number().int(),
      rework: z.number().int(),
      dropped: z.number().int(),
      reopens: z.number().int(),
    }),
  ),
});
export type Report = z.infer<typeof ReportSchema>;

export const getReport = defineRpc({
  name: "slp.report.get",
  input: z.object({ workspaceId: z.string() }),
  output: z.object({ report: ReportSchema.nullable(), markdown: z.string().nullable() }),
});

/**
 * Human records a decision from the SLP panel: settles a pending one, or
 * records a new one, optionally on a finding. Only the Supervisor is told; it
 * decides who else needs it.
 */
export const humanDecide = defineRpc({
  name: "slp.ledger.decide",
  input: z.object({
    workspaceId: z.string(),
    text: z.string().trim().min(1),
    settles: z.string().optional(),
    findingId: z.string().optional(),
  }),
  output: z.object({ decisionId: z.string(), notified: z.array(z.string()) }),
});

// Templates (decision 0008, plan slice 5): SKILL.md texts stored in plugin
// data, managed from the Settings screen. The name is the key.

export const TemplateViewSchema = z.object({
  /** From the front matter `name`. */
  name: z.string(),
  /** From the front matter `description`. */
  description: z.string(),
  /** From a body line "When to use: ..."; null when the text has none. */
  whenToUse: z.string().nullable(),
  /** The whole SKILL.md text, front matter included, as Human saved it. */
  text: z.string(),
});
export type TemplateView = z.infer<typeof TemplateViewSchema>;

export const listTemplates = defineRpc({
  name: "slp.templates.list",
  input: z.object({}),
  output: z.object({ templates: z.array(TemplateViewSchema) }),
});

/**
 * Saves a SKILL.md text; the name comes from its front matter. Replaces a
 * template of the same name. `previousName` renames: that entry is removed.
 * An unparsable text is refused with the parse error.
 */
export const saveTemplate = defineRpc({
  name: "slp.templates.save",
  input: z.object({ text: z.string().min(1), previousName: z.string().optional() }),
  output: z.object({ template: TemplateViewSchema }),
});

export const removeTemplate = defineRpc({
  name: "slp.templates.remove",
  input: z.object({ name: z.string().min(1) }),
  output: z.object({ removed: z.boolean() }),
});

/**
 * Imports the SKILL.md files under a folder on the plugin's host: the
 * folder's own SKILL.md and each direct subfolder's `<sub>/SKILL.md`. Each
 * file is saved like slp.templates.save; failures are listed, not thrown.
 */
export const importTemplates = defineRpc({
  name: "slp.templates.import",
  input: z.object({ path: z.string().trim().min(1) }),
  output: z.object({
    imported: z.array(z.string()),
    errors: z.array(z.object({ file: z.string(), error: z.string() })),
  }),
});
