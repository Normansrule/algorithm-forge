/* Orders of growth — Algorithm Forge, Chapter 2 */
(function () {
  "use strict";
  Forge.page({ title: "Growth Rates", chapter: "Ch 2 · Analysis Framework" });
  const $ = (id) => document.getElementById(id);
  const E = Forge.el;
  const LN10 = Math.LN10;

  /* log10(n!) — exact sum for small n, Stirling's series for big n */
  const LF = [0];
  for (let k = 1; k <= 2000; k++) LF[k] = LF[k - 1] + Math.log10(k);
  // Lanczos approximation of ln Γ(x), so n! is a smooth curve between whole numbers
  const LZ = [676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  function lnGamma(x) {
    x -= 1;
    let a = 0.99999999999980993;
    const t = x + 7.5;
    for (let i = 0; i < 8; i++) a += LZ[i] / (x + i + 1);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }
  function log10fact(n) {
    if (Number.isInteger(n) && n <= 2000) return LF[Math.max(0, n)];
    if (n <= 2000) return lnGamma(n + 1) / LN10;
    return (n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n) + 1 / (12 * n)) / LN10;
  }
  const lg = Math.log2;

  /* The seven stars of the show. L(n) = log10 f(n). */
  const FNS = [
    { id: "log", name: "log₂ n", color: "var(--c-done)", L: (n) => (n > 1 ? Math.log10(lg(n)) : -Infinity), code: [0, 3] },
    { id: "n", name: "n", color: "var(--steel)", L: (n) => Math.log10(n), code: [4, 6] },
    { id: "nlog", name: "n log₂ n", color: "var(--c-compare)", L: (n) => (n > 1 ? Math.log10(n * lg(n)) : -Infinity), code: [7, 12] },
    { id: "n2", name: "n²", color: "var(--ember)", L: (n) => 2 * Math.log10(n), code: [13, 16] },
    { id: "n3", name: "n³", color: "var(--c-swap)", L: (n) => 3 * Math.log10(n), code: [17, 21] },
    { id: "2n", name: "2ⁿ", color: "var(--c-pivot)", L: (n) => n * Math.log10(2), code: [22, 24] },
    { id: "fact", name: "n!", color: "var(--ink-2)", L: (n) => log10fact(n), code: [25, 27] },
  ];
  const on = { log: true, n: true, nlog: true, n2: true, n3: true, "2n": true, fact: true };
  const POLY = ["log", "n", "nlog", "n2", "n3"];

  const CODE = [
    "// log₂ n — halve the problem until it is size 1",
    "while n > 1 do",
    "    n ← ⌊n / 2⌋",
    "    // e.g. binary search, counting binary digits",
    "// n — touch every element once",
    "for i ← 0 to n - 1 do",
    "    visit(A[i])",
    "// n log₂ n — log₂ n levels, n work per level",
    "ALGORITHM MergeSort(A[0..n-1])",
    "    if n > 1 then",
    "        MergeSort(left half)",
    "        MergeSort(right half)",
    "        Merge(both halves)           // n steps",
    "// n² — every pair",
    "for i ← 0 to n - 2 do",
    "    for j ← i + 1 to n - 1 do",
    "        compare(A[i], A[j])",
    "// n³ — every triple (matrix product)",
    "for i ← 0 to n - 1 do",
    "    for j ← 0 to n - 1 do",
    "        for k ← 0 to n - 1 do",
    "            C[i, j] ← C[i, j] + A[i, k] * B[k, j]",
    "// 2ⁿ — every subset",
    "for each subset S of {1, …, n} do",
    "    check(S)",
    "// n! — every ordering",
    "for each permutation P of A do",
    "    check(P)",
  ];
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, k) => a + k);
  const code = Forge.code($("code"), CODE);
  const ctr = Forge.counters($("ctr"), { n: 1, "n log₂ n": 0, "n²": 1, "2ⁿ": 2, "n!": 1 });
  const say = Forge.narrate($("say"));
  const stage = $("stage");
  const narrow = () => (stage.getBoundingClientRect().width || 760) < 560;

  let axis = "lin", nMax = 30, opsL = 9, pinned = null;

  /* toggles + legend */
  FNS.forEach((f) => {
    const cb = E("input", { type: "checkbox", checked: true, onchange: (e) => { on[f.id] = e.target.checked; rebuild(true); } });
    $("toggles").appendChild(E("label", null, cb, E("i", { style: { background: f.color } }), f.name));
  });
  function drawLegend() {
    $("legend").innerHTML = "";
    FNS.forEach((f) => {
      if (!on[f.id]) return;
      $("legend").appendChild(E("button", { class: pinned === f.id ? "on" : "", title: "Show its loop shape", onclick: () => { pinned = pinned === f.id ? null : f.id; drawLegend(); player.go(player.index); } },
        E("i", { style: { background: f.color } }), f.name));
    });
    $("legend").appendChild(E("span", { class: "muted" }, axis === "log" ? "— dashed: 1 second of work" : ""));
  }

  /* ---------- record: sweep n = 1 … nMax ---------- */
  function events(n) {
    // crossovers that happen between n-1 and n among visible functions
    const out = [];
    if (n < 2) return out;
    const vis = FNS.filter((f) => on[f.id]);
    for (let a = 0; a < vis.length; a++) for (let b = a + 1; b < vis.length; b++) {
      const A = vis[a], B = vis[b];
      const before = A.L(n - 1) - B.L(n - 1), after = A.L(n) - B.L(n);
      if (Number.isFinite(before) && Number.isFinite(after) && Math.sign(before) !== Math.sign(after) && after !== 0) {
        const winner = after > 0 ? A : B, loser = after > 0 ? B : A;
        out.push(`<b>${winner.name}</b> overtakes ${loser.name} here and never looks back.`);
      }
    }
    const budget = opsL; // log10 ops per second
    vis.forEach((f) => { if (f.L(n - 1) <= budget && f.L(n) > budget) out.push(`<b>${f.name}</b> now needs more than one second of work at 10${F12.sup(opsL)} operations/second.`); });
    return out;
  }
  function record() {
    const frames = [];
    for (let n = 1; n <= nMax; n++) {
      const vis = FNS.filter((f) => on[f.id]);
      let top = vis[0];
      vis.forEach((f) => { if (f.L(n) > (top ? top.L(n) : -Infinity)) top = f; });
      const ev = events(n);
      let text = top ? `n = ${n}. The biggest visible function is <b>${top.name}</b> = ${F12.fmtLog10(top.L(n))} operations, about ${F12.durLog10(top.L(n) - opsL)} at 10${F12.sup(opsL)} operations/second.` : `n = ${n}.`;
      if (ev.length) text += " " + ev.join(" ");
      else if (n === 1) text += " At n = 1 everything is tiny (and log₂ 1 = 0), so small inputs tell you nothing about growth.";
      frames.push({ n, top: top && top.id, text, ev: ev.length });
    }
    return frames;
  }

  /* ---------- render ---------- */
  function render(fr) {
    const n = fr.n;
    const vis = FNS.filter((f) => on[f.id]);
    const xs = [];
    const step = nMax <= 60 ? 0.25 : nMax / 240;
    for (let x = 1; x <= nMax + 1e-9; x += step) xs.push(+x.toFixed(4));
    let series, yopt, hl = [];
    if (axis === "lin") {
      const polys = vis.filter((f) => POLY.includes(f.id));
      const ref = polys.length ? polys : vis;
      let ymaxL = Math.max(...ref.map((f) => f.L(nMax)));
      if (!Number.isFinite(ymaxL)) ymaxL = 1;
      const ymax = Math.pow(10, ymaxL) * 1.05;
      series = vis.map((f) => ({ name: f.name, color: f.color, pts: xs.filter((x) => x <= n).map((x) => [x, Math.pow(10, Math.min(300, f.L(x)))]), fmtY: (v) => F12.fmt(v) }));
      yopt = { min: 0, max: ymax, label: "basic operations f(n)" };
    } else {
      const top = Math.max(...vis.map((f) => f.L(nMax)), opsL + 1);
      series = vis.map((f) => ({ name: f.name, color: f.color, pts: xs.filter((x) => x <= n).map((x) => [x, f.L(x)]), fmtY: (v) => F12.fmtLog10(v) }));
      yopt = { min: -0.5, max: Math.ceil(top) + 0.3, label: "basic operations (log scale)", fmt: (v) => "10" + F12.sup(v) };
      const lo = -0.5, hi = Math.ceil(top) + 0.3, span = hi - lo, st = Math.max(1, Math.ceil(span / 8));
      yopt.ticks = range(0, Math.floor(hi)).filter((k) => k % st === 0);
      hl = [{ y: opsL, color: "var(--muted)", label: `1 second at 10${F12.sup(opsL)} ops/s` }];
    }
    const p = F12.plot(stage, {
      W: narrow() ? 480 : 760, H: narrow() ? 440 : 400,
      x: { min: 1, max: nMax, label: "input size n", fmt: (v) => F12.fmt(v) },
      y: yopt,
      series, hlines: hl,
      note: axis === "lin" ? "linear axis: curves that leave the top are off the chart" : "log axis: each grid line is 10 × the one below",
    });
    // current-n marker
    const x = p.sx(n);
    stage.appendChild(Forge.svg("line", { x1: x, x2: x, y1: p.m.t, y2: p.m.t + p.ph, stroke: "var(--ember)", "stroke-width": 1.2, "stroke-dasharray": "2 4", "pointer-events": "none" }));
    // pseudocode: pinned function or the current top one
    const hid = pinned || fr.top;
    const hf = FNS.find((f) => f.id === hid);
    code.highlight(hf ? range(hf.code[0], hf.code[1]) : []);
    const L = (id) => FNS.find((f) => f.id === id).L(n);
    ctr.set({ n, "n log₂ n": F12.fmtLog10(L("nlog")), "n²": F12.fmtLog10(L("n2")), "2ⁿ": F12.fmtLog10(L("2n")), "n!": F12.fmtLog10(L("fact")) });
    say.say(fr.text + (pinned ? ` <span class="muted">(Pseudocode pinned to ${hf.name}; click it again in the legend to unpin.)</span>` : ""));
  }

  const player = Forge.player($("player"), { frames: [], render: (f) => { $("predict").innerHTML = ""; render(f); }, fps: 8 });
  function rebuild(keepEnd) {
    drawLegend();
    player.load(record());
    player.go(keepEnd ? nMax - 1 : nMax - 1);
  }

  $("axLin").onclick = () => { axis = "lin"; $("axLin").classList.add("on"); $("axLog").classList.remove("on"); rebuild(true); };
  $("axLog").onclick = () => { axis = "log"; $("axLog").classList.add("on"); $("axLin").classList.remove("on"); rebuild(true); };
  $("nMax").oninput = (e) => { nMax = +e.target.value; $("nMaxLbl").textContent = nMax; rebuild(true); };
  $("ops").onchange = (e) => { opsL = +e.target.value; $("opsLbl").textContent = "10" + F12.sup(opsL); rebuild(true); timeTable(); };
  $("rand").onclick = () => { nMax = 5 + Math.floor(Math.random() * 120); $("nMax").value = nMax; $("nMaxLbl").textContent = nMax; rebuild(true); };

  /* ---------- predict a crossover ---------- */
  const CROSS = [
    { a: "2n", b: "n3", ans: 10, why: "2⁹ = 512 < 9³ = 729, but 2¹⁰ = 1,024 > 10³ = 1,000." },
    { a: "fact", b: "2n", ans: 4, why: "3! = 6 < 2³ = 8, but 4! = 24 > 2⁴ = 16." },
    { a: "2n", b: "n2", ans: 5, why: "2⁴ = 16 = 4², and from n = 5 on 2ⁿ is bigger (32 > 25). (It was also bigger at n = 1, dipped below at n = 3, and tied at 2 and 4.)" },
    { a: "nlog", b: "n2", ans: "never", why: "n log₂ n / n² = log₂ n / n → 0, so n² always stays ahead for n ≥ 2." },
  ];
  let cIdx = 0;
  $("predictBtn").onclick = () => {
    player.pause();
    const c = CROSS[cIdx++ % CROSS.length];
    const A = FNS.find((f) => f.id === c.a), B = FNS.find((f) => f.id === c.b);
    F12.predict($("predict"), {
      prompt: `From which whole number n on is <b>${A.name}</b> bigger than <b>${B.name}</b> for good? (Type a number, or "never".)`,
      numeric: false,
      answer: c.ans,
      check: (v) => String(v).trim().toLowerCase() === String(c.ans),
      explain: c.why + " Press the button again for another one.",
      onReveal: () => {
        if (typeof c.ans === "number") {
          on[c.a] = on[c.b] = true;
          document.querySelectorAll("#toggles input").forEach((cb, k) => (cb.checked = on[FNS[k].id]));
          if (nMax < c.ans + 5) { nMax = c.ans + 5; $("nMax").value = nMax; $("nMaxLbl").textContent = nMax; }
          const keep = $("predict").innerHTML;
          drawLegend(); player.load(record()); player.go(c.ans - 1);
          $("predict").innerHTML = keep;
        }
      },
    });
  };

  /* ---------- time table ---------- */
  function cls(Ls) { return Ls < 0 ? "t-ok" : Ls < Math.log10(86400) ? "t-warn" : "t-bad"; }
  function timeTable() {
    const ns = [10, 100, 1e3, 1e4, 1e5, 1e6];
    const my = Math.floor(+$("myN").value);
    if (my >= 1 && !ns.includes(my)) ns.push(my);
    ns.sort((a, b) => a - b);
    const t = $("timeTable");
    t.innerHTML = "";
    t.appendChild(E("tr", null, E("th", null, "n"), FNS.map((f) => E("th", null, f.name))));
    ns.forEach((n) => {
      t.appendChild(E("tr", null, E("th", { style: n === my ? { color: "var(--ember)" } : null }, F12.fmt(n)), FNS.map((f) => {
        const Ls = f.L(n) - opsL;
        return E("td", { class: cls(Ls), title: `${F12.fmtLog10(f.L(n))} operations` }, n === 1 && f.id === "log" ? "0" : F12.durLog10(Ls));
      })));
    });
  }
  $("myN").oninput = timeTable;

  /* ---------- doubling explorer ---------- */
  const WORDS = {
    log: (n) => `adds just 1 (log₂ ${2 * n} = log₂ ${n} + 1)`,
    n: () => "exactly 2 ×",
    nlog: () => "a bit more than 2 ×",
    n2: () => "exactly 4 × (2²)",
    n3: () => "exactly 8 × (2³)",
    "2n": (n) => `2${F12.sup(n)} × — the work is squared`,
    fact: () => "astronomically more",
  };
  function dbl() {
    const n = +$("dblN").value;
    $("dblLbl").textContent = n;
    const t = $("dblTable");
    t.innerHTML = "";
    t.appendChild(E("tr", null, E("th", { class: "lft", style: { whiteSpace: "nowrap" } }, "f"), E("th", null, "f(n)"), E("th", null, "f(2n)"), E("th", { class: "lft" }, "f(2n) / f(n)")));
    FNS.forEach((f) => {
      const r = f.L(2 * n) - f.L(n); // log10 ratio
      const w = Math.max(2, Math.min(150, (Math.log10(1 + r) / Math.log10(1 + 400)) * 150));
      t.appendChild(E("tr", null,
        E("td", { class: "lft", style: { whiteSpace: "nowrap" } }, E("i", { style: { display: "inline-block", width: "10px", height: "10px", borderRadius: "3px", background: f.color, marginRight: "6px" } }), f.name),
        E("td", null, F12.fmtLog10(f.L(n))), E("td", null, F12.fmtLog10(f.L(2 * n))),
        E("td", { class: "lft" }, E("div", { class: "bar-cell" }, E("span", { class: "b", style: { width: w + "px", background: f.color } }), E("span", null, (r < 15 ? "× " + F12.fmt(+Math.pow(10, r).toPrecision(4)) : "× " + F12.fmtLog10(r)) + " — " + WORDS[f.id](n))))));
    });
  }
  $("dblN").oninput = dbl;
  F12.predict($("dblPredict"), {
    prompt: "An n³ algorithm takes 1 minute on some input. About how long on an input twice as big?",
    choices: ["2 minutes", "3 minutes", "6 minutes", "8 minutes", "9 minutes"],
    answer: "8 minutes",
    explain: "(2n)³ = 8n³, whatever n is. Only the exponent matters, which is why the order of growth predicts scaling without knowing the machine.",
  });

  /* ---------- limit comparer ---------- */
  // signature: f ~ c · (n^n)^P · (n!)^F · e^(E n) · n^d · (log n)^k
  const LIB = [
    { id: "1", name: "1", sig: { c: 1 }, L: () => 0 },
    { id: "log", name: "log₂ n", sig: { k: 1, c: 1 }, L: (n) => Math.log10(lg(n)) },
    { id: "log2sq", name: "(log₂ n)²", sig: { k: 2, c: 1 }, L: (n) => 2 * Math.log10(lg(n)) },
    { id: "sqrt", name: "√n", sig: { d: 0.5, c: 1 }, L: (n) => 0.5 * Math.log10(n) },
    { id: "n", name: "n", sig: { d: 1, c: 1 }, L: (n) => Math.log10(n) },
    { id: "100n", name: "100n", sig: { d: 1, c: 100 }, L: (n) => 2 + Math.log10(n) },
    { id: "nlog", name: "n log₂ n", sig: { d: 1, k: 1, c: 1 }, L: (n) => Math.log10(n * lg(n)) },
    { id: "half", name: "n(n−1)/2", sig: { d: 2, c: 0.5 }, L: (n) => Math.log10(n) + Math.log10(n - 1) - Math.log10(2) },
    { id: "n2", name: "n²", sig: { d: 2, c: 1 }, L: (n) => 2 * Math.log10(n) },
    { id: "n2log", name: "n² log₂ n", sig: { d: 2, k: 1, c: 1 }, L: (n) => 2 * Math.log10(n) + Math.log10(lg(n)) },
    { id: "tiny3", name: "0.001n³", sig: { d: 3, c: 0.001 }, L: (n) => 3 * Math.log10(n) - 3 },
    { id: "n3", name: "n³", sig: { d: 3, c: 1 }, L: (n) => 3 * Math.log10(n) },
    { id: "2n", name: "2ⁿ", sig: { E: Math.LN2, c: 1 }, L: (n) => n * Math.log10(2) },
    { id: "3n", name: "3ⁿ", sig: { E: Math.log(3), c: 1 }, L: (n) => n * Math.log10(3) },
    { id: "fact", name: "n!", sig: { F: 1, c: 1 }, L: (n) => log10fact(n) },
    { id: "nn", name: "nⁿ", sig: { P: 1, c: 1 }, L: (n) => n * Math.log10(n) },
  ];
  LIB.forEach((f) => { $("fSel").appendChild(E("option", { value: f.id }, f.name)); $("gSel").appendChild(E("option", { value: f.id }, f.name)); });
  $("fSel").value = "half"; $("gSel").value = "n2";

  function compareSig(a, b) {
    for (const key of ["P", "F", "E", "d", "k"]) {
      const x = a[key] || 0, y = b[key] || 0;
      if (Math.abs(x - y) > 1e-12) return { lim: x > y ? "inf" : "zero" };
    }
    return { lim: "const", c: (a.c || 1) / (b.c || 1) };
  }
  function parseCustom(src) {
    const s = src.trim();
    if (!s) return null;
    const stripped = s.replace(/log2|log10|ln|sqrt|exp|fact|log/g, "");
    if (!/^[0-9n+\-*/^().,\s]*$/.test(stripped)) throw new Error("Only n, numbers, + − * / ^ ( ) and log2, ln, log10, sqrt, exp, fact are allowed.");
    const js = s.replace(/\^/g, "**").replace(/(\d)\s*n/g, "$1*n");
    const fn = new Function("n", "log2", "log10", "ln", "log", "sqrt", "exp", "fact", `"use strict"; return (${js});`);
    const fact = (x) => { let r = 1; for (let k = 2; k <= x; k++) { r *= k; if (!Number.isFinite(r)) return Infinity; } return r; };
    const f = (n) => fn(n, Math.log2, Math.log10, Math.log, Math.log2, Math.sqrt, Math.exp, fact);
    f(10);
    return { id: "custom", name: s, custom: true, L: (n) => { const v = f(n); return v > 0 ? Math.log10(v) : v === 0 ? -Infinity : NaN; } };
  }
  let predicted = false, cur = null;
  function limitCompare() {
    let F, G;
    try {
      F = parseCustom($("fCustom").value) || LIB.find((x) => x.id === $("fSel").value);
      G = parseCustom($("gCustom").value) || LIB.find((x) => x.id === $("gSel").value);
    } catch (e) { $("limVerdict").innerHTML = `<span style="color:var(--bad)">${e.message}</span>`; return; }
    const ns = [10, 100, 1e3, 1e4, 1e5, 1e6];
    const rows = ns.map((n) => ({ n, r: F.L(n) - G.L(n) }));
    let verdict;
    if (!F.custom && !G.custom) verdict = compareSig(F.sig, G.sig);
    else {
      const good = rows.filter((r) => Number.isFinite(r.r));
      if (good.length < 3) verdict = { lim: "unknown" };
      else {
        const a = good[good.length - 1].r, b = good[good.length - 2].r;
        const slope = a - b;
        if (Math.abs(slope) < 0.01) verdict = { lim: "const", c: Math.pow(10, a), numeric: true };
        else verdict = { lim: slope > 0 ? "inf" : "zero", numeric: true };
      }
    }
    cur = { F, G, rows, verdict };
    const pts = [];
    for (let e = 0.7; e <= 6.0001; e += 0.05) { const n = Math.pow(10, e); const r = F.L(n) - G.L(n); if (Number.isFinite(r)) pts.push([n, r]); }
    const ys = pts.map((p) => p[1]);
    const lo = Math.floor(Math.min(-1, ...ys)), hi = Math.ceil(Math.max(1, ...ys));
    const tst = Math.max(1, Math.ceil((hi - lo) / 6));
    const yTicks = range(lo, hi).filter((k) => k % tst === 0);
    F12.plot($("limPlot"), {
      W: 520, H: 230, m: { l: 58, r: 16, t: 14, b: 40 },
      x: { min: 5, max: 1e6, log: true, label: "n (log scale)", name: "n" },
      y: { min: lo, max: hi, label: "f(n)/g(n)", fmt: (v) => "10" + F12.sup(v), ticks: yTicks },
      series: [{ name: "f/g", color: "var(--ember)", pts, fmtY: (v) => F12.fmtLog10(v), endLabel: false }],
      hlines: [{ y: 0, color: "var(--muted)", label: "ratio = 1" }],
    });
    const t = $("limTable");
    t.innerHTML = "";
    t.appendChild(E("tr", null, E("th", null, "n"), rows.map((r) => E("th", null, F12.fmt(r.n)))));
    t.appendChild(E("tr", null, E("th", null, "f(n)/g(n)"), rows.map((r) => E("td", null, Number.isFinite(r.r) ? F12.fmtLog10(r.r) : "overflow"))));
    $("limVerdict").innerHTML = "";
    if (!predicted) {
      F12.predict($("limPredict"), {
        prompt: `What is lim<sub>n→∞</sub> f(n)/g(n) for f = <b>${F.name}</b>, g = <b>${G.name}</b>?`,
        choices: ["0", "a positive constant", "∞"],
        answer: { zero: "0", const: "a positive constant", inf: "∞", unknown: "?" }[verdict.lim],
        explain: "",
        onReveal: () => { predicted = true; showVerdict(); },
      });
    } else showVerdict();
  }
  function showVerdict() {
    const { F, G, verdict } = cur;
    const v = verdict;
    let html;
    if (v.lim === "zero") html = `lim = <b>0</b>: ${F.name} grows <b>slower</b> than ${G.name}. So ${F.name} ∈ O(${G.name}), but not Θ.`;
    else if (v.lim === "inf") html = `lim = <b>∞</b>: ${F.name} grows <b>faster</b> than ${G.name}. So ${F.name} ∈ Ω(${G.name}), but not Θ.`;
    else if (v.lim === "const") html = `lim = <b>${F12.fmt(+v.c.toPrecision(4))}</b> (a positive constant): <b>same order of growth</b>. ${F.name} ∈ Θ(${G.name}).`;
    else html = "The numbers overflow before a trend is clear: try a milder custom function.";
    if (v.numeric) html += ` <span class="muted small">(Judged from the numbers up to n = 10⁶, not proved. Use L'Hôpital's rule or Stirling's formula to be sure.)</span>`;
    $("limVerdict").innerHTML = html;
  }
  $("cmpGo").onclick = () => { predicted = false; limitCompare(); };
  $("fSel").onchange = $("gSel").onchange = () => { $("fCustom").value = ""; $("gCustom").value = ""; predicted = false; limitCompare(); };

  window.addEventListener("resize", () => player.go(player.index));
  drawLegend();
  timeTable();
  dbl();
  limitCompare();
  player.load(record());
  setTimeout(() => player.go(nMax - 1), 0);
})();
