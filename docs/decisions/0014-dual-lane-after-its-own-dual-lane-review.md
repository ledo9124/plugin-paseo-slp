# 0014 Dual-Lane After Its Own Dual-Lane Review

Date: 2026-11-26

## Status

Accepted by Human on 2026-11-26 (SLP ledger, relayed by the Supervisor):
- items 3, 4, 5, 6 and 7(b) approved in D221; item 2 not approved;
- item 1 approved as (b) under D221, D222, D223 and D224;
- Review mode's lenses and models in the wording of D226 and D227;
- the review's fix round under Human's "Sửa, review, merge luôn" (fix,
  review, merge), which lifted the D228 hold.

On Human's authority it amends:
- decision 0012 item 1 (the shipped text, including Review mode's lenses
  and their models);
- decision 0009 item 4 (the Peer-model rule);
- two of 0011's D16 clauses: the named models, and "no Lead view" on one
  path.

It adds a third one-time migration beside 0011 item 2 and 0012 item 2.

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
  - Item 1, the models. The conflict was between the template's named
    models and the role text's per-goal rule (decision 0009 item 4).
    Human's D221 words: "dựa theo các provider đang có hiện tại rồi lead
    tự đánh giá ưu tiên dùng của các provider khác nhau" (choose from the
    providers available now, and the Lead weighs which to prefer). The
    Supervisor's reading (D222): no hard-coded Opus or Fable. Human's
    D223 answer, option (b): "Mọi lần chạy dual-lane" (every dual-lane
    run). Human's D224 answer: "Áp cả cho Review" (apply it to Review
    too). The choice applies to every dual-lane run, Review mode
    included, whether or not Human named the template.
- **Review mode's lenses (D226, D227).** Human approved new Review-mode
  wording: lenses chosen from the change and its risks, and models strong
  enough for analysis and review. It does not apply to the decision
  mode's lanes or arbiter (Human: "Không áp", it does not apply).
- **The branch review.** Two lenses reviewed the branch: lens A (intent,
  findings M1-M5) and lens B (claims, findings 1-7, paused after D226).
  Their findings are fixed on the branch or answered here. Human ranked
  the strength rule above "none on the model that wrote the change" (M3,
  relayed by the Supervisor).

## Decision

1. **The shipped dual-lane text** keeps the v0.4.0 text (0012). It changes
   only what items 1, 3-7(b), the Review-mode wording and the review
   findings need. A test pins its length (9,988 bytes) and hash, and checks
   that it names no model. The description names the reader path when the
   lanes agree (review M5, lens B 4).
   - **Item 1, the models (steps 2 and 4).**
     - The lanes: the Lead chooses their models from `slp_ledger`
       peerModels, the allowed models. That is the allowlist in settings,
       not a live catalog, and a listed model can still fail to start
       (review, lens B 6).
       - The two lanes go on different providers, or on different model
         families when only one provider is available.
       - The Lead weighs each model's fit for the task and its cost.
       - If no pair that meets this can be delegated, the Lead reports it
         as a blocker.
       - The Lead names the model in `slp_delegate`, and gives the models
         and the reason in the outcome's step line.
     - The arbiter runs on a model from peerModels that neither lane
       used, preferably from another provider. The 7(b) reader follows the
       same rule. The shadow arbiter sentence is unchanged.
     - No model is named in the text any more. Before: lanes on Opus 5.5
       and Fable 5.1, the arbiter on Sonnet 5.5, the Review lenses and the
       fix-round lens on Opus 5.5.
   - **Review mode (D224, D226, D227).** The fixed pair of lenses gives
     way to Human's D227 wording, lightly fitted to the template:
     - **Choosing the lenses.** The Lead chooses the lenses from the change
       and its context. One lens is enough for a small, local change. It
       adds a lens for each kind of risk the change carries, for example:
       intent, claims, data and migration safety, security, or the reader
       who must follow a text the change touches. Each lens is a fresh
       Peer, kind `review`, who did not write the change. All lenses get
       the same brief, work blind to each other, and differ only in
       method. The outcome names the lenses and the reason.
     - **Models.** Each lens runs on a model from peerModels strong
       enough for analysis and review, never a small or fast-tier model.
       The lenses go on different providers or model families when a
       strong model is available there. The outcome names the models and
       why each is strong enough.
     - **The writer's model.** "None runs on the model that wrote the
       change" was the Lead's addition under D224. Human ranked it below
       the strength rule (M3). If honouring it would leave only a weaker
       model, the strength rule wins and the outcome says so.
     - **Fix round and merge.** The fix round is one fresh lens, on a
       strong model from peerModels. Before merge, the lenses run again,
       chosen the same way.
     - **The outcome** records the lenses and their models with the
       reasons, which lens found what, what more than one found, and how
       each conflict was decided (review M2). Findings with severity, the
       one unnamed exchange on a conflict, and "no arbiter" are unchanged.
   - **Item 3, a frame finding (step 1).** The Lead records with
     `slp_decide` what it did about the finding, and why, without the
     other lane in `notify`. A change to Human's goal goes to Human. The
     other lane is not told before the challenge round, by message or by
     decision. The packet carries the original frame, the finding and what
     was done. The arbiter, or the reader that replaces it, checks whether
     each answer still addresses the revised question. The Lead's role
     text gives the same exception for a Peer a template keeps blind
     (review, lens B 1): a notified decision reaches the Peer and shows in
     its ledger.
   - **Item 4, a step line (steps 2, 3, 5).**
     - The outcome holds one line for each step (frame, models, test,
       round, independent reader): done, or departed from, with the reason
       and a record id.
     - It replaces "say so in the packet" (a model fallback, now gone with
       item 1) and "say which in the packet" (a skipped round).
     - The text says that skipping the round never skips the independent
       reader.
     - 0011's D16 clause that the round is skipped only with a stated
       reason still holds. The reason now goes in the outcome, which exists
       even when no packet does.
   - **Item 5, the arbiter's reading scope (step 4).**
     - The Lead tells the arbiter to open the records the packet cites, to
       check them. The packet still holds no Lead view, and the arbiter
       reads no lane folder.
     - A Peer's `slp_ledger` shows only its own work. So the Lead quotes in
       the packet each other ledger record the arbiter or the reader must
       check, with its id and without naming a lane's author.
     - Either reader flags a deciding record it could not open, and does
       not call it checked (review, lens B 3).
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
       may instead write the synthesis and give it to a reader instead:
       - one fresh Peer (kind `review`) who wrote no position, on a model
         chosen as for the arbiter (item 1);
       - it gets the packet's contents, the synthesis, and leave to open
         every record the lanes, the comparison and the synthesis cite;
       - it judges the frame first, then the premises the lanes share
         against those records, then the synthesis.
     - Skipping both is not a path, even with a recorded reason; nor is a
       reader limited to the lane files. The outcome names the path taken
       and why (item 4).
2. **The D16 change, on Human's authority.** 0011 records Human's D16
   clause that the arbiter's packet holds the positions, not the Lead's
   view. On the agreeing path of item 7(b), the only independent reader
   reads the Lead's synthesis by design. Human made that trade in D221
   knowing it; an agent could not. The clause still holds on the arbiter
   path.
3. **The model rule changes, on Human's authority (D223, D224).**
   - Decision 0009 item 4 said Peers run on the default model unless
     Human names another, or a template Human named for the goal requires
     it. It gains a third case: a template the Lead uses asks it to choose
     models. Dual-lane does, in every run.
   - The texts that state the rule now agree:
     - the Lead's role text (`roles.ts`);
     - the `slp_delegate` model description (`server/tools.ts`; Lead
       decision D225, resolving finding F98);
     - the Settings hint for the default model, which now says only
       "Used when the Lead names no model for a Peer" (review, lens B 5).
   - 0011's D16 clause naming the lane and arbiter models, and 0012's
     Opus lenses, are replaced by the Lead's choice in item 1 and Review
     mode above.
   - The shipped Peer models (`settings.ts`) are unchanged.
4. **One-time migration.**
   - When the template store loads an existing `templates.json`, a
     template named `dual-lane` whose text equals a shipped text byte for
     byte (v0.3.7 or v0.4.0) is replaced in place by the current text.
   - The file is first copied to `templates.json.bak-<release>`, unless
     that backup already exists.
   - An edited dual-lane (including a copy with other line endings), a
     removed one, and every other template stay as they are.
   - The v0.4.0 text stays in `default-templates.ts` as
     `LEGACY_DUAL_LANE_V040` only for this match, pinned by its own test.
   - A rename Windows refuses because another process holds the file open
     (EPERM, EBUSY or EACCES) is retried up to five times, 50 ms apart.
   - If a migration still cannot write, the store keeps what is stored and
     logs "[slp] template migration skipped until the next start". The
     plugin starts with the old text, and the next start migrates (review
     M1).

## Alternatives Considered

1. **Item 7(a), a bounded trial first** (A157, and the Lead's
   recommendation). The blind arbiter stays the default, and the
   substitution is tested on an agreeing case: frozen positions, an
   uncorrected draft, and both readers finishing blind to each other. Not
   taken by Human (D221: replace now).
2. **Item 2, the model on each assignment record** (a ledger change). Both
   verdicts recommended it as the independent half of the models line. Not
   approved by Human.
3. **Not proposed to ship** (both verdicts):
   - a head block listing Human's clauses;
   - a conformance report;
   - an ordering guard for the reader of the synthesis (write the frame
     judgment before opening the synthesis);
   - a change to Unframed mode.

   Review mode was later changed by Human's D224, D226 and D227.
4. **Item 1, other options.**
   - (a) The named models only when Human names dual-lane for the goal.
     This was recommended by both verdicts, which assumed the named
     models stayed.
   - Keeping the named models in every run, at 2 to 4 times the Peer
     cost.

   Human chose instead to have the Lead choose from the available
   providers in every run, Review mode included (D221, D223, D224).
5. **Review mode's fixed pair of lenses (intent, claims) on two
   providers.** Replaced by Human's D227 wording: lenses chosen by risk,
   on strong models.

## Consequences

What each change keeps, degrades, and loses (from the decision packet, the
verdicts and the branch review):

- **Item 1** ends the conflict between the template and the role text. It
  also ends the unrecorded model departures (six of nine runs), because no
  fixed model is left to depart from. The step line records the choice and
  its reason.
  - The lanes keep their diversity as different providers or model
    families, not as two named models.
  - It loses the fixed models Human named in 0011 D16 and 0012. No record
    shows the named models doing better (R8, on Opus and Fable, was
    refused; R9, on Sonnet, was approved), but n=9 cannot show they make
    no difference.
  - Cost now follows the Lead's weighing. The named runs cost $10-22
    against $2-5 for default runs, on different tasks.
  - The shipped Peer models are Sonnet 5.5, Haiku 4.5 and one Codex model,
    on two providers. With those, the lanes take two of the three models.
    The arbiter or the reader then gets the third, which may be the
    smallest, and no model is left for a shadow arbiter. D226's strength
    rule does not apply to the decision mode.
  - The model is not on the assignment record, because item 2 was not
    approved. For a new Peer, the delegate event in the group's event log
    records the model it was created on, the default included. The ledger
    view shows the last 200 events. A reused Peer's delegate event has no
    model, but the Peer keeps the model it was created with. So the
    models line can be checked against that log, not against the
    assignment (review M4).
- **Review mode** fits the number of lenses to the change: one for a small,
  local change, more for each kind of risk.
  - It loses the fixed intent-and-claims pair. Human's reference data
    (0012: 15 lens pairs, 37% of the findings found by both) came from
    that pair on Opus.
  - With the shipped Peer models, Haiku 4.5 is a small, fast-tier model
    and is never a lens. If the change was written on Sonnet 5.5, a lens
    off the writer's model must run on the Codex model, if that model is
    strong enough. A second lens may run on Sonnet 5.5 under the strength
    rule, and the outcome says so.
- **Item 3** keeps the other lane's blindness, which the runs split on.
  It gives the refined frame a record and a reader, and adds one record
  per frame finding. It is safe only with the reader's "judges the frame
  first", which the text keeps on both paths.
- **Item 4** makes departures visible where they were mostly silent. It
  separates skipping the round from skipping independent judgment (R2's
  misreading).
  - The step line is written by the Lead. For models, the delegate event
    log is an independent check while it lasts; for the other steps,
    nothing independent checks the line.
  - The arbiter's packet no longer carries the reason a round was
    skipped; the outcome does.
- **Item 5** gives the arbiter in the text the scope that decided every
  catch in the test (R3, R6), which before came only from briefs.
  - It keeps the packet free of the Lead's view and the lane folders.
  - The arbiter's session reads more.
  - Quoted ledger records cost the Lead some packet work. The records the
    reader opens may let it recognise a lane (A156 noted self-identifying
    lines in this run's positions; n=1).
- **Item 6** adds one Peer session for each new decision document written
  after the arbiter. It loses nothing the arbiter gave.
- **Item 7(b)** keeps the arbiter whenever the lanes disagree or the frame
  is contested.
  - On the agreeing path it loses the sole reader's blindness to the Lead
    (the purpose of D16: one model's first idea anchors everyone).
  - No record shows harm: the reviews in R3 and R8 found errors inside the
    synthesis's frame. No record tests whether such a reader catches a
    frame the Lead got wrong, which is where anchoring would act.
  - A premise the reader finds after the synthesis costs a rework round
    (R3: an option set retired, then nine edits).
- **The evidence base is small:** 9 runs and 2 test cases (R6
  counterfactual).
- **Migration.**
  - The text reaches a later session only after the store migrates.
  - A running group keeps the catalog it was created with.
  - An installed dual-lane Human edited is left alone and keeps the old
    text.
  - A start that cannot write keeps the old text until the next start.
- **Rollback, by the route the install took** (review, lens B 7). The
  backup is written only when absent, so check its date before restoring
  it.
  - An unmodified v0.4.0 dual-lane: reinstall release v0.4.0, and restore
    `templates.json.bak-v0.4.0`.
  - An unmodified v0.3.7 dual-lane, upgraded directly: reinstall v0.3.7,
    and restore `templates.json.bak-v0.3.7`.
  - A shipped council (v0.3.6), upgraded directly: reinstall v0.3.6, and
    restore `templates.json.bak-v0.3.6`.
  - An edited or removed dual-lane, or a store that could not be written:
    nothing was migrated. Reinstall the previous release; no template
    restore is needed.

## Follow-Up

- What would reopen item 1: a record showing that runs on particular
  models hold better, or a Human statement that named models apply.
- What would reopen 7(b): an agreeing run where a blind arbiter catches a
  material error that a scope-matched reader of the synthesis missed
  (restore the arbiter on that path). Or a reader of the synthesis that
  misses a wrong frame the Lead introduced, later found by Human (add the
  ordering guard).
- Validation the arbiter recommended once shipped: a fresh Lead runs the
  changed text on a dual-lane goal Human did not name. It passes only when
  both hold (review, lens B 2):
  - the step line shows every departure;
  - an independent reader (the arbiter or the 7(b) reader) completed its
    read on a permitted path.

  A recorded skip of both readers explains a failed run; it does not pass
  it.
