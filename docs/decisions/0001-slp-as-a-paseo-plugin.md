# 0001 SLP As A Coordination Plugin On Paseo Primitives

Date: 2026-10-01

## Status

Accepted by Human on 2026-10-01 ("follow the proposal, true to the existing
context").

## Context

SLP is a way of organizing agent work: roles defined by responsibility,
authority, and information flow, not personas. Its source articles describe it
as an organization built on the room, session, and messaging primitives Paseo
already provides, not as a replacement runtime. They also recommend starting
simple, using the method on real work, and adjusting. Better-SLP treats
removing a mechanism as a valid improvement.

The earlier `paseo-slp` fork is not a basis for this decision.

Paseo upstream (`getpaseo/paseo` main at `d30e99c85`, plugin SDK 0.10.2)
offers the following, verified in source.

Paseo can give agents built-in tools:
- `create_agent`, which creates the caller's subagent and can notify the
  caller when it finishes;
- `send_agent_prompt`, `get_agent_status`, and `list_agents`;
- `cancel_agent`, `archive_agent`, and `update_agent`.

Correction, 2026-10-01: these tools reach agents only when
`daemon.mcp.injectIntoAgents` is enabled, and it defaults to `false`. Slice 1
probe 0 checks this. If Human will not enable it, this decision must be
revisited.

A prompt sent to a busy agent either steers its running turn or replaces it.
There is no queue.

Plugins get:
- `agents.create` with `systemPrompt`, `labels`, and `mcpServers`, and their
  own Node subprocess that can host an MCP server;
- `agent.created`, which carries `parentAgentId`, and `agent.turn_ended`,
  which carries the timeline;
- RPCs, settings, client panels, and storage.

Plugins cannot:
- change an agent's system prompt after creation;
- tell from `before("agent.create")` who is creating an agent;
- restrict Paseo tools per agent. Upstream has only a global switch and
  per-provider policy.

## Decision

Build SLP as a coordination plugin in two layers. Messaging stays on Paseo's
built-in tools.

1. **Conventions:** role instructions for Supervisor, Lead, and Peer, and a
   brief structure. The brief separates the goal, binding constraints with
   their source, the current design choice, open uncertainties, and the
   evidence that would reopen the direction.
2. **Coordination service:** the plugin server process provides:
   - group lifecycle;
   - a Lead-only delegate tool that creates each Peer with its role
     instructions;
   - a coordination ledger exposed as plugin MCP tools, recording ownership
     claims, briefs, findings, decisions with their source, and acceptance;
   - a client panel where Human sees the ledger and records decisions;
   - process telemetry.
3. **No runtime enforcement in v0.1.** Ownership and routing rules are
   conventions. Violations are made visible through the ledger and
   `parentAgentId`, not blocked.
4. **Enforcement needs evidence.** A rule is promoted to enforcement only
   when telemetry or an evaluation shows that conventions fail and prompts
   cannot fix it. Promotion needs a new decision.

## Alternatives Considered

1. **Conventions only:** role prompts, brief template, and skills.
   - Cheapest, and uses only upstream features.
   - Fails two requirements: Human visibility and steering, and the process
     data Better-SLP needs.
   - Kept as the first layer of the chosen approach.
2. **Runtime-controlled routing:** plugin-owned mailboxes, disabled built-in
   tools, and identity gating.
   - Needs per-agent tool restriction, which upstream lacks, and still races
     with built-in sends.
   - Contradicts the thin-layer intent.
   - Revisit only on evidence.

## Consequences

Positive:

- Runs on stock Paseo with no fork patches, and follows upstream through the
  plugin API.
- Human sees which brief each agent follows, which constraints came from
  Human, which choices an agent made, and what is unresolved.

Tradeoffs:

- Rules are policy, not a trust boundary. An agent can bypass them with
  built-in tools; the ledger shows that but does not prevent it.
- Sending to a busy agent steers or replaces its turn. The convention is to
  message a Peer after its handback; telemetry measures violations.
- Lifecycle events are best-effort, so the plugin reconciles state on
  startup.

## Follow-Up

- Slice 1 of `docs/plans/active/slp-plugin-v0.1.md` proves four things:
  - the plugin-hosted MCP route;
  - Peer creation with role instructions;
  - handback delivery;
  - busy-send behavior on each target provider.
- Revisit this decision if any of those fail.
