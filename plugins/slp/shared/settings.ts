import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

const RoleConfigSchema = z.object({
  /** `provider/model`, for example `claude/claude-opus-5-5`. */
  provider: z.string().min(3).regex(/^[^/\s]+\/\S+$/, "use provider/model"),
  /** Provider mode id; members must not depend on permission prompts. */
  modeId: z.string().min(1),
});

export type RoleConfig = z.infer<typeof RoleConfigSchema>;

// Defaults chosen by Human on 2026-10-01 (plan, slice 2).
export const slpSettings = defineSettings({
  id: "slp",
  scope: "host",
  version: 1,
  schema: z.object({
    supervisor: RoleConfigSchema.default({ provider: "claude/claude-opus-5-5", modeId: "auto" }),
    lead: RoleConfigSchema.default({ provider: "claude/claude-sonnet-5-5", modeId: "auto" }),
  }),
});

export type SlpSettings = z.infer<typeof slpSettings.schema>;
