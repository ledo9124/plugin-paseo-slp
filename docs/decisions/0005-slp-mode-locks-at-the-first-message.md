# 0005 The SLP Mode Locks At The First Message; Archiving Ends The Group

Date: 2026-10-01

## Status

Accepted by Human on 2026-10-01. Amends decision 0002: it replaces 0002's
free on/off toggle and its separate end-group action. Settles 0002's
follow-up on where the control appears.

## Context

Decision 0002 made SLP a per-workspace toggle that Human could turn on or
off at any time. Turning it off stopped new SLP work, and ending a group
was a separate Human action.

While planning slice 2, Human chose a stricter model:
- the SLP mode belongs to the workspace and is chosen before work starts;
- Human's first message in the workspace locks that choice, in both
  directions;
- archiving the workspace ends the group.

Facts this relies on, at Paseo `v0.10.2`:
- archiving a workspace archives its agents (`workspace-archive-service.ts`);
- plugins receive `agent.turn_started` and `workspace.archived`;
- the client can add a workspace panel and a workspace header button.

## Decision

1. SLP is off by default. Each workspace has an SLP mode, on or off.
2. **Before Human's first message in the workspace**, Human may switch the
   mode either way.
   - Switching on starts the group at once: a Supervisor (Human's
     counterpart) and a Lead, created with their role instructions.
   - Switching off before that first message archives the members just
     created. No work can be lost, because none has started.
3. **Human's first message in the workspace locks the mode**, on or off.
   - A locked-off workspace cannot start SLP; SLP work needs a new
     workspace.
   - A locked-on workspace cannot turn SLP off.
4. **Archiving the workspace ends the group.** Paseo archives the members,
   and the plugin marks the group ended. There is no separate end-group
   action.
5. **Control location.** The workspace gets an SLP panel with the mode
   switch, the lock state, and the group's members, plus a workspace header
   button that shows the mode and opens the panel. Slice 4 extends the same
   panel with the ledger.

Agent decisions, which Human may revisit:
- "Human's first message" is detected as the first `agent.turn_started` of
  any agent in the workspace.
  - Plugin-created members start without a prompt, so their first turn
    comes from Human.
  - When the plugin first sees a workspace in which an agent already
    exists, it treats the workspace as locked off.
- Turning SLP on is refused when `daemon.mcp.injectIntoAgents` is off.
  Human made injection a requirement for SLP on 2026-10-01.

## Alternatives Considered

1. **Free toggle with a separate end-group action** (decision 0002 as
   written). Replaced by Human: a workspace's mode should not change once
   work starts.
2. **Lock when the first agent is created.** Not chosen: Human wanted the
   lock at the first message, so a group can be set up and checked before
   work begins.
3. **An explicit end-group button.** Not chosen: archiving the workspace
   already ends the work and archives its agents.

## Consequences

Positive:

- A group never loses its coordination midway because the mode was
  switched off.
- Ending a group needs no extra plugin action or cleanup policy.
- The header button shows the mode, so Human can see whether a workspace
  runs SLP (0002).

Tradeoffs:

- To try SLP on work that has already started, Human needs a new
  workspace.
- The lock depends on a best-effort lifecycle event. If the plugin misses
  the first `agent.turn_started`, it falls back to the workspace's agent
  activity the next time it checks.

## Follow-Up

- Slice 2 implements the mode, the lock, group start, group end on
  workspace archive, the panel, and the header button.
