# SLP For Paseo: Product Overview

Status: not implemented. Scope is proposed in
[decision 0001](../decisions/0001-slp-as-a-paseo-plugin.md) and awaits Human
acceptance.

## Outcome

A Paseo user can run one piece of work as a Supervisor–Lead–Peer (SLP) group,
so that the user's goal outlives the first solution an agent proposes. The
agents doing the work can question a task's premise with evidence. Ownership,
integration, and propagation of decisions stay structured.

SLP is a role, attention, and authority model, not a fixed workflow. It
separates three kinds of attention:

| Role | Holds | Does not hold |
| --- | --- | --- |
| Human | Outcome, priorities, material constraints, permitted external effects, mode choice | Day-to-day Peer management |
| Supervisor (Supervised mode only) | Human conversation, intent, continuity, process visibility, escalation to Human | Architecture, Peer coordination, engineering acceptance |
| Lead | Project objective and state, technical direction, ownership, dependencies, integration, engineering acceptance | Human intent decisions it was not granted |
| Peer | One bounded assignment with independent technical judgment | Orchestration, scope expansion, acceptance |

Authority is divided by domain, not rank. "Supervisor > Lead > Peer" is not the
model.

## Modes

- **Direct:** Human talks to Lead; Lead delegates to Peers.
- **Supervised:** Human talks to Supervisor; Supervisor relays material
  requests and decisions to and from Lead.

Human chooses the mode when starting a group. There is no automatic mode
selection.

## Required Behavior

1. **Human is the final authority.** A Lead's or Supervisor's message is not
   authority for new externally observable policy. A material choice that
   Human has not settled goes back to Human, through Supervisor in Supervised
   mode.
2. **One changing scope has one owner** until an explicit handoff. A Lead does
   not edit a scope it assigned to a Peer, and a reviewer knows which version
   it is reviewing.
3. **The right to question is not the right to edit.** A Peer may report that
   another owner's module rests on a wrong assumption. It does not rewrite that
   module; the Lead coordinates the owner.
4. **The right to challenge is not a duty to challenge.** Peers raise a reopen
   when evidence requires it, not to show independence. Role prompts must not
   reward manufactured disagreement.
5. **A Peer's completion is not acceptance.** The Lead judges each handback
   against the objective: accept, reopen, reject, or unknown.
6. **A challenge counts only when it can change the work:** discovery,
   evidence, Lead decision (change or a conscious keep), propagation to
   affected owners, changed work, and new evidence on the resulting state.
7. **Briefs separate what binds from what was chosen.** A brief distinguishes
   the goal, binding constraints with their source, the current design choice
   (not a hard constraint unless authority makes it one), open uncertainties,
   and the evidence that would reopen the direction. An earlier agent's
   solution must not silently become the next agent's requirement.
8. **Smallest useful topology.** Do not create agents for ceremony.

## Non-Goals

- Role-play personas. Roles are responsibility, authority, and information
  flow, not personality prompts.
- Automatic mode selection, debate, council, automatic reviewers, semantic
  drift detection, reasoning or neutrality scoring.
- A task database or project plan system. SLP coordinates agents; the
  project's own repository remains its system of record.
- A trust boundary. Role enforcement is policy that well-behaved agents
  follow; an agent or user with full Paseo access can bypass it.

## When Not To Use SLP

- Small changes that one agent can finish end to end.
- Work that needs continuous Human feedback, such as game feel, combat feel,
  or UI and UX tuning.
- Simple services whose parts are independent and need no cross-owner
  decisions.

SLP targets large codebases with vertical dependencies, architectural
uncertainty, several ownership boundaries, and discovery during
implementation.

## Development Principle

Start with role prompts and simple boundaries. Move a behavior into runtime
enforcement only when evidence shows prompts are not enough. Improving the
method can mean removing a mechanism, not only adding one.

## Proof

None yet. See the [active plan](../plans/active/slp-plugin-v0.1.md) for the
proof each slice needs.
