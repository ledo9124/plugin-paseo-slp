import { describe, expect, it } from "vitest";
import { createPaseoHost, type PaseoApi } from "./paseo-host";

function apiWith(send: (text: string, options?: unknown) => Promise<void>): PaseoApi {
  return { agents: { ref: () => ({ send }) } } as unknown as PaseoApi;
}

describe("createPaseoHost sendPrompt", () => {
  it("passes the turn behavior and the source to Paseo", async () => {
    const calls: unknown[] = [];
    const host = createPaseoHost(apiWith(async (_text, options) => void calls.push(options)));
    await host.sendPrompt("a1", "hi", { activeTurnBehavior: "steer", sourceAgentId: "lead" });
    expect(calls).toEqual([{ activeTurnBehavior: "steer", sourceAgentId: "lead" }]);
  });

  it("sends without the source when the host has no agent provenance (Paseo before 0.12)", async () => {
    const calls: unknown[] = [];
    const host = createPaseoHost(
      apiWith(async (_text, options) => {
        calls.push(options);
        if ((options as { sourceAgentId?: string }).sourceAgentId) {
          throw new Error("Update the Paseo host to send messages with agent provenance.");
        }
      }),
    );
    await host.sendPrompt("a1", "hi", { activeTurnBehavior: "steer", sourceAgentId: "lead" });
    expect(calls).toEqual([{ activeTurnBehavior: "steer", sourceAgentId: "lead" }, { activeTurnBehavior: "steer" }]);
  });

  it("rethrows any other failure", async () => {
    const host = createPaseoHost(apiWith(async () => Promise.reject(new Error("agent not found"))));
    await expect(host.sendPrompt("a1", "hi", { sourceAgentId: "lead" })).rejects.toThrow(/not found/);
  });
});
