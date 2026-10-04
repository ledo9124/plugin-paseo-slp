import { describe, expect, it } from "vitest";
import type { Assignment } from "../shared/contracts";
import { answerHeight, closedToggleLabel, splitAssignments } from "./ledger-closed";

const at = (id: string, status: Assignment["status"]) => ({ id, status }) as Assignment;

describe("splitAssignments", () => {
  it("keeps in-progress and handed-back assignments open, in order", () => {
    const { open, finished } = splitAssignments([
      at("A1", "accepted"),
      at("A2", "assigned"),
      at("A3", "dropped"),
      at("A4", "handed-back"),
    ]);
    expect(open.map((a) => a.id)).toEqual(["A2", "A4"]);
    expect(finished.map((a) => a.id)).toEqual(["A1", "A3"]);
  });
});

describe("closedToggleLabel", () => {
  it("says what pressing does", () => {
    expect(closedToggleLabel(3, "decisions", false)).toBe("Show 3 closed decisions");
    expect(closedToggleLabel(3, "decisions", true)).toBe("Hide 3 closed decisions");
  });
});

describe("answerHeight", () => {
  it("starts at the floor for an empty or short answer", () => {
    expect(answerHeight("", 300)).toBe(72);
    expect(answerHeight("Yes", 300)).toBe(72);
  });

  it("grows with lines and with wrapping, and shrinks back when text goes", () => {
    const long = "word ".repeat(60);
    const tall = answerHeight(long, 280);
    expect(tall).toBeGreaterThan(answerHeight("short", 280));
    expect(answerHeight("a\nb\nc\nd\ne", 300)).toBe(118);
    expect(answerHeight(long.slice(0, 20), 280)).toBe(72);
  });

  it("wraps sooner in a narrow field", () => {
    const text = "x".repeat(100);
    expect(answerHeight(text, 200)).toBeGreaterThan(answerHeight(text, 600));
  });

  it("caps at 240", () => {
    expect(answerHeight("line\n".repeat(50), 300)).toBe(240);
  });
});
