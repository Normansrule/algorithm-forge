/* Playground worker — runs Forge Pseudocode off the main thread so a long (or endless) run never freezes the page.
   The page can terminate this worker at any time (Stop button / time limit) and start a fresh one. */
/* global importScripts, ForgePseudo, PGCore */
importScripts("../engine/forge-pseudo.js", "pg-core.js");

let cacheSrc = null, cacheProg = null;
function program(src) {
  if (src !== cacheSrc) { cacheSrc = src; cacheProg = ForgePseudo.parse(src); }
  return cacheProg;
}
function errOf(e) {
  if (!e) return null;
  return { message: String(e.message || e), line: e.line || null, kind: e.kind || "runtime" };
}

self.onmessage = function (ev) {
  const m = ev.data || {};
  try {
    if (m.type === "run") {
      let prog;
      try { prog = program(m.src); } catch (e) { self.postMessage({ id: m.id, ok: false, error: errOf(e), ops: null, output: [], trace: [] }); return; }
      const r = ForgePseudo.run(prog, { entry: m.entry, args: m.args, trace: !!m.trace, maxTrace: m.maxTrace || 5000, maxSteps: m.maxSteps || 5000000 });
      self.postMessage({ id: m.id, ok: r.ok, value: r.value, args: r.args, ops: r.ops, output: r.output, trace: r.trace, entry: r.entry, lineHits: r.lineHits, error: errOf(r.error) });
    } else if (m.type === "growth") {
      const prog = program(m.src);
      const R = PGCore.rng(m.seed || 7);
      // advance the generator so each size gets fresh data, deterministically
      for (let k = 0; k < (m.skip || 0); k++) R();
      const tot = {};
      let steps = 0;
      for (let rep = 0; rep < m.reps; rep++) {
        const args = PGCore.growthArgs(m.params, m.cfg, R, m.n, m.fallbacks);
        const r = ForgePseudo.run(prog, { entry: m.entry, args, maxSteps: m.maxSteps });
        if (!r.ok) { self.postMessage({ id: m.id, error: errOf(r.error), n: m.n }); return; }
        for (const k in r.ops) tot[k] = (tot[k] || 0) + r.ops[k];
        steps += r.ops.steps;
      }
      for (const k in tot) tot[k] /= m.reps;
      self.postMessage({ id: m.id, n: m.n, ops: tot, steps });
    }
  } catch (e) {
    self.postMessage({ id: m.id, ok: false, error: errOf(e) });
  }
};
