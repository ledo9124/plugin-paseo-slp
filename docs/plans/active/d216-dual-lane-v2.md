# Execution Plan: Dual-Lane Text From Its Own Dual-Lane Review (D216, D221)

Date: 2026-11-26

## Status

Active. The approved items are implemented on branch `d216-dual-lane-v2`;
item 1 is pending under D222, and review, merge, release, and plugin update
are not done.

## Outcome

Later sessions get the dual-lane text with Human's approved items 3, 4, 5, 6
and 7(b) (SLP ledger D221), through a one-time migration of an unmodified
stored copy. See decision 0014.

## Context

- Decision 0014 (this change), 0012 (the v0.4.0 text and its migration),
  0011 (D16's clauses and the first migration).
- Evidence outside the repository with the SLP run: the D216 decision
  packet and the arbiter and shadow verdicts.
- Assignment A158 from the SLP Lead.

## Scope

In scope:

- `plugins/slp/shared/default-templates.ts`: the new text and
  `LEGACY_DUAL_LANE_V040`.
- `plugins/slp/server/template-store.ts`: the migration; its tests and the
  template pins.
- Decision 0014 and the decisions index.

Out of scope:

- Item 2 (the model on each assignment record; not approved):
  `coordination.ts`, the ledger.
- Item 1 (the lane models; pending): step 2's model sentence, `roles.ts`,
  `settings.ts`.
- Merge, push, tags, plugin install or update.

## Approach

1. The template text and the legacy constant, with the pins.
2. The migration and its tests.
3. Decision 0014, the index, this plan.

## Risks And Recovery

- An edited installed copy keeps the old text (as in 0011 and 0012).
- Rollback: the previous release and `templates.json.bak-v0.4.0`.

## Progress

- [x] Template text and `LEGACY_DUAL_LANE_V040` (pinned: 8,593 and 6,809
  bytes).
- [x] Migration of a v0.3.7 or v0.4.0 dual-lane; tests for replaced,
  edited, removed.
- [x] Decision 0014 and the index.
- [ ] Item 1's wording in step 2, when Human answers D222.
- [ ] Review, merge, release, plugin update (each needs its own approval,
  D217).

## Decisions

- 2026-11-26: the legacy constant is named for v0.4.0, the first tag that
  contains the current text (089d7a2); the backup is
  `templates.json.bak-v0.4.0`.
- 2026-11-26: item 4 replaces "say so in the packet" in step 2; only that
  clause changed there, and the model names stay for item 1.

## Validation

- Focused proof: `npx vitest run server/template-store.test.ts
  shared/templates.test.ts` in `plugins/slp`; the new replacement test
  fails against the previous `template-store.ts`.
- Repository-required checks: `npm test` at the root; `tsc --noEmit` in
  `plugins/slp`.

## Result

Pending item 1 and the release.
