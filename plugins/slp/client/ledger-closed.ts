import type { Assignment } from "../shared/contracts";

// What the panel keeps in view and what it folds away (follow-up 13). Open
// items always show; closed ones sit behind a toggle so the panel stays short.

/** Assignments Human may still act on or wait for, and those that are done. */
export function splitAssignments(assignments: Assignment[]): { open: Assignment[]; finished: Assignment[] } {
  return {
    open: assignments.filter((a) => a.status === "assigned" || a.status === "handed-back"),
    finished: assignments.filter((a) => a.status === "accepted" || a.status === "dropped"),
  };
}

/** The toggle's label: how many closed items it holds and what pressing does. */
export function closedToggleLabel(count: number, noun: string, shown: boolean): string {
  return shown ? `Hide ${count} closed ${noun}` : `Show ${count} closed ${noun}`;
}

const ANSWER_MIN_HEIGHT = 72;
const ANSWER_MAX_HEIGHT = 240;

/** The answer field grows with its text, between a few lines and a cap. */
export function answerHeight(contentHeight: number): number {
  return Math.min(ANSWER_MAX_HEIGHT, Math.max(ANSWER_MIN_HEIGHT, Math.ceil(contentHeight) + 16));
}
