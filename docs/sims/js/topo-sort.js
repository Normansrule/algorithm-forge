/* Topological sorting: DFS-based and source removal (Levitin §4.2). */
(function () {
  "use strict";
  Forge.page({ title: "Topological Sorting", chapter: "Ch 4 · Decrease-and-Conquer" });
  const $ = (id) => document.getElementById(id);
  const W = 760, H = 400, R = 24;
  const stage = $("stage"), line = $("line");
  const say = Forge.narrate($("say"));
  const pred = FX.predict($("predict"));
  let code = null, ctr = null, runId = 0, algo = "dfs", tool = "add";
  let g = { nodes: [], edges: [] };

  const PRESETS = {
    courses: { nodes: [["C1", 110, 100], ["C2", 110, 300], ["C3", 320, 200], ["C4", 510, 90], ["C5", 650, 280]], edges: "C1>C3 C2>C3 C3>C4 C3>C5 C4>C5" },
    food: {
      nodes: [["plankton", 80, 90], ["shrimp", 230, 60], ["fish", 380, 110], ["wheat", 90, 310], ["sheep", 290, 300], ["human", 520, 210], ["tiger", 680, 320]],
      edges: "plankton>shrimp shrimp>fish plankton>fish fish>human wheat>sheep sheep>human sheep>tiger human>tiger",
    },
    cyclic: { nodes: [["a", 90, 200], ["b", 280, 90], ["c", 480, 90], ["d", 400, 300], ["e", 200, 320], ["f", 660, 200]], edges: "a>b b>c c>d d>b a>e e>d c>f" },
    wide: { nodes: [["a", 90, 70], ["b", 90, 200], ["c", 90, 330], ["d", 320, 130], ["e", 320, 300], ["f", 520, 200], ["g", 680, 200]], edges: "a>d b>d c>e d>f e>f f>g b>e" },
    empty: { nodes: [], edges: "" },
  };
  function loadPreset(name) {
    const p = PRESETS[name];
    g = { nodes: p.nodes.map(([id, x, y]) => ({ id, x, y })), edges: p.edges.split(/\s+/).filter(Boolean).map((s) => { const [u, v] = s.split(">"); return { u, v, directed: true }; }) };
    ed.clearSelection();
    rerecord();
  }
  function randomDag() {
    const r = Forge.rng(Date.now()), n = 6 + Math.floor(r() * 3);
    const labels = Array.from({ length: n }, (_, k) => String.fromCharCode(97 + k));
    const perm = labels.slice().sort(() => r() - 0.5); // hidden topological order
    const cols = 4, byCol = {};
    g = { nodes: [], edges: [] };
    perm.forEach((id, k) => {
      const c = Math.min(cols - 1, Math.floor((k * cols) / n)); byCol[c] = (byCol[c] || 0) + 1;
      g.nodes.push({ id, x: 90 + c * 190 + Math.round((r() - 0.5) * 40), y: 60 + (byCol[c] - 1) * 120 + Math.round(r() * 30) });
    });
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (r() < (b - a <= 2 ? 0.45 : 0.15)) g.edges.push({ u: perm[a], v: perm[b], directed: true });
    ed.clearSelection();
    rerecord();
  }

  const ids = () => g.nodes.map((n) => n.id).sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  function outOf() {
    const O = {};
    g.nodes.forEach((n) => (O[n.id] = []));
    g.edges.forEach((e) => { if (O[e.u] && O[e.v] && e.u !== e.v && !O[e.u].includes(e.v)) O[e.u].push(e.v); });
    for (const k in O) O[k].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
    return O;
  }
  const edgeList = (O) => { const L = []; for (const u in O) O[u].forEach((v) => L.push([u, v])); return L; };

  const DFS_LINES = [
    "ALGORITHM TopoSortDFS(G)",
    "    // G is a digraph; lists its vertices so every edge points forward",
    "    mark every vertex unvisited;  popOrder ← empty list",
    "    for each vertex v in V do",
    "        if v is unvisited then dfs(v)",
    "    return popOrder reversed",
    "",
    "dfs(v)",
    "    mark v visited;  push v onto the stack",
    "    for each edge (v, w) leaving v do",
    "        if w is unvisited then dfs(w)          // tree edge",
    "        else if w is still on the stack then",
    "            return \"not a DAG\"               // back edge: a cycle",
    "        // else w was popped already: harmless",
    "    pop v;  append(popOrder, v)              // v is a dead end",
  ];
  const SRC_LINES = [
    "ALGORITHM TopoSortSourceRemoval(G)",
    "    for each vertex v in V do inDeg[v] ← number of edges into v",
    "    order ← empty list",
    "    while some vertex remains do",
    "        if no remaining vertex has inDeg = 0 then",
    "            return \"not a DAG\"   // every vertex has an incoming edge",
    "        s ← a remaining vertex with inDeg[s] = 0   // a source",
    "        append(order, s)",
    "        for each edge (s, w) leaving s do",
    "            inDeg[w] ← inDeg[w] − 1",
    "        delete s and its edges from G",
    "    return order",
  ];

  /* ---------- DFS-based ---------- */
  function recordDFS() {
    const O = outOf(), V = ids(), n = V.length, frames = [];
    const st = { mark: {}, stack: [], popNo: {}, pushNo: {}, cls: {}, popOrder: [], edges: 0, pushes: 0 };
    let stop = null, askedFirstPop = false;
    // look-ahead for the "first pop" question
    // (null if a back edge would show up before any vertex is popped)
    const firstPop = (() => {
      const seen = {}, on = {}; let ans = null, cyc = false;
      (function go(v) {
        seen[v] = on[v] = 1;
        for (const w of O[v]) { if (on[w]) { cyc = true; return; } if (!seen[w]) { go(w); if (ans || cyc) return; } }
        if (!ans) ans = v;
      })(V[0]);
      return cyc ? null : ans;
    })();
    const snap = (o) => frames.push(Object.assign({ mark: { ...st.mark }, stack: st.stack.slice(), popNo: { ...st.popNo }, pushNo: { ...st.pushNo }, cls: { ...st.cls }, popOrder: st.popOrder.slice(), edges: st.edges, pushes: st.pushes }, o));
    snap({ line: 2, text: `Every vertex is unvisited and the pop list is empty. We run DFS and write down each vertex at the moment it becomes a <b>dead end</b> (is popped).` });
    function dfs(v) {
      st.mark[v] = true; st.stack.push(v); st.pushes++; st.pushNo[v] = st.pushes;
      let ask = null;
      if (!askedFirstPop && firstPop) {
        askedFirstPop = true;
        const opts = [firstPop]; V.forEach((x) => { if (opts.length < 4 && !opts.includes(x)) opts.push(x); });
        ask = { q: `DFS just started at <b>${v}</b>. Which vertex will be <b>popped first</b> (the first dead end)?`, options: opts.sort().map((x) => ({ label: x, value: x })), answer: firstPop,
          why: `${firstPop} is reached by always following the first unvisited out-edge, and it has no unvisited out-neighbors. In a DAG the first vertex popped is always a sink (no way forward), so it will be last in the order.` };
      }
      snap({ line: 8, cur: v, text: `Visit <b>${v}</b> and push it onto the stack.` + (O[v].length ? ` Its out-edges go to ${O[v].join(", ")}.` : " It has no out-edges."), ask });
      for (const w of O[v]) {
        st.edges++;
        const k = v + ">" + w;
        if (!st.mark[w]) {
          st.cls[k] = "tree";
          snap({ line: [9, 10], cur: v, chk: w, edge: [v, w], text: `Edge ${v} → <b>${w}</b>: ${w} is unvisited, so DFS goes there (tree edge).` });
          dfs(w);
          if (stop) return;
          snap({ line: 9, cur: v, text: `Back at <b>${v}</b>. Continue with its remaining out-edges.` });
        } else if (st.stack.includes(w)) {
          st.cls[k] = "back";
          const cyc = st.stack.slice(st.stack.indexOf(w)).concat([w]);
          stop = cyc;
          snap({ line: [11, 12], cur: v, chk: w, edge: [v, w], cycle: cyc, text: `Edge ${v} → <b>${w}</b>, but ${w} is <b>still on the stack</b>: this is a back edge. Following the stack from ${w} up to ${v} and back gives the directed cycle <b>${cyc.join(" → ")}</b>. A cycle can't be drawn with all arrows pointing forward, so this graph is <b>not a DAG</b> and has no topological order.` });
          return;
        } else {
          st.cls[k] = "fwd";
          snap({ line: [11, 13], cur: v, chk: w, edge: [v, w], text: `Edge ${v} → <b>${w}</b>: ${w} was already popped, so it is already placed to the right of wherever ${v} will go. Harmless (a forward or cross edge).` });
        }
      }
      st.stack.pop(); st.popOrder.push(v); st.popNo[v] = st.popOrder.length;
      snap({ line: 14, cur: v, popped: v, text: `<b>${v}</b> is a dead end: pop it (pop #${st.popOrder.length}) and write it down. It goes into the <b>rightmost</b> free slot, because everything ${v} points to is already placed to its right.` });
    }
    for (const v of V) {
      if (stop) break;
      if (!st.mark[v]) { snap({ line: [3, 4], chk: v, text: `Outer loop: <b>${v}</b> is unvisited, so start dfs(${v}).` }); dfs(v); }
    }
    if (stop) { frames.meta = { order: null, cycle: stop, O }; return frames; }
    const order = st.popOrder.slice().reverse();
    const last = st.popOrder[n - 1];
    const opts = [last]; st.popOrder.forEach((x) => { if (opts.length < 4 && !opts.includes(x)) opts.push(x); });
    snap({ line: 3, text: `All vertices are popped. Pop order: <b>${st.popOrder.join(", ")}</b>. No back edge appeared, so the graph is a DAG.`,
      ask: { q: `The pop order is ${st.popOrder.join(", ")}. Which vertex comes <b>first</b> in the topological order?`, options: opts.sort().map((x) => ({ label: x, value: x })), answer: last, why: `Reverse the pop order: the last vertex popped (${last}) comes first.` } });
    snap({ line: 5, final: true, order, text: `Reverse it: <b>${order.join(", ")}</b>. Why it works: when a vertex is popped, every vertex it points to was popped earlier (otherwise that edge would be a back edge), so after reversing, every edge points forward.` });
    frames.meta = { order, O };
    return frames;
  }

  /* ---------- source removal ---------- */
  function recordSrc() {
    const O = outOf(), V = ids(), frames = [];
    const inDeg = {}; V.forEach((v) => (inDeg[v] = 0));
    edgeList(O).forEach(([, v]) => inDeg[v]++);
    const st = { removed: {}, order: [], updates: 0, checks: 0 };
    let asks = 0;
    const snap = (o) => frames.push(Object.assign({ inDeg: { ...inDeg }, removed: { ...st.removed }, order: st.order.slice(), updates: st.updates, checks: st.checks, pops: st.order.length }, o));
    snap({ line: [1, 2], text: `Count incoming edges for every vertex: ${V.map((v) => `${v}: ${inDeg[v]}`).join(", ")}. Vertices with in-degree 0 are <b>sources</b>: nothing has to come before them.` });
    while (st.order.length < V.length) {
      const remain = V.filter((v) => !st.removed[v]);
      st.checks += remain.length;
      const sources = remain.filter((v) => inDeg[v] === 0);
      if (!sources.length) {
        // find a cycle among the remaining vertices by walking backwards along incoming edges
        const inc = {}; remain.forEach((v) => (inc[v] = []));
        edgeList(O).forEach(([u, v]) => { if (!st.removed[u] && !st.removed[v]) inc[v].push(u); });
        let x = remain[0]; const path = [], seen = {};
        while (!(x in seen)) { seen[x] = path.length; path.push(x); x = inc[x][0]; }
        const cyc = path.slice(seen[x]).reverse(); cyc.push(cyc[0]);
        snap({ line: [3, 4, 5], cycle: cyc, text: `${remain.length} vertices remain (${remain.join(", ")}) but <b>none has in-degree 0</b>: each still has an incoming edge. Walking those edges backwards must eventually repeat a vertex, giving the cycle <b>${cyc.join(" → ")}</b>. <b>Not a DAG</b>, so no topological order exists.` });
        frames.meta = { order: null, cycle: cyc, O };
        return frames;
      }
      const s = sources[0];
      let ask = null;
      if (asks < 2 && (st.order.length === 0 || st.order.length === 2) && remain.length > 1) {
        asks++;
        const opts = [s]; remain.forEach((x) => { if (opts.length < 4 && !opts.includes(x)) opts.push(x); });
        ask = { q: `Look at the in-degree table. Which vertex will be removed next? (Ties go alphabetically.)`, options: opts.sort().map((x) => ({ label: x, value: x })), answer: s,
          why: `Sources right now: ${sources.join(", ")}. ${sources.length > 1 ? `Any of them would be correct; the tie-break picks ${s}.` : `${s} is the only vertex with in-degree 0.`}` };
      }
      if (ask) snap({ line: [3, 4], text: `${remain.length} vertices remain. Before we pick: scan the in-degree table for a vertex with in-degree 0.`, ask });
      snap({ line: [3, 4, 6], cur: s, sources, text: `Remaining sources: <b>${sources.join(", ")}</b>. Pick <b>${s}</b>.` });
      st.order.push(s); st.removed[s] = true;
      const dec = [];
      O[s].forEach((w) => { inDeg[w]--; st.updates++; dec.push(w); });
      snap({ line: [7, 8, 9, 10], cur: s, dec, text: `Append <b>${s}</b> to the order and delete it.` + (dec.length ? ` Its out-edges go to ${dec.join(", ")}, so their in-degrees drop by 1${dec.filter((w) => inDeg[w] === 0).length ? `; now ${dec.filter((w) => inDeg[w] === 0).join(", ")} ${dec.filter((w) => inDeg[w] === 0).length > 1 ? "become sources" : "becomes a source"}` : ""}.` : " It has no out-edges, so no in-degree changes.") });
    }
    snap({ line: 11, final: true, order: st.order.slice(), text: `Every vertex was removed as a source: <b>${st.order.join(", ")}</b>. Each vertex was deleted only after everything pointing into it, so every edge points forward.` });
    frames.meta = { order: st.order.slice(), O };
    return frames;
  }

  /* ---------- render ---------- */
  let frames = [], lastFrame = null;
  const player = Forge.player($("player"), {
    frames: [], fps: 2,
    render(f, i, fr) {
      frames = fr; draw(f);
      code.highlight(f.line); say.say(f.text);
      if (f.ask) { const key = runId + ":" + i; pred.show(f.ask, key); if (pred.shouldPause(key)) player.pause(); } else pred.hide();
    },
  });
  function shrinkLabels(svg) {
    svg.querySelectorAll("text").forEach((t) => { const L = t.textContent.length; if (t.getAttribute("font-weight") === "700" && L > 4) t.setAttribute("font-size", L > 6 ? 9.5 : 11); });
  }
  function draw(f) {
    lastFrame = f;
    const meta = frames.meta, O = meta.O, V = ids();
    const ns = {}, es = {}, note = {};
    const cycEdges = new Set();
    if (f.cycle) for (let k = 0; k + 1 < f.cycle.length; k++) cycEdges.add(f.cycle[k] + ">" + f.cycle[k + 1]);
    if (algo === "dfs") {
      V.forEach((v) => {
        if (f.mark[v]) { ns[v] = f.popNo[v] ? "done" : "pivot"; note[v] = f.pushNo[v] + (f.popNo[v] ? "," + f.popNo[v] : ""); }
      });
      for (const k in f.cls) { const [u, v] = k.split(">"); if (f.cls[k] !== "fwd") es[u + "-" + v] = f.cls[k]; }
    } else {
      V.forEach((v) => { if (f.removed[v]) ns[v] = "dim"; else if (f.inDeg[v] === 0) ns[v] = "done"; note[v] = f.removed[v] ? "removed" : "in " + f.inDeg[v]; });
      edgeList(O).forEach(([u, v]) => { if (f.removed[u]) es[u + "-" + v] = "dim"; });
      if (f.dec) f.dec.forEach((w) => (ns[w] = "swap"));
    }
    if (f.cur && !f.final) ns[f.cur] = "active";
    if (f.chk) ns[f.chk] = "compare";
    if (f.edge) es[f.edge[0] + "-" + f.edge[1]] = f.cycle ? "back" : "active";
    if (f.cycle) { f.cycle.forEach((v) => (ns[v] = "swap")); cycEdges.forEach((k) => { const [u, v] = k.split(">"); if (es[u + "-" + v] !== "back") es[u + "-" + v] = "active"; }); }
    Forge.graph(stage, g, { width: W, height: H, r: R, nodeState: ns, edgeState: es, nodeNote: note });
    shrinkLabels(stage);
    if (!g.nodes.length) stage.appendChild(Forge.svg("text", { x: W / 2, y: H / 2, "text-anchor": "middle", "font-size": 16, fill: "var(--muted)" }, "Click anywhere to add a vertex"));
    ed.decorate();

    // the line
    const n = V.length, LW = 760, LH = 200, base = 150, r = 22;
    line.setAttribute("viewBox", `0 0 ${LW} ${LH}`);
    line.innerHTML = "";
    line.appendChild(Forge.svg("defs", null, Forge.svg("marker", { id: "ts-arr", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, Forge.svg("path", { d: "M0 0 L10 5 L0 10 z", fill: "var(--ember)" }))));
    const slotX = (k) => (n <= 1 ? LW / 2 : 50 + (k * (LW - 100)) / (n - 1));
    const slot = {};
    if (algo === "dfs") f.popOrder.forEach((v, k) => (slot[v] = n - 1 - k));
    else f.order.forEach((v, k) => (slot[v] = k));
    for (let k = 0; k < n; k++) line.appendChild(Forge.svg("rect", { x: slotX(k) - r, y: base - r, width: 2 * r, height: 2 * r, rx: 8, fill: "none", stroke: "var(--line)", "stroke-dasharray": "4 4" }));
    edgeList(O).forEach(([u, v]) => {
      if (slot[u] == null || slot[v] == null) return;
      const x1 = slotX(slot[u]), x2 = slotX(slot[v]), hgt = Math.min(118, 26 + 16 * Math.abs(slot[v] - slot[u]));
      const bad = slot[v] < slot[u];
      line.appendChild(Forge.svg("path", { d: `M${x1} ${base - r} C ${x1} ${base - r - hgt}, ${x2} ${base - r - hgt}, ${x2} ${base - r - 2}`, fill: "none", stroke: bad ? "var(--bad)" : "var(--ember)", "stroke-width": 2, "marker-end": "url(#ts-arr)", opacity: 0.85 }));
    });
    for (const v in slot) {
      const x = slotX(slot[v]);
      line.appendChild(Forge.svg("circle", { cx: x, cy: base, r, fill: v === f.popped || (algo === "src" && v === f.cur && f.dec) ? "var(--c-active)" : "var(--c-done)" }));
      const t = Forge.svg("text", { x, y: base + 4.5, "text-anchor": "middle", "font-size": v.length > 6 ? 9.5 : v.length > 4 ? 11 : 13, "font-weight": 700, fill: "#0d1117" }, v);
      line.appendChild(t);
      line.appendChild(Forge.svg("text", { x, y: base + r + 16, "text-anchor": "middle", "font-size": 11, fill: "var(--muted)" }, String(slot[v] + 1)));
    }
    if (f.cycle) line.appendChild(Forge.svg("text", { x: LW / 2, y: 40, "text-anchor": "middle", "font-size": 15, "font-weight": 700, fill: "var(--bad)" }, "Cycle " + f.cycle.join(" → ") + ": no order can make every arrow point right"));
    else if (!Object.keys(slot).length) line.appendChild(Forge.svg("text", { x: LW / 2, y: 60, "text-anchor": "middle", "font-size": 13, fill: "var(--muted)" }, algo === "dfs" ? "Popped vertices will fill these slots from the right" : "Removed sources will fill these slots from the left"));

    // data structure panel
    if (algo === "dfs") {
      const pushes = Object.keys(f.pushNo).sort((a, b) => f.pushNo[a] - f.pushNo[b]);
      $("ds").innerHTML = `<div class="small muted" style="margin-bottom:4px">bottom ↓ … top ↑</div><div class="ds-stack">${f.stack.map((v, k) => `<span class="ds-box${k === f.stack.length - 1 ? " top" : ""}">${v}</span>`).join("") || '<span class="muted small">(empty)</span>'}</div>` +
        `<div class="ds-row"><div class="k">Push order</div><div class="fx-chips">${pushes.map((v) => `<span>${v}</span>`).join("") || "—"}</div></div>` +
        `<div class="ds-row"><div class="k">Pop order</div><div class="fx-chips">${f.popOrder.map((v) => `<span class="done">${v}</span>`).join("") || "—"}</div></div>` +
        `<div class="ds-row"><div class="k">Pop order reversed = topological order</div><div class="fx-chips">${f.final ? f.order.map((v) => `<span class="on">${v}</span>`).join("") : '<span class="dim">(after the last pop)</span>'}</div></div>`;
      ctr.set({ pushes: f.pushes, pops: f.popOrder.length, "edges examined": f.edges, "back edges": Object.values(f.cls).filter((c) => c === "back").length });
    } else {
      let h = `<div class="scroll-x"><table class="t"><thead><tr><th>vertex</th>${V.map((v) => `<th>${v}</th>`).join("")}</tr></thead><tbody><tr><th>in-degree</th>`;
      h += V.map((v) => { const c = f.removed[v] && v !== f.cur ? "gone" : [f.inDeg[v] === 0 ? "zero" : "", f.dec && f.dec.includes(v) ? "dec" : "", v === f.cur ? "pick" : ""].join(" "); return `<td class="${c}">${f.removed[v] && v !== f.cur ? "—" : f.inDeg[v]}</td>`; }).join("");
      h += `</tr></tbody></table></div><div class="ds-row"><div class="k">Order so far</div><div class="fx-chips">${f.order.map((v) => `<span class="done">${v}</span>`).join("") || "—"}</div></div>`;
      $("ds").innerHTML = h;
      ctr.set({ removed: f.pops, "in-degree updates": f.updates, "in-degree checks": f.checks, "|V| + |E|": V.length + edgeList(O).length });
    }
  }

  function setupAlgo() {
    $("code").innerHTML = ""; $("ctr").innerHTML = "";
    code = Forge.code($("code"), algo === "dfs" ? DFS_LINES : SRC_LINES);
    ctr = Forge.counters($("ctr"), algo === "dfs" ? { pushes: 0, pops: 0, "edges examined": 0, "back edges": 0 } : { removed: 0, "in-degree updates": 0, "in-degree checks": 0, "|V| + |E|": 0 });
    $("dsTitle").textContent = algo === "dfs" ? "DFS stack and pop order" : "In-degree table";
    const items = algo === "dfs"
      ? [["var(--c-active)", "top of stack"], ["var(--c-compare)", "out-neighbor checked"], ["var(--c-pivot)", "on the stack"], ["var(--c-done)", "popped"], ["var(--ember)", "tree edge", 1], ["var(--c-pivot)", "back edge (dashed)", 1], ["var(--c-swap)", "cycle"]]
      : [["var(--c-active)", "source being removed"], ["var(--c-done)", "source (in-degree 0)"], ["var(--c-swap)", "in-degree just dropped / cycle"], ["var(--c-dim)", "removed"]];
    $("legend").innerHTML = items.map(([c, t, l]) => `<span><i style="background:${c};${l ? "height:3px;width:16px;vertical-align:3px" : ""}"></i>${t}</span>`).join("");
  }
  function rerecord() {
    let fr;
    if (!g.nodes.length) {
      fr = [{ line: 0, mark: {}, stack: [], popNo: {}, pushNo: {}, cls: {}, popOrder: [], edges: 0, pushes: 0, inDeg: {}, removed: {}, order: [], updates: 0, checks: 0, pops: 0, text: "The graph is empty. Click the stage to add vertices, then click two vertices to add a directed edge." }];
      fr.meta = { order: null, O: {} };
    } else fr = algo === "dfs" ? recordDFS() : recordSrc();
    frames = fr; runId++;
    player.load(fr);
  }
  const ed = FX.graphEditor(stage, {
    graph: () => g, directed: true, tool: () => tool, W, H, R, maxNodes: 14,
    onChange: rerecord, onMove: () => { if (lastFrame) draw(lastFrame); },
  });
  document.querySelectorAll("#algo button").forEach((b) => (b.onclick = () => {
    algo = b.dataset.a; document.querySelectorAll("#algo button").forEach((x) => x.classList.toggle("on", x === b)); setupAlgo(); rerecord();
  }));
  document.querySelectorAll("#tool button").forEach((b) => (b.onclick = () => {
    tool = b.dataset.t; document.querySelectorAll("#tool button").forEach((x) => x.classList.toggle("on", x === b)); ed.clearSelection(); if (lastFrame) draw(lastFrame);
  }));
  $("loadPreset").onclick = () => loadPreset($("preset").value);
  $("preset").onchange = () => loadPreset($("preset").value);
  $("rand").onclick = randomDag;
  setupAlgo();
  loadPreset("courses");
})();
