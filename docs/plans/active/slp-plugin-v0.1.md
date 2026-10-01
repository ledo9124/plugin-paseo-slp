# Execution Plan: SLP Plugin v0.1

Date: 2026-10-01

## Status

Active. Slices 0 and 1 are complete on Claude; slice 1 Codex coverage is
unproven. Slice 2 waits on the Human decisions listed under slice 1 results.

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
- [x] Slice 1: platform probes on stock Paseo v0.10.2, Claude only. Codex
  not run by Human choice. Results below.
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
- 2026-10-01: Slice 1 covers Claude only; Human declined Codex quota.
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

## Slice 1 Results

Environment for every probe unless noted:
- Paseo `v0.10.2` (`919c737c1`), stock, in the detached worktree
  `C:\code\my-project\paseo-upstream`; started with `npm run dev:server:raw`.
- Isolated home `C:\code\my-project\paseo-upstream\.dev\paseo-home`, port
  6768. Daemon 6767 and the shared dev home were not touched.
- Provider `claude/claude-haiku-4-5`, default mode, cwd a scratch directory
  outside any repository.
- Probe build: `plugins/slp` (`index.server.ts`, `server/`), driven by
  `scripts/probe-rpc.mts` because the CLI has no plugin RPC command. Probe
  events went to `<home>\plugin-data\slp-probe\events.jsonl`, which the
  observations below quote.

| Probe | Result |
| --- | --- |
| 0 Paseo tools in members | Pass with a setup requirement. Tools appear only with `injectIntoAgents: true` |
| 1 Install, reload, logs | Pass |
| 2 Plugin MCP route, per-member secret | Pass on Claude, including after both resume paths. Codex unproven |
| 3 `parent`, handback | Facts recorded. Parentage stays in the ledger; relay at `turn_ended` works |
| 4 Busy send | Claude: the built-in send replaces the turn; a plugin send with `steer` injects. Codex unproven |
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
- Codex: not run.

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
- Codex: not run.

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

### Open For Human

1. **Built-in messaging prompts for permission and replaces busy turns.**
   Decision 0001 keeps messaging on Paseo's built-in tools. Probe 4 shows two
   costs:
   - each built-in send needs a Human permission in default mode, and the
     plugin cannot preapprove it;
   - it cancels a busy recipient's turn.

   A plugin-hosted send tool could be preapproved and could steer instead.
   It would change 0001's messaging layer, so it needs Human's decision.
   No edit was made.
2. **Setup requirement.** SLP members need `injectIntoAgents: true`. That is
   daemon-wide, so every agent on that daemon gets Paseo tools.
3. **Codex.** Probes 2 and 4 remain unproven on Codex.

## Validation

- Focused proof: `npm run typecheck` and `npm test` from the repository root
  in PowerShell, or the `node` commands in `docs/RUNBOOK.md` under Git Bash.
- Integration or end-to-end proof: live dev-daemon runs per slice on stock
  Paseo.
- Repository-required checks: `scripts/bin/harness.exe status` and `doctor`.

## Result

Pending.
