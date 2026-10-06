/* Exemplar problems — these also serve as the reference for the problem format.
   See ../PROBLEM_FORMAT.md. Every problem is validated by tools/validate-problems.mjs. */

ForgeProblems.add({
  id: "max-element",
  title: "Largest Element",
  level: 0, chapter: 2, difficulty: 1,
  topics: ["arrays", "loops", "analysis"],
  strategy: "Brute force (one pass)",
  source: "Levitin §2.3, Example 1",
  summary: "Scan an array once and return its largest value.",
  statement: `
<p>Given a non-empty array <code>A[0..n-1]</code> of numbers, return the <b>largest</b> value in it.</p>
<p>This is the classic first algorithm to analyze: its <i>basic operation</i> is the comparison
<code>A[i] &gt; maxval</code>, and it runs exactly <code>n − 1</code> times for every input.</p>
<p><b>Constraint:</b> build it yourself — the built-in <code>max(…)</code> is not allowed here.</p>`,
  entry: "MaxElement",
  params: ["A"],
  tests: [
    { args: [[3, 9, 2, 7]], expect: 9, explain: "9 is the biggest." },
    { args: [[5]], expect: 5, explain: "A single element is the maximum." },
    { args: [[-4, -2, -9]], expect: -2, explain: "Works with negatives — don't start maxval at 0!" },
    { args: [[1, 2, 3, 4, 5, 6]], expect: 6 },
    { args: [[8, 8, 1, 8]], expect: 8 },
    { args: [[12, 4, 7]], expect: 12, explain: "The maximum can be the very first element." },
  ],
  random: { count: 25, gen: (r, i) => [r.array(1 + (i % 12) * 3, -50, 50)] },
  reference: (A) => Math.max(...A),
  forbid: ["max", "sorted"],
  budget: { metric: "keyComparisons", label: "element comparisons", limit: (A) => A.length - 1, hint: "You only need n − 1 comparisons: compare each element (after the first) with the best so far, exactly once." },
  growth: { metric: "keyComparisons", sizes: [16, 32, 64, 128, 256], gen: (r, n) => [r.array(n, 0, 1000)], expect: "n" },
  mutants: [
    { fn: (A) => Math.max(0, ...A), hint: "When every number is negative your answer is 0. Start maxval at A[0], not at 0 — 0 might not even be in the array." },
    { fn: (A) => Math.max(...A.slice(0, A.length - 1).concat(A.length === 1 ? A : [])), hint: "It looks like the last element is never checked. Your loop should run i ← 1 to n − 1 (inclusive)." },
    { fn: (A) => Math.max(...A.slice(1).concat(A.length === 1 ? A : [])), hint: "It looks like A[0] is never considered. Initialize maxval ← A[0] before the loop." },
  ],
  hints: [
    "Keep one variable that remembers 'the biggest value seen so far'. What should it be before you've looked at anything but the first element?",
    "Start with maxval ← A[0]. Then walk i from 1 to n − 1 and ask one question per element.",
    "Inside the loop: if A[i] > maxval then maxval ← A[i]. After the loop, return maxval.",
  ],
  starter: {
    pseudo: `ALGORITHM MaxElement(A[0..n-1])
    // Input: array A of n ≥ 1 numbers
    // Output: the largest value in A
    maxval ← ...
    for i ← 1 to n - 1 do
        ...
    return maxval`,
    js: `function MaxElement(A) {
  // return the largest value in A (don't use Math.max)
}`,
  },
  solution: {
    pseudo: `ALGORITHM MaxElement(A[0..n-1])
    maxval ← A[0]
    for i ← 1 to n - 1 do
        if A[i] > maxval then
            maxval ← A[i]
    return maxval`,
    js: `function MaxElement(A) {
  let maxval = A[0];
  for (let i = 1; i < A.length; i++) if (A[i] > maxval) maxval = A[i];
  return maxval;
}`,
    python: `def max_element(A):
    maxval = A[0]
    for i in range(1, len(A)):
        if A[i] > maxval:
            maxval = A[i]
    return maxval`,
    explain: "One pass, one comparison per element after the first: C(n) = Σ_{i=1}^{n-1} 1 = n − 1 ∈ Θ(n) — the same for best, worst and average case.",
  },
  complexity: "Θ(n) comparisons (exactly n − 1)",
  visual: "sims/sorting-studio.html",
  lesson: "lessons/02-analysis-framework/README.md",
});

ForgeProblems.add({
  id: "sort-analysis-counter",
  title: "Fix the Comparison Counter (SortAnalysis)",
  level: 1, chapter: 2, difficulty: 2,
  topics: ["empirical analysis", "insertion sort", "counting operations"],
  strategy: "Empirical analysis",
  source: "Levitin §2.6 & Exercise 2.6.1 · empirical-analysis lab",
  summary: "Insertion sort that returns the exact number of key comparisons A[j] > v.",
  statement: `
<p>Levitin Exercise 2.6.1 gives an insertion sort with a comparison counter — but the counter is in the wrong place:</p>
<pre>while j ≥ 0 and A[j] > v do
    count ← count + 1      // only counts comparisons that were TRUE
    A[j + 1] ← A[j]
    j ← j − 1</pre>
<p>Write <code>SortAnalysis(A[0..n-1])</code> that sorts <code>A</code> by insertion sort <b>and returns the exact number of key
comparisons</b> <code>A[j] &gt; v</code> that were evaluated — including the last one in each pass that comes out <i>false</i>.
(When <code>j</code> becomes −1 no key comparison happens, so don't count that.)</p>
<p>Example: for the already-sorted array <code>[1, 2, 3, 4]</code> each pass makes exactly one comparison, so the answer is 3 — the buggy version reports 0.</p>`,
  entry: "SortAnalysis",
  params: ["A"],
  tests: [
    { args: [[1, 2, 3, 4]], expect: 3, explain: "Sorted input: one (false) comparison per pass → n − 1." },
    { args: [[4, 3, 2, 1]], expect: 6, explain: "Reversed input: every comparison is true, and each pass stops at j = −1 → n(n−1)/2." },
    { args: [[89, 45, 68, 90, 29, 34, 17]], expect: 19, explain: "The textbook's example array." },
    { args: [[5]], expect: 0, explain: "One element: no passes, no comparisons." },
    { args: [[2, 2, 2]], expect: 2, explain: "Equal keys: A[j] > v is false immediately." },
  ],
  random: {
    count: 30,
    gen: (r, i) => [r.array(2 + (i % 15) * 2, 0, 20)],
  },
  reference: (A) => { let c = 0; for (let i = 1; i < A.length; i++) { const v = A[i]; let j = i - 1; while (j >= 0) { c++; if (A[j] > v) { A[j + 1] = A[j]; j--; } else break; } A[j + 1] = v; } return c; },
  mutants: [
    { fn: (A) => { let c = 0; for (let i = 1; i < A.length; i++) { const v = A[i]; let j = i - 1; while (j >= 0 && A[j] > v) { c++; A[j + 1] = A[j]; j--; } A[j + 1] = v; } return c; }, hint: "You are counting only the comparisons that came out TRUE (the counter is inside the loop body). Each pass that stops because A[j] ≤ v also made one comparison that you're missing." },
    { fn: (A) => { let c = 0; for (let i = 1; i < A.length; i++) { const v = A[i]; let j = i - 1; while (j >= 0 && A[j] > v) { c++; A[j + 1] = A[j]; j--; } c++; A[j + 1] = v; } return c; }, hint: "Close! You add one extra comparison after every pass — but when the loop ended because j reached −1, no key comparison happened. Only add it if j ≥ 0." },
  ],
  lints: [
    { re: "while[^\\n]*and[^\\n]*>[^\\n]*do\\s*\\n\\s*count", lang: "pseudo", message: "Your counter sits inside the while-body, so it only sees TRUE comparisons. Try testing j ≥ 0 in the loop header and doing the key comparison (with the count) inside the loop, using break when it's false." },
  ],
  hints: [
    "Trace the sorted array [1, 2, 3, 4] by hand. How many times is A[j] > v evaluated? What does the given code report?",
    "The comparison A[j] > v is evaluated once more than the number of shifts in every pass — except when the pass stops because j fell to −1.",
    "Restructure: while j ≥ 0 do { count ← count + 1; if A[j] > v then shift and j ← j − 1 else break }.",
  ],
  starter: {
    pseudo: `ALGORITHM SortAnalysis(A[0..n-1])
    // Sort A by insertion sort and return the number of key comparisons A[j] > v
    count ← 0
    for i ← 1 to n - 1 do
        v ← A[i]
        j ← i - 1
        while j ≥ 0 and A[j] > v do
            count ← count + 1
            A[j + 1] ← A[j]
            j ← j - 1
        A[j + 1] ← v
    return count`,
    js: `function SortAnalysis(A) {
  let count = 0;
  for (let i = 1; i < A.length; i++) {
    const v = A[i];
    let j = i - 1;
    while (j >= 0 && A[j] > v) {
      count++;            // <- is this the right place?
      A[j + 1] = A[j];
      j--;
    }
    A[j + 1] = v;
  }
  return count;
}`,
  },
  solution: {
    pseudo: `ALGORITHM SortAnalysis(A[0..n-1])
    count ← 0
    for i ← 1 to n - 1 do
        v ← A[i]
        j ← i - 1
        while j ≥ 0 do
            count ← count + 1          // one key comparison A[j] > v
            if A[j] > v then
                A[j + 1] ← A[j]
                j ← j - 1
            else
                break
        A[j + 1] ← v
    return count`,
    js: `function SortAnalysis(A) {
  let count = 0;
  for (let i = 1; i < A.length; i++) {
    const v = A[i];
    let j = i - 1;
    while (j >= 0) {
      count++;
      if (A[j] > v) { A[j + 1] = A[j]; j--; } else break;
    }
    A[j + 1] = v;
  }
  return count;
}`,
    python: `def sort_analysis(A):
    count = 0
    for i in range(1, len(A)):
        v, j = A[i], i - 1
        while j >= 0:
            count += 1
            if A[j] > v:
                A[j + 1] = A[j]; j -= 1
            else:
                break
        A[j + 1] = v
    return count`,
    explain: "Counting every evaluation of A[j] > v gives n − 1 comparisons on sorted input (best case), n(n−1)/2 on reversed input (worst case) and about n²/4 on random input (average case) — exactly what your scatter plot should show.",
  },
  complexity: "Best Θ(n), average ≈ n²/4, worst n(n−1)/2",
  visual: "sims/empirical-lab.html",
  lesson: "practice/empirical-analysis-lab/README.md",
});

ForgeProblems.add({
  id: "min-max-3n-over-2",
  title: "Min and Max in ⌈3n/2⌉ − 2 Comparisons",
  level: 3, chapter: 6, difficulty: 3,
  topics: ["comparisons", "lower bounds", "transform-and-conquer"],
  strategy: "Pairwise processing",
  source: "Classic exam problem (Practice Exam 1, Problem A3) · Levitin Exercise 5.1.2-style",
  summary: "Find both the smallest and largest element using at most ⌈3n/2⌉ − 2 element comparisons.",
  statement: `
<p>Given <code>A[0..n-1]</code> (n ≥ 1), return <code>[min, max]</code>.</p>
<p>The obvious way (scan for the min, scan again for the max) uses <code>2n − 2</code> comparisons. Your algorithm must use
<b>at most ⌈3n/2⌉ − 2</b> element comparisons — the grader counts every comparison that involves an array element.</p>
<p>Think about looking at the elements <b>two at a time</b>.</p>`,
  entry: "MinMax",
  params: ["A"],
  tests: [
    { args: [[3, 9, 2, 7]], expect: [2, 9], explain: "n = 4 → at most 4 comparisons." },
    { args: [[5]], expect: [5, 5] },
    { args: [[4, 1]], expect: [1, 4], explain: "n = 2 → exactly 1 comparison allowed." },
    { args: [[8, 3, 5, 1, 9]], expect: [1, 9], explain: "n = 5 (odd) → at most 6 comparisons." },
    { args: [[2, 2, 2, 2, 2, 2]], expect: [2, 2] },
  ],
  random: { count: 30, gen: (r, i) => [r.array(1 + i, -100, 100)] },
  reference: (A) => [Math.min(...A), Math.max(...A)],
  forbid: ["min", "max", "sorted"],
  budget: { metric: "keyComparisons", label: "element comparisons", limit: (A) => Math.max(0, Math.ceil((3 * A.length) / 2) - 2), hint: "Process elements in pairs: compare the two with each other first (1 comparison), then only the smaller one against the current min and only the larger one against the current max (2 more) — 3 comparisons per 2 elements." },
  mutants: [
    { fn: (A) => [Math.min(...A.slice(0, A.length - (A.length % 2 === 0 ? 0 : 1)).concat(A.length === 1 ? A : [])), Math.max(...A.slice(0, A.length - (A.length % 2 === 0 ? 0 : 1)).concat(A.length === 1 ? A : []))], hint: "For odd n the last unpaired element seems to be skipped. Handle it separately (or start by using A[0] alone as both min and max, then pair up the rest)." },
  ],
  hints: [
    "Take two elements x and y. After one comparison you know which is smaller. Which of them could possibly be the new minimum? Which could be the new maximum?",
    "Initialize: if n is odd, min ← max ← A[0] and start pairing at index 1; if n is even, compare A[0] with A[1] to set min and max and start pairing at 2.",
    "For each pair (A[i], A[i+1]): compare them (1), compare the smaller with min (1), the larger with max (1). That's 3 comparisons per 2 elements.",
  ],
  starter: {
    pseudo: `ALGORITHM MinMax(A[0..n-1])
    // Output: [min, max] using at most ⌈3n/2⌉ − 2 element comparisons
    ...
    return [mn, mx]`,
    js: `function MinMax(A) {
  // return [min, max] — the grader counts comparisons only in pseudocode mode
}`,
  },
  solution: {
    pseudo: `ALGORITHM MinMax(A[0..n-1])
    if n mod 2 = 1 then
        mn ← A[0]; mx ← A[0]; i ← 1
    else
        if A[0] < A[1] then
            mn ← A[0]; mx ← A[1]
        else
            mn ← A[1]; mx ← A[0]
        i ← 2
    while i < n - 1 do
        if A[i] < A[i + 1] then
            small ← A[i]; big ← A[i + 1]
        else
            small ← A[i + 1]; big ← A[i]
        if small < mn then mn ← small
        if big > mx then mx ← big
        i ← i + 2
    return [mn, mx]`,
    js: `function MinMax(A) {
  let mn, mx, i;
  if (A.length % 2 === 1) { mn = mx = A[0]; i = 1; }
  else { if (A[0] < A[1]) { mn = A[0]; mx = A[1]; } else { mn = A[1]; mx = A[0]; } i = 2; }
  for (; i < A.length - 1; i += 2) {
    const [s, b] = A[i] < A[i + 1] ? [A[i], A[i + 1]] : [A[i + 1], A[i]];
    if (s < mn) mn = s;
    if (b > mx) mx = b;
  }
  return [mn, mx];
}`,
    python: `def min_max(A):
    n = len(A)
    if n % 2: mn = mx = A[0]; i = 1
    else:
        mn, mx = (A[0], A[1]) if A[0] < A[1] else (A[1], A[0]); i = 2
    while i < n - 1:
        s, b = (A[i], A[i+1]) if A[i] < A[i+1] else (A[i+1], A[i])
        mn = min(mn, s); mx = max(mx, b); i += 2
    return [mn, mx]`,
    explain: "n even: 1 + 3(n−2)/2 = 3n/2 − 2. n odd: 3(n−1)/2 = ⌈3n/2⌉ − 2. This is optimal: an adversary argument shows ⌈3n/2⌉ − 2 comparisons are necessary.",
  },
  complexity: "⌈3n/2⌉ − 2 comparisons (optimal)",
  lesson: "lessons/06-transform-and-conquer/README.md",
});

ForgeProblems.add({
  id: "topological-sort-source-removal",
  title: "Topological Sort (Source Removal)",
  level: 2, chapter: 4, difficulty: 2,
  topics: ["graphs", "DAG", "decrease-and-conquer"],
  strategy: "Decrease-by-one",
  source: "Levitin §4.2",
  summary: "Order the vertices of a directed acyclic graph so every edge points forward; return [] if there's a cycle.",
  statement: `
<p>A directed graph with vertices <code>0..n-1</code> is given as adjacency lists: <code>adj[v]</code> lists the vertices <code>w</code>
with an edge <code>v → w</code>.</p>
<p>Return a list of all vertices in an order where <b>every edge goes from earlier to later</b> (a topological order).
If the graph has a directed cycle, no such order exists — return the empty list <code>[]</code>.</p>
<p>Use the <b>source-removal</b> idea: repeatedly take a vertex with no incoming edges ("a source"), output it, and delete its edges.
Any valid order is accepted.</p>`,
  entry: "TopoSort",
  params: ["adj"],
  tests: [
    { args: [[[2], [2], [3, 4], [4], []]], expect: [0, 1, 2, 3, 4], explain: "A course-prerequisite style Directed Acyclic Graph (DAG): 0 and 1 before 2, 2 before 3 and 4, 3 before 4." },
    { args: [[[1], [2], [0]]], expect: [], explain: "0 → 1 → 2 → 0 is a cycle: no order exists." },
    { args: [[[], [], []]], expect: [0, 1, 2], explain: "No edges: any permutation works." },
    { args: [[[1, 2], [3], [3], []]], expect: [0, 1, 2, 3] },
  ],
  random: {
    count: 25,
    gen: (r, i) => {
      const n = 2 + (i % 9);
      const perm = r.shuffle([...Array(n).keys()]);
      const adj = Array.from({ length: n }, () => []);
      for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (r() < 0.35) adj[perm[a]].push(perm[b]);
      if (i % 4 === 3 && n > 2) adj[perm[n - 1]].push(perm[0]); // sometimes add a back edge → cycle (if a path exists)
      return [adj];
    },
  },
  verify: (got, [adj]) => {
    const n = adj.length;
    // does a topological order exist?
    const indeg = Array(n).fill(0); adj.forEach((ws) => ws.forEach((w) => indeg[w]++));
    const q = []; indeg.forEach((d, v) => { if (!d) q.push(v); });
    let seen = 0; const deg = indeg.slice();
    while (q.length) { const v = q.shift(); seen++; adj[v].forEach((w) => { if (--deg[w] === 0) q.push(w); }); }
    const isDag = seen === n;
    if (!Array.isArray(got)) return "Return a list of vertices.";
    if (!isDag) return got.length === 0 ? true : "This graph has a directed cycle, so the answer must be the empty list [].";
    if (got.length !== n) return `Your list has ${got.length} vertices; a topological order lists all ${n}.`;
    const pos = Array(n).fill(-1);
    for (let k = 0; k < got.length; k++) { const v = got[k]; if (!(v >= 0 && v < n) || pos[v] !== -1) return `Vertex ${v} is missing, repeated or out of range.`; pos[v] = k; }
    for (let v = 0; v < n; v++) for (const w of adj[v]) if (pos[v] > pos[w]) return `Edge ${v} → ${w} points backwards in your order.`;
    return true;
  },
  mutants: [
    { fn: (adj) => [...Array(adj.length).keys()], hint: "Your output looks like just 0, 1, …, n − 1. You need to actually use the edges: compute in-degrees and repeatedly remove a vertex whose in-degree is 0." },
  ],
  hints: [
    "First count, for every vertex, how many edges come INTO it (its in-degree). Which vertices can safely go first?",
    "Put every vertex with in-degree 0 into a queue. Repeatedly dequeue v, append it to the answer, and for each edge v → w decrease w's in-degree; if it hits 0, enqueue w.",
    "If the answer ends up shorter than n, some vertices never reached in-degree 0 — that means there's a cycle, so return [].",
  ],
  starter: {
    pseudo: `ALGORITHM TopoSort(adj[0..n-1])
    // adj[v] = list of w with an edge v → w
    indeg ← array(n, 0)
    ...
    return order`,
    js: `function TopoSort(adj) {
  const n = adj.length;
  // return a topological order, or [] if there is a cycle
}`,
  },
  solution: {
    pseudo: `ALGORITHM TopoSort(adj[0..n-1])
    indeg ← array(n, 0)
    for v ← 0 to n - 1 do
        for each w in adj[v] do
            indeg[w] ← indeg[w] + 1
    Q ← queue()
    for v ← 0 to n - 1 do
        if indeg[v] = 0 then enqueue(Q, v)
    order ← []
    while not isEmpty(Q) do
        v ← dequeue(Q)
        append(order, v)
        for each w in adj[v] do
            indeg[w] ← indeg[w] - 1
            if indeg[w] = 0 then enqueue(Q, w)
    if length(order) < n then return []
    return order`,
    js: `function TopoSort(adj) {
  const n = adj.length, indeg = Array(n).fill(0);
  adj.forEach(ws => ws.forEach(w => indeg[w]++));
  const q = [], order = [];
  indeg.forEach((d, v) => { if (d === 0) q.push(v); });
  while (q.length) {
    const v = q.shift(); order.push(v);
    for (const w of adj[v]) if (--indeg[w] === 0) q.push(w);
  }
  return order.length < n ? [] : order;
}`,
    python: `from collections import deque
def topo_sort(adj):
    n = len(adj); indeg = [0] * n
    for ws in adj:
        for w in ws: indeg[w] += 1
    q = deque(v for v in range(n) if indeg[v] == 0); order = []
    while q:
        v = q.popleft(); order.append(v)
        for w in adj[v]:
            indeg[w] -= 1
            if indeg[w] == 0: q.append(w)
    return order if len(order) == n else []`,
    explain: "Each vertex is enqueued once and each edge is examined once: Θ(n + m) with adjacency lists (Θ(n²) with an adjacency matrix).",
  },
  complexity: "Θ(n + m) with adjacency lists",
  visual: "sims/topo-sort.html",
  lesson: "lessons/04-decrease-and-conquer/README.md",
});

ForgeProblems.add({
  id: "negatives-before-positives",
  title: "Negatives Before Positives (Two Ways)",
  level: 2, chapter: 4, difficulty: 2,
  topics: ["arrays", "partitioning", "decrease-and-conquer", "in-place"],
  strategy: "Two pointers / decrease-by-one",
  source: "Classic exam problem (Practice Exam 1, Problem B2)",
  summary: "Rearrange an array in place so all negative numbers come before all non-negative ones, in linear time.",
  statement: `
<p>Rearrange the elements of <code>A[0..n-1]</code> <b>in place</b> so that every negative element comes before every
non-negative element (zeros count as non-negative). The relative order inside each group does not matter. The grader checks the
array itself after your algorithm finishes.</p>
<p>Your algorithm must be <b>linear</b> — Θ(n). On an exam you'd write it twice: once recursively (decrease-and-conquer) and
once with a loop. Try both here!</p>`,
  entry: "Rearrange",
  params: ["A"],
  output: { arg: 0 },
  tests: [
    { args: [[3, -1, 4, -5, 9, -2]], expect: [-1, -5, -2, 3, 4, 9], explain: "Any order with the three negatives first is accepted." },
    { args: [[-1, -2, -3]], expect: [-1, -2, -3] },
    { args: [[0, 5, -7]], expect: [-7, 0, 5] },
    { args: [[]], expect: [] },
  ],
  random: { count: 25, gen: (r, i) => [r.array(i * 3, -20, 20)] },
  verify: (got, [A]) => {
    if (!Array.isArray(got) || got.length !== A.length) return "The array must keep all its elements.";
    const s1 = got.slice().sort((a, b) => a - b), s2 = A.slice().sort((a, b) => a - b);
    if (s1.some((x, i) => x !== s2[i])) return "The array must contain exactly the same numbers (just rearranged).";
    let seenNonNeg = false;
    for (let i = 0; i < got.length; i++) { if (got[i] >= 0) seenNonNeg = true; else if (seenNonNeg) return `A[${i}] = ${got[i]} is negative but comes after a non-negative element.`; }
    return true;
  },
  growth: { metric: "steps", sizes: [32, 64, 128, 256, 512], gen: (r, n) => [r.array(n, -50, 50)], expect: "n" },
  hints: [
    "Keep two indexes: i scanning from the left, j from the right. What should happen when A[i] is negative? When A[j] is non-negative?",
    "Loop while i ≤ j: if A[i] < 0 advance i; else if A[j] ≥ 0 move j left; otherwise both are 'on the wrong side' — swap them.",
    "Recursive version: Rearrange(A[l..r]) — if A[l] < 0 recurse on A[l+1..r]; else swap A[l] with A[r] and recurse on A[l..r−1]. Each call shrinks the range by one: T(n) = T(n − 1) + 1 ∈ Θ(n).",
  ],
  starter: {
    pseudo: `ALGORITHM Rearrange(A[0..n-1])
    // Put all negatives before all non-negatives, in place, in Θ(n)
    i ← 0; j ← n - 1
    ...`,
    js: `function Rearrange(A) {
  // modify A in place
}`,
  },
  solution: {
    pseudo: `ALGORITHM Rearrange(A[0..n-1])
    i ← 0; j ← n - 1
    while i ≤ j do
        if A[i] < 0 then
            i ← i + 1
        else if A[j] ≥ 0 then
            j ← j - 1
        else
            swap A[i] and A[j]
            i ← i + 1; j ← j - 1
    return A

// A recursive (decrease-by-one) version you can also submit:
// ALGORITHM Rearrange(A[0..n-1])
//     Part(A, 0, n - 1)
// ALGORITHM Part(A, l, r)
//     if l ≥ r return
//     if A[l] < 0 then Part(A, l + 1, r)
//     else
//         swap A[l] and A[r]
//         Part(A, l, r - 1)`,
    js: `function Rearrange(A) {
  let i = 0, j = A.length - 1;
  while (i <= j) {
    if (A[i] < 0) i++;
    else if (A[j] >= 0) j--;
    else { [A[i], A[j]] = [A[j], A[i]]; i++; j--; }
  }
  return A;
}`,
    python: `def rearrange(A):
    i, j = 0, len(A) - 1
    while i <= j:
        if A[i] < 0: i += 1
        elif A[j] >= 0: j -= 1
        else:
            A[i], A[j] = A[j], A[i]; i += 1; j -= 1
    return A`,
    explain: "Every iteration moves i right or j left (or both), and they start n − 1 apart, so the loop runs at most n times: Θ(n). The recursive version has T(n) = T(n − 1) + Θ(1) = Θ(n).",
  },
  complexity: "Θ(n) time, Θ(1) extra space",
  lesson: "lessons/04-decrease-and-conquer/README.md",
});
