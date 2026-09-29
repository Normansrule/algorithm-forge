/* Warshall & Floyd — Algorithm Forge (Ch 8 · Dynamic Programming) */
(function () {
  "use strict";
  const E = Forge.el, S = Forge.svg, $ = (id) => document.getElementById(id);
  Forge.page({ title: "Warshall & Floyd", chapter: "Ch 8 · Dynamic Programming" });
  const INF = Infinity;
  const NAMES = "abcdefg";
  const fmt = (x, algo) => (algo === "warshall" ? String(x) : x === INF ? "∞" : String(x));

  const LINES = {
    warshall: [
      "ALGORITHM Warshall(A[1..n, 1..n])",
      "    // R(k)[i, j] = 1 iff a path i ⇝ j uses only vertices 1..k inside",
      "    R(0) ← A",
      "    for k ← 1 to n do",
      "        for i ← 1 to n do",
      "            for j ← 1 to n do",
      "                R(k)[i, j] ← R(k−1)[i, j] or (R(k−1)[i, k] and R(k−1)[k, j])",
      "    return R(n)",
    ],
    floyd: [
      "ALGORITHM Floyd(W[1..n, 1..n])",
      "    // D[i, j]: shortest i ⇝ j using only vertices 1..k inside",
      "    D ← W            // P[i, j] ← 0 (no intermediate yet)",
      "    for k ← 1 to n do",
      "        for i ← 1 to n do",
      "            for j ← 1 to n do",
      "                if D[i, k] + D[k, j] < D[i, j] then",
      "                    D[i, j] ← D[i, k] + D[k, j]",
      "                    P[i, j] ← k   // remember the via-vertex",
      "    return D",
      "",
      "ALGORITHM Path(i, j)     // after Floyd has finished",
      "    if P[i, j] = 0 then return [i, j]",
      "    k ← P[i, j]",
      "    return Path(i, k) followed by Path(k, j) without repeating k",
    ],
  };

  const PRESETS = {
    lw: { n: 4, e: [[0, 1, 1], [1, 3, 1], [3, 0, 1], [3, 2, 1]], algo: "warshall" },
    lecw: { n: 4, e: [[0, 2, 1], [1, 0, 1], [1, 3, 1], [3, 1, 1]], algo: "warshall" },
    lf: { n: 4, e: [[0, 2, 3], [1, 0, 2], [2, 1, 7], [2, 3, 1], [3, 0, 6]], algo: "floyd" },
    chain: { n: 5, e: [[0, 1, 2], [1, 2, 3], [2, 3, 1], [3, 4, 4]], algo: null },
  };

  let n = 4, W = [];          // W[i][j] = weight or null
  let algo = "floyd", gran = "changes", predict = false;
  let selV = null, frames = [], finalP = null, finalD = null, passEnd = {};
  let pathSel = null;
  const score = { right: 0, total: 0 }, answered = {}, guesses = {};
  let code, ctr;
  const say = Forge.narrate($("say"));

  function setGraph(nn, edges) {
    n = nn; W = Array.from({ length: n }, () => Array(n).fill(null));
    edges.forEach(([u, v, w]) => { if (u !== v && u < n && v < n) W[u][v] = w; });
    syncText();
  }
  function syncText() {
    const parts = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (W[i][j] != null) parts.push(`${NAMES[i]}>${NAMES[j]} ${W[i][j]}`);
    $("edges").value = parts.join(", ");
  }
  function parseText() {
    const edges = []; let mx = 1;
    $("edges").value.split(/[,;\n]+/).forEach((s) => {
      const m = s.trim().toLowerCase().match(/^([a-g])\s*(?:>|->|→|-)\s*([a-g])\s*(\d+)?$/);
      if (!m) return;
      const u = NAMES.indexOf(m[1]), v = NAMES.indexOf(m[2]);
      mx = Math.max(mx, u, v);
      edges.push([u, v, m[3] ? Math.max(1, Math.min(99, +m[3])) : 1]);
    });
    setGraph(Math.max(n, mx + 1, 2), edges);
  }

  /* ---------------- record ---------------- */
  function record() {
    const fr = [];
    const warsh = algo === "warshall";
    let M = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) =>
      warsh ? (W[i][j] != null ? 1 : 0) : i === j ? 0 : W[i][j] != null ? W[i][j] : INF));
    const P = Array.from({ length: n }, () => Array(n).fill(-1));
    const mats = [M.map((r) => r.slice())];
    const cnt = { pass: "–", "cells checked": 0, updates: 0 };
    const nm = (i) => NAMES[i];
    const push = (o) => fr.push(Object.assign({ M: M.map((r) => r.slice()), mats: mats.map((m) => m.map((r) => r.slice())), ctr: Object.assign({}, cnt), st: {}, nst: {}, over: [] }, o));
    const Rk = warsh ? "R" : "D";
    push({ line: 2, kIdx: -1, text: warsh
      ? `R(0) is the adjacency matrix: R[i, j] = 1 exactly when there is an edge i → j. No vertex may be used as a stepping stone yet.`
      : `D(0) is the weight matrix: edge weights, 0 on the diagonal and ∞ where there is no edge. No vertex may be used in between yet.`, formula: `${Rk}(0) = ${warsh ? "A" : "W"}` });
    passEnd = {};
    for (let k = 0; k < n; k++) {
      cnt.pass = `${k + 1} (${nm(k)})`;
      const prev = M.map((r) => r.slice());
      // which cells will change (for predict)
      const willChange = [];
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        if (warsh ? !prev[i][j] && prev[i][k] && prev[k][j] : prev[i][k] + prev[k][j] < prev[i][j]) willChange.push(`${i},${j}`);
      }
      push({ line: 3, kIdx: k, pass: k, ask: { k, cells: willChange }, nst: { [k]: "pivot" },
        text: `<b>Pass k = ${k + 1}</b>: vertex <b>${nm(k)}</b> may now be used in between. Row ${nm(k)} (paths out of ${nm(k)}) and column ${nm(k)} (paths into ${nm(k)}) stay the same during this pass. Which other cells can use ${nm(k)} as a shortcut?`,
        formula: warsh ? `R(${k + 1})[i, j] = R(${k})[i, j] or (R(${k})[i, ${nm(k)}] and R(${k})[${nm(k)}, j])` : `D(${k + 1})[i, j] = min(D(${k})[i, j], D(${k})[i, ${nm(k)}] + D(${k})[${nm(k)}, j])` });
      const changed = {};
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        cnt["cells checked"]++;
        const a = prev[i][k], b = prev[k][j], old = prev[i][j];
        let upd;
        if (warsh) upd = !old && a && b;
        else upd = a + b < old;
        if (upd) {
          M[i][j] = warsh ? 1 : a + b; cnt.updates++;
          if (!warsh) P[i][j] = k;
          changed[`${i},${j}`] = "new";
        }
        if (upd || gran === "all") {
          const st = Object.assign({}, changed, { [`${i},${k}`]: "src", [`${k},${j}`]: "src", [`${i},${j}`]: upd ? "newActive" : "active" });
          const over = [];
          if (i !== k) over.push({ u: i, v: k, kind: (warsh ? a : a < INF) ? "src" : "none" });
          if (k !== j) over.push({ u: k, v: j, kind: (warsh ? b : b < INF) ? "src" : "none" });
          if (upd && i !== j) over.push({ u: i, v: j, kind: "new", label: warsh ? null : M[i][j] });
          let text, formula;
          if (warsh) {
            formula = `R[${nm(i)}, ${nm(j)}] = ${old} or (R[${nm(i)}, ${nm(k)}] and R[${nm(k)}, ${nm(j)}]) = ${old} or (${a} and ${b}) = <b>${M[i][j]}</b>`;
            text = upd ? `${nm(i)} reaches ${nm(k)} and ${nm(k)} reaches ${nm(j)}, so <b>${nm(i)} now reaches ${nm(j)}</b>: the 0 becomes 1.`
              : old ? `R[${nm(i)}, ${nm(j)}] is already 1 — once a path exists it stays (rule 1).` : `No path ${nm(i)} ⇝ ${nm(k)} ⇝ ${nm(j)} yet (${a} and ${b} is 0), so the 0 stays.`;
          } else {
            formula = `D[${nm(i)}, ${nm(j)}] = min(${fmt(old)}, D[${nm(i)}, ${nm(k)}] + D[${nm(k)}, ${nm(j)}]) = min(${fmt(old)}, ${fmt(a)} + ${fmt(b)}) = <b>${fmt(M[i][j])}</b>`;
            text = upd ? `Going ${nm(i)} → … → ${nm(k)} → … → ${nm(j)} costs ${fmt(a)} + ${fmt(b)} = ${a + b}, shorter than ${fmt(old)}. <b>Update D[${nm(i)}, ${nm(j)}] = ${a + b}</b> and remember ${nm(k)} as the via-vertex.`
              : `The detour through ${nm(k)} costs ${fmt(a + b)}, not less than ${fmt(old)}: keep it.`;
          }
          push({ line: upd ? (warsh ? 6 : [6, 7, 8]) : 6, kIdx: k, st, over, nst: { [k]: "pivot", [i]: "active", ...(i !== j ? { [j]: "compare" } : {}) }, text, formula });
        }
      }
      mats.push(M.map((r) => r.slice()));
      passEnd[k + 1] = fr.length;
      const nCh = Object.keys(changed).length;
      push({ line: 3, kIdx: k, st: changed, nst: { [k]: "pivot" }, flash: true,
        text: nCh ? `${Rk}(${k + 1}) is ready: ${nCh} cell${nCh > 1 ? "s" : ""} (red) changed because of the stepping stone ${nm(k)}.` : `${Rk}(${k + 1}) = ${Rk}(${k}): letting paths pass through ${nm(k)} helps nobody${warsh ? "" : " (no detour is shorter)"}.`,
        formula: `${Rk}(${k + 1}) done — ${nCh} change${nCh === 1 ? "" : "s"}` });
    }
    passEnd[0] = 0;
    cnt.pass = "done";
    push({ line: warsh ? 7 : 9, kIdx: n, final: true,
      text: warsh ? `R(${n}) is the <b>transitive closure</b>: a 1 at (i, j) means j is reachable from i. ${cnt["cells checked"]} = n³ checks: Θ(n³) time.`
        : `D(${n}) is the <b>distance matrix</b>. ${cnt["cells checked"]} = n³ checks: Θ(n³) time. Pick two vertices below to reconstruct a shortest path.`,
      formula: `${Rk}(${n}) = ${warsh ? "transitive closure" : "all shortest distances"}` });
    finalP = P; finalD = M;
    return fr;
  }

  /* ---------------- drawing ---------------- */
  function layout() {
    const cx = 200, cy = 175, r = n <= 3 ? 105 : 125;
    return Array.from({ length: n }, (_, i) => ({ id: i, label: NAMES[i], x: cx + r * Math.cos(-Math.PI / 2 - Math.PI / 4 * (n === 4 ? 1 : 0) + (2 * Math.PI * i) / n), y: cy + r * Math.sin(-Math.PI / 2 - Math.PI / 4 * (n === 4 ? 1 : 0) + (2 * Math.PI * i) / n) }));
  }
  function drawGraph(f) {
    const svg = $("svgG");
    const nodes = layout();
    const edges = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (W[i][j] != null) edges.push({ u: i, v: j, w: algo === "floyd" ? W[i][j] : undefined, directed: true, curve: W[j][i] != null ? 18 : 0 });
    const nodeState = {};
    Object.entries(f ? f.nst || {} : {}).forEach(([k, v]) => (nodeState[k] = v));
    if (selV != null) nodeState[selV] = "ember";
    const edgeState = {};
    let pathVerts = null;
    if (f && f.final && pathSel && algo === "floyd") {
      pathVerts = pathSel;
      for (let t = 0; t + 1 < pathVerts.length; t++) edgeState[`${pathVerts[t]}-${pathVerts[t + 1]}`] = "done";
      pathVerts.forEach((v) => (nodeState[v] = "done"));
    }
    Forge.graph(svg, { nodes, edges }, { width: 400, height: 350, nodeState, edgeState, r: 19 });
    // overlays: detour i ⇢ k ⇢ j
    const pos = Object.fromEntries(nodes.map((d) => [d.id, d]));
    (f ? f.over : []).forEach((o) => {
      if (o.kind === "none") return;
      const a = pos[o.u], b = pos[o.v];
      const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
      const bend = o.kind === "new" ? -42 : 34;
      const x1 = a.x + (dx / L) * 22, y1 = a.y + (dy / L) * 22, x2 = b.x - (dx / L) * 25, y2 = b.y - (dy / L) * 25;
      const mx = (x1 + x2) / 2 - (dy / L) * bend, my = (y1 + y2) / 2 + (dx / L) * bend;
      const col = o.kind === "new" ? "var(--c-swap)" : "var(--c-compare)";
      svg.appendChild(S("path", { d: `M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`, fill: "none", stroke: col, "stroke-width": 3, "stroke-dasharray": "7 5", "marker-end": "url(#arr-ember)", opacity: 0.95 }));
      if (o.label != null) {
        const lx = (x1 + x2) / 4 + mx / 2, ly = (y1 + y2) / 4 + my / 2;
        svg.appendChild(S("rect", { x: lx - 14, y: ly - 10, width: 28, height: 18, rx: 5, fill: "var(--panel)", stroke: col }));
        svg.appendChild(S("text", { x: lx, y: ly + 3.5, "text-anchor": "middle", "font-size": 11, "font-weight": 700, fill: col }, String(o.label)));
      }
    });
    // click targets for editing
    if ($("edit").checked) {
      nodes.forEach((nd) => svg.appendChild(S("circle", { cx: nd.x, cy: nd.y, r: 24, fill: "transparent", style: "cursor:pointer", onclick: () => clickNode(nd.id) })));
    }
  }
  function drawMatrix(svg, M, o) {
    o = o || {};
    const small = !!o.small, cw = small ? 22 : 52, ch = small ? 18 : 38, hw = small ? 14 : 30, top = small ? 14 : 30, pad = small ? 3 : 8;
    const Wd = pad * 2 + hw + n * cw, Ht = pad * 2 + top + n * ch;
    svg.setAttribute("viewBox", `0 0 ${Wd} ${Ht}`);
    svg.innerHTML = "";
    const k = o.k;
    const X = (j) => pad + hw + j * cw, Y = (i) => pad + top + i * ch;
    if (k != null && k >= 0 && k < n) {
      svg.appendChild(S("rect", { x: X(0), y: Y(k), width: n * cw, height: ch, fill: "var(--c-pivot)", "fill-opacity": 0.16 }));
      svg.appendChild(S("rect", { x: X(k), y: Y(0), width: cw, height: n * ch, fill: "var(--c-pivot)", "fill-opacity": 0.16 }));
    }
    for (let j = 0; j < n; j++) svg.appendChild(S("text", { x: X(j) + cw / 2, y: pad + top - (small ? 4 : 10), "text-anchor": "middle", "font-size": small ? 9 : 13, "font-weight": 700, fill: j === k ? "var(--c-pivot)" : "var(--ink-2)" }, NAMES[j]));
    for (let i = 0; i < n; i++) {
      svg.appendChild(S("text", { x: pad + hw - (small ? 3 : 10), y: Y(i) + ch / 2 + (small ? 3 : 5), "text-anchor": "end", "font-size": small ? 9 : 13, "font-weight": 700, fill: i === k ? "var(--c-pivot)" : "var(--ink-2)" }, NAMES[i]));
      for (let j = 0; j < n; j++) {
        const s = (o.st || {})[`${i},${j}`];
        const col = { src: "var(--c-compare)", active: "var(--c-active)", newActive: "var(--c-swap)", new: "var(--c-swap)" }[s];
        const guess = o.guess && o.guess.has(`${i},${j}`);
        const r = S("rect", { x: X(j) + 1, y: Y(i) + 1, width: cw - 2, height: ch - 2, rx: small ? 2 : 5, fill: col || "transparent", "fill-opacity": col ? (s === "new" ? 0.3 : 0.38) : 0,
          stroke: guess ? "var(--ember)" : s === "active" || s === "newActive" ? col : "var(--line)", "stroke-width": guess ? 3 : s === "active" || s === "newActive" ? 2.5 : small ? 0.6 : 1,
          "stroke-dasharray": guess ? "5 3" : null, class: o.flash && s === "new" ? "flash" : null });
        if (o.onCell) { r.style.cursor = "pointer"; r.setAttribute("fill", col || "var(--panel)"); r.setAttribute("fill-opacity", col ? 0.38 : 0.01); r.addEventListener("click", () => o.onCell(i, j)); }
        svg.appendChild(r);
        const v = M[i][j];
        const txt = algo === "warshall" ? String(v) : v === INF ? "∞" : String(v);
        svg.appendChild(S("text", { x: X(j) + cw / 2, y: Y(i) + ch / 2 + (small ? 3.5 : 5), "text-anchor": "middle", "font-size": small ? 9.5 : 15, "font-weight": 700, "pointer-events": "none",
          fill: algo === "warshall" && v === 0 ? "var(--muted)" : "var(--ink)" }, txt));
      }
    }
  }
  function drawStrip(f, idx) {
    const host = $("strip"); host.innerHTML = "";
    const Rk = algo === "warshall" ? "R" : "D";
    for (let k = 0; k <= n; k++) {
      const have = f.mats[k];
      const cur = f.final ? k === n : f.kIdx === -1 ? k === 0 : f.mats.length - 1 === k;
      const svg = S("svg", { role: "img", "aria-label": `${Rk}(${k})` });
      const b = E("button", { class: cur ? "on" : "", disabled: !have, title: `Jump to ${Rk}(${k})`, onclick: () => player.go(passEnd[k] || 0) }, svg, `${Rk}(${k})`);
      host.appendChild(b);
      if (have) drawMatrix(svg, have, { small: true });
    }
  }

  /* ---------------- wiring ---------------- */
  const player = Forge.player($("player"), { frames: [], render });
  function render(f, idx) {
    const Rk = algo === "warshall" ? "R" : "D";
    const askOn = predict && f.ask;
    const g = guesses[idx] || (guesses[idx] = new Set());
    drawGraph(f);
    drawMatrix($("svgM"), f.M, { st: f.st, k: f.kIdx >= 0 && f.kIdx < n ? f.kIdx : null, flash: f.flash, guess: askOn ? g : null,
      onCell: askOn && !answered[idx] ? (i, j) => { g.has(`${i},${j}`) ? g.delete(`${i},${j}`) : g.add(`${i},${j}`); render(f, idx); } : null });
    $("mTitle").textContent = f.final ? `${Rk}(${n}) — final` : f.kIdx === -1 ? `${Rk}(0)` : `building ${Rk}(${f.kIdx + 1}) from ${Rk}(${f.kIdx})`;
    drawStrip(f, idx);
    code.highlight(f.line);
    ctr.set(f.ctr);
    say.say(f.text);
    $("formula").innerHTML = f.formula || "&nbsp;";
    const box = $("ask");
    if (askOn) {
      player.pause();
      box.hidden = false;
      $("askQ").innerHTML = `Click every cell of the matrix you think changes in pass ${f.ask.k + 1} (vertex ${NAMES[f.ask.k]}). Selected: ${g.size}.`;
      $("askFb").innerHTML = answered[idx] || "";
      $("askGo").textContent = answered[idx] ? "Continue ▶" : "Check my guess";
    } else box.hidden = true;
  }
  $("askGo").onclick = () => {
    const idx = player.index, f = player.frames[idx];
    if (!f || !f.ask) return;
    if (answered[idx]) { player.go(idx + 1); return; }
    const g = guesses[idx] || new Set(), truth = new Set(f.ask.cells);
    const hits = [...g].filter((c) => truth.has(c)).length, extra = g.size - hits, missed = truth.size - hits;
    const exact = extra === 0 && missed === 0;
    score.total++; if (exact) score.right++;
    $("score").textContent = `passes predicted exactly: ${score.right} / ${score.total}`;
    const lab = (c) => c.split(",").map((x) => NAMES[+x]).join("");
    answered[idx] = exact ? `<span style="color:var(--ok)">✓ Exactly right (${truth.size} cell${truth.size === 1 ? "" : "s"}).</span>`
      : `<span style="color:var(--bad)">${hits} hit, ${missed} missed, ${extra} extra.</span> Changing cells: ${[...truth].map(lab).join(", ") || "none"}.`;
    render(f, idx);
  };

  function run() {
    frames = record();
    Object.keys(answered).forEach((k) => delete answered[k]);
    Object.keys(guesses).forEach((k) => delete guesses[k]);
    pathSel = null; $("pathOut").textContent = "";
    ["pf", "pt"].forEach((id, t) => {
      const s = $(id); s.innerHTML = "";
      for (let i = 0; i < n; i++) s.appendChild(E("option", { value: i }, NAMES[i]));
      s.value = t === 0 ? 1 % n : n - 1;
    });
    player.load(frames);
  }
  function setAlgo(a) {
    algo = a; $("algo").value = a;
    $("code").innerHTML = ""; $("ctr").innerHTML = "";
    code = Forge.code($("code"), LINES[a]);
    ctr = Forge.counters($("ctr"), { pass: "–", "cells checked": 0, updates: 0 });
    $("pathPanel").hidden = a !== "floyd";
    $("gTitle").textContent = a === "floyd" ? "Weighted digraph" : "Digraph (weights ignored)";
  }
  function clickNode(id) {
    if (selV == null) { selV = id; player.go(player.index); return; }
    if (selV !== id) {
      if (W[selV][id] != null) W[selV][id] = null;
      else W[selV][id] = Math.max(1, Math.min(99, Math.round(+$("ew").value || 1)));
      syncText();
      selV = null; run(); return;
    }
    selV = null; player.go(player.index);
  }
  function pathOf(i, j) {
    if (finalD[i][j] === INF) return null;
    if (i === j) return [i];
    const k = finalP[i][j];
    if (k < 0) return [i, j];
    return pathOf(i, k).concat(pathOf(k, j).slice(1));
  }
  $("showPath").onclick = () => {
    const i = +$("pf").value, j = +$("pt").value;
    const p = pathOf(i, j);
    pathSel = p;
    $("pathOut").innerHTML = p ? `<b>${p.map((v) => NAMES[v]).join(" → ")}</b>, length ${finalD[i][j]} (unfolded from the via-vertex table P)` : `No path from ${NAMES[i]} to ${NAMES[j]} (distance ∞).`;
    player.go(frames.length - 1);
  };
  $("algo").onchange = (e) => { setAlgo(e.target.value); run(); };
  $("gran").onchange = (e) => { gran = e.target.value; run(); };
  $("preset").onchange = (e) => {
    const p = PRESETS[e.target.value];
    setGraph(p.n, p.e);
    if (p.algo) setAlgo(p.algo);
    run();
  };
  $("rand").onclick = () => {
    const nn = 4 + Math.floor(Math.random() * 3), e = [];
    for (let i = 0; i < nn; i++) for (let j = 0; j < nn; j++) if (i !== j && Math.random() < 0.3) e.push([i, j, 1 + Math.floor(Math.random() * 9)]);
    setGraph(nn, e); run();
  };
  $("load").onclick = () => { parseText(); run(); };
  $("edges").addEventListener("keydown", (e) => { if (e.key === "Enter") { parseText(); run(); } });
  $("edit").onchange = (e) => { selV = null; $("svgG").classList.toggle("editing", e.target.checked); player.go(player.index); };
  $("addV").onclick = () => { if (n >= 7) return; W.forEach((r) => r.push(null)); n++; W.push(Array(n).fill(null)); syncText(); run(); };
  $("delV").onclick = () => { if (n <= 2) return; n--; W.pop(); W.forEach((r) => r.pop()); syncText(); run(); };
  $("predictMode").onchange = (e) => { predict = e.target.checked; player.go(player.index); };

  setAlgo("floyd");
  setGraph(PRESETS.lf.n, PRESETS.lf.e);
  const q = new URLSearchParams(location.search).get("algo");
  if (q === "warshall") { setAlgo("warshall"); setGraph(PRESETS.lw.n, PRESETS.lw.e); $("preset").value = "lw"; }
  run();
})();
