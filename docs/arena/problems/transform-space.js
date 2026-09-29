/* Pack D — Transform-and-Conquer & Space-Time Trade-offs (level 3, Levitin Ch 6–7).
   Presorting, Gaussian elimination, balanced trees, heaps/heapsort, Horner & binary exponentiation,
   problem reduction, counting sorts, Horspool/KMP string matching, hashing.
   Format: ../PROBLEM_FORMAT.md · validate with: node tools/validate-problems.mjs transform-space.js */

(function () {
"use strict";

/* ---------- small JS helpers shared by the oracles/mutants in this file ---------- */
const TS = {
  asc: (A) => A.slice().sort((x, y) => x - y),
  gcd: (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; },
  // bottom-up heap construction on a 0-based copy (Levitin §6.4, HeapBottomUp)
  heapify: (H) => {
    const n = H.length;
    for (let i = Math.floor(n / 2); i >= 1; i--) {
      let k = i; const v = H[k - 1]; let heap = false;
      while (!heap && 2 * k <= n) {
        let j = 2 * k;
        if (j < n && H[j - 1] < H[j]) j++;
        if (v >= H[j - 1]) heap = true; else { H[k - 1] = H[j - 1]; k = j; }
      }
      H[k - 1] = v;
    }
    return H;
  },
  isHeap: (H) => { for (let i = 1; i < H.length; i++) if (H[Math.floor((i - 1) / 2)] < H[i]) return false; return true; },
  // Horspool comparisons count + result (Levitin §7.2)
  horspool: (P, T) => {
    const m = P.length, n = T.length, tab = {};
    for (let j = 0; j < m - 1; j++) tab[P[j]] = m - 1 - j;
    let i = m - 1, cmp = 0;
    while (i <= n - 1) {
      let k = 0;
      while (k <= m - 1) { cmp++; if (P[m - 1 - k] === T[i - k]) k++; else break; }
      if (k === m) return { idx: i - m + 1, cmp };
      i += tab[T[i]] !== undefined ? tab[T[i]] : m;
    }
    return { idx: -1, cmp };
  },
  lps: (P) => {
    const m = P.length, L = Array(m).fill(0); let len = 0, i = 1;
    while (i < m) {
      if (P[i] === P[len]) { len++; L[i] = len; i++; }
      else if (len > 0) len = L[len - 1];
      else { L[i] = 0; i++; }
    }
    return L;
  },
  // a random AVL-shaped binary search tree over keys lo..hi (balanced by construction)
  balanced: (keys, lo = 0, hi = keys.length - 1) => {
    if (lo > hi) return null;
    const mid = Math.floor((lo + hi + 1) / 2);
    return { key: keys[mid], left: TS.balanced(keys, lo, mid - 1), right: TS.balanced(keys, mid + 1, hi) };
  },
  bstInsert: (t, k) => { if (!t) return { key: k, left: null, right: null }; if (k < t.key) t.left = TS.bstInsert(t.left, k); else t.right = TS.bstInsert(t.right, k); return t; },
  height: (t) => (t ? 1 + Math.max(TS.height(t.left), TS.height(t.right)) : -1),
  matMul: (X, Y) => X.map((row, i) => Y[0].map((_, j) => row.reduce((s, x, k) => s + x * Y[k][j], 0))),
  // Gaussian elimination with partial pivoting (Levitin §6.2). opt flags model common mistakes.
  gauss: (A, b, opt = {}) => {
    const n = A.length; A = A.map((r) => r.slice()); b = b.slice();
    for (let i = 0; i < n - 1; i++) {
      if (opt.pivot !== false) { let p = i; for (let j = i + 1; j < n; j++) if (Math.abs(A[j][i]) > Math.abs(A[p][i])) p = j; [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]]; }
      for (let j = i + 1; j < n; j++) {
        if (opt.staleMult) { for (let k = i; k < n; k++) A[j][k] -= (A[i][k] * A[j][i]) / A[i][i]; b[j] -= (b[i] * A[j][i]) / A[i][i]; continue; }
        const t = A[j][i] / A[i][i];
        for (let k = i; k < n; k++) A[j][k] -= A[i][k] * t;
        if (!opt.skipB) b[j] -= b[i] * t;
      }
    }
    const x = Array(n).fill(0);
    for (let j = n - 1; j >= 0; j--) { let t = 0; for (let k = j + 1; k < n; k++) t += A[j][k] * x[k]; x[j] = opt.noDiv ? b[j] - t : (b[j] - t) / A[j][j]; }
    return x;
  },
  det: (A, opt = {}) => {
    const n = A.length; A = A.map((r) => r.slice()); let d = 1;
    if (opt.origDiag) return A.reduce((s, row, i) => s * row[i], 1);
    for (let i = 0; i < n; i++) {
      let p = i; for (let j = i + 1; j < n; j++) if (Math.abs(A[j][i]) > Math.abs(A[p][i])) p = j;
      if (Math.abs(A[p][i]) < 1e-9) return 0;
      if (p !== i) { [A[i], A[p]] = [A[p], A[i]]; if (!opt.noFlip) d = -d; }
      if (opt.normalize) { const piv = A[i][i]; for (let k = i; k < n; k++) A[i][k] /= piv; }
      d *= A[i][i];
      for (let j = i + 1; j < n; j++) { const t = A[j][i] / A[i][i]; for (let k = i; k < n; k++) A[j][k] -= A[i][k] * t; }
    }
    return d;
  },
};

/* =====================================================================
   §6.1 Presorting
   ===================================================================== */

ForgeProblems.add({
  id: "presort-uniqueness",
  title: "Element Uniqueness by Presorting",
  level: 3, chapter: 6, difficulty: 1,
  topics: ["presorting", "transform-and-conquer", "arrays"],
  strategy: "Instance simplification (presort)",
  source: "Levitin §6.1, Example 1",
  summary: "Are all elements distinct? Sort first, then only neighbors can be equal.",
  statement: `
<p>Checking that every value in a list is different is everywhere in real code: unique usernames, no double-booked seats,
no repeated transaction ids. Brute force compares every pair — about n²/2 comparisons. <b>Presorting</b> turns the
problem into an easier instance of itself: once the array is sorted, equal values must sit <i>next to each other</i>.</p>
<p>Write <code>PresortUniqueness(A[0..n-1])</code> that returns <code>true</code> if all elements of <code>A</code> are
distinct and <code>false</code> otherwise. An empty or one-element array is all-distinct.</p>
<p><b>Efficiency:</b> the grader checks that your algorithm is <b>Θ(n log n)</b> or better. You may call the built-in
<code>sorted(A)</code> (it returns a sorted copy and stands in for mergesort), or write your own n log n sort.</p>`,
  entry: "PresortUniqueness",
  params: ["A"],
  tests: [
    { args: [[3, 1, 4, 1, 5]], expect: false, explain: "The two 1s are not neighbors in the input — but they will be after sorting." },
    { args: [[7, 2, 9, 4]], expect: true, explain: "Four different values." },
    { args: [[1, 2, 3, 4, 5, 5]], expect: false, explain: "The duplicate pair is the very last pair — don't stop one step early." },
    { args: [[]], expect: true, explain: "Nothing can repeat in an empty list." },
    { args: [[42]], expect: true },
    { args: [[2, 2]], expect: false },
    { args: [[-3, 0, 3, -3]], expect: false },
    { args: [[10, 20, 30, 40, 50, 60]], expect: true },
  ],
  random: {
    count: 25,
    gen: (r, i) => (i % 2 ? [r.distinct(1 + i, -100, 100)] : [r.array(1 + i, 0, 3 * (i + 1))]),
  },
  reference: (A) => new Set(A).size === A.length,
  growth: { metric: "steps", sizes: [32, 64, 128, 256, 512], gen: (r, n) => [r.distinct(n, 0, 100000)], expect: "n log n" },
  mutants: [
    { fn: (A) => { for (let i = 0; i + 1 < A.length; i++) if (A[i] === A[i + 1]) return false; return true; }, hint: "You compare neighbors in the ORIGINAL order. In [3, 1, 4, 1, 5] the two 1s aren't neighbors — sort the array first, then check neighbors." },
    { fn: (A) => { const B = TS.asc(A); for (let i = 0; i < B.length - 2; i++) if (B[i] === B[i + 1]) return false; return true; }, hint: "The last pair of neighbors (B[n−2], B[n−1]) is never checked. Look at your loop's upper bound: i must reach n − 2." },
    { fn: (A) => new Set(A).size !== A.length, hint: "Your answers are exactly flipped. The question is 'are ALL elements distinct?' — return false as soon as you see an equal pair, and true only after checking every pair." },
  ],
  hints: [
    "If the array were sorted, where would two equal values have to be relative to each other?",
    "Two stages: (1) B ← a sorted copy of A; (2) one left-to-right scan over neighboring pairs of B.",
    "for i ← 0 to n − 2: if B[i] = B[i + 1] then return false. If the loop finishes, return true.",
  ],
  starter: {
    pseudo: `ALGORITHM PresortUniqueness(A[0..n-1])
    // Input: array A of n numbers
    // Output: true if all elements are distinct, false otherwise
    B ← sorted(A)
    for i ← ... do
        ...
    return true`,
    js: `function PresortUniqueness(A) {
  const B = [...A].sort((x, y) => x - y);
  // scan neighbors of B
}`,
  },
  solution: {
    pseudo: `ALGORITHM PresortUniqueness(A[0..n-1])
    B ← sorted(A)
    for i ← 0 to n - 2 do
        if B[i] = B[i + 1] then
            return false
    return true`,
    js: `function PresortUniqueness(A) {
  const B = [...A].sort((x, y) => x - y);
  for (let i = 0; i + 1 < B.length; i++) if (B[i] === B[i + 1]) return false;
  return true;
}`,
    python: `def presort_uniqueness(A):
    B = sorted(A)
    for i in range(len(B) - 1):
        if B[i] == B[i + 1]:
            return False
    return True`,
    explain: "T(n) = T_sort(n) + T_scan(n) = Θ(n log n) + Θ(n) = Θ(n log n): the sort dominates, and the scan makes at most n − 1 comparisons. Brute force needs n(n − 1)/2 comparisons in the worst case, so presorting wins as soon as the sort is n log n.",
  },
  distractors: ["for i ← 0 to n - 1 do", "if A[i] = A[i + 1] then", "return false"],
  followUp: "Hashing answers the same question in expected Θ(n) time (Levitin Exercise 7.3.7). In the comparison model Ω(n log n) is a proven lower bound for element distinctness — so presorting is optimal when you can only compare.",
  complexity: "Θ(n log n) (sort) + Θ(n) (scan)",
  visual: "sims/sorting-studio.html",
  lesson: "lessons/06-transform-and-conquer/README.md",
});

ForgeProblems.add({
  id: "closest-pair-1d-presort",
  title: "Closest Two Numbers (Presort)",
  level: 3, chapter: 6, difficulty: 1,
  topics: ["presorting", "transform-and-conquer", "closest pair"],
  strategy: "Instance simplification (presort)",
  source: "Levitin Exercise 6.1.1 (adapted)",
  summary: "Smallest |x − y| over all pairs — after sorting, only neighbors can be closest.",
  statement: `
<p>This is the one-dimensional closest-pair problem: think of sensor readings, prices or timestamps on a line, and you want
the two that are nearest to each other. Brute force checks all n(n − 1)/2 pairs. After <b>presorting</b>, the closest pair
must be two <i>neighbors</i> in sorted order.</p>
<p>Write <code>ClosestGap(A[0..n-1])</code> (n ≥ 2) that returns the smallest distance <code>|A[i] − A[j]|</code> over all
pairs <code>i ≠ j</code>.</p>
<p><b>Efficiency:</b> must be <b>Θ(n log n)</b> or better. You may use <code>sorted(A)</code>.</p>`,
  entry: "ClosestGap",
  params: ["A"],
  tests: [
    { args: [[15, 3, 9, 20, 1]], expect: 2, explain: "Sorted: 1, 3, 9, 15, 20 — the gaps are 2, 6, 6, 5, so the answer is 2 (1 and 3)." },
    { args: [[30, 12, 0, 29]], expect: 1, explain: "29 and 30 are far apart in the input but neighbors after sorting." },
    { args: [[1, 10, 20, 21]], expect: 1, explain: "The closest pair is the LAST pair of neighbors." },
    { args: [[8, 1]], expect: 7 },
    { args: [[5, 5, 2]], expect: 0, explain: "Equal values are at distance 0." },
    { args: [[-7, 4, -1, 10]], expect: 5 },
  ],
  random: { count: 25, gen: (r, i) => [r.array(2 + i, -200, 200)] },
  reference: (A) => { const B = TS.asc(A); let d = Infinity; for (let i = 0; i + 1 < B.length; i++) d = Math.min(d, B[i + 1] - B[i]); return d; },
  growth: { metric: "steps", sizes: [32, 64, 128, 256, 512], gen: (r, n) => [r.distinct(n, 0, 1000000)], expect: "n log n" },
  mutants: [
    { fn: (A) => { let d = Infinity; for (let i = 0; i + 1 < A.length; i++) d = Math.min(d, Math.abs(A[i + 1] - A[i])); return d; }, hint: "You only compare neighbors in the ORIGINAL order. Neighbors are only guaranteed to hold the closest pair after sorting — sort first." },
    { fn: (A) => { const B = TS.asc(A); let d = Infinity; for (let i = 0; i < B.length - 2; i++) d = Math.min(d, B[i + 1] - B[i]); return d; }, hint: "The last pair of neighbors is never looked at. Your loop over gaps must go up to i = n − 2 (the gap between B[n−2] and B[n−1])." },
    { fn: (A) => 0, hint: "You always return 0 — did you start your running minimum at 0? A minimum must start at ∞ (or at the first gap), otherwise nothing can ever be smaller." },
  ],
  hints: [
    "Imagine the numbers as dots on a number line. Can the closest pair ever have another dot between them?",
    "Sort a copy B of A, then the answer is the smallest of the n − 1 neighbor gaps B[i + 1] − B[i].",
    "d ← ∞; for i ← 0 to n − 2: if B[i + 1] − B[i] < d then d ← B[i + 1] − B[i]. Return d.",
  ],
  starter: {
    pseudo: `ALGORITHM ClosestGap(A[0..n-1])
    // Input: array A of n ≥ 2 numbers
    // Output: the smallest |A[i] − A[j]| over all pairs i ≠ j
    B ← sorted(A)
    d ← ...
    ...
    return d`,
    js: `function ClosestGap(A) {
  // return the smallest distance between two elements
}`,
  },
  solution: {
    pseudo: `ALGORITHM ClosestGap(A[0..n-1])
    B ← sorted(A)
    d ← ∞
    for i ← 0 to n - 2 do
        if B[i + 1] - B[i] < d then
            d ← B[i + 1] - B[i]
    return d`,
    js: `function ClosestGap(A) {
  const B = [...A].sort((x, y) => x - y);
  let d = Infinity;
  for (let i = 0; i + 1 < B.length; i++) d = Math.min(d, B[i + 1] - B[i]);
  return d;
}`,
    python: `def closest_gap(A):
    B = sorted(A)
    return min(B[i + 1] - B[i] for i in range(len(B) - 1))`,
    explain: "If x < y are the closest pair and some z lay strictly between them, |x − z| would be smaller — contradiction; so the closest pair are sorted neighbors. Sorting is Θ(n log n) and the scan is n − 1 subtractions, so the total is Θ(n log n) versus Θ(n²) for brute force.",
  },
  distractors: ["d ← 0", "for i ← 0 to n - 1 do", "if |A[i + 1] - A[i]| < d then"],
  followUp: "In 2-D the same 'only nearby points matter' insight becomes the divide-and-conquer closest-pair algorithm with a presorted strip (Levitin §5.5). In production you'd use this pattern to find the tightest gap between scheduled events or duplicate-ish sensor readings.",
  complexity: "Θ(n log n)",
  visual: "sims/sorting-studio.html",
  lesson: "lessons/06-transform-and-conquer/README.md",
});

ForgeProblems.add({
  id: "presort-mode",
  title: "Mode by Presorting",
  level: 3, chapter: 6, difficulty: 2,
  topics: ["presorting", "transform-and-conquer", "runs"],
  strategy: "Instance simplification (presort)",
  source: "Levitin §6.1, Example 2",
  summary: "Find the most frequent value: sort, then find the longest run of equal neighbors.",
  statement: `
<p>A <b>mode</b> is a value that occurs most often in a list — the most common error code, the busiest hour, the favorite
product. After <b>presorting</b>, equal values form <i>runs</i> of neighbors, so the mode is the value of the longest run.</p>
<p>Write <code>PresortMode(A[0..n-1])</code> (n ≥ 1) that returns the mode. If several values tie for the highest
frequency, return the <b>smallest</b> of them (a left-to-right scan of the sorted array that only replaces the best on a
strictly longer run does this automatically).</p>
<p><b>Efficiency:</b> must be <b>Θ(n log n)</b> or better — the brute-force "frequency list" approach is Θ(n²).
You may use <code>sorted(A)</code>.</p>`,
  entry: "PresortMode",
  params: ["A"],
  tests: [
    { args: [[4, 1, 4, 8, 6, 4, 8]], expect: 4, explain: "Sorted: 1, 4, 4, 4, 6, 8, 8 — the run of 4s has length 3." },
    { args: [[1, 2, 3, 3, 3]], expect: 3, explain: "The longest run is the LAST one — make sure it gets compared too." },
    { args: [[2, 7, 2, 7]], expect: 2, explain: "2 and 7 both appear twice; the smaller one wins the tie." },
    { args: [[3]], expect: 3 },
    { args: [[9, 1, 9, 1, 1]], expect: 1 },
    { args: [[6, 5, 4, 3]], expect: 3, explain: "All distinct: every value ties with frequency 1, so the smallest wins." },
    { args: [[-2, -2, 5, 5, 5, -2, -2]], expect: -2 },
  ],
  random: { count: 25, gen: (r, i) => [r.array(1 + i, 0, 3 + (i % 8))] },
  reference: (A) => { const c = new Map(); A.forEach((x) => c.set(x, (c.get(x) || 0) + 1)); let best = null, bf = 0; for (const [v, f] of c) if (f > bf || (f === bf && v < best)) { best = v; bf = f; } return best; },
  growth: { metric: "steps", sizes: [32, 64, 128, 256, 512], gen: (r, n) => [r.distinct(n, 0, 100000)], expect: "n log n" },
  mutants: [
    { fn: (A) => { const B = TS.asc(A); let mode = B[0], best = 0, run = 1; for (let i = 1; i < B.length; i++) { if (B[i] === B[i - 1]) run++; else { if (run > best) { best = run; mode = B[i - 1]; } run = 1; } } return mode; }, hint: "The final run is never compared with the best so far — you only check a run when the value CHANGES, and the last run never sees a change. Check once more after the loop (or scan run-by-run as in Levitin's PresortMode)." },
    { fn: (A) => { const B = TS.asc(A); let mode = B[0], best = 0, i = 0; while (i < B.length) { let len = 1; while (i + len < B.length && B[i + len] === B[i]) len++; if (len >= best) { best = len; mode = B[i]; } i += len; } return mode; }, hint: "On ties you return the LARGEST value. Replace the best only when a run is strictly longer (>), not ≥." },
    { fn: (A) => { const B = TS.asc(A); let best = 0, i = 0; while (i < B.length) { let len = 1; while (i + len < B.length && B[i + len] === B[i]) len++; if (len > best) best = len; i += len; } return best; }, hint: "You're returning how OFTEN the mode occurs, not the mode itself. Remember the run's value along with its length." },
  ],
  hints: [
    "After sorting, all copies of a value are consecutive. What does 'most frequent' become in terms of these blocks?",
    "Scan the sorted array run by run: from index i, extend a run length while B[i + len] = B[i]; compare the run length with the best so far; jump i ← i + len.",
    "Keep two variables, modefrequency and modevalue. Update both only when runlength > modefrequency (strictly) — that keeps the smallest value on ties.",
  ],
  starter: {
    pseudo: `ALGORITHM PresortMode(A[0..n-1])
    // Output: the most frequent value (smallest one on ties)
    B ← sorted(A)
    i ← 0
    modefrequency ← 0
    while i ≤ n - 1 do
        ...
    return modevalue`,
    js: `function PresortMode(A) {
  const B = [...A].sort((x, y) => x - y);
  // scan runs of equal values
}`,
  },
  solution: {
    pseudo: `ALGORITHM PresortMode(A[0..n-1])
    B ← sorted(A)
    i ← 0
    modefrequency ← 0
    while i ≤ n - 1 do
        runlength ← 1
        runvalue ← B[i]
        while i + runlength ≤ n - 1 and B[i + runlength] = runvalue do
            runlength ← runlength + 1
        if runlength > modefrequency then
            modefrequency ← runlength
            modevalue ← runvalue
        i ← i + runlength
    return modevalue`,
    js: `function PresortMode(A) {
  const B = [...A].sort((x, y) => x - y);
  let i = 0, best = 0, mode;
  while (i < B.length) {
    let len = 1;
    while (i + len < B.length && B[i + len] === B[i]) len++;
    if (len > best) { best = len; mode = B[i]; }
    i += len;
  }
  return mode;
}`,
    python: `def presort_mode(A):
    B = sorted(A)
    i, best, mode = 0, 0, None
    while i < len(B):
        run = 1
        while i + run < len(B) and B[i + run] == B[i]:
            run += 1
        if run > best:
            best, mode = run, B[i]
        i += run
    return mode`,
    explain: "Every index is visited once by the inner loop (i jumps past each run), so the scan is Θ(n) and the whole algorithm is dominated by the Θ(n log n) sort — better than the Θ(n²) brute-force frequency list, whose worst case is an all-distinct input.",
  },
  distractors: ["if runlength ≥ modefrequency then", "i ← i + 1", "return modefrequency"],
  followUp: "With a hash map of counts the mode takes expected Θ(n) time; in streaming systems with too many distinct values to store, engineers switch to approximate heavy-hitter sketches (Misra–Gries, Count-Min).",
  complexity: "Θ(n log n)",
  visual: "sims/sorting-studio.html",
  lesson: "lessons/06-transform-and-conquer/README.md",
});

ForgeProblems.add({
  id: "pairs-sum-multiple-60",
  title: "Pairs Summing to a Multiple of 60",
  level: 3, chapter: 6, difficulty: 2,
  topics: ["counting", "remainders", "space-time tradeoff", "interview"],
  strategy: "Representation change (count remainders)",
  source: "CSC 501 Lecture 6 interview problem",
  summary: "Count pairs i < j with (A[i] + A[j]) mod 60 = 0 — in linear time.",
  statement: `
<p>A playlist has songs of lengths <code>A[0..n-1]</code> seconds. How many <b>pairs</b> of songs <code>i &lt; j</code> have a
total length that is a whole number of minutes, i.e. <code>(A[i] + A[j]) mod 60 = 0</code>?</p>
<p>Brute force tests all n(n − 1)/2 pairs — Θ(n²). Your algorithm must be <b>linear, Θ(n)</b>; the grader measures how
your step count grows.</p>
<p><b>Input:</b> positive integers. <b>Output:</b> the number of such pairs.</p>`,
  entry: "CountPairs60",
  params: ["A"],
  tests: [
    { args: [[40, 20, 90, 30, 100]], expect: 3, explain: "40 + 20 = 60, 20 + 100 = 120 and 90 + 30 = 120." },
    { args: [[60, 60, 60]], expect: 3, explain: "Remainder 0 pairs with remainder 0: any 2 of the 3 songs → C(3, 2) = 3. A song can't pair with itself." },
    { args: [[30, 90, 150]], expect: 3, explain: "Remainder 30 pairs with remainder 30 — the other self-matching remainder." },
    { args: [[1, 2, 3]], expect: 0 },
    { args: [[59, 1, 61, 119]], expect: 4, explain: "Remainders 59, 1, 1, 59: each 1 pairs with each 59." },
    { args: [[45]], expect: 0 },
    { args: [[120, 15, 45, 30, 30]], expect: 2 },
    { args: [[60, 180, 7, 53, 30]], expect: 2 },
  ],
  random: { count: 25, gen: (r, i) => [r.array(1 + 2 * i, 1, i % 3 ? 500 : 120).map((x) => (i % 4 === 0 ? 30 * Math.ceil(x / 30) : x))] },
  reference: (A) => { let c = 0; for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) if ((A[i] + A[j]) % 60 === 0) c++; return c; },
  growth: { metric: "steps", sizes: [32, 64, 128, 256, 512], gen: (r, n) => [r.array(n, 1, 500)], expect: "n" },
  mutants: [
    { fn: (A) => { const c = Array(60).fill(0); A.forEach((x) => c[x % 60]++); let s = 0; for (let r = 0; r < 60; r++) s += c[r] * c[(60 - r) % 60]; return s / 2; }, hint: "Summing cnt[r] × cnt[60 − r] and halving is right for r ≠ 0, 30, but remainders 0 and 30 pair with THEMSELVES: there you need C(c, 2) = c(c − 1)/2 pairs, not c²/2." },
    { fn: (A) => { const c = Array(60).fill(0); let s = 0; A.forEach((x) => { c[x % 60]++; s += c[(60 - (x % 60)) % 60]; }); return s; }, hint: "You add the current song to the counts BEFORE looking up its partner, so a song with remainder 0 or 30 gets paired with itself. Look up first, then record." },
    { fn: (A) => { const c = Array(61).fill(0); let s = 0; A.forEach((x) => { const r = x % 60; s += c[60 - r]; c[r]++; }); return s; }, hint: "Multiples of 60 never get paired. Their partner remainder is 60 − 0 = 60, which is not a remainder at all — take (60 − r) mod 60." },
  ],
  hints: [
    "Does the exact length matter, or only its remainder mod 60? Which remainder does a song with remainder r need as a partner?",
    "Keep an array cnt[0..59] of how many songs seen so far have each remainder. Scan the songs once; each new song pairs with every earlier song whose remainder complements its own.",
    "For each x: r ← x mod 60; count ← count + cnt[(60 − r) mod 60]; then cnt[r] ← cnt[r] + 1 (in that order).",
  ],
  starter: {
    pseudo: `ALGORITHM CountPairs60(A[0..n-1])
    // Output: number of pairs i < j with (A[i] + A[j]) mod 60 = 0, in Θ(n)
    cnt ← array(60, 0)
    count ← 0
    for i ← 0 to n - 1 do
        ...
    return count`,
    js: `function CountPairs60(A) {
  const cnt = new Array(60).fill(0);
  let count = 0;
  // one pass
  return count;
}`,
  },
  solution: {
    pseudo: `ALGORITHM CountPairs60(A[0..n-1])
    cnt ← array(60, 0)
    count ← 0
    for i ← 0 to n - 1 do
        r ← A[i] mod 60
        count ← count + cnt[(60 - r) mod 60]
        cnt[r] ← cnt[r] + 1
    return count`,
    js: `function CountPairs60(A) {
  const cnt = new Array(60).fill(0);
  let count = 0;
  for (const x of A) {
    const r = x % 60;
    count += cnt[(60 - r) % 60];
    cnt[r]++;
  }
  return count;
}`,
    python: `def count_pairs_60(A):
    cnt = [0] * 60
    count = 0
    for x in A:
        r = x % 60
        count += cnt[(60 - r) % 60]
        cnt[r] += 1
    return count`,
    explain: "Each pair (i, j) with i < j is counted exactly once — when j is scanned, cnt already holds every earlier i with the complementary remainder. One pass with O(1) work per element plus a fixed 60-cell table: Θ(n) time, Θ(1) extra space (60 is a constant). Trading a tiny table for time is the space-time idea of Chapter 7.",
  },
  distractors: ["cnt[r] ← cnt[r] + 1", "count ← count + cnt[60 - r]", "for j ← i + 1 to n - 1 do"],
  followUp: "Generalize to 'divisible by k' — the table becomes size k, so time is Θ(n + k). This remainder-bucketing trick is the heart of Two Sum with a hash map and of 'subarray sum divisible by k' with prefix sums.",
  complexity: "Θ(n) time, Θ(60) = Θ(1) extra space",
  visual: "sims/hashing.html",
  lesson: "lessons/06-transform-and-conquer/README.md",
});

/* =====================================================================
   §6.2 Gaussian elimination
   ===================================================================== */

const randSystem = (r, i) => {
  const n = 1 + (i % 5);
  let A;
  do {
    A = Array.from({ length: n }, () => r.array(n, -9, 9));
    if (i % 3 === 0 && n > 1) A[0][0] = 0; // force a row exchange
  } while (Math.abs(TS.det(A)) < 0.5);
  const x = r.array(n, -5, 5);
  return [A, A.map((row) => row.reduce((s, a, k) => s + a * x[k], 0))];
};

ForgeProblems.add({
  id: "gaussian-solve",
  title: "Solve Ax = b by Gaussian Elimination",
  level: 3, chapter: 6, difficulty: 3,
  topics: ["Gaussian elimination", "linear systems", "matrices", "transform-and-conquer"],
  strategy: "Instance simplification (triangular system)",
  source: "Levitin §6.2 (ForwardElimination / BetterForwardElimination)",
  summary: "Transform the system to upper-triangular form with partial pivoting, then back-substitute.",
  statement: `
<p>Systems of linear equations are behind circuit analysis, least-squares fitting, physics simulations and graphics.
Gaussian elimination is <b>instance simplification</b>: it transforms the system into an equivalent one with an
<b>upper-triangular</b> coefficient matrix, which is then solved from the last equation upward (backward substitution).</p>
<p>Write <code>GaussSolve(A, b)</code>: <code>A</code> is an n × n matrix given as a list of rows (<code>A[i][j]</code>, 0-based),
<code>b</code> is a list of n numbers, and the system is guaranteed to have a <b>unique</b> solution. Return the solution
<code>x</code> as a list of n numbers (compared with a tolerance of 10⁻⁶).</p>
<p><b>Watch out:</b> a pivot <code>A[i][i]</code> may be 0 (see Example 2). Use <b>partial pivoting</b> — before eliminating
column i, swap in the row (from i down) whose entry in column i has the largest absolute value — and swap the matching
entries of <code>b</code> too. You may modify <code>A</code> and <code>b</code>.</p>`,
  entry: "GaussSolve",
  params: ["A", "b"],
  compare: "float",
  tests: [
    { args: [[[2, 1, -1], [-3, -1, 2], [-2, 1, 2]], [8, -11, -3]], expect: [2, 3, -1], explain: "A classic 3 × 3 system: x = 2, y = 3, z = −1." },
    { args: [[[0, 2], [3, 1]], [4, 5]], expect: [1, 2], explain: "The first pivot is 0 — swap the two rows (and the two b entries) before eliminating." },
    { args: [[[4]], [10]], expect: [2.5], explain: "One equation 4x = 10." },
    { args: [[[1, 1, 1], [0, 2, 5], [2, 5, -1]], [6, -4, 27]], expect: [5, 3, -2] },
    { args: [[[1, 2, 3], [2, 5, 3], [1, 0, 8]], [5, 3, 17]], expect: [1, -1, 2] },
    { args: [[[0, 1, 2, 1], [1, 0, 1, 3], [2, 1, 0, 1], [1, 3, 1, 0]], [0, 6, 4, 0]], expect: [1, 0, -1, 2], explain: "4 × 4 with a zero in the top-left corner." },
    { args: [[[1, 1], [1, -1]], [3, 1]], expect: [2, 1] },
  ],
  random: { count: 20, gen: randSystem },
  reference: (A, b) => TS.gauss(A, b),
  mutants: [
    { fn: (A, b) => TS.gauss(A, b, { staleMult: true }), hint: "Your elimination barely changes the rows below the pivot. If the multiplier A[j][i] / A[i][i] is recomputed inside the k-loop, it becomes 0 right after k = i zeroes A[j][i]. Compute temp ← A[j][i] / A[i][i] ONCE, before the k-loop (this is Levitin's 'improve!' fix)." },
    { fn: (A, b) => TS.gauss(A, b, { skipB: true }), hint: "The right-hand side b is never updated. Every row operation on A must also be applied to b: b[j] ← b[j] − b[i] × temp (and swap b's entries when you swap rows)." },
    { fn: (A, b) => TS.gauss(A, b, { noDiv: true }), hint: "In backward substitution you forgot to divide by the diagonal coefficient: x[j] ← (b[j] − t) / A[j][j]." },
    { fn: (A, b) => TS.gauss(A, b, { pivot: false }), hint: "Some answers are ∞ or not-a-number: you divided by a zero pivot. Before eliminating column i, swap row i with the row below that has the largest |A[j][i]| (partial pivoting)." },
  ],
  hints: [
    "Which systems are easy to solve by hand? If the last equation has one unknown, the one above it two, … you can solve from the bottom up. How can you reach that shape without changing the solution?",
    "Stage 1, for each column i: pick the pivot row (largest |A[j][i]| for j ≥ i) and swap it into row i (in A and b); then for every row j below, subtract temp × row i where temp = A[j][i] / A[i][i]. Stage 2: for j from n − 1 down to 0, x[j] = (b[j] − Σ_{k>j} A[j][k]·x[k]) / A[j][j].",
    "Inside the j-loop, compute temp ← A[j][i] / A[i][i] once; then for k ← i to n − 1 do A[j][k] ← A[j][k] − A[i][k] × temp; and b[j] ← b[j] − b[i] × temp.",
  ],
  starter: {
    pseudo: `ALGORITHM GaussSolve(A[0..n-1], b[0..n-1])
    // A: n × n matrix (list of rows), b: right-hand side. Returns x with Ax = b.
    // Stage 1: forward elimination with partial pivoting
    for i ← 0 to n - 2 do
        ...
    // Stage 2: backward substitution
    x ← array(n, 0)
    ...
    return x`,
    js: `function GaussSolve(A, b) {
  const n = A.length;
  // forward elimination with partial pivoting, then back substitution
}`,
  },
  solution: {
    pseudo: `ALGORITHM GaussSolve(A[0..n-1], b[0..n-1])
    for i ← 0 to n - 2 do
        p ← i
        for j ← i + 1 to n - 1 do
            if |A[j][i]| > |A[p][i]| then p ← j
        swap A[i] and A[p]
        swap b[i] and b[p]
        for j ← i + 1 to n - 1 do
            temp ← A[j][i] / A[i][i]
            for k ← i to n - 1 do
                A[j][k] ← A[j][k] - A[i][k] * temp
            b[j] ← b[j] - b[i] * temp
    x ← array(n, 0)
    for j ← n - 1 downto 0 do
        t ← 0
        for k ← j + 1 to n - 1 do
            t ← t + A[j][k] * x[k]
        x[j] ← (b[j] - t) / A[j][j]
    return x`,
    js: `function GaussSolve(A, b) {
  const n = A.length;
  for (let i = 0; i < n - 1; i++) {
    let p = i;
    for (let j = i + 1; j < n; j++) if (Math.abs(A[j][i]) > Math.abs(A[p][i])) p = j;
    [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]];
    for (let j = i + 1; j < n; j++) {
      const temp = A[j][i] / A[i][i];
      for (let k = i; k < n; k++) A[j][k] -= A[i][k] * temp;
      b[j] -= b[i] * temp;
    }
  }
  const x = new Array(n).fill(0);
  for (let j = n - 1; j >= 0; j--) {
    let t = 0;
    for (let k = j + 1; k < n; k++) t += A[j][k] * x[k];
    x[j] = (b[j] - t) / A[j][j];
  }
  return x;
}`,
    python: `def gauss_solve(A, b):
    n = len(A)
    for i in range(n - 1):
        p = max(range(i, n), key=lambda j: abs(A[j][i]))
        A[i], A[p] = A[p], A[i]
        b[i], b[p] = b[p], b[i]
        for j in range(i + 1, n):
            temp = A[j][i] / A[i][i]
            for k in range(i, n):
                A[j][k] -= A[i][k] * temp
            b[j] -= b[i] * temp
    x = [0.0] * n
    for j in range(n - 1, -1, -1):
        t = sum(A[j][k] * x[k] for k in range(j + 1, n))
        x[j] = (b[j] - t) / A[j][j]
    return x`,
    explain: "Row swaps and 'subtract a multiple of another row' never change the solution set, so the triangular system is equivalent to the original. Elimination does Σ_{i}Σ_{j>i}Σ_{k≥i} 1 ≈ n³/3 multiplications — Θ(n³) — and backward substitution Θ(n²), so the total is Θ(n³). Partial pivoting avoids zero pivots and keeps multipliers |temp| ≤ 1, which limits round-off error.",
  },
  distractors: ["temp ← A[i][i] / A[j][i]", "for k ← i + 1 to n - 1 do", "x[j] ← b[j] - t"],
  followUp: "Real solvers (the Linear Algebra PACKage (LAPACK), NumPy's solve) do exactly this as a lower–upper (LU) decomposition: factor A = LU once in Θ(n³), then solve for many right-hand sides b in Θ(n²) each. For huge sparse systems (circuits, finite elements) engineers switch to iterative methods like conjugate gradient.",
  complexity: "Θ(n³)",
  visual: "sims/gaussian.html",
  lesson: "lessons/06-transform-and-conquer/README.md",
});

ForgeProblems.add({
  id: "determinant",
  title: "Determinant in Cubic Time",
  level: 3, chapter: 6, difficulty: 3,
  topics: ["Gaussian elimination", "determinant", "matrices", "transform-and-conquer"],
  strategy: "Instance simplification (triangular matrix)",
  source: "Levitin §6.2, 'Computing a Determinant'",
  summary: "Eliminate to upper-triangular form; det = ± product of the pivots.",
  statement: `
<p>The textbook definition of a determinant (expansion by minors) costs Θ(n!) — hopeless beyond n ≈ 12. Gaussian elimination
gives a <b>cubic</b> algorithm: the determinant of an upper-triangular matrix is the product of its diagonal, and the
elimination steps affect the determinant in simple, known ways:</p>
<ul>
<li>adding a multiple of one row to another row does <b>not</b> change it;</li>
<li><b>swapping</b> two rows <b>flips its sign</b>.</li>
</ul>
<p>Write <code>Det(A)</code> for an n × n matrix <code>A</code> (list of rows, n ≥ 1) and return its determinant
(compared with a relative tolerance of 10⁻⁶). If at some column every remaining entry is 0, the matrix is singular — return 0.
Use partial pivoting as in <code>gaussian-solve</code>.</p>
<p><b>Efficiency:</b> the grader checks that your work grows like <b>Θ(n³)</b> (sizes up to 64 × 64), so cofactor
expansion will not pass.</p>`,
  entry: "Det",
  params: ["A"],
  compare: "float",
  tests: [
    { args: [[[1, 2], [3, 4]]], expect: -2, explain: "1·4 − 2·3 = −2." },
    { args: [[[0, 1], [1, 0]]], expect: -1, explain: "One row swap gives the identity matrix (det 1) — so the original has det −1." },
    { args: [[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], expect: 0, explain: "Row 3 − 2·row 2 + row 1 = 0: singular." },
    { args: [[[3]]], expect: 3 },
    { args: [[[2, 0, 0], [0, 3, 0], [0, 0, 4]]], expect: 24, explain: "Already triangular: multiply the diagonal." },
    { args: [[[0, 2, 1], [1, 1, 1], [2, 0, 3]]], expect: -4 },
    { args: [[[2, -1, 0, 3], [1, 0, 4, -2], [0, 5, 1, 1], [3, 2, -2, 0]]], expect: 300 },
    { args: [[[0, 0], [0, 5]]], expect: 0, explain: "First column is all zeros → singular." },
  ],
  random: {
    count: 20,
    gen: (r, i) => {
      const n = 1 + (i % 6);
      const A = Array.from({ length: n }, () => r.array(n, -6, 6));
      if (i % 4 === 1 && n > 1) A[n - 1] = A[0].map((x, k) => x + A[1 % n][k]); // occasionally singular
      if (i % 3 === 0 && n > 1) A[0][0] = 0;
      return [A];
    },
  },
  reference: (A) => TS.det(A),
  growth: { metric: "steps", sizes: [4, 8, 16, 32, 64], gen: (r, n) => [Array.from({ length: n }, () => r.array(n, -9, 9))], expect: "n^3" },
  mutants: [
    { fn: (A) => TS.det(A, { noFlip: true }), hint: "The size is right but the sign is sometimes wrong: every row swap multiplies the determinant by −1. Flip the sign each time you actually swap two different rows." },
    { fn: (A) => TS.det(A, { origDiag: true }), hint: "'Product of the diagonal' only works once the matrix is upper-triangular. Eliminate first (and track swaps), then multiply the pivots." },
    { fn: (A) => TS.det(A, { normalize: true }), hint: "You get only ±1 or 0 — did you divide each pivot row by its pivot (Gauss–Jordan style)? Dividing a row by c divides the determinant by c. Either don't normalize, or multiply the pivot into the result before normalizing." },
  ],
  hints: [
    "For which kind of matrix is the determinant trivial? Which row operations of Gaussian elimination leave the determinant unchanged, and which ones change it?",
    "Run forward elimination column by column. Keep a running value det (start at 1): on a row swap, det ← −det; after choosing the pivot, det ← det × A[i][i]; if the best pivot is 0, return 0.",
    "The elimination step is exactly the one from Gaussian elimination: temp ← A[j][i] / A[i][i]; for k ← i to n − 1: A[j][k] ← A[j][k] − A[i][k] × temp.",
  ],
  starter: {
    pseudo: `ALGORITHM Det(A[0..n-1])
    // A: n × n matrix (list of rows). Returns det A in Θ(n³).
    det ← 1
    for i ← 0 to n - 1 do
        ...
    return det`,
    js: `function Det(A) {
  const n = A.length;
  let det = 1;
  // eliminate, tracking swaps
  return det;
}`,
  },
  solution: {
    pseudo: `ALGORITHM Det(A[0..n-1])
    det ← 1
    for i ← 0 to n - 1 do
        p ← i
        for j ← i + 1 to n - 1 do
            if |A[j][i]| > |A[p][i]| then p ← j
        if A[p][i] = 0 then return 0
        if p ≠ i then
            swap A[i] and A[p]
            det ← -det
        det ← det * A[i][i]
        for j ← i + 1 to n - 1 do
            temp ← A[j][i] / A[i][i]
            for k ← i to n - 1 do
                A[j][k] ← A[j][k] - A[i][k] * temp
    return det`,
    js: `function Det(A) {
  const n = A.length;
  let det = 1;
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let j = i + 1; j < n; j++) if (Math.abs(A[j][i]) > Math.abs(A[p][i])) p = j;
    if (Math.abs(A[p][i]) < 1e-9) return 0;
    if (p !== i) { [A[i], A[p]] = [A[p], A[i]]; det = -det; }
    det *= A[i][i];
    for (let j = i + 1; j < n; j++) {
      const temp = A[j][i] / A[i][i];
      for (let k = i; k < n; k++) A[j][k] -= A[i][k] * temp;
    }
  }
  return det;
}`,
    python: `def det(A):
    n, d = len(A), 1.0
    for i in range(n):
        p = max(range(i, n), key=lambda j: abs(A[j][i]))
        if abs(A[p][i]) < 1e-9:
            return 0.0
        if p != i:
            A[i], A[p] = A[p], A[i]
            d = -d
        d *= A[i][i]
        for j in range(i + 1, n):
            temp = A[j][i] / A[i][i]
            for k in range(i, n):
                A[j][k] -= A[i][k] * temp
    return d`,
    explain: "Elimination keeps the determinant up to the recorded sign flips, and the final triangular matrix's determinant is the product of its pivots. The triple loop does about n³/3 multiplications: Θ(n³), versus Θ(n!) for expansion by minors — at n = 20 that is ~2,700 operations instead of ~2.4 × 10¹⁸.",
  },
  distractors: ["det ← det + A[i][i]", "if A[i][i] = 0 then return 0", "for k ← i + 1 to n - 1 do"],
  followUp: "This is why numerical libraries compute det via the lower–upper (LU) factorization (and why you almost never need the determinant itself — to test solvability, look at pivots or the condition number). Cramer's rule needs n + 1 determinants, which makes it Θ(n⁴) even with this trick — Gaussian elimination is strictly better.",
  complexity: "Θ(n³)",
  visual: "sims/gaussian.html",
  lesson: "lessons/06-transform-and-conquer/README.md",
});

/* =====================================================================
   §6.3 Balanced search trees · §6.4 Heaps and heapsort
   ===================================================================== */

const N = (key, left = null, right = null) => ({ key, left, right });
const heapTopDown = (A) => { const H = []; for (const x of A) { H.push(x); let i = H.length - 1; while (i > 0 && H[(i - 1) >> 1] < H[i]) { const p = (i - 1) >> 1; [H[i], H[p]] = [H[p], H[i]]; i = p; } } return H; };
const siftDown = (H, k, size, opt = {}) => { // 1-based positions k..size on a 0-based array
  const v = H[k - 1];
  while (2 * k <= size) {
    let j = 2 * k;
    if (!opt.leftOnly && j < size && H[j - 1] < H[j]) j++;
    if (v >= H[j - 1]) break;
    H[k - 1] = H[j - 1]; k = j;
    if (opt.oneLevel) break;
  }
  H[k - 1] = v;
};

ForgeProblems.add({
  id: "is-max-heap",
  title: "Is This Array a Heap?",
  level: 3, chapter: 6, difficulty: 1,
  topics: ["heaps", "arrays", "priority queues"],
  strategy: "Check parental dominance",
  source: "Levitin Exercise 6.4.2 (adapted)",
  summary: "Check parental dominance H[parent] ≥ H[child] for every node, in n − 1 comparisons.",
  statement: `
<p>A (max-)heap stored in an array is <i>essentially complete</i> by construction; the only thing that can go wrong is
<b>parental dominance</b>: every parent's key must be <b>≥</b> the keys of its children. In book-style 1-based indexing
the children of position <code>i</code> are <code>2i</code> and <code>2i + 1</code>, and the parent of <code>i</code> is
<code>⌊i/2⌋</code> (Levitin §6.4).</p>
<p>Write <code>IsHeap(H)</code> that returns <code>true</code> if the array is a max-heap and <code>false</code> otherwise.
Arrays are passed 0-based; declare the header <code>IsHeap(H[1..n])</code> to index them 1..n like the book (or use
children <code>2i + 1</code>, <code>2i + 2</code> with 0-based indexing).</p>
<p><b>Budget:</b> at most <b>n − 1</b> element comparisons — each non-root element only needs to be compared with its parent once.</p>`,
  entry: "IsHeap",
  params: ["H"],
  tests: [
    { args: [[9, 6, 8, 2, 5, 7]], expect: true, explain: "Every parent beats its children. Note the array is NOT sorted — heaps are ordered top-down only." },
    { args: [[5, 3, 7]], expect: false, explain: "The right child 7 is bigger than its parent 5." },
    { args: [[10, 9, 8, 12]], expect: false, explain: "The violation is at the very last element (12 under its parent 9)." },
    { args: [[]], expect: true },
    { args: [[7]], expect: true },
    { args: [[4, 4, 4]], expect: true, explain: "Equal keys are fine: the condition is ≥, not >." },
    { args: [[10, 5, 11, 4, 3]], expect: false },
    { args: [[20, 18, 15, 17, 3, 14, 1, 2]], expect: true },
    { args: [[20, 18, 15, 17, 3, 14, 1, 19]], expect: false },
  ],
  random: {
    count: 30,
    gen: (r, i) => {
      const H = TS.heapify(r.array(1 + (i % 25), 0, 30));
      if (i % 3 === 1 && H.length > 1) { const a = r.int(0, H.length - 1), b = r.int(0, H.length - 1); [H[a], H[b]] = [H[b], H[a]]; }
      if (i % 3 === 2) return [r.array(1 + (i % 12), 0, 20)];
      return [H];
    },
  },
  reference: (H) => TS.isHeap(H),
  budget: { metric: "keyComparisons", label: "element comparisons", limit: (H) => Math.max(0, H.length - 1), hint: "Compare each element (except the root) with its parent exactly once: for i ← 2 to n, check H[⌊i/2⌋] ≥ H[i]. That's n − 1 comparisons." },
  mutants: [
    { fn: (H) => { for (let i = 0; i + 1 < H.length; i++) if (H[i] < H[i + 1]) return false; return true; }, hint: "You're checking that the array is sorted in decreasing order — that's stronger than a heap. [9, 6, 8] is a heap: 6 and 8 are siblings, not parent and child. Compare each element with its PARENT." },
    { fn: (H) => { for (let i = 1; i < H.length; i += 2) if (H[(i - 1) >> 1] < H[i]) return false; return true; }, hint: "Right children are never checked. Every node except the root has a parent — check both 2i and 2i + 1 (1-based)." },
    { fn: (H) => { for (let i = 1; i < H.length - 1; i++) if (H[(i - 1) >> 1] < H[i]) return false; return true; }, hint: "The last element is never checked. Your loop over children must include position n (1-based) / index n − 1 (0-based)." },
    { fn: (H) => { for (let i = 1; i < H.length; i++) if (H[(i - 1) >> 1] <= H[i]) return false; return true; }, hint: "Equal keys break your check. Parental dominance is H[parent] ≥ H[child], so a child equal to its parent is fine." },
  ],
  hints: [
    "Every node except the root has exactly one parent. What single comparison per node settles the question?",
    "With 1-based positions, loop i from 2 to n and look at H[⌊i/2⌋] (the parent of i). One violation is enough to answer false.",
    "for i ← 2 to n do: if H[⌊i/2⌋] < H[i] then return false. After the loop, return true.",
  ],
  starter: {
    pseudo: `ALGORITHM IsHeap(H[1..n])
    // Output: true if H[1..n] satisfies parental dominance (a max-heap)
    for i ← ... do
        ...
    return true`,
    js: `function IsHeap(H) {
  // H is 0-based: children of i are 2i+1 and 2i+2
}`,
  },
  solution: {
    pseudo: `ALGORITHM IsHeap(H[1..n])
    for i ← 2 to n do
        if H[⌊i/2⌋] < H[i] then
            return false
    return true`,
    js: `function IsHeap(H) {
  for (let i = 1; i < H.length; i++) if (H[Math.floor((i - 1) / 2)] < H[i]) return false;
  return true;
}`,
    python: `def is_heap(H):
    return all(H[(i - 1) // 2] >= H[i] for i in range(1, len(H)))`,
    explain: "Parental dominance is a statement about each (parent, child) edge, and an essentially complete tree with n nodes has exactly n − 1 edges; checking each once gives at most n − 1 comparisons — Θ(n) worst case, and you can stop at the first violation.",
  },
  distractors: ["for i ← 1 to n do", "if H[i] < H[i + 1] then", "if H[⌊i/2⌋] ≤ H[i] then"],
  followUp: "Debug assertions like this ('check the invariant') are how engineers test custom heap code — run IsHeap after every operation in a randomized test. For a min-heap just flip the comparison, or negate the keys (problem reduction, Levitin §6.6).",
  complexity: "Θ(n), at most n − 1 comparisons",
  visual: "sims/heap-lab.html",
  lesson: "lessons/06-transform-and-conquer/README.md",
});

ForgeProblems.add({
  id: "heap-insert",
  title: "Insert into a Heap (Sift Up)",
  level: 3, chapter: 6, difficulty: 1,
  topics: ["heaps", "priority queues", "sift up"],
  strategy: "Sift up",
  source: "Levitin §6.4 (key insertion, Figure 6.12)",
  summary: "Append the new key and sift it up — at most ⌊log₂(n + 1)⌋ comparisons.",
  statement: `
<p>Priority queues (job schedulers, Dijkstra's algorithm, event simulations) insert keys into a heap all the time, so it has
to be cheap. The trick: put the new key <code>K</code> in the next free slot (keeping the tree essentially complete), then
<b>sift it up</b> — while it is larger than its parent, swap it with the parent.</p>
<p>Write <code>HeapInsert(H, K)</code>: <code>H</code> is a valid max-heap stored in a <b>0-based</b> array (children of
index <code>i</code> are <code>2i + 1</code> and <code>2i + 2</code>, parent is <code>(i − 1) div 2</code>). Return the array
after inserting <code>K</code>. Stop as soon as the parent is <b>≥ K</b> (don't swap equal keys).</p>
<p><b>Budget:</b> at most <b>⌊log₂(n + 1)⌋</b> element comparisons — the height of the new heap.</p>`,
  entry: "HeapInsert",
  params: ["H", "K"],
  tests: [
    { args: [[20, 12, 15, 4, 10, 9], 17], expect: [20, 12, 17, 4, 10, 9, 15], explain: "17 lands at index 6, beats its parent 15 (index 2), then stops under 20." },
    { args: [[20, 12, 15, 4, 10, 9], 25], expect: [25, 12, 20, 4, 10, 9, 15], explain: "A new maximum travels all the way to the root." },
    { args: [[], 5], expect: [5], explain: "Inserting into an empty heap." },
    { args: [[20, 12, 15, 4, 10, 9], 1], expect: [20, 12, 15, 4, 10, 9, 1], explain: "Smaller than its parent: no swaps at all." },
    { args: [[9, 6, 8, 2, 5, 7], 6], expect: [9, 6, 8, 2, 5, 7, 6] },
    { args: [[50, 30, 40, 10, 20], 45], expect: [50, 30, 45, 10, 20, 40] },
    { args: [[8, 7, 6, 5, 4, 3, 2], 9], expect: [9, 8, 6, 7, 4, 3, 2, 5], explain: "Index 7's parent is index 3 (not 3.5 or 4): (7 − 1) div 2 = 3." },
  ],
  random: { count: 30, gen: (r, i) => [TS.heapify(r.array(i % 31, 0, 60)), r.int(0, 70)] },
  reference: (H, K) => { H.push(K); let i = H.length - 1; while (i > 0 && H[(i - 1) >> 1] < H[i]) { const p = (i - 1) >> 1; [H[i], H[p]] = [H[p], H[i]]; i = p; } return H; },
  budget: { metric: "keyComparisons", label: "element comparisons", limit: (H) => Math.floor(Math.log2(H.length + 1)), hint: "Sift up compares the new key only with its ancestors, one per level: that's at most the height ⌊log₂(n + 1)⌋ of the new heap. Don't scan the whole array." },
  mutants: [
    { fn: (H, K) => [...H, K], hint: "You appended K but never moved it. Sift it up: while it's bigger than its parent, swap them." },
    { fn: (H, K) => { H.push(K); let i = H.length - 1; while (i > 0 && H[i >> 1] < H[i]) { const p = i >> 1; [H[i], H[p]] = [H[p], H[i]]; i = p; } return H; }, hint: "Your parent index looks like the 1-based formula i div 2. In a 0-based array the parent of index i is (i − 1) div 2." },
    { fn: (H, K) => { H.push(K); const i = H.length - 1, p = (i - 1) >> 1; if (i > 0 && H[p] < H[i]) [H[i], H[p]] = [H[p], H[i]]; return H; }, hint: "The new key moves up at most one level. Sifting up is a LOOP: keep swapping until the parent is ≥ the key or you reach the root." },
  ],
  hints: [
    "Where must the new node go so the tree stays essentially complete? Once it's there, which single relationship might be broken?",
    "Append K at index n. Then repeatedly compare the key at index i with its parent at (i − 1) div 2; swap and move up while the parent is smaller.",
    "i ← n; while i > 0 and H[(i − 1) div 2] < H[i] do: swap H[i] and H[(i − 1) div 2]; i ← (i − 1) div 2.",
  ],
  starter: {
    pseudo: `ALGORITHM HeapInsert(H[0..n-1], K)
    // H: a max-heap (0-based). Insert K and return the heap.
    append(H, K)
    i ← n
    ...
    return H`,
    js: `function HeapInsert(H, K) {
  H.push(K);
  // sift up
  return H;
}`,
  },
  solution: {
    pseudo: `ALGORITHM HeapInsert(H[0..n-1], K)
    append(H, K)
    i ← n
    while i > 0 and H[(i - 1) div 2] < H[i] do
        swap H[i] and H[(i - 1) div 2]
        i ← (i - 1) div 2
    return H`,
    js: `function HeapInsert(H, K) {
  H.push(K);
  let i = H.length - 1;
  while (i > 0 && H[(i - 1) >> 1] < H[i]) {
    const p = (i - 1) >> 1;
    [H[i], H[p]] = [H[p], H[i]];
    i = p;
  }
  return H;
}`,
    python: `def heap_insert(H, K):
    H.append(K)
    i = len(H) - 1
    while i > 0 and H[(i - 1) // 2] < H[i]:
        p = (i - 1) // 2
        H[i], H[p] = H[p], H[i]
        i = p
    return H`,
    explain: "Only the path from the new leaf to the root can violate parental dominance, and each loop iteration moves one level up with one comparison. A heap with n + 1 nodes has height ⌊log₂(n + 1)⌋, so insertion is O(log n).",
  },
  distractors: ["while i > 0 and H[i div 2] < H[i] do", "if H[(i - 1) div 2] < H[i] then", "i ← i - 1"],
  followUp: "Building a heap by n successive inserts ('top-down') costs Θ(n log n), but the bottom-up construction is Θ(n) — try heap-bottom-up next. In practice, priority queues also need decrease-key (Dijkstra) — which is the same sift-up starting from an interior position.",
  complexity: "O(log n)",
  visual: "sims/heap-lab.html",
  lesson: "lessons/06-transform-and-conquer/README.md",
});

ForgeProblems.add({
  id: "heap-bottom-up",
  title: "Bottom-Up Heap Construction",
  level: 3, chapter: 6, difficulty: 2,
  topics: ["heaps", "heapify", "in-place"],
  strategy: "Representation change (heap)",
  source: "Levitin §6.4 (HeapBottomUp)",
  summary: "Heapify an array in place, from the last parent up to the root, in at most 2n comparisons.",
  statement: `
<p>Given an array of keys, rearrange it <b>in place</b> into a max-heap using the <b>bottom-up</b> algorithm: starting with
the last parental node and moving backward to the root, sift each parent's key down — swap it with its <b>larger</b> child
until it is ≥ both children (or reaches a leaf).</p>
<p>Write <code>HeapBottomUp(H)</code>. The grader checks the array itself afterwards and expects <b>exactly the heap this
algorithm builds</b> (many heaps hold the same keys; building by successive insertions gives a different one).
Arrays are passed 0-based; you may declare <code>HeapBottomUp(H[1..n])</code> to use the book's 1-based positions
(children <code>2k</code>, <code>2k + 1</code>).</p>
<p><b>Budget:</b> fewer than <b>2n</b> element comparisons — this is why bottom-up construction is linear.</p>`,
  entry: "HeapBottomUp",
  params: ["H"],
  output: { arg: 0 },
  tests: [
    { args: [[2, 9, 7, 6, 5, 8]], expect: [9, 6, 8, 2, 5, 7], explain: "Parents at positions 3, 2, 1 are fixed in that order; the 2 at the root sinks two levels." },
    { args: [[1, 8, 6, 5, 3, 7, 4]], expect: [8, 5, 7, 1, 3, 6, 4], explain: "Top-down insertion would give a different (also valid) heap — here we want the bottom-up one." },
    { args: [[1, 2, 3]], expect: [3, 2, 1], explain: "Swap the root with its LARGER child." },
    { args: [[]], expect: [] },
    { args: [[5]], expect: [5] },
    { args: [[1, 2, 3, 4, 5, 6, 7]], expect: [7, 5, 6, 4, 2, 1, 3], explain: "Worst case for top-down insertion; bottom-up stays within 2n comparisons." },
    { args: [[9, 8, 7, 6, 5]], expect: [9, 8, 7, 6, 5], explain: "Already a heap: nothing moves." },
    { args: [[3, 3, 1, 3]], expect: [3, 3, 1, 3] },
  ],
  random: { count: 30, gen: (r, i) => [r.array(i + 1, 0, 50)] },
  reference: (H) => TS.heapify(H),
  budget: { metric: "keyComparisons", label: "element comparisons", limit: (H) => 2 * H.length, hint: "Each sift-down step costs 2 comparisons (pick the larger child, compare it with the key). Sifting from the last parent up to the root makes the total less than 2n. Inserting keys one by one costs about n log₂ n." },
  mutants: [
    { fn: (H) => { heapTopDown(H).forEach((x, k) => { H[k] = x; }); return H; }, hint: "Your array is a valid heap, but it's the one built by inserting keys one at a time (top-down). The bottom-up algorithm keeps the keys where they are and sifts DOWN each parent, from position ⌊n/2⌋ back to 1." },
    { fn: (H) => { const n = H.length; for (let i = Math.floor(n / 2); i >= 1; i--) siftDown(H, i, n, { oneLevel: true }); return H; }, hint: "A key only moves down one level. Sift-down is a loop: after a swap, keep comparing the key with its NEW children until it's ≥ both or it reaches a leaf." },
    { fn: (H) => { const n = H.length; for (let i = 1; i <= Math.floor(n / 2); i++) siftDown(H, i, n); return H; }, hint: "You process the parents top-down (1, 2, …). Bottom-up means starting at the LAST parent ⌊n/2⌋ and going down to 1, so every subtree below is already a heap when you fix a node." },
    { fn: (H) => { const n = H.length; for (let i = Math.floor(n / 2); i >= 1; i--) siftDown(H, i, n, { leftOnly: true }); return H; }, hint: "You always look at the LEFT child. Compare the key with the LARGER of the two children — otherwise the bigger right child ends up below a smaller parent." },
  ],
  hints: [
    "Leaves are already one-element heaps. If both subtrees of a node are heaps, what does it take to make the whole subtree a heap?",
    "for i ← ⌊n/2⌋ downto 1: take v ← H[i] and walk it down: pick the larger child j of the current position k; if v ≥ H[j] stop, otherwise move H[j] up to k and continue from k ← j. Finally put v at H[k].",
    "Inside the walk: j ← 2k; if j < n and H[j] < H[j + 1] then j ← j + 1; then compare v with H[j].",
  ],
  starter: {
    pseudo: `ALGORITHM HeapBottomUp(H[1..n])
    // Rearrange H[1..n] into a max-heap in place (bottom-up)
    for i ← ⌊n/2⌋ downto 1 do
        k ← i
        v ← H[k]
        ...
        H[k] ← v`,
    js: `function HeapBottomUp(H) {
  // H is 0-based here; modify it in place
}`,
  },
  solution: {
    pseudo: `ALGORITHM HeapBottomUp(H[1..n])
    for i ← ⌊n/2⌋ downto 1 do
        k ← i
        v ← H[k]
        heap ← false
        while not heap and 2 * k ≤ n do
            j ← 2 * k
            if j < n then
                if H[j] < H[j + 1] then j ← j + 1
            if v ≥ H[j] then
                heap ← true
            else
                H[k] ← H[j]
                k ← j
        H[k] ← v`,
    js: `function HeapBottomUp(H) {
  const n = H.length; // 1-based positions k map to H[k - 1]
  for (let i = Math.floor(n / 2); i >= 1; i--) {
    let k = i; const v = H[k - 1];
    while (2 * k <= n) {
      let j = 2 * k;
      if (j < n && H[j - 1] < H[j]) j++;
      if (v >= H[j - 1]) break;
      H[k - 1] = H[j - 1]; k = j;
    }
    H[k - 1] = v;
  }
  return H;
}`,
    python: `def heap_bottom_up(H):
    n = len(H)                      # 1-based position k is H[k - 1]
    for i in range(n // 2, 0, -1):
        k, v = i, H[i - 1]
        while 2 * k <= n:
            j = 2 * k
            if j < n and H[j - 1] < H[j]:
                j += 1
            if v >= H[j - 1]:
                break
            H[k - 1] = H[j - 1]
            k = j
        H[k - 1] = v
    return H`,
    explain: "When node i is processed its subtrees are already heaps, so sifting its key down makes subtree i a heap. A key on level i sinks at most h − i levels at 2 comparisons each: C_worst(n) = Σ_{i=0}^{h−1} 2(h − i)·2^i = 2(n − log₂(n + 1)) < 2n, so construction is Θ(n) — better than n inserts at Θ(n log n).",
  },
  distractors: ["for i ← 1 to ⌊n/2⌋ do", "if v > H[j] then", "j ← 2 * k + 1"],
  followUp: "This linear-time heapify is what Python's heapq.heapify and C++'s std::make_heap do. The same 'most nodes are near the bottom, so most work is cheap' sum shows up when you analyze B-tree bulk loading and tournament trees.",
  complexity: "Θ(n), at most 2n comparisons",
  visual: "sims/heap-lab.html",
  lesson: "lessons/06-transform-and-conquer/README.md",
});

ForgeProblems.add({
  id: "heapsort",
  title: "Heapsort",
  level: 3, chapter: 6, difficulty: 2,
  topics: ["heaps", "sorting", "in-place", "transform-and-conquer"],
  strategy: "Representation change (heap)",
  source: "Levitin §6.4 (Heapsort)",
  summary: "Build a max-heap, then swap the root to the end n − 1 times and re-heapify — in place, Θ(n log n).",
  statement: `
<p>Heapsort is a guaranteed Θ(n log n), <b>in-place</b> sort: no extra array (unlike mergesort) and no bad worst case
(unlike quicksort). It has two stages (Levitin §6.4):</p>
<ul>
<li><b>Stage 1</b> — build a max-heap from the array (bottom-up).</li>
<li><b>Stage 2</b> — repeat n − 1 times: swap the root (the current maximum) with the last element of the heap, shrink the heap
by one, and sift the new root down <i>within the smaller heap</i>.</li>
</ul>
<p>Write <code>HeapSort(A)</code> that sorts <code>A</code> into nondecreasing order in place (the grader checks the array).
Built-in <code>sorted</code> and priority queues are not allowed. You may use the header <code>HeapSort(A[1..n])</code>
for 1-based positions, and you may write a helper algorithm (e.g. <code>SiftDown(H, k, size)</code>).</p>
<p><b>Efficiency:</b> the grader checks Θ(n log n) comparisons.</p>`,
  entry: "HeapSort",
  params: ["A"],
  output: { arg: 0 },
  tests: [
    { args: [[2, 9, 7, 6, 5, 8]], expect: [2, 5, 6, 7, 8, 9], explain: "Heap 9 6 8 2 5 7, then the maximum is moved to the end five times." },
    { args: [[5, 4, 3, 2, 1]], expect: [1, 2, 3, 4, 5] },
    { args: [[1, 2, 3, 4, 5]], expect: [1, 2, 3, 4, 5] },
    { args: [[]], expect: [] },
    { args: [[7]], expect: [7] },
    { args: [[3, 1]], expect: [1, 3], explain: "The last deletion (heap of size 2) matters too." },
    { args: [[4, 1, 4, 2, 1, 4]], expect: [1, 1, 2, 4, 4, 4] },
    { args: [[-3, 10, 0, -8, 6]], expect: [-8, -3, 0, 6, 10] },
  ],
  random: { count: 25, gen: (r, i) => [r.array(i * 2, -50, 50)] },
  reference: (A) => TS.asc(A),
  forbid: ["sorted", "priorityQueue", "maxPQ", "minPQ", "pq"],
  growth: { metric: "keyComparisons", sizes: [32, 64, 128, 256, 512], gen: (r, n) => [r.array(n, 0, 100000)], expect: "n log n" },
  mutants: [
    { fn: (A) => { const n = A.length; for (let i = Math.floor(n / 2); i >= 1; i--) siftDown(A, i, n); for (let last = n; last >= 2; last--) { [A[0], A[last - 1]] = [A[last - 1], A[0]]; siftDown(A, 1, n); } return A; }, hint: "After swapping the maximum to position 'last', you sift the new root down through the WHOLE array — including the sorted tail — so big keys get pulled back up. Sift down only within the heap A[1..last − 1]." },
    { fn: (A) => { const n = A.length; for (let i = Math.floor(n / 2); i >= 1; i--) siftDown(A, i, n); for (let last = n; last >= 3; last--) { [A[0], A[last - 1]] = [A[last - 1], A[0]]; siftDown(A, 1, last - 1); } return A; }, hint: "The first two elements come out in the wrong order: your Stage 2 stops one deletion early. Run it for last ← n downto 2 (n − 1 deletions)." },
    { fn: (A) => { TS.asc(A).reverse().forEach((x, k) => { A[k] = x; }); return A; }, hint: "Your result is sorted in DEcreasing order. With a MAX-heap, the maximum should be swapped to the END of the array each time (A[last]), not collected at the front — or did you build a min-heap?" },
    { fn: (A) => { const n = A.length; for (let last = n; last >= 2; last--) { [A[0], A[last - 1]] = [A[last - 1], A[0]]; siftDown(A, 1, last - 1); } return A; }, hint: "Stage 1 seems to be missing: root removal only works if the array is already a heap. Build the heap bottom-up first (for i ← ⌊n/2⌋ downto 1: sift down i)." },
  ],
  hints: [
    "In a max-heap, where is the largest key? If you move it to the last position, what's left to do with the remaining n − 1 keys?",
    "Stage 1: for i ← ⌊n/2⌋ downto 1: SiftDown(A, i, n). Stage 2: for last ← n downto 2: swap A[1] and A[last]; SiftDown(A, 1, last − 1).",
    "SiftDown(H, k, size) is the inner loop of HeapBottomUp with n replaced by size: pick the larger child j of k (only children ≤ size exist), and move the key down while it is smaller than H[j].",
  ],
  starter: {
    pseudo: `ALGORITHM HeapSort(A[1..n])
    // Stage 1: build a max-heap
    ...
    // Stage 2: n − 1 root deletions
    for last ← n downto 2 do
        ...

ALGORITHM SiftDown(H, k, size)
    // sift H[k] down inside the heap H[1..size]
    ...`,
    js: `function HeapSort(A) {
  // sort A in place (no .sort)
}`,
  },
  solution: {
    pseudo: `ALGORITHM HeapSort(A[1..n])
    for i ← ⌊n/2⌋ downto 1 do
        SiftDown(A, i, n)
    for last ← n downto 2 do
        swap A[1] and A[last]
        SiftDown(A, 1, last - 1)

ALGORITHM SiftDown(H, k, size)
    v ← H[k]
    heap ← false
    while not heap and 2 * k ≤ size do
        j ← 2 * k
        if j < size then
            if H[j] < H[j + 1] then j ← j + 1
        if v ≥ H[j] then
            heap ← true
        else
            H[k] ← H[j]
            k ← j
    H[k] ← v`,
    js: `function HeapSort(A) {
  const sift = (k, size) => { // 1-based position k ↦ A[k - 1]
    const v = A[k - 1];
    while (2 * k <= size) {
      let j = 2 * k;
      if (j < size && A[j - 1] < A[j]) j++;
      if (v >= A[j - 1]) break;
      A[k - 1] = A[j - 1]; k = j;
    }
    A[k - 1] = v;
  };
  const n = A.length;
  for (let i = Math.floor(n / 2); i >= 1; i--) sift(i, n);
  for (let last = n; last >= 2; last--) { [A[0], A[last - 1]] = [A[last - 1], A[0]]; sift(1, last - 1); }
  return A;
}`,
    python: `def heapsort(A):
    def sift(k, size):                # 1-based position k is A[k - 1]
        v = A[k - 1]
        while 2 * k <= size:
            j = 2 * k
            if j < size and A[j - 1] < A[j]:
                j += 1
            if v >= A[j - 1]:
                break
            A[k - 1] = A[j - 1]
            k = j
        A[k - 1] = v
    n = len(A)
    for i in range(n // 2, 0, -1):
        sift(i, n)
    for last in range(n, 1, -1):
        A[0], A[last - 1] = A[last - 1], A[0]
        sift(1, last - 1)
    return A`,
    explain: "Stage 1 costs < 2n comparisons. Each of the n − 1 deletions sifts through a heap of height ⌊log₂ i⌋ with ≤ 2 comparisons per level: C(n) ≤ 2 Σ_{i=1}^{n−1} log₂ i ≤ 2n log₂ n. Total Θ(n log n) in the worst and average case, with O(1) extra space. It is not stable (equal keys can swap order).",
  },
  distractors: ["SiftDown(A, 1, n)", "for last ← n downto 1 do", "for i ← 1 to ⌊n/2⌋ do"],
  followUp: "Introsort (C++ std::sort) starts with quicksort and switches to heapsort when recursion gets too deep — getting quicksort's speed with heapsort's worst-case guarantee. Heapsort's weakness is cache behavior: its jumps between i and 2i miss the cache on big arrays.",
  complexity: "Θ(n log n) worst & average, in place, not stable",
  visual: "sims/heap-lab.html",
  lesson: "lessons/06-transform-and-conquer/README.md",
});

ForgeProblems.add({
  id: "bst-insert-inorder",
  title: "Build a Binary Search Tree, Read It In Order",
  level: 3, chapter: 6, difficulty: 1,
  topics: ["binary search trees", "recursion", "tree traversal", "records"],
  strategy: "Representation change (search tree)",
  source: "Levitin §6.3 & Lecture 6 (BST insertion, inorder traversal)",
  summary: "Insert keys one by one into a binary search tree; return its inorder traversal and height.",
  statement: `
<p>A <b>Binary Search Tree (BST)</b> keeps every key in a node's left subtree smaller than the node's key and every key in
its right subtree greater or equal. Inserting a key means searching for it and hanging a new leaf where the search fell off
the tree. Bonus: an <b>inorder</b> traversal (left subtree, node, right subtree) lists the keys in sorted order — that's
"treesort".</p>
<p>Write <code>BSTInOrder(K)</code>: insert the keys <code>K[0], K[1], …</code> in that order into an initially empty BST
(a key equal to a node's key goes into its <b>right</b> subtree), then return <code>[inorder, height]</code> — the list
of keys in inorder and the tree's height (an empty tree has height −1, a single node 0).</p>
<p>Make nodes as records: <code>t ← new Node</code>, then <code>t.key ← k</code>; a missing child reads as
<code>null</code>. The built-in <code>sorted</code> is not allowed.</p>`,
  entry: "BSTInOrder",
  params: ["K"],
  tests: [
    { args: [[5, 3, 1, 10, 12, 7, 9]], expect: [[1, 3, 5, 7, 9, 10, 12], 3], explain: "The longest root-to-leaf path is 5 → 10 → 7 → 9: height 3." },
    { args: [[]], expect: [[], -1], explain: "Empty tree: nothing to list, height −1." },
    { args: [[4]], expect: [[4], 0] },
    { args: [[1, 2, 3, 4, 5]], expect: [[1, 2, 3, 4, 5], 4], explain: "Sorted input builds a degenerate chain — height n − 1. This is the BST's Θ(n) worst case." },
    { args: [[5, 3, 5]], expect: [[3, 5, 5], 1], explain: "The second 5 goes to the right of the root." },
    { args: [[8, 4, 12, 2, 6, 10, 14]], expect: [[2, 4, 6, 8, 10, 12, 14], 2], explain: "This insertion order builds a perfectly balanced tree." },
    { args: [[3, 3, 3]], expect: [[3, 3, 3], 2] },
    { args: [[7, 2, 9, 2, 1]], expect: [[1, 2, 2, 7, 9], 2] },
  ],
  random: { count: 25, gen: (r, i) => [r.array(i + 1, 0, i % 2 ? 10 : 100)] },
  reference: (K) => { let t = null; K.forEach((k) => { t = TS.bstInsert(t, k); }); const out = []; const walk = (x) => { if (x) { walk(x.left); out.push(x.key); walk(x.right); } }; walk(t); return [out, TS.height(t)]; },
  forbid: ["sorted"],
  mutants: [
    { fn: (K) => { let t = null; K.forEach((k) => { t = TS.bstInsert(t, k); }); const out = []; const walk = (x) => { if (x) { walk(x.left); out.push(x.key); walk(x.right); } }; walk(t); return [out, TS.height(t) + 1]; }, hint: "Your heights are one too big: you're counting NODES on the longest path. Height counts EDGES — a single node has height 0 and the empty tree −1." },
    { fn: (K) => { let t = null; const ins = (x, k) => { if (!x) return N(k); if (k < x.key) x.left = ins(x.left, k); else if (k > x.key) x.right = ins(x.right, k); return x; }; K.forEach((k) => { t = ins(t, k); }); const out = []; const walk = (x) => { if (x) { walk(x.left); out.push(x.key); walk(x.right); } }; walk(t); return [out, TS.height(t)]; }, hint: "Duplicate keys disappear. This tree stores every key — when k equals the node's key, keep going into the RIGHT subtree instead of ignoring it." },
    { fn: (K) => { let t = null; K.forEach((k) => { t = TS.bstInsert(t, k); }); const out = []; const walk = (x) => { if (x) { out.push(x.key); walk(x.left); walk(x.right); } }; walk(t); return [out, TS.height(t)]; }, hint: "Your list is in PREorder (node first). Inorder visits the left subtree, THEN the node, then the right subtree — that's what makes it sorted." },
    { fn: (K) => { let t = null; const ins = (x, k) => { if (!x) return N(k); if (k <= x.key) x.left = ins(x.left, k); else x.right = ins(x.right, k); return x; }; K.forEach((k) => { t = ins(t, k); }); const out = []; const walk = (x) => { if (x) { walk(x.left); out.push(x.key); walk(x.right); } }; walk(t); return [out, TS.height(t)]; }, hint: "Equal keys are going LEFT. The rule here is: k < t.key goes left, otherwise (including equal) right — it changes the tree's shape and height." },
  ],
  hints: [
    "Insertion is a search that fails: follow left/right from the root comparing k with each key; where you'd step onto null, that's where the new node belongs.",
    "Write three helpers: Insert(t, k) returns the (new) root of subtree t after inserting k; InOrder(t, out) appends keys left–node–right; Height(t) is −1 for null, else 1 + max of the children's heights.",
    "Insert(t, k): if t = null, make a new node with key k and return it; if k < t.key then t.left ← Insert(t.left, k) else t.right ← Insert(t.right, k); return t.",
  ],
  starter: {
    pseudo: `ALGORITHM BSTInOrder(K[0..n-1])
    root ← null
    for i ← 0 to n - 1 do
        root ← Insert(root, K[i])
    out ← []
    ...
    return [out, Height(root)]

ALGORITHM Insert(t, k)
    ...

ALGORITHM Height(t)
    ...`,
    js: `function BSTInOrder(K) {
  // nodes as {key, left, right}; return [inorderList, height]
}`,
  },
  solution: {
    pseudo: `ALGORITHM BSTInOrder(K[0..n-1])
    root ← null
    for i ← 0 to n - 1 do
        root ← Insert(root, K[i])
    out ← []
    InOrder(root, out)
    return [out, Height(root)]

ALGORITHM Insert(t, k)
    if t = null then
        t ← new Node
        t.key ← k
    else if k < t.key then
        t.left ← Insert(t.left, k)
    else
        t.right ← Insert(t.right, k)
    return t

ALGORITHM InOrder(t, out)
    if t ≠ null then
        InOrder(t.left, out)
        append(out, t.key)
        InOrder(t.right, out)

ALGORITHM Height(t)
    if t = null then return -1
    return 1 + max(Height(t.left), Height(t.right))`,
    js: `function BSTInOrder(K) {
  const insert = (t, k) => {
    if (!t) return { key: k, left: null, right: null };
    if (k < t.key) t.left = insert(t.left, k); else t.right = insert(t.right, k);
    return t;
  };
  let root = null;
  for (const k of K) root = insert(root, k);
  const out = [];
  const inorder = (t) => { if (t) { inorder(t.left); out.push(t.key); inorder(t.right); } };
  const height = (t) => (t ? 1 + Math.max(height(t.left), height(t.right)) : -1);
  inorder(root);
  return [out, height(root)];
}`,
    python: `def bst_inorder(K):
    def insert(t, k):
        if t is None:
            return {"key": k, "left": None, "right": None}
        side = "left" if k < t["key"] else "right"
        t[side] = insert(t[side], k)
        return t
    root = None
    for k in K:
        root = insert(root, k)
    out = []
    def inorder(t):
        if t:
            inorder(t["left"]); out.append(t["key"]); inorder(t["right"])
    def height(t):
        return -1 if t is None else 1 + max(height(t["left"]), height(t["right"]))
    inorder(root)
    return [out, height(root)]`,
    explain: "Each insertion costs one comparison per level, so building costs Σ depth(k) — Θ(n log n) on average for random orders but Θ(n²) for sorted input (height n − 1). The inorder walk visits each node once: Θ(n). The height is exactly what balanced trees (Adelson-Velsky–Landis (AVL) trees, 2-3 trees) keep at Θ(log n).",
  },
  distractors: ["if k ≤ t.key then", "append(out, t.key)", "if t = null then return 0"],
  followUp: "Sorted inserts turning a BST into a linked list is a real production failure mode (e.g. auto-increment ids as keys). That's why real ordered maps (Java TreeMap, C++ std::map) are red-black trees, and databases use B-trees.",
  complexity: "Θ(n log n) average, Θ(n²) worst (sorted input)",
  visual: "sims/search-trees.html",
  lesson: "lessons/06-transform-and-conquer/README.md",
});

ForgeProblems.add({
  id: "avl-is-balanced",
  title: "Is It an AVL Tree (Adelson-Velsky–Landis)?",
  level: 3, chapter: 6, difficulty: 3,
  topics: ["AVL trees", "binary search trees", "recursion", "balanced trees"],
  strategy: "Postorder recursion (heights bottom-up)",
  source: "Levitin §6.3 & Exercise 6.3.1 (adapted)",
  summary: "Check the binary-search-tree property with key ranges AND |balance factor| ≤ 1 at every node, in one Θ(n) pass.",
  statement: `
<p>An <b>Adelson-Velsky–Landis (AVL) tree</b> is a Binary Search Tree (BST) in which, at <b>every</b> node, the heights of the
left and right subtrees differ by at most 1 (the <i>balance factor</i> is −1, 0 or +1; the empty tree has height −1).
That rule keeps the height below about 1.44 log₂ n, so search and insertion stay logarithmic.</p>
<p>Write <code>IsAVL(T)</code> that returns <code>true</code> if the tree is an AVL tree and <code>false</code> otherwise.
Both parts count:</p>
<ul>
<li><b>BST property</b> (keys are distinct): <i>every</i> key in a node's left subtree is smaller than the node's key, and
<i>every</i> key in its right subtree is larger — not just the children;</li>
<li><b>balance</b> at every node.</li>
</ul>
<p><b>Input:</b> <code>T</code> is the root record <code>{key, left, right}</code> (children are records or <code>null</code>);
<code>T = null</code> is the empty tree (an AVL tree). Read fields with <code>t.key</code>, <code>t.left</code>, <code>t.right</code>.</p>
<p><b>Efficiency:</b> must be <b>Θ(n)</b> — compute each subtree's height once, bottom-up, instead of recomputing heights at every node.</p>`,
  entry: "IsAVL",
  params: ["T"],
  tests: [
    { args: [N(4, N(2, N(1), N(3)), N(6, N(5), N(7)))], expect: true, explain: "A perfect tree: every balance factor is 0." },
    { args: [N(1, null, N(2, null, N(3)))], expect: false, explain: "The root's left height is −1 and right height is 1: balance factor −2." },
    { args: [N(10, N(5, null, N(12)), N(15))], expect: false, explain: "Balanced, and each child is on the correct side of its parent — but 12 sits in 10's LEFT subtree. Check whole key ranges, not just parent/child." },
    { args: [null], expect: true, explain: "The empty tree is an AVL tree." },
    { args: [N(5, N(7), N(8))], expect: false, explain: "Perfectly balanced but not a BST (7 > 5 on the left)." },
    { args: [N(10, N(5, N(3, N(1))), N(15, null, N(20, null, N(25))))], expect: false, explain: "The root looks balanced (2 vs 2), but node 5 has heights 1 vs −1 — every node must be checked." },
    { args: [N(8)], expect: true },
    { args: [N(8, N(5, N(3, N(2)), N(7)), N(10, null, N(11)))], expect: true, explain: "A tree where several nodes have balance factor ±1 — still AVL." },
  ],
  random: {
    count: 30,
    gen: (r, i) => {
      const n = 1 + (i % 20);
      const keys = r.distinct(n, 1, 99).sort((a, b) => a - b);
      const t = TS.balanced(keys);
      if (i % 4 === 1) { const extra = r.distinct(3, 100, 140); extra.forEach((k) => TS.bstInsert(t, k)); } // may unbalance
      if (i % 4 === 2 && n > 2) { // swap two keys: breaks the BST property somewhere
        const nodes = []; const walk = (x) => { if (x) { nodes.push(x); walk(x.left); walk(x.right); } }; walk(t);
        const a = r.pick(nodes), b = r.pick(nodes); [a.key, b.key] = [b.key, a.key];
      }
      return [t];
    },
  },
  reference: (T) => { const chk = (t, lo, hi) => { if (!t) return -1; if (t.key <= lo || t.key >= hi) return -2; const a = chk(t.left, lo, t.key); if (a === -2) return -2; const b = chk(t.right, t.key, hi); if (b === -2) return -2; if (Math.abs(a - b) > 1) return -2; return 1 + Math.max(a, b); }; return chk(T, -Infinity, Infinity) !== -2; },
  growth: { metric: "steps", sizes: [15, 31, 63, 127, 255], gen: (r, n) => [TS.balanced(Array.from({ length: n }, (_, k) => 2 * k + 1))], expect: "n" },
  mutants: [
    { fn: (T) => { const bst = (t, lo, hi) => !t || (t.key > lo && t.key < hi && bst(t.left, lo, t.key) && bst(t.right, t.key, hi)); return bst(T, -Infinity, Infinity) && (!T || Math.abs(TS.height(T.left) - TS.height(T.right)) <= 1); }, hint: "You check the balance factor only at the root. The AVL condition must hold at EVERY node — compute it for each subtree as you return from the recursion." },
    { fn: (T) => { const h = (t) => { if (!t) return -1; const a = h(t.left), b = h(t.right); if (a === -2 || b === -2 || Math.abs(a - b) > 1) return -2; return 1 + Math.max(a, b); }; return h(T) !== -2; }, hint: "Balance is checked, but not the search-tree order. An AVL tree is a BST first: pass down the allowed key range (lo, hi) and require lo < t.key < hi." },
    { fn: (T) => { const h = (t) => { if (!t) return -1; if ((t.left && t.left.key >= t.key) || (t.right && t.right.key <= t.key)) return -2; const a = h(t.left), b = h(t.right); if (a === -2 || b === -2 || Math.abs(a - b) > 1) return -2; return 1 + Math.max(a, b); }; return h(T) !== -2; }, hint: "Comparing each node only with its own children is not enough: in 10 → left 5 → right 12, both parent/child pairs look fine but 12 > 10 sits in 10's left subtree. Pass the allowed range (lo, hi) down the recursion." },
  ],
  hints: [
    "Two separate conditions must hold everywhere: the BST order and the balance factor. For each, what does a node need to know from its parent, and what must it report back to its parent?",
    "Write one recursive helper Check(t, lo, hi) that returns the height of subtree t, or a special value (say −2) meaning 'not AVL'. Keys must satisfy lo < t.key < hi; the left child gets (lo, t.key), the right child (t.key, hi).",
    "In Check: if t = null return −1; test the range; hl ← Check(left…), hr ← Check(right…); if either is −2 or |hl − hr| > 1 return −2; else return 1 + max(hl, hr). IsAVL returns Check(T, −∞, ∞) ≠ −2.",
  ],
  starter: {
    pseudo: `ALGORITHM IsAVL(T)
    // T: root record {key, left, right} or null
    return Check(T, -∞, ∞) ≠ -2

ALGORITHM Check(t, lo, hi)
    // height of subtree t, or -2 if it is not an AVL tree with keys strictly between lo and hi
    if t = null then return -1
    ...`,
    js: `function IsAVL(T) {
  // T = {key, left, right} or null
}`,
  },
  solution: {
    pseudo: `ALGORITHM IsAVL(T)
    return Check(T, -∞, ∞) ≠ -2

ALGORITHM Check(t, lo, hi)
    if t = null then return -1
    if t.key ≤ lo or t.key ≥ hi then return -2
    hl ← Check(t.left, lo, t.key)
    if hl = -2 then return -2
    hr ← Check(t.right, t.key, hi)
    if hr = -2 then return -2
    if |hl - hr| > 1 then return -2
    return 1 + max(hl, hr)`,
    js: `function IsAVL(T) {
  const check = (t, lo, hi) => {
    if (!t) return -1;
    if (t.key <= lo || t.key >= hi) return -2;
    const hl = check(t.left, lo, t.key); if (hl === -2) return -2;
    const hr = check(t.right, t.key, hi); if (hr === -2) return -2;
    if (Math.abs(hl - hr) > 1) return -2;
    return 1 + Math.max(hl, hr);
  };
  return check(T, -Infinity, Infinity) !== -2;
}`,
    python: `def is_avl(T):
    def check(t, lo, hi):
        if t is None:
            return -1
        if not (lo < t["key"] < hi):
            return -2
        hl = check(t["left"], lo, t["key"])
        if hl == -2:
            return -2
        hr = check(t["right"], t["key"], hi)
        if hr == -2 or abs(hl - hr) > 1:
            return -2
        return 1 + max(hl, hr)
    return check(T, float("-inf"), float("inf")) != -2`,
    explain: "Each node is visited once and does O(1) work after its children report their heights (a postorder traversal): T(n) = T(n_L) + T(n_R) + Θ(1) = Θ(n). Recomputing Height() separately at every node would cost Θ(n log n) on balanced trees and Θ(n²) on chains.",
  },
  distractors: ["if t.left.key > t.key then return -2", "if |hl - hr| ≥ 1 then return -2", "hr ← Check(t.right, lo, t.key)"],
  followUp: "The 'return a height or a failure sentinel' trick is the standard Θ(n) solution to LeetCode 'Balanced Binary Tree' and 'Validate BST' combined. Real AVL implementations store the height (or balance factor) in each node so that an insertion only updates the O(log n) nodes on its path and fixes them with rotations.",
  complexity: "Θ(n)",
  visual: "sims/search-trees.html",
  lesson: "lessons/06-transform-and-conquer/README.md",
});

/* =====================================================================
   §6.5 Horner's rule & binary exponentiation · §6.6 Problem reduction
   ===================================================================== */

const hornerEval = (P, x) => { let p = P[P.length - 1]; for (let i = P.length - 2; i >= 0; i--) p = x * p + P[i]; return p; };
const powBits = (a, bits, m, opt = {}) => { // a^n mod m, n given by bits (MSB first), exact with BigInt
  const M = BigInt(m), A = BigInt(a);
  let prod = opt.noInitMod ? A : A % M;
  const start = opt.fromZero ? 0 : 1;
  for (let i = start; i < bits.length; i++) {
    if (opt.mulFirst) { if (bits[i] === 1) prod = (prod * A) % M; prod = (prod * prod) % M; }
    else { prod = (prod * prod) % M; if (bits[i] === 1) prod = (prod * A) % M; }
  }
  return Number(prod);
};
const bitsOf = (n) => n.toString(2).split("").map(Number);
const lcm2 = (a, b) => (a / TS.gcd(a, b)) * b;
const matPow = (M, k) => { let P = M.map((r) => r.slice()); for (let s = 2; s <= k; s++) P = TS.matMul(P, M); return P; };

ForgeProblems.add({
  id: "horner",
  title: "Horner's Rule",
  level: 3, chapter: 6, difficulty: 1,
  topics: ["polynomials", "Horner's rule", "representation change"],
  strategy: "Representation change (nested form)",
  source: "Levitin §6.5 (Horner)",
  summary: "Evaluate a polynomial with exactly one multiplication and one addition per coefficient.",
  statement: `
<p>Rewriting a polynomial in <b>nested form</b> — e.g. 3x³ − 2x² + 7 = ((3·x − 2)·x + 0)·x + 7 — is a
<b>representation change</b> that makes evaluation optimal: n multiplications and n additions for degree n.
Horner's rule is also how checksums, hashing of strings and number-base conversion work.</p>
<p>Write <code>Horner(P, x)</code>: <code>P[0..n]</code> holds the coefficients from the <b>lowest</b> degree to the
highest (<code>P[i]</code> is the coefficient of xⁱ), and you return p(x). Results are compared with a small tolerance.</p>
<p><b>Budget:</b> at most <b>2n + 2</b> arithmetic operations (every +, −, × and ÷ counts, including index math such as
<code>n − 1</code>). Powers and <code>pow</code> are not needed — and computing xⁱ separately for each term blows the budget.</p>`,
  entry: "Horner",
  params: ["P", "x"],
  compare: "float",
  tests: [
    { args: [[7, 0, -2, 3], 2], expect: 23, explain: "3·2³ − 2·2² + 0·2 + 7 = 24 − 8 + 7 = 23; nested: ((3·2 − 2)·2 + 0)·2 + 7." },
    { args: [[5], 10], expect: 5, explain: "Degree 0: the polynomial is the constant 5." },
    { args: [[4, -1, 6, 2], 0], expect: 4, explain: "At x = 0 only P[0] survives." },
    { args: [[1, 1, 1, 1], -1], expect: 0, explain: "1 − 1 + 1 − 1 = 0." },
    { args: [[2, 3, 5, 7, 11], 1], expect: 28, explain: "At x = 1 you get the sum of the coefficients." },
    { args: [[1, 2, 4], 0.5], expect: 3, explain: "Works for fractional x too." },
    { args: [[-5, 1, 3, -1, 2], 3], expect: 160 },
    { args: [[0, 0, 0, 1], -2], expect: -8 },
  ],
  random: { count: 25, gen: (r, i) => [r.array(1 + (i % 9), -9, 9), r.int(-4, 4)] },
  reference: (P, x) => hornerEval(P, x),
  forbid: ["pow"],
  budget: { metric: "arithmetic", label: "arithmetic operations", limit: (P) => 2 * (P.length - 1) + 2, hint: "Horner needs exactly one multiplication and one addition per coefficient: p ← x·p + P[i]. Keep extra arithmetic (like P[n − i] or a separate power variable) out of the loop — let the loop variable run i ← n − 1 downto 0." },
  mutants: [
    { fn: (P, x) => hornerEval(P.slice().reverse(), x), hint: "You're treating P[0] as the HIGHEST coefficient. Here P[i] is the coefficient of xⁱ, so start with p ← P[n] and fold in P[n − 1], …, P[0]." },
    { fn: (P, x) => { let p = P[P.length - 1]; for (let i = P.length - 1; i >= 0; i--) p = x * p + P[i]; return p; }, hint: "The leading coefficient P[n] is used twice: you start with p ← P[n] and then the loop starts at i = n again. Start the loop at n − 1." },
    { fn: (P, x) => { let p = 0; for (let i = P.length - 2; i >= 0; i--) p = x * p + P[i]; return p; }, hint: "The leading coefficient P[n] never makes it in. Either start with p ← P[n] and loop from n − 1, or start with p ← 0 and loop from n." },
  ],
  hints: [
    "Factor x out of everything except the constant term, then again inside the parentheses. What single step repeats at every level of nesting?",
    "Start with the highest coefficient and walk down to P[0]; at every step 'multiply what you have by x, then add the next coefficient'.",
    "p ← P[n]; for i ← n − 1 downto 0 do p ← x · p + P[i]; return p.",
  ],
  starter: {
    pseudo: `ALGORITHM Horner(P[0..n], x)
    // P[i] = coefficient of x^i. Returns p(x).
    p ← ...
    for i ← ... do
        ...
    return p`,
    js: `function Horner(P, x) {
  // P[i] is the coefficient of x^i
}`,
  },
  solution: {
    pseudo: `ALGORITHM Horner(P[0..n], x)
    p ← P[n]
    for i ← n - 1 downto 0 do
        p ← x * p + P[i]
    return p`,
    js: `function Horner(P, x) {
  const n = P.length - 1;
  let p = P[n];
  for (let i = n - 1; i >= 0; i--) p = x * p + P[i];
  return p;
}`,
    python: `def horner(P, x):
    p = P[-1]
    for c in reversed(P[:-1]):
        p = x * p + c
    return p`,
    explain: "Loop invariant: after processing P[i], p equals the polynomial formed by coefficients P[i..n] (degree n − i). The loop runs n times with one × and one +: M(n) = A(n) = n. Even computing the single term aₙxⁿ by brute force takes n multiplications, and Horner's rule is known to be optimal for evaluating a general polynomial.",
  },
  distractors: ["for i ← n downto 0 do", "p ← p + P[i] * x", "p ← 0"],
  followUp: "Horner's intermediate values are the coefficients of p(x) ÷ (x − x₀) — synthetic division for free (Levitin §6.5). The same loop, h ← h·B + char, is the polynomial rolling hash behind Rabin–Karp and Java's String.hashCode.",
  complexity: "Θ(n): n multiplications + n additions",
  visual: "sims/horner-binexp.html",
  lesson: "lessons/06-transform-and-conquer/README.md",
});

ForgeProblems.add({
  id: "binary-exponentiation-lr",
  title: "Left-to-Right Binary Exponentiation (mod m)",
  level: 3, chapter: 6, difficulty: 2,
  topics: ["exponentiation", "binary representation", "modular arithmetic", "Horner's rule"],
  strategy: "Representation change (binary digits of n)",
  source: "Levitin §6.5 (LeftRightBinaryExponentiation)",
  summary: "Compute aⁿ mod m by scanning n's bits left to right: square, and multiply by a on a 1-bit.",
  statement: `
<p>Computing aⁿ with n − 1 multiplications is hopeless when n has hundreds of bits — yet that is exactly what
Rivest–Shamir–Adleman (RSA) encryption and primality tests need. Apply Horner's rule to the binary digits of n and each bit
turns into "<b>square</b> the accumulator, and if the bit is 1, <b>multiply by a</b>".</p>
<p>Write <code>BinExpLR(a, b, m)</code>: <code>b</code> is the list of binary digits of the exponent n ≥ 1,
<b>most significant first</b> (so <code>b[0] = 1</code>; e.g. 13 = 1101₂ is <code>[1, 1, 0, 1]</code>), and
<code>m ≥ 2</code> is the modulus. Return <b>aⁿ mod m</b>. Reduce mod m after every multiplication so the numbers stay small
(0 ≤ a ≤ 10⁷, m ≤ 10⁶).</p>
<p><b>Budget:</b> with I = (number of bits) − 1, at most <b>4I + 2</b> arithmetic operations (each × and each
<code>mod</code> counts, as does index math).</p>`,
  entry: "BinExpLR",
  params: ["a", "b", "m"],
  tests: [
    { args: [3, [1, 1, 0, 1], 1000], expect: 323, explain: "3¹³ = 1,594,323. Bits 1,1,0,1: a → a²·a = a³ → (a³)² = a⁶ → (a⁶)²·a = a¹³." },
    { args: [2, [1], 7], expect: 2, explain: "n = 1: just a mod m." },
    { args: [10, [1], 7], expect: 3, explain: "Even for n = 1, reduce: 10 mod 7 = 3." },
    { args: [5, [1, 0, 1], 13], expect: 5, explain: "5⁵ = 3125 = 240·13 + 5." },
    { args: [0, [1, 1], 5], expect: 0 },
    { args: [2, [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 1000007], expect: powBits(2, bitsOf(1024), 1000007), explain: "2¹⁰²⁴ mod 1,000,007 — ten squarings, never a huge number." },
    { args: [7, bitsOf(1048575), 999983], expect: powBits(7, bitsOf(1048575), 999983), explain: "n = 2²⁰ − 1: twenty 1-bits, so every step squares AND multiplies." },
    { args: [123456, [1, 0, 1, 1, 0], 997], expect: powBits(123456, [1, 0, 1, 1, 0], 997) },
  ],
  random: { count: 30, gen: (r, i) => [r.int(0, i % 3 ? 1000 : 10000000), bitsOf(r.int(1, 2 ** (1 + (i % 24)))), r.int(2, 1000000)] },
  reference: (a, b, m) => powBits(a, b, m),
  budget: { metric: "arithmetic", label: "arithmetic operations", limit: (a, b) => 4 * (b.length - 1) + 2, hint: "Per remaining bit you need at most: one squaring + one mod, and (for a 1-bit) one multiplication by a + one mod. Start with product ← a mod m and loop over bits b[1..I] — don't rebuild n or loop n times." },
  mutants: [
    { fn: (a, b, m) => powBits(a, b.slice().reverse(), m), hint: "You scan the bits in the wrong direction. b[0] is the MOST significant bit: left-to-right exponentiation starts at b[0] (the accumulator's initial a) and goes b[1], b[2], … to the end." },
    { fn: (a, b, m) => powBits(a, b, m, { mulFirst: true }), hint: "Order matters: for each bit, first SQUARE the accumulator, then multiply by a if the bit is 1. Multiplying first means that factor of a gets squared too." },
    { fn: (a, b, m) => powBits(a, b, m, { fromZero: true }), hint: "The leading 1-bit is counted twice. The accumulator already starts at a (that's b[0]); the loop must begin at the NEXT bit, b[1]. (Alternatively start product ← 1 and loop from b[0].)" },
    { fn: (a, b, m) => powBits(a, b, m, { noInitMod: true }), hint: "When the exponent is 1 your answer isn't reduced: start with product ← a mod m, not a." },
  ],
  hints: [
    "Write n in binary. If you already have a^p for the bits read so far, what is the power after appending one more bit (0 or 1)? Think p → 2p or 2p + 1.",
    "product ← a mod m (that accounts for the leading 1). For each following bit: product ← product² mod m, and if the bit is 1, product ← product · a mod m.",
    "for i ← 1 to I do: product ← (product · product) mod m; if b[i] = 1 then product ← (product · a) mod m.",
  ],
  starter: {
    pseudo: `ALGORITHM BinExpLR(a, b[0..I], m)
    // b: binary digits of n, most significant first (b[0] = 1). Returns a^n mod m.
    product ← ...
    for i ← ... do
        ...
    return product`,
    js: `function BinExpLR(a, b, m) {
  // b[0] is the most significant bit of n
}`,
  },
  solution: {
    pseudo: `ALGORITHM BinExpLR(a, b[0..I], m)
    product ← a mod m
    for i ← 1 to I do
        product ← (product * product) mod m
        if b[i] = 1 then
            product ← (product * a) mod m
    return product`,
    js: `function BinExpLR(a, b, m) {
  let product = a % m;
  for (let i = 1; i < b.length; i++) {
    product = (product * product) % m;
    if (b[i] === 1) product = (product * a) % m;
  }
  return product;
}`,
    python: `def bin_exp_lr(a, b, m):
    product = a % m
    for bit in b[1:]:
        product = product * product % m
        if bit == 1:
            product = product * a % m
    return product`,
    explain: "By Horner's rule on the bits, after reading b[0..i] the exponent so far is p_i = 2p_{i−1} + b_i, and a^{2p + b} = (a^p)²·a^b — exactly one squaring and an optional multiplication. With B = number of bits, the multiplications satisfy B − 1 ≤ M(n) ≤ 2(B − 1), and B − 1 = ⌊log₂ n⌋: Θ(log n) instead of n − 1.",
  },
  distractors: ["for i ← 0 to I do", "product ← (product * a) mod m", "product ← 1"],
  followUp: "Right-to-left binary exponentiation (a^(2^i) terms) needs no explicit bit list — just n mod 2 and n div 2 — and is what most libraries implement (Python's pow(a, n, m)). The same squaring idea computes Fibonacci numbers via 2 × 2 matrix powers in Θ(log n).",
  complexity: "Θ(log n) multiplications",
  visual: "sims/horner-binexp.html",
  lesson: "lessons/06-transform-and-conquer/README.md",
});

ForgeProblems.add({
  id: "lcm-via-gcd",
  title: "Least Common Multiple via GCD",
  level: 3, chapter: 6, difficulty: 1,
  topics: ["problem reduction", "Euclid's algorithm", "number theory"],
  strategy: "Problem reduction",
  source: "Levitin §6.6 (Computing the Least Common Multiple) & Exercise 6.6.1",
  summary: "Reduce the least common multiple to the Greatest Common Divisor (GCD): lcm(m, n) = m · n / gcd(m, n), folded over a list with Euclid's algorithm.",
  statement: `
<p>The <b>Least Common Multiple (LCM)</b> of some positive integers is the smallest positive integer divisible by all of them —
when do several periodic jobs (every 4, 6 and 10 minutes) next run together? Instead of searching multiples, use
<b>problem reduction</b>: the LCM of two numbers follows from their <b>Greatest Common Divisor (GCD)</b>,
lcm(m, n) = m · n / gcd(m, n), and Euclid's algorithm computes the GCD in O(log n) steps.</p>
<p>Write <code>LCM(A)</code> that returns the LCM of all numbers in the list <code>A</code> (1 ≤ length ≤ 8, each value
between 1 and 30). Write your own <code>GCD(m, n)</code> helper algorithm (Euclid: gcd(m, n) = gcd(n, m mod n)).</p>
<p><b>Budget:</b> the grader limits the number of steps to what a few Euclid runs need — stepping through multiples is too slow.</p>`,
  entry: "LCM",
  params: ["A"],
  tests: [
    { args: [[4, 6, 10]], expect: 60, explain: "lcm(4, 6) = 12, then lcm(12, 10) = 60." },
    { args: [[12, 18]], expect: 36, explain: "gcd(12, 18) = 6, so 12 · 18 / 6 = 36." },
    { args: [[7]], expect: 7, explain: "One number is its own LCM." },
    { args: [[2, 4, 8]], expect: 8 },
    { args: [[7, 9, 11]], expect: 693, explain: "Pairwise coprime: the LCM is the product." },
    { args: [[6, 10, 15]], expect: 30, explain: "Not 6·10·15 / gcd(6, 10, 15) = 900 — the two-number formula doesn't extend that way." },
    { args: [[1, 1, 1]], expect: 1 },
    { args: [[30, 29, 28, 27, 26, 25, 23, 19]], expect: [30, 29, 28, 27, 26, 25, 23, 19].reduce(lcm2) },
  ],
  random: { count: 30, gen: (r, i) => [r.array(1 + (i % 8), 1, 30)] },
  reference: (A) => A.reduce(lcm2),
  budget: { metric: "steps", label: "steps", limit: (A) => 30 + A.length * (20 + 8 * Math.ceil(Math.log2(A.reduce(lcm2) + 1))), hint: "Don't search through multiples. Reduce to GCD: result ← result div GCD(result, A[i]) · A[i], where GCD is Euclid's algorithm (each loop iteration at least halves the numbers every two steps)." },
  mutants: [
    { fn: (A) => A.reduce((x, y) => x * y, 1) / A.reduce(TS.gcd), hint: "product ÷ gcd works for TWO numbers only. For [6, 10, 15] it gives 900, but the answer is 30. Fold the two-number formula through the list: result ← lcm(result, A[i])." },
    { fn: (A) => A.reduce((x, y) => x * y, 1), hint: "You return the product of the numbers — that's a common multiple, but not the LEAST one when numbers share factors. Divide by the GCD at each step." },
    { fn: (A) => (A.length === 1 ? A[0] : lcm2(A[A.length - 2], A[A.length - 1])), hint: "Only the last two numbers affect your answer. Carry the running LCM forward: combine result (not A[i − 1]) with A[i]." },
    { fn: (A) => A.reduce(TS.gcd), hint: "That's the GCD, not the LCM. Use the GCD to compute lcm(m, n) = m div gcd(m, n) · n." },
  ],
  hints: [
    "Write m and n as products of primes. Which primes (and powers) must a common multiple contain? How do gcd(m, n) and lcm(m, n) relate to m · n?",
    "Reduce to Euclid: write GCD(m, n) (while n ≠ 0: (m, n) ← (n, m mod n)). Then fold over the list: result ← A[0]; for each next x, result ← lcm(result, x).",
    "result ← result div GCD(result, A[i]) * A[i] (divide first so intermediate numbers stay small).",
  ],
  starter: {
    pseudo: `ALGORITHM LCM(A[0..k-1])
    // Output: the least common multiple of A[0..k-1]
    result ← A[0]
    for i ← 1 to k - 1 do
        ...
    return result

ALGORITHM GCD(m, n)
    // Euclid's algorithm
    ...`,
    js: `function LCM(A) {
  // reduce to gcd
}`,
  },
  solution: {
    pseudo: `ALGORITHM LCM(A[0..k-1])
    result ← A[0]
    for i ← 1 to k - 1 do
        result ← result div GCD(result, A[i]) * A[i]
    return result

ALGORITHM GCD(m, n)
    while n ≠ 0 do
        r ← m mod n
        m ← n
        n ← r
    return m`,
    js: `function LCM(A) {
  const gcd = (m, n) => { while (n !== 0) { [m, n] = [n, m % n]; } return m; };
  let result = A[0];
  for (let i = 1; i < A.length; i++) result = (result / gcd(result, A[i])) * A[i];
  return result;
}`,
    python: `from math import gcd   # or write Euclid's loop yourself

def lcm_list(A):
    result = A[0]
    for x in A[1:]:
        result = result // gcd(result, x) * x
    return result`,
    explain: "For each prime, gcd takes the smaller exponent and lcm the larger, so gcd(m, n) · lcm(m, n) = m · n. lcm is associative, so folding over the list is correct. Each Euclid call is O(log n), giving O(k log L) overall (L = the answer) — versus up to L / max(A) candidates for searching multiples.",
  },
  distractors: ["result ← result * A[i]", "result ← GCD(result, A[i])", "while m ≠ 0 do"],
  followUp: "Problem reduction is also how you'd compute lcm of 10⁶ numbers modulo a prime (factor each once with a sieve and keep max exponents) — and, in Chapter 11, how we PROVE problems are hard: reduce a known-hard problem to yours.",
  complexity: "O(k log L)",
  visual: "sims/euclid-gcd.html",
  lesson: "lessons/06-transform-and-conquer/README.md",
});

ForgeProblems.add({
  id: "count-paths-length-k",
  title: "Count Paths of Length k (Matrix Powers)",
  level: 3, chapter: 6, difficulty: 2,
  topics: ["problem reduction", "graphs", "adjacency matrix", "matrix multiplication"],
  strategy: "Problem reduction (to matrix multiplication)",
  source: "Levitin §6.6 (Counting Paths in a Graph) & Exercise 6.6.3",
  summary: "The number of length-k paths from i to j is entry (i, j) of Aᵏ.",
  statement: `
<p>How many different routes of exactly k hops lead from router i to router j? <b>Problem reduction</b> turns this graph
question into linear algebra: if <code>M</code> is the adjacency matrix, then entry (i, j) of <b>Mᵏ</b> counts the paths of
length k from i to j (Levitin §6.6). Here "path" means a walk: vertices and edges may repeat.</p>
<p>Write <code>CountPaths(M, i, j, k)</code>: <code>M</code> is an n × n 0/1 adjacency matrix (list of rows; directed —
an undirected graph is simply symmetric), <code>i</code> and <code>j</code> are vertex numbers (0-based) and
<code>k ≥ 1</code>. Return the number of paths of length exactly k from i to j. (n ≤ 6, k ≤ 10.)</p>`,
  entry: "CountPaths",
  params: ["M", "i", "j", "k"],
  tests: [
    { args: [[[0, 1, 1, 1], [1, 0, 1, 1], [1, 1, 0, 1], [1, 1, 1, 0]], 0, 0, 2], expect: 3, explain: "Complete graph on 4 vertices: go 0 → x → 0 for any of the 3 neighbors x." },
    { args: [[[0, 1, 0], [0, 0, 1], [1, 0, 0]], 0, 0, 3], expect: 1, explain: "Directed cycle 0 → 1 → 2 → 0: exactly one way around." },
    { args: [[[0, 1, 0], [0, 0, 1], [1, 0, 0]], 0, 0, 2], expect: 0, explain: "Two hops from 0 lands on 2, never on 0." },
    { args: [[[0, 1, 1, 1], [1, 0, 1, 1], [1, 1, 0, 1], [1, 1, 1, 0]], 0, 1, 3], expect: 7 },
    { args: [[[0, 1], [1, 0]], 0, 1, 1], expect: 1, explain: "k = 1: just the adjacency matrix entry." },
    { args: [[[1]], 0, 0, 5], expect: 1, explain: "A self-loop can be walked any number of times — one way." },
    { args: [[[0, 1, 0, 0], [1, 0, 0, 0], [0, 0, 0, 1], [0, 0, 1, 0]], 0, 2, 4], expect: 0, explain: "0 and 2 are in different components." },
    { args: [[[0, 1, 0, 1], [1, 0, 1, 0], [0, 1, 0, 1], [1, 0, 1, 0]], 0, 0, 4], expect: 8, explain: "4-cycle: 8 closed walks of length 4 from a vertex." },
  ],
  random: {
    count: 25,
    gen: (r, t) => {
      const n = 2 + (t % 5);
      const M = Array.from({ length: n }, () => Array.from({ length: n }, () => (r() < 0.4 ? 1 : 0)));
      return [M, r.int(0, n - 1), r.int(0, n - 1), 1 + (t % 8)];
    },
  },
  reference: (M, i, j, k) => matPow(M, k)[i][j],
  mutants: [
    { fn: (M, i, j, k) => matPow(M, k + 1)[i][j], hint: "You multiply one time too many (you get M^(k+1)). If P starts as M, you need only k − 1 more multiplications." },
    { fn: (M, i, j, k) => (k === 1 ? (i === j ? 1 : 0) : matPow(M, k - 1)[i][j]), hint: "You multiply one time too few (you get M^(k−1)). Starting from P ← M, multiply by M for step ← 2 to k." },
    { fn: (M, i, j, k) => (matPow(M, k)[i][j] > 0 ? 1 : 0), hint: "Your answers are only 0 or 1 — you're computing whether a path EXISTS (or/and, like Warshall's algorithm) instead of HOW MANY. Use + and × in the matrix product." },
    { fn: (M, i, j) => M[i][j], hint: "The answer never depends on k: raising each ENTRY to the k-th power isn't the matrix power. Mᵏ means multiplying the matrices: (P·M)[r][c] = Σ_t P[r][t]·M[t][c]." },
  ],
  hints: [
    "A path of length k from i to j is a path of length k − 1 from i to some vertex t, followed by an edge t → j. How does that sum over t look like a matrix product?",
    "Keep P = M^s (paths of length s). P·M counts paths of length s + 1. Start with P ← M and multiply by M until you reach length k; return P[i][j].",
    "Write a helper MatMul(X, Y): Z ← matrix(n, n, 0); for r, c, t: Z[r][c] ← Z[r][c] + X[r][t] · Y[t][c].",
  ],
  starter: {
    pseudo: `ALGORITHM CountPaths(M[0..n-1], i, j, k)
    // M: adjacency matrix. Returns the number of length-k paths from i to j.
    P ← M
    for step ← 2 to k do
        ...
    return P[i][j]

ALGORITHM MatMul(X[0..n-1], Y)
    ...`,
    js: `function CountPaths(M, i, j, k) {
  // entry (i, j) of M^k
}`,
  },
  solution: {
    pseudo: `ALGORITHM CountPaths(M[0..n-1], i, j, k)
    P ← M
    for step ← 2 to k do
        P ← MatMul(P, M)
    return P[i][j]

ALGORITHM MatMul(X[0..n-1], Y)
    Z ← matrix(n, n, 0)
    for r ← 0 to n - 1 do
        for c ← 0 to n - 1 do
            for t ← 0 to n - 1 do
                Z[r][c] ← Z[r][c] + X[r][t] * Y[t][c]
    return Z`,
    js: `function CountPaths(M, i, j, k) {
  const n = M.length;
  const mul = (X, Y) => X.map((row) => Y[0].map((_, c) => row.reduce((s, x, t) => s + x * Y[t][c], 0)));
  let P = M;
  for (let step = 2; step <= k; step++) P = mul(P, M);
  return P[i][j];
}`,
    python: `def count_paths(M, i, j, k):
    n = len(M)
    def mul(X, Y):
        return [[sum(X[r][t] * Y[t][c] for t in range(n)) for c in range(n)] for r in range(n)]
    P = M
    for _ in range(k - 1):
        P = mul(P, M)
    return P[i][j]`,
    explain: "By induction on k: (M^{k−1}·M)[i][j] = Σ_t M^{k−1}[i][t]·M[t][j] adds up, over every last-but-one vertex t, the paths of length k − 1 to t that can be extended by an edge t → j. k − 1 products of Θ(n³) each give Θ(k n³); with binary exponentiation of the matrix it drops to Θ(n³ log k).",
  },
  distractors: ["for step ← 1 to k do", "Z[r][c] ← X[r][c] * Y[r][c]", "P ← MatMul(P, P)"],
  followUp: "Combine this with binary exponentiation (repeated squaring) to get Θ(n³ log k) — the trick behind computing Fibonacci numbers, counting strings avoiding a pattern, and Markov-chain k-step probabilities. Replace (+, ×) by (min, +) and the same product computes shortest paths.",
  complexity: "Θ(k·n³) (Θ(n³ log k) with repeated squaring)",
  lesson: "lessons/06-transform-and-conquer/README.md",
});

/* =====================================================================
   §7.1 Sorting by counting (+ radix sort) · §7.2 Horspool
   ===================================================================== */

const distCount = (A, l, u, opt = {}) => {
  const D = Array(u - l + 1).fill(0);
  A.forEach((x) => D[x - l]++);
  if (opt.freq) return D;
  if (!opt.noPrefix) for (let j = 1; j <= u - l; j++) D[j] += D[j - 1];
  const S = Array(A.length).fill(0);
  for (let i = A.length - 1; i >= 0; i--) { const j = A[i] - l; S[D[j] - 1] = A[i]; if (!opt.noDec) D[j]--; }
  return S;
};
const radix = (A, d, opt = {}) => {
  const passes = opt.fewer ? d - 1 : d;
  const order = Array.from({ length: passes }, (_, p) => 10 ** p);
  if (opt.msdFirst) order.reverse();
  for (const p of order) {
    const D = Array(10).fill(0), dig = (x) => Math.floor(x / p) % 10;
    A.forEach((x) => D[dig(x)]++);
    for (let j = 1; j < 10; j++) D[j] += D[j - 1];
    const S = Array(A.length);
    if (opt.forward) for (let i = 0; i < A.length; i++) S[--D[dig(A[i])]] = A[i];
    else for (let i = A.length - 1; i >= 0; i--) S[--D[dig(A[i])]] = A[i];
    A = S;
  }
  return A;
};
const shiftTab = (P, S, opt = {}) => {
  const m = P.length, t = {};
  S.split("").forEach((c) => { t[c] = opt.defMinus1 ? m - 1 : m; });
  if (opt.firstOcc) { for (let j = m - 2; j >= 0; j--) t[P[j]] = m - 1 - j; }
  else for (let j = 0; j <= (opt.includeLast ? m - 1 : m - 2); j++) t[P[j]] = m - 1 - j;
  return S.split("").map((c) => t[c]);
};
const horspoolVar = (P, T, opt = {}) => {
  const m = P.length, n = T.length, tab = {};
  for (let j = 0; j < m - 1; j++) tab[P[j]] = m - 1 - j;
  let i = m - 1;
  while (opt.strict ? i < n - 1 : i <= n - 1) {
    let k = 0;
    while (k <= m - 1 && P[m - 1 - k] === T[i - k]) k++;
    if (k === m) return opt.rightEnd ? i : i - m + 1;
    const c = opt.badChar ? T[i - k] : T[i];
    i += tab[c] !== undefined ? tab[c] : m;
  }
  return -1;
};

ForgeProblems.add({
  id: "distribution-counting-sort",
  title: "Distribution Counting Sort",
  level: 3, chapter: 7, difficulty: 1,
  topics: ["counting sort", "space-time tradeoff", "linear sorting", "stable sorting"],
  strategy: "Input enhancement (counting)",
  source: "Levitin §7.1 (DistributionCountingSort)",
  summary: "Sort integers from a small range [l, u] in linear time with frequencies and prefix sums.",
  statement: `
<p>When keys are integers from a small known range — ages, grades, bytes, zip-code digits — you can beat the
Ω(n log n) comparison-sorting bound by never comparing keys at all. <b>Distribution counting</b> trades a table of
u − l + 1 counters for time:</p>
<ol>
<li>count how often each value occurs (<i>frequencies</i>);</li>
<li>turn the counts into running sums (<i>distribution values</i>: how many elements are ≤ each value);</li>
<li>scan A <b>from right to left</b> and drop each element into the last free slot of its block, decrementing that count.</li>
</ol>
<p>Write <code>DistCountSort(A, l, u)</code>: every element of <code>A</code> is an integer between <code>l</code> and
<code>u</code> (l ≤ u; negatives allowed). Return a new sorted array <code>S</code>. The built-in <code>sorted</code> is not
allowed.</p>
<p><b>Efficiency:</b> must be linear, Θ(n + (u − l)).</p>`,
  entry: "DistCountSort",
  params: ["A", "l", "u"],
  tests: [
    { args: [[3, 1, 2, 3, 1, 1], 1, 3], expect: [1, 1, 1, 2, 3, 3], explain: "Frequencies 3, 1, 2 → distribution values 3, 4, 6: the 1s go to slots 0–2, the 2 to slot 3, the 3s to slots 4–5." },
    { args: [[0, -2, 2, -1, 0], -2, 2], expect: [-2, -1, 0, 0, 2], explain: "Shift every key by l so that value l lands in counter 0." },
    { args: [[], 0, 5], expect: [], explain: "Nothing to sort." },
    { args: [[7], 5, 9], expect: [7] },
    { args: [[4, 4, 4, 4], 4, 4], expect: [4, 4, 4, 4], explain: "A range with a single value." },
    { args: [[9, 0], 0, 9], expect: [0, 9], explain: "The range may be much wider than n — values in between just have count 0." },
    { args: [[14, 15, 13, 14, 13, 12, 15, 13], 12, 15], expect: [12, 13, 13, 13, 14, 14, 15, 15] },
  ],
  random: { count: 25, gen: (r, i) => { const l = r.int(-10, 10), u = l + r.int(0, 12); return [r.array(i * 2, l, u), l, u]; } },
  reference: (A) => TS.asc(A),
  forbid: ["sorted"],
  growth: { metric: "steps", sizes: [32, 64, 128, 256, 512], gen: (r, n) => [r.array(n, 0, 20), 0, 20], expect: "n" },
  mutants: [
    { fn: (A, l, u) => distCount(A, l, u, { noDec: true }), hint: "Only one copy of each value shows up (and the rest of the block stays 0): after placing A[i] at S[D[j] − 1] you must decrement D[j], so the next equal key goes one slot to the left." },
    { fn: (A, l, u) => distCount(A, l, u, { noPrefix: true }), hint: "Elements collide in the first few slots: the positions must come from the running sums (distribution values), not from the raw frequencies. Add D[j] ← D[j − 1] + D[j] for j ← 1 to u − l." },
    { fn: (A, l, u) => distCount(A, l, u, { freq: true }), hint: "You return the counter array D. It's only the tool — use it to place every element of A into a new array S, and return S." },
  ],
  hints: [
    "If you knew that exactly 4 elements are ≤ 2 and exactly 1 element equals 2, which slot of the sorted array must that 2 occupy?",
    "Three passes: frequencies D[A[i] − l] += 1; running sums D[j] ← D[j − 1] + D[j]; then for i ← n − 1 downto 0 place A[i].",
    "Placement: j ← A[i] − l; S[D[j] − 1] ← A[i]; D[j] ← D[j] − 1.",
  ],
  starter: {
    pseudo: `ALGORITHM DistCountSort(A[0..n-1], l, u)
    // A: integers in [l, u]. Returns a sorted copy in Θ(n + u − l).
    D ← array(u - l + 1, 0)
    ...
    S ← array(n, 0)
    ...
    return S`,
    js: `function DistCountSort(A, l, u) {
  const D = new Array(u - l + 1).fill(0);
  const S = new Array(A.length).fill(0);
  // count, accumulate, distribute
  return S;
}`,
  },
  solution: {
    pseudo: `ALGORITHM DistCountSort(A[0..n-1], l, u)
    D ← array(u - l + 1, 0)
    for i ← 0 to n - 1 do
        D[A[i] - l] ← D[A[i] - l] + 1
    for j ← 1 to u - l do
        D[j] ← D[j - 1] + D[j]
    S ← array(n, 0)
    for i ← n - 1 downto 0 do
        j ← A[i] - l
        S[D[j] - 1] ← A[i]
        D[j] ← D[j] - 1
    return S`,
    js: `function DistCountSort(A, l, u) {
  const D = new Array(u - l + 1).fill(0);
  for (const x of A) D[x - l]++;
  for (let j = 1; j <= u - l; j++) D[j] += D[j - 1];
  const S = new Array(A.length).fill(0);
  for (let i = A.length - 1; i >= 0; i--) {
    const j = A[i] - l;
    S[D[j] - 1] = A[i];
    D[j]--;
  }
  return S;
}`,
    python: `def dist_count_sort(A, l, u):
    D = [0] * (u - l + 1)
    for x in A:
        D[x - l] += 1
    for j in range(1, u - l + 1):
        D[j] += D[j - 1]
    S = [0] * len(A)
    for x in reversed(A):
        j = x - l
        S[D[j] - 1] = x
        D[j] -= 1
    return S`,
    explain: "After the prefix sums, D[j] = number of elements ≤ l + j, which is exactly one past the last slot of value l + j's block; filling the block from its end while scanning A right-to-left keeps equal keys in their original order (stable). Two passes over A plus one over D: Θ(n + (u − l)) time and Θ(n + (u − l)) extra space — linear when the range is O(n).",
  },
  distractors: ["S[D[j]] ← A[i]", "for i ← 0 to n - 1 do", "D[j] ← D[j] + D[j + 1]"],
  followUp: "Stability is the whole point of the right-to-left pass: it's what lets radix sort use counting sort digit by digit (try radix-sort-lsd). This is also how a database sorts by a low-cardinality column, and how a histogram-based 'counting sort' sorts bytes in Θ(n).",
  complexity: "Θ(n + (u − l)) time and extra space",
  visual: "sims/sorting-studio.html",
  lesson: "lessons/07-space-time-tradeoffs/README.md",
});

ForgeProblems.add({
  id: "radix-sort-lsd",
  title: "Radix Sort (Least Significant Digit First)",
  level: 3, chapter: 7, difficulty: 2,
  topics: ["radix sort", "counting sort", "stable sorting", "linear sorting"],
  strategy: "Input enhancement (digit counting)",
  source: "CSC 501 Lecture 7 (Radix sorting) · Levitin §7.1 & §6.1 footnote",
  summary: "Sort d-digit numbers with d stable counting-sort passes, from the last digit to the first.",
  statement: `
<p><b>Least Significant Digit (LSD)</b> radix sort sorts d-digit numbers with d passes of a <b>stable</b> sort on single
digits: first by the ones digit, then the tens, then the hundreds… Because each pass is stable, after pass p the numbers
are sorted by their last p digits. With a counting sort on the 10 possible digit values, each pass is Θ(n).</p>
<p>Write <code>RadixSort(A, d)</code>: <code>A</code> holds non-negative integers with at most <code>d</code> decimal digits
(each &lt; 10<sup>d</sup>). Return the sorted array. Digit p (counting from 0 at the ones place) of x is
<code>(x div 10ᵖ) mod 10</code>. The built-in <code>sorted</code> is not allowed.</p>
<p><b>Efficiency:</b> must be Θ(d·n) — linear in n for fixed d.</p>`,
  entry: "RadixSort",
  params: ["A", "d"],
  tests: [
    { args: [[329, 457, 657, 839, 436, 720, 355], 3], expect: [329, 355, 436, 457, 657, 720, 839], explain: "After the ones pass: 720 355 436 457 657 329 839; after tens: 720 329 436 839 355 457 657; after hundreds: sorted." },
    { args: [[21, 12, 22, 11], 2], expect: [11, 12, 21, 22], explain: "Ties in the tens digit (21/22 and 12/11) must keep the order the ones pass produced — that's stability." },
    { args: [[170, 45, 75, 90, 802, 24, 2, 66], 3], expect: [2, 24, 45, 66, 75, 90, 170, 802], explain: "Short numbers simply have leading zeros." },
    { args: [[5, 3, 9], 1], expect: [3, 5, 9] },
    { args: [[], 2], expect: [] },
    { args: [[100, 10, 1], 3], expect: [1, 10, 100] },
    { args: [[31, 13, 33, 11], 2], expect: [11, 13, 31, 33] },
  ],
  random: { count: 25, gen: (r, i) => { const d = 1 + (i % 4); return [r.array(i * 2, 0, 10 ** d - 1), d]; } },
  reference: (A) => TS.asc(A),
  forbid: ["sorted"],
  growth: { metric: "steps", sizes: [32, 64, 128, 256, 512], gen: (r, n) => [r.array(n, 0, 999), 3], expect: "n" },
  mutants: [
    { fn: (A, d) => radix(A, d, { msdFirst: true }), hint: "The result is ordered by the LAST digit first. With stable passes, the digit sorted LAST becomes the most important — so start at the ones digit and finish with the most significant one." },
    { fn: (A, d) => radix(A, d, { forward: true }), hint: "Each pass reverses the order of keys with equal digits, destroying the previous passes' work: your digit sort isn't stable. When placing into slots D[j] − 1 (decrementing), scan A from RIGHT to LEFT." },
    { fn: (A, d) => radix(A, d, { fewer: true }), hint: "The most significant digit never gets sorted: you make d − 1 passes. Run exactly d passes (p = 1, 10, …, 10^(d−1))." },
  ],
  hints: [
    "Sort a deck of 2-digit cards by the ones digit, then (keeping ties in order) by the tens digit. Why does the second pass not destroy the first one?",
    "Repeat d times with p = 1, 10, 100, …: run a distribution counting sort on the digit (x div p) mod 10 (counts D[0..9], running sums, right-to-left placement into S), then A ← S.",
    "Placement step inside each pass: for i ← n − 1 downto 0: j ← (A[i] div p) mod 10; S[D[j] − 1] ← A[i]; D[j] ← D[j] − 1.",
  ],
  starter: {
    pseudo: `ALGORITHM RadixSort(A[0..n-1], d)
    // A: non-negative integers < 10^d. Returns A sorted.
    p ← 1
    for pass ← 1 to d do
        D ← array(10, 0)
        ...
        p ← p * 10
    return A`,
    js: `function RadixSort(A, d) {
  // d stable counting-sort passes, ones digit first
}`,
  },
  solution: {
    pseudo: `ALGORITHM RadixSort(A[0..n-1], d)
    p ← 1
    for pass ← 1 to d do
        D ← array(10, 0)
        for i ← 0 to n - 1 do
            D[(A[i] div p) mod 10] ← D[(A[i] div p) mod 10] + 1
        for j ← 1 to 9 do
            D[j] ← D[j - 1] + D[j]
        S ← array(n, 0)
        for i ← n - 1 downto 0 do
            j ← (A[i] div p) mod 10
            S[D[j] - 1] ← A[i]
            D[j] ← D[j] - 1
        A ← S
        p ← p * 10
    return A`,
    js: `function RadixSort(A, d) {
  let p = 1;
  for (let pass = 0; pass < d; pass++) {
    const D = new Array(10).fill(0), digit = (x) => Math.floor(x / p) % 10;
    for (const x of A) D[digit(x)]++;
    for (let j = 1; j < 10; j++) D[j] += D[j - 1];
    const S = new Array(A.length);
    for (let i = A.length - 1; i >= 0; i--) S[--D[digit(A[i])]] = A[i];
    A = S;
    p *= 10;
  }
  return A;
}`,
    python: `def radix_sort(A, d):
    p = 1
    for _ in range(d):
        D = [0] * 10
        for x in A:
            D[x // p % 10] += 1
        for j in range(1, 10):
            D[j] += D[j - 1]
        S = [0] * len(A)
        for x in reversed(A):
            j = x // p % 10
            S[D[j] - 1] = x
            D[j] -= 1
        A = S
        p *= 10
    return A`,
    explain: "Invariant: after pass t the array is sorted by the last t digits — the new pass orders by digit t, and stability keeps ties ordered by the previous t − 1 digits. Each pass is a counting sort over 10 values: Θ(n + 10), so the total is Θ(d(n + 10)) = Θ(n) for fixed d. (Levitin notes this is still ~n log n in bits, since d must be ≥ log₁₀ n for distinct keys.)",
  },
  distractors: ["for i ← 0 to n - 1 do", "p ← p * 2", "for pass ← 1 to d - 1 do"],
  followUp: "Real radix sorts use base 256 (one byte per pass) — that's how graphics processing units (GPUs) sort millions of keys and how suffix arrays are built. Most-significant-digit radix sort works too, but it must recurse into each bucket instead of doing global passes.",
  complexity: "Θ(d·(n + 10))",
  visual: "sims/sorting-studio.html",
  lesson: "lessons/07-space-time-tradeoffs/README.md",
});

ForgeProblems.add({
  id: "horspool-shift-table",
  title: "Horspool's Shift Table",
  level: 3, chapter: 7, difficulty: 1,
  topics: ["string matching", "Horspool", "input enhancement", "maps"],
  strategy: "Input enhancement (preprocess the pattern)",
  source: "Levitin §7.2 (ShiftTable)",
  summary: "For each character: its distance from the pattern's last position (rightmost occurrence among the first m − 1), else m.",
  statement: `
<p>Horspool's string-matching algorithm compares the pattern with the text <i>right to left</i> and, on a mismatch, slides the
pattern by an amount read from a precomputed <b>shift table</b> — input enhancement: spend Θ(m + alphabet) once on the
pattern to skip big parts of the text later.</p>
<p>For a pattern <code>P[0..m-1]</code>, the shift for a character c is (Levitin formula 7.1):</p>
<ul>
<li>the distance from c's <b>rightmost</b> occurrence among the <b>first m − 1</b> characters of P to the last character of P,
i.e. <code>m − 1 − j</code> for the largest such j;</li>
<li><code>m</code> if c does not occur among the first m − 1 characters (the last character of P doesn't count).</li>
</ul>
<p>Write <code>ShiftTable(P, S)</code>: <code>S</code> is a string listing the alphabet. Return a list whose k-th entry is
the shift for character <code>S[k]</code>. A map is handy: <code>Table ← map()</code>, <code>Table[c] ← …</code>.</p>`,
  entry: "ShiftTable",
  params: ["P", "S"],
  tests: [
    { args: ["BARBER", "ABEORZ_"], expect: [4, 2, 1, 6, 3, 6, 6], explain: "A is 4 from the end, B's rightmost early occurrence is 2 from the end, E is 1, R (position 2) is 3; O, Z and _ don't occur → 6." },
    { args: ["GATTACA", "ACGT"], expect: [2, 1, 6, 3], explain: "A appears at 1 and 4: the RIGHTMOST one (4) gives 7 − 1 − 4 = 2. The final A doesn't count." },
    { args: ["ABAB", "ABC"], expect: [1, 2, 4], explain: "The last B is ignored, so B's shift comes from position 1: 4 − 1 − 1 = 2 (not 0)." },
    { args: ["X", "XY"], expect: [1, 1], explain: "m = 1: no characters before the last one, every shift is 1." },
    { args: ["AAAA", "AB"], expect: [1, 4] },
    { args: ["CATCATGC", "ACGT"], expect: [3, 4, 1, 2] },
  ],
  random: { count: 25, gen: (r, i) => { const S = i % 2 ? "abcd" : "ACGT"; return [r.word(1 + (i % 9), S.slice(0, 2 + (i % 3))), S]; } },
  reference: (P, S) => shiftTab(P, S),
  mutants: [
    { fn: (P, S) => shiftTab(P, S, { includeLast: true }), hint: "Some shift is 0 — you let the LAST character of P overwrite its table entry (j = m − 1 gives m − 1 − j = 0). Only the first m − 1 characters count: loop j ← 0 to m − 2." },
    { fn: (P, S) => shiftTab(P, S, { defMinus1: true }), hint: "Characters that don't appear should shift by the full pattern length m, not m − 1 — the whole pattern can jump past that text character." },
    { fn: (P, S) => shiftTab(P, S, { firstOcc: true }), hint: "For repeated characters you keep the LEFTmost occurrence (too big a shift — it could skip a match). Scan j from left to right so the rightmost occurrence overwrites last." },
  ],
  hints: [
    "Line up the pattern's last character under a text character c. How far can you slide the pattern so that the nearest c inside the pattern (not counting the last position) lands under that text character?",
    "Initialize every character's entry to m. Then scan j ← 0 to m − 2 and overwrite Table[P[j]] ← m − 1 − j; later (righter) occurrences overwrite earlier ones.",
    "Finally build the answer: R ← []; for each c in S do append(R, Table[c]).",
  ],
  starter: {
    pseudo: `ALGORITHM ShiftTable(P[0..m-1], S)
    // S: the alphabet. Returns the list of shifts for S[0], S[1], ...
    Table ← map()
    for each c in S do
        Table[c] ← ...
    ...
    return R`,
    js: `function ShiftTable(P, S) {
  const table = {};
  // fill, then return [...S].map(c => table[c])
}`,
  },
  solution: {
    pseudo: `ALGORITHM ShiftTable(P[0..m-1], S)
    Table ← map()
    for each c in S do
        Table[c] ← m
    for j ← 0 to m - 2 do
        Table[P[j]] ← m - 1 - j
    R ← []
    for each c in S do
        append(R, Table[c])
    return R`,
    js: `function ShiftTable(P, S) {
  const m = P.length, table = {};
  for (const c of S) table[c] = m;
  for (let j = 0; j <= m - 2; j++) table[P[j]] = m - 1 - j;
  return [...S].map((c) => table[c]);
}`,
    python: `def shift_table(P, S):
    m = len(P)
    table = {c: m for c in S}
    for j in range(m - 1):
        table[P[j]] = m - 1 - j
    return [table[c] for c in S]`,
    explain: "Scanning left to right, the last write for a character comes from its rightmost occurrence in P[0..m−2], which gives the smallest safe shift — any larger shift could jump over a match. Building the table costs Θ(m + |alphabet|), paid once per pattern.",
  },
  distractors: ["for j ← 0 to m - 1 do", "Table[c] ← m - 1", "Table[P[j]] ← j"],
  followUp: "The table is indexed by character, so for bytes it's a fixed 256-entry array (Θ(1) lookups, no hashing). Boyer–Moore uses this exact table as its 'bad-symbol' shift plus a second 'good-suffix' table (Levitin §7.2) — GNU's Not Unix (GNU) grep is built on it.",
  complexity: "Θ(m + |alphabet|)",
  visual: "sims/string-match.html",
  lesson: "lessons/07-space-time-tradeoffs/README.md",
});

ForgeProblems.add({
  id: "horspool-search",
  title: "Horspool's String Matching",
  level: 3, chapter: 7, difficulty: 2,
  topics: ["string matching", "Horspool", "input enhancement"],
  strategy: "Input enhancement (shift table)",
  source: "Levitin §7.2 (HorspoolMatching)",
  summary: "Find the first occurrence of P in T comparing right-to-left and shifting by the table entry of T[i].",
  statement: `
<p>Write <code>Horspool(P, T)</code> that returns the index of the <b>first</b> occurrence of pattern <code>P</code> in text
<code>T</code> (the index of its left end), or <b>−1</b> if there is none.</p>
<p>Horspool's algorithm: build the shift table (see <i>horspool-shift-table</i>); align P's right end at text position
<code>i = m − 1</code>; compare characters <b>right to left</b>. If all m match, report <code>i − m + 1</code>; otherwise
shift by the table entry of the text character <b>aligned with the pattern's last character</b>, <code>T[i]</code> — not the
character where the mismatch happened.</p>
<p><b>Budget:</b> you may make no more character comparisons than Horspool's algorithm makes on the same input (the grader
counts every comparison involving a character of P or T). Tip: store shifts in a map and read them with
<code>get(Table, c, m)</code> (m when c is absent) — lookups aren't comparisons.</p>`,
  entry: "Horspool",
  params: ["P", "T"],
  tests: [
    { args: ["BARBER", "THE_BARBER_SHOP"], expect: 4, explain: "First alignment ends at '_' (shift 6)… the match starts at index 4." },
    { args: ["BEE", "ABEEE"], expect: 1, explain: "At i = 2, 'E' matches but 'B' ≠ 'E'. Shift by the table entry of T[2] = 'E' (1), not of the mismatched 'B' (2) — shifting by 2 jumps over the match." },
    { args: ["ABC", "XXXXABC"], expect: 4, explain: "The match touches the very end of the text." },
    { args: ["CAB", "ABRACADABRA"], expect: -1 },
    { args: ["ABC", "ABCXXX"], expect: 0 },
    { args: ["ABC", "AB"], expect: -1, explain: "Pattern longer than text." },
    { args: ["L", "HELLO"], expect: 2, explain: "m = 1: the first L." },
    { args: ["0001", "000010001"], expect: 1 },
    { args: ["acc", "bacccbbaab"], expect: 1 },
  ],
  random: {
    count: 30,
    gen: (r, i) => {
      const al = i % 2 ? "ab" : "abc";
      const T = r.word(5 + (i % 40), al);
      const m = 1 + (i % 5);
      const P = i % 3 === 0 && T.length >= m ? T.substr(r.int(0, T.length - m), m) : r.word(m, al);
      return [P, T];
    },
  },
  reference: (P, T) => T.indexOf(P),
  budget: { metric: "keyComparisons", label: "character comparisons", limit: (P, T) => TS.horspool(P, T).cmp, hint: "That's more character comparisons than Horspool makes. Compare right to left from the pattern's last character, and on a mismatch shift by Table[T[i]] (m if T[i] is not in the table) instead of moving by 1." },
  mutants: [
    { fn: (P, T) => horspoolVar(P, T, { badChar: true }), hint: "You shift by the table entry of the character where the MISMATCH happened. Horspool always uses the text character aligned with the pattern's LAST character, T[i]; using another character can jump over a match." },
    { fn: (P, T) => horspoolVar(P, T, { rightEnd: true }), hint: "You report where the match ENDS. Return the left end: i − m + 1." },
    { fn: (P, T) => horspoolVar(P, T, { strict: true }), hint: "A match that ends at the last text character is missed: keep going while i ≤ n − 1 (not < n − 1)." },
  ],
  hints: [
    "After a mismatch, the text character under the pattern's last position, T[i], will still be in the text at the next alignment. Where must the pattern move so that some occurrence of that character in P can line up with it?",
    "Build Table from P (entries m − 1 − j for P[j], j ≤ m − 2). Then i ← m − 1; while i ≤ n − 1: count matches k right to left; if k = m return i − m + 1, else i ← i + shift of T[i].",
    "Inner loop: k ← 0; while k ≤ m − 1 and P[m − 1 − k] = T[i − k] do k ← k + 1. Shift: i ← i + get(Table, T[i], m).",
  ],
  starter: {
    pseudo: `ALGORITHM Horspool(P[0..m-1], T[0..n-1])
    // Returns the index of the first occurrence of P in T, or -1
    Table ← map()
    for j ← 0 to m - 2 do
        Table[P[j]] ← m - 1 - j
    i ← m - 1
    while i ≤ n - 1 do
        ...
    return -1`,
    js: `function Horspool(P, T) {
  // shift table, then right-to-left comparisons
}`,
  },
  solution: {
    pseudo: `ALGORITHM Horspool(P[0..m-1], T[0..n-1])
    Table ← map()
    for j ← 0 to m - 2 do
        Table[P[j]] ← m - 1 - j
    i ← m - 1
    while i ≤ n - 1 do
        k ← 0
        while k ≤ m - 1 and P[m - 1 - k] = T[i - k] do
            k ← k + 1
        if k = m then
            return i - m + 1
        i ← i + get(Table, T[i], m)
    return -1`,
    js: `function Horspool(P, T) {
  const m = P.length, n = T.length, table = {};
  for (let j = 0; j <= m - 2; j++) table[P[j]] = m - 1 - j;
  let i = m - 1;
  while (i <= n - 1) {
    let k = 0;
    while (k <= m - 1 && P[m - 1 - k] === T[i - k]) k++;
    if (k === m) return i - m + 1;
    i += table[T[i]] !== undefined ? table[T[i]] : m;
  }
  return -1;
}`,
    python: `def horspool(P, T):
    m, n = len(P), len(T)
    table = {P[j]: m - 1 - j for j in range(m - 1)}
    i = m - 1
    while i <= n - 1:
        k = 0
        while k <= m - 1 and P[m - 1 - k] == T[i - k]:
            k += 1
        if k == m:
            return i - m + 1
        i += table.get(T[i], m)
    return -1`,
    explain: "The shift for T[i] moves the pattern just far enough for the rightmost earlier occurrence of T[i] in P to line up with it, so no match is skipped. Worst case Θ(nm) (e.g. P = 1000…0 style inputs), but on random text it's Θ(n) and often sublinear in practice: when T[i] is not in P, one comparison skips m characters.",
  },
  distractors: ["i ← i + get(Table, T[i - k], m)", "while i < n - 1 do", "return i"],
  followUp: "Horspool is the default fast path in many standard libraries for longer patterns. For a guaranteed Θ(n + m) worst case use Knuth–Morris–Pratt (try kmp-search) or full Boyer–Moore with the good-suffix rule; for many patterns at once, Aho–Corasick.",
  complexity: "Θ(nm) worst, Θ(n) average on random text",
  visual: "sims/string-match.html",
  lesson: "lessons/07-space-time-tradeoffs/README.md",
});

/* =====================================================================
   KMP (Lecture 7) · §7.3 Hashing
   ===================================================================== */

const lpsVar = (P, opt = {}) => {
  const m = P.length, L = Array(m).fill(0);
  if (opt.notProper) return P.split("").map((_, i) => i + 1);
  let len = 0, i = 1;
  while (i < m) {
    if (P[i] === P[len]) { len++; L[i] = len; i++; }
    else if (len > 0) { if (opt.reset) len = 0; else { len = L[len - 1]; if (opt.skip) i++; } }
    else { L[i] = 0; i++; }
  }
  return L;
};
const kmpAll = (P, T, opt = {}) => {
  const m = P.length, n = T.length, L = TS.lps(P), R = [];
  let i = 0, j = 0;
  while (i < n) {
    if (T[i] === P[j]) {
      i++; j++;
      if (j === m) { R.push(i - m); if (opt.first) return R; j = opt.resetZero ? 0 : L[j - 1]; }
    } else if (j > 0) { j = L[j - 1]; if (opt.skip) i++; }
    else i++;
  }
  return R;
};
const chains = (K, m, opt = {}) => {
  const H = Array.from({ length: m }, () => []);
  const shared = [];
  for (const k of K) {
    const c = opt.shared ? shared : H[k % m];
    if (!opt.dups && c.includes(k)) continue;
    if (opt.front) c.unshift(k); else c.push(k);
  }
  return opt.shared ? H.map(() => shared.slice()) : H;
};
const probe = (K, m, opt = {}) => {
  const H = Array(m).fill(null);
  for (const k of K) {
    let c = k % m;
    if (opt.overwrite) { H[c] = k; continue; }
    let tries = 0;
    while (H[c] !== null && H[c] !== undefined && (opt.dups || H[c] !== k) && tries++ < m) c = opt.noWrap ? c + 1 : (c + 1) % m;
    if (tries <= m) H[c] = k;
  }
  return H;
};
const twoSum = (A, t, opt = {}) => {
  if (opt.iOuter) { for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) if (A[i] + A[j] === t) return opt.values ? [A[i], A[j]] : [i, j]; return []; }
  const seen = new Map();
  for (let j = 0; j < A.length; j++) {
    if (opt.insertFirst && (opt.overwrite || !seen.has(A[j]))) seen.set(A[j], j);
    const need = t - A[j];
    if (seen.has(need)) return opt.values ? [need, A[j]] : [seen.get(need), j];
    if (!opt.insertFirst && (opt.overwrite || !seen.has(A[j]))) seen.set(A[j], j);
  }
  return [];
};

ForgeProblems.add({
  id: "kmp-prefix-table",
  title: "Knuth–Morris–Pratt (KMP) Prefix Table",
  level: 3, chapter: 7, difficulty: 2,
  topics: ["string matching", "KMP", "input enhancement", "prefix function"],
  strategy: "Input enhancement (preprocess the pattern)",
  source: "CSC 501 Lecture 7 (KMP: the LPS array) · Levitin §7.2 (input enhancement)",
  summary: "The Longest proper Prefix-Suffix (LPS) table: LPS[i] = length of the longest proper prefix of P[0..i] that is also its suffix — in Θ(m).",
  statement: `
<p>The <b>Knuth–Morris–Pratt (KMP)</b> algorithm never re-reads a text character. Its secret is a table computed from the
pattern alone, the <b>Longest proper Prefix which is also a Suffix (LPS)</b> table: <code>LPS[i]</code> is the length of the
longest proper prefix of <code>P[0..i]</code> that is also a suffix of it ("proper" = not the whole string). After a mismatch at pattern position j, the algorithm knows that the
last LPS[j − 1] characters it matched already form a prefix of P, so it continues from there.</p>
<p>Write <code>PrefixTable(P)</code> (m ≥ 1) and return the list <code>LPS[0..m-1]</code>. Example: for <code>"ababaca"</code>
the table is <code>[0, 0, 1, 2, 3, 0, 1]</code>.</p>
<p><b>Efficiency:</b> must be <b>Θ(m)</b> — reuse earlier entries instead of re-checking every prefix.</p>`,
  entry: "PrefixTable",
  params: ["P"],
  tests: [
    { args: ["ababaca"], expect: [0, 0, 1, 2, 3, 0, 1], explain: "At i = 4, 'aba' is both a prefix and a suffix of 'ababa'. At i = 5 ('c') nothing matches, then 'a' restarts with 1." },
    { args: ["aabaaab"], expect: [0, 1, 0, 1, 2, 2, 3], explain: "At i = 5 the run 'aa' + 'a' can't extend to 'aab…', so fall back to LPS[1] = 1 and extend to 2 — don't restart from 0." },
    { args: ["aaaa"], expect: [0, 1, 2, 3], explain: "Proper prefixes only: 'aaaa' itself doesn't count, so LPS[3] = 3." },
    { args: ["abcd"], expect: [0, 0, 0, 0] },
    { args: ["a"], expect: [0] },
    { args: ["abacabab"], expect: [0, 0, 1, 0, 1, 2, 3, 2] },
    { args: ["aaab"], expect: [0, 1, 2, 0] },
  ],
  random: { count: 30, gen: (r, i) => [i % 3 ? r.word(1 + i, i % 2 ? "ab" : "abc") : "a".repeat(1 + (i % 7)) + r.word(1 + (i % 5), "ab")] },
  reference: (P) => TS.lps(P),
  growth: { metric: "steps", sizes: [32, 64, 128, 256, 512], gen: (r, n) => ["a".repeat(n - 1) + "b"], expect: "n" },
  mutants: [
    { fn: (P) => lpsVar(P, { reset: true }), hint: "On a mismatch you restart len at 0. The next-best candidate isn't 0 — it's the longest proper border of what you already matched: len ← LPS[len − 1] (then compare again at the same i)." },
    { fn: (P) => lpsVar(P, { notProper: true }), hint: "Each entry counts the whole string P[0..i] as its own prefix. Proper prefixes exclude the whole string, so LPS[0] = 0 and the scan starts at i = 1 with len = 0." },
    { fn: (P) => lpsVar(P, { skip: true }), hint: "After falling back (len ← LPS[len − 1]) you move on to the next i without retrying. A fallback doesn't consume P[i]: compare P[i] with P[len] again before advancing i." },
  ],
  hints: [
    "If you know LPS[i − 1] = len, the only way LPS[i] can be len + 1 is P[i] = P[len]. And if that fails, what is the next-longest border you could try to extend?",
    "Two pointers: i scans the pattern from 1, len is the current border length. Match → len ← len + 1, LPS[i] ← len, i ← i + 1. Mismatch with len > 0 → len ← LPS[len − 1] (don't move i). Mismatch with len = 0 → LPS[i] ← 0, i ← i + 1.",
    "Why is it linear? i only increases, and len can only decrease as often as it increased — at most 2m iterations in total.",
  ],
  starter: {
    pseudo: `ALGORITHM PrefixTable(P[0..m-1])
    // LPS[i] = length of the longest proper prefix of P[0..i] that is also its suffix
    L ← array(m, 0)
    len ← 0
    i ← 1
    while i ≤ m - 1 do
        ...
    return L`,
    js: `function PrefixTable(P) {
  const m = P.length, L = new Array(m).fill(0);
  // fill L in one left-to-right pass
  return L;
}`,
  },
  solution: {
    pseudo: `ALGORITHM PrefixTable(P[0..m-1])
    L ← array(m, 0)
    len ← 0
    i ← 1
    while i ≤ m - 1 do
        if P[i] = P[len] then
            len ← len + 1
            L[i] ← len
            i ← i + 1
        else if len > 0 then
            len ← L[len - 1]
        else
            L[i] ← 0
            i ← i + 1
    return L`,
    js: `function PrefixTable(P) {
  const m = P.length, L = new Array(m).fill(0);
  let len = 0, i = 1;
  while (i < m) {
    if (P[i] === P[len]) { len++; L[i] = len; i++; }
    else if (len > 0) len = L[len - 1];
    else { L[i] = 0; i++; }
  }
  return L;
}`,
    python: `def prefix_table(P):
    m = len(P)
    L = [0] * m
    length, i = 0, 1
    while i < m:
        if P[i] == P[length]:
            length += 1
            L[i] = length
            i += 1
        elif length > 0:
            length = L[length - 1]
        else:
            L[i] = 0
            i += 1
    return L`,
    explain: "Every border of P[0..i] is (a border of P[0..i−1] extended by P[i]), and the borders of P[0..i−1] are len, LPS[len − 1], LPS[LPS[len − 1] − 1], … — so trying them in that order finds the longest. Amortized: each iteration either increases i or decreases len, and len grows by at most 1 per increase of i, so there are at most 2m iterations: Θ(m).",
  },
  distractors: ["len ← 0", "i ← 0", "len ← L[len]"],
  followUp: "The same function (the 'prefix function' π) solves more than matching: the smallest period of a string is m − LPS[m − 1], and running it on P + '#' + T finds all matches in one pass. It's the building block of the Aho–Corasick automaton used by virus scanners and grep -F.",
  complexity: "Θ(m)",
  visual: "sims/string-match.html",
  lesson: "lessons/07-space-time-tradeoffs/README.md",
});

ForgeProblems.add({
  id: "kmp-search",
  title: "Knuth–Morris–Pratt (KMP): Find Every Occurrence",
  level: 3, chapter: 7, difficulty: 3,
  topics: ["string matching", "KMP", "input enhancement", "amortized analysis"],
  strategy: "Input enhancement (prefix table)",
  source: "CSC 501 Lecture 7 (KMP search phase)",
  summary: "Report all (possibly overlapping) matches of P in T with at most 2(n + m) character comparisons.",
  statement: `
<p>Write <code>KMPSearch(P, T)</code> that returns the list of <b>all</b> starting indices where <code>P</code> occurs in
<code>T</code>, in increasing order — occurrences may <b>overlap</b> (<code>"aa"</code> occurs 3 times in <code>"aaaa"</code>).
m ≥ 1; T may be empty.</p>
<p>Use the Knuth–Morris–Pratt (KMP) method: compute the Longest proper Prefix-Suffix (LPS) table of P (see
<i>kmp-prefix-table</i>; write it as a helper algorithm), then scan T once with two indices i (text) and j (pattern):</p>
<ul>
<li>match → advance both; if j reaches m, record <code>i − m</code> and continue with <code>j ← LPS[m − 1]</code>;</li>
<li>mismatch with j &gt; 0 → <code>j ← LPS[j − 1]</code> (i stays);</li>
<li>mismatch with j = 0 → advance i.</li>
</ul>
<p><b>Budget:</b> at most <b>2(n + m)</b> character comparisons in total (table + search) — the text index never moves back.
Brute force needs up to m·n.</p>`,
  entry: "KMPSearch",
  params: ["P", "T"],
  tests: [
    { args: ["abab", "abababab"], expect: [0, 2, 4], explain: "Overlapping matches: after a full match, continue from LPS[3] = 2 instead of starting over." },
    { args: ["aa", "aaaa"], expect: [0, 1, 2] },
    { args: ["xyz", "hello"], expect: [] },
    { args: ["abcd", "abc"], expect: [], explain: "Pattern longer than the text." },
    { args: ["abcaby", "abxabcabcaby"], expect: [6], explain: "The mismatch at 'c' vs 'y' falls back to LPS = 2 ('ab') without re-reading the text." },
    { args: ["aaab", "a".repeat(30)], expect: [], explain: "Brute force re-compares the same a's again and again (about 4n comparisons); KMP stays under 2(n + m)." },
    { args: ["aaa", "a".repeat(20)], expect: Array.from({ length: 18 }, (_, k) => k) },
    { args: ["abcabd", "abcabcabd"], expect: [3] },
    { args: ["a", ""], expect: [] },
  ],
  random: {
    count: 30,
    gen: (r, i) => {
      const T = i % 5 === 0 ? "a".repeat(10 + i) : r.word(5 + i, i % 2 ? "ab" : "abc");
      const m = 1 + (i % 6);
      return [i % 5 === 0 ? "a".repeat(m - 1) + (i % 2 ? "a" : "b") : r.word(m, i % 2 ? "ab" : "abc"), T];
    },
  },
  reference: (P, T) => kmpAll(P, T),
  budget: { metric: "keyComparisons", label: "character comparisons", limit: (P, T) => 2 * (P.length + T.length), hint: "Too many character comparisons: the text index must never go back. On a mismatch at pattern position j > 0, keep i and set j ← LPS[j − 1]; build the LPS table itself with the same two-pointer idea." },
  mutants: [
    { fn: (P, T) => kmpAll(P, T, { resetZero: true }), hint: "Overlapping matches are missed. After a full match don't restart the pattern from 0 — continue with j ← LPS[m − 1], because the matched suffix may already be the start of the next occurrence." },
    { fn: (P, T) => kmpAll(P, T, { first: true }), hint: "You stop at the first occurrence. Record i − m and keep scanning to the end of the text." },
    { fn: (P, T) => kmpAll(P, T, { skip: true }), hint: "On a mismatch with j > 0 you also advance i — that skips a text character that might start (or continue) a match. Only fall back j ← LPS[j − 1]; compare the SAME T[i] again." },
  ],
  hints: [
    "When the pattern fails at position j after matching P[0..j−1], you already know the last j text characters. Which shorter prefix of P could they still end with?",
    "Precompute L ← PrefixTable(P). Then i ← 0, j ← 0; while i < n: compare T[i] with P[j] once per iteration and act according to the three cases.",
    "On a full match (j = m after advancing): append(R, i − m) and set j ← L[j − 1]. Each loop iteration makes exactly one comparison and either advances i or shrinks j — at most 2n iterations.",
  ],
  starter: {
    pseudo: `ALGORITHM KMPSearch(P[0..m-1], T[0..n-1])
    // Returns every index where P occurs in T (overlaps allowed)
    L ← PrefixTable(P)
    R ← []
    i ← 0
    j ← 0
    while i < n do
        ...
    return R

ALGORITHM PrefixTable(P[0..m-1])
    ...`,
    js: `function KMPSearch(P, T) {
  // prefix table, then one left-to-right scan of T
}`,
  },
  solution: {
    pseudo: `ALGORITHM KMPSearch(P[0..m-1], T[0..n-1])
    L ← PrefixTable(P)
    R ← []
    i ← 0
    j ← 0
    while i < n do
        if T[i] = P[j] then
            i ← i + 1
            j ← j + 1
            if j = m then
                append(R, i - m)
                j ← L[j - 1]
        else if j > 0 then
            j ← L[j - 1]
        else
            i ← i + 1
    return R

ALGORITHM PrefixTable(P[0..m-1])
    L ← array(m, 0)
    len ← 0
    i ← 1
    while i ≤ m - 1 do
        if P[i] = P[len] then
            len ← len + 1
            L[i] ← len
            i ← i + 1
        else if len > 0 then
            len ← L[len - 1]
        else
            i ← i + 1
    return L`,
    js: `function KMPSearch(P, T) {
  const m = P.length, n = T.length, L = new Array(m).fill(0);
  for (let i = 1, len = 0; i < m; ) {
    if (P[i] === P[len]) L[i++] = ++len;
    else if (len > 0) len = L[len - 1];
    else i++;
  }
  const R = [];
  let i = 0, j = 0;
  while (i < n) {
    if (T[i] === P[j]) {
      i++; j++;
      if (j === m) { R.push(i - m); j = L[j - 1]; }
    } else if (j > 0) j = L[j - 1];
    else i++;
  }
  return R;
}`,
    python: `def kmp_search(P, T):
    m, n = len(P), len(T)
    L = [0] * m
    length, i = 0, 1
    while i < m:
        if P[i] == P[length]:
            length += 1; L[i] = length; i += 1
        elif length > 0:
            length = L[length - 1]
        else:
            i += 1
    R, i, j = [], 0, 0
    while i < n:
        if T[i] == P[j]:
            i += 1; j += 1
            if j == m:
                R.append(i - m)
                j = L[j - 1]
        elif j > 0:
            j = L[j - 1]
        else:
            i += 1
    return R`,
    explain: "Invariant: P[0..j−1] equals the text just before position i, and no occurrence starting earlier was skipped (falling back to L[j − 1] tries the next-longest candidate). Potential argument: every iteration does one comparison and either increases i or decreases j, while j increases only together with i, so the search makes ≤ 2n comparisons and the table ≤ 2m: Θ(n + m) worst case, versus Θ(nm) for brute force.",
  },
  distractors: ["j ← 0", "i ← i - j + 1", "if j = m then return i - m"],
  followUp: "KMP's never-look-back property makes it ideal for streams (network packets, logs) where you can't rewind the input. In interviews, 'find the pattern in a rotated string' becomes KMP on T + T, and 'shortest palindrome' uses the LPS table on s + '#' + reverse(s).",
  complexity: "Θ(n + m) worst case",
  visual: "sims/string-match.html",
  lesson: "lessons/07-space-time-tradeoffs/README.md",
});

ForgeProblems.add({
  id: "open-hashing-chains",
  title: "Open Hashing (Separate Chaining)",
  level: 3, chapter: 7, difficulty: 1,
  topics: ["hashing", "separate chaining", "dictionaries"],
  strategy: "Space-time tradeoff (prestructuring)",
  source: "Levitin §7.3 & Exercise 7.3.1 (adapted)",
  summary: "Build a chained hash table with h(K) = K mod m, appending new keys to the end of their chain.",
  statement: `
<p>A hash table stores a dictionary so that search, insert and delete take Θ(1) time on average. In <b>open hashing</b>
(separate chaining) cell <code>h(K)</code> of an m-cell table holds a list (chain) of all keys that hash there.</p>
<p>Write <code>HashChains(K, m)</code>: insert the non-negative integer keys <code>K[0], K[1], …</code> in order into an
empty table of m chains using <code>h(K) = K mod m</code>. Append each new key to the <b>end</b> of its chain; a key
already present in the table is <b>not</b> inserted again (dictionaries hold each key once). Return the table as a list of
m lists.</p>
<p>Tip: <code>array(m, [])</code> gives m separate empty lists; <code>contains(L, x)</code> or <code>x in L</code> tests membership.</p>`,
  entry: "HashChains",
  params: ["K", "m"],
  tests: [
    { args: [[30, 20, 56, 75, 31, 19], 11], expect: [[], [56], [], [], [], [], [], [], [30, 19], [20, 75, 31], []], explain: "30 mod 11 = 8, 20 → 9, 56 → 1, 75 → 9, 31 → 9, 19 → 8: chain 9 holds 20, 75, 31 in insertion order." },
    { args: [[5, 12, 5, 19], 7], expect: [[], [], [], [], [], [5, 12, 19], []], explain: "All three keys hash to 5; the second 5 is already there and is skipped." },
    { args: [[], 3], expect: [[], [], []], explain: "An empty dictionary: m empty chains." },
    { args: [[4, 9, 2], 1], expect: [[4, 9, 2]], explain: "m = 1: everything lands in one chain (a plain list)." },
    { args: [[0, 10, 20, 3], 10], expect: [[0, 10, 20], [], [], [3], [], [], [], [], [], []] },
    { args: [[7, 14, 7, 21, 14], 7], expect: [[7, 14, 21], [], [], [], [], [], []] },
  ],
  random: { count: 25, gen: (r, i) => [r.array(i % 20, 0, 60), 1 + (i % 13)] },
  reference: (K, m) => chains(K, m),
  mutants: [
    { fn: (K, m) => chains(K, m, { front: true }), hint: "Your chains are in reverse insertion order: you insert new keys at the FRONT of the list. This table appends to the end." },
    { fn: (K, m) => chains(K, m, { dups: true }), hint: "Duplicate keys appear twice. Before appending K to chain h(K), search that chain — if K is already there, skip it." },
    { fn: (K, m) => chains(K, m, { shared: true }), hint: "Every chain contains every key: all table cells share ONE list object (e.g. Array(m).fill([]) in JavaScript). Create a fresh empty list for each cell." },
  ],
  hints: [
    "Where can key K possibly be stored? How many chains do you ever need to look at to insert (or find) it?",
    "Make H with m empty lists. For each key: c ← K[i] mod m; if K[i] is not already in H[c], append it to H[c].",
    "for each key in K do: c ← key mod m; if not contains(H[c], key) then append(H[c], key). Return H.",
  ],
  starter: {
    pseudo: `ALGORITHM HashChains(K[0..n-1], m)
    // Separate chaining with h(K) = K mod m
    H ← array(m, [])
    for i ← 0 to n - 1 do
        ...
    return H`,
    js: `function HashChains(K, m) {
  // return an array of m arrays (chains)
}`,
  },
  solution: {
    pseudo: `ALGORITHM HashChains(K[0..n-1], m)
    H ← array(m, [])
    for i ← 0 to n - 1 do
        c ← K[i] mod m
        if not contains(H[c], K[i]) then
            append(H[c], K[i])
    return H`,
    js: `function HashChains(K, m) {
  const H = Array.from({ length: m }, () => []);
  for (const key of K) {
    const chain = H[key % m];
    if (!chain.includes(key)) chain.push(key);
  }
  return H;
}`,
    python: `def hash_chains(K, m):
    H = [[] for _ in range(m)]
    for key in K:
        chain = H[key % m]
        if key not in chain:
            chain.append(key)
    return H`,
    explain: "Each insertion scans only chain h(K). With a hash function that spreads keys evenly, chains have average length α = n/m (the load factor): a successful search costs about 1 + α/2 comparisons and an unsuccessful one α (Levitin §7.3), so with α kept near 1, operations are Θ(1) on average — Θ(n) only if everything collides.",
  },
  distractors: ["c ← K[i] div m", "H ← array(m, 0)", "insertAt(H[c], 0, K[i])"],
  followUp: "Java's HashMap uses separate chaining and turns a chain into a balanced tree once it exceeds 8 entries — protecting against adversarial inputs that force collisions (hash-flooding attacks). Resizing when α passes a threshold keeps the average chain short.",
  complexity: "Θ(1 + α) average per insertion (α = n/m)",
  visual: "sims/hashing.html",
  lesson: "lessons/07-space-time-tradeoffs/README.md",
});

ForgeProblems.add({
  id: "linear-probing-table",
  title: "Closed Hashing with Linear Probing",
  level: 3, chapter: 7, difficulty: 2,
  topics: ["hashing", "open addressing", "linear probing", "dictionaries"],
  strategy: "Space-time tradeoff (prestructuring)",
  source: "Levitin §7.3 & Exercise 7.3.2 (adapted)",
  summary: "Insert keys into an m-cell table: start at K mod m, step to the next cell (wrapping around) until a free one.",
  statement: `
<p>In <b>closed hashing</b> (open addressing) every key lives <i>inside</i> the table — no lists, better cache behavior. With
<b>linear probing</b>, if cell <code>h(K) = K mod m</code> is taken, try <code>h(K) + 1</code>, <code>h(K) + 2</code>, …
<b>wrapping around</b> from the last cell to cell 0, until a free cell is found.</p>
<p>Write <code>HashLinear(K, m)</code>: insert the non-negative keys <code>K[0], K[1], …</code> in order into an empty table
of <code>m</code> cells and return the table, with <code>null</code> in empty cells. A key that is already in the table is
not inserted again (you will meet it while probing). There are never more than m distinct keys.</p>`,
  entry: "HashLinear",
  params: ["K", "m"],
  tests: [
    { args: [[30, 20, 56, 75, 31, 19], 11], expect: [31, 56, 19, null, null, null, null, null, 30, 20, 75], explain: "75 → 9 is taken, goes to 10. 31 → 9, 10 taken → wraps to 0. 19 → 8, 9, 10, 0, 1 taken → 2." },
    { args: [[3, 13, 23], 10], expect: [null, null, null, 3, 13, 23, null, null, null, null], explain: "A primary cluster forms: each new key with remainder 3 goes one cell further." },
    { args: [[9, 19, 29], 10], expect: [19, 29, null, null, null, null, null, null, null, 9], explain: "Probing past the last cell wraps around to cell 0." },
    { args: [[], 4], expect: [null, null, null, null] },
    { args: [[5, 5, 15], 5], expect: [5, 15, null, null, null], explain: "The second 5 finds itself at cell 0 and is not stored twice." },
    { args: [[4, 3, 2, 1, 0], 5], expect: [0, 1, 2, 3, 4], explain: "A full table (n = m) with no collisions." },
    { args: [[10, 20, 30, 40], 4], expect: [20, 40, 10, 30], explain: "10 → 2, 20 → 0, 30 → 2 (taken) → 3, 40 → 0 (taken) → 1." },
  ],
  random: {
    count: 25,
    gen: (r, i) => {
      const m = 2 + (i % 12);
      const K = r.array(r.int(0, m + 3), 0, 50);
      const out = []; const seen = new Set();
      for (const k of K) { if (!seen.has(k) && seen.size >= m) continue; seen.add(k); out.push(k); }
      return [out, m];
    },
  },
  reference: (K, m) => probe(K, m),
  mutants: [
    { fn: (K, m) => probe(K, m, { noWrap: true }), hint: "Your table grows past its last cell. Probing must wrap around: the cell after m − 1 is 0 — use c ← (c + 1) mod m." },
    { fn: (K, m) => probe(K, m, { overwrite: true }), hint: "Colliding keys overwrite each other. When cell h(K) is taken, probe the following cells until you find a free (null) one." },
    { fn: (K, m) => probe(K, m, { dups: true }), hint: "A key already in the table gets stored a second time. While probing, stop if you meet K itself — it's already there." },
  ],
  hints: [
    "Where does a key go if its home cell is taken? Where must a later search for that key look, and in what order?",
    "H ← array(m, null). For each key: c ← key mod m; while H[c] is occupied by some OTHER key, c ← (c + 1) mod m; then H[c] ← key.",
    "The loop condition: while H[c] ≠ null and H[c] ≠ key do c ← (c + 1) mod m.",
  ],
  starter: {
    pseudo: `ALGORITHM HashLinear(K[0..n-1], m)
    // Closed hashing, h(K) = K mod m, linear probing
    H ← array(m, null)
    for each key in K do
        c ← key mod m
        ...
    return H`,
    js: `function HashLinear(K, m) {
  const H = new Array(m).fill(null);
  // linear probing with wrap-around
  return H;
}`,
  },
  solution: {
    pseudo: `ALGORITHM HashLinear(K[0..n-1], m)
    H ← array(m, null)
    for each key in K do
        c ← key mod m
        while H[c] ≠ null and H[c] ≠ key do
            c ← (c + 1) mod m
        H[c] ← key
    return H`,
    js: `function HashLinear(K, m) {
  const H = new Array(m).fill(null);
  for (const key of K) {
    let c = key % m;
    while (H[c] !== null && H[c] !== key) c = (c + 1) % m;
    H[c] = key;
  }
  return H;
}`,
    python: `def hash_linear(K, m):
    H = [None] * m
    for key in K:
        c = key % m
        while H[c] is not None and H[c] != key:
            c = (c + 1) % m
        H[c] = key
    return H`,
    explain: "A key is always stored at the first free cell of its probe sequence, so a later search that follows the same sequence and stops at a free cell is correct. With load factor α = n/m, a successful search takes about ½(1 + 1/(1 − α)) probes and an unsuccessful one ½(1 + 1/(1 − α)²) (Levitin §7.3) — fine at α = 0.5, terrible as α → 1 because of clustering.",
  },
  distractors: ["c ← c + 1", "while H[c] ≠ null do", "H[key mod m] ← key"],
  followUp: "Deleting from a linear-probing table can't just set a cell to null — it would break other keys' probe sequences; use 'tombstones' or backward-shift deletion. Modern hash maps (Google's SwissTable, Rust's HashMap) are open-addressing tables that probe 16 cells at once with single-instruction-multiple-data (SIMD) instructions.",
  complexity: "Θ(1) average for α bounded away from 1; Θ(n) worst case",
  visual: "sims/hashing.html",
  lesson: "lessons/07-space-time-tradeoffs/README.md",
});

ForgeProblems.add({
  id: "two-sum-hash",
  title: "Two Sum with a Hash Map",
  level: 3, chapter: 7, difficulty: 2,
  topics: ["hashing", "maps", "interview", "space-time tradeoff"],
  strategy: "Space-time tradeoff (hash map of seen values)",
  source: "Interview classic · Levitin §7.3 (hashing)",
  summary: "Find i < j with A[i] + A[j] = target in one Θ(n) pass by remembering seen values in a map.",
  statement: `
<p>The most famous interview question of all, and a clean example of trading space for time: brute force tries every pair
(Θ(n²)); a hash map of the values seen so far answers "have I already seen <code>target − A[j]</code>?" in expected Θ(1).</p>
<p>Write <code>TwoSum(A, target)</code> that returns <code>[i, j]</code> with <code>i &lt; j</code> and
<code>A[i] + A[j] = target</code>. If several pairs work, return the one with the <b>smallest j</b>, and for that j the
<b>smallest i</b> (this is exactly what a single left-to-right pass finds). Return <code>[]</code> if there is no such pair.</p>
<p><b>Efficiency:</b> must be linear, Θ(n). Use <code>map()</code>, <code>contains(M, k)</code>, <code>M[k] ← v</code>.</p>`,
  entry: "TwoSum",
  params: ["A", "target"],
  tests: [
    { args: [[2, 7, 11, 15], 9], expect: [0, 1], explain: "2 + 7 = 9." },
    { args: [[3, 2, 4], 6], expect: [1, 2], explain: "3 + 3 would need the same element twice — not allowed. 2 + 4 works." },
    { args: [[1, 3, 3, 5], 6], expect: [1, 2], explain: "Both (1, 5) and (3, 3) sum to 6; the pair (3, 3) completes first (j = 2)." },
    { args: [[3, 3], 6], expect: [0, 1], explain: "Two different positions with equal values are fine." },
    { args: [[1, 2, 3], 100], expect: [] },
    { args: [[2, 2, 7], 9], expect: [0, 2], explain: "For j = 2 both i = 0 and i = 1 work — keep the smallest i (don't overwrite the first index you stored)." },
    { args: [[-4, 10, 1, 14], 10], expect: [0, 3] },
    { args: [[], 5], expect: [] },
    { args: [[5], 10], expect: [] },
  ],
  random: { count: 30, gen: (r, i) => [r.array(i % 25, -20, 20), r.int(-25, 25)] },
  reference: (A, t) => twoSum(A, t),
  growth: { metric: "steps", sizes: [32, 64, 128, 256, 512], gen: (r, n) => [r.distinct(n, 1, 100000), -1], expect: "n" },
  mutants: [
    { fn: (A, t) => twoSum(A, t, { insertFirst: true }), hint: "An element gets paired with itself (e.g. [0, 0] for 3 + 3 = 6 from a single 3). Look up target − A[j] BEFORE you store A[j] in the map." },
    { fn: (A, t) => twoSum(A, t, { overwrite: true }), hint: "You return a later i than necessary: storing M[A[j]] ← j every time overwrites the first index of a repeated value. Only store a value the first time you see it." },
    { fn: (A, t) => twoSum(A, t, { iOuter: true }), hint: "You return a valid pair but not the one that completes first. The required pair has the smallest j (then smallest i) — scan j left to right and look back into what you've seen, as a one-pass hash solution does." },
    { fn: (A, t) => twoSum(A, t, { values: true }), hint: "Return the INDICES [i, j], not the values A[i] and A[j]. Store each value's index in the map." },
  ],
  hints: [
    "When you're standing at A[j], which single value would complete a pair? How could you know instantly whether you've already passed it?",
    "One pass over j: compute need ← target − A[j]; if need is a key of the map, you're done; otherwise record A[j] ↦ j (only if A[j] isn't already recorded).",
    "if contains(seen, need) then return [seen[need], j]. The check must come before inserting A[j].",
  ],
  starter: {
    pseudo: `ALGORITHM TwoSum(A[0..n-1], target)
    // Returns [i, j] with i < j and A[i] + A[j] = target (smallest j, then smallest i), or []
    seen ← map()
    for j ← 0 to n - 1 do
        ...
    return []`,
    js: `function TwoSum(A, target) {
  const seen = new Map();
  // one pass
  return [];
}`,
  },
  solution: {
    pseudo: `ALGORITHM TwoSum(A[0..n-1], target)
    seen ← map()
    for j ← 0 to n - 1 do
        need ← target - A[j]
        if contains(seen, need) then
            return [seen[need], j]
        if not contains(seen, A[j]) then
            seen[A[j]] ← j
    return []`,
    js: `function TwoSum(A, target) {
  const seen = new Map();
  for (let j = 0; j < A.length; j++) {
    const need = target - A[j];
    if (seen.has(need)) return [seen.get(need), j];
    if (!seen.has(A[j])) seen.set(A[j], j);
  }
  return [];
}`,
    python: `def two_sum(A, target):
    seen = {}
    for j, x in enumerate(A):
        need = target - x
        if need in seen:
            return [seen[need], j]
        seen.setdefault(x, j)
    return []`,
    explain: "When j is processed, the map holds the first index of every value in A[0..j−1], so the first j that finds its complement is the smallest j and seen[need] is the smallest i. n iterations with expected Θ(1) hash operations each: Θ(n) expected time and Θ(n) extra space — versus Θ(n²) time and Θ(1) space for brute force (or Θ(n log n) by presorting + two pointers).",
  },
  distractors: ["seen[A[j]] ← j", "return [A[i], A[j]]", "for i ← 0 to j do"],
  followUp: "The three classic answers show the chapter's trade-offs: brute force Θ(n²)/Θ(1) space, presort + two pointers Θ(n log n)/Θ(1), hashing Θ(n)/Θ(n). Senior twist: 3-Sum in Θ(n²), or Two Sum over a stream where memory is limited.",
  complexity: "Θ(n) expected time, Θ(n) space",
  visual: "sims/hashing.html",
  lesson: "lessons/07-space-time-tradeoffs/README.md",
});

})();
