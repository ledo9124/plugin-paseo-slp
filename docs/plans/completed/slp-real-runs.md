# Execution Plan: SLP On Real Work

Date: 2026-10-02

## Status

Completed 2026-10-03. Runs 1-4 are done and recorded below, and the
changes they led to ship in v0.3.0. Human now uses SLP on real projects
without a plan per run.

## Outcome

SLP is used on real projects, and each run shows whether the group meets
the product's three jobs. Above all, it shows whether Lead-to-Peer
decomposition keeps Human's goal, which v0.1 barely exercised. Each run
records evidence for the follow-ups in the
[v0.1 plan](../completed/slp-plugin-v0.1.md) Result, and any change it
leads to.

## Context

- Product: `docs/product/overview.md`. Decisions 0001-0007.
- v0.1 Result: the gaps (no run with Human, I4, behaviors 2-3) and the
  follow-ups to watch.
- `docs/RUNBOOK.md` for the daemon.

## Scope

In scope:

- Real tasks Human chooses, run on the isolated dev daemon (port 6768).
- Observing and recording; changes to SLP only when a problem repeats, as
  Human's simple-and-effective principle says.

Out of scope:

- The projects' own outcomes beyond what Human asks in each run.
- Port 6767 (Human's app).

## Approach

The operating agent plays Human at Human's request (2026-10-02). It
answers only from what Human said. Anything Human did not settle, the
operating agent asks Human before answering the group, and records that
it asked. This makes the evidence stronger than the self-scripted v0.1
runs. It is still not Human typing.

### Run 1: docs review of `paseo-plugin` and `dsh-personal`

Registered before the run (2026-10-02).
- Human's request: review the docs of `paseo-plugin` and `dsh-personal`,
  and check whether the Harness architecture serves the outcome and makes
  it clear.
- Human's answers, given to the operating agent before the run:
  - result: review and fix. Fix what has clear evidence, commit on a new
    branch, do not push, and ask Human about anything that changes
    policy;
  - focus: whether the outcome is clear; whether the architecture and
    decisions fit the outcome; whether the Harness (`AGENTS.md`,
    `WORKFLOW.md`, `RUNBOOK.md`, plans) is enough for a new agent to work
    correctly on both repositories;
  - not selected as a focus: whether the docs match the code.
- Setup:
  - `paseo-plugin` (`C:\code\my-project\my-plugin`, `main` at the start):
    a Paseo worktree workspace on the new branch
    `docs/slp-harness-review`;
  - `dsh-personal` (`C:\code\my-project\dsh-personal`, `main`): a git
    worktree on the new branch `docs/slp-harness-review`, prepared by the
    operating agent, so the group never switches Human's checkout;
  - default SLP settings: Supervisor `claude-opus-5-5`, Lead
    `claude-sonnet-5-5`, bypass modes.
- Human's first message, close to Human's words: "Kiểm tra lại phần tài
  liệu của dự án paseo-plugin (repo này) và dsh-personal (bản làm việc ở
  `<worktree path>`): khung kiến trúc Harness đã đáp ứng và làm rõ
  outcome chưa? Review và sửa luôn."
- The operating agent answers intake and mid-run questions from the
  answers above. Anything else goes to Human first.
- Observed:
  - intake, and whether its questions match what Human had to settle;
  - whether the Lead delegates, and how: briefs, scope, out-of-scope
    lines, handbacks, acceptance;
  - the follow-ups from v0.1: questions through the question tool;
    recommendations against Human's answers; acceptance that runs the
    real thing; intake pending decisions in the escalation count;
  - findings and fixes, checked by the operating agent against the
    repositories;
  - cost and duration.
- Stop: the Supervisor reports the work done, or Human stops it. Cleanup:
  archive the workspace and stop the daemon. The branches stay for
  Human's review.

### Run 1 Results (2026-10-02)

Workspace `slp-real-1` (`wks_fb695b6c3301d056`), from 17:06 to 17:27 UTC.
- **Intake.**
  - The Supervisor asked nothing at intake. It handed off at once, and
    sent Human a read-back of 5 interpreted points.
  - Two points were wrong against Human's answers: "no commit" (Human
    allowed commits on a new branch), and a focus list that missed "is the
    Harness enough for a new agent" and added plans' done-criteria.
  - Human's correction became D2 and D3, quoted, and reached all three
    Peers. Because delivery is after-turn, Peers got it only after their
    first turn.
  - The Supervisor also told Human about unrelated Gmail and Drive
    connectors, picked up from its own session notice.
- **Delegation (I4, first real exercise).** The Lead split the work into
  three audits:
  - A1: framework, product, and decisions, on Claude Sonnet;
  - A2: plans, on Codex `gpt-6-luna`;
  - A3: `dsh-personal`, on Claude Sonnet.

  Each brief had a "MAY EDIT" list and an "OUT OF SCOPE" list. Choosing
  a model per assignment is the Lead's own template choice.
- **Behaviors 2 and 3, first live evidence.**
  - F1: A2 found that `product/overview.md` contradicts accepted 0012.
    That file was outside its scope, so it recorded a reopen finding and
    did not edit. The Lead decided D4 on 0012 and gave the fix to the
    file's owner, A1.
  - F2: A2 moved `telegram-account.md` to `completed/` (`e219437`). The
    Lead called this against its instruction and reversed it
    (`26b0995`), because "done" is the owner's call (D7). The overreach
    stayed within A2's own files, but past its brief.
  - Both findings stay "open" in the ledger: the Lead's decisions did not
    pass `findingId`.
- **Acceptance.** Every assignment was accepted (3 of 3). For A2, the
  Lead read the diff of A2's files within 5 seconds of the handback.
- **Questions to Human.** 4 native questions (D5, a D6 bundle of Q1-Q5,
  and D7), all through the Supervisor's tool, with 0 in a plain reply.
  - All of them were owner choices that no record settles: the product
    goal sentence, promoting plan-only facts, plan completion. So none
    was an over-escalation.
  - D7's question marked no recommendation.
  - The ledger's question text is cut at the plugin's limit (Q5 was
    cut). The operating agent read the full text from the pending
    permission.
- **Human proxy.** The operating agent asked Human every one of these
  before answering. Human chose: D5 A; D6 the recommended option for
  Q1-Q5; D7 "keep active". The Supervisor's turn waited for each answer:
  about 1 minute for D5, and several minutes for D6 and D7.
- **Report:**
  - Human: 2 messages, 0 interventions, 6 relayed decisions;
  - escalations: 3 raised, 4 native questions;
  - member messages: 27, with 18 held deliveries and 1 steer;
  - convention breaks: 0;
  - cost: Supervisor $1.08, Lead $1.08, Claude Peers $2.20, and the
    Codex Peer not reported.
- **Outcome, checked by the operating agent:**
  - `paseo-plugin` branch `docs/slp-harness-review`, 6 commits from `main`
    `f89863b`, 17 doc files:
    - the goal sentence is in `docs/product/overview.md`, worded as Human
      accepted;
    - 0010 has a 2026-10-02 amendment with the vault facts and "no
      retention policy yet";
    - in 0009, only the Follow-Up changed;
    - `AGENTS.md` changed only below `HARNESS:END`;
    - `telegram-account.md` is still active.
  - `dsh-personal` branch `docs/slp-harness-review`, 2 commits: README,
    `dsh-standalone.md` marked superseded, and `probes/inventory.md`. No
    `AGENTS.md` was added.
  - Nothing was pushed. Human's checkouts did not change.
- **Open items the group reported for Human:**
  - `telegram-personal-agent.md`'s outdated Outcome, and splitting that
    3,359-line plan;
  - no product doc for `paseo-telegram-account`;
  - security posture and other plan-only facts;
  - installed core `docs/README.md` and `WORKFLOW.md` cite files this
    repository lacks;
  - a possibly stale config header in `dsh-personal` (code, outside
    scope).
- Cleanup: workspace archived, which removed the Paseo worktree; the
  `dsh-personal` worktree removed; daemon stopped; 6767 untouched. Both
  branches remain.

Reading of run 1:
- **Decomposition worked on the first real task.** Peers kept to their
  scopes, with one overreach that was caught. A cross-scope problem went
  through a finding and its owner. Briefs carried constraint sources.
- **Intake was weaker than in v0.1.** The Supervisor asked nothing, and
  two of its interpretations were wrong. Human's correction fixed them
  cheaply, but after the Peers had started.
- **Questions to Human** all went through the question tool and were all
  owner choices, so the Part F rule held.
- **New small gaps:**
  - decisions on findings do not close the findings;
  - question text is cut in the ledger;
  - a native question without a recommendation;
  - a Supervisor remark from its own session context.

  Act if one repeats.

Merge (2026-10-02). Human chose to merge without reviewing the diffs
("Ko cần commit và merge vào main đi"), so run 1 has no Human judgment of
the fixes' quality.
- `paseo-plugin`: `main` `8c7eef6`, a `--no-ff` merge made in a temporary
  worktree, so Human's checkout on `feat/telegram-account` was untouched.
  `harness doctor` passes. `harness status` reports 5 consumer-modified
  core files, up from 3: the new section below `HARNESS:END` in
  `AGENTS.md`, and `docs/plans/active/README.md`. A later core update
  will have to merge them.
- `dsh-personal`: `main` `2797233`, merged in Human's clean checkout.
- Neither is pushed. The `docs/slp-harness-review` branches remain.

### Run 2: slice 5 (templates) of this repository, through SLP

Registered before the run (2026-10-02). Human asked that an SLP group
implement slice 5 of `docs/plans/completed/slp-role-config-and-templates.md`,
with the operating agent playing Human.
- Human's answers, given to the operating agent before the run:
  - result: commit on a new branch, no push. If the tests pass and the
    operating agent's live check passes, the operating agent merges into
    `main` without waiting for Human;
  - scope: all of slice 5, including the five default templates the plan
    lists;
  - testing: the group may install or reload the plugin on the main
    daemon (6767) from its worktree. No second daemon: Human's machine
    cannot carry two;
  - models: the Lead on Opus. The Supervisor stays on Opus, and Peers are
    the Lead's choice from the allowed list.
- Settled records the group should find on its own: decision 0008, the
  slice 5 approach in the plan (including the agent choices Human may
  revisit: templates in plugin data, import from a host folder), the
  accepted `docs/product/roles.md`, and `docs/RUNBOOK.md` "Testing On The
  Main Daemon".
- Setup:
  - a Paseo worktree workspace from this repository, branch-off `main`,
    new branch `feat/slice-5-templates`, so the operating agent's
    checkout does not change;
  - SLP on, with the Lead created on `claude-opus-5-5`: the operating
    agent sets the Lead's provider in Settings for the group's creation,
    then restores it (Human allowed this change);
  - the plugin on 6767 runs from the main checkout's `plugins/slp` with
    slice 4 (`1486d75`) loaded.
- Human's first message, close to Human's words: "Triển khai slice 5
  (templates) trong plan slp-role-config-and-templates nhé."
- The operating agent answers only from Human's answers above. Anything
  else goes to Human first, and is recorded as asked. It does not message
  the Lead or Peers.
- Observed:
  - intake: what the Supervisor asks, given that the plan settles most of
    the slice;
  - whether the Opus Lead delegates a multi-part slice, and its briefs;
  - the Supervisor's own project work (the report count), and its
    language;
  - live testing on the main daemon by the group: what it installs or
    reloads, and whether its own coordination survives a reload;
  - questions to Human, cost, and duration.
- Stop: the Supervisor reports the work done, or Human stops it. The
  operating agent pauses and asks Human if the cost passes $15.
- After the run, by the operating agent:
  - check the branch: `npm test`, `npm run typecheck`, the diff against
    the plan's slice 5, and a live check on 6767 (a template loaded,
    listed, loaded by a Lead, and counted);
  - if both pass, merge into `main` and record it; if not, report to
    Human and leave the branch;
  - point the 6767 plugin back at the main checkout's `plugins/slp`
    (`plugin install` from that path, then `plugin reload slp`) if the
    group installed it from the worktree;
  - archive the workspace (and its worktree) once the branch is merged or
    kept.

### Run 2 Results (2026-10-02)

Workspace `slp-run2-slice5` (`wks_ee5044fdd22bc717`), from 15:45 to 15:57
UTC. Supervisor and Lead on Opus, three Sonnet Peers. Cost about $5.03
(Supervisor $0.52, Lead $3.23, Peers $1.28).
- **Intake.** The Supervisor read the plan and asked nothing: the plan
  and 0008 settle slice 5. It read back three points it inferred (live
  checks on 6767, not slice 6, no push), all matching Human's answers.
  The operating agent confirmed them and added the commit answer.
- **Delegation.** The Opus Lead split the slice into three assignments:
  A1 server, A2 client, A3 the five default templates. Each brief had a
  "May change" list and an out-of-scope list naming the other owners.
  All three were accepted after the Lead ran the tests on the integrated
  result. No findings.
- **Supervisor.** 0 shell commands and 0 file changes (the report count);
  answers to Human in Vietnamese.
- **Question to Human.** One, through the question tool, with options and
  a recommendation: switching the 6767 plugin source to the worktree
  needs `plugin remove`, which deletes the plugin's settings directory.
  The operating agent took it to Human, who answered A (back up, remove,
  install from the worktree, restore) directly in the app.
- **Live check by the group.** On 6767, settings backed up and restored
  byte-identical; template RPCs, per-role `tools/list` (Lead 9 with
  `slp_template`, Supervisor 6 and refused), catalogs in the stored
  instructions, and the report's Templates section. Only its scratch
  workspace archived.
- **Lead's own choices it reported for Human:** the catalog follows
  custom instructions too; template names are lowercase with hyphens;
  import reads the folder's `SKILL.md` and its direct subfolders'.
- **Operating agent's check:** on the branch, `tsc` passed and `vitest`
  72 passed; the diff covers every slice 5 item. Merged into `main` as
  `2bd4a99` (`--no-ff`), tests passing again there. The 6767 plugin was
  pointed back at the main checkout (settings backed up, `plugin remove`,
  `plugin install`, settings restored, reload). A scratch group then
  showed the five defaults, the Lead's `slp_template` returning a body,
  and the Supervisor refused. Run workspace archived, which removed its
  worktree; the branch remains.

Reading of run 2:
- With an Opus Lead, a multi-part slice was split across Peers with
  clean scope lines, and nothing crossed a scope.
- The narrow Supervisor held on real work in this repository.
- The one Human question was a real owner choice (Human's settings at
  risk), and it reached Human well formed. The operating agent was slow
  to relay it, and Human answered in the app first.
- The Peers' short turns (30 seconds to 3 minutes) suggest the Lead's
  briefs were detailed; the Lead carried most of the cost.

### Run 3: templates in use (slice 6 of the role-config plan)

Registered before the run (2026-10-02). Human asked to test both cases:
a template Human names for a goal, and none named. Human left the tasks to
the operating agent, which plays Human again.
- Two groups in parallel on the main daemon, default settings (Supervisor
  Opus, Lead Sonnet), each in a fresh notes-CLI seed from
  `scripts/role-seed.sh` under `%TEMP%`. The five default templates are
  stored.
- 3a, named: "Review code notes.py theo template independent-review, chỉ
  báo lỗi, chưa sửa nhé."
- 3b, not named: "Kiểm tra giúp test của dự án có đủ tốt không, chỉ báo
  cáo thôi." `test-audit` fits; nothing tells the group so.
- Answers the operating agent gives: report only, change no code, no
  commit; anything else goes to Human first.
- Observed: in 3a, the template reaching the Lead as a constraint with
  source Human, a `slp_template` load, and `template` on the assignment;
  in 3b, whether the Supervisor suggests a template or the Lead loads one
  on its own; the report's Templates section; cost.
- Stop: the Supervisor reports the result, or $5 per group. Cleanup:
  archive both workspaces.

### Run 3 Results (2026-10-02)

Workspaces `slp-run3a` (`wks_b837744ff5fb55e3`) and `slp-run3b`
(`wks_25523acae774dff6`), 16:04 to 16:09 UTC. No question reached Human in
either group.
- **3a, named.** The Supervisor recorded Human's words (D1) and passed
  "use the independent-review template for this goal" to the Lead as a
  binding constraint with source Human. The Lead loaded the template
  (`template-load`), gave one assignment to a fresh Codex Peer with
  `template: independent-review`, and kept the brief free of its own
  reasoning about the code. The Peer recorded two findings with evidence;
  the Lead decided on both with `findingId` (so they closed, unlike run
  1), added two defects it confirmed itself, and accepted. The Supervisor
  reported four defects to Human, marked confirmed or suspected, with
  Human's and the agents' choices kept apart. Report: `independent-review`
  loaded 1, assignments 1, accepted 1. Cost $0.52 plus the Codex Peer
  (not reported).
- **3b, not named.** The Lead saw `test-audit` in its catalog and chose
  not to use it, nor Peers, saying why: the project is tiny (75 lines of
  code, 53 of tests). It ran the tests and reported five gaps. The
  Supervisor suggested no template. Report: no template entries. Cost
  $0.33.
- Both Supervisors: 0 shell commands and 0 file changes; replies in
  Vietnamese. Both workspaces archived.

Reading of run 3: a named template travels from Human to the brief and is
counted; an unnamed one is the Lead's call, and it declined openly on a
small task, as Human's "the Lead decides" allows. The Supervisor's
optional template suggestion has not been seen.

### Experiment: The Supervisor Follows The Lead (2026-10-03)

Human's choice after reviewing the Hydra and council notes: the Lead is
autonomous and should not report to the Supervisor, which only follows
it. Tried as an experiment, to keep only if R1 and R2 of
`docs/product/role-scenarios.md` still pass with no stall, no duplicate,
no ping-pong, and at most 20% more cost than tuning round 3.
- Change: the plugin relays each completed Lead turn's last reply to the
  Supervisor; the Lead's text drops "report with slp_send", and the
  Supervisor's text says not to acknowledge the relays.
- Main daemon, default settings, one run each:
  - R1 (S1-S5): all routed as defined; the Lead's three answers reached
    the Supervisor only by relay; Supervisor $0.53, Lead $0.12;
  - R2 (S6-S7): the conflict with 0001 went to Human, the correction
    reached the Lead, and the work changed; 9 Lead relays, 5 Supervisor
    messages, all with content; Supervisor $0.54, Lead $0.41;
  - Supervisor work 0 in both; no Lead `slp_send` to the Supervisor.
- Total $1.60 against $1.87 in round 3. Kept and merged.
- Seen: in R2 the Lead committed locally without being asked about
  commits (the script never raised it). Watch whether it repeats.

### Run 4: outcome check of `paseo-plugin` and `dsh-personal`

Registered before the run (2026-10-03). Human asked for a real-project
run to judge SLP, on the same two repositories as run 1, with the operating
agent playing Human. The task, in Human's words: "nắm outcome rồi xem dự án
hiện tại có đang đạt outcome với quy tắc đơn giản và hiệu quả không".
- Human's answers, given to the operating agent before the run:
  - result: fix on a new branch in each repository, no push. If the tests
    pass and the operating agent's check passes, the operating agent
    merges into `main` without waiting for Human;
  - basis: docs, code, and tests. The group may run the repositories'
    tests. It does not run the Telegram bot, the DSH runtime, or a daemon;
  - models: the Lead on Opus; the Supervisor on Opus; Peers the Lead's
    choice;
  - cost: the operating agent pauses and asks Human at $20.
- "Simple and effective" is Human's standing principle: one crisp,
  checkable rule beats a flexible judgment rule or parallel variants, and
  machinery is added only when a problem repeats. The operating agent may
  give this if the group asks what it means.
- Setup:
  - `paseo-plugin` (`C:\code\my-project\my-plugin`; Human's checkout on
    `feat/telegram-account`, already contained in `main` `8c7eef6`): a
    Paseo worktree workspace, branch-off `main`, new branch
    `review/slp-outcome-run4`;
  - `dsh-personal` (`main` `2797233`): a git worktree at
    `C:\code\my-project\dsh-personal-run4` on the new branch
    `review/slp-outcome-run4`, prepared by the operating agent;
  - Lead on `claude-opus-5-5`: the operating agent backs up the plugin
    settings, sets the Lead's provider for the group's creation, then
    restores the file byte-identical;
  - the plugin on 6767 runs from this checkout's `plugins/slp` at
    `f3f2220` (council template, Lead-reply relay).
- Human's first message, close to Human's words: "Nắm outcome của dự án
  paseo-plugin (repo này) và dsh-personal (bản làm việc ở
  `C:\code\my-project\dsh-personal-run4`), rồi xem dự án hiện tại có đang
  đạt outcome với quy tắc đơn giản và hiệu quả không."
- The operating agent answers only from the answers above; anything else
  goes to Human first and is recorded as asked. It does not message the
  Lead or Peers.
- Observed:
  - intake: whether the Supervisor asks for the result (report or fix)
    and the basis, which the first message leaves open;
  - whether "simple and effective" reaches the Lead and the briefs as a
    criterion with source Human;
  - the Opus Lead's decomposition across two repositories and docs plus
    code, and whether Peers keep to scope;
  - the follow-ups from runs 1-3 and the relay experiment: decisions that
    close findings, cut question text, a question without a
    recommendation, Supervisor remarks from its own session, uninvited
    commits, the Supervisor's template suggestion;
  - questions to Human, cost, and duration.
- Stop: the Supervisor reports the work done, or Human stops it.
- After the run, by the operating agent:
  - check each branch: the repositories' tests and typecheck where they
    exist, and each fix against its evidence;
  - if both pass, merge into `main` (`--no-ff`; `paseo-plugin` in a
    temporary worktree so Human's checkout stays on its branch) and
    record it; if not, report to Human and leave the branch;
  - archive the workspace (which removes its worktree) and remove the
    `dsh-personal` worktree. The branches stay.

### Run 4 Results (2026-10-03)

Workspace `slp-real-4` (`wks_d51360ffbdcf2634`), from 07:04 to 07:50 UTC.
Supervisor and Lead on Opus, two Sonnet Peers. Cost about $14.90
(Supervisor $1.44, Lead $6.39, Peers $7.08).
- **Intake.** The Supervisor read both repositories' outcomes and asked
  two questions in a plain reply: what "simple and effective" applies to,
  with three options and no recommendation, and how far to verify, with
  a recommendation. Both were open in the first message. It also inferred
  "read-only" from `AGENTS.md`, against Human's fix-and-merge answer,
  the second wrong inference about the result after run 1's "no commit".
  Human's correction became D3. A second read-back (fixing Harness is
  allowed; accepted decisions and visible policy come back as proposals)
  was confirmed as D4.
- **Delegation.** Five assignments, all accepted, one after rework:
  - A1 product audit of `paseo-plugin` and A2 audit of `dsh-personal`;
  - A3 rewriting the product docs so each states the current rule once;
  - A4 D5 (grants) and A5 D6-D9, on the code.

  A Peer raised F1, a reopen: D5 as worded would widen access for a
  topic grant without `controller.chat`. The Lead decided it as D13
  with `findingId`, so it closed (`talk: false` keeps the refusal).
- **"Simple and effective" reached the work.** D1 carried Human's
  definition with source Human. The scorecard judged each of the 8
  product boundaries for "reached" and "simple", and every recommended
  option chose the smaller mechanism (2 grant names instead of 9, no full
  audit while no problem repeats).
- **Questions to Human.** 3 native questions with 8 decisions (D5-D12),
  all through the Supervisor's tool, and all policy changes no record
  settled. All had a recommendation except D10, a multi-select whose
  question text said "approve all". Human chose the recommendation every
  time.
- **Outcome, Lead's scorecard:** both repositories mostly reach their
  outcome and the code is ahead of the records. Boundaries 1-3 and 8 are
  reached; 4-6 partly (a seat with Paseo tools on; gate 3 checks only
  announced creations); 7 rests on an accepted premise. The main
  simplicity gap was amendments layered over replaced rules in the
  product docs, and 7 inert capability names.
- **Not verified under D2:** Phase H scenario 6, whether the patched
  Paseo is the deployed one, whether the DSH compaction safety net ever
  fires, learning quality, and the grants screen in the app.
- **Report:** Human 3 messages, 0 to the Lead; escalations 8, all
  answered; member messages 26, with 34 held deliveries and 0 steers;
  convention breaks 0; Supervisor work 0.
- **Operating agent's check:**
  - `paseo-plugin` branch, 13 commits from `main` `8c7eef6`: typecheck
    clean, 759 tests pass (747 before). D5's migration keeps meaning
    (`talk` from `controller.chat`, `admin` from `controller.admin`; a
    grant without talk still refuses); D6, D7, D8 are small and tested.
  - `dsh-personal` branch, 2 commits: 107 tests pass (98 before; the
    learning tests joined the command). Persona is built
    (`personaPrefix` in `config/personal.cordis.yml`).
  - Commit `94f48b8` edited `docs/README.md`, a Harness-managed file that
    was still stock, although the Lead reported managed files untouched
    and D11 sends core fixes to the fork. Human chose to merge anyway;
    the source fix belongs in the fork with D11.
  - A nit: `controller-service.ts` keeps an orphaned doc comment where
    `COMMAND_CAPABILITY` was.
- **Merged** by Human's rule: `paseo-plugin` `main` `c8c63ab` (in a
  temporary worktree; Human's checkout stays on `feat/telegram-account`),
  `dsh-personal` `main` `4143bce`, 107 tests passing again there.
- **Pushed and released** at Human's request ("Ok làm đi", 2026-10-03):
  both `main`s pushed. The fork's D11 commit went through PR #14 (CI
  green on Linux and Windows), whose post-merge workflow released
  `harness-v0.1.17`. `paseo-plugin` moved its core to 0.1.17
  (`d443068`): the three-way update changed `AGENTS.md`,
  `docs/WORKFLOW.md`, and `docs/plans/README.md`, preserved every
  consumer-modified file, and `harness doctor` passes.
- **Checkout switch.** For D11 the Lead checked out the new branch in
  Human's `repository-harness` checkout instead of a worktree. The tree
  was clean; the operating agent put it back on `main`.
- **Operating agent's own gaps:** it saw a pending question and the
  group's end only when Human pointed them out. A native question blocks
  the Supervisor's turn, so no finish notice arrives; and after
  `respond_to_permission` no finish notice arrives either. A watcher on
  the report's unanswered count caught the later questions.
- Cleanup: workspace archived (its worktree removed), the `dsh-personal`
  worktree removed, settings restored byte-identical after the group's
  creation. The branches remain.

Reading of run 4:
- **Intake inferred the result wrongly again** (run 1: "no commit"; run 4:
  "read-only"). Both times the first message left the result open, and
  the Supervisor filled it from repository rules instead of asking. This
  is the first repeat; it qualifies for a change by Human's rule.
- **A question without a recommendation repeated** (run 1 D7, run 4
  intake and D10).
- **Decomposition and escalation held** on the largest run so far: five
  assignments, one cross-scope reopen settled through its finding, and
  every policy choice reached Human well formed.
- **New:** a Lead switched a checkout of Human's outside the group's
  workspace, and reported a managed-file rule it had not kept. Act if
  either repeats.

### Change After Run 4: The Result Is Asked, Every Question Recommends

Human approved (2026-10-03) fixing the two gaps that repeated.
- Change, in the Supervisor's text and `docs/product/roles.md`:
  - the result (a report only, or changes, and how far: commit, merge,
    push) is Human's; when Human's words leave it open, the Supervisor
    asks at intake and never infers it from the records;
  - every question carries a recommendation, intake questions too; in a
    pick-several question, each recommended item is marked.
- `role-scenarios.md` S6 now expects the commit question at intake.
- Check: R2 on the main daemon, default settings, seed `r2-fix`
  (`wks_224c0597fc2e77b6`), after `plugin reload slp`:
  - S6 pass: at intake the Supervisor named the conflict with 0001 and
    asked how far the change goes (commit to `master`, no commit, or
    push), both questions with a marked recommendation. Answers
    recorded; the Lead kept ids and committed on a new branch, no push;
  - S7 pass: the correction recorded and built (y/n, 13 tests);
  - 2 native questions mid-run (file shape, what counts as yes), both
    with a marked recommendation;
  - Supervisor work 0; Human's `notes.json` untouched; cost $0.74.
- Seen: after intake the Supervisor wrote to Human in English, three
  replies in a row, although Human wrote Vietnamese and the text says to
  use Human's language. Run 4 and round 3 stayed Vietnamese. Act if it
  repeats.

## Risks And Recovery

- **Edits to Human's real repositories.** Edits stay on new branches in
  worktrees, and nothing is pushed. To recover, delete the branches and
  worktrees.
- **Cost.** A docs review across about 40 files with several Peers may
  cost several dollars. The report shows cost per role while the run
  goes on.
- **Run 2 reloads the plugin the group runs on.** A failed reload stays
  failed and takes the group's SLP tools down with it. Recovery: the
  operating agent reinstalls the plugin from the main checkout's
  `plugins/slp` and reloads; the group's state stays in plugin data. A
  reload also restarts the MCP endpoint under any of Human's own SLP
  groups; at registration none was running.

## Progress

- [x] Run 1: docs review of `paseo-plugin` and `dsh-personal` (results
  above; merged by Human's choice without a diff review).
- [ ] A comparison with a single agent: deferred by Human (2026-10-02).
  SLP will be judged and improved through use, by its own process data
  (behavior 10), once it matures.
- [x] Run 2: slice 5 (templates) of this repository, through SLP
  (results above; merged as `2bd4a99`).
- [x] Run 3: templates in use, named and not named (results above).
- [x] Run 4: outcome check of `paseo-plugin` and `dsh-personal`
  (results above; merged, pushed, and the fork released as
  `harness-v0.1.17`).

## Decisions

- 2026-10-02: Human chose run 1's task, its result (review and fix), and
  its focus. Human asked the operating agent to play Human.
- 2026-10-02: Human deferred the single-agent comparison. SLP is judged
  and improved through real use and its own process data.
- 2026-10-02: Human chose run 2: slice 5 through SLP, the operating agent
  playing Human, with the answers registered above.
- 2026-10-03: Human chose run 4: an outcome check of `paseo-plugin` and
  `dsh-personal` against the simple-and-effective rule, fix and
  self-merge, docs plus code plus tests, a Lead on Opus, a $20 pause.
- 2026-10-03: Human approved changing the Supervisor for the two gaps
  that repeated, then chose to package v0.3.0, install it on the main
  daemon from the release, and close this plan.

## Validation

- Each run: the process report, the ledger, the branches' diffs, and the
  operating agent's own check of the findings.

## Result

SLP ran on real work four times, with the operating agent playing Human
and asking Human what no answer settled:
- Run 1: a docs review of two repositories, three Peers in scope, one
  overreach caught and reversed.
- Run 2: slice 5 of this repository built by an SLP group and merged.
- Run 3: a named template reached the brief and was counted; an unnamed
  one stayed the Lead's call.
- Run 4: the largest run, five assignments across two repositories, a
  Peer's reopen that stopped an access-widening migration, and 8 policy
  questions to Human, all well formed.

Against the three jobs:
- **Human cares about the outcome only.** Every question that reached
  Human was an owner choice no record settled; none was an
  over-escalation.
- **Decomposition keeps the goal.** Peers kept to their scopes, and
  cross-scope problems went through findings and owners.
- **Human sees and redirects.** Corrections reached the work in every
  run.

Changes the runs led to, by Human's repeat rule:
- the Supervisor follows the Lead through its end-of-turn reply (an
  experiment, kept);
- the council as the only default template;
- the Supervisor asks for the result when Human's words leave it open,
  and every question carries a recommendation (both repeated in runs 1
  and 4; R2 passes).

Watched, seen once, not changed:
- the Supervisor writing to Human in English (R2 after the change);
- a Lead switching a checkout of Human's outside the group's workspace;
- a Lead reporting a managed-file rule it had not kept;
- a Lead committing without being asked (relay experiment R2);
- decisions on findings that did not close them (run 1; run 4 closed
  its finding).

Not done: the single-agent comparison, deferred by Human.
