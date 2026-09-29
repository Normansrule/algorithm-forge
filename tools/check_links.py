#!/usr/bin/env python3
"""Link checker for Algorithm Forge.

Scans
  * every Markdown file in the repo (skipping .git, node_modules, caches), outside fenced code blocks
    and inline code spans;
  * every .html and .js file under docs/ (href/src attributes and `href: "..."` object keys);
  * the `lesson` and `visual` fields of the Arena problem packs (docs/arena/problems/*.js);
  * the simulation ids in the hub chapter table (docs/assets/js/forge-hub.js).

It verifies
  * relative links (Markdown: resolved against the file inside the repo; docs/: resolved inside docs/,
    because docs/ is the GitHub Pages site root and nothing outside it is published);
  * https://normansrule.github.io/algorithm-forge/<path>  -> docs/<path>;
  * https://github.com/Normansrule/algorithm-forge/(blob|tree)/main/<path> -> repo file/folder;
  * arena/problem.html?id=<id>   -> the id must exist in the problem bank;
  * arena/(index.html)?chapter=N -> N in 1..17, ?level=N -> N in 0..6;
  * #anchors into Markdown files (GitHub heading-slug rules, plus explicit <a id/name>);
  * #anchors into docs/ HTML pages (loosely: the id must appear in the page or its scripts).

Usage:  python3 tools/check_links.py [-v]
Exit status 1 if any broken link is found.
"""
import os, re, sys, glob, unicodedata, urllib.parse
from collections import defaultdict

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DOCS = os.path.join(ROOT, "docs")
SITE = "https://normansrule.github.io/algorithm-forge/"
REPO_RE = re.compile(r"^https?://github\.com/Normansrule/algorithm-forge/(?:blob|tree|raw)/main/?(.*)$", re.I)
SKIP_DIRS = {".git", "node_modules", ".pytest_cache", "__pycache__", ".venv", "venv"}

# ------------------------------------------------------------------ problem bank
def load_problem_ids():
    ids = set()
    for f in glob.glob(os.path.join(DOCS, "arena", "problems", "*.js")):
        ids.update(re.findall(r'\bid:\s*"([a-z0-9-]+)"', open(f, encoding="utf-8").read()))
    return ids

PROBLEM_IDS = load_problem_ids()

# ------------------------------------------------------------------ markdown anchors
def gh_slug(text):
    """GitHub heading slug: strip markup, lowercase, drop punctuation/emoji, spaces -> '-'."""
    t = re.sub(r"!\[([^\]]*)\]\([^)]*\)", r"\1", text)          # images
    t = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", t)              # links
    t = re.sub(r"<[^>]+>", "", t)                               # html tags
    t = t.replace("`", "")
    t = t.strip().lower()
    out = []
    for ch in t:
        cat = unicodedata.category(ch)
        if ch in " -_" or cat[0] in "LN" or cat == "Mn":
            out.append("-" if ch == " " else ch)
    return "".join(out)

FENCE_RE = re.compile(r"^\s{0,3}(```|~~~)")

def md_strip_code(text):
    """Return list of (lineno, line) outside fenced code blocks, with inline code spans blanked."""
    lines, fence = [], None
    for i, line in enumerate(text.split("\n"), 1):
        m = FENCE_RE.match(line)
        if m:
            if fence is None:
                fence = m.group(1)
            elif m.group(1) == fence:
                fence = None
            continue
        if fence is None:
            line = re.sub(r"(`+)(.+?)\1", lambda mm: " " * len(mm.group(0)), line)
            lines.append((i, line))
    return lines

_anchor_cache = {}
def md_anchors(path):
    if path in _anchor_cache:
        return _anchor_cache[path]
    text = open(path, encoding="utf-8").read()
    anchors, seen = set(), defaultdict(int)
    for _, line in md_strip_code(text):
        m = re.match(r"^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$", line)
        if m:
            s = gh_slug(m.group(2))
            n = seen[s]; seen[s] += 1
            anchors.add(s if n == 0 else f"{s}-{n}")
        for a in re.findall(r"<a\s+[^>]*(?:id|name)\s*=\s*[\"']([^\"']+)[\"']", line):
            anchors.add(a)
    # raw text too (inline code was blanked, but explicit ids inside html blocks are fine)
    for a in re.findall(r"\b(?:id|name)\s*=\s*[\"']([^\"']+)[\"']", text):
        anchors.add(a)
    _anchor_cache[path] = anchors
    return anchors

def html_has_anchor(path, frag):
    """Loose: the id appears in the page source or one of its local scripts."""
    text = open(path, encoding="utf-8").read()
    if frag in text:
        return True
    for src in re.findall(r'<script[^>]+src="([^"]+)"', text):
        p = os.path.normpath(os.path.join(os.path.dirname(path), src.split("?")[0]))
        if os.path.isfile(p) and frag in open(p, encoding="utf-8").read():
            return True
    return False

# ------------------------------------------------------------------ checking one link
def is_dynamic(url):
    return any(tok in url for tok in ("${", "' +", '" +', "+ '", '+ "', "{{", "`")) or url.endswith(("=", "/#"))

def check_query(docs_path, query):
    """docs_path is a docs-relative path (posix). Returns error string or None."""
    q = urllib.parse.parse_qs(query)
    if docs_path == "arena/problem.html":
        pid = (q.get("id") or [""])[0]
        if not pid:
            return "problem.html without ?id="
        if pid not in PROBLEM_IDS:
            return f"unknown Arena problem id '{pid}'"
    if docs_path in ("arena/index.html", "arena/"):
        if "chapter" in q:
            try:
                n = int(q["chapter"][0])
            except ValueError:
                return f"bad chapter '{q['chapter'][0]}'"
            if not 1 <= n <= 17:
                return f"chapter {n} out of range 1..17"
        if "level" in q:
            try:
                n = int(q["level"][0])
            except ValueError:
                return f"bad level '{q['level'][0]}'"
            if not 0 <= n <= 6:
                return f"level {n} out of range 0..6"
    return None

def check_docs_target(rel, query, frag):
    """rel: path relative to docs/ (posix, may be '' or end with '/')."""
    rel = urllib.parse.unquote(rel)
    full = os.path.normpath(os.path.join(DOCS, rel))
    if not (full == DOCS or full.startswith(DOCS + os.sep)):
        return f"points outside docs/ (not published on GitHub Pages): {rel}"
    if os.path.isdir(full):
        full = os.path.join(full, "index.html")
    if not os.path.isfile(full):
        return f"missing docs file: {os.path.relpath(full, DOCS)}"
    norm = os.path.relpath(full, DOCS).replace(os.sep, "/")
    err = check_query(norm, query)
    if err:
        return err
    if frag and full.endswith(".html") and not html_has_anchor(full, frag):
        return f"anchor #{frag} not found in {norm}"
    if frag and full.endswith(".md") and frag not in md_anchors(full):
        return f"anchor #{frag} not found in {norm}"
    return None

def check_repo_target(rel, frag):
    rel = urllib.parse.unquote(rel)
    full = os.path.normpath(os.path.join(ROOT, rel))
    if not (full == ROOT or full.startswith(ROOT + os.sep)):
        return f"points outside the repo: {rel}"
    if not os.path.exists(full):
        return f"missing repo path: {os.path.relpath(full, ROOT)}"
    if frag and full.endswith(".md") and frag not in md_anchors(full):
        return f"anchor #{frag} not found in {os.path.relpath(full, ROOT)}"
    if frag and os.path.isdir(full):
        readme = os.path.join(full, "README.md")
        if os.path.isfile(readme) and frag not in md_anchors(readme):
            return f"anchor #{frag} not found in {os.path.relpath(readme, ROOT)}"
    return None

def check_url(url, src_file, mode):
    """mode 'md' (repo-relative) or 'docs:<basedir>' (docs-relative). Returns error or None."""
    url = url.strip().strip("<>")
    if not url or is_dynamic(url):
        return None
    low = url.lower()
    if low.startswith(("mailto:", "javascript:", "data:", "tel:", "blob:")):
        return None
    parsed = urllib.parse.urlsplit(url)
    frag, query = parsed.fragment, parsed.query
    if low.startswith(SITE.lower()) or low.rstrip("/") == SITE.lower().rstrip("/"):
        rel = url[len(SITE):] if len(url) >= len(SITE) else ""
        rel = urllib.parse.urlsplit(rel).path
        return check_docs_target(rel, query, frag)
    m = REPO_RE.match(url)
    if m:
        rel = urllib.parse.urlsplit(m.group(1)).path
        return check_repo_target(rel, frag)
    if parsed.scheme or url.startswith("//"):
        return None  # other external site: not checked
    path = parsed.path
    if mode == "md":
        base = os.path.dirname(src_file)
        if not path:  # same-file anchor
            if frag and src_file.endswith(".md") and frag not in md_anchors(src_file):
                return f"anchor #{frag} not found in this file"
            return None
        full = os.path.normpath(os.path.join(base, urllib.parse.unquote(path)))
        rel = os.path.relpath(full, ROOT)
        if full.startswith(DOCS + os.sep) and full.endswith(".html"):
            # a repo-relative link into docs/: check the page and its query too
            return check_docs_target(os.path.relpath(full, DOCS).replace(os.sep, "/"), query, frag)
        return check_repo_target(rel, frag)
    # docs mode
    base = mode.split(":", 1)[1]
    if not path:
        if frag and src_file.endswith(".html") and not html_has_anchor(src_file, frag):
            return f"anchor #{frag} not found in this page"
        return None
    if path.startswith("/"):
        return f"root-absolute link {path} breaks under /algorithm-forge/ on GitHub Pages"
    full = os.path.normpath(os.path.join(base, path))
    rel = os.path.relpath(full, DOCS)
    if rel.startswith(".."):
        return f"points outside docs/ (not published on GitHub Pages): {path}"
    return check_docs_target(rel.replace(os.sep, "/") + ("/" if path.endswith("/") else ""), query, frag)

# ------------------------------------------------------------------ extraction
MD_LINK = re.compile(r"!?\[(?:[^\[\]]|\[[^\]]*\])*\]\(\s*(<[^>]+>|[^()\s]+(?:\([^()\s]*\)[^()\s]*)*)(?:\s+(?:\"[^\"]*\"|'[^']*'))?\s*\)")
MD_REF = re.compile(r"^\s{0,3}\[[^\]]+\]:\s*(\S+)")
ATTR = re.compile(r"""\b(?:href|src)\s*=\s*(?:\\?"([^"\\]*)\\?"|'([^']*)')""")
KEYHREF = re.compile(r"""\bhref\s*:\s*(?:"([^"]*)"|'([^']*)')""")
ABS = re.compile(r"""https?://(?:normansrule\.github\.io/algorithm-forge|github\.com/Normansrule/algorithm-forge)[^\s"'`<>)\\]*""", re.I)

def md_links(path):
    text = open(path, encoding="utf-8").read()
    for ln, line in md_strip_code(text):
        found = set()
        for m in MD_LINK.finditer(line):
            found.add(m.group(1))
        m = MD_REF.match(line)
        if m:
            found.add(m.group(1))
        for m in ATTR.finditer(line):
            found.add(m.group(1) or m.group(2) or "")
        for m in ABS.finditer(line):
            u = m.group(0).rstrip(".,;:*_")
            if not any(u in f or f in u for f in found if f):
                found.add(u)
        for u in found:
            yield ln, u

def docs_base_for(path):
    rel = os.path.relpath(path, DOCS).replace(os.sep, "/")
    if rel.endswith(".html"):
        return os.path.dirname(path)
    # scripts: links resolve against the page that loads them
    if rel.startswith("sims/js/"):
        return os.path.join(DOCS, "sims")
    if rel.startswith("arena/"):
        return os.path.join(DOCS, "arena")
    if rel.startswith("quiz/"):
        return DOCS
    return None  # kit / hub / engine scripts build links from a runtime root: check absolute ones only

def docs_links(path):
    text = open(path, encoding="utf-8").read()
    base = docs_base_for(path)
    for ln, line in enumerate(text.split("\n"), 1):
        found = set()
        if base:
            for rx in (ATTR, KEYHREF):
                for m in rx.finditer(line):
                    found.add(m.group(1) if m.group(1) is not None else m.group(2))
        for m in ABS.finditer(line):
            u = m.group(0).rstrip(".,;:")
            found.add(u)
        for u in found:
            if u is None:
                continue
            # relative links written inside absolute-base concatenations are dynamic
            yield ln, u, base

def pack_fields(path):
    text = open(path, encoding="utf-8").read()
    for ln, line in enumerate(text.split("\n"), 1):
        for m in re.finditer(r"\b(lesson|visual)\s*:\s*\"([^\"]*)\"", line):
            yield ln, m.group(1), m.group(2)

def hub_sims(path):
    text = open(path, encoding="utf-8").read()
    for ln, line in enumerate(text.split("\n"), 1):
        if "sims:" in line or line.strip().startswith("[\"") or line.strip().startswith("sims"):
            for m in re.finditer(r"\[\"([a-z0-9-]+)\"", line):
                yield ln, m.group(1)
        for m in re.finditer(r"folder:\s*\"([a-z0-9-]+)\"", line):
            yield ln, "@lesson:" + m.group(1)

# ------------------------------------------------------------------ main
def main():
    verbose = "-v" in sys.argv
    broken = defaultdict(list)
    count = 0
    # Markdown
    for dirpath, dirnames, files in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for f in files:
            if not f.endswith(".md"):
                continue
            p = os.path.join(dirpath, f)
            for ln, u in md_links(p):
                count += 1
                err = check_url(u, p, "md")
                if err:
                    broken[os.path.relpath(p, ROOT)].append((ln, u, err))
    # docs html + js
    for p in sorted(glob.glob(os.path.join(DOCS, "**", "*.html"), recursive=True) +
                    glob.glob(os.path.join(DOCS, "**", "*.js"), recursive=True)):
        for ln, u, base in docs_links(p):
            count += 1
            if base is None and not ABS.match(u):
                continue
            err = check_url(u, p, "docs:" + (base or DOCS))
            if err:
                broken[os.path.relpath(p, ROOT)].append((ln, u, err))
    # problem-pack lesson/visual fields
    for p in sorted(glob.glob(os.path.join(DOCS, "arena", "problems", "*.js"))):
        for ln, field, val in pack_fields(p):
            count += 1
            path, _, frag = val.partition("#")
            if field == "lesson":
                err = check_repo_target(path, frag)
            else:
                sp = urllib.parse.urlsplit(val)
                err = check_docs_target(sp.path, sp.query, sp.fragment)
            if err:
                broken[os.path.relpath(p, ROOT)].append((ln, f"{field}: {val}", err))
    # simulation data tables: arena: ["id", ...] and lesson: "NN-slug" (links built at runtime)
    for p in sorted(glob.glob(os.path.join(DOCS, "sims", "**", "*.js"), recursive=True) +
                    glob.glob(os.path.join(DOCS, "sims", "*.html"))):
        text = open(p, encoding="utf-8").read()
        for m in re.finditer(r"\barena:\s*\[([^\]]*)\]", text):
            ln = text.count("\n", 0, m.start()) + 1
            for pid in re.findall(r"[\"']([a-z0-9-]+)[\"']", m.group(1)):
                count += 1
                if pid not in PROBLEM_IDS:
                    broken[os.path.relpath(p, ROOT)].append((ln, f"arena id {pid}", f"unknown Arena problem id '{pid}'"))
        for m in re.finditer(r"\blesson:\s*[\"'](\d\d-[a-z0-9-]+)[\"']", text):
            ln = text.count("\n", 0, m.start()) + 1
            count += 1
            if not os.path.isdir(os.path.join(ROOT, "lessons", m.group(1))):
                broken[os.path.relpath(p, ROOT)].append((ln, f"lesson {m.group(1)}", "no such lesson folder"))
    # hub chapter table
    hub = os.path.join(DOCS, "assets", "js", "forge-hub.js")
    if os.path.isfile(hub):
        for ln, sid in hub_sims(hub):
            count += 1
            if sid.startswith("@lesson:"):
                err = check_repo_target(f"lessons/{sid[8:]}/README.md", "")
            else:
                err = None if os.path.isfile(os.path.join(DOCS, "sims", sid + ".html")) else f"no simulation docs/sims/{sid}.html"
            if err:
                broken[os.path.relpath(hub, ROOT)].append((ln, sid, err))

    total = sum(len(v) for v in broken.values())
    for f in sorted(broken):
        print(f"\n{f}")
        for ln, u, err in sorted(broken[f]):
            print(f"  {ln:>5}: {u}\n         -> {err}")
    print(f"\nchecked {count} links; {total} broken in {len(broken)} files; {len(PROBLEM_IDS)} Arena problem ids known")
    sys.exit(1 if total else 0)

if __name__ == "__main__":
    main()
