import { afterEach, describe, expect, it, vi } from "vitest";
import { announceSlpActivity, onSlpActivity, stopSlpActivity, touches } from "./live-updates";

describe("touches", () => {
  it("matches the workspace or an update of unknown workspace", () => {
    expect(touches(["a", "b"], "b")).toBe(true);
    expect(touches(["a"], "b")).toBe(false);
    expect(touches(["a", null], "b")).toBe(true);
    expect(touches([], "b")).toBe(false);
  });
});

describe("announceSlpActivity", () => {
  afterEach(() => {
    stopSlpActivity();
    vi.useRealTimers();
  });

  it("calls each listener once per burst, with every workspace in it", () => {
    vi.useFakeTimers();
    const listener = vi.fn();
    const off = onSlpActivity(listener);
    announceSlpActivity("a");
    announceSlpActivity("b");
    announceSlpActivity("a");
    vi.advanceTimersByTime(1000);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(["a", "b"]);

    announceSlpActivity("c");
    vi.advanceTimersByTime(1000);
    expect(listener).toHaveBeenCalledTimes(2);
    off();
    announceSlpActivity("d");
    vi.advanceTimersByTime(1000);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
