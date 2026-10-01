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
  the active plan.
