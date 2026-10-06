/* Pack E — Dynamic Programming (level 4, Levitin Ch 8 + classic DP problems).
   Every problem is validated by tools/validate-problems.mjs. See ../PROBLEM_FORMAT.md.
   Conventions used in this pack:
   - Levitin-style 1-based arrays: a header like C[1..n] gives a 1-based VIEW of the array the grader passes in
     (test inputs are ordinary lists; C[1] is the first element).
   - Strings and 2-D matrices use 0-based headers (X[0..m-1], G[0..n-1, 0..m-1]).
   - "DP table" = the array/matrix F that stores the answer for every smaller subproblem. */

(function () {
"use strict";

/* ---------- small shared helpers (plain JS, used by oracles & mutants) ---------- */
const DP = {
  coinRow(C) { const F = [0]; if (C.length) F[1] = C[0]; for (let i = 2; i <= C.length; i++) F[i] = Math.max(C[i - 1] + F[i - 2], F[i - 1]); return F; },
  knapTable(w, v, W) {
    const n = w.length, F = Array.from({ length: n + 1 }, () => Array(W + 1).fill(0));
    for (let i = 1; i <= n; i++) for (let j = 1; j <= W; j++) F[i][j] = j >= w[i - 1] ? Math.max(F[i - 1][j], v[i - 1] + F[i - 1][j - w[i - 1]]) : F[i - 1][j];
    return F;
  },
  greedyRatio(w, v, W) { // take whole items by best value/weight while they fit
    const idx = w.map((_, i) => i).sort((a, b) => v[b] / w[b] - v[a] / w[a] || a - b);
    let cap = W; const picked = [];
    for (const i of idx) if (w[i] <= cap) { cap -= w[i]; picked.push(i + 1); }
    return picked.sort((a, b) => a - b);
  },
  lcs(X, Y) {
    const m = X.length, n = Y.length, L = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) L[i][j] = X[i - 1] === Y[j - 1] ? L[i - 1][j - 1] + 1 : Math.max(L[i - 1][j], L[i][j - 1]);
    return L[m][n];
  },
  bools(M) { return M.map((row) => row.map((x) => (x ? 1 : 0))); },
};

/* =========================================================================
   Difficulty 1 — first tables
   ========================================================================= */

ForgeProblems.add({
  id: "climbing-stairs",
  title: "Climbing Stairs (Fibonacci in Disguise)",
  level: 4, chapter: 8, difficulty: 1,
  topics: ["dynamic programming", "1-D table", "Fibonacci", "recurrences"],
  strategy: "Dynamic programming (bottom-up, 1-D table)",
  source: "Interview classic · Levitin Ch 8 intro & §2.5 (Fibonacci)",
  summary: "Count the ways to climb n stairs taking 1 or 2 steps at a time — without recomputing anything.",
  statement: `
<p>Dynamic Programming (DP) starts here: a recurrence whose subproblems <b>overlap</b>. Solve each smaller subproblem once, store it
in a table, and the exponential recursion collapses to a single loop (Levitin, Ch 8 introduction).</p>
<p>You are at the bottom of a staircase with <code>n</code> steps. Each move climbs either <b>1</b> or <b>2</b> steps.
Return the number of <b>different sequences of moves</b> that end exactly on step <code>n</code>.</p>
<ul>
<li><b>Input:</b> an integer <code>n</code>, 0 ≤ n ≤ 45.</li>
<li><b>Output:</b> the number of ways. For <code>n = 0</code> the answer is 1 (the empty sequence — you are already there).</li>
</ul>
<p>Example: <code>n = 3</code> → 3 ways: 1+1+1, 1+2, 2+1.</p>
<p><b>Efficiency:</b> the grader checks that your work grows <b>linearly</b> in n. Plain recursion takes exponential time and will run out of steps.</p>`,
  entry: "ClimbStairs",
  params: ["n"],
  tests: [
    { args: [3], expect: 3, explain: "1+1+1, 1+2, 2+1." },
    { args: [0], expect: 1, explain: "Zero steps: exactly one way — do nothing." },
    { args: [2], expect: 2, explain: "1+1 or 2." },
    { args: [1], expect: 1 },
    { args: [5], expect: 8 },
    { args: [10], expect: 89 },
    { args: [45], expect: 1836311903, explain: "Too big for plain recursion — you need the table." },
  ],
  random: { count: 20, gen: (r) => [r.int(0, 45)] },
  reference: (n) => { let a = 1, b = 1; for (let i = 2; i <= n; i++) [a, b] = [b, a + b]; return b; },
  growth: { metric: "steps", sizes: [20, 40, 80, 160, 320], gen: (r, n) => [n], expect: "n" },
  mutants: [
    { fn: (n) => { let a = 0, b = 1; if (n === 0) return 0; for (let i = 2; i <= n; i++) [a, b] = [b, a + b]; return b; }, hint: "For n = 2 you answer 1, but 1+1 and 2 are two different ways. Your table is shifted by one position: ask yourself how many ways there are to climb 0 steps, and store that in the first cell." },
    { fn: (n) => { if (n === 0) return 0; let a = 1, b = 1; for (let i = 2; i <= n; i++) [a, b] = [b, a + b]; return b; }, hint: "Everything is right except n = 0. Standing still is one valid (empty) sequence of moves, so the answer there is 1, not 0." },
  ],
  lints: [
    { re: "ClimbStairs\\s*\\(\\s*n\\s*-\\s*1\\s*\\)", lang: "pseudo", message: "You're calling ClimbStairs(n − 1) recursively. Without a table, the same values get recomputed exponentially many times. Fill an array from the bottom instead." },
  ],
  hints: [
    "Think about the LAST move you make to land on step n. What two situations could you have been in just before it?",
    "If W(i) is the number of ways to reach step i, then W(i) = W(i − 1) + W(i − 2). Decide W(0) and W(1), then fill a table left to right.",
    "Make F ← array(n + 1, 0), set F[0] ← 1 and F[1] ← 1 (guard n = 0), loop i ← 2 to n and return F[n].",
  ],
  starter: {
    pseudo: `ALGORITHM ClimbStairs(n)
    // Input: integer n, 0 ≤ n ≤ 45
    // Output: number of ways to climb n steps using moves of 1 or 2
    F ← array(n + 1, 0)
    ...
    return F[n]`,
    js: `function ClimbStairs(n) {
  // fill a table bottom-up
}`,
  },
  solution: {
    pseudo: `ALGORITHM ClimbStairs(n)
    if n ≤ 1 then
        return 1
    F ← array(n + 1, 0)
    F[0] ← 1
    F[1] ← 1
    for i ← 2 to n do
        F[i] ← F[i - 1] + F[i - 2]
    return F[n]`,
    js: `function ClimbStairs(n) {
  if (n <= 1) return 1;
  const F = Array(n + 1).fill(0);
  F[0] = 1; F[1] = 1;
  for (let i = 2; i <= n; i++) F[i] = F[i - 1] + F[i - 2];
  return F[n];
}`,
    python: `def climb_stairs(n):
    if n <= 1:
        return 1
    F = [0] * (n + 1)
    F[0] = F[1] = 1
    for i in range(2, n + 1):
        F[i] = F[i - 1] + F[i - 2]
    return F[n]`,
    explain: "The last move is either 1 step (from step n − 1) or 2 steps (from step n − 2), so W(n) = W(n − 1) + W(n − 2) with W(0) = W(1) = 1 — the Fibonacci numbers shifted by one. Each table cell costs Θ(1), so the loop is Θ(n) instead of the Θ(φⁿ) of naive recursion.",
  },
  complexity: "Θ(n) time, Θ(n) space (Θ(1) if you keep only the last two values)",
  followUp: "Keep only the last two values to use Θ(1) space — Levitin notes this trick for Fibonacci. Then allow a set of step sizes S = {1, 3, 5}: the recurrence becomes a sum over S, which is exactly the ordered version of coin change.",
  distractors: ["F[0] ← 0", "for i ← 2 to n - 1 do", "F[i] ← F[i - 1] + F[i - 3]"],
  visual: "sims/fibonacci.html",
  lesson: "lessons/08-dynamic-programming/README.md",
});

ForgeProblems.add({
  id: "coin-row",
  title: "Coin-Row Problem",
  level: 4, chapter: 8, difficulty: 1,
  topics: ["dynamic programming", "1-D table", "optimization"],
  strategy: "Dynamic programming (take it or leave it)",
  source: "Levitin §8.1, Example 1",
  summary: "Pick coins from a row, never two neighbors, to maximize the total value.",
  statement: `
<p>This is the first optimization problem in Levitin's Dynamic Programming (DP) chapter, and the pattern — <b>"either the last item is in
the best answer or it isn't"</b> — powers hundreds of other DP solutions (Levitin §8.1).</p>
<p>A row of <code>n</code> coins has positive values <code>C[1..n]</code>. Pick up coins to get the <b>largest total</b>,
with one rule: you may <b>never take two coins that are next to each other</b> in the row. Return that largest total.</p>
<ul>
<li><b>Input:</b> <code>C</code>, a list of 0 ≤ n ≤ 60 positive integers. The header <code>CoinRow(C[1..n])</code> gives you a
<b>1-based</b> view: <code>C[1]</code> is the first coin, just like the book.</li>
<li><b>Output:</b> the maximum total (0 for an empty row).</li>
</ul>
<p>Your algorithm must be <b>linear</b>, Θ(n).</p>`,
  entry: "CoinRow",
  params: ["C"],
  tests: [
    { args: [[5, 1, 2, 10, 6, 2]], expect: 17, explain: "Take 5, 10 and 2 (positions 1, 4, 6) — the book's example." },
    { args: [[10, 1, 1, 10]], expect: 20, explain: "Take both 10s: skipping TWO coins in a row is allowed." },
    { args: [[3, 4, 3]], expect: 6, explain: "Grabbing the biggest coin (4) first blocks both 3s." },
    { args: [[]], expect: 0, explain: "No coins, no money." },
    { args: [[7]], expect: 7 },
    { args: [[1, 2]], expect: 2 },
    { args: [[5, 1, 2, 10, 6]], expect: 15, explain: "Levitin Exercise 8.1.2." },
    { args: [[2, 7, 9, 3, 1]], expect: 12 },
    { args: [[4, 1, 1, 9, 1, 1, 4]], expect: 17 },
  ],
  random: { count: 25, gen: (r, i) => [r.array(i % 5 === 0 ? i % 3 : 2 + (i % 20) * 2, 1, 20)] },
  reference: (C) => DP.coinRow(C)[C.length],
  growth: { metric: "steps", sizes: [32, 64, 128, 256, 512], gen: (r, n) => [r.array(n, 1, 50)], expect: "n" },
  mutants: [
    { fn: (C) => { let a = 0, b = 0; C.forEach((c, i) => (i % 2 ? (b += c) : (a += c))); return Math.max(a, b); }, hint: "Your answer equals the better of 'every other coin from the first' and 'every other coin from the second'. But a best pick can skip TWO coins in a row (try [10, 1, 1, 10]). Decide coin by coin, using a table of best totals for each prefix of the row." },
    { fn: (C) => { const n = C.length, taken = Array(n).fill(false), blocked = Array(n).fill(false); let s = 0; const order = C.map((_, i) => i).sort((a, b) => C[b] - C[a] || a - b); for (const i of order) if (!blocked[i]) { taken[i] = true; s += C[i]; blocked[i] = true; if (i > 0) blocked[i - 1] = true; if (i < n - 1) blocked[i + 1] = true; } return s; }, hint: "This looks greedy: grab the biggest coin, then the biggest one still allowed, and so on. On [3, 4, 3] that takes 4 and blocks both 3s. Greedy choices can't be undone — DP compares both options (take coin i or not) for every prefix." },
    { fn: (C) => C.reduce((a, b) => a + b, 0), hint: "Your total is the sum of ALL coins, so neighbors are being combined. When you take coin i, which earlier table entry is still allowed to be added to it? (Its neighbor i − 1 must be out.)" },
  ],
  hints: [
    "Look only at the LAST coin. Either it's in the best selection or it isn't. What is the best you can do in each case, in terms of shorter rows?",
    "Let F[i] = best total from the first i coins. If coin i is taken, coin i − 1 is not, so you add C[i] to F[i − 2]; if it isn't taken, you get F[i − 1]. Base cases: F[0] = 0 and F[1] = C[1].",
    "Loop i ← 2 to n with F[i] ← max(C[i] + F[i − 2], F[i − 1]) and return F[n]. Guard F[1] with 'if n ≥ 1' so the empty row works.",
  ],
  starter: {
    pseudo: `ALGORITHM CoinRow(C[1..n])
    // Input: coin values C[1..n] (1-based), 0 ≤ n ≤ 60
    // Output: the largest total with no two adjacent coins
    F ← array(n + 1, 0)
    ...
    return F[n]`,
    js: `function CoinRow(C) {
  // C is 0-based in JavaScript: C[0] is the first coin
}`,
  },
  solution: {
    pseudo: `ALGORITHM CoinRow(C[1..n])
    F ← array(n + 1, 0)
    if n ≥ 1 then
        F[1] ← C[1]
    for i ← 2 to n do
        F[i] ← max(C[i] + F[i - 2], F[i - 1])
    return F[n]`,
    js: `function CoinRow(C) {
  const n = C.length, F = Array(n + 1).fill(0);
  if (n >= 1) F[1] = C[0];
  for (let i = 2; i <= n; i++) F[i] = Math.max(C[i - 1] + F[i - 2], F[i - 1]);
  return F[n];
}`,
    python: `def coin_row(C):
    n = len(C)
    F = [0] * (n + 1)
    if n >= 1:
        F[1] = C[0]
    for i in range(2, n + 1):
        F[i] = max(C[i - 1] + F[i - 2], F[i - 1])
    return F[n]`,
    explain: "Every allowed selection either contains coin n (then coin n − 1 is out, leaving the best of the first n − 2) or not — so F(n) = max{cₙ + F(n − 2), F(n − 1)} covers all cases (Levitin eq. 8.3). One constant-time cell per coin: Θ(n) time and space, versus exponential time for exhaustive search or plain recursion.",
  },
  complexity: "Θ(n) time, Θ(n) space (Θ(1) with two variables)",
  followUp: "Do it with two variables instead of an array. Then the 'House Robber II' twist: the coins sit in a CIRCLE, so the first and last are neighbors — solve it with two runs of your linear algorithm.",
  distractors: ["F[i] ← max(C[i] + F[i - 1], F[i - 2])", "for i ← 1 to n do", "F[1] ← 0"],
  visual: "sims/dp-studio.html",
  lesson: "lessons/08-dynamic-programming/README.md",
});

ForgeProblems.add({
  id: "change-making-dp",
  title: "Change-Making (Fewest Coins)",
  level: 4, chapter: 8, difficulty: 1,
  topics: ["dynamic programming", "1-D table", "greedy vs DP"],
  strategy: "Dynamic programming (min over choices)",
  source: "Levitin §8.1, Example 2",
  summary: "Fewest coins that add up to n, for ANY coin system — where the greedy method can fail.",
  statement: `
<p>For everyday coins, "always take the biggest coin that fits" works. For a general coin system it doesn't: with coins 1, 3, 4 and
amount 6, greedy pays 4 + 1 + 1 (three coins) but 3 + 3 uses two. Dynamic Programming (DP) gets the true optimum (Levitin §8.1).</p>
<p>Given denominations <code>D[1..m]</code> in increasing order with <code>D[1] = 1</code> (so every amount is payable), and an amount
<code>n</code>, return the <b>minimum number of coins</b> whose values add up to <code>n</code>. You have unlimited coins of each kind.</p>
<ul>
<li><b>Input:</b> <code>D</code> — 1 ≤ m ≤ 6 increasing positive integers starting with 1 (1-based view <code>D[1..m]</code>);
<code>n</code> — an integer 0 ≤ n ≤ 80.</li>
<li><b>Output:</b> the fewest coins (0 when n = 0).</li>
</ul>`,
  entry: "ChangeMaking",
  params: ["D", "n"],
  tests: [
    { args: [[1, 3, 4], 6], expect: 2, explain: "3 + 3. Greedy would say 4 + 1 + 1 = 3 coins." },
    { args: [[1, 5, 10, 25], 30], expect: 2, explain: "25 + 5." },
    { args: [[1], 0], expect: 0, explain: "Amount 0 needs no coins." },
    { args: [[1, 3, 5], 9], expect: 3, explain: "Levitin Exercise 8.1.4: 5+3+1 or 3+3+3." },
    { args: [[1], 7], expect: 7 },
    { args: [[1, 5, 6, 9], 11], expect: 2, explain: "5 + 6; greedy takes 9 + 1 + 1." },
    { args: [[1, 3, 4], 4], expect: 1, explain: "An amount equal to a coin needs exactly one coin." },
    { args: [[1, 7, 10], 14], expect: 2 },
  ],
  random: {
    count: 25,
    gen: (r, i) => {
      const m = 1 + (i % 5);
      const D = [1, ...r.distinct(m - 1, 2, 15)].sort((a, b) => a - b);
      return [D, r.int(0, 60)];
    },
  },
  reference: (D, n) => { const F = [0]; for (let i = 1; i <= n; i++) { let t = Infinity; for (const d of D) if (d <= i) t = Math.min(t, F[i - d]); F[i] = t + 1; } return F[n]; },
  growth: { metric: "steps", sizes: [40, 80, 160, 320, 640], gen: (r, n) => [[1, 3, 4], n], expect: "n" },
  mutants: [
    { fn: (D, n) => { let c = 0; for (let j = D.length - 1; j >= 0; j--) while (n >= D[j]) { n -= D[j]; c++; } return c; }, hint: "Your answers match the greedy method (biggest coin first). For coins 1, 3, 4 and n = 6 that gives 3 coins, but 3 + 3 is better. For each amount, try EVERY coin as the last one and keep the best." },
    { fn: (D, n) => { const F = [0]; for (let i = 1; i <= n; i++) { let t = Infinity; for (const d of D) if (i > d) t = Math.min(t, F[i - d]); F[i] = t + 1; } return F[n]; }, hint: "Amounts that equal a coin's value come out wrong (for coins 1, 3, 4 and amount 4 the answer is 1). Look at the comparison between the amount i and D[j] in your loop condition — a coin that fits exactly is allowed." },
    { fn: (D, n) => { if (n === 0) return 0; const F = [0]; for (let i = 1; i < n; i++) { let t = Infinity; for (const d of D) if (d <= i) t = Math.min(t, F[i - d]); F[i] = t + 1; } return F[n - 1]; }, hint: "Your answers look like the answer for amount n − 1. Check that the table has n + 1 cells (amounts 0..n) and that you fill and return the cell for amount n itself." },
  ],
  hints: [
    "Whatever the best way to pay n is, it has a LAST coin d. What is left to pay before that coin, and how should that remainder be paid?",
    "Let F[a] = fewest coins for amount a. Then F[0] = 0 and F[a] = 1 + min over coins d ≤ a of F[a − d]. Fill a = 1, 2, …, n in order.",
    "Inside the loop over a: temp ← ∞; walk j while j ≤ m and D[j] ≤ a, taking temp ← min(temp, F[a − D[j]]); then F[a] ← temp + 1.",
  ],
  starter: {
    pseudo: `ALGORITHM ChangeMaking(D[1..m], n)
    // Input: increasing denominations D[1..m] with D[1] = 1; amount n ≥ 0
    // Output: the minimum number of coins adding up to n
    F ← array(n + 1, 0)
    for i ← 1 to n do
        ...
    return F[n]`,
    js: `function ChangeMaking(D, n) {
  // D is 0-based here: D[0] = 1
}`,
  },
  solution: {
    pseudo: `ALGORITHM ChangeMaking(D[1..m], n)
    F ← array(n + 1, 0)
    for i ← 1 to n do
        temp ← ∞
        j ← 1
        while j ≤ m and i ≥ D[j] do
            temp ← min(F[i - D[j]], temp)
            j ← j + 1
        F[i] ← temp + 1
    return F[n]`,
    js: `function ChangeMaking(D, n) {
  const F = Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    let temp = Infinity;
    for (let j = 0; j < D.length && i >= D[j]; j++) temp = Math.min(temp, F[i - D[j]]);
    F[i] = temp + 1;
  }
  return F[n];
}`,
    python: `def change_making(D, n):
    F = [0] * (n + 1)
    for i in range(1, n + 1):
        temp = float("inf")
        j = 0
        while j < len(D) and i >= D[j]:
            temp = min(temp, F[i - D[j]])
            j += 1
        F[i] = temp + 1
    return F[n]`,
    explain: "Any optimal payment of i ends with some coin D[j] ≤ i, and the rest must be an optimal payment of i − D[j]; trying all j gives F(i) = min F(i − D[j]) + 1 (Levitin eq. 8.4). Each of the n cells scans at most m coins: O(nm) time, Θ(n) space.",
  },
  complexity: "O(nm) time, Θ(n) space",
  followUp: "Record which coin achieved each minimum so you can print the actual coins by walking back from n. Senior question: for which coin systems is greedy always optimal ('canonical' systems)? You can test it by comparing greedy against this DP for all amounts up to the sum of the two largest coins.",
  distractors: ["while j ≤ m and i > D[j] do", "F[i] ← temp", "temp ← 0"],
  visual: "sims/dp-studio.html",
  lesson: "lessons/08-dynamic-programming/README.md",
});

ForgeProblems.add({
  id: "robot-coin-collection",
  title: "Robot Coin Collection",
  level: 4, chapter: 8, difficulty: 1,
  topics: ["dynamic programming", "2-D table", "grid paths"],
  strategy: "Dynamic programming (2-D grid)",
  source: "Levitin §8.1, Example 3",
  summary: "A robot moving only right or down collects coins on a board — find the most it can collect.",
  statement: `
<p>Your first <b>two-dimensional</b> Dynamic Programming (DP) table: every cell's answer depends on the cell above it and the cell to its left
(Levitin §8.1). The same shape shows up in sequence alignment, image seam carving and path planning.</p>
<p>A board has <code>n</code> rows and <code>m</code> columns. <code>C[i, j] = 1</code> if cell (i, j) holds a coin, else 0.
A robot starts in the top-left cell (0, 0) and must finish in the bottom-right cell (n−1, m−1), moving only <b>one cell right</b> or
<b>one cell down</b> per step, picking up every coin it passes (including the start and finish cells). Return the <b>largest number of coins</b> it can collect.</p>
<ul>
<li><b>Input:</b> <code>C</code> — a list of n rows, each a list of m zeros/ones, 1 ≤ n, m ≤ 12. Indexes are <b>0-based</b>:
<code>C[i, j]</code> (or <code>C[i][j]</code>).</li>
<li><b>Output:</b> the maximum number of coins.</li>
</ul>`,
  entry: "RobotCoins",
  params: ["C"],
  tests: [
    { args: [[[0, 0, 0, 0, 1, 0], [0, 1, 0, 1, 0, 0], [0, 0, 0, 1, 0, 1], [0, 0, 1, 0, 0, 1], [1, 0, 0, 0, 1, 0]]], expect: 5, explain: "The book's 5 × 6 board: the best paths collect 5 coins." },
    { args: [[[1, 1, 1]]], expect: 3, explain: "One row: the robot walks through every cell." },
    { args: [[[0, 1, 0], [0, 0, 0], [1, 1, 1]]], expect: 3, explain: "Going down first then right beats grabbing the coin on the right." },
    { args: [[[0]]], expect: 0 },
    { args: [[[1], [0], [1], [1]]], expect: 3, explain: "One column." },
    { args: [[[0, 0, 1], [1, 0, 0], [0, 1, 0]]], expect: 2 },
    { args: [[[1, 0, 0, 0], [0, 0, 0, 1], [0, 1, 1, 0]]], expect: 3 },
  ],
  random: { count: 25, gen: (r, i) => { const n = 1 + r.int(0, 8), m = 1 + r.int(0, 8); return [Array.from({ length: n }, () => r.array(m, 0, 1))]; } },
  reference: (C) => { const n = C.length, m = C[0].length, F = C.map((row) => row.slice()); for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) F[i][j] = C[i][j] + Math.max(i ? F[i - 1][j] : 0, j ? F[i][j - 1] : 0); return F[n - 1][m - 1]; },
  mutants: [
    { fn: (C) => { const n = C.length, m = C[0].length; let i = 0, j = 0, s = C[0][0]; while (i < n - 1 || j < m - 1) { if (i === n - 1) j++; else if (j === m - 1) i++; else if (C[i][j + 1] >= C[i + 1][j]) j++; else i++; s += C[i][j]; } return s; }, hint: "Your robot seems to decide greedily, looking one cell ahead (take the neighbor that has a coin). A tempting coin can lead into an empty region. Let a table record, for EVERY cell, the best number of coins that can be brought there." },
    { fn: (C) => { const n = C.length, m = C[0].length, F = C.map((row) => row.slice()); for (let i = 1; i < n; i++) for (let j = 1; j < m; j++) F[i][j] = C[i][j] + Math.max(F[i - 1][j], F[i][j - 1]); return F[n - 1][m - 1]; }, hint: "Check your first row and first column. A cell in the top row can only be reached from its left, so its value must include ALL the coins to its left — not just its own coin. Same for the first column, from above." },
    { fn: (C) => { const n = C.length, m = C[0].length, F = C.map((row) => row.slice()); for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { if (!i && !j) continue; F[i][j] = C[i][j] + (!i ? F[0][j - 1] : !j ? F[i - 1][0] : Math.max(F[i - 1][j], F[i - 1][j - 1])); } return F[n - 1][m - 1]; }, hint: "One of the two cells you look back at is not a real predecessor. The robot enters (i, j) from directly above, (i − 1, j), or directly from the left, (i, j − 1) — double-check the row index of your 'left' neighbor." },
  ],
  hints: [
    "The robot's last step into cell (i, j) came from either the cell above or the cell to the left. If you knew the best haul for those two cells, what would the best haul for (i, j) be?",
    "F[i, j] = max(F[i − 1, j], F[i, j − 1]) + C[i, j]. The first row and first column have only one possible predecessor, so fill them first as running sums.",
    "F[0, 0] ← C[0, 0]; fill row 0 with F[0, j] ← F[0, j − 1] + C[0, j] and column 0 the same way; then the double loop i ← 1 to n − 1, j ← 1 to m − 1. Return F[n − 1, m − 1].",
  ],
  starter: {
    pseudo: `ALGORITHM RobotCoins(C[0..n-1, 0..m-1])
    // Input: 0/1 board C with n rows and m columns (0-based)
    // Output: most coins collectable moving only right or down
    F ← matrix(n, m, 0)
    F[0, 0] ← C[0, 0]
    ...
    return F[n - 1, m - 1]`,
    js: `function RobotCoins(C) {
  const n = C.length, m = C[0].length;
}`,
  },
  solution: {
    pseudo: `ALGORITHM RobotCoins(C[0..n-1, 0..m-1])
    F ← matrix(n, m, 0)
    F[0, 0] ← C[0, 0]
    for j ← 1 to m - 1 do
        F[0, j] ← F[0, j - 1] + C[0, j]
    for i ← 1 to n - 1 do
        F[i, 0] ← F[i - 1, 0] + C[i, 0]
        for j ← 1 to m - 1 do
            F[i, j] ← max(F[i - 1, j], F[i, j - 1]) + C[i, j]
    return F[n - 1, m - 1]`,
    js: `function RobotCoins(C) {
  const n = C.length, m = C[0].length;
  const F = Array.from({ length: n }, () => Array(m).fill(0));
  F[0][0] = C[0][0];
  for (let j = 1; j < m; j++) F[0][j] = F[0][j - 1] + C[0][j];
  for (let i = 1; i < n; i++) {
    F[i][0] = F[i - 1][0] + C[i][0];
    for (let j = 1; j < m; j++) F[i][j] = Math.max(F[i - 1][j], F[i][j - 1]) + C[i][j];
  }
  return F[n - 1][m - 1];
}`,
    python: `def robot_coins(C):
    n, m = len(C), len(C[0])
    F = [[0] * m for _ in range(n)]
    F[0][0] = C[0][0]
    for j in range(1, m):
        F[0][j] = F[0][j - 1] + C[0][j]
    for i in range(1, n):
        F[i][0] = F[i - 1][0] + C[i][0]
        for j in range(1, m):
            F[i][j] = max(F[i - 1][j], F[i][j - 1]) + C[i][j]
    return F[n - 1][m - 1]`,
    explain: "Every path into (i, j) passes through (i − 1, j) or (i, j − 1), so the best haul there is the better of those two plus cᵢⱼ (Levitin eq. 8.5). One Θ(1) cell per board square: Θ(nm) time and space; backtracking from (n−1, m−1) recovers a path in Θ(n + m).",
  },
  complexity: "Θ(nm) time and space",
  followUp: "Levitin Exercise 8.1.5: some cells are blocked — give them −∞ (unreachable). Senior twist: two robots walk simultaneously and a coin counts once ('Cherry Pickup'); the state becomes (step, row₁, row₂).",
  distractors: ["F[i, j] ← max(F[i - 1, j - 1], F[i, j - 1]) + C[i, j]", "F[0, j] ← C[0, j]", "for j ← 0 to m do"],
  visual: "sims/dp-studio.html",
  lesson: "lessons/08-dynamic-programming/README.md",
});

ForgeProblems.add({
  id: "lattice-paths",
  title: "Counting Grid Paths Around Roadblocks",
  level: 4, chapter: 8, difficulty: 1,
  topics: ["dynamic programming", "2-D table", "counting", "grid paths"],
  strategy: "Dynamic programming (sum of predecessors)",
  source: "Levitin Exercises 8.1.5 & 8.1.7 (adapted; path counting)",
  summary: "Count the right/down paths from the top-left to the bottom-right corner of a grid with blocked cells.",
  statement: `
<p>In a city of perfectly straight streets, how many shortest routes lead from one corner to the opposite one? Without obstacles the answer
is a binomial coefficient; with roadblocks you need Dynamic Programming (DP): the number of routes into a crossing is the number into the
crossing above it <b>plus</b> the number into the crossing on its left (the classic "path counting" recurrence).</p>
<p>The grid <code>G</code> has <code>n</code> rows and <code>m</code> columns; <code>G[i, j] = 1</code> means that cell is <b>blocked</b>,
0 means it is open. Moving only <b>right</b> or <b>down</b>, count the paths from (0, 0) to (n−1, m−1) that never step on a blocked cell.
If the start or the finish is blocked, the answer is 0.</p>
<ul>
<li><b>Input:</b> <code>G</code> — a list of n rows of m zeros/ones, 1 ≤ n, m ≤ 12, <b>0-based</b> (<code>G[i, j]</code>).</li>
<li><b>Output:</b> the number of paths.</li>
</ul>`,
  entry: "LatticePaths",
  params: ["G"],
  tests: [
    { args: [[[0, 0, 0], [0, 0, 0], [0, 0, 0]]], expect: 6, explain: "No roadblocks: C(4, 2) = 6 paths through a 3 × 3 grid." },
    { args: [[[0, 0, 0], [0, 1, 0], [0, 0, 0]]], expect: 2, explain: "The center is blocked: only the two border routes remain." },
    { args: [[[0, 1, 0, 0], [0, 0, 0, 0]]], expect: 1, explain: "The block in the top row cuts off every cell to its right in that row." },
    { args: [[[1, 0], [0, 0]]], expect: 0, explain: "The start itself is blocked." },
    { args: [[[0]]], expect: 1, explain: "Start = finish: one (empty) path." },
    { args: [[[0], [1], [0]]], expect: 0 },
    { args: [[[0, 0], [1, 0], [0, 0]]], expect: 1, explain: "The block in the first column cuts off the cells below it." },
    { args: [[[0, 0, 0, 0], [0, 0, 1, 0], [0, 0, 0, 0], [1, 0, 0, 0]]], expect: 10 },
    { args: [[[0, 0], [0, 1]]], expect: 0, explain: "The finish is blocked." },
  ],
  random: { count: 25, gen: (r) => { const n = r.int(1, 9), m = r.int(1, 9); return [Array.from({ length: n }, () => Array.from({ length: m }, () => (r() < 0.18 ? 1 : 0)))]; } },
  reference: (G) => { const n = G.length, m = G[0].length, P = G.map((row) => row.map(() => 0)); for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) P[i][j] = G[i][j] ? 0 : !i && !j ? 1 : (i ? P[i - 1][j] : 0) + (j ? P[i][j - 1] : 0); return P[n - 1][m - 1]; },
  mutants: [
    { fn: (G) => { const n = G.length, m = G[0].length, P = G.map((row) => row.map(() => 0)); for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) P[i][j] = G[i][j] ? 0 : !i || !j ? 1 : P[i - 1][j] + P[i][j - 1]; return P[n - 1][m - 1]; }, hint: "Look at your first row and first column. Setting every open border cell to 1 forgets that a roadblock earlier in that row (or column) cuts off everything after it. Border cells need the same 'sum of predecessors' rule, with only one predecessor." },
    { fn: (G) => { const n = G.length, m = G[0].length; let c = 1; for (let t = 1; t <= n - 1; t++) c = (c * (m - 1 + t)) / t; return Math.round(c); }, hint: "Your answers match an empty grid — the roadblocks are being ignored. A blocked cell can't be part of any path, so its table entry must be 0." },
    { fn: (G) => { const n = G.length, m = G[0].length, P = G.map((row) => row.map(() => 0)); for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) P[i][j] = !i && !j ? 1 : G[i][j] ? 0 : (i ? P[i - 1][j] : 0) + (j ? P[i][j - 1] : 0); return P[n - 1][m - 1]; }, hint: "Almost! When the START cell is blocked there are no paths at all, but your table still seeds it with 1. Check the blocked test before the start-cell case." },
  ],
  hints: [
    "Every path into cell (i, j) arrives from exactly one of two cells. How does the number of paths into (i, j) relate to the numbers for those two cells?",
    "P[i, j] = 0 if the cell is blocked; P[0, 0] = 1 if open; otherwise P[i, j] = (paths into the cell above) + (paths into the cell on the left), treating neighbors outside the grid as 0.",
    "One double loop over i and j in row-major order. Handle 'blocked' first, then the start cell, then add up = P[i − 1, j] (only if i > 0) and left = P[i, j − 1] (only if j > 0).",
  ],
  starter: {
    pseudo: `ALGORITHM LatticePaths(G[0..n-1, 0..m-1])
    // Input: grid G, G[i, j] = 1 means blocked (0-based)
    // Output: number of right/down paths from (0, 0) to (n-1, m-1)
    P ← matrix(n, m, 0)
    for i ← 0 to n - 1 do
        for j ← 0 to m - 1 do
            ...
    return P[n - 1, m - 1]`,
    js: `function LatticePaths(G) {
  const n = G.length, m = G[0].length;
}`,
  },
  solution: {
    pseudo: `ALGORITHM LatticePaths(G[0..n-1, 0..m-1])
    P ← matrix(n, m, 0)
    for i ← 0 to n - 1 do
        for j ← 0 to m - 1 do
            if G[i, j] = 1 then
                P[i, j] ← 0
            else if i = 0 and j = 0 then
                P[i, j] ← 1
            else
                up ← 0
                left ← 0
                if i > 0 then
                    up ← P[i - 1, j]
                if j > 0 then
                    left ← P[i, j - 1]
                P[i, j] ← up + left
    return P[n - 1, m - 1]`,
    js: `function LatticePaths(G) {
  const n = G.length, m = G[0].length;
  const P = Array.from({ length: n }, () => Array(m).fill(0));
  for (let i = 0; i < n; i++)
    for (let j = 0; j < m; j++) {
      if (G[i][j] === 1) P[i][j] = 0;
      else if (i === 0 && j === 0) P[i][j] = 1;
      else P[i][j] = (i > 0 ? P[i - 1][j] : 0) + (j > 0 ? P[i][j - 1] : 0);
    }
  return P[n - 1][m - 1];
}`,
    python: `def lattice_paths(G):
    n, m = len(G), len(G[0])
    P = [[0] * m for _ in range(n)]
    for i in range(n):
        for j in range(m):
            if G[i][j] == 1:
                P[i][j] = 0
            elif i == 0 and j == 0:
                P[i][j] = 1
            else:
                up = P[i - 1][j] if i > 0 else 0
                left = P[i][j - 1] if j > 0 else 0
                P[i][j] = up + left
    return P[n - 1][m - 1]`,
    explain: "The paths into an open cell split into two disjoint groups by their last move (from above or from the left), so their counts add; a blocked cell has none. Each of the nm cells takes Θ(1): Θ(nm) time and space. With no blocks the table is Pascal's triangle turned sideways, giving C(n + m − 2, n − 1).",
  },
  complexity: "Θ(nm) time and space",
  followUp: "Only the previous row is ever read, so a single array of length m is enough — Θ(m) space. Where it shows up: counting routes in a street grid, and (with probabilities instead of counts) the chance that a random walk hits a target.",
  distractors: ["P[0, j] ← 1", "P[i, j] ← up * left", "if G[i, j] = 0 then"],
  visual: "sims/dp-studio.html",
  lesson: "lessons/08-dynamic-programming/README.md",
});

ForgeProblems.add({
  id: "binomial-coefficient",
  title: "Binomial Coefficient by Pascal's Rule",
  level: 4, chapter: 8, difficulty: 1,
  topics: ["dynamic programming", "2-D table", "combinatorics"],
  strategy: "Dynamic programming (Pascal's triangle)",
  source: "Levitin Exercise 8.1.9 (adapted)",
  summary: "Compute C(n, k) using only additions, by filling Pascal's triangle.",
  statement: `
<p>The binomial coefficient <code>C(n, k)</code> counts the k-element subsets of an n-element set. Pascal's rule
<code>C(n, k) = C(n − 1, k − 1) + C(n − 1, k)</code> with <code>C(n, 0) = C(n, n) = 1</code> is a textbook example of overlapping
subproblems: plain recursion recomputes the same entries over and over, while a table computes each once (Levitin Exercise 8.1.9).</p>
<p>Return <code>C(n, k)</code> by filling rows 0..n of Pascal's triangle (columns 0..k are enough). Use <b>only additions</b> — no
factorials and no multiplication.</p>
<ul>
<li><b>Input:</b> integers 0 ≤ k ≤ n ≤ 32.</li>
<li><b>Output:</b> C(n, k).</li>
</ul>`,
  entry: "Binomial",
  params: ["n", "k"],
  tests: [
    { args: [5, 2], expect: 10, explain: "Row 5 of Pascal's triangle is 1 5 10 10 5 1." },
    { args: [4, 0], expect: 1, explain: "One way to choose nothing." },
    { args: [6, 6], expect: 1, explain: "One way to choose everything." },
    { args: [0, 0], expect: 1 },
    { args: [7, 1], expect: 7 },
    { args: [10, 5], expect: 252 },
    { args: [32, 16], expect: 601080390, explain: "Far too many calls for plain recursion — but only ≈ 300 table cells." },
    { args: [9, 3], expect: 84 },
  ],
  random: { count: 25, gen: (r) => { const n = r.int(0, 30); return [n, r.int(0, n)]; } },
  reference: (n, k) => { const C = []; for (let i = 0; i <= n; i++) { C[i] = []; for (let j = 0; j <= Math.min(i, k); j++) C[i][j] = j === 0 || j === i ? 1 : C[i - 1][j - 1] + C[i - 1][j]; } return C[n][k]; },
  growth: { metric: "steps", sizes: [8, 16, 32, 64, 128], gen: (r, n) => [n, n >> 1], expect: "n^2" },
  mutants: [
    { fn: (n, k) => { if (n === 0) return k === 0 ? 1 : 0; const C = []; for (let i = 0; i <= n - 1; i++) { C[i] = []; for (let j = 0; j <= Math.min(i, k); j++) C[i][j] = j === 0 || j === i ? 1 : C[i - 1][j - 1] + C[i - 1][j]; } const v = C[n - 1][k]; return v === undefined ? 0 : v; }, hint: "Your answers look like C(n − 1, k): the table stops one row early. Rows are numbered 0..n, so the table needs n + 1 rows and the outer loop must reach i = n." },
    { fn: (n, k) => { const C = []; for (let i = 0; i <= n; i++) { C[i] = []; for (let j = 0; j <= Math.min(i, k); j++) C[i][j] = j === 0 || j === i ? 1 : C[i - 1][j - 1] + C[i][j - 1]; } return C[n][k]; }, hint: "C(5, 2) should be 10. One of the two cells you add is in the wrong row: both terms of Pascal's rule come from the row ABOVE (i − 1), one at column j − 1 and one at column j." },
    { fn: (n, k) => { const C = [Array(k + 1).fill(1)]; for (let i = 1; i <= n; i++) { C[i] = [1]; for (let j = 1; j <= k; j++) C[i][j] = C[i - 1][j - 1] + C[i - 1][j]; } return C[n][k]; }, hint: "Your row 0 seems to be all ones (like a grid-path table). In Pascal's triangle row 0 is just '1' — C(0, j) = 0 for j > 0 — so only fill columns j ≤ min(i, k), with 1s at j = 0 and j = i." },
  ],
  lints: [
    { re: "[*×]|\\bpow\\s*\\(|factorial", lang: "pseudo", message: "This exercise asks for additions only (Pascal's rule). Multiplying or using factorials is a different algorithm — and factorials overflow long before the table does." },
  ],
  hints: [
    "Pascal's rule builds row i from row i − 1. Which entries of row i − 1 do you need for C(i, j), and what are the entries at the two ends of every row?",
    "Fill a table C[0..n, 0..k] row by row: for each i, for j from 0 to min(i, k): if j = 0 or j = i the entry is 1, otherwise add two entries from row i − 1.",
    "C[i, j] ← C[i − 1, j − 1] + C[i − 1, j]. Return C[n, k].",
  ],
  starter: {
    pseudo: `ALGORITHM Binomial(n, k)
    // Input: integers 0 ≤ k ≤ n
    // Output: C(n, k), using additions only
    C ← matrix(n + 1, k + 1, 0)
    for i ← 0 to n do
        ...
    return C[n, k]`,
    js: `function Binomial(n, k) {
  // Pascal's triangle, additions only
}`,
  },
  solution: {
    pseudo: `ALGORITHM Binomial(n, k)
    C ← matrix(n + 1, k + 1, 0)
    for i ← 0 to n do
        for j ← 0 to min(i, k) do
            if j = 0 or j = i then
                C[i, j] ← 1
            else
                C[i, j] ← C[i - 1, j - 1] + C[i - 1, j]
    return C[n, k]`,
    js: `function Binomial(n, k) {
  const C = Array.from({ length: n + 1 }, () => Array(k + 1).fill(0));
  for (let i = 0; i <= n; i++)
    for (let j = 0; j <= Math.min(i, k); j++)
      C[i][j] = j === 0 || j === i ? 1 : C[i - 1][j - 1] + C[i - 1][j];
  return C[n][k];
}`,
    python: `def binomial(n, k):
    C = [[0] * (k + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        for j in range(min(i, k) + 1):
            if j == 0 or j == i:
                C[i][j] = 1
            else:
                C[i][j] = C[i - 1][j - 1] + C[i - 1][j]
    return C[n][k]`,
    explain: "A k-subset of {1..n} either contains n (choose k − 1 more from n − 1) or not (choose k from n − 1), which is Pascal's rule. The table has about nk cells filled with one addition each: (k − 1)k/2 + k(n − k) additions ∈ Θ(nk) — Θ(n²) when k ≈ n/2 — versus Θ(C(n, k)) calls for plain recursion.",
  },
  complexity: "Θ(nk) time, Θ(nk) space (Θ(k) with a single row updated right-to-left)",
  followUp: "Keep only ONE row of length k + 1 and update it from right to left so you never overwrite a value you still need — Θ(k) space. Levitin Exercise 8.2.8 asks why a memory function is unattractive here: every table entry is needed anyway.",
  distractors: ["C[i, j] ← C[i - 1, j - 1] + C[i, j - 1]", "for i ← 0 to n - 1 do", "for j ← 0 to k do"],
  visual: "sims/dp-studio.html",
  lesson: "lessons/08-dynamic-programming/README.md",
});

/* =========================================================================
   Difficulty 2 — choices, reconstruction, 2-D tables over items
   ========================================================================= */

ForgeProblems.add({
  id: "coin-row-choices",
  title: "Coin-Row: Which Coins?",
  level: 4, chapter: 8, difficulty: 2,
  topics: ["dynamic programming", "backtracking the table", "solution reconstruction"],
  strategy: "Dynamic programming + backtrace",
  source: "Levitin §8.1, Example 1 (finding the coins)",
  summary: "Return the positions of an optimal set of non-adjacent coins, not just its value.",
  statement: `
<p>A Dynamic Programming (DP) table tells you the best <b>value</b>; interviews and real systems usually want the <b>solution itself</b>.
The trick is to <b>backtrace</b>: walk the table from the end and ask which option produced each entry (Levitin §8.1).</p>
<p>Same rules as the coin-row problem: coins <code>C[1..n]</code> (positive integers), never take two neighbors, maximize the total.
Return the <b>positions</b> (1-based, like <code>C[1..n]</code>) of the coins in one optimal selection, in increasing order.</p>
<ul>
<li><b>Input:</b> <code>C</code> — 0 ≤ n ≤ 40 positive integers (1-based view <code>C[1..n]</code>).</li>
<li><b>Output:</b> a list of positions. Any optimal selection is accepted; an empty row gives <code>[]</code>.</li>
</ul>
<p>Example: <code>[5, 1, 2, 10, 6, 2]</code> → <code>[1, 4, 6]</code> (5 + 10 + 2 = 17).</p>`,
  entry: "CoinRowChoices",
  params: ["C"],
  tests: [
    { args: [[5, 1, 2, 10, 6, 2]], expect: [1, 4, 6], explain: "The book's example: coins 5, 10 and 2." },
    { args: [[10, 1, 1, 10]], expect: [1, 4], explain: "Skip two coins in the middle." },
    { args: [[]], expect: [], explain: "No coins: empty selection." },
    { args: [[7]], expect: [1] },
    { args: [[3, 4, 3]], expect: [1, 3], explain: "The biggest coin is NOT in the best set." },
    { args: [[1, 2]], expect: [2] },
    { args: [[2, 7, 9, 3, 1]], expect: [1, 3, 5] },
    { args: [[6, 1, 1, 6, 1, 1, 6]], expect: [1, 4, 7] },
  ],
  random: { count: 25, gen: (r, i) => [r.array(i < 3 ? i : 2 + (i % 18) * 2, 1, 15)] },
  verify: (got, [C]) => {
    if (!Array.isArray(got)) return "Return a list of coin positions.";
    const n = C.length, best = DP.coinRow(C)[n];
    const P = got.slice().sort((a, b) => a - b);
    let sum = 0;
    for (let k = 0; k < P.length; k++) {
      if (!Number.isInteger(P[k]) || P[k] < 1 || P[k] > n) return `Position ${P[k]} is not between 1 and n = ${n} — positions are 1-based, like C[1..n].`;
      if (k && P[k] === P[k - 1]) return `Position ${P[k]} appears twice.`;
      if (k && P[k] === P[k - 1] + 1) return `Coins ${P[k - 1]} and ${P[k]} are neighbors — that's not allowed.`;
      sum += C[P[k] - 1];
    }
    if (sum !== best) return `Your coins add up to ${sum}, but the best possible total is ${best}.`;
    return true;
  },
  mutants: [
    { fn: (C) => { const F = DP.coinRow(C), out = []; let i = C.length; while (i >= 1) { if (F[i] > F[i - 1]) { out.push(i - 1); i -= 2; } else i -= 1; } return out.reverse(); }, hint: "Your selection looks right but every position is one too small (you may be reporting 0-based indexes). Positions here are 1-based: the first coin is position 1." },
    { fn: (C) => { const F = DP.coinRow(C), out = []; for (let i = C.length; i >= 1; i--) if (F[i] > F[i - 1]) out.push(i); return out.reverse(); }, hint: "Your answer contains two neighboring coins. Once you decide coin i is in the set, coin i − 1 cannot be — so where should the backtrace jump next?" },
    { fn: (C) => { const n = C.length, blocked = Array(n).fill(false), out = []; const order = C.map((_, i) => i).sort((a, b) => C[b] - C[a] || a - b); for (const i of order) if (!blocked[i]) { out.push(i + 1); blocked[i] = true; if (i > 0) blocked[i - 1] = true; if (i < n - 1) blocked[i + 1] = true; } return out.sort((a, b) => a - b); }, hint: "This is the greedy pick (largest coin first, then the largest still allowed). On [3, 4, 3] it takes the 4 and loses both 3s. Build the DP table first, then read the choices back from it." },
  ],
  hints: [
    "Fill the coin-row table F first. Then stand at the end: for coin i, how can you tell from F alone whether coin i had to be taken?",
    "If F[i] = F[i − 1], skipping coin i is optimal. If F[i] > F[i − 1], coin i must be in the set, which means coin i − 1 is out.",
    "Backtrace with i ← n; while i ≥ 1: if F[i] > F[i − 1] then record i and set i ← i − 2, else i ← i − 1. You collect positions from right to left, so reverse the list at the end.",
  ],
  starter: {
    pseudo: `ALGORITHM CoinRowChoices(C[1..n])
    // Output: 1-based positions of an optimal set of non-adjacent coins, increasing
    F ← array(n + 1, 0)
    ...
    picks ← []
    i ← n
    ...
    return picks`,
    js: `function CoinRowChoices(C) {
  // return 1-based positions, in increasing order
}`,
  },
  solution: {
    pseudo: `ALGORITHM CoinRowChoices(C[1..n])
    F ← array(n + 1, 0)
    if n ≥ 1 then
        F[1] ← C[1]
    for i ← 2 to n do
        F[i] ← max(C[i] + F[i - 2], F[i - 1])
    picks ← []
    i ← n
    while i ≥ 1 do
        if F[i] > F[i - 1] then
            append(picks, i)
            i ← i - 2
        else
            i ← i - 1
    return reverse(picks)`,
    js: `function CoinRowChoices(C) {
  const n = C.length, F = Array(n + 1).fill(0);
  if (n >= 1) F[1] = C[0];
  for (let i = 2; i <= n; i++) F[i] = Math.max(C[i - 1] + F[i - 2], F[i - 1]);
  const picks = [];
  let i = n;
  while (i >= 1) {
    if (F[i] > F[i - 1]) { picks.push(i); i -= 2; } else i -= 1;
  }
  return picks.reverse();
}`,
    python: `def coin_row_choices(C):
    n = len(C)
    F = [0] * (n + 1)
    if n >= 1:
        F[1] = C[0]
    for i in range(2, n + 1):
        F[i] = max(C[i - 1] + F[i - 2], F[i - 1])
    picks, i = [], n
    while i >= 1:
        if F[i] > F[i - 1]:
            picks.append(i)
            i -= 2
        else:
            i -= 1
    return picks[::-1]`,
    explain: "F[i] > F[i − 1] means the best total for the first i coins cannot be reached without coin i, so coin i is in an optimal set and coin i − 1 is excluded; otherwise skipping i loses nothing. The table costs Θ(n), and the backtrace moves left at every step: Θ(n) more — exactly as Levitin notes for recovering the coins.",
  },
  complexity: "Θ(n) time and space",
  followUp: "Record the winning choice in a separate array while you fill F so the backtrace needs no comparisons. Senior twist: return the LEXICOGRAPHICALLY smallest optimal set, or count how many optimal sets exist (a second DP over the same table).",
  distractors: ["i ← i - 1", "if F[i] ≥ F[i - 1] then", "append(picks, i - 1)"],
  visual: "sims/dp-studio.html",
  lesson: "lessons/08-dynamic-programming/README.md",
});

ForgeProblems.add({
  id: "coin-change-ways",
  title: "Coin Change: Count the Ways",
  level: 4, chapter: 8, difficulty: 2,
  topics: ["dynamic programming", "1-D table", "counting", "loop order"],
  strategy: "Dynamic programming (unbounded items, counting)",
  source: "Interview classic · Levitin §8.1 (change-making) variant",
  summary: "How many different combinations of coins make amount n? Order doesn't matter.",
  statement: `
<p>Change-making asked for the <b>fewest</b> coins. Here we ask <b>how many different ways</b> there are — a counting Dynamic Programming (DP)
problem where one tiny detail (the order of the two loops) decides whether you count combinations or sequences.</p>
<p>Given distinct coin values <code>D[0..m-1]</code> (unlimited supply of each) and an amount <code>n</code>, return the number of
<b>combinations</b> of coins that add up to <code>n</code>. Two ways that use the same coins in a different order are the <b>same</b>
combination: for coins {1, 2} and n = 3, the ways are 1+1+1 and 1+2, so the answer is 2 (not 3).</p>
<ul>
<li><b>Input:</b> <code>D</code> — 1 ≤ m ≤ 6 distinct positive integers ≤ 25, in any order (0-based); <code>n</code> — 0 ≤ n ≤ 60.</li>
<li><b>Output:</b> the number of combinations (1 for n = 0: the empty combination).</li>
</ul>`,
  entry: "CoinWays",
  params: ["D", "n"],
  tests: [
    { args: [[1, 2, 5], 5], expect: 4, explain: "5 · 2+2+1 · 2+1+1+1 · 1+1+1+1+1." },
    { args: [[2], 3], expect: 0, explain: "Odd amount with only 2s: impossible." },
    { args: [[3, 5, 7], 0], expect: 1, explain: "Paying 0: the empty combination." },
    { args: [[1, 2, 3], 4], expect: 4, explain: "1111 · 112 · 22 · 13." },
    { args: [[2, 3], 7], expect: 1, explain: "Only 2 + 2 + 3." },
    { args: [[10], 10], expect: 1 },
    { args: [[5, 2, 1], 5], expect: 4, explain: "The coin order in the input doesn't matter." },
    { args: [[1, 5, 10, 25], 30], expect: 18 },
  ],
  random: { count: 25, gen: (r, i) => [r.distinct(1 + (i % 5), 1, 20), r.int(0, 50)] },
  reference: (D, n) => { const W = Array(n + 1).fill(0); W[0] = 1; for (const d of D) for (let a = d; a <= n; a++) W[a] += W[a - d]; return W[n]; },
  growth: { metric: "steps", sizes: [40, 80, 160, 320, 640], gen: (r, n) => [[1, 2, 5], n], expect: "n" },
  mutants: [
    { fn: (D, n) => { const W = Array(n + 1).fill(0); W[0] = 1; for (let a = 1; a <= n; a++) for (const d of D) if (d <= a) W[a] += W[a - d]; return W[n]; }, hint: "You're counting ORDERED sequences: for coins {1, 2} and n = 3 you count 1+2 and 2+1 separately. Think about which loop is outside. If you finish all amounts for one coin before moving to the next coin, each combination is built in only one order." },
    { fn: (D, n) => { const W = Array(n + 1).fill(0); W[0] = 1; for (const d of D) for (let a = n; a >= d; a--) W[a] += W[a - d]; return W[n]; }, hint: "Your counts treat every coin as usable at most once (like 0/1 knapsack). The supply is unlimited: when you update amount a with coin d, the value you read at a − d should already include coin d. Check the direction of your amount loop." },
    { fn: (D, n) => 0, hint: "Every answer is 0. Every count is built from the count for amount 0 — what is the number of ways to pay nothing?" },
  ],
  hints: [
    "Process the coins one at a time. After you've considered only the first few coin types, how many ways can you pay each amount 0..n?",
    "W[a] = number of combinations for amount a using the coins seen so far. Start with W[0] = 1. Adding coin d: every combination for a − d (which may already use d) extends to one for a.",
    "for each coin d (OUTER loop): for a ← d to n: W[a] ← W[a] + W[a − d]. Return W[n].",
  ],
  starter: {
    pseudo: `ALGORITHM CoinWays(D[0..m-1], n)
    // Input: distinct coin values D (unlimited supply), amount n ≥ 0
    // Output: number of combinations (order doesn't matter) adding to n
    W ← array(n + 1, 0)
    ...
    return W[n]`,
    js: `function CoinWays(D, n) {
}`,
  },
  solution: {
    pseudo: `ALGORITHM CoinWays(D[0..m-1], n)
    W ← array(n + 1, 0)
    W[0] ← 1
    for each d in D do
        for a ← d to n do
            W[a] ← W[a] + W[a - d]
    return W[n]`,
    js: `function CoinWays(D, n) {
  const W = Array(n + 1).fill(0);
  W[0] = 1;
  for (const d of D)
    for (let a = d; a <= n; a++) W[a] += W[a - d];
  return W[n];
}`,
    python: `def coin_ways(D, n):
    W = [0] * (n + 1)
    W[0] = 1
    for d in D:
        for a in range(d, n + 1):
            W[a] += W[a - d]
    return W[n]`,
    explain: "This is a 2-D table T[j][a] (ways using the first j coin types) squeezed into one row: T[j][a] = T[j − 1][a] + T[j][a − d_j] — combinations without coin j plus those with at least one. Because coins are introduced in a fixed order, each multiset is counted once. Θ(mn) time, Θ(n) space.",
  },
  complexity: "Θ(mn) time, Θ(n) space",
  followUp: "Swap the loops and you count ordered sequences (compositions) instead — that version is the climbing-stairs recurrence with step sizes D. Knowing which loop order counts what is a favorite senior interview probe.",
  distractors: ["for a ← n downto d do", "W[0] ← 0", "W[a] ← W[a] + W[a - 1]"],
  visual: "sims/dp-studio.html",
  lesson: "lessons/08-dynamic-programming/README.md",
});

ForgeProblems.add({
  id: "rod-cutting",
  title: "Rod Cutting",
  level: 4, chapter: 8, difficulty: 2,
  topics: ["dynamic programming", "1-D table", "unbounded choices"],
  strategy: "Dynamic programming (best first cut)",
  source: "Levitin Exercise 8.1.6 (adapted)",
  summary: "Cut a rod of length n into integer pieces to maximize the total sale price.",
  statement: `
<p>A factory sells rod pieces; a piece of length <code>k</code> sells for <code>p[k]</code>. Cutting is free. How should a rod of length
<code>n</code> be cut? The best plan's <b>first piece</b> has some length k, and the rest must be cut optimally — a textbook use of
Bellman's principle of optimality (Levitin Exercise 8.1.6).</p>
<ul>
<li><b>Input:</b> prices <code>p[1..n]</code> (1-based view; <code>p[k]</code> is the price of a piece of length k), 1 ≤ n ≤ 40,
non-negative integers.</li>
<li><b>Output:</b> the maximum total price for a rod of length n (selling it uncut is allowed).</li>
</ul>
<p>Example: <code>p = [1, 5, 8, 9]</code> (n = 4) → 10, by cutting into 2 + 2.</p>`,
  entry: "RodCutting",
  params: ["p"],
  tests: [
    { args: [[1, 5, 8, 9]], expect: 10, explain: "2 + 2 gives 5 + 5. The best price-per-unit piece (length 3) leads to only 8 + 1 = 9." },
    { args: [[3]], expect: 3, explain: "A rod of length 1 can only be sold whole." },
    { args: [[1, 1, 1, 10]], expect: 10, explain: "Sometimes not cutting is best." },
    { args: [[2, 3, 4, 5, 6]], expect: 10, explain: "Five pieces of length 1." },
    { args: [[1, 5, 8, 9, 10, 17, 17, 20]], expect: 22, explain: "2 + 6 → 5 + 17." },
    { args: [[0, 0, 7]], expect: 7 },
    { args: [[3, 5, 8, 9, 10, 17, 17, 20]], expect: 24 },
  ],
  random: { count: 25, gen: (r, i) => { const n = 1 + (i % 20); let base = 0; return [Array.from({ length: n }, (_, k) => (base = Math.max(base, r.int(0, 3 * (k + 1)) + (k ? 0 : 1))))]; } },
  reference: (p) => { const n = p.length, R = Array(n + 1).fill(0); for (let i = 1; i <= n; i++) for (let k = 1; k <= i; k++) R[i] = Math.max(R[i], p[k - 1] + R[i - k]); return R[n]; },
  growth: { metric: "steps", sizes: [8, 16, 32, 64, 128], gen: (r, n) => [r.sorted(n, 1, 4 * n)], expect: "n^2" },
  mutants: [
    { fn: (p) => { let left = p.length, s = 0; while (left > 0) { let bk = 1; for (let k = 1; k <= left; k++) if (p[k - 1] / k > p[bk - 1] / bk) bk = k; s += p[bk - 1]; left -= bk; } return s; }, hint: "This is the greedy plan: keep cutting the piece with the best price per unit length. For p = [1, 5, 8, 9] it cuts 3 + 1 (worth 9), but 2 + 2 is worth 10. Try EVERY length for the first piece and let the table handle the rest." },
    { fn: (p) => p[p.length - 1], hint: "You return p[n] — the price of the uncut rod. The whole point is that cutting may pay more: consider every possible length k of the first piece, plus the best value for the remaining n − k." },
    { fn: (p) => { const n = p.length, R = Array(n + 1).fill(0); for (let i = 1; i <= n; i++) for (let k = 1; k <= i - 1; k++) R[i] = Math.max(R[i], p[k - 1] + R[i - k]); return R[n]; }, hint: "Your inner loop never lets the first piece be the WHOLE remaining rod (k = i), so R[1] stays 0 and uncut pieces are never sold. Let k run all the way to i." },
  ],
  hints: [
    "Imagine the best way to cut the rod. Its first piece has some length k between 1 and n. What must be true about how the remaining n − k units are cut?",
    "Let R[i] = best revenue for a rod of length i, with R[0] = 0. Then R[i] = max over k = 1..i of (p[k] + R[i − k]). Fill i = 1, 2, …, n.",
    "Two nested loops: for i ← 1 to n, start best ← 0, and for k ← 1 to i take best ← max(best, p[k] + R[i − k]); then store R[i] ← best.",
  ],
  starter: {
    pseudo: `ALGORITHM RodCutting(p[1..n])
    // Input: p[k] = price of a piece of length k (1-based), rod length n
    // Output: maximum total price
    R ← array(n + 1, 0)
    for i ← 1 to n do
        ...
    return R[n]`,
    js: `function RodCutting(p) {
  // p[k - 1] is the price of a piece of length k in JavaScript
}`,
  },
  solution: {
    pseudo: `ALGORITHM RodCutting(p[1..n])
    R ← array(n + 1, 0)
    for i ← 1 to n do
        best ← 0
        for k ← 1 to i do
            best ← max(best, p[k] + R[i - k])
        R[i] ← best
    return R[n]`,
    js: `function RodCutting(p) {
  const n = p.length, R = Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    let best = 0;
    for (let k = 1; k <= i; k++) best = Math.max(best, p[k - 1] + R[i - k]);
    R[i] = best;
  }
  return R[n];
}`,
    python: `def rod_cutting(p):
    n = len(p)
    R = [0] * (n + 1)
    for i in range(1, n + 1):
        best = 0
        for k in range(1, i + 1):
            best = max(best, p[k - 1] + R[i - k])
        R[i] = best
    return R[n]`,
    explain: "Every cutting plan has a first piece of some length k, and the remainder must itself be cut optimally, so R(i) = max₁≤k≤i {p_k + R(i − k)}. Filling i = 1..n costs Σ i = n(n + 1)/2 ∈ Θ(n²) time and Θ(n) space.",
  },
  complexity: "Θ(n²) time, Θ(n) space",
  followUp: "Store the best first cut for each length and print the actual pieces. Add a fixed cost c per cut and see how the recurrence changes. The same 'best first piece' shape solves word-break and line-justification problems in text editors.",
  distractors: ["for k ← 1 to i - 1 do", "best ← max(best, p[k] + R[k])", "R[i] ← p[i]"],
  visual: "sims/dp-studio.html",
  lesson: "lessons/08-dynamic-programming/README.md",
});

ForgeProblems.add({
  id: "knapsack-dp",
  title: "0/1 Knapsack (Bottom-Up Table)",
  level: 4, chapter: 8, difficulty: 2,
  topics: ["dynamic programming", "2-D table", "knapsack", "optimization"],
  strategy: "Dynamic programming (item × capacity table)",
  source: "Levitin §8.2, Example 1",
  summary: "Find the most valuable subset of items that fits in a knapsack of capacity W.",
  statement: `
<p>The knapsack problem took exponential time by exhaustive search (Levitin §3.4). With integer weights, Dynamic Programming (DP) solves it
in Θ(nW) by filling a table indexed by <b>how many items</b> you may use and <b>how much capacity</b> is left (Levitin §8.2).</p>
<p>Items 1..n have positive integer weights <code>w[1..n]</code> and values <code>v[1..n]</code>. Each item can be taken <b>at most once</b>.
Return the <b>largest total value</b> of a subset whose total weight is at most <code>W</code>.</p>
<ul>
<li><b>Input:</b> <code>w</code>, <code>v</code> — lists of the same length 1 ≤ n ≤ 12 (1-based views <code>w[1..n]</code>, <code>v[1..n]</code>);
<code>W</code> — capacity, 1 ≤ W ≤ 60.</li>
<li><b>Output:</b> the maximum value.</li>
</ul>`,
  entry: "Knapsack",
  params: ["w", "v", "W"],
  tests: [
    { args: [[2, 1, 3, 2], [12, 10, 20, 15], 5], expect: 37, explain: "The book's instance: items 1, 2 and 4 (weight 5, value 37)." },
    { args: [[6, 5, 5], [36, 25, 25], 10], expect: 50, explain: "The best value-per-weight item (6 kg for 36) blocks the better pair of 5 kg items." },
    { args: [[3], [10], 9], expect: 10, explain: "Only ONE copy of each item — not three." },
    { args: [[5], [10], 4], expect: 0, explain: "Nothing fits." },
    { args: [[3, 2, 1, 4, 5], [25, 20, 15, 40, 50], 6], expect: 65, explain: "Levitin Exercise 8.2.1: items 3 and 5." },
    { args: [[4, 4], [5, 5], 8], expect: 10, explain: "Both items fit exactly — capacity W itself counts." },
    { args: [[1, 2, 3], [6, 10, 12], 5], expect: 22 },
  ],
  random: { count: 25, gen: (r, i) => { const n = 1 + (i % 10); return [r.array(n, 1, 12), r.array(n, 1, 50), r.int(1, 30)]; } },
  reference: (w, v, W) => DP.knapTable(w, v, W)[w.length][W],
  growth: { metric: "steps", sizes: [4, 8, 16, 32, 64], gen: (r, n) => [r.array(n, 1, 10), r.array(n, 1, 40), n], expect: "n^2" },
  mutants: [
    { fn: (w, v, W) => DP.greedyRatio(w, v, W).reduce((s, i) => s + v[i - 1], 0), hint: "Your answers match the greedy rule 'take items by best value per unit weight while they fit'. That rule is only right for FRACTIONAL knapsack. With whole items, compare 'take item i' against 'skip item i' for every capacity." },
    { fn: (w, v, W) => { const n = w.length, F = Array.from({ length: n + 1 }, () => Array(W + 1).fill(0)); for (let i = 1; i <= n; i++) for (let j = 1; j <= W; j++) F[i][j] = j >= w[i - 1] ? Math.max(F[i - 1][j], v[i - 1] + F[i][j - w[i - 1]]) : F[i - 1][j]; return F[n][W]; }, hint: "Some items are being used more than once (for w = [3], v = [10], W = 9 you get 30). When you take item i, the remaining capacity may only be filled with items 1..i − 1 — which ROW of the table should you read from?" },
    { fn: (w, v, W) => DP.knapTable(w.slice(0, -1), v.slice(0, -1), W)[w.length - 1][W], hint: "It looks like the last item is never considered. The table needs rows 0..n (n + 1 of them), and the item loop has to reach i = n." },
    { fn: (w, v, W) => DP.knapTable(w, v, W - 1)[w.length][W - 1], hint: "Your answers equal the best value for capacity W − 1. Two usual causes: the table stops one column short (it needs columns 0..W and the answer is in column W), or the fit test is too strict — an item of weight exactly j still fits, so test j ≥ w[i] (or j − w[i] ≥ 0), not j > w[i]." },
  ],
  hints: [
    "Look at the LAST item. The best subset of items 1..i for capacity j either skips item i or takes it. What does each case leave you to solve?",
    "F[i, j] = best value using items 1..i with capacity j. Row 0 and column 0 are all 0. If w[i] > j, item i can't fit: F[i, j] = F[i − 1, j]; otherwise take the max of skipping and taking.",
    "Taking item i gives v[i] + F[i − 1, j − w[i]] — note row i − 1, so the item is used once. Fill with for i ← 1 to n, for j ← 1 to W, and return F[n, W].",
  ],
  starter: {
    pseudo: `ALGORITHM Knapsack(w[1..n], v[1..n], W)
    // Input: weights w[1..n], values v[1..n] (1-based), capacity W
    // Output: the most valuable total that fits (each item at most once)
    F ← matrix(n + 1, W + 1, 0)
    for i ← 1 to n do
        for j ← 1 to W do
            ...
    return F[n, W]`,
    js: `function Knapsack(w, v, W) {
  // w[i - 1], v[i - 1] describe item i in JavaScript
}`,
  },
  solution: {
    pseudo: `ALGORITHM Knapsack(w[1..n], v[1..n], W)
    F ← matrix(n + 1, W + 1, 0)
    for i ← 1 to n do
        for j ← 1 to W do
            if j ≥ w[i] then
                F[i, j] ← max(F[i - 1, j], v[i] + F[i - 1, j - w[i]])
            else
                F[i, j] ← F[i - 1, j]
    return F[n, W]`,
    js: `function Knapsack(w, v, W) {
  const n = w.length;
  const F = Array.from({ length: n + 1 }, () => Array(W + 1).fill(0));
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= W; j++)
      F[i][j] = j >= w[i - 1] ? Math.max(F[i - 1][j], v[i - 1] + F[i - 1][j - w[i - 1]]) : F[i - 1][j];
  return F[n][W];
}`,
    python: `def knapsack(w, v, W):
    n = len(w)
    F = [[0] * (W + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for j in range(1, W + 1):
            if j >= w[i - 1]:
                F[i][j] = max(F[i - 1][j], v[i - 1] + F[i - 1][j - w[i - 1]])
            else:
                F[i][j] = F[i - 1][j]
    return F[n][W]`,
    explain: "Subsets of the first i items either skip item i (value F(i − 1, j)) or include it (v_i plus an optimal subset of the first i − 1 items for capacity j − w_i) — Levitin's recurrence 8.6 with F(0, j) = F(i, 0) = 0. There are nW cells at Θ(1) each: Θ(nW) time and space. That is 'pseudo-polynomial': polynomial in the VALUE W, exponential in its number of bits.",
  },
  complexity: "Θ(nW) time and space",
  followUp: "Squeeze it into ONE row of length W + 1 by looping j from W down to w[i] — then flip the loop direction and you've solved the unbounded knapsack (Levitin Exercise 8.2.5). Cloud schedulers and budget allocators use exactly this table.",
  distractors: ["F[i, j] ← max(F[i - 1, j], v[i] + F[i, j - w[i]])", "for j ← 1 to W - 1 do", "if j > w[i] then"],
  visual: "sims/dp-studio.html",
  lesson: "lessons/08-dynamic-programming/README.md",
});

ForgeProblems.add({
  id: "subset-sum-dp",
  title: "Subset Sum (Boolean Table)",
  level: 4, chapter: 8, difficulty: 2,
  topics: ["dynamic programming", "2-D table", "subset sum", "decision problem"],
  strategy: "Dynamic programming (reachable sums)",
  source: "Interview classic · Levitin §8.2 knapsack table with true/false entries (cf. §12.1 subset-sum)",
  summary: "Is there a subset of the given positive integers that adds up to exactly T?",
  statement: `
<p>Subset sum is Nondeterministic Polynomial (NP)-complete in general (Levitin Ch 11–12 solves it by backtracking), yet when the target is a small integer a
Dynamic Programming (DP) table of <b>true/false</b> entries answers it in Θ(nT) — the knapsack table with booleans instead of values.</p>
<p>Given positive integers <code>S[1..n]</code> (each usable <b>at most once</b>) and a target <code>T</code>, return <code>true</code> if some
subset of them adds up to <b>exactly</b> T, else <code>false</code>. The empty subset adds up to 0.</p>
<ul>
<li><b>Input:</b> <code>S</code> — 1 ≤ n ≤ 15 positive integers ≤ 30 (1-based view <code>S[1..n]</code>); <code>T</code> — 0 ≤ T ≤ 120.</li>
<li><b>Output:</b> <code>true</code> or <code>false</code>.</li>
</ul>`,
  entry: "SubsetSum",
  params: ["S", "T"],
  tests: [
    { args: [[3, 34, 4, 12, 5, 2], 9], expect: true, explain: "4 + 5 = 9 (or 3 + 4 + 2)." },
    { args: [[3, 34, 4, 12, 5, 2], 30], expect: false, explain: "No subset reaches exactly 30." },
    { args: [[7, 3], 0], expect: true, explain: "The empty subset has sum 0." },
    { args: [[5], 10], expect: false, explain: "Each number can be used only once." },
    { args: [[6, 5, 5], 10], expect: true, explain: "Taking the largest number first (6) leads nowhere; 5 + 5 works." },
    { args: [[1, 2, 3], 7], expect: false, explain: "Everything together only makes 6." },
    { args: [[2, 4, 6], 12], expect: true },
    { args: [[8, 6, 7, 5, 3, 10, 9], 15], expect: true },
  ],
  random: { count: 25, gen: (r, i) => { const n = 1 + (i % 10); const S = r.array(n, 1, 20); const tot = S.reduce((a, b) => a + b, 0); return [S, r.int(0, Math.min(120, tot + 3))]; } },
  reference: (S, T) => { let R = new Set([0]); for (const s of S) { const nx = new Set(R); R.forEach((x) => nx.add(x + s)); R = nx; } return R.has(T); },
  compare: (got, exp) => (got === true || got === false || got === 0 || got === 1) && !!got === exp,
  mutants: [
    { fn: (S, T) => { let left = T; [...S].sort((a, b) => b - a).forEach((s) => { if (s <= left) left -= s; }); return left === 0; }, hint: "Your answers match a greedy rule: take the largest number that still fits. For [6, 5, 5] and T = 10 it grabs 6 and gets stuck, but 5 + 5 works. For each number, keep BOTH possibilities (use it or not) alive in a table." },
    { fn: (S, T) => { const F = Array(T + 1).fill(false); F[0] = true; for (const s of S) for (let j = s; j <= T; j++) if (F[j - s]) F[j] = true; return F[T]; }, hint: "Some numbers are being reused (for S = [5], T = 10 you say true). When you use S[i], the rest of the sum must come from S[1..i − 1] only — read from the previous row, not the one you are filling." },
    { fn: (S, T) => { const n = S.length, F = Array.from({ length: n + 1 }, () => Array(T + 1).fill(false)); F[0][0] = true; for (let i = 1; i <= n; i++) for (let j = 1; j <= T; j++) F[i][j] = F[i - 1][j] || (j >= S[i - 1] && F[i - 1][j - S[i - 1]]); return F[n][T]; }, hint: "Check column 0 of your table. Sum 0 is reachable with ANY prefix of the items (take nothing), so F[i, 0] must be true for every row i — not only F[0, 0]. Try T = 0 and T equal to a single later element." },
  ],
  hints: [
    "Consider S[i]. Any subset of S[1..i] either uses S[i] or doesn't. What smaller question does each case leave?",
    "F[i, j] = true if some subset of S[1..i] sums to exactly j. Column 0 is all true (the empty subset); the rest of row 0 is false.",
    "F[i, j] ← F[i − 1, j], and if j ≥ S[i] and F[i − 1, j − S[i]] is true, set F[i, j] ← true. Return F[n, T].",
  ],
  starter: {
    pseudo: `ALGORITHM SubsetSum(S[1..n], T)
    // Input: positive integers S[1..n] (1-based), target T ≥ 0
    // Output: true if some subset of S sums to exactly T
    F ← matrix(n + 1, T + 1, false)
    ...
    return F[n, T]`,
    js: `function SubsetSum(S, T) {
  // return true or false
}`,
  },
  solution: {
    pseudo: `ALGORITHM SubsetSum(S[1..n], T)
    F ← matrix(n + 1, T + 1, false)
    for i ← 0 to n do
        F[i, 0] ← true
    for i ← 1 to n do
        for j ← 1 to T do
            F[i, j] ← F[i - 1, j]
            if j ≥ S[i] and F[i - 1, j - S[i]] then
                F[i, j] ← true
    return F[n, T]`,
    js: `function SubsetSum(S, T) {
  const n = S.length;
  const F = Array.from({ length: n + 1 }, () => Array(T + 1).fill(false));
  for (let i = 0; i <= n; i++) F[i][0] = true;
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= T; j++)
      F[i][j] = F[i - 1][j] || (j >= S[i - 1] && F[i - 1][j - S[i - 1]]);
  return F[n][T];
}`,
    python: `def subset_sum(S, T):
    n = len(S)
    F = [[False] * (T + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        F[i][0] = True
    for i in range(1, n + 1):
        for j in range(1, T + 1):
            F[i][j] = F[i - 1][j] or (j >= S[i - 1] and F[i - 1][j - S[i - 1]])
    return F[n][T]`,
    explain: "A subset of the first i numbers with sum j either avoids S[i] (so the first i − 1 already reach j) or uses it once (so they reach j − S[i]). That's the knapsack recurrence with 'or' instead of 'max'. Θ(nT) time and space — pseudo-polynomial, which is why it doesn't contradict NP-completeness.",
  },
  complexity: "Θ(nT) time and space (Θ(T) with one row updated right-to-left)",
  followUp: "Use one boolean row of length T + 1 updated from right to left, or a bitset (shift-and-OR) that processes 64 sums per machine word. Partition into two equal halves is SubsetSum(S, total/2).",
  distractors: ["F[i, j] ← F[i, j - S[i]]", "F[0, j] ← true", "for j ← 0 to T - 1 do"],
  visual: "sims/dp-studio.html",
  lesson: "lessons/08-dynamic-programming/README.md",
});

ForgeProblems.add({
  id: "knapsack-memory-function",
  title: "Knapsack by Memory Function",
  level: 4, chapter: 8, difficulty: 2,
  topics: ["dynamic programming", "memoization", "top-down", "knapsack"],
  strategy: "Top-down dynamic programming (memory function)",
  source: "Levitin §8.2, Memory Functions & Example 2",
  summary: "Solve knapsack top-down with a memo table — and report how many table entries were actually computed.",
  statement: `
<p>Bottom-up Dynamic Programming (DP) fills <b>every</b> cell of the table, even ones the final answer never needs. A <b>memory function</b>
works top-down like the recursion, but stores each result in the table and reuses it — so it solves only the subproblems it needs,
each once (Levitin §8.2).</p>
<p>Solve the 0/1 knapsack problem (weights <code>w[1..n]</code>, values <code>v[1..n]</code>, capacity <code>W</code>) with Levitin's
memory function (MF) method and return <code>[bestValue, computed]</code>, where <code>computed</code> is the number of <b>nontrivial</b> table
entries <code>F[i, j]</code> (i ≥ 1 and j ≥ 1) that your memory function actually computed.</p>
<ul>
<li>Set up <code>F[0..n, 0..W]</code> with row 0 and column 0 equal to 0 and every other entry −1 ("not computed yet").</li>
<li><code>MF(i, j)</code>: if <code>F[i, j] &lt; 0</code>, compute it — from <code>MF(i − 1, j)</code> alone when item i doesn't fit
(<code>j &lt; w[i]</code>), otherwise as the max of skipping and taking item i — and store it. Return <code>F[i, j]</code>.</li>
<li>Call <code>MF(n, W)</code>; afterwards, the computed entries are exactly the nontrivial cells that are no longer −1.</li>
</ul>
<p>For the book's instance (w = 2, 1, 3, 2; v = 12, 10, 20, 15; W = 5) only <b>11 of the 20</b> nontrivial entries get computed.
Helper algorithms are allowed: write <code>ALGORITHM MF(i, j, w, v, F)</code> below the main one and pass the arrays along.</p>
<ul>
<li><b>Input:</b> 1 ≤ n ≤ 10 items, 1 ≤ W ≤ 30.</li>
<li><b>Output:</b> <code>[bestValue, computed]</code>.</li>
</ul>`,
  entry: "MFKnapsack",
  params: ["w", "v", "W"],
  tests: [
    { args: [[2, 1, 3, 2], [12, 10, 20, 15], 5], expect: [37, 11], explain: "Levitin's Example 2: 11 of the 20 nontrivial entries are computed." },
    { args: [[3], [10], 9], expect: [10, 1], explain: "One item: only F[1, 9] is needed." },
    { args: [[5], [10], 4], expect: [0, 1] },
    { args: [[1, 1, 1], [1, 1, 1], 3], expect: [3, 6] },
    { args: [[3, 2, 1, 4, 5], [25, 20, 15, 40, 50], 6], expect: [65, 16], explain: "Levitin Exercise 8.2.6's instance." },
    { args: [[4, 4], [5, 5], 8], expect: [10, 3] },
    { args: [[2, 2, 2, 2], [3, 4, 5, 6], 4], expect: [11, 7] },
  ],
  random: { count: 25, gen: (r, i) => { const n = 1 + (i % 8); return [r.array(n, 1, 8), r.array(n, 1, 40), r.int(1, 20)]; } },
  reference: (w, v, W) => {
    const n = w.length, F = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: W + 1 }, (_, j) => (i && j ? -1 : 0)));
    let c = 0;
    const MF = (i, j) => { if (F[i][j] < 0) { c++; F[i][j] = j < w[i - 1] ? MF(i - 1, j) : Math.max(MF(i - 1, j), v[i - 1] + MF(i - 1, j - w[i - 1])); } return F[i][j]; };
    return [MF(n, W), c];
  },
  mutants: [
    { fn: (w, v, W) => [DP.knapTable(w, v, W)[w.length][W], w.length * W], hint: "Your count is n × W — every nontrivial cell. That's the bottom-up algorithm. A memory function starts from MF(n, W) and only computes the cells that recursion actually reaches." },
    { fn: (w, v, W) => { let c = 0; const R = (i, j) => { if (!i || !j) return 0; c++; return j < w[i - 1] ? R(i - 1, j) : Math.max(R(i - 1, j), v[i - 1] + R(i - 1, j - w[i - 1])); }; return [R(w.length, W), c]; }, hint: "Your count includes repeated work: some cells are computed more than once. Before computing F[i, j], check whether it's still −1; if not, just return the stored value — and store every value you compute." },
    { fn: (w, v, W) => { const n = w.length, F = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: W + 1 }, (_, j) => (i && j ? -1 : 0))); let c = 0; const MF = (i, j) => { c++; if (F[i][j] < 0) F[i][j] = j < w[i - 1] ? MF(i - 1, j) : Math.max(MF(i - 1, j), v[i - 1] + MF(i - 1, j - w[i - 1])); return F[i][j]; }; return [MF(n, W), c]; }, hint: "The value is right, but you're counting every CALL (including lookups of already-known cells and row 0 / column 0). Count only the nontrivial entries that were actually computed — e.g. the cells that are no longer −1 at the end." },
  ],
  hints: [
    "Write the plain recursive knapsack first: F(i, j) depends on F(i − 1, j) and maybe F(i − 1, j − w[i]). Which (i, j) pairs does it ask for more than once?",
    "Keep the table F[0..n, 0..W]: zeros in row 0 and column 0, −1 everywhere else. In MF(i, j), compute only if F[i, j] < 0, store the result, and always return F[i, j].",
    "After MF(n, W) returns, count the cells with i ≥ 1, j ≥ 1 and F[i, j] ≥ 0. Return [F[n, W], that count].",
  ],
  starter: {
    pseudo: `ALGORITHM MFKnapsack(w[1..n], v[1..n], W)
    // Output: [best value, number of nontrivial entries computed]
    F ← matrix(n + 1, W + 1, -1)
    ...
    best ← MF(n, W, w, v, F)
    ...

ALGORITHM MF(i, j, w, v, F)
    // memory function: compute F[i, j] only if it is still -1
    ...`,
    js: `function MFKnapsack(w, v, W) {
  // return [bestValue, computedCount]
}`,
  },
  solution: {
    pseudo: `ALGORITHM MFKnapsack(w[1..n], v[1..n], W)
    F ← matrix(n + 1, W + 1, -1)
    for j ← 0 to W do
        F[0, j] ← 0
    for i ← 0 to n do
        F[i, 0] ← 0
    best ← MF(n, W, w, v, F)
    count ← 0
    for i ← 1 to n do
        for j ← 1 to W do
            if F[i, j] ≥ 0 then
                count ← count + 1
    return [best, count]

ALGORITHM MF(i, j, w, v, F)
    if F[i, j] < 0 then
        if j < w[i] then
            value ← MF(i - 1, j, w, v, F)
        else
            value ← max(MF(i - 1, j, w, v, F), v[i] + MF(i - 1, j - w[i], w, v, F))
        F[i, j] ← value
    return F[i, j]`,
    js: `function MFKnapsack(w, v, W) {
  const n = w.length;
  const F = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: W + 1 }, (_, j) => (i && j ? -1 : 0)));
  const MF = (i, j) => {
    if (F[i][j] < 0) F[i][j] = j < w[i - 1] ? MF(i - 1, j) : Math.max(MF(i - 1, j), v[i - 1] + MF(i - 1, j - w[i - 1]));
    return F[i][j];
  };
  const best = MF(n, W);
  let count = 0;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= W; j++) if (F[i][j] >= 0) count++;
  return [best, count];
}`,
    python: `def mf_knapsack(w, v, W):
    n = len(w)
    F = [[0 if i == 0 or j == 0 else -1 for j in range(W + 1)] for i in range(n + 1)]
    def MF(i, j):
        if F[i][j] < 0:
            if j < w[i - 1]:
                F[i][j] = MF(i - 1, j)
            else:
                F[i][j] = max(MF(i - 1, j), v[i - 1] + MF(i - 1, j - w[i - 1]))
        return F[i][j]
    best = MF(n, W)
    count = sum(1 for i in range(1, n + 1) for j in range(1, W + 1) if F[i][j] >= 0)
    return [best, count]`,
    explain: "Each entry is computed at most once (the −1 check), and each computation makes at most two calls, so the work is O(number of computed entries) ⊆ O(nW) — the same class as bottom-up, but often far fewer cells (11 of 20 in the book's example). The recursion depth is at most n.",
  },
  complexity: "O(nW) time and space; only the needed entries are computed",
  followUp: "Levitin notes the gain is at most a constant factor here; it's big when each entry is expensive or most entries are unreachable. In practice this is `@lru_cache` in Python or a HashMap memo — and the table can be a dictionary keyed by (i, j) when W is huge but few states are reachable.",
  distractors: ["if F[i, j] ≥ 0 then", "value ← max(MF(i - 1, j, w, v, F), v[i] + MF(i, j - w[i], w, v, F))", "count ← n * W"],
  visual: "sims/dp-studio.html",
  lesson: "lessons/08-dynamic-programming/README.md",
});

ForgeProblems.add({
  id: "lcs-length",
  title: "Longest Common Subsequence",
  level: 4, chapter: 8, difficulty: 2,
  topics: ["dynamic programming", "2-D table", "strings", "sequence alignment"],
  strategy: "Dynamic programming (prefix × prefix table)",
  source: "Levitin Exercise 8.2.9a (research topic) · Interview classic",
  summary: "Length of the longest sequence of characters that appears, in order, in both strings.",
  statement: `
<p>The Longest Common Subsequence (LCS) is behind <code>diff</code>, version control merges and deoxyribonucleic acid (DNA) comparison (Levitin lists it among
classic Dynamic Programming (DP) applications, Exercise 8.2.9). A <b>subsequence</b> keeps characters in order but may skip some:
"ACE" is a subsequence of "ABCDE"; "AEC" is not.</p>
<p>Given strings <code>X</code> (length m) and <code>Y</code> (length n), return the <b>length</b> of their longest common subsequence.</p>
<ul>
<li><b>Input:</b> two strings of length 0..20 (0-based: <code>X[0]</code> is the first character).</li>
<li><b>Output:</b> the LCS length.</li>
</ul>
<p>Example: <code>"ABCBDAB"</code> and <code>"BDCABA"</code> → 4 (for instance "BCBA").</p>`,
  entry: "LCSLength",
  params: ["X", "Y"],
  tests: [
    { args: ["ABCBDAB", "BDCABA"], expect: 4, explain: "\"BCBA\" (among others) appears in order in both." },
    { args: ["abcde", "ace"], expect: 3, explain: "The characters need not be next to each other." },
    { args: ["", "abc"], expect: 0, explain: "Nothing is common with an empty string." },
    { args: ["abc", "def"], expect: 0 },
    { args: ["abc", "abc"], expect: 3 },
    { args: ["aa", "a"], expect: 1, explain: "Each character of Y can be matched only once." },
    { args: ["AGGTAB", "GXTXAYB"], expect: 4, explain: "\"GTAB\"." },
    { args: ["xaybz", "ab"], expect: 2 },
  ],
  random: { count: 25, gen: (r, i) => [r.word(r.int(0, 14), i % 2 ? "ab" : "abcd"), r.word(r.int(0, 14), i % 2 ? "ab" : "abcd")] },
  reference: (X, Y) => DP.lcs(X, Y),
  growth: { metric: "steps", sizes: [8, 16, 32, 64, 128], gen: (r, n) => [r.word(n, "acgt"), r.word(n, "acgt")], expect: "n^2" },
  mutants: [
    { fn: (X, Y) => { const m = X.length, n = Y.length, L = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0)); for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) L[i][j] = X[i - 1] === Y[j - 1] ? L[i - 1][j - 1] + 1 : L[i - 1][j - 1]; return L[m][n]; }, hint: "When the characters DON'T match you read the diagonal cell L[i − 1, j − 1]. That throws away the chance to match X[i − 1] with something earlier in Y (or vice versa). On a mismatch, drop one character from ONE string: look up and look left." },
    { fn: (X, Y) => { const m = X.length, n = Y.length, L = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0)); for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) L[i][j] = X[i - 1] === Y[j - 1] ? Math.max(L[i - 1][j], L[i][j - 1]) + 1 : Math.max(L[i - 1][j], L[i][j - 1]); return L[m][n]; }, hint: "Your answer can exceed the shorter string's length (\"aa\" vs \"a\" gives 2). On a match, BOTH matched characters are used up — so add 1 to the cell where both strings are one shorter, the diagonal." },
    { fn: (X, Y) => { let best = 0; const m = X.length, n = Y.length, L = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0)); for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) { L[i][j] = X[i - 1] === Y[j - 1] ? L[i - 1][j - 1] + 1 : 0; best = Math.max(best, L[i][j]); } return best; }, hint: "You're computing the longest common SUBSTRING (contiguous). A subsequence may skip characters — \"abcde\" and \"ace\" share \"ace\". On a mismatch, don't reset to 0: carry forward the best of the neighbors." },
  ],
  hints: [
    "Compare the LAST characters of X and Y. If they are equal, what can you say about an LCS? If they differ, at least one of them is not in the LCS — which smaller problems does that leave?",
    "L[i, j] = LCS length of the first i characters of X and the first j of Y. Row 0 and column 0 are 0. Match: 1 + L[i − 1, j − 1]. Mismatch: max(L[i − 1, j], L[i, j − 1]).",
    "Make L ← matrix(m + 1, n + 1, 0), loop i ← 1 to m and j ← 1 to n, compare X[i − 1] with Y[j − 1] (strings are 0-based), and return L[m, n].",
  ],
  starter: {
    pseudo: `ALGORITHM LCSLength(X[0..m-1], Y[0..n-1])
    // Input: strings X and Y (0-based)
    // Output: length of their longest common subsequence
    L ← matrix(m + 1, n + 1, 0)
    ...
    return L[m, n]`,
    js: `function LCSLength(X, Y) {
}`,
  },
  solution: {
    pseudo: `ALGORITHM LCSLength(X[0..m-1], Y[0..n-1])
    L ← matrix(m + 1, n + 1, 0)
    for i ← 1 to m do
        for j ← 1 to n do
            if X[i - 1] = Y[j - 1] then
                L[i, j] ← L[i - 1, j - 1] + 1
            else
                L[i, j] ← max(L[i - 1, j], L[i, j - 1])
    return L[m, n]`,
    js: `function LCSLength(X, Y) {
  const m = X.length, n = Y.length;
  const L = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      L[i][j] = X[i - 1] === Y[j - 1] ? L[i - 1][j - 1] + 1 : Math.max(L[i - 1][j], L[i][j - 1]);
  return L[m][n];
}`,
    python: `def lcs_length(X, Y):
    m, n = len(X), len(Y)
    L = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if X[i - 1] == Y[j - 1]:
                L[i][j] = L[i - 1][j - 1] + 1
            else:
                L[i][j] = max(L[i - 1][j], L[i][j - 1])
    return L[m][n]`,
    explain: "If the last characters match, some LCS ends with them (exchange argument), leaving the two shorter prefixes; if not, one of them is unused, so the answer is the better of dropping either. (m + 1)(n + 1) cells at Θ(1) each: Θ(mn) time and space.",
  },
  complexity: "Θ(mn) time and space (Θ(min(m, n)) space for the length alone)",
  followUp: "Backtrace the table to print an actual LCS, and keep only two rows to get Θ(n) space. This is the core of `diff`/`git diff` (which use Myers' O((m + n)·D) refinement) and of DNA alignment tools.",
  distractors: ["L[i, j] ← L[i - 1, j - 1]", "if X[i] = Y[j] then", "L[i, j] ← max(L[i - 1, j], L[i, j - 1]) + 1"],
  visual: "sims/dp-studio.html",
  lesson: "lessons/08-dynamic-programming/README.md",
});

ForgeProblems.add({
  id: "lis-quadratic",
  title: "Longest Increasing Subsequence (Θ(n²) DP)",
  level: 4, chapter: 8, difficulty: 2,
  topics: ["dynamic programming", "1-D table", "subsequences"],
  strategy: "Dynamic programming (best ending here)",
  source: "Interview classic",
  summary: "Length of the longest strictly increasing subsequence of an array, by Dynamic Programming (DP).",
  statement: `
<p>The Longest Increasing Subsequence (LIS) teaches a key Dynamic Programming (DP) move: define the subproblem as "the best answer that
<b>ends exactly at position i</b>" — then the overall answer is the best over all i.</p>
<p>Given <code>A[0..n-1]</code>, return the length of the longest subsequence (elements in their original order, not necessarily
adjacent) that is <b>strictly increasing</b>.</p>
<ul>
<li><b>Input:</b> 0 ≤ n ≤ 60 integers (0-based).</li>
<li><b>Output:</b> the LIS length (0 for an empty array).</li>
</ul>
<p>Example: <code>[10, 9, 2, 5, 3, 7, 101, 18]</code> → 4 (e.g. 2, 3, 7, 18). Your algorithm should be Θ(n²) or better.</p>`,
  entry: "LIS",
  params: ["A"],
  tests: [
    { args: [[10, 9, 2, 5, 3, 7, 101, 18]], expect: 4, explain: "2, 3, 7, 18 (or 2, 5, 7, 101)." },
    { args: [[]], expect: 0, explain: "Empty array." },
    { args: [[2, 2, 2]], expect: 1, explain: "Strictly increasing: equal values don't extend a run." },
    { args: [[5]], expect: 1 },
    { args: [[3, 1, 2]], expect: 2, explain: "1, 2 — the first element needn't be used." },
    { args: [[1, 2, 3, 0]], expect: 3, explain: "The best subsequence doesn't have to end at the last element." },
    { args: [[1, 3, 2, 4]], expect: 3, explain: "1, 3, 4 or 1, 2, 4 — not contiguous." },
    { args: [[0, 8, 4, 12, 2, 10, 6, 14, 1, 9, 5, 13, 3, 11, 7, 15]], expect: 6 },
  ],
  random: { count: 25, gen: (r, i) => [r.array(i < 2 ? i : r.int(2, 40), 0, i % 3 ? 30 : 8)] },
  reference: (A) => { const L = A.map(() => 1); for (let i = 0; i < A.length; i++) for (let j = 0; j < i; j++) if (A[j] < A[i]) L[i] = Math.max(L[i], L[j] + 1); return A.length ? Math.max(...L) : 0; },
  growth: { metric: "steps", sizes: [16, 32, 64, 128, 256], gen: (r, n) => [r.array(n, 0, 1000)], expect: "n^2" },
  mutants: [
    { fn: (A) => { const L = A.map(() => 1); for (let i = 0; i < A.length; i++) for (let j = 0; j < i; j++) if (A[j] <= A[i]) L[i] = Math.max(L[i], L[j] + 1); return A.length ? Math.max(...L) : 0; }, hint: "[2, 2, 2] should give 1: the sequence must be STRICTLY increasing. Check the comparison between A[j] and A[i]." },
    { fn: (A) => { const L = A.map(() => 1); for (let i = 0; i < A.length; i++) for (let j = 0; j < i; j++) if (A[j] < A[i]) L[i] = Math.max(L[i], L[j] + 1); return A.length ? L[A.length - 1] : 0; }, hint: "You return L[n − 1], the best subsequence ENDING at the last element. The longest one might end anywhere (try [1, 2, 3, 0]) — take the maximum over all L[i]." },
    { fn: (A) => { if (!A.length) return 0; let c = 1, last = A[0]; for (let i = 1; i < A.length; i++) if (A[i] > last) { c++; last = A[i]; } return c; }, hint: "This looks like a single greedy scan: keep the first element and extend whenever something bigger appears. Starting with a large value (like 3 in [3, 1, 2]) blocks better options. Compute, for EVERY i, the longest increasing subsequence that ends at i." },
    { fn: (A) => { if (!A.length) return 0; let best = 1, run = 1; for (let i = 1; i < A.length; i++) { run = A[i] > A[i - 1] ? run + 1 : 1; best = Math.max(best, run); } return best; }, hint: "You found the longest increasing RUN of adjacent elements. A subsequence may skip elements: in [1, 3, 2, 4] the answer is 3 (1, 3, 4). For each i, look back at ALL earlier j, not just i − 1." },
  ],
  hints: [
    "Ask a narrower question: what is the longest increasing subsequence that ENDS exactly at A[i]? How could such a subsequence look just before A[i]?",
    "L[i] = 1 + max{ L[j] : j < i and A[j] < A[i] } (or 1 if there is no such j). The answer is the maximum of all L[i], not L[n − 1].",
    "Start L ← array(n, 1). For i ← 1 to n − 1, for j ← 0 to i − 1: if A[j] < A[i] and L[j] + 1 > L[i] then L[i] ← L[j] + 1. Track the best as you go; return 0 when n = 0.",
  ],
  starter: {
    pseudo: `ALGORITHM LIS(A[0..n-1])
    // Output: length of the longest strictly increasing subsequence
    if n = 0 then
        return 0
    L ← array(n, 1)
    ...
    return best`,
    js: `function LIS(A) {
}`,
  },
  solution: {
    pseudo: `ALGORITHM LIS(A[0..n-1])
    if n = 0 then
        return 0
    L ← array(n, 1)
    best ← 1
    for i ← 1 to n - 1 do
        for j ← 0 to i - 1 do
            if A[j] < A[i] and L[j] + 1 > L[i] then
                L[i] ← L[j] + 1
        if L[i] > best then
            best ← L[i]
    return best`,
    js: `function LIS(A) {
  const n = A.length;
  if (n === 0) return 0;
  const L = Array(n).fill(1);
  let best = 1;
  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) if (A[j] < A[i] && L[j] + 1 > L[i]) L[i] = L[j] + 1;
    if (L[i] > best) best = L[i];
  }
  return best;
}`,
    python: `def lis(A):
    n = len(A)
    if n == 0:
        return 0
    L = [1] * n
    best = 1
    for i in range(1, n):
        for j in range(i):
            if A[j] < A[i] and L[j] + 1 > L[i]:
                L[i] = L[j] + 1
        best = max(best, L[i])
    return best`,
    explain: "An increasing subsequence ending at i is either just A[i] or an increasing subsequence ending at some j < i with A[j] < A[i], extended by A[i]; the longest such prefix is L[j] by definition. The double loop makes Σ i = n(n − 1)/2 comparisons: Θ(n²).",
  },
  complexity: "Θ(n²) time, Θ(n) space",
  followUp: "Now do it in Θ(n log n) with 'patience sorting': keep tails[k] = smallest tail of an increasing subsequence of length k + 1 and binary-search where each element goes (see the lis-patience problem). LIS also counts the minimum number of decreasing piles — a classic scheduling lower bound.",
  distractors: ["if A[j] ≤ A[i] and L[j] + 1 > L[i] then", "return L[n - 1]", "for j ← i + 1 to n - 1 do"],
  visual: "sims/dp-studio.html",
  lesson: "lessons/08-dynamic-programming/README.md",
});

ForgeProblems.add({
  id: "warshall-closure",
  title: "Warshall's Transitive Closure",
  level: 4, chapter: 8, difficulty: 2,
  topics: ["dynamic programming", "graphs", "transitive closure", "adjacency matrix"],
  strategy: "Dynamic programming over allowed intermediate vertices",
  source: "Levitin §8.4 (Warshall's algorithm)",
  summary: "From a digraph's adjacency matrix, compute which vertices can reach which (paths of any length ≥ 1).",
  statement: `
<p>Spreadsheets must know every cell affected by a change; build systems must know every target that depends on a file. That's the
<b>transitive closure</b> of a directed graph (digraph), and Warshall's algorithm computes it with a beautifully short triple loop (Levitin §8.4).</p>
<p>The digraph on vertices 0..n−1 is given by its adjacency matrix: <code>A[i, j] = 1</code> if there is an edge i → j, else 0.
Return the n × n matrix <code>R</code> with <code>R[i, j] = 1</code> exactly when there is a <b>directed path of length ≥ 1</b> from i to j, else 0.
(So <code>R[i, i] = 1</code> only if i lies on a directed cycle.)</p>
<ul>
<li><b>Input:</b> <code>A</code> — n lists of n zeros/ones, 1 ≤ n ≤ 10, <b>0-based</b> (<code>A[i, j]</code>).</li>
<li><b>Output:</b> the closure matrix (1/0; true/false is also accepted).</li>
</ul>
<p><b>Key idea:</b> R⁽ᵏ⁾[i, j] = 1 if there's a path from i to j whose intermediate vertices all come from the first k vertices. Going from k − 1
to k, a new path must pass through vertex k.</p>`,
  entry: "Warshall",
  params: ["A"],
  tests: [
    { args: [[[0, 1, 0, 0], [0, 0, 0, 1], [0, 0, 0, 0], [1, 0, 1, 0]]], expect: [[1, 1, 1, 1], [1, 1, 1, 1], [0, 0, 0, 0], [1, 1, 1, 1]], explain: "A 4-vertex digraph (a → b → d → a, d → c): everything but c reaches everything." },
    { args: [[[0, 1, 0], [0, 0, 1], [1, 0, 0]]], expect: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], explain: "A 3-cycle: every vertex reaches every vertex, including itself." },
    { args: [[[0, 1, 0], [0, 0, 1], [0, 0, 0]]], expect: [[0, 1, 1], [0, 0, 1], [0, 0, 0]], explain: "A chain: no cycles, so the diagonal stays 0." },
    { args: [[[0]]], expect: [[0]] },
    { args: [[[1]]], expect: [[1]], explain: "A self-loop is a cycle of length 1." },
    { args: [[[0, 0, 0, 1], [1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 0, 0]]], expect: [[0, 0, 0, 1], [1, 0, 0, 1], [1, 1, 0, 1], [0, 0, 0, 0]], explain: "2 → 1 → 0 → 3: paths of length 3 must be found too." },
  ],
  random: { count: 25, gen: (r) => { const n = r.int(2, 8), p = r.pick([0.15, 0.25, 0.35]); return [Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i !== j && r() < p ? 1 : 0)))]; } },
  reference: (A) => { const n = A.length, R = A.map((row) => row.slice()); for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (R[i][k] && R[k][j]) R[i][j] = 1; return R; },
  compare: (got, exp) => Array.isArray(got) && got.length === exp.length && got.every((row, i) => Array.isArray(row) && row.length === exp[i].length && row.every((x, j) => (x ? 1 : 0) === exp[i][j])),
  growth: { metric: "steps", sizes: [4, 8, 16, 24, 32], gen: (r, n) => [Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i !== j && r() < 0.1 ? 1 : 0)))], expect: "n^3" },
  mutants: [
    { fn: (A) => { const n = A.length, R = A.map((row) => row.slice()); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) if (R[i][k] && R[k][j]) R[i][j] = 1; return R; }, hint: "Check the ORDER of your three loops. Warshall's algorithm is correct only when k — the vertex newly allowed as an intermediate — is the OUTERMOST loop. With k innermost, some paths (e.g. around the 3-cycle) are missed." },
    { fn: (A) => { const n = A.length, R = A.map((row) => row.slice()); for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (R[i][k] && R[k][j]) R[i][j] = 1; for (let i = 0; i < n; i++) R[i][i] = 1; return R; }, hint: "Your diagonal is all 1s. Here R[i, i] = 1 only when a real path of length ≥ 1 leads from i back to i (a cycle). Don't set the diagonal by hand — let the algorithm discover cycles." },
    { fn: (A) => { const n = A.length, R = A.map((row) => row.slice()); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) if (A[i][k] && A[k][j]) R[i][j] = 1; return R; }, hint: "You find paths of length 1 and 2 only (you combine the ORIGINAL matrix A with itself). Longer paths appear only if later steps build on the matrix you're updating — update R in place and read from R." },
  ],
  hints: [
    "Number the vertices. Suppose you already know which pairs are connected by paths that use only vertices 0..k − 1 in the middle. What new pairs become connected when vertex k is also allowed?",
    "R starts as a copy of A. For k from 0 to n − 1 (outer loop!), for every i and j: if there's a path i → k and a path k → j, then there's a path i → j.",
    "for k ← 0 to n − 1, for i ← 0 to n − 1, for j ← 0 to n − 1: if R[i, k] = 1 and R[k, j] = 1 then R[i, j] ← 1. Return R.",
  ],
  starter: {
    pseudo: `ALGORITHM Warshall(A[0..n-1, 0..n-1])
    // Input: adjacency matrix A of a digraph (0-based)
    // Output: transitive closure R (R[i, j] = 1 iff a path i → ... → j exists)
    R ← matrix(n, n, 0)
    ...
    return R`,
    js: `function Warshall(A) {
  const n = A.length;
}`,
  },
  solution: {
    pseudo: `ALGORITHM Warshall(A[0..n-1, 0..n-1])
    R ← matrix(n, n, 0)
    for i ← 0 to n - 1 do
        for j ← 0 to n - 1 do
            R[i, j] ← A[i, j]
    for k ← 0 to n - 1 do
        for i ← 0 to n - 1 do
            for j ← 0 to n - 1 do
                if R[i, k] = 1 and R[k, j] = 1 then
                    R[i, j] ← 1
    return R`,
    js: `function Warshall(A) {
  const n = A.length, R = A.map((row) => row.slice());
  for (let k = 0; k < n; k++)
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        if (R[i][k] && R[k][j]) R[i][j] = 1;
  return R;
}`,
    python: `def warshall(A):
    n = len(A)
    R = [row[:] for row in A]
    for k in range(n):
        for i in range(n):
            for j in range(n):
                if R[i][k] and R[k][j]:
                    R[i][j] = 1
    return R`,
    explain: "R⁽ᵏ⁾[i, j] = R⁽ᵏ⁻¹⁾[i, j] or (R⁽ᵏ⁻¹⁾[i, k] and R⁽ᵏ⁻¹⁾[k, j]): a path using intermediates ≤ k either avoids k or splits at k into two paths using intermediates < k. Updating in place is safe because row k and column k don't change during round k. Three nested loops of n: Θ(n³).",
  },
  complexity: "Θ(n³) time, Θ(n²) space",
  followUp: "Pack each row into bit-words and replace the inner j-loop by 'row[i] |= row[k]' — about 64× faster. For sparse graphs, n runs of Depth-First Search (DFS) or Breadth-First Search (BFS) give Θ(n(n + m)), which is better when m ≪ n².",
  distractors: ["if R[i, k] = 1 or R[k, j] = 1 then", "R[i, i] ← 1", "if A[i, k] = 1 and A[k, j] = 1 then"],
  visual: "sims/warshall-floyd.html",
  lesson: "lessons/08-dynamic-programming/README.md",
});

ForgeProblems.add({
  id: "floyd-all-pairs",
  title: "Floyd's All-Pairs Shortest Paths",
  level: 4, chapter: 8, difficulty: 2,
  topics: ["dynamic programming", "graphs", "shortest paths", "weight matrix"],
  strategy: "Dynamic programming over allowed intermediate vertices",
  source: "Levitin §8.4 (Floyd's algorithm)",
  summary: "Compute the shortest distance between every pair of vertices of a weighted digraph.",
  statement: `
<p>Routing tables, "distance between every pair of cities" charts and game maps all need <b>every</b> pairwise shortest distance.
Floyd's algorithm does it with the same triple loop as Warshall's, replacing "or/and" with "min/+" (Levitin §8.4).</p>
<p>The weighted digraph on vertices 0..n−1 is given by its weight matrix <code>W</code>: <code>W[i, j]</code> is the length of edge i → j,
<code>∞</code> if there is no such edge, and <code>W[i, i] = 0</code>. Return the matrix <code>D</code> of shortest path lengths
(<code>∞</code> where j is unreachable from i). Edge lengths may be negative, but there are <b>no negative cycles</b>.</p>
<ul>
<li><b>Input:</b> <code>W</code> — n lists of n numbers (<code>∞</code> for "no edge"), 1 ≤ n ≤ 10, <b>0-based</b>.</li>
<li><b>Output:</b> the distance matrix D.</li>
</ul>`,
  entry: "Floyd",
  params: ["W"],
  tests: [
    { args: [[[0, Infinity, 3, Infinity], [2, 0, Infinity, Infinity], [Infinity, 7, 0, 1], [6, Infinity, Infinity, 0]]], expect: [[0, 10, 3, 4], [2, 0, 5, 6], [7, 7, 0, 1], [6, 16, 9, 0]], explain: "The book's 4-vertex example (a, b, c, d → 0, 1, 2, 3)." },
    { args: [[[0, 1, Infinity], [Infinity, 0, 1], [1, Infinity, 0]]], expect: [[0, 1, 2], [2, 0, 1], [1, 2, 0]], explain: "A directed 3-cycle: going around takes 2 steps one way." },
    { args: [[[0, 4, 1], [Infinity, 0, Infinity], [Infinity, 2, 0]]], expect: [[0, 3, 1], [Infinity, 0, Infinity], [Infinity, 2, 0]], explain: "0 → 2 → 1 (length 3) beats the direct edge (4); vertex 1 reaches nobody." },
    { args: [[[0]]], expect: [[0]] },
    { args: [[[0, 5, Infinity], [Infinity, 0, -3], [Infinity, Infinity, 0]]], expect: [[0, 5, 2], [Infinity, 0, -3], [Infinity, Infinity, 0]], explain: "A negative edge (no negative cycle) is fine for Floyd." },
    { args: [[[0, Infinity, Infinity, 1], [1, 0, Infinity, Infinity], [Infinity, 1, 0, Infinity], [Infinity, Infinity, Infinity, 0]]], expect: [[0, Infinity, Infinity, 1], [1, 0, Infinity, 2], [2, 1, 0, 3], [Infinity, Infinity, Infinity, 0]], explain: "2 → 1 → 0 → 3 uses three edges." },
  ],
  random: { count: 25, gen: (r) => { const n = r.int(2, 8), p = r.pick([0.25, 0.4]); return [Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : r() < p ? r.int(1, 20) : Infinity)))]; } },
  reference: (W) => { const n = W.length, D = W.map((row) => row.slice()); for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (D[i][k] + D[k][j] < D[i][j]) D[i][j] = D[i][k] + D[k][j]; return D; },
  growth: { metric: "steps", sizes: [4, 8, 16, 24, 32], gen: (r, n) => [Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : r() < 0.3 ? r.int(1, 9) : Infinity)))], expect: "n^3" },
  mutants: [
    { fn: (W) => { const n = W.length, D = W.map((row) => row.slice()); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) if (D[i][k] + D[k][j] < D[i][j]) D[i][j] = D[i][k] + D[k][j]; return D; }, hint: "Check the ORDER of your loops. The intermediate vertex k must be the OUTERMOST loop: round k improves every pair using vertex k, building on rounds 0..k − 1. With k innermost, some multi-edge shortcuts are found too late or never." },
    { fn: (W) => { const n = W.length, D = W.map((row) => row.slice()); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) if (W[i][k] + W[k][j] < D[i][j]) D[i][j] = W[i][k] + W[k][j]; return D; }, hint: "You only find paths with at most ONE intermediate vertex, because you combine the original W with itself. Read from (and write to) the matrix D you are improving, so later rounds can extend earlier shortcuts." },
    { fn: (W) => { const n = W.length, D = W.map((row, i) => row.map((x, j) => Math.min(x, W[j][i]))); for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (D[i][k] + D[k][j] < D[i][j]) D[i][j] = D[i][k] + D[k][j]; return D; }, hint: "Your distances are symmetric, as if every edge could be used in both directions. This is a DIRECTED graph: W[i, j] is the edge i → j only. Copy W as it is." },
  ],
  hints: [
    "Same idea as Warshall: suppose you know the shortest i → j distances using only vertices 0..k − 1 as intermediates. How can allowing vertex k make a path shorter?",
    "D starts as a copy of W. For k from 0 to n − 1 (outer loop!), for all i, j: going through k costs D[i, k] + D[k, j]; keep it if it beats D[i, j]. (∞ + anything stays ∞.)",
    "D[i, j] ← min(D[i, j], D[i, k] + D[k, j]) inside for k, for i, for j. Return D.",
  ],
  starter: {
    pseudo: `ALGORITHM Floyd(W[0..n-1, 0..n-1])
    // Input: weight matrix W (∞ = no edge, W[i, i] = 0), no negative cycles
    // Output: matrix D of shortest path lengths
    D ← matrix(n, n, 0)
    ...
    return D`,
    js: `function Floyd(W) {
  const n = W.length;   // Infinity means "no edge"
}`,
  },
  solution: {
    pseudo: `ALGORITHM Floyd(W[0..n-1, 0..n-1])
    D ← matrix(n, n, 0)
    for i ← 0 to n - 1 do
        for j ← 0 to n - 1 do
            D[i, j] ← W[i, j]
    for k ← 0 to n - 1 do
        for i ← 0 to n - 1 do
            for j ← 0 to n - 1 do
                D[i, j] ← min(D[i, j], D[i, k] + D[k, j])
    return D`,
    js: `function Floyd(W) {
  const n = W.length, D = W.map((row) => row.slice());
  for (let k = 0; k < n; k++)
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        D[i][j] = Math.min(D[i][j], D[i][k] + D[k][j]);
  return D;
}`,
    python: `def floyd(W):
    n = len(W)
    D = [row[:] for row in W]
    for k in range(n):
        for i in range(n):
            for j in range(n):
                D[i][j] = min(D[i][j], D[i][k] + D[k][j])
    return D`,
    explain: "D⁽ᵏ⁾[i, j] = min{D⁽ᵏ⁻¹⁾[i, j], D⁽ᵏ⁻¹⁾[i, k] + D⁽ᵏ⁻¹⁾[k, j]}: a shortest path with intermediates ≤ k either avoids k or visits it once (no negative cycles), splitting into two shorter-indexed paths. In-place updates are safe because D[i, k] and D[k, j] don't change in round k. Θ(n³) time, Θ(n²) space.",
  },
  complexity: "Θ(n³) time, Θ(n²) space",
  followUp: "Keep a 'next hop' matrix so you can print each route, and detect a negative cycle by checking for D[i, i] < 0 at the end. For sparse graphs with non-negative weights, running Dijkstra from every vertex (Θ(n·m log n)) beats Θ(n³).",
  distractors: ["D[i, j] ← min(D[i, j], W[i, k] + W[k, j])", "D[i, j] ← max(D[i, j], D[i, k] + D[k, j])", "for k ← 1 to n - 1 do"],
  visual: "sims/warshall-floyd.html",
  lesson: "lessons/08-dynamic-programming/README.md",
});

/* =========================================================================
   Difficulty 3 — reconstruction, strings, intervals
   ========================================================================= */

ForgeProblems.add({
  id: "knapsack-items",
  title: "Knapsack: Which Items?",
  level: 4, chapter: 8, difficulty: 3,
  topics: ["dynamic programming", "backtracking the table", "knapsack", "solution reconstruction"],
  strategy: "Dynamic programming + backtrace",
  source: "Levitin §8.2 Example 1 & Exercise 8.2.2b",
  summary: "Fill the knapsack table, then walk it backward to list the items of an optimal subset.",
  statement: `
<p>Knowing that the best value is $37 isn't enough for a real packing list. Levitin shows how to recover an optimal subset by
<b>backtracing</b> the filled Dynamic Programming (DP) table: compare each entry with the one directly above it (Levitin §8.2).</p>
<p>Items 1..n have weights <code>w[1..n]</code> and values <code>v[1..n]</code>; capacity <code>W</code>; each item at most once.
Return the <b>item numbers</b> (1-based) of one optimal subset, in increasing order.</p>
<ul>
<li><b>Input:</b> 1 ≤ n ≤ 12 items with positive integer weights and values, 1 ≤ W ≤ 60 (1-based views <code>w[1..n]</code>, <code>v[1..n]</code>).</li>
<li><b>Output:</b> a list of item numbers. Any optimal subset is accepted (total weight ≤ W and total value = the maximum); if nothing fits, <code>[]</code>.</li>
</ul>
<p>Example: the book's instance w = 2, 1, 3, 2; v = 12, 10, 20, 15; W = 5 → <code>[1, 2, 4]</code>.</p>`,
  entry: "KnapsackItems",
  params: ["w", "v", "W"],
  tests: [
    { args: [[2, 1, 3, 2], [12, 10, 20, 15], 5], expect: [1, 2, 4], explain: "Weight 2 + 1 + 2 = 5, value 12 + 10 + 15 = 37." },
    { args: [[6, 5, 5], [36, 25, 25], 10], expect: [2, 3], explain: "The best-ratio item isn't in the optimal set." },
    { args: [[5], [10], 4], expect: [], explain: "Nothing fits." },
    { args: [[3, 2, 1, 4, 5], [25, 20, 15, 40, 50], 6], expect: [3, 5], explain: "Levitin Exercise 8.2.1 — value 65." },
    { args: [[4, 4], [5, 5], 8], expect: [1, 2] },
    { args: [[1, 3, 4, 5], [1, 4, 5, 7], 7], expect: [2, 3] },
    { args: [[2, 2, 3], [3, 3, 7], 4], expect: [3], explain: "Item 3 alone (value 7) beats the two small items together (value 6)." },
  ],
  random: { count: 25, gen: (r, i) => { const n = 1 + (i % 12); return [r.array(n, 1, 12), r.array(n, 1, 50), r.int(1, 35)]; } },
  verify: (got, [w, v, W]) => {
    if (!Array.isArray(got)) return "Return a list of item numbers.";
    const n = w.length, best = DP.knapTable(w, v, W)[n][W];
    const P = got.slice().sort((a, b) => a - b);
    let tw = 0, tv = 0;
    for (let k = 0; k < P.length; k++) {
      if (!Number.isInteger(P[k]) || P[k] < 1 || P[k] > n) return `Item number ${P[k]} is not between 1 and n = ${n} — items are numbered from 1.`;
      if (k && P[k] === P[k - 1]) return `Item ${P[k]} appears twice — each item can be taken only once.`;
      tw += w[P[k] - 1]; tv += v[P[k] - 1];
    }
    if (tw > W) return `Your items weigh ${tw}, more than the capacity ${W}.`;
    if (tv !== best) return `Your items are worth ${tv}, but the best possible value is ${best}.`;
    return true;
  },
  mutants: [
    { fn: (w, v, W) => { const F = DP.knapTable(w, v, W), out = []; let j = W; for (let i = w.length; i >= 1; i--) if (F[i][j] > F[i - 1][j]) { out.push(i - 1); j -= w[i - 1]; } return out.reverse(); }, hint: "The right items, but every number is one too small — you may be reporting 0-based indexes. Items are numbered 1..n here." },
    { fn: (w, v, W) => { const F = DP.knapTable(w, v, W), out = []; for (let i = w.length; i >= 1; i--) if (F[i][W] > F[i - 1][W]) out.push(i); return out.reverse(); }, hint: "Your list often weighs more than W. After you decide item i is in, the rest of the subset must fit in the REMAINING capacity — the column you look at has to move left by w[i]." },
    { fn: (w, v, W) => DP.greedyRatio(w, v, W), hint: "These are the greedy picks (best value-per-weight first). Whole items need the DP table: fill it, then walk back from F[n, W]." },
  ],
  hints: [
    "Fill the table F as in the knapsack problem. Standing at F[i, j], how can you tell — just by comparing two cells — whether item i must be in an optimal subset?",
    "If F[i, j] = F[i − 1, j], an optimal subset of the first i items for capacity j can skip item i. If F[i, j] > F[i − 1, j], item i must be in it.",
    "j ← W; for i ← n downto 1: if F[i, j] > F[i − 1, j] then record i and set j ← j − w[i]. Reverse the list (or build it from the front) so it is increasing.",
  ],
  starter: {
    pseudo: `ALGORITHM KnapsackItems(w[1..n], v[1..n], W)
    // Output: item numbers (1-based, increasing) of one optimal subset
    F ← matrix(n + 1, W + 1, 0)
    ...
    items ← []
    j ← W
    ...
    return items`,
    js: `function KnapsackItems(w, v, W) {
  // return 1-based item numbers, increasing
}`,
  },
  solution: {
    pseudo: `ALGORITHM KnapsackItems(w[1..n], v[1..n], W)
    F ← matrix(n + 1, W + 1, 0)
    for i ← 1 to n do
        for j ← 1 to W do
            F[i, j] ← F[i - 1, j]
            if j ≥ w[i] and v[i] + F[i - 1, j - w[i]] > F[i, j] then
                F[i, j] ← v[i] + F[i - 1, j - w[i]]
    items ← []
    j ← W
    for i ← n downto 1 do
        if F[i, j] > F[i - 1, j] then
            append(items, i)
            j ← j - w[i]
    return reverse(items)`,
    js: `function KnapsackItems(w, v, W) {
  const n = w.length;
  const F = Array.from({ length: n + 1 }, () => Array(W + 1).fill(0));
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= W; j++) {
      F[i][j] = F[i - 1][j];
      if (j >= w[i - 1]) F[i][j] = Math.max(F[i][j], v[i - 1] + F[i - 1][j - w[i - 1]]);
    }
  const items = [];
  let j = W;
  for (let i = n; i >= 1; i--)
    if (F[i][j] > F[i - 1][j]) { items.push(i); j -= w[i - 1]; }
  return items.reverse();
}`,
    python: `def knapsack_items(w, v, W):
    n = len(w)
    F = [[0] * (W + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for j in range(1, W + 1):
            F[i][j] = F[i - 1][j]
            if j >= w[i - 1]:
                F[i][j] = max(F[i][j], v[i - 1] + F[i - 1][j - w[i - 1]])
    items, j = [], W
    for i in range(n, 0, -1):
        if F[i][j] > F[i - 1][j]:
            items.append(i)
            j -= w[i - 1]
    return items[::-1]`,
    explain: "F[i, j] > F[i − 1, j] means no subset of the first i − 1 items reaches that value within capacity j, so item i is included, and the rest is an optimal subset for (i − 1, j − w_i). The table costs Θ(nW); the backtrace visits each row once: O(n) (Levitin Exercise 8.2.3c).",
  },
  complexity: "Θ(nW) to fill, O(n) to backtrace",
  followUp: "Tell whether the optimal subset is UNIQUE from the same table (Levitin Exercise 8.2.1c): look for ties F[i, j] = v[i] + F[i − 1, j − w[i]] = F[i − 1, j] on the backtrace path. With a one-row table you lose the backtrace — Hirschberg-style divide-and-conquer gets it back in linear space.",
  distractors: ["if F[i, W] > F[i - 1, W] then", "j ← j - v[i]", "for i ← 1 to n do"],
  visual: "sims/dp-studio.html",
  lesson: "lessons/08-dynamic-programming/README.md",
});

ForgeProblems.add({
  id: "edit-distance",
  title: "Edit Distance (Levenshtein)",
  level: 4, chapter: 8, difficulty: 3,
  topics: ["dynamic programming", "2-D table", "strings", "sequence alignment"],
  strategy: "Dynamic programming (prefix × prefix table)",
  source: "Levitin Exercise 8.2.9b (optimal string editing) · Interview classic",
  summary: "Fewest single-character insertions, deletions and substitutions that turn X into Y.",
  statement: `
<p>Spell checkers ("did you mean…?"), fuzzy search and deoxyribonucleic acid (DNA) alignment all measure how far apart two strings are. The <b>edit
distance</b> is the smallest number of single-character operations — <b>insert</b>, <b>delete</b> or <b>substitute</b> (each costs 1) —
that turn <code>X</code> into <code>Y</code> (Levitin Exercise 8.2.9, "optimal string editing").</p>
<ul>
<li><b>Input:</b> strings <code>X</code> and <code>Y</code> of length 0..16 (0-based: <code>X[0]</code> is the first character).</li>
<li><b>Output:</b> the edit distance.</li>
</ul>
<p>Example: <code>"kitten" → "sitting"</code> takes 3 edits: k→s, e→i, insert g.</p>`,
  entry: "EditDistance",
  params: ["X", "Y"],
  tests: [
    { args: ["kitten", "sitting"], expect: 3, explain: "Substitute k→s and e→i, insert g." },
    { args: ["", "abc"], expect: 3, explain: "From the empty string: three insertions." },
    { args: ["abc", "abc"], expect: 0, explain: "Equal strings: nothing to do." },
    { args: ["abc", ""], expect: 3 },
    { args: ["horse", "ros"], expect: 3, explain: "h→r, delete r, delete e." },
    { args: ["intention", "execution"], expect: 5 },
    { args: ["a", "b"], expect: 1, explain: "One substitution (not a delete plus an insert)." },
    { args: ["ab", "ba"], expect: 2 },
  ],
  random: { count: 25, gen: (r, i) => [r.word(r.int(0, 12), i % 2 ? "ab" : "abcd"), r.word(r.int(0, 12), i % 2 ? "ab" : "abcd")] },
  reference: (X, Y) => { const m = X.length, n = Y.length, D = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i ? (j ? 0 : i) : j))); for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (X[i - 1] === Y[j - 1] ? 0 : 1)); return D[m][n]; },
  growth: { metric: "steps", sizes: [8, 16, 32, 64, 128], gen: (r, n) => [r.word(n, "acgt"), r.word(n, "acgt")], expect: "n^2" },
  mutants: [
    { fn: (X, Y) => { const m = X.length, n = Y.length, D = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0)); for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (X[i - 1] === Y[j - 1] ? 0 : 1)); return D[m][n]; }, hint: "Check row 0 and column 0 of your table. Turning the first i characters of X into the EMPTY string takes i deletions, so D[i, 0] = i (and D[0, j] = j) — they are not 0. Try \"\" vs \"abc\"." },
    { fn: (X, Y) => X.length + Y.length - 2 * DP.lcs(X, Y), hint: "Your answers only use insertions and deletions (\"a\" → \"b\" costs 2 for you). A substitution changes one character for cost 1: that's the diagonal move D[i − 1, j − 1] + 1 when the characters differ." },
    { fn: (X, Y) => { const m = X.length, n = Y.length, D = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i ? (j ? 0 : i) : j))); for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + 1); return D[m][n]; }, hint: "Equal strings should have distance 0, but yours doesn't. When X[i − 1] = Y[j − 1], the diagonal move costs NOTHING — the character is already right." },
  ],
  hints: [
    "Look at the last characters of the two prefixes. The last operation in an optimal edit either deleted X's last character, inserted Y's last character, or matched/substituted one into the other. What remains in each case?",
    "D[i, j] = distance between the first i characters of X and the first j of Y. D[i, 0] = i and D[0, j] = j. Otherwise take the min of D[i − 1, j] + 1, D[i, j − 1] + 1 and D[i − 1, j − 1] + (0 if the characters match, else 1).",
    "Fill row 0 and column 0 first, then for i ← 1 to m, j ← 1 to n: cost ← 0 or 1 by comparing X[i − 1] with Y[j − 1]; D[i, j] ← min(D[i − 1, j] + 1, D[i, j − 1] + 1, D[i − 1, j − 1] + cost).",
  ],
  starter: {
    pseudo: `ALGORITHM EditDistance(X[0..m-1], Y[0..n-1])
    // Output: fewest insert / delete / substitute operations turning X into Y
    D ← matrix(m + 1, n + 1, 0)
    ...
    return D[m, n]`,
    js: `function EditDistance(X, Y) {
}`,
  },
  solution: {
    pseudo: `ALGORITHM EditDistance(X[0..m-1], Y[0..n-1])
    D ← matrix(m + 1, n + 1, 0)
    for i ← 0 to m do
        D[i, 0] ← i
    for j ← 0 to n do
        D[0, j] ← j
    for i ← 1 to m do
        for j ← 1 to n do
            if X[i - 1] = Y[j - 1] then
                cost ← 0
            else
                cost ← 1
            D[i, j] ← min(D[i - 1, j] + 1, D[i, j - 1] + 1, D[i - 1, j - 1] + cost)
    return D[m, n]`,
    js: `function EditDistance(X, Y) {
  const m = X.length, n = Y.length;
  const D = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) D[i][0] = i;
  for (let j = 0; j <= n; j++) D[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++) {
      const cost = X[i - 1] === Y[j - 1] ? 0 : 1;
      D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + cost);
    }
  return D[m][n];
}`,
    python: `def edit_distance(X, Y):
    m, n = len(X), len(Y)
    D = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        D[i][0] = i
    for j in range(n + 1):
        D[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            cost = 0 if X[i - 1] == Y[j - 1] else 1
            D[i][j] = min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + cost)
    return D[m][n]`,
    explain: "An optimal edit script can be reordered so that its last operation touches the last characters: delete x_i, insert y_j, or match/substitute x_i with y_j — three cases giving the min-of-three recurrence. Θ(mn) cells at Θ(1) each: Θ(mn) time and space.",
  },
  complexity: "Θ(mn) time and space (Θ(min(m, n)) space with two rows)",
  followUp: "Backtrace the table to print the edit script. Add transpositions (swap two adjacent letters, cost 1) to get the Damerau distance used by spell checkers; with weighted costs this becomes the Needleman–Wunsch alignment from bioinformatics.",
  distractors: ["D[i, 0] ← 0", "D[i, j] ← min(D[i - 1, j] + 1, D[i, j - 1] + 1, D[i - 1, j - 1] + 1)", "if X[i] = Y[j] then"],
  visual: "sims/dp-studio.html",
  lesson: "lessons/08-dynamic-programming/README.md",
});

ForgeProblems.add({
  id: "optimal-bst-cost",
  title: "Optimal Binary Search Tree (Cost)",
  level: 4, chapter: 8, difficulty: 3,
  topics: ["dynamic programming", "interval DP", "binary search trees", "probabilities"],
  strategy: "Dynamic programming over key ranges (diagonal by diagonal)",
  source: "Levitin §8.3",
  summary: "Minimum average number of comparisons in a successful search, over all binary search trees for keys with given probabilities.",
  statement: `
<p>If some keys are searched far more often than others, a perfectly balanced Binary Search Tree (BST) isn't the best one. Levitin §8.3
builds the <b>optimal</b> BST by Dynamic Programming (DP) over ranges of consecutive keys: try every key of the range as the root and
reuse the best subtrees for the two sides.</p>
<p>Keys a₁ &lt; a₂ &lt; … &lt; aₙ are searched with probabilities <code>P[1..n]</code>. A key at level ℓ (the root is level 1) costs ℓ
comparisons. Return the <b>smallest possible average number of comparisons</b> in a successful search, C(1, n).</p>
<ul>
<li><b>Input:</b> <code>P</code> — 1 ≤ n ≤ 12 non-negative numbers (1-based view <code>P[1..n]</code>), summing to 1.</li>
<li><b>Output:</b> C(1, n) (compared within 10⁻⁶).</li>
</ul>
<p>Recurrence (Levitin eq. 8.8): <code>C(i, j) = min over i ≤ k ≤ j of { C(i, k−1) + C(k+1, j) } + (P[i] + … + P[j])</code>,
with <code>C(i, i−1) = 0</code> (empty tree). Book example: P = 0.1, 0.2, 0.4, 0.3 → <b>1.7</b>.</p>`,
  entry: "OptimalBST",
  params: ["P"],
  tests: [
    { args: [[0.1, 0.2, 0.4, 0.3]], expect: 1.7, explain: "The book's keys A, B, C, D: root C, with B (and A below it) on the left and D on the right." },
    { args: [[1]], expect: 1, explain: "One key: always found at the root, 1 comparison." },
    { args: [[0.5, 0.5]], expect: 1.5, explain: "One key at level 1, the other at level 2." },
    { args: [[0.3, 0.25, 0.25, 0.2]], expect: 1.95, explain: "The most likely key (A) is NOT the root of the optimal tree." },
    { args: [[0.25, 0.25, 0.25, 0.25]], expect: 2, explain: "Equal probabilities: a balanced tree (levels 1, 2, 2, 3)." },
    { args: [[0.05, 0.05, 0.8, 0.05, 0.05]], expect: 1.3, explain: "A dominant middle key at the root; each side is a two-key chain." },
    { args: [[0.9, 0.05, 0.05]], expect: 1.15 },
  ],
  random: { count: 25, gen: (r, i) => { const n = 1 + (i % 10); const raw = r.array(n, 1, 20), s = raw.reduce((a, b) => a + b, 0); return [raw.map((x) => x / s)]; } },
  reference: (P) => { const n = P.length, C = Array.from({ length: n + 2 }, () => Array(n + 1).fill(0)); for (let i = 1; i <= n; i++) C[i][i] = P[i - 1]; for (let d = 1; d < n; d++) for (let i = 1; i + d <= n; i++) { const j = i + d; let best = Infinity, s = 0; for (let k = i; k <= j; k++) best = Math.min(best, C[i][k - 1] + C[k + 1][j]); for (let t = i; t <= j; t++) s += P[t - 1]; C[i][j] = best + s; } return C[1][n]; },
  compare: "float",
  growth: { metric: "steps", sizes: [4, 8, 16, 32, 48], gen: (r, n) => { const raw = r.array(n, 1, 9), s = raw.reduce((a, b) => a + b, 0); return [raw.map((x) => x / s)]; }, expect: "n^3" },
  mutants: [
    { fn: (P) => { const cost = (i, j, lvl) => { if (i > j) return 0; let k = i; for (let t = i; t <= j; t++) if (P[t - 1] > P[k - 1]) k = t; return lvl * P[k - 1] + cost(i, k - 1, lvl + 1) + cost(k + 1, j, lvl + 1); }; return cost(1, P.length, 1); }, hint: "This is the greedy tree: put the most probable key at the root, then repeat on each side. Levitin Exercise 8.3.5 asks whether that's always optimal — it isn't (try 0.3, 0.25, 0.25, 0.2). Try EVERY key of the range as the root." },
    { fn: (P) => { const cost = (i, j, lvl) => { if (i > j) return 0; const k = Math.floor((i + j) / 2); return lvl * P[k - 1] + cost(i, k - 1, lvl + 1) + cost(k + 1, j, lvl + 1); }; return cost(1, P.length, 1); }, hint: "You're building a perfectly balanced tree (middle key as root). That ignores the probabilities: a frequently searched key should sit higher even if it isn't in the middle. Minimize over every possible root k." },
    { fn: (P) => { const n = P.length, C = Array.from({ length: n + 2 }, () => Array(n + 1).fill(0)); for (let i = 1; i <= n; i++) C[i][i] = P[i - 1]; for (let d = 1; d < n; d++) for (let i = 1; i + d <= n; i++) { const j = i + d; let best = Infinity; for (let k = i; k <= j; k++) best = Math.min(best, C[i][k - 1] + C[k + 1][j]); C[i][j] = best + P[j - 1]; } return C[1][n]; }, hint: "Your costs are too small. When two subtrees hang under a new root, EVERY key in the range i..j moves one level deeper — so you must add the whole sum P[i] + … + P[j], not just one probability." },
  ],
  hints: [
    "Some key a_k of the range a_i..a_j must be the root. Then a_i..a_{k−1} form its left subtree and a_{k+1}..a_j its right. What should those subtrees be — and how do their levels change under the new root?",
    "Every key in both subtrees drops one level, which adds P[i] + … + P[j] in total. So C(i, j) = min over k of C(i, k − 1) + C(k + 1, j), plus that sum. Fill ranges by increasing length d = j − i (diagonal by diagonal).",
    "Use C ← matrix(n + 2, n + 1, 0) so C[i, i − 1] and C[n + 1, n] exist and are 0; set C[i, i] ← P[i]; then for d ← 1 to n − 1, for i ← 1 to n − d, with j ← i + d, take the min over k ← i to j and add the sum of P[i..j].",
  ],
  starter: {
    pseudo: `ALGORITHM OptimalBST(P[1..n])
    // Input: search probabilities P[1..n] (1-based) of sorted keys
    // Output: average number of comparisons in the optimal BST
    C ← matrix(n + 2, n + 1, 0)
    for i ← 1 to n do
        C[i, i] ← P[i]
    for d ← 1 to n - 1 do
        ...
    return C[1, n]`,
    js: `function OptimalBST(P) {
  // P[i - 1] is the probability of key i in JavaScript
}`,
  },
  solution: {
    pseudo: `ALGORITHM OptimalBST(P[1..n])
    C ← matrix(n + 2, n + 1, 0)
    for i ← 1 to n do
        C[i, i] ← P[i]
    for d ← 1 to n - 1 do
        for i ← 1 to n - d do
            j ← i + d
            minval ← ∞
            for k ← i to j do
                if C[i, k - 1] + C[k + 1, j] < minval then
                    minval ← C[i, k - 1] + C[k + 1, j]
            total ← 0
            for s ← i to j do
                total ← total + P[s]
            C[i, j] ← minval + total
    return C[1, n]`,
    js: `function OptimalBST(P) {
  const n = P.length;
  const C = Array.from({ length: n + 2 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= n; i++) C[i][i] = P[i - 1];
  for (let d = 1; d <= n - 1; d++)
    for (let i = 1; i <= n - d; i++) {
      const j = i + d;
      let minval = Infinity, total = 0;
      for (let k = i; k <= j; k++) minval = Math.min(minval, C[i][k - 1] + C[k + 1][j]);
      for (let s = i; s <= j; s++) total += P[s - 1];
      C[i][j] = minval + total;
    }
  return C[1][n];
}`,
    python: `def optimal_bst(P):
    n = len(P)
    C = [[0.0] * (n + 1) for _ in range(n + 2)]
    for i in range(1, n + 1):
        C[i][i] = P[i - 1]
    for d in range(1, n):
        for i in range(1, n - d + 1):
            j = i + d
            minval = min(C[i][k - 1] + C[k + 1][j] for k in range(i, j + 1))
            C[i][j] = minval + sum(P[i - 1:j])
    return C[1][n]`,
    explain: "By the principle of optimality both subtrees of an optimal root must themselves be optimal; hanging them one level lower adds each key's probability once, giving recurrence 8.8. There are Θ(n²) ranges and each tries up to n roots: Θ(n³) time, Θ(n²) space.",
  },
  complexity: "Θ(n³) time, Θ(n²) space",
  followUp: "Record the best root R[i, j] too and rebuild the tree in linear time (Levitin Exercise 8.3.3). Knuth's observation R[i, j − 1] ≤ R[i, j] ≤ R[i + 1, j] cuts the time to Θ(n²); prefix sums make each range sum Θ(1) (Exercise 8.3.4).",
  distractors: ["C[i, j] ← minval + P[j]", "for k ← i to j - 1 do", "C ← matrix(n, n, 0)"],
  visual: "sims/optimal-bst.html",
  lesson: "lessons/08-dynamic-programming/README.md",
});

ForgeProblems.add({
  id: "matrix-chain-order",
  title: "Matrix Chain Multiplication",
  level: 4, chapter: 8, difficulty: 3,
  topics: ["dynamic programming", "interval DP", "matrices", "parenthesization"],
  strategy: "Dynamic programming over subchains (by length)",
  source: "Levitin Exercise 8.3.11 (adapted)",
  summary: "Choose the parenthesization of A₁·A₂·…·Aₙ that minimizes scalar multiplications.",
  statement: `
<p>Matrix multiplication is associative, so (A₁A₂)A₃ = A₁(A₂A₃) — but the <b>cost</b> can differ by a factor of 1000 or more
(Levitin Exercise 8.3.11). Multiplying a p × q matrix by a q × r matrix with the definition-based algorithm takes <code>p·q·r</code>
scalar multiplications. This is the same "try every split point of a range" Dynamic Programming (DP) as the optimal Binary Search Tree (BST).</p>
<p>Matrix Aᵢ has dimensions <code>d[i−1] × d[i]</code>, for i = 1..n. Return the <b>minimum total number of scalar multiplications</b>
needed to compute A₁·A₂·…·Aₙ.</p>
<ul>
<li><b>Input:</b> <code>d</code> — a list of n + 1 positive integers, 1 ≤ n ≤ 12 (header <code>d[0..n]</code> binds n = number of matrices).</li>
<li><b>Output:</b> the minimum cost (0 when n = 1).</li>
</ul>
<p>Example: <code>d = [10, 100, 5, 50]</code>: (A₁A₂)A₃ costs 10·100·5 + 10·5·50 = 7500, while A₁(A₂A₃) costs 75000.</p>`,
  entry: "MatrixChain",
  params: ["d"],
  tests: [
    { args: [[10, 100, 5, 50]], expect: 7500, explain: "(A₁A₂)A₃ = 5000 + 2500." },
    { args: [[5, 10]], expect: 0, explain: "A single matrix: nothing to multiply." },
    { args: [[2, 3, 4]], expect: 24, explain: "Two matrices: one product, 2·3·4." },
    { args: [[1000, 1, 1000, 1]], expect: 2000, explain: "A₁(A₂A₃) costs 2000; left-to-right costs 2,000,000 — the factor-1000 gap from Exercise 8.3.11a." },
    { args: [[30, 35, 15, 5, 10, 20, 25]], expect: 15125, explain: "A classic six-matrix instance." },
    { args: [[40, 20, 30, 10, 30]], expect: 26000 },
    { args: [[10, 20, 30, 40, 30]], expect: 30000 },
    { args: [[1, 2, 3, 4, 3]], expect: 30 },
  ],
  random: { count: 25, gen: (r, i) => [r.array(2 + (i % 10), 1, 30)] },
  reference: (d) => { const n = d.length - 1, M = Array.from({ length: n + 1 }, () => Array(n + 1).fill(0)); for (let len = 2; len <= n; len++) for (let i = 1; i + len - 1 <= n; i++) { const j = i + len - 1; M[i][j] = Infinity; for (let k = i; k < j; k++) M[i][j] = Math.min(M[i][j], M[i][k] + M[k + 1][j] + d[i - 1] * d[k] * d[j]); } return M[1][n]; },
  growth: { metric: "steps", sizes: [4, 8, 16, 32, 48], gen: (r, n) => [r.array(n + 1, 1, 50)], expect: "n^3" },
  mutants: [
    { fn: (d) => { let c = 0; for (let k = 2; k < d.length; k++) c += d[0] * d[k - 1] * d[k]; return c; }, hint: "Your answers are the cost of multiplying strictly left to right, ((A₁A₂)A₃)…. The whole point is to CHOOSE the order: for each subchain Aᵢ..Aⱼ, try every split point k." },
    { fn: (d) => { const D = d.slice(); let c = 0; while (D.length > 2) { let b = 1; for (let t = 1; t < D.length - 1; t++) if (D[t - 1] * D[t] * D[t + 1] < D[b - 1] * D[b] * D[b + 1]) b = t; c += D[b - 1] * D[b] * D[b + 1]; D.splice(b, 1); } return c; }, hint: "This looks greedy: always multiply the adjacent pair that is cheapest RIGHT NOW. A cheap step can create an awkwardly shaped matrix that makes later products expensive. Let a table compare every split of every subchain." },
    { fn: (d) => { const n = d.length - 1, M = Array.from({ length: n + 1 }, () => Array(n + 1).fill(0)); for (let len = 2; len <= n; len++) for (let i = 1; i + len - 1 <= n; i++) { const j = i + len - 1; M[i][j] = Infinity; for (let k = i; k < j; k++) M[i][j] = Math.min(M[i][j], M[i][k] + M[k + 1][j] + d[i] * d[k] * d[j]); } return M[1][n]; }, hint: "Check the dimensions in your cost term. Aᵢ..A_k produces a d[i − 1] × d[k] matrix and A_{k+1}..Aⱼ a d[k] × d[j] one, so the final product costs d[i − 1]·d[k]·d[j] — watch the index of the first factor." },
  ],
  hints: [
    "In the best way to compute Aᵢ·…·Aⱼ, the LAST multiplication splits the chain into (Aᵢ…A_k)(A_{k+1}…Aⱼ) for some k. What does that last multiplication cost, and what must be true about how each half was computed?",
    "M[i, j] = min over i ≤ k < j of M[i, k] + M[k + 1, j] + d[i − 1]·d[k]·d[j], with M[i, i] = 0. Short chains must be solved before long ones — loop over the chain length first.",
    "for span ← 2 to n, for i ← 1 to n − span + 1: j ← i + span − 1; M[i, j] ← ∞; then for k ← i to j − 1 keep the smallest cost. Return M[1, n].",
  ],
  starter: {
    pseudo: `ALGORITHM MatrixChain(d[0..n])
    // Matrix A_i is d[i-1] × d[i], i = 1..n
    // Output: minimum number of scalar multiplications for A_1 ... A_n
    M ← matrix(n + 1, n + 1, 0)
    for span ← 2 to n do
        ...
    return M[1, n]`,
    js: `function MatrixChain(d) {
  const n = d.length - 1;
}`,
  },
  solution: {
    pseudo: `ALGORITHM MatrixChain(d[0..n])
    M ← matrix(n + 1, n + 1, 0)
    for span ← 2 to n do
        for i ← 1 to n - span + 1 do
            j ← i + span - 1
            M[i, j] ← ∞
            for k ← i to j - 1 do
                cost ← M[i, k] + M[k + 1, j] + d[i - 1] * d[k] * d[j]
                if cost < M[i, j] then
                    M[i, j] ← cost
    return M[1, n]`,
    js: `function MatrixChain(d) {
  const n = d.length - 1;
  const M = Array.from({ length: n + 1 }, () => Array(n + 1).fill(0));
  for (let span = 2; span <= n; span++)
    for (let i = 1; i <= n - span + 1; i++) {
      const j = i + span - 1;
      M[i][j] = Infinity;
      for (let k = i; k < j; k++) M[i][j] = Math.min(M[i][j], M[i][k] + M[k + 1][j] + d[i - 1] * d[k] * d[j]);
    }
  return M[1][n];
}`,
    python: `def matrix_chain(d):
    n = len(d) - 1
    M = [[0] * (n + 1) for _ in range(n + 1)]
    for span in range(2, n + 1):
        for i in range(1, n - span + 2):
            j = i + span - 1
            M[i][j] = min(M[i][k] + M[k + 1][j] + d[i - 1] * d[k] * d[j] for k in range(i, j))
    return M[1][n]`,
    explain: "The last multiplication splits the chain at some k, and both halves must be computed optimally (principle of optimality), so M[i, j] is the min over k of the two halves plus d[i − 1]·d[k]·d[j]. Θ(n²) subchains × up to n splits: Θ(n³) time, Θ(n²) space — versus the Catalan number of parenthesizations (≈ 4ⁿ/n^1.5) for exhaustive search.",
  },
  complexity: "Θ(n³) time, Θ(n²) space",
  followUp: "Record the best split S[i, j] and print the parenthesization recursively. Database query optimizers choose join orders with this very DP (System R), and deep-learning compilers use it to order tensor contractions.",
  distractors: ["cost ← M[i, k] + M[k + 1, j] + d[i] * d[k] * d[j]", "for k ← i to j do", "M[i, j] ← 0"],
  visual: "sims/optimal-bst.html",
  lesson: "lessons/08-dynamic-programming/README.md",
});

})();
