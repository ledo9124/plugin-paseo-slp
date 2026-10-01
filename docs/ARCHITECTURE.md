# Architecture

Status: proposed by [decision 0001](decisions/0001-slp-as-a-paseo-plugin.md).
Only the repository layout and a no-op plugin entry exist.

## Repository Layout

- `plugins/slp/`: the Paseo plugin, installed as a directory source.
  - `paseo-plugin.json`: manifest (`id`, `requirements.paseo`).
  - `index.server.ts`: server entry, run by Paseo in a forked Node
    subprocess.
  - `server/`, `client/`, `shared/`: Paseo's compiler rejects imports across
    these boundaries and code modules at the plugin root.
- `docs/`: Harness core plus this repository's product, decisions, plans,
  runbook, and research notes.
- `scripts/bin/harness(.exe)`: untracked Harness maintenance binary.

Paseo compiles plugin TypeScript itself; there is no build step. Run
`npm install` before installing or reloading, because Paseo does not install
dependencies for a directory source.

## Runtime Boundaries (Proposed)

```text
Human ── Paseo app ── client entry (panels, settings; later)
                         │ typed RPC
Paseo daemon ── plugin subprocess (index.server.ts)
   │                 ├─ group store and mailboxes (plugin-owned files)
   │                 ├─ role prompt composition
   │                 ├─ HTTP MCP endpoint: SLP tools, per-member secret
   │                 └─ lifecycle observers (agent.turn_ended, ...)
   └─ member agents (Supervisor, Lead, Peers), created by the plugin
```

| Need | Plugin mechanism | Gap or limitation |
| --- | --- | --- |
| Create members with role instructions | `paseo.agents.create({config: {systemPrompt, mcpServers, ...}, labels})` | The prompt and labels cannot be changed after creation |
| Member identity for SLP tools | Plugin-hosted HTTP MCP server; per-member secret in the URL | Must prove that both target providers honor HTTP MCP config |
| Stop members from using built-in delegation | Per-agent `paseoTools` narrowing | Fork-only patch (`ledo9124/paseo`, `per-agent-paseo-tools`) until upstreamed |
| Peer handback, Lead report | `agent.turn_ended` with timeline; last assistant message | Best-effort events; reconcile after downtime |
| Non-interrupting mail | Send only when the recipient is idle | Not atomic; a turn may start between check and send |
| Group state across restarts | Plugin-owned JSON files plus reconciliation from `agents.list` | Plugin timeline rows are memory-only |
| Start a group, view state, settings | Client workspace panel, command-center item, settings screen | No composer takeover; Human talks to a member in its own chat |
| Block provider-native subagents | Provider settings or permission answers | Policy only, per provider |

## Deliberately Absent In v0.1

These exist in the `paseo-slp` fork and are not reproduced:

- handoff and receive-only preparation;
- destructive-operation gates;
- admission vetoes for retired generations;
- composer takeover;
- fork branding.

Revisit any of them only with evidence that the plugin form fails a required
behavior in the [product overview](product/overview.md).

## External Dependencies

- Paseo at version 0.10.2 or later; `requirements.paseo` must match the daemon.
- `@getpaseo/plugin` 0.10.2 (dev dependency, types only).
- A Paseo source checkout for the dev daemon. See [RUNBOOK.md](RUNBOOK.md).
