/* =====================================================================
   Forge Check — grades a submission against an Arena problem
   ---------------------------------------------------------------------
   Works in the browser (inside a Web Worker, see arena/worker.js) and in
   Node (tools/validate-problems.mjs). Pure & synchronous.

   Problem schema (see docs/arena/PROBLEM_FORMAT.md for the full guide):
   {
     id, title, level (0-5), chapter (1-17), topics[], summary, statement (HTML),
     entry: "MaxElement",            // ALGORITHM / function name the learner must keep
     params: ["A"],                  // parameter names (for display)
     output: "return" | {arg: 0},    // what is graded: return value or a mutated argument
     examples/tests: [{args:[...], expect, name, explain}],   // hand-written tests (first ones = examples)
     random: {count, seed, gen(rng, i) -> args},             // generated tests (expected from reference)
     reference(...args) -> expected,                         // JS oracle
     verify(got, args) -> true | "message",                  // optional: for problems with many valid answers
     compare: "exact" | "unordered" | "float" | fn(got, exp, args) -> true|false|"message",
     budget: {metric, limit(args) -> number, label},         // pseudocode only: operation budget
     growth: {metric, sizes[], gen(rng, n) -> args, expect}, // pseudocode only: efficiency class check
     forbid: ["sorted", "max"],                              // builtins not allowed
     mutants: [{fn(...args) -> output, hint}],               // known wrong answers → targeted nudges
     lints: [{re: "regex", lang: "pseudo"|"js"|"any", message, when: "fail"|"always"}],
     hints: ["nudge 1", "nudge 2", "nudge 3"],
     starter: {pseudo, js}, solution: {pseudo, js, python, explain}
   }
   ===================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./forge-pseudo.js"));
  else root.ForgeCheck = factory(root.ForgePseudo);
})(typeof self !== "undefined" ? self : this, function (ForgePseudo) {
  "use strict";

  /* ---------- helpers ---------- */
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
    r.pick = (xs) => xs[Math.floor(r() * xs.length)];
    r.shuffle = (xs) => { for (let i = xs.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [xs[i], xs[j]] = [xs[j], xs[i]]; } return xs; };
    r.distinct = (n, lo, hi) => { const s = new Set(); while (s.size < n) s.add(r.int(lo, hi)); return r.shuffle([...s]); };
    r.sorted = (n, lo, hi) => r.array(n, lo, hi).sort((x, y) => x - y);
    r.word = (n, alphabet) => Array.from({ length: n }, () => alphabet[Math.floor(r() * alphabet.length)]).join("");
    return r;
  }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const clone = (x) => {
    if (x === Infinity || x === -Infinity) return x;
    if (Array.isArray(x)) return x.map(clone);
    if (x && typeof x === "object") { const o = {}; for (const k in x) o[k] = clone(x[k]); return o; }
    return x;
  };
  function show(v, depth = 0) {
    if (v === undefined) return "(nothing returned)";
    if (v === null) return "null";
    if (v === Infinity) return "∞";
    if (v === -Infinity) return "-∞";
    if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(+v.toFixed(6));
    if (typeof v === "string") return JSON.stringify(v);
    if (Array.isArray(v)) {
      if (v.length > 40 && depth === 0) return "[" + v.slice(0, 20).map((x) => show(x, depth + 1)).join(", ") + `, … (${v.length} items)]`;
      return "[" + v.map((x) => show(x, depth + 1)).join(", ") + "]";
    }
    if (typeof v === "object") return "{" + Object.keys(v).filter((k) => k !== "__type").map((k) => k + ": " + show(v[k], depth + 1)).join(", ") + "}";
    return String(v);
  }
  function deepEq(a, b, tol) {
    if (a === b) return true;
    if (typeof a === "number" && typeof b === "number") {
      if (!Number.isFinite(a) || !Number.isFinite(b)) return a === b;
      return Math.abs(a - b) <= (tol || 1e-9) * Math.max(1, Math.abs(a), Math.abs(b));
    }
    if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => deepEq(x, b[i], tol));
    if (a && b && typeof a === "object" && typeof b === "object") {
      const ka = Object.keys(a).filter((k) => k !== "__type"), kb = Object.keys(b).filter((k) => k !== "__type");
      return ka.length === kb.length && ka.every((k) => deepEq(a[k], b[k], tol));
    }
    if ((a === null || a === undefined) && (b === null || b === undefined)) return true;
    return false;
  }
  const canon = (x) => JSON.stringify(x, (k, v) => (v === Infinity ? "∞" : v === -Infinity ? "-∞" : v));
  function compareOut(problem, got, exp, args) {
    const c = problem.compare;
    if (typeof c === "function") return c(got, exp, args);
    if (c === "unordered") {
      if (!Array.isArray(got) || !Array.isArray(exp)) return deepEq(got, exp);
      const a = got.map(canon).sort(), b = exp.map(canon).sort();
      return a.length === b.length && a.every((x, i) => x === b[i]);
    }
    if (c === "unordered-deep") { // list of lists, each inner unordered too (e.g. subsets)
      if (!Array.isArray(got) || !Array.isArray(exp)) return false;
      const norm = (L) => L.map((s) => canon(Array.isArray(s) ? s.slice().sort((x, y) => (x < y ? -1 : x > y ? 1 : 0)) : s)).sort();
      const a = norm(got), b = norm(exp);
      return a.length === b.length && a.every((x, i) => x === b[i]);
    }
    if (c === "float") return deepEq(got, exp, 1e-6);
    return deepEq(got, exp);
  }

  /* ---------- building the test list ---------- */
  function buildTests(problem, mode) {
    const tests = [];
    (problem.tests || []).forEach((t, i) => {
      tests.push({ name: t.name || `Example ${i + 1}`, args: t.args, expect: t.expect, hasExpect: "expect" in t, example: i < (problem.exampleCount || 3), explain: t.explain });
    });
    if (mode === "submit" && problem.random && problem.reference || mode === "submit" && problem.random && problem.verify) {
      const R = rng(problem.random.seed || hash(problem.id));
      const count = problem.random.count || 25;
      for (let i = 0; i < count; i++) {
        const args = problem.random.gen(R, i);
        const t = { name: `Random test ${i + 1}`, args, generated: true };
        if (problem.reference) { t.expect = problem.reference(...clone(args)); t.hasExpect = true; }
        tests.push(t);
      }
    }
    if (mode === "run") return tests.filter((t) => t.example);
    return tests;
  }

  /* ---------- executing a submission ---------- */
  const submission_fn_holder = { fn: null };
  function compile(problem, lang, code) {
    if (lang === "pseudo") {
      try { return { prog: ForgePseudo.parse(code) }; } catch (e) {
        const src = String(code).split("\n");
        const ln = e.line && src[e.line - 1] !== undefined ? e.line : src.findIndex((l) => /\.\.\.|…/.test(l)) + 1;
        if (ln > 0 && /(^|[^.\w])(\.\.\.|…)(?!\.)/.test(src[ln - 1] || "")) {
          return { error: { message: `This line still has the "..." placeholder from the starter code — replace it with your own pseudocode.`, line: ln, kind: "syntax" } };
        }
        return { error: e };
      }
    }
    if (lang === "fn") return { fn: submission_fn_holder.fn }; // internal: validator runs mutants directly
    if (lang === "js") {
      try {
        // eslint-disable-next-line no-new-func
        const f = new Function(`"use strict";\n${code}\n;return (typeof ${problem.entry} === "function") ? ${problem.entry} : undefined;`)();
        if (typeof f !== "function") return { error: { message: `I couldn't find a function named ${problem.entry}(…). Keep the name from the starter code.`, line: null, kind: "syntax" } };
        return { fn: f };
      } catch (e) {
        return { error: { message: String(e.message || e), line: jsLine(e), kind: "syntax" } };
      }
    }
    return { error: { message: "Unknown language " + lang, kind: "syntax" } };
  }
  function jsLine(e) { const m = /<anonymous>:(\d+):/.exec(e && e.stack || ""); return m ? Math.max(1, +m[1] - 2) : null; }

  function execOnce(problem, compiled, lang, args, opts) {
    const a = clone(args);
    if (lang === "pseudo") {
      const r = ForgePseudo.run(compiled.prog, { entry: problem.entry, entryRequired: true, args: a, maxSteps: (opts && opts.maxSteps) || problem.maxSteps || 2000000, maxDepth: problem.maxDepth || 3000, trace: !!(opts && opts.trace) });
      if (!r.ok) return { error: r.error, ops: r.ops, lineHits: r.lineHits, output: r.output };
      const out = problem.output && problem.output.arg !== undefined ? r.args[problem.output.arg] : r.value;
      return { value: out, ops: r.ops, lineHits: r.lineHits, output: r.output, trace: r.trace, ret: r.value };
    }
    try {
      const logs = [];
      const ret = compiled.fn(...a);
      const out = problem.output && problem.output.arg !== undefined ? a[problem.output.arg] : ret;
      return { value: clone(normalizeJs(out)), output: logs };
    } catch (e) {
      return { error: { message: String(e && e.message || e), line: jsLine(e), kind: "runtime" } };
    }
  }
  function normalizeJs(v) {
    if (v instanceof Set) return [...v];
    if (v instanceof Map) { const o = {}; for (const [k, x] of v) o[k] = normalizeJs(x); return o; }
    if (Array.isArray(v)) return v.map(normalizeJs);
    return v;
  }

  function forbiddenCalls(problem, compiled, lang, code) {
    const bad = [];
    if (!problem.forbid || !problem.forbid.length) return bad;
    if (lang === "pseudo") {
      const names = new Set();
      const walk = (n) => {
        if (!n || typeof n !== "object") return;
        if (Array.isArray(n)) { n.forEach(walk); return; }
        if (n.k === "call" && !compiled.prog.algorithms[n.name]) names.add(n.name);
        for (const k in n) if (k !== "line") walk(n[k]);
      };
      Object.values(compiled.prog.algorithms).forEach((a) => walk(a.body));
      walk(compiled.prog.main);
      problem.forbid.forEach((f) => { if (names.has(f)) bad.push(f); });
    } else {
      problem.forbid.forEach((f) => {
        const map = { sorted: /\.sort\s*\(/, max: /Math\.max\s*\(/, min: /Math\.min\s*\(/ };
        if ((map[f] || new RegExp("\\b" + f + "\\s*\\(")).test(code)) bad.push(f);
      });
    }
    return bad;
  }

  /* ---------- growth / efficiency class ---------- */
  const CLASSES = {
    "1": () => 1,
    "log n": (n) => Math.log2(n + 1),
    "sqrt n": (n) => Math.sqrt(n),
    "n": (n) => n,
    "n log n": (n) => n * Math.log2(n + 1),
    "n^2": (n) => n * n,
    "n^2 log n": (n) => n * n * Math.log2(n + 1),
    "n^3": (n) => n * n * n,
    "2^n": (n) => Math.pow(2, n),
    "n!": (n) => { let f = 1; for (let i = 2; i <= n; i++) f *= i; return f; },
  };
  const ORDER = ["1", "log n", "sqrt n", "n", "n log n", "n^2", "n^2 log n", "n^3", "2^n", "n!"];
  // log f(n) for each class, computed analytically so 2^n and n! never overflow/underflow
  const LOGF = {
    "1": () => 0,
    "log n": (n) => Math.log(Math.log2(n + 1)),
    "sqrt n": (n) => 0.5 * Math.log(n),
    "n": (n) => Math.log(n),
    "n log n": (n) => Math.log(n) + Math.log(Math.log2(n + 1)),
    "n^2": (n) => 2 * Math.log(n),
    "n^2 log n": (n) => 2 * Math.log(n) + Math.log(Math.log2(n + 1)),
    "n^3": (n) => 3 * Math.log(n),
    "2^n": (n) => n * Math.LN2,
    "n!": (n) => { let s = 0; for (let i = 2; i <= n; i++) s += Math.log(i); return s; },
  };
  function classify(points) {
    // pick the class whose ratio ops/f(n) is most constant, measured in log space
    // (spread of log-ratios + drift between the smallest and largest sizes), favoring simpler classes when nearly tied
    let best = null;
    for (const name of ORDER) {
      const lr = points.map((p) => Math.log(Math.max(1, p.ops)) - LOGF[name](p.n));
      if (lr.some((r) => !Number.isFinite(r))) continue;
      const mean = lr.reduce((a, b) => a + b, 0) / lr.length;
      const sd = Math.sqrt(lr.reduce((a, r) => a + (r - mean) * (r - mean), 0) / lr.length);
      const first = (lr[0] + lr[Math.min(1, lr.length - 1)]) / 2, last = (lr[lr.length - 1] + lr[Math.max(0, lr.length - 2)]) / 2;
      const drift = Math.abs(last - first);
      const score = sd + drift;
      if (!best || score < best.score - 0.02) best = { name, score, constant: Math.exp(mean) };
    }
    // log-log slope as extra info
    const xs = points.map((p) => Math.log(p.n)), ys = points.map((p) => Math.log(Math.max(1, p.ops)));
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
    let num = 0, den = 0;
    xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); den += (x - mx) * (x - mx); });
    return { cls: best ? best.name : "?", constant: best ? best.constant : null, slope: den ? num / den : null };
  }
  function checkGrowth(problem, compiled) {
    const g = problem.growth;
    const R = rng((g.seed || 7) ^ hash(problem.id));
    const points = [];
    for (const n of g.sizes) {
      const reps = g.reps || 2;
      let tot = 0;
      for (let k = 0; k < reps; k++) {
        const args = g.gen(R, n);
        const r = execOnce(problem, compiled, "pseudo", args, { maxSteps: g.maxSteps || 20000000 });
        if (r.error) return { ok: false, error: r.error, points };
        tot += r.ops[g.metric || "steps"];
      }
      points.push({ n, ops: tot / reps });
    }
    const fit = classify(points);
    const want = g.expect;
    const rank = (c) => ORDER.indexOf(c);
    const ok = rank(fit.cls) <= rank(want) || (g.tolerance && rank(fit.cls) <= rank(want) + g.tolerance);
    return { ok, points, fitted: fit.cls, slope: fit.slope, expect: want, metric: g.metric || "steps" };
  }

  /* ---------- main entry ---------- */
  function check(problem, submission, options) {
    const opts = Object.assign({ mode: "submit", trace: false }, options || {});
    const lang = submission.lang || "pseudo";
    const code = submission.code || "";
    const report = { problem: problem.id, lang, mode: opts.mode, status: "failed", tests: [], passed: 0, total: 0, diagnosis: [], compileError: null, growth: null, forbidden: [] };

    submission_fn_holder.fn = submission.fn || null;
    const compiled = compile(problem, lang, code);
    if (compiled.error) {
      report.status = "error";
      report.compileError = { message: compiled.error.message, line: compiled.error.line, kind: compiled.error.kind || "syntax" };
      report.diagnosis.push({ kind: "error", message: explainError(compiled.error) });
      return report;
    }
    report.forbidden = forbiddenCalls(problem, compiled, lang, code);

    const tests = buildTests(problem, opts.mode);
    report.total = tests.length;
    const results = [];
    let limitHit = null;
    for (const t of tests) {
      if (limitHit) { // one runaway test is enough — don't make the learner wait for every test to time out
        results.push({ name: t.name, input: showArgs(problem, t.args), args: t.args, generated: !!t.generated, example: !!t.example, explain: t.explain, pass: false, skipped: true, error: { message: "Not run (an earlier test hit the step limit).", kind: "skipped" } });
        continue;
      }
      const r = execOnce(problem, compiled, lang, t.args, { trace: false });
      if (r.error && r.error.kind === "limit") {
        limitHit = r;
        // name the line that ran the most — that's almost always the loop that never ends
        if (r.lineHits) {
          let hot = null, max = 0;
          const entries = r.lineHits instanceof Map ? [...r.lineHits] : Object.entries(r.lineHits);
          for (const [ln, c] of entries) if (c > max) { max = c; hot = +ln; }
          if (hot) { r.error = { message: r.error.message, kind: r.error.kind, line: r.error.line || hot, hotLine: hot, hotCount: max }; }
        }
      }
      const res = { name: t.name, input: showArgs(problem, t.args), args: t.args, generated: !!t.generated, example: !!t.example, explain: t.explain, pass: false, ops: r.ops || null, printed: r.output || [] };
      if (r.error) {
        res.error = { message: r.error.message, line: r.error.line, kind: r.error.kind, hotLine: r.error.hotLine, hotCount: r.error.hotCount };
      } else {
        res.got = show(r.value);
        res.gotValue = r.value;
        let verdict;
        if (problem.verify) verdict = problem.verify(clone(r.value), clone(t.args));
        else verdict = compareOut(problem, r.value, t.expect, t.args);
        if (t.hasExpect) res.expected = show(t.expect);
        if (verdict === true) res.pass = true;
        else if (typeof verdict === "string") res.why = verdict;
        if (res.pass && problem.budget && lang === "pseudo") {
          const used = r.ops[problem.budget.metric];
          const lim = problem.budget.limit(...clone(t.args));
          res.budget = { used, limit: lim };
          if (used > lim) { res.pass = false; const lbl = problem.budget.label || problem.budget.metric; res.why = `Right answer, but it used ${used} ${used === 1 ? lbl.replace(/s\b/, "") : lbl} — the limit for this input is ${lim}.`; res.overBudget = true; }
        }
      }
      results.push(res);
    }
    report.tests = results;
    report.passed = results.filter((r) => r.pass).length;

    if (report.forbidden.length) {
      report.diagnosis.push({ kind: "forbid", message: `This problem asks you to build it yourself — please don't use ${report.forbidden.map((f) => f + "(…)").join(", ")}.` });
    }

    // efficiency (pseudocode only; only once correct)
    if (report.passed === report.total && problem.growth && lang === "pseudo" && opts.mode === "submit") {
      report.growth = checkGrowth(problem, compiled);
      if (!report.growth.ok) {
        report.diagnosis.push({ kind: "growth", message: report.growth.error ? `The efficiency check crashed: ${report.growth.error.message}` : `All answers are right, but your algorithm's work grows like ${fmtClass(report.growth.fitted)} — this problem wants ${fmtClass(report.growth.expect)} (or better). Look for repeated work you can avoid.` });
      }
    }

    const allPass = report.passed === report.total && !report.forbidden.length && (!report.growth || report.growth.ok);
    report.status = allPass ? "passed" : "failed";

    if (!allPass) diagnose(problem, lang, code, tests, results, report);
    return report;
  }

  function fmtClass(c) { return c === "1" ? "Θ(1)" : "Θ(" + c.replace("^2", "²").replace("^3", "³").replace("2^n", "2ⁿ") + ")"; }
  function showArgs(problem, args) {
    const names = problem.params || args.map((_, i) => "arg" + (i + 1));
    return args.map((a, i) => (names[i] || "arg" + (i + 1)) + " = " + show(a)).join(", ");
  }

  /** Turn a raw error into a gentle explanation. */
  function explainError(e) {
    const m = e.message || String(e);
    if (e.kind === "limit" && e.hotLine) return `Line ${e.hotLine} ran ${e.hotCount.toLocaleString()} times before I stopped it — ` + m.charAt(0).toLowerCase() + m.slice(1);
    if (e.kind === "limit" && /steps/.test(m)) return m + " Tip: in a while loop, make sure the variable in the condition changes every time around.";
    return (e.line ? `Line ${e.line}: ` : "") + m;
  }

  function diagnose(problem, lang, code, tests, results, report) {
    const failing = results.map((r, i) => ({ r, t: tests[i] })).filter((x) => !x.r.pass);
    // 1) runtime errors first
    const err = failing.find((x) => x.r.error);
    if (err) report.diagnosis.push({ kind: "error", message: `${explainError(err.r.error)} (while running ${err.r.name}: ${err.r.input})` });
    // 2) over budget
    if (failing.some((x) => x.r.overBudget) && problem.budget && problem.budget.hint) report.diagnosis.push({ kind: "budget", message: problem.budget.hint });
    // 3) mutant matching: is the learner's output identical to a known wrong answer?
    const wrongIdx = results.map((r, i) => (!r.pass && !r.error && !r.overBudget && "gotValue" in r ? i : -1)).filter((i) => i >= 0);
    const runaway = results.some((r) => r.error && (r.error.kind === "limit" || r.error.kind === "skipped"));
    if (problem.mutants && problem.mutants.length && wrongIdx.length && !runaway) {
      const same = (i, mv) => {
        const gv = results[i].gotValue;
        return compareOut({ compare: problem.compare }, gv, mv, tests[i].args) === true || canon(gv) === canon(mv);
      };
      let exact = null, likely = null;
      for (const m of problem.mutants) {
        let agreeAll = 0, relevant = 0, agreeWrong = 0;
        results.forEach((r, i) => {
          if (r.error || !("gotValue" in r)) return;
          let mv;
          try { mv = m.fn(...clone(tests[i].args)); } catch (e) { return; }
          relevant++;
          if (same(i, mv)) { agreeAll++; if (wrongIdx.includes(i)) agreeWrong++; }
        });
        if (relevant && agreeAll === relevant && agreeWrong) { exact = m; break; }
        if (!likely && agreeWrong === wrongIdx.length) likely = m;
      }
      const hit = exact || likely;
      if (hit) report.diagnosis.push({ kind: "mutant", message: (exact ? "" : "Likely issue: ") + hit.hint });
    }
    // 4) lints
    (problem.lints || []).forEach((l) => {
      if (l.lang && l.lang !== "any" && l.lang !== lang) return;
      try { if (new RegExp(l.re, l.flags || "m").test(code) === (l.expect !== false)) report.diagnosis.push({ kind: "lint", message: l.message }); } catch (e) { /* bad regex */ }
    });
    // 5) generic observations
    const wrong = failing.filter((x) => !x.r.error && !x.r.overBudget);
    if (wrong.length && !report.diagnosis.some((d) => d.kind === "mutant")) {
      const small = wrong.slice().sort((a, b) => JSON.stringify(a.t.args).length - JSON.stringify(b.t.args).length)[0];
      const gv = small.r.gotValue;
      let obs;
      if (gv === undefined || gv === null) obs = "Your algorithm didn't return anything for this input — is there a return on every path?";
      else if (small.t.hasExpect && Array.isArray(gv) && Array.isArray(small.t.expect) && gv.length !== small.t.expect.length) obs = `Your answer has ${gv.length} item(s) but the expected answer has ${small.t.expect.length}.`;
      else if (small.t.hasExpect && Array.isArray(gv) && Array.isArray(small.t.expect)) {
        const k = gv.findIndex((x, i) => !deepEq(x, small.t.expect[i]));
        obs = k >= 0 ? `The first difference is at position ${k}: expected ${show(small.t.expect[k])}, got ${show(gv[k])}.` : null;
      } else if (small.t.hasExpect && typeof gv === "number" && typeof small.t.expect === "number") {
        const d = gv - small.t.expect;
        if (gv === -1 || small.t.expect === -1) obs = small.t.expect === -1 ? `The expected answer is −1 (not found), but you returned ${show(gv)}.` : "You returned −1 (not found), but the answer exists.";
        else obs = Math.abs(d) === 1 ? "Your answer is off by exactly one — check loop bounds (to n vs to n − 1) and < vs ≤." : `Your answer is ${d > 0 ? "too big" : "too small"} by ${Math.abs(+d.toFixed(6))}.`;
      } else obs = null;
      report.diagnosis.push({ kind: "observe", message: `Smallest failing input: ${small.r.input}. ${small.r.why ? small.r.why + " " : ""}${obs || ""}`.trim(), test: results.indexOf(small.r) });
    }
  }

  /** Run once with tracing (for the visual debugger). */
  function traceRun(problem, code, args) {
    const compiled = compile(problem, "pseudo", code);
    if (compiled.error) return { error: compiled.error };
    return ForgePseudo.run(compiled.prog, { entry: problem.entry, args: clone(args), trace: true, maxTrace: 5000, maxSteps: 200000 });
  }

  return { check, traceRun, classify, rng, hash, show, deepEq, clone, buildTests, CLASSES, fmtClass };
});
