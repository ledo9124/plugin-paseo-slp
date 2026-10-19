# Execution Plan: SLP Fix Batch D19 (v0.4.0)

Date: 2026-10-19

## Status

Completed

## Outcome

One release (v0.4.0) that ships the SLP fixes Human settled in the
plugin-paseo-slp Lead group's ledger, merged, pushed, and tagged (Human, D19:
"Tới push + phát hành"):

- Supervisor steer rule (D6-D8) and the send_agent_prompt ban reason (D17).
- Context: native auto-compact threshold per role in the SLP UI, applied per
  member; proactive Supervisor handoff to a new Lead with the Peers kept
  (D11-D13, D22); a Peer near full context gets no next step (D12).
- Unified dual template (D15, D16; text per Human's answer to D20).
- Sender label of a new Peer's brief (D18).
- Paseo 0.12 upgrade: SDK dev dependency 0.12.0, no `as unknown` cast, docs
  current; `requirements.paseo` stays `>=0.10.2` (D2).

## Context

- Ledger decisions D1-D22 (this group). Backlog note in the Lead's memory
  (`slp-pending-issues.md`).
- Decisions 0004 (messaging), 0008 (per-role config, templates), 0009
  (parent = Supervisor; Lead reply relay), 0011 (dual-lane and its migration).
- Paseo v0.12.0 source (`C:\code\my-project\paseo`, tag `v0.12.0`).

## Scope

In scope: the items under Outcome.

Out of scope (D19): D5-B, UI improvements, test cleanup.

## Approach

1. `/autocompact` scratch test (D13). Done, see D22: `/autocompact` writes
   `~/.claude/settings.json` per model; the per-agent route is Claude Code's
   `--autocompact <tokens>` flag through Paseo's Claude `extraArgs`
   (persisted, survives reload, compaction seen on Opus at 100k).
2. Steer texts: Supervisor role text (W1 + H1), `slp_send` description,
   GROUP paragraph reason for the ban; tests.
3. Paseo 0.12: SDK `@getpaseo/plugin` 0.12.0; `sendPrompt` without the cast;
   `sourceAgentId` only with a fallback for hosts without provenance.
4. D18: Paseo 0.12.0 (#6373, `create.ts`) wraps a created agent's initial
   prompt with `source = parent`. Create the Peer without a prompt, then send
   the brief with the Lead as source (fallback: plain send).
5. Handoff: Supervisor tool `slp_handoff`; new Lead with the Lead role's
   current setup; held messages move; the Lead member gets a new secret;
   old Lead archived when idle; the old Lead's note goes to the new Lead
   in the Supervisor's handoff message after it is created.
   Role texts (Supervisor, Lead, Peer-context rule).
6. Threshold setting per role (`autoCompactWindow`), Claude only, applied as
   `extraArgs.autocompact` at creation. Behavior beyond that waits for D21.
7. Dual template after D20.
8. Validation, review by two fresh Peers, live checks on a scratch daemon
   (D26), docs,
   decision record, merge, tag v0.4.0, push.

## Risks And Recovery

- A3 risks for the handoff (backlog note): (a) the old Lead's background
  processes die with it: the handoff note lists them, and the old Lead is
  archived only after its turn ends; (b) held messages and `owesSupervisor`
  move to the new Lead; Peer handbacks already resolve the Lead by role;
  (c) the new Lead gets the role's setup, labels, and a new MCP secret on
  the Lead member (the old Lead's URL stops working); (d) the Supervisor's text allows the handoff tool; (e) the note
  plus `slp_ledger`.
- A live check must not touch 6767 or Human's config files (D26): it runs
  on a scratch daemon with its own home and port.
- Rollback: the previous release `v0.3.7`.

## Progress

- [x] 1. Scratch test (D22).
- [x] 2. Steer texts (41ef117).
- [x] 3. Paseo 0.12 upgrade (f8a2e26).
- [x] 4. D18 (f8a2e26).
- [x] 5. Handoff (3b80afa).
- [x] 6. Threshold setting, T1 base (3b80afa); D21 may add more.
- [x] Clean compile with Paseo v0.10.2's compilePlugin (client 123,538 B,
  server 136,219 B).
- [x] Review: A2 (intent lens), A3 (claims lens), on f1c8b0e..3b80afa;
  fixed in c2c31c7 and f085834.
- [x] Pre-merge verdict: A4 (intent), A5 (claims), Opus, on
  f1c8b0e..f085834: ready to merge; fixes in e3bd462 and the next commit.
- [x] 7. Dual template: Review mode (D20 R1), migration, decisions 0012
  and 0013 (089d7a2).
- [x] Live check on a scratch Paseo 0.12.0 daemon (D26: port 6768, home
  %TEMP%/slp-d19-home, MCP 6792; 6767 untouched; stopped after), driving
  the plugin's MCP tools with the members' secrets:
  - Lead created with `extraArgs.autocompact: "600000"`, Peer with
    `"300000"`, Supervisor without; parents the Supervisor.
  - D18: the Peer's timeline shows "[Message received] SLP Lead"; its
    transcript envelope has `source-agent-id` = the Lead.
  - `slp_handoff` during the Lead's turn: refused ("The Lead is in a
    turn").
  - After the Lead replied with its own note: `slp_handoff` created Lead
    2c269b2b (autocompact 600000, parent the Supervisor), archived the old
    Lead, delivered the handoff note, held the notice for the busy Peer;
    the Peer's handback reached the new Lead, which accepted A1 with its
    new secret; its reply was relayed to the Supervisor.
  - Usage events carry `contextWindowUsedTokens` and
    `contextWindowMaxTokens`.
- [ ] 8. Validation, review, live checks, release.

## Decisions

- 2026-10-19: Human chose R1 (D20), T1 (D21), the old Lead's own note and
  archive once idle (D23, D24), and live checks on a scratch daemon with
  Human installing v0.4.0 on 6767 (D26).
- 2026-10-19: per-agent threshold through `extraArgs.autocompact`, not
  `/autocompact` (D22; `/autocompact` writes the user settings file).

## Validation

- Focused proof: unit tests per change (roles, tools, coordination, service,
  settings, templates).
- Integration or end-to-end proof: live check on a scratch 0.12.0 daemon
  (D26): a scratch SLP group, a delegate (sender label), a handoff with a
  Peer kept, the threshold in each member's stored `extraArgs`.
- Repository-required checks: `tsc --noEmit -p plugins/slp`, `vitest run`,
  a clean compile with Paseo's `compilePlugin`.

## Result

v0.4.0, merged to main and tagged (2026-10-19).

- Evidence:
  - 174 unit tests and the typecheck pass.
  - A clean copy compiles with Paseo v0.10.2's `compilePlugin`.
  - The live check ran on a scratch 0.12.0 daemon (above).
  - Reviews: lenses A2/A3; a pre-merge verdict A4/A5, Opus, the template's Review mode; and the fix round A6. Every finding is fixed or recorded below.
- Human decisions: D6-D8, D11-D13, D17, D18, D20, D21, D23, D24 and D26. D22 is the Lead's route within D13. Records: decisions 0012 and 0013.
- Not done here:
  - Human installs v0.4.0 on 6767 (D26). Its stored v0.3.7 dual-lane then migrates once, with a `templates.json.bak-v0.3.7` backup.
- Limits and follow-ups:
  - The new create-then-send order for Peer briefs ran live only on 0.12.0. On 0.10.x and 0.11.x it was checked by reading the source and by the compile.
  - A Supervisor tool list saved in Settings before v0.4.0 lacks `slp_handoff`; Human has none saved.
  - The report label "Busy-send violations" predates D17's new reason.
  - The `held-dropped` reason says "handed back" also for an accepted or dropped assignment.
  - The Settings unmount path has no rendered test.
  - The old Lead's background processes end with it, and its note must list them.
