/* Forge Arena — the problem workspace (problem.html?id=…). */
(function () {
  "use strict";
  const Arena = window.Arena;
  const el = (...a) => Forge.el(...a);
  const store = Arena.store;
  const MODES = [
    { id: "blocks", label: "🧱 Blocks", title: "Arrange lines into the algorithm (Parsons puzzle)" },
    { id: "pseudo", label: "✍️ Pseudocode", title: "Write Forge Pseudocode (Levitin style) — runs for real" },
    { id: "js", label: "JS", title: "Write JavaScript" },
    { id: "python", label: "🐍 Python", title: "Write Python (runs in your browser via Pyodide)" },
  ];
  const MODE_NAME = { blocks: "Blocks", pseudo: "Pseudocode", js: "JavaScript", python: "Python" };
  const SYMBOLS = ["←", "≤", "≥", "≠", "∞", "⌊", "⌋", "⌈", "⌉", "↔", "−"];

  const S = {}; // page state

  function boot() {
    Forge.page({ title: "Practice Arena", noFooter: true });
    const main = document.getElementById("ws");
    Arena.loadProblems().then((info) => {
      S.sorted = info.sorted;
      const id = ({ "midterm-recurrence-log": "recurrence-halve-log" })[Arena.qs("id")] || Arena.qs("id"); // old links keep working
      const p = id && ForgeProblems.get(id);
      if (!p) { notFound(main, id, info); return; }
      S.p = p;
      document.title = p.title + " · Practice Arena · Algorithm Forge";
      store.touch(p.id);
      S.grader = new Arena.Grader("worker.js");
      S.grader.onStatus = (m) => showBusy(m.text);
      build(main);
    });
  }

  function notFound(main, id, info) {
    main.classList.add("wrap");
    main.appendChild(el("div", { class: "panel empty-state" },
      el("h1", null, "Problem not found"),
      el("p", null, id ? `There's no problem with id “${id}”` + (info.missing.length ? " — it may live in a pack that hasn't loaded." : ".") : "No problem id was given."),
      el("a", { class: "btn primary", href: "index.html" }, "← Back to all problems")));
  }

  /* ================= layout ================= */
  function build(main) {
    const p = S.p;
    const nb = Arena.neighbors(S.sorted, p.id);
    S.nb = nb;
    // ---- status bar
    S.statusChip = el("span", { class: "chip ws-status" });
    Arena.progress.daily(S.sorted); // make sure today's pick exists, so the chip below is right
    S.ivBtn = el("button", { class: "btn sm iv-toggle", type: "button", "aria-pressed": "false", "aria-expanded": "false", "aria-controls": "iv-host", title: "A timed attempt: no hints, no visualizer and no nudges until the end" }, "⏱ Interview mode");
    S.ivBtn.addEventListener("click", ivToggle);
    S.ivTimer = el("span", { class: "iv-timer", role: "timer", "aria-label": "Interview time left", hidden: true });
    S.ivGiveUp = el("button", { class: "btn sm iv-giveup", type: "button", hidden: true }, "🏳 Give up");
    S.ivGiveUp.addEventListener("click", ivGiveUpClick);
    // phones: the status bar scrolls away, so the sticky editor toolbar gets its own Give up next to the mini timer
    S.ivGiveUpMini = el("button", { class: "btn sm iv-giveup iv-giveup-mini", type: "button", hidden: true, title: "End the interview now (click twice)" }, "🏳 Give up");
    S.ivGiveUpMini.addEventListener("click", ivGiveUpClick);
    const bar = el("nav", { class: "ws-bar", "aria-label": "Problem navigation" },
      el("a", { class: "btn sm ghost", href: "index.html" + (p.level != null ? "#level-" + p.level : "") }, "← All problems"),
      el("span", { class: "ws-crumb muted small" }, Arena.levelChip(p.level), " ", Arena.chapterChip(p.chapter)),
      Arena.progress.isDaily(p.id) ? el("span", { class: "chip daily-chip", title: "Today's daily challenge" }, "☀ Daily challenge") : null,
      el("span", { class: "spacer" }),
      S.ivTimer, S.ivGiveUp, S.ivBtn,
      S.statusChip,
      el("span", { class: "ws-pos muted small" }, `${nb.index + 1} / ${S.sorted.length}`),
      nb.prev ? el("a", { class: "btn sm", href: "problem.html?id=" + encodeURIComponent(nb.prev.id), title: "Previous: " + nb.prev.title, "aria-label": "Previous problem: " + nb.prev.title }, "‹ Prev") : el("button", { class: "btn sm", disabled: true, type: "button" }, "‹ Prev"),
      nb.next ? el("a", { class: "btn sm", href: "problem.html?id=" + encodeURIComponent(nb.next.id), title: "Next: " + nb.next.title, "aria-label": "Next problem: " + nb.next.title }, "Next ›") : el("button", { class: "btn sm", disabled: true, type: "button" }, "Next ›"));
    // ---- left column
    const left = el("section", { class: "ws-col ws-left", "aria-label": "Problem" });
    left.appendChild(el("header", { class: "ws-title" },
      el("h1", null, p.title),
      el("div", { class: "row chips" }, Arena.levelChip(p.level), Arena.chapterChip(p.chapter, true), Arena.dots(p.difficulty), p.strategy ? el("span", { class: "chip" }, "🛠 " + p.strategy) : null)));
    S.leftTabs = Arena.tabStrip([
      { id: "problem", label: "Problem" }, { id: "hints", label: "💡 Hints" }, { id: "solution", label: "Solution" },
      { id: "notes", label: "📝 Notes" }, { id: "trace", label: "👁 Visualize" },
    ], { label: "Problem panels", prefix: "lt-" });
    left.appendChild(S.leftTabs.el);
    S.panes = {};
    ["problem", "hints", "solution", "notes", "trace"].forEach((k) => {
      const pane = el("div", { class: "pane pane-" + k, role: "tabpanel", id: "pane-" + k, "aria-labelledby": "lt-" + k, hidden: true, tabindex: "-1" });
      S.panes[k] = pane;
      left.appendChild(pane);
    });
    S.lockPane = el("div", { class: "pane pane-locked", role: "tabpanel", hidden: true, tabindex: "-1" });
    left.appendChild(S.lockPane);
    S.leftTabs.onChange = (id, user) => {
      if (S.iv && IV_LOCKED.includes(id)) {
        for (const k in S.panes) S.panes[k].hidden = true;
        renderLockPane(id);
        return;
      }
      S.lockPane.hidden = true;
      for (const k in S.panes) S.panes[k].hidden = k !== id;
      if (id !== "trace" && S.viewer) S.viewer.clear();
      if (id === "trace" && S.viewer && S.viewer.frames && S.viewer.frames.length && S.mode === "pseudo") S.viewer.player.go(S.viewer.player.index);
      else if (id === "trace" && user && S.mode === "pseudo" && !S.tracing && S.viewer && !S.viewer.frames) startTrace(null);
      if (id === "solution") renderSolution();
      if (id === "hints") renderHints();
    };
    renderProblem();
    renderNotes();
    renderTracePane();
    // ---- right column
    const right = el("section", { class: "ws-col ws-right", "aria-label": "Your solution" });
    S.ivHost = el("div", { class: "iv-host", id: "iv-host" });
    right.appendChild(S.ivHost);
    S.modeTabs = Arena.tabStrip(MODES, { label: "Solve mode", prefix: "mt-", cls: "mode-tabs" });
    right.appendChild(S.modeTabs.el);
    // toolbar
    S.btnReset = el("button", { class: "btn sm ghost", type: "button", title: "Replace your code with the starter code" }, "↺ Reset to starter");
    S.btnReset.addEventListener("click", resetClick);
    S.pretty = el("input", { type: "checkbox", id: "pretty" });
    S.pretty.checked = store.pref("pretty", true);
    S.pretty.addEventListener("change", () => { store.setPref("pretty", S.pretty.checked); if (S.editor) S.editor.setPretty(S.pretty.checked); });
    S.prettyWrap = el("label", { class: "toggle small", for: "pretty", title: "Typing <- becomes ←, <= becomes ≤, >= becomes ≥, != becomes ≠" }, S.pretty, " Pretty symbols");
    S.btnViz = el("button", { class: "btn sm", type: "button", title: "Step through your pseudocode on an example" }, "👁 Visualize");
    S.btnViz.addEventListener("click", () => startTrace(null));
    S.btnRun = el("button", { class: "btn sm", type: "button", title: "Run the visible examples (Ctrl/⌘+Enter)" }, "▶ Run");
    S.btnRun.addEventListener("click", () => grade("run"));
    S.btnSubmit = el("button", { class: "btn sm primary", type: "button", title: "Run every test + random tests + efficiency check (Ctrl/⌘+Shift+Enter)" }, "Submit");
    S.btnSubmit.addEventListener("click", () => grade("submit"));
    S.btnCheck = el("button", { class: "btn sm primary", type: "button", title: "Assemble your blocks and grade them (Ctrl/⌘+Enter)" }, "✔ Check");
    S.btnCheck.addEventListener("click", () => grade("submit"));
    S.toolbar = el("div", { class: "ws-toolbar" },
      el("div", { class: "row tb-left" }, S.btnReset, S.prettyWrap, S.ivMini = el("span", { class: "iv-mini", "aria-hidden": "true", hidden: true }), S.ivGiveUpMini),
      el("div", { class: "row tb-right" }, S.btnViz, S.btnRun, S.btnSubmit, S.btnCheck));
    right.appendChild(S.toolbar);
    // palette
    S.palette = el("div", { class: "palette", role: "toolbar", "aria-label": "Insert a symbol" });
    SYMBOLS.forEach((sym) => {
      const b = el("button", { class: "sym", type: "button", title: "Insert " + sym, "aria-label": "Insert " + sym }, sym);
      b.addEventListener("mousedown", (e) => e.preventDefault()); // keep the caret in the editor
      b.addEventListener("click", () => S.editor.insert(sym));
      S.palette.appendChild(b);
    });
    right.appendChild(S.palette);
    S.modeNote = el("div", { class: "mode-note small" });
    right.appendChild(S.modeNote);
    // editor
    S.edHost = el("div", { class: "ed-host" });
    right.appendChild(S.edHost);
    S.editor = new Arena.Editor(S.edHost, {
      lang: "pseudo", pretty: S.pretty.checked, label: "Code editor", describedBy: "ed-help",
      onChange: Arena.debounce((v) => { store.setDraft(p.id, S.mode, v); if (S.viewer) S.viewer.markStale(v); }, 350),
      onRun: () => grade("run"), onSubmit: () => grade("submit"),
    });
    S.edHelp = el("div", { class: "ed-help muted small", id: "ed-help" },
      el("kbd", null, "Ctrl"), "/", el("kbd", null, "⌘"), "+", el("kbd", null, "Enter"), " Run · ",
      el("kbd", null, "Ctrl"), "+", el("kbd", null, "Shift"), "+", el("kbd", null, "Enter"), " Submit · ",
      el("kbd", null, "Tab"), " indents — press ", el("kbd", null, "Esc"), " then ", el("kbd", null, "Tab"), " to leave the editor");
    right.appendChild(S.edHelp);
    S.blocksHost = el("div", { class: "blocks-host", hidden: true });
    right.appendChild(S.blocksHost);
    S.results = el("div", { class: "results", "aria-live": "polite", "aria-atomic": "false" });
    right.appendChild(S.results);
    S.celebrate = el("div", { class: "celebrate-host" });
    right.insertBefore(S.celebrate, S.results);

    const grid = el("div", { class: "ws-grid" }, left, right);
    main.appendChild(bar);
    main.appendChild(grid);
    S.left = left; S.right = right;

    S.modeTabs.onChange = (id, user) => switchMode(id, user);
    const m0 = Arena.qs("mode");
    S.modeTabs.select(MODES.some((m) => m.id === m0) ? m0 : store.pref("mode", "pseudo"));
    S.leftTabs.select(Arena.qs("tab") && S.panes[Arena.qs("tab")] ? Arena.qs("tab") : "problem");
    updateStatus();
    store.onChange(updateStatus);
    ivResume();

    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !e.target.closest(".ed")) {
        e.preventDefault();
        grade(S.mode === "blocks" ? "submit" : e.shiftKey ? "submit" : "run");
      }
    });
    window.addEventListener("beforeunload", () => { if (S.editor && S.mode !== "blocks") store.setDraft(p.id, S.mode, S.editor.getValue()); });
  }

  /* ================= status ================= */
  function updateStatus() {
    const r = store.get(S.p.id);
    const chip = S.statusChip;
    chip.className = "chip ws-status " + (r.status === "solved" ? "ok" : r.status === "attempted" ? "warn" : "");
    const modes = store.solvedModes(S.p.id).map((m) => ({ blocks: "🧱", pseudo: "✍️", js: "JS", python: "🐍" }[m])).join(" ");
    chip.textContent = r.status === "solved" ? "✓ Solved " + modes : r.status === "attempted" ? "◐ Attempted" : "○ New";
    MODES.forEach((m) => {
      const b = S.modeTabs.btn(m.id);
      b.classList.toggle("done", !!(r.solved && r.solved[m.id]));
      b.setAttribute("aria-label", m.label.replace(/^\W+\s*/, "") + (r.solved && r.solved[m.id] ? " (solved)" : ""));
    });
  }

  /* ================= left: problem ================= */
  function renderProblem() {
    const p = S.p, pane = S.panes.problem;
    pane.innerHTML = "";
    const meta = el("div", { class: "meta small muted" });
    if (p.source) meta.appendChild(el("span", null, "📚 " + p.source));
    if (p.topics && p.topics.length) meta.appendChild(el("span", { class: "topics" }, p.topics.map((t) => Arena.topicChip(t, null, "a", { href: "index.html?topic=" + encodeURIComponent(t) }))));
    pane.appendChild(meta);
    pane.appendChild(el("div", { class: "statement", html: p.statement || "" }));
    // examples
    const n = Math.min((p.tests || []).length, p.exampleCount || 3);
    if (n) {
      const box = el("div", { class: "examples" }, el("h2", null, "Examples"));
      p.tests.slice(0, n).forEach((t, i) => box.appendChild(exampleCard(p, t, i)));
      pane.appendChild(box);
    }
    const sig = el("div", { class: "callout steel small sig" }, "Keep the name ", el("code", null, p.entry), " and the inputs ", el("code", null, (p.params || []).join(", ")),
      p.output && p.output.arg !== undefined ? [" — the grader checks ", el("code", null, p.params[p.output.arg]), " after your algorithm finishes (in place)."] : " — the grader checks what you return.");
    pane.appendChild(sig);
    if (p.visual) pane.appendChild(el("p", { class: "small" }, "👀 See it first: ", el("a", { href: "../" + p.visual, target: "_blank", rel: "noopener" }, simName(p.visual) + " simulation ↗")));
  }
  function simName(v) { return String(v).split("/").pop().replace(/\.html$/, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()); }
  function valueView(v) {
    if (Arena.isFlat(v) && v.length <= 24 && v.length >= 0) return el("span", { class: "vv" }, Arena.cells(v));
    if (Arena.isGrid(v)) return el("span", { class: "vv" }, Arena.gridCells(v));
    if (v === null || ["number", "string", "boolean"].includes(typeof v)) return el("span", { class: "vv-scalar" }, Arena.show(v));
    return el("code", { class: "vv-text" }, Arena.show(v));
  }
  function exampleCard(p, t, i) {
    const card = el("div", { class: "example" }, el("div", { class: "ex-title" }, t.name || "Example " + (i + 1)));
    const io = el("div", { class: "io" });
    const inBox = el("div", { class: "io-in" }, el("div", { class: "io-label" }, "Input"));
    (p.params || []).forEach((nm, k) => inBox.appendChild(el("div", { class: "io-arg" }, el("code", { class: "argname" }, nm + " ="), valueView(t.args[k]))));
    const outLabel = p.output && p.output.arg !== undefined ? `${p.params[p.output.arg]} afterwards` + (p.verify ? " (e.g.)" : "") : p.verify ? "Output (one valid answer)" : "Output";
    const outBox = el("div", { class: "io-out" }, el("div", { class: "io-label" }, outLabel), "expect" in t ? valueView(t.expect) : el("span", { class: "muted" }, "checked by rules"));
    io.appendChild(inBox);
    io.appendChild(el("div", { class: "io-arrow", "aria-hidden": "true" }, "→"));
    io.appendChild(outBox);
    card.appendChild(io);
    if (t.explain) card.appendChild(el("div", { class: "ex-explain small" }, "💬 " + t.explain));
    return card;
  }

  /* ================= left: hints ================= */
  function renderHints() {
    const p = S.p, pane = S.panes.hints;
    const r = store.get(p.id);
    const hints = p.hints || [];
    pane.innerHTML = "";
    pane.appendChild(el("p", { class: "muted small" }, "Each nudge points you a little further — the first is a question to think about, the last is the specific step. Using them is smart, not cheating."));
    const lad = el("ol", { class: "ladder" });
    hints.forEach((h, i) => {
      const open = i < r.hintsUsed;
      lad.appendChild(el("li", { class: "rung " + (open ? "open" : "locked") },
        el("div", { class: "rung-k" }, `Nudge ${i + 1} of ${hints.length}`),
        open ? el("div", { class: "rung-text" }, h) : el("div", { class: "rung-text muted" }, i === r.hintsUsed ? "Ready when you are." : "🔒 Locked")));
    });
    lad.appendChild(el("li", { class: "rung answer " + (r.revealed || r.status === "solved" ? "open" : "locked") }, el("div", { class: "rung-k" }, "The answer"),
      el("div", { class: "rung-text muted" }, r.revealed || r.status === "solved" ? "Unlocked — see the Solution tab." : "🔒 After the last nudge")));
    pane.appendChild(lad);
    const actions = el("div", { class: "row hint-actions" });
    if (r.hintsUsed < hints.length) {
      const b = el("button", { class: "btn primary", type: "button", id: "next-hint" }, `💡 Show nudge ${r.hintsUsed + 1} of ${hints.length}`);
      b.addEventListener("click", () => { store.hint(p.id, r.hintsUsed + 1); renderHints(); Arena.announce(`Nudge ${r.hintsUsed + 1}: ${hints[r.hintsUsed]}`); const nb = S.panes.hints.querySelector("#next-hint, #show-answer"); if (nb) nb.focus(); });
      actions.appendChild(b);
    } else if (!r.revealed && r.status !== "solved") {
      const b = el("button", { class: "btn", type: "button", id: "show-answer" }, "🔓 Show the answer");
      b.addEventListener("click", () => confirmReveal(actions));
      actions.appendChild(b);
    } else {
      actions.appendChild(el("button", { class: "btn", type: "button", onclick: () => S.leftTabs.select("solution", true) }, "Open the Solution tab →"));
    }
    pane.appendChild(actions);
  }
  function confirmReveal(host) {
    host.innerHTML = "";
    const box = el("div", { class: "confirm callout", role: "alertdialog", "aria-labelledby": "cf-q" },
      el("p", { id: "cf-q" }, el("b", null, "Want to try once more first?"), " You've read every nudge — one more attempt often clicks. The answer will still be here."),
      el("div", { class: "row" },
        el("button", { class: "btn primary", type: "button", id: "try-again", onclick: () => { renderHints(); renderSolution(); if (S.mode !== "blocks") S.editor.focus(); else { const b = S.blocksHost.querySelector(".pz-block"); if (b) b.focus(); } Arena.announce("Go for it — the answer stays hidden."); } }, "✍️ Yes, let me try"),
        el("button", { class: "btn", type: "button", id: "reveal-yes", onclick: () => { store.reveal(S.p.id); Arena.progress.onReveal(S.p.id); S.leftTabs.select("solution", true); Arena.announce("Answer revealed — it's queued for a re-solve in 2 days"); } }, "🔓 Show me the answer")));
    host.appendChild(box);
    box.querySelector("#try-again").focus();
  }

  /* ================= left: solution ================= */
  function renderSolution() {
    const p = S.p, pane = S.panes.solution;
    const r = store.get(p.id);
    pane.innerHTML = "";
    if (!r.revealed && r.status !== "solved") {
      const actions = el("div", { class: "row" });
      pane.appendChild(el("div", { class: "locked-sol" },
        el("div", { class: "big", "aria-hidden": "true" }, "🔒"),
        el("h2", null, "The reference answer is hidden"),
        el("p", { class: "muted" }, ((p.hints || []).length - r.hintsUsed > 0 ? `Try the hint ladder first (${(p.hints || []).length - r.hintsUsed} nudge${(p.hints || []).length - r.hintsUsed === 1 ? "" : "s"} left) — you'll learn far more from finishing it yourself.` : "You've used every nudge. One more attempt often does it — you'll learn far more from finishing it yourself.")),
        actions));
      actions.appendChild(el("button", { class: "btn primary", type: "button", onclick: () => S.leftTabs.select("hints", true) }, "💡 Go to the hints"));
      const rev = el("button", { class: "btn", type: "button" }, "Reveal anyway");
      rev.addEventListener("click", () => confirmReveal(actions));
      actions.appendChild(rev);
      return;
    }
    const sol = p.solution || {};
    const langs = [["pseudo", "Pseudocode"], ["js", "JavaScript"], ["python", "Python"]].filter(([k]) => sol[k]);
    const sw = Arena.tabStrip(langs.map(([id, label]) => ({ id, label })), { label: "Solution language", prefix: "sl-", cls: "sol-tabs" });
    const codeHost = el("div", { class: "sol-code" });
    sw.onChange = (id) => {
      codeHost.innerHTML = "";
      codeHost.appendChild(Arena.codeBlock(sol[id], id));
      const target = id;
      codeHost.appendChild(el("div", { class: "row" },
        el("button", { class: "btn sm", type: "button", onclick: () => copyToEditor(target, sol[target]) }, `📋 Put it in the ${MODE_NAME[target]} editor`),
        el("span", { class: "muted small" }, "(your current draft is replaced — Ctrl+Z undoes)")));
    };
    if (r.status === "solved") pane.appendChild(el("div", { class: "callout ok small row sol-solved" }, el("span", null, "🎉 You solved this one — compare your approach with the reference."),
      el("button", { class: "btn sm", type: "button", onclick: () => openCompare() }, "⇆ Compare side by side")));
    pane.appendChild(sw.el);
    pane.appendChild(codeHost);
    sw.select(langs.some(([k]) => k === S.mode) ? S.mode : langs.length ? langs[0][0] : "pseudo");
    if (sol.explain) pane.appendChild(el("div", { class: "sol-sec" }, el("h3", null, "Why it works"), el("p", null, sol.explain)));
    if (p.complexity) pane.appendChild(el("div", { class: "sol-sec" }, el("h3", null, "Efficiency"), el("p", null, el("span", { class: "chip ember" }, p.complexity))));
    const twist = p.followUp || sol.followUp;
    if (twist) pane.appendChild(el("div", { class: "sol-sec callout steel" }, el("h3", null, "🧑‍💻 Senior twist"), el("p", { html: twist })));
    const links = el("div", { class: "row sol-links" });
    if (p.lesson) links.appendChild(el("a", { class: "btn sm", href: Arena.GITHUB + p.lesson, target: "_blank", rel: "noopener" }, "📖 Lesson ↗"));
    if (p.visual) links.appendChild(el("a", { class: "btn sm", href: "../" + p.visual, target: "_blank", rel: "noopener" }, "👀 Simulation ↗"));
    if (links.children.length) pane.appendChild(links);
  }
  function copyToEditor(lang, code) {
    S.modeTabs.select(lang, true);
    S.editor.ta.focus({ preventScroll: true });
    S.editor.ta.select();
    S.editor.insertText(code);
    store.setDraft(S.p.id, lang, code);
    Arena.announce("Reference code placed in the editor");
  }

  /* ================= left: notes ================= */
  function renderNotes() {
    const pane = S.panes.notes;
    const saved = el("span", { class: "muted small", "aria-live": "polite" }, "");
    const ta = el("textarea", { class: "notes", rows: 12, "aria-label": "Your private notes for this problem", placeholder: "Your private notes (saved only in this browser): the key insight, the loop invariant, the mistake you made, a question to look into…" });
    ta.value = store.draft(S.p.id, "notes") || "";
    const save = Arena.debounce(() => { store.setDraft(S.p.id, "notes", ta.value); saved.textContent = store.persistent ? "✓ Saved" : "⚠ Your browser is blocking storage — notes last until you close this tab"; }, 400);
    ta.addEventListener("input", () => { saved.textContent = "Saving…"; save(); });
    pane.appendChild(el("h2", null, "📝 Notes"));
    pane.appendChild(ta);
    pane.appendChild(el("div", { class: "row" }, saved));
  }

  /* ================= left: trace ================= */
  function renderTracePane() {
    const pane = S.panes.trace;
    S.traceIntro = el("div", { class: "trace-intro" },
      el("h2", null, "👁 Watch your own code run"),
      el("p", { class: "muted small" }, "Pick an input and step through your pseudocode one statement at a time: the current line lights up in the editor, arrays are drawn as cells with arrows for index variables (i, j, l, r…), and every variable change flashes. Use ◀ ▶ or the arrow keys."));
    S.traceMsg = el("div", { class: "trace-msg" });
    pane.appendChild(S.traceIntro);
    pane.appendChild(S.traceMsg);
    S.viewerHost = el("div");
    pane.appendChild(S.viewerHost);
    S.viewer = new Arena.TraceViewer(S.viewerHost, { editor: S.editor || null });
    S.viewer.setup(S.p, (args) => runTrace(args));
  }
  function startTrace(args) {
    if (S.mode !== "pseudo") { S.modeTabs.select("pseudo", true); }
    runTrace(args || JSON.parse(JSON.stringify(((S.p.tests || [])[S.viewer.select && S.viewer.select.value !== "custom" ? +S.viewer.select.value : 0] || { args: [] }).args)));
  }
  async function runTrace(args) {
    if (S.tracing) return;
    S.tracing = true;
    if (S.mode !== "pseudo") S.modeTabs.select("pseudo", true);
    S.viewer.editor = S.editor;
    if (S.leftTabs.current !== "trace") S.leftTabs.select("trace", true);
    const code = S.editor.getValue();
    S.viewer.say("⏳ Tracing…", "steel");
    try {
      const res = await S.grader.trace({ id: S.p.id, code, args });
      S.editor.setErrorLine(null);
      S.viewer.load(res, { code, args });
      if (res.error) S.editor.setErrorLine(res.error.line);
      // stacked layout (phones, tablets): the 👁 Visualize button sits below the trace pane, so bring the pane's
      // call line and step controls into view instead of leaving the reader at the bottom of a long pane
      if (matchMedia("(max-width: 999px)").matches) {
        const head = S.viewerHost.querySelector(".tv-header") || S.panes.trace;
        const r = head.getBoundingClientRect();
        if (r.top < 100 || r.top > window.innerHeight * 0.6) head.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      }
    } catch (err) {
      S.viewer.say(err && err.timeout ? "⏱ " + Arena.TOO_LONG : "The tracer failed: " + ((err && (err.fatal || err.message)) || err), "bad");
    } finally { S.tracing = false; }
  }

  /* ================= right: modes ================= */
  function switchMode(mode, user) {
    const p = S.p;
    if (S.mode && S.mode !== "blocks" && S.editor) store.setDraft(p.id, S.mode, S.editor.getValue());
    S.mode = mode;
    if (user) store.setPref("mode", mode);
    const code = mode !== "blocks";
    S.edHost.hidden = !code;
    S.edHelp.hidden = !code;
    S.blocksHost.hidden = code;
    S.palette.hidden = mode !== "pseudo";
    S.prettyWrap.hidden = mode !== "pseudo";
    S.btnViz.hidden = mode !== "pseudo";
    S.btnRun.hidden = !code;
    S.btnSubmit.hidden = !code;
    S.btnCheck.hidden = code;
    S.btnReset.textContent = code ? "↺ Reset to starter" : "↺ Reset blocks";
    S.results.innerHTML = "";
    S.celebrate.innerHTML = "";
    // notes per mode
    S.modeNote.innerHTML = "";
    if ((mode === "js" || mode === "python") && (p.budget || p.growth)) S.modeNote.appendChild(el("div", { class: "callout steel" }, `ℹ️ In ${MODE_NAME[mode]} the grader checks correctness only — the operation ${p.budget ? "budget" : "count"} and efficiency check apply to ✍️ Pseudocode.`));
    if (mode === "python") S.modeNote.appendChild(el("div", { class: "callout steel" }, "🐍 Python runs right in your browser (Pyodide — about 10 MB the first time). Define ", el("code", null, "def " + Arena.snake(p.entry) + "(…)"), ". ", el("code", null, "print()"), " output shows under each test."));
    if (mode === "blocks" && !(p.solution && p.solution.pseudo)) S.modeNote.appendChild(el("div", { class: "callout bad" }, "This problem has no reference pseudocode, so there is no puzzle to build."));
    if (code) {
      S.editor.setLang(mode);
      const draft = store.draft(p.id, mode);
      S.editor.setValue(draft != null ? draft : Arena.starter(p, mode));
      S.editor.setTraceLine(null, false);
      if (S.viewer && S.leftTabs.current === "trace" && mode !== "pseudo") S.viewer.clear();
    } else if (!S.blocks) {
      S.blocks = new Arena.Blocks(S.blocksHost, {
        problem: p, saved: store.draftObj(p.id, "blocks"),
        onSave: (st) => store.setDraft(p.id, "blocks", st),
        onToEditor: (code) => { store.setDraft(p.id, "pseudo", code); S.modeTabs.select("pseudo", true); Arena.announce("Your blocks are now in the Pseudocode editor"); },
      });
    }
    S.traceMsg.innerHTML = "";
    if (mode !== "pseudo") S.traceMsg.appendChild(el("div", { class: "callout steel small" }, "Visualize works on ✍️ Pseudocode. ", el("button", { class: "linkbtn", type: "button", onclick: () => S.modeTabs.select("pseudo", true) }, "Switch to Pseudocode →")));
  }

  let resetArmed = null;
  function resetClick() {
    if (!resetArmed) {
      S.btnReset.textContent = "Click again to reset";
      S.btnReset.classList.add("armed");
      resetArmed = setTimeout(() => { resetArmed = null; S.btnReset.classList.remove("armed"); S.btnReset.textContent = S.mode === "blocks" ? "↺ Reset blocks" : "↺ Reset to starter"; }, 3000);
      return;
    }
    clearTimeout(resetArmed); resetArmed = null;
    S.btnReset.classList.remove("armed");
    if (S.mode === "blocks") {
      store.setDraft(S.p.id, "blocks", null);
      S.blocksHost.innerHTML = ""; S.blocks = null;
      switchMode("blocks");
    } else {
      const st = Arena.starter(S.p, S.mode);
      S.editor.ta.focus({ preventScroll: true });
      S.editor.ta.select();
      S.editor.insertText(st); // undoable
      store.setDraft(S.p.id, S.mode, st);
      S.btnReset.textContent = "↺ Reset to starter";
    }
    S.results.innerHTML = "";
    Arena.announce("Reset");
  }

  /* ================= grading ================= */
  function setBusy(b) {
    S.busy = b;
    [S.btnRun, S.btnSubmit, S.btnCheck, S.btnViz].forEach((x) => (x.disabled = b));
    S.btnViz.disabled = b || !!S.iv;
    S.right.classList.toggle("busy", b);
  }
  function showBusy(text) {
    S.results.innerHTML = "";
    S.results.appendChild(el("div", { class: "report is-running" }, el("div", { class: "rep-head" }, el("span", { class: "spinner", "aria-hidden": "true" }), el("div", null, el("div", { class: "rep-title" }, text || "Running…")))));
  }
  async function grade(mode) {
    if (S.busy) return;
    const p = S.p;
    const blocks = S.mode === "blocks";
    if (blocks && !S.blocks) return;
    const lang = blocks ? "pseudo" : S.mode;
    const code = blocks ? S.blocks.code() : S.editor.getValue();
    if (!blocks) store.setDraft(p.id, S.mode, code);
    if (blocks) mode = "submit";
    setBusy(true);
    S.celebrate.innerHTML = "";
    showBusy(mode === "run" ? "Running the examples…" : blocks ? "Checking your arrangement…" : "Submitting — running every test…");
    if (mode === "submit") store.attempt(p.id);
    const iv = S.iv;
    if (iv && mode === "submit") { iv.attempts++; iv.lastCode = code; iv.lastLang = lang; ivSave(); }
    if (!blocks) S.editor.setErrorLine(null);
    let report;
    try {
      report = await S.grader.check({ id: p.id, lang, code, mode });
    } catch (err) {
      setBusy(false);
      S.results.innerHTML = "";
      if (err && err.timeout) S.results.appendChild(Arena.renderProblem("Took too long", Arena.TOO_LONG + " (Stopped after " + Math.round(err.ms / 1000) + " s.)", "⏱"));
      else S.results.appendChild(Arena.renderProblem("The grader hit a problem", (err && (err.fatal || err.message)) || String(err), "⚠️"));
      Arena.announce("Took too long");
      scrollResults();
      return;
    }
    setBusy(false);
    const errLine = report.compileError && report.compileError.line || ((report.tests || []).find((t) => t.error && t.error.line) || { error: {} }).error.line;
    if (!blocks && errLine) S.editor.setErrorLine(errLine);
    const hintsLeft = Math.max(0, (p.hints || []).length - store.get(p.id).hintsUsed);
    const extra = [];
    if (blocks && report.status !== "passed") {
      if (S.blocks.hasDistractorInList()) extra.push({ kind: "blocks", message: "A decoy line may still be in your algorithm — not every block belongs. Try setting one aside with 🗑." });
      const aside = S.blocks.realAside();
      if (aside) extra.push({ kind: "blocks", message: `You set aside ${aside} block${aside === 1 ? "" : "s"} that the finished algorithm might need.` });
      if (report.status === "error") extra.push({ kind: "blocks", message: "Check the indentation: a line belongs inside a loop or if only when it sits one level (⇥) deeper than that loop or if." });
      if (errLine && S.blocks.markError(errLine)) extra.push({ kind: "blocks", message: `Line ${errLine} is the block outlined in red (count from the header — “👀 Show as code” shows line numbers).` });
    }
    const accepted = report.status === "passed" && mode === "submit";
    if (iv && S.iv === iv) iv.last = { report, lang: blocks ? "blocks" : lang, extra };
    S.results.innerHTML = "";
    S.results.appendChild(Arena.renderReport(report, {
      problem: p, lang: blocks ? "blocks" : lang, hintsLeft, extraNudges: extra, interview: !!(S.iv && !accepted),
      onHint: () => { const r = store.get(p.id); if (r.hintsUsed < (p.hints || []).length) store.hint(p.id, r.hintsUsed + 1); S.leftTabs.select("hints", true); renderHints(); },
      onGotoLine: (n) => S.editor.gotoLine(n),
      onWatch: blocks ? null : (args) => runTrace(JSON.parse(JSON.stringify(args))),
    }));
    Arena.announce(report.status === "passed" ? (mode === "submit" ? "Accepted" : "All examples pass") : `${report.passed} of ${report.total} passed`);
    if (accepted) {
      S.lastAccepted = { lang: blocks ? "blocks" : lang, code };
      if (S.iv) ivEnd("passed");
      celebrate(blocks ? "blocks" : lang, report);
    }
    scrollResults();
  }
  function scrollResults() {
    const t = S.celebrate.firstChild || S.results.firstChild;
    if (t && t.scrollIntoView) t.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  function celebrate(mode, report) {
    const p = S.p;
    const res = store.solve(p.id, mode);
    if (report && report.growth && report.growth.ok && res.attempts === 1) store.effFirst(p.id);
    const rv = Arena.progress.onSolve(p.id, res);
    renderHints();
    const next = S.nb.next;
    const nextUnsolved = S.sorted.slice(S.nb.index + 1).find((q) => store.status(q.id) !== "solved") || S.sorted.find((q) => store.status(q.id) !== "solved");
    const mins = res.ms != null ? (res.ms < 60000 ? Math.max(1, Math.round(res.ms / 1000)) + " s" : res.ms < 3600000 ? Math.round(res.ms / 60000) + " min" : "a while") : null;
    const twist = p.followUp || (p.solution && p.solution.followUp);
    const sparks = el("span", { class: "sparks", "aria-hidden": "true" });
    for (let k = 0; k < 12; k++) { const i = el("i"); i.style.setProperty("--a", k * 30 + "deg"); i.style.setProperty("--d", 0.04 * k + "s"); sparks.appendChild(i); }
    const streak = Arena.progress.streak();
    const daily = Arena.progress.isDaily(p.id);
    const card = el("div", { class: "celebrate", role: "status" },
      el("div", { class: "cel-top" },
        el("span", { class: "cel-badge", "aria-hidden": "true" }, "✓", sparks),
        el("div", null,
          el("div", { class: "cel-title" }, res.firstEver ? "Solved! Nicely forged." : res.first ? `Solved in ${MODE_NAME[mode]} too!` : "Accepted again — still sharp."),
          el("div", { class: "cel-sub muted small" }, [`${MODE_NAME[mode]}`, `${res.attempts} submission${res.attempts === 1 ? "" : "s"}`, mins ? mins + " since you opened it" : null, store.get(p.id).hintsUsed ? store.get(p.id).hintsUsed + " nudge" + (store.get(p.id).hintsUsed === 1 ? "" : "s") : "no nudges"].filter(Boolean).join(" · ")))),
      daily || streak.current > 1 ? el("div", { class: "cel-streak small" }, daily ? "☀ Daily challenge done! " : "", streak.current > 1 ? `🔥 ${streak.current}-day streak.` : streak.current === 1 ? "🔥 Streak started — come back tomorrow." : "") : null,
      twist ? el("div", { class: "cel-twist" }, el("b", null, "🧑‍💻 Senior twist: "), el("span", { html: twist })) : null,
      reviewRow(rv),
      el("div", { class: "row cel-actions" },
        nextUnsolved ? el("a", { class: "btn primary", href: "problem.html?id=" + encodeURIComponent(nextUnsolved.id) }, "Next: " + nextUnsolved.title + " →") : el("a", { class: "btn primary", href: "index.html" }, "🏆 Everything solved — back to the list"),
        next && nextUnsolved && next.id !== nextUnsolved.id ? el("a", { class: "btn", href: "problem.html?id=" + encodeURIComponent(next.id) }, "In order: " + next.title) : null,
        el("button", { class: "btn ghost", type: "button", id: "cel-compare", onclick: () => openCompare() }, "⇆ Compare with the reference"),
        mode !== "blocks" && store.solvedModes(p.id).length < 4 ? el("span", { class: "muted small" }, "Try another mode: " + ["blocks", "pseudo", "js", "python"].filter((m) => !store.solvedModes(p.id).includes(m)).map((m) => MODE_NAME[m]).join(", ")) : null));
    // keep an interview summary (if one was just written) above the celebration
    [...S.celebrate.children].forEach((c) => { if (!c.classList.contains("iv-summary")) c.remove(); });
    S.celebrate.appendChild(card);
    Arena.progress.toastBadges(Arena.progress.checkBadges(ForgeProblems.list));
  }

  /* ---- spaced repetition: "remind me to re-solve in 1 / 3 / 7 days" ---- */
  function reviewRow(rv) {
    const host = el("div", { class: "cel-review", role: "group", "aria-labelledby": "rv-q" });
    const draw = (note) => {
      host.innerHTML = "";
      const q = store.review(S.p.id);
      let text;
      if (note) text = note;
      else if (rv.queued && rv.reason && q && q.reason === rv.reason) text = `Queued for a re-solve in ${q.days} days — you ${rv.reason === "revealed" ? "looked at the answer" : "used a nudge"}, and solving it again from scratch is what makes it stick.`;
      else if (rv.completed) text = "Review complete — you remembered it. Schedule another?";
      else if (q) text = `A re-solve is scheduled (${Arena.progress.dueText(q.due)}).`;
      else text = "Remind me to re-solve this from scratch in…";
      host.appendChild(el("span", { class: "rv-q small", id: "rv-q" }, "🔁 ", text));
      const row = el("span", { class: "row rv-btns" });
      [1, 3, 7].forEach((d) => {
        const on = !!(q && q.days === d);
        row.appendChild(el("button", { class: "btn sm" + (on ? " on" : ""), type: "button", "aria-pressed": on ? "true" : "false", onclick: () => {
          store.schedule(S.p.id, d, "manual");
          rv = { completed: false, queued: null, reason: null };
          draw(`Got it — this comes back ${d === 1 ? "tomorrow" : "in " + d + " days"}, on your list page under “Due for review”.`);
          Arena.announce(`Scheduled a re-solve in ${d} day${d === 1 ? "" : "s"}`);
          const b = host.querySelector(`[data-d="${d}"]`); if (b) b.focus();
        }, "data-d": String(d) }, d === 1 ? "1 day" : d + " days"));
      });
      if (q) row.appendChild(el("button", { class: "btn sm ghost", type: "button", "data-d": "0", onclick: () => { store.unschedule(S.p.id); rv = { completed: false, queued: null, reason: null }; draw("No reminder set."); Arena.announce("Reminder removed"); const b = host.querySelector('[data-d="1"]'); if (b) b.focus(); } }, "No reminder"));
      host.appendChild(row);
    };
    draw();
    return host;
  }

  /* ================= compare with the reference ================= */
  function openCompare() {
    const p = S.p;
    let src = S.lastAccepted;
    if (!src) src = S.mode === "blocks" ? (S.blocks ? { lang: "blocks", code: S.blocks.code() } : null) : { lang: S.mode, code: S.editor.getValue() };
    if (!src) return;
    if (S.compareBox) S.compareBox.remove();
    const host = el("div", { class: "compare-host" });
    S.celebrate.appendChild(host);
    S.compareBox = Arena.CompareView(host, { problem: p, lang: src.lang, code: src.code, grader: S.grader, onClose: () => { host.remove(); S.compareBox = null; const b = document.getElementById("cel-compare"); if (b) b.focus(); } });
    S.compareBox.focus({ preventScroll: true });
    S.compareBox.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  /* ================= interview mode ================= */
  const IV_LOCKED = ["hints", "solution", "trace"];
  const IV_TIMES = [15, 25, 45];
  const fmtClock = (ms) => { const t = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0"); };
  const fmtUsed = (ms) => { const t = Math.max(0, Math.round(ms / 1000)); return t < 60 ? t + " s" : Math.floor(t / 60) + " min " + String(t % 60).padStart(2, "0") + " s"; };

  function ivToggle() {
    if (S.iv) return;
    const open = S.ivHost.querySelector(".iv-setup");
    if (open) { ivCloseSetup(); return; }
    ivSetup();
  }
  function ivCloseSetup() {
    const open = S.ivHost.querySelector(".iv-setup");
    if (open) open.remove();
    S.ivBtn.setAttribute("aria-expanded", "false");
    S.ivBtn.setAttribute("aria-pressed", "false");
    S.ivBtn.classList.remove("on");
  }
  function ivSetup() {
    S.ivHost.querySelectorAll(".iv-summary").forEach((x) => x.remove());
    const solved = store.status(S.p.id) === "solved";
    const pick = store.pref("ivMinutes", 25);
    const group = el("div", { class: "iv-times", role: "radiogroup", "aria-labelledby": "iv-tl" });
    IV_TIMES.forEach((m) => {
      const id = "iv-t" + m;
      group.appendChild(el("label", { class: "iv-time", for: id }, el("input", { type: "radio", name: "iv-time", id, value: String(m), checked: m === pick ? true : null }), el("b", null, String(m)), el("span", null, "min")));
    });
    const reset = el("input", { type: "checkbox", id: "iv-reset" });
    reset.checked = solved;
    const hist = (store.get(S.p.id).interviews || []);
    const best = hist.filter((x) => x.passed).sort((a, b) => a.ms - b.ms)[0];
    const card = el("section", { class: "iv-setup panel", "aria-labelledby": "iv-h" },
      el("h2", { id: "iv-h" }, "⏱ Interview mode"),
      el("p", { class: "small" }, "Practice it like the real thing: one timed attempt, on your own."),
      el("ul", { class: "iv-rules small" },
        el("li", null, "🔒 Hints, the solution and 👁 Visualize stay locked until the time is up or you give up."),
        el("li", null, "🙊 Results show only how many tests pass — the mistake nudges wait for the end."),
        el("li", null, "✍️ Write it in Pseudocode, JavaScript or Python (Blocks is off).")),
      el("div", { class: "iv-row" }, el("span", { class: "small muted", id: "iv-tl" }, "Time limit"), group),
      el("label", { class: "toggle small iv-reset", for: "iv-reset" }, reset, " Start from the starter code (Ctrl+Z gets your draft back)"),
      hist.length ? el("p", { class: "small muted" }, `Your record here: ${hist.length} interview${hist.length === 1 ? "" : "s"}, ${hist.filter((x) => x.passed).length} passed` + (best ? `, best ${fmtUsed(best.ms)}.` : ".")) : null,
      el("div", { class: "row" },
        el("button", { class: "btn primary", type: "button", id: "iv-start", onclick: () => {
          const m = +((group.querySelector("input:checked") || {}).value || 25);
          store.setPref("ivMinutes", m);
          ivStart(m, reset.checked);
        } }, "Start the clock"),
        el("button", { class: "btn ghost", type: "button", onclick: () => { ivCloseSetup(); S.ivBtn.focus(); } }, "Cancel")));
    S.ivHost.appendChild(card);
    S.ivBtn.setAttribute("aria-expanded", "true");
    S.ivBtn.setAttribute("aria-pressed", "true");
    S.ivBtn.classList.add("on");
    (group.querySelector("input:checked") || group.querySelector("input")).focus();
  }
  function ivSave() {
    if (!S.iv) return;
    const { id, start, limitMs, attempts, lang, warned, lastCode, lastLang } = S.iv;
    store.setPref("interview", { id, start, limitMs, attempts, lang, warned, lastCode, lastLang });
  }
  function ivStart(minutes, reset) {
    ivCloseSetup();
    if (S.mode === "blocks") S.modeTabs.select("pseudo", true);
    if (reset && S.mode !== "blocks") {
      const st = Arena.starter(S.p, S.mode);
      S.editor.ta.focus({ preventScroll: true });
      S.editor.ta.select();
      S.editor.insertText(st);
      store.setDraft(S.p.id, S.mode, st);
    }
    S.iv = { id: S.p.id, start: store.now(), limitMs: minutes * 60000, attempts: 0, lang: S.mode, warned: {} };
    ivSave();
    ivLock(true);
    S.results.innerHTML = "";
    [...S.celebrate.children].forEach((c) => c.remove());
    S.editor.focus();
    Arena.announce(`Interview started: ${minutes} minutes. Hints, the solution and the visualizer are locked.`);
  }
  function ivResume() {
    const a = store.pref("interview", null);
    if (!a || a.id !== S.p.id || !a.start || !a.limitMs) return;
    S.iv = { id: a.id, start: a.start, limitMs: a.limitMs, attempts: a.attempts || 0, lang: a.lang || S.mode, warned: a.warned || {}, lastCode: a.lastCode, lastLang: a.lastLang };
    if (store.now() - a.start >= a.limitMs) { ivLock(true); ivEnd("timeout", true); return; }
    if (S.mode === "blocks") S.modeTabs.select("pseudo", true);
    ivLock(true);
    Arena.announce("Your interview is still running.");
  }
  function ivLock(on) {
    document.body.classList.toggle("iv-on", on);
    S.ivBtn.hidden = on;
    S.ivTimer.hidden = !on;
    S.ivGiveUp.hidden = !on;
    S.ivMini.hidden = !on;
    S.ivGiveUpMini.hidden = !on;
    S.modeTabs.btn("blocks").hidden = on;
    IV_LOCKED.forEach((k) => {
      const b = S.leftTabs.btn(k);
      b.classList.toggle("locked", on);
      b.setAttribute("aria-label", (b.textContent.replace(/^\W+\s*/, "")) + (on ? " (locked during the interview)" : ""));
    });
    S.btnViz.disabled = on || !!S.busy;
    S.btnViz.title = on ? "Locked during the interview" : "Step through your pseudocode on an example";
    S.leftTabs.select(on && IV_LOCKED.includes(S.leftTabs.current) ? "problem" : S.leftTabs.current || "problem");
    clearInterval(S.ivTick);
    if (on) { ivTick(); S.ivTick = setInterval(ivTick, 500); }
  }
  function ivTick() {
    const iv = S.iv;
    if (!iv) return;
    const left = iv.limitMs - (store.now() - iv.start);
    const txt = fmtClock(left);
    S.ivTimer.textContent = "⏱ " + txt + " left";
    S.ivMini.textContent = "⏱ " + txt;
    const cls = left <= 60000 ? "crit" : left <= 5 * 60000 ? "warn" : "";
    S.ivTimer.className = "iv-timer " + cls;
    S.ivMini.className = "iv-mini " + cls;
    if (left <= 5 * 60000 && left > 60000 && !iv.warned.five && iv.limitMs > 5 * 60000) { iv.warned.five = true; ivSave(); Arena.announce("5 minutes left in your interview."); }
    if (left <= 60000 && left > 0 && !iv.warned.one) { iv.warned.one = true; ivSave(); Arena.announce("1 minute left."); }
    if (left <= 0) ivEnd("timeout");
  }
  let giveUpArmed = null;
  /** Both Give up buttons (status bar + sticky toolbar) share one two-step confirmation. */
  function ivGiveUpSet(armed) {
    [S.ivGiveUp, S.ivGiveUpMini].forEach((b) => {
      b.classList.toggle("armed", armed);
      b.textContent = armed ? (matchMedia("(hover: none)").matches ? "Sure? Tap again" : "Sure? Click again") : "🏳 Give up";
    });
  }
  function ivGiveUpClick() {
    if (!giveUpArmed) {
      ivGiveUpSet(true);
      giveUpArmed = setTimeout(() => { giveUpArmed = null; ivGiveUpSet(false); }, 3000);
      return;
    }
    clearTimeout(giveUpArmed); giveUpArmed = null;
    ivGiveUpSet(false);
    ivEnd("gaveup");
  }
  function ivEnd(reason, away) {
    const iv = S.iv;
    if (!iv) return;
    clearInterval(S.ivTick);
    const now = store.now();
    const ms = Math.min(now - iv.start, iv.limitMs);
    const entry = { at: now, ms, limitMs: iv.limitMs, attempts: iv.attempts, passed: reason === "passed", gaveUp: reason === "gaveup", timedOut: reason === "timeout", lang: iv.lang };
    store.interview(iv.id, entry);
    store.setPref("interview", null);
    S.iv = null;
    ivLock(false);
    // what the grader saw on the last submission, now with every nudge
    if (!iv.last && iv.lastCode && reason !== "passed") { // e.g. after a reload: grade that submission again
      S.grader.check({ id: S.p.id, lang: iv.lastLang || "pseudo", code: iv.lastCode, mode: "submit" }).then((report) => {
        if (S.iv) return;
        iv.last = { report, lang: iv.lastLang || "pseudo", extra: [] };
        showLast();
        const sum = S.ivHost.querySelector(".iv-summary .row");
        if (sum && !sum.querySelector(".iv-see")) sum.insertBefore(seeBtn(), sum.children[1] || null);
      }).catch(() => {});
    }
    const showLast = () => {
      const r = iv.last.report;
      S.results.innerHTML = "";
      S.results.appendChild(Arena.renderReport(r, {
        problem: S.p, lang: iv.last.lang, hintsLeft: Math.max(0, (S.p.hints || []).length - store.get(S.p.id).hintsUsed), extraNudges: iv.last.extra,
        onHint: () => { const rr = store.get(S.p.id); if (rr.hintsUsed < (S.p.hints || []).length) store.hint(S.p.id, rr.hintsUsed + 1); S.leftTabs.select("hints", true); renderHints(); },
        onGotoLine: (n) => S.editor.gotoLine(n),
        onWatch: iv.last.lang === "blocks" ? null : (args) => runTrace(JSON.parse(JSON.stringify(args))),
      }));
    };
    const seeBtn = () => el("button", { class: "btn iv-see", type: "button", onclick: () => { const t = S.results.firstChild; if (t) t.scrollIntoView({ block: "start" }); } }, "🔎 See the nudges");
    if (iv.last && reason !== "passed") showLast();
    const title = reason === "passed" ? "Interview passed" : reason === "timeout" ? (away ? "Time ran out while you were away" : "Time's up") : "Interview over";
    const icon = reason === "passed" ? "🏅" : reason === "timeout" ? "⌛" : "🏳";
    const hl = (S.p.hints || []).length;
    const sum = el("section", { class: "iv-summary panel " + (reason === "passed" ? "ok" : ""), "aria-labelledby": "iv-sh", tabindex: "-1" },
      el("div", { class: "iv-sum-top" }, el("span", { class: "iv-sum-icon", "aria-hidden": "true" }, icon),
        el("div", null, el("h2", { id: "iv-sh" }, title), el("div", { class: "small muted" }, reason === "passed" ? "Accepted under the clock — that's the real skill." : "The nudges, hints and visualizer are unlocked again — use them to see what was missing."))),
      el("dl", { class: "iv-stats" },
        el("div", null, el("dt", null, "Time used"), el("dd", null, fmtUsed(ms), el("small", { class: "muted" }, " of " + Math.round(iv.limitMs / 60000) + " min"))),
        el("div", null, el("dt", null, "Submissions"), el("dd", null, String(iv.attempts))),
        el("div", null, el("dt", null, "Passed?"), el("dd", { class: reason === "passed" ? "yes" : "no" }, reason === "passed" ? "✓ Yes" : "✗ Not this time"))),
      el("div", { class: "row" },
        reason !== "passed" && hl ? el("button", { class: "btn primary", type: "button", onclick: () => S.leftTabs.select("hints", true) }, "💡 Open the hints") : null,
        reason !== "passed" && iv.last ? seeBtn() : null,
        el("button", { class: "btn ghost", type: "button", onclick: () => { sum.remove(); S.editor.focus(); } }, "Keep working"),
        el("button", { class: "btn ghost", type: "button", onclick: () => { sum.remove(); ivSetup(); } }, "⏱ Try another interview")));
    S.ivHost.querySelectorAll(".iv-summary").forEach((x) => x.remove());
    S.ivHost.appendChild(sum);
    if (reason !== "passed") Arena.progress.toastBadges(Arena.progress.checkBadges(ForgeProblems.list));
    setTimeout(() => sum.focus(), 30);
    Arena.announce(title + ". Time used " + fmtUsed(ms) + ", " + iv.attempts + " submission" + (iv.attempts === 1 ? "" : "s") + ".");
  }
  function renderLockPane(id) {
    const pane = S.lockPane;
    pane.setAttribute("aria-labelledby", "lt-" + id);
    pane.innerHTML = "";
    const what = { hints: "The hint ladder", solution: "The reference answer", trace: "👁 Visualize" }[id];
    pane.appendChild(el("div", { class: "locked-sol" },
      el("div", { class: "big", "aria-hidden": "true" }, "⏱"),
      el("h2", null, what + " is locked during the interview"),
      el("p", { class: "muted" }, "It unlocks when the clock runs out, when you're Accepted, or when you give up."),
      el("div", { class: "row" }, el("button", { class: "btn", type: "button", onclick: () => S.leftTabs.select("problem", true) }, "← Back to the problem"))));
    pane.hidden = false;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
