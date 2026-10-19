import { describe, expect, it } from "vitest";
import { formatAutoCompact, parseAutoCompact } from "./auto-compact";

describe("auto-compact window input", () => {
  it("reads tokens with or without a k or m suffix, and empty as the default", () => {
    expect(parseAutoCompact("600000")).toEqual({ value: 600_000 });
    expect(parseAutoCompact(" 600k ")).toEqual({ value: 600_000 });
    expect(parseAutoCompact("1M")).toEqual({ value: 1_000_000 });
    expect(parseAutoCompact("0.5m")).toEqual({ value: 500_000 });
    expect(parseAutoCompact("600,000")).toEqual({ value: 600_000 });
    expect(parseAutoCompact("")).toEqual({ value: null });
  });

  it("refuses text outside Claude Code's 100k-1M range or not a token count", () => {
    for (const text of ["99k", "2m", "abc", "600kk", "-600k", "100.5"]) {
      expect(parseAutoCompact(text), text).toHaveProperty("error");
    }
  });

  it("shows a stored window in its short form", () => {
    expect(formatAutoCompact(600_000)).toBe("600k");
    expect(formatAutoCompact(1_000_000)).toBe("1m");
    expect(formatAutoCompact(123_456)).toBe("123456");
    expect(formatAutoCompact(undefined)).toBe("");
  });
});
