/* =====================================================================
   Algorithm Forge — sim extras (used by the Ch 6–7 simulations)
   ---------------------------------------------------------------------
   Small helpers that sit on top of forge-kit.js without changing it:

     FX.nums(str)                       -> numbers parsed from "3, 1 4"
     FX.predict(host, () => player)     -> 🤔 Predict panel driven by frame.ask
                                           ask = {q, opts:[...], ans: index, why}
     FX.codeSwitch(host)                -> several pseudocode listings, one visible
     FX.treeView(svg)                   -> draws node/edge scenes and tweens node
                                           positions between frames (by node id)
     FX.COL                             -> semantic state -> CSS color
   ===================================================================== */
(function () {
  "use strict";
  const FX = {};
  const E = (...a) => Forge.el(...a);
  const S = (...a) => Forge.svg(...a);

  FX.COL = {
    active: "var(--c-active)", done: "var(--c-done)", compare: "var(--c-compare)", swap: "var(--c-swap)",
    pivot: "var(--c-pivot)", dim: "var(--c-dim)", ember: "var(--ember)",
  };
  FX.ink = (s) => (s && s !== "dim" ? "#0d1117" : "var(--ink)");
  FX.nums = (s) => String(s).split(/[\s,;]+/).filter(Boolean).map(Number).filter((x) => Number.isFinite(x));
  FX.reduceMotion = (() => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } })();

  /* ---------- page-local styles shared by these sims ---------- */
  const css = `
  .fx-pq-opts{margin-top:8px}
  .fx-pq-opts .btn{min-width:44px}
  .fx-pq-opts .btn.right{background:color-mix(in srgb,var(--ok) 25%,transparent);border-color:var(--ok);opacity:1}
  .fx-pq-opts .btn.wrong{background:color-mix(in srgb,var(--bad) 22%,transparent);border-color:var(--bad);opacity:1}
  .fx-pq-res{margin-top:8px}
  .fx-godeeper{display:flex;flex-wrap:wrap;gap:8px}
  .fx-godeeper a{display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border:1px solid var(--line-2);border-radius:999px;background:var(--panel-2);font-weight:600;font-size:.85rem}
  .fx-godeeper a:hover{border-color:var(--ember);text-decoration:none}
  .fx-howto dt{font-weight:700;margin-top:6px}
  .fx-howto dd{margin:0 0 4px 0;color:var(--ink-2)}
  .fx-note{font-size:.85rem;color:var(--muted)}
  `;
  document.head.appendChild(E("style", { html: css }));

  /* ---------- 🤔 Predict panel ---------- */
  FX.predict = function (host, getPlayer) {
    const chk = E("input", { type: "checkbox", checked: true, "aria-label": "Pause at predictions" });
    const q = E("div", { class: "fx-pq-q" });
    const opts = E("div", { class: "row fx-pq-opts" });
    const res = E("div", { class: "fx-pq-res small" });
    host.append(E("div", { class: "panel-title" }, "🤔 Predict"), q, opts, res,
      E("label", { class: "small muted row", style: { marginTop: "8px", gap: "6px" } }, chk, "pause the animation at each question"));
    let answered = new Map();
    function idle() {
      q.innerHTML = '<span class="muted small">A question appears here just before a key moment. Guess first, then step forward (▶| or →) to check.</span>';
      opts.innerHTML = ""; res.innerHTML = "";
    }
    idle();
    function update(f, i) {
      const a = f && f.ask;
      if (!a) { idle(); return; }
      q.innerHTML = a.q;
      opts.innerHTML = ""; res.innerHTML = ""; // a new question never shows the previous answer
      const btns = a.opts.map((o, k) => E("button", { class: "btn sm", onclick: () => { answered.set(i, k); reveal(k); } }, String(o)));
      btns.forEach((b) => opts.appendChild(b));
      function reveal(k) {
        btns.forEach((b, j) => { b.disabled = true; if (j === a.ans) b.classList.add("right"); else if (j === k) b.classList.add("wrong"); });
        res.innerHTML = (k === a.ans ? '<b style="color:var(--ok)">Correct.</b> ' : '<b style="color:var(--bad)">Not quite.</b> ') +
          (a.why || "") + ' <span class="muted">Step forward to watch it happen.</span>';
      }
      if (answered.has(i)) reveal(answered.get(i));
      else if (chk.checked) { const p = getPlayer && getPlayer(); if (p) p.pause(); }
    }
    return { update, reset() { answered = new Map(); idle(); } };
  };

  /* ---------- several pseudocode listings, one shown at a time ---------- */
  FX.codeSwitch = function (host) {
    const boxes = {};
    let cur = null;
    return {
      show(key, lines) {
        if (!boxes[key]) {
          const wrap = E("div");
          host.appendChild(wrap);
          boxes[key] = { wrap, code: Forge.code(wrap, lines) };
        }
        if (cur !== key) {
          for (const k in boxes) boxes[k].wrap.style.display = k === key ? "" : "none";
          cur = key;
        }
        return boxes[key].code;
      },
      clear() { host.innerHTML = ""; for (const k in boxes) delete boxes[k]; cur = null; },
    };
  };

  /* ---------- tree / node-scene view with position tweening ----------
     scene = {
       W, H,
       nodes: [{id, x, y, label, state, r?          // circle
                | keys:[..], keyState:{k: state}, cw?, h?  // box with key cells
                note?, badge?, badgeState?, opacity?}],
       edges: [{from, to, slot?, state?}],         // slot: child pointer index for box parents
       under(g), over(g)                           // optional static drawing callbacks
     } */
  FX.treeView = function (svg) {
    let pos = {};          // id -> {x, y} currently shown
    let raf = null;
    const gUnder = S("g"), gE = S("g"), gN = S("g"), gOver = S("g");
    svg.innerHTML = "";
    svg.append(gUnder, gE, gN, gOver);

    function boxW(n) { return Math.max(1, n.keys.length) * (n.cw || 30); }
    function nodeH(n) { return n.keys ? (n.h || 28) : 2 * (n.r || 18); }

    function paint(scene, P) {
      gE.innerHTML = ""; gN.innerHTML = "";
      const byId = {};
      scene.nodes.forEach((n) => (byId[n.id] = n));
      (scene.edges || []).forEach((e) => {
        const a = byId[e.from], b = byId[e.to];
        if (!a || !b) return;
        const pa = P[a.id], pb = P[b.id];
        let x1 = pa.x, y1 = pa.y + nodeH(a) / 2;
        if (a.keys && e.slot != null) x1 = pa.x - boxW(a) / 2 + e.slot * (a.cw || 30);
        const x2 = pb.x, y2 = pb.y - nodeH(b) / 2;
        const st = {
          active: ["var(--steel)", 3.5, ""], done: ["var(--c-done)", 3, ""], swap: ["var(--c-swap)", 3, ""],
          compare: ["var(--c-compare)", 3, ""], dim: ["var(--line)", 1.5, "4 4"], pivot: ["var(--c-pivot)", 3, ""],
        }[e.state] || ["var(--line-2)", 2, ""];
        gE.appendChild(S("line", { x1, y1, x2, y2, stroke: st[0], "stroke-width": st[1], "stroke-dasharray": st[2] || null, "stroke-linecap": "round" }));
      });
      scene.nodes.forEach((n) => {
        const p = P[n.id];
        const g = S("g", { opacity: n.opacity != null ? n.opacity : 1 });
        const fill = FX.COL[n.state] || "var(--panel-2)";
        if (n.keys) {
          const w = boxW(n), h = nodeH(n), cw = n.cw || 30, x0 = p.x - w / 2, y0 = p.y - h / 2;
          g.appendChild(S("rect", { x: x0, y: y0, width: w, height: h, rx: 6, fill, stroke: n.state ? fill : "var(--line-2)", "stroke-width": 2 }));
          n.keys.forEach((k, i) => {
            const ks = n.keyState && n.keyState[i];
            if (ks) g.appendChild(S("rect", { x: x0 + i * cw + 2, y: y0 + 2, width: cw - 4, height: h - 4, rx: 4, fill: FX.COL[ks] }));
            if (i > 0) g.appendChild(S("line", { x1: x0 + i * cw, y1: y0 + 3, x2: x0 + i * cw, y2: y0 + h - 3, stroke: n.state ? "rgba(13,17,23,.35)" : "var(--line-2)" }));
            g.appendChild(S("text", { x: x0 + i * cw + cw / 2, y: p.y + 4.5, "text-anchor": "middle", "font-size": n.fs || 13, "font-weight": 700, fill: FX.ink(ks || n.state) }, String(k)));
          });
        } else {
          const r = n.r || 18;
          g.appendChild(S("circle", { cx: p.x, cy: p.y, r, fill, stroke: n.state ? fill : "var(--line-2)", "stroke-width": 2 }));
          g.appendChild(S("text", { x: p.x, y: p.y + 4.5, "text-anchor": "middle", "font-size": n.fs || 13, "font-weight": 700, fill: FX.ink(n.state) }, String(n.label)));
        }
        if (n.note != null) {
          g.appendChild(S("text", { x: p.x, y: p.y + nodeH(n) / 2 + 14, "text-anchor": "middle", "font-size": 11, fill: "var(--ember-2)" }, String(n.note)));
        }
        if (n.badge != null) {
          const bx = p.x + (n.keys ? boxW(n) / 2 : (n.r || 18)) + 2, by = p.y - nodeH(n) / 2 - 2;
          const bc = n.badgeState ? FX.COL[n.badgeState] : "var(--panel)";
          g.appendChild(S("rect", { x: bx - 12, y: by - 9, width: 24, height: 16, rx: 8, fill: bc, stroke: n.badgeState ? bc : "var(--line-2)" }));
          g.appendChild(S("text", { x: bx, y: by + 3, "text-anchor": "middle", "font-size": 10, "font-weight": 700, fill: n.badgeState ? "#0d1117" : "var(--ink-2)" }, String(n.badge)));
        }
        gN.appendChild(g);
      });
    }

    function draw(scene) {
      svg.setAttribute("viewBox", `0 0 ${scene.W} ${scene.H}`);
      gUnder.innerHTML = ""; gOver.innerHTML = "";
      if (scene.under) scene.under(gUnder);
      if (scene.over) scene.over(gOver);
      const target = {};
      scene.nodes.forEach((n) => (target[n.id] = { x: n.x, y: n.y }));
      if (raf) cancelAnimationFrame(raf);
      const from = {};
      for (const id in target) from[id] = pos[id] || target[id];
      const moving = Object.keys(target).some((id) => from[id].x !== target[id].x || from[id].y !== target[id].y);
      if (FX.reduceMotion || !moving || scene.instant) {
        pos = target; paint(scene, target); return;
      }
      const t0 = performance.now(), dur = 340;
      const step = (now) => {
        const t = Math.min(1, (now - t0) / dur), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const P = {};
        for (const id in target) P[id] = { x: from[id].x + (target[id].x - from[id].x) * e, y: from[id].y + (target[id].y - from[id].y) * e };
        pos = P;
        paint(scene, P);
        raf = t < 1 ? requestAnimationFrame(step) : null;
      };
      raf = requestAnimationFrame(step);
    }
    return { draw, reset() { pos = {}; } };
  };

  /** In-order x layout for a binary tree given as nested {id, left, right}. */
  FX.layoutBinary = function (root, W, top, gap, pad) {
    const out = {};
    const order = [];
    let maxD = 0;
    (function walk(t, d) {
      if (!t) return;
      walk(t.left, d + 1);
      order.push([t, d]);
      maxD = Math.max(maxD, d);
      walk(t.right, d + 1);
    })(root, 0);
    const n = order.length;
    const span = W - 2 * pad;
    const step = n > 1 ? Math.min(64, span / (n - 1)) : 0;
    order.forEach(([t, d], i) => {
      out[t.id] = { x: W / 2 + (i - (n - 1) / 2) * step, y: top + d * gap };
    });
    return { pos: out, depth: maxD, n };
  };

  /** Multiway (2-3 / B-tree) layout: leaves packed left to right, parents centered over children. */
  FX.layoutMulti = function (root, cw, gapX, top, gapY) {
    const out = {};
    let x = 0, maxD = 0;
    (function walk(t, d) {
      maxD = Math.max(maxD, d);
      const w = Math.max(1, t.keys.length) * cw;
      if (!t.kids || !t.kids.length) {
        out[t.id] = { x: x + w / 2, y: top + d * gapY, w };
        x += w + gapX;
        return;
      }
      t.kids.forEach((c) => walk(c, d + 1));
      const a = out[t.kids[0].id], b = out[t.kids[t.kids.length - 1].id];
      out[t.id] = { x: (a.x + b.x) / 2, y: top + d * gapY, w };
    })(root, 0);
    return { pos: out, width: Math.max(0, x - gapX), depth: maxD };
  };

  window.FX = FX;
})();
