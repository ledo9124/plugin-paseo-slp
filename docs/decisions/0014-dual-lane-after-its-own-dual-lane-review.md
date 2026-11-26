# 0014 Dual-Lane After Its Own Dual-Lane Review

Date: 2026-11-26

## Status

Accepted by Human on 2026-11-26 (SLP ledger D221, relayed by the
Supervisor): items 3, 4, 5, 6 and 7(b) approved; item 2 not approved;
item 1 pending (D222). Amends decision 0012 item 1 (the shipped text) and,
on Human's authority, one clause of 0011 (D16, "no Lead view") on one path.
Adds a third one-time migration beside 0011 item 2 and 0012 item 2.

## Context

- **The run (D216).** The dual-lane template was reviewed through
  dual-lane, under D217 (every template edit needs Human's approval, a
  branch, a review, a merge, a push, and a plugin update with a migration).
  - Baseline: A152 went through 9 past dual-lane runs (R1-R9, 29
    assignments).
  - Two blind lanes: A153 (Enforce the design, Opus 5.5) and A154 (Codify
    the practice, Fable 5.1).
  - Frame findings F95 and F96 (decided in D218, D219): the frame works
    clause by clause, not template against practice.
  - One test of the deciding disagreement: A155 checked R3, R6 and R8.
  - One challenge round.
  - Arbiter A156 (Sonnet 5.5) and shadow arbiter A157 (another model
    family). F97 narrowed what the test supports (D220): R3's later
    reviewer saw a draft that had already been corrected, and R6 had no
    draft, so the test does not show that the two readers are equivalent.
  - The evidence is kept outside this repository, with the SLP run
    (`D216\decision-packet.md`, `arbiter\verdict.md`, `shadow\verdict.md`).
- **What the evidence showed.**
  - Six of nine frames were sharpened by a lane; the handling split (three
    runs kept the other lane blind, one told it).
  - Departures were mostly unrecorded: the models in six runs, the test in
    four, the round in two; five of nine runs had no arbiter, two with no
    reason. R2 skipped the arbiter on a misreading of the round-skip clause.
  - In R3 and R6 every arbiter catch came from records outside the lane
    files, which the arbiter opened through its brief, not through the
    text, which gave it "only one packet".
  - Reviews of a written synthesis after the arbiter found errors the
    arbiter could not see (R3: nine edits, D29; R8: five major findings).
  - Both lanes and both arbiters agreed on everything above. The one open
    disagreement: when the lanes agree, may a fresh reader of the Lead's
    written synthesis replace the blind arbiter? A156 said yes; A157 said
    only as a bounded trial Human authorises, because that reader sees the
    Lead's answer. The Lead recommended A157's trial.
- **Human's answers (D221).**
  - Item 7: Human chose (b), "Cho phép thay ngay" (allow the replacement
    now), not the trial.
  - Item 2, the model on each assignment record (a ledger change): not
    approved.
  - Item 1, the lane models (the conflict between the template's named
    models and the role text's per-goal rule, decision 0009 item 4):
    pending under D222. Step 2's model sentence is unchanged here.

## Decision

1. **The shipped dual-lane text** keeps the v0.4.0 text (0012) and changes
   only what items 3-7(b) need. A test pins its length (8,593 bytes) and
   hash.
   - **Item 3, a frame finding (step 1).** The Lead records with
     `slp_decide` what it did about the finding, and why; a change to
     Human's goal goes to Human. The other lane is not told before the
     challenge round. The packet carries the original frame, the finding
     and what was done; the arbiter, or the reader that replaces it, checks
     whether each answer still addresses the revised question.
   - **Item 4, a step line (steps 2, 3, 5).** The outcome holds one line
     for each step (frame, models, test, round, independent reader): done,
     or departed from, with the reason and a record id. It replaces "say so
     in the packet" (a model fallback) and "say which in the packet" (a
     skipped round). The text says that skipping the round never skips the
     independent reader. 0011's D16 clause that the round is skipped only
     with a stated reason still holds; the reason now goes in the outcome,
     which exists even when no packet does.
   - **Item 5, the arbiter's reading scope (step 4).** The Lead tells the
     arbiter to open the records the packet cites, to check them. The
     packet still holds no Lead view, and the arbiter reads no lane folder.
   - **Item 6, a review of a new decision document (step 5).** When the
     Lead writes a new decision document after the arbiter, a fresh Peer
     (kind `review`) who did not write it checks it against the verdict and
     the records it cites before Human sees it. Not needed when the verdict
     itself is the deliverable.
   - **Item 7(b), two paths to the independent reader (step 4).**
     - When the lanes still disagree on the deciding point after the round,
       or the frame is contested and the lanes did not converge on a
       revised frame, the arbiter runs as written.
     - When the lanes agree on the deciding point and the frame, the Lead
       may instead write the synthesis and give it to one fresh Peer (kind
       `review`) who wrote no position. It gets the packet's contents, the
       synthesis, and leave to open every record the lanes, the comparison
       and the synthesis cite. It judges the frame first, then the premises
       the lanes share against those records, then the synthesis.
     - Skipping both is not a path; nor is a reader limited to the lane
       files. The outcome names the path taken and why (item 4).
2. **The D16 change, on Human's authority.** 0011 records Human's D16
   clause that the arbiter's packet holds the positions, not the Lead's
   view. On the agreeing path of item 7(b), the only independent reader
   reads the Lead's synthesis by design. Human made that trade in D221
   knowing it; an agent could not. The clause still holds on the arbiter
   path.
3. **One-time migration.** When the template store loads an existing
   `templates.json`, a template named `dual-lane` whose text equals a
   shipped text byte for byte (v0.3.7 or v0.4.0) is replaced in place by
   the current text, after the file is copied to
   `templates.json.bak-<release>` (unless that backup exists). An edited
   dual-lane (including a copy with other line endings), a removed one, and
   every other template stay as they are. The v0.4.0 text stays in
   `default-templates.ts` as `LEGACY_DUAL_LANE_V040` only for this match,
   pinned by its own test.

## Alternatives Considered

1. **Item 7(a), a bounded trial first** (A157, and the Lead's
   recommendation): keep the blind arbiter as the default and test the
   substitution on an agreeing case with frozen positions, an uncorrected
   draft, and both readers finishing blind to each other. Not taken by
   Human (D221: replace now).
2. **Item 2, the model on each assignment record** (a ledger change,
   recommended by both verdicts as the independent half of the models
   line). Not approved by Human.
3. **Not proposed to ship** (both verdicts): a head block listing Human's
   clauses, a conformance report, an ordering guard for the reader of the
   synthesis (write the frame judgment before opening the synthesis), a
   change to Unframed mode, and any change to Review mode.

## Consequences

What each change keeps, degrades, and loses (from the decision packet and
the verdicts):

- **Item 3** keeps the other lane's blindness, which the runs split on,
  and gives the refined frame a record and a reader. It adds one record per
  frame finding. It is safe only with the reader's "judges the frame
  first", which the text keeps on both paths.
- **Item 4** makes departures visible where they were mostly silent, and
  separates skipping the round from skipping independent judgment (R2's
  misreading). It is a self-report: with item 2 not approved, nothing
  independent checks the models line. The arbiter's packet no longer
  carries the reason a round was skipped; the outcome does.
- **Item 5** gives the arbiter in the text the scope that decided every
  catch in the test (R3, R6), which before came only from briefs. It keeps
  the packet free of the Lead's view and the lane folders. The arbiter's
  session reads more. The records it opens may let it recognise a lane
  (A156 noted self-identifying lines in this run's positions; n=1).
- **Item 6** adds one Peer session for each new decision document written
  after the arbiter. It loses nothing the arbiter gave.
- **Item 7(b)** keeps the arbiter whenever the lanes disagree or the frame
  is contested. On the agreeing path it loses the sole reader's blindness
  to the Lead (the purpose of D16: one model's first idea anchors
  everyone). No record shows harm: the reviews in R3 and R8 found errors
  inside the synthesis's frame. No record tests whether such a reader
  catches a frame the Lead got wrong, which is where anchoring would act.
  A premise the reader finds after the synthesis costs a rework round (R3:
  an option set retired, then nine edits).
- **The evidence base is small:** 9 runs and 2 test cases (R6
  counterfactual).
- **Migration.** The text reaches a later session only after the store
  migrates. A running group keeps the catalog it was created with. An
  installed dual-lane Human edited is left alone and keeps the old text.
- **Rollback:** the previous release and `templates.json.bak-v0.4.0`.

## Follow-Up

- Item 1 (the lane models, step 2) is pending under D222. When Human
  answers, the model sentence changes in a later text with its own pin and
  migration.
- What would reopen 7(b): an agreeing run where a blind arbiter catches a
  material error a scope-matched reader of the synthesis missed (restore
  the arbiter on that path); a reader of the synthesis that misses a wrong
  frame the Lead introduced, later found by Human (add the ordering guard).
- Validation the arbiter recommended once shipped: a fresh Lead runs the
  changed text on a dual-lane goal Human did not name; it passes when the
  step line shows every departure and no independent reader is skipped
  without a record.
