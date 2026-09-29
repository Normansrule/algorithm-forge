/* Exhaustive search: TSP (all tours), 0/1 knapsack (all subsets), assignment (all permutations), explosion chart. */
(function () {
  "use strict";
  Forge.page({ title: "Exhaustive Search", chapter: "Ch 3 · Brute Force" });
  const $ = (id) => document.getElementById(id);
  const S = Forge.svg, E = Forge.el;
  const stage = $("stage");
  const say = Forge.narrate($("say"));
  const pred = FX.predict($("predict"));
  let code = null, ctr = null, runId = 0, mode = "tsp", renderFn = () => {};
  const L = (i) => String.fromCharCode(97 + i); // city label

  function setCode(lines) { $("code").innerHTML = ""; code = Forge.code($("code"), lines); }
  function setCounters(o) { $("ctr").innerHTML = ""; ctr = Forge.counters($("ctr"), o); }
  function setLegend(items) {
    $("legend").innerHTML = items.map(([c, t, dash]) => `<span><i style="background:${c};${dash ? "height:3px;vertical-align:3px;width:16px" : ""}"></i>${t}</span>`).join("");
  }
  const player = Forge.player($("player"), {
    frames: [], fps: 4,
    render(f, i, fr) {
      renderFn(f, i, fr);
      code.highlight(f.line);
      say.say(f.text);
      if (f.ask) { const key = runId + ":" + i; pred.show(f.ask, key); if (pred.shouldPause(key)) player.pause(); }
      else pred.hide();
    },
  });
  function load(frames) { runId++; player.load(frames); }
  const fact = (n) => { let r = 1; for (let k = 2; k <= n; k++) r *= k; return r; };

  /** next permutation in lexicographic order (in place); false when done */
  function nextPerm(a) {
    let i = a.length - 2;
    while (i >= 0 && a[i] >= a[i + 1]) i--;
    if (i < 0) return false;
    let j = a.length - 1;
    while (a[j] <= a[i]) j--;
    [a[i], a[j]] = [a[j], a[i]];
    for (let l = i + 1, r = a.length - 1; l < r; l++, r--) [a[l], a[r]] = [a[r], a[l]];
    return true;
  }
  function shuffleOpts(ans, pool) {
    const set = [ans];
    for (const p of pool) if (!set.includes(p) && set.length < 4) set.push(p);
    return set.sort((a, b) => a - b).map((v) => ({ label: FX.fmt(v), value: v }));
  }

  /* ================================================================ TSP */
  const tsp = { cities: [], D: null, weights: true, skip: false };
  const TSP_W = 760, TSP_H = 400;
  function tspPreset() {
    tsp.weights = true;
    tsp.cities = [{ x: 210, y: 80 }, { x: 550, y: 80 }, { x: 210, y: 320 }, { x: 550, y: 320 }];
    // Levitin's classic 4-city instance (Fig. 3.7): ab=2, ac=5, ad=7, bc=8, bd=3, cd=1
    tsp.D = [[0, 2, 5, 7], [2, 0, 8, 3], [5, 8, 0, 1], [7, 3, 1, 0]];
  }
  function tspEuclid() {
    tsp.weights = false;
    const n = tsp.cities.length;
    tsp.D = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) =>
      Math.round(Math.hypot(tsp.cities[i].x - tsp.cities[j].x, tsp.cities[i].y - tsp.cities[j].y) / 10)));
  }
  function tspRandom(n) {
    const r = Forge.rng(Date.now());
    tsp.cities = [];
    let guard = 0;
    while (tsp.cities.length < n && guard++ < 2000) {
      const c = { x: 60 + Math.round(r() * 640), y: 50 + Math.round(r() * 300) };
      if (tsp.cities.every((d) => Math.hypot(d.x - c.x, d.y - c.y) > 90)) tsp.cities.push(c);
    }
    tspEuclid();
  }
  const TSP_LINES = [
    "ALGORITHM TSPExhaustive(D[0..n-1, 0..n-1])",
    "    // Try every tour that starts and ends at city 0 (= a)",
    "    best ← ∞",
    "    for each permutation p of the cities 1, ..., n − 1 do",
    "        len ← D[0, p[1]]",
    "        for k ← 1 to n − 2 do",
    "            len ← len + D[p[k], p[k + 1]]",
    "        len ← len + D[p[n − 1], 0]",
    "        if len < best then",
    "            best ← len;  bestTour ← p",
    "    return bestTour, best",
  ];
  function tspRecord() {
    const n = tsp.cities.length, D = tsp.D;
    const total = fact(n - 1), target = tsp.skip && n >= 3 ? total / 2 : total;
    const frames = [];
    const p = Array.from({ length: n - 1 }, (_, k) => k + 1);
    let best = Infinity, bestTour = null, tried = 0, lookups = 0;
    const seen = new Map(); // key of reversed tour -> index
    const rows = [];
    let askedMirror = false;
    const push = (o) => frames.push(Object.assign({ tried, lookups, best, bestTour, rows: rows.length, total: target }, o));
    const countAsk = {
      q: `With n = ${n} cities and the start fixed at <b>a</b>, how many tours will this loop generate${tsp.skip ? " (mirror tours skipped)" : ""}?`,
      options: shuffleOpts(target, [fact(n), total, total / 2, (n - 1) * (n - 1), n * n].filter((x) => x >= 1 && Number.isInteger(x))),
      answer: target,
      why: tsp.skip ? `(n−1)!/2 = ${FX.fmt(target)}: fixing the start removes n rotations, and keeping only tours where b comes before c removes the mirror images.` : `(n−1)! = ${FX.fmt(total)}: the start is fixed, and the other ${n - 1} cities can be visited in any order.`,
    };
    push({ line: 2, cur: null, text: `Start: ${n} cities. Exhaustive search will try every order of the ${n - 1} cities after <b>a</b> and keep the shortest loop. best = ∞ for now.`, ask: countAsk });
    do {
      if (tsp.skip && n >= 3) { if (p.indexOf(1) > p.indexOf(2)) continue; }
      const tour = [0, ...p, 0];
      const terms = [];
      for (let k = 0; k < n; k++) terms.push(D[tour[k]][tour[k + 1]]);
      const len = terms.reduce((a, b) => a + b, 0);
      const name = tour.map(L).join("→");
      const mirrorOf = seen.get(p.join(","));
      seen.set(p.slice().reverse().join(","), rows.length);
      if (mirrorOf !== undefined && !askedMirror && !tsp.skip) {
        askedMirror = true;
        const pool = [...new Set(rows.map((r) => r.len))];
        push({ line: 3, cur: tour, hideLen: true, text: `Next tour: <b>${name}</b>. Look closely: it is tour #${mirrorOf + 1} (${rows[mirrorOf].name}) driven backwards. Predict its length before stepping on.`,
          ask: { q: `Tour ${name} is tour #${mirrorOf + 1} reversed. What is its length?`, options: shuffleOpts(rows[mirrorOf].len, pool.concat([len + 3, len + 5, len - 2].filter((x) => x > 0))), answer: len,
            why: `Same roads, opposite direction, so the same total: ${len}. That's why only (n−1)!/2 tours are really different.` } });
      }
      tried++; lookups += n;
      rows.push({ name, len, terms, mirror: mirrorOf });
      push({ line: [3, 4, 5, 6, 7], cur: tour, text: `Tour #${tried}: <b>${name}</b>. Add up its ${n} legs: ${terms.join(" + ")} = <b>${len}</b>.` + (mirrorOf !== undefined ? ` (Mirror of tour #${mirrorOf + 1}.)` : "") });
      if (len < best) {
        const old = best;
        best = len; bestTour = tour;
        push({ line: [8, 9], cur: tour, improved: true, text: `${len} < ${old === Infinity ? "∞" : old}, so this is the <b>new best tour</b>. Remember it.` });
      } else {
        push({ line: 8, cur: tour, text: `${len} is not shorter than the best so far (${best}). Throw this tour away.` });
      }
    } while (nextPerm(p));
    push({ line: 10, cur: null, text: `Done. We tried all ${FX.fmt(tried)} tours and needed ${FX.fmt(lookups)} distance look-ups. Shortest tour: <b>${bestTour.map(L).join("→")}</b> with length <b>${best}</b>. No shortcut guaranteed this; only trying everything did.` });
    frames.rowsData = rows;
    return frames;
  }
  function tspRender(f, i, frames) {
    const n = tsp.cities.length, C = tsp.cities, D = tsp.D;
    stage.setAttribute("viewBox", `0 0 ${TSP_W} ${TSP_H}`);
    stage.innerHTML = "";
    const showW = n <= 6;
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
      stage.appendChild(S("line", { x1: C[a].x, y1: C[a].y, x2: C[b].x, y2: C[b].y, stroke: "var(--line-2)", "stroke-width": 1.2 }));
    }
    const drawTour = (t, col, w, dash) => {
      for (let k = 0; k + 1 < t.length; k++) {
        const A = C[t[k]], B = C[t[k + 1]];
        stage.appendChild(S("line", { x1: A.x, y1: A.y, x2: B.x, y2: B.y, stroke: col, "stroke-width": w, "stroke-linecap": "round", "stroke-dasharray": dash || null, opacity: 0.95 }));
      }
    };
    if (f.bestTour) drawTour(f.bestTour, "var(--c-done)", 11, null);
    if (f.cur) drawTour(f.cur, "var(--steel)", 3.5, f.hideLen ? "8 6" : null);
    if (showW) for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
      // the two diagonals of the 4-city square cross in the middle: label them nearer their top ends
      const t = n === 4 && tsp.weights && ((a === 0 && b === 3) || (a === 1 && b === 2)) ? 0.27 : 0.5;
      const mx = C[a].x + t * (C[b].x - C[a].x), my = C[a].y + t * (C[b].y - C[a].y), off = 0;
      stage.appendChild(S("rect", { x: mx + off - 14, y: my - 10, width: 28, height: 19, rx: 5, fill: "var(--panel)", stroke: "var(--line)" }));
      stage.appendChild(S("text", { x: mx + off, y: my + 4, "text-anchor": "middle", "font-size": 12, fill: "var(--ink-2)" }, String(D[a][b])));
    }
    C.forEach((c, k) => {
      const inCur = f.cur ? f.cur.indexOf(k) : -1;
      stage.appendChild(S("circle", { cx: c.x, cy: c.y, r: 19, fill: k === 0 ? "var(--ember)" : "var(--panel-2)", stroke: k === 0 ? "var(--ember)" : "var(--line-2)", "stroke-width": 2 }));
      stage.appendChild(S("text", { x: c.x, y: c.y + 5, "text-anchor": "middle", "font-size": 15, "font-weight": 700, fill: k === 0 ? "#1b0f05" : "var(--ink)" }, L(k)));
      if (inCur > 0) stage.appendChild(S("text", { x: c.x + 22, y: c.y - 16, "font-size": 12, "font-weight": 700, fill: "var(--steel)" }, String(inCur)));
    });
    const lenTxt = f.cur && !f.hideLen ? `current: ${frames.rowsData[Math.max(0, f.rows - 1)].len}` : f.cur ? "current: ?" : "";
    stage.appendChild(S("text", { x: 14, y: TSP_H - 14, "font-size": 13, fill: "var(--ink-2)" }, `${lenTxt}${lenTxt ? "   " : ""}best: ${f.best === Infinity ? "∞" : f.best}`));
    stage.appendChild(S("text", { x: TSP_W - 14, y: TSP_H - 14, "font-size": 12, "text-anchor": "end", fill: "var(--muted)" }, "click empty space to add a city · click a city to remove it"));
    ctr.set({ "tours tried": FX.fmt(f.tried), [tsp.skip ? "(n−1)!/2" : "(n−1)!"]: FX.fmt(f.total), "distance look-ups": FX.fmt(f.lookups), "best length": f.best === Infinity ? "∞" : f.best });
    // list
    const rows = frames.rowsData, upto = f.rows;
    const bestIdx = f.bestTour ? rows.findIndex((r, k) => k < upto && r.len === f.best) : -1;
    const start = Math.max(0, upto - 12);
    let html = "";
    if (start > 0) html += `<div class="muted">… ${start} earlier tours …</div>`;
    for (let k = start; k < upto; k++) {
      const r = rows[k];
      html += `<div class="${k === upto - 1 && !f.hideLen ? "cur " : ""}${k === bestIdx ? "best" : ""}">#${k + 1} ${r.name} &nbsp; ℓ = ${r.terms.join(" + ") + " = " + r.len}${r.mirror !== undefined ? ` <span class="muted">(mirror of #${r.mirror + 1})</span>` : ""}${k === bestIdx ? " ← best" : ""}</div>`;
    }
    if (bestIdx >= 0 && bestIdx < start) html += `<div class="best">best so far: #${bestIdx + 1} ${rows[bestIdx].name} ℓ = ${rows[bestIdx].len}</div>`;
    if (f.hideLen) html += `<div class="cur">#${upto + 1} ${f.cur.map(L).join("→")} &nbsp; ℓ = ?</div>`;
    $("extra").innerHTML = `<div class="tourlist">${html || '<span class="muted">No tours yet.</span>'}</div>`;
  }
  stage.addEventListener("click", (e) => {
    if (mode !== "tsp") return;
    const p = FX.pt(stage, e);
    const hit = tsp.cities.findIndex((c) => Math.hypot(c.x - p.x, c.y - p.y) < 24);
    if (hit >= 0) { if (tsp.cities.length <= 3) return; tsp.cities.splice(hit, 1); }
    else { if (tsp.cities.length >= 8) { say.say("Eight cities is the limit here: 7! = 5,040 tours already makes a long animation."); return; } tsp.cities.push({ x: Math.round(Math.max(30, Math.min(730, p.x))), y: Math.round(Math.max(30, Math.min(370, p.y))) }); }
    tspEuclid();
    if ($("tspN")) $("tspN").value = tsp.cities.length;
    load(tspRecord());
  });

  /* ============================================================ KNAPSACK */
  const knap = { w: [7, 3, 4, 5], v: [42, 12, 40, 25], W: 10, order: "size" };
  const KNAP_LINES = [
    "ALGORITHM KnapsackExhaustive(w[1..n], v[1..n], W)",
    "    bestValue ← 0;  bestSet ← ∅",
    "    for each subset S of {1, ..., n} do",
    "        weight ← sum of w[i] over all i in S",
    "        if weight ≤ W then",
    "            value ← sum of v[i] over all i in S",
    "            if value > bestValue then",
    "                bestValue ← value;  bestSet ← S",
    "    return bestSet, bestValue",
  ];
  function subsetsInOrder(n, order) {
    const out = [];
    if (order === "binary") {
      for (let m = 0; m < 1 << n; m++) { const s = []; for (let i = 0; i < n; i++) if (m & (1 << (n - 1 - i))) s.push(i); out.push(s); }
      return out;
    }
    const rec = (start, k, cur) => { if (cur.length === k) { out.push(cur.slice()); return; } for (let i = start; i < n; i++) { cur.push(i); rec(i + 1, k, cur); cur.pop(); } };
    for (let k = 0; k <= n; k++) rec(0, k, []);
    return out;
  }
  const setName = (s) => (s.length ? "{" + s.map((i) => i + 1).join(", ") + "}" : "∅");
  function knapRecord() {
    const n = knap.w.length, subs = subsetsInOrder(n, knap.order), frames = [];
    let best = 0, bestSet = [], examined = 0, feasible = 0, bestRow = 0;
    const rows = subs.map((s) => { const wt = s.reduce((a, i) => a + knap.w[i], 0), val = s.reduce((a, i) => a + knap.v[i], 0); return { s, wt, val, ok: wt <= knap.W }; });
    const push = (o) => frames.push(Object.assign({ examined, feasible, best, bestSet: bestSet.slice(), bestRow }, o));
    const total = 1 << n;
    push({ line: 1, cur: -1, text: `Start: ${n} items, capacity W = ${knap.W}. We'll generate all subsets of the items, skip the ones that are too heavy, and keep the most valuable one.`,
      ask: { q: `How many subsets will be generated for n = ${n} items?`, options: shuffleOpts(total, [n * n, fact(n), 2 * n, total / 2, n]), answer: total, why: `2ⁿ = ${total}: each item is either in or out, independently — two choices, n times.` } });
    let asked = false;
    rows.forEach((r, k) => {
      if (!asked && !r.ok && k > 0) {
        asked = true;
        push({ line: 2, cur: k, hideW: true, text: `Next subset: <b>${setName(r.s)}</b>. Before we add up its weight: will it fit in the knapsack?`,
          ask: { q: `Does <b>${setName(r.s)}</b> fit in capacity W = ${knap.W}? (weights: ${r.s.map((i) => knap.w[i]).join(" + ")})`, options: [{ label: "Yes, it fits", value: "y" }, { label: "No, too heavy", value: "n" }], answer: "n",
            why: `${r.s.map((i) => knap.w[i]).join(" + ")} = ${r.wt} > ${knap.W}. Not feasible: we don't even need its value.` } });
      }
      examined++;
      if (!r.ok) { push({ line: [3, 4], cur: k, text: `Subset <b>${setName(r.s)}</b>: total weight ${r.wt} &gt; W = ${knap.W}. <b>Not feasible</b>, skip it.` }); return; }
      feasible++;
      if (r.val > best) {
        const old = best; best = r.val; bestSet = r.s; bestRow = k;
        push({ line: [3, 4, 5, 6, 7], cur: k, text: `Subset <b>${setName(r.s)}</b>: weight ${r.wt} ≤ ${knap.W}, feasible. Value $${r.val} &gt; $${old}, so it is the <b>new best</b>.` });
      } else push({ line: [3, 4, 5, 6], cur: k, text: `Subset <b>${setName(r.s)}</b>: weight ${r.wt} ≤ ${knap.W}, feasible. Value $${r.val} is not better than $${best}.` });
    });
    push({ line: 8, cur: -1, text: `Done after all ${total} subsets (${feasible} feasible). Best: <b>${setName(bestSet)}</b> worth <b>$${best}</b>. The work was Θ(2ⁿ) no matter how cleverly we list the subsets.` });
    frames.rows = rows;
    return frames;
  }
  let knapTableFor = null;
  function knapBuildTable(frames) {
    const rows = frames.rows, n = knap.w.length;
    const bin = knap.order === "binary";
    let h = `<table class="t"><thead><tr>${bin ? "<th>bits</th>" : ""}<th>Subset</th><th>Total weight</th><th>Total value</th></tr></thead><tbody>`;
    rows.forEach((r, k) => {
      const bits = Array.from({ length: n }, (_, i) => (r.s.includes(i) ? 1 : 0)).join("");
      h += `<tr data-k="${k}" class="hide">${bin ? `<td>${bits}</td>` : ""}<td>${setName(r.s)}</td><td>${r.wt}</td><td class="${r.ok ? "" : "bad"}">${r.ok ? "$" + r.val : "not feasible"}</td></tr>`;
    });
    $("extra").innerHTML = h + "</tbody></table>";
    knapTableFor = frames;
  }
  function knapRender(f, i, frames) {
    const n = knap.w.length, W = 760, H = 300;
    stage.setAttribute("viewBox", `0 0 ${W} ${H}`);
    stage.innerHTML = "";
    const r = f.cur >= 0 ? frames.rows[f.cur] : null;
    const inS = new Set(r ? r.s : []);
    const bw = Math.min(120, (W - 40) / n - 10);
    for (let k = 0; k < n; k++) {
      const x = 20 + k * ((W - 40) / n) + ((W - 40) / n - bw) / 2, on = inS.has(k), inBest = f.bestSet.includes(k);
      stage.appendChild(S("rect", { x, y: 30, width: bw, height: 86, rx: 10, fill: on ? "var(--c-active)" : "var(--panel-2)", stroke: inBest ? "var(--c-done)" : "var(--line-2)", "stroke-width": inBest ? 4 : 2, opacity: on ? 1 : 0.9 }));
      const ink = on ? "#0d1117" : "var(--ink)";
      stage.appendChild(S("text", { x: x + bw / 2, y: 58, "text-anchor": "middle", "font-size": 15, "font-weight": 700, fill: ink }, "item " + (k + 1)));
      stage.appendChild(S("text", { x: x + bw / 2, y: 80, "text-anchor": "middle", "font-size": 13, fill: ink }, "w = " + knap.w[k]));
      stage.appendChild(S("text", { x: x + bw / 2, y: 100, "text-anchor": "middle", "font-size": 13, fill: ink }, "v = $" + knap.v[k]));
    }
    // capacity bar
    const tot = knap.w.reduce((a, b) => a + b, 0), maxW = Math.max(tot, knap.W) || 1, bx = 20, bwid = W - 40, by = 170;
    const sc = (x) => (bwid * x) / maxW;
    stage.appendChild(S("rect", { x: bx, y: by, width: bwid, height: 40, rx: 8, fill: "var(--panel)", stroke: "var(--line)" }));
    let acc = 0;
    if (r && !f.hideW) r.s.forEach((k) => {
      const over = acc + knap.w[k] > knap.W;
      stage.appendChild(S("rect", { x: bx + sc(acc) + 1, y: by + 2, width: Math.max(1, sc(knap.w[k]) - 2), height: 36, rx: 5, fill: over ? "var(--c-swap)" : "var(--c-active)" }));
      stage.appendChild(S("text", { x: bx + sc(acc) + sc(knap.w[k]) / 2, y: by + 25, "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: "#0d1117" }, String(knap.w[k])));
      acc += knap.w[k];
    });
    const cx = bx + sc(knap.W);
    stage.appendChild(S("line", { x1: cx, y1: by - 14, x2: cx, y2: by + 54, stroke: "var(--ember)", "stroke-width": 2.5, "stroke-dasharray": "6 4" }));
    stage.appendChild(S("text", { x: Math.min(W - 60, cx), y: by - 20, "text-anchor": "middle", "font-size": 12, fill: "var(--ember)" }, "W = " + knap.W));
    const status = !r ? "" : f.hideW ? `${setName(r.s)}: weight = ?` : `${setName(r.s)}: weight ${r.wt}${r.ok ? ", value $" + r.val : " > W, not feasible"}`;
    stage.appendChild(S("text", { x: 20, y: 250, "font-size": 14, "font-weight": 700, fill: r && !f.hideW && !r.ok ? "var(--bad)" : "var(--ink)" }, status));
    stage.appendChild(S("text", { x: 20, y: 280, "font-size": 13, fill: "var(--c-done)" }, `best so far: ${setName(f.bestSet)} = $${f.best}`));
    // table
    if (knapTableFor !== frames) knapBuildTable(frames);
    const trs = $("extra").querySelectorAll("tbody tr");
    const upto = f.cur >= 0 ? f.cur : f.line === 8 ? trs.length - 1 : -1;
    trs.forEach((tr, k) => {
      tr.classList.toggle("hide", k > upto || (!!f.hideW && k === upto));
      tr.classList.toggle("cur", k === f.cur);
      tr.classList.toggle("best", f.best > 0 && k === f.bestRow && k <= upto);
    });
    const curRow = trs[f.cur];
    if (curRow && curRow.scrollIntoView) { const box = $("extra"); const top = curRow.offsetTop - box.clientHeight / 2; box.scrollTop = Math.max(0, top); }
    ctr.set({ "subsets examined": FX.fmt(f.examined), "2ⁿ": FX.fmt(1 << n), feasible: f.feasible, "best value": "$" + f.best });
  }

  /* ========================================================== ASSIGNMENT */
  const asg = { C: [[9, 2, 7, 8], [6, 4, 3, 7], [5, 8, 1, 8], [7, 6, 9, 4]] };
  const ASG_LINES = [
    "ALGORITHM AssignmentExhaustive(C[1..n, 1..n])",
    "    best ← ∞",
    "    for each permutation ⟨j1, ..., jn⟩ of 1, ..., n do",
    "        cost ← 0",
    "        for i ← 1 to n do",
    "            cost ← cost + C[i, ji]",
    "        if cost < best then",
    "            best ← cost;  bestPerm ← ⟨j1, ..., jn⟩",
    "    return bestPerm, best",
  ];
  function asgRecord() {
    const C = asg.C, n = C.length, frames = [], rows = [];
    const p = Array.from({ length: n }, (_, k) => k);
    let best = Infinity, bestPerm = null, tried = 0, adds = 0;
    const push = (o) => frames.push(Object.assign({ tried, adds, best, bestPerm, rows: rows.length }, o));
    push({ line: 1, perm: null, text: `Start: ${n} people, ${n} jobs. A candidate gives each person a different job, so candidates are permutations of 1..${n}. We'll price every one.`,
      ask: { q: `How many assignments will be checked for n = ${n}?`, options: shuffleOpts(fact(n), [Math.pow(2, n), n * n, fact(n - 1), Math.pow(n, n)]), answer: fact(n), why: `n! = ${fact(n)}: person 1 has ${n} choices, person 2 has ${n - 1} left, and so on.` } });
    let k = 0;
    do {
      const terms = p.map((j, i) => C[i][j]), cost = terms.reduce((a, b) => a + b, 0), name = "⟨" + p.map((j) => j + 1).join(", ") + "⟩";
      if (k === 2 && n >= 3) {
        const pool = rows.map((r) => r.cost).concat([cost + 2, cost - 3, cost + 5, cost + 1]).filter((x) => x > 0);
        push({ line: 2, perm: p.slice(), hideCost: true, text: `Next permutation: <b>${name}</b>. Read the ${n} highlighted cells and predict the total.`,
          ask: { q: `What does assignment ${name} cost?`, options: shuffleOpts(cost, pool), answer: cost, why: `${terms.join(" + ")} = ${cost}. One cell per row, all in different columns.` } });
      }
      tried++; adds += n;
      rows.push({ name, terms, cost });
      if (cost < best) {
        const old = best; best = cost; bestPerm = p.slice();
        push({ line: [2, 3, 4, 5, 6, 7], perm: p.slice(), text: `${name}: cost = ${terms.join(" + ")} = <b>${cost}</b> &lt; ${old === Infinity ? "∞" : old}, the <b>new best</b>.` });
      } else push({ line: [2, 3, 4, 5, 6], perm: p.slice(), text: `${name}: cost = ${terms.join(" + ")} = ${cost}, not below ${best}.` });
      k++;
    } while (nextPerm(p));
    push({ line: 8, perm: null, text: `Done: ${tried} permutations, ${adds} additions. Optimal assignment ⟨${bestPerm.map((j) => j + 1).join(", ")}⟩ with cost <b>${best}</b>. (The Hungarian method solves this in polynomial time, so exhaustive search is not the only way here.)` });
    frames.rowsData = rows;
    return frames;
  }
  function asgRender(f, i, frames) {
    const C = asg.C, n = C.length, cell = Math.min(70, 560 / n), x0 = 150, y0 = 44;
    const W = 760, H = y0 + n * cell + 50;
    stage.setAttribute("viewBox", `0 0 ${W} ${H}`);
    stage.innerHTML = "";
    for (let j = 0; j < n; j++) stage.appendChild(S("text", { x: x0 + j * cell + cell / 2, y: y0 - 12, "text-anchor": "middle", "font-size": 13, fill: "var(--muted)" }, "Job " + (j + 1)));
    for (let r = 0; r < n; r++) {
      stage.appendChild(S("text", { x: x0 - 12, y: y0 + r * cell + cell / 2 + 5, "text-anchor": "end", "font-size": 13, fill: "var(--muted)" }, "Person " + (r + 1)));
      for (let j = 0; j < n; j++) {
        const on = f.perm && f.perm[r] === j, best = f.bestPerm && f.bestPerm[r] === j;
        stage.appendChild(S("rect", { x: x0 + j * cell + 3, y: y0 + r * cell + 3, width: cell - 6, height: cell - 6, rx: 8, fill: on ? "var(--c-active)" : "var(--panel-2)", stroke: best ? "var(--c-done)" : "var(--line)", "stroke-width": best ? 4 : 1.5 }));
        stage.appendChild(S("text", { x: x0 + j * cell + cell / 2, y: y0 + r * cell + cell / 2 + 6, "text-anchor": "middle", "font-size": Math.min(20, cell / 2.6), "font-weight": 700, fill: on ? "#0d1117" : "var(--ink)" }, String(C[r][j])));
      }
    }
    const sx = x0 + n * cell + 30;
    const cur = f.perm && !f.hideCost ? frames.rowsData[f.rows - 1] : null;
    stage.appendChild(S("text", { x: sx, y: y0 + 20, "font-size": 14, "font-weight": 700, fill: "var(--ink)" }, f.perm ? "⟨" + f.perm.map((j) => j + 1).join(", ") + "⟩" : ""));
    stage.appendChild(S("text", { x: sx, y: y0 + 44, "font-size": 13, fill: "var(--ink-2)" }, f.perm ? "cost = " + (cur ? cur.cost : "?") : ""));
    stage.appendChild(S("text", { x: sx, y: y0 + 76, "font-size": 13, fill: "var(--c-done)" }, "best = " + (f.best === Infinity ? "∞" : f.best)));
    if (f.bestPerm) stage.appendChild(S("text", { x: sx, y: y0 + 96, "font-size": 13, fill: "var(--c-done)" }, "⟨" + f.bestPerm.map((j) => j + 1).join(", ") + "⟩"));
    stage.appendChild(S("text", { x: 14, y: H - 16, "font-size": 12, fill: "var(--muted)" }, "one cell per row, every column used once = a permutation"));
    ctr.set({ "permutations tried": FX.fmt(f.tried), "n!": FX.fmt(fact(n)), additions: FX.fmt(f.adds), "best cost": f.best === Infinity ? "∞" : f.best });
    const rows = frames.rowsData, upto = f.rows, start = Math.max(0, upto - 12);
    const bestK = f.bestPerm ? rows.findIndex((r, k) => k < upto && r.cost === f.best) : -1;
    let h = start > 0 ? `<div class="muted">… ${start} earlier permutations …</div>` : "";
    for (let k = start; k < upto; k++) {
      const r = rows[k];
      h += `<div class="${k === upto - 1 && !f.hideCost ? "cur " : ""}${k === bestK ? "best" : ""}">${r.name} &nbsp; cost = ${r.terms.join(" + ") + " = " + r.cost}${k === bestK ? " ← best" : ""}</div>`;
    }
    if (f.hideCost) h += `<div class="cur">⟨${f.perm.map((j) => j + 1).join(", ")}⟩ &nbsp; cost = ?</div>`;
    $("extra").innerHTML = `<div class="tourlist">${h || '<span class="muted">No permutations yet.</span>'}</div>`;
  }

  /* ============================================================ EXPLOSION */
  const boom = { speed: 1e9 };
  const BOOM_LINES = [
    "ALGORITHM CountCandidates(n, speed)",
    "    subsets ← 2^n              // knapsack: each item in or out",
    "    tours ← (n − 1)! / 2       // TSP: start fixed, mirrors skipped",
    "    assignments ← n!           // assignment: permutations",
    "    for each count c above do",
    "        time ← c / speed        // speed = candidates checked per second",
    "    return the three times",
  ];
  const series = [
    { key: "sub", name: "2ⁿ subsets", col: "var(--steel)", f: (n) => Math.pow(2, n) },
    { key: "tour", name: "(n−1)!/2 tours", col: "var(--ember)", f: (n) => (n < 3 ? 1 : fact(n - 1) / 2) },
    { key: "perm", name: "n! assignments", col: "var(--c-pivot)", f: (n) => fact(n) },
  ];
  function boomRecord() {
    const frames = [];
    let ans = 1; while (fact(ans + 1) / boom.speed < 86400) ans++;
    for (let n = 1; n <= 20; n++) {
      const v = series.map((s) => s.f(n));
      const t = v.map((x) => FX.time(x / boom.speed));
      frames.push({ n, line: [1, 2, 3, 5], text: `n = ${n}: 2ⁿ = ${FX.fmt(v[0])} subsets (${t[0]}), (n−1)!/2 = ${FX.fmt(v[1])} tours (${t[1]}), n! = ${FX.fmt(v[2])} assignments (${t[2]}) at ${FX.fmt(boom.speed)} checks per second.` +
        (n === 20 ? " Each extra item doubles 2ⁿ; each extra city multiplies n! by n. That is why exhaustive search only works for tiny n." : ""),
        ask: n === 1 ? { q: `At ${FX.fmt(boom.speed)} checks per second, what is the largest n for which checking all n! assignments takes less than one day?`, options: shuffleOpts(ans, [ans - 3, ans + 4, 20, ans + 9, ans - 6].filter((x) => x > 1)), answer: ans,
          why: `n = ${ans}: ${ans}! = ${FX.fmt(fact(ans))} checks take ${FX.time(fact(ans) / boom.speed)}, but ${ans + 1}! = ${FX.fmt(fact(ans + 1))} would take ${FX.time(fact(ans + 1) / boom.speed)}.` } : null });
    }
    return frames;
  }
  const BX0 = 70, BX1 = 690, BY0 = 24, BY1 = 360, DEC = 20;
  const bx = (n) => BX0 + ((n - 1) * (BX1 - BX0)) / 19;
  const by = (v) => BY1 - (Math.log10(Math.max(1, v)) * (BY1 - BY0)) / DEC;
  function boomRender(f) {
    const W = 760, H = 400;
    stage.setAttribute("viewBox", `0 0 ${W} ${H}`);
    stage.innerHTML = "";
    for (let d = 0; d <= DEC; d += 2) {
      stage.appendChild(S("line", { x1: BX0, y1: by(Math.pow(10, d)), x2: BX1, y2: by(Math.pow(10, d)), stroke: "var(--line)", "stroke-width": 1 }));
      stage.appendChild(S("text", { x: BX0 - 8, y: by(Math.pow(10, d)) + 4, "text-anchor": "end", "font-size": 11, fill: "var(--muted)" }, "10" + String(d).split("").map((c) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[+c]).join("")));
    }
    for (let n = 1; n <= 20; n++) if (n === 1 || n % 2 === 0) stage.appendChild(S("text", { x: bx(n), y: BY1 + 18, "text-anchor": "middle", "font-size": 11, fill: "var(--muted)" }, String(n)));
    stage.appendChild(S("text", { x: (BX0 + BX1) / 2, y: BY1 + 36, "text-anchor": "middle", "font-size": 12, fill: "var(--ink-2)" }, "n (items / cities / people)"));
    // time reference lines
    [["1 second", 1], ["1 day", 86400], ["1 year", 31557600], ["age of universe", 4.35e17]].forEach(([lab, s]) => {
      const c = s * boom.speed; if (Math.log10(c) > DEC) return;
      const y = by(c);
      stage.appendChild(S("line", { x1: BX0, y1: y, x2: BX1, y2: y, stroke: "var(--muted)", "stroke-width": 1, "stroke-dasharray": "4 5" }));
      stage.appendChild(S("text", { x: BX0 + 6, y: y - 4, "font-size": 10.5, fill: "var(--muted)" }, lab));
    });
    // crosshair
    stage.appendChild(S("line", { x1: bx(f.n), y1: BY0, x2: bx(f.n), y2: BY1, stroke: "var(--ember)", "stroke-width": 1.5, opacity: 0.7 }));
    series.forEach((s) => {
      let d = "";
      for (let n = 1; n <= 20; n++) d += (n === 1 ? "M" : "L") + bx(n) + " " + by(s.f(n)) + " ";
      stage.appendChild(S("path", { d, fill: "none", stroke: s.col, "stroke-width": 2, "stroke-linejoin": "round" }));
      const v = s.f(f.n);
      stage.appendChild(S("circle", { cx: bx(f.n), cy: by(v), r: 5, fill: s.col, stroke: "var(--bg-2)", "stroke-width": 2 }));
      stage.appendChild(S("text", { x: BX1 + 6, y: by(s.f(20)) + (s.key === "tour" ? 12 : s.key === "perm" ? -4 : 4), "font-size": 11, fill: "var(--ink-2)" }, s.name.split(" ")[0]));
    });
    // hit columns
    for (let n = 1; n <= 20; n++) {
      const r = S("rect", { x: bx(n) - 16, y: BY0, width: 32, height: BY1 - BY0, fill: "transparent", style: "cursor:pointer" });
      r.addEventListener("click", () => player.go(n - 1));
      r.appendChild(S("title", null, `n = ${n}`));
      stage.appendChild(r);
    }
    const v = series.map((s) => s.f(f.n));
    ctr.set({ n: f.n, "2ⁿ": FX.short(v[0]), "(n−1)!/2": FX.short(v[1]), "n!": FX.short(v[2]) });
    // table
    if (!$("boomTable")) {
      let h = `<table class="t" id="boomTable"><thead><tr><th>n</th><th>2ⁿ</th><th>time</th><th>(n−1)!/2</th><th>time</th><th>n!</th><th>time</th></tr></thead><tbody>`;
      for (let n = 1; n <= 20; n++) {
        const vv = series.map((s) => s.f(n));
        h += `<tr data-n="${n}"><td>${n}</td>${vv.map((x) => `<td>${FX.fmt(x)}</td><td>${FX.time(x / boom.speed)}</td>`).join("")}</tr>`;
      }
      $("extra").innerHTML = h + "</tbody></table>";
    }
    $("extra").querySelectorAll("tbody tr").forEach((tr) => {
      tr.classList.toggle("cur", +tr.dataset.n === f.n);
      if (+tr.dataset.n === f.n) { const box = $("extra"); box.scrollTop = Math.max(0, tr.offsetTop - box.clientHeight / 2); }
    });
  }

  /* ============================================================ MODES */
  function modeUI(m) {
    const ctl = $("modeCtl");
    ctl.innerHTML = "";
    if (m === "tsp") {
      ctl.appendChild(E("div", { class: "row" },
        E("button", { class: "btn primary", onclick: () => { tspPreset(); $("tspN").value = 4; load(tspRecord()); } }, "Levitin's 4-city example"),
        E("label", { class: "field" }, "Random cities (n)", E("input", { id: "tspN", type: "number", min: 3, max: 8, value: tsp.cities.length || 4, style: { width: "80px" } })),
        E("button", { class: "btn", onclick: () => { tspRandom(Math.max(3, Math.min(8, +$("tspN").value || 5))); load(tspRecord()); } }, "Random"),
        E("label", { class: "small", style: { display: "flex", gap: "6px", alignItems: "center" } },
          E("input", { type: "checkbox", id: "tspSkip", checked: tsp.skip, onchange: (e) => { tsp.skip = e.target.checked; load(tspRecord()); } }), "skip mirror tours (only tours where b comes before c)")));
      ctl.appendChild(E("p", { class: "fx-note", style: { margin: "8px 0 0" } }, "Click empty space on the stage to add a city (up to 8); click a city to remove it. Added cities use straight-line distance ÷ 10."));
    } else if (m === "knap") {
      ctl.appendChild(E("div", { class: "row" },
        E("label", { class: "field" }, "Weights", E("input", { id: "kw", type: "text", value: knap.w.join(", "), style: { width: "150px" } })),
        E("label", { class: "field" }, "Values ($)", E("input", { id: "kv", type: "text", value: knap.v.join(", "), style: { width: "150px" } })),
        E("label", { class: "field" }, "Capacity W", E("input", { id: "kW", type: "number", min: 0, value: knap.W, style: { width: "80px" } })),
        E("label", { class: "field" }, "Subset order", E("select", { id: "kOrd", onchange: (e) => { knap.order = e.target.value; load(knapRecord()); } },
          E("option", { value: "size", selected: knap.order === "size" }, "by size (textbook table)"), E("option", { value: "binary", selected: knap.order === "binary" }, "binary counting"))),
        E("button", { class: "btn primary", onclick: knapLoad }, "Load"),
        E("button", { class: "btn", onclick: knapRandom }, "Random"),
        E("button", { class: "btn ghost", onclick: () => { knap.w = [7, 3, 4, 5]; knap.v = [42, 12, 40, 25]; knap.W = 10; modeUI("knap"); load(knapRecord()); } }, "Levitin's instance")));
      ctl.appendChild(E("p", { class: "fx-note", style: { margin: "8px 0 0" } }, "Up to 10 items (1,024 subsets)."));
    } else if (m === "asg") {
      ctl.appendChild(E("div", { class: "row" },
        E("label", { class: "field" }, "Cost matrix (one row per line)", E("textarea", { id: "asgMat", rows: 4 }, asg.C.map((r) => r.join(" ")).join("\n"))),
        E("div", { class: "stack" },
          E("div", { class: "row" }, E("button", { class: "btn primary", onclick: asgLoad }, "Load"),
            E("button", { class: "btn ghost", onclick: () => { asg.C = [[9, 2, 7, 8], [6, 4, 3, 7], [5, 8, 1, 8], [7, 6, 9, 4]]; modeUI("asg"); load(asgRecord()); } }, "Levitin's matrix")),
          E("div", { class: "row" }, E("label", { class: "field" }, "Random n", E("select", { id: "asgN" }, [2, 3, 4, 5, 6].map((k) => E("option", { value: k, selected: k === asg.C.length }, String(k))))),
            E("button", { class: "btn", onclick: asgRandom }, "Random")))));
    } else {
      ctl.appendChild(E("div", { class: "row" },
        E("label", { class: "field" }, "Computer speed", E("select", { id: "spd", onchange: (e) => { boom.speed = +e.target.value; $("extra").innerHTML = ""; load(boomRecord()); } },
          [[1e6, "10⁶ checks / second (slow script)"], [1e9, "10⁹ checks / second (fast laptop)"], [1e10, "10¹⁰ checks / second (Levitin's estimate)"], [1e15, "10¹⁵ checks / second (supercomputer)"]].map(([v, t]) => E("option", { value: v, selected: v === boom.speed }, t)))),
        E("span", { class: "fx-note" }, "Click a column of the chart (or use the player) to inspect any n.")));
    }
  }
  function nums(s) { return s.split(/[\s,;]+/).filter(Boolean).map(Number).filter((x) => Number.isFinite(x)); }
  function knapLoad() {
    const w = nums($("kw").value).map((x) => Math.max(0, Math.round(x))), v = nums($("kv").value).map((x) => Math.max(0, Math.round(x)));
    const n = Math.min(10, w.length, v.length);
    if (n < 1) { say.say("Type at least one weight and one value."); return; }
    knap.w = w.slice(0, n); knap.v = v.slice(0, n); knap.W = Math.max(0, Math.round(+$("kW").value || 0));
    load(knapRecord());
  }
  function knapRandom() {
    const r = Forge.rng(Date.now()), n = 4 + Math.floor(r() * 3);
    knap.w = Array.from({ length: n }, () => 1 + Math.floor(r() * 9));
    knap.v = Array.from({ length: n }, () => 5 + Math.floor(r() * 55));
    knap.W = Math.max(3, Math.round(knap.w.reduce((a, b) => a + b, 0) / 2));
    modeUI("knap"); load(knapRecord());
  }
  function asgLoad() {
    const rows = $("asgMat").value.trim().split(/\n|;/).map((l) => nums(l)).filter((r) => r.length);
    const n = rows.length;
    if (n < 2 || n > 6 || rows.some((r) => r.length !== n)) { say.say("The matrix must be square, between 2×2 and 6×6 (one row per line)."); return; }
    asg.C = rows; load(asgRecord());
  }
  function asgRandom() {
    const n = +$("asgN").value || 4, r = Forge.rng(Date.now());
    asg.C = Array.from({ length: n }, () => Array.from({ length: n }, () => 1 + Math.floor(r() * 9)));
    modeUI("asg"); load(asgRecord());
  }

  function setMode(m) {
    mode = m;
    document.querySelectorAll("#modes button").forEach((b) => b.classList.toggle("on", b.dataset.m === m));
    $("extra").innerHTML = ""; knapTableFor = null;
    modeUI(m);
    if (m === "tsp") {
      setCode(TSP_LINES); setCounters({ "tours tried": 0, "(n−1)!": 0, "distance look-ups": 0, "best length": "∞" });
      setLegend([["var(--steel)", "current tour", 1], ["var(--c-done)", "best tour so far", 1], ["var(--ember)", "start city a"]]);
      $("extraTitle").textContent = "Tours generated (like Levitin Fig. 3.7)";
      renderFn = tspRender; stage.style.cursor = "crosshair";
      if (!tsp.cities.length) tspPreset();
      load(tspRecord());
    } else if (m === "knap") {
      setCode(KNAP_LINES); setCounters({ "subsets examined": 0, "2ⁿ": 0, feasible: 0, "best value": "$0" });
      setLegend([["var(--c-active)", "item in current subset"], ["var(--c-swap)", "weight over capacity"], ["var(--c-done)", "best subset (outline / row)"], ["var(--ember)", "capacity W", 1]]);
      $("extraTitle").textContent = "All subsets (like Levitin Fig. 3.8)";
      renderFn = knapRender; stage.style.cursor = "default";
      load(knapRecord());
    } else if (m === "asg") {
      setCode(ASG_LINES); setCounters({ "permutations tried": 0, "n!": 0, additions: 0, "best cost": "∞" });
      setLegend([["var(--c-active)", "current assignment"], ["var(--c-done)", "best assignment so far (outline)"]]);
      $("extraTitle").textContent = "Permutations tried (like Levitin Fig. 3.9)";
      renderFn = asgRender; stage.style.cursor = "default";
      load(asgRecord());
    } else {
      setCode(BOOM_LINES); setCounters({ n: 1, "2ⁿ": 2, "(n−1)!/2": 1, "n!": 1 });
      setLegend([["var(--steel)", "2ⁿ subsets (knapsack)", 1], ["var(--ember)", "(n−1)!/2 tours (TSP)", 1], ["var(--c-pivot)", "n! assignments", 1], ["var(--muted)", "time budget at chosen speed", 1]]);
      $("extraTitle").textContent = "Candidates and running time";
      renderFn = boomRender; stage.style.cursor = "default";
      load(boomRecord());
    }
  }
  document.querySelectorAll("#modes button").forEach((b) => (b.onclick = () => setMode(b.dataset.m)));
  setMode("tsp");
})();
