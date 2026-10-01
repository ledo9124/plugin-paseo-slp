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

const ActorSchema = z.object({ role: RoleSchema, agentId: z.string().nullable() });

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
  /** "human" only when the Supervisor relays Human's own choice. */
  source: z.enum(["human", "agent"]),
  /** Pending decisions wait for Human through the Supervisor. */
  status: z.enum(["pending", "settled"]),
  by: ActorSchema,
  findingId: z.string().nullable(),
  /** Where a lasting decision is recorded in the project, if anywhere. */
  projectRecord: z.string().nullable(),
  at: z.string(),
});
export type Decision = z.infer<typeof DecisionSchema>;

export const LedgerSchema = z.object({
  assignments: z.array(AssignmentSchema),
  findings: z.array(FindingSchema),
  decisions: z.array(DecisionSchema),
});
export type Ledger = z.infer<typeof LedgerSchema>;

export const getLedger = defineRpc({
  name: "slp.ledger.get",
  input: z.object({ workspaceId: z.string() }),
  output: z.object({
    groupId: z.string().nullable(),
    ledger: LedgerSchema,
    heldMessages: z.number().int(),
    events: z.array(z.object({ at: z.string(), kind: z.string(), data: z.record(z.string(), z.unknown()) })),
  }),
});
