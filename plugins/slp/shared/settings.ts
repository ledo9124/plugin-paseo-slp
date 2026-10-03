import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";
import type { Role } from "./contracts";

/** The plugin's member tools (decision 0008). */
export const SLP_TOOLS = [
  "slp_group",
  "slp_ledger",
  "slp_send",
  "slp_finding",
  "slp_delegate",
  "slp_accept",
  "slp_decide",
  "slp_revise_decision",
  "slp_template",
] as const;
export type SlpTool = (typeof SLP_TOOLS)[number];

/** Default SLP tools per role (decision 0008, plan slice 2). */
export const DEFAULT_ROLE_TOOLS: Record<Role, readonly SlpTool[]> = {
  supervisor: ["slp_group", "slp_ledger", "slp_send", "slp_finding", "slp_decide", "slp_revise_decision"],
  lead: SLP_TOOLS,
  peer: ["slp_ledger", "slp_send", "slp_finding"],
};

// Human's per-role overrides (decision 0008). Absent means the default, so
// "reset to default" removes the field and earlier settings stay valid.
const RoleOverrides = {
  /** Replaces the role's whole default instruction text. */
  instructions: z.string().trim().min(1).optional(),
  /** The SLP tools the role is offered; a call to any other is refused. */
  tools: z.array(z.enum(SLP_TOOLS)).optional(),
};

/**
 * Template names in the role's catalog (0008, plan slice 5). Absent means
 * every stored template; an empty list hides the catalog.
 */
const CatalogOverride = { templates: z.array(z.string().min(1)).optional() };

const RoleConfigSchema = z.object({
  /** `provider/model`, for example `claude/claude-opus-5-5`. */
  provider: z.string().min(3).regex(/^[^/\s]+\/\S+$/, "use provider/model"),
  /** Provider mode id; members must not depend on permission prompts. */
  modeId: z.string().min(1),
  /** Reasoning effort (Paseo thinkingOptionId); absent means the provider default (0009). */
  thinkingOptionId: z.string().min(1).optional(),
  ...RoleOverrides,
  ...CatalogOverride,
});

export type RoleConfig = z.infer<typeof RoleConfigSchema>;

// Models chosen by Human on 2026-10-01 (plan, slice 2). Every member defaults
// to the provider's bypass mode (Human, after slice 5); settings can change it.
export const slpSettings = defineSettings({
  id: "slp",
  scope: "host",
  version: 1,
  schema: z.object({
    supervisor: RoleConfigSchema.default({ provider: "claude/claude-opus-5-5", modeId: "bypassPermissions" }),
    lead: RoleConfigSchema.default({ provider: "claude/claude-sonnet-5-5", modeId: "bypassPermissions" }),
    // Human's slice 3 choices (2026-10-01): an allowlist, a cap, a mode per provider.
    peers: z
      .object({
        /** `provider/model` values the Lead may pick; the first is the default. */
        models: z.array(z.string().regex(/^[^/\s]+\/\S+$/, "use provider/model")).min(1),
        maxActive: z.number().int().min(1).max(16),
        /** Mode id per provider id, for example claude: bypassPermissions. */
        modes: z.record(z.string(), z.string().min(1)),
        /** Effort per provider id; absent means the provider default (0009). */
        efforts: z.record(z.string(), z.string().min(1)).optional(),
        ...RoleOverrides,
      })
      .default({
        models: ["claude/claude-sonnet-5-5", "claude/claude-haiku-4-5", "codex/gpt-6-luna"],
        maxActive: 4,
        modes: { claude: "bypassPermissions", codex: "full-access" },
      }),
  }),
});

export type SlpSettings = z.infer<typeof slpSettings.schema>;
