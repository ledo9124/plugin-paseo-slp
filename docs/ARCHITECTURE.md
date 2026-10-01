# Architecture

Status: approach accepted in decisions 0001-0003. Only the repository layout
and a no-op plugin entry exist.

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

Verified against `getpaseo/paseo` main at `d30e99c85` and plugin SDK 0.10.2.

| Need | Mechanism | Limitation or open question |
| --- | --- | --- |
| Members with role instructions | `paseo.agents.create({config: {systemPrompt, mcpServers}, labels, idempotencyKey})` | Prompt and labels are fixed at creation |
| Peer creation with a structured brief | Plugin MCP tool, Lead only, calling `agents.create` with the requested provider and model | `parent` sets `paseo.parent-agent-id`, and archiving a parent cascades to its children. Slice 1 decides whether to use `parent` or keep parentage in the ledger |
| Member identity for SLP tools | Plugin-hosted HTTP MCP server with a per-member secret in the URL | Slice 1: confirm on each target provider, and confirm the secret survives a resume (`session_open` env is not kept across resume) |
| Handback | Plugin relays the member's last message at `agent.turn_ended` | Agents created by a plugin get no finish notification; that exists only for agent-created children. Relaying to a busy Lead has the same steer or replace problem as other sends |
| Messages between members | Built-in `send_agent_prompt` | Needs Paseo tools injected into agents. `daemon.mcp.injectIntoAgents` defaults to `false` (`config.ts:540`); slice 1 probe 0. A busy recipient's turn is steered or replaced. Convention: message a Peer after its handback; telemetry counts violations |
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

## Plugin Code Boundary

SLP logic talks to Paseo through one thin `PaseoHost` adapter in `server/`.
- The adapter exposes only the calls the plugin actually makes.
- It is bound when the first hook or RPC supplies the Paseo API.
- A fake implementation of it backs unit tests.
- Lifecycle events are best-effort and not replayed. Plugin timeline rows are
  memory-only.
- `before("agent.create")` cannot tell who is creating an agent, so the plugin
  shapes only the agents it creates itself.

## External Dependencies

- Stock Paseo 0.10.2 or later. No fork patches.
- `@getpaseo/plugin` 0.10.2 (dev dependency, types only).
- A Paseo source checkout for the dev daemon. See [RUNBOOK.md](RUNBOOK.md).
