/* Empirical analysis lab (insertion sort key comparisons) — Algorithm Forge, Chapter 2 */
(function () {
  "use strict";
  Forge.page({ title: "Empirical Analysis Lab", chapter: "Ch 2 · Analysis Framework" });
  const $ = (id) => document.getElementById(id);
  const E = Forge.el;
  const fmt = F12.fmt;

  /* ================================================================ Part 1: step through */
  const CODE_OK = [
    "ALGORITHM SortAnalysis(A[0..n-1])",
    "    count ← 0",
    "    for i ← 1 to n - 1 do",
    "        v ← A[i]",
    "        j ← i - 1",
    "        while j ≥ 0 and A[j] > v do",
    "            count ← count + 1      // the test was TRUE",
    "            A[j + 1] ← A[j]",
    "            j ← j - 1",
    "        if j ≥ 0 then",
    "            count ← count + 1      // the FALSE test that ended the loop",
    "        A[j + 1] ← v",
    "    return count",
  ];
  const CODE_BUG = [
    "ALGORITHM SortAnalysis(A[0..n-1])   // as given",
    "    count ← 0",
    "    for i ← 1 to n - 1 do",
    "        v ← A[i]",
    "        j ← i - 1",
    "        while j ≥ 0 and A[j] > v do",
    "            count ← count + 1      // runs only when the test is TRUE",
    "            A[j + 1] ← A[j]",
    "            j ← j - 1",
    "        A[j + 1] ← v",
    "    return count",
  ];
  // logical line -> index in each listing
  const LN = {
    ok: { start: 1, for: 2, v: [3, 4], test: 5, incT: 6, shift: [7, 8], ifj: 9, incF: [9, 10], place: 11, ret: 12 },
    bug: { start: 1, for: 2, v: [3, 4], test: 5, incT: 6, shift: [7, 8], ifj: 5, incF: 5, place: 9, ret: 10 },
  };
  let version = "ok";
  let code = Forge.code($("code"), CODE_OK);
  const ctr = Forge.counters($("ctr"), { "corrected count": 0, "given count": 0, "missed so far": 0, shifts: 0 });
  const say = Forge.narrate($("say"));
  const stage = $("stage");

  function record(input) {
    const A = input.slice(), n = A.length, frames = [];
    let ok = 0, bug = 0, shifts = 0;
    const push = (key, st, text, extra) => frames.push(Object.assign({ A: A.slice(), key, st, text, ok, bug, shifts, missed: ok - bug }, extra || {}));
    push("start", {}, `n = ${n}. The basic operation is the key comparison A[j] > v. Two counters watch the same run: the corrected one and the one from the given code.`);
    for (let i = 1; i < n; i++) {
      const v = A[i];
      let j = i - 1;
      const pre = {};
      for (let k = 0; k < i; k++) pre[k] = "done";
      push("v", Object.assign({}, pre, { [i]: "active" }), `i = ${i}: lift v = A[${i}] = ${v} out and start comparing leftwards from j = ${j}.`, { v, i, j });
      for (;;) {
        if (j < 0) {
          push("test", Object.assign({}, pre), `j = −1: the first half of the test, j ≥ 0, is false, so <b>and</b> short-circuits: A[−1] > v is never evaluated. No key comparison, nothing to count.`, { v, i, j, noCmp: true });
          break;
        }
        ok++;
        const gt = A[j] > v;
        const st = Object.assign({}, pre, { [j]: "compare", [j + 1]: j + 1 === i ? "active" : pre[j + 1] });
        if (gt) {
          bug++;
          push("test", st, `Compare A[${j}] = ${A[j]} > v = ${v}? <b>True</b>. Corrected count → ${ok}; the given code counts it too (the loop body runs) → ${bug}.`, { v, i, j, cmp: true, gt: true });
          A[j + 1] = A[j];
          shifts++;
          push("shift", Object.assign({}, pre, { [j + 1]: "swap" }), `Shift ${A[j]} one place right to make room. j ← ${j - 1}.`, { v, i, j });
          j--;
        } else {
          push("test", st, `Compare A[${j}] = ${A[j]} > v = ${v}? <b>False</b> → the loop stops. That comparison really happened: corrected count → ${ok}. The given code never enters the body, so it <b>misses</b> this one (still ${bug}).`, { v, i, j, cmp: true, gt: false });
          push("incF", st, `The corrected version's extra line: "if j ≥ 0 then count ← count + 1" adds exactly this missed false comparison. Missed by the given code so far: ${ok - bug}.`, { v, i, j });
          break;
        }
      }
      A[j + 1] = v;
      const sorted = {};
      for (let k = 0; k <= i; k++) sorted[k] = "done";
      push("place", Object.assign(sorted, { [j + 1]: "active" }), `Drop v = ${v} into A[${j + 1}]. A[0..${i}] is now sorted.`, { v, i, j: j + 1 });
    }
    const all = {};
    for (let k = 0; k < n; k++) all[k] = "done";
    push("ret", all, `Done. Corrected count = <b>${ok}</b>, given code = <b>${bug}</b>: it missed ${ok - bug}, one for every insertion that stopped with j ≥ 0. (Best case n − 1 = ${n - 1}; worst case n(n−1)/2 = ${(n * (n - 1)) / 2}.)`);
    return frames;
  }
  function render(f) {
    const ptr = [];
    if (f.i != null) ptr.push({ i: f.i, label: "i" });
    if (f.j != null && f.j >= 0 && f.key !== "place") ptr.push({ i: f.j, label: "j", color: "var(--steel)" });
    Forge.bars(stage, f.A, { state: f.st, pointers: ptr, height: 260 });
    if (f.v != null && f.key !== "ret") stage.appendChild(Forge.svg("text", { x: 28, y: 22, "font-size": 15, "font-weight": 700, fill: "var(--ember)" }, `v = ${f.v}`));
    if (f.noCmp) stage.appendChild(Forge.svg("text", { x: 120, y: 22, "font-size": 13, fill: "var(--muted)" }, "j = −1 → no comparison"));
    const L = LN[version][f.key];
    code.highlight(L);
    ctr.set({ "corrected count": f.ok, "given count": f.bug, "missed so far": f.missed, shifts: f.shifts });
    say.say(f.text);
  }
  const player = Forge.player($("player"), { frames: [], render: (f) => { if (!keepP) $("predict").innerHTML = ""; render(f); } });
  let keepP = false;
  function loadArr(arr) { player.load(record(arr)); }
  function parse() {
    const arr = $("inp").value.split(/[\s,]+/).filter(Boolean).map(Number).filter((x) => Number.isFinite(x));
    if (arr.length < 2) { say.say("Type at least two numbers, separated by commas."); return; }
    loadArr(arr.slice(0, 20));
  }
  $("load").onclick = parse;
  $("rand").onclick = () => { const a = Forge.randArray(6 + Math.floor(Math.random() * 5), 1, 60); $("inp").value = a.join(", "); loadArr(a); };
  $("sorted").onclick = () => { const a = [10, 20, 30, 40, 50, 60]; $("inp").value = a.join(", "); loadArr(a); };
  $("reversed").onclick = () => { const a = [60, 50, 40, 30, 20, 10]; $("inp").value = a.join(", "); loadArr(a); };
  function setVersion(v) {
    version = v;
    $("vCorrect").classList.toggle("on", v === "ok");
    $("vBuggy").classList.toggle("on", v === "bug");
    $("code").innerHTML = "";
    code = Forge.code($("code"), v === "ok" ? CODE_OK : CODE_BUG);
    player.go(player.index);
  }
  $("vCorrect").onclick = () => setVersion("ok");
  $("vBuggy").onclick = () => setVersion("bug");
  $("predictBtn").onclick = () => {
    player.pause();
    const fr = player.frames, i = player.index;
    const k = fr.findIndex((f, x) => x > i && f.cmp);
    if (k < 0) { $("predict").innerHTML = `<div class="callout">No comparisons left. Load another array.</div>`; return; }
    const f = fr[k];
    const prev = fr[k - 1];
    F12.predict($("predict"), {
      prompt: `Next, the test compares A[${f.j}] = ${prev.A[f.j]} with v = ${f.v}. Will the <b>given</b> (buggy) counter count this comparison?`,
      choices: ["yes", "no"],
      answer: f.gt ? "yes" : "no",
      explain: f.gt ? `${prev.A[f.j]} > ${f.v} is true, so the loop body runs and the given counter increments.` : `${prev.A[f.j]} > ${f.v} is false, so the loop ends without running its body: the given code misses it.`,
      onReveal: () => { keepP = true; player.go(k); keepP = false; },
    });
  };
  loadArr([5, 2, 4, 6, 1, 3]);

  /* ================================================================ Part 2: experiment */
  function makeArray(n, kind, rnd) {
    const a = new Int32Array(n);
    if (kind === "sorted") { for (let k = 0; k < n; k++) a[k] = k * 3; }
    else if (kind === "reversed") { for (let k = 0; k < n; k++) a[k] = (n - k) * 3; }
    else {
      for (let k = 0; k < n; k++) a[k] = Math.floor(rnd() * 2147483647);
      if (kind === "nearly") {
        a.sort();
        const swaps = Math.max(1, Math.floor(n / 100));
        for (let s = 0; s < swaps; s++) { const x = Math.floor(rnd() * n), y = Math.floor(rnd() * n); const t = a[x]; a[x] = a[y]; a[y] = t; }
      }
    }
    return a;
  }
  /** Insertion sort with BOTH counters: returns {ok, bug}. ok counts every evaluation of A[j] > v. */
  function countSort(A) {
    const n = A.length;
    let ok = 0, bug = 0;
    for (let i = 1; i < n; i++) {
      const v = A[i];
      let j = i - 1;
      while (j >= 0) {
        ok++;                         // A[j] > v is evaluated now: count it, true or false
        if (A[j] > v) { bug++; A[j + 1] = A[j]; j--; }
        else break;
      }
      A[j + 1] = v;
    }
    return { ok, bug };
  }
  function plainSort(A) {
    const n = A.length;
    for (let i = 1; i < n; i++) {
      const v = A[i];
      let j = i - 1;
      while (j >= 0 && A[j] > v) { A[j + 1] = A[j]; j--; }
      A[j + 1] = v;
    }
  }
  const H = (n) => { let s = 0; for (let k = 1; k <= n; k++) s += 1 / k; return s; };
  const theory = (n) => (n * (n - 1)) / 4 + (n - 1) - (H(n) - 1);

  let runs = [], running = false, stopFlag = false, cfg = null;
  const fitC = (pts) => { let a = 0, b = 0; pts.forEach(([n, c]) => { a += c * n * n; b += n * n * n * n; }); return b ? a / b : 0; };

  function drawPlots() {
    if (!runs.length) return;
    const nMin = Math.min(...runs.map((r) => r.n)), nMax = Math.max(...runs.map((r) => r.n));
    const x = { min: 0, max: nMax * 1.03, label: "input size n", name: "n", tipFmt: fmt };
    const curve = (fn) => { const out = []; for (let k = 0; k <= 60; k++) { const n = (nMax * 1.03 * k) / 60; out.push([n, fn(n)]); } return out; };
    const cOk = fitC(runs.map((r) => [r.n, r.ok])), cBug = fitC(runs.map((r) => [r.n, r.bug]));
    const hyp = cfg.kind === "reversed" ? { name: "n²/2", f: (n) => (n * n) / 2 } : cfg.kind === "sorted" ? { name: "n − 1", f: (n) => n - 1 } : { name: "n²/4", f: (n) => (n * n) / 4 };
    const ymax = Math.max(...runs.map((r) => r.ok), hyp.f(nMax)) * 1.08 || 1;
    const common = { W: 560, H: 300, m: { l: 58, r: 16, t: 16, b: 42 } };
    F12.plot($("pCmp"), Object.assign({}, common, {
      x, y: { min: 0, max: ymax, label: "comparisons" },
      series: [
        { name: `fit ${+cOk.toPrecision(4)}·n²`, color: "var(--ember)", pts: curve((n) => cOk * n * n) },
        { name: hyp.name, color: "var(--c-done)", dash: "6 5", pts: curve(hyp.f) },
        { name: "run", type: "dots", color: "var(--c-active)", pts: runs.map((r) => [r.n, r.ok]), endLabel: false },
      ], note: "● one dot per array",
    }));
    F12.plot($("pBug"), Object.assign({}, common, {
      x, y: { min: 0, max: ymax, label: "comparisons (as counted)" },
      series: [
        { name: `fit ${+cBug.toPrecision(4)}·n²`, color: "var(--ember)", pts: curve((n) => cBug * n * n) },
        { name: hyp.name, color: "var(--c-done)", dash: "6 5", pts: curve(hyp.f) },
        { name: "buggy count", type: "dots", color: "var(--c-swap)", pts: runs.map((r) => [r.n, r.bug]), endLabel: false },
      ], note: "● buggy counter, same arrays",
    }));
    const tPts = runs.map((r) => [r.n, r.ms]);
    const cT = fitC(tPts);
    const tmax = Math.max(...tPts.map((p) => p[1]), cT * nMax * nMax) * 1.1 || 1;
    F12.plot($("pTime"), Object.assign({}, common, {
      x, y: { min: 0, max: tmax, label: "time (ms)", fmt: (v) => +v.toPrecision(3) + "", tipFmt: (v) => v.toFixed(3) + " ms" },
      series: [
        { name: `fit ${fmt(+cT.toPrecision(3))}·n² ms`, color: "var(--ember)", pts: curve((n) => cT * n * n) },
        { name: "run", type: "dots", color: "var(--c-pivot)", pts: tPts, endLabel: false },
      ], note: "● one timed run per array",
    }));
    const rPts = runs.map((r) => [r.n, r.ok / (r.n * r.n)]);
    const rv = rPts.map((p) => p[1]);
    const rlo = Math.min(...rv, cfg.kind === "random" ? 0.25 : Infinity), rhi = Math.max(...rv, cfg.kind === "random" ? 0.25 : -Infinity);
    const pad = Math.max((rhi - rlo) * 0.3, rhi * 0.01, 1e-6);
    F12.plot($("pRatio"), Object.assign({}, common, {
      x: { min: Math.max(0, nMin - (nMax - nMin) * 0.05 - 1), max: nMax * 1.03, label: "input size n", name: "n", tipFmt: fmt },
      y: { min: Math.max(0, rlo - pad), max: rhi + pad, label: "C(n) / n²", fmt: (v) => +v.toPrecision(4) + "", tipFmt: (v) => v.toFixed(5) },
      series: [{ name: "C/n²", type: "dots", color: "var(--c-active)", pts: rPts, endLabel: false }],
      hlines: cfg.kind === "random" ? [{ y: 0.25, color: "var(--c-done)", label: "1/4" }] : cfg.kind === "reversed" ? [{ y: 0.5, color: "var(--c-done)", label: "1/2" }] : [],
    }));
    return { cOk, cBug, cT };
  }

  function table() {
    const bySize = new Map();
    runs.forEach((r) => { if (!bySize.has(r.n)) bySize.set(r.n, []); bySize.get(r.n).push(r); });
    const t = $("tbl");
    t.innerHTML = "";
    const rnd = cfg.kind === "random";
    const cols = [
      { h: "n", f: (n) => fmt(n) },
      { h: "runs", f: (n, rs) => rs.length },
      { h: "mean C(n)", f: (n, rs, m) => fmt(+m((r) => r.ok).toFixed(1)) },
      rnd ? { h: "theory E[C(n)]", f: (n) => fmt(+theory(n).toFixed(1)) } : null,
      { h: "mean C / n²", f: (n, rs, m) => m((r) => r.ok / (n * n)).toFixed(5) },
      { h: "mean given count", bug: true, f: (n, rs, m) => fmt(+m((r) => r.bug).toFixed(1)) },
      { h: "missed (≈ n − ln n)", bug: true, f: (n, rs, m) => fmt(+m((r) => r.ok - r.bug).toFixed(1)) },
      { h: "median ms", f: (n, rs) => { const ms = rs.map((r) => r.ms).sort((a, b) => a - b); const med = ms.length % 2 ? ms[(ms.length - 1) / 2] : (ms[ms.length / 2 - 1] + ms[ms.length / 2]) / 2; return med.toFixed(3); } },
    ].filter(Boolean);
    t.appendChild(E("tr", null, cols.map((c) => E("th", { class: c.bug ? "buggy-only" : "" }, c.h))));
    [...bySize.keys()].sort((a, b) => a - b).forEach((n) => {
      const rs = bySize.get(n), m = (f) => rs.reduce((s2, r) => s2 + f(r), 0) / rs.length;
      t.appendChild(E("tr", null, cols.map((c) => E("td", { class: c.bug ? "buggy-only" : "" }, String(c.f(n, rs, m))))));
    });
  }

  function stats(fit) {
    const pred = fit.cOk * 1e8;
    const rnd = cfg.kind === "random";
    const box = (k, v, sub) => E("div", { class: "stat" }, E("div", { class: "k" }, k), E("div", { class: "big" }, v), sub ? E("div", { class: "muted small" }, sub) : null);
    $("stats").innerHTML = "";
    $("stats").append(
      box("fitted c (comparisons)", (+fit.cOk.toPrecision(5)).toString(), rnd ? `theory: 0.25 · off by ${(((fit.cOk - 0.25) / 0.25) * 100).toFixed(2)}%` : "compare with the input's own formula"),
      box("fit predicts C(10,000)", fmt(Math.round(pred)), "c · 10,000²"),
      box("theory E[C(10,000)]", rnd ? fmt(Math.round(theory(10000))) : "—", rnd ? "n(n−1)/4 + (n−1) − (H₁₀₀₀₀ − 1)" : "random inputs only"),
      box("time fit predicts", (fit.cT * 1e8).toFixed(2) + " ms", "for n = 10,000 on this machine"),
    );
    if (!pred10kShown) {
      pred10kShown = true;
      F12.predict($("predict10k"), {
        prompt: "Before measuring: what mean number of comparisons do <b>you</b> predict for n = 10,000? (Type a number; within 1% counts.)",
        answer: fmt(Math.round(rnd ? theory(10000) : pred)),
        check: (v) => Math.abs(+v - (rnd ? theory(10000) : pred)) <= 0.01 * (rnd ? theory(10000) : pred),
        explain: rnd ? "Theory: n(n−1)/4 + (n − 1) − (Hₙ − 1) ≈ 25,007,490. Now press Measure and see how a real sample wobbles around it." : "That is what your fit says. Now measure.",
        onReveal: (right) => { myGuess = true; void right; },
      });
    }
  }
  let pred10kShown = false, myGuess = false;

  function readCfg() {
    const from = Math.max(10, Math.floor(+$("nFrom").value)), step = Math.max(10, Math.floor(+$("nStep").value)), to = Math.min(20000, Math.floor(+$("nTo").value));
    const sizes = [];
    for (let n = from; n <= to && sizes.length < 60; n += step) sizes.push(n);
    return { sizes, trials: +$("trials").value, kind: $("kind").value, seed: Math.floor(+$("seed").value) || 1 };
  }
  function setBusy(b) { running = b; $("run").disabled = b; $("stop").disabled = !b; $("measure10k").disabled = b || !runs.length; }

  /** Run jobs in small chunks (≈ 25 ms each) so the page stays responsive. */
  function runJobs(jobs, onRun, onDone) {
    let k = 0;
    const rnd = Forge.rng(cfg.seed);
    stopFlag = false;
    setBusy(true);
    const tick = () => {
      if (stopFlag) { setBusy(false); $("status").textContent = `stopped after ${k} of ${jobs.length} runs`; onDone(); return; }
      const t0 = performance.now();
      while (k < jobs.length && performance.now() - t0 < 25) {
        const n = jobs[k];
        const a = makeArray(n, cfg.kind, rnd);
        const b = a.slice(), c = a.slice();
        const { ok, bug } = countSort(a);
        let best = Infinity;
        for (let rep = 0; rep < 2; rep++) { const d = rep ? c : b; const s = performance.now(); plainSort(d); best = Math.min(best, performance.now() - s); }
        onRun({ n, ok, bug, ms: best });
        k++;
      }
      $("bar").style.width = ((100 * k) / jobs.length).toFixed(1) + "%";
      $("status").textContent = `${k} / ${jobs.length} runs`;
      if (k % 12 === 0 || k === jobs.length) onDone(true);
      if (k < jobs.length) setTimeout(tick, 0);
      else { setBusy(false); onDone(); }
    };
    setTimeout(tick, 0);
  }

  $("run").onclick = () => {
    if (running) return;
    cfg = readCfg();
    runs = [];
    pred10kShown = false; myGuess = false;
    $("predict10k").innerHTML = ""; $("m10kOut").textContent = "";
    const jobs = [];
    cfg.sizes.forEach((n) => { for (let t = 0; t < cfg.trials; t++) jobs.push(n); });
    runJobs(jobs, (r) => runs.push(r), (partial) => {
      const fit = drawPlots();
      if (fit) { table(); if (!partial) stats(fit); }
    });
  };
  $("stop").onclick = () => { stopFlag = true; };
  $("showBuggy").onchange = (e) => { document.body.classList.toggle("show-buggy", e.target.checked); drawPlots(); };
  $("measure10k").onclick = () => {
    if (running || !runs.length) return;
    const got = [];
    const save = cfg;
    cfg = Object.assign({}, cfg, { seed: cfg.seed + 10000 });
    let reported = false;
    runJobs([10000, 10000, 10000, 10000, 10000], (r) => got.push(r), (partial) => {
      if ((partial && got.length < 5) || reported) return;
      reported = true;
      cfg = save;
      if (got.length < 1) return;
      const mean = got.reduce((s, r) => s + r.ok, 0) / got.length, mb = got.reduce((s, r) => s + r.bug, 0) / got.length;
      const ms = got.map((r) => r.ms).sort((a, b) => a - b)[Math.floor(got.length / 2)];
      const pred = fitC(runs.map((r) => [r.n, r.ok])) * 1e8;
      const th = theory(10000);
      $("m10kOut").innerHTML = `Measured mean over ${got.length} arrays: <b>${fmt(Math.round(mean))}</b> comparisons (fit predicted ${fmt(Math.round(pred))}, off by ${(((mean - pred) / pred) * 100).toFixed(2)}%` +
        (cfg.kind === "random" ? `; theory ${fmt(Math.round(th))}, off by ${(((mean - th) / th) * 100).toFixed(2)}%` : "") + `). Buggy counter: ${fmt(Math.round(mb))}. Median time ${ms.toFixed(2)} ms.` + (myGuess ? "" : " (Tip: make your own prediction above first next time!)");
      setBusy(false);
    });
  };

  // a default run so the plots are never empty
  $("run").onclick();
})();
