import { describe, expect, it } from "vitest";
import type { Coordination } from "./coordination";
import type { PaseoHost } from "./paseo-host";
import { memberTools } from "./tools";

describe("member tool schemas", () => {
  it("slp_decide says projectRecord is a project file path, not the basis", () => {
    const tools = memberTools({} as Coordination, () => ({}) as PaseoHost);
    const decide = tools.find((tool) => tool.name === "slp_decide");
    const properties = decide?.inputSchema.properties as Record<string, { description?: string }>;
    expect(properties.projectRecord.description).toMatch(/project file/);
    expect(properties.projectRecord.description).toMatch(/basis goes in text/);
  });

  it("slp_send keeps steer for work that would otherwise be wasted (Human, D6-D7)", () => {
    const tools = memberTools({} as Coordination, () => ({}) as PaseoHost);
    const send = tools.find((tool) => tool.name === "slp_send");
    expect(send?.description).toContain(
      `"steer" joins its running turn now: only when the recipient's current work would otherwise be wasted; keep it short and send the rest after-turn.`,
    );
  });
});
