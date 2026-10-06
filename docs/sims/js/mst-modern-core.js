/* =====================================================================
   Algorithm Forge — Modern MST core (docs/sims/mst-modern.html)
   Kruskal, Prim (lazy, binary heap), Borůvka (with contraction) and
   Filter-Kruskal (Osipov, Sanders & Singler 2009) on one weighted graph.
   Ties are broken by edge index, so every algorithm builds the same tree.
   Each recorder returns {lines, frames, result}. Also loaded by Node.
   ===================================================================== */
(function (root) {
  "use strict";

  /* ---------- helpers ---------- */
  function parseSpec(spec) {
    const L = {}, lines = [];
    spec.forEach((s) => { const m = /^@(\w+)\|(.*)$/.exec(s); if (m) { L[m[1]] = lines.length; lines.push(m[2]); } else lines.push(s); });
    return { L, lines };
  }
  function Rec(spec, maxFrames) {
    const P = parseSpec(spec), frames = [], c = {};
    const one = (k) => { if (k == null || typeof k === "number") return k; if (!(k in P.L)) throw new Error("no line " + k); return P.L[k]; };
    return {
      lines: P.lines, frames, c,
      push(line, text, d) {
        if (frames.length >= (maxFrames || 4000)) return null;
        const f = Object.assign({ line: Array.isArray(line) ? line.map(one) : one(line), text, c: Object.assign({}, c) }, d || {});
        frames.push(f);
        return f;
      },
    };
  }
  function rng(seed) {
    let a = (seed >>> 0) || 0x9e3779b9;
    return function () { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function hashStr(s) { let h = 2166136261; for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mkAsk(q, correct, pool, why) {
    const c = String(correct);
    const uniq = [...new Set(pool.map(String))].filter((x) => x !== c);
    if (!uniq.length) return null;
    uniq.sort((a, b) => hashStr(a + q) - hashStr(b + q));
    const opts = [c, ...uniq.slice(0, 3)];
    if (opts.every((x) => /^-?\d+$/.test(x))) opts.sort((a, b) => a - b);
    return { q, opts, ans: opts.indexOf(c), why };
  }
  function keepAsks(frames, max) {
    const idx = frames.map((f, i) => (f.ask ? i : -1)).filter((i) => i >= 0);
    if (idx.length > max) {
      const keep = new Set();
      for (let t = 0; t < max; t++) keep.add(idx[Math.round((t * (idx.length - 1)) / Math.max(1, max - 1))]);
      frames.forEach((f, i) => { if (!keep.has(i)) delete f.ask; });
    }
    return frames;
  }
  /** Edge order: weight, then index (a strict total order). */
  const less = (E) => (a, b) => (E[a].w - E[b].w) || (a - b);
  function msort(a, cmp, cnt) {
    if (a.length < 2) return a.slice();
    const mid = a.length >> 1, l = msort(a.slice(0, mid), cmp, cnt), r = msort(a.slice(mid), cmp, cnt), out = [];
    let i = 0, j = 0;
    while (i < l.length && j < r.length) { cnt.n++; if (cmp(r[j], l[i]) < 0) out.push(r[j++]); else out.push(l[i++]); }
    while (i < l.length) out.push(l[i++]);
    while (j < r.length) out.push(r[j++]);
    return out;
  }
  function UF(n, cnt) {
    const p = [...Array(n).keys()], sz = Array(n).fill(1);
    const find = (x) => { cnt.find++; let r = x; while (p[r] !== r) r = p[r]; while (p[x] !== r) { const nx = p[x]; p[x] = r; x = nx; } return r; };
    const peek = (x) => { while (p[x] !== x) x = p[x]; return x; };   // uncounted, for drawing
    const union = (a, b) => { a = find(a); b = find(b); if (a === b) return false; if (sz[a] < sz[b]) [a, b] = [b, a]; p[b] = a; sz[a] += sz[b]; return true; };
    return { find, union, peek, comps: () => [...Array(n).keys()].map(peek) };
  }
  function componentsOf(n, E) {
    const u = UF(n, { find: 0 });
    E.forEach((e) => u.union(e.u, e.v));
    return new Set(u.comps()).size;
  }
  const wsum = (E, ids) => ids.reduce((s, id) => s + E[id].w, 0);

  /* ---------- graph generation and parsing ---------- */
  /** Random geometric graph: each vertex joins its deg (default 3) nearest neighbours; then components are linked. */
  function randomGraph(n, seed, weights, W, H, deg) {
    W = W || 760; H = H || 460;
    const r = rng(seed), pos = [], pad = 34;
    const minD = Math.min(70, Math.sqrt((W * H) / (n * 3.2)));
    for (let i = 0; i < n; i++) {
      let best = null, bd = -1;
      for (let t = 0; t < 40; t++) {
        const p = [pad + r() * (W - 2 * pad), pad + r() * (H - 2 * pad)];
        const d = pos.length ? Math.min(...pos.map((q) => Math.hypot(p[0] - q[0], p[1] - q[1]))) : 1e9;
        if (d >= minD) { best = p; break; }
        if (d > bd) { bd = d; best = p; }
      }
      pos.push(best.map(Math.round));
    }
    const dist = (a, b) => Math.hypot(pos[a][0] - pos[b][0], pos[a][1] - pos[b][1]);
    const key = new Set(), E = [];
    const add = (a, b) => { const k = a < b ? a + "-" + b : b + "-" + a; if (a === b || key.has(k)) return; key.add(k); E.push({ u: Math.min(a, b), v: Math.max(a, b) }); };
    for (let a = 0; a < n; a++) {
      const near = [...Array(n).keys()].filter((b) => b !== a).sort((x, y) => dist(a, x) - dist(a, y)).slice(0, Math.min(deg || 3, n - 1));
      near.forEach((b) => add(a, b));
    }
    // connect components by their closest pair
    for (;;) {
      const u = UF(n, { find: 0 }); E.forEach((e) => u.union(e.u, e.v));
      const c = u.comps(); if (new Set(c).size <= 1) break;
      let best = null;
      for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) if (c[a] === c[0] && c[b] !== c[0] && (!best || dist(a, b) < best[2])) best = [a, b, dist(a, b)];
      add(best[0], best[1]);
    }
    // shuffle edge order so indices are not sorted by anything
    for (let i = E.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [E[i], E[j]] = [E[j], E[i]]; }
    E.forEach((e) => { e.w = weights === "ties" ? 1 + Math.floor(r() * 9) : Math.max(1, Math.round(dist(e.u, e.v) / 8)); });
    return { names: [...Array(n).keys()].map(String), pos, edges: E };
  }
  /** Parse "a-b 3, b-c 1" (names are letters/digits). Keeps known positions, places new vertices on a circle. */
  function parseEdges(str, prev, W, H) {
    W = W || 760; H = H || 460;
    const names = [], idx = {}, E = [], errs = [];
    const id = (nm) => { if (!(nm in idx)) { idx[nm] = names.length; names.push(nm); } return idx[nm]; };
    String(str).split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean).forEach((tok) => {
      const m = /^([A-Za-z0-9]+)\s*-\s*([A-Za-z0-9]+)\s+(\d+)$/.exec(tok);
      if (!m) { errs.push(`"${tok}"`); return; }
      if (m[1] === m[2]) { errs.push(`"${tok}" (a loop)`); return; }
      const a = id(m[1]), b = id(m[2]);
      if (E.some((e) => (e.u === a && e.v === b) || (e.u === b && e.v === a))) { errs.push(`"${tok}" (repeated)`); return; }
      E.push({ u: a, v: b, w: Math.max(1, Math.min(999, +m[3])) });
    });
    const pos = names.map((nm, i) => {
      if (prev && prev.names) { const j = prev.names.indexOf(nm); if (j >= 0) return prev.pos[j].slice(); }
      const ang = (2 * Math.PI * i) / Math.max(1, names.length) - Math.PI / 2;
      return [Math.round(W / 2 + (W / 2 - 50) * Math.cos(ang)), Math.round(H / 2 + (H / 2 - 40) * Math.sin(ang))];
    });
    return { g: { names, pos, edges: E }, errs };
  }
  function edgesToText(g) { return g.edges.map((e) => `${g.names[e.u]}-${g.names[e.v]} ${e.w}`).join(", "); }

  /* ---------- pseudocode ---------- */
  const SPEC = {
    kruskal: [
      "@h|ALGORITHM Kruskal(G = ⟨V, E⟩)",
      "@sort|    sort E by (weight, index)",
      "@init|    each vertex its own set; T ← ∅",
      "@for|    for each (u, v) in sorted E do",
      "@find|        if Find(u) ≠ Find(v) then",
      "@add|            T ← T ∪ {(u, v)}; Union(u, v)",
      "@full|        if |T| = |V| − 1 then break",
      "@ret|    return T",
    ],
    prim: [
      "@h|ALGORITHM Prim(G = ⟨V, E⟩)   // lazy",
      "@start|    put a vertex s in the tree",
      "@pushs|    push the edges of s into heap H",
      "@while|    while H is not empty do",
      "@pop|        (u, v) ← DeleteMin(H)",
      "@stale|        if v in tree then continue",
      "@add|        add v and (u, v) to the tree",
      "@push|        push v's edges to non-tree",
      "@ret|    return the tree edges",
    ],
    boruvka: [
      "@h|ALGORITHM Boruvka(G = ⟨V, E⟩)",
      "@init|    T ← ∅; each vertex alone",
      "@while|    while edges leave components do",
      "@par|        for each comp C in parallel do",
      "@pick|            c[C] ← min edge out of C",
      "@add|        T ← T ∪ {every c[C]}",
      "@merge|        merge the joined components",
      "@contract|        contract the merged parts",
      "@ret|    return T",
    ],
    filter: [
      "@h|ALGORITHM FilterKruskal(E, T, P)",
      "@base|    if |E| ≤ threshold then",
      "@kr|        Kruskal(E, T, P); return",
      "@pivot|    p ← random pivot edge of E",
      "@part|    E≤ ← {e ∈ E : e ≤ p}",
      "@part2|    E> ← {e ∈ E : e > p}",
      "@left|    FilterKruskal(E≤, T, P)",
      "@filter|    E> ← Filter(E>, P)",
      "@right|    FilterKruskal(E>, T, P)",
      "",
      "ALGORITHM Filter(E, P)",
      "    return {(u, v) ∈ E : Find(u) ≠ Find(v)}",
    ],
  };

  /* ---------- Kruskal ---------- */
  function recKruskal(g, opts) {
    opts = opts || {};
    const n = g.names.length, E = g.edges, m = E.length, R = Rec(SPEC.kruskal, opts.maxFrames);
    const cnt = { find: 0 }, sc = { n: 0 }, uf = UF(n, cnt), T = [];
    const goal = n - componentsOf(n, E);
    R.c.sorted = 0; R.c.sortCmp = 0; R.c.find = 0; R.c.examined = 0;
    const order = msort([...Array(m).keys()], less(E), sc);
    const st = {};
    const fr = (extra) => Object.assign({ tree: T.slice(), comp: uf.comps(), strip: { order, st: Object.assign({}, st) } }, extra || {});
    R.push("h", `Kruskal looks at edges from cheapest to most expensive and keeps an edge unless it would close a cycle. ${n} vertices, ${m} edges; a spanning tree needs ${goal} of them.`, fr());
    R.c.sorted = m; R.c.sortCmp = sc.n;
    R.push(["sort", "init"], `Sort all ${m} edges by weight (${sc.n} comparisons with merge sort; ties go to the lower edge index, so the order is strict and the tree is unique). The strip below shows them in sorted order. Every vertex starts as its own set.`, fr());
    let asks = 0;
    for (let k = 0; k < m && T.length < goal; k++) {
      const id = order[k], e = E[id];
      R.c.examined++;
      const ru = uf.peek(e.u), rv = uf.peek(e.v), ok = ru !== rv;
      let ask = null;
      if (asks < 8 && k >= 2) { asks++; ask = { q: `Edge ${g.names[e.u]}–${g.names[e.v]} (weight ${e.w}) is next. Will Kruskal keep it?`, opts: ["Keep it", "Reject it (cycle)"], ans: ok ? 0 : 1, why: ok ? `${g.names[e.u]} and ${g.names[e.v]} are in different sets (different colours), so the edge joins two trees without a cycle.` : `${g.names[e.u]} and ${g.names[e.v]} are already in the same set: the tree already connects them, so this edge would close a cycle.` }; }
      st[id] = "active";
      R.push(["for"], `Next in sorted order: edge #${id} ${g.names[e.u]}–${g.names[e.v]}, weight ${e.w}.`, fr({ est: { [id]: "active" }, ask }));
      uf.find(e.u); uf.find(e.v); R.c.find = cnt.find;
      if (ok) {
        uf.union(e.u, e.v); R.c.find = cnt.find; T.push(id); st[id] = "done";
        R.push(["find", "add"], `Find(${g.names[e.u]}) ≠ Find(${g.names[e.v]}): different trees, so keep it and union the two sets. ${T.length} of ${goal} tree edges.`, fr({ est: { [id]: "done" } }));
      } else {
        st[id] = "dim";
        R.push("find", `Find(${g.names[e.u]}) = Find(${g.names[e.v]}): both ends are already connected, so this edge would close a cycle. Skip it.`, fr({ est: { [id]: "swap" } }));
      }
    }
    R.push(["full", "ret"], `Done: ${T.length} edges, total weight ${wsum(E, T)}. Kruskal examined ${R.c.examined} of ${m} edges but had to sort all ${m} first: the sort, O(m log m), dominates.`, fr({ final: true }));
    return { lines: R.lines, frames: keepAsks(R.frames, 3), result: { tree: T.slice().sort((a, b) => a - b), weight: wsum(E, T), sortCmp: sc.n, sorted: m, finds: cnt.find, examined: R.c.examined } };
  }

  /* ---------- Prim (lazy) ---------- */
  function recPrim(g, opts) {
    opts = opts || {};
    const n = g.names.length, E = g.edges, R = Rec(SPEC.prim, opts.maxFrames), lt = less(E);
    const adj = Array.from({ length: n }, () => []);
    E.forEach((e, id) => { adj[e.u].push(id); adj[e.v].push(id); });
    const inT = Array(n).fill(false), T = [], H = [];
    R.c.push = 0; R.c.pop = 0; R.c.stale = 0;
    const up = (i) => { while (i > 0) { const p = (i - 1) >> 1; if (lt(H[i].id, H[p].id) < 0) { [H[i], H[p]] = [H[p], H[i]]; i = p; } else break; } };
    const down = (i) => { for (;;) { const l = 2 * i + 1, r = l + 1; let s = i; if (l < H.length && lt(H[l].id, H[s].id) < 0) s = l; if (r < H.length && lt(H[r].id, H[s].id) < 0) s = r; if (s === i) break; [H[i], H[s]] = [H[s], H[i]]; i = s; } };
    const push = (id, to) => { H.push({ id, to }); up(H.length - 1); R.c.push++; };
    const pop = () => { const top = H[0], last = H.pop(); if (H.length) { H[0] = last; down(0); } R.c.pop++; return top; };
    const fr = (extra) => Object.assign({ tree: T.slice(), inT: inT.slice(), heap: H.map((h) => h.id) }, extra || {});
    R.push("h", `Prim grows one tree. At each step it takes the cheapest edge that leaves the tree, found with a min-heap of candidate edges (this "lazy" version leaves stale edges in the heap and skips them when they surface).`, fr());
    let asks = 0;
    for (let s = 0; s < n; s++) {
      if (inT[s]) continue;
      inT[s] = true;
      R.push("start", s === 0 ? `Start the tree at vertex ${g.names[s]}.` : `The graph is disconnected: start a new tree at ${g.names[s]} (the result is a spanning forest).`, fr({ cur: s }));
      adj[s].forEach((id) => { const e = E[id], to = e.u === s ? e.v : e.u; if (!inT[to]) push(id, to); });
      R.push("pushs", `Push the ${adj[s].length} edge${adj[s].length === 1 ? "" : "s"} of ${g.names[s]} into the heap (yellow).`, fr({ cur: s }));
      while (H.length) {
        // predict: which edge is next (ignoring stale)?
        let ask = null;
        const live = H.filter((h) => !inT[h.to]).map((h) => h.id).sort(lt);
        if (asks < 6 && live.length >= 3 && R.c.pop > 1 && R.c.pop % 3 === 0) {
          asks++;
          const nm = (id) => `${g.names[E[id].u]}–${g.names[E[id].v]} (${E[id].w})`;
          ask = { q: "Which edge will Prim add next?", opts: live.slice(0, 4).map(nm), ans: 0, why: `It is the cheapest edge with exactly one end in the tree; ties go to the lower edge index.` };
          const sh = ask.opts.map((o, k) => [o, k]).sort((a, b) => hashStr(a[0]) - hashStr(b[0]));
          ask.opts = sh.map((x) => x[0]); ask.ans = sh.findIndex((x) => x[1] === 0);
          R.push("while", `${H.length} edge${H.length === 1 ? "" : "s"} in the heap.`, fr({ ask }));
        }
        const top = pop(), e = E[top.id];
        if (inT[top.to]) {
          R.c.stale++;
          R.push(["pop", "stale"], `DeleteMin gives ${g.names[e.u]}–${g.names[e.v]} (${e.w}), but both ends are already in the tree: a stale entry. Skip it.`, fr({ est: { [top.id]: "swap" } }));
          continue;
        }
        inT[top.to] = true; T.push(top.id);
        R.push(["pop", "add"], `DeleteMin gives ${g.names[e.u]}–${g.names[e.v]} (weight ${e.w}): the cheapest edge leaving the tree. Add it and vertex ${g.names[top.to]}. ${T.length} tree edges.`, fr({ est: { [top.id]: "active" }, cur: top.to }));
        let k = 0;
        adj[top.to].forEach((id) => { const f = E[id], to = f.u === top.to ? f.v : f.u; if (!inT[to]) { push(id, to); k++; } });
        if (k) R.push("push", `Push ${k} edge${k === 1 ? "" : "s"} from ${g.names[top.to]} to vertices outside the tree. Heap size ${H.length}.`, fr({ cur: top.to }));
      }
    }
    R.push("ret", `Done: ${T.length} edges, total weight ${wsum(E, T)}. ${R.c.push} pushes and ${R.c.pop} pops (${R.c.stale} stale), each O(log m): O(m log n) overall.`, fr({ final: true }));
    return { lines: R.lines, frames: keepAsks(R.frames, 3), result: { tree: T.slice().sort((a, b) => a - b), weight: wsum(E, T), pushes: R.c.push, pops: R.c.pop, stale: R.c.stale } };
  }

  /* ---------- Borůvka ---------- */
  function recBoruvka(g, opts) {
    opts = opts || {};
    const n = g.names.length, E = g.edges, R = Rec(SPEC.boruvka, opts.maxFrames), lt = less(E);
    const cnt = { find: 0 }, uf = UF(n, cnt), T = [];
    let live = E.map((_, id) => id);
    R.c.round = 0; R.c.comps = n; R.c.insp = 0;
    const bound = Math.ceil(Math.log2(Math.max(2, n)));
    const fr = (extra) => Object.assign({ tree: T.slice(), comp: uf.comps(), live: live.slice() }, extra || {});
    R.push(["h", "init"], `Borůvka (1926) works in rounds. In each round <b>every</b> component picks the cheapest edge leaving it, all at the same time, and all picks are added together. Start: ${n} components, one per vertex.`, fr());
    const contract = () => {
      const comp = uf.comps(), groups = {};
      comp.forEach((c, v) => { (groups[c] = groups[c] || []).push(v); });
      const best = {};
      let inner = 0;
      E.forEach((e, id) => {
        const a = comp[e.u], b = comp[e.v];
        if (a === b) { return; }
        const k = a < b ? a + "-" + b : b + "-" + a;
        if (best[k] == null || lt(id, best[k]) < 0) best[k] = id;
      });
      const keep = Object.values(best).sort((a, b) => a - b);
      inner = live.filter((id) => comp[E[id].u] === comp[E[id].v]).length;
      const parallel = live.length - inner - keep.length;
      return { groups: Object.keys(groups).map((c) => ({ rep: +c, members: groups[c] })), keep, inner, parallel };
    };
    let asked = 0;
    while (true) {
      const comp = uf.comps();
      const cheap = {};
      live.forEach((id) => {
        const e = E[id], a = comp[e.u], b = comp[e.v];
        if (a === b) return;
        if (cheap[a] == null || lt(id, cheap[a]) < 0) cheap[a] = id;
        if (cheap[b] == null || lt(id, cheap[b]) < 0) cheap[b] = id;
      });
      R.c.insp += live.length;
      const comps = Object.keys(cheap).map(Number);
      if (!comps.length) break;
      R.c.round++;
      const picks = [...new Set(comps.map((c) => cheap[c]))];
      // simulate merge to know the result for the predict question
      const u2 = UF(n, { find: 0 }); comp.forEach((c, v) => u2.union(v, c)); picks.forEach((id) => u2.union(E[id].u, E[id].v));
      const after = new Set(u2.comps()).size, before = new Set(comp).size;
      const ask = asked < 3 ? (asked++, mkAsk(`Round ${R.c.round} starts with ${before} components. Each picks its cheapest outgoing edge. How many components will be left after the merge?`, after, [Math.ceil(before / 2), Math.floor(before / 2), after + 1, Math.max(1, after - 1), before - 1, 1].filter((x) => x >= 1 && x < before), `Each of the ${comps.length} components with an outgoing edge merges with at least one other, so at most ${before - comps.length + Math.floor(comps.length / 2)} can remain; here ${picks.length} distinct edges are picked and ${after} component${after === 1 ? "" : "s"} remain.`)) : null;
      R.push(["while", "par"], `Round ${R.c.round}: ${before} components. Each one scans the edges that leave it (${live.length} edges in the contracted graph) for its lightest. These scans are independent, so they can all run in parallel.`, fr({ ask, round: R.c.round }));
      const arrows = comps.map((c) => ({ comp: c, id: cheap[c], from: E[cheap[c]].u !== undefined && comp[E[cheap[c]].u] === c ? E[cheap[c]].u : E[cheap[c]].v }));
      const est = {}; picks.forEach((id) => (est[id] = "active"));
      const dup = comps.length - picks.length;
      R.push("pick", `All ${comps.length} components choose at once (blue edges, arrows point from the choosing component). ${dup > 0 ? `${dup} edge${dup === 1 ? " was" : "s were"} chosen by both of its components, so only ${picks.length} distinct edges are added.` : ""} Tie-breaking by edge index matters here: with equal weights and no rule, three components could pick edges that close a cycle.`, fr({ est, arrows, round: R.c.round }));
      picks.forEach((id) => { if (uf.union(E[id].u, E[id].v)) T.push(id); });
      R.c.comps = after;
      const est2 = {}; picks.forEach((id) => (est2[id] = "done"));
      R.push(["add", "merge"], `Add the ${picks.length} picked edges and merge: ${before} → ${after} component${after === 1 ? "" : "s"} (colours). ${T.length} tree edges so far. ${before - comps.length ? `(${before - comps.length} finished piece${before - comps.length === 1 ? " has" : "s have"} no outgoing edge: the graph is disconnected.) ` : ""}Every component with an outgoing edge merged with at least one neighbour, so their number at least halved.`, fr({ est: est2, round: R.c.round }));
      const ct = contract();
      live = ct.keep;
      if (after > 1 || ct.keep.length) {
        R.push("contract", `Contract each component to a single super-vertex. ${ct.inner} edge${ct.inner === 1 ? " is" : "s are"} now inside a component (dropped as loops) and ${ct.parallel} parallel edge${ct.parallel === 1 ? " was" : "s were"} dropped because a lighter edge joins the same pair. The next round works on ${after} vertices and ${ct.keep.length} edges.`, fr({ contract: ct, round: R.c.round }));
      }
    }
    R.push("ret", `Done after ${R.c.round} round${R.c.round === 1 ? "" : "s"} (at most ⌈log₂ ${n}⌉ = ${bound}): ${T.length} edges, total weight ${wsum(E, T)}. Each round scans the remaining edges once, so the work is O(m log n), but each round is highly parallel.`, fr({ final: true }));
    return { lines: R.lines, frames: keepAsks(R.frames, 3), result: { tree: T.slice().sort((a, b) => a - b), weight: wsum(E, T), rounds: R.c.round, inspections: R.c.insp, bound } };
  }

  /* ---------- Filter-Kruskal ---------- */
  function recFilter(g, opts) {
    opts = opts || {};
    const n = g.names.length, E = g.edges, m = E.length, R = Rec(SPEC.filter, opts.maxFrames), lt = less(E);
    const threshold = Math.max(1, opts.threshold || 8), r = rng((opts.seed || 1) * 2654435761);
    const cnt = { find: 0 }, uf = UF(n, cnt), T = [], arr = [...Array(m).keys()], st = {};
    const sc = { n: 0 };
    R.c.sorted = 0; R.c.saved = 0; R.c.cmp = 0; R.c.filtered = 0; R.c.find = 0; R.c.depth = 0;
    const fr = (extra) => Object.assign({ tree: T.slice(), comp: uf.comps(), strip: { order: arr.slice(), st: Object.assign({}, st) } }, extra || {});
    R.push("h", `Filter-Kruskal (Osipov, Sanders and Singler, 2009) avoids sorting edges that cannot matter. Like quicksort it splits the edges around a pivot; it solves the light half first, then <b>filters</b> the heavy half, throwing out edges whose ends are already connected, before it ever sorts them. Base case: at most ${threshold} edges → plain Kruskal.`, fr({ seg: [0, m] }));
    let asks = 0;
    const solve = (lo, hi, depth) => {
      const size = hi - lo;
      if (size === 0) return;
      R.c.depth = Math.max(R.c.depth, depth);
      if (size <= threshold) {
        const seg = arr.slice(lo, hi);
        const before = sc.n;
        const sorted = msort(seg, lt, sc);
        for (let k = 0; k < size; k++) { arr[lo + k] = sorted[k]; st[sorted[k]] = "sorted"; }
        R.c.sorted += size; R.c.cmp += sc.n - before;
        R.push(["base", "kr"], `${size} edge${size === 1 ? "" : "s"} (≤ threshold ${threshold}): sort them (${sc.n - before} comparisons) and run Kruskal on them with the shared union-find.`, fr({ seg: [lo, hi] }));
        for (let k = 0; k < size; k++) {
          const id = sorted[k], e = E[id];
          const ok = uf.find(e.u) !== uf.find(e.v); R.c.find = cnt.find;
          if (ok) { uf.union(e.u, e.v); R.c.find = cnt.find; T.push(id); st[id] = "done"; }
          else st[id] = "dim";
          R.push("kr", ok ? `Edge ${g.names[e.u]}–${g.names[e.v]} (${e.w}) joins two trees: keep it. ${T.length} tree edges.` : `Edge ${g.names[e.u]}–${g.names[e.v]} (${e.w}) would close a cycle: skip.`, fr({ seg: [lo, hi], est: { [id]: ok ? "done" : "swap" } }));
        }
        return;
      }
      const pid = arr[lo + Math.floor(r() * size)];
      st[pid] = "pivot";
      R.push("pivot", `${size} edges is above the threshold. Pick a random pivot: edge ${g.names[E[pid].u]}–${g.names[E[pid].v]} (weight ${E[pid].w}, #${pid}).`, fr({ seg: [lo, hi], est: { [pid]: "pivot" } }));
      const le = [], gt = [];
      for (let k = lo; k < hi; k++) { const id = arr[k]; if (id === pid) { le.push(id); continue; } R.c.cmp++; (lt(id, pid) <= 0 ? le : gt).push(id); }
      // pivot last in E≤ is fine; keep pivot at the end of E≤ for display
      const le2 = le.filter((x) => x !== pid).concat([pid]);
      le2.concat(gt).forEach((id, k) => { arr[lo + k] = id; });
      le2.forEach((id) => { if (id !== pid) st[id] = "le"; });
      gt.forEach((id) => (st[id] = "gt"));
      st[pid] = "le";
      R.push(["part", "part2"], `Partition: ${le2.length} edges are not heavier than the pivot (E≤, blue) and ${gt.length} are heavier (E>, purple). ${size - 1} comparisons, no sorting yet.`, fr({ seg: [lo, hi], split: lo + le2.length }));
      const mid = lo + le2.length;
      R.push("left", `Recurse on the light part E≤ first (${le2.length} edges). After it, the union-find knows which vertices the light edges already connect.`, fr({ seg: [lo, mid] }));
      solve(lo, mid, depth + 1);
      // filter
      const segGt = arr.slice(mid, hi);
      const keep = [], drop = [];
      segGt.forEach((id) => { const e = E[id]; (uf.find(e.u) !== uf.find(e.v) ? keep : drop).push(id); });
      R.c.find = cnt.find;
      let ask = null;
      if (asks < 3 && segGt.length >= 2) { asks++; ask = mkAsk(`Now filter E> (${segGt.length} edges): how many of them have both ends already in the same tree, and can be thrown away unsorted?`, drop.length, [0, 1, segGt.length, Math.floor(segGt.length / 2), drop.length + 1, Math.max(0, drop.length - 1), drop.length + 2].filter((x) => x >= 0 && x <= segGt.length), `Look at the colours: an edge whose two ends share a colour lies inside one tree. ${drop.length} of the ${segGt.length} heavy edges do, so only ${keep.length} survive.`); }
      R.push("filter", `Filter E>: ask Find for both ends of each of the ${segGt.length} heavy edges.`, fr({ seg: [mid, hi], ask, est: Object.fromEntries(segGt.map((id) => [id, "pivot"])) }));
      keep.concat(drop).forEach((id, k) => { arr[mid + k] = id; });
      drop.forEach((id) => (st[id] = "filt"));
      R.c.filtered += drop.length;
      R.push("filter", `Filter dropped ${drop.length} of ${segGt.length} heavy edge${segGt.length === 1 ? "" : "s"} (grey) whose ends are already connected: they would have been rejected by Kruskal anyway, and now they will never be sorted. ${keep.length} remain.`, fr({ seg: [mid, mid + keep.length], est: Object.fromEntries(drop.map((id) => [id, "dim"])) }));
      if (keep.length) R.push("right", `Recurse on the ${keep.length} surviving heavy edge${keep.length === 1 ? "" : "s"}.`, fr({ seg: [mid, mid + keep.length] }));
      solve(mid, mid + keep.length, depth + 1);
    };
    solve(0, m, 0);
    R.c.saved = m - R.c.sorted;
    // Kruskal comparison count for reference
    const kc = { n: 0 }; msort([...Array(m).keys()], lt, kc);
    R.push("h", `Done: ${T.length} edges, total weight ${wsum(E, T)}. Only ${R.c.sorted} of ${m} edges were ever sorted, so <b>${R.c.saved} sorted edges saved</b>. Comparisons: ${R.c.cmp} (partitioning + base-case sorts) versus ${kc.n} for Kruskal's full sort. ${R.c.cmp > kc.n ? "On a sparse graph like this one the partitioning can cost more than it saves; the payoff grows with the density m/n. " : ""}With random weights the expected work is O(m + n log n · log(m/n)) (the authors' bound), which is O(m), linear, once the graph is dense enough.`, fr({ final: true }));
    return { lines: R.lines, frames: keepAsks(R.frames, 3), result: { tree: T.slice().sort((a, b) => a - b), weight: wsum(E, T), sorted: R.c.sorted, saved: m - R.c.sorted, cmp: R.c.cmp, filtered: R.c.filtered, finds: cnt.find, kruskalCmp: kc.n } };
  }

  /* ---------- sampling lemma demo (Karger–Klein–Tarjan, Lemma) ---------- */
  /** Average number of F-light edges, F = MSF of a random half of the edges; KKT bound n/p = 2n. */
  function samplingLemma(g, trials, seed) {
    const n = g.names.length, E = g.edges, lt = less(E), r = rng(seed || 7);
    let tot = 0, totH = 0, totF = 0;
    for (let t = 0; t < trials; t++) {
      const H = E.map((_, id) => id).filter(() => r() < 0.5);
      totH += H.length;
      const sorted = H.slice().sort(lt), uf = UF(n, { find: 0 }), F = [];
      sorted.forEach((id) => { if (uf.union(E[id].u, E[id].v)) F.push(id); });
      totF += F.length;
      const adj = Array.from({ length: n }, () => []);
      F.forEach((id) => { adj[E[id].u].push(id); adj[E[id].v].push(id); });
      let light = 0;
      E.forEach((e, id) => {
        // max edge (in the total order) on the F-path from e.u to e.v, or none
        const best = Array(n).fill(undefined), seen = Array(n).fill(false), q = [e.u];
        seen[e.u] = true; best[e.u] = -1;
        while (q.length) { const x = q.shift(); for (const fid of adj[x]) { const f = E[fid], y = f.u === x ? f.v : f.u; if (seen[y]) continue; seen[y] = true; best[y] = best[x] === -1 || lt(fid, best[x]) > 0 ? fid : best[x]; q.push(y); } }
        if (!seen[e.v] || lt(id, best[e.v]) <= 0) light++;
      });
      tot += light;
    }
    return { n, m: E.length, avgSample: totH / trials, avgF: totF / trials, avgLight: tot / trials, bound: 2 * n };
  }

  const API = { randomGraph, parseEdges, edgesToText, recKruskal, recPrim, recBoruvka, recFilter, samplingLemma, componentsOf, SPEC, less };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.MstCore = API;
})(typeof window !== "undefined" ? window : globalThis);
