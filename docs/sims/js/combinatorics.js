/* Generating combinatorial objects (Levitin §4.3): permutations and subsets. */
(function () {
  "use strict";
  Forge.page({ title: "Generating Permutations and Subsets", chapter: "Ch 4 · Decrease-and-Conquer" });
  const $ = (id) => document.getElementById(id);
  const S = Forge.svg;
  const W = 760, H = 360;
  const stage = $("stage");
  const say = Forge.narrate($("say"));
  const pred = FX.predict($("predict"));
  let code = null, ctr = null, runId = 0, mode = "ins";
  let labels = [];
  const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1));
  const ps = (a) => a.join(" ");
  const ARROW = { "-1": "←", "1": "→" };

  const LINES = {
    ins: [
      "ALGORITHM PermsByInsertion(n)",
      "    // decrease-by-one: permutations of 1..k from those of 1..k−1",
      "    L ← [ (1) ]",
      "    for k ← 2 to n do",
      "        newL ← empty list;  dir ← right-to-left",
      "        for each permutation p in L do",
      "            insert k into p at every position, moving in direction dir,",
      "                and append each result to newL",
      "            dir ← the opposite direction",
      "        L ← newL",
      "    return L",
    ],
    jt: [
      "ALGORITHM JohnsonTrotter(n)",
      "    // every element carries an arrow; all start pointing left",
      "    perm ← 1← 2← ... n←;  output perm",
      "    while perm has a mobile element do   // arrow points at a smaller neighbor",
      "        k ← the largest mobile element",
      "        swap k with the neighbor its arrow points to",
      "        reverse the arrow of every element larger than k",
      "        output perm",
    ],
    lex: [
      "ALGORITHM LexicographicPermute(n)",
      "    a ← 1 2 ... n;  output a",
      "    while some a[i] < a[i + 1] do",
      "        i ← the largest index with a[i] < a[i + 1]   // a[i+1..n] decreases",
      "        j ← the largest index with a[i] < a[j]",
      "        swap a[i] and a[j]",
      "        reverse a[i + 1..n]",
      "        output a",
    ],
    bin: [
      "ALGORITHM SubsetsByBinaryCounting(n)",
      "    // bit string b1..bn: bi = 1 means ai is in the subset",
      "    for k ← 0 to 2^n − 1 do",
      "        b ← k written in binary with n digits",
      "        output the subset { ai : bi = 1 }",
    ],
    gray: [
      "ALGORITHM BRGC(n)",
      "    // binary reflected Gray code of order n",
      "    if n = 1 then",
      "        L ← [0, 1]",
      "    else",
      "        L1 ← BRGC(n − 1)",
      "        L2 ← L1 in reverse order",
      "        put 0 in front of every string in L1",
      "        put 1 in front of every string in L2",
      "        L ← L1 followed by L2",
      "    return L",
    ],
  };

  /* ---------------------------------------------------------------- recorders */
  function recIns(n) {
    const frames = [], levels = [["1"]];
    let L = [[1]], swaps = 0, out = 0;
    const push = (o) => frames.push(Object.assign({ levels: levels.map((l) => l.slice()), swaps, out }, o));
    push({ line: 2, tiles: [1], st: { 0: "done" }, text: "Start small: the only permutation of {1} is (1). Every bigger list is built from the one below it." });
    if (n === 1) out = 1;
    for (let k = 2; k <= n; k++) {
      const newL = [];
      levels.push([]);
      let dir = -1; // -1 = right to left
      push({ line: [3, 4], tiles: L[0], st: {}, text: `Level ${k}: insert <b>${k}</b> into each of the ${L.length} permutation${L.length > 1 ? "s" : ""} of 1..${k - 1}, first moving right-to-left, then switching direction for every new permutation.` });
      L.forEach((p, idx) => {
        if (k === n && idx === 1) {
          push({ line: [5, 8], tiles: p, st: {}, text: `Next base permutation: <b>${ps(p)}</b>. In which direction will ${k} travel through it?`,
            ask: { q: `${k} just moved right-to-left through ${ps(L[0])}. Which way will it move through <b>${ps(p)}</b>?`, options: [{ label: "right-to-left again", value: "rl" }, { label: "left-to-right", value: "lr" }], answer: "lr",
              why: `The direction flips for every new base permutation. Because ${k} is already at the left end, the first new permutation (${k} ${ps(p)}) differs from the previous one by a single adjacent swap. That's the minimal-change property.` } });
        }
        const positions = dir === -1 ? Array.from({ length: p.length + 1 }, (_, q) => p.length - q) : Array.from({ length: p.length + 1 }, (_, q) => q);
        positions.forEach((pos) => {
          const q = p.slice(); q.splice(pos, 0, k);
          const prev = newL[newL.length - 1];
          newL.push(q); levels[levels.length - 1].push(q.join(""));
          const st = { [pos]: "active" };
          let diff = "";
          if (prev) {
            const d = []; q.forEach((x, t) => { if (x !== prev[t]) d.push(t); });
            if (d.length === 2 && d[1] === d[0] + 1) { st[d[0]] = st[d[0]] || "swap"; st[d[1]] = st[d[1]] || "swap"; swaps++; diff = ` Compared with ${prev.join("")}, only the adjacent pair in positions ${d[0] + 1} and ${d[1] + 1} changed places.`; }
          }
          if (k === n) out++;
          push({ line: [5, 6, 7], tiles: q, st, dir, text: `Insert ${k} into ${ps(p)} ${pos === p.length ? "at the right end" : pos === 0 ? "at the left end" : `after position ${pos}`} (moving ${dir === -1 ? "right-to-left ←" : "left-to-right →"}): <b>${q.join("")}</b>.` + diff });
        });
        dir = -dir;
      });
      L = newL;
      push({ line: 9, tiles: L[L.length - 1], st: {}, text: `Level ${k} complete: ${L.length} = ${k}! permutations.` });
    }
    push({ line: 10, tiles: L[L.length - 1], st: {}, final: true, text: `Done: ${L.length} = ${n}! permutations. Each one is a single adjacent swap away from the one before it, but we needed all the smaller lists along the way.` });
    return frames;
  }

  function recJT(n) {
    const frames = [];
    const perm = Array.from({ length: n }, (_, k) => k + 1);
    const dir = {}; perm.forEach((v) => (dir[v] = -1));
    const outs = [ps(perm)];
    let swaps = 0, asks = 0;
    const push = (o) => frames.push(Object.assign({ tiles: perm.slice(), arrows: perm.map((v) => dir[v]), outs: outs.length, swaps }, o));
    push({ line: 2, st: {}, text: `Start with 1 2 … ${n}, every arrow pointing left. Output it.` });
    for (;;) {
      const mobile = [];
      perm.forEach((v, i) => { const j = i + dir[v]; if (j >= 0 && j < n && perm[j] < v) mobile.push(i); });
      if (!mobile.length) { push({ line: 3, st: {}, final: true, text: `No element is mobile any more: every arrow points at a bigger neighbor or off the edge. Done after ${outs.length} = ${n}! permutations and ${swaps} swaps, one swap per new permutation.` }); break; }
      const ki = mobile.reduce((a, b) => (perm[a] > perm[b] ? a : b)), k = perm[ki];
      if (asks < 2 && outs.length >= 2 && n >= 3) {
        asks++;
        push({ line: 3, st: {}, text: `Which elements are mobile now (arrow pointing at a smaller neighbor)? Find the largest one.`,
          ask: { q: `In <b>${perm.map((v) => v + ARROW[dir[v]]).join(" ")}</b>, which is the largest mobile element?`, options: perm.slice().sort((a, b) => a - b).map((v) => ({ label: String(v), value: v })), answer: k,
            why: `Mobile: ${mobile.map((i) => perm[i]).join(", ")}. The largest is ${k}.` + (mobile.length < n ? ` Not mobile: ${perm.filter((_, i) => !mobile.includes(i)).join(", ")} (arrow points at a larger number or off the end).` : "") } });
      }
      const st = {}; mobile.forEach((i) => (st[i] = "compare")); st[ki] = "active";
      push({ line: [3, 4], st, text: `Mobile elements: <b>${mobile.map((i) => perm[i]).join(", ")}</b>. The largest is <b>${k}</b>.` });
      const j = ki + dir[k];
      [perm[ki], perm[j]] = [perm[j], perm[ki]]; swaps++;
      push({ line: 5, st: { [ki]: "swap", [j]: "swap" }, text: `Swap ${k} with its ${dir[k] === -1 ? "left" : "right"} neighbor ${perm[ki]}: ${ps(perm)}.` });
      const flipped = [];
      perm.forEach((v, i) => { if (v > k) { dir[v] = -dir[v]; flipped.push(i); } });
      outs.push(ps(perm));
      const st2 = {}; flipped.forEach((i) => (st2[i] = "pivot"));
      push({ line: [6, 7], st: st2, text: (flipped.length ? `Reverse the arrows of the elements larger than ${k}: ${flipped.map((i) => perm[i]).join(", ")}. ` : `No element is larger than ${k}, so no arrow turns. `) + `Output permutation #${outs.length}: <b>${ps(perm)}</b>.` });
    }
    frames.outs = outs;
    return frames;
  }

  function recLex(start, cap) {
    const frames = [], a = start.slice(), n = a.length;
    const outs = [ps(a)];
    let swaps = 0, asks = 0;
    const push = (o) => frames.push(Object.assign({ tiles: a.slice(), outs: outs.length, swaps }, o));
    push({ line: 1, st: {}, text: `Start from <b>${ps(a)}</b> and output it. Each step finds the very next permutation in dictionary order.` });
    while (outs.length < cap) {
      let i = n - 2;
      while (i >= 0 && a[i] >= a[i + 1]) i--;
      if (i < 0) { push({ line: 2, st: {}, final: true, text: `The whole permutation is decreasing (${ps(a)}): it's the last one in lexicographic order. Done after ${outs.length} permutations${outs.length === fact(n) ? ` = ${n}!` : ""}.` }); break; }
      let j = n - 1;
      while (a[j] <= a[i]) j--;
      const nxt = a.slice(); [nxt[i], nxt[j]] = [nxt[j], nxt[i]];
      for (let l = i + 1, r = n - 1; l < r; l++, r--) [nxt[l], nxt[r]] = [nxt[r], nxt[l]];
      if (asks < 2 && i < n - 2 && n >= 3) {
        asks++;
        const wrong1 = a.slice(); [wrong1[n - 2], wrong1[n - 1]] = [wrong1[n - 1], wrong1[n - 2]];
        const wrong2 = a.slice(); [wrong2[i], wrong2[j]] = [wrong2[j], wrong2[i]];
        const wrong3 = a.slice(); [wrong3[i], wrong3[i + 1]] = [wrong3[i + 1], wrong3[i]];
        const opts = [...new Set([nxt, wrong1, wrong2, wrong3].map(ps))].filter((x) => x !== ps(a)).sort();
        push({ line: 2, st: {}, text: `What comes right after <b>${ps(a)}</b> in dictionary order?`,
          ask: { q: `What is the next permutation after <b>${ps(a)}</b>?`, options: opts.map((x) => ({ label: x, value: x })), answer: ps(nxt),
            why: `Suffix ${ps(a.slice(i + 1))} is decreasing, so it can't grow on its own. Raise a[${i + 1}] = ${a[i]} to the smallest bigger value in the suffix (${a[j]}), then put the suffix in increasing order: ${ps(nxt)}.` } });
      }
      const st = {}; for (let t = i + 1; t < n; t++) st[t] = "compare"; st[i] = "active";
      push({ line: 3, st, ptr: [{ i, label: "i" }], text: `The longest decreasing suffix is <b>${ps(a.slice(i + 1))}</b>. The element just before it, a[${i + 1}] = <b>${a[i]}</b>, is the one that must grow.` });
      const st2 = { ...st, [j]: "pivot" };
      push({ line: 4, st: st2, ptr: [{ i, label: "i" }, { i: j, label: "j" }], text: `Scanning from the right, the first element bigger than ${a[i]} is a[${j + 1}] = <b>${a[j]}</b>: the smallest suffix value that is still bigger.` });
      [a[i], a[j]] = [a[j], a[i]]; swaps++;
      push({ line: 5, st: { [i]: "swap", [j]: "swap" }, ptr: [{ i, label: "i" }, { i: j, label: "j" }], text: `Swap them: ${ps(a)}. The suffix after position ${i + 1} is still decreasing.` });
      const st4 = {}; for (let t = i + 1; t < n; t++) st4[t] = "done";
      for (let l = i + 1, r = n - 1; l < r; l++, r--) { [a[l], a[r]] = [a[r], a[l]]; swaps++; }
      outs.push(ps(a));
      push({ line: [6, 7], st: st4, ptr: [{ i, label: "i" }], text: `Reverse the suffix so it increases: output <b>${ps(a)}</b> (#${outs.length}).` });
    }
    if (outs.length >= cap && frames[frames.length - 1] && !frames[frames.length - 1].final) push({ line: 7, st: {}, final: true, text: `Stopped after ${cap} permutations to keep the animation short.` });
    frames.outs = outs;
    return frames;
  }

  const subsetName = (bits) => { const s = []; bits.split("").forEach((b, i) => { if (b === "1") s.push(labels[i]); }); return s.length ? "{" + s.join(", ") + "}" : "∅"; };
  function recBin(n) {
    const frames = [], outs = [];
    let flips = 0, maxFlip = 0, prev = null;
    const walk = [];
    for (let k = 0; k < 1 << n; k++) {
      const bits = k.toString(2).padStart(n, "0");
      if (k === 1 << (n - 1) && n >= 2) {
        const from = prev;
        push({ line: 2, tiles: from.split("").map(Number), st: {}, text: `Next we add 1 to <b>${from}</b>. Think about the carries.`,
          ask: { q: `Going from <b>${from}</b> to the next binary number, how many bits change?`, options: Array.from({ length: n }, (_, t) => ({ label: String(t + 1), value: t + 1 })), answer: n,
            why: `${from} + 1 = ${bits}: the carry ripples through every bit, so all ${n} bits flip. The subset changes from ${subsetName(from)} to ${subsetName(bits)}: far from a minimal change.` } });
      }
      const st = {};
      let changed = 0;
      if (prev != null) bits.split("").forEach((b, i) => { if (b !== prev[i]) { st[i] = "swap"; changed++; } });
      flips += changed; maxFlip = Math.max(maxFlip, changed);
      outs.push(bits); walk.push(bits);
      push({ line: [2, 3, 4], tiles: bits.split("").map(Number), st, text: `k = ${k}: bit string <b>${bits}</b> → subset <b>${subsetName(bits)}</b>.` + (prev != null ? ` ${changed} bit${changed > 1 ? "s" : ""} changed from ${prev}.` : "") });
      prev = bits;
    }
    push({ line: 2, tiles: prev.split("").map(Number), st: {}, final: true, text: `Done: all 2^${n} = ${1 << n} subsets. Binary counting flipped ${flips} bits in total (as many as ${maxFlip} at once). A Gray code does it with ${(1 << n) - 1} flips, one per step.` });
    function push(o) { frames.push(Object.assign({ outs: outs.length, flips, maxFlip, walk: walk.slice() }, o)); }
    frames.outs = outs;
    return frames;
  }

  function recGray(n) {
    const frames = [];
    let flips = 0, maxFlip = 0;
    const walk = [];
    const push = (o) => frames.push(Object.assign({ outs: walk.length, flips, maxFlip, walk: walk.slice() }, o));
    let L = ["0", "1"];
    push({ line: [2, 3], build: [{ title: "BRGC(1)", items: L, st: "done" }], text: "Base case, order 1: the list 0, 1." });
    for (let k = 2; k <= n; k++) {
      const L1 = L.slice(), L2 = L.slice().reverse();
      push({ line: 5, build: [{ title: `L1 = BRGC(${k - 1})`, items: L1, st: "" }], text: `Order ${k}: take the order-${k - 1} list L1 (${L1.length} strings).` });
      push({ line: 6, build: [{ title: "L1", items: L1, st: "" }, { title: "L2 = L1 reversed", items: L2, st: "pivot" }], text: `Copy it in <b>reverse</b> order: that's the "reflected" part. The last string of L1 equals the first string of L2.` });
      push({ line: 7, build: [{ title: "0 + L1", items: L1.map((s) => "0" + s), st: "active", pre: 1 }, { title: "L2", items: L2, st: "pivot" }], text: `Put 0 in front of every string in L1.` });
      push({ line: 8, build: [{ title: "0 + L1", items: L1.map((s) => "0" + s), st: "active", pre: 1 }, { title: "1 + L2", items: L2.map((s) => "1" + s), st: "pivot", pre: 1 }], text: `Put 1 in front of every string in L2. Where the two halves meet, the strings differ only in that new first bit.` });
      L = L1.map((s) => "0" + s).concat(L2.map((s) => "1" + s));
      push({ line: 9, build: [{ title: `BRGC(${k})`, items: L, st: "done" }], text: `Append: BRGC(${k}) = ${L.join(", ")}.` });
    }
    push({ line: 10, build: [{ title: `BRGC(${n})`, items: L, st: "done" }], text: `Now walk through the ${L.length} strings in order. Each one is a subset, and each step flips exactly one bit.` });
    let prev = null, asks = 0;
    L.forEach((bits, idx) => {
      if (prev && (idx === 2 || idx === 4) && asks < 2 && n >= 2) {
        asks++;
        const bit = bits.split("").findIndex((b, i) => b !== prev[i]);
        push({ line: 10, tiles: prev.split("").map(Number), st: {}, text: `We're at ${prev}. Which bit will the next Gray code string flip?`,
          ask: { q: `Current string: <b>${prev}</b>. Which bit flips to reach the next string?`, options: Array.from({ length: n }, (_, t) => ({ label: "b" + (t + 1), value: t })), answer: bit,
            why: `Next is ${bits}: only b${bit + 1} changes. (Shortcut from Levitin Exercise 4.3.9: at step i, flip the bit at the position of the least significant 1 in the binary form of i, counting from the right.)` } });
      }
      const st = {}; let changed = 0;
      if (prev) bits.split("").forEach((b, i) => { if (b !== prev[i]) { st[i] = "swap"; changed++; } });
      flips += changed; maxFlip = Math.max(maxFlip, changed);
      walk.push(bits);
      push({ line: 10, tiles: bits.split("").map(Number), st, text: `#${idx + 1}: <b>${bits}</b> → subset <b>${subsetName(bits)}</b>.` + (prev ? ` One bit flipped: ${Object.keys(st).map((i) => "b" + (+i + 1)).join("")}, so one item was ${bits[+Object.keys(st)[0]] === "1" ? "added" : "removed"}.` : " The empty set.") });
      prev = bits;
    });
    const last = L[L.length - 1], first = L[0];
    const d = last.split("").filter((b, i) => b !== first[i]).length;
    push({ line: 10, tiles: last.split("").map(Number), st: {}, final: true, text: `Done: ${L.length} = 2^${n} subsets with ${flips} single-bit flips. The code is cyclic: the last string ${last} differs from the first ${first} in ${d} bit.` });
    frames.outs = L;
    return frames;
  }

  /* ------------------------------------------------------------------ drawing */
  const FILL = { compare: "var(--c-compare)", active: "var(--c-active)", swap: "var(--c-swap)", pivot: "var(--c-pivot)", done: "var(--c-done)" };
  function tiles(arr, st, o) {
    const n = arr.length, size = o.size, gap = o.gap || 10;
    const total = n * size + (n - 1) * gap, x0 = o.cx - total / 2;
    arr.forEach((v, i) => {
      const x = x0 + i * (size + gap), s = st[i];
      stage.appendChild(S("rect", { x, y: o.y, width: size, height: size, rx: 10, fill: FILL[s] || "var(--panel-2)", stroke: s ? FILL[s] : "var(--line-2)", "stroke-width": 2, style: "transition: all .15s" }));
      stage.appendChild(S("text", { x: x + size / 2, y: o.y + size / 2 + size * 0.17, "text-anchor": "middle", "font-size": size * 0.46, "font-weight": 700, fill: s ? "#0d1117" : "var(--ink)" }, String(v)));
      if (o.arrows) stage.appendChild(S("text", { x: x + size / 2, y: o.y - 10, "text-anchor": "middle", "font-size": size * 0.42, "font-weight": 700, fill: s === "pivot" ? "var(--c-pivot)" : "var(--ember)" }, ARROW[o.arrows[i]]));
      if (o.sub) stage.appendChild(S("text", { x: x + size / 2, y: o.y + size + 18, "text-anchor": "middle", "font-size": 12, fill: "var(--muted)" }, o.sub[i]));
    });
    (o.ptr || []).forEach((p) => {
      const x = x0 + p.i * (size + gap) + size / 2, y = o.y + size + 10;
      stage.appendChild(S("path", { d: `M${x} ${y} l-7 11 h14 z`, fill: "var(--ember)" }));
      stage.appendChild(S("text", { x, y: y + 28, "text-anchor": "middle", "font-size": 14, "font-weight": 700, fill: "var(--ember)" }, p.label));
    });
  }
  function cubeLayout(n) {
    const B = { 1: [[1, 0]], 2: [[0, -1], [1, 0]], 3: [[0.55, -0.45], [0, -1], [1, 0]], 4: [[1.35, 0.35], [0.5, -0.42], [0, -1], [1, 0]] }[n];
    const pts = {};
    for (let m = 0; m < 1 << n; m++) {
      const bits = m.toString(2).padStart(n, "0");
      let x = 0, y = 0;
      bits.split("").forEach((b, i) => { if (b === "1") { x += B[i][0]; y += B[i][1]; } });
      pts[bits] = { x, y };
    }
    const xs = Object.values(pts).map((p) => p.x), ys = Object.values(pts).map((p) => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const bx0 = 440, bx1 = 730, by0 = 50, by1 = 320;
    const sc = Math.min((bx1 - bx0) / Math.max(0.5, maxX - minX), (by1 - by0) / Math.max(0.5, maxY - minY));
    const ox = (bx0 + bx1) / 2 - ((minX + maxX) / 2) * sc, oy = (by0 + by1) / 2 - ((minY + maxY) / 2) * sc;
    for (const k in pts) pts[k] = { x: ox + pts[k].x * sc, y: oy + pts[k].y * sc };
    return pts;
  }
  function drawCube(n, walk) {
    if (n > 4) {
      stage.appendChild(S("text", { x: 585, y: 180, "text-anchor": "middle", "font-size": 13, fill: "var(--muted)" }, "cube view for n ≤ 4"));
      return;
    }
    const P = cubeLayout(n), keys = Object.keys(P);
    const diff = (a, b) => a.split("").filter((c, i) => c !== b[i]).length;
    keys.forEach((a) => keys.forEach((b) => { if (a < b && diff(a, b) === 1) stage.appendChild(S("line", { x1: P[a].x, y1: P[a].y, x2: P[b].x, y2: P[b].y, stroke: "var(--line-2)", "stroke-width": 1.5 })); }));
    for (let k = 1; k < walk.length; k++) {
      const a = P[walk[k - 1]], b = P[walk[k]], jump = diff(walk[k - 1], walk[k]) > 1;
      stage.appendChild(S("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: jump ? "var(--c-swap)" : "var(--ember)", "stroke-width": jump ? 2.5 : 4, "stroke-dasharray": jump ? "6 5" : null, "stroke-linecap": "round" }));
    }
    const seen = new Set(walk), cur = walk[walk.length - 1];
    keys.forEach((k) => {
      const on = k === cur, vis = seen.has(k);
      stage.appendChild(S("circle", { cx: P[k].x, cy: P[k].y, r: n === 4 ? 9 : 12, fill: on ? "var(--c-active)" : vis ? "var(--c-done)" : "var(--panel-2)", stroke: on || vis ? "none" : "var(--line-2)", "stroke-width": 1.5 }));
      stage.appendChild(S("text", { x: P[k].x, y: P[k].y - (n === 4 ? 13 : 17), "text-anchor": "middle", "font-size": n === 4 ? 9.5 : 11, fill: on ? "var(--c-active)" : "var(--ink-2)", "font-weight": on ? 700 : 400 }, k));
    });
  }
  function drawBuild(cols) {
    const maxLen = Math.max(...cols.map((c) => c.items.length));
    const rowH = Math.min(22, 280 / maxLen), colW = 170, x0 = 380 - (cols.length * colW) / 2;
    cols.forEach((c, ci) => {
      const x = x0 + ci * colW + colW / 2;
      stage.appendChild(S("text", { x, y: 34, "text-anchor": "middle", "font-size": 13, "font-weight": 700, fill: "var(--ink-2)" }, c.title));
      c.items.forEach((s, r) => {
        const y = 60 + r * rowH;
        stage.appendChild(S("rect", { x: x - 55, y: y - rowH * 0.8 + 2, width: 110, height: rowH - 3, rx: 5, fill: c.st ? FILL[c.st] : "var(--panel-2)", opacity: c.st ? 0.9 : 1 }));
        const t = S("text", { x, y: y - rowH * 0.2 + 2, "text-anchor": "middle", "font-size": Math.min(15, rowH * 0.75), "font-weight": 700, fill: c.st ? "#0d1117" : "var(--ink)" });
        if (c.pre) { t.appendChild(S("tspan", { "text-decoration": "underline" }, s[0])); t.appendChild(document.createTextNode(s.slice(1))); } else t.textContent = s;
        stage.appendChild(t);
      });
    });
    if (cols.length === 2) stage.appendChild(S("line", { x1: 380, y1: 44, x2: 380, y2: 60 + maxLen * rowH, stroke: "var(--muted)", "stroke-dasharray": "3 5" }));
  }

  let frames = [], N = 3;
  function render(f, i, fr) {
    frames = fr;
    const perm = mode === "ins" || mode === "jt" || mode === "lex";
    const HH = perm ? 280 : H;
    const WW = perm ? Math.max(640, f.tiles.length * (Math.min(84, 600 / f.tiles.length - 12) + 10) + 120) : W;
    stage.setAttribute("viewBox", `0 0 ${WW} ${HH}`);
    stage.innerHTML = "";
    if (perm) {
      const n = f.tiles.length, size = Math.min(84, 600 / n - 12);
      tiles(f.tiles, f.st || {}, { cx: WW / 2, y: 100, size, arrows: f.arrows, ptr: f.ptr });
      const top = mode === "ins" ? (f.dir ? `inserting ${Math.max(...f.tiles)} ${f.dir === -1 ? "right-to-left ←" : "left-to-right →"}` : "") : mode === "jt" ? "arrows show each element's direction" : "";
      stage.appendChild(S("text", { x: WW / 2, y: 40, "text-anchor": "middle", "font-size": 14, fill: "var(--muted)" }, top));
      stage.appendChild(S("text", { x: WW / 2, y: HH - 18, "text-anchor": "middle", "font-size": 14, fill: "var(--ink-2)" }, mode === "ins" ? `level ${f.tiles.length} of ${N}` : `permutation #${f.outs} of ${mode === "lex" && fr.partial ? "…" : fact(N)}`));
    } else if (f.build) {
      drawBuild(f.build);
    } else {
      const n = f.tiles.length, size = Math.min(64, 360 / n - 10);
      tiles(f.tiles, f.st || {}, { cx: 210, y: 110, size, sub: labels.slice(0, n) });
      stage.appendChild(S("text", { x: 210, y: 70, "text-anchor": "middle", "font-size": 13, fill: "var(--muted)" }, "b1 … b" + n));
      const bits = f.tiles.join("");
      stage.appendChild(S("text", { x: 210, y: 250, "text-anchor": "middle", "font-size": 18, "font-weight": 700, fill: "var(--ink)" }, subsetName(bits)));
      stage.appendChild(S("text", { x: 210, y: 290, "text-anchor": "middle", "font-size": 13, fill: "var(--muted)" }, `subset #${f.outs} of 2^${n} = ${1 << n}`));
      drawCube(n, f.walk);
    }
    // list panel
    const box = $("list");
    if (mode === "ins") {
      box.innerHTML = f.levels.map((l, k) => `<div class="small muted" style="margin:6px 0 4px">k = ${k + 1}</div><div class="fx-chips">${l.map((s, t) => `<span class="${k === f.levels.length - 1 && t === l.length - 1 && !f.final ? "on" : ""}">${s}</span>`).join("") || "…"}</div>`).join("");
    } else {
      const outs = fr.outs.slice(0, f.outs);
      box.innerHTML = `<div class="fx-chips">${outs.map((s, t) => `<span class="${t === outs.length - 1 && !f.final ? "on" : ""}">${perm ? s : s + " " + subsetName(s)}</span>`).join("") || "…"}</div>`;
    }
    const on = box.querySelector(".on");
    if (on) box.scrollTop = Math.max(0, on.offsetTop - box.clientHeight + 40);
    if (perm) ctr.set({ generated: mode === "ins" ? (f.levels[f.levels.length - 1] || []).length : f.outs, "n!": fact(N), "swaps so far": f.swaps });
    else ctr.set({ generated: f.outs, "2ⁿ": 1 << N, "bit flips": f.flips, "most bits changed at once": f.maxFlip });
    code.highlight(f.line);
    say.say(f.text);
    if (f.ask) { const key = runId + ":" + i; pred.show(f.ask, key); if (pred.shouldPause(key)) player.pause(); } else pred.hide();
  }
  const player = Forge.player($("player"), { frames: [], render, fps: 3 });

  function setLegend() {
    const perm = mode === "ins" || mode === "jt" || mode === "lex";
    const items = mode === "ins" ? [["active", "the inserted element"], ["swap", "adjacent pair that changed"]]
      : mode === "jt" ? [["compare", "mobile elements"], ["active", "largest mobile k"], ["swap", "swapped"], ["pivot", "arrow reversed"]]
      : mode === "lex" ? [["compare", "decreasing suffix"], ["active", "a[i]"], ["pivot", "a[j]"], ["swap", "swapped"], ["done", "reversed suffix"]]
      : [["swap", "bit that flipped"], ["active", "current corner"], ["done", "corners visited"]];
    let h = items.map(([s, t]) => `<span><i style="background:${FILL[s]}"></i>${t}</span>`).join("");
    if (!perm) h += `<span><i style="background:var(--ember);height:3px;width:16px;vertical-align:3px"></i>one-bit step (cube edge)</span>` + (mode === "bin" ? `<span><i style="background:var(--c-swap);height:3px;width:16px;vertical-align:3px"></i>multi-bit jump</span>` : "");
    $("legend").innerHTML = h;
  }
  const NOTES = {
    ins: "Bottom-up decrease-by-one: all permutations of 1..k−1 are built first, then k is inserted everywhere.",
    jt: "Johnson–Trotter produces the same minimal-change order without building the smaller lists. n ≤ 6.",
    lex: "Dictionary order, the oldest method here (it goes back to 14th-century India). Type any starting permutation, even of other numbers.",
    bin: "Count from 0 to 2ⁿ − 1 in binary; each number is a subset. n ≤ 6.",
    gray: "The Binary Reflected Gray Code (BRGC): every subset differs from the previous one by one item. n ≤ 6.",
  };
  function readLabels(n) {
    const typed = ($("items").value || "").split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
    labels = Array.from({ length: n }, (_, k) => typed[k] || "a" + (k + 1));
  }
  function run(opts) {
    opts = opts || {};
    N = Math.max(1, Math.min(6, Math.round(+$("n").value || 3)));
    $("n").value = N;
    let fr;
    if (mode === "ins") fr = recIns(N);
    else if (mode === "jt") fr = recJT(N);
    else if (mode === "lex") {
      if (opts.start) { N = opts.start.length; fr = recLex(opts.start, 60); fr.partial = true; }
      else fr = recLex(Array.from({ length: N }, (_, k) => k + 1), 800);
    } else { readLabels(N); fr = mode === "bin" ? recBin(N) : recGray(N); }
    frames = fr; runId++;
    player.load(fr);
  }
  function setMode(m) {
    mode = m;
    document.querySelectorAll("#modes button").forEach((b) => b.classList.toggle("on", b.dataset.m === m));
    $("lexCtl").classList.toggle("show", m === "lex");
    $("subCtl").classList.toggle("show", m === "bin" || m === "gray");
    $("modeNote").textContent = NOTES[m];
    $("code").innerHTML = ""; $("ctr").innerHTML = "";
    code = Forge.code($("code"), LINES[m]);
    const perm = m === "ins" || m === "jt" || m === "lex";
    ctr = Forge.counters($("ctr"), perm ? { generated: 0, "n!": 0, "swaps so far": 0 } : { generated: 0, "2ⁿ": 0, "bit flips": 0, "most bits changed at once": 0 });
    $("listTitle").textContent = m === "ins" ? "Lists built level by level (like Levitin Fig. 4.9)" : perm ? "Permutations generated so far" : "Subsets generated so far";
    setLegend();
    run();
  }
  document.querySelectorAll("#modes button").forEach((b) => (b.onclick = () => setMode(b.dataset.m)));
  $("go").onclick = () => run();
  $("n").onchange = () => run();
  $("items").onchange = () => run();
  $("rand").onclick = () => {
    if (mode === "lex") {
      const n = 4 + Math.floor(Math.random() * 3), a = Array.from({ length: n }, (_, k) => k + 1).sort(() => Math.random() - 0.5);
      $("lexStart").value = a.join(" ");
      run({ start: a });
    } else { $("n").value = 2 + Math.floor(Math.random() * 3); run(); }
  };
  $("lexGo").onclick = () => {
    const a = $("lexStart").value.split(/[\s,]+/).filter(Boolean).map(Number).filter((x) => Number.isFinite(x)).slice(0, 8);
    if (a.length < 2) { say.say("Type at least two numbers, e.g. 3 6 2 5 4 1."); return; }
    run({ start: a });
  };
  setMode("ins");
})();
