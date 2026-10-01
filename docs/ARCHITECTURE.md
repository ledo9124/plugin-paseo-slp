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
| Members with role instructions | `paseo.agents.create({config: {systemPrompt, mcpServers}, labels, parent})` | Prompt and labels are fixed at creation |
| Peer creation with a structured brief | Plugin MCP tool, Lead only, calling `agents.create` | Slice 1: confirm `parent` linkage and finish notification to the Lead |
| Member identity for SLP tools | Plugin-hosted HTTP MCP server with a per-member secret in the URL | Slice 1: confirm on each target provider |
| Handback | Paseo finish notification for children, or the plugin relays the last message at `agent.turn_ended` | Slice 1: pick whichever works on stock Paseo |
| Messages between members | Built-in `send_agent_prompt` | A busy recipient's turn is steered or replaced. Convention: message a Peer after its handback; telemetry counts violations |
| Ledger and Human steering | Plugin MCP tools for agents; RPCs and a panel for Human; plugin-owned files | Rebuilt from files and `agents.list` on startup |
| Agents created outside the delegate tool | `agent.created` with `parentAgentId` | Visible, not blocked |
| Per-workspace toggle | Plugin state per workspace and a client control | Exact control location decided in slice 2 |

## Known Limits

- Rules are policy. Paseo has no per-agent tool restriction upstream, so a
  member can still use `create_agent` or provider-native subagents.
- Lifecycle events are best-effort and not replayed. Plugin timeline rows are
  memory-only.
- `before("agent.create")` cannot tell who is creating an agent, so the plugin
  shapes only the agents it creates itself.

## External Dependencies

- Stock Paseo 0.10.2 or later. No fork patches.
- `@getpaseo/plugin` 0.10.2 (dev dependency, types only).
- A Paseo source checkout for the dev daemon. See [RUNBOOK.md](RUNBOOK.md).
