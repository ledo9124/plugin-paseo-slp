# 0012 Dual-Lane Gains A Review Mode

Date: 2026-10-19

## Status

Accepted by Human on 2026-10-19 (ledger D20, option R1). Amends decision
0011 item 1 (the shipped text) and adds a second one-time migration beside
0011 item 2.

## Context

- **Human's reference (ledger D14).** Code review with two independent Opus
  lenses in fresh contexts, blind to each other, using different methods:
  one reviews against the intent; the other lists every claim and checks
  every place it must hold, including untouched code. Proceed where they
  agree; on a conflict each answers the other with evidence and the main
  session decides. Two lenses for the first review and the pre-merge
  verdict; one lens per fix round. Human's data: across 15 lens pairs, 57
  blocking or major findings, 37% found by both.
- **One template (ledger D15, D16).** Human: "dual lens một loại thôi chứ
  sao lại tách thành cái mới?" (keep dual lens as one kind). The Lead
  decides per goal when to use it.
- **The options (ledger D20).** R1 adds a Review mode and keeps the other
  modes and their models; R2 also moves the choice lanes to Opus; R3
  rewrites the template around lane methods. Human chose R1, with the
  Review text as the Lead proposed it.
- **Evidence before the change.** Three real dual-lane uses, and 16 code
  reviews in real runs, all single-reviewer.

## Decision

1. **The shipped dual-lane text** keeps the v0.3.7 text and adds:
   - a description and a "When to use" that name a change to review;
   - a fourth mode, Review, in the mode list;
   - the "Review mode" section as approved in D20: two fresh Opus 5.5
     Peers of kind `review`, blind, neither the author; lens A by intent,
     lens B by claims; findings with severity, file and line, and
     evidence; agree and act, or one unnamed exchange and the Lead
     decides, with no arbiter; one fresh lens per fix round; two lenses
     again before merge; the outcome records which lens found what.
   A test pins its length (6,809 bytes) and hash. The Opus model is named
   by the text, so a Lead naming it follows a template Human approved
   (0009).
2. **One-time migration.** When the template store loads an existing
   `templates.json`, a template named `dual-lane` whose text equals the
   v0.3.7 text byte for byte is replaced in place by the current text,
   after the file is copied to `templates.json.bak-v0.3.7` (unless that
   backup exists). An edited dual-lane, a removed one, and every other
   template stay as they are. The v0.3.7 text stays in
   `default-templates.ts` only for this match, pinned by its own test.

## Alternatives Considered

1. **R2: Opus for the choice lanes too.** Not taken by Human: it reverses
   the models Human named in 0011 (ledger D16 of 2026-10-07).
2. **R3: one generic lane-method shape.** Not taken by Human: it rewrites
   most of the text Human approved for 0011.
3. **A separate review template.** Not taken by Human (D15): one kind.

## Consequences

- The Review mode is unproven in this project's runs; the reference data
  comes from Human's other project. 0007 item 3.4 still asks a template to
  show that it changes outcomes; a later run may keep, revise, or remove it.
- A running group keeps the catalog it was created with; the new text
  reaches a group through `slp_template` once the store has migrated.
- Rollback: the previous release `v0.3.7` and `templates.json.bak-v0.3.7`.
