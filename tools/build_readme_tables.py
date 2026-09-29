#!/usr/bin/env python3
"""Regenerates the generated sections of README.md (between <!-- NAME:START --> / <!-- NAME:END --> markers):
  COURSE-MAP  one row per chapter: lesson · what you'll build · simulations · Arena problems · textbook
  STARTERS    the first problem of every level, with direct links
Data comes from docs/assets/js/forge-hub.js (chapter metadata), docs/sims/*.html (<title>), and the problem bank
(via tools/bank_summary.mjs). Usage: python3 tools/build_readme_tables.py
"""
import json, os, re, subprocess, html

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SITE = "https://normansrule.github.io/algorithm-forge/"
BOOK = {1: "Ch 1", 2: "Ch 2", 3: "Ch 3", 4: "Ch 4", 5: "Ch 5", 6: "Ch 6", 7: "Ch 7", 8: "Ch 8", 9: "Ch 9",
        10: "Ch 10", 11: "Ch 11", 12: "Ch 12"}

def hub_chapters():
    js = open(os.path.join(ROOT, "docs/assets/js/forge-hub.js"), encoding="utf8").read()
    node = "const Hub={};(function(){%s}).call({});" % ""  # placeholder (we evaluate with node below)
    code = ("global.window=global;global.self=global;global.document={addEventListener(){}};"
            "const fs=require('fs');eval(fs.readFileSync('docs/assets/js/forge-hub.js','utf8'));"
            "const H=global.ForgeHub||global.Hub||Object.values(global).find(v=>v&&v.CHAPTERS);"
            "process.stdout.write(JSON.stringify(H.CHAPTERS));")
    out = subprocess.run(["node", "-e", code], cwd=ROOT, capture_output=True, text=True)
    if out.returncode:
        raise SystemExit(out.stderr)
    return json.loads(out.stdout)

def sim_title(name):
    p = os.path.join(ROOT, "docs/sims", name + ".html")
    t = re.search(r"<title>(.*?)</title>", open(p, encoding="utf8").read(), re.S).group(1)
    return html.unescape(t.split("·")[0].strip())

def bank():
    out = subprocess.run(["node", "tools/bank_summary.mjs"], cwd=ROOT, capture_output=True, text=True, check=True)
    return json.loads(out.stdout)

def replace(md, name, body):
    pat = re.compile(r"(<!-- %s:START -->)(.*?)(<!-- %s:END -->)" % (name, name), re.S)
    assert pat.search(md), name
    return pat.sub(lambda m: m.group(1) + "\n" + body.rstrip() + "\n" + m.group(3), md)

def main():
    chapters = hub_chapters()
    b = bank()
    probs = b["problems"]
    count = {}
    for p in probs:
        count[p["chapter"]] = count.get(p["chapter"], 0) + 1
    rows = ["| # | Lesson | What you'll build | Simulations | Arena | Levitin |", "|---|---|---|---|---|---|"]
    for c in chapters:
        n = c["n"]
        lesson = f"[{c['title']}](lessons/{c['folder']}/README.md)"
        sims = []
        seen = set()
        for s in c.get("sims", []):
            name = s[0]
            if name in seen or not os.path.exists(os.path.join(ROOT, "docs/sims", name + ".html")):
                continue
            seen.add(name)
            sims.append(f"[{sim_title(name)}]({SITE}sims/{name}.html)")
        arena = f"[{count.get(n, 0)} problems]({SITE}arena/?chapter={n})" if count.get(n) else "—"
        book = BOOK.get(n, "Beyond" if n >= 13 else "—")
        tag = " 🚀" if c.get("beyond") else ""
        rows.append(f"| {n} | {lesson}{tag} | {c['hook']} | {' · '.join(sims) or '—'} | {arena} | {book} |")
    md = open(os.path.join(ROOT, "README.md"), encoding="utf8").read()
    md = replace(md, "COURSE-MAP", "\n".join(rows) + "\n\n🚀 = Beyond the textbook (senior-engineer level).")

    lv = ["| Level | Name | Problems | Try this first |", "|---|---|---|---|"]
    for L in b["levels"]:
        ps = [p for p in probs if p["level"] == L["n"]]
        first = ps[0]
        lv.append(f"| {L['n']} | **{L['name']}** — {L['blurb']} | [{len(ps)}]({SITE}arena/?level={L['n']}) | "
                  f"[{first['title']}]({SITE}arena/problem.html?id={first['id']}) |")
    md = replace(md, "STARTERS", "\n".join(lv))
    open(os.path.join(ROOT, "README.md"), "w", encoding="utf8").write(md)
    print(f"README tables: {len(chapters)} chapters, {len(probs)} problems")

if __name__ == "__main__":
    main()
