#!/usr/bin/env python3
"""Generate the animated SVGs embedded in the README (assets/svg/*.svg).

Pure Python (standard library only) and fully deterministic: running it twice
produces byte-identical files. Every SVG

  * draws its own rounded dark card, so it reads on GitHub's light AND dark themes;
  * animates with CSS @keyframes (plus one SMIL <animateMotion>) - no JavaScript,
    so it still animates when GitHub embeds it with <img>;
  * uses only system font stacks (no web fonts can load inside an <img>);
  * loops on a fixed 8-14 s cycle, and the algorithm steps are computed by
    actually running the algorithm here, so the pictures cannot drift from
    the truth.

Usage:  python3 tools/make_readme_visuals.py            # writes all nine files
        python3 tools/make_readme_visuals.py hero dp    # only names containing these words
"""
import math
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "assets", "svg")

# ---- design tokens (dark theme of docs/assets/css/forge.css) -----------------
BG, BG2, PANEL, PANEL2 = "#0d1117", "#121823", "#161d2a", "#1c2536"
LINE, LINE2 = "#2a3448", "#36425b"
INK, INK2, MUTED = "#e8edf5", "#b4bfd1", "#7f8ba3"
EMBER, EMBER2, STEEL = "#ff8a3d", "#ffb07a", "#5ab0ff"
COMPARE, SWAP, DONE, ACTIVE, PIVOT, DIM, BAR = "#ffd24d", "#ff5d73", "#3ddc97", "#5ab0ff", "#c38bff", "#3a4458", "#6b7fa6"
LV = ["#3ddc97", "#7bd88f", "#5ab0ff", "#c38bff", "#ff8a3d", "#ff5d73", "#ffd24d"]  # level colours (forge-hub.css)

FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace"
EMOJI = "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif"


def esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def num(v):
    """Compact number formatting for coordinates."""
    if isinstance(v, float):
        v = round(v, 2)
        if v == int(v):
            v = int(v)
    return str(v)


def attrs(**kw):
    out = []
    for k, v in kw.items():
        if v is None:
            continue
        k = k.rstrip("_").replace("_", "-")
        out.append(f'{k}="{esc(num(v)) if not isinstance(v, str) else esc(v)}"')
    return " ".join(out)


class Card:
    """One SVG document: a rounded dark card plus a keyframe registry."""

    def __init__(self, w, h, T, title, desc):
        self.w, self.h, self.T = w, h, T
        self.title, self.desc = title, desc
        self.body, self.defs, self.css = [], [], []
        self.kf = {}          # keyframe body -> name
        self.kf_rules = []

    # -- raw output ------------------------------------------------------------
    def add(self, s):
        self.body.append(s)

    def rect(self, x, y, w, h, fill="none", rx=0, cls=None, **kw):
        self.add(f'<rect {attrs(x=x, y=y, width=w, height=h, rx=rx or None, fill=fill, class_=cls, **kw)}/>')

    def text(self, x, y, s, size=13, fill=INK, weight=None, anchor=None, mono=False, cls=None, raw=False, **kw):
        c = " ".join(x for x in [("m" if mono else None), cls] if x) or None
        body = s if raw else esc(s)
        self.add(f'<text {attrs(x=x, y=y, font_size=size, fill=fill, font_weight=weight, text_anchor=anchor, class_=c, **kw)}>{body}</text>')

    def open_g(self, cls=None, **kw):
        a = attrs(class_=cls, **kw)
        self.add(f"<g {a}>" if a else "<g>")

    def close_g(self):
        self.add("</g>")

    # -- animation helpers -------------------------------------------------------
    def track(self, init, changes, d=0.25):
        """Keyframed state machine for one element.

        init: {css-prop: value} at t = 0.  changes: [(t_seconds, {prop: value}[, dur])].
        Each change eases from the old value (at t) to the new value (at t + dur).
        Returns the class string to put on the element.
        """
        T = self.T
        frames = [(0.0, dict(init))]
        cur = dict(init)
        for ch in sorted(changes, key=lambda c: c[0]):
            t, vals = ch[0], ch[1]
            dd = ch[2] if len(ch) > 2 else d
            t = max(t, frames[-1][0])
            frames.append((t, dict(cur)))
            cur = {**cur, **vals}
            frames.append((min(t + dd, T), dict(cur)))
        frames.append((T, dict(cur)))
        # drop interior frames of runs with identical state
        slim = []
        for i, f in enumerate(frames):
            if 0 < i < len(frames) - 1 and frames[i - 1][1] == f[1] == frames[i + 1][1]:
                continue
            slim.append(f)
        groups = {}
        order = []
        for t, st in slim:
            body = ";".join(f"{k}:{v}" for k, v in st.items())
            p = f"{round(t / T * 100, 2):g}%"
            if body not in groups:
                groups[body] = []
                order.append(body)
            if p not in groups[body]:
                groups[body].append(p)
        kbody = "".join(f"{','.join(groups[b])}{{{b}}}" for b in order)
        name = self.kf.get(kbody)
        if name is None:
            name = f"k{len(self.kf)}"
            self.kf[kbody] = name
            self.kf_rules.append(f"@keyframes {name}{{{kbody}}}.{name}{{animation:{name} {T}s ease-in-out infinite}}")
        return name

    def show(self, t0, t1=None, fade=0.2, base=0):
        """Opacity window: visible from t0 to t1 (seconds)."""
        ch = []
        init = {"opacity": 1 if t0 <= 0 else base}
        if t0 > 0:
            ch.append((t0, {"opacity": 1}, fade))
        if t1 is not None and t1 < self.T:
            ch.append((t1, {"opacity": base}, fade))
        return self.track(init, ch)

    def loop_fade(self, t_in=0.0, t_out=None, dur=0.45):
        """Whole-scene fade in at the start of the cycle and out at the end."""
        t_out = self.T - dur - 0.1 if t_out is None else t_out
        return self.track({"opacity": 0}, [(t_in, {"opacity": 1}, dur), (t_out, {"opacity": 0}, dur)])

    # -- chrome ----------------------------------------------------------------
    def header(self, eyebrow, title, x=28, y=38):
        self.text(x, y, eyebrow.upper(), size=11, fill=EMBER, weight=700, letter_spacing="1.4")
        self.text(x, y + 25, title, size=20, fill=INK, weight=800)

    def brand(self, x=None, y=30):
        x = self.w - 28 if x is None else x
        self.add(f'<g transform="translate({num(x - 22)},{num(y - 16)})" opacity=".8">'
                 f'<rect x="0" y="11" width="5" height="10" rx="1.2" fill="{STEEL}"/>'
                 f'<rect x="7" y="7" width="5" height="14" rx="1.2" fill="{STEEL}" opacity=".8"/>'
                 f'<rect x="14" y="2" width="5" height="19" rx="1.2" fill="{EMBER}"/>'
                 f'<text x="-7" y="17" font-size="12" font-weight="700" fill="{MUTED}" text-anchor="end">Algorithm Forge</text></g>')

    def legend(self, x, y, items, gap=16, size=11.5):
        """items: [(colour, label)] laid out left to right; returns end x (approx)."""
        cx = x
        for col, lab in items:
            self.rect(cx, y - 9, 11, 11, fill=col, rx=3)
            self.text(cx + 16, y, lab, size=size, fill=INK2)
            cx += 16 + len(lab) * size * 0.56 + gap
        return cx

    def render(self):
        css = (f"text{{font-family:{FONT}}}.m{{font-family:{MONO}}}.e{{font-family:{EMOJI}}}"
               + "".join(self.css) + "".join(self.kf_rules))
        defs = (f'<linearGradient id="bgG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{BG2}"/>'
                f'<stop offset="1" stop-color="{BG}"/></linearGradient>'
                f'<radialGradient id="glow" cx=".12" cy="0" r=".7"><stop offset="0" stop-color="{EMBER}" stop-opacity=".10"/>'
                f'<stop offset="1" stop-color="{EMBER}" stop-opacity="0"/></radialGradient>' + "".join(self.defs))
        w, h = self.w, self.h
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" '
                f'role="img" aria-labelledby="ttl dsc">\n'
                f'<title id="ttl">{esc(self.title)}</title>\n<desc id="dsc">{esc(self.desc)}</desc>\n'
                f"<style>{css}</style>\n<defs>{defs}</defs>\n"
                f'<rect x=".5" y=".5" width="{w - 1}" height="{h - 1}" rx="18" fill="url(#bgG)" stroke="{LINE}"/>\n'
                f'<rect x=".5" y=".5" width="{w - 1}" height="{h - 1}" rx="18" fill="url(#glow)"/>\n'
                + "\n".join(self.body) + "\n</svg>\n")


KEYWORDS = {"ALGORITHM", "for", "to", "do", "while", "and", "or", "not", "if", "then", "else", "return", "downto", "each", "in"}


def _t(s):
    """Escape code text; spaces become no-break spaces so indentation survives SVG whitespace collapsing."""
    return esc(s).replace(" ", "\u00a0")


def colorize(line):
    """Tiny highlighter: keywords steel, ALGORITHM name ember, numbers ember-light, comments muted."""
    if line.strip().startswith("//"):
        return f'<tspan fill="{MUTED}">{_t(line)}</tspan>'
    out, word, toks = [], "", []
    for ch in line:
        if ch.isalnum() or ch == "_":
            word += ch
        else:
            if word:
                toks.append(word)
                word = ""
            toks.append(ch)
    if word:
        toks.append(word)
    prev_alg = False
    for t in toks:
        if t in KEYWORDS:
            out.append(f'<tspan fill="{STEEL}" font-weight="700">{_t(t)}</tspan>')
            prev_alg = t == "ALGORITHM"
        elif prev_alg and t[0].isalpha():
            out.append(f'<tspan fill="{EMBER2}" font-weight="700">{_t(t)}</tspan>')
            prev_alg = False
        elif t.isdigit():
            out.append(f'<tspan fill="{EMBER2}">{_t(t)}</tspan>')
        else:
            out.append(_t(t))
    return "".join(out)


def tr(x, y=0):
    return f"translate({num(float(x))}px,{num(float(y))}px)"


# ============================================================================
# 1. hero.svg - wordmark + insertion sort with following pseudocode
# ============================================================================
def hero():
    T = 14.0
    cv = Card(900, 380, T, "Algorithm Forge - build algorithms from scratch",
              "Wordmark and tagline beside an insertion sort animation whose pseudocode highlight follows every compare and shift.")
    # --- left: wordmark ------------------------------------------------------
    cv.add(f'<g transform="translate(34,78) scale(1.55)">'
           f'<rect x="3" y="18" width="6" height="11" rx="1.5" fill="{STEEL}"/>'
           f'<rect x="11" y="12" width="6" height="17" rx="1.5" fill="{STEEL}" opacity=".8"/>'
           f'<rect x="19" y="6" width="6" height="23" rx="1.5" fill="{EMBER}"/>'
           f'<path d="M22 2l2 3-2 1-2-1z" fill="{COMPARE}"/></g>')
    cv.text(34, 70, "LEVITIN CH 1–12 + BEYOND 13–17", size=11, fill=EMBER, weight=700, letter_spacing="1.4")
    cv.text(88, 120, f'Algorithm <tspan fill="{EMBER}">Forge</tspan>', size=40, fill=INK, weight=800, raw=True, letter_spacing="-0.8")
    cv.text(34, 166, "Build algorithms from scratch —", size=19, fill=INK, weight=600)
    cv.text(34, 192, f'see them, write them, <tspan fill="{EMBER}">prove them</tspan>', size=19, fill=INK, weight=600, raw=True)
    cv.text(34, 226, "Lessons, interactive simulations and a graded", size=13.5, fill=INK2)
    cv.text(34, 245, "pseudocode Arena — from first loop to senior patterns.", size=13.5, fill=INK2)
    chips = [("📖", "17 chapters"), ("👀", "48 sims"), ("✅", "213 problems")]
    cx = 34
    for em, lab in chips:
        wdt = 40 + len(lab) * 7.6
        cv.rect(cx, 270, wdt, 28, fill=PANEL2, rx=14, stroke=LINE2)
        cv.text(cx + 11, 289, em, size=13, cls="e")
        cv.text(cx + 30, 289, lab, size=12.5, fill=INK, weight=600)
        cx += wdt + 8
    cv.text(34, 330, "Levels 0 → 5 · runs in the browser · no installs", size=12, fill=MUTED)

    # --- right: insertion sort --------------------------------------------------
    PX, PY, PW = 438, 20, 440
    cv.rect(PX, PY, PW, 340, fill=PANEL, rx=14, stroke=LINE)
    cv.text(PX + 16, PY + 24, "INSERTION SORT", size=10.5, fill=EMBER, weight=700, letter_spacing="1.3")
    cv.legend(PX + 142, PY + 24, [(COMPARE, "compare"), (SWAP, "shift"), (ACTIVE, "v"), (EMBER2, "prefix"), (DONE, "done")], gap=8, size=10.5)

    A = [5, 2, 4, 6, 1, 3]
    n = len(A)
    code = ["for i ← 1 to n - 1 do",
            "    v ← A[i];  j ← i - 1",
            "    while j ≥ 0 and A[j] > v do",
            "        A[j + 1] ← A[j];  j ← j - 1",
            "    A[j + 1] ← v"]
    # record steps: (line, event)
    arr = list(A)
    ids = list(range(n))          # bar id at each slot
    steps = []                    # dicts describing the state after the step
    comps = shifts = 0
    for i in range(1, n):
        v, vid = arr[i], ids[i]
        steps.append(dict(line=1, kind="pick", i=i, vid=vid))
        j = i - 1
        while True:
            if j >= 0:
                comps += 1
                steps.append(dict(line=2, kind="cmp", j=j, jid=ids[j], vid=vid, c=comps, s=shifts, res=arr[j] > v))
            if j >= 0 and arr[j] > v:
                arr[j + 1], ids[j + 1] = arr[j], ids[j]
                shifts += 1
                steps.append(dict(line=3, kind="shift", jid=ids[j], to=j + 1, vid=vid, c=comps, s=shifts))
                j -= 1
            else:
                break
        arr[j + 1], ids[j + 1] = v, vid
        steps.append(dict(line=4, kind="drop", vid=vid, to=j + 1, i=i, c=comps, s=shifts))
    t0, dt = 0.7, 0.34
    t_end = t0 + dt * len(steps)
    assert t_end < T - 2.2, t_end

    # bar geometry
    BX, BY, BW, SL = PX + 46, PY + 180, 44, 60   # left, baseline, bar width, slot pitch
    unit = 18
    # per-bar tracks
    btracks = {k: [] for k in range(n)}   # (t, {transform, fill})
    slot = {k: k for k in range(n)}
    lifted = None
    for s_i, st in enumerate(steps):
        t = t0 + s_i * dt
        if st["kind"] == "pick":
            vid = st["vid"]
            btracks[vid].append((t, {"transform": tr(0, -20), "fill": ACTIVE}))
            lifted = vid
        elif st["kind"] == "cmp":
            btracks[st["jid"]].append((t, {"fill": COMPARE}, 0.12))
        elif st["kind"] == "shift":
            jid = st["jid"]
            slot[jid] = st["to"]
            btracks[jid].append((t, {"transform": tr((st["to"] - jid) * SL, 0), "fill": SWAP}))
            btracks[jid].append((t + dt * 0.85, {"fill": EMBER2}, 0.1))
            # v hovers over the hole, which has moved one slot left
            vid = st["vid"]
            btracks[vid].append((t, {"transform": tr((st["to"] - 1 - vid) * SL, -20)}))
        elif st["kind"] == "drop":
            vid = st["vid"]
            slot[vid] = st["to"]
            btracks[vid].append((t, {"transform": tr((st["to"] - vid) * SL, 0), "fill": EMBER2}))
        if st["kind"] == "cmp" and not st["res"]:
            btracks[st["jid"]].append((t + dt * 0.85, {"fill": EMBER2}, 0.1))
    # finished: all green, then reset under the fade
    for k in range(n):
        btracks[k].append((t_end + 0.1 + k * 0.07, {"fill": DONE}, 0.2))
        btracks[k].append((T - 0.2, {"transform": tr(0, 0), "fill": BAR}, 0.05))
    # bar 0 starts as the sorted prefix of length 1
    scene = cv.loop_fade()
    cv.open_g(cls=scene)
    for k in range(n):
        init = {"transform": tr(0, 0), "fill": EMBER2 if k == 0 else BAR}
        tracks = btracks[k]
        cls = cv.track(init, tracks, d=0.22)
        h = A[k] * unit
        cv.open_g(cls=cls)
        cv.rect(BX + k * SL, BY - h, BW, h, rx=5, fill=None)
        cv.text(BX + k * SL + BW / 2, BY - h + 16, A[k], size=13, fill=BG, weight=800, anchor="middle")
        cv.close_g()
    cv.add(f'<line x1="{BX - 8}" y1="{BY + 1}" x2="{BX + (n - 1) * SL + BW + 8}" y2="{BY + 1}" stroke="{LINE2}"/>')
    for k in range(n):
        cv.text(BX + k * SL + BW / 2, BY + 15, k, size=10, fill=MUTED, anchor="middle", mono=True)
    # counters + narration
    NY = BY + 40
    last_t = t0
    for s_i, st in enumerate(steps):
        t = t0 + s_i * dt
        t_next = t0 + (s_i + 1) * dt if s_i + 1 < len(steps) else t_end + 0.4
        if st["kind"] == "pick":
            msg = f"i = {st['i']}: lift v = {A[st['vid']]} out of the array"
        elif st["kind"] == "cmp":
            msg = f"compare A[{st['j']}] = {A[st['jid']]} with v = {A[st['vid']]}" + ("  →  bigger, shift it" if st["res"] else "  →  stop")
        elif st["kind"] == "shift":
            msg = f"shift {A[st['jid']]} one slot right"
        else:
            msg = f"drop v = {A[st['vid']]} into slot {st['to']}"
        cv.text(PX + 16, NY, msg, size=12, fill=INK, cls=cv.show(t, t_next - 0.07, fade=0.07), mono=True)
    cv.text(PX + 16, NY, f"sorted!  {n - 1} passes, {comps} comparisons, in place", size=12, fill=DONE, weight=700,
            cls=cv.show(t_end + 0.4, None, fade=0.2), mono=True)
    # comparison counter at top right of bar area
    c_prev = 0
    windows = []
    for s_i, st in enumerate(steps):
        c = st.get("c", c_prev)
        s = st.get("s", 0)
        windows.append((t0 + s_i * dt, c, s))
        c_prev = c
    merged = []
    for t, c, s in windows:
        if merged and merged[-1][1:] == (c, s):
            continue
        merged.append((t, c, s))
    for k, (t, c, s) in enumerate(merged):
        t1 = merged[k + 1][0] if k + 1 < len(merged) else None
        cv.text(PX + 16, PY + 46, f"comparisons {c} · shifts {s}", size=11.5, fill=INK2, mono=True,
                cls=cv.show(t if k else 0, t1, fade=0.05))
    # pseudocode panel under bars, highlight follows line
    ly = NY + 14
    lh = 16
    hl = []
    for s_i, st in enumerate(steps):
        hl.append((t0 + s_i * dt, {"transform": tr(0, (st["line"] - 0) * lh)}, 0.12))
    hl.append((t_end + 0.2, {"opacity": 0}, 0.3))
    hl.append((T - 0.2, {"transform": tr(0, 0), "opacity": 1}, 0.05))
    hcls = cv.track({"transform": tr(0, 0), "opacity": 1}, hl)
    cv.rect(PX + 10, ly - 1, PW - 20, lh, fill=EMBER, rx=4, fill_opacity=".17", cls=hcls)
    cv.rect(PX + 10, ly - 1, 3, lh, fill=EMBER, rx=1.5, cls=hcls)
    for i, ln in enumerate(code):
        cv.text(PX + 18, ly + 11.5 + i * lh, colorize(ln), size=11.5, fill=INK2, mono=True, raw=True)
    cv.close_g()
    return cv


# ============================================================================
# 2. learning-loop.svg - the seven-step loop with a travelling token
# ============================================================================
def learning_loop():
    T = 14.0
    cv = Card(900, 450, T, "The Algorithm Forge learning loop",
              "Seven steps in a loop - Learn, See, Blocks, Write pseudocode, Auto-check, Nudge, Senior twist - with a token travelling around it.")
    cv.header("How it works", "One loop, for every algorithm")
    cv.brand()
    steps = [
        ("📖", "Learn", STEEL, "Read the lesson's Build Card: the problem,", "a one-line story, where it shows up for real."),
        ("👀", "See", PIVOT, "Run the simulation on your own input — step", "forward and back; every frame says why."),
        ("🧱", "Blocks", EMBER, "Snap shuffled pseudocode blocks into order:", "the order and the indentation are the puzzle."),
        ("✍️", "Write pseudocode", COMPARE, "Now write it from a blank page, in", "Levitin-style Forge Pseudocode."),
        ("✅", "Auto-check", DONE, "The Arena really runs it: hidden tests, plus a", "count of basic operations to check the Θ-class."),
        ("💡", "Nudge", EMBER2, "Wrong? You get a targeted hint, not the answer —", "“Start maxval at A[0], not 0.”"),
        ("🧑‍💻", "Senior twist", SWAP, "Solved it? Take the follow-up an experienced", "engineer would ask next. Then loop again."),
    ]
    N = len(steps)
    cx, cy, rx, ry = 450, 250, 330, 132
    M = 2800
    pts = [(cx + rx * math.cos(-math.pi / 2 + 2 * math.pi * i / M), cy + ry * math.sin(-math.pi / 2 + 2 * math.pi * i / M)) for i in range(M + 1)]
    cum = [0.0]
    for i in range(1, len(pts)):
        cum.append(cum[-1] + math.dist(pts[i - 1], pts[i]))
    L = cum[-1]

    def at(frac):
        target = frac * L
        lo = 0
        while lo < M and cum[lo + 1] < target:
            lo += 1
        a, b = pts[lo], pts[min(lo + 1, M)]
        return a, math.degrees(math.atan2(b[1] - a[1], b[0] - a[0]))

    path = f"M{cx},{cy - ry}A{rx},{ry} 0 1 1 {cx},{cy + ry}A{rx},{ry} 0 1 1 {cx},{cy - ry}"
    cv.add(f'<path d="{path}" fill="none" stroke="{LINE2}" stroke-width="2"/>')
    for k in range(N):
        (x, y), ang = at((k + 0.5) / N)
        cv.add(f'<path d="M-5,-6L3,0L-5,6" fill="none" stroke="{MUTED}" stroke-width="2" stroke-linecap="round" '
               f'stroke-linejoin="round" transform="translate({num(x)},{num(y)}) rotate({num(ang)})"/>')
    per, move = T / N, 0.6
    token_at = len(cv.body)
    for k, (em, title, col, d1, d2) in enumerate(steps):
        (x, y), _ = at(k / N)
        t_on = k * per
        halo = cv.track({"opacity": 1 if k == 0 else 0},
                        ([] if k == 0 else [(t_on - 0.1, {"opacity": 1}, 0.2)]) + [(t_on + per - move + 0.05, {"opacity": 0}, 0.3)])
        cv.add(f'<circle cx="{num(x)}" cy="{num(y)}" r="38" fill="{col}" fill-opacity=".16" stroke="{col}" stroke-width="2.5" class="{halo}"/>')
        cv.add(f'<circle cx="{num(x)}" cy="{num(y)}" r="29" fill="{PANEL2}" stroke="{col}" stroke-opacity=".75" stroke-width="2"/>')
        cv.text(x, y + 8.5, em, size=23, anchor="middle", cls="e")
        above = y < cy - 40
        ly = y - 48 if above else y + 56
        lab_w = 30 + len(title) * 7.8
        cv.rect(x - lab_w / 2, ly - 16, lab_w, 23, fill=BG2, rx=11.5, stroke=LINE2)
        cv.text(x - lab_w / 2 + 12, ly, str(k + 1), size=12, fill=col, weight=800)
        cv.text(x - lab_w / 2 + 25, ly, title, size=13, fill=INK, weight=700)
        # centre explanation for this step
        win = cv.show(t_on if k else 0, t_on + per - 0.25, fade=0.25)
        cv.open_g(cls=win)
        cv.text(cx, 206, f'<tspan class="e">{em}</tspan>  <tspan fill="{col}">{k + 1} · {esc(title)}</tspan>', size=20, fill=INK,
                weight=800, anchor="middle", raw=True)
        cv.text(cx, 236, d1, size=14, fill=INK2, anchor="middle")
        cv.text(cx, 257, d2, size=14, fill=INK2, anchor="middle")
        cv.close_g()
    cv.text(cx, 298, "↺ repeat for every algorithm  ·  stuck? step back one — usually to the picture", size=12, fill=MUTED, anchor="middle")
    # token: SMIL motion along the same ellipse, dwelling on each node
    kp, kt = [], []
    for k in range(N):
        kp += [k / N, k / N]
        kt += [k * per / T, (k * per + per - move) / T]
    kp.append(1)
    kt.append(1)
    kps = ";".join(f"{v:.4f}" for v in kp)
    kts = ";".join(f"{v:.4f}" for v in kt)
    # inserted before the nodes: the token slides along the track and tucks under each node while it dwells
    cv.body.insert(token_at, f'<g><circle r="15" fill="{EMBER}" opacity=".3"/><circle r="8" fill="{EMBER}" stroke="{BG}" stroke-width="2"/>'
                   f'<animateMotion dur="{T:g}s" repeatCount="indefinite" calcMode="linear" keyPoints="{kps}" keyTimes="{kts}" path="{path}"/></g>')
    return cv


# ============================================================================
# 3. levels.svg - the Level 0-5 ladder with problem counts from the bank
# ============================================================================
LEVEL_COUNTS_FALLBACK = [14, 33, 27, 26, 38, 52, 23]
NLV = len(LEVEL_COUNTS_FALLBACK)


def level_counts():
    """Problem counts per level, read from the Arena bank via the validator (node).
    Falls back to the last known counts if node is unavailable."""
    import json
    import subprocess
    try:
        out = subprocess.run(["node", os.path.join(ROOT, "tools", "validate-problems.mjs"), "--quiet"], cwd=ROOT,
                             capture_output=True, text=True, timeout=120).stdout
        for line in out.splitlines():
            if line.startswith("by level:"):
                d = json.loads(line.split(":", 1)[1])
                return [int(d.get(str(k), 0)) for k in range(NLV)]
    except (OSError, ValueError, subprocess.SubprocessError):
        pass
    return list(LEVEL_COUNTS_FALLBACK)


def levels():
    T = 12.0
    counts = level_counts()
    total = sum(counts)
    cv = Card(1000, 430, T, "Levels 0 to 6",
              f"A seven-step ladder from Foundations to Expert: Algorithm Designer, with the chapters and the number of Arena problems at each level ({total} in all).")
    cv.header("Levels", "Seven levels, from first loop to algorithm designer")
    info = [
        (["Foundations"], "Start + Ch 1–2", "Loops, arrays, counting"),
        (["Brute Force &", "Analysis"], "Ch 2–3", "Solve it, count it"),
        (["Decrease &", "Divide"], "Ch 4–5", "Shrink it, split it"),
        (["Transform &", "Space-Time"], "Ch 6–7", "Presort, heaps, hashing"),
        (["Dynamic Prog.,", "Greedy &", "Improvement"], "Ch 8–10", "Tables, greedy, flows"),
        (["Hard Problems &", "Senior Patterns"], "Ch 11–17", "NP, pruning, patterns"),
        (["Expert:", "Algorithm", "Designer"], "Ch 12–17", "The hardest set"),
    ]
    X0, W, G, BASE = 30, 128, 6, 410
    heights = [120 + 30 * k for k in range(NLV)]
    arrive = [1.0 + 1.25 * k for k in range(NLV)]
    t_done = arrive[-1] + 0.6
    fade_out = T - 0.7
    maxc = max(counts)
    for k in range(NLV):
        x, h = X0 + k * (W + G), heights[k]
        top = BASE - h
        col = LV[k]
        cv.rect(x, top, W, h, fill=PANEL, rx=10, stroke=LINE)
        lit = cv.track({"opacity": 0}, [(arrive[k] - 0.05, {"opacity": 1}, 0.3), (fade_out, {"opacity": 0}, 0.5)])
        cv.rect(x, top, W, h, fill=col, rx=10, fill_opacity=".13", stroke=col, stroke_width=2, cls=lit)
        cv.rect(x + 10, top, W - 20, 3, fill=col, rx=1.5)
        cv.text(x + 12, top + 22, f"LEVEL {k}", size=10.5, fill=col, weight=800, letter_spacing="1.2")
        yy = top + 42
        for ln in info[k][0]:
            cv.text(x + 12, yy, ln, size=13.5, fill=INK, weight=700)
            yy += 17
        cv.text(x + 12, yy + 1, info[k][1], size=11.5, fill=col, weight=600)
        cv.text(x + 12, yy + 18, info[k][2], size=10.5, fill=INK2)
        # problem count + bar at the bottom of the step
        cv.text(x + 12, BASE - 22, f"{counts[k]} problems", size=12, fill=INK, weight=700)
        cv.rect(x + 12, BASE - 14, W - 24, 5, fill=DIM, rx=2.5)
        grow = cv.track({"transform": "scaleX(0)"}, [(arrive[k], {"transform": "scaleX(1)"}, 0.7),
                                                     (fade_out, {"transform": "scaleX(0)"}, 0.5)])
        cv.add(f'<rect x="{x + 12}" y="{BASE - 14}" width="{num((W - 24) * counts[k] / maxc)}" height="5" rx="2.5" fill="{col}" '
               f'class="{grow}" style="transform-box:fill-box;transform-origin:0 50%"/>')
    # running total, top right
    run = 0
    for k in range(NLV):
        run += counts[k]
        t1 = arrive[k + 1] if k + 1 < NLV else fade_out + 0.3
        cls = cv.show(arrive[k], t1, fade=0.15)
        cv.text(970, 52, f'<tspan fill="{LV[k]}" font-size="26" font-weight="800">{run}</tspan><tspan fill="{MUTED}"> of {total} problems</tspan>',
                size=13, anchor="end", raw=True, cls=cls)
    cv.text(28, 88, "Climb in order — or jump in at your level.", size=12.5, fill=MUTED,
            cls=cv.show(0, arrive[0], fade=0.2))
    cv.text(28, 88, "Levitin Ch 1–12, then the Beyond chapters 13–17.", size=12.5, fill=MUTED,
            cls=cv.show(arrive[0], None, fade=0.2))
    # climber hops from the floor onto each step
    pos = [(X0 - 14, BASE - 10)] + [(X0 + k * (W + G) + 30, BASE - heights[k] - 12) for k in range(NLV)]
    ch = []
    for k in range(NLV):
        (x0, y0), (x1, y1) = pos[k], pos[k + 1]
        t = arrive[k] - 0.55
        ch.append((t, {"transform": tr((x0 + x1) / 2, min(y0, y1) - 34)}, 0.3))
        ch.append((t + 0.3, {"transform": tr(x1, y1)}, 0.25))
    ch.append((fade_out, {"opacity": 0}, 0.4))
    ch.append((T - 0.15, {"transform": tr(*pos[0])}, 0.05))
    ch.append((T - 0.1, {"opacity": 1}, 0.1))
    cl = cv.track({"transform": tr(*pos[0]), "opacity": 1}, ch)
    cv.add(f'<g class="{cl}"><circle r="15" fill="{EMBER}" opacity=".22"/><circle r="9" fill="{EMBER}" stroke="{BG}" stroke-width="2"/>'
           f'<path d="M0,-9V-26" stroke="{INK2}" stroke-width="1.6"/><path d="M0,-26L11,-22L0,-18Z" fill="{COMPARE}"/></g>')
    return cv


# ============================================================================
# 4. binary-search.svg - l, m, r halving a sorted array
# ============================================================================
def binary_search():
    T = 14.0
    A = [3, 9, 14, 21, 27, 31, 38, 42, 47, 55, 60, 66, 70, 81, 93]
    n = len(A)
    bound = int(math.floor(math.log2(n))) + 1
    cv = Card(900, 424, T, "Binary search",
              "Pointers l, m and r halve a sorted array of 15 numbers; the comparison counter never exceeds floor(log2 n) + 1 = 4.")
    cv.header("Ch 4 · Decrease-by-a-constant-factor", "Binary search: halve the range every comparison")
    cv.brand()
    CW, CG = 48, 4
    X0 = (900 - (n * (CW + CG) - CG)) / 2
    CY = 118

    def cx(i):
        return X0 + i * (CW + CG) + CW / 2

    code = ["ALGORITHM BinarySearch(A[0..n-1], K)",
            "    l ← 0;  r ← n - 1",
            "    while l ≤ r do",
            "        m ← ⌊(l + r) / 2⌋",
            "        if K = A[m] return m",
            "        else if K < A[m] r ← m - 1",
            "        else l ← m + 1",
            "    return -1"]
    # ---- record both searches --------------------------------------------------
    events = []   # (t, kind, data)
    t = 0.5
    starts = []
    for K in (70, 10):
        starts.append(t)
        l, r = 0, n - 1
        events.append((t, "start", dict(K=K, l=l, r=r, line=1)))
        t += 0.6
        c = 0
        while l <= r:
            m = (l + r) // 2
            events.append((t, "m", dict(K=K, l=l, r=r, m=m, line=3)))
            t += 0.4
            c += 1
            if K == A[m]:
                events.append((t, "found", dict(K=K, l=l, r=r, m=m, c=c, line=4)))
                t += 1.3
                break
            elif K < A[m]:
                events.append((t, "left", dict(K=K, l=l, r=m - 1, m=m, c=c, line=5, old=(l, r))))
                r = m - 1
            else:
                events.append((t, "right", dict(K=K, l=m + 1, r=r, m=m, c=c, line=6, old=(l, r))))
                l = m + 1
            t += 0.7
        else:
            events.append((t, "miss", dict(K=K, l=l, r=r, c=c, line=7)))
            t += 1.3
        t += 0.2
    assert t < T - 0.4, t
    # ---- cells --------------------------------------------------------------------
    scene = cv.loop_fade()
    cv.open_g(cls=scene)
    for i in range(n):
        ch = []
        for (te, kind, d) in events:
            if kind == "start":
                ch.append((te, {"opacity": 1, "fill": PANEL2, "stroke": LINE2}, 0.2))
            elif kind == "m" and d["m"] == i:
                ch.append((te, {"fill": "#3a3420", "stroke": COMPARE}, 0.2))
            elif kind in ("left", "right"):
                lo, hi = d["l"], d["r"]
                if d["m"] == i or not (lo <= i <= hi):
                    if d["old"][0] <= i <= d["old"][1]:
                        ch.append((te + 0.3, {"opacity": 0.3, "fill": PANEL2, "stroke": LINE2}, 0.3))
            elif kind == "found" and d["m"] == i:
                ch.append((te, {"fill": "#16392c", "stroke": DONE}, 0.2))
        cls = cv.track({"opacity": 1, "fill": PANEL2, "stroke": LINE2}, ch)
        cv.open_g(cls=cls)
        cv.add(f'<rect x="{num(cx(i) - CW / 2)}" y="{CY}" width="{CW}" height="44" rx="8" stroke-width="2"/>')
        cv.text(cx(i), CY + 28, A[i], size=16, fill=INK, weight=700, anchor="middle", mono=True)
        cv.close_g()
        cv.text(cx(i), CY + 60, i, size=10.5, fill=MUTED, anchor="middle", mono=True)
    # ---- pointers ---------------------------------------------------------------
    def pointer(label, col, above, key):
        ch = []
        for (te, kind, d) in events:
            if key == "m":
                if kind == "m":
                    ch.append((te, {"transform": tr(cx(d["m"])), "opacity": 1}, 0.3))
                elif kind in ("start", "miss"):
                    ch.append((te, {"opacity": 0}, 0.2))
            else:
                if kind in ("start", "left", "right", "miss"):
                    idx = d[key]
                    ch.append((te + (0.3 if kind != "start" else 0), {"transform": tr(cx(max(-0.6, min(n - 0.4, idx))))}, 0.35))
        init = {"transform": tr(cx(0 if key == "l" else n - 1)), "opacity": 0 if key == "m" else 1}
        cls = cv.track(init, ch)
        if above:
            cv.add(f'<g class="{cls}"><path d="M-7,{CY - 16}h14l-7,10z" fill="{col}"/>'
                   f'<text y="{CY - 22}" font-size="14" font-weight="800" fill="{col}" text-anchor="middle" class="m">{label}</text></g>')
        else:
            dy = 0 if key == "l" else 32
            cv.add(f'<g class="{cls}"><path d="M-7,{CY + 76 + dy}h14l-7,-10z" fill="{col}"/>'
                   f'<text y="{CY + 92 + dy}" font-size="14" font-weight="800" fill="{col}" text-anchor="middle" class="m">{label}</text></g>')
    pointer("m", COMPARE, True, "m")
    pointer("l", ACTIVE, False, "l")
    pointer("r", PIVOT, False, "r")
    # ---- narration + counters (left panel) ----------------------------------------
    PY = 254
    cv.rect(28, PY, 452, 150, fill=PANEL, rx=12, stroke=LINE)
    ends = [events[i + 1][0] for i in range(len(events) - 1)] + [T - 0.5]
    for (te, kind, d), t1 in zip(events, ends):
        K = d["K"]
        if kind == "start":
            msg = (f"Search for K = {K}", f"l = 0, r = {n - 1}: the whole array is in play", INK2)
        elif kind == "m":
            msg = (f"Search for K = {K}", f"m = ⌊({d['l']} + {d['r']}) / 2⌋ = {d['m']}", INK2)
        elif kind == "left":
            msg = (f"Search for K = {K}", f"{K} < A[{d['m']}] = {A[d['m']]}  →  keep the left half", SWAP)
        elif kind == "right":
            msg = (f"Search for K = {K}", f"{K} > A[{d['m']}] = {A[d['m']]}  →  keep the right half", SWAP)
        elif kind == "found":
            msg = (f"Search for K = {K}", f"{K} = A[{d['m']}]  →  found at index {d['m']}", DONE)
        else:
            msg = (f"Search for K = {K}", f"l = {d['l']} > r = {d['r']}  →  not in the array, return -1", SWAP)
        g = cv.show(te, t1 - 0.05, fade=0.1)
        cv.open_g(cls=g)
        cv.text(46, PY + 30, msg[0], size=17, fill=INK, weight=800)
        cv.text(46, PY + 58, msg[1], size=13.5, fill=msg[2], mono=True, weight=600)
        cv.close_g()
    # comparisons meter
    cv.text(46, PY + 94, "comparisons", size=12, fill=MUTED)
    cv.text(46, PY + 128, f"worst case ⌊log₂ {n}⌋ + 1 = {bound}  ·  a linear scan needs up to {n}", size=12, fill=INK2)
    for k in range(bound):
        ch = []
        for (te, kind, d) in events:
            if kind == "start":
                ch.append((te, {"fill": DIM}, 0.2))
            elif kind in ("left", "right", "found", "miss") and d.get("c", 0) == k + 1 and kind != "miss":
                ch.append((te, {"fill": COMPARE}, 0.2))
        cls = cv.track({"fill": DIM}, ch)
        cv.rect(140 + k * 34, PY + 83, 28, 14, rx=4, fill=None, cls=cls)
    size_txt = []
    for (te, kind, d), t1 in zip(events, ends):
        if kind in ("start", "left", "right"):
            size_txt.append((te + (0.3 if kind != "start" else 0), max(0, d["r"] - d["l"] + 1)))
    for k, (te, sz) in enumerate(size_txt):
        t1 = size_txt[k + 1][0] if k + 1 < len(size_txt) else T - 0.5
        if k + 1 < len(size_txt) and size_txt[k + 1][1] == n:
            t1 = size_txt[k + 1][0]
        cv.text(470, PY + 94, f"range size {sz}", size=12, fill=INK2, anchor="end", mono=True, cls=cv.show(te, t1 - 0.05, fade=0.1))
    # ---- pseudocode panel -----------------------------------------------------------
    lh = 16
    hl = []
    for (te, kind, d) in events:
        hl.append((te, {"transform": tr(0, d["line"] * lh)}, 0.15))
    hcls = cv.track({"transform": tr(0, lh)}, hl)
    x, y, w = 498, PY, 374
    cv.rect(x, y, w, 150, fill=PANEL, rx=12, stroke=LINE)
    ty = y + 11
    cv.rect(x + 6, ty, w - 12, lh, fill=EMBER, rx=4, fill_opacity=".17", cls=hcls)
    cv.rect(x + 6, ty, 3, lh, fill=EMBER, rx=1.5, cls=hcls)
    for i, ln in enumerate(code):
        cv.text(x + 14, ty + 12 + i * lh, colorize(ln), size=11.5, fill=INK2, mono=True, raw=True)
    cv.close_g()
    return cv


# ============================================================================
# 5. growth.svg - log n, n, n log n, n^2, 2^n drawing themselves
# ============================================================================
def growth():
    T = 13.0
    cv = Card(900, 410, T, "Orders of growth",
              "Curves for log n, n, n log n, n squared and 2 to the n draw themselves, with how long each takes at n = 60 if one step is 1 ns.")
    cv.header("Ch 2 · Analysis framework", "Orders of growth: the shape beats the constant")
    PX0, PY0, PW, PH = 76, 112, 450, 240
    NMAX, YMAX = 20, 100

    def X(nv):
        return PX0 + (nv - 1) / (NMAX - 1) * PW

    def Y(v):
        return PY0 + PH - v / YMAX * PH

    cv.defs.append(f'<clipPath id="plot"><rect x="{PX0}" y="{PY0 - 2}" width="{PW + 4}" height="{PH + 4}"/></clipPath>')
    # grid + axes
    for v in (25, 50, 75, 100):
        cv.add(f'<line x1="{PX0}" y1="{num(Y(v))}" x2="{PX0 + PW}" y2="{num(Y(v))}" stroke="{LINE}" stroke-dasharray="3 5"/>')
        cv.text(PX0 - 8, Y(v) + 4, v, size=10.5, fill=MUTED, anchor="end", mono=True)
    for nv in (1, 5, 10, 15, 20):
        cv.text(X(nv), PY0 + PH + 18, nv, size=10.5, fill=MUTED, anchor="middle", mono=True)
    cv.add(f'<path d="M{PX0},{PY0 - 6}V{PY0 + PH}H{PX0 + PW + 6}" fill="none" stroke="{LINE2}" stroke-width="1.5"/>')
    cv.text(PX0 + PW, PY0 + PH + 36, "input size n →", size=11.5, fill=INK2, anchor="end")
    cv.text(30, PY0 - 18, "basic operations ↑", size=11.5, fill=INK2)
    curves = [
        ("log₂ n", DONE, lambda v: math.log2(v), "6 ns"),
        ("n", STEEL, lambda v: v, "60 ns"),
        ("n log₂ n", PIVOT, lambda v: v * math.log2(v), "354 ns"),
        ("n²", EMBER, lambda v: v * v, "3.6 µs"),
        ("2ⁿ", SWAP, lambda v: 2 ** v, "36.5 years"),
    ]
    # sanity-check the table: 1 ns per step at n = 60
    assert round(60 * math.log2(60)) == 354 and abs(2 ** 60 / 1e9 / 31557600 - 36.5) < 0.1
    start, each = 0.5, 1.35
    fade_out = T - 0.7
    cv.open_g(clip_path="url(#plot)")
    label_pos = []
    for k, (lab, col, f, _) in enumerate(curves):
        pts = []
        v = 1.0
        while v <= NMAX + 1e-9:
            y = f(v)
            pts.append((X(v), Y(min(y, YMAX * 1.08))))
            if y > YMAX * 1.08:
                break
            v += 0.1
        d = "M" + "L".join(f"{p[0]:.1f},{p[1]:.1f}" for p in pts)
        length = sum(math.dist(pts[i - 1], pts[i]) for i in range(1, len(pts)))
        Lp = math.ceil(length) + 2
        t0 = start + k * each
        cls = cv.track({"stroke-dashoffset": f"{Lp}px"}, [(t0, {"stroke-dashoffset": "0px"}, each - 0.1),
                                                          (fade_out, {"stroke-dashoffset": f"{Lp}px"}, 0.5)])
        cv.add(f'<path d="{d}" fill="none" stroke="{col}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" '
               f'stroke-dasharray="{Lp}" class="{cls}"/>')
        label_pos.append(pts[-1])
    cv.close_g()
    # curve labels
    spots = {0: (X(20) + 8, Y(math.log2(20)) + 4, "start"), 1: (X(20) + 8, Y(20) + 4, "start"),
             2: (X(20) + 8, Y(20 * math.log2(20)) + 4, "start"), 3: (X(10) + 6, PY0 - 8, "start"), 4: (X(math.log2(100)) - 6, PY0 - 8, "end")}
    for k, (lab, col, f, _) in enumerate(curves):
        x, y, anc = spots[k]
        cls = cv.show(start + k * each + each - 0.25, fade_out, fade=0.25)
        cv.text(x, y, lab, size=14, fill=col, weight=800, anchor=None if anc == "start" else "end", cls=cls)
    # right panel: time at n = 60 with 1 ns per basic operation
    RX, RY, RW = 612, 96, 260
    cv.rect(RX, RY, RW, 272, fill=PANEL, rx=12, stroke=LINE)
    cv.text(RX + 18, RY + 28, "IF ONE STEP TAKES 1 ns", size=10.5, fill=EMBER, weight=700, letter_spacing="1.2")
    cv.text(RX + 18, RY + 48, "…and n = 60, the run takes:", size=12.5, fill=INK2)
    for k, (lab, col, f, tm) in enumerate(curves):
        yy = RY + 86 + k * 34
        cls = cv.show(start + k * each + 0.4, fade_out, fade=0.3)
        cv.open_g(cls=cls)
        cv.rect(RX + 18, yy - 10, 12, 12, rx=3, fill=col)
        cv.text(RX + 40, yy, lab, size=14, fill=INK, weight=700)
        cv.text(RX + RW - 18, yy, tm, size=14, fill=col if k == 4 else INK, weight=800 if k == 4 else 600, anchor="end", mono=True)
        cv.close_g()
    cls = cv.show(start + 3 * each + 0.9, fade_out, fade=0.3)
    cv.text(X(10) + 30, PY0 - 8, "← both leave the chart before n = 11", size=11.5, fill=MUTED, cls=cls)
    cls = cv.show(start + 5 * each + 0.4, fade_out, fade=0.3)
    cv.text(RX + 18, RY + 254, "Constant factors fade; the order wins.", size=12, fill=MUTED, cls=cls)
    return cv


# ============================================================================
# 6. recursion-tree.svg - mergesort, T(n) = 2T(n/2) + n
# ============================================================================
def recursion_tree():
    T = 13.0
    A = [6, 3, 8, 1, 5, 7, 2, 4]
    n = len(A)
    depth = int(math.log2(n))
    cv = Card(900, 470, T, "Mergesort recursion tree",
              "The recursion tree of T(n) = 2T(n/2) + n grows level by level; every level costs n, there are log2 n levels, so the total is n log2 n.")
    cv.header("Ch 5 · Divide-and-conquer", "Mergesort's recursion tree:  T(n) = 2T(n/2) + n,  T(1) = 0")
    cv.brand()
    LY = [124, 196, 268, 340]
    NH = 30
    left, right = 96, 596
    leaf_x = [left + k * (right - left) / (n - 1) for k in range(n)]
    levels_ = []  # per level: list of (cx, unsorted, sorted)
    for lv in range(depth + 1):
        size = n >> lv
        nodes = []
        for k in range(1 << lv):
            chunk = A[k * size:(k + 1) * size]
            xs = leaf_x[k * size:(k + 1) * size]
            nodes.append(((xs[0] + xs[-1]) / 2, chunk, sorted(chunk)))
        levels_.append(nodes)
    appear = [0.6 + 1.25 * lv for lv in range(depth + 1)]
    merge = [appear[-1] + 1.3 + 1.0 * (depth - lv) for lv in range(depth + 1)]
    t_total = merge[0] + 0.9
    fade_out = T - 0.7
    # divide / merge direction hint on the left
    cv.open_g(cls=cv.show(appear[0], merge[depth] - 0.3, fade=0.3))
    cv.add(f'<path d="M44,{LY[0] - 8}V{LY[-1] + 6}" stroke="{STEEL}" stroke-width="2.5"/><path d="M37,{LY[-1]}l7,12l7,-12z" fill="{STEEL}"/>')
    cv.text(44, LY[0] - 16, "split", size=12, fill=STEEL, weight=700, anchor="middle")
    cv.close_g()
    cv.open_g(cls=cv.show(merge[depth], fade_out, fade=0.3))
    cv.add(f'<path d="M44,{LY[-1] + 8}V{LY[0] + 2}" stroke="{DONE}" stroke-width="2.5"/><path d="M37,{LY[0] + 6}l7,-12l7,12z" fill="{DONE}"/>')
    cv.text(44, LY[-1] + 26, "merge", size=12, fill=DONE, weight=700, anchor="middle")
    cv.close_g()
    # edges
    for lv in range(1, depth + 1):
        for k, (x, _, _) in enumerate(levels_[lv]):
            px = levels_[lv - 1][k // 2][0]
            y0, y1 = LY[lv - 1] + NH / 2, LY[lv] - NH / 2
            L = math.ceil(math.dist((px, y0), (x, y1))) + 1
            cls = cv.track({"stroke-dashoffset": f"{L}px"}, [(appear[lv] - 0.35, {"stroke-dashoffset": "0px"}, 0.45),
                                                             (fade_out, {"stroke-dashoffset": f"{L}px"}, 0.4)])
            cv.add(f'<path d="M{num(px)},{y0}L{num(x)},{y1}" stroke="{LINE2}" stroke-width="2" stroke-dasharray="{L}" class="{cls}"/>')
    # nodes
    for lv, nodes in enumerate(levels_):
        for (x, uns, srt) in nodes:
            txt = " ".join(map(str, uns))
            w = 20 + len(txt) * 8.4
            cls = cv.show(appear[lv], fade_out, fade=0.3)
            cv.open_g(cls=cls)
            cv.rect(x - w / 2, LY[lv] - NH / 2, w, NH, fill=PANEL2, rx=8, stroke=STEEL, stroke_width=1.5)
            cv.text(x, LY[lv] + 5, txt, size=14, fill=INK, weight=700, anchor="middle", mono=True)
            cv.close_g()
            cls = cv.show(merge[lv], fade_out, fade=0.35)
            cv.open_g(cls=cls)
            cv.rect(x - w / 2, LY[lv] - NH / 2, w, NH, fill="#143427", rx=8, stroke=DONE, stroke_width=1.5)
            cv.text(x, LY[lv] + 5, " ".join(map(str, srt)), size=14, fill=DONE, weight=700, anchor="middle", mono=True)
            cv.close_g()
    # per-level cost column
    RX = 640
    cv.text(RX, LY[0] - 36, "COST PER LEVEL", size=10.5, fill=EMBER, weight=700, letter_spacing="1.2")
    for lv in range(depth + 1):
        calls, frac = 1 << lv, ("n" if lv == 0 else f"n/{1 << lv}")
        if lv < depth:
            l1 = f"level {lv} · {calls} call{'s' if calls > 1 else ''} of size {frac}"
            l2, val = (f"{calls} × {frac} = n" if lv else "n"), f"= {n}"
        else:
            l1 = f"level {lv} · {calls} calls of size 1"
            l2, val = "base case T(1) = 0", "= 0"
        cls = cv.show(appear[lv] + 0.45, fade_out, fade=0.3)
        cv.open_g(cls=cls)
        cv.text(RX, LY[lv] - 4, l1, size=11.5, fill=MUTED)
        cv.text(RX, LY[lv] + 14, l2, size=14.5, fill=INK if lv < depth else INK2, weight=800 if lv < depth else 600, mono=True)
        cv.text(872, LY[lv] + 14, val, size=14.5, fill=EMBER if lv < depth else MUTED, weight=800, anchor="end", mono=True)
        cv.close_g()
    # total
    cls = cv.show(t_total, fade_out, fade=0.35)
    cv.open_g(cls=cls)
    cv.rect(24, 382, 852, 64, fill=PANEL, rx=12, stroke=EMBER, stroke_opacity=".55")
    cv.text(44, 409, f'<tspan fill="{INK2}">n per level × </tspan><tspan fill="{EMBER}">log₂ n</tspan><tspan fill="{INK2}"> levels  =  </tspan>'
                     f'<tspan fill="{EMBER}" font-weight="800">n log₂ n</tspan>', size=17, weight=700, raw=True)
    cv.text(44, 432, f"here n = {n}:  {n} × {depth} = {n * depth}  — so mergesort is Θ(n log n) in every case", size=13, fill=INK2)
    cv.text(856, 422, "Θ(n log n)", size=24, fill=DONE, weight=800, anchor="end")
    cv.close_g()
    return cv


# ============================================================================
# 7. dp-table.svg - 0/1 knapsack, Levitin's W = 5 instance
# ============================================================================
def dp_table():
    T = 14.0
    items = [(2, 12), (1, 10), (3, 20), (2, 15)]
    W = 5
    nI = len(items)
    F = [[0] * (W + 1) for _ in range(nI + 1)]
    for i in range(1, nI + 1):
        w, v = items[i - 1]
        for j in range(1, W + 1):
            F[i][j] = max(F[i - 1][j], v + F[i - 1][j - w]) if j >= w else F[i - 1][j]
    assert F[nI][W] == 37
    cv = Card(900, 440, T, "Knapsack dynamic programming table",
              "The 0/1 knapsack table for capacity 5 and items (2, $12), (1, $10), (3, $20), (2, $15) fills cell by cell to $37, then a traceback recovers items 1, 2 and 4.")
    cv.header("Ch 8 · Dynamic Programming (DP)", "Knapsack: fill the table once, never recompute")
    cv.brand()
    # ---- geometry --------------------------------------------------------------
    TX, TY, HW, HH, CW, CH = 262, 92, 58, 26, 62, 38

    def cell(i, j):
        return TX + HW + j * CW, TY + HH + i * CH

    t0, dt = 0.7, 0.36
    order = [(i, j) for i in range(1, nI + 1) for j in range(1, W + 1)]
    t_fill = {c: t0 + k * dt for k, c in enumerate(order)}
    t_end_fill = t0 + len(order) * dt
    fade_out = T - 0.7
    # ---- item list (left) ---------------------------------------------------------
    cv.rect(24, 92, 214, 222, fill=PANEL, rx=12, stroke=LINE)
    cv.text(40, 116, "ITEMS", size=10.5, fill=EMBER, weight=700, letter_spacing="1.2")
    cv.text(222, 116, f"capacity W = {W}", size=12, fill=INK, weight=700, anchor="end")
    cv.text(40, 140, "i", size=11, fill=MUTED, mono=True)
    cv.text(80, 140, "weight", size=11, fill=MUTED)
    cv.text(150, 140, "value", size=11, fill=MUTED)
    # traceback (computed now, drawn later)
    tb = []
    i, j = nI, W
    while i > 0:
        take = F[i][j] != F[i - 1][j]
        tb.append((i, j, take))
        if take:
            j -= items[i - 1][0]
        i -= 1
    t_tb = [t_end_fill + 0.5 + 0.75 * k for k in range(len(tb))]
    t_result = t_tb[-1] + 0.8
    for r, (w, v) in enumerate(items, start=1):
        y = 140 + r * 34
        rows = [x for x in order if x[0] == r]
        act = cv.track({"opacity": 0}, [(t_fill[rows[0]] - 0.05, {"opacity": 1}, 0.15), (t_fill[rows[-1]] + dt - 0.05, {"opacity": 0}, 0.15)])
        cv.rect(32, y - 21, 198, 30, fill=ACTIVE, rx=7, fill_opacity=".16", stroke=ACTIVE, cls=act)
        k = next(k for k, s in enumerate(tb) if s[0] == r)
        take = tb[k][2]
        res = cv.show(t_tb[k] + 0.2, fade_out, fade=0.25)
        cv.rect(32, y - 21, 198, 30, fill=DONE if take else DIM, rx=7, fill_opacity=".18" if take else ".35",
                stroke=DONE if take else "none", cls=res)
        cv.text(40, y, r, size=14, fill=INK, weight=700, mono=True)
        cv.text(80, y, w, size=14, fill=INK, mono=True)
        cv.text(150, y, f"${v}", size=14, fill=EMBER2, weight=700, mono=True)
        cv.text(222, y, "✓ take" if take else "✗ skip", size=12, fill=DONE if take else MUTED, weight=700, anchor="end", cls=res)
    # ---- table -------------------------------------------------------------------
    cv.text(TX + HW + (W + 1) * CW, TY - 6, "capacity j →", size=11, fill=MUTED, anchor="end")
    # header row with j values (above the first data row)
    for j in range(W + 1):
        x, y = cell(0, j)
        cv.text(x + CW / 2, y - 6, j, size=13, fill=INK2, weight=700, anchor="middle", mono=True)
    cv.text(TX + 6, TY + HH - 6, "i ↓", size=11, fill=MUTED)
    for i in range(nI + 1):
        x, y = cell(i, 0)
        cv.text(TX + 14, y + CH / 2 + 5, i, size=13, fill=INK2, weight=700, mono=True)
        for j in range(W + 1):
            x, y = cell(i, j)
            cv.rect(x + 1, y + 1, CW - 2, CH - 2, fill=PANEL if (i and j) else BG2, rx=6, stroke=LINE)
    for i in range(nI + 1):
        for j in range(W + 1):
            x, y = cell(i, j)
            if i == 0 or j == 0:
                cv.text(x + CW / 2, y + CH / 2 + 5, 0, size=14, fill=MUTED, anchor="middle", mono=True)
            else:
                cls = cv.show(t_fill[(i, j)] + dt * 0.55, fade_out, fade=0.15)
                cv.text(x + CW / 2, y + CH / 2 + 5, F[i][j], size=15, fill=INK, weight=800, anchor="middle", mono=True, cls=cls)
    # ---- cursors -------------------------------------------------------------------
    def cursor(col, getter, fill_op):
        ch = []
        first = None
        for (i, j) in order:
            tgt = getter(i, j)
            t = t_fill[(i, j)]
            if tgt is None:
                ch.append((t, {"opacity": 0}, 0.1))
                continue
            x, y = cell(*tgt)
            if first is None:
                first = (x, y)
            ch.append((t, {"transform": tr(x, y), "opacity": 1}, 0.14))
        ch.append((t_end_fill, {"opacity": 0}, 0.2))
        cls = cv.track({"transform": tr(*first), "opacity": 0}, ch)
        cv.add(f'<rect x="1.5" y="1.5" width="{CW - 3}" height="{CH - 3}" rx="6" fill="{col}" fill-opacity="{fill_op}" '
               f'stroke="{col}" stroke-width="2.5" class="{cls}"/>')

    cursor(COMPARE, lambda i, j: (i - 1, j), ".12")
    cursor(PIVOT, lambda i, j: (i - 1, j - items[i - 1][0]) if j >= items[i - 1][0] else None, ".14")
    cursor(ACTIVE, lambda i, j: (i, j), ".2")
    # ---- traceback --------------------------------------------------------------------
    for k, (i, j, take) in enumerate(tb):
        x, y = cell(i, j)
        cls = cv.show(t_tb[k], fade_out, fade=0.25)
        cv.rect(x + 2, y + 2, CW - 4, CH - 4, rx=6, fill=DONE if take else "none", fill_opacity=".18",
                stroke=DONE if take else MUTED, stroke_width=2.5, stroke_dasharray=None if take else "4 3", cls=cls)
        nj = j - items[i - 1][0] if take else j
        x2, y2 = cell(i - 1, nj)
        cv.add(f'<path d="M{num(x + CW / 2)},{num(y + 4)}L{num(x2 + CW / 2)},{num(y2 + CH - 4)}" stroke="{DONE if take else MUTED}" '
               f'stroke-width="2" stroke-dasharray="{"none" if take else "3 3"}" class="{cls}"/>')
    x, y = cell(0, 0)
    cv.rect(x + 2, y + 2, CW - 4, CH - 4, rx=6, fill="none", stroke=DONE, stroke_width=2.5, cls=cv.show(t_tb[-1] + 0.5, fade_out, fade=0.25))
    # ---- narration --------------------------------------------------------------------
    NY = TY + HH + (nI + 1) * CH + 30
    for k, (i, j) in enumerate(order):
        w, v = items[i - 1]
        t = t_fill[(i, j)]
        if j >= w:
            s = (f'F({i},{j}) = max(<tspan fill="{COMPARE}">F({i - 1},{j})</tspan>, {v} + <tspan fill="{PIVOT}">F({i - 1},{j - w})</tspan>)'
                 f' = max({F[i - 1][j]}, {v + F[i - 1][j - w]}) = <tspan fill="{ACTIVE}" font-weight="800">{F[i][j]}</tspan>')
        else:
            s = (f'F({i},{j}): item {i} (weight {w}) does not fit  →  <tspan fill="{COMPARE}">F({i - 1},{j})</tspan>'
                 f' = <tspan fill="{ACTIVE}" font-weight="800">{F[i][j]}</tspan>')
        cv.text(TX, NY, s, size=13, fill=INK, mono=True, raw=True, cls=cv.show(t, t + dt - 0.04, fade=0.05))
    for k, (i, j, take) in enumerate(tb):
        t1 = t_tb[k + 1] if k + 1 < len(tb) else t_result
        if take:
            s = f'F({i},{j}) = {F[i][j]} ≠ F({i - 1},{j}) = {F[i - 1][j]}  →  item {i} is in; j = {j} − {items[i - 1][0]} = {j - items[i - 1][0]}'
        else:
            s = f'F({i},{j}) = {F[i][j]} = F({i - 1},{j})  →  item {i} is not needed; stay at j = {j}'
        cv.text(TX, NY, s, size=13, fill=DONE if take else INK2, mono=True, cls=cv.show(t_tb[k], t1 - 0.05, fade=0.1))
    chosen = [i for (i, j, take) in tb if take][::-1]
    wt = sum(items[i - 1][0] for i in chosen)
    cv.text(TX, NY, f'best: items {{{", ".join(map(str, chosen))}}}  ·  weight {wt}  ·  value ${F[nI][W]}', size=14.5, fill=DONE, weight=800,
            mono=True, cls=cv.show(t_result, fade_out, fade=0.25))
    # legend + recurrence
    cv.legend(TX, NY + 30, [(ACTIVE, "cell being filled"), (COMPARE, "skip item i"), (PIVOT, "take item i"), (DONE, "traceback")], gap=12, size=11.5)
    cv.text(TX, NY + 56, "F(i, j) = max( F(i−1, j),  vᵢ + F(i−1, j − wᵢ) )  if j ≥ wᵢ,  else F(i−1, j)", size=12, fill=MUTED, mono=True)
    # right panel: why DP
    RX = 712
    cv.rect(RX, 92, 164, 222, fill=PANEL, rx=12, stroke=LINE)
    cv.text(RX + 14, 116, "WHY A TABLE?", size=10.5, fill=EMBER, weight=700, letter_spacing="1.2")
    for k, ln in enumerate(["Brute force tries", f"all 2{'⁰¹²³⁴⁵⁶⁷⁸⁹'[nI]} = {2 ** nI} subsets;", "for n items that is 2ⁿ.", "",
                            "The table has", f"(n+1)(W+1) = {(nI + 1) * (W + 1)} cells,", "each filled once in", "O(1): Θ(nW) total."]):
        cv.text(RX + 14, 142 + k * 19, ln, size=12, fill=INK2 if ln else MUTED)
    return cv


# ============================================================================
# 8. graph-bfs.svg - Breadth-First Search wave with the queue
# ============================================================================
def graph_bfs():
    T = 13.0
    AX, AY = 70, 250
    radii = {1: 132, 2: 256, 3: 382}

    def polar(r, deg):
        return (round(AX + r * math.cos(math.radians(deg)), 1), round(AY + r * math.sin(math.radians(deg)), 1))
    # vertices sit exactly on the ring of their BFS distance, so the dashed "waves" pass through them
    pos = {"a": (AX, AY), "b": polar(radii[1], -52), "c": polar(radii[1], 0), "d": polar(radii[1], 52),
           "e": polar(radii[2], -32), "f": polar(radii[2], 0), "g": polar(radii[2], 33),
           "h": polar(radii[3], -19), "i": polar(radii[3], 18)}
    edges = ["ab", "ac", "ad", "bc", "be", "cf", "dg", "ef", "fg", "eh", "fh", "gi"]
    adj = {v: sorted([e[1] for e in edges if e[0] == v] + [e[0] for e in edges if e[1] == v]) for v in pos}
    cv = Card(900, 440, T, "Breadth-First Search (BFS)",
              "Breadth-First Search expands from vertex a in waves; the FIFO queue and the visit order are shown on the right.")
    cv.header("Ch 3 · Brute force · graph traversal", "Breadth-First Search (BFS): explore in waves")
    cv.brand()
    # ---- simulate ------------------------------------------------------------------
    ev = []    # (t, kind, data)
    t = 0.7
    dist = {"a": 0}
    queue = ["a"]
    ev.append((t, "enq", dict(v="a", u=None, q=list(queue))))
    t += 0.55
    order = []
    while queue:
        u = queue.pop(0)
        order.append(u)
        ev.append((t, "deq", dict(v=u, q=list(queue), k=len(order) - 1)))
        t += 0.5
        for w in adj[u]:
            if w not in dist:
                dist[w] = dist[u] + 1
                queue.append(w)
                ev.append((t, "enq", dict(v=w, u=u, q=list(queue))))
                t += 0.42
        ev.append((t - 0.05, "done", dict(v=u)))
    t_end = t
    assert t_end < T - 2.0, t_end
    fade_out = T - 0.7
    # ---- wave rings ----------------------------------------------------------------------
    cv.defs.append('<clipPath id="garea"><rect x="24" y="80" width="514" height="340" rx="12"/></clipPath>')
    cv.rect(24, 80, 514, 340, fill=PANEL, rx=12, stroke=LINE)
    ax, ay = pos["a"]
    cv.open_g(clip_path="url(#garea)")
    for dlev, r in radii.items():
        first = min(te for (te, kind, d) in ev if kind == "enq" and dist[d["v"]] == dlev)
        cls = cv.track({"opacity": 0, "transform": "scale(.85)"}, [(first, {"opacity": 1, "transform": "scale(1)"}, 0.5),
                                                                    (fade_out, {"opacity": 0}, 0.4)])
        cv.add(f'<circle cx="{ax}" cy="{ay}" r="{r}" fill="none" stroke="{STEEL}" stroke-opacity=".35" stroke-width="2" '
               f'stroke-dasharray="5 7" class="{cls}" style="transform-origin:{ax}px {ay}px"/>')
    cv.close_g()
    # ---- edges ---------------------------------------------------------------------------
    for e in edges:
        (x1, y1), (x2, y2) = pos[e[0]], pos[e[1]]
        cv.add(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{LINE2}" stroke-width="2.5"/>')
    for (te, kind, d) in ev:
        if kind == "enq" and d["u"]:
            (x1, y1), (x2, y2) = pos[d["u"]], pos[d["v"]]
            cls = cv.show(te, fade_out, fade=0.25)
            cv.add(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{EMBER}" stroke-width="4" stroke-linecap="round" class="{cls}"/>')
    # ---- nodes ----------------------------------------------------------------------------
    for v, (x, y) in pos.items():
        ch = []
        for (te, kind, d) in ev:
            if d["v"] != v:
                continue
            if kind == "enq":
                ch.append((te, {"fill": COMPARE}, 0.2))
            elif kind == "deq":
                ch.append((te, {"fill": ACTIVE}, 0.2))
            elif kind == "done":
                ch.append((te, {"fill": DONE}, 0.2))
        ch.append((fade_out, {"fill": BAR}, 0.4))
        cls = cv.track({"fill": BAR}, ch)
        cv.add(f'<circle cx="{x}" cy="{y}" r="19" stroke="{BG}" stroke-width="3" class="{cls}"/>')
        cv.text(x, y + 6, v, size=17, fill=BG, weight=800, anchor="middle")
        te = next(te for (te, kind, d) in ev if kind == "enq" and d["v"] == v)
        cv.open_g(cls=cv.show(te + 0.1, fade_out, fade=0.2))
        cv.add(f'<circle cx="{num(x + 16)}" cy="{num(y + 15)}" r="8.5" fill="{BG}" stroke="{STEEL}" stroke-width="1.5"/>')
        cv.text(x + 16, y + 19, dist[v], size=10.5, fill=STEEL, weight=800, anchor="middle", mono=True)
        cv.close_g()
    # ---- queue + visit order (right) ---------------------------------------------------------
    RX, RW = 556, 320
    cv.rect(RX, 80, RW, 340, fill=PANEL, rx=12, stroke=LINE)
    cv.text(RX + 16, 106, "QUEUE (FIFO)", size=10.5, fill=EMBER, weight=700, letter_spacing="1.2")
    cv.text(RX + RW - 16, 106, "dequeue ← front … back ← enqueue", size=10.5, fill=MUTED, anchor="end")
    QY, QP = 136, 38
    for s in range(5):
        cv.add(f'<rect x="{RX + 16 + s * QP}" y="{QY - 17}" width="34" height="34" rx="9" fill="none" stroke="{LINE2}" stroke-dasharray="3 4"/>')
    cv.text(RX + 16, 190, "VISIT ORDER", size=10.5, fill=EMBER, weight=700, letter_spacing="1.2")
    VY, VP = 218, 32
    # chip tracks
    def qxy(slot):
        return RX + 16 + 17 + slot * QP, QY

    def vxy(k):
        return RX + 16 + 15 + k * VP, VY

    for v in pos:
        ch = []
        init = None
        for (te, kind, d) in ev:
            if kind in ("enq", "deq"):
                q = d["q"]
                if kind == "deq" and d["v"] == v:
                    ch.append((te, {"transform": tr(*vxy(d["k"])), "fill": ACTIVE}, 0.35))
                    continue
                if v in q:
                    slot = q.index(v)
                    if init is None:
                        init = qxy(slot)
                        ch.append((te, {"opacity": 1}, 0.2))
                    else:
                        ch.append((te, {"transform": tr(*qxy(slot))}, 0.3))
            elif kind == "done" and d["v"] == v:
                ch.append((te, {"fill": DONE}, 0.2))
        ch.append((fade_out, {"opacity": 0}, 0.4))
        cls = cv.track({"transform": tr(*init), "opacity": 0, "fill": COMPARE}, ch)
        cv.add(f'<g class="{cls}"><circle r="15"/><text y="5.5" font-size="15" font-weight="800" fill="{BG}" text-anchor="middle">{v}</text></g>')
    for k, v in enumerate(order):
        te = next(te for (te, kind, d) in ev if kind == "deq" and d["v"] == v)
        x, y = vxy(k)
        cv.text(x, y + 32, dist[v], size=11, fill=MUTED, anchor="middle", mono=True, cls=cv.show(te + 0.3, fade_out, fade=0.2))
    # narration
    NY = 294
    ends = [ev[k + 1][0] for k in range(len(ev) - 1)] + [t_end + 0.3]
    for (te, kind, d), t1 in zip(ev, ends):
        if kind == "enq" and d["u"] is None:
            s, s2 = "start: enqueue a", "a is at distance 0"
        elif kind == "enq":
            s, s2 = f"{d['u']} discovers {d['v']} → enqueue it", f"distance({d['v']}) = distance({d['u']}) + 1 = {dist[d['v']]}"
        elif kind == "deq":
            nb = ", ".join(adj[d["v"]])
            s, s2 = f"dequeue {d['v']} (the front)", f"scan its neighbours: {nb}"
        else:
            continue
        cls = cv.show(te, t1 - 0.04, fade=0.08)
        cv.open_g(cls=cls)
        cv.text(RX + 16, NY, s, size=14, fill=INK, weight=700)
        cv.text(RX + 16, NY + 22, s2, size=12.5, fill=INK2, mono=True)
        cv.close_g()
    cls = cv.show(t_end + 0.3, fade_out, fade=0.2)
    cv.open_g(cls=cls)
    cv.text(RX + 16, NY, "queue empty → done", size=14, fill=DONE, weight=700)
    cv.text(RX + 16, NY + 22, "ember edges form the BFS tree: shortest paths", size=12.5, fill=INK2)
    cv.text(RX + 16, NY + 42, "from a; dashed rings = distance 1, 2, 3", size=12.5, fill=INK2)
    cv.close_g()
    lx = RX + 16
    for col, lab in [(BAR, "unseen"), (COMPARE, "in queue"), (ACTIVE, "current"), (DONE, "done")]:
        cv.add(f'<circle cx="{lx + 6}" cy="{386}" r="6" fill="{col}"/>')
        cv.text(lx + 16, 390, lab, size=11.5, fill=INK2)
        lx += 24 + len(lab) * 6.6
    return cv


# ============================================================================
# 9. arena-flow.svg - write, submit, nudge, fix, accepted
# ============================================================================
def arena_flow():
    T = 14.0
    fade_out = T - 0.7
    cv = Card(900, 470, T, "The Practice Arena flow",
              "Pseudocode is typed, submitted, fails one of three tests with the nudge 'Start maxval at A[0], not 0', gets fixed, and is Accepted with a growth chart showing Theta(n).")
    # ---- top bar ---------------------------------------------------------------------
    cv.rect(24, 20, 852, 44, fill=PANEL, rx=12, stroke=LINE)
    cv.text(42, 48, "🏟️", size=15, cls="e")
    cv.text(66, 48, "Practice Arena", size=13, fill=MUTED, weight=700)
    cv.text(186, 48, "›", size=15, fill=MUTED)
    cv.text(202, 48, "Largest Element", size=16, fill=INK, weight=800)
    cv.rect(346, 32, 104, 22, fill="none", rx=11, stroke=LV[0])
    cv.text(398, 47, "L0 Foundations", size=11, fill=LV[0], weight=700, anchor="middle")
    cv.rect(456, 32, 94, 22, fill=STEEL, fill_opacity=".14", rx=11)
    cv.text(503, 47, "Ch 2 · Analysis", size=11, fill=STEEL, weight=700, anchor="middle")
    cv.text(858, 48, "Levitin §2.3", size=11.5, fill=MUTED, anchor="end")
    # ---- editor ------------------------------------------------------------------------
    EX, EY, EW, EH = 24, 76, 480, 262
    cv.rect(EX, EY, EW, EH, fill=PANEL, rx=12, stroke=LINE)
    tabs = [("🧱 Blocks", False), ("✍️ Pseudocode", True), ("JS", False), ("🐍 Python", False)]
    tx = EX + 16
    for lab, on in tabs:
        cv.text(tx, EY + 28, lab, size=12.5, fill=INK if on else MUTED, weight=700)
        w = len(lab) * 7.4 + 8
        if on:
            cv.rect(tx, EY + 36, w - 8, 2.5, fill=EMBER, rx=1)
        tx += w + 12
    cv.add(f'<line x1="{EX}" y1="{EY + 44}" x2="{EX + EW}" y2="{EY + 44}" stroke="{LINE}"/>')
    # buttons
    cv.rect(EX + EW - 146, EY + 12, 58, 24, fill="none", rx=7, stroke=LINE2)
    cv.text(EX + EW - 117, EY + 28.5, "▶ Run", size=11.5, fill=INK2, weight=700, anchor="middle")
    t_sub1, t_sub2 = 5.0, 9.4
    pulse = cv.track({"transform": "scale(1)"}, [(t_sub1, {"transform": "scale(.9)"}, 0.12), (t_sub1 + 0.14, {"transform": "scale(1)"}, 0.15),
                                                (t_sub2, {"transform": "scale(.9)"}, 0.12), (t_sub2 + 0.14, {"transform": "scale(1)"}, 0.15)])
    cv.add(f'<g class="{pulse}" style="transform-box:fill-box;transform-origin:center"><rect x="{EX + EW - 80}" y="{EY + 12}" width="64" height="24" rx="7" fill="{EMBER}"/>'
           f'<text x="{EX + EW - 48}" y="{EY + 28.5}" font-size="11.5" font-weight="800" fill="{BG}" text-anchor="middle">Submit</text></g>')
    # code with typing effect
    code = ["ALGORITHM MaxElement(A[0..n-1])",
            "    maxval ← 0",
            "    for i ← 0 to n - 1 do",
            "        if A[i] > maxval then",
            "            maxval ← A[i]",
            "    return maxval"]
    CX0, CY0, LH = EX + 46, EY + 76, 26
    cv.defs.append(f'<clipPath id="ed"><rect x="{EX + 36}" y="{EY + 50}" width="{EW - 44}" height="{EH - 56}"/></clipPath>')
    # line 2 highlight (bug) and fixed tint
    bug = cv.track({"opacity": 0, "fill": SWAP}, [(7.9, {"opacity": 1}, 0.3), (8.9, {"fill": DONE}, 0.3), (fade_out, {"opacity": 0}, 0.4)])
    cv.add(f'<rect x="{EX + 8}" y="{CY0 + LH - 18}" width="{EW - 16}" height="{LH - 2}" rx="5" fill-opacity=".16" class="{bug}"/>')
    for k in range(len(code)):
        cv.text(EX + 22, CY0 + k * LH, k + 1, size=11.5, fill=MUTED, anchor="middle", mono=True)
    cv.add(f'<line x1="{EX + 36}" y1="{EY + 50}" x2="{EX + 36}" y2="{EY + EH - 8}" stroke="{LINE}"/>')
    CHW = 8.13  # monospace advance at 13.5px (0.6 em: Menlo / SF Mono / DejaVu Sans Mono)
    t = 0.4
    scene = cv.loop_fade()
    cv.open_g(cls=scene)
    cv.open_g(clip_path="url(#ed)")
    fx = CX0 + 13 * CHW
    # the fix: "A[0]" (hidden under its own cover until typed) sits beneath the original "0"
    cv.text(fx, CY0 + LH, "A[0]", size=13.5, fill=INK, mono=True)
    cover = cv.track({"transform": tr(0), "opacity": 1}, [(8.55, {"transform": tr(4 * CHW + 14)}, 0.35), (9.0, {"opacity": 0}, 0.05)])
    cv.add(f'<g class="{cover}"><rect x="{num(fx - 2)}" y="{CY0 + LH - 17}" width="60" height="{LH - 2}" fill="{PANEL}"/></g>')
    for k, ln in enumerate(code):
        y = CY0 + k * LH
        if k == 1:
            cv.text(CX0, y, colorize("    maxval ← "), size=13.5, fill=INK, mono=True, raw=True)
            cv.text(fx, y, "0", size=13.5, fill=EMBER2, mono=True, cls=cv.show(0, 8.4, fade=0.2))
        else:
            cv.text(CX0, y, colorize(ln), size=13.5, fill=INK, mono=True, raw=True)
        dur = 0.05 + len(ln.strip()) * 0.028
        span = len(ln) * CHW + 18
        ind = (len(ln) - len(ln.lstrip())) * CHW - 4
        cover = cv.track({"transform": tr(ind), "opacity": 1}, [(t, {"transform": tr(span)}, dur), (t + dur + 0.3, {"opacity": 0}, 0.05)])
        caret = cv.track({"opacity": 0}, [(t, {"opacity": 1}, 0.05), (t + dur + 0.25, {"opacity": 0}, 0.05)])
        cv.add(f'<g class="{cover}"><rect x="{CX0}" y="{y - 18}" width="{EW}" height="{LH}" fill="{PANEL}"/>'
               f'<rect x="{CX0 + 2}" y="{y - 14}" width="2" height="18" fill="{EMBER}" class="{caret}"/></g>')
        t += dur + 0.12
    t_typed = t
    cv.close_g()
    assert t_typed < t_sub1, t_typed
    # ---- results panel ------------------------------------------------------------------
    RX, RY, RW, RH = 520, 76, 356, 262
    cv.rect(RX, RY, RW, RH, fill=PANEL, rx=12, stroke=LINE)
    cv.text(RX + 18, RY + 28, "RESULTS", size=10.5, fill=EMBER, weight=700, letter_spacing="1.2")
    g = cv.show(0, t_sub1, fade=0.2)
    cv.open_g(cls=g)
    cv.text(RX + RW / 2, RY + 130, "Submit to run the hidden tests", size=13, fill=MUTED, anchor="middle")
    cv.text(RX + RW / 2, RY + 152, "and count your basic operations", size=13, fill=MUTED, anchor="middle")
    cv.close_g()
    for ts in (t_sub1, t_sub2):
        g = cv.show(ts + 0.1, ts + 0.6, fade=0.12)
        cv.text(RX + RW / 2, RY + 140, "⏳ running tests…", size=14, fill=INK2, anchor="middle", cls=g)
    # wrong answer
    g = cv.show(t_sub1 + 0.7, t_sub2 - 0.1, fade=0.2)
    cv.open_g(cls=g)
    cv.text(RX + 18, RY + 62, "❌", size=20, cls="e")
    cv.text(RX + 50, RY + 60, "Wrong Answer", size=19, fill=SWAP, weight=800)
    cv.text(RX + 50, RY + 80, "2 / 3 tests pass", size=12.5, fill=INK2)
    cv.close_g()
    tests = [("✓", "[3, 9, 2, 7]", "9", None), ("✓", "[5]", "5", None), ("✗", "[-4, -2, -9]", "-2", "0")]
    for k, (mark, inp, exp, got) in enumerate(tests):
        y = RY + 110 + k * 24
        g = cv.show(t_sub1 + 0.85 + 0.2 * k, t_sub2 - 0.1, fade=0.2)
        cv.open_g(cls=g)
        cv.text(RX + 22, y, mark, size=14, fill=DONE if not got else SWAP, weight=800)
        cv.text(RX + 42, y, f"A = {inp}", size=12, fill=INK, mono=True)
        cv.text(RX + RW - 18, y, f"→ {exp}" if not got else f"expected {exp}, got {got}", size=12, fill=INK2 if not got else SWAP,
                anchor="end", mono=True)
        cv.close_g()
    g = cv.show(6.6, t_sub2 - 0.1, fade=0.3)
    cv.open_g(cls=g)
    cv.rect(RX + 14, RY + 176, RW - 28, 70, fill=COMPARE, fill_opacity=".1", rx=9, stroke=COMPARE, stroke_opacity=".5")
    cv.text(RX + 28, RY + 200, "💡", size=15, cls="e")
    cv.text(RX + 52, RY + 199, "Nudge", size=13, fill=COMPARE, weight=800)
    cv.text(RX + 28, RY + 221, "Start maxval at A[0], not 0 — what if", size=12.5, fill=INK)
    cv.text(RX + 28, RY + 238, "every number is negative?", size=12.5, fill=INK)
    cv.close_g()
    # accepted
    t_acc = t_sub2 + 0.7
    g = cv.show(t_acc, fade_out, fade=0.25)
    cv.open_g(cls=g)
    cv.text(RX + 18, RY + 62, "✅", size=20, cls="e")
    cv.text(RX + 50, RY + 60, "Accepted", size=19, fill=DONE, weight=800)
    cv.text(RX + 50, RY + 80, "3 / 3 tests pass · efficiency Θ(n) ✓", size=12.5, fill=INK2)
    cv.close_g()
    # growth chart
    GX, GY, GW, GH = RX + 50, RY + 104, 280, 118
    g = cv.show(t_acc + 0.3, fade_out, fade=0.25)
    cv.open_g(cls=g)
    cv.add(f'<path d="M{GX},{GY}V{GY + GH}H{GX + GW}" fill="none" stroke="{LINE2}" stroke-width="1.5"/>')
    cv.text(GX - 8, GY + 8, "ops", size=10.5, fill=MUTED, anchor="end")
    cv.text(GX + GW, GY + GH + 16, "input size n", size=10.5, fill=MUTED, anchor="end")
    cv.text(GX + 8, GY + GH + 16, "0", size=10.5, fill=MUTED, mono=True)
    cv.add(f'<path d="M{GX},{GY + GH}L{GX + GW},{GY + 6}" stroke="{STEEL}" stroke-width="1.5" stroke-dasharray="5 5" opacity=".7"/>')
    cv.text(GX + GW - 4, GY + 2, "target Θ(n)", size=11, fill=STEEL, anchor="end")
    cv.close_g()
    ns = [100, 200, 300, 400, 500, 600, 700, 800]
    for k, nv in enumerate(ns):
        x = GX + nv / 800 * (GW - 10)
        y = GY + GH - nv / 800 * (GH - 14)
        g = cv.show(t_acc + 0.5 + 0.13 * k, fade_out, fade=0.15)
        cv.add(f'<circle cx="{num(x)}" cy="{num(y)}" r="4.5" fill="{EMBER}" stroke="{BG}" stroke-width="1.5" class="{g}"/>')
    g = cv.show(t_acc + 1.6, fade_out, fade=0.25)
    cv.text(GX + 12, GY + 26, "your comparisons: exactly n", size=11.5, fill=EMBER2, weight=700, cls=g)
    cv.text(GX + 12, GY + 42, "twist: start i at 1 → n − 1", size=11, fill=MUTED, cls=g)
    cv.close_g()
    # ---- stepper ---------------------------------------------------------------------------
    steps = [("✍️", "Write", 0.0, t_sub1), ("🚀", "Submit", t_sub1, t_sub1 + 0.7), ("💡", "Nudge", t_sub1 + 0.7, 7.9),
             ("🔧", "Fix", 7.9, t_sub2), ("✅", "Accepted", t_sub2, T)]
    SX, SY, SW = 24, 358, 852
    cv.rect(SX, SY, SW, 88, fill=PANEL, rx=12, stroke=LINE)
    pitch = SW / len(steps)
    for k, (em, lab, a, b) in enumerate(steps):
        cx = SX + pitch * k + pitch / 2
        if k:
            cv.text(SX + pitch * k, SY + 50, "→", size=16, fill=LINE2, anchor="middle")
        lit = cv.track({"opacity": 1 if a <= 0 else 0},
                       ([] if a <= 0 else [(a, {"opacity": 1}, 0.2)]) + ([(b, {"opacity": 0}, 0.2)] if b < T else [(fade_out, {"opacity": 0}, 0.4)]))
        cv.rect(cx - 70, SY + 12, 140, 64, fill=EMBER, fill_opacity=".12", rx=10, stroke=EMBER, stroke_opacity=".6", cls=lit)
        cv.text(cx, SY + 40, em, size=18, anchor="middle", cls="e")
        cv.text(cx, SY + 64, f"{k + 1} · {lab}", size=13, fill=INK, weight=700, anchor="middle")
    return cv


VISUALS = {"hero": hero, "learning_loop": learning_loop, "levels": levels, "binary_search": binary_search, "growth": growth,
           "recursion_tree": recursion_tree, "dp_table": dp_table, "graph_bfs": graph_bfs, "arena_flow": arena_flow}


def main(argv):
    os.makedirs(OUT, exist_ok=True)
    picks = [a for a in argv if not a.startswith("-")]
    for name, fn in VISUALS.items():
        if picks and not any(p in name for p in picks):
            continue
        cv = fn()
        data = cv.render()
        path = os.path.join(OUT, name.replace("_", "-") + ".svg")
        with open(path, "w", encoding="utf-8", newline="\n") as f:
            f.write(data)
        print(f"wrote {os.path.relpath(path, ROOT)}  {len(data.encode()) / 1024:.1f} KB  cycle {cv.T:g}s")


if __name__ == "__main__":
    main(sys.argv[1:])
