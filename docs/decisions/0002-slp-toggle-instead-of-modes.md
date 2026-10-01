# 0002 An SLP Toggle Instead Of Modes

Date: 2026-10-01

## Status

Accepted by Human on 2026-10-01.

Amended on 2026-10-01 by [0005](0005-slp-mode-locks-at-the-first-message.md):
- the mode can change only before Human's first message in the workspace,
  which then locks it;
- archiving the workspace ends the group, replacing item 4 and the
  separate end-group action.

The rest of this decision stands.

## Context

SLP suits large codebases with vertical dependencies, architectural
uncertainty, several ownership boundaries, and discovery during
implementation. For a small change, or for work that needs continuous Human
feedback such as game feel or UI tuning, one ordinary agent is better.

A choice between "direct" and "supervised" topologies was considered and
rejected. Human wants one switch: use SLP, or use agents normally.

## Decision

1. SLP is off by default. Human turns it on or off per workspace.
2. **Off:** Paseo agents behave normally. The plugin adds nothing to agents
   it did not create.
3. **On:** the plugin starts one SLP group in the workspace with a Supervisor,
   who is Human's counterpart, and a Lead. The Lead creates Peers on demand.
   Agent decision: the toggle replaces modes, so an active group always has a
   Supervisor. Human may revisit this.
4. **Turning SLP off** stops new SLP work in that workspace. Ending an active
   group and its members is a separate, explicit Human action, so no work is
   discarded silently.

## Alternatives Considered

1. **Direct and Supervised modes.** Rejected by Human: the extra choice is not
   needed.
2. **Always on for every workspace.** Rejected: it adds coordination cost to
   work that one agent finishes better.

## Consequences

- Human can see whether a workspace runs SLP.
- No Supervisor-less group exists. A small task should run with SLP off.

## Follow-Up

- Slice 2 of the v0.1 plan defines where the toggle appears in the client and
  the end-group action.
