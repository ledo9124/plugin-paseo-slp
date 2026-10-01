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

## Risks And Recovery

- **Edits to Human's real repositories.** Edits stay on new branches in
  worktrees, and nothing is pushed. To recover, delete the branches and
  worktrees.
- **Cost.** A docs review across about 40 files with several Peers may
  cost several dollars. The report shows cost per role while the run
  goes on.

## Progress

- [x] Run 1: docs review of `paseo-plugin` and `dsh-personal` (results
  above; merged by Human's choice without a diff review).
- [ ] Run 2, a comparison with a single agent: deferred by Human
  (2026-10-02). SLP will be judged and improved through use, by its own
  process data (behavior 10), once it matures.

## Decisions

- 2026-10-02: Human chose run 1's task, its result (review and fix), and
  its focus. Human asked the operating agent to play Human.
- 2026-10-02: Human deferred the single-agent comparison. SLP is judged
  and improved through real use and its own process data.

## Validation

- Each run: the process report, the ledger, the branches' diffs, and the
  operating agent's own check of the findings.

## Result

Pending.
