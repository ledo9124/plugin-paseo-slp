# Product Docs

This directory contains current consumer-product behavior derived from real
accepted intent. Harness deliberately ships no fake product domains.

When a user provides a product specification, derive smaller living documents
here instead of keeping one growing specification as the operating manual. Name
files after actual product domains, such as `overview.md`, `billing.md`,
`permissions.md`, or `api-conventions.md`.

## Current Product Contract

- [overview.md](overview.md): SLP for Paseo. The outcome (three jobs),
  what SLP is (four layers), the toggle, roles, required behavior,
  non-goals, and open items. Partly implemented; accepted in decisions
  0001-0007.
- [slp-and-harness.md](slp-and-harness.md): the boundary between SLP and
  Repository Harness, and how they run together (decision 0007).
- [roles.md](roles.md): each role's definition, with routing per kind of
  message. Accepted by Human on 2026-10-02 (decision 0008) and amended by
  decision 0009.
- [role-scenarios.md](role-scenarios.md): the scenario suite that tests
  those definitions.

## Update Rule

When behavior changes:

1. Update the affected product document when the expected behavior changed.
2. Update the active execution plan when complex work uses one.
3. Add a lasting decision only when future work must inherit a consequential
   product, architecture, data, security, compatibility, or validation choice.
4. Add or update executable proof that exercises the behavior.

Bounded changes do not require a parallel lifecycle record.
