/* Algorithm Forge — Modern MST (UI). Algorithms live in mst-modern-core.js. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const E = Forge.el, S = Forge.svg, MC = window.MstCore;
  Forge.page({ title: "Modern MST", chapter: "Ch 18 · The Frontier" });

  const W = 760, GH = 460, STRIP = 74;
  const NAMES = { kruskal: "Kruskal", prim: "Prim", boruvka: "Borůvka", filter: "Filter-Kruskal" };
  const ORDER = ["kruskal", "prim", "boruvka", "filter"];
  const PRESETS = {
    lev: { pos: { a: [120, 230], b: [290, 90], c: [520, 90], d: [660, 230], e: [290, 380], f: [440, 230] }, edges: "a-b 3, a-e 6, a-f 5, b-c 1, b-f 4, c-f 4, c-d 6, d-f 5, d-e 8, e-f 2" },
    ties: { pos: { a: [110, 140], b: [300, 70], c: [280, 300], d: [470, 250], e: [650, 120], f: [640, 380] }, edges: "a-b 1, b-c 1, c-a 1, c-d 1, d-e 1, e-f 1, f-d 1, b-e 1" },
  };
  const CTR0 = {
    kruskal: { "edges sorted": 0, "sort comparisons": 0, "Find calls": 0, "edges examined": 0, "tree edges": 0, "tree weight": 0 },
    prim: { "heap pushes": 0, "heap pops": 0, "stale pops": 0, "heap size": 0, "tree edges": 0, "tree weight": 0 },
    boruvka: { round: 0, "round bound ⌈log₂ n⌉": 0, components: 0, "edge inspections": 0, "tree edges": 0, "tree weight": 0 },
    filter: { "edges sorted": 0, "sorted edges saved": 0, comparisons: 0, "edges filtered": 0, "Find calls": 0, "tree weight": 0 },
  };
  const LEG = {
    common: [["var(--ember)", "tree edge"], ["var(--c-active)", "edge being considered / chosen"], ["var(--c-swap)", "rejected: would close a cycle"]],
    kruskal: [["linear-gradient(90deg,hsl(20 75% 60%),hsl(140 60% 50%),hsl(260 70% 65%))", "vertex colour = its component"], ["var(--c-bar)", "strip: not yet examined (orange = kept)"], ["var(--c-dim)", "strip: skipped"]],
    prim: [["var(--c-done)", "vertex in the tree"], ["var(--c-compare)", "edge waiting in the heap"]],
    boruvka: [["linear-gradient(90deg,hsl(20 75% 60%),hsl(140 60% 50%),hsl(260 70% 65%))", "vertex colour = its component"], ["var(--c-done)", "picked edge added this round"], ["var(--ink-2)", "contraction: one super-vertex per component (size inside)"]],
    filter: [["linear-gradient(90deg,hsl(20 75% 60%),hsl(140 60% 50%),hsl(260 70% 65%))", "vertex colour = its component"], ["var(--c-pivot)", "pivot / E> (light purple)"], ["color-mix(in srgb, var(--steel) 50%, transparent)", "E≤"], ["var(--c-compare)", "sorted in a base case"], ["var(--c-dim)", "filtered out, never sorted"]],
  };

  const st = { alg: "boruvka", g: null, rec: null, sel: null };
  const stage = $("stage");
  const codeSw = FX.codeSwitch($("code"));
  let code = null, ctr = null;
  const say = Forge.narrate($("say"));
  const predict = FX.predict($("predictHost"), () => player);

  /* ---------------- graph state ---------------- */
  function genRandom() {
    st.g = MC.randomGraph(+$("n").value, +$("seed").value || 1, $("wmode").value, W, GH, +$("deg").value);
    $("preset").value = "";
    syncText();
  }
  function syncText() {
    $("edges").value = MC.edgesToText(st.g);
    $("nOut").textContent = st.g.names.length;
    if (st.g.edges.length > 90 && $("showW").checked && !st.userW) $("showW").checked = false;
    if (st.g.edges.length <= 90 && !st.userW) $("showW").checked = true;
  }
  function loadPreset(k) {
    const p = PRESETS[k];
    const r = MC.parseEdges(p.edges, null, W, GH);
    r.g.pos = r.g.names.map((nm) => p.pos[nm].slice());
    st.g = r.g;
    syncText();
  }
  function loadText() {
    const r = MC.parseEdges($("edges").value, st.g, W, GH);
    if (!r.g.names.length) { $("msg").textContent = "Type some edges, like a-b 3, b-c 1."; return false; }
    if (r.g.names.length > 60) { $("msg").textContent = "At most 60 vertices, please."; return false; }
    st.g = r.g;
    $("msg").textContent = r.errs.length ? `Ignored ${r.errs.slice(0, 4).join(", ")}${r.errs.length > 4 ? "…" : ""}. Write each edge as u-v weight.` : "";
    $("nOut").textContent = st.g.names.length;
    return true;
  }

  /* ---------------- record ---------------- */
  const runOpts = () => ({ threshold: +$("th").value, seed: +$("seed").value || 1 });
  function record(alg) {
    const g = st.g;
    if (alg === "kruskal") return MC.recKruskal(g);
    if (alg === "prim") return MC.recPrim(g);
    if (alg === "boruvka") return MC.recBoruvka(g);
    return MC.recFilter(g, runOpts());
  }

  /* ---------------- render ---------------- */
  const hue = (rep) => (rep * 137.508) % 360;
  function compColor(comp) {
    const size = {};
    comp.forEach((c) => (size[c] = (size[c] || 0) + 1));
    return (v) => (size[comp[v]] > 1 ? `hsl(${hue(comp[v]).toFixed(0)} 72% 62%)` : null);
  }
  function render(f, i) {
    const g = st.g, P = g.pos, Ed = g.edges, n = g.names.length, alg = st.alg;
    const hasStrip = !!f.strip;
    const H = GH + (hasStrip ? STRIP : 0);
    stage.setAttribute("viewBox", `0 0 ${W} ${H}`);
    stage.innerHTML = "";
    const gE = S("g"), gA = S("g"), gL = S("g"), gN = S("g"), gO = S("g");
    stage.append(gE, gA, gL, gN, gO);
    const R = n <= 12 ? 16 : n <= 30 ? 12 : 9;
    const tree = new Set(f.tree || []);
    const est = f.est || {};
    const heap = new Set(f.heap || []);
    const stripSt = f.strip ? f.strip.st : {};
    const segSet = new Set();
    if (f.strip && f.seg && alg === "filter") for (let k = f.seg[0]; k < f.seg[1]; k++) segSet.add(f.strip.order[k]);
    const showW = $("showW").checked;
    const contract = f.contract;
    const fade = contract ? 0.22 : 1;

    Ed.forEach((e, id) => {
      const a = P[e.u], b = P[e.v];
      let col = "var(--line-2)", w = 1.6, dash = null, op = 1;
      if (alg === "boruvka" && f.live && !tree.has(id) && !f.live.includes(id) && !f.final) { col = "var(--c-dim)"; dash = "3 4"; w = 1.2; }
      if (alg === "prim" && heap.has(id) && !tree.has(id)) { col = "var(--c-compare)"; w = 2.4; }
      if (alg === "filter") {
        const s = stripSt[id];
        if (s === "filt" || s === "dim") { col = "var(--c-dim)"; dash = "3 4"; w = 1.2; }
        else if (segSet.has(id)) { w = 2.4; col = s === "gt" ? "var(--c-pivot)" : s === "le" ? "var(--steel)" : "var(--line-2)"; op = s === "gt" || s === "le" ? 0.6 : 1; }
      }
      if (alg === "kruskal" && stripSt[id] === "dim") { col = "var(--c-dim)"; dash = "3 4"; w = 1.2; }
      if (tree.has(id)) { col = "var(--ember)"; w = 4.2; dash = null; op = 1; }
      const s = est[id];
      if (s === "active") { col = "var(--c-active)"; w = 4.6; dash = null; op = 1; }
      else if (s === "done") { col = "var(--c-done)"; w = 4.6; dash = null; op = 1; }
      else if (s === "swap") { col = "var(--c-swap)"; w = 3.2; dash = "7 5"; op = 1; }
      else if (s === "pivot") { col = "var(--c-pivot)"; w = 4.2; dash = null; op = 1; }
      else if (s === "dim") { col = "var(--c-dim)"; w = 2; dash = "3 4"; }
      gE.appendChild(S("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: col, "stroke-width": w, "stroke-dasharray": dash, "stroke-linecap": "round", opacity: op * fade }));
      if (showW && !contract) {
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, txt = String(e.w), bw = 7 + txt.length * 6.5;
        gL.appendChild(S("rect", { x: mx - bw / 2, y: my - 8, width: bw, height: 15, rx: 4, fill: "var(--panel)", stroke: s || tree.has(id) ? col : "var(--line)", opacity: 0.92 }));
        gL.appendChild(S("text", { x: mx, y: my + 3.5, "text-anchor": "middle", "font-size": 10, "font-weight": 700, fill: "var(--ink-2)" }, txt));
      }
    });
    // Borůvka arrows: from the choosing component's vertex toward the edge
    (f.arrows || []).forEach((ar) => {
      const e = Ed[ar.id], from = P[ar.from], to = P[ar.from === e.u ? e.v : e.u];
      const dx = to[0] - from[0], dy = to[1] - from[1], L = Math.hypot(dx, dy) || 1;
      const sx = from[0] + (dx / L) * (R + 3), sy = from[1] + (dy / L) * (R + 3), len = Math.min(L * 0.3, 26);
      const ex = sx + (dx / L) * len, ey = sy + (dy / L) * len;
      gA.appendChild(S("line", { x1: sx, y1: sy, x2: ex, y2: ey, stroke: "var(--c-active)", "stroke-width": 3, "marker-end": "url(#mstArr)" }));
    });
    // vertices
    const cc = f.comp ? compColor(f.comp) : () => null;
    g.names.forEach((nm, v) => {
      let fill = "var(--panel-2)", stroke = "var(--line-2)", tcol = "var(--ink)";
      const c = cc(v);
      if (c && alg !== "prim") { fill = c; stroke = c; tcol = "#0d1117"; }
      if (alg === "prim" && f.inT && f.inT[v]) { fill = "var(--c-done)"; stroke = fill; tcol = "#0d1117"; }
      if (f.cur === v) { stroke = "var(--c-active)"; }
      if (st.sel === v) { stroke = "var(--ember)"; }
      const gg = S("g", { opacity: fade });
      gg.appendChild(S("circle", { cx: P[v][0], cy: P[v][1], r: R, fill, stroke, "stroke-width": f.cur === v || st.sel === v ? 4 : 2 }));
      gg.appendChild(S("text", { x: P[v][0], y: P[v][1] + (R >= 12 ? 4.5 : 3), "text-anchor": "middle", "font-size": R >= 16 ? 13 : R >= 12 ? 11 : 8.5, "font-weight": 700, fill: tcol }, nm));
      gN.appendChild(gg);
    });
    // contraction view
    if (contract) {
      const cen = {};
      contract.groups.forEach((gr) => {
        const x = gr.members.reduce((s, v) => s + P[v][0], 0) / gr.members.length, y = gr.members.reduce((s, v) => s + P[v][1], 0) / gr.members.length;
        cen[gr.rep] = [x, y, gr.members.length];
      });
      const comp = f.comp;
      contract.keep.forEach((id) => {
        const e = Ed[id], a = cen[comp[e.u]], b = cen[comp[e.v]];
        gO.appendChild(S("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: "var(--ink-2)", "stroke-width": 2.6 }));
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, t = String(e.w), bw = 8 + t.length * 7;
        gO.appendChild(S("rect", { x: mx - bw / 2, y: my - 9, width: bw, height: 17, rx: 5, fill: "var(--panel)", stroke: "var(--ink-2)" }));
        gO.appendChild(S("text", { x: mx, y: my + 4, "text-anchor": "middle", "font-size": 11, "font-weight": 700, fill: "var(--ink)" }, t));
      });
      Object.keys(cen).forEach((rep) => {
        const [x, y, sz] = cen[rep], rr = 11 + 4 * Math.sqrt(sz), col = sz > 1 ? `hsl(${hue(+rep).toFixed(0)} 72% 62%)` : "var(--panel-2)";
        gO.appendChild(S("circle", { cx: x, cy: y, r: rr, fill: col, stroke: "var(--ink-2)", "stroke-width": 2, opacity: 0.95 }));
        gO.appendChild(S("text", { x, y: y + 4.5, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: sz > 1 ? "#0d1117" : "var(--ink)" }, String(sz)));
      });
      gO.appendChild(S("text", { x: W - 10, y: 18, "text-anchor": "end", "font-size": 13, "font-weight": 700, fill: "var(--muted)" }, `contracted: ${contract.groups.length} super-vertices, ${contract.keep.length} edges`));
    }
    if (f.round && !contract) gO.appendChild(S("text", { x: W - 10, y: 18, "text-anchor": "end", "font-size": 13, "font-weight": 700, fill: "var(--muted)" }, `round ${f.round}`));
    stage.appendChild(S("defs", null, S("marker", { id: "mstArr", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" }, S("path", { d: "M0 0 L10 5 L0 10 z", fill: "var(--c-active)" }))));
    // strip
    if (hasStrip) {
      const ord = f.strip.order, m = ord.length, x0 = 10, cw = (W - 20) / Math.max(1, m), y0 = GH + 22;
      stage.appendChild(S("text", { x: x0, y: GH + 14, "font-size": 11, "font-weight": 700, fill: "var(--muted)" }, alg === "kruskal" ? "edges in sorted order" : "edge array (segments are partitioned in place)"));
      const COLS = { active: "var(--c-active)", done: "var(--ember)", dim: "var(--c-dim)", pivot: "var(--c-pivot)", sorted: "var(--c-compare)", filt: "var(--c-dim)" };
      ord.forEach((id, k) => {
        const s = f.est && f.est[id] === "active" ? "active" : stripSt[id];
        let fill = COLS[s] || "var(--c-bar)", op = 1;
        if (s === "le") { fill = "var(--steel)"; op = 0.5; }
        if (s === "gt") { fill = "var(--c-pivot)"; op = 0.45; }
        if (f.est && f.est[id] === "pivot") { fill = "var(--c-pivot)"; op = 1; }
        stage.appendChild(S("rect", { x: x0 + k * cw + (cw > 4 ? 0.6 : 0), y: y0, width: Math.max(0.8, cw - (cw > 4 ? 1.2 : 0)), height: 26, rx: cw > 6 ? 2 : 0, fill, opacity: op }));
        if (cw >= 15) stage.appendChild(S("text", { x: x0 + k * cw + cw / 2, y: y0 + 17, "text-anchor": "middle", "font-size": Math.min(11, cw * 0.55), "font-weight": 700, fill: "#0d1117" }, String(Ed[id].w)));
      });
      if (f.seg && alg === "filter") {
        stage.appendChild(S("rect", { x: x0 + f.seg[0] * cw - 1.5, y: y0 - 4, width: Math.max(3, (f.seg[1] - f.seg[0]) * cw + 3), height: 34, rx: 4, fill: "none", stroke: "var(--ember)", "stroke-width": 2.5 }));
        if (f.split != null) stage.appendChild(S("line", { x1: x0 + f.split * cw, y1: y0 - 6, x2: x0 + f.split * cw, y2: y0 + 32, stroke: "var(--ink)", "stroke-width": 2 }));
      }
    }
    // panels
    code.highlight(f.line);
    say.say(f.text);
    const c = f.c, tw = (f.tree || []).reduce((s, id) => s + Ed[id].w, 0), te = (f.tree || []).length;
    if (alg === "kruskal") ctr.set({ "edges sorted": c.sorted, "sort comparisons": c.sortCmp, "Find calls": c.find, "edges examined": c.examined, "tree edges": te, "tree weight": tw });
    else if (alg === "prim") ctr.set({ "heap pushes": c.push, "heap pops": c.pop, "stale pops": c.stale, "heap size": (f.heap || []).length, "tree edges": te, "tree weight": tw });
    else if (alg === "boruvka") ctr.set({ round: c.round, "round bound ⌈log₂ n⌉": Math.ceil(Math.log2(Math.max(2, n))), components: c.comps, "edge inspections": c.insp, "tree edges": te, "tree weight": tw });
    else ctr.set({ "edges sorted": c.sorted, "sorted edges saved": f.final ? c.saved : "–", comparisons: c.cmp, "edges filtered": c.filtered, "Find calls": c.find, "tree weight": tw });
    predict.update(f, i);
    document.querySelectorAll("#sum tr[data-k]").forEach((tr) => tr.classList.toggle("cur", tr.dataset.k === alg));
  }

  /* ---------------- summary ---------------- */
  function summary() {
    const g = st.g, m = g.edges.length;
    const res = { kruskal: MC.recKruskal(g, { maxFrames: 1 }).result, prim: MC.recPrim(g, { maxFrames: 1 }).result, boruvka: MC.recBoruvka(g, { maxFrames: 1 }).result, filter: MC.recFilter(g, Object.assign(runOpts(), { maxFrames: 1 })).result };
    const ref = JSON.stringify(res.kruskal.tree);
    const tb = $("sum"); tb.innerHTML = "";
    tb.appendChild(E("tr", null, ["Algorithm", "Tree weight", "Edges", "Same edges as Kruskal", "Main cost on this graph"].map((h) => E("th", null, h))));
    const cost = {
      kruskal: `sorted all ${m} edges (${res.kruskal.sortCmp} comparisons), ${res.kruskal.finds} Finds`,
      prim: `${res.prim.pushes} heap pushes, ${res.prim.pops} pops (${res.prim.stale} stale)`,
      boruvka: `${res.boruvka.rounds} round${res.boruvka.rounds === 1 ? "" : "s"} (bound ${res.boruvka.bound}), ${res.boruvka.inspections} edge inspections`,
      filter: `sorted ${res.filter.sorted} of ${m} edges (${res.filter.saved} saved), ${res.filter.cmp} comparisons`,
    };
    ORDER.forEach((k) => {
      const same = JSON.stringify(res[k].tree) === ref;
      tb.appendChild(E("tr", { "data-k": k, class: k === st.alg ? "cur" : "" },
        E("td", null, E("button", { class: "linkish", onclick: () => pick(k) }, NAMES[k])),
        E("td", null, String(res[k].weight)), E("td", null, String(res[k].tree.length)),
        E("td", { class: same ? "ok" : "bad" }, same ? "✓ identical" : "✗ different"),
        E("td", { class: "muted" }, cost[k])));
    });
  }

  /* ---------------- wiring ---------------- */
  function setupPanels() {
    codeSw.clear();
    code = codeSw.show(st.alg, MC.SPEC[st.alg].map((l) => l.replace(/^@\w+\|/, "")));
    $("ctr").innerHTML = "";
    ctr = Forge.counters($("ctr"), CTR0[st.alg]);
    const lg = $("legend"); lg.innerHTML = "";
    LEG.common.concat(LEG[st.alg]).forEach(([c, t]) => lg.appendChild(E("span", null, E("i", { style: "background:" + c }), t)));
    $("optFilter").hidden = st.alg !== "filter";
    document.querySelectorAll(".modes .btn").forEach((b) => { b.classList.toggle("on", b.dataset.alg === st.alg); b.setAttribute("aria-selected", String(b.dataset.alg === st.alg)); });
  }
  const player = Forge.player($("player"), { frames: [], render });
  function reload() {
    setupPanels();
    predict.reset();
    st.rec = record(st.alg);
    player.load(st.rec.frames);
    summary();
    $("lemmaOut").textContent = "";
  }
  function pick(k) { st.alg = k; reload(); }
  document.querySelectorAll(".modes .btn").forEach((b) => (b.onclick = () => pick(b.dataset.alg)));
  $("n").oninput = () => ($("nOut").textContent = $("n").value);
  $("n").onchange = () => { genRandom(); reload(); };
  ["deg", "wmode", "seed"].forEach((id) => ($(id).onchange = () => { genRandom(); reload(); }));
  $("rand").onclick = () => { $("seed").value = (+$("seed").value || 0) + 1; genRandom(); reload(); };
  $("preset").onchange = () => { if ($("preset").value) { loadPreset($("preset").value); $("msg").textContent = ""; reload(); } };
  $("th").oninput = () => ($("thOut").textContent = $("th").value);
  $("th").onchange = reload;
  $("showW").onchange = () => { st.userW = true; player.go(player.index); };
  $("load").onclick = () => { if (loadText()) { $("preset").value = ""; reload(); } };
  $("edges").addEventListener("keydown", (e) => { if (e.key === "Enter") $("load").click(); });
  $("edit").onchange = () => { stage.classList.toggle("editing", $("edit").checked); st.sel = null; player.go(player.index); };

  function svgPoint(evt) {
    const pt = stage.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
    const mtx = stage.getScreenCTM(); if (!mtx) return null;
    const r = pt.matrixTransform(mtx.inverse());
    return [r.x, r.y];
  }
  function nextName() {
    const g = st.g, letters = g.names.length && g.names.every((x) => /^[a-z]$/.test(x));
    if (letters) { for (let c = 97; c <= 122; c++) { const s = String.fromCharCode(c); if (!g.names.includes(s)) return s; } }
    let k = 0; while (g.names.includes(String(k))) k++;
    return String(k);
  }
  stage.addEventListener("click", (e) => {
    if (!$("edit").checked) return;
    const p = svgPoint(e); if (!p || p[1] > GH) return;
    const g = st.g, R = g.names.length <= 12 ? 16 : g.names.length <= 30 ? 12 : 9;
    let hit = -1, bd = 1e9;
    g.pos.forEach((q, v) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < R + 8 && d < bd) { bd = d; hit = v; } });
    if (hit < 0) {
      if (g.names.length >= 60) { $("msg").textContent = "60 vertices is the limit."; return; }
      g.names.push(nextName()); g.pos.push([Math.round(Math.max(20, Math.min(W - 20, p[0]))), Math.round(Math.max(20, Math.min(GH - 20, p[1])))]);
      st.sel = null;
      $("msg").textContent = `Added vertex ${g.names[g.names.length - 1]}. Click two vertices to connect them.`;
    } else if (st.sel == null) { st.sel = hit; $("msg").textContent = `Selected ${g.names[hit]}: now click another vertex.`; player.go(player.index); return; }
    else if (st.sel === hit) { st.sel = null; $("msg").textContent = ""; player.go(player.index); return; }
    else {
      const a = st.sel, b = hit, k = g.edges.findIndex((x) => (x.u === a && x.v === b) || (x.u === b && x.v === a));
      if (k >= 0) { g.edges.splice(k, 1); $("msg").textContent = `Removed edge ${g.names[a]}–${g.names[b]}. Edge indices after it shift down by one.`; }
      else { const w = Math.max(1, Math.min(999, Math.round(+$("ew").value) || 1)); g.edges.push({ u: a, v: b, w }); $("msg").textContent = `Added edge ${g.names[a]}–${g.names[b]} with weight ${w} (index #${g.edges.length - 1}).`; }
      st.sel = null;
    }
    // drop isolated vertices? keep them: they become one-vertex trees of the spanning forest
    $("preset").value = "";
    syncText();
    reload();
  });

  /* ---------------- sampling lemma ---------------- */
  $("lemmaGo").onclick = () => {
    const r = MC.samplingLemma(st.g, 200, (+$("seed").value || 1) + 17);
    $("lemmaOut").innerHTML = `n = ${r.n}, m = ${r.m}. On average the sample had ${r.avgSample.toFixed(1)} edges and F had ${r.avgF.toFixed(1)}; <b>${r.avgLight.toFixed(1)}</b> edges of the whole graph were F-light (bound n/p = 2n = ${r.bound}). All the others, ${(r.m - r.avgLight).toFixed(1)} on average, are F-heavy and can be discarded.`;
  };

  /* ---------------- boot ---------------- */
  const q = new URLSearchParams(location.search);
  if (MC.SPEC[q.get("alg")]) st.alg = q.get("alg");
  genRandom();
  reload();
})();
