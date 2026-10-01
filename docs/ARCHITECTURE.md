# Architecture

Status: approach accepted in decisions 0001-0003. Slice 1 platform probes ran
on stock Paseo `v0.10.2` with Claude, and probes 2 and 4 also ran with Codex.
The code is a throwaway probe build plus
the `PaseoHost` adapter; results are in the
[active plan](plans/active/slp-plugin-v0.1.md#slice-1-results).

## Repository Layout

- `plugins/slp/`: the Paseo plugin, installed as a directory source.
  - `paseo-plugin.json`: manifest (`id`, `requirements.paseo`).
  - `index.server.ts`: server entry, run by Paseo in a forked Node
    subprocess.
  - `index.client.tsx` (later): client entry, run inside every connected
    Paseo app.
  - `server/`, `client/`, `shared/`: Paseo's compiler rejects imports across
    these boundaries and code modules at the plugin root.
- `docs/`: Harness core plus this repository's product, decisions, plans,
  runbook, and research notes.
- `scripts/bin/harness(.exe)`: untracked Harness maintenance binary.
- `scripts/probe-rpc.mts`: dev driver that calls plugin RPCs through a Paseo
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
3. **Messaging:** Paseo's own agent tools (`send_agent_prompt`,
   `get_agent_status`, `list_agents`). The plugin does not replace them.

```text
Human ── Paseo app ── client entry: SLP toggle, ledger panel, Human decisions
                         │ typed RPC
Paseo daemon ── plugin subprocess
   │                ├─ group store and ledger (plugin-owned files)
   │                ├─ HTTP MCP endpoint: SLP tools, per-member secret
   │                ├─ lifecycle observers (agent.created, agent.turn_ended)
   │                └─ telemetry
   └─ members: Supervisor and Lead (created when SLP is turned on),
      Peers (created through the Lead's delegate tool),
      all talking through Paseo's built-in agent tools
```

## Capability Map

Read from source on `getpaseo/paseo` main at `d30e99c85`, and checked at the
`v0.10.2` tag where noted. Rows marked "probed" were observed live on
`v0.10.2` in slice 1, on Claude unless they say otherwise.

| Need | Mechanism | Limitation or open question |
| --- | --- | --- |
| Members with role instructions | `paseo.agents.create({config: {systemPrompt, mcpServers, modeId}, labels, idempotencyKey})` | Prompt and labels are fixed at creation. Probed: without `modeId` the provider's own default applies (Claude `default`, which prompts), not the app's `auto` |
| Peer creation with a structured brief | Plugin MCP tool, Lead only, calling `agents.create` with the requested provider and model | Probed: `parent` sets `paseo.parent-agent-id`, archiving a parent archives its children, and creation needs the parent loaded. v0.1 keeps parentage in the ledger and does not pass `parent` |
| Member identity for SLP tools | Plugin-hosted HTTP MCP server with a per-member secret in the URL | Probed on Claude: works on Claude and Codex, and the secret survives resume after a daemon restart and after `agent reload`. The port must stay fixed, because the URL is persisted with the agent. `toolPolicy.preapproved` covers the plugin's own tools |
| Handback | Plugin relays the member's last message at `agent.turn_ended`, sending with `activeTurnBehavior: "steer"` | Probed: plugin-created children get no finish notification, and the relay works. After a reload, the event timeline also holds earlier turns, so relay the last assistant message only |
| Messages between members | Built-in `send_agent_prompt` | Probed: needs `daemon.mcp.injectIntoAgents: true` (default `false`), which is daemon-wide. On Claude and Codex a busy recipient's turn is canceled and replaced. Prompts depend on the mode: Claude `default` asks Human every call, and plugins cannot preapprove the injected `paseo` server. Claude `bypassPermissions`, Claude `auto` with Sonnet 5.5, and Codex `full-access` ran without prompts; Claude `auto` with Haiku 4.5 still prompted |
| Steering a busy member | Plugin `agents.ref(id).send(text, {activeTurnBehavior: "steer"})` | Probed on Claude and Codex: the message joins the running turn. SDK 0.10.2 forwards the option but leaves it out of `PaseoAgentSendOptions`. A send without options interrupts |
| Ledger and Human steering | Plugin MCP tools for agents; RPCs and a panel for Human; plugin-owned files | The ledger records each assignment and role with `agentId` as its current occupant, not as its identity. The plugin has no Paseo API at startup, only inside hooks and RPCs, so reconciliation from files, labels, and `agents.list` runs at the first hook or RPC |
| Agents created outside the delegate tool | `agent.created` with `parentAgentId` | Visible, not blocked |
| Per-workspace toggle | Plugin state per workspace and a client control | Exact control location decided in slice 2 |

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
- Upstream main reports version 0.10.0 because releases are cut on a
  separate branch. A daemon built from main rejects `requirements.paseo`
  `>=0.10.2`.

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
- `@getpaseo/plugin` 0.10.2 (dev dependency, types only).
- A Paseo source checkout for the dev daemon. See [RUNBOOK.md](RUNBOOK.md).
- The daemon must run with `daemon.mcp.injectIntoAgents: true`.
