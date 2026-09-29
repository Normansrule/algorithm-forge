#!/usr/bin/env python3
"""Tiny Markdown + LaTeX-subset renderer used to build the hub pages (no dependencies).

Why not a Markdown library? The site has no build step and no external JS; this module turns the
repo's own Markdown (the cheat sheets, the quiz bank) into static HTML whose math is plain
Unicode/HTML (sup/sub), so pages render instantly, print well and need no math library.

Supported Markdown: ATX headings, paragraphs, bullet/numbered lists (one nesting level),
pipe tables, fenced code blocks, blockquotes, horizontal rules, **bold**, *italic*, `code`,
[links](url), raw HTML lines, <details>. Math: $inline$ and $$display$$ with the LaTeX
commands listed in SYMBOLS / tex() below.
"""
import html
import re

SYMBOLS = {
    "Theta": "Θ", "Omega": "Ω", "omega": "ω", "alpha": "α", "beta": "β", "gamma": "γ", "delta": "δ", "Delta": "Δ",
    "epsilon": "ε", "varepsilon": "ε", "phi": "φ", "varphi": "φ", "Phi": "Φ", "psi": "ψ", "pi": "π", "lambda": "λ",
    "mu": "μ", "sigma": "σ", "tau": "τ", "rho": "ρ", "theta": "θ",
    "le": "≤", "leq": "≤", "ge": "≥", "geq": "≥", "ne": "≠", "neq": "≠", "cdot": "·", "times": "×", "div": "÷",
    "approx": "≈", "sim": "∼", "equiv": "≡", "in": "∈", "notin": "∉", "to": "→", "rightarrow": "→", "leftarrow": "←",
    "gets": "←", "Rightarrow": "⇒", "Leftarrow": "⇐", "iff": "⇔", "Leftrightarrow": "⇔", "infty": "∞",
    "lfloor": "⌊", "rfloor": "⌋", "lceil": "⌈", "rceil": "⌉", "ldots": "…", "dots": "…", "cdots": "⋯", "vdots": "⋮",
    "forall": "∀", "exists": "∃", "emptyset": "∅", "subseteq": "⊆", "subset": "⊂", "cup": "∪", "cap": "∩",
    "mid": "|", "lvert": "|", "rvert": "|", "vert": "|", "|": "‖", "pm": "±", "mp": "∓", "neg": "¬", "land": "∧", "lor": "∨",
    "ll": "≪", "gg": "≫", "prime": "′", "circ": "∘", "star": "⋆", "ast": "∗", "infty": "∞", "partial": "∂",
    "log": "log", "lg": "lg", "ln": "ln", "lim": "lim", "max": "max", "min": "min", "exp": "exp", "gcd": "gcd",
    "bmod": " mod ", "mod": " mod ", "sum": "∑", "prod": "∏", "sqrt": "√", "quad": "  ", "qquad": "    ",
    ",": " ", ";": " ", ":": " ", "!": "", " ": " ", "{": "{", "}": "}", "%": "%", "#": "#", "&": "&", "_": "_",
    "left": "", "right": "", "big": "", "Big": "", "bigl": "", "bigr": "", "displaystyle": "", "limits": "",
    "preceq": "⪯", "succeq": "⪰", "arctan": "arctan", "cos": "cos", "sin": "sin", "\\": "<br>", "blacksquare": "∎",
    "leftrightarrow": "↔", "uparrow": "↑", "downarrow": "↓", "top": "⊤", "bot": "⊥", "triangleq": "≜",
}
ONE_ARG_WRAP = {"text": "{}", "mathrm": "{}", "mathit": "<i>{}</i>", "mathbf": "<b>{}</b>", "textbf": "<b>{}</b>",
                "operatorname": "{}", "textit": "<i>{}</i>", "mathcal": "{}", "boxed": "<span class=\"boxed\">{}</span>",
                "overline": "<span style=\"text-decoration:overline\">{}</span>", "hat": "{}̂", "bar": "<span style=\"text-decoration:overline\">{}</span>",
                "underbrace": "{}", "texttt": "<code>{}</code>"}


class _TeX:
    def __init__(self, s):
        self.s, self.i = s, 0

    def peek(self):
        return self.s[self.i] if self.i < len(self.s) else ""

    def group(self, tight=False):
        """Read one argument: {…} or a single token; return rendered HTML."""
        while self.peek() == " ":
            self.i += 1
        c = self.peek()
        if c == "{":
            self.i += 1
            depth, start = 1, self.i
            while self.i < len(self.s) and depth:
                if self.s[self.i] == "\\":
                    self.i += 2
                    continue
                if self.s[self.i] == "{":
                    depth += 1
                elif self.s[self.i] == "}":
                    depth -= 1
                self.i += 1
            return _TeX(self.s[start:self.i - 1]).render(tight)
        if c == "\\":
            return self.command()
        self.i += 1
        return html.escape(c)

    def raw_group(self):
        while self.peek() == " ":
            self.i += 1
        if self.peek() != "{":
            c = self.peek(); self.i += 1; return c
        self.i += 1
        depth, start = 1, self.i
        while self.i < len(self.s) and depth:
            if self.s[self.i] == "{":
                depth += 1
            elif self.s[self.i] == "}":
                depth -= 1
            self.i += 1
        return self.s[start:self.i - 1]

    def command(self):
        self.i += 1  # backslash
        m = re.match(r"[A-Za-z]+|.", self.s[self.i:])
        name = m.group(0) if m else ""
        self.i += len(name)
        if name == "frac" or name == "dfrac" or name == "tfrac":
            a, b = self.group(), self.group()
            vulgar = {("1", "2"): "½", ("1", "4"): "¼", ("3", "4"): "¾", ("1", "3"): "⅓", ("2", "3"): "⅔", ("1", "6"): "⅙", ("1", "8"): "⅛"}
            if (a, b) in vulgar:
                return vulgar[(a, b)]
            if re.fullmatch(r"\d+", a) and re.fullmatch(r"\d+", b):
                return f"<sup>{a}</sup>⁄<sub>{b}</sub>"
            return f"{_paren(a)}/{_paren(b, True)}"
        if name in ("begin", "end"):
            self.raw_group()
            return ""
        if name == "binom":
            a, b = self.group(), self.group()
            return f"C({a}, {b})"
        if name == "sqrt":
            a = self.group()
            return f"√{a}" if re.fullmatch(r"\d+(\.\d+)?|[A-Za-z]", re.sub(r"<[^>]+>", "", a)) else f"√({a})"
        if name == "pmod":
            return f" (mod {self.group()})"
        if name in ("text", "mathrm", "textbf", "textit", "operatorname", "texttt"):
            return ONE_ARG_WRAP[name].format(html.escape(self.raw_group()))
        if name in ONE_ARG_WRAP:
            return ONE_ARG_WRAP[name].format(self.group())
        if name in ("log", "lg", "ln", "lim", "max", "min", "exp", "gcd", "sum", "prod"):
            out = SYMBOLS[name]
            while self.peek() in ("_", "^") and self.peek():
                c = self.peek(); self.i += 1
                out += f"<{'sub' if c == '_' else 'sup'}>{self.group(True)}</{'sub' if c == '_' else 'sup'}>"
            j = self.i
            while j < len(self.s) and self.s[j] == " ":
                j += 1
            if j < len(self.s) and (self.s[j].isalnum() or self.s[j] == "\\"):
                out += "\u2009"
            return out
        if name in SYMBOLS:
            return SYMBOLS[name]
        return html.escape(name)

    def render(self, tight=False):
        out = []
        while self.i < len(self.s):
            c = self.s[self.i]
            if c == "\\":
                m = re.match(r"\\([A-Za-z]+)", self.s[self.i:])
                if m and m.group(1) in ("log", "lg", "ln", "lim", "max", "min", "exp", "gcd", "sum", "prod", "cos", "sin", "arctan") \
                        and out and re.search(r"[\w)′!]$", re.sub(r"<[^>]+>", "", "".join(out))):
                    out.append("\u2009")
                out.append(self.command())
            elif c == "^":
                self.i += 1
                out.append(f"<sup>{self.group(True)}</sup>")
            elif c == "_":
                self.i += 1
                out.append(f"<sub>{self.group(True)}</sub>")
            elif c == "{":
                out.append(self.group())
            elif c == "}":
                self.i += 1
            elif c == "&":
                self.i += 1
            elif c == "~":
                self.i += 1
                out.append(" ")
            elif c == "-":
                self.i += 1
                out.append("−")
            elif c == "*":
                self.i += 1
                out.append("∗")
            elif c == "'":
                self.i += 1
                out.append("′")
            elif c == " ":
                self.i += 1
            elif c == ",":
                self.i += 1
                out.append(", ")
            else:
                self.i += 1
                out.append(html.escape(c))
        return "".join(out).strip() if tight else _space("".join(out))


REL = r"(=|&lt;|&gt;|≤|≥|≠|≈|∈|∉|→|⇒|⇔|←|\+|−|≡|∼|⊆|⪯|⪰)"


def _space(s):
    """Add spaces around relations/operators in the text parts (not inside tags)."""
    parts = re.split(r"(<[^>]+>)", s)
    depth = 0  # inside sub/sup we keep things tight
    res = []
    for p in parts:
        if p.startswith("<"):
            if re.match(r"<su[bp]>", p): depth += 1
            elif re.match(r"</su[bp]>", p): depth -= 1
            res.append(p); continue
        if depth == 0:
            p = re.sub(r"\s*" + REL + r"\s*", r" \1 ", p)
        res.append(p)
    s = "".join(res)
    s = re.sub(r" {2,}", " ", s)
    s = re.sub(r"(^|[(\[,{]|<sup>|<sub>)\s*−\s+", r"\1−", s)   # unary minus
    s = re.sub(r"(= |≤ |≥ |≈ |&lt; |&gt; |, )− ", r"\1−", s)
    return s.strip()


def _toplevel_ops(x):
    plain = re.sub(r"<[^>]+>", "", x)
    d = 0
    for k, ch in enumerate(plain):
        if ch in "([{": d += 1
        elif ch in ")]}": d -= 1
        elif d == 0 and ch in "+−-=/" and k > 0: return True
    return False


def _paren(x, denom=False):
    plain = re.sub(r"<[^>]+>", "", x).strip()
    if denom and re.fullmatch(r"√\w|√\(.*\)", plain):
        return x
    if not denom and re.fullmatch(r"[\w.′∞]+", plain) or re.fullmatch(r"\(.*\)", plain) and plain.count("(") == 1:
        return x
    if denom:
        return x if re.fullmatch(r"(\d+(\.\d+)?|[A-Za-zα-ωΑ-Ω])(<su[bp]>[^<]*</su[bp]>)*", x) or re.fullmatch(r"[a-zA-Z]\([^()]*\)", plain) else f"({x})"
    return f"({x})" if _toplevel_ops(x) else x


def tex(s):
    """LaTeX subset → HTML string (Unicode symbols, <sup>, <sub>)."""
    return _TeX(s.strip()).render()


# ------------------------------------------------------------------ inline markdown
def inline(s):
    """Render inline markdown (math, code, bold, italic, links) to HTML."""
    stash = []

    def keep(h):
        stash.append(h)
        return f"\x00{len(stash) - 1}\x00"

    s = re.sub(r"`([^`]+)`", lambda m: keep(f"<code>{html.escape(m.group(1))}</code>"), s)
    s = re.sub(r"\$\$(.+?)\$\$", lambda m: keep(f'<span class="math">{tex(m.group(1))}</span>'), s)
    s = re.sub(r"(?<![\\$])\$([^$\n]+?)\$", lambda m: keep(f'<span class="math">{tex(m.group(1))}</span>'), s)
    # raw inline HTML tags we allow through
    s = re.sub(r"</?(?:b|i|br|sup|sub|kbd|span|em|strong|a|code|small|mark)(?:\s[^>]*)?/?>", lambda m: keep(m.group(0)), s)
    s = html.escape(s, quote=False)
    s = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", lambda m: keep(_link(m.group(1), m.group(2))), s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<i>\1</i>", s)
    s = re.sub(r"(?<![\w_])_(?!\s)([^_]+?)(?<!\s)_(?![\w_])", r"<i>\1</i>", s)
    s = s.replace("\\$", "$")
    for _ in range(3):
        s = re.sub(r"\x00(\d+)\x00", lambda m: stash[int(m.group(1))], s)
    return s


LINK_REWRITE = []  # list of (regex, replacement) applied to hrefs, set by callers


def _link(text, href):
    for rx, rep in LINK_REWRITE:
        href = re.sub(rx, rep, href)
    ext = href.startswith("http")
    attrs = ' target="_blank" rel="noopener"' if ext else ""
    return f'<a href="{html.escape(href)}"{attrs}>{inline(text) if "[" not in text else html.escape(text)}</a>'


def slug(s):
    s = re.sub(r"<[^>]+>|[`*$\\]", "", s).lower()
    s = re.sub(r"[^\w\s-]", "", s)
    return re.sub(r"[\s_]+", "-", s).strip("-")


# ------------------------------------------------------------------ block markdown
def render(md, id_prefix="", code_class="code-block", hooks=None):
    """Markdown → HTML. hooks: {"mermaid": fn(src) -> html} for fenced blocks by language."""
    hooks = hooks or {}
    lines = md.split("\n")
    out, i = [], 0
    para = []

    def flush():
        if para:
            out.append("<p>" + inline(" ".join(para)) + "</p>")
            para.clear()

    while i < len(lines):
        ln = lines[i]
        st = ln.strip()
        if st.startswith("<!--"):
            flush()
            while "-->" not in lines[i]:
                i += 1
            i += 1
            continue
        m = re.match(r"^(`{3,})\s*([\w-]*)", st)
        if m:
            flush()
            fence, lang = m.group(1), m.group(2)
            j = i + 1
            buf = []
            while j < len(lines) and not lines[j].strip().startswith(fence):
                buf.append(lines[j])
                j += 1
            src = "\n".join(buf)
            if lang in hooks:
                out.append(hooks[lang](src))
            elif lang == "math":
                out.append(f'<div class="math display">{tex(src)}</div>')
            else:
                out.append(f'<pre class="{code_class}" data-lang="{lang}"><code>{html.escape(src)}</code></pre>')
            i = j + 1
            continue
        if st.startswith("$$") and (st.endswith("$$") and len(st) > 4):
            flush()
            out.append(f'<div class="math display">{tex(st[2:-2])}</div>')
            i += 1
            continue
        if st.startswith("$$"):
            flush()
            buf = [st[2:]]
            i += 1
            while i < len(lines) and "$$" not in lines[i]:
                buf.append(lines[i]); i += 1
            buf.append(lines[i].replace("$$", "") if i < len(lines) else "")
            out.append(f'<div class="math display">{tex(" ".join(buf))}</div>')
            i += 1
            continue
        m = re.match(r"^(#{1,6})\s+(.*)$", st)
        if m:
            flush()
            lvl, text = len(m.group(1)), m.group(2)
            anchor = id_prefix + slug(text)
            out.append(f'<h{lvl} id="{anchor}">{inline(text)}</h{lvl}>')
            i += 1
            continue
        if re.match(r"^(-{3,}|\*{3,})$", st):
            flush(); out.append("<hr>"); i += 1; continue
        if st.startswith("|") and i + 1 < len(lines) and re.match(r"^\|?\s*:?-{2,}", lines[i + 1].strip()):
            flush()
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                rows.append(lines[i].strip())
                i += 1
            cells = lambda r: [c.strip() for c in re.split(r"(?<!\\)\|", r.strip().strip("|"))]
            head = cells(rows[0])
            body = [cells(r) for r in rows[2:]]
            t = ['<div class="table-wrap"><table class="md"><thead><tr>' + "".join(f"<th>{inline(h)}</th>" for h in head) + "</tr></thead><tbody>"]
            for r in body:
                t.append("<tr>" + "".join(f"<td>{inline(c.replace(chr(92) + '|', '|'))}</td>" for c in r) + "</tr>")
            t.append("</tbody></table></div>")
            out.append("".join(t))
            continue
        if re.match(r"^\s*([-*]|\d+\.)\s+", ln):
            flush()
            ordered = bool(re.match(r"^\s*\d+\.", ln))
            tag = "ol" if ordered else "ul"
            items = []
            while i < len(lines) and (re.match(r"^\s*([-*]|\d+\.)\s+", lines[i]) or (lines[i].startswith("  ") and lines[i].strip() and items)):
                l2 = lines[i]
                mm = re.match(r"^(\s*)([-*]|\d+\.)\s+(.*)$", l2)
                if mm:
                    items.append([len(mm.group(1)), mm.group(3)])
                else:
                    items[-1][1] += " " + l2.strip()
                i += 1
            html_items, base = [], items[0][0]
            k = 0
            while k < len(items):
                ind, text = items[k]
                sub = []
                k += 1
                while k < len(items) and items[k][0] > base:
                    sub.append(items[k][1]); k += 1
                inner = inline(text) + (("<ul>" + "".join(f"<li>{inline(x)}</li>" for x in sub) + "</ul>") if sub else "")
                html_items.append(f"<li>{inner}</li>")
            out.append(f"<{tag}>" + "".join(html_items) + f"</{tag}>")
            continue
        if st.startswith(">"):
            flush()
            buf = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                buf.append(lines[i].strip()[1:].strip()); i += 1
            out.append('<blockquote class="callout steel">' + render("\n".join(buf), id_prefix, code_class, hooks) + "</blockquote>")
            continue
        if st.startswith("<") and not st.startswith("<b") and not st.startswith("<i") and not st.startswith("<a ") and not st.startswith("<code"):
            flush(); out.append(st); i += 1; continue
        if not st:
            flush(); i += 1; continue
        para.append(st)
        i += 1
    flush()
    return "\n".join(out)


if __name__ == "__main__":
    for t in [r"\frac{n(n-1)}{2}", r"\sum_{i=1}^{n} i = \frac{n(n+1)}{2}", r"\Theta(n^{\log_2 3})", r"\lim_{n\to\infty} \frac{t(n)}{g(n)}",
              r"n! \approx \sqrt{2\pi n}\left(\frac{n}{e}\right)^n", r"\lfloor \log_2 n \rfloor + 1", r"T(n) = aT(n/b) + f(n)", r"a^{\log_b n} = n^{\log_b a}"]:
        print(t, "→", tex(t))
