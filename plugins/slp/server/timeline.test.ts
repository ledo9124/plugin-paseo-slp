import { describe, expect, it } from "vitest";
import { lastAssistantText, replyOfTurn } from "./timeline";

// Entries as Paseo's timeline fetch returns them: { item, turnId?, ... }.
const entry = (item: Record<string, unknown>, turnId?: string) => ({ item: item as { type: string; text?: string }, turnId });

describe("lastAssistantText", () => {
  it("joins the chunks of the last assistant message", () => {
    expect(
      lastAssistantText([
        { type: "assistant_message", text: "Earlier." },
        { type: "tool_call" },
        { type: "assistant_message", text: "Handback: " },
        { type: "assistant_message", text: "done." },
      ]),
    ).toBe("Handback: done.");
  });

  it("skips non-message items after the last message and returns null for none", () => {
    expect(lastAssistantText([{ type: "assistant_message", text: "Done." }, { type: "tool_call" }])).toBe("Done.");
    expect(lastAssistantText([{ type: "user_message", text: "hi" }])).toBeNull();
    expect(lastAssistantText([])).toBeNull();
  });
});

describe("replyOfTurn", () => {
  it("finds the final message after a long tool-heavy run in a fetched page", () => {
    const entries = [
      entry({ type: "user_message", text: "A1: build it" }, "t1"),
      entry({ type: "assistant_message", text: "Starting." }, "t1"),
      ...Array.from({ length: 30 }, (_, i) => entry({ type: "tool_call", callId: `c${i}` }, "t1")),
      entry({ type: "assistant_message", text: "Handback: all tests pass." }, "t1"),
    ];
    expect(replyOfTurn(entries, "t1")).toBe("Handback: all tests pass.");
  });

  it("does not return an earlier turn's message when the ended turn said nothing", () => {
    const entries = [
      entry({ type: "assistant_message", text: "Old turn reply." }, "t1"),
      entry({ type: "tool_call", callId: "c1" }, "t2"),
    ];
    expect(replyOfTurn(entries, "t2")).toBeNull();
  });

  it("uses the whole page when the turn id is unknown or the entries carry none", () => {
    const entries = [entry({ type: "assistant_message", text: "Reply." })];
    expect(replyOfTurn(entries, null)).toBe("Reply.");
    expect(replyOfTurn(entries, "t9")).toBe("Reply.");
  });
});
