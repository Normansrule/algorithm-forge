/* Forge Arena — grading Web Worker.
   Messages in:
     {type:"check", req, id, lang:"pseudo"|"js"|"python", code, mode:"run"|"submit"}  → {type:"report", req, report}
     {type:"trace", req, id, code, args}                                            → {type:"trace", req, result}
   Progress messages out (Python only): {type:"status", req, phase:"loading-python"|"running", text}
   The main thread kills and recreates this worker if a request takes too long (infinite loops). */
/* global ForgeCheck, ForgeProblems, loadPyodide */
"use strict";

const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js";
const PYODIDE_INDEX = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";

importScripts("../engine/forge-pseudo.js", "../engine/forge-check.js", "problems/registry.js");
const packStatus = { loaded: [], missing: [] };
try { importScripts("problems/index.js"); } catch (e) { self.FORGE_PACKS = ["exemplars.js"]; }
(self.FORGE_PACKS || []).forEach((f) => {
  try { importScripts("problems/" + f); packStatus.loaded.push(f); } catch (e) { packStatus.missing.push(f); }
});

/* ---------- JIT warm-up ----------
   The interpreter recurses on the JS stack. Cold (unoptimized) code uses much more stack per call, so a deep
   but legal recursion (e.g. depth 400) can overflow on the first run in a fresh worker and pass once warm.
   Warm the interpreter up front, and retry a check whose only problem was a browser stack overflow. */
const DEEP = /too deep for the browser/;
(function warm() {
  const src = "ALGORITHM W(n)\n    if n = 0 then\n        return 0\n    x ← [n, n + 1]\n    return W(n - 1) + x[0] mod 3";
  try { const prog = ForgePseudo.parse(src); for (let k = 0; k < 6; k++) ForgePseudo.run(prog, { entry: "W", args: [60 + 40 * k] }); } catch (e) { /* ignore */ }
})();
function checkWithRetry(problem, submission, opts) {
  let report = ForgeCheck.check(problem, submission, opts);
  for (let tries = 0; tries < 2; tries++) {
    const deep = (report.tests || []).some((t) => t.error && DEEP.test(t.error.message)) || (report.growth && report.growth.error && DEEP.test(report.growth.error.message));
    if (!deep) break;
    report = ForgeCheck.check(problem, submission, opts); // now the interpreter is JIT-compiled and uses less stack
  }
  return report;
}

/* ---------- plain-data conversion (errors & results must survive postMessage) ---------- */
function plainError(e) {
  if (!e) return null;
  return { message: String(e.message || e), line: e.line || null, kind: e.kind || "runtime" };
}
function safeClone(x) {
  try { return structuredClone(x); } catch (e) { return JSON.parse(JSON.stringify(x, (k, v) => (v === Infinity ? 1e308 : v === -Infinity ? -1e308 : v === undefined ? null : v))); }
}
function plainReport(r) {
  r.compileError = r.compileError ? plainError(r.compileError) : null;
  (r.tests || []).forEach((t) => { if (t.error) t.error = plainError(t.error); });
  if (r.growth && r.growth.error) r.growth.error = plainError(r.growth.error);
  return safeClone(r);
}

/* ---------- Python via Pyodide (lazy) ---------- */
let pyodide = null, pyLoading = null;
function loadPython(req) {
  if (pyodide) return Promise.resolve(pyodide);
  if (pyLoading) return pyLoading;
  postMessage({ type: "status", req, phase: "loading-python", text: "Loading Python (Pyodide, about 10 MB — first time only)…" });
  pyLoading = (async () => {
    try { importScripts(PYODIDE_URL); }
    catch (e) { throw new Error("offline"); }
    if (typeof loadPyodide !== "function") throw new Error("offline");
    pyodide = await loadPyodide({ indexURL: PYODIDE_INDEX });
    return pyodide;
  })();
  pyLoading.catch(() => { pyLoading = null; });
  return pyLoading;
}

function unBig(v) {
  if (typeof v === "bigint") return Number(v);
  if (Array.isArray(v)) return v.map(unBig);
  if (v instanceof Map) { const o = {}; for (const [k, x] of v) o[k] = unBig(x); return o; }
  if (v instanceof Set) return [...v].map(unBig);
  if (v && typeof v === "object") { const o = {}; for (const k in v) o[k] = unBig(v[k]); return o; }
  return v;
}
function toJs(py) {
  if (py && typeof py === "object" && typeof py.toJs === "function") {
    const v = py.toJs({ dict_converter: Object.fromEntries, create_pyproxies: false });
    try { py.destroy(); } catch (e) { /* ignore */ }
    return unBig(v);
  }
  return unBig(py);
}
function pyLine(msg) {
  const all = [...String(msg).matchAll(/File "<exec>", line (\d+)/g)];
  return all.length ? +all[all.length - 1][1] : null;
}
function pyMessage(e) {
  const s = String(e && e.message || e);
  const lines = s.trim().split("\n");
  const last = lines[lines.length - 1];
  const ln = pyLine(s);
  return { message: last + (ln ? ` (line ${ln})` : ""), line: ln };
}

async function checkPython(problem, code, mode, req) {
  let py;
  try { py = await loadPython(req); }
  catch (e) {
    return { offline: true, problem: problem.id, lang: "python", mode, status: "error", tests: [], passed: 0, total: 0, diagnosis: [{ kind: "error", message: "Python couldn't be loaded — the Pyodide download (cdn.jsdelivr.net) isn't reachable from this network. Try ✍️ Pseudocode or JS for now; your Python draft is saved." }], compileError: { message: "Python is unavailable offline", line: null, kind: "offline" }, forbidden: [] };
  }
  postMessage({ type: "status", req, phase: "running", text: "Running your Python…" });
  const printed = [];
  let sink = printed;
  py.setStdout({ batched: (s) => sink.push(s) });
  py.setStderr({ batched: (s) => sink.push(s) });
  const ns = py.globals.get("dict")();
  const fail = (err) => ({ problem: problem.id, lang: "python", mode, status: "error", tests: [], passed: 0, total: 0, diagnosis: [{ kind: "error", message: (err.line ? `Line ${err.line}: ` : "") + err.message }], compileError: { message: err.message, line: err.line, kind: "syntax" }, forbidden: [] });
  try { py.runPython(code, { globals: ns }); }
  catch (e) { const m = pyMessage(e); ns.destroy(); return fail(m); }
  const names = [problem.entry, snake(problem.entry)];
  const firstDef = /^def\s+([A-Za-z_]\w*)\s*\(/m.exec(code);
  if (firstDef) names.push(firstDef[1]);
  let pyfn = null;
  for (const nm of names) {
    if (!nm) continue;
    const f = ns.get(nm);
    if (f && typeof f === "function") { pyfn = f; break; }
    if (f && f.destroy) f.destroy();
  }
  if (!pyfn) { ns.destroy(); return fail({ message: `I couldn't find a function named ${snake(problem.entry)}(…) — define it with def.`, line: null }); }
  const perCall = [];
  const argIdx = problem.output && problem.output.arg !== undefined ? problem.output.arg : -1;
  const fn = (...args) => {
    const out = [];
    perCall.push(out);
    sink = out;
    const pyArgs = args.map((a) => py.toPy(a));
    try {
      const res = pyfn(...pyArgs);
      if (argIdx >= 0 && Array.isArray(args[argIdx])) {
        const mutated = toJs(pyArgs[argIdx]);
        args[argIdx].length = 0;
        (Array.isArray(mutated) ? mutated : []).forEach((x) => args[argIdx].push(x));
      }
      return toJs(res);
    } catch (e) {
      const m = pyMessage(e);
      const err = new Error(m.message);
      if (m.line) err.stack = `Error\n    at <anonymous>:${m.line + 2}:1`; // forge-check reads the line from the stack
      throw err;
    } finally {
      pyArgs.forEach((p) => { try { if (p && p.destroy) p.destroy(); } catch (e) { /* ignore */ } });
      sink = printed;
    }
  };
  let report;
  try {
    report = ForgeCheck.check(problem, { lang: "fn", fn, code }, { mode });
  } finally {
    try { pyfn.destroy(); } catch (e) { /* ignore */ }
    try { ns.destroy(); } catch (e) { /* ignore */ }
  }
  report.lang = "python";
  // built-ins the problem forbids (forge-check's own scan only knows JS spellings)
  if (problem.forbid && problem.forbid.length) {
    const src = code.replace(/#.*$/gm, "");
    // max(a, b) of two values is just a comparison; max(A) over a whole collection is what's forbidden
    const pyRe = { max: /\bmax\s*\(\s*[^,()]*(\([^()]*\))?[^,()]*\)/, min: /\bmin\s*\(\s*[^,()]*(\([^()]*\))?[^,()]*\)/, sorted: /\bsorted\s*\(|\.sort\s*\(/, sum: /\bsum\s*\(/ };
    const bad = problem.forbid.filter((f) => (pyRe[f] || new RegExp("\\b" + f + "\\s*\\(")).test(src) && !(report.forbidden || []).includes(f));
    if (bad.length) {
      report.forbidden = (report.forbidden || []).concat(bad);
      report.status = "failed";
      if (!report.diagnosis.some((d) => d.kind === "forbid")) report.diagnosis.unshift({ kind: "forbid", message: `This problem asks you to build it yourself — please don't use ${report.forbidden.map((f) => f + "(…)").join(", ")}.` });
    }
  }
  (report.tests || []).forEach((t, i) => { t.printed = (perCall[i] || []).slice(0, 200); });
  if (printed.length) report.printed = printed.slice(0, 200);
  return report;
}
function snake(s) { return String(s || "").replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/([A-Z])([A-Z][a-z])/g, "$1_$2").toLowerCase(); }

/* ---------- JavaScript: capture console.log per test ---------- */
function checkJs(problem, code, mode) {
  const logs = [];
  const orig = self.console.log;
  self.console.log = (...a) => { if (logs.length < 500) logs.push(a.map((x) => (typeof x === "string" ? x : ForgeCheck.show(x))).join(" ")); };
  try { return Object.assign(ForgeCheck.check(problem, { lang: "js", code }, { mode }), logs.length ? { printed: logs } : {}); }
  finally { self.console.log = orig; }
}

/* ---------- message loop ---------- */
self.onmessage = async (ev) => {
  const m = ev.data || {};
  const req = m.req;
  try {
    if (m.type === "ping") { postMessage({ type: "pong", req, packs: packStatus, count: ForgeProblems.list.length }); return; }
    const problem = ForgeProblems.get(m.id);
    if (!problem) { postMessage({ type: m.type === "trace" ? "trace" : "report", req, fatal: `Unknown problem "${m.id}".` }); return; }
    if (m.type === "check") {
      const t0 = Date.now();
      let report;
      if (m.lang === "python") report = await checkPython(problem, m.code, m.mode || "run", req);
      else if (m.lang === "js") report = checkJs(problem, m.code, m.mode || "run");
      else report = checkWithRetry(problem, { lang: "pseudo", code: m.code }, { mode: m.mode || "run" });
      report.ms = Date.now() - t0;
      postMessage({ type: "report", req, report: plainReport(report) });
    } else if (m.type === "trace") {
      let r = ForgeCheck.traceRun(problem, m.code, m.args || []);
      if (r.error && DEEP.test(r.error.message || "")) r = ForgeCheck.traceRun(problem, m.code, m.args || []);
      const result = r.error && !r.trace ? { ok: false, error: plainError(r.error), trace: [], output: [] }
        : { ok: r.ok, value: r.value, args: r.args, ops: r.ops, lineHits: r.lineHits, output: r.output, trace: r.trace, error: plainError(r.error), entry: r.entry };
      postMessage({ type: "trace", req, result: safeClone(result) });
    }
  } catch (e) {
    postMessage({ type: m.type === "trace" ? "trace" : "report", req, fatal: "The grader hit an internal error: " + (e && e.message || e) });
  }
};
