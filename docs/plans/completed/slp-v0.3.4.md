# Execution Plan: SLP v0.3.4, One-Step SLP Workspace And UI Follow-Ups

Date: 2026-10-04

## Status

Completed

## Outcome

- Human can start an SLP workspace in one step from anywhere (Human D1,
  option B of the Lead's report: a global entry that creates a workspace,
  turns SLP on, and opens the panel).
- Every open follow-up from `docs/plans/completed/slp-ui-ux.md` is fixed,
  except D5-B (Human D3): the long Peer model list; a multiline answer field
  (4b) and the panel in the Explorer (11); live member status (5b); a
  waiting count on the header button (12); activity and closed-item collapse
  (13); refresh on agent events (14); the three settings edge cases
  (external change drops unsaved edits; invalid stored settings show
  "Loading settings..." forever; a null report shows "Loading the report..."
  forever).

## Context

Human's decisions D1-D3 (2026-10-04, through the Supervisor):
- D1: one-step SLP workspace from anywhere (option B).
- D2: after typecheck, tests, and a live check on 6767 with the settings
  backed up and restored: merge into main, tag v0.3.4, push main and the
  tag, update 6767 keeping its settings. Do not push the feature branch.
- D3: fix every open follow-up except D5-B.
- UX choices are not delegated this time. Choices that materially change
  what Human sees or product policy (the project picker, anything near
  auto-on) go back to Human with options.

Finding behind D1 (Lead's read-only report, 2026-10-04): Paseo's New
workspace screen (`packages/app/src/screens/new-workspace-screen.tsx`,
v0.10.2, unchanged in v0.10.3) runs before a workspace exists, and the
plugin SDK has no contribution point there. Header buttons and workspace
command-center items need a workspace; the composer there gets no
`workspaceId`. Global command-center items, sidebar surfaces, and
`paseo.workspaces.create` work without one.

Code: `plugins/slp/index.client.tsx`, `plugins/slp/client/`,
`plugins/slp/shared/contracts.ts`, `plugins/slp/index.server.ts`. SDK:
`@getpaseo/plugin` 0.10.2 (source `paseo-upstream/packages/plugin`); 6767
runs Paseo 0.10.3.

## Scope

In scope: client entry points and panels, settings screen, the RPCs they
need. Out of scope: role texts, ledger data model (D5-B), auto-on policy.

## Approach

1. Parallel: B1 design the one-step entry (read-only, options for Human's
   picker choice); B2 settings (model list, edge cases); B3 panel content
   (4b, 11, 13); B4 panel data (5b, 12, 14, null report).
2. Human picks the entry design; implement it.
3. Review by a Peer that did not write the work.
4. `npm run typecheck`, `npm test`, live check on 6767 (D2).
5. Merge, tag v0.3.4, push main and tag, update 6767 (D2).

## Risks And Recovery

- The live test changes 6767's plugin source. Back up
  `~/.paseo/plugin-settings/slp` first, restore after, compare hashes.
- Rollback after release: `plugin update slp --ref v0.3.3` (or remove and
  install the tag), keeping the settings.

## Progress

- [x] B1 one-step entry design (A1, accepted): create, set mode on, open
  panel via the public SDK; `openPanel` may race the app's store (retry, then
  navigate); Human chose P2 (D6)
- [x] B2 settings (A2, accepted): Peer models grouped by provider with a
  summary; per-section three-way draft merge with a "Changed elsewhere"
  notice; invalid settings show the error, Check again, two-press Reset
- [x] B3 panel content (A3, accepted): multiline answer field; panel
  locations workspace and explorer (workspace stays default); closed
  assignments and decisions behind "Show N closed" toggles ("activity" read
  as those lists)
- [x] B4 panel data (A4, accepted): live member status via `useAgent`;
  waiting count on the header ("SLP on · 2"); refresh on workspace/agent
  events, polls 10 s panel / 30 s header; "No report yet"
- [x] Entry implementation (A5, accepted after one rework): surface "New
  SLP workspace" from a sidebar item and a global command-center item;
  project preselected by latest `activityAt`; Local default, Worktree for git
  projects; create, turn on, open the panel (3 s retry, then open the
  workspace); mode or open failures shown as a toast
- [x] Review (A6, fresh Peer): one bug, the answer field's height ratcheted
  to 240 px on react-native-web; minor: header refresh churn, stale count
  after a mode change, the editor hidden on a refetch error. Fixed by their
  owners: A7 (height from text and width), A8 (one refresh per burst, skip
  unchanged buttons, count 0 after a mode change), A9 (notice, Save off
  while the read fails). Typecheck clean, `npm test` 125/125
- [x] Checks and live test: `npm run typecheck` clean, `npm test` 129/129;
  a clean copy compiles with Paseo's compiler (client 119388 bytes, server
  121643 bytes); scratch workspaces archived
  - Live check 1, 2026-10-04, 6767 running this checkout (directory
    install; settings backed up to `%TEMP%/slp-settings-backup-v034`, hash
    `60cbcbc5...`), web app at app.paseo.sh paired to 6767 with
    `daemon pair` (direct connection from the browser failed with code 1006),
    driven by agent-browser; scratch git project `%TEMP%/slp-v034-scratch`:
    - sidebar "New SLP workspace" opens the screen; Local create with a
      double-click lands in the new workspace in about 4 s with SLP on, the
      panel open, Supervisor and Lead started; only one workspace created
      (`wks_7ad6f97cb3cfd2cf`);
    - Worktree create lands in about 3 s with SLP on (`wks_4f11cfd18f1535cf`);
    - the global command item "SLP: new SLP workspace" shows on host routes
      and opens the screen; on `/open-project` (no host in the route) Paseo
      shows no plugin commands at all (upstream `registration.tsx`);
    - first pass FAILED: no project preselected; `activityAt` is null on
      every workspace of 6767 (finding F2, decision D7, fix A10). After A10
      and a reload, the screen preselects plugin-paseo-slp, the project of
      the workspace with the latest `statusEnteredAt` (12:55:07Z);
    - a pending decision raised by the scratch Supervisor shows "Needs you
      (1)" and the header "SLP on · 1"; answering with two lines from the
      panel stores "Blue.
Second line of the answer." and the count clears
      within 3 s;
    - answer field 72 px empty, 138 px at six lines, back to 72 px;
    - "Show/Hide 1 closed decision" toggles;
    - the SLP tab dragged into the Explorer renders at about 320 px;
    - member status reads "working" during a turn and "idle" after;
    - settings: Peers tab shows "3 of 17 on: Opus 5.5, Fable 5.1, Sonnet
      5.5" and "1 of 7 on: GPT-6-Luna"; Show models lists 17 switches;
      nothing saved (hash unchanged);
    - not seen live: "No report yet" (the Process section shows only with a
      group), the toast for a mode or open failure (not forced), the
      settings read-error notice and "Changed elsewhere" (not forced)
- [ ] Merge, tag, push, 6767 update

## Decisions

- 2026-10-04 (Human D4): option B alone; no upstream Paseo request.
- 2026-10-04 (Human D6): the entry is P2, a small "New SLP workspace"
  screen from a sidebar item and a command-center item; the most recently
  active workspace's project preselected; default Local, Worktree offered
  for git projects; no extra fields.
- 2026-10-04 (Lead, finding F2, D7): "most recently active" uses
  `activityAt`, else `statusEnteredAt`; Paseo 0.10.3 leaves `activityAt`
  null on every workspace of 6767.
- 2026-10-04 (Lead, finding F1): `npm test` also runs `client/**/*.test.ts`;
  client tests stay pure (node environment).

## Validation

- Focused proof: vitest for pure helpers that change.
- Integration or end-to-end proof: the live check in the app on 6767.
- Repository-required checks: `npm run typecheck`, `npm test`.

## Result

v0.3.4 released on 2026-10-04 (Human's D2).
- One-step SLP workspace: a "New SLP workspace" screen from the sidebar and
  the command center creates a workspace (Local or Worktree), turns SLP on,
  and opens the panel there. Proved live. The command-center item shows only
  on host routes, a Paseo limit.
- Follow-ups: grouped Peer models, settings edge cases, multiline answers,
  the panel in the Explorer, collapse, live member status, the waiting count,
  refresh on events. Proved live except the forced-failure paths and "No
  report yet", which are unit-tested only.
- `docs/plans/completed/slp-ui-ux.md` corrected: its new-workspace claim
  covered an existing workspace, not Paseo's New workspace screen.

Follow-ups, none started: D5 option B; `onEvent` progress for slow worktree
creates; a searchable project select if the list grows long; a possible
command id collision when SLP is installed on two hosts (untested).
