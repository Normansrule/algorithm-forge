/* Algorithm Forge — Maximum matching in a bipartite graph by BFS augmenting paths (Levitin §10.3).
   Engine is pure and exported for Node tests; UI runs only in the browser. */
(function () {
  "use strict";

  /* ---------------- engine ----------------
     g = {V:[ids], U:[ids], edges:[[v,u],...]}  ids are strings; initial = [[v,u],...] */
  function key(a, b) { return a < b ? a + "|" + b : b + "|" + a; }
  function numSort(a, b) { return (+a - +b) || (a < b ? -1 : a > b ? 1 : 0); }

  function run(g, initial, opts) {
    opts = opts || {};
    const inV = new Set(g.V);
    const adj = {};
    g.V.concat(g.U).forEach((x) => (adj[x] = []));
    g.edges.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
    Object.values(adj).forEach((l) => l.sort(numSort));
    const mate = {};
    (initial || []).forEach(([v, u]) => { mate[v] = u; mate[u] = v; });
    const frames = [];
    const ctr = { "|M|": 0, augmentations: 0, dequeues: 0, "edges examined": 0 };
    ctr["|M|"] = Object.keys(mate).length / 2;
    let label = {}, queue = [], head = 0;
    const M = () => g.V.filter((v) => mate[v]).map((v) => [v, mate[v]]);
    const push = (line, text, extra) => frames.push(Object.assign({ M: M(), label: Object.assign({}, label), queue: queue.slice(), head, line, text, ctr: Object.assign({}, ctr) }, extra || {}));
    const mstr = () => { const m = M(); return m.length ? "{" + m.map(([v, u]) => `(${v},${u})`).join(", ") + "}" : "∅"; };
    const freeV = () => g.V.filter((v) => !mate[v]);
    queue = freeV(); head = 0;
    push(1, `Start with the matching M = ${mstr()}. Free vertices of V go into the queue: [${queue.join(", ") || "empty"}].`);
    let guard = 0;
    while (head < queue.length && guard++ < 5000) {
      const w = queue[head++];
      ctr.dequeues++;
      if (inV.has(w)) {
        push([3, 4], `Dequeue ${w} (in V). Look at each neighbor u of ${w}.`, { cur: w });
        let augmented = false;
        for (const u of adj[w]) {
          ctr["edges examined"]++;
          if (!mate[u]) {
            // augmenting path: u, w, label(w), label(label(w)), ...
            const path = [u, w];
            let v = w;
            while (label[v] != null) { const uu = label[v]; path.push(uu); v = label[uu]; path.push(v); }
            const root = path[path.length - 1];
            const len = path.length - 1;
            const fv = freeV();
            const ask = opts.ask === false ? null : fv.length >= 2
              ? { q: `${u} is free — an augmenting path ends here. Follow the labels back: which free vertex of V does it start at?`, options: fv, answer: root, explain: `Labels lead ${path.join(" → ")}. It starts at free vertex ${root}.` }
              : { q: `${u} is free — an augmenting path ends here. How many edges does it have?`, options: uniq([1, 3, 5, 7, len]).sort((a, b) => a - b).map(String), answer: String(len), explain: `Path ${path.slice().reverse().join(" – ")} has ${len} edge${len > 1 ? "s" : ""} — always an odd number: one more non-matching edge than matching edges.` };
            push(6, `${u} is free! An augmenting path ends at ${u}. ${len === 1 ? `Both ${w} and ${u} are free, so the single edge ${w}–${u} is an augmenting path by itself.` : `Walk back along the labels: ${path.join(" ← ")}. Its edges alternate: not in M, in M, not in M, …`}`, { cur: w, pathV: path.slice().reverse(), ask, edge: [w, u] });
            // flip
            mate[w] = u; mate[u] = w;
            v = w;
            while (label[v] != null) { const uu = label[v]; const vv = label[uu]; mate[vv] = uu; mate[uu] = vv; v = vv; }
            ctr.augmentations++; ctr["|M|"]++;
            const rev = path.slice().reverse();
            push([7, 16, 17, 18, 19], `Augment: add the ${Math.ceil(len / 2)} odd-numbered path edge${len > 1 ? "s" : ""}${len > 1 ? `, remove the ${Math.floor(len / 2)} even-numbered one${len > 3 ? "s" : ""}` : ""}. |M| grows by 1 to ${ctr["|M|"]}: M = ${mstr()}.`, { pathV: rev, flipped: true });
            label = {};
            queue = freeV(); head = 0;
            push(20, `Erase all labels; re-initialize the queue with the free vertices of V: [${queue.join(", ") || "empty"}].`);
            augmented = true;
            break;
          } else if (mate[w] !== u && label[u] == null) {
            label[u] = w; queue.push(u);
            push([8, 9], `${u} is matched (to ${mate[u]}) and unlabeled: label ${u} with ${w} and enqueue it. (${u}'s mate ${mate[u]} might be able to move.)`, { cur: w, edge: [w, u] });
          } else {
            push(8, mate[w] === u ? `${u} is ${w}'s own mate — edge (${w},${u}) is already in M, skip.` : `${u} is already labeled — some earlier path reaches it; skip.`, { cur: w, edge: [w, u], skip: true });
          }
        }
        if (augmented) continue;
      } else {
        const v = mate[w];
        label[v] = w; queue.push(v);
        push([3, 10, 11, 12], `Dequeue ${w} (in U, matched to ${v}). Label its mate ${v} with ${w} and enqueue ${v}: maybe ${v} can switch to another partner and free ${w}.`, { cur: w, edge: [w, v] });
      }
    }
    push(13, `The queue is empty: no augmenting path exists, so by Berge's theorem M = ${mstr()} is a <b>maximum matching</b> (|M| = ${ctr["|M|"]}).`, { done: true });
    return { frames, M: M(), size: ctr["|M|"] };
  }
  function uniq(a) { return [...new Set(a)]; }

  /** BFS 2-coloring of the whole graph; returns {ok, color} or {ok:false, cycle:[...]} */
  function twoColor(ids, edges) {
    const adj = {}; ids.forEach((x) => (adj[x] = []));
    edges.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
    const color = {}, par = {}, depth = {};
    for (const s of ids) {
      if (color[s] != null) continue;
      color[s] = 0; par[s] = null; depth[s] = 0;
      const q = [s];
      for (let h = 0; h < q.length; h++) {
        const x = q[h];
        for (const y of adj[x]) {
          if (color[y] == null) { color[y] = 1 - color[x]; par[y] = x; depth[y] = depth[x] + 1; q.push(y); }
          else if (color[y] === color[x]) {
            // odd cycle: climb from x and y to their common ancestor
            let a = x, b = y; const pa = [a], pb = [b];
            while (a !== b) { if (depth[a] >= depth[b]) { a = par[a]; pa.push(a); } else { b = par[b]; pb.push(b); } }
            pa.pop();
            return { ok: false, cycle: pa.concat(pb.reverse()) };
          }
        }
      }
    }
    return { ok: true, color };
  }

  const Engine = { run, twoColor };
  if (typeof module !== "undefined" && module.exports) module.exports = Engine;
  if (typeof window === "undefined") return;

  /* =====================================================================
     UI
     ===================================================================== */
  const F = window.Forge;
  const $ = (id) => document.getElementById(id);
  F.page({ title: "Bipartite Matching", chapter: "Ch 10 · Iterative Improvement" });

  const PRESETS = {
    textbook: { V: ["1", "2", "3", "4", "5"], U: ["6", "7", "8", "9", "10"], edges: "1-6 1-7 2-6 3-6 3-8 4-8 4-9 4-10 5-9 5-10", init: "4-8 5-9" },
    lesson: { V: ["1", "2", "3", "4"], U: ["5", "6", "7", "8"], edges: "1-5 1-6 2-5 3-5 3-6 3-7 4-7 4-8", init: "" },
    domino: { V: ["1", "2", "3", "4"], U: ["5", "6", "7", "8"], edges: "1-5 2-5 2-6 3-6 3-7 4-7 4-8", init: "2-5 3-6 4-7" },
  };
  const parsePairs = (s) => s.split(/\s+/).filter(Boolean).map((p) => p.split("-"));

  const LINES = [
    "ALGORITHM MaximumBipartiteMatching(G)",
    "    M ← initial matching; Q ← free V vertices",
    "    while not isEmpty(Q) do",
    "        w ← dequeue(Q)",
    "        if w ∈ V then",
    "            for each u adjacent to w do",
    "                if u is free then",
    "                    Augment(w, u); break",
    "                else if (w, u) ∉ M and u unlabeled then",
    "                    label u with w; enqueue(Q, u)",
    "        else   // w ∈ U is matched",
    "            label mate(w) with w",
    "            enqueue(Q, mate(w))",
    "    return M   // no augmenting path: maximum",
    "",
    "ALGORITHM Augment(w, u)",
    "    M ← M ∪ {(w, u)};  v ← w",
    "    while v is labeled do",
    "        u ← label(v);  M ← M − {(v, u)}",
    "        v ← label(u);  M ← M ∪ {(v, u)}",
    "    erase labels; Q ← free V vertices",
  ];
  const code = F.code($("code"), LINES);
  const ctr = F.counters($("ctr"), { "|M|": 0, augmentations: 0, dequeues: 0, "edges examined": 0 });
  const say = F.narrate($("say"));
  const stage = $("stage"), flowSvg = $("flow");

  let g = null;            // {V, U, edges}
  let initM = [];
  let editPick = null;     // first vertex clicked in edit mode
  let colorInfo = null;
  let lastFrame = null;

  /* ---- predict ---- */
  const predictBox = $("predict");
  let askKey = null;
  function showAsk(ask, k) {
    if (!ask) { if (askKey !== null) { predictBox.innerHTML = '<span class="muted small">A prediction prompt appears each time an augmenting path is found.</span>'; askKey = null; } return; }
    if (askKey === k) return;
    askKey = k;
    predictBox.innerHTML = "";
    const res = F.el("div", { class: "res" }), opts = F.el("div", { class: "opts" });
    ask.options.forEach((o) => opts.appendChild(F.el("button", { class: "btn sm", onclick: (e) => {
      const ok = o === ask.answer;
      opts.querySelectorAll("button").forEach((b) => (b.disabled = true));
      e.target.classList.add(ok ? "steel" : "primary");
      res.innerHTML = `${ok ? "✅ Yes!" : `❌ Not quite — it's <b>${ask.answer}</b>.`} ${ask.explain}`;
    } }, o)));
    predictBox.append(F.el("div", { class: "q" }, "🤔 Predict: " + ask.q), opts, res);
    if ($("pausePredict").checked) player.pause();
  }

  /* ---- layout ---- */
  function positions(W) {
    const pos = {};
    const place = (arr, y) => arr.forEach((id, k) => (pos[id] = { x: 70 + ((W - 120) * (k + 0.5)) / arr.length, y }));
    place(g.V, 90); place(g.U, 290);
    return pos;
  }

  function draw(f) {
    const W = 640, H = 370, R = 20;
    stage.setAttribute("viewBox", `0 0 ${W} ${H}`);
    stage.innerHTML = "";
    const S = F.svg;
    const pos = positions(W);
    stage.appendChild(S("text", { x: 14, y: 95, "font-size": 16, "font-weight": 800, fill: "var(--steel)" }, "V"));
    stage.appendChild(S("text", { x: 14, y: 295, "font-size": 16, "font-weight": 800, fill: "var(--c-pivot)" }, "U"));
    const Mset = new Set((f ? f.M : initM).map(([a, b]) => key(a, b)));
    const pathV = f && f.pathV;
    const pathE = new Map();
    if (pathV) for (let k = 0; k + 1 < pathV.length; k++) pathE.set(key(pathV[k], pathV[k + 1]), k % 2 === 0 ? "odd" : "even");
    const cyc = colorInfo && !colorInfo.ok ? colorInfo.cycle : null;
    const cycE = new Set(); if (cyc) cyc.forEach((a, k) => cycE.add(key(a, cyc[(k + 1) % cyc.length])));
    const curE = f && f.edge ? key(f.edge[0], f.edge[1]) : null;
    g.edges.forEach(([a, b]) => {
      const k = key(a, b), A = pos[a], B = pos[b];
      let col = "var(--line-2)", w = 2, dash = "";
      if (Mset.has(k)) { col = "var(--c-done)"; w = 5; }
      if (curE === k) { col = f.skip ? "var(--c-dim)" : "var(--c-compare)"; w = 4; }
      if (pathE.has(k)) { const odd = pathE.get(k) === "odd"; col = f.flipped ? (odd ? "var(--c-done)" : "var(--c-swap)") : odd ? "var(--ember)" : "var(--c-pivot)"; w = 5; dash = f.flipped && !odd ? "6 5" : odd ? "" : "9 5"; }
      if (cycE.has(k)) { col = "var(--c-swap)"; w = 5; dash = "4 4"; }
      let d;
      if (Math.abs(A.y - B.y) < 1) { const my = A.y + (A.y < 200 ? -46 : 46); d = `M${A.x} ${A.y} Q${(A.x + B.x) / 2} ${my} ${B.x} ${B.y}`; }
      else d = `M${A.x} ${A.y} L${B.x} ${B.y}`;
      stage.appendChild(S("path", { d, stroke: col, "stroke-width": w, "stroke-dasharray": dash, fill: "none", "stroke-linecap": "round" }));
      if (editing()) { const hit = S("path", { d, stroke: "transparent", "stroke-width": 14, fill: "none", style: "cursor:pointer" }); hit.addEventListener("click", () => toggleEdge(a, b)); stage.appendChild(hit); }
    });
    const matched = new Set(); (f ? f.M : initM).forEach(([a, b]) => { matched.add(a); matched.add(b); });
    const pathSet = new Set(pathV || []);
    g.V.concat(g.U).forEach((id) => {
      const p = pos[id];
      const isV = g.V.includes(id);
      let fill = matched.has(id) ? "var(--c-done)" : "var(--panel-2)", ink = matched.has(id) ? "#0d1117" : "var(--ink)", stroke = isV ? "var(--steel)" : "var(--c-pivot)", dash = matched.has(id) ? "" : "4 3";
      if (f && f.label[id] != null) { fill = "var(--c-active)"; ink = "#0d1117"; }
      if (f && f.cur === id) { fill = "var(--c-compare)"; ink = "#0d1117"; }
      if (pathSet.has(id) && !f.flipped) { fill = "var(--ember)"; ink = "#1b0f05"; }
      if (editPick === id) { fill = "var(--ember)"; ink = "#1b0f05"; }
      if (colorInfo && colorInfo.ok && colorInfo.mismatch) stroke = colorInfo.color[id] === 0 ? "var(--steel)" : "var(--c-pivot)";
      const c = S("circle", { cx: p.x, cy: p.y, r: R, fill, stroke, "stroke-width": 3, "stroke-dasharray": dash, style: editing() ? "cursor:pointer" : "" });
      if (editing()) c.addEventListener("click", () => pick(id));
      stage.appendChild(c);
      const t = S("text", { x: p.x, y: p.y + 5, "text-anchor": "middle", "font-size": 14, "font-weight": 800, fill: ink, style: editing() ? "cursor:pointer;pointer-events:none" : "pointer-events:none" }, id);
      stage.appendChild(t);
      if (f && f.label[id] != null) {
        const ly = isV ? p.y - R - 12 : p.y + R + 20;
        stage.appendChild(S("rect", { x: p.x - 18, y: ly - 13, width: 36, height: 19, rx: 9, fill: "var(--ember-soft)", stroke: "var(--ember)" }));
        stage.appendChild(S("text", { x: p.x, y: ly + 1, "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: "var(--ember-2)" }, "←" + f.label[id]));
      }
    });
    // queue
    const qh = $("queue"); qh.innerHTML = "";
    if (f) {
      qh.appendChild(F.el("span", { class: "small muted" }, "Queue: "));
      if (!f.queue.length) qh.appendChild(F.el("span", { class: "small muted" }, "empty"));
      f.queue.forEach((v, k) => qh.appendChild(F.el("span", { class: "chip" + (k < f.head ? "" : " steel"), style: k < f.head ? { opacity: 0.55 } : null }, v + (k < f.head ? " ↑" : ""))));
      qh.appendChild(F.el("span", { class: "small", style: { marginLeft: "auto" } }, `M = ${f.M.length ? "{" + f.M.map(([v, u]) => `(${v},${u})`).join(", ") + "}" : "∅"}`));
    }
    drawFlow(f);
  }

  /* ---- reduction to max flow ---- */
  function drawFlow(f) {
    const n = Math.max(g.V.length, g.U.length);
    const W = 640, H = Math.max(220, 50 + n * 48);
    flowSvg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    flowSvg.innerHTML = "";
    const S = F.svg;
    const defs = S("defs", null);
    [["a", "var(--line-2)"], ["d", "var(--c-done)"], ["e", "var(--ember)"], ["p", "var(--c-pivot)"]].forEach(([id, col]) => defs.appendChild(S("marker", { id: "bf-" + id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto" }, S("path", { d: "M0 0 L10 5 L0 10 z", fill: col }))));
    flowSvg.appendChild(defs);
    const pos = { s: { x: 50, y: H / 2 }, t: { x: W - 50, y: H / 2 } };
    const col = (arr, x) => arr.forEach((id, k) => (pos[id] = { x, y: 30 + ((H - 60) * (k + 0.5)) / arr.length }));
    col(g.V, 220); col(g.U, 420);
    const M = f ? f.M : initM;
    const mateOf = {}; M.forEach(([v, u]) => { mateOf[v] = u; mateOf[u] = v; });
    const pathV = f && f.pathV && !f.flipped ? f.pathV : null;
    const onPath = new Map();
    if (pathV) {
      onPath.set("s|" + pathV[0], "+");
      for (let k = 0; k + 1 < pathV.length; k++) onPath.set(k % 2 === 0 ? pathV[k] + "|" + pathV[k + 1] : pathV[k + 1] + "|" + pathV[k], k % 2 === 0 ? "+" : "−");
      onPath.set(pathV[pathV.length - 1] + "|t", "+");
    }
    const R = 14;
    const edge = (a, b, flow) => {
      const A = pos[a], B = pos[b];
      const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy);
      const x1 = A.x + (dx / L) * R, y1 = A.y + (dy / L) * R, x2 = B.x - (dx / L) * (R + 3), y2 = B.y - (dy / L) * (R + 3);
      const ps = onPath.get(a + "|" + b);
      let c = flow ? "var(--c-done)" : "var(--line-2)", m = flow ? "d" : "a", w = flow ? 3.5 : 1.5, dash = "";
      if (ps === "+") { c = "var(--ember)"; m = "e"; w = 4; }
      if (ps === "−") { c = "var(--c-pivot)"; m = "p"; w = 4; dash = "7 4"; }
      flowSvg.appendChild(S("line", { x1, y1, x2, y2, stroke: c, "stroke-width": w, "stroke-dasharray": dash, "marker-end": `url(#bf-${m})` }));
    };
    g.V.forEach((v) => edge("s", v, !!mateOf[v]));
    g.edges.forEach(([a, b]) => { const v = g.V.includes(a) ? a : b, u = v === a ? b : a; if (g.V.includes(v) && g.U.includes(u)) edge(v, u, mateOf[v] === u); });
    g.U.forEach((u) => edge(u, "t", !!mateOf[u]));
    Object.keys(pos).forEach((id) => {
      const p = pos[id], st = id === "s" || id === "t";
      flowSvg.appendChild(S("circle", { cx: p.x, cy: p.y, r: st ? 17 : R, fill: st ? "var(--ember-soft)" : mateOf[id] ? "var(--c-done)" : "var(--panel-2)", stroke: st ? "var(--ember)" : g.V.includes(id) ? "var(--steel)" : "var(--c-pivot)", "stroke-width": 2 }));
      flowSvg.appendChild(S("text", { x: p.x, y: p.y + 4.5, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: mateOf[id] && !st ? "#0d1117" : "var(--ink)" }, id));
    });
    flowSvg.appendChild(S("text", { x: W / 2, y: H - 6, "text-anchor": "middle", "font-size": 12, fill: "var(--ink-2)" }, `every capacity = 1 · flow value = |M| = ${M.length}`));
  }

  /* ---- editing ---- */
  const editing = () => $("edit").checked;
  function pick(id) {
    if (editPick == null) { editPick = id; say.say(`Selected ${id}. Click another vertex to add or remove the edge ${id}–?`); redraw(); return; }
    if (editPick === id) { editPick = null; redraw(); return; }
    toggleEdge(editPick, id);
    editPick = null;
  }
  function toggleEdge(a, b) {
    const k = key(a, b);
    const i = g.edges.findIndex(([x, y]) => key(x, y) === k);
    if (i >= 0) { g.edges.splice(i, 1); initM = initM.filter(([x, y]) => key(x, y) !== k); }
    else g.edges.push(g.V.includes(b) && !g.V.includes(a) ? [b, a] : [a, b]);
    $("preset").value = "custom";
    analyze();
  }
  function redraw() { draw(lastFrame); }

  function analyze() {
    const ids = g.V.concat(g.U);
    const c = twoColor(ids, g.edges);
    const sameSide = g.edges.filter(([a, b]) => g.V.includes(a) === g.V.includes(b));
    const box = $("color");
    const resplit = $("resplit");
    resplit.style.display = "none";
    if (!c.ok) {
      colorInfo = c;
      box.className = "callout bad";
      box.innerHTML = `<b>Not bipartite.</b> Odd cycle ${c.cycle.join(" – ")} – ${c.cycle[0]} (length ${c.cycle.length}): its vertices can't alternate between two colors. Remove one of its edges (red, dashed).`;
      blocked("A graph with an odd cycle has no 2-coloring, so it is not bipartite; the matching algorithm here needs a bipartite graph.");
      return;
    }
    colorInfo = Object.assign(c, { mismatch: sameSide.length > 0 });
    if (sameSide.length) {
      box.className = "callout";
      box.innerHTML = `<b>2-colorable ✔ — but not with these sides.</b> Edge${sameSide.length > 1 ? "s" : ""} ${sameSide.map(([a, b]) => a + "–" + b).join(", ")} join${sameSide.length > 1 ? "" : "s"} two vertices on the same side. The ring colors show a valid 2-coloring; re-split the sides to match it.`;
      resplit.style.display = "";
      blocked("Some edges join two vertices on the same side. The graph is still bipartite — re-split the sides by the 2-coloring to run the algorithm.");
      return;
    }
    box.className = "callout ok";
    box.innerHTML = `<b>2-coloring check ✔</b> Every edge joins a V vertex (blue ring) to a U vertex (purple ring), so the graph is bipartite. (Equivalently: it has no odd-length cycle.)`;
    const res = run(g, initM);
    askKey = "x";
    player.load(res.frames);
  }
  function blocked(text) {
    askKey = "x";
    player.load([{ M: initM.slice(), label: {}, queue: [], head: 0, line: 0, text, ctr: { "|M|": initM.length, augmentations: 0, dequeues: 0, "edges examined": 0 } }]);
  }
  $("resplit").onclick = () => {
    const col = colorInfo.color;
    const all = g.V.concat(g.U).sort(numSort);
    g.V = all.filter((x) => col[x] === 0); g.U = all.filter((x) => col[x] === 1);
    g.edges = g.edges.map(([a, b]) => (g.V.includes(a) ? [a, b] : [b, a]));
    initM = [];
    analyze();
  };

  function render(f, i) {
    lastFrame = f;
    draw(f);
    code.highlight(f.line);
    ctr.set(f.ctr);
    say.say(f.text);
    showAsk(f.ask, i);
  }
  const player = F.player($("player"), { frames: [], render, fps: 2 });

  function load(k) {
    const p = PRESETS[k];
    g = { V: p.V.slice(), U: p.U.slice(), edges: parsePairs(p.edges) };
    initM = $("init").value === "preset" ? parsePairs(p.init) : [];
    editPick = null;
    analyze();
  }
  function random() {
    const r = Math.random;
    const p = 3 + Math.floor(r() * 3), q = 3 + Math.floor(r() * 3);
    const V = Array.from({ length: p }, (_, k) => String(k + 1)), U = Array.from({ length: q }, (_, k) => String(p + k + 1));
    const edges = [];
    V.forEach((v) => { const d = 1 + Math.floor(r() * 3); const us = U.slice().sort(() => r() - 0.5).slice(0, d); us.forEach((u) => edges.push([v, u])); });
    g = { V, U, edges };
    initM = [];
    $("preset").value = "custom";
    editPick = null;
    analyze();
  }
  $("preset").onchange = () => { if ($("preset").value !== "custom") load($("preset").value); };
  $("init").onchange = () => { const k = $("preset").value; if (k !== "custom") load(k); else { initM = []; analyze(); } };
  $("rand").onclick = random;
  $("edit").onchange = () => { editPick = null; redraw(); if (editing()) say.say("Edit mode: click one vertex, then another, to add or remove the edge between them. Edges inside one side are allowed — the 2-coloring check will tell you what happens."); };
  $("addV").onclick = () => { const all = g.V.concat(g.U).map(Number); if (g.V.length >= 7) return; g.V.push(String(Math.max(...all) + 1)); $("preset").value = "custom"; analyze(); };
  $("addU").onclick = () => { const all = g.V.concat(g.U).map(Number); if (g.U.length >= 7) return; g.U.push(String(Math.max(...all) + 1)); $("preset").value = "custom"; analyze(); };
  $("clearE").onclick = () => { g.edges = []; initM = []; $("preset").value = "custom"; analyze(); };
  load("textbook");
})();
