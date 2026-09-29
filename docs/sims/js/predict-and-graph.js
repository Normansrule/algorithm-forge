/* =====================================================================
   Algorithm Forge — small shared helpers for the Ch 3–5 simulations
   (exhaustive-search, graph-traversal, topo-sort, combinatorics, nim,
   tree-traversals, karatsuba-strassen).  Loaded AFTER forge-kit.js.

     FX.predict(host)            -> "🤔 Predict" box: show(ask, key) / hide()
     FX.pt(svg, evt)             -> pointer position in viewBox coordinates
     FX.graphEditor(svg, opts)   -> click-to-edit graph (add / connect / drag / delete)
     FX.fmt(n)                   -> 1,234,567 or 2.43e18 for huge numbers
     FX.time(seconds)            -> "3.2 ms", "4.1 days", "7.7e3 years"
   ===================================================================== */
(function () {
  "use strict";
  const FX = {};
  const el = (...a) => Forge.el(...a);

  /* ---------- predict box ---------- */
  /**
   * ask = { q: html, options: [{label, value}], answer: value, why: html }
   * The box remembers answers per key, so scrubbing back shows your earlier result.
   */
  FX.predict = function (host) {
    const answered = new Map();
    const chk = el("input", { type: "checkbox", checked: true, id: "fx-pause-" + Math.random().toString(36).slice(2, 7) });
    const box = el("div", { class: "fx-predict" });
    host.appendChild(box);
    host.appendChild(el("label", { class: "small muted", for: chk.id, style: { display: "flex", gap: "6px", alignItems: "center", marginTop: "8px" } },
      chk, "Pause playback at prediction points"));
    let current = null;
    function draw(ask, key) {
      box.innerHTML = "";
      if (!ask) {
        box.appendChild(el("p", { class: "small muted", style: { margin: 0 } }, "When a 🤔 moment comes up, the question appears here. Guess first, then step forward to check."));
        return;
      }
      box.appendChild(el("p", { html: "<b>🤔 Predict:</b> " + ask.q, style: { margin: "0 0 8px" } }));
      const prev = answered.get(key);
      const row = el("div", { class: "row", style: { gap: "6px" } });
      ask.options.forEach((o) => {
        const isAns = String(o.value) === String(ask.answer);
        const b = el("button", { class: "btn sm", type: "button" }, o.label);
        if (prev !== undefined) {
          b.disabled = true;
          if (isAns) b.style.cssText = "border-color:var(--ok);color:var(--ok);opacity:1";
          else if (String(o.value) === String(prev)) b.style.cssText = "border-color:var(--bad);color:var(--bad);opacity:1";
        } else {
          b.onclick = () => { answered.set(key, o.value); draw(ask, key); };
        }
        row.appendChild(b);
      });
      box.appendChild(row);
      if (prev !== undefined) {
        const ok = String(prev) === String(ask.answer);
        box.appendChild(el("div", { class: "callout " + (ok ? "ok" : "bad"), style: { marginTop: "8px" }, html: (ok ? "<b>Yes!</b> " : "<b>Not quite.</b> ") + (ask.why || "") }));
      }
    }
    draw(null);
    return {
      show(ask, key) { current = key; draw(ask, key); },
      hide() { current = null; draw(null); },
      /** true when the player should stop on this frame */
      shouldPause(key) { return chk.checked && !answered.has(key); },
      reset() { answered.clear(); },
      get enabled() { return chk.checked; },
    };
  };

  /* ---------- geometry ---------- */
  FX.pt = function (svg, evt) {
    const p = svg.createSVGPoint();
    p.x = evt.clientX; p.y = evt.clientY;
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const q = p.matrixTransform(m.inverse());
    return { x: q.x, y: q.y };
  };
  function segDist(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy || 1;
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }

  /* ---------- editable graph ---------- */
  /**
   * opts = {
   *   graph: () => g,               // live {nodes:[{id,x,y}], edges:[{u,v}]}
   *   directed: bool,
   *   tool: () => "add" | "delete",
   *   onChange: () => void,         // structure changed -> re-record
   *   onMove: () => void,           // a node was dragged -> just redraw
   *   W, H, R, maxNodes
   * }
   * After every redraw call ed.decorate() so the selected vertex gets its ring.
   */
  FX.graphEditor = function (svg, opts) {
    const R = opts.R || 20;
    let sel = null, drag = null;
    svg.style.cursor = "crosshair";
    svg.style.touchAction = "manipulation";
    const hitNode = (p) => opts.graph().nodes.find((n) => Math.hypot(n.x - p.x, n.y - p.y) <= R + 4);
    const hitEdge = (p) => {
      const g = opts.graph(), pos = {};
      g.nodes.forEach((n) => (pos[n.id] = n));
      return g.edges.find((e) => pos[e.u] && pos[e.v] && segDist(p, pos[e.u], pos[e.v]) < 8);
    };
    function nextLabel() {
      const used = new Set(opts.graph().nodes.map((n) => n.id));
      for (let c = 97; c < 123; c++) { const s = String.fromCharCode(c); if (!used.has(s)) return s; }
      return null;
    }
    svg.addEventListener("pointerdown", (e) => {
      const p = FX.pt(svg, e), n = hitNode(p);
      if (n && opts.tool() !== "delete") { drag = { n, x0: p.x, y0: p.y, moved: false }; try { svg.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ } }
    });
    svg.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const p = FX.pt(svg, e);
      if (!drag.moved && Math.hypot(p.x - drag.x0, p.y - drag.y0) < 5) return;
      drag.moved = true;
      drag.n.x = Math.max(R + 2, Math.min((opts.W || 760) - R - 2, p.x));
      drag.n.y = Math.max(R + 2, Math.min((opts.H || 420) - R - 14, p.y));
      opts.onMove();
    });
    svg.addEventListener("pointerup", (e) => {
      const wasDrag = drag && drag.moved;
      drag = null;
      if (wasDrag) return;
      const p = FX.pt(svg, e), g = opts.graph(), n = hitNode(p);
      if (opts.tool() === "delete") {
        if (n) {
          g.nodes = g.nodes.filter((x) => x !== n);
          g.edges = g.edges.filter((ed) => ed.u !== n.id && ed.v !== n.id);
          sel = null; opts.onChange(); return;
        }
        const ed = hitEdge(p);
        if (ed) { g.edges = g.edges.filter((x) => x !== ed); opts.onChange(); }
        return;
      }
      if (n) {
        if (sel && sel !== n.id) {
          const same = (ed) => (ed.u === sel && ed.v === n.id) || (!opts.directed && ed.u === n.id && ed.v === sel);
          const ex = g.edges.find(same);
          if (ex) g.edges = g.edges.filter((x) => x !== ex);
          else {
            if (opts.directed) g.edges = g.edges.filter((x) => !(x.u === n.id && x.v === sel)); // no 2-cycles by accident: replace reverse
            g.edges.push({ u: sel, v: n.id, directed: !!opts.directed });
          }
          sel = null; opts.onChange(); return;
        }
        sel = sel === n.id ? null : n.id;
        opts.onMove();
        return;
      }
      if (hitEdge(p)) return;
      if (sel) { sel = null; opts.onMove(); return; }
      if (g.nodes.length >= (opts.maxNodes || 16)) return;
      const id = nextLabel();
      if (!id) return;
      g.nodes.push({ id, x: Math.round(p.x), y: Math.round(p.y) });
      opts.onChange();
    });
    return {
      decorate() {
        if (!sel) return;
        const n = opts.graph().nodes.find((x) => x.id === sel);
        if (!n) { sel = null; return; }
        svg.appendChild(Forge.svg("circle", { cx: n.x, cy: n.y, r: R + 6, fill: "none", stroke: "var(--ember)", "stroke-width": 3, "stroke-dasharray": "5 4" }));
      },
      clearSelection() { sel = null; },
      get selected() { return sel; },
    };
  };

  /* ---------- number formatting ---------- */
  FX.fmt = function (x) {
    if (typeof x === "bigint") x = Number(x);
    if (!isFinite(x)) return "∞";
    if (Math.abs(x) < 1e15) return Math.round(x).toLocaleString("en-US");
    const e = Math.floor(Math.log10(x));
    return (x / Math.pow(10, e)).toFixed(2) + "×10" + String(e).split("").map((d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[+d] || "⁻").join("");
  };
  /** compact: 12,345 below a million, else 6.54×10⁸ */
  FX.short = function (x) {
    if (typeof x === "bigint") x = Number(x);
    if (!isFinite(x)) return "∞";
    if (Math.abs(x) < 1e6) return Math.round(x).toLocaleString("en-US");
    const e = Math.floor(Math.log10(Math.abs(x)));
    return (x / Math.pow(10, e)).toFixed(2) + "×10" + String(e).split("").map((d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[+d]).join("");
  };
  FX.time = function (s) {
    if (s < 1e-6) return (s * 1e9).toFixed(s * 1e9 < 10 ? 1 : 0) + " ns";
    if (s < 1e-3) return (s * 1e6).toFixed(s * 1e6 < 10 ? 1 : 0) + " µs";
    if (s < 1) return (s * 1e3).toFixed(s * 1e3 < 10 ? 1 : 0) + " ms";
    if (s < 60) return s.toFixed(s < 10 ? 1 : 0) + " s";
    if (s < 3600) return (s / 60).toFixed(1) + " min";
    if (s < 86400) return (s / 3600).toFixed(1) + " hours";
    if (s < 86400 * 365.25) return (s / 86400).toFixed(1) + " days";
    const y = s / (86400 * 365.25);
    if (y < 1e4) return y.toFixed(y < 10 ? 1 : 0) + " years";
    return FX.fmt(y) + " years";
  };

  /* ---------- tiny style additions used by these sims ---------- */
  const css = `
  .counter .v { overflow-wrap: anywhere; }
  .wrap select, .wrap label.field { max-width: 100%; }
  .fx-predict .btn.sm { min-width: 38px; }
  .fx-seg { display: inline-flex; border: 1px solid var(--line-2); border-radius: 9px; overflow: hidden; flex-wrap: wrap; }
  .fx-seg button { background: var(--panel-2); color: var(--ink-2); border: 0; border-right: 1px solid var(--line-2); padding: 7px 12px; font: 600 .85rem var(--font); cursor: pointer; }
  .fx-seg button:last-child { border-right: 0; }
  .fx-seg button.on { background: var(--ember); color: #1b0f05; }
  .fx-links { display: flex; flex-wrap: wrap; gap: 8px; }
  .fx-links a { display: inline-flex; padding: 6px 12px; border: 1px solid var(--line-2); border-radius: 999px; background: var(--panel-2); font-weight: 600; font-size: .86rem; }
  .fx-links a:hover { border-color: var(--ember); text-decoration: none; }
  .fx-note { font-size: .82rem; color: var(--muted); }
  .fx-chips { display: flex; flex-wrap: wrap; gap: 6px; font-family: var(--mono); font-size: .85rem; }
  .fx-chips span { padding: 2px 8px; border-radius: 7px; background: var(--bg-2); border: 1px solid var(--line); }
  .fx-chips span.on { border-color: var(--ember); background: var(--ember-soft); color: var(--ink); font-weight: 700; }
  .fx-chips span.done { border-color: var(--c-done); color: var(--c-done); }
  .fx-chips span.dim { opacity: .45; }
  .fx-chips span.bad { border-color: var(--bad); color: var(--bad); }
  `;
  document.head.appendChild(el("style", null, css));

  window.FX = FX;
})();
