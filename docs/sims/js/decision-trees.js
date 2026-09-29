/* Algorithm Forge — Decision trees and lower bounds (Levitin §11.1–11.2).
   Engine (tree builders, bounds) is pure and exported for Node tests; UI runs only in the browser. */
(function () {
  "use strict";
  const LET = "abcdef";

  /* ---------------- sorting algorithms written against a comparison oracle ----------------
     less(x, y, line) answers "is element x < element y?"; A holds element ids (0..n-1). */
  const ALGOS = {
    insertion: {
      name: "Insertion sort",
      lines: [
        "ALGORITHM InsertionSort(A[0..n-1])",
        "    for i ← 1 to n - 1 do",
        "        v ← A[i]",
        "        j ← i - 1",
        "        while j ≥ 0 and A[j] > v do",
        "            A[j + 1] ← A[j]",
        "            j ← j - 1",
        "        A[j + 1] ← v",
      ],
      run(A, less) {
        const n = A.length;
        for (let i = 1; i < n; i++) {
          const v = A[i]; let j = i - 1;
          while (j >= 0 && !less(A[j], v, 4, A)) { A[j + 1] = A[j]; j--; }
          A[j + 1] = v;
        }
        return A;
      },
    },
    selection: {
      name: "Selection sort",
      lines: [
        "ALGORITHM SelectionSort(A[0..n-1])",
        "    for i ← 0 to n - 2 do",
        "        min ← i",
        "        for j ← i + 1 to n - 1 do",
        "            if A[j] < A[min] then min ← j",
        "        swap A[i] and A[min]",
      ],
      run(A, less) {
        const n = A.length;
        for (let i = 0; i < n - 1; i++) {
          let min = i;
          for (let j = i + 1; j < n; j++) if (less(A[j], A[min], 4, A)) min = j;
          [A[i], A[min]] = [A[min], A[i]];
        }
        return A;
      },
    },
    bubble: {
      name: "Bubble sort",
      lines: [
        "ALGORITHM BubbleSort(A[0..n-1])",
        "    for i ← 0 to n - 2 do",
        "        for j ← 0 to n - 2 - i do",
        "            if A[j + 1] < A[j] then",
        "                swap A[j] and A[j + 1]",
      ],
      run(A, less) {
        const n = A.length;
        for (let i = 0; i < n - 1; i++) for (let j = 0; j < n - 1 - i; j++) if (less(A[j + 1], A[j], 3, A)) [A[j], A[j + 1]] = [A[j + 1], A[j]];
        return A;
      },
    },
  };

  function perms(n) {
    const out = [], a = [...Array(n).keys()];
    (function rec(k) { if (k === n) { out.push(a.slice()); return; } for (let i = k; i < n; i++) { [a[k], a[i]] = [a[i], a[k]]; rec(k + 1); [a[k], a[i]] = [a[i], a[k]]; } })(0);
    return out;
  }

  /** Build the full decision tree of a comparison sort for n distinct elements.
      Internal node: {x, y, line, state, yes, no, redundant}; impossible branch = null. Leaf: {leaf:true, order}. */
  function buildSortTree(algoKey, n) {
    const algo = ALGOS[algoKey];
    const all = perms(n); // rank[e] = position of element e in sorted order
    function rec(answers, cons) {
      let k = 0, need = null;
      const A = [...Array(n).keys()];
      try {
        algo.run(A, (x, y, line, arr) => {
          if (k < answers.length) return answers[k++].ans;
          need = { x, y, line, state: arr.slice() };
          throw need;
        });
      } catch (e) { if (e !== need) throw e; }
      if (!need) return { leaf: true, order: A.slice(), depth: answers.length, count: cons.length };
      const yesC = cons.filter((r) => r[need.x] < r[need.y]), noC = cons.filter((r) => r[need.x] > r[need.y]);
      const node = { x: need.x, y: need.y, line: need.line, state: need.state, depth: answers.length };
      node.yes = yesC.length ? rec(answers.concat([{ ans: true }]), yesC) : null;
      node.no = noC.length ? rec(answers.concat([{ ans: false }]), noC) : null;
      node.redundant = !yesC.length || !noC.length;
      return node;
    }
    const root = rec([], all);
    const stats = { leaves: 0, height: 0, sumDepth: 0, redundant: 0 };
    (function walk(t) {
      if (!t) return;
      if (t.leaf) { stats.leaves++; stats.height = Math.max(stats.height, t.depth); stats.sumDepth += t.depth * t.count; return; }
      if (t.redundant) stats.redundant++;
      walk(t.yes); walk(t.no);
    })(root);
    stats.avg = stats.sumDepth / all.length;
    return { root, stats };
  }

  /** Binary decision tree of binary search (Levitin Fig. 11.5 style). */
  function buildSearchTree(n) {
    let slot = 0;
    function rec(l, r, depth) {
      if (l > r) return { leaf: true, gap: r, depth, slot: slot++ }; // key falls between A[r] and A[r+1]
      const m = Math.floor((l + r) / 2);
      const left = rec(l, m - 1, depth + 1);
      const node = { m, l, r, depth, slot: slot++ };
      node.left = left;
      node.right = rec(m + 1, r, depth + 1);
      return node;
    }
    const root = rec(0, n - 1, 0);
    let height = 0;
    (function walk(t) { if (t.leaf) { height = Math.max(height, t.depth); return; } walk(t.left); walk(t.right); })(root);
    return { root, height, slots: slot };
  }

  /* ---------------- bounds ---------------- */
  function factBig(n) { let f = 1n; for (let k = 2n; k <= BigInt(n); k++) f *= k; return f; }
  function ceilLog2Big(N) { return N <= 1n ? 0 : (N - 1n).toString(2).length; }
  const ceilLog2FactCache = {};
  function ceilLog2Fact(n) { if (ceilLog2FactCache[n] == null) ceilLog2FactCache[n] = ceilLog2Big(factBig(n)); return ceilLog2FactCache[n]; }
  function mergeWorst(n) { if (n <= 1) return 0; const k = Math.ceil(Math.log2(n) - 1e-12); return n * k - Math.pow(2, k) + 1; }
  const OPTIMAL = [0, 0, 1, 3, 5, 7, 10, 13, 16, 19, 22, 26, 30]; // minimal worst-case comparisons, n = 1..12 (index = n)
  const ceilLog = (b, x) => { let k = 0, p = 1; while (p < x) { p *= b; k++; } return k; };

  const Engine = { ALGOS, buildSortTree, buildSearchTree, ceilLog2Fact, mergeWorst, OPTIMAL, ceilLog, factBig };
  if (typeof module !== "undefined" && module.exports) module.exports = Engine;
  if (typeof window === "undefined") return;

  /* =====================================================================
     UI
     ===================================================================== */
  const F = window.Forge;
  const $ = (id) => document.getElementById(id);
  F.page({ title: "Decision Trees & Lower Bounds", chapter: "Ch 11 · Limitations of Algorithm Power" });

  const SEARCH_LINES = [
    "ALGORITHM BinarySearch(A[0..n-1], K)",
    "    l ← 0;  r ← n - 1",
    "    while l ≤ r do",
    "        m ← ⌊(l + r) / 2⌋",
    "        if K = A[m] then return m",
    "        else if K < A[m] then r ← m - 1",
    "        else l ← m + 1",
    "    return -1",
  ];
  const BASE = [3, 14, 27, 31, 39, 42, 55, 70, 74, 81, 85, 93, 98, 101, 110];
  let code = null, ctr = null;
  const say = F.narrate($("say"));
  const stage = $("stage");
  let current = null; // {kind, tree, ...}

  /* ---- predict ---- */
  const predictBox = $("predict");
  let askKey = null;
  function showAsk(ask, k) {
    if (!ask) { if (askKey !== null) { predictBox.innerHTML = '<span class="muted small">A prediction prompt appears on the first step.</span>'; askKey = null; } return; }
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

  function setCode(lines, counters) {
    $("code").innerHTML = ""; code = F.code($("code"), lines);
    $("ctr").innerHTML = ""; ctr = F.counters($("ctr"), counters);
  }

  /* ---------------- sorting mode ---------------- */
  const orderStr = (ord, n) => ord.map((e) => LET[e]).join(n <= 3 ? "<" : "");
  function sortFrames(algoKey, n, vals) {
    const { root, stats } = buildSortTree(algoKey, n);
    const lb = ceilLog2Fact(n);
    // longest path (first found)
    const longest = [];
    (function find(t, path) {
      if (!t) return false;
      if (t.leaf) { if (t.depth === stats.height && !longest.length) longest.push(...path, t); return; }
      find(t.yes, path.concat([t])); find(t.no, path.concat([t]));
    })(root, []);
    const frames = [];
    const base = { height: stats.height, leaves: stats.leaves, lb, avg: stats.avg, longest };
    const valStr = vals.map((v, k) => `${LET[k]} = ${v}`).join(", ");
    const push = (line, text, extra) => frames.push(Object.assign({ line, text, trail: trail.slice() }, base, extra || {}));
    let trail = [];
    const opts = uniq([lb - 1, lb, stats.height, stats.height + 1, n * (n - 1) / 2]).filter((x) => x > 0).sort((a, b) => a - b);
    push(0, `${ALGOS[algoKey].name} on ${n} elements: ${stats.leaves} leaves (one per ordering, ${n}! = ${fact(n)}), height ${stats.height}. The dashed path is a longest one — the worst case. Any binary tree with ${fact(n)} leaves has height ≥ ⌈log₂ ${fact(n)}⌉ = ${lb}.${stats.redundant ? ` ${stats.redundant} node${stats.redundant > 1 ? "s are" : " is"} redundant (only one answer is possible there).` : ""}`,
      { cmp: 0, ask: { q: `Any comparison sort for n = ${n} needs how many comparisons in the worst case, at least?`, options: opts.map(String), answer: String(lb), explain: `n! = ${fact(n)} possible outcomes need ${fact(n)} leaves, and a binary tree of height h has at most 2^h leaves: 2^h ≥ ${fact(n)} ⇒ h ≥ ⌈log₂ ${fact(n)}⌉ = ${lb}.` } });
    let t = root, cmp = 0;
    const cur = vals;
    while (t && !t.leaf) {
      trail.push(t);
      const ans = cur[t.x] < cur[t.y];
      cmp++;
      push(t.line, `Array now [${t.state.map((e) => LET[e]).join(", ")}]. Compare ${LET[t.x]} < ${LET[t.y]}? With ${LET[t.x]} = ${cur[t.x]}, ${LET[t.y]} = ${cur[t.y]}: <b>${ans ? "yes" : "no"}</b> → go ${ans ? "left" : "right"}.${t.redundant ? " (Redundant: earlier answers already decided this one.)" : ""}`, { cmp, node: t, ans });
      t = ans ? t.yes : t.no;
    }
    trail.push(t);
    push(0, `Leaf reached: sorted order ${orderStr(t.order, 3)} after <b>${cmp}</b> comparison${cmp === 1 ? "" : "s"} (${valStr}). Worst case over all inputs = tree height = ${stats.height}; average over all ${fact(n)} orders = ${stats.avg.toFixed(2)}.`, { cmp, node: t, done: true });
    return { frames, root, stats };
  }
  function uniq(a) { return [...new Set(a)]; }
  function fact(n) { return factBig(n).toString(); }

  function layoutSort(root) {
    let slot = 0;
    (function lay(t) {
      if (!t) return;
      if (t.leaf) { t.sx = slot++; return; }
      lay(t.yes); lay(t.no);
      const xs = [t.yes, t.no].filter(Boolean).map((c) => c.sx);
      t.sx = xs.reduce((a, b) => a + b, 0) / xs.length;
    })(root);
    return slot;
  }

  function drawSort(f, n, root) {
    const slots = layoutSort(root);
    const leafW = n <= 3 ? 104 : 46;
    const W = Math.max(640, slots * leafW + 40), levelH = n <= 3 ? 82 : 62;
    const H = 34 + f.height * levelH + 30;
    stage.setAttribute("viewBox", `0 0 ${W} ${H}`);
    stage.innerHTML = "";
    const S = F.svg;
    const X = (t) => 20 + (t.sx + 0.5) * ((W - 40) / slots), Y = (t) => 34 + t.depth * levelH;
    const onTrail = new Set(f.trail), onLong = new Set(f.longest || []);
    const fs = n <= 3 ? 13 : 11;
    (function edges(t) {
      if (!t || t.leaf) return;
      [["yes", t.yes], ["no", t.no]].forEach(([lab, c]) => {
        if (!c) return;
        const hot = onTrail.has(t) && onTrail.has(c);
        const lng = onLong.has(t) && onLong.has(c);
        stage.appendChild(S("line", { x1: X(t), y1: Y(t) + 12, x2: X(c), y2: Y(c) - 12, stroke: hot ? "var(--ember)" : lng ? "var(--c-pivot)" : "var(--line-2)", "stroke-width": hot ? 4 : lng ? 2.5 : 1.5, "stroke-dasharray": lng && !hot ? "6 4" : "" }));
        const mx = (X(t) + X(c)) / 2 + (lab === "yes" ? -8 : 8), my = (Y(t) + Y(c)) / 2;
        stage.appendChild(S("text", { x: mx, y: my, "text-anchor": lab === "yes" ? "end" : "start", "font-size": fs - 2, fill: "var(--muted)" }, lab));
        edges(c);
      });
    })(root);
    (function nodes(t) {
      if (!t) return;
      const x = X(t), y = Y(t);
      const isCur = f.node === t;
      if (t.leaf) {
        const lab = orderStr(t.order, n);
        const w = 8 + lab.length * (fs * 0.62);
        stage.appendChild(S("rect", { x: x - w / 2, y: y - 12, width: w, height: 24, rx: 5, fill: isCur ? "var(--c-done)" : "var(--panel)", stroke: onLong.has(t) ? "var(--c-pivot)" : "var(--c-done)", "stroke-width": 1.5 }));
        stage.appendChild(S("text", { x, y: y + 4, "text-anchor": "middle", "font-size": fs, "font-weight": 700, fill: isCur ? "#0d1117" : "var(--ink)" }, lab));
        return;
      }
      const lab = `${LET[t.x]}<${LET[t.y]}`;
      const w = 12 + lab.length * (fs * 0.62);
      stage.appendChild(S("rect", { x: x - w / 2, y: y - 12, width: w, height: 24, rx: 12, fill: isCur ? "var(--c-compare)" : onTrail.has(t) ? "var(--ember-soft)" : "var(--panel-2)", stroke: t.redundant ? "var(--muted)" : onTrail.has(t) ? "var(--ember)" : "var(--line-2)", "stroke-width": 1.5, "stroke-dasharray": t.redundant ? "3 3" : "" }));
      stage.appendChild(S("text", { x, y: y + 4, "text-anchor": "middle", "font-size": fs, "font-weight": 700, fill: isCur ? "#0d1117" : "var(--ink)" }, lab));
      nodes(t.yes); nodes(t.no);
    })(root);
  }

  /* ---------------- search mode ---------------- */
  function searchFrames(n, A, K) {
    const { root, height, slots } = buildSearchTree(n);
    const frames = [];
    const trail = [];
    const lb2 = ceilLog(2, n + 1), lb3 = ceilLog(3, 2 * n + 1);
    const base = { height, slots, lb2, lb3 };
    const push = (line, text, extra) => frames.push(Object.assign({ line, text, trail: trail.slice() }, base, extra || {}));
    const opts = uniq([lb2 - 1, lb2, lb2 + 1, n > 3 ? Math.ceil(n / 2) : lb2 + 2]).filter((x) => x > 0).sort((a, b) => a - b);
    push(1, `Binary search on n = ${n} sorted keys as a binary decision tree: ${n} internal nodes (three-way comparisons, which also end successful searches) and ${n + 1} leaves (the gaps where an unsuccessful search ends). Height = ${height}.`,
      { cmp: 0, ask: { q: `Worst-case number of three-way comparisons for n = ${n}?`, options: opts.map(String), answer: String(lb2), explain: `A binary tree with n + 1 = ${n + 1} leaves has height ≥ ⌈log₂(n + 1)⌉ = ${lb2}, and binary search meets that bound exactly.` } });
    let t = root, cmp = 0;
    while (!t.leaf) {
      trail.push(t);
      cmp++;
      const v = A[t.m];
      if (K === v) { push(4, `l = ${t.l}, r = ${t.r}, m = ${t.m}. Compare K = ${K} with A[${t.m}] = ${v}: <b>equal</b> — found at index ${t.m} after ${cmp} comparison${cmp > 1 ? "s" : ""}. Successful searches stop at internal nodes.`, { cmp, node: t, done: true, found: true }); return { frames, root }; }
      const lt = K < v;
      push(lt ? 5 : 6, `l = ${t.l}, r = ${t.r}, m = ⌊(${t.l} + ${t.r})/2⌋ = ${t.m}. Compare K = ${K} with A[${t.m}] = ${v}: K ${lt ? "<" : ">"} A[m] → go ${lt ? "left" : "right"} (${lt ? `r ← ${t.m - 1}` : `l ← ${t.m + 1}`}).`, { cmp, node: t });
      t = lt ? t.left : t.right;
    }
    trail.push(t);
    const g = t.gap;
    push(7, `l > r: the search fails after ${cmp} comparisons. K = ${K} would sit ${g < 0 ? `before A[0] = ${A[0]}` : g >= n - 1 ? `after A[${n - 1}] = ${A[n - 1]}` : `between A[${g}] = ${A[g]} and A[${g + 1}] = ${A[g + 1]}`}. Worst case = height = ${height} = ⌈log₂(${n} + 1)⌉.`, { cmp, node: t, done: true });
    return { frames, root };
  }
  function drawSearch(f, n, A, root) {
    const slots = f.slots;
    const W = Math.max(640, slots * 34 + 40), levelH = 64;
    const H = 30 + f.height * levelH + 26;
    stage.setAttribute("viewBox", `0 0 ${W} ${H}`);
    stage.innerHTML = "";
    const S = F.svg;
    const X = (t) => 20 + (t.slot + 0.5) * ((W - 40) / slots), Y = (t) => 30 + t.depth * levelH;
    const onTrail = new Set(f.trail);
    (function edges(t) {
      if (t.leaf) return;
      [["<", t.left], [">", t.right]].forEach(([lab, c]) => {
        const hot = onTrail.has(t) && onTrail.has(c);
        stage.appendChild(S("line", { x1: X(t), y1: Y(t) + 14, x2: X(c), y2: Y(c) - 12, stroke: hot ? "var(--ember)" : "var(--line-2)", "stroke-width": hot ? 4 : 1.5 }));
        stage.appendChild(S("text", { x: (X(t) + X(c)) / 2 + (lab === "<" ? -7 : 7), y: (Y(t) + Y(c)) / 2, "text-anchor": lab === "<" ? "end" : "start", "font-size": 11, fill: "var(--muted)" }, lab));
        edges(c);
      });
    })(root);
    (function nodes(t) {
      const x = X(t), y = Y(t), isCur = f.node === t;
      if (t.leaf) {
        stage.appendChild(S("rect", { x: x - 11, y: y - 11, width: 22, height: 22, rx: 4, fill: isCur ? "var(--c-swap)" : "var(--panel)", stroke: "var(--line-2)", "stroke-width": 1.2 }));
        stage.appendChild(S("text", { x, y: y + 4, "text-anchor": "middle", "font-size": 10, fill: isCur ? "#0d1117" : "var(--muted)" }, "□"));
        return;
      }
      stage.appendChild(S("circle", { cx: x, cy: y, r: 15, fill: isCur ? (f.found ? "var(--c-done)" : "var(--c-compare)") : onTrail.has(t) ? "var(--ember-soft)" : "var(--panel-2)", stroke: onTrail.has(t) ? "var(--ember)" : "var(--steel)", "stroke-width": 1.5 }));
      stage.appendChild(S("text", { x, y: y + 4, "text-anchor": "middle", "font-size": 11, "font-weight": 700, fill: isCur ? "#0d1117" : "var(--ink)" }, String(A[t.m])));
      stage.appendChild(S("text", { x, y: y - 19, "text-anchor": "middle", "font-size": 9.5, fill: "var(--muted)" }, `[${t.m}]`));
      nodes(t.left); nodes(t.right);
    })(root);
  }

  /* ---------------- mode switching ---------------- */
  function render(f, i) {
    if (current.kind === "sort") drawSort(f, current.n, current.root);
    else drawSearch(f, current.n, current.A, current.root);
    code.highlight(f.line);
    if (current.kind === "sort") ctr.set({ "this input": f.cmp, height: f.height, leaves: f.leaves, "⌈log₂ n!⌉": f.lb, average: f.avg.toFixed(2) });
    else ctr.set({ "this key": f.cmp, height: f.height, "⌈log₂(n+1)⌉": f.lb2, "⌈log₃(2n+1)⌉": f.lb3 });
    say.say(f.text);
    showAsk(f.ask, i);
  }
  const player = F.player($("player"), { frames: [], render, fps: 1.5 });

  function load() {
    $("err").textContent = "";
    const mode = $("mode").value;
    const isSort = mode !== "search";
    $("sortOpts").style.display = isSort ? "" : "none";
    $("searchOpts").style.display = isSort ? "none" : "";
    if (isSort) {
      const n = +$("sn").value;
      let vals = $("vals").value.split(/[\s,]+/).filter(Boolean).map(Number);
      if (vals.length !== n || vals.some(isNaN) || new Set(vals).size !== n) {
        $("err").textContent = `⚠ Enter ${n} distinct numbers for ${LET.slice(0, n).split("").join(", ")}.`;
        return;
      }
      setCode(ALGOS[mode].lines, { "this input": 0, height: 0, leaves: 0, "⌈log₂ n!⌉": 0, average: 0 });
      const res = sortFrames(mode, n, vals);
      current = { kind: "sort", n, root: res.root };
      $("stageNote").textContent = n <= 3 ? "Leaves show the sorted order, e.g. a<c<b." : "Leaves show the sorted order: acbd means a < c < b < d.";
      askKey = "x";
      player.load(res.frames);
    } else {
      const n = +$("bn").value;
      $("bnv").textContent = n;
      const A = BASE.slice(0, n);
      const K = Number($("key").value);
      if (isNaN(K)) { $("err").textContent = "⚠ The search key must be a number."; return; }
      $("arr").textContent = `A = [${A.join(", ")}]`;
      setCode(SEARCH_LINES, { "this key": 0, height: 0, "⌈log₂(n+1)⌉": 0, "⌈log₃(2n+1)⌉": 0 });
      const res = searchFrames(n, A, K);
      current = { kind: "search", n, A, root: res.root };
      $("stageNote").textContent = "Circles = A[m] compared with K (index above); small squares = the n + 1 places an unsuccessful search can end.";
      askKey = "x";
      player.load(res.frames);
    }
  }
  $("mode").onchange = load;
  $("sn").onchange = () => { const n = +$("sn").value; $("vals").value = n === 3 ? "5 9 2" : "7 3 9 1"; load(); };
  $("vals").addEventListener("keydown", (e) => { if (e.key === "Enter") load(); });
  $("go").onclick = load;
  $("rand").onclick = () => {
    if ($("mode").value === "search") { const n = +$("bn").value; const A = BASE.slice(0, n); $("key").value = Math.random() < 0.6 ? A[Math.floor(Math.random() * n)] : A[0] + Math.floor(Math.random() * (A[n - 1] - A[0] + 10)); }
    else { const n = +$("sn").value; const v = []; while (v.length < n) { const x = 1 + Math.floor(Math.random() * 99); if (!v.includes(x)) v.push(x); } $("vals").value = v.join(" "); }
    load();
  };
  $("bn").oninput = () => { $("bnv").textContent = $("bn").value; };
  $("bn").onchange = load;
  $("key").addEventListener("keydown", (e) => { if (e.key === "Enter") load(); });

  /* =====================================================================
     Lower-bound calculator + chart
     ===================================================================== */
  function calc() {
    const n = Math.max(1, Math.min(2000, Math.round(+$("cn").value) || 1));
    const f = factBig(n);
    const fs = f.toString();
    const lb = ceilLog2Fact(n);
    const nl = n * Math.log2(n);
    const rows = [
      ["n!", fs.length > 24 ? `${fs.slice(0, 6)}… (${fs.length} digits)` : fs, "possible orderings = leaves the tree needs"],
      ["⌈log₂ n!⌉", lb, "lower bound on worst-case comparisons (any comparison sort)"],
      ["n log₂ n", nl.toFixed(1), "Stirling: log₂ n! ≈ n log₂ n − 1.44 n"],
      ["merge sort, worst", mergeWorst(n), "n⌈log₂ n⌉ − 2^⌈log₂ n⌉ + 1 ≈ n log₂ n − n: same growth as the bound"],
      ["insertion sort, worst", (n * (n - 1)) / 2, "n(n − 1)/2 — far above the bound for large n"],
    ];
    if (n <= 12) rows.push(["best possible (known)", OPTIMAL[n], n === 12 ? "30 > 29: the bound is not always achievable" : "proved optimal; equals ⌈log₂ n!⌉ for n ≤ 11"]);
    const host = $("calcOut"); host.innerHTML = "";
    host.appendChild(F.el("table", { class: "t" }, rows.map(([k, v, note]) => F.el("tr", null, F.el("th", { style: { textAlign: "left" } }, k), F.el("td", { style: { fontWeight: 700 } }, String(v)), F.el("td", { style: { textAlign: "left", color: "var(--muted)", fontFamily: "var(--font)" } }, note)))));
  }
  $("cn").addEventListener("input", calc);

  const SERIES = [
    { key: "lb", name: "⌈log₂ n!⌉ (lower bound)", color: "var(--steel)", f: (n) => ceilLog2Fact(n) },
    { key: "nl", name: "n log₂ n", color: "var(--ember)", f: (n) => n * Math.log2(n), dash: "6 4" },
    { key: "ms", name: "merge sort worst", color: "var(--c-done)", f: (n) => mergeWorst(n) },
    { key: "is", name: "insertion sort worst", color: "var(--c-pivot)", f: (n) => (n * (n - 1)) / 2, opt: true },
  ];
  function chart() {
    const svg = $("chart");
    const N = +$("cN").value; $("cNv").textContent = N;
    const showIns = $("cIns").checked;
    const ser = SERIES.filter((s) => !s.opt || showIns);
    const W = 640, H = 300, ml = 48, mr = 118, mt = 14, mb = 34;
    const pw = W - ml - mr, ph = H - mt - mb;
    const ymax = Math.max(...ser.map((s) => s.f(N)));
    const step = niceStep(ymax / 5);
    const top = Math.ceil(ymax / step) * step;
    const sx = (n) => ml + ((n - 1) / (N - 1)) * pw, sy = (v) => mt + ph - (v / top) * ph;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = "";
    const S = F.svg;
    for (let v = 0; v <= top + 1e-9; v += step) {
      svg.appendChild(S("line", { x1: ml, x2: ml + pw, y1: sy(v), y2: sy(v), stroke: "var(--line)", "stroke-width": 1 }));
      svg.appendChild(S("text", { x: ml - 6, y: sy(v) + 4, "text-anchor": "end", "font-size": 11, fill: "var(--muted)" }, fmt(v)));
    }
    const xstep = niceStep((N - 1) / 6);
    for (let n = 1; n <= N; n += n === 1 && xstep > 1 ? xstep - 1 : xstep) svg.appendChild(S("text", { x: sx(n), y: mt + ph + 16, "text-anchor": "middle", "font-size": 11, fill: "var(--muted)" }, String(n)));
    svg.appendChild(S("text", { x: ml + pw / 2, y: H - 4, "text-anchor": "middle", "font-size": 11, fill: "var(--ink-2)" }, "n (number of elements)"));
    svg.appendChild(S("text", { x: ml, y: mt - 2, "font-size": 11, fill: "var(--ink-2)" }, "comparisons"));
    const labelsY = [];
    ser.forEach((s) => {
      let d = "";
      for (let n = 1; n <= N; n++) d += (n === 1 ? "M" : "L") + sx(n).toFixed(1) + " " + sy(s.f(n)).toFixed(1);
      svg.appendChild(S("path", { d, stroke: s.color, "stroke-width": 2, fill: "none", "stroke-dasharray": s.dash || "", "stroke-linejoin": "round" }));
      let ly = sy(s.f(N));
      labelsY.forEach((o) => { if (Math.abs(o - ly) < 13) ly = o + (ly >= o ? 13 : -13); });
      labelsY.push(ly);
      svg.appendChild(S("circle", { cx: sx(N), cy: sy(s.f(N)), r: 3, fill: s.color }));
      svg.appendChild(S("text", { x: sx(N) + 7, y: ly + 4, "font-size": 11, fill: "var(--ink-2)" }, s.name.replace(" (lower bound)", "")));
    });
    // hover layer
    const cross = S("line", { y1: mt, y2: mt + ph, stroke: "var(--muted)", "stroke-width": 1, "stroke-dasharray": "3 3", visibility: "hidden" });
    svg.appendChild(cross);
    const dots = ser.map((s) => { const c = S("circle", { r: 4.5, fill: s.color, stroke: "var(--bg-2)", "stroke-width": 2, visibility: "hidden" }); svg.appendChild(c); return c; });
    const hit = S("rect", { x: ml, y: mt, width: pw, height: ph, fill: "transparent" });
    svg.appendChild(hit);
    const tip = $("tip");
    const move = (e) => {
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      const n = Math.max(1, Math.min(N, Math.round(1 + ((p.x - ml) / pw) * (N - 1))));
      cross.setAttribute("x1", sx(n)); cross.setAttribute("x2", sx(n)); cross.setAttribute("visibility", "visible");
      ser.forEach((s, k) => { dots[k].setAttribute("cx", sx(n)); dots[k].setAttribute("cy", sy(s.f(n))); dots[k].setAttribute("visibility", "visible"); });
      tip.hidden = false;
      tip.innerHTML = `<b>n = ${n}</b>` + ser.map((s) => `<div><i style="background:${s.color}"></i>${s.name}: <b>${fmt(s.f(n))}</b></div>`).join("");
      const box = svg.getBoundingClientRect(), wrap = svg.parentElement.getBoundingClientRect();
      const px = box.left - wrap.left + (sx(n) / W) * box.width;
      tip.style.left = Math.min(Math.max(4, px + 12), wrap.width - tip.offsetWidth - 4) + "px";
      tip.style.top = "8px";
    };
    hit.addEventListener("pointermove", move);
    hit.addEventListener("pointerdown", move);
    hit.addEventListener("pointerleave", () => { tip.hidden = true; cross.setAttribute("visibility", "hidden"); dots.forEach((d) => d.setAttribute("visibility", "hidden")); });
    $("chartLegend").innerHTML = ser.map((s) => `<span><i style="background:${s.color}"></i>${s.name}</span>`).join("");
    // data table view
    const tb = $("chartTable"); tb.innerHTML = "";
    const pts = [...new Set([1, 2, 3, 4, 5, 8, 10, 12, 16, 20, 32, 50, 64, 100, 128, 200, N])].filter((n) => n <= N).sort((a, b) => a - b);
    tb.appendChild(F.el("table", { class: "t" }, F.el("tr", null, F.el("th", null, "n"), ser.map((s) => F.el("th", null, s.name))), pts.map((n) => F.el("tr", null, F.el("td", null, n), ser.map((s) => F.el("td", null, fmt(s.f(n))))))));
  }
  function niceStep(x) { const p = Math.pow(10, Math.floor(Math.log10(Math.max(x, 1e-9)))); const m = x / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; }
  function fmt(v) { return Math.abs(v - Math.round(v)) < 1e-9 ? Math.round(v).toLocaleString("en-US") : v.toFixed(1); }
  $("cN").addEventListener("input", chart);
  $("cIns").addEventListener("change", chart);

  /* =====================================================================
     Adversary game: guess a number in 1..n with "Is it ≤ k?" questions
     ===================================================================== */
  const game = { n: 16, lo: 1, hi: 16, q: 0, secret: null, log: [] };
  function newGame() {
    game.n = +$("gn").value; game.lo = 1; game.hi = game.n; game.q = 0; game.log = [];
    game.secret = $("gmode").value === "fair" ? 1 + Math.floor(Math.random() * game.n) : null;
    $("gk").max = game.n; setK(Math.ceil(game.n / 2));
    drawGame();
  }
  function setK(v) { $("gk").value = v; $("gkv").textContent = v; }
  function ask(k) {
    if (game.lo === game.hi) return;
    k = Math.max(0, Math.min(game.n, Math.round(k)));
    const yesSize = Math.max(0, Math.min(k, game.hi) - game.lo + 1), noSize = Math.max(0, game.hi - Math.max(k + 1, game.lo) + 1);
    let yes;
    if (game.secret != null) yes = game.secret <= k;
    else yes = yesSize >= noSize && yesSize > 0 ? (yesSize > noSize ? true : Math.random() < 0.5) : false;
    if (yesSize === 0) yes = false;
    if (noSize === 0) yes = true;
    game.q++;
    const before = game.hi - game.lo + 1;
    if (yes) game.hi = Math.min(game.hi, k); else game.lo = Math.max(game.lo, k + 1);
    const after = game.hi - game.lo + 1;
    game.log.push(`Q${game.q}: Is it ≤ ${k}? → <b>${yes ? "yes" : "no"}</b>. ${before} → ${after} candidate${after > 1 ? "s" : ""}${game.secret == null ? (yesSize === 0 || noSize === 0 ? " (a wasted question: the answer was forced)" : yesSize === noSize ? " (even split — the adversary can't do better than half)" : ` (the adversary kept the bigger side: ${Math.max(yesSize, noSize)} vs ${Math.min(yesSize, noSize)})`) : ""}.`);
    setK(Math.floor((game.lo + game.hi) / 2));
    drawGame();
  }
  function drawGame() {
    const svg = $("gsvg");
    const n = game.n, W = 640, H = 70, pad = 16;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.innerHTML = "";
    const S = F.svg;
    const cw = (W - 2 * pad) / n;
    if (n <= 100) {
      for (let v = 1; v <= n; v++) {
        const alive = v >= game.lo && v <= game.hi;
        svg.appendChild(S("rect", { x: pad + (v - 1) * cw + 0.5, y: 12, width: Math.max(1, cw - 1), height: 30, rx: Math.min(4, cw / 3), fill: alive ? (game.lo === game.hi ? "var(--c-done)" : "var(--c-active)") : "var(--c-dim)" }));
        if (cw >= 18) svg.appendChild(S("text", { x: pad + (v - 0.5) * cw, y: 32, "text-anchor": "middle", "font-size": 11, "font-weight": 700, fill: alive ? "#0d1117" : "var(--muted)" }, String(v)));
      }
    } else {
      svg.appendChild(S("rect", { x: pad, y: 12, width: W - 2 * pad, height: 30, rx: 4, fill: "var(--c-dim)" }));
      svg.appendChild(S("rect", { x: pad + (game.lo - 1) * cw, y: 12, width: Math.max(2, (game.hi - game.lo + 1) * cw), height: 30, rx: 2, fill: game.lo === game.hi ? "var(--c-done)" : "var(--c-active)" }));
    }
    svg.appendChild(S("text", { x: pad, y: 60, "font-size": 11, fill: "var(--muted)" }, "1"));
    svg.appendChild(S("text", { x: W - pad, y: 60, "text-anchor": "end", "font-size": 11, fill: "var(--muted)" }, String(n)));
    svg.appendChild(S("text", { x: W / 2, y: 60, "text-anchor": "middle", "font-size": 12, fill: "var(--ink-2)" }, `candidates left: ${game.hi - game.lo + 1}  (${game.lo}…${game.hi})`));
    const lb = ceilLog(2, n);
    $("gq").textContent = game.q; $("glb").textContent = lb;
    $("glog").innerHTML = game.log.slice(-8).map((s) => `<div>${s}</div>`).join("");
    const st = $("gstatus");
    if (game.lo === game.hi) {
      st.className = "callout " + (game.q <= lb ? "ok" : "");
      st.innerHTML = `Pinned down: <b>${game.lo}</b> after ${game.q} question${game.q > 1 ? "s" : ""} (lower bound ⌈log₂ ${n}⌉ = ${lb}). ${game.secret == null ? `The adversary never fixed a number — yet ${game.lo} is consistent with every answer, so it could have been the secret all along. Against this adversary, <b>no strategy</b> beats ${lb} questions.` : "Fair mode: a lucky guess can beat the bound on some inputs, but not in the worst case."}`;
    } else {
      st.className = "callout steel";
      st.innerHTML = `Ask “Is it ≤ k?” — click a cell or use the slider. ${game.secret == null ? "The adversary answers so that the <b>larger</b> half survives." : "Fair mode: a secret number was picked at random."}`;
    }
  }
  $("gnew").onclick = newGame;
  $("gn").onchange = newGame;
  $("gmode").onchange = newGame;
  $("gask").onclick = () => ask(+$("gk").value);
  $("gk").addEventListener("input", () => ($("gkv").textContent = $("gk").value));
  $("gauto").onclick = () => {
    const step = () => { if (game.lo < game.hi) { ask(Math.floor((game.lo + game.hi) / 2)); setTimeout(step, 450); } };
    step();
  };
  $("gsvg").addEventListener("click", (e) => {
    const svg = $("gsvg"); const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    const v = Math.ceil(((p.x - 16) / (640 - 32)) * game.n);
    if (v >= 1 && v <= game.n) ask(v);
  });

  load(); calc(); chart(); newGame();
  $("gkv").textContent = $("gk").value;
})();
