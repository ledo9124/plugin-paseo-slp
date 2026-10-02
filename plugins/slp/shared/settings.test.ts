import { describe, expect, it } from "vitest";
import { slpSettings } from "./settings";

describe("SLP settings defaults", () => {
  it("run every member in its provider's bypass mode", () => {
    const defaults = slpSettings.schema.parse({});
    expect(defaults.supervisor.modeId).toBe("bypassPermissions");
    expect(defaults.lead.modeId).toBe("bypassPermissions");
    expect(defaults.peers.modes).toEqual({ claude: "bypassPermissions", codex: "full-access" });
  });

  it("keeps earlier values valid and takes per-role instructions and tools (0008)", () => {
    const earlier = { supervisor: { provider: "claude/claude-sonnet-5-5", modeId: "auto" } };
    expect(slpSettings.schema.parse(earlier).supervisor).toEqual(earlier.supervisor);

    const tuned = slpSettings.schema.parse({
      lead: { provider: "claude/claude-sonnet-5-5", modeId: "auto", instructions: "  Lead text  ", tools: ["slp_send"] },
    });
    expect(tuned.lead).toMatchObject({ instructions: "Lead text", tools: ["slp_send"] });
    expect(() =>
      slpSettings.schema.parse({ lead: { provider: "claude/x", modeId: "auto", tools: ["slp_teleport"] } }),
    ).toThrow();
    expect(() => slpSettings.schema.parse({ lead: { provider: "claude/x", modeId: "auto", instructions: " " } })).toThrow();
  });

  it("takes an optional template catalog filter for the Supervisor and Lead", () => {
    const parsed = slpSettings.schema.parse({
      supervisor: { provider: "claude/x", modeId: "auto", templates: [] },
      lead: { provider: "claude/x", modeId: "auto", templates: ["review"] },
    });
    expect(parsed.supervisor.templates).toEqual([]);
    expect(parsed.lead.templates).toEqual(["review"]);
    expect(slpSettings.schema.parse({}).lead.templates).toBeUndefined();
  });
});
