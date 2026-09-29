/* Recurrence lab — backward substitution + recursion tree + Master Theorem. Algorithm Forge, Chapter 2 */
(function () {
  "use strict";
  Forge.page({ title: "Recurrence Lab", chapter: "Ch 2 · Analysis Framework" });
  const $ = (id) => document.getElementById(id);
  const S = Forge.svg;
  const sup = (x) => `<sup>${x}</sup>`;
  const fmt = F12.fmt;
  const log2 = Math.log2;

  /* ---------------------------------------------------------------- presets */
  const P = {
    sum: {
      name: "T(n) = T(n−1) + n, T(0) = 0", kind: "dec", a: 1, sizeMin: 1, sizeMax: 9, sizeDef: 5,
      f: (s) => s, fText: "n", baseSize: 0, baseVal: 0, T: "T",
      closed: (n) => (n * (n + 1)) / 2, closedText: "n(n + 1)/2", cls: "Θ(n²)",
      code: [
        "ALGORITHM Work(n)",
        "    // does n units of work, then recurses on n − 1",
        "    if n = 0 then",
        "        return  // T(0) = 0",
        "    for i ← 1 to n do",
        "        visit(i)  // n units",
        "    Work(n - 1)  // T(n − 1)",
      ], lines: { base: [2, 3], work: [4, 5], call: [6] },
      deriv: () => [
        ["T(n) = T(n−1) + n", "The recurrence: one call on n−1, plus n units of local work."],
        ["= [T(n−2) + (n−1)] + n = T(n−2) + (n−1) + n", "Substitute T(n−1) = T(n−2) + (n−1)."],
        ["= T(n−3) + (n−2) + (n−1) + n", "Substitute again: T(n−2) = T(n−3) + (n−2)."],
        ["= T(n−i) + (n−i+1) + … + (n−1) + n", "Pattern after i substitutions."],
        ["i = n: = T(0) + 1 + 2 + … + n", "Hit the initial condition: n − i = 0 when i = n."],
        ["= 0 + n(n + 1)/2 ∈ Θ(n²)", "Arithmetic series 1 + 2 + … + n = n(n + 1)/2."],
      ],
      master: { note: "Not a divide-and-conquer recurrence (the size goes down by subtracting 1), so the Master Theorem does not apply. Backward substitution is the tool." },
    },
    hanoi: {
      name: "M(n) = 2M(n−1) + 1, M(1) = 1", kind: "dec", a: 2, sizeMin: 1, sizeMax: 7, sizeDef: 4,
      f: () => 1, fText: "1", baseSize: 1, baseVal: 1, T: "M",
      closed: (n) => Math.pow(2, n) - 1, closedText: "2ⁿ − 1", cls: "Θ(2ⁿ)",
      code: [
        "ALGORITHM Hanoi(n, source, target, spare)",
        "    if n = 1 then",
        "        move disk 1 from source to target  // M(1) = 1",
        "    else",
        "        Hanoi(n - 1, source, spare, target)  // M(n − 1)",
        "        move disk n from source to target  // + 1",
        "        Hanoi(n - 1, spare, target, source)  // M(n − 1)",
      ], lines: { base: [1, 2], work: [5], call: [4, 6] },
      deriv: () => [
        [`M(n) = 2M(n−1) + 1`, "Two calls on n − 1 disks plus one move of the biggest disk."],
        [`= 2[2M(n−2) + 1] + 1 = 2${sup(2)}M(n−2) + 2 + 1`, "Substitute M(n−1) = 2M(n−2) + 1."],
        [`= 2${sup(3)}M(n−3) + 2${sup(2)} + 2 + 1`, "Substitute again."],
        [`= 2${sup("i")}M(n−i) + 2${sup("i−1")} + … + 2 + 1 = 2${sup("i")}M(n−i) + 2${sup("i")} − 1`, "Pattern after i substitutions (a geometric series)."],
        [`i = n−1: = 2${sup("n−1")}M(1) + 2${sup("n−1")} − 1`, "Hit the initial condition M(1) = 1."],
        [`= 2${sup("n−1")} + 2${sup("n−1")} − 1 = 2${sup("n")} − 1 ∈ Θ(2${sup("n")})`, "Exponential: every extra disk doubles the work."],
      ],
      master: { note: "Not a divide-and-conquer recurrence (n − 1, not n/b), so the Master Theorem does not apply." },
    },
    merge: {
      name: "T(n) = 2T(n/2) + n, T(1) = 0", kind: "div", a: 2, b: 2, d: 1, sizeMin: 0, sizeMax: 6, sizeDef: 4,
      f: (s) => s, fText: "n", baseSize: 1, baseVal: 0, T: "T",
      closed: (n) => n * log2(n), closedText: "n log₂ n", cls: "Θ(n log n)",
      code: [
        "ALGORITHM Mergesort(A[0..n-1])",
        "    if n > 1 then  // T(1) = 0",
        "        copy A[0..⌊n/2⌋-1] to B",
        "        copy A[⌊n/2⌋..n-1] to C",
        "        Mergesort(B)  // T(n/2)",
        "        Mergesort(C)  // T(n/2)",
        "        Merge(B, C, A)  // about n comparisons",
      ], lines: { base: [1], work: [6], call: [4, 5] },
      deriv: () => [
        [`T(2${sup("k")}) = 2T(2${sup("k−1")}) + 2${sup("k")}`, "Let n = 2ᵏ so every half is a whole number."],
        [`= 2[2T(2${sup("k−2")}) + 2${sup("k−1")}] + 2${sup("k")} = 2${sup(2)}T(2${sup("k−2")}) + 2·2${sup("k")}`, "Substitute T(2ᵏ⁻¹)."],
        [`= 2${sup(3)}T(2${sup("k−3")}) + 3·2${sup("k")}`, "Again: each substitution adds another 2ᵏ = n."],
        [`= 2${sup("i")}T(2${sup("k−i")}) + i·2${sup("k")}`, "Pattern after i substitutions."],
        [`i = k: = 2${sup("k")}T(1) + k·2${sup("k")} = 0 + k·2${sup("k")}`, "Hit T(1) = 0."],
        [`= n log₂ n ∈ Θ(n log n)`, "Back to n: 2ᵏ = n and k = log₂ n."],
      ],
      master: { a: 2, b: 2, d: 1 },
    },
    bs: {
      name: "T(n) = T(n/2) + 1, T(1) = 1", kind: "div", a: 1, b: 2, d: 0, sizeMin: 0, sizeMax: 7, sizeDef: 4,
      f: () => 1, fText: "1", baseSize: 1, baseVal: 1, T: "T",
      closed: (n) => log2(n) + 1, closedText: "log₂ n + 1", cls: "Θ(log n)",
      code: [
        "ALGORITHM BinSearch(A[l..r], K)",
        "    if l = r then",
        "        return (A[l] = K)  // T(1) = 1 comparison",
        "    m ← ⌊(l + r)/2⌋",
        "    if K ≤ A[m] then  // + 1 comparison",
        "        return BinSearch(A[l..m], K)  // T(n/2)",
        "    else",
        "        return BinSearch(A[m+1..r], K)  // T(n/2)",
      ], lines: { base: [1, 2], work: [4], call: [5, 7] },
      deriv: () => [
        [`T(2${sup("k")}) = T(2${sup("k−1")}) + 1`, "Let n = 2ᵏ. One comparison, then one half."],
        [`= [T(2${sup("k−2")}) + 1] + 1 = T(2${sup("k−2")}) + 2`, "Substitute T(2ᵏ⁻¹)."],
        [`= T(2${sup("k−3")}) + 3`, "Each substitution adds 1."],
        [`= T(2${sup("k−i")}) + i`, "Pattern after i substitutions."],
        [`i = k: = T(1) + k = 1 + k`, "Hit T(1) = 1."],
        [`= log₂ n + 1 ∈ Θ(log n)`, "k = log₂ n halvings."],
      ],
      master: { a: 1, b: 2, d: 0 },
    },
    midterm: {
      name: "T(n) = T(n/2) + log₂ n, T(1) = 1", kind: "div", a: 1, b: 2, sizeMin: 0, sizeMax: 7, sizeDef: 4,
      f: (s) => log2(s), fText: "log₂ n", baseSize: 1, baseVal: 1, T: "T",
      closed: (n) => 1 + (log2(n) * (log2(n) + 1)) / 2, closedText: "1 + log₂n (log₂n + 1)/2", cls: "Θ(log² n)",
      code: [
        "ALGORITHM ProfessorH(P, n)",
        "    // decrease-and-conquer: size n → size n/2",
        "    if n = 1 then",
        "        return SolveDirectly(P)  // T(1) = 1",
        "    Q ← Shrink(P)  // step 1  ┐ together",
        "    S ← ProfessorH(Q, n / 2)  // step 2: T(n/2)",
        "    return Extend(S, P)  // step 3  ┘ log₂ n",
      ], lines: { base: [2, 3], work: [4, 6], call: [5] },
      deriv: () => [
        [`T(2${sup("k")}) = T(2${sup("k−1")}) + k`, "Let n = 2ᵏ, so log₂ n = k."],
        [`= [T(2${sup("k−2")}) + (k−1)] + k`, "Substitute T(2ᵏ⁻¹) = T(2ᵏ⁻²) + (k − 1)."],
        [`= T(2${sup("k−3")}) + (k−2) + (k−1) + k`, "Substitute again."],
        [`= T(2${sup("k−i")}) + (k−i+1) + … + (k−1) + k`, "Pattern after i substitutions."],
        [`i = k: = T(1) + 1 + 2 + … + k = 1 + k(k + 1)/2`, "Hit T(1) = 1; the rest is an arithmetic series."],
        [`= 1 + log₂n (log₂n + 1)/2 ∈ Θ(log² n)`, "Back to n: k = log₂ n."],
      ],
      master: { note: "f(n) = log₂ n is not Θ(nᵈ) for any d, so Levitin's form of the Master Theorem does not apply directly. (log n grows faster than n⁰ but slower than any n^ε; an extended version of the theorem gives Θ(log² n), matching the substitution.)" },
    },
  };

  /** n raised to a power, with a real superscript when the power is a whole number. */
  function powN(e) {
    const r = Math.round(e);
    if (Math.abs(e - r) < 1e-9) return r === 1 ? "n" : "n" + F12.sup(r);
    return "n^" + +e.toPrecision(4);
  }
  /* custom recurrence builder */
  function makeCustom(a, b, d, c) {
    const nd = d === 0 ? "1" : d === 1 ? "n" : `n${sup(d)}`;
    const termJ = (j) => {
      // one term a^j · (n/b^j)^d of the substitution
      const A = Math.pow(a, j), B = Math.pow(b, j);
      if (d === 0) return String(A);
      const coef = A === 1 ? "" : String(A);
      if (j === 0) return nd;
      if (d === 1) return coef ? `${coef}(n/${B})` : `n/${B}`;
      return `${coef}(n/${B})${sup(d)}`;
    };
    const aj = (j) => (Math.pow(a, j) === 1 ? "" : `${Math.pow(a, j)}`);
    const r = a / Math.pow(b, d), lba = Math.log(a) / Math.log(b);
    const rT = +r.toPrecision(4), lbaT = +lba.toPrecision(4);
    let tail, cls, closed, closedText;
    if (Math.abs(r - 1) < 1e-12) {
      tail = `= ${c}·${nd} + ${nd}·log${sub(b)} n`;
      cls = `Θ(${d === 0 ? "" : d === 1 ? "n " : `n${F12.sup(d)} `}log n)`;
      closed = (n) => c * Math.pow(n, d) + Math.pow(n, d) * Math.round(Math.log(n) / Math.log(b));
      closedText = `${c}·nᵈ + nᵈ·log_b n`;
    } else {
      tail = `= ${c}·n${sup("log" + sub(b) + " " + a)} + ${nd}·(r${sup("k")} − 1)/(r − 1), with r${sup("k")} = n${sup("log" + sub(b) + a + " − " + d)}`;
      cls = r < 1 ? `Θ(${d === 0 ? "1" : d === 1 ? "n" : "n" + F12.sup(d)})` : `Θ(${powN(lba)})`;
      closed = (n) => { const k = Math.round(Math.log(n) / Math.log(b)); return c * Math.pow(a, k) + Math.pow(n, d) * (Math.pow(r, k) - 1) / (r - 1); };
      closedText = `c·a^k + nᵈ(rᵏ − 1)/(r − 1)`;
    }
    function sub(x) { return `<sub>${x}</sub>`; }
    const terms = (i) => { const out = []; for (let j = i - 1; j >= 0; j--) out.push(termJ(j)); return out.join(" + "); };
    const Tn = (i) => `${aj(i)}T(n/${Math.pow(b, i)})`;
    return {
      name: `T(n) = ${a === 1 ? "" : a}T(n/${b}) + ${d === 0 ? "1" : d === 1 ? "n" : "n" + F12.sup(d)}, T(1) = ${c}`, kind: "div", a, b, d, sizeMin: 0, sizeMax: Math.max(1, Math.floor(Math.log(Math.min(4096, 400 * b)) / Math.log(b))), sizeDef: Math.min(3, Math.floor(Math.log(300) / Math.log(b))),
      f: (s) => Math.pow(s, d), fText: d === 0 ? "1" : d === 1 ? "n" : "n" + F12.sup(d), baseSize: 1, baseVal: c, T: "T",
      closed, closedText, cls,
      code: [
        "ALGORITHM DivideAndConquer(P, n)",
        "    if n = 1 then",
        `        return SolveDirectly(P)       // T(1) = ${c}`,
        `    split P into ${a} subproblems of size n/${b}`,
        "    for each subproblem Q do",
        `        S[Q] ← DivideAndConquer(Q, n / ${b})   // ${a}·T(n/${b})`,
        `    combine the ${a} answers            // split + combine: ${d === 0 ? "constant" : "n^" + d}`,
        "    return the combined answer",
      ], lines: { base: [1, 2], work: [3, 6], call: [4, 5] },
      deriv: () => [
        [`T(n) = ${Tn(1)} + ${nd}`, `a = ${a} calls on size n/${b}, plus ${nd} local work. Let n = ${b}ᵏ.`],
        [`= ${Tn(2)} + ${terms(2)}`, `Substitute T(n/${b}) = ${a === 1 ? "" : a}T(n/${b * b}) + ${d === 0 ? "1" : d === 1 ? `n/${b}` : `(n/${b})${sup(d)}`}.`],
        [`= ${Tn(3)} + ${terms(3)}`, "Substitute again."],
        [`= a${sup("i")}T(n/b${sup("i")}) + ${nd}·Σ${sub("j=0..i−1")} (a/b${sup("d")})${sup("j")}`, `Pattern after i substitutions. Here r = a/bᵈ = ${a}/${Math.pow(b, d)} = ${rT}.`],
        [`i = k = log${sub(b)} n: = a${sup("k")}·T(1) + ${nd}·Σ${sub("j=0..k−1")} r${sup("j")}, and a${sup("k")} = n${sup("log" + sub(b) + " " + a)} = n${sup(lbaT)}`, "Hit T(1) = c at the leaves."],
        [`${tail} ∈ ${cls}`, r < 1 ? "r < 1: the geometric series is bounded — the root's work dominates." : Math.abs(r - 1) < 1e-12 ? "r = 1: every level costs the same, and there are log_b n of them." : "r > 1: the series grows — the leaves dominate."],
      ],
      master: { a, b, d },
    };
  }

  /* ---------------------------------------------------------------- state */
  let R = P.sum, presetId = "sum", size = 5;
  const code = { obj: null };
  let ctr = null;
  const say = Forge.narrate($("say"));
  const stage = $("stage");
  const narrow = () => (stage.getBoundingClientRect().width || 760) < 560;

  function nFromSize() { return R.kind === "dec" ? size : Math.pow(R.b, size); }
  /** Direct evaluation of the recurrence (the ground truth). */
  function Tdirect(n) {
    const memo = new Map();
    const go = (m) => {
      if (memo.has(m)) return memo.get(m);
      let v;
      if (R.kind === "dec") v = m <= R.baseSize ? R.baseVal : R.a * go(m - 1) + R.f(m);
      else v = m <= 1 ? R.baseVal : R.a * go(m / R.b) + R.f(m);
      memo.set(m, v);
      return v;
    };
    return go(n);
  }
  /** Levels of the recursion tree: [{count, sizeVal, cost, sum, base}] */
  function levels(n) {
    const L = [];
    if (R.kind === "dec") {
      for (let i = 0; ; i++) {
        const s = n - i, count = Math.pow(R.a, i);
        if (s <= R.baseSize) { L.push({ i, count, s, cost: R.baseVal, sum: count * R.baseVal, base: true }); break; }
        L.push({ i, count, s, cost: R.f(s), sum: count * R.f(s) });
      }
    } else {
      for (let i = 0; ; i++) {
        const s = n / Math.pow(R.b, i), count = Math.pow(R.a, i);
        if (s <= 1) { L.push({ i, count, s: 1, cost: R.baseVal, sum: count * R.baseVal, base: true }); break; }
        L.push({ i, count, s, cost: R.f(s), sum: count * R.f(s) });
      }
    }
    return L;
  }

  /* ---------------------------------------------------------------- record */
  function record() {
    const n = nFromSize(), L = levels(n), D = R.deriv(), frames = [];
    let run = 0;
    const T = R.T;
    L.forEach((lv, idx) => {
      run += lv.sum;
      const dRow = Math.min(idx, 3);
      let text;
      if (idx === 0) text = `Start with ${T}(${fmt(n)}). The root call does ${R.fText.replace("n", fmt(n))} = ${fmt(+lv.cost.toPrecision(6))} unit${lv.cost === 1 ? "" : "s"} of its own work before/after its recursive call${R.a > 1 ? "s" : ""}.`;
      else if (lv.base) text = `Level ${idx}: the ${fmt(lv.count)} call${lv.count > 1 ? "s" : ""} of size ${fmt(lv.s)} ${lv.count > 1 ? "are" : "is a"} base case${lv.count > 1 ? "s" : ""}: each costs ${T}(${R.baseSize}) = ${R.baseVal}. Level sum ${fmt(lv.count)} × ${R.baseVal} = ${fmt(lv.sum)}. This is where the substitution "hits the initial condition".`;
      else text = `Level ${idx}: every call on the level above made ${R.a} recursive call${R.a > 1 ? "s" : ""}, so there ${lv.count === 1 ? "is 1 call" : `are ${fmt(lv.count)} calls`} of size ${fmt(+lv.s.toPrecision(6))}, each doing ${fmt(+lv.cost.toPrecision(6))} work. Level sum = ${fmt(+lv.sum.toPrecision(8))}.` + (idx >= 3 ? " The algebra has reached its general pattern: the i-th row is exactly level i." : ` Algebra row ${idx + 1} does the same substitution.`);
      frames.push({ shown: idx + 1, cur: idx, dRow, run, text, line: lv.base ? R.lines.base : idx === 0 ? R.lines.work : R.lines.call.concat(R.lines.work) });
    });
    const total = L.reduce((s, l) => s + l.sum, 0);
    frames.push({ shown: L.length, cur: -1, dRow: 4, run: total, sumCol: true, line: R.lines.base, text: `Add the right-hand column: ${L.map((l) => fmt(+l.sum.toPrecision(6))).join(" + ")} = <b>${fmt(+total.toPrecision(10))}</b>. The substitution's last line with the initial condition is the same sum written in symbols.` });
    const cf = R.closed(n);
    const direct = Tdirect(n);
    frames.push({ shown: L.length, cur: -1, dRow: 5, run: total, sumCol: true, line: [], final: true, text: `Closed form: ${T}(n) = ${R.closedText}, so ${T}(${fmt(n)}) = ${fmt(+cf.toPrecision(10))}. Running the recurrence directly gives ${fmt(+direct.toPrecision(10))} ${Math.abs(cf - direct) < 1e-6 * Math.max(1, Math.abs(direct)) ? "✔ — they agree." : "— they differ!"} Order of growth: <b>${R.cls}</b>.` });
    return { frames, L, n };
  }

  /* ---------------------------------------------------------------- render */
  let cur = null;
  function render(fr) {
    const L = cur.L;
    const W = narrow() ? 470 : 760, rowH = Math.max(46, Math.min(70, 420 / L.length)), H = 28 + L.length * rowH;
    const treeW = W - 220, colX = W - 200;
    stage.setAttribute("viewBox", `0 0 ${W} ${H}`);
    stage.innerHTML = "";
    stage.appendChild(S("text", { x: colX + 90, y: 16, "text-anchor": "middle", "font-size": 11.5, fill: "var(--muted)" }, "calls × work = level sum"));
    const cap = 32;
    const posPrev = [];
    L.slice(0, fr.shown).forEach((lv, i) => {
      const y = 36 + i * rowH;
      const drawn = Math.min(lv.count, cap);
      const R0 = Math.max(7, Math.min(17, (treeW / drawn) * 0.38));
      const xs = [];
      for (let k = 0; k < drawn; k++) xs.push(12 + ((k + 0.5) * treeW) / drawn);
      // edges to parents
      if (i > 0 && posPrev[i - 1]) {
        const pp = posPrev[i - 1];
        xs.forEach((x, k) => {
          const parent = pp.xs[Math.min(pp.xs.length - 1, Math.floor((k * pp.xs.length) / drawn))];
          stage.appendChild(S("line", { x1: parent, y1: pp.y + pp.r, x2: x, y2: y - R0, stroke: "var(--line-2)", "stroke-width": 1.2 }));
        });
      }
      const isCur = i === fr.cur;
      const fill = lv.base ? "var(--c-done)" : isCur ? "var(--c-active)" : "var(--panel-2)";
      const ink = lv.base || isCur ? "#0d1117" : "var(--ink)";
      xs.forEach((x) => {
        stage.appendChild(S("circle", { cx: x, cy: y, r: R0, fill, stroke: lv.base || isCur ? fill : "var(--line-2)", "stroke-width": 1.5 }));
        if (R0 >= 10) stage.appendChild(S("text", { x, y: y + 4, "text-anchor": "middle", "font-size": Math.min(12, R0 * 0.8), "font-weight": 700, fill: ink }, fmt(+lv.s.toPrecision(3))));
        if (R0 >= 12 && drawn <= 16) stage.appendChild(S("text", { x, y: y + R0 + 12, "text-anchor": "middle", "font-size": 10, fill: "var(--ember-2)" }, fmt(+lv.cost.toPrecision(3))));
      });
      if (lv.count > cap) stage.appendChild(S("text", { x: 12 + treeW / 2, y: y + R0 + 13, "text-anchor": "middle", "font-size": 10.5, fill: "var(--muted)" }, `(${cap} of ${fmt(lv.count)} calls drawn)`));
      posPrev[i] = { xs, y, r: R0 };
      // level column
      const sumTxt = `${fmt(lv.count)} × ${fmt(+lv.cost.toPrecision(4))} = ${fmt(+lv.sum.toPrecision(6))}`;
      stage.appendChild(S("rect", { x: colX, y: y - 13, width: 190, height: 26, rx: 7, fill: isCur || fr.sumCol ? "color-mix(in srgb, var(--c-compare) 22%, transparent)" : "var(--panel)", stroke: isCur || fr.sumCol ? "var(--c-compare)" : "var(--line)" }));
      stage.appendChild(S("text", { x: colX + 8, y: y + 4, "font-size": 11.5, fill: "var(--ink)" }, `L${i}: ${sumTxt}`));
    });
    if (fr.sumCol) {
      const y = 36 + L.length * rowH - rowH / 2 + 8;
      const total = L.reduce((s, l) => s + l.sum, 0);
      stage.appendChild(S("text", { x: colX + 8, y: Math.min(H - 4, y), "font-size": 12.5, "font-weight": 700, fill: "var(--ember)" }, `total = ${fmt(+total.toPrecision(10))}`));
    }
    // derivation panel
    document.querySelectorAll("#deriv .dr").forEach((row, k) => {
      row.classList.toggle("hidden", k > fr.dRow);
      row.classList.toggle("cur", k === fr.dRow);
    });
    code.obj.highlight(fr.line);
    const lv = fr.cur >= 0 ? L[fr.cur] : null;
    ctr.set({ n: fmt(cur.n), level: lv ? lv.i : "—", "calls on level": lv ? fmt(lv.count) : "—", "level sum": lv ? fmt(+lv.sum.toPrecision(6)) : "—", "running total": fmt(+fr.run.toPrecision(8)) });
    say.say(fr.text);
  }

  function valuePlot() {
    const pts = [], line = [];
    if (R.kind === "dec") {
      const top = R === P.hanoi ? 12 : 16;
      for (let n = Math.max(1, R.baseSize); n <= top; n++) pts.push([n, Tdirect(n)]);
      for (let n = Math.max(1, R.baseSize); n <= top; n += 0.25) line.push([n, R.closed(n)]);
    } else {
      const kmax = Math.max(3, Math.floor(Math.log(R.b === 2 ? 1024 : 2000) / Math.log(R.b)));
      for (let k = 0; k <= kmax; k++) { const n = Math.pow(R.b, k); pts.push([n, Tdirect(n)]); }
      for (let k = 0; k <= kmax; k++) line.push([Math.pow(R.b, k), R.closed(Math.pow(R.b, k))]);
      // smooth closed form between the powers where it makes sense
      if (R !== P.midterm && R.kind === "div") line.sort((a, b) => a[0] - b[0]);
    }
    const ymax = Math.max(1, ...pts.map((p) => p[1]), ...line.map((p) => p[1]));
    F12.plot($("valPlot"), {
      W: 520, H: 260, m: { l: 62, r: 20, t: 14, b: 40 },
      x: { min: pts[0][0], max: pts[pts.length - 1][0], label: "n", name: "n" },
      y: { min: 0, max: ymax * 1.05, label: `${R.T}(n)` },
      series: [
        { name: "closed form", color: "var(--ember)", pts: line, endLabel: false },
        { name: "recurrence", type: "dots", color: "var(--c-active)", pts, r: 4.5, opacity: 0.95, endLabel: false },
      ],
      note: "● recurrence (dots)   — closed form (line)",
    });
  }

  let player = null;
  function load() {
    $("deriv").innerHTML = R.deriv().map(([eq, note], k) => `<div class="dr"><span class="eq">${k === 0 ? "" : ""}${k + 1}.</span><span>${eq}</span><span class="note">${note}</span></div>`).join("");
    $("code").innerHTML = "";
    code.obj = Forge.code($("code"), R.code);
    if (!ctr) ctr = Forge.counters($("ctr"), { n: 0, level: 0, "calls on level": 0, "level sum": 0, "running total": 0 });
    $("size").min = R.sizeMin; $("size").max = R.sizeMax;
    size = Math.max(R.sizeMin, Math.min(R.sizeMax, size));
    $("size").value = size;
    $("sizeLbl").textContent = R.kind === "dec" ? `n = ${size}` : `k = ${size} (n = ${R.b}${F12.sup(size)} = ${fmt(Math.pow(R.b, size))})`;
    cur = record();
    player.load(cur.frames);
    valuePlot();
    syncMaster();
  }
  player = Forge.player($("player"), { frames: [], render: (f) => { $("predict").innerHTML = ""; render(f); }, fps: 2 });

  $("preset").onchange = (e) => {
    presetId = e.target.value;
    $("ctlPanel").classList.toggle("custom-on", presetId === "custom");
    if (presetId === "custom") R = readCustom(); else R = P[presetId];
    size = R.sizeDef;
    load();
  };
  function readCustom() {
    const a = Math.max(1, Math.min(9, Math.round(+$("ca").value || 1)));
    const b = Math.max(2, Math.min(5, Math.round(+$("cb").value || 2)));
    const d = Math.max(0, Math.min(3, Math.round(+$("cd").value || 0)));
    const c = Math.max(0, Math.min(9, Math.round(+$("cc").value || 0)));
    $("ca").value = a; $("cb").value = b; $("cd").value = d; $("cc").value = c;
    return makeCustom(a, b, d, c);
  }
  $("loadCustom").onclick = () => { R = readCustom(); size = R.sizeDef; load(); };
  $("size").oninput = (e) => { size = +e.target.value; load(); };
  $("rand").onclick = () => {
    const ids = Object.keys(P).concat(["custom"]);
    const id = ids[Math.floor(Math.random() * ids.length)];
    $("preset").value = id;
    if (id === "custom") { $("ca").value = 1 + Math.floor(Math.random() * 4); $("cb").value = 2 + Math.floor(Math.random() * 2); $("cd").value = Math.floor(Math.random() * 3); $("cc").value = Math.floor(Math.random() * 3); }
    $("preset").onchange({ target: $("preset") });
  };

  /* ---------------------------------------------------------------- predict next level cost */
  $("predictBtn").onclick = () => {
    player.pause();
    const i = player.index, frames = player.frames;
    const nxt = frames.findIndex((f, k) => k > i && f.cur >= 0);
    if (nxt < 0) { $("predict").innerHTML = `<div class="callout">The whole tree is drawn. Press ⏮ to start over, or change n.</div>`; return; }
    const lv = cur.L[frames[nxt].cur];
    const ans = +lv.sum.toPrecision(8);
    F12.predict($("predict"), {
      prompt: `Level ${lv.i} will have ${fmt(lv.count)} call${lv.count > 1 ? "s" : ""} of size ${fmt(+lv.s.toPrecision(6))}. What is the level's total cost?`,
      answer: fmt(ans),
      check: (v) => Math.abs(+v - ans) < 1e-6 * Math.max(1, Math.abs(ans)) + 0.01,
      explain: lv.base ? `They are base cases, so each costs ${R.T}(${R.baseSize}) = ${R.baseVal}.` : `${fmt(lv.count)} calls × ${R.fText.replace("n", fmt(+lv.s.toPrecision(6)))} each.`,
      onReveal: () => { const keep = $("predict").innerHTML; player.go(nxt); $("predict").innerHTML = keep; },
    });
  };

  /* ---------------------------------------------------------------- Master Theorem */
  function syncMaster() {
    const m = R.master || {};
    if (m.a != null) { $("ma").value = m.a; $("mb").value = m.b; $("md").value = m.d; }
    mNote = m.note || "";
    askMaster();
  }
  let mNote = "";
  function caseOf(a, b, d) {
    const bd = Math.pow(b, d);
    const lba = Math.log(a) / Math.log(b);
    const nd = d === 0 ? "1" : d === 1 ? "n" : `n${F12.sup(d)}`;
    if (Math.abs(a - bd) < 1e-9) return { k: 2, bd, lba, res: `Θ(${d === 0 ? "" : nd + " "}log n)` };
    if (a < bd) return { k: 1, bd, lba, res: `Θ(${nd})` };
    return { k: 3, bd, lba, res: `Θ(${powN(lba)})` };
  }
  function askMaster() {
    const a = +$("ma").value, b = +$("mb").value, d = +$("md").value;
    $("mOut").innerHTML = mNote ? `<div class="callout">${mNote}</div>` : "";
    if (!(a >= 1 && b >= 2 && d >= 0)) { $("mOut").innerHTML = `<div class="callout bad">Need a ≥ 1, b ≥ 2, d ≥ 0.</div>`; return; }
    const c = caseOf(a, b, d);
    if (mNote) { $("mPredict").innerHTML = `<p class="muted small">Type your own a, b, d and press Classify to use the calculator.</p>`; return; }
    F12.predict($("mPredict"), {
      prompt: `T(n) = ${a}·T(n/${b}) + Θ(n${F12.sup(d)}). Which case? (Here bᵈ = ${b}${F12.sup(d)} = ${+c.bd.toPrecision(6)}.)`,
      choices: ["a < bᵈ", "a = bᵈ", "a > bᵈ"],
      answer: ["a < bᵈ", "a = bᵈ", "a > bᵈ"][c.k - 1],
      explain: "",
      onReveal: () => showMaster(a, b, d, c),
    });
  }
  function showMaster(a, b, d, c) {
    const r = a / c.bd;
    const why = [
      `a = ${a} < bᵈ = ${+c.bd.toPrecision(6)}. Each level of the tree costs r = a/bᵈ = ${+r.toPrecision(4)} times the level above, so the costs shrink geometrically and the <b>root's work f(n) dominates</b>.`,
      `a = ${a} = bᵈ = ${+c.bd.toPrecision(6)}. Every level of the tree costs the same (r = 1), and there are log_b n levels: <b>work per level × number of levels</b>.`,
      `a = ${a} > bᵈ = ${+c.bd.toPrecision(6)}. Level costs grow by r = ${+r.toPrecision(4)} per level, so the <b>leaves dominate</b>: there are a^(log_b n) = n^(log_b a) = ${powN(c.lba)} of them.`,
    ][c.k - 1];
    const cells = [["a < bᵈ", "Θ(nᵈ)", "root-heavy"], ["a = bᵈ", "Θ(nᵈ log n)", "balanced"], ["a > bᵈ", "Θ(n^(log_b a))", "leaf-heavy"]];
    $("mOut").innerHTML = (mNote ? `<div class="callout" style="margin-bottom:8px">${mNote}</div>` : "") +
      `<div class="callout ok"><b>T(n) ∈ ${c.res}</b>. ${why}</div>` +
      `<div class="case-row">${cells.map((x, k) => `<div class="${k === c.k - 1 ? "win" : ""}"><b>${x[0]}</b><br>${x[1]}<br><span class="muted">${x[2]}</span></div>`).join("")}</div>`;
  }
  $("mGo").onclick = () => { mNote = ""; askMaster(); };
  $("mTree").onclick = () => {
    const a = Math.round(+$("ma").value), b = Math.round(+$("mb").value), d = Math.round(+$("md").value);
    $("ca").value = a; $("cb").value = b; $("cd").value = d;
    $("preset").value = "custom";
    $("ctlPanel").classList.add("custom-on");
    presetId = "custom";
    R = readCustom(); size = R.sizeDef; load();
    stage.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  window.addEventListener("resize", () => player.go(player.index));
  load();
})();
