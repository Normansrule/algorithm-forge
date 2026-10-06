/* Algorithm Forge — Maximum flow beyond augmenting paths (UI). Engines: flow-modern-core.js */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const E = Forge.el, S = Forge.svg, FC = window.FlowCore;
  Forge.page({ title: "Maximum Flow Beyond Augmenting Paths", chapter: "Ch 18 · The Frontier" });

  const LINES = {
    ek: [
      "ALGORITHM EdmondsKarp(G, s, t)",
      "    f ← 0 on every edge",
      "    while BFS finds a shortest s–t path P in the residual graph do",
      "        δ ← min residual capacity r(u, v) on P",
      "        for each arc (u, v) of P do",
      "            f(u, v) ← f(u, v) + δ;  f(v, u) ← f(v, u) − δ",
      "    return f      // reachable from s = min-cut side",
    ],
    dinic: [
      "ALGORITHM Dinic(G, s, t)",
      "    f ← 0 on every edge",
      "    while true do                          // one phase per pass",
      "        level ← BFS levels from s in the residual graph",
      "        if level[t] = ∞ then return f",
      "        // level graph: r > 0 and level[v] = level[u] + 1",
      "        for each vertex v do cur[v] ← first arc out of v",
      "        P ← [s]                               // path grown by DFS",
      "        while not isEmpty(P) do",
      "            u ← last vertex of P",
      "            if u = t then                     // augment",
      "                push δ = min r on P; cut P at its first full arc",
      "            else if cur[u] = null then        // dead end: retreat",
      "                pop u; advance cur of the new last vertex",
      "            else if cur[u] = (u, v) is in the level graph then",
      "                append v to P                 // advance",
      "            else advance cur[u]",
    ],
    pr: [
      "ALGORITHM PushRelabel(G, s, t)",
      "    h[s] ← n;  h[v] ← 0 and e[v] ← 0 for every other v",
      "    saturate every arc out of s     // preflow: excess appears",
      "    while some vertex u ≠ s, t has e[u] > 0 do",
      "        u ← next active vertex     // FIFO queue, or highest h[u]",
      "        while e[u] > 0 do",
      "            if some arc (u, v) has r > 0 and h[u] = h[v] + 1 then",
      "                δ ← min(e[u], r(u, v))                    // push",
      "                move δ of excess from u to v along (u, v)",
      "            else",
      "                h[u] ← 1 + min{h[v] : r(u, v) > 0}       // relabel",
      "                put u back among the active vertices; stop",
      "                if gap and no vertex has the old height g < n then",
      "                    h[v] ← n + 1 for every v with g < h[v] < n",
      "    return f                    // e[t] = maximum flow value",
    ],
  };
  const CTR0 = {
    ek: { value: 0, augmentations: 0, "BFS runs": 0, "arc inspections": 0 },
    dinic: { value: 0, phases: 0, augmentations: 0, advances: 0, retreats: 0, "arc inspections": 0 },
    pr: { value: 0, "saturating pushes": 0, "non-saturating pushes": 0, relabels: 0, "gap lifts": 0, "arc inspections": 0 },
  };
  const st = { mode: "dinic", net: null, run: null, maxH: 1 };
  let code = null, ctr = null;
  const say = Forge.narrate($("say"));
  const predict = FX.predict($("predictHost"), () => player);
  const stage = $("stage");
  const W = 660, H = 420;
  let R = 19, Z = 1;

  /* ------------------------------------------------------------ layouts */
  function basePos() { const p = {}; st.net.nodes.forEach((n) => (p[n.id] = { x: n.x + 10, y: n.y + 10 })); return p; }
  function layeredPos(levels) {
    const ids = st.net.nodes.map((n) => n.id);
    const maxL = Math.max(0, ...Object.values(levels));
    const cols = {};
    ids.forEach((id) => { const L = levels[id] == null ? maxL + 1 : levels[id]; (cols[L] = cols[L] || []).push(id); });
    const nCols = maxL + 2, p = {};
    Object.keys(cols).forEach((L) => {
      const list = cols[L].sort((a, b) => st.net.nodes.find((n) => n.id === a).y - st.net.nodes.find((n) => n.id === b).y);
      list.forEach((id, i) => (p[id] = { x: 45 + (+L * (W - 90)) / Math.max(1, nCols - 1), y: 50 + ((i + 0.5) * (H - 90)) / list.length }));
    });
    return { p, maxL, nCols };
  }
  function heightPos(heights) {
    const order = st.net.nodes.slice().sort((a, b) => a.x - b.x || a.y - b.y).map((n) => n.id);
    const p = {}, top = 34, bot = H - 34;
    order.forEach((id, i) => (p[id] = { x: 60 + (i * (W - 100)) / Math.max(1, order.length - 1), y: bot - ((heights[id] || 0) * (bot - top)) / st.maxH }));
    return p;
  }

  /* ------------------------------------------------------------ drawing */
  function draw(f) {
    Z = Math.max(1, Math.min(1.6, (W / (stage.clientWidth || W)) * 0.8));
    R = 19 * Z;
    stage.setAttribute("viewBox", `0 0 ${W} ${H}`);
    stage.innerHTML = "";
    const net = st.net, defs = S("defs");
    [["m", "var(--line-2)"], ["st", "var(--steel)"], ["em", "var(--ember)"], ["pv", "var(--c-pivot)"], ["cp", "var(--c-compare)"], ["sw", "var(--c-swap)"]].forEach(([id, c]) =>
      defs.appendChild(S("marker", { id: "fm-" + id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto" }, S("path", { d: "M0 0 L10 5 L0 10 z", fill: c }))));
    stage.appendChild(defs);
    let P, layered = false;
    if (st.mode === "dinic" && f.layered && $("layered").checked && f.levels) {
      const L = layeredPos(f.levels); P = L.p; layered = true;
      for (let c = 0; c < L.nCols; c++) {
        const x = 45 + (c * (W - 90)) / Math.max(1, L.nCols - 1);
        stage.appendChild(S("line", { x1: x, x2: x, y1: 26, y2: H - 20, stroke: "var(--line)", "stroke-dasharray": "3 5" }));
        stage.appendChild(S("text", { x, y: 18, "text-anchor": "middle", "font-size": 11.5, fill: "var(--muted)", "font-weight": 700 }, c === L.nCols - 1 ? "level ∞" : "level " + c));
      }
    } else if (st.mode === "pr" && f.heights) {
      P = heightPos(f.heights);
      const top = 34, bot = H - 34, step = st.maxH > 24 ? 2 : 1, n = net.nodes.length;
      for (let h = 0; h <= st.maxH; h += step) {
        const y = bot - (h * (bot - top)) / st.maxH;
        stage.appendChild(S("line", { x1: 26, x2: W - 10, y1: y, y2: y, stroke: h === n ? "var(--steel)" : "var(--line)", "stroke-width": h === n ? 1.4 : 1, "stroke-dasharray": h === n ? "6 4" : "" }));
        stage.appendChild(S("text", { x: 20, y: y + 4, "text-anchor": "end", "font-size": 10.5, fill: h === n ? "var(--steel)" : "var(--muted)" }, String(h)));
      }
      stage.appendChild(S("text", { x: W - 12, y: bot - (n * (bot - top)) / st.maxH - 5, "text-anchor": "end", "font-size": 10.5, fill: "var(--steel)" }, `n = ${n} (source height)`));
      stage.appendChild(S("text", { x: 4, y: 14, "font-size": 10.5, fill: "var(--muted)" }, "height"));
    } else P = basePos();

    const pathK = {};
    (f.path || []).forEach((a) => (pathK[a >> 1] = a % 2 ? "b" : "f"));
    const cutSet = new Set(f.final && f.cut ? f.cut.edges : []);
    const lv = f.levels || {};
    const has = (u, v) => net.edges.some((e) => e.u === u && e.v === v);
    const pushK = f.pushArc != null ? f.pushArc >> 1 : -1, probeK = f.probe != null ? f.probe >> 1 : -1;
    net.edges.forEach((e, k) => {
      const a = P[e.u], b = P[e.v], flow = f.flow[k];
      let col = "var(--line-2)", mk = "m", w = 2, dash = "", op = 1;
      if (flow > 0) { col = "var(--steel)"; mk = "st"; w = flow === e.cap ? 4 : 3; }
      if (layered) {
        const fwd = lv[e.u] != null && lv[e.v] === lv[e.u] + 1 && flow < e.cap;
        const bwd = lv[e.v] != null && lv[e.u] === lv[e.v] + 1 && flow > 0;
        if (!fwd && !bwd) op = 0.22;
        if (bwd) { dash = "6 4"; }
      }
      if (k === probeK) { col = f.probeBad ? "var(--muted)" : "var(--c-compare)"; mk = f.probeBad ? "m" : "cp"; w = 4; op = 1; }
      if (pathK[k] === "f") { col = "var(--ember)"; mk = "em"; w = 5; op = 1; dash = ""; }
      if (pathK[k] === "b") { col = "var(--c-pivot)"; mk = "pv"; w = 5; op = 1; dash = "8 5"; }
      if (k === pushK) { col = f.pushArc % 2 ? "var(--c-pivot)" : "var(--ember)"; mk = f.pushArc % 2 ? "pv" : "em"; w = 5; op = 1; dash = f.pushArc % 2 ? "8 5" : ""; }
      if (cutSet.has(k)) { col = "var(--c-swap)"; mk = "sw"; w = 5; dash = "10 5"; op = 1; }
      const curve = has(e.v, e.u) ? 24 : 0;
      const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
      const mx = (a.x + b.x) / 2 + nx * curve, my = (a.y + b.y) / 2 + ny * curve;
      const d1x = mx - a.x, d1y = my - a.y, l1 = Math.hypot(d1x, d1y) || 1, d2x = b.x - mx, d2y = b.y - my, l2 = Math.hypot(d2x, d2y) || 1;
      const x1 = a.x + (d1x / l1) * R, y1 = a.y + (d1y / l1) * R, x2 = b.x - (d2x / l2) * (R + 4), y2 = b.y - (d2y / l2) * (R + 4);
      const d = curve ? `M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}` : `M${x1} ${y1} L${x2} ${y2}`;
      const g = S("g", { opacity: op });
      g.appendChild(S("path", { d, stroke: col, "stroke-width": w, "stroke-dasharray": dash, fill: "none", "marker-end": `url(#fm-${mk})` }));
      const lx = curve ? (a.x + b.x) / 2 + nx * curve * 0.55 : mx, ly = curve ? (a.y + b.y) / 2 + ny * curve * 0.55 : my;
      const txt = `${flow}/${e.cap}`, tw = (8 + 7 * txt.length) * Z;
      g.appendChild(S("rect", { x: lx - tw / 2, y: ly - 10 * Z, width: tw, height: 19 * Z, rx: 6, fill: "var(--panel)", stroke: flow === e.cap && flow > 0 ? "var(--steel)" : "var(--line)" }));
      g.appendChild(S("text", { x: lx, y: ly + 4 * Z, "text-anchor": "middle", "font-size": 12 * Z, "font-weight": flow > 0 ? 700 : 400, fill: "var(--ink)" }, txt));
      g.appendChild(S("title", null, `${e.u} → ${e.v}: flow ${flow} of capacity ${e.cap}`));
      stage.appendChild(g);
    });

    const stackSet = new Set(f.stack || []), X = f.final && f.cut ? new Set(f.cut.X) : null;
    const curArcs = f.cur || {};
    net.nodes.forEach((nd) => {
      const id = nd.id, p = P[id];
      let fill = "var(--panel-2)", ink = "var(--ink)", stroke = "var(--line-2)";
      if (st.mode === "ek" && f.levels && f.levels[id] != null && !f.final) { fill = "var(--c-active)"; ink = "#0d1117"; stroke = fill; }
      if (st.mode === "dinic" && f.levels && f.levels[id] != null && !f.final) { fill = "var(--c-active)"; ink = "#0d1117"; stroke = fill; }
      if (stackSet.has(id)) { fill = "var(--ember)"; ink = "#1b0f05"; stroke = fill; }
      if (f.dead === id) { fill = "var(--c-dim)"; ink = "var(--ink)"; stroke = "var(--line-2)"; }
      if (st.mode === "pr" && f.excess && f.excess[id] > 0 && id !== net.s && id !== net.t) { fill = "var(--c-compare)"; ink = "#0d1117"; stroke = fill; }
      if (f.curV === id) { fill = "var(--ember)"; ink = "#1b0f05"; stroke = fill; }
      if (X) { if (X.has(id)) { fill = "var(--c-done)"; ink = "#0d1117"; stroke = fill; } else { fill = "var(--c-dim)"; ink = "var(--ink)"; stroke = "var(--line-2)"; } }
      stage.appendChild(S("circle", { cx: p.x, cy: p.y, r: R, fill, stroke, "stroke-width": 2 }));
      stage.appendChild(S("text", { x: p.x, y: p.y + 4.5 * Z, "text-anchor": "middle", "font-size": (id.length > 1 ? 12 : 14) * Z, "font-weight": 800, fill: ink }, id));
      const tag = id === net.s ? "source" : id === net.t ? "sink" : null;
      if (tag) stage.appendChild(S("text", { x: p.x, y: p.y + R + 14, "text-anchor": "middle", "font-size": 10.5, fill: "var(--muted)" }, tag));
      if ((st.mode === "ek" || (st.mode === "dinic" && !layered)) && f.levels && f.levels[id] != null && !f.final)
        stage.appendChild(S("text", { x: p.x - R - 3, y: p.y - R + 2, "text-anchor": "end", "font-size": 11.5, "font-weight": 700, fill: "var(--steel)" }, String(f.levels[id])));
      if (st.mode === "pr" && f.excess && f.excess[id] > 0 && id !== net.t && id !== net.s) {
        stage.appendChild(S("circle", { cx: p.x + R * 0.8, cy: p.y - R * 0.8, r: 9.5, fill: "var(--c-compare)", stroke: "var(--bg-2)", "stroke-width": 2 }));
        stage.appendChild(S("text", { x: p.x + R * 0.8, y: p.y - R * 0.8 + 4, "text-anchor": "middle", "font-size": 11, "font-weight": 800, fill: "#0d1117" }, String(f.excess[id])));
      }
      if (st.mode === "pr" && f.relabel === id) stage.appendChild(S("text", { x: p.x, y: p.y - R - 14, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "var(--ember-2)" }, "↑ relabel"));
    });
    // Dinic current arcs: a small ember tick at the start of each vertex's current arc
    if (st.mode === "dinic" && !X) {
      const G = FC.prep(net);
      Object.entries(curArcs).forEach(([id, a]) => {
        const u = P[G.ids[G.tail[a]]], v = P[G.ids[G.head[a]]];
        if (!u || !v) return;
        const dx = v.x - u.x, dy = v.y - u.y, L = Math.hypot(dx, dy) || 1;
        stage.appendChild(S("circle", { cx: u.x + (dx / L) * (R + 6), cy: u.y + (dy / L) * (R + 6), r: 3.6, fill: "none", stroke: "var(--ember)", "stroke-width": 2 }));
      });
    }
  }

  function drawAux(f) {
    const host = $("aux"); host.innerHTML = "";
    const chip = (t, hot) => E("span", { class: "it" + (hot ? " hot" : "") }, t);
    if (st.mode === "ek") {
      host.appendChild(E("span", { class: "lbl" }, "BFS distances:"));
      const lv = f.levels || {};
      const ids = Object.keys(lv).sort((a, b) => lv[a] - lv[b]);
      if (!ids.length) host.appendChild(E("span", { class: "muted" }, "—"));
      ids.forEach((id) => host.appendChild(chip(`${id}:${lv[id]}`, id === st.net.t)));
    } else if (st.mode === "dinic") {
      host.appendChild(E("span", { class: "lbl" }, "DFS path P:"));
      const s = f.stack || [];
      host.appendChild(s.length ? chip(s.join(" → "), true) : E("span", { class: "muted" }, "—"));
      const lv = f.levels || {};
      if (lv[st.net.t] != null) host.append(E("span", { class: "lbl", style: { marginLeft: "8px" } }, "sink level:"), chip(String(lv[st.net.t])));
    } else {
      host.appendChild(E("span", { class: "lbl" }, $("sel").value === "fifo" ? "Active queue (FIFO):" : "Active vertices (highest first):"));
      let q = (f.queue || []).slice();
      if ($("sel").value !== "fifo" && f.heights) q.sort((a, b) => f.heights[b] - f.heights[a]);
      if (!q.length) host.appendChild(E("span", { class: "muted" }, "none"));
      q.forEach((id) => host.appendChild(chip(`${id} (h${f.heights[id]}, e${f.excess[id]})`)));
      host.append(E("span", { class: "lbl", style: { marginLeft: "8px" } }, "at sink:"), chip(String(f.excess ? f.excess[st.net.t] : 0), true));
    }
  }

  function legend() {
    const L = $("legend"); L.innerHTML = "";
    const item = (c, t, line, dash) => L.appendChild(E("span", null, E("i", { style: line ? { background: dash ? `repeating-linear-gradient(90deg, ${c} 0 5px, transparent 5px 8px)` : c, height: "4px", width: "18px", verticalAlign: "3px" } : { background: c } }), t));
    item("var(--steel)", "edge carrying flow", 1);
    item("var(--ember)", st.mode === "pr" ? "push (downhill)" : "augmenting path", 1);
    item("var(--c-pivot)", "edge used backwards", 1, 1);
    if (st.mode === "ek") item("var(--c-active)", "reached by BFS (number = distance)");
    if (st.mode === "dinic") { item("var(--c-active)", "in the level graph"); item("var(--ember)", "on the DFS path"); item("var(--c-compare)", "arc being tried", 1); item("var(--c-dim)", "dead end"); }
    if (st.mode === "pr") { item("var(--c-compare)", "active: has excess (badge)"); item("var(--ember)", "vertex being discharged"); }
    item("var(--c-swap)", "minimum-cut edge", 1, 1);
    item("var(--c-done)", "source side of the cut");
  }

  function render(f, i) {
    draw(f);
    code.highlight(f.line);
    ctr.set(f.ctr);
    say.say(f.text);
    predict.update(f, i);
    drawAux(f);
    const thm = $("thm");
    if (f.final) thm.innerHTML = `<b>Max-flow min-cut.</b> Maximum flow = <b>${f.ctr.value}</b> = capacity of the cut {${f.cut.edges.map((k) => `(${st.net.edges[k].u},${st.net.edges[k].v})`).join(", ")}} = <b>${f.cut.cap}</b>. Every cut edge is full, and every edge from the sink side back to the source side is empty.`;
    else thm.innerHTML = st.mode === "pr"
      ? `<b>Why it works.</b> Heights never let flow climb: an arc with room left always goes down at most one level. So once the source is at height n, no residual path from source to sink can exist — the flow is maximum as soon as no excess is left inside.`
      : st.mode === "dinic"
      ? `<b>Why phases are few.</b> A blocking flow saturates at least one arc on every shortest path, so after each phase the sink's level goes up. Levels are below n, so there are at most n − 1 phases.`
      : `<b>Edmonds–Karp's guarantee.</b> With shortest paths, distances from the source never decrease, and every augmentation saturates some arc, which then cannot be critical again until the distance grows. That bounds the work by O(VE) augmentations of O(E) each.`;
  }
  const player = Forge.player($("player"), { frames: [], render, fps: 2 });

  /* ------------------------------------------------------------ runs */
  function prOpts() { return { select: $("sel").value, gap: $("gap").checked }; }
  function runMode(mode, frames) {
    if (mode === "ek") return FC.edmondsKarp(st.net, { frames });
    if (mode === "dinic") return FC.dinic(st.net, { frames });
    return FC.pushRelabel(st.net, Object.assign({ frames }, prOpts()));
  }
  function rebuild() {
    $("err").textContent = "";
    if (!st.net.edges.length) { $("err").textContent = "⚠ The network has no edges."; }
    st.run = runMode(st.mode, true);
    st.maxH = Math.max(st.net.nodes.length, ...st.run.frames.map((f) => (f.heights ? Math.max(...Object.values(f.heights)) : 0)));
    $("code").innerHTML = ""; code = Forge.code($("code"), LINES[st.mode]);
    $("ctr").innerHTML = ""; ctr = Forge.counters($("ctr"), CTR0[st.mode]);
    $("prOpts").hidden = st.mode !== "pr";
    $("layBox").hidden = st.mode !== "dinic";
    legend();
    predict.reset();
    player.load(st.run.frames);
    compare();
  }
  function compare() {
    const T = $("cmp"); T.innerHTML = "";
    const truth = FC.bruteMinCut(st.net);
    const rows = [
      ["Edmonds–Karp", FC.edmondsKarp(st.net)], ["Dinic", FC.dinic(st.net)],
      ["Push–relabel, FIFO", FC.pushRelabel(st.net, { select: "fifo" })], ["Push–relabel, FIFO + gap", FC.pushRelabel(st.net, { select: "fifo", gap: true })],
      ["Push–relabel, highest label", FC.pushRelabel(st.net, { select: "highest" })], ["Push–relabel, highest + gap", FC.pushRelabel(st.net, { select: "highest", gap: true })],
    ];
    const best = Math.min(...rows.map((r) => r[1].ctr["arc inspections"]));
    T.appendChild(E("tr", null, ["Algorithm", "Max flow", "Agrees", "Augmentations", "Phases / BFS", "Pushes (sat. / non-sat.)", "Relabels (gap lifts)", "Arc inspections"].map((h) => E("th", null, h))));
    rows.forEach(([name, r]) => {
      const c = r.ctr, isPR = "relabels" in c;
      T.appendChild(E("tr", null, E("td", null, name), E("td", null, String(r.value)), E("td", { class: r.value === truth ? "ok" : "bad" }, r.value === truth ? "✓" : "✗"),
        E("td", null, isPR ? "—" : String(c.augmentations)), E("td", null, "phases" in c ? `${c.phases} phases` : "BFS runs" in c ? `${c["BFS runs"]} BFS` : "—"),
        E("td", null, isPR ? `${c["saturating pushes"]} / ${c["non-saturating pushes"]}` : "—"), E("td", null, isPR ? `${c.relabels} (${c["gap lifts"]})` : "—"),
        E("td", { class: c["arc inspections"] === best ? "best" : "" }, String(c["arc inspections"]))));
    });
    T.appendChild(E("tr", null, E("td", { colspan: 8, class: "muted", style: { textAlign: "left", whiteSpace: "normal" } }, `Brute-force minimum cut over all ${2 ** Math.max(0, st.net.nodes.length - 2)} source/sink splits: ${truth}. n = ${st.net.nodes.length}, m = ${st.net.edges.length}.`)));
  }

  /* ------------------------------------------------------------ editor + presets */
  function buildEditor() {
    const host = $("edges"); host.innerHTML = "";
    st.net.edges.forEach((e, k) => {
      const inp = E("input", { type: "number", min: 1, max: 99, value: e.cap, "aria-label": `capacity of ${e.u} to ${e.v}` });
      inp.addEventListener("change", () => { const v = Math.max(1, Math.min(99, Math.round(+inp.value) || 1)); inp.value = v; st.net.edges[k].cap = v; rebuild(); });
      host.appendChild(E("div", { class: "edge-row" }, E("span", { class: "mono" }, `${e.u}→${e.v}`), inp,
        E("button", { class: "btn sm ghost", title: "remove edge", "aria-label": `remove edge ${e.u} to ${e.v}`, onclick: () => { st.net.edges.splice(k, 1); buildEditor(); rebuild(); } }, "✕")));
    });
    const ids = st.net.nodes.map((n) => n.id);
    const fromSel = E("select", { "aria-label": "new edge from" }, ids.filter((v) => v !== st.net.t).map((v) => E("option", { value: v }, v)));
    const toSel = E("select", { "aria-label": "new edge to" }, ids.filter((v) => v !== st.net.s).map((v) => E("option", { value: v }, v)));
    const capIn = E("input", { type: "number", min: 1, max: 99, value: 3, "aria-label": "new edge capacity" });
    host.appendChild(E("div", { class: "edge-row add" }, fromSel, "→", toSel, capIn, E("button", { class: "btn sm", onclick: () => {
      const u = fromSel.value, v = toSel.value;
      if (u === v) { $("err").textContent = "⚠ An edge needs two different vertices."; return; }
      if (st.net.edges.some((e) => e.u === u && e.v === v)) { $("err").textContent = `⚠ Edge ${u}→${v} already exists — edit its capacity instead.`; return; }
      st.net.edges.push({ u, v, cap: Math.max(1, Math.min(99, Math.round(+capIn.value) || 1)) });
      buildEditor(); rebuild();
    } }, "Add edge")));
  }
  function setPreset() {
    const p = $("preset").value;
    $("kBox").hidden = p !== "chain";
    $("seedBox").hidden = p !== "random";
    st.net = p === "random" ? FC.randomNet(+$("seed").value || 1) : p === "chain" ? FC.PRESETS.chain(+$("k").value) : FC.PRESETS[p]();
    buildEditor(); rebuild();
  }
  $("preset").onchange = setPreset;
  $("k").oninput = () => ($("kOut").textContent = $("k").value);
  $("k").onchange = setPreset;
  $("seed").onchange = setPreset;
  $("rand").onclick = () => { $("preset").value = "random"; $("seed").value = 1 + Math.floor(Math.random() * 999); setPreset(); };
  $("sel").onchange = rebuild;
  $("gap").onchange = rebuild;
  $("layered").onchange = () => { const f = player.frames[player.index]; if (f) draw(f); };
  document.querySelectorAll(".modes .btn").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll(".modes .btn").forEach((x) => x.classList.toggle("on", x === b));
    st.mode = b.dataset.mode;
    rebuild();
  }));
  let rsz = null;
  window.addEventListener("resize", () => { clearTimeout(rsz); rsz = setTimeout(() => { const f = player.frames[player.index]; if (f) draw(f); }, 150); });
  setPreset();
})();
