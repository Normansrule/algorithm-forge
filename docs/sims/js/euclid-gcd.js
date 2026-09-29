/* gcd three ways (race) + Sieve of Eratosthenes — Algorithm Forge, Chapter 1 */
(function () {
  "use strict";
  Forge.page({ title: "GCD Three Ways + Sieve", chapter: "Ch 1 · Introduction" });
  const $ = (id) => document.getElementById(id);
  const S = Forge.svg;
  const stage = $("stage");
  const narrow = () => (stage.getBoundingClientRect().width || 760) < 560;
  const say = Forge.narrate($("say"));
  let code = null, ctr = null, mode = "gcd", focus = "E";
  let gcdInput = [60, 24], sieveN = 30;

  /* ------------------------------------------------------------ pseudocode */
  const CODE = {
    E: [
      "ALGORITHM Euclid(m, n)",
      "    while n ≠ 0 do",
      "        r ← m mod n",
      "        m ← n",
      "        n ← r",
      "    return m",
    ],
    C: [
      "ALGORITHM ConsecutiveIntegerGCD(m, n)",
      "    t ← min(m, n)",
      "    while t > 0 do",
      "        if m mod t = 0 then",
      "            if n mod t = 0 then",
      "                return t",
      "        t ← t - 1",
    ],
    M: [
      "ALGORITHM MiddleSchoolGCD(m, n)",
      "    Fm ← PrimeFactors(m)",
      "    Fn ← PrimeFactors(n)",
      "    g ← 1",
      "    i ← 0",
      "    j ← 0",
      "    while i < length(Fm) and j < length(Fn) do",
      "        if Fm[i] = Fn[j] then",
      "            g ← g * Fm[i]",
      "            i ← i + 1",
      "            j ← j + 1",
      "        else if Fm[i] < Fn[j] then",
      "            i ← i + 1",
      "        else",
      "            j ← j + 1",
      "    return g",
      "",
      "ALGORITHM PrimeFactors(x)",
      "    // trial division by p = 2, 3, 4, ...",
      "    F ← []",
      "    p ← 2",
      "    while p * p ≤ x do",
      "        while x mod p = 0 do",
      "            append(F, p)",
      "            x ← x div p",
      "        p ← p + 1",
      "    if x > 1 then",
      "        append(F, x)",
      "    return F",
    ],
    SIEVE: [
      "ALGORITHM Sieve(n)",
      "    A ← array(n + 1, 0)",
      "    for p ← 2 to n do",
      "        A[p] ← p",
      "    for p ← 2 to ⌊sqrt(n)⌋ do",
      "        if A[p] ≠ 0 then",
      "            j ← p * p",
      "            while j ≤ n do",
      "                A[j] ← 0",
      "                j ← j + p",
      "    L ← []",
      "    for p ← 2 to n do",
      "        if A[p] ≠ 0 then",
      "            append(L, A[p])",
      "    return L",
    ],
  };
  const NAMES = { E: "Euclid", C: "Consecutive integer checking", M: "Middle-school" };

  /* ------------------------------------------------------------ step generators (one op per step) */
  function euclidSteps(m0, n0) {
    const st = [];
    let m = m0, n = n0, divs = 0;
    const pairs = [[m, n]];
    st.push({ line: 1, ops: 0, divs, pairs: pairs.slice(), m, n, text: `Start with (m, n) = (${m}, ${n}). Is n = 0? No, so divide.` });
    while (n !== 0) {
      const r = m % n;
      divs++;
      const q = Math.floor(m / n);
      pairs.push([n, r]);
      const why = r === 0 ? `Remainder 0 means ${n} divides ${m}, so gcd = ${n}.` : `gcd(${m}, ${n}) = gcd(${n}, ${r}): any number dividing both ${m} and ${n} also divides the remainder ${r}.`;
      st.push({ line: [2, 3, 4], ops: divs, divs, pairs: pairs.slice(), m: n, n: r, r, text: `${m} = ${q}·${n} + <b>${r}</b>, so ${m} mod ${n} = ${r}. New pair (${n}, ${r}). ${why}` });
      m = n; n = r;
    }
    st.push({ line: [1, 5], ops: divs, divs, pairs: pairs.slice(), m, n, done: true, result: m, text: `n = 0, so the loop stops and Euclid returns <b>${m}</b> after ${divs} division${divs === 1 ? "" : "s"}.` });
    return st;
  }

  function consecutiveSteps(m, n) {
    const st = [];
    let t = Math.min(m, n), divs = 0;
    const tried = []; // {t, a: bool, b: bool|null}
    st.push({ line: 1, ops: 0, divs, t, tried: [], text: `Start at t = min(${m}, ${n}) = ${t}: the gcd can't be bigger than the smaller number.` });
    while (t > 0) {
      divs++;
      const a = m % t === 0;
      const rec = { t, a, b: null };
      tried.push(rec);
      if (!a) {
        st.push({ line: [3, 6], ops: divs, divs, t, tried: clone(tried), text: `${m} mod ${t} = ${m % t} ≠ 0, so ${t} does not divide m. Try t = ${t - 1}.` });
        t--; continue;
      }
      st.push({ line: 3, ops: divs, divs, t, tried: clone(tried), text: `${m} mod ${t} = 0 ✓ — ${t} divides m. Now test n.` });
      divs++;
      rec.b = n % t === 0;
      if (rec.b) {
        st.push({ line: [4, 5], ops: divs, divs, t, tried: clone(tried), done: true, result: t, text: `${n} mod ${t} = 0 ✓ — ${t} divides both, and every larger t already failed, so gcd = <b>${t}</b> (${divs} divisions).` });
        return st;
      }
      st.push({ line: [4, 6], ops: divs, divs, t, tried: clone(tried), text: `${n} mod ${t} = ${n % t} ≠ 0 ✗ — ${t} divides m but not n. Try t = ${t - 1}.` });
      t--;
    }
    return st;
  }
  const clone = (x) => x.map((o) => Object.assign({}, o));

  function middleSchoolSteps(m, n) {
    const st = [];
    let divs = 0, cmps = 0;
    const Fm = [], Fn = [];
    const snap = (extra) => Object.assign({ ops: divs + cmps, divs, cmps, Fm: Fm.slice(), Fn: Fn.slice() }, extra);
    st.push(snap({ line: 1, phase: "m", text: `Step 1: factor m = ${m} into primes by trial division.` }));
    function factor(x0, F, which, other) {
      let x = x0, p = 2;
      while (p * p <= x) {
        for (;;) {
          divs++;
          const r = x % p;
          if (r === 0) {
            F.push(p);
            const nx = x / p;
            st.push(snap({ line: [which === "m" ? 1 : 2, 22, 23, 24], phase: which, x: nx, p, text: `Factoring ${which}: ${x} mod ${p} = 0, so ${p} is a factor. Divide: x = ${nx}.` }));
            x = nx;
          } else {
            let note = "";
            const np = p + 1;
            if (np * np > x) {
              if (x > 1) { F.push(x); note = ` Next p = ${np} has p·p = ${np * np} > ${x}, so the leftover ${x} is prime and joins the list.`; }
              else note = ` Nothing left to factor.`;
              note += ` F${which} = [${F.join(", ")}].` + (other ? ` Now factor n.` : ` Now walk both lists.`);
            }
            st.push(snap({ line: [which === "m" ? 1 : 2, 22, 25], phase: which, x, p, text: `Factoring ${which}: ${x} mod ${p} = ${r} ≠ 0, so try the next p.` + note }));
            p = np;
            break;
          }
        }
      }
      if (x0 < 4) {
        // the trial-division loop never ran (x0 is 1, 2 or 3): no divisions at all
        if (x0 > 1) F.push(x0);
        st.push(snap({ line: [which === "m" ? 1 : 2, 21, 26, 27, 28], phase: which, text: x0 === 1
          ? `${which} = 1 has no prime factors: F${which} = [ ].`
          : `${which} = ${x0}: already 2·2 = 4 > ${x0}, so no trial division is needed; ${x0} itself is prime. F${which} = [${x0}].` }));
      }
    }
    factor(m, Fm, "m", true);
    factor(n, Fn, "n", false);
    let i = 0, j = 0, g = 1;
    const common = [];
    while (i < Fm.length && j < Fn.length) {
      cmps++;
      if (Fm[i] === Fn[j]) {
        g *= Fm[i];
        common.push([i, j]);
        st.push(snap({ line: [7, 8, 9, 10], phase: "merge", i, j, g, common: common.slice(), text: `Fm[${i}] = ${Fm[i]} equals Fn[${j}] = ${Fn[j]}: a shared prime. g ← g · ${Fm[i]} = ${g}. Advance both.` }));
        i++; j++;
      } else if (Fm[i] < Fn[j]) {
        st.push(snap({ line: [11, 12], phase: "merge", i, j, g, common: common.slice(), text: `Fm[${i}] = ${Fm[i]} < Fn[${j}] = ${Fn[j]}: ${Fm[i]} can't be matched in Fn any more, advance i.` }));
        i++;
      } else {
        st.push(snap({ line: [13, 14], phase: "merge", i, j, g, common: common.slice(), text: `Fm[${i}] = ${Fm[i]} > Fn[${j}] = ${Fn[j]}: advance j.` }));
        j++;
      }
    }
    st.push(snap({ line: 15, phase: "merge", i, j, g, common: common.slice(), done: true, result: g, text: `One list is used up. The product of the shared primes is g = <b>${g}</b> (${divs} trial divisions + ${cmps} comparisons).` }));
    return st;
  }

  /* ------------------------------------------------------------ gcd race frames */
  function recordRace(m, n) {
    const L = { E: euclidSteps(m, n), C: consecutiveSteps(m, n), M: middleSchoolSteps(m, n) };
    const T = Math.max(L.E.length, L.C.length, L.M.length);
    const maxOps = Math.max(L.E[L.E.length - 1].ops, L.C[L.C.length - 1].ops, L.M[L.M.length - 1].ops, 1);
    const frames = [];
    for (let k = 0; k < T; k++) {
      const f = { k, m, n, maxOps };
      for (const a of "ECM") {
        const arr = L[a];
        f[a] = arr[Math.min(k, arr.length - 1)];
        f[a + "fresh"] = k < arr.length; // still producing new steps
        f[a + "fin"] = k >= arr.length - 1;
      }
      frames.push(f);
    }
    return frames;
  }

  function drawChipRow(g, items, x, y, opt) {
    // items: [{t, state}] ; draws small boxes left to right
    let cx = x;
    items.forEach((it) => {
      const w = Math.max(opt.minW || 30, String(it.t).length * 8.5 + 14);
      const fill = { active: "var(--c-active)", done: "var(--c-done)", compare: "var(--c-compare)", dim: "var(--c-dim)", swap: "var(--c-swap)" }[it.state] || "var(--panel-2)";
      g.appendChild(S("rect", { x: cx, y, width: w, height: 24, rx: 6, fill, stroke: it.state ? fill : "var(--line-2)" }));
      g.appendChild(S("text", { x: cx + w / 2, y: y + 16.5, "text-anchor": "middle", "font-size": 12.5, "font-weight": 700, fill: it.state && it.state !== "dim" ? "#0d1117" : "var(--ink)" }, String(it.t)));
      if (it.sub) g.appendChild(S("text", { x: cx + w / 2, y: y + 38, "text-anchor": "middle", "font-size": 11, fill: "var(--ink-2)" }, it.sub));
      cx += w + (opt.gap || 6);
      if (opt.sep && it !== items[items.length - 1]) g.appendChild(S("text", { x: cx - (opt.gap || 6) / 2, y: y + 17, "text-anchor": "middle", "font-size": 13, fill: "var(--muted)" }, opt.sep));
    });
    return cx;
  }

  function renderRace(f) {
    const W = narrow() ? 520 : 760, LH = 136, H = LH * 3 + 8;
    stage.setAttribute("viewBox", `0 0 ${W} ${H}`);
    stage.innerHTML = "";
    const lanes = ["E", "C", "M"];
    lanes.forEach((a, idx) => {
      const s = f[a], y = 6 + idx * LH;
      const g = S("g", null);
      const isFocus = a === focus;
      g.appendChild(S("rect", { x: 6, y, width: W - 12, height: LH - 8, rx: 12, fill: isFocus ? "var(--ember-soft)" : "var(--panel)", stroke: isFocus ? "var(--ember)" : "var(--line)" }));
      g.appendChild(S("text", { x: 20, y: y + 24, "font-size": 14, "font-weight": 800, fill: "var(--ink)", style: "font-family: var(--font)" }, NAMES[a]));
      const opsLabel = a === "M" ? `${s.divs} ÷ + ${s.cmps} cmp` : `${s.divs} ÷`;
      g.appendChild(S("text", { x: W - 20, y: y + 24, "text-anchor": "end", "font-size": 12.5, fill: "var(--ink-2)" }, s.done ? `✔ gcd = ${s.result} · ${opsLabel}` : `running · ${opsLabel}`));
      // track
      const tx0 = 20, tx1 = W - 40, ty = y + 44;
      g.appendChild(S("line", { x1: tx0, x2: tx1, y1: ty, y2: ty, stroke: "var(--line-2)", "stroke-width": 6, "stroke-linecap": "round" }));
      const px = tx0 + ((tx1 - tx0) * s.ops) / f.maxOps;
      g.appendChild(S("line", { x1: tx0, x2: px, y1: ty, y2: ty, stroke: s.done ? "var(--c-done)" : "var(--c-active)", "stroke-width": 6, "stroke-linecap": "round" }));
      g.appendChild(S("circle", { cx: px, cy: ty, r: 8, fill: s.done ? "var(--c-done)" : "var(--c-active)", stroke: "var(--bg-2)", "stroke-width": 2 }));
      if (s.done) g.appendChild(S("text", { x: px + 12, y: ty + 5, "font-size": 14 }, "🏁"));
      const dy = y + 62;
      if (a === "E") {
        const pairs = s.pairs.slice(narrow() ? -3 : -6);
        const items = pairs.map((p, k) => ({ t: `(${p[0]}, ${p[1]})`, state: k === pairs.length - 1 ? (s.done ? "done" : "compare") : null }));
        const off = s.pairs.length - pairs.length;
        if (off > 0) g.appendChild(S("text", { x: 20, y: dy + 17, "font-size": 12, fill: "var(--muted)" }, "…"));
        drawChipRow(g, items, off > 0 ? 36 : 20, dy, { gap: 24, sep: "→" });
        g.appendChild(S("text", { x: 20, y: dy + 52, "font-size": 11.5, fill: "var(--muted)" }, "each arrow: (m, n) → (n, m mod n)"));
      } else if (a === "C") {
        const shown = s.tried.slice(narrow() ? -9 : -15);
        const items = shown.map((r, k) => ({
          t: r.t,
          state: k === shown.length - 1 ? (s.done ? "done" : "compare") : r.a ? "active" : null,
          sub: (r.a ? "✓" : "✗") + (r.b == null ? " ·" : r.b ? " ✓" : " ✗"),
        }));
        if (!shown.length) g.appendChild(S("text", { x: 20, y: dy + 17, "font-size": 12, fill: "var(--muted)" }, `t starts at ${s.t}`));
        if (s.tried.length > shown.length) g.appendChild(S("text", { x: 20, y: dy + 17, "font-size": 12, fill: "var(--muted)" }, "…"));
        drawChipRow(g, items, s.tried.length > shown.length ? 34 : 20, dy, { minW: 38, gap: 5 });
        g.appendChild(S("text", { x: W - 20, y: dy + 52, "text-anchor": "end", "font-size": 11.5, fill: "var(--muted)" }, "marks: divides m? · divides n?"));
      } else {
        const cm = new Set((s.common || []).map((c) => c[0])), cn = new Set((s.common || []).map((c) => c[1]));
        const mk = (F, which, set) => F.map((v, k) => ({ t: v, state: set.has(k) ? "done" : s.phase === "merge" && !s.done && ((which === "m" && k === s.i) || (which === "n" && k === s.j)) ? "compare" : null }));
        g.appendChild(S("text", { x: 20, y: dy + 16, "font-size": 12, fill: "var(--ink-2)" }, "Fm"));
        drawChipRow(g, mk(s.Fm, "m", cm), 48, dy, { minW: 28, gap: 5 });
        g.appendChild(S("text", { x: 20, y: dy + 46, "font-size": 12, fill: "var(--ink-2)" }, "Fn"));
        drawChipRow(g, mk(s.Fn, "n", cn), 48, dy + 30, { minW: 28, gap: 5 });
        let info = "";
        if (s.phase === "m" || s.phase === "n") info = s.p ? `factoring ${s.phase}: x = ${s.x}, p = ${s.p}` : `factoring ${s.phase}…`;
        else info = `g = ${s.g}`;
        g.appendChild(S("text", { x: W - 20, y: dy + 46, "text-anchor": "end", "font-size": 12.5, fill: "var(--ink)" }, info));
      }
      stage.appendChild(g);
    });
    code.highlight(f[focus].line);
    ctr.set({ tick: f.k, "Euclid ÷": f.E.divs, "Consecutive ÷": f.C.divs, "Middle-school ÷": f.M.divs, "Middle-school cmp": f.M.cmps });
    const others = "ECM".split("").filter((a) => a !== focus).map((a) => {
      const s = f[a];
      const status = !f[a + "fresh"] ? `finished (gcd = ${s.result})` : s.text.replace(/<[^>]+>/g, "");
      return `<div class="muted small" style="margin-top:6px"><b>${NAMES[a]}:</b> ${status}</div>`;
    }).join("");
    const main = f[focus + "fresh"] || f.k === 0 ? f[focus].text : `${NAMES[focus]} already finished: gcd = <b>${f[focus].result}</b>. The others are still working.`;
    say.say(`<div><b>${NAMES[focus]}:</b> ${main}</div>${others}`);
  }

  /* ------------------------------------------------------------ sieve frames */
  function recordSieve(n) {
    const frames = [];
    const A = Array.from({ length: n + 1 }, (_, k) => (k >= 2 ? k : 0));
    const by = new Array(n + 1).fill(0), hits = new Array(n + 1).fill(0), primes = new Set();
    let elim = 0, rep = 0;
    const lim = Math.floor(Math.sqrt(n));
    const push = (o) => frames.push(Object.assign({ n, by: by.slice(), hits: hits.slice(), primes: [...primes], elim, rep, lim }, o));
    push({ line: [1, 2, 3], text: `Write down every candidate 2, 3, …, ${n}. Nothing is crossed out yet. The outer loop only needs p up to ⌊√${n}⌋ = ${lim}.` });
    for (let p = 2; p <= lim; p++) {
      if (A[p] === 0) {
        push({ line: [4, 5], p, text: `p = ${p}: already crossed out (by ${by[p]}), so it is not prime and every multiple of ${p} is also a multiple of ${by[p]} — skip it.` });
        continue;
      }
      primes.add(p);
      push({ line: [4, 5, 6], p, j: p * p, text: `p = ${p} survived every earlier pass, so it is prime. Start crossing at p·p = ${p * p}: smaller multiples like ${p}·2 were already crossed by smaller primes.` });
      for (let j = p * p; j <= n; j += p) {
        elim++;
        hits[j]++;
        const again = A[j] === 0;
        if (again) rep++;
        else by[j] = p;
        A[j] = 0;
        push({ line: [7, 8, 9], p, j, again, text: again
          ? `Cross out ${j} = ${p}·${j / p} — but it was <b>already</b> crossed out by ${by[j]}. Wasted work (repeat #${rep}).`
          : `Cross out ${j} = ${p}·${j / p}: a multiple of ${p}, so not prime. Next j = ${j} + ${p} = ${j + p}${j + p > n ? " > n, stop." : "."}` });
      }
    }
    for (let k = 2; k <= n; k++) if (A[k] !== 0) primes.add(k);
    push({ line: [10, 11, 12, 13, 14], final: true, text: `Every number still standing is prime: <b>${primes.size}</b> primes ≤ ${n}. Total eliminations ${elim}, of which ${rep} hit an already-crossed cell. (Levitin §1.1)` });
    return frames;
  }

  let picking = false;
  function renderSieve(f) {
    const n = f.n, cols = 10, cw = 72, ch = 44, rows = Math.floor(n / 10) + 1;
    const W = 16 + cols * cw, H = 12 + rows * ch;
    stage.setAttribute("viewBox", `0 0 ${W} ${H}`);
    stage.innerHTML = "";
    const pr = new Set(f.primes);
    for (let k = 2; k <= n; k++) {
      const r = Math.floor(k / 10), c = k % 10, x = 8 + c * cw, y = 6 + r * ch;
      let fill = "var(--panel-2)", ink = "var(--ink)", stroke = "var(--line-2)";
      const crossed = f.by[k] > 0;
      if (crossed) { fill = "var(--c-dim)"; ink = "var(--muted)"; }
      if (pr.has(k)) { fill = "var(--c-done)"; ink = "#0d1117"; }
      if (k === f.p) { fill = "var(--c-active)"; ink = "#0d1117"; }
      if (k === f.j && f.again) { fill = "var(--c-compare)"; ink = "#0d1117"; }
      else if (k === f.j && crossed && f.line && [].concat(f.line).includes(8)) { fill = "var(--c-swap)"; ink = "#0d1117"; }
      const g = S("g", { class: "cell", "data-k": k });
      g.appendChild(S("rect", { x: x + 3, y: y + 3, width: cw - 6, height: ch - 6, rx: 7, fill, stroke }));
      g.appendChild(S("text", { x: x + cw / 2, y: y + (crossed ? 21 : 27), "text-anchor": "middle", "font-size": 15, "font-weight": 700, fill: ink }, String(k)));
      if (crossed) {
        g.appendChild(S("line", { x1: x + 14, y1: y + ch - 12, x2: x + cw - 14, y2: y + 11, stroke: ink, "stroke-width": 1.6, opacity: 0.8 }));
        g.appendChild(S("text", { x: x + cw / 2, y: y + ch - 8, "text-anchor": "middle", "font-size": 10, fill: ink }, `×${f.by[k]}` + (f.hits[k] > 1 ? `  (${f.hits[k]}×)` : "")));
      }
      g.addEventListener("click", () => onCellPick(k));
      stage.appendChild(g);
    }
    code.highlight(f.line);
    ctr.set({ p: f.p || "—", "eliminations": f.elim, "repeats (wasted)": f.rep, "primes confirmed": f.primes.length, "⌊√n⌋": f.lim });
    say.say(f.text);
  }

  /* ------------------------------------------------------------ player + mode switching */
  const player = Forge.player($("player"), { frames: [], render: (f, i) => { clearPredict(); (mode === "gcd" ? renderRace : renderSieve)(f, i); } });

  function setLegend() {
    const L = mode === "gcd"
      ? [["var(--c-compare)", "latest step"], ["var(--c-active)", "work done / t divides m"], ["var(--c-done)", "finished · shared prime"], ["var(--ember)", "lane shown in pseudocode"]]
      : [["var(--c-active)", "current p"], ["var(--c-swap)", "crossed out now"], ["var(--c-compare)", "already crossed (wasted)"], ["var(--c-dim)", "crossed out"], ["var(--c-done)", "prime"]];
    $("legend").innerHTML = L.map(([c, t]) => `<span><i style="background:${c}"></i>${t}</span>`).join("");
  }
  function setupPanels() {
    $("code").innerHTML = ""; $("ctr").innerHTML = "";
    code = Forge.code($("code"), mode === "gcd" ? CODE[focus] : CODE.SIEVE);
    ctr = Forge.counters($("ctr"), mode === "gcd"
      ? { tick: 0, "Euclid ÷": 0, "Consecutive ÷": 0, "Middle-school ÷": 0, "Middle-school cmp": 0 }
      : { p: "—", eliminations: 0, "repeats (wasted)": 0, "primes confirmed": 0, "⌊√n⌋": 0 });
    setLegend();
    $("predictHint").textContent = mode === "gcd" ? "Euclid's next remainder" : "click the next cell to be crossed out";
  }
  function setMode(md) {
    mode = md;
    document.querySelectorAll("#modeTabs button").forEach((b) => b.classList.toggle("on", b.dataset.mode === md));
    $("ctlGcd").classList.toggle("on", md === "gcd");
    $("ctlSieve").classList.toggle("on", md === "sieve");
    setupPanels();
    if (md === "gcd") player.load(recordRace(gcdInput[0], gcdInput[1]));
    else player.load(recordSieve(sieveN));
  }
  document.querySelectorAll("#modeTabs button").forEach((b) => (b.onclick = () => setMode(b.dataset.mode)));

  function readGcd() {
    const m = Math.floor(+$("inM").value), n = Math.floor(+$("inN").value);
    if (!(m >= 1 && m <= 9999 && n >= 1 && n <= 9999)) { say.say("Please enter two whole numbers between 1 and 9,999 (consecutive integer checking needs positive inputs, and very large ones would take tens of thousands of ticks)."); return; }
    gcdInput = [m, n];
    player.load(recordRace(m, n));
  }
  $("loadGcd").onclick = readGcd;
  $("randGcd").onclick = () => {
    const g = 1 + Math.floor(Math.random() * 30);
    $("inM").value = g * (2 + Math.floor(Math.random() * 60));
    $("inN").value = g * (2 + Math.floor(Math.random() * 60));
    readGcd();
  };
  $("preset").onchange = (e) => { if (!e.target.value) return; const [a, b] = e.target.value.split(","); $("inM").value = a; $("inN").value = b; readGcd(); };
  $("focus").onchange = (e) => { focus = e.target.value; const i = player.index; setupPanels(); player.go(i); };
  $("loadSieve").onclick = () => {
    const n = Math.floor(+$("inSieve").value);
    if (!(n >= 2 && n <= 200)) { say.say("Pick n between 2 and 200 so the grid stays readable."); return; }
    sieveN = n; player.load(recordSieve(n));
  };
  $("randSieve").onclick = () => { $("inSieve").value = 20 + Math.floor(Math.random() * 131); $("loadSieve").onclick(); };

  /* ------------------------------------------------------------ predict */
  function clearPredict() { if (!keepPredict) { $("predict").innerHTML = ""; picking = false; stage.classList.remove("picking"); } }
  let keepPredict = false;
  let pendingSieve = null;
  function onCellPick(k) {
    if (!picking || !pendingSieve) return;
    picking = false; stage.classList.remove("picking");
    const { idx, j } = pendingSieve;
    const right = k === j;
    const f = player.frames[idx];
    keepPredict = true;
    player.go(idx);
    keepPredict = false;
    $("predict").innerHTML = `<div class="callout ${right ? "ok" : "bad"}"><b>${right ? "✔ Yes!" : "✘ Not quite."}</b> You picked ${k}; the next crossing is <b>${j}</b>${f.again ? " (a repeat!)" : ""}. ${j === f.p * f.p ? `It is p·p = ${f.p}·${f.p}: the first multiple of ${f.p} that no smaller prime has handled.` : `Crossing moves in steps of p = ${f.p}.`}</div>`;
  }
  $("predictBtn").onclick = () => {
    player.pause();
    const frames = player.frames, i = player.index;
    if (mode === "sieve") {
      let idx = -1;
      for (let k = i + 1; k < frames.length; k++) if (frames[k].j && [].concat(frames[k].line).includes(8)) { idx = k; break; }
      if (idx < 0) { $("predict").innerHTML = `<div class="callout">No more crossings: the sieve is finished. Load a bigger n and try again.</div>`; return; }
      pendingSieve = { idx, j: frames[idx].j };
      picking = true; stage.classList.add("picking");
      $("predict").innerHTML = `<div class="callout steel"><b>🤔 Predict:</b> click the cell that will be crossed out next.</div>`;
      return;
    }
    // gcd: Euclid's next remainder, else a whole-run question
    let idx = -1;
    for (let k = i + 1; k < frames.length; k++) if (frames[k].Efresh && frames[k].E.r != null && frames[k].E.divs > frames[i].E.divs) { idx = k; break; }
    if (idx >= 0) {
      const cur = frames[i].E;
      const r = frames[idx].E.r;
      F12.predict($("predict"), {
        prompt: `Euclid's pair is (${cur.m}, ${cur.n}). What is the next remainder, ${cur.m} mod ${cur.n}?`,
        answer: r,
        check: (v) => +v === r,
        explain: `${cur.m} = ${Math.floor(cur.m / cur.n)}·${cur.n} + ${r}.`,
        onReveal: () => { keepPredict = true; player.go(idx); keepPredict = false; },
      });
    } else {
      const last = frames[frames.length - 1];
      const tot = { E: last.E.ops, C: last.C.ops, M: last.M.ops };
      const best = Object.keys(tot).sort((a, b) => tot[a] - tot[b])[0];
      F12.predict($("predict"), {
        prompt: `Euclid is done. Which algorithm needs the <b>most</b> basic operations in total for (${last.m}, ${last.n})?`,
        choices: ["Euclid", "Consecutive integer checking", "Middle-school"],
        answer: NAMES[Object.keys(tot).sort((a, b) => tot[b] - tot[a])[0]],
        explain: `Totals: Euclid ${tot.E}, consecutive ${tot.C}, middle-school ${tot.M}. Fewest: ${NAMES[best]}.`,
        onReveal: () => { keepPredict = true; player.go(frames.length - 1); keepPredict = false; },
      });
    }
  };

  window.addEventListener("resize", () => player.go(player.index));
  setMode("gcd");
})();
