# SLP For Paseo: Product Overview

Status: not implemented. The approach is accepted in decisions
[0001](../decisions/0001-slp-as-a-paseo-plugin.md),
[0002](../decisions/0002-slp-toggle-instead-of-modes.md), and
[0003](../decisions/0003-ledger-is-coordination-state-not-project-truth.md).

## Outcome

A Paseo user can turn on Supervisor–Lead–Peer (SLP) coordination for a
workspace, so the user's goal outlives the first solution an agent proposes.
The agents doing the work may question a task's premise with evidence, while
ownership, integration, and decision propagation stay structured and visible
to the user.

The failure SLP targets is lossy decomposition. It unfolds in a chain:
1. The user's goal becomes an agent's interpretation.
2. The interpretation becomes a chosen solution.
3. A subtask is scoped around that solution.
4. The next subtask treats the solution as a requirement.

Each step looks reasonable, yet by the end of the chain nobody is solving the
user's problem.

## Turning SLP On And Off

- SLP is off by default. With it off, Paseo agents behave normally.
- Human turns SLP on for a workspace when the work fits. It suits large
  codebases with vertical dependencies, architectural uncertainty, several
  ownership boundaries, and discovery during implementation.
- With SLP on, the workspace runs one group: a Supervisor as Human's
  counterpart, a Lead, and Peers the Lead creates on demand.
- Turning SLP off stops new SLP work. Ending an active group is a separate,
  explicit Human action.

Keep SLP off for small changes that one agent can finish, and for work that
needs continuous Human feedback, such as game feel or UI and UX tuning.

## Roles

Roles describe responsibility, authority, and information flow. They are not
personas. Renaming them would change nothing as long as the responsibilities
and escalation paths stay the same.

| Role | Responsibility |
| --- | --- |
| Human | Owns goals, priorities, and trade-offs that are Human's to make. Can see the work and redirect it. |
| Supervisor | Discusses architecture and direction with Human. Watches for cross-scope problems and drift from Human's goal. Steps in within delegated authority and brings out-of-authority choices back to Human. |
| Lead | Holds the group's shared state: ownership, dependencies, evidence, integration, and acceptance. |
| Peer | Owns one assignment (investigate, design, implement, review, benchmark, audit). May question the assignment's premise and propose a scope change. |

The Lead may create Peers with different focuses, such as an implementer, a
reviewer, an architect consulted on a hard design choice, or an auditor of
test quality. Different Peers may use different models, so a group can
combine the strengths of each.

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

## Non-Goals

- Role-play: persona prompts, or agents imitating an engineering team.
- Debate for its own sake, or mandatory review of every change.
- Replacing the project's own system of record. Lasting decisions belong in
  the project (decision 0003).
- A trust boundary. Rules are conventions that well-behaved agents follow;
  the plugin makes violations visible but does not prevent them (decision
  0001).

## Deferred

- Supervisor visibility across several workspaces, such as coordinating who
  holds the machine for a benchmark. It is useful, but it waits until a single
  group works.
- Any runtime enforcement of ownership or routing. It needs evidence and a new
  decision.

## Development Principle

Start simple, use SLP on real work, and adjust. Tune instructions toward more
room to question when agents only obey, and toward evidence-bound objections
when they argue about everything. Improving the method can mean removing a
mechanism.

## Proof

None yet. See the [active plan](../plans/active/slp-plugin-v0.1.md).
