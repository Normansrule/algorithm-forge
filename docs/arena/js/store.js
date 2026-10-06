/* Forge Arena — progress store (localStorage key "forge-arena-v1").
   Shape: {v:1, problems: {id: {status, solved:{blocks,pseudo,js,python}, attempts, hintsUsed, revealed,
           firstSolved, started, solves:[{mode, at, ms, attempts}],
           noHint, effFirst, interviews:[{at, ms, limitMs, attempts, passed, gaveUp, lang}]}},
           drafts: {id: {pseudo, js, python, blocks, notes}}, prefs: {mode, pretty, interview},
           // added later — every field is optional, so older saves load unchanged:
           days: {"YYYY-MM-DD": acceptedCount}, review: {id: {due, days, added, reason}}, reviewsDone,
           badges: {badgeId: earnedAt}, daily: {date, id}}
   Every storage access is wrapped: private windows / blocked storage fall back to memory. */
(function () {
  "use strict";
  const Arena = (window.Arena = window.Arena || {});
  const KEY = "forge-arena-v1";
  const MODES = ["blocks", "pseudo", "js", "python"];

  const DAY = 86400000;
  const obj = (x) => x && typeof x === "object" && !Array.isArray(x);
  function blank() { return { v: 1, problems: {}, drafts: {}, prefs: {}, days: {}, review: {}, reviewsDone: 0, badges: {}, daily: null }; }
  /** Local calendar day of a timestamp, "YYYY-MM-DD". */
  function dayKey(ts) {
    const d = new Date(ts == null ? Date.now() : ts);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function sane(d) {
    const out = blank();
    if (!obj(d)) return out;
    if (obj(d.problems)) out.problems = d.problems;
    if (obj(d.drafts)) out.drafts = d.drafts;
    if (obj(d.prefs)) out.prefs = d.prefs;
    if (obj(d.review)) out.review = d.review;
    if (obj(d.badges)) out.badges = d.badges;
    if (obj(d.daily) && typeof d.daily.date === "string") out.daily = d.daily;
    out.reviewsDone = +d.reviewsDone || 0;
    // renamed problem ids: carry saved progress, drafts and review entries over to the new id
    const RENAMED = { "midterm-recurrence-log": "recurrence-halve-log" };
    for (const oldId in RENAMED) {
      const nu = RENAMED[oldId];
      for (const bag of [out.problems, out.drafts, out.review]) {
        if (obj(bag) && bag[oldId] !== undefined && bag[nu] === undefined) { bag[nu] = bag[oldId]; delete bag[oldId]; }
      }
    }
    if (obj(d.days)) out.days = d.days;
    else {
      // older saves: rebuild the calendar of Accepted days from the solve log
      for (const id in out.problems) {
        const r = out.problems[id];
        if (!obj(r)) continue;
        (Array.isArray(r.solves) ? r.solves : []).forEach((x) => { if (x && x.at) { const k = dayKey(x.at); out.days[k] = (out.days[k] || 0) + 1; } });
        if (r.firstSolved && !(Array.isArray(r.solves) && r.solves.length)) { const k = dayKey(r.firstSolved); out.days[k] = (out.days[k] || 0) + 1; }
      }
    }
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
      if (firstEver && !r.hintsUsed && !r.revealed) r.noHint = true;
      const dk = dayKey(now);
      data.days[dk] = (data.days[dk] || 0) + 1;
      r.solves = (r.solves || []).slice(-19);
      r.solves.push({ mode, at: now, ms: r.started ? now - r.started : null, attempts: r.attempts });
      save();
      return { first, firstEver, attempts: r.attempts, ms: r.started ? now - r.started : null };
    },
    /** Mark "passed the efficiency check on the very first submission". */
    effFirst(id) { const r = rec(id); if (!r.effFirst) { r.effFirst = true; save(); } },
    /** Log one interview-mode attempt. */
    interview(id, entry) {
      const r = rec(id);
      r.interviews = (Array.isArray(r.interviews) ? r.interviews : []).slice(-19);
      r.interviews.push(entry);
      save();
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
      for (const k in inc.days) data.days[k] = Math.max(data.days[k] || 0, +inc.days[k] || 0);
      for (const id in inc.review) if (!data.review[id] && obj(inc.review[id]) && +inc.review[id].due) data.review[id] = inc.review[id];
      for (const b in inc.badges) if (!data.badges[b] || +inc.badges[b] < data.badges[b]) data.badges[b] = +inc.badges[b] || store.now();
      data.reviewsDone = Math.max(data.reviewsDone || 0, inc.reviewsDone || 0);
      for (const id in inc.problems) {
        const a = inc.problems[id], r = data.problems[id];
        if (!obj(a) || !r) continue;
        if (a.noHint) r.noHint = true;
        if (a.effFirst) r.effFirst = true;
        if (Array.isArray(a.interviews)) r.interviews = (r.interviews || []).concat(a.interviews).slice(-20);
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

    /* ---- calendar, review queue, badges, daily challenge (all optional fields) ---- */
    DAY, dayKey,
    now() { return Date.now(); },
    days() { return Object.assign({}, data.days); },
    review(id) { const q = data.review[id]; return q ? Object.assign({}, q) : null; },
    reviews() { return Object.keys(data.review).map((id) => Object.assign({ id }, data.review[id])); },
    /** Queue a problem for re-solving in `days` days. */
    schedule(id, days, reason) {
      const now = store.now();
      data.review[id] = { due: now + days * DAY, days, added: now, reason: reason || "manual" };
      save();
      return data.review[id];
    },
    unschedule(id) { if (data.review[id]) { delete data.review[id]; save(); } },
    completeReview(id) { if (data.review[id]) { delete data.review[id]; data.reviewsDone = (data.reviewsDone || 0) + 1; save(); return true; } return false; },
    get reviewsDone() { return data.reviewsDone || 0; },
    badges() { return Object.assign({}, data.badges); },
    hasBadge(b) { return !!data.badges[b]; },
    award(list) { // → the badge ids that are new
      const fresh = list.filter((b) => !data.badges[b]);
      if (fresh.length) { const now = store.now(); fresh.forEach((b) => (data.badges[b] = now)); save(); }
      return fresh;
    },
    daily() { return data.daily ? Object.assign({}, data.daily) : null; },
    setDaily(date, id) { data.daily = { date, id }; save(); },
  };
  Arena.store = store;
})();
