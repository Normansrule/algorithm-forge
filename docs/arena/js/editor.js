/* Forge Arena — a small dependency-free code editor.
   A transparent <textarea> sits on top of a syntax-highlighted <pre>, next to a line-number gutter.
   Features: Tab / Shift+Tab indent, smart Enter indentation, pretty symbols (<- → ←, <= → ≤, >= → ≥, != → ≠),
   error-line marker, trace-line highlight, Ctrl/⌘+Enter run, Ctrl/⌘+Shift+Enter submit, Esc then Tab leaves the editor. */
(function () {
  "use strict";
  const Arena = (window.Arena = window.Arena || {});
  const el = (...a) => Forge.el(...a);
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  /* ---------------- syntax highlighting ---------------- */
  const KW = {
    pseudo: new Set(["ALGORITHM", "Algorithm", "algorithm", "for", "to", "downto", "do", "while", "if", "then", "else", "return", "repeat", "until", "and", "or", "not", "swap", "div", "mod", "break", "continue", "each", "in", "step", "print", "elseif", "function", "procedure", "FUNCTION", "PROCEDURE", "copy", "new"]),
    js: new Set(["function", "return", "if", "else", "for", "while", "do", "break", "continue", "let", "const", "var", "new", "of", "in", "typeof", "class", "this", "switch", "case", "default", "throw", "try", "catch", "finally"]),
    python: new Set(["def", "return", "if", "elif", "else", "for", "while", "in", "not", "and", "or", "is", "break", "continue", "pass", "import", "from", "as", "lambda", "class", "with", "yield", "global", "nonlocal", "del", "try", "except", "finally", "raise", "assert"]),
  };
  const LIT = {
    pseudo: new Set(["true", "false", "null", "NIL", "nil", "infinity", "TRUE", "FALSE"]),
    js: new Set(["true", "false", "null", "undefined", "Infinity", "NaN"]),
    python: new Set(["True", "False", "None"]),
  };
  const TOKEN = /(\/\/.*$|▷.*$)|(#.*$)|(\/\*|\*\/)|("(?:[^"\\]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?|“[^”]*”?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_À-ɏͰ-Ͽ][A-Za-z0-9_À-ɏͰ-Ͽ₀-₉]*)|(←|<-|:=|≤|≥|≠|↔|⌊|⌋|⌈|⌉|∞|−|²|³)|([\s\S])/g;

  /** Highlight source → array of HTML strings, one per line. */
  function highlight(code, lang) {
    lang = lang || "pseudo";
    const kw = KW[lang] || KW.pseudo, lit = LIT[lang] || LIT.pseudo;
    const out = [];
    let inBlock = false; // JS /* … */
    String(code).split("\n").forEach((line) => {
      let html = "";
      let prevWord = null;
      if (inBlock) {
        const end = line.indexOf("*/");
        if (end < 0) { out.push(`<span class="tk-cm">${esc(line)}</span>`); return; }
        html += `<span class="tk-cm">${esc(line.slice(0, end + 2))}</span>`;
        line = line.slice(end + 2);
        inBlock = false;
      }
      TOKEN.lastIndex = 0;
      let m;
      while ((m = TOKEN.exec(line))) {
        const [t, slash, hash, block, str, num, word, op] = m;
        if (slash) { if (lang === "python" && slash.startsWith("//")) { html += esc(slash); } else { html += `<span class="tk-cm">${esc(slash)}</span>`; } break; }
        if (hash) { if (lang === "python" || lang === "pseudo") { html += `<span class="tk-cm">${esc(hash)}</span>`; break; } html += esc(hash); continue; }
        if (block) {
          if (lang === "js" && block === "/*") {
            const rest = line.slice(m.index);
            const end = rest.indexOf("*/", 2);
            if (end < 0) { html += `<span class="tk-cm">${esc(rest)}</span>`; inBlock = true; break; }
            html += `<span class="tk-cm">${esc(rest.slice(0, end + 2))}</span>`;
            TOKEN.lastIndex = m.index + end + 2;
            continue;
          }
          html += esc(block); continue;
        }
        if (str) { html += `<span class="tk-str">${esc(str)}</span>`; continue; }
        if (num) { html += `<span class="tk-num">${num}</span>`; continue; }
        if (word) {
          let cls = null;
          if (kw.has(word)) cls = "tk-kw";
          else if (lit.has(word)) cls = "tk-lit";
          else if (prevWord && /^(ALGORITHM|Algorithm|algorithm|function|def|FUNCTION|PROCEDURE|procedure)$/.test(prevWord)) cls = "tk-fn";
          else if (/^\s*\(/.test(line.slice(m.index + word.length))) cls = "tk-call";
          html += cls ? `<span class="${cls}">${esc(word)}</span>` : esc(word);
          prevWord = word;
          continue;
        }
        if (op) { html += `<span class="tk-op">${esc(op)}</span>`; continue; }
        html += esc(t);
        if (!/\s/.test(t)) prevWord = null;
      }
      out.push(html);
    });
    return out;
  }
  Arena.highlight = highlight;
  /** Read-only highlighted block (used by the Solution tab). */
  Arena.codeBlock = function (code, lang) {
    const pre = el("pre", { class: "codeview", tabindex: "0", "aria-label": (lang === "python" ? "Python" : lang === "js" ? "JavaScript" : "Pseudocode") + " code" });
    pre.innerHTML = highlight(code, lang).map((h, i) => `<span class="row"><span class="gn">${i + 1}</span>${h || " "}</span>`).join("");
    return pre;
  };

  /* ---------------- the editor ---------------- */
  const LH = 21; // line height in px (must match arena.css)
  const OPENERS = {
    pseudo: (s) => /^\s*(ALGORITHM|FUNCTION|PROCEDURE)\b/i.test(s) || /\b(do|then|else|repeat)\s*$/i.test(s) || /:\s*$/.test(s) && /^\s*(ALGORITHM|else)/i.test(s),
    js: (s) => /[{([]\s*$/.test(s),
    python: (s) => /:\s*$/.test(s),
  };

  function Editor(host, opts) {
    opts = opts || {};
    this.lang = opts.lang || "pseudo";
    this.pretty = opts.pretty !== false;
    this.onChange = opts.onChange || null;
    this.onRun = opts.onRun || null;
    this.onSubmit = opts.onSubmit || null;
    this.errorLine = null;
    this.traceLine = null;
    this.tabLeaves = false;
    this.gutter = el("div", { class: "ed-gutter", "aria-hidden": "true" });
    this.pre = el("pre", { class: "ed-hl", "aria-hidden": "true" });
    this.inner = el("div", { class: "ed-inner" });
    this.pre.appendChild(this.inner);
    this.ta = el("textarea", { class: "ed-ta", spellcheck: "false", autocapitalize: "off", autocomplete: "off", autocorrect: "off", wrap: "off", "aria-label": opts.label || "Code editor", "aria-describedby": opts.describedBy || null });
    this.main = el("div", { class: "ed-main" }, this.pre, this.ta);
    this.root = el("div", { class: "ed", "data-lang": this.lang }, this.gutter, this.main);
    host.appendChild(this.root);
    this.ta.value = opts.value || "";
    this.bind();
    this.render();
  }
  Editor.prototype.bind = function () {
    const ta = this.ta;
    ta.addEventListener("input", (e) => {
      if (this.pretty && this.lang === "pseudo" && e.inputType === "insertText" && e.data && /^[-=>]$/.test(e.data)) this.prettify(e.data);
      this.render();
      if (this.onChange) this.onChange(ta.value);
    });
    ta.addEventListener("scroll", () => { this.pre.scrollLeft = ta.scrollLeft; this.pre.scrollTop = ta.scrollTop; });
    ta.addEventListener("keydown", (e) => this.keydown(e));
  };
  Editor.prototype.prettify = function (ch) {
    const ta = this.ta, pos = ta.selectionStart;
    if (pos !== ta.selectionEnd || pos < 2) return;
    const lineStart = ta.value.lastIndexOf("\n", pos - 1) + 1;
    const before = ta.value.slice(lineStart, pos);
    // not inside a comment or a string
    if (/\/\//.test(before) || ((before.match(/"/g) || []).length % 2) === 1) return;
    const two = ta.value.slice(pos - 2, pos);
    const map = { "<-": "←", "<=": "≤", ">=": "≥", "!=": "≠", "←>": "↔" };
    const sym = map[two];
    if (!sym) return;
    ta.setSelectionRange(pos - 2, pos);
    this.insertText(sym);
  };
  Editor.prototype.insertText = function (text) {
    const ta = this.ta;
    let ok = false;
    try { ok = document.execCommand("insertText", false, text); } catch (e) { ok = false; }
    if (!ok) {
      const s = ta.selectionStart, en = ta.selectionEnd;
      ta.setRangeText(text, s, en, "end");
      ta.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };
  Editor.prototype.replaceLines = function (fn) {
    // apply fn(line) to every line touched by the selection, keep a sensible selection afterwards
    const ta = this.ta, v = ta.value;
    const s = ta.selectionStart, en = ta.selectionEnd;
    const a = v.lastIndexOf("\n", s - 1) + 1;
    let b = v.indexOf("\n", en > s && v[en - 1] === "\n" ? en - 1 : en);
    if (b < 0) b = v.length;
    const lines = v.slice(a, b).split("\n");
    let deltaFirst = 0, total = 0;
    const out = lines.map((l, k) => { const r = fn(l); if (k === 0) deltaFirst = r.length - l.length; total += r.length - l.length; return r; });
    ta.setSelectionRange(a, b);
    this.insertText(out.join("\n"));
    if (s === en) ta.setSelectionRange(Math.max(a, s + deltaFirst), Math.max(a, s + deltaFirst));
    else ta.setSelectionRange(a, b + total);
  };
  Editor.prototype.keydown = function (e) {
    const ta = this.ta;
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) { if (this.onSubmit) this.onSubmit(); } else if (this.onRun) this.onRun();
      return;
    }
    if (e.key === "Escape") { this.tabLeaves = true; this.root.classList.add("tab-leaves"); return; }
    if (e.key === "Tab") {
      if (this.tabLeaves || e.ctrlKey || e.metaKey || e.altKey) { this.tabLeaves = false; this.root.classList.remove("tab-leaves"); return; }
      e.preventDefault();
      const multi = ta.value.slice(ta.selectionStart, ta.selectionEnd).includes("\n");
      if (e.shiftKey) this.replaceLines((l) => l.replace(/^ {1,4}|^\t/, ""));
      else if (multi) this.replaceLines((l) => (l.length ? "    " + l : l));
      else this.insertText("    ");
      return;
    }
    this.tabLeaves = false; this.root.classList.remove("tab-leaves");
    if (e.key === "Enter" && !e.shiftKey && !e.altKey && !e.isComposing) {
      e.preventDefault();
      const pos = ta.selectionStart;
      const lineStart = ta.value.lastIndexOf("\n", pos - 1) + 1;
      const before = ta.value.slice(lineStart, pos);
      let indent = before.match(/^[ \t]*/)[0].replace(/\t/g, "    ");
      const code = this.lang === "python" ? before.replace(/#.*$/, "") : before.replace(/\/\/.*$/, "");
      if ((OPENERS[this.lang] || OPENERS.pseudo)(code.replace(/\s+$/, ""))) indent += "    ";
      this.insertText("\n" + indent);
      return;
    }
    if (e.key === "Backspace" && ta.selectionStart === ta.selectionEnd) {
      // backspace inside leading indentation removes one indent level
      const pos = ta.selectionStart;
      const lineStart = ta.value.lastIndexOf("\n", pos - 1) + 1;
      const before = ta.value.slice(lineStart, pos);
      if (before.length >= 4 && /^ +$/.test(before) && before.length % 4 === 0) {
        e.preventDefault();
        ta.setSelectionRange(pos - 4, pos);
        this.insertText("");
      }
    }
  };
  Editor.prototype.render = function () {
    const v = this.ta.value;
    const lines = highlight(v, this.lang);
    const n = lines.length;
    this.inner.innerHTML = lines.map((h, i) => {
      const k = i + 1;
      const cls = "row" + (k === this.errorLine ? " err" : "") + (k === this.traceLine ? " cur" : "");
      return `<span class="${cls}">${h || " "}</span>`;
    }).join("");
    let g = "";
    for (let k = 1; k <= n; k++) g += `<span class="gn${k === this.errorLine ? " err" : ""}${k === this.traceLine ? " cur" : ""}">${k}</span>`;
    this.gutter.innerHTML = g;
    const rows = Math.max(n, this.minRows || 12);
    const hasHScroll = this.ta.scrollWidth > this.ta.clientWidth + 1;
    const h = rows * LH + 20 + (hasHScroll ? 14 : 0);
    this.ta.style.height = h + "px";
    this.pre.scrollLeft = this.ta.scrollLeft;
  };
  Editor.prototype.getValue = function () { return this.ta.value; };
  Editor.prototype.setValue = function (v) { this.ta.value = v || ""; this.errorLine = null; this.traceLine = null; this.render(); };
  Editor.prototype.setLang = function (l) { this.lang = l; this.root.setAttribute("data-lang", l); this.render(); };
  Editor.prototype.setPretty = function (b) { this.pretty = !!b; };
  Editor.prototype.setErrorLine = function (n) { this.errorLine = n || null; this.render(); };
  Editor.prototype.setTraceLine = function (n, scroll) {
    this.traceLine = n || null;
    this.render();
    if (n && scroll !== false) {
      const row = this.gutter.children[n - 1];
      // Follow the line only inside a scrolling column (the side-by-side desktop layout). When the page itself is the
      // scroller (phones and tablets: the step controls sit above the editor), scrolling to the line would throw the
      // controls off screen on every step; the trace card names the current line there anyway.
      let box = this.root.parentElement;
      while (box && box !== document.body && !/(auto|scroll)/.test(getComputedStyle(box).overflowY)) box = box.parentElement;
      if (row && row.scrollIntoView && box && box !== document.body) {
        const r = row.getBoundingClientRect(), b = box.getBoundingClientRect();
        if (r.top < Math.max(60, b.top + 50) || r.bottom > Math.min(window.innerHeight, b.bottom) - 10) row.scrollIntoView({ block: "center", behavior: "auto" });
      }
    }
  };
  Editor.prototype.gotoLine = function (n) {
    const lines = this.ta.value.split("\n");
    n = Math.max(1, Math.min(lines.length, n | 0));
    let a = 0;
    for (let k = 0; k < n - 1; k++) a += lines[k].length + 1;
    this.ta.focus({ preventScroll: true });
    this.ta.setSelectionRange(a + (lines[n - 1].match(/^ */)[0].length), a + lines[n - 1].length);
    const row = this.gutter.children[n - 1];
    if (row) row.scrollIntoView({ block: "center" });
    this.root.classList.remove("flash"); void this.root.offsetWidth; this.root.classList.add("flash");
  };
  Editor.prototype.insert = function (text) {
    this.ta.focus({ preventScroll: true });
    this.insertText(text);
  };
  Editor.prototype.focus = function () { this.ta.focus(); };
  Arena.Editor = Editor;
})();
