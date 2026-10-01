# 0004 Member Messaging Through A Plugin Send Tool

Date: 2026-10-01

## Status

Accepted by Human on 2026-10-01. Human chose a plugin tool that can either
steer into a recipient's running turn, or deliver after the recipient's turn
ends. Amends decision 0001, layer 3 (messaging).

## Context

Decision 0001 kept messaging between members on Paseo's built-in
`send_agent_prompt`. Slice 1 probes on stock Paseo `v0.10.2` showed two
costs.

1. **A busy recipient loses its turn.** The built-in tool always replaces a
   running turn, on both Claude and Codex. The source is
   `paseo-tools.ts:1931`, which reaches `replaceRunning: true` in
   `agent-prompt.ts:334`.
   - The app's `sendBehavior` setting (`interrupt`, `steer`, `queue`)
     covers only messages Human types in the app composer.
   - The app queue lives client-side. The daemon knows only `interrupt` and
     `steer`.
2. **Built-in tools need Paseo injection, and can prompt.** They require
   `daemon.mcp.injectIntoAgents: true`. In Claude's `default` mode every call
   asks Human for permission, and a plugin cannot preapprove the injected
   `paseo` server.

A plugin can already do what a better send needs. Slice 1 showed each of
these working on Claude and Codex:
- `agents.ref(id).send(text, {activeTurnBehavior: "steer"})` joins a running
  turn, or starts one when the recipient is idle;
- `agent.turn_ended` marks when a recipient's turn finishes;
- the plugin's own MCP tools identify the sender by its per-member secret
  and can be preapproved.

## Decision

1. SLP members message each other through a plugin MCP send tool, not
   through built-in `send_agent_prompt`.
2. The tool has two delivery kinds, chosen by the sender:
   - **after turn**, the normal kind: if the recipient is busy, the plugin
     holds the message and delivers it when that recipient's turn ends;
   - **steer**, to intervene: the message joins the recipient's running turn
     now.
3. The plugin stamps each message with its sender's role and assignment,
   taken from the per-member secret. The sender cannot claim another
   identity.
4. Messaging stays policy, not a trust boundary (decision 0001). The tool
   does not block built-in sends. The plugin makes them visible through
   the timeline and telemetry.

Agent decisions, which Human may revisit:
- After-turn is the default kind when the sender does not choose.
- Held messages are kept in plugin-owned files, so a daemon restart does not
  drop them.
- Delivery always uses `steer`, including after-turn delivery. A recipient
  that became busy again then gets the message in its running turn instead
  of losing the turn.

## Alternatives Considered

1. **Keep built-in `send_agent_prompt` with a convention** (message a Peer
   only after its handback; telemetry counts violations). Rejected by Human:
   it cannot intervene safely or wait for a turn to end.
2. **Rely on Paseo's `queue` send behavior.** Not possible: the setting is
   app-side and never reaches agent-to-agent sends.

## Consequences

Positive:

- A busy recipient no longer loses its running turn to a message. The
  sender picks between intervening and waiting.
- Plugin tools can be preapproved, so sending does not depend on the
  member's permission mode.
- Every SLP message passes through the plugin, so telemetry can count
  message rounds and deliveries from the source, which product required
  behavior 10 needs.
- SLP messaging no longer needs injected Paseo tools.

Tradeoffs:

- The plugin owns delivery state: held messages, ordering, and recovery
  after a restart. Lifecycle events are best-effort, so a missed
  `agent.turn_ended` must not strand a held message. Reconciliation
  re-checks recipients that are now idle.
- Built-in `send_agent_prompt` still works when Paseo tools are injected,
  and it still replaces busy turns. The plugin can see such calls but not
  stop them.

## Follow-Up

- Settled in slice 2 planning (Human, 2026-10-01): SLP still requires
  `daemon.mcp.injectIntoAgents`. Members use Paseo's `list_agents` and
  `get_agent_status`.
- Slice 3 implements the tool, the held-message store, delivery at
  `agent.turn_ended`, and reconciliation. It also decides:
  - whether several held messages to one recipient arrive as one prompt or
    in order;
  - whether handback uses after-turn delivery.
- Role instructions (slice 2) define who messages whom. The tool records
  routing; it does not enforce it.
