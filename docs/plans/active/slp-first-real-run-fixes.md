# Execution Plan: Fixes From The First Real Run

Date: 2026-10-03

## Status

Active

## Outcome

SLP after the first real run in `my-plugin` (workspace
`wks_634898884670851a`, 2026-10-03 10:29-13:05Z) has these changes:
- fewer needless wakes and notifications;
- clearer rules for Peers, models, and workflows;
- effort per role;
- a settings screen built from selects.

Human accepted the whole batch on 2026-10-03 ("Triển khai đi"), after two
councils:
- council 1 covered the run and issues 1-7;
- council 2 covered compaction and attention triggers;
- Human then corrected issues 5 and 8.

## Context

- Evidence and rulings: the exported run (`events.txt`, `ledger.json`) and
  the council packets, kept outside the repository in
  `%TEMP%/slp-run-analysis/`. The facts this plan rests on are restated
  below.
- Records this changes:
  - `docs/product/roles.md`;
  - `docs/ARCHITECTURE.md` (the `parent` row and the Lead-relay row);
  - decision 0008 item 1 (settings gain effort).
- The new decision is
  [0009](../../decisions/0009-group-traffic-and-inputs-after-the-first-real-run.md).

Run facts used:
- **Lead relay:**
  - every Lead turn was relayed to the Supervisor: 60 relays;
  - about 40 Supervisor turns were woken only by a relay ($2.23 of $6.72);
  - each of those turns posted to Human and raised a "finished"
    notification.
- **Push notifications:** 8 in the window, 6 of them for internal
  hand-offs. Paseo skips the "finished" attention only for agents labelled
  `paseo.parent-agent-id`.
- **Decision notices:** all 19 Supervisor `slp_decide` calls notified the
  Lead before the Supervisor's message reached it, which cost about 9
  extra Lead turns. Under D2 the Lead delegated A1-A3 before the goal
  arrived.
- **Peer reuse:**
  - 18 of 22 assignments reused a Peer, several across unrelated scopes;
  - Peer 3 reviewed its own commit;
  - from 11:23 the cap forced reuse, because it counts idle Peers.
- **Peer models:** the Lead chose the models and the Peer count. Human did
  not ask for either. The same thing happened in slice 5 (Haiku).
- **Workflow:**
  - the Lead read `WORKFLOW.md` only after Human said "Làm plan trước"
    (D10);
  - the Claude Peers never read `AGENTS.md` or `WORKFLOW.md`.
- **Compaction:** Peer 2 (Codex) compacted once. Paseo puts a `compaction`
  item into the turn timeline the plugin receives.

## Scope

In scope:

| Group | Issue | Change |
| --- | --- | --- |
| G1 | 7 | Relay a Lead turn only when a Supervisor or Human message started it, or when no assignment is open at its end. |
| G1 | N1 | Supervisor decisions no longer notify the Lead; the Supervisor's message carries them. |
| G2 | 6 | A Peer is reused only for the next step of its own scope; a review never goes to the author. The cap counts only Peers holding an open assignment. |
| G2 | 3 | Peers run on the default model unless Human (or a template Human named) asks for another. |
| G2 | N2 | Everything a Peer needs goes in the brief; a redo goes through rework. |
| G2 | 5 | The Lead declares the workflow for each new goal; the Supervisor checks it; briefs carry a required `workflow`. |
| G2 | 8 | Anyone checking another member's work asks open questions with a concrete doubt and asks for evidence. The handback prompt carries the check. |
| G2 | compaction | Re-read the rules after a compaction; the plugin records `compaction` events. |
| G3 | 1 | Effort per role (`thinkingOptionId`), per provider for Peers. An id the model does not list is omitted. |
| G3 | 2 | Settings selects from the daemon's provider lists, with a text fallback. |
| G4 | 4 | The Lead and Peers are created with `parent` = Supervisor, so only the Supervisor notifies Human. |
| G5 | — | `my-plugin/CLAUDE.md` imports `@AGENTS.md` (Human, 2026-10-03). |

Out of scope:

- Watching chain of thought for an "attentioner"; there is no reasoning
  text to read.
- Merging after-turn messages per sender turn.

## Approach

Each group is implemented and tested before the next one starts.
1. Implement G1 and G2 with unit tests on the fake host.
2. Update the records in the same change.
3. Implement G3 and G4.
4. Live checks on the main daemon, following the runbook:
   - effort reaches `runtimeInfo`;
   - `usePaseo()` works on the settings screen;
   - `parent` silences the Lead's and Peers' notifications;
   - the app still shows the members.

## Risks And Recovery

- **Silent Lead turns.** A Lead turn that a Peer started, and that ends
  with work still open, is no longer relayed.
  - Mitigation: a pending decision still reaches the Supervisor, and the
    Lead may `slp_send`.
  - Mitigation: the Lead role says an effect Human has not accepted is a
    pending decision.
- **Parent side effects.** With `parent` = Supervisor, archiving the
  Supervisor archives the group. Creation also needs the Supervisor
  loaded.
  - Live check before release.
  - Revert by dropping `parent`.
- **Older ledgers.** Ledgers written before this change have briefs
  without `workflow`, so the stored field stays optional. Only the
  delegate input requires it.

## Progress

- [x] G1: relay rule (`owesSupervisor`) and Supervisor decision notices
- [x] G2: role texts, brief `workflow`, cap, handback prompt, compaction event
- [x] G3: effort setting (validated against `listModels`) and settings selects
- [x] G4: `parent` = Supervisor
- [x] G5: `my-plugin` `CLAUDE.md` imports `@AGENTS.md` (uncommitted in that repo)
- [x] Records: `roles.md`, `ARCHITECTURE.md`, `slp-and-harness.md`, 0008 amendment, 0009
- [ ] Live checks: waiting for Human. The main daemon runs release v0.3.1 from Git,
  and the run-1 group (`wks_634898884670851a`) is still open there.

## Decisions

- 2026-10-03: Human chose "only the Supervisor notifies Human" (issue 4).
- 2026-10-03: Human corrected issue 5. The risk is a switch between kinds
  of work, not compaction. The Lead declares the workflow because the
  work's shape needs code facts the Supervisor does not read; the
  Supervisor checks the declaration against Human's intent.
- 2026-10-03: Human corrected issue 8. Neutral questions are for any member
  that checks another, not only the Supervisor.

## Validation

- Focused proof: vitest on `coordination.test.ts`, `slp-service.test.ts`
  and `settings.test.ts`.
- Integration or end-to-end proof: the live checks listed in Approach.
- Repository-required checks: `npm run typecheck`, `npm test`.

## Result

Pending.
