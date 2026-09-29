/* DFS and BFS on an editable undirected graph (Levitin §3.5). */
(function () {
  "use strict";
  Forge.page({ title: "DFS and BFS", chapter: "Ch 3 · Brute Force" });
  const $ = (id) => document.getElementById(id);
  const W = 760, H = 400, R = 20;
  const stage = $("stage"), forest = $("forest");
  const say = Forge.narrate($("say"));
  const pred = FX.predict($("predict"));
  let code = null, ctr = null, runId = 0;
  let algo = "dfs", rep = "list", tool = "add";
  let g = { nodes: [], edges: [] };

  const PRESETS = {
    levitin: {
      nodes: [["a", 180, 80], ["c", 70, 200], ["d", 100, 340], ["e", 340, 80], ["f", 210, 240], ["b", 340, 240], ["g", 480, 90], ["h", 660, 90], ["i", 660, 300], ["j", 480, 300]],
      edges: "a-c a-d a-e a-f b-e b-f c-d c-f g-h g-j h-i i-j",
    },
    three: {
      nodes: [["a", 80, 80], ["b", 220, 80], ["c", 150, 200], ["d", 350, 90], ["e", 470, 90], ["f", 410, 210], ["g", 640, 90], ["h", 110, 330], ["i", 300, 330], ["j", 620, 300]],
      edges: "a-b b-c a-c d-e e-f f-d g-j h-i",
    },
    tail: { nodes: [["a", 120, 90], ["b", 120, 310], ["c", 300, 200], ["d", 480, 200], ["e", 650, 200]], edges: "a-b b-c c-a c-d d-e" },
    tree: { nodes: [["a", 380, 60], ["b", 210, 170], ["c", 550, 170], ["d", 120, 300], ["e", 300, 300], ["f", 470, 300], ["g", 640, 300]], edges: "a-b a-c b-d b-e c-f c-g" },
    grid: { nodes: [["a", 220, 70], ["b", 380, 70], ["c", 540, 70], ["d", 220, 200], ["e", 380, 200], ["f", 540, 200], ["g", 220, 330], ["h", 380, 330], ["i", 540, 330]], edges: "a-b b-c d-e e-f g-h h-i a-d d-g b-e e-h c-f f-i" },
    empty: { nodes: [], edges: "" },
  };
  function loadPreset(name) {
    const p = PRESETS[name];
    g = { nodes: p.nodes.map(([id, x, y]) => ({ id, x, y })), edges: p.edges.split(/\s+/).filter(Boolean).map((s) => { const [u, v] = s.split("-"); return { u, v }; }) };
    ed.clearSelection();
    refreshStart(true);
    rerecord();
  }
  function randomGraph() {
    const r = Forge.rng(Date.now()), n = 6 + Math.floor(r() * 4);
    const spots = [];
    for (let y = 0; y < 3; y++) for (let x = 0; x < 5; x++) spots.push({ x: 90 + x * 145 + Math.round((r() - 0.5) * 40), y: 70 + y * 130 + Math.round((r() - 0.5) * 30) });
    spots.sort(() => r() - 0.5);
    g = { nodes: spots.slice(0, n).map((s, k) => ({ id: String.fromCharCode(97 + k), x: s.x, y: s.y })), edges: [] };
    const N = g.nodes;
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
      const d = Math.hypot(N[a].x - N[b].x, N[a].y - N[b].y);
      if (d < 230 && r() < 0.5) g.edges.push({ u: N[a].id, v: N[b].id });
    }
    ed.clearSelection();
    refreshStart(true);
    rerecord();
  }

  /* ---------- helpers ---------- */
  const ek = (u, v) => (u < v ? u + "|" + v : v + "|" + u);
  function adjOf() {
    const A = {};
    g.nodes.forEach((n) => (A[n.id] = []));
    g.edges.forEach((e) => { if (A[e.u] && A[e.v] && e.u !== e.v && !A[e.u].includes(e.v)) { A[e.u].push(e.v); A[e.v].push(e.u); } });
    for (const k in A) A[k].sort();
    return A;
  }
  const ids = () => g.nodes.map((n) => n.id).sort();
  function refreshStart(reset) {
    const sel = $("start"), cur = sel.value, list = ids();
    sel.innerHTML = "";
    list.forEach((id) => sel.appendChild(Forge.el("option", { value: id }, id)));
    if (!reset && list.includes(cur)) sel.value = cur;
    else if (list.length) sel.value = list[0];
  }
  const sub = (a, b) => `<sub>${a}${b != null ? "," + b : ""}</sub>`;

  /* ---------- pseudocode ---------- */
  const DFS_LINES = [
    "ALGORITHM DFS(G)",
    "    // Marks each vertex with the order it is first reached",
    "    mark each vertex in V with 0      // 0 = unvisited",
    "    count ← 0",
    "    for each vertex v in V do",
    "        if v is marked with 0 then",
    "            dfs(v)                   // start a new tree",
    "",
    "dfs(v)",
    "    count ← count + 1;  mark v with count   // push v",
    "    for each vertex w in V adjacent to v do",
    "        if w is marked with 0 then",
    "            dfs(w)                   // tree edge v–w",
    "        // else w is visited: back edge (unless w is v's parent)",
    "    // no unvisited neighbor left: v is a dead end, pop it",
  ];
  const BFS_LINES = [
    "ALGORITHM BFS(G)",
    "    mark each vertex in V with 0      // 0 = unvisited",
    "    count ← 0",
    "    for each vertex v in V do",
    "        if v is marked with 0 then",
    "            bfs(v)                   // start a new tree",
    "",
    "bfs(v)",
    "    count ← count + 1;  mark v with count",
    "    initialize a queue with v",
    "    while the queue is not empty do",
    "        for each vertex w in V adjacent to the front vertex do",
    "            if w is marked with 0 then",
    "                count ← count + 1;  mark w with count",
    "                add w to the queue       // tree edge",
    "            // else: cross edge (unless w is the front's parent)",
    "        remove the front vertex from the queue",
  ];

  /* ---------- record DFS ---------- */
  function recordDFS(start) {
    const A = adjOf(), V = ids(), order = [start, ...V.filter((x) => x !== start)];
    const frames = [];
    const st = { mark: {}, count: 0, popc: 0, stack: [], popNo: {}, parent: {}, cls: {}, scanned: 0, roots: [], level: {} };
    let asks = 0, askedDead = false;
    const snap = (o) => frames.push(Object.assign({ mark: { ...st.mark }, popNo: { ...st.popNo }, stack: st.stack.slice(), cls: { ...st.cls }, scanned: st.scanned, count: st.count, popc: st.popc }, o));
    snap({ line: [2, 3], text: `Every vertex starts unvisited (marked 0). The outer loop will try <b>${start}</b> first, then the others alphabetically. Neighbors are also tried in alphabetical order.` });
    function dfs(v, par, depth) {
      st.count++; st.mark[v] = st.count; st.stack.push(v); st.parent[v] = par; st.level[v] = depth;
      if (par) st.cls[ek(par, v)] = "tree";
      const unvisited = V.filter((x) => !st.mark[x]);
      const firstUn = A[v].find((w) => !st.mark[w]);
      let ask = null;
      if (unvisited.length && ((st.count === 2 || st.count === 4) && asks < 2 || (!firstUn && !askedDead && st.count > 1))) {
        if (!firstUn) askedDead = true; else asks++;
        const opts = [];
        if (firstUn) opts.push(firstUn);
        unvisited.forEach((x) => { if (opts.length < 4 && !opts.includes(x)) opts.push(x); });
        opts.sort();
        ask = { q: `DFS is at <b>${v}</b>. Which vertex will it push next?`, options: opts.map((x) => ({ label: x, value: x })).concat([{ label: "none: " + v + " is a dead end", value: "-" }]),
          answer: firstUn || "-", why: firstUn ? `${firstUn} is the first unvisited neighbor of ${v} in alphabetical order (${v}'s list: ${A[v].join(", ")}).` : `Every neighbor of ${v} (${A[v].join(", ") || "none"}) is already visited, so ${v} is a dead end and gets popped. DFS backs up.` };
      }
      st.scanned += rep === "matrix" ? V.length : A[v].length;
      snap({ line: 9, cur: v, text: `Reached <b>${v}</b> for the first time: count = ${st.count}, so push ${v} (push #${st.count})` + (par ? `, reached from ${par} along a tree edge.` : ", the root of a new DFS tree.") +
        (rep === "matrix" ? ` To find its neighbors we read its whole matrix row: ${V.length} entries.` : ` Its adjacency list has ${A[v].length} entr${A[v].length === 1 ? "y" : "ies"}.`), ask });
      for (const w of A[v]) {
        if (!st.mark[w]) {
          snap({ line: [10, 11, 12], cur: v, chk: w, edge: [v, w], text: `Neighbor <b>${w}</b> is unvisited, so ${v}–${w} becomes a <b>tree edge</b> and DFS goes deeper into ${w}.` });
          dfs(w, v, depth + 1);
          snap({ line: 10, cur: v, text: `Back at <b>${v}</b> (top of the stack again). Continue with ${v}'s remaining neighbors.` });
        } else if (w === par) {
          snap({ line: [10, 11], cur: v, chk: w, edge: [v, w], text: `Neighbor <b>${w}</b> is ${v}'s parent: that's the tree edge we arrived on. Nothing new.` });
        } else if (st.cls[ek(v, w)]) {
          snap({ line: [10, 11, 13], cur: v, chk: w, edge: [v, w], text: `Neighbor <b>${w}</b> is visited, and edge ${v}–${w} was already classified as a ${st.cls[ek(v, w)]} edge from the other end.` });
        } else {
          st.cls[ek(v, w)] = "back";
          snap({ line: [10, 11, 13], cur: v, chk: w, edge: [v, w], text: `Neighbor <b>${w}</b> is already visited and is not ${v}'s parent: ${w} is an ancestor still on the stack. ${v}–${w} is a <b>back edge</b>, so the graph has a cycle.` });
        }
      }
      st.stack.pop(); st.popc++; st.popNo[v] = st.popc;
      snap({ line: 14, cur: v, popped: v, text: `<b>${v}</b> has no unvisited neighbors left: it is a dead end. Pop it (pop #${st.popc}).` + (st.stack.length ? ` DFS backs up to ${st.stack[st.stack.length - 1]}.` : " The stack is empty: this tree is finished.") });
    }
    for (const v of order) {
      if (!st.mark[v]) {
        st.roots.push(v);
        snap({ line: [4, 5, 6], chk: v, text: st.roots.length === 1 ? `Outer loop: <b>${v}</b> is unvisited, so call dfs(${v}).` : `Outer loop: <b>${v}</b> is still unvisited, so the graph is <b>not connected</b>. Restart: dfs(${v}) grows tree #${st.roots.length} of the forest.` });
        dfs(v, null, 0);
      }
    }
    const back = Object.values(st.cls).filter((c) => c === "back").length, tree = Object.values(st.cls).filter((c) => c === "tree").length;
    snap({ line: 4, final: true, text: `Done. Push order: ${Object.keys(st.mark).sort((a, b) => st.mark[a] - st.mark[b]).join(", ")}. Pop order: ${Object.keys(st.popNo).sort((a, b) => st.popNo[a] - st.popNo[b]).join(", ")}. ${st.roots.length} tree${st.roots.length > 1 ? "s" : ""} (${st.roots.length > 1 ? "not connected" : "connected"}), ${tree} tree edges, ${back} back edge${back === 1 ? "" : "s"} (${back ? "has a cycle" : "acyclic"}).` });
    frames.meta = { parent: st.parent, roots: st.roots, mark: st.mark, level: st.level, A };
    return frames;
  }

  /* ---------- record BFS ---------- */
  function recordBFS(start) {
    const A = adjOf(), V = ids(), order = [start, ...V.filter((x) => x !== start)];
    const frames = [];
    const st = { mark: {}, count: 0, queue: [], done: {}, parent: {}, cls: {}, scanned: 0, roots: [], level: {} };
    let asks = 0;
    const snap = (o) => frames.push(Object.assign({ mark: { ...st.mark }, done: { ...st.done }, queue: st.queue.slice(), cls: { ...st.cls }, scanned: st.scanned, count: st.count, level: { ...st.level } }, o));
    snap({ line: [1, 2], text: `Every vertex starts unvisited. The outer loop tries <b>${start}</b> first, then the others alphabetically.` });
    for (const v of order) {
      if (st.mark[v]) continue;
      st.roots.push(v);
      snap({ line: [3, 4, 5], chk: v, text: st.roots.length === 1 ? `Outer loop: <b>${v}</b> is unvisited, so call bfs(${v}).` : `Outer loop: <b>${v}</b> is still unvisited: the graph is <b>not connected</b>. Restart with bfs(${v}) for tree #${st.roots.length}.` });
      st.count++; st.mark[v] = st.count; st.queue.push(v); st.parent[v] = null; st.level[v] = 0;
      snap({ line: [8, 9], cur: v, text: `Mark <b>${v}</b> with ${st.count} and put it in the queue. It is level 0 of a new BFS tree.` });
      while (st.queue.length) {
        const u = st.queue[0];
        const firstUn = A[u].find((w) => !st.mark[w]);
        let ask = null;
        if (firstUn && asks < 2 && st.count >= 2) {
          asks++;
          const unv = V.filter((x) => !st.mark[x]);
          const opts = [firstUn]; unv.forEach((x) => { if (opts.length < 4 && !opts.includes(x)) opts.push(x); });
          opts.sort();
          ask = { q: `The front of the queue is <b>${u}</b>. Which vertex gets number ${st.count + 1}?`, options: opts.map((x) => ({ label: x, value: x })), answer: firstUn,
            why: `${firstUn} is the first unvisited neighbor of the front vertex ${u} (alphabetical order). BFS always expands the vertex that has waited longest.` };
        }
        st.scanned += rep === "matrix" ? V.length : A[u].length;
        snap({ line: [10, 11], cur: u, text: `The front of the queue is <b>${u}</b> (level ${st.level[u]}). Check every neighbor of ${u}` + (rep === "matrix" ? `, reading its whole row: ${V.length} entries.` : `: ${A[u].join(", ") || "none"}.`), ask });
        for (const w of A[u]) {
          if (!st.mark[w]) {
            st.count++; st.mark[w] = st.count; st.queue.push(w); st.parent[w] = u; st.level[w] = st.level[u] + 1; st.cls[ek(u, w)] = "tree";
            snap({ line: [12, 13, 14], cur: u, chk: w, edge: [u, w], text: `<b>${w}</b> is unvisited: mark it ${st.count}, add it to the back of the queue. ${u}–${w} is a <b>tree edge</b>; ${w} is on level ${st.level[w]}.` });
          } else if (w === st.parent[u]) {
            snap({ line: [11, 12], cur: u, chk: w, edge: [u, w], text: `<b>${w}</b> is ${u}'s parent in the BFS tree (the tree edge we came along).` });
          } else if (st.cls[ek(u, w)]) {
            snap({ line: [11, 12, 15], cur: u, chk: w, edge: [u, w], text: `<b>${w}</b> is visited; edge ${u}–${w} is already known as a ${st.cls[ek(u, w)]} edge.` });
          } else {
            st.cls[ek(u, w)] = "cross";
            snap({ line: [11, 12, 15], cur: u, chk: w, edge: [u, w], text: `<b>${w}</b> was visited earlier (level ${st.level[w]}) and is not ${u}'s parent: ${u}–${w} is a <b>cross edge</b> between level ${st.level[u]} and level ${st.level[w]}. The graph has a cycle.` });
          }
        }
        st.queue.shift(); st.done[u] = true;
        snap({ line: 16, cur: u, text: `All neighbors of <b>${u}</b> checked. Remove it from the front of the queue.` + (st.queue.length ? ` Next front: ${st.queue[0]}.` : " The queue is empty: this tree is complete.") });
      }
    }
    const cross = Object.values(st.cls).filter((c) => c === "cross").length, tree = Object.values(st.cls).filter((c) => c === "tree").length;
    snap({ line: 3, final: true, text: `Done. Visit order (same as queue order): ${Object.keys(st.mark).sort((a, b) => st.mark[a] - st.mark[b]).join(", ")}. ${st.roots.length} tree${st.roots.length > 1 ? "s" : ""}, ${tree} tree edges, ${cross} cross edge${cross === 1 ? "" : "s"} (${cross ? "has a cycle" : "acyclic"}).` });
    frames.meta = { parent: st.parent, roots: st.roots, mark: st.mark, level: st.level, A };
    return frames;
  }

  /* ---------- forest layout ---------- */
  function forestLayout(meta) {
    const kids = {}, pos = {};
    const disc = Object.keys(meta.mark).sort((a, b) => meta.mark[a] - meta.mark[b]);
    disc.forEach((v) => (kids[v] = []));
    disc.forEach((v) => { if (meta.parent[v]) kids[meta.parent[v]].push(v); });
    let slot = 0, maxD = 0;
    function place(v, d) {
      maxD = Math.max(maxD, d);
      if (!kids[v].length) { pos[v] = { x: slot++, d }; return pos[v].x; }
      const xs = kids[v].map((c) => place(c, d + 1));
      pos[v] = { x: (xs[0] + xs[xs.length - 1]) / 2, d };
      return pos[v].x;
    }
    meta.roots.forEach((r) => { place(r, 0); slot += 0.5; });
    const SX = 62, SY = 70, left = algo === "bfs" ? 70 : 34;
    const Wf = Math.max(300, left + Math.max(1, slot - 0.5) * SX + 10), Hf = 50 + maxD * SY + 30;
    for (const v in pos) pos[v] = { x: left + pos[v].x * SX, y: 34 + pos[v].d * SY };
    return { pos, W: Wf, H: Hf, maxD };
  }

  /* ---------- render ---------- */
  let frames = [];
  const player = Forge.player($("player"), {
    frames: [], fps: 2,
    render(f, i, fr) {
      frames = fr;
      draw(f);
      code.highlight(f.line);
      say.say(f.text);
      if (f.ask) { const key = runId + ":" + i; pred.show(f.ask, key); if (pred.shouldPause(key)) player.pause(); }
      else pred.hide();
    },
  });
  let lastFrame = null;
  function draw(f) {
    lastFrame = f;
    const meta = frames.meta;
    const inDS = new Set(algo === "dfs" ? f.stack : f.queue);
    const ns = {}, es = {}, note = {};
    g.nodes.forEach((n) => {
      const v = n.id;
      if (!f.mark[v]) { if (f.chk === v) ns[v] = "compare"; return; }
      ns[v] = inDS.has(v) ? "pivot" : "done";
      note[v] = algo === "dfs" ? (f.popNo[v] ? `${f.mark[v]},${f.popNo[v]}` : `${f.mark[v]}`) : `#${f.mark[v]} L${f.level[v]}`;
    });
    if (f.cur && !f.final) ns[f.cur] = "active";
    if (f.chk) ns[f.chk] = "compare";
    for (const k in f.cls) { const [u, v] = k.split("|"); es[u + "-" + v] = f.cls[k]; es[v + "-" + u] = f.cls[k]; }
    if (f.edge) { es[f.edge[0] + "-" + f.edge[1]] = "active"; es[f.edge[1] + "-" + f.edge[0]] = "active"; }
    Forge.graph(stage, g, { width: W, height: H, r: R, nodeState: ns, edgeState: es, nodeNote: note });
    if (!g.nodes.length) stage.appendChild(Forge.svg("text", { x: W / 2, y: H / 2, "text-anchor": "middle", "font-size": 16, fill: "var(--muted)" }, "Click anywhere to add a vertex"));
    ed.decorate();

    // forest
    const lay = frames.layout;
    forest.setAttribute("viewBox", `0 0 ${lay.W} ${lay.H}`);
    const fg = { nodes: [], edges: [] }, fes = {}, fns = {};
    Object.keys(f.mark).forEach((v) => { if (lay.pos[v]) { fg.nodes.push({ id: v, x: lay.pos[v].x, y: lay.pos[v].y }); fns[v] = ns[v]; } });
    for (const k in f.cls) {
      const [u, v] = k.split("|");
      if (!lay.pos[u] || !lay.pos[v]) continue;
      if (f.cls[k] === "tree") { fg.edges.push({ u, v }); fes[u + "-" + v] = "tree"; }
      else {
        // draw from the upper (or left) end so every curve bulges the same way
        let a = lay.pos[u], b = lay.pos[v], p = u, q = v;
        if (a.y > b.y || (a.y === b.y && a.x > b.x)) { [a, b, p, q] = [b, a, v, u]; }
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        fg.edges.push({ u: p, v: q, curve: -(14 + 0.22 * dist) });
        fes[p + "-" + q] = f.cls[k];
      }
    }
    if (f.edge && f.cls[ek(f.edge[0], f.edge[1])]) { fes[f.edge[0] + "-" + f.edge[1]] = "active"; fes[f.edge[1] + "-" + f.edge[0]] = "active"; }
    Forge.graph(forest, fg, { width: lay.W, height: lay.H, r: 15, nodeState: fns, edgeState: fes });
    if (algo === "bfs") for (let d = 0; d <= lay.maxD; d++) forest.insertBefore(Forge.svg("text", { x: 8, y: 38 + d * 70, "font-size": 11, fill: "var(--muted)" }, "level " + d), forest.firstChild);
    if (!fg.nodes.length) forest.appendChild(Forge.svg("text", { x: lay.W / 2, y: lay.H / 2, "text-anchor": "middle", "font-size": 13, fill: "var(--muted)" }, "(empty until the first vertex is visited)"));

    // data structure
    const byMark = Object.keys(f.mark).sort((a, b) => f.mark[a] - f.mark[b]);
    if (algo === "dfs") {
      const pops = Object.keys(f.popNo).sort((a, b) => f.popNo[a] - f.popNo[b]);
      $("ds").innerHTML = `<div class="k small muted" style="margin-bottom:4px">bottom ↓ … top ↑</div><div class="ds-stack">${f.stack.map((v, k) => `<span class="ds-box${k === f.stack.length - 1 ? " top" : ""}">${v}${sub(f.mark[v])}</span>`).join("") || '<span class="muted small">(empty)</span>'}</div>` +
        `<div class="ds-row"><div class="k">Push order (first reached)</div><div class="fx-chips">${byMark.map((v) => `<span>${v}${sub(f.mark[v])}</span>`).join("") || "—"}</div></div>` +
        `<div class="ds-row"><div class="k">Pop order (dead ends)</div><div class="fx-chips">${pops.map((v) => `<span class="done">${v}${sub(f.popNo[v])}</span>`).join("") || "—"}</div></div>` +
        `<div class="ds-row"><div class="k">Levitin notation: vertex<sub>push, pop</sub></div><div class="fx-chips">${byMark.map((v) => `<span>${v}${sub(f.mark[v], f.popNo[v] || "·")}</span>`).join("") || "—"}</div></div>`;
    } else {
      $("ds").innerHTML = `<div class="k small muted" style="margin-bottom:4px">front → … → back</div><div class="ds-queue">${f.queue.map((v, k) => `<span class="ds-box${k === 0 ? " top" : ""}">${v}${sub(f.mark[v])}</span>`).join("") || '<span class="muted small">(empty)</span>'}</div>` +
        `<div class="ds-row"><div class="k">Visit order = queue order</div><div class="fx-chips">${byMark.map((v) => `<span class="${f.done[v] ? "done" : ""}">${v}${sub(f.mark[v])}</span>`).join("") || "—"}</div></div>`;
    }

    // adjacency view
    const A = meta.A, V = ids(), cur = f.cur, chk = f.chk;
    if (rep === "matrix") {
      let h = `<table class="t"><thead><tr><th></th>${V.map((v) => `<th>${v}</th>`).join("")}</tr></thead><tbody>`;
      V.forEach((r) => {
        h += `<tr><th>${r}</th>` + V.map((c) => { const one = A[r].includes(c); const cls = [one ? "one" : "zero", r === cur ? "src" : "", r === cur && c === chk ? "hl" : ""].join(" "); return `<td class="${cls}">${one ? 1 : 0}</td>`; }).join("") + "</tr>";
      });
      $("adj").innerHTML = h + "</tbody></table>";
    } else {
      $("adj").innerHTML = `<div class="adjl">${V.map((r) => `<div class="${r === cur ? "cur" : ""}"><b>${r}</b> → ${A[r].map((c) => `<span class="${r === cur && c === chk ? "hl" : ""}">${c}</span>`).join(" → ") || "<span class='muted'>∅</span>"}</div>`).join("")}</div>`;
    }
    const nV = V.length, nE = Object.values(A).reduce((s, l) => s + l.length, 0) / 2;
    $("adjNote").innerHTML = rep === "matrix" ? `Matrix: each vertex's neighbors are found by scanning a full row, so a traversal reads |V|² = ${nV}² = <b>${nV * nV}</b> entries: Θ(|V|²).` : `Lists: each list is walked once, so a traversal reads 2|E| = <b>${2 * nE}</b> list entries plus |V| = ${nV} list heads: Θ(|V| + |E|).`;

    const nTree = Object.values(f.cls).filter((c) => c === "tree").length, nOther = Object.values(f.cls).filter((c) => c !== "tree").length;
    const bound = rep === "matrix" ? `|V|²=${nV * nV}` : `|V|+2|E|=${nV + 2 * nE}`;
    if (algo === "dfs") ctr.set({ pushed: f.count, popped: f.popc, "tree edges": nTree, "back edges": nOther, "entries read": f.scanned, bound });
    else ctr.set({ visited: f.count, "queue size": f.queue.length, "tree edges": nTree, "cross edges": nOther, "entries read": f.scanned, bound });
  }

  /* ---------- wiring ---------- */
  function setupAlgo() {
    $("code").innerHTML = ""; $("ctr").innerHTML = "";
    code = Forge.code($("code"), algo === "dfs" ? DFS_LINES : BFS_LINES);
    ctr = Forge.counters($("ctr"), algo === "dfs" ? { pushed: 0, popped: 0, "tree edges": 0, "back edges": 0, "entries read": 0, bound: "" } : { visited: 0, "queue size": 0, "tree edges": 0, "cross edges": 0, "entries read": 0, bound: "" });
    $("dsTitle").textContent = algo === "dfs" ? "Traversal stack" : "Traversal queue";
    $("forestTitle").textContent = algo === "dfs" ? "DFS forest (tree + back edges)" : "BFS forest (tree + cross edges, by level)";
    $("legend").innerHTML = [
      ["var(--c-active)", "current vertex"], ["var(--c-compare)", "neighbor being checked"], ["var(--c-pivot)", algo === "dfs" ? "on the stack" : "in the queue"], ["var(--c-done)", algo === "dfs" ? "popped (dead end)" : "dequeued"],
      ["var(--ember)", "tree edge", 1], algo === "dfs" ? ["var(--c-pivot)", "back edge (dashed)", 1] : ["var(--c-compare)", "cross edge (dashed)", 1],
    ].map(([c, t, line]) => `<span><i style="background:${c};${line ? "height:3px;width:16px;vertical-align:3px" : ""}"></i>${t}</span>`).join("");
  }
  function rerecord(keepIndex) {
    const start = $("start").value;
    let fr;
    if (!g.nodes.length) {
      fr = [{ line: 0, mark: {}, popNo: {}, stack: [], queue: [], done: {}, cls: {}, level: {}, scanned: 0, count: 0, popc: 0, text: "The graph is empty. Click on the stage to add vertices, then connect them." }];
      fr.meta = { parent: {}, roots: [], mark: {}, level: {}, A: {} };
    } else fr = algo === "dfs" ? recordDFS(start) : recordBFS(start);
    frames = fr;
    fr.layout = forestLayout(fr.meta);
    runId++;
    player.load(fr);
    if (keepIndex) player.go(Math.min(keepIndex, fr.length - 1));
  }
  const ed = FX.graphEditor(stage, {
    graph: () => g, directed: false, tool: () => tool, W, H, R, maxNodes: 16,
    onChange: () => { refreshStart(false); rerecord(); },
    onMove: () => { if (lastFrame) draw(lastFrame); },
  });
  document.querySelectorAll("#algo button").forEach((b) => (b.onclick = () => {
    algo = b.dataset.a; document.querySelectorAll("#algo button").forEach((x) => x.classList.toggle("on", x === b)); setupAlgo(); rerecord();
  }));
  document.querySelectorAll("#rep button").forEach((b) => (b.onclick = () => {
    rep = b.dataset.r; document.querySelectorAll("#rep button").forEach((x) => x.classList.toggle("on", x === b));
    $("adjTitle").textContent = rep === "matrix" ? "Adjacency matrix" : "Adjacency lists";
    rerecord(player.index);
  }));
  document.querySelectorAll("#tool button").forEach((b) => (b.onclick = () => {
    tool = b.dataset.t; document.querySelectorAll("#tool button").forEach((x) => x.classList.toggle("on", x === b));
    ed.clearSelection(); stage.style.cursor = tool === "delete" ? "not-allowed" : "crosshair"; if (lastFrame) draw(lastFrame);
  }));
  $("start").onchange = () => rerecord();
  $("loadPreset").onclick = () => loadPreset($("preset").value);
  $("preset").onchange = () => loadPreset($("preset").value);
  $("rand").onclick = randomGraph;

  setupAlgo();
  loadPreset("levitin");
})();
