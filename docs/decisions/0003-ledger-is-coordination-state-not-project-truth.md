# 0003 The Ledger Is Coordination State, Not Project Truth

Date: 2026-10-01

## Status

Accepted by Human on 2026-10-01.

## Context

The coordination ledger (decision 0001) records:
- who owns which changing scope;
- which brief each Peer follows;
- which findings are open;
- which decisions were made, and whether by Human or an agent;
- what the Lead has accepted.

A consumer project may already keep its own system of record, such as
repository docs, plans, and decisions managed with repository-harness. Two
places holding project decisions would compete for authority. An agent's
message or ledger entry must also never become authority for new externally
observable policy.

## Decision

1. The ledger holds live coordination state for one SLP group: ownership
   claims, briefs, findings, pending decisions, acceptance, and the source of
   each decision (Human or agent).
2. When a Lead decision should outlive the group (a project, architecture, or
   product choice), the Lead records it in the project's own system of
   record. The ledger links to it and does not replace it.
3. A ledger entry made by an agent is not Human authority. A choice that
   Human has not settled stays pending in the ledger and reaches Human
   through the Supervisor.
4. SLP prescribes no project plan or task system for the consumer project.

## Alternatives Considered

1. **Ledger as the project's decision record.** Rejected: it creates a second
   source of truth beside the repository.
2. **No ledger; read transcripts.** Rejected: Human cannot see briefs,
   decision sources, or open disagreements without reading every
   conversation.

## Consequences

- Ending a group can discard its ledger without losing project decisions.
- The Lead's instructions must include promoting lasting decisions.
