#!/usr/bin/env python3
"""Headless browser check for Algorithm Forge pages.

Loads each page from docs/ over a local HTTP server, reports console errors /
page errors, checks for horizontal overflow at phone width, and saves
screenshots (desktop + 375px phone, dark + light) for review.

Usage:
  python3 tools/check_pages.py docs/sims/sorting-studio.html [more pages...] [--out DIR] [--click "#rand"] [--wait 800]
  python3 tools/check_pages.py --all
"""
import argparse, functools, http.server, os, socketserver, sys, threading, glob
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DOCS = os.path.join(ROOT, "docs")

def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a, **k):
            pass
    handler = functools.partial(Quiet, directory=DOCS)
    httpd = socketserver.TCPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pages", nargs="*")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--out", default=os.path.join(ROOT, "..", "shots"))
    ap.add_argument("--click", action="append", default=[], help="CSS selector to click after load (repeatable)")
    ap.add_argument("--keys", default="", help="keys to press after load, e.g. 'ArrowRight,ArrowRight'")
    ap.add_argument("--wait", type=int, default=600)
    ap.add_argument("--no-shots", action="store_true")
    a = ap.parse_args()
    pages = a.pages
    if a.all:
        pages = sorted(glob.glob(os.path.join(DOCS, "**", "*.html"), recursive=True))
    os.makedirs(a.out, exist_ok=True)
    httpd = serve()
    port = httpd.server_address[1]
    failures = 0
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for page_path in pages:
            rel = os.path.relpath(os.path.abspath(page_path), DOCS)
            if rel.startswith(".."):
                print(f"skip (not under docs/): {page_path}"); continue
            name = rel.replace(os.sep, "_").replace(".html", "")
            problems = []
            for (w, h, tag, scheme) in [(1366, 900, "desktop", "dark"), (375, 800, "phone", "light")]:
                ctx = browser.new_context(viewport={"width": w, "height": h}, color_scheme=scheme)
                pg = ctx.new_page()
                errs = []
                pg.on("console", lambda m, errs=errs: errs.append(m.text) if m.type == "error" and "fonts.g" not in m.text and "ERR_" not in m.text else None)
                pg.on("pageerror", lambda e, errs=errs: errs.append("pageerror: " + str(e)))
                pg.goto(f"http://127.0.0.1:{port}/{rel.replace(os.sep, '/')}", wait_until="load")
                pg.wait_for_timeout(a.wait)
                for sel in a.click:
                    try:
                        pg.click(sel, timeout=2000); pg.wait_for_timeout(300)
                    except Exception as ex:
                        errs.append(f"click {sel} failed: {ex}".splitlines()[0])
                for k in [x for x in a.keys.split(",") if x]:
                    pg.keyboard.press(k); pg.wait_for_timeout(120)
                over = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
                if over > 2:
                    errs.append(f"horizontal overflow {over}px at {w}px width")
                if not a.no_shots:
                    pg.screenshot(path=os.path.join(a.out, f"{name}-{tag}.png"), full_page=True)
                problems += [f"[{tag}] {e}" for e in errs]
                ctx.close()
            status = "OK " if not problems else "ERR"
            if problems: failures += 1
            print(f"{status} {rel}" + ("".join("\n     " + x for x in problems[:8]) if problems else ""))
        browser.close()
    httpd.shutdown()
    sys.exit(1 if failures else 0)

if __name__ == "__main__":
    main()
