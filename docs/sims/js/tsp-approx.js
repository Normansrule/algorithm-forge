/* Algorithm Forge · Traveling Salesman approximations
   Recorders: exact (exhaustive), nearest neighbor, multifragment, twice-around-the-tree,
   Christofides with greedy matching, 2-opt. Each returns {tour, len, frames}. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const E = Forge.el, S = Forge.svg;
  Forge.page({ title: "TSP Approximations", chapter: "Ch 12 · Coping with Limitations" });

  const W = 800, H = 500, LET = "ABCDEFGHIJKL";
  const PRESET = [[679, 198], [157, 276], [654, 121], [351, 196], [470, 48], [351, 334], [681, 418], [234, 54], [475, 377]];
  let P = PRESET.map((p) => p.slice());
  const say = Forge.narrate($("say"));
  const stage = $("stage");
  let alg = "nn", code = null, ctr = null, cur = null, cache = null;
  const answered = {};

  const d = (i, j) => Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1]) / 10;
  const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
  const tourLen = (t) => { let s = 0; for (let k = 0; k + 1 < t.length; k++) s += d(t[k], t[k + 1]); return s; };
  const nm = (i) => LET[i];
  const seqStr = (t) => t.map(nm).join(" ");

  /* ------------------------------------------------------------------ pseudocode */
  const CODE = {
    nn: [
      "ALGORITHM NearestNeighbor(cities, s)",
      "    tour ← [s];  cur ← s",
      "    while an unvisited city exists do",
      "        next ← nearest unvisited city to cur",
      "        append next to tour;  cur ← next",
      "    append s to tour      // go home",
      "    return tour",
    ],
    mf: [
      "ALGORITHM Multifragment(cities)",
      "    sort all edges by length",
      "    T ← ∅",
      "    for each edge (u, v) in that order do",
      "        if deg(u) = 2 or deg(v) = 2 then",
      "            skip           // degree 3",
      "        else if (u, v) closes a cycle",
      "                of length < n then skip",
      "        else add (u, v) to T",
      "        if |T| = n then return T",
    ],
    tat: [
      "ALGORITHM TwiceAroundTheTree(cities)",
      "    T ← MST(cities)          // Prim",
      "    walk ← depth-first walk around T",
      "        // every tree edge used twice",
      "    tour ← walk minus repeated cities",
      "        // shortcuts",
      "    append s;  return tour",
    ],
    chr: [
      "ALGORITHM ChristofidesGreedy(cities)",
      "    T ← MST(cities)          // Prim",
      "    O ← cities of odd degree in T",
      "    M ← pair closest unmatched cities",
      "        of O until all are matched",
      "    C ← Euler circuit of T + M",
      "    tour ← C minus repeated cities",
      "    append s;  return tour",
    ],
    opt2: [
      "ALGORITHM TwoOpt(tour)",
      "    repeat",
      "        improved ← false",
      "        for each nonadjacent pair of",
      "                tour edges (a,b), (c,d) do",
      "            if d(a,c) + d(b,d) < d(a,b) + d(c,d)",
      "                replace them by (a,c), (b,d)",
      "                improved ← true",
      "    until not improved",
      "    return tour",
    ],
    exact: [
      "ALGORITHM ExhaustiveTSP(cities)",
      "    fix the start city s;  best ← ∞",
      "    for each permutation p of the rest do",
      "        if p precedes its reverse then",
      "            len ← length of s, p, s",
      "            if len < best then",
      "                best ← len;  save tour",
      "    return saved tour",
    ],
  };
  const NAMES = { nn: "Nearest neighbor", mf: "Multifragment", tat: "Twice-around-the-tree", chr: "Christofides (greedy matching)", opt2: "2-opt (from nearest neighbor)", exact: "Exact (exhaustive search)" };

  /* ------------------------------------------------------------------ helpers */
  function prim(s, frames, push) {
    const n = P.length, inT = new Array(n).fill(false), edges = [];
    inT[s] = true;
    for (let k = 1; k < n; k++) {
      let bu = -1, bv = -1;
      for (let u = 0; u < n; u++) if (inT[u]) for (let v = 0; v < n; v++) if (!inT[v] && (bu < 0 || d(u, v) < d(bu, bv))) { bu = u; bv = v; }
      inT[bv] = true;
      edges.push([bu, bv]);
      if (push) push(edges.slice(), bu, bv);
    }
    return edges;
  }
  function shortcutFrames(walk, base, push, line) {
    const seen = new Set(), tour = [];
    walk.forEach((v, k) => {
      if (k === walk.length - 1) return; // the final return to s is handled at the end
      if (seen.has(v)) {
        push({ tour: tour.slice(), look: v, skip: true, k, base }, line, `Walk position ${k + 1}: ${nm(v)} was already visited, so <b>shortcut</b> past it (go straight to the next new city). By the triangle inequality this can only shorten the route.`,
          { q: `Walk position ${k + 1} is city ${nm(v)}. Keep it or shortcut past it?`, opts: ["keep it", "shortcut (already visited)"], ans: 1, why: `${nm(v)} is already on the tour: ${seqStr(tour)}.` });
      } else {
        seen.add(v);
        tour.push(v);
        push({ tour: tour.slice(), look: v, skip: false, k, base }, line, `Walk position ${k + 1}: ${nm(v)} is new, so it joins the tour: ${seqStr(tour)}.`,
          k > 0 ? { q: `Walk position ${k + 1} is city ${nm(v)}. Keep it or shortcut past it?`, opts: ["keep it", "shortcut (already visited)"], ans: 0, why: `${nm(v)} has not been visited yet.` } : null);
      }
    });
    tour.push(tour[0]);
    return tour;
  }

  /* ------------------------------------------------------------------ recorders */
  function recNN(s) {
    const n = P.length, frames = [];
    const tour = [s], vis = new Set([s]);
    let checks = 0;
    const push = (st, line, text, ask) => frames.push(Object.assign({ line, text, ask, c: { "tour length": f1(tourLen(tour)), "distance checks": checks } }, st));
    push({ tour: tour.slice(), cur: s }, 1, `Start at <b>${nm(s)}</b>. Greedy rule: always go to the nearest city not yet visited.`);
    let c = s;
    while (vis.size < n) {
      const cand = [];
      for (let v = 0; v < n; v++) if (!vis.has(v)) cand.push(v);
      checks += cand.length;
      const nx = cand.reduce((a, b) => (d(c, b) < d(c, a) ? b : a));
      const ask = { q: `From ${nm(c)}, which unvisited city is nearest?`, opts: cand.map(nm), ans: cand.indexOf(nx), why: `Distances from ${nm(c)}: ${cand.map((v) => `${nm(v)} ${f1(d(c, v))}`).join(", ")}.` };
      push({ tour: tour.slice(), cur: c, cands: cand.map((v) => [c, v]) }, [2, 3], `At ${nm(c)}: measure the distance to each of the ${cand.length} unvisited cities (dashed).`, null);
      frames[frames.length - 1].ask = ask;
      tour.push(nx);
      vis.add(nx);
      push({ tour: tour.slice(), cur: nx }, [3, 4], `Nearest is <b>${nm(nx)}</b> at distance ${f1(d(c, nx))}. Go there. Tour so far: ${seqStr(tour)}.`);
      c = nx;
    }
    tour.push(s);
    push({ tour: tour.slice(), final: true }, [5, 6], `Every city is visited, so return to ${nm(s)} (last leg ${f1(d(c, s))}). Tour ${seqStr(tour)} has length <b>${f1(tourLen(tour))}</b>. Note: the forced last leg is where nearest neighbor often pays dearly.`);
    return { tour, len: tourLen(tour), frames };
  }

  function recMF() {
    const n = P.length, frames = [], all = [];
    for (let u = 0; u < n; u++) for (let v = u + 1; v < n; v++) all.push([u, v]);
    all.sort((a, b) => d(a[0], a[1]) - d(b[0], b[1]));
    const deg = new Array(n).fill(0), par = [...Array(n).keys()];
    const find = (x) => (par[x] === x ? x : (par[x] = find(par[x])));
    const T = [];
    let exam = 0;
    const len = () => T.reduce((s, e) => s + d(e[0], e[1]), 0);
    const push = (st, line, text, ask) => frames.push(Object.assign({ line, text, ask, c: { "edges in T": T.length + " / " + n, "edges examined": exam, "length of T": f1(len()) } }, st));
    push({ frag: [] }, [1, 2], `Sort all ${all.length} edges by length. We will grab short edges greedily, as in Kruskal's algorithm, but keep every city's degree ≤ 2 and never close a cycle before all ${n} cities are in it.`);
    for (const [u, v] of all) {
      if (T.length === n) break;
      exam++;
      let verdict, why;
      if (deg[u] === 2 || deg[v] === 2) { verdict = 1; why = `${deg[u] === 2 ? nm(u) : nm(v)} already has two tour edges; a third would give it degree 3.`; }
      else if (find(u) === find(v) && T.length < n - 1) { verdict = 2; why = `${nm(u)} and ${nm(v)} are already ends of the same fragment, so (${nm(u)}, ${nm(v)}) would close a cycle that misses some of the ${n} cities.`; }
      else verdict = 0;
      const ask = { q: `Next shortest edge: (${nm(u)}, ${nm(v)}), length ${f1(d(u, v))}. What happens to it?`, opts: ["add it", "skip: degree 3", "skip: short cycle"], ans: verdict, why: verdict === 0 ? `Both endpoints have degree < 2 and no premature cycle forms.` : why };
      frames[frames.length - 1].ask = ask;
      if (verdict === 0) {
        T.push([u, v]); deg[u]++; deg[v]++; par[find(u)] = find(v);
        push({ frag: T.slice(), look: [u, v] }, [3, 8, 9], `Edge (${nm(u)}, ${nm(v)}) = ${f1(d(u, v))}: both ends have room and no short cycle forms, so <b>add</b> it. ${T.length} of ${n} edges.`);
      } else {
        push({ frag: T.slice(), rej: [u, v] }, verdict === 1 ? [4, 5] : [6, 7], `Edge (${nm(u)}, ${nm(v)}) = ${f1(d(u, v))}: <b>skip</b>. ${why}`);
      }
    }
    // convert edge set to a tour from city 0
    const adj = Array.from({ length: n }, () => []);
    T.forEach(([u, v]) => { adj[u].push(v); adj[v].push(u); });
    const tour = [0];
    let prev = -1, c = 0;
    for (let k = 0; k < n; k++) { const nx = adj[c][0] !== prev ? adj[c][0] : adj[c][1]; tour.push(nx); prev = c; c = nx; }
    push({ tour, final: true }, 9, `All ${n} edges are chosen and they form one cycle: ${seqStr(tour)}, length <b>${f1(tourLen(tour))}</b>.`);
    return { tour, len: tourLen(tour), frames };
  }

  function recTAT(s) {
    const n = P.length, frames = [];
    let mstW = 0, stage2 = "";
    const push = (st, line, text, ask, extra) => frames.push(Object.assign({ line, text, ask, c: Object.assign({ "MST weight": f1(mstW), "walk length": stage2 || "—", "tour length": st.tour ? f1(tourLen(st.tour.length > 1 && st.final ? st.tour : st.tour)) : "—" }, extra || {}) }, st));
    push({ mst: [] }, 1, `Stage 1: build a Minimum Spanning Tree (MST) with Prim's algorithm, starting from ${nm(s)}. An optimal tour minus one edge is a spanning tree, so w(MST) < f(optimal).`);
    const mst = prim(s, frames, (edges, u, v) => { mstW += d(u, v); push({ mst: edges, look: [u, v] }, 1, `Prim: the shortest edge from the tree to a new city is (${nm(u)}, ${nm(v)}) = ${f1(d(u, v))}. Add it.`); });
    const adj = Array.from({ length: n }, () => []);
    mst.forEach(([u, v]) => { adj[u].push(v); adj[v].push(u); });
    adj.forEach((a) => a.sort((x, y) => x - y));
    const walk = [];
    (function dfs(v, p) { walk.push(v); adj[v].forEach((u) => { if (u !== p) { dfs(u, v); walk.push(v); } }); })(s, -1);
    stage2 = f1(tourLen(walk));
    push({ mst, walkTo: walk.length, walk }, [2, 3], `Stage 2: walk around the tree with a Depth-First Search (DFS) from ${nm(s)}: ${seqStr(walk)}. Each tree edge is traversed twice, so the walk has length 2·w(MST) = ${stage2}.`);
    const tour = shortcutFrames(walk, mst, (st, line, text, ask) => push(Object.assign({ mst, walk }, st), line, text, ask), [4, 5]);
    push({ mst, tour, final: true }, 6, `Close the tour back at ${nm(s)}: ${seqStr(tour)}, length <b>${f1(tourLen(tour))}</b> ≤ walk ${stage2} = 2·w(MST) < 2·f(optimal).`);
    return { tour, len: tourLen(tour), frames };
  }

  function recCHR(s) {
    const n = P.length, frames = [];
    let mstW = 0, matchW = 0;
    const push = (st, line, text, ask) => frames.push(Object.assign({ line, text, ask, c: { "MST weight": f1(mstW), "matching weight": f1(matchW), "tour length": st.tour ? f1(tourLen(st.tour)) : "—" } }, st));
    push({ mst: [] }, 1, `Stage 1: build a Minimum Spanning Tree (MST) with Prim's algorithm from ${nm(s)}.`);
    const mst = prim(s, frames, (edges, u, v) => { mstW += d(u, v); push({ mst: edges, look: [u, v] }, 1, `Prim adds (${nm(u)}, ${nm(v)}) = ${f1(d(u, v))}.`); });
    const deg = new Array(n).fill(0);
    mst.forEach(([u, v]) => { deg[u]++; deg[v]++; });
    const odd = [];
    for (let v = 0; v < n; v++) if (deg[v] % 2) odd.push(v);
    push({ mst, odd }, 2, `Stage 2: the cities with an odd number of MST edges are ${odd.map(nm).join(", ")} (there is always an even number of them). An Euler circuit needs every degree even, so we will pair them up.`);
    const un = new Set(odd), match = [];
    while (un.size) {
      let bu = -1, bv = -1;
      const arr = [...un];
      for (let a = 0; a < arr.length; a++) for (let b = a + 1; b < arr.length; b++) if (bu < 0 || d(arr[a], arr[b]) < d(bu, bv)) { bu = arr[a]; bv = arr[b]; }
      un.delete(bu); un.delete(bv);
      match.push([bu, bv]);
      matchW += d(bu, bv);
      push({ mst, odd, match: match.slice(), look: [bu, bv] }, [3, 4], `Greedy matching: the closest pair of unmatched odd cities is ${nm(bu)}–${nm(bv)} (${f1(d(bu, bv))}). Add that edge. (True Christofides would pick the minimum-weight perfect matching overall.)`);
    }
    // Euler circuit (Hierholzer) on the multigraph MST + matching
    const adj = Array.from({ length: n }, () => []);
    const used = [];
    mst.concat(match).forEach(([u, v], k) => { adj[u].push([v, k]); adj[v].push([u, k]); used.push(false); });
    adj.forEach((a) => a.sort((x, y) => x[0] - y[0]));
    const stack = [s], circ = [];
    while (stack.length) {
      const v = stack[stack.length - 1];
      const nxt = adj[v].find(([, k]) => !used[k]);
      if (nxt) { used[nxt[1]] = true; stack.push(nxt[0]); } else circ.push(stack.pop());
    }
    circ.reverse();
    push({ mst, match, odd, walk: circ, walkTo: circ.length }, 5, `Stage 3: now every city has even degree, so the multigraph has an Euler circuit that uses each edge once: ${seqStr(circ)} (length ${f1(tourLen(circ))} = w(MST) + w(matching)).`);
    const tour = shortcutFrames(circ, mst.concat(match), (st, line, text, ask) => push(Object.assign({ mst, match, walk: circ }, st), line, text, ask), 6);
    push({ mst, match, tour, final: true }, 7, `Close the tour at ${nm(s)}: ${seqStr(tour)}, length <b>${f1(tourLen(tour))}</b>.`);
    return { tour, len: tourLen(tour), frames };
  }

  function recOpt2(s) {
    const n = P.length, frames = [];
    const base = recNN(s).tour.slice(0, -1); // cyclic order without the repeated start
    let t = base.slice(), checks = 0, imps = 0;
    const cyc = () => t.concat([t[0]]);
    const start = tourLen(cyc());
    const push = (st, line, text, ask) => frames.push(Object.assign({ line, text, ask, c: { "start length": f1(start), "tour length": f1(tourLen(cyc())), "pairs checked": checks, "2-changes": imps } }, st));
    push({ tour: cyc() }, 0, `Start from the nearest-neighbor tour from ${nm(s)}: ${seqStr(cyc())}, length ${f1(start)}. 2-opt repeatedly deletes two nonadjacent edges and reconnects the ends the other way, keeping the change only if the tour gets shorter.`);
    let improved = true, guard = 0;
    while (improved && guard++ < 200) {
      improved = false;
      let lastBad = null;
      outer: for (let i = 0; i < n - 1; i++) {
        for (let j = i + 2; j < n; j++) {
          if (i === 0 && j === n - 1) continue; // adjacent through the wrap-around
          checks++;
          const a = t[i], b = t[i + 1], c = t[j], dd = t[(j + 1) % n];
          const delta = d(a, c) + d(b, dd) - d(a, b) - d(c, dd);
          if (delta < -1e-9) {
            if (lastBad) {
              const [la, lb, lc, ld, ldel] = lastBad;
              push({ tour: cyc(), del: [[la, lb], [lc, ld]], add: [[la, lc], [lb, ld]] }, [3, 4, 5], `Try removing (${nm(la)},${nm(lb)}) and (${nm(lc)},${nm(ld)}) and adding (${nm(la)},${nm(lc)}), (${nm(lb)},${nm(ld)}): change = ${ldel >= 0 ? "+" : ""}${f1(ldel)}. Not shorter, so keep looking.`,
                { q: `Would swapping to (${nm(la)},${nm(lc)}) + (${nm(lb)},${nm(ld)}) shorten the tour?`, opts: ["yes", "no"], ans: 1, why: `New edges ${f1(d(la, lc) + d(lb, ld))} vs. old ${f1(d(la, lb) + d(lc, ld))}.` });
            }
            push({ tour: cyc(), del: [[a, b], [c, dd]], add: [[a, c], [b, dd]] }, [3, 4, 5], `Candidate: remove (${nm(a)},${nm(b)}) and (${nm(c)},${nm(dd)}) (red), add (${nm(a)},${nm(c)}) and (${nm(b)},${nm(dd)}) (green). Old pair ${f1(d(a, b) + d(c, dd))}, new pair ${f1(d(a, c) + d(b, dd))}.`,
              { q: `Would swapping to (${nm(a)},${nm(c)}) + (${nm(b)},${nm(dd)}) shorten the tour?`, opts: ["yes", "no"], ans: 0, why: `New edges ${f1(d(a, c) + d(b, dd))} < old ${f1(d(a, b) + d(c, dd))}: saves ${f1(-delta)}.` });
            const seg = t.slice(i + 1, j + 1).reverse();
            t = t.slice(0, i + 1).concat(seg, t.slice(j + 1));
            imps++;
            push({ tour: cyc(), justAdd: [[a, c], [b, dd]] }, [6, 7], `Apply the 2-change (reverse the stretch ${nm(b)} … ${nm(c)}). Tour shrinks by ${f1(-delta)} to <b>${f1(tourLen(cyc()))}</b>.`);
            improved = true;
            break outer;
          } else lastBad = [a, b, c, dd, delta];
        }
      }
    }
    const fin = cyc();
    push({ tour: fin, final: true }, [8, 9], `No 2-change shortens the tour any more: it is <b>2-optimal</b> (a local optimum). Length ${f1(start)} → <b>${f1(tourLen(fin))}</b> after ${imps} improvement${imps === 1 ? "" : "s"} and ${checks} pair checks.`);
    return { tour: fin, len: tourLen(fin), frames };
  }

  function recExact(s, quiet) {
    const n = P.length, frames = [];
    if (n > 9) return null;
    const rest = [];
    for (let v = 0; v < n; v++) if (v !== s) rest.push(v);
    let best = Infinity, bestT = null, checked = 0;
    const totalT = rest.length <= 1 ? 1 : fact(rest.length) / 2;
    const push = (st, line, text) => frames.push(Object.assign({ line, text, c: { "tours checked": checked + " / " + totalT.toLocaleString(), "best length": best === Infinity ? "∞" : f1(best) } }, st));
    if (!quiet) push({ tour: [] }, 1, `Fix ${nm(s)} as the start and try every order of the other ${rest.length} cities; a tour and its reverse are the same, so there are (n − 1)!/2 = ${totalT.toLocaleString()} distinct tours.`);
    const every = Math.max(1, Math.floor(totalT / 25));
    const perm = rest.slice();
    (function permute(k) {
      if (k === perm.length) {
        if (perm.length > 1 && perm[0] > perm[perm.length - 1]) return; // skip reversed duplicates
        checked++;
        const t = [s].concat(perm, [s]);
        const L = tourLen(t);
        if (L < best - 1e-9) {
          best = L; bestT = t;
          if (!quiet) push({ tour: t, bestTour: t }, [4, 5, 6], `Tour #${checked}: ${seqStr(t)} has length ${f1(L)}: a <b>new best</b>.`);
        } else if (!quiet && checked % every === 0) push({ tour: t, bestTour: bestT, dim: true }, [3, 4], `Tour #${checked}: ${seqStr(t)}, length ${f1(L)}, is not better than ${f1(best)}. (Only every ${every}th non-improving tour is shown.)`);
        return;
      }
      for (let i = k; i < perm.length; i++) {
        [perm[k], perm[i]] = [perm[i], perm[k]];
        permute(k + 1);
        [perm[k], perm[i]] = [perm[i], perm[k]];
      }
    })(0);
    if (!bestT) bestT = [s].concat(rest, [s]);
    if (!quiet) push({ tour: bestT, final: true }, 7, `Checked all ${checked.toLocaleString()} tours. The optimal tour is ${seqStr(bestT)}, length <b>${f1(best)}</b>. This is f(s*), the yardstick for every accuracy ratio.`);
    return { tour: bestT, len: tourLen(bestT), frames };
  }
  const fact = (k) => (k <= 1 ? 1 : k * fact(k - 1));

  /* ------------------------------------------------------------------ drawing */
  const EST = {
    tour: ["var(--ember)", 3.5, ""], mst: ["var(--c-active)", 3, ""], match: ["var(--c-pivot)", 3, "8 6"],
    cand: ["var(--c-compare)", 1.5, "5 5"], rej: ["var(--c-swap)", 3, "6 5"], del: ["var(--c-swap)", 4, "8 6"],
    add: ["var(--c-done)", 4, ""], look: ["var(--c-compare)", 5, ""], ghost: ["var(--muted)", 1.5, "3 6"], frag: ["var(--ember)", 3.5, ""], faint: ["var(--line-2)", 2, ""],
  };
  function line(u, v, k, g) {
    const s = EST[k];
    g.appendChild(S("line", { x1: P[u][0], y1: P[u][1], x2: P[v][0], y2: P[v][1], stroke: s[0], "stroke-width": s[1], "stroke-dasharray": s[2], "stroke-linecap": "round", opacity: k === "faint" ? 0.9 : 1 }));
  }
  function draw(f) {
    stage.setAttribute("viewBox", `0 0 ${W} ${H}`);
    stage.innerHTML = "";
    const g = S("g", null);
    stage.appendChild(g);
    if (!P.length) {
      g.appendChild(S("text", { x: W / 2, y: H / 2, "text-anchor": "middle", "font-size": 18, fill: "var(--muted)" }, "Click anywhere to place cities (need at least 4)."));
      return;
    }
    const n = P.length;
    if ($("ghost").checked && cache && cache.exact && !(alg === "exact")) {
      const t = cache.exact.tour;
      for (let k = 0; k + 1 < t.length; k++) line(t[k], t[k + 1], "ghost", g);
    }
    if (f) {
      (f.mst || []).forEach(([u, v]) => line(u, v, f.tour && f.tour.length > 1 ? "faint" : "mst", g));
      (f.match || []).forEach(([u, v]) => line(u, v, "match", g));
      (f.cands || []).forEach(([u, v]) => line(u, v, "cand", g));
      (f.frag || []).forEach(([u, v]) => line(u, v, "frag", g));
      if (f.bestTour && f.dim) for (let k = 0; k + 1 < f.bestTour.length; k++) line(f.bestTour[k], f.bestTour[k + 1], "tour", g);
      if (f.tour) for (let k = 0; k + 1 < f.tour.length; k++) {
        if (f.del && f.del.some(([a, b]) => (a === f.tour[k] && b === f.tour[k + 1]) || (b === f.tour[k] && a === f.tour[k + 1]))) continue;
        line(f.tour[k], f.tour[k + 1], f.dim ? "cand" : f.final ? "tour" : "tour", g);
      }
      (f.del || []).forEach(([u, v]) => line(u, v, "del", g));
      (f.add || []).forEach(([u, v]) => line(u, v, "add", g));
      (f.justAdd || []).forEach(([u, v]) => line(u, v, "add", g));
      if (f.rej) line(f.rej[0], f.rej[1], "rej", g);
      if (f.look && Array.isArray(f.look)) line(f.look[0], f.look[1], "look", g);
      if (f.cands && f.cur != null) f.cands.forEach(([u, v]) => {
        g.appendChild(S("text", { x: (P[u][0] + P[v][0]) / 2, y: (P[u][1] + P[v][1]) / 2 - 4, "text-anchor": "middle", "font-size": 12, fill: "var(--ink-2)" }, f1(d(u, v))));
      });
      if (f.walk) {
        const str = "walk: " + f.walk.map((v, k) => (f.k != null && k === f.k ? "[" + nm(v) + "]" : nm(v))).join(" ");
        g.appendChild(S("text", { x: 12, y: H - 12, "font-size": 15, fill: "var(--ink-2)" }, str));
      }
    }
    const inTour = new Set(f && f.tour ? f.tour : []);
    const odd = new Set(f && f.odd ? f.odd : []);
    for (let i = 0; i < n; i++) {
      let fill = "var(--panel-2)", ink = "var(--ink)";
      if (inTour.has(i)) { fill = f.final ? "var(--c-done)" : "var(--c-active)"; ink = "#0d1117"; }
      if (odd.has(i) && !inTour.has(i)) { fill = "var(--c-pivot)"; ink = "#0d1117"; }
      if (f && (f.cur === i || (typeof f.look === "number" && f.look === i))) { fill = f.skip ? "var(--c-swap)" : "var(--c-compare)"; ink = "#0d1117"; }
      const isStart = (alg === "nn" || alg === "tat" || alg === "chr" || alg === "opt2" || alg === "exact") && i === startCity();
      g.appendChild(S("circle", { cx: P[i][0], cy: P[i][1], r: 15, fill, stroke: isStart ? "var(--ember)" : "var(--line-2)", "stroke-width": isStart ? 4 : 2 }));
      g.appendChild(S("text", { x: P[i][0], y: P[i][1] + 5, "text-anchor": "middle", "font-size": 14, "font-weight": 700, style: `fill:${ink}` }, nm(i)));
    }
  }

  /* ------------------------------------------------------------------ predict */
  let player = null;
  function showAsk(f, i) {
    const box = $("ask");
    if (!f || !f.ask || !$("predict").checked) { box.hidden = true; box.innerHTML = ""; return; }
    const a = f.ask, key = alg + ":" + i, got = answered[key];
    box.hidden = false;
    box.innerHTML = "";
    box.appendChild(E("div", { class: "panel-title" }, "🤔 Predict before you step"));
    box.appendChild(E("p", { html: a.q }));
    const row = E("div", { class: "row" });
    a.opts.forEach((o, k) => {
      const cls = got == null ? "btn sm" : k === a.ans ? "btn sm pick-ok" : k === got ? "btn sm pick-bad" : "btn sm";
      row.appendChild(E("button", { class: cls, disabled: got != null, onclick: () => { answered[key] = k; showAsk(f, i); } }, o));
    });
    box.appendChild(row);
    if (got == null) { if (player) player.pause(); return; }
    box.appendChild(E("div", { class: "callout fb " + (got === a.ans ? "ok" : "bad"), html: (got === a.ans ? "<b>✔ Right.</b> " : `<b>✘ Not quite: it's “${a.opts[a.ans]}”.</b> `) + a.why }));
    box.appendChild(E("div", { class: "row", style: { marginTop: "8px" } }, E("button", { class: "btn primary sm", onclick: () => player.go(i + 1) }, "Show me ▶|")));
  }

  /* ------------------------------------------------------------------ results table */
  function computeAll() {
    const s = startCity();
    const n = P.length;
    cache = { n };
    if (n < 4) return;
    cache.exact = n <= 9 ? recExact(s, true) : null;
    ["nn", "mf", "tat", "chr", "opt2"].forEach((k) => (cache[k] = { nn: recNN, mf: recMF, tat: recTAT, chr: recCHR, opt2: recOpt2 }[k](s)));
    cache.mst = prim(0).reduce((sum, [u, v]) => sum + d(u, v), 0);
  }
  function buildTable() {
    const t = $("res");
    t.innerHTML = "";
    const n = P.length;
    if (n < 4) { $("resNote").textContent = "Place at least 4 cities."; return; }
    const ref = cache.exact ? cache.exact.len : null;
    const logB = 0.5 * (Math.ceil(Math.log2(n)) + 1);
    const G = { nn: "≤ " + logB.toFixed(1), mf: "≤ " + logB.toFixed(1), tat: "< 2", chr: "(1.5 needs min matching)", opt2: "none proven", exact: "1" };
    t.appendChild(E("tr", null, E("th", null, "algorithm"), E("th", null, "length"), E("th", null, ref ? "r = f / f*" : "f / w(MST) ≥ r"), E("th", null, "Euclidean bound")));
    ["exact", "nn", "mf", "tat", "chr", "opt2"].forEach((k) => {
      const res = cache[k];
      const lenTxt = res ? f1(res.len) : "—";
      const r = res ? (ref ? (res.len / ref).toFixed(3) : (res.len / (cache.mst || 1)).toFixed(3)) : "n > 9";
      const tr = E("tr", { class: k === alg ? "on" : "" },
        E("td", null, E("button", { onclick: () => { $("alg").value = k; alg = k; setup(); } }, NAMES[k])),
        E("td", { class: "n" }, lenTxt), E("td", { class: "n" }, k === "exact" && !res ? "—" : r), E("td", null, G[k]));
      t.appendChild(tr);
    });
    $("resNote").textContent = ref
      ? `f* = ${f1(ref)} (optimal, by exhaustive search). Click an algorithm to animate it. Start city for nearest neighbor, the tree walks and 2-opt: ${nm(startCity())}.`
      : `With n = ${n}, exhaustive search would need ${(fact(n - 1) / 2).toLocaleString()} tours, so the optimum is not computed. w(MST) = ${f1(cache.mst)} < f*, so each f / w(MST) overestimates the true ratio.`;
  }

  /* ------------------------------------------------------------------ setup / run */
  const startCity = () => Math.min(P.length - 1, Math.max(0, +$("start").value || 0));
  function fillStart() {
    const sel = $("start"), keep = +sel.value || 0;
    sel.innerHTML = "";
    P.forEach((_, i) => sel.appendChild(E("option", { value: i }, nm(i))));
    sel.value = String(Math.min(keep, Math.max(0, P.length - 1)));
    sel.disabled = alg === "mf";
  }
  function render(f, i) {
    draw(f);
    code.highlight(f.line);
    ctr.set(f.c);
    say.say(f.text);
    showAsk(f, i);
  }
  player = Forge.player($("player"), { frames: [], render, fps: 2 });
  function setup() {
    Object.keys(answered).forEach((k) => delete answered[k]);
    $("code").innerHTML = "";
    $("ctr").innerHTML = "";
    code = Forge.code($("code"), CODE[alg]);
    fillStart();
    computeAll();
    buildTable();
    const n = P.length;
    if (n < 4) {
      ctr = Forge.counters($("ctr"), { cities: n });
      player.load([]);
      draw(null);
      say.say("Place at least 4 cities to run a tour algorithm.");
      return;
    }
    if (alg === "exact" && n > 9) {
      ctr = Forge.counters($("ctr"), { cities: n });
      player.load([]);
      draw(null);
      say.say(`Exhaustive search is switched off for n = ${n}: it would examine (n − 1)!/2 = ${(fact(n - 1) / 2).toLocaleString()} tours. Remove cities (n ≤ 9) or pick a heuristic.`);
      return;
    }
    const s = startCity();
    const R = alg === "exact" ? recExact(s, false) : { nn: recNN, mf: recMF, tat: recTAT, chr: recCHR, opt2: recOpt2 }[alg](s);
    const ref = cache.exact ? cache.exact.len : null;
    const last = R.frames[R.frames.length - 1];
    last.text += ref ? ` Accuracy ratio r = ${f1(R.len)} / ${f1(ref)} = <b>${(R.len / ref).toFixed(3)}</b>.` : "";
    const init = Object.assign({}, R.frames[0].c);
    ctr = Forge.counters($("ctr"), Object.assign(init, ref ? { "optimal f*": f1(ref) } : {}));
    R.frames.forEach((fr) => { if (ref) fr.c["optimal f*"] = f1(ref); });
    cur = R;
    player.load(R.frames);
  }

  function svgPoint(ev) {
    const pt = stage.createSVGPoint();
    pt.x = ev.clientX; pt.y = ev.clientY;
    return pt.matrixTransform(stage.getScreenCTM().inverse());
  }
  stage.addEventListener("click", (ev) => {
    const p = svgPoint(ev);
    const hit = P.findIndex((q) => Math.hypot(q[0] - p.x, q[1] - p.y) < 22);
    if (hit >= 0) P.splice(hit, 1);
    else if (P.length < 12) P.push([Math.max(20, Math.min(W - 20, Math.round(p.x))), Math.max(20, Math.min(H - 30, Math.round(p.y)))]);
    else { say.say("Twelve cities is the limit here; click a city to remove it first."); return; }
    setup();
  });
  $("alg").onchange = () => { alg = $("alg").value; setup(); };
  $("start").onchange = setup;
  $("ghost").onchange = () => { if (player.frames.length) render(player.frames[player.index], player.index); else draw(null); };
  $("predict").onchange = () => { if (player.frames.length) render(player.frames[player.index], player.index); };
  $("rn").oninput = () => ($("nval").textContent = $("rn").value);
  $("rand").onclick = () => {
    const n = +$("rn").value;
    P = [];
    let guard = 0;
    while (P.length < n && guard++ < 5000) {
      const q = [40 + Math.random() * (W - 80), 40 + Math.random() * (H - 90)];
      if (P.every((r) => Math.hypot(r[0] - q[0], r[1] - q[1]) > 60)) P.push(q.map(Math.round));
    }
    setup();
  };
  $("preset").onclick = () => { P = PRESET.map((p) => p.slice()); setup(); };
  $("clear").onclick = () => { P = []; setup(); };

  setup();
})();
