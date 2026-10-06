/* =====================================================================
   Algorithm Forge — Parallel prefix sums / scan (Ch 18)
   Sequential scan vs Hillis–Steele vs Blelloch, drawn as a circuit:
   one row per parallel step, ⊕ nodes = processors. Work/span counters,
   Brent's theorem calculator, and stream compaction / radix split uses.
   ===================================================================== */
(function () {
  "use strict";
  Forge.page({ title: "Parallel Prefix Sums", chapter: "Ch 18 · The Frontier" });
  const $ = (id) => document.getElementById(id);
  const S = (tag, a, ...k) => {
    if (tag === "text" && a && a.fill) { a = Object.assign({}, a); a.style = "fill:" + a.fill; delete a.fill; }
    return Forge.svg(tag, a, ...k);
  };
  const COL = FX.COL;
  const say = Forge.narrate($("say"));
  const codes = FX.codeSwitch($("code"));
  let player = null;
  const pred = FX.predict($("pred"), () => player);
  const ctr = Forge.counters($("ctr"), { "step (span)": 0, "work (⊕ ops)": 0, "processors now": 0, "max processors": 0, "work formula": "–", "span formula": "–" });
  const log2 = (x) => Math.log(x) / Math.LN2;
  const fmt = (v) => (v === Infinity ? "+∞" : v === -Infinity ? "−∞" : String(v));
  const OPS = {
    "+": { f: (a, b) => a + b, id: 0, sym: "+", name: "sum" },
    max: { f: (a, b) => Math.max(a, b), id: -Infinity, sym: "max", name: "running maximum" },
    min: { f: (a, b) => Math.min(a, b), id: Infinity, sym: "min", name: "running minimum" },
  };

  const LINES = {
    seq: [
      "ALGORITHM SequentialScan(A[0..n-1])",
      "    // inclusive scan, one processor",
      "    for i ← 1 to n − 1 do",
      "        A[i] ← A[i − 1] ⊕ A[i]",
      "    return A",
    ],
    hs: [
      "ALGORITHM HillisSteeleScan(A[0..n-1])",
      "    // inclusive scan, up to n processors",
      "    for d ← 0 to ⌈log2 n⌉ − 1 do",
      "        for all i ← 2^d to n−1 in parallel do",
      "            B[i] ← A[i − 2^d] ⊕ A[i]",
      "        for all i ← 0 to 2^d−1 in parallel do",
      "            B[i] ← A[i]",
      "        swap A and B        // double buffer",
      "    return A",
    ],
    bl: [
      "ALGORITHM BlellochScan(A[0..n-1])",
      "    // exclusive scan; n a power of 2. Up-sweep:",
      "    for d ← 0 to log2 n − 1 do",
      "        for all k ← 0 to n−1 by 2^(d+1) in parallel do",
      "            l ← k + 2^d − 1;  r ← k + 2^(d+1) − 1",
      "            A[r] ← A[l] ⊕ A[r]",
      "    A[n − 1] ← identity     // clear the root",
      "    for d ← log2 n − 1 downto 0 do   // down-sweep",
      "        for all k ← 0 to n−1 by 2^(d+1) in parallel do",
      "            l ← k + 2^d − 1;  r ← k + 2^(d+1) − 1",
      "            t ← A[l]",
      "            A[l] ← A[r]",
      "            A[r] ← A[r] ⊕ t",
      "    return A",
    ],
  };

  /** record rows: each row = values after a step + the operations of that step */
  function record(algo, input, opKey) {
    const O = OPS[opKey];
    let A = input.slice();
    let n = A.length, padded = 0;
    if (algo === "bl") {
      let m = 1; while (m < n) m *= 2;
      padded = m - n;
      while (A.length < m) A.push(O.id);
      n = m;
    }
    const rows = [{ vals: A.slice(), ops: [], label: "input", kind: "input" }];
    const lg = Math.ceil(log2(n));
    if (algo === "seq") {
      for (let i = 1; i < n; i++) {
        const prev = A[i];
        A[i] = O.f(A[i - 1], A[i]);
        rows.push({ vals: A.slice(), ops: [{ t: i, srcs: [i - 1, i], kind: "op" }], label: "i=" + i, line: [2, 3],
          text: `Step ${i}: A[${i}] ← A[${i - 1}] ⊕ A[${i}] = ${fmt(A[i - 1])} ${O.sym} ${fmt(prev)} = <b>${fmt(A[i])}</b>. One processor works; any others would sit idle, because step ${i} needs the result of step ${i - 1}.` });
      }
    } else if (algo === "hs") {
      for (let d = 0; d < lg; d++) {
        const off = 1 << d, B = A.slice(), ops = [];
        for (let i = off; i < n; i++) { B[i] = O.f(A[i - off], A[i]); ops.push({ t: i, srcs: [i - off, i], kind: "op" }); }
        A = B;
        rows.push({ vals: A.slice(), ops, label: "d=" + d, line: [2, 3, 4, 5, 6, 7],
          text: `Step d = ${d} (offset 2^${d} = ${off}): every position i ≥ ${off} combines with the value ${off} place${off > 1 ? "s" : ""} to its left, all at once: <b>${ops.length} processors</b>. Now position i holds the ⊕ of the last ${Math.min(2 * off, n)} inputs ending at i${2 * off >= n ? " — that is the whole prefix: done" : ""}.` });
      }
    } else {
      // up-sweep
      for (let d = 0; d < lg; d++) {
        const step = 1 << (d + 1), half = 1 << d, ops = [];
        for (let k = 0; k < n; k += step) {
          const l = k + half - 1, r = k + step - 1;
          A[r] = O.f(A[l], A[r]);
          ops.push({ t: r, srcs: [l, r], kind: "op" });
        }
        rows.push({ vals: A.slice(), ops, label: "up " + d, phase: "up", line: [2, 3, 4, 5],
          text: `Up-sweep d = ${d}: ${ops.length > 1 ? ops.length + " processors each combine" : "1 processor combines"} two subtotals ${half} apart into the right end of ${ops.length > 1 ? "a block" : "the block"} of ${step}. This is a balanced reduction tree, built bottom-up.${d === lg - 1 ? ` The last cell now holds the grand total ${fmt(A[n - 1])}.` : ""}` });
      }
      const total = A[n - 1];
      A[n - 1] = O.id;
      rows.push({ vals: A.slice(), ops: [{ t: n - 1, srcs: [], kind: "clear" }], label: "clear", phase: "clear", line: 6,
        text: `Clear the root: A[${n - 1}] (the total, ${fmt(total)}) becomes the identity ${fmt(O.id)}. From here on, every cell will hold "the ⊕ of everything to my left". Not a ⊕ operation, so it adds no work.` });
      for (let d = lg - 1; d >= 0; d--) {
        const step = 1 << (d + 1), half = 1 << d, ops = [];
        for (let k = 0; k < n; k += step) {
          const l = k + half - 1, r = k + step - 1;
          const t = A[l];
          A[l] = A[r];
          A[r] = O.f(A[r], t);
          ops.push({ t: l, srcs: [r], kind: "copy" });
          ops.push({ t: r, srcs: [r, l], kind: "op" });
        }
        rows.push({ vals: A.slice(), ops, label: "down " + d, phase: "down", line: [7, 8, 9, 10, 11, 12],
          text: `Down-sweep d = ${d}: ${ops.length / 2} processor${ops.length > 2 ? "s" : ""}. In each block, the left child gets the parent's value (purple copy: everything left of the block), and the right child gets parent ⊕ the left child's old subtotal.` });
      }
    }
    return { rows, n, padded, lg, O, input };
  }

  function formulas(algo, n) {
    const lg = Math.ceil(log2(n));
    if (algo === "seq") return { W: n - 1, S: n - 1, wf: `n−1 = ${n - 1}`, sf: `n−1 = ${n - 1}` };
    if (algo === "hs") { let W = 0; for (let d = 0; d < lg; d++) W += n - (1 << d); return { W, S: lg, wf: `Σ(n−2^d) = ${W}`, sf: `⌈log₂n⌉ = ${lg}` }; }
    let m = 1; while (m < n) m *= 2;
    return { W: 2 * (m - 1), S: 2 * log2(m), wf: `2(n−1) = ${2 * (m - 1)}`, sf: `2log₂n = ${2 * log2(m)}` };
  }

  function buildFrames(algo, input, opKey) {
    const R = record(algo, input, opKey);
    const F = formulas(algo, input.length);
    const frames = [];
    let work = 0, maxP = 0, span = 0;
    const O = R.O;
    const inclusiveExpect = (() => { const out = []; let acc = O.id; R.input.forEach((x) => { acc = O.f(acc, x); out.push(acc); }); return out; })();
    frames.push({ R, k: 0, line: 0, ctr: { "step (span)": 0, "work (⊕ ops)": 0, "processors now": 0, "max processors": 0, "work formula": F.wf, "span formula": F.sf },
      text: `Input of n = ${input.length}${R.padded ? `, padded with ${R.padded} identity value${R.padded > 1 ? "s" : ""} (${fmt(O.id)}) up to ${R.n} because Blelloch's tree needs a power of 2` : ""}. Operator ⊕ = ${O.sym}. Each row below will be one parallel step.`,
      ask: algo === "seq" ? { q: `How many steps will the sequential scan need for n = ${input.length}?`, opts: [String(input.length - 1), String(Math.ceil(log2(input.length))), String(input.length)], ans: 0, why: `Position 0 is already done; each of the other n − 1 positions needs one ⊕ with its left neighbour's finished value, one after another: n − 1 = ${input.length - 1} steps.` } : null });
    R.rows.slice(1).forEach((row, j) => {
      const k = j + 1;
      const nOps = row.ops.filter((o) => o.kind === "op").length;
      work += nOps;
      if (row.kind !== "input" && row.phase !== "clear") span++;
      maxP = Math.max(maxP, row.phase === "down" ? row.ops.length / 2 : nOps);
      let ask = null;
      // predictions are attached to the frame BEFORE the step they ask about
      frames.push({ R, k, line: row.line, ctr: { "step (span)": span, "work (⊕ ops)": work, "processors now": row.phase === "down" ? row.ops.length / 2 : nOps, "max processors": maxP, "work formula": F.wf, "span formula": F.sf }, text: row.text, ask });
    });
    // attach asks
    if (algo === "hs" && frames.length > 2) {
      const n = R.n;
      frames[1].ask = { q: `Step d = 1 is next (offset 2). How many ⊕ operations happen in it?`, opts: [String(n - 2), String(n / 2 | 0), String(n - 1)], ans: 0, why: `Every position i ≥ 2 adds the value 2 places to its left: that is n − 2 = ${n - 2} processors. In general step d keeps n − 2^d processors busy, so the total is Σ(n − 2^d) = n log₂ n − (n − 1).` };
    }
    if (algo === "bl") {
      const upEnd = R.lg; // frame index of the last up-sweep row
      const tot = R.rows[upEnd].vals[R.n - 1];
      const a = R.input[R.input.length - 1];
      frames[upEnd - 1].ask = { q: `After the last up-sweep step, what will the last cell hold?`, opts: [fmt(tot), fmt(a), fmt(R.rows[upEnd - 1].vals[R.n - 1])], ans: 0, why: `The up-sweep is a reduction tree: its root, the last cell, ends up with the ⊕ of all n inputs, ${fmt(tot)}. (The other options are the original last input and the half-subtotal from the previous step.)` };
      if (R.lg >= 1) {
        const fin = R.rows[R.rows.length - 1].vals;
        frames[R.rows.length - 2].ask = { q: `The last down-sweep step is next. What will position 1 hold when it finishes (exclusive scan)?`, opts: [fmt(fin[1]), fmt(inclusiveExpect[1]), fmt(O.id)], ans: 0, why: `Exclusive scan: position 1 gets everything strictly to its left, which is just x₀ = ${fmt(R.input[0])}. (${fmt(inclusiveExpect[1])} would be the inclusive answer x₀ ⊕ x₁.)` };
      }
    }
    // final summary frame
    const last = R.rows[R.rows.length - 1].vals.slice(0, input.length);
    const incl = algo !== "bl";
    const ok = incl ? last.every((v, i) => v === inclusiveExpect[i]) : last.every((v, i) => v === (i === 0 ? O.id : inclusiveExpect[i - 1]));
    frames.push(Object.assign({}, frames[frames.length - 1], { final: true, ask: null, line: algo === "seq" ? 4 : algo === "hs" ? 8 : 13,
      text: `Done: the ${incl ? "inclusive" : "exclusive"} ${O.name} ${incl ? "" : "(identity first) "}is ${last.map(fmt).join(", ")}${ok ? " ✓ (checked against a simple loop)" : " ✗ mismatch"}. Work ${work} ⊕ operations, span ${span} steps${algo === "bl" ? " (+1 constant step to clear the root)" : ""}. ${algo === "seq" ? "Minimal work, maximal span." : algo === "hs" ? `Minimal span, but ${(work / Math.max(1, input.length - 1)).toFixed(1)}× the work of the loop.` : `About 2× the loop's work, with logarithmic span: the best of both.`}` }));
    return frames;
  }

  /* ---------------- drawing ---------------- */
  function draw(f) {
    const svg = $("stage");
    const R = f.R, n = R.n, rows = R.rows;
    const compact = (svg.clientWidth || 760) < 560;
    const left = compact ? 50 : 70, right = compact ? 10 : 80;
    const cw = compact ? (n <= 8 ? 42 : n <= 16 ? 26 : 17) : Math.min(64, (760 - left - right) / n);
    const W = compact ? Math.max(340, left + n * cw + right) : 760;
    const ch = 28;
    const rowH = Math.max(compact ? 44 : 46, Math.min(58, 1100 / rows.length));
    const top = 14, H = top + rows.length * rowH + 10;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = "";
    const cx = (i) => left + i * cw + cw / 2;
    const ry = (r) => top + r * rowH + (rowH - ch);  // top of the cell box in row r
    const fs = Math.min(13, cw * 0.36);
    const realN = R.input.length;
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const reached = r <= f.k, cur = r === f.k;
      const written = new Set(row.ops.map((o) => o.t));
      const readSet = new Set(cur ? row.ops.flatMap((o) => o.srcs) : []);
      // wires + ops from row r-1
      if (r > 0) {
        const y0 = ry(r - 1) + ch, y1 = ry(r);
        for (let i = 0; i < n; i++) {
          if (!written.has(i)) svg.appendChild(S("line", { x1: cx(i), y1: y0, x2: cx(i), y2: y1, stroke: "var(--line)", "stroke-width": 1.2, opacity: reached ? 1 : 0.4 }));
        }
        row.ops.forEach((o) => {
          const tx = cx(o.t), ny = y1 - 9;
          const col = !reached ? "var(--line)" : o.kind === "op" ? (cur ? "var(--c-active)" : "var(--line-2)") : (cur ? "var(--c-pivot)" : "var(--line-2)");
          o.srcs.forEach((s) => svg.appendChild(S("line", { x1: cx(s), y1: y0, x2: tx, y2: ny - (o.kind === "op" ? 6 : 0), stroke: col, "stroke-width": cur ? 2 : 1.3, "stroke-dasharray": o.kind === "copy" ? "4 3" : null, opacity: reached ? 1 : 0.5 })));
          if (o.kind === "op") {
            svg.appendChild(S("line", { x1: tx, y1: ny + 6, x2: tx, y2: y1, stroke: col, "stroke-width": cur ? 2 : 1.3, opacity: reached ? 1 : 0.5 }));
            svg.appendChild(S("circle", { cx: tx, cy: ny, r: Math.min(7, cw * 0.3), fill: reached ? (cur ? "var(--c-active)" : "var(--panel-2)") : "var(--bg-2)", stroke: col, "stroke-width": 1.3 }));
            svg.appendChild(S("text", { x: tx, y: ny + 3.5, "text-anchor": "middle", "font-size": Math.min(10, cw * 0.4), "font-weight": 700, fill: cur ? "#0d1117" : "var(--ink-2)", opacity: reached ? 1 : 0.4 }, "⊕"));
          } else if (o.kind === "clear") {
            svg.appendChild(S("line", { x1: tx, y1: y0, x2: tx, y2: y1, stroke: col, "stroke-width": cur ? 2 : 1.3, "stroke-dasharray": "2 3", opacity: reached ? 1 : 0.5 }));
          }
        });
      }
      // cells
      for (let i = 0; i < n; i++) {
        let st = null;
        if (cur && written.has(i)) {
          const o = row.ops.find((q) => q.t === i);
          st = o.kind === "op" ? "swap" : "pivot";
        } else if (cur && readSet.has(i)) st = "compare";
        if (f.final && r === rows.length - 1 && i < realN) st = "done";
        const x = left + i * cw + 1.5, y = ry(r);
        const pad = i >= realN;
        svg.appendChild(S("rect", { x, y, width: cw - 3, height: ch, rx: 5, fill: reached ? (st ? COL[st] : "var(--panel-2)") : "var(--bg-2)", stroke: st ? COL[st] : "var(--line-2)", "stroke-dasharray": pad ? "3 3" : null, opacity: reached ? 1 : 0.45 }));
        if (reached) svg.appendChild(S("text", { x: cx(i), y: y + ch / 2 + fs / 2.8, "text-anchor": "middle", "font-size": fs, "font-weight": 700, fill: st ? "#0d1117" : pad ? "var(--muted)" : "var(--ink)" }, fmt(row.vals[i])));
      }
      // labels
      svg.appendChild(S("text", { x: left - 6, y: ry(r) + ch / 2 + 4, "text-anchor": "end", "font-size": compact ? 9.5 : 11, fill: cur ? "var(--ember-2)" : "var(--muted)", "font-weight": cur ? 700 : 400 }, row.label));
      if (!compact && r > 0) {
        const p = row.phase === "down" ? row.ops.length / 2 : row.ops.filter((o) => o.kind === "op").length;
        svg.appendChild(S("text", { x: W - right + 8, y: ry(r) + ch / 2 + 4, "font-size": 11, fill: cur ? "var(--c-active)" : "var(--muted)", opacity: reached ? 1 : 0.5 }, row.phase === "clear" ? "clear" : `${p} proc`));
      }
    }
    if (!compact) svg.appendChild(S("text", { x: W - right + 8, y: top + 10, "font-size": 10, fill: "var(--muted)" }, "busy"));
  }

  function render(f, i) {
    draw(f);
    const algo = $("algo").value;
    codes.show(algo, LINES[algo]).highlight(f.line);
    ctr.set(f.ctr);
    say.say(f.text);
    const R = f.R;
    $("calc").innerHTML = `n = ${R.input.length}${R.padded ? ` (padded to ${R.n})` : ""} · ⊕ = ${R.O.sym} · row ${f.k} of ${R.rows.length - 1}: ${R.rows[f.k].vals.slice(0, R.n).map(fmt).join(" ")}`;
    pred.update(f, i);
  }
  player = Forge.player($("player"), { frames: [], render, fps: 1.5 });
  let rz = null;
  window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { const f = player.frames[player.index]; if (f) draw(f); }, 150); });

  /* ---------------- controls ---------------- */
  const parse = () => FX.nums($("inp").value).map((x) => Math.round(x)).slice(0, 32);
  /** Strict reading of the input box: returns { arr } or { error }, plus an optional note. */
  function parseStrict(str) {
    const s = String(str).trim().replace(/[\s,;]+$/, "");
    if (!s) return { error: "The input is empty. Type at least 2 numbers separated by commas, e.g. 3, 1, 7, 0." };
    const toks = s.split(/\s*[,;]\s*|\s+/);
    const bad = toks.filter((t) => t !== "" && !Number.isFinite(Number(t)));
    const probs = [];
    if (bad.length) probs.push(`Not a number: ${bad.slice(0, 3).map((t) => `“${t.length > 12 ? t.slice(0, 12) + "…" : t}”`).join(", ")}${bad.length > 3 ? ` and ${bad.length - 3} more` : ""}. Use whole numbers separated by commas.`);
    if (toks.some((t) => t === "")) probs.push("Two commas in a row: there is an empty entry; remove the extra comma or put a number there.");
    if (probs.length) return { error: probs.join(" ") };
    if (toks.length < 2) return { error: "Scan needs at least 2 numbers. Add another value." };
    const notes = [];
    let arr = toks.map(Number);
    if (arr.some((x) => !Number.isInteger(x))) { arr = arr.map((x) => Math.round(x)); notes.push("decimals were rounded to whole numbers"); }
    if (arr.length > 32) { notes.push(`only the first 32 of your ${arr.length} numbers are used`); arr = arr.slice(0, 32); }
    return { arr, note: notes.length ? "Note: " + notes.join("; ") + "." : "" };
  }
  function showInputMsg(msg, isNote) {
    const e = $("inpErr");
    e.textContent = msg || "";
    e.hidden = !msg;
    e.classList.toggle("note", !!isNote);
    $("inp").setAttribute("aria-invalid", msg && !isNote ? "true" : "false");
  }
  function run() {
    const P = parseStrict($("inp").value);
    if (P.error) { showInputMsg(P.error, false); return; }
    showInputMsg(P.note, true);
    const arr = P.arr;
    pred.reset();
    player.load(buildFrames($("algo").value, arr, $("op").value));
    drawUse();
  }
  $("load").onclick = run;
  $("inp").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); run(); } });
  $("algo").onchange = run;
  $("op").onchange = run;
  $("n").oninput = () => ($("nOut").textContent = $("n").value);
  $("rand").onclick = () => { $("inp").value = Forge.randArray(+$("n").value, 0, 9).join(", "); run(); };
  $("example").onclick = () => { $("inp").value = "3, 1, 7, 0, 4, 1, 6, 3"; run(); };

  /* ---------------- Brent calculator ---------------- */
  function brent() {
    const rn = $("bn").value.trim(), rp = $("bp").value.trim();
    const n = Math.max(2, Math.min(2 ** 40, Math.floor(+rn || 2)));
    const p = Math.max(1, Math.floor(+rp || 1));
    // say when a typed value was out of range instead of quietly computing with a different one
    const notes = [];
    if (String(n) !== rn) notes.push(rn === "" || !Number.isFinite(+rn) ? "n is blank, so n = 2 is used" : `n must be a whole number from 2 to 2⁴⁰, so n = ${n.toLocaleString()} is used`);
    if (String(p) !== rp) notes.push(rp === "" || !Number.isFinite(+rp) ? "p is blank, so p = 1 is used" : `p must be a whole number ≥ 1, so p = ${p.toLocaleString()} is used`);
    $("bNote").hidden = !notes.length;
    $("bNote").textContent = notes.length ? "⚠ " + notes.join("; ") + "." : "";
    const algos = [["seq", "Sequential loop"], ["hs", "Hillis–Steele"], ["bl", "Blelloch"]];
    const T = (a, pp) => { const F = formulas(a, n); return a === "seq" ? F.W : F.W / pp + F.S; };
    const seqT = n - 1;
    const num = (v) => (v >= 1e6 ? Math.round(v).toLocaleString() : v >= 100 ? Math.round(v).toLocaleString() : v.toFixed(1));
    $("bTab").innerHTML = `<tr><th class="l">algorithm</th><th>work W</th><th>span S</th><th>T<sub>p</sub> ≤ W/p + S</th><th>speedup vs loop</th><th>processors it can use</th></tr>` +
      algos.map(([a, name]) => {
        const F = formulas(a, n), t = T(a, p);
        const useful = a === "seq" ? "1" : a === "hs" ? `up to n − 1` : `up to n/2`;
        return `<tr><td class="l">${name}</td><td>${F.W.toLocaleString()}</td><td>${F.S.toLocaleString()}</td><td><b>${num(t)}</b></td><td>${(seqT / t).toFixed(1)}×</td><td>${useful}</td></tr>`;
      }).join("") +
      `<tr><td class="l" colspan="6"><span class="small muted">The sequential loop's dependence chain is n − 1 long, so extra processors can't help it: T<sub>p</sub> = n − 1. Brent's bound assumes scheduling is free; real machines add memory and synchronization costs.</span></td></tr>`;
    // chart: T_p vs p, log-log
    const svg = $("bChart");
    const Wd = 720, Hd = 280, L = 70, Rm = 14, Tp = 14, Bm = 40;
    svg.setAttribute("viewBox", `0 0 ${Wd} ${Hd}`); svg.innerHTML = "";
    const pMax = Math.max(4 * n, p * 4), lpMax = Math.ceil(log2(pMax));
    const ps = []; for (let e = 0; e <= lpMax; e += 0.25) ps.push(Math.pow(2, e));
    const ys = algos.flatMap(([a]) => ps.map((q) => T(a, q)));
    const yLo = Math.floor(Math.log10(Math.min(...ys))), yHi = Math.ceil(Math.log10(Math.max(...ys)));
    const X = (q) => L + (log2(q) / lpMax) * (Wd - L - Rm);
    const Y = (v) => Tp + ((yHi - Math.log10(v)) / Math.max(1, yHi - yLo)) * (Hd - Tp - Bm);
    for (let e = yLo; e <= yHi; e++) {
      svg.appendChild(S("line", { x1: L, x2: Wd - Rm, y1: Y(10 ** e), y2: Y(10 ** e), stroke: "var(--line)" }));
      svg.appendChild(S("text", { x: L - 6, y: Y(10 ** e) + 4, "text-anchor": "end", "font-size": 11, fill: "var(--muted)" }, e <= 4 ? String(10 ** e) : "1e" + e));
    }
    const stepE = Math.max(1, Math.ceil(lpMax / 8));
    for (let e = 0; e <= lpMax; e += stepE) svg.appendChild(S("text", { x: X(2 ** e), y: Hd - Bm + 16, "text-anchor": "middle", "font-size": 11, fill: "var(--muted)" }, "2^" + e));
    svg.appendChild(S("text", { x: (L + Wd - Rm) / 2, y: Hd - 6, "text-anchor": "middle", "font-size": 12, fill: "var(--ink-2)" }, "processors p (log) → time bound T_p (log)"));
    [["seq", "var(--muted)"], ["hs", "var(--c-pivot)"], ["bl", "var(--ember)"]].forEach(([a, col]) => {
      svg.appendChild(S("polyline", { points: ps.map((q) => `${X(q)},${Y(T(a, q))}`).join(" "), fill: "none", stroke: col, "stroke-width": 2.5 }));
    });
    svg.appendChild(S("line", { x1: X(p), x2: X(p), y1: Tp, y2: Hd - Bm, stroke: "var(--steel)", "stroke-width": 2, "stroke-dasharray": "5 4" }));
    svg.appendChild(S("text", { x: X(p) + 4, y: Tp + 12, "font-size": 11, fill: "var(--steel)" }, "p = " + p.toLocaleString()));
    svg.appendChild(S("line", { x1: X(n), x2: X(n), y1: Tp, y2: Hd - Bm, stroke: "var(--line-2)", "stroke-width": 1, "stroke-dasharray": "2 4" }));
    svg.appendChild(S("text", { x: X(n) + 4, y: Hd - Bm - 6, "font-size": 10, fill: "var(--muted)" }, "p = n"));
  }
  ["bn", "bp"].forEach((id) => ($(id).oninput = brent));
  $("bGpu").onclick = () => { $("bp").value = 20000; brent(); };
  $("bPn").onclick = () => { $("bp").value = $("bn").value; brent(); };

  /* ---------------- uses: stream compaction / radix split ---------------- */
  function exScan(fl) { const out = []; let s = 0; fl.forEach((v) => { out.push(s); s += v; }); return { out, total: s }; }
  function drawUse() {
    const arr = parse().length >= 2 ? parse() : [3, 1, 7, 0, 4, 1, 6, 3];
    const use = $("use").value;
    $("tWrap").hidden = use !== "compact"; $("bWrap").hidden = use !== "radix";
    const row = (name, vals, cls) => `<tr><th class="l">${name}</th>${vals.map((v, i) => `<td class="${typeof cls === "function" ? cls(i) : cls || ""}">${v}</td>`).join("")}</tr>`;
    const idx = arr.map((_, i) => i);
    let html = row("index i", idx);
    if (use === "compact") {
      const t = +$("thr").value || 0;
      const fl = arr.map((x) => (x > t ? 1 : 0));
      const { out, total } = exScan(fl);
      const res = Array(total);
      arr.forEach((x, i) => { if (fl[i]) res[out[i]] = x; });
      html += row("input x", arr, (i) => (fl[i] ? "k" : ""));
      html += row(`flag (x &gt; ${t})`, fl);
      html += row("exclusive scan of flags", out, (i) => (fl[i] ? "w" : ""));
      html += row("output slot", arr.map((_, i) => (fl[i] ? "→ " + out[i] : "·")));
      html += row("compacted", res.concat(Array(arr.length - total).fill("")));
      $("useNote").innerHTML = `Each kept element writes itself to <b>output[scan[i]]</b>, all in parallel, with no collisions and the original order preserved. Output length = flags total = ${total}. GPUs use this to drop dead particles, culled triangles or finished rays from a work list.`;
    } else {
      const b = Math.max(0, Math.min(9, +$("bit").value || 0));
      const bits = arr.map((x) => (Math.abs(x) >> b) & 1);
      const e = bits.map((v) => 1 - v);
      const { out, total } = exScan(e);
      const dest = arr.map((_, i) => (e[i] ? out[i] : total + (i - out[i])));
      const res = Array(arr.length);
      arr.forEach((x, i) => (res[dest[i]] = x));
      html += row("input x", arr);
      html += row(`bit ${b} of x`, bits);
      html += row("e = NOT bit", e);
      html += row("exclusive scan of e", out, (i) => (e[i] ? "w" : ""));
      html += row("destination", dest, (i) => (e[i] ? "k" : "w"));
      html += row("after split", res);
      $("useNote").innerHTML = `Zeros go to scan[i]; ones go after all ${total} zeros, to ${total} + (i − scan[i]). The split is stable, so applying it for bit 0, 1, 2, … (each time to the previous output) is a Least Significant Digit (LSD) radix sort, the way GPU sorting libraries sort millions of keys. Copy "after split" into the input box and raise b to chain the passes.`;
    }
    $("useTab").innerHTML = html;
  }
  ["use", "thr", "bit"].forEach((id) => ($(id).oninput = drawUse));
  $("use").onchange = drawUse;

  brent();
  run();
})();
