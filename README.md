# plugin-paseo-slp

Supervisor–Lead–Peer (SLP) multi-agent orchestration as a
[Paseo](https://github.com/getpaseo/paseo) plugin.

SLP keeps the user's goal alive longer than the first solution an agent
proposes. The agents doing the work may question a task's premise with
evidence, while ownership, integration, and decision propagation stay
structured.

Status: early setup. Only a slice 1 probe build exists, with no SLP behavior
yet. The approach is accepted in `docs/decisions/0001-0004`. SLP is a per-workspace toggle: when it
is off, agents behave normally.

- Product behavior: `docs/product/overview.md`
- Architecture and plugin capability map: `docs/ARCHITECTURE.md`
- Current plan: `docs/plans/active/slp-plugin-v0.1.md`
- Running against a dev Paseo daemon: `docs/RUNBOOK.md`

Agents: start with `AGENTS.md` and `docs/WORKFLOW.md`.
