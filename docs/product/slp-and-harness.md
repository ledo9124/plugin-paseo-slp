# SLP And Repository Harness

Status: boundary accepted in
[decision 0007](../decisions/0007-what-slp-is.md). The two are separate
tools. Each works alone, and they can run together without changing each
other.

## Two Different Questions

| | Repository Harness | SLP |
| --- | --- | --- |
| Question | In this repository, what is true, what is allowed, and when is work done? | How do Human and several agents divide attention and authority, and how does information move between them? |
| Lives in | Files in the repository | A runtime, here a Paseo plugin |
| Serves | Any agent, including a single one | A group: Human, Supervisor, Lead, Peers |
| Provides | An entry file; a workflow that picks process by the shape of the work; product, decision, and plan locations; templates; an invariant-encoding pattern; onboarding and improvement skills; an installer and updater | Roles; intake of Human's intent; briefs; one owner per scope; findings and decisions with sources; handback and acceptance; escalation to Human; Human visibility; process data |
| Deliberately lacks | Orchestration, roles, task state, a runtime | Project truth, product policy, a required plan or template for the project |

## Principles Both Hold, Stated Separately

Each tool states these principles in its own terms. Neither cites the
other as its reason.

| Principle | Harness | SLP |
| --- | --- | --- |
| Human owns material choices | Missing product policy stops edits | Policy without authority reaches Human through the Supervisor, with options and consequences |
| Evidence over claims | Behavior proves completion | A Peer's completion is not acceptance; a message is not evidence |
| Improve by experiment | `$improve-harness` | Better-SLP |
| No second authority | Plans are not authority | The ledger is coordination state, not project truth (0003) |

## When Both Run Together

SLP adapts to the project's records. Harness needs no change.

| SLP needs | SLP's own wording | In a Harness project |
| --- | --- | --- |
| Authority for policy | The project's accepted records | `docs/product/`, `docs/decisions/` |
| A place for lasting decisions | The project's own records | `docs/decisions/` |
| Durable working memory | The project's records, when it keeps them | `docs/plans/active/`. Who writes it in a group is open, to be decided from real runs |
| Stopping when authority is missing | A Peer hands back to the Lead; the Lead sorts the question; policy goes to Human | Matches Harness's "stop before edits" |
| Acceptance | Evidence on the revision being accepted | Harness's completion standard |
| Members follow the project's rules | SLP does not hide or rewrite project instructions. Every member reads the entry file and the workflow it names before it first acts and after a compaction; the Lead names the workflow per goal and briefs carry it (0009) | The entry file and `docs/WORKFLOW.md` |

## Conditions For Independence

1. SLP runs on a repository without Harness.
2. Harness holds nothing about SLP, and `harness update` never conflicts
   because of SLP.
3. SLP writes nothing into Harness-managed files. Plans and decisions the
   project owns are project content, not Harness files.

Evidence so far:
- Slices 3 and 4 ran groups in small seeded projects without Harness.
- Slice 6 ran a group in `repository-harness`. It recorded its result in
  that repository's plan location.
- The first real run (`my-plugin`, 2026-10-03) showed the gap: the Claude
  Peers never read the entry file or the workflow, because `my-plugin`'s
  `CLAUDE.md` did not import `AGENTS.md`. 0009 added the reading rule and
  the brief's workflow; `my-plugin` now imports `@AGENTS.md`.
- Not yet proved: that every SLP member follows the workflow it read, and
  stops on open policy as Harness requires.
