# 0010 Conduct, Attribution, And First-Person Role Texts

Date: 2026-10-07

## Status

Accepted by Human on 2026-10-07 (ledger D11). Two of its three parts are
Human's knowing exception to decision 0007 item 5, which takes ideas only
when they are shown to change outcomes. Human, after the measurements below:
"nghĩa là nó không sai thì cứ áp dụng thật đi để tao sử dụng thật tiễn" (it
isn't harmful, so apply it for real so I can use it in practice).

0007 item 5 stays the rule for everything else.

## Context

Plan `docs/plans/completed/slp-conduct-and-first-person.md` holds the runs,
the keep rules registered before them, and the scores.

- **Conduct (B1).** Human's own wording on how every role works. R1-R3 pass
  twice with it. No run exercised the Peer line, because no Peer was
  created in those runs.
- **Misattribution fix.** The Supervisor and the Lead credited Human with
  their own readings in most runs ("no merge" when Human named only commit
  and push). The role-text fix did not meet its keep rule. The share of runs
  with at least one slip went from 10/12 to 8/10; firm slips per run went
  from 1.5 to 0.7. No new guard violation type appeared.
- **First person (B2).** On the premise scenario the first-person paragraph
  tied (P 4/5 against 4/5). The manipulation check failed, because members
  already write in the first person. A redesign that would have routed the
  premise to a Peer failed its pilot gate: the Lead caught the premise
  itself.

## Decision

Every role's default text carries:

1. the conduct paragraph, and a Peer gives options, consequences, and its
   recommendation when it raises a choice it cannot settle (B1, measured as
   not harmful);
2. the attribution rules: the Supervisor records only Human's quoted words
   as Human's, records its own reading separately, and asks a how-far level
   Human did not name; the Lead cites Human only for words a decision quotes
   from Human (not proven; Human's exception);
3. the first-person paragraph: a member writes to other members as the
   owner of its role, keeps who said or inferred what, and claims no action,
   result, experience, or authority it does not have (not proven; Human's
   exception).

## Alternatives Considered

1. **Ship only what met a keep rule (B1).** Not taken by Human: the other
   two showed no harm, and Human wants to use them in practice.
2. **Build a `quote` field on `slp_decide`.** Declined by Human (D10).
3. **A third B2 design.** Declined by Human (D11).

## Consequences

- Parts 2 and 3 are unproven. A later real run or measurement may keep,
  revise, or remove them under 0007 item 5 (Better-SLP).
- Each role's default text grows by a few hundred characters.
- Rollback is the release before this one (`v0.3.5`).
