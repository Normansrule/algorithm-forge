/* Algorithm Forge — Shortest paths, from Dijkstra to the 2025 frontier: pure engines.
   Graph g = {n, src, edges:[{u, v, w}], pos:[{x, y}]}, directed, integer weights w ≥ 1.
   Every engine returns {d, par, ctr, frames, order}; frames are recorded only when opt.frames is true.
   Loaded by the page (window.SPCore) and by Node tests (module.exports). */
(function (root) {
  "use strict";
  const INF = Infinity;

  function outLists(g) {
    const out = Array.from({ length: g.n }, () => []);
    g.edges.forEach((e, k) => out[e.u].push(k));
    return out;
  }
  const fmt = (x) => (x === INF ? "∞" : String(x));

  function recorder(opt) {
    const R = { frames: [], on: !!(opt && opt.frames), cap: (opt && opt.cap) || 3000, over: false };
    R.push = (f) => {
      if (!R.on) return;
      if (R.frames.length >= R.cap) { R.over = true; return; }
      R.frames.push(f);
    };
    return R;
  }

  /* ------------------------------------------------------------------ Bellman–Ford */
  function bellmanFord(g, opt) {
    opt = opt || {};
    const R = recorder(opt), n = g.n, E = g.edges, m = E.length, fine = !!opt.fine;
    const d = new Array(n).fill(INF), par = new Array(n).fill(-1), st = new Array(n).fill(0);
    const lastT = new Array(n).fill(-1);
    const c = { rounds: 0, "edge checks": 0, updates: 0 };
    d[g.src] = 0; st[g.src] = 1; lastT[g.src] = 0;
    const snap = (line, text, extra) => R.push(Object.assign({ d: d.slice(), st: st.slice(), par: par.slice(), line, text, ctr: Object.assign({}, c), t: c["edge checks"] }, extra || {}));
    snap([1, 2], `Start: d[${g.src}] = 0 for the source, ∞ everywhere else. Bellman–Ford uses <b>no priority queue</b>: it simply relaxes every edge, round after round, until a whole round changes nothing.`);
    let r;
    for (r = 1; r <= n - 1; r++) {
      c.rounds++;
      let changed = 0;
      const hot = [];
      if (fine) snap([3, 4], `Round ${r}: walk through all ${m} edges in list order and try to improve each head.`);
      for (let k = 0; k < m; k++) {
        const e = E[k];
        c["edge checks"]++;
        if (d[e.u] + e.w < d[e.v]) {
          const old = d[e.v];
          d[e.v] = d[e.u] + e.w; par[e.v] = k; st[e.v] = 1; changed++; c.updates++; lastT[e.v] = c["edge checks"];
          hot.push(e.v);
          if (fine) snap([6, 7], `Edge ${e.u}→${e.v} (w = ${e.w}): d[${e.u}] + ${e.w} = ${d[e.v]} &lt; ${fmt(old)}, so d[${e.v}] ← ${d[e.v]}.`, { act: [k], cur: e.v });
        } else if (fine && d[e.u] < INF) {
          snap(6, `Edge ${e.u}→${e.v} (w = ${e.w}): d[${e.u}] + ${e.w} = ${d[e.u] + e.w} is not below d[${e.v}] = ${fmt(d[e.v])}. No change.`, { act: [k], actKind: "no" });
        }
      }
      if (!fine) snap([3, 4, 5, 6, 7], `Round ${r}: checked all ${m} edges, ${changed} distance${changed === 1 ? "" : "s"} improved.${changed ? "" : " Nothing changed."}`, { hot });
      if (!changed) break;
      else if (fine) snap(8, `End of round ${r}: ${changed} update${changed === 1 ? "" : "s"}. Something changed, so another round is needed.`);
    }
    const rounds = c.rounds;
    for (let v = 0; v < n; v++) if (d[v] < INF) st[v] = 2;
    snap(9, `Round ${rounds} changed nothing, so every distance is final. Total: ${c["edge checks"]} edge checks = ${rounds} rounds × ${m} edges. Notice Bellman–Ford never knew <i>which</i> vertex was done until the very end — it never sorts anything, it just pays for repeated passes.`, { final: true });
    // order in which distances became correct = order of last update
    const order = [...Array(n).keys()].filter((v) => d[v] < INF).sort((a, b) => lastT[a] - lastT[b] || a - b);
    if (R.on) {
      R.frames.forEach((f) => { f.ns = order.filter((v) => lastT[v] <= f.t).length; });
      const opts = [...new Set([Math.max(1, rounds - 2), rounds - 1, rounds, rounds + 1, n - 1])].filter((x) => x >= 1).sort((a, b) => a - b);
      R.frames[0].ask = { q: `Bellman–Ford stops after the first round that changes nothing. How many rounds will it run on this graph (the worst case is n − 1 = ${n - 1})?`, opts, ans: opts.indexOf(rounds), why: `It runs ${rounds} rounds: the last improvement happens in round ${rounds - 1}, and one more round is needed to see that nothing changes. The number depends on the edge order and on how many edges the shortest paths have.` };
    }
    return { d, par, ctr: c, frames: R.frames, order, orderKind: "correct", over: R.over };
  }

  /* ------------------------------------------------------------------ Dijkstra + binary heap */
  function dijkstra(g, opt) {
    opt = opt || {};
    const R = recorder(opt), n = g.n, E = g.edges, out = outLists(g), fine = !!opt.fine;
    const d = new Array(n).fill(INF), par = new Array(n).fill(-1), st = new Array(n).fill(0);
    const c = { "delete-min": 0, insert: 0, "decrease-key": 0, "heap comparisons": 0, relaxations: 0 };
    const H = [], pos = new Array(n).fill(-1), order = [];
    const less = (a, b) => { c["heap comparisons"]++; return d[a] < d[b] || (d[a] === d[b] && a < b); };
    const place = (i, v) => { H[i] = v; pos[v] = i; };
    function up(i) { while (i > 0) { const p = (i - 1) >> 1; if (less(H[i], H[p])) { const t = H[p]; place(p, H[i]); place(i, t); i = p; } else break; } }
    function down(i) {
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let b = i;
        if (l < H.length && less(H[l], H[b])) b = l;
        if (r < H.length && less(H[r], H[b])) b = r;
        if (b === i) return;
        const t = H[b]; place(b, H[i]); place(i, t); i = b;
      }
    }
    const heapView = () => ({ kind: "heap", items: H.slice(0, 15).map((v) => [v, d[v]]), size: H.length });
    const snap = (line, text, extra) => R.push(Object.assign({ d: d.slice(), st: st.slice(), par: par.slice(), line, text, ctr: Object.assign({}, c), ds: heapView(), ns: order.length }, extra || {}));
    d[g.src] = 0; H.push(g.src); pos[g.src] = 0; c.insert++; st[g.src] = 1;
    snap([1, 2], `Start: d[${g.src}] = 0 and the source is the only item in the min-heap H. Every step will pull out the <b>smallest</b> tentative distance — so vertices come out in sorted order.`);
    let asked = false;
    while (H.length) {
      // predict before a delete-min when the minimum is unique and the heap has a choice
      let ask = null;
      if (R.on && !asked && order.length >= 2 && H.length >= 3) {
        const cand = H.slice().sort((a, b) => d[a] - d[b] || a - b);
        if (d[cand[0]] < d[cand[1]]) {
          const pick = cand.slice(0, 4).sort((a, b) => a - b);
          ask = { q: `The heap holds ${H.length} vertices. Which one will delete-min settle next?`, opts: pick.map((v) => `vertex ${v} (d = ${d[v]})`), ans: pick.indexOf(cand[0]), why: `Vertex ${cand[0]} has the smallest tentative distance, ${d[cand[0]]}. Any other path to it would have to leave the settled region through a vertex whose distance is already at least ${d[cand[0]]}, and weights are non-negative.` };
          asked = true;
        }
      }
      if (ask) snap(3, `About to call delete-min on a heap of ${H.length}.`, { ask });
      const u = H[0];
      c["delete-min"]++;
      const last = H.pop(); pos[u] = -1;
      if (H.length) { place(0, last); down(0); }
      st[u] = 2; order.push(u);
      if (fine || R.on) snap(4, `delete-min → vertex ${u}, d = ${d[u]}. It is <b>settled</b>: no later path can be shorter. Settled #${order.length}; its distance is ≥ every earlier settled distance — this is the sorted order Dijkstra cannot avoid.`, { cur: u });
      const acts = [];
      for (const k of out[u]) {
        const e = E[k];
        c.relaxations++;
        if (d[u] + e.w < d[e.v]) {
          const old = d[e.v];
          d[e.v] = d[u] + e.w; par[e.v] = k;
          let what;
          if (pos[e.v] < 0) { H.push(e.v); pos[e.v] = H.length - 1; c.insert++; up(H.length - 1); what = "insert"; }
          else { c["decrease-key"]++; up(pos[e.v]); what = "decrease-key"; }
          st[e.v] = 1; acts.push(k);
          if (fine) snap(what === "insert" ? [6, 7, 8] : [6, 7, 9, 10], `Relax ${u}→${e.v} (w = ${e.w}): ${d[u]} + ${e.w} = ${d[e.v]} &lt; ${fmt(old)}. ${what === "insert" ? `First time ${e.v} is reached: <b>insert</b> it into H.` : `${e.v} is already in H: <b>decrease-key</b> to ${d[e.v]} (it sifts up).`}`, { act: [k], cur: u });
        }
      }
      if (!fine && R.on && acts.length) snap([5, 6, 7], `Relax the ${out[u].length} edges out of ${u}: ${acts.length} improved (${acts.map((k) => E[k].v + "→" + d[E[k].v]).join(", ")}).`, { act: acts, cur: u });
    }
    snap(11, `Heap empty: all ${order.length} reachable vertices settled, in non-decreasing distance order. Cost: ${c["delete-min"]} delete-mins and ${c.insert + c["decrease-key"]} inserts / decrease-keys, each O(log n) — ${c["heap comparisons"]} heap comparisons on top of ${c.relaxations} relaxations.`, { final: true });
    return { d, par, ctr: c, frames: R.frames, order, orderKind: "settled", over: R.over };
  }

  /* ------------------------------------------------------------------ Dial's bucket queue */
  function dial(g, opt) {
    opt = opt || {};
    const R = recorder(opt), n = g.n, E = g.edges, out = outLists(g), fine = !!opt.fine;
    const C = Math.max(1, ...E.map((e) => e.w)), NB = C + 1;
    const d = new Array(n).fill(INF), par = new Array(n).fill(-1), st = new Array(n).fill(0);
    const c = { "buckets scanned": 0, "bucket inserts": 0, "bucket moves": 0, relaxations: 0 };
    const B = Array.from({ length: NB }, () => []), order = [];
    let i = 0, count = 0;
    const view = () => ({ kind: "buckets", NB, i, slots: B.map((b) => b.slice()) });
    const snap = (line, text, extra) => R.push(Object.assign({ d: d.slice(), st: st.slice(), par: par.slice(), line, text, ctr: Object.assign({}, c), ds: view(), ns: order.length }, extra || {}));
    d[g.src] = 0; B[0].push(g.src); count = 1; c["bucket inserts"]++; st[g.src] = 1;
    snap([1, 2], `Integer weights 1..C with C = ${C}. Dial keeps C + 1 = ${NB} buckets in a circle: bucket j holds the vertices whose tentative distance ≡ j (mod ${NB}). Every tentative distance lies within C of the current one, so ${NB} buckets never collide. The source goes into bucket 0.`);
    let asked = false;
    while (count > 0) {
      while (B[i % NB].length === 0) { i++; c["buckets scanned"]++; }
      const u = B[i % NB].shift(); count--;
      st[u] = 2; order.push(u);
      if (fine || R.on) snap([4, 5], `Bucket ${i % NB} (distance ${i}) is the first non-empty one: take vertex ${u}, settled at d = ${d[u]}. No comparisons between keys are needed — the bucket index <i>is</i> the distance.`, { cur: u });
      const acts = [];
      for (const k of out[u]) {
        const e = E[k];
        c.relaxations++;
        const x = d[u] + e.w;
        if (x < d[e.v]) {
          const old = d[e.v];
          if (old < INF) { const b = B[old % NB]; b.splice(b.indexOf(e.v), 1); c["bucket moves"]++; count--; }
          let ask = null;
          if (R.on && !asked && order.length >= 2) {
            const opts = [...new Set([x % NB, (x + 1) % NB, e.w % NB, (x + NB - 1) % NB])].sort((a, b) => a - b);
            ask = { q: `Vertex ${e.v} is about to get d = ${x}. Which bucket (0..${NB - 1}) will it go into?`, opts: opts.map(String), ans: opts.indexOf(x % NB), why: `${x} mod ${NB} = ${x % NB}. The buckets are reused in a circle, so bucket ${x % NB} currently stands for distance ${x}.` };
            asked = true;
            snap([6, 7], `Relax ${u}→${e.v} (w = ${e.w}): ${d[u]} + ${e.w} = ${x} &lt; ${fmt(old)}.`, { act: [k], cur: u, ask });
          }
          d[e.v] = x; par[e.v] = k; B[x % NB].push(e.v); count++; c["bucket inserts"]++; st[e.v] = 1; acts.push(k);
          if (fine) snap([6, 7, 8, 9, 10], `Relax ${u}→${e.v} (w = ${e.w}): ${x} &lt; ${fmt(old)}. ${old < INF ? `Move ${e.v} out of bucket ${old % NB}` : `Put ${e.v}`} into bucket ${x} mod ${NB} = ${x % NB}.`, { act: [k], cur: u });
        }
      }
      if (!fine && R.on && acts.length) snap([6, 7, 8, 9, 10], `Relax the edges out of ${u}: ${acts.map((k) => `${E[k].v} → bucket ${d[E[k].v] % NB}`).join(", ")}.`, { act: acts, cur: u });
    }
    snap(11, `All buckets empty. The scan pointer walked through distances 0..${i}: ${c["buckets scanned"]} bucket steps, plus ${c.relaxations} relaxations — O(m + n·C) in total, with no log factor. The catch: it needs small integer weights.`, { final: true });
    return { d, par, ctr: c, frames: R.frames, order, orderKind: "settled", over: R.over };
  }

  /* ------------------------------------------------------------------ Δ-stepping */
  function deltaStepping(g, opt) {
    opt = opt || {};
    const R = recorder(opt), n = g.n, E = g.edges, out = outLists(g), fine = !!opt.fine;
    const D = Math.max(1, opt.delta || 3);
    const d = new Array(n).fill(INF), par = new Array(n).fill(-1), st = new Array(n).fill(0);
    const c = { buckets: 0, phases: 0, "light relax": 0, "heavy relax": 0, "re-insertions": 0, "empty buckets": 0 };
    const B = [], order = [];
    const bk = (x) => Math.floor(x / D);
    let i = 0, inR = new Array(n).fill(false), Rset = [];
    const view = () => {
      const list = [];
      for (let j = i; j < B.length && list.length < 7; j++) if (B[j] && B[j].length) list.push([j, B[j].slice()]);
      return { kind: "delta", D, i, list, R: Rset.slice() };
    };
    const snap = (line, text, extra) => R.push(Object.assign({ d: d.slice(), st: st.slice(), par: par.slice(), line, text, ctr: Object.assign({}, c), ds: view(), ns: order.length }, extra || {}));
    function relax(v, x, k, kind) {
      c[kind]++;
      if (x < d[v]) {
        if (d[v] < INF) { const b = B[bk(d[v])]; const p = b ? b.indexOf(v) : -1; if (p >= 0) b.splice(p, 1); }
        const j = bk(x);
        while (B.length <= j) B.push([]);
        B[j].push(v);
        if (inR[v] && j === i) c["re-insertions"]++;
        d[v] = x; par[v] = k; st[v] = 1;
        return true;
      }
      return false;
    }
    d[g.src] = 0; B.push([g.src]); st[g.src] = 1;
    snap([1, 2], `Δ = ${D}. Bucket j holds vertices with tentative distance in [j·Δ, (j+1)·Δ). Edges with w ≤ Δ are <b>light</b>, the rest <b>heavy</b>. Inside one bucket the order does not matter — that is the freedom a parallel machine uses.`);
    let asked = false;
    for (;;) {
      while (i < B.length && !B[i].length) { i++; c["empty buckets"]++; }
      if (i >= B.length) break;
      c.buckets++;
      Rset = []; inR = new Array(n).fill(false);
      if (R.on && !asked && c.buckets >= 2) {
        const nonEmpty = []; for (let j = i; j < B.length; j++) if (B[j].length) nonEmpty.push(j);
        const opts = [...new Set([i, ...nonEmpty.slice(1, 3), i + 1])].sort((a, b) => a - b).slice(0, 4);
        if (!opts.includes(i)) opts.push(i);
        snap(4, `Which bucket comes next?`, { ask: { q: `Δ-stepping always works on the first non-empty bucket. Which bucket index is it now?`, opts: opts.map((j) => `bucket ${j} [${j * D}, ${(j + 1) * D})`), ans: opts.indexOf(i), why: `Bucket ${i} is the lowest non-empty bucket. All vertices with smaller distances are already final.` } });
        asked = true;
      }
      snap(4, `Bucket ${i} = distances [${i * D}, ${(i + 1) * D}) is the first non-empty one: {${B[i].join(", ")}}.`);
      while (B[i].length) {
        c.phases++;
        const cur = B[i].slice();
        const req = [];
        for (const u of cur) for (const k of out[u]) if (E[k].w <= D) req.push([E[k].v, d[u] + E[k].w, k]);
        for (const u of cur) if (!inR[u]) { inR[u] = true; Rset.push(u); }
        B[i] = [];
        const acts = [];
        for (const [v, x, k] of req) if (relax(v, x, k, "light relax")) acts.push(k);
        snap([5, 6, 7, 8], `Phase ${c.phases}: relax the ${req.length} light edge${req.length === 1 ? "" : "s"} out of {${cur.join(", ")}} all at once (a parallel machine would do them simultaneously). ${acts.length} improved. ${B[i].length ? `Vertices {${B[i].join(", ")}} landed back in bucket ${i}, so another phase is needed.` : `Bucket ${i} stayed empty.`}`, { act: req.map((q) => q[2]), cur: -1, hot: acts.map((k) => E[k].v) });
      }
      const hreq = [];
      for (const u of Rset) for (const k of out[u]) if (E[k].w > D) hreq.push([E[k].v, d[u] + E[k].w, k]);
      const hacts = [];
      for (const [v, x, k] of hreq) if (relax(v, x, k, "heavy relax")) hacts.push(k);
      for (const u of Rset) { st[u] = 2; order.push(u); }
      snap([10, 11], `Bucket ${i} is settled: {${Rset.join(", ")}} are final. Now relax their ${hreq.length} heavy edge${hreq.length === 1 ? "" : "s"} once (w &gt; Δ, so they can only reach later buckets); ${hacts.length} improved.`, { act: hreq.map((q) => q[2]), hot: hacts.map((k) => E[k].v) });
    }
    Rset = [];
    snap(12, `No bucket left. ${c.buckets} buckets, ${c.phases} phases, ${c["light relax"] + c["heavy relax"]} relaxations (${c["re-insertions"]} re-insertions — the price of not sorting inside a bucket). Small Δ behaves like Dijkstra/Dial; huge Δ behaves like Bellman–Ford.`, { final: true });
    return { d, par, ctr: c, frames: R.frames, order, orderKind: "bucket", over: R.over };
  }

  /* ------------------------------------------------------------------ FindPivots (Duan, Mao, Mao, Shu, Yin 2025, Algorithm 1) */
  /** The core routine, exactly as in the paper: relax k rounds from S below bound B, then pivots = roots in S of
      tight-edge trees with ≥ k vertices. dh = current estimates (modified in place). Ties (two tight in-edges) are
      broken by the smallest tail id so F is a forest even when path lengths are not all distinct. */
  function findPivots(g, S, dh, B, k, hook) {
    const out = outLists(g), E = g.edges, n = g.n;
    hook = hook || {};
    const inW = new Array(n).fill(false), round = new Array(n).fill(-1);
    S.forEach((v) => { inW[v] = true; round[v] = 0; });
    let prev = S.slice().sort((a, b) => a - b);
    const W = prev.slice();
    let relax = 0;
    for (let i = 1; i <= k; i++) {
      const next = [], inNext = new Array(n).fill(false);
      if (hook.roundStart) hook.roundStart(i, prev);
      for (const u of prev) {
        for (const ke of out[u]) {
          const e = E[ke];
          relax++;
          const x = dh[u] + e.w;
          let added = false, ok = false;
          if (x <= dh[e.v]) {
            ok = true;
            dh[e.v] = x;
            if (x < B && !inNext[e.v]) { inNext[e.v] = true; next.push(e.v); added = true; }
          }
          if (hook.relax) hook.relax(i, u, ke, x, ok, added);
        }
      }
      next.sort((a, b) => a - b);
      for (const v of next) if (!inW[v]) { inW[v] = true; round[v] = i; W.push(v); }
      if (hook.roundEnd) hook.roundEnd(i, next, W.length);
      if (W.length > k * S.length) return { P: S.slice().sort((a, b) => a - b), W: W.slice().sort((a, b) => a - b), early: true, rounds: i, relax, round, inW };
      prev = next;
    }
    // forest F of tight edges inside W
    const parent = new Array(n).fill(-1);
    E.forEach((e, ke) => {
      if (inW[e.u] && inW[e.v] && dh[e.u] + e.w === dh[e.v]) {
        if (parent[e.v] < 0 || e.u < E[parent[e.v]].u) parent[e.v] = ke;
      }
    });
    const kids = Array.from({ length: n }, () => []);
    for (let v = 0; v < n; v++) if (parent[v] >= 0) kids[E[parent[v]].u].push(v);
    const size = new Array(n).fill(0), rootOf = new Array(n).fill(-1);
    const sizeOf = (r) => { let s = 0; const st = [r]; while (st.length) { const x = st.pop(); s++; rootOf[x] = r; for (const y of kids[x]) st.push(y); } return s; };
    for (let v = 0; v < n; v++) if (inW[v] && parent[v] < 0) size[v] = sizeOf(v);
    const Sset = new Set(S);
    const P = S.filter((u) => parent[u] < 0 && size[u] >= k).sort((a, b) => a - b);
    return { P, W: W.slice().sort((a, b) => a - b), early: false, rounds: k, relax, round, inW, parent, size, rootOf, Sset };
  }

  /** Build a situation in which BMSSP would call FindPivots: everything with true distance below b is finished
      (as if earlier work had done it, and its edges relaxed), S = the vertices those edges reached with estimate < B
      — exactly the frontier Dijkstra's heap would hold at that moment. frac = 0 gives the top-level call S = {source}. */
  function pivotScenario(g, opt) {
    const truth = dijkstra(g).d, n = g.n, E = g.edges;
    const reach = [...Array(n).keys()].filter((v) => truth[v] < INF).sort((a, b) => truth[a] - truth[b] || a - b);
    const frac = Math.max(0, Math.min(0.9, opt.frac == null ? 0.3 : opt.frac));
    const maxd = truth[reach[reach.length - 1]];
    let b = 0, done = new Array(n).fill(false);
    const dh = new Array(n).fill(INF);
    let S;
    if (frac === 0 || reach.length < 3) { b = 0; dh[g.src] = 0; S = [g.src]; }
    else {
      b = truth[reach[Math.min(reach.length - 1, Math.floor(frac * reach.length))]];
      if (b === 0) b = 1;
      reach.forEach((v) => { if (truth[v] < b) { done[v] = true; dh[v] = truth[v]; } });
      E.forEach((e) => { if (done[e.u] && !done[e.v]) dh[e.v] = Math.min(dh[e.v], dh[e.u] + e.w); });
      S = null;
    }
    const beta = opt.beta == null ? 1 : opt.beta;
    const B = beta >= 1 ? INF : Math.max(b + 1, Math.round(b + beta * (maxd + 1 - b)));
    if (!S) S = [...Array(n).keys()].filter((v) => !done[v] && dh[v] < B).sort((a, b2) => a - b2);
    return { truth, b, B, S, dh, done, maxd };
  }

  /** Recorded illustration of FindPivots on a scenario. */
  function pivotsRun(g, opt) {
    opt = opt || {};
    const Rr = recorder(opt), n = g.n, E = g.edges, fine = !!opt.fine;
    const k = Math.max(1, opt.k || 3);
    const sc = pivotScenario(g, opt);
    const { truth, b, B, S, done } = sc;
    const dh = sc.dh.slice();
    const st = new Array(n).fill(0);
    for (let v = 0; v < n; v++) if (done[v]) st[v] = 7; else if (dh[v] < INF) st[v] = (dh[v] < B ? 1 : 6);
    const par = new Array(n).fill(-1);
    const c = { "|S| (frontier)": S.length, rounds: 0, relaxations: 0, "|W|": S.length, "k·|S|": k * S.length, "|P| (pivots)": "?" };
    const Bs = B === INF ? "∞" : String(B);
    const snap = (line, text, extra) => Rr.push(Object.assign({ d: dh.slice(), st: st.slice(), par: par.slice(), line, text, ctr: Object.assign({}, c), ds: { kind: "pivots", S, W: W.slice(), P: null, k, b, B: Bs }, ns: 0 }, extra || {}));
    let W = S.slice();
    if (!S.length) {
      snap(0, `The frontier S is empty for these settings (every vertex below the bound is already finished). Lower the "finished" slider or raise B.`, { final: true });
      return { frames: Rr.frames, sc, res: null, k };
    }
    const intro = b === 0
      ? `Top-level call: S = {${S.join(", ")}} (just the source), bound B = ${Bs}.`
      : `Set-up: vertices with true distance below b = ${b} are <b>finished</b> (faded green; as if earlier work did them) and their edges are relaxed. The frontier S = {${S.join(", ")}} — ${S.length} vertices with estimate &lt; B = ${Bs} — is exactly what Dijkstra's heap would hold now, and Dijkstra would pull all ${S.length} of them out <i>in sorted order</i>.`;
    snap([1, 2], `${intro} FindPivots will instead do k = ${k} rounds of Bellman–Ford-style relaxation from S, with no sorting at all.`);
    // predict how many pivots after running silently
    const silent = findPivots(g, S, sc.dh.slice(), B, k);
    let roundNew = [];
    const res = findPivots(g, S, dh, B, k, {
      roundStart(i, prev) {
        c.rounds = i; roundNew = [];
        if (fine) snap([3, 4], `Round ${i}: relax every edge out of W<sub>${i - 1}</sub> = {${prev.join(", ")}}.`);
      },
      relax(i, u, ke, x, ok, added) {
        c.relaxations++;
        const e = E[ke];
        if (ok) { par[e.v] = ke; if (added) { roundNew.push(e.v); if (st[e.v] !== 5) st[e.v] = 4; } else if (!done[e.v] && dh[e.v] >= B) st[e.v] = 6; }
        if (fine) snap(ok ? (added ? [6, 7, 8] : [6, 7]) : 6, ok
          ? `Edge ${u}→${e.v} (w = ${e.w}): d̂[${u}] + ${e.w} = ${x} ≤ d̂[${e.v}], so d̂[${e.v}] ← ${x}. ${added ? `${x} &lt; B, so ${e.v} joins W<sub>${i}</sub>.` : `But ${x} ≥ B = ${Bs}: outside this band, so ${e.v} is not added.`}`
          : `Edge ${u}→${e.v} (w = ${e.w}): ${x} &gt; d̂[${e.v}] = ${fmt(dh[e.v])}. No change.`, { act: [ke], cur: u });
      },
      roundEnd(i, next, wsize) {
        W = [...new Set([...W, ...next])];
        c["|W|"] = wsize;
        if (!fine) snap([3, 4, 5, 6, 7, 8, 9], `Round ${i}: relaxed the edges out of the ${i === 1 ? "frontier" : "vertices reached in round " + (i - 1)}; W<sub>${i}</sub> = {${next.join(", ") || "∅"}} (yellow). |W| = ${wsize}.`, { hot: next });
        next.forEach((v) => { if (st[v] === 4) st[v] = 1; });
        snap([9, 10], `After round ${i}: |W| = ${wsize} ${wsize > k * S.length ? "&gt;" : "≤"} k·|S| = ${k * S.length}. ${wsize > k * S.length ? "The search is growing fast…" : i < k ? "Keep going." : "All k rounds done."}`);
      },
    });
    c["|P| (pivots)"] = res.P.length;
    const sizeOpts = [...new Set([0, 1, silent.P.length, Math.max(0, silent.P.length - 1), silent.P.length + 1, S.length])].sort((a, b2) => a - b2).slice(0, 5);
    if (!sizeOpts.includes(silent.P.length)) sizeOpts.push(silent.P.length);
    const ask = { q: `S has ${S.length} vertices. How many of them will FindPivots keep as pivots?`, opts: sizeOpts.map(String), ans: sizeOpts.indexOf(silent.P.length), why: silent.early ? `All ${S.length}: W outgrew k·|S|, so FindPivots returns P = S immediately. That is still fine, because then |S| &lt; |W|/k: the big W pays for keeping S.` : `${silent.P.length}: only roots of tight-edge trees with at least k = ${k} vertices count, and those trees are disjoint, so there are at most |W|/k = ${(silent.W.length / k).toFixed(1)} of them.` };
    let complete = 0;
    res.W.forEach((v) => { if (dh[v] === truth[v]) complete++; });
    if (res.early) {
      res.P.forEach((v) => (st[v] = 5));
      snap([10, 11], `|W| = ${res.W.length} &gt; k·|S| = ${k * S.length}: return early with P = S. When the search from S is this large, |P| = |S| &lt; |W|/k anyway, so the bound |P| ≤ |W|/k still holds.`, { ask, final: true, pivots: res.P, Wfinal: res.W });
    } else {
      // forest view
      const treeEdges = [];
      for (let v = 0; v < n; v++) if (res.parent[v] >= 0) treeEdges.push(res.parent[v]);
      for (let v = 0; v < n; v++) if (res.inW[v] && st[v] !== 7) st[v] = 1;
      const roots = [...Array(n).keys()].filter((v) => res.inW[v] && res.parent[v] < 0);
      snap(12, `Build F: the <b>tight</b> edges inside W (d̂[v] = d̂[u] + w — they lie on the shortest paths found so far). F is a forest; each root's tree size is shown under it.`, { forest: treeEdges, sizes: roots.map((r) => [r, res.size[r]]), ask });
      res.P.forEach((v) => (st[v] = 5));
      for (let v = 0; v < n; v++) {
        if (!res.inW[v] || res.P.includes(v)) continue;
        const r = res.rootOf[v];
        st[v] = res.P.includes(r) ? 4 : 2;
      }
      const small = S.filter((u) => !res.P.includes(u));
      snap([13, 14], `Pivots P = ${res.P.length ? "{" + res.P.join(", ") + "}" : "∅"}: the roots in S whose trees have ≥ k = ${k} vertices (purple; their trees in yellow). The other ${small.length} frontier vertices root small trees (green) and are dropped: Lemma 3.2 of the paper shows that every vertex below B reached through S is now either complete in W or behind a complete pivot (the answer key on the right checks this). So |S| = ${S.length} shrinks to |P| = ${res.P.length} ≤ |W|/k = ${(res.W.length / k).toFixed(1)}: only pivots go on to the recursive, heap-like stage.`, { final: true, forest: treeEdges, sizes: roots.map((r) => [r, res.size[r]]), pivots: res.P, Wfinal: res.W });
    }
    res.complete = complete;
    return { frames: Rr.frames, sc, res, k, dh };
  }

  /** Check Lemma 3.2 of the paper against the true distances: |P| ≤ |W|/k (when not early), |W| = O(k|S|), and every
      x in Ũ (true d(x) < B, some shortest path through S) is complete in W, or some shortest path to x visits a
      complete pivot. Needs all-pairs reachability on small graphs only (used by the page's answer key and the tests). */
  function checkLemma(g, sc, res, dh, k) {
    const n = g.n, E = g.edges, out = outLists(g), truth = sc.truth;
    // dist from each S/P vertex: single-source Dijkstra from y gives dist(y, x); x on a shortest path through y iff truth[y] + dist(y, x) = truth[x]
    const fromV = (y) => { const gg = { n, src: y, edges: E }; return dijkstra(gg).d; };
    const Sd = new Map(); sc.S.forEach((y) => Sd.set(y, fromV(y)));
    const complete = (v) => dh[v] === truth[v];
    const inW = new Set(res.W), P = new Set(res.P);
    let Ucount = 0, bad = [];
    for (let x = 0; x < n; x++) {
      if (!(truth[x] < sc.B)) continue;
      let through = false;
      for (const y of sc.S) if (truth[y] + Sd.get(y)[x] === truth[x]) { through = true; break; }
      if (!through) continue;
      Ucount++;
      const c1 = inW.has(x) && complete(x);
      let c2 = false;
      for (const y of res.P) if (complete(y) && truth[y] + Sd.get(y)[x] === truth[x]) { c2 = true; break; }
      if (!c1 && !c2) bad.push(x);
    }
    const okSize = res.early ? res.P.length <= res.W.length / k : res.P.length * k <= res.W.length;
    return { Ucount, bad, okSize, okW: res.early || res.W.length <= k * sc.S.length };
  }

  /* ------------------------------------------------------------------ graphs */
  function rng(seed) {
    let a = (seed >>> 0) || 0x9e3779b9;
    return function () { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const VW = 760, VH = 440;
  function small() {
    const P = [[60, 220], [190, 90], [190, 350], [330, 220], [330, 60], [470, 360], [470, 170], [610, 70], [610, 290], [720, 180]];
    const L = [[8, 6, 1], [8, 9, 5], [7, 9, 2], [6, 8, 4], [6, 7, 6], [6, 4, 1], [5, 8, 3], [4, 7, 3], [3, 5, 2], [3, 6, 2], [2, 5, 8], [2, 3, 7], [1, 3, 3], [1, 4, 5], [2, 1, 2], [0, 2, 1], [0, 1, 4]];
    return { n: 10, src: 0, pos: P.map(([x, y]) => ({ x, y })), edges: L.map(([u, v, w]) => ({ u, v, w })), name: "small" };
  }
  function randomSparse(n, C, seed) {
    const r = rng(seed);
    const cols = Math.max(2, Math.ceil(Math.sqrt(n * VW / VH))), rows = Math.ceil(n / cols);
    const cw = (VW - 40) / cols, ch = (VH - 40) / rows;
    const cells = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) cells.push([x, y]);
    // keep n cells, dropping random ones from the last row(s) region evenly
    while (cells.length > n) cells.splice(Math.floor(r() * cells.length), 1);
    const pos = cells.map(([x, y]) => ({ x: 20 + cw * (x + 0.5 + (r() - 0.5) * 0.5), y: 20 + ch * (y + 0.5 + (r() - 0.5) * 0.5), gx: x, gy: y }));
    const at = new Map(); pos.forEach((p, v) => at.set(p.gx + "," + p.gy, v));
    const nb = pos.map((p) => { const l = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const w = at.get((p.gx + dx) + "," + (p.gy + dy)); if (w !== undefined) l.push(w); } return l; });
    // source: leftmost cell closest to the middle row
    let src = 0;
    pos.forEach((p, v) => { const q = pos[src]; if (p.gx < q.gx || (p.gx === q.gx && Math.abs(p.gy - rows / 2) < Math.abs(q.gy - rows / 2))) src = v; });
    const edges = [], has = new Set();
    const add = (u, v) => { const key = u * 100000 + v; if (has.has(key) || u === v) return false; has.add(key); edges.push({ u, v, w: 1 + Math.floor(r() * C) }); return true; };
    const seen = new Array(n).fill(false); seen[src] = true;
    const front = [src];
    while (front.length) {
      const idx = Math.floor(r() * front.length), u = front[idx];
      const cand = nb[u].filter((v) => !seen[v]);
      if (!cand.length) { front.splice(idx, 1); continue; }
      const v = cand[Math.floor(r() * cand.length)];
      seen[v] = true; add(u, v); front.push(v);
    }
    // isolated leftovers (possible if a dropped cell split the grid): connect to nearest seen vertex
    for (let v = 0; v < n; v++) if (!seen[v]) {
      let best = src, bd = Infinity;
      for (let u = 0; u < n; u++) if (seen[u]) { const dd = Math.hypot(pos[u].x - pos[v].x, pos[u].y - pos[v].y); if (dd < bd) { bd = dd; best = u; } }
      add(best, v); seen[v] = true;
    }
    let guard = 0;
    while (edges.length < 2 * n && guard++ < 50 * n) {
      const u = Math.floor(r() * n); const c = nb[u]; if (!c.length) continue;
      add(u, c[Math.floor(r() * c.length)]);
    }
    return { n, src, pos: pos.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) })), edges, name: "random" };
  }
  function gridRoads(n, C, seed) {
    const r = rng(seed);
    const cols = Math.max(2, Math.round(Math.sqrt(n * VW / VH))), rows = Math.max(2, Math.round(n / cols));
    const N = rows * cols, cw = (VW - 40) / (cols - 1 || 1), ch = (VH - 40) / (rows - 1 || 1);
    const id = (x, y) => y * cols + x;
    const pos = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) pos.push({ x: Math.round(20 + x * cw), y: Math.round(20 + y * ch) });
    const edges = [];
    const w = () => 1 + Math.floor(r() * C);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (x + 1 < cols) { edges.push({ u: id(x, y), v: id(x + 1, y), w: w() }); if (r() < 0.12) edges.push({ u: id(x + 1, y), v: id(x, y), w: w() }); }
      if (y + 1 < rows) { edges.push({ u: id(x, y), v: id(x, y + 1), w: w() }); if (r() < 0.12) edges.push({ u: id(x, y + 1), v: id(x, y), w: w() }); }
    }
    return { n: N, src: 0, pos, edges, name: "grid", cols, rows };
  }

  /* ------------------------------------------------------------------ work + benchmark */
  function work(name, c) {
    if (name === "bf") return c["edge checks"];
    if (name === "dij") return c.relaxations + c["heap comparisons"];
    if (name === "dial") return c.relaxations + c["buckets scanned"];
    if (name === "delta") return c["light relax"] + c["heavy relax"] + c["empty buckets"];
    return 0;
  }
  const RUN = { bf: bellmanFord, dij: dijkstra, dial, delta: deltaStepping };
  function bench(family, sizes, C, delta, seeds) {
    seeds = seeds || [1, 2, 3];
    return sizes.map((n) => {
      const row = { n, m: 0 };
      for (const a in RUN) row[a] = 0;
      seeds.forEach((s) => {
        const g = family === "grid" ? gridRoads(n, C, 1000 + s * 7 + n) : randomSparse(n, C, 1000 + s * 7 + n);
        row.m += g.edges.length / seeds.length;
        row.nn = g.n;
        for (const a in RUN) row[a] += work(a, RUN[a](g, { delta }).ctr) / seeds.length;
      });
      return row;
    });
  }

  const API = { INF, bellmanFord, dijkstra, dial, deltaStepping, findPivots, pivotScenario, pivotsRun, checkLemma, small, randomSparse, gridRoads, rng, work, bench, RUN, VW, VH };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.SPCore = API;
})(typeof window !== "undefined" ? window : globalThis);
