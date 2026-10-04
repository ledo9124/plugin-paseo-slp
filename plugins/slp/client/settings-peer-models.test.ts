import { describe, expect, it } from "vitest";
import { groupPeerModels } from "./settings-peer-models";

const catalog = [
  {
    provider: "claude",
    label: "Claude",
    models: [
      { id: "opus", label: "Opus" },
      { id: "sonnet", label: "Sonnet" },
      { id: "haiku", label: "Haiku" },
    ],
  },
  { provider: "codex", label: "Codex", models: [{ id: "luna", label: "Luna" }] },
  { provider: "empty", models: [] },
];

describe("groupPeerModels", () => {
  it("groups by provider in catalog order and counts what is on", () => {
    const groups = groupPeerModels(catalog, ["claude/sonnet", "claude/haiku", "codex/luna"]);
    expect(groups.map((g) => [g.provider, g.label, g.enabled, g.models.length])).toEqual([
      ["claude", "Claude", 2, 3],
      ["codex", "Codex", 1, 1],
      ["empty", "empty", 0, 0],
    ]);
    expect(groups[0].summary).toBe("2 of 3 on: Sonnet, Haiku");
    expect(groups[2].summary).toBe("0 of 0 on");
  });

  it("keeps row order fixed whatever is on", () => {
    const rows = groupPeerModels(catalog, ["claude/haiku"])[0].models;
    expect(rows.map((r) => [r.label, r.on])).toEqual([
      ["Opus", false],
      ["Sonnet", false],
      ["Haiku", true],
    ]);
  });

  it("lists a stored model the daemon no longer has, on its provider", () => {
    const groups = groupPeerModels(catalog, ["claude/old-one", "claude/sonnet"]);
    expect(groups[0].models.at(-1)).toEqual({ value: "claude/old-one", label: "old-one (not listed)", on: true });
    expect(groups[0].summary).toBe("2 of 4 on: Sonnet, old-one (not listed)");
  });

  it("adds a group for a provider only the allowlist mentions", () => {
    const groups = groupPeerModels(catalog, ["claude/sonnet", "gone/x/y"]);
    const last = groups.at(-1)!;
    expect([last.provider, last.label, last.enabled]).toEqual(["gone", "gone", 1]);
    expect(last.models[0]).toEqual({ value: "gone/x/y", label: "x/y (not listed)", on: true });
  });
});
