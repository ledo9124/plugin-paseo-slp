# Execution Plan: SLP Plugin v0.1

Date: 2026-10-01

## Status

Active. Slice 0 is complete; slice 1 is next.

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
  - 0003: the ledger is coordination state, not project truth.
- Method sources and prior analysis: `docs/research/sources.md`. The earlier
  `paseo-slp` fork is not a decision basis.

## Scope

In scope:

- Per-workspace toggle.
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
- Message queueing.
- Supervisor visibility across workspaces.
- Handoff or context replacement.

## Approach

Each slice ends in live proof on a dev daemon (`docs/RUNBOOK.md`), recorded
with commands and observed results.

0. Repository, Harness core, decisions, product docs, and a no-op plugin
   skeleton. Done.
1. **Platform probes on stock Paseo** (a throwaway probe build of the
   plugin). Each probe records its result in this plan:
   1. Install and reload the plugin.
   2. A plugin-created agent reaches a plugin-hosted HTTP MCP endpoint with a
      per-member secret, on Claude and on Codex.
   3. `agents.create` with `parent` and `systemPrompt`: is the child linked
      to its parent, and does the parent receive a finish notification?
   4. A built-in `send_agent_prompt` to a busy agent: does it steer or
      replace, per provider?

   If 2 or 3 fails, revisit decision 0001 before slice 2.
2. **Toggle and group start.**
   - Per-workspace toggle stored by the plugin.
   - Turning it on creates a Supervisor and a Lead with their role
     instructions.
   - Turning it off stops new SLP work.
   - An explicit end-group action.
   - Role instructions are written from the product overview, not copied
     from earlier SLP texts.
3. **Delegation, ledger, handback.**
   - The delegate tool requires the brief structure: goal, binding
     constraints with their source, current choice, uncertainties, and
     reopen evidence.
   - Ledger tools: ownership claims, findings (reopen, dependency, blocker),
     decisions with their source, and acceptance.
   - Handback reaches the Lead.
   - Reconciliation after a restart.
4. **Human panel.**
   - Shows briefs, constraint sources, open findings and pending decisions,
     and ownership.
   - A Human decision is written to the ledger and sent to the affected
     owner.
5. **Telemetry.** Counts of escalations, reopens, acceptance outcomes,
   message rounds, busy-send violations, agents created outside the delegate
   tool, and Human interventions, with a readable per-group report.
6. **Evaluation.**
   - Run the deferred premise-narrowing brief experiment, recorded in
     `repository-harness`
     `docs/plans/completed/harness-improvement-product-outcomes.md`.
     Scenario N is a narrowed brief to enlarge a send history; scenario K is
     the control. Compare a narrowed brief with the slice 3 brief structure.
   - Then run one field run on a real project.

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
- [ ] Slice 1: platform probes on stock Paseo.
- [ ] Slice 2: toggle and group start.
- [ ] Slice 3: delegation, ledger, handback, reconciliation.
- [ ] Slice 4: Human panel.
- [ ] Slice 5: telemetry.
- [ ] Slice 6: brief-format evaluation and field run.

## Decisions

- 2026-10-01: Plugin id `slp`, installed from `plugins/slp`. Provisional;
  change it before the first install if needed, because a daemon config key
  does not follow a later manifest rename.
- 2026-10-01: Supervisor visibility across workspaces is deferred until a
  single group works. This was an agent proposal; Human may revisit it.

## Validation

- Focused proof: `npm run typecheck` and `npm test` from the repository root
  in PowerShell, or the `node` commands in `docs/RUNBOOK.md` under Git Bash.
- Integration or end-to-end proof: live dev-daemon runs per slice on stock
  Paseo.
- Repository-required checks: `scripts/bin/harness.exe status` and `doctor`.

## Result

Pending.
