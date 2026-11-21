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

describe("createPaseoHost lastReply", () => {
  const page = (entries: unknown[]) => ({ entries });
  const apiWithTimeline = (refetch: (options: unknown) => Promise<unknown>) =>
    ({ agents: { ref: () => ({ timeline: { refetch } }) } }) as unknown as PaseoApi;

  it("reads the final assistant message from the tail of the agent's timeline when the event carries none (Paseo 0.13+)", async () => {
    const asked: unknown[] = [];
    const host = createPaseoHost(
      apiWithTimeline(async (options) => {
        asked.push(options);
        return page([
          { item: { type: "tool_call", callId: "c1" }, turnId: "t1" },
          { item: { type: "assistant_message", text: "Handback: done." }, turnId: "t1" },
        ]);
      }),
    );
    expect(await host.lastReply("a1", "t1")).toBe("Handback: done.");
    expect(asked).toEqual([{ direction: "tail", limit: 20, projection: "projected" }]);
  });

  it("answers null when the timeline has no assistant message", async () => {
    const host = createPaseoHost(apiWithTimeline(async () => page([{ item: { type: "tool_call" } }])));
    expect(await host.lastReply("a1", null)).toBeNull();
  });
});
