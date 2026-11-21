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

describe("createPaseoHost turnEntries", () => {
  type Row = { item: { type: string; text?: string }; turnId?: string; seqStart: number };
  const row = (seqStart: number, turnId: string | undefined, type = "tool_call", text?: string): Row => ({
    item: { type, ...(text ? { text } : {}) },
    turnId,
    seqStart,
  });
  const pageOf = (entries: Row[], older: boolean) => ({
    entries,
    epoch: "e1",
    hasOlder: older,
    startCursor: older ? { epoch: "e1", seq: entries[0].seqStart } : null,
  });
  const apiWithPages = (pages: Row[][]) => {
    const asked: unknown[] = [];
    const api = {
      agents: {
        ref: () => ({
          timeline: {
            refetch: async (options: unknown) => {
              asked.push(options);
              const index = asked.length - 1;
              return pageOf(pages[index], index < pages.length - 1);
            },
          },
        }),
      },
    } as unknown as PaseoApi;
    return { api, asked };
  };

  it("reads the tail of the agent's timeline in one call when the page shows the turn's start", async () => {
    const { api, asked } = apiWithPages([[row(1, "t0"), row(2, "t1", "user_message", "go"), row(3, "t1", "assistant_message", "Done.")]]);
    const entries = await createPaseoHost(api).turnEntries("a1", "t1");
    expect(asked).toEqual([{ direction: "tail", limit: 50, projection: "projected" }]);
    expect(entries.map((entry) => [entry.seq, entry.turnId, entry.epoch])).toEqual([
      [1, "t0", "e1"],
      [2, "t1", "e1"],
      [3, "t1", "e1"],
    ]);
  });

  it("pages back, oldest first, until a row of an earlier turn shows the turn's start", async () => {
    const { api, asked } = apiWithPages([
      [row(5, "t1"), row(6, "t1"), row(7, "t1", "assistant_message", "Done.")],
      [row(2, "t1"), row(3, "t1"), row(4, "t1")],
      [row(0, "t0"), row(1, undefined, "user_message", "go"), row(1.5, "t1")],
      [row(-1, "tX")],
    ]);
    const entries = await createPaseoHost(api).turnEntries("a1", "t1");
    expect(asked).toEqual([
      { direction: "tail", limit: 50, projection: "projected" },
      { direction: "before", cursor: { epoch: "e1", seq: 5 }, limit: 50, projection: "projected" },
      { direction: "before", cursor: { epoch: "e1", seq: 2 }, limit: 50, projection: "projected" },
    ]);
    expect(entries.map((entry) => entry.seq)).toEqual([0, 1, 1.5, 2, 3, 4, 5, 6, 7]);
  });

  it("stops at the start of the timeline, at a cap of pages, and when the turn has no rows", async () => {
    const start = apiWithPages([[row(3, "t1")], [row(1, "t1"), row(2, "t1")]]);
    await createPaseoHost(start.api).turnEntries("a1", "t1");
    expect(start.asked).toHaveLength(2);

    const endless = apiWithPages(Array.from({ length: 30 }, (_, i) => [row(100 - i, "t1")]));
    expect((await createPaseoHost(endless.api).turnEntries("a1", "t1")).length).toBe(10);
    expect(endless.asked).toHaveLength(10);

    const empty = apiWithPages([[row(9, "t7")], [row(8, "t7")]]);
    await createPaseoHost(empty.api).turnEntries("a1", "t1");
    expect(empty.asked).toHaveLength(1);
  });

  it("reads one page when the event names no turn", async () => {
    const { api, asked } = apiWithPages([[row(3, "t1")], [row(2, "t1")]]);
    await createPaseoHost(api).turnEntries("a1", null);
    expect(asked).toHaveLength(1);
  });
});
