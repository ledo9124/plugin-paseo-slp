# Execution Plan: Dual-Lane Replaces Council

Date: 2026-10-07

## Status

Active

## Outcome

- The only default template is `dual-lane`, as Human approved it (ledger
  D14). `council` is gone from the defaults.
- On update, a one-time migration replaces a stored `council` only if it is
  an unmodified shipped copy (the clean text, or the copy with escaped
  backticks found on 6767); an edited one stays; `templates.json` is backed
  up first.
- Two smoke uses on 6768 show each step of the template happening as written,
  with the actual cost per use. Then v0.3.7 is released and 6767 updated.

## Context

- Human, relayed by the Supervisor (ledger D12-D14, 2026-10-07):
  - D12: "phần dual lane sẽ là thay thế cho council ... bỏ hẳn council luôn
    vì nó đảm nhận việc giống nhau"; analysis and an approved template
    first.
  - D13: validation B (a two-use smoke test, about $15-25); 6767 by the
    automatic migration, `templates.json` backed up first; how far: merge,
    push, tag, update 6767.
  - D14: the revised SKILL.md approved as written, with the modes Two sides
    (default), Vet, Unframed, and the six generic axes.
- Shipping on a smoke test, not on proof that it changes outcomes, is
  Human's exception to decision 0007 item 3.4. It is recorded in decision
  0011.
- Store: `plugins/slp/server/template-store.ts` seeds defaults once, so an
  update alone would not replace a stored council.
- 6767 stores council with `\`` before backticks (2,828 characters); the
  6768 probe home stores the clean shipped text (2,822).

## Scope

In scope: `default-templates.ts`, the store migration, tests, README,
`docs/product/roles.md`, decision 0011 and the decisions index, the smoke
test on 6768, the release, and the 6767 update.

Out of scope: role texts (the catalog is data), repository-harness
(the smoke uses are read-only there; their packets are reports to Human).

## Smoke Test (Registered 2026-10-07, Before Any Run)

Two uses on 6768 with this branch, each in a scratch clone of
repository-harness, with Human's message naming the template:
- U1, expected mode Two sides: Harness A2, which file is the one canonical
  owner of the invariant protocol (`docs/patterns/encoding-invariants.md` or
  `.agents/skills/encode-invariant/SKILL.md`).
- U2, expected mode Vet: Harness A3, the candidate "rewrite the installed
  `docs/README.md` as consumer-only".

Sound means every step below is seen in the export for both uses:
1. Frame: a crux with an axis, and a mode, stated before the lanes start.
2. Two lane Peers, blind to each other, on different providers or models
   when available; the same brief except the side.
3. Each lane is asked for evidence, cost, assumptions, what would prove it
   wrong, and what it accepts from the other side.
4. Compare, then a test of the deciding disagreement when it is checkable,
   by the Lead or a fresh Peer, not a lane; or a stated reason it is not
   checkable.
5. One challenge round, anonymous ("Lane X"), with the test result.
6. A fresh arbiter Peer of kind `review` gets one anonymous packet with the
   frame and mode; it judges the frame first.
7. A decision packet; Harness choices go to Human as pending, nothing
   changes in Harness.
A missing step, or another real problem, returns to Human before merging.
A Lead choosing another mode than expected is reported, not a failure, if
it gives a reason.

## Risks And Recovery

- Running groups keep a catalog that lists `council`; after the migration,
  `slp_template("council")` fails for them. Accepted by Human (D14 note).
- Recovery: the backup `templates.json` and the release `v0.3.6`.

## Progress

- [ ] Implementation and records (tests pass)
- [ ] Smoke test U1, U2
- [ ] Merge, tag v0.3.7, push, update 6767 with backups

## Decisions

## Validation

## Result
