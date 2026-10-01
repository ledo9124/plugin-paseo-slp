# Execution Plan: SLP Plugin v0.1

Date: 2026-10-01

## Status

Active. Slices 0-6 are complete; slice 7 trials are done, with live runs
played by the agent. See Handoff.
- Decision 0006 now blocks provider subagents for the Lead.
- Decision 0007 records what SLP is: three jobs (complete the input,
  filter decisions by authority, keep Human in control), four layers, and
  independence from Repository Harness. Slice 7 tests the first ideas that
  serve it.
- Settled in slice 7:
  - native questions: I2 kept;
  - when a Lead delegates: the Lead's own judgment (Human);
  - I1 not taken, I5 not built, I4 added as role text;
  - read-back: only interpreted points, gated only when a misread is
    costly;
  - the Supervisor stops at the outcome and constraints;
  - agent choices inside a delegation may be reported in messages.

## Handoff (2026-10-01, end of session)

Start here in a new session. Read, in order:
1. `docs/product/overview.md` (outcome, layers, behaviors 1-12);
2. `docs/decisions/0007-what-slp-is.md`;
3. this plan's "Slice 7 Results";
4. `docs/RUNBOOK.md` before running a daemon.

State:
- `main` holds everything; the working tree is clean.
- Tests: 47 pass. Run them with `node node_modules/vitest/vitest.mjs run
  --root plugins/slp` and `node node_modules/typescript/bin/tsc --noEmit
  -p plugins/slp`.
- No daemon is running. Port 6767 is the user's app; never touch it.
- Live runs B-D used temporary repositories under
  `%TEMP%/slp-live/` (helper scripts `cli.sh` and `rpc.sh` are there).
  They are scratch, not records.

Next steps, in priority order. None of these is decided policy; ask Human
where a choice is open:
1. **A live run with Human playing Human.** Parts B-D were played by the
   operating agent, so their evidence is weak. Use real work with a choice
   that surfaces only mid-run.
2. **I4, the scope rule.** It is still not exercised, because the Lead
   delegated only once. It needs a task large enough that the Lead
   chooses to delegate. Do not force delegation (Human: the Lead judges).
3. **Watch two deviations from Part D:**
   - a mid-run question asked in chat instead of as a pending decision;
   - a full read-back where the rule asks for only the interpreted
     points.

   Act only if they repeat, following the simple-and-effective principle.
   Options: sharper Supervisor text, or a Process report count of chat
   questions.
4. **Minor:** agents wrote the delegation basis into `projectRecord`,
   which is meant for a project file path. Either say in `slp_decide`'s
   description where the basis goes, or accept it.
5. **Closing v0.1:** when Human accepts the slice 7 results, move this
   plan to `docs/plans/completed/` and record the result.
- Slice 1 ran probes 2 and 4 on both Claude and Codex.
- Decision 0004 settled the messaging question, and decision 0005 replaced
  the free toggle.

## Outcome

A Paseo user installs this plugin into stock Paseo and turns SLP on for a
workspace. The resulting group meets the required behavior in
`docs/product/overview.md`, with live proof on at least one real provider.
With SLP off, agents behave exactly as without the plugin.

## Context

- Product: `docs/product/overview.md`.
- Architecture and capability map: `docs/ARCHITECTURE.md`.
- Decisions:
  - 0001: coordination plugin on Paseo primitives;
  - 0002: toggle instead of modes;
  - 0003: the ledger is coordination state, not project truth;
  - 0004: member messaging through a plugin send tool;
  - 0005: the SLP mode locks at the first message, and archiving the
    workspace ends the group;
  - 0006: the SLP Lead cannot use its provider's own subagents;
  - 0007: what SLP is, its layers, and its independence from Harness.
- Method sources and prior analysis: `docs/research/sources.md`. The earlier
  `paseo-slp` fork is not a decision basis.

## Scope

In scope:

- Per-workspace SLP mode that locks at Human's first message (0005).
- Group start with a Supervisor and a Lead.
- Role instructions and the brief structure.
- A Lead-only delegate tool.
- The coordination ledger.
- Handback.
- A Human ledger panel with decisions.
- Process telemetry.
- Restart reconciliation.

Out of scope for v0.1:

- Runtime enforcement of ownership or routing.
- Paseo-side message queueing. Plugin-side delivery after a turn is in
  scope (decision 0004).
- Supervisor visibility across workspaces.
- Handoff or context replacement.

## Approach

Each slice ends in live proof on a dev daemon (`docs/RUNBOOK.md`), recorded
with commands and observed results.

0. Repository, Harness core, decisions, product docs, and a no-op plugin
   skeleton. Done.
1. **Platform probes on stock Paseo** (a throwaway probe build of the
   plugin). Each probe records its result in this plan:
   0. **Paseo tools in members.**
      - List a plugin-created agent's tools, once with
        `daemon.mcp.injectIntoAgents` left at its default and once with it
        enabled.
      - If the tools appear only when it is enabled, record that as a setup
        requirement in `docs/RUNBOOK.md`.
      - If Human will not enable it, revisit decision 0001.
   1. Install and reload the plugin.
   2. **Plugin MCP route.**
      - A plugin-created agent reaches a plugin-hosted HTTP MCP endpoint with
        a per-member secret, on Claude and on Codex.
      - The secret still works after the agent is resumed.
   3. **`parent` and handback.**
      - Create an agent with `parent` and `systemPrompt`, then archive the
        parent. Record whether the child is archived too, and whether the
        parent receives any finish notification.
      - Decide whether to use `parent`, or to keep parentage in the ledger.
      - Either way, handback is relayed at `agent.turn_ended`.
   4. **Busy send.** Does a built-in `send_agent_prompt` to a busy agent
      steer or replace its turn, per provider?
   5. **Reconciliation.**
      - Create two labeled members with `idempotencyKey`, restart the daemon,
        and rebuild membership from labels and plugin files at the first hook
        or RPC.
      - Keep the approach if no member is lost.

   If 0, 2, or 3 fails, revisit decision 0001 before slice 2.
2. **SLP mode and group start** (decision 0005).
   - A per-workspace SLP mode, stored by the plugin, switchable until
     Human's first message in the workspace.
   - That first message locks the mode, on or off.
   - Switching on creates a Supervisor and a Lead with their role
     instructions, in the workspace, using the configured provider, model,
     and mode. Switching off before the lock archives them.
   - Switching on is refused while `daemon.mcp.injectIntoAgents` is off.
   - Archiving the workspace ends the group.
   - An SLP workspace panel (mode switch, lock state, members) and a
     workspace header button showing the mode.
   - Plugin settings for the Supervisor and Lead provider, model, and mode.
   - Role instructions are written from the product overview, not copied
     from earlier SLP texts.
   - Live proof: server behavior through RPCs on a dev daemon, and the
     client panel and button in the web app.
3. **Delegation, ledger, handback.**
   - The delegate tool requires the brief structure: goal, binding
     constraints with their source, current choice, uncertainties, and
     reopen evidence.
   - Ledger tools: ownership claims, findings (reopen, dependency, blocker),
     decisions with their source, and acceptance.
   - Handback reaches the Lead.
   - The member send tool (decision 0004):
     - two delivery kinds: steer, or after the recipient's turn;
     - a held-message store in plugin files;
     - delivery at `agent.turn_ended`, plus reconciliation for missed
       events.
   - Reconciliation after a restart.
   - Human's slice 3 choices (2026-10-01):
     - Peers use a provider/model from an allowlist in settings, with a
       mode per provider;
     - at most 4 active Peers per group (a setting);
     - Peers live until the workspace is archived;
     - handback reaches the Lead after the Lead's turn.
   - Tools, gated by the caller's role (identity from the member secret):
     - `slp_delegate` (Lead): create a Peer with a brief, or reassign a
       Peer that has no open assignment;
     - `slp_accept` (Lead): accept or reject a handed-back assignment;
     - `slp_finding` (any member): record a reopen, dependency, blocker, or
       other finding with evidence; the Lead is told;
     - `slp_decide` (Lead, Supervisor): record a decision with its source,
       pending or settled, linked to a finding and to the project record;
     - `slp_send` (any member) and `slp_group` / `slp_ledger` (read).
   - The ledger also keeps an append-only event list for slice 5
     telemetry.
4. **Human panel.**
   - Shows briefs, constraint sources, open findings and pending decisions,
     and ownership.
   - A Human decision is written to the ledger and sent to the affected
     owner.
   - Human's slice 4 choices (2026-10-01):
     - the ledger views extend the existing SLP workspace panel; there is no
       second panel;
     - from the panel, Human can settle a pending decision or record a new
       one, optionally on an open finding. Both are recorded as
       `source: human`, settled, and a settled decision resolves its open
       finding;
     - a panel decision is sent only to the Supervisor. The Supervisor
       decides whether and how to tell the Lead and Peers;
     - the panel offers no other actions in v0.1: no findings, ownership
       changes, or acceptance by Human.
   - Human's choices on the slice 4 observations (2026-10-01):
     - pending decisions get full create, read, update, and delete. Agent
       choices within that:
       - only the member that recorded a pending decision may update or
         withdraw it, and only while it is pending;
       - "delete" withdraws the decision (status `withdrawn`, with a
         reason) rather than erasing it. This keeps decision ids unique and
         the history visible;
       - when the Lead revises one, the Supervisor is told;
     - attribution to Human is fixed by instructions only (option A).
       `source: "human"` and a constraint source of "Human" are only for
       what Human actually said; derived points name the agent and the
       Human decision they come from. No new restriction in the plugin.
5. **Telemetry.** Counts of escalations, reopens, acceptance outcomes,
   message rounds, busy-send violations, agents created outside the delegate
   tool, and Human interventions, with a readable per-group report.
   - Human's slice 5 choices (2026-10-01):
     - the report is a "Process" section of the SLP panel, with a "Copy"
       action for a Markdown version, plus a `slp.report.get` RPC. Nothing
       is written into the project;
     - a Human intervention is a message Human sends straight to the Lead
       or a Peer, bypassing the Supervisor. Human decisions and Human
       messages to the Supervisor are reported on their own lines, not as
       interventions;
     - tokens and cost per role are included and labeled as estimates.
   - Agent definitions:
     - escalations: pending decisions raised, then how each ended
       (answered by Human from the panel or through the Supervisor,
       withdrawn, still pending);
     - message rounds: `slp_send` messages per sender and recipient role,
       with delivery kind (after-turn delivered, held, steer). Plugin
       notices and handbacks are counted separately;
     - busy-send violations: a member's call to Paseo's built-in
       `send_agent_prompt`, which replaces a busy recipient's turn
       (decision 0004). Plugin steers are allowed and counted separately;
     - agents created outside the delegate tool: an agent created in an SLP
       workspace without the group's label, and a member's call to the
       built-in `create_agent`;
     - Human messages: user messages in a member's turn timeline that the
       plugin did not send. Tool calls and messages are deduplicated by id,
       because a timeline can repeat earlier turns;
     - tokens: the agent's `lastUsage` after each completed turn, summed
       per role. Claude reports per-turn usage and cost; Codex reports the
       last turn's tokens and no cost.
6. **Evaluation.**
   - Run the deferred premise-narrowing brief experiment, recorded in
     `repository-harness`
     `docs/plans/completed/harness-improvement-product-outcomes.md`.
     Scenario N is a narrowed brief to enlarge a send history; scenario K is
     the control. Compare a narrowed brief with the slice 3 brief structure.
   - Then run one field run on a real project.
   - Human's slice 6 choices (2026-10-01):
     - the field run is the N/K experiment itself. An SLP group in
       `repository-harness` designs it, registers it in advance, builds the
       fixtures under `harness-experiments`, runs it, and records the
       result in `repository-harness`. This covers both parts of slice 6;
     - the group works in a Paseo worktree workspace of
       `repository-harness`. Agents may commit on its branch, but never
       push or open a PR; Human reviews and merges;
     - budget: 5 runs per arm with fresh `sonnet` workers, which is N and K
       times two brief formats, 20 runs. The stop rule is registered in
       advance;
     - Human answers the group's questions; the operating agent relays
       them and does not answer for Human.

7. **Outcome trials (decision 0007).**
   - Each trial is an idea that passed 0007 item 5 (see
     `docs/research/sources.md`). It is a small, reversible experiment with
     a Keep or Remove signal.
   - Human asked, on 2026-10-01, to record the outcome first and then
     start. The order I3, I2 was the agent's proposal.
   - I1 (the Lead does not edit the repository) is not taken. Human,
     2026-10-01:
     - whether the Lead edits itself or delegates is the Lead's own
       judgment;
     - "the smallest sufficient topology" means building what is simple
       and effective instead of what is complex. It guides how this
       toolkit is built. It is not a rule about what the Lead or a Peer
       does.
   - I4 and I5 come later.
   - **I3: intake read-back and explicit delegation** (behaviors 11 and
     12). Role text only.
     - The Supervisor asks its intake questions together, then reads back:
       the outcome, constraints with sources, Human's decisions, what
       Human delegates, and what is open.
     - A delegation is recorded as a Human decision with its scope.
     - An agent decision names the delegation or record it rests on, or
       it stays pending.
     - Keep if every agent decision traces to a delegation or a record, or
       goes to Human. Remove if the read-back adds a round and changes no
       decision.
   - **I2: native questions made visible** (behaviors 7 and 12). Observe
     only; nothing is blocked (decision 0001).
     - The plugin records a member's `agent.permission_requested` of kind
       `question`, and its `agent.permission_resolved`.
     - The panel shows each unanswered native question. The process report
       counts them per role.
     - Role text: intake questions are asked in the conversation, and
       mid-run choices for Human are pending decisions. Neither uses the
       provider's own question tool.
     - Keep if no member turn waits on a native question, and every
       question to Human is visible in the panel. Remove if Human prefers
       the native question UI.
   - Live proof needs Human:
     - one group whose goal Human writes with incomplete input on purpose;
     - observed: the read-back, the recorded delegation, whether each
       agent decision names its basis, any native questions, and questions
       from the Lead that intake should have settled.

## Risks And Recovery

- **The plugin MCP route or Peer creation fails on a provider.** Slice 1
  fails early. Recovery: revise 0001, either by narrowing provider support or
  by relaying handbacks at `agent.turn_ended`.
- **Busy sends disrupt Peers.** Recovery: telemetry measures it. If
  instructions cannot fix it, propose plugin-side queueing in a new decision.
- **Agents bypass conventions** (built-in `create_agent`, editing another
  owner's scope). Recovery: make it visible in the ledger and panel, then
  tune instructions. Enforcement needs evidence and a new decision.
- **Instructions reward manufactured disagreement.** Recovery: the slice 6
  control scenario measures over-challenge; revise the instructions.
- **The ledger drifts into project truth.** Recovery: the Lead's
  instructions promote lasting decisions to the project (0003); review in the
  field run.

## Progress

- [x] Slice 0: repository, Harness core 0.1.16, decisions 0001-0003, docs,
  no-op skeleton.
- [x] Slice 1: platform probes on stock Paseo v0.10.2. All probes ran on
  Claude; probes 2 and 4 also ran on Codex (`gpt-6-luna`). Results below.
- [x] Slice 2: SLP mode, lock, and group start and end; panel, header button,
  and settings. Proved live on `v0.10.2` (see Slice 2 Results).
- [x] Slice 3: messaging, delegation, ledger, handback, acceptance, findings,
  decisions, and reconciliation. Proved live on `v0.10.2` with Claude members
  and a Codex Peer (see Slice 3 Results).
- [x] Slice 4: Human panel: ledger views and Human decisions to the
  Supervisor. Proved live on `v0.10.2` in the web app and through RPCs (see
  Slice 4 Results).
- [x] Slice 5: telemetry: the process report in the panel and through
  `slp.report.get`. Proved live on `v0.10.2` (see Slice 5 Results).
- [x] Slice 6: brief-format evaluation and field run, done together as
  the N/K experiment run by an SLP group in `repository-harness` (see
  Slice 6 Results). Two SLP observations are open for Human.
- [ ] Slice 7: outcome trials (decision 0007).
  - [x] I3: intake read-back and delegation (role text).
  - [x] I2: native questions visible (event, panel, report, role text).
  - [x] Live run, with the operating agent playing Human at Human's
    request (see Slice 7 Results).
  - [ ] A live run with Human, on work with a mid-run choice.
  - [x] I1: not taken (Human: the Lead judges for itself).
  - [x] I4: briefs say what is out of scope; a Peer changes only what the
    goal needs (role text). Live check in Part C.
  - [x] I5: not built for now (see Slice 7 Results).
  - [x] Part C live run (see Part C results). The read-back gate was
    missed once.
  - [x] Part D live run: the read-back gate held. I4 is still not
    exercised, because the Lead worked alone.

## Decisions

- 2026-10-01: Plugin id `slp`, installed from `plugins/slp`. Provisional;
  change it before the first install if needed, because a daemon config key
  does not follow a later manifest rename.
- 2026-10-01: Supervisor visibility across workspaces is deferred until a
  single group works. This was an agent proposal; Human may revisit it.
- 2026-10-01: Seat ideas from Seatworks v3, reviewed as a reference only and
  approved by Human for trial.
  - Adopted:
    - assignments and roles in the ledger with `agentId` as the current
      occupant (slice 3);
    - `slp.*` labels plus `idempotencyKey` on create (slices 2-3);
    - a thin `PaseoHost` adapter with a test fake (slices 1-2);
    - a delegate tool that passes provider and model through (slice 3).
  - Deferred:
    - per-role provider overlays and tool restriction (enforcement);
    - reseat and handoff.
  - Rejected:
    - seat config directories, deny-lists, and permission bypass;
    - lanes, worktree slots, and merge queues;
    - plugin-owned mail and watchers;
    - writing into the project's `AGENTS.md`.

- 2026-10-01: Slice 1 runs on an isolated home
  (`C:\code\my-project\paseo-upstream\.dev\paseo-home`, port 6768), not the
  shared dev home, which `my-plugin` uses with `injectIntoAgents: true`.
  Human chose this and allowed enabling `injectIntoAgents` there.
- 2026-10-01: Slice 1 first covered Claude only. Human then approved Codex
  with `gpt-6-luna` through their local proxy.
- 2026-10-01: Acceptance target is the `v0.10.2` release tag, not upstream
  main. Agent choice within the handoff's "main or release tag": the manifest
  requires `>=0.10.2`, the SDK is pinned to 0.10.2, and the shared fork
  branch is `v0.10.2` plus one patch. Upstream main `d30e99c85` reports
  version 0.10.0 (the 0.10.x releases are cut on a separate branch), so the
  daemon would reject this manifest there.
- 2026-10-01: Keep parentage in the ledger; do not pass `parent` to
  `agents.create` in v0.1. Agent decision from probe 3; Human may revisit.
  - Archiving a parent archives its children, so archiving a Lead occupant
    would silently end its Peers, against decision 0002 item 4.
  - `parent` brings no finish notification for plugin-created children, and
    creation fails when the parent is not loaded.
  - Handback is relayed at `agent.turn_ended` either way.

- 2026-10-01: Human accepts `daemon.mcp.injectIntoAgents: true` as a setup
  requirement, as long as it does not change SLP lifecycle. Per-agent tool
  separation would be a separate matter. Upstream has no per-agent tool
  restriction, and v0.1 does not enforce (decision 0001).
- 2026-10-01: Human runs agents in auto or bypass modes, not Claude's
  default. Members must not depend on per-call Human permission prompts.
  The plugin passes the member mode explicitly; plugin settings configure
  it (slice 2).
- 2026-10-01: Human's slice 2 defaults:
  - Supervisor `claude/claude-opus-5-5`, mode `auto`;
  - Lead `claude/claude-sonnet-5-5`, mode `auto`.
  They are plugin settings that Human can change.
- 2026-10-01, after slice 5: Human made every SLP member default to its
  provider's bypass mode, changeable in settings. The trigger was a Haiku
  Peer in `auto` that waited on 18 permission prompts.
  - Defaults: Claude `bypassPermissions` for the Supervisor, the Lead, and
    Peers; Codex `full-access`. The models are unchanged.
  - The settings screen now also edits the Peer models, the modes per
    provider, and the active Peer cap.
  - This replaces the `auto` modes in the slice 2 and slice 3 defaults.
- 2026-10-01: Agent decision for slice 3: Peers are never archived before
  the workspace, and only 4 may be active, so `slp_delegate` can give a new
  assignment to an existing Peer that has none open. This keeps the
  adopted model: the ledger records assignments, with `agentId` as the
  current occupant.
- 2026-10-01: Human keeps `daemon.mcp.injectIntoAgents: true` required for
  SLP: members use Paseo's own `list_agents` and `get_agent_status`, and the
  plugin does not re-implement them. Messaging still goes through the plugin
  tool (0004).
  - The plan's rejection of Seatworks "permission bypass" covered its
    deny-list and config-directory mechanism. It does not cover using a
    provider's own permission mode.

## Slice 7 Results

Docs (2026-10-01):
- Decision 0007 records what SLP is.
- `docs/product/overview.md` takes the three jobs, the four layers, and
  behaviors 11 and 12.
- `docs/product/slp-and-harness.md` states the boundary with Harness.
- `docs/research/sources.md` records the v0.2 draft and the second
  Seatworks read.

I3, intake read-back and delegation (role text only, `server/roles.ts`):
- Shared rule: authority decides who decides, not reversibility. An agent
  decision names what it rests on. Members do not ask Human through the
  provider's own question tool.
- Supervisor: intake comes first. It asks its questions together, ends
  with a read-back (outcome, constraints with sources, Human's decisions,
  delegations with scope, open items), and records each decision and
  delegation as `source: "human"`. It gives the Lead the delegation ids.
  It settles a choice itself only inside a recorded delegation or record.
- Lead: sorts every question into three kinds. A pending decision carries
  options, consequences, and a recommendation.
- The `slp_decide` description says an agent decision names its basis.

I2, native questions (observe only):
- `Coordination.onPermissionRequested` and `onPermissionResolved`, wired to
  `agent.permission_requested` and `agent.permission_resolved`.
- `slp.ledger.get` returns `nativeQuestions`, the open ones.
- The panel shows "Asked in a member's chat (n)", with an "Open" action
  per question.
- The report adds "Questions to Human through a provider's own tool" under
  convention breaks.

Focused proof:
- `tsc --noEmit` passes.
- `vitest` passes 47 tests, including 2 new ones:
  - a member's question is listed until it is resolved, and the report
    counts it per role, with the unanswered count;
  - tool permissions, agents outside the group, and unknown resolutions
    are ignored.
- `harness status` and `doctor` pass.

Live run protocol, registered before the run (2026-10-01):
- Human asked the operating agent to run the test itself ("Mày tự test
  đi"). So the agent plays Human, following a script fixed here. The agent
  wrote the trials and knows what they look for, so this is weaker
  evidence than a run with Human.
- Environment: stock `v0.10.2`, isolated home, port 6768, default settings:
  - Supervisor `claude/claude-opus-5-5`;
  - Lead `claude/claude-sonnet-5-5`;
  - every member in bypass mode.
- **Part A, I2 mechanism.**
  - Scratch group: Human asks the Supervisor to use its own
    `AskUserQuestion` tool once.
  - Expected: `slp.ledger.get` lists the question. After
    `permit allow --input`, the list is empty and the report counts 1 for
    the Supervisor.
- **Part B, I3 and I2 behavior.**
  - A new group in a seeded Python project: a notes CLI with `add` and
    `list`, a JSON store, and `unittest` tests.
  - Human's first message, rough on purpose: "Thêm chức năng export ghi
    chú ra file trong project này nhé."
  - Human's answers, only to what is asked:
    - export format: "Markdown";
    - which notes: "Tất cả ghi chú";
    - what the group may decide, or anything about naming, layout,
      sorting, encoding, or other technical details: "Phần đó các bạn tự
      quyết";
    - what happens if the output file already exists, whether asked at
      intake or raised as a pending decision: "Không ghi đè; báo lỗi nếu
      file đã tồn tại";
    - a read-back that matches: "Đúng rồi, làm đi". One that does not: a
      correction of the wrong point only;
    - any other question: "Các bạn tự quyết".

    Pending decisions are answered from the panel RPC with the same rules.
  - Observed:
    - intake questions asked together, or one at a time;
    - the read-back's five parts;
    - delegation and Human decisions recorded as `source: "human"`;
    - agent decisions that name their basis;
    - overwrite behavior: escalated, or decided silently (under-escalation);
    - questions on delegated points (over-escalation);
    - native questions;
    - questions from the Lead that intake should have settled;
    - the final behavior, checked by running the tests and the CLI.
- Stop: the work is accepted by the Lead, or 45 minutes pass. Cleanup:
  archive both workspaces and stop the daemon. Port 6767 is untouched.

Live results (2026-10-01). Stock `v0.10.2`, isolated home, port 6768.
The operating agent played Human from the script above, and sent its
messages through `paseo send`.

Part A, I2 mechanism. Workspace `slp-s7a` (`wks_58d110a8b34c91d8`):
- Human asked the Supervisor to use `AskUserQuestion` once. The Supervisor
  **refused**, citing the new rule, and asked in its reply instead.
- Human then allowed it explicitly, once, as a test. The Supervisor's
  `AskUserQuestion` appeared in `permit ls`, and `slp.ledger.get` listed it
  under `nativeQuestions`: role `supervisor`, text "Mau yeu thich cua toi la
  gi? (Xanh / Do)".
- `permit allow --input '{"answers":{...:"Xanh"}}'` resolved it:
  - events show `native-question`, then `native-question-resolved` with
    the same request id;
  - the list was empty, the report showed `supervisor 1, unanswered 0`,
    and the Supervisor replied with "Xanh".
- Passed. The panel rows themselves were not opened in the web app; the
  same RPC feeds them.

Part B, I3 and I2 behavior. Workspace `slp-s7b` (`wks_58b84b5e15d921d9`),
seeded notes CLI:
- **Intake (behavior 11).** To the rough first message, the Supervisor
  read the project, then asked 5 questions in one reply, each with a
  recommendation:
  - format;
  - scope;
  - purpose;
  - **an existing output file**;
  - edit scope and commit.

  It proposed that technical details be delegated. No question came later
  in the run.
- **Recording.** After Human's answers, the Supervisor recorded D1-D3
  (Markdown, all notes, no overwrite) and D4-D6 (delegations: content and
  purpose, edit scope and commit, technical details). All six are
  `source: "human"`, each quoting Human's words.
- **Read-back.** It had all five parts: outcome, constraints with sources,
  Human's decisions, delegations with scope, and open items. The
  Supervisor sent the goal to the Lead in the same turn, before Human
  confirmed the read-back. The read-back informed Human; it did not gate
  the work.
- **Brief.** The brief to the Lead listed D1-D3 as binding, D4-D6 as
  delegations, and its own design as "đề xuất của Supervisor, KHÔNG bắt
  buộc".
  - The Supervisor proposed a mechanism (`export <path>`, mode `x`) for
    the Lead, marked as not binding.
  - The Lead's brief to the Peer gave constraint sources such as "Human
    (D1)" and "Lead, derived from Human D5 delegation".
- **Delegation.** The Lead delegated A1 to a Peer: the first Peer
  delegation in any live run after slice 3.
- **Handback and acceptance.** The Peer handed back with evidence. The
  Lead re-ran the tests, checked `git status` and the diff, and accepted
  A1.
- **Escalation (behavior 12).**
  - 0 pending decisions: overwrite behavior was settled at intake.
  - No question on a delegated point, so no over-escalation.
  - The agents' choices (layout, empty store gives `# Notes` with exit
    0, no Markdown escaping, no parent directory creation, no commit)
    were reported to Human under D4, D5, and D6.
  - None was recorded with `slp_decide`; they appear only in messages.
- **Native questions:** 0.
- **Report:**
  - Human: 0 interventions, 3 messages to the Supervisor, 6 decisions
    relayed by the Supervisor;
  - escalations: 0;
  - member messages: 3;
  - convention breaks: 0;
  - cost: Supervisor $0.39, Lead $0.23, Peer $0.21.
- **Independent check by the operating agent:**
  - `python -m unittest` ran 7 tests, OK;
  - export wrote the expected Markdown with Vietnamese text;
  - an existing file was refused with rc 1, and its content was kept.

Cleanup: both workspaces archived and the 6768 daemon stopped; 6767 was
untouched. The seeded project stays at
`%TEMP%/slp-live/s7b`.

Reading against the Keep or Remove signals (one run, agent-played Human):
- **I3: Keep for now.**
  - Intake front-loaded every question.
  - Every Human decision and delegation was recorded and quoted.
  - Every agent choice traced to a delegation.
  - Nothing reached Human mid-run.
  - Open: whether the read-back should wait for Human's confirmation
    before the Lead starts.
- **I2: Keep for now.**
  - The mechanism works end to end.
  - The role text alone stopped a native question until Human overrode
    it.
  - No blocked turn occurred.
- **Limits:**
  - one task, small and with a clear structure;
  - Human was played by the agent that wrote the trials;
  - the scripted answers made under-escalation hard to provoke after
    intake.

  A run with Human, on work with a choice that surfaces only mid-run, is
  still needed.

Human's choices on the slice 7 observations (2026-10-01):
- **The Supervisor's design proposal.** The Supervisor stops at the
  outcome and constraints. Its handoff proposes no design, not even a
  non-binding one. The Supervisor role text and the overview were changed
  to say so.
- **Agent choices inside a delegation.** Reporting them in messages, as
  in the run, is enough. They need no `slp_decide` record.
- **Read-back.** Human accepted the agent's proposal:
  - a read-back lists only what the Supervisor interpreted (a reading of
    rough words, an inferred constraint, a filled gap, or a delegation
    boundary it drew), and is skipped when it interpreted nothing;
  - it waits for Human's confirmation only when a misread would be costly
    (large work, effects outside the workspace, or changes hard to undo).

  The role text and behavior 11 were changed. Not yet run live.

I4 and I5 (2026-10-01), judged by the simple-and-effective principle:
- **I4, role text only.**
  - Lead: a brief's scope says what the Peer may change, and what is out
    of scope.
  - Peer: change only what the goal needs, and put other improvements in
    the handback as suggestions.
  - The observed problem: K-B workers in slice 6 made 36-90 unrequested
    lines. Those workers were not SLP Peers, and the slice 7 Peer stayed
    in scope. So this is a cheap guard, not a measured fix.
  - The N/K rerun was not repeated: 20 runs would cost far more than the
    rule.
- **I5, not built.**
  - Slice 4 saw one misattribution. Since the instruction-only fix, there
    have been 0 across the second slice 4 run and slice 7 (6 Human
    decisions, each quoting Human).
  - A text-match flag would misfire on short answers such as
    "Markdown.", which is below the 20-character match.
  - Revisit if a misattribution recurs.

Part C protocol, registered before the run. Same environment as Parts A
and B; the operating agent plays Human again.
- Checks:
  - the new read-back rule;
  - the Supervisor's handoff without a design;
  - I4 scope;
  - a choice that may surface only mid-run.
- Seed: the Part B notes CLI before export, at commit `487558a`. Note that
  `add` gives `id = len(notes) + 1`, so deleting a note makes the next id
  collide.
- Human's first message: "Thêm lệnh xóa ghi chú nhé."
- Human's answers, only to what is asked:
  - how to pick the note: "Xóa theo id";
  - ask before deleting: "Không cần hỏi lại";
  - an unknown id: "Báo lỗi";
  - anything about ids after a delete (renumbering, reuse, collisions),
    whether asked at intake or as a pending decision: "Id đã cấp không bao
    giờ đổi và không dùng lại";
  - a read-back that asks for confirmation and matches: "Đúng rồi";
  - technical details or anything else: "Các bạn tự quyết".
- Observed:
  - read-back present or skipped, and whether it lists only interpreted
    points;
  - any design in the Supervisor's handoff;
  - the id collision: found or not; escalated, or decided under a
    delegation;
  - files changed outside the goal;
  - suggestions in the handback;
  - escalations and native questions;
  - the final behavior, checked by the operating agent.

Part C results (2026-10-01). Workspace `slp-s7c` (`wks_77a5c01626f31aa8`):
- **Intake.** The Supervisor read `notes.py` and found the id collision
  at intake. It asked 5 questions in one reply, each with a
  recommendation. Q3 asked whether ids are kept and never reused, or
  renumbered. Human's answers became D1-D6, all `source: "human"` and
  quoting Human.
- **Read-back, new rule.** It listed only the two points the Supervisor
  interpreted:
  - Q5 "Các bạn tự quyết" read as covering both commit and push;
  - the error form for an unknown id left to the Lead.
- **Read-back gate: not followed.**
  - The push reading is an effect outside the workspace, so the rule
    says to wait for Human's confirmation.
  - The Supervisor sent the goal to the Lead in the same turn, and the
    Lead tried to push before Human confirmed.
  - No harm: git rejected the push, and the target was a local test
    repository.
  - Setup flaw by the operating agent: `s7c` was cloned from `s7b`, so
    `origin` pointed at the Part B test repository.
- **Handoff, new rule followed.** No design: "Open / your choice: design,
  command naming/output, test coverage, how D4 is achieved". It also
  listed what must come back to Human.
- **Delegation.** The Lead worked alone, which is its own call (Human,
  I1). So I4 was not exercised.
- **The Lead's choices.** The store keeps a persistent `next_id` beside the
  notes, and legacy files still load. The on-disk JSON format changed, and
  this was reported to Human, not escalated.
- **A choice that surfaced mid-run.** The rejected push.
  - The Lead stopped rather than change another repository's config.
  - The Supervisor checked `s7b` itself, and found and reported Human's
    uncommitted files there.
  - It raised pending D7 with three options and a recommendation, and
    revised D7 once with the new fact.
  - Human settled D7 from the panel ("Các bạn tự quyết"). The group then
    pushed a new branch `notes-delete` to `s7b`, leaving `master`, the
    uncommitted files, and the config untouched. The Supervisor checked
    all of this.
- **Report:**
  - Human: 0 interventions, 3 messages, 1 panel decision, 6 relayed
    decisions;
  - escalations: 1 raised, 1 answered, 1 revised;
  - native questions: 0;
  - convention breaks: 0;
  - cost: Supervisor $0.54, Lead $0.31.
- **Independent check by the operating agent:**
  - 10 tests OK;
  - after add 1, add 2, delete 2, add, the list is `#1`, `#3`;
  - deleting id 9 gives an error with rc 1;
  - commit `c57564d` changes only `notes.py` and `test_notes.py`.
- Cleanup: workspace archived, daemon stopped, 6767 untouched. The push
  left a branch `notes-delete` in the temp repository `%TEMP%/slp-live/s7b`.

Reading of Part C:
- **Supervisor stops at outcome and constraints:** followed.
- **Read-back content rule:** followed.
- **Read-back gate:** missed once, on an effect outside the workspace.
  Fixed in the Supervisor role text: while waiting, it holds the goal
  back, or sends it with the costly part marked "not until Human
  confirms". Not yet run live.
- **Mid-run escalation:** worked. It came as a pending decision with
  options, through the panel, with no native question.

Part D protocol, registered before the run. Same environment; the
operating agent plays Human.
- Checks the read-back gate after the fix, and I4 when the Lead delegates.
- Seed: the notes CLI at `487558a`. Its `origin` is a fresh **bare**
  repository, so a push would succeed and an early push would be visible.
- Human's first message: "Thêm tag cho ghi chú nhé."
- Human's answers, only to what is asked:
  - tags per note: "Mỗi ghi chú nhiều tag";
  - filtering `list` by tag: "Có";
  - commit or push, how tags are shown, notes without tags, letter case,
    and anything else: "Các bạn tự quyết".

  Pending decisions are answered from the panel with "Các bạn tự quyết".
- **Read-back timing.** Human does not answer a read-back until the Lead's
  first turn has ended (at most 10 minutes). Human then records whether
  `origin` received any push, and answers "Đúng rồi".
- **Observed:**
  - read-back content;
  - whether the Supervisor held the goal back, or marked the costly part
    "not until Human confirms";
  - any push before confirmation;
  - whether the Lead delegated;
  - if it did, the brief's out-of-scope statement, changes outside the
    goal, and suggestions in the handback;
  - escalations and native questions;
  - the final behavior, checked by the operating agent.

Part D results (2026-10-01). Workspace `slp-s7d` (`wks_cab3cf8c35591184`):
- **Intake.** 4 questions in one reply, with defaults. The Supervisor
  said that "the Lead will report back before acting" and that "nothing
  goes to the Lead before your answers". It recorded D1-D2 as Human's
  decisions and D3-D6 as delegations, each quoting Human.
- **Gate: held.**
  - The Supervisor handed off at once, but added that even under D6 the
    Lead must report before any push or PR, "because a push takes code
    off the machine".
  - When the Lead's first turn ended, `origin` was still only `master
    487558a`, so there was no push before confirmation.
  - Human's "Đúng rồi" arrived before the Supervisor had asked about the
    push. The Supervisor did not take it as push consent, and asked
    separately.
- **Read-back content.** It again listed all of D1-D6, not only the
  interpreted points. Its one addition (no push without a heads-up) was
  stated as its own.
- **Mid-run question to Human.** The push question was asked in the
  Supervisor's reply, not as a pending decision, so the panel did not
  show it. This deviates from the role text. Human answered "Các bạn tự
  quyết". The Supervisor recorded it as a delegation (D11), and the Lead
  pushed `feature/note-tags` only (D12); `master` on `origin` was
  untouched.
- **Agent decisions.**
  - D7-D10 and D12 were recorded as `source: agent`, each naming the
    delegation it rests on.
  - The basis was written into the `projectRecord` field, which is meant
    for a project file path. Harmless, but it misuses the field.
- **Delegation.** The Lead worked alone ("the change was small"), so I4
  was not exercised.
- **Report:**
  - Human: 0 interventions, 4 messages, 7 decisions relayed;
  - escalations: 0;
  - native questions: 0;
  - cost: Supervisor $0.40, Lead $0.21.
- **Independent check by the operating agent:**
  - 6 tests ran OK, rc 0;
  - tags are lowercased and deduplicated;
  - `list --tag WORK` matches regardless of case;
  - a note without tags still lists normally;
  - the branch changes 2 files.
- Cleanup: workspace archived, daemon stopped, 6767 untouched.

Reading across Parts B-D (three runs, agent-played Human):
- **Intake:** front-loaded in all three runs. Human needed 3-4 messages
  per task, with 0 interventions and 0 native questions.
- **Handoff without design:** held in C and D.
- **Read-back gate:** missed in C, held in D after the fix.
- **Read-back content:** "only interpreted points" was followed in C, not
  in D. A full read-back costs Human some reading but no decisions.
- **Mid-run choices for Human:** a pending decision in C, a chat question
  in D. Watch this. If it repeats, the role text needs a sharper line,
  or the Process report can count chat questions.
- **I4 untested:** the Lead delegated only once (Part B), on its own
  judgment. A larger task is needed.

## Slice 6 Results

Environment: stock `v0.10.2`, isolated home, port 6768, default settings
(every member in bypass mode). Workspace `rh-slp-nk`
(`wks_8a928c9079d46ece`) is a Paseo worktree of `repository-harness`, on
branch `slp/premise-narrowing-experiment` from `14e298e`. Human gave the
goal and answered every question; the operating agent relayed them and
did not answer for Human.

The group's work product:
- Branch `slp/premise-narrowing-experiment`, 8 commits ending at
  `11cea6f`. It adds one file, `docs/plans/completed/slp-brief-premise-narrowing.md`.
  Nothing was pushed and no PR was opened, and the main checkout stayed on
  a clean `main`.
- Fixtures, `check.py`, `scan-access.py`, `run-worker.sh`, 20 valid run
  repositories with transcripts, and the void batch are under
  `C:/code/my-project/harness-experiments/premise-narrowing/`.
- The experiment ran 20 valid fresh `sonnet` workers (`claude -p` in
  isolated run repositories), and the access scan was clean in all of them.
  Results:

  | Arm | Result |
  | --- | --- |
  | N-A (narrowed brief) | 1 pass. 3 shipped the history-only change while their reports called it insufficient. 1 shipped it as done |
  | N-B (separated brief) | 5/5 pass |
  | K-A, K-B (control) | 5/5 pass, no over-challenge |

  - Registered reading: format B shows no measured benefit (N-A 4/5 vs
    N-B 5/5). Strict reading, adopted by Human after the N-A data: B moves
    N from 1/5 to 5/5.
  - In the K control, 4/5 K-B workers also made unrequested changes of
    36-90 lines, against 4-6 lines in K-A; the check could not penalize
    them.
  - The record's conclusion for SLP: the evidence supports the slice 3
    brief structure, with that caveat.
- Repository checks did not run on this machine.
  `tests/docs/test-doc-contracts.sh` reports "Unsupported Harness CLI
  platform: MINGW64_NT", and `scripts/validate-premerge.sh` reports that
  `rustfmt` is not installed. The record says so. The change is docs only.

Human decisions during the run (all from the panel, `source: human`):
- **D2:** allow 5 extra launches after a void N-A batch (the worker shell
  had no python).
- **D3:** continue under a strict reading, labeled post-registration.

The Supervisor settled D1 itself as an agent decision: the check judges
the outcome, so a `SYNC` fix passes N. This widened the earlier record's
sketch, and it was reported to Human.

Process report (`slp.report.get`):
- Human: 0 interventions, 1 message to the Supervisor, 2 panel decisions;
- escalations: 2 raised, 2 answered from the panel;
- member messages: 13 (Supervisor and Lead only); 7 held, 1 steered;
- convention breaks: 0;
- cost: Supervisor $0.94, Lead $2.84. The `claude -p` workers ran outside
  SLP and are not counted.

Observations about SLP (no change made):
1. **The Lead never delegated.** It ran the experiment itself, with 0
   assignments and 0 Peers. This is the third live run in which the Lead
   worked alone. The role text allows it, but the field run did not
   exercise briefs, Peer challenge, handback, or acceptance.
2. **The Supervisor asked Human through Claude Code's own
   `AskUserQuestion`,** twice, for D2 and D3, while the same choices were
   pending decisions in the ledger. That native question:
   - blocks the Supervisor's whole turn;
   - does not appear in the panel or the ledger;
   - left a Human panel answer held behind the blocked turn. The operating
     agent unblocked it with `paseo permit allow --input` carrying Human's
     answer.
3. **The Supervisor's oversight changed the work.** It stopped 5 worker
   launches that the Lead had started as Agent-tool subagents inside the
   worktree, because they risked leaking the registered design to the
   workers. It also required transcripts and an access scan before
   scoring.
4. **The group's record has two stale unchecked Progress items** (the
   pre-registration placeholders under "If reproduced"). Human may want
   them removed before merging.
5. **Experiment cost lives mostly outside the group.** The report's token
   table covers members only.

Follow-up, 2026-10-01 (Human):
- **Merging.** Human chose to push to `main` directly, without a PR. The
  operating agent fast-forwarded `main` to `origin/main` (`802bb54`), then
  merged the branch with a merge commit (`fd96cfc`), keeping the commit ids
  that the plan and the record cite. It removed the two stale Progress
  lines (`07b05c5`) and pushed `802bb54..07b05c5` to `origin/main`.
  - Premerge CI runs only on pull requests, so no repository validation
    ran on this change.
  - The post-merge changelog workflow also needs a merged PR, so there is
    no changelog entry.
- **Observation 1 (the Lead used provider subagents).** Human made it
  decision 0006: within SLP, a Claude Lead is created without its subagent
  tool.
  - Live proof on a scratch group (`slp-d6-ws1`), asking each member the
    same probe:
    - the Supervisor reported `Agent` in its toolset and started a
      subagent that replied OK, showing that only the Lead is affected;
    - the Lead reported no `Agent` or `Task` tool and tried no
      workaround;
    - after a daemon restart, the reloaded Lead still had no such tool.
  - `vitest` passes 45 tests, covering: a Claude Lead gets
    `disallowedTools: ["Agent", "Task"]`; the Supervisor, Peers, and a
    Codex Lead get no provider options.
- **When a Lead should delegate to Peers.** Human postponed the proposed
  experiment until this has been analyzed further. Nothing changed besides
  decision 0006 and the Lead's role text.
- **Observation 2 (the Supervisor used `AskUserQuestion`)** is still open.

## Slice 5 Results

Implementation:
- `Coordination.observeTurn` runs at each member's `agent.turn_ended` and
  records:
  - `builtin-send` and `builtin-create` events, for built-in Paseo tool
    calls (Claude `mcp__paseo__*`, Codex `paseo.*`). A send also records its
    target and a hash of its text;
  - `human-message`, for a user message the plugin did not send (it starts
    with no SLP intro and no `<paseo-system>` envelope);
  - `usage` (the agent's `lastUsage`), after a completed turn.
  Each tool call and message is counted once, keyed by `group.seen`.
- An `agent.created` hook records `outside-agent` for an agent created in a
  running SLP workspace without the group's label.
- `server/report.ts` builds the report from events and the ledger, and
  renders Markdown.
  - A "Human" message whose recipient and text hash match a built-in send
    is dropped, whichever turn ended first.
  - Cost counts the growth of each agent's cumulative session cost; a drop
    counts as a new session.
- `slp.report.get` RPC. The panel's "Process" section shows the numbers and
  a "Copy" action that copies the Markdown.

Focused proof:
- `tsc` passes.
- `vitest` passes 43 tests, including 4 telemetry tests:
  - built-in sends and creates, Human messages, and usage are each
    counted once across a repeated timeline; plugin prompts are ignored;
    a canceled turn reports no usage;
  - built-in sends and Paseo notices are not counted as Human messages;
    cumulative cost is counted once;
  - unlabeled agents are counted, and the group's own Peers are not;
  - a full report: escalations, Human decisions, interventions, findings,
    acceptance, messages, and usage, plus the Markdown.

Live proof, on stock `v0.10.2`, isolated home, port 6768. Workspace
`slp-s5-ws1` (`wks_9a92803e12f98076`). The Supervisor was
`claude-opus-5-5`, the Lead `claude-sonnet-5-5`, and the Peer the Lead
chose was `claude/claude-haiku-4-5` (mode `auto`).
- Human sent the goal to the Supervisor, then two messages straight to the
  Lead. Human settled one pending decision from the panel.
- To exercise the detectors on purpose:
  - Human asked the Lead to call the built-in `send_agent_prompt` twice;
  - an agent was created in the workspace with `paseo run --workspace`.
- **Bugs found live and fixed:**
  1. Claude's `totalCostUsd` is cumulative per session (Supervisor:
     0.188, 0.238, 0.286, ... 0.409). The first build summed it. Cost now
     counts the growth.
  2. The Lead's first built-in send reached the Supervisor as a plain user
     message, and was counted as a Human message.
     - The raw timeline shows `detail.input = {agentId, prompt}`, so the
       send now records its target and a text hash.
     - The report drops the matching message.
     - Paseo's finish notifications (`<paseo-system>`) are skipped too.
  - After `plugin reload slp`, the second send (`textKey 3c30…`) was
    matched and not counted. The first send, recorded before the fix, has
    no key, so this group still counts it as a Supervisor message.
- Final report, in the panel and from `slp.report.get`:
  - Human interventions 2 (lead 2); messages to the Supervisor 2 (one is
    the pre-fix send); 1 decision from the panel;
  - escalations raised 1, revised 1, answered from the panel 1;
  - 1 assignment, 2 handbacks, accepted;
  - 15 member messages by pair; delivery 8 at once, 12 held, 0 steered;
    3 plugin notices;
  - convention breaks 3: 2 built-in sends (lead) and 1 outside agent;
  - tokens and cost per role (estimates):
    - Supervisor: 8 turns, $0.4087;
    - Lead: 12 turns, $0.5170;
    - Peer: 5 turns, $0.3440.
    Each cost equals that agent's last reported cumulative cost.
- "Copy" showed the toast "Process report copied as Markdown."
- Archiving the workspace set the report's `endedAt` and archived all its
  agents, including the outside one.
- Cleanup: the browser was closed, Metro and the daemon stopped, and 6767
  was untouched.

Observation for Human (no change made):
- **The Haiku Peer in `auto` asked permission for every edit.** The Lead
  picked `claude-haiku-4-5` from the allowlist, with the Claude Peer mode
  `auto`. As slice 1 found, Haiku in `auto` still prompts. The Peer waited
  on 18 permission prompts, which this run approved by hand.
- The Peer defaults are Human's choices (slice 3). Possible fixes:
  - drop Haiku from the Peer models;
  - use `bypassPermissions` for Claude Peers;
  - set the mode per model rather than per provider.

Not covered live in slice 5:
- a built-in `create_agent` call by a member (unit-tested);
- a finish notification with `notifyOnFinish` left on (the Lead's log
  shows none arrived). The `<paseo-system>` skip is unit-tested;
- findings and steers in a report (both 0 in this run; unit-tested);
- Codex usage live (no Codex member in this run).

## Slice 4 Results

Implementation:
- `slp.ledger.decide` RPC and `Coordination.humanDecide`. It settles a
  pending decision, or records a new one, optionally on a finding. The
  decision is recorded as `source: "human"`, `by: {role: "human"}`,
  settled, and a settled decision resolves its open finding.
- The notice goes only to the Supervisor (`from="human"`), after its turn.
- The `decision` event now carries `by` (`human`, `lead`, or
  `supervisor`), so slice 5 can count Human interventions.
- The Supervisor's role text says a panel decision is already in the
  ledger, and that the Supervisor decides who needs it.
- The SLP panel adds these sections:
  - "Waiting for you": pending decisions, each with a settle form;
  - open findings with evidence;
  - assignments with owner, status, and scope, plus an expandable brief
    (goal, constraints with source, the Lead's current choice marked "not
    binding", uncertainties, reopen evidence, acceptance);
  - settled decisions, showing who made each: "Human, from the panel",
    "Human, relayed by the Supervisor", or "agent choice";
  - "Record a decision", with an optional open finding.
- Member rows show the assignment each Peer owns. The duplicate React key
  for Peer rows is fixed.

Focused proof:
- `tsc --noEmit` passes.
- `vitest` passes 36 tests, including 3 new `humanDecide` tests:
  - settling a pending decision tells only the Supervisor;
  - a new decision on a finding resolves it, and the notice is held while
    the Supervisor is busy;
  - refusals: not pending, unknown decision or finding, both targets, an
    unknown workspace, and an ended group.

Live proof, on stock `v0.10.2`, isolated home, port 6768. Workspace
`slp-s4-ws1` (`wks_a0604e3c8922606c`) held a seeded `titles.json`. The
Supervisor was `claude-opus-5-5`, the Lead `claude-sonnet-5-5`, and the
Lead's Peer `codex/gpt-6-luna`. Human spoke through `paseo send`, and the
panel ran in the web app on 8081 (driven by `agent-browser`, session
`slp-s4`).

- Before any decision existed, `slp.ledger.decide` with `settles: D1` was
  refused ("D1 is not a pending decision").
- **Pending decisions.** Human's first message reserved the non-ASCII
  choice. The Lead recorded pending D1 with options, then pending D2 to
  correct D1's examples. The panel showed "Waiting for you (2)".
- **Settling from the panel.** Human settled D1 in the web app.
  - The panel listed it as "D1: Human, from the panel".
  - Events showed `decision {by: "human", settled: true}`, then a single
    `message {from: "human", to: Supervisor}`.
  - The Supervisor passed it to the Lead with `slp_send`, and the Lead
    changed `slug.py` and its tests.
- **A refused settle.** The Supervisor settled D2 itself as moot, with
  `source: "human"`. The panel's later "Settle D2" was refused ("D2 is not
  a pending decision") and D2 left the waiting list.
- **A new decision.** Human recorded D3 ("empty title returns
  `untitled`") from "Record a decision".
  - The Supervisor was busy, so its notice was held, then delivered.
  - The Supervisor relayed it to the Lead, which implemented it and added
    tests.
- **Brief and ownership.** For the review Human asked for, the Lead
  delegated A1 to a Codex Peer. The panel showed:
  - A1's owner, status, and scope;
  - its brief, with sources such as "Human decision D1 (settled)", and
    the Lead's choices under "Current choice (the Lead's, not binding)";
  - the Peer row as `codex · running · owns A1 (assigned)`.
- **Peer finding.** The Peer recorded finding F1 itself. Pending since
  slice 3. F1 claimed mojibake fixtures, because the Peer read the file as
  cp1252.
  - The Lead checked the real bytes and recorded D5 (agent, kept the plan,
    resolves F1). It then sent A1 back for rework.
  - The panel showed "Open findings (0)" and "D5: agent choice (Lead)".
- **Group end.** Archiving the workspace ended the group (`endedAt` set,
  all three members archived). `slp.ledger.decide` was then refused ("This
  workspace has no running SLP group").
- Cleanup: the browser session was closed, Metro and the daemon were
  stopped, and 6767 was untouched.

Observations from the first run, and what followed:
- **No way to amend a pending decision.** The Lead recorded D2 only to
  correct D1, which left Human two items to settle. Human chose full CRUD
  for pending decisions (see Approach, slice 4). This added
  `slp_revise_decision`: the author updates or withdraws its own pending
  decision, and the Supervisor is told.
- **An agent's inference recorded as Human's.** The Supervisor recorded
  D2 as `source: "human"` because it inferred D2 from Human's D1; Human
  never answered D2. A1's brief also listed "Do not invent a length limit;
  Human set none" with source "Human (review request)", which Human did not
  say. Human chose option A, instructions only:
  - the shared, Supervisor, and Lead role texts now say "Human" is only
    for what Human said, and that a derived point names who inferred it
    and from what;
  - a decision made moot is withdrawn by its author, not settled as
    Human's;
  - the `slp_decide` and `slp_delegate` descriptions say the same.
- **The Lead implemented the first goal itself, without delegating.** The
  role text allows this, and the task was small.

Follow-up run, on the same environment with a new group, so the new role
texts applied. Workspace `slp-s4-ws2` (`wks_bd1fb54d73b420a4`).

Focused proof:
- `tsc` passes.
- `vitest` passes 39 tests, including 3 new revise tests: update in place,
  withdraw (it keeps its id, and Human can no longer settle it), and
  refusals for other members, settled decisions, and an update with no
  text.

Live results:
- Human reserved two choices. The Lead recorded pending D1 (non-ASCII) and
  D2 (maximum length).
- Human then asked, through the Supervisor, to take D1 off Human's list
  and to reword D2 to "60 or 80".
  - The Supervisor recorded D5 (`source: human`), a faithful relay of that
    message.
  - The Lead called `slp_revise_decision`: D2 `update` (events show
    `decision-revised {action: "update"}`; still pending, same id), then
    D1 `withdraw` with reason "Per Human D5...".
  - The Lead recorded its own non-ASCII choice as D6, `source: agent`,
    worded "Lead design choice (per Human D5, non-ASCII is Lead's call)".
- The web app showed "Waiting for you (1)" with "D2, raised by the Lead
  (revised)", and "D1: withdrawn by the Lead, no answer needed" under
  Decisions.
- Human settled D2 ("60 characters.") from the panel. The Supervisor
  relayed it, and the Lead implemented it.
  - The Lead recorded D7 as `source: agent`, "Implemented Human's D2
    answer".
  - The code comment reads "60 characters (Human decision)".
- No misattribution to Human was seen in this run. The Lead again worked
  without a Peer, so no brief was written and brief constraint sources
  were not exercised. One clean run is weak evidence; slice 6 should check
  attribution again.
- Cleanup: the workspace was archived (the group ended and both members
  were archived), the browser closed, Metro and the daemon stopped, and
  6767 was untouched.

Not covered live in slice 4:
- **An open finding in the panel.** F1 was resolved within seconds, so the
  open-finding rows and the finding picker in "Record a decision" were
  never seen populated live. Unit tests cover deciding on a finding.
- **The panel of an ended group.** The workspace was archived and left
  the app's list. The RPC refusal was proved instead.
- **Inline error display.** The refused "Settle D2" form unmounted at the
  next refresh. The refusal was seen in the daemon log.

## Slice 3 Results

Environment: same as slice 2. The Supervisor was `claude-opus-5-5`
(`auto`), the Lead `claude-sonnet-5-5` (`auto`), and the Peer the Lead chose
was `codex/gpt-6-luna` (`full-access`). Workspace `slp-s3-ws4` held a small
seeded project: `reports.json`, and `config.json` with `maxRows: 50`. Human
spoke through `paseo send` to the Supervisor. The ledger and events were read
from `slp.ledger.get` and the state file.

Focused proof: `npm run typecheck` passes, and `npm test` passes 33 tests.
`Coordination` against `FakePaseoHost` covers:
- send, both delivery kinds, held batches, and refusing self or unknown
  recipients;
- delegate: Lead-only, the default model, mode per provider, the allowlist,
  the cap, reassignment, and refusing a Peer with an open assignment;
- handback held for a busy Lead;
- accept: no acceptance before a handback, and rework;
- canceled turns;
- the finding, decision, and propagation chain; pending decisions for Human;
  Human-only sources;
- reconcile, and ended groups.

**Trial 1** (goal "export.py with `export_csv`, stdlib only; streaming is a
suggestion") took about a minute end to end:
- The Supervisor briefed the Lead with `slp_send`.
- The Lead called `slp_delegate`. Its brief listed "stdlib only (source:
  Human)" as a constraint and put Human's streaming suggestion under
  current choice, "not a requirement" (required behavior 6).
- The Peer handed back, and the Lead re-read the code and re-ran the test
  before `slp_accept` (behaviors 8 and 9).
- Independent check: `python test_export.py` passed.

**Trial 2** (a review of `export.py` against `config.json`, plus a call
reserved for Human):
- The Lead reassigned the same Peer (`reused: true`).
- The Lead recorded the Human-reserved question as pending decision D1. The
  Supervisor got it as a notice and put the options to Human.
- A Lead message to the busy Supervisor was held, then delivered when the
  Supervisor's turn ended (`held` → `held-delivered`).
- The Peer found no evidence against streaming and recorded no finding; the
  Lead accepted (behavior 4: no manufactured challenge).
- The Supervisor flagged a cross-scope dependency on its own: streaming
  rested on "input unbounded", which D1 decides.

**Trial 3** (Human answers D1 with "hard cap, no partial file"):
- The Supervisor settled D1 with `source: human`, and the Lead was told.
- The Lead recorded reopen finding F1 with evidence, then decision D2
  ("drop write-time streaming; read at most maxRows+1"). D2 resolved F1 and
  was propagated to the Peer and the Supervisor.
- A3 went to the same Peer, with constraint sources "Human (D1)", "Human",
  and "Lead, derived from Human D1 wording".
- The Lead asked for rework once, then accepted after re-running 4 tests.
  This is the full chain of required behavior 5: finding, evidence, decision,
  propagation, changed work, new evidence.
- Independent check: `python -m unittest` ran 4 tests OK. 51 rows raised
  `ValueError` with no file created; 50 rows wrote 51 lines.

**Bug found and fixed.** A3's first "handback" was false. The Peer's turn
answering the D2 notice ended while A3's brief was still held for it, and
the plugin counted that turn as A3's handback. The Lead caught it and asked
for rework.
- Assignments now record `briefDeliveredAt`. A Peer turn counts as a
  handback only after its brief, or a rework request, was delivered.
- A regression test covers the race.
- Older stored assignments get `briefDeliveredAt` from their creation time
  when loaded. A plugin reload with the fix loaded this group's state.

Ledger at the end: 3 assignments accepted, 1 finding (resolved), 2
decisions (one Human, one agent), 0 held messages, 39 events. Archiving the
workspace ended the group and archived the Supervisor, Lead, and Peer.

Not covered live in slice 3:
- reconciliation of a held message across a daemon restart (unit-tested);
- the fixed handback race (unit-tested);
- the Peer cap and allowlist refusals (unit-tested);
- a Peer-recorded finding (here the Lead recorded the reopen).

## Slice 2 Results

Environment: same as slice 1. Stock Paseo `v0.10.2`, isolated home, port
6768, plugin from `plugins/slp`, RPCs through `scripts/plugin-rpc.mts`, and
the web app on 8081 driven with `agent-browser`.

Focused proof:
- `npm run typecheck` passes.
- `npm test` passes 15 tests: `SlpService` against `FakePaseoHost`, and the
  MCP endpoint. They cover:
  - start, and the configured model and mode per role;
  - switching off before the lock, and starting again;
  - refusal while injection is off;
  - rollback of a half-started group, leaving no stored trace;
  - two racing switches start one group;
  - the lock in both directions, and the fallbacks for a missed event;
  - group end on workspace archive, and secret resolution.

Live proof, server, on workspace `slp-s2-ws1` (`wks_441bf083383e7066`):
- `slp.workspace.get` returned `off`, unlocked, with `injectIntoAgents: true`.
- `set-mode on` created `SLP Supervisor` (`claude-opus-5-5`, mode `auto`)
  and `SLP Lead` (`claude-sonnet-5-5`, mode `auto`) in the workspace
  directory. Both were idle, with no prompt.
- `set-mode off` archived both. `set-mode on` started a new group, still
  unlocked: the archived earlier members did not lock it.
- **First message.** `paseo send` to the Supervisor locked the workspace
  (`lockedAt 08:19:19`).
  - The Supervisor called `mcp__slp__slp_group` without a prompt, stated
    its role, gave the Lead's correct id, and proposed to ask Human for the
    goal and constraints first.
  - `set-mode off` was then refused: "SLP mode is locked on since Human's
    first message...".
- **Locked off.** Workspace `slp-s2-ws2` had an ordinary
  `claude-haiku-4-5` run first. It locked off, and `set-mode on` was
  refused.
- **Restart.** After a daemon restart, the mode, lock, and group were kept.
  The Lead called `slp_group` with its persisted secret and named the
  Supervisor correctly. Members not yet reloaded report `closed`, which the
  panel shows as "inactive".
- **Archive.** `workspace archive` on `slp-s2-ws1` set `endedAt` and
  archived both members. The ended group's secret then got 401.
- **Bug found and fixed.** A start that failed for an unknown workspace id
  left a stored record. A failed start now restores the earlier record, or
  removes it.

Live proof, client, on workspace `slp-s2-ws3`:
- The header button showed "SLP off" and opened the SLP panel. The "SLP"
  panel was also offered in the new-tab list.
- **Switching on in the panel** started the group:
  - the header changed to "SLP on";
  - the panel listed `SLP Supervisor` and `SLP Lead` (`claude · idle`)
    with Open buttons;
  - the app opened tabs for both agents.
- **First message from the app.** Sending one to the Supervisor from its
  composer locked the mode:
  - the panel showed "Locked on since your first message here...";
  - the switch became disabled;
  - the header tooltip read "SLP on (locked)".
- The settings screen showed the defaults
  (`claude/claude-opus-5-5`/`auto`, `claude/claude-sonnet-5-5`/`auto`).
  Saving changed settings was not exercised.
- Cleanup: the test workspaces were archived (ws3's group ended), Metro and
  the daemon stopped, and 6767 was untouched.

Not covered in slice 2:
- messaging between members (`slp_send`), delegation, and the ledger
  (slice 3);
- the injection-off refusal live (unit-tested only);
- Codex as a Supervisor or Lead.

## Slice 1 Results

Environment for every probe unless noted:
- Paseo `v0.10.2` (`919c737c1`), stock, in the detached worktree
  `C:\code\my-project\paseo-upstream`; started with `npm run dev:server:raw`.
- Isolated home `C:\code\my-project\paseo-upstream\.dev\paseo-home`, port
  6768. Daemon 6767 and the shared dev home were not touched.
- Provider `claude/claude-haiku-4-5`, default mode, cwd a scratch directory
  outside any repository.
- Probe build: `plugins/slp` (`index.server.ts`, `server/`), driven by
  `scripts/probe-rpc.mts` (renamed `scripts/plugin-rpc.mts` in slice 2),
  because the CLI has no plugin RPC command. Probe
  events went to `<home>\plugin-data\slp-probe\events.jsonl`, which the
  observations below quote.

| Probe | Result |
| --- | --- |
| 0 Paseo tools in members | Pass with a setup requirement. Tools appear only with `injectIntoAgents: true` |
| 1 Install, reload, logs | Pass |
| 2 Plugin MCP route, per-member secret | Pass on Claude and Codex, including after both resume paths |
| 3 `parent`, handback | Facts recorded. Parentage stays in the ledger; relay at `turn_ended` works |
| 4 Busy send | Claude and Codex: the built-in send cancels and replaces the turn; a plugin send with `steer` injects into it |
| 5 Reconciliation | Pass. No member lost across a daemon restart |

Probes 0, 2, and 3 did not fail, so decision 0001 needs no revision on those
grounds. The new constraints under "Open For Human" may still affect it.

### Probe 0: Paseo Tools In Members

- Default config, no `daemon.mcp` key: member `p0-default` listed its
  `mcp__*` tools without calling any. It had no `mcp__paseo__*` tool. It did
  have `mcp__slp__slp_whoami` and Human's global Claude MCP servers (`tilth`,
  Claude Docs).
- `injectIntoAgents: true` and a daemon restart: member `p0-inject` listed
  39 `mcp__paseo__*` tools, including `send_agent_prompt`, `create_agent`,
  and `list_agents`.
  - Its real `mcp__paseo__list_agents` call returned only the two probe
    agents, so the tool reached the 6768 daemon.
  - The call waited on a permission prompt until it was allowed with
    `paseo permit allow`.
- Conclusion: `injectIntoAgents: true` is a setup requirement, now in
  `docs/RUNBOOK.md`.

### Probe 1: Install, Reload, Logs

- `plugin install C:\code\my-project\plugin-paseo-slp\plugins\slp`: exit 0,
  and `plugin ls` showed `slp running`.
- `plugin reload slp`: exit 0. Logs showed stop, load, and ready, and the
  MCP port 6791 was released and bound again.
- `plugin logs slp` showed the plugin's `console.log` lines.
- The plugin process inherits the daemon's environment, including
  `PASEO_HOME`.
- RUNBOOK gaps found and fixed:
  - the CLI needs `npm run build:lib --workspace=@getpaseo/server`;
  - npm 11 skips install scripts without breaking the daemon;
  - JSON arguments under Git Bash need forward-slash paths.

### Probe 2: Plugin MCP Route

- Claude connected to `http://127.0.0.1:6791/mcp/<secret>` with `alwaysLoad`.
  It sent `server/discover`, `initialize`, `notifications/initialized`, and
  `tools/list`.
- `toolPolicy.preapproved` for `slp.slp_whoami` let the tool run without a
  prompt. It returned the right member key for `p0-default` and `p0-inject`.
- Resume keeps the secret on both paths:
  - after a daemon restart, `p0-default` was resumed and its turn ids
    restarted at `foreground-turn-1`; `slp_whoami` still returned
    `p0-default`;
  - after `paseo agent reload`, `p0-inject` still got `p0-inject`.
- A live POST with an unknown secret returned 401.
- Consequence: the MCP port must be fixed, because the URL is persisted with
  the agent.
- Codex: see "Codex Probes 2 And 4" below.

### Probe 3: `parent` And Handback

- `p3-child-a` was created with `parent` and `systemPrompt`. It had the label
  `paseo.parent-agent-id`, and `agent.created` carried `parentAgentId`. Its
  reply ended with the token its system prompt required.
- Its parent `p3-lead` received no finish notification: no turn started, and
  `paseo agent logs` showed only the initial prompt.
- Handback relay worked. On `p3-child-b`'s `agent.turn_ended`, the plugin
  sent the last reply to the idle Lead with `activeTurnBehavior: "steer"`.
  The Lead started a turn with the `<slp-handback>` message.
- `probe.archive` on the Lead archived the Lead, then `p3-child-a` and
  `p3-child-b` about 0.5 s later. Each archive emitted `agent.archived`.

### Probe 4: Busy Send (Claude)

- **Built-in send replaces the turn.** `p4b-sender` called
  `mcp__paseo__send_agent_prompt` (after a manual permission) while
  `p4b-target` was inside a 90 s `slp_sleep`.
  - The target's turn ended `canceled: Interrupted` mid-tool, and its
    original task was lost.
  - A new turn answered only the new message.
  - The sender got a finish notification turn, because the built-in tool
    arms one.
- **A plugin send with steer is injected.** `probe.send` with
  `activeTurnBehavior: "steer"` reached `p4c-target` during a 45 s sleep.
  - The same turn finished the tool and replied to both the original task
    and the steered message.
  - SDK 0.10.2 forwards the option but leaves it out of
    `PaseoAgentSendOptions`; `PaseoHost` widens the type.
- A plugin send without options interrupts, per source
  (`session.ts:8071`). Not run live.
- Codex: see "Codex Probes 2 And 4" below.

### Probe 5: Reconciliation

- `p5-a` and `p5-b` were created with labels and `idempotencyKey`. The
  daemon was stopped and started again.
- The first RPC that bound the Paseo API reconciled 7 stored members against
  `agents.list` filtered by `slp.probe=1`: all 7 live members matched, with
  no orphans. The 5 missing were the 3 archived probe 3 agents and 2 keys
  whose create had been rejected.
- Re-creating `p5-a` with the same key returned the same agent
  (`8e8e743f`).
- Slice 3 must tell archived members apart from never-created ones.
- Not exercised: first contact through a hook instead of an RPC.

### Other Findings

- `toolPolicy.preapproved` cannot name the injected `paseo` server. Create
  fails with "toolPolicy preapproval 'paseo.send_agent_prompt' requires MCP
  server 'paseo' in the same agent request". Members in Claude's default
  mode therefore get a permission prompt for every built-in Paseo tool call.
- A rejected create still uses up its `idempotencyKey`. Retrying the key with
  a different request gives `agent_request_key_conflict`.
- After `agent reload`, the `agent.turn_ended` timeline also contains earlier
  turns. Handback must take the last assistant message, not the whole
  timeline.
- Members inherit Human's global Claude MCP servers and settings.

### Member Modes (Follow-Up, 2026-10-01)

Human asked whether members must run in Claude's default mode, noting that
they use auto or bypass themselves. Same environment as above.

- A plugin-created agent does not get the app's default mode (`auto` for
  Claude). With no `modeId`, the provider's own default applies, which for
  Claude is `default` ("Always Ask"). All slice 1 probe agents ran that way,
  which is why the built-in Paseo tools asked for permission.
- `PaseoHost.createAgent` now takes `modeId`.
- Mode ids at `v0.10.2`:
  - Claude: `plan`, `default`, `acceptEdits`, `auto`, `bypassPermissions`;
  - Codex: `auto` (Default Permissions), `auto-review`, `full-access`.
- `mcp__paseo__list_agents` per Claude mode:

  | Member | Mode | Model | Prompted |
  | --- | --- | --- | --- |
  | `p6-claude-bypass` | `bypassPermissions` | Haiku 4.5 | No |
  | `p6-claude-auto-sonnet` | `auto` | Sonnet 5.5 | No (classifier approved) |
  | `p6-claude-auto` | `auto` | Haiku 4.5 | Yes |

- Conclusion: in `auto` with a classifier-capable model, or in
  `bypassPermissions`, built-in Paseo tools run without Human prompts. The
  plugin must pass the mode explicitly.

### Codex Probes 2 And 4 (2026-10-01)

Same environment as above, with `codex/gpt-6-luna` in mode `full-access`.
Codex reaches the model through Human's `cli-proxy-api`, which runs in WSL.

Setup fixes, Human-approved:
- The proxy listens only on IPv6 `::1:8318` from Windows (`wslrelay`), so
  `base_url` was changed from `127.0.0.1` to `localhost` in
  `~/.codex/config.toml` (backup `config.toml.bak-slp-2026-10-01`).
- Human then added the proxy key (`experimental_bearer_token`).
- A Codex agent started before a config change keeps the old config until
  `paseo agent reload`.

**Probe 2.**
- `p7-codex` reached the plugin endpoint at create (`initialize`,
  `tools/list`).
- `slp_whoami` returned `p7-codex` after `agent reload`, and again after a
  daemon restart. The timeline names the tool `slp.slp_whoami`.
- In `full-access` there was no permission prompt for plugin tools or for
  `paseo.send_agent_prompt`.

**Probe 4a: the built-in send replaces the turn.**
- `p8-codex-sender` called `paseo.send_agent_prompt` while `p8-codex-target`
  was inside a 90 s `slp_sleep`. The target's turn ended `canceled:
  interrupted`.
- Unlike Claude, the replacing Codex turn still saw the original request in
  its thread history. It slept again, replied `TARGET-DONE`, and quoted the
  new message instead of answering it (`BUILTIN-SEEN` never came).
- The sender got a finish notification turn.

**Probe 4b: a plugin send with steer is injected.**
- `probe.send` with `activeTurnBehavior: "steer"` reached
  `p8b-codex-target` during a 45 s sleep.
- The same turn completed and replied `TARGET-DONE` plus `STEER-SEEN`.

**Probe 5 cross-check.** After the restart, reconciliation matched all 7
live members, the Codex members included.

### Open For Human

1. **Settled by decision 0004 (2026-10-01).** Human chose a plugin send tool
   with two delivery kinds: steer into the running turn, or deliver after the
   turn ends. Original note:

   **Built-in messaging prompts for permission and replaces busy turns.**
   Update after the mode follow-up: the permission cost disappears when
   members run in `bypassPermissions`, or in `auto` with a classifier-capable
   model. The replace-on-busy cost remains.
   Decision 0001 keeps messaging on Paseo's built-in tools. Probe 4 shows two
   costs:
   - each built-in send needs a Human permission in default mode, and the
     plugin cannot preapprove it;
   - it cancels a busy recipient's turn.

   A plugin-hosted send tool could be preapproved and could steer instead.
   It would change 0001's messaging layer, so it needs Human's decision.
   No edit was made.
2. **Setup requirement.** Settled: Human accepts `injectIntoAgents: true`
   (see Decisions).
3. **Codex.** Done: probes 2 and 4 passed (see above).

## Validation

- Focused proof: `npm run typecheck` and `npm test` from the repository root
  in PowerShell, or the `node` commands in `docs/RUNBOOK.md` under Git Bash.
- Integration or end-to-end proof: live dev-daemon runs per slice on stock
  Paseo.
- Repository-required checks: `scripts/bin/harness.exe status` and `doctor`.

## Result

Pending.
