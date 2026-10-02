# Execution Plan: Per-Role Configuration And Templates

Date: 2026-10-02

## Status

Active. Decisions settled by Human on 2026-10-02 (decision 0008). Human
added the role-definition task on 2026-10-02 (slices 1 and 3). No code
changed yet.

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
   - Draft the Supervisor's routing as option A of the 2026-10-02 analysis:
     the Supervisor does not work on the project; every request that needs
     reading or changing the project goes to the Lead. Option B (small
     read-only questions answered by the Supervisor) is tried only if A
     proves too slow or costly in slice 3.
   - Scenario suite, starting from Human's test messages: status question,
     small command (`git pull`), analysis request, rough change goal,
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
3a. **Experiment: does the Supervisor earn its place?** Proposed,
   awaiting Human (2026-10-02). Human's question after tuning run 1: with
   one-off questions, the Supervisor only relayed, and cost more than the
   Lead ($0.52 against $0.42 for 4 messages). Its value, if any, should show
   on longer work with rough input and choices. Tuning of the Supervisor's
   hand-off waits for this result.
   - Arms, same models for the Lead (Sonnet) and Peers:
     - **A, with Supervisor:** Human, then Supervisor (Opus), then Lead,
       then Peers, as on `slp/role-tuning`.
     - **B, without Supervisor:** Human talks to the Lead, which does intake,
       asks Human through its question tool, records Human's decisions, and
       delegates to Peers. Experiment-only: a hidden settings key on the
       tuning branch, not released.
   - Tasks, each on a fresh scratch clone of `paseo-plugin` at the same
     commit, each run in both arms:
     - **T1, code:** the controller sends a "still running" message for each
       worker retry notification (seat-continuity scenario 4 follow-up).
     - **T2, docs:** there is no product doc for `paseo-telegram-account`.
   - Human's side: the operating agent plays Human with Human's rough first
     message and a hidden intent sheet (`D:/codes/slp-test/intent-T1.md`,
     `intent-T2.md`, outside both repositories). It reveals a fact only when
     asked, or when a result breaks it, and answers anything else "tùy em".
     Human approves the sheets before the runs.
   - Measures per run:
     - hidden facts surfaced before work starts, and facts that caused
       rework after;
     - Human's effort: messages sent, questions received, and how many were
       real owner choices;
     - the result against the sheet's acceptance list, and tests where they
       apply;
     - drift: work outside the asked outcome or scope;
     - time to done, and cost per role.
   - Human compares the two results of each task blind, labelled X and Y.
   - Reading: if A is not clearly better on surfaced facts, rework, Human
     effort, or result quality, the Supervisor is simplified or made
     optional, under 0008's tuning. If A is better only on long tasks, the
     Supervisor gets a lighter path for one-off questions.
   - Estimated cost: 4 runs at about $3-8 each.
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
- [ ] Slice 1: role definitions, scenario suite, v0.1.0 baseline.
  - [x] Draft definitions: `docs/product/roles.md` (awaiting Human).
  - [x] Scenario suite S1-S10 and a baseline from earlier evidence:
    `docs/product/role-scenarios.md`. S2-S4 fail, S5 and S7 partial,
    S10 not run.
  - [ ] Human accepts or corrects the definitions.
- [x] Slice 2 draft: role contexts on branch `slp/role-tuning` (`e53224f`),
  and a fix for duplicate decisions on a bad notify target (`ca9cde6`).
- [ ] Slice 3: tuning until the scenarios pass.
  - [x] Run 1 (2026-10-02, workspace `wks_21bf091544cd3361`, Supervisor
    Opus, Lead Sonnet, Human's daemon by Human's request, scratch clone):
    S1-S4 pass, against S2-S4 failing on v0.1.0. Human answered the
    Supervisor's one question in the app. Found: the Supervisor's hand-off
    mixes Human's words with its own inferences and methods under "Human
    asks:", and the Lead follows them (S2 tried to run tests; S4 followed
    the Supervisor's report outline).
  - [x] Slice 3a runs (2026-10-02, Human's daemon, clones of `paseo-plugin`
    at `8c7eef6` with push disabled; working notes in
    `D:/codes/slp-test/results.md`):
    - T1 (code): A passed every acceptance item, B shipped a fix that
      suppresses a give-up message after an announced retry (H2) and added
      an unrequested amendment to the project's decision 0003. Cost A $2.33,
      B $0.81.
    - T2 (docs): both reached H1-H6 after one correction; A's Supervisor had
      the Lead verify claims against code, which fixed 2 wrong claims that
      B kept one of. Cost A $1.02, B $0.41.
    - Neither arm did intake before work. The Supervisor's value showed as
      critical review of the Lead's result on Human's behalf, not as
      intake. A cost 2.5-2.9x B; Human's message count was equal; A asked 2
      engineering questions that were not Human's.
  - [ ] Human's blind comparison (X/Y) and Human's reading of 3a.
  - [ ] S5-S10.
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
- 2026-10-02: Human asked to run tuning on Human's own daemon (6767), with
  the operating agent playing Human through rough, natural messages, not
  spoon-fed ones. Runs use a scratch clone, never Human's checkout.
- 2026-10-02: after run 1, Human questioned the Supervisor's value for
  one-off questions and asked for an evaluation (slice 3a).
- Open: how far the Supervisor works on the project (option A or B). The
  draft uses A; Human accepts the definition after the tuning evidence.
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
