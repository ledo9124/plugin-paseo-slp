import { describe, expect, it, vi } from "vitest";
import {
  OPEN_RETRY,
  buildCreateRequest,
  createSlpWorkspace,
  effectiveIsolation,
  flowNotice,
  newIdempotencyKey,
  preselectProject,
  retry,
  type CreateRequest,
  type FlowDeps,
  type ProjectChoice,
} from "./new-workspace";

const git: ProjectChoice = { projectId: "p-git", projectDisplayName: "App", projectRootPath: "/code/app", projectKind: "git" };
const plain: ProjectChoice = { projectId: "p-dir", projectDisplayName: "Notes", projectRootPath: "/code/notes", projectKind: "directory" };
const request: CreateRequest = buildCreateRequest(git, "local", "key-1");
const noSleep = () => Promise.resolve();

describe("preselectProject", () => {
  it("picks the project of the workspace with the latest activity", () => {
    const workspaces = [
      { projectId: "p-git", activityAt: "2026-10-04T10:00:00Z" },
      { projectId: "p-dir", activityAt: "2026-10-04T11:00:00Z" },
      { projectId: "p-git", activityAt: "2026-10-03T09:00:00Z" },
    ];
    expect(preselectProject([git, plain], workspaces)).toBe("p-dir");
  });

  it("ignores archiving workspaces, unknown projects, and missing or bad times", () => {
    const workspaces = [
      { projectId: "p-git", activityAt: "2026-10-04T12:00:00Z", archivingAt: "2026-10-04T12:01:00Z" },
      { projectId: "gone", activityAt: "2026-10-04T13:00:00Z" },
      { projectId: "p-git", activityAt: null },
      { projectId: "p-git", activityAt: "not a time" },
      { projectId: "p-dir", activityAt: "2026-10-01T00:00:00Z" },
    ];
    expect(preselectProject([git, plain], workspaces)).toBe("p-dir");
  });

  it("requires a choice when nothing shows activity and there are several projects", () => {
    expect(preselectProject([git, plain], [{ projectId: "p-git", activityAt: null }])).toBeNull();
    expect(preselectProject([], [])).toBeNull();
  });

  it("takes the only project when there is nothing to choose", () => {
    expect(preselectProject([plain], [])).toBe("p-dir");
  });
});

describe("buildCreateRequest", () => {
  it("backs a Local workspace with the project's folder and id", () => {
    expect(buildCreateRequest(git, "local", "k")).toEqual({
      idempotencyKey: "k",
      source: { kind: "directory", path: "/code/app", projectId: "p-git" },
    });
  });

  it("cuts a Worktree from the project's repository and lets the daemon name it", () => {
    expect(buildCreateRequest(git, "worktree", "k")).toEqual({
      idempotencyKey: "k",
      source: { kind: "worktree", cwd: "/code/app", projectId: "p-git" },
    });
  });

  it("falls back to Local for a project that is not a git repository", () => {
    expect(effectiveIsolation(plain, "worktree")).toBe("local");
    expect(buildCreateRequest(plain, "worktree", "k").source.kind).toBe("directory");
  });
});

describe("newIdempotencyKey", () => {
  it("is different on every call", () => {
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey());
  });

  it("is built from the clock and the random source", () => {
    expect(newIdempotencyKey(() => 0.5, () => 36)).toBe("slp-new-workspace-10-i");
  });
});

describe("retry", () => {
  it("returns at once when the first attempt works", async () => {
    const sleep = vi.fn(noSleep);
    expect(await retry(() => undefined, { intervalMs: 10, attempts: 3 }, sleep)).toEqual({ ok: true });
    expect(sleep).not.toHaveBeenCalled();
  });

  it("tries again until an attempt works", async () => {
    let calls = 0;
    const sleep = vi.fn(noSleep);
    const result = await retry(() => {
      if (++calls < 3) throw new Error("not yet");
    }, { intervalMs: 10, attempts: 5 }, sleep);
    expect(result).toEqual({ ok: true });
    expect(calls).toBe(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(10);
  });

  it("gives up with the last error after the attempts are spent", async () => {
    let calls = 0;
    const result = await retry(() => {
      throw new Error(`failure ${++calls}`);
    }, { intervalMs: 10, attempts: 4 }, noSleep);
    expect(result).toEqual({ ok: false, error: "failure 4" });
  });

  it("waits about three seconds in total before the flow gives up", () => {
    expect(OPEN_RETRY.intervalMs * (OPEN_RETRY.attempts - 1)).toBeGreaterThanOrEqual(2500);
    expect(OPEN_RETRY.intervalMs * (OPEN_RETRY.attempts - 1)).toBeLessThanOrEqual(3500);
  });
});

function deps(overrides: Partial<FlowDeps> = {}): FlowDeps & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    create: async () => {
      calls.push("create");
      return { id: "wks_1" };
    },
    turnOn: async (id) => {
      calls.push(`turnOn ${id}`);
    },
    openPanel: (id) => {
      calls.push(`openPanel ${id}`);
    },
    openWorkspace: (id) => {
      calls.push(`openWorkspace ${id}`);
    },
    sleep: noSleep,
    ...overrides,
  };
}

describe("createSlpWorkspace", () => {
  it("creates, turns SLP on, then opens the panel, in that order", async () => {
    const d = deps();
    const result = await createSlpWorkspace(request, d);
    expect(result).toEqual({ workspaceId: "wks_1", modeError: null, openError: null });
    expect(d.calls).toEqual(["create", "turnOn wks_1", "openPanel wks_1"]);
  });

  it("passes the request to create and reports each step", async () => {
    const create = vi.fn(async () => ({ id: "wks_1" }));
    const steps: string[] = [];
    await createSlpWorkspace(request, deps({ create, onStep: (s) => steps.push(s) }));
    expect(create).toHaveBeenCalledWith(request);
    expect(steps).toEqual(["creating", "turning-on", "opening"]);
  });

  it("rejects when the workspace cannot be created, and goes no further", async () => {
    const d = deps({
      create: async () => {
        throw new Error("directory not found");
      },
    });
    await expect(createSlpWorkspace(request, d)).rejects.toThrow("directory not found");
    expect(d.calls).toEqual([]);
  });

  it("still opens the panel when SLP cannot be turned on, and reports why", async () => {
    const d = deps({
      turnOn: async () => {
        throw new Error("SLP is still starting");
      },
    });
    const result = await createSlpWorkspace(request, d);
    expect(result).toEqual({ workspaceId: "wks_1", modeError: "SLP is still starting", openError: null });
    expect(d.calls).toContain("openPanel wks_1");
  });

  it("retries the panel while the app does not know the workspace yet", async () => {
    let opens = 0;
    const d = deps({
      openPanel: () => {
        if (++opens < 4) throw new Error("Plugin panel context is unavailable");
      },
    });
    const result = await createSlpWorkspace(request, d);
    expect(result.openError).toBeNull();
    expect(opens).toBe(4);
    expect(d.calls).not.toContain("openWorkspace wks_1");
  });

  it("falls back to opening the workspace when the panel never opens", async () => {
    const d = deps({
      openPanel: () => {
        throw new Error("Plugin panel context is unavailable");
      },
    });
    const result = await createSlpWorkspace(request, d);
    expect(d.calls).toContain("openWorkspace wks_1");
    expect(result.workspaceId).toBe("wks_1");
    expect(result.openError).toContain("Plugin panel context is unavailable");
    expect(result.openError).toContain("The workspace is open");
  });

  it("points to the sidebar when there is no fallback either", async () => {
    const result = await createSlpWorkspace(
      request,
      deps({
        openPanel: () => {
          throw new Error("nope");
        },
        openWorkspace: undefined,
      }),
    );
    expect(result.openError).toContain("Open it from the sidebar.");
  });
});

describe("flowNotice", () => {
  it("says nothing when the flow went well", () => {
    expect(flowNotice({ workspaceId: "w", modeError: null, openError: null })).toBeNull();
  });

  it("tells Human the workspace exists and where to turn SLP on", () => {
    expect(flowNotice({ workspaceId: "w", modeError: "SLP is still starting", openError: null })).toBe(
      "The workspace was created, but SLP could not be turned on: SLP is still starting. Turn it on from the SLP panel.",
    );
  });

  it("reports a panel that did not open, alone or after the mode error", () => {
    expect(flowNotice({ workspaceId: "w", modeError: null, openError: "Could not open." })).toBe("Could not open.");
    const both = flowNotice({ workspaceId: "w", modeError: "boom", openError: "Could not open." });
    expect(both).toContain("boom");
    expect(both?.endsWith("Could not open.")).toBe(true);
  });
});
