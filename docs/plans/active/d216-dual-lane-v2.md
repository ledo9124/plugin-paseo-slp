# Execution Plan: Dual-Lane Text From Its Own Dual-Lane Review (D216, D221-D231)

Date: 2026-11-26

## Status

Active. Every approved item and both review fix rounds are on branch
`d216-dual-lane-v2`. The merge (Human D229), the release and the plugin
update are not done.

## Outcome

Later sessions get the dual-lane text with Human's approved items 1, 3, 4,
5, 6 and 7(b) (SLP ledger D221, D223, D224) and the Review-mode wording
(D226, D227), through a one-time migration of an unmodified stored copy.
The Lead's role text, the `slp_delegate` description and the Settings hint
agree with the model choice dual-lane asks for. See decision 0014.

## Context

- Decision 0014 (this change), 0012 (the v0.4.0 text and its migration),
  0011 (D16's clauses and the first migration), 0009 item 4 (the Peer
  model rule, amended).
- Evidence outside the repository with the SLP run: the D216 decision
  packet, the arbiter and shadow verdicts, the branch review (lens A
  M1-M5, lens B 1-7), and the pre-merge review (reader, intent F1-F2,
  claims C1-C9).
- Assignments A158 (implementation), A161 (fix round) and A165 (fix
  round 2) from the SLP Lead; Lead decisions D230 and D231.

## Scope

In scope:

- `plugins/slp/shared/default-templates.ts`: the new text and
  `LEGACY_DUAL_LANE_V040`.
- `plugins/slp/server/template-store.ts`: the migration and its retry and
  fallback; its tests and the template pins.
- `plugins/slp/shared/roles.ts`: the Lead's Peer-model rule and the notify
  exception for a blind Peer, with their tests.
- `plugins/slp/server/tools.ts`: the `slp_delegate` model description
  (Lead decision D225, resolving finding F98).
- `plugins/slp/client/settings-screen.tsx`: the default-model hint only.
- Decision 0014, the decisions index, and the README and product roles
  lines that quoted the old rules.

Out of scope:

- Item 2 (the model on each assignment record; not approved):
  `coordination.ts`, `store.ts`, the ledger.
- `settings.ts` (the shipped Peer models).
- The decision mode's lanes and arbiter beyond what the review findings
  need (D226 does not apply there).
- Merge, push, tags, plugin install or update.

## Approach

1. The template text and the legacy constant, with the pins.
2. The migration and its tests.
3. Decision 0014, the index, this plan.
4. Item 1 (D223, D224): the template's models, the role text, the
   `slp_delegate` description, the docs, 0014.
5. Fix round (A161): the D227 Review-mode wording; the template and role
   text fixes; the migration hardening; the Settings hint; the docs.
6. Fix round 2 (A165): D230/D231 and the reader's clarifications in the
   template; no ledger ids in shipped text (C1); the `slp_decide` notify
   exception (C2); the fallback re-read (F1); 0014's attributions (F2, C8);
   Status pointers in 0009, 0011 and 0012 (C6).
7. Release, after the merge: bump the version in
   `plugins/slp/package.json`, the install line's `--ref` in `README.md`,
   and the README Status paragraph (C5); not before.

## Risks And Recovery

- An edited installed copy keeps the old text (as in 0011 and 0012).
- A Lead whose instructions Human replaced in Settings keeps its own text
  and does not get the role-text changes.
- A start that cannot write `templates.json` keeps the old text until the
  next start.
- Rollback: by route, as in decision 0014 (Consequences, Rollback).

## Progress

- [x] Template text and `LEGACY_DUAL_LANE_V040` (pinned: 11,291 and 6,809
  bytes).
- [x] Migration of a v0.3.7 or v0.4.0 dual-lane; tests for replaced,
  edited, removed.
- [x] Decision 0014 and the index.
- [x] Item 1 (D223, D224): template models (lanes, arbiter, 7(b) reader,
  Review lenses), `roles.ts`, `server/tools.ts` (D225), docs, 0014.
- [x] Fix round (A161): D226/D227 Review mode, lens A M1-M5, lens B 1-7.
- [x] Pre-merge review (reader, intent, claims) and fix round 2 (A165).
- [ ] Merge (Human D229: "Sửa, review, merge luôn").
- [ ] Release: version bump, README `--ref` and Status (C5); plugin
  update. Each needs its own approval (D217).

## Decisions

- 2026-11-26: the legacy constant is named for v0.4.0, the first tag that
  contains the replaced text (089d7a2); the backup is
  `templates.json.bak-v0.4.0`.
- 2026-11-26: item 1 and the fix round landed before any release, so only
  the pin changed; the migration still matches v0.3.7 and v0.4.0 only.
- 2026-11-26: the rename retry covers EPERM, EBUSY and EACCES, with five
  attempts 50 ms apart. A migration that still fails is skipped for that
  start, not fatal (review M1). If the re-read then fails too, the store
  starts on what it loaded (F1).

## Validation

- Focused proof, in `plugins/slp`:
  - `npx vitest run server/template-store.test.ts shared/templates.test.ts
    shared/roles.test.ts server/tools.test.ts`;
  - the new replacement test, the three rename tests and the re-read test
    fail against the `template-store.ts` before each fix;
  - a bundled probe on Windows, with `templates.json` held open, starts
    with the old text and migrates on the next start.
- Repository-required checks: `npm test` at the root; `tsc --noEmit` in
  `plugins/slp`.

## Result

Pending the pre-merge review and the release.
