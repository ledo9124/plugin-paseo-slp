# Sources And Prior Analysis

Research notes, not authority. Accepted product behavior lives in
`docs/product/`; accepted choices live in `docs/decisions/`.

## Method Sources

- Vũ Hà Lâm, "Bàn về multi-agent orchestration và mô hình SLP" (2026-09-27),
  <https://vhlam.com/article/agent-orchestration-multi-agent-slp>. Origin of
  SLP and its motivating cases.
- Vũ Hà Lâm, "10 Anti Pattern kinh điển khi làm việc với Coding Agent"
  (2026), <https://vhlam.com/article/coding-agent-anti-pattern>. Covers
  learning the domain before building, avoidable intermediate phases, and
  plans that prescribe implementation instead of contracts.
- A supplementary summary the Human provided on 2026-10-01. It frames the
  core failure as lossy decomposition: user goal → main agent's
  interpretation → chosen solution → subtask scoped around that solution →
  the next subtask treating the solution as a requirement. It also describes
  Better-SLP, which uses process telemetry to keep, revise, or remove
  orchestration mechanisms.
- The Human's SLP definition and fork documents:
  `C:/code/my-project/paseo-slp/docs/slp/` (`core-definition-v0.1.md`,
  `roles/*`, `architecture.md`, `evidence.md`, `implementation-plan.md`) and
  the Lead-only skill `skills-slp/slp-cross-review/SKILL.md`, at fork HEAD
  `9c89de81a`.

## Prior Analysis (2026-10-01)

- **Repository Harness compatibility.** Harness provides repository truth,
  durable memory, and authority and proof boundaries. SLP provides runtime
  coordination. They do not conflict if:
  - SLP room state stays in Paseo or this plugin;
  - durable results go to the consumer's single active plan and decisions;
  - one writer owns a plan;
  - agent messages are never treated as authority for new externally
    observable policy.
- **Harness experiment "product-outcomes"** (`repository-harness`,
  `docs/plans/completed/harness-improvement-product-outcomes.md`).
  - Fresh `sonnet` workers did not promote a spec's suggested mechanisms to
    unflagged product behavior (0/5 in each of two scenarios).
  - That measured contradiction detection, not premise narrowing across
    delegation, so it is not evidence about SLP's target failure.
- **Deferred brief-format experiment.** Scenarios N and K, recorded in that
  same record, test premise narrowing through narrowed briefs. They are slice
  6 of the active plan.
- **Fork field run** (`evidence.md`, about 8 hours, supervised, Claude).
  Findings fixed in the fork:
  - cancelled Peer turns were reported as returned;
  - delegated agents raised attention flags;
  - retired generations could be revived;
  - interactive questions reached members;
  - archiving the last member did not end the group;
  - mail waits were not logged;
  - reports piled up.

  These are candidate regression checks for the plugin.
