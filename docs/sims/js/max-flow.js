/* Algorithm Forge — Maximum flow: shortest-augmenting-path (Edmonds–Karp) labeling, Levitin §10.2.
   Engine is pure (exported for Node tests); UI runs only in the browser. */
(function () {
  "use strict";

  /* ---------------- engine ----------------
     net = {nodes:[{id,x,y}], edges:[{u,v,cap}], s, t}   (ids are strings) */
  function order(net) { const o = {}; net.nodes.forEach((n, k) => (o[n.id] = k)); return o; }

  /** Shortest-augmenting-path algorithm with Levitin's two labels, recorded as frames. */
  function runBFS(net, opts) {
    opts = opts || {};
    const E = net.edges, ord = order(net), s = net.s, t = net.t;
    const x = E.map(() => 0);
    const frames = [];
    const ctr = { value: 0, augmentations: 0, dequeues: 0, "edge checks": 0 };
    let labels = {}, queue = [], head = 0;
    const out = {}, inn = {};
    net.nodes.forEach((n) => { out[n.id] = []; inn[n.id] = []; });
    E.forEach((e, k) => { out[e.u].push(k); inn[e.v].push(k); });
    const byOrd = (key) => (a, b) => ord[E[a][key]] - ord[E[b][key]];
    net.nodes.forEach((n) => { out[n.id].sort(byOrd("v")); inn[n.id].sort(byOrd("u")); });
    const lab = (l) => (l === Infinity ? "∞" : String(l));
    function push(line, text, extra) {
      frames.push(Object.assign({ x: x.slice(), labels: JSON.parse(JSON.stringify(labels, (k, v) => (v === Infinity ? "∞" : v))), queue: queue.slice(), head, line, text, ctr: Object.assign({}, ctr) }, extra || {}));
    }
    push(1, `Start with the zero flow: x = 0 on every edge. Source = ${s}, sink = ${t}. Flow value = 0.`);
    let iter = 0;
    while (iter < 500) {
      iter++;
      labels = {}; labels[s] = { l: Infinity, from: null, sign: "−" };
      queue = [s]; head = 0;
      push(2, `Iteration ${iter}: label the source ${s} with (∞, −) — unlimited supply, reached from nowhere — and put it in the queue.`, { cur: null });
      let found = false;
      while (head < queue.length) {
        const i = queue[head++];
        ctr.dequeues++;
        push(4, `Dequeue ${i} (its first label says ${lab(labels[i].l)} more unit${labels[i].l === 1 ? "" : "s"} can reach it). Now scan its edges for unlabeled neighbors.`, { cur: i });
        for (const k of out[i]) {
          const j = E[k].v;
          if (labels[j]) continue;
          ctr["edge checks"]++;
          const r = E[k].cap - x[k];
          if (r > 0) {
            const lj = Math.min(labels[i].l, r);
            labels[j] = { l: lj, from: i, sign: "+" };
            queue.push(j);
            push([8, 9], `Forward edge ${i}→${j} has unused capacity r = ${E[k].cap} − ${x[k]} = ${r} > 0. Label ${j} with (${lj}, ${i}+): min(${lab(labels[i].l)}, ${r}) = ${lj}. Enqueue ${j}.`, { cur: i, edge: k, edgeKind: "fwd" });
          } else {
            push(7, `Forward edge ${i}→${j} is full (${x[k]}/${E[k].cap}): no room to push more, so ${j} is not labeled from here.`, { cur: i, edge: k, edgeKind: "full" });
          }
        }
        for (const k of inn[i]) {
          const j = E[k].u;
          if (labels[j]) continue;
          ctr["edge checks"]++;
          if (x[k] > 0) {
            const lj = Math.min(labels[i].l, x[k]);
            labels[j] = { l: lj, from: i, sign: "−" };
            queue.push(j);
            push([12, 13], `Backward edge: ${j}→${i} carries flow ${x[k]} > 0. We can "undo" up to ${x[k]} of it, which frees ${j} to send that flow elsewhere. Label ${j} with (${lj}, ${i}−). Enqueue ${j}.`, { cur: i, edge: k, edgeKind: "bwd" });
          } else {
            push(11, `Edge ${j}→${i} points into ${i} but carries 0 flow, so it cannot be used backward.`, { cur: i, edge: k, edgeKind: "zero" });
          }
        }
        if (labels[t]) { found = true; break; }
      }
      if (!found) {
        const X = Object.keys(labels);
        const cut = E.map((e, k) => k).filter((k) => labels[E[k].u] && !labels[E[k].v]);
        const back = E.map((e, k) => k).filter((k) => !labels[E[k].u] && labels[E[k].v]);
        const cap = cut.reduce((a, k) => a + E[k].cap, 0);
        const askCut = opts.ask !== false ? { q: "The sink can't be labeled. What is the capacity of the minimum cut?", options: uniq([ctr.value, cap + (cap === ctr.value ? 1 : 0), ctr.value + 2, Math.max(0, ctr.value - 1), E.filter((e) => e.u === s).reduce((a, e) => a + e.cap, 0)]).sort((a, b) => a - b).map(String), answer: String(ctr.value), explain: `Max-Flow Min-Cut: the minimum cut capacity equals the maximum flow value, ${ctr.value}. The cut is formed by the edges from labeled to unlabeled vertices.` } : null;
        push(3, `The queue is empty and the sink ${t} is still unlabeled: no augmenting path exists, so the current flow (value ${ctr.value}) is maximum.`, { cur: null, ask: askCut });
        push(18, `<b>Minimum cut</b>: labeled X = {${X.join(", ")}}, unlabeled = {${net.nodes.map((n) => n.id).filter((v) => !labels[v]).join(", ")}}. Edges from X to the rest: ${cut.map((k) => `(${E[k].u},${E[k].v})`).join(", ") || "none"} — all full — with capacity ${cut.map((k) => E[k].cap).join(" + ") || "0"} = ${cap}.${back.length ? ` Edges back into X (${back.map((k) => `(${E[k].u},${E[k].v})`).join(", ")}) carry 0 flow.` : ""} Max flow = ${ctr.value} = min cut capacity.`, { cur: null, final: true, cut, cutCap: cap, X });
        return { frames, value: ctr.value, augmentations: ctr.augmentations, cut, cutCap: cap, X, x };
      }
      // augment along the path given by the second labels
      const path = [];
      let j = t;
      while (j !== s) {
        const L = labels[j];
        const k = L.sign === "+" ? E.findIndex((e) => e.u === L.from && e.v === j) : E.findIndex((e) => e.u === j && e.v === L.from);
        path.unshift({ k, sign: L.sign, a: L.from, b: j });
        j = L.from;
      }
      const amt = labels[t].l;
      const pathStr = s + path.map((p) => (p.sign === "+" ? "→" : "←") + p.b).join("");
      const cands = uniq([amt, ...path.map((p) => (p.sign === "+" ? E[p.k].cap - x[p.k] : x[p.k])), amt + 1, E[path[0].k].cap]).filter((v) => v > 0).sort((a, b) => a - b).slice(0, 5);
      if (!cands.includes(amt)) cands.push(amt);
      push([14, 15], `The sink ${t} got labeled (${amt}, ${labels[t].from}${labels[t].sign}). Follow the second labels back to the source: ${pathStr}. ${path.some((p) => p.sign === "−") ? "It uses a backward edge — flow on it will be reduced. " : ""}`,
        { cur: null, path, ask: opts.ask !== false ? { q: "By how much will the flow increase along this path?", options: cands.map(String), answer: String(amt), explain: `The sink's first label, ${amt}: the smallest unused capacity on a forward edge or flow on a backward edge along the path.` } : null });
      path.forEach((p) => { x[p.k] += p.sign === "+" ? amt : -amt; });
      ctr.value += amt; ctr.augmentations++;
      push([16, 17], `Augment by ${amt} (the sink's first label): +${amt} on forward edges${path.some((p) => p.sign === "−") ? `, −${amt} on the backward edge${path.filter((p) => p.sign === "−").length > 1 ? "s" : ""}` : ""}. Flow value is now ${ctr.value}. Erase all labels except the source's and search again.`, { cur: null, path, augmented: true });
    }
    return { frames, value: ctr.value, augmentations: ctr.augmentations };
  }
  function uniq(a) { return [...new Set(a)]; }

  /** Generic augmenting-path method with a deliberately unlucky choice: the path with the SMALLEST bottleneck. */
  function runUnlucky(net, maxAug) {
    maxAug = maxAug || 400;
    const E = net.edges, s = net.s, t = net.t, ord = order(net);
    const x = E.map(() => 0);
    const frames = [];
    const ctr = { value: 0, augmentations: 0, "paths compared": 0 };
    const push = (line, text, extra) => frames.push(Object.assign({ x: x.slice(), labels: {}, queue: [], head: 0, line, text, ctr: Object.assign({}, ctr) }, extra || {}));
    push(1, `Start with the zero flow. This run uses the plain augmenting-path method but picks the WORST path each time: the one with the smallest bottleneck (ties: more edges).`);
    for (let it = 0; it < maxAug; it++) {
      // enumerate simple augmenting paths
      const paths = [];
      const vis = new Set([s]);
      const stack = [];
      (function dfs(u) {
        if (paths.length > 5000) return;
        if (u === t) { paths.push(stack.slice()); return; }
        const steps = [];
        E.forEach((e, k) => {
          if (e.u === u && !vis.has(e.v) && e.cap - x[k] > 0) steps.push({ k, sign: "+", a: u, b: e.v, r: e.cap - x[k] });
          if (e.v === u && !vis.has(e.u) && x[k] > 0) steps.push({ k, sign: "−", a: u, b: e.u, r: x[k] });
        });
        steps.sort((p, q) => ord[p.b] - ord[q.b]);
        for (const st of steps) { vis.add(st.b); stack.push(st); dfs(st.b); stack.pop(); vis.delete(st.b); }
      })(s);
      ctr["paths compared"] += paths.length;
      if (!paths.length) {
        const X = [s], seen = new Set([s]);
        for (let h = 0; h < X.length; h++) E.forEach((e, k) => {
          if (e.u === X[h] && !seen.has(e.v) && e.cap - x[k] > 0) { seen.add(e.v); X.push(e.v); }
          if (e.v === X[h] && !seen.has(e.u) && x[k] > 0) { seen.add(e.u); X.push(e.u); }
        });
        const cut = E.map((e, k) => k).filter((k) => seen.has(E[k].u) && !seen.has(E[k].v));
        push(2, `No augmenting path is left: the flow is maximum, value ${ctr.value}, after <b>${ctr.augmentations}</b> augmentations. The vertices still reachable from the source, X = {${X.join(", ")}}, give a minimum cut of capacity ${cut.reduce((a, k) => a + E[k].cap, 0)}.`, { final: true, X, cut, unluckyDone: true });
        break;
      }
      let best = null, bestR = Infinity;
      for (const p of paths) {
        const r = Math.min(...p.map((q) => q.r));
        if (r < bestR || (r === bestR && p.length > best.length)) { best = p; bestR = r; }
      }
      const pathStr = s + best.map((p) => (p.sign === "+" ? "→" : "←") + p.b).join("");
      push(3, `Augmenting path ${pathStr} (${paths.length} candidate path${paths.length > 1 ? "s" : ""}; we take the one with the smallest bottleneck, r = ${bestR}).`, { path: best });
      best.forEach((p) => { x[p.k] += p.sign === "+" ? bestR : -bestR; });
      ctr.value += bestR; ctr.augmentations++;
      push(4, `Add ${bestR} on forward edges${best.some((p) => p.sign === "−") ? ", subtract on the backward edge" : ""}. Flow value ${ctr.value} after ${ctr.augmentations} augmentation${ctr.augmentations > 1 ? "s" : ""}.`, { path: best, augmented: true });
    }
    return { frames, value: ctr.value, augmentations: ctr.augmentations };
  }

  const Engine = { runBFS, runUnlucky };
  if (typeof module !== "undefined" && module.exports) module.exports = Engine;
  if (typeof window === "undefined") return;

  /* =====================================================================
     UI
     ===================================================================== */
  const F = window.Forge;
  const $ = (id) => document.getElementById(id);
  F.page({ title: "Maximum Flow", chapter: "Ch 10 · Iterative Improvement" });

  const PRESETS = {
    textbook: () => ({
      nodes: [{ id: "1", x: 60, y: 200 }, { id: "2", x: 220, y: 80 }, { id: "4", x: 220, y: 330 }, { id: "3", x: 400, y: 250 }, { id: "5", x: 400, y: 80 }, { id: "6", x: 580, y: 200 }],
      edges: [["1", "2", 2], ["1", "4", 3], ["2", "3", 5], ["2", "5", 3], ["4", "3", 1], ["3", "6", 2], ["5", "6", 4]].map(([u, v, cap]) => ({ u, v, cap })),
      s: "1", t: "6",
    }),
    bad: (U) => ({
      nodes: [{ id: "1", x: 70, y: 205 }, { id: "2", x: 320, y: 70 }, { id: "3", x: 320, y: 340 }, { id: "4", x: 570, y: 205 }],
      edges: [["1", "2", U], ["1", "3", U], ["2", "3", 1], ["2", "4", U], ["3", "4", U]].map(([u, v, cap]) => ({ u, v, cap })),
      s: "1", t: "4",
    }),
    lesson: () => ({
      nodes: [{ id: "s", x: 60, y: 200 }, { id: "a", x: 230, y: 80 }, { id: "b", x: 430, y: 320 }, { id: "c", x: 230, y: 320 }, { id: "d", x: 430, y: 80 }, { id: "t", x: 590, y: 200 }],
      edges: [["s", "a", 5], ["s", "c", 7], ["a", "b", 4], ["a", "d", 6], ["c", "b", 8], ["b", "t", 3], ["d", "t", 9]].map(([u, v, cap]) => ({ u, v, cap })),
      s: "s", t: "t",
    }),
  };
  function randomNet() {
    const r = Math.random, cap = () => 1 + Math.floor(r() * 9);
    const nodes = [{ id: "1", x: 60, y: 200 }, { id: "2", x: 220, y: 80 }, { id: "3", x: 220, y: 330 }, { id: "4", x: 420, y: 80 }, { id: "5", x: 420, y: 330 }, { id: "6", x: 580, y: 200 }];
    const E = [["1", "2"], ["1", "3"], ["4", "6"], ["5", "6"]];
    const mids = [["2", "4"], ["2", "5"], ["3", "4"], ["3", "5"]];
    mids.forEach((m) => { if (r() < 0.7) E.push(m); });
    if (!E.some((e) => e[0] === "2" && e[1] > "3")) E.push(["2", "4"]);
    if (!E.some((e) => e[0] === "3" && e[1] > "3")) E.push(["3", "5"]);
    if (!E.some((e) => e[1] === "4" && e[0] !== "1")) E.push(["3", "4"]);
    if (!E.some((e) => e[1] === "5" && e[0] !== "1")) E.push(["2", "5"]);
    if (r() < 0.6) E.push(r() < 0.5 ? ["2", "3"] : ["3", "2"]);
    if (r() < 0.5) E.push(r() < 0.5 ? ["4", "5"] : ["5", "4"]);
    const seen = new Set();
    return { nodes, edges: E.filter((e) => { const k = e.join(); if (seen.has(k)) return false; seen.add(k); return true; }).map(([u, v]) => ({ u, v, cap: cap() })), s: "1", t: "6" };
  }

  const LINES_BFS = [
    "ALGORITHM ShortestAugmentingPath(G)",
    "    x ← 0 on every edge",
    "    label source with ∞, −;  Q ← [source]",
    "    while not isEmpty(Q) do",
    "        i ← dequeue(Q)",
    "        for each edge i→j, j unlabeled do",
    "            r ← u[i,j] − x[i,j]",
    "            if r > 0 then",
    "                label j: min(l[i], r), i+",
    "                enqueue(Q, j)",
    "        for each edge j→i, j unlabeled do",
    "            if x[j,i] > 0 then",
    "                label j: min(l[i], x[j,i]), i−",
    "                enqueue(Q, j)",
    "        if the sink is labeled then",
    "            trace the path back by 2nd labels",
    "            +l on i+ edges, −l on i− edges",
    "            erase labels; Q ← [source]",
    "    return x   // labeled→unlabeled = cut",
  ];
  const LINES_FF = [
    "ALGORITHM AugmentingPathMethod(G)   // Ford–Fulkerson",
    "    x ← the zero flow",
    "    while some augmenting path P exists do",
    "        r ← min(unused cap on forward edges of P,",
    "                flow on backward edges of P)",
    "        x ← x + r on forward edges, − r on backward",
    "    return x",
  ];

  let net = PRESETS.textbook();
  let code, run = null, bfsCount = null;
  const ctrHost = $("ctr");
  let ctr = null;
  const say = F.narrate($("say"));
  const stage = $("stage");

  /* ---- predict widget ---- */
  const predictBox = $("predict");
  let askKey = null;
  function showAsk(ask, key) {
    if (!ask) { if (askKey !== null) { predictBox.innerHTML = '<span class="muted small">Prediction prompts appear before each augmentation and at the end. With “pause to predict” on, autoplay stops there.</span>'; askKey = null; } return; }
    if (askKey === key) return;
    askKey = key;
    predictBox.innerHTML = "";
    const res = F.el("div", { class: "res" });
    const opts = F.el("div", { class: "opts" });
    ask.options.forEach((o) => opts.appendChild(F.el("button", { class: "btn sm", onclick: (e) => {
      const ok = o === ask.answer;
      opts.querySelectorAll("button").forEach((b) => (b.disabled = true));
      e.target.classList.add(ok ? "steel" : "primary");
      res.innerHTML = `${ok ? "✅ Yes!" : `❌ Not quite — it's <b>${ask.answer}</b>.`} ${ask.explain}`;
    } }, o)));
    predictBox.append(F.el("div", { class: "q" }, "🤔 Predict: " + ask.q), opts, res);
    if ($("pausePredict").checked) player.pause();
  }

  /* ---- drawing ---- */
  function draw(f) {
    const W = 640, H = 410, R = 21;
    stage.setAttribute("viewBox", `0 0 ${W} ${H}`);
    stage.innerHTML = "";
    const S = F.svg;
    const defs = S("defs", null);
    [["m", "var(--line-2)"], ["st", "var(--steel)"], ["em", "var(--ember)"], ["pv", "var(--c-pivot)"], ["cp", "var(--c-compare)"], ["sw", "var(--c-swap)"], ["dm", "var(--c-dim)"]].forEach(([id, col]) =>
      defs.appendChild(S("marker", { id: "mf-" + id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto" }, S("path", { d: "M0 0 L10 5 L0 10 z", fill: col }))));
    stage.appendChild(defs);
    const pos = {}; net.nodes.forEach((n) => (pos[n.id] = n));
    const pathKind = {};
    (f.path || []).forEach((p) => (pathKind[p.k] = p.sign));
    const cutSet = new Set(f.final && f.cut ? f.cut : []);
    const has = (u, v) => net.edges.some((e) => e.u === u && e.v === v);
    net.edges.forEach((e, k) => {
      const a = pos[e.u], b = pos[e.v];
      const flow = f.x[k];
      let col = "var(--line-2)", mk = "m", w = 2, dash = "";
      if (flow > 0) { col = "var(--steel)"; mk = "st"; w = flow === e.cap ? 4 : 3; }
      if (f.edge === k) { col = f.edgeKind === "bwd" ? "var(--c-pivot)" : f.edgeKind === "fwd" ? "var(--c-compare)" : "var(--c-dim)"; mk = f.edgeKind === "bwd" ? "pv" : f.edgeKind === "fwd" ? "cp" : "dm"; w = 4; }
      if (pathKind[k] === "+") { col = "var(--ember)"; mk = "em"; w = 5; }
      if (pathKind[k] === "−") { col = "var(--c-pivot)"; mk = "pv"; w = 5; dash = "8 5"; }
      if (cutSet.has(k)) { col = "var(--c-swap)"; mk = "sw"; w = 5; dash = "10 5"; }
      const curve = has(e.v, e.u) ? 26 : 0;
      const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
      const nx = -dy / L, ny = dx / L;
      const mx = (a.x + b.x) / 2 + nx * curve, my = (a.y + b.y) / 2 + ny * curve;
      // endpoints on the circles, aimed at the control point
      const d1x = mx - a.x, d1y = my - a.y, l1 = Math.hypot(d1x, d1y), d2x = b.x - mx, d2y = b.y - my, l2 = Math.hypot(d2x, d2y);
      const x1 = a.x + (d1x / l1) * R, y1 = a.y + (d1y / l1) * R, x2 = b.x - (d2x / l2) * (R + 4), y2 = b.y - (d2y / l2) * (R + 4);
      const d = curve ? `M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}` : `M${x1} ${y1} L${x2} ${y2}`;
      stage.appendChild(S("path", { d, stroke: col, "stroke-width": w, "stroke-dasharray": dash, fill: "none", "marker-end": `url(#mf-${mk})` }));
      const hit = S("path", { d, stroke: "transparent", "stroke-width": 16, fill: "none", style: "cursor:pointer" });
      hit.addEventListener("click", () => focusEdge(k));
      stage.appendChild(hit);
      const lx = curve ? (a.x + b.x) / 2 + nx * curve * 0.5 : mx, ly = curve ? (a.y + b.y) / 2 + ny * curve * 0.5 : my;
      const txt = `${flow}/${e.cap}`;
      const tw = 9 + 7.4 * txt.length;
      const g = S("g", { style: "cursor:pointer" });
      g.appendChild(S("rect", { x: lx - tw / 2, y: ly - 11, width: tw, height: 20, rx: 6, fill: "var(--panel)", stroke: flow === e.cap && flow > 0 ? "var(--steel)" : "var(--line)" }));
      g.appendChild(S("text", { x: lx, y: ly + 4, "text-anchor": "middle", "font-size": 12.5, "font-weight": flow > 0 ? 700 : 400, fill: "var(--ink)" }, txt));
      g.addEventListener("click", () => focusEdge(k));
      stage.appendChild(g);
    });
    const onPath = new Set(); (f.path || []).forEach((p) => { onPath.add(p.a); onPath.add(p.b); });
    net.nodes.forEach((n) => {
      let fill = "var(--panel-2)", ink = "var(--ink)", stroke = "var(--line-2)";
      const L = f.labels[n.id];
      if (L) { fill = "var(--c-active)"; ink = "#0d1117"; stroke = fill; }
      if (f.cur === n.id) { fill = "var(--c-compare)"; stroke = fill; ink = "#0d1117"; }
      if (onPath.has(n.id)) { fill = "var(--ember)"; stroke = fill; ink = "#1b0f05"; }
      if (f.final && f.X) { if (f.X.includes(n.id)) { fill = "var(--c-done)"; stroke = fill; ink = "#0d1117"; } else { fill = "var(--c-dim)"; stroke = "var(--line-2)"; ink = "var(--ink)"; } }
      stage.appendChild(S("circle", { cx: n.x, cy: n.y, r: R, fill, stroke, "stroke-width": 2 }));
      stage.appendChild(S("text", { x: n.x, y: n.y + 5, "text-anchor": "middle", "font-size": 15, "font-weight": 800, fill: ink }, n.id));
      if (L) {
        const t = `${L.l}, ${L.from == null ? "−" : L.from + L.sign}`;
        const tw = 10 + 7.4 * t.length;
        const ly = n.y < 120 ? n.y - R - 12 : n.y + R + 18;
        stage.appendChild(S("rect", { x: n.x - tw / 2, y: ly - 13, width: tw, height: 19, rx: 9, fill: "var(--ember-soft)", stroke: "var(--ember)" }));
        stage.appendChild(S("text", { x: n.x, y: ly + 1, "text-anchor": "middle", "font-size": 12.5, "font-weight": 700, fill: "var(--ember-2)" }, t));
      }
      if (n.id === net.s || n.id === net.t) {
        stage.appendChild(S("text", { x: n.x, y: n.y < 120 ? n.y + R + 16 : n.y - R - 8, "text-anchor": "middle", "font-size": 11, fill: "var(--muted)" }, n.id === net.s ? "source" : "sink"));
      }
    });
    // queue strip
    const qh = $("queue");
    qh.innerHTML = "";
    if (f.queue && f.queue.length) {
      qh.appendChild(F.el("span", { class: "small muted" }, "Queue: "));
      f.queue.forEach((v, k) => qh.appendChild(F.el("span", { class: "chip" + (k < f.head ? "" : " steel"), style: k < f.head ? { opacity: 0.55 } : null, title: k < f.head ? "already dequeued" : "waiting" }, v + (k < f.head ? " ↑" : ""))));
    } else qh.appendChild(F.el("span", { class: "small muted" }, run && run.mode === "unlucky" ? "(no queue: this variant picks any path)" : "Queue: —"));
  }

  function focusEdge(k) {
    const inp = document.querySelector(`[data-edge="${k}"]`);
    if (inp) { inp.scrollIntoView({ block: "nearest", behavior: "smooth" }); inp.focus(); inp.select && inp.select(); }
  }

  function render(f, i) {
    draw(f);
    code.highlight(f.line);
    ctr.set(f.ctr);
    say.say(f.text);
    showAsk(f.ask, i);
    const thm = $("thm");
    if (f.final && f.cut && f.cutCap == null) f.cutCap = f.cut.reduce((a, k) => a + net.edges[k].cap, 0);
    if (f.final && f.cutCap != null && !f.unluckyDone) thm.innerHTML = `<b>Max-Flow Min-Cut Theorem.</b> The value of a maximum flow equals the capacity of a minimum cut. Here: max flow = <b>${f.ctr.value}</b> = capacity of the cut {${f.cut.map((k) => `(${net.edges[k].u},${net.edges[k].v})`).join(", ")}} = <b>${f.cutCap}</b>. Every cut edge is full; edges from unlabeled to labeled vertices are empty.`;
    else if (f.final) thm.innerHTML = `<b>Done after ${f.ctr.augmentations} augmentations.</b> Max flow ${f.ctr.value} = min cut capacity ${f.cutCap}. ${bfsCount != null ? `The shortest-augmenting-path algorithm needs only <b>${bfsCount}</b> on this network — the choice of paths is everything.` : ""}`;
    else thm.innerHTML = `<b>Max-Flow Min-Cut Theorem.</b> The value of a maximum flow equals the capacity of a minimum cut (a set of edges from a source side X to a sink side whose removal cuts every source→sink path). Play to the end to see both appear together.`;
  }
  const player = F.player($("player"), { frames: [], render, fps: 2 });

  function buildEditor() {
    const host = $("edges");
    host.innerHTML = "";
    net.edges.forEach((e, k) => {
      const inp = F.el("input", { type: "number", min: 1, max: 999, value: e.cap, "data-edge": k, "aria-label": `capacity of ${e.u} to ${e.v}`, style: { width: "64px" } });
      inp.addEventListener("change", () => { const v = Math.max(1, Math.min(999, Math.round(+inp.value) || 1)); inp.value = v; net.edges[k].cap = v; rebuild(); });
      host.appendChild(F.el("div", { class: "edge-row" }, F.el("span", { class: "mono" }, `${e.u} → ${e.v}`), inp,
        F.el("button", { class: "btn sm ghost", title: "remove edge", "aria-label": `remove edge ${e.u} to ${e.v}`, onclick: () => { net.edges.splice(k, 1); buildEditor(); rebuild(); } }, "✕")));
    });
    const ids = net.nodes.map((n) => n.id);
    const fromSel = F.el("select", { "aria-label": "new edge from" }, ids.filter((v) => v !== net.t).map((v) => F.el("option", { value: v }, v)));
    const toSel = F.el("select", { "aria-label": "new edge to" }, ids.filter((v) => v !== net.s).map((v) => F.el("option", { value: v }, v)));
    const capIn = F.el("input", { type: "number", min: 1, value: 3, style: { width: "64px" }, "aria-label": "new edge capacity" });
    host.appendChild(F.el("div", { class: "edge-row add" }, fromSel, "→", toSel, capIn, F.el("button", { class: "btn sm", onclick: () => {
      const u = fromSel.value, v = toSel.value;
      if (u === v) return msg("An edge needs two different vertices.");
      if (net.edges.some((e) => e.u === u && e.v === v)) return msg(`Edge ${u}→${v} already exists — edit its capacity instead.`);
      net.edges.push({ u, v, cap: Math.max(1, Math.round(+capIn.value) || 1) });
      buildEditor(); rebuild();
    } }, "Add edge")));
  }
  function msg(t) { $("err").textContent = t ? "⚠ " + t : ""; }

  function rebuild() {
    msg("");
    const mode = $("variant").value;
    const lines = mode === "bfs" ? LINES_BFS : LINES_FF;
    $("code").innerHTML = "";
    code = F.code($("code"), lines);
    ctrHost.innerHTML = "";
    ctr = F.counters(ctrHost, mode === "bfs" ? { value: 0, augmentations: 0, dequeues: 0, "edge checks": 0 } : { value: 0, augmentations: 0, "paths compared": 0 });
    if (mode === "bfs") { run = runBFS(net); bfsCount = null; }
    else { run = runUnlucky(net); bfsCount = runBFS(net, { ask: false }).augmentations; }
    run.mode = mode;
    $("ubox").style.display = $("preset").value === "bad" ? "" : "none";
    askKey = "x";
    player.load(run.frames);
  }
  function setPreset(k) {
    if (k === "random") net = randomNet();
    else if (k === "bad") net = PRESETS.bad(+$("U").value);
    else net = PRESETS[k]();
    if ($("variant").dataset.touched !== "1") $("variant").value = k === "bad" ? "unlucky" : "bfs";
    buildEditor(); rebuild();
  }
  $("preset").onchange = () => setPreset($("preset").value);
  $("variant").onchange = () => { $("variant").dataset.touched = "1"; rebuild(); };
  $("U").oninput = () => { $("Uv").textContent = $("U").value; };
  $("U").onchange = () => { if ($("preset").value === "bad") setPreset("bad"); };
  $("rand").onclick = () => { $("preset").value = "random"; setPreset("random"); };
  setPreset("textbook");
})();
