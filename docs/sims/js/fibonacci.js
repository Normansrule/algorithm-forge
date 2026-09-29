/* Fibonacci four ways — Algorithm Forge, Chapter 2 */
(function () {
  "use strict";
  Forge.page({ title: "Fibonacci Four Ways", chapter: "Ch 2 · Analysis Framework" });
  const $ = (id) => document.getElementById(id);
  const S = Forge.svg, E = Forge.el;
  const fmt = F12.fmt;
  const stage = $("stage");
  const narrow = () => (stage.getBoundingClientRect().width || 760) < 560;
  const say = Forge.narrate($("say"));
  let code = null, ctr = null, view = "tree";

  /** exact Fibonacci numbers as BigInt */
  const FIB = [0n, 1n];
  for (let k = 2; k <= 400; k++) FIB[k] = FIB[k - 1] + FIB[k - 2];
  const big = (v) => { const s = v.toString(); return s.length <= 18 ? BigInt(s).toLocaleString("en-US") : s.slice(0, 6) + "…" + s.slice(-4) + ` (${s.length} digits)`; };

  /* ================================================================ view: recursive call tree */
  const TREE = {
    range: [0, 9], def: 6, note: "0 – 9 (the tree doubles with every step)",
    code: [
      "ALGORITHM F(n)",
      "    // computes the nth Fibonacci number by its definition",
      "    if n ≤ 1 then",
      "        return n",
      "    else",
      "        return F(n - 1) + F(n - 2)",
    ],
    ctr: { calls: 0, additions: 0, "F(1) leaves": 0, "F(0) leaves": 0, repeats: 0 },
    legend: [["var(--c-active)", "running (on the stack)"], ["var(--c-done)", "returned"], ["var(--c-pivot)", "repeat: already computed elsewhere"], ["var(--panel-2)", "not called yet"]],
    hint: "total number of calls",
    record(n) {
      const nodes = [], frames = [];
      let leafSlot = 0;
      function build(k, depth, parent) {
        const nd = { id: nodes.length, k, depth, parent, kids: [] };
        nodes.push(nd);
        if (k > 1) { nd.kids.push(build(k - 1, depth + 1, nd.id).id); nd.kids.push(build(k - 2, depth + 1, nd.id).id); nd.x = (nodes[nd.kids[0]].x + nodes[nd.kids[1]].x) / 2; }
        else nd.x = leafSlot++;
        return nd;
      }
      build(n, 0, null);
      const leaves = leafSlot;
      const status = new Array(nodes.length).fill(0); // 0 pending, 1 active, 2 done
      const repeat = new Array(nodes.length).fill(false);
      const val = new Array(nodes.length).fill(null);
      const doneK = new Set();
      const perK = new Array(n + 1).fill(0);
      let calls = 0, adds = 0, c1 = 0, c0 = 0, reps = 0;
      const snap = (line, cur, text) => frames.push({ status: status.slice(), repeat: repeat.slice(), val: val.slice(), cur, line, text, calls, adds, c1, c0, reps, perK: perK.slice() });
      function run(id) {
        const nd = nodes[id];
        calls++; perK[nd.k]++;
        status[id] = 1;
        if (doneK.has(nd.k)) { repeat[id] = true; reps++; }
        snap([2], id, `Call F(${nd.k})` + (repeat[id] ? ` — <b>again</b>: F(${nd.k}) was already computed in another branch, but plain recursion has no memory, so it starts from scratch.` : nd.k > 1 ? `: n > 1, so it needs F(${nd.k - 1}) and F(${nd.k - 2}) first.` : `: a base case.`));
        if (nd.k <= 1) {
          val[id] = nd.k;
          if (nd.k === 1) c1++; else c0++;
          status[id] = 2; doneK.add(nd.k);
          snap([2, 3], id, `F(${nd.k}) = ${nd.k}: base case, return immediately. (F(1) leaves so far: ${c1}; F(0) leaves: ${c0}.)`);
          return nd.k;
        }
        const a = run(nd.kids[0]);
        const b = run(nd.kids[1]);
        adds++;
        val[id] = a + b;
        status[id] = 2; doneK.add(nd.k);
        snap([5], id, `Both halves are back: F(${nd.k}) = F(${nd.k - 1}) + F(${nd.k - 2}) = ${a} + ${b} = <b>${a + b}</b>. That is addition #${adds}.`);
        return a + b;
      }
      snap([0], null, `We will compute F(${n}) straight from the definition F(n) = F(n−1) + F(n−2), F(0) = 0, F(1) = 1. Watch how often the same F(k) is recomputed.`);
      run(0);
      const F = (k) => Number(FIB[Math.max(0, k)]);
      snap([], null, `F(${n}) = <b>${val[0]}</b>. Calls: ${calls} = 2F(${n + 1}) − 1 = ${2 * F(n + 1) - 1}. Additions: ${adds} = F(${n + 1}) − 1 = ${F(n + 1) - 1}. F(1) leaves C(n) = ${c1} = F(${n})` + (n >= 1 ? `, F(0) leaves Z(n) = ${c0} = F(${n - 1}).` : ".") + ` ${reps} of the ${calls} calls were repeats.`);
      return { frames, nodes, leaves, n };
    },
    render(f, R) {
      const nodes = R.nodes, W = narrow() ? 480 : 760, depth = R.n + 1, H = 30 + Math.max(1, R.n) * 52 + 26;
      stage.setAttribute("viewBox", `0 0 ${W} ${H}`);
      stage.innerHTML = "";
      const sp = (W - 30) / Math.max(1, R.leaves), r = Math.max(4, Math.min(15, sp * 0.4));
      const X = (nd) => 15 + (nd.x + 0.5) * sp, Y = (nd) => 22 + nd.depth * 52;
      void depth;
      nodes.forEach((nd) => nd.kids.forEach((c) => stage.appendChild(S("line", { x1: X(nd), y1: Y(nd), x2: X(nodes[c]), y2: Y(nodes[c]), stroke: f.status[c] ? "var(--line-2)" : "var(--line)", "stroke-width": 1.3 }))));
      nodes.forEach((nd) => {
        const st = f.status[nd.id];
        let fill = "var(--panel-2)", ink = "var(--muted)";
        if (st === 2) { fill = f.repeat[nd.id] ? "var(--c-pivot)" : "var(--c-done)"; ink = "#0d1117"; }
        if (st === 1) { fill = f.repeat[nd.id] ? "var(--c-pivot)" : "var(--c-active)"; ink = "#0d1117"; }
        const isCur = f.cur === nd.id;
        stage.appendChild(S("circle", { cx: X(nd), cy: Y(nd), r: isCur ? r + 2 : r, fill, stroke: isCur ? "var(--ember)" : st ? fill : "var(--line-2)", "stroke-width": isCur ? 3 : 1.2, opacity: st ? 1 : 0.55 }));
        if (r >= 8) stage.appendChild(S("text", { x: X(nd), y: Y(nd) + 4, "text-anchor": "middle", "font-size": Math.min(12, r * 0.9), "font-weight": 700, fill: ink }, String(nd.k)));
        if (st === 2 && sp >= 26) stage.appendChild(S("text", { x: X(nd), y: Y(nd) + r + 12, "text-anchor": "middle", "font-size": 10.5, fill: "var(--ember-2)" }, "=" + f.val[nd.id]));
      });
      if (r < 8) stage.appendChild(S("text", { x: W - 10, y: H - 6, "text-anchor": "end", "font-size": 11, fill: "var(--muted)" }, `${nodes.length} calls · labels hidden, hover-free overview`));
      code.highlight(f.line);
      ctr.set({ calls: f.calls, additions: f.adds, "F(1) leaves": f.c1, "F(0) leaves": f.c0, repeats: f.reps });
      // calls per argument
      const n = R.n, max = Math.max(1, ...f.perK);
      $("extra").innerHTML = `<div class="kbars">${f.perK.map((c, k) => `<span>F(${k})</span><span><span class="b ${c <= 1 ? "one" : ""}" style="display:block;width:${Math.max(c ? 2 : 0, (100 * c) / max)}%"></span></span><span>${c}×${f === R.frames[R.frames.length - 1] ? "" : ""}</span>`).join("")}</div>
        <p class="muted small" style="margin:8px 0 0">At the end F(k) has been called F(${n}−k+1) times for k ≥ 1 (and F(0) F(${n}−1) times). A memo table would call each one once: that is the whole idea of dynamic programming.</p>`;
    },
  };

  /* ================================================================ view: bottom-up table */
  const DP = {
    range: [0, 90], def: 12, note: "0 – 90",
    codes: {
      table: [
        "ALGORITHM FibTable(n)",
        "    F ← array(n + 1, 0)",
        "    F[0] ← 0",
        "    if n ≥ 1 then",
        "        F[1] ← 1",
        "    for i ← 2 to n do",
        "        F[i] ← F[i - 1] + F[i - 2]",
        "    return F[n]",
      ],
      window: [
        "ALGORITHM FibIterative(n)",
        "    if n = 0 then",
        "        return 0",
        "    prev ← 0",
        "    curr ← 1",
        "    for i ← 2 to n do",
        "        next ← prev + curr",
        "        prev ← curr",
        "        curr ← next",
        "    return curr",
      ],
    },
    ctr: { i: "—", additions: 0, "values kept": 0 },
    legend: [["var(--c-compare)", "the two values being added"], ["var(--c-swap)", "value being written"], ["var(--c-done)", "stored"], ["var(--c-dim)", "forgotten (two-variable version)"]],
    hint: "the next value",
    record(n, variant) {
      const frames = [];
      const L = variant === "window" ? { init: [3, 4], loop: [5, 6, 7, 8], ret: 9 } : { init: [1, 2, 3, 4], loop: [5, 6], ret: 7 };
      const known = [0];
      if (n >= 1) known.push(1);
      frames.push({ known: known.slice(), i: null, adds: 0, line: L.init, keep: variant === "window" ? Math.min(2, n + 1) : known.length, text: variant === "window" ? `Start with the two seeds prev = F(0) = 0 and curr = F(1) = 1. Only these two numbers (plus a temporary) will ever be stored.` : `Allocate a table F[0..${n}] and fill the seeds F[0] = 0` + (n >= 1 ? ` and F[1] = 1.` : ".") + ` Every later cell needs only the two cells to its left.` });
      for (let i = 2; i <= n; i++) {
        const v = FIB[i];
        known.push(v);
        frames.push({ known: known.slice(), i, adds: i - 1, line: L.loop, keep: variant === "window" ? 2 : known.length, text: `i = ${i}: F[${i}] = F[${i - 1}] + F[${i - 2}] = ${big(FIB[i - 1])} + ${big(FIB[i - 2])} = <b>${big(v)}</b>.` + (variant === "window" ? ` Slide the window: prev ← ${big(FIB[i - 1])}, curr ← ${big(v)}; F(${i - 2}) is forgotten.` : "") });
      }
      frames.push({ known: known.slice(), i: null, done: true, adds: Math.max(0, n - 1), line: L.ret, keep: variant === "window" ? Math.min(2, n + 1) : known.length, text: `F(${n}) = <b>${big(FIB[n])}</b> after ${Math.max(0, n - 1)} additions: linear, compared with ${fmt(Number(FIB[n + 1]) - 1)} for the plain recursion. ${variant === "window" ? "Memory: Θ(1)." : `Memory: ${n + 1} cells; switch to "two variables" to get Θ(1).`}` });
      return { frames, n, variant };
    },
    render(f, R) {
      const n = R.n, cols = 5, cw = 150, ch = 44, rows = Math.ceil((n + 1) / cols);
      const W = cols * cw + 10, H = rows * ch + 10;
      stage.setAttribute("viewBox", `0 0 ${W} ${H}`);
      stage.innerHTML = "";
      for (let k = 0; k <= n; k++) {
        const x = 5 + (k % cols) * cw, y = 5 + Math.floor(k / cols) * ch;
        const has = k < f.known.length;
        let fill = "var(--panel-2)", ink = "var(--muted)";
        if (has) { fill = "color-mix(in srgb, var(--c-done) 22%, var(--panel))"; ink = "var(--ink)"; }
        if (R.variant === "window" && has && f.i != null && k < f.i - 1) { fill = "var(--c-dim)"; ink = "var(--muted)"; }
        if (R.variant === "window" && f.done && k < n - 1) { fill = "var(--c-dim)"; ink = "var(--muted)"; }
        if (f.i != null && (k === f.i - 1 || k === f.i - 2)) { fill = "var(--c-compare)"; ink = "#0d1117"; }
        if (f.i != null && k === f.i) { fill = "var(--c-swap)"; ink = "#0d1117"; }
        stage.appendChild(S("rect", { x: x + 3, y: y + 3, width: cw - 6, height: ch - 6, rx: 8, fill, stroke: "var(--line-2)" }));
        stage.appendChild(S("text", { x: x + 12, y: y + 20, "font-size": 10.5, fill: ink }, `F[${k}]`));
        const s = has ? f.known[k].toString() : "?";
        stage.appendChild(S("text", { x: x + cw - 12, y: y + 34, "text-anchor": "end", "font-size": s.length > 17 ? 10 : 12.5, "font-weight": 700, fill: ink }, s));
      }
      code.highlight(f.line);
      ctr.set({ i: f.i == null ? "—" : f.i, additions: f.adds, "values kept": R.variant === "window" ? "2 (+1 temp)" : f.known.length });
      $("extra").innerHTML = `<p class="small" style="margin:0">Each cell depends only on the two cells before it, so filling left to right never recomputes anything: ${Math.max(0, n - 1)} additions in total. This "solve the small subproblems first and store them" pattern is <b>dynamic programming</b> (Levitin Ch. 8).</p>`;
    },
  };

  /* ================================================================ view: matrix power / fast doubling */
  const mul = (A, B) => [[A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]], [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]]];
  const MAT = {
    range: [1, 300], def: 13, note: "1 – 300",
    codes: {
      matrix: [
        "ALGORITHM FibMatrix(n)  // n ≥ 1",
        "    Q ← [[1, 1], [1, 0]]",
        "    b ← bits of n, most significant first",
        "    P ← Q  // leading 1 bit: exponent 1",
        "    for each remaining bit b_i do",
        "        P ← P · P  // exponent doubles",
        "        if b_i = 1 then",
        "            P ← P · Q  // exponent + 1",
        "    return P[0][1]  // Pⁿ holds F(n)",
      ],
      doubling: [
        "ALGORITHM FibDoubling(n)",
        "    a ← 0  // a = F(k), k = 0",
        "    b ← 1  // b = F(k + 1)",
        "    for each bit of n, most significant first do",
        "        c ← a * (2 * b - a)  // F(2k)",
        "        d ← a * a + b * b  // F(2k + 1)",
        "        if bit = 1 then",
        "            a ← d  // k ← 2k + 1",
        "            b ← c + d",
        "        else",
        "            a ← c  // k ← 2k",
        "            b ← d",
        "    return a",
      ],
    },
    ctr: { exponent: 0, "matrix products": 0, "scalar mults": 0, bits: 0 },
    legend: [["var(--c-active)", "current bit"], ["var(--c-done)", "bits already used"], ["var(--c-compare)", "value just computed"]],
    hint: "the exponent after this step",
    record(n, variant) {
      const bits = n.toString(2).split("").map(Number), frames = [];
      if (variant === "doubling") {
        let a = 0n, b = 1n, k = 0, mults = 0;
        frames.push({ bits, bi: -1, k, a, b, mults, line: [1, 2], text: `Start with k = 0: a = F(0) = 0, b = F(1) = 1. n = ${n} = ${bits.join("")}₂ has ${bits.length} bits; each bit costs 3 multiplications.` });
        bits.forEach((bit, i) => {
          const c = a * (2n * b - a), d = a * a + b * b;
          mults += 3;
          const k2 = 2 * k;
          frames.push({ bits, bi: i, k: k2, a: c, b: d, mults, line: [3, 4, 5], text: `Bit ${i + 1} is ${bit}. Doubling formulas: F(${k2}) = F(${k})·(2F(${k + 1}) − F(${k})) = ${big(c)} and F(${k2 + 1}) = F(${k})² + F(${k + 1})² = ${big(d)}. (3 multiplications.)` });
          if (bit) { a = d; b = c + d; k = k2 + 1; frames.push({ bits, bi: i, k, a, b, mults, line: [6, 7, 8], text: `The bit is 1, so step one further: k = ${k}, a = F(${k}) = ${big(a)}, b = F(${k + 1}) = c + d = ${big(b)}.` }); }
          else { a = c; b = d; k = k2; frames.push({ bits, bi: i, k, a, b, mults, line: [9, 10, 11], text: `The bit is 0, so keep k = ${k}: a = F(${k}), b = F(${k + 1}).` }); }
        });
        frames.push({ bits, bi: bits.length, k, a, b, mults, line: [12], text: `All bits read, k = n = ${n}: F(${n}) = <b>${big(a)}</b> with ${mults} multiplications (3 × ${bits.length} bits), versus ${n - 1} additions bottom-up.` });
        return { frames, n, variant, bits };
      }
      const Q = [[1n, 1n], [1n, 0n]];
      let P = Q, e = 1, prods = 0;
      frames.push({ bits, bi: 0, e, P, prods, line: [1, 2, 3], text: `n = ${n} = ${bits.join("")}₂. The leading bit is always 1: start with P = Q¹ = [[F(2), F(1)], [F(1), F(0)]].` });
      for (let i = 1; i < bits.length; i++) {
        P = mul(P, P); prods++; e *= 2;
        frames.push({ bits, bi: i, e, P, prods, line: [4, 5], text: `Bit ${i + 1}: square. P = P·P = Q${F12.sup(e)}, whose corner is F(${e}) = ${big(P[0][1])}.` });
        if (bits[i]) { P = mul(P, Q); prods++; e += 1; frames.push({ bits, bi: i, e, P, prods, line: [6, 7], text: `That bit is 1, so multiply by Q once more: P = Q${F12.sup(e)}, F(${e}) = ${big(P[0][1])}.` }); }
      }
      frames.push({ bits, bi: bits.length, e, P, prods, line: [8], text: `Done: Q${F12.sup(n)} has F(${n}) = <b>${big(P[0][1])}</b> in its corner, after ${prods} matrix products (${8 * prods} scalar multiplications). Bound: 2⌊log₂ ${n}⌋ = ${2 * Math.floor(Math.log2(n))}.` });
      return { frames, n, variant, bits };
    },
    render(f, R) {
      const W = 760, H = 250;
      stage.setAttribute("viewBox", `0 0 ${W} ${H}`);
      stage.innerHTML = "";
      const nb = f.bits.length, bw = Math.min(44, (W - 40) / nb);
      stage.appendChild(S("text", { x: 20, y: 22, "font-size": 12.5, fill: "var(--ink-2)" }, `n = ${R.n} in binary:`));
      f.bits.forEach((b, i) => {
        const x = 20 + i * bw, st = i === f.bi ? "var(--c-active)" : i < f.bi ? "var(--c-done)" : "var(--panel-2)";
        stage.appendChild(S("rect", { x, y: 32, width: bw - 4, height: 34, rx: 6, fill: st, stroke: "var(--line-2)" }));
        stage.appendChild(S("text", { x: x + (bw - 4) / 2, y: 55, "text-anchor": "middle", "font-size": Math.min(16, bw * 0.5), "font-weight": 700, fill: i <= f.bi ? "#0d1117" : "var(--ink)" }, String(b)));
      });
      const cell = (x, y, w, label, v, hl) => {
        stage.appendChild(S("rect", { x, y, width: w, height: 52, rx: 8, fill: hl ? "color-mix(in srgb, var(--c-compare) 25%, var(--panel))" : "var(--panel)", stroke: hl ? "var(--c-compare)" : "var(--line-2)" }));
        stage.appendChild(S("text", { x: x + 10, y: y + 18, "font-size": 11, fill: "var(--muted)" }, label));
        const s = v.toString(), t = s.length > 26 ? s.slice(0, 10) + "…" + s.slice(-8) + ` (${s.length}d)` : s;
        stage.appendChild(S("text", { x: x + w - 10, y: y + 40, "text-anchor": "end", "font-size": t.length > 20 ? 11 : 14, "font-weight": 700, fill: "var(--ink)" }, t));
      };
      if (R.variant === "doubling") {
        stage.appendChild(S("text", { x: 20, y: 100, "font-size": 13, fill: "var(--ink)" }, `k = ${f.k}`));
        cell(20, 112, 350, `a = F(${f.k})`, f.a, true);
        cell(390, 112, 350, `b = F(${f.k + 1})`, f.b, false);
        stage.appendChild(S("text", { x: 20, y: 200, "font-size": 12, fill: "var(--muted)" }, "F(2k) = F(k)·(2F(k+1) − F(k))     F(2k+1) = F(k)² + F(k+1)²"));
        code.highlight(f.line);
        ctr.set({ exponent: f.k, "matrix products": "—", "scalar mults": f.mults, bits: Math.max(0, Math.min(nb, f.bi + 1)) });
      } else {
        stage.appendChild(S("text", { x: 20, y: 96, "font-size": 13, fill: "var(--ink)" }, `P = Q${F12.sup(f.e)} = [[F(${f.e + 1}), F(${f.e})], [F(${f.e}), F(${f.e - 1})]]`));
        cell(20, 108, 350, `F(${f.e + 1})`, f.P[0][0], false);
        cell(390, 108, 350, `F(${f.e})  ← the answer's slot`, f.P[0][1], true);
        cell(20, 166, 350, `F(${f.e})`, f.P[1][0], false);
        cell(390, 166, 350, `F(${f.e - 1})`, f.P[1][1], false);
        code.highlight(f.line);
        ctr.set({ exponent: f.e, "matrix products": f.prods, "scalar mults": 8 * f.prods, bits: Math.min(nb, f.bi + 1) });
      }
      $("extra").innerHTML = `<p class="small" style="margin:0">Why it works: [[1, 1], [1, 0]]ⁿ = [[F(n+1), F(n)], [F(n), F(n−1)]] (prove it by induction). Raising to the nth power by repeated squaring needs about log₂ n products instead of n − 1 additions: the same trick as exponentiation by squaring (Levitin §6.5). For n = ${R.n}: ${R.bits.length} bits.</p>`;
    },
  };

  /* ================================================================ view: Binet */
  const PHI = (1 + Math.sqrt(5)) / 2, PSI = (1 - Math.sqrt(5)) / 2;
  function binetRow(n) {
    const x = Math.pow(PHI, n) / Math.sqrt(5);
    const fl = Math.floor(x);
    const diff = Number(BigInt(fl) - FIB[n]) + (x - fl); // computed − exact, measured exactly
    const ok = BigInt(Math.round(x)) === FIB[n];
    return { n, x, diff, ok, gap: Math.pow(PSI, n) / Math.sqrt(5) };
  }
  const BINET = {
    range: [1, 90], def: 80, note: "1 – 90 (the rows 0 … n are replayed)",
    code: [
      "ALGORITHM FibBinet(n)",
      "    φ ← (1 + sqrt(5)) / 2  // ≈ 1.6180339887",
      "    return round(φ^n / sqrt(5))  // exact with real numbers",
    ],
    ctr: { n: 0, "φⁿ/√5 (double)": 0, "rounded": 0, "exact F(n)": 0, "first failure": "—" },
    legend: [["var(--c-done)", "true gap |ψⁿ/√5|"], ["var(--c-swap)", "gap seen by the computer"], ["var(--muted)", "0.5: rounding breaks above"]],
    hint: "whether rounding is still right",
    record(N) {
      const rows = [], frames = [];
      let first = null;
      for (let n = 0; n <= N; n++) {
        const r = binetRow(n);
        rows.push(r);
        if (!r.ok && first == null) first = n;
        frames.push({ upto: n, first, line: [1, 2], text: r.ok
          ? `n = ${n}: φⁿ/√5 = ${r.x.toPrecision(17).replace(/\.?0+$/, "")} rounds to ${big(FIB[n])} ✔. The true gap to F(n) is ψⁿ/√5 ≈ ${r.gap.toExponential(2)}, ${Math.abs(r.gap) < 0.5 ? "always under 1/2, which is why rounding works in exact arithmetic" : "under 1/2"}.`
          : `n = ${n}: the computer's φⁿ/√5 = ${r.x.toFixed(2)} rounds to ${Math.round(r.x)}, but F(${n}) = ${big(FIB[n])} ✘. The rounding error of φ, magnified by the power, is now ${Math.abs(r.diff).toFixed(2)} > 0.5.` });
      }
      return { frames, rows, N, first };
    },
    render(f, R) {
      const rows = R.rows.slice(0, f.upto + 1);
      const pts1 = rows.filter((r) => r.n > 0).map((r) => [r.n, Math.max(1e-30, Math.abs(r.gap))]);
      const pts2 = rows.filter((r) => r.n > 0).map((r) => [r.n, Math.max(1e-30, Math.abs(r.diff))]);
      F12.plot(stage, {
        W: 760, H: 330, m: { l: 62, r: 20, t: 16, b: 44 },
        x: { min: 0, max: R.N, label: "n", name: "n" },
        y: { min: 1e-20, max: 1e3, log: true, label: "|φⁿ/√5 − F(n)|", tipFmt: (v) => v.toExponential(2) },
        series: [
          { name: "true gap", color: "var(--c-done)", pts: pts1 },
          { name: "computer's gap", type: "dots", color: "var(--c-swap)", pts: pts2, r: 3.5, opacity: 0.9, endLabel: false },
        ],
        hlines: [{ y: 0.5, color: "var(--muted)", label: "0.5" }],
        note: "● computer's gap (dots)   — true gap (line)",
      });
      const r = R.rows[f.upto];
      code.highlight(f.line);
      ctr.set({ n: r.n, "φⁿ/√5 (double)": r.x < 1e6 ? r.x.toPrecision(8) : r.x.toExponential(6), rounded: big(BigInt(Math.round(r.x))), "exact F(n)": big(FIB[r.n]), "first failure": f.first == null ? "none yet" : "n = " + f.first });
      const last = rows.slice(-10);
      $("extra").innerHTML = `<div class="scroll-x"><table class="t"><tr><th>n</th><th>φⁿ/√5 in double precision</th><th>rounded</th><th>exact F(n)</th><th></th></tr>${last.map((q) => `<tr><td>${q.n}</td><td class="lft">${q.x < 1e16 ? q.x.toFixed(4) : q.x.toExponential(8)}</td><td>${fmt(Math.round(q.x))}</td><td>${FIB[q.n].toLocaleString("en-US")}</td><td class="${q.ok ? "okc" : "badc"}">${q.ok ? "✔" : "✘"}</td></tr>`).join("")}</table></div>`;
    },
  };

  /* ================================================================ wiring */
  const VIEWS = { tree: TREE, dp: DP, mat: MAT, binet: BINET };
  const TITLES = { tree: "How many times was each F(k) called?", dp: "Why this is fast", mat: "Why matrices?", binet: "The last 10 rows" };
  let R = null, keepP = false;
  const player = Forge.player($("player"), { frames: [], render: (f) => { if (!keepP) $("predict").innerHTML = ""; VIEWS[view].render(f, R); say.say(f.text); } });

  function variant() { return view === "dp" ? $("dpSel").value : view === "mat" ? $("matSel").value : null; }
  function setupPanels() {
    const V = VIEWS[view];
    $("code").innerHTML = ""; $("ctr").innerHTML = "";
    code = Forge.code($("code"), V.codes ? V.codes[variant()] : V.code);
    ctr = Forge.counters($("ctr"), V.ctr);
    $("legend").innerHTML = V.legend.map(([c, t]) => `<span><i style="background:${c}${c === "var(--panel-2)" ? ";border:1px solid var(--line-2)" : ""}"></i>${t}</span>`).join("");
    $("extraTitle").textContent = TITLES[view];
    $("predictHint").textContent = V.hint;
    $("dpVar").classList.toggle("on", view === "dp");
    $("matVar").classList.toggle("on", view === "mat");
    $("n").min = V.range[0]; $("n").max = V.range[1];
    $("nRange").textContent = V.note;
  }
  function load() {
    const V = VIEWS[view];
    let n = Math.round(+$("n").value);
    if (!Number.isFinite(n)) n = V.def;
    n = Math.max(V.range[0], Math.min(V.range[1], n));
    $("n").value = n;
    R = V.record(n, variant());
    player.load(R.frames);
  }
  document.querySelectorAll("#viewTabs button").forEach((b) => (b.onclick = () => {
    view = b.dataset.v;
    document.querySelectorAll("#viewTabs button").forEach((x) => x.classList.toggle("on", x === b));
    $("n").value = VIEWS[view].def;
    setupPanels(); load();
  }));
  $("go").onclick = load;
  $("n").addEventListener("keydown", (e) => { if (e.key === "Enter") load(); });
  $("rand").onclick = () => { const V = VIEWS[view]; $("n").value = V.range[0] + Math.floor(Math.random() * (V.range[1] - V.range[0] + 1)); load(); };
  $("dpSel").onchange = $("matSel").onchange = () => { setupPanels(); load(); };

  $("predictBtn").onclick = () => {
    player.pause();
    const i = player.index, fr = player.frames;
    const reveal = (k) => () => { keepP = true; player.go(k); keepP = false; };
    if (view === "tree") {
      const tot = 2 * Number(FIB[R.n + 1]) - 1;
      F12.predict($("predict"), { prompt: `How many calls in total will F(${R.n}) make (including the first one)?`, answer: tot, check: (v) => +v === tot, explain: `Calls satisfy A(n) = A(n−1) + A(n−2) + 1 with A(0) = A(1) = 1, whose solution is 2F(n+1) − 1 = ${tot}.`, onReveal: reveal(fr.length - 1) });
    } else if (view === "dp") {
      const k = fr.findIndex((f, x) => x > i && f.i != null);
      if (k < 0) { $("predict").innerHTML = `<div class="callout">The table is full. Press ⏮ or pick a bigger n.</div>`; return; }
      const j = fr[k].i;
      F12.predict($("predict"), { prompt: `F[${j - 2}] = ${FIB[j - 2]} and F[${j - 1}] = ${FIB[j - 1]}. What is F[${j}]?`, answer: FIB[j].toString(), check: (v) => String(v).replace(/[,\s]/g, "") === FIB[j].toString(), explain: "Just add the two cells to its left.", onReveal: reveal(k) });
    } else if (view === "mat") {
      const k = Math.min(fr.length - 1, i + 1);
      const f = fr[k];
      const ans = variant() === "doubling" ? f.k : f.e;
      F12.predict($("predict"), { prompt: variant() === "doubling" ? `k is ${fr[i].k} now. What will k be after the next step?` : `The exponent is ${fr[i].e} now. What will it be after the next step?`, answer: ans, check: (v) => +v === ans, explain: "Squaring doubles the exponent; a 1 bit then adds one.", onReveal: reveal(k) });
    } else {
      const k = Math.min(fr.length - 1, i + 1);
      const r = R.rows[fr[k].upto];
      F12.predict($("predict"), { prompt: `Will round(φⁿ/√5) in double precision still equal F(${r.n})?`, choices: ["yes", "no"], answer: r.ok ? "yes" : "no", explain: r.ok ? "Yes: the computed gap is still below 0.5." : "No: the computed gap has passed 0.5.", onReveal: reveal(k) });
    }
  };

  window.addEventListener("resize", () => player.go(player.index));
  setupPanels();
  load();
})();
