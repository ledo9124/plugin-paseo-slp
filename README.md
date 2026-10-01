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

Status: v0.1 implemented and proved live on Paseo `v0.10.2` (slices 1-7
of the completed v0.1 plan, with the gaps it records). Accepted in `docs/decisions/0001-0007`. SLP is a
per-workspace toggle: when it is off, agents behave normally. SLP does not
depend on Repository Harness (`docs/product/slp-and-harness.md`).

- Product behavior: `docs/product/overview.md`
- Architecture and plugin capability map: `docs/ARCHITECTURE.md`
- v0.1 plan, results, and open follow-ups:
  `docs/plans/completed/slp-plugin-v0.1.md`
- Running against a dev Paseo daemon: `docs/RUNBOOK.md`

## Install On A Paseo Host

Requires Paseo `>=0.10.2`. In the host's `config.json` (default
`~/.paseo/config.json`):

- `"pluginsEnabled": true` at the root;
- `"daemon": { "mcp": { "injectIntoAgents": true } }`. SLP members use
  Paseo's own agent tools, and SLP refuses to start a group without them.
  The setting is daemon-wide: every agent on the host gets Paseo tools.

Restart the daemon after changing either setting, then install a release:

```bash
paseo plugin install https://github.com/ledo9124/plugin-paseo-slp.git:plugins/slp --ref v0.1.0
paseo plugin ls          # slp should be running
```

- The plugin serves its member tools on `127.0.0.1:6791`. Set
  `SLP_MCP_PORT` for the daemon to change it, and keep it stable, because
  member tool URLs are saved with each agent.
- State lives in `<home>/plugin-data/slp`.
- Defaults, changeable in Settings, Plugins, `slp`:
  - Supervisor `claude/claude-opus-5-5`;
  - Lead `claude/claude-sonnet-5-5`;
  - Peers chosen by the Lead from Sonnet 5.5, Haiku 4.5, and
    `codex/gpt-6-luna`, at most 4 active;
  - every member in its provider's bypass mode (Claude
    `bypassPermissions`, Codex `full-access`).
- Use: open a new workspace and turn SLP on (header button or SLP panel)
  before the first message. The first message locks the choice. Talk to the
  Supervisor; it asks its questions in chat, and the SLP panel shows the
  ledger and the process report. Archiving the workspace ends the group.
- Update with `paseo plugin update slp`, or install a newer `--ref`.

Agents: start with `AGENTS.md` and `docs/WORKFLOW.md`.
