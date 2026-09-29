/* Algorithm Forge — P vs NP lab (Levitin §11.3): CNF-SAT brute force vs. certificate checking,
   the complexity-class map and practice question, and the Vertex Cover ⇔ Clique reduction.
   Engine is pure and exported for Node tests; UI runs only in the browser. */
(function () {
  "use strict";

  /* ---------------- CNF parsing & evaluation ---------------- */
  function parseCNF(text) {
    const s = text.replace(/∧/g, "&").replace(/∨/g, "|").replace(/¬/g, "~").replace(/!/g, "~").replace(/\bAND\b/gi, "&").replace(/\bOR\b/gi, "|").replace(/\bNOT\s*/gi, "~");
    const parts = s.split("&").map((c) => c.trim()).filter(Boolean);
    if (!parts.length) throw new Error("type at least one clause, e.g. (A | ~B) & (B | C)");
    const vars = [];
    const clauses = parts.map((p) => {
      const body = p.replace(/^\(+/, "").replace(/\)+$/, "").trim();
      if (!body) throw new Error("empty clause ()");
      return body.split("|").map((l) => {
        const m = l.trim().match(/^(~|-)?\s*([A-Za-z][A-Za-z0-9_]*)$/);
        if (!m) throw new Error(`can't read literal "${l.trim()}" — use A, ~A, x1 …`);
        if (!vars.includes(m[2])) vars.push(m[2]);
        return { v: m[2], neg: !!m[1] };
      });
    });
    vars.sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
    return { vars, clauses };
  }
  /** Evaluate with short-circuiting. Returns {ok, results:[true|false|null], lits:count, failed:index|-1} */
  function evaluate(F, asg) {
    let lits = 0, failed = -1;
    const results = F.clauses.map(() => null);
    for (let c = 0; c < F.clauses.length; c++) {
      let sat = false;
      for (const L of F.clauses[c]) { lits++; if (asg[L.v] !== L.neg) { sat = true; break; } }
      results[c] = sat;
      if (!sat) { failed = c; break; }
    }
    return { ok: failed < 0, results, lits, failed };
  }
  function asgOf(F, k) { const a = {}; const n = F.vars.length; F.vars.forEach((v, i) => (a[v] = !!((k >> (n - 1 - i)) & 1))); return a; }

  function bruteFrames(F, stopFirst) {
    const n = F.vars.length, N = 1 << n;
    const frames = [];
    const ctr = { "assignments tried": 0, "literal checks": 0, satisfying: 0 };
    const status = new Uint8Array(N); // 0 untried, 1 unsat, 2 sat
    const opts = [n, n * n, N, fact(n)].map(String);
    frames.push({ line: 0, k: -1, text: `Brute force: try every assignment of ${n} variable${n > 1 ? "s" : ""} — 2^${n} = ${N} of them — and check each against all ${F.clauses.length} clauses.`, ctr: Object.assign({}, ctr), status: status.slice(), ask: { q: `Worst case: how many assignments must be tried for n = ${n}?`, options: uniq(opts), answer: String(N), explain: `Each variable doubles the count: 2^${n} = ${N}. Add one variable and the work doubles again — exponential time.` } });
    let found = -1;
    for (let k = 0; k < N; k++) {
      const a = asgOf(F, k);
      const r = evaluate(F, a);
      ctr["assignments tried"]++; ctr["literal checks"] += r.lits;
      if (r.ok) { ctr.satisfying++; if (found < 0) found = k; }
      status[k] = r.ok ? 2 : 1;
      frames.push({ line: r.ok ? [2, 5] : [2, 3, 4], k, asg: a, res: r, ctr: Object.assign({}, ctr), status: status.slice(),
        text: `Assignment #${k + 1}: ${bits(F, a)}. ${r.ok ? `<b>All ${F.clauses.length} clauses are true — satisfying!</b>` : `Clause ${r.failed + 1} ${clauseStr(F.clauses[r.failed])} is false, so this assignment fails (stopped after ${r.lits} literal check${r.lits > 1 ? "s" : ""}).`}` });
      if (r.ok && stopFirst) break;
    }
    const tried = ctr["assignments tried"];
    const fa = found >= 0 ? asgOf(F, found) : null;
    frames.push({ line: 6, k: found, asg: fa, res: fa ? evaluate(F, fa) : null, ctr: Object.assign({}, ctr), status: status.slice(), done: true,
      text: ctr.satisfying ? `F is <b>satisfiable</b>. ${stopFirst ? `Found one after ${tried} of ${N} assignments.` : `${ctr.satisfying} of ${N} assignments satisfy it; checking all took ${ctr["literal checks"]} literal checks.`} A lucky guess of assignment #${found + 1} plus one pass of checking would have been enough — that is the “nondeterministic” shortcut.` : `F is <b>unsatisfiable</b>: all ${N} assignments fail. To be sure of “no”, brute force had to try every one.` });
    return frames;
  }
  function verifyFrames(F, a) {
    const frames = [];
    const ctr = { "clauses checked": 0, "literal checks": 0 };
    const whole = evaluate(F, a);
    const k = F.vars.reduce((acc, v) => acc * 2 + (a[v] ? 1 : 0), 0);
    frames.push({ line: 0, k, asg: a, res: { results: F.clauses.map(() => null) }, ctr: Object.assign({}, ctr), verify: true,
      text: `Guess stage: a certificate (one assignment) is handed to us — ${bits(F, a)}. Check stage: one pass over the ${F.clauses.length} clauses.`,
      ask: { q: "Does this certificate satisfy F?", options: ["yes", "no"], answer: whole.ok ? "yes" : "no", explain: whole.ok ? "Every clause has at least one true literal." : `Clause ${whole.failed + 1} ${clauseStr(F.clauses[whole.failed])} has no true literal.` } });
    const results = F.clauses.map(() => null);
    for (let c = 0; c < F.clauses.length; c++) {
      let sat = false, lits = 0;
      for (const L of F.clauses[c]) { lits++; if (a[L.v] !== L.neg) { sat = true; break; } }
      ctr["clauses checked"]++; ctr["literal checks"] += lits;
      results[c] = sat;
      frames.push({ line: sat ? [1, 2] : [2, 3], k, asg: a, res: { results: results.slice(), failed: sat ? -1 : c }, ctr: Object.assign({}, ctr), verify: true, cur: c,
        text: `Clause ${c + 1} ${clauseStr(F.clauses[c])}: ${sat ? `a true literal found after ${lits} check${lits > 1 ? "s" : ""} — satisfied.` : "no literal is true — the certificate is <b>rejected</b>."}` });
      if (!sat) {
        frames.push({ line: 3, k, asg: a, res: { results: results.slice(), failed: c }, ctr: Object.assign({}, ctr), verify: true, done: true, text: `Verifier says <b>no</b> for this certificate. That does <i>not</i> prove F unsatisfiable — another certificate might work. Try flipping a variable.` });
        return frames;
      }
    }
    frames.push({ line: 4, k, asg: a, res: { results: results.slice(), failed: -1 }, ctr: Object.assign({}, ctr), verify: true, done: true, text: `Verifier says <b>yes</b>: F is satisfiable, proven by this certificate in ${ctr["literal checks"]} literal checks — linear in the formula's length, polynomial time.` });
    return frames;
  }
  function fact(n) { let f = 1; for (let k = 2; k <= n; k++) f *= k; return f; }
  function uniq(a) { return [...new Set(a)]; }
  const litStr = (L) => (L.neg ? "¬" : "") + L.v;
  const clauseStr = (C) => "(" + C.map(litStr).join(" ∨ ") + ")";
  const bits = (F, a) => F.vars.map((v) => `${v}=${a[v] ? 1 : 0}`).join(" ");

  /* ---------------- vertex cover / clique ---------------- */
  function complementEdges(n, edges) {
    const has = new Set(edges.map(([a, b]) => Math.min(a, b) + "-" + Math.max(a, b)));
    const out = [];
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (!has.has(a + "-" + b)) out.push([a, b]);
    return out;
  }
  function isCover(edges, W) { return edges.every(([a, b]) => W.has(a) || W.has(b)); }
  function minCover(n, edges) {
    let best = null, tried = 0;
    for (let m = 0; m < 1 << n; m++) {
      tried++;
      const W = new Set(); for (let v = 0; v < n; v++) if ((m >> v) & 1) W.add(v);
      if (isCover(edges, W) && (!best || W.size < best.size)) best = W;
    }
    return { best, tried };
  }

  const Engine = { parseCNF, evaluate, bruteFrames, verifyFrames, complementEdges, isCover, minCover };
  if (typeof module !== "undefined" && module.exports) module.exports = Engine;
  if (typeof window === "undefined") return;

  /* =====================================================================
     UI
     ===================================================================== */
  const F = window.Forge;
  const $ = (id) => document.getElementById(id);
  F.page({ title: "P vs NP Lab", chapter: "Ch 11 · Limitations of Algorithm Power" });

  const LINES_BF = [
    "ALGORITHM BruteForceSAT(F)   // F in CNF, n variables",
    "    count ← 0",
    "    for each of the 2^n assignments a do",
    "        if some clause of F has no true literal under a then",
    "            continue   // a fails",
    "        count ← count + 1   // a satisfies F",
    "    return count > 0",
  ];
  const LINES_VF = [
    "ALGORITHM VerifySAT(F, a)   // a = the guessed certificate",
    "    for each clause C in F do",
    "        if no literal of C is true under a then",
    "            return false",
    "    return true   // O(length of F) time",
  ];
  let formula = null, cert = {}, code = null, ctr = null;
  const say = F.narrate($("say"));
  const stage = $("stage");

  /* ---- predict ---- */
  const predictBox = $("predict");
  let askKey = null;
  function showAsk(ask, k) {
    if (!ask) { if (askKey !== null) { predictBox.innerHTML = '<span class="muted small">A prediction prompt appears on the first step of each run.</span>'; askKey = null; } return; }
    if (askKey === k) return;
    askKey = k;
    predictBox.innerHTML = "";
    const res = F.el("div", { class: "res" }), opts = F.el("div", { class: "opts" });
    ask.options.forEach((o) => opts.appendChild(F.el("button", { class: "btn sm", onclick: (e) => {
      const ok = o === ask.answer;
      opts.querySelectorAll("button").forEach((b) => (b.disabled = true));
      e.target.classList.add(ok ? "steel" : "primary");
      res.innerHTML = `${ok ? "✅ Yes!" : `❌ Not quite — it's <b>${ask.answer}</b>.`} ${ask.explain}`;
    } }, o)));
    predictBox.append(F.el("div", { class: "q" }, "🤔 Predict: " + ask.q), opts, res);
    if ($("pausePredict").checked) player.pause();
  }

  /* ---- SAT drawing ---- */
  function drawSAT(f) {
    const Fm = formula, n = Fm.vars.length, N = 1 << n;
    const W = stage.clientWidth && stage.clientWidth < 520 ? 400 : 680;
    const S = F.svg;
    // clause layout
    const boxes = [];
    const perRow = Math.floor((W - 14) / 62), varRows = Math.ceil(n / perRow);
    let x = 14, y = 70 + (varRows - 1) * 30;
    const cw = (C) => 20 + C.reduce((a, L) => a + (L.v.length + (L.neg ? 1 : 0)) * 9 + 14, 0) + (C.length - 1) * 16;
    Fm.clauses.forEach((C, c) => { const w = cw(C); if (x + w > W - 14) { x = 14; y += 52; } boxes.push({ x, y, w }); x += w + 22; });
    const gridTop = y + 62;
    const cols = n <= 4 ? N : n <= 6 ? 16 : 32;
    const cell = Math.min(40, (W - 28) / cols);
    const rows = Math.ceil(N / cols);
    const H = gridTop + 22 + rows * cell + 12;
    stage.setAttribute("viewBox", `0 0 ${W} ${H}`);
    stage.innerHTML = "";
    // variables
    const a = f.asg;
    stage.appendChild(S("text", { x: 14, y: 22, "font-size": 12, fill: "var(--muted)", "font-weight": 700 }, f.verify ? "CERTIFICATE" : f.done && a ? "FIRST SATISFYING ASSIGNMENT" : "ASSIGNMENT"));
    Fm.vars.forEach((v, i) => {
      const vx = 14 + (i % perRow) * 62, vy = 30 + Math.floor(i / perRow) * 30, val = a ? (a[v] ? 1 : 0) : null;
      stage.appendChild(S("rect", { x: vx, y: vy, width: 54, height: 24, rx: 12, fill: val == null ? "var(--panel-2)" : val ? "var(--c-active)" : "var(--panel-2)", stroke: "var(--c-active)", "stroke-width": 1.5 }));
      stage.appendChild(S("text", { x: vx + 27, y: vy + 17, "text-anchor": "middle", "font-size": 12.5, "font-weight": 700, fill: val ? "#0d1117" : "var(--ink)" }, `${v}=${val == null ? "?" : val}`));
    });
    // clauses
    Fm.clauses.forEach((C, c) => {
      const b = boxes[c];
      const r = f.res ? f.res.results[c] : null;
      const cur = f.cur === c || (f.res && f.res.failed === c);
      const fill = r === true ? "color-mix(in srgb, var(--c-done) 18%, transparent)" : r === false ? "color-mix(in srgb, var(--c-swap) 20%, transparent)" : "var(--panel)";
      stage.appendChild(S("rect", { x: b.x, y: b.y, width: b.w, height: 34, rx: 8, fill, stroke: r === true ? "var(--c-done)" : r === false ? "var(--c-swap)" : cur ? "var(--c-compare)" : "var(--line-2)", "stroke-width": cur ? 2.5 : 1.5 }));
      let lx = b.x + 10;
      C.forEach((L, k) => {
        const txt = litStr(L);
        const val = a ? a[L.v] !== L.neg : null;
        const tw = txt.length * 9 + 4;
        if (r !== null && a) stage.appendChild(S("rect", { x: lx - 3, y: b.y + 7, width: tw + 6, height: 20, rx: 5, fill: val ? "var(--c-done)" : "var(--c-dim)", opacity: 0.85 }));
        stage.appendChild(S("text", { x: lx + tw / 2, y: b.y + 22, "text-anchor": "middle", "font-size": 13, "font-weight": 700, fill: r !== null && a && val ? "#0d1117" : "var(--ink)" }, txt));
        lx += tw + 10;
        if (k < C.length - 1) { stage.appendChild(S("text", { x: lx, y: b.y + 22, "text-anchor": "middle", "font-size": 12, fill: "var(--muted)" }, "∨")); lx += 16; }
      });
      if (c < Fm.clauses.length - 1 && boxes[c + 1].y === b.y) stage.appendChild(S("text", { x: b.x + b.w + 11, y: b.y + 22, "text-anchor": "middle", "font-size": 14, fill: "var(--ember)", "font-weight": 800 }, "∧"));
    });
    // assignment grid
    stage.appendChild(S("text", { x: 14, y: gridTop + 12, "font-size": 12, fill: "var(--muted)", "font-weight": 700 }, `ALL 2^${n} = ${N} ASSIGNMENTS ${f.verify ? "— the guess picks just one" : ""}`));
    for (let k = 0; k < N; k++) {
      const gx = 14 + (k % cols) * cell, gy = gridTop + 22 + Math.floor(k / cols) * cell;
      let fill = "var(--panel-2)";
      if (f.status) fill = f.status[k] === 2 ? "var(--c-done)" : f.status[k] === 1 ? "color-mix(in srgb, var(--c-swap) 45%, var(--panel-2))" : "var(--panel-2)";
      if (f.verify && k === f.k) fill = f.done ? (f.res.failed < 0 ? "var(--c-done)" : "var(--c-swap)") : "var(--c-compare)";
      if (!f.verify && k === f.k) fill = f.res && f.res.ok ? "var(--c-done)" : "var(--c-compare)";
      stage.appendChild(S("rect", { x: gx + 1, y: gy + 1, width: Math.max(1, cell - 2), height: Math.max(1, cell - 2), rx: Math.min(4, cell / 4), fill, stroke: k === f.k ? "var(--ink)" : "none", "stroke-width": 1.5 }));
      if (cell >= 30 && n <= 5) stage.appendChild(S("text", { x: gx + cell / 2, y: gy + cell / 2 + 4, "text-anchor": "middle", "font-size": 9, fill: "var(--muted)" }, k.toString(2).padStart(n, "0")));
    }
  }

  function render(f, i) {
    drawSAT(f);
    code.highlight(f.line);
    ctr.set(f.ctr);
    say.say(f.text);
    showAsk(f.ask, i);
  }
  const player = F.player($("player"), { frames: [], render, fps: 4 });

  function buildCert() {
    const host = $("cert"); host.innerHTML = "";
    formula.vars.forEach((v) => {
      if (cert[v] == null) cert[v] = false;
      host.appendChild(F.el("button", { class: "btn sm" + (cert[v] ? " steel" : ""), "aria-pressed": cert[v] ? "true" : "false", onclick: () => { cert[v] = !cert[v]; buildCert(); if ($("mode").value === "verify") run(); } }, `${v} = ${cert[v] ? 1 : 0}`));
    });
  }
  function run() {
    $("err").textContent = "";
    try { formula = parseCNF($("cnf").value); } catch (e) { $("err").textContent = "⚠ " + e.message; return; }
    if (formula.vars.length > 10) { $("err").textContent = `⚠ ${formula.vars.length} variables — keep it to 10 or fewer (2^10 = 1024 assignments) so the animation stays watchable.`; return; }
    const mode = $("mode").value;
    $("certRow").style.display = mode === "verify" ? "" : "none";
    $("stopRow").style.display = mode === "brute" ? "" : "none";
    buildCert();
    $("code").innerHTML = ""; code = F.code($("code"), mode === "brute" ? LINES_BF : LINES_VF);
    $("ctr").innerHTML = ""; ctr = F.counters($("ctr"), mode === "brute" ? { "assignments tried": 0, "literal checks": 0, satisfying: 0 } : { "clauses checked": 0, "literal checks": 0 });
    const frames = mode === "brute" ? bruteFrames(formula, $("stop").checked) : verifyFrames(formula, Object.assign({}, cert));
    askKey = "x";
    player.load(frames);
    growth();
  }
  function growth() {
    const host = $("growth"); host.innerHTML = "";
    const rate = 1e9;
    const human = (s) => s < 1e-6 ? `${(s * 1e9).toFixed(0)} ns` : s < 1e-3 ? `${(s * 1e6).toFixed(1)} µs` : s < 1 ? `${(s * 1e3).toFixed(1)} ms` : s < 60 ? `${s.toFixed(1)} s` : s < 3600 ? `${(s / 60).toFixed(1)} min` : s < 86400 * 365 ? `${(s / 3600).toFixed(1)} h` : s < 86400 * 365 * 1e9 ? `${(s / 86400 / 365).toExponential(1)} years` : `${(s / 86400 / 365).toExponential(1)} years (universe ≈ 1.4e10)`;
    const tb = F.el("table", { class: "t" }, F.el("tr", null, F.el("th", null, "n variables"), F.el("th", null, "2ⁿ assignments"), F.el("th", null, "brute force @ 10⁹/s"), F.el("th", null, "verify one certificate (≈ 10n literal checks)")));
    [10, 20, 30, 40, 50, 64, 100].forEach((n) => {
      const N = Math.pow(2, n);
      tb.appendChild(F.el("tr", null, F.el("td", null, n), F.el("td", null, n <= 40 ? N.toLocaleString("en-US") : N.toExponential(2)), F.el("td", null, human(N / rate)), F.el("td", null, human((10 * n) / rate))));
    });
    host.appendChild(tb);
  }
  $("run").onclick = run;
  $("mode").onchange = run;
  $("stop").onchange = run;
  $("cnf").addEventListener("keydown", (e) => { if (e.key === "Enter") run(); });
  $("preset").onchange = () => { const v = $("preset").value; if (v) { $("cnf").value = v; cert = {}; run(); } };
  $("rand").onclick = () => {
    const r = Math.random, n = 4 + Math.floor(r() * 4), m = 3 + Math.floor(r() * 5);
    const V = "ABCDEFGH".slice(0, n).split("");
    const cl = [];
    for (let c = 0; c < m; c++) {
      const k = 2 + Math.floor(r() * 2), vs = V.slice().sort(() => r() - 0.5).slice(0, k);
      cl.push("(" + vs.map((v) => (r() < 0.45 ? "~" : "") + v).join(" | ") + ")");
    }
    $("cnf").value = cl.join(" & "); cert = {}; $("preset").value = ""; run();
  };
  $("certRand").onclick = () => { formula.vars.forEach((v) => (cert[v] = Math.random() < 0.5)); buildCert(); run(); };
  $("certFind").onclick = () => {
    const N = 1 << formula.vars.length;
    for (let k = 0; k < N; k++) { const a = asgOf(formula, k); if (evaluate(formula, a).ok) { cert = a; buildCert(); run(); return; } }
    $("err").textContent = "⚠ No satisfying assignment exists — every certificate will be rejected.";
  };

  /* =====================================================================
     Complexity map + "which diagrams don't contradict" practice
     ===================================================================== */
  const REGIONS = {
    P: { title: "P", text: "Decision problems solvable in polynomial time by a deterministic algorithm. Examples: searching, element uniqueness, graph connectivity and acyclicity, shortest paths, minimum spanning tree, primality (proved in P in 2002)." },
    NP: { title: "NP (outside P, if P ≠ NP)", text: "Problems whose yes-answers can be verified in polynomial time from a certificate. If P ≠ NP, Ladner's theorem says some NP problems are neither in P nor NP-complete — candidates people suspect: graph isomorphism, integer factoring (as a decision problem)." },
    NPC: { title: "NP-complete", text: "In NP and at least as hard as every NP problem (all of NP reduces to it in polynomial time). CNF-SAT (Cook–Levin), 3-SAT, vertex cover, clique, Hamiltonian circuit, partition, subset-sum, decision versions of TSP and knapsack, graph coloring. A polynomial algorithm for any one of them would give P = NP." },
    NPH: { title: "NP-hard (not in NP)", text: "At least as hard as every NP problem but not required to be in NP. Examples: the optimization version of TSP (\"find the shortest tour\" — its answers can't obviously be checked), and the halting problem (undecidable, yet every NP problem reduces to it)." },
  };
  function drawMap(sel) {
    const svg = $("map"), S = F.svg;
    svg.setAttribute("viewBox", "0 0 640 280");
    svg.innerHTML = "";
    const defs = S("defs", null, S("clipPath", { id: "npclip" }, S("ellipse", { cx: 250, cy: 140, rx: 200, ry: 110 })));
    svg.appendChild(defs);
    const hot = (k) => (sel === k ? 0.55 : 0.28);
    const region = (k, el) => { el.style.cursor = "pointer"; el.setAttribute("tabindex", "0"); el.setAttribute("role", "button"); el.setAttribute("aria-label", REGIONS[k].title); el.addEventListener("click", (e) => { e.stopPropagation(); pickRegion(k); }); el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pickRegion(k); } }); svg.appendChild(el); };
    // NP-hard band (right side), drawn first
    region("NPH", S("path", { d: "M330 12 H626 V268 H330 Q300 140 330 12 Z", fill: "var(--c-swap)", "fill-opacity": hot("NPH"), stroke: "var(--c-swap)", "stroke-width": 1.5 }));
    region("NP", S("ellipse", { cx: 250, cy: 140, rx: 200, ry: 110, fill: "var(--steel)", "fill-opacity": hot("NP"), stroke: "var(--steel)", "stroke-width": 2 }));
    const g = S("g", { "clip-path": "url(#npclip)" });
    const npc = S("path", { d: "M330 12 H626 V268 H330 Q300 140 330 12 Z", fill: "var(--c-pivot)", "fill-opacity": sel === "NPC" ? 0.9 : 0.6, stroke: "var(--c-pivot)", "stroke-width": 2 });
    g.appendChild(npc); svg.appendChild(g);
    npc.style.cursor = "pointer"; npc.addEventListener("click", (e) => { e.stopPropagation(); pickRegion("NPC"); });
    region("P", S("ellipse", { cx: 160, cy: 140, rx: 90, ry: 62, fill: "var(--c-done)", "fill-opacity": sel === "P" ? 0.85 : 0.55, stroke: "var(--c-done)", "stroke-width": 2 }));
    const T = (x, y, t, s) => svg.appendChild(S("text", { x, y, "text-anchor": "middle", "font-size": s || 15, "font-weight": 800, fill: "var(--ink)", "pointer-events": "none" }, t));
    T(160, 146, "P"); T(265, 60, "NP", 14); T(395, 146, "NPC", 14); T(535, 146, "NP-hard", 14);
    T(290, 212, "NP ∖ (P ∪ NPC)?", 10.5);
    const txt = $("mapText");
    if (sel) txt.innerHTML = `<b>${REGIONS[sel].title}.</b> ${REGIONS[sel].text}`;
  }
  function pickRegion(k) { drawMap(k); }

  const DIAGRAMS = [
    { id: "a", ok: false, why: "Even if P = NP, the two trivial problems (always “yes”, always “no”) are in P but cannot be NP-complete — nothing with a yes-instance can reduce to a problem that has none. So NPC can never be all of NP." },
    { id: "b", ok: true, why: "This is the world if P = NP: every nontrivial problem in NP becomes NP-complete, so NPC sits inside P = NP, missing only the trivial problems." },
    { id: "c", ok: true, why: "The picture most researchers believe (P ≠ NP): P and NPC are disjoint, and by Ladner's theorem there are NP problems in between." },
    { id: "d", ok: false, why: "A problem in both P and NPC would let every NP problem be solved in polynomial time, so P = NP — and then this picture (P ≠ NP) would collapse into picture (b)." },
    { id: "e", ok: false, why: "If P ≠ NP, Ladner's theorem guarantees NP problems that are neither in P nor NP-complete, so P and NPC cannot fill NP exactly. (If P = NP, the picture is wrong anyway.)" },
  ];
  function drawDiagram(svg, id) {
    const S = F.svg;
    svg.setAttribute("viewBox", "0 0 200 130");
    svg.innerHTML = "";
    const E = (cx, cy, rx, ry, col, op) => svg.appendChild(S("ellipse", { cx, cy, rx, ry, fill: col, "fill-opacity": op, stroke: col, "stroke-width": 1.5 }));
    const T = (x, y, t, s) => svg.appendChild(S("text", { x, y, "text-anchor": "middle", "font-size": s || 11, "font-weight": 700, fill: "var(--ink)" }, t));
    if (id === "a") { E(100, 65, 88, 55, "var(--c-pivot)", 0.35); T(100, 69, "P = NP = NPC", 12); }
    if (id === "b") { E(100, 65, 88, 55, "var(--c-done)", 0.3); E(112, 72, 58, 36, "var(--c-pivot)", 0.45); T(62, 30, "P = NP"); T(118, 76, "NPC"); }
    if (id === "c") { E(100, 65, 90, 58, "var(--steel)", 0.18); E(58, 70, 32, 26, "var(--c-done)", 0.5); E(146, 70, 32, 26, "var(--c-pivot)", 0.5); T(100, 22, "NP"); T(58, 74, "P"); T(146, 74, "NPC"); }
    if (id === "d") { E(100, 65, 90, 58, "var(--steel)", 0.18); E(78, 72, 40, 28, "var(--c-done)", 0.45); E(124, 72, 40, 28, "var(--c-pivot)", 0.45); T(100, 22, "NP"); T(64, 76, "P"); T(140, 76, "NPC"); }
    if (id === "e") {
      svg.appendChild(S("defs", null, S("clipPath", { id: "eclip" }, S("ellipse", { cx: 100, cy: 65, rx: 90, ry: 58 }))));
      const g = S("g", { "clip-path": "url(#eclip)" });
      g.appendChild(S("rect", { x: 0, y: 0, width: 100, height: 130, fill: "var(--c-done)", "fill-opacity": 0.45 }));
      g.appendChild(S("rect", { x: 100, y: 0, width: 100, height: 130, fill: "var(--c-pivot)", "fill-opacity": 0.45 }));
      svg.appendChild(g);
      svg.appendChild(S("ellipse", { cx: 100, cy: 65, rx: 90, ry: 58, fill: "none", stroke: "var(--steel)", "stroke-width": 1.5 }));
      T(100, 16, "NP"); T(58, 70, "P"); T(142, 70, "NPC");
    }
  }
  const picks = {};
  function buildQuiz() {
    const host = $("quiz"); host.innerHTML = "";
    DIAGRAMS.forEach((d) => {
      const svg = F.svg("svg", { class: "stage", role: "img", "aria-label": "diagram " + d.id });
      drawDiagram(svg, d.id);
      const b1 = F.el("button", { class: "btn sm", onclick: () => { picks[d.id] = true; buildQuiz(); } }, "consistent");
      const b2 = F.el("button", { class: "btn sm", onclick: () => { picks[d.id] = false; buildQuiz(); } }, "contradicts");
      if (picks[d.id] === true) b1.classList.add("steel");
      if (picks[d.id] === false) b2.classList.add("primary");
      const card = F.el("div", { class: "card quiz-card" }, F.el("b", null, `(${d.id})`), svg, F.el("div", { class: "row", style: { justifyContent: "center" } }, b1, b2), F.el("div", { class: "small fb", id: "fb-" + d.id }));
      host.appendChild(card);
    });
  }
  $("qcheck").onclick = () => {
    let right = 0;
    DIAGRAMS.forEach((d) => {
      const fb = $("fb-" + d.id);
      const p = picks[d.id];
      const ok = p === d.ok;
      if (ok) right++;
      fb.innerHTML = `${p == null ? "⏺ no answer — " : ok ? "✅ " : "❌ "}<b>${d.ok ? "Consistent." : "Contradicts."}</b> ${d.why}`;
    });
    $("qscore").textContent = `${right} / 5 correct. Only (b) and (c) are consistent with what we know.`;
  };
  $("qreset").onclick = () => { Object.keys(picks).forEach((k) => delete picks[k]); buildQuiz(); $("qscore").textContent = ""; };

  /* =====================================================================
     Vertex Cover of size K in G  ⇔  Clique of size n − K in the complement
     ===================================================================== */
  const vc = { n: 6, edges: [[0, 1], [0, 2], [0, 3], [1, 4], [2, 5], [4, 5]], W: new Set(), pick: null };
  function vcPos(n, cx, cy, r) { return Array.from({ length: n }, (_, k) => ({ x: cx + r * Math.cos(-Math.PI / 2 + (2 * Math.PI * k) / n), y: cy + r * Math.sin(-Math.PI / 2 + (2 * Math.PI * k) / n) })); }
  function drawVC() {
    const n = vc.n, W = vc.W;
    const comp = complementEdges(n, vc.edges);
    const cover = isCover(vc.edges, W);
    const rest = [...Array(n).keys()].filter((v) => !W.has(v));
    const missing = [];
    for (let i = 0; i < rest.length; i++) for (let j = i + 1; j < rest.length; j++) { const a = rest[i], b = rest[j]; if (!comp.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) missing.push([a, b]); }
    const draw = (svg, edges, inSet, mode) => {
      const S = F.svg; svg.setAttribute("viewBox", "0 0 300 270"); svg.innerHTML = "";
      const P = vcPos(n, 150, 140, 105);
      edges.forEach(([a, b]) => {
        let col = "var(--line-2)", w = 2, dash = "";
        if (mode === "G") { if (W.has(a) || W.has(b)) { col = "var(--c-done)"; w = 3; } else { col = "var(--c-swap)"; w = 3.5; dash = "6 4"; } }
        else if (!W.has(a) && !W.has(b)) { col = "var(--c-done)"; w = 3.5; }
        const line = S("line", { x1: P[a].x, y1: P[a].y, x2: P[b].x, y2: P[b].y, stroke: col, "stroke-width": w, "stroke-dasharray": dash });
        svg.appendChild(line);
      });
      if (mode === "C") missing.forEach(([a, b]) => svg.appendChild(S("line", { x1: P[a].x, y1: P[a].y, x2: P[b].x, y2: P[b].y, stroke: "var(--c-swap)", "stroke-width": 3, "stroke-dasharray": "3 5" })));
      P.forEach((p, v) => {
        const on = inSet(v);
        const c = S("circle", { cx: p.x, cy: p.y, r: 19, fill: on ? (mode === "G" ? "var(--ember)" : "var(--steel)") : "var(--panel-2)", stroke: vc.pick === v ? "var(--c-compare)" : mode === "G" ? "var(--ember)" : "var(--steel)", "stroke-width": vc.pick === v ? 4 : 2, style: "cursor:pointer", tabindex: 0, role: "button", "aria-label": `vertex ${v + 1}` });
        const act = () => clickVC(v, mode);
        c.addEventListener("click", act);
        c.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act(); } });
        svg.appendChild(c);
        svg.appendChild(S("text", { x: p.x, y: p.y + 5, "text-anchor": "middle", "font-size": 14, "font-weight": 800, fill: on ? "#0d1117" : "var(--ink)", "pointer-events": "none" }, String(v + 1)));
      });
    };
    draw($("vcG"), vc.edges, (v) => W.has(v), "G");
    draw($("vcC"), comp, (v) => !W.has(v), "C");
    const K = W.size;
    const names = (s) => "{" + [...s].sort((a, b) => a - b).map((v) => v + 1).join(", ") + "}";
    const uncovered = vc.edges.filter(([a, b]) => !W.has(a) && !W.has(b));
    $("vcG-t").innerHTML = `W = ${names(W)}, |W| = K = ${K}. ${cover ? "<b style='color:var(--ok)'>Vertex cover ✔</b> — every edge touches W." : `<b style='color:var(--bad)'>Not a cover</b> — ${uncovered.length} edge${uncovered.length > 1 ? "s" : ""} untouched: ${uncovered.map(([a, b]) => `${a + 1}–${b + 1}`).join(", ")}.`}`;
    $("vcC-t").innerHTML = `V − W = ${names(new Set(rest))}, size n − K = ${n - K}. ${!missing.length ? "<b style='color:var(--ok)'>Clique ✔</b> — every pair is joined in the complement." : `<b style='color:var(--bad)'>Not a clique</b> — missing pair${missing.length > 1 ? "s" : ""} ${missing.map(([a, b]) => `${a + 1}–${b + 1}`).join(", ")}.`}`;
    $("vc-sum").innerHTML = `Same edges both times: an edge of G with neither end in W is exactly a pair in V − W that is <i>not</i> joined in the complement. So <b>W is a vertex cover of G ⇔ V − W is a clique of the complement</b> — a size-K cover ⇔ a size-(n − K) clique, and building the complement takes only O(n²) time.`;
  }
  function clickVC(v, mode) {
    if ($("vcEdit").checked && mode === "G") {
      if (vc.pick == null) { vc.pick = v; drawVC(); return; }
      if (vc.pick !== v) {
        const a = Math.min(vc.pick, v), b = Math.max(vc.pick, v);
        const i = vc.edges.findIndex(([x, y]) => x === a && y === b);
        if (i >= 0) vc.edges.splice(i, 1); else vc.edges.push([a, b]);
      }
      vc.pick = null; drawVC(); return;
    }
    if (vc.W.has(v)) vc.W.delete(v); else vc.W.add(v);
    $("vcMin").textContent = "";
    drawVC();
  }
  $("vcClear").onclick = () => { vc.W = new Set(); drawVC(); };
  $("vcRand").onclick = () => {
    const n = 5 + Math.floor(Math.random() * 3); vc.n = n; vc.edges = []; vc.W = new Set(); vc.pick = null;
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (Math.random() < 0.42) vc.edges.push([a, b]);
    if (!vc.edges.length) vc.edges.push([0, 1]);
    $("vcMin").textContent = ""; drawVC();
  };
  $("vcBest").onclick = () => {
    const { best, tried } = minCover(vc.n, vc.edges);
    vc.W = new Set(best);
    $("vcMin").textContent = `Brute force checked all ${tried} = 2^${vc.n} subsets: a minimum vertex cover has size ${best.size}, so the largest clique in the complement has size ${vc.n - best.size}.`;
    drawVC();
  };
  $("vcEdit").onchange = () => { vc.pick = null; drawVC(); };

  run(); drawMap(null); buildQuiz(); drawVC();
})();
