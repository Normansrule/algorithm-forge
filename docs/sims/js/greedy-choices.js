/* When Greedy Works — Algorithm Forge (Ch 9 · Greedy Technique) */
(function () {
  "use strict";
  const E = Forge.el, S = Forge.svg, $ = (id) => document.getElementById(id);
  Forge.page({ title: "When Greedy Works", chapter: "Ch 9 · Greedy Technique" });
  const nums = (s) => String(s).split(/[\s,;]+/).filter(Boolean).map(Number).filter((x) => Number.isFinite(x));
  const rnd = (n) => Math.floor(Math.random() * n);
  const field = (label, input) => E("label", { class: "field" }, label, input);
  const txt = (id, value, w) => E("input", { type: "text", id, value, spellcheck: "false", style: w ? { maxWidth: w } : null });
  const fx = (x) => String(+(+x).toFixed(2));
  const legend = (items) => { const l = $("legend"); l.innerHTML = ""; items.forEach(([c, t]) => l.appendChild(E("span", null, E("i", { style: { background: c } }), t))); };

  /* ================================================================== */
  /* Change-making                                                      */
  /* ================================================================== */
  function dpChange(D, n) {
    const F = [0], last = [0];
    for (let i = 1; i <= n; i++) {
      F[i] = Infinity; last[i] = null;
      D.forEach((d) => { if (d <= i && F[i - d] + 1 < F[i]) { F[i] = F[i - d] + 1; last[i] = d; } });
    }
    const coins = [];
    if (F[n] < Infinity) { let a = n; while (a > 0) { coins.push(last[a]); a -= last[a]; } }
    return { F, coins: coins.sort((a, b) => b - a) };
  }
  function greedyChange(D, n) {
    const out = []; let r = n;
    D.slice().sort((a, b) => b - a).forEach((d) => { while (r >= d) { out.push(d); r -= d; } });
    return { coins: out, left: r };
  }
  const CH = {
    blurb: "Pay an amount with as few coins as possible. Greedy always grabs the largest coin that still fits. For “canonical” coin systems like 25, 10, 5, 1 that is optimal; for others it can use more coins than necessary.",
    lines: [
      "ALGORITHM GreedyChange(D[1..m], n)",
      "    // D[1] > D[2] > … > D[m]: try the largest coin first",
      "    S ← empty list",
      "    for j ← 1 to m do",
      "        while n ≥ D[j] do",
      "            append(S, D[j])",
      "            n ← n − D[j]",
      "    if n > 0 then return \"stuck\"",
      "    return S",
      "",
      "// Dynamic Programming (DP) reference, as in the DP Table Studio:",
      "// F[0] ← 0;  F[i] ← 1 + min over D[j] ≤ i of F[i − D[j]]",
    ],
    counters: { "greedy coins": 0, "DP coins": "–", "coin tests": 0 },
    ui(h) {
      h.append(field("Denominations", txt("cm-d", "25, 10, 5, 1", "180px")), field("Amount n (≤ 99)", E("input", { type: "number", id: "cm-n", value: 48, min: 1, max: 99, style: { width: "84px" } })),
        field("Preset", E("select", { id: "cm-pre", onchange: (e) => { const [d, n] = e.target.value.split("|"); $("cm-d").value = d; $("cm-n").value = n; run(); } },
          E("option", { value: "25, 10, 5, 1|48" }, "US coins, 48¢ (lecture)"),
          E("option", { value: "1, 3, 4|6" }, "1, 3, 4 and 6 (Levitin)"),
          E("option", { value: "1, 5, 10, 20, 25|40" }, "1, 5, 10, 20, 25 and 40"),
          E("option", { value: "1, 7, 10|14" }, "1, 7, 10 and 14"),
          E("option", { value: "5, 3|7" }, "3, 5 and 7 (greedy gets stuck)"))));
      $("extra").append(E("button", { class: "btn ghost", onclick: findCounter }, "🔎 Find a counterexample"));
    },
    random() {
      const set = new Set([1]); while (set.size < 3 + rnd(2)) set.add(2 + rnd(24));
      $("cm-d").value = [...set].sort((a, b) => b - a).join(", "); $("cm-n").value = 10 + rnd(50);
    },
    read() {
      const D = [...new Set(nums($("cm-d").value).map(Math.round).filter((x) => x > 0))].sort((a, b) => b - a).slice(0, 6);
      const n = Math.max(1, Math.min(99, Math.round(+$("cm-n").value || 0)));
      return D.length ? { D, n } : null;
    },
    legend: [["var(--c-active)", "coin just taken by greedy"], ["var(--c-compare)", "greedy coin"], ["var(--c-done)", "DP-optimal coin"], ["var(--c-swap)", "greedy used more coins / got stuck"]],
    record({ D, n }) {
      const frames = [], g = [];
      let r = n, tests = 0;
      const dp = dpChange(D, n);
      const base = () => ({ D, n, g: g.slice(), rem: r, dp: null });
      const push = (o) => frames.push(Object.assign(base(), { ctr: { "greedy coins": g.length, "DP coins": o.dpShown != null ? o.dpShown : "–", "coin tests": tests } }, o));
      push({ line: [0, 2], text: `Pay <b>${n}</b> with coins {${D.join(", ")}}. Greedy starts with the largest coin.` });
      for (const d of D) {
        let first = true;
        while (true) {
          tests++;
          if (r >= d) {
            const opts = D.filter((x) => x <= r);
            push({ line: 4, ask: { prompt: `Remaining ${r}. Which coin does greedy take next?`, options: D.map(String), ok: [String(Math.max(...opts))] }, text: `Remaining amount ${r}. Is ${d} ≤ ${r}? Yes.` });
            g.push(d); r -= d;
            push({ line: [5, 6], hot: g.length - 1, text: `Take a <b>${d}</b>. ${r ? `${r} left to pay.` : "Nothing left to pay!"}`, formula: `${n} = ${g.join(" + ")}${r ? ` + (${r} still due)` : ""}` });
            first = false;
          } else {
            if (first || r > 0) push({ line: 4, text: `${d} > ${r}: this coin no longer fits, move to the next smaller coin.`, formula: `${n} = ${g.join(" + ") || "0"}${r ? ` + (${r} still due)` : ""}` });
            break;
          }
        }
        if (r === 0) break;
      }
      const stuck = r > 0;
      push({ line: stuck ? 7 : 8, text: stuck ? `Greedy is <b>stuck</b> with ${r} unpaid: no coin fits.` : `Greedy finished with <b>${g.length}</b> coin${g.length > 1 ? "s" : ""}.`,
        ask: { prompt: "Is the greedy answer optimal here?", options: ["yes, optimal", "no, DP does better"], ok: [(!stuck && g.length === dp.coins.length) || (stuck && dp.F[n] === Infinity) ? "yes, optimal" : "no, DP does better"] } });
      const dpOK = dp.F[n] < Infinity;
      for (let k = 1; k <= dp.coins.length; k++) push({ line: [10, 11], dpShow: k, dpShown: k, text: `DP optimum, coin ${k}: <b>${dp.coins[k - 1]}</b>.`, formula: `F[${n}] = ${dp.F[n]}: ${dp.coins.slice(0, k).join(" + ")}` });
      let verdict;
      if (!dpOK) verdict = `No combination of these coins pays ${n}; DP confirms F[${n}] = ∞.`;
      else if (stuck) verdict = `Greedy got stuck, yet DP pays ${n} with ${dp.coins.length} coins (${dp.coins.join(" + ")}). Greedy is <b>not even feasible</b> here.`;
      else if (g.length === dp.coins.length) verdict = `Greedy's ${g.length} coins match the DP optimum. <b>Greedy was optimal</b> for this amount.`;
      else verdict = `Greedy used <b>${g.length}</b> coins, DP needs only <b>${dp.coins.length}</b> (${dp.coins.join(" + ")}). The locally best first coin ruined the total: <b>greedy is not optimal</b> for this coin set.`;
      push({ line: 11, dpShow: dp.coins.length, dpShown: dpOK ? dp.coins.length : "∞", final: true, bad: stuck || (dpOK && g.length > dp.coins.length), text: verdict, formula: `greedy: ${g.join(" + ") || "–"} (${g.length})  vs  DP: ${dp.coins.join(" + ") || "–"} (${dpOK ? dp.coins.length : "∞"})` });
      return { frames, dp };
    },
    draw(svg, f) {
      const W = 760, H = 290;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.innerHTML = "";
      const lane = (y, title, coins, col, hot, bad) => {
        svg.appendChild(S("text", { x: 16, y: y - 42, "font-size": 13, "font-weight": 800, fill: "var(--ink-2)" }, title));
        const step = Math.min(58, (W - 60) / Math.max(1, coins.length));
        coins.forEach((d, i) => {
          const r = Math.min(step / 2 - 2, 13 + 3.2 * Math.log2(d + 1));
          const cx = 40 + i * step + step / 2;
          svg.appendChild(S("circle", { cx, cy: y, r, fill: i === hot ? "var(--c-active)" : col, stroke: bad ? "var(--c-swap)" : "var(--line-2)", "stroke-width": bad ? 2.5 : 1.5 }));
          svg.appendChild(S("text", { x: cx, y: y + 4.5, "text-anchor": "middle", "font-size": Math.min(13, r), "font-weight": 800, fill: "#0d1117" }, String(d)));
        });
      };
      lane(90, `Greedy (${f.g.length} coin${f.g.length === 1 ? "" : "s"}${f.rem ? `, ${f.rem} still due` : ""})`, f.g, "var(--c-compare)", f.hot, f.final && f.bad);
      const dpc = f.dpShow ? this._dp.coins.slice(0, f.dpShow) : [];
      lane(225, f.dpShow ? `DP optimum (${this._dp.F[f.n] === Infinity ? "impossible" : this._dp.coins.length + " coins"})` : "DP optimum (revealed after greedy finishes)", dpc, "var(--c-done)", -1, false);
    },
    side(host, f) {
      $("sideTitle").textContent = "DP table F[i] = fewest coins for amount i";
      const F = this._dp.F, t = E("table", { class: "t" });
      const cols = Math.min(F.length, 100);
      for (let start = 0; start < cols; start += 17) {
        const idx = []; for (let i = start; i < Math.min(cols, start + 17); i++) idx.push(i);
        t.appendChild(E("tr", null, E("th", null, "i"), ...idx.map((i) => E("th", null, i))));
        t.appendChild(E("tr", null, E("th", null, "F"), ...idx.map((i) => E("td", { class: f.dpShow && i === f.n ? "done" : "" }, f.dpShow ? (F[i] === Infinity ? "∞" : F[i]) : "·"))));
      }
      host.appendChild(t);
    },
  };
  function findCounter() {
    const inp = CH.read(); if (!inp) return;
    for (let a = 1; a <= 200; a++) {
      const g = greedyChange(inp.D, a), dp = dpChange(inp.D, a);
      const gc = g.left ? Infinity : g.coins.length, dc = dp.F[a];
      if (gc > dc) {
        $("cm-n").value = Math.min(a, 99); run();
        say.say(`🔎 Smallest counterexample for {${inp.D.join(", ")}}: amount <b>${a}</b> — greedy ${g.left ? "gets stuck" : `uses ${gc} coins`}, DP needs ${dc}. Press ▶ to watch.`);
        return;
      }
    }
    say.say(`🔎 Greedy matches DP for every amount from 1 to 200 with {${inp.D.join(", ")}} — this coin system behaves canonically.`);
  }

  /* ================================================================== */
  /* Activity selection                                                 */
  /* ================================================================== */
  const ACT_PRESETS = {
    lecture: ["1, 3, 0, 5, 8, 5", "2, 4, 6, 7, 9, 9"],
    start: ["0, 1, 3, 5", "10, 2, 4, 6"],
    short: ["0, 4, 6", "5, 7, 11"],
    big: ["1, 2, 4, 1, 5, 8, 9, 11, 13, 2", "3, 5, 7, 8, 9, 10, 11, 14, 16, 12"],
  };
  const RULES = {
    finish: { name: "earliest finish time", key: (a) => [a.e, a.s] },
    start: { name: "earliest start time", key: (a) => [a.s, a.e] },
    short: { name: "shortest duration", key: (a) => [a.e - a.s, a.s] },
  };
  function bestCount(acts) {
    // exact optimum by the classic DP-free check over all subsets (n ≤ 16)
    const n = acts.length; let best = 0;
    for (let m = 0; m < 1 << n; m++) {
      const pick = acts.filter((_, i) => m & (1 << i));
      if (pick.length <= best) continue;
      const s = pick.slice().sort((a, b) => a.s - b.s);
      if (s.every((a, i) => i === 0 || a.s >= s[i - 1].e)) best = pick.length;
    }
    return best;
  }
  const AC = {
    blurb: "One person, many activities with start and end times; pick as many as possible with no two overlapping. The greedy rule that works: always take the compatible activity that finishes first — it leaves the most time for everything else.",
    lines: [
      "ALGORITHM ActivitySelection(s[1..n], f[1..n])",
      "    sort activities by finish time f (ties: earlier start)",
      "    S ← {first activity in that order}",
      "    last ← its finish time",
      "    for each next activity i in sorted order do",
      "        if s[i] ≥ last then        // starts after the last pick ends",
      "            S ← S ∪ {i}",
      "            last ← f[i]",
      "    return S",
      "// other rules: sort by that key instead; a candidate must not",
      "// overlap ANY picked activity",
    ],
    counters: { "compatibility checks": 0, picked: 0, optimum: "–" },
    ui(h) {
      h.append(field("Start times", txt("ac-s", ACT_PRESETS.lecture[0], "220px")), field("End times", txt("ac-e", ACT_PRESETS.lecture[1], "220px")),
        field("Greedy rule", E("select", { id: "ac-rule", onchange: run },
          E("option", { value: "finish" }, "earliest finish time ✓"), E("option", { value: "start" }, "earliest start time"), E("option", { value: "short" }, "shortest duration"))),
        field("Preset", E("select", { id: "ac-pre", onchange: (e) => { const p = ACT_PRESETS[e.target.value]; $("ac-s").value = p[0]; $("ac-e").value = p[1]; if (e.target.value === "start" || e.target.value === "short") $("ac-rule").value = e.target.value; run(); } },
          E("option", { value: "lecture" }, "Lecture interview example"), E("option", { value: "start" }, "Trap for “earliest start”"), E("option", { value: "short" }, "Trap for “shortest duration”"), E("option", { value: "big" }, "Ten activities"))));
    },
    random() {
      const n = 6 + rnd(4), s = [], e = [];
      for (let i = 0; i < n; i++) { const a = rnd(14); s.push(a); e.push(a + 1 + rnd(5)); }
      $("ac-s").value = s.join(", "); $("ac-e").value = e.join(", ");
    },
    read() {
      const s = nums($("ac-s").value), e = nums($("ac-e").value);
      if (!s.length || s.length !== e.length) { say.say(`Start and end lists need the same length (got ${s.length} and ${e.length}).`); return null; }
      const acts = s.slice(0, 14).map((x, i) => ({ i, s: x, e: e[i] }));
      if (acts.some((a) => a.e <= a.s)) { say.say("Every activity must end after it starts."); return null; }
      return { acts, rule: $("ac-rule").value };
    },
    legend: [["var(--c-active)", "being considered"], ["var(--c-done)", "picked"], ["var(--c-dim)", "skipped"], ["var(--c-swap)", "overlaps with this pick"]],
    record({ acts, rule }) {
      const R = RULES[rule], frames = [];
      const order = acts.slice().sort((a, b) => { const ka = R.key(a), kb = R.key(b); return ka[0] - kb[0] || ka[1] - kb[1] || a.i - b.i; });
      const status = {}; let checks = 0; const picked = [];
      const opt = bestCount(acts);
      const push = (o) => frames.push(Object.assign({ order, status: Object.assign({}, status), last: picked.length ? Math.max(...picked.map((p) => p.e)) : null, ctr: { "compatibility checks": checks, picked: picked.length, optimum: o.showOpt ? opt : "–" } }, o));
      push({ line: 1, text: `Sort the ${acts.length} activities by <b>${R.name}</b>: order ${order.map((a) => a.i).join(", ")} (original indices). Bars are listed top to bottom in that order.` });
      order.forEach((a, k) => {
        const clash = picked.filter((p) => a.s < p.e && p.s < a.e);
        const ok = clash.length === 0;
        push({ line: k === 0 ? 2 : [4, 5], cur: a.i, ask: { prompt: `Activity ${a.i} [${a.s}, ${a.e}): pick or skip?`, options: ["pick", "skip"], ok: [ok ? "pick" : "skip"] },
          text: `Consider activity <b>${a.i}</b> [${a.s}, ${a.e}).` });
        checks++;
        if (ok) {
          picked.push(a); status[a.i] = "acc";
          push({ line: k === 0 ? [2, 3] : [6, 7], cur: a.i, text: k === 0 ? `It comes first in the ${R.name} order, so take it.` : `It starts at ${a.s}, ${rule === "finish" ? `not before the last pick ends (${frames[frames.length - 1].last})` : "and overlaps nothing picked so far"}: <b>pick it</b>.` });
        } else {
          status[a.i] = "rej";
          push({ line: 5, cur: a.i, clash: clash.map((c) => c.i), text: `It overlaps ${clash.map((c) => `activity ${c.i} [${c.s}, ${c.e})`).join(" and ")}: <b>skip it</b>.` });
        }
      });
      const good = picked.length === opt;
      push({ line: 8, final: true, showOpt: true, text: `Greedy by ${R.name} picked <b>${picked.length}</b>: indices [${picked.map((p) => p.i).sort((x, y) => x - y).join(", ")}]. Brute force over all 2^${acts.length} subsets says the maximum is <b>${opt}</b>. ${good ? "✓ Optimal." : "✗ This rule is <b>not</b> optimal — earliest finish time would be."} Sorting costs O(n log n), the scan O(n).`,
        formula: `greedy ${picked.length}  vs  optimum ${opt}` });
      return { frames };
    },
    draw(svg, f) {
      const order = f.order, n = order.length;
      const tmin = Math.min(...order.map((a) => a.s)), tmax = Math.max(...order.map((a) => a.e));
      const W = 760, rowH = Math.min(34, 300 / n), top = 40, H = top + n * rowH + 36, L = 90, Rr = 30;
      const X = (t) => L + ((t - tmin) / Math.max(1, tmax - tmin)) * (W - L - Rr);
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.innerHTML = "";
      for (let t = tmin; t <= tmax; t++) {
        svg.appendChild(S("line", { x1: X(t), y1: top - 8, x2: X(t), y2: top + n * rowH, stroke: "var(--line)", "stroke-width": 1 }));
        if (tmax - tmin <= 24 || t % 2 === 0) svg.appendChild(S("text", { x: X(t), y: top - 14, "text-anchor": "middle", "font-size": 11, fill: "var(--muted)" }, String(t)));
      }
      if (f.last != null) {
        svg.appendChild(S("line", { x1: X(f.last), y1: top - 8, x2: X(f.last), y2: top + n * rowH + 6, stroke: "var(--ember)", "stroke-width": 2, "stroke-dasharray": "6 4" }));
        svg.appendChild(S("text", { x: X(f.last), y: top + n * rowH + 22, "text-anchor": "middle", "font-size": 11, "font-weight": 700, fill: "var(--ember)" }, `last pick ends ${f.last}`));
      }
      order.forEach((a, k) => {
        const y = top + k * rowH + 4, st = f.status[a.i];
        const cur = f.cur === a.i, clash = (f.clash || []).includes(a.i);
        const fill = cur && !st ? "var(--c-active)" : st === "acc" ? "var(--c-done)" : st === "rej" ? "var(--c-dim)" : "var(--c-bar)";
        svg.appendChild(S("text", { x: L - 10, y: y + rowH / 2 + 1, "text-anchor": "end", "font-size": 12, "font-weight": 700, fill: cur ? "var(--c-active)" : "var(--ink-2)" }, `#${a.i} [${a.s},${a.e})`));
        svg.appendChild(S("rect", { x: X(a.s), y, width: Math.max(4, X(a.e) - X(a.s)), height: rowH - 8, rx: 5, fill, stroke: clash ? "var(--c-swap)" : cur ? "var(--c-active)" : "none", "stroke-width": clash || cur ? 3 : 0 }));
      });
    },
    side(host, f) {
      $("sideTitle").textContent = "Activities in greedy order";
      const t = E("table", { class: "t" }, E("tr", null, E("th", null, "#"), E("th", null, "start"), E("th", null, "end"), E("th", null, "duration"), E("th", null, "result")));
      f.order.forEach((a) => t.appendChild(E("tr", { class: f.cur === a.i && !f.status[a.i] ? "cur" : f.status[a.i] || "" }, E("td", null, a.i), E("td", null, a.s), E("td", null, a.e), E("td", null, a.e - a.s), E("td", null, f.status[a.i] === "acc" ? "✓ picked" : f.status[a.i] === "rej" ? "✗ overlaps" : ""))));
      host.appendChild(t);
    },
  };

  /* ================================================================== */
  /* Fractional knapsack                                                */
  /* ================================================================== */
  const FK_PRESETS = { book: ["2:12, 1:10, 3:20, 2:15", 5], fail: ["10:60, 20:100, 30:120", 50], tie: ["4:40, 3:30, 2:20, 5:45", 7] };
  function best01(items, W) {
    const F = Array(W + 1).fill(0);
    items.forEach((it) => { for (let j = W; j >= it.w; j--) F[j] = Math.max(F[j], F[j - it.w] + it.v); });
    return F[W];
  }
  const COLORS = ["#5ab0ff", "#ff8a3d", "#3ddc97", "#c38bff", "#ffd24d", "#ff5d73", "#7bd88f", "#f78fb3"];
  const FK = {
    blurb: "Items have weights and values; the knapsack holds weight W. If items can be cut (gold dust, not gold bars), greedy by value per unit of weight is optimal. If they cannot (0/1 knapsack), the same greedy rule can miss the best answer.",
    lines: [
      "ALGORITHM FractionalKnapsack(w[1..n], v[1..n], W)",
      "    sort items by v[i] / w[i] in nonincreasing order",
      "    room ← W",
      "    total ← 0",
      "    for each item i in that order do",
      "        if w[i] ≤ room then",
      "            take all of item i",
      "            total ← total + v[i]",
      "            room ← room − w[i]",
      "        else",
      "            take the fraction room / w[i] of item i",
      "            total ← total + v[i] · room / w[i]",
      "            return total",
      "    return total",
    ],
    counters: { "items examined": 0, "value so far": 0, "room left": 0 },
    ui(h) {
      h.append(field("Items as weight:value", txt("fk-items", FK_PRESETS.book[0], "260px")), field("Capacity W", E("input", { type: "number", id: "fk-W", value: 5, min: 1, max: 200, style: { width: "84px" } })),
        field("Preset", E("select", { id: "fk-pre", onchange: (e) => { const p = FK_PRESETS[e.target.value]; $("fk-items").value = p[0]; $("fk-W").value = p[1]; run(); } },
          E("option", { value: "book" }, "Levitin knapsack, W = 5"), E("option", { value: "fail" }, "0/1 greedy fails, W = 50"), E("option", { value: "tie" }, "Equal ratios, W = 7"))));
    },
    random() {
      const n = 4 + rnd(2);
      $("fk-items").value = Array.from({ length: n }, () => `${1 + rnd(6)}:${5 + rnd(40)}`).join(", "); $("fk-W").value = 6 + rnd(6);
    },
    read() {
      const items = $("fk-items").value.split(/[,;]+/).map((s, i) => { const m = s.trim().match(/(\d+)\s*[:/]\s*(\d+(?:\.\d+)?)/); return m ? { i: i + 1, w: +m[1], v: +m[2] } : null; }).filter((x) => x && x.w > 0).slice(0, 8);
      items.forEach((it, k) => (it.i = k + 1));
      const W = Math.max(1, Math.min(200, Math.round(+$("fk-W").value || 0)));
      return items.length ? { items, W } : null;
    },
    legend: [["var(--c-active)", "item being considered"], ["var(--ember)", "knapsack capacity"], ["var(--c-done)", "summary: optimal"], ["var(--c-swap)", "summary: greedy fell short"]],
    record({ items, W }) {
      const frames = [];
      const order = items.slice().sort((a, b) => b.v / b.w - a.v / a.w || a.i - b.i);
      const fill = []; let room = W, total = 0, ex = 0;
      const push = (o) => frames.push(Object.assign({ W, items, order, fill: fill.map((x) => Object.assign({}, x)), ctr: { "items examined": ex, "value so far": fx(total), "room left": fx(room) } }, o));
      push({ line: 1, text: `Rank the items by value per unit weight: ${order.map((it) => `#${it.i} (${fx(it.v / it.w)})`).join(" > ")}.` });
      for (const it of order) {
        if (room <= 0) break;
        ex++;
        const best = order.filter((x) => !fill.some((f) => f.i === x.i))[0];
        push({ line: [4, 5], cur: it.i, ask: { prompt: "Which item goes in next?", options: order.filter((x) => !fill.some((f) => f.i === x.i)).map((x) => `#${x.i}`), ok: order.filter((x) => !fill.some((f) => f.i === x.i) && Math.abs(x.v / x.w - best.v / best.w) < 1e-9).map((x) => `#${x.i}`) },
          text: `Next best ratio: item <b>#${it.i}</b> (w ${it.w}, v ${it.v}, ${fx(it.v / it.w)} per unit). Room left: ${fx(room)}.` });
        if (it.w <= room) {
          fill.push({ i: it.i, w: it.w, v: it.v, frac: 1 }); total += it.v; room -= it.w;
          push({ line: [6, 7, 8], cur: it.i, text: `It fits: take <b>all</b> of #${it.i}. Value ${fx(total)}, room ${fx(room)}.`, formula: `total = ${fill.map((f) => (f.frac === 1 ? f.v : `${fx(f.frac)}·${f.v}`)).join(" + ")} = ${fx(total)}` });
        } else {
          const fr = room / it.w;
          fill.push({ i: it.i, w: room, v: it.v * fr, frac: fr }); total += it.v * fr; room = 0;
          push({ line: [10, 11, 12], cur: it.i, text: `Only ${fx(fr * it.w)} of its ${it.w} units fit: take the fraction <b>${fx(fr)}</b>, worth ${fx(it.v * fr)}. The knapsack is full.`, formula: `total = ${fill.map((f) => (f.frac === 1 ? f.v : `${fx(f.frac)}·${fx(f.v / f.frac)}`)).join(" + ")} = ${fx(total)}` });
          break;
        }
      }
      // 0/1 comparison
      let r2 = W, g01 = 0; const g01items = [];
      order.forEach((it) => { if (it.w <= r2) { r2 -= it.w; g01 += it.v; g01items.push(it.i); } });
      const opt01 = best01(items, W);
      push({ line: 13, final: true, summary: { frac: total, g01, g01items, opt01 },
        text: `Fractional greedy: <b>${fx(total)}</b> — provably optimal when items can be cut. Without cutting (0/1): greedy by ratio takes {${g01items.map((i) => "#" + i).join(", ")}} = <b>${g01}</b>, while the true 0/1 optimum (by DP) is <b>${opt01}</b>. ${g01 === opt01 ? "Here greedy happens to be right." : "Greedy falls short — the 0/1 knapsack needs DP or branch-and-bound."}`,
        formula: `fractional ${fx(total)}  ≥  0/1 optimum ${opt01}  ≥  0/1 greedy ${g01}` });
      return { frames };
    },
    draw(svg, f) {
      const W = 760, H = f.summary ? 300 : 220, L = 40, Rr = 40, bw = W - L - Rr;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.innerHTML = "";
      const X = (u) => L + (u / f.W) * bw;
      svg.appendChild(S("text", { x: L, y: 34, "font-size": 13, "font-weight": 800, fill: "var(--ink-2)" }, `Knapsack, capacity W = ${f.W}`));
      svg.appendChild(S("rect", { x: L, y: 48, width: bw, height: 56, rx: 8, fill: "var(--panel)", stroke: "var(--ember)", "stroke-width": 2.5 }));
      let u = 0;
      f.fill.forEach((it) => {
        const col = COLORS[(it.i - 1) % COLORS.length];
        svg.appendChild(S("rect", { x: X(u) + 1, y: 50, width: Math.max(1, X(u + it.w) - X(u) - 2), height: 52, rx: 6, fill: col, "fill-opacity": it.frac < 1 ? 0.55 : 0.9, stroke: it.frac < 1 ? col : "none", "stroke-dasharray": "5 3" }));
        if (X(u + it.w) - X(u) > 44) svg.appendChild(S("text", { x: (X(u) + X(u + it.w)) / 2, y: 81, "text-anchor": "middle", "font-size": 12.5, "font-weight": 800, fill: "#0d1117" }, it.frac < 1 ? `#${it.i}×${fx(it.frac)}` : `#${it.i}`));
        u += it.w;
      });
      for (let t = 0; t <= f.W; t += Math.max(1, Math.ceil(f.W / 20))) svg.appendChild(S("text", { x: X(t), y: 122, "text-anchor": "middle", "font-size": 10, fill: "var(--muted)" }, String(t)));
      // item chips
      const n = f.order.length, cw = Math.min(170, (W - 40) / n);
      f.order.forEach((it, k) => {
        const x = 20 + k * cw, used = f.fill.find((q) => q.i === it.i);
        const col = COLORS[(it.i - 1) % COLORS.length];
        svg.appendChild(S("rect", { x: x + 3, y: 140, width: cw - 6, height: 58, rx: 8, fill: used ? col : "var(--panel-2)", "fill-opacity": used ? 0.25 : 1, stroke: f.cur === it.i ? "var(--c-active)" : col, "stroke-width": f.cur === it.i ? 3 : 1.5 }));
        svg.appendChild(S("text", { x: x + cw / 2, y: 160, "text-anchor": "middle", "font-size": 12.5, "font-weight": 800, fill: "var(--ink)" }, `#${it.i}  w${it.w} v${it.v}`));
        svg.appendChild(S("text", { x: x + cw / 2, y: 180, "text-anchor": "middle", "font-size": 11.5, fill: "var(--ink-2)" }, `ratio ${fx(it.v / it.w)}`));
        svg.appendChild(S("text", { x: x + cw / 2, y: 194, "text-anchor": "middle", "font-size": 10.5, fill: "var(--muted)" }, used ? (used.frac < 1 ? `took ${fx(used.frac)}` : "took all") : ""));
      });
      if (f.summary) {
        const s = f.summary, max = Math.max(s.frac, s.opt01, 1);
        [["fractional greedy", s.frac, "var(--c-done)"], ["0/1 optimum (DP)", s.opt01, "var(--c-done)"], ["0/1 greedy by ratio", s.g01, s.g01 < s.opt01 ? "var(--c-swap)" : "var(--c-done)"]].forEach(([lab, v, col], k) => {
          const y = 222 + k * 25;
          svg.appendChild(S("text", { x: 170, y: y + 13, "text-anchor": "end", "font-size": 12, "font-weight": 700, fill: "var(--ink-2)" }, lab));
          svg.appendChild(S("rect", { x: 180, y, width: Math.max(2, (v / max) * 480), height: 18, rx: 4, fill: col }));
          svg.appendChild(S("text", { x: 186 + (v / max) * 480, y: y + 13, "font-size": 12, "font-weight": 800, fill: "var(--ink)" }, fx(v)));
        });
      }
    },
    side(host, f) {
      $("sideTitle").textContent = "Items by value per weight";
      const t = E("table", { class: "t" }, E("tr", null, E("th", null, "item"), E("th", null, "weight"), E("th", null, "value"), E("th", null, "v / w"), E("th", null, "taken")));
      f.order.forEach((it) => { const u = f.fill.find((q) => q.i === it.i); t.appendChild(E("tr", { class: f.cur === it.i ? "cur" : u ? "acc" : "" }, E("td", null, `#${it.i}`), E("td", null, it.w), E("td", null, it.v), E("td", null, fx(it.v / it.w)), E("td", null, u ? (u.frac < 1 ? fx(u.frac) : "all") : "–"))); });
      host.appendChild(t);
    },
  };

  /* ================================================================== */
  /* wiring                                                              */
  /* ================================================================== */
  const P = { change: CH, activity: AC, frac: FK };
  const say = Forge.narrate($("say"));
  let cur = "change", code, ctr, predict = false;
  const score = { right: 0, total: 0 }, answered = {};
  const player = Forge.player($("player"), { frames: [], render });
  function render(f, idx) {
    const p = P[cur];
    p.draw($("stage"), f);
    $("side").innerHTML = ""; p.side($("side"), f);
    code.highlight(f.line);
    ctr.set(f.ctr);
    say.say(f.text);
    $("formula").innerHTML = f.formula || "&nbsp;";
    const box = $("ask");
    if (predict && f.ask) {
      player.pause();
      box.hidden = false;
      $("askQ").textContent = f.ask.prompt;
      const btns = $("askBtns"); btns.innerHTML = "";
      const a = answered[idx];
      f.ask.options.forEach((o) => btns.appendChild(E("button", { class: "btn sm" + (a && a.o === o ? " primary" : ""), disabled: !!a, onclick: () => {
        const ok = f.ask.ok.includes(o);
        score.total++; if (ok) score.right++;
        $("score").textContent = `predictions: ${score.right} / ${score.total}`;
        answered[idx] = { o, fb: ok ? `<span style="color:var(--ok)">✓ Right.</span>` : `<span style="color:var(--bad)">✗ Answer: ${f.ask.ok.join(" or ")}.</span>` };
        render(f, idx);
      } }, o)));
      if (a) btns.appendChild(E("button", { class: "btn sm steel", onclick: () => player.go(idx + 1) }, "Continue ▶"));
      $("askFb").innerHTML = a ? a.fb : "";
    } else box.hidden = true;
  }
  function run() {
    const p = P[cur], inp = p.read();
    if (!inp) return;
    const res = p.record(inp);
    if (res.dp) p._dp = res.dp;
    Object.keys(answered).forEach((k) => delete answered[k]);
    player.load(res.frames);
  }
  function select(key) {
    cur = key;
    const p = P[key];
    $("inputs").innerHTML = ""; $("extra").innerHTML = "";
    p.ui($("inputs"));
    $("blurb").textContent = p.blurb;
    legend(p.legend);
    $("code").innerHTML = ""; $("ctr").innerHTML = "";
    code = Forge.code($("code"), p.lines);
    ctr = Forge.counters($("ctr"), p.counters);
    run();
  }
  $("prob").onchange = (e) => select(e.target.value);
  $("load").onclick = run;
  $("rand").onclick = () => { P[cur].random(); run(); };
  $("inputs").addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.tagName === "INPUT") run(); });
  $("predictMode").onchange = (e) => { predict = e.target.checked; player.go(player.index); };
  const q = new URLSearchParams(location.search).get("problem");
  const start = P[q] ? q : "change";
  $("prob").value = start;
  select(start);
})();
