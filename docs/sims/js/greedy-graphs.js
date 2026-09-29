/* Prim, Kruskal & Dijkstra — Algorithm Forge (Ch 9 · Greedy Technique) */
(function () {
  "use strict";
  const E = Forge.el, S = Forge.svg, $ = (id) => document.getElementById(id);
  Forge.page({ title: "Prim, Kruskal & Dijkstra", chapter: "Ch 9 · Greedy Technique" });
  const INF = Infinity;

  const PRESETS = {
    prim: { nodes: { a: [120, 215], b: [290, 90], c: [500, 90], d: [640, 215], e: [290, 345], f: [420, 215] },
      edges: "a-b 3, a-e 6, a-f 5, b-c 1, b-f 4, c-f 4, c-d 6, d-f 5, d-e 8, e-f 2", start: "a" },
    dijk: { nodes: { a: [110, 280], b: [270, 110], c: [500, 110], d: [380, 280], e: [640, 280] },
      edges: "a-b 3, a-d 7, b-c 4, b-d 2, c-d 5, c-e 6, d-e 4", start: "a" },
    diff: { nodes: { a: [110, 215], b: [370, 80], c: [370, 350], d: [640, 215] },
      edges: "a-b 4, a-c 5, b-c 2, b-d 6, c-d 3", start: "a" },
    ties: { nodes: { a: [120, 110], b: [380, 70], c: [640, 110], d: [120, 330], e: [380, 370], f: [640, 330], g: [380, 215] },
      edges: "a-b 2, b-c 2, a-g 2, b-g 1, c-g 2, d-g 2, e-g 1, f-g 2, a-d 3, c-f 3, d-e 2, e-f 2", start: "a" },
  };

  const LINES = {
    prim: [
      "ALGORITHM Prim(G, s)",
      "    // grows a minimum spanning tree one vertex at a time",
      "    VT ← {s}",
      "    ET ← ∅",
      "    for every vertex u ≠ s do label u with (s, w(s, u)) or (−, ∞)",
      "    for i ← 1 to |V| − 1 do",
      "        u* ← fringe vertex with the smallest label weight",
      "        VT ← VT ∪ {u*}",
      "        ET ← ET ∪ {(parent(u*), u*)}",
      "        for every vertex u not in VT adjacent to u* do",
      "            if w(u*, u) < weight(u) then",
      "                label u with (u*, w(u*, u))",
      "    return ET",
    ],
    dijkstra: [
      "ALGORITHM Dijkstra(G, s)",
      "    for every vertex v do",
      "        d[v] ← ∞",
      "        p[v] ← null",
      "    d[s] ← 0",
      "    VT ← ∅",
      "    for i ← 0 to |V| − 1 do",
      "        u* ← vertex not in VT with the smallest d",
      "        VT ← VT ∪ {u*}",
      "        for every vertex u not in VT adjacent to u* do",
      "            if d[u*] + w(u*, u) < d[u] then",
      "                d[u] ← d[u*] + w(u*, u)",
      "                p[u] ← u*",
      "    return d, p",
    ],
    kruskal: [
      "ALGORITHM Kruskal(G)",
      "    sort E so that w(e1) ≤ w(e2) ≤ … ≤ w(e|E|)",
      "    ET ← ∅",
      "    ecounter ← 0",
      "    k ← 0",
      "    while ecounter < |V| − 1 do",
      "        k ← k + 1",
      "        (u, v) ← ek",
      "        if find(u) ≠ find(v) then   // different trees: no cycle",
      "            ET ← ET ∪ {ek}",
      "            union(u, v)",
      "            ecounter ← ecounter + 1",
      "    return ET",
      "",
      "ALGORITHM find(x)",
      "    while parent[x] ≠ x do x ← parent[x]",
      "    return x",
    ],
  };
  const COUNTERS = {
    prim: { "edge checks": 0, "label updates": 0, "tree weight": 0 },
    dijkstra: { "edge checks": 0, "label updates": 0, "vertices done": 0 },
    kruskal: { "edges examined": 0, "find calls": 0, unions: 0, "tree weight": 0 },
  };

  let G = { nodes: [], edges: [] }, algo = "prim", start = "a", predict = false, selV = null;
  let code, ctr;
  const say = Forge.narrate($("say"));
  const score = { right: 0, total: 0 }, answered = {};
  const ek = (u, v) => (u < v ? `${u}-${v}` : `${v}-${u}`);

  /* ---------------- graph I/O ---------------- */
  function syncText() { $("edges").value = G.edges.map((e) => `${e.u}-${e.v} ${e.w}`).join(", "); }
  function nextFreePos(k, tot) { return [380 + 250 * Math.cos((2 * Math.PI * k) / tot - Math.PI / 2), 215 + 165 * Math.sin((2 * Math.PI * k) / tot - Math.PI / 2)]; }
  function parseEdges(txt, pos) {
    const edges = [], ids = new Set(G.nodes.map((n) => n.id));
    txt.split(/[,;\n]+/).forEach((s) => {
      const m = s.trim().toLowerCase().match(/^([a-z])\s*[-–—]\s*([a-z])\s*(\d+)$/);
      if (!m || m[1] === m[2]) return;
      const w = Math.max(1, Math.min(99, +m[3]));
      const key = ek(m[1], m[2]);
      if (edges.some((e) => ek(e.u, e.v) === key)) return;
      edges.push({ u: m[1] < m[2] ? m[1] : m[2], v: m[1] < m[2] ? m[2] : m[1], w });
      ids.add(m[1]); ids.add(m[2]);
    });
    const old = Object.fromEntries(G.nodes.map((n) => [n.id, n]));
    const list = [...ids].sort();
    const nodes = list.map((id, k) => {
      const p = (pos && pos[id]) || (old[id] && [old[id].x, old[id].y]) || nextFreePos(k, list.length);
      return { id, x: p[0], y: p[1] };
    });
    G = { nodes, edges };
  }
  function loadPreset(key) {
    const p = PRESETS[key];
    G = { nodes: [], edges: [] };
    parseEdges(p.edges, p.nodes);
    start = p.start;
    syncText(); fillStart();
  }
  function fillStart() {
    const s = $("start"); s.innerHTML = "";
    G.nodes.forEach((n) => s.appendChild(E("option", { value: n.id }, n.id)));
    if (!G.nodes.some((n) => n.id === start) && G.nodes.length) start = G.nodes[0].id;
    s.value = start;
  }
  const adj = () => {
    const A = Object.fromEntries(G.nodes.map((n) => [n.id, []]));
    G.edges.forEach((e) => { A[e.u].push([e.v, e.w]); A[e.v].push([e.u, e.w]); });
    Object.values(A).forEach((l) => l.sort((x, y) => (x[0] < y[0] ? -1 : 1)));
    return A;
  };

  /* ---------------- Prim & Dijkstra (same skeleton) ---------------- */
  function recordPD(isD) {
    const frames = [], A = adj(), ids = G.nodes.map((n) => n.id);
    const lab = {}; // id -> {p, w}
    ids.forEach((v) => (lab[v] = { p: null, w: INF }));
    const inT = new Set(), tree = [];
    const cnt = Object.assign({}, COUNTERS[isD ? "dijkstra" : "prim"]);
    const rows = [];
    const L = (v, sumTxt) => `${v}(${lab[v].p || "−"}, ${sumTxt || (lab[v].w === INF ? "∞" : lab[v].w)})`;
    const notes = () => Object.fromEntries(ids.map((v) => [v, isD || !inT.has(v) || v !== start ? `(${lab[v].p || "−"},${lab[v].w === INF ? "∞" : lab[v].w})` : "(−,−)"]));
    const nst = (extra) => {
      const s = {};
      ids.forEach((v) => { s[v] = inT.has(v) ? "done" : lab[v].w < INF ? "compare" : null; });
      return Object.assign(s, extra || {});
    };
    const est = (extra) => Object.assign(Object.fromEntries(tree.map((t) => [`${t[0]}-${t[1]}`, "tree"])), extra || {});
    const pq = () => ids.filter((v) => !inT.has(v) && lab[v].w < INF).sort((a, b) => lab[a].w - lab[b].w || (a < b ? -1 : 1)).map((v) => ({ v, w: lab[v].w, p: lab[v].p }));
    const push = (o) => frames.push(Object.assign({ nst: nst(), est: est(), notes: notes(), rows: rows.map((r) => Object.assign({}, r)), pq: pq(), ctr: Object.assign({}, cnt) }, o));
    const s = start;
    if (isD) {
      lab[s] = { p: null, w: 0 };
      push({ line: [1, 2, 3, 4], text: `Every vertex starts at d = ∞ with no parent; the source <b>${s}</b> gets d = 0. The number under each vertex is its best known distance from ${s}.` });
    } else {
      inT.add(s);
      lab[s] = { p: null, w: 0 };
      A[s].forEach(([u, w]) => { lab[u] = { p: s, w }; cnt["edge checks"]++; });
      rows.push({ tree: `${s}(−, −)`, rest: ids.filter((v) => v !== s).map((v) => ({ t: L(v), upd: lab[v].w < INF })) });
      push({ line: [2, 3, 4], nst: nst({ [s]: "done" }), text: `Start the tree with <b>${s}</b>. Each neighbour of ${s} is labelled with (${s}, edge weight); everything else is (−, ∞). Labelled vertices form the <b>fringe</b>.` });
    }
    const total = ids.length;
    for (let it = isD ? 0 : 1; it < total; it++) {
      const q = pq();
      if (!q.length) {
        push({ line: isD ? 13 : 12, text: isD ? `The remaining vertices (${ids.filter((v) => !inT.has(v)).join(", ")}) are unreachable from ${s}: their distance stays ∞.` : `The fringe is empty but ${ids.filter((v) => !inT.has(v)).join(", ")} are not in the tree: the graph is <b>not connected</b>, so no spanning tree exists.` });
        break;
      }
      const best = q[0].w, okV = q.filter((x) => x.w === best).map((x) => x.v);
      const u = q[0].v;
      push({ line: isD ? 7 : 6, ask: { prompt: `Which vertex joins the tree next?`, options: q.map((x) => x.v), ok: okV },
        text: `The fringe is {${q.map((x) => L(x.v)).join(", ")}}. The greedy rule takes the one with the smallest ${isD ? "distance d" : "label weight"}.` });
      inT.add(u);
      if (lab[u].p) tree.push([lab[u].p, u]);
      if (!isD) cnt["tree weight"] += lab[u].w; else cnt["vertices done"]++;
      push({ line: isD ? 8 : [7, 8], nst: nst({ [u]: "active" }), est: est(lab[u].p ? { [`${lab[u].p}-${u}`]: "active" } : {}),
        text: isD ? `<b>${u}</b> has the smallest d = ${lab[u].w}${lab[u].p ? `, arriving from ${lab[u].p}` : ""}. No unvisited vertex can offer a shorter path to it (all weights are ≥ 0), so its distance is <b>final</b>.`
          : `<b>${u}</b> is closest to the tree: edge ${lab[u].p}–${u} of weight ${lab[u].w}. Add the vertex and the edge (tree weight now ${cnt["tree weight"]}).` });
      const updTxt = {}; const upd = {};
      for (const [v, w] of A[u]) {
        if (inT.has(v)) continue;
        cnt["edge checks"]++;
        const cand = isD ? lab[u].w + w : w;
        const better = cand < lab[v].w;
        const oldTxt = lab[v].w === INF ? "∞" : lab[v].w;
        if (better) { lab[v] = { p: u, w: cand }; cnt["label updates"]++; upd[v] = true; updTxt[v] = isD && lab[u].w > 0 ? `${lab[u].w} + ${w}` : null; }
        push({ line: better ? (isD ? [10, 11, 12] : [10, 11]) : (isD ? [9, 10] : [9, 10]), nst: nst({ [u]: "active", [v]: "swap" }), est: est({ [ek(u, v) === `${u}-${v}` ? `${u}-${v}` : `${v}-${u}`]: "active" }),
          text: isD ? `Neighbour ${v}: through ${u} the path length is ${lab[u].w} + ${w} = ${cand}${better ? ` < ${oldTxt}: <b>update ${v} to (${u}, ${cand})</b>.` : `, not better than ${oldTxt}. Keep it.`}`
            : `Neighbour ${v}: edge ${u}–${v} weighs ${w}${better ? ` < ${oldTxt}: ${u} is now ${v}'s nearest tree vertex, <b>relabel ${v}(${u}, ${w})</b>.` : `, not lighter than ${oldTxt}. Keep ${v}'s label.`}` });
      }
      rows.push({ tree: L(u), rest: ids.filter((v) => !inT.has(v)).map((v) => ({ t: upd[v] && updTxt[v] ? L(v, updTxt[v]) : L(v), upd: !!upd[v] })) });
      push({ line: isD ? 9 : 9, text: `Row added to the trace table: ${L(u)} joins the tree vertices${Object.keys(upd).length ? `; updated labels (red): ${Object.keys(upd).join(", ")}` : "; no label changed"}.` });
    }
    // final
    const fin = { line: isD ? 13 : 12, final: true };
    if (isD) {
      const paths = ids.filter((v) => v !== s).map((v) => {
        if (lab[v].w === INF) return `${s} to ${v}: unreachable`;
        const p = [v]; let x = v; while (lab[x].p) { x = lab[x].p; p.unshift(x); }
        return `${s} to ${v}: ${p.join(" − ")} of length ${lab[v].w}`;
      });
      fin.text = `Done. Follow parent labels backwards to read each shortest path:<br>${paths.join("<br>")}`;
    } else fin.text = `Done: the MST has ${tree.length} edges (${tree.map((t) => t.join("")).join(", ")}) and total weight <b>${cnt["tree weight"]}</b>. With an unordered-array priority queue Prim runs in Θ(|V|²); with a min-heap, O(|E| log |V|).`;
    push(fin);
    return frames;
  }

  /* ---------------- Kruskal with union-find ---------------- */
  function recordK() {
    const frames = [], ids = G.nodes.map((n) => n.id);
    const sorted = G.edges.slice().sort((a, b) => a.w - b.w || (a.u + a.v < b.u + b.v ? -1 : 1));
    const parent = Object.fromEntries(ids.map((v) => [v, v])), size = Object.fromEntries(ids.map((v) => [v, 1]));
    const status = sorted.map(() => "");
    const tree = [], rej = [];
    const cnt = Object.assign({}, COUNTERS.kruskal);
    const est = (extra) => Object.assign(Object.fromEntries(rej.map((e) => [`${e.u}-${e.v}`, "dim"])), Object.fromEntries(tree.map((e) => [`${e.u}-${e.v}`, "tree"])), extra || {});
    const nst = (extra) => Object.assign(Object.fromEntries(ids.filter((v) => tree.some((e) => e.u === v || e.v === v)).map((v) => [v, "done"])), extra || {});
    const push = (o) => frames.push(Object.assign({ nst: nst(), est: est(), sorted, status: status.slice(), parent: Object.assign({}, parent), ctr: Object.assign({}, cnt) }, o));
    const find = (x) => { const path = [x]; while (parent[x] !== x) { x = parent[x]; path.push(x); } cnt["find calls"]++; return path; };
    push({ line: 1, text: `Sort all ${sorted.length} edges by weight: ${sorted.map((e) => `${e.u}${e.v} ${e.w}`).join(", ")}. Every vertex starts as its own one-vertex tree in the union-find forest.` });
    let k = 0;
    while (tree.length < ids.length - 1 && k < sorted.length) {
      const e = sorted[k];
      cnt["edges examined"]++;
      status[k] = "cur";
      const pu = find(e.u), pv = find(e.v);
      const ru = pu[pu.length - 1], rv = pv[pv.length - 1];
      const ok = ru !== rv;
      push({ line: [6, 7], cur: k, est: est({ [`${e.u}-${e.v}`]: "active" }), nst: nst({ [e.u]: "active", [e.v]: "active" }),
        ask: { prompt: `Accept or reject edge ${e.u}${e.v} (${e.w})?`, options: ["accept", "reject"], ok: [ok ? "accept" : "reject"] },
        text: `Next lightest edge: <b>${e.u}–${e.v}</b> (weight ${e.w}). Would it close a cycle?` });
      push({ line: [8, 15, 16], cur: k, findPaths: [pu, pv], est: est({ [`${e.u}-${e.v}`]: "active" }), nst: nst({ [e.u]: "active", [e.v]: "active" }),
        text: `find(${e.u}) follows ${pu.join(" → ")}, root <b>${ru}</b>. find(${e.v}) follows ${pv.join(" → ")}, root <b>${rv}</b>. ${ok ? "Different roots: different trees." : "Same root: already connected!"}` });
      if (ok) {
        tree.push(e); status[k] = "acc"; cnt["tree weight"] += e.w; cnt.unions++;
        const [big, small] = size[ru] >= size[rv] ? [ru, rv] : [rv, ru];
        parent[small] = big; size[big] += size[small];
        push({ line: [9, 10, 11], cur: k, est: est({ [`${e.u}-${e.v}`]: "tree" }),
          text: `<b>Accept ${e.u}–${e.v}</b>. union: the smaller tree (root ${small}) hangs under root ${big} (union by size keeps trees shallow). MST edges: ${tree.length}/${ids.length - 1}.` });
      } else {
        rej.push(e); status[k] = "rej";
        // the cycle: tree path between u and v
        const cyc = treePath(tree, e.u, e.v);
        const over = {}; cyc.forEach((x) => (over[`${x.u}-${x.v}`] = "back"));
        push({ line: 8, cur: k, est: est(Object.assign(over, { [`${e.u}-${e.v}`]: "back" })),
          text: `<b>Reject ${e.u}–${e.v}</b>: ${e.u} and ${e.v} are already joined by tree edges ${cyc.map((x) => x.u + x.v).join(", ")} (purple). Adding it would close a cycle.` });
      }
      k++;
    }
    const done = tree.length === ids.length - 1;
    push({ line: 12, final: true, text: done ? `Done after examining ${k} of ${sorted.length} edges: MST = {${tree.map((e) => e.u + e.v).join(", ")}}, total weight <b>${cnt["tree weight"]}</b>. Sorting dominates: O(|E| log |E|).`
      : `Ran out of edges with only ${tree.length} tree edges: the graph is not connected, so the result is a spanning <i>forest</i>.` });
    return frames;
  }
  function treePath(tree, a, b) {
    const A = {}; tree.forEach((e) => { (A[e.u] = A[e.u] || []).push([e.v, e]); (A[e.v] = A[e.v] || []).push([e.u, e]); });
    const prev = { [a]: null }, q = [a];
    while (q.length) { const x = q.shift(); if (x === b) break; (A[x] || []).forEach(([y, e]) => { if (!(y in prev)) { prev[y] = [x, e]; q.push(y); } }); }
    const out = []; let x = b; while (prev[x]) { out.push(prev[x][1]); x = prev[x][0]; }
    return out;
  }

  /* ---------------- reference trees for the comparison panel ---------------- */
  function mstEdges() { // Prim from start
    const f = recordPD(false); const last = f[f.length - 1];
    return Object.keys(last.est).filter((k) => last.est[k] === "tree");
  }
  function sptEdges() {
    const f = recordPD(true); const last = f[f.length - 1];
    return Object.keys(last.est).filter((k) => last.est[k] === "tree");
  }
  let other = []; // edges of the other tree not in this one (for final overlay)
  function compare() {
    const m = mstEdges().map((k) => k.split("-").sort().join("")), s = sptEdges().map((k) => k.split("-").sort().join(""));
    const w = (k) => (G.edges.find((e) => e.u + e.v === k) || {}).w;
    const onlyM = m.filter((x) => !s.includes(x)), onlyS = s.filter((x) => !m.includes(x));
    const mw = m.reduce((t, k) => t + (w(k) || 0), 0), sw = s.reduce((t, k) => t + (w(k) || 0), 0);
    $("cmp").innerHTML = `MST (Prim/Kruskal): <b>${m.join(" ")}</b> — total weight ${mw}.<br>Shortest-path tree from ${start} (Dijkstra): <b>${s.join(" ")}</b> — total edge weight ${sw}.<br>` +
      (onlyM.length ? `They differ: only the MST uses <b>${onlyM.join(" ")}</b>; only the shortest-path tree uses <b>${onlyS.join(" ")}</b>. An MST minimises the <i>sum of all edges</i>; a shortest-path tree minimises <i>each vertex's distance from ${start}</i>.` : `On this graph (from ${start}) both trees coincide — try the ⚖️ preset to see them differ.`);
    const mine = algo === "dijkstra" ? s : m, theirs = algo === "dijkstra" ? m : s;
    other = theirs.filter((x) => !mine.includes(x));
  }

  /* ---------------- drawing ---------------- */
  function drawGraph(f) {
    const svg = $("svgG");
    const est = {};
    G.edges.forEach((e) => { const k = `${e.u}-${e.v}`, s = f && (f.est[k] || f.est[`${e.v}-${e.u}`]); if (s) est[k] = s; });
    if (f && f.final) other.forEach((k) => { const key = `${k[0]}-${k[1]}`; if (!est[key]) est[key] = "back"; });
    const nst = Object.assign({}, f ? f.nst : {});
    if (selV) nst[selV] = "ember";
    Forge.graph(svg, { nodes: G.nodes.map((n) => ({ id: n.id, x: n.x, y: n.y })), edges: G.edges.map((e) => ({ u: e.u, v: e.v, w: e.w })) },
      { width: 760, height: 420, nodeState: nst, edgeState: est, nodeNote: f && f.notes ? Object.fromEntries(Object.entries(f.notes).map(([k, v]) => [k, v])) : null, r: 21 });
    if ($("edit").checked) {
      G.nodes.forEach((n) => svg.appendChild(S("circle", { cx: n.x, cy: n.y, r: 26, fill: "transparent", style: "cursor:pointer", "data-node": n.id })));
    }
  }
  $("svgG").addEventListener("click", onSvgClick);
  function onSvgClick(ev) {
    if (!$("edit").checked) return;
    const svg = $("svgG");
    const hit = ev.target.getAttribute && ev.target.getAttribute("data-node");
    if (hit) {
      if (!selV) selV = hit;
      else if (selV === hit) selV = null;
      else {
        const k = ek(selV, hit), i = G.edges.findIndex((e) => ek(e.u, e.v) === k);
        if (i >= 0) G.edges.splice(i, 1);
        else G.edges.push({ u: selV < hit ? selV : hit, v: selV < hit ? hit : selV, w: Math.max(1, Math.min(99, Math.round(+$("ew").value || 1))) });
        selV = null; syncText(); run(); return;
      }
      $("delV").disabled = !selV;
      player.go(player.index); return;
    }
    const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    const used = new Set(G.nodes.map((n) => n.id));
    const id = "abcdefghijklmnopqrstuvwxyz".split("").find((c) => !used.has(c));
    if (!id || G.nodes.length >= 12) return;
    G.nodes.push({ id, x: Math.max(25, Math.min(735, p.x)), y: Math.max(25, Math.min(395, p.y)) });
    G.nodes.sort((a, b) => (a.id < b.id ? -1 : 1));
    fillStart(); run();
  }
  function drawSide(f) {
    const s1 = $("side1"), s2 = $("side2");
    s1.innerHTML = ""; s2.innerHTML = "";
    if (algo === "kruskal") {
      $("t1").textContent = "Edges sorted by weight"; $("t2").textContent = "Union-find forest (arrows point to parent)";
      const t = E("table", { class: "t" }, E("tr", null, E("th", null, "#"), E("th", null, "edge"), E("th", null, "w"), E("th", null, "result")));
      f.sorted.forEach((e, i) => {
        const st = f.status[i];
        t.appendChild(E("tr", { class: st === "cur" && i === f.cur ? "cur" : st }, E("td", null, i + 1), E("td", null, `${e.u}${e.v}`), E("td", null, e.w),
          E("td", null, st === "acc" ? "✓ tree" : st === "rej" ? "✗ cycle" : i === f.cur ? "…" : "")));
      });
      s1.appendChild(t);
      s2.appendChild(drawForest(f));
      return;
    }
    const isD = algo === "dijkstra";
    $("t1").textContent = "Tree vertices | Remaining vertices"; $("t2").textContent = `Priority queue (by ${isD ? "distance d" : "label weight"})`;
    const t = E("table", { class: "t" }, E("tr", null, E("th", null, "Tree vertices"), E("th", null, "Remaining vertices")));
    (f.rows || []).forEach((r) => t.appendChild(E("tr", null, E("td", { class: "l" }, r.tree), E("td", { class: "l" }, ...r.rest.flatMap((x, k) => [k ? "  " : "", E("span", { class: x.upd ? "upd" : "" , style: x.upd ? { color: "var(--c-swap)", fontWeight: 700 } : null }, x.t)])))));
    if (!(f.rows || []).length) s1.appendChild(E("p", { class: "muted small", style: { margin: 0 } }, "Rows appear as vertices join the tree."));
    else s1.appendChild(t);
    const q = f.pq || [];
    if (!q.length) s2.appendChild(E("p", { class: "muted small", style: { margin: 0 } }, "(empty)"));
    else {
      const t2 = E("table", { class: "t" }, E("tr", null, E("th", null, "vertex"), E("th", null, isD ? "d" : "weight"), E("th", null, isD ? "via" : "nearest tree vertex")));
      q.forEach((x, i) => t2.appendChild(E("tr", { class: i === 0 ? "cur" : "" }, E("td", null, x.v + (i === 0 ? " ← min" : "")), E("td", null, x.w), E("td", null, x.p || "−"))));
      s2.appendChild(t2);
    }
  }
  function drawForest(f) {
    const ids = G.nodes.map((n) => n.id), par = f.parent;
    const kids = Object.fromEntries(ids.map((v) => [v, []]));
    ids.forEach((v) => { if (par[v] !== v) kids[par[v]].push(v); });
    const roots = ids.filter((v) => par[v] === v);
    const pos = {}; let x = 0; let maxD = 0;
    const lay = (v, d) => { maxD = Math.max(maxD, d); if (!kids[v].length) { pos[v] = [x++, d]; return; } kids[v].forEach((c) => lay(c, d + 1)); const xs = kids[v].map((c) => pos[c][0]); pos[v] = [(Math.min(...xs) + Math.max(...xs)) / 2, d]; };
    roots.forEach((r) => { lay(r, 0); x += 0.4; });
    const Wd = Math.max(260, x * 46 + 20), Ht = 40 + maxD * 52 + 24;
    const svg = S("svg", { viewBox: `0 0 ${Wd} ${Ht}`, class: "stage", role: "img", "aria-label": "Union-find forest" });
    svg.appendChild(S("defs", null, S("marker", { id: "uf-arr", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto" }, S("path", { d: "M0 0 L10 5 L0 10 z", fill: "var(--line-2)" }))));
    const P = (v) => [20 + pos[v][0] * 46 + 10, 26 + pos[v][1] * 52];
    const onPath = new Set((f.findPaths || []).flat());
    ids.forEach((v) => { if (par[v] !== v) { const [x1, y1] = P(v), [x2, y2] = P(par[v]); const L = Math.hypot(x2 - x1, y2 - y1) || 1; svg.appendChild(S("line", { x1, y1: y1 - 15 * (y1 - y2) / L, x2: x2 + 15 * (x1 - x2) / L, y2: y2 + 15 * (y1 - y2) / L, stroke: onPath.has(v) ? "var(--c-active)" : "var(--line-2)", "stroke-width": 2, "marker-end": "url(#uf-arr)" })); } });
    ids.forEach((v) => {
      const [cx, cy] = P(v), root = par[v] === v;
      svg.appendChild(S("circle", { cx, cy, r: 14, fill: onPath.has(v) ? "var(--c-active)" : root ? "var(--ember-soft)" : "var(--panel-2)", stroke: root ? "var(--ember)" : "var(--line-2)", "stroke-width": 2 }));
      svg.appendChild(S("text", { x: cx, y: cy + 4.5, "text-anchor": "middle", "font-size": 13, "font-weight": 700, fill: onPath.has(v) ? "#0d1117" : "var(--ink)" }, v));
    });
    return svg;
  }

  /* ---------------- wiring ---------------- */
  const player = Forge.player($("player"), { frames: [], render });
  function render(f, idx) {
    drawGraph(f);
    drawSide(f);
    code.highlight(f.line);
    ctr.set(f.ctr);
    say.say(f.text);
    const box = $("ask");
    if (predict && f.ask) {
      player.pause();
      box.hidden = false;
      $("askQ").textContent = f.ask.prompt;
      const btns = $("askBtns"); btns.innerHTML = "";
      const a = answered[idx];
      f.ask.options.forEach((o) => btns.appendChild(E("button", { class: "btn sm" + (a && a.o === o ? " primary" : ""), disabled: !!a, onclick: () => {
        const ok = f.ask.ok.includes(o);
        score.total++; if (ok) score.right++;
        $("score").textContent = `predictions: ${score.right} / ${score.total}`;
        answered[idx] = { o, fb: ok ? `<span style="color:var(--ok)">✓ Right${f.ask.ok.length > 1 ? " (a tie: " + f.ask.ok.join(" or ") + ")" : ""}.</span>` : `<span style="color:var(--bad)">✗ The greedy choice is ${f.ask.ok.join(" or ")}.</span>` };
        render(f, idx);
      } }, o)));
      if (a) btns.appendChild(E("button", { class: "btn sm steel", onclick: () => player.go(idx + 1) }, "Continue ▶"));
      $("askFb").innerHTML = a ? a.fb : "";
    } else box.hidden = true;
  }
  function run() {
    if (!G.nodes.length) return;
    compare();
    Object.keys(answered).forEach((k) => delete answered[k]);
    player.load(algo === "kruskal" ? recordK() : recordPD(algo === "dijkstra"));
  }
  function setAlgo(a) {
    algo = a; $("algo").value = a;
    $("code").innerHTML = ""; $("ctr").innerHTML = "";
    code = Forge.code($("code"), LINES[a]);
    ctr = Forge.counters($("ctr"), COUNTERS[a]);
    $("start").disabled = a === "kruskal";
  }
  $("algo").onchange = (e) => { setAlgo(e.target.value); run(); };
  $("preset").onchange = (e) => { loadPreset(e.target.value); if (e.target.value === "dijk" && algo === "prim") setAlgo("dijkstra"); run(); };
  $("start").onchange = (e) => { start = e.target.value; run(); };
  $("load").onclick = () => { parseEdges($("edges").value); syncText(); fillStart(); run(); };
  $("edges").addEventListener("keydown", (e) => { if (e.key === "Enter") $("load").click(); });
  $("rand").onclick = () => {
    const n = 5 + Math.floor(Math.random() * 3), ids = "abcdefg".slice(0, n).split("");
    const pos = Object.fromEntries(ids.map((id, k) => [id, nextFreePos(k, n)]));
    const edges = [];
    for (let k = 1; k < n; k++) { const j = Math.floor(Math.random() * k); edges.push(`${ids[j]}-${ids[k]} ${1 + Math.floor(Math.random() * 9)}`); }
    for (let t = 0; t < n; t++) { const a = ids[Math.floor(Math.random() * n)], b = ids[Math.floor(Math.random() * n)]; if (a !== b) edges.push(`${a}-${b} ${1 + Math.floor(Math.random() * 9)}`); }
    G = { nodes: [], edges: [] }; parseEdges(edges.join(", "), pos); start = "a"; syncText(); fillStart(); run();
  };
  $("edit").onchange = (e) => { selV = null; $("delV").disabled = true; $("svgG").classList.toggle("editing", e.target.checked); player.go(player.index); };
  $("delV").onclick = () => {
    if (!selV) return;
    G.nodes = G.nodes.filter((n) => n.id !== selV); G.edges = G.edges.filter((e) => e.u !== selV && e.v !== selV);
    selV = null; $("delV").disabled = true; syncText(); fillStart(); run();
  };
  $("predictMode").onchange = (e) => { predict = e.target.checked; player.go(player.index); };

  const qa = new URLSearchParams(location.search).get("algo");
  setAlgo(qa === "kruskal" || qa === "dijkstra" ? qa : "prim");
  loadPreset(qa === "dijkstra" ? "dijk" : "prim");
  $("preset").value = qa === "dijkstra" ? "dijk" : "prim";
  run();
})();
