# 0011 Dual-Lane Replaces The Council As The Default Template

Date: 2026-10-07

## Status

Accepted by Human on 2026-10-07 (ledger D12-D14, D16). Shipping dual-lane on a
two-use smoke test is Human's knowing exception to decision 0007 item 3.4,
which asks each template to show that it changes outcomes (Better-SLP).
Human, on the replacement (D12): "phần dual lane sẽ là thay thế cho council
... bỏ hẳn council luôn vì nó đảm nhận việc giống nhau" (dual lane replaces
the council ... drop the council entirely, because it does the same job).

0007 item 3.4 stays the rule for every other template. Amends decision 0008
for one point: the default templates, and how an existing install receives a
changed default.

## Context

Plan `docs/plans/completed/slp-dual-lane.md` holds the smoke-test steps,
registered before any run.

- **The overlap.** The council (two blind proposals, one challenge round, an
  anonymous compile, an arbiter) and dual-lane do the same job. Dual-lane
  adds a named crux with an axis, a mode (Two sides, Vet, Unframed), and a
  test of the deciding disagreement before the challenge round.
- **The text.** Human approved the revised `SKILL.md` as written (D14): the
  modes Two sides (default), Vet, and Unframed, and six generic axes.
- **The proof.** Human chose a two-use smoke test (D13, validation B,
  about $15-25) over a measurement that dual-lane changes outcomes. The smoke
  test shows that each step happens as written and what a use costs; it does
  not show better outcomes.
- **Existing installs.** The template store seeds the defaults once, so a
  changed default never reaches a store that already exists (decision 0008:
  a default Human removes stays removed). An install that kept the shipped
  council would keep it. One real install stores the council with a backslash
  before each of its six backticks (2,828 characters against the shipped
  2,822).
- **The smoke test (two uses, $2.53).** Steps 1, 4 and 7 were seen. Step 2
  (lanes on different models), step 5 (the challenge round) and step 6 (an
  arbiter packet without the Lead's own view) were not seen as written.
- **Human's changes after it (D16).** Human named the models: "dùng opus và
  fabel là 2 đưa phân tích còn sonnent 5.5 là trọng tài" (the lanes on Opus
  5.5 and Fable 5.1, the arbiter on Sonnet 5.5). Human approved two more
  changes and chose to release without a rerun: "Duyệt cả hai, phát hành
  luôn". The round may be skipped only with a stated reason, and the
  arbiter's packet holds only positions A and B, not the Lead's view.

## Decision

1. **Dual-lane is the only default template.** Its text is the `SKILL.md`
   Human approved (D14) with the D16 changes, byte for byte; a test pins its
   length and hash. It names the lane and arbiter models, so a Lead naming
   them follows a model Human named (decision 0009). The council is
   removed from the defaults entirely.
2. **One-time migration of an unmodified council.** When the template store
   loads an existing `templates.json`:
   - a template named `council` whose text equals the shipped council,
     either the clean text or the copy with each backtick escaped, is
     replaced in place by dual-lane;
   - before the first write, the file is copied to
     `templates.json.bak-v0.3.6` (unless that backup already exists);
   - if a `dual-lane` template is already stored, the shipped council is
     dropped and the stored dual-lane is kept;
   - an edited council, a store without a council, a removed council, and
     every other template are left alone. A removed council does not come
     back, and dual-lane is not added to a store that lacks the council.
   After the swap there is no council to match, so the migration runs once.
3. **Exception to 0007 item 3.4.** Dual-lane ships on the smoke test in the
   plan, not on proof that it changes outcomes. A later real run or
   measurement may keep, revise, or remove it under 0007 item 3.4.

## Alternatives Considered

1. **Ship both templates.** Not taken by Human (D12): they do the same job.
2. **Change only the defaults.** An existing store would keep its council
   and never see dual-lane.
3. **Replace any stored council.** It would overwrite an edit Human made.
4. **Migrate without a backup.** Not taken by Human (D13): `templates.json`
   is backed up first.
5. **Measure outcomes before shipping.** Not taken by Human (D13): a
   two-use smoke test.

## Consequences

- Dual-lane is unproven as to outcomes. The text with the D16 changes was
  not rerun; steps 2, 5 and 6 were not seen in the smoke test of the earlier
  text. Human chose to release anyway (D16).
- A running group keeps the catalog it was created with. After the
  migration `slp_template("council")` fails for it; Human accepted this
  (D14).
- The legacy council text stays in `default-templates.ts` only to recognise
  an unmodified copy. It can be deleted once no install is expected to hold
  one.
- Rollback is the release before this one (`v0.3.6`) and the backup
  `templates.json.bak-v0.3.6`.
