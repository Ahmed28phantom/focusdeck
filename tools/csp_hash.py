#!/usr/bin/env python3
"""Update (or check) the script hash in a FocusDeck file's Content-Security-Policy.

FocusDeck's CSP only lets the one <script> in the file run, identified by its SHA-256 hash.
Any edit to the script changes the hash, so after editing run:

    python3 tools/csp_hash.py FocusDeck.html          # update the hash in place
    python3 tools/csp_hash.py --check FocusDeck.html  # only report; exit code 1 if stale

No third-party packages needed.
"""
import base64
import hashlib
import re
import sys


def script_hash(html: str) -> str:
    scripts = re.findall(r"^<script>(.*?)</script>", html, flags=re.S | re.M)
    if len(scripts) != 1:
        sys.exit(f"Expected exactly one <script> block at the start of a line, found {len(scripts)}.")
    # Browsers turn Windows line endings (CRLF) into LF before hashing, so do the same here.
    text = scripts[0].replace("\r\n", "\n").replace("\r", "\n")
    digest = hashlib.sha256(text.encode("utf-8")).digest()
    return "sha256-" + base64.b64encode(digest).decode("ascii")


def main() -> None:
    args = [a for a in sys.argv[1:] if a != "--check"]
    check_only = "--check" in sys.argv
    if len(args) != 1:
        sys.exit(__doc__)
    path = args[0]
    with open(path, encoding="utf-8", newline="") as f:
        html = f.read()

    new = script_hash(html)
    match = re.search(r"script-src '(sha256-[A-Za-z0-9+/=]+|sha256-PLACEHOLDER)'", html)
    if not match:
        sys.exit("No script-src hash found in the Content-Security-Policy meta tag.")
    old = match.group(1)

    if old == new:
        print(f"OK: hash is current ({new}).")
        return
    if check_only:
        print(f"STALE: file has {old}, script needs {new}.")
        sys.exit(1)

    html = html.replace(f"script-src '{old}'", f"script-src '{new}'", 1)
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(html)
    print(f"Updated: {old} -> {new}")


if __name__ == "__main__":
    main()
