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

export const ANSWER_FONT_SIZE = 14;
export const ANSWER_LINE_HEIGHT = 20;
/** Used until the field reports its width. */
export const ANSWER_DEFAULT_WIDTH = 280;
const ANSWER_MIN_HEIGHT = 72;
const ANSWER_MAX_HEIGHT = 240;
// Field padding (8 each side) plus border (1 each side).
const ANSWER_CHROME_X = 18;
const ANSWER_CHROME_Y = 18;
// A proportional font at 14px averages under 7.5px a character, so this
// errs toward one line too many, never too few.
const ANSWER_CHAR_WIDTH = 7.5;

/**
 * The answer field is sized from its text and width, never from a measurement
 * of its own box: react-native-web reports a textarea's scrollHeight, which
 * never falls below the height already set, so a measured size only grows. It
 * grows with the text between a few lines and a cap, and shrinks when text goes.
 */
export function answerHeight(text: string, fieldWidth: number): number {
  const perLine = Math.max(8, Math.floor((fieldWidth - ANSWER_CHROME_X) / ANSWER_CHAR_WIDTH));
  const lines = text.split("\n").reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / perLine)), 0);
  return Math.min(ANSWER_MAX_HEIGHT, Math.max(ANSWER_MIN_HEIGHT, lines * ANSWER_LINE_HEIGHT + ANSWER_CHROME_Y));
}
