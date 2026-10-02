# Execution Plan: Per-Role Configuration And Templates

Date: 2026-10-02

## Status

Active. Decisions settled by Human on 2026-10-02 (decision 0008). Human
added the role-definition task on 2026-10-02 (slices 1 and 3). Slice 1 is
done: draft definitions in `docs/product/roles.md`, the suite in
`docs/product/role-scenarios.md`, and the v0.1.0 baseline below. No code
changed yet. Next: slice 2.

## Outcome

Each role has a clear definition that its agent can act on, and members
behave by it: tested on a fixed set of scenarios and tuned until they pass.

Human tunes each SLP role on its own from the plugin's settings: provider
and model, mode, instructions, SLP tools, and templates. Each member's
context holds only what its role acts on. Templates are loaded through the
UI, offered to the Supervisor and the Lead as a catalog, loaded by the Lead
on demand, and measured in the process report.

## Context

- Decision 0008 (this work), 0001 and 0006 (enforcement), 0007 (layers,
  templates are not SLP), 0002 and 0005 (group shape).
- Product: `docs/product/overview.md`, Roles, What SLP Is, Required Behavior.
- Code:
  - `plugins/slp/server/roles.ts`: `SHARED` plus role texts;
  - `plugins/slp/server/tools.ts` and `mcp-http.ts:102`: one tool list for
    every member;
  - `plugins/slp/server/coordination.ts:93`: `ledger()` returns the whole
    ledger to any member;
  - `plugins/slp/server/slp-service.ts`: `createMember`, `MEMBER_TOOLS`,
    `leadProviderOptions`;
  - `plugins/slp/shared/settings.ts` and `client/settings-screen.tsx`.
- Platform facts: Paseo `v0.10.2` has no per-agent skills;
  `disallowedTools` works per agent for Claude (0006); the plugin client UI
  has `SettingsInput` and React Native `TextInput` (multiline possible), and
  no file picker.
- Run 1 evidence: `docs/plans/active/slp-real-runs.md`.
- Human's own test, 2026-10-02, on Human's daemon in `D:/codes/paseo-plugin`
  (plugin v0.1.0, Supervisor on `claude-sonnet-5-5`):
  - group `f6de6739` (workspace `wks_67887d7fae7faf5b`): Human sent 4
    messages: pull the latest code, what is left to build, analyze the
    `telegram-account` architecture, and look for a simpler option. The
    Supervisor did all of it itself: it ran `git pull` (which fast-forwarded
    Human's `main`, 131 files), read code with the shell, and proposed a
    design. It called no SLP tool. The Lead never got a message. The ledger
    is empty;
  - group `bd9b8adc` (workspace `wks_77f673d1af12a67a`): one question about
    the Supervisor's context, answered by the Supervisor. Its answer shows
    the context it inherits: Human's global `CLAUDE.md`, memory, skills,
    connectors, and the `Agent` and `Workflow` tools;
  - causes: the Supervisor's text describes only "intake, then the goal to
    the Lead", with no rule for questions, analysis, or small commands; the
    Supervisor has every tool needed to do the work; the process report has
    no signal for a Supervisor working on the project.

## Scope

In scope:

- A written definition of each role: purpose, what it owns, what it does
  and does not do, how it routes each kind of incoming message, its tools,
  and its hand-offs.
- A scenario suite with expected behavior per role, a baseline on v0.1.0,
  and tuning runs until the scenarios pass.
- A report signal for a Supervisor that changes the project or runs
  commands on it.
- Per-role default instructions, rewritten from `SHARED` and the role texts.
- Per-role SLP tool lists, offered in `tools/list` and enforced at call.
- No question tool for Lead and Peer (Claude `AskUserQuestion`).
- A Peer's ledger view limited to its own work.
- Settings v2: per-role instructions and tools, with reset to defaults.
- Templates: storage, the `SKILL.md` format, a UI to load and edit them,
  the catalog in Supervisor and Lead instructions, a Lead tool to load a
  body, a template field on assignments, and per-template report counts.
- A few default templates.
- Live proof on the dev daemon (port 6768).

Out of scope:

- Several Supervisors or Leads (0008 item 7).
- Lead handoff, or Peers that delegate.
- Provider-native skill folders.

## Approach

Each slice ends with `vitest`, `tsc --noEmit`, and a live check where it
changes member behavior.

1. **Role definitions and scenarios.**
   - Write each role's definition, for Human to accept. Per role:
     - purpose and what it owns;
     - what it does, and what it never does;
     - routing: for each kind of incoming message (a question about the
       group or the conversation, a status question about the project, an
       analysis request, a small command, a change request, a rough goal, a
       correction, a choice for Human), whether the role handles it or
       passes it, and to whom;
     - its tools, its hand-offs, and when its part is done.
   - Draft the Supervisor's routing as a narrow option B (Human,
     2026-10-02). One rule: the Supervisor answers only from the project's
     records and the ledger. It reads the records (product docs,
     decisions, plans, README, `AGENTS.md`) to know the outcome. It reads no
     code, runs no command on the project, and proposes no design.
     Anything else goes to the Lead. If tuning shows the Supervisor
     crossing that line, fall back to option A: everything about the
     project goes to the Lead.
   - Scenario suite, starting from Human's test messages: a status question
     the records answer, a status question only the code answers, small
     command (`git pull`), analysis request, rough change goal,
     question about the group's own context, mid-run correction, a choice
     outside agent authority; for the Lead, work it is tempted to do itself;
     for a Peer, a fix in another owner's scope. Each scenario states the
     expected route, the expected SLP tool calls, and the forbidden actions.
   - Baseline: run the suite on v0.1.0 instructions.
2. **Role contexts.**
   - Turn the accepted definitions into per-role instructions. Each default text holds only the rules
     that role acts on (see the analysis in 0008's Context). Fill in
     provider tool names and settings limits at creation.
   - Move the Lead's model heuristic out of its text, into a template.
   - Offer each role only its tools. Default tool lists:
     - Supervisor: `slp_group`, `slp_ledger`, `slp_send`, `slp_finding`,
       `slp_decide`, `slp_revise_decision`;
     - Lead: all eight, plus the template tool from slice 5;
     - Peer: `slp_ledger` (own view), `slp_send`, `slp_finding`.
   - Preapprove only the role's tools. Refuse a call outside the list.
   - Create Claude Lead and Peer with `AskUserQuestion` disallowed (Lead
     also `Agent` and `Task`). Codex members have no question tool unless
     Human enables it in Codex's `config.toml` `[features]`; the plugin
     leaves that file alone.
   - Peer ledger view: its assignments, its findings, and the decisions
     that name it in `notify` or settle its findings.
   - Supervisor: remove the provider tools it needs only to work on the
     project (for Claude: `Edit`, `Write`, `NotebookEdit`, `Agent`, `Task`),
     if the accepted definition says it does not work on the project. Shell
     stays, as a convention.
   - Report: count a Supervisor's shell commands and file changes on the
     project as convention breaks.
3. **Tuning.**
   - Run the suite on the dev daemon, against a scratch clone, never
     Human's checkout. Run each scenario at least twice, with the
     Supervisor on both Opus and Sonnet.
   - For each miss, change the definition or the instruction text, record
     what changed and why, and rerun the suite.
   - Stop when every scenario passes on two runs in a row, or when a miss
     needs a choice only Human can make.
   - Record per run: the instruction version, routing per scenario, tool
     calls, cost, and time.
4. **Settings v2.**
   - Per role: provider and model (Peers: the allowlist), mode,
     instructions, tools. Defaults come from slices 2 and 3.
   - Migrate v1 values, keeping Human's providers, models, and modes.
   - Settings screen: a multiline editor per role's instructions, a tool
     checklist, and "reset to default" per field.
   - Record a hash of each member's instruction text at creation, and show
     it in the process report.
5. **Templates.**
   - Storage in plugin data, one `SKILL.md` text per template, parsed for
     `name` and `description` front matter and a "when to use" line.
   - RPCs to list, save, and remove templates; a UI section to paste or
     edit a `SKILL.md`, and to import the `SKILL.md` files from a folder
     path on the host.
   - Catalog (name, description, when to use) in the Supervisor's and the
     Lead's instructions, per their template settings.
   - Lead tool `slp_template` returns a template's body; an event records
     the load.
   - `slp_delegate` takes an optional `template`; the report counts
     assignments, acceptance, rework, and reopens per template.
   - A template applies to one goal, not to the workspace. Default texts:
     the Supervisor may pass Human's template choice for a goal as a
     constraint on that goal, or suggest one as its own non-binding
     suggestion; the Lead may use, combine, or adapt templates per goal.
   - Default templates: independent review, blind parallel designs, the
     same question on different models, test audit, and model choice by
     work kind.
6. **Live proof.**
   - Live run on the dev daemon: `tools/list` per role; no
     `AskUserQuestion` for Lead or Peer; a Peer's ledger view; a template
     loaded through the UI, suggested by the Supervisor, loaded by the
     Lead, and counted in the report; settings edited in the web app.

### Slice 1 Baseline Results (2026-10-02)

v0.1.0 instructions, dev daemon 6768, a fresh seed per run
(`scripts/role-seed.sh`). The operating agent played Human
from the suite's scripted answers; nothing outside the script came up.
Supervisor Opus unless marked; Lead Sonnet. "Narrow-B break" means the
Supervisor read code, or ran a command on the project, which the draft
definition forbids.

| Scenario | Result | What happened |
| --- | --- | --- |
| R1 S1 group question | pass | `slp_group` only. |
| R1 S2 status from records | fail | Answered from `docs/plan.md`, but also grepped `notes.py` "to check the plan against the code". |
| R1 S3 status from code | fail | Read `notes.py` and answered itself; the Lead got nothing. |
| R1 S4 `git pull` | fail | Ran `git pull` itself. |
| R1 S5 analysis | pass | Sent to the Lead as analysis only, with "departures from 0001 come back to Human"; relayed the result as the Lead's, then asked Human with the question tool. |
| R1b (Sonnet) S1 | pass | |
| R1b S2 | pass | Records only (through the shell). |
| R1b S3 | fail | Read the code with a search tool and answered itself. |
| R1b S4 | fail | Ran `git pull` itself. |
| R1b S5 | fail | Did the analysis itself and proposed fixes; the Lead was never used. Same as Human's own test. |
| R2 S6 conflict with 0001 | pass | Named the conflict at intake with options and a recommendation, recorded a pending decision, and held renumbering back from the Lead. |
| R2 S7 correction | pass | Recorded (source "human"), sent to the Lead; the Lead added the y/n prompt with tests. |
| R3 S8 three-part goal | fail | One Peer got all three parts in one assignment. The brief had scope and out-of-scope lines, and the Lead re-ran the tests before accepting. |
| R3 S9 cross-scope fix | not exercised | The Lead put UTF-8 output into the brief, so the cp1252 crash was in the Peer's scope; it fixed it there. |

Across runs:
- **The Supervisor works on the project in every run.** Besides the
  table, in R2 and R3 it read the code at intake, read diffs, ran the
  tests, and ran the CLI to check the Lead's report. Opus still routes
  analysis to the Lead; Sonnet does everything itself.
- **"Check the result against Human's goal"** is read as re-running the
  Lead's checks. The definition must say how the Supervisor checks:
  against Human's decisions, using the Lead's evidence and the ledger.
- **Reading records through the shell** (`cat docs/...`) makes "no
  command" hard to observe. Simplest fix to try: the Supervisor reads
  files with its read tool, and has no shell use on the project.
- The Lead attributed its own inference to Human once: "use utf-8
  explicitly" under source "Human, docs/product.md".
- In R2 the Lead migrated Human's real `notes.json`, which Human's D3
  allowed, with a byte-identical backup.
- Intake, conflicts with records, pending decisions, and corrections all
  held (R2). The report has no signal yet for the Supervisor's own shell
  use (slice 2).
- Cost: R1 $0.71, R1b $0.18 (the Lead was never used), R2 $0.97, R3
  $0.87. About 20 minutes in all.

## Risks And Recovery

- **Settings migration loses Human's values.** Test the v1-to-v2 migration;
  reset to defaults is available in the UI.
- **Human's edited instructions drop a required behavior.** The report shows
  the instruction hash per member; reset restores the defaults.
- **Hiding tools breaks a running group.** Members keep the configuration
  they were created with; new rules apply to new groups and new Peers.
- **Claude renames `AskUserQuestion`.** The block fails silently, as in 0006;
  the report still counts a Lead's or Peer's native question.
- Recovery: revert the slice's commits; plugin state and settings stay
  readable because v2 migration is additive.

## Progress

- [x] Analysis and Human's decisions (0008).
- [x] Slice 1: role definitions (draft), scenario suite, v0.1.0 baseline
  (results below).
- [ ] Slice 2: role contexts.
- [ ] Slice 3: tuning until the scenarios pass.
- [ ] Slice 4: settings v2.
- [ ] Slice 5: templates.
- [ ] Slice 6: live proof.

## Decisions

- 2026-10-02: Human settled the five questions recorded in 0008.
- 2026-10-02: Human clarified that a template coordinates agents for one
  goal; it is not chosen for the whole workspace. Human also stated that
  Codex has no question tool unless enabled in `config.toml` `[features]`,
  which replaces the planned Codex probe.
- 2026-10-02: Human asked for a clear definition of each role, tuned and
  tested by experiment, as a task in this plan (slices 1 and 3), after the
  Supervisor did Human's requests itself and never used the Lead.
- 2026-10-02: Human chose to try a narrow option B: the Supervisor reads
  the records to know the outcome and answers what the records and the
  ledger answer; everything else goes to the Lead. Option A is the
  fallback. Human reminded: keep it simple and effective.
- Open: Human accepts the Supervisor's definition after the tuning
  evidence.
- 2026-10-02 (agent, Human may revisit): templates are stored in plugin
  data rather than in settings, so long bodies do not bloat the settings
  document; the UI also imports from a host folder because the plugin UI
  has no file picker.
- 2026-10-02 (agent, Human may revisit): the Supervisor keeps
  `slp_finding` by default, for drift it sees across scopes.

## Validation

- Focused proof: `vitest` for tool lists per role, call refusal, Peer
  ledger view, settings migration, `SKILL.md` parsing, the template tool,
  and report counts.
- Scenario proof: the suite's results per run in slices 1 and 3.
- Integration or end-to-end proof: the live run in slice 6, in the web app
  and on the dev daemon.
- Repository-required checks: `npm test`, `npm run typecheck`,
  `harness status`.

## Result

Pending.
