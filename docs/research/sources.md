# Sources And Prior Analysis

Research notes, not authority. Accepted product behavior lives in
`docs/product/`; accepted choices live in `docs/decisions/`.

## Method Sources (Decision Basis)

- Vũ Hà Lâm, "Bàn về multi-agent orchestration và mô hình SLP" (2026-09-27),
  <https://vhlam.com/article/agent-orchestration-multi-agent-slp>. Origin of
  SLP and its motivating cases.
- Vũ Hà Lâm, "10 Anti Pattern kinh điển khi làm việc với Coding Agent"
  (2026), <https://vhlam.com/article/coding-agent-anti-pattern>. Covers
  learning the domain before building, avoidable intermediate phases, and
  plans that prescribe implementation instead of contracts.
- A supplementary summary the Human provided on 2026-10-01. It frames the
  target failure as lossy decomposition, describes the
  finding-to-verification chain, and describes Better-SLP, which uses
  process telemetry to keep, revise, or remove mechanisms.

## Platform Facts (Decision Basis)

Paseo upstream, `getpaseo/paseo` main at `d30e99c85`, and plugin SDK 0.10.2,
read from source on 2026-10-01. The facts are summarized in decision 0001 and
`docs/ARCHITECTURE.md`.

## Reference Only: Seatworks v3

Seatworks (<https://github.com/sting9k/seatworks>, branch `v3` at
`6d316b067d5f`, MIT) implements a Seat abstraction on Paseo: a role
materialized into a runtime configuration, occupied by the current agent.
It was reviewed on 2026-10-01 from a Human-supplied write-up about the
deleted `v2` branch, then checked against `v3` code.

- It informs these ideas: role identity separate from the current agent,
  labels for reconciliation, and a thin adapter over the Paseo API. The plan
  records which ideas were adopted, deferred, and rejected.
- It is not a decision basis. It does not override `docs/product/overview.md`.
- Its text is not copied. Its `NOTICE.md` marks some skills as derived from
  unlicensed material.
- `v3` requires Paseo `>=0.9.1 <0.10.0`. Its `rebuild` branch targets 0.10
  and was not analyzed in depth.
- The review surfaced three upstream facts, recorded in
  `docs/ARCHITECTURE.md`:
  - `daemon.mcp.injectIntoAgents` defaults to `false`;
  - agents created by a plugin get no finish notification, and archiving a
    `parent` cascades to its children;
  - plugins get the Paseo API only inside hooks and RPCs.

## Reference Only: SLP Core Definition v0.2 (Draft)

A draft Human supplied on 2026-10-01, "SLP — Supervisor · Lead · Peer",
version 0.2. Its own status line says no operation has verified it. It
informed decision 0007, which kept its purpose and invariants. Three of its
choices were not taken:
- Direct and Supervised modes (0002 and 0005 stay);
- tying SLP to Repository Harness paths and decisions;
- listing Peer dispositions and review topologies as part of SLP. They are
  templates.

## Seatworks v3 Against SLP's Purpose (2026-10-01)

A second read of `v3`, still at `6d316b067d5f`, judged against decision
0007 rather than against the plugin. Seatworks handles Human's absence by
letting agents decide, which conflicts with job 2:
- a "Human out of the loop" setting, off by default, under which agents
  decide (`server/desk/human/questions.ts:50-53`);
- questions classed by reversibility, so that Human's silence lets the
  agent's recommendation stand (`questions.ts:31-46`);
- a quota of 3 questions per day (`server/catalog/team/team.ts:39`).

Other differences:
- the Supervisor chooses the architecture and the stack;
- `CONTEXT.md` lives outside the repository;
- rules are enforced before any evidence;
- a mail and watcher control plane;
- review and audit are roles rather than templates;
- a block is written into the project's `AGENTS.md`.

Five ideas passed the criterion in 0007 item 5: they serve a job or an
invariant, and they match a problem seen in a live run. The v0.1 plan
tracked them as slice 7 trials:
- I1, the Lead does not edit the repository. Not taken: Human left it to
  the Lead's own judgment;
- I2, mid-run questions go through the ledger, not a native question tool;
- I3, intake ends with a read-back that names what Human delegates;
- I4, a brief marks settled and open premises and what is out of scope;
- I5, an unverified "Human said" attribution is flagged.

Other ideas are noted only. They had no observed problem:
- Human's direct words to a Lead or Peer are routed to the Supervisor;
- the process report says whether a review or challenge changed the work;
- a scout reads the code before the work is split;
- a redesign proposal must say whether a small fix suffices;
- holding the machine for benchmarks across projects.

## Not A Decision Basis

The earlier fork `ledo9124/paseo-slp` (local `C:/code/my-project/paseo-slp`)
implemented SLP inside Paseo. By Human direction on 2026-10-01, its design,
role texts, and definitions do not decide anything for this plugin. It may
be consulted later as an example of failure modes to test, but only after a
requirement in `docs/product/overview.md` calls for that test.

## Prior Analysis (2026-10-01)

- **Repository Harness compatibility.** Harness provides repository truth,
  durable memory, and authority and proof boundaries. SLP provides runtime
  coordination. They do not conflict if:
  - SLP coordination state stays in this plugin;
  - lasting decisions go to the consumer project's records (decision 0003);
  - agent messages are never treated as authority for new externally
    observable policy.
- **Harness experiment "product-outcomes"** (`repository-harness`,
  `docs/plans/completed/harness-improvement-product-outcomes.md`).
  - Fresh `sonnet` workers did not promote a spec's suggested mechanisms to
    unflagged product behavior (0/5 in each of two scenarios).
  - That measured contradiction detection, not premise narrowing across
    delegation, so it is not evidence about SLP's target failure.
- **Deferred brief-format experiment.** Scenarios N and K, in that same
  record, test premise narrowing through narrowed briefs. They are slice 6 of
  the v0.1 plan.
