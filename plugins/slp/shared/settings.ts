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
    // Human's slice 3 choices (2026-10-01): an allowlist, a cap, a mode per provider.
    peers: z
      .object({
        /** `provider/model` values the Lead may pick; the first is the default. */
        models: z.array(z.string().regex(/^[^/\s]+\/\S+$/, "use provider/model")).min(1),
        maxActive: z.number().int().min(1).max(16),
        /** Mode id per provider id, for example claude: auto. */
        modes: z.record(z.string(), z.string().min(1)),
      })
      .default({
        models: ["claude/claude-sonnet-5-5", "claude/claude-haiku-4-5", "codex/gpt-6-luna"],
        maxActive: 4,
        modes: { claude: "auto", codex: "full-access" },
      }),
  }),
});

export type SlpSettings = z.infer<typeof slpSettings.schema>;
