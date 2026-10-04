import { describe, expect, it, vi } from "vitest";
import type { PluginClientContext } from "@getpaseo/plugin/client";
import { HeaderButtons } from "./header-buttons";

function setup() {
  const update = vi.fn();
  const client = {
    addHeaderButton: vi.fn(() => ({ update, remove: vi.fn() })),
    openPanel: vi.fn(),
  } as unknown as PluginClientContext;
  const buttons = new HeaderButtons(client, "slp");
  buttons.ensure("ws");
  return { buttons, update };
}

describe("HeaderButtons.setMode", () => {
  it("updates the button only when mode, lock, or waiting count changed", () => {
    const { buttons, update } = setup();
    buttons.setMode("ws", { mode: "on", locked: false, waiting: 2 });
    buttons.setMode("ws", { mode: "on", locked: false, waiting: 2 });
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0].label).toBe("SLP on · 2");

    buttons.setMode("ws", { mode: "on", locked: false, waiting: 0 });
    expect(update).toHaveBeenCalledTimes(2);
    expect(update.mock.calls[1][0].label).toBe("SLP on");
  });
});
