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
});
