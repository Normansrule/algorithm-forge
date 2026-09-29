/* =====================================================================
   Algorithm Forge — Search Lab (docs/sims/search-lab.html)
   Seven decrease-and-conquer (and one brute-force) tools on one page.
   One shared Forge.player; each tab supplies controls, pseudocode,
   counters, a recorder and a renderer.
   Part 1 (recorders) also runs in Node for testing.
   ===================================================================== */
(function () {
  "use strict";

  /* ================= Part 1: recorders ================= */
  function parseSpec(spec) {
    const L = {}, lines = [];
    spec.forEach((s) => { const m = /^@(\w+)\|(.*)$/.exec(s); if (m) { L[m[1]] = lines.length; lines.push(m[2]); } else lines.push(s); });
    return { L, lines };
  }
  function hash(s) { let h = 2166136261; for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mkAsk(q, correct, pool, why) {
    const c = String(correct);
    const uniq = [...new Set(pool.map(String))].filter((x) => x !== c);
    if (!uniq.length) return null;
    uniq.sort((a, b) => hash(a + q) - hash(b + q));
    const opts = [c, ...uniq.slice(0, 3)];
    if (opts.every((x) => /^-?\d+$/.test(x))) opts.sort((a, b) => a - b);
    return { q, opts, ans: opts.indexOf(c), why };
  }
  const range = (a, b) => { const r = []; for (let k = a; k <= b; k++) r.push(k); return r; };
  const log2 = (x) => Math.log(x) / Math.LN2;
  const floorLog2 = (n) => { let k = 0; while ((1 << (k + 1)) <= n) k++; return k; };
  /** A tiny frame recorder: push(line, text, data) snapshots the counters too. */
  function Rec(spec) {
    const P = parseSpec(spec), frames = [], c = {};
    const one = (k) => { if (k == null || typeof k === "number") return k; if (!(k in P.L)) throw new Error("no line " + k); return P.L[k]; };
    return {
      lines: P.lines, frames, c,
      push(line, text, d) { frames.push(Object.assign({ line: Array.isArray(line) ? line.map(one) : one(line), text, c: Object.assign({}, c) }, d || {})); return frames.length - 1; },
    };
  }
  /** Keep at most `max` Predict questions per run, spread out. */
  function thinAsks(frames, max) {
    const idx = frames.map((f, i) => (f.ask ? i : -1)).filter((i) => i >= 0);
    if (idx.length <= max) return frames;
    const keep = new Set(); for (let t = 0; t < max; t++) keep.add(idx[Math.round((t * (idx.length - 1)) / (max - 1))]);
    frames.forEach((f, i) => { if (!keep.has(i)) f.ask = null; });
    return frames;
  }

  const REC = {};

  /* ---- Sequential search with a sentinel (Levitin §3.2) ---- */
  REC.seq = function (A, K) {
    const n = A.length;
    const R = Rec([
      "@start|ALGORITHM SequentialSearch2(A[0..n], K)",
      "    // A has one spare cell, A[n], for the sentinel",
      "@sent|    A[n] ← K",
      "@i0|    i ← 0",
      "@while|    while A[i] ≠ K do",
      "@inc|        i ← i + 1",
      "@check|    if i < n then return i",
      "@fail|    else return −1",
    ]);
    const B = A.concat([K]);
    const pos = B.indexOf(K), found = pos < n;
    const plain = found ? 2 * (pos + 1) : 2 * n + 1;
    R.c.cmp = 0; R.c.bound = 0;
    const base = { arr: A.slice(), sentinel: false, plain };
    R.push("start", `Search for K = ${K} among n = ${n} elements. A plain sequential search checks two things on every step: "is i still < n?" and "is A[i] = K?".`, Object.assign({}, base));
    R.push("sent", `Copy K into the spare cell A[${n}]. Now the loop is guaranteed to stop (at the latest on the sentinel), so it never needs the "i < n" test inside the loop.`,
      { arr: B, sentinel: true, plain, st: { [n]: "pivot" },
        ask: mkAsk(`How many key comparisons (A[i] ≠ K) will this search make?`, pos + 1, [n, n + 1, pos, pos + 2, Math.max(1, Math.floor(n / 2))].filter((x) => x >= 1 && x !== pos + 1),
          found ? `The first copy of ${K} is at index ${pos}, and every index 0..${pos} is compared once: ${pos + 1} comparisons.` : `${K} is not in A[0..${n - 1}], so the loop runs all the way to the sentinel at index ${n}: n + 1 = ${n + 1} comparisons.`) });
    R.push("i0", `Start at i = 0.`, { arr: B, sentinel: true, plain, ptr: [{ i: 0, label: "i" }], st: { [n]: "pivot" } });
    let i = 0;
    for (;;) {
      R.c.cmp++;
      const eq = B[i] === K, st = { [n]: "pivot" };
      for (let t = 0; t < i; t++) st[t] = "dim";
      st[i] = eq ? "done" : "compare";
      if (eq) { R.push("while", `A[${i}] = ${B[i]} equals K: the loop stops${i === n ? " (on the sentinel)" : ""}.`, { arr: B, sentinel: true, plain, st, ptr: [{ i, label: "i" }] }); break; }
      R.push(["while", "inc"], `A[${i}] = ${B[i]} ≠ ${K}: move on to i = ${i + 1}.`, { arr: B, sentinel: true, plain, st, ptr: [{ i, label: "i" }] });
      i++;
    }
    R.c.bound = 1;
    const st = { [n]: "pivot" }; for (let t = 0; t < i; t++) st[t] = "dim";
    if (i < n) { st[i] = "done"; R.push("check", `i = ${i} < n = ${n}, so we found a real element, not the sentinel. Return ${i}. Total: ${R.c.cmp} key comparisons + 1 index check (the plain version would need ${plain} checks).`, { arr: B, sentinel: true, plain, st, ptr: [{ i, label: "i" }] }); }
    else { st[n] = "swap"; R.push(["check", "fail"], `i = n = ${n}: we only hit the sentinel, so K is not in the array. Return −1. Total: ${R.c.cmp} key comparisons + 1 index check (the plain version would need ${plain}).`, { arr: B, sentinel: true, plain, st, ptr: [{ i, label: "i" }] }); }
    return { lines: R.lines, frames: R.frames };
  };

  /* ---- Binary search (Levitin §4.4) ---- */
  REC.binary = function (A, K) {
    const n = A.length, bound = floorLog2(n) + 1;
    const R = Rec([
      "@start|ALGORITHM BinarySearch(A[0..n-1], K)",
      "    // A is sorted in ascending order",
      "@init|    l ← 0; r ← n − 1",
      "@while|    while l ≤ r do",
      "@m|        m ← ⌊(l + r) / 2⌋",
      "@eq|        if K = A[m] then return m",
      "@lt|        else if K < A[m] then r ← m − 1",
      "@gt|        else l ← m + 1",
      "@fail|    return −1",
    ]);
    R.c.cmp = 0;
    const trace = [];
    const snap = (o) => Object.assign({ arr: A.slice(), trace: trace.map((t) => Object.assign({}, t)), bound }, o);
    R.push("start", `Search for K = ${K} in a sorted array of n = ${n}. Each three-way comparison of K with the middle element throws away half of what is left, so at most ⌊log₂n⌋ + 1 = ${bound} comparisons are ever needed.`, snap({ l: 0, r: n - 1 }));
    let l = 0, r = n - 1;
    R.push("init", `The search range is the whole array: l = 0, r = ${n - 1}.`, snap({ l, r, ptr: [{ i: l, label: "l" }, { i: r, label: "r" }] }));
    while (l <= r) {
      const m = (l + r) >> 1;
      const next = K === A[m] ? "found it" : K < A[m] ? "go left (r ← m − 1)" : "go right (l ← m + 1)";
      trace.push({ l, r, m });
      R.push(["while", "m"], `l = ${l} ≤ r = ${r}, so look at the middle: m = ⌊(${l} + ${r}) / 2⌋ = ${m}, where A[${m}] = ${A[m]}.`,
        snap({ l, r, m, st: { [m]: "active" }, ptr: [{ i: l, label: "l" }, { i: m, label: "m" }, { i: r, label: "r" }],
          ask: mkAsk(`K = ${K}, A[m] = ${A[m]}. What happens next?`, next, ["found it", "go left (r ← m − 1)", "go right (l ← m + 1)"], K === A[m] ? `K equals A[${m}].` : K < A[m] ? `${K} < ${A[m]}, and everything right of m is even larger, so only the left part can hold K.` : `${K} > ${A[m]}, and everything left of m is even smaller, so only the right part can hold K.`) }));
      R.c.cmp++;
      if (K === A[m]) {
        trace[trace.length - 1].hit = true;
        R.push("eq", `K = A[${m}] = ${A[m]}: found at index ${m} after ${R.c.cmp} comparison(s) (the worst case for n = ${n} is ${bound}).`, snap({ l, r, m, st: { [m]: "done" }, ptr: [{ i: m, label: "m" }], result: m }));
        return { lines: R.lines, frames: thinAsks(R.frames, 3) };
      }
      if (K < A[m]) { r = m - 1; R.push("lt", `${K} < A[${m}] = ${A[m]}, so K can only be to the left: r ← ${m} − 1 = ${r}.`, snap({ l, r, m, st: { [m]: "compare" }, ptr: [{ i: l, label: "l" }, { i: r, label: "r" }] })); }
      else { l = m + 1; R.push("gt", `${K} > A[${m}] = ${A[m]}, so K can only be to the right: l ← ${m} + 1 = ${l}.`, snap({ l, r, m, st: { [m]: "compare" }, ptr: [{ i: l, label: "l" }, { i: r, label: "r" }] })); }
    }
    R.push(["while", "fail"], `l = ${l} > r = ${r}: the range is empty, so K = ${K} is not in the array. Return −1 after ${R.c.cmp} comparison(s) (bound: ${bound}).`, snap({ l, r, result: -1 }));
    return { lines: R.lines, frames: thinAsks(R.frames, 3) };
  };
  /** Just the comparison count of binary search (for comparing with interpolation search). */
  function binaryCount(A, K) { let l = 0, r = A.length - 1, c = 0; while (l <= r) { const m = (l + r) >> 1; c++; if (K === A[m]) return c; if (K < A[m]) r = m - 1; else l = m + 1; } return c; }

  /* ---- Interpolation search (Levitin §4.5) ---- */
  REC.interp = function (A, v) {
    const n = A.length;
    const R = Rec([
      "@start|ALGORITHM InterpolationSearch(A[0..n-1], v)",
      "@init|    l ← 0; r ← n − 1",
      "@while|    while l ≤ r and A[l] ≤ v ≤ A[r] do",
      "@flat|        if A[l] = A[r] then return (l if A[l] = v else −1)",
      "@x|        x ← l + ⌊(v − A[l])(r − l) / (A[r] − A[l])⌋",
      "@eq|        if v = A[x] then return x",
      "@lt|        else if v < A[x] then r ← x − 1",
      "@gt|        else l ← x + 1",
      "@fail|    return −1",
    ]);
    const bin = binaryCount(A, v);
    R.c.probes = 0; R.c.bin = bin;
    const snap = (o) => Object.assign({ arr: A.slice(), v }, o);
    R.push("start", `Search for v = ${v}. Instead of always probing the middle, interpolation search guesses where v should be, assuming the values grow roughly like a straight line from A[l] to A[r]. (Binary search needs ${bin} comparison(s) on this input.)`, snap({ l: 0, r: n - 1 }));
    let l = 0, r = n - 1;
    R.push("init", `Range: l = 0, r = ${n - 1}.`, snap({ l, r }));
    while (l <= r && A[l] <= v && v <= A[r]) {
      if (A[l] === A[r]) {
        R.c.probes++;
        const ok = A[l] === v;
        R.push(["while", "flat"], `A[${l}] = A[${r}]: every value in the range is the same, so there is no line to follow. ${ok ? `It equals v: return ${l}.` : `It is not v: return −1.`}`, snap({ l, r, x: l, hit: ok ? l : null }));
        return { lines: R.lines, frames: R.frames };
      }
      const exact = l + ((v - A[l]) * (r - l)) / (A[r] - A[l]);
      const x = Math.floor(exact);
      R.push(["while", "x"], `A[${l}] = ${A[l]} ≤ ${v} ≤ A[${r}] = ${A[r]}. The straight line through (${l}, ${A[l]}) and (${r}, ${A[r]}) reaches height ${v} at position ${exact.toFixed(2)}, so probe x = ${x}.`,
        snap({ l, r, x, exact, ask: mkAsk(`Which index will be probed? (x = l + ⌊(v − A[l])(r − l)/(A[r] − A[l])⌋)`, x, range(l, r), `x = ${l} + ⌊(${v} − ${A[l]})·(${r} − ${l}) / (${A[r]} − ${A[l]})⌋ = ${l} + ⌊${(exact - l).toFixed(2)}⌋ = ${x}.`) }));
      R.c.probes++;
      if (v === A[x]) { R.push("eq", `A[${x}] = ${A[x]} = v: found at index ${x} with ${R.c.probes} probe(s). Binary search needs ${bin} here.`, snap({ l, r, x, hit: x })); return { lines: R.lines, frames: thinAsks(R.frames, 3) }; }
      if (v < A[x]) { R.push("lt", `v = ${v} < A[${x}] = ${A[x]}: keep the left part, r ← ${x - 1}.`, snap({ l, r, x })); r = x - 1; }
      else { R.push("gt", `v = ${v} > A[${x}] = ${A[x]}: keep the right part, l ← ${x + 1}.`, snap({ l, r, x })); l = x + 1; }
    }
    R.push(["while", "fail"], `${l > r ? `l > r: the range is empty` : `v = ${v} lies outside [A[${l}], A[${r}]] = [${A[l]}, ${A[r]}]`}, so v is not in the array. ${R.c.probes} probe(s); binary search needs ${bin}.`, snap({ l, r }));
    return { lines: R.lines, frames: thinAsks(R.frames, 3) };
  };

  /* ---- Quickselect with Lomuto partition (Levitin §4.5) ---- */
  REC.qselect = function (input, k) {
    const A = input.slice(), n = A.length;
    const R = Rec([
      "@start|ALGORITHM Quickselect(A[0..n-1], k)",
      "    // Returns the k-th smallest element, 1 ≤ k ≤ n",
      "@init|    l ← 0; r ← n − 1",
      "    while l ≤ r do",
      "@part|        s ← LomutoPartition(A[l..r])",
      "@eq|        if s = k − 1 then return A[s]",
      "@gt|        else if s > k − 1 then r ← s − 1",
      "@lt|        else l ← s + 1",
      "",
      "ALGORITHM LomutoPartition(A[l..r])",
      "@p|    p ← A[l]; s ← l",
      "    for i ← l + 1 to r do",
      "@cmp|        if A[i] < p then",
      "@swap|            s ← s + 1; swap A[s] and A[i]",
      "@place|    swap A[l] and A[s]",
      "@ret|    return s",
    ]);
    R.c.cmp = 0; R.c.swaps = 0; R.c.rounds = 0;
    const final = new Set();
    const snap = (o) => { const st = {}; final.forEach((t) => (st[t] = "dim")); return Object.assign({ arr: A.slice(), k }, o, { st: Object.assign(st, o.st || {}) }); };
    const target = input.slice().sort((a, b) => a - b)[k - 1];
    R.push("start", `Find the k = ${k}${(k % 100 >= 11 && k % 100 <= 13) ? "th" : (["th", "st", "nd", "rd"][k % 10] || "th")} smallest element: the value that would sit at index k − 1 = ${k - 1} if A were sorted. Quickselect partitions like quicksort, but then continues in only one part.`, snap({ l: 0, r: n - 1 }));
    let l = 0, r = n - 1;
    R.push("init", `Search range: A[0..${n - 1}].`, snap({ l, r }));
    while (l <= r) {
      R.c.rounds++;
      const p = A[l];
      let s = l;
      const fi = R.push(["part", "p"], `Partition A[${l}..${r}] around its first element p = ${p}.`, snap({ l, r, st: { [l]: "pivot" }, ptr: [{ i: s, label: "s" }] }));
      for (let i = l + 1; i <= r; i++) {
        R.c.cmp++;
        if (A[i] < p) {
          s++; [A[s], A[i]] = [A[i], A[s]]; R.c.swaps++;
          R.push(["cmp", "swap"], `A[${i}] = ${A[s]} < ${p}: grow the "smaller" block to s = ${s} and swap the element into it.`, snap({ l, r, st: { [l]: "pivot", [s]: "swap", [i]: "swap" }, ptr: [{ i: s, label: "s" }, { i, label: "i" }] }));
        } else R.push("cmp", `A[${i}] = ${A[i]} ≥ ${p}: leave it on the right.`, snap({ l, r, st: { [l]: "pivot", [i]: "compare" }, ptr: [{ i: s, label: "s" }, { i, label: "i" }] }));
      }
      [A[l], A[s]] = [A[s], A[l]]; R.c.swaps++;
      R.push(["place", "ret"], `Put the pivot in its place: swap A[${l}] and A[${s}]. The pivot ${p} is now exactly where it would be in sorted order, s = ${s}.`, snap({ l, r, st: { [s]: "pivot" }, ptr: [{ i: s, label: "s" }] }));
      const dir = s === k - 1 ? "stop, the pivot is the answer" : s > k - 1 ? "continue in the left part" : "continue in the right part";
      R.frames[fi].ask = mkAsk(`After this partition, what does quickselect do?`, dir, ["stop, the pivot is the answer", "continue in the left part", "continue in the right part"],
        `The pivot lands at s = ${s}; the target index is k − 1 = ${k - 1}, so we ${dir}.`);
      if (s === k - 1) {
        R.push("eq", `s = ${s} = k − 1: the pivot ${A[s]} is the ${k}-th smallest element. Done after ${R.c.cmp} comparisons in ${R.c.rounds} partition(s). (Sorting first would have cost Θ(n log n); quickselect is Θ(n) on average.)`, snap({ l, r, st: { [s]: "done" }, ptr: [{ i: s, label: "s" }], answer: A[s] }));
        if (A[s] !== target) throw new Error("quickselect wrong");
        return { lines: R.lines, frames: thinAsks(R.frames, 3) };
      }
      for (let t = l; t <= r; t++) if (s > k - 1 ? t >= s : t <= s) final.add(t);
      if (s > k - 1) { r = s - 1; R.push("gt", `s = ${s} > k − 1 = ${k - 1}: the answer is among the smaller elements, so drop everything from s on: r ← ${r}.`, snap({ l, r })); }
      else { l = s + 1; R.push("lt", `s = ${s} < k − 1 = ${k - 1}: the answer is among the larger elements, so drop everything up to s: l ← ${l}.`, snap({ l, r })); }
    }
    throw new Error("quickselect fell through");
  };

  /* ---- Fake coin (Levitin §4.4 and Exercise 4.4.10) ---- */
  REC.coin = function (n, fake, method) {
    const halves = method !== "thirds";
    const R = Rec(halves ? [
      "@start|ALGORITHM FakeCoinHalves(coins, n)   // the fake is lighter",
      "@while|    while n > 1 do",
      "@aside|        if n is odd then set one coin aside",
      "@weigh|        weigh two piles of ⌊n/2⌋ coins against each other",
      "@bal|        if the pans balance then return the coin set aside",
      "@keep|        keep the lighter pile; n ← ⌊n/2⌋",
      "@ret|    return the only coin left",
    ] : [
      "@start|ALGORITHM FakeCoinThirds(coins, n)   // the fake is lighter",
      "@while|    while n > 1 do",
      "@aside|        k ← ⌈n/3⌉; set n − 2k coins aside",
      "@weigh|        weigh k coins against k coins",
      "@bal|        if the pans balance then keep the n − 2k set aside",
      "@keep|        else keep the lighter pan's k coins",
      "@ret|    return the only coin left",
    ]);
    R.c.w = 0;
    const worst = halves ? floorLog2(n) : (n <= 1 ? 0 : Math.ceil(Math.log(n) / Math.log(3) - 1e-9));
    let cand = range(0, n - 1);
    const out = new Set();
    const snap = (o) => Object.assign({ n, fake, cand: cand.slice(), out: [...out], L: [], Rt: [], aside: [], tilt: 0 }, o);
    R.push("start", `${n} coins look identical, but one is lighter. A balance scale compares two piles at a time. ${halves ? "Plan: split into two equal piles (worst case ⌊log₂n⌋" : "Plan: split into three piles (worst case ⌈log₃n⌉"} = ${worst} weighings for n = ${n}).`, snap({}));
    while (cand.length > 1) {
      let L, Rt, aside;
      if (halves) { const h = Math.floor(cand.length / 2); L = cand.slice(0, h); Rt = cand.slice(h, 2 * h); aside = cand.slice(2 * h); }
      else { const k = Math.ceil(cand.length / 3); L = cand.slice(0, k); Rt = cand.slice(k, 2 * k); aside = cand.slice(2 * k); }
      const tilt = L.includes(fake) ? -1 : Rt.includes(fake) ? 1 : 0; // -1: left pan rises (lighter)
      const ans = tilt === -1 ? "left pan rises" : tilt === 1 ? "right pan rises" : "they balance";
      R.push(["while", "aside", "weigh"], `${cand.length} candidates left. Put ${L.length} on each pan${aside.length ? ` and keep ${aside.length} aside` : ""}.`,
        snap({ L, Rt, aside, tilt: 0, pending: true,
          ask: mkAsk("Which way will the scale go?", ans, ["left pan rises", "right pan rises", "they balance"], tilt === 0 ? "The fake coin is in neither pan, so both pans weigh the same." : `The fake (lighter) coin is on the ${tilt === -1 ? "left" : "right"} pan, so that pan goes up.`) }));
      R.c.w++;
      const next = tilt === -1 ? L : tilt === 1 ? Rt : aside;
      cand.forEach((c) => { if (!next.includes(c)) out.add(c); });
      if (tilt === 0) {
        R.push("bal", `Weighing ${R.c.w}: the pans balance, so every coin on them is genuine. The fake is among the ${aside.length} coin(s) set aside.`, snap({ L, Rt, aside, tilt }));
      } else {
        R.push("keep", `Weighing ${R.c.w}: the ${tilt === -1 ? "left" : "right"} pan rises, so it holds the lighter, fake coin. Keep its ${next.length} coin(s).`, snap({ L, Rt, aside, tilt }));
      }
      cand = next;
    }
    R.push("ret", `One candidate left: coin #${cand[0] + 1} is the fake. ${R.c.w} weighing(s); the worst case for n = ${n} with this plan is ${worst}. ${halves ? `Dividing into three would need at most ⌈log₃n⌉ = ${n <= 1 ? 0 : Math.ceil(Math.log(n) / Math.log(3) - 1e-9)}.` : `Dividing into two would need up to ⌊log₂n⌋ = ${floorLog2(n)}.`}`, snap({ found: cand[0] }));
    return { lines: R.lines, frames: thinAsks(R.frames, 4), worst };
  };

  /* ---- Russian peasant multiplication (Levitin §4.4) ---- */
  REC.peasant = function (n0, m0) {
    const R = Rec([
      "@start|ALGORITHM RussianPeasant(n, m)",
      "    // n · m using only halving, doubling and addition",
      "@init|    product ← 0",
      "@while|    while n ≥ 1 do",
      "@odd|        if n is odd then product ← product + m",
      "@half|        n ← ⌊n/2⌋",
      "@dbl|        m ← 2m",
      "@ret|    return product",
    ]);
    R.c.halv = 0; R.c.add = 0;
    const rows = [];
    let n = n0, m = m0, prod = 0;
    const snap = (o) => Object.assign({ rows: rows.map((r) => Object.assign({}, r)), n0, m0 }, o);
    R.push(["start", "init"], `Compute ${n0} · ${m0}. Idea: n · m = (n/2) · 2m when n is even, and ((n − 1)/2) · 2m + m when n is odd. Halve n, double m, and collect the m's from odd rows.`, snap({}));
    while (n >= 1) {
      const odd = n % 2 === 1;
      rows.push({ n, m, add: odd, prod: odd ? prod + m : prod });
      const cur = rows.length - 1;
      R.push("while", `Row ${rows.length}: n = ${n}, m = ${m}.`, snap({ cur, pending: true,
        ask: mkAsk(`Row ${rows.length}: n = ${n}. Is m = ${m} added to the product?`, odd ? "yes, n is odd" : "no, n is even", ["yes, n is odd", "no, n is even"], odd ? `${n} is odd, so the leftover m = ${m} is added (that is the "+ m" in ((n − 1)/2) · 2m + m).` : `${n} is even, so nothing is lost by halving and m is not added.`) }));
      if (odd) { prod += m; R.c.add++; R.push("odd", `n = ${n} is odd: add m = ${m}; product = ${prod}.`, snap({ cur })); }
      else R.push("odd", `n = ${n} is even: nothing to add; product stays ${prod}.`, snap({ cur }));
      n = Math.floor(n / 2); m = 2 * m; R.c.halv++;
      R.push(["half", "dbl"], `Halve n → ${n} and double m → ${m}${n === 0 ? "; n is 0, so the loop ends" : ""}.`, snap({ cur }));
    }
    R.push("ret", `Product = ${prod} = ${n0} · ${m0} ✓ after ${R.c.halv} halvings/doublings and ${R.c.add} additions. The number of rows is ⌊log₂n⌋ + 1 = ${floorLog2(n0) + 1}, so the work is Θ(log n). (Halving and doubling are just binary shifts in hardware.)`, snap({ cur: -1, done: true, prod }));
    return { lines: R.lines, frames: thinAsks(R.frames, 3) };
  };

  /* ---- Exponentiation by squaring (Levitin §4.1 / §6.5 idea) ---- */
  function fmtBig(v) { const s = String(v); return s.length > 22 ? `${s.slice(0, 8)}…${s.slice(-6)} (${s.length} digits)` : s; }
  REC.expo = function (a, n) {
    const R = Rec([
      "@start|ALGORITHM Power(a, n)",
      "    // a^n by repeated squaring (decrease by half)",
      "@z|    if n = 0 then return 1",
      "@one|    if n = 1 then return a",
      "@rec|    t ← Power(a, ⌊n/2⌋)",
      "@even|    if n is even then return t · t",
      "@odd|    else return t · t · a",
    ]);
    R.c.mult = 0; R.c.depth = 0;
    const calls = []; // {n, val, st}
    const snap = (o) => Object.assign({ a, n, calls: calls.map((c) => Object.assign({}, c)) }, o);
    // total multiplications (for the Predict question)
    let total = 0; for (let k = n; k > 1; k = Math.floor(k / 2)) total += k % 2 ? 2 : 1;
    R.push("start", `Compute ${a}^${n}. Brute force multiplies a by itself n − 1 = ${Math.max(0, n - 1)} times. Squaring halves the exponent at every step instead.`,
      snap({ ask: n >= 4 ? mkAsk(`How many multiplications will Power(${a}, ${n}) make?`, total, [n - 1, floorLog2(n), 2 * floorLog2(n), total + 1, Math.ceil(n / 2)], `Each level halves n and costs 1 multiplication (t · t), or 2 when n is odd (t · t · a). Here that adds up to ${total}, versus ${n - 1} for brute force.`) : null }));
    const A = BigInt(a);
    function power(k, d) {
      calls.push({ n: k, val: null, st: "active" });
      const me = calls.length - 1;
      R.c.depth = Math.max(R.c.depth, d);
      if (k === 0) { calls[me].val = "1"; calls[me].st = "done"; R.push("z", `n = 0: a⁰ = 1.`, snap({ cur: me })); return 1n; }
      if (k === 1) { calls[me].val = fmtBig(A); calls[me].st = "done"; R.push(["z", "one"], `Power(${a}, 1) = ${a}. This is the bottom of the recursion.`, snap({ cur: me })); return A; }
      R.push(["z", "one", "rec"], `Power(${a}, ${k}): ${k} = ${k.toString(2)}₂ in binary. First compute t = Power(${a}, ⌊${k}/2⌋) = Power(${a}, ${Math.floor(k / 2)}).`, snap({ cur: me }));
      calls[me].st = "wait";
      const t = power(Math.floor(k / 2), d + 1);
      calls[me].st = "active";
      let res;
      if (k % 2 === 0) { res = t * t; R.c.mult += 1; calls[me].val = fmtBig(res); calls[me].st = "done"; R.push("even", `Back in Power(${a}, ${k}): n is even, so a^${k} = t · t = ${fmtBig(res)} (1 multiplication).`, snap({ cur: me })); }
      else { res = t * t * A; R.c.mult += 2; calls[me].val = fmtBig(res); calls[me].st = "done"; R.push("odd", `Back in Power(${a}, ${k}): n is odd, so a^${k} = t · t · a = ${fmtBig(res)} (2 multiplications).`, snap({ cur: me })); }
      return res;
    }
    const v = power(n, 1);
    R.push(null, `${a}^${n} = ${fmtBig(v)} with ${R.c.mult} multiplications; brute force needs ${Math.max(0, n - 1)}. The count is between ⌊log₂n⌋ = ${n ? floorLog2(n) : 0} and 2⌊log₂n⌋ = ${n ? 2 * floorLog2(n) : 0}, so Θ(log n).`, snap({ cur: -1, result: fmtBig(v) }));
    return { lines: R.lines, frames: R.frames, value: v };
  };

  if (typeof module !== "undefined" && module.exports) module.exports = { REC, binaryCount, floorLog2 };
  if (typeof document === "undefined") return;

  /* ================= Part 2: browser UI ================= */
  const $ = (id) => document.getElementById(id);
  const E = Forge.el, S = Forge.svg, W = 760;
  const COL = { compare: "var(--c-compare)", swap: "var(--c-swap)", done: "var(--c-done)", active: "var(--c-active)", pivot: "var(--c-pivot)", dim: "var(--c-dim)" };
  const inkOn = (st) => (st && st !== "dim" ? "#0d1117" : "var(--ink)");
  const nums = (s) => String(s).split(/[\s,;]+/).filter(Boolean).map(Number);
  const sup = (k) => String(k).replace(/\d/g, (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[d]);

  function fresh(svg) { svg.innerHTML = ""; const g = S("g"); svg.appendChild(g); return g; }
  function txt(g, x, y, s, o) { g.appendChild(S("text", Object.assign({ x, y, "font-size": 12, fill: "var(--ink)" }, o || {}), String(s))); }
  /** A row of boxes with index labels, optional pointers underneath and an optional [l..r] band. */
  function cellsRow(g, arr, o) {
    const n = arr.length, cw = o.cw || Math.min(56, (W - 40) / n), x0 = o.x != null ? o.x : (W - cw * n) / 2, y = o.y, ch = o.ch || 34;
    const fs = Math.min(14, cw * 0.4);
    if (o.band) g.appendChild(S("rect", { x: x0 + o.band[0] * cw - 2, y: y - 18, width: (o.band[1] - o.band[0] + 1) * cw + 4, height: ch + 22, rx: 8, fill: "var(--ember-soft)" }));
    arr.forEach((v, k) => {
      const st = (o.st || {})[k], x = x0 + k * cw;
      g.appendChild(S("rect", { x: x + 2, y, width: cw - 4, height: ch, rx: 6, fill: st ? COL[st] : "var(--panel)", stroke: o.special === k ? "var(--c-pivot)" : "var(--line-2)", "stroke-width": o.special === k ? 2.5 : 1 }));
      txt(g, x + cw / 2, y + ch / 2 + fs / 2.8, v, { "text-anchor": "middle", "font-size": fs, "font-weight": 700, fill: inkOn(st) });
      if (cw >= 16) txt(g, x + cw / 2, y - 5, k, { "text-anchor": "middle", "font-size": 10, fill: "var(--muted)" });
    });
    const by = {};
    (o.ptr || []).forEach((p) => { if (p.i >= 0 && p.i < n) (by[p.i] = by[p.i] || []).push(p.label); });
    Object.keys(by).forEach((i) => {
      const cx = x0 + (+i) * cw + cw / 2;
      g.appendChild(S("path", { d: `M${cx} ${y + ch + 4} l-5 8 h10 z`, fill: "var(--ember)" }));
      txt(g, cx, y + ch + 26, by[i].join(","), { "text-anchor": "middle", "font-weight": 700, fill: "var(--ember)" });
    });
    return { x0, cw };
  }
  function barsRow(g, arr, o) {
    const n = arr.length, bw = (W - 40) / n, x0 = 20, base = o.y + o.h, max = Math.max(1, ...arr);
    if (o.band) g.appendChild(S("rect", { x: x0 + o.band[0] * bw, y: o.y - 6, width: (o.band[1] - o.band[0] + 1) * bw, height: o.h + 8, rx: 6, fill: "var(--ember-soft)" }));
    arr.forEach((v, k) => {
      const h = Math.max(3, ((o.h - 18) * v) / max), st = (o.st || {})[k], x = x0 + k * bw;
      g.appendChild(S("rect", { x: x + bw * 0.1, y: base - h, width: bw * 0.8, height: h, rx: 4, fill: st ? COL[st] : "var(--c-bar)" }));
      if (bw >= 14) { txt(g, x + bw / 2, base - h - 4, v, { "text-anchor": "middle", "font-size": Math.min(13, bw * 0.42), fill: "var(--ink-2)" }); txt(g, x + bw / 2, base + 13, k, { "text-anchor": "middle", "font-size": 10, fill: "var(--muted)" }); }
    });
    const by = {};
    (o.ptr || []).forEach((p) => { if (p.i >= 0 && p.i < n) (by[p.i] = by[p.i] || []).push(p.label); });
    Object.keys(by).forEach((i) => {
      const cx = x0 + (+i) * bw + bw / 2;
      g.appendChild(S("path", { d: `M${cx} ${base + 18} l-5 8 h10 z`, fill: "var(--ember)" }));
      txt(g, cx, base + 40, by[i].join(","), { "text-anchor": "middle", "font-weight": 700, fill: "var(--ember)" });
    });
    if (o.mark != null) {
      const cx = x0 + o.mark * bw + bw / 2;
      g.appendChild(S("rect", { x: cx - 24, y: base + 44, width: 48, height: 17, rx: 8, fill: "var(--c-done)" }));
      txt(g, cx, base + 56, "k − 1", { "text-anchor": "middle", "font-size": 11, "font-weight": 700, fill: "#0d1117" });
    }
  }
  function field(label, input, style) { return E("label", { class: "field", style }, label, input); }
  function inputEl(id, value, width) { return E("input", { type: "text", id, value, style: { width: width || "220px", maxWidth: "100%" } }); }
  function msg(t) { $("msg").textContent = t || ""; }

  /* ---------- tab definitions ---------- */
  const TABS = {};

  TABS.seq = {
    label: "Sequential search", chapter: "Ch 3 · Brute Force", lesson: "03-brute-force", arena: ["sequential-search-sentinel"],
    lead: "Check elements one by one. The sentinel trick drops the \"end of array?\" test from the loop.",
    state: { A: [31, 12, 88, 45, 7, 60, 23], K: 45 },
    controls(host, go) {
      const a = inputEl("seqA", this.state.A.join(", ")), k = inputEl("seqK", this.state.K, "80px");
      const load = () => { const A = nums(a.value), K = Number(k.value); if (A.length < 1 || A.length > 16 || A.some((x) => !Number.isFinite(x)) || !Number.isFinite(K)) return msg("Type 1 to 16 numbers and a number to search for."); this.state = { A, K }; go(); };
      host.append(field("Array (up to 16 numbers)", a), field("Search key K", k), E("button", { class: "btn primary", onclick: load }, "Load"),
        E("button", { class: "btn", onclick: () => { const A = Forge.randArray(8 + Math.floor(Math.random() * 5), 1, 99); a.value = A.join(", "); k.value = Math.random() < 0.6 ? A[Math.floor(Math.random() * A.length)] : 100; load(); } }, "🎲 Random"),
        E("button", { class: "btn", onclick: () => { k.value = 999; load(); } }, "Unsuccessful search"));
    },
    counters: { "key comparisons": 0, "i < n checks": 0, "plain version total": 0 },
    build() { return REC.seq(this.state.A, this.state.K); },
    ctr(f) { return { "key comparisons": f.c.cmp, "i < n checks": f.c.bound, "plain version total": f.plain }; },
    render(f, svg) {
      const g = fresh(svg);
      const lay = cellsRow(g, f.arr, { y: 60, st: f.st, ptr: f.ptr, special: f.sentinel ? f.arr.length - 1 : null });
      if (f.sentinel) txt(g, lay.x0 + (f.arr.length - 0.5) * lay.cw, 46 - 10, "sentinel", { "text-anchor": "middle", "font-size": 11, fill: "var(--c-pivot)", "font-weight": 700 });
      txt(g, 20, 150, `K = ${this.state.K}`, { "font-size": 14, "font-weight": 700, fill: "var(--ember)" });
      return 165;
    },
    legend: [["compare", "A[i] ≠ K"], ["dim", "already checked"], ["done", "match"], ["pivot", "sentinel cell A[n]"]],
    how: "Boxes are A[0..n−1]; the purple-outlined box on the right is the extra cell A[n] that holds the sentinel (a copy of K). The arrow is i. Yellow means \"compared and not equal\", grey means \"already passed\", green means the loop stopped there.",
    tries: [
      "Search for a key that is not in the array (\"Unsuccessful search\"). The loop now runs n + 1 times and stops on the sentinel; the plain version would make n key comparisons plus n + 1 index checks, 2n + 1 in all.",
      "Put the key first, e.g. <code>45, 12, 88</code> with K = 45. One comparison and one index check. That is the best case, Θ(1).",
      "Count for n = 7: a successful search that finds K at index i costs i + 1 key comparisons with or without the sentinel. What the sentinel saves is the i + 1 separate index checks.",
    ],
  };

  TABS.binary = {
    label: "Binary search", chapter: "Ch 4 · Decrease-and-Conquer", lesson: "04-decrease-and-conquer", arena: ["binary-search", "binary-search-first"],
    lead: "Compare with the middle, throw away half. At most ⌊log₂n⌋ + 1 comparisons.",
    state: { A: [3, 14, 27, 31, 39, 42, 55, 70, 74, 81, 85, 93, 98], K: 70 },
    controls(host, go) {
      const a = inputEl("binA", this.state.A.join(", "), "300px"), k = inputEl("binK", this.state.K, "80px");
      const load = () => { let A = nums(a.value); const K = Number(k.value); if (A.length < 1 || A.length > 31 || A.some((x) => !Number.isFinite(x)) || !Number.isFinite(K)) return msg("Type 1 to 31 numbers and a key."); const sorted = A.slice().sort((x, y) => x - y); if (sorted.join() !== A.join()) { A = sorted; a.value = A.join(", "); msg("Binary search needs sorted input, so your array was sorted first."); } this.state = { A, K }; go(); };
      host.append(field("Sorted array (up to 31)", a), field("Key K", k), E("button", { class: "btn primary", onclick: load }, "Load"),
        E("button", { class: "btn", onclick: () => { const n = 15 + Math.floor(Math.random() * 17); const s = new Set(); while (s.size < n) s.add(1 + Math.floor(Math.random() * 99)); const A = [...s].sort((x, y) => x - y); a.value = A.join(", "); k.value = Math.random() < 0.7 ? A[Math.floor(Math.random() * n)] : 100; load(); } }, "🎲 Random"),
        E("button", { class: "btn", onclick: () => { const A = nums(a.value).sort((x, y) => x - y); k.value = A[A.length - 1] + 1; load(); } }, "Worst case (K too big)"));
    },
    counters: { "comparisons": 0, "bound ⌊log₂n⌋+1": 0, "range size": 0 },
    build() { return REC.binary(this.state.A, this.state.K); },
    ctr(f) { return { "comparisons": f.c.cmp, "bound ⌊log₂n⌋+1": f.bound, "range size": Math.max(0, f.r - f.l + 1) }; },
    render(f, svg) {
      const g = fresh(svg), n = f.arr.length;
      const st = {}; f.arr.forEach((_, k) => { if (k < f.l || k > f.r) st[k] = "dim"; }); Object.assign(st, f.st || {});
      const lay = cellsRow(g, f.arr, { y: 40, st, ptr: f.ptr, band: f.l <= f.r ? [f.l, f.r] : null });
      txt(g, 20, 128, "Search range per comparison", { "font-size": 11, fill: "var(--muted)" });
      f.trace.forEach((t, r) => {
        const y = 138 + r * 22;
        txt(g, lay.x0 - 8, y + 12, `#${r + 1}`, { "text-anchor": "end", "font-size": 10, fill: "var(--muted)" });
        g.appendChild(S("rect", { x: lay.x0 + t.l * lay.cw + 2, y, width: (t.r - t.l + 1) * lay.cw - 4, height: 16, rx: 5, fill: "var(--steel-soft)", stroke: "var(--steel)" }));
        g.appendChild(S("rect", { x: lay.x0 + t.m * lay.cw + 4, y: y + 2, width: lay.cw - 8, height: 12, rx: 3, fill: t.hit ? COL.done : COL.active }));
      });
      return 150 + Math.max(1, f.trace.length) * 22 + 6;
    },
    legend: [["active", "middle element A[m]"], ["compare", "compared, not equal"], ["done", "found"], ["dim", "thrown away"]],
    how: "The orange band is the live range A[l..r]; the arrows are l, m and r. Each strip underneath is one comparison: its length is the range that was still alive, and the dot is the middle element probed. Watch the strips halve.",
    tries: [
      "Press \"Worst case\": K is larger than everything. Count the strips. For n = 13 there are exactly ⌊log₂13⌋ + 1 = 4.",
      "Make n = 31 (a Random array often gives it) and search for a missing key: at most 5 comparisons, while sequential search would need 31.",
      "Search for the middle element of the array itself. One comparison: the best case.",
      "Try n = 16. The first middle is index 7 (⌊15/2⌋), not 8. Why does the rounding down matter for the l ← m + 1 update?",
    ],
  };

  TABS.interp = {
    label: "Interpolation search", chapter: "Ch 4 · Decrease-and-Conquer", lesson: "04-decrease-and-conquer", arena: ["interpolation-search"],
    lead: "Guess the position from the values, like finding a name in a phone book.",
    state: { A: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150], K: 120 },
    controls(host, go) {
      const a = inputEl("intA", this.state.A.join(", "), "300px"), k = inputEl("intK", this.state.K, "80px");
      const load = () => { let A = nums(a.value); const K = Number(k.value); if (A.length < 2 || A.length > 31 || A.some((x) => !Number.isFinite(x)) || !Number.isFinite(K)) return msg("Type 2 to 31 numbers and a key."); const s = A.slice().sort((x, y) => x - y); if (s.join() !== A.join()) { A = s; a.value = A.join(", "); msg("Interpolation search needs sorted input, so your array was sorted first."); } this.state = { A, K }; go(); };
      host.append(field("Sorted array (up to 31)", a), field("Key v", k), E("button", { class: "btn primary", onclick: load }, "Load"),
        E("button", { class: "btn", onclick: () => { a.value = range(1, 15).map((x) => x * 10).join(", "); k.value = 120; load(); } }, "Evenly spaced"),
        E("button", { class: "btn", onclick: () => { a.value = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 1000].join(", "); k.value = 14; load(); } }, "Skewed (worst case)"),
        E("button", { class: "btn", onclick: () => { const n = 20, s = new Set(); while (s.size < n) s.add(1 + Math.floor(Math.random() * 200)); const A = [...s].sort((x, y) => x - y); a.value = A.join(", "); k.value = A[Math.floor(Math.random() * n)]; load(); } }, "🎲 Random"));
    },
    counters: { "probes": 0, "binary search needs": 0 },
    build() { return REC.interp(this.state.A, this.state.K); },
    ctr(f) { return { "probes": f.c.probes, "binary search needs": f.c.bin }; },
    render(f, svg) {
      const g = fresh(svg), A = f.arr, n = A.length;
      const px0 = 60, px1 = W - 30, py0 = 20, py1 = 280;
      const lo = Math.min(A[0], f.v), hi = Math.max(A[n - 1], f.v);
      const X = (i) => px0 + ((px1 - px0) * i) / (n - 1), Y = (val) => py1 - ((py1 - py0) * (val - lo)) / Math.max(1, hi - lo);
      g.appendChild(S("line", { x1: px0, y1: py1, x2: px1, y2: py1, stroke: "var(--line-2)" }));
      g.appendChild(S("line", { x1: px0, y1: py0, x2: px0, y2: py1, stroke: "var(--line-2)" }));
      txt(g, px0 - 8, py0 + 4, hi, { "text-anchor": "end", "font-size": 10, fill: "var(--muted)" });
      txt(g, px0 - 8, py1, lo, { "text-anchor": "end", "font-size": 10, fill: "var(--muted)" });
      txt(g, (px0 + px1) / 2, py1 + 34, "index →", { "text-anchor": "middle", "font-size": 10, fill: "var(--muted)" });
      if (f.l <= f.r) g.appendChild(S("rect", { x: X(f.l) - 8, y: py0 - 8, width: X(f.r) - X(f.l) + 16, height: py1 - py0 + 16, rx: 8, fill: "var(--ember-soft)" }));
      g.appendChild(S("line", { x1: px0, y1: Y(f.v), x2: px1, y2: Y(f.v), stroke: "var(--ember)", "stroke-dasharray": "5 4" }));
      txt(g, px1, Y(f.v) - 6, `v = ${f.v}`, { "text-anchor": "end", "font-weight": 700, fill: "var(--ember)" });
      if (f.exact != null) {
        g.appendChild(S("line", { x1: X(f.l), y1: Y(A[f.l]), x2: X(f.r), y2: Y(A[f.r]), stroke: "var(--steel)", "stroke-width": 2 }));
        g.appendChild(S("line", { x1: X(f.exact), y1: Y(f.v), x2: X(f.exact), y2: py1, stroke: "var(--steel)", "stroke-dasharray": "3 3" }));
        g.appendChild(S("circle", { cx: X(f.exact), cy: Y(f.v), r: 5, fill: "var(--steel)" }));
      }
      A.forEach((val, i) => {
        const inR = i >= f.l && i <= f.r;
        const st = f.hit === i ? "done" : f.x === i ? "active" : inR ? null : "dim";
        g.appendChild(S("circle", { cx: X(i), cy: Y(val), r: 6, fill: st ? COL[st] : "var(--c-bar)", stroke: "var(--bg-2)", "stroke-width": 1.5 }, S("title", null, `A[${i}] = ${val}`)));
        if ((px1 - px0) / (n - 1) >= 22) { txt(g, X(i), py1 + 16, i, { "text-anchor": "middle", "font-size": 10, fill: "var(--muted)" }); }
      });
      if (f.x != null) txt(g, X(f.x), Y(A[f.x]) - 12, `A[${f.x}] = ${A[f.x]}`, { "text-anchor": "middle", "font-size": 11, "font-weight": 700, fill: "var(--c-active)" });
      return py1 + 42;
    },
    legend: [["active", "probed element A[x]"], ["done", "found"], ["dim", "outside A[l..r]"]],
    how: "Each dot is an element: index to the right, value upward. The blue line joins A[l] and A[r]; where it crosses the dashed height v is the guess, and x is that position rounded down. On evenly spaced data the guess is exact.",
    tries: [
      "Evenly spaced preset, v = 120: one probe, because the line through the data is exact. Binary search needs 2 here, and up to 4 for other keys.",
      "Skewed preset: the value 1000 bends the line, so each guess lands just one step to the right. The probe count grows linearly: 14 probes here, while binary search needs 3. That is interpolation search's Θ(n) worst case.",
      "Random preset: on data spread fairly evenly, the average is about log₂log₂n + 1 probes, which barely grows with n.",
    ],
  };

  TABS.qselect = {
    label: "Quickselect", chapter: "Ch 4 · Decrease-and-Conquer", lesson: "04-decrease-and-conquer", arena: ["quickselect"],
    lead: "Find the k-th smallest element (e.g. the median) by partitioning, then keeping just one side.",
    state: { A: [4, 1, 10, 8, 7, 12, 9, 2, 15], k: 5 },
    controls(host, go) {
      const a = inputEl("qsA", this.state.A.join(", "), "260px"), k = inputEl("qsK", this.state.k, "60px");
      const load = () => { const A = nums(a.value), K = Number(k.value); if (A.length < 1 || A.length > 24 || A.some((x) => !Number.isFinite(x))) return msg("Type 1 to 24 numbers."); if (!Number.isInteger(K) || K < 1 || K > A.length) return msg(`k must be a whole number from 1 to ${A.length}.`); this.state = { A, k: K }; go(); };
      host.append(field("Array (up to 24)", a), field("k", k), E("button", { class: "btn primary", onclick: load }, "Load"),
        E("button", { class: "btn", onclick: () => { const A = nums(a.value); k.value = Math.ceil(A.length / 2); load(); } }, "Median (k = ⌈n/2⌉)"),
        E("button", { class: "btn", onclick: () => { const A = Forge.randArray(9 + Math.floor(Math.random() * 10), 1, 99); a.value = A.join(", "); k.value = 1 + Math.floor(Math.random() * A.length); load(); } }, "🎲 Random"),
        E("button", { class: "btn", onclick: () => { a.value = range(1, 12).join(", "); k.value = 12; load(); } }, "Worst case (sorted, k = n)"));
    },
    counters: { "key comparisons": 0, "swaps": 0, "partitions": 0 },
    build() { return REC.qselect(this.state.A, this.state.k); },
    ctr(f) { return { "key comparisons": f.c.cmp, "swaps": f.c.swaps, "partitions": f.c.rounds }; },
    render(f, svg) {
      const g = fresh(svg);
      const st = Object.assign({}, f.st || {});
      f.arr.forEach((_, i) => { if ((i < f.l || i > f.r) && !st[i]) st[i] = "dim"; });
      barsRow(g, f.arr, { y: 20, h: 230, st, ptr: f.ptr, band: [f.l, f.r], mark: f.k - 1 });
      return 330;
    },
    legend: [["pivot", "pivot"], ["compare", "compared with pivot"], ["swap", "swapped"], ["done", "the answer"], ["dim", "discarded"]],
    how: "Bars are the array; the orange band is the part still being searched. The green \"k − 1\" tag marks the index where the answer must end up. After each partition, the pivot sits at s in its sorted position: if s is the tag, stop; otherwise one side is discarded (grey).",
    tries: [
      "Book-style median example (4, 1, 10, 8, 7, 12, 9, 2, 15 with k = 5): two partitions, and the answer is 8.",
      "Worst-case preset: sorted input with k = n. Every partition removes only the pivot, so the comparisons add up to n(n−1)/2 = 66.",
      "Random with k = 1: this finds the minimum. Compare its comparison count with n − 1, the cost of a simple scan.",
    ],
  };

  TABS.coin = {
    label: "Fake coin", chapter: "Ch 4 · Decrease-and-Conquer", lesson: "04-decrease-and-conquer", arena: ["fake-coin-three-way"],
    lead: "One coin is lighter. Find it with as few weighings as possible: split in two, or in three?",
    state: { n: 12, fake: "random", method: "halves", show: false, fakeIdx: 7 },
    controls(host, go) {
      const n = E("input", { type: "range", min: 2, max: 40, value: this.state.n, "aria-label": "Number of coins" });
      const nv = E("span", null, String(this.state.n));
      const m = E("select", { "aria-label": "Method" }, E("option", { value: "halves" }, "divide into 2 piles"), E("option", { value: "thirds" }, "divide into 3 piles"));
      m.value = this.state.method;
      const show = E("input", { type: "checkbox" }); show.checked = this.state.show;
      const fk = E("input", { type: "number", min: 1, max: 40, value: "", placeholder: "random", style: { width: "90px" }, "aria-label": "Fake coin number" });
      const load = (newFake) => {
        const N = +n.value;
        let f = Number(fk.value);
        if (!fk.value || !Number.isInteger(f) || f < 1 || f > N) f = null;
        this.state.n = N; this.state.method = m.value; this.state.show = show.checked;
        if (f) this.state.fakeIdx = f - 1; else if (newFake || this.state.fakeIdx >= N) this.state.fakeIdx = Math.floor(Math.random() * N);
        go();
      };
      n.addEventListener("input", () => { nv.textContent = n.value; });
      n.addEventListener("change", () => load(true));
      m.addEventListener("change", () => load(false));
      show.addEventListener("change", () => { this.state.show = show.checked; player.go(player.index); });
      host.append(E("label", { class: "field" }, E("span", null, "Coins n = ", nv), n), field("Method", m), field("Fake coin # (optional)", fk),
        E("button", { class: "btn primary", onclick: () => load(false) }, "Load"), E("button", { class: "btn", onclick: () => { fk.value = ""; load(true); } }, "🎲 Hide a new fake"),
        E("label", { class: "small" }, show, " show the fake coin"));
    },
    counters: { "weighings": 0, "worst case, this plan": 0, "worst case, other plan": 0 },
    build() { const r = REC.coin(this.state.n, this.state.fakeIdx, this.state.method); this.worst = r.worst; const n = this.state.n; this.other = this.state.method === "halves" ? (n <= 1 ? 0 : Math.ceil(Math.log(n) / Math.log(3) - 1e-9)) : Math.floor(Math.log2(n) + 1e-9); return r; },
    ctr(f) { return { "weighings": f.c.w, "worst case, this plan": this.worst, "worst case, other plan": this.other }; },
    render(f, svg) {
      if (svg.dataset.kind !== "coin") {
        svg.innerHTML = ""; svg.dataset.kind = "coin";
        this.dyn = S("g"); svg.appendChild(this.dyn);
        const sc = S("g");
        sc.appendChild(S("rect", { x: 374, y: 140, width: 12, height: 190, rx: 4, fill: "var(--line-2)" }));
        sc.appendChild(S("rect", { x: 300, y: 326, width: 160, height: 10, rx: 4, fill: "var(--line-2)" }));
        this.beam = S("g", { style: "transform-origin: 380px 140px; transition: transform .45s ease" });
        this.beam.appendChild(S("rect", { x: 150, y: 135, width: 460, height: 10, rx: 5, fill: "var(--ink-2)" }));
        sc.appendChild(this.beam);
        this.panL = S("g", { style: "transition: transform .45s ease" }); this.panR = S("g", { style: "transition: transform .45s ease" });
        sc.appendChild(this.panL); sc.appendChild(this.panR);
        sc.appendChild(S("circle", { cx: 380, cy: 140, r: 8, fill: "var(--ember)" }));
        svg.appendChild(sc);
      }
      const n = f.n, g = this.dyn; g.innerHTML = "";
      const cw = Math.min(36, (W - 40) / n), x0 = (W - cw * n) / 2, r = Math.min(14, cw / 2 - 2);
      const where = {}; f.L.forEach((c) => (where[c] = "L")); f.Rt.forEach((c) => (where[c] = "R")); f.aside.forEach((c) => (where[c] = "A"));
      const out = new Set(f.out), showFake = this.state.show || f.found != null;
      txt(g, 20, 18, "coins", { "font-size": 10, fill: "var(--muted)" });
      for (let c = 0; c < n; c++) {
        const cx = x0 + c * cw + cw / 2, cy = 42;
        const fill = f.found === c ? COL.done : out.has(c) ? COL.dim : where[c] === "L" || where[c] === "R" ? COL.active : where[c] === "A" ? COL.compare : "var(--ember-2)";
        g.appendChild(S("circle", { cx, cy, r, fill, stroke: showFake && c === f.fake ? "var(--c-swap)" : "var(--bg-2)", "stroke-width": showFake && c === f.fake ? 3 : 1.5, opacity: out.has(c) ? 0.5 : 1 }));
        if (r >= 9) txt(g, cx, cy + 4, c + 1, { "text-anchor": "middle", "font-size": Math.min(11, r), "font-weight": 700, fill: out.has(c) ? "var(--ink)" : "#0d1117" });
      }
      if (f.aside.length && !f.found) txt(g, 20, 88, `aside: ${f.aside.map((c) => "#" + (c + 1)).join(" ")}`.slice(0, 90), { "font-size": 11, fill: "var(--c-compare)" });
      // scale
      const deg = f.tilt === -1 ? 9 : f.tilt === 1 ? -9 : 0;
      this.beam.style.transform = `rotate(${deg}deg)`;
      const dy = 220 * Math.sin((deg * Math.PI) / 180);
      this.panL.style.transform = `translate(0px, ${-dy}px)`; this.panR.style.transform = `translate(0px, ${dy}px)`;
      const pan = (grp, cx, coins) => {
        grp.innerHTML = "";
        grp.appendChild(S("line", { x1: cx, y1: 140, x2: cx - 66, y2: 240, stroke: "var(--muted)" }));
        grp.appendChild(S("line", { x1: cx, y1: 140, x2: cx + 66, y2: 240, stroke: "var(--muted)" }));
        grp.appendChild(S("path", { d: `M${cx - 72} 240 Q${cx} 272 ${cx + 72} 240 Z`, fill: "var(--panel-2)", stroke: "var(--line-2)", "stroke-width": 2 }));
        coins.forEach((c, t) => {
          const col = t % 7, row = Math.floor(t / 7);
          const x = cx - 54 + col * 18, y = 232 - row * 15;
          grp.appendChild(S("circle", { cx: x, cy: y, r: 7.5, fill: COL.active, stroke: showFake && c === f.fake ? "var(--c-swap)" : "var(--bg-2)", "stroke-width": showFake && c === f.fake ? 2.5 : 1 }));
        });
        if (coins.length) txt(grp, cx, 290, `${coins.length} coin${coins.length > 1 ? "s" : ""}`, { "text-anchor": "middle", "font-size": 11, fill: "var(--muted)" });
      };
      pan(this.panL, 160, f.L); pan(this.panR, 600, f.Rt);
      const verdict = f.pending ? "weighing…" : f.tilt === -1 ? "left pan is lighter" : f.tilt === 1 ? "right pan is lighter" : f.L.length ? "balanced" : "";
      txt(g, 380, 362, verdict, { "text-anchor": "middle", "font-size": 13, "font-weight": 700, fill: "var(--ember)" });
      return 376;
    },
    legend: [["active", "on the scale"], ["compare", "set aside"], ["dim", "ruled out (genuine)"], ["done", "the fake, found"]],
    how: "The top row is all n coins (orange = still a suspect). Coins on the pans turn blue, coins set aside turn yellow, and ruled-out coins go grey. The lighter pan rises. Tick \"show the fake coin\" to see it outlined in red while you watch.",
    tries: [
      "n = 12, divide into 2: at most ⌊log₂12⌋ = 3 weighings. Switch to divide into 3: at most ⌈log₃12⌉ = 3. Now try n = 27: 4 versus 3.",
      "With 2 piles, choose an odd n like 13 and put the fake at #13 (the coin set aside). The very first weighing balances and you are done: the best case is 1 weighing.",
      "Levitin Exercise 4.4.10: for n = 3ᵏ, the three-pile plan needs exactly k weighings. Check k = 3 (n = 27) with several fake positions.",
    ],
  };

  TABS.peasant = {
    label: "Russian peasant ×", chapter: "Ch 4 · Decrease-and-Conquer", lesson: "04-decrease-and-conquer", arena: ["russian-peasant"],
    lead: "Multiply with only halving, doubling and adding.",
    state: { n: 50, m: 65 },
    controls(host, go) {
      const a = inputEl("rpN", this.state.n, "90px"), b = inputEl("rpM", this.state.m, "90px");
      const load = () => { const n = Number(a.value), m = Number(b.value); if (!Number.isInteger(n) || !Number.isInteger(m) || n < 1 || m < 0 || n > 99999 || m > 99999) return msg("Use whole numbers: 1 ≤ n ≤ 99999 and 0 ≤ m ≤ 99999."); this.state = { n, m }; go(); };
      host.append(field("n (halved)", a), field("m (doubled)", b), E("button", { class: "btn primary", onclick: load }, "Load"),
        E("button", { class: "btn", onclick: () => { a.value = 26; b.value = 47; load(); } }, "26 · 47"),
        E("button", { class: "btn", onclick: () => { a.value = 1 + Math.floor(Math.random() * 999); b.value = 1 + Math.floor(Math.random() * 999); load(); } }, "🎲 Random"));
    },
    counters: { "halvings / doublings": 0, "additions": 0, "rows": 0 },
    build() { return REC.peasant(this.state.n, this.state.m); },
    ctr(f) { return { "halvings / doublings": f.c.halv, "additions": f.c.add, "rows": f.rows.length }; },
    render(f, svg) {
      const g = fresh(svg), rh = 30, y0 = 50, cols = [150, 300, 450, 620];
      ["n", "m", "add m?", "product so far"].forEach((h, k) => txt(g, cols[k], 30, h, { "text-anchor": "middle", "font-weight": 700, fill: "var(--muted)" }));
      g.appendChild(S("line", { x1: 60, y1: 38, x2: 700, y2: 38, stroke: "var(--line-2)" }));
      f.rows.forEach((r, k) => {
        const y = y0 + k * rh, cur = k === f.cur;
        if (cur) g.appendChild(S("rect", { x: 60, y: y - 4, width: 640, height: rh - 2, rx: 6, fill: "var(--ember-soft)", stroke: "var(--ember)" }));
        const reveal = !(cur && f.pending);
        txt(g, cols[0], y + 17, r.n, { "text-anchor": "middle", "font-size": 15, "font-weight": 700, fill: r.add && reveal ? "var(--c-done)" : "var(--ink)" });
        txt(g, cols[1], y + 17, r.m, { "text-anchor": "middle", "font-size": 15, fill: reveal && !r.add ? "var(--muted)" : "var(--ink)", "text-decoration": reveal && !r.add ? "line-through" : null });
        if (reveal) {
          txt(g, cols[2], y + 17, r.add ? `+ ${r.m}` : "—", { "text-anchor": "middle", "font-size": 14, "font-weight": 700, fill: r.add ? "var(--c-done)" : "var(--muted)" });
          txt(g, cols[3], y + 17, r.prod, { "text-anchor": "middle", "font-size": 15, fill: "var(--ink-2)" });
        } else txt(g, cols[2], y + 17, "?", { "text-anchor": "middle", "font-size": 15, "font-weight": 700, fill: "var(--ember)" });
      });
      const y = y0 + Math.max(1, f.rows.length) * rh + 10;
      if (f.done) { g.appendChild(S("line", { x1: 60, y1: y - 4, x2: 700, y2: y - 4, stroke: "var(--line-2)" })); txt(g, cols[3], y + 20, `${f.n0} · ${f.m0} = ${f.prod}`, { "text-anchor": "middle", "font-size": 16, "font-weight": 800, fill: "var(--c-done)" }); }
      return y + 34;
    },
    legend: [["done", "odd n: m is added"], ["dim", "even n: m is skipped (struck through)"]],
    how: "Each row halves n (rounding down) and doubles m. Rows with odd n are the ones whose m gets added, shown in green; even rows are struck through. The last column is the running product. The odd rows are exactly the 1-bits of n in binary.",
    tries: [
      "Levitin's example 50 · 65: the odd rows are n = 25, 3, 1, so the product is 130 + 1040 + 2080 = 3250.",
      "Levitin Exercise 4.4.11: compute 26 · 47. Then swap the numbers (47 · 26). Which order has fewer additions? (Fewer 1-bits in the halved number means fewer additions.)",
      "Take n = 64: only the last row is odd. Now n = 63: every row is odd. Both have ⌊log₂n⌋ + 1 rows or close to it, which is why the work is Θ(log n).",
    ],
  };

  TABS.expo = {
    label: "Exponentiation by squaring", chapter: "Ch 4 · Decrease-and-Conquer", lesson: "04-decrease-and-conquer", arena: ["exp-by-squaring"],
    lead: "aⁿ with about log₂n multiplications instead of n − 1.",
    state: { a: 2, n: 13 },
    controls(host, go) {
      const a = inputEl("exA", this.state.a, "80px"), b = inputEl("exN", this.state.n, "90px");
      const load = () => { const A = Number(a.value), N = Number(b.value); if (!Number.isInteger(A) || !Number.isInteger(N) || A < 0 || A > 999 || N < 0 || N > 100000) return msg("Use whole numbers: 0 ≤ a ≤ 999 and 0 ≤ n ≤ 100000."); this.state = { a: A, n: N }; go(); };
      host.append(field("base a", a), field("exponent n", b), E("button", { class: "btn primary", onclick: load }, "Load"),
        E("button", { class: "btn", onclick: () => { a.value = 3; b.value = 64; load(); } }, "3⁶⁴ (power of 2)"),
        E("button", { class: "btn", onclick: () => { a.value = 2; b.value = 63; load(); } }, "2⁶³ (all 1-bits)"),
        E("button", { class: "btn", onclick: () => { a.value = 7; b.value = 1000; load(); } }, "7¹⁰⁰⁰"));
    },
    counters: { "multiplications": 0, "brute force (n − 1)": 0, "recursion depth": 0 },
    build() { return REC.expo(this.state.a, this.state.n); },
    ctr(f) { return { "multiplications": f.c.mult, "brute force (n − 1)": Math.max(0, f.n - 1), "recursion depth": f.c.depth }; },
    render(f, svg) {
      const g = fresh(svg), rh = 34, y0 = 20;
      f.calls.forEach((c, k) => {
        const y = y0 + k * rh, x = 40 + k * 12;
        const st = k === f.cur ? "active" : c.st === "done" ? "done" : null;
        g.appendChild(S("rect", { x, y, width: 300, height: rh - 6, rx: 8, fill: st === "active" ? "var(--steel-soft)" : "var(--panel)", stroke: st ? COL[st] : "var(--line-2)", "stroke-width": st ? 2.5 : 1 }));
        txt(g, x + 12, y + 19, `Power(${f.a}, ${c.n})`, { "font-weight": 700, "font-size": 13 });
        txt(g, x + 290, y + 19, c.n > 0 ? `${c.n.toString(2)}₂` : "0", { "text-anchor": "end", "font-size": 12, fill: "var(--muted)" });
        if (c.val != null) txt(g, x + 316, y + 19, `= ${c.val}`, { "font-size": 13, "font-weight": 700, fill: "var(--c-done)" });
        else if (c.st === "wait") txt(g, x + 316, y + 19, "waiting for t…", { "font-size": 12, fill: "var(--muted)" });
      });
      const y = y0 + Math.max(1, f.calls.length) * rh + 14;
      if (f.result) txt(g, 40, y + 6, `${f.a}${sup(f.n)} = ${f.result}`, { "font-size": 15, "font-weight": 800, fill: "var(--c-done)" });
      return y + 20;
    },
    legend: [["active", "current call"], ["done", "returned a value"]],
    how: "Each box is one recursive call Power(a, n); the grey number on its right is n in binary. Going down, the exponent is halved, which drops the last bit. Coming back up, each call squares its child's answer, and multiplies by a once more when its n is odd (last bit 1).",
    tries: [
      "3⁶⁴: 64 = 1000000₂, so all six levels are even and cost one multiplication each: 6 in total, against 63 for brute force.",
      "2⁶³: 63 = 111111₂, every level is odd and costs 2 multiplications, so 10 in total. This is the 2⌊log₂n⌋ worst case.",
      "7¹⁰⁰⁰: the answer has 846 digits, and only 14 multiplications are needed. In practice the cost is dominated by multiplying huge numbers, which is why Karatsuba multiplication (Ch 5) matters.",
    ],
  };

  const ORDER = ["seq", "binary", "interp", "qselect", "coin", "peasant", "expo"];

  /* ---------- shared UI ---------- */
  const stage = $("stage"), say = Forge.narrate($("say"));
  let cur = null, code = null, ctr = null;
  const answered = new Set();
  const player = Forge.player($("player"), { frames: [], render });
  function render(f, i) {
    const t = TABS[cur];
    if (cur !== "coin") stage.dataset.kind = "";
    const H = t.render(f, stage);
    stage.setAttribute("viewBox", `0 0 ${W} ${H}`);
    code.highlight(f.line);
    ctr.set(t.ctr(f));
    say.say(f.text);
    ask(f, i);
  }
  function ask(f, i) {
    if (!f.ask || answered.has(i) || !$("predictOn").checked) return;
    player.pause();
    const box = $("predictBox");
    box.innerHTML = "";
    box.appendChild(E("div", { class: "ask-q" }, f.ask.q));
    box.appendChild(E("div", { class: "row" }, f.ask.opts.map((o, k) => E("button", { class: "btn sm", onclick: () => answer(i, k) }, o))));
    box.appendChild(E("div", { class: "small muted", style: { marginTop: "6px" } }, "Answer to continue, or just step forward to skip."));
  }
  function answer(i, k) {
    const f = player.frames[i];
    if (!f || !f.ask) return;
    answered.add(i);
    const ok = k === f.ask.ans, sc = $("predictScore");
    sc.dataset.n = (+sc.dataset.n || 0) + 1; sc.dataset.ok = (+sc.dataset.ok || 0) + (ok ? 1 : 0);
    sc.textContent = `${sc.dataset.ok} / ${sc.dataset.n} right`;
    const box = $("predictBox");
    box.innerHTML = "";
    box.appendChild(E("div", { class: "callout " + (ok ? "ok" : "bad") }, E("b", null, ok ? "Correct. " : `Not quite: the answer is "${f.ask.opts[f.ask.ans]}". `), f.ask.why));
    box.appendChild(E("div", { class: "small muted", style: { marginTop: "6px" } }, "Press ▶ or → to watch it happen."));
  }
  function load() {
    const t = TABS[cur];
    let res;
    try { res = t.build(); } catch (e) { msg("Something went wrong with that input: " + e.message); return; }
    $("codeHost").innerHTML = ""; code = Forge.code($("codeHost"), res.lines);
    $("ctrHost").innerHTML = ""; ctr = Forge.counters($("ctrHost"), t.counters);
    answered.clear();
    $("predictBox").textContent = "When a question appears here, answer it before stepping on.";
    player.load(res.frames);
  }
  function show(key) {
    cur = key;
    const t = TABS[key];
    document.querySelectorAll("#tabs button").forEach((b) => { const on = b.dataset.k === key; b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on)); });
    $("tabChapter").textContent = t.chapter;
    $("tabLead").textContent = t.lead;
    const host = $("controls"); host.innerHTML = "";
    msg("");
    t.controls(host, () => { msg(""); load(); });
    const lg = $("legend"); lg.innerHTML = "";
    t.legend.forEach(([s, txt2]) => lg.appendChild(E("span", null, E("i", { style: { background: COL[s] } }), txt2)));
    $("howBody").textContent = t.how;
    const tr = $("tryBody"); tr.innerHTML = "";
    t.tries.forEach((h) => tr.appendChild(E("li", { html: h })));
    const pr = $("practice"); pr.innerHTML = "";
    pr.appendChild(E("a", { href: `https://github.com/Normansrule/algorithm-forge/blob/main/lessons/${t.lesson}/README.md` }, "📘 Lesson"));
    t.arena.forEach((id) => pr.appendChild(E("a", { href: `../arena/problem.html?id=${id}` }, "⚔️ " + id)));
    stage.dataset.kind = "";
    try { history.replaceState(null, "", "#" + key); } catch (e) { /* ignore */ }
    load();
  }
  const tabs = $("tabs");
  ORDER.forEach((k) => tabs.appendChild(E("button", { role: "tab", "data-k": k, onclick: () => show(k) }, TABS[k].label)));
  const start = (location.hash || "").slice(1);
  show(TABS[start] ? start : "binary");
})();
