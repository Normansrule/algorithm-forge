/* Pack I — Beyond the textbook: interview & production patterns (level 5, chapters 15–17).
   Two pointers, sliding window, prefix sums + hashing, Kadane, monotonic stack, binary search on the answer,
   intervals, heaps / k-way merge, bitmask DP (Held–Karp), matrix-power Fibonacci, Rabin–Karp, Z-function,
   amortized dynamic arrays, token-bucket rate limiting, consistent hashing, patience-sorting LIS.
   The point of every problem here is the EFFICIENT pattern, so most of them carry a `growth` check:
   a correct but brute-force answer is flagged, and the lints nudge toward the pattern.
   Wrapped in an IIFE so helper names never collide with other problem files (they share one global scope). */
(function () {
  "use strict";

  // Regexes (as source strings) that spot the brute-force shapes in pseudocode.
  const NESTED_FOR = "^( *)for\\b.*\\n(?:(?:\\1 .*)?\\n)*?\\1 +for\\b";
  const TRIPLE_FOR = "^( *)for\\b.*\\n(?:(?:\\1 .*)?\\n)*?(\\1 +)for\\b.*\\n(?:(?:\\2 .*)?\\n)*?\\2 +for\\b";

  /* ------------------------------------------------------------------ */
  /* 1. Two pointers on a sorted array                                   */
  /* ------------------------------------------------------------------ */
  ForgeProblems.add({
    id: "two-sum-sorted",
    title: "Two Sum on a Sorted Array",
    level: 5, chapter: 15, difficulty: 1,
    topics: ["two pointers", "arrays", "interview patterns"],
    strategy: "Two pointers",
    source: "Interview classic (Lesson 15, Pattern 1)",
    summary: "Find two positions in a sorted array whose values add up to a target, in one linear pass.",
    statement: `
<p>Two pointers is the first pattern interviewers reach for: when the input is <b>sorted</b>, one index walking in from each
end can rule out a whole row of candidate pairs with a single comparison, turning a Θ(n²) search into Θ(n).</p>
<p>Given an array <code>A[0..n-1]</code> sorted in nondecreasing order and a number <code>T</code>, return a list
<code>[i, j]</code> of two <b>different</b> 0-based indices with <code>i &lt; j</code> and <code>A[i] + A[j] = T</code>.
If no such pair exists, return the empty list <code>[]</code>. If several pairs work, any one is accepted.</p>
<ul>
<li>0 ≤ n ≤ 600; values are integers (they may be negative or repeated).</li>
<li><b>Efficiency:</b> your algorithm must be <b>linear</b>, Θ(n), with Θ(1) extra space. The grader measures how your step count grows.</li>
</ul>`,
    entry: "TwoSumSorted",
    params: ["A", "T"],
    tests: [
      { args: [[2, 7, 11, 15], 9], expect: [0, 1], explain: "A[0] + A[1] = 2 + 7 = 9." },
      { args: [[1, 3, 4, 6, 8, 11], 10], expect: [2, 3], explain: "Only 4 + 6 works. Trace l and r: 12 too big, 9 too small, 11 too big, 9 too small, 10 found." },
      { args: [[1, 3, 6], 6], expect: [], explain: "3 + 3 = 6 would use the same element twice, which is not allowed, so the answer is []." },
      { args: [[], 5], expect: [] },
      { args: [[-4, -1, 0, 2, 5], 1], expect: [0, 4], explain: "Both (0, 4) and (1, 3) are correct." },
      { args: [[3, 3], 6], expect: [0, 1], explain: "Equal values at two different indices are fine." },
      { args: [[5], 10], expect: [] },
      { args: [[1, 2, 3, 4, 4, 9], 8], expect: [3, 4] },
    ],
    random: {
      count: 30,
      gen: (r, i) => {
        const n = r.int(0, 30);
        const A = r.sorted(n, -20, 20);
        const T = n >= 2 && i % 3 !== 0 ? A[r.int(0, n - 1)] + A[r.int(0, n - 1)] : r.int(-40, 40);
        return [A, T];
      },
    },
    verify: (got, [A, T]) => {
      let exists = false;
      for (let a = 0, b = A.length - 1; a < b;) { const s = A[a] + A[b]; if (s === T) { exists = true; break; } if (s < T) a++; else b--; }
      if (!Array.isArray(got)) return "Return a list: [i, j] or [].";
      if (!exists) return got.length === 0 ? true : "No two different positions add up to T here, so the answer is [].";
      if (got.length !== 2) return "A pair exists, so return a list of exactly two indices [i, j].";
      const [i, j] = got;
      if (!Number.isInteger(i) || !Number.isInteger(j) || i < 0 || j >= A.length || i >= j) return `[${i}, ${j}] is not a pair of valid indices with i < j.`;
      return A[i] + A[j] === T ? true : `A[${i}] + A[${j}] = ${A[i] + A[j]}, not ${T}.`;
    },
    growth: {
      metric: "steps", sizes: [32, 64, 128, 256, 512],
      gen: (r, n) => [r.sorted(n, 0, 4 * n).map((x) => 2 * x), 1], // all even, odd target: no pair, full scan
      expect: "n",
    },
    mutants: [
      {
        fn: (A, T) => { let l = 0, r = A.length - 1; while (l <= r) { const s = A[l] + A[r]; if (s === T) return [l, r]; if (s < T) l++; else r--; } return []; },
        hint: "Your pointers are allowed to meet: when l = r you are adding an element to itself. Keep going only while the two indices are different.",
      },
      {
        fn: (A, T) => { let l = 0, r = A.length - 1; while (l < r) { const s = A[l] + A[r]; if (s === T) return [A[l], A[r]]; if (s < T) l++; else r--; } return []; },
        hint: "You seem to return the two VALUES that add up to T. The task asks for their INDICES (positions) in A.",
      },
      {
        fn: (A, T) => { let l = 0, r = A.length - 1; while (l < r) { const s = A[l] + A[r]; if (s === T) return [l + 1, r + 1]; if (s < T) l++; else r--; } return []; },
        hint: "Your indices look shifted by one. Positions here are 0-based: the first element is A[0].",
      },
    ],
    lints: [
      { re: NESTED_FOR, lang: "pseudo", message: "Two nested loops try every pair: Θ(n²). The array is sorted — if A[l] + A[r] is too big, A[r] can't pair with anything at or after l, so drop r. One pass with two indices is enough." },
    ],
    hints: [
      "The array is sorted. If A[0] + A[n − 1] is bigger than T, can A[n − 1] be part of ANY valid pair? What if the sum is too small?",
      "Keep two indices: l starting at the left end, r at the right end. Each step compares one sum with T and moves exactly one index inward. Stop when they meet.",
      "Inside while l < r: s ← A[l] + A[r]; if s = T return [l, r]; if s < T then l ← l + 1 else r ← r − 1. After the loop, return [].",
    ],
    starter: {
      pseudo: `ALGORITHM TwoSumSorted(A[0..n-1], T)
    // A sorted nondecreasing; return [i, j] with i < j and A[i] + A[j] = T, or []
    l ← 0
    r ← n - 1
    while ... do
        ...
    return []`,
      js: `function TwoSumSorted(A, T) {
  let l = 0, r = A.length - 1;
  // walk l and r toward each other
  return [];
}`,
    },
    solution: {
      pseudo: `ALGORITHM TwoSumSorted(A[0..n-1], T)
    l ← 0
    r ← n - 1
    while l < r do
        s ← A[l] + A[r]
        if s = T then
            return [l, r]
        else if s < T then
            l ← l + 1
        else
            r ← r - 1
    return []`,
      js: `function TwoSumSorted(A, T) {
  let l = 0, r = A.length - 1;
  while (l < r) {
    const s = A[l] + A[r];
    if (s === T) return [l, r];
    if (s < T) l++; else r--;
  }
  return [];
}`,
      python: `def two_sum_sorted(A, T):
    l, r = 0, len(A) - 1
    while l < r:
        s = A[l] + A[r]
        if s == T:
            return [l, r]
        if s < T:
            l += 1
        else:
            r -= 1
    return []`,
      explain: "Invariant: every pair with an index left of l or right of r has already been ruled out (if A[l] + A[r] > T, A[r] plus anything ≥ A[l] is too big, so r can go). Each iteration moves one pointer and they start n − 1 apart, so at most n − 1 iterations: Θ(n) time, Θ(1) space.",
    },
    complexity: "Θ(n) time, Θ(1) extra space",
    followUp: "Unsorted input? A hash map from value → index gives Θ(n) expected time (classic Two Sum). The same inward-walking pointers drive 3-Sum, container-with-most-water and the merge step of mergesort.",
    distractors: ["while l ≤ r do", "return [A[l], A[r]]", "l ← l - 1"],
    visual: "sims/patterns.html",
    lesson: "lessons/15-dp-and-interview-patterns/README.md",
  });

  /* ------------------------------------------------------------------ */
  /* 2. Sliding window (variable)                                         */
  /* ------------------------------------------------------------------ */
  ForgeProblems.add({
    id: "min-subarray-len",
    title: "Shortest Subarray with Sum at Least S",
    level: 5, chapter: 15, difficulty: 1,
    topics: ["sliding window", "arrays", "interview patterns"],
    strategy: "Sliding window (variable size)",
    source: "Interview classic (Lesson 15, Pattern 2)",
    summary: "Grow a window on the right, shrink it on the left: the shortest contiguous run with sum ≥ S in linear time.",
    statement: `
<p>Sliding windows show up everywhere a system watches a stream: moving averages on dashboards, "at most 100 requests per
minute" rate limits, Transmission Control Protocol (TCP) flow control. The trick is to <b>update</b> the window when one
element enters and one leaves, instead of recomputing it.</p>
<p>Given an array <code>A[0..n-1]</code> of <b>positive</b> integers and a positive integer <code>S</code>, return the
<b>length of the shortest contiguous subarray</b> whose sum is <b>at least</b> <code>S</code>. If no subarray reaches
<code>S</code>, return <code>0</code>.</p>
<ul>
<li>0 ≤ n ≤ 600, 1 ≤ A[i] ≤ 100, 1 ≤ S.</li>
<li><b>Efficiency:</b> must be <b>linear</b>, Θ(n). Checking every (start, end) pair is Θ(n²) and will be flagged.</li>
</ul>`,
    entry: "MinSubarrayLen",
    params: ["A", "S"],
    tests: [
      { args: [[4, 1, 1, 3, 2, 5], 8], expect: 3, explain: "[3, 2, 5] has sum 10 ≥ 8 and nothing shorter reaches 8." },
      { args: [[2, 3, 1, 2, 4, 3], 7], expect: 2, explain: "[4, 3] sums to exactly 7 — 'at least' includes equality." },
      { args: [[1, 2], 10], expect: 0, explain: "The whole array only sums to 3, so no window works: return 0." },
      { args: [[2, 3, 5], 5], expect: 1, explain: "The single element [5] already reaches 5." },
      { args: [[1, 1, 1, 1, 10], 10], expect: 1, explain: "When 10 arrives the window must shrink several times, not just once." },
      { args: [[], 3], expect: 0 },
      { args: [[1, 1, 1, 1], 4], expect: 4 },
      { args: [[5, 1, 3, 5, 10, 7, 4, 9, 2, 8], 15], expect: 2 },
    ],
    random: { count: 30, gen: (r, i) => { const n = r.int(0, 30); const A = r.array(n, 1, 20); return [A, r.int(1, Math.max(1, (n * 10) | 0))]; } },
    reference: (A, S) => { let best = Infinity, l = 0, s = 0; for (let r = 0; r < A.length; r++) { s += A[r]; while (s >= S) { best = Math.min(best, r - l + 1); s -= A[l++]; } } return best === Infinity ? 0 : best; },
    growth: { metric: "steps", sizes: [32, 64, 128, 256, 512], gen: (r, n) => [r.array(n, 1, 10), 3 * n], expect: "n" },
    mutants: [
      {
        fn: (A, S) => { let best = Infinity, l = 0, s = 0; for (let r = 0; r < A.length; r++) { s += A[r]; if (s >= S) { best = Math.min(best, r - l + 1); s -= A[l++]; } } return best === Infinity ? 0 : best; },
        hint: "Your window shrinks at most one step per new element. After a big element arrives, the window may stay valid for several removals — keep shrinking while the sum is still ≥ S.",
      },
      {
        fn: (A, S) => { let best = Infinity, l = 0, s = 0; for (let r = 0; r < A.length; r++) { s += A[r]; while (s > S) { best = Math.min(best, r - l + 1); s -= A[l++]; } } return best === Infinity ? 0 : best; },
        hint: "A window whose sum is exactly S also counts ('at least S'). Check your comparison: ≥, not >.",
      },
      {
        fn: (A, S) => { let best = Infinity, l = 0, s = 0; for (let r = 0; r < A.length; r++) { s += A[r]; while (s >= S) { best = Math.min(best, r - l + 1); s -= A[l++]; } } return best; },
        hint: "When no window reaches S you return ∞ (your 'no answer yet' value). The task asks for 0 in that case.",
      },
    ],
    lints: [
      { re: NESTED_FOR, lang: "pseudo", message: "Trying every start with an inner loop over ends is Θ(n²). Instead move a right edge r forward once, and only advance the left edge l while the window is still valid — each index enters and leaves the window once." },
    ],
    hints: [
      "All values are positive, so adding an element never makes a window's sum smaller. If A[l..r] already has sum ≥ S, why would you ever extend it further right?",
      "Keep a window [l..r] and its running sum. For each new r: add A[r]. Then, as long as the window is still valid, record its length and drop A[l] from the left.",
      "The shrinking must be a while loop: while sum ≥ S do best ← min(best, r − l + 1); sum ← sum − A[l]; l ← l + 1. Start best at ∞ and turn ∞ into 0 at the end.",
    ],
    starter: {
      pseudo: `ALGORITHM MinSubarrayLen(A[0..n-1], S)
    // shortest contiguous subarray with sum ≥ S, or 0
    best ← ∞
    l ← 0
    sum ← 0
    for r ← 0 to n - 1 do
        ...
    return best`,
      js: `function MinSubarrayLen(A, S) {
  let best = Infinity, l = 0, sum = 0;
  // grow on the right, shrink on the left
  return best;
}`,
    },
    solution: {
      pseudo: `ALGORITHM MinSubarrayLen(A[0..n-1], S)
    best ← ∞
    l ← 0
    sum ← 0
    for r ← 0 to n - 1 do
        sum ← sum + A[r]
        while sum ≥ S do
            best ← min(best, r - l + 1)
            sum ← sum - A[l]
            l ← l + 1
    if best = ∞ then
        return 0
    return best`,
      js: `function MinSubarrayLen(A, S) {
  let best = Infinity, l = 0, sum = 0;
  for (let r = 0; r < A.length; r++) {
    sum += A[r];
    while (sum >= S) { best = Math.min(best, r - l + 1); sum -= A[l++]; }
  }
  return best === Infinity ? 0 : best;
}`,
      python: `def min_subarray_len(A, S):
    best, l, s = float("inf"), 0, 0
    for r, x in enumerate(A):
        s += x
        while s >= S:
            best = min(best, r - l + 1)
            s -= A[l]
            l += 1
    return 0 if best == float("inf") else best`,
      explain: "For each right edge r the loop finds the shortest valid window ending at r (positives make validity monotone). Although a while sits inside a for, l only moves forward, so across the whole run it advances at most n times: aggregate cost Θ(n).",
    },
    complexity: "Θ(n) time (each index enters and leaves the window once), Θ(1) space",
    followUp: "With negative numbers the window trick breaks (sums stop being monotone) — then you need prefix sums plus a monotonic deque. The 'enter once, leave once' argument is the aggregate method of amortized analysis (Lesson 16).",
    distractors: ["if sum ≥ S then", "while sum > S do", "best ← min(best, r - l)"],
    visual: "sims/patterns.html",
    lesson: "lessons/15-dp-and-interview-patterns/README.md",
  });

  ForgeProblems.add({
    id: "longest-unique-substring",
    title: "Longest Substring Without Repeats",
    level: 5, chapter: 15, difficulty: 2,
    topics: ["sliding window", "hashing", "strings", "interview patterns"],
    strategy: "Sliding window + hash map of last positions",
    source: "Interview classic (Lesson 15, Pattern 2)",
    summary: "Length of the longest run of characters with no character repeated, in one pass with a last-seen map.",
    statement: `
<p>A window that <b>jumps</b> its left edge is the heart of many stream deduplication and "distinct items in the last k events"
checks. Here the window must never contain a repeated character.</p>
<p>Given a string <code>s</code> (length 0 to 600; any characters), return the <b>length</b> of the longest
<b>contiguous</b> substring in which no character appears twice.</p>
<ul>
<li>Read characters with <code>s[i]</code> and the length with <code>length(s)</code>. A <code>map()</code> can remember where each character was last seen.</li>
<li><b>Efficiency:</b> must be <b>linear</b>, Θ(n) (hash-map operations count as O(1)). Restarting a scan from every position is Θ(n²) and will be flagged.</li>
</ul>`,
    entry: "LongestUnique",
    params: ["s"],
    tests: [
      { args: ["abcabcbb"], expect: 3, explain: "\"abc\" — every longer window repeats a letter." },
      { args: ["pwwkew"], expect: 3, explain: "\"wke\". Note \"pwke\" is not contiguous, so it doesn't count." },
      { args: ["abba"], expect: 2, explain: "When the second 'a' arrives, its old position (0) is already left of the window — the left edge must not jump backwards." },
      { args: [""], expect: 0 },
      { args: ["bbbbb"], expect: 1 },
      { args: ["abacdbe"], expect: 5, explain: "\"acdbe\" (the lesson's worked example)." },
      { args: ["dvdf"], expect: 3 },
      { args: ["a"], expect: 1 },
    ],
    random: { count: 30, gen: (r, i) => [r.word(r.int(0, 40), i % 2 ? "abcde" : "abcdefghijklmn")] },
    reference: (s) => { const last = new Map(); let l = 0, best = 0; for (let r = 0; r < s.length; r++) { const c = s[r]; if (last.has(c) && last.get(c) >= l) l = last.get(c) + 1; last.set(c, r); best = Math.max(best, r - l + 1); } return best; },
    growth: {
      metric: "steps", sizes: [32, 64, 128, 256, 512],
      gen: (r, n) => { const cs = r.shuffle(Array.from({ length: n }, (_, k) => String.fromCharCode(0x4e00 + k))); return [cs.join("") + cs[0]]; },
      expect: "n",
    },
    mutants: [
      {
        fn: (s) => { const last = new Map(); let l = 0, best = 0; for (let r = 0; r < s.length; r++) { const c = s[r]; if (last.has(c)) l = last.get(c) + 1; last.set(c, r); best = Math.max(best, r - l + 1); } return best; },
        hint: "Your left edge can jump BACKWARDS. When a character was last seen before the current window starts (like the first 'a' in \"abba\"), it is not a repeat inside the window — only move l if that old position is ≥ l.",
      },
      {
        fn: (s) => { const last = new Map(); let l = 0, best = 0; for (let r = 0; r < s.length; r++) { const c = s[r]; if (last.has(c) && last.get(c) >= l) l = last.get(c) + 1; last.set(c, r); best = Math.max(best, r - l); } return best; },
        hint: "Your lengths are one short. A window from l to r (both included) has r − l + 1 characters.",
      },
      {
        fn: (s) => new Set(s.split("")).size,
        hint: "You are counting the distinct characters in the WHOLE string. The substring must be contiguous: in \"pwwkew\" the letters p, w, k, e are distinct but never appear side by side without a repeat.",
      },
    ],
    lints: [
      { re: NESTED_FOR, lang: "pseudo", message: "Restarting a scan at every position is Θ(n²). Keep ONE window [l..r]: remember the last index of each character in a map, and when s[r] was last seen inside the window, jump l just past it." },
    ],
    hints: [
      "Suppose the window s[l..r−1] has no repeats and s[r] arrives. If s[r] already appears in the window, where is the first position l that makes the window valid again?",
      "Keep a map last[c] = the most recent index of character c. For each r: if c = s[r] was seen at an index inside the window, move l to that index + 1. Then record last[c] ← r and update the best length.",
      "The guard matters: if contains(last, c) and last[c] ≥ l then l ← last[c] + 1. Without the ≥ l test, l can move backwards (try \"abba\").",
    ],
    starter: {
      pseudo: `ALGORITHM LongestUnique(s)
    // length of the longest substring of s with no repeated character
    last ← map()
    l ← 0
    best ← 0
    for r ← 0 to length(s) - 1 do
        ...
    return best`,
      js: `function LongestUnique(s) {
  const last = new Map();
  let l = 0, best = 0;
  // ...
  return best;
}`,
    },
    solution: {
      pseudo: `ALGORITHM LongestUnique(s)
    last ← map()
    l ← 0
    best ← 0
    for r ← 0 to length(s) - 1 do
        c ← s[r]
        if contains(last, c) and last[c] ≥ l then
            l ← last[c] + 1
        last[c] ← r
        best ← max(best, r - l + 1)
    return best`,
      js: `function LongestUnique(s) {
  const last = new Map();
  let l = 0, best = 0;
  for (let r = 0; r < s.length; r++) {
    const c = s[r];
    if (last.has(c) && last.get(c) >= l) l = last.get(c) + 1;
    last.set(c, r);
    best = Math.max(best, r - l + 1);
  }
  return best;
}`,
      python: `def longest_unique(s):
    last, l, best = {}, 0, 0
    for r, c in enumerate(s):
        if last.get(c, -1) >= l:
            l = last[c] + 1
        last[c] = r
        best = max(best, r - l + 1)
    return best`,
      explain: "Invariant: s[l..r] never contains a repeat, and it is the longest such window ending at r. Each character is handled once with O(1) expected map work, and l only moves forward: Θ(n) expected time, Θ(σ) space for an alphabet of σ characters.",
    },
    complexity: "Θ(n) expected time, Θ(min(n, σ)) space",
    followUp: "Variant: longest substring with at most k distinct characters (keep counts per character and shrink while more than k are present). The same last-seen map powers deduplication windows in log pipelines.",
    distractors: ["if contains(last, c) then", "best ← max(best, r - l)", "l ← last[c]"],
    visual: "sims/patterns.html",
    lesson: "lessons/15-dp-and-interview-patterns/README.md",
  });

  /* ------------------------------------------------------------------ */
  /* 3. Kadane, prefix sums + hashing                                     */
  /* ------------------------------------------------------------------ */
  ForgeProblems.add({
    id: "kadane",
    title: "Maximum Subarray Sum (Kadane)",
    level: 5, chapter: 15, difficulty: 1,
    topics: ["dynamic programming", "arrays", "interview patterns"],
    strategy: "1-D dynamic programming (best sum ending here)",
    source: "Interview classic (Bentley, Programming Pearls) · compare the divide-and-conquer version in Lesson 5",
    summary: "The largest sum of a non-empty contiguous subarray, in one pass.",
    statement: `
<p>Divide-and-conquer solves maximum subarray in Θ(n log n) (Lesson 5); a one-line dynamic-programming idea does it in Θ(n).
It is a favorite interview question because the bug everyone makes is visible only on all-negative input.</p>
<p>Given a <b>non-empty</b> array <code>A[0..n-1]</code> of integers, return the largest possible sum of a
<b>non-empty contiguous</b> subarray <code>A[i..j]</code>.</p>
<ul>
<li>1 ≤ n ≤ 600; values may be negative.</li>
<li><b>Efficiency:</b> must be <b>linear</b>, Θ(n). Trying every (i, j) pair is Θ(n²) and will be flagged.</li>
</ul>`,
    entry: "MaxSubarray",
    params: ["A"],
    tests: [
      { args: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expect: 6, explain: "[4, −1, 2, 1] sums to 6." },
      { args: [[-3, -1, -2]], expect: -1, explain: "All negative: the best non-empty subarray is the single largest element, −1 (not 0!)." },
      { args: [[2, -1, 2]], expect: 3, explain: "Taking the −1 is worth it to join both 2s. Skipping it would not be contiguous." },
      { args: [[5]], expect: 5 },
      { args: [[-5, 2, 3]], expect: 5, explain: "The best subarray does not have to start at index 0." },
      { args: [[1, 2, 3]], expect: 6 },
      { args: [[0, -3, 0]], expect: 0 },
      { args: [[-1]], expect: -1 },
      { args: [[3, -10, 4, -1, 5, -20, 2]], expect: 8 },
    ],
    random: { count: 30, gen: (r, i) => [r.array(r.int(1, 30), i % 4 === 0 ? -20 : -10, i % 4 === 0 ? -1 : 10)] },
    reference: (A) => { let cur = A[0], best = A[0]; for (let i = 1; i < A.length; i++) { cur = Math.max(A[i], cur + A[i]); best = Math.max(best, cur); } return best; },
    growth: { metric: "steps", sizes: [32, 64, 128, 256, 512], gen: (r, n) => [r.array(n, -20, 20)], expect: "n" },
    mutants: [
      {
        fn: (A) => { let cur = 0, best = 0; for (const x of A) { cur = Math.max(0, cur + x); best = Math.max(best, cur); } return best; },
        hint: "On an all-negative array you return 0 — the sum of the EMPTY subarray, which isn't allowed. Start best at A[0] (a real subarray), not at 0.",
      },
      {
        fn: (A) => { let p = 0, best = -Infinity; for (const x of A) { p += x; best = Math.max(best, p); } return best; },
        hint: "Your subarrays all seem to start at index 0 (you track a running total but never restart it). When the sum so far is negative, a fresh start at the current element beats carrying the debt.",
      },
      {
        fn: (A) => { const pos = A.filter((x) => x > 0); return pos.length ? pos.reduce((a, b) => a + b, 0) : Math.max(...A); },
        hint: "You are adding up all the positive numbers — that is a subSEQUENCE. The subarray must be contiguous, so a negative number in between must be paid for (or the run restarted).",
      },
    ],
    lints: [
      { re: NESTED_FOR, lang: "pseudo", message: "Summing every A[i..j] is Θ(n²) (or Θ(n³)). Ask one question per index instead: what is the best sum of a subarray that ENDS here? It is either A[i] alone or A[i] added to the best sum ending at i − 1." },
    ],
    hints: [
      "Let cur(i) be the best sum of a subarray that ends exactly at index i. How can you get cur(i) from cur(i − 1) and A[i]?",
      "cur(i) = max(A[i], cur(i − 1) + A[i]) — extend the previous run or start fresh. The answer is the largest cur(i) over all i. You only need the previous value, not a whole table.",
      "Initialize cur ← A[0] and best ← A[0] (never 0), then for i ← 1 to n − 1: cur ← max(A[i], cur + A[i]); best ← max(best, cur).",
    ],
    starter: {
      pseudo: `ALGORITHM MaxSubarray(A[0..n-1])
    // largest sum of a non-empty contiguous subarray
    cur ← ...
    best ← ...
    for i ← 1 to n - 1 do
        ...
    return best`,
      js: `function MaxSubarray(A) {
  // one pass: best sum ending here, best overall
}`,
    },
    solution: {
      pseudo: `ALGORITHM MaxSubarray(A[0..n-1])
    cur ← A[0]
    best ← A[0]
    for i ← 1 to n - 1 do
        cur ← max(A[i], cur + A[i])
        best ← max(best, cur)
    return best`,
      js: `function MaxSubarray(A) {
  let cur = A[0], best = A[0];
  for (let i = 1; i < A.length; i++) {
    cur = Math.max(A[i], cur + A[i]);
    best = Math.max(best, cur);
  }
  return best;
}`,
      python: `def max_subarray(A):
    cur = best = A[0]
    for x in A[1:]:
        cur = max(x, cur + x)
        best = max(best, cur)
    return best`,
      explain: "Dynamic-programming recurrence cur(i) = max(A[i], cur(i−1) + A[i]); every subarray ends somewhere, so max over i of cur(i) is the answer. One constant-time update per element: T(n) = n − 1 ∈ Θ(n) — beating the Θ(n log n) divide-and-conquer version.",
    },
    complexity: "Θ(n) time, Θ(1) space",
    followUp: "Return the indices too (remember where the current run started), or solve the circular version (answer = max(Kadane, total − min subarray)). Lesson 17's testing card uses exactly the 'best starts at 0' bug to show how random tests plus shrinking find it.",
    distractors: ["best ← 0", "cur ← cur + A[i]", "cur ← max(0, cur + A[i])"],
    visual: "sims/dp-studio.html",
    lesson: "lessons/15-dp-and-interview-patterns/README.md",
  });

  ForgeProblems.add({
    id: "subarray-sum-k",
    title: "Count Subarrays with Sum k",
    level: 5, chapter: 15, difficulty: 2,
    topics: ["prefix sums", "hashing", "arrays", "interview patterns"],
    strategy: "Prefix sums + hash map of counts",
    source: "Interview classic (Lesson 15, Pattern 3)",
    summary: "Count contiguous subarrays summing to k — negatives allowed — in linear time with prefix sums and a hash map.",
    statement: `
<p>A subarray sum is a <b>difference of two prefix sums</b>: <code>A[i..j]</code> sums to <code>P[j+1] − P[i]</code>
where <code>P[t] = A[0] + … + A[t−1]</code>. Counting subarrays with sum <code>k</code> becomes counting pairs of prefix sums
that differ by <code>k</code> — and a hash map finds each partner in O(1).</p>
<p>Given <code>A[0..n-1]</code> (integers, <b>possibly negative or zero</b>) and an integer <code>k</code>, return the
<b>number</b> of non-empty contiguous subarrays whose sum equals <code>k</code>.</p>
<ul>
<li>0 ≤ n ≤ 600. Useful built-ins: <code>map()</code>, <code>contains(M, x)</code>, <code>get(M, x, default)</code>.</li>
<li><b>Efficiency:</b> must be <b>linear</b>, Θ(n) (map operations count as O(1)). A sliding window does <b>not</b> work here because of negative numbers.</li>
</ul>`,
    entry: "CountSubarrays",
    params: ["A", "k"],
    tests: [
      { args: [[1, 1, 1], 2], expect: 2, explain: "[1, 1] starting at index 0 and at index 1." },
      { args: [[1, 2, 1, -1, 2, 1], 3], expect: 5, explain: "Prefix sums 0, 1, 3, 4, 3, 5, 6: five (earlier, later) pairs differ by 3 (Lesson 15's example)." },
      { args: [[1, -1, 0], 0], expect: 3, explain: "[1, −1], [0] and [1, −1, 0]. Empty subarrays don't count." },
      { args: [[3, -3, 3, -3], 0], expect: 4 },
      { args: [[], 0], expect: 0 },
      { args: [[5], 5], expect: 1, explain: "A subarray starting at index 0 pairs with the empty prefix P[0] = 0." },
      { args: [[1, 2, 3], 7], expect: 0 },
      { args: [[0, 0, 0], 0], expect: 6 },
      { args: [[2, -1, 1, 2, -2, 3], 2], expect: 5 },
    ],
    random: { count: 30, gen: (r, i) => [r.array(r.int(0, 30), -4, 4), r.int(-4, 4)] },
    reference: (A, k) => { let c = 0; for (let i = 0; i < A.length; i++) { let s = 0; for (let j = i; j < A.length; j++) { s += A[j]; if (s === k) c++; } } return c; },
    growth: { metric: "steps", sizes: [32, 64, 128, 256, 512], gen: (r, n) => [r.array(n, -5, 5), r.int(-5, 5)], expect: "n" },
    mutants: [
      {
        fn: (A, k) => { const seen = new Map(); let p = 0, c = 0; for (const x of A) { p += x; c += seen.get(p - k) || 0; seen.set(p, (seen.get(p) || 0) + 1); } return c; },
        hint: "Subarrays that start at index 0 are being missed. They correspond to the EMPTY prefix P[0] = 0 — put 0 in the map with count 1 before the loop.",
      },
      {
        fn: (A, k) => { const seen = new Map([[0, 1]]); let p = 0, c = 0; for (const x of A) { p += x; seen.set(p, (seen.get(p) || 0) + 1); c += seen.get(p - k) || 0; } return c; },
        hint: "You add the current prefix to the map BEFORE looking up p − k. With k = 0 that pairs a prefix with itself (an empty subarray). Count first, then record.",
      },
      {
        fn: (A, k) => { let l = 0, s = 0, c = 0; for (let r = 0; r < A.length; r++) { s += A[r]; while (s > k && l <= r) s -= A[l++]; if (s === k && l <= r) c++; } return c; },
        hint: "A sliding window assumes adding an element never lowers the sum — false with negatives and zeros. Use prefix sums: a subarray ending at i has sum k exactly when some earlier prefix equals P − k.",
      },
    ],
    lints: [
      { re: NESTED_FOR, lang: "pseudo", message: "Two nested loops try every subarray: Θ(n²). Walk once, keeping the running prefix sum p and a map counting how many times each prefix value has appeared; the number of subarrays ending here with sum k is the count of p − k." },
    ],
    hints: [
      "A[i..j] sums to k exactly when P[j+1] − P[i] = k. So when you are at the prefix P = P[j+1], how many good subarrays end at j?",
      "Walk left to right keeping the running prefix p and a map seen[value] = how many earlier prefixes had that value. At each step add seen[p − k] to the answer, then record p.",
      "Initialize seen[0] ← 1 (the empty prefix). In the loop: p ← p + A[i]; count ← count + get(seen, p − k, 0); seen[p] ← get(seen, p, 0) + 1 — in that order.",
    ],
    starter: {
      pseudo: `ALGORITHM CountSubarrays(A[0..n-1], k)
    // number of contiguous subarrays with sum exactly k
    seen ← map()
    p ← 0
    count ← 0
    for i ← 0 to n - 1 do
        ...
    return count`,
      js: `function CountSubarrays(A, k) {
  const seen = new Map();
  let p = 0, count = 0;
  // ...
  return count;
}`,
    },
    solution: {
      pseudo: `ALGORITHM CountSubarrays(A[0..n-1], k)
    seen ← map()
    seen[0] ← 1
    p ← 0
    count ← 0
    for i ← 0 to n - 1 do
        p ← p + A[i]
        count ← count + get(seen, p - k, 0)
        seen[p] ← get(seen, p, 0) + 1
    return count`,
      js: `function CountSubarrays(A, k) {
  const seen = new Map([[0, 1]]);
  let p = 0, count = 0;
  for (const x of A) {
    p += x;
    count += seen.get(p - k) || 0;
    seen.set(p, (seen.get(p) || 0) + 1);
  }
  return count;
}`,
      python: `from collections import Counter
def count_subarrays(A, k):
    seen, p, count = Counter({0: 1}), 0, 0
    for x in A:
        p += x
        count += seen[p - k]
        seen[p] += 1
    return count`,
      explain: "Each subarray A[i..j] with sum k corresponds to exactly one pair of prefixes (P[i], P[j+1]) with P[j+1] − P[i] = k, and the map counts those partners as they are needed. n iterations of O(1) expected map work: Θ(n) expected, versus Θ(n²) for all pairs.",
    },
    complexity: "Θ(n) expected time, Θ(n) space",
    followUp: "The same 'prefix minus target' lookup solves longest subarray with sum k (store the FIRST index of each prefix) and subarrays divisible by k (key = prefix mod k). In 2-D it becomes summed-area tables used in computer vision.",
    distractors: ["seen[0] ← 0", "count ← count + get(seen, p + k, 0)", "p ← A[i]"],
    visual: "sims/patterns.html",
    lesson: "lessons/15-dp-and-interview-patterns/README.md",
  });

  /* ------------------------------------------------------------------ */
  /* 4. Monotonic stack                                                   */
  /* ------------------------------------------------------------------ */
  ForgeProblems.add({
    id: "next-greater-element",
    title: "Next Greater Element",
    level: 5, chapter: 15, difficulty: 1,
    topics: ["monotonic stack", "stacks", "arrays", "interview patterns"],
    strategy: "Monotonic stack",
    source: "Interview classic (Lesson 15, Pattern 4)",
    summary: "For every element, the first strictly larger value to its right — all answers in one linear pass with a stack.",
    statement: `
<p>A <b>monotonic stack</b> holds the elements that are still "waiting for an answer"; a new big element answers all the
smaller ones at once. It is behind stock-span indicators, daily-temperature questions and histogram problems.</p>
<p>Given <code>A[0..n-1]</code> of <b>non-negative</b> integers, return an array <code>res[0..n-1]</code> where
<code>res[i]</code> is the <b>value</b> of the first element to the right of position <code>i</code> that is
<b>strictly greater</b> than <code>A[i]</code>, or <code>−1</code> if there is none.</p>
<ul>
<li>0 ≤ n ≤ 600. Stack helpers: <code>stack()</code>, <code>push(S, x)</code>, <code>pop(S)</code>, <code>top(S)</code>, <code>isEmpty(S)</code>.</li>
<li><b>Efficiency:</b> must be <b>linear</b>, Θ(n). Scanning right from every element is Θ(n²) on a decreasing array and will be flagged.</li>
</ul>`,
    entry: "NextGreater",
    params: ["A"],
    tests: [
      { args: [[3, 7, 1, 4, 2, 6]], expect: [7, -1, 4, 6, 6, -1], explain: "When 6 arrives it answers both 2 and 4, which were still waiting on the stack." },
      { args: [[2, 2, 3]], expect: [3, 3, -1], explain: "Equal is not greater: the first 2's answer is 3, not the second 2." },
      { args: [[3, 1, 2, 4]], expect: [4, 2, 4, -1], explain: "The answer for 3 is not its neighbor 1 — keep looking right until something bigger shows up." },
      { args: [[5, 4, 3]], expect: [-1, -1, -1] },
      { args: [[]], expect: [] },
      { args: [[1, 2, 3, 4]], expect: [2, 3, 4, -1] },
      { args: [[0]], expect: [-1] },
      { args: [[6, 0, 8, 1, 3, 5, 5, 9, 2]], expect: [8, 8, 9, 3, 5, 9, 9, -1, -1] },
    ],
    random: { count: 30, gen: (r, i) => [r.array(r.int(0, 30), 0, i % 2 ? 5 : 30)] },
    reference: (A) => A.map((x, i) => { for (let j = i + 1; j < A.length; j++) if (A[j] > x) return A[j]; return -1; }),
    growth: {
      metric: "steps", sizes: [32, 64, 128, 256, 512],
      gen: (r, n) => [r.sorted(n, 0, 1000).reverse()], // decreasing: the brute force's worst case
      expect: "n",
    },
    mutants: [
      {
        fn: (A) => A.map((x, i) => { for (let j = i + 1; j < A.length; j++) if (A[j] >= x) return A[j]; return -1; }),
        hint: "Equal values are answering each other. The next element must be STRICTLY greater: pop while A[top] < A[i], not ≤.",
      },
      {
        fn: (A) => A.map((x, i) => (i + 1 < A.length && A[i + 1] > x ? A[i + 1] : -1)),
        hint: "Only the immediate neighbor seems to be checked. An element keeps waiting until SOME later element is bigger — that's why unanswered indices stay on the stack.",
      },
      {
        fn: (A) => A.map((x, i) => { for (let j = i + 1; j < A.length; j++) if (A[j] > x) return j; return -1; }),
        hint: "You are returning the INDEX of the next greater element. The task asks for its value, A[j].",
      },
    ],
    lints: [
      { re: NESTED_FOR, lang: "pseudo", message: "Scanning right from each element is Θ(n²) on a decreasing array. Keep a stack of indices still waiting for an answer; when A[i] arrives, pop (and answer) every waiting index whose value is smaller, then push i." },
    ],
    hints: [
      "Think of each element as a person waiting to see someone taller to their right. When a tall person arrives, who gets their answer? Does anyone who is still waiting ever need to be looked at again otherwise?",
      "Keep a stack of indices whose answer is not known yet (their values are decreasing from bottom to top). For each i: while the top's value is smaller than A[i], pop it and set its answer to A[i]. Then push i.",
      "res ← array(n, −1); S ← stack(); for i ← 0 to n − 1 do: while not isEmpty(S) and A[top(S)] < A[i] do res[pop(S)] ← A[i]; then push(S, i).",
    ],
    starter: {
      pseudo: `ALGORITHM NextGreater(A[0..n-1])
    // res[i] = first value to the right of i that is > A[i], or -1
    res ← array(n, -1)
    S ← stack()
    for i ← 0 to n - 1 do
        ...
    return res`,
      js: `function NextGreater(A) {
  const res = Array(A.length).fill(-1), S = [];
  // ...
  return res;
}`,
    },
    solution: {
      pseudo: `ALGORITHM NextGreater(A[0..n-1])
    res ← array(n, -1)
    S ← stack()
    for i ← 0 to n - 1 do
        while not isEmpty(S) and A[top(S)] < A[i] do
            j ← pop(S)
            res[j] ← A[i]
        push(S, i)
    return res`,
      js: `function NextGreater(A) {
  const res = Array(A.length).fill(-1), S = [];
  for (let i = 0; i < A.length; i++) {
    while (S.length && A[S[S.length - 1]] < A[i]) res[S.pop()] = A[i];
    S.push(i);
  }
  return res;
}`,
      python: `def next_greater(A):
    res, S = [-1] * len(A), []
    for i, x in enumerate(A):
        while S and A[S[-1]] < x:
            res[S.pop()] = x
        S.append(i)
    return res`,
      explain: "When index j is popped by i, every element strictly between them was ≤ A[j] (otherwise it would have popped j first), so A[i] is j's first greater element. Each index is pushed once and popped at most once, so the inner while runs at most n times in total: Θ(n) by aggregate amortized analysis.",
    },
    complexity: "Θ(n) time (each index pushed and popped at most once), Θ(n) space",
    followUp: "Circular array? Loop i from 0 to 2n − 1 using i mod n. Previous smaller element, stock span, daily temperatures and sliding-window maximum (a monotonic deque) are the same idea.",
    distractors: ["while not isEmpty(S) and A[top(S)] ≤ A[i] do", "res[j] ← i", "push(S, A[i])"],
    visual: "sims/patterns.html",
    lesson: "lessons/15-dp-and-interview-patterns/README.md",
  });

  /* ------------------------------------------------------------------ */
  /* 5. Two pointers after sorting: 3-Sum                                  */
  /* ------------------------------------------------------------------ */
  ForgeProblems.add({
    id: "three-sum-count",
    title: "3-Sum: Count Distinct Zero Triples",
    level: 5, chapter: 15, difficulty: 2,
    topics: ["two pointers", "sorting", "duplicates", "interview patterns"],
    strategy: "Presort + fix one + two pointers",
    source: "Interview classic (Lesson 15, Pattern 1) · presorting idea from Levitin §6.1",
    summary: "Count the different value triples a ≤ b ≤ c (from three different positions) with a + b + c = 0, in Θ(n²).",
    statement: `
<p>3-Sum is the textbook example of <b>transform-and-conquer</b> meeting two pointers: sort once (Levitin §6.1), fix the
smallest element, and solve a two-sum on the rest. The tricky part — and what interviewers watch for — is handling duplicates.</p>
<p>Given an unsorted array <code>A[0..n-1]</code> of integers, return the <b>number of distinct value triples</b>
<code>(a, b, c)</code> with <code>a ≤ b ≤ c</code> and <code>a + b + c = 0</code>, where <code>a</code>, <code>b</code>,
<code>c</code> come from <b>three different positions</b> of <code>A</code>. Two triples are the same if they have the same
three values.</p>
<ul>
<li>0 ≤ n ≤ 200. You may use <code>sorted(A)</code> (it returns a sorted copy).</li>
<li><b>Efficiency:</b> must be Θ(n²). Three nested loops (Θ(n³)) will be flagged.</li>
</ul>`,
    entry: "ThreeSumCount",
    params: ["A"],
    tests: [
      { args: [[-1, 0, 1, 2, -1, -4]], expect: 2, explain: "(−1, −1, 2) and (−1, 0, 1). The two −1s make (−1, 0, 1) appear twice by position, but it counts once." },
      { args: [[0, 0, 0, 0]], expect: 1, explain: "Only one distinct triple: (0, 0, 0)." },
      { args: [[-2, 1, 3]], expect: 0, explain: "−2 + 1 + 1 = 0, but there is only ONE 1 — an element can't be used twice." },
      { args: [[]], expect: 0 },
      { args: [[-3, 1, 2, -1, 0, 3, -2]], expect: 5, explain: "(−3, 0, 3), (−3, 1, 2), (−2, −1, 3), (−2, 0, 2), (−1, 0, 1)." },
      { args: [[-2, 1, 1, 1, 1]], expect: 1 },
      { args: [[1, 2, 3]], expect: 0 },
      { args: [[0, 0]], expect: 0 },
      { args: [[-4, 2, 2, 2, -1, -1, 3, -2, 0]], expect: 4 },
    ],
    random: { count: 30, gen: (r, i) => [r.array(r.int(0, 25), -8, 8)] },
    reference: (A) => { const B = A.slice().sort((x, y) => x - y), seen = new Set(); for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) for (let k = j + 1; k < B.length; k++) if (B[i] + B[j] + B[k] === 0) seen.add(B[i] + "," + B[j] + "," + B[k]); return seen.size; },
    growth: { metric: "steps", sizes: [12, 24, 48, 96, 192], gen: (r, n) => [r.array(n, -4 * n, 4 * n)], expect: "n^2" },
    mutants: [
      {
        fn: (A) => { let c = 0; for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) for (let k = j + 1; k < A.length; k++) if (A[i] + A[j] + A[k] === 0) c++; return c; },
        hint: "You are counting POSITION triples, so repeated values make the same triple count several times ([0, 0, 0, 0] gives 4). After sorting, skip an element that equals the one before it.",
      },
      {
        fn: (A) => { const B = A.slice().sort((x, y) => x - y); let c = 0; for (let i = 0; i < B.length - 2; i++) { if (i > 0 && B[i] === B[i - 1]) continue; let l = i + 1, r = B.length - 1; while (l < r) { const s = B[i] + B[l] + B[r]; if (s < 0) l++; else if (s > 0) r--; else { c++; l++; r--; } } } return c; },
        hint: "Duplicates are skipped for the first element but not for the second: after a hit, advance l past every copy of the value you just used (try [−2, 1, 1, 1, 1]).",
      },
      {
        fn: (A) => { const V = [...new Set(A)].sort((x, y) => x - y); let c = 0; for (let i = 0; i < V.length; i++) for (let j = i; j < V.length; j++) { const t = -V[i] - V[j]; if (t >= V[j] && V.includes(t)) c++; } return c; },
        hint: "An element is being reused: (−2, 1, 1) needs two 1s at different positions. After fixing index i, search only among indices l < r strictly after it.",
      },
    ],
    lints: [
      { re: TRIPLE_FOR, lang: "pseudo", message: "Three nested loops are Θ(n³). Sort first; then for each i the rest is a two-sum on B[i+1..n−1] with target −B[i], which two pointers solve in one linear pass: Θ(n²) overall." },
    ],
    hints: [
      "If the array were sorted and you fixed the smallest value a = B[i], what problem remains for b and c? You have solved it before in linear time.",
      "Sort into B. For each i (skipping B[i] equal to B[i − 1]), run two pointers l = i + 1, r = n − 1 looking for B[l] + B[r] = −B[i].",
      "On a hit: count it, move l forward, then keep moving l while B[l] = B[l − 1] (and l < r) so the same (b, c) values are never counted twice.",
    ],
    starter: {
      pseudo: `ALGORITHM ThreeSumCount(A[0..n-1])
    // number of distinct value triples a ≤ b ≤ c (different positions) with a + b + c = 0
    B ← sorted(A)
    count ← 0
    for i ← 0 to n - 3 do
        ...
    return count`,
      js: `function ThreeSumCount(A) {
  const B = A.slice().sort((x, y) => x - y);
  let count = 0;
  // ...
  return count;
}`,
    },
    solution: {
      pseudo: `ALGORITHM ThreeSumCount(A[0..n-1])
    B ← sorted(A)
    count ← 0
    for i ← 0 to n - 3 do
        if i > 0 and B[i] = B[i - 1] then
            continue
        l ← i + 1
        r ← n - 1
        while l < r do
            s ← B[i] + B[l] + B[r]
            if s < 0 then
                l ← l + 1
            else if s > 0 then
                r ← r - 1
            else
                count ← count + 1
                l ← l + 1
                while l < r and B[l] = B[l - 1] do
                    l ← l + 1
    return count`,
      js: `function ThreeSumCount(A) {
  const B = A.slice().sort((x, y) => x - y), n = B.length;
  let count = 0;
  for (let i = 0; i < n - 2; i++) {
    if (i > 0 && B[i] === B[i - 1]) continue;
    let l = i + 1, r = n - 1;
    while (l < r) {
      const s = B[i] + B[l] + B[r];
      if (s < 0) l++;
      else if (s > 0) r--;
      else { count++; l++; while (l < r && B[l] === B[l - 1]) l++; }
    }
  }
  return count;
}`,
      python: `def three_sum_count(A):
    B, n, count = sorted(A), len(A), 0
    for i in range(n - 2):
        if i and B[i] == B[i - 1]:
            continue
        l, r = i + 1, n - 1
        while l < r:
            s = B[i] + B[l] + B[r]
            if s < 0:
                l += 1
            elif s > 0:
                r -= 1
            else:
                count += 1
                l += 1
                while l < r and B[l] == B[l - 1]:
                    l += 1
    return count`,
      explain: "Sorting costs Θ(n log n); then each of the n values of i runs a two-pointer pass of at most n − i − 1 steps: Σ (n − i) ∈ Θ(n²). Skipping equal B[i] and equal B[l] after a hit makes each distinct value triple counted exactly once.",
    },
    complexity: "Θ(n²) time, Θ(n) space for the sorted copy",
    followUp: "k-Sum generalizes by recursion down to 2-Sum: Θ(n^(k−1)). Whether 3-Sum can be solved in O(n^(2−ε)) is a famous open problem — many geometry problems are '3-Sum-hard'.",
    distractors: ["for j ← i + 1 to n - 1 do", "if B[i] = B[i + 1] then", "r ← r + 1"],
    visual: "sims/patterns.html",
    lesson: "lessons/15-dp-and-interview-patterns/README.md",
  });

  ForgeProblems.add({
    id: "largest-rectangle-histogram",
    title: "Largest Rectangle in a Histogram",
    level: 6, chapter: 15, difficulty: 3,
    topics: ["monotonic stack", "stacks", "arrays", "interview patterns"],
    strategy: "Monotonic (increasing) stack",
    source: "Interview classic (Lesson 15, Pattern 4)",
    summary: "The biggest axis-aligned rectangle under a bar chart, in linear time with an increasing stack.",
    statement: `
<p>This is the monotonic stack's showpiece: for every bar you need the nearest <b>lower</b> bar on each side, and one
stack pass finds all of them. The same routine finds the largest all-ones rectangle in a 0/1 matrix, row by row.</p>
<p>Bars of width 1 stand side by side with heights <code>H[0..n-1]</code> (non-negative integers). Return the
<b>largest area</b> of a rectangle that fits entirely under the bars (its height is the <i>minimum</i> height over the
consecutive bars it spans).</p>
<ul>
<li>0 ≤ n ≤ 600, 0 ≤ H[i] ≤ 10<sup>4</sup>. Stack helpers: <code>stack() push pop top isEmpty</code>.</li>
<li><b>Efficiency:</b> must be <b>linear</b>, Θ(n). Expanding left and right from every bar, or taking the minimum over every
range, is Θ(n²) and will be flagged.</li>
</ul>`,
    entry: "LargestRectangle",
    params: ["H"],
    tests: [
      { args: [[2, 1, 5, 6, 2, 3]], expect: 10, explain: "Bars 5 and 6 give a 5 × 2 rectangle." },
      { args: [[1, 2, 3, 4, 5]], expect: 9, explain: "3 × 3 over the last three bars. Nothing smaller ever arrives, so bars still on the stack at the end must be processed too." },
      { args: [[2, 1, 2]], expect: 3, explain: "The short middle bar spans all three: 1 × 3. Its rectangle reaches LEFT past bars that were already popped." },
      { args: [[]], expect: 0 },
      { args: [[5]], expect: 5 },
      { args: [[3, 3, 3]], expect: 9 },
      { args: [[2, 4, 3, 5, 1]], expect: 9, explain: "Height 3 over bars 1..3 (the lesson's example)." },
      { args: [[6, 2, 5, 4, 5, 1, 6]], expect: 12 },
      { args: [[0, 0, 4, 0]], expect: 4 },
    ],
    random: { count: 30, gen: (r, i) => [r.array(r.int(0, 30), 0, i % 3 ? 10 : 3)] },
    reference: (H) => { let best = 0; for (let i = 0; i < H.length; i++) { let m = Infinity; for (let j = i; j < H.length; j++) { m = Math.min(m, H[j]); best = Math.max(best, m * (j - i + 1)); } } return best; },
    growth: { metric: "steps", sizes: [32, 64, 128, 256, 512], gen: (r, n) => [r.array(n, 50, 52)], expect: "n" },
    mutants: [
      {
        fn: (H) => { const S = []; let best = 0; for (let i = 0; i < H.length; i++) { while (S.length && H[S[S.length - 1]] >= H[i]) { const j = S.pop(); const left = S.length ? S[S.length - 1] : -1; best = Math.max(best, H[j] * (i - left - 1)); } S.push(i); } return best; },
        hint: "Bars still on the stack when the loop ends are never measured (try [1, 2, 3, 4, 5]). Finish with a sentinel: treat position n as a bar of height 0 so everything gets popped.",
      },
      {
        fn: (H) => { const S = []; let best = 0; for (let i = 0; i <= H.length; i++) { const h = i === H.length ? 0 : H[i]; while (S.length && H[S[S.length - 1]] >= h) { const j = S.pop(); best = Math.max(best, H[j] * (i - j)); } S.push(i); } return best; },
        hint: "Your width only counts from the popped bar j to the right edge i. A popped bar's rectangle also extends LEFT, past bars that were popped earlier — the left boundary is the new top of the stack (or −1 if empty), so width = i − top − 1.",
      },
      {
        fn: (H) => { let best = 0; for (let i = 0; i < H.length; i++) { let j = i; while (j < H.length && H[j] >= H[i]) j++; best = Math.max(best, H[i] * (j - i)); } return best; },
        hint: "Each bar's rectangle only extends to the right in your answer. The best rectangle of height H[i] reaches from the nearest lower bar on the LEFT to the nearest lower bar on the right.",
      },
    ],
    lints: [
      { re: NESTED_FOR, lang: "pseudo", message: "Trying every range (or expanding from every bar) is Θ(n²). Keep a stack of bar indices with increasing heights; when a lower bar arrives, pop taller bars — at that moment you know both of their boundaries." },
    ],
    hints: [
      "Fix a bar j and make it the SHORTEST bar of the rectangle. How far can the rectangle stretch? What two positions stop it?",
      "Keep a stack of indices whose heights increase from bottom to top. When bar i is lower than (or equal to) the top bar j, pop j: bar i is j's first lower bar on the right, and the NEW top of the stack is its first lower bar on the left.",
      "For i ← 0 to n (using height 0 at i = n as a sentinel): while stack not empty and H[top] ≥ h: j ← pop; left ← (empty ? −1 : top); best ← max(best, H[j] × (i − left − 1)). Then push i.",
    ],
    starter: {
      pseudo: `ALGORITHM LargestRectangle(H[0..n-1])
    // largest rectangle area under the histogram H
    S ← stack()
    best ← 0
    for i ← 0 to n do
        ...
    return best`,
      js: `function LargestRectangle(H) {
  const S = [];
  let best = 0;
  // ...
  return best;
}`,
    },
    solution: {
      pseudo: `ALGORITHM LargestRectangle(H[0..n-1])
    S ← stack()
    best ← 0
    for i ← 0 to n do
        if i = n then
            h ← 0
        else
            h ← H[i]
        while not isEmpty(S) and H[top(S)] ≥ h do
            j ← pop(S)
            if isEmpty(S) then
                left ← -1
            else
                left ← top(S)
            best ← max(best, H[j] * (i - left - 1))
        push(S, i)
    return best`,
      js: `function LargestRectangle(H) {
  const S = [], n = H.length;
  let best = 0;
  for (let i = 0; i <= n; i++) {
    const h = i === n ? 0 : H[i];
    while (S.length && H[S[S.length - 1]] >= h) {
      const j = S.pop();
      const left = S.length ? S[S.length - 1] : -1;
      best = Math.max(best, H[j] * (i - left - 1));
    }
    S.push(i);
  }
  return best;
}`,
      python: `def largest_rectangle(H):
    S, best, n = [], 0, len(H)
    for i in range(n + 1):
        h = 0 if i == n else H[i]
        while S and H[S[-1]] >= h:
            j = S.pop()
            left = S[-1] if S else -1
            best = max(best, H[j] * (i - left - 1))
        S.append(i)
    return best`,
      explain: "When j is popped by i, every bar strictly between the new top and i is ≥ H[j], so H[j] × (i − left − 1) is the widest rectangle whose shortest bar is j (ties are handled by a later pop of an equal bar). Each index is pushed and popped once: Θ(n) by the aggregate argument.",
    },
    complexity: "Θ(n) time, Θ(n) space",
    followUp: "Maximal rectangle of 1s in a binary matrix: build a histogram per row (heights of consecutive 1s) and run this in Θ(rows × cols). A divide-and-conquer version (split at the minimum bar) is Θ(n log n) on average — a nice comparison with Lesson 5.",
    distractors: ["best ← max(best, H[j] * (i - j))", "for i ← 0 to n - 1 do", "while not isEmpty(S) and H[top(S)] < h do"],
    visual: "sims/patterns.html",
    lesson: "lessons/15-dp-and-interview-patterns/README.md",
  });

  /* ------------------------------------------------------------------ */
  /* 6. Binary search on the answer                                       */
  /* ------------------------------------------------------------------ */
  ForgeProblems.add({
    id: "ship-within-days",
    title: "Ship Packages Within D Days",
    level: 5, chapter: 15, difficulty: 2,
    topics: ["binary search on the answer", "greedy check", "interview patterns"],
    strategy: "Binary search on the answer + greedy feasibility check",
    source: "Interview classic (Lesson 15, Pattern 5) · decrease-by-half from Levitin §4.4",
    summary: "The smallest truck capacity that ships every package, in order, within D days — binary search over capacities.",
    statement: `
<p>When you can't compute the answer directly but can <b>check</b> a guess quickly — and a bigger guess never hurts — binary
search the guess. It's Levitin's decrease-by-half (§4.4) applied to the <i>answer space</i>, and it is how engineers size
clusters, pick timeouts and run <code>git bisect</code>.</p>
<p>Packages with weights <code>W[0..n-1]</code> must be shipped <b>in the given order</b>. Each day the truck is loaded with
the next packages as long as the total stays ≤ its capacity. Return the <b>smallest integer capacity</b> that ships everything
within <code>D</code> days.</p>
<ul>
<li>1 ≤ n ≤ 300, 1 ≤ W[i] ≤ 500, 1 ≤ D ≤ n. You may use <code>max(W)</code> and <code>sum(W)</code>, and write a helper algorithm.</li>
<li><b>Efficiency:</b> Θ(n log(ΣW)). Trying capacities one by one is Θ(n · ΣW) and will be flagged.</li>
</ul>`,
    entry: "ShipWithinDays",
    params: ["W", "D"],
    tests: [
      { args: [[4, 8, 2, 5, 3, 7, 1], 3], expect: 12, explain: "Days [4, 8] [2, 5, 3] [7, 1] with loads 12, 10, 8. Capacity 11 would need 4 days." },
      { args: [[1, 1, 10], 3], expect: 10, explain: "The capacity can never be below the heaviest package (10), however many days you have." },
      { args: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5], expect: 15 },
      { args: [[7], 1], expect: 7 },
      { args: [[5, 5], 1], expect: 10, explain: "One day: the truck must carry the total, 10. A load that exactly equals the capacity is allowed." },
      { args: [[5, 5], 2], expect: 5 },
      { args: [[3, 2, 2, 4, 1, 4], 3], expect: 6 },
      { args: [[1, 2, 3, 1, 1], 4], expect: 3 },
      { args: [[9, 1, 1, 1, 1, 1, 1, 9], 2], expect: 12 },
    ],
    random: { count: 25, gen: (r, i) => { const n = r.int(1, 25); return [r.array(n, 1, 30), r.int(1, n)]; } },
    reference: (W, D) => { const days = (cap) => { let d = 1, load = 0; for (const w of W) { if (load + w > cap) { d++; load = 0; } load += w; } return d; }; let c = Math.max(...W); while (days(c) > D) c++; return c; },
    growth: { metric: "steps", sizes: [16, 32, 64, 128, 256], gen: (r, n) => [r.array(n, 1, 50), 3], expect: "n log n" },
    mutants: [
      {
        fn: (W, D) => { const days = (cap) => { let d = 1, load = 0; for (const w of W) { if (load + w > cap) { d++; load = 0; } load += w; } return d; }; let lo = 1, hi = W.reduce((a, b) => a + b, 0); while (lo < hi) { const m = Math.floor((lo + hi) / 2); if (days(m) <= D) hi = m; else lo = m + 1; } return lo; },
        hint: "Your answer can be smaller than the heaviest package — no truck of that size can carry it. Start the search at lo ← max(W), the smallest capacity that could possibly work.",
      },
      {
        fn: (W, D) => { const days = (cap) => { let d = 0, load = 0; for (const w of W) { if (load + w > cap) { d++; load = 0; } load += w; } return d; }; let lo = Math.max(...W), hi = W.reduce((a, b) => a + b, 0); while (lo < hi) { const m = Math.floor((lo + hi) / 2); if (days(m) <= D) hi = m; else lo = m + 1; } return lo; },
        hint: "Your day counter is one short: the first day is already a day before any 'start a new day' happens. Initialize days ← 1.",
      },
      {
        fn: (W, D) => { const days = (cap) => { let d = 1, load = 0; for (const w of W) { if (load + w >= cap) { d++; load = 0; } load += w; } return d; }; let lo = Math.max(...W), hi = W.reduce((a, b) => a + b, 0); while (lo < hi) { const m = Math.floor((lo + hi) / 2); if (days(m) <= D) hi = m; else lo = m + 1; } return lo; },
        hint: "A load that EXACTLY equals the capacity is fine. Start a new day only when load + W[i] > cap (strictly greater).",
      },
    ],
    lints: [
      { re: "for\\s+\\w+\\s*←\\s*max\\(", lang: "pseudo", message: "Trying capacities one at a time from max(W) upward costs one full check per capacity: Θ(n · ΣW). Feasibility is monotone (if capacity c works, c + 1 works), so binary search the capacity range instead." },
      { re: "while[^\\n]*DaysNeeded[^\\n]*>", lang: "pseudo", message: "Increasing the capacity by 1 until it works makes one check per capacity: Θ(n · ΣW). Feasibility is monotone, so binary search between max(W) and sum(W) instead." },
    ],
    hints: [
      "If capacity c ships everything in ≤ D days, does capacity c + 1 also work? What does that say about the set of good capacities — and which search does that allow?",
      "Write a helper DaysNeeded(W, cap) that loads greedily and counts days (Θ(n)). The answer lies between lo = max(W) and hi = sum(W); binary search for the FIRST capacity with DaysNeeded ≤ D.",
      "while lo < hi: mid ← (lo + hi) div 2; if DaysNeeded(W, mid) ≤ D then hi ← mid (mid works, maybe smaller does too) else lo ← mid + 1. Return lo.",
    ],
    starter: {
      pseudo: `ALGORITHM ShipWithinDays(W[0..n-1], D)
    lo ← max(W)
    hi ← sum(W)
    while lo < hi do
        ...
    return lo

ALGORITHM DaysNeeded(W[0..n-1], cap)
    // how many days does a truck of capacity cap need?
    ...`,
      js: `function ShipWithinDays(W, D) {
  // binary search the capacity; check a guess with a greedy day count
}`,
    },
    solution: {
      pseudo: `ALGORITHM ShipWithinDays(W[0..n-1], D)
    lo ← max(W)
    hi ← sum(W)
    while lo < hi do
        mid ← (lo + hi) div 2
        if DaysNeeded(W, mid) ≤ D then
            hi ← mid
        else
            lo ← mid + 1
    return lo

ALGORITHM DaysNeeded(W[0..n-1], cap)
    days ← 1
    load ← 0
    for i ← 0 to n - 1 do
        if load + W[i] > cap then
            days ← days + 1
            load ← 0
        load ← load + W[i]
    return days`,
      js: `function ShipWithinDays(W, D) {
  const days = (cap) => {
    let d = 1, load = 0;
    for (const w of W) { if (load + w > cap) { d++; load = 0; } load += w; }
    return d;
  };
  let lo = Math.max(...W), hi = W.reduce((a, b) => a + b, 0);
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (days(mid) <= D) hi = mid; else lo = mid + 1;
  }
  return lo;
}`,
      python: `def ship_within_days(W, D):
    def days_needed(cap):
        days, load = 1, 0
        for w in W:
            if load + w > cap:
                days, load = days + 1, 0
            load += w
        return days
    lo, hi = max(W), sum(W)
    while lo < hi:
        mid = (lo + hi) // 2
        if days_needed(mid) <= D:
            hi = mid
        else:
            lo = mid + 1
    return lo`,
      explain: "Greedy loading is optimal for a fixed capacity, and feasibility is monotone in the capacity, so the good capacities form a suffix [c*, ΣW]; the loop keeps c* inside [lo, hi] and halves the range each time. ⌈log₂(ΣW − max W + 1)⌉ checks × Θ(n) each = Θ(n log ΣW).",
    },
    complexity: "Θ(n log(ΣW)) time, Θ(1) extra space",
    followUp: "Same template: 'split array into k parts minimizing the largest sum', 'Koko eating bananas', 'maximize the minimum distance between routers'. In production this is capacity planning: the smallest cluster that meets a latency target, when each trial is a load test.",
    distractors: ["lo ← 1", "hi ← mid - 1", "if load + W[i] ≥ cap then", "days ← 0"],
    visual: "sims/patterns.html",
    lesson: "lessons/15-dp-and-interview-patterns/README.md",
  });

  /* ------------------------------------------------------------------ */
  /* 7. Intervals                                                         */
  /* ------------------------------------------------------------------ */
  ForgeProblems.add({
    id: "merge-intervals",
    title: "Merge Overlapping Intervals",
    level: 5, chapter: 15, difficulty: 1,
    topics: ["intervals", "sorting", "sweep line", "interview patterns"],
    strategy: "Sort by start, then one sweep",
    source: "Interview classic (Lesson 15, Pattern 9) · presorting from Levitin §6.1",
    summary: "Merge all overlapping or touching closed intervals into a sorted list of disjoint ones.",
    statement: `
<p>Calendars (free/busy), firewall rules merging Internet Protocol (IP) address ranges, genome annotations: all of them
merge intervals. Sorting first turns a messy all-pairs problem into one left-to-right sweep.</p>
<p>Given a list <code>I</code> of <b>closed</b> intervals <code>[s, e]</code> (with <code>s ≤ e</code>, in any order),
merge every group of intervals that overlap <b>or touch</b> (<code>[1, 3]</code> and <code>[3, 5]</code> become
<code>[1, 5]</code>). Return the merged intervals as a list of <code>[s, e]</code> pairs sorted by start.</p>
<ul>
<li>0 ≤ n ≤ 600. <code>sorted(I)</code> sorts pairs by their first value, then second.</li>
<li><b>Efficiency:</b> Θ(n log n) — sorting plus one linear pass. Repeatedly comparing every pair of intervals is Θ(n²) or worse and will be flagged.</li>
</ul>`,
    entry: "MergeIntervals",
    params: ["I"],
    tests: [
      { args: [[[1, 4], [2, 5], [7, 9], [8, 10], [12, 13]]], expect: [[1, 5], [7, 10], [12, 13]], explain: "[1,4]+[2,5] → [1,5]; [7,9]+[8,10] → [7,10]; [12,13] alone." },
      { args: [[[6, 8], [1, 3], [3, 5]]], expect: [[1, 5], [6, 8]], explain: "Unsorted input, and [1,3] touches [3,5] (closed intervals share the point 3)." },
      { args: [[[1, 10], [2, 3], [4, 5]]], expect: [[1, 10]], explain: "[2,3] lies inside [1,10]: the merged end must stay 10, not shrink to 3." },
      { args: [[]], expect: [] },
      { args: [[[5, 5]]], expect: [[5, 5]] },
      { args: [[[2, 3], [1, 4], [5, 6], [0, 1]]], expect: [[0, 4], [5, 6]] },
      { args: [[[1, 2], [3, 4]]], expect: [[1, 2], [3, 4]], explain: "2 and 3 are different points: no overlap." },
    ],
    random: {
      count: 30,
      gen: (r, i) => [Array.from({ length: r.int(0, 20) }, () => { const s = r.int(0, 40); return [s, s + r.int(0, 6)]; })],
    },
    reference: (I) => { const out = []; for (const [s, e] of I.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])) { if (out.length && s <= out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], e); else out.push([s, e]); } return out; },
    growth: {
      metric: "steps", sizes: [32, 64, 128, 256, 512],
      gen: (r, n) => [r.shuffle(Array.from({ length: n }, (_, k) => [3 * k, 3 * k + 1]))], // n disjoint intervals, shuffled
      expect: "n log n",
    },
    mutants: [
      {
        fn: (I) => { const out = []; for (const [s, e] of I) { if (out.length && s <= out[out.length - 1][1] && s >= out[out.length - 1][0]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], e); else out.push([s, e]); } return out; },
        hint: "The sweep only works on intervals ordered by start — your output follows the input order. Sort the intervals first.",
      },
      {
        fn: (I) => { const out = []; for (const [s, e] of I.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])) { if (out.length && s < out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], e); else out.push([s, e]); } return out; },
        hint: "Touching intervals like [1, 3] and [3, 5] are not merged. The intervals are closed, so they share the point 3: use s ≤ current end.",
      },
      {
        fn: (I) => { const out = []; for (const [s, e] of I.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])) { if (out.length && s <= out[out.length - 1][1]) out[out.length - 1][1] = e; else out.push([s, e]); } return out; },
        hint: "When an interval lies completely inside the current block (like [2, 3] inside [1, 10]) your block shrinks. The new end is the MAXIMUM of the two ends.",
      },
    ],
    lints: [
      { re: NESTED_FOR, lang: "pseudo", message: "Comparing every pair of intervals (and repeating until nothing changes) is Θ(n²) or worse. After sorting by start, an interval can only merge with the block you are currently building — one pass is enough." },
    ],
    hints: [
      "If the intervals were sorted by start, which already-merged block could the next interval possibly overlap?",
      "Sort by start. Walk through the intervals keeping the output list; the last block in the output is the only candidate for merging.",
      "For each (s, e): if the output is non-empty and s ≤ the last block's end, set that end to max(end, e); otherwise append [s, e] as a new block.",
    ],
    starter: {
      pseudo: `ALGORITHM MergeIntervals(I[0..n-1])
    // closed intervals [s, e]; merge overlapping or touching ones
    J ← sorted(I)
    out ← []
    for each (s, e) in J do
        ...
    return out`,
      js: `function MergeIntervals(I) {
  const J = I.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const out = [];
  // ...
  return out;
}`,
    },
    solution: {
      pseudo: `ALGORITHM MergeIntervals(I[0..n-1])
    J ← sorted(I)
    out ← []
    for each (s, e) in J do
        m ← length(out)
        if m > 0 and s ≤ out[m - 1][1] then
            out[m - 1][1] ← max(out[m - 1][1], e)
        else
            append(out, [s, e])
    return out`,
      js: `function MergeIntervals(I) {
  const J = I.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const out = [];
  for (const [s, e] of J) {
    const last = out[out.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}`,
      python: `def merge_intervals(I):
    out = []
    for s, e in sorted(I):
        if out and s <= out[-1][1]:
            out[-1][1] = max(out[-1][1], e)
        else:
            out.append([s, e])
    return out`,
      explain: "After sorting, any interval that overlaps an earlier block must overlap the LAST block (starts only grow), so one comparison per interval suffices. Θ(n log n) for the sort plus Θ(n) for the sweep.",
    },
    complexity: "Θ(n log n) time (sorting dominates), Θ(n) space",
    followUp: "Insert one new interval into an already-merged list in Θ(n) (or find its place by binary search). Interval trees answer 'which intervals contain point x?' in O(log n + k) when the set keeps changing.",
    distractors: ["if m > 0 and s < out[m - 1][1] then", "out[m - 1][1] ← e", "for each (s, e) in I do"],
    visual: "sims/patterns.html",
    lesson: "lessons/15-dp-and-interview-patterns/README.md",
  });

  ForgeProblems.add({
    id: "meeting-rooms",
    title: "Minimum Meeting Rooms",
    level: 5, chapter: 15, difficulty: 2,
    topics: ["intervals", "sweep line", "sorting", "interview patterns"],
    strategy: "Sweep line over sorted starts and ends",
    source: "Interview classic (Lesson 15, Pattern 9)",
    summary: "The minimum number of rooms so that no two overlapping meetings share one — a sweep over sorted start and end times.",
    statement: `
<p>"How many rooms / gates / servers do we need?" is the peak number of simultaneous intervals. Sweep through time:
+1 when something starts, −1 when something ends, and remember the peak.</p>
<p>Each meeting is a <b>half-open</b> interval <code>[s, e)</code> with <code>s &lt; e</code>: a meeting ending at 5 frees its
room for a meeting starting at 5. Given the list <code>M</code> of meetings, return the <b>minimum number of rooms</b> needed.</p>
<ul>
<li>0 ≤ n ≤ 600. <code>M[i][0]</code> is the start, <code>M[i][1]</code> the end. You may use <code>sorted(…)</code>.</li>
<li><b>Efficiency:</b> Θ(n log n). Counting, for every meeting, how many others are running at its start time is Θ(n²) and will be flagged.</li>
</ul>`,
    entry: "MinRooms",
    params: ["M"],
    tests: [
      { args: [[[1, 4], [2, 6], [5, 8], [7, 9], [3, 5]]], expect: 3, explain: "Between times 3 and 4, meetings [1,4), [2,6) and [3,5) all run (the lesson's sweep)." },
      { args: [[[1, 5], [5, 10]]], expect: 1, explain: "Half-open: the first meeting is over exactly when the second starts, so one room is enough." },
      { args: [[[0, 30], [5, 10], [15, 20]]], expect: 2, explain: "The long meeting overlaps each short one, but the short ones never overlap each other." },
      { args: [[]], expect: 0 },
      { args: [[[7, 10], [2, 4]]], expect: 1 },
      { args: [[[1, 2], [1, 2], [1, 2]]], expect: 3 },
      { args: [[[1, 10], [2, 3], [4, 5], [6, 7]]], expect: 2 },
      { args: [[[1, 3], [2, 4], [3, 5], [4, 6]]], expect: 2, explain: "A chain of overlaps is not the same as everything overlapping at once." },
      { args: [[[1, 10], [2, 7], [3, 19], [8, 12], [10, 20], [11, 30]]], expect: 4 },
    ],
    random: {
      count: 30,
      gen: (r, i) => [Array.from({ length: r.int(0, 20) }, () => { const s = r.int(0, 30); return [s, s + r.int(1, 8)]; })],
    },
    reference: (M) => { const ev = []; for (const [s, e] of M) { ev.push([s, 1], [e, -1]); } ev.sort((a, b) => a[0] - b[0] || a[1] - b[1]); let cur = 0, best = 0; for (const [, d] of ev) { cur += d; best = Math.max(best, cur); } return best; },
    growth: {
      metric: "steps", sizes: [32, 64, 128, 256, 512],
      gen: (r, n) => [Array.from({ length: n }, () => { const s = r.int(0, 4 * n); return [s, s + r.int(1, 20)]; })],
      expect: "n log n",
    },
    mutants: [
      {
        fn: (M) => { const ev = []; for (const [s, e] of M) { ev.push([s, -1], [e, 1]); } ev.sort((a, b) => a[0] - b[0] || a[1] - b[1]); let cur = 0, best = 0; for (const [, d] of ev) { cur -= d; best = Math.max(best, cur); } return best; },
        hint: "A meeting that ends at time 5 still blocks one that starts at 5 in your answer. Meetings are half-open [s, e): free the room first — reuse it when start ≥ earliest end.",
      },
      {
        fn: (M) => { const S = M.slice().sort((a, b) => a[0] - b[0]); let rooms = 0, j = 0; for (let i = 0; i < S.length; i++) { if (S[i][0] >= S[j][1]) j++; else rooms++; } return rooms; },
        hint: "The end times need their OWN sorted order. If you keep each end next to its start, 'the earliest-ending meeting still running' is not at index j. Sort the starts and the ends separately.",
      },
      {
        fn: (M) => { const S = M.slice().sort((a, b) => a[0] - b[0]); let rooms = S.length ? 1 : 0; for (let i = 1; i < S.length; i++) if (S[i][0] < S[i - 1][1]) rooms++; return rooms; },
        hint: "You add a room whenever a meeting overlaps the PREVIOUS one — but a chain [1,3), [2,4), [3,5) never has three meetings at once. You need the peak number running simultaneously.",
      },
    ],
    lints: [
      { re: NESTED_FOR, lang: "pseudo", message: "Counting overlaps with a loop inside a loop is Θ(n²). Sort all start times and all end times separately; walk the starts, and advance an end pointer whenever the earliest unfinished end is ≤ the current start (a room is freed)." },
    ],
    hints: [
      "The number of rooms needed is the largest number of meetings running at the same moment. When does that number go up? When does it go down?",
      "Make two sorted lists: all start times and all end times. Walk the starts in order with a pointer j into the ends: j points at the earliest meeting end not yet 'used'.",
      "For each start (in order): if start ≥ ends[j], a room just freed up — reuse it (j ← j + 1); otherwise rooms ← rooms + 1. Return rooms.",
    ],
    starter: {
      pseudo: `ALGORITHM MinRooms(M[0..n-1])
    // M[i] = [start, end), half-open
    starts ← array(n, 0)
    ends ← array(n, 0)
    ...
    return rooms`,
      js: `function MinRooms(M) {
  // sweep over sorted starts and sorted ends
}`,
    },
    solution: {
      pseudo: `ALGORITHM MinRooms(M[0..n-1])
    starts ← array(n, 0)
    ends ← array(n, 0)
    for i ← 0 to n - 1 do
        starts[i] ← M[i][0]
        ends[i] ← M[i][1]
    starts ← sorted(starts)
    ends ← sorted(ends)
    rooms ← 0
    j ← 0
    for i ← 0 to n - 1 do
        if starts[i] ≥ ends[j] then
            j ← j + 1
        else
            rooms ← rooms + 1
    return rooms`,
      js: `function MinRooms(M) {
  const starts = M.map((m) => m[0]).sort((a, b) => a - b);
  const ends = M.map((m) => m[1]).sort((a, b) => a - b);
  let rooms = 0, j = 0;
  for (let i = 0; i < starts.length; i++) {
    if (starts[i] >= ends[j]) j++;
    else rooms++;
  }
  return rooms;
}`,
      python: `def min_rooms(M):
    starts = sorted(s for s, e in M)
    ends = sorted(e for s, e in M)
    rooms = j = 0
    for s in starts:
        if s >= ends[j]:
            j += 1
        else:
            rooms += 1
    return rooms`,
      explain: "rooms counts rooms ever opened and j counts rooms freed so far, so rooms − j is the number busy; a new room is opened only when every opened room is still busy at this start. That makes rooms the peak concurrency. Two sorts Θ(n log n) plus a Θ(n) sweep.",
    },
    complexity: "Θ(n log n) time, Θ(n) space",
    followUp: "Also report WHICH room each meeting gets: keep a min-heap of (end time, room id) and reuse the room at the top. With a stream of bookings, a balanced tree or segment tree over time keeps the peak up to date.",
    distractors: ["if starts[i] > ends[j] then", "ends ← M[i][1]", "rooms ← rooms - 1"],
    visual: "sims/patterns.html",
    lesson: "lessons/15-dp-and-interview-patterns/README.md",
  });

  /* ------------------------------------------------------------------ */
  /* 8. Heaps: top-k and k-way merge                                      */
  /* ------------------------------------------------------------------ */
  ForgeProblems.add({
    id: "top-k-frequent",
    title: "Top k Most Frequent Values",
    level: 5, chapter: 15, difficulty: 2,
    topics: ["hashing", "heaps", "counting", "interview patterns"],
    strategy: "Count with a hash map, then select the top k",
    source: "Interview classic (Lesson 15, Pattern 8)",
    summary: "Return the k values that occur most often (ties: smaller value first), counting in one pass with a hash map.",
    statement: `
<p>"Trending" lists, top search queries, the busiest endpoints in a log: count with a hash map, then pick the top <code>k</code>.
The expensive mistake is counting each distinct value by rescanning the whole input.</p>
<p>Given an array <code>A[0..n-1]</code> of integers and <code>k</code> (1 ≤ k ≤ number of distinct values), return a list of
the <code>k</code> values with the <b>highest frequency</b>, ordered by frequency (highest first); among equal frequencies the
<b>smaller value comes first</b> (both for choosing and for ordering).</p>
<ul>
<li>1 ≤ n ≤ 600. Handy: <code>map()</code>, <code>get(M, x, 0)</code>, <code>keys(M)</code>; <code>sorted(L)</code> sorts pairs like <code>[−count, value]</code> lexicographically; heaps: <code>priorityQueue()</code>, <code>insert(Q, item, priority)</code>, <code>deleteMin(Q)</code>.</li>
<li><b>Efficiency:</b> Θ(n log n) or better. Counting each distinct value with its own scan is Θ(n · d) and will be flagged.</li>
</ul>`,
    entry: "TopKFrequent",
    params: ["A", "k"],
    tests: [
      { args: [[1, 1, 1, 2, 2, 3], 2], expect: [1, 2], explain: "1 appears 3 times, 2 twice, 3 once." },
      { args: [[5, 5, 4, 4, 4, 6, 6, 6], 2], expect: [4, 6], explain: "4 and 6 both appear 3 times; the smaller value comes first." },
      { args: [[9, 8, 7, 8, 9, 9, 1], 3], expect: [9, 8, 1], explain: "7 and 1 tie with one occurrence each; the tie goes to the smaller value, 1." },
      { args: [[7], 1], expect: [7] },
      { args: [[3, 1, 2, 2, 3, 1, 3], 1], expect: [3] },
      { args: [[-1, -1, 2, 2, 3], 3], expect: [-1, 2, 3] },
      { args: [[4, 1, 4, 2, 1, 4, 3, 3, 3, 3], 4], expect: [3, 4, 1, 2] },
    ],
    random: { count: 30, gen: (r, i) => { const A = r.array(r.int(1, 40), -5, 10); const d = new Set(A).size; return [A, r.int(1, d)]; } },
    reference: (A, k) => { const c = new Map(); for (const x of A) c.set(x, (c.get(x) || 0) + 1); return [...c].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, k).map((p) => p[0]); },
    growth: { metric: "steps", sizes: [32, 64, 128, 256, 512], gen: (r, n) => [r.array(n, 0, n >> 1), 3], expect: "n log n" },
    mutants: [
      {
        fn: (A, k) => { const c = new Map(); for (const x of A) c.set(x, (c.get(x) || 0) + 1); return [...c].sort((a, b) => b[1] - a[1] || b[0] - a[0]).slice(0, k).map((p) => p[0]); },
        hint: "Ties are broken the wrong way round: among values with the same count, the SMALLER value must come first (sort pairs by [−count, value]).",
      },
      {
        fn: (A, k) => { const c = new Map(); for (const x of A) c.set(x, (c.get(x) || 0) + 1); return [...c].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, k).map((p) => p[1]); },
        hint: "You are returning the COUNTS. The task wants the values themselves, ordered by their counts.",
      },
      {
        fn: (A, k) => { const c = new Map(); for (const x of A) c.set(x, (c.get(x) || 0) + 1); return [...c].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, k).map((p) => p[0]).sort((a, b) => a - b); },
        hint: "You pick the right k values but list them in value order. The output must be ordered by frequency, most frequent first.",
      },
    ],
    lints: [
      { re: NESTED_FOR, lang: "pseudo", message: "Counting each value by rescanning A is Θ(n · d). One pass with a hash map counts everything: C[x] ← get(C, x, 0) + 1. Then sort (or heap) the d distinct (count, value) pairs." },
    ],
    hints: [
      "Two separate jobs: (1) how often does each value occur, (2) which k are the biggest. Which data structure answers (1) in a single pass?",
      "Count with a map C. Then build a list of pairs [−C[x], x] for every distinct x: sorting these ascending puts the highest count first and, among ties, the smaller value first.",
      "After sorting the pairs P, the answer is P[0][1], P[1][1], …, P[k−1][1]. (A size-k heap does the selection in Θ(d log k) if d is huge.)",
    ],
    starter: {
      pseudo: `ALGORITHM TopKFrequent(A[0..n-1], k)
    C ← map()
    for i ← 0 to n - 1 do
        ...
    out ← []
    ...
    return out`,
      js: `function TopKFrequent(A, k) {
  const C = new Map();
  // count, then pick the top k (ties: smaller value first)
}`,
    },
    solution: {
      pseudo: `ALGORITHM TopKFrequent(A[0..n-1], k)
    C ← map()
    for i ← 0 to n - 1 do
        C[A[i]] ← get(C, A[i], 0) + 1
    P ← []
    for each x in keys(C) do
        append(P, [-C[x], x])
    P ← sorted(P)
    out ← []
    for i ← 0 to k - 1 do
        append(out, P[i][1])
    return out`,
      js: `function TopKFrequent(A, k) {
  const C = new Map();
  for (const x of A) C.set(x, (C.get(x) || 0) + 1);
  return [...C].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, k).map((p) => p[0]);
}`,
      python: `from collections import Counter
def top_k_frequent(A, k):
    C = Counter(A)
    P = sorted((-c, x) for x, c in C.items())
    return [x for _, x in P[:k]]`,
      explain: "Counting is one pass of O(1) expected map updates, Θ(n). Sorting the d ≤ n distinct pairs is Θ(d log d), so the total is Θ(n + d log d) ⊆ Θ(n log n). A size-k min-heap would make the selection Θ(d log k).",
    },
    complexity: "Θ(n + d log d) time, Θ(d) space (d = number of distinct values)",
    followUp: "Bucket the values by count (counts are ≤ n) for Θ(n) total. For an unbounded stream you can't keep every count: the Count-Min sketch plus a small heap (Lesson 16) approximates heavy hitters in tiny memory.",
    distractors: ["append(P, [C[x], x])", "append(out, P[i][0])", "C[A[i]] ← 1"],
    visual: "sims/heap-lab.html",
    lesson: "lessons/15-dp-and-interview-patterns/README.md",
  });

  ForgeProblems.add({
    id: "k-way-merge",
    title: "Merge k Sorted Lists (Heap)",
    level: 5, chapter: 17, difficulty: 2,
    topics: ["heaps", "priority queue", "merging", "external sorting"],
    strategy: "Min-heap of list heads",
    source: "Interview classic · external merge sort (Lesson 17, Playbook Card 8)",
    summary: "Merge k sorted lists into one sorted list using a min-heap holding one head per list.",
    statement: `
<p>External merge sort — how databases sort data far bigger than memory — ends with a <b>k-way merge</b> of sorted runs.
Scanning all k heads for every output element costs Θ(N·k); a min-heap of the k heads costs Θ(N log k).</p>
<p>Given a list <code>L[0..k-1]</code> of lists, each sorted in nondecreasing order (some may be empty), return <b>one</b>
list containing all <code>N</code> elements in nondecreasing order. Keep duplicates.</p>
<ul>
<li>0 ≤ k ≤ 150, 0 ≤ N ≤ 600. Heap helpers: <code>Q ← priorityQueue()</code>, <code>insert(Q, item, priority)</code>,
<code>deleteMin(Q)</code> (returns the item), <code>isEmpty(Q)</code>. An item can be a pair like <code>[i, p]</code>
(list number, position) and can be unpacked with <code>(i, p) ← deleteMin(Q)</code>.</li>
<li><code>sorted(…)</code> is <b>not</b> allowed. <b>Efficiency:</b> Θ(N log k). Scanning all heads for each output element, or merging the lists one after another, is Θ(N·k) and will be flagged.</li>
</ul>`,
    entry: "KWayMerge",
    params: ["L"],
    tests: [
      { args: [[[1, 4, 7], [2, 5, 8], [3, 6, 9]]], expect: [1, 2, 3, 4, 5, 6, 7, 8, 9], explain: "Each time a list's head is output, that list's NEXT element joins the heap." },
      { args: [[[1, 3], [], [2]]], expect: [1, 2, 3], explain: "Empty lists contribute nothing — don't put them in the heap." },
      { args: [[[5, 5], [5]]], expect: [5, 5, 5], explain: "Duplicates are kept." },
      { args: [[]], expect: [] },
      { args: [[[], []]], expect: [] },
      { args: [[[-2, 0, 10], [-5, 20]]], expect: [-5, -2, 0, 10, 20] },
      { args: [[[1], [1], [1], [1]]], expect: [1, 1, 1, 1] },
      { args: [[[10, 20, 30, 40, 50]]], expect: [10, 20, 30, 40, 50] },
    ],
    random: {
      count: 30,
      gen: (r, i) => [Array.from({ length: r.int(0, 8) }, () => r.sorted(r.int(0, 6), -10, 10))],
    },
    reference: (L) => [].concat(...L).sort((a, b) => a - b),
    forbid: ["sorted"],
    growth: {
      metric: "steps", sizes: [32, 64, 128, 256, 512],
      gen: (r, n) => [Array.from({ length: n >> 2 }, () => r.sorted(4, 0, 1000))], // k = N/4 lists of 4
      expect: "n log n",
    },
    mutants: [
      {
        fn: (L) => [].concat(...L),
        hint: "You are gluing the lists together end to end. The output must be sorted: repeatedly take the smallest remaining head.",
      },
      {
        fn: (L) => L.filter((l) => l.length).map((l) => l[0]).sort((a, b) => a - b),
        hint: "Only the first element of each list comes out. After you output a list's head, insert that list's NEXT element (position p + 1) into the heap.",
      },
      {
        fn: (L) => [...new Set([].concat(...L))].sort((a, b) => a - b),
        hint: "Duplicates disappear from your output. Merging keeps every element — don't use a set, and make sure equal values from different lists both get output.",
      },
    ],
    lints: [
      { re: NESTED_FOR, lang: "pseudo", message: "Looking through all k heads for every output element (or merging the lists one by one) costs Θ(N·k). Keep the k current heads in a min-heap: each output costs one deleteMin and at most one insert, O(log k)." },
      { re: "^( *)while\\b.*\\n(?:(?:\\1 .*)?\\n)*?\\1 +for\\b", lang: "pseudo", message: "If the efficiency check flagged you: a for loop over all k lists inside the output loop scans every head for every element — Θ(N·k). A min-heap (priorityQueue) hands you the smallest head in O(log k)." },
      { re: "(\\w+) ← \\w+\\(\\1\\s*,", lang: "pseudo", message: "If the efficiency check flagged you: merging the lists into the result one after another re-copies the growing result k times — Θ(N·k). Merge all k heads at once with a min-heap (or merge pairs in rounds, like mergesort)." },
    ],
    hints: [
      "At any moment, the next output is the smallest among the k current heads. Which data structure gives you the minimum of a changing set quickly?",
      "Put [i, 0] into a min-heap with priority L[i][0] for every non-empty list. Repeatedly remove the minimum [i, p], output L[i][p], and if list i has more elements, insert [i, p + 1] with priority L[i][p + 1].",
      "Loop: while not isEmpty(Q) do (i, p) ← deleteMin(Q); append(out, L[i][p]); if p + 1 < length(L[i]) then insert(Q, [i, p + 1], L[i][p + 1]).",
    ],
    starter: {
      pseudo: `ALGORITHM KWayMerge(L[0..k-1])
    // L[i] is sorted; merge all lists into one sorted list
    Q ← priorityQueue()
    ...
    out ← []
    while not isEmpty(Q) do
        ...
    return out`,
      js: `function KWayMerge(L) {
  // use a min-heap of list heads (write a tiny binary heap: push and pop in O(log k))
}`,
    },
    solution: {
      pseudo: `ALGORITHM KWayMerge(L[0..k-1])
    Q ← priorityQueue()
    for i ← 0 to k - 1 do
        if length(L[i]) > 0 then
            insert(Q, [i, 0], L[i][0])
    out ← []
    while not isEmpty(Q) do
        (i, p) ← deleteMin(Q)
        append(out, L[i][p])
        if p + 1 < length(L[i]) then
            insert(Q, [i, p + 1], L[i][p + 1])
    return out`,
      js: `function KWayMerge(L) {
  // minimal binary min-heap of [value, list, pos]
  const h = [];
  const less = (a, b) => a[0] < b[0];
  const push = (x) => { h.push(x); let i = h.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (less(h[i], h[p])) { [h[i], h[p]] = [h[p], h[i]]; i = p; } else break; } };
  const pop = () => { const top = h[0], last = h.pop(); if (h.length) { h[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < h.length && less(h[l], h[m])) m = l; if (r < h.length && less(h[r], h[m])) m = r; if (m === i) break; [h[i], h[m]] = [h[m], h[i]]; i = m; } } return top; };
  L.forEach((list, i) => { if (list.length) push([list[0], i, 0]); });
  const out = [];
  while (h.length) {
    const [v, i, p] = pop();
    out.push(v);
    if (p + 1 < L[i].length) push([L[i][p + 1], i, p + 1]);
  }
  return out;
}`,
      python: `import heapq
def k_way_merge(L):
    Q = [(lst[0], i, 0) for i, lst in enumerate(L) if lst]
    heapq.heapify(Q)
    out = []
    while Q:
        v, i, p = heapq.heappop(Q)
        out.append(v)
        if p + 1 < len(L[i]):
            heapq.heappush(Q, (L[i][p + 1], i, p + 1))
    return out`,
      explain: "The heap always holds the smallest unused element of every non-exhausted list, so its minimum is the smallest remaining element overall. Each of the N elements is inserted and deleted once on a heap of size ≤ k: Θ(N log k) comparisons (Θ(N) heap operations, which the grader counts as steps).",
    },
    complexity: "Θ(N log k) time, Θ(k) extra space for the heap",
    followUp: "This is the last phase of external merge sort: with memory for B blocks you merge B − 1 runs at a time, so a file of N blocks takes about log_{B−1}(N/B) passes. Python's heapq.merge and Java's PriorityQueue do exactly this.",
    distractors: ["insert(Q, [i, p], L[i][p])", "append(out, p)", "if p < length(L[i]) then"],
    visual: "sims/heap-lab.html",
    lesson: "lessons/17-senior-engineer-playbook/README.md",
  });

  /* ------------------------------------------------------------------ */
  /* 9. LIS by patience sorting                                           */
  /* ------------------------------------------------------------------ */
  ForgeProblems.add({
    id: "lis-patience",
    title: "Longest Increasing Subsequence in Θ(n log n)",
    level: 6, chapter: 15, difficulty: 3,
    topics: ["dynamic programming", "binary search", "patience sorting", "interview patterns"],
    strategy: "Patience sorting: smallest tails + binary search",
    source: "Interview classic (Lesson 15, Pattern 14) · binary search from Levitin §4.4",
    summary: "Length of the longest strictly increasing subsequence using the 'smallest tail' array and binary search.",
    statement: `
<p>The textbook dynamic program for the Longest Increasing Subsequence (LIS) is Θ(n²). Patience sorting keeps, for every length
<code>L</code>, the <b>smallest possible last element</b> of an increasing subsequence of length <code>L</code>; that array stays
sorted, so each new element needs only a binary search.</p>
<p>Given <code>A[0..n-1]</code>, return the length of the longest <b>strictly increasing</b> subsequence (elements in order, not
necessarily adjacent).</p>
<ul>
<li>0 ≤ n ≤ 600. Arrays auto-extend: writing <code>tails[length(tails)] ← x</code> appends.</li>
<li><b>Efficiency:</b> Θ(n log n). The Θ(n²) dynamic program will be flagged.</li>
</ul>`,
    entry: "LIS",
    params: ["A"],
    tests: [
      { args: [[3, 1, 4, 1, 5, 9, 2, 6]], expect: 4, explain: "e.g. 1, 4, 5, 9. The tails array ends as [1, 2, 5, 6] — not itself a subsequence, but its length is right." },
      { args: [[10, 9, 2, 5, 3, 7, 101, 18]], expect: 4, explain: "2, 3, 7, 18. Replacing 5 by 3 in the tails keeps the door open for 7." },
      { args: [[7, 7, 7, 7]], expect: 1, explain: "Strictly increasing: equal values can't follow each other." },
      { args: [[]], expect: 0 },
      { args: [[0, 1, 0, 3, 2, 3]], expect: 4 },
      { args: [[5]], expect: 1 },
      { args: [[1, 2, 3, 4, 5]], expect: 5 },
      { args: [[5, 4, 3, 2, 1]], expect: 1 },
      { args: [[2, 2, 3, 3, 4]], expect: 3 },
      { args: [[4, 10, 4, 3, 8, 9]], expect: 3 },
    ],
    random: { count: 30, gen: (r, i) => [r.array(r.int(0, 30), 0, i % 2 ? 8 : 50)] },
    reference: (A) => { const L = A.map(() => 1); for (let i = 0; i < A.length; i++) for (let j = 0; j < i; j++) if (A[j] < A[i]) L[i] = Math.max(L[i], L[j] + 1); return A.length ? Math.max(...L) : 0; },
    growth: { metric: "steps", sizes: [32, 64, 128, 256, 512], gen: (r, n) => [Array.from({ length: n }, (_, k) => 3 * k + r.int(0, 8))], expect: "n log n" },
    mutants: [
      {
        fn: (A) => { const t = []; for (const x of A) { let lo = 0, hi = t.length; while (lo < hi) { const m = (lo + hi) >> 1; if (t[m] <= x) lo = m + 1; else hi = m; } t[lo] = x; } return t.length; },
        hint: "Equal values extend your subsequence ([7, 7, 7, 7] gives 4). For STRICTLY increasing, search for the first tail that is ≥ x (lower bound), not > x.",
      },
      {
        fn: (A) => { const t = []; for (const x of A) if (!t.length || x > t[t.length - 1]) t.push(x); return t.length; },
        hint: "You only ever append — a small element never replaces a bigger tail. In [10, 9, 2, 5, 3, 7, 101, 18] you must be able to restart from 2. Put each x at the first tail ≥ x (replace it), appending only when x beats every tail.",
      },
      {
        fn: (A) => { if (!A.length) return 0; let best = 1, cur = 1; for (let i = 1; i < A.length; i++) { cur = A[i] > A[i - 1] ? cur + 1 : 1; best = Math.max(best, cur); } return best; },
        hint: "You are measuring the longest run of ADJACENT increasing elements. A subsequence may skip elements: in [3, 1, 4, 1, 5, 9] the answer uses 1, 4, 5, 9.",
      },
    ],
    lints: [
      { re: NESTED_FOR, lang: "pseudo", message: "The L[i] = 1 + max L[j] dynamic program is Θ(n²). Keep tails[len] = the smallest last element of an increasing subsequence of length len + 1; it is sorted, so find where A[i] goes with a binary search (Θ(log n))." },
    ],
    hints: [
      "Among all increasing subsequences of length 3 found so far, which one is the most useful to remember for the future? (Think about the one that is easiest to extend.)",
      "Keep tails[j] = smallest possible last element of an increasing subsequence of length j + 1. It is always sorted. For each x, find the first position j with tails[j] ≥ x: replace it with x, or append x if there is no such position.",
      "Binary search: lo ← 0; hi ← length(tails); while lo < hi: mid ← (lo + hi) div 2; if tails[mid] < x then lo ← mid + 1 else hi ← mid. Then tails[lo] ← x. The answer is length(tails).",
    ],
    starter: {
      pseudo: `ALGORITHM LIS(A[0..n-1])
    // length of the longest strictly increasing subsequence
    tails ← []
    for i ← 0 to n - 1 do
        ...
    return length(tails)`,
      js: `function LIS(A) {
  const tails = [];
  // ...
  return tails.length;
}`,
    },
    solution: {
      pseudo: `ALGORITHM LIS(A[0..n-1])
    tails ← []
    for i ← 0 to n - 1 do
        lo ← 0
        hi ← length(tails)
        while lo < hi do
            mid ← (lo + hi) div 2
            if tails[mid] < A[i] then
                lo ← mid + 1
            else
                hi ← mid
        tails[lo] ← A[i]
    return length(tails)`,
      js: `function LIS(A) {
  const tails = [];
  for (const x of A) {
    let lo = 0, hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tails[mid] < x) lo = mid + 1; else hi = mid;
    }
    tails[lo] = x;
  }
  return tails.length;
}`,
      python: `import bisect
def lis(A):
    tails = []
    for x in A:
        j = bisect.bisect_left(tails, x)
        if j == len(tails):
            tails.append(x)
        else:
            tails[j] = x
    return len(tails)`,
      explain: "Invariant: tails[j] is the minimum possible tail of an increasing subsequence of length j + 1, which forces tails to be strictly increasing; replacing the first tail ≥ x keeps the invariant, and appending happens exactly when x extends the longest one. n binary searches over ≤ n tails: Θ(n log n).",
    },
    complexity: "Θ(n log n) time, Θ(n) space",
    followUp: "Recover an actual subsequence by storing, for each element, the index of the tail it replaced's predecessor. Non-decreasing version: use upper bound. Git's --patience diff and 'Russian doll envelopes' (sort by width, then LIS on heights) are the same algorithm.",
    distractors: ["if tails[mid] ≤ A[i] then", "append(tails, A[i])", "hi ← mid - 1"],
    visual: "sims/dp-studio.html",
    lesson: "lessons/15-dp-and-interview-patterns/README.md",
  });

  /* ------------------------------------------------------------------ */
  /* 10. Strings: Z-function and Rabin–Karp                               */
  /* ------------------------------------------------------------------ */
  ForgeProblems.add({
    id: "z-function",
    title: "The Z-Function in Linear Time",
    level: 6, chapter: 15, difficulty: 3,
    topics: ["strings", "string matching", "amortized analysis"],
    strategy: "Reuse the rightmost match box [l, r)",
    source: "Competitive-programming classic (cp-algorithms, Z-function) · compare KMP in Levitin §7.2",
    summary: "For every position, the length of the longest substring starting there that is also a prefix — in Θ(n).",
    statement: `
<p>The Z-function is the friendliest linear-time string tool: once you have it, pattern matching is one call on
<code>P + "$" + T</code>. Like the Knuth–Morris–Pratt (KMP) prefix table (Levitin §7.2), it gets linear time by
<b>reusing</b> comparisons it has already made.</p>
<p>Given a string <code>s</code> of length <code>n</code>, return the array <code>Z[0..n-1]</code> where <code>Z[i]</code> is the
length of the longest common prefix of <code>s</code> and the suffix <code>s[i..n-1]</code>. By convention <b><code>Z[0] = 0</code></b>.</p>
<ul>
<li>0 ≤ n ≤ 600. Read characters with <code>s[i]</code>.</li>
<li><b>Efficiency:</b> must be <b>linear</b>, Θ(n). Comparing from scratch at every position is Θ(n²) on <code>"aaaa…a"</code> and will be flagged.</li>
</ul>`,
    entry: "ZFunction",
    params: ["s"],
    tests: [
      { args: ["aabxaab"], expect: [0, 1, 0, 0, 3, 1, 0], explain: "At i = 4, \"aab\" matches the prefix \"aab\" and then 'x' ≠ end of string: Z[4] = 3." },
      { args: ["aaaaa"], expect: [0, 4, 3, 2, 1], explain: "The worst case for the naive method: every comparison succeeds." },
      { args: ["abacaba"], expect: [0, 0, 1, 0, 3, 0, 1] },
      { args: [""], expect: [] },
      { args: ["a"], expect: [0] },
      { args: ["abcabcabc"], expect: [0, 0, 0, 6, 0, 0, 3, 0, 0], explain: "Inside the box found at i = 3, positions 6.. copy what we already know from position 3.." },
      { args: ["aabcaabxaaaz"], expect: [0, 1, 0, 0, 3, 1, 0, 0, 2, 2, 1, 0] },
      { args: ["abab"], expect: [0, 0, 2, 0] },
    ],
    random: { count: 30, gen: (r, i) => [r.word(r.int(0, 40), i % 3 === 0 ? "a" + "ab" : i % 3 === 1 ? "ab" : "abc")] },
    reference: (s) => { const n = s.length, Z = Array(n).fill(0); for (let i = 1; i < n; i++) { while (i + Z[i] < n && s[Z[i]] === s[i + Z[i]]) Z[i]++; } return Z; },
    growth: { metric: "steps", sizes: [32, 64, 128, 256, 512], gen: (r, n) => ["a".repeat(n - 1) + (r() < 0.5 ? "a" : "b")], expect: "n" },
    mutants: [
      {
        fn: (s) => { const n = s.length, Z = Array(n).fill(0); for (let i = 1; i < n; i++) while (i + Z[i] < n && s[Z[i]] === s[i + Z[i]]) Z[i]++; if (n) Z[0] = n; return Z; },
        hint: "Your Z[0] is n. That's a valid convention elsewhere, but here Z[0] is defined to be 0 — set it explicitly (or leave the initial 0).",
      },
      {
        fn: (s) => { const n = s.length, Z = Array(n).fill(0); let l = 0, r = 0; for (let i = 1; i < n; i++) { if (i < r) Z[i] = Math.min(r - i, Z[i - l]); else while (i + Z[i] < n && s[Z[i]] === s[i + Z[i]]) Z[i]++; if (i + Z[i] > r) { l = i; r = i + Z[i]; } } return Z; },
        hint: "Inside the box you copy min(r − i, Z[i − l]) but never try to extend it. When the copied value reaches the box's edge r, the match may continue past r — always run the extension loop afterwards.",
      },
      {
        fn: (s) => { const n = s.length, Z = Array(n).fill(0); let l = 0, r = 0; for (let i = 1; i < n; i++) { if (i < r) Z[i] = Math.min(r - i + 1, Z[i - l]); while (i + Z[i] < n && s[Z[i]] === s[i + Z[i]]) Z[i]++; if (i + Z[i] > r) { l = i; r = i + Z[i]; } } return Z; },
        hint: "Your values inside the box are sometimes one too big (try \"aaaaa\"). If the box is [l, r) with r EXCLUSIVE, only r − i characters starting at i are known to match: copy min(r − i, Z[i − l]).",
      },
    ],
    lints: [
      { re: "for[^\\n]*\\n(?:[^\\n]*\\n)*?\\s+while[^\\n]*s\\[[^\\n]*\\]\\s*=\\s*s\\[", lang: "pseudo", message: "If the efficiency check flagged you: comparing from scratch at every i repeats work. Keep the box [l, r) of the rightmost match found so far; for i inside it, s[i..r−1] equals s[i−l..r−l−1], so start Z[i] at min(r − i, Z[i − l]) and only compare characters beyond r." },
    ],
    hints: [
      "Suppose an earlier position l matched the prefix all the way up to r (exclusive): s[l..r−1] = s[0..r−l−1]. For a position i between l and r, what do you ALREADY know about s[i..]?",
      "Keep the box [l, r). For each i: if i < r, start from Z[i] = min(r − i, Z[i − l]) (copied knowledge). Then extend by direct comparison while s[Z[i]] = s[i + Z[i]]. If the match now reaches past r, move the box to [i, i + Z[i]).",
      "Every successful comparison in the extension loop pushes r to the right, and r never moves left, so the extensions total at most n. Don't forget i + Z[i] < n in the while condition.",
    ],
    starter: {
      pseudo: `ALGORITHM ZFunction(s)
    n ← length(s)
    Z ← array(n, 0)
    l ← 0
    r ← 0
    for i ← 1 to n - 1 do
        ...
    return Z`,
      js: `function ZFunction(s) {
  const n = s.length, Z = Array(n).fill(0);
  let l = 0, r = 0;
  // ...
  return Z;
}`,
    },
    solution: {
      pseudo: `ALGORITHM ZFunction(s)
    n ← length(s)
    Z ← array(n, 0)
    l ← 0
    r ← 0
    for i ← 1 to n - 1 do
        if i < r then
            Z[i] ← min(r - i, Z[i - l])
        while i + Z[i] < n and s[Z[i]] = s[i + Z[i]] do
            Z[i] ← Z[i] + 1
        if i + Z[i] > r then
            l ← i
            r ← i + Z[i]
    return Z`,
      js: `function ZFunction(s) {
  const n = s.length, Z = Array(n).fill(0);
  let l = 0, r = 0;
  for (let i = 1; i < n; i++) {
    if (i < r) Z[i] = Math.min(r - i, Z[i - l]);
    while (i + Z[i] < n && s[Z[i]] === s[i + Z[i]]) Z[i]++;
    if (i + Z[i] > r) { l = i; r = i + Z[i]; }
  }
  return Z;
}`,
      python: `def z_function(s):
    n = len(s)
    Z = [0] * n
    l = r = 0
    for i in range(1, n):
        if i < r:
            Z[i] = min(r - i, Z[i - l])
        while i + Z[i] < n and s[Z[i]] == s[i + Z[i]]:
            Z[i] += 1
        if i + Z[i] > r:
            l, r = i, i + Z[i]
    return Z`,
      explain: "Inside the box, s[i..r−1] is a copy of s[i−l..r−l−1], so Z[i] ≥ min(r − i, Z[i − l]) is already known. Each successful extension step advances r (which only grows, up to n) and each i has at most one failed comparison: at most 2n comparisons, Θ(n) — the same amortized argument as KMP.",
    },
    complexity: "Θ(n) time (at most 2n character comparisons), Θ(n) space",
    followUp: "Pattern search: compute Z on P + '$' + T and report every i with Z[i] = |P|. The Z-array also counts distinct substrings, finds the shortest period of a string, and is the core of several genome-alignment seeds.",
    distractors: ["Z[i] ← min(r - i + 1, Z[i - l])", "Z[0] ← n", "if i ≤ r then"],
    visual: "sims/string-match.html",
    lesson: "lessons/07-space-time-tradeoffs/README.md",
  });

  ForgeProblems.add({
    id: "rabin-karp",
    title: "Rabin–Karp Rolling-Hash Search",
    level: 5, chapter: 16, difficulty: 2,
    topics: ["strings", "hashing", "string matching", "rolling hash"],
    strategy: "Rolling hash + verify on hash match",
    source: "Rabin & Karp (1987) · Cormen et al., Introduction to Algorithms (CLRS) §32.2 · brute-force matching in Levitin §3.2",
    summary: "Find every occurrence of a digit pattern in a digit text by sliding a hash that updates in O(1) per step.",
    statement: `
<p>Brute-force matching (Levitin §3.2) compares the pattern at every shift: Θ(n·m). Rabin–Karp compares <b>fingerprints</b>
instead: the hash of the next window is computed from the previous one in O(1) (drop the leading digit, shift, add the new
digit), and only windows whose hash matches are checked character by character. The same rolling hash powers plagiarism
detectors and rsync's block matching.</p>
<p>The text <code>T[0..n-1]</code> and pattern <code>P[0..m-1]</code> are arrays of decimal <b>digits</b> (0–9), like a numeric
log or a genome read encoded as numbers. Return the list of <b>all</b> shifts <code>s</code> (0-based, increasing) with
<code>T[s..s+m−1] = P</code> — overlapping occurrences included; <code>[]</code> if none.</p>
<ul>
<li>0 ≤ n ≤ 600, 1 ≤ m. Suggested hash: the window read as a base-10 number, modulo a prime <code>q</code> such as 1000003.
<code>mod</code> always returns a value in 0..q−1, even for negative numbers.</li>
<li>A hash match can be a false alarm (two windows with the same remainder): <b>verify</b> before reporting.</li>
<li><b>Efficiency:</b> Θ(n + m) expected. The grader counts <b>array reads</b> (a slice <code>T[a..b]</code> counts as reading all of it), so recomputing or comparing every window is Θ(n·m) and will be flagged.</li>
</ul>`,
    entry: "RabinKarp",
    params: ["T", "P"],
    tests: [
      { args: [[3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5], [5, 3, 5]], expect: [8], explain: "The only occurrence is at the very last possible shift, n − m = 8 — don't stop one window early." },
      { args: [[1, 2, 3, 2, 1], [1, 2]], expect: [0], explain: "The window [2, 1] at shift 3 has the same digit SUM as [1, 2] but is not a match — a weak hash without verification would report it." },
      { args: [[0, 0, 0, 0], [0, 0]], expect: [0, 1, 2], explain: "Occurrences may overlap: after a match, move just one position." },
      { args: [[], [7]], expect: [] },
      { args: [[4, 2], [4, 2, 1]], expect: [], explain: "Pattern longer than the text: no shifts." },
      { args: [[9, 9, 9], [9]], expect: [0, 1, 2] },
      { args: [[2, 6, 5, 3, 5, 8, 9, 7, 9, 3, 2, 6, 5], [2, 6, 5]], expect: [0, 10] },
      { args: [[1, 0, 1, 0, 1], [1, 0, 1]], expect: [0, 2] },
    ],
    random: {
      count: 30,
      gen: (r, i) => {
        const T = r.array(r.int(0, 40), 0, i % 2 ? 1 : 3);
        const m = r.int(1, 5);
        const P = T.length >= m && r() < 0.7 ? T.slice(r.int(0, T.length - m)).slice(0, m) : r.array(m, 0, 3);
        return [T, P];
      },
    },
    reference: (T, P) => { const out = []; for (let s = 0; s + P.length <= T.length; s++) { let k = 0; while (k < P.length && T[s + k] === P[k]) k++; if (k === P.length) out.push(s); } return out; },
    growth: {
      metric: "arrayReads", sizes: [32, 64, 128, 256, 512],
      gen: (r, n) => { const m = n >> 1; return [Array(n).fill(0), Array(m - 1).fill(0).concat([1])]; }, // no occurrence; brute force compares ~m digits per shift
      expect: "n",
    },
    mutants: [
      {
        fn: (T, P) => { const out = [], m = P.length, sp = P.reduce((a, b) => a + b, 0); for (let s = 0; s + m <= T.length; s++) { let w = 0; for (let k = 0; k < m; k++) w += T[s + k]; if (w === sp) out.push(s); } return out; },
        hint: "You report windows whose hash matches without checking them. Equal hashes do not prove equal windows (a digit-sum hash can't tell [1, 2] from [2, 1]) — compare the window with P before reporting it.",
      },
      {
        fn: (T, P) => { const out = []; for (let s = 0; s + P.length < T.length; s++) { let k = 0; while (k < P.length && T[s + k] === P[k]) k++; if (k === P.length) out.push(s); } return out; },
        hint: "The last window (shift n − m) is never checked. Shifts run from 0 to n − m inclusive — be careful that the rolling update for the NEXT window only happens when there is a next window.",
      },
      {
        fn: (T, P) => { const out = []; for (let s = 0; s + P.length <= T.length;) { let k = 0; while (k < P.length && T[s + k] === P[k]) k++; if (k === P.length) { out.push(s); s += P.length; } else s++; } return out; },
        hint: "After a match you jump ahead by m, so overlapping occurrences are lost ([0, 0, 0, 0] with [0, 0] has matches at 0, 1 and 2). Always move to the next shift.",
      },
    ],
    lints: [
      { re: "T\\[[^\\]\\n]*\\.\\.[^\\]\\n]*\\]\\s*=\\s*P", lang: "pseudo", message: "Comparing the slice T[s..s+m−1] with P at EVERY shift reads m digits per shift: Θ(n·m). Compare the rolling hashes first; only when they are equal do the (rare) full comparison." },
      { re: NESTED_FOR, lang: "pseudo", message: "If the efficiency check flagged you: recomputing each window's hash (or comparing each window) with an inner loop is Θ(n·m). Update the hash in O(1): remove T[s]·10^(m−1), multiply by 10, add T[s+m], all mod q." },
    ],
    hints: [
      "Read a window of m digits as an m-digit number. If you know the number for T[s..s+m−1], how do you get the number for T[s+1..s+m] without re-reading all m digits?",
      "Precompute h = 10^(m−1) mod q, the hash of P, and the hash of the first window. For each shift s: if the hashes are equal AND the window really equals P, record s; then, if s < n − m, roll the hash forward.",
      "Rolling step: ht ← ((ht − T[s]·h)·10 + T[s + m]) mod q. Verification can be a simple loop comparing T[s + k] with P[k] — it only runs when the hashes agree.",
    ],
    starter: {
      pseudo: `ALGORITHM RabinKarp(T[0..n-1], P[0..m-1])
    // all shifts s with T[s..s+m-1] = P (digits 0..9)
    out ← []
    if m > n then
        return out
    q ← 1000003
    ...
    return out`,
      js: `function RabinKarp(T, P) {
  const n = T.length, m = P.length, q = 1000003, out = [];
  if (m > n) return out;
  // rolling hash of each window, verify on match
  return out;
}`,
    },
    solution: {
      pseudo: `ALGORITHM RabinKarp(T[0..n-1], P[0..m-1])
    out ← []
    if m > n then
        return out
    q ← 1000003
    h ← 1
    for i ← 1 to m - 1 do
        h ← (h * 10) mod q
    hp ← 0
    ht ← 0
    for i ← 0 to m - 1 do
        hp ← (hp * 10 + P[i]) mod q
        ht ← (ht * 10 + T[i]) mod q
    for s ← 0 to n - m do
        if hp = ht and Same(T, s, P) then
            append(out, s)
        if s < n - m then
            ht ← ((ht - T[s] * h) * 10 + T[s + m]) mod q
    return out

ALGORITHM Same(T, s, P[0..m-1])
    for k ← 0 to m - 1 do
        if T[s + k] ≠ P[k] then
            return false
    return true`,
      js: `function RabinKarp(T, P) {
  const n = T.length, m = P.length, q = 1000003, out = [];
  if (m > n) return out;
  const mod = (x) => ((x % q) + q) % q;
  let h = 1;
  for (let i = 1; i < m; i++) h = (h * 10) % q;
  let hp = 0, ht = 0;
  for (let i = 0; i < m; i++) { hp = (hp * 10 + P[i]) % q; ht = (ht * 10 + T[i]) % q; }
  for (let s = 0; s <= n - m; s++) {
    if (hp === ht && P.every((d, k) => T[s + k] === d)) out.push(s);
    if (s < n - m) ht = mod((ht - T[s] * h) * 10 + T[s + m]);
  }
  return out;
}`,
      python: `def rabin_karp(T, P, q=1_000_003):
    n, m = len(T), len(P)
    if m > n:
        return []
    h = pow(10, m - 1, q)
    hp = ht = 0
    for i in range(m):
        hp = (hp * 10 + P[i]) % q
        ht = (ht * 10 + T[i]) % q
    out = []
    for s in range(n - m + 1):
        if hp == ht and T[s:s + m] == P:
            out.append(s)
        if s < n - m:
            ht = ((ht - T[s] * h) * 10 + T[s + m]) % q
    return out`,
      explain: "Horner's rule (Levitin §6.5) gives the first hashes in Θ(m); each roll is O(1), so hashing costs Θ(n + m). Verification costs Θ(m) per real match plus a false alarm with probability about 1/q per window: expected Θ(n + m + m·(occurrences)). Verifying makes it a Las Vegas algorithm — always correct, fast in expectation.",
    },
    complexity: "Θ(n + m) expected (plus Θ(m) per reported match); Θ(n·m) worst case with adversarial collisions",
    followUp: "Search for many patterns of the same length at once by putting their hashes in a set — that is how plagiarism checkers and rsync find matching blocks. Use a random base or two moduli so an adversary can't force collisions (universal hashing, Lesson 16).",
    distractors: ["for s ← 0 to n - m - 1 do", "ht ← (ht * 10 + T[s + m]) mod q", "if hp = ht then"],
    visual: "sims/string-match.html",
    lesson: "lessons/16-randomized-amortized-streaming/README.md",
  });

  /* ------------------------------------------------------------------ */
  /* 11. Bitmask DP and matrix power                                      */
  /* ------------------------------------------------------------------ */
  // F(n) mod m by 2x2 matrix squaring (oracle for fib-matrix-power; also used by its mutants)
  function FIB(n, m) {
    let a = 1, b = 0, c = 0, d = 1, x = 1, y = 1, z = 1, w = 0; // R = identity, B = [[1,1],[1,0]]
    while (n > 0) {
      if (n % 2 === 1) [a, b, c, d] = [(a * x + b * z) % m, (a * y + b * w) % m, (c * x + d * z) % m, (c * y + d * w) % m];
      [x, y, z, w] = [(x * x + y * z) % m, (x * y + y * w) % m, (z * x + w * z) % m, (z * y + w * w) % m];
      n = Math.floor(n / 2);
    }
    return b;
  }

  ForgeProblems.add({
    id: "fib-matrix-power",
    title: "Fibonacci mod m by Matrix Power",
    level: 5, chapter: 15, difficulty: 2,
    topics: ["matrix exponentiation", "divide and conquer", "modular arithmetic"],
    strategy: "Exponentiation by squaring on a 2×2 matrix",
    source: "Levitin §2.5 (Fibonacci, matrix formula) & §6.5 (binary exponentiation)",
    summary: "Compute F(n) mod m for n up to 10¹² with Θ(log n) 2×2 matrix multiplications.",
    statement: `
<p>The iterative Fibonacci loop is Θ(n) — hopeless for n = 10¹². But
<code>[[1, 1], [1, 0]]ⁿ = [[F(n+1), F(n)], [F(n), F(n−1)]]</code> (Levitin §2.5), and any power can be computed by
<b>repeated squaring</b> (Levitin §6.5) in Θ(log n) multiplications. The same trick evaluates any linear recurrence fast.</p>
<p>Given <code>n</code> (0 ≤ n ≤ 10<sup>12</sup>) and a modulus <code>m</code> (2 ≤ m ≤ 10<sup>6</sup>), return
<code>F(n) mod m</code>, where <code>F(0) = 0</code>, <code>F(1) = 1</code>, <code>F(k) = F(k−1) + F(k−2)</code>.</p>
<ul>
<li>Take <code>mod m</code> after <b>every</b> multiplication: products then stay below 10¹², where numbers are exact. Matrices can be lists like <code>[[a, b], [c, d]]</code>; a helper algorithm is fine.</li>
<li><b>Efficiency:</b> Θ(log n). A loop that runs n times will be flagged.</li>
</ul>`,
    entry: "FibMod",
    params: ["n", "m"],
    tests: [
      { args: [10, 1000], expect: 55, explain: "0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55 — F(10) = 55." },
      { args: [0, 1000], expect: 0, explain: "The zeroth power of a matrix is the identity, whose top-right entry is 0 = F(0)." },
      { args: [1, 1000], expect: 1 },
      { args: [2, 1000], expect: 1 },
      { args: [50, 1000], expect: 25, explain: "F(50) = 12,586,269,025, so F(50) mod 1000 = 25." },
      { args: [100, 1000000], expect: 915075, explain: "F(100) has 21 digits — far beyond exact double precision — so you must reduce mod m as you go." },
      { args: [1000000000000, 1000000], expect: 546875 },
      { args: [3, 2], expect: 0 },
      { args: [987654321, 999983], expect: 361841 },
    ],
    random: { count: 25, gen: (r, i) => [i < 10 ? r.int(0, 60) : r.int(0, 1e9), r.int(2, 1000000)] },
    reference: (n, m) => FIB(n, m),
    growth: { metric: "steps", sizes: [64, 512, 4096, 32768, 262144], gen: (r, n) => [n + r.int(0, n - 1), 1000], expect: "log n" },
    maxSteps: 200000, // the matrix solution needs a few hundred steps; a Θ(n) loop stops early instead of spinning
    mutants: [
      {
        fn: (n, m) => FIB(n + 1, m),
        hint: "Your answers are F(n + 1), one step ahead (F(0) should be 0, F(10) should be 55). Mⁿ = [[F(n+1), F(n)], [F(n), F(n−1)]]: read the TOP-RIGHT entry, not the top-left.",
      },
      {
        fn: (n, m) => (n === 0 ? 1 % m : FIB(n - 1, m)),
        hint: "Your answers are F(n − 1), one step behind. Check your base cases: F(0) = 0, F(1) = 1, and which matrix entry you return (top-right of Mⁿ).",
      },
      {
        fn: (n, m) => { let a = 0, b = 1; for (let i = 0; i < Math.min(n, 2000); i++) [a, b] = [b, a + b]; return n > 2000 ? NaN : a % m; },
        hint: "Small n is right but big n goes wrong: Fibonacci numbers pass 2⁵³ around n = 79 and stop being exact. Apply mod m inside every matrix multiplication, not only at the end.",
      },
    ],
    lints: [
      { re: "for\\s+\\w+\\s*←\\s*\\d+\\s+to\\s+n\\b", lang: "pseudo", message: "A loop from 1 to n is Θ(n) — for n = 10¹² that is hours. Square the matrix instead: look at the bits of n, squaring B each round and multiplying it into the result when the bit is 1 (Levitin §6.5)." },
    ],
    hints: [
      "Multiplying [F(k+1), F(k)] by the matrix [[1, 1], [1, 0]] advances Fibonacci by one step. So what is n steps at once? And how do you compute a huge power quickly?",
      "Binary exponentiation (right-to-left): R ← identity, B ← [[1, 1], [1, 0]]. While n > 0: if n is odd, R ← R·B; B ← B·B; n ← n div 2. Each product reduced mod m.",
      "Write MatMul(X, Y, m) returning [[a, b], [c, d]] with a = (X[0][0]·Y[0][0] + X[0][1]·Y[1][0]) mod m, and so on. The answer is R[0][1].",
    ],
    starter: {
      pseudo: `ALGORITHM FibMod(n, m)
    R ← [[1, 0], [0, 1]]
    B ← [[1, 1], [1, 0]]
    while n > 0 do
        ...
    return R[0][1]

ALGORITHM MatMul(X, Y, m)
    // 2×2 product, every entry mod m
    ...`,
      js: `function FibMod(n, m) {
  // [[1,1],[1,0]]^n by repeated squaring, everything mod m
}`,
    },
    solution: {
      pseudo: `ALGORITHM FibMod(n, m)
    R ← [[1, 0], [0, 1]]
    B ← [[1, 1], [1, 0]]
    while n > 0 do
        if n mod 2 = 1 then
            R ← MatMul(R, B, m)
        B ← MatMul(B, B, m)
        n ← n div 2
    return R[0][1]

ALGORITHM MatMul(X, Y, m)
    a ← (X[0][0] * Y[0][0] + X[0][1] * Y[1][0]) mod m
    b ← (X[0][0] * Y[0][1] + X[0][1] * Y[1][1]) mod m
    c ← (X[1][0] * Y[0][0] + X[1][1] * Y[1][0]) mod m
    d ← (X[1][0] * Y[0][1] + X[1][1] * Y[1][1]) mod m
    return [[a, b], [c, d]]`,
      js: `function FibMod(n, m) {
  const mul = (X, Y) => [
    [(X[0][0] * Y[0][0] + X[0][1] * Y[1][0]) % m, (X[0][0] * Y[0][1] + X[0][1] * Y[1][1]) % m],
    [(X[1][0] * Y[0][0] + X[1][1] * Y[1][0]) % m, (X[1][0] * Y[0][1] + X[1][1] * Y[1][1]) % m],
  ];
  let R = [[1, 0], [0, 1]], B = [[1, 1], [1, 0]];
  while (n > 0) {
    if (n % 2 === 1) R = mul(R, B);
    B = mul(B, B);
    n = Math.floor(n / 2);
  }
  return R[0][1];
}`,
      python: `def fib_mod(n, m):
    def mul(X, Y):
        return [[(X[0][0]*Y[0][0] + X[0][1]*Y[1][0]) % m, (X[0][0]*Y[0][1] + X[0][1]*Y[1][1]) % m],
                [(X[1][0]*Y[0][0] + X[1][1]*Y[1][0]) % m, (X[1][0]*Y[0][1] + X[1][1]*Y[1][1]) % m]]
    R, B = [[1, 0], [0, 1]], [[1, 1], [1, 0]]
    while n > 0:
        if n % 2 == 1:
            R = mul(R, B)
        B = mul(B, B)
        n //= 2
    return R[0][1]`,
      explain: "Invariant: R · Bⁿ (current n and B) always equals the original Mⁿ, and n halves every round. So there are ⌊log₂ n⌋ + 1 rounds with at most two 2×2 products each (8 multiplications apiece): Θ(log n) arithmetic operations.",
    },
    complexity: "Θ(log n) matrix multiplications (each a constant 8 multiplications)",
    followUp: "Any k-term linear recurrence becomes a k×k matrix power: Θ(k³ log n). 'Fast doubling' (F(2k) = F(k)·(2F(k+1) − F(k)), F(2k+1) = F(k)² + F(k+1)²) saves the constant factor. Counting walks of length n in a graph (Lesson 6) is the same computation on the adjacency matrix.",
    distractors: ["return R[0][0]", "n ← n - 1", "B ← MatMul(B, R, m)"],
    visual: "sims/horner-binexp.html",
    lesson: "lessons/06-transform-and-conquer/README.md",
  });

  ForgeProblems.add({
    id: "held-karp-tsp",
    title: "Held–Karp Tours (Bitmask Dynamic Programming)",
    level: 6, chapter: 15, difficulty: 3,
    topics: ["dynamic programming", "bitmask dynamic programming", "traveling salesman", "NP-hard"],
    strategy: "Dynamic programming over (visited set, current city)",
    source: "Held & Karp (1962) · brute-force TSP in Levitin §3.4 · Lesson 15, Pattern 16",
    summary: "Shortest tour through all cities (directed distances) in Θ(n² 2ⁿ) instead of (n − 1)! — sets encoded as bitmasks.",
    statement: `
<p>The Traveling Salesman Problem (TSP) is Nondeterministic Polynomial (NP)-hard (Levitin §11.3), so no polynomial algorithm is known — but exhaustive search
(Levitin §3.4) over (n − 1)! tours is far worse than necessary. Held–Karp observes that the best way to finish depends only on
<b>which</b> cities are visited and <b>where you are now</b>: 2ⁿ·n states instead of (n − 1)! orders.</p>
<p>Given an n × n matrix <code>D</code> of non-negative distances (<b>directed</b>: <code>D[i][j]</code> may differ from
<code>D[j][i]</code>), return the length of the shortest tour that starts at city 0, visits every city exactly once and returns
to city 0. For n = 1 the tour is empty: return 0.</p>
<ul>
<li>1 ≤ n ≤ 10. A set of cities is an integer whose bit k is 1 when city k is in the set: bit k of S is
<code>(S div 2^k) mod 2</code>; adding city k to S (when absent) is <code>S + 2^k</code>. <code>matrix(r, c, ∞)</code> makes a table.</li>
<li><b>Efficiency:</b> Θ(n² 2ⁿ). Trying all (n − 1)! orders will be flagged (or run out of steps at n = 10).</li>
</ul>`,
    entry: "HeldKarp",
    params: ["D"],
    tests: [
      { args: [[[0, 3, 8, 5], [4, 0, 2, 7], [6, 5, 0, 3], [2, 9, 4, 0]]], expect: 10, explain: "0 → 1 → 2 → 3 → 0 costs 3 + 2 + 3 + 2 = 10 (the lesson's example)." },
      { args: [[[0, 1, 9], [9, 0, 1], [1, 9, 0]]], expect: 3, explain: "Directed! Going 0 → 1 → 2 → 0 costs 1 + 1 + 1 = 3; the reverse direction costs 27." },
      { args: [[[0]]], expect: 0, explain: "One city: nothing to travel. (A min over an empty set of 'last cities' would give ∞ — handle it.)" },
      { args: [[[0, 5], [7, 0]]], expect: 12, explain: "Two cities: there and back, 5 + 7." },
      { args: [[[0, 1, 1, 1, 1], [1, 0, 1, 1, 1], [1, 1, 0, 1, 1], [1, 1, 1, 0, 1], [1, 1, 1, 1, 0]]], expect: 5 },
      { args: [[[0, 2, 9, 10], [1, 0, 6, 4], [15, 7, 0, 8], [6, 3, 12, 0]]], expect: 21 },
      { args: [[[0, 10, 1, 10], [1, 0, 10, 10], [10, 10, 0, 1], [10, 1, 10, 0]]], expect: 4, explain: "Greedy 'nearest city next' also finds 0 → 2 → 3 → 1 → 0 here; other inputs punish greed." },
      { args: [[[0, 1, 2, 100], [100, 0, 1, 2], [2, 100, 0, 1], [1, 2, 100, 0]]], expect: 4 },
      { args: [[[0, 1, 50, 50, 2], [50, 0, 1, 50, 50], [50, 50, 0, 1, 50], [50, 50, 50, 0, 1], [50, 50, 50, 50, 0]]], expect: 54 },
    ],
    random: {
      count: 25,
      gen: (r, i) => { const n = 1 + (i % 7); return [Array.from({ length: n }, (_, a) => Array.from({ length: n }, (_, b) => (a === b ? 0 : r.int(1, 30))))]; },
    },
    reference: (D) => { const n = D.length; if (n === 1) return 0; let best = Infinity; const rest = [...Array(n).keys()].slice(1), used = Array(n).fill(false);
      const go = (u, cnt, cost) => { if (cost >= best) return; if (cnt === n - 1) { best = Math.min(best, cost + D[u][0]); return; } for (const v of rest) if (!used[v]) { used[v] = true; go(v, cnt + 1, cost + D[u][v]); used[v] = false; } };
      go(0, 0, 0); return best; },
    growth: {
      metric: "steps", sizes: [4, 5, 6, 7, 8, 9],
      gen: (r, n) => [Array.from({ length: n }, (_, a) => Array.from({ length: n }, (_, b) => (a === b ? 0 : r.int(1, 50))))],
      expect: "2^n", reps: 1,
    },
    mutants: [
      {
        fn: (D) => { const n = D.length; if (n === 1) return 0; let best = Infinity; const used = Array(n).fill(false); const go = (u, cnt, cost) => { if (cnt === n - 1) { best = Math.min(best, cost); return; } for (let v = 1; v < n; v++) if (!used[v]) { used[v] = true; go(v, cnt + 1, cost + D[u][v]); used[v] = false; } }; go(0, 0, 0); return best; },
        hint: "Your totals are missing the final leg back to city 0 — that's a shortest Hamiltonian PATH, not a tour. At the end, add D[j][0] for the last city j before taking the minimum.",
      },
      {
        fn: (D) => { const n = D.length; if (n === 1) return 0; const seen = Array(n).fill(false); seen[0] = true; let u = 0, cost = 0; for (let s = 1; s < n; s++) { let v = -1; for (let w = 0; w < n; w++) if (!seen[w] && (v < 0 || D[u][w] < D[u][v])) v = w; seen[v] = true; cost += D[u][v]; u = v; } return cost + D[u][0]; },
        hint: "This looks like the nearest-neighbor heuristic (always go to the closest unvisited city). It's fast but not optimal (Levitin §12.3) — the dynamic program must consider EVERY last city j for every set S.",
      },
      {
        fn: (D) => { const n = D.length; if (n === 1) return Infinity; let best = Infinity; const used = Array(n).fill(false); const go = (u, cnt, cost) => { if (cnt === n - 1) { best = Math.min(best, cost + D[u][0]); return; } for (let v = 1; v < n; v++) if (!used[v]) { used[v] = true; go(v, cnt + 1, cost + D[u][v]); used[v] = false; } }; go(0, 0, 0); return best; },
        hint: "For a single city you return ∞: the final 'min over last cities j ≥ 1' has nothing to minimize over. With n = 1 the tour is empty — return 0.",
      },
    ],
    lints: [
      { re: "[Pp]ermut|used\\[", lang: "pseudo", message: "If the efficiency check flagged you: enumerating orders is (n − 1)!. The cost of finishing a tour depends only on the SET of visited cities and the current city — store dp[S][j] once for each of the 2ⁿ·n states." },
    ],
    hints: [
      "Two partial tours that visited the same set of cities and stand at the same city j can be finished in exactly the same ways. So what is the only thing worth remembering about each (set, city) pair?",
      "dp[S][j] = shortest path that starts at 0, visits exactly the cities in S (S contains 0 and j), and ends at j. Start with dp[{0}][0] = dp[1][0] = 0. Process sets S in increasing numeric order (a subset is always a smaller number) and push each finite dp[S][j] forward to every city k not in S.",
      "Transition: if bit k of S is 0 then T ← S + 2^k; dp[T][k] ← min(dp[T][k], dp[S][j] + D[j][k]). Answer: min over j ≥ 1 of dp[2ⁿ − 1][j] + D[j][0], with n = 1 handled separately.",
    ],
    starter: {
      pseudo: `ALGORITHM HeldKarp(D[0..n-1])
    // D[i][j] = distance from i to j (directed); shortest tour from 0 back to 0
    if n = 1 then
        return 0
    full ← 2^n - 1
    dp ← matrix(full + 1, n, ∞)
    dp[1][0] ← 0
    ...
    return best`,
      js: `function HeldKarp(D) {
  const n = D.length;
  // dp over (bitmask of visited cities, current city)
}`,
    },
    solution: {
      pseudo: `ALGORITHM HeldKarp(D[0..n-1])
    if n = 1 then
        return 0
    full ← 2^n - 1
    dp ← matrix(full + 1, n, ∞)
    dp[1][0] ← 0
    for S ← 1 to full do
        for j ← 0 to n - 1 do
            if dp[S][j] < ∞ then
                for k ← 0 to n - 1 do
                    if (S div 2^k) mod 2 = 0 then
                        T ← S + 2^k
                        dp[T][k] ← min(dp[T][k], dp[S][j] + D[j][k])
    best ← ∞
    for j ← 1 to n - 1 do
        best ← min(best, dp[full][j] + D[j][0])
    return best`,
      js: `function HeldKarp(D) {
  const n = D.length;
  if (n === 1) return 0;
  const full = (1 << n) - 1;
  const dp = Array.from({ length: full + 1 }, () => Array(n).fill(Infinity));
  dp[1][0] = 0;
  for (let S = 1; S <= full; S++)
    for (let j = 0; j < n; j++) {
      if (dp[S][j] === Infinity) continue;
      for (let k = 0; k < n; k++)
        if (!(S & (1 << k))) {
          const T = S | (1 << k);
          dp[T][k] = Math.min(dp[T][k], dp[S][j] + D[j][k]);
        }
    }
  let best = Infinity;
  for (let j = 1; j < n; j++) best = Math.min(best, dp[full][j] + D[j][0]);
  return best;
}`,
      python: `def held_karp(D):
    n, INF = len(D), float("inf")
    if n == 1:
        return 0
    full = (1 << n) - 1
    dp = [[INF] * n for _ in range(full + 1)]
    dp[1][0] = 0
    for S in range(1, full + 1):
        for j in range(n):
            if dp[S][j] == INF:
                continue
            for k in range(n):
                if not S >> k & 1:
                    T = S | 1 << k
                    dp[T][k] = min(dp[T][k], dp[S][j] + D[j][k])
    return min(dp[full][j] + D[j][0] for j in range(1, n))`,
      explain: "Optimal substructure: the last step into k of a best path over T = S ∪ {k} comes from some j, and the part before it must be a best path over S ending at j. There are 2ⁿ·n states, each relaxed in Θ(n): Θ(n² 2ⁿ) time, Θ(n 2ⁿ) space — for n = 20, about 4·10⁸ steps instead of 19! ≈ 1.2·10¹⁷ tours.",
    },
    complexity: "Θ(n² 2ⁿ) time, Θ(n 2ⁿ) space",
    followUp: "Recover the tour by storing the best predecessor j for each (T, k). The same 'dynamic programming over subsets' solves assignment with n ≤ 20, Steiner trees on few terminals, and minimum-cost set cover on small universes; beyond n ≈ 25 you switch to branch-and-bound or approximation (Levitin §12.2–12.3).",
    distractors: ["dp[0][0] ← 0", "for j ← 0 to n - 1 do", "best ← min(best, dp[full][j])"],
    visual: "sims/exhaustive-search.html",
    lesson: "lessons/15-dp-and-interview-patterns/README.md",
  });

  /* ------------------------------------------------------------------ */
  /* 12. Amortized analysis and production systems                        */
  /* ------------------------------------------------------------------ */
  ForgeProblems.add({
    id: "dynamic-array-copies",
    title: "Dynamic Array: Count the Copies",
    level: 5, chapter: 16, difficulty: 1,
    topics: ["amortized analysis", "dynamic arrays", "simulation"],
    strategy: "Simulation + aggregate amortized analysis",
    source: "Cormen et al., Introduction to Algorithms (CLRS) §17.4 (dynamic tables) · Levitin §2.1 (amortized efficiency) · Lesson 16, Build Card 1",
    summary: "Simulate appends to a growable array and count the element copies made by resizing — doubling vs adding a constant.",
    statement: `
<p>Every growable list (Python <code>list</code>, Java <code>ArrayList</code>, C++ <code>vector</code>) occasionally runs out of room,
allocates a bigger block and <b>copies</b> everything over. With <b>doubling</b>, m appends cause fewer than 2m copies in total —
O(1) amortized per append. With "add k slots", they cause about m²/(2k) copies. This problem makes you measure it.</p>
<p>Start with an empty array of capacity <code>c0</code> (≥ 1) and append <code>m</code> elements one at a time. Before an append,
if <code>size = capacity</code>, the array grows and <b>copies its <code>size</code> current elements</b> into the new block. The new
capacity is <code>2 · capacity</code> if <code>grow = "double"</code>, or <code>capacity + grow</code> if <code>grow</code> is a positive
integer. Writing the new element itself is not a copy. Return the <b>total number of element copies</b>.</p>
<ul>
<li>0 ≤ m ≤ 2000, 1 ≤ c0 ≤ 64; <code>grow</code> is the text <code>"double"</code> or an integer 1–20 (check which with <code>if grow = "double" then</code>).</li>
<li><b>Efficiency:</b> with doubling, simulating every append (even copying element by element) is Θ(m) in total — that's the
amortized bound, and the grader checks your work grows linearly.</li>
</ul>`,
    entry: "ArrayCopies",
    params: ["m", "c0", "grow"],
    tests: [
      { args: [4, 1, "double"], expect: 3, explain: "Capacity 1 → 2 before append #2 (copy 1), 2 → 4 before append #3 (copy 2). Append #4 fits. Total 3." },
      { args: [17, 1, "double"], expect: 31, explain: "Copies 1 + 2 + 4 + 8 + 16 = 31 < 2 · 17 — the doubling bound." },
      { args: [10, 2, 3], expect: 15, explain: "Add 3 slots: resizes when size is 2, 5 and 8 → 2 + 5 + 8 = 15 copies." },
      { args: [0, 4, "double"], expect: 0 },
      { args: [1, 1, "double"], expect: 0, explain: "One append into capacity 1: no resize needed." },
      { args: [16, 1, "double"], expect: 15 },
      { args: [100, 10, 10], expect: 450 },
      { args: [1000, 1, 1], expect: 499500, explain: "Growing by one slot copies 1 + 2 + … + 999 = 499,500 elements: Θ(m²)." },
      { args: [5, 5, "double"], expect: 0 },
    ],
    random: { count: 30, gen: (r, i) => [r.int(0, 200), r.int(1, 8), i % 2 ? "double" : r.int(1, 5)] },
    reference: (m, c0, grow) => { let cap = c0, size = 0, copies = 0; for (let i = 0; i < m; i++) { if (size === cap) { copies += size; cap = grow === "double" ? 2 * cap : cap + grow; } size++; } return copies; },
    growth: { metric: "steps", sizes: [64, 128, 256, 512, 1024], gen: (r, n) => [n + r.int(0, n - 1), 1, "double"], expect: "n" },
    mutants: [
      {
        fn: (m, c0, grow) => { let cap = c0, size = 0, copies = 0; for (let i = 0; i < m; i++) { if (size === cap) { copies += size + 1; cap = grow === "double" ? 2 * cap : cap + grow; } size++; } return copies; },
        hint: "You add one extra copy per resize. Only the size elements already in the array are copied; writing the new element is an ordinary append, not a copy.",
      },
      {
        fn: (m, c0, grow) => { let cap = c0, size = 0, copies = 0; for (let i = 0; i < m; i++) { size++; if (size === cap) { copies += size; cap = grow === "double" ? 2 * cap : cap + grow; } } return copies; },
        hint: "You grow the array right after it becomes full, even if no further append ever comes (try m = 4, c0 = 1). Resize lazily: only when an append finds size = capacity.",
      },
      {
        fn: (m, c0, grow) => { let cap = c0, size = 0, copies = 0; for (let i = 0; i < m; i++) { if (size === cap) { cap = grow === "double" ? 2 * cap : cap + grow; copies += cap; } size++; } return copies; },
        hint: "You add the NEW capacity to the copy count. A resize copies the elements that exist (size of them), not the number of slots allocated.",
      },
    ],
    hints: [
      "Simulate: keep size, capacity and a running copy count. What exactly happens on an append when the array is full, and how many elements move?",
      "for i ← 1 to m: if size = cap then copies ← copies + size and grow cap; then size ← size + 1. Compare grow with the text \"double\" to pick the rule.",
      "Doubling from c0: copies = c0 + 2c0 + 4c0 + … over the resizes, a geometric series < 2m. Adding k: copies = c0 + (c0 + k) + (c0 + 2k) + … ≈ m²/(2k).",
    ],
    starter: {
      pseudo: `ALGORITHM ArrayCopies(m, c0, grow)
    // grow = "double" or a positive integer k (add k slots)
    cap ← c0
    size ← 0
    copies ← 0
    for i ← 1 to m do
        ...
    return copies`,
      js: `function ArrayCopies(m, c0, grow) {
  let cap = c0, size = 0, copies = 0;
  // ...
  return copies;
}`,
    },
    solution: {
      pseudo: `ALGORITHM ArrayCopies(m, c0, grow)
    cap ← c0
    size ← 0
    copies ← 0
    for i ← 1 to m do
        if size = cap then
            copies ← copies + size
            if grow = "double" then
                cap ← 2 * cap
            else
                cap ← cap + grow
        size ← size + 1
    return copies`,
      js: `function ArrayCopies(m, c0, grow) {
  let cap = c0, size = 0, copies = 0;
  for (let i = 0; i < m; i++) {
    if (size === cap) {
      copies += size;
      cap = grow === "double" ? 2 * cap : cap + grow;
    }
    size++;
  }
  return copies;
}`,
      python: `def array_copies(m, c0, grow):
    cap, size, copies = c0, 0, 0
    for _ in range(m):
        if size == cap:
            copies += size
            cap = 2 * cap if grow == "double" else cap + grow
        size += 1
    return copies`,
      explain: "Aggregate method: with doubling the resizes copy c0, 2c0, 4c0, … elements, each less than m and each at most half the next, so the total is < 2m — O(1) amortized per append. With +k growth there are about m/k resizes copying on average m/2 elements: Θ(m²/k). The potential Φ = 2·size − capacity gives amortized cost 3 per append (Lesson 16).",
    },
    complexity: "Doubling: < 2m copies (O(1) amortized); +k growth: Θ(m²/k) copies",
    followUp: "Real libraries use factors like 1.5 (Java's ArrayList, Microsoft's C++ vector) to reuse freed memory; any constant factor > 1 keeps O(1) amortized appends. Add shrinking: halve when the array is 1/4 full (not 1/2 — that would thrash).",
    distractors: ["copies ← copies + cap", "if size > cap then", "cap ← cap + 1"],
    visual: "sims/amortized.html",
    lesson: "lessons/16-randomized-amortized-streaming/README.md",
  });

  ForgeProblems.add({
    id: "consistent-hash-lookup",
    title: "Consistent Hashing: Ring Lookup",
    level: 5, chapter: 16, difficulty: 2,
    topics: ["hashing", "binary search", "distributed systems"],
    strategy: "Binary search (lower bound) on a sorted ring with wrap-around",
    source: "Karger et al. (1997) · Lesson 16, Build Card 12",
    summary: "Route each key hash to the first server point clockwise on a hash ring, with a binary search per key.",
    statement: `
<p>Consistent hashing is how Amazon's Dynamo, Apache Cassandra and memcached clients spread keys over servers so that adding a
server moves only about 1/(N+1) of the keys (plain <code>hash mod N</code> moves almost all of them). Servers sit at points on a
ring of positions 0..65535; a key goes to the <b>first server point at or after</b> its own position, wrapping past 65535 back to the start.</p>
<p><code>points[0..p-1]</code> is a list of <code>[position, server]</code> pairs <b>sorted by position</b> (distinct positions;
a server may appear several times — "virtual nodes"). <code>keys[0..q-1]</code> lists key hashes. Return the list of server
names, one per key, in order.</p>
<ul>
<li>1 ≤ p ≤ 600, 0 ≤ q ≤ 600. <code>points[i][0]</code> is a position, <code>points[i][1]</code> a name like <code>"A"</code>.</li>
<li><b>Efficiency:</b> Θ((p + q) log p) — a binary search per key. Scanning the ring for every key is Θ(p·q) and will be flagged.</li>
</ul>`,
    entry: "RingLookup",
    params: ["points", "keys"],
    tests: [
      { args: [[[10, "A"], [40, "B"], [80, "C"]], [25, 55, 95]], expect: ["B", "C", "A"], explain: "25 → B at 40; 55 → C at 80; 95 is past the last point, so it wraps to A at 10." },
      { args: [[[10, "A"], [40, "B"], [80, "C"]], [40, 10, 80]], expect: ["B", "A", "C"], explain: "A key exactly at a server's position belongs to that server ('at or after')." },
      { args: [[[10, "A"], [40, "B"], [80, "C"]], [0, 81, 65535]], expect: ["A", "A", "A"], explain: "Before the first point, or after the last: both reach A." },
      { args: [[[500, "X"]], [0, 500, 60000]], expect: ["X", "X", "X"] },
      { args: [[[5, "A"], [9, "B"]], []], expect: [] },
      { args: [[[100, "A"], [200, "B"], [300, "A"], [400, "C"]], [150, 250, 399, 401]], expect: ["B", "A", "C", "A"], explain: "Server A owns two virtual nodes (100 and 300)." },
    ],
    random: {
      count: 30,
      gen: (r, i) => { const p = r.int(1, 12); const pos = r.distinct(p, 0, 200).sort((a, b) => a - b); const pts = pos.map((x) => [x, r.pick(["A", "B", "C", "D"])]); const keys = Array.from({ length: r.int(0, 15) }, () => (r() < 0.3 ? r.pick(pos) : r.int(0, 220))); return [pts, keys]; },
    },
    reference: (points, keys) => keys.map((h) => { const pt = points.find((p) => p[0] >= h) || points[0]; return pt[1]; }),
    growth: {
      metric: "steps", sizes: [32, 64, 128, 256, 512],
      gen: (r, n) => { const pos = r.distinct(n, 0, 65535).sort((a, b) => a - b); return [pos.map((x, k) => [x, "S" + (k % 7)]), Array.from({ length: n }, () => r.int(0, 65535))]; },
      expect: "n log n",
    },
    mutants: [
      {
        fn: (points, keys) => keys.map((h) => { const pt = points.find((p) => p[0] > h) || points[0]; return pt[1]; }),
        hint: "A key that lands exactly on a server's position is sent to the NEXT server. The rule is 'first point at or after the key': find the first position ≥ h (a lower bound), not > h.",
      },
      {
        fn: (points, keys) => keys.map((h) => { const pt = points.find((p) => p[0] >= h); return pt ? pt[1] : null; }),
        hint: "Keys after the last point get no server. It's a RING: if no position is ≥ h, wrap around to points[0].",
      },
      {
        fn: (points, keys) => keys.map((h) => { let pt = null; for (const p of points) if (p[0] <= h) pt = p; return (pt || points[points.length - 1])[1]; }),
        hint: "You are walking counter-clockwise (to the last point ≤ the key). Keys go CLOCKWISE: to the first server position at or after the key.",
      },
    ],
    lints: [
      { re: NESTED_FOR, lang: "pseudo", message: "Scanning the ring for every key is Θ(p·q). The points are sorted by position, so binary search for the first position ≥ h (lower bound, Levitin §4.4) in Θ(log p) per key." },
      { re: "for[^\\n]*\\n(?:[^\\n]*\\n)*?\\s+while[^\\n]*points\\[[^\\n]*<", lang: "pseudo", message: "If the efficiency check flagged you: a while loop that steps through the points one by one is a linear scan. Halve the search range each time: lo ← 0, hi ← p; while lo < hi …" },
    ],
    hints: [
      "The points are sorted by position. Which classic search finds 'the first element ≥ h' in a sorted array, and how many steps does it take?",
      "For each key h: binary search for the smallest index lo with points[lo][0] ≥ h (lo = p if none). If lo = p, wrap to 0. Append points[lo][1].",
      "Lower bound: lo ← 0; hi ← p; while lo < hi: mid ← (lo + hi) div 2; if points[mid][0] < h then lo ← mid + 1 else hi ← mid.",
    ],
    starter: {
      pseudo: `ALGORITHM RingLookup(points[0..p-1], keys[0..q-1])
    // points sorted by position: [position, server]; route each key clockwise
    out ← []
    for each h in keys do
        ...
    return out`,
      js: `function RingLookup(points, keys) {
  // binary search the first position >= h, wrap to points[0]
}`,
    },
    solution: {
      pseudo: `ALGORITHM RingLookup(points[0..p-1], keys[0..q-1])
    out ← []
    for each h in keys do
        lo ← 0
        hi ← p
        while lo < hi do
            mid ← (lo + hi) div 2
            if points[mid][0] < h then
                lo ← mid + 1
            else
                hi ← mid
        if lo = p then
            lo ← 0
        append(out, points[lo][1])
    return out`,
      js: `function RingLookup(points, keys) {
  return keys.map((h) => {
    let lo = 0, hi = points.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (points[mid][0] < h) lo = mid + 1; else hi = mid;
    }
    return points[lo === points.length ? 0 : lo][1];
  });
}`,
      python: `import bisect
def ring_lookup(points, keys):
    pos = [p for p, _ in points]
    out = []
    for h in keys:
        i = bisect.bisect_left(pos, h)
        out.append(points[i % len(points)][1])
    return out`,
      explain: "Lower bound keeps the invariant 'answer index in [lo, hi]' and halves the range each round: ⌈log₂(p + 1)⌉ iterations per key, so Θ(q log p) lookups (the ring is built once, Θ(p log p) to sort). The wrap-around implements the circle.",
    },
    complexity: "Θ(log p) per lookup; Θ(q log p) for q keys",
    followUp: "Replication: store each key on the next r DISTINCT servers clockwise. Alternatives without a ring: rendezvous (highest-random-weight) hashing, Θ(N) per lookup, and jump consistent hash, Θ(log N) time with O(1) memory.",
    distractors: ["if points[mid][0] ≤ h then", "hi ← mid - 1", "lo ← p - 1"],
    visual: "sims/hashing.html",
    lesson: "lessons/16-randomized-amortized-streaming/README.md",
  });

  ForgeProblems.add({
    id: "token-bucket",
    title: "Token-Bucket Rate Limiter",
    level: 5, chapter: 17, difficulty: 2,
    topics: ["simulation", "rate limiting", "systems design", "streaming"],
    strategy: "Lazy refill (compute tokens from elapsed time)",
    source: "Production classic (network traffic shaping, API gateways)",
    summary: "Decide allow/deny for each request with a token bucket, refilling lazily from elapsed time instead of ticking.",
    statement: `
<p>Application Programming Interface (API) gateways, cloud load balancers and network routers throttle clients with a <b>token bucket</b>: the bucket holds at most
<code>C</code> tokens and gains <code>rate</code> tokens per second; each request spends one token or is rejected. It allows short
bursts (up to C at once) while enforcing a long-run average. The senior move is the <b>lazy refill</b>: nothing ticks — when a
request arrives, add <code>(now − last) · rate</code> tokens (capped at C) in O(1).</p>
<p>The bucket is <b>full</b> (C tokens) at time 0. Requests arrive at the non-decreasing integer times <code>T[0..n-1]</code>
(seconds). For each request: refill for the time elapsed since the previous request (or since time 0), cap at <code>C</code>;
then if at least one whole token is available, spend it and <b>allow</b> (<code>true</code>), otherwise <b>deny</b>
(<code>false</code>; a denied request spends nothing). Return the list of decisions.</p>
<ul>
<li>1 ≤ C ≤ 50; <code>rate</code> is one of 0.25, 0.5, 1, 2, 3 tokens per second (fractions like 0.5 are exact); 0 ≤ n ≤ 600; times up to about 10⁶.</li>
<li><b>Efficiency:</b> Θ(n), independent of how far apart the requests are. Simulating every second (a tick loop) costs time proportional to the span of the timestamps and will be flagged.</li>
</ul>`,
    entry: "TokenBucket",
    params: ["C", "rate", "T"],
    tests: [
      { args: [2, 1, [0, 0, 0, 1, 1, 5, 5, 5]], expect: [true, true, false, true, false, true, true, false], explain: "Burst of 2 at t = 0, then denied; 1 token back by t = 1; by t = 5 the bucket refills but is capped at 2, so the third request at t = 5 is denied." },
      { args: [2, 0.5, [0, 0, 1, 2, 3]], expect: [true, true, false, true, false], explain: "At t = 1 only half a token is back (deny). The clock still moves on: at t = 2 there is exactly 1 token." },
      { args: [3, 1, []], expect: [] },
      { args: [1, 1, [0, 0, 1, 1, 2]], expect: [true, false, true, false, true] },
      { args: [5, 2, [10, 10, 10, 10, 10, 10]], expect: [true, true, true, true, true, false], explain: "Starting full, 5 requests can burst through at once; the 6th must wait." },
      { args: [1, 0.25, [0, 1, 2, 3, 4, 8]], expect: [true, false, false, false, true, true] },
      { args: [3, 3, [0, 1000000, 1000000, 1000000, 1000000]], expect: [true, true, true, true, false], explain: "A long quiet period refills the bucket only up to C = 3 — and your algorithm shouldn't take a million steps to find that out." },
    ],
    random: {
      count: 30,
      gen: (r, i) => { const n = r.int(0, 30); let t = 0; const T = []; for (let k = 0; k < n; k++) { t += r() < 0.5 ? 0 : r.int(0, 4); T.push(t); } return [r.int(1, 5), r.pick([0.25, 0.5, 1, 2, 3]), T]; },
    },
    reference: (C, rate, T) => { let tokens = C, last = 0; return T.map((t) => { tokens = Math.min(C, tokens + (t - last) * rate); last = t; if (tokens >= 1) { tokens -= 1; return true; } return false; }); },
    growth: {
      metric: "steps", sizes: [32, 64, 128, 256, 512],
      gen: (r, n) => { let t = 0; const T = []; for (let k = 0; k < n; k++) { t += r.int(0, n); T.push(t); } return [3, 0.5, T]; }, // span grows like n²
      expect: "n",
    },
    mutants: [
      {
        fn: (C, rate, T) => { let tokens = 0, last = 0; return T.map((t) => { tokens = Math.min(C, tokens + (t - last) * rate); last = t; if (tokens >= 1) { tokens -= 1; return true; } return false; }); },
        hint: "Your first requests are rejected: the bucket starts FULL (C tokens) at time 0, which is what allows an initial burst.",
      },
      {
        fn: (C, rate, T) => { let tokens = C, last = 0; return T.map((t) => { tokens = tokens + (t - last) * rate; last = t; if (tokens >= 1) { tokens -= 1; return true; } return false; }); },
        hint: "Tokens pile up without limit during quiet periods, allowing huge bursts later. Cap the bucket: tokens ← min(C, tokens + elapsed · rate).",
      },
      {
        fn: (C, rate, T) => { let tokens = C, last = 0; return T.map((t) => { tokens = Math.min(C, tokens + (t - last) * rate); if (tokens >= 1) { tokens -= 1; last = t; return true; } return false; }); },
        hint: "You only move 'last' forward when a request is allowed, so after a denial the same elapsed time gets refilled twice. The refill has already been applied — update last ← T[i] on every request.",
      },
    ],
    lints: [
      { re: "for\\s+\\w+\\s*←\\s*last|while\\s+\\w+\\s*<\\s*T\\[", lang: "pseudo", message: "If the efficiency check flagged you: stepping second by second from the last request to the current one costs time proportional to the gap. Compute the refill in one step: tokens ← min(C, tokens + (T[i] − last) · rate)." },
    ],
    hints: [
      "You don't need to know the bucket's content at every second — only at the moments requests arrive. How many tokens appear between two requests that are Δ seconds apart?",
      "Keep two variables: tokens and last (time of the previous request, initially 0, tokens initially C). For each request: refill by (T[i] − last) · rate, cap at C, set last ← T[i], then decide.",
      "Decision: if tokens ≥ 1 then tokens ← tokens − 1 and append true, else append false. The refill and last-update happen for EVERY request, allowed or not.",
    ],
    starter: {
      pseudo: `ALGORITHM TokenBucket(C, rate, T[0..n-1])
    // bucket full at time 0; one token per allowed request
    tokens ← C
    last ← 0
    out ← []
    for i ← 0 to n - 1 do
        ...
    return out`,
      js: `function TokenBucket(C, rate, T) {
  let tokens = C, last = 0;
  // lazy refill on each request
}`,
    },
    solution: {
      pseudo: `ALGORITHM TokenBucket(C, rate, T[0..n-1])
    tokens ← C
    last ← 0
    out ← []
    for i ← 0 to n - 1 do
        tokens ← min(C, tokens + (T[i] - last) * rate)
        last ← T[i]
        if tokens ≥ 1 then
            tokens ← tokens - 1
            append(out, true)
        else
            append(out, false)
    return out`,
      js: `function TokenBucket(C, rate, T) {
  let tokens = C, last = 0;
  return T.map((t) => {
    tokens = Math.min(C, tokens + (t - last) * rate);
    last = t;
    if (tokens >= 1) { tokens -= 1; return true; }
    return false;
  });
}`,
      python: `def token_bucket(C, rate, T):
    tokens, last, out = C, 0, []
    for t in T:
        tokens = min(C, tokens + (t - last) * rate)
        last = t
        if tokens >= 1:
            tokens -= 1
            out.append(True)
        else:
            out.append(False)
    return out`,
      explain: "Between requests the bucket evolves deterministically (linear growth, then flat at C), so its level at the next request is a closed-form min(C, tokens + Δ·rate) — no need to simulate the gap. O(1) per request: Θ(n) total and Θ(1) state per client, which is why millions of clients can each have a bucket.",
    },
    complexity: "Θ(n) time, Θ(1) state per client",
    followUp: "Store (tokens, last) per client in a hash map, or in Redis with an atomic script so many gateway servers share one limit. Compare the sliding-window log (exact, Θ(requests in window) memory) and the leaky bucket (smooths output instead of allowing bursts).",
    distractors: ["tokens ← tokens + (T[i] - last) * rate", "if tokens > 1 then", "tokens ← 0"],
    visual: "sims/patterns.html",
    lesson: "lessons/17-senior-engineer-playbook/README.md",
  });
})();
