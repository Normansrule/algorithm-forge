#!/usr/bin/env python3
"""Build docs/cheatsheet.html from the Markdown cheat sheets in cheatsheets/.

The Markdown files are the source of truth (they render on GitHub with LaTeX math and mermaid);
this script turns them into one static, printable web page whose math is plain Unicode/HTML.

    python3 tools/build_cheatsheet.py
"""
import html
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
import forge_md  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
REPO = "https://github.com/Normansrule/algorithm-forge/blob/main/"

SECTIONS = [
    ("asymptotics", "asymptotics.md", "Asymptotics", "📈"),
    ("sums", "summations-and-recurrences.md", "Sums & Recurrences", "∑"),
    ("strategies", "design-strategies.md", "Design Strategies", "🧭"),
    ("complexity", "complexity-table.md", "Complexity Table", "⏱️"),
    ("pseudocode", "pseudocode-reference.md", "Pseudocode", "✍️"),
]
MD_TO_ANCHOR = {f: "#" + sid for sid, f, _, _ in SECTIONS}

forge_md.LINK_REWRITE[:] = [
    (r"^\.\./", REPO),
    (r"^([\w-]+\.md)$", lambda m: MD_TO_ANCHOR.get(m.group(1), REPO + "cheatsheets/" + m.group(1))),
]

KW = re.compile(r"\b(ALGORITHM|for|to|downto|do|while|if|then|else|return|and|or|not|repeat|until|each|in|swap|step|break|continue|div|mod|print|new|copy|true|false|null)\b")


def color_code(src):
    rows = []
    for line in src.split("\n"):
        esc = html.escape(line, quote=False)
        ci = esc.find("//")
        body, cm = (esc[:ci], f'<span class="cm">{esc[ci:]}</span>') if ci >= 0 else (esc, "")
        # keep string literals untouched
        parts = re.split(r'("[^"]*"|\'[^\']*\')', body)
        out = []
        for k, p in enumerate(parts):
            if k % 2:
                out.append(f'<span class="st">{p}</span>')
            else:
                p = KW.sub(r'<span class="kw">\1</span>', p)
                p = re.sub(r"(?<![\w.])(\d+)(?![\w])", r'<span class="nm">\1</span>', p)
                out.append(p)
        rows.append(f'<span class="ln">{"".join(out) + cm or " "}</span>')
    return '<div class="code sheet-code">' + "".join(rows) + "</div>"


def strategy_flow(_src):
    """HTML version of the mermaid decision flowchart in design-strategies.md."""
    a = lambda t: "#strategies-" + forge_md.slug(t)
    steps = [
        ("Is the brute force fast enough for the real n?", [("Ship it — keep the brute force as a test", a("Brute force — check every pair"), "ok")]),
        ("Are you building an optimal answer piece by piece, and is one local choice provably safe?", [("Greedy", a("Greedy — activity selection"), "")]),
        ("Does <b>one</b> smaller instance of the same problem give the answer (shrink by 1, by half, or by a varying amount)?", [("Decrease-and-conquer", a("Decrease-and-conquer — by one (insertion sort)"), "")]),
        ("Does it split into <b>several</b> smaller instances of the same problem?", [("independent parts → Divide-and-conquer", a("Divide-and-conquer — mergesort"), ""), ("overlapping parts → Dynamic programming", a("Dynamic programming — coin-row"), "")]),
        ("Would another form make it easy — sorted, a heap, a balanced tree, a different problem?", [("Transform-and-conquer", a("Transform-and-conquer — presort, then scan"), "")]),
        ("Many queries, or a small key range — can memory buy time?", [("Space-time trade-off", a("Space-time trade-off — distribution counting"), "")]),
        ("Optimization with a feasible start and a move that improves it?", [("Iterative improvement", a("Iterative improvement — augmenting paths (bipartite matching)"), "")]),
    ]
    h = ['<div class="flow" role="list" aria-label="Which strategy fits my problem?">',
         '<div class="flow-start" role="listitem"><b>Start:</b> describe the input, the output and how big n really is — then '
         f'<a href="{a("Brute force — check every pair")}">write the brute force first</a> (your baseline and test oracle).</div>']
    for k, (q, outs) in enumerate(steps, 1):
        chips = "".join(f'<a class="flow-yes {cls}" href="{href}">{html.escape(t)}</a>' for t, href, cls in outs)
        h.append(f'<div class="flow-no" aria-hidden="true">no ↓</div>' if k > 1 else '<div class="flow-no" aria-hidden="true">↓</div>')
        h.append(f'<div class="flow-q" role="listitem"><span class="flow-n">{k}</span><span class="flow-text">{q}</span>'
                 f'<span class="flow-arrow">yes →</span><span class="flow-outs">{chips}</span></div>')
    h.append('<div class="flow-no" aria-hidden="true">no ↓</div>')
    h.append(f'<div class="flow-end" role="listitem"><b>Probably NP-hard.</b> Exact: <a href="{a("Backtracking — n-queens")}">backtracking</a>, '
             f'<a href="{a("Branch-and-bound — knapsack with an optimistic bound")}">branch-and-bound</a>. Fast: approximation algorithms with a proven ratio.</div>')
    h.append("</div>")
    return "\n".join(h)


def section_html(sid, fname, title, icon):
    md = open(os.path.join(ROOT, "cheatsheets", fname), encoding="utf-8").read()
    md = re.sub(r"^# .*\n", "", md, count=1)                         # page title → our section title
    md = re.sub(r"^>.*(Live, (printable|filterable) version).*\n", "", md, flags=re.M)
    md = re.sub(r"\n---\n⬅️.*$", "\n", md, flags=re.S)                # footer nav
    md = re.sub(r"^(#{2,4}) ", lambda m: "#" * (len(m.group(1)) + 0) + " ", md, flags=re.M)
    body = forge_md.render(md, id_prefix=sid + "-", hooks={"mermaid": strategy_flow, "": color_code})
    body = re.sub(r"<!--.*?-->", "", body, flags=re.S)
    extra = ""
    if sid == "complexity":
        extra = ('<div class="filterbar no-print" style="margin:6px 0 14px"><input type="search" id="cx-filter" '
                 'placeholder="Filter the table — e.g. heap, graph, n log n, stable" aria-label="Filter the complexity table">'
                 '<span class="muted small" id="cx-count"></span></div>')
    return f'''
  <section class="sheet" id="{sid}">
    <div class="sheet-head">
      <div><div class="eyebrow">{icon} Cheat sheet {SECTIONS.index((sid, fname, title, icon)) + 1} of {len(SECTIONS)}</div><h2>{html.escape(title)}</h2></div>
      <a class="small no-print" href="{REPO}cheatsheets/{fname}" target="_blank" rel="noopener">View as Markdown on GitHub ↗</a>
    </div>
    {extra}
    <div class="sheet-body">
{body}
    </div>
  </section>'''


PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cheat Sheet · Algorithm Forge</title>
<meta name="description" content="Printable algorithm cheat sheets: asymptotic notation, sums and recurrences, the Master Theorem, design strategies, a complexity table, and the Forge Pseudocode reference.">
<link rel="stylesheet" href="assets/css/forge.css">
<link rel="stylesheet" href="assets/css/forge-hub.css">
<script src="assets/js/forge-kit.js"></script>
<style>
  /* GENERATED by tools/build_cheatsheet.py from cheatsheets/*.md — edit the Markdown, then rebuild. */
  .sheet-nav { position: sticky; top: 57px; z-index: 6; background: color-mix(in srgb, var(--bg) 92%%, transparent); backdrop-filter: blur(8px); border-bottom: 1px solid var(--line); padding: 8px 0; margin-top: 10px; display: flex; gap: 6px; overflow-x: auto; }
  .sheet-nav a { flex: none; padding: 6px 12px; border-radius: 999px; border: 1px solid var(--line); background: var(--panel); color: var(--ink-2); font-weight: 700; font-size: .84rem; }
  .sheet-nav a:hover, .sheet-nav a.on { border-color: var(--ember); color: var(--ink); text-decoration: none; }
  .sheet { margin-top: 36px; scroll-margin-top: 120px; }
  .sheet-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; flex-wrap: wrap; border-bottom: 2px solid var(--ember); padding-bottom: 8px; margin-bottom: 14px; }
  .sheet-head h2 { margin: 2px 0 0; font-size: 1.6rem; }
  .sheet-body { max-width: 1100px; }
  .sheet-body h2 { font-size: 1.25rem; margin: 28px 0 10px; padding-top: 4px; scroll-margin-top: 120px; }
  .sheet-body h3 { font-size: 1.05rem; margin: 22px 0 8px; color: var(--ink); scroll-margin-top: 120px; }
  .sheet-body h4 { font-size: .95rem; margin: 18px 0 6px; color: var(--ember-2); scroll-margin-top: 120px; }
  .sheet-body p, .sheet-body li { color: var(--ink-2); }
  .sheet-body b { color: var(--ink); }
  .sheet-body ul, .sheet-body ol { padding-left: 22px; }
  .sheet-body li + li { margin-top: 4px; }
  .sheet-body hr { margin: 22px 0; }
  .sheet-body blockquote { margin: 0 0 14px; }
  .sheet-body blockquote p { margin: 0; color: var(--ink); }
  .math { font-family: var(--font); font-size: 1em; white-space: nowrap; color: var(--ink); }
  .math sup, .math sub { font-size: .72em; }
  .math.display { display: block; white-space: normal; text-align: center; font-size: 1.15em; margin: 12px 0; padding: 12px 14px; background: var(--bg-2); border: 1px solid var(--line); border-radius: 10px; overflow-x: auto; line-height: 1.9; }
  td .math, li .math, p .math { white-space: normal; }
  .table-wrap { overflow-x: auto; margin: 10px 0 16px; border: 1px solid var(--line); border-radius: 10px; }
  table.md { border-collapse: collapse; width: 100%%; font-size: .86rem; }
  table.md th, table.md td { padding: 7px 10px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
  table.md th { background: var(--panel-2); color: var(--ink-2); font-weight: 700; font-size: .8rem; position: sticky; top: 0; }
  table.md tr:last-child td { border-bottom: 0; }
  table.md tbody tr:hover td { background: var(--panel); }
  #complexity table.md td:first-child { font-weight: 700; color: var(--ink); min-width: 170px; }
  #complexity table.md td:nth-child(2) { font-family: var(--mono); color: var(--muted); }
  #complexity table.md td:nth-child(n+3):nth-child(-n+6) { font-family: var(--mono); font-size: .8rem; white-space: nowrap; }
  #complexity table.md td:last-child { min-width: 260px; }
  .sheet-code { margin: 8px 0 6px; max-width: 760px; }
  .sheet-code .st { color: var(--c-done); }
  pre.code-block { background: var(--bg-2); border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; overflow-x: auto; }
  /* decision flow */
  .flow { display: flex; flex-direction: column; align-items: stretch; gap: 0; margin: 10px 0 18px; max-width: 980px; }
  .flow-start, .flow-end { background: var(--steel-soft); border: 1px solid color-mix(in srgb, var(--steel) 40%%, transparent); border-radius: 12px; padding: 10px 14px; color: var(--ink); }
  .flow-end { background: color-mix(in srgb, var(--c-swap) 10%%, transparent); border-color: color-mix(in srgb, var(--c-swap) 40%%, transparent); }
  .flow-no { font-family: var(--mono); font-size: .75rem; color: var(--muted); padding: 3px 0 3px 22px; }
  .flow-q { display: grid; grid-template-columns: 28px minmax(0, 1fr) auto minmax(0, 300px); gap: 10px; align-items: center; background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; }
  .flow-n { width: 24px; height: 24px; border-radius: 50%%; background: var(--c-compare); color: #1b1300; font-weight: 800; font-size: .8rem; display: grid; place-items: center; }
  .flow-text { color: var(--ink); font-weight: 600; font-size: .92rem; }
  .flow-arrow { font-family: var(--mono); font-size: .78rem; color: var(--c-done); font-weight: 700; }
  .flow-outs { display: flex; flex-direction: column; gap: 5px; }
  .flow-yes { display: block; background: color-mix(in srgb, var(--c-done) 14%%, transparent); border: 1px solid color-mix(in srgb, var(--c-done) 45%%, transparent); color: var(--ink); border-radius: 8px; padding: 5px 10px; font-weight: 700; font-size: .86rem; }
  .flow-yes:hover { border-color: var(--c-done); text-decoration: none; }
  @media (max-width: 760px) {
    .flow-q { grid-template-columns: 28px minmax(0, 1fr); }
    .flow-arrow, .flow-outs { grid-column: 2; }
    .sheet-nav { top: 53px; }
  }
  @media print {
    @page { margin: 14mm; }
    :root, :root[data-theme] { --bg: #fff; --bg-2: #f6f7f9; --panel: #fff; --panel-2: #eef0f4; --line: #cfd5e0; --line-2: #b9c1cf; --ink: #000; --ink-2: #222; --muted: #555; --ember: #b8510f; --ember-2: #8a3a08; --steel: #1f5fb0; --c-done: #0b7a50; }
    body { font-size: 10.5pt; }
    .sheet-nav, .hero .cta, .no-print { display: none !important; }
    .sheet { break-before: page; margin-top: 0; }
    .sheet:first-of-type { break-before: auto; }
    .table-wrap { overflow: visible; border: 0; }
    table.md { font-size: 8.5pt; }
    table.md th { position: static; }
    tr, .code, .math.display, .flow-q { break-inside: avoid; }
    .code .ln.hl { background: none; }
    a { color: inherit; }
  }
</style>
</head>
<body>
<main class="wrap">
  <header class="hero">
    <div class="eyebrow">Cheat Sheet</div>
    <h1>All of algorithms on a few pages</h1>
    <p class="lead">Five cheat sheets you can keep open while you study, or print for review: asymptotic notation,
      sums and recurrences, the design strategies with runnable templates, the complexity of every algorithm on this site,
      and the Forge Pseudocode language reference.</p>
    <p class="small muted" style="max-width:900px">Acronyms used on this page: Traveling Salesman Problem (TSP), Dynamic Programming (DP),
      Greatest Common Divisor (GCD), Depth-First Search (DFS), Breadth-First Search (BFS), Minimum Spanning Tree (MST),
      Binary Search Tree (BST), Adelson-Velsky–Landis tree (AVL), Longest Common Subsequence (LCS), Knuth–Morris–Pratt (KMP),
      Directed Acyclic Graph (DAG), Strongly Connected Components (SCC), Longest Increasing Subsequence (LIS),
      Least Recently Used (LRU), Least Common Multiple (LCM), Boolean satisfiability (SAT), First-Fit Decreasing (FFD),
      input/output (I/O), deterministic Polynomial time (P), Nondeterministic Polynomial time (NP).</p>
    <div class="cta row">
      <button class="btn primary" type="button" onclick="window.print()">🖨️ Print or save</button>
      <a class="btn" href="%(repo)scheatsheets" target="_blank" rel="noopener">Markdown versions on GitHub ↗</a>
      <a class="btn" href="quiz.html">🧠 Test yourself</a>
    </div>
  </header>
  <nav class="sheet-nav" aria-label="Cheat sheets">%(nav)s</nav>
%(sections)s
</main>
<script>
Forge.page({ title: "Cheat Sheet" });
(function () {
  // highlight the section in view
  const links = [...document.querySelectorAll(".sheet-nav a")];
  const secs = links.map((a) => document.querySelector(a.getAttribute("href")));
  function spy() {
    let k = 0;
    secs.forEach((s, i) => { if (s && s.getBoundingClientRect().top < 160) k = i; });
    links.forEach((a, i) => a.classList.toggle("on", i === k));
  }
  addEventListener("scroll", spy, { passive: true }); spy();
  // filter the complexity tables
  const f = document.getElementById("cx-filter"), count = document.getElementById("cx-count");
  const rows = [...document.querySelectorAll("#complexity table.md tbody tr")];
  function filter() {
    const terms = f.value.toLowerCase().split(/\\s+/).filter(Boolean);
    let shown = 0;
    rows.forEach((r) => { const ok = terms.every((t) => r.textContent.toLowerCase().includes(t)); r.hidden = !ok; if (ok) shown++; });
    document.querySelectorAll("#complexity .table-wrap").forEach((w) => {
      const any = [...w.querySelectorAll("tbody tr")].some((r) => !r.hidden);
      w.hidden = !any;
      const h = w.previousElementSibling; if (h && /^H[23]$/.test(h.tagName)) h.hidden = !any;
    });
    count.textContent = terms.length ? `${shown} of ${rows.length} algorithms` : `${rows.length} algorithms`;
  }
  if (f) { f.addEventListener("input", filter); filter(); }
})();
</script>
</body>
</html>
"""


def main():
    nav = "".join(f'<a href="#{sid}">{icon} {html.escape(title)}</a>' for sid, _, title, icon in SECTIONS)
    sections = "".join(section_html(*s) for s in SECTIONS)
    out = PAGE % {"nav": nav, "sections": sections, "repo": "https://github.com/Normansrule/algorithm-forge/tree/main/"}
    path = os.path.join(ROOT, "docs", "cheatsheet.html")
    open(path, "w", encoding="utf-8").write(out)
    print("wrote", os.path.relpath(path, ROOT), f"({len(out) // 1024} KB)")


if __name__ == "__main__":
    main()
