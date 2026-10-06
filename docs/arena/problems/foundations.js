/* Pack A — Foundations (levels 0–1, Levitin Ch 1–2).
   The on-ramp: first loops over arrays, first recursive definitions, then counting basic operations and
   setting up recurrences. Level-0 problems are deliberately gentle; level-1 problems ask you to count.
   Format: ../PROBLEM_FORMAT.md · validate with: node tools/validate-problems.mjs foundations.js */

/* ------------------------------------------------------------------ */
/* Level 0 · difficulty 1                                              */
/* ------------------------------------------------------------------ */

ForgeProblems.add({
  id: "sum-array",
  title: "Add Up an Array",
  level: 0, chapter: 2, difficulty: 1,
  topics: ["arrays", "loops", "accumulator"],
  strategy: "One pass with an accumulator",
  source: "Levitin Exercise 2.1.1a (adapted)",
  summary: "Walk through an array once and return the total of its numbers.",
  statement: `
<p>Almost every algorithm you will ever write contains this pattern: <b>walk through the data once and keep a running result</b>.
Adding up numbers is the simplest version of it, and it is also the first thing we will <i>count</i>: one addition per element.</p>
<p><b>Task.</b> Given an array <code>A[0..n-1]</code> of numbers, return their sum <code>A[0] + A[1] + … + A[n-1]</code>.</p>
<ul>
<li><b>Input:</b> <code>A</code>, an array of <code>0 ≤ n ≤ 60</code> integers (they can be negative).</li>
<li><b>Output:</b> one number, the total. The sum of an empty array is <code>0</code>.</li>
</ul>
<p><b>Constraint:</b> build it yourself with a loop — the built-in <code>sum(…)</code> is not allowed here.</p>`,
  entry: "SumArray",
  params: ["A"],
  tests: [
    { args: [[3, 1, 4, 1, 5]], expect: 14, explain: "3 + 1 + 4 + 1 + 5 = 14." },
    { args: [[]], expect: 0, explain: "An empty array adds up to 0 — your loop should simply not run." },
    { args: [[-2, 7, -5]], expect: 0, explain: "Negatives are fine: −2 + 7 − 5 = 0." },
    { args: [[42]], expect: 42, name: "One element" },
    { args: [[10, 20, 30, 40]], expect: 100, name: "First and last both matter" },
    { args: [[-1, -1, -1, -1, -1, -1]], expect: -6, name: "All negative" },
  ],
  random: { count: 25, gen: (r, i) => [r.array(i % 20 === 0 ? 0 : 1 + (i * 7) % 40, -50, 50)] },
  reference: (A) => A.reduce((s, x) => s + x, 0),
  forbid: ["sum"],
  growth: { metric: "steps", sizes: [16, 32, 64, 128, 256], gen: (r, n) => [r.array(n, -100, 100)], expect: "n" },
  mutants: [
    { fn: (A) => A.slice(0, Math.max(0, A.length - 1)).reduce((s, x) => s + x, 0), hint: "The last element never gets added. Check your loop's end: the last index of A[0..n-1] is n − 1, and it must be included." },
    { fn: (A) => A.slice(1).reduce((s, x) => s + x, 0), hint: "A[0] never gets added. If your total starts at 0, your loop has to start at index 0 too." },
    { fn: (A) => (A.length ? A[0] : 0) + A.reduce((s, x) => s + x, 0), hint: "A[0] is being counted twice. If you start the total at A[0], start the loop at index 1 — or start the total at 0 and loop from 0." },
  ],
  hints: [
    "Imagine adding a long receipt by hand. What single number do you keep in your head as you go, and what is it before you've read any line?",
    "Keep a variable total. Set it to 0 before the loop, then visit every index from 0 to n − 1 exactly once.",
    "Inside the loop the only line you need is total ← total + A[i]. After the loop, return total.",
  ],
  starter: {
    pseudo: `ALGORITHM SumArray(A[0..n-1])
    // Input: an array A of n ≥ 0 numbers
    // Output: A[0] + A[1] + … + A[n-1]  (0 when A is empty)
    total ← 0
    for i ← 0 to n - 1 do
        ...          // add the current element to total
    return total`,
    js: `function SumArray(A) {
  let total = 0;
  // visit every element once and add it to total
  return total;
}`,
  },
  solution: {
    pseudo: `ALGORITHM SumArray(A[0..n-1])
    total ← 0
    for i ← 0 to n - 1 do
        total ← total + A[i]
    return total`,
    js: `function SumArray(A) {
  let total = 0;
  for (let i = 0; i < A.length; i++) total += A[i];
  return total;
}`,
    python: `def sum_array(A):
    total = 0
    for i in range(len(A)):
        total += A[i]
    return total`,
    explain: "After the loop has visited indexes 0..i, total holds exactly A[0] + … + A[i] (the loop invariant). The basic operation, the addition, runs Σ_{i=0}^{n-1} 1 = n times on every input, so the algorithm is Θ(n).",
  },
  distractors: ["for i ← 1 to n - 1 do", "total ← A[i]", "for i ← 0 to n do"],
  followUp: "Keep a running prefix sum P[i] = A[0] + … + A[i−1] and any range sum A[l..r] becomes P[r+1] − P[l] in O(1) — the trick behind database range queries and the sliding-window pattern.",
  complexity: "Θ(n) additions (exactly n)",
  visual: "sims/growth-rates.html",
  lesson: "lessons/02-analysis-framework/README.md",
});

ForgeProblems.add({
  id: "count-occurrences",
  title: "Count the Occurrences of K",
  level: 0, chapter: 2, difficulty: 1,
  topics: ["arrays", "loops", "counting", "sequential search"],
  strategy: "One pass with a counter",
  source: "Levitin §2.1 (sequential search, adapted)",
  summary: "Return how many times a value K appears in an array, using exactly one comparison per element.",
  statement: `
<p>Sequential search (Levitin §2.1) stops at the <i>first</i> match. Very often you want <b>all</b> of them — how many
orders came from this customer, how many times a word appears in a page. That changes one small thing about the loop.</p>
<p><b>Task.</b> Given an array <code>A[0..n-1]</code> and a search key <code>K</code>, return the number of indexes <code>i</code>
with <code>A[i] = K</code>.</p>
<ul>
<li><b>Input:</b> <code>A</code> with <code>0 ≤ n ≤ 60</code> integers, and an integer <code>K</code>.</li>
<li><b>Output:</b> a whole number ≥ 0 (it is 0 if K never appears).</li>
</ul>
<p><b>Efficiency:</b> the grader counts element comparisons. You may compare each element with <code>K</code> once — exactly <code>n</code> comparisons in total.</p>`,
  entry: "CountOccurrences",
  params: ["A", "K"],
  tests: [
    { args: [[4, 2, 4, 1, 4], 4], expect: 3, explain: "4 appears at indexes 0, 2 and 4." },
    { args: [[1, 2, 3], 7], expect: 0, explain: "K isn't there at all, so the count is 0 (not −1: we are counting, not searching)." },
    { args: [[], 5], expect: 0, explain: "An empty array contains nothing." },
    { args: [[9, 9, 9, 9], 9], expect: 4, name: "Every element matches" },
    { args: [[5, 1, 1, 1], 5], expect: 1, name: "Match only at the start" },
    { args: [[1, 1, 3, 5], 5], expect: 1, name: "Match only at the end" },
    { args: [[2, 7, 2, 7, 2], 7], expect: 2, name: "Matches in the middle" },
  ],
  random: { count: 25, gen: (r, i) => [r.array(1 + (i * 5) % 45, 0, 5), r.int(0, 6)] },
  reference: (A, K) => A.filter((x) => x === K).length,
  budget: { metric: "keyComparisons", label: "element comparisons", limit: (A) => A.length, hint: "Compare each element with K exactly once: one if-test per loop iteration, nothing else touching A." },
  mutants: [
    { fn: (A, K) => (A.includes(K) ? 1 : 0), hint: "Your answer is only ever 0 or 1 — it looks like the loop stops (returns) at the first match. Counting means you keep going to the end and add 1 each time you see K." },
    { fn: (A, K) => A.indexOf(K), hint: "You're returning the POSITION of the first match (or −1), which is what sequential search does. Here we want how MANY matches there are." },
    { fn: (A, K) => A.slice(0, Math.max(0, A.length - 1)).filter((x) => x === K).length, hint: "A match in the very last position is missed. Make sure the loop runs all the way to index n − 1." },
  ],
  hints: [
    "Sequential search asks 'is K here?' and stops on yes. What question do you ask instead if you need to know 'how many times'?",
    "Keep a counter that starts at 0. Visit every index from 0 to n − 1 — no early return this time.",
    "Inside the loop: if A[i] = K then count ← count + 1. Return count after the loop.",
  ],
  starter: {
    pseudo: `ALGORITHM CountOccurrences(A[0..n-1], K)
    // Input: array A of n numbers, a search key K
    // Output: how many elements of A equal K
    count ← 0
    for i ← 0 to n - 1 do
        ...          // one comparison with K, and maybe add 1
    return count`,
    js: `function CountOccurrences(A, K) {
  let count = 0;
  // look at every element once
  return count;
}`,
  },
  solution: {
    pseudo: `ALGORITHM CountOccurrences(A[0..n-1], K)
    count ← 0
    for i ← 0 to n - 1 do
        if A[i] = K then
            count ← count + 1
    return count`,
    js: `function CountOccurrences(A, K) {
  let count = 0;
  for (let i = 0; i < A.length; i++) if (A[i] === K) count++;
  return count;
}`,
    python: `def count_occurrences(A, K):
    count = 0
    for i in range(len(A)):
        if A[i] == K:
            count += 1
    return count`,
    explain: "Unlike sequential search, this loop never stops early, so the best, worst and average cases are the same: C(n) = Σ_{i=0}^{n-1} 1 = n comparisons, Θ(n). Any correct algorithm must look at every element, so Θ(n) is optimal.",
  },
  distractors: ["return i", "if A[i] = K then return count", "for i ← 0 to n - 2 do"],
  followUp: "If you must answer many count queries on the same array, spend Θ(n) once to build a hash map value → count, then answer each query in O(1) — the classic space-for-time trade (Levitin Ch 7).",
  complexity: "Θ(n) comparisons (exactly n)",
  visual: "sims/growth-rates.html",
  lesson: "lessons/02-analysis-framework/README.md",
});

ForgeProblems.add({
  id: "reverse-in-place",
  title: "Reverse an Array in Place",
  level: 0, chapter: 1, difficulty: 1,
  topics: ["arrays", "two pointers", "in-place", "swap"],
  strategy: "Swap from both ends",
  source: "Classic first exercise (Levitin §1.4, arrays)",
  summary: "Reverse A[0..n-1] using swaps only — no second array.",
  statement: `
<p>“In place” means you rearrange the array you were given, using only a few extra variables — no copy. Memory is often the
real limit (think of a phone or a huge file), so this is a habit worth building early.</p>
<p><b>Task.</b> Reverse <code>A[0..n-1]</code> <b>in place</b>: afterwards <code>A[0]</code> holds the old last element,
<code>A[1]</code> the old second-to-last, and so on. The grader checks the array itself after your algorithm finishes.</p>
<ul>
<li><b>Input:</b> <code>A</code> with <code>0 ≤ n ≤ 60</code> numbers.</li>
<li><b>Output:</b> nothing needs to be returned (returning <code>A</code> is fine too); <code>A</code> must be reversed.</li>
</ul>
<p><b>Rules:</b> don't use the built-ins <code>reverse</code>/<code>reversed</code>, and use at most <code>⌊n/2⌋</code> swaps.
Swap with <code>swap A[i] and A[j]</code>.</p>`,
  entry: "ReverseInPlace",
  params: ["A"],
  output: { arg: 0 },
  tests: [
    { args: [[1, 2, 3, 4, 5]], expect: [5, 4, 3, 2, 1], explain: "Odd length: the middle element 3 stays where it is." },
    { args: [[7, 8, 9, 10]], expect: [10, 9, 8, 7], explain: "Even length: two swaps — (7,10) and (8,9)." },
    { args: [[]], expect: [], explain: "Nothing to do for an empty array." },
    { args: [[42]], expect: [42], name: "One element" },
    { args: [[1, 2]], expect: [2, 1], name: "Two elements" },
    { args: [[3, 1, 4, 1, 5, 9]], expect: [9, 5, 1, 4, 1, 3], name: "Even length, repeated values" },
  ],
  random: { count: 25, gen: (r, i) => [r.array(i + 1, -20, 20)] },
  reference: (A) => A.slice().reverse(),
  forbid: ["reverse", "reversed"],
  budget: { metric: "swaps", label: "swaps", limit: (A) => Math.floor(A.length / 2), hint: "Each swap fixes two positions at once, so ⌊n/2⌋ swaps are enough. If you walk i all the way to n − 1, every pair is swapped twice — which puts it back!" },
  mutants: [
    { fn: (A) => A, hint: "The array comes out unchanged. A classic cause: the loop runs i all the way to n − 1, so each pair is swapped twice and ends up where it started. Stop at the middle." },
    { fn: (A) => { const n = A.length; for (let i = 0; i <= Math.floor(n / 2) && i < n; i++) { const t = A[i]; A[i] = A[n - 1 - i]; A[n - 1 - i] = t; } return A; }, hint: "Almost! For even n the two middle elements come out in their ORIGINAL order — your loop does one swap too many (i reaches n/2 and swaps the middle pair back). The last i should be ⌊n/2⌋ − 1." },
    { fn: (A) => { const n = A.length; for (let i = 0; i < Math.floor(n / 2); i++) { A[i] = A[n - 1 - i]; A[n - 1 - i] = A[i]; } return A; }, hint: "The result is a mirror image (a palindrome): the first half got overwritten before it was saved. Use a swap statement, or save A[i] in a temporary variable before you overwrite it." },
  ],
  hints: [
    "Where does A[0] have to go? And A[n − 1]? What can you do with just those two elements, and which pair is next?",
    "Use a left index i starting at 0; its partner is n − 1 − i. Swap the partners, then move inward. Only walk through the first half.",
    "The partner of index i is n − 1 − i, and the last i that needs a swap is ⌊n/2⌋ − 1. One swap statement per iteration is all the body needs.",
  ],
  starter: {
    pseudo: `ALGORITHM ReverseInPlace(A[0..n-1])
    // Reverse A in place using at most ⌊n/2⌋ swaps
    for i ← 0 to ... do
        ...          // swap A[i] with its partner at the other end
    return A`,
    js: `function ReverseInPlace(A) {
  const n = A.length;
  // swap A[i] with A[n - 1 - i] for the first half only
  return A;
}`,
  },
  solution: {
    pseudo: `ALGORITHM ReverseInPlace(A[0..n-1])
    for i ← 0 to ⌊n/2⌋ - 1 do
        swap A[i] and A[n - 1 - i]
    return A`,
    js: `function ReverseInPlace(A) {
  const n = A.length;
  for (let i = 0; i < Math.floor(n / 2); i++) {
    const t = A[i]; A[i] = A[n - 1 - i]; A[n - 1 - i] = t;
  }
  return A;
}`,
    python: `def reverse_in_place(A):
    n = len(A)
    for i in range(n // 2):
        A[i], A[n - 1 - i] = A[n - 1 - i], A[i]
    return A`,
    explain: "Each swap puts two elements into their final positions, and the pairs (i, n−1−i) for i < ⌊n/2⌋ cover every position except the middle one (odd n), which is already correct. That is exactly ⌊n/2⌋ swaps: Θ(n) time and Θ(1) extra space.",
  },
  distractors: ["for i ← 0 to n - 1 do", "A[i] ← A[n - 1 - i]", "swap A[i] and A[n - i]"],
  followUp: "Reversal is a building block: rotating an array by k positions in O(1) extra space is just three reversals (reverse the whole array, then each of the two parts).",
  complexity: "Θ(n) time, ⌊n/2⌋ swaps, Θ(1) extra space",
  visual: "sims/sorting-studio.html",
  lesson: "lessons/01-introduction/README.md",
});

ForgeProblems.add({
  id: "is-sorted",
  title: "Is the Array Sorted?",
  level: 0, chapter: 2, difficulty: 1,
  topics: ["arrays", "loops", "early exit", "best vs worst case"],
  strategy: "Check neighbors, stop at the first problem",
  source: "Levitin §2.1 (best/worst case), adapted",
  summary: "Return true if A is in nondecreasing order, stopping as soon as you find a pair out of order.",
  statement: `
<p>Before you sort, it is worth asking whether you need to! This check is also a perfect first example of <b>best case vs.
worst case</b>: the loop can stop very early — or have to look at everything.</p>
<p><b>Task.</b> Return <code>true</code> if <code>A[0] ≤ A[1] ≤ … ≤ A[n-1]</code> (nondecreasing: equal neighbors are fine),
and <code>false</code> otherwise.</p>
<ul>
<li><b>Input:</b> <code>A</code> with <code>0 ≤ n ≤ 60</code> integers. Arrays with 0 or 1 elements count as sorted.</li>
<li><b>Output:</b> <code>true</code> or <code>false</code>.</li>
</ul>
<p><b>Efficiency:</b> at most <code>n − 1</code> element comparisons (the grader counts them).</p>`,
  entry: "IsSorted",
  params: ["A"],
  tests: [
    { args: [[1, 3, 3, 8]], expect: true, explain: "Equal neighbors (3, 3) are allowed — nondecreasing." },
    { args: [[1, 5, 2, 8]], expect: false, explain: "5 > 2, so the answer is false (and you can stop right there)." },
    { args: [[]], expect: true, explain: "0 or 1 elements are always sorted — make sure you don't read outside the array." },
    { args: [[7]], expect: true, name: "One element" },
    { args: [[1, 2, 3, 4, 0]], expect: false, name: "Only the last pair is out of order" },
    { args: [[2, 1, 3, 4]], expect: false, name: "Only the first pair is out of order" },
    { args: [[4, 4, 4]], expect: true, name: "All equal" },
    { args: [[1, 2, 9, 3, 4]], expect: false, name: "First pair fine, later pair not" },
  ],
  random: {
    count: 25,
    gen: (r, i) => {
      const A = r.sorted(2 + (i % 15), -10, 10);
      if (i % 3 === 1) { const k = r.int(0, A.length - 2); if (A[k] !== A[k + 1]) [A[k], A[k + 1]] = [A[k + 1], A[k]]; }
      return [A];
    },
  },
  reference: (A) => A.every((x, i) => i === 0 || A[i - 1] <= x),
  budget: { metric: "keyComparisons", label: "element comparisons", limit: (A) => Math.max(0, A.length - 1), hint: "Compare each neighboring pair (A[i], A[i+1]) once — that's n − 1 pairs at most, and you can return false at the first bad one." },
  mutants: [
    { fn: (A) => A.every((x, i) => i === 0 || A[i - 1] < x), hint: "Arrays with equal neighbors like [4, 4, 4] come out false. 'Sorted' here means nondecreasing, so A[i] = A[i + 1] is fine — only A[i] > A[i + 1] is a problem." },
    { fn: (A) => A.every((x, i) => i === 0 || i === A.length - 1 || A[i - 1] <= x), hint: "The last pair (A[n − 2], A[n − 1]) is never checked. With pairs (i, i + 1), i must go up to n − 2." },
    { fn: (A) => (A.length < 2 ? true : A[0] <= A[1]), hint: "Your answer depends only on the first pair — it looks like you return true inside the loop as soon as one pair is fine. Return false early, but return true only AFTER the loop has checked every pair." },
  ],
  hints: [
    "What does ONE pair of neighbors that are out of order tell you about the whole array? What does one pair in order tell you?",
    "Loop over the neighbor pairs (A[i], A[i + 1]) for i from 0 to n − 2. The moment one pair is out of order you know the answer.",
    "Inside the loop: if A[i] > A[i + 1] then return false. After the loop (no bad pair found): return true.",
  ],
  starter: {
    pseudo: `ALGORITHM IsSorted(A[0..n-1])
    // Output: true if A[0] ≤ A[1] ≤ … ≤ A[n-1], else false
    for i ← 0 to n - 2 do
        ...          // compare A[i] with its right neighbor
    return ...`,
    js: `function IsSorted(A) {
  // compare each element with its right neighbor
}`,
  },
  solution: {
    pseudo: `ALGORITHM IsSorted(A[0..n-1])
    for i ← 0 to n - 2 do
        if A[i] > A[i + 1] then
            return false
    return true`,
    js: `function IsSorted(A) {
  for (let i = 0; i + 1 < A.length; i++) if (A[i] > A[i + 1]) return false;
  return true;
}`,
    python: `def is_sorted(A):
    for i in range(len(A) - 1):
        if A[i] > A[i + 1]:
            return False
    return True`,
    explain: "If every neighboring pair is in order, then by chaining A[0] ≤ A[1] ≤ … the whole array is. Best case: the first pair is bad → 1 comparison. Worst case (the array IS sorted, or only the last pair is bad): n − 1 comparisons, so C_worst(n) = n − 1 ∈ Θ(n) and C_best(n) = 1 ∈ Θ(1).",
  },
  distractors: ["if A[i] ≥ A[i + 1] then", "else return true", "for i ← 0 to n - 1 do"],
  followUp: "Adaptive sorts use exactly this check: insertion sort and Timsort (Python's and Java's built-in sort) run in near-linear time on data that is already almost sorted.",
  complexity: "Best Θ(1), worst n − 1 comparisons",
  visual: "sims/sorting-studio.html",
  lesson: "lessons/02-analysis-framework/README.md",
});

ForgeProblems.add({
  id: "euclid-gcd",
  title: "Euclid's Algorithm",
  level: 0, chapter: 1, difficulty: 1,
  topics: ["number theory", "loops", "gcd"],
  strategy: "Decrease-by-a-variable-amount",
  source: "Levitin §1.1",
  summary: "Compute the greatest common divisor with gcd(m, n) = gcd(n, m mod n).",
  statement: `
<p>Euclid's algorithm (about 2,300 years old) is one of the oldest algorithms still in daily use — every secure web connection
relies on it through Rivest–Shamir–Adleman (RSA) key math. It computes the <b>greatest common divisor</b>, gcd(m, n): the
largest integer that divides both m and n with remainder 0.</p>
<p>The whole idea is one equation, applied until the second number becomes 0 (Levitin §1.1):</p>
<pre>gcd(m, n) = gcd(n, m mod n)        and        gcd(m, 0) = m</pre>
<p>Example: gcd(60, 24) = gcd(24, 12) = gcd(12, 0) = 12.</p>
<ul>
<li><b>Input:</b> two integers <code>m, n ≥ 0</code>, not both 0 (they can be large, up to about 10<sup>9</sup>).</li>
<li><b>Output:</b> gcd(m, n).</li>
</ul>
<p><b>Efficiency:</b> the grader counts arithmetic operations — use the <code>mod</code> trick, not a slow count-down.</p>`,
  entry: "Euclid",
  params: ["m", "n"],
  tests: [
    { args: [60, 24], expect: 12, explain: "gcd(60, 24) = gcd(24, 12) = gcd(12, 0) = 12." },
    { args: [24, 60], expect: 12, explain: "If m < n, the first step just swaps them: 24 mod 60 = 24, so gcd(24, 60) = gcd(60, 24)." },
    { args: [7, 0], expect: 7, explain: "gcd(m, 0) = m: every integer divides 0." },
    { args: [0, 9], expect: 9, name: "First number is 0" },
    { args: [13, 7], expect: 1, name: "No common factor (coprime)" },
    { args: [31415, 14142], expect: 1, name: "Bigger numbers (Levitin Exercise 1.1.6)" },
    { args: [1071, 462], expect: 21, name: "Euclid's own style of example" },
    { args: [832040, 514229], expect: 1, name: "Consecutive Fibonacci numbers — the worst case" },
    { args: [5, 5], expect: 5, name: "Equal numbers" },
  ],
  random: { count: 25, gen: (r, i) => { const g = r.int(1, 50); return [g * r.int(0, 20000), g * r.int(1, 20000)]; } },
  reference: (m, n) => { while (n !== 0) { const r = m % n; m = n; n = r; } return m; },
  budget: {
    metric: "arithmetic", label: "arithmetic operations",
    limit: (m, n) => { let c = 0; while (n !== 0) { const r = m % n; m = n; n = r; c++; } return 2 * c + 4; },
    hint: "Each round of Euclid's algorithm needs just one mod. Counting t down from min(m, n) one step at a time is far slower on big inputs — use r ← m mod n, then shift (m, n) ← (n, r).",
  },
  mutants: [
    { fn: (m, n) => (n !== 0 ? 0 : m), hint: "You're returning 0 — probably the variable that just became 0 (n). When the loop stops, the answer is in m." },
    { fn: (m, n) => (n !== 0 ? n : m), hint: "It looks like the answer is always the original n. Check the ORDER of the updates: if you set m ← n before computing m mod n, the remainder is n mod n = 0. Compute r ← m mod n first, then m ← n, then n ← r." },
    { fn: (m, n) => (m === 0 || n === 0 ? 0 : (() => { while (n !== 0) { const r = m % n; m = n; n = r; } return m; })()), hint: "Inputs containing a 0 give the wrong answer. gcd(m, 0) = m because every integer divides 0 — you don't need a special case, just let the loop condition (while n ≠ 0) handle it." },
  ],
  hints: [
    "Try gcd(60, 24) by hand using only the rule gcd(m, n) = gcd(n, m mod n). When do you stop, and where is the answer at that moment?",
    "Loop while n ≠ 0. Each time around, replace the pair (m, n) by (n, m mod n). When the loop ends, return m.",
    "Inside the loop you need a temporary: r ← m mod n, then m ← n, then n ← r.",
  ],
  starter: {
    pseudo: `ALGORITHM Euclid(m, n)
    // Input: integers m, n ≥ 0, not both 0
    // Output: gcd(m, n)
    while n ≠ 0 do
        r ← ...
        ...          // shift the pair: (m, n) becomes (n, r)
    return ...`,
    js: `function Euclid(m, n) {
  // repeat (m, n) ← (n, m % n) until n is 0
}`,
  },
  solution: {
    pseudo: `ALGORITHM Euclid(m, n)
    while n ≠ 0 do
        r ← m mod n
        m ← n
        n ← r
    return m`,
    js: `function Euclid(m, n) {
  while (n !== 0) {
    const r = m % n;
    m = n;
    n = r;
  }
  return m;
}`,
    python: `def euclid(m, n):
    while n != 0:
        m, n = n, m % n
    return m`,
    explain: "Any number that divides m and n also divides m mod n = m − q·n, and vice versa, so gcd(m, n) = gcd(n, m mod n); the second number strictly shrinks, so the loop stops, and gcd(m, 0) = m. Every two rounds at least halve the smaller number, so there are O(log n) divisions — worst case on consecutive Fibonacci numbers (Levitin §6.1 / §2.5).",
  },
  distractors: ["m ← n mod m", "while m ≠ 0 do", "return n"],
  followUp: "Extend it to the extended Euclidean algorithm, which also finds x, y with m·x + n·y = gcd(m, n) — that is how RSA computes modular inverses for its private key.",
  complexity: "O(log min(m, n)) divisions",
  visual: "sims/euclid-gcd.html",
  lesson: "lessons/01-introduction/README.md",
});

ForgeProblems.add({
  id: "factorial-recursive",
  title: "Factorial, Recursively",
  level: 0, chapter: 2, difficulty: 1,
  topics: ["recursion", "base case", "recurrences"],
  strategy: "Recursion (decrease-by-one)",
  source: "Levitin §2.4, Example 1",
  summary: "Write n! as a recursive algorithm: F(n) = F(n − 1) · n with F(0) = 1.",
  statement: `
<p>A <b>recursive</b> algorithm solves a problem by calling itself on a smaller input. It needs two parts: a
<b>base case</b> it can answer directly, and a <b>recursive step</b> that shrinks the input. Factorial is the “hello world” of recursion (Levitin §2.4).</p>
<p>n! = 1 · 2 · … · n, and by convention 0! = 1. So <code>n! = (n − 1)! · n</code> for n ≥ 1.</p>
<ul>
<li><b>Input:</b> an integer <code>0 ≤ n ≤ 18</code>.</li>
<li><b>Output:</b> n!.</li>
</ul>
<p>Please write it <b>recursively</b> (your algorithm calls itself) — a loop would also pass, but the recursion is the lesson. The number of multiplications it makes, M(n), satisfies
the recurrence M(n) = M(n − 1) + 1 with M(0) = 0 — you'll solve that in the explanation.</p>`,
  entry: "F",
  params: ["n"],
  tests: [
    { args: [5], expect: 120, explain: "5! = 1 · 2 · 3 · 4 · 5 = 120." },
    { args: [0], expect: 1, explain: "0! = 1 by definition — this is the base case." },
    { args: [1], expect: 1, explain: "1! = 0! · 1 = 1." },
    { args: [3], expect: 6, name: "Small" },
    { args: [10], expect: 3628800, name: "Medium" },
    { args: [18], expect: 6402373705728000, name: "Largest allowed" },
  ],
  random: { count: 12, gen: (r, i) => [i % 19] },
  reference: (n) => { let f = 1; for (let i = 2; i <= n; i++) f *= i; return f; },
  budget: { metric: "calls", label: "calls", limit: (n) => n + 1, hint: "F(n) should call F(n − 1) exactly once: that's n + 1 calls in total, from F(n) down to the base case F(0)." },
  mutants: [
    { fn: () => 0, hint: "Every answer is 0. Look at your base case: F(0) must be 1 (the empty product), not 0 — multiplying by 0 wipes out everything above it." },
    { fn: (n) => (n === 0 ? 0 : (() => { let f = 1; for (let i = 2; i <= n; i++) f *= i; return f; })()), hint: "Only F(0) is wrong. A base case like 'if n ≤ 1 return n' gives 0 for n = 0 — but 0! = 1." },
    { fn: (n) => (n * (n + 1)) / 2 + (n === 0 ? 1 : 0), hint: "Your numbers grow far too slowly — they look like 1 + 2 + … + n. Factorial MULTIPLIES: return F(n − 1) * n." },
  ],
  hints: [
    "If someone hands you the value of (n − 1)!, how do you get n! with a single operation? And which n can you answer without any help?",
    "Structure: if n = 0 then return 1, else return (the result of calling F on n − 1) times n.",
    "The recursive line is: return F(n - 1) * n",
  ],
  starter: {
    pseudo: `ALGORITHM F(n)
    // Computes n! recursively
    // Input: an integer n ≥ 0
    if n = 0 then
        return ...   // the base case
    else
        return ...   // use F(n - 1)`,
    js: `function F(n) {
  if (n === 0) return /* base case */;
  // return ... using F(n - 1)
}`,
  },
  solution: {
    pseudo: `ALGORITHM F(n)
    if n = 0 then
        return 1
    else
        return F(n - 1) * n`,
    js: `function F(n) {
  if (n === 0) return 1;
  return F(n - 1) * n;
}`,
    python: `def F(n):
    if n == 0:
        return 1
    return F(n - 1) * n`,
    explain: "Correct by induction: F(0) = 1 = 0!, and if F(n − 1) = (n − 1)! then F(n) = (n − 1)! · n = n!. Multiplications: M(n) = M(n − 1) + 1, M(0) = 0; backward substitution gives M(n) = M(n − i) + i = … = M(0) + n = n, so Θ(n). (Watch out: n is a single number, so its real input size is its number of bits, b ≈ log₂ n — Θ(n) is exponential in b.)",
  },
  distractors: ["return F(n) * n", "return 0", "return F(n - 1) + n"],
  followUp: "Recursion depth is n here; a real system would overflow its call stack for large n. Rewrite it as a loop (or tail recursion), and use big integers — 21! no longer fits in a 64-bit integer.",
  complexity: "M(n) = n multiplications, Θ(n); recursion depth n + 1",
  visual: "sims/recurrence-lab.html",
  lesson: "lessons/02-analysis-framework/README.md",
});

ForgeProblems.add({
  id: "fibonacci-iterative",
  title: "Fibonacci Numbers with a Loop",
  level: 0, chapter: 2, difficulty: 1,
  topics: ["loops", "sequences", "recurrences"],
  strategy: "Bottom-up (keep the last two values)",
  source: "Levitin §2.5",
  summary: "Compute F(n) in linear time by keeping only the previous two Fibonacci numbers.",
  statement: `
<p>The Fibonacci numbers 0, 1, 1, 2, 3, 5, 8, 13, … are defined by F(0) = 0, F(1) = 1 and F(n) = F(n − 1) + F(n − 2).
Coding that definition directly as recursion is shockingly slow — it recomputes the same values over and over (Levitin §2.5).
Going <b>bottom-up</b> with a loop fixes it, and is your first taste of dynamic programming.</p>
<ul>
<li><b>Input:</b> an integer <code>0 ≤ n ≤ 70</code>.</li>
<li><b>Output:</b> F(n).</li>
</ul>
<p><b>Efficiency:</b> the grader checks that your work grows <b>linearly</b> in n — the plain recursive version will not pass.</p>`,
  entry: "Fib",
  params: ["n"],
  tests: [
    { args: [10], expect: 55, explain: "0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55 — the value at index 10." },
    { args: [0], expect: 0, explain: "F(0) = 0. Careful: counting starts at index 0." },
    { args: [1], expect: 1, explain: "F(1) = 1, the other starting value." },
    { args: [2], expect: 1, name: "F(2) = F(1) + F(0)" },
    { args: [7], expect: 13, name: "Small" },
    { args: [50], expect: 12586269025, name: "Too big for naive recursion" },
    { args: [70], expect: 190392490709135, name: "Largest allowed" },
  ],
  random: { count: 15, gen: (r, i) => [(i * 7) % 71] },
  reference: (n) => { let a = 0, b = 1; for (let i = 0; i < n; i++) [a, b] = [b, a + b]; return a; },
  growth: { metric: "steps", sizes: [10, 20, 40, 80, 160], gen: (r, n) => [n], expect: "n" },
  maxSteps: 100000,
  lints: [
    { re: "Fib\\s*\\(\\s*n\\s*[-−]\\s*1\\s*\\)", lang: "any", message: "Calling Fib(n − 1) and Fib(n − 2) recomputes the same values exponentially often — F(40) would take over 300 million calls. Keep the last two values in variables and move forward with a loop instead." },
  ],
  mutants: [
    { fn: (n) => { let a = 0, b = 1; for (let i = 0; i <= n; i++) [a, b] = [b, a + b]; return a; }, hint: "Your answers are one position too far along (F(10) gives 89 instead of 55). Your loop probably runs one extra time — trace n = 2 by hand." },
    { fn: (n) => { if (n === 0) return 0; let a = 0, b = 1; for (let i = 1; i < n; i++) [a, b] = [b, a + b]; return a; }, hint: "Your answers are one position behind (F(10) gives 34). Check the loop bounds and which of your two variables you return." },
    { fn: (n) => { if (n === 0) return 0; let prev = 0, curr = 1; for (let i = 2; i <= n; i++) { curr = prev + curr; prev = curr; } return curr; }, hint: "Your values double each step (1, 2, 4, 8, …) instead of following Fibonacci. The update order is the problem: once curr is overwritten, prev ← curr copies the NEW value. Save the sum in a temporary 'next' first, then shift prev ← curr, curr ← next." },
  ],
  hints: [
    "To compute F(n) you only ever need the two numbers just before it. So how many variables do you really need to remember?",
    "Keep prev ← 0 (F(0)) and curr ← 1 (F(1)). Each step slides the window forward: the new pair is (curr, prev + curr).",
    "Handle n = 0 first (return 0). Then for i ← 2 to n do: next ← prev + curr; prev ← curr; curr ← next. Return curr.",
  ],
  starter: {
    pseudo: `ALGORITHM Fib(n)
    // Computes the nth Fibonacci number with a loop
    if n = 0 then
        return 0
    prev ← 0
    curr ← 1
    for i ← 2 to n do
        ...          // slide (prev, curr) one step forward
    return curr`,
    js: `function Fib(n) {
  if (n === 0) return 0;
  let prev = 0, curr = 1;
  // slide (prev, curr) forward until curr = F(n)
  return curr;
}`,
  },
  solution: {
    pseudo: `ALGORITHM Fib(n)
    if n = 0 then
        return 0
    prev ← 0
    curr ← 1
    for i ← 2 to n do
        next ← prev + curr
        prev ← curr
        curr ← next
    return curr`,
    js: `function Fib(n) {
  if (n === 0) return 0;
  let prev = 0, curr = 1;
  for (let i = 2; i <= n; i++) {
    const next = prev + curr;
    prev = curr;
    curr = next;
  }
  return curr;
}`,
    python: `def fib(n):
    if n == 0:
        return 0
    prev, curr = 0, 1
    for _ in range(2, n + 1):
        prev, curr = curr, prev + curr
    return curr`,
    explain: "Invariant: at the start of the iteration for i, (prev, curr) = (F(i − 2), F(i − 1)). The loop makes n − 1 additions, Θ(n), with Θ(1) memory — versus the exponential Θ(φⁿ) additions of the definition-based recursion (φ ≈ 1.618).",
  },
  distractors: ["return Fib(n - 1) + Fib(n - 2)", "prev ← next", "for i ← 1 to n do"],
  followUp: "Go further: with the matrix identity [[1,1],[1,0]]ⁿ and exponentiation by squaring, F(n) takes only Θ(log n) multiplications (see fib-matrix-power at level 5).",
  complexity: "Θ(n) additions, Θ(1) extra space",
  visual: "sims/fibonacci.html",
  lesson: "lessons/02-analysis-framework/README.md",
});

/* ------------------------------------------------------------------ */
/* Level 0 · difficulty 2–3                                            */
/* ------------------------------------------------------------------ */

ForgeProblems.add({
  id: "second-largest",
  title: "Second Largest Element",
  level: 0, chapter: 2, difficulty: 2,
  topics: ["arrays", "loops", "invariants"],
  strategy: "One pass, two 'best so far' variables",
  source: "Interview classic (extends Levitin §2.3, Example 1)",
  summary: "Find the second largest value in one pass, keeping track of the top two so far.",
  statement: `
<p>Finding the maximum needs one “best so far” variable. Finding the <b>runner-up</b> needs two — and careful thinking
about what happens when a new champion arrives. It is a classic interview warm-up because it tests exactly that care.</p>
<p><b>Task.</b> Given <code>A[0..n-1]</code> with <code>n ≥ 2</code>, return the value that would be in position 2 if you
sorted <code>A</code> from largest to smallest. Duplicates count separately: for <code>[7, 7, 2]</code> the answer is <code>7</code>.</p>
<ul>
<li><b>Input:</b> <code>2 ≤ n ≤ 60</code> integers (possibly negative, possibly repeated).</li>
<li><b>Output:</b> the second largest value.</li>
</ul>
<p><b>Rules:</b> one pass, no sorting (<code>sorted</code> is not allowed), at most <code>2n − 3</code> element comparisons.</p>`,
  entry: "SecondLargest",
  params: ["A"],
  tests: [
    { args: [[3, 9, 2, 7]], expect: 7, explain: "Largest is 9, runner-up is 7." },
    { args: [[9, 1, 2]], expect: 2, explain: "The champion is first — don't let it also be the runner-up." },
    { args: [[7, 7, 2]], expect: 7, explain: "Duplicates count: sorted from largest it's 7, 7, 2 — position 2 holds 7." },
    { args: [[4, 8, 6, 10]], expect: 8, name: "New champion must hand its title to second place" },
    { args: [[-4, -2, -9]], expect: -4, name: "All negative" },
    { args: [[2, 7, 7]], expect: 7, name: "A value equal to the champion shows up later" },
    { args: [[1, 2]], expect: 1, name: "Only two elements" },
    { args: [[5, 5, 5, 5]], expect: 5, name: "All equal" },
  ],
  random: { count: 30, gen: (r, i) => [r.array(2 + (i % 20), -30, 30)] },
  reference: (A) => A.slice().sort((x, y) => y - x)[1],
  forbid: ["sorted"],
  budget: { metric: "keyComparisons", label: "element comparisons", limit: (A) => 2 * A.length - 3, hint: "One comparison to set up the first two, then at most two per remaining element (against first; only if that fails, against second): 1 + 2(n − 2) = 2n − 3." },
  mutants: [
    { fn: (A) => { let f = A[0], s = A[0]; for (let i = 1; i < A.length; i++) { if (A[i] > f) { s = f; f = A[i]; } else if (A[i] > s) s = A[i]; } return s; }, hint: "When A[0] is the biggest element, your answer is A[0] itself. Starting both 'first' and 'second' at A[0] makes the champion its own runner-up. Initialize them from A[0] and A[1] (bigger one is first)." },
    { fn: (A) => { let f = Math.max(A[0], A[1]), s = Math.min(A[0], A[1]); for (let i = 2; i < A.length; i++) { if (A[i] > f) { f = A[i]; } else if (A[i] > s) s = A[i]; } return s; }, hint: "When a new maximum arrives, the old maximum is forgotten — but the old champion is now the runner-up! Before first ← A[i], do second ← first." },
    { fn: (A) => { let f = Math.max(A[0], A[1]), s = Math.min(A[0], A[1]); for (let i = 2; i < A.length; i++) { if (A[i] > f) { s = f; f = A[i]; } else if (A[i] > s && A[i] !== f) s = A[i]; } return s; }, hint: "You're skipping values equal to the maximum, but duplicates count here: in [2, 7, 7] the answer is 7. Drop the '≠ first' test." },
    { fn: (A) => { let f = 0, s = 0; for (let i = 0; i < A.length; i++) { if (A[i] > f) { s = f; f = A[i]; } else if (A[i] > s) s = A[i]; } return s; }, hint: "All-negative arrays give 0. Starting at 0 assumes the numbers are positive — start from the actual first two elements instead." },
  ],
  hints: [
    "Keep two variables: first (largest so far) and second (runner-up so far). When a new element beats first, what happens to the OLD first?",
    "Set first and second from A[0] and A[1] (the bigger one is first). Then for i from 2 to n − 1, ask up to two questions about A[i].",
    "if A[i] > first then { second ← first; first ← A[i] } else if A[i] > second then second ← A[i]",
  ],
  starter: {
    pseudo: `ALGORITHM SecondLargest(A[0..n-1])
    // Input: n ≥ 2 numbers.  Output: the second largest (duplicates count)
    if A[0] ≥ A[1] then
        first ← A[0]
        second ← A[1]
    else
        ...
    for i ← 2 to n - 1 do
        ...          // does A[i] beat first? if not, does it beat second?
    return second`,
    js: `function SecondLargest(A) {
  let first = Math.max(A[0], A[1]), second = Math.min(A[0], A[1]);
  // look at A[2..n-1]
  return second;
}`,
  },
  solution: {
    pseudo: `ALGORITHM SecondLargest(A[0..n-1])
    if A[0] ≥ A[1] then
        first ← A[0]
        second ← A[1]
    else
        first ← A[1]
        second ← A[0]
    for i ← 2 to n - 1 do
        if A[i] > first then
            second ← first
            first ← A[i]
        else if A[i] > second then
            second ← A[i]
    return second`,
    js: `function SecondLargest(A) {
  let first, second;
  if (A[0] >= A[1]) { first = A[0]; second = A[1]; } else { first = A[1]; second = A[0]; }
  for (let i = 2; i < A.length; i++) {
    if (A[i] > first) { second = first; first = A[i]; }
    else if (A[i] > second) second = A[i];
  }
  return second;
}`,
    python: `def second_largest(A):
    first, second = (A[0], A[1]) if A[0] >= A[1] else (A[1], A[0])
    for x in A[2:]:
        if x > first:
            first, second = x, first
        elif x > second:
            second = x
    return second`,
    explain: "Invariant: after looking at A[0..i], first and second are the two largest of those elements (duplicates counted). In the worst case (for example a decreasing array) A[i] > first fails every time, so both tests run for every element: 1 + 2(n − 2) = 2n − 3 comparisons, Θ(n).",
  },
  distractors: ["first ← A[0]", "second ← A[i]", "else if A[i] > second and A[i] ≠ first then"],
  followUp: "A tournament finds the second largest in only n + ⌈log₂ n⌉ − 2 comparisons: the runner-up must have lost directly to the champion, so replay only the champion's ⌈log₂ n⌉ matches.",
  complexity: "Θ(n), at most 2n − 3 comparisons",
  visual: "sims/sorting-studio.html",
  lesson: "lessons/02-analysis-framework/README.md",
});

ForgeProblems.add({
  id: "consecutive-integer-gcd",
  title: "GCD by Consecutive Integer Checking",
  level: 0, chapter: 1, difficulty: 2,
  topics: ["number theory", "loops", "input specification", "counting"],
  strategy: "Brute force (try candidates from the top)",
  source: "Levitin §1.1",
  summary: "Try t = min(m, n), min − 1, … until t divides both; return the Greatest Common Divisor (GCD) and how many t's you tried.",
  statement: `
<p>Levitin §1.1 shows a second way to compute the Greatest Common Divisor (GCD), gcd(m, n): the answer can't be bigger than
<code>min(m, n)</code>, so try <code>t = min(m, n)</code>; if t divides both numbers you're done, otherwise try
<code>t − 1</code>, and so on. The book warns that this version, as written, <b>breaks when an input is 0</b> — a lesson in
specifying inputs carefully. Your version must handle it.</p>
<p><b>Task.</b> Return a pair <code>[g, tries]</code>:</p>
<ul>
<li><code>g</code> = gcd(m, n);</li>
<li><code>tries</code> = how many candidate values of <code>t</code> you checked (for gcd(60, 24): t = 24, 23, …, 12 → 13 tries).</li>
<li>If one input is 0, the gcd is the other number and <code>tries = 0</code> (no candidates are needed — every integer divides 0).</li>
</ul>
<p><b>Input:</b> integers <code>m, n ≥ 0</code>, not both 0, at most 2000. Comparing <code>tries</code> with Euclid's handful of
divisions is the whole point: this method is slow when the gcd is small.</p>`,
  entry: "ConsecutiveGcd",
  params: ["m", "n"],
  tests: [
    { args: [60, 24], expect: [12, 13], explain: "t = 24, 23, 22, …, 12: that's 24 − 12 + 1 = 13 candidates." },
    { args: [0, 9], expect: [9, 0], explain: "An input is 0: gcd(0, 9) = 9 with no candidates tried (min would be 0 — and t mod 0 is undefined!)." },
    { args: [12, 18], expect: [6, 7], explain: "t = 12, 11, …, 6 → 7 tries; 6 is the first to divide both." },
    { args: [7, 7], expect: [7, 1], name: "Equal numbers: the first candidate works" },
    { args: [13, 1000], expect: [1, 13], name: "Coprime: tries every t down to 1" },
    { args: [5, 0], expect: [5, 0], name: "Second input is 0" },
    { args: [100, 75], expect: [25, 51], name: "t = 75 → 25" },
    { args: [1, 1], expect: [1, 1], name: "Smallest positive inputs" },
  ],
  random: { count: 25, gen: (r, i) => (i % 8 === 0 ? [r.int(1, 300), 0] : [r.int(1, 400), r.int(1, 400)]) },
  reference: (m, n) => {
    if (m === 0) return [n, 0];
    if (n === 0) return [m, 0];
    let t = Math.min(m, n), tries = 1;
    while (m % t !== 0 || n % t !== 0) { t--; tries++; }
    return [t, tries];
  },
  mutants: [
    { fn: (m, n) => { if (m === 0) return [n, 0]; if (n === 0) return [m, 0]; let t = Math.min(m, n), tries = 0; while (m % t !== 0 || n % t !== 0) { t--; tries++; } return [t, tries]; }, hint: "The gcd is right but tries is one short. You're counting the decrements; count every candidate you CHECK — including the first one, t = min(m, n)." },
    { fn: (m, n) => { if (m === 0) return [n, 0]; if (n === 0) return [m, 0]; let t = Math.min(m, n), tries = 1; while (m % t !== 0) { t--; tries++; } return [t, tries]; }, hint: "For 60 and 24 you stop at t = 20 — which divides 60 but not 24. t has to divide BOTH m and n (Levitin's Step 2 and Step 3)." },
    { fn: (m, n) => { if (m === 0 || n === 0) return [0, 0]; let t = Math.min(m, n), tries = 1; while (m % t !== 0 || n % t !== 0) { t--; tries++; } return [t, tries]; }, hint: "gcd(0, 9) is 9, not 0: every integer divides 0, so the largest number dividing both 0 and 9 is 9 itself. Return the OTHER input when one of them is 0." },
  ],
  hints: [
    "Why is min(m, n) the right place to start, and why does counting down guarantee that the FIRST t that works is the greatest one?",
    "Handle the zero cases first (return the other number, 0 tries). Then t ← min(m, n), tries ← 1, and loop while t fails to divide m or fails to divide n.",
    "The loop test is: while m mod t ≠ 0 or n mod t ≠ 0 do — inside it, t ← t − 1 and tries ← tries + 1.",
  ],
  starter: {
    pseudo: `ALGORITHM ConsecutiveGcd(m, n)
    // Output: [gcd(m, n), number of candidates t checked]
    if m = 0 then
        return [n, 0]
    ...              // the other zero case
    t ← min(m, n)
    tries ← 1
    while ... do
        ...
    return [t, tries]`,
    js: `function ConsecutiveGcd(m, n) {
  // handle 0 inputs, then try t = min(m, n), min(m, n) - 1, ...
  // return [gcd, tries]
}`,
  },
  solution: {
    pseudo: `ALGORITHM ConsecutiveGcd(m, n)
    if m = 0 then
        return [n, 0]
    if n = 0 then
        return [m, 0]
    t ← min(m, n)
    tries ← 1
    while m mod t ≠ 0 or n mod t ≠ 0 do
        t ← t - 1
        tries ← tries + 1
    return [t, tries]`,
    js: `function ConsecutiveGcd(m, n) {
  if (m === 0) return [n, 0];
  if (n === 0) return [m, 0];
  let t = Math.min(m, n), tries = 1;
  while (m % t !== 0 || n % t !== 0) { t--; tries++; }
  return [t, tries];
}`,
    python: `def consecutive_gcd(m, n):
    if m == 0: return [n, 0]
    if n == 0: return [m, 0]
    t, tries = min(m, n), 1
    while m % t != 0 or n % t != 0:
        t -= 1; tries += 1
    return [t, tries]`,
    explain: "Counting down from min(m, n), the first t dividing both is the greatest common divisor, and t = 1 always works, so the loop stops. It checks min(m, n) − gcd + 1 candidates: up to min(m, n) of them, Θ(min(m, n)) — exponential in the number of digits, versus O(log n) for Euclid.",
  },
  distractors: ["while m mod t ≠ 0 and n mod t ≠ 0 do", "tries ← 0", "return [0, 0]"],
  followUp: "Measure it: run both algorithms on (832040, 514229) and on random 9-digit pairs and plot the counts — that is the empirical analysis of Levitin §2.6 in miniature.",
  complexity: "Θ(min(m, n)) candidates in the worst case",
  visual: "sims/euclid-gcd.html",
  lesson: "lessons/01-introduction/README.md",
});

ForgeProblems.add({
  id: "sum-of-cubes",
  title: "Sum of the First n Cubes",
  level: 0, chapter: 2, difficulty: 2,
  topics: ["recursion", "loops", "recurrences", "analysis"],
  strategy: "Recursion or a loop — then compare",
  source: "Classic exam problem (Practice Exam 1, Problem A1) · compare Levitin Exercise 2.4.3",
  summary: "Compute S(n) = 1³ + 2³ + … + n³, recursively or with a loop, and count its multiplications.",
  statement: `
<p>The classic exam version asks for this sum <b>twice</b> — once recursively, once with a loop — and then asks which is better.
Writing both is a great way to see that the same arithmetic can be organized in two shapes.</p>
<p><b>Task.</b> Return <code>S(n) = 1³ + 2³ + … + n³</code>. (S(0) = 0.)</p>
<ul>
<li><b>Input:</b> an integer <code>0 ≤ n ≤ 1000</code>.</li>
<li><b>Output:</b> S(n).</li>
</ul>
<p>Recursive shape: <code>S(n) = S(n − 1) + n·n·n</code> with <code>S(0) = 0</code>. Loop shape: add <code>i·i·i</code> for i = 1..n.
Either passes — try both.</p>`,
  entry: "SumCubes",
  params: ["n"],
  tests: [
    { args: [3], expect: 36, explain: "1 + 8 + 27 = 36." },
    { args: [0], expect: 0, explain: "No terms at all: the sum is 0 (your base case)." },
    { args: [1], expect: 1, explain: "Just 1³ = 1." },
    { args: [4], expect: 100, name: "36 + 64" },
    { args: [10], expect: 3025, name: "Medium" },
    { args: [100], expect: 25502500, name: "Larger" },
    { args: [1000], expect: 250500250000, name: "Largest allowed (recursion depth 1000 is fine here)" },
  ],
  random: { count: 20, gen: (r, i) => [r.int(0, 300)] },
  reference: (n) => (n * (n + 1) / 2) ** 2,
  mutants: [
    { fn: (n) => (n * (n + 1) * (2 * n + 1)) / 6, hint: "These are sums of SQUARES (1 + 4 + 9 + …). A cube needs three factors: i · i · i." },
    { fn: (n) => (n <= 0 ? 0 : ((n - 1) * n / 2) ** 2), hint: "You're one term short: n³ itself is missing. The loop should run i ← 1 to n (inclusive), or the recursion should add n³ before calling S(n − 1)." },
    { fn: (n) => (3 * n * (n + 1)) / 2, hint: "It looks like you added 3·i instead of i³. In pseudocode write i * i * i (or i^3)." },
  ],
  hints: [
    "What is the relationship between S(n) and S(n − 1)? What is the smallest n whose answer you know without any work?",
    "Recursive: if n = 0 return 0, else return SumCubes(n − 1) + n·n·n. Loop: s ← 0, then add i·i·i for every i from 1 to n.",
    "Loop body: s ← s + i * i * i. Recursive step: return SumCubes(n - 1) + n * n * n",
  ],
  starter: {
    pseudo: `ALGORITHM SumCubes(n)
    // Computes 1³ + 2³ + … + n³   (n ≥ 0)
    if n = 0 then
        return ...
    return ...   // recursive: use SumCubes(n - 1)`,
    js: `function SumCubes(n) {
  // recursive or with a loop — try both!
}`,
  },
  solution: {
    pseudo: `ALGORITHM SumCubes(n)
    s ← 0
    for i ← 1 to n do
        s ← s + i * i * i
    return s`,
    js: `// Recursive version (the loop version is in the pseudocode tab)
function SumCubes(n) {
  if (n === 0) return 0;
  return SumCubes(n - 1) + n * n * n;
}`,
    python: `def sum_cubes(n):          # loop
    s = 0
    for i in range(1, n + 1):
        s += i * i * i
    return s

def sum_cubes_rec(n):      # recursion
    return 0 if n == 0 else sum_cubes_rec(n - 1) + n * n * n`,
    explain: "Both make 2 multiplications per term. Loop: M(n) = Σ_{i=1}^{n} 2 = 2n. Recursion: M(n) = M(n − 1) + 2, M(0) = 0 → M(n) = 2n by backward substitution. Same Θ(n) count, but the recursive one also pays n + 1 calls and Θ(n) stack space, so the loop is better. Best of all: the identity S(n) = (n(n + 1)/2)² gives Θ(1).",
  },
  distractors: ["s ← s + i * i", "for i ← 0 to n - 1 do", "s ← s + 3 * i"],
  followUp: "Prove the closed form S(n) = (n(n + 1)/2)² by induction, then implement it in Θ(1) — and notice it squares the sum 1 + 2 + … + n. Nicomachus knew this some 1,900 years ago.",
  complexity: "2n multiplications (Θ(n)) either way; Θ(1) with the closed form",
  visual: "sims/recurrence-lab.html",
  lesson: "lessons/02-analysis-framework/README.md",
});

ForgeProblems.add({
  id: "integer-sqrt",
  title: "Integer Square Root Without sqrt",
  level: 0, chapter: 1, difficulty: 2,
  topics: ["number theory", "loops", "problem constraints"],
  strategy: "Try consecutive integers",
  source: "Levitin Exercise 1.1.4 (adapted) · Problem Set 1, Problem 1",
  summary: "Return ⌊√n⌋ using only + − × ÷ and comparisons.",
  statement: `
<p>Real hardware often lacks a square-root instruction (tiny microcontrollers, cryptography libraries working with huge
integers). So: can you compute one using only the four basic arithmetic operations?</p>
<p><b>Task.</b> Given an integer <code>n ≥ 0</code>, return <code>⌊√n⌋</code>, the largest integer <code>r</code> with
<code>r · r ≤ n</code>.</p>
<ul>
<li><b>Input:</b> <code>0 ≤ n ≤ 1 000 000</code>.</li>
<li><b>Output:</b> ⌊√n⌋ — e.g. 4 for n = 17, and 4 for n = 16.</li>
</ul>
<p><b>Rules:</b> besides assignment and comparison you may only use <code>+ − × ÷</code> (so no <code>sqrt</code>, <code>pow</code>,
<code>log</code>, and no <code>^ 0.5</code> trick). The grader checks that your work grows like <b>√n</b> or better.</p>`,
  entry: "IntSqrt",
  params: ["n"],
  tests: [
    { args: [17], expect: 4, explain: "4·4 = 16 ≤ 17 but 5·5 = 25 > 17." },
    { args: [16], expect: 4, explain: "Perfect square: 4·4 = 16 ≤ 16 exactly, so the answer is 4 (not 3)." },
    { args: [0], expect: 0, explain: "0·0 = 0 ≤ 0." },
    { args: [1], expect: 1, name: "n = 1" },
    { args: [2], expect: 1, name: "n = 2" },
    { args: [3], expect: 1, name: "n = 3: rounding would give 2 — we round DOWN" },
    { args: [8], expect: 2, name: "√8 ≈ 2.83" },
    { args: [24], expect: 4, name: "√24 ≈ 4.9, just below a square" },
    { args: [99], expect: 9, name: "√99 ≈ 9.95" },
    { args: [999999], expect: 999, name: "Just below 1000²" },
    { args: [1000000], expect: 1000, name: "Largest allowed" },
  ],
  random: { count: 25, gen: (r, i) => { const k = r.int(0, 900); return [i % 2 ? k * k : r.int(0, 800000)]; } },
  reference: (n) => { let r = Math.floor(Math.sqrt(n)); while (r * r > n) r--; while ((r + 1) * (r + 1) <= n) r++; return r; },
  forbid: ["sqrt", "pow", "log", "log2", "lg", "ln", "exp"],
  growth: { metric: "steps", sizes: [256, 1024, 4096, 16384, 65536], gen: (r, n) => [n + r.int(0, 3)], expect: "sqrt n" },
  maxSteps: 100000,
  mutants: [
    { fn: (n) => { let r = 0; while (r * r <= n) r++; return r; }, hint: "You're returning the first r whose square is TOO BIG (5 for n = 17). The answer is the one just before it — return r − 1, or test (r + 1)·(r + 1) ≤ n before stepping." },
    { fn: (n) => { let r = 0; while ((r + 1) * (r + 1) < n) r++; return r; }, hint: "Perfect squares come out one too small (3 for n = 16). If (r + 1)² equals n exactly, r + 1 is still allowed: use ≤, not <." },
    { fn: (n) => { let r = 0; while ((r + 1) * (r + 1) <= n) r++; return (n - r * r) > r ? r + 1 : r; }, hint: "You're rounding to the NEAREST integer (√8 ≈ 2.83 → 3). The problem wants ⌊√n⌋, always rounding down: the largest r with r·r ≤ n." },
  ],
  lints: [
    { re: "\\^\\s*\\(?\\s*(0?\\.5|1\\s*/\\s*2)", lang: "any", message: "Raising to the power 1/2 is a square root in disguise — please build it from + − × ÷ only." },
    { re: "for\\s+\\w+\\s*(←|<-|:=)\\s*\\w+\\s+to\\s+n\\s+do", lang: "pseudo", message: "A loop that runs all the way to n does n steps (a million for n = 10⁶). The answer is at most √n, so stop as soon as the next square passes n — use a while loop." },
  ],
  hints: [
    "You can't compute √n directly, but you CAN check a guess: r is the answer when r·r ≤ n and (r + 1)·(r + 1) > n. Which guesses would you try, in what order?",
    "Start at r ← 0 and keep stepping r up by 1 as long as the NEXT integer's square still fits under n.",
    "while (r + 1) * (r + 1) ≤ n do r ← r + 1 — then return r.",
  ],
  starter: {
    pseudo: `ALGORITHM IntSqrt(n)
    // Output: the largest r with r · r ≤ n, using only + − × ÷
    r ← 0
    while ... do
        r ← r + 1
    return r`,
    js: `function IntSqrt(n) {
  let r = 0;
  // step r up while the next square still fits (no Math.sqrt!)
  return r;
}`,
  },
  solution: {
    pseudo: `ALGORITHM IntSqrt(n)
    r ← 0
    while (r + 1) * (r + 1) ≤ n do
        r ← r + 1
    return r`,
    js: `function IntSqrt(n) {
  let r = 0;
  while ((r + 1) * (r + 1) <= n) r++;
  return r;
}`,
    python: `def int_sqrt(n):
    r = 0
    while (r + 1) * (r + 1) <= n:
        r += 1
    return r`,
    explain: "Invariant: r·r ≤ n. The loop stops at the first r with (r + 1)² > n, so r = ⌊√n⌋. It runs ⌊√n⌋ times with one multiplication each: Θ(√n) — which is still exponential in the number of digits of n.",
  },
  distractors: ["while r * r ≤ n do", "while (r + 1) * (r + 1) < n do", "return r + 1"],
  followUp: "Binary search on r in [0, n] gives Θ(log n) multiplications; Newton's method x ← (x + n/x)/2 (integer division) converges even faster — quadratically. Both are how big-integer libraries do it.",
  complexity: "Θ(√n) multiplications",
  visual: "sims/euclid-gcd.html",
  lesson: "lessons/01-introduction/README.md",
});

ForgeProblems.add({
  id: "sieve-primes",
  title: "Sieve of Eratosthenes",
  level: 0, chapter: 1, difficulty: 3,
  topics: ["number theory", "arrays", "primes", "marking"],
  strategy: "Cross out multiples (mark, don't test)",
  source: "Levitin §1.1",
  summary: "List all primes ≤ n by crossing out multiples, in about linear work.",
  statement: `
<p>Testing each number for divisors one by one is slow. The sieve of Eratosthenes (about 2,200 years old) flips the question around:
instead of asking “is k prime?”, it <b>crosses out</b> every multiple of each prime. Whatever survives is prime (Levitin §1.1).
Marking instead of testing is a trick you will reuse all the time.</p>
<p><b>Task.</b> Given <code>n ≥ 2</code>, return the list of all primes <code>p ≤ n</code> in increasing order.</p>
<ul>
<li><b>Input:</b> an integer <code>2 ≤ n ≤ 5000</code>.</li>
<li><b>Output:</b> a list, e.g. <code>[2, 3, 5, 7]</code> for n = 10. (1 is not prime.)</li>
</ul>
<p><b>Two observations from the book make it fast:</b> when crossing out multiples of p you can start at <code>p·p</code>
(smaller multiples were crossed out by smaller primes), so you only need p with <code>p·p ≤ n</code>; and you only cross out
multiples of numbers that are <b>still on the list</b>. The grader checks your work grows about linearly in n.</p>
<p>Handy: <code>A ← array(n + 1, true)</code> makes a list of <code>true</code> flags you can index from 0 to n; <code>append(L, x)</code> adds to a list.</p>`,
  entry: "Sieve",
  params: ["n"],
  tests: [
    { args: [10], expect: [2, 3, 5, 7], explain: "Cross out 4, 6, 8, 10 (multiples of 2) and 9 (of 3). 5·5 > 10, so stop." },
    { args: [2], expect: [2], explain: "The smallest input: just 2." },
    { args: [25], expect: [2, 3, 5, 7, 11, 13, 17, 19, 23], explain: "25 = 5·5 must be crossed out — so p = 5 still needs its turn (p·p ≤ n, not <)." },
    { args: [3], expect: [2, 3], name: "n = 3" },
    { args: [4], expect: [2, 3], name: "n = 4 is 2·2" },
    { args: [30], expect: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29], name: "n = 30 (composite n)" },
    { args: [49], expect: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47], name: "n = 7² " },
    { args: [100], expect: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97], name: "The 25 primes below 100" },
  ],
  random: { count: 20, gen: (r, i) => [i < 6 ? [121, 169, 48, 64, 97, 1000][i] : r.int(2, 600)] },
  reference: (n) => { const out = []; for (let k = 2; k <= n; k++) { let p = true; for (let d = 2; d * d <= k; d++) if (k % d === 0) { p = false; break; } if (p) out.push(k); } return out; },
  growth: { metric: "steps", sizes: [256, 512, 1024, 2048, 4096], gen: (r, n) => [n], expect: "n" },
  mutants: [
    { fn: (n) => { const A = Array(n + 1).fill(true); for (let p = 2; p * p <= n; p++) if (A[p]) for (let j = p * p; j <= n; j += p) A[j] = false; const L = []; for (let p = 1; p <= n; p++) if (A[p]) L.push(p); return L; }, hint: "1 appears in your list, but 1 is not a prime (a prime has exactly two divisors). Collect the survivors starting from 2." },
    { fn: (n) => { const A = Array(n + 1).fill(true); for (let p = 2; p * p <= n; p++) if (A[p]) for (let j = p * p; j < n; j += p) A[j] = false; const L = []; for (let p = 2; p <= n; p++) if (A[p]) L.push(p); return L; }, hint: "When n itself is composite (like 10 or 30) it survives. Your crossing-out loop stops before reaching n: use while j ≤ n." },
    { fn: (n) => { const A = Array(n + 1).fill(true); for (let p = 2; p * p < n; p++) if (A[p]) for (let j = p * p; j <= n; j += p) A[j] = false; const L = []; for (let p = 2; p <= n; p++) if (A[p]) L.push(p); return L; }, hint: "When n is the square of a prime (4, 25, 49) it survives. The outer loop must also run for p with p·p = n exactly: use p·p ≤ n." },
    { fn: (n) => { const A = Array(n + 1).fill(true); for (let p = 2; p * p <= n; p++) if (A[p]) for (let j = p; j <= n; j += p) A[j] = false; const L = []; for (let p = 2; p <= n; p++) if (A[p]) L.push(p); return L; }, hint: "Small primes like 2 and 3 are missing — you're crossing out p itself. Start crossing out at p·p (or at least at 2p)." },
  ],
  hints: [
    "Write the numbers 2..30 on paper. Circle 2, then cross out every 2nd number after it. What's the next number not crossed out, and what do you do with it?",
    "Keep an array of true/false flags A[0..n]. For p = 2, 3, … while p·p ≤ n: if A[p] is still true, walk j = p·p, p·p + p, p·p + 2p, … ≤ n and set A[j] ← false. Finally collect every p ≥ 2 whose flag is still true.",
    "The crossing-out loop is: j ← p * p; while j ≤ n do A[j] ← false; j ← j + p",
  ],
  starter: {
    pseudo: `ALGORITHM Sieve(n)
    // Output: list of all primes ≤ n, in increasing order
    A ← array(n + 1, true)
    p ← 2
    while p * p ≤ n do
        if A[p] then
            ...      // cross out p·p, p·p + p, p·p + 2p, … up to n
        p ← p + 1
    L ← []
    ...              // collect every number ≥ 2 that survived
    return L`,
    js: `function Sieve(n) {
  const A = new Array(n + 1).fill(true);
  // cross out multiples, then collect the survivors >= 2
}`,
  },
  solution: {
    pseudo: `ALGORITHM Sieve(n)
    A ← array(n + 1, true)
    p ← 2
    while p * p ≤ n do
        if A[p] then
            j ← p * p
            while j ≤ n do
                A[j] ← false
                j ← j + p
        p ← p + 1
    L ← []
    for p ← 2 to n do
        if A[p] then
            append(L, p)
    return L`,
    js: `function Sieve(n) {
  const A = new Array(n + 1).fill(true);
  for (let p = 2; p * p <= n; p++)
    if (A[p]) for (let j = p * p; j <= n; j += p) A[j] = false;
  const L = [];
  for (let p = 2; p <= n; p++) if (A[p]) L.push(p);
  return L;
}`,
    python: `def sieve(n):
    A = [True] * (n + 1)
    p = 2
    while p * p <= n:
        if A[p]:
            for j in range(p * p, n + 1, p):
                A[j] = False
        p += 1
    return [p for p in range(2, n + 1) if A[p]]`,
    explain: "A composite k ≤ n has a prime factor p ≤ √k, and k ≥ p·p is a multiple of p, so it gets crossed out; a prime is never a multiple of a smaller prime, so it survives. Crossing out costs Σ_{primes p ≤ √n} n/p ≈ n ln ln n — practically linear, Θ(n log log n).",
  },
  distractors: ["j ← p", "while p * p < n do", "for p ← 1 to n do"],
  followUp: "For n in the billions, a segmented sieve processes blocks that fit in the processor cache; linear sieves reach true Θ(n) by crossing out each composite exactly once via its smallest prime factor.",
  complexity: "Θ(n log log n) crossings-out",
  visual: "sims/euclid-gcd.html",
  lesson: "lessons/01-introduction/README.md",
});

ForgeProblems.add({
  id: "locker-doors",
  title: "Locker Doors",
  level: 0, chapter: 1, difficulty: 3,
  topics: ["simulation", "loops", "number theory", "puzzles"],
  strategy: "Simulate, then spot the pattern",
  source: "Levitin Exercise 1.1.12 (adapted) · Problem Set 1, Problem 9",
  summary: "n lockers, n passes; pass i toggles every i-th locker. Which lockers are open at the end?",
  statement: `
<p>A puzzle that rewards simulating first and thinking second. There are <code>n</code> lockers in a row, numbered
<b>1 to n</b>, all closed. You walk past them <code>n</code> times. On pass <code>i</code> (i = 1, 2, …, n) you
<b>toggle</b> lockers i, 2i, 3i, … (open ones close, closed ones open). So pass 1 opens every locker, pass 2 flips the even ones back, and so on.</p>
<p><b>Task.</b> Return the numbers of the lockers that are <b>open</b> after the last pass, in increasing order.</p>
<ul>
<li><b>Input:</b> an integer <code>1 ≤ n ≤ 500</code>.</li>
<li><b>Output:</b> a list of locker numbers (1-based), e.g. <code>[1, 4, 9]</code> for n = 10.</li>
</ul>
<p><b>Efficiency:</b> each pass should jump straight from locker i to 2i to 3i… — don't scan all n lockers on every pass.
The grader checks your work grows no faster than about n log n. (Then look at your answers: what do the open numbers have in common?)</p>`,
  entry: "Lockers",
  params: ["n"],
  tests: [
    { args: [10], expect: [1, 4, 9], explain: "Locker 6 is toggled on passes 1, 2, 3, 6 (4 times → closed); locker 9 on passes 1, 3, 9 (3 times → open)." },
    { args: [1], expect: [1], explain: "One locker, one pass: it gets opened." },
    { args: [3], expect: [1], explain: "Lockers 2 and 3 are opened on pass 1 and closed again on their own pass." },
    { args: [4], expect: [1, 4], name: "n = 4" },
    { args: [16], expect: [1, 4, 9, 16], name: "Last locker ends open" },
    { args: [50], expect: [1, 4, 9, 16, 25, 36, 49], name: "n = 50" },
    { args: [100], expect: [1, 4, 9, 16, 25, 36, 49, 64, 81, 100], name: "The classic 100 lockers" },
  ],
  random: { count: 15, gen: (r, i) => [r.int(1, 400)] },
  reference: (n) => { const out = []; for (let k = 1; k * k <= n; k++) out.push(k * k); return out; },
  growth: { metric: "steps", sizes: [64, 128, 256, 512, 1024], gen: (r, n) => [n], expect: "n log n" },
  mutants: [
    { fn: (n) => { const out = []; for (let k = 1; k * k <= n; k++) out.push(k * k - 1); return out; }, hint: "Every answer is one less than it should be (0, 3, 8, …). Lockers are numbered from 1: if you used array index k for locker k + 1, convert back — or simply size the array n + 1 and use indexes 1..n." },
    { fn: (n) => { const out = []; let k = 1; for (let x = 1; x <= n; x++) { if (k * k === x) k++; else out.push(x); } return out; }, hint: "You're returning the CLOSED lockers. All doors start closed; a door ends open when it was toggled an odd number of times." },
    { fn: (n) => { const open = Array(n + 1).fill(false); for (let i = 1; i <= n; i++) for (let j = 1; j <= n; j += i) open[j] = !open[j]; const out = []; for (let k = 1; k <= n; k++) if (open[k]) out.push(k); return out; }, hint: "Pass i should toggle lockers i, 2i, 3i, … — it looks like your pass starts at locker 1 (1, 1 + i, 1 + 2i, …). Start the inner loop at j ← i." },
  ],
  hints: [
    "Simulate with an array of true/false flags, one per locker. On pass i, which locker numbers exactly get toggled?",
    "Use isOpen ← array(n + 1, false) so locker k lives at index k. For i ← 1 to n, walk j = i, 2i, 3i, … ≤ n and flip isOpen[j]. Then collect every k with isOpen[k].",
    "Flip with isOpen[j] ← not isOpen[j], and step with j ← j + i inside while j ≤ n.",
  ],
  starter: {
    pseudo: `ALGORITHM Lockers(n)
    // Output: numbers of the lockers that are open after n passes
    isOpen ← array(n + 1, false)
    for i ← 1 to n do
        j ← i
        while j ≤ n do
            ...      // toggle locker j, then jump to the next multiple of i
    L ← []
    ...              // collect the open lockers 1..n
    return L`,
    js: `function Lockers(n) {
  const isOpen = new Array(n + 1).fill(false);
  // pass i toggles lockers i, 2i, 3i, ...
}`,
  },
  solution: {
    pseudo: `ALGORITHM Lockers(n)
    isOpen ← array(n + 1, false)
    for i ← 1 to n do
        j ← i
        while j ≤ n do
            isOpen[j] ← not isOpen[j]
            j ← j + i
    L ← []
    for k ← 1 to n do
        if isOpen[k] then
            append(L, k)
    return L`,
    js: `function Lockers(n) {
  const isOpen = new Array(n + 1).fill(false);
  for (let i = 1; i <= n; i++)
    for (let j = i; j <= n; j += i) isOpen[j] = !isOpen[j];
  const L = [];
  for (let k = 1; k <= n; k++) if (isOpen[k]) L.push(k);
  return L;
}`,
    python: `def lockers(n):
    is_open = [False] * (n + 1)
    for i in range(1, n + 1):
        for j in range(i, n + 1, i):
            is_open[j] = not is_open[j]
    return [k for k in range(1, n + 1) if is_open[k]]`,
    explain: "Locker k is toggled once for each divisor of k. Divisors pair up (d with k/d) except when k is a perfect square, so only squares are toggled an odd number of times and stay open: the answer is 1, 4, 9, …, ⌊√n⌋². The simulation makes Σ_{i=1}^{n} ⌊n/i⌋ ≈ n ln n toggles, Θ(n log n); the insight gives Θ(√n).",
  },
  distractors: ["j ← 1", "for j ← 1 to n do", "isOpen ← array(n, false)"],
  followUp: "Now that you know the answer is the perfect squares, return them directly in Θ(√n) — and ⌊√n⌋ is how many are open. Simulating to discover a pattern, then proving it, is exactly how algorithm designers work.",
  complexity: "Θ(n log n) toggles by simulation; Θ(√n) with the insight",
  visual: "sims/euclid-gcd.html",
  lesson: "lessons/01-introduction/README.md",
});

/* ------------------------------------------------------------------ */
/* Level 1 · counting basic operations                                 */
/* ------------------------------------------------------------------ */

ForgeProblems.add({
  id: "element-uniqueness-brute",
  title: "Are All Elements Distinct? (Brute Force)",
  level: 1, chapter: 2, difficulty: 1,
  topics: ["arrays", "nested loops", "worst case", "summations"],
  strategy: "Brute force: compare every pair once",
  source: "Levitin §2.3, Example 2",
  summary: "Check every pair i < j once; return false at the first duplicate. At most n(n−1)/2 comparisons.",
  statement: `
<p>“Are there any duplicates?” is the <b>element uniqueness problem</b>. The brute-force answer compares every pair of
elements. It is the textbook example of analyzing a <b>nested loop</b> with a sum (Levitin §2.3), and of a worst case that
is not the obvious one.</p>
<p><b>Task.</b> Return <code>true</code> if all elements of <code>A[0..n-1]</code> are distinct, and <code>false</code> if some
value appears twice or more.</p>
<ul>
<li><b>Input:</b> <code>0 ≤ n ≤ 60</code> integers.</li>
<li><b>Output:</b> <code>true</code> or <code>false</code>.</li>
</ul>
<p><b>Efficiency:</b> the grader counts element comparisons: each <b>unordered pair</b> may be compared at most once, so the
limit is <code>n(n − 1)/2</code>. No sorting, no sets or maps — the point is to count the brute-force work.</p>`,
  entry: "UniqueElements",
  params: ["A"],
  tests: [
    { args: [[3, 1, 4, 5]], expect: true, explain: "All four values differ: every one of the 6 pairs gets checked." },
    { args: [[3, 1, 4, 1]], expect: false, explain: "1 appears twice (positions 1 and 3)." },
    { args: [[]], expect: true, explain: "No elements, no duplicates." },
    { args: [[8]], expect: true, name: "One element" },
    { args: [[4, 4]], expect: false, name: "Two equal elements" },
    { args: [[1, 2, 3, 3]], expect: false, name: "Only the LAST pair is equal" },
    { args: [[1, 2, 1]], expect: false, name: "Duplicates that are not neighbors" },
    { args: [[5, 5, 1, 2]], expect: false, name: "First pair equal (you can stop at once)" },
  ],
  random: { count: 25, gen: (r, i) => { const n = 2 + (i % 18); return [i % 2 ? r.distinct(n, -50, 50) : r.array(n, 0, 3 * n)]; } },
  reference: (A) => new Set(A).size === A.length,
  forbid: ["sorted", "set", "map", "contains"],
  budget: { metric: "keyComparisons", label: "element comparisons", limit: (A) => (A.length * (A.length - 1)) / 2, hint: "Compare each unordered pair once: for i from 0 to n − 2, let j run from i + 1 to n − 1. Starting j at 0 compares every pair twice (and each element with itself)." },
  mutants: [
    { fn: (A) => A.length <= 1, hint: "Every array with 2+ elements comes out 'not unique'. You're probably comparing an element with ITSELF (j starting at i or at 0). Start j at i + 1." },
    { fn: (A) => { const n = A.length; for (let i = 0; i <= n - 3; i++) for (let j = i + 1; j < n; j++) if (A[i] === A[j]) return false; return true; }, hint: "A duplicate in the last two positions is missed. The outer loop must reach i = n − 2 so the pair (n − 2, n − 1) is checked." },
    { fn: (A) => { for (let i = 0; i + 1 < A.length; i++) if (A[i] === A[i + 1]) return false; return true; }, hint: "You only compare NEIGHBORS. That works for sorted arrays, but here duplicates can be far apart, like [1, 2, 1]. Compare every pair (i, j) with i < j." },
    { fn: (A) => (A.length < 2 ? true : A[0] !== A[1]), hint: "Your answer depends only on the first pair — it looks like you return true inside the loops as soon as one pair differs. You can only say 'all distinct' after ALL pairs were checked, i.e. after the loops." },
  ],
  hints: [
    "How many different pairs of positions does an array of n elements have? Write them out for n = 4 — which pairs would a double loop visit twice?",
    "Outer loop i from 0 to n − 2, inner loop j from i + 1 to n − 1. If A[i] = A[j], you know the answer immediately.",
    "Inside: if A[i] = A[j] then return false. After both loops finish: return true.",
  ],
  starter: {
    pseudo: `ALGORITHM UniqueElements(A[0..n-1])
    // Output: true if all elements are distinct, false otherwise
    for i ← 0 to n - 2 do
        for j ← ... do
            ...
    return ...`,
    js: `function UniqueElements(A) {
  // compare every pair i < j exactly once
}`,
  },
  solution: {
    pseudo: `ALGORITHM UniqueElements(A[0..n-1])
    for i ← 0 to n - 2 do
        for j ← i + 1 to n - 1 do
            if A[i] = A[j] then
                return false
    return true`,
    js: `function UniqueElements(A) {
  for (let i = 0; i < A.length - 1; i++)
    for (let j = i + 1; j < A.length; j++)
      if (A[i] === A[j]) return false;
  return true;
}`,
    python: `def unique_elements(A):
    n = len(A)
    for i in range(n - 1):
        for j in range(i + 1, n):
            if A[i] == A[j]:
                return False
    return True`,
    explain: "Worst case — all distinct, or only the last two equal — checks every pair: C_worst(n) = Σ_{i=0}^{n-2} Σ_{j=i+1}^{n-1} 1 = Σ_{i=0}^{n-2} (n − 1 − i) = n(n − 1)/2 ∈ Θ(n²).",
  },
  distractors: ["for j ← 0 to n - 1 do", "for j ← i to n - 1 do", "else return true"],
  followUp: "Presort first (Θ(n log n)) and then only neighbors need comparing — Levitin §6.1's transform-and-conquer version; with a hash set it is Θ(n) expected, which is what a production system would use.",
  complexity: "Worst case n(n − 1)/2 comparisons, Θ(n²)",
  visual: "sims/growth-rates.html",
  lesson: "lessons/02-analysis-framework/README.md",
});

ForgeProblems.add({
  id: "min-distance-pairs",
  title: "Closest Two Numbers (Improve the Brute Force)",
  level: 1, chapter: 1, difficulty: 1,
  topics: ["arrays", "nested loops", "counting operations", "code improvement"],
  strategy: "Brute force, done carefully",
  source: "Levitin Exercise 1.2.9 (adapted) · Problem Set 1, Problem 2",
  summary: "Return the smallest |A[i] − A[j]| over all pairs, using each pair only once.",
  statement: `
<p>Levitin Exercise 1.2.9 gives a working but wasteful algorithm for the distance between the two closest numbers in an
array. Rewritten in our pseudocode, it looks like this:</p>
<pre>dmin ← ∞
for i ← 0 to n − 1 do
    for j ← 0 to n − 1 do
        if i ≠ j and |A[i] − A[j]| &lt; dmin then
            dmin ← |A[i] − A[j]|
return dmin</pre>
<p>It checks every pair <b>twice</b> (as (i, j) and as (j, i)), tests <code>i ≠ j</code> n² times, and computes the same
absolute difference twice when it updates. <b>Your job: improve it.</b></p>
<ul>
<li><b>Input:</b> <code>2 ≤ n ≤ 50</code> <b>distinct</b> integers, in any order.</li>
<li><b>Output:</b> <code>min |A[i] − A[j]|</code> over all <code>i ≠ j</code>.</li>
</ul>
<p><b>Efficiency:</b> the grader counts <b>all</b> comparisons (<code>&lt;</code>, <code>≠</code>, …) your pseudocode evaluates; the
limit is <code>n(n − 1)/2</code> — one per unordered pair. The original makes about 2n².</p>`,
  entry: "MinDistance",
  params: ["A"],
  tests: [
    { args: [[3, 9, 14, 20, 7]], expect: 2, explain: "|9 − 7| = 2 is the smallest gap; the closest pair need not be neighbors in the array." },
    { args: [[10, 4]], expect: 6, explain: "Only one pair: |10 − 4| = 6." },
    { args: [[1, 100, 50, 49]], expect: 1, explain: "The closest pair (50, 49) is at the end." },
    { args: [[-5, 5, 17]], expect: 10, name: "Negatives" },
    { args: [[40, 1, 22, 3]], expect: 2, name: "Closest pair is far apart in the array" },
    { args: [[8, 2, 30, 14, 25]], expect: 5, name: "Unsorted" },
  ],
  random: { count: 25, gen: (r, i) => [r.distinct(2 + (i % 16) * 2, -200, 200)] },
  reference: (A) => { let d = Infinity; for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) d = Math.min(d, Math.abs(A[i] - A[j])); return d; },
  budget: { metric: "comparisons", label: "comparisons", limit: (A) => (A.length * (A.length - 1)) / 2, hint: "Consider each unordered pair once (j from i + 1), which also makes the i ≠ j test unnecessary. Store |A[i] − A[j]| in a temporary so you compute it once, and compare it with dmin once: n(n − 1)/2 comparisons in all." },
  mutants: [
    { fn: () => 0, hint: "You always get 0 — an element is being compared with itself (|A[i] − A[i]| = 0). If j starts at i + 1 you never pair an element with itself." },
    { fn: (A) => { let d = Infinity; for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) d = Math.min(d, A[i] - A[j]); return d; }, hint: "Negative answers mean the absolute value went missing: a distance is |A[i] − A[j]|, never negative." },
    { fn: (A) => { let d = Infinity; for (let i = 0; i + 1 < A.length; i++) d = Math.min(d, Math.abs(A[i] - A[i + 1])); return d; }, hint: "You only compare NEIGHBORS. That's the right idea after sorting the array, but here it's unsorted: the closest two numbers can be anywhere." },
  ],
  hints: [
    "In the original, how many times is the pair {A[2], A[5]} examined? What loop bounds would make each pair appear exactly once?",
    "Loop i from 0 to n − 2 and j from i + 1 to n − 1. Compute the distance once into a temporary, then compare with dmin.",
    "Body: temp ← |A[i] − A[j]|; if temp < dmin then dmin ← temp.",
  ],
  starter: {
    pseudo: `ALGORITHM MinDistance(A[0..n-1])
    // The wasteful original — improve it!
    dmin ← ∞
    for i ← 0 to n - 1 do
        for j ← 0 to n - 1 do
            if i ≠ j and |A[i] - A[j]| < dmin then
                dmin ← |A[i] - A[j]|
    return dmin`,
    js: `function MinDistance(A) {
  let dmin = Infinity;
  // look at each pair i < j exactly once
  return dmin;
}`,
  },
  solution: {
    pseudo: `ALGORITHM MinDistance(A[0..n-1])
    dmin ← ∞
    for i ← 0 to n - 2 do
        for j ← i + 1 to n - 1 do
            temp ← |A[i] - A[j]|
            if temp < dmin then
                dmin ← temp
    return dmin`,
    js: `function MinDistance(A) {
  let dmin = Infinity;
  for (let i = 0; i < A.length - 1; i++)
    for (let j = i + 1; j < A.length; j++) {
      const temp = Math.abs(A[i] - A[j]);
      if (temp < dmin) dmin = temp;
    }
  return dmin;
}`,
    python: `def min_distance(A):
    dmin = float("inf")
    for i in range(len(A) - 1):
        for j in range(i + 1, len(A)):
            temp = abs(A[i] - A[j])
            if temp < dmin:
                dmin = temp
    return dmin`,
    explain: "Distance is symmetric, so pairs (i, j) and (j, i) are the same and i = j is useless: looping j from i + 1 visits each unordered pair once, C(n) = Σ_{i=0}^{n-2} (n − 1 − i) = n(n − 1)/2 — half the original's work, but still Θ(n²).",
  },
  distractors: ["for j ← 0 to n - 1 do", "if i ≠ j and temp < dmin then", "temp ← A[i] - A[j]"],
  followUp: "Change the algorithm altogether: sort first, then the closest pair must be neighbors in sorted order — Θ(n log n) total (Levitin §6.1 presorting). In 2-D the same idea becomes the divide-and-conquer closest-pair algorithm.",
  complexity: "n(n − 1)/2 comparisons, Θ(n²); Θ(n log n) with presorting",
  visual: "sims/growth-rates.html",
  lesson: "lessons/01-introduction/README.md",
});

ForgeProblems.add({
  id: "mystery-sum-of-squares",
  title: "The Mystery Loop, Made Instant",
  level: 1, chapter: 2, difficulty: 1,
  topics: ["analysis", "summations", "closed forms"],
  strategy: "Replace a loop by a formula",
  source: "Levitin Exercise 2.3.4 (idea)",
  summary: "A loop computes 1² + 2² + … + n². Compute the same value with a constant number of operations.",
  statement: `
<p>Here is a small “mystery” algorithm in the spirit of Levitin Exercise 2.3.4:</p>
<pre>S ← 0
for i ← 1 to n do
    S ← S + i * i
return S</pre>
<p>Trace it for n = 3 to see what it computes. Its basic operation (the multiplication) runs n times — Θ(n). A good
analyst asks: <b>can we do better?</b></p>
<p><b>Task.</b> Write <code>SumSquares(n)</code> that returns the same value using only a <b>constant</b> number of
operations, no matter how big n is.</p>
<ul>
<li><b>Input:</b> an integer <code>0 ≤ n ≤ 100 000</code>.</li>
<li><b>Output:</b> the value the mystery loop returns.</li>
</ul>
<p><b>Efficiency:</b> the grader checks that your step count does <b>not</b> grow with n — the loop itself will not pass.</p>`,
  entry: "SumSquares",
  params: ["n"],
  tests: [
    { args: [3], expect: 14, explain: "1 + 4 + 9 = 14 — the loop adds the squares." },
    { args: [0], expect: 0, explain: "The loop doesn't run: the answer is 0." },
    { args: [1], expect: 1, explain: "Just 1² = 1." },
    { args: [10], expect: 385, name: "n = 10" },
    { args: [100], expect: 338350, name: "n = 100" },
    { args: [100000], expect: 333338333350000, name: "Largest allowed — still instant" },
  ],
  random: { count: 20, gen: (r, i) => [r.int(0, 100000)] },
  reference: (n) => (n * (n + 1) * (2 * n + 1)) / 6,
  growth: { metric: "steps", sizes: [1000, 2000, 4000, 8000, 16000], gen: (r, n) => [n], expect: "1" },
  mutants: [
    { fn: (n) => (n * (n + 1)) / 2, hint: "That's 1 + 2 + … + n, the sum of the numbers themselves. The mystery loop adds their SQUARES." },
    { fn: (n) => (n * (n + 1) * (2 * n + 1)) / 3, hint: "You're exactly twice the right value — check the constant in the denominator of your formula (test it on n = 1, where the answer must be 1)." },
    { fn: (n) => ((n - 1) * n * (2 * n - 1)) / 6, hint: "You're one term short (n² is missing): that formula sums the squares from 1 to n − 1. Check your answer for n = 1." },
  ],
  lints: [
    { re: "\\bfor\\b|\\bwhile\\b|\\brepeat\\b", lang: "any", message: "Any loop that runs up to n makes Θ(n) steps. The goal is a closed-form formula: Σ_{i=1}^{n} i² equals a cubic polynomial in n." },
  ],
  hints: [
    "Compute the loop's answers for n = 1, 2, 3, 4: 1, 5, 14, 30. There is a famous formula for Σ i² (Levitin Appendix A lists it). What degree must it have?",
    "The formula is a product of three simple factors in n divided by a constant. Check your guess on n = 1 and n = 2.",
    "The formula is n(n + 1)(2n + 1) divided by a small constant. Plug in n = 1 (answer 1) to find the constant.",
  ],
  starter: {
    pseudo: `ALGORITHM SumSquares(n)
    // Same answer as the mystery loop, but in Θ(1)
    return ...`,
    js: `function SumSquares(n) {
  // no loops: use a formula
}`,
  },
  solution: {
    pseudo: `ALGORITHM SumSquares(n)
    return n * (n + 1) * (2 * n + 1) / 6`,
    js: `function SumSquares(n) {
  return n * (n + 1) * (2 * n + 1) / 6;
}`,
    python: `def sum_squares(n):
    return n * (n + 1) * (2 * n + 1) // 6`,
    explain: "The mystery loop computes S(n) = Σ_{i=1}^{n} i² with n multiplications and n additions — Θ(n). The identity Σ i² = n(n + 1)(2n + 1)/6 (provable by induction) needs a fixed handful of operations: Θ(1). One of n(n + 1) is even and one of n, n + 1, 2n + 1 is divisible by 3, so the division is exact.",
  },
  distractors: ["return n * (n + 1) / 2", "for i ← 1 to n do", "return n * (n + 1) * (2 * n + 1) / 3"],
  followUp: "For huge n the product overflows 64-bit integers long before the answer does: divide early (by 2 and 3 on whichever factor is divisible) — the kind of detail that separates a correct formula from correct software.",
  complexity: "Θ(1) (the loop was Θ(n))",
  visual: "sims/growth-rates.html",
  lesson: "lessons/02-analysis-framework/README.md",
});

ForgeProblems.add({
  id: "binary-digits-recursive",
  title: "Count Binary Digits Recursively (BinRec)",
  level: 1, chapter: 2, difficulty: 1,
  topics: ["recursion", "recurrences", "logarithms", "binary"],
  strategy: "Decrease-by-a-constant-factor (halve n)",
  source: "Levitin §2.4, Example 3",
  summary: "Return the number of binary digits of n by recursing on ⌊n/2⌋: A(n) = A(⌊n/2⌋) + 1.",
  statement: `
<p>How many bits does it take to write n in binary? Chopping off the last bit is the same as halving:
<code>n</code> has exactly one more binary digit than <code>⌊n/2⌋</code> (for n ≥ 2). This gives a recursive algorithm whose call
count is a <b>logarithm</b> — the first recurrence with a halving step you'll solve (Levitin §2.4).</p>
<p><b>Task.</b> Write <code>BinRec(n)</code> recursively (a loop would pass too, but the recurrence is the lesson): return the number of digits in the binary representation of n.</p>
<ul>
<li><b>Input:</b> an integer <code>1 ≤ n ≤ 10<sup>9</sup></code>.</li>
<li><b>Output:</b> the digit count, e.g. 3 for n = 5 (binary 101).</li>
</ul>
<p><b>Rules:</b> no logarithm built-ins (<code>log2</code>, <code>lg</code>, <code>log</code>, <code>ln</code>). At most
<code>⌊log₂ n⌋ + 1</code> calls, and your work must grow like log n.</p>`,
  entry: "BinRec",
  params: ["n"],
  tests: [
    { args: [5], expect: 3, explain: "5 = 101 in binary: 3 digits. BinRec(5) = BinRec(2) + 1 = BinRec(1) + 2 = 3." },
    { args: [1], expect: 1, explain: "1 = 1 in binary: one digit — the base case." },
    { args: [8], expect: 4, explain: "8 = 1000: a power of two gets a new digit." },
    { args: [7], expect: 3, name: "7 = 111, just below a power of two" },
    { args: [2], expect: 2, name: "2 = 10" },
    { args: [1023], expect: 10, name: "2¹⁰ − 1" },
    { args: [1024], expect: 11, name: "2¹⁰" },
    { args: [1000000000], expect: 30, name: "A billion" },
  ],
  random: { count: 25, gen: (r, i) => [i % 3 === 0 ? 2 ** r.int(0, 29) : r.int(1, 2 ** r.int(1, 30))] },
  reference: (n) => n.toString(2).length,
  forbid: ["log2", "lg", "log", "ln", "log₂"],
  budget: { metric: "calls", label: "calls", limit: (n) => Math.floor(Math.log2(n)) + 1, hint: "Each call should make exactly ONE recursive call, on ⌊n/2⌋. From n down to 1 that's ⌊log₂ n⌋ + 1 calls in total." },
  growth: { metric: "steps", sizes: [16, 256, 4096, 65536, 1048576], gen: (r, n) => [n + r.int(0, n - 1)], expect: "log n" },
  mutants: [
    { fn: (n) => n.toString(2).length - 1, hint: "Every answer is one too small. The base case BinRec(1) must return 1 (the number 1 has one binary digit), not 0." },
    { fn: (n) => { let c = 1; while (n > 1) { n = Math.ceil(n / 2); c++; } return c; }, hint: "Some answers are one too big (5 gives 4). Halve with ⌊n/2⌋ (round DOWN): dropping the last bit of 101 leaves 10 = 2, not 3." },
    { fn: (n) => n, hint: "Your answer equals n itself — the recursion is going down by 1 (n − 1) instead of halving. Recurse on ⌊n/2⌋." },
  ],
  hints: [
    "Write 13 in binary (1101) and ⌊13/2⌋ = 6 in binary (110). What is the relationship between their digit counts?",
    "Base case: n = 1 has one digit. Otherwise the answer is one more than the answer for ⌊n/2⌋.",
    "The recursive case is BinRec(⌊n/2⌋) + 1. What must the base case n = 1 return so that BinRec(2) = 2?",
  ],
  starter: {
    pseudo: `ALGORITHM BinRec(n)
    // Output: number of binary digits of n (n ≥ 1), computed recursively
    if n = 1 then
        return ...
    else
        return ...`,
    js: `function BinRec(n) {
  if (n === 1) return /* ... */;
  // recurse on Math.floor(n / 2)
}`,
  },
  solution: {
    pseudo: `ALGORITHM BinRec(n)
    if n = 1 then
        return 1
    else
        return BinRec(⌊n/2⌋) + 1`,
    js: `function BinRec(n) {
  if (n === 1) return 1;
  return BinRec(Math.floor(n / 2)) + 1;
}`,
    python: `def bin_rec(n):
    if n == 1:
        return 1
    return bin_rec(n // 2) + 1`,
    explain: "The additions satisfy A(n) = A(⌊n/2⌋) + 1, A(1) = 0. For n = 2ᵏ backward substitution gives A(2ᵏ) = A(2ᵏ⁻¹) + 1 = … = A(1) + k = k, so A(n) = log₂ n; the smoothness rule extends it to A(n) = ⌊log₂ n⌋ ∈ Θ(log n), and the answer is ⌊log₂ n⌋ + 1.",
  },
  distractors: ["return BinRec(n - 1) + 1", "return BinRec(⌈n/2⌉) + 1", "return 0"],
  followUp: "Real processors answer this in one count-leading-zeros (CLZ) instruction; Java's Integer.numberOfLeadingZeros and C++20's std::bit_width expose it. Knowing the recurrence tells you why a binary search has ⌊log₂ n⌋ + 1 levels too.",
  complexity: "⌊log₂ n⌋ additions, ⌊log₂ n⌋ + 1 calls: Θ(log n)",
  visual: "sims/recurrence-lab.html",
  lesson: "lessons/02-analysis-framework/README.md",
});

ForgeProblems.add({
  id: "comparison-counting-sort",
  title: "Comparison Counting Sort",
  level: 1, chapter: 1, difficulty: 2,
  topics: ["sorting", "nested loops", "counting operations", "stability"],
  strategy: "Count smaller elements, then place",
  source: "Levitin §7.1 · Exercise 1.3.1 (adapted) · Problem Set 1, Problem 3",
  summary: "For each element count how many are smaller; that count is its position in the sorted output.",
  statement: `
<p>A sort that never moves anything until the very end: for every element, <b>count how many elements are smaller</b> than
it. If 3 elements are smaller than <code>x</code>, then <code>x</code> belongs at index 3 of the sorted array (Levitin §7.1).</p>
<p>To make ties work, compare each <b>pair once</b> (i &lt; j): if <code>A[i] &lt; A[j]</code> add 1 to <code>Count[j]</code>,
otherwise add 1 to <code>Count[i]</code>. Then copy each <code>A[i]</code> into <code>S[Count[i]]</code>.</p>
<p><b>Task.</b> Return a new array <code>S</code> containing the elements of <code>A</code> in nondecreasing order, using this method.</p>
<ul>
<li><b>Input:</b> <code>0 ≤ n ≤ 40</code> integers (duplicates possible).</li>
<li><b>Output:</b> the sorted array.</li>
</ul>
<p><b>Efficiency:</b> exactly one element comparison per pair — at most <code>n(n − 1)/2</code>. No built-in <code>sorted</code>.</p>`,
  entry: "ComparisonCountingSort",
  params: ["A"],
  tests: [
    { args: [[60, 35, 81, 98, 14, 47]], expect: [14, 35, 47, 60, 81, 98], explain: "The exercise's list: Count = [3, 1, 4, 5, 0, 2], so 60 goes to S[3], 35 to S[1], …" },
    { args: [[3, 1, 3, 2]], expect: [1, 2, 3, 3], explain: "Two 3s: the pair rule gives them different counts (2 and 3), so neither overwrites the other." },
    { args: [[]], expect: [], explain: "Nothing to sort." },
    { args: [[7]], expect: [7], name: "One element" },
    { args: [[2, 2, 2]], expect: [2, 2, 2], name: "All equal" },
    { args: [[5, 4, 3, 2, 1]], expect: [1, 2, 3, 4, 5], name: "Reversed" },
    { args: [[-1, 4, -1, 0]], expect: [-1, -1, 0, 4], name: "Negatives and a tie" },
  ],
  random: { count: 25, gen: (r, i) => [r.array(1 + (i % 14) * 2, -9, 9)] },
  reference: (A) => A.slice().sort((x, y) => x - y),
  forbid: ["sorted"],
  budget: { metric: "keyComparisons", label: "element comparisons", limit: (A) => (A.length * (A.length - 1)) / 2, hint: "Loop i from 0 to n − 2 and j from i + 1 to n − 1, and let ONE comparison A[i] < A[j] update either Count[j] or Count[i]. That's exactly n(n − 1)/2 comparisons." },
  mutants: [
    { fn: (A) => { const n = A.length, cnt = Array(n).fill(0), S = Array(n).fill(0); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (A[j] < A[i]) cnt[i]++; for (let i = 0; i < n; i++) S[cnt[i]] = A[i]; return S; }, hint: "With duplicates a value goes missing and a leftover 0 appears: equal elements get the SAME count and land on the same slot. Use the pair rule — each pair (i < j) adds 1 to exactly one of Count[i], Count[j] — so ties get different positions." },
    { fn: (A) => A.slice().sort((x, y) => y - x), hint: "Your output is sorted from largest to smallest. When A[i] < A[j], it is A[j] that has one more smaller element — increment Count[j], not Count[i]." },
    { fn: (A) => { const n = A.length, cnt = Array(n).fill(0), S = Array(n).fill(0); for (let i = 0; i < n - 1; i++) for (let j = i + 1; j < n; j++) { if (A[i] < A[j]) cnt[j]++; else cnt[i]++; } for (let i = 0; i < n; i++) S[i] = A[cnt[i]]; return S; }, hint: "The counts look right but the placement is inverted: Count[i] is where A[i] GOES, so write S[Count[i]] ← A[i] (not S[i] ← A[Count[i]])." },
  ],
  hints: [
    "If exactly k elements are smaller than x (and ties are broken consistently), at which index of the sorted array must x be placed?",
    "Phase 1: Count ← array(n, 0); for each pair i < j compare A[i] with A[j] once and add 1 to the count of the larger one (for a tie, to Count[i]). Phase 2: S[Count[i]] ← A[i] for every i.",
    "Inner body: if A[i] < A[j] then Count[j] ← Count[j] + 1 else Count[i] ← Count[i] + 1.",
  ],
  starter: {
    pseudo: `ALGORITHM ComparisonCountingSort(A[0..n-1])
    // Sort by counting, for each element, how many elements are smaller
    Count ← array(n, 0)
    S ← array(n, 0)
    for i ← 0 to n - 2 do
        for j ← i + 1 to n - 1 do
            ...      // one comparison, one Count update
    for i ← 0 to n - 1 do
        ...          // put A[i] in its final place
    return S`,
    js: `function ComparisonCountingSort(A) {
  const n = A.length, Count = new Array(n).fill(0), S = new Array(n).fill(0);
  // count, then place
  return S;
}`,
  },
  solution: {
    pseudo: `ALGORITHM ComparisonCountingSort(A[0..n-1])
    Count ← array(n, 0)
    S ← array(n, 0)
    for i ← 0 to n - 2 do
        for j ← i + 1 to n - 1 do
            if A[i] < A[j] then
                Count[j] ← Count[j] + 1
            else
                Count[i] ← Count[i] + 1
    for i ← 0 to n - 1 do
        S[Count[i]] ← A[i]
    return S`,
    js: `function ComparisonCountingSort(A) {
  const n = A.length, Count = new Array(n).fill(0), S = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++)
    for (let j = i + 1; j < n; j++) {
      if (A[i] < A[j]) Count[j]++; else Count[i]++;
    }
  for (let i = 0; i < n; i++) S[Count[i]] = A[i];
  return S;
}`,
    python: `def comparison_counting_sort(A):
    n = len(A)
    count, S = [0] * n, [0] * n
    for i in range(n - 1):
        for j in range(i + 1, n):
            if A[i] < A[j]:
                count[j] += 1
            else:
                count[i] += 1
    for i in range(n):
        S[count[i]] = A[i]
    return S`,
    explain: "Each pair contributes exactly one increment, to the element that goes later, so the counts are a permutation of 0..n − 1 and each count is a final position. C(n) = Σ_{i=0}^{n-2} Σ_{j=i+1}^{n-1} 1 = n(n − 1)/2 comparisons, Θ(n²), for every input. It uses two extra arrays (not in place) and puts equal elements in reverse order (not stable).",
  },
  distractors: ["Count[i] ← Count[j] + 1", "S[i] ← A[Count[i]]", "for j ← 0 to n - 1 do"],
  followUp: "When keys are small integers in a known range [l, u], count how many times each VALUE occurs instead — distribution counting sort runs in Θ(n + u − l) with no comparisons at all (Levitin §7.1), and it is the stable inner step of radix sort.",
  complexity: "n(n − 1)/2 comparisons, Θ(n²); Θ(n) extra space",
  visual: "sims/sorting-studio.html",
  lesson: "lessons/01-introduction/README.md",
});

ForgeProblems.add({
  id: "matrix-multiply",
  title: "Matrix Multiplication (Definition-Based)",
  level: 1, chapter: 2, difficulty: 2,
  topics: ["matrices", "nested loops", "summations", "counting operations"],
  strategy: "Brute force from the definition",
  source: "Levitin §2.3, Example 3",
  summary: "Multiply a p×q matrix by a q×r matrix with three nested loops; count the multiplications.",
  statement: `
<p>Matrix multiplication powers graphics, physics simulations and every neural network. The definition says entry
<code>C[i, j]</code> is the <b>dot product</b> of row i of A with column j of B:</p>
<pre>C[i, j] = A[i, 0]·B[0, j] + A[i, 1]·B[1, j] + … + A[i, q−1]·B[q−1, j]</pre>
<p><b>Task.</b> Given a <code>p × q</code> matrix <code>A</code> and a <code>q × r</code> matrix <code>B</code>, return the
<code>p × r</code> matrix <code>C = AB</code>.</p>
<ul>
<li><b>Input:</b> matrices as lists of rows, e.g. <code>[[1, 2], [3, 4]]</code>; <code>1 ≤ p, q, r ≤ 6</code>.</li>
<li><b>Output:</b> C as a list of rows. <code>matrix(p, r, 0)</code> creates a p × r matrix of zeros; write entries as <code>C[i, j]</code>.</li>
</ul>
<p>The header <code>A[0..p-1, 0..q-1]</code> binds <code>p</code> and <code>q</code> for you. The basic operation is the
multiplication; how many does your algorithm make?</p>`,
  entry: "MatrixMultiply",
  params: ["A", "B"],
  tests: [
    { args: [[[1, 2], [3, 4]], [[5, 6], [7, 8]]], expect: [[19, 22], [43, 50]], explain: "C[0, 0] = 1·5 + 2·7 = 19, C[0, 1] = 1·6 + 2·8 = 22, …" },
    { args: [[[1, 2, 3]], [[4], [5], [6]]], expect: [[32]], explain: "1×3 times 3×1 is a 1×1 matrix: the dot product 4 + 10 + 18 = 32." },
    { args: [[[2], [3]], [[1, 4]]], expect: [[2, 8], [3, 12]], explain: "2×1 times 1×2 is 2×2 (an 'outer product'): q = 1, one term per entry." },
    { args: [[[1, 0], [0, 1]], [[9, 8], [7, 6]]], expect: [[9, 8], [7, 6]], name: "Identity times B is B" },
    { args: [[[1, 2, 3], [4, 5, 6]], [[1, 0], [0, 1], [2, 2]]], expect: [[7, 8], [16, 17]], name: "2×3 times 3×2" },
    { args: [[[0, 1, 2], [3, 4, 5], [6, 7, 8]], [[1, 2, 0], [0, 1, 3], [4, 0, 1]]], expect: [[8, 1, 5], [23, 10, 17], [38, 19, 29]], name: "3×3, not symmetric" },
    { args: [[[5]], [[-3]]], expect: [[-15]], name: "1×1" },
  ],
  random: {
    count: 20,
    gen: (r, i) => {
      const p = r.int(1, 5), q = r.int(1, 5), s = r.int(1, 5);
      const M = (a, b) => Array.from({ length: a }, () => r.array(b, -5, 5));
      return i % 3 === 0 ? [M(p, p), M(p, p)] : [M(p, q), M(q, s)];
    },
  },
  reference: (A, B) => A.map((row) => B[0].map((_, j) => row.reduce((s, a, k) => s + a * B[k][j], 0))),
  mutants: [
    { fn: (A, B) => A.map((row) => B[0].map((_, j) => row[row.length - 1] * B[row.length - 1][j])), hint: "Each entry equals only the LAST product A[i, q−1]·B[q−1, j]. You're overwriting C[i, j] in the k-loop instead of adding to it: C[i, j] ← C[i, j] + A[i, k] * B[k, j]." },
    { fn: (A, B) => A.map((row, i) => B[0].map((_, j) => row.reduce((s, a, k) => s + a * ((B[j] || [])[k]), 0))), hint: "Square matrices come out as A times the TRANSPOSE of B (and other shapes break). Column j of B is B[0, j], B[1, j], …, B[q−1, j], so the index is B[k, j], not B[j, k]." },
    { fn: (A, B) => A.map((row, i) => row.map((a, j) => a * ((B[i] || [])[j]))), hint: "You're multiplying matching entries (A[i, j]·B[i, j]). Matrix multiplication needs a third loop over k: every entry of C is a sum of q products." },
  ],
  hints: [
    "Compute C[1, 0] for the first example by hand. Which row of A and which column of B did you use, and how many multiplications did it take?",
    "Three nested loops: i over the p rows of A, j over the r columns of B, and k over the q terms of the dot product. Start each C[i, j] at 0.",
    "Innermost line: C[i, j] ← C[i, j] + A[i, k] * B[k, j]",
  ],
  starter: {
    pseudo: `ALGORITHM MatrixMultiply(A[0..p-1, 0..q-1], B[0..q-1, 0..r-1])
    // Output: C = AB, a p × r matrix
    C ← matrix(p, r, 0)
    for i ← 0 to p - 1 do
        for j ← 0 to r - 1 do
            ...      // C[i, j] is a sum over k of q products
    return C`,
    js: `function MatrixMultiply(A, B) {
  const p = A.length, q = B.length, r = B[0].length;
  const C = Array.from({ length: p }, () => new Array(r).fill(0));
  // fill C[i][j]
  return C;
}`,
  },
  solution: {
    pseudo: `ALGORITHM MatrixMultiply(A[0..p-1, 0..q-1], B[0..q-1, 0..r-1])
    C ← matrix(p, r, 0)
    for i ← 0 to p - 1 do
        for j ← 0 to r - 1 do
            for k ← 0 to q - 1 do
                C[i, j] ← C[i, j] + A[i, k] * B[k, j]
    return C`,
    js: `function MatrixMultiply(A, B) {
  const p = A.length, q = B.length, r = B[0].length;
  const C = Array.from({ length: p }, () => new Array(r).fill(0));
  for (let i = 0; i < p; i++)
    for (let j = 0; j < r; j++)
      for (let k = 0; k < q; k++) C[i][j] += A[i][k] * B[k][j];
  return C;
}`,
    python: `def matrix_multiply(A, B):
    p, q, r = len(A), len(B), len(B[0])
    C = [[0] * r for _ in range(p)]
    for i in range(p):
        for j in range(r):
            for k in range(q):
                C[i][j] += A[i][k] * B[k][j]
    return C`,
    explain: "One multiplication per (i, j, k): M = Σ_{i=0}^{p-1} Σ_{j=0}^{r-1} Σ_{k=0}^{q-1} 1 = pqr. For square n × n matrices that is n³, so T(n) ≈ c_m·n³ + c_a·n³ ∈ Θ(n³) (Levitin §2.3).",
  },
  distractors: ["C[i, j] ← A[i, k] * B[k, j]", "C[i, j] ← C[i, j] + A[i, k] * B[j, k]", "for k ← 0 to r - 1 do"],
  followUp: "Strassen's divide-and-conquer trick uses 7 half-size products instead of 8, giving Θ(n^2.807) (Levitin §5.4). In practice the big win is cache behavior: loop order i-k-j or blocking can make the same n³ algorithm several times faster.",
  complexity: "pqr multiplications; Θ(n³) for n × n",
  visual: "sims/growth-rates.html",
  lesson: "lessons/02-analysis-framework/README.md",
});

ForgeProblems.add({
  id: "q-of-n",
  title: "Analyze Q(n): Value, Multiplications, Additions",
  level: 1, chapter: 2, difficulty: 2,
  topics: ["recursion", "recurrences", "counting operations", "backward substitution"],
  strategy: "Instrument the algorithm, then solve the recurrences",
  source: "Levitin Exercise 2.4.4 (adapted) · Problem Set 1, Problem 8",
  summary: "For the recursive Q(n) = Q(n − 1) + 2n − 1, return its value and exact operation counts.",
  statement: `
<p>Here is a small recursive algorithm (Levitin Exercise 2.4.4), in our pseudocode:</p>
<pre>ALGORITHM Q(n)
    if n = 1 then
        return 1
    else
        return Q(n - 1) + 2 * n - 1</pre>
<p>Analyzing a recursive algorithm means setting up a <b>recurrence</b> for each quantity and solving it. Let's make it concrete.</p>
<p><b>Task.</b> Write <code>QAnalysis(n)</code> that returns <code>[value, mults, addsubs]</code> where, for a call <code>Q(n)</code>:</p>
<ul>
<li><code>value</code> = the number Q(n) returns;</li>
<li><code>mults</code> = how many multiplications (<code>*</code>) are performed in total, over all recursive calls;</li>
<li><code>addsubs</code> = how many additions and subtractions are performed in total — <b>including</b> the <code>n − 1</code> in the recursive call.</li>
</ul>
<p>The comparison <code>n = 1</code> doesn't count. <b>Input:</b> <code>1 ≤ n ≤ 500</code>. You can literally add counters to Q
(variables assigned at the top of your program, outside any ALGORITHM, are shared by all calls) — or solve the recurrences and return formulas.</p>`,
  entry: "QAnalysis",
  params: ["n"],
  tests: [
    { args: [3], expect: [9, 2, 6], explain: "Q(3) = Q(2) + 5 = (Q(1) + 3) + 5 = 9. Calls Q(3) and Q(2) each do one * and three ± (n − 1, +, − 1)." },
    { args: [1], expect: [1, 0, 0], explain: "The base case does no arithmetic at all." },
    { args: [2], expect: [4, 1, 3], explain: "Q(2) = Q(1) + 2·2 − 1 = 4: one multiplication, three additions/subtractions." },
    { args: [5], expect: [25, 4, 12], name: "n = 5" },
    { args: [10], expect: [100, 9, 27], name: "n = 10" },
    { args: [100], expect: [10000, 99, 297], name: "n = 100" },
  ],
  random: { count: 20, gen: (r, i) => [r.int(1, 400)] },
  reference: (n) => [n * n, n - 1, 3 * (n - 1)],
  mutants: [
    { fn: (n) => [n * n, n - 1, 2 * (n - 1)], hint: "Your addition/subtraction count is 2 per call — you forgot the subtraction n − 1 that computes the argument of the recursive call. It counts too: 3 per call." },
    { fn: (n) => [n * n, n, 3 * n], hint: "Your counts include one call too many. The base case Q(1) just returns 1 with no arithmetic: the recurrences are M(n) = M(n − 1) + 1 with M(1) = 0, and C(n) = C(n − 1) + 3 with C(1) = 0." },
    { fn: (n) => (n === 1 ? [1, 0, 0] : [n * n, 1, 3]), hint: "Your counts stop at 1 and 3 — they only see the top call. Counters must survive across the recursion: declare them at the top of the program (outside the ALGORITHMs), or return counts from each call and add them up." },
  ],
  hints: [
    "Trace Q(3) on paper and tally every *, + and −. How much arithmetic does ONE non-base call do, and how many non-base calls are there?",
    "Recurrences: M(n) = M(n − 1) + 1 and C(n) = C(n − 1) + 3 for n > 1, with M(1) = C(1) = 0; and Q(n) = Q(n − 1) + 2n − 1 with Q(1) = 1. Compute Q(2), Q(3), Q(4) — recognize them?",
    "Backward substitution: M(n) = M(n − 1) + 1 = M(n − 2) + 2 = … = M(1) + (n − 1); do the same for C. Or instrument Q: in the recursive branch add 1 to a global mults and 3 to a global adds, then return [Q(n), mults, adds].",
  ],
  starter: {
    pseudo: `mults ← 0
adds ← 0

ALGORITHM Q(n)
    if n = 1 then
        return 1
    ...              // count this call's arithmetic
    return Q(n - 1) + 2 * n - 1

ALGORITHM QAnalysis(n)
    value ← Q(n)
    return [value, ..., ...]`,
    js: `let mults = 0, adds = 0;
function Q(n) {
  if (n === 1) return 1;
  // count this call's * and +/-
  return Q(n - 1) + 2 * n - 1;
}
function QAnalysis(n) {
  mults = 0; adds = 0;
  const value = Q(n);
  return [value /*, ... */];
}`,
  },
  solution: {
    pseudo: `mults ← 0
adds ← 0
ALGORITHM Q(n)
    if n = 1 then
        return 1
    mults ← mults + 1
    adds ← adds + 3
    return Q(n - 1) + 2 * n - 1
ALGORITHM QAnalysis(n)
    value ← Q(n)
    return [value, mults, adds]`,
    js: `let mults = 0, adds = 0;
function Q(n) {
  if (n === 1) return 1;
  mults += 1;
  adds += 3;
  return Q(n - 1) + 2 * n - 1;
}
function QAnalysis(n) {
  mults = 0; adds = 0;
  const value = Q(n);
  return [value, mults, adds];
}`,
    python: `def q_analysis(n):
    # closed forms from the recurrences
    return [n * n, n - 1, 3 * (n - 1)]`,
    explain: "Value: Q(n) = Q(n − 1) + 2n − 1, Q(1) = 1 → Q(n) = n² (the sum of the first n odd numbers; check: (n − 1)² + 2n − 1 = n²). Multiplications: M(n) = M(n − 1) + 1, M(1) = 0 → M(n) = n − 1. Additions/subtractions: C(n) = C(n − 1) + 3, C(1) = 0 → C(n) = 3(n − 1). All Θ(n).",
  },
  distractors: ["adds ← adds + 2", "if n = 0 then", "mults ← mults + 2"],
  followUp: "Q computes n² with Θ(n) work and Θ(n) stack — one multiplication n * n does it in Θ(1). Spotting that an algorithm's VALUE has a simple closed form is often the fastest optimization there is.",
  complexity: "M(n) = n − 1, C(n) = 3(n − 1): Θ(n)",
  visual: "sims/recurrence-lab.html",
  lesson: "lessons/02-analysis-framework/README.md",
});

ForgeProblems.add({
  id: "count-binary-ones",
  title: "Count the 1-Bits",
  level: 1, chapter: 2, difficulty: 2,
  topics: ["binary", "loops", "logarithms", "bit manipulation"],
  strategy: "Peel off the last bit, halve, repeat",
  source: "Levitin §2.3, Example 4 (variant)",
  summary: "Return how many 1s appear in the binary representation of n, in Θ(log n) steps.",
  statement: `
<p>Levitin's <code>Binary(n)</code> (§2.3) counts the binary <i>digits</i> of n by halving it until it reaches 1 — the loop runs
⌊log₂ n⌋ times. A small change turns it into something used everywhere from error-correcting codes to chess engines:
the <b>population count</b>, the number of 1-bits.</p>
<p><b>Task.</b> Given an integer <code>n ≥ 0</code>, return how many digits equal to 1 its binary representation has.</p>
<ul>
<li><b>Input:</b> <code>0 ≤ n ≤ 10<sup>9</sup></code>.</li>
<li><b>Output:</b> the number of 1-bits, e.g. 2 for n = 5 (binary 101), 0 for n = 0.</li>
</ul>
<p>Useful facts: the last binary digit of n is <code>n mod 2</code>, and <code>⌊n/2⌋</code> is n with that digit removed.
The grader checks your work grows like <b>log n</b>.</p>`,
  entry: "CountOnes",
  params: ["n"],
  tests: [
    { args: [5], expect: 2, explain: "5 = 101 in binary: two 1s." },
    { args: [0], expect: 0, explain: "0 has no 1-bits — your loop shouldn't run at all." },
    { args: [8], expect: 1, explain: "8 = 1000: the leading 1 counts too." },
    { args: [1], expect: 1, name: "n = 1" },
    { args: [7], expect: 3, name: "7 = 111" },
    { args: [255], expect: 8, name: "2⁸ − 1: all ones" },
    { args: [256], expect: 1, name: "2⁸" },
    { args: [1000000000], expect: 13, name: "A billion = 111011100110101100101000000000" },
  ],
  random: { count: 25, gen: (r, i) => [r.int(0, 2 ** r.int(1, 30))] },
  reference: (n) => n.toString(2).split("").filter((c) => c === "1").length,
  forbid: ["log2", "lg", "log", "ln", "str"],
  growth: { metric: "steps", sizes: [16, 256, 4096, 65536, 1048576], gen: (r, n) => [n + r.int(0, n - 1)], expect: "log n" },
  mutants: [
    { fn: (n) => (n === 0 ? 0 : n.toString(2).length), hint: "You're counting ALL binary digits (like Binary(n) in §2.3), not just the 1s. Only add to the count when the last digit n mod 2 is 1." },
    { fn: (n) => Math.max(0, n.toString(2).split("").filter((c) => c === "1").length - 1), hint: "You're one short — the leading 1 is never counted. A loop 'while n > 1' stops before looking at the last remaining bit; use 'while n > 0'." },
    { fn: (n) => n.toString(2).split("").filter((c) => c === "0").length, hint: "You're counting the 0-bits. The digit is 1 exactly when n mod 2 = 1." },
  ],
  hints: [
    "How can you read the LAST binary digit of n using ordinary arithmetic, and how do you throw that digit away to see the next one?",
    "Loop while n > 0: look at n mod 2, add it to a counter if it is 1, then replace n by ⌊n/2⌋.",
    "Body: if n mod 2 = 1 then count ← count + 1; then n ← ⌊n/2⌋.",
  ],
  starter: {
    pseudo: `ALGORITHM CountOnes(n)
    // Output: the number of 1s in the binary representation of n ≥ 0
    count ← 0
    while n > 0 do
        ...          // look at the last bit, then drop it
    return count`,
    js: `function CountOnes(n) {
  let count = 0;
  // read the last bit with n % 2, drop it with Math.floor(n / 2)
  return count;
}`,
  },
  solution: {
    pseudo: `ALGORITHM CountOnes(n)
    count ← 0
    while n > 0 do
        if n mod 2 = 1 then
            count ← count + 1
        n ← ⌊n/2⌋
    return count`,
    js: `function CountOnes(n) {
  let count = 0;
  while (n > 0) {
    if (n % 2 === 1) count++;
    n = Math.floor(n / 2);
  }
  return count;
}`,
    python: `def count_ones(n):
    count = 0
    while n > 0:
        if n % 2 == 1:
            count += 1
        n //= 2
    return count`,
    explain: "Each iteration inspects the last bit and removes it, so the loop runs once per binary digit: ⌊log₂ n⌋ + 1 times for n ≥ 1 (the same count as Levitin's Binary(n) plus one), Θ(log n).",
  },
  distractors: ["while n > 1 do", "count ← count + n mod 2 + 1", "n ← n - 1"],
  followUp: "Brian Kernighan's trick n ← n AND (n − 1) clears the lowest 1-bit, so the loop runs only popcount(n) times; modern processors do it in one population-count (POPCNT) instruction — used in Hamming distance, bitboards and Bloom-filter math.",
  complexity: "Θ(log n): one iteration per binary digit",
  visual: "sims/recurrence-lab.html",
  lesson: "lessons/02-analysis-framework/README.md",
});

ForgeProblems.add({
  id: "hanoi-moves",
  title: "Tower of Hanoi: List the Moves",
  level: 1, chapter: 2, difficulty: 2,
  topics: ["recursion", "recurrences", "exponential growth"],
  strategy: "Recursion (two subproblems of size n − 1)",
  source: "Levitin §2.4, Example 2",
  summary: "Return the 2ⁿ − 1 moves that transfer n disks from one peg to another; M(n) = 2M(n − 1) + 1.",
  statement: `
<p>n disks of different sizes sit on a peg, largest at the bottom. Move them all to another peg, one disk at a time,
never putting a larger disk on a smaller one, using a third peg as a spare. The recursive idea (Levitin §2.4): to move n disks,
first move the top <b>n − 1</b> out of the way onto the spare peg, move the biggest disk, then move the n − 1 disks back on top of it.</p>
<p><b>Task.</b> <code>Hanoi(n, source, target, spare)</code> returns the list of moves, in order, that moves n disks from peg
<code>source</code> to peg <code>target</code>. Each move is a pair <code>[from, to]</code> of peg numbers.</p>
<ul>
<li><b>Input:</b> <code>0 ≤ n ≤ 10</code>, and the three distinct peg numbers (the tests usually use 1, 3, 2).</li>
<li><b>Output:</b> a list of <code>[from, to]</code> pairs — the unique shortest solution, which has 2ⁿ − 1 moves. For n = 0, <code>[]</code>.</li>
</ul>
<p>Lists can be joined with <code>+</code> (<code>[a] + [b]</code> is <code>[a, b]</code>) and extended with <code>append(L, x)</code>.
Note: <code>from</code> and <code>to</code> are pseudocode keywords, so the parameters are called source/target/spare.</p>`,
  entry: "Hanoi",
  params: ["n", "source", "target", "spare"],
  tests: [
    { args: [2, 1, 3, 2], expect: [[1, 2], [1, 3], [2, 3]], explain: "Small disk out of the way (1→2), big disk across (1→3), small disk on top (2→3)." },
    { args: [1, 1, 3, 2], expect: [[1, 3]], explain: "One disk: just move it." },
    { args: [0, 1, 3, 2], expect: [], explain: "No disks, no moves — a handy base case." },
    { args: [3, 1, 3, 2], expect: [[1, 3], [1, 2], [3, 2], [1, 3], [2, 1], [2, 3], [1, 3]], name: "n = 3: 7 moves" },
    { args: [2, 2, 1, 3], expect: [[2, 3], [2, 1], [3, 1]], name: "Different pegs" },
    { args: [4, 1, 3, 2], expect: [[1, 2], [1, 3], [2, 3], [1, 2], [3, 1], [3, 2], [1, 2], [1, 3], [2, 3], [2, 1], [3, 1], [2, 3], [1, 2], [1, 3], [2, 3]], name: "n = 4: 15 moves" },
  ],
  random: { count: 15, gen: (r, i) => { const pegs = r.shuffle([1, 2, 3]); return [r.int(0, 9), pegs[0], pegs[1], pegs[2]]; } },
  reference: (n, s, t, x) => { const out = []; const go = (k, a, b, c) => { if (k === 0) return; go(k - 1, a, c, b); out.push([a, b]); go(k - 1, c, b, a); }; go(n, s, t, x); return out; },
  mutants: [
    { fn: (n, s, t, x) => { const out = []; const go = (k, a, b, c) => { if (k === 0) return; go(k - 1, a, b, c); out.push([a, b]); go(k - 1, c, b, a); }; go(n, s, t, x); return out; }, hint: "Your first step for n = 2 puts the small disk on the TARGET peg — then the big disk can't go there. The first recursive call moves n − 1 disks from source to SPARE (so target and spare swap roles in that call)." },
    { fn: (n, s, t, x) => { const out = []; const go = (k, a, b, c) => { if (k === 0) return; out.push([a, b]); go(k - 1, a, c, b); go(k - 1, c, b, a); }; go(n, s, t, x); return out; }, hint: "You move the biggest disk FIRST, while n − 1 smaller disks are still on top of it. The order is: recurse (clear the way), move, recurse (rebuild on top)." },
    { fn: (n, s, t, x) => { const out = []; const go = (k, a, b, c) => { if (k === 0) return; go(k - 1, a, c, b); out.push([a, b]); go(k - 1, a, b, c); }; go(n, s, t, x); return out; }, hint: "Your second recursive call moves disks from the SOURCE peg, but the n − 1 disks are sitting on the spare peg at that point. The second call goes from spare to target (with source as the new spare)." },
  ],
  hints: [
    "Pretend a friend can already move any n − 1 disks for you. Where do you ask them to put those disks so that the biggest disk can move straight to the target?",
    "If n = 0 return []. Otherwise: moves for n − 1 disks source → spare, then the single move [source, target], then moves for n − 1 disks spare → target.",
    "The first call is Hanoi(n − 1, source, spare, target). After the big move, the n − 1 disks sit on the spare peg: which peg is the source, target and spare of the second call?",
  ],
  starter: {
    pseudo: `ALGORITHM Hanoi(n, source, target, spare)
    // Output: list of moves [from, to] that move n disks source → target
    if n = 0 then
        return []
    moves ← Hanoi(n - 1, ..., ..., ...)
    append(moves, [source, target])
    ...
    return moves`,
    js: `function Hanoi(n, source, target, spare) {
  if (n === 0) return [];
  // first move n - 1 disks out of the way, then the big one, then the n - 1 back
}`,
  },
  solution: {
    pseudo: `ALGORITHM Hanoi(n, source, target, spare)
    if n = 0 then
        return []
    moves ← Hanoi(n - 1, source, spare, target)
    append(moves, [source, target])
    return moves + Hanoi(n - 1, spare, target, source)`,
    js: `function Hanoi(n, source, target, spare) {
  if (n === 0) return [];
  return [
    ...Hanoi(n - 1, source, spare, target),
    [source, target],
    ...Hanoi(n - 1, spare, target, source),
  ];
}`,
    python: `def hanoi(n, source, target, spare):
    if n == 0:
        return []
    return (hanoi(n - 1, source, spare, target)
            + [[source, target]]
            + hanoi(n - 1, spare, target, source))`,
    explain: "Moves: M(n) = 2M(n − 1) + 1, M(0) = 0. Backward substitution: M(n) = 2²M(n − 2) + 2 + 1 = … = 2ⁱM(n − i) + 2ⁱ − 1 → with i = n, M(n) = 2ⁿ − 1 ∈ Θ(2ⁿ). No algorithm can do better: the biggest disk must move at least once, and each time the other n − 1 must be stacked elsewhere.",
  },
  distractors: ["moves ← Hanoi(n - 1, source, target, spare)", "return moves + Hanoi(n - 1, source, target, spare)", "if n = 1 then return []"],
  followUp: "At one move per second, 64 disks take 2⁶⁴ − 1 seconds ≈ 585 billion years — exponential algorithms are only usable for tiny n. (Twist: an iterative version exists — on odd moves shift the smallest disk cyclically, on even moves make the only other legal move.)",
  complexity: "2ⁿ − 1 moves, Θ(2ⁿ)",
  visual: "sims/hanoi.html",
  lesson: "lessons/02-analysis-framework/README.md",
});

ForgeProblems.add({
  id: "fibonacci-call-count",
  title: "How Often Is F(1) Computed?",
  level: 1, chapter: 2, difficulty: 3,
  topics: ["recursion", "recurrences", "Fibonacci", "counting operations"],
  strategy: "Find the recurrence the counts satisfy",
  source: "Levitin Exercise 2.5.7 (adapted) · Problem Set 1, Problem 10",
  summary: "In the naive recursive Fibonacci, count how many times F(1) and F(0) are evaluated — for n up to 60.",
  statement: `
<p>The definition-based algorithm for Fibonacci numbers,</p>
<pre>ALGORITHM F(n)
    if n ≤ 1 then
        return n
    else
        return F(n - 1) + F(n - 2)</pre>
<p>solves the same subproblems again and again. How often? Let <code>C(n)</code> be the number of times <code>F(1)</code> is
called while computing <code>F(n)</code>, and <code>Z(n)</code> the number of times <code>F(0)</code> is called.</p>
<p><b>Task.</b> Return <code>[C(n), Z(n)]</code>.</p>
<ul>
<li><b>Input:</b> <code>0 ≤ n ≤ 60</code>. Careful: F(0) itself calls F(0) once, so Z(0) = 1.</li>
<li><b>Output:</b> the pair of counts, e.g. <code>[2, 1]</code> for n = 3 (F(3) → F(2), F(1); F(2) → F(1), F(0)).</li>
</ul>
<p>For small n you can simply run the recursion with counters to <i>discover</i> the pattern. But F(60) would make about
2.5 trillion calls — to pass the big tests you have to find the <b>recurrence the counts obey</b> and compute them efficiently.</p>`,
  entry: "FibCalls",
  params: ["n"],
  tests: [
    { args: [3], expect: [2, 1], explain: "F(3) calls F(2) and F(1); F(2) calls F(1) and F(0). So F(1) twice, F(0) once." },
    { args: [0], expect: [0, 1], explain: "Computing F(0) evaluates F(0) once and F(1) never." },
    { args: [1], expect: [1, 0], explain: "Computing F(1) evaluates F(1) once and F(0) never." },
    { args: [2], expect: [1, 1], name: "n = 2" },
    { args: [5], expect: [5, 3], name: "n = 5" },
    { args: [10], expect: [55, 34], name: "n = 10: notice anything?" },
    { args: [30], expect: [832040, 514229], name: "n = 30: already over a million calls if simulated" },
    { args: [60], expect: [1548008755920, 956722026041], name: "n = 60: simulation is hopeless" },
  ],
  random: { count: 15, gen: (r, i) => [i % 2 ? r.int(0, 20) : r.int(21, 60)] },
  reference: (n) => { if (n === 0) return [0, 1]; let a = 0, b = 1; for (let i = 1; i < n; i++) [a, b] = [b, a + b]; return [b, a]; },
  maxSteps: 100000,
  lints: [
    { re: "F\\s*\\(\\s*n\\s*[-−]\\s*1\\s*\\)\\s*\\+\\s*F\\s*\\(", lang: "any", message: "Simulating the recursion is a great way to DISCOVER the pattern for small n, but it makes about F(n) calls — far too many for n = 60. Use what you observed: C and Z each satisfy a recurrence you can run bottom-up in a loop." },
  ],
  mutants: [
    { fn: (n) => { let a = 0, b = 1; for (let i = 0; i < n; i++) [a, b] = [b, a + b]; return [a, a]; }, hint: "C(n) is right, but Z(n) is not the same sequence: Z(0) = 1 and Z(1) = 0 — the starting values are swapped compared with C. Same recurrence, different initial conditions." },
    { fn: (n) => { let a = 0, b = 1; for (let i = 0; i < n; i++) [a, b] = [b, a + b]; return [b, a]; }, hint: "Both counts are one step too far along (n = 1 should give [1, 0]). Check your initial conditions: C(0) = 0, C(1) = 1 and Z(0) = 1, Z(1) = 0." },
    { fn: (n) => { if (n === 0) return [0, 0]; let a = 0, b = 1; for (let i = 1; i < n; i++) [a, b] = [b, a + b]; return [b, a]; }, hint: "Everything is right except n = 0: computing F(0) calls F(0) once, so Z(0) = 1 and the answer is [0, 1]." },
  ],
  hints: [
    "Computing F(n) for n ≥ 2 makes one call to F(n − 1) and one to F(n − 2). So how does C(n) relate to C(n − 1) and C(n − 2)? Same question for Z.",
    "C and Z obey exactly the Fibonacci recurrence; only their starting values differ: C(0) = 0, C(1) = 1 and Z(0) = 1, Z(1) = 0. Compute them bottom-up with a loop, like fibonacci-iterative.",
    "So C(n) = F(n) and Z(n) = F(n − 1) (with Z(0) = 1). Handle n = 0 separately, then slide two pairs of variables forward from i = 2 to n.",
  ],
  starter: {
    pseudo: `ALGORITHM FibCalls(n)
    // Output: [times F(1) is computed, times F(0) is computed] inside F(n)
    if n = 0 then
        return [0, 1]
    c ← 1
    z ← 0
    cPrev ← 0
    zPrev ← 1
    for i ← 2 to n do
        ...          // each count = its previous two values added
    return [c, z]`,
    js: `function FibCalls(n) {
  // return [C(n), Z(n)] — n can be 60, so don't simulate the recursion
}`,
  },
  solution: {
    pseudo: `ALGORITHM FibCalls(n)
    if n = 0 then
        return [0, 1]
    c ← 1
    z ← 0
    cPrev ← 0
    zPrev ← 1
    for i ← 2 to n do
        cNext ← c + cPrev
        zNext ← z + zPrev
        cPrev ← c
        zPrev ← z
        c ← cNext
        z ← zNext
    return [c, z]`,
    js: `function FibCalls(n) {
  if (n === 0) return [0, 1];
  let c = 1, z = 0, cPrev = 0, zPrev = 1;
  for (let i = 2; i <= n; i++) {
    [cPrev, c] = [c, c + cPrev];
    [zPrev, z] = [z, z + zPrev];
  }
  return [c, z];
}`,
    python: `def fib_calls(n):
    if n == 0:
        return [0, 1]
    c, z, c_prev, z_prev = 1, 0, 0, 1
    for _ in range(2, n + 1):
        c, c_prev = c + c_prev, c
        z, z_prev = z + z_prev, z
    return [c, z]`,
    explain: "For n ≥ 2 the calls split into the calls made by F(n − 1) and by F(n − 2), so C(n) = C(n − 1) + C(n − 2) and Z(n) = Z(n − 1) + Z(n − 2). With C(0) = 0, C(1) = 1 these are the Fibonacci numbers: C(n) = F(n); with Z(0) = 1, Z(1) = 0 the sequence is shifted: Z(n) = F(n − 1). The naive recursion therefore makes at least F(n) ≈ φⁿ/√5 leaf calls — exponential — while this loop is Θ(n).",
  },
  distractors: ["cNext ← c + zPrev", "return [c, c]", "if n = 0 then return [0, 0]"],
  followUp: "The total number of calls is C(n) + Z(n) + (internal calls) = 2F(n + 1) − 1. Memoization (store each F(k) once) turns the exponential recursion into Θ(n) — that one idea is the whole of dynamic programming (Levitin Ch 8).",
  complexity: "Θ(n) with the recurrence; the counted recursion itself is Θ(φⁿ)",
  visual: "sims/fibonacci.html",
  lesson: "lessons/02-analysis-framework/README.md",
});
