# Execution Plan: Dual-Lane Replaces Council

Date: 2026-10-07

## Status

Completed

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

- [x] Implementation and records (A9, `f928e67`; typecheck 0, vitest 145/145;
  the shipped text equals the approved file, sha256 `feebf814...`)
- [x] Smoke test U1, U2 (A10): steps 2 and 5 not seen; back to Human (D15)
- [ ] Merge, tag v0.3.7, push, update 6767 with backups

## Decisions

- 2026-10-07 (Lead, D15 on finding F2): steps 2 and 5 were not seen, so no
  merge; options go to Human.
- 2026-10-07, Human (D16): the lanes on Opus 5.5 and Fable 5.1, the arbiter
  on Sonnet 5.5, named in the template; skip the challenge round only with a
  stated reason; the arbiter's packet holds only A and B, not the Lead's
  view; "Duyệt cả hai, phát hành luôn": release without a rerun. The Lead
  role text and `tools.ts` stay unchanged: the template names the models.

## Validation

Smoke test (A10, 6768, branch at `f928e67`; evidence `%TEMP%\slp-dual\steps.md`,
packets `%TEMP%\slp-dual\packets.md`):
- Migration on the probe home: `[council]` (sha256 `0201b7be...`) became
  `[dual-lane]` (`0c9bf7b9...`); the backup `templates.json.bak-v0.3.6` is
  byte-identical to the old file; it ran once, at plugin load.
- U1 (A2): Two sides, $1.06, 3.1 min. U2 (A3 candidate): Vet, $1.47, 4.9 min.
  The Lead loaded the template and picked the expected mode both times.
  Both clones are unchanged.
- Steps: 1 seen; 2 partly (blind yes, different models no: all Peers on
  Sonnet; the pool had one provider because codex did not answer on 6768,
  and the template says "providers"); 3 seen in U2, partly in U1 (no cost or
  assumptions asked); 4 seen (the Lead tested by reading or grepping); 5 not
  seen (both Leads skipped the challenge round, with a reason); 6 partly (a
  fresh `review` arbiter judged the frame first, but U1's packet carried the
  Lead's own view); 7 seen.
- In U2 the operator, playing Human, chose the recommended options. Those
  are not Human's decisions on Harness.

## Result

v0.3.7 ships dual-lane with the D16 changes (decision 0011), by Human's
choice without a rerun. Steps 2, 5 and 6 were not seen in the smoke test of
the earlier text; the changed text is untested live. Smoke-test cost: $2.53
for the two uses.
