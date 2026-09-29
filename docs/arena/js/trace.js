/* Forge Arena — "watch your own code run": a step player over ForgePseudo trace frames.
   Frame = {line, fn, depth, vars, stack, touched:{r:[[name,i]], w:[[name,i]]}, out}
   Shows: current line (in the editor + here), arrays as cells with index pointers, variables (changed ones flash),
   call stack, printed output, and running operation counters. */
(function () {
  "use strict";
  const Arena = (window.Arena = window.Arena || {});
  const el = (...a) => Forge.el(...a);
  const S = (...a) => Forge.svg(...a);

  const PTR = /^(i|j|k|l|r|m|s|lo|hi|mid|low|high|left|right|start|end|pos|idx|index|cur|curr|top|front|back|head|tail|slow|fast|ptr|split|pivotIndex|[ijklmpqrs][0-9₀-₉']+|ii|jj|kk)$/;
  const PTR_COLORS = ["var(--ember)", "var(--steel)", "var(--c-pivot)", "var(--c-done)", "var(--c-compare)", "var(--c-swap)"];

  /** From the source, the ranges each ALGORITHM header declares: {fn: {A: ["l", "r"]}} for "ALGORITHM F(A[l..r])". */
  function headerRanges(code) {
    const out = {};
    const re = /^\s*(?:ALGORITHM|FUNCTION|PROCEDURE)\s+([A-Za-z_]\w*)\s*\((.*)\)/gim;
    let m;
    while ((m = re.exec(code))) {
      const r = {};
      const pr = /([A-Za-z_]\w*)\s*\[\s*([A-Za-z_]\w*)\s*\.\.\s*([A-Za-z_]\w*)\s*\]/g;
      let q;
      while ((q = pr.exec(m[2]))) r[q[1]] = [q[2], q[3]];
      out[m[1]] = r;
    }
    return out;
  }
  const isView = (v) => v && typeof v === "object" && v.__view;
  const isScalar = (v) => v === null || ["number", "string", "boolean"].includes(typeof v);
  const flat = (v) => Array.isArray(v) && v.every(isScalar);
  const grid = (v) => Array.isArray(v) && v.length > 0 && v.length <= 14 && v.every((r) => flat(r)) && Math.max(...v.map((r) => r.length)) <= 20 && v.some((r) => r.length > 0);
  const cellText = (x) => (x === Infinity ? "∞" : x === -Infinity ? "-∞" : x === null ? "·" : typeof x === "number" ? (Number.isInteger(x) ? String(x) : String(+x.toFixed(3))) : typeof x === "boolean" ? (x ? "T" : "F") : String(x));

  function TraceViewer(host, opts) {
    this.opts = opts || {};
    this.host = host;
    this.editor = this.opts.editor;
    this.root = el("div", { class: "tv" });
    host.appendChild(this.root);
    this.ptrColor = {};
    this.buildShell();
  }

  TraceViewer.prototype.buildShell = function () {
    const r = this.root;
    this.picker = el("div", { class: "tv-picker" });
    this.status = el("div", { class: "tv-status", "aria-live": "polite" });
    this.header = el("div", { class: "tv-header" });
    this.playerHost = el("div", { class: "tv-player" });
    this.narr = el("div", { class: "narrate tv-narr", "aria-live": "polite" });
    this.stageWrap = el("div", { class: "tv-stage-wrap" });
    this.vars = el("div", { class: "tv-vars" });
    this.stack = el("div", { class: "tv-stack" });
    this.counters = el("div", { class: "tv-counters" });
    this.out = el("pre", { class: "out tv-out" });
    this.body = el("div", { class: "tv-body", hidden: true },
      this.header,
      this.playerHost,
      this.narr,
      el("div", { class: "panel tv-panel" }, el("div", { class: "panel-title" }, "Arrays", el("span", { class: "legend tv-legend" },
        el("span", null, el("i", { style: { background: "var(--c-compare)" } }), "read"),
        el("span", null, el("i", { style: { background: "var(--c-swap)" } }), "written"),
        el("span", null, el("i", { style: { background: "var(--c-dim)" } }), "outside this call's range"))), this.stageWrap),
      el("div", { class: "tv-grid" },
        el("div", { class: "panel tv-panel" }, el("div", { class: "panel-title" }, "Variables"), this.vars),
        el("div", { class: "stack" },
          el("div", { class: "panel tv-panel" }, el("div", { class: "panel-title" }, "Call stack"), this.stack),
          el("div", { class: "panel tv-panel" }, el("div", { class: "panel-title" }, "Operations so far"), this.counters),
          el("div", { class: "panel tv-panel" }, el("div", { class: "panel-title" }, "Output (print)"), this.out))));
    r.appendChild(this.picker);
    r.appendChild(this.status);
    r.appendChild(this.body);
    this.player = Forge.player(this.playerHost, { frames: [], render: (f, i) => this.render(i), fps: 3 });
  };

  /** Build the input picker (examples + custom). onTrace(args) is called when the learner presses Trace. */
  TraceViewer.prototype.setup = function (problem, onTrace) {
    this.problem = problem;
    this.onTrace = onTrace;
    const pk = this.picker;
    pk.innerHTML = "";
    const tests = problem.tests || [];
    const sel = el("select", { "aria-label": "Input to watch", class: "tv-select" });
    tests.forEach((t, i) => {
      const label = (t.name || (i < (problem.exampleCount || 3) ? `Example ${i + 1}` : `Test ${i + 1}`)) + ": " + (problem.params || []).map((nm, k) => nm + " = " + Arena.show(t.args[k])).join(", ");
      sel.appendChild(el("option", { value: String(i) }, label.length > 90 ? label.slice(0, 88) + "…" : label));
    });
    sel.appendChild(el("option", { value: "custom" }, "✏️ Custom input…"));
    const custom = el("div", { class: "tv-custom", hidden: true });
    const fields = (problem.params || []).map((nm, k) => {
      const inp = el("input", { type: "text", class: "mono", value: JSON.stringify(tests[0] ? tests[0].args[k] : 0), "aria-label": "Value for " + nm, spellcheck: "false" });
      custom.appendChild(el("label", { class: "field" }, nm, inp));
      return inp;
    });
    custom.appendChild(el("div", { class: "muted small" }, "Use JSON: numbers, \"text\", [1, 2, 3], [[0, 1], [1]] …"));
    sel.addEventListener("change", () => { custom.hidden = sel.value !== "custom"; });
    const go = el("button", { class: "btn primary", type: "button" }, "👁 Watch it run");
    go.addEventListener("click", () => {
      let args;
      if (sel.value === "custom") {
        try { args = fields.map((f) => JSON.parse(f.value.replace(/∞/g, "1e999"))); }
        catch (e) { this.say(`That custom input isn't valid JSON (${e.message}).`, "bad"); return; }
      } else args = JSON.parse(JSON.stringify(tests[+sel.value].args));
      this.onTrace(args);
    });
    this.select = sel;
    pk.appendChild(el("div", { class: "row tv-pick-row" }, el("label", { class: "field grow" }, "Pick an input", sel), go));
    pk.appendChild(custom);
  };

  TraceViewer.prototype.say = function (msg, cls) {
    this.status.innerHTML = "";
    if (msg) this.status.appendChild(el("div", { class: "callout " + (cls || "steel") }, msg));
  };
  TraceViewer.prototype.markStale = function (code) {
    if (!this.frames || !this.frames.length || !this.meta || code === this.meta.code) return;
    this.say("✏️ Your code changed since this trace — press “Watch it run” again to refresh.", "steel");
  };

  /** Load a trace result. meta: {code, args} */
  TraceViewer.prototype.load = function (result, meta) {
    this.result = result;
    this.meta = meta;
    this.codeLines = String(meta.code || "").split("\n");
    this.ranges = headerRanges(String(meta.code || ""));
    const frames = (result && result.trace) || [];
    this.frames = frames;
    this.say(null);
    if (result.error && !frames.length) {
      this.body.hidden = true;
      this.say((result.error.line ? `Line ${result.error.line}: ` : "") + result.error.message, "bad");
      if (this.editor) this.editor.setErrorLine(result.error.line);
      return;
    }
    // cumulative counters
    let r = 0, w = 0;
    const hits = {};
    this.cum = frames.map((f) => {
      if (f.touched) { r += f.touched.r.length; w += f.touched.w.length; }
      hits[f.line] = (hits[f.line] || 0) + 1;
      return { reads: r, writes: w, lineHits: hits[f.line] };
    });
    // header
    const p = this.problem;
    const call = (result.entry || p.entry) + "(" + (p.params || []).map((nm, k) => nm + " = " + Arena.show(meta.args[k])).join(", ") + ")";
    this.header.innerHTML = "";
    let verdict;
    if (!result.ok && result.error) verdict = el("span", { class: "chip bad" }, "💥 stops with an error");
    else {
      const outVal = p.output && p.output.arg !== undefined ? result.args && result.args[p.output.arg] : result.value;
      verdict = el("span", { class: "chip ok" }, (p.output && p.output.arg !== undefined ? p.params[p.output.arg] + " ends as " : "returns ") + Arena.show(outVal));
    }
    this.header.appendChild(el("div", { class: "tv-call" }, el("code", null, call), " ", verdict,
      frames.length >= 5000 ? el("span", { class: "chip warn" }, "showing the first 5,000 steps") : null));
    if (!frames.length) {
      this.body.hidden = false;
      this.say("Your algorithm finished without executing any statement — is the body empty?", "steel");
      return;
    }
    this.body.hidden = false;
    this.ptrColor = {};
    this.player.load(frames);
    // move focus into the player so ← / → step the trace instead of switching tabs
    const pb = this.playerHost.querySelector("button:not([disabled])");
    if (pb) try { pb.focus({ preventScroll: true }); } catch (e) { /* old browsers */ }
  };

  TraceViewer.prototype.render = function (i) {
    const f = this.frames[i];
    if (!f) return;
    const prev = i > 0 ? this.frames[i - 1] : null;
    const samePrev = prev && prev.fn === f.fn && prev.depth === f.depth;
    if (this.editor) this.editor.setTraceLine(f.line);
    this.renderNarration(f, prev, samePrev, i);
    this.renderArrays(f, prev, samePrev);
    this.renderVars(f, prev, samePrev);
    this.renderStack(f);
    this.renderCounters(i);
    const outLines = (this.result.output || []).slice(0, f.out);
    this.out.textContent = outLines.length ? outLines.join("\n") : "(nothing printed yet)";
    this.out.classList.toggle("muted", !outLines.length);
  };

  TraceViewer.prototype.renderNarration = function (f, prev, samePrev, i) {
    const lineText = (this.codeLines[f.line - 1] || "").trim().replace(/\s*\/\/.*$/, "");
    const bits = [];
    if (samePrev) {
      for (const k in f.vars) {
        const a = prev.vars[k], b = f.vars[k];
        if (!(k in prev.vars)) { if (isScalar(b)) bits.push(`<b>${Arena.esc(k)}</b> = ${Arena.esc(Arena.show(b))} <span class="muted">(new)</span>`); else bits.push(`<b>${Arena.esc(k)}</b> created`); }
        else if (isScalar(b) && a !== b) bits.push(`<b>${Arena.esc(k)}</b>: ${Arena.esc(Arena.show(a))} → <b class="chg-txt">${Arena.esc(Arena.show(b))}</b>`);
      }
    } else if (prev && f.depth > prev.depth) bits.push(`📞 called <b>${Arena.esc(f.fn)}</b> (depth ${f.depth})`);
    else if (prev && f.depth < prev.depth) bits.push(`↩️ back in <b>${Arena.esc(f.fn)}</b> (depth ${f.depth})`);
    if (f.touched) {
      const rd = f.touched.r.map(([n, k]) => `${n}[${k}]` + valAt(f.vars[n], k));
      const wr = f.touched.w.map(([n, k]) => `${n}[${k}] ← ` + valAt(f.vars[n], k, true));
      if (rd.length) bits.push("read " + Arena.esc(uniq(rd).slice(0, 4).join(", ")));
      if (wr.length) bits.push("wrote " + Arena.esc(uniq(wr).slice(0, 4).join(", ")));
    }
    let tail = "";
    if (i === this.frames.length - 1) {
      if (this.result.ok) tail = `<div class="tv-done">🏁 Finished — ${Arena.esc(this.header.querySelector(".chip") ? this.header.querySelector(".chip").textContent : "")}.</div>`;
      else if (this.result.error) tail = `<div class="tv-done bad">💥 ${this.result.error.line ? "Line " + this.result.error.line + ": " : ""}${Arena.esc(this.result.error.message)}</div>`;
    }
    this.narr.innerHTML = `<div><span class="chip steel">Line ${f.line}</span> <code class="tv-line">${Arena.esc(lineText) || "…"}</code></div>` +
      (bits.length ? `<div class="tv-bits">${bits.join(" · ")}</div>` : "") + tail;
    if (this.editor && this.result.error && i === this.frames.length - 1) this.editor.setErrorLine(this.result.error.line);
  };
  function uniq(a) { return [...new Set(a)]; }
  function valAt(v, k, bare) {
    let x;
    if (Array.isArray(v)) x = v[k];
    else if (isView(v)) x = v.base[v.off + k];
    else return "";
    if (x === undefined) return "";
    return (bare ? "" : " = ") + (isScalar(x) ? cellText(x) : Arena.show(x));
  }

  /** Arrays → SVG rows of cells with pointer arrows. */
  TraceViewer.prototype.renderArrays = function (f, prev, samePrev) {
    const arrays = [], grids = [];
    for (const name in f.vars) {
      const v = f.vars[name];
      if (isView(v)) arrays.push({ name, cells: v.base, off: v.off, len: v.len, view: true });
      else if (flat(v)) arrays.push({ name, cells: v, off: 0, len: v.length, view: false });
      else if (grid(v)) grids.push({ name, rows: v });
    }
    const pointers = [];
    for (const name in f.vars) {
      const v = f.vars[name];
      if (typeof v === "number" && Number.isInteger(v) && PTR.test(name)) pointers.push({ name, v });
    }
    pointers.forEach((p) => { if (!this.ptrColor[p.name]) this.ptrColor[p.name] = PTR_COLORS[Object.keys(this.ptrColor).length % PTR_COLORS.length]; });
    const touchedR = {}, touchedW = {};
    if (f.touched) {
      f.touched.r.forEach(([n, k]) => { (touchedR[n] = touchedR[n] || new Set()).add(k); });
      f.touched.w.forEach(([n, k]) => { (touchedW[n] = touchedW[n] || new Set()).add(k); });
    }
    this.stageWrap.innerHTML = "";
    if (!arrays.length && !grids.length) { this.stageWrap.appendChild(el("div", { class: "muted small" }, "No arrays in this call yet — variables are listed below.")); return; }
    arrays.forEach((a) => {
      const total = a.cells.length;
      const cw = total > 30 ? 26 : 38, ch = 34, padL = 8, labelW = 0;
      const ptrs = pointers.filter((p) => p.v >= -1 && p.v <= a.len); // local indexes
      // group pointers by position
      const at = {};
      ptrs.forEach((p) => { const abs = a.off + p.v; (at[abs] = at[abs] || []).push(p); });
      const maxStack = Math.max(0, ...Object.values(at).map((g) => g.length));
      const leftExtra = ptrs.some((p) => a.off + p.v < 0) ? cw : 0;
      const rightExtra = ptrs.some((p) => a.off + p.v >= total) ? cw : 0;
      const W = padL * 2 + labelW + leftExtra + total * cw + rightExtra + 2;
      const H = 16 + ch + 16 + (maxStack ? 14 + maxStack * 14 : 0);
      const s = S("svg", { class: "tv-arr", width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": `${a.name} = ${Arena.show(a.view ? a.cells.slice(Math.max(0, a.off), a.off + a.len) : a.cells)}` });
      const x0 = padL + labelW + leftExtra;
      const prevV = samePrev && prev ? prev.vars[a.name] : null;
      const prevCells = prevV ? (isView(prevV) ? prevV.base : Array.isArray(prevV) ? prevV : null) : null;
      for (let k = 0; k < total; k++) {
        const local = k - a.off;
        const inWindow = !a.view || (local >= 0 && local < a.len);
        let inView = inWindow;
        const rg = this.ranges && this.ranges[f.fn] && this.ranges[f.fn][a.name];
        if (rg && Number.isInteger(f.vars[rg[0]]) && Number.isInteger(f.vars[rg[1]]) && (local < f.vars[rg[0]] || local > f.vars[rg[1]])) inView = false;
        const x = x0 + k * cw, y = 16;
        const r = touchedR[a.name] && touchedR[a.name].has(local), w = touchedW[a.name] && touchedW[a.name].has(local);
        let fill = "var(--panel-2)", ink = "var(--ink)", stroke = "var(--line-2)";
        if (!inView) { fill = "var(--c-dim)"; ink = "var(--muted)"; }
        if (r) { fill = "var(--c-compare)"; ink = "#1b1300"; stroke = "var(--c-compare)"; }
        if (w) { fill = "var(--c-swap)"; ink = "#fff"; stroke = "var(--c-swap)"; }
        const changed = prevCells && prevCells[k] !== a.cells[k];
        s.appendChild(S("rect", { x: x + 1, y, width: cw - 2, height: ch, rx: 6, fill, stroke, "stroke-width": 1.5, class: changed ? "cell-chg" : null }));
        const txt = cellText(a.cells[k]);
        s.appendChild(S("text", { x: x + cw / 2, y: y + ch / 2 + 4.5, "text-anchor": "middle", "font-size": txt.length > 4 ? 9 : cw < 30 ? 11 : 13, "font-weight": 700, fill: ink }, txt.length > 6 ? txt.slice(0, 5) + "…" : txt));
        if (inWindow) s.appendChild(S("text", { x: x + cw / 2, y: 11, "text-anchor": "middle", "font-size": 9, fill: "var(--muted)" }, String(local)));
      }
      // pointers
      Object.keys(at).forEach((absS) => {
        const abs = +absS;
        const x = abs < 0 ? padL + labelW + leftExtra / 2 : abs >= total ? x0 + total * cw + rightExtra / 2 : x0 + abs * cw + cw / 2;
        const out = abs < 0 || abs >= total;
        const y = 16 + ch + 3;
        const col = this.ptrColor[at[abs][0].name];
        s.appendChild(S("path", { d: `M${x} ${y} l-5 8 h10 z`, fill: col, opacity: out ? 0.55 : 1 }));
        at[abs].forEach((p, idx) => {
          s.appendChild(S("text", { x, y: y + 20 + idx * 14, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: this.ptrColor[p.name], opacity: out ? 0.7 : 1 }, p.name + (out ? "=" + p.v : "")));
        });
      });
      const title = el("div", { class: "tv-arr-name" }, el("code", null, a.name), a.view ? el("span", { class: "muted small" }, ` view of the caller's array (cells ${Math.max(0, a.off)}–${a.off + a.len - 1})`) : el("span", { class: "muted small" }, ` length ${a.len}`));
      this.stageWrap.appendChild(el("div", { class: "tv-arr-row" }, title, el("div", { class: "tv-arr-scroll" }, s)));
    });
    grids.forEach((g) => {
      const t = el("table", { class: "t tv-grid-t" });
      const cols = Math.max(...g.rows.map((r) => r.length));
      t.appendChild(el("tr", null, el("th", null, ""), Array.from({ length: cols }, (_, c) => el("th", null, String(c)))));
      const tr = touchedR[g.name], tw = touchedW[g.name];
      g.rows.forEach((row, ri) => {
        const hot = (tr && tr.has(ri)) || (tw && tw.has(ri));
        t.appendChild(el("tr", { class: hot ? "hot" : null }, el("th", null, String(ri)), Array.from({ length: cols }, (_, c) => el("td", null, c < row.length ? cellText(row[c]) : ""))));
      });
      this.stageWrap.appendChild(el("div", { class: "tv-arr-row" }, el("div", { class: "tv-arr-name" }, el("code", null, g.name), el("span", { class: "muted small" }, ` ${g.rows.length} × ${cols} table`)), el("div", { class: "tv-arr-scroll" }, t)));
    });
  };

  TraceViewer.prototype.renderVars = function (f, prev, samePrev) {
    const names = Object.keys(f.vars);
    this.vars.innerHTML = "";
    if (!names.length) { this.vars.appendChild(el("div", { class: "muted small" }, "(no variables yet)")); return; }
    const t = el("table", { class: "vt" });
    names.forEach((n) => {
      const v = f.vars[n];
      const s = Arena.show(v);
      const was = samePrev ? prev.vars[n] : undefined;
      const changed = samePrev && (!(n in prev.vars) || JSON.stringify(was) !== JSON.stringify(v));
      t.appendChild(el("tr", { class: changed ? "chg" : null },
        el("th", { scope: "row" }, el("code", null, n)),
        el("td", null, el("code", { title: s }, s.length > 80 ? s.slice(0, 78) + "…" : s),
          changed && samePrev && n in prev.vars && isScalar(was) ? el("span", { class: "was" }, " was " + Arena.show(was)) : null)));
    });
    this.vars.appendChild(t);
  };

  TraceViewer.prototype.renderStack = function (f) {
    this.stack.innerHTML = "";
    const st = (f.stack || []).filter((x) => x !== "(main)");
    const list = el("ol", { class: "callstack", reversed: true });
    st.slice().reverse().forEach((fn, k) => list.appendChild(el("li", { class: k === 0 ? "top" : null }, el("code", null, fn), el("span", { class: "muted small" }, k === 0 ? " ← running" : ""))));
    if (!st.length) list.appendChild(el("li", { class: "top" }, el("code", null, f.fn)));
    this.stack.appendChild(list);
    if (st.length > 1) this.stack.appendChild(el("div", { class: "muted small" }, `${st.length} calls deep — recursion!`));
  };

  TraceViewer.prototype.renderCounters = function (i) {
    const c = this.cum[i], ops = this.result.ops || {};
    const f = this.frames[i];
    const cell = (k, v, t) => el("div", { class: "counter", title: t || "" }, el("div", { class: "k" }, k), el("div", { class: "v" }, String(v)));
    this.counters.innerHTML = "";
    this.counters.appendChild(el("div", { class: "counters" },
      cell("step", `${i + 1}`, "statements executed so far"),
      cell("array reads", c.reads, "cells read so far"),
      cell("array writes", c.writes, "cells written so far"),
      cell(`line ${f.line} ran`, `${c.lineHits}×`, "how many times this line has run so far")));
    const tot = ["keyComparisons", "comparisons", "assignments", "arithmetic", "swaps", "calls"].filter((k) => ops[k]).map((k) => Arena.metricText(k, ops[k]));
    if (tot.length) this.counters.appendChild(el("div", { class: "muted small tv-total" }, "Whole run: " + tot.join(" · ")));
  };

  TraceViewer.prototype.clear = function () {
    if (this.editor) this.editor.setTraceLine(null);
    if (this.player) this.player.pause();
  };

  Arena.TraceViewer = TraceViewer;
})();
