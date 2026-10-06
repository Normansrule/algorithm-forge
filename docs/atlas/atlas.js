/* =====================================================================
   Algorithm Atlas — evolution ladders from the first idea to the
   research frontier. Renders docs/atlas.html from self.FORGE_ATLAS
   (docs/atlas/atlas-data.js). If that file is missing, it falls back to
   the small development fixture docs/atlas/atlas-fixture.js.

   Views (all driven by location.hash):
     ""                    family picker (grid)
     "#timeline"           every rung of every family on one year axis
     "#<family-id>"        one family's ladder, first rung selected
     "#<family-id>/<i>"    one family's ladder, rung i selected (0-based)
   ===================================================================== */
(function () {
  "use strict";

  /* ------------------------------------------------------------------
     1. Complexity bound parser (illustrative operation counts)
     Reads the first Θ(…), O(…) or Ω(…) in a time string and evaluates
     it with constants dropped. Works in natural-log space so 2^n and n!
     do not overflow. Any symbol it does not understand makes it give up
     (returns null) — it never guesses.
     ------------------------------------------------------------------ */
  const SUP = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-", "ᐟ": "/", "⁄": "/", "⋅": "*", "·": "*", "×": "*", "∙": "*" };
  // Graph families use a sparse graph, m = 2n: that is the regime the newer bounds were designed for
  // (e.g. O(m log^{2/3} n) beats O(m + n log n) only while m/n < log^{1/3} n, about 2.7 at n = 10^6).
  const N_VALUE = 1e6, M_VALUE = 2e6;

  function extractBound(s) {
    if (!s) return null;
    const re = /(Θ|Ω|O|Ο|θ)\s*\(/g;
    let m;
    while ((m = re.exec(s))) {
      // skip little-o / words ending in O (e.g. "IO(")
      const before = s[m.index - 1];
      if (before && /[A-Za-z]/.test(before)) continue;
      let depth = 0, i = m.index + m[0].length - 1;
      for (; i < s.length; i++) {
        if (s[i] === "(") depth++;
        else if (s[i] === ")") { depth--; if (depth === 0) break; }
      }
      if (depth !== 0) return null;
      return { sym: m[1], expr: s.slice(m.index + m[0].length, i).trim(), text: s.slice(m.index, i + 1) };
    }
    return null;
  }

  function tokenize(src) {
    // normalise unicode superscripts into ^(…), strip |V| bars, subscript ₂ on log
    let s = src.replace(/\|([A-Za-z])\|/g, "$1").replace(/log₂|log_2|log_\{2\}/g, "log").replace(/lg/g, "log");
    let out = "";
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if ("⁰¹²³⁴⁵⁶⁷⁸⁹⁻ᐟ⁄".includes(c)) {
        let run = "";
        while (i < s.length && "⁰¹²³⁴⁵⁶⁷⁸⁹⁻ᐟ⁄".includes(s[i])) run += SUP[s[i++]];
        i--; out += "^(" + run + ")";
      } else out += SUP[c] || c;
    }
    const toks = [];
    const words = ["log*", "log", "ln", "sqrt", "min", "max", "α"];
    let i = 0;
    while (i < out.length) {
      const c = out[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9.]/.test(c)) {
        let j = i; while (j < out.length && /[0-9.]/.test(out[j])) j++;
        const v = parseFloat(out.slice(i, j)); if (!isFinite(v)) return null;
        toks.push({ t: "num", v }); i = j; continue;
      }
      const w = words.find((w) => out.startsWith(w, i) && !(w === "ln" && /[a-z]/.test(out[i + 2] || "")));
      if (w) { toks.push({ t: "fn", v: w }); i += w.length; continue; }
      if (/[A-Za-z]/.test(c)) { toks.push({ t: "var", v: c }); i++; continue; }
      if ("+-*/^(){}√!,".includes(c)) { toks.push({ t: "op", v: c }); i++; continue; }
      return null; // unknown symbol (ε, σ, ~, …): refuse
    }
    return toks;
  }

  // log-space helpers: a value x is carried as L = ln x
  const lnAdd = (a, b) => { const hi = Math.max(a, b), lo = Math.min(a, b); return hi === -Infinity ? hi : hi + Math.log1p(Math.exp(lo - hi)); };
  const lnSub = (a, b) => (b >= a ? NaN : a + Math.log1p(-Math.exp(b - a)));
  const LN2 = Math.LN2;
  // ln(log2(x)) where x = e^L; logs below 1 are clamped to 1 (the usual convention)
  const lnLog2 = (L) => { const v = L / LN2; return v <= 1 ? 0 : Math.log(v); };
  function lnFactorial(L) { // Stirling for x = e^L
    const x = Math.exp(L);
    if (!isFinite(x)) return NaN;
    if (x < 2) return 0;
    return x * Math.log(x) - x + 0.5 * Math.log(2 * Math.PI * x);
  }

  function evaluate(expr, env) {
    const toks = tokenize(expr);
    if (!toks || !toks.length) return null;
    let p = 0;
    const peek = () => toks[p];
    const isOp = (v) => toks[p] && toks[p].t === "op" && toks[p].v === v;
    const fail = () => { throw new Error("parse"); };

    function parseExpr() {
      let a = parseTerm();
      while (isOp("+") || isOp("-")) {
        const op = toks[p++].v, b = parseTerm();
        a = op === "+" ? lnAdd(a, b) : lnSub(a, b);
      }
      return a;
    }
    function startsFactor(t) {
      return t && (t.t === "num" || t.t === "var" || t.t === "fn" || (t.t === "op" && "({√".includes(t.v)));
    }
    function parseTerm() {
      let a = parseFactor();
      for (;;) {
        if (isOp("*")) { p++; a += parseFactor(); }
        else if (isOp("/")) { p++; a -= parseFactor(); }
        else if (startsFactor(peek())) a += parseFactor(); // implicit product: "n log n", "VE"
        else break;
      }
      return a;
    }
    // exponent: returns a plain real number
    function parseExponent() {
      const t = peek();
      if (!t) fail();
      if (t.t === "op" && (t.v === "(" || t.v === "{")) {
        const close = t.v === "(" ? ")" : "}"; p++;
        const L = parseExpr();
        if (!isOp(close)) fail(); p++;
        return Math.exp(L);
      }
      if (t.t === "op" && t.v === "-") { p++; return -parseExponent(); }
      if (t.t === "num") { p++; return t.v; }
      if (t.t === "var") { p++; return Math.exp(variable(t.v)); }
      fail();
    }
    function parsePostfix(L) {
      for (;;) {
        if (isOp("^")) { p++; const e = parseExponent(); if (!isFinite(e)) fail(); L = L * e; }
        else if (isOp("!")) { p++; L = lnFactorial(L); }
        else return L;
      }
    }
    function parseFactor() {
      return parsePostfix(parseAtom());
    }
    function parseArg() { // argument of log / sqrt without parentheses: one atom with its own power, no implicit products
      if (isOp("(") || isOp("{")) return parseFactor();
      return parsePostfix(parseAtom());
    }
    function variable(v) {
      if (env[v] == null) fail();
      return Math.log(env[v]);
    }
    function parseAtom() {
      const t = toks[p++];
      if (!t) fail();
      if (t.t === "num") return t.v <= 0 ? fail() : Math.log(t.v);
      if (t.t === "var") return variable(t.v);
      if (t.t === "op" && (t.v === "(" || t.v === "{")) {
        const close = t.v === "(" ? ")" : "}";
        const L = parseExpr();
        if (!isOp(close)) fail(); p++;
        return L;
      }
      if (t.t === "op" && t.v === "√") return parseArg() / 2;
      if (t.t === "fn") {
        if (t.v === "sqrt") return parseArg() / 2;
        if (t.v === "α") { parseArg(); return Math.log(4); } // inverse Ackermann: at most 4 for any input that fits in the universe
        if (t.v === "min" || t.v === "max") {
          if (!isOp("(")) fail(); p++;
          const vals = [parseExpr()];
          while (isOp(",")) { p++; vals.push(parseExpr()); }
          if (!isOp(")")) fail(); p++;
          return t.v === "min" ? Math.min(...vals) : Math.max(...vals);
        }
        // log, ln, log*: optional power right after the name (log^2 n, log^{2/3} n, log² n)
        let pow = 1;
        if (isOp("^")) { p++; pow = parseExponent(); }
        if (t.v === "log*") { // iterated logarithm
          let x = Math.exp(parseArg()), k = 0;
          while (x > 1 && k < 10) { x = Math.log2(x); k++; }
          return Math.log(Math.max(1, k)) * pow;
        }
        let inner;
        if (peek() && peek().t === "fn" && (peek().v === "log" || peek().v === "ln")) inner = parseAtom(); // log log n
        else inner = parseArg();
        const lv = t.v === "ln" ? (inner <= 1 ? 0 : Math.log(inner)) : lnLog2(inner);
        return lv * pow;
      }
      fail();
    }
    try {
      const L = parseExpr();
      if (p !== toks.length || !isFinite(L) && L !== Infinity) return null;
      if (isNaN(L)) return null;
      return L;
    } catch (e) {
      return null;
    }
  }

  /** Illustrative cost of a rung's time bound at n = 10^6 (graphs: n = V = 10^6, m = E = 2·10^6, a sparse graph). */
  function boundOps(time, graphLike) {
    const b = extractBound(time);
    if (!b) return null;
    if (/o\(1\)|polylog|poly\b/.test(b.expr)) return null;
    const env = graphLike ? { n: N_VALUE, N: N_VALUE, V: N_VALUE, m: M_VALUE, E: M_VALUE } : { n: N_VALUE, N: N_VALUE };
    const L = evaluate(b.expr, env);
    if (L == null || !isFinite(L)) return null;
    return { text: b.text, log10: Math.max(0, L / Math.LN10) };
  }

  /* ------------------------------------------------------------------
     2. Small helpers
     ------------------------------------------------------------------ */
  const el = (tag, attrs, ...kids) => Forge.el(tag, attrs, ...kids);
  const $ = (sel, root) => (root || document).querySelector(sel);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  /** Escape a bound for HTML and lift ^{…} / ^2 exponents into <sup>. */
  function prettyBound(t) {
    return esc(t)
      .replace(/\^\{([^{}]{1,24})\}/g, "<sup>$1</sup>")
      .replace(/\^\(([^()]{1,24})\)/g, "<sup>$1</sup>")
      .replace(/\^([0-9.]+|[A-Za-zωε])/g, "<sup>$1</sup>");
  }
  const GH = "https://github.com/Normansrule/algorithm-forge/blob/main/";
  const SUPD = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻" };
  const supNum = (k) => String(k).split("").map((c) => SUPD[c] || c).join("");
  function fmtOps(log10) {
    log10 = Math.round(log10 * 1e6) / 1e6;
    if (log10 < 3) return "≈ " + Math.round(Math.pow(10, log10)).toLocaleString("en-US");
    if (log10 > 30) return "≈ 10" + supNum(Math.round(log10));
    let e = Math.floor(log10), m = Math.pow(10, log10 - e);
    if (m >= 9.95) { e++; m = 1; }
    const mm = m.toFixed(1).replace(/\.0$/, "");
    return "≈ " + (mm === "1" ? "" : mm + " × ") + "10" + supNum(e);
  }
  function fmtRatio(log10) {
    if (log10 < 0.05) return null;
    if (log10 < 6) { // two significant figures: the chart is illustrative, so no false precision
      const r = Math.pow(10, log10);
      if (r < 10) return r.toFixed(1).replace(/\.0$/, "") + "×";
      const k = Math.pow(10, Math.floor(Math.log10(r)) - 1);
      return (Math.round(r / k) * k).toLocaleString("en-US") + "×";
    }
    return "10" + supNum(Math.round(log10)) + "×";
  }

  const STAGE_DEFAULTS = [
    { id: "first", label: "First idea" },
    { id: "classic", label: "Classic" },
    { id: "advanced", label: "Advanced" },
    { id: "production", label: "In production" },
    { id: "frontier", label: "Research frontier" }
  ];
  const STAGE_HINT = {
    first: "The direct approach you could invent yourself.",
    classic: "The efficient algorithm every textbook teaches.",
    advanced: "The refinement specialists reach for.",
    production: "What real libraries and systems ship today.",
    frontier: "Recent results from the research literature."
  };
  const KNOWN_STAGES = ["first", "classic", "advanced", "production", "frontier"];
  const stageVar = (id) => (KNOWN_STAGES.includes(id) ? `var(--st-${id})` : "var(--muted)");

  /* ------------------------------------------------------------------
     3. Glyphs (48 × 48, stroke = currentColor, accent = --g-accent)
     ------------------------------------------------------------------ */
  const A = "var(--g-accent)";
  const GLYPHS = {
    sort: `<rect x="7" y="31" width="7" height="10" rx="1.5"/><rect x="16" y="24" width="7" height="17" rx="1.5"/><rect x="25" y="16" width="7" height="25" rx="1.5"/><rect x="34" y="7" width="7" height="34" rx="1.5" fill="${A}" stroke="${A}"/>`,
    search: `<rect x="5" y="31" width="38" height="9" rx="2"/><path d="M14.5 31v9M24 31v9M33.5 31v9"/><rect x="24" y="31" width="9.5" height="9" fill="${A}" stroke="${A}"/><circle cx="20" cy="15" r="8"/><path d="M26 21l5 5" stroke-width="3"/>`,
    graph: `<path d="M11 35L21 12M21 12L38 19M11 35L31 38M31 38L38 19" opacity=".55"/><path d="M11 35L21 12L38 19" stroke="${A}" stroke-width="2.8"/><circle cx="11" cy="35" r="4.5" fill="var(--panel)"/><circle cx="21" cy="12" r="4.5" fill="var(--panel)"/><circle cx="31" cy="38" r="4.5" fill="var(--panel)"/><circle cx="38" cy="19" r="4.5" fill="${A}" stroke="${A}"/>`,
    flow: `<circle cx="8" cy="24" r="4.5"/><circle cx="40" cy="24" r="4.5" fill="${A}" stroke="${A}"/><path d="M12 22C20 10 28 10 36 22" stroke="${A}" stroke-width="3"/><path d="M12 26C20 38 28 38 36 26" opacity=".6"/><path d="M31 15l5 7-8.5 0" fill="none" stroke="${A}"/>`,
    tree: `<path d="M24 10L14 24M24 10L34 24M14 24L8 38M14 24L20 38M34 24L30 38"/><circle cx="24" cy="10" r="4.5" fill="var(--panel)"/><circle cx="14" cy="24" r="4.5" fill="var(--panel)"/><circle cx="34" cy="24" r="4.5" fill="var(--panel)"/><circle cx="8" cy="38" r="4" fill="var(--panel)"/><circle cx="20" cy="38" r="4" fill="${A}" stroke="${A}"/><circle cx="30" cy="38" r="4" fill="var(--panel)"/>`,
    string: `<rect x="4" y="27" width="40" height="10" rx="2"/><path d="M12 27v10M20 27v10M28 27v10M36 27v10"/><rect x="20" y="27" width="16" height="10" fill="${A}" stroke="${A}" opacity=".9"/><rect x="20" y="11" width="16" height="10" rx="2" stroke="${A}"/><path d="M28 11v10" stroke="${A}"/><path d="M28 21v4" stroke-dasharray="2 2"/>`,
    hash: `<path d="M12 9L9 39M24 9L21 39M5 18h23M4 30h23"/><path d="M31 14h12v6H31zM31 22h12v6H31zM31 30h12v6H31z" opacity=".65"/><path d="M31 22h12v6H31z" fill="${A}" stroke="${A}"/>`,
    filter: `<path d="M6 10h36L28 26v12l-8 4V26z"/><circle cx="14" cy="5" r="0" /><path d="M20 26v14" opacity="0"/><circle cx="24" cy="44" r="0"/><rect x="9" y="12" width="4" height="4" fill="${A}" stroke="none"/><rect x="17" y="12" width="4" height="4" fill="currentColor" stroke="none" opacity=".4"/><rect x="25" y="12" width="4" height="4" fill="${A}" stroke="none"/><rect x="33" y="12" width="4" height="4" fill="currentColor" stroke="none" opacity=".4"/>`,
    vector: `<path d="M6 42V6M6 42h36" opacity=".5"/><circle cx="16" cy="30" r="2.5" fill="currentColor"/><circle cx="34" cy="12" r="2.5" fill="currentColor"/><circle cx="38" cy="32" r="2.5" fill="currentColor"/><circle cx="22" cy="14" r="2.5" fill="currentColor"/><circle cx="27" cy="25" r="9" stroke="${A}" stroke-dasharray="3 2.5"/><circle cx="27" cy="25" r="3" fill="${A}" stroke="${A}"/><path d="M27 25L22 14" stroke="${A}"/>`,
    matrix: `<rect x="7" y="7" width="34" height="34" rx="2"/><path d="M18.3 7v34M29.6 7v34M7 18.3h34M7 29.6h34" opacity=".6"/><path d="M7 7h11.3v11.3H7zM18.3 18.3h11.3v11.3H18.3zM29.6 29.6H41V41H29.6z" fill="${A}" stroke="${A}" opacity=".9"/>`,
    number: `<circle cx="24" cy="24" r="17"/><path d="M24 7v4M24 37v4M7 24h4M37 24h4M12 12l2.8 2.8M33.2 33.2L36 36M36 12l-2.8 2.8M14.8 33.2L12 36" opacity=".6"/><path d="M24 24L33 15" stroke="${A}" stroke-width="3"/><circle cx="24" cy="24" r="2.5" fill="${A}" stroke="${A}"/>`,
    stream: `<path d="M3 28c4-10 7-10 11 0s7 10 11 0 7-10 11 0 7 10 9 4"/><rect x="21" y="11" width="16" height="26" rx="3" stroke="${A}" stroke-width="2.6"/><path d="M41 24h4M43 22l2 2-2 2" opacity=".6"/>`,
    heap: `<path d="M24 8L15 22M24 8L33 22M15 22L9 37M15 22L21 37M33 22L27 37M33 22L39 37" opacity=".6"/><circle cx="24" cy="8" r="5" fill="${A}" stroke="${A}"/><circle cx="15" cy="22" r="4.5" fill="var(--panel)"/><circle cx="33" cy="22" r="4.5" fill="var(--panel)"/><circle cx="9" cy="37" r="4" fill="var(--panel)"/><circle cx="21" cy="37" r="4" fill="var(--panel)"/><circle cx="27" cy="37" r="4" fill="var(--panel)"/><circle cx="39" cy="37" r="4" fill="var(--panel)"/>`,
    geometry: `<path d="M8 30L17 9L39 13L42 33L22 41Z" stroke="${A}" stroke-width="2.6" fill="none"/><circle cx="8" cy="30" r="2.6" fill="currentColor"/><circle cx="17" cy="9" r="2.6" fill="currentColor"/><circle cx="39" cy="13" r="2.6" fill="currentColor"/><circle cx="42" cy="33" r="2.6" fill="currentColor"/><circle cx="22" cy="41" r="2.6" fill="currentColor"/><circle cx="22" cy="24" r="2" fill="currentColor" opacity=".55"/><circle cx="30" cy="28" r="2" fill="currentColor" opacity=".55"/><circle cx="27" cy="18" r="2" fill="currentColor" opacity=".55"/>`,
    optimize: `<path d="M5 9c5 26 12 31 19 31s14-5 19-31"/><path d="M9 20l6 9 5 6 4 4" stroke="${A}" stroke-dasharray="2.5 3"/><circle cx="9" cy="20" r="2.5" fill="currentColor"/><circle cx="24" cy="40" r="3.5" fill="${A}" stroke="${A}"/>`
  };
  function glyphSVG(name, cls) {
    const body = GLYPHS[name] || `<circle cx="24" cy="24" r="14"/><circle cx="24" cy="24" r="4" fill="${A}" stroke="${A}"/>`;
    return `<svg class="${cls || "glyph-ico"}" viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  }

  /* ------------------------------------------------------------------
     4. Data normalisation (tolerant of missing optional fields)
     ------------------------------------------------------------------ */
  let DATA = null, STAGES = [], STAGE_IX = {}, FAMS = [], FAM_BY_ID = {}, USING_FIXTURE = false;

  const asList = (x) => (x == null || x === "" ? [] : Array.isArray(x) ? x.filter((v) => v != null && v !== "") : [x]);
  function normSim(s) {
    s = String(s).replace(/^\.?\/?(docs\/)?/, "");
    if (!s.includes("/") && /\.html(#.*)?$/.test(s)) s = "sims/" + s;
    return s;
  }
  function yearOf(y) {
    if (typeof y === "number" && isFinite(y)) return y;
    const m = String(y == null ? "" : y).match(/\d{4}/);
    return m ? +m[0] : null;
  }
  function normalise(raw) {
    STAGES = (Array.isArray(raw.stages) && raw.stages.length ? raw.stages : STAGE_DEFAULTS).map((s, i) => ({
      id: String(s.id || "stage" + i), label: s.label || s.id || "Stage " + (i + 1)
    }));
    STAGE_IX = {}; STAGES.forEach((s, i) => (STAGE_IX[s.id] = i));
    FAMS = (raw.families || []).filter((f) => f && f.id && Array.isArray(f.rungs) && f.rungs.length).map((f, fi) => {
      const graphLike = /^(graph|flow)$/.test(f.glyph || "");
      const rungs = f.rungs.map((r, ri) => {
        const links = r.links || {};
        const st = STAGE_IX[r.stage] != null ? r.stage : null;
        return {
          i: ri, raw: r,
          name: r.name || "Rung " + (ri + 1),
          year: r.year != null && r.year !== "" ? r.year : null,
          yearNum: yearOf(r.year),
          stage: st || (r.stage ? String(r.stage) : ""),
          stageIx: st ? STAGE_IX[st] : -1,
          time: r.time || "", space: r.space || "",
          idea: r.idea || "", limit: r.limit || "", usedIn: r.usedIn || r.used_in || "",
          lessons: asList(links.lesson), sims: asList(links.sim).map(normSim), arena: asList(links.arena), book: asList(links.book),
          refs: asList(r.refs).map((x) => (typeof x === "string" ? { text: x, url: "" } : { text: x.text || x.title || "", url: x.url || "" })).filter((x) => x.text),
          ops: boundOps(r.time || "", graphLike || /[VE]/.test(String(r.time || "").replace(/[^A-Za-z]/g, "").replace(/log|sqrt|ln|max|min/g, "")))
        };
      });
      const years = rungs.map((r) => r.yearNum).filter((y) => y != null);
      const frontier = rungs.filter((r) => r.stage === "frontier" && r.yearNum != null).map((r) => r.yearNum);
      return {
        fi, id: String(f.id), title: f.title || f.id, glyph: f.glyph || "", question: f.question || "", blurb: f.blurb || "",
        rungs, minYear: years.length ? Math.min(...years) : null, maxYear: years.length ? Math.max(...years) : null,
        frontierYear: frontier.length ? Math.max(...frontier) : null,
        hue: 0
      };
    });
    // evenly spaced hues for the timeline's colour-by-family mode, starting near the brand steel
    FAMS.forEach((f, i) => (f.hue = Math.round((205 + (i * 360) / Math.max(1, FAMS.length)) % 360)));
    FAM_BY_ID = {}; FAMS.forEach((f) => (FAM_BY_ID[f.id] = f));
  }

  /* ------------------------------------------------------------------
     5. State + routing
     ------------------------------------------------------------------ */
  const state = { view: "families", fam: null, rung: 0, q: "", stage: "all", tlColour: "family" };

  function parseHash() {
    const h = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (!h) return { view: "families" };
    if (h === "timeline") return { view: "timeline" };
    const [id, ix] = h.split("/");
    const f = FAM_BY_ID[id];
    if (!f) return { view: "families", missing: id };
    let r = parseInt(ix, 10);
    if (!(r >= 0 && r < f.rungs.length)) r = 0;
    return { view: "family", fam: f, rung: r };
  }
  function go(hash) {
    if (location.hash === hash || (hash === "" && !location.hash)) route();
    else location.hash = hash;
  }
  function setRung(i, focus) {
    const f = state.fam;
    if (!f) return;
    i = Math.max(0, Math.min(f.rungs.length - 1, i));
    state.rung = i;
    try { history.replaceState(null, "", "#" + f.id + "/" + i); } catch (e) { /* file:// */ }
    paintTrack();
    renderDetail();
    paintDrop();
    if (focus) { const b = document.querySelector(`.rung-btn[data-i="${i}"]`); if (b) b.focus({ preventScroll: false }); }
  }

  function route() {
    const r = parseHash();
    const from = state.view;
    state.view = r.view;
    $("#atlas-missing").hidden = !r.missing;
    if (r.missing) $("#atlas-missing").textContent = `There is no family called “${r.missing}”. Pick one below.`;
    $("#grid-view").hidden = r.view !== "families";
    $("#timeline-view").hidden = r.view !== "timeline";
    $("#family-view").hidden = r.view !== "family";
    $("#toolbar").hidden = r.view === "family";
    document.querySelectorAll("[data-view]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === (r.view === "family" ? "families" : r.view))));
    if (r.view === "family") {
      const changed = state.fam !== r.fam;
      state.fam = r.fam; state.rung = r.rung;
      renderFamily();
      document.title = r.fam.title + " · Algorithm Atlas · Algorithm Forge";
      if (changed) $("#family-view").scrollIntoView({ block: "start" });
    } else {
      state.fam = null;
      document.title = "Algorithm Atlas · Algorithm Forge";
      if (r.view === "timeline") renderTimeline(); else renderGrid();
      if (from === "family") $("#toolbar").scrollIntoView({ block: "start" });
    }
  }

  /* ------------------------------------------------------------------
     6. Hero, legend, toolbar
     ------------------------------------------------------------------ */
  function renderHero() {
    const rungs = FAMS.reduce((a, f) => a + f.rungs.length, 0);
    const years = FAMS.flatMap((f) => [f.minYear, f.maxYear]).filter((y) => y != null);
    $("#hero-stats").textContent = FAMS.length
      ? `${FAMS.length} families, ${rungs} rungs` + (years.length ? `, from ${Math.min(...years)} to ${Math.max(...years)}.` : ".")
      : "";
    const ol = $("#stage-legend");
    ol.innerHTML = "";
    STAGES.forEach((s, i) => {
      ol.appendChild(el("li", { style: `--sc:${stageVar(s.id)}` },
        el("span", { class: "sl-num", "aria-hidden": "true" }, String(i + 1)),
        el("span", { class: "sl-text" },
          el("b", null, s.label),
          STAGE_HINT[s.id] ? el("span", null, STAGE_HINT[s.id]) : null)));
    });
    // hero art labels follow the data's stage labels
    document.querySelectorAll("#hero-art [data-stage-label]").forEach((t) => {
      const s = STAGES[+t.dataset.stageLabel];
      if (s) t.textContent = s.label;
    });
  }

  function renderToolbar() {
    const chips = $("#stage-chips");
    chips.innerHTML = "";
    const mk = (id, label) => el("button", {
      type: "button", class: "st-chip", "data-stage": id, "aria-pressed": String(state.stage === id), style: id === "all" ? null : `--sc:${stageVar(id)}`,
      onclick: () => { state.stage = id; chips.querySelectorAll(".st-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.stage === id))); refresh(); }
    }, id === "all" ? null : el("i", { "aria-hidden": "true" }), label);
    chips.appendChild(mk("all", "Every stage"));
    STAGES.forEach((s) => chips.appendChild(mk(s.id, s.label)));
    const q = $("#atlas-search");
    q.addEventListener("input", () => { state.q = q.value.trim(); refresh(); });
    document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => go(b.dataset.view === "timeline" ? "#timeline" : "")));
  }
  function refresh() {
    if (state.view === "families") renderGrid();
    else if (state.view === "timeline") renderTimeline();
  }

  /* ------------------------------------------------------------------
     7. Family picker
     ------------------------------------------------------------------ */
  function matchQuery(f, q) {
    if (!q) return { ok: true };
    const n = q.toLowerCase();
    if ([f.title, f.question, f.blurb, f.id].some((s) => s.toLowerCase().includes(n))) return { ok: true };
    const r = f.rungs.find((r) => r.name.toLowerCase().includes(n) || r.idea.toLowerCase().includes(n));
    return r ? { ok: true, rung: r } : { ok: false };
  }
  function ladderSpark(f) {
    const n = f.rungs.length, w = 100 / n;
    return `<svg class="fc-ladder" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">` + f.rungs.map((r, i) => {
      const h = 6 + (22 * (i + 1)) / n;
      const dim = state.stage !== "all" && r.stage !== state.stage ? ' opacity=".22"' : "";
      return `<rect x="${(i * w + w * 0.1).toFixed(2)}" y="${(28 - h).toFixed(2)}" width="${(w * 0.8).toFixed(2)}" height="${h.toFixed(2)}" rx="1.2" fill="${stageVar(r.stage)}"${dim}/>`;
    }).join("") + `</svg>`;
  }
  function renderGrid() {
    const grid = $("#fam-grid");
    grid.innerHTML = "";
    let shown = 0;
    FAMS.forEach((f) => {
      if (state.stage !== "all" && !f.rungs.some((r) => r.stage === state.stage)) return;
      const m = matchQuery(f, state.q);
      if (!m.ok) return;
      shown++;
      const top = f.rungs[f.rungs.length - 1];
      const chip = f.frontierYear != null
        ? `<span class="yr-chip" style="--sc:var(--st-frontier)">Frontier ${f.frontierYear}</span>`
        : (f.maxYear != null ? `<span class="yr-chip quiet">Newest ${f.maxYear}</span>` : "");
      const a = el("a", { class: "fam-card", href: "#" + encodeURIComponent(f.id), style: `--g-accent:${stageVar(top.stage)}`, html:
        `<div class="fc-head"><span class="fc-glyph">${glyphSVG(f.glyph)}</span>${ladderSpark(f)}</div>` +
        `<h3>${esc(f.title)}</h3>` +
        (f.question ? `<p class="fc-q">${esc(f.question)}</p>` : "") +
        (m.rung ? `<p class="fc-hit">Includes <b>${esc(m.rung.name)}</b></p>` : "") +
        `<div class="fc-meta"><span>${f.rungs.length} rungs${f.minYear != null ? ", since " + f.minYear : ""}</span>${chip}</div>` });
      a.setAttribute("aria-label", `${f.title}: ${f.rungs.length} rungs. ${f.question}`);
      grid.appendChild(a);
    });
    $("#grid-empty").hidden = shown > 0;
    $("#grid-count").textContent = shown === FAMS.length ? `${shown} families` : `${shown} of ${FAMS.length} families`;
  }

  /* ------------------------------------------------------------------
     8. Family view: track, detail, complexity drop
     ------------------------------------------------------------------ */
  function renderFamily() {
    const f = state.fam, ix = FAMS.indexOf(f);
    const prev = FAMS[(ix - 1 + FAMS.length) % FAMS.length], next = FAMS[(ix + 1) % FAMS.length];
    const host = $("#family-view");
    host.style.setProperty("--g-accent", stageVar(f.rungs[f.rungs.length - 1].stage));
    const span = f.minYear != null ? (f.minYear === f.maxYear ? `${f.minYear}` : `${f.minYear} to ${f.maxYear}`) : "";
    host.innerHTML = `
      <nav class="fam-nav" aria-label="Families">
        <a class="btn ghost sm" href="#">All families</a>
        <span class="fam-nav-sp"></span>
        ${FAMS.length > 1 ? `<a class="btn ghost sm" href="#${esc(prev.id)}" aria-label="Previous family: ${esc(prev.title)}">‹ <span class="nv-long">${esc(prev.title)}</span><span class="nv-short">Previous</span></a>
        <a class="btn ghost sm" href="#${esc(next.id)}" aria-label="Next family: ${esc(next.title)}"><span class="nv-long">${esc(next.title)}</span><span class="nv-short">Next</span> ›</a>` : ""}
      </nav>
      <header class="fam-head">
        <span class="fh-glyph">${glyphSVG(f.glyph)}</span>
        <div class="fh-text">
          <h2 id="fam-title">${esc(f.title)}</h2>
          ${f.question ? `<p class="fh-q">${esc(f.question)}</p>` : ""}
          ${f.blurb ? `<p class="fh-blurb">${esc(f.blurb)}</p>` : ""}
          <p class="fh-meta">${f.rungs.length} rungs${span ? ", " + span : ""}. Use <kbd>←</kbd> <kbd>→</kbd> to climb, <kbd>Esc</kbd> for all families.</p>
        </div>
      </header>
      <div class="track-wrap"><ol class="track" id="track" aria-labelledby="fam-title" style="--n:${f.rungs.length}"></ol></div>
      <div class="fam-body">
        <article class="detail" id="detail" aria-live="polite"></article>
        <aside class="drop" id="drop" aria-labelledby="drop-title"></aside>
      </div>`;
    const track = $("#track");
    f.rungs.forEach((r, i) => {
      const nextR = f.rungs[i + 1];
      const stLabel = r.stageIx >= 0 ? STAGES[r.stageIx].label : (r.stage || "Unstaged");
      const li = el("li", { class: "rung", style: `--sc:${stageVar(r.stage)};--nc:${stageVar(nextR ? nextR.stage : r.stage)}` });
      const b = el("button", {
        type: "button", class: "rung-btn", "data-i": String(i),
        "aria-label": `Rung ${i + 1} of ${f.rungs.length}: ${r.name}${r.year != null ? ", " + r.year : ""}, ${stLabel}`,
        onclick: () => setRung(i, false), html:
          `<span class="r-dot" aria-hidden="true"><span>${i + 1}</span></span>` +
          `<span class="r-body"><span class="r-stage">${esc(stLabel)}</span>` +
          `<span class="r-name">${esc(r.name)}</span>` +
          `<span class="r-meta">${r.year != null ? esc(r.year) : "Year not recorded"}</span>` +
          (r.time ? `<span class="r-time">${prettyBound(r.time)}</span>` : "") + `</span>`
      });
      li.appendChild(b);
      track.appendChild(li);
    });
    paintTrack();
    renderDetail();
    renderDrop();
  }
  function paintTrack() {
    const f = state.fam;
    document.querySelectorAll("#track .rung").forEach((li, i) => {
      const on = i === state.rung;
      li.classList.toggle("on", on);
      li.classList.toggle("dim", state.stage !== "all" && f.rungs[i].stage !== state.stage);
      li.classList.toggle("past", i < state.rung);
      const b = li.firstChild;
      b.setAttribute("aria-current", on ? "step" : "false");
      b.tabIndex = on ? 0 : -1; // roving tab stop; arrows move between rungs
    });
  }
  function linkRow(r) {
    const out = [];
    r.lessons.forEach((l) => {
      const path = String(l).replace(/^\.?\/?/, "");
      const name = (path.match(/lessons\/(\d+)-([^/]+)/) || []);
      const words = name.length ? name[2].replace(/-/g, " ") : "";
      const label = name.length ? `Lesson ${+name[1]}: ${words.charAt(0).toUpperCase() + words.slice(1)}` : "Lesson";
      out.push(`<a class="lk lk-lesson" href="${esc(/^https?:/.test(path) ? path : GH + path)}" target="_blank" rel="noopener">${esc(label)}</a>`);
    });
    r.sims.forEach((s) => {
      const nm0 = s.replace(/^sims\//, "").replace(/\.html.*$/, "").replace(/-/g, " ");
      const nm = nm0.charAt(0).toUpperCase() + nm0.slice(1);
      out.push(`<a class="lk lk-sim" href="${esc(s)}">Simulation: ${esc(nm)}</a>`);
    });
    r.arena.forEach((id) => out.push(`<a class="lk lk-arena" href="arena/problem.html?id=${encodeURIComponent(id)}">Arena: ${esc(id)}</a>`));
    r.book.forEach((b) => out.push(`<span class="lk lk-book">Textbook: ${esc(b)}</span>`));
    return out.join("");
  }
  function renderDetail() {
    const f = state.fam, r = f.rungs[state.rung], host = $("#detail");
    const nextR = f.rungs[state.rung + 1];
    const stLabel = r.stageIx >= 0 ? STAGES[r.stageIx].label : (r.stage || "Unstaged");
    host.style.setProperty("--sc", stageVar(r.stage));
    const rows = [["Time", r.time], ["Space", r.space], ["Model", r.raw.model], ["Year", r.year], ["Stage", stLabel]].filter((x) => x[1] != null && x[1] !== "");
    const links = linkRow(r);
    host.innerHTML = `
      <div class="d-top">
        <span class="d-step">Rung ${state.rung + 1} of ${f.rungs.length}</span>
        <span class="d-stage">${esc(stLabel)}</span>
      </div>
      <h3 class="d-name">${esc(r.name)}${r.year != null ? ` <span class="d-year">${esc(r.year)}</span>` : ""}</h3>
      ${r.idea ? `<p class="d-idea">${esc(r.idea)}</p>` : ""}
      <div class="d-grid">
        <div class="d-col">
          ${r.limit ? `<section class="d-sec d-limit"><h4>${nextR ? "Why the next rung exists" : "What is still open"}</h4><p>${esc(r.limit)}</p>${nextR ? `<button type="button" class="d-next" data-go="${state.rung + 1}">Next: ${esc(nextR.name)}</button>` : ""}</section>` : (nextR ? `<button type="button" class="d-next" data-go="${state.rung + 1}">Next: ${esc(nextR.name)}</button>` : "")}
          ${r.usedIn ? `<section class="d-sec"><h4>Where it runs today</h4><p>${esc(r.usedIn)}</p></section>` : ""}
        </div>
        <div class="d-col">
          ${rows.length ? `<section class="d-sec"><h4>Complexity</h4><table class="d-table"><tbody>${rows.map(([k, v]) => `<tr><th scope="row">${k}</th><td${k === "Time" || k === "Space" ? ' class="mono"' : ""}>${k === "Time" || k === "Space" ? prettyBound(v) : esc(v)}</td></tr>`).join("")}</tbody></table></section>` : ""}
        </div>
      </div>
      ${links ? `<section class="d-sec"><h4>Practise and explore</h4><div class="d-links">${links}</div></section>` : ""}
      ${r.refs.length ? `<section class="d-sec d-refs"><h4>References</h4><ol>${r.refs.map((x) => `<li>${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.text)}</a>` : esc(x.text)}</li>`).join("")}</ol></section>` : ""}
      <div class="d-pager">
        <button type="button" class="btn sm" data-go="${state.rung - 1}" ${state.rung === 0 ? "disabled" : ""}>‹ Previous rung</button>
        <button type="button" class="btn sm" data-go="${state.rung + 1}" ${nextR ? "" : "disabled"}>Next rung ›</button>
      </div>`;
    host.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => setRung(+b.dataset.go, true)));
  }

  function renderDrop() {
    const f = state.fam, host = $("#drop");
    const graphLike = /^(graph|flow)$/.test(f.glyph);
    const plotted = f.rungs.filter((r) => r.ops);
    const skipped = f.rungs.filter((r) => !r.ops);
    if (!plotted.length) {
      host.innerHTML = `<h3 id="drop-title">Complexity drop</h3><p class="muted small">None of these bounds can be turned into a single operation count (they depend on more than the input size, or have no closed form), so this family has no chart.</p>`;
      return;
    }
    const CAP = 30;
    const max = Math.min(CAP, Math.max(...plotted.map((r) => r.ops.log10)));
    const first = plotted[0], last = plotted[plotted.length - 1];
    const ratio = fmtRatio(first.ops.log10 - last.ops.log10);
    host.innerHTML = `
      <h3 id="drop-title">Complexity drop</h3>
      <p class="drop-sub">Each rung's time bound turned into an operation count at <b>n = 10⁶</b>${graphLike ? " (graphs: V = n = 10⁶ vertices, E = m = 2·10⁶ edges)" : ""}, constants dropped. Log scale.</p>
      ${graphLike ? `<p class="drop-note">Sparse versus dense: this chart uses a sparse graph (m = 2n, close to a road network). On dense graphs the order can flip; for example O(m log<sup>2/3</sup> n) beats O(m + n log n) only while m/n &lt; log<sup>1/3</sup> n, which is about 2.7 at n = 10⁶.</p>` : ""}
      <ol class="drop-bars">${plotted.map((r) => {
        const w = Math.max(2, (100 * Math.min(r.ops.log10, CAP)) / (max || 1));
        const off = r.ops.log10 > CAP;
        return `<li data-i="${r.i}" style="--sc:${stageVar(r.stage)}">
          <button type="button" class="db-row" data-go="${r.i}" aria-label="${esc(r.name)}: ${esc(r.ops.text)}, ${esc(fmtOps(r.ops.log10))} operations">
            <span class="db-name">${esc(r.name)}</span>
            <span class="db-track"><span class="db-bar${off ? " off" : ""}" style="width:${w.toFixed(1)}%"></span></span>
            <span class="db-val"><code>${prettyBound(r.ops.text)}</code> ${esc(fmtOps(r.ops.log10))}</span>
          </button></li>`;
      }).join("")}</ol>
      ${ratio && plotted.length > 1 && first.ops.log10 > last.ops.log10 ? `<p class="drop-sum">From <b>${esc(first.name)}</b> to <b>${esc(last.name)}</b>: about <b>${ratio}</b> less work at this size.</p>` : ""}
      ${skipped.length ? `<p class="drop-note">Not plotted: ${skipped.map((r) => esc(r.name)).join(", ")}. Their bounds use other quantities or have no single closed form.</p>` : ""}
      <p class="drop-note">Illustrative only: real running time depends on constants, memory and input.</p>`;
    host.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => setRung(+b.dataset.go, true)));
    paintDrop();
  }
  function paintDrop() {
    document.querySelectorAll("#drop .drop-bars li").forEach((li) => li.classList.toggle("on", +li.dataset.i === state.rung));
  }

  /* ------------------------------------------------------------------
     9. Timeline view
     ------------------------------------------------------------------ */
  let tlTip = null;
  function renderTimeline() {
    const host = $("#tl-chart");
    const legend = $("#tl-legend");
    const W = Math.max(300, host.clientWidth || 900);
    const narrow = W < 640;
    const lane = narrow ? 54 : 44, padL = narrow ? 22 : 190, padR = 22, top = 30;
    const fams = FAMS.filter((f) => matchQuery(f, state.q).ok);
    const all = FAMS.flatMap((f) => f.rungs.map((r) => r.yearNum)).filter((y) => y != null);
    const y0 = Math.floor(Math.min(1940, ...all) / 10) * 10, y1 = Math.max(2030, Math.ceil((Math.max(...all, 2026) + 1) / 10) * 10);
    const x = (y) => padL + ((y - y0) / (y1 - y0)) * (W - padL - padR);
    const H = top + fams.length * lane + 30;
    const S = Forge.svg;
    const svg = S("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: "tl-svg", role: "group", "aria-label": "Timeline of every rung by year" });
    // decade grid
    for (let y = y0; y <= y1; y += 10) {
      const major = y % 20 === 0 || !narrow;
      svg.appendChild(S("line", { x1: x(y), x2: x(y), y1: top - 8, y2: H - 22, class: "tl-grid" }));
      if (major && (!narrow || y % 20 === 0)) {
        svg.appendChild(S("text", { x: x(y), y: top - 14, class: "tl-tick", "text-anchor": "middle" }, String(y)));
        svg.appendChild(S("text", { x: x(y), y: H - 8, class: "tl-tick", "text-anchor": "middle" }, String(y)));
      }
    }
    const now = new Date().getFullYear();
    svg.appendChild(S("line", { x1: x(now), x2: x(now), y1: top - 8, y2: H - 22, class: "tl-now" }));
    let hidden = 0, filtered = 0;
    fams.forEach((f, k) => {
      const cy = top + k * lane + (narrow ? 32 : lane / 2);
      const col = state.tlColour === "family" ? `hsl(${f.hue} var(--tl-s) var(--tl-l))` : null;
      const g = S("g", { class: "tl-lane" });
      g.appendChild(S("text", { x: narrow ? 6 : padL - 14, y: narrow ? cy - 18 : cy + 4, class: "tl-label", "text-anchor": narrow ? "start" : "end" }, f.title));
      const pts = f.rungs.filter((r) => r.yearNum != null);
      hidden += f.rungs.length - pts.length;
      if (pts.length > 1) {
        const xs = pts.map((r) => x(r.yearNum));
        g.appendChild(S("line", { x1: Math.min(...xs), x2: Math.max(...xs), y1: cy, y2: cy, class: "tl-span", style: col ? `stroke:${col}` : `stroke:var(--line-2)` }));
      }
      // nudge dots that would overlap within a lane
      const placed = [];
      pts.slice().sort((a, b) => a.yearNum - b.yearNum).forEach((r) => {
        const px = x(r.yearNum);
        const dy = [0, -12, 12, -20, 20].find((d) => !placed.some((q) => Math.abs(q[0] - px) < 13 && q[1] === d)) || 0;
        placed.push([px, dy]);
        const off = state.stage !== "all" && r.stage !== state.stage;
        if (off) filtered++;
        const stLabel = r.stageIx >= 0 ? STAGES[r.stageIx].label : r.stage;
        const a = S("a", { href: `#${f.id}/${r.i}`, class: "tl-dot" + (off ? " off" : ""), "aria-label": `${r.name}, ${r.year}, ${f.title}, ${stLabel}` });
        a.appendChild(S("circle", { cx: px, cy: cy + dy, r: r.stage === "frontier" ? 7 : 6, style: `fill:${col || stageVar(r.stage)}`, class: r.stage === "frontier" ? "fr" : "" }));
        const show = () => showTip(a, `<b>${esc(r.name)}</b><span>${esc(r.year)} · ${esc(f.title)}</span><span class="tt-st" style="--sc:${stageVar(r.stage)}">${esc(stLabel)}</span>`);
        a.addEventListener("pointerenter", show);
        a.addEventListener("focus", show);
        a.addEventListener("pointerleave", hideTip);
        a.addEventListener("blur", hideTip);
        g.appendChild(a);
      });
      svg.appendChild(g);
    });
    host.innerHTML = "";
    host.appendChild(svg);
    if (!fams.length) host.appendChild(el("p", { class: "empty-note" }, `No family matches “${state.q}”.`));
    // legend + notes
    legend.innerHTML = "";
    const sw = el("div", { class: "tl-switch", role: "group", "aria-label": "Colour dots by" },
      el("span", { class: "muted small" }, "Colour by"),
      ...[["family", "Family"], ["stage", "Stage"]].map(([id, lb]) => el("button", {
        type: "button", class: "st-chip", "aria-pressed": String(state.tlColour === id),
        onclick: () => { state.tlColour = id; renderTimeline(); }
      }, lb)));
    legend.appendChild(sw);
    if (state.tlColour === "stage") {
      legend.appendChild(el("div", { class: "tl-keys" }, STAGES.map((s) => el("span", { style: `--sc:${stageVar(s.id)}` }, el("i"), s.label))));
    }
    const notes = [];
    if (hidden) notes.push(`${hidden} rung${hidden > 1 ? "s" : ""} without a recorded year ${hidden > 1 ? "are" : "is"} not shown.`);
    if (state.stage !== "all") notes.push(`Faded dots are outside the “${STAGES[STAGE_IX[state.stage]].label}” stage.`);
    notes.push("Hover or focus a dot for its name; select it to open that rung.");
    $("#tl-note").textContent = notes.join(" ");
  }
  function showTip(anchor, html) {
    if (!tlTip) { tlTip = el("div", { class: "tl-tip", role: "tooltip" }); document.body.appendChild(tlTip); }
    tlTip.innerHTML = html;
    tlTip.hidden = false;
    const c = anchor.querySelector("circle").getBoundingClientRect();
    const tw = tlTip.offsetWidth, th = tlTip.offsetHeight;
    let left = c.left + c.width / 2 - tw / 2 + scrollX;
    left = Math.max(8 + scrollX, Math.min(left, scrollX + document.documentElement.clientWidth - tw - 8));
    let topY = c.top + scrollY - th - 10;
    if (c.top - th - 10 < 60) topY = c.bottom + scrollY + 10;
    tlTip.style.left = left + "px";
    tlTip.style.top = topY + "px";
  }
  function hideTip() { if (tlTip) tlTip.hidden = true; }

  /* ------------------------------------------------------------------
     10. Keyboard + boot
     ------------------------------------------------------------------ */
  function onKey(e) {
    if (state.view !== "family" || e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    const inTrack = t && t.classList && t.classList.contains("rung-btn");
    const k = e.key;
    if (k === "Escape") { e.preventDefault(); go(""); return; }
    let to = null;
    if (k === "ArrowRight" || (inTrack && k === "ArrowDown")) to = state.rung + 1;
    else if (k === "ArrowLeft" || (inTrack && k === "ArrowUp")) to = state.rung - 1;
    else if (inTrack && k === "Home") to = 0;
    else if (inTrack && k === "End") to = state.fam.rungs.length - 1;
    if (to == null) return;
    e.preventDefault();
    setRung(to, inTrack);
  }

  function start(raw, fixture) {
    DATA = raw; USING_FIXTURE = !!fixture;
    normalise(raw);
    $("#atlas-fixture-note").hidden = !USING_FIXTURE;
    renderHero();
    renderToolbar();
    window.addEventListener("hashchange", route);
    document.addEventListener("keydown", onKey);
    let rt = 0, lastW = window.innerWidth;
    window.addEventListener("resize", () => {
      clearTimeout(rt);
      rt = setTimeout(() => { if (state.view === "timeline" && window.innerWidth !== lastW) renderTimeline(); lastW = window.innerWidth; hideTip(); }, 120);
    });
    route();
    document.documentElement.classList.add("atlas-ready");
  }

  function boot() {
    const ok = (d) => d && Array.isArray(d.families) && d.families.length;
    if (ok(self.FORGE_ATLAS)) return start(self.FORGE_ATLAS, false);
    const s = document.createElement("script");
    s.src = "atlas/atlas-fixture.js";
    s.onload = () => (ok(self.FORGE_ATLAS_FIXTURE) ? start(self.FORGE_ATLAS_FIXTURE, true) : fatal());
    s.onerror = fatal;
    document.head.appendChild(s);
  }
  function fatal() {
    const m = $("#atlas-missing");
    m.hidden = false;
    m.textContent = "The atlas data could not be loaded. Check that docs/atlas/atlas-data.js exists.";
  }

  // exposed for tests and for other pages that want the parser
  self.ForgeAtlas = { extractBound, evaluate, boundOps, fmtOps, glyphSVG, GLYPHS };
  if (typeof document !== "undefined" && document.getElementById && document.getElementById("atlas-root")) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
  }
})();
