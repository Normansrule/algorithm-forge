/* =====================================================================
   Algorithm Forge — Counting in a stream (UI)
   The sketches live in streaming-sketches-core.js (window.SketchCore).
   Frames are light: {t} = "state after the first t items". The page keeps
   one live engine and advances it (or replays from the start when the
   player goes backwards), so a 20,000-item stream needs no snapshots.
   🤔 frames show the state before item t with that item "arriving".
   ===================================================================== */
(function () {
  "use strict";
  const K = window.SketchCore;
  Forge.page({ title: "Counting in a Stream", chapter: "Ch 18 · The Frontier" });
  const $ = (id) => document.getElementById(id);
  const E = Forge.el;
  // .stage text { fill } rules can beat a fill attribute, so text colour goes through style
  const S = (tag, a, ...k) => {
    if (tag === "text" && a && a.fill) { a = Object.assign({}, a); a.style = "fill:" + a.fill + (a.style ? ";" + a.style : ""); delete a.fill; }
    return Forge.svg(tag, a, ...k);
  };
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const q = (x) => "“" + esc(x) + "”";
  const fmt = (n) => (Number.isFinite(n) ? Math.round(n).toLocaleString("en-US") : "⊥");
  const fmt1 = (n) => (Number.isFinite(n) ? (Math.abs(n) >= 100 ? Math.round(n).toLocaleString("en-US") : n.toFixed(1)) : "⊥");
  const bitsFmt = (b) => b.toLocaleString("en-US") + " bits" + (b >= 8192 ? " (" + (b / 8192).toFixed(1) + " KB)" : " (" + Math.ceil(b / 8) + " B)");
  const pct = (e, t) => (t ? ((e - t) / t * 100 >= 0 ? "+" : "") + ((e - t) / t * 100).toFixed(1) + "%" : "—");
  const pfmt = (p) => (p === 1 ? "1" : "1/" + Math.round(1 / p));
  const bin = (v, w) => (v >>> 0).toString(2).padStart(w, "0");
  const short = (s, n) => (s.length > n ? s.slice(0, Math.max(1, n - 1)) + "…" : s);
  const plural = (n, w) => n + " " + w + (n === 1 ? "" : "s");

  /* ---------------- pseudocode ---------------- */
  const LINES = {
    exact: [
      "ALGORITHM ExactDistinct(S)",
      "    X ← empty hash set",
      "    for each a in S do",
      "        if a is not in X then",
      "            add(X, a)  // memory grows with every new item",
      "    return size(X)",
    ],
    hll: [
      "ALGORITHM HyperLogLogAdd(M[0..m-1], x)  // m = 2^b",
      "    h ← hash32(x)  // 32 random-looking bits",
      "    j ← h mod m  // low b bits pick a register",
      "    w ← h div m  // the other 32 - b bits",
      "    ρ ← (32 - b) - BitLength(w) + 1  // leading zeros + 1",
      "    if ρ > M[j] then",
      "        M[j] ← ρ  // keep the maximum",
      "",
      "ALGORITHM HyperLogLogCount(M[0..m-1])",
      "    Z ← sum of 2^(-M[j]) for j ← 0 to m - 1",
      "    E ← α(m) · m · m / Z  // harmonic mean, bias-corrected",
      "    V ← number of j with M[j] = 0",
      "    if E ≤ 2.5 · m and V > 0 then",
      "        return m · ln(m / V)  // small range: linear counting",
      "    return E",
    ],
    cvm: [
      "ALGORITHM CVM(S, thresh)",
      "    p ← 1",
      "    X ← empty set  // at most thresh items",
      "    for each a in S do",
      "        remove(X, a)  // forget a's earlier coin flip",
      "        if random() < p then",
      "            add(X, a)  // keep a with probability p",
      "        if size(X) = thresh then",
      "            for each x in copy(X) do  // halving round",
      "                if random() < 1/2 then remove(X, x)",
      "            p ← p / 2",
      "            if size(X) = thresh then",
      "                return -1  // ⊥: every coin said keep",
      "    return size(X) / p",
    ],
    cms: [
      "ALGORITHM CountMinAdd(C[0..d-1, 0..w-1], x)",
      "    for i ← 0 to d - 1 do",
      "        C[i, h_i(x)] ← C[i, h_i(x)] + 1  // one cell per row",
      "",
      "ALGORITHM CountMinQuery(C[0..d-1, 0..w-1], x)",
      "    est ← ∞",
      "    for i ← 0 to d - 1 do",
      "        est ← min(est, C[i, h_i(x)])  // collisions only add",
      "    return est  // never below the true count",
    ],
    mg: [
      "ALGORITHM MisraGriesAdd(T, x, k)  // at most k - 1 counters",
      "    if x is a key of T then",
      "        T[x] ← T[x] + 1",
      "    else if size(T) < k - 1 then",
      "        T[x] ← 1  // a free counter",
      "    else",
      "        for each y in keys(T) do  // no room: decrement all",
      "            T[y] ← T[y] - 1",
      "            if T[y] = 0 then remove(T, y)",
    ],
  };
  const NAMES = { exact: "Exact set", hll: "HyperLogLog", cvm: "CVM", cms: "Count–Min", mg: "Misra–Gries" };

  /* ---------------- state ---------------- */
  const st = { cfg: null, stream: [], frames: [], series: [], focus: "hll", query: null, live: null, lastFocusCtr: "" };
  const codes = FX.codeSwitch($("code"));
  const say = Forge.narrate($("say"));
  let player = null, ctr = null;
  const pred = FX.predict($("pred"), () => player);

  function readCfg() {
    const preset = $("preset").value;
    return {
      preset, N: +$("n").value, seed: Math.max(1, +$("seed").value || 1), step: +$("step").value,
      b: +$("hb").value, thresh: Math.max(4, Math.min(400, Math.round(+$("thresh").value || 40))),
      d: +$("cd").value, w: +$("cw").value, k: +$("mk").value, text: $("custom").value,
    };
  }
  function makeStream(c) {
    if (c.preset === "zipf") return K.zipfStream(c.N, c.seed);
    if (c.preset === "uniform") return K.uniformStream(c.N, c.seed);
    if (c.preset === "heavy") return K.heavyStream(c.N, c.seed);
    const s = K.textStream(c.text).slice(0, 20000);
    return s.length ? s : ["empty"];
  }
  function newEngine(c) {
    return {
      t: 0, last: null,
      ex: new K.Exact(),
      hll: new K.HLL(c.b, c.seed * 13 + 5),
      cvm: new K.CVM(c.thresh, c.seed * 101 + 9),
      cms: new K.CountMin(c.d, c.w, c.seed * 7 + 3),
      mg: new K.MisraGries(c.k),
    };
  }
  function stepEngine(en) {
    const x = st.stream[en.t];
    en.last = { x, t: en.t + 1, ex: en.ex.add(x), hll: en.hll.add(x), cvm: en.cvm.add(x), cms: en.cms.add(x), mg: en.mg.add(x), from: en.t + 1 };
    en.t++;
  }
  function advanceTo(t) {
    if (!st.live || st.live.t > t) st.live = newEngine(st.cfg);
    const from = st.live.t;
    while (st.live.t < t) stepEngine(st.live);
    if (st.live.last && t > from) st.live.last.from = from + 1;
    return st.live;
  }

  /* ---------------- build: stream, series, 🤔 moments, frames ---------------- */
  function build(keepT) {
    const c = readCfg();
    st.cfg = c;
    $("thresh").value = c.thresh;
    st.stream = makeStream(c);
    const N = st.stream.length;
    const en = newEngine(c);
    const every = Math.max(1, Math.ceil(N / 400));
    st.series = [{ t: 0, truth: 0, hll: 0, cvm: 0 }];
    const asks = {};
    let aReg = null, aDup = null, aLose = null, aC1 = null, aC2 = null;
    const m = 1 << c.b;
    for (let i = 0; i < N; i++) {
      const x = st.stream[i], t = i + 1;
      const isNew = !en.ex.freq.has(x);
      if (!aReg && t >= 4 && isNew) {
        const pp = en.hll.parts(x);
        if (pp.rho > en.hll.M[pp.j]) aReg = asks[t] = askReg(x, pp, m, c.b);
      } else if (aReg && !aDup && t >= 12 && !isNew && !asks[t]) {
        aDup = asks[t] = askDup(x);
      } else if (aDup && !aLose && t >= 30 && isNew && !asks[t]) {
        const pp = en.hll.parts(x), old = en.hll.M[pp.j];
        if (old > 0 && pp.rho <= old) aLose = asks[t] = askLose(x, pp, old);
      }
      if (!en.cvm.failed && en.cvm.size === c.thresh - 1 && !asks[t]) {
        const had = en.cvm.where.has(x), p = en.cvm.p;
        const ans = had ? 2 : p === 1 ? 0 : 1;
        if (!aC1) aC1 = asks[t] = askCvm(x, had, p, c.thresh, ans);
        else if (!aC2 && t > aC1.t + 3 && p < 1 && ans !== aC1.ask.ans) aC2 = asks[t] = askCvm(x, had, p, c.thresh, ans);
      }
      if (asks[t]) asks[t].t = t;
      stepEngine(en);
      if (t % every === 0 || t === N) st.series.push({ t, truth: en.ex.distinct(), hll: en.hll.estimate().est, cvm: en.cvm.estimate() });
    }
    const ts = new Set([0, N]);
    for (let t = c.step; t < N; t += c.step) ts.add(t);
    Object.keys(asks).forEach((t) => ts.add(+t));
    const frames = [];
    [...ts].sort((a, b) => a - b).forEach((t) => {
      if (asks[t]) frames.push({ t: t - 1, preview: true, ask: asks[t].ask, focus: asks[t].focus, kind: asks[t].kind });
      frames.push({ t });
    });
    st.frames = frames;
    st.live = null;
    pred.reset();
    let start = 0;
    if (keepT != null) { start = frames.findIndex((f) => !f.preview && f.t >= keepT); if (start < 0) start = frames.length - 1; }
    if (!player) player = Forge.player($("player"), { frames, render, fps: 6 });
    else player.load(frames);
    if (start) player.go(start);
    $("nOut").textContent = c.N.toLocaleString("en-US");
  }

  function regDistractors(j, m) {
    const set = new Set([j]);
    for (const c of [j ^ 1, j ^ (m >> 1), (j + 3) % m, j ^ 2, (j + 5) % m]) { if (set.size >= 4) break; set.add(c); }
    return [...set].sort((a, b) => a - b);
  }
  function askReg(x, pp, m, b) {
    const opts = regDistractors(pp.j, m);
    return { kind: "hllReg", focus: "hll", ask: {
      q: `${q(x)} is arriving. Its 32-bit hash is drawn in the HyperLogLog card. With m = ${m} registers, <b>which register</b> will it update?`,
      opts: opts.map((r) => "M[" + r + "]"), ans: opts.indexOf(pp.j),
      why: `The low b = ${b} bits (purple) are ${bin(pp.j, b)}, which is ${pp.j} in decimal: the register index is just h mod m. The other bits start with ${pp.rho - 1} zero${pp.rho === 2 ? "" : "s"}, so ρ = ${pp.rho}.` } };
  }
  function askDup(x) {
    return { kind: "hllDup", focus: "hll", ask: {
      q: `${q(x)} arrives again: it has been seen before. Will <b>any</b> HyperLogLog register change?`,
      opts: ["Yes, its register goes up", "Maybe, it depends on luck", "No, nothing changes"], ans: 2,
      why: "The hash is a fixed function, so a repeated item gets exactly the same bits: the same register j and the same ρ, which that register already holds (or beats). Duplicates are free for a distinct counter." } };
  }
  function askLose(x, pp, old) {
    return { kind: "hllLose", focus: "hll", ask: {
      q: `${q(x)} is a <b>new</b> item and goes to register M[${pp.j}], which holds ${old}. Look at its hash: will M[${pp.j}] change?`,
      opts: ["Yes", "No"], ans: 1,
      why: `Its hash bits start with ${pp.rho - 1} zero${pp.rho === 2 ? "" : "s"}, so ρ = ${pp.rho} ≤ ${old}. A register keeps only the maximum, so most new items change nothing; only a rarer-looking hash moves it.` } };
  }
  function askCvm(x, had, p, thresh, ans) {
    return { kind: "cvm", focus: "cvm", ask: {
      q: `The CVM buffer holds ${thresh - 1} of thresh = ${thresh} items and p = ${pfmt(p)}. ${q(x)} is arriving${had ? " and is <b>already in the buffer</b> (yellow)" : " and is not in the buffer"}. Will this round <b>halve the buffer</b>?`,
      opts: ["Yes, certainly", "Only if its coin says keep", "No, it can't"], ans,
      why: ans === 2 ? "It is first removed (its old coin flip is forgotten), so the buffer drops to thresh − 2 and re-adding it can only bring it back to thresh − 1. A repeated item can never fill the buffer."
        : ans === 0 ? "p = 1, so every arriving item is kept: the buffer reaches thresh and the halving round must run."
          : `It is kept only if random() < p = ${pfmt(p)}. If it is kept, the buffer is full and a halving round follows; otherwise nothing happens.` } };
  }

  /* ---------------- render ---------------- */
  function setFocus(f) {
    st.focus = f;
    document.querySelectorAll("#focusSeg button").forEach((b) => b.classList.toggle("on", b.dataset.f === f));
    document.querySelectorAll(".sk").forEach((c) => c.classList.toggle("focus", c.dataset.f === f));
  }
  function render(fr, idx) {
    if (fr.focus && fr.focus !== st.focus) setFocus(fr.focus);
    const en = advanceTo(fr.t);
    const inc = fr.preview ? st.stream[fr.t] : null;
    const ctx = { fr, inc, kind: fr.kind };
    document.querySelectorAll(".sk").forEach((c) => c.classList.toggle("ask", !!fr.preview && c.dataset.f === fr.focus));
    drawTicker(en, inc);
    drawExact(en, ctx);
    drawHll(en, ctx);
    drawCvm(en, ctx);
    drawCms(en, ctx);
    drawMg(en, ctx);
    drawHH(en);
    drawTimeChart(fr.t);
    side(en, ctx);
    pred.update(fr, idx);
  }

  function drawTicker(en, inc) {
    const box = $("ticker");
    box.innerHTML = "";
    box.appendChild(E("span", { class: "lbl" }, `item ${en.t.toLocaleString("en-US")} / ${st.stream.length.toLocaleString("en-US")}`));
    if (inc != null) box.appendChild(E("span", { class: "it next", title: "arriving next" }, "→ " + inc));
    for (let i = en.t - 1, k = 0; i >= 0 && k < 14; i--, k++) box.appendChild(E("span", { class: "it" + (k === 0 && inc == null ? " now" : k > 4 ? " old" : "") }, st.stream[i]));
    if (!en.t && inc == null) box.appendChild(E("span", { class: "muted small" }, "Press ▶ or → to start reading the stream."));
  }

  function drawExact(en, ctx) {
    const n = en.ex.distinct();
    $("mem-exact").textContent = "≥ " + bitsFmt(32 * n);
    const host = $("b-exact");
    host.innerHTML = "";
    const chips = E("div", { class: "chips" });
    const keys = [...en.ex.freq.keys()];
    const lastX = en.last && !ctx.inc ? en.last.x : null;
    const show = keys.slice(Math.max(0, keys.length - 70)).reverse();
    show.forEach((k) => chips.appendChild(E("span", { class: k === lastX ? (en.last.ex.isNew ? "new" : "dup") : k === ctx.inc ? "dup" : "" }, k)));
    if (lastX && !show.includes(lastX)) chips.prepend(E("span", { class: "dup" }, lastX));
    host.appendChild(chips);
    host.appendChild(E("div", { class: "stat", html: `distinct so far: <b>${fmt(n)}</b> of ${fmt(en.t)} items${keys.length > 70 ? " · newest 70 shown" : ""}` }));
  }

  function heat(v, maxV) {
    if (!v) return "var(--panel-2)";
    return `color-mix(in srgb, var(--steel) ${Math.round(28 + 72 * Math.min(1, v / maxV))}%, var(--panel-2))`;
  }
  function drawHll(en, ctx) {
    const H = en.hll, m = H.m, b = H.b;
    $("mem-hll").textContent = bitsFmt(H.bits());
    const host = $("b-hll");
    host.innerHTML = "";
    const x = ctx.inc != null ? ctx.inc : en.last ? en.last.x : null;
    const pp = ctx.inc != null ? H.parts(ctx.inc) : en.last ? en.last.hll : null;
    const hideJ = ctx.kind === "hllReg";
    // hash bits
    const W = 360, bw = W / 32;
    const sv = S("svg", { viewBox: `0 0 ${W} 50`, role: "img", "aria-label": "The 32 bits of the item's hash" });
    if (pp) {
      const s = bin(pp.h, 32), split = 32 - b;
      const firstOne = s.indexOf("1");
      for (let i = 0; i < 32; i++) {
        let fill = "var(--panel-2)", ink = "var(--ink)";
        if (i >= split) { fill = "var(--c-pivot)"; ink = "#0d1117"; }
        else if (i < pp.rho - 1) { fill = "var(--c-compare)"; ink = "#0d1117"; }
        else if (i === pp.rho - 1 && firstOne >= 0) { fill = "var(--c-done)"; ink = "#0d1117"; }
        sv.appendChild(S("rect", { x: i * bw + 0.5, y: 14, width: bw - 1, height: 18, rx: 2, fill, stroke: "var(--line-2)", "stroke-width": 0.5 }));
        sv.appendChild(S("text", { x: i * bw + bw / 2, y: 27, "text-anchor": "middle", "font-size": 10, fill: ink }, s[i]));
      }
      sv.appendChild(S("text", { x: 0, y: 10, "font-size": 9, fill: "var(--muted)" }, `w = ${split} high bits`));
      sv.appendChild(S("text", { x: W, y: 10, "text-anchor": "end", "font-size": 9, fill: "var(--c-pivot)" }, `j = low ${b} bits`));
      sv.appendChild(S("text", { x: 0, y: 46, "font-size": 10, fill: "var(--ink-2)" }, `hash32(${short(x, 14)})` + (hideJ ? "  → which register?" : `  → j = ${pp.j}, ρ = ${pp.rho}`)));
    } else {
      sv.appendChild(S("text", { x: 0, y: 28, "font-size": 11, fill: "var(--muted)" }, "No item yet: every register is 0."));
    }
    host.appendChild(sv);
    // registers
    const cols = m <= 64 ? 16 : m <= 256 ? 32 : 64, rows = Math.ceil(m / cols), cw = W / cols, ch = Math.max(8, Math.min(22, cw));
    const g = S("svg", { viewBox: `0 0 ${W} ${rows * ch + 2}`, role: "img", "aria-label": `${m} HyperLogLog registers` });
    let maxV = 6;
    for (let j = 0; j < m; j++) maxV = Math.max(maxV, H.M[j]);
    for (let j = 0; j < m; j++) {
      const r = Math.floor(j / cols), c = j % cols, v = H.M[j];
      const isCur = pp && !hideJ && j === pp.j;
      const written = isCur && !ctx.inc && en.last && en.last.hll.changed;
      const fill = written ? "var(--c-swap)" : heat(v, maxV);
      g.appendChild(S("rect", { x: c * cw + 0.5, y: r * ch + 1, width: cw - 1, height: ch - 1, rx: 2, fill, stroke: isCur ? "var(--c-compare)" : "none", "stroke-width": isCur ? 2 : 0 }));
      if (cw >= 11) g.appendChild(S("text", { x: c * cw + cw / 2, y: r * ch + ch / 2 + 4, "text-anchor": "middle", "font-size": Math.min(11, cw * 0.55), fill: written || v / maxV > 0.45 ? "#0d1117" : "var(--ink-2)" }, String(v)));
    }
    host.appendChild(g);
    const e = H.estimate(), truth = en.ex.distinct();
    host.appendChild(E("div", { class: "stat", html: `estimate <b>${fmt(e.est)}</b> · true ${fmt(truth)} · error ${pct(e.est, truth)} · ${e.mode === "linear" ? `linear counting (V = ${e.V} zero registers)` : "harmonic mean E"} · expected error ±${(104 / Math.sqrt(m)).toFixed(1)}%` }));
  }

  function drawCvm(en, ctx) {
    const C = en.cvm, T = C.thresh;
    $("mem-cvm").textContent = bitsFmt(C.bits());
    const host = $("b-cvm");
    host.innerHTML = "";
    const ev = !ctx.inc && en.last ? en.last.cvm : null;
    const W = 360;
    const cols = T <= 50 ? Math.min(10, T) : T <= 200 ? 20 : 25;
    const rows = Math.ceil(T / cols), cw = W / cols, ch = cols <= 10 ? 22 : 15;
    const sv = S("svg", { viewBox: `0 0 ${W} ${rows * ch + 2}`, role: "img", "aria-label": `CVM buffer with ${T} slots` });
    const halve = ev && ev.halve;
    const slots = halve ? halve.before : C.slots;
    const chars = cw >= 34 ? 5 : cw >= 17 ? 2 : 0;
    for (let s = 0; s < T; s++) {
      const r = Math.floor(s / cols), c = s % cols, it = slots[s];
      let fill = it == null ? "var(--bg-2)" : "color-mix(in srgb, var(--c-bar) 45%, var(--panel-2))", ink = "var(--ink)", stroke = "var(--line-2)";
      if (halve && halve.coins[s] < 0.5) { fill = "var(--c-swap)"; ink = "#0d1117"; }
      else if (ev && !halve && ev.kept && s === ev.slot) { fill = "var(--c-done)"; ink = "#0d1117"; }
      else if (halve && it === ev.a) { stroke = "var(--c-done)"; }
      if (ctx.inc != null && it === ctx.inc) { fill = "var(--c-compare)"; ink = "#0d1117"; }
      sv.appendChild(S("rect", { x: c * cw + 1, y: r * ch + 1, width: cw - 2, height: ch - 2, rx: 3, fill, stroke, "stroke-width": stroke === "var(--line-2)" ? 0.6 : 2 }));
      if (it != null && chars) sv.appendChild(S("text", { x: c * cw + cw / 2, y: r * ch + ch / 2 + 3.5, "text-anchor": "middle", "font-size": cols <= 10 ? 10 : 8, fill: ink }, short(String(it), chars)));
    }
    host.appendChild(sv);
    let line = "";
    if (C.failed) line = `<span class="bad-t">⊥ failed</span>: a halving round evicted nothing (probability 2<sup>−${T}</sup>), so the algorithm stops.`;
    else if (ev && !ev.skipped) line = `coin u = ${ev.u.toFixed(3)} ${ev.u < ev.pBefore ? "&lt;" : "≥"} p = ${pfmt(ev.pBefore)} → ${ev.kept ? '<span class="ok-t">kept</span>' : "not kept"}` + (halve ? ` · <span class="bad-t">halving round</span>: ${halve.evicted} of ${T} evicted, p → ${pfmt(C.p)}` : "");
    else if (ctx.inc != null) line = `${q(ctx.inc)} is arriving${C.where.has(ctx.inc) ? " (already in X, yellow)" : ""}.`;
    else line = "The buffer starts empty with p = 1.";
    host.appendChild(E("div", { class: "stat", html: line }));
    const est = C.estimate();
    host.appendChild(E("div", { class: "stat", html: `|X| = ${C.size} · p = ${pfmt(C.p)} · estimate |X| / p = <b>${fmt(est)}</b> · true ${fmt(en.ex.distinct())} · error ${Number.isFinite(est) ? pct(est, en.ex.distinct()) : "—"} · seed ${C.seed}, ${fmt(C.flips)} coin flips` }));
  }

  function cmsTarget(en) {
    if (st.query != null) return st.query;
    return en.last ? en.last.x : null;
  }
  function drawCms(en, ctx) {
    const C = en.cms, d = C.d, w = C.w;
    $("mem-cms").textContent = bitsFmt(C.bits());
    const host = $("b-cms");
    host.innerHTML = "";
    const W = 360, L = 22, cw = (W - L) / w, rh = 20;
    const sv = S("svg", { viewBox: `0 0 ${W} ${d * rh + 4}`, role: "img", "aria-label": `Count–Min table with ${d} rows and ${w} columns` });
    const added = !ctx.inc && en.last ? en.last.cms : null;
    const tgt = cmsTarget(en);
    const qr = tgt != null ? C.query(tgt) : null;
    let maxV = 1;
    for (let i = 0; i < d; i++) for (let j = 0; j < w; j++) maxV = Math.max(maxV, C.C[i][j]);
    for (let i = 0; i < d; i++) {
      sv.appendChild(S("text", { x: 0, y: i * rh + 14, "font-size": 9, fill: "var(--muted)" }, "h" + i));
      for (let j = 0; j < w; j++) {
        const v = C.C[i][j];
        const isAdd = added && added[i] === j;
        const isQ = qr && qr.cols[i] === j;
        const isMin = isQ && i === qr.arg;
        const fill = isAdd ? "var(--c-swap)" : isMin ? "var(--c-done)" : heat(v, maxV);
        sv.appendChild(S("rect", { x: L + j * cw + 0.5, y: i * rh + 2, width: cw - 1, height: rh - 2, rx: 2, fill, stroke: isQ ? "var(--c-compare)" : "none", "stroke-width": isQ ? 2 : 0 }));
        if (cw >= 9) sv.appendChild(S("text", { x: L + j * cw + cw / 2, y: i * rh + 15, "text-anchor": "middle", "font-size": Math.min(10, cw * 0.48), fill: isAdd || isMin || v / maxV > 0.45 ? "#0d1117" : "var(--ink-2)" }, String(v)));
      }
    }
    host.appendChild(sv);
    const N = C.N, eps = Math.E / w;
    if (qr) {
      const f = en.ex.freq.get(tgt) || 0;
      host.appendChild(E("div", { class: "stat", html: `query ${q(tgt)}: counters ${qr.vals.join(", ")} → min = <b>${qr.est}</b> · true ${f}${qr.est > f ? ` · <span class="bad-t">+${qr.est - f} from collisions</span>` : ' · <span class="ok-t">exact</span>'}` }));
    }
    host.appendChild(E("div", { class: "stat", html: `ε = e/w = ${eps.toFixed(3)}, δ = e<sup>−d</sup> = ${Math.exp(-d).toFixed(3)}: est ≤ f + εN = f + ${(eps * N).toFixed(1)} with probability ≥ ${(1 - Math.exp(-d)).toFixed(3)}` }));
  }

  function drawMg(en, ctx) {
    const M = en.mg, k = M.k, N = M.N;
    $("mem-mg").textContent = bitsFmt(M.bits());
    const host = $("b-mg");
    host.innerHTML = "";
    const ev = !ctx.inc && en.last ? en.last.mg : null;
    const entries = [...M.T.entries()];
    const slack = N / k;
    let maxS = 4;
    entries.forEach(([x, c]) => { maxS = Math.max(maxS, c + slack, en.ex.freq.get(x) || 0); });
    const W = 360, L = 92, R = 30, rh = 18, bwMax = W - L - R;
    const rowsN = k - 1;
    const sv = S("svg", { viewBox: `0 0 ${W} ${rowsN * rh + 4}`, role: "img", "aria-label": `Misra–Gries table with ${k - 1} counters` });
    for (let r = 0; r < rowsN; r++) {
      const y = r * rh + 2;
      const e = entries[r];
      if (!e) {
        sv.appendChild(S("rect", { x: L, y: y + 2, width: bwMax, height: rh - 5, rx: 3, fill: "none", stroke: "var(--line)", "stroke-dasharray": "3 3" }));
        sv.appendChild(S("text", { x: L - 6, y: y + 12, "text-anchor": "end", "font-size": 9, fill: "var(--muted)" }, "free"));
        continue;
      }
      const [x, c] = e, f = en.ex.freq.get(x) || 0;
      const sc = (v) => (v / maxS) * bwMax;
      let fill = "var(--c-bar)";
      if (ev && ev.kind === "dec") fill = "var(--c-swap)";
      else if (ev && ev.x === x) fill = ev.kind === "new" ? "var(--c-done)" : "var(--c-compare)";
      if (ctx.inc != null && x === ctx.inc) fill = "var(--c-compare)";
      sv.appendChild(S("rect", { x: L + sc(c), y: y + 4, width: Math.max(0, sc(slack)), height: rh - 9, rx: 2, fill: "var(--steel-soft)" }));
      sv.appendChild(S("rect", { x: L, y: y + 2, width: Math.max(2, sc(c)), height: rh - 5, rx: 3, fill }));
      sv.appendChild(S("line", { x1: L + sc(f), x2: L + sc(f), y1: y + 1, y2: y + rh - 2, stroke: "var(--ink)", "stroke-width": 1.5 }));
      sv.appendChild(S("text", { x: L - 6, y: y + 12, "text-anchor": "end", "font-size": 10, fill: "var(--ink)" }, short(String(x), 12)));
      sv.appendChild(S("text", { x: W - 2, y: y + 12, "text-anchor": "end", "font-size": 10, fill: "var(--ink-2)" }, String(c)));
    }
    host.appendChild(sv);
    let line = "";
    if (ev) line = ev.kind === "inc" ? `${q(ev.x)} has a counter: +1` : ev.kind === "new" ? `${q(ev.x)} takes a free counter` : `${q(ev.x)} finds no free counter: <span class="bad-t">decrement all</span>${ev.removed.length ? " (" + ev.removed.map((y) => short(y, 12)).join(", ") + " removed)" : ""}`;
    host.appendChild(E("div", { class: "stat", html: (line ? line + " · " : "") + `N/k = ${slack.toFixed(1)} · decrement-alls: ${M.decs}` }));
  }

  function drawHH(en) {
    const host = $("b-hh");
    host.innerHTML = "";
    const top = en.ex.top(6);
    if (!top.length) { host.appendChild(E("div", { class: "stat" }, "No items yet.")); return; }
    const N = en.t, slack = N / st.cfg.k;
    const tab = E("table", { class: "t hh" }, E("tr", null, E("th", null, "item"), E("th", null, "true"), E("th", null, "Count–Min"), E("th", null, "Misra–Gries"), E("th", { title: "true count inside [c, c + N/k]?" }, "in band")));
    top.forEach(([x, f]) => {
      const cm = en.cms.query(x).est;
      const mg = en.mg.T.get(x);
      const c = mg || 0;
      const inBand = f >= c && f <= c + slack + 1e-9;
      tab.appendChild(E("tr", { onclick: () => { st.query = x; $("q").value = x; rerender(); }, title: "Query " + x },
        E("td", null, short(x, 16)), E("td", null, String(f)),
        E("td", { html: cm > f ? `${cm} <span class="bad-t">+${cm - f}</span>` : `${cm}` }),
        E("td", null, mg ? String(mg) : "—"),
        E("td", { html: inBand ? '<span class="ok-t">✓</span>' : '<span class="bad-t">✗</span>' })));
    });
    host.appendChild(tab);
    host.appendChild(E("div", { class: "note" }, `Heavy hitter threshold N/k = ${slack.toFixed(1)}: every item above it must appear in the Misra–Gries column.`));
  }

  /* ---------------- chart: estimate vs truth ---------------- */
  function drawTimeChart(t) {
    const svg = $("tchart");
    const W = 640, H = 230, L = 54, R = 12, T = 12, B = 30;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = "";
    const N = st.stream.length || 1;
    const ser = st.series;
    let ymax = 1;
    ser.forEach((p) => { ymax = Math.max(ymax, p.truth, Number.isFinite(p.hll) ? p.hll : 0, Number.isFinite(p.cvm) ? p.cvm : 0); });
    ymax *= 1.08;
    const X = (v) => L + (v / N) * (W - L - R), Y = (v) => H - B - (v / ymax) * (H - T - B);
    for (let k = 0; k <= 4; k++) {
      const v = (ymax / 4) * k, y = Y(v);
      svg.appendChild(S("line", { x1: L, x2: W - R, y1: y, y2: y, stroke: "var(--line)", "stroke-width": 1 }));
      svg.appendChild(S("text", { x: L - 6, y: y + 4, "text-anchor": "end", "font-size": 10, fill: "var(--muted)" }, fmt(v)));
    }
    for (let k = 0; k <= 4; k++) svg.appendChild(S("text", { x: X((N / 4) * k), y: H - 10, "text-anchor": k === 0 ? "start" : k === 4 ? "end" : "middle", "font-size": 10, fill: "var(--muted)" }, fmt((N / 4) * k)));
    svg.appendChild(S("text", { x: (L + W - R) / 2, y: H - 1, "text-anchor": "middle", "font-size": 9, fill: "var(--muted)" }, "items read"));
    const upto = ser.filter((p) => p.t <= t);
    if (t > 0 && (!upto.length || upto[upto.length - 1].t < t) && st.live && st.live.t === t) upto.push({ t, truth: st.live.ex.distinct(), hll: st.live.hll.estimate().est, cvm: st.live.cvm.estimate() });
    const line = (key, col, dash) => {
      const pts = upto.filter((p) => Number.isFinite(p[key])).map((p) => `${X(p.t).toFixed(1)},${Y(p[key]).toFixed(1)}`);
      if (pts.length > 1) svg.appendChild(S("polyline", { points: pts.join(" "), fill: "none", stroke: col, "stroke-width": key === "truth" ? 2.5 : 2, "stroke-dasharray": dash || null }));
    };
    line("truth", "var(--c-done)");
    line("hll", "var(--steel)");
    line("cvm", "var(--c-pivot)", "5 3");
    svg.appendChild(S("line", { x1: X(t), x2: X(t), y1: T, y2: H - B, stroke: "var(--ember)", "stroke-width": 1, "stroke-dasharray": "3 3" }));
  }

  /* ---------------- side panels ---------------- */
  function counters(key, obj) {
    if (st.lastFocusCtr !== key) { $("ctr").innerHTML = ""; ctr = Forge.counters($("ctr"), obj); st.lastFocusCtr = key; }
    ctr.set(obj);
  }
  function side(en, ctx) {
    const f = st.focus, c = st.cfg, L = en.last, inc = ctx.inc;
    const code = codes.show(f, LINES[f]);
    const truth = en.ex.distinct();
    const base = { items: fmt(en.t), "distinct (true)": fmt(truth) };
    let text = "", hl = [];
    const batch = L && L.from < L.t && L.t - L.from < st.cfg.step ? ` <span class="muted">(This step read items ${fmt(L.from)}–${fmt(L.t)}; the cards show the last one.)</span>` : "";
    const head = inc != null ? `Item ${fmt(en.t + 1)}, ${q(inc)}, is arriving. ` : L ? `Item ${fmt(L.t)} is ${q(L.x)}${L.ex.isNew ? " (new)" : ` (seen ${L.ex.count} times now)`}. ` : "";
    if (!L && inc == null) {
      say.say(`The stream is ready: ${fmt(st.stream.length)} items. All five summaries start empty. Press ▶ (or →) and watch each one react to the same items. ${NAMES[f]} is explained here; click another card title to switch.`);
      code.highlight(f === "cvm" ? [1, 2] : f === "exact" ? [1] : []);
      counters(f, focusCounters(f, en, base));
      return;
    }
    if (f === "exact") {
      if (inc != null) { text = head + "Is it in the set yet?"; hl = [2, 3]; }
      else if (L.ex.isNew) { text = head + `It was not in the set, so the set grows to <b>${fmt(truth)}</b>. Exact counting must remember every distinct item: its memory grows with the answer, which is exactly what sketches avoid.`; hl = [2, 3, 4]; }
      else { text = head + "It is already in the set, so nothing changes: a duplicate never changes a distinct count."; hl = [2, 3]; }
    } else if (f === "hll") {
      const H = en.hll, e = H.estimate();
      if (inc != null) {
        const pp = H.parts(inc);
        text = head + (ctx.kind === "hllReg" ? `Its hash is shown bit by bit. The low ${H.b} bits (purple) are the register index.` : `It goes to register M[${pp.j}] = ${H.M[pp.j]}.`) + " Answer the 🤔 question, then step forward.";
        hl = [1, 2, 3, 4];
      } else {
        const p = L.hll;
        text = head + `Its hash is ${bin(p.h, 32).slice(0, 32 - H.b)}<span style="color:var(--c-pivot)">${bin(p.h, 32).slice(32 - H.b)}</span>. The low ${H.b} bits give register <b>j = ${p.j}</b>; the other ${32 - H.b} bits start with ${plural(p.rho - 1, "zero")}, so <b>ρ = ${p.rho}</b>. ` +
          (p.changed ? `That beats M[${p.j}] = ${p.old}, so M[${p.j}] becomes ${p.rho}. ` : `M[${p.j}] is already ${p.old} ≥ ρ, so nothing changes. `) +
          (!L.ex.isNew ? "(A repeated item always hashes the same, so it can never change anything.) " : "") +
          (e.mode === "linear" ? `Estimate: ${e.V} of ${H.m} registers are still 0 and the raw estimate ${fmt1(e.raw)} ≤ 2.5m, so use linear counting m · ln(m/V) = <b>${fmt1(e.est)}</b>.` : `Estimate: the bias-corrected harmonic mean α·m²/Z = <b>${fmt(e.est)}</b>.`) +
          ` True: ${fmt(truth)} (${pct(e.est, truth)}).`;
        hl = [1, 2, 3, 4, 5].concat(p.changed ? [6] : [], e.mode === "linear" ? [12, 13] : [14]);
      }
    } else if (f === "cvm") {
      const C = en.cvm, ev = L ? L.cvm : null;
      if (inc != null) { text = head + `X holds ${C.size} of ${C.thresh} and p = ${pfmt(C.p)}. ${C.where.has(inc) ? "It is already in X, so it will be removed first." : "It is not in X."} Answer the 🤔 question, then step forward.`; hl = [4, 5, 6, 7]; }
      else if (C.failed && (!ev || ev.skipped)) { text = head + "CVM already failed (⊥) earlier in the stream and stopped. Pick a larger thresh: the failure probability is 2<sup>−thresh</sup> per halving round."; hl = [11, 12]; }
      else {
        text = head + (ev.had ? "It was in X, so its old coin flip is forgotten: it is removed first. " : "") +
          `Fresh coin u = ${ev.u.toFixed(3)} ${ev.u < ev.pBefore ? "&lt;" : "≥"} p = ${pfmt(ev.pBefore)}, so it is <b>${ev.kept ? "kept" : "not kept"}</b>. ` +
          (ev.halve ? `X reached thresh = ${C.thresh}: a <b>halving round</b> flips one coin per stored item and evicts ${ev.halve.evicted} (red); p halves to ${pfmt(C.p)}. Now every distinct item seen so far is in X with probability ${pfmt(C.p)}. ` : "") +
          (ev.failed ? "Every coin said keep, so X is still full: the algorithm outputs ⊥ (failure). " : "") +
          (Number.isFinite(C.estimate()) ? `Estimate |X| / p = ${C.size} / ${pfmt(C.p)} = <b>${fmt(C.estimate())}</b>; true ${fmt(truth)}.` : "");
        hl = [4, 5].concat(ev.kept ? [6] : [], ev.halve ? [7, 8, 9, 10] : [], ev.failed ? [11, 12] : []);
      }
    } else if (f === "cms") {
      const C = en.cms, tgt = cmsTarget(en);
      const qr = tgt != null ? C.query(tgt) : null, fq = tgt != null ? en.ex.freq.get(tgt) || 0 : 0;
      if (inc != null) { text = head + "Count–Min will add 1 to one counter per row."; hl = [1, 2]; }
      else {
        text = head + `It adds 1 to one counter in each of the ${C.d} rows (columns ${L.cms.join(", ")}, red). `;
        if (qr) text += `Point query for ${q(tgt)}${st.query != null ? " (your query)" : ""}: its counters read ${qr.vals.join(", ")}; the minimum <b>${qr.est}</b> is the estimate, true count ${fq}` +
          (qr.est > fq ? `: <b>${qr.est - fq} too high</b>, because other items share a cell with it in every row.` : ": exact, because at least one of its cells has no collision.") +
          ` Guarantee: at most f + εN = ${fq} + ${(Math.E / C.w * C.N).toFixed(1)} with probability at least ${(1 - Math.exp(-C.d)).toFixed(3)}.`;
        hl = [1, 2, 5, 6, 7, 8];
      }
    } else if (f === "mg") {
      const M = en.mg, ev = L ? L.mg : null;
      if (inc != null) { text = head + "Does it already have a counter?"; hl = [1]; }
      else {
        text = head + (ev.kind === "inc" ? `It already has a counter, which goes up to ${M.T.get(ev.x)}.` :
          ev.kind === "new" ? `It has no counter but one is free, so it gets ${q(ev.x)} ↦ 1 (${M.T.size} of ${M.k - 1} in use).` :
            `It has no counter and all ${M.k - 1} are taken, so <b>every counter drops by 1</b>${ev.removed.length ? " and " + ev.removed.map(q).join(", ") + (ev.removed.length === 1 ? " reaches 0 and is removed" : " reach 0 and are removed") : ""}. That cancels ${M.k} different occurrences at once (the ${M.k - 1} tracked items and this one), so it can happen at most N/k times.`) +
          ` Any item with more than N/k = ${(M.N / M.k).toFixed(1)} occurrences is guaranteed to have a counter.`;
        hl = ev.kind === "inc" ? [1, 2] : ev.kind === "new" ? [1, 3, 4] : [1, 3, 5, 6, 7, 8];
      }
    }
    say.say(text + batch);
    code.highlight(hl);
    counters(f, focusCounters(f, en, base));
  }
  function focusCounters(f, en, base) {
    const o = Object.assign({}, base);
    const truth = en.ex.distinct();
    if (f === "exact") { o["memory (bits)"] = fmt(32 * truth); o["set lookups"] = fmt(en.t); }
    else if (f === "hll") { const e = en.hll.estimate(); o.estimate = fmt(e.est); o.error = pct(e.est, truth); o.mode = e.mode === "linear" ? "linear" : "harmonic"; o["±1.04/√m"] = (104 / Math.sqrt(en.hll.m)).toFixed(1) + "%"; o["memory (bits)"] = fmt(en.hll.bits()); }
    else if (f === "cvm") { const C = en.cvm; o.p = pfmt(C.p); o["|X| / thresh"] = C.size + " / " + C.thresh; o.estimate = fmt(C.estimate()); o.halvings = C.halvings; o["coin flips"] = fmt(C.flips); o["memory (bits)"] = fmt(C.bits()); }
    else if (f === "cms") { const C = en.cms; o["d × w"] = C.d + " × " + C.w; o["ε = e/w"] = (Math.E / C.w).toFixed(3); o["δ = e^−d"] = Math.exp(-C.d).toFixed(3); o["εN"] = (Math.E / C.w * C.N).toFixed(1); o["memory (bits)"] = fmt(C.bits()); }
    else if (f === "mg") { const M = en.mg; o["counters used"] = M.T.size + " / " + (M.k - 1); o["N/k"] = (M.N / M.k).toFixed(1); o["decrement-alls"] = M.decs; o["memory (bits)"] = fmt(M.bits()); }
    return o;
  }
  function rerender() { if (player && st.frames.length) render(st.frames[player.index]); }

  /* ---------------- experiment: error vs memory ---------------- */
  function runExperiment() {
    const note = $("expNote");
    note.textContent = "Running 288 sketches…";
    $("expRun").disabled = true;
    setTimeout(() => {
      const t0 = performance.now();
      const data = $("expData").value === "cur" ? st.stream : K.uniformStream(50000, 9, 200000);
      const res = K.errorVsMemory(data, { seeds: 16, bs: [4, 5, 6, 7, 8, 9, 10, 11, 12], ts: [8, 16, 32, 64, 128, 256, 512, 1024, 2048] });
      note.textContent = `${fmt(data.length)} items, ${fmt(res.truth)} distinct · ${Math.round(performance.now() - t0)} ms`;
      $("expRun").disabled = false;
      drawExpChart(res);
      const tab = $("etab");
      tab.innerHTML = "";
      tab.appendChild(E("tr", null, E("th", null, "HLL m"), E("th", null, "bits"), E("th", null, "measured"), E("th", null, "1.04/√m"), E("th", null, "CVM thresh"), E("th", null, "bits"), E("th", null, "measured")));
      for (let i = 0; i < Math.max(res.hll.length, res.cvm.length); i++) {
        const h = res.hll[i], c = res.cvm[i];
        tab.appendChild(E("tr", null,
          E("td", null, h ? fmt(h.m) : ""), E("td", null, h ? fmt(h.bits) : ""), E("td", null, h ? (h.rmse * 100).toFixed(1) + "%" : ""), E("td", null, h ? (h.theory * 100).toFixed(1) + "%" : ""),
          E("td", null, c ? fmt(c.thresh) : ""), E("td", null, c ? fmt(c.bits) : ""), E("td", null, c ? (Number.isFinite(c.rmse) ? (c.rmse * 100).toFixed(1) + "%" : "—") + (c.fails ? ` (${c.fails} ⊥)` : "") : "")));
      }
    }, 30);
  }
  function drawExpChart(res) {
    const svg = $("echart");
    svg.removeAttribute("hidden"); $("eLegend").hidden = false;
    const W = 640, H = 280, L = 54, R = 14, T = 12, B = 34;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = "";
    const x0 = 6, x1 = 17, y0 = Math.log10(0.003), y1 = Math.log10(1.5);
    const X = (bits) => L + ((Math.log2(bits) - x0) / (x1 - x0)) * (W - L - R);
    const Y = (e) => H - B - ((Math.log10(Math.max(e, 0.003)) - y0) / (y1 - y0)) * (H - T - B);
    [0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1].forEach((e) => {
      svg.appendChild(S("line", { x1: L, x2: W - R, y1: Y(e), y2: Y(e), stroke: "var(--line)" }));
      svg.appendChild(S("text", { x: L - 6, y: Y(e) + 4, "text-anchor": "end", "font-size": 10, fill: "var(--muted)" }, (e * 100) + "%"));
    });
    for (let k = x0; k <= x1; k++) {
      svg.appendChild(S("line", { x1: X(2 ** k), x2: X(2 ** k), y1: T, y2: H - B, stroke: "var(--line)", "stroke-dasharray": "2 4" }));
      if (k % 2 === 0) svg.appendChild(S("text", { x: X(2 ** k), y: H - 18, "text-anchor": "middle", "font-size": 10, fill: "var(--muted)" }, (2 ** k).toLocaleString("en-US")));
    }
    svg.appendChild(S("text", { x: (L + W - R) / 2, y: H - 3, "text-anchor": "middle", "font-size": 10, fill: "var(--muted)" }, "memory in bits (log scale) · y: relative error (log scale)"));
    const th = [];
    for (let k = x0; k <= x1; k += 0.25) { const m = 2 ** k / 5; th.push(`${X(2 ** k).toFixed(1)},${Y(1.04 / Math.sqrt(m)).toFixed(1)}`); }
    svg.appendChild(S("polyline", { points: th.join(" "), fill: "none", stroke: "var(--steel)", "stroke-width": 1.5, "stroke-dasharray": "5 4", opacity: 0.8 }));
    res.hll.forEach((h) => svg.appendChild(S("circle", { cx: X(h.bits), cy: Y(h.rmse), r: 4.5, fill: "var(--steel)" })));
    const cp = res.cvm.filter((c) => Number.isFinite(c.rmse));
    if (cp.length > 1) svg.appendChild(S("polyline", { points: cp.map((c) => `${X(c.bits).toFixed(1)},${Y(c.rmse).toFixed(1)}`).join(" "), fill: "none", stroke: "var(--c-pivot)", "stroke-width": 1.5 }));
    cp.forEach((c) => svg.appendChild(S("rect", { x: X(c.bits) - 4, y: Y(c.rmse) - 4, width: 8, height: 8, fill: "var(--c-pivot)" })));
  }

  /* ---------------- wiring ---------------- */
  $("n").addEventListener("input", () => { $("nOut").textContent = (+$("n").value).toLocaleString("en-US"); });
  $("n").addEventListener("change", () => build());
  $("preset").addEventListener("change", () => {
    const custom = $("preset").value === "custom";
    $("customBox").hidden = !custom; $("nField").hidden = custom;
    st.query = null; $("q").value = "";
    build();
  });
  $("build").addEventListener("click", () => build());
  $("reseed").addEventListener("click", () => { $("seed").value = 1 + Math.floor(Math.random() * 9999); build(player ? st.frames[player.index].t : null); });
  $("seed").addEventListener("change", () => build());
  ["hb", "thresh", "cd", "cw", "mk", "step"].forEach((id) => $(id).addEventListener("change", () => build(player && st.frames.length ? st.frames[player.index].t : null)));
  document.querySelectorAll("[data-f]").forEach((b) => {
    if (b.tagName !== "BUTTON") return;
    b.addEventListener("click", () => { setFocus(b.dataset.f); rerender(); });
  });
  const doQuery = () => { const v = $("q").value.trim().toLowerCase(); st.query = v || null; if (st.query) setFocus("cms"); rerender(); };
  $("qGo").addEventListener("click", doQuery);
  $("q").addEventListener("keydown", (e) => { if (e.key === "Enter") doQuery(); });
  $("qClear").addEventListener("click", () => { st.query = null; $("q").value = ""; rerender(); });
  $("expRun").addEventListener("click", runExperiment);

  setFocus("hll");
  build();
})();
