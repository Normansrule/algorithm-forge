/* DP Table Studio — Algorithm Forge (Ch 8 · Dynamic Programming)
   Record-then-play: each problem's record() fills a table and pushes one frame per
   interesting moment; render() draws frame i as an SVG grid with dependency arrows. */
(function () {
  "use strict";
  const E = Forge.el, S = Forge.svg, $ = (id) => document.getElementById(id);
  Forge.page({ title: "DP Table Studio", chapter: "Ch 8 · Dynamic Programming" });

  const INF = Infinity;
  const fmt = (x) => (x === INF ? "∞" : x === -INF ? "−∞" : x == null ? "" : String(x));
  const nums = (s) => String(s).split(/[\s,;]+/).filter(Boolean).map(Number).filter((x) => Number.isFinite(x));
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, k) => a + k);
  const rnd = (n) => Math.floor(Math.random() * n);
  const field = (label, input) => E("label", { class: "field" }, label, input);
  const txt = (id, value, extra) => E("input", Object.assign({ type: "text", id, value, spellcheck: "false" }, extra || {}));
  const num = (id, value, min, max) => E("input", { type: "number", id, value, min, max, style: { width: "84px" } });

  /* ------------------------------------------------------------------ */
  /* Recorder: holds the live table, pushes snapshot frames              */
  /* ------------------------------------------------------------------ */
  function makeRec(rows, cols) {
    const v = Array.from({ length: rows }, () => Array(cols).fill(""));
    const R = {
      v, frames: [], base: {}, ctr: {}, result: "",
      push(o) {
        const st = Object.assign({}, R.base, o.st || {});
        if (o.result !== undefined) R.result = o.result;
        R.frames.push(Object.assign({}, o, {
          v: v.map((r) => r.slice()), st, ctr: Object.assign({}, R.ctr),
          arrows: o.arrows || [], result: R.result,
        }));
      },
    };
    return R;
  }

  /* ------------------------------------------------------------------ */
  /* Table renderer (SVG)                                                */
  /* ------------------------------------------------------------------ */
  const FILL = {
    active: ["var(--c-active)", 0.32], src: ["var(--c-compare)", 0.34], done: ["var(--c-done)", 0.34],
    skip: ["var(--c-dim)", 0.7], reuse: ["var(--c-pivot)", 0.34], new: ["var(--c-swap)", 0.28], off: ["var(--c-dim)", 0.35],
  };
  function drawTable(svg, spec, f) {
    const cw = spec.cw || 44, ch = spec.ch || 34, hw = spec.headW || 60, pad = 8;
    const nTop = spec.colHeads.length;
    const below = spec.arcBelow ? 76 : 0;
    const W = pad * 2 + hw + spec.cols * cw, H = pad * 2 + nTop * ch + spec.rows * ch + below;
    const avail = (svg.parentNode && svg.parentNode.clientWidth) || 800;
    const VW = avail < 640 ? W : Math.max(W, 620), off = (VW - W) / 2;
    svg.setAttribute("viewBox", `${-off} 0 ${VW} ${H}`);
    svg.style.minWidth = W > 460 ? Math.round(W * 0.66) + "px" : "0";
    svg.innerHTML = "";
    const defs = S("defs", null);
    [["win", "var(--ember)"], ["lose", "var(--muted)"], ["done", "var(--c-done)"]].forEach(([id, col]) =>
      defs.appendChild(S("marker", { id: "dpa-" + id, viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" },
        S("path", { d: "M0 0 L10 5 L0 10 z", fill: col }))));
    svg.appendChild(defs);
    const X = (c) => pad + hw + c * cw, Y = (r) => pad + nTop * ch + r * ch;
    const st = f.st || {};
    const rect = (x, y, w, h, s, strong) => {
      const fc = FILL[s];
      svg.appendChild(S("rect", { x: x + 1, y: y + 1, width: w - 2, height: h - 2, rx: 5,
        fill: fc ? fc[0] : "var(--panel)", "fill-opacity": fc ? fc[1] : 1,
        stroke: s === "active" ? "var(--c-active)" : s === "done" ? "var(--c-done)" : s === "src" ? "var(--c-compare)" : "var(--line)",
        "stroke-width": s && s !== "off" && s !== "skip" ? (strong ? 2.5 : 2) : 1 }));
    };
    // column header rows
    spec.colHeads.forEach((hrow, k) => {
      const y = pad + k * ch;
      svg.appendChild(S("text", { x: pad + hw - 8, y: y + ch / 2 + 4, "text-anchor": "end", "font-size": 12, fill: "var(--muted)" }, hrow.label));
      hrow.vals.forEach((val, c) => {
        const s = st[`h${k},${c}`];
        if (s) rect(X(c), y, cw, ch, s);
        svg.appendChild(S("text", { x: X(c) + cw / 2, y: y + ch / 2 + 4, "text-anchor": "middle", "font-size": 13, "font-weight": k === nTop - 1 ? 700 : 500, fill: k === nTop - 1 ? "var(--ink-2)" : "var(--muted)" }, String(val)));
      });
    });
    // row headers + body
    for (let r = 0; r < spec.rows; r++) {
      const s = st[`r${r}`];
      if (s) rect(pad, Y(r), hw - 4, ch, s);
      const head = spec.rowHeads[r];
      const lines = Array.isArray(head) ? head : [head];
      lines.forEach((ln, k) => svg.appendChild(S("text", {
        x: pad + hw - 8, y: Y(r) + ch / 2 + 4 + (k - (lines.length - 1) / 2) * 13, "text-anchor": "end",
        "font-size": k === 0 ? 13 : 10.5, "font-weight": k === 0 ? 700 : 500, fill: k === 0 ? "var(--ink-2)" : "var(--muted)" }, String(ln))));
      for (let c = 0; c < spec.cols; c++) {
        const cs = st[`${r},${c}`] || (spec.off && spec.off(r, c) ? "off" : null);
        rect(X(c), Y(r), cw, ch, cs, cs === "active");
        const mark = spec.marks && spec.marks[r] && spec.marks[r][c];
        if (mark === 1) svg.appendChild(S("circle", { cx: X(c) + 9, cy: Y(r) + 9, r: 5.5, fill: "var(--c-compare)", stroke: "var(--ember-2)", "stroke-width": 1 }));
        if (mark === 2) {
          svg.appendChild(S("rect", { x: X(c) + 2, y: Y(r) + 2, width: cw - 4, height: ch - 4, rx: 4, fill: "var(--c-dim)" }));
          svg.appendChild(S("path", { d: `M${X(c) + 8} ${Y(r) + 8} L${X(c) + cw - 8} ${Y(r) + ch - 8} M${X(c) + cw - 8} ${Y(r) + 8} L${X(c) + 8} ${Y(r) + ch - 8}`, stroke: "var(--muted)", "stroke-width": 2 }));
          continue;
        }
        const val = f.v[r][c];
        if (val !== "" && val != null) {
          svg.appendChild(S("text", { x: X(c) + cw / 2, y: Y(r) + ch / 2 + 5, "text-anchor": "middle",
            "font-size": String(val).length > 4 ? 11.5 : 14, "font-weight": 700,
            fill: val === "?" ? "var(--c-active)" : val === "—" ? "var(--muted)" : "var(--ink)" }, String(val)));
        }
      }
    }
    // arrows
    const cx = (c) => X(c) + cw / 2, cy = (r) => Y(r) + ch / 2;
    (f.arrows || []).forEach((a, idx) => {
      const [r1, c1] = a.from, [r2, c2] = a.to;
      const kind = a.done ? "done" : a.win ? "win" : "lose";
      const col = kind === "done" ? "var(--c-done)" : kind === "win" ? "var(--ember)" : "var(--muted)";
      let d, lx, ly;
      if (r1 === r2 && spec.arcBelow) {
        const x1 = cx(c1), x2 = cx(c2), y0 = Y(r1) + ch - 2;
        const h = Math.min(64, 12 + Math.abs(c2 - c1) * 18 + (idx % 2) * 5);
        d = `M${x1} ${y0} Q${(x1 + x2) / 2} ${y0 + h * 2} ${x2 - 3} ${y0 + 1}`;
        lx = (x1 + x2) / 2; ly = y0 + h;
      } else {
        const x1 = cx(c1), y1 = cy(r1), x2 = cx(c2), y2 = cy(r2);
        const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
        const s0 = Math.min(cw, ch) * 0.28, s1 = Math.abs(ux) > Math.abs(uy) ? cw * 0.42 : ch * 0.42;
        d = `M${x1 + ux * s0} ${y1 + uy * s0} L${x2 - ux * s1} ${y2 - uy * s1}`;
        lx = (x1 + x2) / 2; ly = (y1 + y2) / 2;
      }
      svg.appendChild(S("path", { d, fill: "none", stroke: col, "stroke-width": kind === "lose" ? 1.8 : 2.6,
        "stroke-dasharray": kind === "lose" ? "5 4" : null, "marker-end": `url(#dpa-${kind})` }));
      if (a.label) {
        const w = 8 + String(a.label).length * 6.6;
        svg.appendChild(S("rect", { x: lx - w / 2, y: ly - 9, width: w, height: 16, rx: 5, fill: "var(--panel)", stroke: col, "stroke-width": 1 }));
        svg.appendChild(S("text", { x: lx, y: ly + 3.5, "text-anchor": "middle", "font-size": 10.5, "font-weight": 700, fill: col }, String(a.label)));
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Problems                                                            */
  /* ------------------------------------------------------------------ */
  const P = {};

  /* ---------- Coin-row ---------- */
  P.coinrow = {
    blurb: "A row of coins; you may not take two neighbours. F[i] = best total using only the first i coins. Either coin i is taken (so coin i − 1 is not, and we add F[i − 2]) or it is skipped (F[i − 1]).",
    lines: [
      "ALGORITHM CoinRow(C[1..n])",
      "    // Largest total of coins with no two neighbours taken",
      "    F[0] ← 0",
      "    F[1] ← C[1]",
      "    for i ← 2 to n do",
      "        F[i] ← max(C[i] + F[i − 2], F[i − 1])",
      "    return F[n]",
      "",
      "ALGORITHM CoinRowTraceback(C[1..n], F[0..n])",
      "    i ← n",
      "    while i ≥ 1 do",
      "        if i = 1 or C[i] + F[i − 2] > F[i − 1] then",
      "            append(S, i)      // coin i is taken",
      "            i ← i − 2",
      "        else",
      "            i ← i − 1         // coin i is skipped",
      "    return S",
    ],
    counters: { "cells filled": 0, "max() calls": 0 },
    ui(h) { h.append(field("Coin values, left to right", txt("cr-coins", "5, 1, 2, 10, 6, 2"))); },
    defaults() { $("cr-coins").value = "5, 1, 2, 10, 6, 2"; },
    random() { $("cr-coins").value = Forge.randArray(6 + rnd(5), 1, 12).join(", "); },
    read() {
      const c = nums($("cr-coins").value).map((x) => Math.round(Math.abs(x))).filter((x) => x > 0).slice(0, 16);
      return c.length ? c : null;
    },
    record(C) {
      const n = C.length;
      const spec = { rows: 1, cols: n + 1, cw: 46, ch: 36, headW: 70, arcBelow: true,
        colHeads: [{ label: "i", vals: range(0, n) }, { label: "C[i]", vals: ["–", ...C] }], rowHeads: ["F[i]"] };
      const R = makeRec(1, n + 1), F = [];
      R.ctr = { "cells filled": 0, "max() calls": 0 };
      R.push({ line: 0, text: `A row of <b>${n}</b> coins. F[i] will hold the most money we can pick from the first i coins without taking two neighbours.` });
      F[0] = 0; R.v[0][0] = "0"; R.ctr["cells filled"]++;
      R.push({ line: 2, st: { "0,0": "new" }, text: "<b>F[0] = 0</b>: with no coins there is nothing to pick up.", formula: "F[0] = 0" });
      F[1] = C[0]; R.v[0][1] = String(F[1]); R.ctr["cells filled"]++;
      R.push({ line: 3, st: { "0,1": "new", "h1,1": "src" }, text: `<b>F[1] = C[1] = ${C[0]}</b>: with a single coin, taking it is best.`, formula: `F[1] = C[1] = ${C[0]}` });
      for (let i = 2; i <= n; i++) {
        const take = C[i - 1] + F[i - 2], skip = F[i - 1];
        F[i] = Math.max(take, skip);
        R.ctr["max() calls"]++; R.ctr["cells filled"]++;
        R.v[0][i] = String(F[i]);
        const f0 = `F[${i}] = max(C[${i}] + F[${i - 2}], F[${i - 1}]) = max(${C[i - 1]} + ${F[i - 2]}, ${skip}) = max(${take}, ${skip}) = `;
        R.push({
          line: 5, ask: { r: 0, c: i, answer: F[i], q: `F[${i}]` },
          st: { [`0,${i}`]: "active", [`0,${i - 2}`]: "src", [`0,${i - 1}`]: "src", [`h1,${i}`]: "src" },
          arrows: [{ from: [0, i - 2], to: [0, i], label: `take +${C[i - 1]}`, win: take > skip }, { from: [0, i - 1], to: [0, i], label: "skip", win: take <= skip }],
          formula: f0 + `<b>${F[i]}</b>`, formulaQ: f0 + "?",
          text: take > skip
            ? `Take coin ${i} (worth ${C[i - 1]}) plus the best of the first ${i - 2} coins (${F[i - 2]}) = <b>${take}</b>. That beats skipping it (${skip}), so F[${i}] = ${F[i]}.`
            : `Taking coin ${i} gives only ${C[i - 1]} + ${F[i - 2]} = ${take}; skipping it keeps the best of the first ${i - 1} coins, <b>${skip}</b>. So F[${i}] = ${F[i]}.`,
        });
      }
      R.base = { [`0,${n}`]: "done" };
      R.push({ line: 6, text: `The table is full. The answer is <b>F[${n}] = ${F[n]}</b>. It tells us <i>how much</i>, not <i>which</i> coins. Time to trace back.`, formula: `answer = F[${n}] = ${F[n]}` });
      let i = n; const picked = [];
      R.push({ line: 9, text: `Traceback starts at i = ${n} and asks, for each coin, "did the winning option in its cell take it?"` });
      while (i >= 1) {
        if (i === 1 || C[i - 1] + F[i - 2] > F[i - 1]) {
          picked.unshift(i);
          R.base[`0,${i}`] = "done"; R.base[`h1,${i}`] = "done";
          const why = i === 1 ? "i = 1, so the only coin left is taken" : `C[${i}] + F[${i - 2}] = ${C[i - 1] + F[i - 2]} > F[${i - 1}] = ${F[i - 1]}`;
          R.push({ line: [11, 12, 13], st: i >= 2 ? { [`0,${i - 2}`]: "src" } : {},
            arrows: i >= 2 ? [{ from: [0, i - 2], to: [0, i], done: true, label: `took ${C[i - 1]}` }] : [],
            text: `At i = ${i}: ${why}. So <b>coin ${i} (${C[i - 1]}) is taken</b>, and its neighbour ${i - 1} cannot be; jump to i = ${i - 2}.`,
            result: `Picked so far: ${picked.map((k) => `${C[k - 1]} (coin ${k})`).join(", ")}` });
          i -= 2;
        } else {
          R.push({ line: [11, 15], st: { [`0,${i}`]: "active", [`0,${i - 1}`]: "src" },
            text: `At i = ${i}: C[${i}] + F[${i - 2}] = ${C[i - 1] + F[i - 2]} is not more than F[${i - 1}] = ${F[i - 1]}, so the best total never needed coin ${i}. <b>Skip it</b>, step to i = ${i - 1}.` });
          i -= 1;
        }
      }
      const tot = picked.reduce((s, k) => s + C[k - 1], 0);
      R.push({ line: 16, text: `Done. Coins ${picked.join(", ")} give ${picked.map((k) => C[k - 1]).join(" + ")} = <b>${tot}</b> = F[${n}]. Θ(n) time for the table and Θ(n) for the traceback.`,
        result: `<b>Optimal pick:</b> positions ${picked.join(", ")} → ${picked.map((k) => C[k - 1]).join(" + ")} = <b>${tot}</b>` });
      return { spec, frames: R.frames };
    },
  };

  /* ---------- Change-making ---------- */
  P.change = {
    blurb: "Unlimited coins of each denomination; pay amount n with as few coins as possible. F[i] = fewest coins for amount i. The last coin used is some D[j] ≤ i, so F[i] = 1 + the smallest F[i − D[j]].",
    lines: [
      "ALGORITHM ChangeMaking(D[1..m], n)",
      "    // D[1] < D[2] < … < D[m]; fewest coins adding up to n",
      "    F[0] ← 0",
      "    for i ← 1 to n do",
      "        temp ← ∞",
      "        j ← 1",
      "        while j ≤ m and i ≥ D[j] do",
      "            temp ← min(F[i − D[j]], temp)",
      "            j ← j + 1",
      "        F[i] ← temp + 1",
      "    return F[n]",
      "",
      "ALGORITHM ChangeTraceback(D[1..m], F[0..n], n)",
      "    while n > 0 do",
      "        pick j with F[n − D[j]] = F[n] − 1",
      "        append(S, D[j])",
      "        n ← n − D[j]",
      "    return S",
    ],
    counters: { "cells filled": 0, "coin checks": 0 },
    ui(h) { h.append(field("Denominations", txt("ch-d", "1, 3, 4", { style: { width: "150px" } })), field("Amount n (≤ 24)", num("ch-n", 6, 1, 24))); },
    defaults() { $("ch-d").value = "1, 3, 4"; $("ch-n").value = 6; },
    random() {
      const set = new Set([rnd(3) ? 1 : 2]);
      while (set.size < 3) set.add(2 + rnd(8));
      $("ch-d").value = [...set].sort((a, b) => a - b).join(", ");
      $("ch-n").value = 8 + rnd(12);
    },
    read() {
      const D = [...new Set(nums($("ch-d").value).map(Math.round).filter((x) => x > 0))].sort((a, b) => a - b).slice(0, 6);
      const n = Math.max(1, Math.min(24, Math.round(+$("ch-n").value || 0)));
      return D.length ? { D, n } : null;
    },
    record({ D, n }) {
      const spec = { rows: 1, cols: n + 1, cw: 40, ch: 36, headW: 74, arcBelow: true,
        colHeads: [{ label: "amount i", vals: range(0, n) }], rowHeads: ["F[i]"] };
      const R = makeRec(1, n + 1), F = [0];
      R.ctr = { "cells filled": 1, "coin checks": 0 };
      R.push({ line: 0, text: `Coins {${D.join(", ")}}, amount ${n}. F[i] = the fewest coins that add up to exactly i (∞ if impossible).` });
      R.v[0][0] = "0";
      R.push({ line: 2, st: { "0,0": "new" }, text: "<b>F[0] = 0</b>: amount 0 needs no coins.", formula: "F[0] = 0" });
      for (let i = 1; i <= n; i++) {
        const cands = D.filter((d) => d <= i);
        R.ctr["coin checks"] += cands.length; R.ctr["cells filled"]++;
        let best = INF, bestD = null;
        cands.forEach((d) => { if (F[i - d] < best) { best = F[i - d]; bestD = d; } });
        F[i] = best + 1;
        R.v[0][i] = fmt(F[i]);
        const st = { [`0,${i}`]: "active" };
        cands.forEach((d) => (st[`0,${i - d}`] = "src"));
        const arrows = cands.map((d) => ({ from: [0, i - d], to: [0, i], label: `+${d}`, win: d === bestD }));
        let f0, text;
        if (!cands.length) {
          f0 = `F[${i}]: no coin ≤ ${i}, so F[${i}] = `;
          text = `No coin is small enough to pay ${i}, so amount ${i} is impossible: <b>F[${i}] = ∞</b>.`;
        } else {
          f0 = `F[${i}] = min(${cands.map((d) => `F[${i}−${d}]`).join(", ")}) + 1 = min(${cands.map((d) => fmt(F[i - d])).join(", ")}) + 1 = `;
          text = best === INF
            ? `Every amount i − D[j] is itself impossible, so <b>F[${i}] = ∞</b>.`
            : `Try each coin as the <i>last</i> coin: paying ${bestD} leaves ${i - bestD}, which needs F[${i - bestD}] = ${F[i - bestD]} coins, the fewest of the options. So F[${i}] = ${F[i - bestD]} + 1 = <b>${F[i]}</b>.`;
        }
        R.push({ line: [6, 7, 9], st, arrows, ask: { r: 0, c: i, answer: fmt(F[i]), q: `F[${i}]` }, formula: f0 + `<b>${fmt(F[i])}</b>`, formulaQ: f0 + "?", text });
      }
      R.base = { [`0,${n}`]: "done" };
      if (F[n] === INF) {
        R.push({ line: 10, text: `F[${n}] = ∞: amount ${n} <b>cannot</b> be paid with coins {${D.join(", ")}}. (Try adding a 1.)`, result: "<b>No solution.</b>" });
        return { spec, frames: R.frames };
      }
      R.push({ line: 10, text: `Table full: <b>F[${n}] = ${F[n]}</b> coins. Now trace back which coins.`, formula: `answer = F[${n}] = ${F[n]}` });
      let a = n; const used = [];
      while (a > 0) {
        const d = D.find((x) => x <= a && F[a - x] === F[a] - 1);
        used.push(d);
        R.base[`0,${a - d}`] = "done";
        R.push({ line: [14, 15, 16], arrows: [{ from: [0, a - d], to: [0, a], done: true, label: `+${d}` }],
          text: `F[${a}] = ${F[a]} and F[${a} − ${d}] = F[${a - d}] = ${F[a - d]} = F[${a}] − 1, so a <b>${d}</b> can be the last coin. Continue from amount ${a - d}.`,
          result: `Coins so far: ${used.join(" + ")}` });
        a -= d;
      }
      R.push({ line: 17, text: `Done: ${used.join(" + ")} = ${n} with <b>${used.length}</b> coins. Θ(nm) time, Θ(n) space.`, result: `<b>Optimal change for ${n}:</b> ${used.join(" + ")} (${used.length} coins)` });
      return { spec, frames: R.frames };
    },
  };

  /* ---------- Robot coin collection ---------- */
  const BOOK_BOARD = (() => {
    const b = Array.from({ length: 5 }, () => Array(6).fill(0));
    [[1, 5], [2, 2], [2, 4], [3, 4], [3, 6], [4, 3], [4, 6], [5, 1], [5, 5]].forEach(([i, j]) => (b[i - 1][j - 1] = 1));
    return b;
  })();
  let board = BOOK_BOARD.map((r) => r.slice());
  function drawBoardEditor() {
    const host = $("rb-board");
    if (!host) return;
    host.innerHTML = "";
    host.style.gridTemplateColumns = `repeat(${board[0].length}, 30px)`;
    board.forEach((row, i) => row.forEach((v, j) => {
      const locked = (i === 0 && j === 0) || (i === board.length - 1 && j === row.length - 1);
      host.appendChild(E("button", {
        class: v === 1 ? "coin" : v === 2 ? "wall" : "", title: `cell (${i + 1}, ${j + 1})`, "aria-label": `cell ${i + 1},${j + 1}: ${["empty", "coin", "blocked"][v]}`,
        onclick: () => { board[i][j] = (v + 1) % (locked ? 2 : 3); drawBoardEditor(); },
      }, v === 1 ? "●" : v === 2 ? "✕" : ""));
    }));
  }
  function resizeBoard() {
    const n = Math.max(2, Math.min(8, +$("rb-n").value || 5)), m = Math.max(2, Math.min(8, +$("rb-m").value || 6));
    board = Array.from({ length: n }, (_, i) => Array.from({ length: m }, (_, j) => (board[i] && board[i][j]) || 0));
    board[0][0] = Math.min(board[0][0], 1); board[n - 1][m - 1] = Math.min(board[n - 1][m - 1], 1);
    drawBoardEditor();
  }
  P.robot = {
    blurb: "A robot starts top-left and may only move right or down to the bottom-right cell. F[i, j] = most coins it can carry into cell (i, j): it arrived from above or from the left, whichever carried more, plus the coin here (if any).",
    lines: [
      "ALGORITHM RobotCoinCollection(C[1..n, 1..m])",
      "    // C[i, j] = 1 if cell (i, j) holds a coin, else 0",
      "    F[1, 1] ← C[1, 1]",
      "    for j ← 2 to m do F[1, j] ← F[1, j − 1] + C[1, j]",
      "    for i ← 2 to n do",
      "        F[i, 1] ← F[i − 1, 1] + C[i, 1]",
      "        for j ← 2 to m do",
      "            F[i, j] ← max(F[i − 1, j], F[i, j − 1]) + C[i, j]",
      "    return F[n, m]",
      "    // a blocked cell gets F = −∞ (Levitin Exercise 8.1.5)",
      "",
      "ALGORITHM RobotPath(F[1..n, 1..m])",
      "    i ← n",
      "    j ← m",
      "    while i > 1 or j > 1 do",
      "        if j = 1 or (i > 1 and F[i − 1, j] ≥ F[i, j − 1]) then",
      "            i ← i − 1         // came down from above",
      "        else",
      "            j ← j − 1         // came from the left",
    ],
    counters: { "cells filled": 0, "max() calls": 0 },
    ui(h) {
      h.append(field("Rows n", E("input", { type: "number", id: "rb-n", value: board.length, min: 2, max: 8, style: { width: "70px" }, onchange: resizeBoard })),
        field("Columns m", E("input", { type: "number", id: "rb-m", value: board[0].length, min: 2, max: 8, style: { width: "70px" }, onchange: resizeBoard })),
        field("Board: click a cell (empty → coin → wall)", E("div", { class: "board-ed", id: "rb-board" })),
        E("button", { class: "btn sm ghost", onclick: () => { board = board.map((r) => r.map(() => 0)); drawBoardEditor(); } }, "Clear board"));
      drawBoardEditor();
    },
    defaults() { board = BOOK_BOARD.map((r) => r.slice()); $("rb-n").value = 5; $("rb-m").value = 6; drawBoardEditor(); },
    random() {
      const n = 4 + rnd(3), m = 5 + rnd(3);
      board = Array.from({ length: n }, () => Array.from({ length: m }, () => (Math.random() < 0.3 ? 1 : 0)));
      if (Math.random() < 0.5) for (let k = 0; k < 2; k++) board[1 + rnd(n - 2)][1 + rnd(m - 2)] = 2;
      $("rb-n").value = n; $("rb-m").value = m; drawBoardEditor();
    },
    read() { return board.map((r) => r.slice()); },
    record(B) {
      const n = B.length, m = B[0].length;
      const spec = { rows: n, cols: m, cw: 46, ch: 40, headW: 40, marks: B,
        colHeads: [{ label: "", vals: range(1, m) }], rowHeads: range(1, n) };
      const R = makeRec(n, m);
      const F = Array.from({ length: n }, () => Array(m).fill(null));
      const c = (i, j) => (B[i][j] === 1 ? 1 : 0);
      const cn = B.flat().filter((x) => x === 1).length;
      R.ctr = { "cells filled": 0, "max() calls": 0 };
      R.push({ line: 0, text: `A ${n} × ${m} board with ${cn} coins (gold dots). F[i, j] = most coins the robot can bring into cell (i, j) moving only right or down.` });
      for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
        R.ctr["cells filled"]++;
        const I = i + 1, J = j + 1, key = `${i},${j}`;
        const line = i === 0 && j === 0 ? 2 : i === 0 ? 3 : j === 0 ? 5 : 7;
        if (B[i][j] === 2) {
          F[i][j] = -INF; R.v[i][j] = "";
          R.push({ line: 9, st: { [key]: "active" }, text: `Cell (${I}, ${J}) is <b>blocked</b>: F = −∞, so no path can use it.`, formula: `F[${I}, ${J}] = −∞ (blocked)` });
          continue;
        }
        const up = i > 0 ? F[i - 1][j] : -INF, left = j > 0 ? F[i][j - 1] : -INF;
        let f0, text; const st = { [key]: "active" }, arrows = [];
        if (i === 0 && j === 0) {
          F[i][j] = c(i, j);
          f0 = `F[1, 1] = C[1, 1] = `;
          text = `The start cell: the robot holds ${c(i, j)} coin${c(i, j) === 1 ? "" : "s"} here.`;
        } else {
          const best = Math.max(up, left);
          F[i][j] = best === -INF ? -INF : best + c(i, j);
          if (i > 0) { st[`${i - 1},${j}`] = "src"; arrows.push({ from: [i - 1, j], to: [i, j], win: up >= left && up > -INF }); }
          if (j > 0) { st[`${i},${j - 1}`] = "src"; arrows.push({ from: [i, j - 1], to: [i, j], win: left > up }); }
          if (i > 0 && j > 0) {
            R.ctr["max() calls"]++;
            f0 = `F[${I}, ${J}] = max(F[${I - 1}, ${J}], F[${I}, ${J - 1}]) + C[${I}, ${J}] = max(${fmt(up)}, ${fmt(left)}) + ${c(i, j)} = `;
          } else if (i === 0) f0 = `F[1, ${J}] = F[1, ${J - 1}] + C[1, ${J}] = ${fmt(left)} + ${c(i, j)} = `;
          else f0 = `F[${I}, 1] = F[${I - 1}, 1] + C[${I}, 1] = ${fmt(up)} + ${c(i, j)} = `;
          if (best === -INF) text = `Cell (${I}, ${J}) cannot be reached: every way in is blocked, so F = −∞.`;
          else if (i > 0 && j > 0) text = `Best way into (${I}, ${J}): from ${up >= left ? "above" : "the left"} carrying ${best}${up === left ? " (a tie: both directions are optimal)" : ""}, ${c(i, j) ? "plus the coin here" : "and no coin here"} → <b>${F[i][j]}</b>.`;
          else text = `Edge cell (${I}, ${J}) has only one way in (${i === 0 ? "from the left" : "from above"}): ${best} ${c(i, j) ? "+ 1 coin" : "+ 0"} = <b>${F[i][j]}</b>.`;
        }
        R.v[i][j] = fmt(F[i][j]);
        R.push({ line, st, arrows, ask: { r: i, c: j, answer: fmt(F[i][j]), q: `F[${I}, ${J}]` }, formula: f0 + `<b>${fmt(F[i][j])}</b>`, formulaQ: f0 + "?", text });
      }
      const goal = F[n - 1][m - 1];
      if (goal === -INF) {
        R.push({ line: 8, st: { [`${n - 1},${m - 1}`]: "active" }, text: "The goal cell is unreachable: walls cut off every right/down path.", result: "<b>No path exists.</b>" });
        return { spec, frames: R.frames };
      }
      R.base = { [`${n - 1},${m - 1}`]: "done" };
      R.push({ line: 8, text: `Table full: the robot can bring <b>F[${n}, ${m}] = ${goal}</b> coins home. Θ(nm) time and space. Now recover a path by walking back.`, formula: `answer = F[${n}, ${m}] = ${goal}` });
      let i = n - 1, j = m - 1; const moves = [];
      while (i > 0 || j > 0) {
        const up = i > 0 ? F[i - 1][j] : -INF, left = j > 0 ? F[i][j - 1] : -INF;
        const fromUp = j === 0 || (i > 0 && up >= left);
        const pi = fromUp ? i - 1 : i, pj = fromUp ? j : j - 1;
        moves.unshift(fromUp ? "↓" : "→");
        R.base[`${pi},${pj}`] = "done";
        R.push({ line: fromUp ? [15, 16] : [15, 18], arrows: [{ from: [pi, pj], to: [i, j], done: true }],
          text: `At (${i + 1}, ${j + 1}): ${fromUp ? `F above = ${fmt(up)}${j > 0 ? ` ≥ F left = ${fmt(left)}` : " (left edge)"}` : `F left = ${fmt(left)} > F above = ${fmt(up)}${i === 0 ? " (top edge)" : ""}`}, so the robot <b>came from ${fromUp ? "above" : "the left"}</b>.`,
          result: `Path so far (from the start): … ${moves.join(" ")}` });
        i = pi; j = pj;
      }
      let got = 0, ii = 0, jj = 0; got += c(0, 0);
      moves.forEach((mv) => { if (mv === "↓") ii++; else jj++; got += c(ii, jj); });
      R.push({ line: 14, text: `Done: this path picks up <b>${got}</b> coins, matching F[${n}, ${m}] = ${goal}. Where the traceback saw a tie, another path is optimal too.`,
        result: `<b>Optimal path</b> from (1, 1): ${moves.join(" ")} — collects ${got} coin${got === 1 ? "" : "s"}` });
      return { spec, frames: R.frames };
    },
  };

  /* ---------- Knapsack (shared input) ---------- */
  const KNAP_PRESETS = {
    book: { items: "2:12, 1:10, 3:20, 2:15", W: 5 },
    lecture: { items: "3:13, 2:10, 1:6, 2:9", W: 5 },
    ex821: { items: "3:25, 2:20, 1:15, 4:40, 5:50", W: 6 },
  };
  function knapUI(h, prefix) {
    h.append(
      field("Items as weight:value", txt(prefix + "-items", KNAP_PRESETS.book.items)),
      field("Capacity W (≤ 15)", num(prefix + "-W", 5, 1, 15)),
      field("Preset", E("select", { id: prefix + "-pre", onchange: (e) => { const p = KNAP_PRESETS[e.target.value]; if (p) { $(prefix + "-items").value = p.items; $(prefix + "-W").value = p.W; } } },
        E("option", { value: "book" }, "Levitin example, W = 5"),
        E("option", { value: "lecture" }, "Lecture practice, W = 5"),
        E("option", { value: "ex821" }, "Levitin Ex 8.2.1, W = 6"))));
  }
  function knapRead(prefix) {
    const items = $(prefix + "-items").value.split(/[,;]+/).map((s) => s.trim()).filter(Boolean).map((s) => {
      const m = s.match(/(\d+)\s*[:/x× ]\s*\$?(\d+(?:\.\d+)?)/);
      return m ? { w: +m[1], v: +m[2] } : null;
    }).filter((it) => it && it.w > 0).slice(0, 8);
    const W = Math.max(1, Math.min(15, Math.round(+$(prefix + "-W").value || 0)));
    return items.length ? { items, W } : null;
  }
  function knapRandom(prefix) {
    const n = 4 + rnd(2);
    $(prefix + "-items").value = Array.from({ length: n }, () => `${1 + rnd(5)}:${5 + rnd(36)}`).join(", ");
    $(prefix + "-W").value = 5 + rnd(4);
  }
  function knapSpec(items, W) {
    return { rows: items.length + 1, cols: W + 1, cw: 44, ch: 38, headW: 104,
      colHeads: [{ label: "capacity j", vals: range(0, W) }],
      rowHeads: [["i = 0", "no items"], ...items.map((it, k) => [`i = ${k + 1}`, `w=${it.w}, v=${it.v}`])] };
  }
  function knapTraceback(R, F, items, W, lines) {
    const n = items.length; let j = W; const take = [];
    R.base = Object.assign({}, R.base, { [`${n},${W}`]: "done" });
    R.push({ line: lines.start, text: `Best value <b>F[${n}, ${W}] = ${F[n][W]}</b>. Which items? Walk up from the corner: if a cell differs from the one above it, item i was used.` });
    for (let i = n; i >= 1; i--) {
      const it = items[i - 1];
      if (F[i][j] !== F[i - 1][j]) {
        take.unshift(i);
        R.base[`r${i}`] = "done"; R.base[`${i - 1},${j - it.w}`] = "done";
        R.push({ line: lines.take, st: { [`${i - 1},${j}`]: "src" }, arrows: [{ from: [i - 1, j - it.w], to: [i, j], done: true, label: `+${it.v}` }],
          text: `F[${i}, ${j}] = ${F[i][j]} ≠ F[${i - 1}, ${j}] = ${F[i - 1][j]}: <b>item ${i} is in</b> (w = ${it.w}, v = ${it.v}). ${j - it.w} units of capacity remain.`,
          result: `Items so far: ${take.map((k) => `#${k}`).join(", ")}` });
        j -= it.w;
      } else {
        R.base[`${i - 1},${j}`] = "done";
        R.push({ line: lines.skip, arrows: [{ from: [i - 1, j], to: [i, j], done: true }],
          text: `F[${i}, ${j}] = F[${i - 1}, ${j}] = ${F[i][j]}: the best answer did not need <b>item ${i}</b>; move up.` });
      }
    }
    const tw = take.reduce((s, k) => s + items[k - 1].w, 0), tv = take.reduce((s, k) => s + items[k - 1].v, 0);
    R.push({ line: lines.end, text: `Optimal subset {${take.map((k) => "item " + k).join(", ")}}: weight ${tw} ≤ ${W}, value <b>${tv}</b>. Traceback takes O(n) time.`,
      result: `<b>Optimal subset:</b> ${take.map((k) => `item ${k} (w ${items[k - 1].w}, v ${items[k - 1].v})`).join(", ")} → weight ${tw}, value <b>${tv}</b>` });
  }

  P.knap = {
    blurb: "Items with weights and values, one knapsack of capacity W. F[i, j] = best value using only the first i items with capacity j. Item i is either left out (F[i − 1, j]) or put in (v[i] + F[i − 1, j − w[i]]), if it fits.",
    lines: [
      "ALGORITHM Knapsack(w[1..n], v[1..n], W)",
      "    for j ← 0 to W do F[0, j] ← 0",
      "    for i ← 1 to n do",
      "        F[i, 0] ← 0",
      "        for j ← 1 to W do",
      "            if j − w[i] ≥ 0 then",
      "                F[i, j] ← max(F[i − 1, j], v[i] + F[i − 1, j − w[i]])",
      "            else",
      "                F[i, j] ← F[i − 1, j]",
      "    return F[n, W]",
      "",
      "ALGORITHM KnapsackItems(F, w[1..n], W)",
      "    j ← W",
      "    for i ← n downto 1 do",
      "        if F[i, j] ≠ F[i − 1, j] then",
      "            append(S, i)",
      "            j ← j − w[i]",
      "    return S",
    ],
    counters: { "cells filled": 0, "max() calls": 0 },
    ui(h) { knapUI(h, "kn"); },
    defaults() { $("kn-items").value = KNAP_PRESETS.book.items; $("kn-W").value = 5; $("kn-pre").value = "book"; },
    random() { knapRandom("kn"); },
    read() { return knapRead("kn"); },
    record({ items, W }) {
      const n = items.length, spec = knapSpec(items, W);
      const R = makeRec(n + 1, W + 1);
      const F = Array.from({ length: n + 1 }, () => Array(W + 1).fill(0));
      R.ctr = { "cells filled": 0, "max() calls": 0 };
      R.push({ line: 0, text: `${n} items, capacity W = ${W}. Row i uses items 1..i; column j is the capacity. Row 0 and column 0 are all zeros.` });
      for (let j = 0; j <= W; j++) R.v[0][j] = "0";
      for (let i = 1; i <= n; i++) R.v[i][0] = "0";
      R.push({ line: [1, 3], st: Object.fromEntries([...range(0, W).map((j) => [`0,${j}`, "new"]), ...range(1, n).map((i) => [`${i},0`, "new"])]),
        text: "Base cases: no items (row 0) or no capacity (column 0) means value 0.", formula: "F[0, j] = 0 and F[i, 0] = 0" });
      for (let i = 1; i <= n; i++) {
        const { w, v } = items[i - 1];
        for (let j = 1; j <= W; j++) {
          R.ctr["cells filled"]++;
          const st = { [`${i},${j}`]: "active", [`${i - 1},${j}`]: "src", [`r${i}`]: "src" };
          let f0, text, arrows;
          if (j - w >= 0) {
            R.ctr["max() calls"]++;
            const without = F[i - 1][j], withIt = v + F[i - 1][j - w];
            F[i][j] = Math.max(without, withIt);
            st[`${i - 1},${j - w}`] = "src";
            arrows = [{ from: [i - 1, j], to: [i, j], label: "leave", win: without >= withIt }, { from: [i - 1, j - w], to: [i, j], label: `+${v}`, win: withIt > without }];
            f0 = `F[${i}, ${j}] = max(F[${i - 1}, ${j}], ${v} + F[${i - 1}, ${j - w}]) = max(${without}, ${v} + ${F[i - 1][j - w]}) = `;
            text = withIt > without
              ? `Item ${i} fits (w = ${w} ≤ ${j}). Putting it in: ${v} + best for the remaining ${j - w} units (${F[i - 1][j - w]}) = <b>${withIt}</b>, better than leaving it out (${without}).`
              : `Item ${i} fits, but ${v} + ${F[i - 1][j - w]} = ${withIt} is not better than leaving it out: <b>${without}</b>.`;
          } else {
            F[i][j] = F[i - 1][j];
            arrows = [{ from: [i - 1, j], to: [i, j], win: true, label: "copy" }];
            f0 = `w[${i}] = ${w} > ${j}, so F[${i}, ${j}] = F[${i - 1}, ${j}] = `;
            text = `Item ${i} (weight ${w}) does not fit in capacity ${j}; copy the value from the row above.`;
          }
          R.v[i][j] = String(F[i][j]);
          R.push({ line: j - w >= 0 ? [5, 6] : [7, 8], st, arrows, ask: { r: i, c: j, answer: F[i][j], q: `F[${i}, ${j}]` }, formula: f0 + `<b>${F[i][j]}</b>`, formulaQ: f0 + "?", text });
        }
      }
      R.push({ line: 9, st: { [`${n},${W}`]: "done" }, text: `All ${n * W} inner cells are filled: Θ(nW) time and space. The answer sits in the bottom-right corner, <b>F[${n}, ${W}] = ${F[n][W]}</b>.`, formula: `answer = F[${n}, ${W}] = ${F[n][W]}` });
      knapTraceback(R, F, items, W, { start: 12, take: [14, 15, 16], skip: [13, 14], end: 17 });
      return { spec, frames: R.frames };
    },
  };

  P.mf = {
    blurb: "Top-down recursion plus a table (a “memory function”): start from F[n, W], recurse only into the cells that are really needed, and store each answer so it is never computed twice. Cells start as −1 (unknown).",
    lines: [
      "ALGORITHM MFKnapsack(i, j)",
      "    // F[0..n, 0..W]: row 0 and column 0 hold 0; other cells start at −1",
      "    if F[i, j] < 0 then",
      "        if j < w[i] then",
      "            value ← MFKnapsack(i − 1, j)",
      "        else",
      "            value ← max(MFKnapsack(i − 1, j), v[i] + MFKnapsack(i − 1, j − w[i]))",
      "        F[i, j] ← value",
      "    return F[i, j]",
      "",
      "// first call: MFKnapsack(n, W); traceback as in the bottom-up version",
      "ALGORITHM KnapsackItems(F, w[1..n], W)",
      "    j ← W",
      "    for i ← n downto 1 do",
      "        if F[i, j] ≠ F[i − 1, j] then",
      "            append(S, i)",
      "            j ← j − w[i]",
      "    return S",
    ],
    counters: { calls: 0, computed: 0, "looked up": 0, "never needed": "–" },
    ui(h) { knapUI(h, "mf"); },
    defaults() { $("mf-items").value = KNAP_PRESETS.book.items; $("mf-W").value = 5; $("mf-pre").value = "book"; },
    random() { knapRandom("mf"); },
    read() { return knapRead("mf"); },
    record({ items, W }) {
      const n = items.length, spec = knapSpec(items, W);
      const R = makeRec(n + 1, W + 1);
      const F = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: W + 1 }, (_, j) => (i === 0 || j === 0 ? 0 : -1)));
      for (let i = 0; i <= n; i++) for (let j = 0; j <= W; j++) R.v[i][j] = i === 0 || j === 0 ? "0" : "";
      R.ctr = { calls: 0, computed: 0, "looked up": 0, "never needed": "–" };
      const stack = [];
      const stackHtml = () => `<span class="muted">Call stack:</span> ${stack.map((s) => `MF(${s[0]}, ${s[1]})`).join(" → ") || "(empty)"}`;
      R.push({ line: 0, text: `Same instance, top-down. Blank cells mean −1 (not known yet). We call MFKnapsack(${n}, ${W}) and only touch what it asks for.`, result: stackHtml() });
      function mf(i, j) {
        R.ctr.calls++;
        stack.push([i, j]);
        const key = `${i},${j}`;
        if (F[i][j] >= 0) {
          const trivial = i === 0 || j === 0;
          if (!trivial) R.ctr["looked up"]++;
          R.push({ line: [2, 8], st: { [key]: trivial ? "src" : "reuse" },
            text: trivial ? `MF(${i}, ${j}) is a base cell (${i === 0 ? "no items" : "no capacity"}): return 0.` : `MF(${i}, ${j}) was <b>already computed</b> = ${F[i][j]}: just look it up, no recursion.`,
            result: stackHtml() });
          stack.pop();
          return F[i][j];
        }
        R.push({ line: 2, st: { [key]: "active" }, text: `MF(${i}, ${j}): cell is still unknown, so we must compute it.`, result: stackHtml() });
        const { w, v } = items[i - 1];
        let value, f0, arrows, text;
        if (j < w) {
          R.push({ line: [3, 4], st: { [key]: "active" }, text: `Item ${i} (w = ${w}) does not fit in ${j}: value = MF(${i - 1}, ${j}).`, result: stackHtml() });
          value = mf(i - 1, j);
          arrows = [{ from: [i - 1, j], to: [i, j], win: true, label: "copy" }];
          f0 = `w[${i}] = ${w} > ${j}, so F[${i}, ${j}] = F[${i - 1}, ${j}] = `;
          text = `Back in MF(${i}, ${j}): copy ${value} from above and <b>store it</b>.`;
        } else {
          R.push({ line: [5, 6], st: { [key]: "active" }, text: `Item ${i} fits: we need both MF(${i - 1}, ${j}) and MF(${i - 1}, ${j - w}).`, result: stackHtml() });
          const a = mf(i - 1, j), b = mf(i - 1, j - w);
          value = Math.max(a, v + b);
          arrows = [{ from: [i - 1, j], to: [i, j], label: "leave", win: a >= v + b }, { from: [i - 1, j - w], to: [i, j], label: `+${v}`, win: v + b > a }];
          f0 = `F[${i}, ${j}] = max(${a}, ${v} + ${b}) = `;
          text = `Back in MF(${i}, ${j}): max(${a}, ${v} + ${b}) = <b>${value}</b>. Store it so no one recomputes it.`;
        }
        F[i][j] = value; R.v[i][j] = String(value); R.ctr.computed++;
        R.base[key] = "done-mf";
        const st = { [key]: "active", [`${i - 1},${j}`]: "src" };
        if (j >= w) st[`${i - 1},${j - w}`] = "src";
        R.push({ line: 7, st, arrows, ask: { r: i, c: j, answer: value, q: `F[${i}, ${j}]` }, formula: f0 + `<b>${value}</b>`, formulaQ: f0 + "?", text, result: stackHtml() });
        stack.pop();
        return value;
      }
      mf(n, W);
      Object.keys(R.base).forEach((k) => delete R.base[k]);
      let never = 0;
      for (let i = 1; i <= n; i++) for (let j = 1; j <= W; j++) if (F[i][j] < 0) { never++; R.v[i][j] = "—"; R.base[`${i},${j}`] = "skip"; }
      R.ctr["never needed"] = never;
      R.push({ line: 8, text: `Finished: <b>${R.ctr.computed}</b> of the ${n * W} inner cells were computed, ${R.ctr["looked up"]} ${R.ctr["looked up"] === 1 ? "was" : "were"} looked up again, and <b>${never}</b> (shown “—”) were never needed. The bottom-up version fills all ${n * W}.`,
        formula: `answer = F[${n}, ${W}] = ${F[n][W]}`, result: stackHtml() });
      // traceback only visits cells the recursion computed
      knapTraceback(R, F, items, W, { start: 12, take: [14, 15, 16], skip: [13, 14], end: 17 });
      return { spec, frames: R.frames };
    },
  };
  // memory-function computed cells get a faint "done" look while recursion runs
  FILL["done-mf"] = ["var(--c-done)", 0.14];

  /* ---------- Binomial coefficient ---------- */
  P.binom = {
    blurb: "C(n, k) counts k-element subsets of n things. Pascal's rule C(n, k) = C(n − 1, k − 1) + C(n − 1, k) builds the table row by row using only additions — no multiplications.",
    lines: [
      "ALGORITHM Binomial(n, k)",
      "    // C(n, k) by Pascal's rule, additions only",
      "    for i ← 0 to n do",
      "        for j ← 0 to min(i, k) do",
      "            if j = 0 or j = i then",
      "                C[i, j] ← 1",
      "            else",
      "                C[i, j] ← C[i − 1, j − 1] + C[i − 1, j]",
      "    return C[n, k]",
    ],
    counters: { "cells filled": 0, additions: 0 },
    ui(h) { h.append(field("n (≤ 14)", num("bn-n", 6, 1, 14)), field("k", num("bn-k", 3, 0, 14))); },
    defaults() { $("bn-n").value = 6; $("bn-k").value = 3; },
    random() { const n = 5 + rnd(6); $("bn-n").value = n; $("bn-k").value = 2 + rnd(n - 3); },
    read() {
      const n = Math.max(1, Math.min(14, Math.round(+$("bn-n").value || 0)));
      const k = Math.max(0, Math.min(n, Math.round(+$("bn-k").value || 0)));
      $("bn-k").value = k;
      return { n, k };
    },
    record({ n, k }) {
      const spec = { rows: n + 1, cols: k + 1, cw: 50, ch: 32, headW: 40, colHeads: [{ label: "j", vals: range(0, k) }], rowHeads: range(0, n), off: (r, c) => c > r };
      const R = makeRec(n + 1, k + 1), C = Array.from({ length: n + 1 }, () => Array(k + 1).fill(0));
      R.ctr = { "cells filled": 0, additions: 0 };
      R.push({ line: 0, text: `Goal: C(${n}, ${k}). Row i holds C(i, 0..min(i, ${k})). Grey cells (j > i) are never used.` });
      for (let i = 0; i <= n; i++) for (let j = 0; j <= Math.min(i, k); j++) {
        R.ctr["cells filled"]++;
        if (j === 0 || j === i) {
          C[i][j] = 1; R.v[i][j] = "1";
          R.push({ line: [4, 5], st: { [`${i},${j}`]: "new" }, text: `C(${i}, ${j}) = 1: ${j === 0 ? "there is exactly one way to choose nothing" : "there is exactly one way to choose everything"}.`, formula: `C[${i}, ${j}] = 1` });
        } else {
          C[i][j] = C[i - 1][j - 1] + C[i - 1][j]; R.ctr.additions++;
          R.v[i][j] = String(C[i][j]);
          const f0 = `C[${i}, ${j}] = C[${i - 1}, ${j - 1}] + C[${i - 1}, ${j}] = ${C[i - 1][j - 1]} + ${C[i - 1][j]} = `;
          R.push({ line: 7, st: { [`${i},${j}`]: "active", [`${i - 1},${j - 1}`]: "src", [`${i - 1},${j}`]: "src" },
            arrows: [{ from: [i - 1, j - 1], to: [i, j], win: true }, { from: [i - 1, j], to: [i, j], win: true }],
            ask: { r: i, c: j, answer: C[i][j], q: `C[${i}, ${j}]` }, formula: f0 + `<b>${C[i][j]}</b>`, formulaQ: f0 + "?",
            text: `A ${j}-subset of ${i} items either contains item ${i} (then pick ${j - 1} of the other ${i - 1}: ${C[i - 1][j - 1]} ways) or not (pick ${j} of ${i - 1}: ${C[i - 1][j]} ways). Total <b>${C[i][j]}</b>.` });
        }
      }
      const A = (k * (k - 1)) / 2 + k * (n - k);
      R.push({ line: 8, st: { [`${n},${k}`]: "done" }, text: `C(${n}, ${k}) = <b>${C[n][k]}</b>, using ${R.ctr.additions} additions. Levitin's count: k(k − 1)/2 + k(n − k) = ${(k * (k - 1)) / 2} + ${k * (n - k)} = <b>${A}</b> ✓, so Θ(nk) time.`,
        formula: `C(${n}, ${k}) = ${C[n][k]}`, result: `<b>C(${n}, ${k}) = ${C[n][k]}</b> · additions = ${R.ctr.additions} (formula ${A})` });
      return { spec, frames: R.frames };
    },
  };

  /* ---------- LCS ---------- */
  const strRead = (id, def) => ($(id).value.replace(/\s+/g, "") || def).slice(0, 12);
  P.lcs = {
    blurb: "L[i, j] = length of the Longest Common Subsequence (LCS) of the first i letters of X and the first j letters of Y. Matching last letters extend the diagonal answer by 1; otherwise drop one last letter and keep the better result.",
    lines: [
      "ALGORITHM LCS(X[1..m], Y[1..n])",
      "    for i ← 0 to m do L[i, 0] ← 0",
      "    for j ← 0 to n do L[0, j] ← 0",
      "    for i ← 1 to m do",
      "        for j ← 1 to n do",
      "            if X[i] = Y[j] then",
      "                L[i, j] ← L[i − 1, j − 1] + 1",
      "            else",
      "                L[i, j] ← max(L[i − 1, j], L[i, j − 1])",
      "    return L[m, n]",
      "",
      "ALGORITHM LCSTraceback(L, X, Y)",
      "    while i > 0 and j > 0 do",
      "        if X[i] = Y[j] then",
      "            prepend X[i] to S; i ← i − 1; j ← j − 1",
      "        else if L[i − 1, j] ≥ L[i, j − 1] then",
      "            i ← i − 1",
      "        else",
      "            j ← j − 1",
    ],
    counters: { "cells filled": 0, "char comparisons": 0 },
    ui(h) { h.append(field("String X (rows)", txt("lc-x", "ABCBDAB", { style: { width: "150px" } })), field("String Y (columns)", txt("lc-y", "BDCABA", { style: { width: "150px" } }))); },
    defaults() { $("lc-x").value = "ABCBDAB"; $("lc-y").value = "BDCABA"; },
    random() { const g = (L) => Array.from({ length: L }, () => "ABCD"[rnd(4)]).join(""); $("lc-x").value = g(5 + rnd(4)); $("lc-y").value = g(5 + rnd(4)); },
    read() { return { X: strRead("lc-x", "ABCBDAB"), Y: strRead("lc-y", "BDCABA") }; },
    record({ X, Y }) {
      const m = X.length, n = Y.length;
      const spec = { rows: m + 1, cols: n + 1, cw: 40, ch: 34, headW: 58,
        colHeads: [{ label: "j", vals: range(0, n) }, { label: "Y[j]", vals: ["", ...Y] }],
        rowHeads: ["0", ...[...X].map((ch, k) => `${k + 1}  ${ch}`)] };
      const R = makeRec(m + 1, n + 1), L = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
      for (let i = 0; i <= m; i++) R.v[i][0] = "0";
      for (let j = 0; j <= n; j++) R.v[0][j] = "0";
      R.ctr = { "cells filled": 0, "char comparisons": 0 };
      R.push({ line: [1, 2], text: `X = ${X} (rows), Y = ${Y} (columns). An empty prefix has nothing in common with anything, so row 0 and column 0 are 0.` });
      for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
        R.ctr["cells filled"]++; R.ctr["char comparisons"]++;
        const st = { [`${i},${j}`]: "active", [`r${i}`]: "src", [`h1,${j}`]: "src" };
        let f0, text, arrows, line;
        if (X[i - 1] === Y[j - 1]) {
          L[i][j] = L[i - 1][j - 1] + 1; line = [5, 6];
          st[`${i - 1},${j - 1}`] = "src";
          arrows = [{ from: [i - 1, j - 1], to: [i, j], win: true, label: "+1" }];
          f0 = `X[${i}] = Y[${j}] = ${X[i - 1]}, so L[${i}, ${j}] = L[${i - 1}, ${j - 1}] + 1 = ${L[i - 1][j - 1]} + 1 = `;
          text = `Both prefixes end in <b>${X[i - 1]}</b>: that letter can end a common subsequence, so take the diagonal answer and add 1.`;
        } else {
          const up = L[i - 1][j], left = L[i][j - 1];
          L[i][j] = Math.max(up, left); line = [7, 8];
          st[`${i - 1},${j}`] = "src"; st[`${i},${j - 1}`] = "src";
          arrows = [{ from: [i - 1, j], to: [i, j], win: up >= left }, { from: [i, j - 1], to: [i, j], win: left > up }];
          f0 = `X[${i}] = ${X[i - 1]} ≠ Y[${j}] = ${Y[j - 1]}, so L[${i}, ${j}] = max(L[${i - 1}, ${j}], L[${i}, ${j - 1}]) = max(${up}, ${left}) = `;
          text = `${X[i - 1]} ≠ ${Y[j - 1]}: at least one of these last letters is not in the LCS, so drop one of them and keep the better answer (${Math.max(up, left)}).`;
        }
        R.v[i][j] = String(L[i][j]);
        R.push({ line, st, arrows, ask: { r: i, c: j, answer: L[i][j], q: `L[${i}, ${j}]` }, formula: f0 + `<b>${L[i][j]}</b>`, formulaQ: f0 + "?", text });
      }
      R.base = { [`${m},${n}`]: "done" };
      R.push({ line: 9, text: `Table full after ${m * n} character comparisons (Θ(mn)). LCS length = <b>L[${m}, ${n}] = ${L[m][n]}</b>. Trace back to spell it.`, formula: `answer = L[${m}, ${n}] = ${L[m][n]}` });
      let i = m, j = n, s = "";
      while (i > 0 && j > 0) {
        if (X[i - 1] === Y[j - 1]) {
          s = X[i - 1] + s;
          R.base[`${i - 1},${j - 1}`] = "done"; R.base[`r${i}`] = "done"; R.base[`h1,${j}`] = "done";
          R.push({ line: [13, 14], arrows: [{ from: [i - 1, j - 1], to: [i, j], done: true, label: X[i - 1] }], text: `X[${i}] = Y[${j}] = <b>${X[i - 1]}</b>: this letter is in the LCS. Move diagonally.`, result: `LCS so far (built right to left): <b>${s}</b>` });
          i--; j--;
        } else if (L[i - 1][j] >= L[i][j - 1]) {
          R.base[`${i - 1},${j}`] = "done";
          R.push({ line: [15, 16], arrows: [{ from: [i - 1, j], to: [i, j], done: true }], text: `${X[i - 1]} ≠ ${Y[j - 1]} and L above (${L[i - 1][j]}) ≥ L left (${L[i][j - 1]}): the value came from above, so drop X[${i}].` });
          i--;
        } else {
          R.base[`${i},${j - 1}`] = "done";
          R.push({ line: [17, 18], arrows: [{ from: [i, j - 1], to: [i, j], done: true }], text: `${X[i - 1]} ≠ ${Y[j - 1]} and L left (${L[i][j - 1]}) > L above (${L[i - 1][j]}): drop Y[${j}], move left.` });
          j--;
        }
      }
      R.push({ line: 12, text: `Reached an edge. One LCS is <b>${s || "(empty)"}</b>, length ${s.length} = L[${m}, ${n}]. Other LCSs of the same length may exist (other tie choices).`,
        result: `<b>LCS(${X}, ${Y}) = ${s || "∅"}</b> (length ${s.length})` });
      return { spec, frames: R.frames };
    },
  };

  /* ---------- Edit distance ---------- */
  P.edit = {
    blurb: "E[i, j] = fewest single-letter insertions, deletions and substitutions turning the first i letters of X into the first j letters of Y. The last step was a delete (from above), an insert (from the left) or a substitute/match (diagonal).",
    lines: [
      "ALGORITHM EditDistance(X[1..m], Y[1..n])",
      "    for i ← 0 to m do E[i, 0] ← i",
      "    for j ← 0 to n do E[0, j] ← j",
      "    for i ← 1 to m do",
      "        for j ← 1 to n do",
      "            if X[i] = Y[j] then cost ← 0 else cost ← 1",
      "            E[i, j] ← min(E[i − 1, j] + 1,        // delete X[i]",
      "                          E[i, j − 1] + 1,        // insert Y[j]",
      "                          E[i − 1, j − 1] + cost) // match / substitute",
      "    return E[m, n]",
    ],
    counters: { "cells filled": 0, "char comparisons": 0 },
    ui(h) { h.append(field("From X (rows)", txt("ed-x", "KITTEN", { style: { width: "150px" } })), field("To Y (columns)", txt("ed-y", "SITTING", { style: { width: "150px" } }))); },
    defaults() { $("ed-x").value = "KITTEN"; $("ed-y").value = "SITTING"; },
    random() {
      const W = ["SUNDAY", "SATURDAY", "HORSE", "ROSE", "INTENTION", "EXECUTION", "FLAW", "LAWN", "GREEDY", "GRAPH", "TABLE", "CABLE", "DYNAMIC", "DYNAMO"];
      const a = rnd(W.length / 2) * 2; $("ed-x").value = W[a]; $("ed-y").value = W[a + 1];
    },
    read() { return { X: strRead("ed-x", "KITTEN"), Y: strRead("ed-y", "SITTING") }; },
    record({ X, Y }) {
      const m = X.length, n = Y.length;
      const spec = { rows: m + 1, cols: n + 1, cw: 40, ch: 34, headW: 58,
        colHeads: [{ label: "j", vals: range(0, n) }, { label: "Y[j]", vals: ["", ...Y] }],
        rowHeads: ["0", ...[...X].map((ch, k) => `${k + 1}  ${ch}`)] };
      const R = makeRec(m + 1, n + 1), D = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
      for (let i = 0; i <= m; i++) { D[i][0] = i; R.v[i][0] = String(i); }
      for (let j = 0; j <= n; j++) { D[0][j] = j; R.v[0][j] = String(j); }
      R.ctr = { "cells filled": 0, "char comparisons": 0 };
      R.push({ line: [1, 2], text: `Turn ${X} into ${Y}. Column 0: delete all i letters (cost i). Row 0: insert j letters (cost j).` });
      for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
        R.ctr["cells filled"]++; R.ctr["char comparisons"]++;
        const cost = X[i - 1] === Y[j - 1] ? 0 : 1;
        const del = D[i - 1][j] + 1, ins = D[i][j - 1] + 1, dia = D[i - 1][j - 1] + cost;
        D[i][j] = Math.min(del, ins, dia);
        const win = dia === D[i][j] ? "dia" : del === D[i][j] ? "del" : "ins";
        R.v[i][j] = String(D[i][j]);
        const st = { [`${i},${j}`]: "active", [`${i - 1},${j}`]: "src", [`${i},${j - 1}`]: "src", [`${i - 1},${j - 1}`]: "src", [`r${i}`]: "src", [`h1,${j}`]: "src" };
        const arrows = [
          { from: [i - 1, j - 1], to: [i, j], win: win === "dia", label: cost ? "sub+1" : "match" },
          { from: [i - 1, j], to: [i, j], win: win === "del", label: "del" },
          { from: [i, j - 1], to: [i, j], win: win === "ins", label: "ins" }];
        const f0 = `E[${i}, ${j}] = min(${D[i - 1][j]} + 1, ${D[i][j - 1]} + 1, ${D[i - 1][j - 1]} + ${cost}) = min(${del}, ${ins}, ${dia}) = `;
        const how = { dia: cost ? `substitute ${X[i - 1]} → ${Y[j - 1]}` : `keep the matching ${X[i - 1]} for free`, del: `delete ${X[i - 1]}`, ins: `insert ${Y[j - 1]}` }[win];
        R.push({ line: [5, 6, 7, 8], st, arrows, ask: { r: i, c: j, answer: D[i][j], q: `E[${i}, ${j}]` }, formula: f0 + `<b>${D[i][j]}</b>`, formulaQ: f0 + "?",
          text: `${X[i - 1]} vs ${Y[j - 1]}: ${cost ? "different letters" : "same letter"}. Cheapest last step: <b>${how}</b>, total ${D[i][j]}.` });
      }
      R.base = { [`${m},${n}`]: "done" };
      R.push({ line: 9, text: `Edit distance = <b>E[${m}, ${n}] = ${D[m][n]}</b> after ${m * n} comparisons (Θ(mn)). Trace back to list the operations.`, formula: `answer = E[${m}, ${n}] = ${D[m][n]}` });
      let i = m, j = n; const top = [], mid = [], bot = [], ops = [];
      const alignHtml = () => `<div class="align">X: ${top.join(" ")}\n   ${mid.join(" ")}\nY: ${bot.join(" ")}</div>`;
      while (i > 0 || j > 0) {
        let kind;
        if (i > 0 && j > 0 && D[i][j] === D[i - 1][j - 1] + (X[i - 1] === Y[j - 1] ? 0 : 1)) kind = "dia";
        else if (i > 0 && D[i][j] === D[i - 1][j] + 1) kind = "del";
        else kind = "ins";
        const [pi, pj] = kind === "dia" ? [i - 1, j - 1] : kind === "del" ? [i - 1, j] : [i, j - 1];
        let msg;
        if (kind === "dia") {
          const same = X[i - 1] === Y[j - 1];
          top.unshift(X[i - 1]); bot.unshift(Y[j - 1]); mid.unshift(same ? "|" : "*");
          if (!same) ops.unshift(`substitute ${X[i - 1]}→${Y[j - 1]}`);
          msg = same ? `${X[i - 1]} = ${Y[j - 1]}: keep it (cost 0).` : `Substitute <b>${X[i - 1]} → ${Y[j - 1]}</b> (cost 1).`;
        } else if (kind === "del") {
          top.unshift(X[i - 1]); bot.unshift("-"); mid.unshift(" "); ops.unshift(`delete ${X[i - 1]}`);
          msg = `Delete <b>${X[i - 1]}</b> (cost 1).`;
        } else {
          top.unshift("-"); bot.unshift(Y[j - 1]); mid.unshift(" "); ops.unshift(`insert ${Y[j - 1]}`);
          msg = `Insert <b>${Y[j - 1]}</b> (cost 1).`;
        }
        R.base[`${pi},${pj}`] = "done";
        R.push({ line: 6, arrows: [{ from: [pi, pj], to: [i, j], done: true }], text: `At E[${i}, ${j}] = ${D[i][j]}: ${msg}`, result: alignHtml() });
        i = pi; j = pj;
      }
      R.push({ line: 9, text: `Done: ${ops.length} operation${ops.length === 1 ? "" : "s"} (${ops.join(", ") || "none"}) turn ${X} into ${Y}. “|” marks free matches, “*” substitutions, “-” gaps.`,
        result: `<b>Edit distance ${D[m][n]}:</b> ${ops.join(", ") || "strings are equal"}${alignHtml()}` });
      return { spec, frames: R.frames };
    },
  };

  /* ------------------------------------------------------------------ */
  /* Wiring                                                              */
  /* ------------------------------------------------------------------ */
  const stage = $("stage"), say = Forge.narrate($("say"));
  let code, ctr, spec = null, cur = null, predict = false;
  const score = { right: 0, total: 0 }, answered = {};
  const player = Forge.player($("player"), { frames: [], render });

  function withQuestions(frames) {
    const out = [];
    frames.forEach((f) => {
      if (f.ask) {
        const v = f.v.map((r) => r.slice());
        v[f.ask.r][f.ask.c] = "?";
        const st = Object.assign({}, f.st);
        out.push(Object.assign({}, f, { v, st, q: true, formula: f.formulaQ || "", text: `🤔 Your turn: what value goes into <b>${f.ask.q}</b>? Read the yellow cells, apply the recurrence, type your answer and press Check.` }));
      }
      out.push(f);
    });
    return out;
  }

  function render(f, idx) {
    drawTable(stage, spec, f);
    code.highlight(f.line);
    ctr.set(f.ctr);
    say.say(f.text);
    $("formula").innerHTML = f.formula || "&nbsp;";
    $("result").innerHTML = f.result || "";
    const box = $("ask");
    if (f.q) {
      player.pause();
      box.hidden = false;
      $("askQ").innerHTML = `${f.ask.q} = `;
      const a = answered[idx];
      $("askIn").value = a ? a.val : "";
      $("askFb").innerHTML = a ? a.fb : "";
      $("askGo").textContent = a ? "Continue ▶" : "Check";
      if (!a) setTimeout(() => { try { $("askIn").focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 0);
    } else box.hidden = true;
  }

  function checkAnswer() {
    const idx = player.index, f = player.frames[idx];
    if (!f || !f.q) return;
    if (answered[idx]) { player.go(idx + 1); return; }
    const raw = $("askIn").value.trim();
    if (!raw) { $("askFb").textContent = "Type a number first."; return; }
    const norm = (s) => String(s).toLowerCase().replace(/\s/g, "").replace(/^(inf|infinity)$/, "∞").replace(/^-(∞|inf|infinity)$/, "−∞").replace("-∞", "−∞");
    const ok = norm(raw) === norm(f.ask.answer);
    score.total++; if (ok) score.right++;
    $("score").textContent = `predictions: ${score.right} / ${score.total}`;
    const fb = ok ? `<span style="color:var(--ok)">✓ Correct: ${fmt(f.ask.answer)}</span>` : `<span style="color:var(--bad)">✗ It is ${fmt(f.ask.answer)}</span> — check the formula strip.`;
    answered[idx] = { val: raw, fb };
    $("askFb").innerHTML = fb;
    $("askGo").textContent = "Continue ▶";
  }
  $("askGo").onclick = checkAnswer;
  $("askIn").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); checkAnswer(); } });

  function run() {
    const p = P[cur];
    const input = p.read();
    if (!input) { say.say("Please enter a valid input (see the hint under the problem picker)."); return; }
    const res = p.record(input);
    spec = res.spec;
    Object.keys(answered).forEach((k) => delete answered[k]);
    player.load(predict ? withQuestions(res.frames) : res.frames);
  }

  function selectProblem(key) {
    cur = key;
    const p = P[key];
    $("inputs").innerHTML = "";
    p.ui($("inputs"));
    $("blurb").textContent = p.blurb;
    $("code").innerHTML = ""; $("ctr").innerHTML = "";
    code = Forge.code($("code"), p.lines);
    ctr = Forge.counters($("ctr"), p.counters);
    run();
  }

  $("prob").onchange = (e) => selectProblem(e.target.value);
  $("load").onclick = run;
  $("rand").onclick = () => { P[cur].random(); run(); };
  $("reset").onclick = () => { P[cur].defaults(); run(); };
  $("predictMode").onchange = (e) => { predict = e.target.checked; run(); };
  $("inputs").addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.tagName === "INPUT") run(); });

  const q = new URLSearchParams(location.search).get("problem");
  const start = q && P[q] ? q : "coinrow";
  $("prob").value = start;
  selectProblem(start);
})();
