# Execution Plan: SLP UI/UX

Date: 2026-10-04

## Status

Active

## Outcome

- Human can turn SLP on from a new or empty workspace, without opening a
  terminal tab first.
- The SLP settings screen is split into tabs that are easy to scan (Human:
  "chia thành tab"). If tabs prove unworkable, the fallback is sections, and
  the reason is recorded under Decisions.
- Small, low-risk UX improvements from a research pass ship in the same
  batch. Larger or policy-touching ones go back to Human with options.

## Context

Human's goal and decisions D1-D4 (2026-10-04, through the Supervisor):
- D1: change code. If `npm test`, typecheck, and the live check pass, merge
  into main, tag v0.3.3, and update daemon 6767 as for v0.3.2 (keep
  settings).
- D2: research item 3, fix the small low-risk items, escalate the rest.
- D3: the group makes UX choices on its own recommendation.
- D4: live test on 6767 with backup and restore of
  `~/.paseo/plugin-settings/slp`; pause at $30.

Code: `plugins/slp/index.client.tsx`, `plugins/slp/client/`. SDK:
`@getpaseo/plugin` 0.10.2 (source: `paseo-upstream/packages/plugin`).

## Scope

In scope: client entry points, the settings screen layout, the SLP panel
layout and wording. Out of scope: server behavior, role texts, and product
policy.

## Approach

1. Parallel: entry point from an empty workspace (A1), settings split into tabs (A2),
   read-only UX audit (A3).
2. Fix the small items from A3; escalate the large ones.
3. Review by a Peer that did not write the work.
4. `npm run typecheck`, `npm test`, and the live check on 6767 (D4).
5. Merge, tag v0.3.3, and update 6767 (D1).

## Risks And Recovery

- A client-only change cannot corrupt the group state. If a regression shows
  up after release, the fix is `plugin update slp --ref v0.3.2`.
- The live test changes 6767's plugin source. Back up the settings first and
  restore them after the test (D4).

## Progress

- [x] A1 entry point: root cause was `workspaces.list()` without `subscribe`, so new workspaces got no header button; fixed, plus a workspace command-center item (accepted 2026-10-04, live check pending)
- [x] A2 settings split: four tabs (Supervisor, Lead, Peers, Templates) as a chip row, since the UI kit has no tab component; one shared Save with unsaved-change dots; long instructions and tool lists collapsed (accepted 2026-10-04, live check pending)
- [x] A3 UX audit: 15 ranked items (accepted 2026-10-04)
- [x] A4 small fixes: audit items 1-10 done; 11 (panel in the Explorer) skipped, because the Explorer (240-320px) is narrower than a settings input row (about 340px); paired with follow-up 4b
- Follow-ups, not in this batch (M): the Peers tab lists every model (about 25 switches) in one list; 4b multiline answer field, 5b live member status via `useAgent`, 12 waiting count on the header button, 13 activity and closed-item collapse, 14 refresh on agent events
- Escalated (D5): item 15, options and recommendation on panel decisions. Human chose A on 2026-10-04: leave it; the panel's pending decision stays one free-text field
- [x] A5 review by a fresh Peer: no serious bug. Fixed while integrating: (1) the Supervisor and Lead tabs reused one component tree, so uncontrolled inputs and collapse state carried over (keyed by role); (2) leaving Templates threw away a draft (kept mounted, hidden); (3) stale "Save below" copy; (4) a failed modes RPC dropped every existing header button (modes now best effort). Left as follow-ups: an external settings change drops unsaved edits; invalid stored settings show "Loading settings..." forever; "Loading the report..." if a report is null
- [x] Checks and live test: `npm run typecheck` clean, `npm test` 80/80
  - Live check 1, 2026-10-04, 6767 with the worktree plugin (settings backed up to `%TEMP%/slp-settings-backup-v033`, restored with the same hash `60cbcbc5...`), web app at app.paseo.sh driven by agent-browser, scratch workspace `wks_5c8a6a0981538bf8`:
    - a workspace created after the app loaded shows "SLP off" in its header with no reload; the button opens the panel in the empty workspace;
    - turning SLP on works there; the header changes to "SLP on" with the Network icon; members read "Supervisor · SLP Supervisor";
    - a pending decision shows under "Needs you (1)" above the mode card; answering it from there settles it and the section goes away;
    - cards and dividers render; the Process report opens and closes;
    - settings: four tabs render and switch; no dot after load; toggling a Peer model marks "Peers •", survives a tab switch, and clears when reverted; nothing was saved (settings file hash unchanged);
    - the command center lists "SLP: open the SLP panel (turn SLP on)" for the workspace.
  - Live check 2, after the review fixes: opening the Supervisor's instructions editor and switching to Lead shows Lead collapsed; text typed on Templates survives a switch to Lead and back; settings file hash unchanged. Scratch workspace archived.
  - Not seen live: the "Starting the Supervisor and the Lead..." hint (the group started too fast); the no-catalog fallback inputs.
- [ ] Merge, tag, 6767 update

## Decisions

- 2026-10-04 (D3): settings use a row of tab chips, since the UI kit has no tab component.
- 2026-10-04 (D3): the empty-workspace entry point is the existing header button, fixed to register for new workspaces, plus a workspace command-center item. A sidebar item would need a workspace picker; slash commands work only inside an agent.

## Validation

- Focused proof: vitest for any pure helpers that change.
- Integration or end-to-end proof: the live check in the app on 6767.
- Repository-required checks: `npm run typecheck`, `npm test`.

## Result

Pending.
