# 0006 The SLP Lead Cannot Use Its Provider's Own Subagents

Date: 2026-10-01

## Status

Accepted by Human on 2026-10-01. Amends decision 0001, item 3 ("no runtime
enforcement in v0.1"), for this one rule. It follows item 4 of 0001: the
rule rests on evidence and a new decision.

## Context

In the slice 6 field run, an SLP group ran an experiment in
`repository-harness`. The Lead never called `slp_delegate`. Instead, it
started workers as Claude Code `Agent`-tool subagents inside the worktree.
- The Supervisor stopped those 5 launches, because they risked leaking the
  registered design into the workers.
- In the slice 4 and slice 5 runs, the Lead also did its work without
  Peers unless Human asked.

A provider subagent has none of what SLP adds:
- no brief that separates the goal, binding constraints, and the earlier
  choice;
- no owner or scope in the ledger;
- no handback, Lead acceptance, or finding;
- nothing in the Human panel.

Delegating that way makes the coordination invisible to Human and to the
group. Human asked to block it, only within SLP.

Facts this relies on, at Paseo `v0.10.2`:
- an agent's `config.providerOptions` reaches the Claude Agent SDK
  options (`providers/claude/agent.ts`), and the Claude provider accepts
  `disallowedTools` (`providers/claude/options.ts`);
- the option is per agent. Other agents on the daemon are unaffected;
- Claude Code names its subagent tool `Agent`; older versions name it
  `Task`.

## Decision

1. An SLP **Lead** cannot use its provider's own subagent tool. Work it
   wants done by another agent goes through `slp_delegate`, so that it
   gets a brief, an owner, a handback, and acceptance.
2. **Scope: SLP members only.** The rule applies to the Lead the plugin
   creates for an SLP group. Agents outside SLP, and workspaces with SLP
   off, are not affected.
3. **Mechanism (Claude).** The plugin creates a Claude Lead with
   `providerOptions.disallowedTools: ["Agent", "Task"]`. The tool is
   removed from the Lead's toolset; this is not a permission prompt.
4. The Lead's role instructions say the same, so Leads of other providers
   follow it as a convention.

Agent decisions, which Human may revisit:
- **Leads of other providers:** no per-agent subagent block was found for
  them, so the rule is a convention there. The process report makes a
  violation visible.
- **Shell commands are out of scope.** Starting another agent CLI from a
  shell (`claude -p`, `codex exec`) is not blocked. Slice 6 used it
  legitimately for clean experiment workers.
- **Existing groups are unchanged.** A Lead keeps the configuration it was
  created with; the block applies to groups started after this change.

## Alternatives Considered

1. **Instructions only.** Not chosen: Human asked for a block, and the
   field run showed the Lead using subagents when nothing stopped it.
2. **Block subagents for every member.** Not chosen: Human scoped the rule
   to the Lead within SLP. Peers and the Supervisor keep their tools.
3. **A daemon-wide `disallowedTools` setting.** Rejected: it would affect
   every agent on the daemon, against item 2.

## Consequences

Positive:

- Delegation by the Lead is visible in the ledger and the panel, and
  passes through the brief structure that the slice 6 experiment supports.

Tradeoffs:

- A Lead loses a cheap way to parallelize read-only searches. Such work
  now needs a Peer, which costs more.
- The block depends on Claude Code's tool names. If a future version
  renames the subagent tool, the block stops working silently. Recheck
  after a Paseo or Claude Code upgrade.

## Follow-Up

- Implemented for groups started after 2026-10-01; proved live (see the
  v0.1 plan, `docs/plans/completed/slp-plugin-v0.1.md`).
- The deferred delegation experiment (when a Lead should delegate) needs
  more analysis first; Human postponed it on 2026-10-01.
