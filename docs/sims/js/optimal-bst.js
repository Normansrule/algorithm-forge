/* Optimal BST — Algorithm Forge (Ch 8 · Dynamic Programming) */
(function () {
  "use strict";
  const E = Forge.el, S = Forge.svg, $ = (id) => document.getElementById(id);
  Forge.page({ title: "Optimal BST", chapter: "Ch 8 · Dynamic Programming" });

  const LINES = [
    "ALGORITHM OptimalBST(P[1..n])",
    "    // C: least average comparisons; R: roots of optimal subtrees",
    "    for i ← 1 to n do",
    "        C[i, i − 1] ← 0",
    "        C[i, i] ← P[i]",
    "        R[i, i] ← i",
    "    C[n + 1, n] ← 0",
    "    for d ← 1 to n − 1 do          // diagonal count",
    "        for i ← 1 to n − d do",
    "            j ← i + d",
    "            minval ← ∞",
    "            for k ← i to j do",
    "                if C[i, k − 1] + C[k + 1, j] < minval then",
    "                    minval ← C[i, k − 1] + C[k + 1, j]",
    "                    kmin ← k",
    "            R[i, j] ← kmin",
    "            sum ← P[i]",
    "            for s ← i + 1 to j do sum ← sum + P[s]",
    "            C[i, j] ← minval + sum",
    "    return C[1, n], R",
    "",
    "ALGORITHM BuildTree(i, j)",
    "    if i > j then return null",
    "    k ← R[i, j]",
    "    node ← new node holding key a[k]",
    "    left(node) ← BuildTree(i, k − 1)",
    "    right(node) ← BuildTree(k + 1, j)",
    "    return node",
  ];
  const code = Forge.code($("code"), LINES);
  const ctr = Forge.counters($("ctr"), { "cells filled": 0, "k tried": 0, additions: 0 });
  const say = Forge.narrate($("say"));
  const fp = (x) => (x == null ? "" : String(+(+x).toFixed(4)));
  const EPS = 1e-9;

  /* ---------------- record ---------------- */
  function record(keys, P) {
    const n = keys.length, frames = [];
    // C[i][j] for i in 1..n+1, j in 0..n ; R[i][j] for 1..n
    const C = Array.from({ length: n + 2 }, () => Array(n + 1).fill(null));
    const R = Array.from({ length: n + 2 }, () => Array(n + 1).fill(null));
    const cnt = { "cells filled": 0, "k tried": 0, additions: 0 };
    let tree = null; // {nodes:[{k,depth}], edges:[[pk,ck]]}
    const push = (o) => frames.push(Object.assign({ C: C.map((r) => r.slice()), R: R.map((r) => r.slice()), ctr: Object.assign({}, cnt), tree: tree && Forge.clone(tree), stC: {}, stR: {} }, o));
    const key = (k) => keys[k - 1];
    push({ line: 0, text: `${n} keys ${keys.join(" < ")} with probabilities ${P.map(fp).join(", ")}. We fill C and R for every range i..j of keys, from short ranges to long ones.` });
    const st0 = {}, stR0 = {};
    for (let i = 1; i <= n; i++) {
      C[i][i - 1] = 0; C[i][i] = P[i - 1]; R[i][i] = i; cnt["cells filled"]++;
      st0[`${i},${i}`] = "new"; st0[`${i},${i - 1}`] = "new"; stR0[`${i},${i}`] = "new";
    }
    C[n + 1][n] = 0; st0[`${n + 1},${n}`] = "new";
    push({ line: [2, 3, 4, 5, 6], stC: st0, stR: stR0, text: "Diagonal d = 0: a tree with one key needs exactly 1 comparison when that key is searched, so C[i, i] = P[i] and R[i, i] = i. Empty ranges C[i, i − 1] cost 0.", formula: "C[i, i − 1] = 0,  C[i, i] = P[i],  R[i, i] = i" });
    for (let d = 1; d <= n - 1; d++) {
      for (let i = 1; i <= n - d; i++) {
        const j = i + d;
        let minval = Infinity, kmin = null;
        const cands = [];
        for (let k = i; k <= j; k++) cands.push({ k, l: C[i][k - 1], r: C[k + 1][j], v: null });
        // optimum for predict (ties allowed)
        const vals = cands.map((c) => c.l + c.r), best = Math.min(...vals);
        const okKs = cands.filter((c, t) => vals[t] <= best + EPS).map((c) => c.k);
        push({ line: [7, 8, 9, 10], stC: { [`${i},${j}`]: "active" }, stR: { [`${i},${j}`]: "active" }, cell: [i, j], cands: cands.map((c) => ({ k: c.k })),
          ask: { i, j, options: cands.map((c) => c.k), ok: okKs },
          text: `Diagonal d = ${d}: now keys <b>${key(i)}..${key(j)}</b> (i = ${i}, j = ${j}). Each of the ${j - i + 1} keys gets a turn as the root.` });
        const shown = [];
        for (const c of cands) {
          cnt["k tried"]++; cnt.additions++;
          c.v = c.l + c.r;
          const better = c.v < minval - EPS;
          if (better) { minval = c.v; kmin = c.k; }
          shown.push({ k: c.k, l: c.l, r: c.r, v: c.v });
          push({ line: better ? [12, 13, 14] : [11, 12], stC: { [`${i},${j}`]: "active", [`${i},${c.k - 1}`]: "src", [`${c.k + 1},${j}`]: "src" }, stR: { [`${i},${j}`]: "active" },
            cell: [i, j], cands: shown.map((s) => Object.assign({}, s, { cur: s.k === c.k, best: s.k === kmin })).concat(cands.slice(shown.length).map((s) => ({ k: s.k }))),
            formula: `k = ${c.k} (root ${key(c.k)}): C[${i}, ${c.k - 1}] + C[${c.k + 1}, ${j}] = ${fp(c.l)} + ${fp(c.r)} = ${fp(c.v)}`,
            text: `Root <b>${key(c.k)}</b>: left subtree ${c.k > i ? `holds ${key(i)}..${key(c.k - 1)} (best cost ${fp(c.l)})` : "is empty (0)"}, right subtree ${c.k < j ? `holds ${key(c.k + 1)}..${key(j)} (best cost ${fp(c.r)})` : "is empty (0)"}. Sum ${fp(c.v)} ${better ? "→ <b>new minimum</b>." : `is not below the current minimum ${fp(minval)} (root ${key(kmin)}).`}` });
        }
        let sum = 0; for (let s = i; s <= j; s++) sum += P[s - 1];
        cnt.additions += j - i; cnt["cells filled"]++;
        C[i][j] = minval + sum; R[i][j] = kmin;
        const stC = { [`${i},${j}`]: "done", [`${i},${kmin - 1}`]: "src", [`${kmin + 1},${j}`]: "src" };
        push({ line: [15, 16, 17, 18], stC, stR: { [`${i},${j}`]: "done" }, cell: [i, j],
          cands: shown.map((s) => Object.assign({}, s, { best: s.k === kmin })),
          formula: `C[${i}, ${j}] = min over k of (C[i, k−1] + C[k+1, j]) + Σ P = ${fp(minval)} + (${P.slice(i - 1, j).map(fp).join(" + ")}) = <b>${fp(C[i][j])}</b>;  R[${i}, ${j}] = ${kmin} (${key(kmin)})`,
          text: `Best root for ${key(i)}..${key(j)} is <b>${key(kmin)}</b>. Every key in the range sits one level below that root inside its subtree, so we add P[${i}] + … + P[${j}] = ${fp(sum)}: C[${i}, ${j}] = ${fp(minval)} + ${fp(sum)} = <b>${fp(C[i][j])}</b>.` });
      }
    }
    push({ line: 19, stC: { [`1,${n}`]: "done" }, stR: { [`1,${n}`]: "done" }, formula: `C[1, ${n}] = <b>${fp(C[1][n])}</b> average comparisons;  root = R[1, ${n}] = ${key(R[1][n])}`,
      text: `The top-right corner answers the whole problem: an optimal BST averages <b>${fp(C[1][n])}</b> comparisons per successful search. Now read R to build the tree.` });
    // build tree
    tree = { nodes: [], edges: [] };
    function build(i, j, depth, parent) {
      if (i > j) return;
      const k = R[i][j];
      tree.nodes.push({ k, depth });
      if (parent) tree.edges.push([parent, k]);
      push({ line: [23, 24], stR: { [`${i},${j}`]: "root" }, cell: null, hl: k,
        text: `BuildTree(${i}, ${j}): R[${i}, ${j}] = ${k}, so <b>${key(k)}</b> is the root of keys ${key(i)}..${key(j)}${parent ? `, attached under ${key(parent)}` : ""} (level ${depth}).` });
      build(i, k - 1, depth + 1, k);
      build(k + 1, j, depth + 1, k);
    }
    build(1, n, 1, null);
    const avg = tree.nodes.reduce((s, nd) => s + P[nd.k - 1] * nd.depth, 0);
    push({ line: 27, stC: { [`1,${n}`]: "done" },
      formula: `Σ P[k] × level(k) = ${tree.nodes.slice().sort((a, b) => a.k - b.k).map((nd) => `${fp(P[nd.k - 1])}·${nd.depth}`).join(" + ")} = <b>${fp(avg)}</b> = C[1, ${n}] ✓`,
      text: `Check: average comparisons = Σ probability × level. It equals C[1, ${n}] = ${fp(C[1][n])}. The table took ${cnt["k tried"]} candidate checks — Θ(n³) time, Θ(n²) space.` });
    return frames;
  }

  /* ---------------- drawing ---------------- */
  const FILL = { active: ["var(--c-active)", 0.32], src: ["var(--c-compare)", 0.36], done: ["var(--c-done)", 0.34], new: ["var(--c-swap)", 0.26], root: ["var(--c-pivot)", 0.4], off: ["var(--c-dim)", 0.35] };
  function drawMatrix(svg, n, M, st, isC) {
    const cw = 48, ch = 32, hw = 30, top = 28, pad = 6;
    const cols = n + 1, rows = n + 1, c0 = 0;
    const W = pad * 2 + hw + cols * cw, H = pad * 2 + top + rows * ch;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = "";
    svg.appendChild(S("text", { x: pad + 6, y: pad + 18, "font-size": 11, fill: "var(--muted)" }, "i\\j"));
    for (let c = 0; c < cols; c++) svg.appendChild(S("text", { x: pad + hw + c * cw + cw / 2, y: pad + 18, "text-anchor": "middle", "font-size": 13, "font-weight": 700, fill: "var(--ink-2)" }, String(c + c0)));
    for (let r = 0; r < rows; r++) {
      const i = r + 1, y = pad + top + r * ch;
      svg.appendChild(S("text", { x: pad + hw - 8, y: y + ch / 2 + 4, "text-anchor": "end", "font-size": 13, "font-weight": 700, fill: "var(--ink-2)" }, String(i)));
      for (let c = 0; c < cols; c++) {
        const j = c + c0, x = pad + hw + c * cw;
        const unused = isC ? j < i - 1 : j < i;
        const s = st[`${i},${j}`] || (unused ? "off" : null);
        const fc = FILL[s];
        svg.appendChild(S("rect", { x: x + 1, y: y + 1, width: cw - 2, height: ch - 2, rx: 5, fill: fc ? fc[0] : "var(--panel)", "fill-opacity": fc ? fc[1] : 1,
          stroke: s === "active" ? "var(--c-active)" : s === "done" ? "var(--c-done)" : s === "src" ? "var(--c-compare)" : s === "root" ? "var(--c-pivot)" : "var(--line)", "stroke-width": s && s !== "off" ? 2 : 1 }));
        const v = M[i] && M[i][j];
        if (v != null) svg.appendChild(S("text", { x: x + cw / 2, y: y + ch / 2 + 5, "text-anchor": "middle", "font-size": 13.5, "font-weight": 700, fill: "var(--ink)" }, isC ? fp(v) : keysNow[v - 1]));
      }
    }
  }
  function drawTree(svg, n, tree, hl, P) {
    const W = Math.max(320, n * 70 + 40);
    const H = tree && tree.nodes.length ? Math.max(170, 70 + (Math.max(...tree.nodes.map((d) => d.depth)) - 1) * 56) : 170;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = "";
    if (!tree || !tree.nodes.length) {
      svg.appendChild(S("text", { x: W / 2, y: H / 2, "text-anchor": "middle", "font-size": 13, fill: "var(--muted)" }, "The tree appears once the tables are full."));
      return;
    }
    const maxD = Math.max(...tree.nodes.map((d) => d.depth));
    const gy = 56;
    const pos = (k, depth) => [20 + ((k - 0.5) * (W - 40)) / n, 28 + (depth - 1) * gy];
    const depthOf = {}; tree.nodes.forEach((nd) => (depthOf[nd.k] = nd.depth));
    for (let d = 1; d <= maxD; d++) svg.appendChild(S("text", { x: 4, y: 28 + (d - 1) * gy + 4, "font-size": 10, fill: "var(--muted)" }, `L${d}`));
    tree.edges.forEach(([a, b]) => {
      const [x1, y1] = pos(a, depthOf[a]), [x2, y2] = pos(b, depthOf[b]);
      svg.appendChild(S("line", { x1, y1, x2, y2, stroke: "var(--line-2)", "stroke-width": 2 }));
    });
    tree.nodes.forEach((nd) => {
      const [x, y] = pos(nd.k, nd.depth), on = nd.k === hl;
      svg.appendChild(S("circle", { cx: x, cy: y, r: 17, fill: on ? "var(--c-pivot)" : "var(--c-done)", "fill-opacity": on ? 1 : 0.85, stroke: "var(--line-2)" }));
      svg.appendChild(S("text", { x, y: y + 5, "text-anchor": "middle", "font-size": 14, "font-weight": 800, fill: "#0d1117" }, keysNow[nd.k - 1]));
      svg.appendChild(S("text", { x, y: y + 31, "text-anchor": "middle", "font-size": 10.5, fill: "var(--ember-2)" }, fp(P[nd.k - 1])));
    });
  }
  function drawCands(f) {
    const host = $("cands");
    host.innerHTML = "";
    if (!f.cands) { host.appendChild(E("p", { class: "muted small", style: { margin: 0 } }, f.cell === null || !f.cell ? "No cell is being computed on this step." : "")); return; }
    const [i, j] = f.cell;
    const t = E("table", { class: "t cands" },
      E("tr", null, E("th", null, "root k"), E("th", null, `C[${i}, k−1]`), E("th", null, `C[k+1, ${j}]`), E("th", null, "sum")));
    f.cands.forEach((c) => {
      const cls = c.cur ? "cur" : c.best ? "best" : "";
      t.appendChild(E("tr", null, E("td", { class: cls }, `${c.k} (${keysNow[c.k - 1]})`), E("td", { class: cls }, c.l == null ? "·" : fp(c.l)), E("td", { class: cls }, c.r == null ? "·" : fp(c.r)), E("td", { class: cls }, c.v == null ? "·" : fp(c.v) + (c.best ? " ★" : ""))));
    });
    host.appendChild(t);
  }

  /* ---------------- wiring ---------------- */
  let keysNow = [], probsNow = [], predict = false;
  const score = { right: 0, total: 0 }, answered = {};
  const player = Forge.player($("player"), { frames: [], render });
  function render(f, idx) {
    const n = keysNow.length;
    drawMatrix($("svgC"), n, f.C, f.stC || {}, true);
    drawMatrix($("svgR"), n, f.R, f.stR || {}, false);
    drawTree($("svgT"), n, f.tree, f.hl, probsNow);
    drawCands(f);
    code.highlight(f.line);
    ctr.set(f.ctr);
    say.say(f.text);
    $("formula").innerHTML = f.formula || "&nbsp;";
    const box = $("ask");
    if (predict && f.ask) {
      player.pause();
      box.hidden = false;
      $("askQ").innerHTML = `Which root gives the cheapest tree for ${keysNow[f.ask.i - 1]}..${keysNow[f.ask.j - 1]}?`;
      const btns = $("askBtns"); btns.innerHTML = "";
      const a = answered[idx];
      f.ask.options.forEach((k) => btns.appendChild(E("button", { class: "btn sm" + (a && a.k === k ? " primary" : ""), disabled: !!a, onclick: () => answer(idx, f, k) }, keysNow[k - 1])));
      if (a) btns.appendChild(E("button", { class: "btn sm steel", onclick: () => player.go(idx + 1) }, "Continue ▶"));
      $("askFb").innerHTML = a ? a.fb : "";
    } else box.hidden = true;
  }
  function answer(idx, f, k) {
    const ok = f.ask.ok.includes(k);
    score.total++; if (ok) score.right++;
    $("score").textContent = `predictions: ${score.right} / ${score.total}`;
    answered[idx] = { k, fb: ok ? `<span style="color:var(--ok)">✓ Yes, ${keysNow[k - 1]} is optimal.</span>` : `<span style="color:var(--bad)">✗ Not optimal: best is ${f.ask.ok.map((x) => keysNow[x - 1]).join(" or ")}.</span> Step through the candidates to see why.` };
    player.go(idx);
  }
  function load() {
    const keys = $("keys").value.split(/[\s,;]+/).filter(Boolean).slice(0, 8);
    const P = $("probs").value.split(/[\s,;]+/).filter(Boolean).map(Number).slice(0, 8);
    if (keys.length < 2 || P.length !== keys.length || P.some((p) => !(p > 0))) {
      say.say(`Please give between 2 and 8 keys and the same number of positive probabilities (got ${keys.length} keys and ${P.length} probabilities).`);
      return;
    }
    keysNow = keys; probsNow = P;
    Object.keys(answered).forEach((k) => delete answered[k]);
    player.load(record(keys, P));
  }
  $("load").onclick = load;
  $("reset").onclick = () => { $("keys").value = "A, B, C, D"; $("probs").value = "0.1, 0.2, 0.4, 0.3"; load(); };
  $("rand").onclick = () => {
    const n = 4 + Math.floor(Math.random() * 3);
    const raw = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 9));
    const tot = raw.reduce((a, b) => a + b, 0);
    const p = raw.map((x) => Math.round((x / tot) * 100) / 100);
    p[n - 1] = Math.max(0.01, +(1 - p.slice(0, -1).reduce((a, b) => a + b, 0)).toFixed(2));
    $("keys").value = "ABCDEFGH".slice(0, n).split("").join(", ");
    $("probs").value = p.join(", ");
    load();
  };
  $("predictMode").onchange = (e) => { predict = e.target.checked; player.go(player.index); };
  ["keys", "probs"].forEach((id) => $(id).addEventListener("keydown", (e) => { if (e.key === "Enter") load(); }));
  load();
})();
