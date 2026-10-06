/* Algorithm Forge — Shortest paths, from Dijkstra to the 2025 frontier (UI). Engines: shortest-path-frontier-core.js */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const E = Forge.el, S = Forge.svg, SP = window.SPCore, INF = Infinity;
  Forge.page({ title: "Shortest Paths: Dijkstra to the 2025 Frontier", chapter: "Ch 18 · The Frontier" });

  const LINES = {
    bf: [
      "ALGORITHM BellmanFord(G[0..n-1], s)",
      "    for each vertex v do d[v] ← ∞",
      "    d[s] ← 0",
      "    for round ← 1 to n - 1 do",
      "        changed ← false",
      "        for each edge (u, v) with weight w do",
      "            if d[u] + w < d[v] then",
      "                d[v] ← d[u] + w; changed ← true",
      "        if not changed then break   // a quiet round",
      "    return d",
    ],
    dij: [
      "ALGORITHM Dijkstra(G[0..n-1], s)",
      "    for each vertex v do d[v] ← ∞",
      "    d[s] ← 0; H ← min-heap holding s",
      "    while not isEmpty(H) do",
      "        u ← deleteMin(H)       // settled",
      "        for each edge (u, v) with weight w do",
      "            if d[u] + w < d[v] then",
      "                d[v] ← d[u] + w",
      "                if v is not in H then insert(H, v)",
      "                else",
      "                    decreaseKey(H, v)",
      "    return d",
    ],
    dial: [
      "ALGORITHM Dial(G[0..n-1], s)   // weights 1..C",
      "    for each vertex v do d[v] ← ∞",
      "    d[s] ← 0; put s in bucket[0]; i ← 0",
      "    while some bucket is non-empty do",
      "        while bucket[i mod (C + 1)] is empty do i ← i + 1",
      "        u ← take a vertex from bucket[i mod (C + 1)]",
      "        for each edge (u, v) with weight w do",
      "            if d[u] + w < d[v] then",
      "                if d[v] ≠ ∞ then remove v from its bucket",
      "                d[v] ← d[u] + w",
      "                put v in bucket[d[v] mod (C + 1)]",
      "    return d",
    ],
    delta: [
      "ALGORITHM DeltaStepping(G[0..n-1], s, Δ)",
      "    for each vertex v do d[v] ← ∞",
      "    Relax(s, 0)",
      "    while some bucket is non-empty do",
      "        i ← index of the first non-empty bucket; R ← ∅",
      "        while bucket[i] is non-empty do          // one phase",
      "            Req ← light edges out of bucket[i]",
      "            R ← R ∪ bucket[i]; bucket[i] ← ∅",
      "            for each (u, v) in Req do Relax(v, d[u] + w)",
      "            // some may fall back into bucket[i]",
      "        for each u in R and heavy edge (u, v) do",
      "            Relax(v, d[u] + w)",
      "    return d",
      "",
      "ALGORITHM Relax(v, x)",
      "    if x < d[v] then",
      "        move v to bucket[⌊x / Δ⌋]; d[v] ← x",
    ],
    piv: [
      "ALGORITHM FindPivots(B, S)   // Duan et al. 2025",
      "    W ← S; W₀ ← S",
      "    // S: frontier; unfinished vertices below B are reached via S",
      "    for i ← 1 to k do                 // k rounds, no sorting",
      "        Wᵢ ← ∅",
      "        for each edge (u, v) with u in Wᵢ₋₁ do",
      "            if d̂[u] + w ≤ d̂[v] then     // ≤ on purpose",
      "                d̂[v] ← d̂[u] + w",
      "                if d̂[u] + w < B then Wᵢ ← Wᵢ ∪ {v}",
      "        W ← W ∪ Wᵢ",
      "        if |W| > k · |S| then",
      "            return P ← S, W     // grew fast",
      "    F ← tight edges (u, v) inside W: d̂[v] = d̂[u] + w",
      "    P ← roots u in S of trees in F with ≥ k vertices",
      "    return P, W",
    ],
  };
  const CTR0 = {
    bf: { rounds: 0, "edge checks": 0, updates: 0 },
    dij: { "delete-min": 0, insert: 0, "decrease-key": 0, "heap comparisons": 0, relaxations: 0 },
    dial: { "buckets scanned": 0, "bucket inserts": 0, "bucket moves": 0, relaxations: 0 },
    delta: { buckets: 0, phases: 0, "light relax": 0, "heavy relax": 0, "re-insertions": 0, "empty buckets": 0 },
    piv: { "|S| (frontier)": 0, rounds: 0, relaxations: 0, "|W|": 0, "k·|S|": 0, "|P| (pivots)": "?" },
  };
  const NAMES = { bf: "Bellman–Ford", dij: "Dijkstra (binary heap)", dial: "Dial's buckets", delta: "Δ-stepping" };
  const COL = { 0: "var(--panel-2)", 1: "var(--c-active)", 2: "var(--c-done)", 3: "var(--ember)", 4: "var(--c-compare)", 5: "var(--c-pivot)", 6: "var(--c-dim)", 7: "color-mix(in srgb, var(--c-done) 38%, var(--panel-2))" };

  const st = { mode: "dij", g: null, truth: null, run: null, click: "src", pick: -1 };
  let code = null, ctr = null;
  const say = Forge.narrate($("say"));
  const predict = FX.predict($("predictHost"), () => player);

  /* ------------------------------------------------------------ graph creation & text */
  function circleLayout(n) {
    const cx = SP.VW / 2, cy = SP.VH / 2, R = Math.min(SP.VW, SP.VH) / 2 - 30;
    return Array.from({ length: n }, (_, i) => ({ x: Math.round(cx + R * Math.cos((2 * Math.PI * i) / n - Math.PI)), y: Math.round(cy + R * Math.sin((2 * Math.PI * i) / n - Math.PI)) }));
  }
  function makeGraph() {
    const p = $("preset").value, n = +$("n").value, C = +$("C").value, seed = +$("seed").value || 1;
    if (p === "small") {
      const g = SP.small();
      if (C !== 9) { const r = SP.rng(seed); g.edges.forEach((e) => (e.w = 1 + Math.floor(r() * C))); }
      return g;
    }
    if (p === "grid") return SP.gridRoads(n, C, seed);
    return SP.randomSparse(n, C, seed);
  }
  function toText(g) {
    return `n ${g.n}\nsource ${g.src}\n` + g.edges.map((e) => `${e.u} ${e.v} ${e.w}`).join("\n");
  }
  function fromText(txt) {
    const lines = txt.split(/\n/).map((l) => l.replace(/\/\/.*$|#.*$/, "").trim()).filter(Boolean);
    let n = null, src = 0;
    const edges = [], seen = new Map();
    for (const l of lines) {
      const t = l.split(/[\s,]+/);
      if (/^n$/i.test(t[0])) { n = parseInt(t[1], 10); continue; }
      if (/^source$|^s$/i.test(t[0])) { src = parseInt(t[1], 10); continue; }
      if (t.length < 3) throw new Error(`"${l}" needs three numbers: from to weight.`);
      const [u, v, w] = t.slice(0, 3).map((x) => Number(x));
      if (![u, v, w].every(Number.isInteger)) throw new Error(`"${l}": use whole numbers.`);
      if (w < 1 || w > 99) throw new Error(`"${l}": weights must be 1..99 (Dial needs positive integers).`);
      if (u === v) throw new Error(`"${l}": no self-loops.`);
      const key = u + ">" + v;
      if (seen.has(key)) edges[seen.get(key)].w = w; else { seen.set(key, edges.length); edges.push({ u, v, w }); }
    }
    const maxId = Math.max(src, ...edges.map((e) => Math.max(e.u, e.v)));
    if (n == null) n = maxId + 1;
    if (!(n >= 2 && n <= 200)) throw new Error("Use between 2 and 200 vertices.");
    if (maxId >= n || src < 0 || edges.some((e) => e.u < 0 || e.v < 0)) throw new Error(`Vertex numbers must be 0..${n - 1}.`);
    return { n, src, edges };
  }

  /* ------------------------------------------------------------ drawing */
  const stage = $("stage");
  function zoom() { const w = stage.clientWidth || 760; return Math.max(1, Math.min(1.8, (760 / w) * 0.8)); }
  function radius(n) { return (n <= 12 ? 17 : n <= 40 ? 12 : n <= 90 ? 8 : 6) * zoom(); }
  function draw(f) {
    const g = st.g, n = g.n, R = radius(n), W = SP.VW, H = SP.VH;
    stage.setAttribute("viewBox", `0 0 ${W} ${H}`);
    stage.innerHTML = "";
    const defs = S("defs");
    [["m", "var(--line-2)"], ["em", "var(--ember)"], ["cp", "var(--c-compare)"], ["dm", "var(--muted)"]].forEach(([id, c]) =>
      defs.appendChild(S("marker", { id: "sp-" + id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: R < 10 ? 4.5 : 6, markerHeight: R < 10 ? 4.5 : 6, orient: "auto" }, S("path", { d: "M0 0 L10 5 L0 10 z", fill: c }))));
    stage.appendChild(defs);
    const P = g.pos;
    const has = new Set(g.edges.map((e) => e.u + ">" + e.v));
    const tree = new Set();
    if (f.forest) f.forest.forEach((k) => tree.add(k));
    else f.par.forEach((k, v) => { if (k >= 0 && f.d[v] < INF) tree.add(k); });
    const act = new Set(f.act || []);
    const showW = g.edges.length <= 70, thin = n > 90;
    const gE = S("g"), gL = S("g");
    g.edges.forEach((e, k) => {
      const a = P[e.u], b = P[e.v];
      let col = "var(--line-2)", mk = "m", w = thin ? 1 : 1.6, op = 1;
      if (tree.has(k)) { col = "var(--ember)"; mk = "em"; w = thin ? 2.2 : 3.2; }
      if (act.has(k)) { col = f.actKind === "no" ? "var(--muted)" : "var(--c-compare)"; mk = f.actKind === "no" ? "dm" : "cp"; w = thin ? 2.4 : 3.6; }
      if (st.mode === "piv" && f.st[e.u] === 7 && f.st[e.v] === 7) op = 0.35;
      const curve = has.has(e.v + ">" + e.u) ? 14 : 0;
      const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
      const mx = (a.x + b.x) / 2 + nx * curve, my = (a.y + b.y) / 2 + ny * curve;
      const d1x = mx - a.x, d1y = my - a.y, l1 = Math.hypot(d1x, d1y) || 1, d2x = b.x - mx, d2y = b.y - my, l2 = Math.hypot(d2x, d2y) || 1;
      const x1 = a.x + (d1x / l1) * R, y1 = a.y + (d1y / l1) * R, x2 = b.x - (d2x / l2) * (R + 2), y2 = b.y - (d2y / l2) * (R + 2);
      const d = curve ? `M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}` : `M${x1} ${y1} L${x2} ${y2}`;
      gE.appendChild(S("path", { d, stroke: col, "stroke-width": w, fill: "none", opacity: op, "marker-end": `url(#sp-${mk})` }));
      if (showW) {
        const lx = curve ? (a.x + b.x) / 2 + nx * curve * 0.55 : mx, ly = curve ? (a.y + b.y) / 2 + ny * curve * 0.55 : my;
        const fs = (R >= 12 ? 11.5 : 10) * Math.min(zoom(), 1.4), tw = 6 + fs * 0.62 * String(e.w).length;
        gL.appendChild(S("rect", { x: lx - tw / 2, y: ly - fs * 0.75, width: tw, height: fs * 1.35, rx: 4, fill: "var(--bg-2)", opacity: 0.9 }));
        gL.appendChild(S("text", { x: lx, y: ly + fs * 0.35, "text-anchor": "middle", "font-size": fs, fill: act.has(k) ? "var(--ink)" : "var(--muted)", "font-weight": act.has(k) ? 700 : 400 }, String(e.w)));
      }
    });
    stage.append(gE, gL);
    const hot = new Set(f.hot || []);
    const sizes = new Map(f.sizes || []);
    const showD = n <= 40;
    for (let v = 0; v < n; v++) {
      const p = P[v];
      let s = f.st[v];
      if (f.cur === v) s = 3;
      const fill = COL[s] || COL[0];
      const ink = s === 0 || s === 6 || s === 7 ? "var(--ink)" : "#0d1117";
      const grp = S("g", { class: "nd", "data-v": v });
      if (v === g.src) grp.appendChild(S("circle", { cx: p.x, cy: p.y, r: R + 3.5, fill: "none", stroke: "var(--ink-2)", "stroke-width": 1.5 }));
      if (hot.has(v)) grp.appendChild(S("circle", { cx: p.x, cy: p.y, r: R + 3, fill: "none", stroke: "var(--c-compare)", "stroke-width": 2.5 }));
      if (st.pick === v) grp.appendChild(S("circle", { cx: p.x, cy: p.y, r: R + 5, fill: "none", stroke: "var(--ember)", "stroke-width": 3, "stroke-dasharray": "4 3" }));
      grp.appendChild(S("circle", { cx: p.x, cy: p.y, r: R, fill, stroke: s ? fill : "var(--line-2)", "stroke-width": 1.5 }));
      if (R >= 12) grp.appendChild(S("text", { x: p.x, y: p.y + 4.2, "text-anchor": "middle", "font-size": R >= 16 ? 13 * Math.min(zoom(), 1.5) : 11 * Math.min(zoom(), 1.5), "font-weight": 700, fill: ink }, String(v)));
      grp.appendChild(S("title", null, `vertex ${v}: d = ${f.d[v] === INF ? "∞" : f.d[v]}${st.truth && st.truth[v] < INF ? ` (true distance ${st.truth[v]})` : ""}`));
      if (showD && f.d[v] < INF) {
        const up = p.y > 40;
        grp.appendChild(S("text", { x: p.x, y: up ? p.y - R - 5 : p.y + R + 13, "text-anchor": "middle", "font-size": 11.5 * Math.min(zoom(), 1.5), "font-weight": 700, fill: "var(--ember-2)" }, String(f.d[v])));
      }
      if (sizes.has(v)) grp.appendChild(S("text", { x: p.x, y: p.y + R + (showD ? 14 : 12), "text-anchor": "middle", "font-size": 10.5, "font-weight": 700, fill: "var(--c-pivot)" }, `tree ${sizes.get(v)}`));
      grp.addEventListener("click", () => clickVertex(v));
      stage.appendChild(grp);
    }
  }

  /* ------------------------------------------------------------ data-structure strip */
  function drawDS(f) {
    const host = $("ds"); host.innerHTML = "";
    const ds = f.ds;
    const chip = (t, cls) => E("span", { class: "it" + (cls ? " " + cls : "") }, t);
    if (st.mode === "bf") {
      host.append(E("span", { class: "lbl" }, "No priority queue."), E("span", null, `Round ${f.ctr.rounds || 0} of at most n − 1 = ${st.g.n - 1}; every round checks all m = ${st.g.edges.length} edges.`));
      return;
    }
    if (!ds) return;
    if (ds.kind === "heap") {
      host.appendChild(E("span", { class: "lbl" }, `Min-heap H (${ds.size}), array order:`));
      if (!ds.items.length) host.appendChild(E("span", { class: "muted" }, "empty"));
      ds.items.forEach(([v, d], k) => host.appendChild(chip(`${v}:${d}`, k === 0 ? "top" : "")));
      if (ds.size > ds.items.length) host.appendChild(E("span", { class: "muted" }, `… +${ds.size - ds.items.length}`));
    } else if (ds.kind === "buckets") {
      host.appendChild(E("div", { class: "lbl", style: { width: "100%" } }, `Circular array of C + 1 = ${ds.NB} buckets (slot · the distance it stands for now):`));
      const grid = E("div", { class: "slots" });
      ds.slots.forEach((b, j) => {
        const cur = ds.i % ds.NB, dist = ds.i + ((j - cur + ds.NB) % ds.NB);
        grid.appendChild(E("div", { class: "slot" + (j === cur ? " cur" : "") }, E("div", { class: "h" }, `#${j} · ${dist}`), E("div", null, b.length ? b.join(" ") : "·")));
      });
      host.appendChild(grid);
    } else if (ds.kind === "delta") {
      host.appendChild(E("span", { class: "lbl" }, `Buckets of width Δ = ${ds.D}:`));
      if (!ds.list.length) host.appendChild(E("span", { class: "muted" }, "all empty"));
      ds.list.forEach(([j, items]) => host.appendChild(chip(`B${j} [${j * ds.D},${(j + 1) * ds.D}): ${items.join(" ")}`, j === ds.i ? "top" : "")));
      if (ds.R.length) host.append(E("span", { class: "lbl", style: { marginLeft: "8px" } }, "R (settling):"), chip(ds.R.join(" "), "w"));
    } else if (ds.kind === "pivots") {
      host.append(E("span", { class: "lbl" }, `S (${ds.S.length}):`), chip(ds.S.join(" ") || "∅"), E("span", { class: "lbl", style: { marginLeft: "6px" } }, `W (${ds.W.length}):`), chip(ds.W.join(" ")));
      if (f.pivots) host.append(E("span", { class: "lbl", style: { marginLeft: "6px" } }, `P (${f.pivots.length}):`), chip(f.pivots.join(" ") || "∅", "pv"));
      host.append(E("span", { class: "lbl", style: { marginLeft: "6px" } }, `b = ${ds.b}, B = ${ds.B}, k = ${ds.k}`));
    }
  }

  /* ------------------------------------------------------------ order chart */
  function drawOrder(f) {
    const svg = $("orderSvg"), W = 760, H = 176, ml = 44, mr = 12, mt = 22, mb = 28;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.innerHTML = "";
    const run = st.run, order = run.order || [], tr = st.truth;
    const N = order.length || 1, maxd = Math.max(1, ...order.map((v) => tr[v]));
    const X = (i) => ml + (N <= 1 ? 0 : (i * (W - ml - mr)) / (N - 1)), Y = (d) => H - mb - (d * (H - mt - mb)) / maxd;
    // recessive grid
    const ticks = 4;
    for (let t = 0; t <= ticks; t++) {
      const dv = Math.round((maxd * t) / ticks), y = Y(dv);
      svg.appendChild(S("line", { x1: ml, x2: W - mr, y1: y, y2: y, stroke: "var(--line)", "stroke-width": 1 }));
      svg.appendChild(S("text", { x: ml - 6, y: y + 4, "text-anchor": "end", "font-size": 11, fill: "var(--muted)" }, String(dv)));
    }
    if (st.mode === "delta") {
      const D = +$("D").value;
      for (let b = D; b < maxd; b += D) { if ((maxd / D) > 40) break; const y = Y(b); svg.appendChild(S("line", { x1: ml, x2: W - mr, y1: y, y2: y, stroke: "var(--c-pivot)", "stroke-width": 1, "stroke-dasharray": "3 4", opacity: 0.7 })); }
    }
    svg.appendChild(S("text", { x: ml, y: H - 6, "font-size": 11, fill: "var(--muted)" }, run.orderKind === "correct" ? "order in which distances became correct →" : "settle order →"));
    svg.appendChild(S("text", { x: ml, y: 13, "font-size": 11, fill: "var(--muted)" }, "distance ↑"));
    const ns = Math.min(f.ns || 0, order.length);
    let drops = 0, pts = "";
    for (let i = 0; i < ns; i++) { pts += `${X(i)},${Y(tr[order[i]])} `; if (i && tr[order[i]] < tr[order[i - 1]]) drops++; }
    if (ns > 1) svg.appendChild(S("polyline", { points: pts, fill: "none", stroke: "var(--steel)", "stroke-width": 2, opacity: 0.55 }));
    const r = N > 120 ? 3 : 4;
    for (let i = 0; i < ns; i++) {
      const v = order[i], down = i && tr[v] < tr[order[i - 1]];
      const c = S("circle", { cx: X(i), cy: Y(tr[v]), r, fill: down ? "var(--c-swap)" : "var(--steel)", stroke: "var(--bg-2)", "stroke-width": 1.5 });
      c.appendChild(S("title", null, `#${i + 1}: vertex ${v}, distance ${tr[v]}`));
      svg.appendChild(c);
    }
    const note = $("orderNote");
    const kind = run.orderKind;
    if (!ns) note.textContent = "Nothing settled yet.";
    else if (kind === "settled") note.innerHTML = `${ns} settled, <b>${drops}</b> step${drops === 1 ? "" : "s"} down. Every point is at least as high as the one before: the output is sorted by distance. Producing sorted output from n numbers needs about n log n comparisons — the sorting barrier.`;
    else if (kind === "bucket") note.innerHTML = `${ns} settled, ${drops} step${drops === 1 ? "" : "s"} down (red). Dashed lines are bucket boundaries: the order is sorted <i>between</i> buckets, but not inside one — Δ-stepping only partially sorts.`;
    else note.innerHTML = `${ns} distances correct so far, ${drops} step${drops === 1 ? "" : "s"} down (red). Bellman–Ford fixes distances in whatever order the edge list allows, but it cannot <i>know</i> a distance is final until a whole round passes quietly.`;
  }

  /* ------------------------------------------------------------ render & rebuild */
  function render(f, i) {
    draw(f);
    code.highlight(f.line);
    ctr.set(f.ctr);
    say.say(f.text + (f.final && st.run.over ? " <i>(Recording was capped; the counters above are complete.)</i>" : ""));
    predict.update(f, i);
    drawDS(f);
    if (st.mode !== "piv") drawOrder(f);
  }
  const player = Forge.player($("player"), { frames: [], render, fps: 4 });

  function fineOn() { return $("fine").checked && st.g.edges.length <= 120; }
  function runMode(mode, frames) {
    const g = st.g, opt = { frames, fine: frames && fineOn(), delta: +$("D").value };
    if (mode === "piv") return SP.pivotsRun(g, Object.assign(opt, pivOpts()));
    return SP.RUN[mode](g, opt);
  }
  function pivOpts() { return { frac: +$("F").value / 100, beta: +$("Bb").value / 100, k: +$("K").value }; }

  function rebuild() {
    $("err").textContent = "";
    st.truth = SP.dijkstra(st.g).d;
    st.run = runMode(st.mode, true);
    $("code").innerHTML = "";
    code = Forge.code($("code"), LINES[st.mode]);
    $("ctr").innerHTML = "";
    ctr = Forge.counters($("ctr"), CTR0[st.mode]);
    legend();
    predict.reset();
    player.load(st.run.frames);
    compareTable();
    if (st.mode === "piv") pivSummary();
    $("BOut").textContent = +$("Bb").value >= 100 ? "∞" : `b + ${$("Bb").value}% of the rest`;
  }

  function legend() {
    const L = $("legend"); L.innerHTML = "";
    const item = (c, t, line) => L.appendChild(E("span", null, E("i", { style: line ? { background: c, height: "4px", width: "16px", verticalAlign: "3px" } : { background: c } }), t));
    if (st.mode === "piv") {
      item(COL[7], "finished before the call (d < b)"); item(COL[1], "frontier S / reached in W"); item(COL[4], "new in this round · then pivot trees");
      item(COL[5], "pivot"); item(COL[2], "small tree: done, no heap needed"); item(COL[6], "reached at d̂ ≥ B (outside the band)"); item("var(--ember)", "tight edge (forest F)", 1);
    } else {
      item(COL[0], "not reached"); item(COL[1], "tentative distance"); item(COL[2], st.mode === "bf" ? "final (known only at the end)" : "settled (final)");
      item(COL[3], "being processed"); item("var(--ember)", "shortest-path tree edge", 1); item("var(--c-compare)", "edge being relaxed", 1);
    }
  }

  /* ------------------------------------------------------------ comparison table */
  function compareTable() {
    const T = $("cmp"); T.innerHTML = "";
    const g = st.g, ref = st.truth, delta = +$("D").value;
    T.appendChild(E("tr", null, ["Algorithm", "Agrees", "Counters", "Work"].map((h) => E("th", null, h))));
    for (const a of ["bf", "dij", "dial", "delta"]) {
      const r = SP.RUN[a](g, { delta });
      let ok = true; for (let v = 0; v < g.n; v++) if (r.d[v] !== ref[v]) ok = false;
      const cs = Object.entries(r.ctr).map(([k, v]) => `${k} ${v}`).join(" · ");
      T.appendChild(E("tr", null, E("td", null, NAMES[a] + (a === "delta" ? ` (Δ = ${delta})` : "")), E("td", { class: ok ? "ok" : "bad" }, ok ? "✓ all " + g.n : "✗"),
        E("td", { style: { textAlign: "left", whiteSpace: "normal", fontSize: ".78rem" } }, cs), E("td", null, String(Math.round(SP.work(a, r.ctr))))));
    }
    const reach = ref.filter((x) => x < INF).length;
    T.appendChild(E("tr", null, E("td", { colspan: 4, style: { textAlign: "left", whiteSpace: "normal" }, class: "muted" },
      `n = ${g.n}, m = ${g.edges.length}, ${reach} reachable from the source ${g.src}. For scale: m·log₂ n ≈ ${Math.round(g.edges.length * Math.log2(Math.max(2, g.n)))}.`)));
  }

  /* ------------------------------------------------------------ FindPivots summary */
  function pivSummary() {
    const host = $("pivSum"); host.innerHTML = "";
    const run = st.run, res = run.res, k = run.k;
    if (!res) { host.textContent = "No frontier for these settings."; return; }
    const S0 = run.sc.S.length, P0 = res.P.length, Wk = res.W.length / k;
    const mx = Math.max(S0, Wk, P0, 1);
    const bar = (label, v, c) => [E("span", null, label), E("div", { class: "b", style: { width: `${Math.max(2, (100 * v) / mx)}%`, background: c } }), E("b", null, Number.isInteger(v) ? String(v) : v.toFixed(1))];
    host.appendChild(E("div", { class: "bars2" }, bar("|S|: Dijkstra's heap", S0, "var(--c-active)"), bar("|W| / k: the bound", Wk, "var(--line-2)"), bar("|P|: pivots", P0, "var(--c-pivot)")));
    const chk = SP.checkLemma(st.g, run.sc, res, run.dh, k);
    host.appendChild(E("p", { class: "small", style: { margin: "10px 0 6px" }, html:
      `${res.early ? `<b>Early exit</b>: |W| = ${res.W.length} &gt; k·|S| = ${k * S0}, so P = S.` : `Frontier ${S0} → ${P0} pivot${P0 === 1 ? "" : "s"}${S0 ? ` (${Math.round((100 * P0) / S0)}%)` : ""}.`} ` +
      `<b>Answer key</b> (true distances): Ũ has ${chk.Ucount} vertices; ${chk.bad.length ? `<span style="color:var(--bad)">${chk.bad.length} violate Lemma 3.2</span>` : `<span style="color:var(--ok)">every one is complete in W or behind a complete pivot ✓</span>`}; |P| ≤ |W|/k ${chk.okSize ? "✓" : "✗"}. ${res.complete} of the ${res.W.length} vertices of W are already complete.` }));
    // frontier sweep
    const tbl = E("table", { class: "t cmp", style: { width: "100%" } });
    tbl.appendChild(E("tr", null, ["finished", "|S|", "|W|", "|P|", "|P|/|S|"].map((h) => E("th", null, h))));
    const o = pivOpts();
    for (let fr = 0; fr <= 80; fr += 10) {
      const sc = SP.pivotScenario(st.g, { frac: fr / 100, beta: o.beta });
      if (!sc.S.length) { tbl.appendChild(E("tr", null, E("td", null, fr + "%"), E("td", { colspan: 4, class: "muted" }, "no frontier"))); continue; }
      const r = SP.findPivots(st.g, sc.S, sc.dh.slice(), sc.B, o.k);
      tbl.appendChild(E("tr", null, E("td", null, fr + "%"), E("td", null, String(sc.S.length)), E("td", null, String(r.W.length)), E("td", null, String(r.P.length) + (r.early ? "*" : "")), E("td", null, (r.P.length / sc.S.length).toFixed(2))));
    }
    host.append(E("div", { class: "panel-title", style: { marginTop: "10px" } }, `Frontier sweep (k = ${o.k})`), E("div", { class: "scroll-x" }, tbl),
      E("p", { class: "small muted", style: { margin: "6px 0 0" } }, "* early exit: W grew past k·|S|, so P = S (and then |S| < |W|/k)."));
  }

  /* ------------------------------------------------------------ work vs n */
  const BSER = [
    { a: "bf", name: "Bellman–Ford", col: "var(--c-swap)", shape: "tri" },
    { a: "dij", name: "Dijkstra (heap)", col: "var(--steel)", shape: "circle" },
    { a: "dial", name: "Dial", col: "var(--c-done)", shape: "square" },
    { a: "delta", name: "Δ-stepping", col: "var(--c-pivot)", shape: "diamond" },
  ];
  function marker(shape, x, y, col, r) {
    r = r || 4.5;
    if (shape === "circle") return S("circle", { cx: x, cy: y, r, fill: col, stroke: "var(--bg-2)", "stroke-width": 2 });
    if (shape === "square") return S("rect", { x: x - r, y: y - r, width: 2 * r, height: 2 * r, rx: 1.5, fill: col, stroke: "var(--bg-2)", "stroke-width": 2 });
    if (shape === "diamond") return S("path", { d: `M${x} ${y - r - 1} L${x + r + 1} ${y} L${x} ${y + r + 1} L${x - r - 1} ${y} z`, fill: col, stroke: "var(--bg-2)", "stroke-width": 2 });
    return S("path", { d: `M${x} ${y - r - 1} L${x + r + 1} ${y + r} L${x - r - 1} ${y + r} z`, fill: col, stroke: "var(--bg-2)", "stroke-width": 2 });
  }
  let benchData = null, benchKey = "";
  function bench() {
    const fam = $("benchFam").value, C = +$("C").value, D = +$("D").value, key = [fam, C, D].join();
    if (key !== benchKey) { benchData = SP.bench(fam, [25, 50, 100, 200, 400, 800, 1600, 3200], C, D); benchKey = key; }
    drawBench();
  }
  function drawBench() {
    const svg = $("benchSvg"), W = 760, H = 300, ml = 58, mr = 110, mt = 14, mb = 40;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.innerHTML = "";
    const per = $("benchMetric").value === "per";
    const rows = benchData;
    const val = (r, a) => (a === "ref" ? (per ? Math.log2(r.nn) : r.m * Math.log2(r.nn)) : per ? r[a] / r.m : r[a]);
    const all = []; rows.forEach((r) => { BSER.forEach((s) => all.push(val(r, s.a))); all.push(val(r, "ref")); });
    const ymax = Math.max(...all), ymin = per ? 0 : Math.max(1, Math.min(...all));
    const lx0 = Math.log2(rows[0].nn), lx1 = Math.log2(rows[rows.length - 1].nn);
    const X = (n) => ml + ((Math.log2(n) - lx0) * (W - ml - mr)) / (lx1 - lx0);
    const Y = per ? (v) => H - mb - (v * (H - mt - mb)) / (ymax * 1.05) : (v) => H - mb - ((Math.log10(v) - Math.log10(ymin)) * (H - mt - mb)) / (Math.log10(ymax * 1.2) - Math.log10(ymin));
    // grid + y labels
    const yt = [];
    if (per) { const step = niceStep(ymax / 4); for (let v = 0; v <= ymax * 1.05; v += step) yt.push(v); }
    else { for (let p = Math.floor(Math.log10(ymin)); p <= Math.ceil(Math.log10(ymax)); p++) if (10 ** p >= ymin && 10 ** p <= ymax * 1.2) yt.push(10 ** p); }
    yt.forEach((v) => {
      const y = Y(v);
      svg.appendChild(S("line", { x1: ml, x2: W - mr, y1: y, y2: y, stroke: "var(--line)", "stroke-width": 1 }));
      svg.appendChild(S("text", { x: ml - 6, y: y + 4, "text-anchor": "end", "font-size": 11, fill: "var(--muted)" }, per ? (Math.round(v * 10) / 10).toString() : fmtBig(v)));
    });
    rows.forEach((r) => {
      svg.appendChild(S("text", { x: X(r.nn), y: H - mb + 16, "text-anchor": "middle", "font-size": 11, fill: "var(--muted)" }, fmtBig(r.nn)));
    });
    svg.appendChild(S("text", { x: (ml + W - mr) / 2, y: H - 6, "text-anchor": "middle", "font-size": 11, fill: "var(--muted)" }, "vertices n (doubling)"));
    svg.appendChild(S("text", { x: 6, y: mt, "font-size": 11, fill: "var(--muted)" }, per ? "work ÷ m" : "work"));
    // reference
    const refPts = rows.map((r) => `${X(r.nn)},${Y(val(r, "ref"))}`).join(" ");
    svg.appendChild(S("polyline", { points: refPts, fill: "none", stroke: "var(--muted)", "stroke-width": 1.5, "stroke-dasharray": "5 5" }));
    const last = rows[rows.length - 1];
    const labels = [];
    labels.push({ y: Y(val(last, "ref")), t: per ? "log₂ n" : "m·log₂ n", col: "var(--muted)" });
    BSER.forEach((s) => {
      const pts = rows.map((r) => `${X(r.nn)},${Y(val(r, s.a))}`).join(" ");
      svg.appendChild(S("polyline", { points: pts, fill: "none", stroke: s.col, "stroke-width": 2 }));
      rows.forEach((r) => {
        const mk = marker(s.shape, X(r.nn), Y(val(r, s.a)), s.col);
        mk.appendChild(S("title", null, `${s.name}, n = ${r.nn}: work ${Math.round(r[s.a]).toLocaleString()} (${(r[s.a] / r.m).toFixed(2)} per edge, m = ${Math.round(r.m)})`));
        svg.appendChild(mk);
      });
      labels.push({ y: Y(val(last, s.a)), t: s.name, col: s.col });
    });
    // direct labels at the right, nudged apart
    labels.sort((a, b) => a.y - b.y);
    for (let i = 1; i < labels.length; i++) if (labels[i].y - labels[i - 1].y < 14) labels[i].y = labels[i - 1].y + 14;
    const over = labels.length ? labels[labels.length - 1].y - (H - mb - 4) : 0;
    if (over > 0) labels.forEach((l) => (l.y -= over));
    labels.forEach((l) => svg.appendChild(S("text", { x: W - mr + 8, y: l.y + 4, "font-size": 11.5, fill: "var(--ink-2)", "font-weight": 600 }, l.t)));
    // legend + table
    const lg = $("benchLegend"); lg.innerHTML = "";
    BSER.forEach((s) => { const sv = S("svg", { width: 22, height: 14, viewBox: "0 0 22 14" }, S("line", { x1: 0, x2: 22, y1: 7, y2: 7, stroke: s.col, "stroke-width": 2 }), marker(s.shape, 11, 7, s.col, 4)); lg.appendChild(E("span", null, sv, s.name)); });
    lg.appendChild(E("span", null, S("svg", { width: 22, height: 14, viewBox: "0 0 22 14" }, S("line", { x1: 0, x2: 22, y1: 7, y2: 7, stroke: "var(--muted)", "stroke-width": 1.5, "stroke-dasharray": "4 3" })), per ? "reference: log₂ n" : "reference: m·log₂ n"));
    const T = $("benchTable"); T.innerHTML = "";
    T.appendChild(E("tr", null, ["n", "m", ...BSER.map((s) => s.name), per ? "log₂ n" : "m·log₂ n"].map((h) => E("th", null, h))));
    rows.forEach((r) => T.appendChild(E("tr", null, E("td", null, String(r.nn)), E("td", null, String(Math.round(r.m))), ...BSER.map((s) => E("td", null, per ? val(r, s.a).toFixed(2) : Math.round(val(r, s.a)).toLocaleString())), E("td", null, per ? val(r, "ref").toFixed(2) : Math.round(val(r, "ref")).toLocaleString()))));
  }
  function niceStep(x) { const p = 10 ** Math.floor(Math.log10(x)); const f = x / p; return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p; }
  function fmtBig(v) { return v >= 1e6 ? (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + "M" : v >= 1e4 ? Math.round(v / 1e3) + "k" : v >= 1000 ? (v / 1e3).toFixed(1) + "k" : String(Math.round(v)); }

  /* ------------------------------------------------------------ interaction */
  function clickVertex(v) {
    if (st.click === "src") {
      if (v === st.g.src) return;
      st.g.src = v; $("edgeText").value = toText(st.g); rebuild(); return;
    }
    if (st.pick < 0) { st.pick = v; const f = player.frames[player.index]; if (f) draw(f); say.say(`Edge mode: vertex ${v} picked. Click the head of the edge (click ${v} again to cancel).`); return; }
    const u = st.pick; st.pick = -1;
    if (u === v) { rebuild(); return; }
    const k = st.g.edges.findIndex((e) => e.u === u && e.v === v);
    if (k >= 0) st.g.edges.splice(k, 1);
    else st.g.edges.push({ u, v, w: Math.max(1, Math.min(99, Math.round(+$("newW").value) || 1)) });
    markCustom();
    rebuild();
  }
  function markCustom() { $("preset").querySelector('[value="custom"]').disabled = false; $("preset").value = "custom"; $("edgeText").value = toText(st.g); }
  function setClick(which) { st.click = which; st.pick = -1; $("clkSrc").classList.toggle("on", which === "src"); $("clkEdge").classList.toggle("on", which === "edge"); }
  $("clkSrc").onclick = () => setClick("src");
  $("clkEdge").onclick = () => setClick("edge");

  function newGraph() {
    st.g = makeGraph(); st.pick = -1;
    $("nBox").style.display = $("preset").value === "small" ? "none" : "";
    $("edgeText").value = toText(st.g);
    rebuild();
  }
  $("preset").onchange = () => {
    if ($("preset").value === "custom") return;
    $("fine").checked = $("preset").value === "small";
    setB($("preset").value === "small" ? 100 : 20);
    newGraph();
  };
  $("n").oninput = () => ($("nOut").textContent = $("n").value);
  $("n").onchange = () => { if ($("preset").value === "custom") $("preset").value = "random"; newGraph(); };
  $("C").oninput = () => ($("COut").textContent = $("C").value);
  $("C").onchange = () => { if ($("preset").value === "custom") $("preset").value = "random"; newGraph(); bench(); };
  $("seed").onchange = newGraph;
  $("rand").onclick = () => { $("seed").value = 1 + Math.floor(Math.random() * 9999); if ($("preset").value === "small" || $("preset").value === "custom") { $("preset").value = "random"; $("fine").checked = false; } newGraph(); };
  $("fine").onchange = rebuild;
  $("D").oninput = () => ($("DOut").textContent = $("D").value);
  $("D").onchange = () => { rebuild(); bench(); };
  $("F").oninput = () => ($("FOut").textContent = $("F").value + "%");
  $("F").onchange = rebuild;
  $("Bb").oninput = () => ($("BOut").textContent = +$("Bb").value >= 100 ? "∞" : `b + ${$("Bb").value}% of the rest`);
  $("Bb").onchange = rebuild;
  $("K").oninput = () => ($("KOut").textContent = $("K").value);
  $("K").onchange = rebuild;
  $("benchFam").onchange = bench;
  $("benchMetric").onchange = drawBench;
  $("apply").onclick = () => {
    try {
      const h = fromText($("edgeText").value);
      const pos = h.n === st.g.n ? st.g.pos : circleLayout(h.n);
      st.g = { n: h.n, src: h.src, edges: h.edges, pos, name: "custom" };
      markCustom(); rebuild();
    } catch (ex) { $("err").textContent = "⚠ " + ex.message; }
  };
  document.querySelectorAll(".modes .btn").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll(".modes .btn").forEach((x) => x.classList.toggle("on", x === b));
    st.mode = b.dataset.mode;
    $("optDelta").hidden = st.mode !== "delta";
    $("optPiv").hidden = st.mode !== "piv";
    $("pivPanel").hidden = st.mode !== "piv";
    $("orderPanel").hidden = st.mode === "piv";
    $("orderTitle").textContent = st.mode === "bf" ? "Distances in the order they became correct" : "Distances in the order they were settled";
    rebuild();
  }));

  let rsz = null;
  window.addEventListener("resize", () => { clearTimeout(rsz); rsz = setTimeout(() => { const f = player.frames[player.index]; if (f) draw(f); }, 150); });
  function setB(v) { $("Bb").value = v; $("BOut").textContent = v >= 100 ? "∞" : `b + ${v}% of the rest`; }
  $("fine").checked = true;
  setB(100);
  newGraph();
  setTimeout(bench, 30);
})();
