/* =====================================================================
   Pseudocode Playground — write or paste ANY Forge Pseudocode, give it
   inputs, run it, watch it execute, and measure how its cost grows.

   Reuses (never forks) the Arena's editor (Arena.Editor), trace viewer
   (Arena.TraceViewer) and helpers (Arena.show/cells/tabStrip), the engine
   (ForgePseudo) and the grader's growth classifier (ForgeCheck.classify).
   Runs happen in a Web Worker (playground/pg-worker.js) so a runaway loop
   can be stopped; without workers it falls back to the main thread.
   ===================================================================== */
(function () {
  "use strict";
  const el = (...a) => Forge.el(...a);
  const S = (...a) => Forge.svg(...a);
  const $ = (s, r) => (r || document).querySelector(s);

  const SYMBOLS = ["←", "≤", "≥", "≠", "∞", "⌊", "⌋", "⌈", "⌉", "↔"];
  const GITHUB = "https://github.com/Normansrule/algorithm-forge/blob/main/";
  const DEFAULT_EX = "insertion-sort";
  const RUN_STEPS = 5000000, TRACE_STEPS = 2000000, MAX_TRACE = 5000;
  const RUN_TIMEOUT = 20000;
  const GROWTH_BUDGET = 60000000, GROWTH_RUN_CAP = 20000000;
  const BLANK = `ALGORITHM MyAlgorithm(A[0..n-1])
    // Describe what your algorithm does
    // Input: an array A[0..n-1] of numbers
    // Output: the sum of its elements
    total ← 0
    for i ← 0 to n - 1 do
        total ← total + A[i]
    return total
`;
  const METRIC_HELP = {
    steps: "statements executed (the engine's basic unit of work)",
    comparisons: "every =, ≠, <, ≤, >, ≥ evaluated",
    keyComparisons: "comparisons that involve an array element — the usual basic operation for sorting and searching",
    arrayReads: "array cells read", arrayWrites: "array cells written", assignments: "values stored with ←",
    arithmetic: "+, −, ×, /, div, mod, ^", calls: "algorithm calls (including the first one)",
    maxDepth: "deepest the call stack got (recursion depth)", swaps: "swap statements executed",
  };

  /* ---------------- storage (all optional) ---------------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("pg-" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("pg-" + k, JSON.stringify(v)); } catch (e) { /* storage blocked or full */ } },
  };

  /* ---------------- runner (worker with main-thread fallback) ---------------- */
  const Runner = {
    w: null, seq: 0, pending: null, broken: false,
    make() {
      if (this.broken || typeof Worker === "undefined") return null;
      try {
        this.w = new Worker("playground/pg-worker.js");
        this.w.onmessage = (ev) => { const p = this.pending; if (p && ev.data && ev.data.id === p.id) { this.pending = null; clearTimeout(p.timer); p.resolve(ev.data); } };
        this.w.onerror = (ev) => {
          if (ev && ev.preventDefault) ev.preventDefault();
          const p = this.pending; this.pending = null;
          this.kill(); this.broken = true;
          if (p) { clearTimeout(p.timer); p.resolve(Runner.local(p.msg)); }
        };
      } catch (e) { this.broken = true; this.w = null; }
      return this.w;
    },
    call(msg, timeout) {
      msg.id = ++this.seq;
      const w = this.w || this.make();
      if (!w) return new Promise((res) => setTimeout(() => res(Runner.local(msg)), 10));
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          if (!this.pending || this.pending.id !== msg.id) return;
          this.pending = null; this.kill();
          resolve({ id: msg.id, ok: false, timedOut: true, error: { message: `Stopped after ${Math.round(timeout / 1000)} seconds. The run was taking too long — look for a loop whose variable never reaches its end condition, or try a smaller input.`, line: null, kind: "limit" } });
        }, timeout);
        this.pending = { id: msg.id, resolve, timer, msg };
        w.postMessage(msg);
      });
    },
    stop() {
      const p = this.pending; this.pending = null;
      this.kill();
      if (p) { clearTimeout(p.timer); p.resolve({ id: p.id, ok: false, stopped: true, error: { message: "Stopped.", line: null, kind: "limit" } }); }
    },
    kill() { if (this.w) { try { this.w.terminate(); } catch (e) { /* already gone */ } this.w = null; } },
    /** Same protocol, on the main thread (file:// pages or browsers without workers). */
    local(m) {
      const errOf = (e) => (e ? { message: String(e.message || e), line: e.line || null, kind: e.kind || "runtime" } : null);
      try {
        if (m.type === "run") {
          const r = ForgePseudo.run(m.src, { entry: m.entry, args: m.args, trace: !!m.trace, maxTrace: m.maxTrace, maxSteps: m.maxSteps });
          return { id: m.id, ok: r.ok, value: r.value, args: r.args, ops: r.ops, output: r.output, trace: r.trace, entry: r.entry, error: errOf(r.error) };
        }
        const R = PGCore.rng(m.seed || 7), tot = {};
        let steps = 0;
        for (let rep = 0; rep < m.reps; rep++) {
          const r = ForgePseudo.run(m.src, { entry: m.entry, args: PGCore.growthArgs(m.params, m.cfg, R, m.n, m.fallbacks), maxSteps: m.maxSteps });
          if (!r.ok) return { id: m.id, n: m.n, error: errOf(r.error) };
          for (const k in r.ops) tot[k] = (tot[k] || 0) + r.ops[k];
          steps += r.ops.steps;
        }
        for (const k in tot) tot[k] /= m.reps;
        return { id: m.id, n: m.n, ops: tot, steps };
      } catch (e) { return { id: m.id, ok: false, error: errOf(e) }; }
    },
  };

  /* ---------------- state ---------------- */
  const st = {
    exId: null,          // example the code came from (null = own code)
    entry: null,
    prog: null,          // last successful parse
    params: [],          // header params of the entry
    inputs: {},          // param name -> text
    busy: false,
    lastRun: null,
    growth: { gen: "random", sizes: "8, 16, 32, 64, 128, 256, 512", metric: "steps", roles: {}, scale: "log", points: [], fit: null, refs: { "log n": true, n: true, "n log n": true, "n^2": true } },
  };
  let ed, tv, tabs, ui = {};

  /* ---------------- helpers ---------------- */
  const nf = (x) => (Number.isFinite(x) ? Math.round(x).toLocaleString() : String(x));
  function compact(x) {
    if (!Number.isFinite(x)) return "∞";
    const a = Math.abs(x);
    if (a >= 1e9) return +(x / 1e9).toFixed(1) + "B";
    if (a >= 1e6) return +(x / 1e6).toFixed(1) + "M";
    if (a >= 1e4) return +(x / 1e3).toFixed(1) + "k";
    return Number.isInteger(x) ? String(x) : String(+x.toFixed(2));
  }
  const ex = () => (st.exId ? PGExamples.get(st.exId) : null);
  const inputKey = () => (st.exId || "own") + "|" + (st.entry || "");
  function announce(msg) { if (window.Arena && Arena.announce) Arena.announce(msg); }
  function fmtClass(c) { return ForgeCheck.fmtClass ? ForgeCheck.fmtClass(c) : "Θ(" + c + ")"; }

  /** Turn ASCII operators into the book's symbols (outside comments and strings). */
  function tidySymbols(code) {
    return code.split("\n").map((line) => {
      let out = "", i = 0, q = null;
      while (i < line.length) {
        const c = line[i];
        if (q) { out += c; if (c === q) q = null; i++; continue; }
        if (c === '"') { q = c; out += c; i++; continue; }
        if (c === "/" && line[i + 1] === "/") { out += line.slice(i); break; }
        const three = line.slice(i, i + 3), two = line.slice(i, i + 2);
        if (three === "<->") { out += "↔"; i += 3; continue; }
        const map = { "<-": "←", ":=": "←", "<=": "≤", ">=": "≥", "!=": "≠", "<>": "≠" };
        if (map[two]) { out += map[two]; i += 2; continue; }
        out += c; i++;
      }
      return out;
    }).join("\n");
  }

  /* ---------------- share links ---------------- */
  const b64u = {
    enc(bytes) { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); },
    dec(str) { const s = atob(str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4)); const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; },
  };
  async function pipe(bytes, stream) {
    const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
    return new Uint8Array(await out.arrayBuffer());
  }
  async function encodeShare(payload) {
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    if (typeof CompressionStream !== "undefined") {
      try { return "z." + b64u.enc(await pipe(bytes, new CompressionStream("deflate-raw"))); } catch (e) { /* fall through */ }
    }
    return "b." + b64u.enc(bytes);
  }
  async function decodeShare(token) {
    if (token.startsWith("z.")) {
      if (typeof DecompressionStream === "undefined") throw new Error("This browser can't unpack compressed links. Try a recent Chrome, Edge, Firefox or Safari.");
      return JSON.parse(new TextDecoder().decode(await pipe(b64u.dec(token.slice(2)), new DecompressionStream("deflate-raw"))));
    }
    if (token.startsWith("b.")) return JSON.parse(new TextDecoder().decode(b64u.dec(token.slice(2))));
    // plain base64url of the source text (handy for links written by hand or by other pages)
    return { code: new TextDecoder().decode(b64u.dec(token)) };
  }
  function shareURL(token) { return location.href.replace(/#.*$/, "") + "#code=" + token; }

  /* =====================================================================
     UI
     ===================================================================== */
  function build() {
    const app = $("#pg-app");
    // ----- toolbar -----
    ui.exSel = el("select", { id: "pg-ex", "aria-label": "Load an example" });
    ui.exSel.appendChild(el("option", { value: "" }, "📚 Load an example…"));
    const groups = {};
    PGExamples.list.forEach((e) => {
      if (!groups[e.chapter]) { groups[e.chapter] = el("optgroup", { label: "Ch " + e.chapter + " · " + e.chapterName }); ui.exSel.appendChild(groups[e.chapter]); }
      groups[e.chapter].appendChild(el("option", { value: e.id }, e.title));
    });
    ui.exSel.addEventListener("change", () => { if (ui.exSel.value) { loadExample(ui.exSel.value, true); ui.exSel.value = ""; } });
    ui.btnBlank = el("button", { class: "btn", type: "button", title: "Start from an empty template" }, "＋ Blank");
    ui.btnBlank.addEventListener("click", () => loadCode({ code: BLANK, exId: null, inputs: { A: "[4, 8, 15, 16, 23, 42]" } }, "Started a blank algorithm."));
    ui.btnReset = el("button", { class: "btn", type: "button", title: "Go back to the original example code and sample inputs" }, "↺ Reset");
    ui.btnReset.addEventListener("click", onReset);
    ui.btnShare = el("button", { class: "btn", type: "button", title: "Copy a link that opens this code and these inputs" }, "🔗 Copy link");
    ui.btnShare.addEventListener("click", onShare);
    ui.btnDl = el("button", { class: "btn", type: "button", title: "Download the code as a .txt file" }, "⬇ Download .txt");
    ui.btnDl.addEventListener("click", onDownload);
    ui.saved = el("span", { class: "muted small pg-saved", "aria-live": "polite" });
    app.appendChild(el("div", { class: "pg-toolbar", role: "toolbar", "aria-label": "Playground actions" },
      el("label", { class: "pg-exsel" }, ui.exSel), ui.btnBlank, ui.btnReset, el("span", { class: "spacer" }), ui.saved, ui.btnShare, ui.btnDl));
    ui.shareBox = el("div", { class: "pg-sharebox", hidden: true });
    app.appendChild(ui.shareBox);

    // ----- left: editor -----
    ui.exInfo = el("div", { class: "pg-exinfo" });
    ui.pretty = el("input", { type: "checkbox", id: "pg-pretty" });
    ui.pretty.checked = store.get("pretty", true);
    ui.pretty.addEventListener("change", () => { store.set("pretty", ui.pretty.checked); ed.setPretty(ui.pretty.checked); });
    const tidy = el("button", { class: "btn sm", type: "button", title: "Turn <- <= >= != into ← ≤ ≥ ≠ everywhere (comments and strings are left alone)" }, "Tidy symbols");
    tidy.addEventListener("click", () => { const v = ed.getValue(), t = tidySymbols(v); if (t !== v) { ed.setValue(t); onCode(); announce("Symbols tidied."); } else announce("Nothing to tidy."); });
    const palette = el("div", { class: "palette", role: "toolbar", "aria-label": "Insert a symbol" });
    SYMBOLS.forEach((s) => {
      const b = el("button", { class: "sym", type: "button", title: "Insert " + s, "aria-label": "Insert " + s }, s);
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.addEventListener("click", () => ed.insert(s));
      palette.appendChild(b);
    });
    ui.edScroll = el("div", { class: "pg-edscroll" });
    ui.parse = el("div", { class: "pg-parse small", "aria-live": "polite" });
    const left = el("section", { class: "pg-left", "aria-label": "Code" },
      el("div", { class: "panel pg-edpanel" },
        el("div", { class: "pg-edhead" }, el("h2", { class: "pg-h" }, "Code"), ui.exInfo),
        el("div", { class: "pg-edtools" }, palette, el("span", { class: "spacer" }),
          el("label", { class: "toggle small", for: "pg-pretty", title: "Typing <- becomes ←, <= becomes ≤, >= becomes ≥, != becomes ≠" }, ui.pretty, " Pretty symbols"), tidy),
        ui.edScroll,
        ui.parse,
        el("div", { class: "muted small pg-keys", id: "pg-keys" }, el("kbd", null, "Ctrl"), "+", el("kbd", null, "Enter"), " run · ", el("kbd", null, "Ctrl"), "+", el("kbd", null, "Shift"), "+", el("kbd", null, "Enter"), " visualize · ", el("kbd", null, "Tab"), " indents (press ", el("kbd", null, "Esc"), " first to leave the editor)")));

    // ----- right: call + tabs -----
    ui.entrySel = el("select", { id: "pg-entry" });
    ui.entrySel.addEventListener("change", () => { setEntry(ui.entrySel.value, true); });
    ui.fields = el("div", { class: "pg-fields" });
    ui.btnRun = el("button", { class: "btn primary big", type: "button", title: "Run (Ctrl+Enter)" }, "▶ Run");
    ui.btnRun.addEventListener("click", () => run(false));
    ui.btnVis = el("button", { class: "btn steel big", type: "button", title: "Visualize step by step (Ctrl+Shift+Enter)" }, "👁 Visualize");
    ui.btnVis.addEventListener("click", () => run(true));
    ui.btnStop = el("button", { class: "btn big", type: "button", hidden: true }, "■ Stop");
    ui.btnStop.addEventListener("click", () => Runner.stop());
    ui.callStale = el("div", { class: "pg-stale-note small", role: "status", hidden: true });
    const callPanel = ui.callPanel = el("div", { class: "panel pg-call" },
      el("div", { class: "pg-callhead" }, el("label", { class: "pg-h", for: "pg-entry" }, "Call"), el("div", { class: "pg-entryf" }, ui.entrySel)),
      ui.callStale,
      ui.fields,
      el("div", { class: "muted small pg-fmt" }, "Values: ", el("code", null, "42"), " ", el("code", null, "[3, 1, 2]"), " ", el("code", null, "\"text\""), " (or plain text) ", el("code", null, "[[1, 2], [0], []]"), " ", el("code", null, "∞"), " ", el("code", null, "null"), " ", el("code", null, "true")),
      el("div", { class: "row pg-runrow" }, ui.btnRun, ui.btnVis, ui.btnStop));

    tabs = Arena.tabStrip([{ id: "result", label: "Result" }, { id: "trace", label: "Watch it run" }, { id: "growth", label: "Growth lab" }], { label: "Playground views", prefix: "pgtab-", cls: "pg-tabs" });
    ui.paneResult = el("div", { class: "pane", role: "tabpanel", id: "pane-result", "aria-labelledby": "pgtab-result", tabindex: "-1" });
    ui.paneTrace = el("div", { class: "pane", role: "tabpanel", id: "pane-trace", "aria-labelledby": "pgtab-trace", tabindex: "-1", hidden: true });
    ui.paneGrowth = el("div", { class: "pane", role: "tabpanel", id: "pane-growth", "aria-labelledby": "pgtab-growth", tabindex: "-1", hidden: true });
    tabs.onChange = (id) => { ui.paneResult.hidden = id !== "result"; ui.paneTrace.hidden = id !== "trace"; ui.paneGrowth.hidden = id !== "growth"; store.set("tab", id); if (id !== "trace" && tv) tv.clear(); };
    const right = el("section", { class: "pg-right", "aria-label": "Run and inspect" }, callPanel,
      el("div", { class: "panel pg-views" }, tabs.el, ui.paneResult, ui.paneTrace, ui.paneGrowth));

    app.appendChild(el("div", { class: "pg-grid" }, left, right));

    // editor
    ed = new Arena.Editor(ui.edScroll, { lang: "pseudo", pretty: ui.pretty.checked, label: "Pseudocode editor", describedBy: "pg-keys",
      onChange: () => onCode(), onRun: () => run(false), onSubmit: () => run(true) });
    ed.minRows = 14;
    // keep the trace line visible inside the editor's own scroll box (never jump the whole page)
    const setTrace = ed.setTraceLine.bind(ed);
    ed.setTraceLine = function (n) { setTrace(n, false); if (n) keepVisible(n); };

    // trace viewer (the Arena's, without its test-case picker)
    ui.traceIntro = el("div", { class: "pg-empty" },
      el("p", null, "Press ", el("b", null, "👁 Visualize"), " to run the call above step by step: the current line lights up in the editor, arrays appear as cells with their index variables as arrows, and you can see every variable, the call stack and the output change."),
      el("p", { class: "muted small" }, `Traces keep the first ${MAX_TRACE.toLocaleString()} steps — use small inputs (about 5–12 elements) for the clearest picture.`));
    ui.paneTrace.appendChild(ui.traceIntro);
    const tvHost = el("div");
    ui.paneTrace.appendChild(tvHost);
    tv = new Arena.TraceViewer(tvHost, { editor: ed });
    tv.picker.hidden = true;

    buildResultEmpty();
    buildGrowth();
    buildGallery();
  }

  function keepVisible(n) {
    const box = ui.edScroll;
    if (!box || getComputedStyle(box).overflowY === "visible") return;
    const row = ed.gutter.children[n - 1];
    if (!row) return;
    const top = row.offsetTop - ed.gutter.offsetTop, h = row.offsetHeight;
    if (top < box.scrollTop + 10 || top + h > box.scrollTop + box.clientHeight - 10) box.scrollTop = Math.max(0, top - box.clientHeight / 2);
  }

  /* ---------------- example info chip ---------------- */
  function renderExInfo(edited) {
    const e = ex();
    ui.exInfo.innerHTML = "";
    if (!e) { ui.exInfo.appendChild(el("span", { class: "chip" }, "Your own code")); return; }
    ui.exInfo.appendChild(el("span", { class: "chip ember", title: e.blurb }, "Ch " + e.chapter + " · " + e.title + (edited ? " (edited)" : "")));
    const links = el("span", { class: "pg-exlinks small" });
    if (e.lesson) links.appendChild(el("a", { href: GITHUB + "lessons/" + e.lesson + "/README.md", target: "_blank", rel: "noopener" }, "Lesson ↗"));
    if (e.sim) links.appendChild(el("a", { href: "sims/" + e.sim }, "Simulation"));
    ui.exInfo.appendChild(links);
  }

  /* ---------------- code changes / parsing ---------------- */
  const saveDraft = Arena.debounce(() => {
    store.set("draft", { code: ed.getValue(), exId: st.exId, entry: st.entry, inputs: st.inputs });
    ui.saved.textContent = "Draft saved on this device";
  }, 600);
  const reparse = Arena.debounce(() => parseNow(), 250);
  function onCode() {
    const e = ex();
    renderExInfo(e && ed.getValue() !== e.code);
    if (tv) tv.markStale(ed.getValue());
    if (ed.errorLine) ed.setErrorLine(null);
    reparse();
    saveDraft();
  }
  function parseNow() {
    const code = ed.getValue();
    ui.parse.innerHTML = "";
    let prog;
    try { prog = ForgePseudo.parse(code); }
    catch (e) {
      ui.parse.className = "pg-parse small bad";
      ui.parse.appendChild(el("span", null, "⚠ " + (e.line ? "Line " + e.line + ": " : "") + e.message + " "));
      if (e.line) ui.parse.appendChild(gotoBtn(e.line));
      markCallStale(e);
      return false;
    }
    markCallStale(null);
    st.prog = prog;
    const names = prog.order;
    ui.parse.className = "pg-parse small";
    if (!names.length) {
      ui.parse.appendChild(el("span", { class: "muted" }, "No ALGORITHM header yet — start with a line like ", el("code", null, "ALGORITHM Name(A[0..n-1])"), "."));
    } else ui.parse.appendChild(el("span", { class: "ok-txt" }, "✓ Parsed: " + names.length + " algorithm" + (names.length > 1 ? "s" : "") + " (" + names.join(", ") + ")"));
    // entry list
    const keep = st.entry && names.includes(st.entry) ? st.entry : (ex() && names.includes(ex().entry) ? ex().entry : names[0] || null);
    ui.entrySel.innerHTML = "";
    names.forEach((nm) => ui.entrySel.appendChild(el("option", { value: nm }, nm + "(" + PGCore.headerOf(prog, nm).map((p) => p.label).join(", ") + ")")));
    if (!names.length) ui.entrySel.appendChild(el("option", { value: "" }, "(no algorithms found)"));
    ui.entrySel.disabled = !names.length;
    setEntry(keep, false);
    return true;
  }
  /** While the code doesn't parse, the Call panel still shows the last good signature: say so plainly
      (inputs are kept so nothing typed is lost, but the signature is greyed out and the picker is locked). */
  function markCallStale(err) {
    const stale = !!err && !!st.entry;
    ui.callPanel.classList.toggle("is-stale", stale);
    ui.fields.setAttribute("aria-disabled", stale ? "true" : "false");
    ui.entrySel.disabled = stale || !(st.prog && st.prog.order.length);
    ui.callStale.hidden = !stale;
    ui.callStale.innerHTML = "";
    if (stale) {
      ui.callStale.appendChild(el("span", null, "⚠ Out of date: the code doesn't parse" + (err.line ? " (line " + err.line + ")" : "") + ", so this is the signature of the last version that did. It updates as soon as the code parses again. "));
      if (err.line) ui.callStale.appendChild(gotoBtn(err.line));
    }
  }
  function gotoBtn(line) {
    const b = el("button", { class: "linkbtn", type: "button" }, "Go to line " + line);
    b.addEventListener("click", () => { ed.setErrorLine(line); ed.gotoLine(line); });
    return b;
  }

  /* ---------------- entry + inputs ---------------- */
  function setEntry(name, user) {
    const params = name && st.prog ? PGCore.headerOf(st.prog, name) : [];
    const same = name === st.entry && params.map((p) => p.label).join() === st.params.map((p) => p.label).join();
    st.entry = name;
    if (name) ui.entrySel.value = name;
    if (same && ui.fields.childElementCount) { st.params = params; return; }
    st.params = params;
    // inputs: remembered for this example+entry, else current same-named values, else the example's sample, else a guess
    const remembered = (store.get("inputs", {}) || {})[inputKey()] || {};
    const e = ex();
    const next = {};
    params.forEach((p) => {
      next[p.name] = remembered[p.name] != null ? remembered[p.name]
        : st.inputs[p.name] != null ? st.inputs[p.name]
        : e && e.entry === name && e.inputs[p.name] != null ? e.inputs[p.name]
        : guessInput(p);
    });
    st.inputs = next;
    renderFields();
    syncGrowthRoles(user);
    if (user) saveDraft();
  }
  function guessInput(p) {
    if (p.dims >= 2) return "[[0, 1, 0], [0, 0, 1], [1, 0, 0]]";
    if (p.isArray) return "[5, 3, 8, 1, 9, 2]";
    if (/^(n|m|k|size|count)$/i.test(p.name)) return "5";
    if (/^(G|adj|graph)$/i.test(p.name)) return "[[1, 2], [0, 2], [0, 1]]";
    if (/^(E|edges)$/.test(p.name)) return "[[0, 1, 4], [1, 2, 3], [0, 2, 9]]";
    return "3";
  }
  function rememberInputs() {
    const all = store.get("inputs", {}) || {};
    all[inputKey()] = Object.assign({}, st.inputs);
    const keys = Object.keys(all);
    if (keys.length > 80) delete all[keys[0]];
    store.set("inputs", all);
  }
  function renderFields() {
    ui.fields.innerHTML = "";
    ui.fieldEls = {};
    if (!st.entry) { ui.fields.appendChild(el("div", { class: "muted small" }, "Write an ALGORITHM to call it here.")); return; }
    if (!st.params.length) { ui.fields.appendChild(el("div", { class: "muted small" }, st.entry + " takes no parameters.")); return; }
    st.params.forEach((p, k) => {
      const id = "pg-in-" + k;
      const inp = el("input", { type: "text", id, class: "mono pg-in", value: st.inputs[p.name], spellcheck: "false", autocomplete: "off", autocapitalize: "off", "aria-describedby": id + "-err" });
      const err = el("div", { class: "pg-inerr small", id: id + "-err", "aria-live": "polite" });
      inp.addEventListener("input", () => { st.inputs[p.name] = inp.value; validate(p, inp, err); rememberInputs(); saveDraft(); });
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); run(e.ctrlKey || e.metaKey ? true : e.shiftKey); } });
      const dice = el("button", { class: "btn icon sm pg-dice", type: "button", title: "Random input helpers for " + p.name, "aria-label": "Random input helpers for " + p.name, "aria-expanded": "false", "aria-controls": id + "-help" }, "🎲");
      const help = randomHelper(p, inp, err, id + "-help");
      dice.addEventListener("click", () => { const open = help.hidden; help.hidden = !open; dice.setAttribute("aria-expanded", String(open)); });
      const row = el("div", { class: "pg-field" },
        el("label", { for: id, class: "pg-flabel" }, el("code", null, p.label)),
        el("div", { class: "pg-finput" }, inp, dice),
        err, help);
      ui.fields.appendChild(row);
      ui.fieldEls[p.name] = { inp, err };
      validate(p, inp, err);
    });
  }
  function validate(p, inp, err) {
    try {
      const v = PGCore.parseValue(inp.value);
      inp.removeAttribute("aria-invalid");
      let hint = "";
      if (Array.isArray(v)) hint = v.length + " item" + (v.length === 1 ? "" : "s") + (v.length && v.every(Array.isArray) ? " (a list of lists)" : "");
      else if (typeof v === "string") hint = "text, " + v.length + " character" + (v.length === 1 ? "" : "s");
      err.className = "pg-inerr small muted";
      err.textContent = hint;
      return v;
    } catch (e) {
      inp.setAttribute("aria-invalid", "true");
      err.className = "pg-inerr small bad";
      err.textContent = e.message;
      return undefined;
    }
  }
  function randomHelper(p, inp, err, id) {
    const size = el("input", { type: "number", min: 0, max: 5000, value: 8, class: "mono", "aria-label": "Size n for " + p.name, style: { width: "74px" } });
    try { const v = PGCore.parseValue(inp.value); if (Array.isArray(v) || typeof v === "string") size.value = Math.max(1, v.length); } catch (e) { /* keep 8 */ }
    const box = el("div", { class: "pg-rand", id, hidden: true }, el("label", { class: "small muted" }, "size n ", size));
    const kinds = [["random", "Random"], ["sorted", "Sorted"], ["reversed", "Reversed"], ["few", "Few values"], ["string", "Text"], ["graph", "Graph"], ["dag", "Acyclic graph"]];
    kinds.forEach(([g, label]) => {
      const b = el("button", { class: "btn sm", type: "button", title: PGCore.GENERATORS[g].label }, label);
      b.addEventListener("click", () => {
        const n = Math.max(0, Math.min(5000, Math.floor(+size.value || 0)));
        const R = PGCore.rng((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
        const v = PGCore.GENERATORS[g].make(R, n);
        inp.value = typeof v === "string" ? JSON.stringify(v) : PGCore.formatValue(v);
        inp.dispatchEvent(new Event("input"));
      });
      box.appendChild(b);
    });
    return box;
  }
  function collectArgs() {
    const args = [];
    let bad = null;
    st.params.forEach((p) => {
      const f = ui.fieldEls[p.name];
      const v = validate(p, f.inp, f.err);
      if (v === undefined && !bad) bad = { p, f };
      args.push(v);
    });
    if (bad) { bad.f.inp.focus(); return { error: `The input for ${bad.p.name} isn't a value I can read: ${bad.f.err.textContent}` }; }
    return { args };
  }

  /* ---------------- run / visualize ---------------- */
  function setBusy(b, label) {
    st.busy = b;
    ui.btnRun.disabled = b; ui.btnVis.disabled = b;
    if (ui.gRun) ui.gRun.disabled = b;
    ui.btnStop.hidden = !b || label === "growth";
    if (ui.gStop) ui.gStop.hidden = !(b && label === "growth");
    document.body.classList.toggle("pg-busy", b);
  }
  async function run(trace) {
    if (st.busy) return;
    if (!parseNow()) {
      tabs.select("result");
      const line = (() => { try { ForgePseudo.parse(ed.getValue()); } catch (e) { return e; } return null; })();
      showError(line, "Your code doesn't parse yet");
      if (line && line.line) ed.setErrorLine(line.line);
      return;
    }
    if (!st.entry) { tabs.select("result"); showMessage("There's no ALGORITHM to call yet. Start a line with ALGORITHM Name(parameters)."); return; }
    const c = collectArgs();
    if (c.error) { tabs.select("result"); showMessage(c.error, "bad"); return; }
    const code = ed.getValue();
    ed.setErrorLine(null);
    setBusy(true, trace ? "trace" : "run");
    if (!trace) showRunning();
    const t0 = performance.now();
    const res = await Runner.call({ type: "run", src: code, entry: st.entry, args: PGCore.clone(c.args), trace, maxTrace: MAX_TRACE, maxSteps: trace ? TRACE_STEPS : RUN_STEPS }, RUN_TIMEOUT);
    const ms = performance.now() - t0;
    setBusy(false);
    st.lastRun = { res, args: c.args, code, entry: st.entry, params: st.params.slice(), ms };
    if (trace) {
      tabs.select("trace");
      ui.traceIntro.hidden = true;
      const outArg = res.ok && res.value == null ? (res.args || []).findIndex((a, k) => !PGCore.same(a, c.args[k])) : -1;
      tv.problem = { entry: st.entry, params: st.params.map((p) => p.name), output: outArg >= 0 ? { arg: outArg } : "return" };
      tv.load(Object.assign({ trace: [], output: [], ops: {} }, res), { code, args: c.args });
      if (res.error && res.error.line) ed.setErrorLine(res.error.line);
      renderResult();
      announce(res.ok ? `Trace ready: ${(res.trace || []).length} steps.` : "The run stopped with an error.");
    } else {
      tabs.select("result");
      renderResult();
      if (res.error && res.error.line) ed.setErrorLine(res.error.line);
      announce(res.ok ? "Finished." : "The run stopped with an error.");
    }
  }

  function buildResultEmpty() {
    ui.paneResult.innerHTML = "";
    ui.paneResult.appendChild(el("div", { class: "pg-empty" },
      el("p", null, "Pick the algorithm to call, fill in its inputs, and press ", el("b", null, "▶ Run"), ". You'll get the returned value, anything it printed, and how much work it did: steps, comparisons, array reads and writes, and more."),
      el("p", { class: "muted small" }, "Every count comes from actually executing your pseudocode — the same engine the Arena grades with.")));
  }
  function showRunning() {
    ui.paneResult.innerHTML = "";
    ui.paneResult.appendChild(el("div", { class: "report is-running" }, el("div", { class: "rep-head" }, el("div", { class: "spinner" }), el("div", { class: "rep-title" }, "Running…"))));
  }
  function showMessage(msg, cls) {
    ui.paneResult.innerHTML = "";
    ui.paneResult.appendChild(el("div", { class: "callout " + (cls || "steel") }, msg));
  }
  function showError(err, title) {
    ui.paneResult.innerHTML = "";
    ui.paneResult.appendChild(errorBox(err, title));
  }
  function errorBox(err, title) {
    const kind = err && err.kind;
    const head = title || (kind === "syntax" ? "Syntax problem" : kind === "limit" ? "The run was stopped" : "Runtime error");
    const box = el("div", { class: "callout bad pg-error" },
      el("div", { class: "pg-error-t" }, (kind === "limit" ? "⏱ " : "💥 ") + head + (err && err.line ? " — line " + err.line : "")),
      el("div", null, err ? err.message : "Something went wrong."));
    if (err && err.line) {
      const lineText = (ed.getValue().split("\n")[err.line - 1] || "").trim();
      if (lineText) box.appendChild(el("pre", { class: "out pg-errline" }, err.line + " │ " + lineText));
      box.appendChild(gotoBtn(err.line));
    }
    return box;
  }

  function valueView(v, label) {
    if (v === undefined) return el("span", { class: "muted" }, "nothing (no return statement ran)");
    if (Arena.isFlat(v) && v.length <= 60) return Arena.cells(v, { max: 40, label });
    if (Arena.isGrid(v)) return el("div", { class: "scroll-x" }, Arena.gridCells(v));
    const s = Arena.show(v);
    return el("code", { class: "pg-val" }, s.length > 4000 ? s.slice(0, 4000) + " …" : s);
  }
  function renderResult() {
    const L = st.lastRun;
    if (!L) return;
    const r = L.res;
    ui.paneResult.innerHTML = "";
    if (!r.ok && r.stopped) { showMessage("Stopped. Nothing was returned.", "steel"); return; }
    const call = L.entry + "(" + L.params.map((p, k) => p.name + " = " + Arena.show(L.args[k])).join(", ") + ")";
    const callTxt = call.length > 220 ? call.slice(0, 218) + "…" : call;
    const rep = el("div", { class: "report " + (r.ok ? "is-pass" : "is-error") });
    rep.appendChild(el("div", { class: "pg-call-line" }, el("code", null, callTxt)));
    if (r.ok) {
      const changed = (r.args || []).map((a, k) => (L.params[k] && !PGCore.same(a, L.args[k]) ? k : -1)).filter((k) => k >= 0);
      const inPlace = r.value == null && changed.length > 0;
      rep.appendChild(el("div", { class: "pg-ret" }, el("div", { class: "io-label" }, "Returns"),
        inPlace ? el("span", { class: "muted" }, "nothing — it works in place, changing its input:") : valueView(r.value, "returned value")));
      // arguments the algorithm changed (in-place algorithms)
      changed.forEach((k) => {
        rep.appendChild(el("div", { class: "pg-ret" }, el("div", { class: "io-label" }, L.params[k].name + " after the run"), valueView(r.args[k], L.params[k].name)));
      });
    } else {
      rep.appendChild(errorBox(r.error));
    }
    if (r.ops) {
      const stats = el("div", { class: "pg-stats", role: "list", "aria-label": "Operation counts" });
      PGCore.METRICS.forEach(([k, label]) => {
        const v = r.ops[k] || 0;
        stats.appendChild(el("div", { class: "pg-stat" + (v ? "" : " zero"), role: "listitem", title: METRIC_HELP[k] }, el("div", { class: "k" }, label), el("div", { class: "v" }, compact(v))));
      });
      rep.appendChild(el("div", { class: "io-label pg-statlabel" }, r.ok ? "Work done" : "Work done before it stopped", el("span", { class: "muted small" }, " · " + (L.ms < 1000 ? Math.round(L.ms) + " ms" : (L.ms / 1000).toFixed(1) + " s") + " in your browser")));
      rep.appendChild(stats);
    }
    const out = r.output || [];
    rep.appendChild(el("div", { class: "io-label pg-statlabel" }, "Printed output"));
    rep.appendChild(el("pre", { class: "out pg-out" + (out.length ? "" : " muted") }, out.length ? out.slice(0, 500).join("\n") + (out.length > 500 ? `\n… (${out.length - 500} more lines)` : "") : "(nothing printed — use print x, y to see values while it runs)"));
    if (r.ok) {
      const more = el("div", { class: "row pg-next" });
      const vis = el("button", { class: "btn sm", type: "button" }, "👁 Watch this run step by step");
      vis.addEventListener("click", () => run(true));
      const gr = el("button", { class: "btn sm", type: "button" }, "📈 How does it grow?");
      gr.addEventListener("click", () => { tabs.select("growth", true); ui.paneGrowth.focus({ preventScroll: true }); });
      more.appendChild(vis); more.appendChild(gr);
      rep.appendChild(more);
    }
    ui.paneResult.appendChild(rep);
  }

  /* =====================================================================
     Growth lab
     ===================================================================== */
  const SIZE_PRESETS = [
    ["8, 16, 32, 64, 128, 256, 512", "8 → 512, doubling"],
    ["16, 64, 256, 1024, 4096, 16384", "16 → 16,384, ×4 (for fast algorithms)"],
    ["256, 512, 1024, 2048, 4096, 8192", "256 → 8,192 (for graphs: log factors show up late)"],
    ["4, 8, 12, 16, 24, 32", "4 → 32 (for matrices and Θ(n³))"],
    ["4, 6, 8, 10, 12, 14", "4 → 14 (for exponential algorithms)"],
  ];
  const GRAPH_SIZES = "256, 512, 1024, 2048, 4096, 8192";
  const REF_CLASSES = ["log n", "n", "n log n", "n^2"];
  const LOGF = {
    "1": () => 1, "log n": (n) => Math.log2(n + 1), "sqrt n": (n) => Math.sqrt(n), n: (n) => n, "n log n": (n) => n * Math.log2(n + 1),
    "n^2": (n) => n * n, "n^2 log n": (n) => n * n * Math.log2(n + 1), "n^3": (n) => n * n * n, "2^n": (n) => Math.pow(2, n),
    "n!": (n) => { let s = 1; for (let i = 2; i <= n; i++) s *= i; return s; },
  };
  const REF_STYLE = { "log n": ["var(--c-done)", "2 4"], n: ["var(--steel)", "6 4"], "n log n": ["var(--c-pivot)", "10 4 2 4"], "n^2": ["var(--c-swap)", "3 3"], other: ["var(--muted)", "8 3"] };

  function buildGrowth() {
    const g = st.growth;
    const p = ui.paneGrowth;
    ui.gGen = el("select", { id: "pg-ggen" });
    Object.keys(PGCore.GENERATORS).forEach((k) => ui.gGen.appendChild(el("option", { value: k }, PGCore.GENERATORS[k].label)));
    ui.gGen.addEventListener("change", () => {
      g.gen = ui.gGen.value; g.roles = PGCore.defaultRoles(st.params, g.gen); renderRoles();
      // Weighted-edge inputs usually feed priority-queue algorithms (Dijkstra, Prim, Kruskal) whose extra log factor
      // is invisible at small n, so move off the generic default sizes to bigger graphs (still well inside the step budget).
      if (g.gen === "edges" && SIZE_PRESETS.slice(0, 2).some(([v]) => v === ui.gSizes.value.trim())) ui.gSizes.value = g.sizes = GRAPH_SIZES;
    });
    ui.gSizes = el("input", { type: "text", id: "pg-gsizes", class: "mono", spellcheck: "false" });
    ui.gSizes.addEventListener("change", () => { g.sizes = ui.gSizes.value; });
    ui.gPreset = el("select", { "aria-label": "Size presets" }, el("option", { value: "" }, "Presets…"), SIZE_PRESETS.map(([v, l]) => el("option", { value: v }, l)));
    ui.gPreset.addEventListener("change", () => { if (ui.gPreset.value) { ui.gSizes.value = g.sizes = ui.gPreset.value; ui.gPreset.value = ""; } });
    ui.gMetric = el("select", { id: "pg-gmetric" });
    PGCore.METRICS.forEach(([k, l]) => ui.gMetric.appendChild(el("option", { value: k, title: METRIC_HELP[k] }, l)));
    ui.gMetric.addEventListener("change", () => { g.metric = ui.gMetric.value; refit(); drawChart(); });
    ui.gRoles = el("div", { class: "pg-roles" });
    ui.gRun = el("button", { class: "btn primary", type: "button" }, "📈 Measure growth");
    ui.gRun.addEventListener("click", runGrowth);
    ui.gStop = el("button", { class: "btn", type: "button", hidden: true }, "■ Stop");
    ui.gStop.addEventListener("click", () => { st.growthStop = true; Runner.stop(); });
    ui.gProg = el("div", { class: "pg-gprog", hidden: true }, el("span"));
    const scaleBtns = el("div", { class: "seg", role: "group", "aria-label": "Axis scale" });
    ui.scaleBtn = {};
    [["linear", "Linear axes"], ["log", "Log axes"]].forEach(([k, l]) => {
      const b = el("button", { type: "button", class: "seg-b", "aria-pressed": String(g.scale === k) }, l);
      b.addEventListener("click", () => { g.scale = k; Object.keys(ui.scaleBtn).forEach((x) => ui.scaleBtn[x].setAttribute("aria-pressed", String(x === k))); store.set("gscale", k); drawChart(); });
      ui.scaleBtn[k] = b;
      scaleBtns.appendChild(b);
    });
    ui.gChart = el("div", { class: "pg-chart" });
    ui.gLegend = el("div", { class: "legend pg-glegend" });
    ui.gFit = el("div", { class: "pg-fit", "aria-live": "polite" });
    ui.gTable = el("div");
    p.appendChild(el("p", { class: "muted small pg-gintro" }, "Run the selected algorithm on bigger and bigger generated inputs, count its operations at each size n, and see which growth class fits — the empirical analysis of Levitin §2.6, automated."));
    p.appendChild(el("div", { class: "pg-gform" },
      el("label", { class: "field", for: "pg-ggen" }, el("span", { class: "small muted" }, "Input generator"), ui.gGen),
      el("label", { class: "field", for: "pg-gmetric" }, el("span", { class: "small muted" }, "Count"), ui.gMetric),
      el("div", { class: "field pg-gsizesf" }, el("label", { class: "small muted", for: "pg-gsizes" }, "Sizes n"), el("div", { class: "row" }, ui.gSizes, ui.gPreset))));
    p.appendChild(el("div", { class: "pg-rolesbox" }, el("div", { class: "small muted" }, "Each parameter receives…"), ui.gRoles));
    p.appendChild(el("div", { class: "row pg-grow-run" }, ui.gRun, ui.gStop, ui.gProg, el("span", { class: "spacer" }), scaleBtns));
    p.appendChild(ui.gFit);
    p.appendChild(ui.gChart);
    p.appendChild(ui.gLegend);
    p.appendChild(ui.gTable);
    g.scale = store.get("gscale", "log");
    let lastW = 0;
    window.addEventListener("resize", Arena.debounce(() => { const w = ui.gChart.clientWidth; if (w && Math.abs(w - lastW) > 30) { lastW = w; drawChart(); } }, 200));
    tabs.onChange = ((prev) => (id, user) => { prev(id, user); if (id === "growth") drawChart(); })(tabs.onChange);
    Object.keys(ui.scaleBtn).forEach((x) => ui.scaleBtn[x].setAttribute("aria-pressed", String(x === g.scale)));
    syncGrowthUI();
    drawChart();
  }
  function syncGrowthUI() {
    const g = st.growth;
    ui.gGen.value = g.gen;
    ui.gSizes.value = g.sizes;
    ui.gMetric.value = g.metric;
    renderRoles();
  }
  function syncGrowthRoles(user) {
    if (!ui.gRoles) return;
    const g = st.growth;
    const e = ex();
    const preset = e && e.growth && e.entry === st.entry ? e.growth : null;
    const fresh = PGCore.defaultRoles(st.params, g.gen);
    const roles = {};
    st.params.forEach((p) => { roles[p.name] = (preset && preset.roles && preset.roles[p.name]) || (g.roles[p.name] && !user ? g.roles[p.name] : fresh[p.name]); });
    g.roles = roles;
    renderRoles();
  }
  function applyGrowthPreset(e) {
    const g = st.growth;
    const pr = e && e.growth;
    if (pr) {
      g.gen = pr.gen; g.sizes = (pr.sizes || []).join(", "); g.metric = pr.metric || "steps";
    } else if (e) {
      g.gen = "random"; g.sizes = SIZE_PRESETS[0][0]; g.metric = "steps";
    }
    g.roles = Object.assign(PGCore.defaultRoles(st.params, g.gen), (pr && pr.roles) || {});
    g.points = []; g.fit = null; g.error = null;
    if (ui.gGen) { syncGrowthUI(); drawChart(); }
  }
  function renderRoles() {
    const g = st.growth;
    ui.gRoles.innerHTML = "";
    if (!st.params.length) { ui.gRoles.appendChild(el("span", { class: "muted small" }, st.entry ? "(no parameters — every size runs the same call)" : "(write an ALGORITHM first)")); return; }
    st.params.forEach((p, k) => {
      const id = "pg-role-" + k;
      const sel = el("select", { id });
      Object.keys(PGCore.ROLES).forEach((r) => sel.appendChild(el("option", { value: r }, PGCore.ROLES[r])));
      sel.value = g.roles[p.name] || "value";
      sel.addEventListener("change", () => { g.roles[p.name] = sel.value; });
      ui.gRoles.appendChild(el("label", { class: "pg-role", for: id }, el("code", null, p.label), sel));
    });
  }
  function parseSizes(text) {
    const xs = String(text).split(/[\s,;]+/).filter(Boolean).map(Number);
    if (xs.some((x) => !Number.isFinite(x) || x < 1 || x !== Math.floor(x))) return { error: "Sizes must be whole numbers ≥ 1, separated by commas." };
    const u = [...new Set(xs)].sort((a, b) => a - b);
    if (u.length < 3) return { error: "Give at least 3 different sizes so a growth class can be fitted." };
    if (u.length > 14) return { error: "Use at most 14 sizes." };
    if (u[u.length - 1] > 100000) return { error: "The largest size is 100,000." };
    return { sizes: u };
  }
  async function runGrowth() {
    if (st.busy) return;
    const g = st.growth;
    g.sizes = ui.gSizes.value;
    if (!parseNow() || !st.entry) { g.error = { message: "The code needs to parse and contain an ALGORITHM first.", kind: "syntax" }; g.points = []; g.fit = null; drawChart(); return; }
    const sz = parseSizes(g.sizes);
    if (sz.error) { g.error = { message: sz.error, kind: "input" }; g.points = []; g.fit = null; drawChart(); return; }
    const needsValue = st.params.some((p) => (g.roles[p.name] || "value") === "value");
    let fallbacks = st.params.map(() => null);
    if (needsValue) { const c = collectArgs(); if (c.error) { g.error = { message: c.error, kind: "input" }; drawChart(); return; } fallbacks = c.args; }
    if (!st.params.some((p) => g.roles[p.name] === "input" || g.roles[p.name] === "n") && st.params.length) {
      g.error = { message: "No parameter receives the generated input or the size n, so every size would run the same call. Set one parameter to “the generated input” or “the size n”.", kind: "input" }; drawChart(); return;
    }
    const code = ed.getValue();
    g.points = []; g.fit = null; g.error = null; g.note = null;
    g.entry = st.entry;
    st.growthStop = false;
    setBusy(true, "growth");
    drawChart();
    let budget = GROWTH_BUDGET;
    const reps = g.gen === "number" ? 1 : 2;
    const bar = ui.gProg.firstChild;
    ui.gProg.hidden = false;
    for (let k = 0; k < sz.sizes.length; k++) {
      const n = sz.sizes[k];
      bar.style.width = Math.round((k / sz.sizes.length) * 100) + "%";
      ui.gProg.setAttribute("aria-label", `Measuring size ${n} (${k + 1} of ${sz.sizes.length})`);
      const cap = Math.floor(Math.min(GROWTH_RUN_CAP, budget / reps));
      if (cap < 1000) { g.note = `Stopped before n = ${n}: the lab's total budget of ${GROWTH_BUDGET.toLocaleString()} steps is used up.`; break; }
      const res = await Runner.call({ type: "growth", src: code, entry: st.entry, params: st.params, cfg: { gen: g.gen, roles: g.roles }, n, reps, seed: 7 + k, fallbacks, maxSteps: cap }, 45000);
      if (st.growthStop || res.stopped) { g.note = "Stopped — the chart shows the sizes measured so far."; break; }
      if (res.error) {
        if (res.error.kind === "limit" && g.points.length) g.note = `Stopped at n = ${n}: one run needed more than ${cap.toLocaleString()} steps${res.timedOut ? " (or too much time)" : ""}. The fit uses the ${g.points.length} smaller sizes.`;
        else g.error = Object.assign({}, res.error, { n });
        break;
      }
      budget -= res.steps || 0;
      g.points.push({ n, ops: res.ops });
      refit();
      drawChart();
      await new Promise((r) => setTimeout(r, 0));
    }
    bar.style.width = "100%";
    setTimeout(() => { ui.gProg.hidden = true; }, 400);
    setBusy(false);
    refit();
    drawChart();
    announce(g.fit ? "Growth measured: looks like " + fmtClass(g.fit.cls) : "Growth lab finished.");
  }
  function refit() {
    const g = st.growth;
    const pts = g.points.map((p) => ({ n: p.n, ops: p.ops[g.metric] || 0 }));
    g.fit = pts.length >= 3 && pts.some((p) => p.ops > 0) ? ForgeCheck.classify(pts) : null;
  }

  function niceTicks(lo, hi, count) {
    if (hi <= lo) hi = lo + 1;
    const span = hi - lo, step0 = span / count, mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) || 10 * mag;
    const out = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }
  function drawChart() {
    const g = st.growth;
    const metricLabel = (PGCore.METRICS.find((m) => m[0] === g.metric) || [0, g.metric])[1].toLowerCase();
    // verdict
    ui.gFit.innerHTML = "";
    if (g.error) {
      ui.gFit.appendChild(errorBox(g.error, g.error.n ? "The run at n = " + g.error.n + " failed" : g.error.kind === "input" ? "Can't start yet" : null));
    } else if (g.fit) {
      const c = g.fit.constant;
      const cTxt = c >= 100 ? nf(c) : String(+c.toPrecision(2));
      ui.gFit.appendChild(el("div", { class: "pg-verdict" },
        el("div", { class: "pg-vbig" }, el("span", { class: "muted small" }, "Fitted class "), el("b", null, fmtClass(g.fit.cls))),
        el("div", { class: "small" }, `${capital(metricLabel)} ≈ ${cTxt} · ${clsText(g.fit.cls)}` + (g.fit.slope != null ? ` · log–log slope ${g.fit.slope.toFixed(2)}` : "") + ` · ${g.points.length} sizes`),
        el("div", { class: "muted small" }, "A fit from a handful of sizes is evidence, not proof — compare it with your own analysis (and try the other input generators for best and worst cases).")));
      const pts0 = g.points.map((p) => ({ n: p.n, ops: p.ops[g.metric] || 0 }));
      const cc = PGCore.logFactorCloseCall(pts0, g.fit.cls);
      if (cc) {
        const nMin = pts0[0].n, nMax = pts0[pts0.length - 1].n;
        ui.gFit.appendChild(el("div", { class: "callout small pg-closecall", role: "note" },
          el("b", null, "Close call. "),
          `${fmtClass(cc.other)} fits almost as well as ${fmtClass(g.fit.cls)} here. Over n = ${nf(nMin)} … ${nf(nMax)}, log₂ n only grows from ${cc.lo.toFixed(1)} to ${cc.hi.toFixed(1)} (×${(cc.hi / cc.lo).toFixed(2)}), so a log factor shifts the log–log slope by just ${cc.slopeShift.toFixed(2)}. ` +
          (nMax < 4096 ? "Try bigger sizes (the “256 → 8,192” preset) or count a more specific operation before trusting the difference." : "Count a more specific operation or reason about the code before trusting the difference.")));
      }
    }
    if (g.note) ui.gFit.appendChild(el("div", { class: "callout steel small pg-gnote" }, g.note));

    // chart
    const host = ui.gChart;
    host.innerHTML = "";
    const avail = host.clientWidth ? host.clientWidth - 10 : 640;
    const W = Math.max(330, Math.min(720, avail)), H = W < 480 ? 280 : 330;
    const m = { l: W < 480 ? 46 : 62, r: W < 480 ? 64 : 92, t: 16, b: 44 };
    const pts = g.points.map((p) => ({ n: p.n, y: p.ops[g.metric] || 0 }));
    const svg = S("svg", { viewBox: `0 0 ${W} ${H}`, class: "pg-svg", role: "img", "aria-label": pts.length ? `Chart of ${metricLabel} against input size n: ` + pts.map((p) => `n ${p.n}: ${nf(p.y)}`).join(", ") : "Empty growth chart" });
    host.appendChild(svg);
    if (!pts.length) {
      svg.appendChild(S("rect", { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: "none", stroke: "var(--line)", "stroke-dasharray": "4 4", rx: 8 }));
      svg.appendChild(S("text", { x: (W + m.l - m.r) / 2, y: H / 2, "text-anchor": "middle", class: "pg-axis-t" }, st.busy ? "Measuring…" : "Press “Measure growth” to plot operations against n"));
      ui.gLegend.innerHTML = ""; ui.gTable.innerHTML = "";
      return;
    }
    const log = g.scale === "log";
    const nMin = pts[0].n, nMax = pts[pts.length - 1].n;
    const refs = REF_CLASSES.slice();
    if (g.fit && !refs.includes(g.fit.cls) && LOGF[g.fit.cls]) refs.push(g.fit.cls);
    // reference curves: c·f(n) with the constant c fitted to all the measurements (geometric mean of y / f(n))
    const curves = refs.filter((c) => g.refs[c] !== false).map((c) => {
      const lr = pts.map((p) => Math.log(Math.max(1, p.y) / LOGF[c](p.n)));
      const k = Math.exp(lr.reduce((a, b) => a + b, 0) / lr.length);
      return { c, f: (n) => k * LOGF[c](n) };
    });
    const dMax = Math.max(1, ...pts.map((p) => p.y)), dMin = Math.max(1, Math.min(...pts.map((p) => Math.max(1, p.y))));
    let yMax = dMax, yMin = dMin;
    curves.forEach((cv) => [nMin, nMax].forEach((n) => { const a = cv.f(n); if (Number.isFinite(a) && a > 0) { yMin = Math.min(yMin, Math.max(1, a, dMin / 100)); yMax = Math.max(yMax, Math.min(a, dMax * 20)); } }));
    if (!log) yMax = dMax * 1.25;
    const x0 = m.l, x1 = W - m.r, y0 = H - m.b, y1 = m.t;
    const xs = log ? (n) => x0 + ((Math.log2(n) - Math.log2(nMin)) / Math.max(1e-9, Math.log2(nMax) - Math.log2(nMin))) * (x1 - x0)
      : (n) => x0 + ((n - (nMin > nMax / 6 ? nMin : 0)) / Math.max(1e-9, nMax - (nMin > nMax / 6 ? nMin : 0))) * (x1 - x0);
    const lyMin = Math.floor(Math.log10(yMin)), lyMax = Math.ceil(Math.log10(yMax * 1.05));
    // (reference curves may dip below 1 at small n: map them honestly and let the clip path cut them, rather than
    // flattening them along the floor, which looked like a measured plateau)
    const ys = log ? (v) => y0 - ((Math.log10(Math.max(1e-6, v)) - lyMin) / Math.max(1e-9, lyMax - lyMin)) * (y0 - y1)
      : (v) => y0 - (v / yMax) * (y0 - y1);
    // grid + axes
    const gridG = S("g", { class: "pg-grid-l" });
    const yt = log ? Array.from({ length: lyMax - lyMin + 1 }, (_, i) => Math.pow(10, lyMin + i)) : niceTicks(0, yMax, 5);
    yt.forEach((v) => {
      const y = ys(v);
      if (y < y1 - 1 || y > y0 + 1) return;
      gridG.appendChild(S("line", { x1: x0, x2: x1, y1: y, y2: y, stroke: "var(--line)", "stroke-width": 1 }));
      gridG.appendChild(S("text", { x: x0 - 8, y: y + 4, "text-anchor": "end", class: "pg-axis-t" }, compact(v)));
    });
    const xt = log ? pts.map((p) => p.n) : niceTicks(nMin > nMax / 6 ? nMin : 0, nMax, 6);
    let lastX = -1e9;
    xt.forEach((n) => {
      const x = xs(n);
      if (x < x0 - 1 || x > x1 + 1 || x - lastX < 30) return;
      lastX = x;
      gridG.appendChild(S("line", { x1: x, x2: x, y1: y0, y2: y0 + 5, stroke: "var(--line-2)" }));
      gridG.appendChild(S("text", { x, y: y0 + 18, "text-anchor": "middle", class: "pg-axis-t" }, compact(n)));
    });
    gridG.appendChild(S("line", { x1: x0, x2: x1, y1: y0, y2: y0, stroke: "var(--line-2)", "stroke-width": 1.5 }));
    svg.appendChild(gridG);
    svg.appendChild(S("text", { x: (x0 + x1) / 2, y: H - 6, "text-anchor": "middle", class: "pg-axis-l" }, "input size n" + (log ? " (log scale)" : "")));
    svg.appendChild(S("text", { x: 14, y: (y0 + y1) / 2, "text-anchor": "middle", transform: `rotate(-90 14 ${(y0 + y1) / 2})`, class: "pg-axis-l" }, metricLabel + (log ? " (log scale)" : "")));
    // clip area for curves
    const clipId = "pgclip";
    svg.appendChild(S("defs", null, S("clipPath", { id: clipId }, S("rect", { x: x0, y: y1 - 2, width: x1 - x0 + 2, height: y0 - y1 + 4 }))));
    // reference curves
    const labelY = [];
    curves.forEach((cv) => {
      const [col, dash] = REF_STYLE[cv.c] || REF_STYLE.other;
      let d = "";
      const N = 60;
      for (let i = 0; i <= N; i++) {
        const n = log ? Math.pow(2, Math.log2(nMin) + (i / N) * (Math.log2(nMax) - Math.log2(nMin))) : (nMin > nMax / 6 ? nMin : 1) + (i / N) * (nMax - (nMin > nMax / 6 ? nMin : 1));
        const v = cv.f(n);
        if (!Number.isFinite(v)) continue;
        d += (d ? "L" : "M") + xs(n).toFixed(1) + " " + ys(v).toFixed(1);
      }
      svg.appendChild(S("path", { d, fill: "none", stroke: col, "stroke-width": 1.6, "stroke-dasharray": dash, opacity: 0.85, "clip-path": `url(#${clipId})` }));
      const yEnd = ys(cv.f(nMax));
      labelY.push({ c: cv.c, y: Math.min(y0, Math.max(y1 + 6, yEnd)), off: yEnd < y1, col });
    });
    // direct labels at the right edge: clamp into the plot, then spread so they don't collide
    labelY.sort((a, b) => a.y - b.y);
    for (let i = 1; i < labelY.length; i++) if (labelY[i].y - labelY[i - 1].y < 13) labelY[i].y = labelY[i - 1].y + 13;
    const over = labelY.length ? labelY[labelY.length - 1].y - y0 : 0;
    if (over > 0) labelY.forEach((L) => { L.y -= over; });
    labelY.forEach((L) => svg.appendChild(S("text", { x: x1 + 8, y: L.y + 4, class: "pg-ref-t" }, clsText(L.c) + (L.off ? " ↑" : ""))));
    // measured series
    let d = "";
    const yPt = (v) => ys(log ? Math.max(1, v) : v); // a measured 0 sits on the floor of a log axis
    pts.forEach((p, i) => { d += (i ? "L" : "M") + xs(p.n).toFixed(1) + " " + yPt(p.y).toFixed(1); });
    svg.appendChild(S("path", { d, fill: "none", stroke: "var(--ember)", "stroke-width": 2.5, "stroke-linejoin": "round" }));
    const tip = el("div", { class: "pg-tip", hidden: true });
    host.appendChild(tip);
    pts.forEach((p) => {
      const cx = xs(p.n), cy = yPt(p.y);
      const grp = S("g", { class: "pg-pt", tabindex: "0", role: "img", "aria-label": `n = ${p.n}: ${nf(p.y)} ${metricLabel}` });
      grp.appendChild(S("circle", { cx, cy, r: 12, fill: "transparent" }));
      grp.appendChild(S("circle", { cx, cy, r: 4.5, fill: "var(--ember)", stroke: "var(--panel)", "stroke-width": 2 }));
      const showTip = () => {
        tip.hidden = false;
        tip.textContent = "";
        tip.appendChild(el("b", null, "n = " + p.n.toLocaleString()));
        tip.appendChild(el("div", null, nf(p.y) + " " + metricLabel));
        if (g.fit) tip.appendChild(el("div", { class: "muted" }, "÷ " + clsText(g.fit.cls) + " = " + (p.y / LOGF[g.fit.cls](p.n)).toPrecision(3)));
        const box = host.getBoundingClientRect(), sc = box.width / W;
        tip.style.left = Math.min(box.width - 150, Math.max(4, cx * sc - 70)) + "px";
        tip.style.top = Math.max(0, cy * sc - 70) + "px";
      };
      grp.addEventListener("mouseenter", showTip); grp.addEventListener("focus", showTip);
      grp.addEventListener("mouseleave", () => { tip.hidden = true; }); grp.addEventListener("blur", () => { tip.hidden = true; });
      svg.appendChild(grp);
    });
    if (pts.length === 1) svg.appendChild(S("text", { x: (x0 + x1) / 2, y: y1 + 16, "text-anchor": "middle", class: "pg-axis-t" }, "Measuring the next size…"));

    // legend (toggles for the reference curves)
    ui.gLegend.innerHTML = "";
    ui.gLegend.appendChild(el("span", { class: "pg-leg-measured" }, el("i", { style: { background: "var(--ember)" } }), "measured " + metricLabel));
    refs.forEach((c) => {
      const [col, dash] = REF_STYLE[c] || REF_STYLE.other;
      const on = g.refs[c] !== false;
      const b = el("button", { type: "button", class: "pg-leg-b", "aria-pressed": String(on), title: (on ? "Hide" : "Show") + " the reference curve " + clsText(c) },
        S("svg", { width: 26, height: 10, "aria-hidden": "true" }, S("line", { x1: 1, x2: 25, y1: 5, y2: 5, stroke: col, "stroke-width": 2, "stroke-dasharray": dash })),
        " " + clsText(c));
      b.addEventListener("click", () => { g.refs[c] = !on; drawChart(); });
      ui.gLegend.appendChild(b);
    });
    ui.gLegend.appendChild(el("span", { class: "muted small" }, "dashed reference curves are fitted to your measurements — the one the orange line hugs is the growth class"));

    // table view
    ui.gTable.innerHTML = "";
    const det = el("details", { class: "pg-gtable" }, el("summary", null, "Show the numbers"));
    const t = el("table", { class: "t" }, el("thead", null, el("tr", null, el("th", null, "n"), el("th", null, capital(metricLabel)), g.fit ? el("th", null, "÷ " + clsText(g.fit.cls)) : null, el("th", null, "steps"))));
    const tb = el("tbody");
    g.points.forEach((p) => {
      const y = p.ops[g.metric] || 0;
      tb.appendChild(el("tr", null, el("td", null, p.n.toLocaleString()), el("td", null, nf(y)), g.fit ? el("td", null, (y / LOGF[g.fit.cls](p.n)).toPrecision(3)) : null, el("td", null, nf(p.ops.steps))));
    });
    t.appendChild(tb);
    det.appendChild(el("div", { class: "scroll-x" }, t));
    ui.gTable.appendChild(det);
  }
  function clsText(c) { return c === "1" ? "1" : c.replace("^2", "²").replace("^3", "³").replace("2^n", "2ⁿ").replace("sqrt n", "√n"); }
  function capital(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* =====================================================================
     Examples gallery
     ===================================================================== */
  function buildGallery() {
    const host = $("#pg-gallery");
    if (!host) return;
    const filters = el("div", { class: "pg-gfilters", role: "group", "aria-label": "Filter examples by chapter" });
    const groupsBox = el("div");
    const bands = [["all", "All"], ["1-5", "Ch 1–5"], ["6-9", "Ch 6–9"], ["12-18", "Ch 12 · Beyond · Frontier"]];
    let cur = "all";
    const btns = {};
    bands.forEach(([k, l]) => {
      const b = el("button", { type: "button", class: "chip pg-fchip", "aria-pressed": String(k === cur) }, l);
      b.addEventListener("click", () => { cur = k; Object.keys(btns).forEach((x) => btns[x].setAttribute("aria-pressed", String(x === k))); render(); });
      btns[k] = b;
      filters.appendChild(b);
    });
    function inBand(c) { if (cur === "all") return true; const [a, z] = cur.split("-").map(Number); return c >= a && c <= z; }
    function render() {
      groupsBox.innerHTML = "";
      const grid = el("div", { class: "pg-cards" });
      PGExamples.list.filter((e) => inBand(e.chapter)).forEach((e) => {
        const open = el("button", { type: "button", class: "pg-card-open" }, el("span", { class: "pg-card-t" }, e.title));
        open.addEventListener("click", () => { loadExample(e.id, true); $(".pg-toolbar").scrollIntoView({ behavior: "smooth", block: "start" }); });
        const meta = el("div", { class: "pg-card-meta small" },
          el("code", null, e.entry + "(" + Object.keys(e.inputs).join(", ") + ")"),
          e.growth && e.growth.expect ? el("span", { class: "chip steel", title: "What the Growth lab preset measures" }, fmtClass(e.growth.expect)) : null);
        grid.appendChild(el("article", { class: "card pg-card" },
          el("div", { class: "pg-card-ch" }, "Ch " + e.chapter + " · " + e.chapterName),
          open, el("p", null, e.blurb), meta,
          el("a", { class: "pg-deeplink", href: "#ex=" + e.id, title: "Direct link to this example" }, "#ex=" + e.id)));
      });
      groupsBox.appendChild(grid);
    }
    render();
    host.appendChild(filters);
    host.appendChild(groupsBox);
  }

  /* =====================================================================
     Loading code
     ===================================================================== */
  function loadCode(o, msg) {
    st.exId = o.exId || null;
    st.entry = null;
    st.params = [];
    st.inputs = Object.assign({}, o.inputs || {});
    ui.fields.innerHTML = "";
    ed.setValue(o.code || "");
    renderExInfo(false);
    if (o.entry) st.entry = o.entry;
    const e = ex();
    parseNow();
    applyGrowthPreset(e);
    syncGrowthRoles(false);
    st.lastRun = null;
    buildResultEmpty();
    if (tv) { tv.clear(); tv.body.hidden = true; tv.say(null); ui.traceIntro.hidden = false; }
    renderExInfo(e && ed.getValue() !== e.code);
    saveDraft();
    if (msg) announce(msg);
  }
  function loadExample(id, user) {
    const e = PGExamples.get(id);
    if (!e) return false;
    const remembered = (store.get("inputs", {}) || {})[e.id + "|" + e.entry];
    loadCode({ code: e.code, exId: e.id, entry: e.entry, inputs: Object.assign({}, e.inputs, remembered || {}) }, "Loaded the example " + e.title + ".");
    if (user) tabs.select("result");
    return true;
  }
  let resetArmed = null;
  function onReset() {
    if (!resetArmed) {
      ui.btnReset.textContent = "Click again to reset";
      ui.btnReset.classList.add("armed");
      resetArmed = setTimeout(() => { resetArmed = null; ui.btnReset.textContent = "↺ Reset"; ui.btnReset.classList.remove("armed"); }, 3500);
      return;
    }
    clearTimeout(resetArmed); resetArmed = null;
    ui.btnReset.textContent = "↺ Reset"; ui.btnReset.classList.remove("armed");
    const e = ex();
    const all = store.get("inputs", {}) || {};
    if (e) { delete all[e.id + "|" + e.entry]; store.set("inputs", all); loadCode({ code: e.code, exId: e.id, entry: e.entry, inputs: Object.assign({}, e.inputs) }, "Reset to the original example."); }
    else { delete all["own|MyAlgorithm"]; store.set("inputs", all); loadCode({ code: BLANK, exId: null, inputs: { A: "[4, 8, 15, 16, 23, 42]" } }, "Reset to the blank template."); }
  }
  async function onShare() {
    const payload = { v: 1, code: ed.getValue(), entry: st.entry, inputs: st.inputs };
    if (st.exId) payload.ex = st.exId;
    let url;
    const e = ex();
    if (e && ed.getValue() === e.code && JSON.stringify(st.inputs) === JSON.stringify(e.inputs)) url = location.href.replace(/#.*$/, "") + "#ex=" + e.id;
    else url = shareURL(await encodeShare(payload));
    let copied = false;
    try { await navigator.clipboard.writeText(url); copied = true; } catch (err) { copied = false; }
    ui.shareBox.innerHTML = "";
    const inp = el("input", { type: "text", class: "mono", readonly: true, value: url, "aria-label": "Share link" });
    const close = el("button", { class: "btn sm", type: "button", "aria-label": "Close share link" }, "✕");
    close.addEventListener("click", () => { ui.shareBox.hidden = true; });
    ui.shareBox.appendChild(el("div", { class: "row" }, el("span", { class: "small " + (copied ? "ok-txt" : "muted") }, copied ? "✓ Link copied" : "Copy this link:"), inp, close));
    ui.shareBox.appendChild(el("div", { class: "muted small" }, `The link holds the code and inputs themselves (${url.length.toLocaleString()} characters) — nothing is uploaded anywhere.`));
    ui.shareBox.hidden = false;
    if (!copied) { inp.focus(); inp.select(); }
    announce(copied ? "Link copied." : "Select the link to copy it.");
  }
  function onDownload() {
    const name = (st.entry || "pseudocode").replace(/[^A-Za-z0-9_-]/g, "") + ".txt";
    const blob = new Blob([ed.getValue()], { type: "text/plain;charset=utf-8" });
    const a = el("a", { href: URL.createObjectURL(blob), download: name });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    announce("Downloaded " + name + ".");
  }

  /** #ex=<id> · #code=<token> (z.<deflate> / b.<base64> JSON payload, or base64url source) · optional &entry=Name */
  async function fromHash() {
    const h = location.hash.replace(/^#/, "");
    if (!h) return false;
    const q = new URLSearchParams(h);
    if (q.get("ex")) {
      if (loadExample(q.get("ex"), false)) return true;
      showMessage(`There's no example called “${q.get("ex")}”. Pick one from the gallery below.`, "bad");
      return false;
    }
    const tok = q.get("code");
    if (tok) {
      try {
        const p = await decodeShare(tok);
        if (typeof p.code !== "string") throw new Error("The link has no code in it.");
        const exId = p.ex && PGExamples.get(p.ex) ? p.ex : null;
        loadCode({ code: p.code, exId, entry: q.get("entry") || p.entry, inputs: p.inputs || {} }, "Loaded code from the link.");
        if (p.inputs) { Object.assign(st.inputs, p.inputs); renderFields(); }
        return true;
      } catch (e) {
        showMessage("This link's code couldn't be read: " + e.message, "bad");
        return false;
      }
    }
    return false;
  }

  /* =====================================================================
     Boot
     ===================================================================== */
  async function boot() {
    Forge.page({ title: "Playground" });
    build();
    tabs.select(store.get("tab", "result") === "growth" ? "growth" : "result");
    let loaded = await fromHash();
    if (!loaded) {
      const d = store.get("draft", null);
      if (d && typeof d.code === "string" && d.code.trim()) {
        loadCode({ code: d.code, exId: d.exId && PGExamples.get(d.exId) ? d.exId : null, entry: d.entry, inputs: d.inputs || {} });
        ui.saved.textContent = "Restored your draft";
        loaded = true;
      }
    }
    if (!loaded) loadExample(DEFAULT_EX, false);
    window.addEventListener("hashchange", () => { fromHash(); });
    // a tiny test hook for automated checks
    window.PG = { state: st, editor: ed, run, runGrowth, loadExample, tabs, encodeShare, decodeShare };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
