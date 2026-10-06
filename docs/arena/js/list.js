/* Forge Arena — problem list (arena/index.html). */
(function () {
  "use strict";
  const Arena = window.Arena;
  const el = (...a) => Forge.el(...a);
  const store = Arena.store;
  const MODE_ICON = { blocks: ["🧱", "Blocks"], pseudo: ["✍️", "Pseudocode"], js: ["JS", "JavaScript"], python: ["🐍", "Python"] };

  const F = { q: "", level: "", chapter: "", topic: "", status: "", sort: "" };
  const SORTS = [["", "Recommended"], ["difficulty", "Difficulty"], ["newest", "Newest first"], ["unsolved", "Unsolved first"]];
  const PR = Arena.progress;
  let ALL = [];
  let INFO = null;

  function boot() {
    Forge.page({ title: "Practice Arena" });
    const qs = new URLSearchParams(location.search);
    ["q", "level", "chapter", "topic", "status", "sort"].forEach((k) => { if (qs.get(k) != null) F[k] = qs.get(k); });
    Arena.loadProblems().then((info) => {
      INFO = info;
      ALL = info.sorted;
      if (ALL.length) PR.daily(ALL); // today's pick first, so the list can mark it
      buildHero();
      buildFilters();
      render();
      PR.checkBadges(ForgeProblems.list); // quietly catch up on badges earned before badges existed
      renderToday();
      store.onChange(() => { renderProgress(); renderToday(); render(); });
      if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(() => t.scrollIntoView(), 50); }
      // A filtered link (?level=, ?chapter=, ?topic=, ?q=, ?status= — lessons and the Learning Path use them) lands on the
      // filtered list, not on the hero a screen or two above it.
      else if (["q", "level", "chapter", "topic", "status"].some((k) => F[k])) { const t = document.getElementById("filters"); if (t) setTimeout(() => t.scrollIntoView({ block: "start" }), 50); }
    });
  }

  /* ---------- hero ---------- */
  function nextUp() {
    const attempted = ALL.find((p) => store.status(p.id) === "attempted");
    if (attempted) return { p: attempted, verb: "Continue" };
    const fresh = ALL.find((p) => store.status(p.id) !== "solved");
    if (!fresh) return null;
    const any = ALL.some((p) => store.status(p.id) === "solved");
    return { p: fresh, verb: any ? "Next up" : "Start" };
  }
  function buildHero() {
    const host = document.getElementById("hero");
    host.innerHTML = "";
    const cont = el("div", { id: "continue" });
    host.appendChild(el("div", { class: "hero-grid" },
      el("div", null,
        el("div", { class: "eyebrow" }, "Practice Arena"),
        el("h1", null, "Write the pseudocode. ", el("span", { class: "grad" }, "The Forge checks it.")),
        el("p", { class: "lead" }, "LeetCode-style practice for algorithm design. Build each algorithm in Levitin-style pseudocode, run it for real, and find out exactly what's off — with nudges, not spoilers. It starts with a single loop and climbs to the patterns senior engineers and algorithm designers reach for."),
        cont),
      el("aside", { class: "panel progress-card", "aria-label": "Your progress" }, el("div", { class: "panel-title" }, "Your progress"), el("div", { id: "progress" }))));
    host.appendChild(el("nav", { class: "skillmap", id: "skillmap", "aria-label": "Skill map: progress by level" }));
    host.appendChild(el("div", { class: "today", id: "today" }));
    host.appendChild(el("div", { class: "grid cols-3 modes" },
      modeCard("🧱", "Blocks", "Arrange scrambled lines — and fix their indentation — into a working algorithm (a Parsons puzzle). The gentlest way into a new idea."),
      modeCard("✍️", "Pseudocode", "Write it the textbook way. It really runs: every comparison is counted, your Θ-class is measured, and 👁 Visualize replays your code step by step."),
      modeCard("💻", "JavaScript & 🐍 Python", "Translate your pseudocode into real code. Same tests, same nudges — Python runs right in your browser.")));
    host.appendChild(el("div", { class: "panel ladder-strip" },
      el("div", { class: "panel-title" }, "When you're stuck: the hint ladder"),
      el("ol", { class: "steps" },
        step("❓", "Nudge 1", "the key question"),
        step("🗺️", "Nudge 2", "the plan"),
        step("🎯", "Nudge 3", "the exact step"),
        step("🔓", "The answer", "only after “try once more?”")),
      el("p", { class: "small muted" }, "🔎 Plus smart nudges: when your output matches a classic mistake — off-by-one bounds, starting the maximum at 0, counting in the wrong place — the grader names the mistake and how to fix it.")));
    renderProgress();
  }
  function modeCard(icon, title, text) { return el("div", { class: "card mode-card" }, el("div", { class: "mode-icon", "aria-hidden": "true" }, icon), el("h3", null, title), el("p", null, text)); }
  function step(icon, k, v) { return el("li", null, el("span", { class: "st-icon", "aria-hidden": "true" }, icon), el("b", null, k), el("span", { class: "muted" }, v)); }

  function ring(frac) {
    const r = 30, c = 2 * Math.PI * r;
    return Forge.svg("svg", { viewBox: "0 0 80 80", class: "ring", "aria-hidden": "true" },
      Forge.svg("circle", { cx: 40, cy: 40, r, fill: "none", stroke: "var(--line)", "stroke-width": 8 }),
      frac <= 0 ? null : Forge.svg("circle", { cx: 40, cy: 40, r, fill: "none", stroke: "var(--c-done)", "stroke-width": 8, "stroke-linecap": "round", "stroke-dasharray": `${(c * frac).toFixed(1)} ${c.toFixed(1)}`, transform: "rotate(-90 40 40)" }));
  }
  function renderProgress() {
    renderSkillMap();
    const host = document.getElementById("progress");
    if (!host) return;
    const cnt = store.counts(ALL.map((p) => p.id));
    host.innerHTML = "";
    const frac = cnt.total ? cnt.solved / cnt.total : 0;
    host.appendChild(el("div", { class: "prog-top" }, ring(frac),
      el("div", null, el("div", { class: "prog-big" }, `${cnt.solved}`, el("span", { class: "muted" }, ` / ${cnt.total}`)), el("div", { class: "muted small" }, `solved · ${cnt.attempted} in progress`))));
    const file = el("input", { type: "file", accept: "application/json,.json", class: "sr-only", id: "import-file", "aria-label": "Import progress file" });
    file.addEventListener("change", () => {
      const f = file.files && file.files[0];
      if (!f) return;
      f.text().then((t) => {
        try { const n = store.importJSON(t); msg.textContent = `✓ Imported progress for ${n} problem${n === 1 ? "" : "s"}.`; }
        catch (e) { msg.textContent = "⚠ That file isn't an Arena progress export."; }
        file.value = "";
      });
    });
    const msg = el("div", { class: "small muted", "aria-live": "polite" }, store.persistent ? "" : "⚠ Your browser is blocking storage — progress lasts until you close this tab.");
    host.appendChild(el("div", { class: "row prog-actions" },
      el("button", { class: "btn sm", type: "button", onclick: () => Arena.download("forge-arena-progress.json", store.exportJSON()) }, "⬇ Export"),
      el("button", { class: "btn sm", type: "button", onclick: () => file.click() }, "⬆ Import"),
      file));
    host.appendChild(msg);
    const cont = document.getElementById("continue");
    if (cont) {
      cont.innerHTML = "";
      const nu = nextUp();
      if (nu) cont.appendChild(el("div", { class: "row" },
        el("a", { class: "btn primary big", href: "problem.html?id=" + encodeURIComponent(nu.p.id) }, `${nu.verb}: ${nu.p.title} →`),
        el("span", { class: "muted small" }, `Level ${nu.p.level} · Ch ${nu.p.chapter}`)));
      else if (ALL.length) cont.appendChild(el("div", { class: "callout ok" }, "🏆 You've solved every problem in the Arena. Try solving them in another mode!"));
      if (ALL.length) {
        const lvl = PR.currentLevel(ALL);
        cont.appendChild(el("div", { class: "row rand-row" },
          el("button", { class: "btn", type: "button", id: "random-btn", onclick: randomUnsolved }, "🎲 Random unsolved at my level"),
          el("span", { class: "muted small" }, `Your level right now: ${lvl} · ${Arena.levelName(lvl)}`)));
      }
    }
  }

  function randomUnsolved() {
    const lvl = PR.currentLevel(ALL);
    let pool = ALL.filter((p) => p.level === lvl && store.status(p.id) !== "solved");
    if (!pool.length) pool = ALL.filter((p) => store.status(p.id) !== "solved");
    if (!pool.length) pool = ALL.slice();
    const p = pool[Math.floor(Math.random() * pool.length)];
    if (p) location.href = "problem.html?id=" + encodeURIComponent(p.id);
  }

  /* ---------- skill map ---------- */
  const shortName = (L) => String(L.name).split(/[:,]/)[0].trim();
  function renderSkillMap() {
    const host = document.getElementById("skillmap");
    if (!host) return;
    host.innerHTML = "";
    const cur = ALL.length ? PR.currentLevel(ALL) : null;
    const ol = el("ol", { class: "sm-list" });
    (ForgeProblems.LEVELS || []).forEach((L) => {
      const ids = ALL.filter((p) => p.level === L.n).map((p) => p.id);
      const c = store.counts(ids);
      const pct = c.total ? Math.round((100 * c.solved) / c.total) : 0;
      const here = cur === L.n;
      const full = c.total && c.solved === c.total;
      const a = el("a", { class: "sm-tile lv" + L.n + (here ? " here" : "") + (full ? " full" : "") + (c.total ? "" : " soon"), href: "?level=" + L.n, title: `Level ${L.n} · ${L.name}`, "data-level": String(L.n),
        "aria-label": `Level ${L.n}, ${L.name}: ${c.total ? c.solved + " of " + c.total + " solved" : "problems coming soon"}${here ? " — your level" : ""}`,
        onclick: (e) => { e.preventDefault(); F.level = String(L.n); buildFilters(); changed(); const t = document.getElementById("filters"); if (t) t.scrollIntoView({ block: "start", behavior: "smooth" }); } },
        el("span", { class: "sm-n", "aria-hidden": "true" }, full ? "✓" : String(L.n)),
        el("span", { class: "sm-text", "aria-hidden": "true" },
          el("span", { class: "sm-count" }, c.total ? `${c.solved}/${c.total}` : "soon"),
          el("span", { class: "sm-name" }, shortName(L))),
        el("span", { class: "sm-bar", "aria-hidden": "true" }, el("i", { style: { width: pct + "%" } })),
        here ? el("span", { class: "sm-here", "aria-hidden": "true" }, "you") : null);
      ol.appendChild(el("li", null, a));
    });
    host.appendChild(ol);
    syncSkillSel();
  }
  /** The tile of the level the list is filtered to looks pressed, so a ?level= link shows where you are. */
  function syncSkillSel() {
    document.querySelectorAll("#skillmap .sm-tile").forEach((t) => {
      const on = F.level !== "" && t.dataset.level === F.level;
      t.classList.toggle("sel", on);
      if (on) t.setAttribute("aria-current", "true"); else t.removeAttribute("aria-current");
    });
  }

  /* ---------- today: daily challenge, streak, review queue, badges ---------- */
  function fmtDate(key) { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }); }
  function solvedToday(id) { const t = store.dayKey(store.now()); return (store.get(id).solves || []).some((x) => x && x.at && store.dayKey(x.at) === t); }
  function renderToday() {
    const host = document.getElementById("today");
    if (!host || !ALL.length) return;
    const focusId = document.activeElement && host.contains(document.activeElement) ? document.activeElement.id : null;
    host.innerHTML = "";
    host.appendChild(dailyCard());
    host.appendChild(reviewCard());
    host.appendChild(badgesCard());
    if (focusId && document.getElementById(focusId)) document.getElementById(focusId).focus();
  }
  function dailyCard() {
    const d = PR.daily(ALL);
    const st = PR.streak();
    const card = el("section", { class: "panel t-card daily", "aria-labelledby": "daily-h" });
    card.appendChild(el("div", { class: "t-head" }, el("h2", { id: "daily-h", class: "panel-title" }, "☀ Daily challenge"), el("span", { class: "muted small" }, fmtDate(d.date))));
    const p = d.p;
    const done = solvedToday(p.id);
    card.appendChild(el("a", { class: "daily-title", href: "problem.html?id=" + encodeURIComponent(p.id) }, p.title));
    card.appendChild(el("div", { class: "row chips small" }, Arena.levelChip(p.level), Arena.chapterChip(p.chapter), Arena.dots(p.difficulty)));
    if (p.summary) card.appendChild(el("p", { class: "small muted daily-sum" }, p.summary));
    card.appendChild(el("div", { class: "row" },
      done ? el("span", { class: "chip ok" }, "✓ Done today") : el("a", { class: "btn primary sm", href: "problem.html?id=" + encodeURIComponent(p.id), id: "daily-go" }, "Take the challenge →"),
      el("span", { class: "muted small daily-why" }, dailyWhy(p, d.level, done))));
    card.appendChild(el("div", { class: "streak" + (st.today ? " lit" : "") },
      el("span", { class: "streak-n", "aria-hidden": "true" }, "🔥 " + st.current),
      el("div", null,
        el("div", { class: "streak-t" }, !st.current ? "No streak yet" : st.current === 1 ? "1-day streak" : st.current + "-day streak", el("span", { class: "sr-only" }, st.today ? " — today counts" : "")),
        el("div", { class: "small muted" }, st.today ? `Today counts ✓ · best ${st.best}` : st.current ? `Get one Accepted today to keep it going · best ${st.best}` : "Get one Accepted today to start a streak" + (st.best ? ` · best ${st.best}` : "")))));
    return card;
  }
  /** Why today's pick fits, worded from the gap between its level and the learner's current level. */
  function dailyWhy(p, lvl, done) {
    const diff = p.level - lvl;
    if (!done && store.status(p.id) === "solved") return "Already solved: a re-solve keeps it fresh";
    if (diff === 0) return `Picked at your level (Level ${lvl})`;
    if (diff === 1) return `A stretch: one level above yours (Level ${lvl})`;
    if (diff > 1) return `A big stretch: ${diff} levels above yours (Level ${lvl})`;
    if (diff === -1) return `A warm-up from one level below yours (Level ${lvl})`;
    return `Filling a gap: an unsolved problem from Level ${p.level}, below your current Level ${lvl}`;
  }
  function reviewCard() {
    const rv = PR.reviews();
    const card = el("section", { class: "panel t-card review", "aria-labelledby": "review-h", id: "review" });
    card.appendChild(el("div", { class: "t-head" }, el("h2", { id: "review-h", class: "panel-title" }, `🔁 Due for review (${rv.due.length})`),
      rv.due.length > 4 ? el("button", { class: "linkbtn", type: "button", onclick: () => { F.status = "due"; buildFilters(); changed(); document.getElementById("list").scrollIntoView({ block: "start" }); } }, "Show all") : null));
    if (rv.due.length) {
      const ul = el("ul", { class: "rv-list" });
      rv.due.slice(0, 4).forEach((q) => {
        const p = ForgeProblems.get(q.id);
        ul.appendChild(el("li", null, el("span", { class: "lv-dot lv" + p.level, "aria-hidden": "true" }),
          el("a", { href: "problem.html?id=" + encodeURIComponent(p.id) }, p.title),
          el("span", { class: "small muted rv-when" }, PR.dueText(q.due))));
      });
      card.appendChild(ul);
      card.appendChild(el("p", { class: "small muted" }, "Re-solve from scratch — no peeking at your old code. An Accepted clears it from the queue."));
    } else {
      card.appendChild(el("p", { class: "small muted" }, "Nothing due. After an Accepted you can ask to re-solve a problem in 1, 3 or 7 days; problems where you used a nudge or the answer come back by themselves after 2 days."));
    }
    if (rv.upcoming.length) {
      const q = rv.upcoming[0];
      const p = ForgeProblems.get(q.id);
      card.appendChild(el("div", { class: "small rv-next" }, el("span", { class: "muted" }, `Coming up (${rv.upcoming.length}): `), el("a", { href: "problem.html?id=" + encodeURIComponent(p.id) }, p.title), el("span", { class: "muted" }, " · " + PR.dueText(q.due))));
    }
    return card;
  }
  function badgesCard() {
    const st = PR.badgeState(ForgeProblems.list);
    const all = st.general.concat(st.levels.filter((b) => !b.empty));
    const got = all.filter((b) => b.earned).length;
    const card = el("section", { class: "panel t-card badges", "aria-labelledby": "badges-h" });
    card.appendChild(el("div", { class: "t-head" }, el("h2", { id: "badges-h", class: "panel-title" }, "🏅 Badges"), el("span", { class: "muted small" }, `${got} / ${all.length} earned`)));
    const ul = el("ul", { class: "bd-grid" });
    st.general.forEach((b) => {
      const [n, of] = b.progress;
      ul.appendChild(el("li", { class: "bd" + (b.earned ? " got" : ""), title: b.name + " — " + b.desc + (b.earned ? " (earned)" : of > 1 ? ` (${n}/${of})` : "") },
        el("span", { class: "bd-icon", "aria-hidden": "true" }, b.icon),
        el("span", { class: "bd-name" }, b.name, el("span", { class: "sr-only" }, b.earned ? " — earned" : of > 1 ? ` — ${n} of ${of}` : " — not yet")),
        !b.earned && of > 1 ? el("span", { class: "bd-prog", "aria-hidden": "true" }, el("i", { style: { width: Math.round((100 * n) / of) + "%" } })) : null));
    });
    card.appendChild(ul);
    const lv = el("ul", { class: "bd-levels", "aria-label": "Level-complete badges" });
    st.levels.forEach((b) => {
      const [n, of] = b.progress;
      lv.appendChild(el("li", { class: "bdl lv" + b.level + (b.earned ? " got" : "") + (b.empty ? " soon" : ""), title: b.empty ? `Level ${b.level}: coming soon` : `${b.name}: ${n} / ${of}` },
        el("span", { "aria-hidden": "true" }, b.earned ? "✓" : String(b.level)),
        el("span", { class: "sr-only" }, b.empty ? `Level ${b.level}: coming soon` : `Level ${b.level} complete — ${b.earned ? "earned" : n + " of " + of + " solved"}`)));
    });
    card.appendChild(el("div", { class: "bd-lv-row" }, el("span", { class: "small muted" }, "Levels"), lv));
    return card;
  }

  /* ---------- filters ---------- */
  function buildFilters() {
    const host = document.getElementById("filters");
    host.innerHTML = "";
    const search = el("input", { type: "search", placeholder: "Search problems, topics…", value: F.q, "aria-label": "Search problems", id: "f-q" });
    search.addEventListener("input", Arena.debounce(() => { F.q = search.value; changed(); }, 150));
    const levelSel = select("f-level", "Level", [["", "All levels"]].concat((ForgeProblems.LEVELS || []).map((L) => [String(L.n), `L${L.n} · ${L.name}`])), F.level, (v) => { F.level = v; changed(); });
    const chapters = [...new Set(ALL.map((p) => p.chapter))].sort((a, b) => a - b);
    const chapSel = select("f-chapter", "Chapter", [["", "All chapters"]].concat(Object.keys(ForgeProblems.CHAPTERS).map((c) => [c, `Ch ${c} · ${ForgeProblems.CHAPTERS[c]}` + (chapters.includes(+c) ? "" : " (soon)")])), F.chapter, (v) => { F.chapter = v; changed(); });
    const tc = {};
    ALL.forEach((p) => (p.topics || []).forEach((t) => (tc[t] = (tc[t] || 0) + 1)));
    const topics = Object.keys(tc).sort((a, b) => tc[b] - tc[a] || a.localeCompare(b));
    if (F.topic && !tc[F.topic]) topics.unshift(F.topic);
    const topicSel = select("f-topic", "Topic", [["", "All topics"]].concat(topics.map((t) => [t, `${Arena.expandTopic(t)} (${tc[t] || 0})`])), F.topic, (v) => { F.topic = v; changed(); });
    const statSel = select("f-status", "Status", [["", "Any status"], ["new", "○ New"], ["attempted", "◐ Attempted"], ["solved", "✓ Solved"], ["unsolved", "Not solved yet"], ["due", "🔁 Due for review"]], F.status, (v) => { F.status = v; changed(); });
    const sortSel = select("f-sort", "Sort", SORTS, F.sort, (v) => { F.sort = v; changed(); });
    const clear = el("button", { class: "btn sm ghost", type: "button", id: "f-clear" }, "Clear filters");
    clear.addEventListener("click", () => { Object.keys(F).forEach((k) => (F[k] = "")); buildFilters(); changed(); });
    host.appendChild(el("div", { class: "filters" },
      el("label", { class: "field grow" }, "Search", search), levelSel, chapSel, topicSel, statSel, sortSel,
      el("div", { class: "f-end" }, el("div", { id: "count", class: "count muted small", "aria-live": "polite" }), clear)));
  }
  function select(id, label, opts, val, onchange) {
    const s = el("select", { id, "aria-label": label });
    opts.forEach(([v, t]) => s.appendChild(el("option", { value: v }, t)));
    s.value = val;
    s.addEventListener("change", () => onchange(s.value));
    return el("label", { class: "field" }, label, s);
  }
  function changed() {
    const qs = new URLSearchParams();
    Object.keys(F).forEach((k) => { if (F[k]) qs.set(k, F[k]); });
    const url = location.pathname + (qs.toString() ? "?" + qs : "");
    try { history.replaceState(null, "", url); } catch (e) { /* ignore */ }
    syncSkillSel();
    render();
  }
  function matches(p) {
    if (F.level !== "" && String(p.level) !== F.level) return false;
    if (F.chapter !== "" && String(p.chapter) !== F.chapter) return false;
    if (F.topic && !(p.topics || []).some((t) => t.toLowerCase() === F.topic.toLowerCase())) return false;
    const st = store.status(p.id);
    if (F.status === "due") { if (!PR.isDue(p.id)) return false; }
    else if (F.status === "unsolved" ? st === "solved" : F.status && st !== F.status) return false;
    if (F.q) {
      const hay = [p.title, p.summary, p.id, p.strategy, p.source, (p.topics || []).map(Arena.expandTopic).join(" "), "ch " + p.chapter, Arena.chapterName(p.chapter)].join(" ").toLowerCase();
      if (!F.q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w))) return false;
    }
    return true;
  }

  /* ---------- list ---------- */
  const RANK_REC = { attempted: 0, due: 1, new: 2, solved: 3 };
  function orderRows(rows) {
    const idx = new Map(ALL.map((p, i) => [p.id, i]));
    const by = (f) => rows.slice().sort((x, y) => f(x) - f(y) || idx.get(x.id) - idx.get(y.id));
    if (F.sort === "newest") return rows.slice().sort((x, y) => y.order - x.order);
    if (F.sort === "difficulty") return by((p) => (p.difficulty || 1));
    if (F.sort === "unsolved") return by((p) => (store.status(p.id) === "solved" ? 1 : 0));
    return by((p) => { const st = store.status(p.id); return st === "solved" && PR.isDue(p.id) ? RANK_REC.due : RANK_REC[st]; });
  }
  function filtering() { return !!(F.q || F.chapter || F.topic || F.status); }
  function plistTable(rows, seen, withLevel) {
    const table = el("table", { class: "plist" + (withLevel ? " with-level" : "") },
      el("thead", null, el("tr", null, el("th", { scope: "col", class: "c-st" }, el("span", { class: "sr-only" }, "Status")), el("th", { scope: "col" }, "Problem"), el("th", { scope: "col", class: "c-ch" }, withLevel ? "Level" : "Chapter"), el("th", { scope: "col", class: "c-d" }, "Difficulty"), el("th", { scope: "col", class: "c-t" }, "Topics"))));
    const tb = el("tbody");
    rows.forEach((p) => tb.appendChild(row(p, seen, withLevel)));
    table.appendChild(tb);
    return table;
  }
  function levelHead(L, inLevel, rows) {
    const cnt = store.counts(inLevel.map((p) => p.id));
    const pct = cnt.total ? Math.round((100 * cnt.solved) / cnt.total) : 0;
    return el("header", { class: "level-head" },
      el("div", { class: "lv-badge lv" + L.n, "aria-hidden": "true" }, String(L.n)),
      el("div", { class: "lv-text" }, el("h2", { id: "lh-" + L.n }, el("span", { class: "muted lv-k" }, `Level ${L.n} · `), L.name), el("p", { class: "muted small" }, L.blurb)),
      el("div", { class: "lv-prog", title: cnt.total ? `${cnt.solved} of ${cnt.total} solved` : "Coming soon" },
        el("div", { class: "bar", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": Math.max(1, cnt.total), "aria-valuenow": cnt.solved, "aria-valuetext": cnt.total ? `${cnt.solved} of ${cnt.total} solved` : "no problems yet", "aria-label": `Level ${L.n} progress` }, el("span", { style: { width: pct + "%" } })),
        el("div", { class: "small muted" }, cnt.total ? `${cnt.solved} / ${cnt.total} solved` : "coming soon", rows && rows.length !== inLevel.length ? ` · ${rows.length} shown` : "")));
  }
  function render() {
    const host = document.getElementById("list");
    host.innerHTML = "";
    const shown = ALL.filter(matches);
    const seen = new Set(); // acronyms already spelled out on this render (see Arena.topicChip)
    const count = document.getElementById("count");
    if (count) count.textContent = `Showing ${shown.length} of ${ALL.length} problem${ALL.length === 1 ? "" : "s"}`;
    if (!ALL.length) { host.appendChild(el("div", { class: "panel empty-state" }, el("h2", null, "No problems loaded"), el("p", { class: "muted" }, "The problem packs couldn't be loaded. If you opened this file directly from disk, serve the docs/ folder over HTTP instead."))); return; }
    const emptyLevel = F.level !== "" && !ALL.some((p) => String(p.level) === F.level) && (ForgeProblems.LEVELS || []).find((L) => String(L.n) === F.level);
    if (emptyLevel) {
      const sec = el("section", { class: "level", id: "level-" + emptyLevel.n, "aria-labelledby": "lh-" + emptyLevel.n });
      sec.appendChild(levelHead(emptyLevel, [], null));
      sec.appendChild(el("div", { class: "panel empty-state forging" }, el("h2", null, "🔨 Being forged"), el("p", { class: "muted" }, `The Level ${emptyLevel.n} problems are still being written — check back soon. Meanwhile, the levels below it are all open.`), el("button", { class: "btn", type: "button", onclick: () => { F.level = ""; buildFilters(); changed(); } }, "Show every level")));
      host.appendChild(sec);
      return;
    }
    if (!shown.length) { host.appendChild(el("div", { class: "panel empty-state" }, el("h2", null, F.status === "due" ? "Nothing due for review" : "Nothing matches"), el("p", { class: "muted" }, F.status === "due" ? "You're all caught up — reviews you schedule after a solve show up here when they're due." : "Try a different search, or clear the filters."), el("button", { class: "btn", type: "button", onclick: () => document.getElementById("f-clear").click() }, "Clear filters"))); return; }
    if (F.sort === "newest") {
      const sec = el("section", { class: "level flat", "aria-labelledby": "lh-new" });
      sec.appendChild(el("header", { class: "level-head flat-head" }, el("div", { class: "lv-text" }, el("h2", { id: "lh-new" }, "Newest first"), el("p", { class: "muted small" }, "The most recently added problems lead; every level mixed together."))));
      sec.appendChild(plistTable(orderRows(shown), seen, true));
      host.appendChild(sec);
    } else {
      (ForgeProblems.LEVELS || []).forEach((L) => {
        const inLevel = ALL.filter((p) => p.level === L.n);
        const rows = orderRows(shown.filter((p) => p.level === L.n));
        if (!rows.length) {
          // an empty level (its pack is still being written) still shows where it sits on the path
          if (!inLevel.length && !filtering() && F.level === "") {
            const sec = el("section", { class: "level soon", id: "level-" + L.n, "aria-labelledby": "lh-" + L.n });
            sec.appendChild(levelHead(L, inLevel, null));
            sec.appendChild(el("p", { class: "muted small forging-note" }, "🔨 These problems are being forged — check back soon."));
            host.appendChild(sec);
          }
          return;
        }
        const sec = el("section", { class: "level", id: "level-" + L.n, "aria-labelledby": "lh-" + L.n });
        sec.appendChild(levelHead(L, inLevel, rows));
        sec.appendChild(plistTable(rows, seen, false));
        host.appendChild(sec);
      });
    }
    if (INFO && INFO.missing.length) host.appendChild(el("p", { class: "muted small packs-note" }, `🔨 ${INFO.missing.length} more problem pack${INFO.missing.length === 1 ? " is" : "s are"} still being forged — check back soon.`));
  }

  function row(p, seen, withLevel) {
    const st = store.status(p.id);
    const solved = store.solvedModes(p.id);
    const icon = st === "solved" ? "✓" : st === "attempted" ? "◐" : "○";
    const stText = st === "solved" ? "Solved" : st === "attempted" ? "Attempted" : "New";
    const tr = el("tr", { class: "prow st-" + st });
    tr.appendChild(el("td", { class: "c-st" },
      el("span", { class: "st-icon st-" + st, title: stText, "aria-label": stText }, icon),
      solved.length ? el("span", { class: "st-modes", title: "Solved in: " + solved.map((m) => MODE_ICON[m][1]).join(", ") }, solved.map((m) => el("span", { class: "mi", "aria-label": MODE_ICON[m][1] }, MODE_ICON[m][0]))) : null));
    tr.appendChild(el("td", { class: "c-title" },
      el("a", { href: "problem.html?id=" + encodeURIComponent(p.id), class: "ptitle" }, p.title),
      PR.isDue(p.id) ? el("span", { class: "chip due-chip", title: "Due for a spaced-repetition re-solve" }, "🔁 review") : null,
      PR.isDaily(p.id) ? el("span", { class: "chip daily-chip", title: "Today's daily challenge" }, "☀ today") : null,
      el("div", { class: "psum muted small" }, p.summary || "")));
    tr.appendChild(el("td", { class: "c-ch" }, withLevel ? el("span", { class: "chip lvlchip lv" + p.level }, el("b", { class: "lvl lvl-" + p.level }, "L" + p.level)) : el("a", { class: "chip steel chlink", href: "?chapter=" + p.chapter, title: "Chapter " + p.chapter + " · " + Arena.chapterName(p.chapter), onclick: (e) => { e.preventDefault(); F.chapter = String(p.chapter); buildFilters(); changed(); } }, "Ch " + p.chapter)));
    tr.appendChild(el("td", { class: "c-d" }, Arena.dots(p.difficulty)));
    tr.appendChild(el("td", { class: "c-t" }, (p.topics || []).slice(0, 3).map((t) => Arena.topicChip(t, seen))));
    return tr;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
