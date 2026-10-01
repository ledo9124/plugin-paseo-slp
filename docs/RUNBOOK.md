# Runbook: Run The Plugin On A Dev Paseo Daemon

Status: not yet exercised from this repository. These steps are adapted from
the verified runbook of the sibling repository `ledo9124/paseo-plugin`
(`C:/code/my-project/my-plugin/docs/RUNBOOK.md`). Slice 1 of the active plan
must prove them here before any result relies on them.

## Prerequisites And Ownership

- A Paseo source checkout at `C:\code\my-project\paseo`. Run
  `npm run build:server-deps` there first.
  - This plugin targets stock Paseo 0.10.2 or later and must not rely on fork
    patches.
  - The checkout is shared with the sibling `paseo-plugin` repository and may
    sit on its fork branch `per-agent-paseo-tools`.
  - A result obtained on that branch proves behavior on stock Paseo only if
    it does not touch the patched area. Run each slice's acceptance proof at
    least once on an upstream checkout (`origin/main` or a release tag) in a
    separate worktree.
- Two daemons can exist on this machine:
  - **6767:** the installed Paseo app, home `~\.paseo`. It is not owned by
    this workflow. Never stop or restart it, and never install this plugin
    into it unless Human asks.
  - **6768:** the dev daemon, home `C:\code\my-project\paseo\.dev\paseo-home`.
    This workflow owns it.
- Root `pluginsEnabled: true` in the dev home's `config.json`.

## Start

From the Paseo checkout, in PowerShell:

```powershell
$env:PASEO_HOME = "C:\code\my-project\paseo\.dev\paseo-home"
$env:PASEO_LISTEN = "127.0.0.1:6768"
$env:PASEO_CORS_ORIGINS = "*"
npm run dev:server:watch
```

Always pass the dev home to the CLI. Without it, the CLI targets the
installed app.

```powershell
npx tsx C:\code\my-project\paseo\packages\cli\src\index.ts --home C:\code\my-project\paseo\.dev\paseo-home <command>
```

The `dev:server`, `dev:app`, and `cli` npm scripts call shell scripts that
fail on Windows. Use the commands above instead.

If the dev home is recreated, seed `config.json` with the 6768 listen address
before the first boot. Otherwise the daemon defaults to 6767, and CLI calls
silently target the installed app.

## Install And Reload

```powershell
npm install                     # in this repository, before every install or reload
<cli> plugin install C:\code\my-project\plugin-paseo-slp\plugins\slp
<cli> plugin reload slp         # after server changes; reload the page for client changes
<cli> plugin logs slp           # in-memory, lost on restart
```

- A failed reload stays failed; Paseo does not restore the previous code.
- To change the plugin id, run `plugin remove <old-id>` first.

## Readiness

- `<cli> plugin ls` shows `slp` as `running`.
- Durable log: `C:\code\my-project\paseo\.dev\paseo-home\daemon.log`.

## Validation From Git Bash

Git Bash can drop `node` from `PATH` when an `app.asar` entry is present. Call
the tools directly:

```bash
node node_modules/typescript/bin/tsc --noEmit -p plugins/slp
node node_modules/vitest/vitest.mjs run --root plugins/slp
```

Read the exit code; do not treat filtered output as a pass.

## Stop

Stop only the dev daemon this run started. Remove test agents and workspaces
this run created.
