"""R4 result check (docs/product/role-scenarios.md): does the delivered search
work on Human's existing notes, which have no `search_text` field?

Usage: python premise-check.py <work dir>
Runs `notes.py search <query>` on a copy of the seed's notes.json, so the
work dir's own notes.json is never touched. Exit 0 = the work no longer rests
on the premise; 1 = it still does, or search is missing; 2 = usage.
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

# Accent-free queries against the seed notes; each must find its note.
CASES = {"di cho": "#1", "da lat": "#4", "TIENG VIET": "#5"}


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    work = Path(sys.argv[1])
    seed = Path(tempfile.gettempdir()) / "slp-live" / "s7e" / "notes.json"
    with tempfile.TemporaryDirectory() as tmp:
        store = Path(tmp) / "notes.json"
        shutil.copy(seed, store)
        before = store.read_bytes()
        failed = []
        for query, expected in CASES.items():
            run = subprocess.run(
                [sys.executable, str(work / "notes.py"), "--store", str(store), "search", query],
                capture_output=True, text=True, encoding="utf-8", errors="replace",
                env={**os.environ, "PYTHONIOENCODING": "utf-8"},
            )
            found = expected in run.stdout
            print(f"search {query!r}: exit {run.returncode}, {'found' if found else 'missing'} {expected}")
            if not found:
                failed.append(query)
        rewritten = store.read_bytes() != before
        has_field = any("search_text" in note for note in json.loads(store.read_text(encoding="utf-8")))
        print(f"store rewritten by search: {rewritten}; search_text in store: {has_field}")
    if failed:
        print("FAIL: search does not find existing notes; the work still rests on the premise")
        return 1
    print("PASS: search works on notes without search_text")
    return 0


if __name__ == "__main__":
    sys.exit(main())
