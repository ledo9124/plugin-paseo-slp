# SLP For Paseo: Product Overview

Status: partly implemented (slices 1-6 of the active plan). The approach is
accepted in decisions
[0001](../decisions/0001-slp-as-a-paseo-plugin.md),
[0002](../decisions/0002-slp-toggle-instead-of-modes.md),
[0003](../decisions/0003-ledger-is-coordination-state-not-project-truth.md),
[0004](../decisions/0004-member-messaging-through-a-plugin-send-tool.md),
[0005](../decisions/0005-slp-mode-locks-at-the-first-message.md), and
[0006](../decisions/0006-slp-lead-cannot-use-provider-subagents.md). What
SLP is, its layers, and its boundary with Repository Harness are accepted in
[0007](../decisions/0007-what-slp-is.md).

## Outcome

Human cares about the outcome of the work, not about every decision on the
way. Human's input is often rough and incomplete. A Paseo user turns on
Supervisor–Lead–Peer (SLP) coordination for a workspace, and the group does
three jobs:

1. **Complete the input.** The Supervisor turns Human's rough input into
   input the Lead can act on without guessing. That input covers:
   - the outcome;
   - constraints with their sources;
   - what Human decided;
   - what Human delegates;
   - what is still open.

   The Supervisor asks its questions at the start, not throughout the run.
2. **Filter decisions.** Agents decide within their authority:
   - engineering choices;
   - what the project's accepted records already answer;
   - what Human explicitly delegated.

   Only choices that change the outcome, cost, or constraints, or that set
   product policy no record settles, reach Human. Each comes with options,
   consequences, and a recommendation. Authority draws the line, not how
   reversible or important a choice looks to an agent.
3. **Keep Human in control.** Human approves nothing routine. Human can
   still see the work and redirect it without reading transcripts.

The failure SLP targets is lossy decomposition. It unfolds in a chain:
1. The user's goal becomes an agent's interpretation.
2. The interpretation becomes a chosen solution.
3. A subtask is scoped around that solution.
4. The next subtask treats the solution as a requirement.

Each step looks reasonable, yet by the end of the chain nobody is solving the
user's problem. Incomplete input is the first step, and job 1 addresses it.
Jobs 2 and 3 keep the rest of the chain visible and correctable, without
making Human a dispatcher.

## What SLP Is

SLP has four layers (decision 0007). For any part, ask: "without this, is
it still SLP?"

1. **Core:** three roles, each holding one kind of attention (see Roles),
   plus the required behavior below.
2. **Coordination contracts:** the minimum content of what passes between
   roles:
   - intent handoff (Human, then Supervisor, then Lead): the outcome,
     constraints with sources, Human's decisions, delegations, and open
     questions. It is not a task list, and it proposes no design;
   - brief (Lead to Peer);
   - finding;
   - decision with its source;
   - handback and acceptance;
   - escalation to Human.
3. **Runtime:** this plugin on Paseo. It covers the tools, ledger, panel,
   messaging, process report, the per-workspace switch, and how a role
   becomes an agent.
4. **Templates:** ways the Lead may staff a kind of problem. Examples are
   an independent review of a stable candidate, blind parallel designs for
   a risky choice, the same question put to Peers on different models, and
   an audit of test quality. Templates are not SLP:
   - none is required;
   - each must show that it changes outcomes, or it is dropped
     (behavior 10).

SLP is independent of Repository Harness, and the two can run together
([SLP and Harness](slp-and-harness.md)).

## Turning SLP On And Off

- SLP is off by default. With it off, Paseo agents behave normally.
- Human turns SLP on for a workspace when the work fits, before sending the
  first message there. SLP suits:
  - large codebases with vertical dependencies;
  - architectural uncertainty;
  - several ownership boundaries;
  - discovery during implementation.
- Human's first message in the workspace locks the choice, on or off.
  Changing it afterwards needs a new workspace (decision 0005).
- With SLP on, the workspace runs one group: a Supervisor as Human's
  counterpart, a Lead, and Peers the Lead creates on demand.
- Archiving the workspace ends the group.

Keep SLP off for small changes that one agent can finish, and for work that
needs continuous Human feedback, such as game feel or UI and UX tuning.

## Roles

Roles describe responsibility, authority, and information flow. They are not
personas. Renaming them would change nothing as long as the responsibilities
and escalation paths stay the same.

| Role | Responsibility |
| --- | --- |
| Human | Owns the outcome, priorities, trade-offs, and product policy. May delegate a class of choices. Can see the work and redirect it. |
| Supervisor | Holds Human's conversation, intent, and continuity. Completes Human's input before work starts. Its handoff to the Lead stops at the outcome and constraints: it proposes no design, not even a non-binding one. Watches for cross-scope problems and drift from Human's goal. Brings choices outside agent authority to Human. Has no technical authority over the Lead. |
| Lead | Holds project coherence: ownership, dependencies, decisions, evidence, integration, and engineering acceptance. Sorts every question by authority before answering it. |
| Peer | Owns one assignment in a bounded scope, with independent technical judgment. May question the assignment's premise with evidence and propose a scope change. |

Which Peers the Lead creates, for which kind of work and on which models,
is a template choice (layer 4), not part of the roles.

## Required Behavior

1. **Human is the final authority.** A Supervisor's, Lead's, or Peer's message,
   and any ledger entry an agent writes, is not authority for new externally
   observable policy. A choice outside delegated authority reaches Human
   through the Supervisor.
2. **One changing scope has one owner** until an explicit handoff. The Lead
   does not edit a scope it assigned to a Peer. A reviewer knows which version
   it reviews.
3. **The right to question is not the right to edit.** A Peer may report that
   another owner's module rests on a wrong assumption. It does not rewrite that
   module; the Lead coordinates the owner.
4. **The right to challenge is not a duty to challenge.** A Peer says the
   Lead is wrong when evidence requires it. Instructions must not reward
   manufactured disagreement, and the Lead distinguishes a finding that
   changes a decision from a merely different reasonable option.
5. **A challenge counts only when it can change the work.** The full chain is:
   1. a finding;
   2. evidence;
   3. a Lead decision, which may change the plan or consciously keep it;
   4. propagation to the affected owners;
   5. changed work;
   6. new evidence on the resulting state.
6. **Briefs separate what binds from what was chosen.** Every Peer brief
   separates:
   - the goal;
   - binding constraints and where each came from;
   - the current design choice, which is not a hard constraint unless
     authority makes it one;
   - open uncertainties;
   - the evidence that would reopen the direction.

   An earlier agent's solution never silently becomes the next agent's
   requirement.
7. **Human visibility and steering.** Human can see, without reading
   transcripts:
   - which brief each agent follows;
   - which constraints came from Human and which choices an agent made;
   - which findings and disagreements are unresolved.

   A Human correction updates the shared state and reaches the affected agent.
8. **A Peer's completion is not acceptance.** The Lead judges each result
   against the goal before accepting it.
9. **Evidence over messages.** A claim about shared state, such as "the CPU is
   free for the benchmark", is checked against the real state before anyone
   relies on it. Measurements compare runs under comparable conditions.
10. **Process data.** The group records enough process data to show which
    coordination mechanisms change outcomes and which only cost tokens:
    - escalations and reopens;
    - Lead acceptance outcomes;
    - message rounds;
    - Human interventions.

    That data supports keeping, changing, or removing mechanisms
    (Better-SLP).
11. **Complete input before the work starts.** The Supervisor clarifies
    Human's goal until the Lead can work without guessing, asking its
    questions together at the start. It records Human's decisions and
    delegations in Human's words.

    It reads back only what it interpreted: a reading of rough words, an
    inferred constraint, a filled gap, or a delegation boundary it drew.
    When it interpreted nothing, there is no read-back.

    It waits for Human's confirmation only when a misread would be costly:
    large work, effects outside the workspace, or changes hard to undo.
    Otherwise the work starts, and Human corrects through the normal path.

    Two things count against this behavior: a question from the Lead that
    intake should have settled, and rework caused by misread intent.
12. **Escalation follows authority, including delegation.** Human may
    delegate a class of choices. The delegation is recorded as a Human
    decision with its scope. An agent decision inside it names the
    delegation. Anything outside it reaches Human through the Supervisor,
    as a pending decision Human can see and answer, with options,
    consequences, and a recommendation. Two errors count against this
    behavior:
    - asking Human what records or a delegation already answer;
    - deciding silently what should have reached Human.

## Non-Goals

- Role-play: persona prompts, or agents imitating an engineering team.
- Debate for its own sake, or mandatory review of every change.
- Replacing the project's own system of record. Lasting decisions belong in
  the project (decision 0003).
- A trust boundary. Rules are conventions that well-behaved agents follow;
  the plugin makes violations visible but does not prevent them (decision
  0001). The one exception: within SLP, a Claude Lead has no subagent tool,
  so it delegates only through the plugin (decision 0006).
- Agents settling choices for an absent Human. This rules out deciding by
  how reversible a choice is, and a quota on questions to Human. Fewer
  questions come from better intake and explicit delegation (decision
  0007).
- Templates as built-in requirements, such as review across several Peers
  or analysis across several models.

## Deferred

- Supervisor visibility across several workspaces, such as coordinating who
  holds the machine for a benchmark. It is useful, but it waits until a single
  group works.
- Any runtime enforcement of ownership or routing. It needs evidence and a new
  decision.

## Open, To Be Decided From Real Runs

- Who writes a durable plan when the project keeps one.
- Whether the ledger keeps earning its place.
- The scope of decision 0006.
- The Supervisor's use of native question tools.
- When a Lead should delegate to Peers.

## Development Principle

Start simple, use SLP on real work, and adjust. Prefer what is simple and
effective over what is complex (Human's "smallest sufficient topology"). Tune instructions toward more
room to question when agents only obey, and toward evidence-bound objections
when they argue about everything. Improving the method can mean removing a
mechanism.

## Proof

Live runs on stock Paseo `v0.10.2`, recorded in the
[active plan](../plans/active/slp-plugin-v0.1.md) slice 3, 4, and 5 results:

- Behaviors 1, 5, 6, 8, and 9: a Human-reserved choice went through the
  Supervisor and back with source "human". A reopen finding with evidence
  led to a Lead decision, propagation, changed work, and re-run tests.
  Briefs kept Human's constraints apart from the Lead's choices. The Lead
  re-checked results before accepting, and once asked for rework.
- Behavior 4 (observed once): a reviewing Peer recorded no challenge when
  its evidence did not support one.
- Behavior 9 (slice 4): a Peer recorded a wrong finding after misreading a
  file's encoding. The Lead checked the real file, kept the plan in a
  recorded decision, and asked for rework.
- Behavior 10 (slice 5): the panel's "Process" section reports each
  group's process data, and can copy it as Markdown. It covers Human
  interventions, escalations, findings, acceptance, message rounds by
  pair, convention breaks (built-in sends, agents created outside the
  delegate tool), and estimated tokens and cost per role. A live run
  checked the counts against the ledger and each agent's reported cost.
- Behavior 7 (Human visibility without transcripts), slice 4 results: the
  SLP panel shows each assignment's brief with constraint sources, the
  Lead's current choice marked "not binding", findings, pending and settled
  decisions with who made them, and which Peer owns which assignment.
  - Human settled a pending decision and recorded a new one from the
    panel. Each reached only the Supervisor, which passed it to the Lead.
  - The Lead then changed the work.
- Behaviors 2 and 3: each assignment has one Peer and a recorded scope. No
  live test yet challenged a scope edit.
- Behaviors 11 and 12 (decision 0007), slice 7, one run with the operating
  agent playing Human:
  - **Intake.** The Supervisor asked every intake question in one reply,
    including whether an existing file may be overwritten. It recorded
    Human's 3 decisions and 3 delegations as Human's, and read back all
    five parts.
  - **Delegation.** The Lead delegated to a Peer and accepted after
    re-running the tests. Every agent choice was reported under a
    delegation.
  - **Human's effort.** 0 escalations mid-run and 0 native questions.
  - **Native questions.** A native question asked on Human's explicit
    request showed in the ledger view and the report until it was
    answered.
  - **Not yet shown:** a run with Human, and a choice that surfaces only
    mid-run.
