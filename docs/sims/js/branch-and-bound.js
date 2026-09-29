/* Algorithm Forge · Best-first branch-and-bound (assignment problem, 0/1 knapsack)
   Recorders build the state-space tree (each node remembers the frame at which it is born, expanded,
   terminated, becomes the best solution, or loses that title) plus one frame per step. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const E = Forge.el, S = Forge.svg;
  Forge.page({ title: "Branch-and-Bound", chapter: "Ch 12 · Coping with Limitations" });

  const CODE = {
    assign: [
      "ALGORITHM AssignmentBB(C[1..n,1..n])",
      "    best ← ∞;  live ← {root}",
      "    while live ≠ ∅ do",
      "        v ← live node, smallest lb",
      "        remove v from live",
      "        for each free job j do",
      "            u ← v + (next person → j)",
      "            lb(u) ← cost + Σ row minima",
      "            if u is complete then",
      "                best ← min(best, cost(u))",
      "            else if lb(u) < best then",
      "                add u to live",
      "            else terminate u",
      "        cut live nodes with lb ≥ best",
      "    return best",
    ],
    knap: [
      "ALGORITHM KnapsackBB(w[1..n],v[1..n],W)",
      "    best ← 0;  live ← {root}",
      "    while live ≠ ∅ do",
      "        x ← live node, largest ub",
      "        remove x from live",
      "        for y ← with, w/o next item do",
      "            if weight(y) > W then cut y",
      "            ub ← v + (W − w)·v[i+1]/w[i+1]",
      "            if y is a leaf then",
      "                best ← max(best, value(y))",
      "            else if ub(y) > best then",
      "                add y to live",
      "            else terminate y",
      "        cut live nodes with ub ≤ best",
      "    return best",
    ],
  };
  const P = "abcde";
  const fact = (k) => (k <= 1 ? 1 : k * fact(k - 1));
  const fmt = (x) => (Number.isInteger(x) ? String(x) : (Math.round(x * 10) / 10).toFixed(1));

  let prob = "assign";
  let code, ctr, rec = null, zoomed = false;
  const say = Forge.narrate($("say"));
  const viewSvg = $("view"), treeSvg = $("tree"), treeBox = $("treeBox");
  const answered = {};

  const BOOK = [[9, 2, 7, 8], [6, 4, 3, 7], [5, 8, 1, 8], [7, 6, 9, 4]];
  let M = BOOK.map((r) => r.slice());

  function buildMatrixInputs() {
    const t = $("mx");
    t.innerHTML = "";
    const n = M.length;
    const hr = E("tr", null, E("th", null, ""));
    for (let j = 0; j < n; j++) hr.appendChild(E("th", null, "job " + (j + 1)));
    t.appendChild(hr);
    M.forEach((row, i) => {
      const tr = E("tr", null, E("th", null, P[i]));
      row.forEach((v, j) => tr.appendChild(E("td", null, E("input", { type: "number", min: 0, max: 99, value: v, "aria-label": `cost ${P[i]} job ${j + 1}`, onchange: (e) => { M[i][j] = Math.max(0, Math.min(99, Math.round(+e.target.value || 0))); e.target.value = M[i][j]; run(); } }))));
      t.appendChild(tr);
    });
  }

  function setupPanels() {
    $("code").innerHTML = "";
    $("ctr").innerHTML = "";
    code = Forge.code($("code"), CODE[prob]);
    ctr = Forge.counters($("ctr"), prob === "assign"
      ? { "nodes generated": 0, expanded: 0, terminated: 0, "best cost": "∞", "n! assignments": 0 }
      : { "nodes generated": 0, expanded: 0, terminated: 0, "best value": 0, "2ⁿ subsets": 0 });
    $("g-assign").hidden = prob !== "assign";
    $("g-knap").hidden = prob !== "knap";
    $("viewTitle").textContent = prob === "assign" ? "Cost matrix at the focus node" : "Items & knapsack at the focus node";
    $("hint").textContent = prob === "assign"
      ? "Assign each person (row) a different job (column) so that the total cost is as small as possible. Edit any cell and the search reruns."
      : "Type items as weight:value pairs. They are re-numbered in order of value per unit weight, largest first, as the upper bound requires.";
  }

  /* ================================================================== ASSIGNMENT */
  function recAssign(C) {
    const n = C.length;
    const frames = [], nodes = [];
    let live = [], best = Infinity, bestNode = null, gen = 0, expd = 0, term = 0;
    function bound(assign) {
      const used = new Set(assign);
      let cost = 0;
      assign.forEach((c, r) => (cost += C[r][c]));
      const terms = [];
      for (let r = assign.length; r < n; r++) {
        let bc = -1;
        for (let c = 0; c < n; c++) if (!used.has(c) && (bc < 0 || C[r][c] < C[r][bc])) bc = c;
        terms.push({ r, c: bc, val: C[r][bc] });
      }
      return { cost, terms, lb: cost + terms.reduce((s, t) => s + t.val, 0) };
    }
    function mk(parent, assign) {
      const b = bound(assign);
      const nd = { id: nodes.length, parent, kids: [], assign, lb: b.lb, cost: b.cost, terms: b.terms, complete: assign.length === n, born: frames.length, expAt: Infinity, deadAt: Infinity, bestAt: Infinity, lostAt: Infinity, why: "" };
      if (parent) parent.kids.push(nd);
      nodes.push(nd);
      gen++;
      return nd;
    }
    const expr = (nd) => {
      const parts = nd.assign.map((c, r) => C[r][c]);
      const rest = nd.terms.map((t) => t.val);
      return (parts.length ? parts.join(" + ") : "") + (parts.length && rest.length ? " + " : "") + (rest.length ? (parts.length ? "(" + rest.join(" + ") + ")" : rest.join(" + ")) : "") + " = " + nd.lb;
    };
    const push = (line, text, x) => frames.push(Object.assign({ line, text, live: live.map((d) => d.id), best, c: { "nodes generated": gen, expanded: expd, terminated: term, "best cost": best === Infinity ? "∞" : best, "n! assignments": fact(n) } }, x || {}));
    const root = mk(null, []);
    root.lines = ["start", "lb = " + root.lb];
    live.push(root);
    push(1, `Root: nobody is assigned yet. A lower bound (lb) on <i>any</i> assignment is the sum of the row minima: lb = ${expr(root)}. It need not be a legal assignment (two minima may share a column); it only says “you can't do better than this”.`, { focus: root.id });

    while (live.length) {
      live.sort((a, b) => a.lb - b.lb || a.id - b.id);
      const v = live[0];
      const byId = live.slice().sort((a, b) => a.id - b.id);
      frames[frames.length - 1].ask = {
        q: "Which live node will be expanded next?",
        opts: byId.map((d) => `node ${d.id} (lb ${d.lb})`), ans: byId.indexOf(v),
        why: `Best-first means smallest lower bound: node ${v.id} has lb = ${v.lb}` + (live.filter((d) => d.lb === v.lb).length > 1 ? " (ties go to the node generated first)." : "."),
      };
      live.shift();
      v.expAt = frames.length;
      expd++;
      const k = v.assign.length;
      push([3, 4], `Live nodes: ${byId.map((d) => `${d.id} (lb ${d.lb})`).join(", ")}. Node ${v.id} has the smallest lb, so it is the most promising: expand it by giving person <b>${P[k]}</b> each job that is still free.`, { focus: v.id, pick: v.id });
      const used = new Set(v.assign);
      for (let j = 0; j < n; j++) {
        if (used.has(j)) continue;
        const a = v.assign.concat([j]);
        let forced = null;
        if (a.length === n - 1) { for (let c = 0; c < n; c++) if (!a.includes(c)) forced = c; a.push(forced); }
        const u = mk(v, a);
        if (u.complete) {
          u.lines = [`${P[k]}→${j + 1}, ${P[n - 1]}→${forced + 1}`, "cost = " + u.cost];
          const listing = a.map((c, r) => `${P[r]}→${c + 1}`).join(", ");
          if (u.cost < best) {
            if (bestNode) { bestNode.lostAt = frames.length; bestNode.why = "inferior"; term++; }
            best = u.cost;
            bestNode = u;
            u.bestAt = frames.length;
            push([6, 8, 9], `Node ${u.id}: ${P[k]}→${j + 1} leaves only person ${P[n - 1]}, who must take job ${forced + 1}. That is a complete assignment {${listing}} with cost <b>${u.cost}</b>, better than anything so far: <b>best = ${best}</b>.`, { focus: u.id });
          } else {
            u.deadAt = frames.length;
            u.why = "inferior";
            term++;
            push([6, 8, 9], `Node ${u.id}: the complete assignment {${listing}} costs ${u.cost}, which is not better than best = ${best}. It is an <b>inferior solution</b>: terminate it.`, { focus: u.id });
          }
        } else {
          u.lines = [`${P[k]}→${j + 1}`, "lb = " + u.lb];
          if (u.lb < best) {
            live.push(u);
            push([5, 6, 7, 10, 11], `Node ${u.id}: ${P[k]}→${j + 1}. lb = ${expr(u)}` + (best < Infinity ? ` < best = ${best}` : "") + `, so it joins the live nodes.`, { focus: u.id });
          } else {
            u.deadAt = frames.length;
            u.why = `lb ≥ ${best}`;
            term++;
            push([7, 12], `Node ${u.id}: ${P[k]}→${j + 1}. lb = ${expr(u)} ≥ best = ${best}: no completion can beat the solution we already have. <b>Terminate</b> it.`, { focus: u.id });
          }
        }
      }
      const cut = live.filter((d) => d.lb >= best);
      if (cut.length) {
        cut.forEach((d) => { d.deadAt = frames.length; d.why = `lb ≥ ${best}`; term++; });
        live = live.filter((d) => d.lb < best);
        push(13, `With best = ${best}, live node${cut.length > 1 ? "s" : ""} ${cut.map((d) => `${d.id} (lb ${d.lb})`).join(", ")} cannot do better, since their lower bound is already ≥ ${best}. <b>Terminate</b> ${cut.length > 1 ? "them" : "it"}.`, { focus: bestNode.id });
      }
    }
    const listing = bestNode.assign.map((c, r) => `${P[r]}→${c + 1}`).join(", ");
    push(14, `<b>No live nodes remain</b>, so the best solution seen is optimal: {${listing}} with total cost <b>${best}</b>. Branch-and-bound generated ${gen} nodes; exhaustive search would evaluate all n! = ${fact(n)} complete assignments.`, { focus: bestNode.id, final: true });
    return { nodes, frames, C, n };
  }

  function drawMatrix(f, R, i) {
    const C = R.C, n = R.n, nd = R.nodes[f.focus];
    const isBestNow = nd.bestAt <= i && !(nd.lostAt <= i);
    const cs = Math.min(48, 240 / n), ox = 38, oy = 34;
    const W = ox + cs * n + 12, H = oy + cs * n + 76;
    viewSvg.setAttribute("viewBox", `0 0 ${Math.max(W, 300)} ${H}`);
    viewSvg.innerHTML = "";
    for (let j = 0; j < n; j++) viewSvg.appendChild(S("text", { x: ox + j * cs + cs / 2, y: 24, "text-anchor": "middle", "font-size": 11, fill: "var(--muted)" }, "job " + (j + 1)));
    const used = new Set(nd.assign);
    const mins = new Map(nd.terms.map((t) => [t.r + "," + t.c, true]));
    for (let r = 0; r < n; r++) {
      viewSvg.appendChild(S("text", { x: 18, y: oy + r * cs + cs / 2 + 5, "text-anchor": "middle", "font-size": 13, "font-weight": 700, fill: "var(--ink-2)" }, P[r]));
      for (let c = 0; c < n; c++) {
        const chosen = nd.assign[r] === c;
        const isMin = mins.has(r + "," + c);
        const blocked = r >= nd.assign.length && used.has(c);
        const fill = chosen ? (!nd.complete ? "var(--c-active)" : isBestNow ? "var(--c-done)" : "var(--c-swap)") : "var(--panel-2)";
        viewSvg.appendChild(S("rect", { x: ox + c * cs + 2, y: oy + r * cs + 2, width: cs - 4, height: cs - 4, rx: 6, fill, stroke: isMin ? "var(--c-compare)" : "var(--line)", "stroke-width": isMin ? 3 : 1 }));
        viewSvg.appendChild(S("text", { x: ox + c * cs + cs / 2, y: oy + r * cs + cs / 2 + 5, "text-anchor": "middle", "font-size": 15, "font-weight": chosen || isMin ? 700 : 500, style: chosen ? "fill:#0d1117" : blocked || (r < nd.assign.length && !chosen) ? "fill:var(--muted);opacity:.45" : "" }, String(C[r][c])));
      }
    }
    const y0 = oy + n * cs + 22;
    viewSvg.appendChild(S("text", { x: 10, y: y0, "font-size": 12, fill: "var(--ink)" }, `node ${nd.id}: ` + (nd.assign.length ? nd.assign.map((c, r) => `${P[r]}→${c + 1}`).join(", ") : "nothing assigned")));
    const parts = nd.assign.map((c, r) => C[r][c]);
    const rest = nd.terms.map((t) => t.val);
    const txt = nd.complete ? `cost = ${parts.join(" + ")} = ${nd.cost}` : `lb = ${parts.length ? parts.join("+") + " + " : ""}(${rest.join("+")}) = ${nd.lb}`;
    viewSvg.appendChild(S("text", { x: 10, y: y0 + 20, "font-size": 12, "font-weight": 700, fill: "var(--ember)" }, txt));
    viewSvg.appendChild(S("text", { x: 10, y: y0 + 40, "font-size": 10, fill: "var(--muted)" }, "blue = committed · ring = row min (free jobs)"));
  }

  /* ================================================================== KNAPSACK */
  function parseItems(txt) {
    return (txt.match(/\d+(\.\d+)?\s*[:/x]\s*\d+(\.\d+)?/g) || []).map((p) => {
      const [w, v] = p.split(/[:/x]/).map((s) => +s.trim());
      return { w, v };
    }).filter((it) => it.w > 0 && it.v >= 0).slice(0, 8);
  }
  function recKnap(itemsIn, Wcap, eager) {
    const items = itemsIn.map((it, k) => Object.assign({ orig: k + 1 }, it)).sort((a, b) => b.v / b.w - a.v / a.w || a.orig - b.orig);
    const n = items.length;
    const frames = [], nodes = [];
    let live = [], best = 0, bestNode = null, gen = 0, expd = 0, term = 0;
    const ubOf = (lvl, w, v) => (lvl < n ? v + (Wcap - w) * (items[lvl].v / items[lvl].w) : v);
    function mk(parent, lvl, inc, w, v) {
      const nd = { id: nodes.length, parent, kids: [], level: lvl, inc, w, v, ub: w > Wcap ? null : ubOf(lvl, w, v), born: frames.length, expAt: Infinity, deadAt: Infinity, bestAt: Infinity, lostAt: Infinity, why: "" };
      if (parent) parent.kids.push(nd);
      nodes.push(nd);
      gen++;
      return nd;
    }
    const ubExpr = (nd) => nd.level < n ? `${nd.v} + (${Wcap} − ${nd.w})·${fmt(items[nd.level].v / items[nd.level].w)} = ${fmt(nd.ub)}` : `${nd.v} (no items left)`;
    const push = (line, text, x) => frames.push(Object.assign({ line, text, live: live.map((d) => d.id), best, c: { "nodes generated": gen, expanded: expd, terminated: term, "best value": best, "2ⁿ subsets": Math.pow(2, n) } }, x || {}));
    function setBest(nd) {
      if (bestNode && bestNode !== nd) bestNode.lostAt = frames.length;
      best = nd.v;
      bestNode = nd;
      nd.bestAt = frames.length;
    }
    const root = mk(null, 0, [], 0, 0);
    root.lines = ["w = 0, v = 0", "ub = " + fmt(root.ub)];
    live.push(root);
    push(1, `Root: nothing chosen, w = 0, v = 0. Upper bound (ub) = v + (W − w)·(best value per unit weight) = ${ubExpr(root)}. No subset can be worth more than that.`, { focus: root.id });

    while (live.length) {
      live.sort((a, b) => b.ub - a.ub || a.id - b.id);
      const x = live[0];
      const byId = live.slice().sort((a, b) => a.id - b.id);
      frames[frames.length - 1].ask = {
        q: "Which live node will be expanded next?",
        opts: byId.map((d) => `node ${d.id} (ub ${fmt(d.ub)})`), ans: byId.indexOf(x),
        why: `This is a maximization problem, so the most promising node has the largest upper bound: node ${x.id} with ub = ${fmt(x.ub)}.`,
      };
      live.shift();
      x.expAt = frames.length;
      expd++;
      const i = x.level, it = items[i];
      push([3, 4], `Live nodes: ${byId.map((d) => `${d.id} (ub ${fmt(d.ub)})`).join(", ")}. Node ${x.id} has the largest ub: expand it by deciding item ${i + 1} (w = ${it.w}, v = ${it.v}).`, { focus: x.id, pick: x.id });
      const kids = [mk(x, i + 1, x.inc.concat([true]), x.w + it.w, x.v + it.v), mk(x, i + 1, x.inc.concat([false]), x.w, x.v)];
      kids.forEach((y, side) => {
        const lab = side === 0 ? `with ${i + 1}` : `w/o ${i + 1}`;
        y.edge = lab;
        if (y.w > Wcap) {
          y.lines = ["w = " + y.w, "not feasible"];
          y.deadAt = frames.length;
          y.why = "";
          term++;
          push([5, 6], `Node ${y.id} (${lab}): total weight ${y.w} > W = ${Wcap}. The node represents no feasible subset: <b>terminate</b> it.`, { focus: y.id });
          return;
        }
        y.lines = [`w = ${y.w}, v = ${y.v}`, y.level === n ? `value = ${y.v}` : `ub = ${fmt(y.ub)}`];
        if (eager && y.v > best && y.level < n) {
          setBest(y);
          push([7, 9], `Node ${y.id} (${lab}): w = ${y.w}, v = ${y.v}. Every node here is itself a subset that fits, so with the “every node” option it updates <b>best = ${best}</b> right away.`, { focus: y.id });
        }
        if (y.level === n) {
          if (y.v > best || bestNode === y) {
            setBest(y);
            push([8, 9], `Node ${y.id} (${lab}): all items decided: a single subset {${y.inc.map((b, k) => (b ? k + 1 : null)).filter(Boolean).join(", ")}} worth <b>${y.v}</b>. New <b>best = ${best}</b>.`, { focus: y.id });
          } else {
            y.deadAt = frames.length;
            y.why = "inferior";
            term++;
            push([8, 9], `Node ${y.id} (${lab}): a complete subset worth ${y.v}, not better than best = ${best}: an inferior solution, terminate.`, { focus: y.id });
          }
        } else if (y.ub > best) {
          live.push(y);
          push([7, 10, 11], `Node ${y.id} (${lab}): w = ${y.w}, v = ${y.v}, ub = ${ubExpr(y)}` + ` > best = ${best}, so it stays live.`, { focus: y.id });
        } else {
          y.deadAt = frames.length;
          y.why = `ub ≤ ${best}`;
          term++;
          push([7, 12], `Node ${y.id} (${lab}): ub = ${ubExpr(y)} ≤ best = ${best}. It cannot beat the best subset already found: <b>terminate</b>.`, { focus: y.id });
        }
      });
      const cut = live.filter((d) => d.ub <= best);
      if (cut.length) {
        cut.forEach((d) => { d.deadAt = frames.length; if (!d.why) d.why = `ub ≤ ${best}`; term++; });
        live = live.filter((d) => d.ub > best);
        push(13, `With best = ${best}, live node${cut.length > 1 ? "s" : ""} ${cut.map((d) => `${d.id} (ub ${fmt(d.ub)})`).join(", ")} can't do better. <b>Terminate</b> ${cut.length > 1 ? "them" : "it"}.`, { focus: bestNode ? bestNode.id : 0 });
      }
    }
    const set = bestNode ? bestNode.inc.map((b, k) => (b ? k + 1 : null)).filter(Boolean) : [];
    push(14, `<b>No live nodes remain.</b> The optimal subset is {${set.join(", ")}} (items numbered by value per weight) with value <b>${best}</b>. Branch-and-bound generated ${gen} nodes; exhaustive search would check all 2ⁿ = ${Math.pow(2, n)} subsets.`, { focus: bestNode ? bestNode.id : 0, final: true });
    return { nodes, frames, items, W: Wcap, n };
  }

  function drawKnap(f, R) {
    const nd = R.nodes[f.focus], items = R.items, n = R.n;
    const W = 330, rowH = 26, oy = 34;
    const H = oy + rowH * n + 150;
    viewSvg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    viewSvg.innerHTML = "";
    const cols = [["item", 26], ["w", 80], ["v", 130], ["v/w", 185], ["at node " + nd.id, 265]];
    cols.forEach(([t, x]) => viewSvg.appendChild(S("text", { x, y: 22, "text-anchor": "middle", "font-size": 11, fill: "var(--muted)" }, t)));
    items.forEach((it, k) => {
      const y = oy + k * rowH;
      const st = k < nd.inc.length ? (nd.inc[k] ? "in" : "out") : k === nd.level ? "next" : "open";
      if (st === "in") viewSvg.appendChild(S("rect", { x: 6, y: y, width: W - 12, height: rowH - 4, rx: 5, fill: "var(--c-active)", opacity: 0.25 }));
      if (st === "next") viewSvg.appendChild(S("rect", { x: 6, y: y, width: W - 12, height: rowH - 4, rx: 5, fill: "none", stroke: "var(--c-compare)", "stroke-width": 2 }));
      const cells = [String(k + 1), String(it.w), "$" + it.v, fmt(it.v / it.w), st === "in" ? "taken" : st === "out" ? "left out" : st === "next" ? "next (sets ub rate)" : "undecided"];
      cells.forEach((t, c) => viewSvg.appendChild(S("text", { x: cols[c][1], y: y + 16, "text-anchor": "middle", "font-size": c === 4 ? 10.5 : 12, "font-weight": c === 4 ? 600 : 500, fill: st === "out" ? "var(--muted)" : "var(--ink)" }, t)));
    });
    // capacity bar
    const by = oy + rowH * n + 20, bx = 14, bw = W - 28, bh = 24;
    const Wc = R.W, sx = (v) => bx + (bw * Math.min(v, Wc * 1.25)) / (Wc * 1.25);
    viewSvg.appendChild(S("text", { x: 10, y: by - 6, "font-size": 11, fill: "var(--muted)" }, `knapsack: weight used w = ${nd.w} of W = ${Wc}`));
    viewSvg.appendChild(S("rect", { x: bx, y: by, width: sx(Wc) - bx, height: bh, rx: 4, fill: "var(--panel-2)", stroke: "var(--line-2)" }));
    const over = nd.w > Wc;
    viewSvg.appendChild(S("rect", { x: bx, y: by, width: Math.max(0, sx(nd.w) - bx), height: bh, rx: 4, fill: over ? "var(--c-swap)" : "var(--c-active)" }));
    if (!over && nd.level < n) viewSvg.appendChild(S("rect", { x: sx(nd.w), y: by + 3, width: Math.max(0, sx(Wc) - sx(nd.w)), height: bh - 6, fill: "var(--c-compare)", opacity: 0.55 }));
    viewSvg.appendChild(S("line", { x1: sx(Wc), y1: by - 4, x2: sx(Wc), y2: by + bh + 4, stroke: "var(--ember)", "stroke-width": 3 }));
    const t1 = over ? `w = ${nd.w} > W: not feasible` : nd.level < n ? `ub = ${nd.v} + (${Wc} − ${nd.w}) × ${fmt(items[nd.level].v / items[nd.level].w)} = ${fmt(nd.ub)}` : `leaf: value = ${nd.v}`;
    viewSvg.appendChild(S("text", { x: 10, y: by + bh + 24, "font-size": 12, "font-weight": 700, fill: "var(--ember)" }, t1));
    viewSvg.appendChild(S("text", { x: 10, y: by + bh + 44, "font-size": 11, fill: "var(--ink-2)" }, `best so far = ${f.best}`));
    viewSvg.appendChild(S("text", { x: 10, y: by + bh + 64, "font-size": 10, fill: "var(--muted)" }, "blue = taken · yellow = room × next rate"));
  }

  /* ================================================================== TREE */
  const BW = 92, BH = 38, GAP = 100, DY = 78;
  function layout(R) {
    let leaf = 0, depth = 0;
    (function place(nd, d) {
      nd.depth = d;
      depth = Math.max(depth, d);
      if (!nd.kids.length) nd.lx = leaf++;
      else { nd.kids.forEach((k) => place(k, d + 1)); nd.lx = (nd.kids[0].lx + nd.kids[nd.kids.length - 1].lx) / 2; }
    })(R.nodes[0], 0);
    R.lay = { leaf, depth };
  }
  function drawTree(f, i, R) {
    const L = R.lay;
    const W = Math.max(zoomed ? 0 : 660, (L.leaf - 1) * GAP + BW + 30);
    const H = 34 + L.depth * DY + BH + 30;
    const off = (W - (L.leaf - 1) * GAP) / 2;
    const X = (nd) => off + nd.lx * GAP, Y = (nd) => 30 + nd.depth * DY;
    treeSvg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    treeSvg.style.width = zoomed ? W + "px" : "100%";
    treeSvg.innerHTML = "";
    const shown = R.nodes.filter((nd) => nd.born <= i);
    shown.forEach((nd) => {
      if (!nd.parent) return;
      const a = nd.parent;
      treeSvg.appendChild(S("line", { x1: X(a), y1: Y(a) + BH / 2, x2: X(nd), y2: Y(nd) - BH / 2, stroke: "var(--line-2)", "stroke-width": 1.5 }));
      if (nd.edge) {
        const mx = (X(a) + X(nd)) / 2, my = (Y(a) + BH / 2 + Y(nd) - BH / 2) / 2;
        treeSvg.appendChild(S("text", { x: mx + (X(nd) < X(a) ? -5 : 5), y: my + 3, "text-anchor": X(nd) < X(a) ? "end" : "start", "font-size": 10, fill: "var(--muted)" }, nd.edge));
      }
    });
    let cur = null;
    shown.forEach((nd) => {
      const x = X(nd), y = Y(nd);
      const isBest = nd.bestAt <= i && !(nd.lostAt <= i);
      const dead = nd.deadAt <= i || nd.lostAt <= i;
      let fill = "var(--c-bar)";
      if (isBest) fill = "var(--c-done)";
      else if (dead) fill = "var(--c-swap)";
      else if (nd.born === i) fill = "var(--c-compare)";
      else if (nd.expAt <= i) fill = "var(--c-active)";
      if (nd.born === i || f.pick === nd.id) cur = nd;
      const ring = f.pick === nd.id || nd.born === i;
      treeSvg.appendChild(S("rect", { x: x - BW / 2, y: y - BH / 2, width: BW, height: BH, rx: 8, fill, opacity: dead && !isBest ? 0.8 : 1, stroke: ring ? "var(--ember)" : "none", "stroke-width": ring ? 3 : 0 }));
      treeSvg.appendChild(S("text", { x, y: y - 3, "text-anchor": "middle", "font-size": 11, "font-weight": 700, style: "fill:#0d1117" }, nd.lines[0]));
      treeSvg.appendChild(S("text", { x, y: y + 12, "text-anchor": "middle", "font-size": 10.5, style: "fill:#0d1117" }, nd.lines[1]));
      treeSvg.appendChild(S("text", { x: x - BW / 2, y: y - BH / 2 - 4, "font-size": 10, fill: "var(--muted)" }, String(nd.id)));
      if (dead && !isBest) {
        treeSvg.appendChild(S("text", { x: x + BW / 2 - 2, y: y - BH / 2 - 4, "text-anchor": "end", "font-size": 12, "font-weight": 800, fill: "var(--c-swap)" }, "✕"));
        treeSvg.appendChild(S("text", { x, y: y + BH / 2 + 13, "text-anchor": "middle", "font-size": 10, fill: "var(--c-swap)" }, nd.why));
      }
      if (isBest) treeSvg.appendChild(S("text", { x, y: y + BH / 2 + 13, "text-anchor": "middle", "font-size": 10, "font-weight": 700, fill: "var(--c-done)" }, f.final ? "optimal" : "best so far"));
    });
    if (zoomed && cur) treeBox.scrollLeft = Math.max(0, X(cur) - treeBox.clientWidth / 2);
  }

  function drawLive(f, R) {
    const box = $("live");
    box.innerHTML = "";
    const key = prob === "assign" ? "lb" : "ub";
    const ids = f.live.slice();
    if (f.pick != null && !ids.includes(f.pick)) ids.unshift(f.pick);
    const nodes = ids.map((id) => R.nodes[id]).sort((a, b) => (prob === "assign" ? a.lb - b.lb : b.ub - a.ub) || a.id - b.id);
    if (!nodes.length) { box.appendChild(E("span", { class: "muted small" }, "none: the search is over")); return; }
    nodes.forEach((nd) => box.appendChild(E("span", { class: "chip" + (nd.id === f.pick ? " pick" : "") }, `#${nd.id} · ${key} ${fmt(nd[key])}`)));
    box.appendChild(E("span", { class: "muted small", style: { marginLeft: "6px" } }, `best so far: ${f.best === Infinity ? "∞" : f.best}`));
  }

  /* ================================================================== PREDICT */
  let player = null;
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
    if (prob === "assign") drawMatrix(f, rec, i); else drawKnap(f, rec);
    drawTree(f, i, rec);
    drawLive(f, rec);
    code.highlight(f.line);
    ctr.set(f.c);
    say.say(f.text);
    showAsk(f, i);
  }
  player = Forge.player($("player"), { frames: [], render, fps: 2 });
  function run() {
    Object.keys(answered).forEach((k) => delete answered[k]);
    if (prob === "assign") rec = recAssign(M);
    else {
      const items = parseItems($("kItems").value);
      const W = Math.max(1, Math.round(+$("kW").value || 1));
      if (!items.length) { say.say("Type items as weight:value pairs, e.g. 4:40, 7:42."); return; }
      $("kItems").value = items.map((it) => `${it.w}:${it.v}`).join(", ");
      rec = recKnap(items, W, $("eager").checked);
    }
    layout(rec);
    player.load(rec.frames);
  }

  $("prob").onchange = () => { prob = $("prob").value; setupPanels(); run(); };
  $("an").onchange = () => {
    const n = +$("an").value;
    M = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (M[i] && M[i][j] != null ? M[i][j] : 1 + Math.floor(Math.random() * 9))));
    buildMatrixInputs();
    run();
  };
  $("aLoad").onclick = run;
  $("aRand").onclick = () => {
    const n = +$("an").value;
    M = Array.from({ length: n }, () => Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 9)));
    buildMatrixInputs();
    run();
  };
  $("aBook").onclick = () => { M = BOOK.map((r) => r.slice()); $("an").value = "4"; buildMatrixInputs(); run(); };
  $("kLoad").onclick = run;
  $("kW").onchange = run;
  $("eager").onchange = run;
  $("kRand").onclick = () => {
    const n = 4 + Math.floor(Math.random() * 2);
    const items = Array.from({ length: n }, () => ({ w: 1 + Math.floor(Math.random() * 9), v: 5 + Math.floor(Math.random() * 50) }));
    const tot = items.reduce((s, it) => s + it.w, 0);
    $("kItems").value = items.map((it) => `${it.w}:${it.v}`).join(", ");
    $("kW").value = Math.max(2, Math.round(tot * (0.4 + Math.random() * 0.2)));
    run();
  };
  $("kBook").onclick = () => { $("kItems").value = "4:40, 7:42, 5:25, 3:12"; $("kW").value = 10; run(); };
  $("zoom").onclick = () => {
    zoomed = !zoomed;
    treeBox.classList.toggle("zoom", zoomed);
    $("zoom").textContent = zoomed ? "⤡ Fit to width" : "⤢ Full size";
    if (rec) render(player.frames[player.index], player.index);
  };
  $("predict").onchange = () => { if (rec) render(player.frames[player.index], player.index); };

  buildMatrixInputs();
  setupPanels();
  run();
})();
