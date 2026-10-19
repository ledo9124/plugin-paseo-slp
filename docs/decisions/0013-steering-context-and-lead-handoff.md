# 0013 Steering, Context Windows, And The Lead Handoff

Date: 2026-10-19

## Status

Accepted by Human between 2026-10-14 and 2026-10-19 (ledger D6-D8,
D11-D13, D17, D18, D21, D23, D24); the auto-compact route is the Lead's
choice within D13 (ledger D22), which Human was told of and did not
object to. Amends 0004 (the reason built-in `send_agent_prompt` is not
used) and adds to 0009 (Peers as one line of work).

## Context

- **Steering.** In the language-learning-core group, a Supervisor message
  that changed the Lead's running work waited about 5 minutes as an
  after-turn message (ledger D47 there). Human asked when and how the
  Supervisor intervenes (D3, D4: the Lead only).
- **Paseo 0.12.0.** `send_agent_prompt` steers by default for agent
  callers (#5164), so "it cancels a busy recipient's turn" is no longer
  true. A create prompt is shown as sent by the caller, which a plugin's
  `parent` sets (#6373); SLP's Peer briefs showed as from the Supervisor.
- **Context.** A long goal fills the Lead's context. Human wanted a
  threshold in the SLP UI and a proactive handoff, without a compact tool
  (D9-D12).
- **The auto-compact test (D22).** Claude Code's `/autocompact` command
  writes `modelSettings.<model>.autoCompactWindow` into the user's
  `~/.claude/settings.json`; a create-time env var is lost on reload; the
  `--autocompact` flag through Paseo's Claude `extraArgs` is per agent,
  stored with it, kept after a reload, and compacted Opus 5.5 at 100k.

## Decision

1. **Steer rule (D6, D7).** The Supervisor steers into the Lead's running
   turn only when the Lead's work would otherwise be wasted: Human's answer
   stops, narrows, or reverses it. The steer is one short note (decision id,
   what to stop or keep); the rest goes after-turn; when unsure, the
   one-line note. The `slp_send` description says the same.
2. **Built-in sends stay banned (D17)**, because they bypass SLP's held
   messages, the ledger, the relay of the Lead's reply, and the panel.
3. **A Peer's brief comes from the Lead (D18).** The Peer is created without
   a prompt, with the Supervisor still as parent (0009), and the brief is
   sent with the Lead as source where the host supports it.
4. **Auto-compact window (D11, D13, D21, D22).** One optional field per role
   in Settings, 100k-1M tokens. A Claude member gets it as
   `extraArgs.autocompact` when it is created; nothing writes Human's
   settings files. The plugin sends no other signal: the Supervisor and the
   Lead decide on their own reading of `lastUsage.contextWindowUsedTokens`.
   A changed value applies to members created after it.
5. **Lead handoff (D11, D12, D23, D24).** The Supervisor may hand the Lead
   role to a new Lead at any time and tell Human after. It first asks the
   Lead for its handoff note; the old Lead decides what goes in it (current
   work, open items, background work, what matters for the next step).
   `slp_handoff` then creates the new Lead with the role's setup, gives it
   the note and the ledger, moves the messages held for the old Lead, keeps
   the Peers and their assignments, and archives the old Lead. It is refused
   while the old Lead is in a turn, so the old Lead is archived only once
   idle. No compact tool exists for the Lead.
6. **Peers near their window (D12).** A Peer whose context nears its window
   gets no next step; a fresh Peer does, with a brief.

## Alternatives Considered

1. **Steer always, or never (W0, W2, W3 in the Lead's options).** Not taken
   by Human (D6). A plugin nudge on a held message (W3) waits for a repeat.
2. **`/autocompact` per member (D13 as first chosen).** Rejected on the test:
   it is per model and machine, not per agent (D22).
3. **A Supervisor compact tool for the Lead.** Not taken by Human (D12).
4. **A plugin notice or automatic handoff at the threshold (T2, T3).** Not
   taken by Human (D21).
5. **Keep the old Lead after a handoff.** Not taken by Human (D24).

## Consequences

- The old Lead's background processes end with it; its note must list what
  to restart.
- The handoff and the brief sender were proved by unit tests and a live
  check on a scratch daemon before v0.4.0; real runs may still show gaps.
- Running members keep the window and texts they were created with.
