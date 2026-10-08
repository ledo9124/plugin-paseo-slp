# Documentation Map

Start with the smallest authoritative surface.

## Installed By Harness

- [`WORKFLOW.md`](WORKFLOW.md): request shape, planning, judgment, operation,
  validation, and completion.
- [`patterns/encoding-invariants.md`](patterns/encoding-invariants.md): turn
  accepted architecture, reliability, security, and quality rules into native
  mechanical validation.
- `templates/`: optional decision, plan, runbook, and Harness-improvement
  structures.
- `plans/`: one durable working-memory document for work that needs it.
- `decisions/` and `product/`: generic structure for this repository's own
  choices and product documents; both start empty of content.
- `.agents/skills/` (repository root): an invariant-encoding skill that
  responds to matching requests; a migration skill that, when asked, removes
  what earlier Harness releases left behind; and explicit-only onboarding,
  proposal-audit, and Harness-improvement skills.

## Owned By This Repository

This repository's README, product documents, architecture, decisions, plans,
code, tests, CI, runtime signals, and application behavior remain
authoritative. Harness does not overwrite those with upstream product
assumptions; add each one here as the repository accepts it.
