/* =====================================================================
   Algorithm Forge — vector-search core (no DOM)
   ---------------------------------------------------------------------
   k-nearest-neighbour search four ways, in any dimension d:
     brute      : compare the query with every point
     k-d tree   : median splits, branch-and-bound search
     LSH        : random hyperplanes -> bit codes -> buckets (L tables)
     HNSW       : Hierarchical Navigable Small World graph
                  (Malkov & Yashunin, arXiv:1603.09320): random levels with
                  mL = 1/ln M, SEARCH-LAYER, neighbour-selection heuristic,
                  Mmax0 = 2M on layer 0.
   Every distance evaluation goes through ctr.dist++ so the counters are
   exact. Searches accept an optional emitter E(payload) for animation.
   All randomness comes from a seeded generator (deterministic).
   ===================================================================== */
(function (root) {
  "use strict";

  function rng(seed) {
    let a = (seed >>> 0) || 0x9e3779b9;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) { let u = 0, v = 0; while (u === 0) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function kth(k) { return k === 1 ? "best" : k + (k % 10 === 2 && k !== 12 ? "nd" : k % 10 === 3 && k !== 13 ? "rd" : "th") + " best"; }
  function d2(a, b) { let s = 0; for (let k = 0; k < a.length; k++) { const t = a[k] - b[k]; s += t * t; } return s; }

  /** n points in [0,1]^d drawn around c random cluster centres. */
  function clusters(n, d, seed, c) {
    const r = rng(seed);
    c = c || 3 + Math.floor(r() * 4);
    const cen = Array.from({ length: c }, () => ({ m: Array.from({ length: d }, () => 0.15 + 0.7 * r()), s: 0.035 + 0.06 * r() }));
    return Array.from({ length: n }, () => {
      const C = cen[Math.floor(r() * c)];
      return C.m.map((m) => Math.min(0.99, Math.max(0.01, m + C.s * gauss(r))));
    });
  }
  /** Queries near the data: a random point plus noise. */
  function queriesNear(P, q, seed, noise) {
    const r = rng(seed);
    return Array.from({ length: q }, () => P[Math.floor(r() * P.length)].map((x) => Math.min(1, Math.max(0, x + (noise || 0.04) * gauss(r)))));
  }

  /* keep a sorted list of the k best {i, d} */
  function pushBest(best, k, i, d) {
    if (best.length === k && d >= best[k - 1].d) return false;
    let j = best.length;
    best.push({ i, d });
    while (j > 0 && best[j - 1].d > d) { best[j] = best[j - 1]; j--; }
    best[j] = { i, d };
    if (best.length > k) best.pop();
    return true;
  }

  /* ------------------------------------------------------------------ */
  function brute(P, q, k, ctr, E) {
    const best = [];
    for (let i = 0; i < P.length; i++) {
      ctr.dist++;
      const d = d2(q, P[i]);
      const better = pushBest(best, k, i, d);
      if (E) E({ line: better ? 5 : 3, cur: i, best: best.slice(), seenUpTo: i, text: better ? `Point #${i}: distance ${Math.sqrt(d).toFixed(3)} — among the ${k} closest so far, keep it.` : `Point #${i}: distance ${Math.sqrt(d).toFixed(3)} — farther than the current ${kth(k)} (${Math.sqrt(best[best.length - 1].d).toFixed(3)}), skip.` });
    }
    return best;
  }

  /* ------------------------------------------------------------------ */
  function kdBuild(P) {
    const dim = P.length ? P[0].length : 2;
    const lo0 = Array(dim).fill(0), hi0 = Array(dim).fill(1);
    let maxDepth = 0;
    function build(ids, depth, lo, hi) {
      if (!ids.length) return null;
      const axis = depth % dim;
      ids.sort((a, b) => P[a][axis] - P[b][axis] || a - b);
      const m = ids.length >> 1;
      const node = { i: ids[m], axis, depth, lo, hi, left: null, right: null };
      maxDepth = Math.max(maxDepth, depth);
      const split = P[ids[m]][axis];
      const hiL = hi.slice(); hiL[axis] = split;
      const loR = lo.slice(); loR[axis] = split;
      node.left = build(ids.slice(0, m), depth + 1, lo, hiL);
      node.right = build(ids.slice(m + 1), depth + 1, loR, hi);
      return node;
    }
    const rootNode = build(P.map((_, i) => i), 0, lo0, hi0);
    return { root: rootNode, maxDepth, dim };
  }
  function kdNodes(t) { const out = []; (function w(n) { if (!n) return; out.push(n); w(n.left); w(n.right); })(t.root); return out; }

  function kdSearch(tree, P, q, k, ctr, E) {
    const best = [], visited = [], pruned = [];
    let asked = { yes: false, no: false };
    const rad = () => (best.length < k ? Infinity : best[k - 1].d);
    function visit(node) {
      if (!node) return;
      ctr.dist++;
      ctr.nodes = (ctr.nodes || 0) + 1;
      const d = d2(q, P[node.i]);
      const better = pushBest(best, k, node.i, d);
      visited.push(node.i);
      const ax = node.axis, diff = q[ax] - P[node.i][ax];
      const axName = tree.dim === 2 ? (ax === 0 ? "x" : "y") : "axis " + ax;
      if (E) E({ line: 9, cur: node.i, node, best: best.slice(), visited: visited.slice(), pruned: pruned.slice(), r2: rad(),
        text: `Visit #${node.i} (depth ${node.depth}, splits on ${axName}): distance ${Math.sqrt(d).toFixed(3)}${better ? " — joins the best list" : ""}. Go first to the side of the line where q is.` });
      const near = diff < 0 ? node.left : node.right, far = diff < 0 ? node.right : node.left;
      visit(near);
      const r2 = rad();
      if (!far) return;
      const cross = diff * diff < r2;
      if (E && ((cross && !asked.yes) || (!cross && !asked.no))) {
        if (cross) asked.yes = true; else asked.no = true;
        E({ line: 13, cur: node.i, node, best: best.slice(), visited: visited.slice(), pruned: pruned.slice(), r2, farCell: far,
          text: `Back at #${node.i}. The other side of its ${axName}-split line is ${Math.abs(diff).toFixed(3)} away from q; the current ${kth(k)} distance is ${r2 === Infinity ? "∞ (fewer than k found)" : Math.sqrt(r2).toFixed(3)}.`,
          ask: { q: `Does the search have to look on the other side of #${node.i}'s split line?`, opts: ["Yes — the ball crosses the line", "No — prune that whole region"], ans: cross ? 0 : 1, why: `Compare the distance from q to the line (${Math.abs(diff).toFixed(3)}) with the radius of the current ${kth(k)} (${r2 === Infinity ? "∞" : Math.sqrt(r2).toFixed(3)}). Anything across the line is at least that far away.` } });
      }
      if (cross) {
        if (E) E({ line: 14, cur: node.i, node, best: best.slice(), visited: visited.slice(), pruned: pruned.slice(), r2, farCell: far, text: `The ball around q (radius ${r2 === Infinity ? "∞" : Math.sqrt(r2).toFixed(3)}) crosses the split line, so a closer point could hide on the other side: search it too.` });
        visit(far);
      } else {
        pruned.push({ lo: far.lo, hi: far.hi });
        ctr.pruned = (ctr.pruned || 0) + 1;
        if (E) E({ line: 15, cur: node.i, node, best: best.slice(), visited: visited.slice(), pruned: pruned.slice(), r2, text: `The line is ${Math.abs(diff).toFixed(3)} away but the ${kth(k)} is only ${Math.sqrt(r2).toFixed(3)} away: <b>prune</b> the whole shaded region without computing a single distance inside it.` });
      }
    }
    visit(tree.root);
    return best;
  }

  /* ------------------------------------------------------------------ */
  function lshBuild(P, K, L, seed, dim) {
    const r = rng(seed);
    dim = dim || (P.length ? P[0].length : 2);
    const tables = [];
    for (let t = 0; t < L; t++) {
      const planes = [];
      for (let j = 0; j < K; j++) {
        let w = Array.from({ length: dim }, () => gauss(r));
        const nrm = Math.sqrt(w.reduce((s, x) => s + x * x, 0)) || 1;
        w = w.map((x) => x / nrm);
        const p0 = Array.from({ length: dim }, () => 0.1 + 0.8 * r());
        const b = -w.reduce((s, x, k) => s + x * p0[k], 0);
        planes.push({ w, b });
      }
      tables.push({ planes, buckets: new Map() });
    }
    const idx = { K, L, tables, hashEvals: 0 };
    P.forEach((p, i) => tables.forEach((T) => { const c = lshCode(T, p); idx.hashEvals += K; if (!T.buckets.has(c)) T.buckets.set(c, []); T.buckets.get(c).push(i); }));
    return idx;
  }
  function lshCode(T, p) { return T.planes.map((pl) => (pl.w.reduce((s, x, k) => s + x * p[k], 0) + pl.b >= 0 ? "1" : "0")).join(""); }

  function lshSearch(idx, P, q, k, ctr, E) {
    const cand = new Set();
    idx.tables.forEach((T, t) => {
      const c = lshCode(T, q);
      ctr.hash = (ctr.hash || 0) + idx.K;
      const b = T.buckets.get(c) || [];
      const before = cand.size;
      b.forEach((i) => cand.add(i));
      if (E) E({ line: 10, table: t, code: c, bucket: b.slice(), cand: [...cand], text: `Table ${t + 1}: q is on the ${c.split("").map((x) => (x === "1" ? "+" : "−")).join("")} side of its ${idx.K} line${idx.K > 1 ? "s" : ""} → bucket <code>${c}</code> holds ${b.length} point${b.length === 1 ? "" : "s"} (${cand.size - before} new). No distances computed yet — just ${idx.K} dot products.`,
        ask: t === 0 && E.askFirst ? E.askFirst(b) : null });
    });
    const best = [];
    [...cand].forEach((i) => { ctr.dist++; pushBest(best, k, i, d2(q, P[i])); });
    ctr.cand = cand.size;
    if (E) E({ line: 12, table: -1, cand: [...cand], best: best.slice(), text: cand.size ? `Compute exact distances to the ${cand.size} candidate${cand.size === 1 ? "" : "s"} only (out of ${P.length}) and keep the ${k} closest.` : `No point shares a bucket with q in any table, so LSH returns nothing. Fewer bits per table (K) or more tables (L) fix this.` });
    return best;
  }

  /* convex polygon of the region on q's side of each line, clipped to the unit square (2-D only) */
  function lshCell(T, q) {
    let poly = [[0, 0], [1, 0], [1, 1], [0, 1]];
    T.planes.forEach((pl) => {
      const sgn = pl.w[0] * q[0] + pl.w[1] * q[1] + pl.b >= 0 ? 1 : -1;
      const f = (p) => sgn * (pl.w[0] * p[0] + pl.w[1] * p[1] + pl.b);
      const out = [];
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length], fa = f(a), fb = f(b);
        if (fa >= 0) out.push(a);
        if ((fa >= 0) !== (fb >= 0)) { const t = fa / (fa - fb); out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]); }
      }
      poly = out;
    });
    return poly;
  }

  /* ------------------------------------------------------------------ */
  function hnswBuild(P, opt, ctr, onInsert) {
    const M = opt.M, efC = opt.efC, Mmax0 = 2 * M, mL = 1 / Math.log(M);
    const r = rng(opt.seed);
    const G = { M, efC, mL, level: [], nbr: [], entry: -1, top: -1, order: [] };
    const dist = (a, b) => { ctr.dist++; return d2(P[a], P[b]); };
    for (let q = 0; q < P.length; q++) {
      const l = Math.floor(-Math.log(1 - r()) * mL);
      G.level[q] = l;
      for (let lc = 0; lc <= l; lc++) { if (!G.nbr[lc]) G.nbr[lc] = []; G.nbr[lc][q] = []; }
      if (G.entry < 0) { G.entry = q; G.top = l; G.order.push(q); if (onInsert) onInsert(q, l, G); continue; }
      let eps = [{ i: G.entry, d: dist(q, G.entry) }];
      for (let lc = G.top; lc > l; lc--) eps = [searchLayer(G, (e) => dist(q, e), eps, 1, lc)[0]];
      for (let lc = Math.min(G.top, l); lc >= 0; lc--) {
        const W = searchLayer(G, (e) => dist(q, e), eps, efC, lc);
        const neigh = selectHeuristic(W, M, dist);
        G.nbr[lc][q] = neigh.map((x) => x.i);
        const cap = lc === 0 ? Mmax0 : M;
        neigh.forEach(({ i: e }) => {
          const list = G.nbr[lc][e];
          list.push(q);
          if (list.length > cap) {
            const withD = list.map((j) => ({ i: j, d: dist(e, j) })).sort((a, b) => a.d - b.d);
            G.nbr[lc][e] = selectHeuristic(withD, cap, dist).map((x) => x.i);
          }
        });
        eps = W;
      }
      if (l > G.top) { G.top = l; G.entry = q; }
      G.order.push(q);
      if (onInsert) onInsert(q, l, G);
    }
    return G;
  }
  /* SELECT-NEIGHBORS-HEURISTIC: keep e only if it is closer to the base than to every neighbour already kept */
  function selectHeuristic(W, M, dist) {
    const sorted = W.slice().sort((a, b) => a.d - b.d), R = [];
    for (const e of sorted) {
      if (R.length >= M) break;
      let good = true;
      for (const r of R) if (dist(e.i, r.i) < e.d) { good = false; break; }
      if (good) R.push(e);
    }
    return R;
  }
  /* SEARCH-LAYER (Algorithm 2). Returns W sorted by distance. */
  function searchLayer(G, dq, eps, ef, lc, E, extra) {
    const visited = new Set(eps.map((e) => e.i));
    let C = eps.slice(), W = eps.slice().sort((a, b) => a.d - b.d);
    const layer = G.nbr[lc];
    let step = 0;
    while (C.length) {
      C.sort((a, b) => a.d - b.d);
      const c = C.shift();
      const f = W[W.length - 1];
      if (c.d > f.d) { if (E) E(Object.assign({ line: 20, layer: lc, cur: c.i, C: C.map((x) => x.i), W: W.map((x) => x.i), visited: [...visited], stop: true }, extra)); break; }
      const nb = (layer && layer[c.i]) || [];
      const fresh = nb.filter((e) => !visited.has(e));
      if (E) E(Object.assign({ line: 19, layer: lc, cur: c.i, C: C.map((x) => x.i), W: W.map((x) => x.i), visited: [...visited], look: fresh, step: step++, Wbefore: W.slice() }, extra));
      for (const e of fresh) {
        visited.add(e);
        const de = dq(e);
        const fw = W[W.length - 1];
        if (W.length < ef || de < fw.d) {
          C.push({ i: e, d: de });
          let j = W.length; W.push({ i: e, d: de });
          while (j > 0 && W[j - 1].d > de) { W[j] = W[j - 1]; j--; }
          W[j] = { i: e, d: de };
          if (W.length > ef) W.pop();
        }
      }
      if (E) E(Object.assign({ line: 23, layer: lc, cur: c.i, C: C.map((x) => x.i), W: W.map((x) => x.i), visited: [...visited], looked: fresh }, extra));
    }
    return W;
  }
  function hnswSearch(G, P, q, k, ef, ctr, E) {
    const dq = (e) => { ctr.dist++; return d2(q, P[e]); };
    let eps = [{ i: G.entry, d: dq(G.entry) }];
    if (E) E({ line: 10, layer: G.top, cur: G.entry, C: [], W: [G.entry], visited: [G.entry], text: `Start at the entry point #${G.entry}, the only node on the top layer ${G.top}${G.top > 0 ? "" : " (the graph has a single layer)"}.` });
    ctr.hops = 0;
    for (let lc = G.top; lc >= 1; lc--) {
      const W = searchLayer(G, dq, eps, 1, lc, E ? (p) => { if (p.line === 19) ctr.hops++; E(p); } : null, { greedy: true });
      eps = [W[0]];
      if (E) E({ line: 12, layer: lc, cur: W[0].i, C: [], W: [W[0].i], visited: [W[0].i], descend: true, text: `Layer ${lc} can't get any closer than #${W[0].i}. Drop down to layer ${lc - 1}, starting from #${W[0].i}.` });
    }
    const W = searchLayer(G, dq, eps, Math.max(ef, k), 0, E ? (p) => { if (p.line === 19) ctr.hops++; E(p); } : null, { greedy: false });
    return W.slice(0, k);
  }

  /* ------------------------------------------------------------------ */
  function recall(found, truth) { const t = new Set(truth.map((x) => x.i)); return found.filter((x) => t.has(x.i)).length / truth.length; }

  /** Benchmark over many queries. Returns rows {name, recall, dist, build}. */
  function benchmark(P, Q, k, prm) {
    const n = P.length;
    const truth = Q.map((q) => brute(P, q, k, { dist: 0 }));
    const rows = [];
    rows.push({ id: "brute", name: "Brute force", recall: 1, dist: n, build: "none" });
    const tree = kdBuild(P);
    let c = { dist: 0 }, rec = 0;
    Q.forEach((q, j) => { rec += recall(kdSearch(tree, P, q, k, c), truth[j]); });
    rows.push({ id: "kd", name: "k-d tree", recall: rec / Q.length, dist: c.dist / Q.length, build: "sorting only (no distances)" });
    const lsh = lshBuild(P, prm.K, prm.L, prm.seed + 202);
    c = { dist: 0 }; rec = 0;
    Q.forEach((q, j) => { rec += recall(lshSearch(lsh, P, q, k, c), truth[j]); });
    rows.push({ id: "lsh", name: `LSH (K = ${prm.K}, L = ${prm.L})`, recall: rec / Q.length, dist: c.dist / Q.length, build: `${lsh.hashEvals.toLocaleString("en-US")} hash bits` });
    const bc = { dist: 0 };
    const G = hnswBuild(P, { M: prm.M, efC: prm.efC, seed: prm.seed + 101 }, bc);
    c = { dist: 0 }; rec = 0;
    Q.forEach((q, j) => { rec += recall(hnswSearch(G, P, q, k, prm.ef, c), truth[j]); });
    rows.push({ id: "hnsw", name: `HNSW (M = ${prm.M}, ef = ${prm.ef})`, recall: rec / Q.length, dist: c.dist / Q.length, build: `${bc.dist.toLocaleString("en-US")} distances` });
    return rows;
  }

  const API = { rng, gauss, d2, clusters, queriesNear, pushBest, brute, kdBuild, kdNodes, kdSearch, lshBuild, lshCode, lshSearch, lshCell, hnswBuild, hnswSearch, searchLayer, selectHeuristic, recall, benchmark };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.VecCore = API;
})(typeof window !== "undefined" ? window : globalThis);
