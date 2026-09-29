/* Forge Arena — progress store (localStorage key "forge-arena-v1").
   Shape: {v:1, problems: {id: {status, solved:{blocks,pseudo,js,python}, attempts, hintsUsed, revealed,
           firstSolved, started, solves:[{mode, at, ms, attempts}]}},
           drafts: {id: {pseudo, js, python, blocks, notes}}, prefs: {mode, pretty}}
   Every storage access is wrapped: private windows / blocked storage fall back to memory. */
(function () {
  "use strict";
  const Arena = (window.Arena = window.Arena || {});
  const KEY = "forge-arena-v1";
  const MODES = ["blocks", "pseudo", "js", "python"];

  function blank() { return { v: 1, problems: {}, drafts: {}, prefs: {} }; }
  function sane(d) {
    const out = blank();
    if (!d || typeof d !== "object") return out;
    if (d.problems && typeof d.problems === "object") out.problems = d.problems;
    if (d.drafts && typeof d.drafts === "object") out.drafts = d.drafts;
    if (d.prefs && typeof d.prefs === "object") out.prefs = d.prefs;
    return out;
  }
  let data = blank();
  let persistent = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) data = sane(JSON.parse(raw));
  } catch (e) { persistent = false; }

  const listeners = [];
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); persistent = true; } catch (e) { persistent = false; }
    listeners.forEach((f) => { try { f(); } catch (e) { /* ignore */ } });
  }
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    try { data = sane(JSON.parse(e.newValue)); listeners.forEach((f) => f()); } catch (err) { /* ignore */ }
  });

  function rec(id) {
    let r = data.problems[id];
    if (!r) r = data.problems[id] = {};
    if (!r.solved) r.solved = {};
    if (!r.status) r.status = "new";
    r.attempts = r.attempts || 0;
    r.hintsUsed = r.hintsUsed || 0;
    r.revealed = !!r.revealed;
    return r;
  }
  function peek(id) { return data.problems[id] || null; }

  const store = {
    KEY, MODES,
    get persistent() { return persistent; },
    onChange(f) { listeners.push(f); },
    get(id) { const r = peek(id); return r ? JSON.parse(JSON.stringify(rec(id))) : { status: "new", solved: {}, attempts: 0, hintsUsed: 0, revealed: false }; },
    status(id) { const r = peek(id); return (r && r.status) || "new"; },
    solvedModes(id) { const r = peek(id); return r && r.solved ? MODES.filter((m) => r.solved[m]) : []; },
    touch(id) { const r = rec(id); if (!r.started) { r.started = Date.now(); save(); } },
    attempt(id) {
      const r = rec(id);
      r.attempts++;
      if (r.status === "new") r.status = "attempted";
      r.lastAttempt = Date.now();
      save();
      return r.attempts;
    },
    solve(id, mode) {
      const r = rec(id);
      const first = !r.solved[mode];
      const firstEver = r.status !== "solved";
      r.solved[mode] = true;
      r.status = "solved";
      const now = Date.now();
      if (!r.firstSolved) r.firstSolved = now;
      r.solves = (r.solves || []).slice(-19);
      r.solves.push({ mode, at: now, ms: r.started ? now - r.started : null, attempts: r.attempts });
      save();
      return { first, firstEver, attempts: r.attempts, ms: r.started ? now - r.started : null };
    },
    hint(id, k) { const r = rec(id); if (k > r.hintsUsed) { r.hintsUsed = k; if (r.status === "new") r.status = "attempted"; save(); } },
    reveal(id) { const r = rec(id); if (!r.revealed) { r.revealed = true; if (r.status === "new") r.status = "attempted"; save(); } },
    draft(id, key) { const d = data.drafts[id]; return d && typeof d[key] === "string" ? d[key] : null; },
    draftObj(id, key) { const d = data.drafts[id]; return d && d[key] && typeof d[key] === "object" ? d[key] : null; },
    setDraft(id, key, val) {
      const d = data.drafts[id] || (data.drafts[id] = {});
      if (val === null || val === undefined) delete d[key]; else d[key] = val;
      save();
    },
    pref(k, dflt) { return data.prefs && k in data.prefs ? data.prefs[k] : dflt; },
    setPref(k, v) { data.prefs[k] = v; save(); },
    counts(ids) {
      let solved = 0, attempted = 0;
      ids.forEach((id) => { const s = store.status(id); if (s === "solved") solved++; else if (s === "attempted") attempted++; });
      return { solved, attempted, total: ids.length };
    },
    exportJSON() { return JSON.stringify(Object.assign({ exported: new Date().toISOString(), app: "algorithm-forge-arena" }, data), null, 2); },
    /** Merge an exported file into the current progress (never loses a solve). Returns #problems touched. */
    importJSON(text) {
      const inc = sane(JSON.parse(text));
      let n = 0;
      for (const id in inc.problems) {
        const a = inc.problems[id];
        if (!a || typeof a !== "object") continue;
        const r = rec(id);
        n++;
        MODES.forEach((m) => { if (a.solved && a.solved[m]) r.solved[m] = true; });
        const rank = { new: 0, attempted: 1, solved: 2 };
        if ((rank[a.status] || 0) > (rank[r.status] || 0)) r.status = a.status;
        r.attempts = Math.max(r.attempts || 0, +a.attempts || 0);
        r.hintsUsed = Math.max(r.hintsUsed || 0, +a.hintsUsed || 0);
        r.revealed = r.revealed || !!a.revealed;
        if (a.firstSolved && (!r.firstSolved || a.firstSolved < r.firstSolved)) r.firstSolved = a.firstSolved;
        if (a.started && (!r.started || a.started < r.started)) r.started = a.started;
        if (Array.isArray(a.solves)) r.solves = (r.solves || []).concat(a.solves).slice(-20);
      }
      for (const id in inc.drafts) {
        const d = data.drafts[id] || (data.drafts[id] = {});
        const s = inc.drafts[id] || {};
        for (const k in s) if (d[k] === undefined) d[k] = s[k];
      }
      save();
      return n;
    },
    reset() { data = blank(); save(); },
  };
  Arena.store = store;
})();
