# Runbook: Run The Plugin On A Dev Paseo Daemon

Status: first exercised from this repository on 2026-10-01 (slice 1 of the
active plan). The run used stock Paseo `v0.10.2` with an isolated home, on
Claude and Codex. The steps were adapted from the sibling repository
`ledo9124/paseo-plugin` (`C:/code/my-project/my-plugin/docs/RUNBOOK.md`).

## Prerequisites And Ownership

- **Stock checkout.** Use a stock Paseo checkout for acceptance proof. Slice
  1 used a detached worktree of the shared repository:

  ```powershell
  cd C:\code\my-project\paseo
  git worktree add --detach C:\code\my-project\paseo-upstream v0.10.2
  cd C:\code\my-project\paseo-upstream
  npm ci
  npm run build:server-deps
  npm run build:lib --workspace=@getpaseo/server   # the CLI imports server dist
  ```

  - npm 11 reports that it skipped install scripts (node-pty, esbuild).
    The daemon still ran.
  - Upstream main reports version 0.10.0, because 0.10.x releases are cut
    on a separate branch. A daemon built from main rejects this plugin's
    `requirements.paseo` (`>=0.10.2`).
- **Shared checkout.** `C:\code\my-project\paseo` is shared with the sibling
  `paseo-plugin` repository.
  - It may sit on the fork branch `per-agent-paseo-tools`, which patches
    `paseo-tools.ts`. Do not switch its branch without asking.
  - A result from that branch proves stock behavior only if it does not
    touch the patched area.
- **Daemons on this machine:**
  - **6767:** the installed Paseo app, home `~\.paseo`. This workflow does
    not own it. Never stop or restart it, and never install this plugin into
    it unless Human asks.
  - **6768:** the dev daemon. Only one home may use the port at a time:
    - shared dev home `C:\code\my-project\paseo\.dev\paseo-home`, used by
      `my-plugin`. It already has `injectIntoAgents: true` and three
      `my-plugin` plugins;
    - isolated probe home
      `C:\code\my-project\paseo-upstream\.dev\paseo-home`, owned by this
      repository's probes.
- **Required config** in the home's `config.json`:
  - `"pluginsEnabled": true` at the root;
  - `"daemon": { "listen": "127.0.0.1:6768", "mcp": { "injectIntoAgents": true } }`.
    Seed `listen` before the first boot, or the daemon defaults to 6767 and
    CLI calls silently target the installed app.
- **`injectIntoAgents` is required** (slice 1 probe 0). Without it, SLP
  members get no `mcp__paseo__*` tools. It is daemon-wide: every agent on
  that daemon gets Paseo tools. Ask Human before enabling it on any home.
- **MCP port.** The plugin's MCP endpoint listens on `127.0.0.1:6791`. Set
  `SLP_PROBE_MCP_PORT` to override. Keep it stable, because member MCP URLs
  are persisted with each agent.

## Start

From the stock checkout, in PowerShell:

```powershell
$env:PASEO_HOME = "C:\code\my-project\paseo-upstream\.dev\paseo-home"
$env:PASEO_LISTEN = "127.0.0.1:6768"
$env:PASEO_CORS_ORIGINS = "*"
npm run dev:server:raw          # or dev:server:watch to rebuild protocol and client too
```

- A fresh home starts downloading local speech models into `<home>\models`.
- The `dev:server`, `dev:app`, and `cli` npm scripts call shell scripts that
  fail on Windows. Use the commands here instead.
- Always pass the home to the CLI; without it, the CLI targets the installed
  app:

  ```bash
  node C:/code/my-project/paseo-upstream/node_modules/tsx/dist/cli.mjs \
    C:/code/my-project/paseo-upstream/packages/cli/src/index.ts \
    --home 'C:\code\my-project\paseo-upstream\.dev\paseo-home' <command>
  ```

## Install And Reload

```powershell
npm install                     # in this repository, before every install or reload
<cli> plugin install C:\code\my-project\plugin-paseo-slp\plugins\slp
<cli> plugin reload slp         # after server changes; reload the page for client changes
<cli> plugin logs slp           # in-memory, lost on restart
```

- A failed reload stays failed; Paseo does not restore the previous code.
- To change the plugin id, run `plugin remove <old-id>` first.

## Calling Plugin RPCs

The CLI has no plugin RPC command. `scripts/probe-rpc.mts` reuses the CLI's
connection code:

```bash
PASEO_HOME='C:\code\my-project\paseo-upstream\.dev\paseo-home' \
  node C:/code/my-project/paseo-upstream/node_modules/tsx/dist/cli.mjs \
  scripts/probe-rpc.mts probe.list '{}'
```

Under Git Bash, write Windows paths inside JSON arguments with forward
slashes (`C:/Users/...`). Backslashes do not survive argument conversion.

## Readiness

- `<cli> plugin ls` shows `slp` as `running`.
- `<cli> plugin logs slp` shows the plugin's MCP listening line.
- Durable log: `<home>\daemon.log`.

## Providers And Permissions

- Pass a member's mode explicitly. Otherwise the provider default applies,
  not the app default.
- Claude's `default` mode asks permission for every built-in Paseo tool call,
  and the plugin cannot preapprove the injected `paseo` server. No prompts
  appeared in Claude `bypassPermissions`, Claude `auto` with Sonnet 5.5, or
  Codex `full-access`. Claude `auto` with Haiku 4.5 still prompted.
- Codex on this machine reaches its model through `cli-proxy-api` in WSL
  Ubuntu.
  - Windows reaches that proxy only on IPv6 loopback, so `base_url` in
    `~/.codex/config.toml` must use `localhost`, not `127.0.0.1`. The proxy
    also requires its API key.
  - Run `paseo agent reload <id>` after changing Codex config, because
    running Codex agents keep the old config.

```bash
<cli> permit ls
<cli> permit allow <agent-id> <request-id>
```

## Validation From Git Bash

Git Bash can drop `node` from `PATH` when an `app.asar` entry is present. Call
the tools directly:

```bash
node node_modules/typescript/bin/tsc --noEmit -p plugins/slp
node node_modules/vitest/vitest.mjs run --root plugins/slp
```

Read the exit code; do not treat filtered output as a pass.

## Stop

- Archive the test agents this run created.
- Stop only the daemon this run started: `<cli> daemon stop`, with the same
  `--home`.
- Leave the 6767 daemon alone.
