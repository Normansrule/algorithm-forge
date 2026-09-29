/* Forge Arena — problem list (arena/index.html). */
(function () {
  "use strict";
  const Arena = window.Arena;
  const el = (...a) => Forge.el(...a);
  const store = Arena.store;
  const MODE_ICON = { blocks: ["🧱", "Blocks"], pseudo: ["✍️", "Pseudocode"], js: ["JS", "JavaScript"], python: ["🐍", "Python"] };

  const F = { q: "", level: "", chapter: "", topic: "", status: "" };
  let ALL = [];
  let INFO = null;

  function boot() {
    Forge.page({ title: "Practice Arena" });
    const qs = new URLSearchParams(location.search);
    ["q", "level", "chapter", "topic", "status"].forEach((k) => { if (qs.get(k) != null) F[k] = qs.get(k); });
    Arena.loadProblems().then((info) => {
      INFO = info;
      ALL = info.sorted;
      buildHero();
      buildFilters();
      render();
      store.onChange(() => { renderProgress(); render(); });
      if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(() => t.scrollIntoView(), 50); }
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
    }
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
    const statSel = select("f-status", "Status", [["", "Any status"], ["new", "○ New"], ["attempted", "◐ Attempted"], ["solved", "✓ Solved"], ["unsolved", "Not solved yet"]], F.status, (v) => { F.status = v; changed(); });
    const clear = el("button", { class: "btn sm ghost", type: "button", id: "f-clear" }, "Clear filters");
    clear.addEventListener("click", () => { Object.keys(F).forEach((k) => (F[k] = "")); buildFilters(); changed(); });
    host.appendChild(el("div", { class: "filters" },
      el("label", { class: "field grow" }, "Search", search), levelSel, chapSel, topicSel, statSel,
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
    render();
  }
  function matches(p) {
    if (F.level !== "" && String(p.level) !== F.level) return false;
    if (F.chapter !== "" && String(p.chapter) !== F.chapter) return false;
    if (F.topic && !(p.topics || []).some((t) => t.toLowerCase() === F.topic.toLowerCase())) return false;
    const st = store.status(p.id);
    if (F.status === "unsolved" ? st === "solved" : F.status && st !== F.status) return false;
    if (F.q) {
      const hay = [p.title, p.summary, p.id, p.strategy, p.source, (p.topics || []).map(Arena.expandTopic).join(" "), "ch " + p.chapter, Arena.chapterName(p.chapter)].join(" ").toLowerCase();
      if (!F.q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w))) return false;
    }
    return true;
  }

  /* ---------- list ---------- */
  function render() {
    const host = document.getElementById("list");
    host.innerHTML = "";
    const shown = ALL.filter(matches);
    const seen = new Set(); // acronyms already spelled out on this render (see Arena.topicChip)
    const count = document.getElementById("count");
    if (count) count.textContent = `Showing ${shown.length} of ${ALL.length} problem${ALL.length === 1 ? "" : "s"}`;
    if (!ALL.length) { host.appendChild(el("div", { class: "panel empty-state" }, el("h2", null, "No problems loaded"), el("p", { class: "muted" }, "The problem packs couldn't be loaded. If you opened this file directly from disk, serve the docs/ folder over HTTP instead."))); return; }
    if (!shown.length) { host.appendChild(el("div", { class: "panel empty-state" }, el("h2", null, "Nothing matches"), el("p", { class: "muted" }, "Try a different search, or clear the filters."), el("button", { class: "btn", type: "button", onclick: () => document.getElementById("f-clear").click() }, "Clear filters"))); return; }
    (ForgeProblems.LEVELS || []).forEach((L) => {
      const inLevel = ALL.filter((p) => p.level === L.n);
      const rows = shown.filter((p) => p.level === L.n);
      if (!rows.length) return;
      const cnt = store.counts(inLevel.map((p) => p.id));
      const pct = cnt.total ? Math.round((100 * cnt.solved) / cnt.total) : 0;
      const sec = el("section", { class: "level", id: "level-" + L.n, "aria-labelledby": "lh-" + L.n });
      sec.appendChild(el("header", { class: "level-head" },
        el("div", { class: "lv-badge lv" + L.n, "aria-hidden": "true" }, String(L.n)),
        el("div", { class: "lv-text" }, el("h2", { id: "lh-" + L.n }, el("span", { class: "muted lv-k" }, `Level ${L.n} · `), L.name), el("p", { class: "muted small" }, L.blurb)),
        el("div", { class: "lv-prog", title: `${cnt.solved} of ${cnt.total} solved` },
          el("div", { class: "bar", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": cnt.total, "aria-valuenow": cnt.solved, "aria-label": `Level ${L.n} progress` }, el("span", { style: { width: pct + "%" } })),
          el("div", { class: "small muted" }, `${cnt.solved} / ${cnt.total} solved`, rows.length !== inLevel.length ? ` · ${rows.length} shown` : ""))));
      const table = el("table", { class: "plist" },
        el("thead", null, el("tr", null, el("th", { scope: "col", class: "c-st" }, el("span", { class: "sr-only" }, "Status")), el("th", { scope: "col" }, "Problem"), el("th", { scope: "col", class: "c-ch" }, "Chapter"), el("th", { scope: "col", class: "c-d" }, "Difficulty"), el("th", { scope: "col", class: "c-t" }, "Topics"))));
      const tb = el("tbody");
      rows.forEach((p) => tb.appendChild(row(p, seen)));
      table.appendChild(tb);
      sec.appendChild(table);
      host.appendChild(sec);
    });
    if (INFO && INFO.missing.length) host.appendChild(el("p", { class: "muted small packs-note" }, `🔨 ${INFO.missing.length} more problem pack${INFO.missing.length === 1 ? " is" : "s are"} still being forged — check back soon.`));
  }

  function row(p, seen) {
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
      el("div", { class: "psum muted small" }, p.summary || "")));
    tr.appendChild(el("td", { class: "c-ch" }, el("a", { class: "chip steel chlink", href: "?chapter=" + p.chapter, title: "Chapter " + p.chapter + " · " + Arena.chapterName(p.chapter), onclick: (e) => { e.preventDefault(); F.chapter = String(p.chapter); buildFilters(); changed(); } }, "Ch " + p.chapter)));
    tr.appendChild(el("td", { class: "c-d" }, Arena.dots(p.difficulty)));
    tr.appendChild(el("td", { class: "c-t" }, (p.topics || []).slice(0, 3).map((t) => Arena.topicChip(t, seen))));
    return tr;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
