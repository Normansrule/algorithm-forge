/* Forge Arena — shared helpers (namespace window.Arena). Loaded after forge-kit.js. */
(function () {
  "use strict";
  const Arena = (window.Arena = window.Arena || {});
  const el = (...a) => Forge.el(...a);
  const svg = (...a) => Forge.svg(...a);
  Arena.el = el;
  Arena.svgEl = svg;

  Arena.esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  Arena.GITHUB = "https://github.com/Normansrule/algorithm-forge/blob/main/";

  /** Pretty-print a plain JS value the way the grader does. */
  Arena.show = function show(v, depth) {
    depth = depth || 0;
    if (v === undefined) return "(nothing)";
    if (v === null) return "null";
    if (v === Infinity) return "∞";
    if (v === -Infinity) return "-∞";
    if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(+v.toFixed(6));
    if (typeof v === "string") return depth ? JSON.stringify(v) : JSON.stringify(v);
    if (typeof v === "boolean") return String(v);
    if (Array.isArray(v)) {
      if (v.length > 40 && depth === 0) return "[" + v.slice(0, 20).map((x) => show(x, depth + 1)).join(", ") + `, … (${v.length} items)]`;
      return "[" + v.map((x) => show(x, depth + 1)).join(", ") + "]";
    }
    if (typeof v === "object") {
      if (v.__view) return show(v.base.slice(v.off, v.off + v.len), depth);
      if (v.__map) return "{" + v.__map.map(([k, x]) => show(k, depth + 1) + ": " + show(x, depth + 1)).join(", ") + "}";
      if (v.__set) return "{" + v.__set.map((x) => show(x, depth + 1)).join(", ") + "}";
      if (v.__pq) return "PQ[" + v.__pq.map(([k, x]) => show(x, depth + 1) + " (" + show(k, depth + 1) + ")").join(", ") + "]";
      return "{" + Object.keys(v).filter((k) => k !== "__type").map((k) => k + ": " + show(v[k], depth + 1)).join(", ") + "}";
    }
    return String(v);
  };

  Arena.levelName = (n) => {
    const L = (window.ForgeProblems && ForgeProblems.LEVELS || []).find((x) => x.n === n);
    return L ? L.name : "Level " + n;
  };
  Arena.chapterName = (c) => (window.ForgeProblems && ForgeProblems.CHAPTERS[c]) || "";

  /** Difficulty dots ●●○ */
  Arena.dots = function (d) {
    d = Math.max(1, Math.min(3, d || 1));
    const names = ["", "easy", "medium", "hard"];
    const box = el("span", { class: "dots d" + d, title: "Difficulty: " + names[d] + " (within its level)", "aria-label": "Difficulty " + d + " of 3" });
    for (let i = 1; i <= 3; i++) box.appendChild(el("i", { class: i <= d ? "on" : "" }));
    return box;
  };
  Arena.levelChip = (n) => el("span", { class: "chip lvlchip lv" + n }, el("b", { class: "lvl lvl-" + n }, "L" + n), " " + Arena.levelName(n));
  Arena.chapterChip = (c, withName) => el("span", { class: "chip steel", title: "Chapter " + c + " · " + Arena.chapterName(c) }, "Ch " + c + (withName ? " · " + Arena.chapterName(c) : ""));

  /* Acronyms that appear in topic names, spelled out. House rule: an acronym is written in full, with the acronym in
     parentheses, the first time it appears on a page — so the first topic chip that uses one shows the expansion, later
     ones show the short form with the expansion as a tooltip. AVL is a name, so it reads "AVL trees (Adelson-Velsky–Landis)". */
  Arena.GLOSSARY = {
    AVL: "Adelson-Velsky–Landis", BFS: "Breadth-First Search", BST: "Binary Search Tree", CNF: "Conjunctive Normal Form",
    DAG: "Directed Acyclic Graph", DFS: "Depth-First Search", DP: "Dynamic Programming", GCD: "Greatest Common Divisor",
    KMP: "Knuth–Morris–Pratt", LCM: "Least Common Multiple", LCS: "Longest Common Subsequence", LIS: "Longest Increasing Subsequence",
    LRU: "Least Recently Used", MST: "Minimum Spanning Tree", NP: "Nondeterministic Polynomial", SAT: "Satisfiability",
    SCC: "Strongly Connected Component", TSP: "Traveling Salesman Problem",
  };
  const ACRONYM = /\b[A-Z]{2,}\b/g;
  const NAME_ACRONYMS = ["AVL"];
  Arena.topicAcronyms = (t) => (String(t).match(ACRONYM) || []).filter((a) => Arena.GLOSSARY[a]);
  /** "DAG" → "Directed Acyclic Graph (DAG)", "NP-hard" → "Nondeterministic Polynomial (NP)-hard", "AVL trees" → "AVL trees (Adelson-Velsky–Landis)". */
  Arena.expandTopic = function (t) {
    let tail = "";
    const s = String(t).replace(ACRONYM, (a) => {
      const full = Arena.GLOSSARY[a];
      if (!full) return a;
      if (NAME_ACRONYMS.includes(a)) { tail += " (" + full + ")"; return a; }
      return full + " (" + a + ")";
    });
    return s + tail;
  };
  /** A topic chip. Pass one `seen` Set per page render: the first chip using an acronym spells it out, later ones abbreviate. */
  Arena.topicChip = function (t, seen, tag, attrs) {
    const acr = Arena.topicAcronyms(t);
    if (!acr.length) return el(tag || "span", Object.assign({ class: "chip topic" }, attrs), t);
    const full = Arena.expandTopic(t);
    const fresh = !seen || acr.some((a) => !seen.has(a));
    if (seen) acr.forEach((a) => seen.add(a));
    return el(tag || "span", Object.assign({ class: "chip topic" }, attrs), fresh ? full : el("abbr", { title: full }, t));
  };

  /** snake_case from CamelCase: MaxElement → max_element */
  Arena.snake = (s) => String(s).replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/([A-Z])([A-Z][a-z])/g, "$1_$2").toLowerCase();

  Arena.pythonStarter = function (p) {
    if (p.starter && p.starter.python) return p.starter.python;
    const name = Arena.snake(p.entry);
    const params = (p.params || []).map((x) => String(x).replace(/\[.*$/, "")).join(", ");
    const out = p.output && p.output.arg !== undefined ? `    # modify ${p.params[p.output.arg]} in place\n` : "    # return the answer\n";
    return `def ${name}(${params}):\n${out}    pass\n`;
  };
  Arena.starter = function (p, lang) {
    if (lang === "python") return Arena.pythonStarter(p);
    return (p.starter && p.starter[lang]) || "";
  };

  /** Is a value a flat list of scalars (drawable as a row of cells)? */
  Arena.isFlat = (v) => Array.isArray(v) && v.every((x) => x === null || ["number", "string", "boolean"].includes(typeof x));
  Arena.isGrid = (v) => Array.isArray(v) && v.length > 0 && v.length <= 12 && v.every((r) => Arena.isFlat(r) && r.length <= 16);

  /** Small HTML visual of an array: a row of cells with indexes. */
  Arena.cells = function (arr, opts) {
    opts = opts || {};
    const max = opts.max || 24;
    const box = el("span", { class: "cells", role: "img", "aria-label": (opts.label || "array") + " " + Arena.show(arr) });
    arr.slice(0, max).forEach((x, i) => {
      box.appendChild(el("span", { class: "cell" }, el("b", null, Arena.show(x, 1).replace(/^"(.*)"$/, "$1")), el("small", null, String(i))));
    });
    if (arr.length > max) box.appendChild(el("span", { class: "cell more" }, el("b", null, "…"), el("small", null, arr.length + "")));
    if (!arr.length) box.appendChild(el("span", { class: "cell empty" }, el("b", null, "∅"), el("small", null, "empty")));
    return box;
  };
  Arena.gridCells = function (m) {
    const t = el("table", { class: "mini-grid", role: "img", "aria-label": "matrix " + Arena.show(m) });
    m.forEach((row) => t.appendChild(el("tr", null, row.map((x) => el("td", null, Arena.show(x, 1))))));
    return t;
  };

  /** Metric labels for op counters. */
  Arena.METRIC = {
    keyComparisons: ["key comparison", "key comparisons"], comparisons: ["comparison", "comparisons"], steps: ["step", "steps"],
    arrayReads: ["array read", "array reads"], arrayWrites: ["array write", "array writes"], assignments: ["assignment", "assignments"],
    arithmetic: ["arithmetic op", "arithmetic ops"], calls: ["call", "calls"], swaps: ["swap", "swaps"], maxDepth: ["deep", "deep (recursion)"],
  };
  Arena.metricText = (metric, n, label) => {
    const m = Arena.METRIC[metric] || [metric, metric];
    const lbl = label ? (n === 1 ? String(label).replace(/s\b(?!.*s\b)/, "") : label) : (n === 1 ? m[0] : m[1]);
    return n.toLocaleString() + " " + lbl;
  };

  Arena.fmtClass = (c) => (c === "1" ? "Θ(1)" : "Θ(" + String(c).replace("2^n", "2ⁿ").replace("^2", "²").replace("^3", "³") + ")");

  Arena.qs = (k) => new URLSearchParams(location.search).get(k);

  Arena.debounce = function (fn, ms) {
    let t = null;
    const d = function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); };
    d.flush = function (...a) { clearTimeout(t); fn.apply(this, a); };
    return d;
  };

  /** Tiny accessible tab strip. items: [{id, label}]; returns {el, select(id), onChange} */
  Arena.tabStrip = function (items, opts) {
    opts = opts || {};
    const bar = el("div", { class: "tabs a-tabs" + (opts.cls ? " " + opts.cls : ""), role: "tablist", "aria-label": opts.label || "Tabs" });
    const btns = {};
    let cur = null;
    const api = { el: bar, onChange: null, get current() { return cur; } };
    items.forEach((it) => {
      const b = el("button", { role: "tab", type: "button", id: (opts.prefix || "tab-") + it.id, "aria-selected": "false", tabindex: "-1", "data-tab": it.id, title: it.title || null }, it.label);
      b.addEventListener("click", () => api.select(it.id, true));
      b.addEventListener("keydown", (e) => {
        const ids = items.filter((x) => !btns[x.id].hidden).map((x) => x.id);
        const k = ids.indexOf(it.id);
        let nxt = null;
        if (e.key === "ArrowRight") nxt = ids[(k + 1) % ids.length];
        else if (e.key === "ArrowLeft") nxt = ids[(k - 1 + ids.length) % ids.length];
        else if (e.key === "Home") nxt = ids[0];
        else if (e.key === "End") nxt = ids[ids.length - 1];
        if (nxt) { e.preventDefault(); e.stopPropagation(); api.select(nxt, true); btns[nxt].focus(); }
      });
      btns[it.id] = b;
      bar.appendChild(b);
    });
    api.btn = (id) => btns[id];
    api.select = function (id, user) {
      if (!btns[id]) return;
      cur = id;
      for (const k in btns) {
        const on = k === id;
        btns[k].classList.toggle("on", on);
        btns[k].setAttribute("aria-selected", on ? "true" : "false");
        btns[k].tabIndex = on ? 0 : -1;
      }
      if (api.onChange) api.onChange(id, !!user);
    };
    return api;
  };

  /** Toast-ish live announcement for screen readers. */
  let live = null;
  Arena.announce = function (msg) {
    if (!live) { live = el("div", { class: "sr-only", "aria-live": "polite", role: "status" }); document.body.appendChild(live); }
    live.textContent = "";
    setTimeout(() => { live.textContent = msg; }, 30);
  };

  Arena.download = function (name, text) {
    const blob = new Blob([text], { type: "application/json" });
    const a = el("a", { href: URL.createObjectURL(blob), download: name });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
})();
