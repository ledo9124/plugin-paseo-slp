#!/usr/bin/env python3
"""Find what earlier Harness core releases left in this repository.

Read-only. Classifies each path a supported earlier release installed and the
current core no longer manages:

- delete: its bytes (line endings aside) equal a release's copy, so Harness
  wrote it and nobody changed it;
- keep: anything else at that path is consumer content and is never deleted.

Also reports consumer files that still name a removed path, an unfinished
update session, and a backup folder that does not ignore itself.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

# Supported releases: harness-v0.1.11 onward (decision 0034). One entry per
# path a release in that range installed and the current core does not; each
# hash is SHA-256 over the release's bytes with CRLF rewritten to LF. The
# pre-merge legacy-table test rebuilds this table from the release tags.
LEGACY_FILES: dict[str, frozenset[str]] = {
    ".agents/skills/onboard-repository/references/evidence-capsule-v1.md": frozenset(
        {"b9e1f9208842e725289469d0976b3e65670a30ee7f69be6d799cf4ba2a19fadb"}
    ),
}

SKIP_DIRS = {".git", ".harness-core", ".harness-backup", "node_modules"}
# This script names every legacy path in its table; it is not a reference.
SELF = ".agents/skills/migrate-harness/scripts/find_legacy.py"


def normalized_sha256(content: bytes) -> str:
    return hashlib.sha256(content.replace(b"\r\n", b"\n")).hexdigest()


def candidate_files(root: Path) -> list[str]:
    """Tracked and untracked, not ignored, files; every file outside Git."""
    try:
        listed = subprocess.run(
            ["git", "-C", str(root), "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
            check=True,
            capture_output=True,
        ).stdout
        return sorted({name for name in listed.decode("utf-8").split("\0") if name})
    except (OSError, subprocess.CalledProcessError):
        files = []
        for path in root.rglob("*"):
            relative = path.relative_to(root)
            if path.is_file() and not SKIP_DIRS.intersection(relative.parts):
                files.append(relative.as_posix())
        return sorted(files)


# Windows IO_REPARSE_TAG_SYMLINK and IO_REPARSE_TAG_MOUNT_POINT (junction).
LINK_REPARSE_TAGS = {0xA000000C, 0xA0000003}


def is_link(path: Path) -> bool:
    """A symlink, or a Windows directory junction (which is_symlink misses).

    Other reparse points, such as cloud placeholders, are ordinary files here.
    """
    if path.is_symlink():
        return True
    try:
        return getattr(os.lstat(path), "st_reparse_tag", 0) in LINK_REPARSE_TAGS
    except OSError:
        return False


def through_symlink(root: Path, relative: str) -> bool:
    """Whether the path or any directory below the root on the way is a link."""
    current = root
    for part in Path(relative).parts:
        current = current / part
        if is_link(current):
            return True
    return False


def scan(root: Path, legacy: dict[str, frozenset[str]]) -> dict[str, list]:
    report: dict[str, list] = {"delete": [], "keep": [], "references": [], "pending": []}
    for path, hashes in sorted(legacy.items()):
        target = root / path
        if through_symlink(root, path):
            if os.path.lexists(target):
                report["keep"].append({"path": path, "reason": "path passes through a symlink"})
        elif target.exists() and not target.is_file():
            report["keep"].append({"path": path, "reason": "not a regular file"})
        elif target.is_file():
            if normalized_sha256(target.read_bytes()) in hashes:
                report["delete"].append({"path": path})
            else:
                report["keep"].append({"path": path, "reason": "content differs from every release copy"})

    names = sorted({Path(path).name for path in legacy})
    for relative in candidate_files(root):
        if relative in legacy or relative == SELF or SKIP_DIRS.intersection(Path(relative).parts):
            continue
        path = root / relative
        if not path.is_file() or through_symlink(root, relative):
            continue
        try:
            lines = path.read_text(encoding="utf-8").splitlines()
        except (UnicodeDecodeError, OSError):
            continue
        for number, line in enumerate(lines, 1):
            for name in names:
                if name in line:
                    report["references"].append({"path": relative, "line": number, "names": name})

    if (root / ".harness-core" / "update").exists():
        report["pending"].append(
            {"item": ".harness-core/update", "action": "finish with `harness update --continue` or `--abort`"}
        )
    backup = root / ".harness-backup"
    if backup.is_dir() and not backup.is_symlink() and not os.path.lexists(backup / ".gitignore"):
        report["pending"].append(
            {"item": ".harness-backup/.gitignore", "action": "write it with the single line `*`"}
        )
    return report


def render(report: dict[str, list]) -> str:
    lines = []
    for item in report["delete"]:
        lines.append(f"delete     {item['path']}  (Harness-generated, unchanged)")
    for item in report["keep"]:
        lines.append(f"keep       {item['path']}  (consumer content: {item['reason']})")
    for item in report["references"]:
        lines.append(f"reference  {item['path']}:{item['line']} names {item['names']}")
    for item in report["pending"]:
        lines.append(f"pending    {item['item']}: {item['action']}")
    if not report["delete"] and not report["pending"]:
        lines.append("clean: no Harness-generated legacy file or pending step remains")
    return "\n".join(lines)


def self_test() -> None:
    content = b"# Old reference\n\nGenerated text.\n"
    legacy = {"docs/old.md": frozenset({normalized_sha256(content)})}
    with tempfile.TemporaryDirectory() as temp:
        root = Path(temp)
        (root / "docs").mkdir()
        (root / "docs/old.md").write_bytes(content.replace(b"\n", b"\r\n"))
        (root / "notes.md").write_text("See docs/old.md for the old shape.\n", encoding="utf-8")
        (root / ".harness-backup").mkdir()
        report = scan(root, legacy)
        assert report["delete"] == [{"path": "docs/old.md"}], report
        assert report["keep"] == [], report
        assert report["references"] == [{"path": "notes.md", "line": 1, "names": "old.md"}], report
        assert [item["item"] for item in report["pending"]] == [".harness-backup/.gitignore"], report

        (root / "docs/old.md").write_bytes(content + b"Consumer note.\n")
        (root / ".harness-backup/.gitignore").write_text("*\n", encoding="utf-8")
        report = scan(root, legacy)
        assert report["delete"] == [], report
        assert report["keep"][0]["path"] == "docs/old.md", report
        assert report["pending"] == [], report
        assert "clean:" in render(report)

        # A Harness-managed file the consumer edited is still searched.
        (root / "AGENTS.md").write_text("Read docs/old.md first.\n", encoding="utf-8")
        (root / ".harness-core").mkdir()
        (root / ".harness-core/manifest.json").write_text('{"files": [{"path": "AGENTS.md"}]}', encoding="utf-8")
        refs = [item["path"] for item in scan(root, legacy)["references"]]
        assert refs == ["AGENTS.md", "notes.md"], refs

    # A legacy path reached through a linked directory (a symlink, or a
    # junction on Windows) is never deleted.
    with tempfile.TemporaryDirectory() as temp, tempfile.TemporaryDirectory() as outside:
        root = Path(temp)
        (Path(outside) / "old.md").write_bytes(content)
        try:
            (root / "docs").symlink_to(outside, target_is_directory=True)
            linked = True
        except OSError:
            linked = os.name == "nt" and subprocess.run(
                ["cmd", "/c", "mklink", "/J", str(root / "docs"), outside], capture_output=True
            ).returncode == 0
        if not linked:
            print("find_legacy self-test: linked-directory case skipped (no symlink or junction)")
        else:
            report = scan(root, legacy)
            assert report["delete"] == [], report
            assert report["keep"] == [{"path": "docs/old.md", "reason": "path passes through a symlink"}], report
    print("find_legacy self-test passed")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--root", default=".", help="repository root (default: current directory)")
    parser.add_argument("--json", action="store_true", help="print the report as JSON")
    parser.add_argument("--print-table", action="store_true", help="print the legacy hash table as JSON")
    parser.add_argument("--self-test", action="store_true", help="run the built-in self-test")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0
    if args.print_table:
        print(json.dumps({path: sorted(hashes) for path, hashes in LEGACY_FILES.items()}, indent=2))
        return 0
    report = scan(Path(args.root).resolve(), LEGACY_FILES)
    print(json.dumps(report, indent=2) if args.json else render(report))
    return 0


if __name__ == "__main__":
    sys.exit(main())
