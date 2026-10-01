# 0001 SLP As A Paseo Plugin

Date: 2026-10-01

## Status

Proposed. Awaiting Human acceptance. Nothing beyond a no-op plugin skeleton
may be built on it until then.

## Context

SLP currently exists as a fork, `ledo9124/paseo-slp` (branch
`sync/upstream-2026-09-14`, HEAD `9c89de81a`). The fork carries about 21,000
changed lines against upstream Paseo across 207 files. These include about
4,800 lines of daemon orchestration code, about 1,500 lines of edits to core
server and protocol files, about 3,200 lines of app UI and integration, and a
separate product identity (`paseo-slp` executables, home, port, desktop app
identity). Every upstream release must be merged into the fork.

The Human wants SLP delivered as a plugin for Paseo instead.

The fork's own `docs/slp/architecture.md` rejects "a plugin subprocess as the
lifecycle owner". Its gates run synchronously inside daemon lanes:
- non-cancelling turn admission;
- refusing turns to retired generations;
- an execution policy pushed into provider sessions;
- per-caller filtering of Paseo MCP tools;
- interception of `create_agent`.

Paseo plugins run in a separate subprocess with asynchronous hooks.

The Paseo 0.10.2 plugin API (`@getpaseo/plugin`) does provide:
- `agents.create` with `systemPrompt`, `labels`, `mcpServers`, `toolPolicy`,
  and provider options;
- `send`, `run`, `waitForFinish`, and timeline access on agent handles;
- `agent.turn_ended` events carrying the timeline;
- typed RPCs, host settings, an unsandboxed Node subprocess, and client
  panels, header buttons, settings screens, and timeline rows.

It does not provide:
- cancel, close, or label and prompt updates on a live agent;
- a hook on sends or tool calls;
- per-agent hiding of built-in tools, except through the fork-only per-agent
  `paseoTools` narrowing at `ledo9124/paseo` branch `per-agent-paseo-tools`;
- durable event delivery;
- composer takeover.

## Decision (proposed)

Build SLP v0.1 as a pure plugin (option 1), with these rules:

1. The plugin server process owns group state, membership, mailboxes, and
   role instruction composition. State is stored as plugin-owned files and
   reconciled from `agents.list` and timelines on startup.
2. The plugin creates every member through `agents.create`. That call sets
   the composed role system prompt, SLP labels, and a plugin-hosted HTTP MCP
   server. The MCP server's URL carries a per-member secret, so caller
   identity is issued by the plugin, not self-asserted.
3. Members coordinate only through plugin MCP tools, for example a Lead-only
   delegate tool and a routed send tool. Built-in `create_agent` and
   `send_agent_prompt` are narrowed away per member through `paseoTools`.
4. A Peer's handback is its last message at `agent.turn_ended`. The plugin
   delivers mail only at a recipient's turn boundary, never interrupting a
   running turn. It accepts a small race window, documented as a known
   limitation.
5. Role enforcement is policy, not a trust boundary.
6. v0.1 leaves out these fork features: handoff and receive-only preparation,
   destructive-operation gates, composer takeover, and fork branding.

## Alternatives Considered

1. **Pure plugin (proposed).**
   - No fork maintenance; installs into stock Paseo.
   - Depends on the `paseoTools` patch until it lands upstream.
   - Weaker atomicity than the fork.
2. **Plugin plus a small upstream core seam.** Upstream PRs for the hooks a
   plugin cannot replicate: non-cancelling send, a turn-admission veto, and
   per-agent tool narrowing.
   - Stronger guarantees.
   - Depends on upstream review, and the patches must be maintained until
     they merge.
   - Can follow option 1 once evidence shows which hooks matter.
3. **Keep the fork.**
   - Strongest guarantees and the most complete feature set.
   - Highest maintenance cost, and the Human chose to move away from it.

## Consequences

Positive:

- SLP follows Paseo releases through the plugin API instead of fork merges.
- It matches the SLP principle of starting with prompts and simple
  boundaries, and moving behavior into runtime only on evidence.

Tradeoffs:

- Mail delivery checks idleness, then sends, so a turn may start in between.
- Members can still use provider-native subagents unless provider settings
  or permission answers stop them.
- Events missed while the plugin is down must be reconciled.
- Plugin timeline rows do not survive a daemon restart.
- The per-agent `paseoTools` dependency is fork-only until upstreamed.

## Follow-Up

- Human: accept, revise, or reject this proposal.
- If it is accepted, verify the `paseoTools` dependency and the HTTP MCP route
  in slice 1 of the active plan before building on them.
