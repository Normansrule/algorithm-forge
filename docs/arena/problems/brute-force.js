/* Pack B — Brute Force & Exhaustive Search (Level 1, Levitin Chapter 3).
   Selection/bubble sort, sequential search, string matching, closest pair, convex hull,
   exhaustive search (TSP, knapsack, assignment, partition, magic squares), DFS/BFS.
   Several problems are worked in Problem Set 2 and Practice Exam 1 (practice/).
   Wrapped in an IIFE so helper functions never collide with other packs. */
(function () {
  "use strict";

  /* ---------------- shared helpers (JS oracles & generators) ---------------- */
  const LESSON = "lessons/03-brute-force/README.md";

  function randGraph(r, n, p) {
    const G = Array.from({ length: n }, () => []);
    for (let u = 0; u < n; u++) for (let v = u + 1; v < n; v++) if (r() < p) { G[u].push(v); G[v].push(u); }
    G.forEach((l) => l.sort((a, b) => a - b));
    return G;
  }
  function randForest(r, n, pLink) {
    const G = Array.from({ length: n }, () => []);
    for (let v = 1; v < n; v++) if (r() < pLink) { const u = r.int(0, v - 1); G[u].push(v); G[v].push(u); }
    G.forEach((l) => l.sort((a, b) => a - b));
    return G;
  }
  function randBipartite(r, n, p) {
    const side = Array.from({ length: n }, () => r.int(0, 1));
    const G = Array.from({ length: n }, () => []);
    for (let u = 0; u < n; u++) for (let v = u + 1; v < n; v++) if (side[u] !== side[v] && r() < p) { G[u].push(v); G[v].push(u); }
    G.forEach((l) => l.sort((a, b) => a - b));
    return G;
  }
  function addEdge(G, u, v) {
    if (u === v || G[u].includes(v)) return G;
    G[u].push(v); G[v].push(u);
    G[u].sort((a, b) => a - b); G[v].sort((a, b) => a - b);
    return G;
  }
  const edgeCount = (G) => G.reduce((s, l) => s + l.length, 0) / 2;

  function dfsOrders(G, opts) {
    const o = opts || {};
    const n = G.length, seen = Array(n).fill(false), pre = [], post = [];
    const visit = (v) => {
      seen[v] = true; pre.push(v);
      const nb = o.reverse ? G[v].slice().reverse() : G[v];
      for (const w of nb) if (!seen[w]) visit(w);
      post.push(v);
    };
    for (let v = 0; v < n; v++) { if (!seen[v]) visit(v); if (o.noRestart) break; }
    return [pre, post];
  }
  function bfsOrder(G, opts) {
    const o = opts || {};
    const n = G.length, seen = Array(n).fill(false), order = [];
    for (let s = 0; s < n; s++) {
      if (seen[s]) { continue; }
      seen[s] = true; order.push(s);
      const q = [s];
      while (q.length) {
        const v = q.shift();
        for (const w of G[v]) if (!seen[w]) { seen[w] = true; order.push(w); q.push(w); }
      }
      if (o.noRestart) break;
    }
    return order;
  }
  function componentsOf(G) {
    const n = G.length, comp = Array(n).fill(-1);
    let c = 0;
    for (let s = 0; s < n; s++) {
      if (comp[s] !== -1) continue;
      const st = [s]; comp[s] = c;
      while (st.length) { const v = st.pop(); for (const w of G[v]) if (comp[w] === -1) { comp[w] = c; st.push(w); } }
      c++;
    }
    return { count: c, comp };
  }
  function hasCycle(G, onlyFirst) {
    const n = G.length, seen = Array(n).fill(false);
    const dfs = (v, parent) => {
      seen[v] = true;
      for (const w of G[v]) {
        if (!seen[w]) { if (dfs(w, v)) return true; }
        else if (w !== parent) return true;
      }
      return false;
    };
    for (let s = 0; s < n; s++) { if (!seen[s] && dfs(s, -1)) return true; if (onlyFirst) break; }
    return false;
  }
  function bipartite(G, onlyFirst) {
    const n = G.length, color = Array(n).fill(-1);
    for (let s = 0; s < n; s++) {
      if (color[s] !== -1) continue;
      color[s] = 0; const q = [s];
      while (q.length) {
        const v = q.shift();
        for (const w of G[v]) {
          if (color[w] === -1) { color[w] = 1 - color[v]; q.push(w); }
          else if (color[w] === color[v]) return false;
        }
      }
      if (onlyFirst) break;
    }
    return true;
  }

  function permutations(xs) {
    if (xs.length <= 1) return [xs.slice()];
    const out = [];
    xs.forEach((x, i) => permutations(xs.slice(0, i).concat(xs.slice(i + 1))).forEach((p) => out.push([x].concat(p))));
    return out;
  }
  function randSymMatrix(r, n, lo, hi) {
    const D = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) D[i][j] = D[j][i] = r.int(lo, hi);
    return D;
  }

  /* =========================================================================
     1. Selection sort
     ========================================================================= */
  ForgeProblems.add({
    id: "selection-sort",
    title: "Selection Sort",
    level: 1, chapter: 3, difficulty: 1,
    topics: ["sorting", "brute force", "in-place"],
    strategy: "Brute force",
    source: "Levitin §3.1",
    summary: "Sort an array in place by repeatedly selecting the smallest remaining element — at most n − 1 swaps.",
    statement: `
<p>Selection sort is the most literal sorting algorithm there is: "put the smallest element first, then the next smallest
second, …". It is slow on comparisons but makes very few <b>swaps</b>, which matters when moving data is expensive
(for example, big records or flash memory) (Levitin §3.1).</p>
<p>Sort <code>A[0..n-1]</code> into nondecreasing order <b>in place</b>. On pass <code>i</code> (for <code>i</code> = 0 … n − 2),
find the position of the smallest element in <code>A[i..n-1]</code> and swap it into position <code>i</code>.</p>
<ul>
<li><b>Input:</b> an array of n ≥ 0 integers (duplicates and negatives allowed).</li>
<li><b>Output:</b> the grader checks the array <code>A</code> itself after your algorithm finishes.</li>
<li><b>Efficiency rule:</b> use at most <b>n − 1</b> <code>swap</code> statements — exactly one per pass.</li>
</ul>`,
    entry: "SelectionSort",
    params: ["A"],
    output: { arg: 0 },
    tests: [
      { args: [[89, 45, 68, 90, 29, 34, 17]], expect: [17, 29, 34, 45, 68, 89, 90], explain: "Pass 0 moves 17 to the front, pass 1 moves 29 next, and so on." },
      { args: [[3, 1, 2]], expect: [1, 2, 3], explain: "Two passes are enough for three elements." },
      { args: [[5, -2, 5, 0, -2]], expect: [-2, -2, 0, 5, 5], explain: "Duplicates and negatives just work." },
      { args: [[]], expect: [], name: "Empty array" },
      { args: [[7]], expect: [7], name: "One element" },
      { args: [[1, 2, 3, 4, 5]], expect: [1, 2, 3, 4, 5], name: "Already sorted" },
      { args: [[6, 5, 4, 3, 2, 1]], expect: [1, 2, 3, 4, 5, 6], name: "Reversed" },
      { args: [[2, 9, 1]], expect: [1, 2, 9], name: "Smallest is last" },
    ],
    random: { count: 25, gen: (r, i) => [r.array(2 + (i % 12) * 2, -30, 30)] },
    reference: (A) => A.slice().sort((a, b) => a - b),
    forbid: ["sorted"],
    budget: { metric: "swaps", label: "swaps", limit: (A) => Math.max(0, A.length - 1), hint: "Selection sort swaps once per pass, AFTER the inner loop has found the position of the minimum. If you swap every time you meet a smaller element, you get the right order but up to n²/2 swaps." },
    mutants: [
      { fn: (A) => { const n = A.length; for (let i = 0; i < n - 1; i++) { let m = i; for (let j = i + 1; j < n - 1; j++) if (A[j] < A[m]) m = j; [A[i], A[m]] = [A[m], A[i]]; } return A; }, hint: "The last element never seems to be considered as the minimum. The inner scan must reach index n − 1 (inclusive): for j ← i + 1 to n − 1." },
      { fn: (A) => { const n = A.length; let m = 0; for (let i = 0; i < n - 1; i++) { for (let j = i + 1; j < n; j++) if (A[j] < A[m]) m = j; [A[i], A[m]] = [A[m], A[i]]; } return A; }, hint: "The position of the minimum seems to carry over from the previous pass. Reset it at the start of every pass: min ← i before the inner loop." },
      { fn: (A) => { const n = A.length; for (let i = 0; i < n - 1; i++) { let m = i; for (let j = i + 1; j < n; j++) if (A[j] > A[m]) m = j; [A[i], A[m]] = [A[m], A[i]]; } return A; }, hint: "Your array comes out in DEcreasing order. Check the direction of the comparison that updates min: you want the smaller element." },
    ],
    hints: [
      "After pass i, which part of the array is already final, and why can no later pass disturb it?",
      "Two nested loops: the outer loop picks the slot i to fill (0 to n − 2); the inner loop scans A[i+1..n-1] remembering only the INDEX of the smallest element seen so far.",
      "Start each pass with min ← i. Inside: if A[j] < A[min] then min ← j. After the inner loop ends: swap A[i] and A[min] — once.",
    ],
    starter: {
      pseudo: `ALGORITHM SelectionSort(A[0..n-1])
    // Sorts A in place; at most n - 1 swaps
    for i ← 0 to n - 2 do
        min ← i
        ...
    return A`,
      js: `function SelectionSort(A) {
  // sort A in place (one swap per pass)
  return A;
}`,
    },
    solution: {
      pseudo: `ALGORITHM SelectionSort(A[0..n-1])
    for i ← 0 to n - 2 do
        min ← i
        for j ← i + 1 to n - 1 do
            if A[j] < A[min] then
                min ← j
        swap A[i] and A[min]
    return A`,
      js: `function SelectionSort(A) {
  const n = A.length;
  for (let i = 0; i < n - 1; i++) {
    let min = i;
    for (let j = i + 1; j < n; j++) if (A[j] < A[min]) min = j;
    [A[i], A[min]] = [A[min], A[i]];
  }
  return A;
}`,
      python: `def selection_sort(A):
    n = len(A)
    for i in range(n - 1):
        m = i
        for j in range(i + 1, n):
            if A[j] < A[m]:
                m = j
        A[i], A[m] = A[m], A[i]
    return A`,
      explain: "The comparison A[j] < A[min] runs Σ_{i=0}^{n-2} (n − 1 − i) = n(n − 1)/2 times on EVERY input, so selection sort is Θ(n²) comparisons in best, average and worst case — but only n − 1 swaps, which is Θ(n) and better than almost any other sort.",
    },
    complexity: "Θ(n²) comparisons (always n(n−1)/2), n − 1 swaps",
    followUp: "Selection sort is not stable — find a 3-element input where two equal keys swap their order. Senior twist: the same 'select the extreme, then shrink' loop becomes heapsort once the min is found with a heap in Θ(log n) instead of a Θ(n) scan.",
    distractors: ["for j ← i to n - 2 do", "if A[j] > A[min] then", "swap A[i] and A[j]"],
    visual: "sims/sorting-studio.html",
    lesson: LESSON,
  });

  /* =========================================================================
     2. Bubble sort with early exit
     ========================================================================= */
  const bubbleCmp = (A0) => {
    const A = A0.slice(), n = A.length; let c = 0;
    for (let i = 0; i < n - 1; i++) {
      let sw = false;
      for (let j = 0; j < n - 1 - i; j++) { c++; if (A[j + 1] < A[j]) { [A[j], A[j + 1]] = [A[j + 1], A[j]]; sw = true; } }
      if (!sw) break;
    }
    return c;
  };
  ForgeProblems.add({
    id: "bubble-sort-early-exit",
    title: "Bubble Sort That Knows When to Stop",
    level: 1, chapter: 3, difficulty: 2,
    topics: ["sorting", "brute force", "best case", "counting operations"],
    strategy: "Brute force + early termination",
    source: "Levitin §3.1 & Exercise 3.1.12 (adapted)",
    summary: "Bubble sort that stops as soon as a full pass makes no exchange — graded on comparisons.",
    statement: `
<p>Plain bubble sort always makes <code>n(n − 1)/2</code> comparisons, even on an array that is already sorted.
But if one whole pass makes <b>no exchange</b>, the array is sorted and we can stop (Levitin Exercise 3.1.12).
This turns the best case from Θ(n²) into Θ(n) — a tiny change with a big effect on "almost sorted" data.</p>
<p>Sort <code>A[0..n-1]</code> in nondecreasing order <b>in place</b> by bubble sort: pass <code>i</code> compares
adjacent pairs <code>A[j]</code>, <code>A[j+1]</code> for <code>j</code> = 0 … n − 2 − i and exchanges them when they are out of order.
Stop early after a pass with no exchanges.</p>
<ul>
<li><b>Grading:</b> the array after your algorithm runs, plus a comparison budget — you may make no more element comparisons
than the early-exit bubble sort described above (for example, exactly n − 1 on a sorted array).</li>
</ul>`,
    entry: "BubbleSort",
    params: ["A"],
    output: { arg: 0 },
    tests: [
      { args: [[1, 2, 3, 4, 5, 6]], expect: [1, 2, 3, 4, 5, 6], explain: "Already sorted: one pass of 5 comparisons, no exchanges → stop." },
      { args: [[89, 45, 68, 90, 29, 34, 17]], expect: [17, 29, 34, 45, 68, 89, 90], explain: "Each pass bubbles the largest remaining element to the end." },
      { args: [[2, 1, 3, 4, 5, 6, 7]], expect: [1, 2, 3, 4, 5, 6, 7], explain: "One exchange in pass 0, then pass 1 finds nothing to do: 6 + 5 = 11 comparisons, not 21." },
      { args: [[]], expect: [], name: "Empty array" },
      { args: [[4]], expect: [4], name: "One element" },
      { args: [[5, 4, 3, 2, 1]], expect: [1, 2, 3, 4, 5], name: "Reversed (worst case)" },
      { args: [[3, 3, 1, 3]], expect: [1, 3, 3, 3], name: "Duplicates" },
      { args: [[2, 1]], expect: [1, 2], name: "Two elements" },
    ],
    random: { count: 25, gen: (r, i) => { const n = 2 + (i % 10) * 3; if (i % 3 === 0) { const A = r.sorted(n, -20, 20); const k = r.int(0, n - 2); [A[k], A[k + 1]] = [A[k + 1], A[k]]; return [A]; } return [r.array(n, -20, 20)]; } },
    reference: (A) => A.slice().sort((a, b) => a - b),
    forbid: ["sorted"],
    budget: { metric: "keyComparisons", label: "element comparisons", limit: (A) => bubbleCmp(A), hint: "Too many comparisons. Two things to check: (1) reset your 'did I swap?' flag at the START of every pass and stop when a pass leaves it false; (2) pass i only needs to go up to j = n − 2 − i, because the last i elements are already in their final places." },
    mutants: [
      { fn: (A) => { const n = A.length; for (let i = 0; i < n - 1; i++) { let sw = false; for (let j = 0; j < n - 2 - i; j++) if (A[j + 1] < A[j]) { [A[j], A[j + 1]] = [A[j + 1], A[j]]; sw = true; } if (!sw) break; } return A; }, hint: "The last pair of each pass seems to be skipped, so a large element can get stuck one place from the end. The inner loop must go up to j = n − 2 − i (inclusive), comparing A[j] with A[j + 1]." },
      { fn: (A) => { const n = A.length; for (let i = 0; i < n - 1; i++) { let sw = false; for (let j = 0; j < n - 1 - i; j++) if (A[j + 1] < A[j]) { [A[j], A[j + 1]] = [A[j + 1], A[j]]; sw = true; } if (sw) break; } return A; }, hint: "Only one pass seems to happen. One pass moves the largest element to the end, but the rest may still be unsorted. Check your early-exit test: stop when a pass made NO exchanges (if not swapped), not when it made some." },
    ],
    hints: [
      "If a whole pass compares every adjacent pair and never swaps, what do you know about the array?",
      "Outer loop over passes i = 0 … n − 2. Before each pass set a flag swapped ← false; inside, set it to true whenever you exchange. After the pass, if the flag is still false, stop.",
      "Inner loop: for j ← 0 to n - 2 - i do; if A[j + 1] < A[j] then swap them and set swapped ← true. After it: if not swapped then break.",
    ],
    starter: {
      pseudo: `ALGORITHM BubbleSort(A[0..n-1])
    // Sort A in place; stop after a pass with no exchanges
    for i ← 0 to n - 2 do
        swapped ← false
        ...
    return A`,
      js: `function BubbleSort(A) {
  // sort in place, stop early when a pass makes no swaps
  return A;
}`,
    },
    solution: {
      pseudo: `ALGORITHM BubbleSort(A[0..n-1])
    for i ← 0 to n - 2 do
        swapped ← false
        for j ← 0 to n - 2 - i do
            if A[j + 1] < A[j] then
                swap A[j] and A[j + 1]
                swapped ← true
        if not swapped then
            break
    return A`,
      js: `function BubbleSort(A) {
  const n = A.length;
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - 1 - i; j++)
      if (A[j + 1] < A[j]) { [A[j], A[j + 1]] = [A[j + 1], A[j]]; swapped = true; }
    if (!swapped) break;
  }
  return A;
}`,
      python: `def bubble_sort(A):
    n = len(A)
    for i in range(n - 1):
        swapped = False
        for j in range(n - 1 - i):
            if A[j + 1] < A[j]:
                A[j], A[j + 1] = A[j + 1], A[j]
                swapped = True
        if not swapped:
            break
    return A`,
      explain: "Correctness: a pass with no exchanges means every adjacent pair is in order, so the whole array is sorted. Worst case (reversed input) is unchanged: Σ_{i=0}^{n-2} (n − 1 − i) = n(n − 1)/2 ∈ Θ(n²). Best case (sorted input) drops to one pass of n − 1 comparisons ∈ Θ(n).",
    },
    complexity: "Best n − 1 comparisons, worst n(n − 1)/2 ∈ Θ(n²)",
    followUp: "Go further: remember the index of the LAST exchange in a pass — everything after it is already sorted, so the next pass can stop there. Senior twist: this 'adaptive' idea is why insertion sort and Timsort love nearly-sorted data.",
    distractors: ["for j ← 0 to n - 1 - i do", "if swapped then", "swapped ← true"],
    visual: "sims/sorting-studio.html",
    lesson: LESSON,
  });

  /* =========================================================================
     3. Sequential search with a sentinel (+ count comparisons)
     ========================================================================= */
  const sentinelRef = (A, K) => { const n = A.length; for (let i = 0; i < n; i++) if (A[i] === K) return [i, i + 1]; return [-1, n + 1]; };
  ForgeProblems.add({
    id: "sequential-search-sentinel",
    title: "Sequential Search with a Sentinel",
    level: 1, chapter: 3, difficulty: 1,
    topics: ["searching", "brute force", "counting operations"],
    strategy: "Brute force",
    source: "Levitin §3.2 & Exercise 3.2.1 (adapted)",
    summary: "Find the first K using a sentinel, and report how many key comparisons you made.",
    statement: `
<p>Plain sequential search checks two things per element: "is <code>i</code> still inside the array?" and "is
<code>A[i] = K</code>?". The <b>sentinel</b> trick appends <code>K</code> after the last element, so the search is
<i>guaranteed</i> to stop and the bounds check disappears from the loop (Levitin §3.2).</p>
<p>Write <code>SentinelSearch(A, K)</code> that returns a pair <code>[index, comparisons]</code>:</p>
<ul>
<li><code>index</code> = the position of the <b>first</b> element equal to <code>K</code>, or <code>−1</code> if <code>K</code> is not in the original array;</li>
<li><code>comparisons</code> = how many times the key comparison <code>A[i] ≠ K</code> was evaluated — <i>including</i> the comparison with the sentinel.</li>
</ul>
<p><b>Tip:</b> in Forge Pseudocode, <code>A[n] ← K</code> extends the array by one slot.</p>`,
    entry: "SentinelSearch",
    params: ["A", "K"],
    tests: [
      { args: [[7, 3, 9, 3], 9], expect: [2, 3], explain: "Found at index 2 after comparing with 7, 3 and 9." },
      { args: [[7, 3, 9, 3], 5], expect: [-1, 5], explain: "Not found: 4 real elements + 1 comparison with the sentinel = n + 1 = 5." },
      { args: [[7, 3, 9, 3], 3], expect: [1, 2], explain: "Return the FIRST occurrence." },
      { args: [[], 4], expect: [-1, 1], name: "Empty array", explain: "Only the sentinel is compared." },
      { args: [[4], 4], expect: [0, 1], name: "Found at index 0" },
      { args: [[1, 2, 3, 4, 5, 6], 6], expect: [5, 6], name: "Found at the end" },
      { args: [[-2, -2, 0], 1], expect: [-1, 4], name: "Absent" },
    ],
    random: { count: 25, gen: (r, i) => { const A = r.array(i % 12, 0, 9); return [A, i % 3 === 0 ? 10 + r.int(0, 5) : r.int(0, 9)]; } },
    reference: sentinelRef,
    mutants: [
      { fn: (A, K) => { const n = A.length; for (let i = 0; i < n; i++) if (A[i] === K) return [i, i + 1]; return [n, n + 1]; }, hint: "When K is missing you return n — that's the sentinel's position, not a real match. After the loop, check whether the index you stopped at is < n; if not, report −1." },
      { fn: (A, K) => { const n = A.length; for (let i = 0; i < n; i++) if (A[i] === K) return [i, i]; return [-1, n]; }, hint: "Your comparison count is one too small every time. You're counting only the comparisons that came out 'not equal' — the final comparison that stops the loop (A[i] = K, or the sentinel) counts too." },
      { fn: (A, K) => { const n = A.length; for (let i = 0; i < n; i++) if (A[i] === K) return [i, i + 1]; return [-1, n]; }, hint: "When K is absent you report n comparisons, but the loop also compares with the sentinel A[n] before it stops: that's n + 1." },
    ],
    hints: [
      "Once K sits at A[n], can the loop 'while A[i] ≠ K' ever run off the end of the array?",
      "Put the sentinel in, start i at 0, and advance i while A[i] ≠ K, counting every time the condition is evaluated. Afterwards decide: real match or sentinel?",
      "Count starts at 1 (the comparison that finally stops the loop) and grows by one per step. At the end: if i < n return [i, count], else return [−1, count].",
    ],
    starter: {
      pseudo: `ALGORITHM SentinelSearch(A[0..n-1], K)
    // Output: [index of first K or -1, number of comparisons A[i] ≠ K]
    A[n] ← K
    i ← 0
    ...`,
      js: `function SentinelSearch(A, K) {
  // return [index or -1, comparisons]
}`,
    },
    solution: {
      pseudo: `ALGORITHM SentinelSearch(A[0..n-1], K)
    A[n] ← K
    i ← 0
    count ← 1
    while A[i] ≠ K do
        i ← i + 1
        count ← count + 1
    if i < n then
        return [i, count]
    return [-1, count]`,
      js: `function SentinelSearch(A, K) {
  const n = A.length;
  A.push(K);
  let i = 0, count = 1;
  while (A[i] !== K) { i++; count++; }
  return i < n ? [i, count] : [-1, count];
}`,
      python: `def sentinel_search(A, K):
    n = len(A)
    A.append(K)
    i, count = 0, 1
    while A[i] != K:
        i += 1
        count += 1
    return [i, count] if i < n else [-1, count]`,
      explain: "The loop always stops because K is present at A[n]. A successful search that ends at index i makes i + 1 key comparisons; an unsuccessful one makes n + 1. So C_worst(n) = n + 1 ∈ Θ(n) — the same class as plain sequential search, but each iteration now does one test instead of two.",
    },
    complexity: "Worst case n + 1 key comparisons ∈ Θ(n)",
    followUp: "If the list is SORTED, you can stop as soon as A[i] ≥ K — how does that change the unsuccessful case? Senior twist: sentinels show up in merge (∞ at the end of each run) and in linked lists (dummy head nodes) to delete edge-case branches from hot loops.",
    distractors: ["while i < n and A[i] ≠ K do", "count ← 0", "if i ≤ n then"],
    visual: "sims/string-match.html",
    lesson: LESSON,
  });

  /* =========================================================================
     4. Brute-force string matching
     ========================================================================= */
  const firstMatch = (T, P) => { const n = T.length, m = P.length; for (let i = 0; i <= n - m; i++) { let j = 0; while (j < m && P[j] === T[i + j]) j++; if (j === m) return i; } return -1; };
  const allMatches = (T, P) => { const n = T.length, m = P.length, out = []; for (let i = 0; i <= n - m; i++) { let j = 0; while (j < m && P[j] === T[i + j]) j++; if (j === m) out.push(i); } return out; };
  ForgeProblems.add({
    id: "brute-force-string-match",
    title: "Brute-Force String Matching",
    level: 1, chapter: 3, difficulty: 1,
    topics: ["strings", "pattern matching", "brute force"],
    strategy: "Brute force",
    source: "Levitin §3.2",
    summary: "Return the index of the first occurrence of pattern P in text T (or −1), in at most m(n − m + 1) comparisons.",
    statement: `
<p>Every "Find" box, <code>grep</code>, and deoxyribonucleic acid (DNA) motif search starts here. Align the pattern with the start of the text, compare
character by character left to right, and on the first mismatch slide the pattern one position to the right (Levitin §3.2).</p>
<p>Given a text <code>T[0..n-1]</code> and a pattern <code>P[0..m-1]</code> (strings, m ≥ 1), return the smallest index
<code>i</code> such that <code>T[i..i+m-1] = P</code>, or <code>−1</code> if there is none.</p>
<ul>
<li>Strings are indexable: <code>T[i]</code> is one character; compare characters with <code>=</code>.</li>
<li><b>Budget:</b> at most <code>m(n − m + 1)</code> character comparisons (the textbook's worst case).</li>
</ul>`,
    entry: "StringMatch",
    params: ["T", "P"],
    tests: [
      { args: ["NOBODY_NOTICED_HIM", "NOT"], expect: 7, explain: "\"NOT\" starts at index 7 (after NOBODY_)." },
      { args: ["abcabd", "abd"], expect: 3, explain: "The alignment at 0 fails on the third character; the one at 3 succeeds." },
      { args: ["hello", "xyz"], expect: -1, explain: "No alignment matches." },
      { args: ["abc", "abc"], expect: 0, name: "Pattern = text" },
      { args: ["ab", "abc"], expect: -1, name: "Pattern longer than text" },
      { args: ["aaaab", "ab"], expect: 3, name: "Match at the very end" },
      { args: ["aaaa", "aa"], expect: 0, name: "Several matches → first" },
      { args: ["xyzzy", "y"], expect: 1, name: "One-character pattern" },
    ],
    random: {
      count: 30,
      gen: (r, i) => {
        const T = r.word(5 + (i % 20) * 2, "ab");
        if (i % 3 === 0) { const s = r.int(0, T.length - 2), m = r.int(1, Math.min(4, T.length - s)); return [T, T.slice(s, s + m)]; }
        return [T, r.word(1 + (i % 4), "ab")];
      },
    },
    reference: firstMatch,
    budget: { metric: "keyComparisons", label: "character comparisons", limit: (T, P) => Math.max(0, P.length * (T.length - P.length + 1)), hint: "Stop comparing an alignment at its first mismatch (use a while loop that checks P[j] = T[i + j]), and only try alignments i = 0 … n − m." },
    mutants: [
      { fn: (T, P) => { const n = T.length, m = P.length; for (let i = 0; i < n - m; i++) { let j = 0; while (j < m && P[j] === T[i + j]) j++; if (j === m) return i; } return -1; }, hint: "A match at the very end of the text is missed. The last alignment worth trying is i = n − m, so the outer loop must include it: for i ← 0 to n − m." },
      { fn: (T, P) => (T.length >= P.length ? 0 : -1), hint: "You always report the first alignment. After the inner while loop you still need to check WHY it stopped: only j = m means all m characters matched." },
      { fn: (T, P) => { const i = firstMatch(T, P); return i < 0 ? -1 : i + P.length - 1; }, hint: "You're returning where the match ENDS. The problem wants the index in T where the pattern STARTS (i, not i + m − 1)." },
    ],
    hints: [
      "How many different positions can the pattern be lined up at in a text of length n? What is the last one?",
      "Outer loop over alignments i = 0 … n − m. Inner loop: advance j while j < m and the characters P[j] and T[i + j] agree.",
      "After the inner loop, if j = m the whole pattern matched — return i. If no alignment works, return −1 after the outer loop.",
    ],
    starter: {
      pseudo: `ALGORITHM StringMatch(T[0..n-1], P[0..m-1])
    // Output: index of the first match of P in T, or -1
    for i ← 0 to n - m do
        j ← 0
        ...
    return -1`,
      js: `function StringMatch(T, P) {
  // return the first index where P occurs in T, or -1
}`,
    },
    solution: {
      pseudo: `ALGORITHM StringMatch(T[0..n-1], P[0..m-1])
    for i ← 0 to n - m do
        j ← 0
        while j < m and P[j] = T[i + j] do
            j ← j + 1
        if j = m then
            return i
    return -1`,
      js: `function StringMatch(T, P) {
  const n = T.length, m = P.length;
  for (let i = 0; i <= n - m; i++) {
    let j = 0;
    while (j < m && P[j] === T[i + j]) j++;
    if (j === m) return i;
  }
  return -1;
}`,
      python: `def string_match(T, P):
    n, m = len(T), len(P)
    for i in range(n - m + 1):
        j = 0
        while j < m and P[j] == T[i + j]:
            j += 1
        if j == m:
            return i
    return -1`,
      explain: "There are n − m + 1 alignments and each makes at most m comparisons, so C_worst = m(n − m + 1) ∈ Θ(nm) (e.g. T = aaa…a, P = aa…ab). On natural-language text most alignments fail on the first character, so the average case is close to Θ(n).",
    },
    complexity: "Worst case m(n − m + 1) ∈ Θ(nm); typically ≈ Θ(n)",
    followUp: "Find a text/pattern pair that forces the full m(n − m + 1) comparisons. Senior twist: Horspool, Boyer–Moore and Knuth–Morris–Pratt (KMP) (Levitin Ch 7) skip alignments using preprocessing of the pattern — KMP guarantees Θ(n + m).",
    distractors: ["for i ← 0 to n - 1 do", "while j < m and P[j] = T[j] do", "if j = m - 1 then"],
    visual: "sims/string-match.html",
    lesson: LESSON,
  });

  /* =========================================================================
     5. All match positions
     ========================================================================= */
  ForgeProblems.add({
    id: "all-match-positions",
    title: "Every Place the Pattern Occurs",
    level: 1, chapter: 3, difficulty: 2,
    topics: ["strings", "pattern matching", "brute force"],
    strategy: "Brute force",
    source: "Levitin §3.2 (extension)",
    summary: "List every index where pattern P occurs in text T — overlapping matches included.",
    statement: `
<p>A "Find all" or a deoxyribonucleic acid (DNA) motif count needs <b>every</b> occurrence, not just the first. Modify brute-force string matching so it
keeps going after a match.</p>
<p>Given text <code>T[0..n-1]</code> and pattern <code>P[0..m-1]</code> (m ≥ 1), return the list of all indices <code>i</code>
(in increasing order) with <code>T[i..i+m-1] = P</code>. <b>Overlapping</b> occurrences count: in <code>"aaaa"</code> the pattern
<code>"aa"</code> occurs at 0, 1 and 2. Return <code>[]</code> if there are none.</p>`,
    entry: "AllMatches",
    params: ["T", "P"],
    tests: [
      { args: ["abracadabra", "abra"], expect: [0, 7], explain: "Two occurrences: at the start and at index 7." },
      { args: ["aaaa", "aa"], expect: [0, 1, 2], explain: "Overlapping matches all count." },
      { args: ["hello", "z"], expect: [], explain: "No occurrence → empty list." },
      { args: ["ababab", "abab"], expect: [0, 2], name: "Overlap by two" },
      { args: ["xyz", "xyz"], expect: [0], name: "Pattern = text" },
      { args: ["ab", "abc"], expect: [], name: "Pattern longer than text" },
      { args: ["cabcab", "ab"], expect: [1, 4], name: "Match at the very end" },
    ],
    random: { count: 30, gen: (r, i) => [r.word(4 + (i % 16) * 2, i % 2 ? "ab" : "abc"), r.word(1 + (i % 3), "ab")] },
    reference: allMatches,
    budget: { metric: "keyComparisons", label: "character comparisons", limit: (T, P) => Math.max(0, P.length * (T.length - P.length + 1)), hint: "Each alignment should stop at its first mismatch, and you only need alignments i = 0 … n − m." },
    mutants: [
      { fn: (T, P) => { const n = T.length, m = P.length, out = []; let i = 0; while (i <= n - m) { let j = 0; while (j < m && P[j] === T[i + j]) j++; if (j === m) { out.push(i); i += m; } else i++; } return out; }, hint: "Overlapping occurrences are missing: after a match you jump ahead by m. Slide by just ONE position after every alignment, match or not." },
      { fn: (T, P) => { const n = T.length, m = P.length, out = []; for (let i = 0; i < n - m; i++) { let j = 0; while (j < m && P[j] === T[i + j]) j++; if (j === m) out.push(i); } return out; }, hint: "An occurrence at the very end of the text is missing. The last alignment is i = n − m — include it." },
      { fn: (T, P) => { const i = firstMatch(T, P); return i < 0 ? [] : [i]; }, hint: "You stop after the first match. Instead of returning, append i to a result list and keep scanning." },
    ],
    hints: [
      "What should happen after a successful alignment if you want every occurrence — including ones that overlap it?",
      "Keep the brute-force double loop, but replace 'return i' with 'append(result, i)'. Return the list after the outer loop.",
      "The outer loop still moves one step at a time: for i ← 0 to n − m. Initialize result ← [] before it.",
    ],
    starter: {
      pseudo: `ALGORITHM AllMatches(T[0..n-1], P[0..m-1])
    result ← []
    ...
    return result`,
      js: `function AllMatches(T, P) {
  const result = [];
  // ...
  return result;
}`,
    },
    solution: {
      pseudo: `ALGORITHM AllMatches(T[0..n-1], P[0..m-1])
    result ← []
    for i ← 0 to n - m do
        j ← 0
        while j < m and P[j] = T[i + j] do
            j ← j + 1
        if j = m then
            append(result, i)
    return result`,
      js: `function AllMatches(T, P) {
  const n = T.length, m = P.length, result = [];
  for (let i = 0; i <= n - m; i++) {
    let j = 0;
    while (j < m && P[j] === T[i + j]) j++;
    if (j === m) result.push(i);
  }
  return result;
}`,
      python: `def all_matches(T, P):
    n, m = len(T), len(P)
    result = []
    for i in range(n - m + 1):
        j = 0
        while j < m and P[j] == T[i + j]:
            j += 1
        if j == m:
            result.append(i)
    return result`,
      explain: "Every alignment is tried exactly once, so the worst case is still m(n − m + 1) ∈ Θ(nm) comparisons — the output can hold up to n − m + 1 positions, which the brute force handles for free.",
    },
    complexity: "Θ(nm) worst case",
    followUp: "Senior twist: if you must report non-overlapping matches (like a 'replace all'), jumping by m is correct — know which one your spec wants. For many patterns at once, look up the Aho–Corasick automaton.",
    distractors: ["return i", "i ← i + m", "for i ← 0 to n - m - 1 do"],
    visual: "sims/string-match.html",
    lesson: LESSON,
  });

  /* =========================================================================
     6. Count substrings that start with A and end with B  (Problem Set 2, Problem 2)
     ========================================================================= */
  const countAB = (T) => { let a = 0, c = 0; for (const ch of T) { if (ch === "A") a++; else if (ch === "B") c += a; } return c; };
  ForgeProblems.add({
    id: "count-a-to-b-substrings",
    title: "Substrings from A to B (then make it linear)",
    level: 1, chapter: 3, difficulty: 2,
    topics: ["strings", "counting", "brute force", "optimization"],
    strategy: "Brute force → one pass with a running count",
    source: "Levitin Exercise 3.2.8 (adapted) · Problem Set 2, Problem 2",
    summary: "Count substrings that start with 'A' and end with 'B' — the grader demands Θ(n).",
    statement: `
<p>Count, in a text <code>T[0..n-1]</code>, the number of substrings (contiguous pieces) that <b>start with the character
<code>'A'</code> and end with <code>'B'</code></b>. For example, <code>"CABAAXBYA"</code> has 4 of them:
<code>AB</code>, <code>AXB</code>, <code>AAXB</code>, <code>ABAAXB</code>.</p>
<p><b>Assignment version:</b> the brute-force answer scans for each <code>'A'</code> and counts the <code>'B'</code>s to its right —
Θ(n²) comparisons in the worst case. Write it first if you like and press <b>Run</b>.</p>
<p><b>Senior twist (graded on Submit):</b> your algorithm must do only <b>Θ(n)</b> work. A single left-to-right pass is enough.</p>
<ul><li><b>Input:</b> a string of uppercase letters (possibly empty). <b>Output:</b> an integer.</li></ul>`,
    entry: "CountAtoB",
    params: ["T"],
    tests: [
      { args: ["CABAAXBYA"], expect: 4, explain: "The A at index 1 pairs with both B's (2 substrings); the A's at 3 and 4 each pair with the B at 6." },
      { args: ["AB"], expect: 1, explain: "The whole string." },
      { args: ["BA"], expect: 0, explain: "The B comes before the A — order matters." },
      { args: [""], expect: 0, name: "Empty text" },
      { args: ["AAAB"], expect: 3, name: "Many A's, one B" },
      { args: ["ABBB"], expect: 3, name: "One A, many B's" },
      { args: ["AXBXAXB"], expect: 3, name: "Non-adjacent" },
      { args: ["BBAA"], expect: 0, name: "All B's before all A's" },
    ],
    random: { count: 30, gen: (r, i) => [r.word(i * 2, i % 2 ? "AB" : "ABXC")] },
    reference: countAB,
    growth: { metric: "steps", sizes: [32, 64, 128, 256, 512], gen: (r, n) => [r.word(n, "AB")], expect: "n" },
    mutants: [
      { fn: (T) => { let c = 0; for (let i = 0; i + 1 < T.length; i++) if (T[i] === "A" && T[i + 1] === "B") c++; return c; }, hint: "You're counting only the adjacent pairs \"AB\". A substring may contain any characters between its first A and its last B (e.g. \"AXB\")." },
      { fn: (T) => { let a = 0, b = 0; for (const ch of T) { if (ch === "A") a++; if (ch === "B") b++; } return a * b; }, hint: "It looks like you multiply (#A) × (#B). That ignores order: a B that comes BEFORE an A can't end a substring starting at that A." },
      { fn: (T) => { let b = 0, c = 0; for (const ch of T) { if (ch === "B") b++; else if (ch === "A") c += b; } return c; }, hint: "You're counting substrings that start with B and end with A — the roles are swapped. Keep a running count of A's, and add it when you meet a B." },
    ],
    hints: [
      "Brute force: a substring starting at an A at position i ends at every B to its right. Now flip it around: when you reach a B, how many valid substrings END there?",
      "One left-to-right pass with two counters: aSeen (how many A's so far) and count (the answer so far).",
      "For each character: if it is 'A' then aSeen ← aSeen + 1; else if it is 'B' then count ← count + aSeen.",
    ],
    starter: {
      pseudo: `ALGORITHM CountAtoB(T[0..n-1])
    // number of substrings that start with 'A' and end with 'B' — in Θ(n)
    count ← 0
    ...
    return count`,
      js: `function CountAtoB(T) {
  let count = 0;
  // ...
  return count;
}`,
    },
    solution: {
      pseudo: `ALGORITHM CountAtoB(T[0..n-1])
    count ← 0
    aSeen ← 0
    for i ← 0 to n - 1 do
        if T[i] = 'A' then
            aSeen ← aSeen + 1
        else if T[i] = 'B' then
            count ← count + aSeen
    return count`,
      js: `function CountAtoB(T) {
  let count = 0, aSeen = 0;
  for (const ch of T) {
    if (ch === "A") aSeen++;
    else if (ch === "B") count += aSeen;
  }
  return count;
}`,
      python: `def count_a_to_b(T):
    count = a_seen = 0
    for ch in T:
        if ch == 'A':
            a_seen += 1
        elif ch == 'B':
            count += a_seen
    return count`,
      explain: "Each B at position j ends exactly one valid substring per A before it, so the answer is Σ over B's of (#A's to the left) — one pass, Θ(n). The assignment's brute force (for each A, scan right for B's) compares T[j] with 'B' (n − 1) + (n − 2) + … + 1 + 0 = n(n − 1)/2 ∈ Θ(n²) times on a text of all A's.",
    },
    complexity: "Θ(n) (brute force: Θ(n²))",
    followUp: "Interview version: count pairs i < j with A[i] + A[j] = K, or count 'good pairs' A[i] = A[j] — the same 'count what came before' idea with a hash map. It's the heart of prefix-sum tricks.",
    distractors: ["count ← count + 1", "if T[i] = 'B' then aSeen ← aSeen + 1", "for j ← i + 1 to n - 1 do"],
    visual: "sims/string-match.html",
    lesson: LESSON,
  });

  /* =========================================================================
     7. a^n mod m by brute force  (Problem Set 2, Problem 1)
     ========================================================================= */
  const powMod = (a, n, m) => { let r = 1 % m; const b = a % m; for (let i = 0; i < n; i++) r = (r * b) % m; return r; };
  ForgeProblems.add({
    id: "power-mod",
    title: "Brute-Force aⁿ mod m Without Overflow",
    level: 1, chapter: 3, difficulty: 1,
    topics: ["number theory", "brute force", "modular arithmetic", "input size"],
    strategy: "Brute force",
    source: "Levitin Exercise 3.1.2 (adapted) · Problem Set 2, Problem 1",
    summary: "Compute aⁿ mod m by repeated multiplication, keeping every intermediate value small.",
    statement: `
<p>Computing <code>aⁿ</code> by multiplying <code>a</code> by itself n times is the textbook brute-force example (Levitin §3.1). But
<code>aⁿ</code> itself gets astronomically large — 123456<sup>40</sup> has over 200 digits — so a computer can't hold it exactly.
Cryptography such as Rivest–Shamir–Adleman (RSA) and Diffie–Hellman only ever needs <code>aⁿ mod m</code>, and there is a way around the size problem.</p>
<p>Return <code>aⁿ mod m</code>.</p>
<ul>
<li><b>Input:</b> integers <code>a</code> (1 ≤ a ≤ 10<sup>12</sup>), <code>n</code> (0 ≤ n ≤ 60), <code>m</code> (2 ≤ m ≤ 10<sup>6</sup>).</li>
<li>Numbers are exact only up to about 9·10<sup>15</sup>, so <b>every</b> intermediate value you compute must stay below that.</li>
<li>Don't use <code>^</code> or <code>pow</code> on the full power — that's exactly the overflow the problem is about.</li>
</ul>`,
    entry: "PowerMod",
    params: ["a", "n", "m"],
    tests: [
      { args: [2, 10, 1000], expect: 24, explain: "2¹⁰ = 1024, and 1024 mod 1000 = 24." },
      { args: [3, 5, 7], expect: 5, explain: "3⁵ = 243 = 34·7 + 5." },
      { args: [7, 0, 13], expect: 1, explain: "a⁰ = 1 for any a." },
      { args: [123456, 40, 1000003], expect: 794423, name: "Huge power", explain: "123456⁴⁰ has 204 digits — reduce mod m after every multiplication." },
      { args: [987654321987, 25, 999983], expect: 100379, name: "Huge base", explain: "Even one product a·a overflows; reduce a mod m first." },
      { args: [5, 1, 3], expect: 2, name: "n = 1" },
      { args: [10, 6, 1000000], expect: 0, name: "Result 0" },
      { args: [2, 50, 97], expect: 4 },
    ],
    random: { count: 25, gen: (r, i) => [i % 2 ? r.int(2, 1000000) * r.int(1, 1000000) : r.int(2, 5000), r.int(0, 60), r.int(2, 1000000)] },
    reference: powMod,
    forbid: ["pow"],
    growth: { metric: "arithmetic", sizes: [16, 32, 64, 128, 256], gen: (r, n) => [r.int(2, 1000), n, r.int(2, 1000000)], expect: "n" },
    mutants: [
      { fn: (a, n, m) => Math.pow(a, n) % m, hint: "You're computing aⁿ first and taking mod m at the end. For big inputs aⁿ is far too large to be stored exactly, so the last digits are garbage. Take mod m after EVERY multiplication." },
      { fn: (a, n, m) => { let r = 1 % m; for (let i = 0; i < n; i++) r = (r * a) % m; return r; }, hint: "Close! But when a itself is huge (like 987654321987), result × a overflows before the mod. Reduce the base first: base ← a mod m, then multiply by base." },
      { fn: (a, n, m) => { let r = a % m; for (let i = 0; i < n; i++) r = (r * (a % m)) % m; return r; }, hint: "Your answer looks like aⁿ⁺¹ mod m. If you start with result ← a, loop only n − 1 times — or start with result ← 1 and loop n times (that also handles n = 0)." },
    ],
    hints: [
      "(x · y) mod m = ((x mod m) · (y mod m)) mod m. How large can a number get if you apply this after every step?",
      "Keep a running result that is always in the range 0 … m − 1. Multiply it by (a mod m) n times, reducing each time.",
      "base ← a mod m; result ← 1; for i ← 1 to n do result ← (result * base) mod m. Every product is below m² ≤ 10¹².",
    ],
    starter: {
      pseudo: `ALGORITHM PowerMod(a, n, m)
    // a^n mod m, never letting a number grow past m²
    result ← 1
    ...
    return result`,
      js: `function PowerMod(a, n, m) {
  // a^n mod m without overflow
}`,
    },
    solution: {
      pseudo: `ALGORITHM PowerMod(a, n, m)
    base ← a mod m
    result ← 1
    for i ← 1 to n do
        result ← (result * base) mod m
    return result`,
      js: `function PowerMod(a, n, m) {
  const base = a % m;
  let result = 1;
  for (let i = 1; i <= n; i++) result = (result * base) % m;
  return result;
}`,
      python: `def power_mod(a, n, m):
    base = a % m
    result = 1
    for _ in range(n):
        result = (result * base) % m
    return result`,
      explain: "Invariant: after i steps, result = aⁱ mod m < m, so no product exceeds (m − 1)². It makes M(n) = n multiplications: linear in n, but n has only b ≈ log₂ n bits, so as a function of the INPUT SIZE b it is Θ(2ᵇ) — exponential. That's the answer to Problem Set 2, Problem 1(a).",
    },
    complexity: "Θ(n) multiplications = Θ(2ᵇ) in the bit length b of n",
    followUp: "Senior twist: exponentiation by squaring (Levitin §6.5) computes aⁿ mod m with Θ(log n) multiplications — that's how RSA handles 2048-bit exponents. Python's built-in pow(a, n, m) does exactly this.",
    distractors: ["result ← a", "result ← result * a", "return (a ^ n) mod m"],
    visual: "sims/exhaustive-search.html",
    lesson: LESSON,
  });

  /* =========================================================================
     8. Polynomial evaluation in linear time
     ========================================================================= */
  const polyRef = (P, x) => { let p = P[0], pw = 1; for (let i = 1; i < P.length; i++) { pw *= x; p += P[i] * pw; } return p; };
  ForgeProblems.add({
    id: "polynomial-eval-improved",
    title: "Evaluate a Polynomial in Linear Time",
    level: 1, chapter: 3, difficulty: 1,
    topics: ["polynomials", "brute force", "counting operations"],
    strategy: "Brute force, without repeated work",
    source: "Levitin Exercise 3.1.4 (adapted)",
    summary: "Compute p(x) = P[0] + P[1]x + … + P[n]xⁿ with Θ(n) arithmetic operations.",
    statement: `
<p>The most literal way to evaluate a polynomial recomputes <code>xⁱ</code> from scratch for every term: 1 + 2 + … + n
multiplications, which is Θ(n²). The improved brute force notices that <code>xⁱ = xⁱ⁻¹ · x</code>, so each power costs
just <b>one</b> extra multiplication (Levitin Exercise 3.1.4).</p>
<p>Given coefficients <code>P[0..n]</code> (where <code>P[i]</code> is the coefficient of <code>xⁱ</code>) and a number
<code>x</code>, return <code>p(x)</code>.</p>
<ul>
<li><b>Budget:</b> at most <code>3n</code> arithmetic operations (+, −, ×, ÷) in total.</li>
<li>Don't use <code>^</code> or <code>pow</code> — the point is to build each power from the previous one.</li>
</ul>`,
    entry: "PolyEval",
    params: ["P", "x"],
    tests: [
      { args: [[1, 2, 3], 2], expect: 17, explain: "1 + 2·2 + 3·4 = 17." },
      { args: [[5], 10], expect: 5, explain: "Degree 0: the constant term only." },
      { args: [[2, -1, 0, 3], 3], expect: 80, explain: "2 − 3 + 0 + 3·27 = 80." },
      { args: [[0, 0, 0, 1], -2], expect: -8, name: "Only the top term" },
      { args: [[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], 2], expect: 2047, name: "Degree 10, all ones" },
      { args: [[4, 3, 2, 1], 0], expect: 4, name: "x = 0" },
      { args: [[3, 0, 1, 5, -2], 2], expect: 15, name: "Mixed signs" },
    ],
    random: { count: 25, gen: (r, i) => [r.array(1 + (i % 9), -9, 9), r.int(-3, 3)] },
    reference: polyRef,
    forbid: ["pow"],
    budget: { metric: "arithmetic", label: "arithmetic operations", limit: (P) => 3 * (P.length - 1), hint: "Too much arithmetic: you are probably recomputing xⁱ from scratch for every term. Keep a variable power and update it with ONE multiplication per term: power ← power * x." },
    growth: { metric: "arithmetic", sizes: [16, 32, 64, 128, 256], gen: (r, n) => [r.array(n + 1, -9, 9), r.pick([-1, 1])], expect: "n" },
    mutants: [
      { fn: (P, x) => { const n = P.length - 1; let p = 0; for (let i = 0; i <= n; i++) p += P[i] * Math.pow(x, n - i); return p; }, hint: "Your coefficients are in the wrong order: P[0] is the CONSTANT term (coefficient of x⁰) and P[n] goes with xⁿ." },
      { fn: (P, x) => { let p = P[0], pw = 1; for (let i = 1; i < P.length - 1; i++) { pw *= x; p += P[i] * pw; } return p; }, hint: "The highest term P[n]·xⁿ seems to be missing. The loop must run i ← 1 to n inclusive — there are n + 1 coefficients." },
      { fn: (P, x) => { let p = P[0], pw = 1; for (let i = 1; i < P.length; i++) { p += P[i] * pw; pw *= x; } return p; }, hint: "Each coefficient is multiplied by one power too few (P[1] gets x⁰). Update power ← power * x BEFORE you use it for term i." },
    ],
    hints: [
      "You already know xⁱ⁻¹ when you reach term i. How do you get xⁱ from it in one step?",
      "Keep two running values: the partial sum p and the current power of x. Start with p ← P[0] and power ← 1.",
      "For i ← 1 to n: power ← power * x; then p ← p + P[i] * power. That's 3 operations per term.",
    ],
    starter: {
      pseudo: `ALGORITHM PolyEval(P[0..n], x)
    // p(x) = P[0] + P[1]x + ... + P[n]x^n with Θ(n) operations
    p ← P[0]
    power ← 1
    ...
    return p`,
      js: `function PolyEval(P, x) {
  // P[i] is the coefficient of x^i
}`,
    },
    solution: {
      pseudo: `ALGORITHM PolyEval(P[0..n], x)
    p ← P[0]
    power ← 1
    for i ← 1 to n do
        power ← power * x
        p ← p + P[i] * power
    return p`,
      js: `function PolyEval(P, x) {
  let p = P[0], power = 1;
  for (let i = 1; i < P.length; i++) {
    power *= x;
    p += P[i] * power;
  }
  return p;
}`,
      python: `def poly_eval(P, x):
    p, power = P[0], 1
    for i in range(1, len(P)):
        power *= x
        p += P[i] * power
    return p`,
      explain: "Invariant: after step i, power = xⁱ and p = Σ_{k≤i} P[k]xᵏ. Each step does 2 multiplications and 1 addition: M(n) = 2n, A(n) = n, so Θ(n) — versus Σ_{i=1}^{n} i = n(n + 1)/2 multiplications, Θ(n²), for the version that recomputes every power.",
    },
    complexity: "2n multiplications + n additions ∈ Θ(n)",
    followUp: "Horner's rule (Levitin §6.5) goes right to left — p ← p·x + P[i] — and needs only n multiplications and n additions, which is optimal. Senior twist: it's also how every language parses a decimal string into a number.",
    distractors: ["for i ← 0 to n - 1 do", "p ← p + P[i] * x", "power ← 1"],
    visual: "sims/horner-binexp.html",
    lesson: LESSON,
  });

  /* =========================================================================
     9. Closest pair by brute force (squared distance)
     ========================================================================= */
  const closestSq = (P) => { let best = Infinity; for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) { const dx = P[i][0] - P[j][0], dy = P[i][1] - P[j][1]; best = Math.min(best, dx * dx + dy * dy); } return best; };
  ForgeProblems.add({
    id: "closest-pair-brute",
    title: "Closest Pair of Points (Brute Force)",
    level: 1, chapter: 3, difficulty: 1,
    topics: ["computational geometry", "brute force", "pairs"],
    strategy: "Brute force over all pairs",
    source: "Levitin §3.3",
    summary: "Return the smallest squared distance between two of the n given points.",
    statement: `
<p>Collision detection, clustering and air-traffic control all ask "which two things are closest?". The brute-force answer
checks every pair (Levitin §3.3).</p>
<p>Given <code>n ≥ 2</code> points in the plane as a list <code>P</code> of pairs <code>[x, y]</code> (integers; read them
as <code>P[i][0]</code> and <code>P[i][1]</code>), return the <b>smallest squared Euclidean distance</b>
<code>(xᵢ − xⱼ)² + (yᵢ − yⱼ)²</code> over all pairs <code>i &lt; j</code>. Two points may coincide (distance 0).</p>
<p>Why squared? <code>sqrt</code> is slow and inexact, and the pair with the smallest squared distance is also the pair with the
smallest distance — so we never need it.</p>`,
    entry: "ClosestPair",
    params: ["P"],
    tests: [
      { args: [[[0, 0], [3, 4], [1, 1]]], expect: 2, explain: "(0,0)–(1,1) gives 1² + 1² = 2; the others are 25 and 13." },
      { args: [[[0, 0], [5, 5]]], expect: 50, explain: "Only one pair: 5² + 5² = 50." },
      { args: [[[2, 3], [7, 7], [2, 3]]], expect: 0, explain: "Two points coincide." },
      { args: [[[0, 0], [10, 0], [20, 0], [11, 1]]], expect: 2, name: "Closest pair isn't adjacent in the list" },
      { args: [[[-4, -4], [4, 4], [-1, 2], [3, 0], [-5, 1]]], expect: 17, name: "Negative coordinates" },
      { args: [[[1, 1], [4, 5], [9, 9], [1, 9]]], expect: 25, name: "Distance 5 → 25" },
    ],
    random: { count: 25, gen: (r, i) => { const n = 2 + (i % 14); return [Array.from({ length: n }, () => [r.int(-30, 30), r.int(-30, 30)])]; } },
    reference: closestSq,
    forbid: ["sqrt"],
    mutants: [
      { fn: (P) => 0, hint: "You always get 0 — a point is being compared with itself. Pair i only with j > i: for j ← i + 1 to n − 1." },
      { fn: (P) => { let best = Infinity; for (let i = 0; i + 1 < P.length; i++) { const dx = P[i][0] - P[i + 1][0], dy = P[i][1] - P[i + 1][1]; best = Math.min(best, dx * dx + dy * dy); } return best; }, hint: "You only compare neighbours in the list (P[i] with P[i + 1]). The closest two points can be anywhere in the list — you need a second, nested loop over all j > i." },
      { fn: (P) => { let best = Infinity; for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) best = Math.min(best, Math.abs(P[i][0] - P[j][0]) + Math.abs(P[i][1] - P[j][1])); return best; }, hint: "That looks like the Manhattan distance |dx| + |dy|. This problem wants the squared Euclidean distance dx² + dy²." },
    ],
    hints: [
      "How many pairs of points are there, and how can you list each pair exactly once?",
      "Keep d ← ∞. Loop i from 0 to n − 2 and j from i + 1 to n − 1, computing the squared distance of P[i] and P[j].",
      "dx ← P[i][0] − P[j][0]; dy ← P[i][1] − P[j][1]; if dx*dx + dy*dy < d then d ← that value.",
    ],
    starter: {
      pseudo: `ALGORITHM ClosestPair(P[0..n-1])
    // smallest squared distance between two points P[i] = [x, y]
    d ← ∞
    ...
    return d`,
      js: `function ClosestPair(P) {
  let d = Infinity;
  // ...
  return d;
}`,
    },
    solution: {
      pseudo: `ALGORITHM ClosestPair(P[0..n-1])
    d ← ∞
    for i ← 0 to n - 2 do
        for j ← i + 1 to n - 1 do
            dx ← P[i][0] - P[j][0]
            dy ← P[i][1] - P[j][1]
            if dx * dx + dy * dy < d then
                d ← dx * dx + dy * dy
    return d`,
      js: `function ClosestPair(P) {
  let d = Infinity;
  for (let i = 0; i < P.length - 1; i++)
    for (let j = i + 1; j < P.length; j++) {
      const dx = P[i][0] - P[j][0], dy = P[i][1] - P[j][1];
      if (dx * dx + dy * dy < d) d = dx * dx + dy * dy;
    }
  return d;
}`,
      python: `def closest_pair(P):
    d = float('inf')
    n = len(P)
    for i in range(n - 1):
        for j in range(i + 1, n):
            dx, dy = P[i][0] - P[j][0], P[i][1] - P[j][1]
            d = min(d, dx * dx + dy * dy)
    return d`,
      explain: "The basic operation (one squared-distance computation) runs Σ_{i=0}^{n-2} (n − 1 − i) = n(n − 1)/2 times, so the algorithm is Θ(n²). Dropping sqrt doesn't change the class, but it removes the most expensive and least exact step.",
    },
    complexity: "Θ(n²) — n(n − 1)/2 distance computations",
    followUp: "The divide-and-conquer algorithm (Levitin §5.5) finds the closest pair in Θ(n log n). In one dimension it's even easier: sort, then compare only neighbours. Senior twist: game engines and geographic databases use grids, k-d trees or R-trees for this.",
    distractors: ["for j ← i to n - 1 do", "d ← sqrt(dx * dx + dy * dy)", "d ← 0"],
    visual: "sims/closest-pair-hull.html",
    lesson: LESSON,
  });

  /* =========================================================================
     10. Post office location — minimize the maximum distance  (Problem Set 2, Problem 3)
     ========================================================================= */
  const postCost = (x, p) => Math.max(p - x[0], x[x.length - 1] - p);
  const postBest = (x) => Math.min(...x.map((p) => postCost(x, p)));
  ForgeProblems.add({
    id: "post-office-minmax",
    title: "Post Office on a Straight Road",
    level: 1, chapter: 3, difficulty: 2,
    topics: ["optimization", "brute force", "minimax"],
    strategy: "Brute force, simplified by analysis",
    source: "Levitin Exercise 3.3.3b (adapted) · Problem Set 2, Problem 3",
    summary: "Pick the village that minimizes the maximum distance to all other villages — in linear time.",
    statement: `
<p>Villages sit along a straight road at coordinates <code>x[0] &lt; x[1] &lt; … &lt; x[n-1]</code> (given sorted). A post office must be
built <b>in one of the villages</b>, and we want the farthest village to be as close as possible: choose <code>x[i]</code>
minimizing <code>max over j of |x[j] − x[i]|</code>. This "minimize the worst case" objective is the one used for placing fire
stations and data-center replicas.</p>
<p>Return the coordinate of the best village. If two villages are equally good, either is accepted.</p>
<ul>
<li><b>Input:</b> n ≥ 1 distinct integers in increasing order.</li>
<li><b>Efficiency:</b> your algorithm must be <b>linear</b> (Θ(n)) or better. Checking every candidate against every other
village is Θ(n²) and will be flagged.</li>
</ul>`,
    entry: "PostOffice",
    params: ["x"],
    tests: [
      { args: [[1, 2, 3, 4, 20]], expect: 4, explain: "At 4 the farthest village is 20 (distance 16). At the median 3 it would be 17." },
      { args: [[0, 1, 2, 7, 12]], expect: 7, explain: "The midpoint of the road is 6; village 7 has worst distance 7, village 2 has worst distance 10." },
      { args: [[5]], expect: 5, explain: "Only one village." },
      { args: [[0, 10]], expect: 0, name: "Tie", explain: "Both villages have worst distance 10 — either answer is fine." },
      { args: [[-10, -3, 0, 1, 2]], expect: -3, name: "Negative coordinates" },
      { args: [[0, 4, 5, 6, 10]], expect: 5, name: "A village exactly at the midpoint" },
      { args: [[0, 2, 3, 100]], expect: 3, name: "Far outlier" },
    ],
    random: { count: 30, gen: (r, i) => [r.distinct(1 + (i % 15), -60, 60).sort((a, b) => a - b)] },
    verify: (got, [x]) => {
      if (typeof got !== "number") return "Return one coordinate (a number).";
      if (!x.includes(got)) return `${got} isn't one of the villages — the post office must be built in a village.`;
      const best = postBest(x), mine = postCost(x, got);
      if (mine !== best) return `From village ${got} the farthest village is ${mine} away, but some village achieves ${best}.`;
      return true;
    },
    growth: { metric: "steps", sizes: [32, 64, 128, 256, 512], gen: (r, n) => [r.distinct(n, 0, 20 * n).sort((a, b) => a - b)], expect: "n" },
    mutants: [
      { fn: (x) => x[Math.floor((x.length - 1) / 2)], hint: "You picked the median. The median minimizes the SUM (or average) of distances — part (a) of this exercise. For the MAXIMUM distance only the two end villages matter." },
      { fn: (x) => (x[0] + x[x.length - 1]) / 2, hint: "The midpoint of the road is the ideal spot, but it usually isn't a village. Find the village(s) nearest to that midpoint and compare them." },
      { fn: (x) => { const m = (x[0] + x[x.length - 1]) / 2; let i = 0; while (i + 1 < x.length && x[i + 1] < m) i++; return x[i]; }, hint: "You always take the village just LEFT of the midpoint. The village just to the right can be better — compare both: the left one's worst distance is x[n−1] − x[i], the right one's is x[j] − x[0]." },
    ],
    hints: [
      "For a village at x[i], which other village is always the farthest one? (Only two villages can ever be the farthest.)",
      "So the worst distance from x[i] is max(x[i] − x[0], x[n−1] − x[i]). It's smallest near m = (x[0] + x[n−1]) / 2.",
      "Scan to the first village with x[i] ≥ m. Then compare its worst distance with that of x[i − 1] (if it exists) and return the better one.",
    ],
    starter: {
      pseudo: `ALGORITHM PostOffice(x[0..n-1])
    // x sorted increasingly; return the village minimizing the max distance
    m ← (x[0] + x[n - 1]) / 2
    ...`,
      js: `function PostOffice(x) {
  // return the best village coordinate
}`,
    },
    solution: {
      pseudo: `ALGORITHM PostOffice(x[0..n-1])
    m ← (x[0] + x[n - 1]) / 2
    i ← 0
    while x[i] < m do
        i ← i + 1
    if i > 0 and m - x[i - 1] < x[i] - m then
        return x[i - 1]
    return x[i]`,
      js: `function PostOffice(x) {
  const n = x.length, m = (x[0] + x[n - 1]) / 2;
  let i = 0;
  while (x[i] < m) i++;
  if (i > 0 && m - x[i - 1] < x[i] - m) return x[i - 1];
  return x[i];
}`,
      python: `def post_office(x):
    m = (x[0] + x[-1]) / 2
    i = 0
    while x[i] < m:
        i += 1
    if i > 0 and m - x[i - 1] < x[i] - m:
        return x[i - 1]
    return x[i]`,
      explain: "For village p the worst distance is max(p − x[0], x[n−1] − p) = (x[n−1] − x[0])/2 + |p − m|, so the best village is simply the one closest to the midpoint m. The scan stops by index n − 1 (x[n−1] ≥ m), so it is O(n); since x is sorted, a binary search for m would even make it Θ(log n).",
    },
    complexity: "O(n) scan (Θ(log n) with binary search)",
    followUp: "Part (a) of the exercise minimizes the AVERAGE distance instead — the answer is the median. Senior twist: 'minimize the maximum' vs 'minimize the sum' is the k-center vs k-median distinction in facility-location and content delivery network (CDN) placement problems.",
    distractors: ["return x[n div 2]", "while x[i] ≤ m do", "return m"],
    visual: "sims/closest-pair-hull.html",
    lesson: LESSON,
  });

  /* =========================================================================
     11. Convex hull by brute force
     ========================================================================= */
  const hullRef = (P, opts) => {
    const o = opts || {};
    const n = P.length, on = Array(n).fill(false);
    for (let i = 0; i < n - 1; i++) for (let j = i + 1; j < n; j++) {
      const a = P[j][1] - P[i][1], b = P[i][0] - P[j][0], c = P[i][0] * P[j][1] - P[i][1] * P[j][0];
      let pos = 0, neg = 0;
      for (let k = 0; k < n; k++) { const s = a * P[k][0] + b * P[k][1] - c; if (s > 0) pos++; if (s < 0) neg++; }
      if (o.oneSide ? neg === 0 : (pos === 0 || neg === 0)) { on[i] = true; if (!o.onlyI) on[j] = true; }
    }
    const H = []; on.forEach((f, k) => { if (f) H.push(k); });
    return H;
  };
  const genPoints = (r, n, R) => {
    const P = [];
    let guard = 0;
    while (P.length < n && guard++ < 5000) {
      const q = [r.int(0, R), r.int(0, R)];
      let ok = true;
      for (let a = 0; a < P.length && ok; a++) {
        if (P[a][0] === q[0] && P[a][1] === q[1]) ok = false;
        for (let b = a + 1; b < P.length && ok; b++) if ((P[b][0] - P[a][0]) * (q[1] - P[a][1]) - (P[b][1] - P[a][1]) * (q[0] - P[a][0]) === 0) ok = false;
      }
      if (ok) P.push(q);
    }
    return P;
  };
  ForgeProblems.add({
    id: "convex-hull-brute",
    title: "Extreme Points of the Convex Hull (Brute Force)",
    level: 1, chapter: 3, difficulty: 3,
    topics: ["computational geometry", "brute force", "convex hull"],
    strategy: "Brute force over all segments",
    source: "Levitin §3.3",
    summary: "Return the indices of the points that are corners of the convex hull, testing every segment.",
    statement: `
<p>Stretch a rubber band around a set of nails: the band touches only the <b>extreme points</b> — the corners of the
<b>convex hull</b>. The brute-force idea (Levitin §3.3): the segment between points <code>Pᵢ</code> and <code>Pⱼ</code> lies on the
hull's boundary exactly when <b>all other points are on the same side</b> of the line through them.</p>
<p>For the line through <code>(x₁, y₁)</code> and <code>(x₂, y₂)</code> use <code>a = y₂ − y₁</code>, <code>b = x₁ − x₂</code>,
<code>c = x₁y₂ − y₁x₂</code>. A point <code>(x, y)</code> is on one side if <code>ax + by − c &gt; 0</code> and on the other if
it is <code>&lt; 0</code>.</p>
<p><b>Input:</b> <code>n ≥ 3</code> distinct points <code>P[i] = [x, y]</code> (integers), with <b>no three on a common line</b>.
<b>Output:</b> the list of indices of the extreme points, in any order.</p>`,
    entry: "HullPoints",
    params: ["P"],
    compare: "unordered",
    tests: [
      { args: [[[0, 0], [4, 0], [4, 4], [0, 4], [2, 1]]], expect: [0, 1, 2, 3], explain: "The four corners of the square; (2, 1) is inside." },
      { args: [[[0, 0], [5, 1], [2, 6]]], expect: [0, 1, 2], explain: "Every point of a triangle is extreme." },
      { args: [[[1, 1], [6, 2], [3, 3], [2, 7], [7, 6], [4, 5]]], expect: [0, 1, 3, 4], explain: "(3, 3) and (4, 5) are enclosed by the other four." },
      { args: [[[3, 0], [6, 3], [3, 6], [0, 3], [2, 2], [4, 3], [2, 4]]], expect: [0, 1, 2, 3], name: "Diamond with three inside" },
      { args: [[[0, 0], [10, 1], [11, 9], [2, 10], [-3, 5], [5, 5]]], expect: [0, 1, 2, 3, 4], name: "Pentagon + center" },
      { args: [[[0, 0], [9, 1], [5, 2], [1, 7]]], expect: [0, 1, 3], name: "Triangle with one inside" },
    ],
    random: { count: 20, gen: (r, i) => [genPoints(r, 3 + (i % 10), 30)] },
    reference: (P) => hullRef(P),
    mutants: [
      { fn: (P) => hullRef(P, { oneSide: true }), hint: "Some hull corners are missing. For a boundary segment, the other points may all be on the POSITIVE side or all on the NEGATIVE side — accept either (pos = 0 or neg = 0), since you only look at each pair once." },
      { fn: (P) => { const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]); const s = new Set(); P.forEach((p, k) => { if (p[0] === Math.min(...xs) || p[0] === Math.max(...xs) || p[1] === Math.min(...ys) || p[1] === Math.max(...ys)) s.add(k); }); return [...s].sort((a, b) => a - b); }, hint: "You seem to return the points with the smallest/largest x or y. Those are always on the hull, but a hull can have more corners than that. Test every segment PᵢPⱼ instead." },
      { fn: (P) => hullRef(P, { onlyI: true }), hint: "When a segment PᵢPⱼ is on the boundary, BOTH of its endpoints are extreme points — you're only marking one of them." },
    ],
    hints: [
      "A segment PᵢPⱼ is an edge of the hull exactly when the line through it has no points on one of its two sides. How do you test which side a point is on?",
      "For every pair i < j compute a, b, c; then count how many points k give ax + by − c > 0 and how many give < 0.",
      "If one of the two counts is 0, mark both i and j as extreme. After all pairs, return every marked index.",
    ],
    starter: {
      pseudo: `ALGORITHM HullPoints(P[0..n-1])
    // indices of the extreme points (no three points collinear)
    onHull ← array(n, false)
    for i ← 0 to n - 2 do
        for j ← i + 1 to n - 1 do
            ...
    H ← []
    ...
    return H`,
      js: `function HullPoints(P) {
  // return the indices of the extreme points
}`,
    },
    solution: {
      pseudo: `ALGORITHM HullPoints(P[0..n-1])
    onHull ← array(n, false)
    for i ← 0 to n - 2 do
        for j ← i + 1 to n - 1 do
            a ← P[j][1] - P[i][1]
            b ← P[i][0] - P[j][0]
            c ← P[i][0] * P[j][1] - P[i][1] * P[j][0]
            pos ← 0
            neg ← 0
            for k ← 0 to n - 1 do
                s ← a * P[k][0] + b * P[k][1] - c
                if s > 0 then pos ← pos + 1
                if s < 0 then neg ← neg + 1
            if pos = 0 or neg = 0 then
                onHull[i] ← true
                onHull[j] ← true
    H ← []
    for i ← 0 to n - 1 do
        if onHull[i] then append(H, i)
    return H`,
      js: `function HullPoints(P) {
  const n = P.length, on = Array(n).fill(false);
  for (let i = 0; i < n - 1; i++)
    for (let j = i + 1; j < n; j++) {
      const a = P[j][1] - P[i][1], b = P[i][0] - P[j][0];
      const c = P[i][0] * P[j][1] - P[i][1] * P[j][0];
      let pos = 0, neg = 0;
      for (const [x, y] of P) {
        const s = a * x + b * y - c;
        if (s > 0) pos++;
        if (s < 0) neg++;
      }
      if (pos === 0 || neg === 0) on[i] = on[j] = true;
    }
  const H = [];
  on.forEach((f, k) => { if (f) H.push(k); });
  return H;
}`,
      python: `def hull_points(P):
    n = len(P)
    on = [False] * n
    for i in range(n - 1):
        for j in range(i + 1, n):
            a = P[j][1] - P[i][1]
            b = P[i][0] - P[j][0]
            c = P[i][0] * P[j][1] - P[i][1] * P[j][0]
            s = [a * x + b * y - c for x, y in P]
            if all(v >= 0 for v in s) or all(v <= 0 for v in s):
                on[i] = on[j] = True
    return [k for k in range(n) if on[k]]`,
      explain: "There are n(n − 1)/2 segments and each is tested against all n points, so the algorithm does Θ(n³) sign evaluations. Correctness follows from the characterization: a segment is on the hull's boundary iff the line through it is a supporting line (all points on one side), and the extreme points are exactly the endpoints of those segments.",
    },
    complexity: "Θ(n³)",
    followUp: "Quickhull (Levitin §5.5) and Graham scan or Andrew's monotone chain do this in Θ(n log n). Senior twist: real inputs DO have collinear points and floating-point coordinates — robust geometry code uses exact integer cross products like the ones here.",
    distractors: ["if pos = 0 and neg = 0 then", "for j ← 0 to n - 1 do", "onHull[k] ← true"],
    visual: "sims/closest-pair-hull.html",
    lesson: LESSON,
  });

  /* =========================================================================
     12. Is it a magic square?
     ========================================================================= */
  const magicCheck = (M, opts) => {
    const o = opts || {};
    const n = M.length, T = n * (n * n + 1) / 2;
    const target = o.equalOnly ? M[0].reduce((a, b) => a + b, 0) : T;
    if (!o.noNumbers && !o.equalOnly) {
      const seen = new Set();
      for (const row of M) for (const v of row) { if (v < 1 || v > n * n || seen.has(v)) return false; seen.add(v); }
    }
    for (let i = 0; i < n; i++) {
      let rs = 0, cs = 0;
      for (let j = 0; j < n; j++) { rs += M[i][j]; cs += M[j][i]; }
      if (rs !== target || cs !== target) return false;
    }
    if (o.noDiag) return true;
    let d1 = 0, d2 = 0;
    for (let i = 0; i < n; i++) { d1 += M[i][i]; d2 += M[i][n - 1 - i]; }
    return o.mainOnly ? d1 === target : d1 === target && d2 === target;
  };
  const LO_SHU = [[2, 7, 6], [9, 5, 1], [4, 3, 8]];
  const DURER = [[16, 3, 2, 13], [5, 10, 11, 8], [9, 6, 7, 12], [4, 15, 14, 1]];
  const siamese = (n) => { const M = Array.from({ length: n }, () => Array(n).fill(0)); let i = 0, j = (n - 1) / 2; for (let k = 1; k <= n * n; k++) { M[i][j] = k; const ni = (i - 1 + n) % n, nj = (j + 1) % n; if (M[ni][nj]) i = (i + 1) % n; else { i = ni; j = nj; } } return M; };
  const symmetries = (M) => { const n = M.length; const rot = (A) => A.map((_, i) => A.map((row) => row[i]).reverse()); const out = []; let A = M; for (let k = 0; k < 4; k++) { out.push(A); out.push(A.map((row) => row.slice().reverse())); A = rot(A); } return out; };
  ForgeProblems.add({
    id: "magic-square-check",
    title: "Is It a Magic Square?",
    level: 1, chapter: 3, difficulty: 1,
    topics: ["matrices", "brute force", "verification"],
    strategy: "Check the definition directly",
    source: "Levitin Exercise 3.4.10 (adapted) · Practice Exam 1, Problem B3",
    summary: "Check whether an n×n matrix is a magic square: numbers 1..n² once each, and every row, column and both diagonals sum to n(n² + 1)/2.",
    statement: `
<p>A <b>magic square</b> of order n holds the numbers <code>1, 2, …, n²</code>, each <b>exactly once</b>, arranged so that every row,
every column and both main diagonals have the same sum. Adding all n² numbers gives n²(n² + 1)/2, split evenly over n rows, so that
common sum must be <code>n(n² + 1)/2</code> — 15 for n = 3, 34 for n = 4 (Practice Exam 1, Problem B3a; Levitin Exercise 3.4.10).</p>
<p>Before you can <i>search</i> for magic squares you need a checker. Given an n×n matrix <code>M</code> (n ≥ 1, integers, read as
<code>M[i][j]</code>), return <code>true</code> if it is a magic square and <code>false</code> otherwise.</p>`,
    entry: "IsMagic",
    params: ["M"],
    tests: [
      { args: [[[2, 7, 6], [9, 5, 1], [4, 3, 8]]], expect: true, explain: "The Lo Shu square: every line sums to 15." },
      { args: [[[5, 5, 5], [5, 5, 5], [5, 5, 5]]], expect: false, explain: "All lines sum to 15, but it doesn't use 1..9 once each." },
      { args: [[[9, 5, 1], [2, 7, 6], [4, 3, 8]]], expect: false, explain: "Rows and columns sum to 15, but the diagonal 9 + 7 + 8 = 24." },
      { args: [[[1]]], expect: true, name: "Order 1" },
      { args: [[[1, 2], [3, 4]]], expect: false, name: "Order 2 (no magic square exists)" },
      { args: [DURER], expect: true, name: "Dürer's 4×4 square (sum 34)" },
      { args: [[[2, 4, 9], [6, 8, 1], [7, 3, 5]]], expect: false, name: "Only the anti-diagonal fails" },
      { args: [[[3, 8, 7], [10, 6, 2], [5, 4, 9]]], expect: false, name: "Lo Shu + 1: all lines equal 18, but numbers are 2..10" },
    ],
    random: {
      count: 25,
      gen: (r, i) => {
        const base = r.pick([LO_SHU, DURER, siamese(5), LO_SHU]);
        const M = r.pick(symmetries(base)).map((row) => row.slice());
        const n = M.length, kind = i % 4;
        if (kind === 1) { const a = r.int(0, n - 1), b = r.int(0, n - 1), c = r.int(0, n - 1), d = r.int(0, n - 1); [M[a][b], M[c][d]] = [M[c][d], M[a][b]]; }
        else if (kind === 2) { const a = r.int(0, n - 2); [M[a], M[a + 1]] = [M[a + 1], M[a]]; }
        else if (kind === 3) { M[r.int(0, n - 1)][r.int(0, n - 1)] = r.int(1, n * n); }
        return [M];
      },
    },
    reference: (M) => magicCheck(M),
    mutants: [
      { fn: (M) => magicCheck(M, { noNumbers: true }), hint: "A square full of 5's passes your check. Line sums aren't enough: also verify each number is between 1 and n² and appears only once (a seen[1..n²] array works)." },
      { fn: (M) => magicCheck(M, { noDiag: true }), hint: "You check rows and columns but not the two diagonals — swapping two rows keeps every row and column sum, yet breaks the diagonals." },
      { fn: (M) => magicCheck(M, { mainOnly: true }), hint: "You check the main diagonal M[i][i], but the other diagonal M[i][n − 1 − i] must also sum to n(n² + 1)/2." },
      { fn: (M) => magicCheck(M, { equalOnly: true }), hint: "You only check that all lines have EQUAL sums. The numbers must be exactly 1..n² — e.g. adding 1 to every cell keeps all sums equal but isn't a magic square." },
    ],
    hints: [
      "The definition has two parts: which numbers appear, and what the line sums are. Which sum is required for order n?",
      "Pass 1: a seen array of size n² + 1 — reject any value outside 1..n² or seen twice. Pass 2: row i, column i, and the two diagonals must each equal n(n² + 1)/2.",
      "In one loop over i you can accumulate row i (M[i][j]), column i (M[j][i]), the main diagonal M[i][i] and the anti-diagonal M[i][n − 1 − i].",
    ],
    starter: {
      pseudo: `ALGORITHM IsMagic(M[0..n-1, 0..n-1])
    target ← n * (n * n + 1) / 2
    seen ← array(n * n + 1, false)
    ...
    return true`,
      js: `function IsMagic(M) {
  const n = M.length, target = n * (n * n + 1) / 2;
  // ...
}`,
    },
    solution: {
      pseudo: `ALGORITHM IsMagic(M[0..n-1, 0..n-1])
    target ← n * (n * n + 1) / 2
    seen ← array(n * n + 1, false)
    d1 ← 0
    d2 ← 0
    for i ← 0 to n - 1 do
        rowSum ← 0
        colSum ← 0
        for j ← 0 to n - 1 do
            v ← M[i][j]
            if v < 1 or v > n * n or seen[v] then return false
            seen[v] ← true
            rowSum ← rowSum + v
            colSum ← colSum + M[j][i]
        if rowSum ≠ target or colSum ≠ target then return false
        d1 ← d1 + M[i][i]
        d2 ← d2 + M[i][n - 1 - i]
    return d1 = target and d2 = target`,
      js: `function IsMagic(M) {
  const n = M.length, target = n * (n * n + 1) / 2;
  const seen = Array(n * n + 1).fill(false);
  let d1 = 0, d2 = 0;
  for (let i = 0; i < n; i++) {
    let rowSum = 0, colSum = 0;
    for (let j = 0; j < n; j++) {
      const v = M[i][j];
      if (v < 1 || v > n * n || seen[v]) return false;
      seen[v] = true;
      rowSum += v;
      colSum += M[j][i];
    }
    if (rowSum !== target || colSum !== target) return false;
    d1 += M[i][i];
    d2 += M[i][n - 1 - i];
  }
  return d1 === target && d2 === target;
}`,
      python: `def is_magic(M):
    n = len(M)
    target = n * (n * n + 1) // 2
    seen = set()
    for row in M:
        for v in row:
            if not (1 <= v <= n * n) or v in seen:
                return False
            seen.add(v)
    lines = [sum(r) for r in M] + [sum(M[j][i] for j in range(n)) for i in range(n)]
    lines += [sum(M[i][i] for i in range(n)), sum(M[i][n - 1 - i] for i in range(n))]
    return all(s == target for s in lines)`,
      explain: "Each of the n² cells is read a constant number of times (once as a row entry, once as a column entry, at most twice on a diagonal), so the check is Θ(n²) — linear in the size of the input matrix, which is optimal.",
    },
    complexity: "Θ(n²) = linear in the number of cells",
    followUp: "This checker is the 'test' half of exhaustive search: the classic exam problem asks you to generate all (n²)! arrangements and keep the ones that pass. Try magic-squares-3x3-count next. Senior twist: 'write the verifier first' is also how you think about Nondeterministic Polynomial (NP) problems (Levitin Ch 11).",
    distractors: ["target ← n * n", "colSum ← colSum + M[i][j]", "d2 ← d2 + M[i][n - i]"],
    visual: "sims/exhaustive-search.html",
    lesson: LESSON,
  });

  /* =========================================================================
     13. Knapsack by exhaustive search
     ========================================================================= */
  const knapRef = (w, v, W, strict) => {
    const n = w.length; let best = 0;
    for (let mask = 0; mask < 1 << n; mask++) {
      let tw = 0, tv = 0;
      for (let i = 0; i < n; i++) if (mask & (1 << i)) { tw += w[i]; tv += v[i]; }
      if ((strict ? tw < W : tw <= W) && tv > best) best = tv;
    }
    return best;
  };
  const knapGreedy = (w, v, W, key) => {
    const idx = w.map((_, i) => i).sort((a, b) => key(b) - key(a) || a - b);
    let cap = W, val = 0;
    for (const i of idx) if (w[i] <= cap) { cap -= w[i]; val += v[i]; }
    return val;
  };
  ForgeProblems.add({
    id: "knapsack-exhaustive",
    title: "0/1 Knapsack by Exhaustive Search",
    level: 1, chapter: 3, difficulty: 2,
    topics: ["exhaustive search", "subsets", "optimization", "knapsack"],
    strategy: "Exhaustive search over all 2ⁿ subsets",
    source: "Levitin §3.4",
    summary: "Find the largest total value of items that fit in a knapsack of capacity W by trying every subset.",
    statement: `
<p>You have n items with weights <code>w[i]</code> and values <code>v[i]</code>, and a knapsack that holds total weight at most
<code>W</code>. Each item is taken whole or not at all ("0/1"). Which subset is worth the most? This models budgeting, cargo loading,
and choosing features for a release (Levitin §3.4).</p>
<p>Exhaustive search: generate <b>every subset</b> of the items, skip the ones that are too heavy (<i>infeasible</i>), and remember the
best value among the rest.</p>
<ul>
<li><b>Input:</b> arrays <code>w[0..n-1]</code>, <code>v[0..n-1]</code> of positive integers (0 ≤ n ≤ 10) and an integer
<code>W ≥ 0</code>.</li>
<li><b>Output:</b> the maximum total value (0 if nothing fits).</li>
<li><b>Tip:</b> the numbers 0 … 2ⁿ − 1 written in binary are exactly the 2ⁿ subsets — bit i says whether item i is in.</li>
</ul>`,
    entry: "Knapsack",
    params: ["w", "v", "W"],
    tests: [
      { args: [[2, 5, 10, 5], [20, 30, 50, 10], 16], expect: 80, explain: "The classic instance: items 2 and 3 (weights 5 + 10 = 15) are worth $80." },
      { args: [[3, 2, 2], [5, 3, 3], 4], expect: 6, explain: "Greedy by value per weight grabs the 3-kg item ($5) and is stuck; the two 2-kg items give $6." },
      { args: [[4, 6], [5, 7], 10], expect: 12, explain: "Both items fit exactly: total weight 10 ≤ W is allowed." },
      { args: [[5, 6], [10, 20], 4], expect: 0, name: "Nothing fits" },
      { args: [[], [], 7], expect: 0, name: "No items" },
      { args: [[5, 3, 3], [6, 4, 4], 6], expect: 8, name: "Most valuable item is a trap" },
      { args: [[1, 1, 1], [1, 2, 3], 0], expect: 0, name: "Capacity 0" },
    ],
    random: {
      count: 20,
      gen: (r, i) => { const n = 1 + (i % 10); const w = r.array(n, 1, 12); return [w, r.array(n, 1, 30), r.int(0, Math.floor(w.reduce((a, b) => a + b, 0) * 0.6))]; },
    },
    reference: (w, v, W) => knapRef(w, v, W),
    mutants: [
      { fn: (w, v, W) => knapGreedy(w, v, W, (i) => v[i] / w[i]), hint: "Your answer matches the greedy rule 'best value per kilogram first'. Greedy is not optimal for 0/1 knapsack — you must really try every subset." },
      { fn: (w, v, W) => knapGreedy(w, v, W, (i) => v[i]), hint: "Your answer matches 'take the most valuable item first'. A heavy valuable item can block a better combination — generate all subsets instead of choosing greedily." },
      { fn: (w, v, W) => knapRef(w, v, W, true), hint: "A subset whose weight equals W exactly is being rejected. Feasible means total weight ≤ W." },
    ],
    hints: [
      "How many subsets do n items have, and how could you visit each exactly once?",
      "Loop mask from 0 to 2ⁿ − 1. For each mask, walk i = 0 … n − 1 and use the bits of mask to add up the weight and value of the chosen items.",
      "Read bit i by repeatedly taking b mod 2 and then b ← b div 2. After the inner loop: if weight ≤ W and value > best then best ← value.",
    ],
    starter: {
      pseudo: `ALGORITHM Knapsack(w[0..n-1], v[0..n-1], W)
    best ← 0
    for mask ← 0 to 2^n - 1 do
        ...
    return best`,
      js: `function Knapsack(w, v, W) {
  let best = 0;
  // try every subset
  return best;
}`,
    },
    solution: {
      pseudo: `ALGORITHM Knapsack(w[0..n-1], v[0..n-1], W)
    best ← 0
    for mask ← 0 to 2^n - 1 do
        weight ← 0
        value ← 0
        b ← mask
        for i ← 0 to n - 1 do
            if b mod 2 = 1 then
                weight ← weight + w[i]
                value ← value + v[i]
            b ← b div 2
        if weight ≤ W and value > best then
            best ← value
    return best`,
      js: `function Knapsack(w, v, W) {
  const n = w.length;
  let best = 0;
  for (let mask = 0; mask < (1 << n); mask++) {
    let weight = 0, value = 0;
    for (let i = 0; i < n; i++)
      if (mask & (1 << i)) { weight += w[i]; value += v[i]; }
    if (weight <= W && value > best) best = value;
  }
  return best;
}`,
      python: `def knapsack(w, v, W):
    n, best = len(w), 0
    for mask in range(1 << n):
        weight = sum(w[i] for i in range(n) if mask >> i & 1)
        value = sum(v[i] for i in range(n) if mask >> i & 1)
        if weight <= W and value > best:
            best = value
    return best`,
      explain: "Every subset is examined, so the optimum can't be missed. There are 2ⁿ subsets and each costs Θ(n) to evaluate: Θ(n·2ⁿ). Knapsack is Nondeterministic Polynomial (NP)-hard, so no polynomial algorithm is known — but see the dynamic-programming version.",
    },
    complexity: "Θ(n·2ⁿ)",
    followUp: "Dynamic programming (Levitin §8.2) solves it in Θ(nW) — fast when W is small. Senior twist: that's 'pseudo-polynomial'; for huge W, branch-and-bound (Levitin §12.2) prunes subsets that can't beat the best so far.",
    distractors: ["if weight < W and value > best then", "for mask ← 1 to 2^n do", "b ← b mod 2"],
    visual: "sims/exhaustive-search.html",
    lesson: LESSON,
  });

  /* =========================================================================
     14. Traveling salesman by exhaustive search
     ========================================================================= */
  const tspRef = (D, noReturn) => {
    const n = D.length; if (n <= 1) return 0;
    let best = Infinity;
    for (const p of permutations([...Array(n - 1).keys()].map((k) => k + 1))) {
      let c = 0, cur = 0;
      for (const x of p) { c += D[cur][x]; cur = x; }
      if (!noReturn) c += D[cur][0];
      if (c < best) best = c;
    }
    return best;
  };
  const tspNearest = (D) => {
    const n = D.length; if (n <= 1) return 0;
    const used = Array(n).fill(false); used[0] = true; let cur = 0, c = 0;
    for (let k = 1; k < n; k++) { let nx = -1; for (let j = 0; j < n; j++) if (!used[j] && (nx < 0 || D[cur][j] < D[cur][nx])) nx = j; used[nx] = true; c += D[cur][nx]; cur = nx; }
    return c + D[cur][0];
  };
  ForgeProblems.add({
    id: "tsp-exhaustive",
    title: "Traveling Salesman by Exhaustive Search",
    level: 1, chapter: 3, difficulty: 3,
    topics: ["exhaustive search", "permutations", "graphs", "TSP"],
    strategy: "Exhaustive search over all tours",
    source: "Levitin §3.4",
    summary: "Find the length of the shortest tour that starts at city 0, visits every city once and returns.",
    statement: `
<p>The <b>Traveling Salesman Problem (TSP)</b>: given n cities and the distance between every pair, find the shortest round trip
that visits each city exactly once and returns to the start. It models delivery routes, drilling holes in circuit boards and
deoxyribonucleic acid (DNA) sequencing, and it is the most famous hard problem there is (Levitin §3.4).</p>
<p>Exhaustive search: fix city 0 as the start, generate every ordering of the other n − 1 cities, add up each tour's length
(including the edge back to city 0), and keep the minimum.</p>
<ul>
<li><b>Input:</b> a symmetric n×n matrix <code>D</code> (1 ≤ n ≤ 7) with <code>D[i][j]</code> = distance between cities i and j and
<code>D[i][i] = 0</code>.</li>
<li><b>Output:</b> the length of a shortest tour (0 when n = 1).</li>
<li><b>Tip:</b> a recursive helper that extends a partial tour with every unused city is the cleanest way to generate permutations.
Helpers can take the arrays as extra parameters.</li>
</ul>`,
    entry: "TSP",
    params: ["D"],
    tests: [
      { args: [[[0, 2, 8, 5], [2, 0, 3, 4], [8, 3, 0, 7], [5, 4, 7, 0]]], expect: 17, explain: "A small 4-city example: a→b→c→d→a = 2 + 3 + 7 + 5 = 17." },
      { args: [[[0, 6], [6, 0]]], expect: 12, explain: "Two cities: go there and come back." },
      { args: [[[0]]], expect: 0, explain: "One city: the empty tour." },
      { args: [[[0, 3, 4], [3, 0, 5], [4, 5, 0]]], expect: 12, name: "Three cities: only one tour" },
      { args: [[[0, 1, 9, 9, 2], [1, 0, 1, 9, 9], [9, 1, 0, 1, 9], [9, 9, 1, 0, 30], [2, 9, 9, 30, 0]]], expect: 22, name: "Nearest-neighbour trap" },
      { args: [[[0, 5, 1, 5], [5, 0, 5, 1], [1, 5, 0, 5], [5, 1, 5, 0]]], expect: 12, name: "Visiting in index order is not best" },
    ],
    random: { count: 16, gen: (r, i) => [randSymMatrix(r, 2 + (i % 6), 1, 20)] },
    reference: (D) => tspRef(D),
    mutants: [
      { fn: (D) => tspRef(D, true), hint: "Your lengths are too short: they look like PATHS. A tour must return to city 0 — add D[last][0] when the permutation is complete." },
      { fn: tspNearest, hint: "Your answer matches the nearest-neighbour heuristic (always go to the closest unvisited city). That's fast but not always optimal — exhaustive search must try EVERY ordering." },
      { fn: (D) => { const n = D.length; let c = 0; for (let i = 0; i < n - 1; i++) c += D[i][i + 1]; return n > 1 ? c + D[n - 1][0] : 0; }, hint: "You only measure the tour 0 → 1 → 2 → … → n − 1 → 0. Generate all (n − 1)! orders of the cities 1 … n − 1 and keep the cheapest." },
    ],
    hints: [
      "Why is it enough to always start at city 0? How many different tours does that leave?",
      "Write a recursive helper Tour(D, n, used, city, count, cost): if count = n, the tour is complete — return cost + D[city][0]. Otherwise try every unused next city.",
      "In the helper: for next ← 1 to n − 1, if not used[next] then mark it, recurse with count + 1 and cost + D[city][next], take the min, then unmark it (backtrack).",
    ],
    starter: {
      pseudo: `ALGORITHM TSP(D[0..n-1, 0..n-1])
    used ← array(n, false)
    used[0] ← true
    return Tour(D, n, used, 0, 1, 0)

ALGORITHM Tour(D, n, used, city, count, cost)
    // count cities placed so far; cost of the path so far
    ...`,
      js: `function TSP(D) {
  const n = D.length;
  // try every order of cities 1..n-1
}`,
    },
    solution: {
      pseudo: `ALGORITHM TSP(D[0..n-1, 0..n-1])
    used ← array(n, false)
    used[0] ← true
    return Tour(D, n, used, 0, 1, 0)

ALGORITHM Tour(D, n, used, city, count, cost)
    if count = n then
        return cost + D[city][0]
    best ← ∞
    for next ← 1 to n - 1 do
        if not used[next] then
            used[next] ← true
            best ← min(best, Tour(D, n, used, next, count + 1, cost + D[city][next]))
            used[next] ← false
    return best`,
      js: `function TSP(D) {
  const n = D.length, used = Array(n).fill(false);
  used[0] = true;
  function tour(city, count, cost) {
    if (count === n) return cost + D[city][0];
    let best = Infinity;
    for (let next = 1; next < n; next++) if (!used[next]) {
      used[next] = true;
      best = Math.min(best, tour(next, count + 1, cost + D[city][next]));
      used[next] = false;
    }
    return best;
  }
  return tour(0, 1, 0);
}`,
      python: `def tsp(D):
    n = len(D)
    used = [False] * n
    used[0] = True
    def tour(city, count, cost):
        if count == n:
            return cost + D[city][0]
        best = float('inf')
        for nxt in range(1, n):
            if not used[nxt]:
                used[nxt] = True
                best = min(best, tour(nxt, count + 1, cost + D[city][nxt]))
                used[nxt] = False
        return best
    return tour(0, 1, 0)`,
      explain: "Fixing the start leaves (n − 1)! tours, and the recursion builds each in O(n) (sharing prefixes), so the search is Θ(n!) — already about 40,000 tours for n = 9 and 10¹⁵ for n = 18. Levitin notes symmetric tours come in reversed pairs, which halves the count to (n − 1)!/2 but doesn't change the class.",
    },
    complexity: "Θ(n!) — (n − 1)! tours",
    followUp: "Held–Karp dynamic programming does it in Θ(n²·2ⁿ) (see held-karp-tsp); branch-and-bound and approximation algorithms (Levitin Ch 12) handle bigger n. Senior twist: routing software solves 'real' TSPs with local search (2-opt) and accepts near-optimal answers.",
    distractors: ["return cost", "for next ← 0 to n - 1 do", "best ← 0"],
    visual: "sims/exhaustive-search.html",
    lesson: LESSON,
  });

  /* =========================================================================
     15. Assignment problem by exhaustive search
     ========================================================================= */
  const assignRef = (C) => { const n = C.length; if (!n) return 0; let best = Infinity; for (const p of permutations([...Array(n).keys()])) { let c = 0; p.forEach((j, i) => (c += C[i][j])); best = Math.min(best, c); } return best; };
  ForgeProblems.add({
    id: "assignment-exhaustive",
    title: "Assignment Problem by Exhaustive Search",
    level: 1, chapter: 3, difficulty: 3,
    topics: ["exhaustive search", "permutations", "optimization"],
    strategy: "Exhaustive search over all n! assignments",
    source: "Levitin §3.4",
    summary: "Assign n people to n jobs (one each) to minimize total cost, by trying every permutation.",
    statement: `
<p>n people must be assigned to n jobs, one person per job and one job per person. Assigning person <code>i</code> to job
<code>j</code> costs <code>C[i][j]</code>. Find the <b>minimum total cost</b> (Levitin §3.4). Think: matching drivers to riders,
tasks to servers, or teaching assistants (TAs) to lab sections.</p>
<p>An assignment is just a permutation: person i gets job <code>p[i]</code>. Exhaustive search tries all n! permutations,
computes each total <code>C[0][p[0]] + … + C[n−1][p[n−1]]</code>, and keeps the smallest.</p>
<ul>
<li><b>Input:</b> an n×n cost matrix <code>C</code> of non-negative integers, 1 ≤ n ≤ 6.</li>
<li><b>Output:</b> the minimum total cost.</li>
</ul>`,
    entry: "Assignment",
    params: ["C"],
    tests: [
      { args: [[[9, 2, 7, 8], [6, 4, 3, 7], [5, 8, 1, 8], [7, 6, 9, 4]]], expect: 13, explain: "The Levitin §3.4 matrix: person 0→job 1, 1→job 0, 2→job 2, 3→job 3 gives 2 + 6 + 1 + 4 = 13." },
      { args: [[[5]]], expect: 5, explain: "One person, one job." },
      { args: [[[1, 2], [3, 9]]], expect: 5, explain: "Person 0 must NOT take their cheapest job 0: 2 + 3 = 5 beats 1 + 9 = 10." },
      { args: [[[4, 1, 3], [2, 0, 5], [3, 2, 2]]], expect: 5, name: "Two people want the same job" },
      { args: [[[7, 7, 7], [7, 7, 7], [7, 7, 7]]], expect: 21, name: "All equal" },
      { args: [[[1, 9, 9], [9, 1, 9], [9, 9, 1]]], expect: 3, name: "Diagonal is best" },
    ],
    random: { count: 16, gen: (r, i) => { const n = 1 + (i % 6); return [Array.from({ length: n }, () => r.array(n, 0, 15))]; } },
    reference: assignRef,
    mutants: [
      { fn: (C) => { const n = C.length, used = Array(n).fill(false); let c = 0; for (let i = 0; i < n; i++) { let bj = -1; for (let j = 0; j < n; j++) if (!used[j] && (bj < 0 || C[i][j] < C[i][bj])) bj = j; used[bj] = true; c += C[i][bj]; } return c; }, hint: "Your answer matches the greedy rule 'each person, in order, takes their cheapest free job'. An early person's cheap pick can force someone later into a very expensive job — try all n! assignments." },
      { fn: (C) => C.reduce((s, row) => s + Math.min(...row), 0), hint: "You're adding up each row's minimum. That can use the same job twice! Each job may be assigned to only ONE person — generate permutations of the jobs." },
      { fn: (C) => C.reduce((s, row, i) => s + row[i], 0), hint: "You only evaluate the assignment person i → job i. That's one of n! permutations; you need to try them all." },
    ],
    hints: [
      "An assignment is a permutation of the jobs 0 … n − 1. How can you generate every permutation exactly once?",
      "Recursive helper Assign(C, n, used, i, cost): person i chooses any job j that is not used yet, then recurse for person i + 1.",
      "Base case: if i = n return cost. Otherwise best ← ∞; for each free job j: mark it, best ← min(best, Assign(…, i + 1, cost + C[i][j])), unmark it; return best.",
    ],
    starter: {
      pseudo: `ALGORITHM Assignment(C[0..n-1, 0..n-1])
    used ← array(n, false)
    return Assign(C, n, used, 0, 0)

ALGORITHM Assign(C, n, used, i, cost)
    // choose a job for person i
    ...`,
      js: `function Assignment(C) {
  const n = C.length;
  // try every permutation of jobs
}`,
    },
    solution: {
      pseudo: `ALGORITHM Assignment(C[0..n-1, 0..n-1])
    used ← array(n, false)
    return Assign(C, n, used, 0, 0)

ALGORITHM Assign(C, n, used, i, cost)
    if i = n then
        return cost
    best ← ∞
    for j ← 0 to n - 1 do
        if not used[j] then
            used[j] ← true
            best ← min(best, Assign(C, n, used, i + 1, cost + C[i][j]))
            used[j] ← false
    return best`,
      js: `function Assignment(C) {
  const n = C.length, used = Array(n).fill(false);
  function assign(i, cost) {
    if (i === n) return cost;
    let best = Infinity;
    for (let j = 0; j < n; j++) if (!used[j]) {
      used[j] = true;
      best = Math.min(best, assign(i + 1, cost + C[i][j]));
      used[j] = false;
    }
    return best;
  }
  return assign(0, 0);
}`,
      python: `def assignment(C):
    n = len(C)
    used = [False] * n
    def assign(i, cost):
        if i == n:
            return cost
        best = float('inf')
        for j in range(n):
            if not used[j]:
                used[j] = True
                best = min(best, assign(i + 1, cost + C[i][j]))
                used[j] = False
        return best
    return assign(0, 0)`,
      explain: "The recursion enumerates all n! permutations (n choices for person 0, n − 1 for person 1, …), so it can't miss the optimum; the work is Θ(n!) — hopeless beyond n ≈ 12.",
    },
    complexity: "Θ(n!)",
    followUp: "Unlike the Traveling Salesman Problem (TSP), the assignment problem has a polynomial algorithm: the Hungarian method runs in O(n³) (see also bipartite matching, Levitin Ch 10). Senior twist: exhaustive search being slow does NOT mean the problem is hard — always look for structure first.",
    distractors: ["if i = n - 1 then", "best ← min(best, C[i][j])", "for j ← i to n - 1 do"],
    visual: "sims/exhaustive-search.html",
    lesson: LESSON,
  });

  /* =========================================================================
     16. Partition problem by exhaustive search  (Problem Set 2, Problem 4)
     ========================================================================= */
  const canPartition = (A) => { const S = A.reduce((a, b) => a + b, 0); if (S % 2) return false; const t = S / 2; const ok = Array(t + 1).fill(false); ok[0] = true; for (const x of A) for (let s = t; s >= x; s--) if (ok[s - x]) ok[s] = true; return ok[t]; };
  const partitionSearch = (A, pred, target) => { const n = A.length, S = A.reduce((a, b) => a + b, 0); const T = target === undefined ? S / 2 : target(S); if (S % 2) return []; for (let mask = 1; mask < 1 << n; mask++) { const B = []; let tot = 0; for (let i = 0; i < n; i++) if (mask & (1 << i)) { B.push(i); tot += A[i]; } if ((!pred || pred(B, n)) && tot === T) return B; } return []; };
  ForgeProblems.add({
    id: "partition-exhaustive",
    title: "Partition into Two Equal Sums",
    level: 1, chapter: 3, difficulty: 3,
    topics: ["exhaustive search", "subsets", "NP-complete"],
    strategy: "Exhaustive search over subsets",
    source: "Levitin Exercise 3.4.6 (adapted) · Problem Set 2, Problem 4",
    summary: "Split n positive integers into two groups with equal sums — return the indices of one group, or [] if impossible.",
    statement: `
<p>The <b>partition problem</b>: given n positive integers, divide them into two disjoint groups with the <b>same sum</b>. Think of
splitting a pile of jobs between two identical machines so both finish at the same time. It doesn't always have a solution.</p>
<p>Design it by exhaustive search (Levitin Exercise 3.4.6): if the total S is odd, stop immediately; otherwise look for a subset
whose sum is exactly S/2 — its complement is the other group.</p>
<ul>
<li><b>Input:</b> <code>A[0..n-1]</code>, 1 ≤ n ≤ 12 positive integers.</li>
<li><b>Output:</b> a list of <b>indices</b> of one group (any valid group is accepted, in any order), or <code>[]</code> if no equal split
exists.</li>
</ul>`,
    entry: "Partition",
    params: ["A"],
    tests: [
      { args: [[1, 5, 11, 5]], expect: [2], explain: "S = 22, so each group needs 11: {11} and {1, 5, 5}. Index list [2] (or [0, 1, 3])." },
      { args: [[1, 2, 5]], expect: [], explain: "S = 8 is even, but no subset sums to 4." },
      { args: [[1, 2, 4]], expect: [], explain: "S = 7 is odd — impossible, no search needed." },
      { args: [[3, 3, 2, 2, 2]], expect: [0, 1], name: "Greedy trap", explain: "{3, 3} vs {2, 2, 2}. 'Put each number in the lighter group' fails here." },
      { args: [[1, 1, 1, 3]], expect: [3], name: "Groups of different sizes", explain: "{3} vs {1, 1, 1}: the groups need not have equal size." },
      { args: [[4, 4]], expect: [0], name: "Two equal numbers" },
      { args: [[7]], expect: [], name: "One number" },
      { args: [[3, 1, 1, 2, 2, 1]], expect: [0, 3], name: "Many solutions" },
    ],
    random: { count: 20, gen: (r, i) => { const n = 2 + (i % 10); const A = r.array(n, 1, 20); if (i % 3 === 0) { const s = A.reduce((a, b) => a + b, 0); if (s % 2) A[0] += 1; } return [A]; } },
    verify: (got, [A]) => {
      if (!Array.isArray(got)) return "Return a list of indices (or [] when no split exists).";
      const possible = canPartition(A);
      if (!possible) return got.length === 0 ? true : "No equal-sum split exists for this input, so the answer must be [].";
      if (got.length === 0) return "An equal-sum split exists — return the indices of one group.";
      const seen = new Set();
      for (const k of got) { if (!Number.isInteger(k) || k < 0 || k >= A.length || seen.has(k)) return `Index ${k} is out of range or repeated.`; seen.add(k); }
      const s = got.reduce((a, k) => a + A[k], 0), S = A.reduce((a, b) => a + b, 0);
      return s * 2 === S ? true : `Your group sums to ${s}, the rest sums to ${S - s}.`;
    },
    mutants: [
      { fn: (A) => { const idx = A.map((_, i) => i).sort((a, b) => A[b] - A[a] || a - b); const g1 = [], g2 = []; let s1 = 0, s2 = 0; for (const i of idx) { if (s1 <= s2) { g1.push(i); s1 += A[i]; } else { g2.push(i); s2 += A[i]; } } return s1 === s2 ? g1.sort((a, b) => a - b) : []; }, hint: "Your answer matches the greedy rule 'largest first, into the lighter group'. That's a heuristic — it misses splits like {3, 3} | {2, 2, 2}. Exhaustive search must examine the subsets themselves." },
      { fn: (A) => partitionSearch(A, (B, n) => B.length === Math.floor(n / 2)), hint: "You only try groups with exactly ⌊n/2⌋ elements. The two groups need equal SUMS, not equal sizes: {3} | {1, 1, 1} is valid." },
      { fn: (A) => partitionSearch(A, null, (S) => S), hint: "You're looking for a subset that sums to S (that's just all the numbers). Each group must sum to S / 2." },
    ],
    hints: [
      "If the total S is odd, can there be a solution? If S is even, what must ONE of the groups add up to?",
      "Generate subsets with a counter mask = 1 … 2ⁿ − 1; for each, collect the chosen indices and their sum. Return the first subset whose sum is S / 2.",
      "Inside the mask loop: B ← []; total ← 0; b ← mask; for i ← 0 to n − 1: if b mod 2 = 1 then add A[i] and append(B, i); b ← b div 2. Then: if total = S / 2 return B.",
    ],
    starter: {
      pseudo: `ALGORITHM Partition(A[0..n-1])
    // indices of a group with sum S/2, or [] if impossible
    S ← 0
    for i ← 0 to n - 1 do
        S ← S + A[i]
    ...
    return []`,
      js: `function Partition(A) {
  // return indices of one group, or []
}`,
    },
    solution: {
      pseudo: `ALGORITHM Partition(A[0..n-1])
    S ← 0
    for i ← 0 to n - 1 do
        S ← S + A[i]
    if S mod 2 = 1 then
        return []
    for mask ← 1 to 2^n - 1 do
        B ← []
        total ← 0
        b ← mask
        for i ← 0 to n - 1 do
            if b mod 2 = 1 then
                total ← total + A[i]
                append(B, i)
            b ← b div 2
        if total = S / 2 then
            return B
    return []`,
      js: `function Partition(A) {
  const n = A.length, S = A.reduce((a, b) => a + b, 0);
  if (S % 2 === 1) return [];
  for (let mask = 1; mask < (1 << n); mask++) {
    const B = [];
    let total = 0;
    for (let i = 0; i < n; i++) if (mask & (1 << i)) { total += A[i]; B.push(i); }
    if (total === S / 2) return B;
  }
  return [];
}`,
      python: `def partition(A):
    n, S = len(A), sum(A)
    if S % 2:
        return []
    for mask in range(1, 1 << n):
        B = [i for i in range(n) if mask >> i & 1]
        if sum(A[i] for i in B) == S // 2:
            return B
    return []`,
      explain: "Any split corresponds to a subset with sum S/2, so trying all subsets is complete. Worst case (no split) examines 2ⁿ − 1 subsets at Θ(n) each: Θ(n·2ⁿ). Problem Set 2's refinements — stop at once when S is odd, and only generate subsets of at most ⌊n/2⌋ elements (a group or its complement is that small) — cut the constant, not the exponential class.",
    },
    complexity: "Θ(n·2ⁿ) worst case",
    followUp: "Partition is Nondeterministic Polynomial (NP)-complete, yet dynamic programming over reachable sums (subset-sum-dp) solves it in Θ(n·S) — pseudo-polynomial again. Senior twist: 'meet in the middle' (split the list in half, enumerate 2^(n/2) sums on each side, sort and match) turns 2ⁿ into about 2^(n/2)·n.",
    distractors: ["if total = S then", "for mask ← 0 to 2^n do", "if S mod 2 = 0 then"],
    visual: "sims/exhaustive-search.html",
    lesson: LESSON,
  });

  /* =========================================================================
     17. Count the 3×3 magic squares that complete a grid  (Practice Exam 1, Problem B3)
     ========================================================================= */
  let SEMI = null; // all 72 "semi-magic" 3×3 squares (rows & columns = 15), with diagonal flags
  const semiMagic = () => {
    if (SEMI) return SEMI;
    SEMI = [];
    const cells = Array(9).fill(0), used = Array(10).fill(false);
    const go = (k) => {
      if (k % 3 === 0 && k > 0 && cells[k - 3] + cells[k - 2] + cells[k - 1] !== 15) return;
      if (k === 9) {
        for (let c = 0; c < 3; c++) if (cells[c] + cells[c + 3] + cells[c + 6] !== 15) return;
        SEMI.push({ g: cells.slice(), d1: cells[0] + cells[4] + cells[8] === 15, d2: cells[2] + cells[4] + cells[6] === 15 });
        return;
      }
      for (let x = 1; x <= 9; x++) if (!used[x]) { used[x] = true; cells[k] = x; go(k + 1); used[x] = false; }
    };
    go(0);
    return SEMI;
  };
  const countMagic = (G, mode) => {
    const flat = [].concat(...G);
    return semiMagic().filter((s) => (mode === "ignore" || flat.every((v, k) => v === 0 || v === s.g[k])) && (mode === "nodiag" ? true : mode === "main" ? s.d1 : s.d1 && s.d2)).length;
  };
  ForgeProblems.add({
    id: "magic-squares-3x3-count",
    title: "Complete the Magic Square (Exhaustive Search)",
    level: 1, chapter: 3, difficulty: 3,
    topics: ["exhaustive search", "permutations", "pruning", "magic squares"],
    strategy: "Exhaustive search with an early rejection test",
    source: "Levitin Exercise 3.4.10 (adapted) · Practice Exam 1, Problem B3",
    summary: "Count the ways to fill the empty cells of a 3×3 grid with the unused numbers 1..9 to get a magic square.",
    statement: `
<p>A classic exam problem (Practice Exam 1, Problem B3) asks for an exhaustive-search algorithm that generates all magic squares of order n. Here you do it for order 3 —
with a twist that makes it a real search: some cells may already be filled in.</p>
<p><b>Input:</b> a 3×3 grid <code>G</code> of integers, where <code>0</code> means "empty" and any other value (1..9) is fixed. The fixed
values are distinct. <b>Output:</b> the number of ways to fill the empty cells with the <b>unused</b> numbers from 1..9 (each used once)
so that the result is a magic square: every row, column and both diagonals sum to <code>3(3² + 1)/2 = 15</code>.</p>
<ul>
<li>With all nine cells empty the answer is 8 (the Lo Shu square and its rotations and reflections).</li>
<li>Pure "generate all 9! = 362,880 fillings, then test" is too slow for the grader. Use part (a) of that exam problem: every row must sum to
15, so <b>reject a partial filling as soon as a completed row misses 15</b> — that's still exhaustive search, it just stops
generating hopeless fillings early.</li>
<li>Helpers may modify <code>G</code> (put values in, then set them back to 0).</li>
</ul>`,
    entry: "CountMagic",
    params: ["G"],
    tests: [
      { args: [[[0, 0, 0], [0, 0, 0], [0, 0, 0]]], expect: 8, explain: "All eight 3×3 magic squares." },
      { args: [[[0, 0, 0], [0, 5, 0], [0, 0, 0]]], expect: 8, explain: "Every 3×3 magic square has 5 in the center (4 lines through the center sum to 60 = 45 + 3·center)." },
      { args: [[[2, 0, 0], [0, 0, 0], [0, 0, 0]]], expect: 2, explain: "Only two of the eight squares have 2 in the top-left corner." },
      { args: [[[0, 0, 0], [0, 1, 0], [0, 0, 0]]], expect: 0, name: "Impossible center" },
      { args: [[[2, 7, 6], [9, 5, 1], [4, 3, 8]]], expect: 1, name: "Already complete and magic" },
      { args: [[[9, 5, 1], [2, 7, 6], [4, 3, 8]]], expect: 0, name: "Complete but diagonals fail" },
      { args: [[[0, 7, 0], [0, 0, 0], [0, 0, 0]]], expect: 2, name: "Odd number on an edge" },
      { args: [[[1, 0, 0], [0, 0, 0], [0, 0, 0]]], expect: 0, name: "1 can't be in a corner" },
      { args: [[[0, 0, 0], [0, 0, 0], [0, 0, 6]]], expect: 2, name: "Bottom-right corner fixed" },
    ],
    random: {
      count: 14,
      gen: (r, i) => {
        const G = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
        const cells = r.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, 1 + (i % 4));
        if (i % 2 === 0) {
          const sq = r.pick(semiMagic().filter((s) => s.d1 && s.d2)).g;
          cells.forEach((k) => (G[Math.floor(k / 3)][k % 3] = sq[k]));
        } else {
          const vals = r.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
          cells.forEach((k, t) => (G[Math.floor(k / 3)][k % 3] = vals[t]));
        }
        return [G];
      },
    },
    reference: (G) => countMagic(G),
    mutants: [
      { fn: (G) => countMagic(G, "nodiag"), hint: "You count 72 squares for the empty grid — those are 'semi-magic' (rows and columns only). A magic square also needs BOTH diagonals to sum to 15." },
      { fn: (G) => countMagic(G, "main"), hint: "You check the main diagonal G[0][0] + G[1][1] + G[2][2], but not the anti-diagonal G[0][2] + G[1][1] + G[2][0]." },
      { fn: (G) => countMagic(G, "ignore"), hint: "You always get 8 — the pre-filled cells seem to be overwritten. Skip cells whose value isn't 0, and mark their numbers as used before the search starts." },
    ],
    hints: [
      "Part (a) of the exam problem: what must every line sum to for n = 3? When is the earliest moment you can tell that a partial filling is hopeless?",
      "Fill the cells in reading order k = 0 … 8 (row k div 3, column k mod 3). A fixed cell is skipped; an empty cell tries every unused number, recurses, then undoes the choice. When k reaches 9, test the columns and both diagonals.",
      "Right after cell k with k mod 3 = 2 is decided, the row k div 3 is complete: if its sum ≠ 15, return 0 for this branch instead of recursing.",
    ],
    starter: {
      pseudo: `ALGORITHM CountMagic(G[0..2, 0..2])
    used ← array(10, false)
    for r ← 0 to 2 do
        for c ← 0 to 2 do
            used[G[r][c]] ← true
    return Fill(G, used, 0)

ALGORITHM Fill(G, used, k)
    // number of magic completions of cells k..8
    ...`,
      js: `function CountMagic(G) {
  // count magic completions of the grid (0 = empty)
}`,
    },
    solution: {
      pseudo: `ALGORITHM CountMagic(G[0..2, 0..2])
    used ← array(10, false)
    for r ← 0 to 2 do
        for c ← 0 to 2 do
            used[G[r][c]] ← true
    return Fill(G, used, 0)

ALGORITHM Fill(G, used, k)
    if k = 9 then
        return LinesOK(G)
    r ← k div 3
    c ← k mod 3
    if G[r][c] ≠ 0 then
        return Next(G, used, k)
    total ← 0
    for x ← 1 to 9 do
        if not used[x] then
            used[x] ← true
            G[r][c] ← x
            total ← total + Next(G, used, k)
            G[r][c] ← 0
            used[x] ← false
    return total

ALGORITHM Next(G, used, k)
    r ← k div 3
    if k mod 3 = 2 and G[r][0] + G[r][1] + G[r][2] ≠ 15 then
        return 0
    return Fill(G, used, k + 1)

ALGORITHM LinesOK(G)
    for c ← 0 to 2 do
        if G[0][c] + G[1][c] + G[2][c] ≠ 15 then
            return 0
    if G[0][0] + G[1][1] + G[2][2] ≠ 15 then
        return 0
    if G[0][2] + G[1][1] + G[2][0] ≠ 15 then
        return 0
    return 1`,
      js: `function CountMagic(G) {
  const used = Array(10).fill(false);
  G.flat().forEach((v) => (used[v] = true));
  const rowOK = (r) => G[r][0] + G[r][1] + G[r][2] === 15;
  function linesOK() {
    for (let c = 0; c < 3; c++) if (G[0][c] + G[1][c] + G[2][c] !== 15) return 0;
    if (G[0][0] + G[1][1] + G[2][2] !== 15) return 0;
    return G[0][2] + G[1][1] + G[2][0] === 15 ? 1 : 0;
  }
  function next(k) {
    if (k % 3 === 2 && !rowOK(Math.floor(k / 3))) return 0;
    return fill(k + 1);
  }
  function fill(k) {
    if (k === 9) return linesOK();
    const r = Math.floor(k / 3), c = k % 3;
    if (G[r][c] !== 0) return next(k);
    let total = 0;
    for (let x = 1; x <= 9; x++) if (!used[x]) {
      used[x] = true; G[r][c] = x;
      total += next(k);
      G[r][c] = 0; used[x] = false;
    }
    return total;
  }
  return fill(0);
}`,
      python: `def count_magic(G):
    used = [False] * 10
    for row in G:
        for v in row:
            used[v] = True
    def lines_ok():
        cols = all(G[0][c] + G[1][c] + G[2][c] == 15 for c in range(3))
        d1 = G[0][0] + G[1][1] + G[2][2] == 15
        d2 = G[0][2] + G[1][1] + G[2][0] == 15
        return 1 if cols and d1 and d2 else 0
    def nxt(k):
        r = k // 3
        if k % 3 == 2 and sum(G[r]) != 15:
            return 0
        return fill(k + 1)
    def fill(k):
        if k == 9:
            return lines_ok()
        r, c = divmod(k, 3)
        if G[r][c]:
            return nxt(k)
        total = 0
        for x in range(1, 10):
            if not used[x]:
                used[x] = True; G[r][c] = x
                total += nxt(k)
                G[r][c] = 0; used[x] = False
        return total
    return fill(0)`,
      explain: "Without pruning this generates all (n²)! = 9! fillings and tests each in Θ(n²): Θ((n²)!·n²) for order n — the classic exam analysis. Rejecting a row that misses 15 as soon as it is complete cuts the 3×3 search from 362,880 leaves to a few thousand nodes without ever skipping a valid square, because a square with a bad row can't be magic.",
    },
    complexity: "Θ((n²)!·n²) for plain exhaustive search; pruning shrinks the constant dramatically",
    followUp: "Prove part (a) of the exam problem yourself: sum all rows. Senior twist: 'reject partial solutions early' is exactly backtracking (Levitin §12.1); satisfiability (SAT) and constraint programming (CP) solvers push the same idea much further with propagation.",
    distractors: ["if k = 8 then", "if k mod 3 = 0 and G[r][0] + G[r][1] + G[r][2] ≠ 15 then", "G[r][c] ← x"],
    visual: "sims/exhaustive-search.html",
    lesson: LESSON,
  });

  /* =========================================================================
     Graph traversals. Shared encoding (stated in every statement):
     G[i] = neighbours of vertex i, 0-based, sorted ascending; undirected.
     ========================================================================= */
  const GRAPH_FORMAT = `<p><b>Graph format:</b> vertices are <code>0 … n−1</code>; <code>G[i]</code> is the list of neighbours of vertex
<code>i</code>, <b>sorted in increasing order</b>. The graph is undirected (if <code>j</code> is in <code>G[i]</code> then <code>i</code> is in
<code>G[j]</code>), with no self-loops or repeated edges. n may be 0. Loop over neighbours with <code>for each w in G[v] do</code>.</p>`;
  const G_A = [[1, 2], [0, 3], [0, 3], [1, 2, 4], [3], []];
  const randGraphArgs = (r, i) => { const n = i % 13; const k = i % 3; return [k === 0 ? randForest(r, n, 0.8) : k === 1 ? randGraph(r, n, 0.2) : randBipartite(r, n, 0.35)]; };

  /* 18. DFS visit order and dead-end order */
  ForgeProblems.add({
    id: "dfs-order",
    title: "Depth-First Search: Two Orders",
    level: 1, chapter: 3, difficulty: 2,
    topics: ["graphs", "DFS", "traversal", "recursion"],
    strategy: "Exhaustive graph traversal",
    source: "Levitin §3.5",
    summary: "Run Depth-First Search (DFS) over the whole graph; return the order vertices are reached and the order they become dead ends.",
    statement: `
<p><b>Depth-First Search (DFS)</b> goes as deep as it can along unvisited neighbours and backs up only at a <i>dead end</i>
(Levitin §3.5). It is the engine behind cycle detection, topological sorting, maze solving and finding connected components.</p>
<p>Levitin's DFS produces <b>two</b> orderings: the order in which vertices are first reached (pushed onto the traversal stack)
and the order in which they become dead ends (popped off). Return both as <code>[pre, post]</code>.</p>
<ul>
<li>Start at vertex 0. At each vertex, try its neighbours in the order listed in <code>G[v]</code> (increasing).</li>
<li>When the search from a start vertex finishes, <b>restart</b> from the smallest vertex not yet visited, until every vertex is visited.</li>
</ul>
${GRAPH_FORMAT}`,
    entry: "DFSOrders",
    params: ["G"],
    tests: [
      { args: [G_A], expect: [[0, 1, 3, 2, 4, 5], [2, 4, 3, 1, 0, 5]], explain: "0 → 1 → 3 → 2 (dead end: 0 and 3 are visited) → back to 3 → 4 (dead end) … then restart at the isolated vertex 5." },
      { args: [[[1], [0, 2], [1]]], expect: [[0, 1, 2], [2, 1, 0]], explain: "On a path the dead-end order is the reverse of the visit order." },
      { args: [[[1, 2, 3], [0], [0], [0]]], expect: [[0, 1, 2, 3], [1, 2, 3, 0]], explain: "A star: each leaf is a dead end immediately; the center finishes last." },
      { args: [[[2], [3], [0], [1]]], expect: [[0, 2, 1, 3], [2, 0, 3, 1]], name: "Two components" },
      { args: [[]], expect: [[], []], name: "Empty graph" },
      { args: [[[], [], []]], expect: [[0, 1, 2], [0, 1, 2]], name: "No edges" },
      { args: [[[1, 4], [0, 2, 3], [1, 3], [1, 2], [0]]], expect: [[0, 1, 2, 3, 4], [3, 2, 1, 4, 0]], name: "Triangle with a tail" },
    ],
    random: { count: 25, gen: randGraphArgs },
    reference: (G) => dfsOrders(G),
    mutants: [
      { fn: (G) => dfsOrders(G, { reverse: true }), hint: "You visit neighbours from largest to smallest — typical when you push ALL neighbours onto an explicit stack (the last one pushed pops first). Follow G[v] in its listed order (recursion does this naturally)." },
      { fn: (G) => dfsOrders(G, { noRestart: true }), hint: "Vertices that can't be reached from 0 are missing. DFS(G) loops over ALL vertices and restarts from any vertex that is still unvisited." },
      { fn: (G) => { const [pre] = dfsOrders(G); return [pre, pre.slice()]; }, hint: "Your dead-end order equals your visit order. A vertex becomes a dead end only AFTER all its unvisited neighbours have been explored — append it to post at the END of its dfs call." },
    ],
    hints: [
      "When exactly does a vertex get 'reached' and when does it become a 'dead end'? Think of the start and the end of a recursive call.",
      "Main algorithm: visited ← array(n, false); for v ← 0 to n − 1, if not visited[v] then call a helper Dfs(G, v, visited, pre, post).",
      "Helper: mark v, append(pre, v); for each w in G[v], if not visited[w] then recurse on w; finally append(post, v).",
    ],
    starter: {
      pseudo: `ALGORITHM DFSOrders(G[0..n-1])
    visited ← array(n, false)
    pre ← []
    post ← []
    ...
    return [pre, post]

ALGORITHM Dfs(G, v, visited, pre, post)
    ...`,
      js: `function DFSOrders(G) {
  const n = G.length, visited = Array(n).fill(false), pre = [], post = [];
  // ...
  return [pre, post];
}`,
    },
    solution: {
      pseudo: `ALGORITHM DFSOrders(G[0..n-1])
    visited ← array(n, false)
    pre ← []
    post ← []
    for v ← 0 to n - 1 do
        if not visited[v] then
            Dfs(G, v, visited, pre, post)
    return [pre, post]

ALGORITHM Dfs(G, v, visited, pre, post)
    visited[v] ← true
    append(pre, v)
    for each w in G[v] do
        if not visited[w] then
            Dfs(G, w, visited, pre, post)
    append(post, v)`,
      js: `function DFSOrders(G) {
  const n = G.length, visited = Array(n).fill(false), pre = [], post = [];
  function dfs(v) {
    visited[v] = true;
    pre.push(v);
    for (const w of G[v]) if (!visited[w]) dfs(w);
    post.push(v);
  }
  for (let v = 0; v < n; v++) if (!visited[v]) dfs(v);
  return [pre, post];
}`,
      python: `def dfs_orders(G):
    n = len(G)
    visited = [False] * n
    pre, post = [], []
    def dfs(v):
        visited[v] = True
        pre.append(v)
        for w in G[v]:
            if not visited[w]:
                dfs(w)
        post.append(v)
    for v in range(n):
        if not visited[v]:
            dfs(v)
    return [pre, post]`,
      explain: "Each vertex is visited once (it's marked before recursing) and each adjacency list is scanned once, so DFS runs in Θ(|V| + |E|) with adjacency lists (Θ(|V|²) with an adjacency matrix). The recursion stack IS Levitin's traversal stack: pre = push order, post = pop order.",
    },
    complexity: "Θ(|V| + |E|) with adjacency lists",
    followUp: "Reverse the post order of a directed acyclic graph and you get a topological sort (Levitin §4.2). Senior twist: for very deep graphs, production code uses an explicit stack to avoid stack overflow — try writing that version so it still produces the same two orders.",
    distractors: ["for v ← 1 to n - 1 do", "Dfs(G, 0, visited, pre, post)", "append(post, w)"],
    visual: "sims/graph-traversal.html",
    lesson: LESSON,
  });

  /* 19. BFS order */
  ForgeProblems.add({
    id: "bfs-order",
    title: "Breadth-First Search Order",
    level: 1, chapter: 3, difficulty: 2,
    topics: ["graphs", "BFS", "traversal", "queues"],
    strategy: "Exhaustive graph traversal",
    source: "Levitin §3.5",
    summary: "Run Breadth-First Search (BFS) over the whole graph with a queue and return the order vertices are reached.",
    statement: `
<p><b>Breadth-First Search (BFS)</b> explores a graph in "rings": first the start vertex, then all its neighbours, then all
<i>their</i> unvisited neighbours, and so on. It uses a <b>queue</b> instead of a stack, and it finds paths with the fewest edges —
the basis of shortest paths in unweighted graphs, web crawlers and "degrees of separation" (Levitin §3.5).</p>
<p>Return the list of vertices in the order BFS reaches them (for BFS, the order they are added to the queue).</p>
<ul>
<li>Start at vertex 0; process neighbours in the order listed in <code>G[v]</code>.</li>
<li>Mark a vertex as visited <b>when it is enqueued</b>, so it is never added twice.</li>
<li>When the queue empties, restart from the smallest unvisited vertex until all vertices are reached.</li>
</ul>
${GRAPH_FORMAT}`,
    entry: "BFSOrder",
    params: ["G"],
    tests: [
      { args: [G_A], expect: [0, 1, 2, 3, 4, 5], explain: "Ring 0: {0}; ring 1: {1, 2}; ring 2: {3}; ring 3: {4}; then restart at 5." },
      { args: [[[1, 2], [0, 2], [0, 1]]], expect: [0, 1, 2], explain: "A triangle: 2 is reached from 0 — it must not be added again when we look at 1's neighbours." },
      { args: [[[1, 2], [0, 3, 4], [0, 5, 6], [1], [1], [2], [2]]], expect: [0, 1, 2, 3, 4, 5, 6], explain: "A complete binary tree comes out level by level (Depth-First Search would give 0, 1, 3, 4, 2, 5, 6)." },
      { args: [[[2], [3], [0], [1]]], expect: [0, 2, 1, 3], name: "Two components" },
      { args: [[]], expect: [], name: "Empty graph" },
      { args: [[[]]], expect: [0], name: "Single vertex" },
      { args: [[[3], [2, 3], [1], [0, 1]]], expect: [0, 3, 1, 2], name: "A path listed out of order" },
    ],
    random: { count: 25, gen: randGraphArgs },
    reference: (G) => bfsOrder(G),
    mutants: [
      { fn: (G) => dfsOrders(G)[0], hint: "That's a depth-first order. BFS must finish ALL neighbours of a vertex before going deeper — use a queue (enqueue at the back, dequeue from the front)." },
      { fn: (G) => bfsOrder(G, { noRestart: true }), hint: "Vertices not reachable from 0 are missing. Wrap the search in a loop over all vertices and start a new BFS from each one that is still unvisited." },
      { fn: (G) => { const n = G.length, seen = Array(n).fill(false), out = []; for (let s = 0; s < n; s++) { if (seen[s]) continue; const q = [s]; while (q.length) { const v = q.shift(); seen[v] = true; out.push(v); for (const w of G[v]) if (!seen[w]) q.push(w); } } return out; }, hint: "Some vertices appear twice. You mark a vertex only when it is DEQUEUED, so two neighbours can both enqueue it first. Mark (and record) it at the moment you enqueue it." },
    ],
    hints: [
      "Which data structure gives you 'first discovered, first explored'?",
      "For each unvisited start s: mark s, append it to order, enqueue it. While the queue is not empty: v ← dequeue(Q) and look at each neighbour w of v.",
      "For each neighbour w: if not visited[w] then visited[w] ← true; append(order, w); enqueue(Q, w).",
    ],
    starter: {
      pseudo: `ALGORITHM BFSOrder(G[0..n-1])
    visited ← array(n, false)
    order ← []
    for s ← 0 to n - 1 do
        if not visited[s] then
            ...
    return order`,
      js: `function BFSOrder(G) {
  const n = G.length, visited = Array(n).fill(false), order = [];
  // ...
  return order;
}`,
    },
    solution: {
      pseudo: `ALGORITHM BFSOrder(G[0..n-1])
    visited ← array(n, false)
    order ← []
    for s ← 0 to n - 1 do
        if not visited[s] then
            visited[s] ← true
            append(order, s)
            Q ← queue()
            enqueue(Q, s)
            while not isEmpty(Q) do
                v ← dequeue(Q)
                for each w in G[v] do
                    if not visited[w] then
                        visited[w] ← true
                        append(order, w)
                        enqueue(Q, w)
    return order`,
      js: `function BFSOrder(G) {
  const n = G.length, visited = Array(n).fill(false), order = [];
  for (let s = 0; s < n; s++) {
    if (visited[s]) continue;
    visited[s] = true; order.push(s);
    const Q = [s];
    while (Q.length) {
      const v = Q.shift();
      for (const w of G[v]) if (!visited[w]) { visited[w] = true; order.push(w); Q.push(w); }
    }
  }
  return order;
}`,
      python: `from collections import deque
def bfs_order(G):
    n = len(G)
    visited = [False] * n
    order = []
    for s in range(n):
        if visited[s]:
            continue
        visited[s] = True
        order.append(s)
        Q = deque([s])
        while Q:
            v = Q.popleft()
            for w in G[v]:
                if not visited[w]:
                    visited[w] = True
                    order.append(w)
                    Q.append(w)
    return order`,
      explain: "Every vertex is enqueued exactly once (it's marked on enqueue) and every adjacency list is scanned once when its vertex is dequeued: Θ(|V| + |E|) with adjacency lists, Θ(|V|²) with a matrix — the same as Depth-First Search (DFS). The queue guarantees vertices come out in nondecreasing distance from the start.",
    },
    complexity: "Θ(|V| + |E|) with adjacency lists",
    followUp: "Record dist[w] ← dist[v] + 1 when you enqueue w and you have unweighted shortest paths; record parent[w] ← v to rebuild them. Senior twist: 'multi-source BFS' (enqueue many starts at distance 0) solves 'nearest exit / nearest hospital' problems in one pass.",
    distractors: ["v ← pop(Q)", "visited[v] ← true", "for s ← 1 to n - 1 do"],
    visual: "sims/graph-traversal.html",
    lesson: LESSON,
  });

  /* 20. Number of connected components */
  ForgeProblems.add({
    id: "connected-components",
    title: "Count the Connected Components",
    level: 1, chapter: 3, difficulty: 2,
    topics: ["graphs", "DFS", "BFS", "connectivity"],
    strategy: "Traversal with restarts",
    source: "Levitin §3.5 & Exercise 3.5.7 (adapted)",
    summary: "Return how many connected pieces an undirected graph has, in Θ(|V| + |E|).",
    statement: `
<p>Is the network in one piece? How many islands are on the map? How many separate friend groups? Each is the number of
<b>connected components</b> of a graph — and it falls straight out of Depth-First Search (DFS) or Breadth-First Search (BFS): every time the outer loop has to <i>restart</i>
the traversal from a new unvisited vertex, you've found a new component (Levitin §3.5).</p>
<p>Return the number of connected components of <code>G</code> (0 for the empty graph; an isolated vertex is a component on its own).
Your algorithm must be linear in the size of the graph.</p>
${GRAPH_FORMAT}`,
    entry: "Components",
    params: ["G"],
    tests: [
      { args: [G_A], expect: 2, explain: "{0, 1, 2, 3, 4} and the isolated vertex {5}." },
      { args: [[[1, 2], [0, 2], [0, 1], []]], expect: 2, explain: "A triangle plus an isolated vertex. (Note: n − m = 4 − 3 = 1 would be wrong — that formula only works for forests.)" },
      { args: [[]], expect: 0, explain: "No vertices, no components." },
      { args: [[[], [], [], []]], expect: 4, name: "No edges" },
      { args: [[[1], [0, 2], [1, 3], [2]]], expect: 1, name: "One path" },
      { args: [[[1, 2], [0, 2], [0, 1], [4, 5], [3, 5], [3, 4]]], expect: 2, name: "Two triangles" },
      { args: [[[4], [3], [], [1], [0]]], expect: 3, name: "Components that aren't contiguous in numbering" },
    ],
    random: { count: 25, gen: (r, i) => { const n = i % 14; return [i % 2 ? randGraph(r, n, 0.15) : randForest(r, n, 0.6)]; } },
    reference: (G) => componentsOf(G).count,
    growth: { metric: "steps", sizes: [32, 64, 128, 256, 512], gen: (r, n) => [randForest(r, n, 0.9)], expect: "n" },
    mutants: [
      { fn: (G) => (G.length ? 1 : 0), hint: "You always report 1 component: the traversal is started only from vertex 0. Loop over all vertices and start a new traversal (count ← count + 1) from each vertex that is still unvisited." },
      { fn: (G) => G.length - edgeCount(G), hint: "It looks like you compute n − m. That's only true for forests (graphs without cycles); every cycle adds an edge without joining anything new. Count restarts of DFS/BFS instead." },
      { fn: (G) => G.length, hint: "You count every vertex as a new component. Only count a start vertex if it has NOT already been visited by an earlier traversal." },
    ],
    hints: [
      "Run DFS(G) as in Levitin: the outer loop calls dfs(v) for every vertex v that is still unvisited. How many times does that call happen?",
      "count ← 0; for v ← 0 to n − 1: if not visited[v] then count ← count + 1 and traverse (mark) everything reachable from v.",
      "The traversal helper only needs to mark: Mark(G, v, visited): visited[v] ← true; for each w in G[v], if not visited[w] then Mark(G, w, visited).",
    ],
    starter: {
      pseudo: `ALGORITHM Components(G[0..n-1])
    visited ← array(n, false)
    count ← 0
    ...
    return count`,
      js: `function Components(G) {
  const n = G.length, visited = Array(n).fill(false);
  let count = 0;
  // ...
  return count;
}`,
    },
    solution: {
      pseudo: `ALGORITHM Components(G[0..n-1])
    visited ← array(n, false)
    count ← 0
    for v ← 0 to n - 1 do
        if not visited[v] then
            count ← count + 1
            Mark(G, v, visited)
    return count

ALGORITHM Mark(G, v, visited)
    visited[v] ← true
    for each w in G[v] do
        if not visited[w] then
            Mark(G, w, visited)`,
      js: `function Components(G) {
  const n = G.length, visited = Array(n).fill(false);
  let count = 0;
  function mark(v) {
    visited[v] = true;
    for (const w of G[v]) if (!visited[w]) mark(w);
  }
  for (let v = 0; v < n; v++) if (!visited[v]) { count++; mark(v); }
  return count;
}`,
      python: `def components(G):
    n = len(G)
    visited = [False] * n
    def mark(v):
        visited[v] = True
        for w in G[v]:
            if not visited[w]:
                mark(w)
    count = 0
    for v in range(n):
        if not visited[v]:
            count += 1
            mark(v)
    return count`,
      explain: "Each traversal started by the outer loop marks exactly one whole component, and every vertex is marked once, so the count of starts equals the number of components. Total work is one DFS: Θ(|V| + |E|).",
    },
    complexity: "Θ(|V| + |E|)",
    followUp: "Return a label comp[v] for each vertex so 'are u and v connected?' becomes O(1). Senior twist: when edges ARRIVE over time, use union–find (disjoint sets, Levitin §9.2) instead of re-running DFS.",
    distractors: ["Mark(G, 0, visited)", "if visited[w] then", "count ← count + length(G[v])"],
    visual: "sims/graph-traversal.html",
    lesson: LESSON,
  });

  /* 21. Does an undirected graph have a cycle? */
  ForgeProblems.add({
    id: "has-cycle-undirected",
    title: "Does the Graph Have a Cycle?",
    level: 1, chapter: 3, difficulty: 2,
    topics: ["graphs", "DFS", "cycles", "back edges"],
    strategy: "Depth-First Search (DFS) with back-edge detection",
    source: "Levitin §3.5 & Exercise 3.5.6 (adapted)",
    summary: "Return true if an undirected graph contains a cycle — i.e. a depth-first search finds a back edge.",
    statement: `
<p>Is this network a tree (or a forest), or does it contain a loop? Cycles matter for deadlock detection, for routing loops, and as the
first step of many graph algorithms. DFS answers it: in an undirected graph, the graph has a cycle <b>exactly when DFS meets a back
edge</b> — an edge to an already-visited vertex that is <i>not</i> the vertex we just came from (Levitin §3.5).</p>
<p>Return <code>true</code> if <code>G</code> has a cycle, otherwise <code>false</code>. The graph may be disconnected.</p>
${GRAPH_FORMAT}`,
    entry: "HasCycle",
    params: ["G"],
    tests: [
      { args: [[[1, 2], [0, 2], [0, 1]]], expect: true, explain: "A triangle is the smallest cycle." },
      { args: [[[1], [0, 2], [1]]], expect: false, explain: "A path: from 1 you see 0 again, but that's the edge you arrived by — not a cycle." },
      { args: [G_A], expect: true, explain: "0 – 1 – 3 – 2 – 0 is a cycle." },
      { args: [[[1], [0]]], expect: false, name: "Single edge" },
      { args: [[]], expect: false, name: "Empty graph" },
      { args: [[[1], [0], [3, 4], [2, 4], [2, 3]]], expect: true, name: "The cycle is in the second component" },
      { args: [[[1, 2], [0, 2], [0, 1], [], []]], expect: true, name: "Triangle + 2 isolated vertices (m < n)" },
      { args: [[[1, 2, 3], [0], [0, 4], [0], [2]]], expect: false, name: "A tree" },
    ],
    random: { count: 25, gen: (r, i) => { const n = 1 + (i % 12); const G = randForest(r, n, 0.85); if (i % 2 && n > 2) addEdge(G, r.int(0, n - 1), r.int(0, n - 1)); return [G]; } },
    reference: (G) => hasCycle(G),
    mutants: [
      { fn: (G) => edgeCount(G) > 0, hint: "Any edge makes you say 'cycle'. When you look at v's neighbours, the vertex you came FROM (v's parent in the DFS tree) is already visited — that's not a back edge. Pass the parent into the recursive call and ignore it." },
      { fn: (G) => edgeCount(G) >= G.length, hint: "It looks like you compare the number of edges with the number of vertices. A disconnected graph can have a cycle with m < n (triangle + isolated vertices). Use DFS back edges instead." },
      { fn: (G) => hasCycle(G, true), hint: "A cycle in a component that doesn't contain vertex 0 is missed. Restart the DFS from every unvisited vertex." },
    ],
    hints: [
      "During DFS from v you look at a neighbour w that is already visited. When does that prove a cycle, and when is it just the edge you walked in on?",
      "Write Cyc(G, v, parent, visited): mark v; for each neighbour w: if w is unvisited, recurse with parent v (and pass a true result up); else if w ≠ parent, you found a back edge.",
      "Call it from a loop over all vertices with parent −1: if not visited[v] and Cyc(G, v, −1, visited) then return true. After the loop, return false.",
    ],
    starter: {
      pseudo: `ALGORITHM HasCycle(G[0..n-1])
    visited ← array(n, false)
    ...
    return false

ALGORITHM Cyc(G, v, parent, visited)
    visited[v] ← true
    ...`,
      js: `function HasCycle(G) {
  const n = G.length, visited = Array(n).fill(false);
  // ...
}`,
    },
    solution: {
      pseudo: `ALGORITHM HasCycle(G[0..n-1])
    visited ← array(n, false)
    for v ← 0 to n - 1 do
        if not visited[v] then
            if Cyc(G, v, -1, visited) then
                return true
    return false

ALGORITHM Cyc(G, v, parent, visited)
    visited[v] ← true
    for each w in G[v] do
        if not visited[w] then
            if Cyc(G, w, v, visited) then
                return true
        else if w ≠ parent then
            return true
    return false`,
      js: `function HasCycle(G) {
  const n = G.length, visited = Array(n).fill(false);
  function cyc(v, parent) {
    visited[v] = true;
    for (const w of G[v]) {
      if (!visited[w]) { if (cyc(w, v)) return true; }
      else if (w !== parent) return true;
    }
    return false;
  }
  for (let v = 0; v < n; v++) if (!visited[v] && cyc(v, -1)) return true;
  return false;
}`,
      python: `def has_cycle(G):
    n = len(G)
    visited = [False] * n
    def cyc(v, parent):
        visited[v] = True
        for w in G[v]:
            if not visited[w]:
                if cyc(w, v):
                    return True
            elif w != parent:
                return True
        return False
    return any(not visited[v] and cyc(v, -1) for v in range(n))`,
      explain: "In a DFS of an undirected graph every edge is either a tree edge or a back edge; a back edge (u, w) plus the tree path from w down to u closes a cycle, and a graph with no back edges is a forest. One DFS: O(|V| + |E|) — in fact it stops after at most |V| edges, since a forest has fewer than |V| edges.",
    },
    complexity: "O(|V| + |E|)",
    followUp: "Counting check: a graph with c components is a forest exactly when m = n − c. Senior twist: for DIRECTED graphs 'visited' isn't enough — you need three colours (unvisited / on the stack / finished), which is how build systems detect circular dependencies.",
    distractors: ["else if visited[w] then", "if Cyc(G, w, w, visited) then", "if Cyc(G, 0, -1, visited) then"],
    visual: "sims/graph-traversal.html",
    lesson: LESSON,
  });

  /* 22. Is the graph bipartite? */
  ForgeProblems.add({
    id: "is-bipartite",
    title: "Is the Graph Bipartite (2-Colorable)?",
    level: 1, chapter: 3, difficulty: 3,
    topics: ["graphs", "BFS", "coloring", "bipartite"],
    strategy: "Breadth-First Search (BFS) 2-coloring",
    source: "Levitin Exercise 3.5.8 (adapted)",
    summary: "Decide whether the vertices can be colored with two colors so every edge joins different colors.",
    statement: `
<p>A graph is <b>bipartite</b> if its vertices can be split into two groups X and Y so that every edge goes between X and Y — equivalently,
if you can color the vertices with two colors so no edge joins two vertices of the same color (Levitin Exercise 3.5.8). Bipartite graphs
model jobs vs. workers, students vs. courses, and they are exactly the graphs with <b>no odd-length cycle</b>.</p>
<p>Return <code>true</code> if <code>G</code> is bipartite and <code>false</code> otherwise. The graph may be disconnected (a graph
with no edges is bipartite).</p>
${GRAPH_FORMAT}`,
    entry: "IsBipartite",
    params: ["G"],
    tests: [
      { args: [[[1, 3], [0, 2], [1, 3], [0, 2]]], expect: true, explain: "A square: color 0 and 2 red, 1 and 3 blue." },
      { args: [[[1, 2], [0, 2], [0, 1]]], expect: false, explain: "A triangle: the third vertex clashes with one of the others." },
      { args: [[[1, 4], [0, 2], [1, 3], [2, 4], [0, 3]]], expect: false, explain: "A 5-cycle has no triangle, but it's an ODD cycle, so it can't be 2-colored." },
      { args: [[[1, 5], [0, 2], [1, 3], [2, 4], [3, 5], [0, 4]]], expect: true, name: "Even cycle (has a cycle, still bipartite)" },
      { args: [[[1], [0], [3, 4], [2, 4], [2, 3]]], expect: false, name: "Odd cycle in the second component" },
      { args: [[]], expect: true, name: "Empty graph" },
      { args: [[[1, 2, 3], [0], [0, 4], [0], [2]]], expect: true, name: "A tree" },
      { args: [[[2, 3, 4], [2, 3, 4], [0, 1], [0, 1], [0, 1]]], expect: true, name: "Complete bipartite K(2,3)" },
    ],
    random: { count: 25, gen: (r, i) => { const n = 1 + (i % 12); const G = i % 2 ? randBipartite(r, n, 0.4) : randGraph(r, n, 0.2); if (i % 4 === 1 && n > 2) addEdge(G, r.int(0, n - 1), r.int(0, n - 1)); return [G]; } },
    reference: (G) => bipartite(G),
    mutants: [
      { fn: (G) => bipartite(G, true), hint: "An odd cycle in a component that doesn't contain vertex 0 is missed. Start a new coloring BFS from every uncolored vertex." },
      { fn: (G) => { const n = G.length; for (let a = 0; a < n; a++) for (const b of G[a]) for (const c of G[b]) if (c !== a && G[c].includes(a)) return false; return true; }, hint: "You seem to reject only triangles. Any ODD cycle (5, 7, …) also makes 2-coloring impossible — let the coloring discover conflicts instead of looking for specific shapes." },
      { fn: (G) => !hasCycle(G), hint: "You reject every graph with a cycle. EVEN cycles are fine (a square is bipartite); only odd cycles are a problem. Try coloring with BFS and look for an edge whose endpoints got the same color." },
    ],
    hints: [
      "If a vertex is red, what color must all its neighbours be? What does it mean if an edge ends up with the same color on both ends?",
      "color ← array(n, −1). For every uncolored s: color it 0 and BFS from it; each newly reached neighbour w of v gets color 1 − color[v].",
      "When you look at an ALREADY colored neighbour w of v: if color[w] = color[v] then return false. If all BFS runs finish without a clash, return true.",
    ],
    starter: {
      pseudo: `ALGORITHM IsBipartite(G[0..n-1])
    color ← array(n, -1)
    for s ← 0 to n - 1 do
        if color[s] = -1 then
            ...
    return true`,
      js: `function IsBipartite(G) {
  const n = G.length, color = Array(n).fill(-1);
  // ...
  return true;
}`,
    },
    solution: {
      pseudo: `ALGORITHM IsBipartite(G[0..n-1])
    color ← array(n, -1)
    for s ← 0 to n - 1 do
        if color[s] = -1 then
            color[s] ← 0
            Q ← queue()
            enqueue(Q, s)
            while not isEmpty(Q) do
                v ← dequeue(Q)
                for each w in G[v] do
                    if color[w] = -1 then
                        color[w] ← 1 - color[v]
                        enqueue(Q, w)
                    else if color[w] = color[v] then
                        return false
    return true`,
      js: `function IsBipartite(G) {
  const n = G.length, color = Array(n).fill(-1);
  for (let s = 0; s < n; s++) {
    if (color[s] !== -1) continue;
    color[s] = 0;
    const Q = [s];
    while (Q.length) {
      const v = Q.shift();
      for (const w of G[v]) {
        if (color[w] === -1) { color[w] = 1 - color[v]; Q.push(w); }
        else if (color[w] === color[v]) return false;
      }
    }
  }
  return true;
}`,
      python: `from collections import deque
def is_bipartite(G):
    n = len(G)
    color = [-1] * n
    for s in range(n):
        if color[s] != -1:
            continue
        color[s] = 0
        Q = deque([s])
        while Q:
            v = Q.popleft()
            for w in G[v]:
                if color[w] == -1:
                    color[w] = 1 - color[v]
                    Q.append(w)
                elif color[w] == color[v]:
                    return False
    return True`,
      explain: "BFS colors each vertex by the parity of its distance from the start, which is forced once the start's color is chosen. A same-color edge means two vertices at equal-parity distances are adjacent, which closes an odd cycle — so the graph can't be bipartite; if no clash occurs, the coloring itself is a proof. One BFS over everything: Θ(|V| + |E|).",
    },
    complexity: "Θ(|V| + |E|)",
    followUp: "Return the two groups (or an odd cycle as a certificate when the answer is no). Senior twist: 2-coloring is easy, but 3-coloring is Nondeterministic Polynomial (NP)-complete (see graph-coloring-m) — one of the sharpest 'easy vs hard' cliffs in computer science.",
    distractors: ["color[w] ← color[v]", "else if color[w] ≠ color[v] then", "if color[s] = 0 then"],
    visual: "sims/graph-traversal.html",
    lesson: LESSON,
  });
})();
