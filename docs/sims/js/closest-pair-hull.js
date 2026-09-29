/* =====================================================================
   Algorithm Forge — Closest Pair & Convex Hull (docs/sims/closest-pair-hull.html)
   Brute force (Levitin §3.3) versus divide-and-conquer (Levitin §5.5)
   for two geometry problems on the same clickable point set.
   Part 1 (recorders) also runs in Node for testing.
   ===================================================================== */
(function () {
  "use strict";

  /* ================= Part 1: recorders ================= */
  function parseSpec(spec) {
    const L = {}, lines = [];
    spec.forEach((s) => { const m = /^@(\w+)\|(.*)$/.exec(s); if (m) { L[m[1]] = lines.length; lines.push(m[2]); } else lines.push(s); });
    return { L, lines };
  }
  function hash(s) { let h = 2166136261; for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mkAsk(q, correct, pool, why) {
    const c = String(correct);
    const uniq = [...new Set(pool.map(String))].filter((x) => x !== c);
    if (!uniq.length) return null;
    uniq.sort((a, b) => hash(a + q) - hash(b + q));
    const opts = [c, ...uniq.slice(0, 3)];
    if (opts.every((x) => /^-?\d+$/.test(x))) opts.sort((a, b) => a - b);
    else opts.sort();
    return { q, opts, ans: opts.indexOf(c), why };
  }
  function thinAsks(frames, max) {
    const idx = frames.map((f, i) => (f.ask ? i : -1)).filter((i) => i >= 0);
    if (idx.length > max) {
      const keep = new Set(); for (let t = 0; t < max; t++) keep.add(idx[Math.round((t * (idx.length - 1)) / (max - 1))]);
      frames.forEach((f, i) => { if (!keep.has(i)) f.ask = null; });
    }
    return frames;
  }
  function Rec(spec) {
    const Pm = parseSpec(spec), frames = [], c = {};
    const one = (k) => { if (k == null || typeof k === "number") return k; if (!(k in Pm.L)) throw new Error("no line " + k); return Pm.L[k]; };
    return {
      lines: Pm.lines, frames, c,
      push(line, text, d) { frames.push(Object.assign({ line: Array.isArray(line) ? line.map(one) : one(line), text, c: Object.assign({}, c) }, d || {})); return frames.length - 1; },
    };
  }
  const d2 = (a, b) => (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
  /** > 0 when c is to the left of the directed line a→b (counterclockwise turn). */
  const orient = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const fx = (v) => (Math.round(v * 100) / 100).toString();
  const lab = (i) => "p" + (i + 1);

  const REC = {};

  /* ---- Closest pair by brute force (Levitin §3.3) ---- */
  REC.cpBrute = function (pts) {
    const n = pts.length;
    const R = Rec([
      "@start|ALGORITHM BruteForceClosestPair(P[1..n])",
      "@init|    dsq ← ∞",
      "    for i ← 1 to n − 1 do",
      "        for j ← i + 1 to n do",
      "@dist|            dsq ← min(dsq, (xi − xj)² + (yi − yj)²)",
      "@ret|    return sqrt(dsq)          // one square root, at the end",
    ]);
    R.c.dist = 0;
    const total = (n * (n - 1)) / 2;
    R.push(["start", "init"], `Check every pair of the ${n} points. Comparing squared distances gives the same winner as comparing distances, so no square roots are needed inside the loop.`,
      { ask: mkAsk(`How many squared distances will brute force compute for n = ${n}?`, total, [n * n, n * (n - 1), Math.round(n * Math.log2(n)), total + n, n - 1], `One per unordered pair: n(n−1)/2 = ${n}·${n - 1}/2 = ${total}.`) });
    let best = Infinity, bi = -1, bj = -1;
    for (let i = 0; i < n - 1; i++) for (let j = i + 1; j < n; j++) {
      R.c.dist++;
      const d = d2(pts[i], pts[j]), better = d < best;
      if (better) { best = d; bi = i; bj = j; }
      R.push("dist", `Pair (${lab(i)}, ${lab(j)}): squared distance ${fx(d)}${better ? `. That is the smallest so far, so it becomes the best pair.` : ` ≥ best ${fx(best)}, no change.`}`,
        { segs: [{ a: i, b: j, cls: better ? "best" : "cur" }], best: [bi, bj], hl: { [i]: "compare", [j]: "compare" } });
    }
    R.push("ret", `Closest pair: ${lab(bi)} and ${lab(bj)}, distance √${fx(best)} ≈ ${fx(Math.sqrt(best))}. ${R.c.dist} squared-distance computations = n(n−1)/2, so Θ(n²).`, { best: [bi, bj], hl: { [bi]: "done", [bj]: "done" } });
    return { lines: R.lines, frames: R.frames, c: R.c, best: Math.sqrt(best) };
  };

  /* ---- Closest pair by divide-and-conquer (Levitin §5.5) ---- */
  REC.cpDC = function (pts) {
    const n = pts.length;
    const R = Rec([
      "@start|ALGORITHM EfficientClosestPair(P, Q)",
      "    // P sorted by x, Q = the same points sorted by y",
      "@base|    if n ≤ 3 then return the brute-force answer",
      "@split|    Pl, Ql ← first ⌈n/2⌉ points of P (and of Q); Pr, Qr ← the rest",
      "@rec|    dl ← EfficientClosestPair(Pl, Ql); dr ← EfficientClosestPair(Pr, Qr)",
      "@min|    d ← min(dl, dr); m ← P[⌈n/2⌉ − 1].x",
      "@strip|    S ← points of Q with |x − m| < d        // in y order",
      "@dsq|    dminsq ← d²",
      "    for i ← 0 to num − 2 do",
      "        k ← i + 1",
      "@while|        while k ≤ num − 1 and (S[k].y − S[i].y)² < dminsq do",
      "@upd|            dminsq ← min((S[k].x − S[i].x)² + (S[k].y − S[i].y)², dminsq); k ← k + 1",
      "@ret|    return sqrt(dminsq)",
    ]);
    R.c.dist = 0; R.c.depth = 0; R.c.strip = 0;
    const byX = pts.map((_, i) => i).sort((a, b) => pts[a].x - pts[b].x || pts[a].y - pts[b].y);
    const byY = pts.map((_, i) => i).sort((a, b) => pts[a].y - pts[b].y || pts[a].x - pts[b].x);
    R.push("start", `Presort the ${n} points by x (P) and by y (Q). Then split by a vertical line, solve each half recursively, and check only a narrow strip around the line. Brute force would need n(n−1)/2 = ${(n * (n - 1)) / 2} distances.`, {});
    function rec(P, Q, depth) {
      R.c.depth = Math.max(R.c.depth, depth);
      const k = P.length, set = new Set(P), region = [pts[P[0]].x, pts[P[k - 1]].x];
      const dimOthers = {}; pts.forEach((_, i) => { if (!set.has(i)) dimOthers[i] = "dim"; });
      if (k <= 3) {
        let best = { d: Infinity, a: -1, b: -1 };
        for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
          R.c.dist++;
          const d = d2(pts[P[i]], pts[P[j]]);
          if (d < best.d) best = { d, a: P[i], b: P[j] };
        }
        R.push("base", `${k} point(s) here (${P.map(lab).join(", ")}): small enough for brute force. ${k === 2 ? "One distance" : "Three distances"}; the closest pair is ${lab(best.a)}–${lab(best.b)} with distance ${fx(Math.sqrt(best.d))}.`,
          { region, hl: Object.assign({}, dimOthers, Object.fromEntries(P.map((i) => [i, "active"]))), best: [best.a, best.b], depth });
        return best;
      }
      const h = Math.ceil(k / 2), Pl = P.slice(0, h), Pr = P.slice(h), m = pts[P[h - 1]].x;
      const ls = new Set(Pl), Ql = Q.filter((i) => ls.has(i)), Qr = Q.filter((i) => !ls.has(i) && set.has(i));
      const hl = Object.assign({}, dimOthers); Pl.forEach((i) => (hl[i] = "active")); Pr.forEach((i) => (hl[i] = "compare"));
      R.push(["split", "rec"], `${k} points: split by the vertical line x = m = ${fx(m)} into the left ${h} (blue) and the right ${k - h} (yellow). Solve each side recursively.`, { region, vline: m, hl, depth });
      const L = rec(Pl, Ql, depth + 1), Rt = rec(Pr, Qr, depth + 1);
      let best = L.d <= Rt.d ? L : Rt;
      const d = Math.sqrt(best.d);
      const S = Q.filter((i) => Math.abs(pts[i].x - m) < d);
      R.c.strip += S.length;
      const hl2 = Object.assign({}, dimOthers); S.forEach((i) => (hl2[i] = "pivot"));
      R.push(["min", "strip", "dsq"], `Back at the ${k}-point level: dl = ${fx(Math.sqrt(L.d))}, dr = ${fx(Math.sqrt(Rt.d))}, so d = ${fx(d)}. A closer pair must straddle the line, so only points with |x − ${fx(m)}| < d matter: the strip holds ${S.length} point(s).`,
        { region, vline: m, band: [m - d, m + d], hl: hl2, best: [best.a, best.b], depth,
          ask: mkAsk(`d = ${fx(d)}. How many points lie in the strip |x − ${fx(m)}| < d?`, S.length, [0, 1, 2, 3, 4, 5, 6, k, S.length + 1, Math.max(0, S.length - 1)].filter((x) => x <= k), `Count the points whose x is within ${fx(d)} of ${fx(m)}: ${S.length ? S.map(lab).join(", ") : "none"}.`) });
      let dminsq = best.d;
      for (let i = 0; i < S.length - 1; i++) {
        for (let j = i + 1; j < S.length; j++) {
          const dy = pts[S[j]].y - pts[S[i]].y;
          if (dy * dy >= dminsq) {
            R.push("while", `${lab(S[i])}: the next point in y order, ${lab(S[j])}, is at least d higher (Δy = ${fx(dy)}), and so is every point after it. Move on.`,
              { region, vline: m, band: [m - Math.sqrt(best.d), m + Math.sqrt(best.d)], hl: Object.assign({}, hl2, { [S[i]]: "active" }), best: [best.a, best.b], box: { i: S[i], h: Math.sqrt(dminsq) }, depth });
            break;
          }
          R.c.dist++;
          const dd = d2(pts[S[i]], pts[S[j]]), better = dd < dminsq;
          if (better) { dminsq = dd; best = { d: dd, a: S[i], b: S[j] }; }
          R.push(["while", "upd"], `Strip check ${lab(S[i])}–${lab(S[j])}: squared distance ${fx(dd)}${better ? `, closer than anything so far: new best pair (d = ${fx(Math.sqrt(dd))}).` : ` ≥ ${fx(dminsq)}, no change.`}`,
            { region, vline: m, band: [m - Math.sqrt(best.d), m + Math.sqrt(best.d)], hl: Object.assign({}, hl2, { [S[i]]: "active", [S[j]]: "compare" }), best: [best.a, best.b], segs: [{ a: S[i], b: S[j], cls: better ? "best" : "cur" }], box: { i: S[i], h: Math.sqrt(dminsq) }, depth });
        }
      }
      R.push("ret", `This level returns d = ${fx(Math.sqrt(best.d))} (${lab(best.a)}–${lab(best.b)}).`, { region, vline: m, hl: dimOthers, best: [best.a, best.b], depth });
      return best;
    }
    const b = rec(byX, byY, 1);
    R.push(null, `Closest pair: ${lab(b.a)} and ${lab(b.b)}, distance ≈ ${fx(Math.sqrt(b.d))}. ${R.c.dist} squared distances versus ${(n * (n - 1)) / 2} for brute force. The recurrence T(n) = 2T(n/2) + Θ(n) gives Θ(n log n).`,
      { best: [b.a, b.b], hl: { [b.a]: "done", [b.b]: "done" } });
    return { lines: R.lines, frames: thinAsks(R.frames, 3), c: R.c, best: Math.sqrt(b.d) };
  };

  /* ---- Convex hull by brute force (Levitin §3.3) ---- */
  REC.hullBrute = function (pts) {
    const n = pts.length;
    const R = Rec([
      "@start|ALGORITHM BruteForceConvexHull(P[1..n])",
      "    for each pair of points pi, pj (i < j) do",
      "@line|        a ← yj − yi; b ← xi − xj; c ← xi·yj − yi·xj   // line ax + by = c",
      "@test|        check the sign of ax + by − c for every other point",
      "@edge|        if no two points have opposite signs then",
      "@add|            add segment pi pj to the hull",
    ]);
    R.c.tests = 0; R.c.edges = 0;
    const edges = [], pairs = (n * (n - 1)) / 2;
    const askAt = new Set([Math.floor(pairs * 0.15), Math.floor(pairs * 0.45), Math.floor(pairs * 0.8)]);
    R.push("start", `Brute force: a segment is on the hull exactly when all other points lie on one side of the line through it. There are n(n−1)/2 = ${pairs} segments, and each test can look at up to n − 2 = ${n - 2} points: O(n³).`, { hull: [] });
    let p = 0;
    for (let i = 0; i < n - 1; i++) for (let j = i + 1; j < n; j++, p++) {
      const a = pts[i], b = pts[j];
      let pos = 0, neg = 0, t = 0;
      const hl = { [i]: "pivot", [j]: "pivot" };
      for (let k = 0; k < n; k++) {
        if (k === i || k === j) continue;
        R.c.tests++; t++;
        const o = orient(a, b, pts[k]);
        if (o > 0) { pos++; hl[k] = "active"; } else if (o < 0) { neg++; hl[k] = "compare"; }
        if (pos && neg) break;
      }
      const edge = !(pos && neg);
      if (askAt.has(p)) R.push("line", `Next segment: ${lab(i)}${lab(j)}. Draw the line through it.`, { lineAB: [i, j], hl: { [i]: "pivot", [j]: "pivot" }, hull: edges.slice(),
        ask: mkAsk(`Is ${lab(i)}${lab(j)} an edge of the convex hull?`, edge ? "yes" : "no", ["yes", "no"], edge ? `All other points are on the same side of the line through ${lab(i)} and ${lab(j)}.` : `There are points on both sides of the line, so the segment cuts through the set.`) });
      if (edge) { edges.push([i, j]); R.c.edges++; }
      R.push(edge ? ["test", "edge", "add"] : ["line", "test"], edge ? `${lab(i)}${lab(j)}: all ${t} other points are on one side of the line, so it is a hull edge.` : `${lab(i)}${lab(j)}: after ${t} test(s) we already see points on both sides (blue = left, yellow = right), so it is not a hull edge. Stop testing this pair early.`,
        { lineAB: [i, j], hl, hull: edges.slice(), segs: [{ a: i, b: j, cls: edge ? "best" : "cur" }] });
    }
    R.push(null, `Done: ${edges.length} hull edges found with ${R.c.tests} orientation tests (the no-early-exit bound is n(n−1)(n−2)/2 = ${(n * (n - 1) * (n - 2)) / 2}).`, { hull: edges.slice(), hl: Object.fromEntries(edges.flat().map((k) => [k, "done"])) });
    return { lines: R.lines, frames: thinAsks(R.frames, 3), c: R.c, edges };
  };

  /* ---- Quickhull (Levitin §5.5) ---- */
  REC.quickhull = function (pts) {
    const n = pts.length;
    const R = Rec([
      "@start|ALGORITHM Quickhull(S)",
      "@ends|    p1 ← leftmost point; pn ← rightmost point",
      "@split|    S1 ← points left of p1→pn; S2 ← points right of it",
      "@calls|    return UpperHull(p1, pn, S1) + UpperHull(pn, p1, S2)",
      "",
      "ALGORITHM UpperHull(a, b, S)     // S = points left of a→b",
      "@empty|    if S is empty then return the edge ab",
      "@pmax|    pmax ← point of S farthest from line ab",
      "@parts|    S11 ← points of S left of a→pmax; S12 ← left of pmax→b",
      "@inside|    // points inside triangle a pmax b are thrown away",
      "@rec|    return UpperHull(a, pmax, S11) + UpperHull(pmax, b, S12)",
    ]);
    R.c.tests = 0; R.c.depth = 0; R.c.edges = 0;
    const order = pts.map((_, i) => i).sort((a, b) => pts[a].x - pts[b].x || pts[a].y - pts[b].y);
    const p1 = order[0], pn = order[n - 1];
    const hull = [], gone = new Set();
    const base = () => { const hl = {}; gone.forEach((k) => (hl[k] = "dim")); hull.flat().forEach((k) => (hl[k] = "done")); return hl; };
    R.push(["start", "ends"], `Quickhull: the leftmost point ${lab(p1)} and the rightmost point ${lab(pn)} are surely on the hull.`, { hl: { [p1]: "pivot", [pn]: "pivot" }, hull: [] });
    const S1 = [], S2 = [];
    order.slice(1, n - 1).forEach((k) => { R.c.tests++; const o = orient(pts[p1], pts[pn], pts[k]); if (o > 0) S1.push(k); else if (o < 0) S2.push(k); else gone.add(k); });
    const hl0 = base(); S1.forEach((k) => (hl0[k] = "active")); S2.forEach((k) => (hl0[k] = "compare")); hl0[p1] = hl0[pn] = "pivot";
    R.push("split", `The line ${lab(p1)}→${lab(pn)} splits the rest: ${S1.length} point(s) above it (blue, left of the direction) and ${S2.length} below (yellow). ${n - 2} orientation tests so far.`, { hl: hl0, lineAB: [p1, pn], hull: [] });
    function upper(a, b, S, depth) {
      R.c.depth = Math.max(R.c.depth, depth);
      if (!S.length) {
        hull.push([a, b]); R.c.edges++;
        R.push("empty", `Nothing lies left of ${lab(a)}→${lab(b)}, so ${lab(a)}${lab(b)} is a hull edge.`, { hl: base(), hull: hull.slice(), segs: [{ a, b, cls: "best" }] });
        return;
      }
      let best = -1, pm = -1;
      S.forEach((k) => { R.c.tests++; const ar = orient(pts[a], pts[b], pts[k]); if (ar > best) { best = ar; pm = k; } });
      const hl = base(); S.forEach((k) => (hl[k] = "active")); hl[a] = hl[b] = "pivot";
      R.push("pmax", `Look at the ${S.length} point(s) left of ${lab(a)}→${lab(b)} and find the one farthest from that line (it forms the biggest triangle with ${lab(a)} and ${lab(b)}).`,
        { hl, lineAB: [a, b], hull: hull.slice(), ask: mkAsk(`Which point is farthest from the line ${lab(a)}${lab(b)}?`, lab(pm), S.map(lab), `${lab(pm)} gives the largest determinant |x1 y1 1; x2 y2 1; x3 y3 1|, which is twice the triangle's area and proportional to the distance from the line.`) });
      const S11 = [], S12 = [];
      S.forEach((k) => {
        if (k === pm) return;
        R.c.tests++;
        if (orient(pts[a], pts[pm], pts[k]) > 0) { S11.push(k); return; }
        R.c.tests++;
        if (orient(pts[pm], pts[b], pts[k]) > 0) S12.push(k); else gone.add(k);
      });
      const hl2 = base(); S11.forEach((k) => (hl2[k] = "active")); S12.forEach((k) => (hl2[k] = "compare")); hl2[a] = hl2[b] = "pivot"; hl2[pm] = "swap";
      const inside = S.length - 1 - S11.length - S12.length;
      R.push(["parts", "inside"], `pmax = ${lab(pm)} is a hull vertex. ${inside ? `${inside} point(s) inside the triangle ${lab(a)}${lab(pm)}${lab(b)} can never be on the hull (grey). ` : ""}Left of ${lab(a)}→${lab(pm)}: ${S11.length} point(s) (blue). Left of ${lab(pm)}→${lab(b)}: ${S12.length} (yellow).`,
        { hl: hl2, tri: [a, pm, b], hull: hull.slice() });
      R.push("rec", `Recurse on the two outer sides of the triangle: ${lab(a)}→${lab(pm)} and ${lab(pm)}→${lab(b)}.`, { hl: hl2, tri: [a, pm, b], hull: hull.slice() });
      upper(a, pm, S11, depth + 1);
      upper(pm, b, S12, depth + 1);
    }
    R.push("calls", `Build the upper hull from ${lab(p1)} to ${lab(pn)} using the blue points.`, { hl: hl0, lineAB: [p1, pn], hull: [] });
    upper(p1, pn, S1, 1);
    R.push("calls", `Upper hull done. Now the lower hull: the same routine on ${lab(pn)}→${lab(p1)}, where the yellow points are on the left.`, { hl: base(), lineAB: [pn, p1], hull: hull.slice() });
    upper(pn, p1, S2, 1);
    R.push(null, `Hull complete: ${hull.length} edges, ${R.c.tests} orientation tests. Brute force needs far more on the same points. Quickhull is Θ(n²) in the worst case (all points on a circle is bad), but close to linear on average for random points.`, { hull: hull.slice(), hl: base() });
    return { lines: R.lines, frames: thinAsks(R.frames, 3), c: R.c, edges: hull };
  };

  if (typeof module !== "undefined" && module.exports) module.exports = { REC, orient, d2 };
  if (typeof document === "undefined") return;

  /* ================= Part 2: browser UI ================= */
  const $ = (id) => document.getElementById(id);
  const E = Forge.el, S = Forge.svg, W = 760, H = 450;
  const COL = { compare: "var(--c-compare)", swap: "var(--c-swap)", done: "var(--c-done)", active: "var(--c-active)", pivot: "var(--c-pivot)", dim: "var(--c-dim)" };
  const X = (x) => 30 + x * 7, Y = (y) => H - 20 - y * 7;
  const MX = (sx) => (sx - 30) / 7, MY = (sy) => (H - 20 - sy) / 7;
  const INFO = {
    cpBrute: { name: "Closest pair · brute force", counters: { "squared distances": (f) => f.c.dist, "n(n−1)/2": () => (pts.length * (pts.length - 1)) / 2 },
      legend: [["compare", "pair being measured"], ["done", "closest pair"]], arena: ["closest-pair-brute"], lesson: "03-brute-force" },
    cpDC: { name: "Closest pair · divide & conquer", counters: { "squared distances": (f) => f.c.dist, "strip points (total)": (f) => f.c.strip, "recursion depth": (f) => f.c.depth },
      legend: [["active", "left half / point being checked"], ["compare", "right half / strip partner"], ["pivot", "point in the strip"], ["dim", "outside this subproblem"], ["done", "closest pair"]], arena: ["closest-pair-brute", "closest-pair-1d-presort"], lesson: "05-divide-and-conquer" },
    hullBrute: { name: "Convex hull · brute force", counters: { "orientation tests": (f) => f.c.tests, "hull edges": (f) => f.c.edges },
      legend: [["pivot", "segment endpoints"], ["active", "left of the line"], ["compare", "right of the line"], ["done", "hull"]], arena: ["convex-hull-brute"], lesson: "03-brute-force" },
    quickhull: { name: "Convex hull · Quickhull", counters: { "orientation tests": (f) => f.c.tests, "hull edges": (f) => f.c.edges, "recursion depth": (f) => f.c.depth },
      legend: [["pivot", "current line endpoints"], ["active", "left set (S1 / S11)"], ["compare", "S2 / S12"], ["swap", "pmax"], ["dim", "eliminated"], ["done", "hull"]], arena: ["convex-hull-brute"], lesson: "05-divide-and-conquer" },
  };
  const ORDER = ["cpBrute", "cpDC", "hullBrute", "quickhull"];
  let alg = "cpDC", pts = [];
  const stage = $("stage"), say = Forge.narrate($("say"));
  let code = null, ctr = null;
  const answered = new Set();
  const player = Forge.player($("player"), { frames: [], render });

  /** Points and labels grow a little on narrow screens so they stay tappable and readable. */
  function zoom() { const w = stage.clientWidth; return w ? Math.min(1.8, Math.max(1, 520 / w)) : 1; }
  function genRandom(n, shape) {
    const r = Forge.rng((Date.now() % 100000) + n * 7), out = [];
    const seen = new Set();
    let guard = 0;
    while (out.length < n && guard++ < 5000) {
      let x, y;
      if (shape === "circle") { const t = r() * 2 * Math.PI; x = 50 + 40 * Math.cos(t); y = 29 + 26 * Math.sin(t); }
      else if (shape === "cluster") { const c = [[25, 18], [70, 40], [55, 12]][Math.floor(r() * 3)]; x = c[0] + (r() - 0.5) * 22; y = c[1] + (r() - 0.5) * 16; }
      else { x = 4 + r() * 92; y = 3 + r() * 52; }
      x = Math.round(x * 2) / 2; y = Math.round(y * 2) / 2;
      const key = x + "," + y;
      if (seen.has(key) || x < 1 || x > 99 || y < 1 || y > 57) continue;
      seen.add(key); out.push({ x, y });
    }
    return out;
  }
  function setPoints(p) { pts = p.slice().sort((a, b) => a.x - b.x || a.y - b.y); $("nval").textContent = pts.length; load(); }

  function render(f, i) {
    stage.innerHTML = "";
    stage.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const g = S("g"); stage.appendChild(g);
    g.appendChild(S("rect", { x: 22, y: 12, width: W - 44, height: H - 24, rx: 8, fill: "none", stroke: "var(--line)" }));
    if (f.region) g.appendChild(S("rect", { x: X(f.region[0]) - 8, y: 14, width: X(f.region[1]) - X(f.region[0]) + 16, height: H - 28, rx: 6, fill: "var(--steel-soft)" }));
    if (f.band) g.appendChild(S("rect", { x: Math.max(22, X(f.band[0])), y: 14, width: Math.max(0, Math.min(W - 22, X(f.band[1])) - Math.max(22, X(f.band[0]))), height: H - 28, fill: "color-mix(in srgb, var(--c-pivot) 18%, transparent)", stroke: "var(--c-pivot)", "stroke-dasharray": "4 4" }));
    if (f.vline != null) { g.appendChild(S("line", { x1: X(f.vline), y1: 14, x2: X(f.vline), y2: H - 14, stroke: "var(--ember)", "stroke-width": 2, "stroke-dasharray": "8 5" })); g.appendChild(S("text", { x: X(f.vline) + 5, y: 28, "font-size": 12, "font-weight": 700, fill: "var(--ember)" }, `x = ${Math.round(f.vline * 100) / 100}`)); }
    if (f.box) { const p = pts[f.box.i]; g.appendChild(S("rect", { x: X(f.band ? f.band[0] : p.x - f.box.h), y: Y(p.y + f.box.h), width: X(f.band ? f.band[1] : p.x + f.box.h) - X(f.band ? f.band[0] : p.x - f.box.h), height: Y(p.y) - Y(p.y + f.box.h), fill: "none", stroke: "var(--c-active)", "stroke-width": 1.5 })); }
    if (f.tri) { const [a, b, c] = f.tri.map((k) => pts[k]); g.appendChild(S("path", { d: `M${X(a.x)} ${Y(a.y)} L${X(b.x)} ${Y(b.y)} L${X(c.x)} ${Y(c.y)} Z`, fill: "color-mix(in srgb, var(--c-swap) 14%, transparent)", stroke: "var(--c-swap)", "stroke-width": 1.5 })); }
    if (f.lineAB) {
      const a = pts[f.lineAB[0]], b = pts[f.lineAB[1]], dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
      const ex = (dx / L) * 200, ey = (dy / L) * 200;
      g.appendChild(S("line", { x1: X(a.x - ex), y1: Y(a.y - ey), x2: X(b.x + ex), y2: Y(b.y + ey), stroke: "var(--muted)", "stroke-dasharray": "6 5" }));
    }
    (f.hull || []).forEach(([a, b]) => g.appendChild(S("line", { x1: X(pts[a].x), y1: Y(pts[a].y), x2: X(pts[b].x), y2: Y(pts[b].y), stroke: "var(--c-done)", "stroke-width": 3.5, "stroke-linecap": "round" })));
    if (f.best && f.best[0] >= 0) { const a = pts[f.best[0]], b = pts[f.best[1]]; g.appendChild(S("line", { x1: X(a.x), y1: Y(a.y), x2: X(b.x), y2: Y(b.y), stroke: "var(--c-done)", "stroke-width": 4, "stroke-linecap": "round" })); }
    (f.segs || []).forEach((s) => { const a = pts[s.a], b = pts[s.b]; g.appendChild(S("line", { x1: X(a.x), y1: Y(a.y), x2: X(b.x), y2: Y(b.y), stroke: s.cls === "best" ? "var(--c-done)" : "var(--c-compare)", "stroke-width": 2.5, "stroke-dasharray": s.cls === "best" ? null : "5 3" })); });
    const small = pts.length > 26, k0 = zoom();
    pts.forEach((p, k) => {
      const st = (f.hl || {})[k];
      g.appendChild(S("circle", { cx: X(p.x), cy: Y(p.y), r: (st && st !== "dim" ? 7 : 5.5) * k0, fill: st ? COL[st] : "var(--ink-2)", stroke: "var(--bg-2)", "stroke-width": 1.5 }, S("title", null, `${"p" + (k + 1)} (${p.x}, ${p.y})`)));
      if (!small || (st && st !== "dim")) g.appendChild(S("text", { x: X(p.x) + 8 * k0, y: Y(p.y) - 7 * k0, "font-size": 11 * k0, fill: st === "dim" ? "var(--muted)" : "var(--ink-2)" }, "p" + (k + 1)));
    });
    code.highlight(f.line);
    const info = INFO[alg], vals = {};
    Object.keys(info.counters).forEach((k) => (vals[k] = info.counters[k](f)));
    ctr.set(vals);
    say.say(f.text);
    ask(f, i);
  }
  function ask(f, i) {
    if (!f.ask || answered.has(i) || !$("predictOn").checked) return;
    player.pause();
    const box = $("predictBox"); box.innerHTML = "";
    box.appendChild(E("div", { class: "ask-q" }, f.ask.q));
    box.appendChild(E("div", { class: "row" }, f.ask.opts.map((o, k) => E("button", { class: "btn sm", onclick: () => answer(i, k) }, o))));
    box.appendChild(E("div", { class: "small muted", style: { marginTop: "6px" } }, "Answer to continue, or just step forward to skip."));
  }
  function answer(i, k) {
    const f = player.frames[i]; if (!f || !f.ask) return;
    answered.add(i);
    const ok = k === f.ask.ans, sc = $("predictScore");
    sc.dataset.n = (+sc.dataset.n || 0) + 1; sc.dataset.ok = (+sc.dataset.ok || 0) + (ok ? 1 : 0);
    sc.textContent = `${sc.dataset.ok} / ${sc.dataset.n} right`;
    const box = $("predictBox"); box.innerHTML = "";
    box.appendChild(E("div", { class: "callout " + (ok ? "ok" : "bad") }, E("b", null, ok ? "Correct. " : `Not quite: the answer is ${f.ask.opts[f.ask.ans]}. `), f.ask.why));
    box.appendChild(E("div", { class: "small muted", style: { marginTop: "6px" } }, "Press ▶ or → to watch it happen."));
  }
  function summary() {
    const n = pts.length, body = $("summaryBody"); body.innerHTML = "";
    if (n < 3) return;
    const rows = [
      ["cpBrute", "squared distances", REC.cpBrute(pts).c.dist, `n(n−1)/2 = ${(n * (n - 1)) / 2}`],
      ["cpDC", "squared distances", REC.cpDC(pts).c.dist, "Θ(n log n)"],
      ["hullBrute", "orientation tests", REC.hullBrute(pts).c.tests, `≤ n(n−1)(n−2)/2 = ${(n * (n - 1) * (n - 2)) / 2}`],
      ["quickhull", "orientation tests", REC.quickhull(pts).c.tests, "Θ(n log n) avg, Θ(n²) worst"],
    ];
    rows.forEach(([k, what, v, bound]) => body.appendChild(E("tr", { class: k === alg ? "cur" : "" },
      E("td", { style: { textAlign: "left" } }, E("button", { class: "linkish", onclick: () => { alg = k; load(); } }, INFO[k].name)), E("td", null, what), E("td", null, String(v)), E("td", null, bound))));
  }
  function load() {
    const info = INFO[alg];
    document.querySelectorAll("#algs button").forEach((b) => { b.classList.toggle("on", b.dataset.k === alg); b.setAttribute("aria-pressed", String(b.dataset.k === alg)); });
    const lg = $("legend"); lg.innerHTML = "";
    info.legend.forEach(([s, t]) => lg.appendChild(E("span", null, E("i", { style: { background: COL[s] } }), t)));
    const pr = $("practice"); pr.innerHTML = "";
    pr.appendChild(E("a", { href: `https://github.com/Normansrule/algorithm-forge/blob/main/lessons/${info.lesson}/README.md` }, "📘 Lesson"));
    info.arena.forEach((id) => pr.appendChild(E("a", { href: `../arena/problem.html?id=${id}` }, "⚔️ " + id)));
    answered.clear();
    $("predictBox").textContent = "When a question appears here, answer it before stepping on.";
    $("ctrHost").innerHTML = "";
    const init = {}; Object.keys(info.counters).forEach((k) => (init[k] = 0));
    ctr = Forge.counters($("ctrHost"), init);
    if (pts.length < 3) {
      $("codeHost").innerHTML = ""; code = Forge.code($("codeHost"), ["// add at least 3 points"]);
      player.load([{ line: null, text: "Click the stage to add points (at least 3), or press Random.", c: { dist: 0, tests: 0, edges: 0, depth: 0, strip: 0 } }]);
      summary();
      return;
    }
    const res = REC[alg](pts);
    $("codeHost").innerHTML = ""; code = Forge.code($("codeHost"), res.lines);
    summary();
    player.load(res.frames);
  }
  const algs = $("algs");
  ORDER.forEach((k) => algs.appendChild(E("button", { class: "btn sm", "data-k": k, onclick: () => { alg = k; load(); } }, INFO[k].name)));
  $("n").addEventListener("input", () => { $("nval").textContent = $("n").value; });
  $("n").addEventListener("change", () => setPoints(genRandom(+$("n").value, "uniform")));
  $("rand").addEventListener("click", () => setPoints(genRandom(+$("n").value, "uniform")));
  $("circle").addEventListener("click", () => setPoints(genRandom(+$("n").value, "circle")));
  $("cluster").addEventListener("click", () => setPoints(genRandom(+$("n").value, "cluster")));
  $("clear").addEventListener("click", () => setPoints([]));
  stage.addEventListener("click", (e) => {
    const m = stage.getScreenCTM();
    if (!m) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    const hit = pts.findIndex((q) => Math.hypot(X(q.x) - p.x, Y(q.y) - p.y) < 11 * zoom());
    if (hit >= 0) { pts.splice(hit, 1); $("msg").textContent = "Point removed."; setPoints(pts); return; }
    const x = Math.round(MX(p.x) * 2) / 2, y = Math.round(MY(p.y) * 2) / 2;
    if (x < 0 || x > 100 || y < 0 || y > 58) return;
    if (pts.length >= 40) { $("msg").textContent = "40 points is the maximum here."; return; }
    if (pts.some((q) => q.x === x && q.y === y)) return;
    $("msg").textContent = "";
    setPoints(pts.concat([{ x, y }]));
  });
  const start = new URLSearchParams(location.search).get("alg");
  if (INFO[start]) alg = start;
  setPoints(genRandom(12, "uniform"));
})();
