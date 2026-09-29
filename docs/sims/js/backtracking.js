/* Algorithm Forge · Backtracking simulation (n-Queens, subset-sum, Hamiltonian circuit)
   Record-then-play: each recorder builds a list of state-space-tree nodes (with the frame index at which
   each node is born / declared dead / declared a solution) plus one frame per step. render() draws frame i. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const E = Forge.el, S = Forge.svg;
  Forge.page({ title: "Backtracking", chapter: "Ch 12 · Coping with Limitations" });

  /* ------------------------------------------------------------------ pseudocode per problem */
  const CODE = {
    queens: [
      "ALGORITHM PlaceQueens(k)",
      "    // queens 1..k−1 are safe in col[1..k−1]",
      "    if k > n then",
      "        output col[1..n]           // a solution",
      "        return",
      "    for c ← 1 to n do",
      "        if Safe(k, c) then",
      "            col[k] ← c",
      "            PlaceQueens(k + 1)",
      "    return                         // backtrack",
      "",
      "ALGORITHM Safe(k, c)",
      "    for i ← 1 to k − 1 do",
      "        if col[i] = c or |col[i]−c| = k−i then",
      "            return false           // same column or diagonal",
      "    return true",
    ],
    subset: [
      "ALGORITHM SubsetSum(i, s)",
      "    // A[1..n] sorted; items 1..i decided",
      "    if s = d then",
      "        output chosen items        // solution",
      "    else if i = n then",
      "        return                     // leaf with s < d",
      "    else if s + A[i+1] > d then",
      "        return                     // too big: prune",
      "    else if s + rest(i) < d then   // rest(i) = A[i+1]+…+A[n]",
      "        return                     // too small: prune",
      "    else",
      "        SubsetSum(i + 1, s + A[i+1])   // with A[i+1]",
      "        SubsetSum(i + 1, s)            // without it",
    ],
    ham: [
      "ALGORITHM Hamilton(path[0..k])",
      "    // path[0] = a; extend the path one vertex per level",
      "    v ← path[k]",
      "    if k = n − 1 then",
      "        if v is adjacent to a then output path, a",
      "        return                     // otherwise a dead end",
      "    for each neighbor u of v in alphabetical order do",
      "        if u is not on path then",
      "            Hamilton(path[0..k] + u)",
      "    return                         // backtrack",
    ],
  };
  const COUNTERS = {
    queens: { "tree nodes": 0, "rejected ×": 0, solutions: 0, "nⁿ brute force": 0 },
    subset: { "nodes generated": 0, pruned: 0, solutions: 0, "full tree 2ⁿ⁺¹−1": 0 },
    ham: { "nodes generated": 0, "dead ends": 0, circuits: 0, "(n−1)! orders": 0 },
  };
  const HINT = {
    queens: "One queen per row; the search chooses a column for queen 1, then queen 2, … and backs up when a row has no safe square.",
    subset: "The set is sorted increasingly (the pruning tests rely on it). Left branch = include the next number, right branch = leave it out.",
    ham: "Click one vertex, then another, to add or remove the edge between them. The circuit starts at a and tries neighbors alphabetically.",
  };

  /* ------------------------------------------------------------------ UI scaffolding */
  let prob = "queens";
  let code, ctr;
  const say = Forge.narrate($("say"));
  const viewSvg = $("view"), treeSvg = $("tree"), treeBox = $("treeBox");
  let zoomed = false;
  let rec = null; // {nodes, frames, opts}
  const answered = {};

  function setupPanels() {
    $("code").innerHTML = "";
    $("ctr").innerHTML = "";
    code = Forge.code($("code"), CODE[prob]);
    ctr = Forge.counters($("ctr"), COUNTERS[prob]);
    ["queens", "subset", "ham"].forEach((p) => ($("g-" + p).hidden = p !== prob));
    $("hint").textContent = HINT[prob];
    $("viewTitle").textContent = { queens: "Board", subset: "Numbers & running sum", ham: "Graph (click two vertices to toggle an edge)" }[prob];
    viewSvg.classList.toggle("editable", prob === "ham");
  }

  /* ------------------------------------------------------------------ tree bookkeeping helpers */
  function makeTree(frames) {
    const nodes = [];
    let num = 0;
    return {
      nodes,
      add(parent, label, kind, extra) {
        const nd = Object.assign({ id: nodes.length, parent, kids: [], label, kind, born: frames.length, dead: Infinity, sol: Infinity, note: "", num: kind === "x" ? null : num++ }, extra || {});
        if (parent) parent.kids.push(nd);
        nodes.push(nd);
        return nd;
      },
    };
  }

  /* ================================================================== n-QUEENS */
  function countQueens(n, all) {
    const col = [];
    let prom = 1, rej = 0, done = false;
    (function go(k) {
      if (k === n) { if (!all) done = true; return; }
      for (let c = 0; c < n && !done; c++) {
        if (attacker(col, k, c) >= 0) { rej++; continue; }
        prom++; col[k] = c; go(k + 1); col.length = k;
      }
    })(0);
    return { prom, rej };
  }
  function attacker(col, k, c) {
    for (let i = 0; i < k; i++) if (col[i] === c || Math.abs(col[i] - c) === k - i) return i;
    return -1;
  }
  function nextSafe(col, k, from, n) {
    for (let c = from; c < n; c++) if (attacker(col, k, c) < 0) return c;
    return -1;
  }
  function askQueen(col, k, from, n, moving) {
    const opts = [];
    for (let c = 0; c < n; c++) opts.push("col " + (c + 1));
    opts.push("none: dead end");
    const c = nextSafe(col, k, from, n);
    const attacked = [];
    for (let x = from; x < (c < 0 ? n : c); x++) attacked.push(x + 1);
    const why = (attacked.length ? `Column${attacked.length > 1 ? "s" : ""} ${attacked.join(", ")} ${attacked.length > 1 ? "are" : "is"} attacked by an earlier queen. ` : "") +
      (c >= 0 ? `Column ${c + 1} is the first safe square.` : `No safe square is left in row ${k + 1}, so the search must back up.`);
    return {
      q: moving ? `Queen ${k + 1} must move right (past column ${from}). Where does it land next?` : `Row ${k + 1} is next. In which column will queen ${k + 1} be placed first?`,
      opts, ans: c < 0 ? n : c, why,
    };
  }

  function recQueens(n, all) {
    const tot = countQueens(n, all);
    const full = tot.prom + tot.rej <= 170; // draw every × as its own node only when the tree stays readable
    const frames = [], T = makeTree(frames);
    const col = [], path = [];
    let prom = 1, rej = 0, sols = 0, done = false;
    const root = T.add(null, "", "root");
    path.push(root.id);
    const push = (line, text, x) => frames.push(Object.assign({ line, text, cols: col.slice(), path: path.slice(), c: { "tree nodes": prom, "rejected ×": rej, solutions: sols, "nⁿ brute force": Math.pow(n, n).toLocaleString() } }, x || {}));
    push(0, `Start with an empty ${n}×${n} board (the root of the tree). Each queen gets its own row, so we only choose a column for queen 1, then queen 2, and so on.`, { ask: askQueen(col, 0, 0, n, false) });

    (function place(k, parent) {
      if (k === n) {
        sols++;
        parent.sol = frames.length;
        push([2, 3], `All ${n} queens are placed and none attack each other: <b>solution #${sols}</b> = (${col.map((c) => c + 1).join(", ")}).` + (all ? " We record it and keep searching by backtracking." : " We only wanted one, so the search stops."), { solved: true });
        if (!all) done = true;
        return;
      }
      let pend = [];
      for (let c = 0; c < n && !done; c++) {
        const att = attacker(col, k, c);
        if (att >= 0) {
          rej++;
          const how = col[att] === c ? "same column" : "same diagonal";
          if (full) {
            const x = T.add(parent, "×", "x");
            x.dead = frames.length;
            push([6, 13, 14], `Try square (${k + 1}, ${c + 1}): the queen in row ${att + 1} attacks it (${how}), so this node is <b>nonpromising</b> (×). Next column.`, { tryc: { r: k, c, ok: false, by: att } });
          } else pend.push(c);
          continue;
        }
        const nd = T.add(parent, String(c + 1), "ok");
        prom++;
        col[k] = c;
        path.push(nd.id);
        const pre = pend.length ? `Row ${k + 1}: column${pend.length > 1 ? "s" : ""} ${pend.map((x) => x + 1).join(", ")} ${pend.length > 1 ? "are" : "is"} attacked (×). ` : "";
        push([6, 7], pre + `Square (${k + 1}, ${c + 1}) is safe, so place queen ${k + 1} there. The partial solution is still <b>promising</b>; go one level deeper.`,
          { tryc: { r: k, c, ok: true }, xs: pend.slice(), xr: k, ask: k + 1 < n ? askQueen(col, k + 1, 0, n, false) : null });
        pend = [];
        place(k + 1, nd);
        if (done) return;
        path.pop();
        col.length = k;
      }
      if (done) return;
      const hasKid = parent.kids.some((q) => q.kind === "ok");
      if (!hasKid && parent.sol === Infinity && parent.kind !== "root") parent.dead = frames.length;
      const pre = pend.length ? `Row ${k + 1}: column${pend.length > 1 ? "s" : ""} ${pend.map((x) => x + 1).join(", ")} ${pend.length > 1 ? "are" : "is"} attacked (×). ` : "";
      if (k === 0) {
        push(9, pre + `Every column for queen 1 has been explored, so the whole tree is done.`, { xs: pend.slice(), xr: k });
      } else {
        const back = col[k - 1];
        const prevCol = col.slice(0, k - 1);
        push(9, pre + (hasKid ? `Every option below queen ${k} at column ${back + 1} has been explored.` : `Row ${k + 1} has <b>no safe square</b>: queen ${k} at column ${back + 1} leads to a <b>dead end</b>.`) + ` Backtrack: move queen ${k} to its next column.`,
          { xs: pend.slice(), xr: k, ask: askQueen(prevCol, k - 1, back + 1, n, true) });
      }
    })(0, root);

    const brute = Math.pow(n, n);
    push(done ? [2, 3] : 9, `<b>Finished.</b> ${sols} solution${sols === 1 ? "" : "s"}; the tree has ${prom} promising nodes (and ${rej} rejected squares). Brute force would examine nⁿ = ${brute.toLocaleString()} boards: backtracking touched ${((100 * (prom + rej)) / brute).toPrecision(2)}% as many nodes.`,
      { final: true, solved: done });
    return { nodes: T.nodes, frames, full, gap: full ? 30 : 30, n };
  }

  function drawBoard(f, R) {
    const n = R.n, pad = 22, size = 300, cs = size / n;
    viewSvg.setAttribute("viewBox", `0 0 ${size + pad + 8} ${size + pad + 8}`);
    viewSvg.innerHTML = "";
    for (let c = 0; c < n; c++) viewSvg.appendChild(S("text", { x: pad + cs * c + cs / 2, y: 15, "text-anchor": "middle", "font-size": 11, fill: "var(--muted)" }, String(c + 1)));
    for (let r = 0; r < n; r++) viewSvg.appendChild(S("text", { x: 10, y: pad + cs * r + cs / 2 + 4, "text-anchor": "middle", "font-size": 11, fill: "var(--muted)" }, String(r + 1)));
    const curRow = f.tryc ? f.tryc.r : f.xr != null ? f.xr : f.cols.length;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      viewSvg.appendChild(S("rect", { x: pad + c * cs, y: pad + r * cs, width: cs, height: cs, fill: (r + c) % 2 ? "var(--panel-2)" : "var(--bg)", stroke: "var(--line)", "stroke-width": 0.5 }));
    }
    if (curRow < n && !f.final) viewSvg.appendChild(S("rect", { x: pad, y: pad + curRow * cs, width: size, height: cs, fill: "none", stroke: "var(--ember)", "stroke-width": 2, "stroke-dasharray": "5 4" }));
    const X = (c) => pad + c * cs + cs / 2, Y = (r) => pad + r * cs + cs / 2;
    const cross = (r, c, col, w) => {
      const d = cs * 0.25;
      viewSvg.appendChild(S("path", { d: `M${X(c) - d} ${Y(r) - d} L${X(c) + d} ${Y(r) + d} M${X(c) + d} ${Y(r) - d} L${X(c) - d} ${Y(r) + d}`, stroke: col, "stroke-width": w, "stroke-linecap": "round" }));
    };
    (f.xs || []).forEach((c) => cross(f.xr, c, "var(--c-swap)", 2.5));
    if (f.tryc && !f.tryc.ok) {
      const t = f.tryc;
      viewSvg.appendChild(S("line", { x1: X(f.cols[t.by]), y1: Y(t.by), x2: X(t.c), y2: Y(t.r), stroke: "var(--c-swap)", "stroke-width": 2, "stroke-dasharray": "4 4" }));
      cross(t.r, t.c, "var(--c-swap)", 3.5);
    }
    f.cols.forEach((c, r) => {
      const isNew = f.tryc && f.tryc.ok && f.tryc.r === r;
      const fill = f.solved ? "var(--c-done)" : isNew ? "var(--c-compare)" : "var(--c-active)";
      viewSvg.appendChild(S("circle", { cx: X(c), cy: Y(r), r: cs * 0.36, fill }));
      viewSvg.appendChild(S("text", { x: X(c), y: Y(r) + cs * 0.15, "text-anchor": "middle", "font-size": cs * 0.42, fill: "#0d1117", style: "fill:#0d1117" }, "♛"));
    });
  }

  /* ================================================================== SUBSET-SUM */
  function recSubset(Ain, d, all) {
    const A = Ain.slice().sort((a, b) => a - b), n = A.length;
    const rest = new Array(n + 1).fill(0);
    for (let i = n - 1; i >= 0; i--) rest[i] = rest[i + 1] + A[i];
    const frames = [], T = makeTree(frames);
    const inc = [], path = [];
    let gen = 0, pruned = 0, sols = 0, done = false;
    const full = Math.pow(2, n + 1) - 1;
    const push = (line, text, x) => frames.push(Object.assign({ line, text, inc: inc.slice(), path: path.slice(), c: { "nodes generated": gen, pruned, solutions: sols, "full tree 2ⁿ⁺¹−1": full.toLocaleString() } }, x || {}));
    const verdict = (i, s) => (s === d ? 0 : i === n ? 2 : s + A[i] > d ? 1 : s + rest[i] < d ? 2 : 3);
    const OPTS = ["solution (s = d)", "prune: too big", "prune: too small", "promising → branch"];

    (function visit(i, s, parent, edge, callLine) {
      const nd = T.add(parent, String(s), "ok", { edge });
      gen++;
      path.push(nd.id);
      const v = verdict(i, s);
      const why = [
        `s = ${s} equals d = ${d}.`,
        `s + A[${i + 1}] = ${s} + ${A[i]} = ${s + A[i]} > ${d}: even the smallest remaining number overshoots.`,
        i === n ? `No numbers are left and s = ${s} < ${d}.` : `s + (all remaining) = ${s} + ${rest[i]} = ${s + rest[i]} < ${d}: even taking everything left falls short.`,
        `Neither test fails: ${s} + ${A[i]} ≤ ${d} and ${s} + ${rest[i]} ≥ ${d}, so a solution may lie below.`,
      ][v];
      const what = i === 0 ? "the root (nothing decided yet)" : `${edge} (level ${i})`;
      push(callLine, `Generate node for ${what}: running sum s = <b>${s}</b>. Is it promising?`, { cur: i, s, ask: { q: `Node with s = ${s} at level ${i}${i < n ? ` (next number ${A[i]}, remaining total ${rest[i]})` : " (no numbers left)"}: what happens to it?`, opts: OPTS, ans: v, why } });
      if (v === 0) {
        sols++;
        nd.sol = frames.length;
        const set = A.filter((_, k) => inc[k]);
        push([2, 3], `s = d = ${d}: <b>solution #${sols}</b> {${set.join(", ")}}.` + (all ? " Record it and backtrack to look for more." : " One solution is enough, so stop."), { cur: i, s, solved: true });
        if (!all) done = true;
      } else if (v !== 3) {
        pruned++;
        nd.dead = frames.length;
        nd.note = v === 1 ? `${s}+${A[i]}>${d}` : i === n ? `${s}<${d}` : `${s}+${rest[i]}<${d}`;
        push(v === 1 ? [6, 7] : i === n ? [4, 5] : [8, 9], `<b>Nonpromising.</b> ${why} Backtrack to the parent.`, { cur: i, s });
      } else {
        push([10, 11], `<b>Promising.</b> ${why} Branch left first: include ${A[i]}.`, { cur: i, s });
        inc[i] = true;
        visit(i + 1, s + A[i], nd, `with ${A[i]}`, 11);
        if (!done) {
          inc[i] = false;
          visit(i + 1, s, nd, `w/o ${A[i]}`, 12);
        }
        if (!done) inc.length = i;
      }
      if (!done) path.pop();
    })(0, 0, null, "", 0);

    push(done ? [2, 3] : 0, `<b>Finished.</b> ${sols} solution${sols === 1 ? "" : "s"} after generating ${gen} nodes, of which ${pruned} were pruned as nonpromising. The complete binary tree of all 2ⁿ = ${Math.pow(2, n)} subsets has ${full} nodes.`, { final: true, cur: null, s: null, solved: done });
    return { nodes: T.nodes, frames, full: T.nodes.length <= 160, gap: 50, A, d, rest, n };
  }

  function drawSubset(f, R) {
    const A = R.A, n = A.length, W = 330;
    const cw = Math.min(46, (W - 20) / n);
    const H = 214;
    viewSvg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    viewSvg.innerHTML = "";
    const x0 = (W - cw * n) / 2;
    viewSvg.appendChild(S("text", { x: 10, y: 18, "font-size": 11, fill: "var(--muted)" }, "A (sorted):"));
    A.forEach((a, k) => {
      const st = f.inc[k] === true ? "in" : f.inc[k] === false ? "out" : "open";
      const fill = st === "in" ? "var(--c-active)" : st === "out" ? "var(--c-dim)" : "var(--panel-2)";
      const isNext = f.cur === k;
      viewSvg.appendChild(S("rect", { x: x0 + k * cw + 3, y: 28, width: cw - 6, height: 34, rx: 7, fill, stroke: isNext ? "var(--c-compare)" : "var(--line-2)", "stroke-width": isNext ? 3 : 1 }));
      viewSvg.appendChild(S("text", { x: x0 + k * cw + cw / 2, y: 50, "text-anchor": "middle", "font-size": 13, "font-weight": 700, style: st === "in" ? "fill:#0d1117" : "", fill: "var(--ink)" }, String(a)));
      viewSvg.appendChild(S("text", { x: x0 + k * cw + cw / 2, y: 76, "text-anchor": "middle", "font-size": 9, fill: "var(--muted)" }, st === "in" ? "in" : st === "out" ? "out" : isNext ? "next" : "?"));
    });
    // sum bar
    const total = R.rest[0];
    const max = Math.max(R.d, total) * 1.05;
    const bx = 14, bw = W - 28, by = 110, bh = 26;
    const sx = (v) => bx + (bw * v) / max;
    viewSvg.appendChild(S("text", { x: 10, y: 100, "font-size": 11, fill: "var(--muted)" }, "running sum s vs. target d:"));
    viewSvg.appendChild(S("rect", { x: bx, y: by, width: bw, height: bh, rx: 5, fill: "var(--panel-2)", stroke: "var(--line)" }));
    if (f.s != null) {
      const s = f.s, i = f.cur;
      if (i != null && i < n) {
        // ghost: everything that is left
        viewSvg.appendChild(S("rect", { x: sx(s), y: by + 2, width: Math.max(0, sx(s + R.rest[i]) - sx(s)), height: bh - 4, fill: "none", stroke: "var(--muted)", "stroke-dasharray": "3 3" }));
        // next item
        viewSvg.appendChild(S("rect", { x: sx(s), y: by + 4, width: Math.max(0, sx(s + A[i]) - sx(s)), height: bh - 8, rx: 3, fill: "var(--c-compare)", opacity: 0.8 }));
      }
      viewSvg.appendChild(S("rect", { x: bx, y: by, width: Math.max(0, sx(s) - bx), height: bh, rx: 5, fill: f.solved ? "var(--c-done)" : "var(--c-active)" }));
    }
    viewSvg.appendChild(S("line", { x1: sx(R.d), y1: by - 8, x2: sx(R.d), y2: by + bh + 8, stroke: "var(--ember)", "stroke-width": 3 }));
    viewSvg.appendChild(S("text", { x: sx(R.d), y: by + bh + 22, "text-anchor": "middle", "font-size": 11, fill: "var(--ember)" }, "d = " + R.d));
    if (f.s != null) {
      viewSvg.appendChild(S("text", { x: 10, y: 180, "font-size": 12, fill: "var(--ink)" }, `s = ${f.s}` + (f.cur != null && f.cur < n ? `   s + next = ${f.s + A[f.cur]}   s + rest = ${f.s + R.rest[f.cur]}` : "")));
    }
    viewSvg.appendChild(S("text", { x: 10, y: 202, "font-size": 10, fill: "var(--muted)" }, "yellow = next number · dashed = all remaining numbers"));
  }

  /* ================================================================== HAMILTONIAN CIRCUIT */
  const LET = "abcdefgh";
  const BOOK_POS = { a: [60, 60], b: [270, 60], c: [165, 150], d: [60, 240], e: [165, 300], f: [270, 240] };
  let G = { n: 6, pos: Object.assign({}, BOOK_POS), edges: parseEdges("ab ac ad bc bf cd ce de ef", 6) };
  let selV = null;

  function parseEdges(txt, n) {
    const set = new Set();
    (txt.toLowerCase().match(/[a-h]\s*[-–]?\s*[a-h]/g) || []).forEach((p) => {
      const u = p[0], v = p[p.length - 1];
      if (u === v || LET.indexOf(u) >= n || LET.indexOf(v) >= n) return;
      set.add([u, v].sort().join(""));
    });
    return set;
  }
  const edgesText = () => [...G.edges].sort().join(" ");
  function circlePos(n) {
    const pos = {};
    for (let k = 0; k < n; k++) {
      const t = -Math.PI / 2 - Math.PI / n + (2 * Math.PI * k) / n;
      pos[LET[k]] = [165 + 125 * Math.cos(t), 175 + 125 * Math.sin(t)];
    }
    return pos;
  }
  const adj = (u, v) => G.edges.has([u, v].sort().join(""));
  const fact = (k) => (k <= 1 ? 1 : k * fact(k - 1));

  function recHam(all) {
    const n = G.n, V = LET.slice(0, n).split("");
    const nb = {};
    V.forEach((v) => (nb[v] = V.filter((u) => adj(u, v))));
    const frames = [], T = makeTree(frames);
    const path = [], pids = [];
    let gen = 0, deads = 0, sols = 0, done = false;
    const orders = fact(n - 1);
    const push = (line, text, x) => frames.push(Object.assign({ line, text, hp: path.slice(), path: pids.slice(), c: { "nodes generated": gen, "dead ends": deads, circuits: sols, "(n−1)! orders": orders.toLocaleString() } }, x || {}));
    function askNext() {
      const v = path[path.length - 1];
      const cand = nb[v].filter((u) => !path.includes(u));
      const opts = V.filter((u) => !path.includes(u)).concat(["none: dead end"]);
      const ans = cand.length ? opts.indexOf(cand[0]) : opts.length - 1;
      return {
        q: `The path is ${path.join("–")}. Which vertex will be added next?`, opts, ans,
        why: cand.length ? `The unvisited neighbors of ${v} are ${cand.join(", ")}; alphabetical order picks ${cand[0]}.` : `Every neighbor of ${v} (${nb[v].join(", ") || "none"}) is already on the path.`,
      };
    }
    (function visit(v, parent, callLine) {
      path.push(v);
      const nd = T.add(parent, v, "ok");
      gen++;
      pids.push(nd.id);
      const k = path.length - 1;
      push(callLine, k === 0 ? `Without loss of generality a circuit can start at vertex <b>a</b>: it becomes the root.` : `Extend the path to <b>${v}</b>: ${path.join("–")} (${k + 1} of ${n} vertices).`,
        { cur: v, ask: k < n - 1 ? askNext() : { q: `All ${n} vertices are on the path ${path.join("–")}. Can it close into a circuit?`, opts: [`yes: ${v}–a is an edge`, `no: dead end`], ans: adj(v, "a") ? 0 : 1, why: adj(v, "a") ? `${v} is adjacent to a, so the path closes.` : `${v} is not adjacent to a, so this full path cannot close.` } });
      if (k === n - 1) {
        if (adj(v, "a")) {
          sols++;
          nd.sol = frames.length;
          push(4, `${v} is adjacent to a, so the path closes: <b>Hamiltonian circuit #${sols}</b> ${path.join(", ")}, a.` + (all ? " Record it and backtrack for more." : " Stop at the first one."), { cur: v, solved: true });
          if (!all) done = true;
        } else {
          deads++;
          nd.dead = frames.length;
          nd.note = "dead end";
          push(5, `Every vertex is on the path, but ${v} has no edge back to a: <b>dead end</b>. Backtrack.`, { cur: v });
        }
      } else {
        let any = false;
        for (const u of nb[v]) {
          if (done) break;
          if (path.includes(u)) continue;
          any = true;
          visit(u, nd, [7, 8]);
        }
        if (!done) {
          if (!any) {
            deads++;
            nd.dead = frames.length;
            nd.note = "dead end";
            push([6, 9], `All neighbors of ${v} (${nb[v].join(", ") || "none"}) are already on the path: <b>dead end</b>. Backtrack to ${path[k - 1] || "—"}.`, { cur: v });
          } else if (k > 0) {
            push(9, `Every option below ${v} has been explored. Backtrack to ${path[k - 1]} and try its next neighbor.`, { cur: v });
          }
        }
      }
      if (!done) { path.pop(); pids.pop(); }
    })("a", null, 0);
    push(done ? 4 : 9, `<b>Finished.</b> ${sols ? sols + " Hamiltonian circuit" + (sols > 1 ? "s" : "") + " found" : "No Hamiltonian circuit exists in this graph"} after generating ${gen} nodes (${deads} dead ends). Exhaustive search would check all (n−1)! = ${orders.toLocaleString()} orders of the other vertices.`, { final: true, solved: done, cur: null });
    return { nodes: T.nodes, frames, full: T.nodes.length <= 140, gap: 50, n };
  }

  function drawHam(f) {
    const nodes = LET.slice(0, G.n).split("").map((v) => ({ id: v, x: G.pos[v][0], y: G.pos[v][1] }));
    const edges = [...G.edges].map((e) => ({ u: e[0], v: e[1] }));
    const nodeState = {}, edgeState = {};
    const hp = f ? f.hp : [];
    hp.forEach((v) => (nodeState[v] = f.solved ? "done" : "active"));
    if (f && f.cur && !f.solved) nodeState[f.cur] = "compare";
    for (let k = 1; k < hp.length; k++) edgeState[hp[k - 1] + "-" + hp[k]] = f.solved ? "done" : "tree";
    if (f && f.solved && hp.length) edgeState[hp[hp.length - 1] + "-a"] = "done";
    if (selV) nodeState[selV] = "ember";
    Forge.graph(viewSvg, { nodes, edges }, { width: 330, height: 350, r: 17, nodeState, edgeState, nodeNote: hp.length ? Object.fromEntries(hp.map((v, k) => [v, "#" + (k + 1)])) : {} });
  }

  viewSvg.addEventListener("click", (ev) => {
    if (prob !== "ham") return;
    const pt = viewSvg.createSVGPoint();
    pt.x = ev.clientX; pt.y = ev.clientY;
    const p = pt.matrixTransform(viewSvg.getScreenCTM().inverse());
    let hit = null;
    LET.slice(0, G.n).split("").forEach((v) => { if (Math.hypot(G.pos[v][0] - p.x, G.pos[v][1] - p.y) < 24) hit = v; });
    if (!hit) { selV = null; renderCurrent(); return; }
    if (!selV) { selV = hit; renderCurrent(); say.say(`Selected <b>${hit}</b>. Click another vertex to add or remove the edge ${hit}–?, or click empty space to cancel.`); return; }
    if (selV === hit) { selV = null; renderCurrent(); return; }
    const key = [selV, hit].sort().join("");
    if (G.edges.has(key)) G.edges.delete(key); else G.edges.add(key);
    selV = null;
    $("hE").value = edgesText();
    run();
  });

  /* ================================================================== TREE DRAWING */
  function layoutTree(R) {
    const nodes = R.nodes.filter((nd) => R.full || nd.kind !== "x");
    const inc = new Set(nodes.map((nd) => nd.id));
    let leaf = 0, depth = 0;
    (function place(nd, dep) {
      nd.depth = dep;
      depth = Math.max(depth, dep);
      const kids = nd.kids.filter((k) => inc.has(k.id));
      if (!kids.length) nd.lx = leaf++;
      else { kids.forEach((k) => place(k, dep + 1)); nd.lx = (kids[0].lx + kids[kids.length - 1].lx) / 2; }
    })(nodes[0], 0);
    const labeled = R.full;
    const natGap = labeled ? R.gap : 16;
    const dy = labeled ? 60 : 44;
    const fitGap = labeled ? R.gap : Math.min(16, Math.max(420, Math.min(leaf * 16, 2.6 * (depth * dy + 30))) / Math.max(1, leaf));
    R.lay = { nodes, labeled, leaf, depth, natGap, fitGap, dy };
  }

  function drawTree(f, i, R) {
    const L = R.lay;
    const gap = zoomed ? L.natGap : L.fitGap;
    const padX = 30, padTop = labeledTop(L), H = padTop + L.depth * L.dy + (L.labeled ? 44 : 16);
    const W = Math.max(zoomed ? 0 : 420, L.leaf * gap + 2 * padX - gap);
    const offX = (W - (L.leaf - 1) * gap) / 2;
    const X = (nd) => offX + nd.lx * gap, Y = (nd) => padTop + nd.depth * L.dy;
    treeSvg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    treeSvg.style.width = zoomed ? W + "px" : "100%";
    treeSvg.innerHTML = "";
    const onPath = new Set(f.path || []);
    const shown = L.nodes.filter((nd) => nd.born <= i);
    const r = L.labeled ? 13 : Math.max(1.6, Math.min(6, gap * 0.38));
    const g = S("g", null);
    shown.forEach((nd) => {
      if (!nd.parent) return;
      const a = nd.parent, hot = onPath.has(nd.id);
      g.appendChild(S("line", { x1: X(a), y1: Y(a), x2: X(nd), y2: Y(nd), stroke: hot ? "var(--c-active)" : nd.kind === "x" ? "var(--c-swap)" : "var(--line-2)", "stroke-width": hot ? (L.labeled ? 3 : 2) : L.labeled ? 1.5 : 0.8, opacity: nd.kind === "x" ? 0.6 : 1 }));
      if (L.labeled && nd.edge && L.nodes.length <= 60) {
        const mx = (X(a) + X(nd)) / 2, my = (Y(a) + Y(nd)) / 2;
        g.appendChild(S("text", { x: mx + (X(nd) < X(a) ? -4 : 4), y: my, "text-anchor": X(nd) < X(a) ? "end" : "start", "font-size": 9, fill: "var(--muted)" }, nd.edge));
      }
    });
    let cur = null;
    shown.forEach((nd) => {
      const x = X(nd), y = Y(nd);
      if (nd.born === i) cur = nd;
      if (nd.kind === "x") {
        const d = L.labeled ? 6 : r;
        g.appendChild(S("path", { d: `M${x - d} ${y - d} L${x + d} ${y + d} M${x + d} ${y - d} L${x - d} ${y + d}`, stroke: "var(--c-swap)", "stroke-width": nd.born === i ? 3.5 : 2.5, "stroke-linecap": "round" }));
        return;
      }
      let fill = "var(--c-bar)", ink = "#0d1117", stroke = "none", sw = 0, op = 1;
      if (nd.sol <= i) fill = "var(--c-done)";
      else if (nd.dead <= i) { fill = "var(--c-swap)"; op = 0.85; }
      else if (onPath.has(nd.id)) fill = "var(--c-active)";
      if (nd.born === i) { stroke = "var(--c-compare)"; sw = L.labeled ? 4 : 2; if (!(nd.sol <= i) && !(nd.dead <= i)) fill = "var(--c-compare)"; }
      g.appendChild(S("circle", { cx: x, cy: y, r: nd.kind === "root" && L.labeled ? 15 : r, fill, stroke, "stroke-width": sw, opacity: op }));
      if (L.labeled) {
        g.appendChild(S("text", { x, y: y + 4.5, "text-anchor": "middle", "font-size": 12, "font-weight": 700, style: `fill:${ink}` }, nd.kind === "root" ? (nd.label || "·") : nd.label));
        if (nd.num != null) g.appendChild(S("text", { x: x + 15, y: y - 12, "font-size": 9, fill: "var(--muted)" }, String(nd.num)));
        if (nd.note && nd.dead <= i) g.appendChild(S("text", { x, y: y + 27, "text-anchor": "middle", "font-size": 9.5, fill: "var(--c-swap)" }, nd.note));
        if (nd.sol <= i) g.appendChild(S("text", { x, y: y + 27, "text-anchor": "middle", "font-size": 9.5, "font-weight": 700, fill: "var(--c-done)" }, "solution"));
      }
    });
    treeSvg.appendChild(g);
    if (zoomed && cur) {
      const target = X(cur) - treeBox.clientWidth / 2;
      treeBox.scrollLeft = Math.max(0, target);
    }
  }
  const labeledTop = (L) => (L.labeled ? 26 : 12);

  /* ================================================================== PREDICT BOX */
  function showAsk(f, i) {
    const box = $("ask");
    if (!f.ask || !$("predict").checked) { box.hidden = true; box.innerHTML = ""; return; }
    const a = f.ask, key = prob + ":" + i, got = answered[key];
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

  /* ================================================================== RENDER / RUN */
  function render(f, i) {
    if (!rec) return;
    if (prob === "queens") drawBoard(f, rec);
    else if (prob === "subset") drawSubset(f, rec);
    else drawHam(f);
    drawTree(f, i, rec);
    code.highlight(f.line);
    ctr.set(f.c);
    say.say(f.text);
    showAsk(f, i);
  }
  function renderCurrent() {
    if (rec && player) render(player.frames[player.index], player.index);
    else if (prob === "ham") drawHam(null);
  }
  const player = Forge.player($("player"), { frames: [], render, fps: 3 });

  function run() {
    const all = $("mode").value === "all";
    Object.keys(answered).forEach((k) => delete answered[k]);
    if (prob === "queens") rec = recQueens(+$("qn").value, all);
    else if (prob === "subset") {
      const A = $("sA").value.split(/[\s,{}]+/).filter(Boolean).map(Number).filter((x) => Number.isInteger(x) && x > 0).slice(0, 10);
      const d = Math.max(1, Math.floor(+$("sd").value || 1));
      if (!A.length) { say.say("Type at least one positive integer."); return; }
      $("sA").value = A.slice().sort((a, b) => a - b).join(", ");
      rec = recSubset(A, d, all);
    } else rec = recHam(all);
    layoutTree(rec);
    player.load(rec.frames);
  }

  /* ------------------------------------------------------------------ controls */
  $("prob").onchange = () => {
    prob = $("prob").value;
    $("mode").value = prob === "subset" ? "all" : "first";
    setupPanels();
    run();
  };
  $("mode").onchange = run;
  $("qn").oninput = () => { $("nval").textContent = $("qn").value; run(); };
  $("sLoad").onclick = run;
  $("sd").onchange = run;
  $("sRand").onclick = () => {
    const n = 4 + Math.floor(Math.random() * 3);
    const set = new Set();
    while (set.size < n) set.add(1 + Math.floor(Math.random() * 15));
    const A = [...set].sort((a, b) => a - b);
    const tot = A.reduce((s, x) => s + x, 0);
    $("sA").value = A.join(", ");
    $("sd").value = Math.max(A[0], Math.round(tot * (0.35 + Math.random() * 0.3)));
    run();
  };
  $("hLoad").onclick = () => {
    const n = +$("hn").value;
    if (n !== G.n) { G.n = n; G.pos = n === 6 ? Object.assign({}, BOOK_POS) : circlePos(n); }
    G.edges = parseEdges($("hE").value, n);
    $("hE").value = edgesText();
    run();
  };
  $("hn").onchange = () => {
    const n = +$("hn").value;
    G.n = n;
    G.pos = circlePos(n);
    G.edges = parseEdges(edgesText(), n);
    $("hE").value = edgesText();
    run();
  };
  $("hRand").onclick = () => {
    const n = G.n, V = LET.slice(0, n).split("");
    G.edges = new Set();
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (Math.random() < 0.45) G.edges.add(V[a] + V[b]);
    // make every vertex have degree ≥ 2 so the instance is interesting
    V.forEach((v, k) => {
      let deg = V.filter((u) => adj(u, v)).length;
      while (deg < 2) { const u = V[(k + 1 + Math.floor(Math.random() * (n - 1))) % n]; if (u !== v && !adj(u, v)) { G.edges.add([u, v].sort().join("")); deg++; } }
    });
    $("hE").value = edgesText();
    run();
  };
  $("hReset").onclick = () => {
    G = { n: 6, pos: Object.assign({}, BOOK_POS), edges: parseEdges("ab ac ad bc bf cd ce de ef", 6) };
    $("hn").value = "6";
    $("hE").value = edgesText();
    run();
  };
  $("zoom").onclick = () => {
    zoomed = !zoomed;
    treeBox.classList.toggle("zoom", zoomed);
    $("zoom").textContent = zoomed ? "⤡ Fit to width" : "⤢ Full size";
    renderCurrent();
  };
  $("predict").onchange = renderCurrent;

  setupPanels();
  run();
})();
