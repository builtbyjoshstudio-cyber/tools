"""Submit the HTML pages changed by this push to IndexNow (Bing/Yandex/Seznam/Naver).

Run by .github/workflows/indexnow.yml. Google does NOT use IndexNow.

Safety rails:
  - Only URLs present in sitemap.xml are submitted, so noindex/utility pages
    (e.g. /legal/) can never be pinged.
  - Only added/modified files count; deletions are skipped.
  - No secrets: the IndexNow key is public by design (it's served at /<key>.txt).
"""
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request

HOST = os.environ["INDEXNOW_HOST"]
KEY = os.environ["INDEXNOW_KEY"]
BEFORE = os.environ.get("BEFORE_SHA", "")
AFTER = os.environ.get("AFTER_SHA", "HEAD")

ENDPOINT = "https://api.indexnow.org/indexnow"
MAX_URLS = 10000


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def changed_files():
    """Added/modified files in this push. Falls back to the head commit alone
    when `before` is unusable (first push, force-push, shallow history)."""
    head_only = ["git", "show", "--name-only", "--pretty=format:", AFTER]
    if BEFORE and set(BEFORE) != {"0"}:
        r = run(["git", "diff", "--name-only", "--diff-filter=AM", BEFORE, AFTER])
        if r.returncode == 0:
            return [l.strip() for l in r.stdout.splitlines() if l.strip()]
        print(f"note: diff {BEFORE[:8]}..{AFTER[:8]} failed, using head commit only")
    r = run(head_only)
    return [l.strip() for l in r.stdout.splitlines() if l.strip()]


def to_url(path):
    p = path.replace("\\", "/")
    if not p.endswith(".html"):
        return None
    if p == "index.html":
        return f"https://{HOST}/"
    if p.endswith("/index.html"):
        return f"https://{HOST}/{p[: -len('index.html')]}"
    return f"https://{HOST}/{p}"


def main():
    try:
        sitemap = open("sitemap.xml", encoding="utf-8").read()
    except FileNotFoundError:
        print("no sitemap.xml at repo root - nothing to do")
        return 0
    locs = set(re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", sitemap))

    urls, skipped = [], []
    for f in changed_files():
        u = to_url(f)
        if not u:
            continue
        if u in locs:
            if u not in urls:
                urls.append(u)
        else:
            skipped.append(u)

    if skipped:
        print(f"skipped {len(skipped)} changed page(s) not in sitemap (noindex/utility):")
        for u in skipped[:10]:
            print("  -", u)

    if not urls:
        print("no indexable HTML changed - nothing to submit")
        return 0
    if len(urls) > MAX_URLS:
        print(f"capping {len(urls)} URLs to the {MAX_URLS} per-request limit")
        urls = urls[:MAX_URLS]

    print(f"submitting {len(urls)} URL(s) for {HOST}:")
    for u in urls[:20]:
        print("  ", u)
    if len(urls) > 20:
        print(f"   ... and {len(urls) - 20} more")

    payload = {
        "host": HOST,
        "key": KEY,
        "keyLocation": f"https://{HOST}/{KEY}.txt",
        "urlList": urls,
    }
    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            code, body = r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        code, body = e.code, e.read().decode("utf-8", "replace")
    except Exception as e:  # network hiccup shouldn't fail the build
        print(f"submit failed (non-fatal): {e}")
        return 0

    print(f"HTTP {code} {body.strip()[:300]}")
    # 200 = accepted, 202 = accepted pending key validation
    if code not in (200, 202):
        print("WARNING: IndexNow rejected the submission (see code above)")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
