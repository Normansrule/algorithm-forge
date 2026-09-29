/* Pack F — Greedy Technique & Iterative Improvement (Levitin Ch 9–10), level 4.
   Prim, Kruskal + union-find, Dijkstra, Huffman, greedy scheduling, change-making,
   simplex, maximum flow, bipartite matching, stable marriage.
   Format: ../PROBLEM_FORMAT.md · validate: node tools/validate-problems.mjs greedy-iterative.js */
(function () {
  "use strict";

  /* ---------- shared helpers (kept inside this closure so packs can't collide) ---------- */
  const INF = Infinity;

  // Random connected undirected graph on n vertices: a random spanning tree + extra edges. Weights lo..hi.
  function randConnected(r, n, extra, lo, hi) {
    const E = [];
    const seen = new Set();
    const key = (u, v) => (u < v ? u + "," + v : v + "," + u);
    const perm = r.shuffle([...Array(n).keys()]);
    for (let k = 1; k < n; k++) {
      const u = perm[k], v = perm[r.int(0, k - 1)];
      seen.add(key(u, v));
      E.push([u, v, r.int(lo, hi)]);
    }
    for (let t = 0; t < extra && n > 2; t++) {
      const u = r.int(0, n - 1), v = r.int(0, n - 1);
      if (u === v || seen.has(key(u, v))) continue;
      seen.add(key(u, v));
      E.push([u, v, r.int(lo, hi)]);
    }
    return r.shuffle(E);
  }
  // Random directed graph (no self loops, no parallel edges).
  function randDigraph(r, n, p, lo, hi) {
    const E = [];
    for (let u = 0; u < n; u++) for (let v = 0; v < n; v++) if (u !== v && r() < p) E.push([u, v, r.int(lo, hi)]);
    return E;
  }
  // Minimum spanning tree weight (Kruskal with union-find).
  function mstWeight(n, E) {
    const p = [...Array(n).keys()];
    const f = (x) => { while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; } return x; };
    let total = 0;
    E.slice().sort((a, b) => a[2] - b[2]).forEach(([u, v, w]) => { const a = f(u), b = f(v); if (a !== b) { p[a] = b; total += w; } });
    return total;
  }
  // Dijkstra on a directed edge list: returns [dist, parent].
  function dijkstra(n, E, s) {
    const d = Array(n).fill(INF), par = Array(n).fill(-1), done = Array(n).fill(false);
    d[s] = 0;
    for (let k = 0; k < n; k++) {
      let u = -1;
      for (let v = 0; v < n; v++) if (!done[v] && d[v] < INF && (u === -1 || d[v] < d[u])) u = v;
      if (u === -1) break;
      done[u] = true;
      for (const [a, b, w] of E) if (a === u && d[u] + w < d[b]) { d[b] = d[u] + w; par[b] = u; }
    }
    return [d, par];
  }
  // Greedy coin count and the true minimum (dynamic programming).
  const greedyCount = (a, D) => { let g = 0; for (const d of D) { g += Math.floor(a / d); a %= d; } return g; };
  function smallestCounterexample(D, limit) {
    const F = [0];
    for (let a = 1; a <= limit; a++) {
      let b = INF;
      for (const d of D) if (d <= a) b = Math.min(b, F[a - d] + 1);
      F[a] = b;
      if (greedyCount(a, D) > F[a]) return a;
    }
    return 0;
  }

  /* =====================================================================
     1. Greedy change-making (canonical coin systems)
     ===================================================================== */
  const CANONICAL = [[25, 10, 5, 1], [50, 20, 10, 5, 2, 1], [100, 25, 10, 5, 1], [10, 5, 2, 1], [1], [8, 4, 2, 1], [200, 100, 50, 20, 10, 5, 2, 1]];
  ForgeProblems.add({
    id: "greedy-change-canonical",
    title: "Greedy Change-Making",
    level: 4, chapter: 9, difficulty: 1,
    topics: ["greedy", "change-making"],
    strategy: "Greedy (largest coin first)",
    source: "Levitin Exercise 9.1.1 (adapted) · Lecture 9",
    summary: "Give change for n using the largest coin first; return how many of each coin you used.",
    statement: `
<p>A cashier's instinct — "hand over the biggest coin that still fits, repeat" — is the textbook example of the
<b>greedy technique</b>: every choice is feasible, locally optimal, and never taken back (Levitin §9 intro).</p>
<p>Given an amount <code>n ≥ 0</code> and coin denominations <code>D[0..m-1]</code> sorted in <b>decreasing</b> order
(the last one is always 1, so change is always possible), return an array <code>C[0..m-1]</code> where
<code>C[i]</code> is how many coins of value <code>D[i]</code> the greedy method hands out.</p>
<p>Example: <code>n = 48</code>, <code>D = [25, 10, 5, 1]</code> → one 25, two 10s, no 5, three 1s → <code>[1, 2, 0, 3]</code>.</p>
<p>All coin systems in the tests are "normal" (canonical) ones, where greedy is known to give the fewest coins.</p>`,
    entry: "GreedyChange",
    params: ["n", "D"],
    tests: [
      { args: [48, [25, 10, 5, 1]], expect: [1, 2, 0, 3], explain: "48 = 25 + 10 + 10 + 1 + 1 + 1." },
      { args: [25, [25, 10, 5, 1]], expect: [1, 0, 0, 0], explain: "The amount equals a coin exactly — one quarter, nothing else." },
      { args: [0, [25, 10, 5, 1]], expect: [0, 0, 0, 0], explain: "Nothing to pay: no coins at all." },
      { args: [99, [50, 20, 10, 5, 2, 1]], expect: [1, 2, 0, 1, 2, 0] },
      { args: [7, [1]], expect: [7] },
      { args: [30, [25, 10, 5, 1]], expect: [1, 0, 1, 0] },
      { args: [16, [8, 4, 2, 1]], expect: [2, 0, 0, 0] },
    ],
    random: { count: 30, gen: (r, i) => [r.int(0, 220), CANONICAL[i % CANONICAL.length].slice()] },
    reference: (n, D) => D.map((d) => { const c = Math.floor(n / d); n -= c * d; return c; }),
    mutants: [
      { fn: (n, D) => D.map((d) => { let c = 0; while (n > d) { n -= d; c++; } return c; }), hint: "When the amount left is EXACTLY a coin's value you skip that coin (try n = 25 with a 25¢ coin). Check the comparison in your loop condition: should equality count?" },
      { fn: (n, D) => D.map((d) => { if (n >= d) { n -= d; return 1; } return 0; }), hint: "You never give more than one coin of each value. Greedy keeps taking the same big coin while it still fits — that needs a loop, not a single if." },
      { fn: (n, D) => D.map((d) => Math.floor(n / d)), hint: "Every denomination is computed from the ORIGINAL amount. After you hand out some coins, the amount still owed must shrink before you look at the next (smaller) coin." },
    ],
    hints: [
      "Which coin would a cashier hand over first? After handing it over, what problem is left?",
      "Walk through the denominations from largest to smallest. For each one, keep taking it while it still fits into the amount that is left.",
      "Inside the loop over i: while n ≥ D[i] do { n ← n − D[i]; C[i] ← C[i] + 1 }.",
    ],
    starter: {
      pseudo: `ALGORITHM GreedyChange(n, D[0..m-1])
    // Input: amount n ≥ 0; denominations D[0] > D[1] > ... > D[m-1] = 1
    // Output: C[0..m-1], the number of coins of each denomination greedy uses
    C ← array(m, 0)
    for i ← 0 to m - 1 do
        ...
    return C`,
      js: `function GreedyChange(n, D) {
  const C = new Array(D.length).fill(0);
  // largest coin first
  return C;
}`,
    },
    solution: {
      pseudo: `ALGORITHM GreedyChange(n, D[0..m-1])
    C ← array(m, 0)
    for i ← 0 to m - 1 do
        while n ≥ D[i] do
            n ← n - D[i]
            C[i] ← C[i] + 1
    return C`,
      js: `function GreedyChange(n, D) {
  return D.map((d) => {
    const c = Math.floor(n / d);
    n -= c * d;
    return c;
  });
}`,
      python: `def greedy_change(n, D):
    C = []
    for d in D:
        C.append(n // d)
        n %= d
    return C`,
      explain: "Each denomination is visited once; with div and mod that is Θ(m) arithmetic operations (the repeated-subtraction loop costs Θ(m + total coins)). Greedy is optimal for canonical systems like American coins — but not for every coin system (see the next problem).",
    },
    complexity: "Θ(m) with div/mod",
    followUp: "Replace the inner while-loop with div and mod so the running time no longer depends on n. Interviewers then ask: for which coin systems is greedy guaranteed optimal? (That's the next problem.)",
    distractors: ["while n > D[i] do", "if n ≥ D[i] then", "for i ← m - 1 downto 0 do"],
    visual: "sims/greedy-choices.html",
    lesson: "lessons/09-greedy/README.md",
  });

  /* =====================================================================
     2. When does greedy change-making fail?
     ===================================================================== */
  ForgeProblems.add({
    id: "greedy-change-counterexample",
    title: "Break the Greedy Cashier",
    level: 4, chapter: 9, difficulty: 2,
    topics: ["greedy", "change-making", "dynamic programming", "counterexamples"],
    strategy: "Compare greedy with an exact Dynamic Programming (DP) answer",
    source: "Levitin §9 intro & §8.1 (change-making) · Lecture 9",
    summary: "Find the smallest amount for which greedy change-making uses more coins than necessary (0 if none).",
    statement: `
<p>Greedy change-making is optimal for "normal" coin systems but <b>not</b> for every system (Levitin §9 intro). A good
engineer proves a greedy rule or breaks it with a counterexample — this problem automates the breaking.</p>
<p>Given denominations <code>D[0..m-1]</code> in <b>decreasing</b> order with <code>D[m-1] = 1</code>, return the
<b>smallest amount</b> <code>a ≥ 1</code> for which the greedy method (largest coin first) uses <b>strictly more coins</b>
than the minimum possible. If greedy is optimal for every amount, return <code>0</code>.</p>
<p>Example: <code>D = [4, 3, 1]</code>. For <code>a = 6</code> greedy pays 4 + 1 + 1 (3 coins) but 3 + 3 needs only 2,
and every smaller amount is fine → answer <code>6</code>.</p>
<p><b>Useful fact</b> (Kozen &amp; Zaks, 1994): if a counterexample exists, the smallest one is less than
<code>D[0] + D[1]</code>, so you only have to check amounts up to that bound. With only one or two coin types, greedy is always optimal.</p>`,
    entry: "SmallestCounterexample",
    params: ["D"],
    tests: [
      { args: [[4, 3, 1]], expect: 6, explain: "Greedy: 4+1+1 (3 coins). Best: 3+3 (2 coins)." },
      { args: [[25, 10, 5, 1]], expect: 0, explain: "American coins are canonical — greedy is always optimal." },
      { args: [[25, 10, 1]], expect: 30, explain: "Without the nickel: greedy pays 25+1+1+1+1+1 (6 coins) but 10+10+10 needs 3." },
      { args: [[1]], expect: 0 },
      { args: [[7, 5, 1]], expect: 10, explain: "Greedy 7+1+1+1 vs 5+5 — note 10 is bigger than the largest coin." },
      { args: [[2, 1]], expect: 0 },
      { args: [[12, 5, 1]], expect: 15 },
      { args: [[9, 6, 1]], expect: 12 },
      { args: [[20, 6, 5, 1]], expect: 10, explain: "A counterexample below the largest coin: 6+1+1+1+1 vs 5+5." },
    ],
    random: {
      count: 25,
      gen: (r) => {
        const m = r.int(2, 5), s = new Set([1]);
        while (s.size < m) s.add(r.int(2, 30));
        return [[...s].sort((a, b) => b - a)];
      },
    },
    reference: (D) => (D.length < 2 ? 0 : smallestCounterexample(D, D[0] + D[1])),
    mutants: [
      { fn: (D) => smallestCounterexample(D, D[0]), hint: "You stop searching too early. A counterexample can be LARGER than the biggest coin (for [7, 5, 1] it is 10). Search every amount below D[0] + D[1]." },
      { fn: () => 0, hint: "You always answer 0. Greedy can always make change here (1 is a coin) — the question is whether it uses MORE coins than the true minimum. Compute that minimum exactly with the change-making DP (Levitin §8.1): F[a] = 1 + min over coins d ≤ a of F[a − d]." },
      { fn: (D) => { if (D.length < 3) return 0; const L = D[0] + D[1], F = [0]; for (let a = 1; a <= L; a++) { F[a] = INF; for (const d of D) if (d <= a) F[a] = Math.min(F[a], F[a - d] + 1); if (a > D[0] && greedyCount(a, D) > F[a]) return a; } return 0; }, hint: "You only start checking amounts above the largest coin. Counterexamples can be smaller than D[0]: with coins [20, 6, 5, 1], greedy pays 10 as 6+1+1+1+1 instead of 5+5. Check every amount from 1 up." },
    ],
    hints: [
      "For one fixed amount a, you need two numbers: how many coins greedy uses, and the fewest coins possible. How can you get the second one exactly?",
      "Build the change-making DP table F[0..L] with L = D[0] + D[1] (F[0] = 0, F[a] = 1 + min F[a − d]). As you fill each F[a], also run greedy on a.",
      "Scan a = 1, 2, …, L in increasing order and return the first a where greedyCount(a) > F[a]. If the scan ends, return 0.",
    ],
    starter: {
      pseudo: `ALGORITHM SmallestCounterexample(D[0..m-1])
    // Output: smallest amount where greedy uses more coins than necessary, or 0
    if m < 3 then return 0
    L ← D[0] + D[1]
    F ← array(L + 1, 0)
    for a ← 1 to L do
        ...
    return 0`,
      js: `function SmallestCounterexample(D) {
  // compare greedy with the exact minimum (DP) for every amount below D[0] + D[1]
}`,
    },
    solution: {
      pseudo: `ALGORITHM SmallestCounterexample(D[0..m-1])
    if m < 3 then return 0
    L ← D[0] + D[1]
    F ← array(L + 1, 0)
    for a ← 1 to L do
        best ← ∞
        for each d in D do
            if d ≤ a and F[a - d] + 1 < best then
                best ← F[a - d] + 1
        F[a] ← best
        g ← 0
        r ← a
        for each d in D do
            g ← g + r div d
            r ← r mod d
        if g > F[a] then return a
    return 0`,
      js: `function SmallestCounterexample(D) {
  if (D.length < 3) return 0;
  const L = D[0] + D[1], F = [0];
  for (let a = 1; a <= L; a++) {
    F[a] = Infinity;
    for (const d of D) if (d <= a) F[a] = Math.min(F[a], F[a - d] + 1);
    let g = 0, r = a;
    for (const d of D) { g += Math.floor(r / d); r %= d; }
    if (g > F[a]) return a;
  }
  return 0;
}`,
      python: `def smallest_counterexample(D):
    if len(D) < 3:
        return 0
    L = D[0] + D[1]
    F = [0] * (L + 1)
    for a in range(1, L + 1):
        F[a] = 1 + min(F[a - d] for d in D if d <= a)
        g, r = 0, a
        for d in D:
            g += r // d; r %= d
        if g > F[a]:
            return a
    return 0`,
      explain: "The DP gives the exact minimum F[a] in Θ(m) per amount, greedy costs Θ(m) per amount, and the Kozen–Zaks bound limits the scan to D[0] + D[1] amounts: Θ(m · (D[0] + D[1])) total — pseudo-polynomial, because it depends on the coin values, not just on m.",
    },
    complexity: "Θ(m · (D[0] + D[1]))",
    followUp: "Real point-of-sale systems and vending machines rely on canonical coin systems; checking a new currency design is exactly this test. A polynomial-time check in m alone exists (Pearson, 2005) — worth reading once you've done this one.",
    distractors: ["for a ← 1 to D[0] do", "if g ≠ F[a] then return 0", "best ← 0"],
    visual: "sims/greedy-choices.html",
    lesson: "lessons/09-greedy/README.md",
  });

  /* =====================================================================
     3. Activity selection (lecture interview question)
     ===================================================================== */
  const actRef = (S, F) => {
    const idx = S.map((_, i) => i).sort((a, b) => F[a] - F[b] || S[a] - S[b]);
    let cnt = 0, last = -INF;
    for (const i of idx) if (S[i] >= last) { cnt++; last = F[i]; }
    return cnt;
  };
  const actBy = (keyFn, strict) => (S, F) => {
    const idx = S.map((_, i) => i).sort((a, b) => keyFn(S, F, a) - keyFn(S, F, b) || a - b);
    const chosen = [];
    for (const i of idx) if (chosen.every((j) => (strict ? F[j] < S[i] || F[i] < S[j] : F[j] <= S[i] || F[i] <= S[j]))) chosen.push(i);
    return chosen.length;
  };
  ForgeProblems.add({
    id: "activity-selection",
    title: "Activity Selection",
    level: 4, chapter: 9, difficulty: 1,
    topics: ["greedy", "scheduling", "intervals", "sorting"],
    strategy: "Greedy (earliest finish first)",
    source: "Lecture 9 interview question · Levitin Exercise 9.1.4 (adapted)",
    summary: "Pick the largest number of non-overlapping activities.",
    statement: `
<p>One room, many meeting requests: which ones do you accept to host as many meetings as possible? This is the classic
interview question from the Greedy lecture, and the cleanest example of a greedy rule you can <i>prove</i> optimal.</p>
<p>Activity <code>i</code> runs from <code>S[i]</code> to <code>F[i]</code> (<code>S[i] &lt; F[i]</code>). Two activities
are <b>compatible</b> if one finishes no later than the other starts — touching is fine: <code>[1, 3)</code> and
<code>[3, 5)</code> can both be chosen. Return the <b>maximum number</b> of pairwise compatible activities.</p>
<p><b>Efficiency:</b> aim for Θ(n log n). You may use the built-in <code>sorted(L)</code>; it sorts a list of pairs
lexicographically (by first element, then second).</p>`,
    entry: "MaxActivities",
    params: ["S", "F"],
    tests: [
      { args: [[1, 3, 0, 5, 8, 5], [2, 4, 6, 7, 9, 9]], expect: 4, explain: "The lecture's example: activities 0, 1, 3, 4." },
      { args: [[0, 1, 3, 5], [10, 2, 4, 6]], expect: 3, explain: "Starting first is a trap: [0, 10) blocks everything else." },
      { args: [[1, 2, 3], [2, 3, 4]], expect: 3, explain: "Touching activities are compatible." },
      { args: [[], []], expect: 0 },
      { args: [[4], [9]], expect: 1 },
      { args: [[0, 6, 4], [5, 10, 7]], expect: 2, explain: "Shortest-first is a trap: [4, 7) is shortest but overlaps both others." },
      { args: [[1, 1, 1], [3, 3, 3]], expect: 1 },
      { args: [[5, 1, 3, 7], [6, 2, 4, 8]], expect: 4 },
    ],
    random: {
      count: 30,
      gen: (r, i) => {
        const n = i % 14;
        const S = [], F = [];
        for (let k = 0; k < n; k++) { const s = r.int(0, 30); S.push(s); F.push(s + r.int(1, 8)); }
        return [S, F];
      },
    },
    reference: actRef,
    growth: {
      metric: "steps", sizes: [32, 64, 128, 256, 512],
      gen: (r, n) => { const S = [], F = []; for (let k = 0; k < n; k++) { const s = r.int(0, 4 * n); S.push(s); F.push(s + r.int(1, 10)); } return [S, F]; },
      expect: "n log n",
    },
    mutants: [
      { fn: actBy((S, F, i) => S[i]), hint: "You pick the activity that STARTS first. A long early activity can block many short ones (see [0, 10) in example 2). Which activity leaves the room free the soonest?" },
      { fn: actBy((S, F, i) => F[i] - S[i]), hint: "You pick the SHORTEST activity first. A short activity can straddle two compatible ones (example 6). Think about finishing times instead of durations." },
      { fn: actBy((S, F, i) => F[i], true), hint: "Your compatibility test is too strict: an activity that starts exactly when the previous one finishes is allowed. Compare with ≥, not >." },
      { fn: (S, F) => { let cnt = 0, last = -INF; for (let i = 0; i < S.length; i++) if (S[i] >= last) { cnt++; last = F[i]; } return cnt; }, hint: "You scan the activities in the order they were given. The greedy rule only works after sorting them by finishing time." },
    ],
    hints: [
      "After you choose the first activity, you want as much of the day left over as possible. Which activity should that first one be?",
      "Sort the activities by finishing time. Walk through them once, remembering the finish time of the last activity you accepted.",
      "Accept activity (s, f) if s ≥ lastEnd; then set lastEnd ← f and count it. Tip: sorted of the pairs [F[i], S[i]] sorts by finish time.",
    ],
    starter: {
      pseudo: `ALGORITHM MaxActivities(S[0..n-1], F[0..n-1])
    // Output: the largest number of pairwise compatible activities
    P ← []
    for i ← 0 to n - 1 do
        append(P, [F[i], S[i]])
    ...
    return count`,
      js: `function MaxActivities(S, F) {
  // earliest-finish-first greedy
}`,
    },
    solution: {
      pseudo: `ALGORITHM MaxActivities(S[0..n-1], F[0..n-1])
    P ← []
    for i ← 0 to n - 1 do
        append(P, [F[i], S[i]])
    P ← sorted(P)
    count ← 0
    lastEnd ← -∞
    for each p in P do
        if p[1] ≥ lastEnd then
            count ← count + 1
            lastEnd ← p[0]
    return count`,
      js: `function MaxActivities(S, F) {
  const idx = S.map((_, i) => i).sort((a, b) => F[a] - F[b]);
  let count = 0, lastEnd = -Infinity;
  for (const i of idx) if (S[i] >= lastEnd) { count++; lastEnd = F[i]; }
  return count;
}`,
      python: `def max_activities(S, F):
    count, last_end = 0, float("-inf")
    for f, s in sorted(zip(F, S)):
        if s >= last_end:
            count += 1
            last_end = f
    return count`,
      explain: "Exchange argument: any optimal schedule can swap its first activity for the one that finishes earliest without losing anything, and the rest is the same problem on the remaining time. Sorting costs Θ(n log n) and the scan Θ(n), so Θ(n log n) overall.",
    },
    complexity: "Θ(n log n)",
    followUp: "Now return the minimum number of rooms needed to host ALL activities (the 'meeting rooms' problem — sort starts and ends, sweep with two pointers or a min-heap). Kernels and cloud schedulers solve variants of both every second.",
    distractors: ["append(P, [S[i], F[i]])", "if p[1] > lastEnd then", "lastEnd ← p[1]"],
    visual: "sims/greedy-choices.html",
    lesson: "lessons/09-greedy/README.md",
  });

  /* =====================================================================
     4. Fractional (continuous) knapsack
     ===================================================================== */
  const fracBy = (keyFn, fractions) => (W, V, cap) => {
    const idx = W.map((_, i) => i).sort((a, b) => keyFn(W, V, a) - keyFn(W, V, b) || a - b);
    let total = 0;
    for (const i of idx) {
      if (cap <= 0) break;
      if (W[i] <= cap) { total += V[i]; cap -= W[i]; }
      else if (fractions) { total += (V[i] / W[i]) * cap; cap = 0; }
    }
    return total;
  };
  const fracRef = fracBy((W, V, i) => -V[i] / W[i], true);
  ForgeProblems.add({
    id: "fractional-knapsack",
    title: "Fractional Knapsack",
    level: 4, chapter: 9, difficulty: 1,
    topics: ["greedy", "knapsack", "sorting"],
    strategy: "Greedy (best value per unit weight first)",
    source: "Levitin §12.3 (continuous knapsack) · Lecture 9",
    summary: "Fill a knapsack with divisible items to maximize value.",
    statement: `
<p>If items can be cut (gold dust, bandwidth, fuel), the knapsack problem stops being hard: a greedy rule is provably optimal.
Contrast this with the 0/1 knapsack (Levitin §8.2), where greedy fails and you need dynamic programming.</p>
<p>Item <code>i</code> has weight <code>W[i] &gt; 0</code> and value <code>V[i] ≥ 0</code>. You may take any fraction
<code>0 ≤ x<sub>i</sub> ≤ 1</code> of each item, and the total weight taken must be at most <code>cap</code>. Return the
<b>largest total value</b> you can carry (a number; answers are checked to within 10<sup>−6</sup>).</p>
<p>You may use <code>sorted(L)</code>, which sorts lists like <code>[ratio, w, v]</code> by their first element.</p>`,
    entry: "FractionalKnapsack",
    params: ["W", "V", "cap"],
    compare: "float",
    tests: [
      { args: [[10, 20, 30], [60, 100, 120], 50], expect: 240, explain: "Ratios 6, 5, 4: take items 0 and 1 whole, then 20/30 of item 2 → 60 + 100 + 80." },
      { args: [[5, 1], [10, 4], 5], expect: 12, explain: "Item 1 is worth 4 per kg, item 0 only 2 per kg: take item 1, then 4 kg of item 0." },
      { args: [[3], [10], 2], expect: 20 / 3, explain: "Only two thirds of the single item fit." },
      { args: [[4, 2], [8, 8], 0], expect: 0 },
      { args: [[1, 2], [3, 4], 10], expect: 7, explain: "Everything fits." },
      { args: [[1, 4], [1, 20], 4], expect: 20, explain: "Lightest-first is a trap: the heavy item is worth 5 per kg." },
      { args: [[6, 3, 2], [0, 9, 1], 7], expect: 10.0 },
    ],
    random: {
      count: 30,
      gen: (r, i) => { const n = 1 + (i % 10); return [r.array(n, 1, 20), r.array(n, 0, 50), r.int(0, 60)]; },
    },
    reference: fracRef,
    mutants: [
      { fn: fracBy((W, V, i) => -V[i], true), hint: "You grab the most VALUABLE item first. A valuable but very heavy item can waste capacity — compare items by value per unit of weight, V[i] / W[i]." },
      { fn: fracBy((W, V, i) => W[i], true), hint: "You grab the LIGHTEST item first. Light items can be nearly worthless — the right key is value per unit of weight." },
      { fn: fracBy((W, V, i) => -V[i] / W[i], false), hint: "When the next item doesn't fit completely you skip it. Here items are divisible: take the fraction cap / W[i] of it (worth ratio × remaining capacity) and stop." },
    ],
    hints: [
      "If you could put only ONE kilogram in the bag, which item would you take it from?",
      "Sort the items by value-per-weight V[i] / W[i], best first. Take whole items while they fit.",
      "When the next item is heavier than the remaining capacity, add (V[i] / W[i]) × cap to the total and stop — the bag is full.",
    ],
    starter: {
      pseudo: `ALGORITHM FractionalKnapsack(W[0..n-1], V[0..n-1], cap)
    items ← []
    for i ← 0 to n - 1 do
        append(items, [V[i] / W[i], W[i], V[i]])
    items ← sorted(items)
    total ← 0
    ...
    return total`,
      js: `function FractionalKnapsack(W, V, cap) {
  // greedy by value per unit weight
}`,
    },
    solution: {
      pseudo: `ALGORITHM FractionalKnapsack(W[0..n-1], V[0..n-1], cap)
    items ← []
    for i ← 0 to n - 1 do
        append(items, [V[i] / W[i], W[i], V[i]])
    items ← sorted(items)
    total ← 0
    for k ← n - 1 downto 0 do
        (r, w, v) ← items[k]
        if w ≤ cap then
            total ← total + v
            cap ← cap - w
        else
            total ← total + r * cap
            cap ← 0
    return total`,
      js: `function FractionalKnapsack(W, V, cap) {
  const idx = W.map((_, i) => i).sort((a, b) => V[b] / W[b] - V[a] / W[a]);
  let total = 0;
  for (const i of idx) {
    if (W[i] <= cap) { total += V[i]; cap -= W[i]; }
    else { total += (V[i] / W[i]) * cap; break; }
  }
  return total;
}`,
      python: `def fractional_knapsack(W, V, cap):
    total = 0.0
    for r, w, v in sorted(((v / w, w, v) for w, v in zip(W, V)), reverse=True):
        if w <= cap:
            total += v; cap -= w
        else:
            total += r * cap
            break
    return total`,
      explain: "Exchange argument: if an optimal load holds less of a higher-ratio item than greedy, swapping equal weight toward it never lowers the value. Sorting dominates: Θ(n log n); the fill loop is Θ(n).",
    },
    complexity: "Θ(n log n)",
    followUp: "Can you do it in Θ(n) without sorting? (Hint: find the 'critical' item with a quickselect-style partition on ratios.) The same bound — greedy fractional value — is the upper bound branch-and-bound uses for the 0/1 knapsack (Levitin §12.2).",
    distractors: ["append(items, [V[i], W[i], V[i]])", "for k ← 0 to n - 1 do", "total ← total + v * cap"],
    visual: "sims/greedy-choices.html",
    lesson: "lessons/09-greedy/README.md",
  });

  /* =====================================================================
     5. Job sequencing with deadlines
     ===================================================================== */
  const jobRef = (D, P) => {
    const idx = D.map((_, i) => i).sort((a, b) => P[b] - P[a]);
    const slot = [];
    let total = 0;
    for (const i of idx) { let t = D[i]; while (t >= 1 && slot[t]) t--; if (t >= 1) { slot[t] = true; total += P[i]; } }
    return total;
  };
  ForgeProblems.add({
    id: "job-sequencing-deadlines",
    title: "Job Sequencing with Deadlines",
    level: 4, chapter: 9, difficulty: 2,
    topics: ["greedy", "scheduling"],
    strategy: "Greedy (most profitable first, latest free slot)",
    source: "Interview classic · greedy scheduling (compare Levitin Exercise 9.1.3)",
    summary: "Unit-time jobs with deadlines and profits: schedule them to earn the most.",
    statement: `
<p>A single machine runs one job per time unit. Job <code>i</code> takes exactly 1 unit, has a deadline
<code>D[i] ≥ 1</code> (an integer) and pays profit <code>P[i] &gt; 0</code> only if it finishes by time <code>D[i]</code>
— that is, if it runs in one of the time slots <code>1, 2, …, D[i]</code>. Jobs that miss their deadline are simply not run.</p>
<p>Return the <b>maximum total profit</b>.</p>
<p>Example: <code>D = [2, 1, 2, 1, 3]</code>, <code>P = [100, 19, 27, 25, 15]</code> → run job 2 in slot 1, job 0 in slot 2,
job 4 in slot 3 → <code>27 + 100 + 15 = 142</code>.</p>`,
    entry: "JobSequencing",
    params: ["D", "P"],
    tests: [
      { args: [[2, 1, 2, 1, 3], [100, 19, 27, 25, 15]], expect: 142, explain: "Jobs 0, 2 and 4 fit; there is no room for 1 or 3." },
      { args: [[2, 1], [10, 5]], expect: 15, explain: "Put job 0 in its LATEST free slot (2) so slot 1 stays open for job 1." },
      { args: [[1, 1, 1], [5, 9, 3]], expect: 9, explain: "Only one slot before the deadline: keep the best job." },
      { args: [[1, 2, 2], [1, 5, 5]], expect: 10, explain: "Taking jobs in deadline order would waste slot 1 on the cheap job." },
      { args: [[1, 1, 3], [10, 9, 1]], expect: 11, explain: "Three slots exist, but only one job can use slot 1." },
      { args: [[4], [7]], expect: 7 },
      { args: [[], []], expect: 0 },
      { args: [[3, 3, 3, 3], [4, 8, 6, 2]], expect: 18 },
    ],
    random: {
      count: 30,
      gen: (r, i) => { const n = 1 + (i % 12); return [r.array(n, 1, Math.max(1, Math.floor(n / 2))), r.array(n, 1, 40)]; },
    },
    reference: jobRef,
    mutants: [
      { fn: (D, P) => { const idx = D.map((_, i) => i).sort((a, b) => P[b] - P[a]); const slot = []; let total = 0; for (const i of idx) { for (let t = 1; t <= D[i]; t++) if (!slot[t]) { slot[t] = true; total += P[i]; break; } } return total; }, hint: "You put each job in the EARLIEST free slot. That can steal a slot that a job with a tighter deadline needed (example 2). Place each job as late as its deadline allows." },
      { fn: (D, P) => { const idx = D.map((_, i) => i).sort((a, b) => D[a] - D[b] || a - b); let used = 0, total = 0; for (const i of idx) if (used < D[i]) { used++; total += P[i]; } return total; }, hint: "You schedule jobs in order of deadline and ignore profit. The greedy choice must be about money: consider the most profitable jobs first." },
      { fn: (D, P) => { const k = Math.max(0, ...D); return P.slice().sort((a, b) => b - a).slice(0, k).reduce((s, x) => s + x, 0); }, hint: "You take the k most profitable jobs, where k is the largest deadline — but several jobs may all be due at time 1. Each job needs its own slot no later than ITS deadline." },
    ],
    hints: [
      "Which job would you never want to lose? Now, where should that job go so it gets in the way of other jobs as little as possible?",
      "Consider jobs from most to least profitable. Keep a boolean array slot[1..maxDeadline] of used time slots.",
      "For each job, start at t ← D[i] and move left while slot[t] is taken. If you find a free t ≥ 1, book it and add P[i]; otherwise skip the job.",
    ],
    starter: {
      pseudo: `ALGORITHM JobSequencing(D[0..n-1], P[0..n-1])
    // Output: maximum total profit of jobs finished by their deadlines
    jobs ← []
    maxD ← 0
    for i ← 0 to n - 1 do
        append(jobs, [P[i], D[i]])
        maxD ← max(maxD, D[i])
    ...
    return total`,
      js: `function JobSequencing(D, P) {
  // most profitable first, each into the latest free slot before its deadline
}`,
    },
    solution: {
      pseudo: `ALGORITHM JobSequencing(D[0..n-1], P[0..n-1])
    jobs ← []
    maxD ← 0
    for i ← 0 to n - 1 do
        append(jobs, [P[i], D[i]])
        maxD ← max(maxD, D[i])
    jobs ← sorted(jobs)
    slot ← array(maxD + 1, false)
    total ← 0
    for k ← n - 1 downto 0 do
        (p, d) ← jobs[k]
        t ← d
        while t ≥ 1 and slot[t] do
            t ← t - 1
        if t ≥ 1 then
            slot[t] ← true
            total ← total + p
    return total`,
      js: `function JobSequencing(D, P) {
  const idx = D.map((_, i) => i).sort((a, b) => P[b] - P[a]);
  const slot = [];
  let total = 0;
  for (const i of idx) {
    let t = D[i];
    while (t >= 1 && slot[t]) t--;
    if (t >= 1) { slot[t] = true; total += P[i]; }
  }
  return total;
}`,
      python: `def job_sequencing(D, P):
    slot, total = set(), 0
    for p, d in sorted(zip(P, D), reverse=True):
        t = d
        while t >= 1 and t in slot:
            t -= 1
        if t >= 1:
            slot.add(t); total += p
    return total`,
      explain: "The feasible job sets form a matroid, so 'most profitable first, if it still fits' is optimal; booking the latest free slot keeps every earlier slot available. Sorting is Θ(n log n); the slot search can cost Θ(n) per job, so Θ(n²) worst case.",
    },
    complexity: "Θ(n²) worst case (Θ(n log n) with union-find on slots)",
    followUp: "Make the slot search nearly O(1): keep a union-find where find(t) returns the latest free slot ≤ t, and after booking t union it with t − 1. Batch schedulers and ad-slot auctions use exactly this trick.",
    distractors: ["for t ← 1 to d do", "jobs ← sorted(D)", "while t ≥ 1 and not slot[t] do"],
    visual: "sims/greedy-choices.html",
    lesson: "lessons/09-greedy/README.md",
  });
  /* =====================================================================
     6. Prim's algorithm — MST weight
     ===================================================================== */
  const weightMatrix = (n, E) => {
    const W = Array.from({ length: n }, () => Array(n).fill(INF));
    for (const [u, v, w] of E) if (w < W[u][v]) { W[u][v] = w; W[v][u] = w; }
    return W;
  };
  ForgeProblems.add({
    id: "prim-mst-weight",
    title: "Prim's Algorithm (Minimum Spanning Tree Weight)",
    level: 4, chapter: 9, difficulty: 2,
    topics: ["greedy", "graphs", "minimum spanning tree", "Prim"],
    strategy: "Greedy (grow one tree by the nearest fringe vertex)",
    source: "Levitin §9.1",
    summary: "Return the total weight of a minimum spanning tree using Prim's algorithm.",
    statement: `
<p>A <b>Minimum Spanning Tree (MST)</b> connects all vertices of a weighted graph with the least total edge weight — the
cheapest way to wire up houses, servers or circuit pins. Prim's algorithm grows a single tree from one vertex, each time adding
the fringe vertex that is <b>closest to the tree</b> (Levitin §9.1).</p>
<p><b>Input:</b> <code>n ≥ 1</code> vertices numbered <code>0..n-1</code> and an edge list <code>E</code> of an
<b>undirected, connected</b> graph; each edge is a triple <code>[u, v, w]</code> with positive weight <code>w</code>.</p>
<p><b>Output:</b> the total weight of a minimum spanning tree (a number).</p>
<p>Example: <code>n = 3</code>, <code>E = [[0,1,3], [0,2,3], [1,2,1]]</code> → the MST uses 1–2 (1) and one of the 3s → <code>4</code>.</p>`,
    entry: "PrimMST",
    params: ["n", "E"],
    tests: [
      { args: [3, [[0, 1, 3], [0, 2, 3], [1, 2, 1]]], expect: 4, explain: "Tree edges 1–2 (1) and 0–1 or 0–2 (3)." },
      { args: [5, [[0, 1, 4], [0, 2, 1], [1, 2, 2], [1, 3, 5], [2, 3, 8], [3, 4, 3], [2, 4, 9]]], expect: 11, explain: "0–2 (1), 2–1 (2), 1–3 (5), 3–4 (3)." },
      { args: [1, []], expect: 0, explain: "A single vertex is already spanned: weight 0." },
      { args: [4, [[0, 1, 1], [0, 2, 1], [0, 3, 1], [1, 2, 5], [2, 3, 5]]], expect: 3, explain: "A star: every cheap edge touches vertex 0." },
      { args: [4, [[0, 1, 1], [1, 2, 1], [0, 2, 1], [2, 3, 10]]], expect: 12, explain: "The three 1-edges form a cycle — only two of them can be used." },
      { args: [2, [[0, 1, 7]]], expect: 7 },
      { args: [6, [[0, 1, 6], [1, 2, 6], [2, 3, 6], [3, 4, 6], [4, 5, 6], [5, 0, 1], [1, 4, 2]]], expect: 21 },
    ],
    random: {
      count: 25,
      gen: (r, i) => { const n = 1 + (i % 9); return [n, randConnected(r, n, n, 1, 20)]; },
    },
    reference: (n, E) => mstWeight(n, E),
    mutants: [
      { fn: (n, E) => { const W = weightMatrix(n, E), inT = Array(n).fill(false); let cur = 0, total = 0; inT[0] = true; for (let k = 1; k < n; k++) { let best = -1; for (let v = 0; v < n; v++) if (!inT[v] && W[cur][v] < INF && (best < 0 || W[cur][v] < W[cur][best])) best = v; let add; if (best >= 0) add = W[cur][best]; else { let bu = -1; for (let u = 0; u < n; u++) if (inT[u]) for (let v = 0; v < n; v++) if (!inT[v] && W[u][v] < INF && (bu < 0 || W[u][v] < W[bu[0]][bu[1]])) bu = [u, v]; best = bu[1]; add = W[bu[0]][bu[1]]; } inT[best] = true; total += add; cur = best; } return total; }, hint: "You only look at edges leaving the vertex you added LAST, so you trace a path. Prim considers every edge from ANY tree vertex to a non-tree vertex (see the star in example 4)." },
      { fn: (n, E) => { const both = E.concat(E.map(([u, v, w]) => [v, u, w])); const [, par] = dijkstra(n, both, 0); let t = 0; for (let v = 1; v < n; v++) { let best = INF; for (const [a, b, w] of both) if (a === par[v] && b === v) best = Math.min(best, w); t += best; } return t; }, hint: "You built a shortest-path tree (Dijkstra's key d[u] + w). Prim's key for a fringe vertex is just the weight of the single cheapest edge connecting it to the tree — no path sums." },
      { fn: (n, E) => E.map((e) => e[2]).sort((a, b) => a - b).slice(0, n - 1).reduce((s, x) => s + x, 0), hint: "You add up the n − 1 cheapest edges, but some of them may form a cycle (example 5). Every added edge must connect a NEW vertex to the tree." },
    ],
    hints: [
      "Start the tree at vertex 0. Among all edges with one end in the tree and one end outside, which one is safe to add?",
      "Keep d[v] = weight of the cheapest edge from v to the current tree (∞ if none) and inTree[v]. Repeat n times: pick the non-tree vertex with the smallest d, add it, and update its neighbors.",
      "After adding u, for every non-tree v: if W[u][v] < d[v] then d[v] ← W[u][v]. The answer is the sum of d[u] at the moment each u joins the tree.",
    ],
    starter: {
      pseudo: `ALGORITHM PrimMST(n, E)
    // E: list of undirected edges [u, v, w]; graph is connected
    W ← matrix(n, n, ∞)
    for each (u, v, w) in E do
        W[u][v] ← w
        W[v][u] ← w
    inTree ← array(n, false)
    d ← array(n, ∞)
    d[0] ← 0
    ...
    return total`,
      js: `function PrimMST(n, E) {
  // return the total weight of a minimum spanning tree
}`,
    },
    solution: {
      pseudo: `ALGORITHM PrimMST(n, E)
    W ← matrix(n, n, ∞)
    for each (u, v, w) in E do
        W[u][v] ← w
        W[v][u] ← w
    inTree ← array(n, false)
    d ← array(n, ∞)
    d[0] ← 0
    total ← 0
    for k ← 1 to n do
        u ← -1
        for v ← 0 to n - 1 do
            if not inTree[v] and (u = -1 or d[v] < d[u]) then
                u ← v
        inTree[u] ← true
        total ← total + d[u]
        for v ← 0 to n - 1 do
            if not inTree[v] and W[u][v] < d[v] then
                d[v] ← W[u][v]
    return total`,
      js: `function PrimMST(n, E) {
  const W = Array.from({ length: n }, () => Array(n).fill(Infinity));
  for (const [u, v, w] of E) { W[u][v] = Math.min(W[u][v], w); W[v][u] = W[u][v]; }
  const inTree = Array(n).fill(false), d = Array(n).fill(Infinity);
  d[0] = 0;
  let total = 0;
  for (let k = 0; k < n; k++) {
    let u = -1;
    for (let v = 0; v < n; v++) if (!inTree[v] && (u === -1 || d[v] < d[u])) u = v;
    inTree[u] = true; total += d[u];
    for (let v = 0; v < n; v++) if (!inTree[v] && W[u][v] < d[v]) d[v] = W[u][v];
  }
  return total;
}`,
      python: `def prim_mst(n, E):
    INF = float("inf")
    W = [[INF] * n for _ in range(n)]
    for u, v, w in E:
        W[u][v] = W[v][u] = min(W[u][v], w)
    in_tree, d, total = [False] * n, [INF] * n, 0
    d[0] = 0
    for _ in range(n):
        u = min((v for v in range(n) if not in_tree[v]), key=lambda v: d[v])
        in_tree[u] = True; total += d[u]
        for v in range(n):
            if not in_tree[v] and W[u][v] < d[v]:
                d[v] = W[u][v]
    return total`,
      explain: "The cut property: the lightest edge crossing from the tree to the rest belongs to some MST, so each greedy step is safe (Levitin's induction proof). With a weight matrix and an unordered array as the priority queue, each of the n rounds scans n vertices: Θ(n²).",
    },
    complexity: "Θ(n²) with a weight matrix; O(m log n) with adjacency lists + a min-heap",
    followUp: "Switch to adjacency lists and a min-heap (priorityQueue with insert/deleteMin) to get O(m log n) — the right choice for sparse graphs. Network designers and clustering algorithms (single-linkage) use MSTs daily.",
    distractors: ["if not inTree[v] and d[u] + W[u][v] < d[v] then", "total ← total + W[0][u]", "for k ← 1 to n - 2 do"],
    visual: "sims/greedy-graphs.html",
    lesson: "lessons/09-greedy/README.md",
  });

  /* =====================================================================
     7. Kruskal's algorithm — MST edges (any MST accepted)
     ===================================================================== */
  const kruskalVerify = (got, [n, E]) => {
    if (!Array.isArray(got)) return "Return a list of edges [u, v, w].";
    if (got.length !== n - 1) return `A spanning tree on ${n} vertices has exactly ${n - 1} edge(s); you returned ${got.length}.`;
    const used = E.map(() => false), p = [...Array(n).keys()];
    const find = (x) => { while (p[x] !== x) x = p[x]; return x; };
    let total = 0;
    for (const e of got) {
      if (!Array.isArray(e) || e.length !== 3) return "Each edge must be a triple [u, v, w].";
      const [u, v, w] = e;
      const k = E.findIndex((f, i) => !used[i] && f[2] === w && ((f[0] === u && f[1] === v) || (f[0] === v && f[1] === u)));
      if (k < 0) return `[${u}, ${v}, ${w}] is not an edge of the graph (or you used it twice).`;
      used[k] = true;
      const a = find(u), b = find(v);
      if (a === b) return `Edge [${u}, ${v}, ${w}] closes a cycle with edges you already chose.`;
      p[a] = b; total += w;
    }
    const best = mstWeight(n, E);
    return total === best ? true : `Your spanning tree weighs ${total}, but a minimum spanning tree weighs ${best}.`;
  };
  const byWUV = (a, b) => a[2] - b[2] || a[0] - b[0] || a[1] - b[1];
  const kruskalBy = (desc) => (n, E) => {
    const p = [...Array(n).keys()];
    const find = (x) => { while (p[x] !== x) x = p[x]; return x; };
    const T = [];
    E.map((e, i) => [e, i]).sort((a, b) => (desc ? b[0][2] - a[0][2] : 0) || byWUV(a[0], b[0])).forEach(([[u, v, w]]) => {
      const a = find(u), b = find(v);
      if (a !== b && T.length < n - 1) { p[a] = b; T.push([u, v, w]); }
    });
    return T;
  };
  ForgeProblems.add({
    id: "kruskal-mst-edges",
    title: "Kruskal's Algorithm (Minimum Spanning Tree Edges)",
    level: 4, chapter: 9, difficulty: 2,
    topics: ["greedy", "graphs", "minimum spanning tree", "Kruskal", "union-find"],
    strategy: "Greedy (cheapest edge that creates no cycle)",
    source: "Levitin §9.2",
    summary: "Return the edges of a minimum spanning tree using Kruskal's algorithm.",
    statement: `
<p>Kruskal's algorithm builds a <b>Minimum Spanning Tree (MST)</b> by scanning edges from lightest to heaviest and keeping
each edge <b>unless it would close a cycle</b>. Unlike Prim's tree, the chosen edges form a forest that only becomes one tree
at the end (Levitin §9.2). The hard part is the cycle test — that's what union-find is for.</p>
<p><b>Input:</b> <code>n ≥ 1</code> vertices <code>0..n-1</code> and the edge list <code>E</code> of an undirected,
connected graph; each edge is <code>[u, v, w]</code>.</p>
<p><b>Output:</b> a list of the <code>n − 1</code> MST edges, each as <code>[u, v, w]</code> exactly as in <code>E</code>
(either endpoint order is fine). When several MSTs exist, <b>any</b> one is accepted, in any order.</p>`,
    entry: "KruskalMST",
    params: ["n", "E"],
    tests: [
      { args: [5, [[0, 1, 4], [0, 2, 1], [1, 2, 2], [1, 3, 5], [2, 3, 8], [3, 4, 3], [2, 4, 9]]], expect: [[0, 2, 1], [1, 2, 2], [3, 4, 3], [1, 3, 5]], explain: "Edges 1, 2, 3 are taken; 4 (0–1) would close the cycle 0–1–2; 5 connects the two pieces." },
      { args: [4, [[0, 1, 1], [2, 3, 2], [1, 2, 5], [0, 3, 6]]], expect: [[0, 1, 1], [2, 3, 2], [1, 2, 5]], explain: "Edge 1–2 joins two DIFFERENT pieces, even though both endpoints were already touched." },
      { args: [1, []], expect: [], explain: "One vertex: the MST has no edges." },
      { args: [4, [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 0, 1], [0, 2, 1]]], expect: [[0, 1, 1], [1, 2, 1], [2, 3, 1]], explain: "All weights tie: any spanning tree is minimum." },
      { args: [4, [[0, 1, 1], [1, 2, 1], [0, 2, 1], [2, 3, 10]]], expect: [[0, 1, 1], [1, 2, 1], [2, 3, 10]] },
      { args: [3, [[0, 1, 9], [1, 2, 8], [0, 2, 1]]], expect: [[0, 2, 1], [1, 2, 8]] },
    ],
    random: {
      count: 25,
      gen: (r, i) => { const n = 1 + (i % 10); return [n, randConnected(r, n, n + 2, 1, 15)]; },
    },
    verify: kruskalVerify,
    compare: "unordered",
    mutants: [
      { fn: (n, E) => E.slice().sort(byWUV).slice(0, n - 1), hint: "You keep the n − 1 lightest edges without checking for cycles. Before adding an edge, ask: are its endpoints already connected by edges I chose?" },
      { fn: (n, E) => { const seen = Array(n).fill(false), T = []; E.slice().sort(byWUV).forEach(([u, v, w]) => { if (T.length < n - 1 && !(seen[u] && seen[v])) { seen[u] = seen[v] = true; T.push([u, v, w]); } }); return T; }, hint: "You skip an edge when both endpoints were already 'visited'. But they may sit in two DIFFERENT pieces of the forest (example 2) — then the edge must be taken. Track which component each vertex is in (union-find)." },
      { fn: kruskalBy(true), hint: "Your tree is a MAXIMUM spanning tree — the edges are scanned heaviest first. Sort in nondecreasing order of weight." },
    ],
    hints: [
      "Scan edges from lightest to heaviest. When is it safe to add the next one, and when would it be a mistake?",
      "An edge (u, v) creates a cycle exactly when u and v are already in the same connected piece. Keep parent[] so that Find(x) returns the representative of x's piece.",
      "Sort the triples [w, u, v]; for each, if Find(u) ≠ Find(v) then append [u, v, w] and union the two pieces (parent[Find(u)] ← Find(v)). Stop after n − 1 edges.",
    ],
    starter: {
      pseudo: `ALGORITHM KruskalMST(n, E)
    // Output: list of the n - 1 edges [u, v, w] of a minimum spanning tree
    L ← []
    for each (u, v, w) in E do
        append(L, [w, u, v])
    L ← sorted(L)
    parent ← range(0, n - 1)
    T ← []
    ...
    return T

ALGORITHM Find(parent, x)
    ...`,
      js: `function KruskalMST(n, E) {
  // sort edges, add each one that joins two different components
}`,
    },
    solution: {
      pseudo: `ALGORITHM KruskalMST(n, E)
    L ← []
    for each (u, v, w) in E do
        append(L, [w, u, v])
    L ← sorted(L)
    parent ← range(0, n - 1)
    T ← []
    for each (w, u, v) in L do
        ru ← Find(parent, u)
        rv ← Find(parent, v)
        if ru ≠ rv then
            parent[ru] ← rv
            append(T, [u, v, w])
    return T

ALGORITHM Find(parent, x)
    while parent[x] ≠ x do
        x ← parent[x]
    return x`,
      js: `function KruskalMST(n, E) {
  const parent = [...Array(n).keys()];
  const find = (x) => { while (parent[x] !== x) x = parent[x] = parent[parent[x]]; return x; };
  const T = [];
  for (const [u, v, w] of E.slice().sort((a, b) => a[2] - b[2])) {
    const ru = find(u), rv = find(v);
    if (ru !== rv) { parent[ru] = rv; T.push([u, v, w]); }
  }
  return T;
}`,
      python: `def kruskal_mst(n, E):
    parent = list(range(n))
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    T = []
    for u, v, w in sorted(E, key=lambda e: e[2]):
        ru, rv = find(u), find(v)
        if ru != rv:
            parent[ru] = rv
            T.append([u, v, w])
    return T`,
      explain: "By the cut property, the lightest edge joining two different components is always safe. Sorting costs Θ(m log m); with union by size or path compression the m finds and n − 1 unions are nearly linear, so Kruskal runs in O(m log m).",
    },
    complexity: "O(m log m)",
    followUp: "Add union by size and path compression to Find (next problem) and stop as soon as you have n − 1 edges. Kruskal is the go-to MST for sparse, edge-list data — and stopping it early at k components gives single-linkage clustering.",
    distractors: ["if ru = rv then", "L ← sorted(E)", "parent[u] ← v"],
    visual: "sims/greedy-graphs.html",
    lesson: "lessons/09-greedy/README.md",
  });

  /* =====================================================================
     8. Quick union with union by size
     ===================================================================== */
  const ufRef = (n, ops) => {
    const p = [...Array(n).keys()];
    const f = (x) => { while (p[x] !== x) x = p[x]; return x; };
    const out = [];
    for (const [t, x, y] of ops) { const a = f(x), b = f(y); if (t === 1) out.push(a === b); else if (a !== b) p[a] = b; }
    return out;
  };
  ForgeProblems.add({
    id: "quick-union-find",
    title: "Union-Find (Quick Union by Size)",
    level: 4, chapter: 9, difficulty: 2,
    topics: ["union-find", "disjoint sets", "data structures", "Kruskal"],
    strategy: "Trees of representatives + union by size",
    source: "Levitin §9.2 (disjoint subsets and union-find algorithms)",
    summary: "Process union and 'same set?' operations fast, using quick union with union by size.",
    statement: `
<p>Kruskal's cycle test, network connectivity, image segmentation and "are these two accounts the same person?" all need the
same data structure: <b>disjoint sets</b> with two operations, <code>union(x, y)</code> and <code>find(x)</code>
(Levitin §9.2).</p>
<p>Elements are <code>0..n-1</code>, each starting in its own set. <code>ops</code> is a list of triples:</p>
<ul>
<li><code>[0, x, y]</code> — union: merge the sets containing <code>x</code> and <code>y</code> (nothing happens if they're already together);</li>
<li><code>[1, x, y]</code> — query: are <code>x</code> and <code>y</code> in the same set? Append <code>true</code> or <code>false</code> to the answer.</li>
</ul>
<p>Return the list of query answers, in order.</p>
<p><b>Efficiency:</b> the grader runs long chains of unions followed by many queries. Represent each set as a tree
(<code>parent[x]</code>, the root is the representative) and use <b>union by size</b> — hang the smaller tree under the
root of the larger — so every find takes O(log n). Relabeling a whole array on each union (quick find) is Θ(n) per union and will be too slow.</p>`,
    entry: "UnionFind",
    params: ["n", "ops"],
    tests: [
      { args: [5, [[0, 0, 1], [1, 0, 1], [1, 0, 2], [0, 1, 2], [1, 0, 2], [0, 3, 4], [1, 2, 4]]], expect: [true, false, true, false], explain: "{0,1} → {0,1,2}; {3,4} stays separate." },
      { args: [3, [[0, 0, 1], [0, 0, 2], [1, 1, 2]]], expect: [true], explain: "1 and 2 were both joined to 0's set, so they're together." },
      { args: [3, [[0, 0, 1], [0, 1, 2], [1, 0, 2]]], expect: [true], explain: "0 and 2 are connected through 1 — compare ROOTS, not parents." },
      { args: [1, [[1, 0, 0]]], expect: [true], explain: "Every element is in the same set as itself." },
      { args: [4, []], expect: [] },
      { args: [4, [[0, 0, 1], [0, 2, 3], [0, 1, 0], [1, 0, 3], [0, 1, 3], [1, 2, 0]]], expect: [false, true] },
      { args: [6, [[0, 0, 1], [0, 2, 3], [0, 0, 2], [0, 4, 5], [1, 3, 1], [1, 3, 5], [0, 5, 1], [1, 4, 0]]], expect: [true, false, true] },
    ],
    random: {
      count: 30,
      gen: (r, i) => {
        const n = 1 + (i % 12), m = r.int(0, 18), ops = [];
        for (let k = 0; k < m; k++) ops.push([r() < 0.5 ? 0 : 1, r.int(0, n - 1), r.int(0, n - 1)]);
        return [n, ops];
      },
    },
    reference: ufRef,
    growth: {
      metric: "steps", sizes: [32, 64, 128, 256, 512],
      gen: (r, n) => {
        const ops = [];
        for (let i = 0; i + 1 < n / 2; i++) ops.push([0, i, i + 1]);
        for (let q = 0; q < n / 2; q++) ops.push([1, 0, r.int(0, n - 1)]);
        return [n, ops];
      },
      expect: "n log n",
    },
    mutants: [
      { fn: (n, ops) => { const p = [...Array(n).keys()]; const f = (x) => { while (p[x] !== x) x = p[x]; return x; }; const out = []; for (const [t, x, y] of ops) { if (t === 1) out.push(f(x) === f(y)); else if (f(x) !== f(y)) p[x] = y; } return out; }, hint: "Your union sets parent[x] ← y directly. If x already had a parent, that link is lost and part of the set is cut off (example 2). Link the ROOT of x's tree to the root of y's tree." },
      { fn: (n, ops) => { const p = [...Array(n).keys()]; const f = (x) => { while (p[x] !== x) x = p[x]; return x; }; const out = []; for (const [t, x, y] of ops) { if (t === 1) out.push(x === y || p[x] === p[y]); else { const a = f(x), b = f(y); if (a !== b) p[a] = b; } } return out; }, hint: "Your query compares parent[x] with parent[y]. Two elements can be in the same tree at different depths (example 3) — follow parent links all the way up and compare the roots." },
      { fn: (n, ops) => { const id = [...Array(n).keys()]; const out = []; for (const [t, x, y] of ops) { if (t === 1) out.push(id[x] === id[y]); else for (let i = 0; i < n; i++) if (id[i] === id[x]) id[i] = id[y]; } return out; }, hint: "Quick-find bug: while relabeling you compare with id[x], but id[x] itself changes halfway through the loop, so later members of x's set keep the old label. Save the old label in a variable before the loop — then switch to quick union for speed." },
    ],
    hints: [
      "Picture every set as a tree whose root names the set. What single pointer change merges two trees?",
      "Find(x): follow parent[x] until parent[x] = x. Union: find both roots; if different, make one root the parent of the other. Query: compare the two roots.",
      "Union by size: keep size[root]. Hang the root of the SMALLER tree under the larger root and add the sizes — then no tree is taller than log₂ n.",
    ],
    starter: {
      pseudo: `ALGORITHM UnionFind(n, ops)
    parent ← range(0, n - 1)
    size ← array(n, 1)
    answers ← []
    for each (t, x, y) in ops do
        ...
    return answers

ALGORITHM Find(parent, x)
    ...`,
      js: `function UnionFind(n, ops) {
  const parent = [...Array(n).keys()], size = Array(n).fill(1), answers = [];
  // [0, x, y] = union, [1, x, y] = same set?
  return answers;
}`,
    },
    solution: {
      pseudo: `ALGORITHM UnionFind(n, ops)
    parent ← range(0, n - 1)
    size ← array(n, 1)
    answers ← []
    for each (t, x, y) in ops do
        rx ← Find(parent, x)
        ry ← Find(parent, y)
        if t = 1 then
            append(answers, rx = ry)
        else if rx ≠ ry then
            if size[rx] < size[ry] then
                swap rx and ry
            parent[ry] ← rx
            size[rx] ← size[rx] + size[ry]
    return answers

ALGORITHM Find(parent, x)
    while parent[x] ≠ x do
        x ← parent[x]
    return x`,
      js: `function UnionFind(n, ops) {
  const parent = [...Array(n).keys()], size = Array(n).fill(1), answers = [];
  const find = (x) => { while (parent[x] !== x) x = parent[x] = parent[parent[x]]; return x; };
  for (const [t, x, y] of ops) {
    let rx = find(x), ry = find(y);
    if (t === 1) answers.push(rx === ry);
    else if (rx !== ry) {
      if (size[rx] < size[ry]) [rx, ry] = [ry, rx];
      parent[ry] = rx; size[rx] += size[ry];
    }
  }
  return answers;
}`,
      python: `def union_find(n, ops):
    parent, size, answers = list(range(n)), [1] * n, []
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    for t, x, y in ops:
        rx, ry = find(x), find(y)
        if t == 1:
            answers.append(rx == ry)
        elif rx != ry:
            if size[rx] < size[ry]:
                rx, ry = ry, rx
            parent[ry] = rx
            size[rx] += size[ry]
    return answers`,
      explain: "With union by size, an element's depth grows only when its tree is merged into one at least as big, which doubles its set size — so depth ≤ log₂ n and each find is O(log n). m operations cost O(m log n); adding path compression makes it O(m α(n)), practically linear.",
    },
    complexity: "O(log n) per operation (union by size); ≈ O(α(n)) with path compression",
    followUp: "Add path compression (point every node on the find path straight at the root) and measure the difference. With both tricks the amortized cost is α(n) ≤ 4 for any realistic n — Tarjan's famous inverse-Ackermann bound.",
    distractors: ["parent[x] ← y", "append(answers, parent[x] = parent[y])", "if size[rx] > size[ry] then"],
    visual: "sims/greedy-graphs.html",
    lesson: "lessons/09-greedy/README.md",
  });

  /* =====================================================================
     9. Dijkstra — all distances from a source
     ===================================================================== */
  ForgeProblems.add({
    id: "dijkstra-distances",
    title: "Dijkstra's Algorithm (Distances)",
    level: 4, chapter: 9, difficulty: 2,
    topics: ["greedy", "graphs", "shortest paths", "Dijkstra", "priority queue"],
    strategy: "Greedy (finalize the closest unfinished vertex)",
    source: "Levitin §9.3",
    summary: "Single-source shortest-path distances in a graph with non-negative weights.",
    statement: `
<p>Route planners, network routers running Open Shortest Path First (OSPF) and artificial intelligence (AI) opponents in games all ask the same question: how far is every place from here?
Dijkstra's algorithm answers it for non-negative edge weights by repeatedly <b>finalizing the unfinished vertex with the
smallest tentative distance</b> and relaxing its outgoing edges (Levitin §9.3).</p>
<p><b>Input:</b> <code>n</code> vertices <code>0..n-1</code>, a list <code>E</code> of <b>directed</b> edges
<code>[u, v, w]</code> meaning u → v with weight <code>w ≥ 0</code>, and a source <code>s</code>.
(An undirected road is simply listed in both directions.)</p>
<p><b>Output:</b> an array <code>d[0..n-1]</code> with the length of a shortest path from <code>s</code> to each vertex;
use <code>∞</code> for vertices that cannot be reached.</p>
<p>You may use the priority queue built-ins: <code>Q ← priorityQueue()</code>, <code>insert(Q, item, priority)</code>,
<code>deleteMin(Q)</code>, <code>isEmpty(Q)</code> — or the simple Θ(n²) array version.</p>`,
    entry: "Dijkstra",
    params: ["n", "E", "s"],
    tests: [
      { args: [5, [[0, 1, 4], [0, 2, 1], [2, 1, 2], [1, 3, 1], [2, 3, 5], [3, 4, 3]], 0], expect: [0, 3, 1, 4, 7], explain: "0 → 2 → 1 (1 + 2 = 3) beats the direct edge 0 → 1 (4)." },
      { args: [3, [[0, 1, 5]], 0], expect: [0, 5, INF], explain: "Vertex 2 is unreachable: ∞." },
      { args: [3, [[1, 0, 2], [1, 2, 7], [0, 2, 3]], 1], expect: [2, 0, 5], explain: "The source doesn't have to be 0." },
      { args: [2, [[1, 0, 1]], 0], expect: [0, INF], explain: "Edges are one-way: 1 → 0 doesn't let you go from 0 to 1." },
      { args: [1, [], 0], expect: [0] },
      { args: [4, [[0, 1, 0], [1, 2, 0], [2, 3, 4], [0, 3, 5]], 0], expect: [0, 0, 0, 4], explain: "Zero-weight edges are allowed." },
      { args: [4, [[0, 1, 1], [0, 2, 5], [1, 2, 1], [2, 3, 1], [1, 3, 9]], 0], expect: [0, 1, 2, 3] },
    ],
    random: {
      count: 25,
      gen: (r, i) => { const n = 1 + (i % 9); return [n, randDigraph(r, n, 0.35, 0, 15), r.int(0, n - 1)]; },
    },
    reference: (n, E, s) => dijkstra(n, E, s)[0],
    mutants: [
      { fn: (n, E, s) => dijkstra(n, E.concat(E.map(([u, v, w]) => [v, u, w])), s)[0], hint: "You treat every edge as two-way. The edges are directed: [u, v, w] only lets you travel from u to v (example 4)." },
      { fn: (n, E, s) => { const d = Array(n).fill(INF), done = Array(n).fill(false); d[s] = 0; for (let k = 0; k < n; k++) { let u = -1; for (let v = 0; v < n; v++) if (!done[v] && d[v] < INF && (u < 0 || d[v] < d[u])) u = v; if (u < 0) break; done[u] = true; for (const [a, b, w] of E) if (a === u && d[b] === INF) d[b] = d[u] + w; } return d; }, hint: "A vertex's distance is fixed the first time you reach it. Later you may find a SHORTER way (0 → 2 → 1 in example 1). Relax: if d[u] + w < d[v] then update d[v]." },
      { fn: (n, E, s) => { const d = Array(n).fill(INF), done = Array(n).fill(false); d[s] = 0; for (let k = 0; k < n; k++) { let u = -1; for (let v = 0; v < n; v++) if (!done[v] && d[v] < INF && (u < 0 || d[v] < d[u])) u = v; if (u < 0) break; done[u] = true; for (const [a, b, w] of E) if (a === u && !done[b] && w < d[b]) d[b] = w; } return d; }, hint: "You label a vertex with just the weight of the last edge — that's Prim's key. Dijkstra's label is the whole path length: d[u] + w(u, v)." },
    ],
    hints: [
      "Of all vertices you haven't finished, which one's tentative distance can no longer improve? Why do non-negative weights matter here?",
      "d[s] ← 0, all others ∞. Repeat: take the unfinished vertex u with the smallest d[u], mark it finished, and relax every edge u → v.",
      "Relaxing edge (u, v, w): if d[u] + w < d[v] then d[v] ← d[u] + w (and, with a priority queue, insert(Q, v, d[v])). Skip vertices popped a second time.",
    ],
    starter: {
      pseudo: `ALGORITHM Dijkstra(n, E, s)
    adj ← array(n, [])
    for each (u, v, w) in E do
        append(adj[u], [v, w])
    d ← array(n, ∞)
    d[s] ← 0
    ...
    return d`,
      js: `function Dijkstra(n, E, s) {
  // return shortest distances from s (Infinity if unreachable)
}`,
    },
    solution: {
      pseudo: `ALGORITHM Dijkstra(n, E, s)
    adj ← array(n, [])
    for each (u, v, w) in E do
        append(adj[u], [v, w])
    d ← array(n, ∞)
    done ← array(n, false)
    d[s] ← 0
    Q ← priorityQueue()
    insert(Q, s, 0)
    while not isEmpty(Q) do
        u ← deleteMin(Q)
        if done[u] then continue
        done[u] ← true
        for each (v, w) in adj[u] do
            if d[u] + w < d[v] then
                d[v] ← d[u] + w
                insert(Q, v, d[v])
    return d`,
      js: `function Dijkstra(n, E, s) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v, w] of E) adj[u].push([v, w]);
  const d = Array(n).fill(Infinity), done = Array(n).fill(false);
  d[s] = 0;
  for (let k = 0; k < n; k++) {
    let u = -1;
    for (let v = 0; v < n; v++) if (!done[v] && d[v] < Infinity && (u < 0 || d[v] < d[u])) u = v;
    if (u < 0) break;
    done[u] = true;
    for (const [v, w] of adj[u]) if (d[u] + w < d[v]) d[v] = d[u] + w;
  }
  return d;
}`,
      python: `import heapq
def dijkstra(n, E, s):
    adj = [[] for _ in range(n)]
    for u, v, w in E:
        adj[u].append((v, w))
    d = [float("inf")] * n
    d[s] = 0
    pq = [(0, s)]
    while pq:
        du, u = heapq.heappop(pq)
        if du > d[u]:
            continue
        for v, w in adj[u]:
            if du + w < d[v]:
                d[v] = du + w
                heapq.heappush(pq, (d[v], v))
    return d`,
      explain: "Invariant: when u is finalized, d[u] is exact — any other path to u would leave the finished set through a vertex whose label is already ≥ d[u], and non-negative weights can't make it shorter. With a binary heap: O((n + m) log n); with the array scan: Θ(n²).",
    },
    complexity: "O((n + m) log n) with a min-heap; Θ(n²) with an array",
    followUp: "Why does it break with a negative edge? Build a 3-vertex counterexample (Levitin Exercise 9.3.3), then compare with Bellman–Ford. Production routers add early exit at the target and A* heuristics on top of exactly this loop.",
    distractors: ["if w < d[v] then", "d[v] ← w", "if d[v] = ∞ then"],
    visual: "sims/greedy-graphs.html",
    lesson: "lessons/09-greedy/README.md",
  });

  /* =====================================================================
     10. Dijkstra — recover the actual path
     ===================================================================== */
  const pathOf = (n, E, s, t) => {
    const [d, par] = dijkstra(n, E, s);
    if (d[t] === INF) return [];
    const P = [];
    for (let v = t; v !== -1; v = v === s ? -1 : par[v]) P.push(v);
    return P.reverse();
  };
  ForgeProblems.add({
    id: "dijkstra-path",
    title: "Shortest Path (Recover the Route)",
    level: 4, chapter: 9, difficulty: 3,
    topics: ["greedy", "graphs", "shortest paths", "Dijkstra", "path reconstruction"],
    strategy: "Greedy + parent pointers",
    source: "Levitin §9.3 (second vertex label = parent)",
    summary: "Return the vertices of a shortest path from s to t, not just its length.",
    statement: `
<p>A navigation app must show the <i>route</i>, not just the distance. Levitin's version of Dijkstra's algorithm labels each
vertex with two things: its distance and its <b>parent</b> — the vertex it was last reached from (Levitin §9.3). Following
parents back from the target spells out the path.</p>
<p><b>Input:</b> <code>n</code> vertices, directed edges <code>E</code> as <code>[u, v, w]</code> with <code>w ≥ 0</code>,
a source <code>s</code> and a target <code>t</code>.</p>
<p><b>Output:</b> the list of vertices of a shortest path, starting with <code>s</code> and ending with <code>t</code>
(just <code>[s]</code> if <code>s = t</code>). If <code>t</code> is unreachable, return <code>[]</code>.
When several shortest paths exist, any one is accepted.</p>`,
    entry: "ShortestPath",
    params: ["n", "E", "s", "t"],
    tests: [
      { args: [5, [[0, 1, 4], [0, 2, 1], [2, 1, 2], [1, 3, 1], [2, 3, 5], [3, 4, 3]], 0, 4], expect: [0, 2, 1, 3, 4], explain: "Length 1 + 2 + 1 + 3 = 7." },
      { args: [4, [[0, 3, 10], [0, 1, 1], [1, 2, 1], [2, 3, 1]], 0, 3], expect: [0, 1, 2, 3], explain: "Fewer edges isn't better: the direct edge costs 10, the 3-edge route costs 3." },
      { args: [3, [[0, 1, 5]], 0, 2], expect: [], explain: "Unreachable target → []." },
      { args: [3, [[0, 1, 5], [1, 2, 5]], 1, 1], expect: [1], explain: "Source equals target: the path is just [s]." },
      { args: [2, [[1, 0, 3]], 1, 0], expect: [1, 0] },
      { args: [4, [[0, 1, 2], [0, 2, 2], [1, 3, 2], [2, 3, 2]], 0, 3], expect: [0, 1, 3], explain: "Two shortest paths; either is accepted." },
    ],
    random: {
      count: 25,
      gen: (r, i) => { const n = 2 + (i % 8); return [n, randDigraph(r, n, 0.4, 1, 12), r.int(0, n - 1), r.int(0, n - 1)]; },
    },
    verify: (got, [n, E, s, t]) => {
      const [d] = dijkstra(n, E, s);
      if (!Array.isArray(got)) return "Return a list of vertices.";
      if (d[t] === INF) return got.length === 0 ? true : `Vertex ${t} can't be reached from ${s}, so the answer is [].`;
      if (!got.length) return `There IS a path from ${s} to ${t} — return it.`;
      if (got[0] !== s) return `The path must start at the source ${s} (yours starts at ${got[0]}).`;
      if (got[got.length - 1] !== t) return `The path must end at the target ${t} (yours ends at ${got[got.length - 1]}).`;
      let len = 0;
      for (let k = 0; k + 1 < got.length; k++) {
        let best = INF;
        for (const [a, b, w] of E) if (a === got[k] && b === got[k + 1]) best = Math.min(best, w);
        if (best === INF) return `There is no edge ${got[k]} → ${got[k + 1]}.`;
        len += best;
      }
      return len === d[t] ? true : `Your path has length ${len}, but the shortest path from ${s} to ${t} has length ${d[t]}.`;
    },
    mutants: [
      { fn: (n, E, s, t) => pathOf(n, E, s, t).reverse(), hint: "Your path runs backwards, from t to s. Walking the parent pointers visits vertices in reverse order — reverse the list (or build it by inserting at the front) before returning." },
      { fn: (n, E, s, t) => pathOf(n, E, s, t).slice(1), hint: "The source is missing from your path. The walk back from t stops when it reaches s — make sure s itself is added too." },
      { fn: (n, E, s, t) => { const par = Array(n).fill(-2); par[s] = -1; const q = [s]; while (q.length) { const u = q.shift(); for (const [a, b] of E) if (a === u && par[b] === -2) { par[b] = u; q.push(b); } } if (par[t] === -2) return []; const P = []; for (let v = t; v !== -1; v = par[v]) P.push(v); return P.reverse(); }, hint: "You found the path with the fewest EDGES (breadth-first search), ignoring the weights. Use Dijkstra's distances d[u] + w and record the parent whenever a relaxation improves d[v]." },
    ],
    hints: [
      "When Dijkstra improves d[v] using the edge u → v, what extra piece of information would let you retrace that step later?",
      "Keep parent[v]: set parent[v] ← u every time d[v] improves through u. After the main loop, d[t] = ∞ means 'no path'.",
      "Start at v ← t and repeatedly append v and move to parent[v] until you have appended s; then reverse the list.",
    ],
    starter: {
      pseudo: `ALGORITHM ShortestPath(n, E, s, t)
    adj ← array(n, [])
    for each (u, v, w) in E do
        append(adj[u], [v, w])
    d ← array(n, ∞)
    parent ← array(n, -1)
    d[s] ← 0
    ...
    return path`,
      js: `function ShortestPath(n, E, s, t) {
  // Dijkstra with parent pointers, then walk back from t
}`,
    },
    solution: {
      pseudo: `ALGORITHM ShortestPath(n, E, s, t)
    adj ← array(n, [])
    for each (u, v, w) in E do
        append(adj[u], [v, w])
    d ← array(n, ∞)
    parent ← array(n, -1)
    d[s] ← 0
    Q ← priorityQueue()
    insert(Q, s, 0)
    while not isEmpty(Q) do
        u ← deleteMin(Q)
        for each (v, w) in adj[u] do
            if d[u] + w < d[v] then
                d[v] ← d[u] + w
                parent[v] ← u
                insert(Q, v, d[v])
    if d[t] = ∞ then return []
    path ← [t]
    while t ≠ s do
        t ← parent[t]
        append(path, t)
    return reverse(path)`,
      js: `function ShortestPath(n, E, s, t) {
  const d = Array(n).fill(Infinity), parent = Array(n).fill(-1), done = Array(n).fill(false);
  d[s] = 0;
  for (let k = 0; k < n; k++) {
    let u = -1;
    for (let v = 0; v < n; v++) if (!done[v] && d[v] < Infinity && (u < 0 || d[v] < d[u])) u = v;
    if (u < 0) break;
    done[u] = true;
    for (const [a, v, w] of E) if (a === u && d[u] + w < d[v]) { d[v] = d[u] + w; parent[v] = u; }
  }
  if (d[t] === Infinity) return [];
  const path = [t];
  while (t !== s) { t = parent[t]; path.push(t); }
  return path.reverse();
}`,
      python: `import heapq
def shortest_path(n, E, s, t):
    adj = [[] for _ in range(n)]
    for u, v, w in E:
        adj[u].append((v, w))
    d, parent = [float("inf")] * n, [-1] * n
    d[s] = 0
    pq = [(0, s)]
    while pq:
        du, u = heapq.heappop(pq)
        if du > d[u]:
            continue
        for v, w in adj[u]:
            if du + w < d[v]:
                d[v], parent[v] = du + w, u
                heapq.heappush(pq, (d[v], v))
    if d[t] == float("inf"):
        return []
    path = [t]
    while t != s:
        t = parent[t]
        path.append(t)
    return path[::-1]`,
      explain: "The parent pointers form a shortest-path tree rooted at s: each parent[v] was set by the relaxation that produced the final d[v]. Reconstruction walks at most n − 1 pointers, so the cost is Dijkstra's O((n + m) log n) plus Θ(n).",
    },
    complexity: "O((n + m) log n) + Θ(path length)",
    followUp: "Stop Dijkstra as soon as t is popped from the queue — a big win for point-to-point queries. Real maps go further with bidirectional search and contraction hierarchies.",
    distractors: ["if w < d[v] then", "while t ≠ -1 do", "return path"],
    visual: "sims/greedy-graphs.html",
    lesson: "lessons/09-greedy/README.md",
  });
  /* =====================================================================
     11–12. Huffman codes
     ===================================================================== */
  // Huffman lengths with a simple O(n²) "pick two smallest" loop; useMax picks the two largest instead.
  function huffLengths(F, useMax) {
    const n = F.length;
    if (n === 1) return [1];
    const L = Array(n).fill(0);
    let trees = F.map((w, i) => ({ w, members: [i], seq: i }));
    let seq = n;
    while (trees.length > 1) {
      trees.sort((a, b) => (useMax ? b.w - a.w : a.w - b.w) || a.seq - b.seq);
      const [a, b] = trees.splice(0, 2);
      a.members.concat(b.members).forEach((i) => L[i]++);
      trees.push({ w: a.w + b.w, members: a.members.concat(b.members), seq: seq++ });
    }
    return L;
  }
  const huffCost = (F) => (F.length === 1 ? F[0] : huffLengths(F).reduce((s, l, i) => s + l * F[i], 0));
  const fixedLen = (n) => Math.max(1, Math.ceil(Math.log2(n)));
  const unaryLengths = (F) => { const n = F.length, idx = F.map((_, i) => i).sort((a, b) => F[b] - F[a] || a - b), L = Array(n); idx.forEach((i, k) => { L[i] = n === 1 ? 1 : Math.min(k + 1, n - 1); }); return L; };

  ForgeProblems.add({
    id: "huffman-code-lengths",
    title: "Huffman Codeword Lengths",
    level: 4, chapter: 9, difficulty: 2,
    topics: ["greedy", "Huffman", "compression", "priority queue", "trees"],
    strategy: "Greedy (merge the two lightest trees)",
    source: "Levitin §9.4",
    summary: "Build a Huffman tree and return each symbol's codeword length.",
    statement: `
<p>ZIP files, Portable Network Graphics (PNG) and Joint Photographic Experts Group (JPEG) images, and Moving Picture Experts Group Audio Layer III (MP3) songs all contain a Huffman coder. Huffman's algorithm builds an optimal <b>prefix-free</b> code
(no codeword is a prefix of another) by repeatedly <b>merging the two lightest trees</b> into one whose weight is their sum
(Levitin §9.4). A symbol's codeword length is the depth of its leaf in the final tree.</p>
<p><b>Input:</b> positive integer frequencies <code>F[0..n-1]</code> (n ≥ 1).</p>
<p><b>Output:</b> <code>L[0..n-1]</code>, where <code>L[i]</code> is the codeword length (number of bits) for symbol <code>i</code>.
If there is only one symbol, give it length 1 (its codeword is <code>0</code>).</p>
<p>Ties can be broken in different ways and produce different — equally optimal — trees, so the grader accepts
<b>any</b> lengths that form a prefix-free code with the minimum total <code>Σ F[i]·L[i]</code>.</p>
<p>Tip: <code>insert(Q, item, priority)</code> can store a list as the item, e.g. <code>[weight, symbolsInThisTree]</code>.</p>`,
    entry: "HuffmanLengths",
    params: ["F"],
    tests: [
      { args: [[35, 10, 20, 20, 15]], expect: [2, 3, 2, 2, 3], explain: "The lecture's A, B, C, D, _ example: codewords 11, 100, 00, 01, 101." },
      { args: [[1, 1, 2, 4, 8]], expect: [4, 4, 3, 2, 1], explain: "Doubling frequencies give a completely lopsided tree." },
      { args: [[5, 5]], expect: [1, 1], explain: "Two symbols: one bit each." },
      { args: [[9]], expect: [1], explain: "Only one symbol: length 1 by convention." },
      { args: [[3, 3, 3, 3]], expect: [2, 2, 2, 2], explain: "Equal frequencies: a perfectly balanced tree." },
      { args: [[10, 10, 20, 20, 40]], expect: [3, 3, 3, 3, 1], explain: "Ties! Other length lists (e.g. 3, 3, 2, 2, 2) are just as good and also accepted." },
      { args: [[1, 2, 3, 4, 5, 6]], expect: [4, 4, 3, 2, 2, 2] },
    ],
    random: {
      count: 25,
      gen: (r, i) => [r.array(1 + (i % 10), 1, 30)],
    },
    verify: (got, [F]) => {
      if (!Array.isArray(got) || got.length !== F.length) return `Return one length per symbol (${F.length} numbers).`;
      if (got.some((l) => !Number.isInteger(l) || l < 1)) return "Every codeword length must be a whole number ≥ 1.";
      const kraft = got.reduce((s, l) => s + Math.pow(2, -l), 0);
      if (kraft > 1 + 1e-12) return "No prefix-free code has these lengths (the Kraft sum Σ 2^(−L[i]) exceeds 1) — some codeword would have to be a prefix of another.";
      const cost = got.reduce((s, l, i) => s + l * F[i], 0), best = huffCost(F);
      return cost === best ? true : `With your lengths the text needs Σ F[i]·L[i] = ${cost} bits; Huffman's optimum is ${best}.`;
    },
    mutants: [
      { fn: (F) => huffLengths(F, true), hint: "Your tree merges the two HEAVIEST trees, which pushes frequent symbols deep. Huffman always merges the two lightest (use a min-priority queue)." },
      { fn: (F) => F.map(() => fixedLen(F.length)), hint: "Every symbol gets the same length ⌈log₂ n⌉ — that's a fixed-length code like ASCII. Frequent symbols should get shorter codewords; build the tree by merging the lightest pair repeatedly." },
      { fn: unaryLengths, hint: "You gave lengths 1, 2, 3, … in order of frequency. That's only optimal for very lopsided frequencies (example 2). Let the merges decide: each time two trees merge, every symbol inside them gets one bit longer." },
    ],
    hints: [
      "Which two symbols should end up deepest in the tree, sharing a parent? What happens to a symbol's codeword length each time its tree is merged?",
      "Put one single-leaf tree per symbol into a min-priority queue keyed by weight. Repeat n − 1 times: remove the two lightest trees, merge them, insert the result.",
      "Store each tree as [weight, list of its symbols]. When you merge trees a and b, add 1 to L[i] for every symbol i in a[1] and in b[1], and insert [a[0] + b[0], a[1] + b[1]].",
    ],
    starter: {
      pseudo: `ALGORITHM HuffmanLengths(F[0..n-1])
    if n = 1 then return [1]
    L ← array(n, 0)
    Q ← priorityQueue()
    for i ← 0 to n - 1 do
        insert(Q, [F[i], [i]], F[i])
    ...
    return L`,
      js: `function HuffmanLengths(F) {
  // merge the two lightest trees n - 1 times; track each symbol's depth
}`,
    },
    solution: {
      pseudo: `ALGORITHM HuffmanLengths(F[0..n-1])
    if n = 1 then return [1]
    L ← array(n, 0)
    Q ← priorityQueue()
    for i ← 0 to n - 1 do
        insert(Q, [F[i], [i]], F[i])
    for k ← 1 to n - 1 do
        a ← deleteMin(Q)
        b ← deleteMin(Q)
        members ← []
        for each i in a[1] do
            L[i] ← L[i] + 1
            append(members, i)
        for each i in b[1] do
            L[i] ← L[i] + 1
            append(members, i)
        insert(Q, [a[0] + b[0], members], a[0] + b[0])
    return L`,
      js: `function HuffmanLengths(F) {
  const n = F.length;
  if (n === 1) return [1];
  const L = Array(n).fill(0);
  let trees = F.map((w, i) => [w, [i]]);
  while (trees.length > 1) {
    trees.sort((x, y) => x[0] - y[0]);
    const [a, b] = trees.splice(0, 2);
    const members = a[1].concat(b[1]);
    members.forEach((i) => L[i]++);
    trees.push([a[0] + b[0], members]);
  }
  return L;
}`,
      python: `import heapq, itertools
def huffman_lengths(F):
    n = len(F)
    if n == 1:
        return [1]
    L, tick = [0] * n, itertools.count()
    pq = [(f, next(tick), [i]) for i, f in enumerate(F)]
    heapq.heapify(pq)
    for _ in range(n - 1):
        wa, _, a = heapq.heappop(pq)
        wb, _, b = heapq.heappop(pq)
        for i in a + b:
            L[i] += 1
        heapq.heappush(pq, (wa + wb, next(tick), a + b))
    return L`,
      explain: "Exchange argument: the two least frequent symbols can always be deepest siblings in some optimal tree, and merging them leaves a smaller instance of the same problem. n − 1 merges with a heap cost O(n log n); copying member lists adds O(n · height) — fine here, and avoidable with parent pointers.",
    },
    complexity: "O(n log n) heap operations",
    followUp: "Real encoders (DEFLATE) store only these lengths and rebuild a 'canonical Huffman code' from them — try generating the actual codewords from L. For minimum variance among optimal codes, break ties by merging the oldest trees first (Lecture 9 practice).",
    distractors: ["a ← deleteMax(Q)", "L[i] ← L[i] - 1", "for k ← 1 to n do"],
    visual: "sims/huffman.html",
    lesson: "lessons/09-greedy/README.md",
  });

  ForgeProblems.add({
    id: "huffman-average-bits",
    title: "Huffman Average Bits per Symbol",
    level: 4, chapter: 9, difficulty: 1,
    topics: ["greedy", "Huffman", "compression", "priority queue"],
    strategy: "Greedy (merge the two lightest weights)",
    source: "Levitin §9.4 · Lecture 9 example",
    summary: "Compute the expected number of bits per symbol of a Huffman code.",
    statement: `
<p>How well will Huffman coding compress a file? The key number is the <b>average codeword length</b>:
<code>Σ F[i]·L[i] / Σ F[i]</code>, where <code>L[i]</code> is symbol i's codeword length in a Huffman tree
(Levitin §9.4). Compare it with the fixed-length ⌈log₂ n⌉ bits to get the compression ratio.</p>
<p><b>Input:</b> positive integer frequencies (counts) <code>F[0..n-1]</code>, n ≥ 2.
<b>Output:</b> the average number of bits per symbol of a Huffman code (a number; checked to within 10<sup>−6</sup>).
This value is the same for every way of breaking ties.</p>
<p>Example (Lecture 9): counts <code>[35, 10, 20, 20, 15]</code> → lengths 2, 3, 2, 2, 3 → (70 + 30 + 40 + 40 + 45) / 100 = <code>2.25</code> bits,
versus 3 bits for a fixed-length code — a 25% saving.</p>
<p>There is a neat shortcut that doesn't need the lengths at all. Can you find it?</p>`,
    entry: "HuffmanAverageBits",
    params: ["F"],
    compare: "float",
    tests: [
      { args: [[35, 10, 20, 20, 15]], expect: 2.25, explain: "The lecture example." },
      { args: [[1, 1]], expect: 1, explain: "Two symbols: exactly one bit each." },
      { args: [[1, 1, 2, 4, 8]], expect: 1.875, explain: "Lengths 4, 4, 3, 2, 1: (4 + 4 + 6 + 8 + 8) / 16." },
      { args: [[1, 1, 1, 1]], expect: 2 },
      { args: [[3, 3, 3]], expect: 5 / 3, explain: "Lengths 2, 2, 1 in some order." },
      { args: [[10, 10, 20, 20, 40]], expect: 2.2 },
      { args: [[7, 1]], expect: 1 },
    ],
    random: { count: 25, gen: (r, i) => [r.array(2 + (i % 10), 1, 40)] },
    reference: (F) => huffCost(F) / F.reduce((s, x) => s + x, 0),
    mutants: [
      { fn: (F) => fixedLen(F.length), hint: "You returned the fixed-length ⌈log₂ n⌉ bits. Huffman gives frequent symbols shorter codewords, so its average is usually smaller — build the tree (or use the merge-sum shortcut)." },
      { fn: (F) => huffCost(F) / F.reduce((s, x) => s + x, 0) - 1, hint: "You're exactly 1 bit short: it looks like the final merge (the root) is missing. Building a tree from n leaves takes n − 1 merges." },
      { fn: (F) => huffLengths(F).reduce((s, l) => s + l, 0) / F.length, hint: "You averaged the codeword lengths as if all symbols were equally common. Weight each length by its frequency: Σ F[i]·L[i] / Σ F[i]." },
      { fn: (F) => huffLengths(F, true).reduce((s, l, i) => s + l * F[i], 0) / F.reduce((s, x) => s + x, 0), hint: "You merge the two HEAVIEST weights. Huffman always merges the two lightest — use deleteMin twice." },
    ],
    hints: [
      "Each time two trees merge, every symbol inside them gets one bit longer. How much does that merge add to Σ F[i]·L[i]?",
      "It adds exactly the weight of the new tree! So the total number of bits is the sum of the weights of all n − 1 merged trees.",
      "Use a min-priority queue of numbers: repeat n − 1 times { a ← deleteMin(Q); b ← deleteMin(Q); bits ← bits + a + b; insert(Q, a + b, a + b) }. Return bits / Σ F.",
    ],
    starter: {
      pseudo: `ALGORITHM HuffmanAverageBits(F[0..n-1])
    Q ← priorityQueue()
    total ← 0
    for i ← 0 to n - 1 do
        insert(Q, F[i], F[i])
        total ← total + F[i]
    bits ← 0
    ...
    return bits / total`,
      js: `function HuffmanAverageBits(F) {
  // expected bits per symbol of a Huffman code
}`,
    },
    solution: {
      pseudo: `ALGORITHM HuffmanAverageBits(F[0..n-1])
    Q ← priorityQueue()
    total ← 0
    for i ← 0 to n - 1 do
        insert(Q, F[i], F[i])
        total ← total + F[i]
    bits ← 0
    for k ← 1 to n - 1 do
        a ← deleteMin(Q)
        b ← deleteMin(Q)
        bits ← bits + a + b
        insert(Q, a + b, a + b)
    return bits / total`,
      js: `function HuffmanAverageBits(F) {
  let w = F.slice(), bits = 0;
  const total = F.reduce((s, x) => s + x, 0);
  while (w.length > 1) {
    w.sort((x, y) => x - y);
    const s = w[0] + w[1];
    bits += s;
    w = w.slice(2).concat([s]);
  }
  return bits / total;
}`,
      python: `import heapq
def huffman_average_bits(F):
    pq = list(F)
    heapq.heapify(pq)
    bits = 0
    while len(pq) > 1:
        s = heapq.heappop(pq) + heapq.heappop(pq)
        bits += s
        heapq.heappush(pq, s)
    return bits / sum(F)`,
      explain: "A leaf of depth L is inside exactly L merged trees, so Σ (merged weights) = Σ F[i]·L[i]. n − 1 merges with a heap: O(n log n).",
    },
    complexity: "O(n log n)",
    followUp: "Compute the compression ratio against ⌈log₂ n⌉ bits, and compare with the entropy −Σ pᵢ log₂ pᵢ: Huffman is always within 1 bit of it. Arithmetic coding (used in modern video codecs) closes that last gap.",
    distractors: ["for k ← 1 to n - 2 do", "bits ← bits + a", "return bits / n"],
    visual: "sims/huffman.html",
    lesson: "lessons/09-greedy/README.md",
  });
  /* =====================================================================
     13–14. Maximum flow (shortest augmenting path) and minimum cut
     ===================================================================== */
  // Shortest-augmenting-path max flow on a capacity matrix. opts: noBack (forget backward edges), once (one path only).
  function sapFlow(n, E, opts) {
    opts = opts || {};
    const C = Array.from({ length: n }, () => Array(n).fill(0));
    for (const [u, v, c] of E) C[u][v] += c;
    const R = C.map((row) => row.slice());
    let f = 0, lab;
    for (;;) {
      lab = Array(n).fill(0);
      const par = Array(n).fill(-1), q = [0];
      lab[0] = INF;
      while (q.length) { const i = q.shift(); for (let j = 0; j < n; j++) if (lab[j] === 0 && R[i][j] > 0) { lab[j] = Math.min(lab[i], R[i][j]); par[j] = i; q.push(j); } }
      const r = lab[n - 1];
      if (!r) break;
      for (let j = n - 1; j !== 0; j = par[j]) { R[par[j]][j] -= r; if (!opts.noBack) R[j][par[j]] += r; }
      f += r;
      if (opts.once) break;
    }
    return { value: f, C, R, reach: lab.map((l, i) => (l > 0 ? i : -1)).filter((i) => i >= 0) };
  }
  const randNetwork = (r, n, p) => {
    const E = [];
    for (let u = 0; u < n - 1; u++) for (let v = 1; v < n; v++) if (u !== v && r() < p) E.push([u, v, r.int(1, 9)]);
    return E;
  };
  ForgeProblems.add({
    id: "max-flow-sap",
    title: "Maximum Flow (Shortest Augmenting Path)",
    level: 4, chapter: 10, difficulty: 3,
    topics: ["iterative improvement", "maximum flow", "graphs", "BFS", "Ford–Fulkerson"],
    strategy: "Iterative improvement (augment along shortest paths in the residual network)",
    source: "Levitin §10.2 · Lecture 10",
    summary: "Compute the maximum flow from source 0 to sink n − 1 with the shortest-augmenting-path algorithm.",
    statement: `
<p>How much oil, data or traffic can a network carry from a source to a sink? The <b>augmenting-path</b> (Ford–Fulkerson)
method starts from zero flow and keeps finding a source-to-sink path along which more flow can be pushed. Choosing each path
by <b>Breadth-First Search (BFS)</b> — fewest edges first — is the shortest-augmenting-path algorithm (Edmonds–Karp),
Levitin §10.2.</p>
<p><b>Input:</b> <code>n ≥ 2</code> vertices; the source is <code>0</code> and the sink is <code>n − 1</code>. <code>E</code>
lists directed edges <code>[u, v, c]</code> with positive integer capacity <code>c</code> (there may be several edges between
the same pair — their capacities add up).</p>
<p><b>Output:</b> the value of a maximum flow (a number).</p>
<p>⚠ A path may use an edge <b>backwards</b> — undoing flow that was sent earlier — whenever that edge carries positive flow.
In a residual-capacity matrix <code>R</code> this happens automatically if, after pushing <code>r</code> units along
<code>i → j</code>, you also add <code>r</code> to <code>R[j][i]</code>.</p>`,
    entry: "MaxFlow",
    params: ["n", "E"],
    tests: [
      { args: [4, [[0, 1, 3], [0, 2, 2], [1, 2, 1], [1, 3, 2], [2, 3, 3]]], expect: 5, explain: "Paths 0→1→3 (2), 0→2→3 (2), 0→1→2→3 (1)." },
      { args: [6, [[0, 1, 3], [0, 4, 4], [1, 2, 2], [1, 3, 3], [2, 5, 3], [3, 4, 4], [3, 5, 3], [4, 2, 3]]], expect: 6, explain: "Reaching 6 requires pushing flow BACK along an edge used by an earlier path." },
      { args: [3, [[0, 1, 5], [1, 2, 3]]], expect: 3, explain: "A chain carries only as much as its narrowest pipe." },
      { args: [3, [[0, 1, 4]]], expect: 0, explain: "The sink can't be reached: flow 0." },
      { args: [2, [[0, 1, 3], [0, 1, 4]]], expect: 7, explain: "Parallel edges add up." },
      { args: [4, [[0, 1, 100], [0, 2, 100], [1, 2, 1], [1, 3, 100], [2, 3, 100]]], expect: 200, explain: "Lecture 10's bad case for arbitrary paths — shortest paths finish in 2 augmentations." },
      { args: [6, [[0, 3, 2], [0, 4, 5], [1, 2, 2], [1, 4, 4], [2, 5, 6], [3, 1, 4], [3, 2, 1], [4, 1, 2], [4, 2, 2]]], expect: 5 },
    ],
    random: {
      count: 25,
      gen: (r, i) => { const n = 2 + (i % 7); return [n, randNetwork(r, n, 0.45)]; },
    },
    reference: (n, E) => sapFlow(n, E).value,
    mutants: [
      { fn: (n, E) => sapFlow(n, E, { noBack: true }).value, hint: "Your flow gets stuck below the maximum (example 2). After sending r units along i → j you must also allow sending up to r units back from j to i — add r to R[j][i]. Those backward edges let later paths reroute earlier flow." },
      { fn: (n, E) => E.filter((e) => e[0] === 0).reduce((s, e) => s + e[2], 0), hint: "You returned the total capacity leaving the source. That's only an upper bound — pipes further along may be narrower. Actually push flow along augmenting paths until none is left." },
      { fn: (n, E) => sapFlow(n, E, { once: true }).value, hint: "You stop after the first augmenting path. Iterative improvement repeats: search again in the updated residual network until the sink can no longer be reached." },
    ],
    hints: [
      "Keep the remaining (residual) capacity of every ordered pair i → j. When is it possible to push one more unit from 0 to n − 1?",
      "Loop: BFS from 0 over pairs with R[i][j] > 0, recording each vertex's parent and the bottleneck so far (Levitin's first label). If the sink is unlabeled, stop — the flow is maximum.",
      "Otherwise let r be the sink's label; walk parents back from the sink doing R[p][j] ← R[p][j] − r and R[j][p] ← R[j][p] + r; add r to the flow and repeat.",
    ],
    starter: {
      pseudo: `ALGORITHM MaxFlow(n, E)
    // source 0, sink n - 1; E: directed edges [u, v, capacity]
    R ← matrix(n, n, 0)
    for each (u, v, c) in E do
        R[u][v] ← R[u][v] + c
    flow ← 0
    while true do
        ...`,
      js: `function MaxFlow(n, E) {
  // shortest augmenting paths (BFS) in the residual network
}`,
    },
    solution: {
      pseudo: `ALGORITHM MaxFlow(n, E)
    R ← matrix(n, n, 0)
    for each (u, v, c) in E do
        R[u][v] ← R[u][v] + c
    flow ← 0
    while true do
        lab ← array(n, 0)
        parent ← array(n, -1)
        lab[0] ← ∞
        Q ← queue()
        enqueue(Q, 0)
        while not isEmpty(Q) do
            i ← dequeue(Q)
            for j ← 0 to n - 1 do
                if lab[j] = 0 and R[i][j] > 0 then
                    lab[j] ← min(lab[i], R[i][j])
                    parent[j] ← i
                    enqueue(Q, j)
        r ← lab[n - 1]
        if r = 0 then return flow
        j ← n - 1
        while j ≠ 0 do
            R[parent[j]][j] ← R[parent[j]][j] - r
            R[j][parent[j]] ← R[j][parent[j]] + r
            j ← parent[j]
        flow ← flow + r`,
      js: `function MaxFlow(n, E) {
  const R = Array.from({ length: n }, () => Array(n).fill(0));
  for (const [u, v, c] of E) R[u][v] += c;
  let flow = 0;
  for (;;) {
    const lab = Array(n).fill(0), parent = Array(n).fill(-1), q = [0];
    lab[0] = Infinity;
    while (q.length) {
      const i = q.shift();
      for (let j = 0; j < n; j++) if (lab[j] === 0 && R[i][j] > 0) { lab[j] = Math.min(lab[i], R[i][j]); parent[j] = i; q.push(j); }
    }
    const r = lab[n - 1];
    if (r === 0) return flow;
    for (let j = n - 1; j !== 0; j = parent[j]) { R[parent[j]][j] -= r; R[j][parent[j]] += r; }
    flow += r;
  }
}`,
      python: `from collections import deque
def max_flow(n, E):
    R = [[0] * n for _ in range(n)]
    for u, v, c in E:
        R[u][v] += c
    flow = 0
    while True:
        lab, parent = [0] * n, [-1] * n
        lab[0] = float("inf")
        q = deque([0])
        while q:
            i = q.popleft()
            for j in range(n):
                if lab[j] == 0 and R[i][j] > 0:
                    lab[j], parent[j] = min(lab[i], R[i][j]), i
                    q.append(j)
        r = lab[n - 1]
        if r == 0:
            return flow
        j = n - 1
        while j != 0:
            R[parent[j]][j] -= r
            R[j][parent[j]] += r
            j = parent[j]
        flow += r`,
      explain: "When no augmenting path exists, the labeled vertices form a cut whose capacity equals the flow, so by the Max-Flow Min-Cut Theorem the flow is maximum. Shortest augmenting paths need O(nm) augmentations, each an O(n²) matrix BFS here — polynomial, unlike arbitrary path choices (Lecture 10's 2U example).",
    },
    complexity: "O(nm) augmentations × O(n²) BFS with a matrix (O(nm²) with adjacency lists)",
    followUp: "Rewrite the BFS over adjacency lists to reach Edmonds–Karp's O(nm²), then look up Dinic's algorithm (blocking flows). Max flow powers bipartite matching, image segmentation and airline crew scheduling.",
    distractors: ["R[j][parent[j]] ← R[j][parent[j]] - r", "lab[j] ← R[i][j]", "if r = 0 then return 0"],
    visual: "sims/max-flow.html",
    lesson: "lessons/10-iterative-improvement/README.md",
  });

  const cutVerify = (got, [n, E]) => {
    if (!Array.isArray(got)) return "Return a list of vertices: the source side S of the cut.";
    const inS = Array(n).fill(false);
    for (const v of got) {
      if (!Number.isInteger(v) || v < 0 || v >= n) return `${v} is not a vertex.`;
      if (inS[v]) return `Vertex ${v} is listed twice.`;
      inS[v] = true;
    }
    if (!inS[0]) return "The source 0 must be on the source side S.";
    if (inS[n - 1]) return `The sink ${n - 1} must NOT be in S.`;
    let cap = 0;
    for (const [u, v, c] of E) if (inS[u] && !inS[v]) cap += c;
    const f = sapFlow(n, E).value;
    return cap === f ? true : `The edges leaving your S have total capacity ${cap}, but a minimum cut has capacity ${f} (= the maximum flow value).`;
  };
  ForgeProblems.add({
    id: "min-cut-capacity",
    title: "Minimum Cut (Max-Flow Min-Cut)",
    level: 4, chapter: 10, difficulty: 3,
    topics: ["iterative improvement", "maximum flow", "minimum cut", "graphs", "duality"],
    strategy: "Max flow, then read the cut off the final residual network",
    source: "Levitin §10.2 (Max-Flow Min-Cut Theorem)",
    summary: "Find a minimum-capacity cut separating source 0 from sink n − 1.",
    statement: `
<p>A <b>cut</b> splits the vertices into a side <code>S</code> containing the source and the rest containing the sink; its
<b>capacity</b> is the total capacity of edges going <i>from</i> <code>S</code> <i>to</i> the other side. The
<b>Max-Flow Min-Cut Theorem</b> says the smallest cut capacity equals the maximum flow value (Levitin §10.2). Minimum cuts
reveal network bottlenecks — the cheapest set of links an attacker (or a failure) must cut to disconnect a service.</p>
<p><b>Input:</b> as in <i>Maximum Flow</i>: <code>n ≥ 2</code> vertices, source <code>0</code>, sink <code>n − 1</code>,
directed edges <code>[u, v, c]</code>.</p>
<p><b>Output:</b> the list of vertices in <code>S</code>, in any order. <code>S</code> must contain <code>0</code>, must not
contain <code>n − 1</code>, and its cut capacity must be minimum. Any minimum cut is accepted.</p>`,
    entry: "MinCut",
    params: ["n", "E"],
    tests: [
      { args: [3, [[0, 1, 5], [1, 2, 3]]], expect: [0, 1], explain: "The narrow pipe 1 → 2 (capacity 3) is the bottleneck." },
      { args: [4, [[0, 1, 3], [0, 2, 2], [1, 2, 1], [1, 3, 2], [2, 3, 3]]], expect: [0], explain: "Both source edges are saturated: cutting them costs 5 = max flow." },
      { args: [3, [[0, 1, 4]]], expect: [0, 1], explain: "The sink is unreachable: a cut of capacity 0." },
      { args: [6, [[0, 3, 2], [0, 4, 5], [1, 2, 2], [1, 4, 4], [2, 5, 6], [3, 1, 4], [3, 2, 1], [4, 1, 2], [4, 2, 2]]], expect: [0, 1, 3, 4], explain: "Reachability in the residual network must also follow edges BACKWARDS where flow can be undone." },
      { args: [2, [[0, 1, 7]]], expect: [0] },
      { args: [6, [[0, 1, 3], [0, 4, 4], [1, 2, 2], [1, 3, 3], [2, 5, 3], [3, 4, 4], [3, 5, 3], [4, 2, 3]]], expect: [0, 4] },
    ],
    random: {
      count: 25,
      gen: (r, i) => { const n = 2 + (i % 7); return [n, randNetwork(r, n, 0.45)]; },
    },
    verify: cutVerify,
    compare: "unordered",
    mutants: [
      { fn: () => [0], hint: "You always return S = {0}. Cutting every edge out of the source is a cut, but often not the smallest (example 1). Run max flow first, then collect every vertex still reachable from 0 in the residual network." },
      { fn: (n, E) => { const reach = sapFlow(n, E).reach; return [...Array(n).keys()].filter((v) => !reach.includes(v)); }, hint: "You returned the SINK's side. S is the set of vertices reachable from the source in the final residual network — it contains 0, not n − 1." },
      { fn: (n, E) => { const { C, R } = sapFlow(n, E); const seen = Array(n).fill(false), q = [0]; seen[0] = true; while (q.length) { const i = q.shift(); for (let j = 0; j < n; j++) if (!seen[j] && C[i][j] > 0 && Math.max(0, C[i][j] - R[i][j]) < C[i][j]) { seen[j] = true; q.push(j); } } return [...Array(n).keys()].filter((v) => seen[v]); }, hint: "Your final search follows only forward edges with unused capacity. It must also move backwards across an edge j → i that carries flow (it could be undone) — in the residual matrix that is just R[i][j] > 0 (example 4)." },
    ],
    hints: [
      "When the augmenting-path algorithm stops, the sink is unreachable in the residual network. Which vertices ARE still reachable from the source?",
      "Run the maximum-flow algorithm. The Breadth-First Search (BFS) that fails to reach the sink has labeled exactly the source side of a minimum cut.",
      "In that last round, return every j with lab[j] > 0 (or visited[j] = true): every edge from S to the rest is saturated and every edge back into S carries no flow, so the cut capacity equals the flow.",
    ],
    starter: {
      pseudo: `ALGORITHM MinCut(n, E)
    // Output: the source side S of a minimum cut (list of vertices)
    R ← matrix(n, n, 0)
    for each (u, v, c) in E do
        R[u][v] ← R[u][v] + c
    while true do
        ...`,
      js: `function MinCut(n, E) {
  // max flow, then the vertices reachable from 0 in the residual network
}`,
    },
    solution: {
      pseudo: `ALGORITHM MinCut(n, E)
    R ← matrix(n, n, 0)
    for each (u, v, c) in E do
        R[u][v] ← R[u][v] + c
    while true do
        lab ← array(n, 0)
        parent ← array(n, -1)
        lab[0] ← ∞
        Q ← queue()
        enqueue(Q, 0)
        while not isEmpty(Q) do
            i ← dequeue(Q)
            for j ← 0 to n - 1 do
                if lab[j] = 0 and R[i][j] > 0 then
                    lab[j] ← min(lab[i], R[i][j])
                    parent[j] ← i
                    enqueue(Q, j)
        r ← lab[n - 1]
        if r = 0 then
            S ← []
            for v ← 0 to n - 1 do
                if lab[v] > 0 then append(S, v)
            return S
        j ← n - 1
        while j ≠ 0 do
            R[parent[j]][j] ← R[parent[j]][j] - r
            R[j][parent[j]] ← R[j][parent[j]] + r
            j ← parent[j]`,
      js: `function MinCut(n, E) {
  const R = Array.from({ length: n }, () => Array(n).fill(0));
  for (const [u, v, c] of E) R[u][v] += c;
  for (;;) {
    const lab = Array(n).fill(0), parent = Array(n).fill(-1), q = [0];
    lab[0] = Infinity;
    while (q.length) {
      const i = q.shift();
      for (let j = 0; j < n; j++) if (lab[j] === 0 && R[i][j] > 0) { lab[j] = Math.min(lab[i], R[i][j]); parent[j] = i; q.push(j); }
    }
    const r = lab[n - 1];
    if (r === 0) return [...Array(n).keys()].filter((v) => lab[v] > 0);
    for (let j = n - 1; j !== 0; j = parent[j]) { R[parent[j]][j] -= r; R[j][parent[j]] += r; }
  }
}`,
      python: `from collections import deque
def min_cut(n, E):
    R = [[0] * n for _ in range(n)]
    for u, v, c in E:
        R[u][v] += c
    while True:
        lab, parent = [0] * n, [-1] * n
        lab[0] = float("inf")
        q = deque([0])
        while q:
            i = q.popleft()
            for j in range(n):
                if lab[j] == 0 and R[i][j] > 0:
                    lab[j], parent[j] = min(lab[i], R[i][j]), i
                    q.append(j)
        r = lab[n - 1]
        if r == 0:
            return [v for v in range(n) if lab[v] > 0]
        j = n - 1
        while j != 0:
            R[parent[j]][j] -= r
            R[j][parent[j]] += r
            j = parent[j]`,
      explain: "At termination every edge leaving S is saturated and every edge entering S carries zero flow (otherwise BFS would have crossed it), so capacity(S) = flow value; since any cut is ≥ any flow, both are optimal. The cost is that of the max-flow computation.",
    },
    complexity: "Same as max flow (shortest augmenting paths)",
    followUp: "Return the list of cut EDGES too. Minimum cuts are the engine behind graph-cut image segmentation and 'project selection' problems (choose projects with prerequisites to maximize profit) — a favorite senior-interview reduction.",
    distractors: ["if lab[v] = 0 then append(S, v)", "S ← [0]", "if r > 0 then"],
    visual: "sims/max-flow.html",
    lesson: "lessons/10-iterative-improvement/README.md",
  });

  /* =====================================================================
     15. Maximum matching in a bipartite graph
     ===================================================================== */
  function matchSize(adj, m) {
    const mate = Array(m).fill(-1);
    const aug = (u, seen) => { for (const v of adj[u]) if (!seen[v]) { seen[v] = true; if (mate[v] === -1 || aug(mate[v], seen)) { mate[v] = u; return true; } } return false; };
    let size = 0;
    for (let u = 0; u < adj.length; u++) if (aug(u, Array(m).fill(false))) size++;
    return size;
  }
  ForgeProblems.add({
    id: "bipartite-matching-size",
    title: "Maximum Bipartite Matching",
    level: 4, chapter: 10, difficulty: 3,
    topics: ["iterative improvement", "matching", "bipartite graphs", "augmenting paths"],
    strategy: "Iterative improvement (augmenting paths)",
    source: "Levitin §10.3",
    summary: "Pair up as many left vertices with right vertices as possible along the given edges.",
    statement: `
<p>Assign workers to jobs, students to project slots, or ads to page positions: each left vertex may be paired with at most one
right vertex it is connected to, and vice versa. A largest such set of pairs is a <b>maximum matching</b>. The iterative-improvement
idea: find an <b>augmenting path</b> — it starts at a free left vertex, alternates non-matching and matching edges, and ends at a free
right vertex — and flip it, growing the matching by one (Levitin §10.3).</p>
<p><b>Input:</b> <code>adj[0..n-1]</code> where <code>adj[i]</code> lists the right vertices (numbered <code>0..m-1</code>)
connected to left vertex <code>i</code>, and the number <code>m</code> of right vertices.</p>
<p><b>Output:</b> the size of a maximum matching.</p>
<p>Example: <code>adj = [[0, 1], [0]]</code>, <code>m = 2</code>. Matching left 0 with right 0 first blocks left 1 — but
re-matching left 0 to right 1 frees right 0 for left 1 → answer <code>2</code>.</p>`,
    entry: "MaxMatching",
    params: ["adj", "m"],
    tests: [
      { args: [[[0, 1], [0]], 2], expect: 2, explain: "Greedy first-come pairing gets 1; an augmenting path fixes it." },
      { args: [[[0], [0], [0]], 1], expect: 1, explain: "Three workers want the same single job." },
      { args: [[[], [1]], 3], expect: 1, explain: "Left vertex 0 has no edges; only one pair is possible." },
      { args: [[], 0], expect: 0 },
      { args: [[[0, 1, 2], [0], [1]], 3], expect: 3, explain: "Left 0 must take right 2, leaving 0 and 1 for the others." },
      { args: [[[0, 1], [0, 1], [0, 1], [2, 3]], 4], expect: 3 },
      { args: [[[1], [0, 2], [1, 3], [2, 4], [3]], 5], expect: 4, explain: "Left 0 needs right 1 and left 4 needs right 3 — exactly the two partners left 2 could use. A perfect matching is impossible." },
    ],
    random: {
      count: 25,
      gen: (r, i) => {
        const n = 1 + (i % 8), m = r.int(1, 8);
        return [Array.from({ length: n }, () => [...Array(m).keys()].filter(() => r() < 0.3)), m];
      },
    },
    reference: matchSize,
    mutants: [
      { fn: (adj, m) => { const used = Array(m).fill(false); let s = 0; for (const L of adj) { const v = L.find((x) => !used[x]); if (v !== undefined) { used[v] = true; s++; } } return s; }, hint: "Each left vertex grabs its first free partner and never changes. That can block later vertices (example 1). When a vertex finds all partners taken, try to REROUTE: can the current partner's owner move to another free vertex?" },
      { fn: (adj, m) => Math.min(adj.length, m), hint: "You returned min(n, m) — the best case — without looking at the edges. Vertices can only be paired along edges (example 3)." },
      { fn: (adj) => adj.filter((L) => L.length > 0).length, hint: "You counted left vertices that have at least one edge. Several of them may compete for the same right vertex (example 2) — each right vertex can be used once." },
    ],
    hints: [
      "Left vertex u wants right vertex v, but v is already matched to u'. When could you still give v to u?",
      "Write Augment(u): for each neighbor v of u not yet tried in this search, mark it tried; if v is free OR Augment(mate[v]) succeeds, set mate[v] ← u and return true. Otherwise return false.",
      "For each left vertex u, reset the 'tried' marks and call Augment(u); count the successes. mate[v] stores the left partner of right vertex v (−1 if free).",
    ],
    starter: {
      pseudo: `ALGORITHM MaxMatching(adj[0..n-1], m)
    mate ← array(m, -1)
    size ← 0
    for u ← 0 to n - 1 do
        ...
    return size

ALGORITHM Augment(u, adj, mate, seen)
    // try to match u, possibly re-matching others along an augmenting path
    ...`,
      js: `function MaxMatching(adj, m) {
  const mate = new Array(m).fill(-1);
  // augmenting paths
}`,
    },
    solution: {
      pseudo: `ALGORITHM MaxMatching(adj[0..n-1], m)
    mate ← array(m, -1)
    size ← 0
    for u ← 0 to n - 1 do
        seen ← array(m, false)
        if Augment(u, adj, mate, seen) then
            size ← size + 1
    return size

ALGORITHM Augment(u, adj, mate, seen)
    for each v in adj[u] do
        if not seen[v] then
            seen[v] ← true
            if mate[v] = -1 or Augment(mate[v], adj, mate, seen) then
                mate[v] ← u
                return true
    return false`,
      js: `function MaxMatching(adj, m) {
  const mate = new Array(m).fill(-1);
  function augment(u, seen) {
    for (const v of adj[u]) {
      if (seen[v]) continue;
      seen[v] = true;
      if (mate[v] === -1 || augment(mate[v], seen)) { mate[v] = u; return true; }
    }
    return false;
  }
  let size = 0;
  for (let u = 0; u < adj.length; u++) if (augment(u, new Array(m).fill(false))) size++;
  return size;
}`,
      python: `def max_matching(adj, m):
    mate = [-1] * m
    def augment(u, seen):
        for v in adj[u]:
            if not seen[v]:
                seen[v] = True
                if mate[v] == -1 or augment(mate[v], seen):
                    mate[v] = u
                    return True
        return False
    return sum(augment(u, [False] * m) for u in range(len(adj)))`,
      explain: "Berge's theorem: a matching is maximum exactly when no augmenting path exists — so after every left vertex has had its search, no improvement is possible. Each search is a Depth-First Search (DFS) over O(n + m + |E|), for O(n·(n + m + |E|)) overall; Levitin's Breadth-First Search (BFS) version has the same bound.",
    },
    complexity: "O(n · (n + m + |E|))",
    followUp: "Hopcroft–Karp finds many shortest augmenting paths per phase for O(√n · |E|). Or model it as max flow: source → left (cap 1) → right (cap 1) → sink. Ride-sharing dispatch and residency matching start here.",
    distractors: ["if mate[v] = -1 and Augment(mate[v], adj, mate, seen) then", "mate[u] ← v", "seen ← array(m, true)"],
    visual: "sims/bipartite-matching.html",
    lesson: "lessons/10-iterative-improvement/README.md",
  });

  /* =====================================================================
     16–17. Stable marriage
     ===================================================================== */
  // Gale–Shapley with P proposing to Q. variant: "noTradeUp" | "inverted". Returns match[proposer].
  function galeShapley(P, Q, variant) {
    const n = P.length;
    const rank = Q.map((pr) => { const r = Array(n); pr.forEach((x, k) => (r[x] = variant === "inverted" ? n - 1 - k : k)); return r; });
    const next = Array(n).fill(0), holder = Array(n).fill(-1), match = Array(n).fill(-1), free = [...Array(n).keys()];
    while (free.length) {
      const m = free.shift();
      if (next[m] >= n) continue;
      const w = P[m][next[m]++], cur = holder[w];
      if (cur === -1) { holder[w] = m; match[m] = w; }
      else if (variant !== "noTradeUp" && rank[w][m] < rank[w][cur]) { holder[w] = m; match[m] = w; match[cur] = -1; free.push(cur); }
      else free.push(m);
    }
    return match;
  }
  const invertMatch = (h) => { const w = Array(h.length); h.forEach((m, x) => (w[m] = x)); return w; };
  const randPrefs = (r, n) => Array.from({ length: n }, () => r.shuffle([...Array(n).keys()]));
  function hasBlockingPair(M, W, wife, manSideOnly, inverted) {
    const n = M.length, husband = invertMatch(wife);
    const rk = (L) => { const r = Array(n); L.forEach((x, k) => (r[x] = inverted ? n - 1 - k : k)); return r; };
    const rM = M.map(rk), rW = W.map(rk);
    for (let m = 0; m < n; m++) for (let w = 0; w < n; w++) {
      if (w === wife[m]) continue;
      if (rM[m][w] < rM[m][wife[m]] && (manSideOnly || rW[w][m] < rW[w][husband[w]])) return true;
    }
    return false;
  }

  ForgeProblems.add({
    id: "is-stable-matching",
    title: "Is This Matching Stable?",
    level: 4, chapter: 10, difficulty: 1,
    topics: ["stable marriage", "matching", "verification"],
    strategy: "Brute-force check for a blocking pair",
    source: "Levitin §10.4",
    summary: "Check whether a given perfect matching has a blocking pair.",
    statement: `
<p>In the <b>stable marriage problem</b> there are <code>n</code> men and <code>n</code> women, each ranking all members of the
other group. A matching is <b>unstable</b> if some man <code>m</code> and woman <code>w</code> who are <i>not</i> married to each other
both prefer each other to their current partners — a <b>blocking pair</b> that would run off together (Levitin §10.4). Verifying a
solution is a skill in its own right: before trusting any matching algorithm, check its output.</p>
<p><b>Input:</b> <code>menPref[i]</code> lists the women in man <code>i</code>'s order of preference (favorite first);
<code>womenPref[j]</code> lists the men in woman <code>j</code>'s order. <code>wife[i]</code> is the woman man <code>i</code> is
married to (a valid one-to-one matching).</p>
<p><b>Output:</b> <code>true</code> if the matching is stable (no blocking pair), otherwise <code>false</code>.</p>
<p>Tip: first build <code>husband[w]</code> and rank tables <code>rankM[m][w]</code>, <code>rankW[w][m]</code> (position in the
list) so "prefers" becomes a single comparison.</p>`,
    entry: "IsStable",
    params: ["menPref", "womenPref", "wife"],
    tests: [
      { args: [[[0, 1], [0, 1]], [[0, 1], [0, 1]], [1, 0]], expect: false, explain: "Man 0 and woman 0 are each other's favorites but not married: a blocking pair." },
      { args: [[[0, 1], [0, 1]], [[0, 1], [0, 1]], [0, 1]], expect: true, explain: "Same people, favorites married to each other: man 1 would prefer woman 0, but she prefers her own husband." },
      { args: [[[0, 1], [1, 0]], [[1, 0], [0, 1]], [1, 0]], expect: true, explain: "Both men got their 2nd choice, but every woman got her favorite — nobody blocks. Unhappy ≠ unstable." },
      { args: [[[0]], [[0]], [0]], expect: true },
      { args: [[[0, 1], [1, 0]], [[1, 0], [0, 1]], [0, 1]], expect: true, explain: "The other stable matching of the same instance (men happy)." },
      { args: [[[2, 0, 1], [0, 2, 1], [0, 1, 2]], [[1, 0, 2], [2, 0, 1], [0, 2, 1]], [0, 2, 1]], expect: false },
      { args: [[[2, 0, 1], [0, 2, 1], [0, 1, 2]], [[1, 0, 2], [2, 0, 1], [0, 2, 1]], [2, 0, 1]], expect: true },
    ],
    random: {
      count: 30,
      gen: (r, i) => {
        const n = 1 + (i % 5), M = randPrefs(r, n), W = randPrefs(r, n);
        const wife = i % 3 === 0 ? galeShapley(M, W) : i % 3 === 1 ? invertMatch(galeShapley(W, M)) : r.shuffle([...Array(n).keys()]);
        return [M, W, wife];
      },
    },
    reference: (M, W, wife) => !hasBlockingPair(M, W, wife),
    mutants: [
      { fn: (M, W, wife) => !hasBlockingPair(M, W, wife, true), hint: "You call the matching unstable as soon as a man prefers another woman. A pair only blocks if the woman ALSO prefers him to her own husband (example 3)." },
      { fn: (M, W, wife) => !hasBlockingPair(M, W, wife, false, true), hint: "Your preferences seem reversed: position 0 in a list is the FAVORITE. 'm prefers w to his wife' means rankM[m][w] < rankM[m][wife[m]]." },
      { fn: () => true, hint: "You always answer true. Check every man m and every woman w ≠ wife[m]: do they both prefer each other to their current partners?" },
    ],
    hints: [
      "Stability is about pairs who are NOT married. What two conditions make such a pair dangerous?",
      "Build husband[w] from wife[], and rank tables rankM[m][w] = position of w in menPref[m], rankW[w][m] likewise. Then check all n² man–woman pairs.",
      "For m, w with w ≠ wife[m]: if rankM[m][w] < rankM[m][wife[m]] and rankW[w][m] < rankW[w][husband[w]] then return false. After all pairs, return true.",
    ],
    starter: {
      pseudo: `ALGORITHM IsStable(menPref[0..n-1], womenPref, wife)
    husband ← array(n, -1)
    rankM ← matrix(n, n, 0)
    rankW ← matrix(n, n, 0)
    ...
    return true`,
      js: `function IsStable(menPref, womenPref, wife) {
  // look for a blocking pair
}`,
    },
    solution: {
      pseudo: `ALGORITHM IsStable(menPref[0..n-1], womenPref, wife)
    husband ← array(n, -1)
    rankM ← matrix(n, n, 0)
    rankW ← matrix(n, n, 0)
    for i ← 0 to n - 1 do
        husband[wife[i]] ← i
        for k ← 0 to n - 1 do
            rankM[i][menPref[i][k]] ← k
            rankW[i][womenPref[i][k]] ← k
    for m ← 0 to n - 1 do
        for w ← 0 to n - 1 do
            if w ≠ wife[m] and rankM[m][w] < rankM[m][wife[m]] and rankW[w][m] < rankW[w][husband[w]] then
                return false
    return true`,
      js: `function IsStable(menPref, womenPref, wife) {
  const n = menPref.length, husband = [], rankM = [], rankW = [];
  for (let i = 0; i < n; i++) {
    husband[wife[i]] = i; rankM[i] = []; rankW[i] = [];
    for (let k = 0; k < n; k++) { rankM[i][menPref[i][k]] = k; rankW[i][womenPref[i][k]] = k; }
  }
  for (let m = 0; m < n; m++) for (let w = 0; w < n; w++)
    if (w !== wife[m] && rankM[m][w] < rankM[m][wife[m]] && rankW[w][m] < rankW[w][husband[w]]) return false;
  return true;
}`,
      python: `def is_stable(men_pref, women_pref, wife):
    n = len(men_pref)
    husband = [0] * n
    rank_m = [[0] * n for _ in range(n)]
    rank_w = [[0] * n for _ in range(n)]
    for i in range(n):
        husband[wife[i]] = i
        for k in range(n):
            rank_m[i][men_pref[i][k]] = k
            rank_w[i][women_pref[i][k]] = k
    return not any(w != wife[m] and rank_m[m][w] < rank_m[m][wife[m]]
                   and rank_w[w][m] < rank_w[w][husband[w]]
                   for m in range(n) for w in range(n))`,
      explain: "The rank tables turn each 'prefers' question into one comparison, so checking all n² pairs costs Θ(n²) — linear in the input size, since the preference lists themselves hold 2n² entries.",
    },
    complexity: "Θ(n²)",
    followUp: "You can speed this up by scanning each man's list only up to his wife (the women he prefers). Verification being cheap while search is harder is the heart of the Nondeterministic Polynomial (NP) class (Levitin Ch 11) — though stable marriage itself is easy, as the next problem shows.",
    distractors: ["if w ≠ wife[m] and rankM[m][w] < rankM[m][wife[m]] then", "rankM[i][k] ← menPref[i][k]", "if rankW[w][m] > rankW[w][husband[w]] then"],
    visual: "sims/stable-marriage.html",
    lesson: "lessons/10-iterative-improvement/README.md",
  });

  ForgeProblems.add({
    id: "gale-shapley",
    title: "Gale–Shapley Stable Marriage",
    level: 4, chapter: 10, difficulty: 2,
    topics: ["iterative improvement", "stable marriage", "matching", "queues"],
    strategy: "Iterative improvement (proposals and trade-ups)",
    source: "Levitin §10.4 · Lecture 10",
    summary: "Run the men-proposing Gale–Shapley algorithm and return each man's wife.",
    statement: `
<p>The Gale–Shapley algorithm always finds a stable matching (Levitin §10.4) and underlies the American medical residency match
(run by the National Resident Matching Program (NRMP)) and school-choice systems. While some man is free, he <b>proposes</b> to the highest-ranked woman he hasn't proposed to yet.
If she is free she accepts; if she prefers him to her current partner she <b>trades up</b> and her old partner becomes free;
otherwise she rejects him.</p>
<p><b>Input:</b> <code>menPref[i]</code> = women in man <code>i</code>'s preference order (favorite first), and
<code>womenPref[j]</code> = men in woman <code>j</code>'s preference order; <code>n ≥ 1</code>.</p>
<p><b>Output:</b> <code>wife[0..n-1]</code> for the matching produced when the <b>men propose</b>. (Whatever order the free men
propose in, the result is the same: the <i>man-optimal</i> stable matching.)</p>`,
    entry: "StableMarriage",
    params: ["menPref", "womenPref"],
    tests: [
      { args: [[[0, 1], [1, 0]], [[1, 0], [0, 1]]], expect: [0, 1], explain: "Both men get their favorite. (If the women proposed, they'd get theirs: [1, 0].)" },
      { args: [[[0, 1], [0, 1]], [[1, 0], [1, 0]]], expect: [1, 0], explain: "Woman 0 first accepts man 0, then trades up to man 1." },
      { args: [[[0]], [[0]]], expect: [0], explain: "One man, one woman: the first proposal is accepted." },
      { args: [[[2, 0, 1], [0, 2, 1], [0, 1, 2]], [[1, 0, 2], [2, 0, 1], [0, 2, 1]]], expect: [2, 0, 1] },
      { args: [[[0, 1, 2], [0, 1, 2], [0, 1, 2]], [[2, 1, 0], [2, 1, 0], [2, 1, 0]]], expect: [2, 1, 0], explain: "Everyone agrees on the rankings: the women's favorite gets the men's favorite, and so on." },
      { args: [[[1, 0, 2], [0, 1, 2], [0, 1, 2]], [[0, 1, 2], [1, 0, 2], [0, 1, 2]]], expect: [1, 0, 2] },
    ],
    random: {
      count: 30,
      gen: (r, i) => { const n = 1 + (i % 6); return [randPrefs(r, n), randPrefs(r, n)]; },
    },
    reference: (M, W) => galeShapley(M, W),
    mutants: [
      { fn: (M, W) => invertMatch(galeShapley(W, M)), hint: "Your matching is stable but it's the WOMEN-optimal one — it looks like the women are proposing. In this problem the men propose, going down their own preference lists." },
      { fn: (M, W) => galeShapley(M, W, "noTradeUp"), hint: "A woman who is already engaged never switches. She must accept a new proposal when she prefers the new man to her current partner — and her old partner becomes free again (example 2)." },
      { fn: (M, W) => galeShapley(M, W, "inverted"), hint: "The women seem to prefer men who appear LATER in their lists. Position 0 is the favorite: she trades up when rank[w][m] < rank[w][current]." },
    ],
    hints: [
      "Each man proposes down his own list and never proposes to the same woman twice. What does a woman do when a second proposal arrives?",
      "Keep a queue of free men, next[m] (index of the next woman to ask), husband[w] (−1 if free) and a rank table rankW[w][m]. Loop while the queue isn't empty.",
      "m ← dequeue; w ← menPref[m][next[m]]; next[m]++. If husband[w] = −1 marry them; else if rankW[w][m] < rankW[w][husband[w]] then free the old husband (enqueue him) and marry m; otherwise enqueue m again.",
    ],
    starter: {
      pseudo: `ALGORITHM StableMarriage(menPref[0..n-1], womenPref)
    rankW ← matrix(n, n, 0)
    for w ← 0 to n - 1 do
        for k ← 0 to n - 1 do
            rankW[w][womenPref[w][k]] ← k
    next ← array(n, 0)
    husband ← array(n, -1)
    wife ← array(n, -1)
    free ← queue()
    ...
    return wife`,
      js: `function StableMarriage(menPref, womenPref) {
  // men propose; women trade up
}`,
    },
    solution: {
      pseudo: `ALGORITHM StableMarriage(menPref[0..n-1], womenPref)
    rankW ← matrix(n, n, 0)
    for w ← 0 to n - 1 do
        for k ← 0 to n - 1 do
            rankW[w][womenPref[w][k]] ← k
    next ← array(n, 0)
    husband ← array(n, -1)
    wife ← array(n, -1)
    free ← range(0, n - 1)
    while not isEmpty(free) do
        m ← dequeue(free)
        w ← menPref[m][next[m]]
        next[m] ← next[m] + 1
        if husband[w] = -1 then
            husband[w] ← m
            wife[m] ← w
        else if rankW[w][m] < rankW[w][husband[w]] then
            enqueue(free, husband[w])
            husband[w] ← m
            wife[m] ← w
        else
            enqueue(free, m)
    return wife`,
      js: `function StableMarriage(menPref, womenPref) {
  const n = menPref.length;
  const rankW = womenPref.map((L) => { const r = []; L.forEach((m, k) => (r[m] = k)); return r; });
  const next = Array(n).fill(0), husband = Array(n).fill(-1), wife = Array(n).fill(-1);
  const free = [...Array(n).keys()];
  while (free.length) {
    const m = free.shift(), w = menPref[m][next[m]++];
    if (husband[w] === -1) { husband[w] = m; wife[m] = w; }
    else if (rankW[w][m] < rankW[w][husband[w]]) { free.push(husband[w]); husband[w] = m; wife[m] = w; }
    else free.push(m);
  }
  return wife;
}`,
      python: `from collections import deque
def stable_marriage(men_pref, women_pref):
    n = len(men_pref)
    rank_w = [[0] * n for _ in range(n)]
    for w in range(n):
        for k, m in enumerate(women_pref[w]):
            rank_w[w][m] = k
    nxt, husband, wife = [0] * n, [-1] * n, [-1] * n
    free = deque(range(n))
    while free:
        m = free.popleft()
        w = men_pref[m][nxt[m]]; nxt[m] += 1
        if husband[w] == -1:
            husband[w], wife[m] = m, w
        elif rank_w[w][m] < rank_w[w][husband[w]]:
            free.append(husband[w])
            husband[w], wife[m] = m, w
        else:
            free.append(m)
    return wife`,
      explain: "Every proposal crosses one woman off one man's list, so there are at most n² proposals: O(n²) with the rank table. A woman's partner only improves, and a man is rejected only by women who hold better partners — so no blocking pair survives (Levitin §10.4).",
    },
    complexity: "O(n²) proposals",
    followUp: "Prove to yourself that the output is man-optimal and woman-pessimal, then check it with your IsStable. Real matching markets (NRMP) extend this to hospitals with several slots and couples — where stability can become Nondeterministic Polynomial (NP)-hard.",
    distractors: ["if rankW[w][m] > rankW[w][husband[w]] then", "w ← menPref[m][0]", "enqueue(free, w)"],
    visual: "sims/stable-marriage.html",
    lesson: "lessons/10-iterative-improvement/README.md",
  });

  /* =====================================================================
     18. Simplex method (two decision variables)
     ===================================================================== */
  // Tableau simplex. rule: "bland" (reference, never cycles) | "dantzig" | "largestRatio" (student bug).
  function simplexValue(c, A, b, rule) {
    const EPS = 1e-9, k = c.length, m = A.length, W = k + m + 1, T = [];
    for (let i = 0; i < m; i++) { const row = Array(W).fill(0); for (let j = 0; j < k; j++) row[j] = A[i][j]; row[k + i] = 1; row[W - 1] = b[i]; T.push(row); }
    const z = Array(W).fill(0);
    for (let j = 0; j < k; j++) z[j] = -c[j];
    T.push(z);
    for (let it = 0; it < 100; it++) {
      let p = -1;
      for (let j = 0; j < W - 1; j++) if (T[m][j] < -EPS && (p < 0 || (rule !== "bland" && T[m][j] < T[m][p]))) { p = j; if (rule === "bland") break; }
      if (p < 0) return T[m][W - 1];
      let r = -1;
      for (let i = 0; i < m; i++) {
        if (T[i][p] <= EPS) continue;
        const ratio = T[i][W - 1] / T[i][p];
        if (r < 0 || (rule === "largestRatio" ? ratio > T[r][W - 1] / T[r][p] + EPS : ratio < T[r][W - 1] / T[r][p] - EPS)) r = i;
      }
      if (r < 0) return INF;
      const pv = T[r][p];
      for (let j = 0; j < W; j++) T[r][j] /= pv;
      for (let i = 0; i <= m; i++) if (i !== r) { const f = T[i][p]; if (f) for (let j = 0; j < W; j++) T[i][j] -= f * T[r][j]; }
    }
    return T[m][W - 1];
  }
  ForgeProblems.add({
    id: "simplex-max-2var",
    title: "Simplex Method (Two Variables)",
    level: 4, chapter: 10, difficulty: 3,
    topics: ["iterative improvement", "linear programming", "simplex method"],
    strategy: "Iterative improvement (pivot from vertex to better adjacent vertex)",
    source: "Levitin §10.1 · Lecture 10",
    summary: "Maximize c·(x, y) subject to A·(x, y) ≤ b, x, y ≥ 0 with the simplex tableau; return the optimal value or ∞.",
    statement: `
<p><b>Linear Programming (LP)</b> schedules airlines, blends fuels and routes freight. The <b>simplex method</b> (Dantzig, 1947)
starts at a corner of the feasible region and repeatedly pivots to an adjacent corner with a better objective value until no
neighbor is better (Levitin §10.1).</p>
<p><b>Input:</b> <code>c = [c₀, c₁]</code>, a list of constraint rows <code>A[i] = [aᵢ₀, aᵢ₁]</code> and right-hand sides
<code>b[i] ≥ 0</code>. The problem is</p>
<pre>maximize   c₀·x + c₁·y
subject to aᵢ₀·x + aᵢ₁·y ≤ b[i]   for every i
           x ≥ 0, y ≥ 0</pre>
<p>Because every <code>b[i] ≥ 0</code>, the origin with all slack variables basic is a feasible starting tableau.</p>
<p><b>Output:</b> the maximum value of the objective (checked to within 10<sup>−6</sup>), or <code>∞</code> if it is unbounded.</p>
<p>Tableau recipe (Lecture 10): objective row = <code>−c</code>; entering column = most negative objective-row entry (stop when none
is negative); departing row = smallest θ-ratio <code>b / entry</code> over <b>positive</b> entries of that column (none → unbounded);
then pivot. Code written for any number of variables is welcome.</p>`,
    entry: "Simplex",
    params: ["c", "A", "b"],
    compare: "float",
    tests: [
      { args: [[3, 5], [[1, 1], [1, 3]], [4, 6]], expect: 14, explain: "Lecture 10's example: optimum at (3, 1), z = 3·3 + 5·1." },
      { args: [[1, 1], [[1, -1]], [1]], expect: INF, explain: "Move along x = y + 1 forever: the objective is unbounded." },
      { args: [[2, 3], [[1, 1]], [5]], expect: 15, explain: "One constraint: put everything into y." },
      { args: [[5, 4], [[6, 4], [1, 2], [-1, 1], [0, 1]], [24, 6, 1, 2]], expect: 21, explain: "Optimum at the corner (3, 1.5) where two constraints meet — not on an axis." },
      { args: [[-1, -2], [[1, 1]], [3]], expect: 0, explain: "All objective coefficients are negative: stay at the origin." },
      { args: [[1, 1], [[1, -1], [1, 1]], [0, 4]], expect: 4, explain: "A degenerate start (b = 0) — the first pivot doesn't move but the method continues." },
      { args: [[1, 2], [[1, 0], [0, 1]], [2, 3]], expect: 8 },
      { args: [[1, 1], [[1, 0]], [3]], expect: INF, explain: "y has no upper limit." },
    ],
    random: {
      count: 25,
      gen: (r, i) => {
        const m = 1 + (i % 4), A = [], b = [];
        for (let k = 0; k < m; k++) { A.push([r.int(-2, 6), r.int(-2, 6)]); b.push(r.int(0, 20)); }
        return [[r.int(-1, 6), r.int(-1, 6)], A, b];
      },
    },
    reference: (c, A, b) => simplexValue(c, A, b, "bland"),
    mutants: [
      { fn: () => 0, hint: "You always stop at the origin (value 0). The objective row starts as −c, so a NEGATIVE entry means that increasing its variable would raise the objective: pick the most negative entry as the entering column, and stop only when none is negative." },
      { fn: (c, A, b) => simplexValue(c, A, b, "largestRatio"), hint: "Your answers are too large — you left the feasible region. The departing row must have the SMALLEST θ-ratio (b ÷ positive pivot-column entry); that's the first constraint to become tight as the entering variable grows." },
      { fn: (c, A, b) => { const lim = (j) => { let best = INF; A.forEach((row, i) => { if (row[j] > 0) best = Math.min(best, b[i] / row[j]); }); return best; }; const vals = [0]; for (let j = 0; j < 2; j++) if (c[j] > 0) vals.push(lim(j) === INF ? INF : c[j] * lim(j)); return Math.max(...vals); }, hint: "You only tried corners on the x- and y-axes. The optimum can be where two constraints cross (example 4: (3, 1.5)). Keep pivoting until the objective row has no negative entries." },
    ],
    hints: [
      "The optimum sits at a corner of the feasible region (Extreme Point Theorem). Starting at the origin, how do you find a neighboring corner that is better?",
      "Build the tableau: one row per constraint [aᵢ₀, aᵢ₁ | slack identity | bᵢ] and an objective row [−c₀, −c₁ | 0 … | 0]. Then loop: choose the entering column, choose the departing row, pivot.",
      "Pivot(r, p): divide row r by T[r][p]; for every other row i (including the objective row) subtract T[i][p] × row r. The answer is the bottom-right entry when no objective entry is negative; if the pivot column has no positive entry, return ∞.",
    ],
    starter: {
      pseudo: `ALGORITHM Simplex(c[0..k-1], A[0..m-1], b)
    T ← matrix(m + 1, k + m + 1, 0)
    for i ← 0 to m - 1 do
        for j ← 0 to k - 1 do
            T[i][j] ← A[i][j]
        T[i][k + i] ← 1
        T[i][k + m] ← b[i]
    for j ← 0 to k - 1 do
        T[m][j] ← -c[j]
    while true do
        ...

ALGORITHM Pivot(T, r, p)
    ...`,
      js: `function Simplex(c, A, b) {
  // tableau simplex; return the optimal value or Infinity
}`,
    },
    solution: {
      pseudo: `ALGORITHM Simplex(c[0..k-1], A[0..m-1], b)
    T ← matrix(m + 1, k + m + 1, 0)
    for i ← 0 to m - 1 do
        for j ← 0 to k - 1 do
            T[i][j] ← A[i][j]
        T[i][k + i] ← 1
        T[i][k + m] ← b[i]
    for j ← 0 to k - 1 do
        T[m][j] ← -c[j]
    while true do
        p ← 0
        for j ← 1 to k + m - 1 do
            if T[m][j] < T[m][p] then p ← j
        if T[m][p] ≥ 0 then return T[m][k + m]
        r ← -1
        for i ← 0 to m - 1 do
            if T[i][p] > 0 and (r = -1 or T[i][k + m] / T[i][p] < T[r][k + m] / T[r][p]) then r ← i
        if r = -1 then return ∞
        Pivot(T, r, p)

ALGORITHM Pivot(T, r, p)
    piv ← T[r][p]
    for j ← 0 to length(T[r]) - 1 do
        T[r][j] ← T[r][j] / piv
    for i ← 0 to length(T) - 1 do
        if i ≠ r then
            f ← T[i][p]
            for j ← 0 to length(T[r]) - 1 do
                T[i][j] ← T[i][j] - f * T[r][j]`,
      js: `function Simplex(c, A, b) {
  const k = c.length, m = A.length, W = k + m + 1, EPS = 1e-9;
  const T = A.map((row, i) => { const t = Array(W).fill(0); row.forEach((a, j) => (t[j] = a)); t[k + i] = 1; t[W - 1] = b[i]; return t; });
  const z = Array(W).fill(0); c.forEach((cj, j) => (z[j] = -cj)); T.push(z);
  for (;;) {
    let p = 0;
    for (let j = 1; j < W - 1; j++) if (T[m][j] < T[m][p]) p = j;
    if (T[m][p] >= -EPS) return T[m][W - 1];
    let r = -1;
    for (let i = 0; i < m; i++) if (T[i][p] > EPS && (r < 0 || T[i][W - 1] / T[i][p] < T[r][W - 1] / T[r][p])) r = i;
    if (r < 0) return Infinity;
    const pv = T[r][p];
    T[r] = T[r].map((x) => x / pv);
    for (let i = 0; i <= m; i++) if (i !== r) { const f = T[i][p]; T[i] = T[i].map((x, j) => x - f * T[r][j]); }
  }
}`,
      python: `def simplex(c, A, b, eps=1e-9):
    k, m = len(c), len(A)
    W = k + m + 1
    T = [list(A[i]) + [1 if j == i else 0 for j in range(m)] + [b[i]] for i in range(m)]
    T.append([-x for x in c] + [0] * (m + 1))
    while True:
        p = min(range(W - 1), key=lambda j: T[m][j])
        if T[m][p] >= -eps:
            return T[m][-1]
        rows = [i for i in range(m) if T[i][p] > eps]
        if not rows:
            return float("inf")
        r = min(rows, key=lambda i: T[i][-1] / T[i][p])
        T[r] = [x / T[r][p] for x in T[r]]
        for i in range(m + 1):
            if i != r:
                f = T[i][p]
                T[i] = [x - f * y for x, y in zip(T[i], T[r])]`,
      explain: "Each pivot moves to an adjacent basic feasible solution (a corner) without lowering z; when the objective row has no negative entry, no adjacent corner is better, and for an LP a local optimum is global. Each pivot costs Θ(m·(k + m)); the number of pivots is typically between m and 3m but exponential in the worst case (Klee–Minty).",
    },
    complexity: "Θ(m(k + m)) per pivot; exponential worst case, fast in practice",
    followUp: "Degenerate pivots can cycle with the most-negative rule — switch to Bland's rule (smallest index) and it provably terminates. Industrial solvers (and interior-point methods like Karmarkar's) solve LPs with millions of variables for airlines and logistics.",
    distractors: ["if T[m][j] > T[m][p] then p ← j", "if T[i][p] ≠ 0 and (r = -1 or T[i][k + m] / T[i][p] < T[r][k + m] / T[r][p]) then r ← i", "if T[m][p] ≤ 0 then return T[m][k + m]"],
    visual: "sims/simplex.html",
    lesson: "lessons/10-iterative-improvement/README.md",
  });
})();
