import { describe, expect, it } from "vitest";
import { slpSettings } from "./settings";

describe("SLP settings defaults", () => {
  it("run every member in its provider's bypass mode", () => {
    const defaults = slpSettings.schema.parse({});
    expect(defaults.supervisor.modeId).toBe("bypassPermissions");
    expect(defaults.lead.modeId).toBe("bypassPermissions");
    expect(defaults.peers.modes).toEqual({ claude: "bypassPermissions", codex: "full-access" });
  });
});
