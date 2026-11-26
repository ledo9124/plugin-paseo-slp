# Execution Plan: Dual-Lane Text From Its Own Dual-Lane Review (D216, D221, D223)

Date: 2026-11-26

## Status

Active. Every approved item is implemented on branch `d216-dual-lane-v2`.
The review, merge, release, and plugin update are not done.

## Outcome

Later sessions get the dual-lane text with Human's approved items 1, 3, 4,
5, 6 and 7(b) (SLP ledger D221, D223), through a one-time migration of an
unmodified stored copy, and the Lead's role text allows the model choice
dual-lane asks for. See decision 0014.

## Context

- Decision 0014 (this change), 0012 (the v0.4.0 text and its migration),
  0011 (D16's clauses and the first migration), 0009 item 4 (the Peer
  model rule, amended).
- Evidence outside the repository with the SLP run: the D216 decision
  packet and the arbiter and shadow verdicts.
- Assignment A158 from the SLP Lead.

## Scope

In scope:

- `plugins/slp/shared/default-templates.ts`: the new text and
  `LEGACY_DUAL_LANE_V040`.
- `plugins/slp/server/template-store.ts`: the migration; its tests and the
  template pins.
- `plugins/slp/shared/roles.ts`: the Lead's Peer-model rule, and its test.
- Decision 0014, the decisions index, and the README and product roles
  lines that quoted the old rule.

Out of scope:

- Item 2 (the model on each assignment record; not approved):
  `coordination.ts`, the ledger.
- `settings.ts` (the shipped Peer models).
- `server/tools.ts` (the `slp_delegate` model description; finding F98).
- Merge, push, tags, plugin install or update.

## Approach

1. The template text and the legacy constant, with the pins.
2. The migration and its tests.
3. Decision 0014, the index, this plan.
4. Item 1 (D223): the template's models, the role text, the docs, 0014.

## Risks And Recovery

- An edited installed copy keeps the old text (as in 0011 and 0012).
- A Lead whose instructions Human replaced in Settings keeps its own text
  and does not get the role-text change.
- Rollback: the previous release and `templates.json.bak-v0.4.0`.

## Progress

- [x] Template text and `LEGACY_DUAL_LANE_V040` (pinned: 8,943 and 6,809
  bytes).
- [x] Migration of a v0.3.7 or v0.4.0 dual-lane; tests for replaced,
  edited, removed.
- [x] Decision 0014 and the index.
- [x] Item 1 (D223): template models, `roles.ts`, docs, 0014.
- [ ] Review, merge, release, plugin update (each needs its own approval,
  D217).

## Decisions

- 2026-11-26: the legacy constant is named for v0.4.0, the first tag that
  contains the replaced text (089d7a2); the backup is
  `templates.json.bak-v0.4.0`.
- 2026-11-26: item 1 landed before any release, so only the pin changed;
  the migration still matches v0.3.7 and v0.4.0 only.

## Validation

- Focused proof: `npx vitest run server/template-store.test.ts
  shared/templates.test.ts shared/roles.test.ts` in `plugins/slp`; the new
  replacement test fails against the previous `template-store.ts`.
- Repository-required checks: `npm test` at the root; `tsc --noEmit` in
  `plugins/slp`.

## Result

Pending the review and the release.
