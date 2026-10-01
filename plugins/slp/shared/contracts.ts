import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const RoleSchema = z.enum(["supervisor", "lead"]);
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
