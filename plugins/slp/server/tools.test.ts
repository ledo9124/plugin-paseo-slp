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

  it("slp_decide leaves a Peer a template keeps blind out of notify (D216 review, lens B 1 and C2)", () => {
    const tools = memberTools({} as Coordination, () => ({}) as PaseoHost);
    const decide = tools.find((tool) => tool.name === "slp_decide");
    expect(decide?.description).toContain("except a Peer a template keeps blind (dual-lane's other lane)");
  });

  it("slp_delegate names when a model may be named, and cites no per-group decision id (0014; C1)", () => {
    const tools = memberTools({} as Coordination, () => ({}) as PaseoHost);
    const delegate = tools.find((tool) => tool.name === "slp_delegate");
    const model = (delegate?.inputSchema.properties as Record<string, { description?: string }>).model.description;
    expect(model).toBe(
      "Omit: the default model. Name another only when Human, a template Human named, or a template you use (dual-lane) asks for it.",
    );
    for (const tool of tools) expect(JSON.stringify([tool.description, tool.inputSchema]), tool.name).not.toMatch(/\bD\d+\b/);
  });

  it("slp_send keeps steer for work that would otherwise be wasted (Human, D6-D7)", () => {
    const tools = memberTools({} as Coordination, () => ({}) as PaseoHost);
    const send = tools.find((tool) => tool.name === "slp_send");
    expect(send?.description).toContain(
      `"steer" joins its running turn now: only when the recipient's current work would otherwise be wasted; keep it short and send the rest after-turn.`,
    );
  });
});
