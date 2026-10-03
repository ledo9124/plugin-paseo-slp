# Execution Plan: SLP On Real Work

Date: 2026-10-02

## Status

Active. Run 1 (a docs review of `paseo-plugin` and `dsh-personal`) is done,
recorded below, and merged into both repositories' `main` (local, not
pushed).

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

## Decisions

- 2026-10-02: Human chose run 1's task, its result (review and fix), and
  its focus. Human asked the operating agent to play Human.
- 2026-10-02: Human deferred the single-agent comparison. SLP is judged
  and improved through real use and its own process data.
- 2026-10-02: Human chose run 2: slice 5 through SLP, the operating agent
  playing Human, with the answers registered above.

## Validation

- Each run: the process report, the ledger, the branches' diffs, and the
  operating agent's own check of the findings.

## Result

Pending.
