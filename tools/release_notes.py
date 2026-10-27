#!/usr/bin/env python3
"""Print the release notes for a version tag, after checking the tag, the app and the changelog agree.

The Release workflow (.github/workflows/release.yml) runs this when a tag like v5.9 is pushed:

    python3 tools/release_notes.py v5.9 > notes.md

It exits with 1, saying why, unless APP_VERSION in FocusDeck.html, the comment on its line 2 and the
newest "## vX.Y — date" entry in CHANGELOG.md all match the tag. The notes are that changelog entry.

No third-party packages needed.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    if len(sys.argv) != 2 or not re.fullmatch(r"v\d+\.\d+", sys.argv[1]):
        sys.exit("Usage: release_notes.py vX.Y")
    tag = sys.argv[1]
    version = tag[1:]

    html = (ROOT / "FocusDeck.html").read_text(encoding="utf-8")
    app = re.search(r"const APP_VERSION = '([^']+)'", html)
    header = html.splitlines()[1] if len(html.splitlines()) > 1 else ""
    problems = []
    if not app or app.group(1) != version:
        problems.append(f"APP_VERSION is {app.group(1) if app else 'missing'}, not {version}")
    if f"FocusDeck v{version} " not in header:
        problems.append(f"line 2 of FocusDeck.html doesn't say FocusDeck v{version}")

    changelog = (ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
    entries = list(re.finditer(r"^## v(\d+(?:\.\d+)?) — .*$", changelog, flags=re.M))
    if not entries or entries[0].group(1) != version:
        problems.append(f"the newest CHANGELOG.md entry is v{entries[0].group(1) if entries else '?'}, not v{version}")
    if problems:
        sys.exit(f"Not releasing {tag}: " + "; ".join(problems) + ".")

    end = entries[1].start() if len(entries) > 1 else len(changelog)
    body = changelog[entries[0].end():end].strip()
    print("**Download:** `FocusDeck.html` below. Double-click it to open it in your browser. "
          "All v5 versions share the same data, so replacing an older v5 file keeps everything.\n")
    print(body)


if __name__ == "__main__":
    main()
