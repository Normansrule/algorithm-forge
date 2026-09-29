/* Pack C — Decrease-and-Conquer & Divide-and-Conquer (level 2, Levitin Ch 4–5).
   Format: ../PROBLEM_FORMAT.md · validate with: node tools/validate-problems.mjs decrease-divide.js
   Everything is wrapped in an IIFE so the helper functions below don't leak into other packs. */
(function () {
  "use strict";

  /* ---------- shared helpers (trees, sorting, oracles) ---------- */
  const node = (key, left = null, right = null) => ({ key, left, right });
  // Build a Binary Search Tree (BST) by inserting keys in the given order.
  function bst(keys) {
    let root = null;
    for (const k of keys) {
      const z = node(k);
      if (!root) { root = z; continue; }
      let t = root;
      for (;;) {
        if (k < t.key) { if (t.left) t = t.left; else { t.left = z; break; } }
        else { if (t.right) t = t.right; else { t.right = z; break; } }
      }
    }
    return root;
  }
  // Perfectly balanced BST from sorted keys (middle element becomes the root).
  function balanced(keys, lo = 0, hi = keys.length - 1) {
    if (lo > hi) return null;
    const m = (lo + hi) >> 1;
    return node(keys[m], balanced(keys, lo, m - 1), balanced(keys, m + 1, hi));
  }
  // Mutants for in-place problems ({output: {arg: 0}}) must change the argument itself.
  const inPlace = (f) => (A, ...rest) => { const res = f(A.slice(), ...rest); A.length = 0; res.forEach((x) => A.push(x)); return A; };
  const range = (n) => Array.from({ length: n }, (_, i) => i);
  const asc = (xs) => xs.slice().sort((a, b) => a - b);
  const height = (t) => (t ? Math.max(height(t.left), height(t.right)) + 1 : -1);
  const size = (t) => (t ? size(t.left) + size(t.right) + 1 : 0);
  const leaves = (t) => (!t ? 0 : !t.left && !t.right ? 1 : leaves(t.left) + leaves(t.right));
  // Levitin Figure 5.6-style tree: a(b(d(-, g), e), c(f, -))
  const FIG56 = node("a", node("b", node("d", null, node("g")), node("e")), node("c", node("f"), null));

  /* =====================================================================
     1. Insertion sort
     ===================================================================== */
  ForgeProblems.add({
    id: "insertion-sort",
    title: "Insertion Sort",
    level: 2, chapter: 4, difficulty: 1,
    topics: ["sorting", "decrease-and-conquer", "in-place"],
    strategy: "Decrease-by-one",
    source: "Levitin §4.1",
    summary: "Sort an array in place by inserting each element into the sorted part to its left.",
    statement: `
<p>Insertion sort is the decrease-by-one idea applied to sorting: <i>assume</i> <code>A[0..i-1]</code> is already sorted,
then slide <code>A[i]</code> left until it sits in its proper place. It is the fastest elementary sort on small or
nearly-sorted arrays, which is why real libraries (Timsort, introsort) still use it for short runs.</p>
<p><b>Task:</b> sort <code>A[0..n-1]</code> in nondecreasing order <b>in place</b>. The grader checks the array itself after your
algorithm finishes (returning it as well is fine).</p>
<p><b>Constraints:</b> 0 ≤ n ≤ 40; values are integers. The built-in <code>sorted(…)</code> is not allowed.</p>
<p><b>Efficiency:</b> on an array that is <i>already sorted</i> your algorithm must do only Θ(n) key comparisons —
that best case is insertion sort's superpower (selection sort can't do it).</p>`,
    entry: "InsertionSort",
    params: ["A"],
    output: { arg: 0 },
    tests: [
      { args: [[89, 45, 68, 90, 29, 34, 17]], expect: [17, 29, 34, 45, 68, 89, 90], explain: "The textbook example: 17 ends up sliding all the way to the front." },
      { args: [[6, 4, 1, 8, 5]], expect: [1, 4, 5, 6, 8], explain: "The lecture example: the sorted prefix grows 6 | 4 6 | 1 4 6 | 1 4 6 8 | 1 4 5 6 8." },
      { args: [[]], expect: [], explain: "An empty array is already sorted — don't touch A[0]!" },
      { args: [[5]], expect: [5] },
      { args: [[1, 2, 3, 4, 5]], expect: [1, 2, 3, 4, 5], explain: "Best case: every insertion stops after one comparison." },
      { args: [[5, 4, 3, 2, 1]], expect: [1, 2, 3, 4, 5], explain: "Worst case: every element travels to the front." },
      { args: [[3, 1, 3, 1, 2]], expect: [1, 1, 2, 3, 3] },
      { args: [[-2, 5, -7, 0]], expect: [-7, -2, 0, 5] },
      { args: [[2, 1]], expect: [1, 2], explain: "The new element must be able to move into position 0." },
    ],
    random: { count: 25, gen: (r, i) => [r.array(2 + (i % 12) * 3, -30, 30)] },
    reference: (A) => asc(A),
    forbid: ["sorted"],
    growth: { metric: "keyComparisons", sizes: [16, 32, 64, 128, 256], gen: (r, n) => [r.sorted(n, 0, 1000)], expect: "n" },
    mutants: [
      { fn: inPlace((A) => (A.length <= 1 ? A.slice() : asc(A.slice(0, -1)).concat([A[A.length - 1]]))), hint: "The last element never gets inserted. Your outer loop must run i ← 1 to n − 1 inclusive." },
      { fn: (A) => { for (let i = 1; i < A.length; i++) { const v = A[i]; let j = i - 1; while (j > 0 && A[j] > v) { A[j + 1] = A[j]; j--; } A[j + 1] = v; } return A; }, hint: "Nothing ever moves into position 0. Your inner loop probably stops at j > 0 — it should keep going while j ≥ 0." },
      { fn: inPlace((A) => asc(A).reverse()), hint: "Your array comes out in decreasing order. Look at the comparison in the inner while-loop: shift A[j] right only while it is BIGGER than v." },
    ],
    hints: [
      "Imagine the left part A[0..i−1] is already sorted. Where does A[i] belong, and what has to move to make room for it?",
      "Save v ← A[i]. Walk j from i − 1 down toward 0, shifting every element bigger than v one place to the right. Then drop v into the gap.",
      "Inner loop: while j ≥ 0 and A[j] > v do A[j + 1] ← A[j]; j ← j − 1. After the loop: A[j + 1] ← v.",
    ],
    starter: {
      pseudo: `ALGORITHM InsertionSort(A[0..n-1])
    // Sorts A in place, nondecreasing
    for i ← 1 to n - 1 do
        v ← A[i]
        j ← i - 1
        ...
    return A`,
      js: `function InsertionSort(A) {
  // sort A in place (no .sort!)
  return A;
}`,
    },
    solution: {
      pseudo: `ALGORITHM InsertionSort(A[0..n-1])
    for i ← 1 to n - 1 do
        v ← A[i]
        j ← i - 1
        while j ≥ 0 and A[j] > v do
            A[j + 1] ← A[j]
            j ← j - 1
        A[j + 1] ← v
    return A`,
      js: `function InsertionSort(A) {
  for (let i = 1; i < A.length; i++) {
    const v = A[i];
    let j = i - 1;
    while (j >= 0 && A[j] > v) { A[j + 1] = A[j]; j--; }
    A[j + 1] = v;
  }
  return A;
}`,
      python: `def insertion_sort(A):
    for i in range(1, len(A)):
        v, j = A[i], i - 1
        while j >= 0 and A[j] > v:
            A[j + 1] = A[j]
            j -= 1
        A[j + 1] = v
    return A`,
      explain: "Worst case (reversed input) C(n) = Σ_{i=1}^{n−1} i = n(n−1)/2 ∈ Θ(n²); average ≈ n²/4; best case (sorted input) one comparison per pass, n − 1 ∈ Θ(n). It is in place and stable.",
    },
    distractors: ["while j ≥ 0 and A[j] < v do", "for i ← 0 to n - 1 do", "A[j] ← v"],
    followUp: "Real sort libraries switch to insertion sort for runs shorter than ~16–32 elements because its tiny constant beats n log n there. Twist: replace the linear scan with binary search for the insertion point — how many comparisons now, and does the running time improve?",
    complexity: "Θ(n²) worst/average, Θ(n) best",
    visual: "sims/sorting-studio.html",
    lesson: "lessons/04-decrease-and-conquer/README.md",
  });

  /* =====================================================================
     2. Binary search
     ===================================================================== */
  const bsRef = (A, K) => { let l = 0, r = A.length - 1; while (l <= r) { const m = (l + r) >> 1; if (A[m] === K) return m; if (K < A[m]) r = m - 1; else l = m + 1; } return -1; };
  const BS_TEXT = [3, 14, 27, 31, 39, 42, 55, 70, 74, 81, 85, 93, 98];
  ForgeProblems.add({
    id: "binary-search",
    title: "Binary Search",
    level: 2, chapter: 4, difficulty: 1,
    topics: ["searching", "decrease-by-a-constant-factor", "logarithmic"],
    strategy: "Decrease-by-half",
    source: "Levitin §4.4",
    summary: "Find a key in a sorted array with about log₂ n comparisons.",
    statement: `
<p>Binary search compares the key <code>K</code> with the <b>middle</b> element and throws away the half that cannot contain it.
Halving is so powerful that a sorted array of one million elements needs at most 20 probes.</p>
<p><b>Task:</b> <code>A[0..n-1]</code> is sorted in strictly increasing order (no duplicates). Return the index <code>i</code> with
<code>A[i] = K</code>, or <code>−1</code> if <code>K</code> is not in the array.</p>
<p><b>Constraints:</b> 0 ≤ n ≤ 1024. <code>indexOf(…)</code> is not allowed.</p>
<p><b>Budget:</b> Levitin counts one <i>three-way</i> comparison per probe, and the worst case is ⌊log₂ n⌋ + 1 probes. In Forge Pseudocode
<code>K = A[m]</code> and <code>K &lt; A[m]</code> are two separate comparisons, so the grader allows
<b>2(⌊log₂ n⌋ + 1)</b> element comparisons — plenty for binary search, far too few for a linear scan.</p>`,
    entry: "BinarySearch",
    params: ["A", "K"],
    tests: [
      { args: [BS_TEXT, 70], expect: 7, explain: "The textbook trace: probes 55, then 81, then 70 — three iterations." },
      { args: [BS_TEXT, 3], expect: 0, explain: "The first element." },
      { args: [BS_TEXT, 98], expect: 12, explain: "The last element." },
      { args: [BS_TEXT, 50], expect: -1, explain: "Unsuccessful search: l and r cross, return −1." },
      { args: [[], 5], expect: -1, explain: "Empty array: the loop never runs." },
      { args: [[5], 5], expect: 0 },
      { args: [[5], 4], expect: -1 },
      { args: [[1, 2], 2], expect: 1, explain: "The key is found only when l = r — make sure your loop allows that." },
      { args: [[10, 20, 30, 40], 10], expect: 0 },
      { args: [[10, 20, 30, 40], 45], expect: -1, explain: "Larger than everything." },
    ],
    random: {
      count: 25,
      gen: (r, i) => { const A = asc(r.distinct(1 + (i % 20) * 3, -200, 200)); return [A, i % 3 === 0 ? r.int(-210, 210) : r.pick(A)]; },
    },
    reference: bsRef,
    forbid: ["indexOf"],
    budget: { metric: "keyComparisons", label: "element comparisons", limit: (A) => (A.length ? 2 * (Math.floor(Math.log2(A.length)) + 1) : 0), hint: "Too many comparisons: each probe must cut the remaining range in half. Compare K with the MIDDLE element A[⌊(l + r)/2⌋] only, then move l or r past it." },
    growth: { metric: "keyComparisons", sizes: [64, 128, 256, 512, 1024], gen: (r, n) => [range(n).map((x) => 2 * x), 2 * r.int(0, n - 1) + 1], expect: "log n" },
    mutants: [
      { fn: (A, K) => { let l = 0, r = A.length - 1; while (l < r) { const m = (l + r) >> 1; if (A[m] === K) return m; if (K < A[m]) r = m - 1; else l = m + 1; } return -1; }, hint: "Your search misses keys that are found only when the range has shrunk to ONE element. The loop condition must be l ≤ r, not l < r." },
      { fn: (A, K) => { let l = 0, r = A.length - 1; while (l <= r) { const m = (l + r) >> 1; if (A[m] === K) return m; if (K < A[m]) r = m - 1; else l = m + 1; } return l; }, hint: "When the key is absent you return a position (where K would be inserted) instead of −1. After the loop, return −1." },
    ],
    hints: [
      "Compare K with the middle element. If they're not equal, which half can you throw away — and why is that safe only because A is sorted?",
      "Keep two indexes l ← 0 and r ← n − 1 marking the part still in play. While l ≤ r: look at m ← ⌊(l + r)/2⌋.",
      "If K = A[m] return m; else if K < A[m] then r ← m − 1 else l ← m + 1. If the loop ends, return −1.",
    ],
    starter: {
      pseudo: `ALGORITHM BinarySearch(A[0..n-1], K)
    // A is sorted ascending; return an index of K or -1
    l ← 0
    r ← n - 1
    while ... do
        m ← ⌊(l + r) / 2⌋
        ...
    return -1`,
      js: `function BinarySearch(A, K) {
  let l = 0, r = A.length - 1;
  // ...
  return -1;
}`,
    },
    solution: {
      pseudo: `ALGORITHM BinarySearch(A[0..n-1], K)
    l ← 0
    r ← n - 1
    while l ≤ r do
        m ← ⌊(l + r) / 2⌋
        if K = A[m] then
            return m
        else if K < A[m] then
            r ← m - 1
        else
            l ← m + 1
    return -1`,
      js: `function BinarySearch(A, K) {
  let l = 0, r = A.length - 1;
  while (l <= r) {
    const m = Math.floor((l + r) / 2);
    if (K === A[m]) return m;
    if (K < A[m]) r = m - 1; else l = m + 1;
  }
  return -1;
}`,
      python: `def binary_search(A, K):
    l, r = 0, len(A) - 1
    while l <= r:
        m = (l + r) // 2
        if K == A[m]:
            return m
        if K < A[m]:
            r = m - 1
        else:
            l = m + 1
    return -1`,
      explain: "Each probe halves the range: C_worst(n) = C_worst(⌊n/2⌋) + 1 with C_worst(1) = 1, so C_worst(n) = ⌊log₂ n⌋ + 1 = ⌈log₂(n + 1)⌉ three-way comparisons — Θ(log n).",
    },
    distractors: ["while l < r do", "r ← m", "m ← (l + r) / 2"],
    followUp: "Binary search is the heart of database B-tree lookups, git bisect, and 'binary search on the answer' interview problems. Twist: write it with only two-way comparisons (≤ and =) and exactly ⌈log₂ n⌉ + 1 comparisons (Levitin Exercise 4.4.6).",
    complexity: "Θ(log n) comparisons",
    visual: "sims/search-lab.html",
    lesson: "lessons/04-decrease-and-conquer/README.md",
  });

  /* =====================================================================
     3. Binary search — first occurrence
     ===================================================================== */
  const firstRef = (A, K) => { let l = 0, r = A.length - 1, ans = -1; while (l <= r) { const m = (l + r) >> 1; if (A[m] < K) l = m + 1; else { if (A[m] === K) ans = m; r = m - 1; } } return ans; };
  ForgeProblems.add({
    id: "binary-search-first",
    title: "First Occurrence (Binary Search with Duplicates)",
    level: 2, chapter: 4, difficulty: 2,
    topics: ["searching", "decrease-by-a-constant-factor", "duplicates", "lower bound"],
    strategy: "Decrease-by-half",
    source: "Levitin §4.4 (extension) · Interview classic",
    summary: "In a sorted array with duplicates, return the index of the FIRST copy of K in O(log n).",
    statement: `
<p>Plain binary search stops at <i>some</i> copy of the key. Many real tasks need the <b>first</b> one: "the first log line at
or after 10:00", "how many copies of K?" (first and last position), "where would K be inserted?"</p>
<p><b>Task:</b> <code>A[0..n-1]</code> is sorted in nondecreasing order and may contain duplicates. Return the <b>smallest</b>
index <code>i</code> with <code>A[i] = K</code>, or <code>−1</code> if <code>K</code> does not occur.</p>
<p><b>Constraints:</b> 0 ≤ n ≤ 1024. <code>indexOf(…)</code> is not allowed.</p>
<p><b>Efficiency:</b> it must stay Θ(log n) even when <i>every</i> element equals <code>K</code>. Finding any copy and then
walking left one step at a time is Θ(n) on that input — the grader checks this. Budget: 2(⌊log₂ n⌋ + 1) + 1 element comparisons.</p>`,
    entry: "FirstOccurrence",
    params: ["A", "K"],
    tests: [
      { args: [[1, 2, 2, 2, 3], 2], expect: 1, explain: "Three copies of 2 at indexes 1, 2, 3; the first is 1 (plain binary search would land on 2)." },
      { args: [[2, 2, 2, 2], 2], expect: 0, explain: "All equal: the answer is 0." },
      { args: [[1, 3, 5], 4], expect: -1, explain: "Absent key → −1." },
      { args: [[], 1], expect: -1 },
      { args: [[7], 7], expect: 0 },
      { args: [[1, 1, 2, 3, 3, 3, 3, 3, 4], 3], expect: 3 },
      { args: [[1, 2, 3, 4, 5, 5], 5], expect: 4, explain: "Copies at the very end." },
      { args: [[1, 1, 1, 2], 1], expect: 0 },
      { args: [[1, 2, 3], 0], expect: -1, explain: "Smaller than everything." },
    ],
    random: {
      count: 25,
      gen: (r, i) => { const A = r.sorted(1 + (i % 20) * 3, 0, 4 + (i % 7)); return [A, i % 4 === 0 ? r.int(-1, 13) : r.pick(A)]; },
    },
    reference: firstRef,
    forbid: ["indexOf"],
    budget: { metric: "keyComparisons", label: "element comparisons", limit: (A) => (A.length ? 2 * (Math.floor(Math.log2(A.length)) + 1) + 1 : 0), hint: "Too many comparisons. Don't stop and walk left when you find K — record m as a candidate and keep binary-searching the LEFT half (r ← m − 1)." },
    growth: { metric: "keyComparisons", sizes: [64, 128, 256, 512, 1024], gen: (r, n) => [Array(n).fill(7), 7], expect: "log n" },
    mutants: [
      { fn: bsRef, hint: "You return the first copy of K that binary search happens to hit, not the leftmost one. When A[m] = K, remember m but keep searching to the LEFT (r ← m − 1)." },
      { fn: (A, K) => { let l = 0, r = A.length - 1, ans = -1; while (l <= r) { const m = (l + r) >> 1; if (A[m] > K) r = m - 1; else { if (A[m] === K) ans = m; l = m + 1; } } return ans; }, hint: "You found the LAST copy of K. On a match, the search should continue in the left half, not the right half." },
      { fn: (A, K) => { let l = 0, r = A.length - 1; while (l <= r) { const m = (l + r) >> 1; if (A[m] < K) l = m + 1; else r = m - 1; } return l; }, hint: "You return the insertion point even when K is absent. Check A[l] = K (and l < n) before returning it; otherwise return −1." },
    ],
    hints: [
      "When A[m] = K you have found A copy — but could there be another copy further left? Which half should you keep searching?",
      "Keep a variable ans ← −1. Run the usual loop while l ≤ r. If A[m] < K the answer is to the right; otherwise it is at m or to the left.",
      "In the 'otherwise' branch: if A[m] = K then ans ← m; then r ← m − 1 either way. Return ans after the loop.",
    ],
    starter: {
      pseudo: `ALGORITHM FirstOccurrence(A[0..n-1], K)
    l ← 0
    r ← n - 1
    ans ← -1
    while l ≤ r do
        m ← ⌊(l + r) / 2⌋
        ...
    return ans`,
      js: `function FirstOccurrence(A, K) {
  let l = 0, r = A.length - 1, ans = -1;
  // ...
  return ans;
}`,
    },
    solution: {
      pseudo: `ALGORITHM FirstOccurrence(A[0..n-1], K)
    l ← 0
    r ← n - 1
    ans ← -1
    while l ≤ r do
        m ← ⌊(l + r) / 2⌋
        if A[m] < K then
            l ← m + 1
        else
            if A[m] = K then
                ans ← m
            r ← m - 1
    return ans`,
      js: `function FirstOccurrence(A, K) {
  let l = 0, r = A.length - 1, ans = -1;
  while (l <= r) {
    const m = Math.floor((l + r) / 2);
    if (A[m] < K) l = m + 1;
    else { if (A[m] === K) ans = m; r = m - 1; }
  }
  return ans;
}`,
      python: `def first_occurrence(A, K):
    l, r, ans = 0, len(A) - 1, -1
    while l <= r:
        m = (l + r) // 2
        if A[m] < K:
            l = m + 1
        else:
            if A[m] == K:
                ans = m
            r = m - 1
    return ans`,
      explain: "The loop never stops early, but every iteration still halves [l, r], so it runs ⌊log₂ n⌋ + 1 times with at most 2 comparisons each — Θ(log n) even when all elements equal K. Invariant: every index < l holds a value < K, and ans is the leftmost K seen so far.",
    },
    distractors: ["l ← m + 1", "if A[m] ≤ K then", "return m"],
    followUp: "Count the copies of K in O(log n): last occurrence − first occurrence + 1. This 'lower bound / upper bound' pair is exactly C++ std::lower_bound / upper_bound and Python's bisect_left / bisect_right.",
    complexity: "Θ(log n) comparisons",
    visual: "sims/search-lab.html",
    lesson: "lessons/04-decrease-and-conquer/README.md",
  });

  /* =====================================================================
     4. Russian peasant multiplication
     ===================================================================== */
  const rpRef = (n, m) => { const out = []; while (n >= 1) { if (n % 2 === 1) out.push(m); n = Math.floor(n / 2); m *= 2; } return out; };
  ForgeProblems.add({
    id: "russian-peasant",
    title: "Russian Peasant Multiplication",
    level: 2, chapter: 4, difficulty: 1,
    topics: ["arithmetic", "decrease-by-a-constant-factor", "halving and doubling"],
    strategy: "Decrease-by-half",
    source: "Levitin §4.4 · Exercise 4.4.12",
    summary: "Multiply n·m using only halving, doubling and adding — return the numbers that get added.",
    statement: `
<p>Multiplication <i>à la russe</i> uses two facts: if n is even, <code>n·m = (n/2)·(2m)</code>; if n is odd,
<code>n·m = ((n−1)/2)·(2m) + m</code>. Write n and m in two columns, halve the left (rounding down) and double the right until
the left reaches 1. The product is the sum of the right-column values in rows where the left value is <b>odd</b>.
Hardware multipliers do the same thing with shifts.</p>
<p><b>Task:</b> given positive integers <code>n</code> and <code>m</code>, return the <b>list of numbers that get added</b>, in
top-to-bottom row order. Their sum must equal <code>n·m</code>.</p>
<pre>  n     m
 50    65
 25   130   ← odd: add 130
 12   260
  6   520
  3  1040   ← odd: add 1040
  1  2080   ← odd: add 2080      answer [130, 1040, 2080]  (sum 3250 = 50·65)</pre>
<p><b>Constraints:</b> 1 ≤ n ≤ 100 000, 1 ≤ m ≤ 1000. Your algorithm must run in Θ(log n) steps.</p>`,
    entry: "RussianPeasant",
    params: ["n", "m"],
    tests: [
      { args: [50, 65], expect: [130, 1040, 2080], explain: "The worked example above." },
      { args: [20, 26], expect: [104, 416], explain: "Rows 20, 10, 5, 2, 1 — only 5 and 1 are odd: 104 + 416 = 520." },
      { args: [1, 7], expect: [7], explain: "n = 1 is a single odd row: 1·m = m." },
      { args: [26, 47], expect: [94, 376, 752], explain: "Levitin Exercise 4.4.11: 94 + 376 + 752 = 1222." },
      { args: [7, 3], expect: [3, 6, 12], explain: "Every row is odd." },
      { args: [16, 5], expect: [80], explain: "A power of two: only the last row (n = 1) is odd." },
      { args: [1024, 1], expect: [1024] },
    ],
    random: { count: 25, gen: (r, i) => [r.int(1, i < 10 ? 100 : 100000), r.int(1, 1000)] },
    reference: rpRef,
    growth: { metric: "steps", sizes: [64, 256, 1024, 4096, 16384], gen: (r, n) => [n + r.int(0, n - 1), r.int(1, 50)], expect: "log n" },
    mutants: [
      { fn: (n, m) => { const out = []; while (n >= 1) { out.push(m); n = Math.floor(n / 2); m *= 2; } return out; }, hint: "You are adding the right-hand value from EVERY row. Only rows where n is odd contribute (check n mod 2 = 1)." },
      { fn: (n, m) => { const out = []; while (n > 1) { if (n % 2 === 1) out.push(m); n = Math.floor(n / 2); m *= 2; } return out; }, hint: "The last row (n = 1) is missing from your list. It is odd, so it always contributes — loop while n ≥ 1 (or add m once more after the loop)." },
    ],
    lints: [{ re: "n\\s*\\*\\s*m|m\\s*\\*\\s*n", lang: "any", message: "The point is to multiply WITHOUT n × m — only halving (n div 2), doubling (2 × m or m + m) and collecting addends." }],
    hints: [
      "What happens to n·m if you halve n and double m? What extra term appears when n is odd?",
      "Loop while n ≥ 1: if n is odd, record m. Then n ← n div 2 and m ← 2m.",
      "Use n mod 2 = 1 to test oddness and append(addends, m) to record. Return the list at the end.",
    ],
    starter: {
      pseudo: `ALGORITHM RussianPeasant(n, m)
    // Returns the list of m-values in rows where n is odd
    addends ← []
    while ... do
        ...
    return addends`,
      js: `function RussianPeasant(n, m) {
  const addends = [];
  // ...
  return addends;
}`,
    },
    solution: {
      pseudo: `ALGORITHM RussianPeasant(n, m)
    addends ← []
    while n ≥ 1 do
        if n mod 2 = 1 then
            append(addends, m)
        n ← n div 2
        m ← 2 * m
    return addends`,
      js: `function RussianPeasant(n, m) {
  const addends = [];
  while (n >= 1) {
    if (n % 2 === 1) addends.push(m);
    n = Math.floor(n / 2);
    m = 2 * m;
  }
  return addends;
}`,
      python: `def russian_peasant(n, m):
    addends = []
    while n >= 1:
        if n % 2 == 1:
            addends.append(m)
        n //= 2
        m *= 2
    return addends`,
      explain: "Invariant: (sum of addends so far) + n·m equals the original product. n halves every iteration, so the loop runs ⌊log₂ n⌋ + 1 times — Θ(log n), i.e. linear in the number of bits of n.",
    },
    distractors: ["while n > 1 do", "n ← n / 2", "if n mod 2 = 0 then"],
    followUp: "The addends are exactly m·2^i for each 1-bit i of n — this is how shift-and-add hardware multipliers work, and the same halving/doubling skeleton gives fast modular exponentiation (swap + for ×).",
    complexity: "Θ(log n) iterations",
    visual: "sims/search-lab.html",
    lesson: "lessons/04-decrease-and-conquer/README.md",
  });

  /* =====================================================================
     5. Josephus problem
     ===================================================================== */
  const jRef = (n) => (n === 1 ? 1 : n % 2 === 0 ? 2 * jRef(n / 2) - 1 : 2 * jRef((n - 1) / 2) + 1);
  ForgeProblems.add({
    id: "josephus",
    title: "The Josephus Problem",
    level: 2, chapter: 4, difficulty: 2,
    topics: ["recurrences", "decrease-by-a-constant-factor", "math"],
    strategy: "Decrease-by-half",
    source: "Levitin §4.4 · Exercises 4.4.13–15",
    summary: "n people in a circle, every second one is eliminated — who survives? Solve it in Θ(log n).",
    statement: `
<p>People numbered 1 to n stand in a circle. Starting with person 1, every <b>second</b> person is eliminated (2, 4, 6, …, wrapping
around) until one survivor remains. Call the survivor's number <code>J(n)</code>. For n = 6 the eliminations are 2, 4, 6, 3, 1, so J(6) = 5.</p>
<p>Simulating the circle takes Θ(n) time or more. Instead, notice that one full pass around the circle leaves an instance
<b>half the size</b>: after renumbering, you can express J(n) through J(⌊n/2⌋) — one formula for even n, another for odd n.</p>
<p><b>Task:</b> return <code>J(n)</code>. <b>Constraints:</b> 1 ≤ n ≤ 5000. Your algorithm must run in Θ(log n) steps
(a simulation will be flagged as too slow).</p>`,
    entry: "Josephus",
    params: ["n"],
    tests: [
      { args: [6], expect: 5, explain: "Eliminated in order 2, 4, 6, 3, 1 — person 5 survives." },
      { args: [7], expect: 7, explain: "Eliminated 2, 4, 6, 1, 5, 3 — person 7 survives." },
      { args: [1], expect: 1, explain: "Base case: alone in the circle." },
      { args: [2], expect: 1 },
      { args: [40], expect: 17, explain: "Levitin Exercise 4.4.13." },
      { args: [16], expect: 1, explain: "For every power of 2 the survivor is person 1." },
      { args: [41], expect: 19 },
      { args: [3], expect: 3 },
    ],
    random: { count: 25, gen: (r, i) => [r.int(1, i < 12 ? 64 : 5000)] },
    reference: jRef,
    growth: { metric: "steps", sizes: [256, 512, 1024, 2048, 4096], gen: (r, n) => [n + r.int(0, 20)], expect: "log n" },
    mutants: [
      { fn: (n) => { const f = (k) => (k === 1 ? 1 : k % 2 === 0 ? 2 * f(k / 2) + 1 : 2 * f((k - 1) / 2) - 1); return f(n); }, hint: "Your even and odd formulas look swapped. Trace n = 6 by hand: after the first pass, survivor-number x in the smaller circle was originally person 2x − 1." },
      { fn: (n) => jRef(n) - 1, hint: "Your answers are exactly 1 too small — you're numbering people from 0. The problem numbers them 1..n (and J(1) = 1)." },
      { fn: (n) => { const f = (k) => (k === 1 ? 1 : k % 2 === 0 ? 2 * f(k / 2) - 1 : 2 * f((k - 1) / 2)); return f(n); }, hint: "Even n works, odd n doesn't. For n = 2k + 1, the first pass also removes person 1, and new position x maps back to original position 2x + 1." },
    ],
    hints: [
      "Trace n = 6 and n = 7 on paper. After one pass around the circle, how many people are left, and how does a survivor's NEW number relate to their ORIGINAL number?",
      "For n = 2k: the survivors of the first pass are 1, 3, 5, … so new position x was original position 2x − 1. For n = 2k + 1: also count person 1's elimination right after the pass; new position x was 2x + 1.",
      "J(1) = 1; if n is even return 2·J(n div 2) − 1, otherwise return 2·J(n div 2) + 1.",
    ],
    starter: {
      pseudo: `ALGORITHM Josephus(n)
    // Survivor number when every second person is eliminated
    if n = 1 then
        return 1
    ...`,
      js: `function Josephus(n) {
  if (n === 1) return 1;
  // ...
}`,
    },
    solution: {
      pseudo: `ALGORITHM Josephus(n)
    if n = 1 then
        return 1
    if n mod 2 = 0 then
        return 2 * Josephus(n div 2) - 1
    return 2 * Josephus(n div 2) + 1`,
      js: `function Josephus(n) {
  if (n === 1) return 1;
  const j = Josephus(Math.floor(n / 2));
  return n % 2 === 0 ? 2 * j - 1 : 2 * j + 1;
}`,
      python: `def josephus(n):
    if n == 1:
        return 1
    j = josephus(n // 2)
    return 2 * j - 1 if n % 2 == 0 else 2 * j + 1`,
      explain: "J(2k) = 2J(k) − 1 and J(2k + 1) = 2J(k) + 1 with J(1) = 1. Each call halves n, so the recursion depth is ⌊log₂ n⌋ and the time is Θ(log n). Closed form: J(n) is n's binary representation rotated left by one bit.",
    },
    distractors: ["return 2 * Josephus(n div 2)", "if n = 0 then", "return Josephus(n - 1) + 2"],
    followUp: "Get J(n) in O(1) with bit tricks: J(n) = 2(n − 2^⌊log₂ n⌋) + 1 — a one-bit cyclic left shift of n. For the general 'every k-th person' version, the decrease-by-one recurrence J(n, k) = (J(n − 1, k) + k) mod n is the classic interview answer.",
    complexity: "Θ(log n)",
    lesson: "lessons/04-decrease-and-conquer/README.md",
  });

  /* =====================================================================
     6. Exponentiation by squaring
     ===================================================================== */
  const powRef = (a, n, m) => { if (n === 0) return 1 % m; let x = powRef(a, Math.floor(n / 2), m); x = (x * x) % m; if (n % 2 === 1) x = (x * a) % m; return x; };
  ForgeProblems.add({
    id: "exp-by-squaring",
    title: "Exponentiation by Squaring (mod m)",
    level: 2, chapter: 4, difficulty: 1,
    topics: ["arithmetic", "decrease-by-a-constant-factor", "modular arithmetic", "recursion"],
    strategy: "Decrease-by-half",
    source: "Levitin §4.1 formula (4.2) · Lecture 4",
    summary: "Compute aⁿ mod m with Θ(log n) multiplications using aⁿ = (a^⌊n/2⌋)² (· a if n is odd).",
    statement: `
<p>Multiplying a by itself n − 1 times is Θ(n) — hopeless when n has hundreds of digits, as in Rivest–Shamir–Adleman (RSA)
encryption. <b>Decrease by half</b> instead:</p>
<pre>aⁿ = (a^(n/2))²          if n is even and n &gt; 0
aⁿ = (a^((n−1)/2))² · a  if n is odd
a⁰ = 1</pre>
<p>Compute the half-power <b>once</b> and square it (calling the recursion twice would bring you right back to Θ(n)).</p>
<p><b>Task:</b> return <code>aⁿ mod m</code>. Reduce mod m after every multiplication so the numbers stay small.</p>
<p><b>Constraints:</b> 0 ≤ a ≤ 1000, 0 ≤ n ≤ 10⁵, 1 ≤ m ≤ 10⁶. Your algorithm must run in Θ(log n) steps.</p>`,
    entry: "Power",
    params: ["a", "n", "m"],
    tests: [
      { args: [2, 10, 1000], expect: 24, explain: "2¹⁰ = 1024 → 24 (mod 1000)." },
      { args: [3, 0, 7], expect: 1, explain: "a⁰ = 1." },
      { args: [5, 1, 13], expect: 5, explain: "Odd n: (a⁰)² · a = a." },
      { args: [7, 0, 1], expect: 0, explain: "Everything is 0 mod 1 — even a⁰. Apply mod m to the base case too." },
      { args: [2, 64, 1000000], expect: 551616, explain: "2⁶⁴ = 18446744073709551616." },
      { args: [123, 456, 789], expect: powRef(123, 456, 789), explain: "123⁴⁵⁶ has 953 digits — only possible if you reduce mod m as you go." },
      { args: [0, 0, 5], expect: 1, explain: "By convention 0⁰ = 1." },
      { args: [10, 5, 7], expect: 5 },
    ],
    random: { count: 25, gen: (r, i) => [r.int(0, 1000), r.int(0, i < 10 ? 20 : 100000), r.int(1, 1000000)] },
    reference: powRef,
    growth: { metric: "steps", sizes: [64, 256, 1024, 4096, 16384], gen: (r, n) => [r.int(2, 50), n + r.int(0, n - 1), r.int(2, 1000)], expect: "log n" },
    mutants: [
      { fn: (a, n, m) => { const f = (k) => { if (k === 0) return 1 % m; const x = f(Math.floor(k / 2)); return (x * x) % m; }; return f(n); }, hint: "Odd exponents come out wrong. When n is odd, (a^⌊n/2⌋)² is only a^(n−1) — multiply by one more a." },
      { fn: (a, n, m) => (n === 0 ? 1 : powRef(a, n, m)), hint: "Check the base case with m = 1: everything is 0 mod 1, so a⁰ mod 1 must be 0. Return 1 mod m, not 1." },
      { fn: (a, n, m) => Math.pow(a, n) % m, hint: "Your numbers explode (aⁿ overflows before the final mod). Reduce mod m after EVERY multiplication: x ← (x · x) mod m." },
    ],
    hints: [
      "If you already knew a^⌊n/2⌋, how could you get aⁿ with just one or two more multiplications?",
      "Recursive plan: base case n = 0. Otherwise x ← Power(a, n div 2, m) — ONE recursive call — then square x, and multiply by a if n is odd.",
      "x ← (x · x) mod m; if n mod 2 = 1 then x ← (x · a) mod m; return x. Base case: return 1 mod m.",
    ],
    starter: {
      pseudo: `ALGORITHM Power(a, n, m)
    // Returns a^n mod m using Θ(log n) multiplications
    if n = 0 then
        return ...
    x ← Power(a, n div 2, m)
    ...`,
      js: `function Power(a, n, m) {
  if (n === 0) return /* ... */;
  // ...
}`,
    },
    solution: {
      pseudo: `ALGORITHM Power(a, n, m)
    if n = 0 then
        return 1 mod m
    x ← Power(a, n div 2, m)
    x ← (x * x) mod m
    if n mod 2 = 1 then
        x ← (x * a) mod m
    return x`,
      js: `function Power(a, n, m) {
  if (n === 0) return 1 % m;
  let x = Power(a, Math.floor(n / 2), m);
  x = (x * x) % m;
  if (n % 2 === 1) x = (x * a) % m;
  return x;
}`,
      python: `def power(a, n, m):
    if n == 0:
        return 1 % m
    x = power(a, n // 2, m)
    x = x * x % m
    if n % 2 == 1:
        x = x * a % m
    return x`,
      explain: "M(n) = M(⌊n/2⌋) + 1 or 2 with M(0) = 0, so the number of multiplications is between ⌊log₂ n⌋ + 1 and 2(⌊log₂ n⌋ + 1) — Θ(log n), i.e. linear in the number of bits b of n (brute force is Θ(n) = Θ(2^b)).",
    },
    distractors: ["x ← Power(a, n div 2, m) * Power(a, n div 2, m)", "return 1", "x ← (x * 2) mod m"],
    followUp: "This is how every Transport Layer Security (TLS) handshake computes modular powers of 2048-bit numbers. Twist: do it without recursion by scanning n's bits (left-to-right or right-to-left binary exponentiation, Levitin §6.5), and note that calling Power(a, n div 2) twice silently turns Θ(log n) back into Θ(n).",
    complexity: "Θ(log n) multiplications",
    visual: "sims/search-lab.html",
    lesson: "lessons/04-decrease-and-conquer/README.md",
  });

  /* =====================================================================
     7. Largest key in a BST
     ===================================================================== */
  const bstMaxRef = (T) => { if (!T) return null; while (T.right) T = T.right; return T.key; };
  ForgeProblems.add({
    id: "bst-max-key",
    title: "Largest Key in a Binary Search Tree",
    level: 2, chapter: 4, difficulty: 1,
    topics: ["trees", "binary search tree", "variable-size-decrease"],
    strategy: "Variable-size decrease",
    source: "Levitin Exercise 4.5.7 · CSC 501 A2 Q8",
    summary: "Return the largest key of a Binary Search Tree (BST) by walking one path, not the whole tree.",
    statement: `
<p>In a <b>Binary Search Tree (BST)</b> every key in a node's left subtree is smaller than the node's key and every key in its right
subtree is larger. That ordering means you never have to look at the whole tree to find the maximum.</p>
<p><b>Input:</b> the root <code>T</code> of a BST. Each node is a record with fields <code>T.key</code>, <code>T.left</code> and
<code>T.right</code>; an empty subtree is <code>null</code>. (In JavaScript: an object <code>{key, left, right}</code>.)</p>
<p><b>Task:</b> return the largest key, or <code>null</code> if the tree is empty.</p>
<p><b>Constraints:</b> up to 1023 nodes. Your algorithm must visit only Θ(h) nodes, where h is the tree's height — on a balanced
tree that is Θ(log n). Visiting every node will be flagged as too slow.</p>`,
    entry: "BSTMax",
    params: ["T"],
    tests: [
      { args: [bst([50, 30, 70, 20, 40, 60, 80])], expect: 80, explain: "Balanced tree: 50 → 70 → 80, then there is no right child." },
      { args: [bst([8, 3, 10, 1, 6, 14, 4, 7, 13])], expect: 14, explain: "14 has a left child (13) but no right child — that's where you stop." },
      { args: [null], expect: null, explain: "Empty tree → null." },
      { args: [node(42)], expect: 42 },
      { args: [bst([5, 4, 3, 2, 1])], expect: 5, explain: "Left-skewed: the root itself has no right child, so the root is the maximum." },
      { args: [bst([1, 2, 3, 4, 5])], expect: 5, explain: "Right-skewed: the worst case, h = n − 1." },
      { args: [bst([10, 5, 20, 15, 12])], expect: 20 },
    ],
    random: { count: 25, gen: (r, i) => [bst(r.distinct(1 + (i % 15) * 2, -99, 99))] },
    reference: bstMaxRef,
    growth: { metric: "steps", sizes: [63, 127, 255, 511, 1023], gen: (r, n) => [balanced(range(n))], expect: "log n" },
    mutants: [
      { fn: (T) => { if (!T) return null; while (T.left) T = T.left; return T.key; }, hint: "You found the SMALLEST key. In a BST larger keys live in the RIGHT subtree." },
      { fn: (T) => (T ? T.key : null), hint: "You return the root's key, but the root is only the maximum when it has no right child. Keep following .right." },
      { fn: (T) => (!T ? null : T.right ? T.right.key : T.key), hint: "You take only ONE step to the right. Keep going right until you reach a node whose right child is null." },
    ],
    hints: [
      "Where can a key larger than the root possibly live? Where can it NOT live?",
      "Start at the root and keep moving to the right child for as long as there is one.",
      "while T.right ≠ null do T ← T.right. Then return T.key. Don't forget the empty tree (T = null).",
    ],
    starter: {
      pseudo: `ALGORITHM BSTMax(T)
    // T: root of a BST (fields key, left, right) or null
    if T = null then
        return null
    ...`,
      js: `function BSTMax(T) {
  if (T === null) return null;
  // ...
}`,
    },
    solution: {
      pseudo: `ALGORITHM BSTMax(T)
    if T = null then
        return null
    while T.right ≠ null do
        T ← T.right
    return T.key`,
      js: `function BSTMax(T) {
  if (T === null) return null;
  while (T.right !== null) T = T.right;
  return T.key;
}`,
      python: `def bst_max(T):
    if T is None:
        return None
    while T["right"] is not None:
        T = T["right"]
    return T["key"]`,
      explain: "Each step discards the root and its whole left subtree — a variable-size decrease. The walk follows one root-to-node path, so it costs Θ(h): Θ(n) in the worst (right-skewed) case and Θ(log n) for a balanced tree.",
    },
    distractors: ["while T.left ≠ null do", "T ← T.left", "return T.right.key"],
    followUp: "The same one-path walk gives min, search and insert in a BST — and is why balanced trees — AVL trees (Adelson-Velsky–Landis), red-black trees, B-trees — exist: they guarantee h = Θ(log n). Twist: find the k-th largest key by a reverse in-order walk that stops after k nodes.",
    complexity: "Θ(h) — Θ(log n) balanced, Θ(n) worst",
    visual: "sims/search-trees.html",
    lesson: "lessons/04-decrease-and-conquer/README.md",
  });

  /* =====================================================================
     8. Height of a binary tree
     ===================================================================== */
  ForgeProblems.add({
    id: "tree-height",
    title: "Height of a Binary Tree",
    level: 2, chapter: 5, difficulty: 1,
    topics: ["trees", "divide-and-conquer", "recursion"],
    strategy: "Divide-and-conquer",
    source: "Levitin §5.3",
    summary: "Compute a binary tree's height recursively: h(T) = max(h(left), h(right)) + 1, h(empty) = −1.",
    statement: `
<p>A binary tree is a "divide-and-conquer-ready" structure: the root splits it into two smaller trees of the same kind. The
<b>height</b> is the length (in edges) of the longest path from the root down to a leaf. It is convenient to define the height of
the empty tree as <b>−1</b>, so a single node has height 0.</p>
<p><b>Input:</b> the root <code>T</code> of a binary tree (records with <code>key</code>, <code>left</code>, <code>right</code>;
empty subtree = <code>null</code>). The tree is <i>not</i> necessarily a search tree.</p>
<p><b>Task:</b> return the height of <code>T</code>.</p>`,
    entry: "Height",
    params: ["T"],
    tests: [
      { args: [FIG56], expect: 3, explain: "Levitin-style tree a(b(d(−, g), e), c(f, −)): the longest path is a → b → d → g, 3 edges." },
      { args: [null], expect: -1, explain: "The empty tree has height −1 by definition." },
      { args: [node(1)], expect: 0, explain: "A single node: max(−1, −1) + 1 = 0." },
      { args: [balanced(range(7))], expect: 2, explain: "A perfect tree with 7 nodes has 3 levels, height 2." },
      { args: [bst([1, 2, 3, 4, 5])], expect: 4, explain: "A chain of 5 nodes has height 4." },
      { args: [node(1, node(2, node(3)), node(4))], expect: 2, explain: "The tall side decides — the short right side doesn't matter." },
    ],
    random: { count: 25, gen: (r, i) => [bst(r.distinct(i % 20, 0, 99))] },
    reference: height,
    growth: { metric: "steps", sizes: [31, 63, 127, 255, 511], gen: (r, n) => [bst(r.distinct(n, 0, 5000))], expect: "n" },
    mutants: [
      { fn: (T) => height(T) + 1, hint: "Every answer is 1 too big. The empty tree must have height −1 (not 0), so that a single node gets height 0. (Your function counts LEVELS instead.)" },
      { fn: (T) => { const f = (t) => (t ? Math.min(f(t.left), f(t.right)) + 1 : -1); return f(T); }, hint: "You take the SHORTER side. Height is about the longest path, so combine the subtree heights with max, not min." },
      { fn: (T) => size(T), hint: "You're counting nodes, not levels. Height adds 1 to the LARGER of the two subtree heights; it doesn't add the two together." },
    ],
    hints: [
      "If you already knew the heights of the left and right subtrees, how would you get the height of the whole tree?",
      "Base case: an empty tree (T = null) has height −1. Otherwise recurse on T.left and T.right.",
      "return max(Height(T.left), Height(T.right)) + 1.",
    ],
    starter: {
      pseudo: `ALGORITHM Height(T)
    // T: root of a binary tree (fields key, left, right) or null
    if T = null then
        return ...
    ...`,
      js: `function Height(T) {
  if (T === null) return /* ... */;
  // ...
}`,
    },
    solution: {
      pseudo: `ALGORITHM Height(T)
    if T = null then
        return -1
    return max(Height(T.left), Height(T.right)) + 1`,
      js: `function Height(T) {
  if (T === null) return -1;
  return Math.max(Height(T.left), Height(T.right)) + 1;
}`,
      python: `def height(T):
    if T is None:
        return -1
    return max(height(T["left"]), height(T["right"])) + 1`,
      explain: "A(n(T)) = A(n(T_left)) + A(n(T_right)) + 1 with A(0) = 0 gives exactly n additions, and the emptiness check runs once per node of the extended tree: 2n + 1 comparisons. So Θ(n).",
    },
    distractors: ["return -1 + Height(T.left) + Height(T.right)", "return min(Height(T.left), Height(T.right)) + 1", "return 0"],
    followUp: "Height is the recursion depth of every tree algorithm and the quantity balanced trees keep at Θ(log n). Twist (Levitin Exercise 5.3.3): compute the height with a level-by-level Breadth-First Search (BFS) instead of recursion.",
    complexity: "Θ(n)",
    visual: "sims/tree-traversals.html",
    lesson: "lessons/05-divide-and-conquer/README.md",
  });

  /* =====================================================================
     9. Leaf count
     ===================================================================== */
  ForgeProblems.add({
    id: "leaf-count",
    title: "Count the Leaves",
    level: 2, chapter: 5, difficulty: 1,
    topics: ["trees", "divide-and-conquer", "recursion"],
    strategy: "Divide-and-conquer",
    source: "Levitin Exercise 5.3.2 (fix the buggy algorithm)",
    summary: "Count the leaves (nodes with no children) of a binary tree — and fix the textbook's broken version.",
    statement: `
<p>Here is a recursive leaf counter that <i>looks</i> right:</p>
<pre>ALGORITHM LeafCounter(T)
    if T = null then return 0
    else return LeafCounter(T.left) + LeafCounter(T.right)</pre>
<p>Trace it on a single node and you'll see the problem. Write a correct version.</p>
<p><b>Input:</b> the root <code>T</code> of a binary tree (records with <code>key</code>, <code>left</code>, <code>right</code>;
empty subtree = <code>null</code>). A <b>leaf</b> is a node whose two children are both <code>null</code>.</p>
<p><b>Task:</b> return the number of leaves.</p>`,
    entry: "LeafCount",
    params: ["T"],
    tests: [
      { args: [FIG56], expect: 3, explain: "Leaves g, e and f." },
      { args: [null], expect: 0, explain: "The empty tree has no leaves." },
      { args: [node(1)], expect: 1, explain: "A single node IS a leaf — the buggy version returns 0 here." },
      { args: [balanced(range(7))], expect: 4, explain: "A perfect tree with 7 nodes has 4 leaves." },
      { args: [bst([1, 2, 3, 4, 5])], expect: 1, explain: "A chain has exactly one leaf." },
      { args: [node(1, node(2), null)], expect: 1, explain: "The root has one child, so it is not a leaf." },
    ],
    random: { count: 25, gen: (r, i) => [bst(r.distinct(i % 20, 0, 99))] },
    reference: leaves,
    mutants: [
      { fn: () => 0, hint: "You always get 0 — that's the textbook's bug. Nothing ever counts a leaf: add a case that returns 1 when both T.left and T.right are null." },
      { fn: (T) => size(T), hint: "You count every node. Only return 1 for nodes with NO children; for other nodes, return just the sum of the two recursive counts." },
      { fn: (T) => size(T) - leaves(T), hint: "You're counting the internal (non-leaf) nodes — the opposite set. A node contributes 1 only when both children are null." },
    ],
    hints: [
      "Run the given LeafCounter on a single node. Which line should have produced the 1?",
      "Three cases: empty tree, a leaf (both children null), and an internal node.",
      "if T = null return 0; if T.left = null and T.right = null return 1; else return LeafCount(T.left) + LeafCount(T.right).",
    ],
    starter: {
      pseudo: `ALGORITHM LeafCount(T)
    // T: root of a binary tree (fields key, left, right) or null
    if T = null then
        return 0
    return LeafCount(T.left) + LeafCount(T.right)`,
      js: `function LeafCount(T) {
  if (T === null) return 0;
  return LeafCount(T.left) + LeafCount(T.right);   // buggy — fix me
}`,
    },
    solution: {
      pseudo: `ALGORITHM LeafCount(T)
    if T = null then
        return 0
    if T.left = null and T.right = null then
        return 1
    return LeafCount(T.left) + LeafCount(T.right)`,
      js: `function LeafCount(T) {
  if (T === null) return 0;
  if (T.left === null && T.right === null) return 1;
  return LeafCount(T.left) + LeafCount(T.right);
}`,
      python: `def leaf_count(T):
    if T is None:
        return 0
    if T["left"] is None and T["right"] is None:
        return 1
    return leaf_count(T["left"]) + leaf_count(T["right"])`,
      explain: "Every node of the extended tree is visited once, so Θ(n). Correctness by induction: a leaf contributes 1, and an internal node's leaves are exactly the leaves of its two subtrees.",
    },
    distractors: ["if T.left = null or T.right = null then", "return 1 + LeafCount(T.left) + LeafCount(T.right)", "return 1"],
    followUp: "For a full binary tree (every node has 0 or 2 children) the number of leaves is always internal nodes + 1 — the same x = n + 1 identity Levitin uses to count external nodes. Twist: count leaves without recursion using an explicit stack.",
    complexity: "Θ(n)",
    visual: "sims/tree-traversals.html",
    lesson: "lessons/05-divide-and-conquer/README.md",
  });

  /* =====================================================================
     10. Fake coin — divide into three piles
     ===================================================================== */
  function fakeRef(W) {
    let l = 0, r = W.length - 1, w = 0;
    const sum = (a, b) => { let s = 0; for (let i = a; i <= b; i++) s += W[i]; return s; };
    while (l < r) {
      const k = Math.ceil((r - l + 1) / 3);
      const a = sum(l, l + k - 1), b = sum(l + k, l + 2 * k - 1);
      w++;
      if (a < b) r = l + k - 1;
      else if (a > b) { l = l + k; r = l + k - 1; }
      else l = l + 2 * k;
    }
    return [l, w];
  }
  const coins = (n, fake) => Array.from({ length: n }, (_, i) => (i === fake ? 9 : 10));
  ForgeProblems.add({
    id: "fake-coin-three-way",
    title: "Fake Coin: Divide Into Three",
    level: 2, chapter: 4, difficulty: 2,
    topics: ["decrease-by-a-constant-factor", "puzzles", "recurrences"],
    strategy: "Decrease-by-a-third",
    source: "Levitin Exercise 4.4.10 · CSC 501 A2 Q7",
    summary: "Find the one lighter coin with a balance scale in ⌈log₃ n⌉ weighings by splitting into three piles.",
    statement: `
<p>Among n identical-looking coins exactly one is fake and <b>lighter</b>. A balance scale tells you which of two groups is
lighter (or that they are equal). Splitting into <i>two</i> piles needs about log₂ n weighings. Splitting into <b>three</b> piles
is better: weigh two of them — if one side is lighter the fake is there, and if they balance it is in the third pile — so every
weighing cuts the problem to about a third.</p>
<p><b>Input:</b> <code>W[0..n-1]</code>, the coin weights (all equal except one smaller value). Treat the array as the scale: a
weighing compares the <b>sums</b> of two groups, e.g. <code>sum(W[a..b]) &lt; sum(W[c..d])</code>.</p>
<p><b>Split rule (so everyone counts the same weighings):</b> while more than one candidate coin <code>W[l..r]</code> remains,
let <code>k = ⌈(r − l + 1) / 3⌉</code>; pile 1 is the first k candidates, pile 2 the next k, pile 3 the rest (it may be empty).
Weigh pile 1 against pile 2 — that is one weighing — and keep the pile that must contain the fake.</p>
<p><b>Task:</b> return <code>[i, w]</code>: the index <code>i</code> of the fake coin and the number <code>w</code> of weighings you made.</p>
<p><b>Constraints:</b> 1 ≤ n ≤ 60. With this rule w never exceeds ⌈log₃ n⌉.</p>`,
    entry: "FakeCoin",
    params: ["W"],
    tests: [
      { args: [coins(9, 4)], expect: [4, 2], explain: "Piles {0,1,2} vs {3,4,5}: right side lighter. Then coin 3 vs coin 4: coin 4 is lighter." },
      { args: [coins(1, 0)], expect: [0, 0], explain: "One coin: it must be the fake, no weighing needed." },
      { args: [coins(2, 1)], expect: [1, 1], explain: "k = 1: coin 0 vs coin 1, one weighing." },
      { args: [coins(3, 2)], expect: [2, 1], explain: "Coins 0 and 1 balance, so the fake is the third pile." },
      { args: [coins(10, 9)], expect: [9, 2], explain: "k = 4: {0..3} vs {4..7} balance, leaving coins 8, 9; then 8 vs 9." },
      { args: [coins(4, 3)], expect: [3, 2], explain: "k = 2: piles {0,1}, {2,3}, and an empty third pile." },
      { args: [coins(27, 26)], expect: [26, 3], explain: "27 = 3³ coins need exactly 3 weighings (halving would need 5)." },
      { args: [coins(5, 0)], expect: [0, 2] },
      { args: [coins(60, 33)], expect: fakeRef(coins(60, 33)) },
    ],
    random: { count: 25, gen: (r, i) => { const n = r.int(1, i < 10 ? 12 : 60); return [coins(n, r.int(0, n - 1))]; } },
    reference: fakeRef,
    mutants: [
      { fn: (W) => { let l = 0, r = W.length - 1, w = 0; const S = (a, b) => W.slice(a, b + 1).reduce((x, y) => x + y, 0); while (l < r) { const h = Math.floor((r - l + 1) / 2); const a = S(l, l + h - 1), b = S(l + h, l + 2 * h - 1); w++; if (a < b) r = l + h - 1; else if (a > b) { l = l + h; r = l + h - 1; } else l = r; } return [l, w]; }, hint: "Your weighing counts match the TWO-pile method (about log₂ n). Split the candidates into three piles of size k = ⌈s/3⌉, k and the rest; weighing two of them rules out two thirds." },
      { fn: (W) => { let l = 0, r = W.length - 1, w = 0; const S = (a, b) => W.slice(a, b + 1).reduce((x, y) => x + y, 0); while (l < r) { const k = Math.max(1, Math.floor((r - l + 1) / 3)); const a = S(l, l + k - 1), b = S(l + k, l + 2 * k - 1); w++; if (a < b) r = l + k - 1; else if (a > b) { l = l + k; r = l + k - 1; } else l = l + 2 * k; } return [l, w]; }, hint: "Your pile size rounds DOWN. With k = ⌊s/3⌋ the leftover third pile gets too big and you need extra weighings. Use k = ⌈s/3⌉." },
      { fn: (W) => { let l = 0, r = W.length - 1, w = 0; const S = (a, b) => W.slice(a, b + 1).reduce((x, y) => x + y, 0); while (l < r) { const k = Math.ceil((r - l + 1) / 3); const a = S(l, l + k - 1), b = S(l + k, l + 2 * k - 1); w++; if (a > b) r = l + k - 1; else if (a < b) { l = l + k; r = l + k - 1; } else l = l + 2 * k; } return [l, w]; }, hint: "You keep the HEAVIER pile. The fake coin is lighter, so it's on the side that goes UP (the smaller sum)." },
    ],
    hints: [
      "One weighing has three possible outcomes (left lighter, right lighter, balance). How can you make each outcome point to a different third of the coins?",
      "Keep the candidate range W[l..r]. Each round: k ← ⌈(r − l + 1)/3⌉, compare sum(W[l..l+k−1]) with sum(W[l+k..l+2k−1]), count the weighing, and shrink [l, r] to the pile that must hold the fake.",
      "Left lighter → r ← l + k − 1. Right lighter → l ← l + k and r ← l + k − 1. Balanced → l ← l + 2k. Stop when l = r and return [l, weighings].",
    ],
    starter: {
      pseudo: `ALGORITHM FakeCoin(W[0..n-1])
    // Returns [index of the lighter coin, number of weighings]
    l ← 0
    r ← n - 1
    weighings ← 0
    while l < r do
        k ← ⌈(r - l + 1) / 3⌉
        ...
    return [l, weighings]`,
      js: `function FakeCoin(W) {
  let l = 0, r = W.length - 1, weighings = 0;
  // ...
  return [l, weighings];
}`,
    },
    solution: {
      pseudo: `ALGORITHM FakeCoin(W[0..n-1])
    l ← 0
    r ← n - 1
    weighings ← 0
    while l < r do
        k ← ⌈(r - l + 1) / 3⌉
        left ← sum(W[l..l + k - 1])
        right ← sum(W[l + k..l + 2 * k - 1])
        weighings ← weighings + 1
        if left < right then
            r ← l + k - 1
        else if left > right then
            l ← l + k
            r ← l + k - 1
        else
            l ← l + 2 * k
    return [l, weighings]`,
      js: `function FakeCoin(W) {
  let l = 0, r = W.length - 1, weighings = 0;
  const sum = (a, b) => { let s = 0; for (let i = a; i <= b; i++) s += W[i]; return s; };
  while (l < r) {
    const k = Math.ceil((r - l + 1) / 3);
    const left = sum(l, l + k - 1), right = sum(l + k, l + 2 * k - 1);
    weighings++;
    if (left < right) r = l + k - 1;
    else if (left > right) { l = l + k; r = l + k - 1; }
    else l = l + 2 * k;
  }
  return [l, weighings];
}`,
      python: `import math
def fake_coin(W):
    l, r, weighings = 0, len(W) - 1, 0
    while l < r:
        k = math.ceil((r - l + 1) / 3)
        left, right = sum(W[l:l + k]), sum(W[l + k:l + 2 * k])
        weighings += 1
        if left < right:
            r = l + k - 1
        elif left > right:
            l, r = l + k, l + 2 * k - 1
        else:
            l = l + 2 * k
    return [l, weighings]`,
      explain: "Worst case W(n) = W(⌈n/3⌉) + 1 with W(1) = 0, so W(n) = ⌈log₃ n⌉ (for n = 3^k exactly k). Compared with the two-pile method's ⌊log₂ n⌋ weighings it is log₂ 3 ≈ 1.6 times faster, for every large n.",
    },
    distractors: ["k ← ⌊(r - l + 1) / 2⌋", "if left > right then", "l ← l + k"],
    followUp: "Information theory says you can't beat ⌈log₃ n⌉: each weighing has only 3 outcomes and there are n possible answers. The hard version (fake may be heavier OR lighter) is the famous 12-coins-in-3-weighings puzzle — a lower-bound argument you'll meet in Levitin §11.2.",
    complexity: "⌈log₃ n⌉ weighings",
    visual: "sims/search-lab.html",
    lesson: "lessons/04-decrease-and-conquer/README.md",
  });

  /* =====================================================================
     11. Quickselect
     ===================================================================== */
  ForgeProblems.add({
    id: "quickselect",
    title: "Quickselect: the k-th Smallest Element",
    level: 2, chapter: 4, difficulty: 2,
    topics: ["selection", "partitioning", "variable-size-decrease", "median"],
    strategy: "Variable-size decrease (partition-based)",
    source: "Levitin §4.5 · Lecture 4",
    summary: "Find the k-th smallest element in average linear time using Lomuto partitioning.",
    statement: `
<p>The <b>selection problem</b> asks for the k-th smallest element — the median when k = ⌈n/2⌉. Sorting first costs Θ(n log n).
Quickselect does better: partition around a pivot p (Levitin uses Lomuto's one-directional scan with p = the first element). If
the pivot lands at the split position <code>s = k − 1</code> you are done; otherwise continue in <b>only one</b> side.</p>
<p><b>Task:</b> given <code>A[0..n-1]</code> and <code>1 ≤ k ≤ n</code>, return the k-th smallest element (k = 1 is the minimum).
You may rearrange <code>A</code>.</p>
<p><b>Constraints:</b> 1 ≤ n ≤ 60 in the tests; values may repeat. <code>sorted(…)</code>, <code>min</code> and <code>max</code> are not allowed.</p>
<p><b>Efficiency:</b> on random arrays your algorithm must make Θ(n) element comparisons on average — sorting first is flagged as too slow.</p>`,
    entry: "Quickselect",
    params: ["A", "k"],
    tests: [
      { args: [[4, 1, 10, 9, 7, 12, 8, 2, 15], 5], expect: 8, explain: "The lecture trace: the median of 9 numbers is the 5th smallest, found after two partitions." },
      { args: [[5], 1], expect: 5 },
      { args: [[3, 1, 2], 1], expect: 1, explain: "k = 1 is the minimum." },
      { args: [[3, 1, 2], 3], expect: 3, explain: "k = n is the maximum." },
      { args: [[2, 2, 1, 2], 2], expect: 2, explain: "Duplicates: sorted it is 1 2 2 2." },
      { args: [[7, 7, 7], 2], expect: 7 },
      { args: [[-5, 10, -20, 0, 3], 2], expect: -5 },
      { args: [[1, 2, 3, 4, 5, 6], 4], expect: 4, explain: "Already sorted — Quickselect's worst case, but still correct." },
    ],
    random: { count: 25, gen: (r, i) => { const A = r.array(1 + (i % 20) * 3, -50, 50); return [A, r.int(1, A.length)]; } },
    reference: (A, k) => asc(A)[k - 1],
    forbid: ["sorted", "min", "max"],
    growth: { metric: "keyComparisons", sizes: [32, 64, 128, 256, 512, 1024], reps: 40, gen: (r, n) => [r.distinct(n, 0, 100000), Math.ceil(n / 2)], expect: "n" },
    mutants: [
      { fn: (A, k) => asc(A)[Math.min(k, A.length - 1)], hint: "You return the (k+1)-th smallest. k counts from 1, but array positions count from 0: you are done when the split position s = k − 1." },
      { fn: (A, k) => A[k - 1], hint: "You return A[k − 1] of the array as given — but the array isn't sorted. Partition first; only the pivot's final position s is guaranteed to be correct." },
      { fn: (A, k) => asc(A).reverse()[k - 1], hint: "You found the k-th LARGEST. After Lomuto partitioning, the smaller elements are on the LEFT of the pivot." },
    ],
    hints: [
      "After partitioning around p, the pivot sits at its final sorted position s. Compare s with k − 1: what does each outcome tell you about where the answer is?",
      "Loop over a shrinking range [l, r]: Lomuto-partition A[l..r] with p ← A[l]. If s = k − 1 return A[s]; if s > k − 1 set r ← s − 1; else set l ← s + 1.",
      "Lomuto: s ← l; for i ← l + 1 to r: if A[i] < p then s ← s + 1 and swap A[s] and A[i]. Finally swap A[l] and A[s].",
    ],
    starter: {
      pseudo: `ALGORITHM Quickselect(A[0..n-1], k)
    // Returns the k-th smallest element (1 ≤ k ≤ n)
    l ← 0
    r ← n - 1
    while true do
        p ← A[l]
        s ← l
        ...`,
      js: `function Quickselect(A, k) {
  let l = 0, r = A.length - 1;
  // ...
}`,
    },
    solution: {
      pseudo: `ALGORITHM Quickselect(A[0..n-1], k)
    l ← 0
    r ← n - 1
    while true do
        p ← A[l]
        s ← l
        for i ← l + 1 to r do
            if A[i] < p then
                s ← s + 1
                swap A[s] and A[i]
        swap A[l] and A[s]
        if s = k - 1 then
            return A[s]
        else if s > k - 1 then
            r ← s - 1
        else
            l ← s + 1`,
      js: `function Quickselect(A, k) {
  let l = 0, r = A.length - 1;
  for (;;) {
    const p = A[l];
    let s = l;
    for (let i = l + 1; i <= r; i++) if (A[i] < p) { s++; [A[s], A[i]] = [A[i], A[s]]; }
    [A[l], A[s]] = [A[s], A[l]];
    if (s === k - 1) return A[s];
    if (s > k - 1) r = s - 1; else l = s + 1;
  }
}`,
      python: `def quickselect(A, k):
    l, r = 0, len(A) - 1
    while True:
        p, s = A[l], l
        for i in range(l + 1, r + 1):
            if A[i] < p:
                s += 1
                A[s], A[i] = A[i], A[s]
        A[l], A[s] = A[s], A[l]
        if s == k - 1:
            return A[s]
        if s > k - 1:
            r = s - 1
        else:
            l = s + 1`,
      explain: "Partitioning A[l..r] costs r − l comparisons. With splits near the middle, C(n) = C(n/2) + (n − 1) ∈ Θ(n) (the sizes form a geometric series ≈ 2n). The worst case (always the extreme element, e.g. a sorted array) is C(n) = n(n − 1)/2 ∈ Θ(n²).",
    },
    distractors: ["if A[i] > p then", "return A[k]", "r ← s"],
    followUp: "Use a random pivot to make the worst case vanishingly unlikely; the median-of-medians pivot rule gives a guaranteed Θ(n) worst case. This is what C++ std::nth_element and 'top-k' database queries use.",
    complexity: "Θ(n) average, Θ(n²) worst",
    visual: "sims/search-lab.html",
    lesson: "lessons/04-decrease-and-conquer/README.md",
  });

  /* =====================================================================
     12. Interpolation search
     ===================================================================== */
  const interpRef = (A, K) => { let l = 0, r = A.length - 1; while (l <= r && A[l] <= K && K <= A[r]) { if (A[l] === A[r]) return l; const x = l + Math.floor(((K - A[l]) * (r - l)) / (A[r] - A[l])); if (A[x] === K) return x; if (A[x] < K) l = x + 1; else r = x - 1; } return -1; };
  ForgeProblems.add({
    id: "interpolation-search",
    title: "Interpolation Search",
    level: 2, chapter: 4, difficulty: 2,
    topics: ["searching", "variable-size-decrease"],
    strategy: "Variable-size decrease",
    source: "Levitin §4.5",
    summary: "Search a sorted array by estimating where the key should be — like opening a phone book near 'S' for Smith.",
    statement: `
<p>Binary search always probes the middle. <b>Interpolation search</b> guesses smarter: assuming values grow roughly linearly from
<code>A[l]</code> to <code>A[r]</code>, the key <code>K</code> should sit near</p>
<pre>x = l + ⌊ (K − A[l]) · (r − l) / (A[r] − A[l]) ⌋</pre>
<p>Probe <code>A[x]</code>; if it isn't K, continue on the side that can still contain K. On uniformly spread data this needs only
about log₂ log₂ n + 1 probes.</p>
<p><b>Task:</b> <code>A[0..n-1]</code> is sorted in strictly increasing order. Return the index of <code>K</code>, or <code>−1</code>.</p>
<p><b>Careful:</b> only compute x while <code>A[l] ≤ K ≤ A[r]</code> (otherwise x can land outside the range), and handle
<code>A[l] = A[r]</code> before dividing.</p>
<p><b>Constraints:</b> 0 ≤ n ≤ 1024. On evenly spaced arrays (like 5, 12, 19, 26, …) your algorithm must use only a
<b>constant</b> number of comparisons — binary search's Θ(log n) is flagged as too slow there.</p>`,
    entry: "InterpolationSearch",
    params: ["A", "K"],
    tests: [
      { args: [[10, 20, 30, 40, 50, 60, 70], 50], expect: 4, explain: "Evenly spaced: the very first estimate x = 0 + ⌊40·6/60⌋ = 4 hits it." },
      { args: [[1, 2, 4, 8, 16, 32, 64, 128], 16], expect: 4, explain: "Very uneven data: the estimates creep up from the left, several probes." },
      { args: [[10, 20, 30], 25], expect: -1, explain: "Absent key: probe 20 (x = 1), move l to 2; now K < A[l], stop." },
      { args: [[], 3], expect: -1, explain: "Empty array: check l ≤ r before touching A[l]." },
      { args: [[7], 7], expect: 0, explain: "A[l] = A[r]: don't divide by zero." },
      { args: [[7], 3], expect: -1 },
      { args: [[3, 9, 27, 81], 100], expect: -1, explain: "K beyond A[r]: stop before probing." },
      { args: [[3, 9, 27, 81], 3], expect: 0 },
      { args: [[-40, -3, 0, 2, 5, 99], 99], expect: 5 },
    ],
    random: {
      count: 25,
      gen: (r, i) => { const A = asc(r.distinct(1 + (i % 20) * 3, -300, 300)); return [A, i % 3 === 0 ? r.int(-310, 310) : r.pick(A)]; },
    },
    reference: interpRef,
    forbid: ["indexOf"],
    growth: {
      metric: "keyComparisons", sizes: [64, 128, 256, 512, 1024],
      gen: (r, n) => { const a = r.int(-100, 100), d = r.int(1, 9); const A = range(n).map((i) => a + d * i); return [A, r() < 0.5 ? r.pick(A) : a + d * r.int(0, n - 2) + (d > 1 ? 1 : 0)]; },
      expect: "1",
    },
    mutants: [
      { fn: (A, K) => { let l = 0, r = A.length - 1; while (l < r && A[l] <= K && K <= A[r]) { const x = l + Math.floor(((K - A[l]) * (r - l)) / (A[r] - A[l])); if (A[x] === K) return x; if (A[x] < K) l = x + 1; else r = x - 1; } return -1; }, hint: "You miss keys when the range has shrunk to a single element (l = r). Keep looping while l ≤ r and handle A[l] = A[r] explicitly." },
      { fn: (A, K) => { const i = interpRef(A, K); if (i >= 0) return i; let l = 0; while (l < A.length && A[l] < K) l++; return l; }, hint: "For absent keys you return a position instead of −1. Once K falls outside [A[l], A[r]] (or l > r), the answer is −1." },
    ],
    hints: [
      "If A[l] = 10, A[r] = 70 and K = 50, what fraction of the way from l to r would you expect K to be?",
      "Loop while l ≤ r and A[l] ≤ K ≤ A[r]. Compute the estimate x, probe A[x], and move l to x + 1 or r to x − 1 like binary search does.",
      "Guard the division: if A[l] = A[r] then (because A[l] ≤ K ≤ A[r]) return l. Otherwise x ← l + ⌊(K − A[l]) · (r − l) / (A[r] − A[l])⌋.",
    ],
    starter: {
      pseudo: `ALGORITHM InterpolationSearch(A[0..n-1], K)
    l ← 0
    r ← n - 1
    while l ≤ r and A[l] ≤ K and K ≤ A[r] do
        ...
    return -1`,
      js: `function InterpolationSearch(A, K) {
  let l = 0, r = A.length - 1;
  // ...
  return -1;
}`,
    },
    solution: {
      pseudo: `ALGORITHM InterpolationSearch(A[0..n-1], K)
    l ← 0
    r ← n - 1
    while l ≤ r and A[l] ≤ K and K ≤ A[r] do
        if A[l] = A[r] then
            return l
        x ← l + ⌊(K - A[l]) * (r - l) / (A[r] - A[l])⌋
        if A[x] = K then
            return x
        else if A[x] < K then
            l ← x + 1
        else
            r ← x - 1
    return -1`,
      js: `function InterpolationSearch(A, K) {
  let l = 0, r = A.length - 1;
  while (l <= r && A[l] <= K && K <= A[r]) {
    if (A[l] === A[r]) return l;
    const x = l + Math.floor(((K - A[l]) * (r - l)) / (A[r] - A[l]));
    if (A[x] === K) return x;
    if (A[x] < K) l = x + 1; else r = x - 1;
  }
  return -1;
}`,
      python: `def interpolation_search(A, K):
    l, r = 0, len(A) - 1
    while l <= r and A[l] <= K <= A[r]:
        if A[l] == A[r]:
            return l
        x = l + (K - A[l]) * (r - l) // (A[r] - A[l])
        if A[x] == K:
            return x
        if A[x] < K:
            l = x + 1
        else:
            r = x - 1
    return -1`,
      explain: "Because A[l] ≤ K ≤ A[r], the estimate x always lies in [l, r], and each probe removes x and one side. On uniformly distributed keys the average is below log₂ log₂ n + 1 probes; the worst case (e.g. exponentially growing values) is Θ(n).",
    },
    distractors: ["x ← ⌊(l + r) / 2⌋", "while l < r do", "l ← x"],
    followUp: "Interpolation search only pays off for huge arrays or expensive comparisons. Its continuous twin is the method of false position for solving f(x) = 0; a senior move is 'interpolation-sequential' or a hybrid that falls back to binary search when estimates misbehave.",
    complexity: "≈ log₂ log₂ n average, Θ(n) worst",
    visual: "sims/search-lab.html",
    lesson: "lessons/04-decrease-and-conquer/README.md",
  });

  /* =====================================================================
     13. Mergesort
     ===================================================================== */
  const mergeFn = (dropB, dropC) => function ms(A) {
    if (A.length <= 1) return A.slice();
    const h = Math.floor(A.length / 2), b = ms(A.slice(0, h)), c = ms(A.slice(h)), out = [];
    let i = 0, j = 0;
    while (i < b.length && j < c.length) out.push(b[i] <= c[j] ? b[i++] : c[j++]);
    if (!dropB) while (i < b.length) out.push(b[i++]);
    if (!dropC) while (j < c.length) out.push(c[j++]);
    return out;
  };
  function msLevitinOnlyC(A) {
    const n = A.length;
    if (n > 1) {
      const h = Math.floor(n / 2), B = A.slice(0, h), C = A.slice(h);
      msLevitinOnlyC(B); msLevitinOnlyC(C);
      let i = 0, j = 0, k = 0;
      while (i < B.length && j < C.length) A[k++] = B[i] <= C[j] ? B[i++] : C[j++];
      if (i === B.length) while (j < C.length) A[k++] = C[j++];
    }
    return A;
  }
  ForgeProblems.add({
    id: "merge-sort",
    title: "Mergesort",
    level: 2, chapter: 5, difficulty: 2,
    topics: ["sorting", "divide-and-conquer", "recursion", "merging"],
    strategy: "Divide-and-conquer",
    source: "Levitin §5.1",
    summary: "Split in halves, sort each recursively, merge — Θ(n log n) in every case.",
    statement: `
<p>Mergesort is the textbook divide-and-conquer algorithm: split <code>A</code> into halves <code>A[0..⌊n/2⌋−1]</code> and
<code>A[⌊n/2⌋..n−1]</code>, sort each half recursively, then <b>merge</b> the two sorted halves by repeatedly taking the smaller
front element. It is stable and guarantees Θ(n log n), which is why it underlies Python's and Java's object sorts.</p>
<p><b>Task:</b> return <code>A</code> sorted in nondecreasing order. (Levitin's version sorts <code>A</code> itself via copies
<code>B</code> and <code>C</code>; returning a new sorted list is fine too — the grader checks the returned value.)</p>
<p><b>Constraints:</b> 0 ≤ n ≤ 60 in the tests. <code>sorted(…)</code> is not allowed. Your algorithm must make Θ(n log n)
element comparisons on random input — a quadratic sort is flagged as too slow.</p>`,
    entry: "MergeSort",
    params: ["A"],
    tests: [
      { args: [[8, 3, 2, 9, 7, 1, 5, 4]], expect: [1, 2, 3, 4, 5, 7, 8, 9], explain: "The textbook example: 8 3 2 9 | 7 1 5 4 → 2 3 8 9 and 1 4 5 7 → merged." },
      { args: [[]], expect: [], explain: "n ≤ 1 is already sorted — that's the base case." },
      { args: [[5]], expect: [5] },
      { args: [[2, 1]], expect: [1, 2] },
      { args: [[1, 2, 5, 7, 9, 3, 4, 6]], expect: [1, 2, 3, 4, 5, 6, 7, 9], explain: "When one half runs out, the rest of the other half must still be copied." },
      { args: [[3, 3, 1, 3, 1]], expect: [1, 1, 3, 3, 3], explain: "Duplicates (and an odd length)." },
      { args: [[9, 8, 7, 6, 5, 4, 3]], expect: [3, 4, 5, 6, 7, 8, 9] },
      { args: [[-1, 4, -1, 0]], expect: [-1, -1, 0, 4] },
    ],
    random: { count: 25, gen: (r, i) => [r.array(i % 30, -40, 40)] },
    reference: (A) => asc(A),
    forbid: ["sorted"],
    growth: { metric: "keyComparisons", sizes: [32, 64, 128, 256, 512], gen: (r, n) => [r.array(n, 0, 10000)], expect: "n log n" },
    mutants: [
      { fn: mergeFn(true, true), hint: "Elements disappear. When one half runs out during the merge, you still have to copy what's left of the OTHER half." },
      { fn: (A) => msLevitinOnlyC(A.slice()), hint: "You copy C's leftovers when B runs out, but not B's leftovers when C runs out (the 'else' branch). Both cases are needed." },
      { fn: (A) => asc(A).reverse(), hint: "You sorted in decreasing order. In the merge, take B[i] when B[i] ≤ C[j] (the smaller front element goes first)." },
    ],
    hints: [
      "If both halves were already sorted, how could you combine them into one sorted list by looking only at their FRONT elements?",
      "MergeSort: if n > 1, copy the halves into B and C, call MergeSort on each, then Merge(B, C, A). Merge walks i over B and j over C, writing into A[k].",
      "Merge loop: while i < p and j < q, copy the smaller of B[i], C[j] into A[k] and advance that index and k. Afterwards copy whatever remains of B or C.",
    ],
    starter: {
      pseudo: `ALGORITHM MergeSort(A[0..n-1])
    if n > 1 then
        B ← A[0..⌊n/2⌋ - 1]
        C ← A[⌊n/2⌋..n - 1]
        ...
    return A

ALGORITHM Merge(B[0..p-1], C[0..q-1], A[0..m-1])
    i ← 0
    j ← 0
    k ← 0
    ...`,
      js: `function MergeSort(A) {
  // return A sorted (no .sort!)
}`,
    },
    solution: {
      pseudo: `ALGORITHM MergeSort(A[0..n-1])
    if n > 1 then
        B ← A[0..⌊n/2⌋ - 1]
        C ← A[⌊n/2⌋..n - 1]
        MergeSort(B)
        MergeSort(C)
        Merge(B, C, A)
    return A

ALGORITHM Merge(B[0..p-1], C[0..q-1], A[0..m-1])
    i ← 0
    j ← 0
    k ← 0
    while i < p and j < q do
        if B[i] ≤ C[j] then
            A[k] ← B[i]
            i ← i + 1
        else
            A[k] ← C[j]
            j ← j + 1
        k ← k + 1
    if i = p then
        copy C[j..q - 1] to A[k..m - 1]
    else
        copy B[i..p - 1] to A[k..m - 1]`,
      js: `function MergeSort(A) {
  if (A.length <= 1) return A;
  const h = Math.floor(A.length / 2);
  const B = MergeSort(A.slice(0, h)), C = MergeSort(A.slice(h));
  let i = 0, j = 0, k = 0;
  while (i < B.length && j < C.length) A[k++] = B[i] <= C[j] ? B[i++] : C[j++];
  while (i < B.length) A[k++] = B[i++];
  while (j < C.length) A[k++] = C[j++];
  return A;
}`,
      python: `def merge_sort(A):
    if len(A) <= 1:
        return A
    h = len(A) // 2
    B, C = merge_sort(A[:h]), merge_sort(A[h:])
    i = j = k = 0
    while i < len(B) and j < len(C):
        if B[i] <= C[j]:
            A[k] = B[i]; i += 1
        else:
            A[k] = C[j]; j += 1
        k += 1
    A[k:] = B[i:] + C[j:]
    return A`,
      explain: "Each merge of n elements makes at most n − 1 comparisons, so C(n) = 2C(n/2) + n − 1 with C(1) = 0. By the Master Theorem (a = 2, b = 2, d = 1) C(n) ∈ Θ(n log n); exactly n log₂ n − n + 1 for n = 2^k in the worst case. Extra space Θ(n).",
    },
    distractors: ["if B[i] ≥ C[j] then", "while i < p or j < q do", "if n > 0 then"],
    followUp: "Mergesort's worst case n log₂ n − n + 1 is within a few percent of the information-theoretic minimum log₂ n!. Twists: write it bottom-up without recursion, or sort a singly linked list with O(1) extra space — a classic interview question.",
    complexity: "Θ(n log n) comparisons, Θ(n) extra space",
    visual: "sims/sorting-studio.html",
    lesson: "lessons/05-divide-and-conquer/README.md",
  });

  /* =====================================================================
     14. Union of two sorted sequences without duplicates
     ===================================================================== */
  const unionRef = (A, B) => { const out = []; let i = 0, j = 0; while (i < A.length || j < B.length) { let x; if (j === B.length || (i < A.length && A[i] <= B[j])) x = A[i++]; else x = B[j++]; if (!out.length || out[out.length - 1] !== x) out.push(x); } return out; };
  ForgeProblems.add({
    id: "merge-union-no-duplicates",
    title: "Union of Two Sorted Sequences (No Duplicates)",
    level: 2, chapter: 5, difficulty: 2,
    topics: ["merging", "two pointers", "sets"],
    strategy: "Merge (two pointers)",
    source: "CSC 501 Midterm 1, Q1",
    summary: "Merge two sorted sequences that may contain repeats into the sorted set A ∪ B in O(n) time.",
    statement: `
<p>Two sorted sequences <code>A</code> and <code>B</code> may contain repeated entries (they are <i>not</i> sets). Compute the
sorted sequence of the <b>distinct</b> values of A ∪ B. This is the merge step of mergesort with one extra rule — and the
same pattern databases use to union sorted indexes.</p>
<p><b>Task:</b> <code>A[0..n-1]</code> and <code>B[0..m-1]</code> are sorted in nondecreasing order. Return the sorted list of
every value that appears in A or B, each <b>exactly once</b>.</p>
<p><b>Constraints:</b> 0 ≤ n, m ≤ 512; <code>sorted(…)</code> is not allowed. Your algorithm must be linear, Θ(n + m).</p>`,
    entry: "Union",
    params: ["A", "B"],
    tests: [
      { args: [[1, 2, 2, 5], [2, 3, 5, 5, 7]], expect: [1, 2, 3, 5, 7], explain: "2 appears three times and 5 three times in total — each is output once." },
      { args: [[], []], expect: [], explain: "Both empty." },
      { args: [[], [4, 4]], expect: [4], explain: "Repeats inside ONE sequence must also collapse." },
      { args: [[1, 1, 1], [1]], expect: [1] },
      { args: [[1, 3, 5], [2, 4, 6]], expect: [1, 2, 3, 4, 5, 6], explain: "No overlap: a plain merge." },
      { args: [[-3, 0, 0], [-3, -1]], expect: [-3, -1, 0] },
      { args: [[9], []], expect: [9], explain: "When B is exhausted, keep going through A." },
      { args: [[1, 2], [5, 6, 6, 8]], expect: [1, 2, 5, 6, 8], explain: "A runs out first; B's leftovers (with its repeat) still count." },
    ],
    random: { count: 25, gen: (r, i) => [r.sorted(i % 15, 0, 12), r.sorted((i * 7) % 17, 0, 12)] },
    reference: unionRef,
    forbid: ["sorted"],
    growth: { metric: "steps", sizes: [32, 64, 128, 256, 512], gen: (r, n) => [r.sorted(n, 0, n), r.sorted(n, 0, n)], expect: "n" },
    mutants: [
      { fn: (A, B) => asc(A.concat(B)), hint: "Your output keeps duplicates — that's a plain merge. Only append x when it differs from the last value you appended." },
      { fn: (A, B) => { const out = []; let i = 0, j = 0; while (i < A.length && j < B.length) { if (A[i] < B[j]) out.push(A[i++]); else if (A[i] > B[j]) out.push(B[j++]); else { out.push(A[i]); i++; j++; } } while (i < A.length) out.push(A[i++]); while (j < B.length) out.push(B[j++]); return out; }, hint: "You skip values shared by A and B, but repeats INSIDE one sequence (like [4, 4]) still come through. Compare each candidate with the last value in your output instead." },
      { fn: (A, B) => { const out = []; let i = 0, j = 0; while (i < A.length && j < B.length) { const x = A[i] <= B[j] ? A[i++] : B[j++]; if (!out.length || out[out.length - 1] !== x) out.push(x); } return out; }, hint: "Values go missing once one sequence is used up. After the main loop, process the leftovers of the other sequence (still skipping repeats)." },
    ],
    hints: [
      "In a merge, the values come out in sorted order — so where would a duplicate of x show up in your output?",
      "Merge with two indexes i and j, taking the smaller front element each time. Before appending a value, compare it with the LAST value already in the output.",
      "Loop while i < n or j < m. Take from A if j = m or (i < n and A[i] ≤ B[j]), else from B. Append x only if the output is empty or its last element ≠ x.",
    ],
    starter: {
      pseudo: `ALGORITHM Union(A[0..n-1], B[0..m-1])
    C ← []
    i ← 0
    j ← 0
    while ... do
        ...
    return C`,
      js: `function Union(A, B) {
  const C = [];
  // ...
  return C;
}`,
    },
    solution: {
      pseudo: `ALGORITHM Union(A[0..n-1], B[0..m-1])
    C ← []
    i ← 0
    j ← 0
    while i < n or j < m do
        if j = m or (i < n and A[i] ≤ B[j]) then
            x ← A[i]
            i ← i + 1
        else
            x ← B[j]
            j ← j + 1
        if length(C) = 0 or C[length(C) - 1] ≠ x then
            append(C, x)
    return C`,
      js: `function Union(A, B) {
  const C = [];
  let i = 0, j = 0;
  while (i < A.length || j < B.length) {
    let x;
    if (j === B.length || (i < A.length && A[i] <= B[j])) x = A[i++];
    else x = B[j++];
    if (C.length === 0 || C[C.length - 1] !== x) C.push(x);
  }
  return C;
}`,
      python: `def union(A, B):
    C, i, j = [], 0, 0
    while i < len(A) or j < len(B):
        if j == len(B) or (i < len(A) and A[i] <= B[j]):
            x = A[i]; i += 1
        else:
            x = B[j]; j += 1
        if not C or C[-1] != x:
            C.append(x)
    return C`,
      explain: "Every iteration advances i or j, so the loop runs exactly n + m times with O(1) work each — Θ(n + m). Because values leave the merge in nondecreasing order, all copies of a value are adjacent in the output stream, so comparing with the last output value removes every duplicate.",
    },
    distractors: ["while i < n and j < m do", "if A[i] < B[j] then", "append(C, A[i])"],
    followUp: "Change one line to get the intersection A ∩ B or the difference A − B. At scale this is a 'sort-merge' set operation — how search engines intersect posting lists and databases run merge joins; with k sequences, use a min-heap (k-way merge).",
    complexity: "Θ(n + m)",
    visual: "sims/sorting-studio.html",
    lesson: "lessons/05-divide-and-conquer/README.md",
  });

  /* =====================================================================
     15. Quicksort with Hoare partitioning
     ===================================================================== */
  function hoarePartition(A, l, r) {
    const p = A[l];
    let i = l, j = r + 1;
    do {
      do i++; while (!(i === r || A[i] >= p));
      do j--; while (!(A[j] <= p));
      [A[i], A[j]] = [A[j], A[i]];
    } while (!(i >= j));
    [A[i], A[j]] = [A[j], A[i]];
    [A[l], A[j]] = [A[j], A[l]];
    return j;
  }
  ForgeProblems.add({
    id: "quicksort-hoare",
    title: "Quicksort (Hoare Partition)",
    level: 2, chapter: 5, difficulty: 3,
    topics: ["sorting", "divide-and-conquer", "partitioning", "in-place"],
    strategy: "Divide-and-conquer",
    source: "Levitin §5.2 · CSC 501 Midterm 1 sample Q5",
    summary: "Partition around the first element with two scanning indexes, then sort both sides — in place.",
    statement: `
<p>Quicksort divides by <b>value</b> instead of by position: pick a pivot <code>p = A[l]</code>, rearrange so everything left of
position s is ≤ p and everything right of it is ≥ p, put p at s, and sort the two sides recursively. No merge step is needed.</p>
<p><b>Hoare's partition</b> scans from both ends: i moves right until <code>A[i] ≥ p</code>, j moves left until
<code>A[j] ≤ p</code>; if they haven't crossed, swap <code>A[i]</code> and <code>A[j]</code> and continue. When they cross, swap the
pivot with <code>A[j]</code>. (Stopping on elements <i>equal</i> to p keeps splits balanced when there are many duplicates.)
Watch out: i can run off the end of the subarray unless you stop it at r.</p>
<p><b>Task:</b> sort <code>A[0..n-1]</code> in place in nondecreasing order. The grader checks the array after your algorithm runs.</p>
<p><b>Constraints:</b> 0 ≤ n ≤ 60 in the tests; <code>sorted(…)</code> is not allowed. On random input your algorithm must make
Θ(n log n) comparisons.</p>`,
    entry: "Quicksort",
    params: ["A"],
    output: { arg: 0 },
    tests: [
      { args: [[5, 3, 1, 9, 8, 2, 4, 7]], expect: [1, 2, 3, 4, 5, 7, 8, 9], explain: "The textbook example: the first partition around 5 gives 2 3 1 4 | 5 | 8 9 7." },
      { args: [[]], expect: [] },
      { args: [[1]], expect: [1] },
      { args: [[2, 1]], expect: [1, 2] },
      { args: [[1, 2, 3, 4, 5]], expect: [1, 2, 3, 4, 5], explain: "Sorted input is the worst case for a first-element pivot: i must stop at r instead of running off the end." },
      { args: [[5, 4, 3, 2, 1]], expect: [1, 2, 3, 4, 5] },
      { args: [[4, 4, 4, 4]], expect: [4, 4, 4, 4], explain: "All equal: i and j stop at every element — lots of swaps, but balanced splits." },
      { args: [[3, -1, 3, 0, -1, 2]], expect: [-1, -1, 0, 2, 3, 3] },
    ],
    random: { count: 25, gen: (r, i) => [r.array(i % 30, -40, 40)] },
    reference: (A) => asc(A),
    forbid: ["sorted"],
    growth: { metric: "keyComparisons", sizes: [32, 64, 128, 256, 512], gen: (r, n) => [r.distinct(n, 0, 100000)], expect: "n log n" },
    mutants: [
      { fn: inPlace((A) => asc(A).reverse()), hint: "The array comes out in decreasing order. i should stop at elements ≥ p (big ones on the left side) and j at elements ≤ p." },
      { fn: inPlace((A) => (A.length <= 1 ? A : asc(A.slice(0, -1)).concat([A[A.length - 1]]))), hint: "The last element is never sorted. The first call must cover the whole array, A[0..n − 1] — check your initial r." },
      { fn: (A) => { if (A.length > 1) hoarePartition(A, 0, A.length - 1); return A; }, hint: "Your array looks partitioned once but not sorted. After placing the pivot at s, recursively sort BOTH A[l..s − 1] and A[s + 1..r]." },
    ],
    hints: [
      "After one partition, the pivot is in its final place. What two smaller problems are left?",
      "Quicksort(A[l..r]): if l < r then s ← HoarePartition(A[l..r]); Quicksort(A[l..s − 1]); Quicksort(A[s + 1..r]).",
      "HoarePartition: p ← A[l]; i ← l; j ← r + 1; repeat { repeat i ← i + 1 until i = r or A[i] ≥ p; repeat j ← j − 1 until A[j] ≤ p; swap A[i], A[j] } until i ≥ j; undo the last swap; swap A[l] and A[j]; return j.",
    ],
    starter: {
      pseudo: `ALGORITHM Quicksort(A[l..r])
    // Sorts the subarray A[l..r] in place
    if l < r then
        s ← HoarePartition(A[l..r])
        ...

ALGORITHM HoarePartition(A[l..r])
    p ← A[l]
    i ← l
    j ← r + 1
    ...
    return j`,
      js: `function Quicksort(A) {
  // sort A in place (no .sort!)
}`,
    },
    solution: {
      pseudo: `ALGORITHM Quicksort(A[l..r])
    if l < r then
        s ← HoarePartition(A[l..r])
        Quicksort(A[l..s - 1])
        Quicksort(A[s + 1..r])

ALGORITHM HoarePartition(A[l..r])
    p ← A[l]
    i ← l
    j ← r + 1
    repeat
        repeat
            i ← i + 1
        until i = r or A[i] ≥ p
        repeat
            j ← j - 1
        until A[j] ≤ p
        swap A[i] and A[j]
    until i ≥ j
    swap A[i] and A[j]
    swap A[l] and A[j]
    return j`,
      js: `function Quicksort(A, l = 0, r = A.length - 1) {
  if (l >= r) return A;
  const p = A[l];
  let i = l, j = r + 1;
  do {
    do i++; while (i < r && A[i] < p);
    do j--; while (A[j] > p);
    [A[i], A[j]] = [A[j], A[i]];
  } while (i < j);
  [A[i], A[j]] = [A[j], A[i]];   // undo the last swap
  [A[l], A[j]] = [A[j], A[l]];
  Quicksort(A, l, j - 1);
  Quicksort(A, j + 1, r);
  return A;
}`,
      python: `def quicksort(A, l=0, r=None):
    if r is None:
        r = len(A) - 1
    if l >= r:
        return A
    p, i, j = A[l], l, r + 1
    while True:
        i += 1
        while i < r and A[i] < p:
            i += 1
        j -= 1
        while A[j] > p:
            j -= 1
        if i >= j:
            break
        A[i], A[j] = A[j], A[i]
    A[l], A[j] = A[j], A[l]
    quicksort(A, l, j - 1)
    quicksort(A, j + 1, r)
    return A`,
      explain: "Partitioning n elements costs about n comparisons. Balanced splits give C(n) = 2C(n/2) + n → Θ(n log n) (best and average ≈ 1.39 n log₂ n); already-sorted input gives C(n) = C(n − 1) + n → n(n + 1)/2 − 1 ∈ Θ(n²). Only the recursion stack uses extra space.",
    },
    distractors: ["until A[i] > p", "swap A[l] and A[i]", "Quicksort(A[l..s])"],
    followUp: "Production quicksorts add median-of-three (or random) pivots, switch to insertion sort for tiny subarrays, and recurse on the smaller side first to keep the stack O(log n) — introsort even falls back to heapsort. Midterm twist: write it without recursion using an explicit stack of (l, r) ranges.",
    complexity: "Θ(n log n) average, Θ(n²) worst",
    visual: "sims/sorting-studio.html",
    lesson: "lessons/05-divide-and-conquer/README.md",
  });

  /* =====================================================================
     16. Topological sort by Depth-First Search
     ===================================================================== */
  // mode: "ok" (correct), "noReverse", "preorder", "noCycleCheck"
  function topoDfs(adj, mode = "ok") {
    const n = adj.length, state = Array(n).fill(0), post = [], pre = [];
    let cyclic = false;
    const dfs = (v) => { state[v] = 1; pre.push(v); for (const w of adj[v]) { if (state[w] === 1) cyclic = true; else if (state[w] === 0) dfs(w); } state[v] = 2; post.push(v); };
    for (let v = 0; v < n; v++) if (state[v] === 0) dfs(v);
    if (cyclic && mode !== "noCycleCheck") return [];
    if (mode === "noReverse") return post;
    if (mode === "preorder") return pre;
    return post.reverse();
  }
  ForgeProblems.add({
    id: "topological-sort-dfs",
    title: "Topological Sort by Depth-First Search",
    level: 2, chapter: 4, difficulty: 2,
    topics: ["graphs", "DAG", "DFS", "decrease-and-conquer"],
    strategy: "Depth-first search (reverse postorder)",
    source: "Levitin §4.2",
    summary: "List a directed acyclic graph's vertices so every edge points forward by reversing the order in which depth-first search finishes them.",
    statement: `
<p>A <b>Directed Acyclic Graph (DAG)</b> models prerequisites: courses, build steps, spreadsheet cells. A <b>topological order</b>
lists the vertices so that every edge <code>u → w</code> goes from earlier to later. Levitin gives two algorithms; this one uses
<b>Depth-First Search (DFS)</b>: a vertex becomes a <i>dead end</i> (is "popped off the stack") only after everything reachable
from it is finished — so listing vertices in <b>reverse</b> pop-off order puts every vertex before all of its successors.</p>
<p><b>Input:</b> <code>adj[0..n-1]</code>, where <code>adj[v]</code> lists the vertices <code>w</code> with an edge <code>v → w</code>.</p>
<p><b>Exact order required:</b> start DFS at vertex 0, then at the next unvisited vertex 1, 2, …; always explore
<code>adj[v]</code> in the order given. Return the reverse of the pop-off (finishing) order.</p>
<p><b>Cycles:</b> if DFS meets an edge to a vertex that is still <i>on the stack</i> (a back edge), the graph is not a DAG — return
<code>[]</code>. (An edge to an already <i>finished</i> vertex is fine.)</p>
<p><b>Constraints:</b> 1 ≤ n ≤ 14.</p>`,
    entry: "TopoSortDFS",
    params: ["adj"],
    tests: [
      { args: [[[1, 2], [3], [3], []]], expect: [0, 2, 1, 3], explain: "Pop-off order is 3, 1, 2, 0 (3 finishes first); reversed: 0, 2, 1, 3." },
      { args: [[[2], [2], [3, 4], [4], []]], expect: [1, 0, 2, 3, 4], explain: "DFS from 0 finishes 4, 3, 2, 0; then vertex 1 finishes. Reverse of 4, 3, 2, 0, 1." },
      { args: [[[1], [2], [0]]], expect: [], explain: "0 → 1 → 2 → 0: the edge 2 → 0 points back to a vertex still on the stack." },
      { args: [[[], [], []]], expect: [2, 1, 0], explain: "No edges: each vertex finishes immediately, in order 0, 1, 2." },
      { args: [[[1], [], [1]]], expect: [2, 0, 1], explain: "2 → 1 reaches an already FINISHED vertex — not a cycle." },
      { args: [[[1], [2], [3], [1]]], expect: [], explain: "A cycle 1 → 2 → 3 → 1 that does not include the start vertex." },
      { args: [[[0]]], expect: [], explain: "A self-loop is a cycle too." },
      { args: [[[3], [3], [0, 1], []]], expect: [2, 1, 0, 3] },
    ],
    random: {
      count: 25,
      gen: (r, i) => {
        const n = 2 + (i % 12), perm = r.shuffle(range(n)), adj = Array.from({ length: n }, () => []);
        for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (r() < 0.3) adj[perm[a]].push(perm[b]);
        if (i % 3 === 2) adj[perm[n - 1]].push(perm[r.int(0, n - 2)]);
        adj.forEach((ws) => r.shuffle(ws));
        return [adj];
      },
    },
    reference: (adj) => topoDfs(adj),
    mutants: [
      { fn: (adj) => topoDfs(adj, "noReverse"), hint: "You return the pop-off order itself. The vertex that finishes FIRST has no unfinished successors, so it belongs LAST — reverse the list." },
      { fn: (adj) => topoDfs(adj, "preorder"), hint: "You record vertices when DFS first VISITS them. Record a vertex only when it becomes a dead end (after its whole adjacency list is done), then reverse." },
      { fn: (adj) => topoDfs(adj, "noCycleCheck"), hint: "Cyclic graphs should give []. Keep three states — unvisited, on the stack, finished — and report a cycle when an edge leads to a vertex that is still on the stack." },
    ],
    hints: [
      "When DFS pops a vertex v off the stack, where are all the vertices that v has edges to? Already finished, or not yet?",
      "Keep state[v] ∈ {0 = new, 1 = on stack, 2 = finished} and a list of finished vertices. Recursive DFS(v): mark 1, explore neighbors, mark 2, append v.",
      "In DFS(v), an edge to a vertex with state 1 means a back edge → cycle. After DFS from every unvisited vertex 0, 1, …, return reverse(order).",
    ],
    starter: {
      pseudo: `ALGORITHM TopoSortDFS(adj[0..n-1])
    state ← array(n, 0)
    order ← []
    for v ← 0 to n - 1 do
        ...
    return reverse(order)

ALGORITHM DFS(adj, v, state, order)
    // returns false if a back edge (cycle) is found
    ...`,
      js: `function TopoSortDFS(adj) {
  const n = adj.length, state = Array(n).fill(0), order = [];
  // ...
}`,
    },
    solution: {
      pseudo: `ALGORITHM TopoSortDFS(adj[0..n-1])
    state ← array(n, 0)
    order ← []
    for v ← 0 to n - 1 do
        if state[v] = 0 then
            if not DFS(adj, v, state, order) then
                return []
    return reverse(order)

ALGORITHM DFS(adj, v, state, order)
    state[v] ← 1
    for each w in adj[v] do
        if state[w] = 1 then
            return false
        if state[w] = 0 then
            if not DFS(adj, w, state, order) then
                return false
    state[v] ← 2
    append(order, v)
    return true`,
      js: `function TopoSortDFS(adj) {
  const n = adj.length, state = Array(n).fill(0), order = [];
  function dfs(v) {
    state[v] = 1;
    for (const w of adj[v]) {
      if (state[w] === 1) return false;
      if (state[w] === 0 && !dfs(w)) return false;
    }
    state[v] = 2;
    order.push(v);
    return true;
  }
  for (let v = 0; v < n; v++) if (state[v] === 0 && !dfs(v)) return [];
  return order.reverse();
}`,
      python: `def topo_sort_dfs(adj):
    n = len(adj)
    state, order = [0] * n, []
    def dfs(v):
        state[v] = 1
        for w in adj[v]:
            if state[w] == 1:
                return False
            if state[w] == 0 and not dfs(w):
                return False
        state[v] = 2
        order.append(v)
        return True
    for v in range(n):
        if state[v] == 0 and not dfs(v):
            return []
    return order[::-1]`,
      explain: "When v is popped, every w with v → w is already finished (state 2) — state 1 would be a back edge, i.e. a cycle — so w precedes v in pop order and follows it after reversal. Each vertex and edge is handled once: Θ(n + m) with adjacency lists, the same as DFS itself.",
    },
    distractors: ["return order", "if state[w] ≠ 0 then", "state[v] ← 2"],
    followUp: "Build tools (make, Bazel), package managers and spreadsheet recalculation all topologically sort a dependency DAG. Twist: return ALL vertices on a detected cycle so the user sees why the build is impossible, or count the number of distinct topological orders for small graphs.",
    complexity: "Θ(n + m)",
    visual: "sims/topo-sort.html",
    lesson: "lessons/04-decrease-and-conquer/README.md",
  });

  /* =====================================================================
     17. Power set (decrease-by-one)
     ===================================================================== */
  const psRef = (S) => { let L = [[]]; for (const x of S) L = L.concat(L.map((T) => T.concat([x]))); return L; };
  ForgeProblems.add({
    id: "power-set",
    title: "Power Set by Decrease-by-One",
    level: 2, chapter: 4, difficulty: 1,
    topics: ["combinatorics", "subsets", "decrease-and-conquer", "recursion"],
    strategy: "Decrease-by-one",
    source: "Levitin Exercise 4.1.4 · CSC 501 A2 Q5",
    summary: "Generate all 2ⁿ subsets: the subsets without the last element, plus each of them with it added.",
    statement: `
<p>The <b>power set</b> of S is the set of all its subsets, from the empty set to S itself — exactly what exhaustive search
(knapsack, partition) has to walk through. Decrease-by-one gives a two-line idea: every subset of
<code>{a₁, …, aₙ}</code> either <b>doesn't</b> contain aₙ (so it is a subset of <code>{a₁, …, aₙ₋₁}</code>) or <b>does</b>
(so it is such a subset with aₙ added).</p>
<p><b>Task:</b> given a list <code>S[0..n-1]</code> of distinct items, return a list of all 2ⁿ subsets, each subset as a list.
Any order of the subsets, and of the items inside a subset, is accepted.</p>
<p><b>Constraints:</b> 0 ≤ n ≤ 8.</p>`,
    entry: "PowerSet",
    params: ["S"],
    compare: "unordered-deep",
    tests: [
      { args: [["a", "b", "c"]], expect: [[], ["a"], ["b"], ["a", "b"], ["c"], ["a", "c"], ["b", "c"], ["a", "b", "c"]], explain: "The four subsets of {a, b}, then the same four with c added — 8 in total." },
      { args: [[]], expect: [[]], explain: "The empty set has exactly one subset: itself. This is the base case — [[]], not []." },
      { args: [[7]], expect: [[], [7]] },
      { args: [[1, 2]], expect: [[], [1], [2], [1, 2]] },
      { args: [[4, 5, 6, 7]], expect: psRef([4, 5, 6, 7]), explain: "2⁴ = 16 subsets." },
      { args: [["x", "y"]], expect: [[], ["x"], ["y"], ["x", "y"]], explain: "Items can be text too." },
    ],
    random: { count: 10, gen: (r, i) => [r.distinct(i % 9, 1, 50)] },
    reference: psRef,
    mutants: [
      { fn: () => [], hint: "You get no subsets at all. The base case must return a list containing ONE subset, the empty one: [[]]. Returning [] leaves nothing to extend." },
      { fn: (S) => (S.length ? psRef(S.slice(0, -1)).map((T) => T.concat([S[S.length - 1]])) : [[]]), hint: "You only keep the subsets that CONTAIN the last element. The answer is the smaller power set itself PLUS each of its subsets with the last element added." },
      { fn: (S) => [[]].concat(S.map((x) => [x])), hint: "You list the empty set and the single-element subsets, but not the larger ones. Build on ALL the subsets of the first n − 1 elements, not just the empty one." },
    ],
    hints: [
      "Suppose you already had every subset of the first n − 1 items. How can you get every subset of all n items from that list?",
      "Recursive plan: base case n = 0 → [[]]. Otherwise L ← PowerSet(S[0..n−2]); the answer is everything in L plus, for each T in L, a copy of T with S[n−1] appended.",
      "Copy before extending: U ← copy(T); append(U, S[n − 1]); append(result, U). Appending to T itself would change the subsets you already added.",
    ],
    starter: {
      pseudo: `ALGORITHM PowerSet(S[0..n-1])
    if n = 0 then
        return ...
    L ← PowerSet(S[0..n - 2])
    ...`,
      js: `function PowerSet(S) {
  if (S.length === 0) return /* ... */;
  // ...
}`,
    },
    solution: {
      pseudo: `ALGORITHM PowerSet(S[0..n-1])
    if n = 0 then
        return [[]]
    L ← PowerSet(S[0..n - 2])
    result ← []
    for each T in L do
        append(result, T)
    for each T in L do
        U ← copy(T)
        append(U, S[n - 1])
        append(result, U)
    return result`,
      js: `function PowerSet(S) {
  if (S.length === 0) return [[]];
  const L = PowerSet(S.slice(0, -1)), last = S[S.length - 1];
  return L.concat(L.map((T) => [...T, last]));
}`,
      python: `def power_set(S):
    if not S:
        return [[]]
    L = power_set(S[:-1])
    return L + [T + [S[-1]] for T in L]`,
      explain: "|L(n)| = 2|L(n − 1)| with |L(0)| = 1, so there are 2ⁿ subsets and the algorithm is Θ(2ⁿ) (Θ(n·2ⁿ) counting the time to copy the subsets) — optimal, since it must output 2ⁿ items.",
    },
    distractors: ["return []", "append(T, S[n - 1])", "L ← PowerSet(S[1..n - 1])"],
    followUp: "The bit-string view (subset ↔ n-bit number) turns this into a loop from 0 to 2ⁿ − 1 — the standard 'bitmask enumeration' trick in interviews and competitive programming. With n = 25 that is already 33 million subsets: exhaustive search hits a wall fast.",
    complexity: "Θ(2ⁿ) subsets",
    visual: "sims/combinatorics.html",
    lesson: "lessons/04-decrease-and-conquer/README.md",
  });

  /* =====================================================================
     18. Permutations in lexicographic order
     ===================================================================== */
  // variant: "ok", "noReverse", "swapNext", "skipFirst"
  function lexPerms(n, variant = "ok") {
    const a = range(n).map((x) => x + 1), out = [a.slice()];
    for (let guard = 0; guard < 1000; guard++) {
      let i = n - 2;
      while (i >= 0 && a[i] > a[i + 1]) i--;
      if (i < 0) break;
      let j = n - 1;
      while (a[j] < a[i]) j--;
      if (variant === "swapNext") j = i + 1;
      [a[i], a[j]] = [a[j], a[i]];
      if (variant !== "noReverse") for (let l = i + 1, r = n - 1; l < r; l++, r--) [a[l], a[r]] = [a[r], a[l]];
      out.push(a.slice());
    }
    return variant === "skipFirst" ? out.slice(1) : out;
  }
  ForgeProblems.add({
    id: "permutations-lexicographic",
    title: "Permutations in Lexicographic Order",
    level: 2, chapter: 4, difficulty: 2,
    topics: ["combinatorics", "permutations", "next permutation"],
    strategy: "Decrease-and-conquer (generate next from current)",
    source: "Levitin §4.3 (LexicographicPermute)",
    summary: "List all n! permutations of 1..n in dictionary order using the 'next permutation' step.",
    statement: `
<p>To go from one permutation to the <b>next</b> in dictionary (lexicographic) order, change as little as possible at the
<i>right</i> end: find the longest decreasing suffix, bump the element just before it up to the next larger value from the
suffix, and put the suffix back in increasing order. For example, 3 6 2 5 4 1 is followed by 3 6 4 1 2 5.</p>
<p><b>Task:</b> return the list of all permutations of <code>1, 2, …, n</code> in lexicographic order, each as a list — starting
with <code>[1, 2, …, n]</code> and ending with <code>[n, …, 2, 1]</code>.</p>
<p><b>Constraints:</b> 1 ≤ n ≤ 6.</p>`,
    entry: "LexPermute",
    params: ["n"],
    tests: [
      { args: [3], expect: [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]], explain: "Dictionary order for n = 3: 123 132 213 231 312 321." },
      { args: [1], expect: [[1]], explain: "One permutation; the list has no ascent, so you stop at once." },
      { args: [2], expect: [[1, 2], [2, 1]] },
      { args: [4], expect: lexPerms(4), explain: "24 permutations; e.g. 1 4 3 2 is followed by 2 1 3 4." },
      { args: [5], expect: lexPerms(5) },
      { args: [6], expect: lexPerms(6) },
    ],
    random: { count: 3, gen: (r, i) => [1 + ((i * 2) % 6)] },
    reference: (n) => lexPerms(n),
    mutants: [
      { fn: (n) => lexPerms(n, "noReverse"), hint: "After the swap, the suffix a[i+1..n−1] is still in DECREASING order. Reverse it so it becomes the smallest possible (increasing) — e.g. 1 3 2 must be followed by 2 1 3, not 2 3 1." },
      { fn: (n) => lexPerms(n, "swapNext"), hint: "You swap a[i] with its right neighbor. Swap it instead with the SMALLEST suffix element that is larger than a[i] — scan from the right end for the first a[j] > a[i]." },
      { fn: (n) => lexPerms(n, "skipFirst"), hint: "The first permutation 1 2 … n is missing. Add it to the list before generating the next ones." },
    ],
    hints: [
      "Look at 1 4 3 2 → 2 1 3 4. Which part of the permutation changed, and why couldn't anything to its right be increased instead?",
      "Each step: find the largest i with a[i] < a[i+1] (stop when there is none); find the largest j with a[j] > a[i]; swap them; reverse a[i+1..n−1]; record a copy.",
      "Scan i from n − 2 down while a[i] > a[i+1]. Scan j from n − 1 down while a[j] < a[i]. Reverse with two indexes l ← i + 1, r ← n − 1 moving toward each other. append(result, copy(a)).",
    ],
    starter: {
      pseudo: `ALGORITHM LexPermute(n)
    a ← range(1, n)
    result ← [copy(a)]
    while true do
        i ← n - 2
        ...`,
      js: `function LexPermute(n) {
  const a = Array.from({ length: n }, (_, k) => k + 1), result = [a.slice()];
  // ...
  return result;
}`,
    },
    solution: {
      pseudo: `ALGORITHM LexPermute(n)
    a ← range(1, n)
    result ← [copy(a)]
    while true do
        i ← n - 2
        while i ≥ 0 and a[i] > a[i + 1] do
            i ← i - 1
        if i < 0 then
            return result
        j ← n - 1
        while a[j] < a[i] do
            j ← j - 1
        swap a[i] and a[j]
        l ← i + 1
        r ← n - 1
        while l < r do
            swap a[l] and a[r]
            l ← l + 1
            r ← r - 1
        append(result, copy(a))`,
      js: `function LexPermute(n) {
  const a = Array.from({ length: n }, (_, k) => k + 1), result = [a.slice()];
  for (;;) {
    let i = n - 2;
    while (i >= 0 && a[i] > a[i + 1]) i--;
    if (i < 0) return result;
    let j = n - 1;
    while (a[j] < a[i]) j--;
    [a[i], a[j]] = [a[j], a[i]];
    for (let l = i + 1, r = n - 1; l < r; l++, r--) [a[l], a[r]] = [a[r], a[l]];
    result.push(a.slice());
  }
}`,
      python: `def lex_permute(n):
    a = list(range(1, n + 1))
    result = [a[:]]
    while True:
        i = n - 2
        while i >= 0 and a[i] > a[i + 1]:
            i -= 1
        if i < 0:
            return result
        j = n - 1
        while a[j] < a[i]:
            j -= 1
        a[i], a[j] = a[j], a[i]
        a[i + 1:] = reversed(a[i + 1:])
        result.append(a[:])`,
      explain: "The suffix after i is the longest decreasing run, i.e. already the largest arrangement of its elements, so the next permutation must increase a[i] by the least possible amount and then make the suffix as small as possible (increasing). Each step is O(n) in the worst case but O(1) amortized; producing all n! permutations is Θ(n·n!) with the copies.",
    },
    distractors: ["j ← i + 1", "while i ≥ 0 and a[i] < a[i + 1] do", "if i = 0 then"],
    followUp: "This is exactly C++ std::next_permutation and LeetCode 31 'Next Permutation' — O(n) time, O(1) space. Levitin Exercise 4.3.3: it also works on multisets like {1, 2, 2, 3}, producing each distinct arrangement once, if you use ≥ / ≤ in the two scans.",
    complexity: "Θ(n!) permutations, O(1) amortized per step",
    visual: "sims/combinatorics.html",
    lesson: "lessons/04-decrease-and-conquer/README.md",
  });

  /* =====================================================================
     19. Johnson–Trotter
     ===================================================================== */
  // variant: "ok", "firstMobile", "noFlip", "flipSmaller"
  function jt(n, variant = "ok") {
    const a = range(n).map((x) => x + 1), d = Array(n).fill(-1), out = [a.slice()];
    for (let guard = 0; guard < 800; guard++) {
      let m = -1;
      for (let i = 0; i < n; i++) {
        const j = i + d[i];
        if (j >= 0 && j < n && a[j] < a[i]) { if (m === -1 || (variant !== "firstMobile" && a[i] > a[m])) m = i; }
      }
      if (m === -1) break;
      const k = a[m], j = m + d[m];
      [a[m], a[j]] = [a[j], a[m]]; [d[m], d[j]] = [d[j], d[m]];
      if (variant !== "noFlip") for (let i = 0; i < n; i++) if (variant === "flipSmaller" ? a[i] < k : a[i] > k) d[i] = -d[i];
      out.push(a.slice());
    }
    return out;
  }
  ForgeProblems.add({
    id: "johnson-trotter",
    title: "Johnson–Trotter Permutations",
    level: 2, chapter: 4, difficulty: 3,
    topics: ["combinatorics", "permutations", "minimal change"],
    strategy: "Decrease-by-one (minimal-change)",
    source: "Levitin §4.3 (JohnsonTrotter)",
    summary: "Generate all permutations so that consecutive ones differ by swapping two neighbors, using 'mobile' elements.",
    statement: `
<p>A <b>minimal-change</b> ordering lists the permutations so that each one differs from the previous by swapping just two
<i>adjacent</i> elements — handy when, say, the cost of a Traveling Salesman Problem (TSP) tour can be updated in constant time
instead of recomputed.</p>
<p>The Johnson–Trotter algorithm gives every element an arrow (initially all pointing <b>left</b>). An element is <b>mobile</b>
if its arrow points to an adjacent element that is <i>smaller</i> than it. Repeat: find the <b>largest</b> mobile element k,
swap it with the neighbor its arrow points to (the arrow travels with k), then <b>reverse the arrows of all elements larger than
k</b>, and record the new permutation. Stop when nothing is mobile.</p>
<p><b>Task:</b> return the list of all permutations of <code>1..n</code> in Johnson–Trotter order, starting with
<code>[1, 2, …, n]</code>. <b>Constraints:</b> 1 ≤ n ≤ 6.</p>`,
    entry: "JohnsonTrotter",
    params: ["n"],
    tests: [
      { args: [3], expect: [[1, 2, 3], [1, 3, 2], [3, 1, 2], [3, 2, 1], [2, 3, 1], [2, 1, 3]], explain: "3 walks left to the front; then 2 moves and 3's arrow flips; 3 walks back right; 1 2 swap is last." },
      { args: [1], expect: [[1]], explain: "A single element can never be mobile." },
      { args: [2], expect: [[1, 2], [2, 1]] },
      { args: [4], expect: jt(4), explain: "24 permutations: 4 sweeps left, then right, while 1 2 3 go through their own Johnson–Trotter order." },
      { args: [5], expect: jt(5) },
      { args: [6], expect: jt(6) },
    ],
    random: { count: 3, gen: (r, i) => [2 + i] },
    reference: (n) => jt(n),
    mutants: [
      { fn: (n) => jt(n, "firstMobile"), hint: "You move the FIRST mobile element you find. The rule is to move the LARGEST mobile element — scan the whole permutation and keep the biggest one." },
      { fn: (n) => jt(n, "noFlip"), hint: "You stop too early (fewer than n! permutations): after moving k, reverse the direction of every element LARGER than k." },
      { fn: (n) => jt(n, "flipSmaller"), hint: "You flip the arrows of the SMALLER elements. Only elements larger than the one you just moved change direction." },
    ],
    hints: [
      "Store two arrays: a[] for the permutation and d[] for the arrows (−1 = left, +1 = right). When you swap two elements, swap their arrows too.",
      "Each round: find index m of the largest mobile element (a[m + d[m]] exists and is smaller than a[m]); if none, stop. Swap positions m and m + d[m], flip arrows of elements > k, record a copy.",
      "Mobile test for index i: j ← i + d[i]; mobile if 0 ≤ j < n and a[j] < a[i]. Keep m with the largest a[m] among mobile ones (m ← −1 means none).",
    ],
    starter: {
      pseudo: `ALGORITHM JohnsonTrotter(n)
    a ← range(1, n)
    d ← array(n, -1)
    result ← [copy(a)]
    while true do
        m ← -1
        ...`,
      js: `function JohnsonTrotter(n) {
  const a = Array.from({ length: n }, (_, k) => k + 1), d = Array(n).fill(-1), result = [a.slice()];
  // ...
  return result;
}`,
    },
    solution: {
      pseudo: `ALGORITHM JohnsonTrotter(n)
    a ← range(1, n)
    d ← array(n, -1)
    result ← [copy(a)]
    while true do
        m ← -1
        for i ← 0 to n - 1 do
            j ← i + d[i]
            if j ≥ 0 and j < n and a[j] < a[i] then
                if m = -1 or a[i] > a[m] then
                    m ← i
        if m = -1 then
            return result
        k ← a[m]
        j ← m + d[m]
        swap a[m] and a[j]
        swap d[m] and d[j]
        for i ← 0 to n - 1 do
            if a[i] > k then
                d[i] ← -d[i]
        append(result, copy(a))`,
      js: `function JohnsonTrotter(n) {
  const a = Array.from({ length: n }, (_, k) => k + 1), d = Array(n).fill(-1), result = [a.slice()];
  for (;;) {
    let m = -1;
    for (let i = 0; i < n; i++) {
      const j = i + d[i];
      if (j >= 0 && j < n && a[j] < a[i] && (m === -1 || a[i] > a[m])) m = i;
    }
    if (m === -1) return result;
    const k = a[m], j = m + d[m];
    [a[m], a[j]] = [a[j], a[m]];
    [d[m], d[j]] = [d[j], d[m]];
    for (let i = 0; i < n; i++) if (a[i] > k) d[i] = -d[i];
    result.push(a.slice());
  }
}`,
      python: `def johnson_trotter(n):
    a, d = list(range(1, n + 1)), [-1] * n
    result = [a[:]]
    while True:
        m = -1
        for i in range(n):
            j = i + d[i]
            if 0 <= j < n and a[j] < a[i] and (m == -1 or a[i] > a[m]):
                m = i
        if m == -1:
            return result
        k, j = a[m], m + d[m]
        a[m], a[j] = a[j], a[m]
        d[m], d[j] = d[j], d[m]
        for i in range(n):
            if a[i] > k:
                d[i] = -d[i]
        result.append(a[:])`,
      explain: "The largest element n sweeps across the others; each time it hits an end, the Johnson–Trotter step for n − 1 elements is performed underneath it — exactly the bottom-up 'insert n right-to-left, then left-to-right' construction, so all n! permutations appear once. This version is Θ(n·n!); with bookkeeping it runs in Θ(n!).",
    },
    distractors: ["if a[i] < k then", "if m = -1 or a[i] < a[m] then", "d ← array(n, 1)"],
    followUp: "Minimal-change orders are Gray codes for permutations: bell ringers ('plain changes') used them centuries ago. Senior twist: update a TSP tour length in O(1) per permutation, since only two adjacent cities swap.",
    complexity: "Θ(n!) permutations (Θ(n·n!) as written)",
    visual: "sims/combinatorics.html",
    lesson: "lessons/04-decrease-and-conquer/README.md",
  });

  /* =====================================================================
     20. Binary reflected Gray code
     ===================================================================== */
  // variant: "ok", "noReflect", "swapPrefix", "suffix"
  function brgc(n, variant = "ok") {
    if (n === 1) return ["0", "1"];
    const L1 = brgc(n - 1, variant), L2 = variant === "noReflect" ? L1.slice() : L1.slice().reverse();
    if (variant === "swapPrefix") return L1.map((s) => "1" + s).concat(L2.map((s) => "0" + s));
    if (variant === "suffix") return L1.map((s) => s + "0").concat(L2.map((s) => s + "1"));
    return L1.map((s) => "0" + s).concat(L2.map((s) => "1" + s));
  }
  ForgeProblems.add({
    id: "gray-code",
    title: "Binary Reflected Gray Code",
    level: 2, chapter: 4, difficulty: 2,
    topics: ["combinatorics", "subsets", "bit strings", "recursion"],
    strategy: "Decrease-by-one",
    source: "Levitin §4.3 (BRGC)",
    summary: "List all n-bit strings so that neighbors differ in exactly one bit — by reflecting the (n−1)-bit list.",
    statement: `
<p>A <b>Gray code</b> lists all 2ⁿ bit strings of length n so that consecutive strings differ in <b>one bit</b>. Rotary encoders
and digital sensors use it so a reading caught mid-change is off by at most one step.</p>
<p>The <b>binary reflected Gray code (BRGC)</b> is built by decrease-by-one: take the list for n − 1 bits, put a <code>0</code> in front of every
string, then append the <i>same list in reverse order</i> with a <code>1</code> in front of every string. For n = 1 the list is
0, 1.</p>
<p><b>Task:</b> return the binary reflected Gray code of order n as a list of strings, e.g. for n = 2:
<code>["00", "01", "11", "10"]</code>. In Forge Pseudocode <code>"0" + s</code> glues a character onto a string.</p>
<p><b>Constraints:</b> 1 ≤ n ≤ 8.</p>`,
    entry: "BRGC",
    params: ["n"],
    tests: [
      { args: [3], expect: ["000", "001", "011", "010", "110", "111", "101", "100"], explain: "Levitin's order for n = 3: each string differs from the next in one bit — and the last differs from the first too (it's cyclic)." },
      { args: [1], expect: ["0", "1"], explain: "Base case." },
      { args: [2], expect: ["00", "01", "11", "10"], explain: "0 + (0, 1), then 1 + (1, 0) — the second half is the reflection." },
      { args: [4], expect: brgc(4) },
      { args: [5], expect: brgc(5) },
      { args: [6], expect: brgc(6), explain: "64 strings; the last one is 100000, one bit away from the first." },
    ],
    random: { count: 4, gen: (r, i) => [5 + i] },
    reference: (n) => brgc(n),
    mutants: [
      { fn: (n) => brgc(n, "noReflect"), hint: "That's ordinary binary counting — 01 → 10 changes two bits. The second half must be the smaller list in REVERSE order (that's the 'reflected' part)." },
      { fn: (n) => brgc(n, "swapPrefix"), hint: "Your prefixes are swapped: the first half should start with 0 (so the code begins at 00…0) and the reflected half with 1." },
      { fn: (n) => brgc(n, "suffix"), hint: "You attach the new bit at the END of each string. Put the new 0/1 bit in FRONT: \"0\" + s and \"1\" + s." },
    ],
    hints: [
      "Write down the code for n = 2 and n = 3. How does the n = 3 list relate to the n = 2 list — look at the first four strings and the last four.",
      "Recursive plan: if n = 1 return [\"0\", \"1\"]. Otherwise L1 ← BRGC(n − 1); output \"0\" + s for s in L1 in order, then \"1\" + s for s in L1 in REVERSE order.",
      "For the second half use a count-down loop: for i ← length(L1) − 1 downto 0 do append(L, \"1\" + L1[i]).",
    ],
    starter: {
      pseudo: `ALGORITHM BRGC(n)
    if n = 1 then
        return ["0", "1"]
    L1 ← BRGC(n - 1)
    L ← []
    ...
    return L`,
      js: `function BRGC(n) {
  if (n === 1) return ["0", "1"];
  // ...
}`,
    },
    solution: {
      pseudo: `ALGORITHM BRGC(n)
    if n = 1 then
        return ["0", "1"]
    L1 ← BRGC(n - 1)
    L ← []
    for each s in L1 do
        append(L, "0" + s)
    for i ← length(L1) - 1 downto 0 do
        append(L, "1" + L1[i])
    return L`,
      js: `function BRGC(n) {
  if (n === 1) return ["0", "1"];
  const L1 = BRGC(n - 1);
  return L1.map((s) => "0" + s).concat(L1.slice().reverse().map((s) => "1" + s));
}`,
      python: `def brgc(n):
    if n == 1:
        return ["0", "1"]
    L1 = brgc(n - 1)
    return ["0" + s for s in L1] + ["1" + s for s in reversed(L1)]`,
      explain: "By induction: inside each half neighbors differ in one bit (same as in L1), and at the seam the two strings are 0s and 1s with the same s. The list has 2ⁿ distinct strings, so the algorithm is Θ(2ⁿ) strings (Θ(n·2ⁿ) characters) — optimal for this output.",
    },
    distractors: ["append(L, s + \"0\")", "for i ← 0 to length(L1) - 1 do", "return [\"0\"]"],
    followUp: "Closed form: the i-th Gray code word is the bitwise exclusive-or (XOR) of i and i div 2 — an O(1) conversion used in hardware counters and Karnaugh maps. Twist (Levitin Exercise 4.3.9): generate the code without recursion by flipping, at step i, the bit given by the number of trailing zeros of i — the same sequence as the moves of the Tower of Hanoi.",
    complexity: "Θ(2ⁿ) strings",
    visual: "sims/combinatorics.html",
    lesson: "lessons/04-decrease-and-conquer/README.md",
  });

  /* =====================================================================
     21. Nim — winning move
     ===================================================================== */
  const nimSum = (P) => P.reduce((s, x) => s ^ x, 0);
  const nimRef = (P) => { const s = nimSum(P); if (s === 0) return []; for (let i = 0; i < P.length; i++) if ((P[i] ^ s) < P[i]) return [i, P[i] ^ s]; return []; };
  ForgeProblems.add({
    id: "nim-winning-move",
    title: "Nim: Find the Winning Move",
    level: 2, chapter: 4, difficulty: 3,
    topics: ["games", "variable-size-decrease", "binary", "bit manipulation"],
    strategy: "Variable-size decrease (game analysis)",
    source: "Levitin §4.5 (Game of Nim)",
    summary: "Given Nim piles, find a move that leaves nim-sum 0 — or report that the position is lost.",
    statement: `
<p>In <b>Nim</b>, players alternately remove any positive number of chips from a <i>single</i> pile; whoever takes the last chip
wins. Each move shrinks the instance by a variable amount. C. L. Bouton's theorem: the player to move <b>loses</b> (against perfect
play) exactly when the <b>nim-sum</b> of the pile sizes is 0. The nim-sum is the <i>binary digital sum</i>: write the sizes in
binary and add each bit column <b>without carries</b> (mod 2) — i.e. bitwise exclusive-or (XOR).</p>
<p>If the nim-sum s is not 0, some pile P[i] shrinks when XOR-ed with s — setting that pile to <code>P[i] XOR s</code> makes the
nim-sum 0 and hands your opponent a losing position.</p>
<p><b>Task:</b> given pile sizes <code>P[0..n-1]</code>, return <code>[i, newSize]</code> for the winning move on the
<b>lowest-index</b> pile that allows one, or <code>[]</code> if the position is losing.</p>
<p>Forge Pseudocode has no bitwise XOR, so write a helper <code>BitXor(x, y)</code> with <code>div 2</code> and <code>mod 2</code>.
<b>Constraints:</b> 1 ≤ n ≤ 8, 0 ≤ P[i] ≤ 1000.</p>`,
    entry: "NimMove",
    params: ["P"],
    tests: [
      { args: [[3, 4, 5]], expect: [0, 1], explain: "011 ⊕ 100 ⊕ 101 = 010 = 2. Pile 0: 3 ⊕ 2 = 1 < 3, so reduce it to 1; then 1 ⊕ 4 ⊕ 5 = 0." },
      { args: [[1, 2, 3]], expect: [], explain: "1 ⊕ 2 ⊕ 3 = 0: every move loses." },
      { args: [[7]], expect: [0, 0], explain: "One pile: take everything." },
      { args: [[0, 0]], expect: [], explain: "No chips: the player to move has already lost." },
      { args: [[5, 5]], expect: [], explain: "Two equal piles: mirror strategy — nim-sum 0." },
      { args: [[2, 5, 9]], expect: [2, 7], explain: "s = 14 (1110). 2 ⊕ 14 = 12 and 5 ⊕ 14 = 11 would GROW those piles; 9 ⊕ 14 = 7 < 9 works." },
      { args: [[1, 1, 1]], expect: [0, 0] },
      { args: [[4, 1]], expect: [0, 1], explain: "s = 5; pile 0: 4 ⊕ 5 = 1." },
    ],
    random: { count: 25, gen: (r, i) => { const P = r.array(1 + (i % 6), 0, i < 12 ? 15 : 1000); if (i % 4 === 3) P.push(nimSum(P)); return [P]; } },
    reference: nimRef,
    mutants: [
      { fn: (P) => { const s = nimSum(P); if (s === 0) return []; let b = 0; for (let i = 1; i < P.length; i++) if (P[i] > P[b]) b = i; return [b, P[b] ^ s]; }, hint: "You always play on the LARGEST pile, but P[i] ⊕ s might be bigger than P[i] there (you can't add chips). Scan from pile 0 and take the first pile where P[i] ⊕ s < P[i]." },
      { fn: (P) => { const s = nimSum(P); if (s === 0) { const i = P.findIndex((x) => x > 0); return i < 0 ? [] : [i, P[i] - 1]; } return nimRef(P); }, hint: "When the nim-sum is 0 there is NO winning move — every move gives the opponent a nonzero nim-sum. Return [] in that case." },
      { fn: (P) => { const s = nimSum(P); if (s === 0) return []; for (let i = 0; i < P.length; i++) if (P[i] >= s) return [i, P[i] - s]; return []; }, hint: "You subtract the nim-sum from a pile. The new size must be P[i] XOR s (bitwise, no borrows) — only then does the total nim-sum become 0." },
    ],
    hints: [
      "Compute the nim-sum s of all piles. If s = 0, what does Bouton's theorem say about the player to move?",
      "Write BitXor(x, y): walk the bits with x mod 2, y mod 2, adding the current power of two when they differ, then halve x and y. Fold it over all piles to get s.",
      "For i from 0: t ← BitXor(P[i], s); if t < P[i] then return [i, t]. Such a pile always exists when s ≠ 0 (any pile with a 1 in s's highest bit).",
    ],
    starter: {
      pseudo: `ALGORITHM NimMove(P[0..n-1])
    s ← 0
    for i ← 0 to n - 1 do
        s ← BitXor(s, P[i])
    ...

ALGORITHM BitXor(x, y)
    // bitwise exclusive-or using div 2 and mod 2
    ...`,
      js: `function NimMove(P) {
  // return [i, newSize] or []
}`,
    },
    solution: {
      pseudo: `ALGORITHM NimMove(P[0..n-1])
    s ← 0
    for i ← 0 to n - 1 do
        s ← BitXor(s, P[i])
    if s = 0 then
        return []
    for i ← 0 to n - 1 do
        t ← BitXor(P[i], s)
        if t < P[i] then
            return [i, t]

ALGORITHM BitXor(x, y)
    z ← 0
    bit ← 1
    while x > 0 or y > 0 do
        if x mod 2 ≠ y mod 2 then
            z ← z + bit
        x ← x div 2
        y ← y div 2
        bit ← 2 * bit
    return z`,
      js: `function NimMove(P) {
  const s = P.reduce((a, x) => a ^ x, 0);
  if (s === 0) return [];
  for (let i = 0; i < P.length; i++) if ((P[i] ^ s) < P[i]) return [i, P[i] ^ s];
}`,
      python: `from functools import reduce
def nim_move(P):
    s = reduce(lambda a, x: a ^ x, P, 0)
    if s == 0:
        return []
    for i, p in enumerate(P):
        if p ^ s < p:
            return [i, p ^ s]`,
      explain: "If s ≠ 0, let b be its highest 1-bit; some pile has a 1 in bit b, and XOR-ing it with s clears that bit, so the pile shrinks and the new nim-sum is s ⊕ s = 0. From nim-sum 0 every move changes exactly one pile, making the nim-sum nonzero. Cost: Θ(n log M) bit operations for maximum pile size M.",
    },
    distractors: ["return [i, P[i] - s]", "if t > P[i] then", "if s ≠ 0 then return []"],
    followUp: "One-pile Nim with at most m chips per move is the special case 'lose iff n mod (m + 1) = 0'. The Sprague–Grundy theorem turns ANY impartial game into Nim piles, which is how competitive programmers solve whole families of game problems.",
    complexity: "Θ(n log M)",
    visual: "sims/nim.html",
    lesson: "lessons/04-decrease-and-conquer/README.md",
  });

  /* =====================================================================
     22. Counting inversions
     ===================================================================== */
  const invBrute = (A, strict = true) => { let c = 0; for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) if (strict ? A[i] > A[j] : A[i] >= A[j]) c++; return c; };
  function invPlusOne(A) {
    if (A.length <= 1) return 0;
    const h = Math.floor(A.length / 2), B = A.slice(0, h), C = A.slice(h);
    let c = invPlusOne(B) + invPlusOne(C), i = 0, j = 0;
    for (let k = 0; k < A.length; k++) { if (j === C.length || (i < B.length && B[i] <= C[j])) A[k] = B[i++]; else { A[k] = C[j++]; if (i < B.length) c++; } }
    return c;
  }
  ForgeProblems.add({
    id: "count-inversions",
    title: "Count Inversions in O(n log n)",
    level: 2, chapter: 5, difficulty: 3,
    topics: ["divide-and-conquer", "merging", "counting", "sorting"],
    strategy: "Divide-and-conquer (piggyback on mergesort)",
    source: "Levitin Exercise 5.1.9",
    summary: "Count pairs i < j with A[i] > A[j] by counting during mergesort's merge step.",
    statement: `
<p>A pair of positions <code>i &lt; j</code> is an <b>inversion</b> if <code>A[i] &gt; A[j]</code>. The number of inversions measures
how unsorted an array is (it is exactly the number of swaps insertion sort or bubble sort performs), and it is the
"Kendall tau distance" recommender systems use to compare two rankings.</p>
<p>Checking every pair is Θ(n²). Divide-and-conquer does better: inversions inside the left half + inside the right half +
inversions <b>across</b> the halves — and the cross ones can be counted for free while merging the two sorted halves.</p>
<p><b>Task:</b> return the number of inversions of <code>A[0..n-1]</code> (equal elements are <i>not</i> an inversion). You may
rearrange <code>A</code>.</p>
<p><b>Constraints:</b> 0 ≤ n ≤ 60 in the tests. On random input your algorithm must make Θ(n log n) element comparisons — the
Θ(n²) double loop is flagged as too slow.</p>`,
    entry: "CountInversions",
    params: ["A"],
    tests: [
      { args: [[2, 4, 1, 3, 5]], expect: 3, explain: "(2, 1), (4, 1), (4, 3)." },
      { args: [[]], expect: 0 },
      { args: [[1, 2, 3, 4]], expect: 0, explain: "Sorted: no inversions." },
      { args: [[5, 4, 3, 2, 1]], expect: 10, explain: "Reversed: every pair is inverted, n(n − 1)/2 = 10." },
      { args: [[2, 1, 2, 1]], expect: 3, explain: "(2, 1) twice from index 0, and (2, 1) at indexes 2, 3. The pairs of EQUAL values don't count." },
      { args: [[1, 1, 1]], expect: 0 },
      { args: [[8, 4, 2, 1]], expect: 6 },
      { args: [[3, 1, 2]], expect: 2, explain: "When 1 and 2 (right half) are merged ahead of 3, each jumps over ONE remaining left element." },
      { args: [[1, 5, 2, 6, 3, 7, 4, 8]], expect: 6, explain: "Halves 1 5 2 6 | 3 7 4 8: 1 inversion inside each half, 4 across." },
    ],
    random: { count: 25, gen: (r, i) => [r.array(i % 30, 0, i % 2 ? 5 : 50)] },
    reference: (A) => invBrute(A),
    growth: { metric: "keyComparisons", sizes: [32, 64, 128, 256, 512], gen: (r, n) => [r.array(n, 0, 10000)], expect: "n log n" },
    mutants: [
      { fn: (A) => { let c = 0; for (let i = 0; i + 1 < A.length; i++) if (A[i] > A[i + 1]) c++; return c; }, hint: "You count only NEIGHBORING pairs. An inversion can involve any i < j — e.g. in 3 1 2, the pair (3, 2) is also inverted." },
      { fn: (A) => invBrute(A, false), hint: "Pairs of EQUAL elements are being counted. In the merge, take from the left half when B[i] ≤ C[j] (ties go left, no inversion)." },
      { fn: (A) => invPlusOne(A.slice()), hint: "When C[j] is merged ahead of the left half, it is smaller than ALL remaining left elements B[i..p − 1] — add p − i inversions, not just 1." },
    ],
    hints: [
      "Split A into halves. Every inversion is inside the left half, inside the right half, or has one element in each. Which of those can recursion handle?",
      "Make the recursion also SORT its half (like mergesort). While merging sorted B and C, each time an element of C is copied before the rest of B, it forms an inversion with every remaining element of B.",
      "In the merge: if you take C[j] while i < length(B), add length(B) − i to the count. Return (count of B) + (count of C) + (cross count).",
    ],
    starter: {
      pseudo: `ALGORITHM CountInversions(A[0..n-1])
    // Returns the number of inversions and leaves A sorted
    if n ≤ 1 then
        return 0
    B ← A[0..⌊n/2⌋ - 1]
    C ← A[⌊n/2⌋..n - 1]
    count ← CountInversions(B) + CountInversions(C)
    ...
    return count`,
      js: `function CountInversions(A) {
  // O(n log n): count while merge-sorting
}`,
    },
    solution: {
      pseudo: `ALGORITHM CountInversions(A[0..n-1])
    if n ≤ 1 then
        return 0
    B ← A[0..⌊n/2⌋ - 1]
    C ← A[⌊n/2⌋..n - 1]
    count ← CountInversions(B) + CountInversions(C)
    i ← 0
    j ← 0
    for k ← 0 to n - 1 do
        if j = length(C) or (i < length(B) and B[i] ≤ C[j]) then
            A[k] ← B[i]
            i ← i + 1
        else
            A[k] ← C[j]
            j ← j + 1
            count ← count + length(B) - i
    return count`,
      js: `function CountInversions(A) {
  if (A.length <= 1) return 0;
  const h = Math.floor(A.length / 2), B = A.slice(0, h), C = A.slice(h);
  let count = CountInversions(B) + CountInversions(C), i = 0, j = 0;
  for (let k = 0; k < A.length; k++) {
    if (j === C.length || (i < B.length && B[i] <= C[j])) A[k] = B[i++];
    else { A[k] = C[j++]; count += B.length - i; }
  }
  return count;
}`,
      python: `def count_inversions(A):
    if len(A) <= 1:
        return 0
    h = len(A) // 2
    B, C = A[:h], A[h:]
    count = count_inversions(B) + count_inversions(C)
    i = j = 0
    for k in range(len(A)):
        if j == len(C) or (i < len(B) and B[i] <= C[j]):
            A[k] = B[i]; i += 1
        else:
            A[k] = C[j]; j += 1
            count += len(B) - i
    return count`,
      explain: "Counting adds O(1) work per merged element, so the recurrence is mergesort's: C(n) = 2C(n/2) + Θ(n) ∈ Θ(n log n) by the Master Theorem. Correctness: when C[j] is taken, B[i..p−1] are all > C[j] (B is sorted and B[i] > C[j]) and all come earlier in the original array.",
    },
    distractors: ["count ← count + 1", "if j = length(C) or (i < length(B) and B[i] < C[j]) then", "count ← count + length(C) - j"],
    followUp: "The same 'count while merging' trick answers 'how many elements to the right are smaller' per position (LeetCode 315) and counts crossings in two rankings. Alternative senior tool: a Fenwick tree (Binary Indexed Tree) counts inversions in O(n log n) online.",
    complexity: "Θ(n log n)",
    visual: "sims/sorting-studio.html",
    lesson: "lessons/05-divide-and-conquer/README.md",
  });

  /* =====================================================================
     23. Karatsuba multiplication
     ===================================================================== */
  const kCalls = (n) => (Math.pow(3, Math.log2(n) + 1) - 1) / 2;
  function kMut(x, y, n, variant) {
    if (n === 1) return x * y;
    const m = n / 2, p = Math.pow(10, m), a1 = Math.floor(x / p), a0 = x % p, b1 = Math.floor(y / p), b0 = y % p;
    const c2 = kMut(a1, b1, m, variant), c0 = kMut(a0, b0, m, variant);
    let c1 = kMut(a1 + a0, b1 + b0, m, variant);
    if (variant !== "noSubtract") c1 = c1 - c2 - c0;
    return variant === "shift" ? c2 * p + c1 * p + c0 : c2 * p * p + c1 * p + c0;
  }
  ForgeProblems.add({
    id: "karatsuba-multiply",
    title: "Karatsuba Multiplication (3 Instead of 4)",
    level: 2, chapter: 5, difficulty: 3,
    topics: ["divide-and-conquer", "arithmetic", "recurrences", "Master Theorem"],
    strategy: "Divide-and-conquer",
    source: "Levitin §5.4 · Lecture 5",
    summary: "Multiply n-digit numbers with three half-size multiplications: M(n) = 3M(n/2) → n^1.585.",
    statement: `
<p>Split two n-digit numbers into halves, <code>x = a₁·10^m + a₀</code> and <code>y = b₁·10^m + b₀</code> with m = n/2. Then</p>
<pre>x·y = c₂·10^(2m) + c₁·10^m + c₀,   c₂ = a₁·b₁,   c₀ = a₀·b₀,   c₁ = a₁·b₀ + a₀·b₁</pre>
<p>Computing c₁ directly needs <b>four</b> half-size products, so M(n) = 4M(n/2) = n² — no better than grade school. Karatsuba's
trick gets the middle term from <b>one</b> extra product: <code>c₁ = (a₁ + a₀)(b₁ + b₀) − c₂ − c₀</code>.</p>
<p><b>Task:</b> <code>Karatsuba(x, y, n)</code> returns x·y, where x and y have at most n digits and n is a power of 2
(1, 2, 4 or 8). Recurse with <code>m = n div 2</code> and multiply directly (<code>x * y</code>) <b>only</b> in the base case
n = 1. (The sums a₁ + a₀ may carry into an extra digit — the base case handles that fine.)</p>
<p><b>Budget:</b> the grader counts calls to your algorithms. Three recursive calls per level give M(n) = 3M(n/2), M(1) = 1, i.e.
at most (3^(log₂ n + 1) − 1)/2 calls in total: 1, 4, 13, 40 for n = 1, 2, 4, 8. Four calls per level blows the budget.
Don't call helper algorithms inside the recursion — use <code>10 ^ m</code>, <code>div</code> and <code>mod</code>.</p>`,
    entry: "Karatsuba",
    params: ["x", "y", "n"],
    tests: [
      { args: [2135, 4014, 4], expect: 8569890, explain: "The lecture example: a₁ = 21, a₀ = 35, b₁ = 40, b₀ = 14 → c₂ = 840, c₀ = 490, c₁ = 56·54 − 840 − 490 = 1694." },
      { args: [7, 8, 1], expect: 56, explain: "Base case: n = 1, multiply directly (1 call)." },
      { args: [12, 34, 2], expect: 408, explain: "c₂ = 1·3 = 3, c₀ = 2·4 = 8, c₁ = 3·7 − 3 − 8 = 10 → 300 + 100 + 8." },
      { args: [1234, 5678, 4], expect: 7006652 },
      { args: [0, 12345678, 8], expect: 0 },
      { args: [5, 1234, 4], expect: 6170, explain: "Fewer digits than n is fine: a₁ = 0." },
      { args: [99, 99, 2], expect: 9801, explain: "a₁ + a₀ = 18 has two digits — the n = 1 base case still just multiplies." },
      { args: [94000000, 93999999, 8], expect: 94000000 * 93999999 },
      { args: [10, 10, 2], expect: 100 },
    ],
    random: {
      count: 25,
      gen: (r, i) => { const n = [1, 2, 4, 8][i % 4], hi = n === 8 ? 94000000 : Math.pow(10, n) - 1; return [r.int(0, hi), r.int(0, hi), n]; },
    },
    reference: (x, y) => x * y,
    budget: { metric: "calls", label: "algorithm calls", limit: (x, y, n) => kCalls(n), hint: "Too many calls: you are making FOUR recursive multiplications per level (M(n) = 4M(n/2) = n²). Compute c₂ and c₀, then get the middle term from ONE more product: (a₁ + a₀)(b₁ + b₀) − c₂ − c₀." },
    mutants: [
      { fn: (x, y, n) => kMut(x, y, n, "noSubtract"), hint: "Your middle term is too big: (a₁ + a₀)(b₁ + b₀) = c₂ + c₁ + c₀, so subtract c₂ and c₀ to get c₁." },
      { fn: (x, y, n) => kMut(x, y, n, "shift"), hint: "c₂ must be shifted by 10^(2m) (that's p · p), not by 10^m — it is the product of the two HIGH halves." },
    ],
    lints: [{ re: "ALGORITHM\\s+Karatsuba\\([^)]*\\)\\s*\\n(\\s*//[^\\n]*\\n)*\\s*return\\s+x\\s*\\*\\s*y", lang: "pseudo", message: "Multiply x * y only in the base case (n = 1); everywhere else, build the product from three recursive calls." }],
    hints: [
      "Expand (a₁ + a₀)(b₁ + b₀). Which two products that you ALREADY need appear in it — and what's left over?",
      "Plan: base case n = 1 → return x · y. Else m ← n div 2, p ← 10^m, split x and y with div p and mod p, make exactly three recursive calls with size m.",
      "c₂ ← Karatsuba(a₁, b₁, m); c₀ ← Karatsuba(a₀, b₀, m); c₁ ← Karatsuba(a₁ + a₀, b₁ + b₀, m) − c₂ − c₀; return c₂·p·p + c₁·p + c₀.",
    ],
    starter: {
      pseudo: `ALGORITHM Karatsuba(x, y, n)
    // x, y have at most n digits; n is a power of 2
    if n = 1 then
        return x * y
    m ← n div 2
    p ← 10 ^ m
    ...`,
      js: `function Karatsuba(x, y, n) {
  if (n === 1) return x * y;
  const m = n / 2, p = 10 ** m;
  // ...
}`,
    },
    solution: {
      pseudo: `ALGORITHM Karatsuba(x, y, n)
    if n = 1 then
        return x * y
    m ← n div 2
    p ← 10 ^ m
    a1 ← x div p
    a0 ← x mod p
    b1 ← y div p
    b0 ← y mod p
    c2 ← Karatsuba(a1, b1, m)
    c0 ← Karatsuba(a0, b0, m)
    c1 ← Karatsuba(a1 + a0, b1 + b0, m) - c2 - c0
    return c2 * p * p + c1 * p + c0`,
      js: `function Karatsuba(x, y, n) {
  if (n === 1) return x * y;
  const m = n / 2, p = 10 ** m;
  const a1 = Math.floor(x / p), a0 = x % p, b1 = Math.floor(y / p), b0 = y % p;
  const c2 = Karatsuba(a1, b1, m), c0 = Karatsuba(a0, b0, m);
  const c1 = Karatsuba(a1 + a0, b1 + b0, m) - c2 - c0;
  return c2 * p * p + c1 * p + c0;
}`,
      python: `def karatsuba(x, y, n):
    if n == 1:
        return x * y
    m = n // 2
    p = 10 ** m
    a1, a0 = divmod(x, p)
    b1, b0 = divmod(y, p)
    c2 = karatsuba(a1, b1, m)
    c0 = karatsuba(a0, b0, m)
    c1 = karatsuba(a1 + a0, b1 + b0, m) - c2 - c0
    return c2 * p * p + c1 * p + c0`,
      explain: "M(n) = 3M(n/2), M(1) = 1 gives M(n) = 3^(log₂ n) = n^(log₂ 3) ≈ n^1.585 single-digit multiplications; the extra additions satisfy A(n) = 3A(n/2) + cn, also Θ(n^1.585) by the Master Theorem (a = 3 > b^d = 2).",
    },
    distractors: ["c1 ← Karatsuba(a1, b0, m) + Karatsuba(a0, b1, m)", "return c2 * p + c1 * p + c0", "m ← n - 1"],
    followUp: "Python's int and Java's BigInteger switch to Karatsuba above ~70 machine words; Toom–Cook and Fast Fourier Transform (FFT) based methods (Schönhage–Strassen, and the 2019 Harvey–van der Hoeven O(n log n) algorithm) take over for huge numbers. Strassen's matrix trick (7 products instead of 8) is the same idea one dimension up.",
    complexity: "Θ(n^log₂3) ≈ Θ(n^1.585)",
    visual: "sims/karatsuba-strassen.html",
    lesson: "lessons/05-divide-and-conquer/README.md",
  });

  /* =====================================================================
     24. Maximum subarray by divide-and-conquer
     ===================================================================== */
  const kadane = (A) => { let best = -Infinity, cur = 0; for (const x of A) { cur = Math.max(x, cur + x); best = Math.max(best, cur); } return best; };
  function msZeroInit(A, l = 0, r = A.length - 1) {
    if (l === r) return A[l];
    const m = (l + r) >> 1;
    let s = 0, L = 0, R = 0;
    for (let i = m; i >= l; i--) { s += A[i]; L = Math.max(L, s); }
    s = 0;
    for (let j = m + 1; j <= r; j++) { s += A[j]; R = Math.max(R, s); }
    return Math.max(msZeroInit(A, l, m), msZeroInit(A, m + 1, r), L + R);
  }
  ForgeProblems.add({
    id: "max-subarray-dc",
    title: "Maximum Subarray (Divide-and-Conquer)",
    level: 2, chapter: 5, difficulty: 3,
    topics: ["divide-and-conquer", "arrays", "recurrences"],
    strategy: "Divide-and-conquer",
    source: "Interview classic · CLRS §4.1 (in the style of Levitin Ch 5)",
    summary: "Largest sum of a contiguous non-empty subarray: best of left half, right half, or crossing the middle.",
    statement: `
<p>Given daily profit/loss numbers, which <b>contiguous</b> stretch of days earned the most? Checking all Θ(n²) stretches is slow.
Divide-and-conquer: the best subarray lies entirely in the <b>left half</b>, entirely in the <b>right half</b>, or <b>crosses the
middle</b>. The first two are recursive calls; the crossing one is the best sum ending at the middle (scanning left) plus the best
sum starting just after it (scanning right) — found in linear time.</p>
<p><b>Task:</b> return the largest sum of a <b>non-empty</b> contiguous subarray of <code>A[0..n-1]</code> (n ≥ 1). If every number
is negative, the answer is the largest (least negative) single element.</p>
<p><b>Constraints:</b> 1 ≤ n ≤ 60 in the tests. Your algorithm must run in O(n log n) steps — the Θ(n²) "try every start and end"
approach is flagged as too slow.</p>`,
    entry: "MaxSubarray",
    params: ["A"],
    tests: [
      { args: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expect: 6, explain: "The subarray 4, −1, 2, 1 — it crosses the middle of the array." },
      { args: [[5]], expect: 5 },
      { args: [[-3]], expect: -3, explain: "Non-empty: you must take at least one element, even a negative one." },
      { args: [[-5, -2, -7]], expect: -2, explain: "All negative: the best is the single largest element." },
      { args: [[1, 2, 3]], expect: 6, explain: "All positive: take everything." },
      { args: [[2, -1, 2]], expect: 3, explain: "Worth paying the −1 to join both 2s." },
      { args: [[3, -5, 4]], expect: 4 },
      { args: [[-1, 3, -1, 3, -1]], expect: 5 },
      { args: [[-4, -1]], expect: -1, explain: "Two negatives: a crossing sum would be −5, a single element −1 is better." },
    ],
    random: { count: 25, gen: (r, i) => [r.array(1 + (i % 30) * 2, i % 5 === 0 ? -30 : -20, i % 5 === 0 ? -1 : 20)] },
    reference: kadane,
    growth: { metric: "steps", sizes: [32, 64, 128, 256, 512], gen: (r, n) => [r.array(n, -50, 50)], expect: "n log n" },
    mutants: [
      { fn: (A) => msZeroInit(A), hint: "All-negative arrays come out as 0. The crossing sum must use at least one element on EACH side: start leftMax and rightMax at −∞, not 0 (0 means 'take nothing')." },
      { fn: (A) => Math.max(...A), hint: "You return the largest single element — the crossing case is missing. After the two recursive calls, also compute the best sum that crosses the middle (best suffix of the left half + best prefix of the right half)." },
      { fn: (A) => { const pos = A.filter((x) => x > 0); return pos.length ? pos.reduce((a, b) => a + b, 0) : Math.max(...A); }, hint: "You add up all the positive numbers, but the subarray must be CONTIGUOUS — you can't skip the negatives in between." },
    ],
    hints: [
      "Cut the array at the middle m. Where can the best subarray be relative to m? Which of those cases is not a smaller copy of the same problem?",
      "Recursive Best(A, l, r): base case l = r → A[l]. Otherwise take the max of Best(l, m), Best(m + 1, r) and the best crossing sum.",
      "Crossing sum: s ← 0, leftMax ← −∞; for i ← m downto l: s ← s + A[i], leftMax ← max(leftMax, s). Same rightward from m + 1 to r. Crossing = leftMax + rightMax.",
    ],
    starter: {
      pseudo: `ALGORITHM MaxSubarray(A[0..n-1])
    return Best(A, 0, n - 1)

ALGORITHM Best(A, l, r)
    if l = r then
        return A[l]
    m ← ⌊(l + r) / 2⌋
    ...`,
      js: `function MaxSubarray(A) {
  // divide-and-conquer, O(n log n)
}`,
    },
    solution: {
      pseudo: `ALGORITHM MaxSubarray(A[0..n-1])
    return Best(A, 0, n - 1)

ALGORITHM Best(A, l, r)
    if l = r then
        return A[l]
    m ← ⌊(l + r) / 2⌋
    s ← 0
    leftMax ← -∞
    for i ← m downto l do
        s ← s + A[i]
        leftMax ← max(leftMax, s)
    s ← 0
    rightMax ← -∞
    for j ← m + 1 to r do
        s ← s + A[j]
        rightMax ← max(rightMax, s)
    return max(Best(A, l, m), Best(A, m + 1, r), leftMax + rightMax)`,
      js: `function MaxSubarray(A) {
  function best(l, r) {
    if (l === r) return A[l];
    const m = Math.floor((l + r) / 2);
    let s = 0, leftMax = -Infinity, rightMax = -Infinity;
    for (let i = m; i >= l; i--) { s += A[i]; leftMax = Math.max(leftMax, s); }
    s = 0;
    for (let j = m + 1; j <= r; j++) { s += A[j]; rightMax = Math.max(rightMax, s); }
    return Math.max(best(l, m), best(m + 1, r), leftMax + rightMax);
  }
  return best(0, A.length - 1);
}`,
      python: `def max_subarray(A):
    def best(l, r):
        if l == r:
            return A[l]
        m = (l + r) // 2
        s, left_max = 0, float("-inf")
        for i in range(m, l - 1, -1):
            s += A[i]; left_max = max(left_max, s)
        s, right_max = 0, float("-inf")
        for j in range(m + 1, r + 1):
            s += A[j]; right_max = max(right_max, s)
        return max(best(l, m), best(m + 1, r), left_max + right_max)
    return best(0, len(A) - 1)`,
      explain: "The crossing scan touches each element of A[l..r] once, so T(n) = 2T(n/2) + Θ(n) ∈ Θ(n log n) by the Master Theorem (a = 2, b = 2, d = 1) — like mergesort, and much better than the Θ(n²) brute force.",
    },
    distractors: ["leftMax ← 0", "return max(Best(A, l, m), Best(A, m + 1, r))", "for i ← l to m do"],
    followUp: "Kadane's algorithm solves it in Θ(n) with one scan (best sum ending here = max(A[i], previous + A[i])) — a classic example where dynamic programming beats divide-and-conquer. The D&C version still wins in parallel settings and extends to segment trees that answer 'max subarray in A[l..r]' queries in O(log n).",
    complexity: "Θ(n log n)",
    lesson: "lessons/05-divide-and-conquer/README.md",
  });

  /* =====================================================================
     25. Midterm: T(n) = T(n/2) + log n — implement and count
     ===================================================================== */
  const hWork = (n) => (n === 1 ? 1 : hWork(Math.floor(n / 2)) + Math.floor(Math.log2(n)));
  ForgeProblems.add({
    id: "midterm-recurrence-log",
    title: "Professor H's Algorithm: T(n) = T(n/2) + log n",
    level: 2, chapter: 4, difficulty: 2,
    topics: ["recurrences", "backward substitution", "decrease-by-a-constant-factor", "counting operations"],
    strategy: "Decrease-by-half (analysis)",
    source: "CSC 501 Midterm 1, Q4 (adapted)",
    summary: "Implement a decrease-by-half algorithm whose combine step costs ⌊log₂ n⌋, and count its total work.",
    statement: `
<p>Professor H's decrease-and-conquer algorithm reduces a problem of size n to one of size ⌊n/2⌋, solves that recursively, and
spends <b>⌊log₂ n⌋</b> time units on the decrease and combine steps together. Size 1 is solved in 1 unit. So its running time is</p>
<pre>T(1) = 1,    T(n) = T(⌊n/2⌋) + ⌊log₂ n⌋   for n &gt; 1</pre>
<p><b>Task:</b> implement the algorithm's <i>skeleton</i> and <b>count</b> its work: <code>HWork(n)</code> returns T(n). Model the
⌊log₂ n⌋ combine step honestly as a loop that repeatedly halves a copy of n until it reaches 1, counting one unit per halving —
the built-in <code>log2</code> is not allowed.</p>
<p>Then check your counts against the backward-substitution answer: for n = 2^k, T(n) = 1 + (1 + 2 + … + k) = 1 + k(k + 1)/2,
so T(n) ∈ Θ(log² n).</p>
<p><b>Constraints:</b> 1 ≤ n ≤ 10⁶.</p>`,
    entry: "HWork",
    params: ["n"],
    tests: [
      { args: [8], expect: 7, explain: "T(8) = T(4) + 3 = T(2) + 2 + 3 = T(1) + 1 + 2 + 3 = 7 = 1 + 3·4/2." },
      { args: [1], expect: 1, explain: "Base case: 1 unit." },
      { args: [1024], expect: 56, explain: "k = 10: 1 + 10·11/2 = 56." },
      { args: [2], expect: 2 },
      { args: [10], expect: 7, explain: "Not a power of 2: T(10) = T(5) + 3 = T(2) + 2 + 3 = 7." },
      { args: [3], expect: 2, explain: "⌊log₂ 3⌋ = 1, so T(3) = T(1) + 1." },
      { args: [1000], expect: hWork(1000) },
      { args: [1000000], expect: hWork(1000000) },
    ],
    random: { count: 25, gen: (r, i) => [r.int(1, i < 12 ? 64 : 1000000)] },
    reference: hWork,
    forbid: ["log2", "lg", "log", "ln"],
    mutants: [
      { fn: (n) => hWork(n) - 1, hint: "Every answer is 1 too small — check the base case: solving size 1 costs 1 unit, T(1) = 1." },
      { fn: (n) => { const f = (k) => (k === 1 ? 1 : f(Math.floor(k / 2)) + Math.floor(Math.log2(k)) + 1); return f(n); }, hint: "Your combine step counts one unit too many at every level (⌊log₂ n⌋ + 1). Halve while the copy is > 1 — for n = 2 that is exactly one halving." },
      { fn: (n) => { let t = 1; for (let j = 1, lo = 2; lo <= n; j++, lo *= 2) t += j * (Math.min(n, 2 * lo - 1) - lo + 1); return t; }, hint: "You recurse on n − 1 (decrease by one) instead of ⌊n/2⌋ (decrease by half). That sums log k over ALL k ≤ n — Θ(n log n) instead of Θ(log² n)." },
    ],
    hints: [
      "Write T(8) out by backward substitution: T(8) = T(4) + 3 = … Which sizes does the recursion visit, and how much does each level cost?",
      "HWork(n): if n = 1 return 1. Otherwise count the combine cost c = ⌊log₂ n⌋ with a halving loop, then return HWork(n div 2) + c.",
      "Halving loop: c ← 0; t ← n; while t > 1 do t ← t div 2; c ← c + 1. For n = 8 this gives c = 3.",
    ],
    starter: {
      pseudo: `ALGORITHM HWork(n)
    // Returns T(n), where T(1) = 1 and T(n) = T(⌊n/2⌋) + ⌊log2 n⌋
    if n = 1 then
        return 1
    ...`,
      js: `function HWork(n) {
  if (n === 1) return 1;
  // ...
}`,
    },
    solution: {
      pseudo: `ALGORITHM HWork(n)
    if n = 1 then
        return 1
    c ← 0
    t ← n
    while t > 1 do
        t ← t div 2
        c ← c + 1
    return HWork(n div 2) + c`,
      js: `function HWork(n) {
  if (n === 1) return 1;
  let c = 0;
  for (let t = n; t > 1; t = Math.floor(t / 2)) c++;
  return HWork(Math.floor(n / 2)) + c;
}`,
      python: `def h_work(n):
    if n == 1:
        return 1
    c, t = 0, n
    while t > 1:
        t //= 2
        c += 1
    return h_work(n // 2) + c`,
      explain: "Backward substitution for n = 2^k: T(2^k) = T(2^(k−1)) + k = T(2^(k−2)) + (k − 1) + k = … = T(1) + 1 + 2 + … + k = 1 + k(k + 1)/2. With k = log₂ n this is Θ(log² n). (The Master Theorem does not apply directly, since f(n) = log n is not n^d.)",
    },
    distractors: ["while t ≥ 1 do", "return HWork(n - 1) + c", "return 0"],
    followUp: "The same backward-substitution pattern solves T(n) = 2T(n/2) + n log n = Θ(n log² n) (the lecture's interview question). Senior habit: when a recurrence falls outside the Master Theorem, write out 3 levels, spot the sum, and verify empirically — exactly what this counter does.",
    complexity: "T(n) ∈ Θ(log² n)",
    visual: "sims/recurrence-lab.html",
    lesson: "lessons/04-decrease-and-conquer/README.md",
  });
})();
