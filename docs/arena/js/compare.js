/* Forge Arena — "compare with the reference" after an Accepted.
   Arena.lineDiff(a, b): a line diff built on the Longest Common Subsequence (LCS) of the two line lists
   (dynamic programming table, then a walk back through it). Lines are compared loosely: whitespace runs,
   ASCII spellings of the arrows / comparison symbols and trailing comments don't count as differences.
   Arena.CompareView: side-by-side (or stacked, on narrow screens) view + operation counts on one example. */
(function () {
  "use strict";
  const Arena = (window.Arena = window.Arena || {});
  const el = (...a) => Forge.el(...a);

  /** Normalized comparison key of one line. */
  function key(line, lang) {
    let s = String(line);
    if (lang === "python") s = s.replace(/#.*$/, ""); else s = s.replace(/(\/\/|▷).*$/, "");
    if (lang === "pseudo" || !lang) s = s.replace(/<-|:=/g, "←").replace(/<=/g, "≤").replace(/>=/g, "≥").replace(/!=/g, "≠").replace(/−/g, "-");
    return s.replace(/\s+/g, " ").replace(/\s*([()[\],←≤≥≠<>=+*/-])\s*/g, "$1").trim();
  }
  const isNote = (line, lang) => !String(line).trim() || (lang === "python" ? /^\s*#/ : /^\s*(\/\/|▷)/).test(line);

  /**
   * Line diff of a → b. Returns [{t: "same"|"del"|"add", a: lineA, b: lineB, ai, bi}] in order.
   * Blank and comment-only lines are left out of the matching and reported as "note" rows on their own side.
   */
  Arena.lineDiff = function (aText, bText, lang) {
    const A = String(aText || "").replace(/\s+$/, "").split("\n"), B = String(bText || "").replace(/\s+$/, "").split("\n");
    const ia = [], ib = [];
    A.forEach((l, i) => { if (!isNote(l, lang)) ia.push(i); });
    B.forEach((l, i) => { if (!isNote(l, lang)) ib.push(i); });
    const ka = ia.map((i) => key(A[i], lang)), kb = ib.map((i) => key(B[i], lang));
    const n = ka.length, m = kb.length;
    // L[i][j] = length of the LCS of ka[i..] and kb[j..]
    const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = ka[i] === kb[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const pairs = []; // matched (A index, B index)
    for (let i = 0, j = 0; i < n && j < m;) {
      if (ka[i] === kb[j]) { pairs.push([ia[i], ib[j]]); i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) i++;
      else j++;
    }
    const out = [];
    let pa = 0, pb = 0;
    const flush = (toA, toB) => {
      for (; pa < toA; pa++) out.push(isNote(A[pa], lang) ? { t: "note", side: "a", a: A[pa], ai: pa } : { t: "del", a: A[pa], ai: pa });
      for (; pb < toB; pb++) out.push(isNote(B[pb], lang) ? { t: "note", side: "b", b: B[pb], bi: pb } : { t: "add", b: B[pb], bi: pb });
    };
    pairs.forEach(([x, y]) => { flush(x, y); out.push({ t: "same", a: A[x], b: B[y], ai: x, bi: y }); pa = x + 1; pb = y + 1; });
    flush(A.length, B.length);
    return out;
  };

  /** Pair the diff into side-by-side rows: runs of deletions and additions sit next to each other. */
  Arena.sideBySide = function (diff) {
    const rows = [];
    let k = 0;
    while (k < diff.length) {
      const d = diff[k];
      if (d.t === "same") { rows.push({ t: "same", a: d, b: d }); k++; continue; }
      const dels = [], adds = [];
      while (k < diff.length && diff[k].t !== "same") {
        const x = diff[k];
        if (x.t === "del" || (x.t === "note" && x.side === "a")) dels.push(x); else adds.push(x);
        k++;
      }
      for (let i = 0; i < Math.max(dels.length, adds.length); i++) rows.push({ t: "change", a: dels[i] || null, b: adds[i] || null });
    }
    return rows;
  };

  /* ---------------- view ---------------- */
  const LANG_NAME = { pseudo: "Pseudocode", js: "JavaScript", python: "Python" };
  function codeCell(d, side, lang) {
    if (!d) return el("div", { class: "cmp-c empty", "aria-hidden": "true" });
    const text = side === "a" ? d.a : d.b;
    const n = (side === "a" ? d.ai : d.bi) + 1;
    const cls = d.t === "same" ? "same" : d.t === "note" ? "note" : side === "a" ? "del" : "add";
    const c = el("div", { class: "cmp-c " + cls });
    c.appendChild(el("span", { class: "cmp-n", "aria-hidden": "true" }, String(n)));
    const code = el("code", { class: "cmp-code" });
    code.innerHTML = Arena.highlight(text, lang)[0] || " ";
    c.appendChild(code);
    return c;
  }
  function metricFor(problem, a, b) {
    if (problem.budget) return { metric: problem.budget.metric, label: problem.budget.label };
    if (problem.growth && problem.growth.metric) return { metric: problem.growth.metric };
    if ((a && a.keyComparisons) || (b && b.keyComparisons)) return { metric: "keyComparisons" };
    if ((a && a.comparisons) || (b && b.comparisons)) return { metric: "comparisons" };
    return { metric: "steps" };
  }

  /**
   * opts: {problem, lang, code, grader}
   * Renders: summary line, side-by-side diff, then operation counts on an example (pseudocode only).
   */
  Arena.CompareView = function (host, opts) {
    const p = opts.problem;
    const lang = opts.lang === "blocks" ? "pseudo" : opts.lang;
    const ref = (p.solution || {})[lang] || (p.solution || {}).pseudo || "";
    const refLang = (p.solution || {})[lang] ? lang : "pseudo";
    const diff = Arena.lineDiff(opts.code, ref, refLang);
    const rows = Arena.sideBySide(diff);
    const codeA = diff.filter((d) => d.t === "same" || d.t === "del").length;
    const same = diff.filter((d) => d.t === "same").length;
    const codeB = diff.filter((d) => d.t === "same" || d.t === "add").length;
    const box = el("section", { class: "compare panel", "aria-labelledby": "cmp-h", tabindex: "-1" });
    box.appendChild(el("div", { class: "cmp-head" },
      el("h2", { id: "cmp-h" }, "⇆ Your solution vs the reference"),
      el("button", { class: "btn sm ghost", type: "button", "aria-label": "Close the comparison", onclick: () => { box.remove(); if (opts.onClose) opts.onClose(); } }, "✕ Close")));
    const pct = Math.max(codeA, codeB) ? Math.round((100 * same) / Math.max(codeA, codeB)) : 100;
    box.appendChild(el("p", { class: "small cmp-sum" },
      same === codeA && same === codeB ? "Line for line, your code matches the reference." :
        `${same} of your ${codeA} code line${codeA === 1 ? "" : "s"} match the reference exactly (${pct}% overlap). The reference has ${codeB}. Different isn't wrong — both pass every test.`,
      " ", el("span", { class: "muted" }, "Spacing, typed arrows like <- and <=, and comments are ignored when matching.")));
    box.appendChild(el("div", { class: "legend cmp-legend" },
      el("span", null, el("i", { style: { background: "var(--c-swap)" } }), "only in yours"),
      el("span", null, el("i", { style: { background: "var(--c-done)" } }), "only in the reference"),
      el("span", null, el("i", { style: { background: "var(--line-2)" } }), "same")));
    const grid = el("div", { class: "cmp-grid", role: "table", "aria-label": "Line comparison" },
      el("div", { class: "cmp-row cmp-th", role: "row" },
        el("div", { class: "cmp-hd", role: "columnheader" }, "Yours · " + (opts.lang === "blocks" ? "Blocks" : LANG_NAME[lang] || lang)),
        el("div", { class: "cmp-hd", role: "columnheader" }, "Reference · " + (LANG_NAME[refLang] || refLang))));
    rows.forEach((r) => {
      const row = el("div", { class: "cmp-row " + r.t, role: "row" });
      const a = codeCell(r.a, "a", refLang), b = codeCell(r.b, "b", refLang);
      a.setAttribute("role", "cell"); b.setAttribute("role", "cell");
      if (r.t === "change") { if (r.a && r.a.t === "del") a.setAttribute("aria-label", "Only in yours: " + r.a.a.trim()); if (r.b && r.b.t === "add") b.setAttribute("aria-label", "Only in the reference: " + r.b.b.trim()); }
      row.appendChild(a); row.appendChild(b);
      grid.appendChild(row);
    });
    box.appendChild(el("div", { class: "cmp-scroll" }, grid));

    // ---- operation counts on one example
    const opsBox = el("div", { class: "cmp-ops" });
    box.appendChild(opsBox);
    const tests = (p.tests || []).slice(0, Math.max(1, Math.min((p.tests || []).length, p.exampleCount || 3)));
    if (lang !== "pseudo") {
      opsBox.appendChild(el("p", { class: "small muted" }, "Operation counts are measured on ✍️ Pseudocode — solve it there to see your counts next to the reference's."));
    } else if (!tests.length || !(p.solution && p.solution.pseudo)) {
      opsBox.appendChild(el("p", { class: "small muted" }, "No example input to count operations on."));
    } else {
      const sel = el("select", { "aria-label": "Example input for the operation count", class: "cmp-sel" });
      tests.forEach((t, i) => sel.appendChild(el("option", { value: String(i) }, (t.name || "Example " + (i + 1)) + " · " + shortArgs(p, t.args))));
      const out = el("div", { class: "cmp-out", "aria-live": "polite" });
      opsBox.appendChild(el("div", { class: "row cmp-ops-head" }, el("h3", null, "🧮 Who did less work?"), tests.length > 1 ? el("label", { class: "field" }, el("span", { class: "sr-only" }, "Example"), sel) : null));
      opsBox.appendChild(out);
      const run = () => {
        const t = tests[+sel.value || 0];
        out.innerHTML = "";
        out.appendChild(el("div", { class: "small muted" }, el("span", { class: "spinner sm", "aria-hidden": "true" }), " Counting operations…"));
        opts.grader.compare({ id: p.id, code: opts.code, args: t.args }).then((res) => {
          out.innerHTML = "";
          renderOps(out, p, t, res, +sel.value || 0);
        }).catch((err) => {
          out.innerHTML = "";
          out.appendChild(el("p", { class: "small muted" }, "Couldn't count the operations: " + ((err && (err.fatal || err.message)) || err)));
        });
      };
      sel.addEventListener("change", run);
      run();
    }
    host.appendChild(box);
    return box;
  };
  function shortArgs(p, args) {
    const s = (p.params || []).map((nm, i) => nm + " = " + Arena.show(args[i])).join(", ");
    return s.length > 48 ? s.slice(0, 46) + "…" : s;
  }
  function renderOps(out, p, t, res, idx) {
    const a = res.mine || {}, b = res.ref || {};
    if (a.error || b.error) {
      out.appendChild(el("p", { class: "small muted" }, a.error ? "Your pseudocode stopped on this input: " + a.error.message : "The reference stopped on this input: " + b.error.message));
      return;
    }
    const m = metricFor(p, a.ops, b.ops);
    const ya = (a.ops || {})[m.metric] || 0, yb = (b.ops || {})[m.metric] || 0;
    const word = (n) => Arena.metricText(m.metric, n, m.label).replace(/^[\d,]+ /, "");
    const verdict = ya === yb ? "a tie" : ya < yb ? "you did less work 🎉" : "the reference did less work";
    out.appendChild(el("p", { class: "cmp-verdict" },
      "On ", el("b", null, t.name || "Example " + (idx + 1)), ` your solution used `, el("b", { class: "mono" }, ya.toLocaleString()), ` ${word(ya)}, the reference used `, el("b", { class: "mono" }, yb.toLocaleString()), ` ${word(yb)} — ${verdict}.`));
    const max = Math.max(1, ya, yb);
    const bar = (label, v, cls) => el("div", { class: "cmp-bar" }, el("span", { class: "cmp-bl small" }, label),
      el("span", { class: "cmp-track", role: "img", "aria-label": label + ": " + v }, el("span", { class: "cmp-fill " + cls, style: { width: Math.max(2, (100 * v) / max) + "%" } })),
      el("span", { class: "mono small" }, v.toLocaleString()));
    out.appendChild(el("div", { class: "cmp-bars" }, bar("Yours", ya, "mine"), bar("Reference", yb, "ref")));
    const keys = Object.keys(Arena.METRIC).filter((k) => k !== "maxDepth" && ((a.ops || {})[k] || (b.ops || {})[k]));
    if (keys.length > 1) {
      const tb = el("tbody");
      keys.forEach((k) => tb.appendChild(el("tr", { class: k === m.metric ? "hot" : "" }, el("th", { scope: "row" }, Arena.METRIC[k][1]), el("td", { class: "mono" }, String((a.ops || {})[k] || 0)), el("td", { class: "mono" }, String((b.ops || {})[k] || 0)))));
      out.appendChild(el("details", { class: "cmp-more" }, el("summary", null, "Every counter"),
        el("table", { class: "vt cmp-table" }, el("thead", null, el("tr", null, el("th", { scope: "col" }, "Counter"), el("th", { scope: "col" }, "Yours"), el("th", { scope: "col" }, "Reference"))), tb)));
    }
  }
})();
