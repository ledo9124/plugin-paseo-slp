# Execution Plan: SLP Plugin v0.1

Date: 2026-10-01

## Status

Blocked: decision 0001 awaits Human acceptance. Slice 0 is complete.

## Outcome

A Paseo user installs this plugin into a stock Paseo daemon and runs one
piece of work as an SLP group, in Direct or Supervised mode. The group
satisfies the required behavior in `docs/product/overview.md`, with live proof
on at least one real provider.

## Context

- Product: `docs/product/overview.md`.
- Architecture and capability map: `docs/ARCHITECTURE.md`.
- Proposed approach: `docs/decisions/0001-slp-as-a-paseo-plugin.md`.
- Prior implementation and evidence: the `ledo9124/paseo-slp` fork, read from
  `C:/code/my-project/paseo-slp/docs/slp/`. It includes the role texts in
  `roles/`, the definition in `core-definition-v0.1.md`, the field-run
  findings in `evidence.md`, and the non-claims in `implementation-plan.md`.
- Sources and analyses: `docs/research/sources.md`.

## Scope

In scope:

- Group lifecycle, role prompts, plugin MCP tools for delegation and routed
  mail, handback and report relay, persistence and reconciliation, a minimal
  client panel and settings screen.

Out of scope for v0.1:

- Handoff, destructive-operation gates, composer takeover, automatic modes,
  Better-SLP process telemetry, and fork branding.

## Approach

Each slice ends in live proof on the dev daemon (`docs/RUNBOOK.md`).

0. Repository, Harness core, product docs, proposed decision, and no-op
   plugin skeleton. Done.
1. Install the no-op plugin on the dev daemon and prove the runbook.
   - Prove that a plugin-created agent can reach a plugin-hosted HTTP MCP
     server with a per-member secret, on Claude and on Codex.
   - Prove that per-agent `paseoTools` narrowing removes `create_agent` and
     `send_agent_prompt`.
   - If either fails, return to decision 0001 before slice 2.
2. Group store and role prompt composition. Start a Direct-mode Lead through
   an RPC, with role text adapted from the fork's `roles/` files. The
   adaptation removes the fork-only tools (`slp_request_handoff`, `slp_ready`)
   and any built-in tool routing.
3. Delegation and mail.
   - A Lead-only delegate tool creates a Peer with a brief.
   - A Peer's handback reaches the Lead at `agent.turn_ended`.
   - Mail is delivered at turn boundaries.
   - Restart reconciliation.
4. Supervised mode: Supervisor and Lead relay; a Lead report reaches the
   Supervisor at the end of the Lead's turn.
5. Client: start-group panel (mode, providers), group status panel, and
   role-extras settings.
6. Evaluation. Run the deferred premise-narrowing brief experiment, recorded
   in `repository-harness`
   `docs/plans/completed/harness-improvement-product-outcomes.md`.
   - Scenario N: a narrowed brief to enlarge a send history.
   - Scenario K: the control.
   - Compare a narrowed brief with one that separates goal, binding
     constraints, and the earlier agent's choice.
   - Follow with one field run on a real project.

## Risks And Recovery

- **Plugin form cannot meet a required behavior.** Slice 1 exists to fail
  early. Recovery: revise 0001, either toward a small upstream seam or by
  narrowing v0.1.
- **The `paseoTools` dependency stays fork-only.** Recovery: document the
  required Paseo build, or fall back to permission answers and prompts, and
  record the weaker guarantee.
- **Mail race** (a turn starts between the idle check and the send).
  Recovery: measure it in slice 3. Accept it if rare; otherwise propose the
  upstream seam.
- **Missed events while the plugin is down.** Recovery: reconcile from the
  timeline at startup, and test it with a seeded restart.
- **Role prompts reward manufactured disagreement.** Recovery: the slice 6
  control scenario measures over-challenge; revise the prompts.

## Progress

- [x] Slice 0: repository, Harness core 0.1.16, docs, no-op skeleton.
- [ ] Human decision on 0001, plugin id, license, and remote repository.
- [ ] Slice 1: runbook proof and platform probes.
- [ ] Slice 2: group store and Direct-mode Lead.
- [ ] Slice 3: delegation, handback, mail, reconciliation.
- [ ] Slice 4: Supervised mode.
- [ ] Slice 5: client panel and settings.
- [ ] Slice 6: brief-format evaluation and field run.

## Decisions

- 2026-10-01: Plugin id `slp`, installed from `plugins/slp`. Provisional;
  change it before the first install if Human prefers another id, because a
  daemon config key does not follow a later manifest rename.
- 2026-10-01: No Paseo code is copied. Role texts are adapted from the
  Human's own fork documents.

## Validation

- Focused proof: `npm run typecheck` and `npm test` from the repository root
  in PowerShell. Under Git Bash, call the tools through `node` (see
  `docs/RUNBOOK.md`).
- Integration or end-to-end proof: live dev-daemon runs per slice, recorded
  with the commands and observed results.
- Repository-required checks: `scripts/bin/harness.exe status` and `doctor`.

## Result

Pending.
