---
name: migrate-harness
description: Migrate a repository from an earlier Harness core release (harness-v0.1.11 or later) to the installed latest and remove the legacy that release left behind, deleting only unchanged Harness-generated files and reporting consumer content. Use when the user asks to migrate, clean up, or remove leftovers of an earlier Harness version. Do not use for ordinary updates the user did not ask to clean, for protocol v1 or harness-cli state, or for releases before harness-v0.1.11.
---

# Migrate Harness

Bring an older Harness install to the latest core and leave no Harness legacy
behind, without losing anything the repository's people wrote. The user's
request is the explicit removal step that decisions 0027 and 0034 require;
without it, report and stop.

## Rules

- Delete a legacy file only when `scripts/find_legacy.py` marks it `delete`:
  its bytes, line endings aside, equal a release's copy. A name match is not
  enough.
- Never delete, move away for good, or rewrite anything marked `keep`, any
  reference, or any file the scan does not name. Those are consumer content;
  report them.
- Leave `.harness-backup/` content in place. It is local undo data and ignores
  itself.
- Preserve unrelated work. Record `git status` before starting and touch only
  what this procedure names.

## 1. Check The Starting Point

Read `.harness-core/manifest.json`. Stop and report when it is missing or its
`core_version` is below `0.1.11`: that install is outside the supported range.
If `.harness-core/update/` exists, an earlier update is unfinished; ask the
user whether to continue or abort it before going on.

## 2. Update The Core

Run `scripts/bin/harness update` (`scripts\bin\harness.exe` on Windows). If an
older executable fails with `base hash mismatch`, rerun the Harness install
command with `--merge` (`-Merge` in PowerShell) once instead of editing
`.harness-core/`; it runs the current binary. For a conflict:

- `overlapping_changes`: follow the printed resolution steps. Explain concrete
  differences and get the user's direction for any material choice before
  editing the staged result, then run `harness update --continue`.
- `modified_removed_file`: the release dropped a file the consumer edited, so
  its content is consumer-owned. Move it to a temporary place outside the
  repository, rerun `harness update`, then move it back to the same path.
  Harness no longer manages it; it is reported as `keep` below.
- `missing_managed_file` or `existing_unmanaged_path`: report it and ask the
  user how to proceed. Do not invent content.

## 3. Remove The Legacy

Run `python3 .agents/skills/migrate-harness/scripts/find_legacy.py` (`python`
on Windows when `python3` is absent). Without Python, apply its rule by hand:
hash each path in its `LEGACY_FILES` table after rewriting CRLF to LF, compare
with the listed hashes, and search for the paths' file names. Act on each line:

- `delete`: delete the file (`git rm` when tracked) and any directory this
  leaves empty.
- `keep`: leave it.
- `reference`: leave it; report the file and line so the user can decide.
- `pending`: do what the line says.

## 4. Check The Result

All must hold before claiming completion:

- the scan prints `clean`;
- `harness doctor` passes, and `harness status` reports no missing managed
  file (modified files are consumer edits; list them);
- `git status` shows only this migration's changes beside the recorded work.

Report the versions, each deleted file, each kept file and reference, any
conflict and how it was resolved, and the final check results.
