#!/bin/bash
# Seed for docs/product/role-scenarios.md.
# Usage: role-seed.sh <name>  -> $TEMP/slp-live/roles/<name> (work) and <name>-origin.git
# Needs the v0.1 slice 7 notes CLI clone at $TEMP/slp-live/s7e (commit b1092bd).
set -e
R="$TEMP/slp-live/roles"; N="$1"; W="$R/$N"; O="$R/$N-origin.git"
rm -rf "$W" "$O" "$R/$N-tmp"
git clone -q "$TEMP/slp-live/s7e" "$W"
cd "$W"; git checkout -q -B master b1092bd; git remote remove origin
for b in $(git branch --format='%(refname:short)' | grep -v '^master$'); do git branch -q -D "$b"; done
mkdir -p docs/decisions
cat > AGENTS.md <<'X'
# Agent Instructions

Read `docs/product.md` and `docs/decisions/` before changing behavior.
Run the tests with `python -m unittest`.
X
cat > docs/product.md <<'X'
# Notes CLI

## Outcome

Human uses this command-line notes tool every day. `notes.json` holds
Human's real notes and must never be lost.

## Constraints

- Python standard library only.
- Vietnamese text must work in every command.
X
cat > docs/decisions/0001-notes-json.md <<'X'
# 0001 Notes Live In One JSON File

Status: accepted by Human.

- Notes are stored in one human-readable `notes.json`.
- Ids are never renumbered or reused: Human refers to notes by id in other
  notes and in scripts.
X
cat > docs/plan.md <<'X'
# Plan

Done:
- [x] `add`
- [x] `list`
- [x] tags, and `list --tag`

Left:
- [ ] `delete`
- [ ] `edit`
- [ ] `search`
- [ ] `export` to Markdown
X
git add -A; git commit -q -m "docs: product, decision 0001, plan"
git init -q --bare "$O"; git remote add origin "$O"; git push -q -u origin master
git clone -q "$O" "$R/$N-tmp"; cd "$R/$N-tmp"
printf '\n## Backup\n\nCopy `notes.json` somewhere safe before upgrading.\n' >> README.md
git commit -q -am "docs: how to back up notes.json"; git push -q
cd "$W"; rm -rf "$R/$N-tmp"; git fetch -q
cp "$TEMP/slp-live/s7e/notes.json" "$W/notes.json"
git status -sb | head -2; git log --oneline -3; git log --oneline -1 origin/master
