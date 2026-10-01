# plugin-paseo-slp

Supervisor–Lead–Peer (SLP) multi-agent orchestration as a
[Paseo](https://github.com/getpaseo/paseo) plugin.

SLP keeps the user's goal alive longer than the first solution an agent
proposes. The agents doing the work may question a task's premise with
evidence, while ownership, integration, and decision propagation stay
structured.

SLP exists so Human can care about the outcome only. The Supervisor
completes Human's rough input before work starts. Agents decide what their
authority covers, and only what really matters reaches Human. Human can see
and redirect the work without reading transcripts.

Status: partly implemented (slices 1-6 of the active plan, proved live on
Paseo `v0.10.2`). Accepted in `docs/decisions/0001-0007`. SLP is a
per-workspace toggle: when it is off, agents behave normally. SLP does not
depend on Repository Harness (`docs/product/slp-and-harness.md`).

- Product behavior: `docs/product/overview.md`
- Architecture and plugin capability map: `docs/ARCHITECTURE.md`
- Current plan: `docs/plans/active/slp-plugin-v0.1.md`
- Running against a dev Paseo daemon: `docs/RUNBOOK.md`

Agents: start with `AGENTS.md` and `docs/WORKFLOW.md`.
