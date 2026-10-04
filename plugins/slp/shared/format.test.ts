import { describe, expect, it } from "vitest";
import { waitingForHuman } from "./format";

describe("waitingForHuman", () => {
  const decisions = [{ status: "pending" }, { status: "settled" }, { status: "withdrawn" }, { status: "pending" }];

  it("counts pending decisions and unanswered native questions", () => {
    expect(waitingForHuman(decisions, [{}], true)).toBe(3);
    expect(waitingForHuman([], [], true)).toBe(0);
  });

  it("counts nothing for an ended group, which nobody can answer", () => {
    expect(waitingForHuman(decisions, [{}], false)).toBe(0);
  });
});
