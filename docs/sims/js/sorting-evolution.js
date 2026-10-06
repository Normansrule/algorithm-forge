/* Algorithm Forge — Sorting evolution (UI). Algorithms live in sorting-evolution-core.js. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const E = Forge.el, S = Forge.svg, SC = window.SortCore;
  Forge.page({ title: "Sorting Evolution", chapter: "Ch 18 · The Frontier" });

  const DEMO = [27, 26, 25, 24, 23, 22, 21, 16, 15, 14, 13, 12, 11, 20, 19, 18, 17, 3, 2, 1, 35, 36, 10, 9, 8, 7, 6, 5, 4, 34, 33, 32, 31, 30, 29, 28];
  const RUNCOL = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s6)"];
  const COL = { compare: "var(--c-compare)", swap: "var(--c-swap)", done: "var(--c-done)", active: "var(--c-active)", pivot: "var(--c-pivot)", dim: "var(--c-dim)" };

  const LINES = {
    tim: [
      "ALGORITHM Timsort(A[0..n-1])",
      "    minrun ← MinRun(n)        // n < 64: minrun = n; else 32..64",
      "    stack ← empty stack of runs; lo ← 0",
      "    while lo < n do",
      "        run ← CountRun(A, lo)  // ascending, or strictly descending",
      "        if run is descending then reverse run",
      "        if length(run) < minrun then",
      "            BinaryInsertionSort to extend run to minrun",
      "        push run onto stack",
      "        MergeCollapse(stack)  // until |X| > |Y| + |Z| and |Y| > |Z|",
      "        lo ← lo + length(run)",
      "    merge the remaining runs, top first",
      "    return A",
      "",
      "ALGORITHM MergeRuns(L, R)     // merge with galloping",
      "    skip the prefix of L that is ≤ first(R)",
      "    skip the suffix of R that is ≥ last(L)",
      "    copy the shorter run to temp; merge one by one",
      "    if one side wins minGallop times in a row then",
      "        gallop: probe 1, 3, 7, 15, … then binary search",
      "        move the whole winning block at once",
    ],
    power: [
      "ALGORITHM Powersort(A[0..n-1])  // Timsort's machinery, new merge rule",
      "    minrun ← MinRun(n)        // n < 64: minrun = n; else 32..64",
      "    stack ← empty stack of runs; lo ← 0",
      "    while lo < n do",
      "        run ← CountRun(A, lo)  // ascending, or strictly descending",
      "        if run is descending then reverse run",
      "        if length(run) < minrun then",
      "            BinaryInsertionSort to extend run to minrun",
      "        P ← NodePower(top run, run, n)  // no key comparisons",
      "        while power of the boundary under the top > P do merge top two",
      "        top.power ← P; push run; lo ← lo + length(run)",
      "    merge the remaining runs, top first",
      "    return A",
      "",
      "ALGORITHM MergeRuns(L, R)     // merge with galloping (as in Timsort)",
      "    skip the prefix of L that is ≤ first(R)",
      "    skip the suffix of R that is ≥ last(L)",
      "    copy the shorter run to temp; merge one by one",
      "    if one side wins minGallop times in a row then",
      "        gallop: probe 1, 3, 7, 15, … then binary search",
      "        move the whole winning block at once",
      "",
      "ALGORITHM NodePower(s1, n1, n2, n)  // runs start at s1 and s1 + n1",
      "    a ← (s1 + n1/2) / n; b ← (s1 + n1 + n2/2) / n  // midpoints in [0, 1]",
      "    return the first binary digit where a and b differ",
    ],
    intro: [
      "ALGORITHM Introsort(A[0..n-1])",
      "    IntroLoop(A[0..n-1], 2⌊log2 n⌋)",
      "",
      "ALGORITHM IntroLoop(A[l..r], depth)",
      "    while r - l + 1 > cutoff do",
      "        if depth = 0 then",
      "            HeapSort(A[l..r]); return  // O(n log n) guaranteed",
      "        depth ← depth - 1",
      "        move median of A[l], A[mid], A[r] to A[l]",
      "        s ← HoarePartition(A[l..r])",
      "        IntroLoop(A[s+1..r], depth)",
      "        r ← s - 1                      // loop on the left part",
      "    InsertionSort(A[l..r])",
    ],
    pdq: [
      "ALGORITHM PdqSort(A[l..r], badAllowed, leftmost)",
      "    while true do",
      "        if r - l + 1 < threshold then InsertionSort(A[l..r]); return",
      "        pivot ← median of 3 (ninther if size > 128), moved to A[l]",
      "        if not leftmost and A[l - 1] = pivot then",
      "            s ← PartitionLeft(A[l..r]); l ← s + 1; continue",
      "        // (keys equal to the previous pivot are now finished)",
      "        s, noSwaps ← PartitionRight(A[l..r])",
      "        if min(s - l, r - s) < size / 8 then   // bad partition",
      "            badAllowed ← badAllowed - 1",
      "            if badAllowed = 0 then HeapSort(A[l..r]); return",
      "            swap elements at the quarter points",
      "        else if noSwaps then",
      "            try PartialInsertionSort on both sides  // ≤ 8 moves",
      "            if both succeed then return   // it was sorted already",
      "        PdqSort(A[l..s-1], badAllowed, leftmost)",
      "        l ← s + 1; leftmost ← false",
    ],
  };

  const st = { mode: "tim", seed: 11, input: DEMO.slice() };
  const stage = $("stage");
  const codeSw = FX.codeSwitch($("code"));
  let code = null, ctr = null;
  const say = Forge.narrate($("say"));
  let player = null;
  const predict = FX.predict($("predictHost"), () => player);

  function cfgFor(algo) {
    const scale = $("scale").value === "lib" ? SC.DEFAULTS : SC.TEACH;
    const key = { tim: "timsort", power: "powersort", intro: "introsort", pdq: "pdqsort" }[algo];
    const c = Object.assign({}, scale[key]);
    if ($("limit").value === "tiny") { if (algo === "intro") c.depthLimit = 2; if (algo === "pdq") c.badLimit = 1; }
    return c;
  }
  const curAlgo = () => (st.mode === "tim" ? $("policy").value : $("algo").value);
  const isRunSort = (a) => a === "tim" || a === "power";

  /* ---------------- record ---------------- */
  function record() {
    const algo = curAlgo(), cfg = cfgFor(algo);
    const A = st.input.slice(), stats = { cmp: 0, wr: 0 }, frames = [];
    const done = new Set();
    let lastDepth = null, lastBad = null;
    const emit = (p) => {
      if (p.depth != null) lastDepth = p.depth; else if (lastDepth != null && !p.final) p = Object.assign({}, p, { depth: lastDepth });
      if (p.bad != null) lastBad = p.bad; else if (lastBad != null && !p.final) p = Object.assign({}, p, { bad: lastBad });
      if (p.doneRange) for (let k = p.doneRange[0]; k < p.doneRange[1]; k++) done.add(k);
      if (p.done1 != null) done.add(p.done1);
      if (frames.length > 4000) return;
      frames.push({
        A: A.slice(), p, done: [...done],
        S: Object.assign({}, stats, { stack: stats.stack ? stats.stack.map((r) => Object.assign({}, r)) : null, tmp: stats.tmp ? { vals: stats.tmp.vals.slice(), from: stats.tmp.from, to: stats.tmp.to, side: stats.tmp.side, origin: stats.tmp.origin } : null }),
      });
    };
    if (algo === "tim") SC.timsort(A, stats, emit, cfg);
    else if (algo === "power") SC.powersort(A, stats, emit, cfg);
    else if (algo === "intro") SC.introsort(A, stats, emit, cfg);
    else SC.pdqsort(A, stats, emit, cfg);
    // note line
    if (isRunSort(algo)) $("cfgNote").textContent = `minrun = ${stats.minrun} (threshold ${cfg.minMerge}${cfg.minMerge !== 64 ? ", real Timsort: 64" : ""}) · minGallop starts at ${cfg.minGallop} · merge cost ${stats.mergeCost}`;
    else if (algo === "intro") $("cfgNote").textContent = `cutoff ${cfg.cutoff}${cfg.cutoff !== 16 ? " (libraries: 16)" : ""} · depth limit ${cfg.depthLimit != null ? cfg.depthLimit + " (forced)" : "2⌊log₂ n⌋ = " + 2 * SC.floorLog2(st.input.length)}`;
    else $("cfgNote").textContent = `insertion threshold ${cfg.insertion}${cfg.insertion !== 24 ? " (real pdqsort: 24)" : ""} · badAllowed ${cfg.badLimit != null ? cfg.badLimit + " (forced)" : "⌊log₂ n⌋ = " + SC.floorLog2(st.input.length)}`;
    return frames;
  }

  /* ---------------- render ---------------- */
  function drawStage(f) {
    const tim = st.mode === "tim";
    const A = f.A, n = A.length, p = f.p;
    const W = 760, H = tim ? 340 : 300, pad = 16;
    const top = 22, base = 232;
    stage.setAttribute("viewBox", `0 0 ${W} ${H}`);
    stage.innerHTML = "";
    const bw = (W - 2 * pad) / n;
    const max = Math.max(1, ...A.map((v) => Math.abs(v)));
    const x = (k) => pad + k * bw;
    const doneSet = new Set(f.done);
    const state = p.state || {};
    // run tints + bands (Timsort)
    if (tim && f.S.stack) {
      f.S.stack.forEach((r) => {
        const c = RUNCOL[(r.id - 1) % 6];
        stage.appendChild(S("rect", { x: x(r.base), y: top - 6, width: r.len * bw, height: base - top + 6, fill: c, opacity: 0.1 }));
        stage.appendChild(S("rect", { x: x(r.base) + 1, y: base + 6, width: Math.max(2, r.len * bw - 2), height: 10, rx: 4, fill: c }));
      });
    }
    // Powersort: each boundary between stacked runs carries its node power
    if (tim && f.S.policy === "powersort") {
      const marks = [];
      (f.S.stack || []).forEach((r, k, arr) => { if (k < arr.length - 1 && r.power != null) marks.push({ at: r.base + r.len, P: r.power, fresh: false }); });
      if (p.power) marks.push({ at: p.power.at, P: p.power.P, fresh: true });
      marks.forEach((m) => {
        const cx = x(m.at);
        stage.appendChild(S("line", { x1: cx, x2: cx, y1: top - 6, y2: base + 18, stroke: m.fresh ? "var(--ember)" : "var(--ink-2)", "stroke-width": m.fresh ? 2 : 1, "stroke-dasharray": "3 3", opacity: m.fresh ? 1 : 0.6 }));
        stage.appendChild(S("circle", { cx, cy: base + 11, r: 8, fill: "var(--panel)", stroke: m.fresh ? "var(--ember)" : "var(--ink-2)", "stroke-width": m.fresh ? 2 : 1 }));
        stage.appendChild(S("text", { x: cx, y: base + 14.5, "text-anchor": "middle", "font-size": 10, "font-weight": 700, fill: m.fresh ? "var(--ember-2)" : "var(--ink)" }, String(m.P)));
      });
    }
    if (tim && p.span && (p.line >= 4 && p.line <= 8)) {
      stage.appendChild(S("rect", { x: x(p.span[0]) + 1, y: base + 4, width: Math.max(2, (p.span[1] - p.span[0]) * bw - 2), height: 14, rx: 4, fill: "none", stroke: "var(--ember)", "stroke-width": 2, "stroke-dasharray": "5 3" }));
    }
    // range bracket (quick modes) / merge span (Timsort)
    const rng = tim ? (p.line >= 9 && p.line <= 20 && p.span ? p.span : null) : p.range;
    if (rng) {
      const x1 = x(rng[0]) + 1, x2 = x(rng[1]) - 1, y = 12;
      stage.appendChild(S("path", { d: `M${x1} ${y + 6} V${y} H${x2} V${y + 6}`, fill: "none", stroke: "var(--ember)", "stroke-width": 2 }));
    }
    A.forEach((v, k) => {
      const h = Math.max(2, ((base - top) * Math.abs(v)) / max);
      let s = state[k];
      if (!s && doneSet.has(k)) s = "done";
      if (!s && !tim && rng && (k < rng[0] || k >= rng[1]) && !doneSet.has(k)) s = "dim";
      if (!s && tim && p.final) s = "done";
      const hole = tim && p.holes && k >= p.holes[0] && k < p.holes[1] && !state[k];
      const fill = hole ? "var(--c-dim)" : COL[s] || "var(--c-bar)";
      stage.appendChild(S("rect", { x: x(k) + bw * 0.1, y: base - h, width: Math.max(1, bw * 0.8), height: h, rx: Math.min(4, bw / 4), fill, opacity: hole ? 0.55 : 1 }));
      if (bw >= 15) stage.appendChild(S("text", { x: x(k) + bw / 2, y: base - h - 4, "text-anchor": "middle", "font-size": Math.min(12, bw * 0.5), fill: "var(--ink-2)" }, String(v)));
    });
    // pointers
    const py = tim ? base + 34 : base + 22;
    (p.ptr || []).forEach((q, idx) => {
      if (q.i == null || q.i < 0 || q.i >= n) return;
      const cx = x(q.i) + bw / 2, col = idx === 0 ? "var(--ember)" : "var(--steel)";
      stage.appendChild(S("path", { d: `M${cx} ${py - 10} l-5 8 h10 z`, fill: col }));
      stage.appendChild(S("text", { x: cx, y: py + 10 + (idx % 2) * 0, "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: col }, q.label));
    });
    // temp buffer
    if (tim && f.S.tmp) {
      const t = f.S.tmp, y0 = 296, hh = 26;
      stage.appendChild(S("text", { x: pad, y: y0 - 6, "font-size": 11, fill: "var(--muted)" }, `temp buffer (copy of the ${t.side === "A" ? "left" : "right"} run)`));
      t.vals.forEach((v, k) => {
        const used = t.side === "A" ? k < t.from : k >= t.to;
        const xx = x(t.origin + k);
        stage.appendChild(S("rect", { x: xx + 1, y: y0, width: Math.max(1, bw - 2), height: hh, rx: 4, fill: used ? "var(--c-dim)" : "var(--c-active)", opacity: used ? 0.45 : 0.9 }));
        if (bw >= 15) stage.appendChild(S("text", { x: xx + bw / 2, y: y0 + 17, "text-anchor": "middle", "font-size": Math.min(12, bw * 0.5), fill: used ? "var(--muted)" : "#0d1117", "font-weight": 700 }, String(v)));
      });
    }
    if (!tim && (p.depth != null || p.bad != null)) {
      stage.appendChild(S("text", { x: W - pad, y: H - 10, "text-anchor": "end", "font-size": 12, fill: "var(--muted)" }, p.depth != null ? `depth budget left: ${p.depth}` : `badAllowed: ${p.bad}`));
    }
  }

  function drawStack(f) {
    const host = $("runstack"), inv = $("inv");
    host.innerHTML = ""; inv.innerHTML = "";
    const stack = f.S.stack || [];
    const n = f.A.length;
    const names = ["Z", "Y", "X"];
    const merging = f.p.merging || [];
    stack.forEach((r, k) => {
      const fromTop = stack.length - 1 - k;
      host.appendChild(E("div", { class: "run" + (merging.includes(k) ? " merging" : "") },
        E("span", { class: "tag" }, names[fromTop] || ""),
        E("span", { class: "bar", style: { width: Math.max(4, (r.len / n) * 62) + "%", background: RUNCOL[(r.id - 1) % 6] } }),
        E("span", null, `${r.len}`), E("span", { class: "muted" }, `[${r.base}..${r.base + r.len - 1}]`)));
    });
    if (!stack.length) host.appendChild(E("span", { class: "small muted" }, "empty"));
    if (f.S.policy === "powersort") {
      // powers sit on the boundaries between stacked runs; the rule keeps them strictly increasing toward the top
      host.querySelectorAll(".run").forEach((row, j) => {
        const r = stack[j];
        if (j < stack.length - 1 && r.power != null) row.appendChild(E("span", { class: "pw", title: "node power of the boundary above this run" }, `↑ power ${r.power}`));
      });
      const P = stack.slice(0, -1).map((r) => r.power).filter((v) => v != null);
      if (P.length >= 1) {
        const ok = P.every((v, j) => j === 0 || P[j - 1] < v);
        inv.appendChild(E("div", null, E("span", { class: ok ? "ok" : "bad" }, ok ? "✓ " : "✗ "), `boundary powers, bottom → top: ${P.join(" < ")}`));
      }
      if (f.p.power) inv.appendChild(E("div", null, `New boundary at index ${f.p.power.at}: power ${f.p.power.P}. Merge while the boundary under the top has a greater power.`));
      if (!P.length && !f.p.power) inv.appendChild(E("div", { class: "muted" }, "Each new run gets a node power for its boundary with the run below; no length rules are checked."));
      return;
    }
    const L = stack.map((r) => r.len), k = L.length;
    if (k >= 2) {
      const ok = L[k - 2] > L[k - 1];
      inv.appendChild(E("div", null, E("span", { class: ok ? "ok" : "bad" }, ok ? "✓ " : "✗ "), `|Y| > |Z|: ${L[k - 2]} > ${L[k - 1]}`));
    }
    if (k >= 3) {
      const ok = L[k - 3] > L[k - 2] + L[k - 1];
      inv.appendChild(E("div", null, E("span", { class: ok ? "ok" : "bad" }, ok ? "✓ " : "✗ "), `|X| > |Y| + |Z|: ${L[k - 3]} > ${L[k - 2]} + ${L[k - 1]}`));
    }
    if (k < 2) inv.appendChild(E("div", { class: "muted" }, "Rules are checked once two or more runs wait on the stack."));
  }

  function setupPanels() {
    const algo = curAlgo();
    code = codeSw.show(algo, LINES[algo]);
    $("ctr").innerHTML = "";
    const init = isRunSort(algo) ? { comparisons: 0, writes: 0, runs: 0, merges: 0, "merge cost": 0, "gallop phases": 0, minGallop: 7 }
      : algo === "intro" ? { comparisons: 0, writes: 0, partitions: 0, "depth left": 0, "heapsort fallbacks": 0 }
        : { comparisons: 0, writes: 0, pivots: 0, "bad partitions": 0, "early exits": 0, "equal-key skips": 0, "heapsort fallbacks": 0 };
    ctr = Forge.counters($("ctr"), init);
    $("stackPanel").hidden = !isRunSort(algo);
    const lg = $("legend");
    lg.innerHTML = "";
    const items = [["var(--c-bar)", "element"], ["var(--c-swap)", "written / swapped"], ["var(--c-done)", "final place"]];
    if (isRunSort(algo)) items.push(["var(--s1)", "a run (colour = which run)"], ["var(--c-active)", "temp buffer"], ["var(--c-dim)", "stale slot (its value is in temp or already moved)"]);
    if (algo === "power") items.push(["var(--ember)", "circled number = node power of a run boundary (orange = just computed)"]);
    else items.push(["var(--c-pivot)", "pivot"], ["var(--c-dim)", "outside the current range"]);
    items.forEach(([c, t]) => lg.appendChild(E("span", null, E("i", { style: { background: c } }), t)));
  }

  function render(f, i) {
    drawStage(f);
    if (st.mode === "tim") drawStack(f);
    const s = f.S, algo = curAlgo();
    code.highlight(algo === "power" && f.p.line === 8 ? [8, 22, 23, 24] : f.p.line);
    if (isRunSort(algo)) ctr.set({ comparisons: s.cmp, writes: s.wr, runs: s.runs || 0, merges: s.merges || 0, "merge cost": s.mergeCost || 0, "gallop phases": s.gallops || 0, minGallop: s.minGallop != null ? s.minGallop : 7 });
    else if (algo === "intro") ctr.set({ comparisons: s.cmp, writes: s.wr, partitions: s.partitions || 0, "depth left": f.p.depth != null ? f.p.depth : (s.depth != null ? s.depth : "–"), "heapsort fallbacks": s.fallbacks || 0 });
    else ctr.set({ comparisons: s.cmp, writes: s.wr, pivots: s.partitions || 0, "bad partitions": s.badPartitions || 0, "early exits": s.earlyExits || 0, "equal-key skips": s.equalSkips || 0, "heapsort fallbacks": s.fallbacks || 0 });
    say.say(f.p.text);
    predict.update(f.p, i);
  }

  player = Forge.player($("player"), { frames: [], render: (f, i) => render(f, i) });

  function reload() {
    setupPanels();
    predict.reset();
    player.load(record());
  }

  /* ---------------- inputs ---------------- */
  function genInput() {
    showInputMsg("");
    const sh = $("shape").value;
    if (sh === "demo") { st.input = DEMO.slice(); $("n").value = DEMO.length; }
    else st.input = SC.makeShape(sh, +$("n").value, st.seed);
    $("nOut").textContent = st.input.length;
    $("inp").value = st.input.join(", ");
  }
  /** Strict reading of the array box: { arr, note } or { error }. */
  function parseStrict(str) {
    const t = String(str).trim().replace(/[\s,;]+$/, "");
    if (!t) return { error: "The array is empty. Type at least 2 numbers separated by commas, e.g. 5, 3, 8, 1." };
    const toks = t.split(/\s*[,;]\s*|\s+/);
    const bad = toks.filter((x) => x !== "" && !Number.isFinite(Number(x)));
    const probs = [];
    if (bad.length) probs.push(`Not a number: ${bad.slice(0, 3).map((x) => `“${x.length > 12 ? x.slice(0, 12) + "…" : x}”`).join(", ")}${bad.length > 3 ? ` and ${bad.length - 3} more` : ""}.`);
    if (toks.some((x) => x === "")) probs.push("Two commas in a row: there is an empty entry; remove the extra comma or put a number there.");
    if (probs.length) return { error: probs.join(" ") + " Nothing was loaded." };
    if (toks.length < 2) return { error: "Sorting needs at least 2 numbers. Add another value." };
    let arr = toks.map(Number), note = "";
    if (arr.length > 64) { note = `Note: only the first 64 of your ${arr.length} numbers were loaded (the stage shows at most 64 bars).`; arr = arr.slice(0, 64); }
    return { arr, note };
  }
  function showInputMsg(msg, isNote) {
    const e = $("inpErr");
    e.textContent = msg || ""; e.hidden = !msg; e.classList.toggle("note", !!isNote);
    $("inp").setAttribute("aria-invalid", msg && !isNote ? "true" : "false");
  }
  $("load").onclick = () => {
    const P = parseStrict($("inp").value);
    if (P.error) { showInputMsg(P.error, false); return; }
    showInputMsg(P.note, true);
    st.input = P.arr; $("nOut").textContent = P.arr.length; reload();
  };
  $("inp").addEventListener("keydown", (e) => { if (e.key === "Enter") $("load").click(); });
  $("shape").onchange = () => { genInput(); reload(); };
  $("n").oninput = () => { $("nOut").textContent = $("n").value; };
  $("n").onchange = () => { if ($("shape").value === "demo") $("shape").value = "random"; genInput(); reload(); };
  $("rand").onclick = () => { st.seed++; if ($("shape").value === "demo") $("shape").value = "random"; genInput(); reload(); };
  ["scale", "algo", "limit", "policy"].forEach((id) => ($(id).onchange = reload));
  function setMode(m) {
    st.mode = m;
    $("modeTim").classList.toggle("on", m === "tim"); $("modeTim").setAttribute("aria-selected", String(m === "tim"));
    $("modeQuick").classList.toggle("on", m !== "tim"); $("modeQuick").setAttribute("aria-selected", String(m !== "tim"));
    $("algoWrap").hidden = m === "tim"; $("limitWrap").hidden = m === "tim"; $("policyWrap").hidden = m !== "tim";
    reload();
  }
  $("modeTim").onclick = () => setMode("tim");
  $("modeQuick").onclick = () => setMode("quick");

  /* ---------------- race ---------------- */
  const SHORT = { insertion: "Insertion", merge: "Mergesort", quick: "Quick (1st)", tim: "Timsort", power: "Powersort", intro: "Introsort", pdq: "pdqsort" };
  const fmt = (v) => v.toLocaleString("en-US");
  const tip = E("div", { class: "tip", hidden: true });
  document.body.appendChild(tip);
  function showTip(ev, html) { tip.hidden = false; tip.innerHTML = html; const x = Math.min(window.innerWidth - tip.offsetWidth - 8, ev.clientX + 14); tip.style.left = x + "px"; tip.style.top = (ev.clientY + 14) + "px"; }
  const hideTip = () => { tip.hidden = true; };

  const lg = $("raceLegend");
  SC.ALGOS.forEach((a, k) => lg.appendChild(E("span", null, E("i", { style: { background: `var(--s${k + 1})` } }), a.label)));

  // predictions
  const RQ = [
    { q: "On <b>Reversed</b> input, which sort needs the fewest comparisons?", opts: ["Insertion sort", "Mergesort", "Timsort", "pdqsort"], ans: 2, why: "A reversed array is one strictly descending run. Timsort detects it with n − 1 comparisons, reverses it in place, and is done. Insertion sort hits its worst case, n(n − 1)/2." },
    { q: "Quicksort with the <b>first element as pivot</b> on <b>Sorted</b> input, n = 1,000: roughly how many comparisons?", opts: ["≈ 1,000", "≈ 10,000", "≈ 500,000"], ans: 2, why: "The pivot is always the smallest element, so each partition peels off just one element: about n²/2 = 500,000 comparisons. Median-of-3 pivots (introsort, pdqsort) avoid this." },
  ];
  (function buildRQ() {
    const host = $("rq");
    host.appendChild(E("div", { class: "panel-title", style: { marginBottom: "6px" } }, "🤔 Predict before you race"));
    RQ.forEach((r) => {
      const res = E("div", { class: "small", style: { marginTop: "6px" } });
      const row = E("div", { class: "row", style: { gap: "6px", marginTop: "6px" } });
      const btns = r.opts.map((o, k) => E("button", { class: "btn sm", onclick: () => { btns.forEach((b, j) => { b.disabled = true; if (j === r.ans) b.classList.add("right"); else if (j === k) b.classList.add("wrong"); }); res.innerHTML = (k === r.ans ? '<b style="color:var(--ok)">Correct.</b> ' : '<b style="color:var(--bad)">Not quite.</b> ') + r.why; } }, o));
      btns.forEach((b) => row.appendChild(b));
      host.appendChild(E("div", { style: { marginBottom: "10px" } }, E("div", { html: r.q }), row, res));
    });
  })();

  function runRace() {
    const n = +$("raceN").value, seed = +$("raceSeed").value || 1;
    $("raceNote").textContent = "Running…";
    setTimeout(() => {
      const t0 = performance.now();
      const rows = SC.race(n, seed);
      $("raceNote").textContent = `Done in ${Math.round(performance.now() - t0)} ms. Every output was checked against a reference sort.`;
      drawRace(rows, n);
    }, 20);
  }
  function drawRace(rows, n) {
    const grid = $("raceGrid");
    grid.innerHTML = "";
    let lo = Infinity, hi = 0;
    rows.forEach((r) => SC.ALGOS.forEach((a) => { lo = Math.min(lo, r.cmp[a.id]); hi = Math.max(hi, r.cmp[a.id]); }));
    const d0 = Math.floor(Math.log10(Math.max(1, lo))), d1 = Math.ceil(Math.log10(hi + 1));
    const W = 300, x0 = 78, x1 = W - 54, rowH = 22, H = SC.ALGOS.length * rowH + 22;
    const sx = (v) => x0 + ((Math.log10(Math.max(1, v)) - d0) / (d1 - d0)) * (x1 - x0);
    rows.forEach((r) => {
      const best = Math.min(...SC.ALGOS.map((a) => r.cmp[a.id]));
      const winners = SC.ALGOS.filter((a) => r.cmp[a.id] === best).map((a) => a.label);
      const svg = S("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": `${r.label}: comparisons per algorithm` });
      for (let d = d0; d <= d1; d++) {
        const gx = sx(Math.pow(10, d));
        svg.appendChild(S("line", { x1: gx, x2: gx, y1: 2, y2: H - 18, stroke: "var(--line)", "stroke-width": 1 }));
        svg.appendChild(S("text", { x: gx, y: H - 5, "text-anchor": "middle", "font-size": 9, fill: "var(--muted)" }, d <= 3 ? String(Math.pow(10, d)) : "1e" + d));
      }
      SC.ALGOS.forEach((a, k) => {
        const v = r.cmp[a.id], y = 4 + k * rowH;
        const g = S("g", { tabindex: 0, "aria-label": `${a.label}: ${fmt(v)} comparisons` });
        g.appendChild(S("rect", { class: "hit", x: 0, y: y - 2, width: W, height: rowH, fill: "transparent" }));
        g.appendChild(S("text", { x: x0 - 6, y: y + 12, "text-anchor": "end", "font-size": 10.5, fill: "var(--ink-2)", "font-weight": v === best ? 700 : 400 }, SHORT[a.id]));
        const w = Math.max(3, sx(v) - x0);
        g.appendChild(S("rect", { class: "mk", x: x0, y: y + 2, width: w, height: rowH - 8, rx: 4, fill: `var(--s${k + 1})` }));
        g.appendChild(S("text", { x: x0 + w + 4, y: y + 12, "font-size": 10, fill: v === best ? "var(--c-done)" : "var(--ink-2)", "font-weight": v === best ? 700 : 400 }, fmt(v)));
        const html = `<b>${fmt(v)}</b> comparisons<br><span class="muted">${a.label} · ${r.label} · n = ${fmt(n)}</span>`;
        g.addEventListener("pointermove", (ev) => showTip(ev, html));
        g.addEventListener("pointerleave", hideTip);
        g.addEventListener("focus", () => { const b = g.getBoundingClientRect(); showTip({ clientX: b.left + 40, clientY: b.top }, html); });
        g.addEventListener("blur", hideTip);
        svg.appendChild(g);
      });
      grid.appendChild(E("div", { class: "race-card" }, E("h3", null, r.label), E("div", { class: "win" }, `Fewest: ${winners.join(" & ")} (${fmt(best)})`), svg));
    });
    // table
    const tb = $("raceTable");
    tb.innerHTML = "";
    const nlogn = Math.round(n * Math.log2(n));
    tb.appendChild(E("tr", null, E("th", null, "Input"), SC.ALGOS.map((a) => E("th", null, a.label)), E("th", null, "n log₂ n")));
    rows.forEach((r) => {
      const best = Math.min(...SC.ALGOS.map((a) => r.cmp[a.id]));
      tb.appendChild(E("tr", null, E("td", null, r.label), SC.ALGOS.map((a) => E("td", { class: r.cmp[a.id] === best ? "best" : "" }, fmt(r.cmp[a.id]))), E("td", { class: "muted" }, fmt(nlogn))));
    });
    // lesson
    const by = Object.fromEntries(rows.map((r) => [r.shape, r.cmp]));
    const ratio = (a, b) => (a / b >= 10 ? Math.round(a / b) + "×" : (a / b).toFixed(1) + "×");
    const L = $("raceLesson");
    L.hidden = false;
    L.innerHTML = `<b>Real data has structure.</b> On <i>Sorted</i> input Timsort needs ${fmt(by.sorted.tim)} comparisons and first-pivot quicksort ${fmt(by.sorted.quick)} (${ratio(by.sorted.quick, by.sorted.tim)} more). ` +
      `On <i>Organ pipe</i> (two runs) Timsort uses ${fmt(by.organ.tim)} vs mergesort's ${fmt(by.organ.merge)}. ` +
      `On <i>Few unique</i>, pdqsort's equal-key trick gives ${fmt(by.few.pdq)} vs introsort's ${fmt(by.few.intro)}. ` +
      `On <i>Uneven runs</i> (four sorted runs of 45%, 38%, 13% and 4% of n) Powersort needs ${fmt(by.uneven.power)} comparisons vs Timsort's ${fmt(by.uneven.tim)}: the classic invariants merge the two big runs early and then drag them through more merges, while Powersort's node powers merge the small runs first. Elsewhere the two usually tie, because the runs are equal-length minrun blocks or there are only one or two of them. ` +
      `On <i>Random</i> data there is nothing to exploit: Timsort (${fmt(by.random.tim)}) is close to mergesort (${fmt(by.random.merge)}) and to n log₂ n = ${fmt(nlogn)}, so the extra checks cost very little. ` +
      `That is why standard libraries ship adaptive hybrids: run-merging sorts for stable sorting (Python's <code>list.sort</code>, which uses Powersort's merge policy since 3.11, and Java's object sort) and pdqsort-style quicksorts for unstable sorting (Go's <code>sort</code> since 1.19; Rust's <code>sort_unstable</code>, whose successor ipnsort grew out of pdqsort).`;
  }
  $("raceGo").onclick = runRace;

  /* ---------------- boot ---------------- */
  genInput();
  setMode("tim");
  $("raceNote").textContent = "Answer the two questions, then press Run the race.";
})();
