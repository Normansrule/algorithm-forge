/* =====================================================================
   Algorithm Forge — Sorting Studio (docs/sims/sorting-studio.html)
   ---------------------------------------------------------------------
   Part 1 (pure, testable in Node): ten recorders. Each runs one sorting
   algorithm on a copy of the input and pushes a frame at every key
   comparison / move, with the pseudocode line, a narration sentence and
   the counters the textbook analyzes.
   Part 2 (browser only): drawing, the single-algorithm view, Race mode
   and the Predict panel.
   ===================================================================== */
(function () {
  "use strict";

  /* ================= Part 1: recorders ================= */

  /** Pseudocode spec: "@key|text" lines get a name so recorders can say push("cmp", ...). */
  function parseSpec(spec) {
    const L = {}, lines = [];
    spec.forEach((s) => {
      const m = /^@(\w+)\|(.*)$/.exec(s);
      if (m) { L[m[1]] = lines.length; lines.push(m[2]); } else lines.push(s);
    });
    return { L, lines };
  }
  function hash(s) { let h = 2166136261; for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 16777619); } return h >>> 0; }
  /** A multiple-choice "Predict" question: the correct answer plus up to 3 distractors from pool. */
  function mkAsk(q, correct, pool, why) {
    const c = String(correct);
    const uniq = [...new Set(pool.map(String))].filter((x) => x !== c);
    if (!uniq.length) return null; // nothing to choose between
    uniq.sort((a, b) => hash(a + q) - hash(b + q));
    const opts = [c, ...uniq.slice(0, 3)];
    if (opts.every((x) => /^-?\d+$/.test(x))) opts.sort((a, b) => a - b);
    else opts.sort((a, b) => hash(a + "|" + q) - hash(b + "|" + q));
    return { q, opts, ans: opts.indexOf(c), why };
  }
  const range = (a, b) => { const r = []; for (let k = a; k <= b; k++) r.push(k); return r; };
  const log2 = (x) => Math.log(x) / Math.LN2;

  function Rec(input, L) {
    const R = { A: input.slice(), frames: [], cmp: 0, mv: 0, mem: 0, memPeak: 0, depth: 0, depthMax: 0, done: new Set() };
    const one = (k) => {
      if (k == null || typeof k === "number") return k;
      if (!(k in L)) throw new Error("unknown pseudocode line key: " + k);
      return L[k];
    };
    R.alloc = (k) => { R.mem += k; R.memPeak = Math.max(R.memPeak, R.mem); };
    R.free = (k) => { R.mem -= k; };
    R.enter = () => { R.depth++; R.depthMax = Math.max(R.depthMax, R.depth); };
    R.leave = () => { R.depth--; };
    R.push = (line, text, o) => {
      o = o || {};
      R.frames.push({
        A: R.A.slice(), line: Array.isArray(line) ? line.map(one) : one(line), text,
        cmp: R.cmp, mv: R.mv, mem: R.memPeak, depth: R.depthMax,
        st: o.st || {}, ptr: o.ptr || [], done: [...R.done], vis: o.vis || null,
        out: o.out || null, range: o.range || null, ask: o.ask || null,
      });
      return R.frames.length - 1;
    };
    return R;
  }

  const ALGOS = {};

  /* ---------- 1. Selection sort (Levitin §3.1) ---------- */
  ALGOS.selection = {
    name: "Selection sort", group: "Ch 3 · Brute Force", view: "bars", mv: "swaps",
    stable: [false, "a long swap can jump an element over an equal one"], inPlace: [true, "Θ(1) extra"],
    time: "Θ(n²) comparisons on every input", lesson: "03-brute-force", arena: ["selection-sort"],
    book: [89, 45, 68, 90, 29, 34, 17],
    legend: [["compare", "A[j] being compared"], ["active", "current minimum"], ["swap", "swapped"], ["done", "in final position"]],
    spec: [
      "@start|ALGORITHM SelectionSort(A[0..n-1])",
      "    // Select the smallest remaining element, again and again",
      "    for i ← 0 to n − 2 do",
      "@min|        min ← i",
      "        for j ← i + 1 to n − 1 do",
      "@cmp|            if A[j] < A[min] then min ← j",
      "@swap|        swap A[i] and A[min]",
      "@ret|    return A",
    ],
    record(R) {
      const A = R.A, n = A.length;
      R.push("start", `Start with n = ${n}. Pass i finds the smallest element of A[i..n−1] and swaps it into position i.`);
      for (let i = 0; i < n - 1; i++) {
        let min = i;
        const rest = A.slice(i), mn = Math.min(...rest);
        R.push("min", `Pass ${i + 1}: position ${i} is next to fill. Assume A[${i}] = ${A[i]} is the smallest of A[${i}..${n - 1}] until something smaller shows up.`,
          { st: { [i]: "active" }, ptr: [{ i, label: "i" }],
            ask: mkAsk(`Pass ${i + 1}: which value will end up in position ${i}?`, mn, rest, `The pass selects the smallest value of A[${i}..${n - 1}], which is ${mn}.`) });
        for (let j = i + 1; j < n; j++) {
          R.cmp++;
          const smaller = A[j] < A[min];
          R.push("cmp", `Compare A[${j}] = ${A[j]} with the current minimum A[${min}] = ${A[min]}: ${smaller ? `smaller, so the minimum is now at index ${j}.` : `not smaller, the minimum stays at index ${min}.`}`,
            { st: { [min]: "active", [j]: "compare" }, ptr: [{ i, label: "i" }, { i: j, label: "j" }] });
          if (smaller) min = j;
        }
        const same = min === i;
        [A[i], A[min]] = [A[min], A[i]];
        R.mv++;
        R.done.add(i);
        R.push("swap", same ? `A[${i}] = ${A[i]} was already the minimum. The pseudocode still swaps it with itself (a harmless no-op), and position ${i} is final.`
          : `Swap A[${i}] and A[${min}]: ${A[i]} moves into its final place, position ${i}.`,
          { st: { [i]: "swap", [min]: "swap" }, ptr: [{ i, label: "i" }] });
      }
      R.done.add(n - 1);
      R.push("ret", `Sorted! ${R.cmp} comparisons = n(n−1)/2 = ${n * (n - 1) / 2} for n = ${n}, and ${R.mv} swaps = n − 1. Selection sort makes the same number of comparisons on every input, but very few swaps.`);
    },
  };

  /* ---------- 2. Bubble sort with early exit (Levitin §3.1) ---------- */
  ALGOS.bubble = {
    name: "Bubble sort (early exit)", group: "Ch 3 · Brute Force", view: "bars", mv: "swaps",
    stable: [true, "only strictly out-of-order neighbours swap"], inPlace: [true, "Θ(1) extra"],
    time: "Θ(n²) worst, n − 1 comparisons on sorted input", lesson: "03-brute-force", arena: ["bubble-sort-early-exit"],
    book: [89, 45, 68, 90, 29, 34, 17],
    legend: [["compare", "neighbours compared"], ["swap", "swapped"], ["done", "in final position"]],
    spec: [
      "@start|ALGORITHM BubbleSortEarlyExit(A[0..n-1])",
      "    // Stops as soon as a whole pass makes no swaps",
      "    for i ← 0 to n − 2 do",
      "@flag|        swapped ← false",
      "        for j ← 0 to n − 2 − i do",
      "@cmp|            if A[j + 1] < A[j] then",
      "@swap|                swap A[j] and A[j + 1]",
      "@set|                swapped ← true",
      "@exit|        if not swapped then return A   // already sorted",
      "@ret|    return A",
    ],
    record(R) {
      const A = R.A, n = A.length;
      R.push("start", `Bubble sort compares neighbours and swaps them when they are out of order, so each pass carries the largest remaining value to the right end. n = ${n}.`);
      for (let i = 0; i < n - 1; i++) {
        const part = A.slice(0, n - i), mx = Math.max(...part);
        R.push("flag", `Pass ${i + 1}: scan A[0..${n - 1 - i}] and reset the swapped flag.`,
          { ask: mkAsk(`Pass ${i + 1}: which value will sit at position ${n - 1 - i} when this pass ends?`, mx, part, `A pass carries the largest value of A[0..${n - 1 - i}] (that is ${mx}) all the way to the right end.`) });
        let swapped = false;
        for (let j = 0; j <= n - 2 - i; j++) {
          R.cmp++;
          const out = A[j + 1] < A[j];
          R.push("cmp", `Compare neighbours A[${j}] = ${A[j]} and A[${j + 1}] = ${A[j + 1]}: ${out ? "out of order, so swap them." : "already in order, leave them."}`,
            { st: { [j]: "compare", [j + 1]: "compare" }, ptr: [{ i: j, label: "j" }] });
          if (out) {
            [A[j], A[j + 1]] = [A[j + 1], A[j]];
            R.mv++; swapped = true;
            R.push(["swap", "set"], `Swapped: ${A[j]} now comes before ${A[j + 1]}, and we note that this pass made a swap.`,
              { st: { [j]: "swap", [j + 1]: "swap" }, ptr: [{ i: j, label: "j" }] });
          }
        }
        R.done.add(n - 1 - i);
        if (!swapped) {
          for (let k = 0; k < n; k++) R.done.add(k);
          R.push("exit", `Pass ${i + 1} made no swaps, so every neighbour pair is in order and the array is sorted. Stop early after ${R.cmp} comparisons (without the early exit it would be ${n * (n - 1) / 2}).`);
          return;
        }
      }
      R.done.add(0);
      R.push("ret", `Sorted: ${R.cmp} comparisons and ${R.mv} swaps. Worst case (reversed input): n(n−1)/2 = ${n * (n - 1) / 2}. Already-sorted input stops after one pass with n − 1 = ${n - 1}.`);
    },
  };

  /* ---------- 3. Insertion sort (Levitin §4.1) ---------- */
  ALGOS.insertion = {
    name: "Insertion sort", group: "Ch 4 · Decrease-and-Conquer", view: "bars", mv: "moves (writes)",
    stable: [true, "stops at the first element ≤ v"], inPlace: [true, "Θ(1) extra"],
    time: "Θ(n²) worst, n − 1 comparisons on sorted input", lesson: "04-decrease-and-conquer", arena: ["insertion-sort"],
    book: [89, 45, 68, 90, 29, 34, 17],
    legend: [["active", "v, the element being inserted"], ["compare", "A[j] compared with v"], ["swap", "written"], ["dim", "the gap where v may go"], ["done", "sorted"]],
    spec: [
      "@start|ALGORITHM InsertionSort(A[0..n-1])",
      "    for i ← 1 to n − 1 do",
      "@take|        v ← A[i]",
      "@jinit|        j ← i − 1",
      "@while|        while j ≥ 0 and A[j] > v do",
      "@shift|            A[j + 1] ← A[j]",
      "@dec|            j ← j − 1",
      "@place|        A[j + 1] ← v",
      "@ret|    return A",
    ],
    record(R) {
      const A = R.A, n = A.length;
      R.push("start", `Insertion sort grows a sorted prefix. A[0..0] is sorted on its own; each step inserts the next element into the prefix.`);
      for (let i = 1; i < n; i++) {
        const v = A[i];
        let pos = i;
        while (pos > 0 && A[pos - 1] > v) pos--;
        R.push(["take", "jinit"], `Take v = A[${i}] = ${v}. The prefix A[0..${i - 1}] is sorted; find where v belongs in it.`,
          { st: { [i]: "active" }, ptr: [{ i, label: "i" }], vis: { v, hole: i },
            ask: mkAsk(`Where will v = ${v} be inserted?`, pos, range(0, i), pos === i ? `Nothing in the prefix is larger than ${v}, so it stays at index ${i}.` : `Every prefix element larger than ${v} shifts one place right, and v lands at index ${pos}.`) });
        let j = i - 1;
        for (;;) {
          if (j < 0) {
            R.push("while", `j = −1: we passed the left end, so v = ${v} is the smallest so far.`, { vis: { v, hole: 0 }, ptr: [{ i, label: "i" }] });
            break;
          }
          R.cmp++;
          if (A[j] > v) {
            R.push("while", `A[${j}] = ${A[j]} > v = ${v}: it has to move one place right.`, { st: { [j]: "compare" }, vis: { v, hole: j + 1 }, ptr: [{ i, label: "i" }, { i: j, label: "j" }] });
            A[j + 1] = A[j]; R.mv++;
            R.push(["shift", "dec"], `Copy A[${j}] into A[${j + 1}]; the gap moves left to index ${j}.`, { st: { [j + 1]: "swap" }, vis: { v, hole: j }, ptr: [{ i, label: "i" }, { i: j, label: "j" }] });
            j--;
          } else {
            R.push("while", `A[${j}] = ${A[j]} ≤ v = ${v}: stop, v goes right after it.`, { st: { [j]: "compare" }, vis: { v, hole: j + 1 }, ptr: [{ i, label: "i" }, { i: j, label: "j" }] });
            break;
          }
        }
        A[j + 1] = v; R.mv++;
        R.push("place", `Write v = ${v} into A[${j + 1}]. Now A[0..${i}] is sorted.`, { st: { [j + 1]: "swap" }, ptr: [{ i, label: "i" }] });
      }
      for (let k = 0; k < n; k++) R.done.add(k);
      R.push("ret", `Sorted: ${R.cmp} comparisons, ${R.mv} writes. Worst case (reversed): n(n−1)/2 = ${n * (n - 1) / 2}. Best case (sorted): n − 1 = ${n - 1}. Nearly sorted input is close to the best case.`);
    },
  };

  /* ---------- 4. Mergesort (Levitin §5.1) ---------- */
  ALGOS.merge = {
    name: "Mergesort", group: "Ch 5 · Divide-and-Conquer", view: "merge", mv: "moves (writes)", recursive: true,
    stable: [true, "ties take B's element first"], inPlace: [false, "Θ(n) extra for B and C"],
    time: "Θ(n log n) on every input", lesson: "05-divide-and-conquer", arena: ["merge-sort", "count-inversions"],
    book: [8, 3, 2, 9, 7, 1, 5, 4],
    legend: [["compare", "front elements compared"], ["swap", "written by merge"], ["dim", "already used"], ["done", "sorted run"]],
    spec: [
      "@start|ALGORITHM Mergesort(A[0..n-1])",
      "@if|    if n > 1 then",
      "@copyB|        copy A[0..⌊n/2⌋−1] to B[0..⌊n/2⌋−1]",
      "@copyC|        copy A[⌊n/2⌋..n−1] to C[0..⌈n/2⌉−1]",
      "@recB|        Mergesort(B[0..⌊n/2⌋−1])",
      "@recC|        Mergesort(C[0..⌈n/2⌉−1])",
      "@merge|        Merge(B, C, A)",
      "",
      "ALGORITHM Merge(B[0..p-1], C[0..q-1], A[0..p+q-1])",
      "@minit|    i ← 0; j ← 0; k ← 0",
      "@mwhile|    while i < p and j < q do",
      "@mif|        if B[i] ≤ C[j] then",
      "@mB|            A[k] ← B[i]; i ← i + 1",
      "@mC|        else A[k] ← C[j]; j ← j + 1",
      "@mk|        k ← k + 1",
      "@restC|    if i = p then copy C[j..q−1] to A[k..p+q−1]",
      "@restB|    else copy B[i..p−1] to A[k..p+q−1]",
    ],
    record(R) {
      const A = R.A, n = A.length, segs = new Map();
      const key = (lo, hi) => lo + "-" + hi;
      const add = (lo, hi, d) => { const s = { lo, hi, d, st: "split", vals: A.slice(lo, hi + 1), hl: {} }; segs.set(key(lo, hi), s); return s; };
      const snap = () => ({ segs: [...segs.values()].map((s) => ({ lo: s.lo, hi: s.hi, d: s.d, st: s.st, vals: s.vals.slice(), hl: Object.assign({}, s.hl) })) });
      const push = (line, text, o) => { o = o || {}; o.vis = snap(); return R.push(line, text, o); };
      add(0, n - 1, 0);
      push("start", `Mergesort splits the array in half, sorts each half recursively, then merges the two sorted halves. The rows under the bars show every level of splitting (going down) and merging (coming back up).`);
      function ms(lo, hi, d) {
        R.enter();
        const s = segs.get(key(lo, hi)), len = hi - lo + 1;
        if (len <= 1) {
          s.st = "sorted";
          push("if", `A[${lo}] = ${A[lo]} on its own: n = 1, so there is nothing to split. One element is already sorted.`, { range: [lo, hi] });
          R.leave(); return;
        }
        const mid = lo + Math.floor(len / 2);
        R.alloc(len);
        add(lo, mid - 1, d + 1); add(mid, hi, d + 1);
        s.st = "current";
        push(["if", "copyB", "copyC"], `Split A[${lo}..${hi}] (n = ${len}): copy the first ⌊n/2⌋ = ${mid - lo} elements to B and the other ${hi - mid + 1} to C. That takes ${len} extra cells (${R.mem} in use right now).`, { range: [lo, hi] });
        s.st = "split";
        push("recB", `Sort B = [${A.slice(lo, mid).join(", ")}] recursively.`, { range: [lo, mid - 1] });
        ms(lo, mid - 1, d + 1);
        push("recC", `Now sort C = [${A.slice(mid, hi + 1).join(", ")}] recursively.`, { range: [mid, hi] });
        ms(mid, hi, d + 1);
        merge(lo, mid, hi, s);
        R.free(len);
        R.leave();
      }
      function merge(lo, mid, hi, s) {
        const B = A.slice(lo, mid), C = A.slice(mid, hi + 1), p = B.length, q = C.length;
        const sb = segs.get(key(lo, mid - 1)), sc = segs.get(key(mid, hi));
        s.st = "merging"; s.vals = Array(hi - lo + 1).fill(null); s.hl = {};
        let i = 0, j = 0, k = lo;
        const rows = () => { sb.hl = {}; sc.hl = {}; for (let t = 0; t < i; t++) sb.hl[t] = "dim"; for (let t = 0; t < j; t++) sc.hl[t] = "dim"; };
        rows();
        const bFirst = B[p - 1] <= C[q - 1];
        push(["merge", "minit"], `Merge B = [${B.join(", ")}] and C = [${C.join(", ")}] back into A[${lo}..${hi}]. Pointers i and j start at the front of each.`,
          { range: [lo, hi], ask: p + q >= 4 ? mkAsk("Which half will run out first?", bFirst ? "B (left half)" : "C (right half)", ["B (left half)", "C (right half)"],
            `The half holding the largest value (${Math.max(B[p - 1], C[q - 1])}) is the one left over at the end, so ${bFirst ? "B" : "C"} empties first${B[p - 1] === C[q - 1] ? " (on a tie B wins every comparison, so B empties first)" : ""}.`) : null });
        while (i < p && j < q) {
          R.cmp++;
          const takeB = B[i] <= C[j], val = takeB ? B[i] : C[j];
          A[k] = val; R.mv++; s.vals[k - lo] = val;
          rows(); sb.hl[i] = takeB ? "swap" : "compare"; sc.hl[j] = takeB ? "compare" : "swap"; s.hl = { [k - lo]: "swap" };
          const why = takeB ? (B[i] === C[j] ? "they are equal, and B's copy goes first (that keeps equal keys in their original order, which is why mergesort is stable)" : `${B[i]} is smaller`) : `${C[j]} is smaller`;
          push(["mwhile", "mif", takeB ? "mB" : "mC", "mk"], `Compare B[${i}] = ${B[i]} with C[${j}] = ${C[j]}: ${why}, so write ${val} to A[${k}].`, { range: [lo, hi], st: { [k]: "swap" } });
          if (takeB) i++; else j++;
          k++;
        }
        const bDone = i === p, k0 = k, rest = bDone ? C.slice(j) : B.slice(i);
        s.hl = {};
        for (const v of rest) { A[k] = v; R.mv++; s.vals[k - lo] = v; s.hl[k - lo] = "swap"; k++; }
        if (bDone) j = q; else i = p;
        rows();
        s.st = "sorted";
        const st = {}; for (let t = k0; t < k; t++) st[t] = "swap";
        push(bDone ? "restC" : "restB", `${bDone ? "B" : "C"} is used up, so copy what is left of ${bDone ? "C" : "B"} ([${rest.join(", ")}]) straight into A[${k0}..${hi}], no comparisons needed. A[${lo}..${hi}] is now sorted.`, { range: [lo, hi], st });
        sb.hl = {}; sc.hl = {}; s.hl = {};
      }
      ms(0, n - 1, 0);
      for (let k = 0; k < n; k++) R.done.add(k);
      const c = Math.ceil(log2(n)), worst = n * c - Math.pow(2, c) + 1;
      push(null, `Sorted! ${R.cmp} key comparisons. The worst case for n = ${n} is n⌈log₂n⌉ − 2^⌈log₂n⌉ + 1 = ${worst} (for n a power of 2 that is n log₂n − n + 1). Peak extra memory: ${R.memPeak} cells for the copies B and C.`);
    },
  };

  /* ---------- 5. Quicksort (Levitin §5.2, Lomuto from §4.5) ---------- */
  ALGOS.quick = {
    name: "Quicksort", group: "Ch 5 · Divide-and-Conquer", view: "quick", mv: "swaps", recursive: true,
    stable: [false, "partition swaps jump over equal keys"], inPlace: [true, "only the recursion stack"],
    time: "Θ(n log n) average, Θ(n²) worst", lesson: "05-divide-and-conquer", arena: ["quicksort-hoare"],
    book: [5, 3, 1, 9, 8, 2, 4, 7],
    legend: [["pivot", "pivot"], ["compare", "scanned element"], ["swap", "swapped"], ["done", "in final position"], ["dim", "outside A[l..r]"]],
    spec(opt) {
      const hoare = opt.part !== "lomuto", med = opt.pivot === "med3";
      const s = [
        "@start|ALGORITHM Quicksort(A[l..r])",
        "    // Call Quicksort(A[0..n-1])",
        "@if|    if l < r then",
        `@part|        s ← ${hoare ? "HoarePartition" : "LomutoPartition"}(A[l..r])`,
        "@rec1|        Quicksort(A[l..s−1])",
        "@rec2|        Quicksort(A[s+1..r])",
        "",
        `ALGORITHM ${hoare ? "HoarePartition" : "LomutoPartition"}(A[l..r])`,
      ];
      if (med) s.push("@med3|    move the median of A[l], A[⌊(l+r)/2⌋], A[r] to A[l]");
      if (hoare) s.push(
        "@p|    p ← A[l]           // the pivot",
        "@ij|    i ← l; j ← r + 1",
        "    repeat",
        "@scanI|        repeat i ← i + 1 until A[i] ≥ p or i = r",
        "@scanJ|        repeat j ← j − 1 until A[j] ≤ p",
        "@swap|        if i < j then swap A[i] and A[j]",
        "@until|    until i ≥ j",
        "@place|    swap A[l] and A[j]",
        "@ret|    return j");
      else s.push(
        "@p|    p ← A[l]           // the pivot",
        "@s|    s ← l",
        "    for i ← l + 1 to r do",
        "@cmp|        if A[i] < p then",
        "@swap|            s ← s + 1; swap A[s] and A[i]",
        "@place|    swap A[l] and A[s]",
        "@ret|    return s");
      return s;
    },
    record(R, opt) {
      const A = R.A, n = A.length, hoare = opt.part !== "lomuto", med = opt.pivot === "med3";
      const stack = [];
      const push = (line, text, o) => { o = o || {}; o.vis = { stack: stack.slice() }; return R.push(line, text, o); };
      push("start", `Quicksort picks a pivot, partitions the range so that smaller keys end up on its left and larger keys on its right, then sorts both sides recursively. Partition: ${hoare ? "Hoare (two scans moving toward each other)" : "Lomuto (one left-to-right scan)"}. Pivot: ${med ? "median of three" : "the first element"}.`);
      function median3(l, h) {
        if (!med || h - l < 2) return;
        const m = (l + h) >> 1, a = A[l], b = A[m], c = A[h];
        let mi, used = 1;
        if (a < b) { used++; if (b < c) mi = m; else { used++; mi = a < c ? h : l; } }
        else { used++; if (a < c) mi = l; else { used++; mi = b < c ? h : m; } }
        R.cmp += used;
        const val = A[mi];
        if (mi !== l) { [A[l], A[mi]] = [A[mi], A[l]]; R.mv++; }
        push("med3", `Median of three: A[${l}] = ${a}, A[${m}] = ${b}, A[${h}] = ${c}. The median is ${val} (found with ${used} comparisons)${mi !== l ? `; swap it into A[${l}] so it becomes the pivot` : `, and it is already at A[${l}]`}. A middle-sized pivot avoids the lopsided splits that sorted input causes.`,
          { range: [l, h], st: { [l]: "pivot", [mi === l ? m : mi]: mi === l ? "compare" : "swap" } });
      }
      function hoareP(l, h) {
        median3(l, h);
        const p = A[l];
        const fi = push(["p"], `Pivot p = A[${l}] = ${p}. Goal: everything left of the pivot ≤ ${p}, everything right of it ≥ ${p}.`, { range: [l, h], st: { [l]: "pivot" } });
        let i = l, j = h + 1;
        const P = () => [{ i, label: "i" }, j <= h ? { i: j, label: "j" } : null].filter(Boolean);
        push("ij", `i starts at l = ${l} and j just past r (${h + 1}). The two scans move toward each other.`, { range: [l, h], st: { [l]: "pivot" } });
        for (;;) {
          for (;;) {
            i++; R.cmp++;
            const ge = A[i] >= p, stop = ge || i === h;
            push("scanI", `i → ${i}: A[${i}] = ${A[i]} ${ge ? `≥ ${p}, so i stops (this element belongs on the right).` : i === h ? `< ${p}, but i reached r, so it stops.` : `< ${p}, fine on the left; keep scanning.`}`, { range: [l, h], st: { [l]: "pivot", [i]: "compare" }, ptr: P() });
            if (stop) break;
          }
          for (;;) {
            j--; R.cmp++;
            const le = A[j] <= p;
            push("scanJ", `j → ${j}: A[${j}] = ${A[j]} ${le ? `≤ ${p}, so j stops${j === l ? " (at the pivot itself)" : " (this element belongs on the left)"}.` : `> ${p}, fine on the right; keep scanning.`}`, { range: [l, h], st: { [l]: "pivot", [j]: "compare" }, ptr: P() });
            if (le) break;
          }
          if (i < j) {
            [A[i], A[j]] = [A[j], A[i]]; R.mv++;
            push("swap", `i = ${i} < j = ${j}: both stopped elements are on the wrong side, so swap them (${A[i]} goes left, ${A[j]} goes right).`, { range: [l, h], st: { [l]: "pivot", [i]: "swap", [j]: "swap" }, ptr: P() });
          } else {
            push("until", `i = ${i} ≥ j = ${j}: the scans have ${i === j ? "met" : "crossed"}, so the scanning is over.`, { range: [l, h], st: { [l]: "pivot" }, ptr: P() });
            break;
          }
        }
        [A[l], A[j]] = [A[j], A[l]]; R.mv++;
        push(["place", "ret"], `Swap the pivot into A[${j}]. Now A[${l}..${j - 1}] ≤ ${p} ≤ A[${j + 1}..${h}], so the split position is s = ${j}.`, { range: [l, h], st: { [j]: "pivot", [l]: l === j ? "pivot" : "swap" }, ptr: [{ i: j, label: "s" }] });
        R.frames[fi].ask = mkAsk(`Pivot p = ${p}: at which index will it end up?`, j, range(l, h), `After partitioning, the pivot lands at s = ${j}, with ${j - l} element(s) to its left in this range.`);
        return j;
      }
      function lomutoP(l, h) {
        median3(l, h);
        const p = A[l];
        let s = l;
        const fi = push(["p", "s"], `Pivot p = A[${l}] = ${p}. s marks the end of the "smaller than p" block, which is empty so far.`, { range: [l, h], st: { [l]: "pivot" }, ptr: [{ i: s, label: "s" }] });
        for (let i = l + 1; i <= h; i++) {
          R.cmp++;
          if (A[i] < p) {
            s++;
            [A[s], A[i]] = [A[i], A[s]]; R.mv++;
            push(["cmp", "swap"], `A[${i}] = ${A[s]} < ${p}: grow the "smaller" block (s → ${s}) and swap the element into it${s === i ? " (it is already there, so the swap changes nothing)" : ""}.`, { range: [l, h], st: { [l]: "pivot", [s]: "swap", [i]: "swap" }, ptr: [{ i: s, label: "s" }, { i, label: "i" }] });
          } else {
            push("cmp", `A[${i}] = ${A[i]} ≥ ${p}: leave it in the "greater or equal" block.`, { range: [l, h], st: { [l]: "pivot", [i]: "compare" }, ptr: [{ i: s, label: "s" }, { i, label: "i" }] });
          }
        }
        [A[l], A[s]] = [A[s], A[l]]; R.mv++;
        push(["place", "ret"], `Swap the pivot with A[${s}], the last element of the "smaller" block. Now A[${l}..${s - 1}] < ${p} ≤ A[${s + 1}..${h}], so s = ${s}.`, { range: [l, h], st: { [s]: "pivot", [l]: l === s ? "pivot" : "swap" }, ptr: [{ i: s, label: "s" }] });
        R.frames[fi].ask = mkAsk(`Pivot p = ${p}: at which index will it end up?`, s, range(l, h), `${s - l} element(s) of this range are smaller than ${p}, so the pivot lands at s = ${s}.`);
        return s;
      }
      function quick(l, h) {
        if (l > h) return;
        R.enter(); stack.push(`Quicksort(A[${l}..${h}])`);
        if (l === h) {
          R.done.add(l);
          push("if", `A[${l}..${h}] has one element (${A[l]}): it is already in its final place.`, { range: [l, h] });
        } else {
          push(["if", "part"], `A[${l}..${h}] has ${h - l + 1} elements, so partition it.`, { range: [l, h] });
          const s = hoare ? hoareP(l, h) : lomutoP(l, h);
          R.done.add(s);
          push("rec1", `The pivot ${A[s]} is final at index ${s}. Next, sort the left part A[${l}..${s - 1}]${s - 1 < l ? " (empty, nothing to do)" : ""}.`, { range: [l, h] });
          quick(l, s - 1);
          push("rec2", `Now sort the right part A[${s + 1}..${h}]${s + 1 > h ? " (empty, nothing to do)" : ""}.`, { range: [l, h] });
          quick(s + 1, h);
        }
        stack.pop(); R.leave();
      }
      quick(0, n - 1);
      for (let k = 0; k < n; k++) R.done.add(k);
      push(null, `Sorted! ${R.cmp} key comparisons, ${R.mv} swaps, recursion depth ${R.depthMax}. For comparison: n log₂n ≈ ${Math.round(n * log2(n))} (the average is about 1.39 n log₂n ≈ ${Math.round(1.39 * n * log2(n))}); a worst-case split every time costs about n²/2 ≈ ${Math.round(n * n / 2)}.`);
    },
  };

  /* ---------- 6. Heapsort (Levitin §6.4) ---------- */
  ALGOS.heap = {
    name: "Heapsort", group: "Ch 6 · Transform-and-Conquer", view: "heap", mv: "swaps",
    stable: [false, "root swaps reorder equal keys"], inPlace: [true, "Θ(1) extra"],
    time: "Θ(n log n) on every input", lesson: "06-transform-and-conquer", arena: ["heapsort", "heap-bottom-up"],
    book: [2, 9, 7, 6, 5, 8],
    legend: [["active", "node being sifted down"], ["compare", "compared"], ["swap", "swapped"], ["done", "removed from heap, final"]],
    spec: [
      "@start|ALGORITHM HeapSort(A[0..n-1])",
      "    // Stage 1: build a max-heap bottom-up",
      "@build|    for k ← ⌊n/2⌋ − 1 downto 0 do",
      "@buildSift|        SiftDown(A, k, n)",
      "    // Stage 2: n − 1 maximum deletions",
      "@del|    for last ← n − 1 downto 1 do",
      "@swapRoot|        swap A[0] and A[last]",
      "@delSift|        SiftDown(A, 0, last)",
      "@ret|    return A",
      "",
      "ALGORITHM SiftDown(A, k, size)",
      "@while|    while 2k + 1 < size do      // k has a child",
      "@j|        j ← 2k + 1                      // left child",
      "@child|        if j + 1 < size and A[j + 1] > A[j] then j ← j + 1",
      "@dom|        if A[k] ≥ A[j] then return  // heap ok",
      "@swapDown|        swap A[k] and A[j]",
      "@k|        k ← j",
    ],
    record(R) {
      const A = R.A, n = A.length;
      let size = n;
      const push = (line, text, o) => { o = o || {}; o.vis = { size }; return R.push(line, text, o); };
      push("start", `Heapsort views the array as a complete binary tree: the children of index k are 2k + 1 and 2k + 2. Stage 1 makes it a max-heap (every parent ≥ its children); stage 2 repeatedly moves the maximum to the end.`);
      function sift(k) {
        const start = k;
        while (2 * k + 1 < size) {
          let j = 2 * k + 1;
          if (j + 1 < size) {
            R.cmp++;
            const right = A[j + 1] > A[j];
            push(["j", "child"], `Node ${k} (${A[k]}) has children A[${j}] = ${A[j]} and A[${j + 1}] = ${A[j + 1]}. The larger child is ${right ? A[j + 1] : A[j]}.`, { st: { [k]: "active", [j]: "compare", [j + 1]: "compare" } });
            if (right) j++;
          } else push("j", `Node ${k} (${A[k]}) has only a left child, A[${j}] = ${A[j]}.`, { st: { [k]: "active", [j]: "compare" } });
          R.cmp++;
          if (A[k] >= A[j]) {
            push("dom", `A[${k}] = ${A[k]} ≥ its larger child ${A[j]}: parental dominance holds, stop.`, { st: { [k]: "active", [j]: "compare" } });
            return k;
          }
          [A[k], A[j]] = [A[j], A[k]]; R.mv++;
          push(["dom", "swapDown", "k"], `${A[j]} < ${A[k]}: swap them, then keep sifting ${A[j]} down from index ${j}.`, { st: { [k]: "swap", [j]: "swap" } });
          k = j;
        }
        push("while", `Index ${k} has no children inside the heap${k === start ? "" : " (it is a leaf)"}, so sifting stops.`, { st: { [k]: "active" } });
        return k;
      }
      push("build", `Stage 1: fix the parents from the last one, index ⌊n/2⌋ − 1 = ${Math.floor(n / 2) - 1}, back to the root.`);
      for (let k = Math.floor(n / 2) - 1; k >= 0; k--) {
        push("buildSift", `Sift down A[${k}] = ${A[k]} so the subtree rooted at index ${k} becomes a heap.`, { st: { [k]: "active" } });
        sift(k);
      }
      push("del", `Stage 1 done: A is a max-heap, and the maximum ${A[0]} is at the root. Stage 2 begins.`, { st: { 0: "active" } });
      for (let last = n - 1; last >= 1; last--) {
        [A[0], A[last]] = [A[last], A[0]]; R.mv++;
        size = last;
        R.done.add(last);
        const fi = push("swapRoot", `Swap the root (the maximum ${A[last]}) with A[${last}]: ${A[last]} is final. The heap shrinks to ${last} element(s), and the new root ${A[0]} may break the heap.`, { st: { 0: "swap", [last]: "swap" } });
        const v = A[0];
        push("delSift", `Sift the new root ${v} down.`, { st: { 0: "active" } });
        const end = sift(0);
        if (last >= 3) R.frames[fi].ask = mkAsk(`The new root ${v} will be sifted down. At which index will it stop?`, end, range(0, last - 1), `${v} keeps swapping with its larger child until both children are ≤ ${v} or it reaches a leaf; it stops at index ${end}.`);
      }
      R.done.add(0); size = 0;
      push("ret", `Sorted! ${R.cmp} key comparisons and ${R.mv} swaps. Heapsort is Θ(n log n) even in the worst case (at most about 2n log₂n ≈ ${Math.round(2 * n * log2(n))} comparisons) and needs no extra array.`);
    },
  };

  /* ---------- 7. Comparison counting sort (Levitin §7.1) ---------- */
  ALGOS.ccount = {
    name: "Comparison counting sort", group: "Ch 7 · Space-Time Tradeoffs", view: "ccount", mv: "writes to S",
    stable: [false, "as written, equal keys come out reversed"], inPlace: [false, "Count and S: 2n extra"],
    time: "Θ(n²) comparisons on every input", lesson: "07-space-time-tradeoffs", arena: ["comparison-counting-sort"],
    book: [62, 31, 84, 96, 19, 47],
    legend: [["active", "A[i]"], ["compare", "A[j]"], ["swap", "count / cell just written"], ["done", "placed"]],
    spec: [
      "@start|ALGORITHM ComparisonCountingSort(A[0..n-1])",
      "@init|    for i ← 0 to n − 1 do Count[i] ← 0",
      "    for i ← 0 to n − 2 do",
      "        for j ← i + 1 to n − 1 do",
      "@cmp|            if A[i] < A[j] then",
      "@incJ|                Count[j] ← Count[j] + 1",
      "@incI|            else Count[i] ← Count[i] + 1",
      "@place|    for i ← 0 to n − 1 do S[Count[i]] ← A[i]",
      "@ret|    return S",
    ],
    record(R) {
      const A = R.A, n = A.length, C = Array(n).fill(0), S = Array(n).fill(null);
      const push = (line, text, o) => { o = o || {}; o.vis = { C: C.slice(), S: S.slice(), hlC: o.hlC || {}, hlS: o.hlS || {} }; o.out = S.slice(); return R.push(line, text, o); };
      R.alloc(2 * n);
      push(["start", "init"], `Count[i] will say how many elements must come before A[i] in sorted order. All counts start at 0. Extra memory: Count and S, 2n = ${2 * n} cells.`);
      for (let i = 0; i < n - 1; i++) for (let j = i + 1; j < n; j++) {
        R.cmp++;
        const lt = A[i] < A[j], w = lt ? j : i;
        C[w]++;
        push(["cmp", lt ? "incJ" : "incI"], `Compare A[${i}] = ${A[i]} with A[${j}] = ${A[j]}: ${lt ? `${A[i]} < ${A[j]}, so A[${j}] has one more element before it: Count[${j}] = ${C[j]}.` : `${A[i]} ${A[i] === A[j] ? "=" : ">"} ${A[j]}, so A[${i}] has one more element before it: Count[${i}] = ${C[i]}.`}`,
          { st: { [i]: "active", [j]: "compare" }, hlC: { [w]: "swap" }, ptr: [{ i, label: "i" }, { i: j, label: "j" }] });
      }
      push("place", `All n(n−1)/2 = ${n * (n - 1) / 2} pairs compared. Each Count[i] is now the final index of A[i].`,
        { ask: mkAsk(`Where in S does A[0] = ${A[0]} go?`, C[0], range(0, n - 1), `Count[0] = ${C[0]}: exactly ${C[0]} elements come before ${A[0]}, so it goes to S[${C[0]}].`) });
      for (let i = 0; i < n; i++) {
        S[C[i]] = A[i]; R.mv++; R.done.add(i);
        push("place", `Count[${i}] = ${C[i]}, so A[${i}] = ${A[i]} goes straight to S[${C[i]}].`, { st: { [i]: "active" }, hlC: { [i]: "active" }, hlS: { [C[i]]: "swap" }, ptr: [{ i, label: "i" }] });
      }
      push("ret", `Sorted into S: ${R.cmp} comparisons = n(n−1)/2, but only n = ${n} writes, since each element moves exactly once. The price is 2n extra cells.`, { hlS: Object.fromEntries(range(0, n - 1).map((k) => [k, "done"])) });
    },
  };

  /* ---------- 8. Distribution counting sort (Levitin §7.1) ---------- */
  ALGOS.dist = {
    name: "Distribution counting sort", group: "Ch 7 · Space-Time Tradeoffs", view: "dist", mv: "writes to S",
    stable: [true, "right-to-left placement keeps ties in order"], inPlace: [false, "D (u − l + 1) + S (n)"],
    time: "Θ(n + (u − l)), no key comparisons", lesson: "07-space-time-tradeoffs", arena: ["distribution-counting-sort"],
    book: [13, 11, 12, 13, 12, 12],
    legend: [["active", "element being processed"], ["swap", "value just written"], ["done", "placed"]],
    spec: [
      "@start|ALGORITHM DistributionCountingSort(A[0..n-1], l, u)",
      "@init|    for j ← 0 to u − l do D[j] ← 0",
      "@freq|    for i ← 0 to n − 1 do D[A[i] − l] ← D[A[i] − l] + 1",
      "@cum|    for j ← 1 to u − l do D[j] ← D[j−1] + D[j]",
      "@loop|    for i ← n − 1 downto 0 do",
      "@jset|        j ← A[i] − l",
      "@placeS|        S[D[j] − 1] ← A[i]",
      "@dec|        D[j] ← D[j] − 1",
      "@ret|    return S",
    ],
    record(R) {
      const A = R.A, n = A.length, l = Math.min(...A), u = Math.max(...A), m = u - l + 1;
      const D = Array(m).fill(0), S = Array(n).fill(null);
      const push = (line, text, o) => { o = o || {}; o.vis = { D: D.slice(), S: S.slice(), l, hlD: o.hlD || {}, hlS: o.hlS || {} }; o.out = S.slice(); return R.push(line, text, o); };
      R.alloc(m + n);
      push(["start", "init"], `The keys lie between l = ${l} and u = ${u}, so D needs u − l + 1 = ${m} counters, all 0. This algorithm never compares two keys.`);
      for (let i = 0; i < n; i++) {
        const j = A[i] - l; D[j]++;
        push("freq", `A[${i}] = ${A[i]}: add one to D[${A[i]} − ${l}] = D[${j}], which is now ${D[j]}.`, { st: { [i]: "active" }, hlD: { [j]: "swap" }, ptr: [{ i, label: "i" }] });
      }
      for (let j = 1; j < m; j++) {
        D[j] += D[j - 1];
        push("cum", `D[${j}] ← D[${j - 1}] + D[${j}] = ${D[j]}: ${D[j]} keys are ≤ ${l + j}, so the last ${l + j} belongs at S[${D[j] - 1}].`, { hlD: { [j]: "swap", [j - 1]: "compare" } });
      }
      const last = A[n - 1];
      push("loop", `D now holds distribution values. Scan A from right to left and drop each key into place.`,
        { ask: mkAsk(`A[${n - 1}] = ${last} is placed first. Which index of S does it go to?`, D[last - l] - 1, range(0, n - 1), `D[${last} − ${l}] = ${D[last - l]}, so ${last} goes to S[${D[last - l]} − 1] = S[${D[last - l] - 1}].`) });
      for (let i = n - 1; i >= 0; i--) {
        const j = A[i] - l, pos = D[j] - 1;
        S[pos] = A[i]; R.mv++; D[j]--; R.done.add(i);
        push(["jset", "placeS", "dec"], `A[${i}] = ${A[i]}: D[${j}] was ${pos + 1}, so write it to S[${pos}] and lower D[${j}] to ${D[j]} (the next equal key goes one place further left).`,
          { st: { [i]: "active" }, hlD: { [j]: "swap" }, hlS: { [pos]: "swap" }, ptr: [{ i, label: "i" }] });
      }
      push("ret", `Sorted with 0 key comparisons and ${R.mv} writes: linear time, paid for with ${m + n} extra cells. It only works because the keys are small integers from a known range.`, { hlS: Object.fromEntries(range(0, n - 1).map((k) => [k, "done"])) });
    },
  };

  /* ---------- 9. LSD radix sort ---------- */
  const PLACE = ["ones", "tens", "hundreds", "thousands"];
  ALGOS.radix = {
    name: "LSD radix sort", group: "Ch 7 · Space-Time Tradeoffs", view: "radix", mv: "moves",
    stable: [true, "each pass is a stable distribution"], inPlace: [false, "n cells in the buckets"],
    time: "Θ(d·(n + 10)) for d-digit keys", lesson: "07-space-time-tradeoffs", arena: ["radix-sort-lsd"],
    book: [329, 457, 657, 839, 436, 720, 355],
    legend: [["active", "element being distributed"], ["swap", "just moved"], ["done", "sorted"]],
    spec: [
      "@start|ALGORITHM RadixSortLSD(A[0..n-1], d)",
      "    // d = number of decimal digits of the largest key",
      "@pass|    for t ← 0 to d − 1 do     // t = 0: ones digit",
      "        for i ← 0 to n − 1 do",
      "@digit|            b ← ⌊A[i] / 10^t⌋ mod 10",
      "@append|            append(Bucket[b], A[i])",
      "@kinit|        k ← 0",
      "@collect|        for b ← 0 to 9 do",
      "@write|            for each x in Bucket[b] do A[k] ← x; k ← k + 1",
      "@empty|            Bucket[b] ← empty",
      "@ret|    return A",
    ],
    record(R) {
      const A = R.A, n = A.length, d = Math.max(1, String(Math.max(...A)).length);
      let B = Array.from({ length: 10 }, () => []), t = 0;
      const push = (line, text, o) => { o = o || {}; o.vis = { B: B.map((b) => b.slice()), digit: t, d, hlB: o.hlB || {} }; return R.push(line, text, o); };
      R.alloc(n + 10);
      push("start", `LSD (Least Significant Digit) radix sort sorts by the ones digit, then the tens, then the hundreds. Every pass must be stable. The largest key ${Math.max(...A)} has d = ${d} digit(s), so ${d} pass(es).`);
      for (t = 0; t < d; t++) {
        const pw = Math.pow(10, t);
        // the order after this pass = a stable sort of the current A by digit t
        const expected = A.map((x, k) => [Math.floor(x / pw) % 10, k, x]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((e) => e[2]);
        push("pass", `Pass ${t + 1}: distribute by the ${PLACE[t]} digit.`,
          { ask: t > 0 ? mkAsk(`After this pass, which value will be first in A?`, expected[0], A, `The pass is a stable sort on the ${PLACE[t]} digit, and ${expected[0]} is the first key (in the current order) with the smallest ${PLACE[t]} digit.`) : null });
        for (let i = 0; i < n; i++) {
          const b = Math.floor(A[i] / pw) % 10;
          B[b].push(A[i]); R.mv++;
          push(["digit", "append"], `A[${i}] = ${A[i]} has ${PLACE[t]} digit ${b}: append it to bucket ${b}.`, { st: { [i]: "active" }, hlB: { [b]: B[b].length - 1 }, ptr: [{ i, label: "i" }] });
        }
        let k = 0;
        for (let b = 0; b < 10; b++) {
          if (!B[b].length) continue;
          const k0 = k, items = B[b].slice(), st = {};
          for (const x of items) { A[k] = x; R.mv++; st[k] = "swap"; k++; }
          B[b] = [];
          push(["collect", "write", "empty"], `Empty bucket ${b} into A[${k0}..${k - 1}]: ${items.join(", ")}. Items leave a bucket in the order they arrived, which keeps the pass stable.`, { st });
        }
        push("pass", `After pass ${t + 1}, A is sorted by its last ${t + 1} digit(s): ${A.join(", ")}.`);
      }
      for (let k = 0; k < n; k++) R.done.add(k);
      push("ret", `Sorted with 0 key comparisons and ${R.mv} moves (2n per pass, ${d} passes).`);
    },
  };

  /* ---------- 10. Bucket sort ---------- */
  ALGOS.bucket = {
    name: "Bucket sort", group: "Ch 7 · Space-Time Tradeoffs", view: "bucket", mv: "moves",
    stable: [true, "appends and insertion sort keep ties in order"], inPlace: [false, "n cells in k buckets"],
    time: "Θ(n) average for uniform keys, Θ(n²) worst", lesson: "07-space-time-tradeoffs", arena: [],
    book: [78, 17, 39, 26, 72, 94, 21, 12, 23, 68],
    legend: [["active", "element being placed"], ["compare", "compared inside a bucket"], ["swap", "just moved"], ["done", "sorted"]],
    spec: [
      "@start|ALGORITHM BucketSort(A[0..n-1], k)",
      "    // keys lie in [0, M); bucket b holds keys in [b·M/k, (b+1)·M/k)",
      "    for i ← 0 to n − 1 do",
      "@dist|        append(Bucket[⌊k · A[i] / M⌋], A[i])",
      "@sort|    for b ← 0 to k − 1 do InsertionSort(Bucket[b])",
      "@concat|    concatenate Bucket[0], …, Bucket[k − 1] into A",
      "@ret|    return A",
    ],
    record(R) {
      const A = R.A, n = A.length, k = Math.min(10, Math.max(2, n)), M = Math.max(...A) + 1;
      const B = Array.from({ length: k }, () => []);
      const push = (line, text, o) => { o = o || {}; o.vis = { B: B.map((b) => b.slice()), k, M, hlB: o.hlB || {} }; return R.push(line, text, o); };
      R.alloc(n + k);
      const bk = (x) => Math.floor((k * x) / M);
      push("start", `Bucket sort spreads the keys over k = ${k} buckets by value (M = max + 1 = ${M}), sorts each bucket with insertion sort, then reads the buckets in order. It is fast when keys are spread evenly.`,
        { ask: mkAsk(`Which bucket will A[0] = ${A[0]} go into?`, bk(A[0]), range(0, k - 1), `⌊k · A[0] / M⌋ = ⌊${k} · ${A[0]} / ${M}⌋ = ${bk(A[0])}.`) });
      for (let i = 0; i < n; i++) {
        const b = bk(A[i]);
        B[b].push(A[i]); R.mv++;
        push("dist", `A[${i}] = ${A[i]}: ⌊${k} · ${A[i]} / ${M}⌋ = ${b}, so append it to bucket ${b}.`, { st: { [i]: "active" }, hlB: { [b]: { [B[b].length - 1]: "swap" } }, ptr: [{ i, label: "i" }] });
      }
      for (let b = 0; b < k; b++) {
        const Bb = B[b];
        if (Bb.length < 2) continue;
        push("sort", `Insertion-sort bucket ${b}: [${Bb.join(", ")}].`, { hlB: { [b]: {} } });
        for (let t = 1; t < Bb.length; t++) {
          const v = Bb[t];
          let j = t - 1;
          while (j >= 0) {
            R.cmp++;
            if (Bb[j] > v) {
              Bb[j + 1] = Bb[j]; Bb[j] = v; R.mv++;
              push("sort", `Bucket ${b}: ${Bb[j + 1]} > ${v}, so ${v} moves in front of it.`, { hlB: { [b]: { [j]: "swap", [j + 1]: "compare" } } });
              j--;
            } else {
              push("sort", `Bucket ${b}: ${Bb[j]} ≤ ${v}, so ${v} stays where it is.`, { hlB: { [b]: { [j]: "compare", [j + 1]: "active" } } });
              break;
            }
          }
        }
      }
      let pos = 0;
      for (let b = 0; b < k; b++) {
        if (!B[b].length) continue;
        const k0 = pos, st = {};
        for (const x of B[b]) { A[pos] = x; R.mv++; st[pos] = "swap"; pos++; }
        push("concat", `Copy bucket ${b} ([${B[b].join(", ")}]) into A[${k0}..${pos - 1}].`, { st, hlB: { [b]: Object.fromEntries(B[b].map((_, t) => [t, "done"])) } });
      }
      for (let t = 0; t < n; t++) R.done.add(t);
      const biggest = Math.max(...B.map((b) => b.length));
      push("ret", `Sorted: ${R.cmp} key comparisons, all inside buckets. The fullest bucket held ${biggest} key(s); when keys are spread evenly the buckets stay tiny and the whole sort runs in linear time on average.`);
    },
  };

  const ORDER = ["selection", "bubble", "insertion", "merge", "quick", "heap", "ccount", "dist", "radix", "bucket"];

  /** Run one algorithm; returns {frames, lines}. At most 4 Predict questions are kept per run. */
  function run(key, input, opt) {
    opt = opt || {};
    const alg = ALGOS[key];
    const P = parseSpec(typeof alg.spec === "function" ? alg.spec(opt) : alg.spec);
    const R = Rec(input, P.L);
    alg.record(R, opt);
    const askIdx = R.frames.map((f, i) => (f.ask ? i : -1)).filter((i) => i >= 0);
    const keep = new Set();
    if (askIdx.length <= 4) askIdx.forEach((i) => keep.add(i));
    else for (let t = 0; t < 4; t++) keep.add(askIdx[Math.round((t * (askIdx.length - 1)) / 3)]);
    R.frames.forEach((f, i) => { if (!keep.has(i)) f.ask = null; });
    return { frames: R.frames, lines: P.lines, final: R.A };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { ALGOS, ORDER, run, parseSpec, mkAsk };
  if (typeof document === "undefined") return;

  /* ================= Part 2: browser UI ================= */
  const $ = (id) => document.getElementById(id);
  const E = Forge.el, S = Forge.svg;
  const W = 760;
  const COL = { compare: "var(--c-compare)", swap: "var(--c-swap)", done: "var(--c-done)", active: "var(--c-active)", pivot: "var(--c-pivot)", dim: "var(--c-dim)" };
  const inkOn = (st) => (st && st !== "dim" ? "#0d1117" : "var(--ink)");

  /* ---------- drawing helpers ---------- */
  function stateOf(f, extra) {
    const st = {};
    f.done.forEach((k) => (st[k] = "done"));
    Object.assign(st, extra || {}, f.st);
    return st;
  }
  function drawBars(g, A, o) {
    const n = A.length, bw = o.w / n;
    const vals = A.filter((v) => v != null);
    const max = o.max || Math.max(1, ...vals);
    const base = o.y + o.h - (o.ptrSpace ? 40 : 16);
    const top = o.y + (o.showVals === false ? 4 : 16);
    const st = o.st || {};
    const showTxt = bw >= 13 && o.showVals !== false;
    if (o.range) {
      const [l, r] = o.range;
      g.appendChild(S("rect", { x: o.x + l * bw, y: o.y, width: (r - l + 1) * bw, height: base - o.y + 2, rx: 6, fill: "var(--ember-soft)" }));
      if (o.rangeLabel !== false) g.appendChild(S("text", { x: o.x + l * bw + 4, y: o.y + 11, "font-size": 10, fill: "var(--ember)", "font-weight": 700 }, `A[${l}..${r}]`));
    }
    A.forEach((v, k) => {
      const x = o.x + k * bw;
      if (v == null || k === o.hole) {
        g.appendChild(S("rect", { x: x + bw * 0.1, y: base - 14, width: bw * 0.8, height: 14, rx: 3, fill: "none", stroke: "var(--line-2)", "stroke-dasharray": "3 3" }));
      } else {
        const hh = Math.max(3, ((base - top) * v) / max);
        g.appendChild(S("rect", { x: x + bw * 0.1, y: base - hh, width: Math.max(1, bw * 0.8), height: hh, rx: Math.min(4, bw / 4), fill: COL[st[k]] || "var(--c-bar)" },
          S("title", null, `A[${k}] = ${v}`)));
        if (showTxt) {
          const t = S("text", { x: x + bw / 2, y: base - hh - 4, "text-anchor": "middle", "font-size": Math.min(13, bw * 0.42), fill: "var(--ink-2)" });
          if (o.digit != null) {
            const s = String(v).padStart(o.d, "0"), pos = s.length - 1 - o.digit;
            [...s].forEach((ch, c) => t.appendChild(S("tspan", c === pos ? { fill: "var(--ember)", "font-weight": 800 } : {}, ch)));
          } else t.textContent = String(v);
          g.appendChild(t);
        }
      }
      if (bw >= 13 && o.showIdx !== false) g.appendChild(S("text", { x: x + bw / 2, y: base + 12, "text-anchor": "middle", "font-size": 10, fill: "var(--muted)" }, String(k)));
    });
    if (o.hole != null && o.holeVal != null) {
      const cx = o.x + o.hole * bw + bw / 2;
      const hh = Math.max(3, ((base - top) * o.holeVal) / max);
      const y = Math.max(o.y + 2, base - hh - 22);
      g.appendChild(S("rect", { x: cx - 26, y, width: 52, height: 18, rx: 9, fill: COL.active }));
      g.appendChild(S("text", { x: cx, y: y + 13, "text-anchor": "middle", "font-size": 11, "font-weight": 700, fill: "#0d1117" }, `v = ${o.holeVal}`));
    }
    if (o.ptr && o.ptr.length) {
      const by = {};
      o.ptr.forEach((p) => { if (p && p.i != null && p.i >= 0 && p.i < n) (by[p.i] = by[p.i] || []).push(p.label); });
      Object.keys(by).forEach((i) => {
        const cx = o.x + (+i) * bw + bw / 2;
        g.appendChild(S("path", { d: `M${cx} ${base + 16} l-5 8 h10 z`, fill: "var(--ember)" }));
        g.appendChild(S("text", { x: cx, y: base + 36, "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: "var(--ember)" }, by[i].join(",")));
      });
    }
  }
  function drawCells(g, vals, o) {
    const fs = Math.min(12, o.cw * 0.42);
    if (o.label) g.appendChild(S("text", { x: o.x - 8, y: o.y + o.ch / 2 + 4, "text-anchor": "end", "font-size": 11, "font-weight": 700, fill: "var(--muted)" }, o.label));
    vals.forEach((v, k) => {
      const x = o.x + k * o.cw, st = (o.hl || {})[k];
      g.appendChild(S("rect", { x: x + 1, y: o.y, width: Math.max(1, o.cw - 2), height: o.ch, rx: 4, fill: st ? COL[st] : "var(--panel)", stroke: "var(--line-2)" }));
      if (v != null && o.cw >= 9) g.appendChild(S("text", { x: x + o.cw / 2, y: o.y + o.ch / 2 + fs / 2.8, "text-anchor": "middle", "font-size": fs, "font-weight": 600, fill: inkOn(st) }, String(v)));
      if (o.sub && o.cw >= 14) g.appendChild(S("text", { x: x + o.cw / 2, y: o.y - 4, "text-anchor": "middle", "font-size": 9, fill: "var(--muted)" }, String(o.sub[k])));
    });
  }
  function drawBuckets(g, B, o) {
    const k = B.length, colW = o.w / k;
    const maxLen = Math.max(1, ...B.map((b) => b.length));
    const ch = Math.min(22, (o.h - 24) / maxLen);
    const fs = Math.min(11, colW * 0.3, ch * 0.7);
    B.forEach((col, b) => {
      const x = o.x + b * colW;
      g.appendChild(S("rect", { x: x + 2, y: o.y + 16, width: colW - 4, height: o.h - 16, rx: 6, fill: "none", stroke: "var(--line)" }));
      g.appendChild(S("text", { x: x + colW / 2, y: o.y + 11, "text-anchor": "middle", "font-size": 10, "font-weight": 700, fill: "var(--muted)" }, o.labels ? o.labels[b] : String(b)));
      const hl = (o.hl || {})[b] || {};
      col.forEach((v, t) => {
        const st = hl[t];
        g.appendChild(S("rect", { x: x + 5, y: o.y + 20 + t * ch, width: colW - 10, height: ch - 2, rx: 3, fill: st ? COL[st] : "var(--panel-2)", stroke: "var(--line-2)" }));
        if (ch >= 9) g.appendChild(S("text", { x: x + colW / 2, y: o.y + 20 + t * ch + ch / 2 + fs / 3, "text-anchor": "middle", "font-size": fs, fill: inkOn(st) }, String(v)));
      });
    });
  }

  /* ---------- views: each draws one frame and returns the stage height ---------- */
  const VIEWS = {
    bars(f, g) {
      drawBars(g, f.A, { x: 20, y: 6, w: W - 40, h: 300, st: stateOf(f), ptr: f.ptr, ptrSpace: true, hole: f.vis && f.vis.hole, holeVal: f.vis && f.vis.v });
      return 312;
    },
    quick(f, g) {
      const dim = {};
      if (f.range) f.A.forEach((_, k) => { if (k < f.range[0] || k > f.range[1]) dim[k] = "dim"; });
      const st = {}; Object.assign(st, dim); f.done.forEach((k) => (st[k] = "done")); Object.assign(st, f.st);
      drawBars(g, f.A, { x: 20, y: 6, w: W - 40, h: 300, st, ptr: f.ptr, ptrSpace: true, range: f.range });
      return 312;
    },
    merge(f, g) {
      const n = f.A.length, x0 = 20, w = W - 40, cw = w / n;
      drawBars(g, f.A, { x: x0, y: 4, w, h: 170, st: stateOf(f), range: f.range });
      const segs = (f.vis && f.vis.segs) || [];
      const D = Math.ceil(log2(Math.max(2, n)));
      const y0 = 198, rh = 34;
      for (let d = 0; d <= D; d++) g.appendChild(S("text", { x: 4, y: y0 + d * rh + 17, "font-size": 9, fill: "var(--muted)" }, String(d)));
      segs.forEach((s) => {
        const y = y0 + s.d * rh, x = x0 + s.lo * cw, sw = (s.hi - s.lo + 1) * cw;
        const stroke = { split: "var(--line-2)", current: "var(--ember)", merging: "var(--ember)", sorted: "var(--c-done)" }[s.st];
        drawCells(g, s.vals, { x, y: y + 2, cw, ch: 24, hl: s.hl });
        g.appendChild(S("rect", { x: x + 0.5, y: y + 0.5, width: sw - 1, height: 27, rx: 6, fill: "none", stroke, "stroke-width": s.st === "split" ? 1 : 2.5 }));
      });
      g.appendChild(S("text", { x: W - 8, y: y0 - 4, "text-anchor": "end", "font-size": 10, fill: "var(--muted)" }, "split ↓   merge ↑   (row = recursion depth)"));
      return y0 + (D + 1) * rh + 8;
    },
    heap(f, g) {
      const n = f.A.length, size = f.vis ? f.vis.size : n, levels = Math.floor(log2(n)) + 1;
      const st = stateOf(f), x0 = 20, w = W - 40, y0 = 28, lh = levels > 4 ? 50 : 62;
      const leafSlots = Math.pow(2, levels - 1);
      const r = Math.max(9, Math.min(19, w / leafSlots / 2 - 2));
      const pos = (k) => { const L = Math.floor(log2(k + 1)), p = k - (Math.pow(2, L) - 1), cnt = Math.pow(2, L); return { x: x0 + ((p + 0.5) * w) / cnt, y: y0 + L * lh }; };
      for (let k = 1; k < n; k++) {
        const a = pos(Math.floor((k - 1) / 2)), b = pos(k), inHeap = k < size;
        g.appendChild(S("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: inHeap ? "var(--line-2)" : "var(--c-dim)", "stroke-width": inHeap ? 2 : 1.2, "stroke-dasharray": inHeap ? null : "4 4" }));
      }
      for (let k = 0; k < n; k++) {
        const p = pos(k), s = st[k];
        const fill = s ? COL[s] : "var(--panel-2)";
        g.appendChild(S("circle", { cx: p.x, cy: p.y, r, fill, stroke: s ? fill : "var(--line-2)", "stroke-width": 2 }));
        g.appendChild(S("text", { x: p.x, y: p.y + 4, "text-anchor": "middle", "font-size": Math.min(13, r * 0.9), "font-weight": 700, fill: inkOn(s) }, String(f.A[k])));
        if (r >= 13) g.appendChild(S("text", { x: p.x + r + 2, y: p.y - r + 4, "font-size": 9, fill: "var(--muted)" }, String(k)));
      }
      const cy = y0 + (levels - 1) * lh + r + 30;
      const cw = Math.min(46, w / n), cx0 = (W - cw * n) / 2;
      g.appendChild(S("text", { x: cx0, y: cy - 6, "font-size": 10, fill: "var(--muted)" }, `array view · heap = A[0..${Math.max(0, size - 1)}]${size < n ? `, sorted part = A[${size}..${n - 1}]` : ""}`));
      drawCells(g, f.A, { x: cx0, y: cy, cw, ch: 26, hl: st });
      if (cw >= 14) f.A.forEach((_, k) => g.appendChild(S("text", { x: cx0 + k * cw + cw / 2, y: cy + 40, "text-anchor": "middle", "font-size": 9, fill: "var(--muted)" }, String(k))));
      return cy + 48;
    },
    ccount(f, g) {
      const n = f.A.length, x0 = 64, w = W - 84, cw = w / n, v = f.vis;
      drawBars(g, f.A, { x: x0, y: 4, w, h: 170, st: stateOf(f, {}), ptr: f.ptr, ptrSpace: true });
      g.appendChild(S("text", { x: x0 - 8, y: 100, "text-anchor": "end", "font-size": 11, "font-weight": 700, fill: "var(--muted)" }, "A"));
      drawCells(g, v.C, { x: x0, y: 190, cw, ch: 28, hl: v.hlC, label: "Count" });
      drawCells(g, v.S, { x: x0, y: 246, cw, ch: 28, hl: v.hlS, label: "S", sub: v.S.map((_, k) => k) });
      return 284;
    },
    dist(f, g) {
      const n = f.A.length, x0 = 64, w = W - 84, v = f.vis, m = v.D.length;
      drawBars(g, f.A, { x: x0, y: 4, w, h: 170, st: stateOf(f, {}), ptr: f.ptr, ptrSpace: true });
      g.appendChild(S("text", { x: x0 - 8, y: 100, "text-anchor": "end", "font-size": 11, "font-weight": 700, fill: "var(--muted)" }, "A"));
      const dw = Math.min(46, w / m);
      g.appendChild(S("text", { x: x0, y: 190, "font-size": 9, fill: "var(--muted)" }, "key value →"));
      drawCells(g, v.D, { x: x0, y: 208, cw: dw, ch: 28, hl: v.hlD, label: "D", sub: v.D.map((_, j) => v.l + j) });
      drawCells(g, v.S, { x: x0, y: 264, cw: w / n, ch: 28, hl: v.hlS, label: "S", sub: v.S.map((_, k) => k) });
      return 302;
    },
    radix(f, g) {
      const x0 = 20, w = W - 40, v = f.vis;
      drawBars(g, f.A, { x: x0, y: 4, w, h: 180, st: stateOf(f), ptr: f.ptr, ptrSpace: true, digit: v ? v.digit : null, d: v ? v.d : 1 });
      const hl = {};
      if (v) Object.keys(v.hlB).forEach((b) => (hl[b] = { [v.hlB[b]]: "active" }));
      drawBuckets(g, v ? v.B : [], { x: x0, y: 196, w, h: 170, hl });
      return 372;
    },
    bucket(f, g) {
      const x0 = 20, w = W - 40, v = f.vis;
      drawBars(g, f.A, { x: x0, y: 4, w, h: 180, st: stateOf(f), ptr: f.ptr, ptrSpace: true });
      const labels = v.B.map((_, b) => { const lo = Math.ceil((b * v.M) / v.k), hi = Math.ceil(((b + 1) * v.M) / v.k) - 1; return `${b}: ${lo}–${hi}`; });
      drawBuckets(g, v.B, { x: x0, y: 196, w, h: 170, hl: v.hlB, labels: (w / v.k) >= 60 ? labels : null });
      return 372;
    },
  };

  /* ---------- state ---------- */
  const url = new URLSearchParams(location.search);
  let mode = url.get("race") ? "race" : "single";
  let input = ALGOS.quick.book.slice();
  let seed = 7;
  let code = null, ctr = null;
  const answered = new Set();
  const stage = $("stage"), say = Forge.narrate($("say"));
  const playerWrap = $("player");
  let raceLanes = [];

  const algSel = $("alg");
  const groups = {};
  ORDER.forEach((k) => {
    const a = ALGOS[k];
    if (!groups[a.group]) { groups[a.group] = E("optgroup", { label: a.group }); algSel.appendChild(groups[a.group]); }
    groups[a.group].appendChild(E("option", { value: k }, a.name));
  });
  const startAlg = url.get("alg");
  algSel.value = ALGOS[startAlg] ? startAlg : "quick";
  if (ALGOS[startAlg]) input = ALGOS[startAlg].book.slice();

  /* race checkboxes */
  const raceBox = $("raceAlgs");
  const raceDefault = new Set(["selection", "insertion", "merge", "quick"]);
  ORDER.forEach((k) => {
    const cb = E("input", { type: "checkbox", value: k });
    cb.checked = raceDefault.has(k);
    cb.addEventListener("change", () => {
      const on = [...raceBox.querySelectorAll("input:checked")];
      if (on.length > 4) { cb.checked = false; $("raceMsg").textContent = "Up to 4 racers: untick one first."; return; }
      if (on.length < 2) { cb.checked = true; $("raceMsg").textContent = "A race needs at least 2 algorithms."; return; }
      $("raceMsg").textContent = "";
      reload();
    });
    raceBox.appendChild(E("label", { class: "chip race-pick" }, cb, ALGOS[k].name));
  });

  const player = Forge.player(playerWrap, { frames: [], render: (f, i, fr) => (mode === "single" ? renderSingle(f, i) : renderRace(f, i, fr)) });

  function opts() { return { part: $("part").value, pivot: $("pivot").value }; }

  /* ---------- single view ---------- */
  function renderSingle(f, i) {
    const alg = ALGOS[algSel.value];
    stage.innerHTML = "";
    const g = S("g");
    stage.appendChild(g);
    const H = VIEWS[alg.view](f, g);
    stage.setAttribute("viewBox", `0 0 ${W} ${H}`);
    code.highlight(f.line);
    const c = { "key comparisons": f.cmp, [alg.mv]: f.mv, "extra cells (peak)": f.mem };
    if (alg.recursive) c["max recursion depth"] = f.depth;
    ctr.set(c);
    say.say(f.text);
    $("extra").textContent = f.vis && f.vis.stack ? (f.vis.stack.length ? "Call stack: " + f.vis.stack.join(" › ") : "Call stack: (empty)") : "";
    ask(f, i);
  }
  function ask(f, i) {
    const box = $("predictBox");
    if (!f.ask || answered.has(i) || !$("predictOn").checked) return;
    player.pause();
    box.innerHTML = "";
    box.appendChild(E("div", { class: "ask-q" }, f.ask.q));
    box.appendChild(E("div", { class: "row" }, f.ask.opts.map((o, k) => E("button", { class: "btn sm", onclick: () => answer(i, k) }, o))));
    box.appendChild(E("div", { class: "small muted", style: { marginTop: "6px" } }, "Answer to continue, or just step forward to skip."));
  }
  function answer(i, k) {
    const f = player.frames[i];
    if (!f || !f.ask) return;
    answered.add(i);
    const ok = k === f.ask.ans, box = $("predictBox");
    const tally = $("predictScore");
    tally.dataset.n = (+tally.dataset.n || 0) + 1;
    tally.dataset.ok = (+tally.dataset.ok || 0) + (ok ? 1 : 0);
    tally.textContent = `${tally.dataset.ok} / ${tally.dataset.n} right`;
    box.innerHTML = "";
    box.appendChild(E("div", { class: "callout " + (ok ? "ok" : "bad") }, E("b", null, ok ? "Correct. " : `Not quite: the answer is ${f.ask.opts[f.ask.ans]}. `), f.ask.why));
    box.appendChild(E("div", { class: "small muted", style: { marginTop: "6px" } }, "Press ▶ or → to watch it happen."));
  }

  function badges(alg) {
    const b = $("badges");
    b.innerHTML = "";
    b.appendChild(E("span", { class: "chip " + (alg.stable[0] ? "ok" : "bad"), title: alg.stable[1] }, alg.stable[0] ? "✓ stable" : "✗ not stable"));
    b.appendChild(E("span", { class: "chip " + (alg.inPlace[0] ? "ok" : "warn"), title: alg.inPlace[1] }, alg.inPlace[0] ? "✓ in place" : "✗ not in place"));
    b.appendChild(E("span", { class: "chip steel" }, alg.time));
    b.appendChild(E("span", { class: "small muted" }, `${alg.stable[0] ? "Stable" : "Not stable"}: ${alg.stable[1]}. Memory: ${alg.inPlace[1]}.`));
    const lg = $("legend");
    lg.innerHTML = "";
    alg.legend.forEach(([s, t]) => lg.appendChild(E("span", null, E("i", { style: { background: COL[s] } }), t)));
    if (alg.view === "quick" || alg.view === "merge") lg.appendChild(E("span", null, E("i", { style: { background: "var(--ember-soft)", outline: "1px solid var(--ember)" } }), "current range A[l..r]"));
    const pr = $("practice");
    pr.innerHTML = "";
    pr.appendChild(E("a", { href: `https://github.com/Normansrule/algorithm-forge/blob/main/lessons/${alg.lesson}/README.md` }, "📘 Lesson"));
    alg.arena.forEach((id) => pr.appendChild(E("a", { href: `../arena/problem.html?id=${id}` }, "⚔️ " + id)));
  }

  function loadSingle() {
    const key = algSel.value, alg = ALGOS[key];
    const res = run(key, input, opts());
    $("codeHost").innerHTML = "";
    code = Forge.code($("codeHost"), res.lines);
    $("ctrHost").innerHTML = "";
    const c = { "key comparisons": 0, [alg.mv]: 0, "extra cells (peak)": 0 };
    if (alg.recursive) c["max recursion depth"] = 0;
    ctr = Forge.counters($("ctrHost"), c);
    $("quickOpts").hidden = key !== "quick";
    badges(alg);
    answered.clear();
    $("predictBox").textContent = "When a question appears here, answer it before stepping on.";
    player.load(res.frames);
  }

  /* ---------- race view ---------- */
  function loadRace() {
    const keys = [...raceBox.querySelectorAll("input:checked")].map((c) => c.value);
    const host = $("lanes");
    host.innerHTML = "";
    raceLanes = keys.map((k) => {
      const res = run(k, input, opts());
      const svg = S("svg", { class: "stage", viewBox: "0 0 380 150", role: "img", "aria-label": ALGOS[k].name + " lane" });
      const stat = E("div", { class: "small mono muted" });
      host.appendChild(E("div", { class: "panel lane" }, E("div", { class: "row", style: { justifyContent: "space-between" } }, E("b", null, ALGOS[k].name + (k === "quick" ? ` (${$("part").value === "lomuto" ? "Lomuto" : "Hoare"}${$("pivot").value === "med3" ? ", median-of-3" : ""})` : "")), stat), svg));
      return { key: k, frames: res.frames, svg, stat };
    });
    const len = Math.max(...raceLanes.map((l) => l.frames.length));
    player.load(Array.from({ length: len }, (_, t) => ({ t })));
  }
  function renderRace(f, t, all) {
    const last = t === all.length - 1;
    raceLanes.forEach((ln) => {
      const k = Math.min(t, ln.frames.length - 1), fr = ln.frames[k], fin = t >= ln.frames.length - 1;
      ln.svg.innerHTML = "";
      const g = S("g"); ln.svg.appendChild(g);
      const arr = fr.out || fr.A;
      drawBars(g, arr, { x: 8, y: 4, w: 364, h: 142, st: stateOf(fr), showIdx: false, max: Math.max(...input) });
      ln.stat.textContent = `${fr.cmp} cmp · ${fr.mv} ${ALGOS[ln.key].mv.split(" ")[0]} · ${fin ? `✓ done in ${ln.frames.length} steps` : `step ${k + 1}`}`;
    });
    // comparison chart (single measure, so one hue; the fewest-comparisons bar is marked when the race ends)
    const svg = $("raceChart"), narrow = svg.clientWidth > 0 && svg.clientWidth < 560;
    const CW = narrow ? 420 : W, rows = raceLanes.length, rh = 44, H = rows * rh + 30, x0 = narrow ? 150 : 200, x1 = CW - (narrow ? 95 : 110);
    svg.setAttribute("viewBox", `0 0 ${CW} ${H}`);
    svg.innerHTML = "";
    const finals = raceLanes.map((l) => l.frames[l.frames.length - 1].cmp);
    const max = Math.max(1, ...finals), minFinal = Math.min(...finals);
    svg.appendChild(S("line", { x1: x0, y1: 8, x2: x0, y2: H - 18, stroke: "var(--line-2)" }));
    raceLanes.forEach((ln, r) => {
      const fr = ln.frames[Math.min(t, ln.frames.length - 1)];
      const y = 12 + r * rh, bw = ((x1 - x0) * fr.cmp) / max;
      const win = last && fr.cmp === minFinal;
      svg.appendChild(S("text", { x: x0 - 10, y: y + 18, "text-anchor": "end", "font-size": 13, fill: "var(--ink)" }, ALGOS[ln.key].name));
      svg.appendChild(S("rect", { x: x0, y: y + 4, width: Math.max(fr.cmp ? 4 : 0, bw), height: 22, rx: 4, fill: win ? "var(--c-done)" : "var(--steel)" }, S("title", null, `${ALGOS[ln.key].name}: ${fr.cmp} key comparisons`)));
      svg.appendChild(S("text", { x: x0 + bw + 8, y: y + 20, "font-size": 13, "font-weight": 700, fill: "var(--ink-2)" }, String(fr.cmp) + (win ? " ✓ fewest" : "")));
    });
    svg.appendChild(S("text", { x: x0, y: H - 4, "font-size": 11, fill: "var(--muted)" }, last ? "final key comparisons (bar length ∝ count)" : "key comparisons so far"));
    const n = input.length;
    if (last) {
      const order = raceLanes.map((l, k) => [ALGOS[l.key].name, finals[k], l.frames[l.frames.length - 1].mem]).sort((a, b) => a[1] - b[1]);
      $("raceSay").innerHTML = `<b>Race over (n = ${n}).</b> Fewest key comparisons: <b>${order[0][0]}</b> with ${order[0][1]}; most: ${order[order.length - 1][0]} with ${order[order.length - 1][1]}. For scale, n(n−1)/2 = ${n * (n - 1) / 2} and n log₂n ≈ ${Math.round(n * log2(n))}. ` +
        (order.some((o) => o[1] === 0) ? "A sort with 0 comparisons is not cheating: it never compares keys, and pays with extra memory instead (see the extra-cells numbers in single mode)." : "Try the Sorted and Reversed presets: the ranking changes.");
    } else $("raceSay").innerHTML = `Step ${t + 1} of ${all.length}. Every lane advances one recorded step per tick (about one comparison or move). A lane that finishes early stops and waits.`;
  }

  /* ---------- input ---------- */
  function setInput(arr, note) {
    input = arr.slice();
    $("inp").value = input.join(", ");
    $("msg").textContent = note || "";
    reload();
  }
  function reload() { if (mode === "single") loadSingle(); else loadRace(); }
  function nVal() { return +$("n").value; }
  function randArr(n) { seed++; return Forge.randArray(n, 1, 99, seed * 7919 + Date.now() % 1000); }
  const PRESETS = {
    random: () => randArr(nVal()),
    sorted: () => randArr(nVal()).sort((a, b) => a - b),
    reversed: () => randArr(nVal()).sort((a, b) => b - a),
    few: () => { const r = Forge.rng(++seed * 31 + Date.now() % 997), vals = [20, 45, 70, 95].slice(0, 3 + Math.floor(r() * 2)); return Array.from({ length: nVal() }, () => vals[Math.floor(r() * vals.length)]); },
    nearly: () => { const a = randArr(nVal()).sort((x, y) => x - y), r = Forge.rng(++seed * 17 + Date.now() % 991); const swaps = Math.max(1, Math.floor(a.length / 8)); for (let s = 0; s < swaps; s++) { const k = Math.floor(r() * (a.length - 1)); [a[k], a[k + 1]] = [a[k + 1], a[k]]; } return a; },
  };
  document.querySelectorAll("[data-preset]").forEach((b) => b.addEventListener("click", () => setInput(PRESETS[b.dataset.preset]())));
  $("book").addEventListener("click", () => {
    const key = mode === "single" ? algSel.value : [...raceBox.querySelectorAll("input:checked")][0].value;
    setInput(ALGOS[key].book, `Book example for ${ALGOS[key].name}.`);
  });
  $("n").addEventListener("input", () => { $("nval").textContent = nVal(); });
  $("n").addEventListener("change", () => setInput(PRESETS.random()));
  function loadCustom() {
    const raw = $("inp").value.split(/[\s,;]+/).filter(Boolean);
    const nums = raw.map(Number);
    if (nums.some((x) => !Number.isInteger(x) || x < 0 || x > 999)) { $("msg").textContent = "Please type whole numbers from 0 to 999, separated by commas or spaces."; return; }
    if (nums.length < 2) { $("msg").textContent = "Type at least 2 numbers."; return; }
    const cut = nums.length > 32;
    setInput(nums.slice(0, 32), cut ? "Only the first 32 numbers were kept so the stage stays readable." : "");
  }
  $("load").addEventListener("click", loadCustom);
  $("inp").addEventListener("keydown", (e) => { if (e.key === "Enter") loadCustom(); });
  algSel.addEventListener("change", reload);
  $("part").addEventListener("change", reload);
  $("pivot").addEventListener("change", reload);

  function setMode(m) {
    mode = m;
    $("modeSingle").classList.toggle("on", m === "single");
    $("modeRace").classList.toggle("on", m === "race");
    $("modeSingle").setAttribute("aria-pressed", String(m === "single"));
    $("modeRace").setAttribute("aria-pressed", String(m === "race"));
    $("singleView").hidden = m !== "single";
    $("raceView").hidden = m !== "race";
    $("algField").hidden = m !== "single";
    $("raceRow").hidden = m !== "race";
    $("quickOpts").hidden = m === "single" ? algSel.value !== "quick" : false;
    (m === "single" ? $("slotSingle") : $("slotRace")).appendChild(playerWrap);
    reload();
  }
  $("modeSingle").addEventListener("click", () => setMode("single"));
  $("modeRace").addEventListener("click", () => setMode("race"));

  $("inp").value = input.join(", ");
  setMode(mode);
})();
