# 0007 What SLP Is: Purpose, Layers, And Independence From Harness

Date: 2026-10-01

## Status

Accepted by Human on 2026-10-01. Human set each point below in
conversation and asked to record the outcome:
- the purpose: Human cares about the outcome. SLP improves the Lead's input,
  because Human's own input is often rough and incomplete. It lets agents
  decide what they can, so only what really matters reaches Human;
- review across Peers and analysis across several models are templates
  built on SLP, not SLP itself;
- SLP does not depend on `repository-harness`, and the boundary between
  the two must be explicit;
- decisions 0002 and 0005 stay: one switch, no Direct or Supervised modes;
- the "SLP Core Definition v0.2" draft and Seatworks v3 are references.
  Neither overrides the product overview.

Amends nothing. It defines the product that decisions 0001-0006 implement.

## Context

Human supplied a draft, "SLP Core Definition v0.2". The draft mixes three
things:
- the SLP method;
- one runtime (Paseo);
- one documentation framework (`repository-harness`), down to its paths
  and decision numbers.

It also lists Peer dispositions and review topologies next to the method's
invariants. A reference project, Seatworks v3, reached a different
philosophy: when Human is away, agents decide. The plan's live runs
(slices 3-6) showed that the cost to Human is mostly at two moments:
- the start of the work, when Human's input is incomplete;
- mid-run questions.

Future work needs a lasting answer to three questions:
- what SLP is;
- what only runs on top of it;
- what belongs to Harness instead.

## Decision

1. **Purpose.** Human cares about the outcome. SLP does three jobs:
   1. **Complete the input.** The Supervisor turns Human's rough input into
      input the Lead can act on without guessing:
      - the outcome;
      - constraints with their sources;
      - what Human decided;
      - what Human delegates;
      - what is still open.

      It asks its questions at the start, not scattered through the run.
   2. **Filter decisions.** Agents decide within their authority:
      - engineering choices;
      - what the project's accepted records already answer;
      - what Human explicitly delegated.

      Only choices that change the outcome, cost, or constraints, or that
      set product policy no record settles, reach Human, with options,
      consequences, and a recommendation. Authority draws the line, not
      how reversible or important a choice looks to an agent.
   3. **Keep Human in control.** Human approves nothing routine, but can
      see the work and redirect it without reading transcripts.
2. **Explicit delegation.** Human may delegate a class of choices to the
   group. The delegation is a Human decision with its scope. An agent
   decision inside it names the delegation, and a choice outside it is
   escalated. Delegation lowers the number of questions without making an
   agent a source of policy.
3. **Four layers.** For each part, ask: "without this, is it still SLP?"
   1. **Core:** three roles, each holding one kind of attention, plus the
      invariants.
      - The Supervisor holds Human's conversation, intent, and continuity.
      - The Lead holds project coherence: state, decisions, ownership,
        integration, and engineering acceptance.
      - A Peer holds bounded, independent technical judgment.
   2. **Coordination contracts:** the minimum content of what passes
      between roles:
      - intent handoff;
      - brief;
      - finding;
      - decision;
      - handback and acceptance;
      - escalation.

      They are guidelines for content. A runtime may give them a schema.
   3. **Runtime:** how one platform makes layers 1 and 2 happen. Here that
      is the Paseo plugin: tools, ledger, panel, messaging, telemetry, the
      switch, and how a role becomes an agent.
   4. **Templates:** an arrangement of Peers that the Lead chooses for a
      kind of problem. Examples are independent review, blind parallel
      design, analysis across several models, and test audits. Templates
      are not SLP. None is required, and each must show that it changes
      outcomes (Better-SLP).
4. **Independence from Harness.**
   - SLP's core and contracts name no Harness path or rule. They refer to
     "the project's accepted records".
   - Harness knows nothing about SLP. SLP never writes into a project's
     entry instructions, and never hides them from its members.
   - The dependency runs one way. SLP adapts to whatever records a project
     keeps. With Harness, those records are Harness's locations
     ([`docs/product/slp-and-harness.md`](../product/slp-and-harness.md)).
   - This repository uses Harness for its own development. That is how we
     work here, not a product coupling.
5. **References are not authority.**
   - The v0.2 draft and Seatworks inform the work. Their ideas are taken
     only when an idea serves one of the three jobs or an invariant, and
     matches a problem seen in a live run. Other ideas are noted as
     references only.
   - Seatworks handles Human's absence by letting agents decide. It has a
     "Human out of the loop" setting, defaults by reversibility, and a
     daily question quota. That conflicts with job 2.

## Alternatives Considered

1. **Adopt the v0.2 draft as written.**
   - Rejected by Human: Direct and Supervised modes (0002 and 0005 stay).
   - Rejected by Human: SLP tied to Harness (the Lead as sole writer of a
     Harness plan, Harness decisions cited as SLP's reasons).
2. **Treat cross-review and multi-model analysis as SLP features.**
   Rejected by Human: they are templates.
3. **Seatworks' answer to an absent Human.** Not taken: agents would become
   a source of policy, against job 2.

## Consequences

Positive:

- Future work can tell what SLP is from what only runs on it.
- SLP stays usable on a repository without Harness, and Harness stays
  usable without SLP.
- The product names the two places Human's effort goes, the start and
  mid-run questions, and measures them.

Tradeoffs:

- Human spends one longer conversation at the start.
- Delegation works only when Human states its scope.
- Without Harness's stop rule built in, SLP must state its own escalation
  rule, and it does.

## Follow-Up

- `docs/product/overview.md` takes this purpose and these layers.
  `docs/product/slp-and-harness.md` states the boundary.
- To be decided from real runs, not now:
  - who writes a durable plan in a Harness project;
  - whether the ledger stays;
  - the scope of 0006;
  - the Supervisor's use of native question tools;
  - when a Lead should delegate.
- Slice 7 of the v0.1 plan (`docs/plans/completed/`) tests the first ideas that pass the criterion
  in item 5.
