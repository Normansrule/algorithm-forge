/* Algorithm Forge · Bin packing: Next Fit, First Fit, First-Fit Decreasing, Best Fit.
   Sizes are stored as integers in thousandths so that 0.6 + 0.4 is exactly 1. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const E = Forge.el, S = Forge.svg;
  Forge.page({ title: "Bin Packing", chapter: "Ch 12 · Coping with Limitations" });

  const CAP = 1000;
  const show = (v) => (v / CAP).toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  const fmt = (v) => show(v).replace(/^0\./, ".");
  const NAMES = { nf: "Next Fit (NF)", ff: "First Fit (FF)", ffd: "First-Fit Decreasing (FFD)", bf: "Best Fit (BF)" };
  const SHORT = { nf: "NF", ff: "FF", ffd: "FFD", bf: "BF" };

  const CODE = {
    nf: [
      "ALGORITHM NextFit(s[1..n])",
      "    k ← 1;  load[1] ← 0     // one open bin",
      "    for i ← 1 to n do",
      "        if load[k] + s[i] ≤ 1 then",
      "            load[k] ← load[k] + s[i]",
      "        else                // close bin k",
      "            k ← k + 1;  load[k] ← s[i]",
      "    return k",
    ],
    ff: [
      "ALGORITHM FirstFit(s[1..n])",
      "    k ← 0                   // bins opened",
      "    for i ← 1 to n do",
      "        j ← 1",
      "        while j ≤ k and load[j] + s[i] > 1 do",
      "            j ← j + 1",
      "        if j > k then",
      "            k ← k + 1;  load[k] ← 0",
      "        load[j] ← load[j] + s[i]",
      "    return k",
    ],
    ffd: [
      "ALGORITHM FirstFitDecreasing(s[1..n])",
      "    sort s into nonincreasing order",
      "    k ← 0",
      "    for i ← 1 to n do",
      "        j ← 1",
      "        while j ≤ k and load[j] + s[i] > 1 do",
      "            j ← j + 1",
      "        if j > k then",
      "            k ← k + 1;  load[k] ← 0",
      "        load[j] ← load[j] + s[i]",
      "    return k",
    ],
    bf: [
      "ALGORITHM BestFit(s[1..n])",
      "    k ← 0",
      "    for i ← 1 to n do",
      "        b ← 0               // none yet",
      "        for j ← 1 to k do",
      "            if load[j] + s[i] ≤ 1 and",
      "               (b = 0 or load[j] > load[b])",
      "                then b ← j   // fullest bin that fits",
      "        if b = 0 then",
      "            k ← k + 1;  load[k] ← 0;  b ← k",
      "        load[b] ← load[b] + s[i]",
      "    return k",
    ],
  };
  // pseudocode line indices per step kind
  const LN = {
    nf: { start: 1, next: 2, check: 3, fit: [3, 4], nofit: [5, 6], place: [3, 4], open: [5, 6], end: 7 },
    ff: { start: 1, next: [2, 3], check: 4, nofit: [4, 5], fit: 4, open: [6, 7, 8], place: 8, end: 9 },
    ffd: { sort: 1, start: 2, next: [3, 4], check: 5, nofit: [5, 6], fit: 5, open: [7, 8, 9], place: 9, end: 10 },
    bf: { start: 1, next: [2, 3], check: [4, 5, 6], nofit: [4, 5], fit: [5, 6, 7], open: [8, 9, 10], place: 10, end: 11 },
  };

  let alg = "ff", items = [400, 200, 600, 700], code, ctr, player = null, knownOpt = null;
  const say = Forge.narrate($("say"));
  const stage = $("stage");
  const answered = {};
  const lbOf = (arr) => Math.ceil(arr.reduce((s, x) => s + x, 0) / CAP - 1e-9);

  /* ------------------------------------------------------------------ fast versions (for tables & experiments) */
  function pack(kind, arr) {
    const s = kind === "ffd" ? arr.slice().sort((a, b) => b - a) : arr;
    const load = [];
    for (const x of s) {
      if (kind === "nf") {
        if (load.length && load[load.length - 1] + x <= CAP) load[load.length - 1] += x; else load.push(x);
      } else if (kind === "bf") {
        let b = -1;
        for (let j = 0; j < load.length; j++) if (load[j] + x <= CAP && (b < 0 || load[j] > load[b])) b = j;
        if (b < 0) load.push(x); else load[b] += x;
      } else {
        let j = 0;
        while (j < load.length && load[j] + x > CAP) j++;
        if (j === load.length) load.push(x); else load[j] += x;
      }
    }
    return load.length;
  }
  /** Exact minimum by backtracking (items sorted decreasingly; symmetric bins skipped). null if too big. */
  function optimum(arr) {
    if (arr.length > 14) return null;
    const s = arr.slice().sort((a, b) => b - a);
    let best = pack("ffd", s), steps = 0;
    const lb = lbOf(s);
    if (best === lb) return best;
    const load = [];
    (function go(i) {
      if (best === lb || ++steps > 400000) return;
      if (i === s.length) { best = Math.min(best, load.length); return; }
      const tried = new Set();
      for (let j = 0; j < load.length; j++) {
        if (load[j] + s[i] <= CAP && !tried.has(load[j])) {
          tried.add(load[j]);
          load[j] += s[i]; go(i + 1); load[j] -= s[i];
        }
      }
      if (load.length + 1 < best) { load.push(s[i]); go(i + 1); load.pop(); }
    })(0);
    return steps > 400000 ? null : best;
  }

  /* ------------------------------------------------------------------ recorder */
  function record(kind, arr) {
    const L = LN[kind];
    const order = kind === "ffd" ? arr.map((x, k) => ({ x, k })).sort((a, b) => b.x - a.x || a.k - b.k) : arr.map((x, k) => ({ x, k }));
    const bins = [], frames = [];
    let checks = 0, closed = kind === "nf" ? 0 : -1;
    const lb = lbOf(arr);
    const push = (line, text, st) => frames.push(Object.assign({ line, text, bins: bins.map((b) => b.slice()), c: { "bins used": bins.length, "lower bound ⌈Σ⌉": lb, "fit checks": checks }, closed, order, i: -1 }, st));
    if (kind === "ffd") push(L.sort, `First-Fit Decreasing starts by sorting the items largest first: ${order.map((o) => show(o.x)).join(", ")}. Big items get placed while there is still lots of choice.`, {});
    push(L.start, `${arr.length} items, total size ${show(arr.reduce((a, b) => a + b, 0))}. Any packing needs at least ⌈Σ⌉ = <b>${lb}</b> bins. ${NAMES[kind]} begins.`, {});
    order.forEach((o, i) => {
      const x = o.x;
      const load = bins.map((b) => b.reduce((s, y) => s + y.x, 0));
      // predicted answer
      let target;
      if (kind === "nf") target = bins.length && load[bins.length - 1] + x <= CAP ? bins.length - 1 : bins.length;
      else if (kind === "bf") { target = -1; load.forEach((l, j) => { if (l + x <= CAP && (target < 0 || l > load[target])) target = j; }); if (target < 0) target = bins.length; }
      else { target = 0; while (target < bins.length && load[target] + x > CAP) target++; }
      const opts = bins.map((_, j) => "bin " + (j + 1)).concat(["new bin"]);
      const why = target === bins.length ? `No open bin that ${NAMES[kind].split(" (")[0]} may use has room for ${show(x)}.` :
        kind === "bf" ? `Bin ${target + 1} fits and would be left fullest (load ${show(load[target])} → ${show(load[target] + x)}).` :
        kind === "nf" ? `Next Fit only looks at the newest bin, and ${show(x)} fits there.` : `Bin ${target + 1} is the first (leftmost) with room.`;
      push(L.next, `Item ${i + 1}: size <b>${show(x)}</b>. Where does it go?`, { i, ask: { q: `${NAMES[kind]}: where does the item of size ${show(x)} go?`, opts, ans: target, why } });
      if (kind === "nf") {
        if (bins.length) {
          const j = bins.length - 1;
          checks++;
          if (load[j] + x <= CAP) {
            bins[j].push({ x, k: o.k, i });
            push(L.fit, `Only the current bin ${j + 1} is open: ${show(load[j])} + ${show(x)} = ${show(load[j] + x)} ≤ 1, so it goes there.`, { i, hot: j, placed: [j, bins[j].length - 1] });
            return;
          }
          push(L.check, `Current bin ${j + 1} has ${show(load[j])}; ${show(load[j])} + ${show(x)} = ${show(load[j] + x)} > 1. It doesn't fit.`, { i, hot: j, bad: j });
          closed = bins.length;
        }
        bins.push([{ x, k: o.k, i }]);
        push(L.nofit, bins.length === 1 ? `Open bin 1 for the first item.` : `Next Fit <b>closes</b> bin ${bins.length - 1} for good and opens bin ${bins.length}, even if some earlier bin had room.`, { i, hot: bins.length - 1, placed: [bins.length - 1, 0], closed });
        return;
      }
      if (kind === "bf") {
        let b = -1;
        for (let j = 0; j < bins.length; j++) {
          checks++;
          const fits = load[j] + x <= CAP;
          const better = fits && (b < 0 || load[j] > load[b]);
          if (better) b = j;
          push(fits ? L.fit : L.nofit, fits ? `Bin ${j + 1}: ${show(load[j])} + ${show(x)} = ${show(load[j] + x)} ≤ 1 fits, leaving ${show(CAP - load[j] - x)} free.` + (better ? ` Fullest fit so far → candidate.` : ` But bin ${b + 1} would be fuller.`) : `Bin ${j + 1}: ${show(load[j])} + ${show(x)} > 1, no room.`, { i, hot: j, bad: fits ? null : j, cand: b });
        }
        if (b < 0) {
          bins.push([{ x, k: o.k, i }]);
          push(L.open, `No bin fits: open bin ${bins.length}.`, { i, hot: bins.length - 1, placed: [bins.length - 1, 0] });
        } else {
          bins[b].push({ x, k: o.k, i });
          push(L.place, `Put ${show(x)} into bin ${b + 1}, the bin that is left fullest (${show(load[b] + x)}).`, { i, hot: b, placed: [b, bins[b].length - 1] });
        }
        return;
      }
      // FF / FFD
      let j = 0;
      while (j < bins.length) {
        checks++;
        if (load[j] + x <= CAP) break;
        push(L.nofit, `Bin ${j + 1}: ${show(load[j])} + ${show(x)} = ${show(load[j] + x)} > 1. Try the next bin.`, { i, hot: j, bad: j });
        j++;
      }
      if (j === bins.length) {
        bins.push([{ x, k: o.k, i }]);
        push(L.open, bins.length === 1 ? `No bins yet: open bin 1 and put ${show(x)} in it.` : `No existing bin has room: open bin ${bins.length}.`, { i, hot: j, placed: [j, 0] });
      } else {
        bins[j].push({ x, k: o.k, i });
        push(L.place, `Bin ${j + 1}: ${show(load[j])} + ${show(x)} = ${show(load[j] + x)} ≤ 1. First bin with room, so put it there.`, { i, hot: j, placed: [j, bins[j].length - 1] });
      }
    });
    const opt = optimum(arr);
    const k = bins.length;
    const fin = `<b>Done:</b> ${NAMES[kind]} used <b>${k}</b> bins; lower bound ⌈Σ⌉ = ${lb}, so bins / ⌈Σ⌉ = ${(k / lb).toFixed(3)}.` + (opt ? ` The true optimum is ${opt} bins, so r = ${k}/${opt} = <b>${(k / opt).toFixed(3)}</b>.` : "");
    push(L.end, fin, { final: true });
    return frames;
  }

  /* ------------------------------------------------------------------ drawing */
  function draw(f) {
    const nb = Math.max(4, f.maxBins || 4);
    const W = 800, top = 78, hB = 300, H = top + hB + 40;
    stage.setAttribute("viewBox", `0 0 ${W} ${H}`);
    stage.innerHTML = "";
    // queue strip
    const n = f.order.length, qw = Math.min(56, (W - 20) / n);
    stage.appendChild(S("text", { x: 10, y: 14, "font-size": 12, fill: "var(--muted)" }, "items in processing order:"));
    f.order.forEach((o, k) => {
      const done = k < f.i || (k === f.i && f.placed);
      const curr = k === f.i;
      stage.appendChild(S("rect", { x: 10 + k * qw + 1, y: 22, width: qw - 2, height: 30, rx: 5, fill: curr ? "var(--c-compare)" : done ? "var(--c-dim)" : "var(--panel-2)", stroke: "var(--line-2)" }));
      if (qw >= 22) stage.appendChild(S("text", { x: 10 + k * qw + qw / 2, y: 42, "text-anchor": "middle", "font-size": qw >= 40 ? 12 : 9, style: curr ? "fill:#0d1117" : done ? "fill:var(--muted)" : "" }, fmt(o.x)));
    });
    // bins
    const bw = Math.min(110, (W - 20) / nb);
    const y0 = top + hB;
    const Y = (v) => y0 - (hB * v) / CAP;
    for (let j = 0; j < nb; j++) {
      const x = 10 + j * bw;
      const exists = j < f.bins.length;
      const isClosed = f.closed >= 0 && j < f.closed;
      const hot = f.hot === j, bad = f.bad === j;
      stage.appendChild(S("rect", { x: x + 3, y: top, width: bw - 6, height: hB, rx: 6, fill: exists ? (isClosed ? "var(--c-dim)" : "var(--bg)") : "none", opacity: exists ? (isClosed ? 0.35 : 1) : 1, stroke: bad ? "var(--c-swap)" : hot ? "var(--c-compare)" : exists ? "var(--line-2)" : "var(--line)", "stroke-width": bad || hot ? 3.5 : 1.5, "stroke-dasharray": exists ? "" : "4 5" }));
      if (!exists) continue;
      let acc = 0;
      f.bins[j].forEach((it, m) => {
        const justPlaced = f.placed && f.placed[0] === j && f.placed[1] === m;
        const yTop = Y(acc + it.x);
        stage.appendChild(S("rect", { x: x + 7, y: yTop + 1, width: bw - 14, height: Math.max(1, Y(acc) - yTop - 2), rx: 4, fill: justPlaced ? "var(--c-active)" : "var(--c-bar)", opacity: isClosed ? 0.55 : 1 }));
        if (Y(acc) - yTop > 14 && bw > 30) stage.appendChild(S("text", { x: x + bw / 2, y: (yTop + Y(acc)) / 2 + 4, "text-anchor": "middle", "font-size": bw > 60 ? 13 : 10, "font-weight": 700, style: "fill:#0d1117" }, fmt(it.x)));
        acc += it.x;
      });
      if (f.i >= 0 && hot && !f.placed) {
        // ghost of the current item on top of this bin
        const x0 = f.order[f.i].x;
        const yT = Y(acc + x0);
        stage.appendChild(S("rect", { x: x + 7, y: Math.max(top - 30, yT) + 1, width: bw - 14, height: Math.max(1, Y(acc) - Math.max(top - 30, yT) - 2), rx: 4, fill: bad ? "var(--c-swap)" : "var(--c-compare)", opacity: 0.6, "stroke-dasharray": "4 3", stroke: bad ? "var(--c-swap)" : "var(--c-compare)" }));
      }
      if (f.cand === j) stage.appendChild(S("text", { x: x + bw / 2, y: top - 6, "text-anchor": "middle", "font-size": 11, fill: "var(--c-done)", "font-weight": 700 }, "best so far"));
      stage.appendChild(S("text", { x: x + bw / 2, y: y0 + 18, "text-anchor": "middle", "font-size": 12, fill: "var(--ink-2)" }, "bin " + (j + 1)));
      stage.appendChild(S("text", { x: x + bw / 2, y: y0 + 33, "text-anchor": "middle", "font-size": 10, fill: "var(--muted)" }, show(acc)));
    }
    stage.appendChild(S("line", { x1: 6, y1: top, x2: 10 + nb * bw, y2: top, stroke: "var(--ember)", "stroke-dasharray": "6 5", "stroke-width": 1.5 }));
    stage.appendChild(S("text", { x: 10 + nb * bw - 4, y: top - 6, "text-anchor": "end", "font-size": 11, fill: "var(--ember)" }, "capacity 1"));
  }

  /* ------------------------------------------------------------------ predict */
  function showAsk(f, i) {
    const box = $("ask");
    if (!f.ask || !$("predict").checked) { box.hidden = true; box.innerHTML = ""; return; }
    const a = f.ask, key = alg + ":" + i, got = answered[key];
    box.hidden = false;
    box.innerHTML = "";
    box.appendChild(E("div", { class: "panel-title" }, "🤔 Predict before you step"));
    box.appendChild(E("p", { html: a.q }));
    const row = E("div", { class: "row" });
    a.opts.forEach((o, k) => {
      const cls = got == null ? "btn sm" : k === a.ans ? "btn sm pick-ok" : k === got ? "btn sm pick-bad" : "btn sm";
      row.appendChild(E("button", { class: cls, disabled: got != null, onclick: () => { answered[key] = k; showAsk(f, i); } }, o));
    });
    box.appendChild(row);
    if (got == null) { if (player) player.pause(); return; }
    box.appendChild(E("div", { class: "callout fb " + (got === a.ans ? "ok" : "bad"), html: (got === a.ans ? "<b>✔ Right.</b> " : `<b>✘ Not quite: it's “${a.opts[a.ans]}”.</b> `) + a.why }));
    box.appendChild(E("div", { class: "row", style: { marginTop: "8px" } }, E("button", { class: "btn primary sm", onclick: () => player.go(i + 1) }, "Show me ▶|")));
  }

  /* ------------------------------------------------------------------ comparison table */
  function buildTable() {
    const t = $("res");
    t.innerHTML = "";
    const lb = lbOf(items);
    const res = {};
    ["nf", "ff", "ffd", "bf"].forEach((k) => (res[k] = pack(k, items)));
    let opt = optimum(items);
    if (opt == null && knownOpt) opt = knownOpt;
    if (opt == null && Object.values(res).some((v) => v === lb)) opt = lb;
    t.appendChild(E("tr", null, E("th", null, "rule"), E("th", { class: "n" }, "bins"), E("th", { class: "n" }, "bins / ⌈Σ⌉"), E("th", { class: "n" }, opt ? "r = bins / OPT" : "OPT unknown")));
    ["nf", "ff", "ffd", "bf"].forEach((k) => {
      t.appendChild(E("tr", { class: k === alg ? "on" : "" },
        E("td", null, E("button", { onclick: () => { $("alg").value = k; alg = k; run(); } }, NAMES[k])),
        E("td", { class: "n" }, String(res[k])), E("td", { class: "n" }, (res[k] / lb).toFixed(3)), E("td", { class: "n" }, opt ? (res[k] / opt).toFixed(3) : "—")));
    });
    $("resNote").textContent = `Σ sizes = ${show(items.reduce((a, b) => a + b, 0))}, lower bound ⌈Σ⌉ = ${lb}` + (opt ? `, optimum OPT = ${opt} bins${items.length > 14 ? (knownOpt ? " (known from how the instance was built: 6 bins of .51 + .26 + .23 and 3 bins of .27 + .27 + .23 + .23)" : " (a rule reached the lower bound, so that is optimal)") : " (found by exhaustive backtracking)"}.` : ". The optimum is not computed for n > 14 (exhaustive search blows up).");
  }

  /* ------------------------------------------------------------------ random experiment (dot + range plot) */
  function randItems(n, dist, rnd) {
    const r = rnd || Math.random;
    return Array.from({ length: n }, () => {
      if (dist === "s") return 1 + Math.floor(r() * 500);
      if (dist === "m") return 200 + Math.floor(r() * 501);
      return 1 + Math.floor(r() * 1000);
    });
  }
  function runExperiment() {
    const n = +$("rn").value, dist = $("dist").value, reps = +$("reps").value;
    const stats = { nf: [], ff: [], ffd: [], bf: [] };
    for (let r = 0; r < reps; r++) {
      const arr = randItems(n, dist);
      const lb = lbOf(arr);
      for (const k in stats) stats[k].push(pack(k, arr) / lb);
    }
    const rows = Object.keys(stats).map((k) => {
      const a = stats[k];
      return { k, avg: a.reduce((s, x) => s + x, 0) / a.length, min: Math.min(...a), max: Math.max(...a) };
    });
    const out = $("expOut");
    out.innerHTML = "";
    const W = 640, rowH = 34, padL = 64, padR = 100, top = 22, H = top + rowH * rows.length + 34;
    const hi = Math.max(1.1, ...rows.map((r) => r.max)) * 1.02;
    const X = (v) => padL + ((v - 1) / (hi - 1)) * (W - padL - padR);
    const svg = S("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Average and range of bins divided by lower bound per rule" });
    // grid
    const ticks = [];
    const step = hi - 1 > 0.6 ? 0.2 : hi - 1 > 0.25 ? 0.1 : 0.05;
    for (let v = 1; v <= hi + 1e-9; v += step) ticks.push(v);
    ticks.forEach((v) => {
      svg.appendChild(S("line", { x1: X(v), y1: top - 6, x2: X(v), y2: H - 28, stroke: "var(--line)", "stroke-width": 1 }));
      svg.appendChild(S("text", { x: X(v), y: H - 12, "text-anchor": "middle", "font-size": 11, fill: "var(--muted)", "font-family": "var(--mono)" }, v.toFixed(2)));
    });
    const tip = E("div", { class: "tip", hidden: true });
    rows.forEach((r, i) => {
      const y = top + i * rowH + rowH / 2;
      svg.appendChild(S("text", { x: padL - 10, y: y + 4, "text-anchor": "end", "font-size": 12, "font-weight": 700, fill: "var(--ink-2)" }, SHORT[r.k]));
      svg.appendChild(S("line", { x1: X(r.min), y1: y, x2: X(r.max), y2: y, stroke: "var(--c-active)", "stroke-width": 2, opacity: 0.5, "stroke-linecap": "round" }));
      svg.appendChild(S("circle", { cx: X(r.avg), cy: y, r: 6, fill: "var(--c-active)", stroke: "var(--panel)", "stroke-width": 2 }));
      svg.appendChild(S("text", { x: W - padR + 14, y: y + 4, "font-size": 11, fill: "var(--ink-2)", "font-family": "var(--mono)" }, "avg " + r.avg.toFixed(3)));
      const hit = S("rect", { x: 0, y: y - rowH / 2, width: W, height: rowH, fill: "transparent" });
      hit.addEventListener("mousemove", (ev) => {
        tip.hidden = false;
        tip.innerHTML = `<b>${NAMES[r.k]}</b><br>average ${r.avg.toFixed(3)} · best ${r.min.toFixed(3)} · worst ${r.max.toFixed(3)}`;
        const b = out.getBoundingClientRect();
        tip.style.left = Math.min(ev.clientX - b.left + 12, b.width - 200) + "px";
        tip.style.top = ev.clientY - b.top + 12 + "px";
      });
      hit.addEventListener("mouseleave", () => (tip.hidden = true));
      svg.appendChild(hit);
    });
    svg.appendChild(S("text", { x: padL, y: 12, "font-size": 11, fill: "var(--muted)" }, "bins / ⌈Σ sizes⌉  (dot = average, line = best to worst instance)"));
    out.appendChild(svg);
    out.appendChild(tip);
    const tbl = E("table", { class: "t res", style: { marginTop: "8px" } },
      E("tr", null, E("th", null, "rule"), E("th", { class: "n" }, "average"), E("th", { class: "n" }, "best"), E("th", { class: "n" }, "worst")),
      rows.map((r) => E("tr", null, E("td", null, NAMES[r.k]), E("td", { class: "n" }, r.avg.toFixed(3)), E("td", { class: "n" }, r.min.toFixed(3)), E("td", { class: "n" }, r.max.toFixed(3)))));
    out.appendChild(E("div", { class: "scroll-x" }, tbl));
    out.appendChild(E("p", { class: "small muted", style: { margin: "8px 0 0" } }, `${reps} random instances, n = ${n}, sizes ${{ u: "uniform in (0, 1]", s: "in (0, 0.5]", m: "in [0.2, 0.7]" }[dist]}. Because ⌈Σ⌉ ≤ OPT, these numbers are upper estimates of the true accuracy ratios.`));
  }

  /* ------------------------------------------------------------------ wiring */
  function render(f, i) {
    draw(f);
    code.highlight(f.line);
    ctr.set(f.c);
    say.say(f.text);
    showAsk(f, i);
  }
  player = Forge.player($("player"), { frames: [], render, fps: 3 });
  function run() {
    Object.keys(answered).forEach((k) => delete answered[k]);
    $("code").innerHTML = "";
    $("ctr").innerHTML = "";
    code = Forge.code($("code"), CODE[alg]);
    ctr = Forge.counters($("ctr"), { "bins used": 0, "lower bound ⌈Σ⌉": 0, "fit checks": 0 });
    const frames = record(alg, items);
    const maxBins = frames[frames.length - 1].bins.length;
    frames.forEach((f) => (f.maxBins = maxBins));
    buildTable();
    player.load(frames);
  }
  function parse() {
    const v = $("items").value.split(/[\s,;]+/).filter(Boolean).map(Number).filter((x) => x > 0 && x <= 1).map((x) => Math.max(1, Math.round(x * CAP))).slice(0, 30);
    if (!v.length) { say.say("Type item sizes between 0 and 1, e.g. 0.4, 0.2, 0.6, 0.7."); return false; }
    items = v;
    knownOpt = null;
    $("items").value = items.map(show).join(", ");
    return true;
  }
  const PRE = {
    lec: [0.4, 0.2, 0.6, 0.7],
    nf: [0.5, 0.1, 0.5, 0.1, 0.5, 0.1, 0.5, 0.1, 0.5, 0.1, 0.5, 0.1, 0.5, 0.1, 0.5, 0.1],
    ff: [0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.34, 0.34, 0.34, 0.34, 0.34, 0.34, 0.51, 0.51, 0.51, 0.51, 0.51, 0.51],
    ffd: [].concat(Array(6).fill(0.51), Array(6).fill(0.27), Array(6).fill(0.26), Array(12).fill(0.23)),
  };
  $("alg").onchange = () => { alg = $("alg").value; run(); };
  $("load").onclick = () => { if (parse()) run(); };
  $("items").addEventListener("keydown", (e) => { if (e.key === "Enter" && parse()) run(); });
  $("preset").onchange = () => {
    $("items").value = PRE[$("preset").value].join(", ");
    if ($("preset").value === "ffd") { $("alg").value = "ffd"; alg = "ffd"; }
    if ($("preset").value === "nf") { $("alg").value = "nf"; alg = "nf"; }
    if ($("preset").value === "ff") { $("alg").value = "ff"; alg = "ff"; }
    if (parse()) { if ($("preset").value === "ffd") knownOpt = 9; run(); }
  };
  $("rn").oninput = () => ($("nval").textContent = $("rn").value);
  $("rand").onclick = () => {
    items = randItems(+$("rn").value, $("dist").value);
    knownOpt = null;
    $("items").value = items.map(show).join(", ");
    run();
  };
  $("runExp").onclick = runExperiment;
  $("predict").onchange = () => { if (player.frames.length) render(player.frames[player.index], player.index); };
  run();
})();
