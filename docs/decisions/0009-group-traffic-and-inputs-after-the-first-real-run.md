# 0009 Group Traffic And Member Inputs After The First Real Run

Date: 2026-10-03

## Status

Accepted by Human on 2026-10-03. It amends the following:
- the Lead-relay row of `docs/ARCHITECTURE.md` and the matching
  `docs/product/roles.md` row (Human's experiment of the same day);
- the `parent` row of `docs/ARCHITECTURE.md` (an agent decision of
  2026-10-01, marked "Human may revisit");
- decision 0008 item 1, which adds effort to a role's settings.

## Context

The first real run took place in `my-plugin` (workspace
`wks_634898884670851a`, 2026-10-03 10:29-13:05Z). The group was a
Supervisor, a Lead, and 4 Peers, with 22 assignments. Human used the
group, listed problems, and accepted the analysis of two councils.

What the run showed:
- **Lead relay:**
  - every completed Lead turn was relayed to the Supervisor: 60 relays;
  - about 40 Supervisor turns were woken only by a relay ($2.23 of
    $6.72);
  - each of those turns posted to Human and raised a "finished"
    notification;
  - some posts were "nothing new".
- **Push notifications:** 8 in the window, 6 of them for internal
  hand-offs (Peer handbacks, Peer turn ends, a relay-started turn). Paseo
  skips the finish attention only for an agent with the
  `paseo.parent-agent-id` label, and SLP passed no parent.
- **Decision notices:**
  - every Supervisor `slp_decide` call notified the Lead, and a settle
    added the Lead on its own;
  - the notice started a Lead turn before the Supervisor's message
    arrived, which cost about 9 extra Lead turns;
  - once, under D2, the Lead created three Peers before it had the goal.
- **Peer reuse:**
  - 18 of 22 assignments reused a Peer, several across unrelated scopes;
  - one Peer reviewed its own commit;
  - from 11:23 reuse was forced, because the cap counted idle Peers and
    nothing could retire one.
- **Peer models:** the Lead chose the Peer models and count unasked. It
  had already done so once in slice 5.
- **Workflow:**
  - the Lead read the project workflow only after Human said to plan
    first (D10);
  - the Claude Peers never read the entry file or the workflow.
  - Human reports the same miss many times: when the work changes kind,
    the Lead is not reliably on the workflow that fits it.
- **Effort:** effort could not be set. The settings screen took provider,
  model, mode, and lists as free text.

## Decision

1. **Relay.** The Lead's reply reaches the Supervisor at the end of a turn
   that a Supervisor or Human message started, and at the end of a turn
   with no assignment open. It is not relayed between Peer handbacks.
   - A choice Human has not accepted still goes through a pending
     decision.
   - Something the Supervisor needs sooner goes through `slp_send`.
   - An effect Human has not accepted counts as a pending decision.
2. **Supervisor decisions do not notify the Lead.** The Supervisor tells
   the Lead in its own message and cites the decision ids. A settle no
   longer adds the Lead, and the Lead is dropped from a Supervisor's
   `notify`.
3. **Only the Supervisor notifies Human** (Human, 2026-10-03). The Lead and
   every Peer are created with `parent` set to the Supervisor, so Paseo
   raises no finish attention for them. Questions and permissions still
   notify. Archiving the Supervisor archives the group.
4. **Peers.**
   - A Peer is one line of work. It is reused only for the next step of
     its own last scope.
   - Anything else goes to a fresh Peer, and a review never goes to the
     author.
   - The cap counts only Peers holding an open assignment.
   - Peers run on the default model. Another allowed model is used only
     when Human names it, or when a template Human named for the goal
     requires it.
5. **Workflow.**
   - For each new goal, the Lead names the project workflow that fits it
     (file and section, or "none declared") before it works or delegates.
   - The Supervisor reads only the workflow the entry file names, and
     checks the Lead's choice against Human's intent.
   - Every brief carries a required `workflow`.
   - The Supervisor does not choose the workflow, because the work's shape
     needs code facts it does not read.
6. **Checking another member's work.**
   - Any member that checks another member's work and has a concrete
     doubt asks an open question that names where to look, and asks for
     evidence. It does not assert a fault it has not shown.
   - The handback message prompts the Lead to check the real change
     against the workflow and the constraints.
   - The handback shape asks the Peer to name the records and constraints
     its change touches, with evidence.
   - Nothing watches chain of thought.
7. **Compaction.**
   - Members re-read the entry file and the workflow after a compaction.
     `slp_ledger` gives back the goal, assignments, and decisions.
   - The plugin records a `compaction` event per member.
8. **Effort.** Each role has an optional effort (`thinkingOptionId`), set
   per provider for Peers. An effort the model does not list is omitted and
   recorded, so the provider default applies instead of a failed create.
   The settings screen offers provider, model, mode, effort, the Peer
   allowlist, and the cap as selects from the daemon's lists. It falls back
   to text inputs when the daemon cannot list them.

## Alternatives Considered

1. **Relay only when no assignment is open.** Not chosen: it drops the
   Lead's answers to the Supervisor during work (in the run, the plan
   report at 11:12:54).
2. **Hold every after-turn message until its sender's turn ends.** Not
   chosen: it adds state and amends 0004, and it would have delayed a goal
   behind the Supervisor's blocked question by about 4 minutes. Removing
   the notice is enough.
3. **Peer under the Lead, Lead under the Supervisor.** Not chosen:
   replacing a stuck Lead would archive its running Peers.
4. **The Supervisor names the workflow as a binding constraint.** Not
   chosen: it would misread the work's shape, and a wrong binding
   constraint is worse than none.
5. **A cheap model watching members' reasoning for hesitation.** Not
   chosen: providers expose almost no reasoning text, and the plugin sees
   timelines only when a turn ends.

## Consequences

Positive:

- Fewer Supervisor wakes, posts, and notifications.
- The Lead and Peers no longer act on notices that arrive ahead of their
  messages.
- Peer contexts fit their work.
- Workflow choice is explicit and checked.
- Effort can be tuned.

Tradeoffs:

- A Lead turn that a Peer started, and that ends with work still open, is
  silent to the Supervisor.
- If the Supervisor forgets its message after a decision, the Lead learns
  of the decision only from the ledger.
- Members appear as children of the Supervisor in the app.
- Idle Peers accumulate until the workspace is archived.

## Follow-Up

- Execution plan: `docs/plans/active/slp-first-real-run-fixes.md`.
- Live checks:
  - `parent` silences the Lead's and Peers' notifications;
  - effort reaches the member;
  - the settings selects load.
- Next real run: count relays, Supervisor wakes, pushes, and workflow
  declarations against this run.
