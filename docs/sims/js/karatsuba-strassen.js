/* Large-integer multiplication (grade-school, D&C with 4 products, Karatsuba) and Strassen (Levitin §5.4). */
(function () {
  "use strict";
  Forge.page({ title: "Karatsuba and Strassen", chapter: "Ch 5 · Divide-and-Conquer" });
  const $ = (id) => document.getElementById(id);
  const S = Forge.svg;
  const stage = $("stage");
  const say = Forge.narrate($("say"));
  const pred = FX.predict($("predict"));
  let code = null, ctr = null, runId = 0, mode = "int", method = "kara", msize = 2;
  const P10 = (k) => 10n ** BigInt(k);
  const pad = (x, n) => x.toString().padStart(n, "0");

  const LINES = {
    school: [
      "ALGORITHM GradeSchool(a[0..n-1], b[0..n-1])",
      "    // digit i of a is worth 10^i (digit 0 is the rightmost)",
      "    for j ← 0 to n − 1 do          // each digit of b",
      "        for i ← 0 to n − 1 do      // each digit of a",
      "            col[i + j] ← col[i + j] + a[i] · b[j]   // one digit multiplication",
      "    return the sum of col[k] · 10^k (with carries)",
    ],
    dc4: [
      "ALGORITHM MultiplyDC(a, b, n)      // a, b have n digits, n a power of 2",
      "    if n = 1 then return a · b        // one digit multiplication",
      "    a1, a0 ← first and second halves of a's digits",
      "    b1, b0 ← first and second halves of b's digits",
      "    p ← MultiplyDC(a1, b1, n/2)",
      "    q ← MultiplyDC(a1, b0, n/2)",
      "    r ← MultiplyDC(a0, b1, n/2)",
      "    s ← MultiplyDC(a0, b0, n/2)",
      "    return p · 10^n + (q + r) · 10^(n/2) + s",
    ],
    kara: [
      "ALGORITHM Karatsuba(a, b, n)       // a, b have n digits, n a power of 2",
      "    if n = 1 then return a · b        // one digit multiplication",
      "    a1, a0 ← first and second halves of a's digits",
      "    b1, b0 ← first and second halves of b's digits",
      "    c2 ← Karatsuba(a1, b1, n/2)",
      "    c0 ← Karatsuba(a0, b0, n/2)",
      "    c1 ← Karatsuba(a1 + a0, b1 + b0, n/2) − (c2 + c0)",
      "    return c2 · 10^n + c1 · 10^(n/2) + c0",
    ],
    mat: [
      "ALGORITHM Strassen(A, B)     // n × n matrices, n a power of 2",
      "    if n = 1 then return A · B",
      "    split A, B into n/2 × n/2 blocks A00, A01, A10, A11 and B00, ..., B11",
      "    M1 ← Strassen(A00 + A11, B00 + B11)",
      "    M2 ← Strassen(A10 + A11, B00)",
      "    M3 ← Strassen(A00, B01 − B11)",
      "    M4 ← Strassen(A11, B10 − B00)",
      "    M5 ← Strassen(A00 + A01, B11)",
      "    M6 ← Strassen(A10 − A00, B00 + B01)",
      "    M7 ← Strassen(A01 − A11, B10 + B11)",
      "    C00 ← M1 + M4 − M5 + M7",
      "    C01 ← M3 + M5",
      "    C10 ← M2 + M4",
      "    C11 ← M1 + M3 − M2 + M6",
      "    return C",
    ],
  };

  /* ============================================================ integers */
  let A = 4721n, B = 3895n, N = 4;
  function readInts() {
    const a = $("A").value.replace(/\D/g, "").slice(0, 8) || "0", b = $("B").value.replace(/\D/g, "").slice(0, 8) || "0";
    $("A").value = a; $("B").value = b;
    A = BigInt(a); B = BigInt(b);
    const len = Math.max(a.replace(/^0+/, "").length, b.replace(/^0+/, "").length, 1);
    N = 1; while (N < len) N *= 2;
  }
  function recSchool() {
    const frames = [], n = N, ad = pad(A, n).split("").reverse().map(Number), bd = pad(B, n).split("").reverse().map(Number);
    const cells = {}; let mults = 0, adds = 0;
    const push = (o) => frames.push(Object.assign({ cells: { ...cells }, mults, adds }, o));
    push({ line: 0, text: `a = ${pad(A, n)}, b = ${pad(B, n)} (n = ${n} digits${pad(A, n) !== A.toString() || pad(B, n) !== B.toString() ? ", padded with leading zeros" : ""}). Every digit of a meets every digit of b.`,
      ask: { q: `How many digit multiplications will the grade-school method make for n = ${n}?`, options: [...new Set([n * n, 2 * n, n, Math.round(Math.pow(n, 1.585)), n * n * n])].filter((x) => x > 0).slice(0, 4).sort((x, y) => x - y).map((x) => ({ label: String(x), value: x })), answer: n * n, why: `n · n = ${n * n}: each of the ${n} digits of b multiplies each of the ${n} digits of a.` } });
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const p = ad[i] * bd[j]; cells[i + "," + j] = p; mults++; if (i + j > 0) adds++;
      push({ line: [2, 3, 4], ci: i, cj: j, text: `a's digit ${ad[i]} (worth 10^${i}) × b's digit ${bd[j]} (worth 10^${j}) = <b>${p}</b>, added into column ${i + j}. Digit multiplication #${mults}.` });
    }
    push({ line: 5, final: true, text: `Add everything up with the right powers of ten: ${A} × ${B} = <b>${A * B}</b>. Total: <b>${mults} = n²</b> digit multiplications.` });
    frames.meta = { ad, bd };
    return frames;
  }
  function recTree(kind) {
    const frames = [], nodes = [];
    let mults = 0, idc = 0;
    const done = new Set(), res = {};
    const push = (o) => frames.push(Object.assign({ mults, done: [...done], res: { ...res } }, o));
    function build(x, y, n, depth, tag) { // build the tree first so faded boxes show its full shape
      const nd = { id: idc++, x, y, n, depth, tag, kids: [] };
      nodes.push(nd);
      if (n > 1) {
        const h = n / 2, T = P10(h);
        const x1 = x / T, x0 = x % T, y1 = y / T, y0 = y % T;
        if (kind === "dc4") {
          nd.kids = [build(x1, y1, h, depth + 1, "p = a1·b1"), build(x1, y0, h, depth + 1, "q = a1·b0"), build(x0, y1, h, depth + 1, "r = a0·b1"), build(x0, y0, h, depth + 1, "s = a0·b0")];
        } else {
          const s = x1 + x0, t = y1 + y0;
          nd.kids = [build(x1, y1, h, depth + 1, "c2 = a1·b1"), build(x0, y0, h, depth + 1, "c0 = a0·b0"), build(s % T, t % T, h, depth + 1, "(a1+a0)(b1+b0)")];
        }
      }
      return nd;
    }
    const root = build(A, B, N, 0, "a·b");
    const total = kind === "dc4" ? Math.pow(4, Math.log2(N)) : Math.pow(3, Math.log2(N));
    push({ line: 0, cur: null, text: `a = ${pad(A, N)}, b = ${pad(B, N)}, n = ${N}. The faded tree shows every call that will happen: ${nodes.length} calls, ${total} of them at the bottom (single digits).`,
      ask: { q: `How many one-digit multiplications will ${kind === "dc4" ? "divide-and-conquer with 4 products" : "Karatsuba"} make for n = ${N}?`, options: [...new Set([Math.pow(3, Math.log2(N)), N * N, 2 * N, Math.pow(2, Math.log2(N) + 1) + 1])].slice(0, 4).sort((x, y) => x - y).map((x) => ({ label: String(x), value: x })), answer: total,
        why: kind === "dc4" ? `M(n) = 4M(n/2), M(1) = 1 gives 4^(log₂ ${N}) = ${N}² = ${total}. Splitting alone saves nothing.` : `M(n) = 3M(n/2), M(1) = 1 gives 3^(log₂ ${N}) = ${total} ≈ n^1.585.` } });
    function run(nd) {
      const n = nd.n;
      push({ line: 1, cur: nd.id, text: `Call on <b>${pad(nd.x, n)} × ${pad(nd.y, n)}</b> (${n} digit${n > 1 ? "s" : ""}${nd.depth ? ", computing " + nd.tag : ""}).` });
      if (n === 1) {
        mults++; res[nd.id] = nd.x * nd.y; done.add(nd.id);
        push({ line: 1, cur: nd.id, text: `n = 1: multiply the digits directly: ${nd.x} × ${nd.y} = <b>${res[nd.id]}</b>. Digit multiplication #${mults}.` });
        return res[nd.id];
      }
      const h = n / 2, T = P10(h);
      const x1 = nd.x / T, x0 = nd.x % T, y1 = nd.y / T, y0 = nd.y % T;
      push({ line: [2, 3], cur: nd.id, split: { x1, x0, y1, y0, h }, text: `Split in the middle: a1 = ${pad(x1, h)}, a0 = ${pad(x0, h)}; b1 = ${pad(y1, h)}, b0 = ${pad(y0, h)}. So a = a1·10^${h} + a0 and b = b1·10^${h} + b0.` });
      let r;
      if (kind === "dc4") {
        const [p, q, rr, s] = nd.kids.map((k, idx) => { const v = run(k); push({ line: 4 + idx, cur: nd.id, split: { x1, x0, y1, y0, h }, text: `Back in ${pad(nd.x, n)} × ${pad(nd.y, n)}: ${"pqrs"[idx]} = ${v}.` }); return v; });
        r = p * P10(n) + (q + rr) * T + s;
        res[nd.id] = r; done.add(nd.id);
        push({ line: 8, cur: nd.id, split: { x1, x0, y1, y0, h }, text: `Combine: ${p}·10^${n} + (${q} + ${rr})·10^${h} + ${s} = <b>${r}</b>. Four half-size products were needed.` });
      } else {
        const c2 = run(nd.kids[0]);
        push({ line: 4, cur: nd.id, split: { x1, x0, y1, y0, h }, text: `c2 = a1·b1 = ${c2}.` });
        const c0 = run(nd.kids[1]);
        push({ line: 5, cur: nd.id, split: { x1, x0, y1, y0, h }, text: `c0 = a0·b0 = ${c0}.` });
        const s = x1 + x0, t = y1 + y0, s1 = s / T, s0 = s % T, t1 = t / T, t0 = t % T;
        const carry = s1 > 0n || t1 > 0n;
        push({ line: 6, cur: nd.id, split: { x1, x0, y1, y0, h, s, t }, text: `Now the trick: a1 + a0 = ${s}, b1 + b0 = ${t}.` + (carry ? ` A sum spilled into an extra digit. Write ${s} = ${s1}·10^${h} + ${s0} and ${t} = ${t1}·10^${h} + ${t0}; the extra digits are 0 or 1, so only ${pad(s0, h)} × ${pad(t0, h)} needs real digit multiplications.` : ` Multiply them with one recursive call.`) });
        const m = run(nd.kids[2]);
        const st = s1 * t1 * P10(2 * h) + (s1 * t0 + t1 * s0) * T + m;
        const c1 = st - c2 - c0;
        push({ line: 6, cur: nd.id, split: { x1, x0, y1, y0, h, s, t }, text: `(a1+a0)(b1+b0) = ${carry ? `${s1}·${t1}·10^${2 * h} + (${s1}·${t0} + ${t1}·${s0})·10^${h} + ${m} = ` : ""}${st}. So c1 = ${st} − ${c2} − ${c0} = <b>${c1}</b>. That equals a1·b0 + a0·b1, but cost one multiplication instead of two.` });
        r = c2 * P10(n) + c1 * T + c0;
        res[nd.id] = r; done.add(nd.id);
        push({ line: 7, cur: nd.id, split: { x1, x0, y1, y0, h }, text: `Combine: ${c2}·10^${n} + ${c1}·10^${h} + ${c0} = <b>${r}</b>.` });
      }
      return r;
    }
    const r = run(root);
    push({ line: 0, cur: null, final: true, text: `Result: ${A} × ${B} = <b>${r}</b> ${r === A * B ? "✓" : "✗"}. ${mults} digit multiplications = ${kind === "dc4" ? `4^(log₂ ${N}) = n²` : `3^(log₂ ${N}) ≈ n^1.585`}, compared with n² = ${N * N} for the grade-school method.` });
    frames.meta = { nodes, root };
    return frames;
  }
  function treeLayout(root) {
    let slot = 0; const pos = {}; let maxD = 0;
    (function place(nd) {
      maxD = Math.max(maxD, nd.depth);
      if (!nd.kids.length) { pos[nd.id] = { s: slot++, d: nd.depth }; return pos[nd.id].s; }
      const xs = nd.kids.map(place);
      pos[nd.id] = { s: (xs[0] + xs[xs.length - 1]) / 2, d: nd.depth };
      return pos[nd.id].s;
    })(root);
    const SX = 58, W = Math.max(760, 40 + slot * SX), rowH = 86, H = 40 + (maxD + 1) * rowH;
    const off = (W - (slot - 1) * SX) / 2;
    for (const k in pos) pos[k] = { x: off + pos[k].s * SX, y: 40 + pos[k].d * rowH, w: SX };
    return { pos, W, H, leafW: SX };
  }
  function drawTree(f, meta) {
    const L = meta.lay || (meta.lay = treeLayout(meta.root));
    stage.setAttribute("viewBox", `0 0 ${L.W} ${L.H}`);
    stage.innerHTML = "";
    const done = new Set(f.done);
    meta.nodes.forEach((nd) => nd.kids.forEach((k) => {
      const a = L.pos[nd.id], b = L.pos[k.id];
      stage.appendChild(S("line", { x1: a.x, y1: a.y + 16, x2: b.x, y2: b.y - 16, stroke: done.has(k.id) ? "var(--c-done)" : "var(--line-2)", "stroke-width": 1.5, opacity: done.has(k.id) || f.cur === k.id ? 1 : 0.5 }));
    }));
    const byDepth = {};
    meta.nodes.forEach((nd) => { byDepth[nd.depth] = nd.n; });
    Object.keys(byDepth).forEach((d) => stage.appendChild(S("text", { x: 8, y: 44 + d * 86, "font-size": 12, fill: "var(--muted)" }, `n=${byDepth[d]}`)));
    meta.nodes.forEach((nd) => {
      const p = L.pos[nd.id], n = nd.n;
      const label = `${pad(nd.x, n)}×${pad(nd.y, n)}`;
      const count = Math.pow(meta.nodes[0].kids.length || 1, Math.log2(meta.nodes[0].n) - nd.depth);
      const w = Math.min(Math.max(50, count * L.leafW - 8), label.length * 9 + 16);
      const fs = Math.min(13, (w - 8) / (label.length * 0.62));
      const isCur = f.cur === nd.id, isDone = done.has(nd.id);
      const seen = isCur || isDone || f.final;
      stage.appendChild(S("rect", { x: p.x - w / 2, y: p.y - 16, width: w, height: 32, rx: 7, fill: isCur ? "var(--c-active)" : isDone ? "var(--c-done)" : "var(--panel-2)", stroke: isCur ? "var(--c-active)" : "var(--line-2)", opacity: seen || f.cur == null ? 1 : 0.45 }));
      stage.appendChild(S("text", { x: p.x, y: p.y + fs * 0.35, "text-anchor": "middle", "font-size": fs, "font-weight": 700, fill: isCur || isDone ? "#0d1117" : "var(--ink-2)", opacity: seen || f.cur == null ? 1 : 0.6 }, label));
      if (isDone && f.res[nd.id] !== undefined) {
        const rs = "=" + f.res[nd.id];
        stage.appendChild(S("text", { x: p.x, y: p.y + 30, "text-anchor": "middle", "font-size": Math.min(12, fs + 1), "font-weight": 700, fill: "var(--c-done)" }, rs));
      }
    });
  }
  function drawSchool(f, meta) {
    const n = N, cell = Math.min(64, 440 / n), x0 = 190, y0 = 70;
    const W = 760, H = y0 + n * cell + 70;
    stage.setAttribute("viewBox", `0 0 ${W} ${H}`);
    stage.innerHTML = "";
    stage.appendChild(S("text", { x: x0 + (n * cell) / 2, y: 24, "text-anchor": "middle", "font-size": 13, fill: "var(--muted)" }, `digits of a = ${pad(A, n)}`));
    stage.appendChild(S("text", { x: 20, y: y0 + (n * cell) / 2, "font-size": 13, fill: "var(--muted)" }, `digits of b`));
    stage.appendChild(S("text", { x: 20, y: y0 + (n * cell) / 2 + 18, "font-size": 13, fill: "var(--muted)" }, `= ${pad(B, n)}`));
    for (let c = 0; c < n; c++) { // column c shows digit index i = n-1-c (left to right like writing)
      const i = n - 1 - c;
      stage.appendChild(S("text", { x: x0 + c * cell + cell / 2, y: y0 - 10, "text-anchor": "middle", "font-size": 15, "font-weight": 700, fill: f.ci === i ? "var(--c-active)" : "var(--ink)" }, String(meta.ad[i])));
    }
    for (let r = 0; r < n; r++) {
      const j = n - 1 - r;
      stage.appendChild(S("text", { x: x0 - 14, y: y0 + r * cell + cell / 2 + 5, "text-anchor": "end", "font-size": 15, "font-weight": 700, fill: f.cj === j ? "var(--c-pivot)" : "var(--ink)" }, String(meta.bd[j])));
      for (let c = 0; c < n; c++) {
        const i = n - 1 - c, v = f.cells[i + "," + j], cur = f.ci === i && f.cj === j;
        stage.appendChild(S("rect", { x: x0 + c * cell + 2, y: y0 + r * cell + 2, width: cell - 4, height: cell - 4, rx: 6, fill: cur ? "var(--c-active)" : v !== undefined ? "var(--c-done)" : "var(--panel-2)", stroke: "var(--line)" }));
        if (v !== undefined) stage.appendChild(S("text", { x: x0 + c * cell + cell / 2, y: y0 + r * cell + cell / 2 + 5, "text-anchor": "middle", "font-size": Math.min(15, cell / 2.6), "font-weight": 700, fill: "#0d1117" }, String(v)));
      }
    }
    stage.appendChild(S("text", { x: x0 + n * cell + 20, y: y0 + 20, "font-size": 13, fill: "var(--ink-2)" }, `${f.mults} of ${n}² = ${n * n}`));
    if (f.final) stage.appendChild(S("text", { x: x0, y: H - 20, "font-size": 15, "font-weight": 700, fill: "var(--c-done)" }, `${A} × ${B} = ${A * B}`));
  }
  function intDetail(f, fr) {
    if (method === "school") {
      $("detail").innerHTML = f.ci != null ? `<div class="big">a[${f.ci}] · b[${f.cj}] = ${fr.meta.ad[f.ci]} · ${fr.meta.bd[f.cj]} = ${f.cells[f.ci + "," + f.cj]}</div><div>worth 10^${f.ci + f.cj} (column ${f.ci + f.cj})</div>` : `<div class="big">${A} × ${B}${f.final ? " = " + (A * B) : ""}</div>`;
      return;
    }
    const nd = f.cur != null ? fr.meta.nodes[f.cur] : fr.meta.root;
    let h = `<div class="big">${pad(nd.x, nd.n)} × ${pad(nd.y, nd.n)}${f.res[nd.id] !== undefined ? " = " + f.res[nd.id] : ""}</div>`;
    if (f.split) {
      const sp = f.split, hh = sp.h;
      h += `<div>a = <span class="a1">${pad(sp.x1, hh)}</span><span class="a0">${pad(sp.x0, hh)}</span> → a1 = <span class="a1">${pad(sp.x1, hh)}</span>, a0 = <span class="a0">${pad(sp.x0, hh)}</span></div>`;
      h += `<div>b = <span class="a1">${pad(sp.y1, hh)}</span><span class="a0">${pad(sp.y0, hh)}</span> → b1 = <span class="a1">${pad(sp.y1, hh)}</span>, b0 = <span class="a0">${pad(sp.y0, hh)}</span></div>`;
      if (method === "kara") h += `<div>c2 = a1·b1, c0 = a0·b0, c1 = (a1 + a0)(b1 + b0) − (c2 + c0)${sp.s !== undefined ? ` = (${sp.s})(${sp.t}) − (c2 + c0)` : ""}</div><div>result = c2·10^${nd.n} + c1·10^${hh} + c0</div>`;
      else h += `<div>result = (a1·b1)·10^${nd.n} + (a1·b0 + a0·b1)·10^${hh} + a0·b0</div>`;
    }
    $("detail").innerHTML = h;
  }
  function growthInt() {
    let h = `<table class="t"><thead><tr><th>n digits</th><th>grade-school n²</th><th>D&amp;C, 4 products</th><th>Karatsuba 3^(log₂ n)</th><th>savings</th></tr></thead><tbody>`;
    for (let k = 0; k <= 10; k++) {
      const n = 1 << k, sq = n * n, ka = Math.pow(3, k);
      h += `<tr${n === N ? ' style="background:var(--steel-soft)"' : ""}><td>${n}</td><td>${FX.fmt(sq)}</td><td>${FX.fmt(sq)}</td><td class="win">${FX.fmt(ka)}</td><td>${(sq / ka).toFixed(1)}×</td></tr>`;
    }
    $("growth").innerHTML = h + `</tbody></table><p class="fx-note" style="margin:8px 0 0">M(n) = 3M(n/2), M(1) = 1 solves to M(n) = 3^(log₂ n) = n^(log₂ 3) ≈ n^1.585 (Levitin §5.4). Additions also grow as Θ(n^1.585), so the total work does too.</p>`;
  }

  /* ============================================================ Strassen */
  let MA = [[1, 3], [5, 7]], MB = [[8, 4], [6, 2]];
  const matMul = (X, Y) => X.map((r, i) => Y[0].map((_, j) => r.reduce((s, _, k) => s + X[i][k] * Y[k][j], 0)));
  const add = (X, Y) => X.map((r, i) => r.map((v, j) => v + Y[i][j]));
  const sub = (X, Y) => X.map((r, i) => r.map((v, j) => v - Y[i][j]));
  function block(M, bi, bj, h) { return M.slice(bi * h, bi * h + h).map((r) => r.slice(bj * h, bj * h + h)); }
  const mstr = (X) => (Array.isArray(X) ? "[" + X.map((r) => r.join(" ")).join("; ") + "]" : String(X));
  function strassen2(X, Y) { // counts via closure-free return: {C, mults, adds}
    if (X.length === 1) return { C: [[X[0][0] * Y[0][0]]], mults: 1, adds: 0 };
    const h = X.length / 2;
    const [a00, a01, a10, a11] = [block(X, 0, 0, h), block(X, 0, 1, h), block(X, 1, 0, h), block(X, 1, 1, h)];
    const [b00, b01, b10, b11] = [block(Y, 0, 0, h), block(Y, 0, 1, h), block(Y, 1, 0, h), block(Y, 1, 1, h)];
    const parts = [[add(a00, a11), add(b00, b11)], [add(a10, a11), b00], [a00, sub(b01, b11)], [a11, sub(b10, b00)], [add(a00, a01), b11], [sub(a10, a00), add(b00, b01)], [sub(a01, a11), add(b10, b11)]];
    let mults = 0, adds = 18 * h * h;
    const M = parts.map(([p, q]) => { const r = strassen2(p, q); mults += r.mults; adds += r.adds; return r.C; });
    const c00 = add(sub(add(M[0], M[3]), M[4]), M[6]), c01 = add(M[2], M[4]), c10 = add(M[1], M[3]), c11 = add(sub(add(M[0], M[2]), M[1]), M[5]);
    const C = [];
    for (let i = 0; i < 2 * h; i++) C.push(i < h ? c00[i].concat(c01[i]) : c10[i - h].concat(c11[i - h]));
    return { C, mults, adds };
  }
  const MDEF = [
    { a: [["00", 1], ["11", 1]], b: [["00", 1], ["11", 1]], txt: "(A00 + A11)(B00 + B11)", ao: 1, bo: 1 },
    { a: [["10", 1], ["11", 1]], b: [["00", 1]], txt: "(A10 + A11) B00", ao: 1, bo: 0 },
    { a: [["00", 1]], b: [["01", 1], ["11", -1]], txt: "A00 (B01 − B11)", ao: 0, bo: 1 },
    { a: [["11", 1]], b: [["10", 1], ["00", -1]], txt: "A11 (B10 − B00)", ao: 0, bo: 1 },
    { a: [["00", 1], ["01", 1]], b: [["11", 1]], txt: "(A00 + A01) B11", ao: 1, bo: 0 },
    { a: [["10", 1], ["00", -1]], b: [["00", 1], ["01", 1]], txt: "(A10 − A00)(B00 + B01)", ao: 1, bo: 1 },
    { a: [["01", 1], ["11", -1]], b: [["10", 1], ["11", 1]], txt: "(A01 − A11)(B10 + B11)", ao: 1, bo: 1 },
  ];
  const CDEF = [
    { at: "00", terms: [[0, 1], [3, 1], [4, -1], [6, 1]], txt: "M1 + M4 − M5 + M7", ops: 3 },
    { at: "01", terms: [[2, 1], [4, 1]], txt: "M3 + M5", ops: 1 },
    { at: "10", terms: [[1, 1], [3, 1]], txt: "M2 + M4", ops: 1 },
    { at: "11", terms: [[0, 1], [2, 1], [1, -1], [5, 1]], txt: "M1 + M3 − M2 + M6", ops: 3 },
  ];
  function recMat() {
    const n = msize, h = n / 2, frames = [];
    const blk = (M, key) => block(M, +key[0], +key[1], h);
    const lin = (M, list) => list.reduce((acc, [k, sgn]) => { const b = blk(M, k); return acc ? (sgn > 0 ? add(acc, b) : sub(acc, b)) : sgn > 0 ? b : sub(b.map((r) => r.map(() => 0)), b); }, null);
    const val = (X) => (h === 1 ? X[0][0] : X);
    const Ms = [], Cs = {};
    let mults = 0, adds = 0;
    const push = (o) => frames.push(Object.assign({ Ms: Ms.slice(), Cs: { ...Cs }, mults, adds }, o));
    const brute = n === 2 ? 8 : 64;
    push({ line: [0, 2], text: n === 2 ? `Two 2 × 2 matrices of numbers. The ordinary method needs 8 multiplications (each of the 4 cells is a row times a column: 2 products). Strassen needs 7.` : `Two 4 × 4 matrices, cut into 2 × 2 blocks. Treat each block like a number: Strassen's 7 formulas still work, and each block product is itself a 2 × 2 multiplication done by Strassen.`,
      ask: { q: `How many scalar multiplications will Strassen's method use here?`, options: (n === 2 ? [7, 8, 4, 6] : [49, 64, 56, 28]).sort((x, y) => x - y).map((x) => ({ label: String(x), value: x })), answer: n === 2 ? 7 : 49,
        why: n === 2 ? "7: one per product M1 … M7. The ordinary method uses 8." : "M(4) = 7·M(2) = 7·7 = 49, versus 4³ = 64 for the ordinary method." } });
    MDEF.forEach((d, k) => {
      const X = lin(MA, d.a), Y = lin(MB, d.b), r = strassen2(X, Y);
      Ms.push(val(r.C)); mults += r.mults; adds += (d.ao + d.bo) * h * h + r.adds;
      if (k === 4 && n === 2) {
        const v = Ms[4];
        push({ line: 3 + k, hlA: d.a.map((x) => x[0]), hlB: d.b.map((x) => x[0]), hideM: 4, text: `M5 uses (a00 + a01) and b11. Compute it yourself before stepping on.`,
          ask: { q: `M5 = (a00 + a01) · b11 = (${MA[0][0]} + ${MA[0][1]}) · ${MB[1][1]} = ?`, options: [...new Set([v, v + MB[1][1], MA[0][0] * MB[1][1], v - 2])].slice(0, 4).sort((x, y) => x - y).map((x) => ({ label: String(x), value: x })), answer: v, why: `${MA[0][0] + MA[0][1]} · ${MB[1][1]} = ${v}.` } });
      }
      push({ line: 3 + k, hlA: d.a.map((x) => x[0]), hlB: d.b.map((x) => x[0]), cur: k, text: `<b>M${k + 1}</b> = ${d.txt} = ${mstr(X)} · ${mstr(Y)} = <b>${mstr(val(r.C))}</b>. ${n === 2 ? "One multiplication." : `One 2 × 2 block product, done by Strassen: 7 multiplications.`}` });
    });
    CDEF.forEach((d, k) => {
      let acc = null;
      d.terms.forEach(([m, sgn]) => { const X = h === 1 ? [[Ms[m]]] : Ms[m]; acc = acc ? (sgn > 0 ? add(acc, X) : sub(acc, X)) : X; });
      Cs[d.at] = val(acc); adds += d.ops * h * h;
      push({ line: 10 + k, hlC: d.at, text: `<b>C${d.at}</b> = ${d.txt} = ${d.terms.map(([m, sgn], t) => (t ? (sgn > 0 ? " + " : " − ") : "") + mstr(Ms[m])).join("")} = <b>${mstr(Cs[d.at])}</b>. Only additions and subtractions here.` });
    });
    const C = matMul(MA, MB), mine = strassen2(MA, MB).C;
    const ok = JSON.stringify(C) === JSON.stringify(mine);
    push({ line: 14, final: true, check: C, text: `Check against the ordinary row-times-column product: ${ok ? "every cell matches ✓" : "mismatch ✗"}. Strassen: <b>${mults}</b> multiplications and ${adds} additions/subtractions. Ordinary: ${brute} multiplications and ${n === 2 ? 4 : 48} additions. The savings only pay off for large n.` });
    return frames;
  }
  function drawMat(f) {
    const n = msize, h = n / 2, cell = n === 2 ? 50 : 36, gw = n * cell;
    const W = 760, H = n === 2 ? 330 : 440, y0 = 60;
    stage.setAttribute("viewBox", `0 0 ${W} ${H}`);
    stage.innerHTML = "";
    const xs = [40, 40 + gw + 60, 40 + 2 * gw + 120];
    const Cfull = f.final ? f.check : null;
    const drawGrid = (M, x, name, hl, col, isC) => {
      stage.appendChild(S("text", { x: x + gw / 2, y: y0 - 14, "text-anchor": "middle", "font-size": 15, "font-weight": 700, fill: "var(--ink-2)" }, name));
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const key = `${Math.floor(i / h)}${Math.floor(j / h)}`, on = hl && hl.includes(key);
        let v = M ? M[i][j] : "";
        if (isC) { const c = f.Cs[key]; v = c === undefined ? "" : h === 1 ? c : c[i % h][j % h]; if (Cfull) v = Cfull[i][j]; }
        stage.appendChild(S("rect", { x: x + j * cell + 2, y: y0 + i * cell + 2, width: cell - 4, height: cell - 4, rx: 6, fill: on ? col : isC && v !== "" ? "var(--c-done)" : "var(--panel-2)", stroke: "var(--line)" }));
        stage.appendChild(S("text", { x: x + j * cell + cell / 2, y: y0 + i * cell + cell / 2 + 5, "text-anchor": "middle", "font-size": n === 2 ? 17 : 13, "font-weight": 700, fill: on || (isC && v !== "") ? "#0d1117" : "var(--ink)" }, String(v)));
      }
      if (n === 4) {
        stage.appendChild(S("line", { x1: x + gw / 2, y1: y0 - 2, x2: x + gw / 2, y2: y0 + gw + 2, stroke: "var(--ember)", "stroke-width": 2 }));
        stage.appendChild(S("line", { x1: x - 2, y1: y0 + gw / 2, x2: x + gw + 2, y2: y0 + gw / 2, stroke: "var(--ember)", "stroke-width": 2 }));
      }
    };
    drawGrid(MA, xs[0], "A", f.hlA, "var(--c-compare)");
    stage.appendChild(S("text", { x: xs[1] - 30, y: y0 + gw / 2 + 8, "text-anchor": "middle", "font-size": 24, fill: "var(--muted)" }, "×"));
    drawGrid(MB, xs[1], "B", f.hlB, "var(--c-pivot)");
    stage.appendChild(S("text", { x: xs[2] - 30, y: y0 + gw / 2 + 8, "text-anchor": "middle", "font-size": 24, fill: "var(--muted)" }, "="));
    drawGrid(null, xs[2], "C", f.hlC ? [f.hlC] : null, "var(--c-active)", true);
    // M list
    const ly = y0 + gw + 50;
    MDEF.forEach((d, k) => {
      const col = n === 2 && k >= 4 ? 1 : 0, row = n === 2 ? k % 4 : k, x = 40 + col * 360, y = ly + row * (n === 2 ? 26 : 24);
      const known = k < f.Ms.length && f.hideM !== k;
      stage.appendChild(S("text", { x, y, "font-size": 13, fill: f.cur === k ? "var(--c-active)" : known ? "var(--ink)" : "var(--muted)", "font-weight": f.cur === k ? 700 : 400 }, `M${k + 1} = ${d.txt}${known ? " = " + mstr(f.Ms[k]) : ""}`));
    });
  }
  function matDetail(f) {
    const n = msize;
    let h = `<div>A = ${mstr(MA)}</div><div>B = ${mstr(MB)}</div>`;
    if (f.final) h += `<div class="big">A · B = ${mstr(f.check)}</div><div>ordinary: C[i][j] = Σ A[i][k]·B[k][j] → ${n === 2 ? 8 : 64} multiplications</div>`;
    else if (f.cur != null) h += `<div class="big">M${f.cur + 1} = ${MDEF[f.cur].txt} = ${mstr(f.Ms[f.cur])}</div>`;
    else if (f.hlC) h += `<div class="big">C${f.hlC} = ${mstr(f.Cs[f.hlC])}</div>`;
    $("detail").innerHTML = h;
  }
  function growthMat() {
    let h = `<table class="t"><thead><tr><th>n</th><th>ordinary n³</th><th>Strassen 7^(log₂ n) = n^2.807</th><th>savings</th></tr></thead><tbody>`;
    for (let k = 1; k <= 10; k++) {
      const n = 1 << k, cube = n * n * n, st = Math.pow(7, k);
      h += `<tr${n === msize ? ' style="background:var(--steel-soft)"' : ""}><td>${n}</td><td>${FX.fmt(cube)}</td><td class="win">${FX.fmt(st)}</td><td>${(cube / st).toFixed(2)}×</td></tr>`;
    }
    $("growth").innerHTML = h + `</tbody></table><p class="fx-note" style="margin:8px 0 0">M(n) = 7M(n/2), M(1) = 1 gives 7^(log₂ n) = n^(log₂ 7) ≈ n^2.807 multiplications. Additions satisfy A(n) = 7A(n/2) + 18(n/2)², also Θ(n^2.807) (Levitin §5.4).</p>`;
  }
  function setMatInputs() { $("MA").value = MA.map((r) => r.join(" ")).join("\n"); $("MB").value = MB.map((r) => r.join(" ")).join("\n"); }
  function randMats() {
    const r = () => Math.floor(Math.random() * 10);
    MA = Array.from({ length: msize }, () => Array.from({ length: msize }, r));
    MB = Array.from({ length: msize }, () => Array.from({ length: msize }, r));
    setMatInputs();
  }
  function readMats() {
    const parse = (s) => s.trim().split(/\n|;/).map((l) => l.trim().split(/[\s,]+/).filter(Boolean).map(Number)).filter((r) => r.length);
    const a = parse($("MA").value), b = parse($("MB").value);
    const okShape = (M) => M.length === msize && M.every((r) => r.length === msize && r.every(Number.isFinite));
    if (!okShape(a) || !okShape(b)) { say.say(`Both matrices must be ${msize} × ${msize}: ${msize} numbers per line, ${msize} lines.`); return false; }
    MA = a; MB = b; return true;
  }

  /* ============================================================ plumbing */
  let frames = [];
  const player = Forge.player($("player"), {
    frames: [], fps: 2,
    render(f, i, fr) {
      frames = fr;
      if (mode === "mat") { drawMat(f); matDetail(f); ctr.set({ multiplications: f.mults, "additions / subtractions": f.adds, "ordinary would use": msize === 2 ? "8 mults" : "64 mults" }); }
      else {
        if (method === "school") drawSchool(f, fr.meta); else drawTree(f, fr.meta);
        intDetail(f, fr);
        const total = method === "kara" ? Math.pow(3, Math.log2(N)) : N * N;
        ctr.set({ "digit multiplications": f.mults, [method === "kara" ? "3^(log₂ n)" : "n²"]: total, "n (digits)": N, "grade-school n²": N * N });
      }
      code.highlight(f.line); say.say(f.text);
      if (f.ask) { const key = runId + ":" + i; pred.show(f.ask, key); if (pred.shouldPause(key)) player.pause(); } else pred.hide();
    },
  });
  function setupPanels() {
    $("code").innerHTML = ""; $("ctr").innerHTML = "";
    code = Forge.code($("code"), mode === "mat" ? LINES.mat : LINES[method]);
    ctr = Forge.counters($("ctr"), mode === "mat" ? { multiplications: 0, "additions / subtractions": 0, "ordinary would use": "" } : { "digit multiplications": 0, [method === "kara" ? "3^(log₂ n)" : "n²"]: 0, "n (digits)": 0, "grade-school n²": 0 });
    const L = mode === "mat" ? [["var(--c-compare)", "A cells in the first factor"], ["var(--c-pivot)", "B cells in the second factor"], ["var(--c-active)", "C block being assembled"], ["var(--c-done)", "C cells finished"]]
      : method === "school" ? [["var(--c-active)", "current digit product"], ["var(--c-done)", "digit products done"]]
      : [["var(--c-active)", "current call"], ["var(--c-done)", "returned (product below)"], ["var(--panel-2)", "call not reached yet (faded)"]];
    $("legend").innerHTML = L.map(([c, t]) => `<span><i style="background:${c};border:1px solid var(--line-2)"></i>${t}</span>`).join("");
    $("detailTitle").textContent = mode === "mat" ? "Current product" : method === "school" ? "Current digit product" : "Current call";
    $("note").textContent = mode === "mat" ? "Strassen's 7 products replace the 8 of the ordinary method. Type your own matrices (one row per line) or press Random." : "Up to 8 digits each. Numbers are padded with leading zeros to n = a power of 2 digits.";
  }
  function run() {
    setupPanels();
    let fr;
    if (mode === "mat") { fr = recMat(); growthMat(); }
    else { readInts(); fr = method === "school" ? recSchool() : recTree(method); growthInt(); }
    frames = fr; runId++;
    player.load(fr);
  }
  document.querySelectorAll("#modes button").forEach((b) => (b.onclick = () => {
    mode = b.dataset.m; document.querySelectorAll("#modes button").forEach((x) => x.classList.toggle("on", x === b));
    $("intCtl").classList.toggle("show", mode === "int"); $("matCtl").classList.toggle("show", mode === "mat");
    run();
  }));
  document.querySelectorAll("#method button").forEach((b) => (b.onclick = () => { method = b.dataset.k; document.querySelectorAll("#method button").forEach((x) => x.classList.toggle("on", x === b)); run(); }));
  document.querySelectorAll("#msize button").forEach((b) => (b.onclick = () => {
    msize = +b.dataset.s; document.querySelectorAll("#msize button").forEach((x) => x.classList.toggle("on", x === b));
    if (msize === 2) { MA = [[1, 3], [5, 7]]; MB = [[8, 4], [6, 2]]; setMatInputs(); } else randMats();
    run();
  }));
  $("intGo").onclick = run;
  $("intRand").onclick = () => {
    const len = [2, 4, 4, 8][Math.floor(Math.random() * 4)];
    const rnd = () => String(1 + Math.floor(Math.random() * 9)) + Array.from({ length: len - 1 }, () => Math.floor(Math.random() * 10)).join("");
    $("A").value = rnd(); $("B").value = rnd(); run();
  };
  $("matGo").onclick = () => { if (readMats()) run(); };
  $("matRand").onclick = () => { randMats(); run(); };
  setMatInputs();
  run();
})();
