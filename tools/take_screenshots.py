#!/usr/bin/env python3
"""Regenerate the README gallery screenshots (assets/img/*.png).

Serves docs/ on a local port, drives each page in headless Chromium (Playwright)
so something is actually happening (a sort mid-race, a table mid-fill, an
Accepted submission...), then saves a 1400x900 dark-theme PNG and shrinks it
with Pillow (palette quantization) to stay under ~350 KB.

Usage:
  python3 tools/take_screenshots.py                 # all shots
  python3 tools/take_screenshots.py arena dp        # only names containing these words
  python3 tools/take_screenshots.py --fonts DIR     # offline: serve Inter / JetBrains Mono from
                                                    # DIR/fontsource-inter and DIR/fontsource-jetbrains-mono
                                                    # (unpacked `npm pack @fontsource/inter @fontsource/jetbrains-mono`)
Needs: pip install playwright pillow && playwright install chromium
"""
import argparse
import functools
import http.server
import io
import os
import re
import socketserver
import sys
import threading

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DOCS = os.path.join(ROOT, "docs")
OUT = os.path.join(ROOT, "assets", "img")
W, H = 1400, 900
MAX_BYTES = 350 * 1024


# ---------------------------------------------------------------------------- server
def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a, **k):
            pass
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.ThreadingTCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=DOCS))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def route_fonts(ctx, font_dir):
    """Answer the Google Fonts request from local @fontsource packages (for offline machines)."""
    faces = []
    for pkg, weights in (("fontsource-inter", (400, 500, 600, 700, 800)), ("fontsource-jetbrains-mono", (400, 500, 700))):
        for w in weights:
            css_path = os.path.join(font_dir, pkg, f"{w}.css")
            if os.path.exists(css_path):
                css = open(css_path, encoding="utf-8").read()
                faces.append(re.sub(r"url\(\./files/([^)]+)\)", lambda m, p=pkg: f"url(https://fonts.local/{p}/files/{m.group(1)})", css))
    body = "\n".join(faces)

    def css_handler(route):
        route.fulfill(status=200, body=body, headers={"content-type": "text/css", "access-control-allow-origin": "*"})

    def file_handler(route):
        rel = route.request.url.split("https://fonts.local/", 1)[1]
        path = os.path.join(font_dir, rel)
        if os.path.exists(path):
            ct = "font/woff2" if path.endswith(".woff2") else "font/woff"
            route.fulfill(status=200, body=open(path, "rb").read(), headers={"content-type": ct, "access-control-allow-origin": "*"})
        else:
            route.fulfill(status=404, body="")
    ctx.route("https://fonts.googleapis.com/**", css_handler)
    ctx.route("https://fonts.local/**", file_handler)


# ---------------------------------------------------------------------------- helpers
def scrub(pg, frac, idx=0):
    """Move a Forge.player to a fraction of its frames (0..1) via its range input."""
    pg.evaluate("""([frac, idx]) => {
        const s = [...document.querySelectorAll('input.scrub')].filter(e => e.offsetParent !== null)[idx]
               || document.querySelectorAll('input.scrub')[idx];
        s.value = Math.round(+s.max * frac); s.dispatchEvent(new Event('input', {bubbles: true}));
    }""", [frac, idx])
    pg.wait_for_timeout(250)


def scroll_to(pg, selector, offset=72):
    """Scroll so the element's top sits just below the sticky top bar."""
    pg.evaluate("""([sel, off]) => {
        const e = document.querySelector(sel); if (!e) return;
        window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - off);
    }""", [selector, offset])
    pg.wait_for_timeout(200)


def select(pg, sel, value):
    pg.select_option(sel, value)
    pg.wait_for_timeout(150)


def set_code(pg, code):
    pg.evaluate("""(c) => { const ta = document.querySelector('.ed-ta'); ta.value = c; ta.dispatchEvent(new Event('input', {bubbles:true})); }""", code)


def wait_report(pg, timeout=30000):
    pg.wait_for_selector(".results .report:not(.is-running)", timeout=timeout)


MAX_OK = ("ALGORITHM MaxElement(A[0..n-1])\n    maxval ← A[0]\n    for i ← 1 to n - 1 do\n"
          "        if A[i] > maxval then\n            maxval ← A[i]\n    return maxval")


INSERTION_DRAFT = ("ALGORITHM InsertionSort(A[0..n-1])\n    // Sorts A in place, nondecreasing\n    for i ← 1 to n - 1 do\n"
                   "        v ← A[i]\n        j ← i - 1\n        while j ≥ 0 and A[j] > v do\n            A[j + 1] ← A[j]\n"
                   "            \n    return A")


# ---------------------------------------------------------------------------- shots
def shot_landing(pg, B):
    pg.goto(B + "index.html")
    pg.wait_for_timeout(1500)   # hero bars animate


def shot_path(pg, B):
    pg.goto(B + "path.html")
    pg.wait_for_timeout(900)


def shot_arena_list(pg, B):
    pg.goto(B + "arena/index.html")
    pg.wait_for_selector("tr.prow")
    pg.wait_for_timeout(400)
    scroll_to(pg, "#f-q", 140)


def open_max(pg, B):
    pg.goto(B + "arena/problem.html?id=max-element")
    pg.wait_for_selector(".ed-ta", state="attached")
    pg.click("#mt-pseudo")
    set_code(pg, MAX_OK)


def shot_arena_accepted(pg, B):
    open_max(pg, B)
    pg.click(".ws-toolbar >> text=Submit")
    wait_report(pg)
    dismiss_toasts(pg)
    # bring the verdict + efficiency chart into the right-hand column's view
    pg.evaluate("""() => {
        const r = document.querySelector('.results .report'); if (!r) return;
        r.scrollIntoView({block: 'start'});
        let p = r.parentElement;   // nudge the scrolling pane down so the sticky toolbar does not cover the verdict
        while (p && !(p.scrollHeight > p.clientHeight && /auto|scroll/.test(getComputedStyle(p).overflowY))) p = p.parentElement;
        (p || document.scrollingElement).scrollTop -= 64;
    }""")
    pg.wait_for_timeout(400)


def shot_arena_trace(pg, B):
    open_max(pg, B)
    pg.click(".ws-toolbar >> text=👁 Visualize")
    pg.wait_for_selector(".tv-arr")
    for _ in range(7):
        pg.click('button[aria-label="Forward one step (→)"]')
        pg.wait_for_timeout(80)
    pg.wait_for_timeout(300)


def shot_arena_blocks(pg, B):
    pg.goto(B + "arena/problem.html?id=binary-search")
    pg.wait_for_selector(".ed-ta", state="attached")
    pg.click("#mt-blocks")
    pg.wait_for_selector(".pz-block")
    # set one decoy aside, then select a real line so the toolbar is live
    for decoy in ("while l < r do", "m ← (l + r) / 2"):
        blk = pg.locator(".pz-block", has_text=decoy).first
        if blk.count():
            blk.click()
            pg.keyboard.press("Delete")
            pg.wait_for_timeout(150)
            break
    pg.locator(".pz-block").nth(2).click()
    pg.wait_for_timeout(300)


def shot_sorting(pg, B):
    pg.goto(B + "sims/sorting-studio.html?race=1")
    pg.wait_for_timeout(700)
    if pg.locator("#modeRace[aria-pressed='false']").count():
        pg.click("#modeRace")
        pg.wait_for_timeout(400)
    scrub(pg, 0.37)
    scroll_to(pg, "#raceView", 62)


def shot_dp(pg, B):
    pg.goto(B + "sims/dp-studio.html")
    pg.wait_for_timeout(600)
    select(pg, "#prob", "knap")
    pg.click("#load")
    pg.wait_for_timeout(400)
    scrub(pg, 0.55)
    scroll_to(pg, ".sim-layout", 62)


def shot_graph(pg, B):
    pg.goto(B + "sims/graph-traversal.html")
    pg.wait_for_timeout(700)
    scrub(pg, 0.45)
    scroll_to(pg, ".sim-layout", 62)


def shot_dijkstra(pg, B):
    pg.goto(B + "sims/greedy-graphs.html")
    pg.wait_for_timeout(600)
    select(pg, "#algo", "dijkstra")
    select(pg, "#preset", "dijk")
    pg.click("#load")
    pg.wait_for_timeout(400)
    scrub(pg, 0.6)
    scroll_to(pg, ".sim-layout", 62)


def shot_backtracking(pg, B):
    pg.goto(B + "sims/backtracking.html")
    pg.wait_for_timeout(700)
    select(pg, "#prob", "queens")
    scrub(pg, 1.0)   # the first solution, with the pruned state-space tree that led to it
    scroll_to(pg, ".sim-layout", 62)


def shot_string(pg, B):
    pg.goto(B + "sims/string-match.html")
    pg.wait_for_timeout(600)
    pg.locator("button.btn.sm", has_text="Boyer–Moore").first.click()
    pg.locator("button.btn.sm", has_text="BARBER").first.click()
    pg.wait_for_timeout(200)
    if pg.locator("#load").count():
        pg.click("#load")
    pg.wait_for_timeout(400)
    scrub(pg, 0.5)
    scroll_to(pg, ".sim-layout", 62)


def shot_heap(pg, B):
    pg.goto(B + "sims/heap-lab.html")
    pg.wait_for_timeout(600)
    select(pg, "#mode", "heapsort")
    pg.click("#load")
    pg.wait_for_timeout(400)
    scrub(pg, 0.3)
    scroll_to(pg, ".sim-layout", 62)


def dismiss_toasts(pg):
    """Close badge toasts so they do not cover the shot (they arrive a beat after an Accepted)."""
    pg.wait_for_timeout(2200)
    pg.evaluate("() => document.querySelectorAll('.a-toasts').forEach(t => t.remove())")


def shot_atlas(pg, B):
    pg.goto(B + "atlas.html#shortest-paths/6")   # the 2025 "Breaking the sorting barrier" rung
    pg.wait_for_selector(".rung.on")
    pg.wait_for_timeout(900)
    scroll_to(pg, ".rung.on", 300)


def shot_playground(pg, B):
    pg.goto(B + "playground.html#ex=insertion-sort")
    pg.wait_for_selector("#pgtab-growth")
    pg.wait_for_timeout(600)
    pg.locator("button", has_text="▶ Run").first.click()
    pg.wait_for_timeout(900)
    pg.click("#pgtab-growth")
    pg.locator("button", has_text="📈 Measure growth").first.click()
    pg.wait_for_function("() => !document.querySelector('#pane-growth').textContent.includes('Measuring')", timeout=60000)
    pg.wait_for_timeout(800)
    scroll_to(pg, ".pg-views", 70)


def shot_arena_interview(pg, B):
    pg.goto(B + "arena/problem.html?id=insertion-sort")
    pg.wait_for_selector(".ed-ta", state="attached")
    pg.click("#mt-pseudo")
    pg.click(".iv-toggle")
    pg.wait_for_selector("#iv-start")
    pg.click("#iv-start")
    pg.wait_for_selector(".iv-timer:not([hidden])")
    set_code(pg, INSERTION_DRAFT)   # mid-attempt: half of the loop written
    pg.wait_for_timeout(3200)    # let the clock tick a few seconds


def shot_arena_compare(pg, B):
    pg.goto(B + "arena/problem.html?id=max-element")
    pg.wait_for_selector(".ed-ta", state="attached")
    pg.click("#mt-pseudo")
    ref = pg.evaluate("() => ForgeProblems.get('max-element').solution.pseudo")   # submit the reference itself
    set_code(pg, ref)
    pg.click(".ws-toolbar >> text=Submit")
    wait_report(pg)
    pg.wait_for_selector("#cel-compare")
    dismiss_toasts(pg)
    pg.click("#cel-compare")
    pg.wait_for_selector(".compare-host")
    pg.wait_for_timeout(1200)
    pg.evaluate("""() => {
        const r = document.querySelector('.compare-host'); if (!r) return;
        let p = r.parentElement;   // the right-hand column scrolls on its own: move it, keep the page at the top
        while (p && !(p.scrollHeight > p.clientHeight && /auto|scroll/.test(getComputedStyle(p).overflowY))) p = p.parentElement;
        window.scrollTo(0, 0);
        if (p) p.scrollTop += r.getBoundingClientRect().top - p.getBoundingClientRect().top - 56;
        else window.scrollTo(0, r.getBoundingClientRect().top - 72);
    }""")
    pg.wait_for_timeout(400)


def shot_sorting_evolution(pg, B):
    pg.goto(B + "sims/sorting-evolution.html")
    pg.wait_for_timeout(800)
    pg.click("#modeTim")
    pg.wait_for_timeout(400)
    scrub(pg, 0.42)
    scroll_to(pg, ".sim-layout", 62)


def shot_vector_search(pg, B):
    pg.goto(B + "sims/vector-search.html")
    pg.wait_for_timeout(800)
    pg.click("button[data-mode='hnsw']")
    pg.wait_for_timeout(800)
    scrub(pg, 0.55)
    scroll_to(pg, ".sim-layout", 62)


def shot_cuckoo(pg, B):
    pg.goto(B + "sims/cuckoo-filters.html")
    pg.wait_for_timeout(800)
    pg.click("#modeA")
    pg.click("#aExample")              # 7 keys in two tables of 11 cells
    pg.wait_for_timeout(400)
    pg.fill("#aKey", "32")             # inserting 32 starts a long kick-out chain
    pg.click("#aIns")
    pg.wait_for_timeout(600)
    scrub(pg, 0.6)
    scroll_to(pg, ".sim-layout", 62)


def shot_generic(path, frac=0.5, before=None):
    """Open a simulation, optionally run a setup step, move its player to a fraction of the frames."""
    def go(pg, B):
        pg.goto(B + path)
        pg.wait_for_timeout(1200)
        if before:
            before(pg)
        if pg.locator("input.scrub").count():
            scrub(pg, frac)
        scroll_to(pg, ".sim-layout", 62)
    return go


SHOTS = [
    ("landing", shot_landing),
    ("path", shot_path),
    ("arena-list", shot_arena_list),
    ("arena-accepted", shot_arena_accepted),
    ("arena-visualize", shot_arena_trace),
    ("arena-blocks", shot_arena_blocks),
    ("sim-sorting-race", shot_sorting),
    ("sim-dp-knapsack", shot_dp),
    ("sim-graph-dfs", shot_graph),
    ("sim-dijkstra", shot_dijkstra),
    ("sim-n-queens", shot_backtracking),
    ("sim-boyer-moore", shot_string),
    ("sim-heapsort", shot_heap),
    ("atlas", shot_atlas),
    ("playground", shot_playground),
    ("arena-interview", shot_arena_interview),
    ("arena-compare", shot_arena_compare),
    ("sim-sorting-evolution", shot_sorting_evolution),
    ("sim-vector-search", shot_vector_search),
    ("sim-cuckoo-filters", shot_cuckoo),
    ("sim-streaming-sketches", shot_generic("sims/streaming-sketches.html", 0.6)),
    ("sim-raft-consensus", shot_generic("sims/raft-consensus.html", 0.35)),
    ("sim-shortest-path-frontier", shot_generic("sims/shortest-path-frontier.html", 0.5)),
    ("sim-flow-modern", shot_generic("sims/flow-modern.html", 0.45)),
    ("sim-suffix-structures", shot_generic("sims/suffix-structures.html", 0.6)),
    ("sim-mst-modern", shot_generic("sims/mst-modern.html", 0.5)),
]


# ---------------------------------------------------------------------------- compression
def save_small(png_bytes, path):
    """Write the PNG as small as possible: try lossless first, then 256- and 192-colour palettes."""
    img = Image.open(io.BytesIO(png_bytes)).convert("RGB")
    best = None
    for colors in (None, 256, 192, 128):
        buf = io.BytesIO()
        if colors is None:
            img.save(buf, "PNG", optimize=True)
        else:
            q = img.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
            q.save(buf, "PNG", optimize=True)
        data = buf.getvalue()
        best = data
        if len(data) <= MAX_BYTES:
            break
    with open(path, "wb") as f:
        f.write(best)
    return len(best)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("only", nargs="*")
    ap.add_argument("--fonts", help="directory with unpacked @fontsource/inter and @fontsource/jetbrains-mono")
    ap.add_argument("--out", default=OUT)
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    httpd = serve()
    B = f"http://127.0.0.1:{httpd.server_address[1]}/"
    failures = 0
    with sync_playwright() as p:
        br = p.chromium.launch()
        for name, fn in SHOTS:
            if a.only and not any(o in name for o in a.only):
                continue
            ctx = br.new_context(viewport={"width": W, "height": H}, device_scale_factor=1, color_scheme="dark")
            ctx.add_init_script("try { localStorage.setItem('forge-theme', 'dark'); } catch (e) {}")
            if a.fonts:
                route_fonts(ctx, a.fonts)
            pg = ctx.new_page()
            errs = []
            pg.on("pageerror", lambda e, errs=errs: errs.append(str(e)))
            try:
                fn(pg, B)
                pg.evaluate("document.fonts.ready")
                pg.wait_for_timeout(250)
                size = save_small(pg.screenshot(), os.path.join(a.out, name + ".png"))
                print(f"{'ok ' if not errs else 'ERR'} {name:20s} {size / 1024:6.1f} KB" + (f"  page errors: {errs[:2]}" if errs else ""))
                failures += bool(errs)
            except Exception as ex:  # keep going; report at the end
                failures += 1
                print(f"ERR {name}: {str(ex).splitlines()[0]}")
            ctx.close()
        br.close()
    httpd.shutdown()
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
