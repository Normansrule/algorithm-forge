/* =====================================================================
   Playground core — pure helpers shared by the Playground page and the
   Node check (tools/check-playground-examples.mjs). No DOM here.

     PGCore.parseValue(text)          -> JS value ("JSON-ish": [3,1,2], "ab", ab, ∞, null, nested lists)
     PGCore.formatValue(v)            -> text that parseValue reads back
     PGCore.headerOf(prog, entry)     -> [{name, label, isArray}] parameters of an ALGORITHM
     PGCore.GENERATORS                -> growth-lab input generators {id: {label, make(rng, n)}}
     PGCore.ROLES                     -> what the other parameters receive while sizes grow
     PGCore.growthArgs(params, cfg, rng, n, fallbacks) -> argument list for one growth run
     PGCore.rng(seed)                 -> deterministic random() with helpers
   ===================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PGCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ---------------- JSON-ish values ---------------- */
  class ValueError extends Error {}
  /** Parse a learner-typed value. Accepts JSON plus: ∞ / infinity / -∞, 'single quotes', true/false/null,
   *  trailing commas, and a bare word (no quotes) which becomes text: ababaca → "ababaca". */
  function parseValue(text) {
    const s = String(text == null ? "" : text);
    let i = 0;
    const ws = () => { while (i < s.length && /\s/.test(s[i])) i++; };
    const fail = (msg) => { throw new ValueError(msg + (i < s.length ? ` (at “${s.slice(i, i + 8)}”)` : "")); };
    function value() {
      ws();
      if (i >= s.length) fail("A value is missing");
      const c = s[i];
      if (c === "[" || c === "(") {
        const close = c === "[" ? "]" : ")";
        i++;
        const out = [];
        ws();
        if (s[i] === close) { i++; return out; }
        for (;;) {
          out.push(value());
          ws();
          if (s[i] === ",") { i++; ws(); if (s[i] === close) { i++; return out; } continue; }
          if (s[i] === close) { i++; return out; }
          fail(`Expected “,” or “${close}”`);
        }
      }
      if (c === "{") {
        i++;
        const out = {};
        ws();
        if (s[i] === "}") { i++; return out; }
        for (;;) {
          ws();
          let key;
          if (s[i] === '"' || s[i] === "'") key = str();
          else { const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(i)); if (!m) fail("Expected a field name"); key = m[0]; i += key.length; }
          ws();
          if (s[i] !== ":") fail("Expected “:” after a field name");
          i++;
          out[key] = value();
          ws();
          if (s[i] === ",") { i++; ws(); if (s[i] === "}") { i++; return out; } continue; }
          if (s[i] === "}") { i++; return out; }
          fail("Expected “,” or “}”");
        }
      }
      if (c === '"' || c === "'" || c === "“") return str();
      const rest = s.slice(i);
      let m = /^[-−]?\s*(∞|infinity\b|inf\b)/i.exec(rest);
      if (m) { i += m[0].length; return /^[-−]/.test(m[0]) ? -Infinity : Infinity; }
      m = /^[-−]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?/i.exec(rest);
      if (m) { i += m[0].length; return parseFloat(m[0].replace("−", "-")); }
      m = /^(true|false|null|nil|none)\b/i.exec(rest);
      if (m) { i += m[0].length; const w = m[0].toLowerCase(); return w === "true" ? true : w === "false" ? false : null; }
      m = /^[^\s,\[\]\(\)\{\}"':]+/.exec(rest);
      if (m) { i += m[0].length; return m[0]; }
      fail("I can't read this value");
    }
    function str() {
      const open = s[i];
      const close = open === "“" ? "”" : open;
      i++;
      let out = "";
      while (i < s.length && s[i] !== close) {
        if (s[i] === "\\" && i + 1 < s.length) { const e = s[i + 1]; out += e === "n" ? "\n" : e === "t" ? "\t" : e; i += 2; continue; }
        out += s[i++];
      }
      if (i >= s.length) fail("This text is missing its closing quote");
      i++;
      return out;
    }
    ws();
    if (i >= s.length) throw new ValueError("This input is empty — type a value such as 5, [3, 1, 2] or \"text\".");
    // a whole line of plain words (e.g. THE_BARBER_SHOP or hello world) is text
    if (!/^[\[\(\{"'“\d.−-]/.test(s.trim()) && !/^(true|false|null|nil|none|∞|-∞|infinity|-infinity|inf)$/i.test(s.trim()) && !/[\[\]{}(),]/.test(s)) return s.trim();
    const v = value();
    ws();
    if (i < s.length) fail("There is extra text after the value");
    return v;
  }

  /** Value → text that parseValue reads back (∞ kept readable). */
  function formatValue(v) {
    if (v === Infinity) return "∞";
    if (v === -Infinity) return "-∞";
    if (v === null || v === undefined) return "null";
    if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(+v.toFixed(6));
    if (typeof v === "string") return JSON.stringify(v);
    if (typeof v === "boolean") return String(v);
    if (Array.isArray(v)) return "[" + v.map(formatValue).join(", ") + "]";
    if (typeof v === "object") return "{" + Object.keys(v).map((k) => k + ": " + formatValue(v[k])).join(", ") + "}";
    return String(v);
  }

  /* ---------------- headers ---------------- */
  function exprText(e) {
    if (!e) return "";
    switch (e.k) {
      case "lit": return e.v === Infinity ? "∞" : String(e.v);
      case "var": return e.name;
      case "neg": return "-" + exprText(e.e);
      case "bin": return exprText(e.a) + e.op + exprText(e.b);
      default: return "…";
    }
  }
  /** Parameters of an ALGORITHM as the learner wrote them: A[0..n-1] → {name: "A", label: "A[0..n-1]", isArray}. */
  function headerOf(prog, entry) {
    const a = prog && prog.algorithms && prog.algorithms[entry];
    if (!a) return [];
    return a.params.map((p) => ({
      name: p.name,
      isArray: p.dims.length > 0,
      dims: p.dims.length,
      label: p.name + (p.dims.length ? "[" + p.dims.map((d) => exprText(d.lo) + (d.hi ? ".." + exprText(d.hi) : "")).join(", ") + "]" : ""),
    }));
  }

  /* ---------------- deterministic random ---------------- */
  function rng(seed) {
    let a = seed >>> 0 || 0x9e3779b9;
    const r = function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
    r.array = (n, lo, hi) => Array.from({ length: n }, () => r.int(lo, hi));
    r.shuffle = (xs) => { for (let i = xs.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [xs[i], xs[j]] = [xs[j], xs[i]]; } return xs; };
    return r;
  }

  /* ---------------- growth-lab generators ---------------- */
  function connectedEdges(r, n, extra, maxW) {
    const E = [];
    const seen = new Set();
    const add = (u, v, w) => { const k = Math.min(u, v) + "," + Math.max(u, v); if (u === v || seen.has(k)) return false; seen.add(k); E.push([u, v, w]); return true; };
    for (let v = 1; v < n; v++) add(r.int(0, v - 1), v, r.int(1, maxW));
    let tries = 0;
    while (E.length < n - 1 + extra && tries++ < extra * 20) add(r.int(0, n - 1), r.int(0, n - 1), r.int(1, maxW));
    return E;
  }
  const GENERATORS = {
    random: { label: "Random array", kind: "array", make: (r, n) => r.array(n, 0, Math.max(9, 4 * n)) },
    sorted: { label: "Sorted array (ascending)", kind: "array", make: (r, n) => r.array(n, 0, Math.max(9, 4 * n)).sort((a, b) => a - b) },
    reversed: { label: "Reversed array (descending)", kind: "array", make: (r, n) => r.array(n, 0, Math.max(9, 4 * n)).sort((a, b) => b - a) },
    nearly: { label: "Nearly sorted array", kind: "array", make: (r, n) => { const a = r.array(n, 0, Math.max(9, 4 * n)).sort((x, y) => x - y); for (let k = 0; k < Math.max(1, n / 20); k++) { const i = r.int(0, n - 1), j = Math.min(n - 1, i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; } },
    few: { label: "Array with few distinct values", kind: "array", make: (r, n) => r.array(n, 0, 3) },
    string: { label: "Random text (letters a–d)", kind: "string", make: (r, n) => Array.from({ length: n }, () => "abcd"[r.int(0, 3)]).join("") },
    graph: { label: "Random graph (adjacency lists, undirected)", kind: "graph", make: (r, n) => { const G = Array.from({ length: n }, () => []); connectedEdges(r, n, n, 1).forEach(([u, v]) => { G[u].push(v); G[v].push(u); }); G.forEach((l) => l.sort((a, b) => a - b)); return G; } },
    dag: { label: "Random directed acyclic graph (edges only go forward)", kind: "graph", make: (r, n) => { const G = Array.from({ length: n }, () => []); for (let u = 0; u < n - 1; u++) { const k = r.int(1, 2); for (let t = 0; t < k; t++) { const v = r.int(u + 1, n - 1); if (!G[u].includes(v)) G[u].push(v); } } return G; } },
    edges: { label: "Random weighted edges [u, v, w] (connected)", kind: "edges", make: (r, n) => connectedEdges(r, n, n, 20) },
    bitmatrix: { label: "Random 0/1 matrix (n × n)", kind: "matrix", make: (r, n) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i !== j && r() < 0.25 ? 1 : 0))) },
    weights: { label: "Random weight matrix (n × n, ∞ = no edge)", kind: "matrix", make: (r, n) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : r() < 0.4 ? r.int(1, 20) : Infinity))) },
    number: { label: "Just the number n", kind: "number", make: (r, n) => n },
  };
  /** What a parameter receives in the growth lab. */
  const ROLES = {
    input: "the generated input",
    n: "the size n",
    value: "my value from Inputs",
    absent: "a key that is not there",
    last: "the last element",
    middle: "the middle element",
    random: "a random element",
    min: "the smallest element",
    max: "the largest element",
  };
  function growthArgs(params, cfg, r, n, fallbacks) {
    const gen = GENERATORS[cfg.gen] || GENERATORS.random;
    const roles = cfg.roles || {};
    let data = null;
    const need = () => (data === null ? (data = gen.make(r, n)) : data);
    // generate first so element-picking roles see the same input
    params.forEach((p) => { if ((roles[p.name] || "value") === "input") need(); });
    return params.map((p, k) => {
      const role = roles[p.name] || "value";
      const flat = Array.isArray(data) ? data : typeof data === "string" ? data.split("") : [];
      switch (role) {
        case "input": return clone(data);
        case "n": return n;
        case "absent": return typeof data === "string" ? "z" : Math.max(9, 4 * n) + 1;
        case "last": return flat.length ? clone(flat[flat.length - 1]) : 0;
        case "middle": return flat.length ? clone(flat[Math.floor(flat.length / 2)]) : 0;
        case "random": return flat.length ? clone(flat[r.int(0, flat.length - 1)]) : 0;
        case "min": return flat.length ? flat.reduce((a, b) => (b < a ? b : a)) : 0;
        case "max": return flat.length ? flat.reduce((a, b) => (b > a ? b : a)) : 0;
        default: return clone(fallbacks ? fallbacks[k] : null);
      }
    });
  }
  function clone(x) {
    if (Array.isArray(x)) return x.map(clone);
    if (x && typeof x === "object") { const o = {}; for (const k in x) o[k] = clone(x[k]); return o; }
    return x;
  }
  /** Sensible default roles: first array-ish parameter gets the input; n/m/size get n; the rest keep their value. */
  function defaultRoles(params, genId) {
    const gen = GENERATORS[genId] || GENERATORS.random;
    const roles = {};
    let given = false;
    params.forEach((p) => {
      if (!given && (p.isArray || gen.kind === "number" || params.length === 1)) { roles[p.name] = "input"; given = true; }
      else if (/^(n|m|size|N|count)$/.test(p.name)) roles[p.name] = "n";
      else roles[p.name] = "value";
    });
    if (!given && params.length) { const p = params.find((q) => roles[q.name] !== "n") || params[0]; roles[p.name] = "input"; }
    return roles;
  }

  const METRICS = [
    ["steps", "Steps"], ["comparisons", "Comparisons"], ["keyComparisons", "Key comparisons"],
    ["arrayReads", "Array reads"], ["arrayWrites", "Array writes"], ["assignments", "Assignments"],
    ["arithmetic", "Arithmetic"], ["calls", "Calls"], ["swaps", "Swaps"], ["maxDepth", "Max depth"],
  ];

  /** Deep equality that treats ∞ and matching numbers (to 1e-9) as equal. */
  function same(a, b) {
    if (typeof a === "number" && typeof b === "number") return a === b || Math.abs(a - b) < 1e-9;
    if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => same(x, b[i]));
    if (a && b && typeof a === "object" && typeof b === "object") { const ka = Object.keys(a).filter((k) => k !== "__type"), kb = Object.keys(b).filter((k) => k !== "__type"); return ka.length === kb.length && ka.every((k) => same(a[k], b[k])); }
    return a === b;
  }

  /* ---------- growth-lab close calls ----------
     The grader's classifier (ForgeCheck.classify) scores each class by how constant ops / f(n) stays
     (spread + drift of the log-ratios). The same score is recomputed here only to say when the winner's
     log-factor neighbour (n vs n log n, n² vs n² log n, 1 vs log n) is almost as good: over a short size
     range a log factor barely moves, so the two are hard to tell apart. */
  const FIT_LOGF = {
    "1": () => 0, "log n": (n) => Math.log(Math.log2(n + 1)), n: (n) => Math.log(n), "n log n": (n) => Math.log(n) + Math.log(Math.log2(n + 1)),
    "n^2": (n) => 2 * Math.log(n), "n^2 log n": (n) => 2 * Math.log(n) + Math.log(Math.log2(n + 1)),
  };
  const LOG_NEIGHBOR = { "1": "log n", "log n": "1", n: "n log n", "n log n": "n", "n^2": "n^2 log n", "n^2 log n": "n^2" };
  function fitScore(points, cls) {
    const f = FIT_LOGF[cls];
    if (!f || points.length < 3) return null;
    const lr = points.map((p) => Math.log(Math.max(1, p.ops)) - f(p.n));
    const mean = lr.reduce((a, b) => a + b, 0) / lr.length;
    const sd = Math.sqrt(lr.reduce((a, r) => a + (r - mean) * (r - mean), 0) / lr.length);
    const first = (lr[0] + lr[1]) / 2, last = (lr[lr.length - 1] + lr[lr.length - 2]) / 2;
    return sd + Math.abs(last - first);
  }
  /** { other, gap, lo, hi, slopeShift } when cls's log-factor neighbour scores within `margin`, else null. */
  function logFactorCloseCall(points, cls, margin) {
    const other = LOG_NEIGHBOR[cls];
    if (!other) return null;
    const a = fitScore(points, cls), b = fitScore(points, other);
    if (a == null || b == null) return null;
    const gap = b - a;
    if (gap >= (margin == null ? 0.25 : margin)) return null;
    const nMin = points[0].n, nMax = points[points.length - 1].n;
    const lo = Math.log2(nMin + 1), hi = Math.log2(nMax + 1);
    return { other, gap, lo, hi, slopeShift: nMax > nMin ? Math.log(hi / lo) / Math.log(nMax / nMin) : 0 };
  }

  return { parseValue, formatValue, ValueError, headerOf, rng, GENERATORS, ROLES, growthArgs, defaultRoles, METRICS, same, clone, fitScore, logFactorCloseCall };
});
