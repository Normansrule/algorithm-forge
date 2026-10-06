/* Forge Arena — progress features built on Arena.store:
   streaks, the daily challenge, the spaced-repetition review queue and badges.
   Pure logic + a couple of tiny renderers; the list page and the workspace both use it. */
(function () {
  "use strict";
  const Arena = (window.Arena = window.Arena || {});
  const store = Arena.store;
  const DAY = store.DAY;
  const el = (...a) => Forge.el(...a);

  function fnv(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  /** Days between two local calendar keys (b - a). */
  function dayDiff(a, b) {
    const pa = a.split("-").map(Number), pb = b.split("-").map(Number);
    return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / DAY);
  }
  function shiftKey(key, n) {
    const p = key.split("-").map(Number);
    return store.dayKey(new Date(p[0], p[1] - 1, p[2] + n, 12).getTime());
  }

  const P = {};

  /* ---------------- streak ---------------- */
  /** {current, best, today}: consecutive days with at least one Accepted. A streak stays alive until a whole day is missed. */
  P.streak = function () {
    const days = store.days();
    const has = (k) => (days[k] || 0) > 0;
    const today = store.dayKey(store.now());
    let cur = 0;
    let k = has(today) ? today : shiftKey(today, -1);
    while (has(k)) { cur++; k = shiftKey(k, -1); }
    const keys = Object.keys(days).filter(has).sort();
    let best = 0, run = 0;
    keys.forEach((d, i) => { run = i && dayDiff(keys[i - 1], d) === 1 ? run + 1 : 1; best = Math.max(best, run); });
    return { current: cur, best: Math.max(best, cur), today: has(today) };
  };

  /* ---------------- current level ---------------- */
  /** Where the learner has been solving lately: the highest level among their 5 most recent first solves,
      moved up one level once that level is 80% solved. A new learner is at the lowest level that has problems. */
  P.currentLevel = function (list) {
    const levels = (ForgeProblems.LEVELS || []).map((L) => L.n).filter((n) => list.some((p) => p.level === n));
    if (!levels.length) return 0;
    const solved = list.filter((p) => store.status(p.id) === "solved").map((p) => ({ p, at: store.get(p.id).firstSolved || 0 }));
    if (!solved.length) return levels[0];
    solved.sort((a, b) => b.at - a.at);
    let lvl = Math.max(...solved.slice(0, 5).map((x) => x.p.level));
    const inLvl = list.filter((p) => p.level === lvl);
    const done = inLvl.filter((p) => store.status(p.id) === "solved").length;
    if (inLvl.length && done / inLvl.length >= 0.8) { const nxt = levels.find((n) => n > lvl); if (nxt != null) lvl = nxt; }
    return lvl;
  };

  /* ---------------- daily challenge ---------------- */
  /** Today's problem: a hash of the date picks among unsolved problems, weighted toward the current level.
      The pick is remembered for the day, so solving it doesn't swap it for another. */
  P.daily = function (sorted) {
    const today = store.dayKey(store.now());
    const saved = store.daily();
    if (saved && saved.date === today && ForgeProblems.get(saved.id)) return { p: ForgeProblems.get(saved.id), date: today, level: P.currentLevel(sorted) };
    if (!sorted.length) return null;
    const lvl = P.currentLevel(sorted);
    let pool = sorted.filter((p) => store.status(p.id) !== "solved");
    if (!pool.length) pool = sorted.slice(); // everything solved: a re-solve is still good practice
    const weight = (p) => { const d = p.level - lvl; return d === 0 ? 8 : d === 1 ? 3 : d === -1 ? 2 : d > 1 ? 0.25 : 0.5; };
    const total = pool.reduce((s, p) => s + weight(p), 0);
    let x = (fnv("forge-daily|" + today) / 4294967296) * total;
    let pick = pool[pool.length - 1];
    for (const p of pool) { x -= weight(p); if (x < 0) { pick = p; break; } }
    store.setDaily(today, pick.id);
    return { p: pick, date: today, level: lvl };
  };
  P.isDaily = function (id) { const d = store.daily(); return !!(d && d.id === id && d.date === store.dayKey(store.now())); };

  /* ---------------- review queue ---------------- */
  P.AUTO_DAYS = 2;
  /** Due (or overdue) reviews, oldest first; and the upcoming ones. */
  P.reviews = function () {
    const now = store.now();
    const all = store.reviews().filter((q) => ForgeProblems.get(q.id)).sort((a, b) => a.due - b.due);
    return { due: all.filter((q) => q.due <= now), upcoming: all.filter((q) => q.due > now), all };
  };
  P.isDue = function (id) { const q = store.review(id); return !!(q && q.due <= store.now()); };
  /** "today", "tomorrow", "in 3 days", "2 days overdue" — by calendar day. */
  P.dueText = function (due) {
    const d = dayDiff(store.dayKey(store.now()), store.dayKey(due));
    if (d === 0) return "due today";
    if (d < 0) return -d === 1 ? "1 day overdue" : -d + " days overdue";
    return d === 1 ? "due tomorrow" : "due in " + d + " days";
  };
  /** The answer was revealed → bring it back in two days. */
  P.onReveal = function (id) { if (!store.review(id)) store.schedule(id, P.AUTO_DAYS, "revealed"); };

  /* ---------------- badges ---------------- */
  const solvedList = (list) => list.filter((p) => store.status(p.id) === "solved");
  const noHintCount = (list) => solvedList(list).filter((p) => { const r = store.get(p.id); return r.noHint || (!r.hintsUsed && !r.revealed); }).length;
  P.BADGES = [
    { id: "first-accepted", icon: "🔥", name: "First Accepted", desc: "Get your first Accepted.", progress: (list) => [Math.min(1, solvedList(list).length), 1] },
    { id: "no-hint-10", icon: "🧠", name: "Unassisted ×10", desc: "Solve 10 problems without opening a single nudge.", progress: (list) => [Math.min(10, noHintCount(list)), 10] },
    { id: "efficiency", icon: "📈", name: "Efficient first try", desc: "Pass a problem's efficiency check on your very first submission.", progress: (list) => [list.some((p) => store.get(p.id).effFirst) ? 1 : 0, 1] },
    { id: "interview-ace", icon: "⏱", name: "Interview ace", desc: "Get Accepted in Interview mode before the clock runs out.", progress: (list) => [list.some((p) => (store.get(p.id).interviews || []).some((x) => x.passed)) ? 1 : 0, 1] },
    { id: "streak-7", icon: "📅", name: "7-day streak", desc: "Get at least one Accepted on 7 days in a row.", progress: () => [Math.min(7, P.streak().best), 7] },
    { id: "blocks-master", icon: "🧱", name: "Blocks master", desc: "Solve 10 problems in Blocks mode.", progress: (list) => [Math.min(10, list.filter((p) => store.solvedModes(p.id).includes("blocks")).length), 10] },
    { id: "polyglot", icon: "🌐", name: "Polyglot", desc: "Solve one problem in all four modes: Blocks, Pseudocode, JavaScript and Python.", progress: (list) => [list.some((p) => store.solvedModes(p.id).length === 4) ? 1 : 0, 1] },
    { id: "reviewer", icon: "🔁", name: "Spaced out", desc: "Finish 5 spaced-repetition reviews.", progress: () => [Math.min(5, store.reviewsDone), 5] },
  ];
  P.levelBadges = function (list) {
    return (ForgeProblems.LEVELS || []).map((L) => {
      const inL = list.filter((p) => p.level === L.n);
      const done = inL.filter((p) => store.status(p.id) === "solved").length;
      return { id: "level-" + L.n, level: L.n, icon: String(L.n), name: "Level " + L.n + " complete", desc: "Solve every problem in Level " + L.n + " · " + L.name + ".", progress: [done, inL.length], empty: !inL.length };
    });
  };
  /** Every badge with its state: [{id, icon, name, desc, progress:[n, of], earned}] */
  P.badgeState = function (list) {
    const earned = store.badges();
    const general = P.BADGES.map((b) => Object.assign({}, b, { progress: b.progress(list), earned: earned[b.id] || 0 }));
    const levels = P.levelBadges(list).map((b) => Object.assign(b, { earned: earned[b.id] || 0 }));
    return { general, levels };
  };
  /** Award every badge whose goal is met; returns the newly earned ones. */
  P.checkBadges = function (list) {
    const st = P.badgeState(list);
    const met = st.general.concat(st.levels).filter((b) => !b.empty && b.progress[1] > 0 && b.progress[0] >= b.progress[1]).map((b) => b.id);
    const fresh = store.award(met);
    const all = st.general.concat(st.levels);
    return fresh.map((id) => all.find((b) => b.id === id));
  };
  P.toastBadges = function (fresh) {
    fresh.forEach((b, i) => setTimeout(() => Arena.toast({ icon: b.icon, title: "Badge earned: " + b.name, text: b.desc, cls: b.level != null ? "lv" + b.level : "" }), 400 + i * 900));
  };

  /** After an Accepted. Returns what happened to the review queue. */
  P.onSolve = function (id, res) {
    const q = store.review(id);
    const out = { completed: false, queued: null, reason: null };
    if (q && q.due <= store.now()) { store.completeReview(id); out.completed = true; }
    const r = store.get(id);
    if (res && res.firstEver && (r.hintsUsed || r.revealed) && !store.review(id)) {
      out.queued = store.schedule(id, P.AUTO_DAYS, r.revealed ? "revealed" : "hint");
      out.reason = r.revealed ? "revealed" : "hint";
    } else out.queued = store.review(id);
    return out;
  };

  Arena.progress = P;
})();
