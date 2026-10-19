# Architecture

Status: approach accepted in decisions 0001-0007.
- Slice 1 platform probes ran on stock Paseo `v0.10.2` with Claude; probes 2
  and 4 also ran with Codex.
- Slice 2 implements the per-workspace SLP mode, the lock, group start and
  end, the panel, the header button, and settings.
- Slice 3 implements the member tools: send, delegate, accept, finding,
  decide, ledger, and group. It also implements held delivery, handback,
  and reconciliation.
- Slice 4 extends the SLP panel with the ledger (briefs, constraint
  sources, findings, decisions, ownership) and Human decisions, which go
  only to the Supervisor.
- Slice 5 adds the process report: telemetry from turn timelines, usage,
  and `agent.created`, shown in the panel and through `slp.report.get`.
- Slice 7 records members' native questions to Human from
  `agent.permission_requested`, shows open ones in the panel, and counts
  them in the report. After intake, the Supervisor asks Human through its
  question tool; the report counts those under escalations, and a Lead's or
  Peer's as convention breaks.

Results are in the [completed v0.1 plan](plans/completed/slp-plugin-v0.1.md).

## Repository Layout

- `plugins/slp/`: the Paseo plugin, installed as a directory source.
  - `paseo-plugin.json`: manifest (`id`, `requirements.paseo`).
  - `index.server.ts`: server entry, run by Paseo in a forked Node
    subprocess.
  - `index.client.tsx`: client entry, run inside every connected Paseo app.
    It adds the SLP workspace panel, the header button, and the settings
    screen. The Paseo mobile app evaluates this bundle in Hermes with
    experimental class support, where a class in the bundle came out
    undefined and stopped the plugin on the phone (0.3.4 and earlier). Client
    and shared code therefore declare no classes;
    `client/no-classes.test.ts` enforces it. Human confirmed on the phone
    that 0.3.5 loads in the mobile app (2026-10-04).
  - `server/`, `client/`, `shared/`: Paseo's compiler rejects imports across
    these boundaries and code modules at the plugin root.
    - `server/`: `PaseoHost` and its fake, `SlpService` (mode and
      lifecycle), `Coordination` (messaging, ledger, handback), the state
      store, member tools, role instructions, and the MCP endpoint.
    - `shared/`: RPC contracts and settings used by both sides.
  - Plugin state lives in `<PASEO_HOME>/plugin-data/slp/state.json`.
- `docs/`: Harness core plus this repository's product, decisions, plans,
  runbook, and research notes.
- `scripts/bin/harness(.exe)`: untracked Harness maintenance binary.
- `scripts/plugin-rpc.mts`: dev driver that calls plugin RPCs through a Paseo
  source checkout's CLI connection code (see [RUNBOOK.md](RUNBOOK.md)).

Paseo compiles plugin TypeScript itself; there is no build step. Run
`npm install` before installing or reloading, because Paseo does not install
dependencies for a directory source.

## Layers

1. **Conventions:** role instructions and the brief structure. Most SLP
   behavior lives here.
2. **Coordination service** (plugin server process): group lifecycle, the
   delegate tool, the coordination ledger, telemetry, and the RPCs the client
   uses.
3. **Messaging** (decision 0004): a plugin MCP send tool. It either steers
   into the recipient's running turn, or holds the message and delivers it
   when the recipient's turn ends. Built-in `send_agent_prompt` is not used
   for SLP messaging.

```text
Human ── Paseo app ── client entry: SLP toggle, ledger panel, Human decisions (to the Supervisor)
                         │ typed RPC
Paseo daemon ── plugin subprocess
   │                ├─ group store and ledger (plugin-owned files)
   │                ├─ HTTP MCP endpoint: SLP tools incl. send, per-member secret
   │                ├─ held-message store (deliver at turn end, or steer)
   │                ├─ lifecycle observers (agent.created, agent.turn_ended)
   │                └─ telemetry
   └─ members: Supervisor and Lead (created when SLP is turned on),
      Peers (created through the Lead's delegate tool),
      all messaging through the plugin send tool
```

## Capability Map

Read from source on `getpaseo/paseo` main at `d30e99c85`, and checked at the
`v0.10.2` tag where noted. Rows marked "probed" were observed live on
`v0.10.2` in slice 1, on Claude unless they say otherwise.

| Need | Mechanism | Limitation or open question |
| --- | --- | --- |
| Members with role instructions | `paseo.agents.create({config: {systemPrompt, mcpServers, modeId}, labels, idempotencyKey})` | Prompt and labels are fixed at creation. Probed: without `modeId` the provider's own default applies (Claude `default`, which prompts), not the app's `auto` |
| Peer creation with a structured brief | Plugin MCP tool, Lead only, calling `agents.create` with the requested provider and model | Probed: `parent` sets `paseo.parent-agent-id`, archiving a parent archives its children, and creation needs the parent loaded. Since 0009 the Lead and every Peer are created with `parent` = the Supervisor, so Paseo raises no finish attention for them and only the Supervisor notifies Human (Human, 2026-10-03); archiving the Supervisor archives the group |
| Member identity for SLP tools | Plugin-hosted HTTP MCP server with a per-member secret in the URL | Probed on Claude: works on Claude and Codex, and the secret survives resume after a daemon restart and after `agent reload`. The port must stay fixed, because the URL is persisted with the agent. `toolPolicy.preapproved` covers the plugin's own tools |
| Handback (platform) | Plugin relays the member's last message at `agent.turn_ended` | Probed: plugin-created children get no finish notification. After a reload, the event timeline also holds earlier turns, so relay the last assistant message only |
| Messages between members | `slp_send` (decision 0004): steer now, or hold while the recipient is busy and deliver at its `agent.turn_ended` | Slice 3, proved live, including held then delivered. Delivery always steers, so a recipient that just became busy keeps its turn. Reconciliation every 30 s, and at first contact, delivers held messages for idle recipients |
| Handback and acceptance | Relay each completed Peer turn to the Lead (after-turn). It counts as the assignment's handback only after its brief or rework request was delivered (`briefDeliveredAt`). The Lead uses `slp_accept` | Slice 3, proved live. A false handback race was found live and fixed |
| The Supervisor follows the Lead (2026-10-03, 0009) | Relay a completed Lead turn's last reply to the Supervisor (after-turn) when a Supervisor or Human message reached the Lead since its last relayed turn (`owesSupervisor` on the member record), or when no assignment is open. Supervisor decisions do not notify the Lead | The relay of every turn passed R1 and R2 (no Peers). The first real run relayed 60 turns and woke the Supervisor about 40 times for nothing, so 0009 narrowed it |
| Ledger | `slp_delegate`, `slp_accept`, `slp_finding`, `slp_decide`, and `slp_ledger`, role-checked from the member secret; `slp.ledger.get` RPC for clients | Slice 3, proved live. Among members, `source: "human"` and settling a pending decision are for the Supervisor only |
| Lead without provider subagents (decision 0006) | A Claude Lead is created with `config.options.disallowedTools: ["Agent", "Task"]`, which Paseo passes to the Claude Agent SDK for that agent only | Proved live: the Lead had no `Agent` or `Task` tool, including after a daemon restart, while the Supervisor in the same group still did. Other providers rely on the role text |
| Per-role tools and instructions (decision 0008) | Each role gets its own system prompt (`roles.ts`, with the provider's question tool and the Peer limit filled in), preapproval for its own SLP tools, and a filtered `tools/list`; the MCP endpoint refuses a call outside the role's list. Claude members get `disallowedTools` per role: the Supervisor loses `Edit`, `Write`, `NotebookEdit`, `Agent`, and `Task`; the Lead loses `Agent`, `Task`, and `AskUserQuestion`; a Peer loses `AskUserQuestion`. A Peer's `slp_ledger` shows only its own work. The report counts the Supervisor's shell commands and file changes | Slices 2-4 of the role-config plan. Human sets each role's instructions and tool list in Settings; members keep what they were created with (tools and an instruction hash on the member record). Proved live on the main daemon: per-role `tools/list` and a refused call. Codex members rely on the role text. The Supervisor keeps its shell, as a convention |
| Revising pending decisions (slice 4) | `slp_revise_decision` (Lead or Supervisor): the author updates the text of its own pending decision in place, or withdraws it (status `withdrawn`, with a reason; the id stays). Only while pending; the Supervisor is told | Slice 4, proved live: the Lead updated one pending decision and withdrew another when Human asked |
| Human decisions (slice 4) | `slp.ledger.decide` RPC from the SLP panel: settle a pending decision, or record a new one, optionally on a finding. Recorded as `source: "human"`, `by.role: "human"`, settled; a settled decision resolves its open finding. Only the Supervisor is told (after its turn) and decides who else needs it | Slice 4, proved live in the web app and through RPCs. Refused for a decision that is not pending, an unknown finding, both targets at once, or a group that has ended |
| Built-in `send_agent_prompt` (not used by SLP) | Paseo injected tools | Probed: needs `daemon.mcp.injectIntoAgents: true` (default `false`), which is daemon-wide. On Claude and Codex a busy recipient's turn is canceled and replaced. Prompts depend on the mode: Claude `default` asks Human every call, and plugins cannot preapprove the injected `paseo` server. Claude `bypassPermissions`, Claude `auto` with Sonnet 5.5, and Codex `full-access` ran without prompts; Claude `auto` with Haiku 4.5 still prompted. Since Paseo 0.12.0 (#5164) it steers by default for agent callers (`notifyOnFinish` exists since 0.11), so the cancel applies only to 0.10.x and 0.11.x hosts; the role texts still ban it because it bypasses SLP's held messages, the ledger, the relay of the Lead's reply, and the panel (Human, ledger D17, 2026-10-19) |
| Steering a busy member | Plugin `agents.ref(id).send(text, {activeTurnBehavior: "steer"})` | Probed on Claude and Codex: the message joins the running turn. SDK 0.10.2 forwarded the option but left it out of `PaseoAgentSendOptions`; SDK 0.12.0 types it, with `sourceAgentId`. A send without options interrupts. The app setting `sendBehavior` (`interrupt`, `steer`, or `queue`; default `steer`; `app/src/hooks/use-settings/storage.ts`) applies only to messages typed in the app composer. In `queue` mode, the app keeps queued messages in its own session store and sends them when the turn ends. The daemon has no queue: `activeTurnBehavior` accepts only `interrupt` or `steer`, and built-in `send_agent_prompt` (`paseo-tools.ts:1931`) ignores the setting and, through 0.11.x, always replaces. The Supervisor steers the Lead only when the Lead's work would otherwise be wasted: a short note, the rest after-turn (Human, ledger D6-D7) |
| Sender of a new Peer's brief (Human, ledger D18) | The Peer is created without a prompt; the brief follows as `send(text, {activeTurnBehavior: "steer", sourceAgentId: <Lead>})`. A host whose client refuses the source (no `agentMessageProvenance`) gets a plain send; 0.10.x and 0.11.x drop the field | Paseo 0.12.0 (#6373) wraps a create prompt in a `<paseo-system kind="agent-message">` envelope whose source is the caller; the plugin's create goes through `session.ts` with `callerAgentId` from `parent` (`client/src/index.ts`), so the source was the Supervisor (0009) and the brief showed as from "SLP Supervisor"; 0.11.4 had no envelope. The envelope XML-escapes the body (`'` as `&apos;`, `>` as `&gt;`), so on 0.12 the Peer reads its brief with entities, as it did before this change; older hosts get the plain text. Unit tests; live check on a scratch 0.12.0 daemon (D19 plan) |
| Lead handoff (Human, ledger D11-D12) | `slp_handoff` (Supervisor): refused while the Lead is in a turn; a new Lead with the Lead role's current setup, a new MCP secret, the same labels, and parent the Supervisor; messages held for the old Lead move to it after the handoff message (which carries the old Lead's own note, Human D23-D24); the new Lead owes the Supervisor its first reply (the handoff message comes from the Supervisor); Peers still working (`assigned`, not archived) get a notice; the old Lead is archived once idle: at once, else at its turn end or at reconcile (`retiring` on the group). Each create has its own idempotency key, so a failed handoff can be retried; once the new Lead exists, a failed delivery is reported (`problems`, a `handoff-problems` event) and left held, not thrown | Peers resolve the Lead by role, so their handbacks reach the new Lead; their parent stays the Supervisor. Background processes of the old Lead end with it: the note lists them. Unit tests on the fake host; live check in the D19 batch |
| Auto-compact window (Human, ledger D11-D13; D22) | Per role in Settings (`autoCompactWindow`, 100k-1M); a Claude member gets `config.options.extraArgs: { autocompact: "<tokens>" }`, which Claude Code reads as `--autocompact` for that session | Scratch test on 6767 (2026-10-19): stored with the agent's config, kept after a reload, and Opus 5.5 compacted at a 100k window; `~/.claude/settings.json` untouched. Claude Code's `/autocompact` command writes `modelSettings.<model>.autoCompactWindow` into the user settings file instead, and a create-time env var is lost on reload. Applies to members created after the change |
| Ledger and Human steering | Plugin MCP tools for agents; RPCs and a panel for Human; plugin-owned files | The ledger records each assignment and role with `agentId` as its current occupant, not as its identity. The plugin has no Paseo API at startup, only inside hooks and RPCs, so reconciliation from files, labels, and `agents.list` runs at the first hook or RPC |
| Agents created outside the delegate tool | `agent.created` in a running SLP workspace for an agent without the group label; built-in `create_agent` calls in member timelines | Slice 5, proved live for `agent.created`: visible in the report, not blocked |
| Effort and compaction (0009) | `thinkingOptionId` at create, checked against `providers.listModels` (omitted with an `effort-dropped` event when the model does not list it). `compaction` timeline items (status `completed`) become one `compaction` event each; the member record counts them, because the timeline repeats earlier turns | Unit tests on the fake host; live check pending |
| Process telemetry (slice 5) | At each member `agent.turn_ended`: tool calls named `*send_agent_prompt` / `*create_agent` (with `detail.input` target and text), user messages without an SLP intro or `<paseo-system>` envelope (Human's), and `lastUsage` after completed turns. Deduplicated by call and message id. `slp.report.get` builds the report from events and the ledger | Slice 5, proved live. A built-in send reaches its recipient as a plain user message; the report matches it by target and text hash. Claude's `totalCostUsd` is cumulative per session; Codex reports last-turn tokens and no cost |
| Native questions to Human (slice 7, I2) | `agent.permission_requested` with `request.kind: "question"` from a group member records a `native-question` event (role, request id, question text from Claude's `AskUserQuestion` `questions`). `agent.permission_resolved` with the same id records `native-question-resolved`. `slp.ledger.get` returns the open ones; the report counts the Supervisor's under escalations and the Lead's or a Peer's as convention breaks | Observe only; nothing is denied (0001). Observed live in slice 7 Part A: the Claude provider maps `AskUserQuestion` to kind `question`, and the plugin lifecycle emits both events |
| Per-workspace SLP mode (0005) | Plugin state per workspace. The lock comes at the first `agent.turn_started` in the workspace, with a fallback to `lastUserMessageAt` and to agents SLP did not create. Group end at `workspace.archived` | Slice 2, proved live. Archiving a workspace archives its agents (`workspace-archive-service.ts`) |
| Human controls | Client `addWorkspacePanel` (SLP panel), `addHeaderButton` per workspace (from `workspaces.list({ subscribe: {} })` and `workspaces.subscribe`; without `subscribe` the handler never fires, so workspaces created after load got no button until 0.3.3), a workspace command-center item that opens the panel, and `addSettingsScreen` | Slice 2, proved in the web app. The settings screen is reached from Settings, Plugins, then the `slp` actions menu. Since 0.3.3 it has four tabs (Supervisor, Lead, Peers, Templates) with one shared Save, and the panel shows pending decisions and native questions first, under "Needs you"; both proved in the web app on 6767 (2026-10-04) Slice 4 adds the ledger views and decision forms to the same panel, polling `slp.workspace.get` and `slp.ledger.get` every 5 s |

## Known Limits

- Rules are policy. Paseo has no per-agent tool restriction upstream, so a
  member can still use `create_agent` or provider-native subagents.
  - Per-provider overlays (`extends` with `paseoTools.disabledTools` or
    `disallowedTools`) could restrict tools by role.
  - That is runtime enforcement, so it is deferred under decision 0001.
  - It also writes to Human's global provider config and stays visible while
    SLP is off.

- Members inherit Human's global Claude MCP servers and settings.
- `idempotencyKey` is consumed even when the daemon rejects the create, and a
  retry with a different request fails with `agent_request_key_conflict`.
- Upstream main reported version 0.10.0 while 0.10.x releases were cut on
  a separate branch, and a daemon built from it rejected
  `requirements.paseo` `>=0.10.2`. Main reports 0.12.0 since that release
  (2026-10-19).

## Plugin Code Boundary

SLP logic talks to Paseo through one thin `PaseoHost` adapter in `server/`.
- The adapter exposes only the calls the plugin actually makes.
- It is bound when the first hook or RPC supplies the Paseo API. In
  `v0.10.2` the plugin process creates one long-lived `PaseoApi`, so keeping
  that reference after binding is safe.
- A fake implementation of it backs unit tests.
- Lifecycle events are best-effort and not replayed. Plugin timeline rows are
  memory-only.
- `before("agent.create")` cannot tell who is creating an agent, so the plugin
  shapes only the agents it creates itself.

## External Dependencies

- Stock Paseo 0.10.2 or later. No fork patches.
- `@getpaseo/plugin` 0.12.0 (dev dependency, types only). Nothing may need
  a 0.11 or 0.12 API without a fallback: `requirements.paseo` stays
  `>=0.10.2` (Human, ledger D2).
- A Paseo source checkout for the dev daemon. See [RUNBOOK.md](RUNBOOK.md).
- The daemon must run with `daemon.mcp.injectIntoAgents: true`.
