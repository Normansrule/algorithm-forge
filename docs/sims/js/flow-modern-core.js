/* Algorithm Forge — Maximum flow beyond augmenting paths: pure engines.
   net = {nodes:[{id, x, y}], edges:[{u, v, cap}], s, t} with string ids.
   Residual arcs: arc 2k = edge k forward (cap), arc 2k+1 = its reverse (cap 0); f[2k+1] = −f[2k].
   Every engine returns {value, flow (per edge), ctr, frames, cut:{X, edges, cap}}. */
(function (root) {
  "use strict";

  function prep(net) {
    const ids = net.nodes.map((n) => n.id), ix = {};
    ids.forEach((id, i) => (ix[id] = i));
    const n = ids.length, E = net.edges, A = 2 * E.length;
    const head = new Array(A), tail = new Array(A), cap = new Array(A);
    E.forEach((e, k) => {
      tail[2 * k] = ix[e.u]; head[2 * k] = ix[e.v]; cap[2 * k] = e.cap;
      tail[2 * k + 1] = ix[e.v]; head[2 * k + 1] = ix[e.u]; cap[2 * k + 1] = 0;
    });
    const adj = Array.from({ length: n }, () => []);
    for (let a = 0; a < A; a++) adj[tail[a]].push(a);
    adj.forEach((l) => l.sort((a, b) => head[a] - head[b] || a - b));
    return { ids, ix, n, E, A, head, tail, cap, adj, s: ix[net.s], t: ix[net.t] };
  }
  function recorder(opt) {
    const R = { frames: [], on: !!(opt && opt.frames), cap: (opt && opt.cap) || 2500, over: false };
    R.push = (fr) => { if (!R.on) return; if (R.frames.length >= R.cap) { R.over = true; return; } R.frames.push(fr); };
    return R;
  }
  const edgeFlow = (G, f) => G.E.map((_, k) => f[2 * k]);
  /** Min cut from a maximum flow: X = vertices reachable from s in the residual graph. */
  function minCut(G, f) {
    const seen = new Array(G.n).fill(false), q = [G.s];
    seen[G.s] = true;
    for (let h = 0; h < q.length; h++) for (const a of G.adj[q[h]]) if (G.cap[a] - f[a] > 0 && !seen[G.head[a]]) { seen[G.head[a]] = true; q.push(G.head[a]); }
    const X = G.ids.filter((_, i) => seen[i]);
    const edges = G.E.map((_, k) => k).filter((k) => seen[G.tail[2 * k]] && !seen[G.head[2 * k]]);
    return { X, edges, cap: edges.reduce((s, k) => s + G.E[k].cap, 0) };
  }
  function bfsLevels(G, f, c) {
    const lv = new Array(G.n).fill(-1), par = new Array(G.n).fill(-1), q = [G.s];
    lv[G.s] = 0;
    for (let h = 0; h < q.length; h++) {
      const u = q[h];
      for (const a of G.adj[u]) {
        c["arc inspections"]++;
        const v = G.head[a];
        if (lv[v] < 0 && G.cap[a] - f[a] > 0) { lv[v] = lv[u] + 1; par[v] = a; q.push(v); }
      }
    }
    return { lv, par };
  }
  const pathStr = (G, arcs) => G.ids[G.tail[arcs[0]]] + arcs.map((a) => (a % 2 ? "⇠" : "→") + G.ids[G.head[a]]).join("");

  /* ------------------------------------------------------------------ Edmonds–Karp */
  function edmondsKarp(net, opt) {
    opt = opt || {};
    const G = prep(net), R = recorder(opt), f = new Array(G.A).fill(0);
    const c = { value: 0, augmentations: 0, "BFS runs": 0, "arc inspections": 0 };
    const snap = (line, text, extra) => R.push(Object.assign({ flow: edgeFlow(G, f), line, text, ctr: Object.assign({}, c) }, extra || {}));
    snap(1, `Start with zero flow. Edmonds–Karp is Ford–Fulkerson with one rule: always augment along a <b>shortest</b> path (fewest edges), found by Breadth-First Search (BFS) in the residual graph.`);
    let asked = 0;
    for (;;) {
      c["BFS runs"]++;
      const { lv, par } = bfsLevels(G, f, c);
      const lvObj = {}; lv.forEach((l, i) => { if (l >= 0) lvObj[G.ids[i]] = l; });
      if (lv[G.t] < 0) {
        snap(2, `BFS #${c["BFS runs"]} cannot reach the sink: no augmenting path is left, so the flow is maximum.`, { levels: lvObj });
        break;
      }
      const arcs = []; for (let v = G.t; v !== G.s; v = G.tail[par[v]]) arcs.unshift(par[v]);
      const delta = Math.min(...arcs.map((a) => G.cap[a] - f[a]));
      let ask = null;
      if (R.on && asked < 2) {
        const opts = [...new Set([delta, ...arcs.map((a) => G.cap[a] - f[a]), delta + 1])].filter((x) => x > 0).sort((a, b) => a - b).slice(0, 5);
        if (!opts.includes(delta)) opts.push(delta);
        ask = { q: `BFS found the path ${pathStr(G, arcs)} (${arcs.length} edges). By how much can the flow grow along it?`, opts: opts.map(String), ans: opts.indexOf(delta), why: `The bottleneck: the smallest residual capacity on the path, ${delta}. ${arcs.some((a) => a % 2) ? "A dashed ⇠ step cancels flow on an edge used backwards." : ""}` };
        asked++;
      }
      snap(2, `BFS #${c["BFS runs"]} reaches the sink in ${lv[G.t]} steps (numbers = BFS distance). Shortest augmenting path: ${pathStr(G, arcs)}${arcs.some((a) => a % 2) ? " — it uses an edge backwards (⇠), undoing earlier flow" : ""}.`, { levels: lvObj, path: arcs, ask });
      arcs.forEach((a) => { f[a] += delta; f[a ^ 1] -= delta; });
      c.value += delta; c.augmentations++;
      snap([3, 4, 5], `Augment by δ = ${delta} along the path. Flow value ${c.value}. Each augmentation needed its own BFS over the whole graph: ${c["arc inspections"]} arc inspections so far.`, { path: arcs });
    }
    const cut = minCut(G, f);
    snap(6, `<b>Done.</b> Maximum flow = ${c.value} after ${c.augmentations} augmentations and ${c["BFS runs"]} BFS runs. The vertices still reachable from the source in the residual graph (green) form the minimum cut; its red edges are all full and add up to ${cut.cap}.`, { final: true, cut });
    return { value: c.value, flow: edgeFlow(G, f), ctr: c, frames: R.frames, cut, over: R.over };
  }

  /* ------------------------------------------------------------------ Dinic */
  function dinic(net, opt) {
    opt = opt || {};
    const G = prep(net), R = recorder(opt), f = new Array(G.A).fill(0);
    const c = { value: 0, phases: 0, augmentations: 0, advances: 0, retreats: 0, "arc inspections": 0 };
    let lvObj = {}, P = [], curView = {};
    const snap = (line, text, extra) => R.push(Object.assign({ flow: edgeFlow(G, f), line, text, ctr: Object.assign({}, c), levels: lvObj, stack: P.map((v) => G.ids[v]), cur: Object.assign({}, curView) }, extra || {}));
    snap(1, `Start with zero flow. Dinic works in <b>phases</b>. Each phase builds the BFS <i>level graph</i> once and then pushes as many shortest paths as it can through it (a blocking flow) before building a new one.`);
    let lastLevelT = -1, askedLevel = false;
    for (;;) {
      const { lv } = bfsLevels(G, f, c);
      lvObj = {}; lv.forEach((l, i) => { if (l >= 0) lvObj[G.ids[i]] = l; });
      if (lv[G.t] < 0) { P = []; curView = {}; snap([3, 4], `BFS from the source cannot reach the sink: no augmenting path is left. ${c.phases} phase${c.phases === 1 ? "" : "s"} were enough.`, { layered: true }); break; }
      c.phases++;
      let ask = null;
      if (R.on && c.phases === 2 && !askedLevel) {
        const opts = [...new Set([lastLevelT, lv[G.t], lastLevelT + 2, Math.max(1, lastLevelT - 1)])].sort((a, b) => a - b);
        ask = { q: `Phase 1 used paths of ${lastLevelT} edges. How many edges do the shortest augmenting paths have in phase 2?`, opts: opts.map(String), ans: opts.indexOf(lv[G.t]), why: `${lv[G.t]}. After a blocking flow, every remaining source-to-sink path in the residual graph is strictly longer — so there are at most n − 1 phases.` };
        askedLevel = true;
      }
      snap([3, 4, 5], `Phase ${c.phases}: BFS gives every vertex a level (its distance from the source). The sink is at level ${lv[G.t]}. Only arcs that go exactly one level further (level → level + 1) and still have room are used in this phase; the others are faded.`, { layered: true, ask });
      lastLevelT = lv[G.t];
      const cur = new Array(G.n).fill(0);
      const curArc = () => { curView = {}; for (let v = 0; v < G.n; v++) if (cur[v] < G.adj[v].length) curView[G.ids[v]] = G.adj[v][cur[v]]; };
      P = [G.s];
      let pathArcs = [];
      curArc();
      snap([6, 7], `Reset every current-arc pointer to the first arc. Grow a path from the source by Depth-First Search (DFS).`, { layered: true });
      while (P.length) {
        const u = P[P.length - 1];
        if (u === G.t) {
          const delta = Math.min(...pathArcs.map((a) => G.cap[a] - f[a]));
          pathArcs.forEach((a) => { f[a] += delta; f[a ^ 1] -= delta; });
          c.value += delta; c.augmentations++;
          let cutAt = pathArcs.findIndex((a) => G.cap[a] - f[a] === 0);
          const shown = pathArcs.slice();
          snap([9, 10, 11], `Reached the sink: augment by δ = ${delta} along ${pathStr(G, shown)}. Flow value ${c.value}. Cut the path back to just before its first saturated arc and keep searching from there — no new BFS.`, { layered: true, path: shown, stack: P.map((v) => G.ids[v]) });
          P = P.slice(0, cutAt + 1); pathArcs = pathArcs.slice(0, cutAt);
          curArc();
          continue;
        }
        if (cur[u] >= G.adj[u].length) {
          P.pop(); c.retreats++;
          if (P.length) { const p = P[P.length - 1]; cur[p]++; pathArcs.pop(); }
          curArc();
          snap([12, 13], P.length ? `Dead end at ${G.ids[u]}: no usable arc left. Retreat to ${G.ids[P[P.length - 1]]} and advance its current arc past ${G.ids[u]} — that arc is useless for the rest of this phase.` : `The source itself is a dead end: every path in the level graph is blocked. The blocking flow for phase ${c.phases} is complete.`, { layered: true, dead: G.ids[u], stack: P.map((v) => G.ids[v]) });
          continue;
        }
        const a = G.adj[u][cur[u]], v = G.head[a];
        c["arc inspections"]++;
        if (lv[v] === lv[u] + 1 && G.cap[a] - f[a] > 0) {
          P.push(v); pathArcs.push(a); c.advances++;
          curArc();
          snap([14, 15], `Advance along ${G.ids[u]}${a % 2 ? "⇠" : "→"}${G.ids[v]} (level ${lv[u]} → ${lv[v]}, residual ${G.cap[a] - f[a]}).`, { layered: true, path: pathArcs.slice(), stack: P.map((x) => G.ids[x]), probe: a });
        } else {
          cur[u]++;
          curArc();
          snap(16, `Arc ${G.ids[u]}${a % 2 ? "⇠" : "→"}${G.ids[v]} is not usable (${lv[v] !== lv[u] + 1 ? `level ${lv[v] < 0 ? "∞" : lv[v]} is not ${lv[u] + 1}` : "no residual capacity"}): move ${G.ids[u]}'s current-arc pointer on. Each pointer only moves forward during a phase — that is what bounds the work.`, { layered: true, path: pathArcs.slice(), stack: P.map((x) => G.ids[x]), probe: a, probeBad: true });
        }
      }
    }
    P = []; curView = {};
    const cut = minCut(G, f);
    snap(4, `<b>Done.</b> Maximum flow = ${c.value}: ${c.phases} phases (BFS builds), ${c.augmentations} augmentations, ${c.advances} advances and ${c.retreats} retreats. Dinic's bound is O(V²E): at most V − 1 phases, each a blocking flow in O(VE). Min cut capacity = ${cut.cap}.`, { final: true, cut, layered: false });
    return { value: c.value, flow: edgeFlow(G, f), ctr: c, frames: R.frames, cut, over: R.over };
  }

  /* ------------------------------------------------------------------ Push–relabel (Goldberg–Tarjan) */
  function pushRelabel(net, opt) {
    opt = opt || {};
    const sel = opt.select === "highest" ? "highest" : "fifo", gap = !!opt.gap;
    const G = prep(net), R = recorder(opt), f = new Array(G.A).fill(0), n = G.n;
    const h = new Array(n).fill(0), ex = new Array(n).fill(0), cur = new Array(n).fill(0);
    const cnt = new Array(2 * n + 2).fill(0);
    const c = { value: 0, "saturating pushes": 0, "non-saturating pushes": 0, relabels: 0, "gap lifts": 0, "arc inspections": 0 };
    const H = () => { const o = {}; G.ids.forEach((id, i) => (o[id] = h[i])); return o; };
    const X = () => { const o = {}; G.ids.forEach((id, i) => (o[id] = ex[i])); return o; };
    const Q = [];
    let active = new Array(n).fill(false);
    const snap = (line, text, extra) => R.push(Object.assign({ flow: edgeFlow(G, f), line, text, ctr: Object.assign({}, c, { value: ex[G.t] }), heights: H(), excess: X(), queue: Q.map((v) => G.ids[v]) }, extra || {}));
    h[G.s] = n;
    for (let v = 0; v < n; v++) cnt[h[v]]++;
    snap(1, `Push–relabel never looks for a whole path. Every vertex gets a <b>height</b> (drawn as its vertical position); the source starts at height n = ${n}, everyone else at 0. Flow may only run downhill, one level at a time.`);
    const activate = (v) => { if (v !== G.s && v !== G.t && !active[v] && ex[v] > 0) { active[v] = true; Q.push(v); } };
    for (const a of G.adj[G.s]) {
      if (G.cap[a] - f[a] > 0) {
        const d = G.cap[a] - f[a];
        f[a] += d; f[a ^ 1] -= d; ex[G.head[a]] += d; ex[G.s] -= d;
        activate(G.head[a]);
      }
    }
    snap(2, `Saturate every edge out of the source. This is a <b>preflow</b>: vertices may now hold more flow in than out — the badges show their excess. Vertices with excess are <i>active</i>.`);
    let askedRelabel = 0, steps = 0;
    const pick = () => {
      if (sel === "fifo") { const v = Q.shift(); active[v] = false; return v; }
      let best = 0; for (let i = 1; i < Q.length; i++) if (h[Q[i]] > h[Q[best]] || (h[Q[i]] === h[Q[best]] && Q[i] < Q[best])) best = i;
      const v = Q.splice(best, 1)[0]; active[v] = false; return v;
    };
    while (Q.length && steps++ < 100000) {
      const u = pick();
      snap(4, `Pick active vertex ${G.ids[u]} (excess ${ex[u]}, height ${h[u]}) — ${sel === "fifo" ? "the oldest one in the first-in first-out (FIFO) queue" : "the highest active vertex"}.`, { curV: G.ids[u] });
      let relabeled = false;
      while (ex[u] > 0) {
        if (cur[u] >= G.adj[u].length) {
          // relabel
          let mh = Infinity;
          for (const a of G.adj[u]) { c["arc inspections"]++; if (G.cap[a] - f[a] > 0) mh = Math.min(mh, h[G.head[a]]); }
          const old = h[u], nh = mh + 1;
          let ask = null;
          if (R.on && askedRelabel < 2 && c.relabels >= 1) {
            const opts = [...new Set([nh, old + 1, mh, nh + 1])].filter((x) => x >= 0).sort((a, b) => a - b);
            ask = { q: `${G.ids[u]} still has excess ${ex[u]} but no arc leads exactly one level down. What will its new height be?`, opts: opts.map(String), ans: opts.indexOf(nh), why: `1 + the lowest height among its residual neighbors = 1 + ${mh} = ${nh}. That is the smallest lift that creates a downhill arc.` };
            askedRelabel++;
            snap([10, 11], `${G.ids[u]} is stuck: no admissible arc.`, { curV: G.ids[u], ask });
          }
          cnt[old]--; h[u] = nh; cnt[Math.min(nh, 2 * n + 1)]++; cur[u] = 0; c.relabels++;
          snap([10, 11], `<b>Relabel</b> ${G.ids[u]}: height ${old} → ${nh} (one above its lowest residual neighbor, at ${mh}). Now some arc out of ${G.ids[u]} points downhill.`, { curV: G.ids[u], relabel: G.ids[u] });
          if (gap && old < n && cnt[old] === 0) {
            const lifted = [];
            for (let v = 0; v < n; v++) if (v !== G.s && h[v] > old && h[v] < n) { cnt[h[v]]--; h[v] = n + 1; cnt[n + 1]++; lifted.push(G.ids[v]); cur[v] = 0; }
            c["gap lifts"] += lifted.length;
            if (lifted.length) snap([12, 13], `<b>Gap!</b> No vertex is left at height ${old}. Vertices above the gap (${lifted.join(", ")}) can no longer reach the sink, so lift them straight to n + 1 = ${n + 1}: their excess will drain back to the source without dozens of small relabels.`, { curV: G.ids[u], gapAt: old });
          }
          relabeled = true;
          break;
        }
        const a = G.adj[u][cur[u]], v = G.head[a];
        c["arc inspections"]++;
        if (G.cap[a] - f[a] > 0 && h[u] === h[v] + 1) {
          const r = G.cap[a] - f[a], d = Math.min(ex[u], r);
          f[a] += d; f[a ^ 1] -= d; ex[u] -= d; ex[v] += d;
          const satur = d === r;
          c[satur ? "saturating pushes" : "non-saturating pushes"]++;
          activate(v);
          snap([6, 7, 8], `<b>Push</b> ${d} from ${G.ids[u]} (height ${h[u]}) down to ${G.ids[v]} (height ${h[v]})${a % 2 ? ", backwards along an edge — returning flow" : ""}: min(excess ${ex[u] + d}, residual ${r}) = ${d}. ${satur ? "The arc is now full: a <i>saturating</i> push." : `${G.ids[u]} is empty now: a <i>non-saturating</i> push.`}`, { curV: G.ids[u], pushArc: a });
        } else cur[u]++;
      }
      if (relabeled && ex[u] > 0) activate(u);
    }
    const cut = minCut(G, f);
    c.value = ex[G.t];
    snap(14, `<b>Done.</b> No active vertex is left, so the preflow is a real flow: maximum flow = ${ex[G.t]}, with ${c["saturating pushes"]} saturating and ${c["non-saturating pushes"]} non-saturating pushes and ${c.relabels} relabels. ${gap ? `The gap heuristic lifted ${c["gap lifts"]} vertices. ` : ""}Min cut capacity = ${cut.cap}.`, { final: true, cut });
    return { value: ex[G.t], flow: edgeFlow(G, f), ctr: c, frames: R.frames, cut, over: R.over, heights: H() };
  }

  /* ------------------------------------------------------------------ brute force (tests) */
  function bruteMinCut(net) {
    const G = prep(net), others = [...Array(G.n).keys()].filter((v) => v !== G.s && v !== G.t);
    let best = Infinity;
    for (let mask = 0; mask < 1 << others.length; mask++) {
      const inX = new Array(G.n).fill(false); inX[G.s] = true;
      others.forEach((v, i) => { if (mask & (1 << i)) inX[v] = true; });
      let cap = 0; G.E.forEach((e, k) => { if (inX[G.tail[2 * k]] && !inX[G.head[2 * k]]) cap += e.cap; });
      best = Math.min(best, cap);
    }
    return best;
  }
  function checkFlow(net, flow) {
    const G = prep(net), bal = new Array(G.n).fill(0);
    for (let k = 0; k < G.E.length; k++) { if (flow[k] < 0 || flow[k] > G.E[k].cap) return false; bal[G.tail[2 * k]] -= flow[k]; bal[G.head[2 * k]] += flow[k]; }
    for (let v = 0; v < G.n; v++) if (v !== G.s && v !== G.t && bal[v] !== 0) return false;
    return bal[G.t];
  }

  /* ------------------------------------------------------------------ presets */
  function rng(seed) {
    let a = (seed >>> 0) || 0x9e3779b9;
    return function () { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const mk = (nodes, edges, s, t) => ({ nodes: nodes.map(([id, x, y]) => ({ id, x, y })), edges: edges.map(([u, v, cap]) => ({ u, v, cap })), s, t });
  const PRESETS = {
    textbook: () => mk([["1", 60, 200], ["2", 230, 80], ["4", 230, 320], ["3", 420, 240], ["5", 420, 80], ["6", 600, 200]],
      [["1", "2", 2], ["1", "4", 3], ["2", "3", 5], ["2", "5", 3], ["4", "3", 1], ["3", "6", 2], ["5", "6", 4]], "1", "6"),
    bipartite: () => mk([["s", 50, 200], ["A", 210, 50], ["B", 210, 150], ["C", 210, 250], ["D", 210, 350], ["1", 430, 50], ["2", 430, 150], ["3", 430, 250], ["4", 430, 350], ["t", 600, 200]],
      [["s", "A", 1], ["s", "B", 1], ["s", "C", 1], ["s", "D", 1], ["A", "1", 1], ["A", "2", 1], ["B", "1", 1], ["C", "2", 1], ["C", "3", 1], ["D", "3", 1], ["D", "4", 1], ["1", "t", 1], ["2", "t", 1], ["3", "t", 1], ["4", "t", 1]], "s", "t"),
    /* every augmenting path re-walks the same long chain; push–relabel moves the whole excess down it as one packet */
    chain: (k) => {
      k = Math.max(2, Math.min(8, k || 6));
      const nodes = [["s", 40, 210], ["c1", 120, 120], ["c2", 210, 60], ["c3", 300, 120], ["c4", 380, 210]];
      const edges = [["s", "c1", k], ["c1", "c2", k], ["c2", "c3", k], ["c3", "c4", k]];
      for (let i = 1; i <= k; i++) { const y = 30 + ((i - 0.5) * 360) / k; nodes.push(["m" + i, 500, Math.round(y)]); edges.push(["c4", "m" + i, 1], ["m" + i, "t", 1]); }
      nodes.push(["t", 610, 210]);
      return mk(nodes, edges, "s", "t");
    },
  };
  function randomNet(seed) {
    const r = rng(seed), cap = () => 1 + Math.floor(r() * 9);
    const nodes = [["s", 50, 200], ["a", 200, 70], ["b", 200, 200], ["c", 200, 330], ["d", 420, 70], ["e", 420, 200], ["f", 420, 330], ["t", 600, 200]];
    const L1 = ["a", "b", "c"], L2 = ["d", "e", "f"], edges = [], has = new Set();
    const add = (u, v) => { if (u === v || has.has(u + ">" + v) || has.has(v + ">" + u)) return; has.add(u + ">" + v); edges.push([u, v, cap()]); };
    L1.forEach((x) => { if (r() < 0.85) add("s", x); });
    L2.forEach((x) => { if (r() < 0.85) add(x, "t"); });
    L1.forEach((x) => L2.forEach((y) => { if (r() < 0.45) add(x, y); }));
    for (let i = 0; i < 3; i++) { const p = r() < 0.5 ? L1 : L2; const a = p[Math.floor(r() * 3)], b = p[Math.floor(r() * 3)]; add(a, b); }
    if (r() < 0.4) add(L2[Math.floor(r() * 3)], L1[Math.floor(r() * 3)]);
    // make sure every middle vertex has some way in and out
    L1.forEach((x) => { if (!edges.some((e) => e[1] === x)) add("s", x); if (!edges.some((e) => e[0] === x)) add(x, L2[Math.floor(r() * 3)]); });
    L2.forEach((y) => { if (!edges.some((e) => e[0] === y)) add(y, "t"); if (!edges.some((e) => e[1] === y)) add(L1[Math.floor(r() * 3)], y); });
    return mk(nodes, edges, "s", "t");
  }

  const API = { prep, edmondsKarp, dinic, pushRelabel, minCut, bruteMinCut, checkFlow, PRESETS, randomNet, rng };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.FlowCore = API;
})(typeof window !== "undefined" ? window : globalThis);
