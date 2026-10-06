/* Algorithm Forge — Vector search (UI). Algorithms live in vector-search-core.js. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const E = Forge.el, S = Forge.svg, V = window.VecCore;
  Forge.page({ title: "Vector Search", chapter: "Ch 18 · The Frontier" });

  const LINES = {
    brute: [
      "ALGORITHM BruteForceKNN(P[0..n-1], q, k)",
      "    best ← empty list            // the k closest so far",
      "    for i ← 0 to n - 1 do",
      "        d ← dist(q, P[i])",
      "        if length(best) < k or d < worst distance in best then",
      "            insert (d, i) into best; keep only k",
      "    return best",
    ],
    kd: [
      "ALGORITHM KdBuild(P, depth)",
      "    if P is empty then return null",
      "    axis ← depth mod 2            // x, y, x, y, …",
      "    m ← median point of P along axis; node ← m",
      "    node.left ← KdBuild(points before m, depth + 1)",
      "    node.right ← KdBuild(points after m, depth + 1)",
      "",
      "ALGORITHM KdSearch(node, q, k)",
      "    if node = null then return",
      "    d ← dist(q, node.point); update best",
      "    diff ← q[axis] - node.point[axis]",
      "    near, far ← child on q's side, the other child",
      "    KdSearch(near, q, k)",
      "    if |diff| < k-th best distance then",
      "        KdSearch(far, q, k)       // the ball crosses the line",
      "    else prune far               // the whole region is too far",
    ],
    lsh: [
      "ALGORITHM LshBuild(P, K, L)",
      "    for t ← 1 to L do",
      "        pick K random lines (w, b)",
      "        for each p in P do",
      "            code ← K bits: [w·p + b ≥ 0] for each line",
      "            add p to table[t][code]",
      "",
      "ALGORITHM LshQuery(q, k)",
      "    candidates ← empty set",
      "    for t ← 1 to L do",
      "        candidates ← candidates ∪ table[t][code_t(q)]",
      "    compute dist(q, c) for each candidate c only",
      "    return the k closest candidates",
    ],
    hnsw: [
      "ALGORITHM HnswInsert(q, M, efC)",
      "    ℓ ← ⌊−ln(uniform(0, 1)) · mL⌋     // mL = 1 / ln M",
      "    ep ← entry point",
      "    for lc ← top downto ℓ + 1 do ep ← SearchLayer(q, ep, 1, lc)",
      "    for lc ← min(top, ℓ) downto 0 do",
      "        W ← SearchLayer(q, ep, efC, lc)",
      "        link q to ≤ M diverse neighbors from W",
      "        shrink overfull neighbor lists; ep ← W",
      "",
      "ALGORITHM HnswSearch(q, k, ef)",
      "    ep ← entry point (top layer)",
      "    for lc ← top downto 1 do",
      "        ep ← SearchLayer(q, ep, 1, lc)     // greedy",
      "    W ← SearchLayer(q, ep, max(ef, k), 0)",
      "    return the k nearest in W",
      "",
      "ALGORITHM SearchLayer(q, ep, ef, lc)",
      "    C ← {ep}; W ← {ep}       // candidates, results",
      "    while C is not empty do",
      "        c ← nearest in C; remove it from C",
      "        if dist(c) > dist(furthest in W) then break",
      "        for each unvisited neighbor e of c on layer lc do",
      "            if |W| < ef or dist(e) < dist(furthest in W) then",
      "                add e to C and W; trim W to ef",
    ],
  };

  const st = { mode: "brute", P: [], q: [0.5, 0.5], clickAdds: false, struct: null, truth: [] };
  const W = 600, MG = 12, SPAN = W - 2 * MG;
  const X = (x) => MG + x * SPAN, Y = (y) => MG + (1 - y) * SPAN;
  const stage = $("stage");
  stage.setAttribute("viewBox", `0 0 ${W} ${W}`);
  const codeSw = FX.codeSwitch($("code"));
  let code = null, ctr = null, player = null;
  const say = Forge.narrate($("say"));
  const predict = FX.predict($("predictHost"), () => player);
  const k = () => +$("k").value;
  const f3 = (v) => v.toFixed(3);

  /* ---------------- data ---------------- */
  function regen() {
    const seed = +$("seed").value || 1;
    st.P = V.clusters(+$("n").value, 2, seed);
    st.q = V.queriesNear(st.P, 1, seed + 7, 0.06)[0];
  }

  /* ---------------- record ---------------- */
  function record() {
    const P = st.P, q = st.q, K = k(), frames = [];
    const c = { dist: 0 };
    st.truth = P.length ? V.brute(P, q, Math.min(K, P.length), { dist: 0 }) : [];
    const push = (p) => { if (frames.length < 6000) frames.push({ p, c: Object.assign({}, c) }); };
    if (!P.length) { push({ line: 0, text: "No points yet. Press <b>Random clusters</b>, or switch the click mode to \"adds a point\" and click the plane." }); return frames; }
    const kk = Math.min(K, P.length);
    let result = [];
    if (st.mode === "brute") {
      push({ line: 1, best: [], text: `Brute force: compare q with all ${P.length} points, keeping the ${kk} closest.` });
      result = V.brute(P, q, kk, c, push);
    } else if (st.mode === "kd") {
      const tree = V.kdBuild(P);
      st.struct = { tree, nodes: V.kdNodes(tree) };
      if ($("kdBuild").checked) {
        for (let d = 0; d <= tree.maxDepth; d++) push({ line: d === 0 ? 3 : 4, kdDepth: d, text: d === 0 ? `Build: the root splits all ${P.length} points at the median x (a vertical line). Half go left, half go right.` : `Build, depth ${d}: every region splits again at its median ${d % 2 ? "y (horizontal lines)" : "x (vertical lines)"}. Depth so far: ${d} of ${tree.maxDepth}.` });
      }
      push({ line: 8, kdDepth: tree.maxDepth, best: [], visited: [], pruned: [], r2: Infinity, text: `Tree built (depth ${tree.maxDepth}, no distances needed — only sorting). Now search for the ${kk} nearest neighbor${kk > 1 ? "s" : ""} of q, starting at the root.` });
      result = V.kdSearch(tree, P, q, kk, c, (p) => push(Object.assign({ kdDepth: tree.maxDepth }, p)));
    } else if (st.mode === "lsh") {
      const Kb = +$("K").value, L = +$("L").value;
      const idx = V.lshBuild(P, Kb, L, (+$("seed").value || 1) + 202, 2);
      st.struct = { idx };
      push({ line: 5, table: 0, buildView: true, text: `Build: ${L} table${L > 1 ? "s" : ""}, each with ${Kb} random line${Kb > 1 ? "s" : ""}. Every point gets a ${Kb}-bit code per table (which side of each line it is on). Table 1's lines are shown; ${idx.tables[0].buckets.size} of its buckets are non-empty.` });
      const nn = st.truth[0].i;
      result = V.lshSearch(idx, P, q, kk, c, (p) => {
        if (p.table === 0 && !frames.some((f) => f.p.asked)) {
          push({ line: 10, table: 0, asked: true, cand: [], text: `Hash q with table 1: which side of each line is it on?`,
            ask: { q: `Will q's true nearest neighbor (#${nn}, ringed) land in the same table-1 bucket as q?`, opts: ["Yes", "No"], ans: p.bucket.includes(nn) ? 0 : 1, why: p.bucket.includes(nn) ? "No line of table 1 passes between them, so they get the same bits." : "At least one random line passes between q and its nearest neighbor, so their codes differ. That's why LSH uses several tables." } });
        }
        push(p);
      });
    } else {
      const M = +$("M").value, efC = +$("efC").value, ef = +$("ef").value;
      const bc = { dist: 0 };
      const anim = $("hnswAnim").checked;
      const G = V.hnswBuild(P, { M, efC, seed: (+$("seed").value || 1) + 101 }, bc, anim ? (qi, l, Gr) => {
        const snap = Gr.nbr.map((layer) => layer.map((a) => (a ? a.slice() : null)));
        push({ line: l > 0 ? 4 : 6, layer: 0, buildSnap: snap, newNode: qi, upto: qi, text: `Insert #${qi}: random level ℓ = ${l}${l > 0 ? ` — it also joins layer${l > 1 ? "s" : ""} 1${l > 1 ? "–" + l : ""}` : ""}. Linked to ${(snap[0][qi] || []).length} neighbor${(snap[0][qi] || []).length === 1 ? "" : "s"} on layer 0 (at most M = ${M}, chosen to point in different directions).`, buildDist: bc.dist });
      } : null);
      st.struct = { G, buildDist: bc.dist };
      fillLayerSelect(G);
      push({ line: 10, layer: G.top, text: `Graph built: ${P.length} nodes, ${G.top + 1} layer${G.top ? "s" : ""}, ${bc.dist.toLocaleString("en-US")} distance computations spent on building (M = ${M}, efConstruction = ${efC}). Now search for q with ef = ${Math.max(ef, kk)}.`, buildDist: bc.dist });
      let asked = false;
      c.hops = 0;
      result = V.hnswSearch(G, P, q, kk, ef, c, (p) => {
        if (p.line === 23 && !p.looked.length) return;
        if (!p.text) p.text = hnswText(p, G);
        if (!asked && p.greedy && p.line === 19 && p.look && p.look.length >= 2 && !p.stop) {
          asked = true;
          const cand = p.look.slice(0, 5), letters = "ABCDE";
          const dc = V.d2(q, P[p.cur]);
          const ds = cand.map((i) => V.d2(q, P[i]));
          const mi = ds.indexOf(Math.min(...ds));
          const ans = ds[mi] < dc ? mi : cand.length;
          p = Object.assign({}, p, { labels: Object.fromEntries(cand.map((i, j) => [i, letters[j]])),
            ask: { q: `Greedy step on layer ${p.layer}: from #${p.cur}, the search will check the labelled neighbors. Where does it go next?`, opts: cand.map((_, j) => letters[j]).concat(["Stay (none is closer)"]), ans, why: ans < cand.length ? `${letters[ans]} (#${cand[ans]}) is the closest of them to q, and closer than #${p.cur}, so the greedy walk moves there.` : `None of them is closer to q than #${p.cur}, so the search stays and will drop a layer.` } });
        }
        push(p);
      });
    }
    // final frame: keep the last frame's picture, add the result
    const last = frames[frames.length - 1].p;
    const keep = {};
    ["visited", "pruned", "kdDepth", "cand", "layer"].forEach((key) => { if (last[key] != null) keep[key] = last[key]; });
    if (st.mode === "hnsw") keep.layer = 0;
    const rec = V.recall(result, st.truth);
    push(Object.assign(keep, { line: { brute: 6, kd: 8, lsh: 12, hnsw: 14 }[st.mode], best: result, final: true, recall: rec, table: -1,
      text: `Result: ${result.length ? result.map((b) => "#" + b.i).join(", ") : "nothing"} — recall ${Math.round(rec * kk)}/${kk}. <b>${c.dist}</b> distance computation${c.dist === 1 ? "" : "s"}, versus ${P.length} for brute force${rec < 1 ? ". The red ring marks a true neighbor that was missed." : "."}` }));
    return frames;
  }

  function hnswText(p, G) {
    const Wl = p.W.length;
    if (p.line === 19) {
      if (!p.look.length && !p.greedy) return `Layer 0: expand #${p.cur} — all of its neighbors were already visited, so this costs nothing.`;
      if (!p.look.length) return `Layer ${p.layer}: #${p.cur} has no unvisited neighbors here${G.level.filter((x) => x >= p.layer).length === 1 ? " — it is alone on this layer" : ""}.`;
      if (p.greedy) return `Layer ${p.layer} (greedy, ef = 1): stand on #${p.cur}, the closest node found so far. Check its ${p.look.length} unvisited neighbor${p.look.length === 1 ? "" : "s"} on this layer.`;
      return `Layer 0: expand #${p.cur}, the closest candidate not yet expanded. It has ${p.look.length} unvisited neighbor${p.look.length === 1 ? "" : "s"}; each needs one distance computation.`;
    }
    if (p.line === 23) {
      if (p.greedy) return `Computed ${p.looked.length} distance${p.looked.length === 1 ? "" : "s"}. ${p.W[0] !== p.cur ? `#${p.W[0]} is closer to q — move there.` : `None is closer than #${p.cur}.`}`;
      return `Computed ${p.looked.length} distance${p.looked.length === 1 ? "" : "s"}. W now holds the best ${Wl} node${Wl === 1 ? "" : "s"} found (green); ${p.C.length} candidate${p.C.length === 1 ? "" : "s"} wait to be expanded (purple rings).`;
    }
    if (p.line === 20) return p.greedy ? `No neighbor of the current node is closer: layer ${p.layer} is done.` : `The nearest remaining candidate #${p.cur} is farther than the worst of the ${Wl} results in W, so nothing better can be reached from here: <b>stop</b>.`;
    return "";
  }

  function fillLayerSelect(G) {
    const sel = $("layerView"), cur = sel.value;
    sel.innerHTML = "";
    sel.appendChild(E("option", { value: "auto" }, "follow the search"));
    for (let l = G.top; l >= 0; l--) sel.appendChild(E("option", { value: String(l) }, `layer ${l}`));
    sel.value = [...sel.options].some((o) => o.value === cur) ? cur : "auto";
    const host = $("layers");
    host.innerHTML = "";
    for (let l = 0; l <= G.top; l++) {
      const cnt = G.level.filter((x) => x >= l).length;
      host.appendChild(E("div", { class: "ly", "data-l": l }, E("span", { style: { minWidth: "62px" } }, `layer ${l}`), E("span", { class: "bar", style: { width: Math.max(4, (cnt / G.level.length) * 120) + "px" } }), E("span", null, `${cnt} node${cnt === 1 ? "" : "s"}`)));
    }
  }

  /* ---------------- render ---------------- */
  function clipLine(w, b) {
    const pts = [];
    const add = (x, y) => { if (x >= -1e-9 && x <= 1 + 1e-9 && y >= -1e-9 && y <= 1 + 1e-9) pts.push([x, y]); };
    if (Math.abs(w[1]) > 1e-12) { add(0, -b / w[1]); add(1, -(b + w[0]) / w[1]); }
    if (Math.abs(w[0]) > 1e-12) { add(-b / w[0], 0); add(-(b + w[1]) / w[0], 1); }
    if (pts.length < 2) return null;
    let best = [pts[0], pts[1]], bd = -1;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const d = V.d2(pts[i], pts[j]); if (d > bd) { bd = d; best = [pts[i], pts[j]]; } }
    return best;
  }

  function render(f, i) {
    const p = f.p, P = st.P, q = st.q;
    stage.innerHTML = "";
    stage.appendChild(S("rect", { x: MG, y: MG, width: SPAN, height: SPAN, fill: "none", stroke: "var(--line)", "stroke-width": 1 }));
    const under = S("g"), mid = S("g"), top = S("g");
    stage.append(under, mid, top);
    const nodeState = {};      // i -> state colour key
    const rings = {};          // i -> ring colour
    let opacity = null;        // i -> opacity for HNSW layer view
    let radius = null;
    const best = p.best || (p.W && !p.greedy ? p.W.slice(0, k()).map((x) => ({ i: x })) : null);

    if (st.mode === "brute") {
      if (p.seenUpTo != null) for (let j = 0; j <= p.seenUpTo; j++) nodeState[j] = "compare";
      if (p.final) P.forEach((_, j) => (nodeState[j] = "compare"));
      if (p.cur != null) nodeState[p.cur] = "active";
    } else if (st.mode === "kd" && st.struct) {
      (p.pruned || []).forEach((r) => under.appendChild(S("rect", { x: X(r.lo[0]), y: Y(r.hi[1]), width: (r.hi[0] - r.lo[0]) * SPAN, height: (r.hi[1] - r.lo[1]) * SPAN, fill: "var(--c-dim)", opacity: 0.55 })));
      if (p.farCell) { const r = p.farCell; under.appendChild(S("rect", { x: X(r.lo[0]), y: Y(r.hi[1]), width: (r.hi[0] - r.lo[0]) * SPAN, height: (r.hi[1] - r.lo[1]) * SPAN, fill: "var(--c-pivot)", opacity: 0.12, stroke: "var(--c-pivot)", "stroke-dasharray": "6 4", "stroke-width": 2 })); }
      const dmax = p.kdDepth != null ? p.kdDepth : 99;
      st.struct.nodes.forEach((nd) => {
        if (nd.depth > dmax) return;
        const pt = P[nd.i], hl = p.node === nd;
        const a = nd.axis === 0 ? [X(pt[0]), Y(nd.lo[1]), X(pt[0]), Y(nd.hi[1])] : [X(nd.lo[0]), Y(pt[1]), X(nd.hi[0]), Y(pt[1])];
        mid.appendChild(S("line", { x1: a[0], y1: a[1], x2: a[2], y2: a[3], stroke: hl ? "var(--ember)" : nd.axis === 0 ? "var(--steel)" : "var(--c-pivot)", "stroke-width": hl ? 3 : Math.max(0.8, 2.4 - nd.depth * 0.3), opacity: hl ? 1 : 0.55 }));
      });
      (p.visited || []).forEach((j) => (nodeState[j] = "compare"));
      if (p.cur != null) nodeState[p.cur] = "active";
      if (p.r2 != null && isFinite(p.r2)) radius = Math.sqrt(p.r2);
    } else if (st.mode === "lsh" && st.struct) {
      const idx = st.struct.idx;
      const t = p.table != null && p.table >= 0 ? p.table : idx.tables.length - 1;
      const T = idx.tables[t];
      if (!p.buildView && !p.asked && p.table != null && p.table >= 0) {
        const poly = V.lshCell(T, q);
        if (poly.length >= 3) under.appendChild(S("polygon", { points: poly.map((v) => X(v[0]) + "," + Y(v[1])).join(" "), fill: "var(--steel)", opacity: 0.16, stroke: "var(--steel)", "stroke-width": 1.5 }));
      }
      if (!p.final && p.table !== -1) T.planes.forEach((pl) => { const s = clipLine(pl.w, pl.b); if (s) mid.appendChild(S("line", { x1: X(s[0][0]), y1: Y(s[0][1]), x2: X(s[1][0]), y2: Y(s[1][1]), stroke: "var(--c-pivot)", "stroke-width": 1.6, opacity: 0.75 })); });
      (p.cand || []).forEach((j) => { if (p.table === -1 || p.final) nodeState[j] = "compare"; else rings[j] = "var(--c-compare)"; });
      if (p.bucket && !p.asked) p.bucket.forEach((j) => (nodeState[j] = "pivot"));
      if (p.asked) rings[st.truth[0].i] = "var(--c-done)";
      const lbl = p.final || p.table === -1 ? "all tables" : `table ${t + 1} of ${idx.tables.length}`;
      top.appendChild(S("text", { x: W - MG - 6, y: MG + 16, "text-anchor": "end", "font-size": 13, fill: "var(--muted)" }, lbl));
    } else if (st.mode === "hnsw" && st.struct) {
      const G = st.struct.G;
      const sel = $("layerView").value;
      const L = sel === "auto" ? (p.layer != null ? p.layer : 0) : +sel;
      const nbr = p.buildSnap ? p.buildSnap : G.nbr;
      const layer = nbr[L] || [];
      const seen = new Set();
      layer.forEach((list, a) => {
        if (!list) return;
        list.forEach((b) => {
          const key = a < b ? a + "-" + b : b + "-" + a;
          if (seen.has(key)) return; seen.add(key);
          const hot = p.cur != null && (a === p.cur || b === p.cur) && (p.look || p.looked || []).includes(a === p.cur ? b : a);
          under.appendChild(S("line", { x1: X(P[a][0]), y1: Y(P[a][1]), x2: X(P[b][0]), y2: Y(P[b][1]), stroke: hot ? "var(--ember)" : "var(--line-2)", "stroke-width": hot ? 2.5 : L > 0 ? 1.8 : 1, opacity: hot ? 1 : 0.8 }));
        });
      });
      opacity = {};
      P.forEach((_, j) => { const inLayer = (p.upto == null || j <= p.upto) && G.level[j] >= L; opacity[j] = inLayer ? 1 : (p.upto != null && j > p.upto ? 0.08 : 0.22); });
      (p.visited || []).forEach((j) => (nodeState[j] = "compare"));
      if (p.W && !p.final) p.W.forEach((j) => (nodeState[j] = "done"));
      (p.C || []).forEach((j) => (rings[j] = "var(--c-pivot)"));
      if (p.cur != null) nodeState[p.cur] = "active";
      if (p.newNode != null) nodeState[p.newNode] = "swap";
      document.querySelectorAll("#layers .ly").forEach((d) => d.classList.toggle("on", +d.dataset.l === L));
      top.appendChild(S("text", { x: W - MG - 6, y: MG + 16, "text-anchor": "end", "font-size": 13, fill: "var(--muted)" }, `layer ${L} of 0–${G.top}${p.buildSnap ? " · building" : ""}`));
    }

    // result links + final state
    if (best && best.length && (p.final || st.mode !== "hnsw" || !p.greedy)) {
      best.forEach((b) => { if (P[b.i]) mid.appendChild(S("line", { x1: X(q[0]), y1: Y(q[1]), x2: X(P[b.i][0]), y2: Y(P[b.i][1]), stroke: "var(--c-done)", "stroke-width": 2, opacity: 0.9 })); });
      best.forEach((b) => (nodeState[b.i] = "done"));
    }
    if (p.final) {
      const got = new Set((p.best || []).map((b) => b.i));
      st.truth.forEach((t) => { if (!got.has(t.i)) rings[t.i] = "var(--c-swap)"; });
    }
    if (radius != null) mid.appendChild(S("circle", { cx: X(q[0]), cy: Y(q[1]), r: radius * SPAN, fill: "var(--steel)", "fill-opacity": 0.06, stroke: "var(--steel)", "stroke-width": 1.8, "stroke-dasharray": "6 4" }));

    // points
    const COLS = { compare: "var(--c-compare)", active: "var(--c-active)", done: "var(--c-done)", pivot: "var(--c-pivot)", swap: "var(--c-swap)" };
    P.forEach((pt, j) => {
      const s = nodeState[j];
      const big = st.mode === "hnsw" && st.struct && st.struct.G.level[j] > 0;
      const r = s ? 6 : big ? 5 : 4.2;
      const g = S("g", { opacity: opacity ? opacity[j] : 1 });
      if (rings[j]) g.appendChild(S("circle", { cx: X(pt[0]), cy: Y(pt[1]), r: r + 5, fill: "none", stroke: rings[j], "stroke-width": 2.5 }));
      g.appendChild(S("circle", { cx: X(pt[0]), cy: Y(pt[1]), r, fill: COLS[s] || "var(--c-bar)", stroke: "var(--bg-2)", "stroke-width": 1.2 }));
      if (p.labels && p.labels[j]) g.appendChild(S("text", { x: X(pt[0]) + 9, y: Y(pt[1]) - 8, "font-size": 15, "font-weight": 800, fill: "var(--ink)" }, p.labels[j]));
      top.appendChild(g);
    });
    if ((p.cur != null) && P[p.cur] && (st.mode === "hnsw" || st.mode === "kd")) top.appendChild(S("text", { x: X(P[p.cur][0]) + 8, y: Y(P[p.cur][1]) + 16, "font-size": 12, "font-weight": 700, fill: "var(--c-active)" }, "#" + p.cur));
    // query
    const qx = X(q[0]), qy = Y(q[1]);
    top.appendChild(S("circle", { cx: qx, cy: qy, r: 9, fill: "none", stroke: "var(--ember)", "stroke-width": 3 }));
    top.appendChild(S("path", { d: `M${qx - 14} ${qy} H${qx - 5} M${qx + 5} ${qy} H${qx + 14} M${qx} ${qy - 14} V${qy - 5} M${qx} ${qy + 5} V${qy + 14}`, stroke: "var(--ember)", "stroke-width": 3, "stroke-linecap": "round" }));
    top.appendChild(S("text", { x: qx + 12, y: qy - 12, "font-size": 14, "font-weight": 800, fill: "var(--ember)" }, "q"));

    // side panels
    code.highlight(p.line);
    say.say(p.text);
    const c = f.c, recTxt = p.final ? `${Math.round(p.recall * Math.min(k(), P.length))}/${Math.min(k(), P.length)}` : "–";
    if (st.mode === "brute") ctr.set({ distances: c.dist, "recall@k": recTxt });
    else if (st.mode === "kd") ctr.set({ distances: c.dist, "pruned regions": c.pruned || 0, "recall@k": recTxt });
    else if (st.mode === "lsh") ctr.set({ "hash bits": c.hash || 0, candidates: p.cand ? p.cand.length : 0, distances: c.dist, "recall@k": recTxt });
    else ctr.set({ distances: c.dist, "nodes expanded": c.hops || 0, "build distances": p.buildDist != null ? p.buildDist.toLocaleString("en-US") : (st.struct ? st.struct.buildDist.toLocaleString("en-US") : 0), "recall@k": recTxt });
    predict.update(p, i);
  }

  function setupPanels() {
    code = codeSw.show(st.mode, LINES[st.mode]);
    $("ctr").innerHTML = "";
    const init = { brute: { distances: 0, "recall@k": "–" }, kd: { distances: 0, "pruned regions": 0, "recall@k": "–" }, lsh: { "hash bits": 0, candidates: 0, distances: 0, "recall@k": "–" }, hnsw: { distances: 0, "nodes expanded": 0, "build distances": 0, "recall@k": "–" } }[st.mode];
    ctr = Forge.counters($("ctr"), init);
    $("optKd").hidden = st.mode !== "kd"; $("optLsh").hidden = st.mode !== "lsh"; $("optHnsw").hidden = st.mode !== "hnsw"; $("layerPanel").hidden = st.mode !== "hnsw";
    const lg = $("legend");
    lg.innerHTML = "";
    const items = [["var(--ember)", "query q"], ["var(--c-bar)", "point"], ["var(--c-compare)", "distance computed"], ["var(--c-done)", "current k best / result"]];
    if (st.mode === "kd") items.push(["var(--c-active)", "node being visited"], ["var(--c-dim)", "pruned region (skipped)"], ["var(--steel)", "x-split / search ball"], ["var(--c-pivot)", "y-split"]);
    if (st.mode === "lsh") items.push(["transparent;border:2.5px solid var(--c-compare)", "candidate (no distance yet)"], ["var(--c-pivot)", "same bucket as q / table lines"], ["color-mix(in srgb, var(--steel) 30%, transparent)", "q's cell"]);
    if (st.mode === "hnsw") items.push(["var(--c-active)", "node being expanded"], ["var(--c-pivot)", "candidate (ring)"], ["var(--c-swap)", "newly inserted node"]);
    items.push(["transparent;border:2.5px solid var(--c-swap)", "missed true neighbor"]);
    items.forEach(([c, t]) => lg.appendChild(E("span", null, E("i", { style: "background:" + c }), t)));
  }

  player = Forge.player($("player"), { frames: [], render });
  function reload() { setupPanels(); predict.reset(); player.load(record()); }

  /* ---------------- interaction ---------------- */
  function svgPoint(evt) {
    const pt = stage.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
    const m = stage.getScreenCTM(); if (!m) return null;
    const r = pt.matrixTransform(m.inverse());
    return [(r.x - MG) / SPAN, 1 - (r.y - MG) / SPAN];
  }
  stage.addEventListener("click", (e) => {
    const v = svgPoint(e);
    if (!v || v[0] < 0 || v[0] > 1 || v[1] < 0 || v[1] > 1) return;
    if (st.clickAdds) { if (st.P.length < 600) st.P.push(v); $("nOut").textContent = st.P.length; }
    else st.q = v;
    reload();
  });
  $("clickQ").onclick = () => { st.clickAdds = false; $("clickQ").classList.add("on"); $("clickP").classList.remove("on"); };
  $("clickP").onclick = () => { st.clickAdds = true; $("clickP").classList.add("on"); $("clickQ").classList.remove("on"); };
  document.querySelectorAll(".modes .btn").forEach((b) => (b.onclick = () => {
    st.mode = b.dataset.mode;
    document.querySelectorAll(".modes .btn").forEach((o) => { o.classList.toggle("on", o === b); o.setAttribute("aria-selected", String(o === b)); });
    reload();
  }));
  $("n").oninput = () => ($("nOut").textContent = $("n").value);
  $("n").onchange = () => { regen(); reload(); };
  $("regen").onclick = () => { $("seed").value = (+$("seed").value || 0) + 1; regen(); $("nOut").textContent = st.P.length; reload(); };
  $("seed").onchange = () => { regen(); reload(); };
  $("clear").onclick = () => { st.P = []; $("nOut").textContent = 0; $("clickP").click(); reload(); };
  [["K", "KOut"], ["L", "LOut"], ["M", "MOut"], ["efC", "efCOut"], ["ef", "efOut"]].forEach(([id, out]) => {
    $(id).oninput = () => ($(out).textContent = $(id).value);
    $(id).onchange = reload;
  });
  ["k", "kdBuild", "hnswAnim"].forEach((id) => ($(id).onchange = reload));
  $("layerView").onchange = () => player.go(player.index);

  /* ---------------- benchmark ---------------- */
  function runBench() {
    const which = $("benchData").value, seed = +$("seed").value || 1;
    $("benchNote").textContent = "Running…";
    $("benchGo").disabled = true;
    setTimeout(() => {
      const t0 = performance.now();
      const P = which === "here" ? st.P : V.clusters(1000, +which, seed + +which);
      if (P.length < 2) { $("benchNote").textContent = "Add some points first."; $("benchGo").disabled = false; return; }
      const Q = V.queriesNear(P, 200, seed + 999);
      const kk = Math.min(k(), P.length);
      const rows = V.benchmark(P, Q, kk, { K: +$("K").value, L: +$("L").value, M: +$("M").value, efC: +$("efC").value, ef: +$("ef").value, seed });
      const tb = $("bench");
      tb.innerHTML = "";
      tb.appendChild(E("tr", null, ["Method", `Recall@${kk}`, "Distances / query", "vs brute force", "Build work"].map((h) => E("th", null, h))));
      rows.forEach((r) => {
        const pct = (r.dist / P.length) * 100;
        tb.appendChild(E("tr", null,
          E("td", null, r.name),
          E("td", { class: r.recall >= 0.99 ? "good" : r.recall < 0.9 ? "meh" : "" }, (r.recall * 100).toFixed(1) + "%"),
          E("td", null, r.dist.toFixed(1), E("span", { class: "dbar", style: { width: Math.max(2, pct * 0.8) + "px" } })),
          E("td", null, pct.toFixed(1) + "%"),
          E("td", { class: "muted" }, r.build)));
      });
      $("benchNote").textContent = `${P.length.toLocaleString("en-US")} points, ${P[0].length} dimensions, 200 queries, k = ${kk} · ${Math.round(performance.now() - t0)} ms`;
      $("benchGo").disabled = false;
    }, 30);
  }
  $("benchGo").onclick = runBench;

  /* ---------------- boot ---------------- */
  regen();
  reload();
  runBench();
})();
