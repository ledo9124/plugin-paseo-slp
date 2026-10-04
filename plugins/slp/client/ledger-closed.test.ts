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
  it("grows with the text between a floor and a cap", () => {
    expect(answerHeight(20)).toBe(72);
    expect(answerHeight(100.2)).toBe(117);
    expect(answerHeight(1000)).toBe(240);
  });
});
