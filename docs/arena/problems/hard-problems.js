/* Pack G — Hard Problems (level 5, Levitin Ch 11–12)
   Lower bounds, P/NP verification and reductions, backtracking, branch-and-bound,
   approximation algorithms and numerical root finding.
   Instance sizes are deliberately tiny so exponential algorithms grade fast.
   Validate with:  node tools/validate-problems.mjs hard-problems.js */

/* ---------- shared helpers for oracles / verifiers (plain JS, not shown to learners) ---------- */
var PackG = (function () {
  const litTrue = (lit, T) => (lit > 0 ? !!T[lit - 1] : !T[-lit - 1]);
  const satisfies = (F, T) => F.every((cl) => cl.some((l) => litTrue(l, T)));
  const satSolve = (n, F) => {
    for (let mask = 0; mask < 1 << n; mask++) {
      const T = Array.from({ length: n }, (_, k) => ((mask >> k) & 1) === 1);
      if (satisfies(F, T)) return T;
    }
    return [];
  };
  const randomCnf = (r, n, m, maxLen) => {
    const F = [];
    for (let c = 0; c < m; c++) {
      const len = r.int(1, maxLen);
      const cl = [];
      for (let k = 0; k < len; k++) { const v = r.int(1, n); cl.push(r() < 0.5 ? v : -v); }
      F.push(cl);
    }
    return F;
  };
  // subset-sum reachability (non-negative integers)
  const canReach = (X, K) => {
    if (K < 0) return false;
    let reach = new Set([0]);
    for (const x of X) { const nx = new Set(reach); for (const s of reach) if (s + x <= K) nx.add(s + x); reach = nx; }
    return reach.has(K);
  };
  const canPartition = (Y) => { const s = Y.reduce((a, b) => a + b, 0); return s % 2 === 0 && canReach(Y, s / 2); };
  const randomGraph = (r, n, p) => {
    const G = Array.from({ length: n }, () => []);
    for (let u = 0; u < n; u++) for (let v = u + 1; v < n; v++) if (r() < p) { G[u].push(v); G[v].push(u); }
    return G;
  };
  const edgesOf = (G) => { const E = []; G.forEach((ws, u) => ws.forEach((v) => { if (u < v) E.push([u, v]); })); return E; };
  // Horner evaluation, coefficients highest degree first
  const horner = (P, x) => P.reduce((acc, c) => acc * x + c, 0);
  // symmetric distance matrix from random points (distinct real distances, rounded to 2 decimals)
  const randomDist = (r, n) => {
    const pts = Array.from({ length: n }, () => [r.int(0, 100), r.int(0, 100)]);
    return pts.map((p) => pts.map((q) => Math.round(Math.hypot(p[0] - q[0], p[1] - q[1]) * 100) / 100));
  };
  const tourLen = (D, t) => { let s = 0; for (let k = 0; k + 1 < t.length; k++) s += D[t[k]][t[k + 1]]; return s; };
  return { litTrue, satisfies, satSolve, randomCnf, canReach, canPartition, randomGraph, edgesOf, horner, randomDist, tourLen };
})();

/* ======================================================================
   Chapter 11 — Limitations of Algorithm Power
   ====================================================================== */

ForgeProblems.add({
  id: "sat-verify",
  title: "Verify a Conjunctive Normal Form (CNF) Certificate",
  level: 5, chapter: 11, difficulty: 1,
  topics: ["NP", "satisfiability", "verification", "Boolean logic"],
  strategy: "Polynomial-time verification",
  source: "Levitin §11.3 (CNF-SAT example)",
  summary: "Check in linear time whether a given true/false assignment satisfies a formula in Conjunctive Normal Form (CNF).",
  statement: `
<p>The class <b>Nondeterministic Polynomial time (NP)</b> is about problems whose proposed answers — <i>certificates</i> — can be
<b>checked</b> quickly, even when nobody knows how to <i>find</i> them quickly (Levitin §11.3). The first problem proved
NP-complete was <b>CNF satisfiability (CNF-SAT)</b>. Here you write its fast checker.</p>
<p>A formula in <b>Conjunctive Normal Form (CNF)</b> is an AND of <i>clauses</i>; each clause is an OR of <i>literals</i>.
Variables are numbered <code>1..n</code>. A formula <code>F</code> is a list of clauses; each clause is a list of non-zero integers:
<code>k</code> means x<sub>k</sub> and <code>-k</code> means ¬x<sub>k</sub>. The assignment <code>T</code> is a list of
<code>n</code> booleans with <b><code>T[k − 1]</code> = the value of x<sub>k</sub></b>.</p>
<pre>F = [[1, -2, -3], [1, 2], [-2, -4, 5], [-4, -5]]
    means (x1 ∨ ¬x2 ∨ ¬x3) ∧ (x1 ∨ x2) ∧ (¬x2 ∨ ¬x4 ∨ x5) ∧ (¬x4 ∨ ¬x5)</pre>
<p>Return <code>true</code> if <b>every</b> clause contains at least one literal that is true under <code>T</code>, else <code>false</code>.
An empty formula <code>[]</code> is true (nothing to satisfy); an empty clause <code>[]</code> can never be satisfied.</p>
<p><b>Efficiency:</b> your checker must run in time linear in the size of the formula — that is what puts CNF-SAT in NP.</p>`,
  entry: "SatVerify",
  params: ["F", "T"],
  tests: [
    { args: [[[1, -2, -3], [1, 2], [-2, -4, 5], [-4, -5]], [true, false, false, true, false]], expect: true, explain: "x1 = true satisfies clauses 1–2, ¬x2 clause 3, ¬x5 clause 4." },
    { args: [[[1, -2, -3], [1, 2], [-2, -4, 5], [-4, -5]], [false, false, true, false, false]], expect: false, explain: "Clause (x1 ∨ x2) has both literals false." },
    { args: [[[-1], [-2]], [false, false]], expect: true, explain: "Negative literals are true when the variable is FALSE." },
    { args: [[], [true]], expect: true, name: "Empty formula", explain: "No clauses → nothing can fail." },
    { args: [[[1, 2], []], [true, true]], expect: false, name: "Empty clause", explain: "An empty clause has no literal that could be true." },
    { args: [[[3]], [false, false, true]], expect: true, name: "Last variable", explain: "x3 lives at T[2]." },
    { args: [[[2], [-1]], [false, true]], expect: true },
    { args: [[[1], [-1]], [true]], expect: false, name: "x and not x", explain: "No assignment satisfies both x1 and ¬x1." },
    { args: [[[-3, 1]], [false, false, true]], expect: false },
  ],
  random: {
    count: 30,
    gen: (r, i) => {
      const n = r.int(1, 6);
      const F = PackG.randomCnf(r, n, r.int(1, 6), 3);
      const T = Array.from({ length: n }, () => r() < 0.5);
      return [F, T];
    },
  },
  reference: (F, T) => PackG.satisfies(F, T),
  growth: {
    metric: "steps", sizes: [16, 32, 64, 128, 256],
    gen: (r, m) => {
      const n = 8, T = Array.from({ length: n }, () => r() < 0.5);
      const F = [];
      for (let c = 0; c < m; c++) {
        const cl = [];
        for (let k = 0; k < 3; k++) { const v = r.int(1, n); cl.push(r() < 0.5 ? v : -v); }
        const v = r.int(1, n); cl.push(T[v - 1] ? v : -v); // guarantee the clause is satisfied → full scan
        F.push(cl);
      }
      return [F, T];
    },
    expect: "n",
  },
  mutants: [
    { fn: (F, T) => F.length === 0 || F.some((cl) => cl.some((l) => PackG.litTrue(l, T))), hint: "You return true as soon as ONE clause is satisfied. CNF is an AND of clauses: you may only answer true after every clause has passed; one failing clause is enough to answer false." },
    { fn: (F, T) => F.every((cl) => cl.some((l) => !!T[Math.abs(l) - 1])), hint: "Your checker ignores the minus sign. A literal −k is true exactly when x_k is FALSE — test the sign of the literal before reading T." },
    { fn: (F, T) => F.every((cl) => cl.some((l) => (l > 0 ? !!T[l] : !T[-l]))), hint: "Check your indexing: variables are numbered from 1, but T starts at T[0]. The value of x_k is T[k − 1]." },
  ],
  hints: [
    "A CNF formula is true when every clause is true, and a clause is true when at least one of its literals is. Which of these is an 'all' test and which is an 'any' test?",
    "Loop over the clauses. For each clause, set a flag satisfied ← false and scan its literals; if a literal is true, set the flag. If the flag is still false after the scan, you can return false right away.",
    "For a literal lit: v ← T[abs(lit) − 1]; the literal is true when (lit > 0 and v) or (lit < 0 and not v).",
  ],
  starter: {
    pseudo: `ALGORITHM SatVerify(F, T)
    // F: list of clauses (lists of ±k); T[k − 1] = value of variable x_k
    // Output: true iff every clause has a true literal
    for each clause in F do
        ...
    return true`,
    js: `function SatVerify(F, T) {
  // return true iff every clause contains a literal that is true under T
}`,
  },
  solution: {
    pseudo: `ALGORITHM SatVerify(F, T)
    for each clause in F do
        satisfied ← false
        for each lit in clause do
            v ← T[abs(lit) - 1]
            if (lit > 0 and v) or (lit < 0 and not v) then
                satisfied ← true
        if not satisfied then
            return false
    return true`,
    js: `function SatVerify(F, T) {
  for (const clause of F) {
    let satisfied = false;
    for (const lit of clause) {
      const v = T[Math.abs(lit) - 1];
      if ((lit > 0 && v) || (lit < 0 && !v)) satisfied = true;
    }
    if (!satisfied) return false;
  }
  return true;
}`,
    python: `def sat_verify(F, T):
    for clause in F:
        if not any((T[abs(l) - 1] if l > 0 else not T[abs(l) - 1]) for l in clause):
            return False
    return True`,
    explain: "Every literal is looked at at most once, so the check costs Θ(L) where L is the total number of literals — linear in the input size. A polynomial-time checker for a guessed certificate is exactly what 'CNF-SAT ∈ NP' means; finding the certificate is the hard part.",
  },
  complexity: "Θ(L) for L literals in total",
  followUp: "A real satisfiability (SAT) solver — Davis–Putnam–Logemann–Loveland (DPLL) search plus Conflict-Driven Clause Learning (CDCL) — runs this check incrementally with 'watched literals' so each assignment step touches only a few clauses — that trick is why modern solvers handle millions of clauses in hardware verification and package managers.",
  distractors: ["if lit > 0 or T[lit - 1] then", "if satisfied then return true", "v ← T[lit]"],
  visual: "sims/p-np.html",
  lesson: "lessons/11-limitations/README.md",
});

ForgeProblems.add({
  id: "vertex-cover-verify",
  title: "Verify a Vertex Cover",
  level: 5, chapter: 11, difficulty: 1,
  topics: ["NP", "vertex cover", "graphs", "verification"],
  strategy: "Polynomial-time verification",
  source: "VERTEX-COVER is in NP · Levitin §11.3",
  summary: "Given edges, a budget K and a proposed set W, check that W has at most K vertices and touches every edge.",
  statement: `
<p>VERTEX-COVER asks: does graph G have a set W of <b>at most K</b> vertices such that every edge has at least one endpoint in W?
Finding such a W is Nondeterministic Polynomial (NP)-complete, but <b>checking</b> a proposed W is easy — that is why VERTEX-COVER is in NP
(Levitin §11.3). Think of W as "guards at intersections so that every street is watched".</p>
<p>Input: <code>E</code>, a list of edges <code>[u, v]</code> (vertices are integers ≥ 0); the budget <code>K</code>; and the
certificate <code>W</code>, a list of <b>distinct</b> vertices.</p>
<p>Return <code>true</code> if <code>length(W) ≤ K</code> <b>and</b> every edge <code>[u, v]</code> has <code>u</code> in W or
<code>v</code> in W; otherwise <code>false</code>.</p>`,
  entry: "VerifyCover",
  params: ["E", "K", "W"],
  tests: [
    { args: [[[0, 1], [1, 2], [2, 3]], 2, [1, 2]], expect: true, explain: "Path 0–1–2–3: vertices 1 and 2 touch all three edges." },
    { args: [[[0, 1], [1, 2], [2, 3]], 2, [0, 3]], expect: false, explain: "Edge [1, 2] has neither endpoint in W." },
    { args: [[[0, 1], [1, 2], [2, 0]], 1, [0, 1]], expect: false, explain: "W covers the triangle, but it uses 2 vertices and the budget is K = 1." },
    { args: [[[0, 1], [0, 2], [0, 3]], 1, [0]], expect: true, name: "Star", explain: "The center of a star covers every edge." },
    { args: [[], 0, []], expect: true, name: "No edges", explain: "Nothing to cover; the empty set is within budget." },
    { args: [[[0, 1], [1, 2]], 2, [1]], expect: true, name: "Under budget", explain: "Using fewer than K vertices is fine: the condition is ≤ K." },
    { args: [[[0, 1], [1, 2]], 3, [0, 2]], expect: true, explain: "Each edge touches W at one end — one endpoint is enough." },
    { args: [[[3, 4]], 1, [4]], expect: true },
  ],
  random: {
    count: 30,
    gen: (r, i) => {
      const n = r.int(2, 7);
      const E = PackG.edgesOf(PackG.randomGraph(r, n, 0.45));
      const W = r.shuffle([...Array(n).keys()]).slice(0, r.int(0, n));
      const K = Math.max(0, W.length + r.int(-1, 1));
      return [E, K, W];
    },
  },
  reference: (E, K, W) => W.length <= K && E.every(([u, v]) => W.includes(u) || W.includes(v)),
  mutants: [
    { fn: (E, K, W) => E.every(([u, v]) => W.includes(u) || W.includes(v)), hint: "Your checker never looks at K. A certificate for VERTEX-COVER must also respect the budget: length(W) ≤ K." },
    { fn: (E, K, W) => W.length <= K && E.every(([u, v]) => W.includes(u) && W.includes(v)), hint: "You demand BOTH endpoints of each edge in W. An edge is covered as soon as either end is in W — use or, not and." },
    { fn: (E, K, W) => W.length < K && E.every(([u, v]) => W.includes(u) || W.includes(v)), hint: "Look at the size test: a cover with exactly K vertices is allowed (at most K means ≤, not <)." },
  ],
  hints: [
    "There are exactly two things to check. What are they, and which one is about the size of W?",
    "First compare length(W) with K. Then loop over the edges and look for an edge that is NOT covered — one such edge is enough to answer false.",
    "Inside the loop: if not (u in W) and not (v in W) then return false. (For big graphs, first mark W in a boolean array so each test is O(1).)",
  ],
  starter: {
    pseudo: `ALGORITHM VerifyCover(E, K, W)
    // E: list of edges [u, v]; W: proposed cover (distinct vertices)
    if ... then
        return false
    for (u, v) in E do
        ...
    return true`,
    js: `function VerifyCover(E, K, W) {
  // true iff |W| ≤ K and every edge has an endpoint in W
}`,
  },
  solution: {
    pseudo: `ALGORITHM VerifyCover(E, K, W)
    if length(W) > K then
        return false
    for (u, v) in E do
        if not (u in W) and not (v in W) then
            return false
    return true`,
    js: `function VerifyCover(E, K, W) {
  if (W.length > K) return false;
  const inW = new Set(W);
  for (const [u, v] of E) if (!inW.has(u) && !inW.has(v)) return false;
  return true;
}`,
    python: `def verify_cover(E, K, W):
    if len(W) > K:
        return False
    S = set(W)
    return all(u in S or v in S for u, v in E)`,
    explain: "With a hash set (or boolean array) marking W, each edge is checked in O(1): Θ(|E| + |W|) total — polynomial, so VERTEX-COVER ∈ NP. With the plain 'u in W' list scan it is O(|E|·|W|), still polynomial.",
  },
  complexity: "Θ(|E| + |W|) with a set",
  followUp: "Finding a minimum cover is NP-hard, but taking BOTH endpoints of any uncovered edge, repeatedly, gives a cover at most twice the optimum — a classic 2-approximation (Levitin Exercise 12.3.9).",
  distractors: ["if length(W) ≥ K then", "if not (u in W) or not (v in W) then"],
  visual: "sims/p-np.html",
  lesson: "lessons/11-limitations/README.md",
});

ForgeProblems.add({
  id: "clique-verify",
  title: "Verify a Clique",
  level: 5, chapter: 11, difficulty: 1,
  topics: ["NP", "clique", "graphs", "verification"],
  strategy: "Polynomial-time verification",
  source: "CLIQUE is in NP · Levitin §11.3",
  summary: "Check that a proposed set of at least K vertices is pairwise connected.",
  statement: `
<p>A <b>clique</b> is a set of vertices in which <b>every pair</b> is joined by an edge — a group of people who all know each other.
CLIQUE asks whether a graph has a clique of <b>at least K</b> vertices. It is Nondeterministic Polynomial (NP)-complete, yet a proposed clique is easy to check.</p>
<p>Input: an undirected graph as adjacency lists — <code>G[v]</code> is the list of neighbors of vertex <code>v</code> (0-based;
every edge appears in both lists) — the size target <code>K</code>, and the certificate <code>C</code>, a list of <b>distinct</b> vertices.</p>
<p>Return <code>true</code> if <code>length(C) ≥ K</code> and every two different vertices of <code>C</code> are adjacent; otherwise <code>false</code>.</p>`,
  entry: "VerifyClique",
  params: ["G", "K", "C"],
  tests: [
    { args: [[[1, 2, 3], [0, 2], [0, 1, 3], [0, 2]], 3, [0, 2, 3]], expect: true, explain: "0–2, 0–3 and 2–3 are all edges." },
    { args: [[[1], [0, 2], [1]], 3, [0, 1, 2]], expect: false, explain: "Path 0–1–2: consecutive pairs are adjacent but 0 and 2 are not." },
    { args: [[[1, 2], [0, 2], [0, 1]], 4, [0, 1, 2]], expect: false, explain: "A triangle is a clique, but K = 4 asks for at least 4 vertices." },
    { args: [[[1, 2], [0, 2], [0, 1]], 2, [0, 1, 2]], expect: true, name: "Bigger than K", explain: "At least K: a 3-clique certifies K = 2." },
    { args: [[[], []], 1, [1]], expect: true, name: "Single vertex", explain: "One vertex is always a clique (no pairs to check)." },
    { args: [[[1, 2, 3], [0, 2, 3], [0, 1, 3], [0, 1, 2]], 4, [3, 1, 0, 2]], expect: true, name: "K4", explain: "All 6 pairs are edges; order of C doesn't matter." },
    { args: [[[1, 3], [0, 2], [1, 3], [0, 2]], 3, [0, 1, 3]], expect: false, explain: "4-cycle: 1 and 3 are not adjacent." },
    { args: [[[1], [0]], 0, []], expect: true },
  ],
  random: {
    count: 30,
    gen: (r, i) => {
      const n = r.int(2, 7);
      const G = PackG.randomGraph(r, n, 0.6);
      const C = r.shuffle([...Array(n).keys()]).slice(0, r.int(1, Math.min(n, 5)));
      const K = Math.max(0, C.length + r.int(-1, 1));
      return [G, K, C];
    },
  },
  reference: (G, K, C) => C.length >= K && C.every((u, i) => C.every((v, j) => i === j || G[u].includes(v))),
  mutants: [
    { fn: (G, K, C) => C.length >= K && C.every((u, i) => i === 0 || G[C[i - 1]].includes(u)), hint: "You only check neighbors in the list (C[i−1], C[i]). A clique needs EVERY pair adjacent — use two nested loops over i < j." },
    { fn: (G, K, C) => C.every((u, i) => C.every((v, j) => i === j || G[u].includes(v))), hint: "Your checker never compares length(C) with K. CLIQUE asks for a clique of at least K vertices." },
    { fn: (G, K, C) => C.length <= K && C.every((u, i) => C.every((v, j) => i === j || G[u].includes(v))), hint: "Look at the direction of the size test: a clique is a good certificate when it has AT LEAST K vertices (≥ K)." },
  ],
  hints: [
    "Two conditions again: one about the size of C, one about the edges inside C. How many pairs of vertices does a set of k vertices have?",
    "Check length(C) ≥ K first. Then use two nested loops, i from 0 to k − 2 and j from i + 1 to k − 1, and look for a pair that is NOT an edge.",
    "Inside the loops: if not (C[j] in G[C[i]]) then return false. After all pairs pass, return true.",
  ],
  starter: {
    pseudo: `ALGORITHM VerifyClique(G, K, C[0..k-1])
    // G[v] = neighbors of v; C = proposed clique (distinct vertices)
    if k < K then
        return false
    ...
    return true`,
    js: `function VerifyClique(G, K, C) {
  // true iff |C| ≥ K and every pair in C is adjacent
}`,
  },
  solution: {
    pseudo: `ALGORITHM VerifyClique(G, K, C[0..k-1])
    if k < K then
        return false
    for i ← 0 to k - 2 do
        for j ← i + 1 to k - 1 do
            if not (C[j] in G[C[i]]) then
                return false
    return true`,
    js: `function VerifyClique(G, K, C) {
  if (C.length < K) return false;
  for (let i = 0; i < C.length; i++)
    for (let j = i + 1; j < C.length; j++)
      if (!G[C[i]].includes(C[j])) return false;
  return true;
}`,
    python: `def verify_clique(G, K, C):
    if len(C) < K:
        return False
    return all(C[j] in G[C[i]] for i in range(len(C)) for j in range(i + 1, len(C)))`,
    explain: "There are k(k − 1)/2 pairs; with an adjacency matrix each test is O(1), so the check is Θ(k²) — polynomial. (With adjacency lists each test costs up to deg(v), still polynomial.) That is the 'verify' half of CLIQUE ∈ NP.",
  },
  complexity: "Θ(k²) pair tests",
  followUp: "Reduction twist: G has a vertex cover of size K exactly when its complement graph has a clique of size n − K — so a CLIQUE solver is also a VERTEX-COVER solver.",
  distractors: ["for j ← 0 to k - 1 do", "if k > K then"],
  visual: "sims/p-np.html",
  lesson: "lessons/11-limitations/README.md",
});

ForgeProblems.add({
  id: "sort-lower-bound",
  title: "Decision-Tree Lower Bound for Sorting",
  level: 5, chapter: 11, difficulty: 1,
  topics: ["lower bounds", "decision trees", "sorting", "logarithms"],
  strategy: "Information-theoretic argument",
  source: "Levitin §11.2",
  summary: "Compute ⌈log₂ n!⌉ — the fewest comparisons any comparison sort needs in the worst case.",
  statement: `
<p>Any comparison-based sorting algorithm can be drawn as a binary <b>decision tree</b>: each internal node is a comparison
and each leaf is one possible output order. With <code>n</code> distinct keys there are <code>n!</code> possible orders, so the tree
needs at least <code>n!</code> leaves, and a binary tree with that many leaves has height at least <code>⌈log₂ n!⌉</code>
(Levitin §11.2). No comparison sort can beat that many comparisons in the worst case.</p>
<p>Write <code>SortLowerBound(n)</code> that returns the whole number <b>⌈log₂ n!⌉</b> for <code>1 ≤ n ≤ 20</code>.</p>
<p>Tip: floating-point logarithms are risky right at integers. A safe way is to find the smallest <code>h</code> with
<code>2<sup>h</sup> ≥ n!</code> — the number of levels a tree needs to hold n! leaves.</p>`,
  entry: "SortLowerBound",
  params: ["n"],
  tests: [
    { args: [3], expect: 3, explain: "3! = 6 orders; 2² = 4 < 6 ≤ 8 = 2³, so 3 comparisons are needed in the worst case." },
    { args: [4], expect: 5, explain: "4! = 24 and 2⁵ = 32 is the first power of two that reaches 24." },
    { args: [1], expect: 0, explain: "One key: already sorted, zero comparisons." },
    { args: [2], expect: 1, explain: "2! = 2 = 2¹: one comparison." },
    { args: [5], expect: 7, explain: "120 ≤ 128 = 2⁷. (Five keys can in fact be sorted with 7 comparisons.)" },
    { args: [10], expect: 22 },
    { args: [12], expect: 29 },
    { args: [20], expect: 62 },
  ],
  random: { count: 12, gen: (r, i) => [r.int(1, 20)] },
  reference: (n) => { let f = 1n; for (let k = 2n; k <= BigInt(n); k++) f *= k; let h = 0, p = 1n; while (p < f) { p *= 2n; h++; } return h; },
  mutants: [
    { fn: (n) => { let s = 0; for (let k = 2; k <= n; k++) s += Math.log2(k); return Math.floor(s + 1e-9); }, hint: "You rounded log₂ n! DOWN. A tree of height h holds at most 2^h leaves, so you need the smallest h with 2^h ≥ n! — that is the ceiling ⌈log₂ n!⌉." },
    { fn: (n) => Math.ceil(n * Math.log2(n) - 1e-9), hint: "n log₂ n is the asymptotic estimate (Stirling), not the exact bound. Compute log₂ of n! itself: log₂ n! = log₂ 2 + log₂ 3 + … + log₂ n." },
    { fn: (n) => n - 1, hint: "n − 1 comparisons is the lower bound for finding the MAXIMUM, not for sorting. Sorting must distinguish all n! orders." },
  ],
  hints: [
    "A binary decision tree of height h has at most 2^h leaves. How many leaves must a sorting tree for n keys have?",
    "Compute f = n! with a loop, then count how many times you must double p (starting from 1) until p ≥ f.",
    "p ← 1; h ← 0; while p < f do p ← 2p; h ← h + 1. Return h.",
  ],
  starter: {
    pseudo: `ALGORITHM SortLowerBound(n)
    // Output: ⌈log2 n!⌉ for 1 ≤ n ≤ 20
    f ← 1
    for k ← 2 to n do
        ...
    ...`,
    js: `function SortLowerBound(n) {
  // return ceil(log2(n!))
}`,
  },
  solution: {
    pseudo: `ALGORITHM SortLowerBound(n)
    f ← 1
    for k ← 2 to n do
        f ← f * k
    h ← 0
    p ← 1
    while p < f do
        p ← 2 * p
        h ← h + 1
    return h`,
    js: `function SortLowerBound(n) {
  let f = 1;
  for (let k = 2; k <= n; k++) f *= k;
  let h = 0, p = 1;
  while (p < f) { p *= 2; h++; }
  return h;
}`,
    python: `def sort_lower_bound(n):
    f = 1
    for k in range(2, n + 1):
        f *= k
    h, p = 0, 1
    while p < f:
        p, h = 2 * p, h + 1
    return h`,
    explain: "The loop finds the least h with 2^h ≥ n!, i.e. ⌈log₂ n!⌉. By Stirling, log₂ n! ≈ n log₂ n − 1.44n, so every comparison sort needs Ω(n log n) comparisons in the worst case — and merge sort's n⌈log₂ n⌉ − n + 1 shows the bound is tight.",
  },
  complexity: "Θ(n log n) doubling steps (the answer itself is ≈ n log₂ n)",
  followUp: "Compare with merge sort's worst case n⌈log₂ n⌉ − 2^⌈log₂ n⌉ + 1: they agree for n ≤ 4 and stay close after. The same counting argument gives ⌈log₂(n + 1)⌉ for searching a sorted array (n + 1 outcomes).",
  distractors: ["while p ≤ f do", "f ← f + k"],
  visual: "sims/decision-trees.html",
  lesson: "lessons/11-limitations/README.md",
});

ForgeProblems.add({
  id: "sat-brute-force",
  title: "CNF-SAT by Trying Every Assignment",
  level: 5, chapter: 11, difficulty: 2,
  topics: ["NP-complete", "satisfiability", "exhaustive search", "bit masks"],
  strategy: "Exhaustive search (guess + verify)",
  source: "Levitin §11.3 (truth-assignment table)",
  summary: "Solve Conjunctive Normal Form satisfiability (CNF-SAT) by checking all 2ⁿ assignments, or report that none exists.",
  statement: `
<p>A <i>nondeterministic</i> algorithm "guesses" a certificate and verifies it (Levitin §11.3). A real computer can't guess,
so the honest deterministic version tries <b>every</b> guess: all <code>2<sup>n</sup></code> true/false assignments.
That is exponential — and for Conjunctive Normal Form satisfiability (CNF-SAT) nobody knows how to do fundamentally better in the worst case.</p>
<p>Input: <code>n</code> (1 ≤ n ≤ 8) variables and a formula <code>F</code> in the same encoding as <b>Verify a Conjunctive Normal Form (CNF) Certificate</b>:
a list of clauses, each a list of literals <code>k</code> (x<sub>k</sub>) or <code>-k</code> (¬x<sub>k</sub>).</p>
<p>Return a list <code>T</code> of <code>n</code> booleans (<code>T[k − 1]</code> = value of x<sub>k</sub>) that makes every clause
true, or the empty list <code>[]</code> if the formula is <b>unsatisfiable</b>. Any satisfying assignment is accepted.</p>
<p>Hint for enumerating: the numbers <code>0 .. 2<sup>n</sup> − 1</code> written in binary are exactly all the n-bit patterns.</p>`,
  entry: "SatSolve",
  params: ["n", "F"],
  tests: [
    { args: [3, [[1, 2], [-1, 3], [-2, -3]]], expect: [true, false, true], explain: "One answer: x1 = true, x2 = false, x3 = true (others may exist)." },
    { args: [1, [[1], [-1]]], expect: [], explain: "x1 and ¬x1 can't both be true → unsatisfiable → []." },
    { args: [3, [[1], [2], [3]]], expect: [true, true, true], explain: "Only the all-true assignment works — make sure you try the LAST pattern 2ⁿ − 1." },
    { args: [2, [[-1], [-2]]], expect: [false, false], name: "Only all-false", explain: "Only pattern 0 works — make sure you try the FIRST pattern too." },
    { args: [2, [[1, 2], [1, -2], [-1, 2], [-1, -2]]], expect: [], name: "Every pattern blocked", explain: "Each clause rules out one of the four assignments." },
    { args: [5, [[1, -2, -3], [1, 2], [-2, -4, 5], [-4, -5]]], expect: [true, false, false, false, false], name: "Worked-example formula" },
    { args: [4, []], expect: [false, false, false, false], name: "Empty formula", explain: "No clauses: any assignment works." },
    { args: [6, [[1, 2], [3, 4], [5, 6], [-1, -3], [-1, -5], [-3, -5], [-2, -4], [-2, -6], [-4, -6]]], expect: [], name: "3 pigeons, 2 holes", explain: "x(2p−1)/x(2p) = pigeon p in hole 1/2. Three pigeons can't share two holes one-per-hole → unsatisfiable." },
  ],
  random: {
    count: 30,
    gen: (r, i) => { const n = r.int(1, 8); return [n, PackG.randomCnf(r, n, r.int(1, 3 + n), 3)]; },
  },
  reference: (n, F) => PackG.satSolve(n, F),
  verify: (got, [n, F]) => {
    const sol = PackG.satSolve(n, F);
    if (!Array.isArray(got)) return "Return a list of n true/false values, or [] if there is no solution.";
    if (got.length === 0) return sol.length === 0 ? true : `This formula IS satisfiable (for example ${JSON.stringify(sol)}), so [] is wrong.`;
    if (sol.length === 0) return "This formula is unsatisfiable — the answer must be [].";
    if (got.length !== n) return `Your assignment has ${got.length} values; it needs exactly n = ${n}.`;
    const T = got.map((b) => b === true || b === 1);
    const bad = F.findIndex((cl) => !cl.some((l) => PackG.litTrue(l, T)));
    return bad < 0 ? true : `Clause ${bad + 1} ${JSON.stringify(F[bad])} is false under your assignment.`;
  },
  mutants: [
    { fn: (n, F) => { for (let mask = 0; mask < (1 << n) - 1; mask++) { const T = Array.from({ length: n }, (_, k) => ((mask >> k) & 1) === 1); if (PackG.satisfies(F, T)) return T; } return []; }, hint: "The all-true assignment never gets tried. The patterns run from 0 to 2ⁿ − 1 INCLUSIVE — check the upper bound of your loop." },
    { fn: (n, F) => { for (let mask = 1; mask < 1 << n; mask++) { const T = Array.from({ length: n }, (_, k) => ((mask >> k) & 1) === 1); if (PackG.satisfies(F, T)) return T; } return []; }, hint: "The all-false assignment (pattern 0) never gets tried. Start the loop at 0." },
    { fn: (n, F) => { for (let mask = 0; mask < 1 << n; mask++) { const T = Array.from({ length: n }, (_, k) => ((mask >> k) & 1) === 1); if (F.length === 0 || F.some((cl) => cl.some((l) => PackG.litTrue(l, T)))) return T; } return []; }, hint: "Your check accepts an assignment when SOME clause is true. Every clause must be true (AND of ORs) — reuse your SatVerify logic." },
  ],
  hints: [
    "How many different assignments of n variables are there? If you could list them all, what would you do with each one?",
    "Loop mask from 0 to 2ⁿ − 1. Turn mask into T by reading its bits: T[k] is true when bit k of mask is 1. Then run the verifier from the previous problem; return T on the first success, [] after the loop.",
    "To read the bits: m ← mask; for k ← 0 to n − 1 do T[k] ← (m mod 2 = 1); m ← m div 2.",
  ],
  starter: {
    pseudo: `ALGORITHM SatSolve(n, F)
    // Output: a satisfying assignment T[0..n-1] of true/false, or [] if none exists
    for mask ← 0 to ... do
        T ← array(n, false)
        ...
    return []`,
    js: `function SatSolve(n, F) {
  // try all 2^n assignments; return one that satisfies F, or []
}`,
  },
  solution: {
    pseudo: `ALGORITHM SatSolve(n, F)
    for mask ← 0 to 2^n - 1 do
        T ← array(n, false)
        m ← mask
        for k ← 0 to n - 1 do
            T[k] ← (m mod 2 = 1)
            m ← m div 2
        if Satisfies(F, T) then
            return T
    return []

ALGORITHM Satisfies(F, T)
    for each clause in F do
        ok ← false
        for each lit in clause do
            v ← T[abs(lit) - 1]
            if (lit > 0 and v) or (lit < 0 and not v) then
                ok ← true
        if not ok then
            return false
    return true`,
    js: `function SatSolve(n, F) {
  const ok = (T) => F.every(cl => cl.some(l => l > 0 ? T[l - 1] : !T[-l - 1]));
  for (let mask = 0; mask < (1 << n); mask++) {
    const T = Array.from({ length: n }, (_, k) => ((mask >> k) & 1) === 1);
    if (ok(T)) return T;
  }
  return [];
}`,
    python: `from itertools import product
def sat_solve(n, F):
    for T in product([False, True], repeat=n):
        if all(any(T[abs(l) - 1] == (l > 0) for l in cl) for cl in F):
            return list(T)
    return []`,
    explain: "2ⁿ candidate assignments, each verified in Θ(L) time for L literals: O(2ⁿ · L) in the worst case (unsatisfiable formulas must try them all). The verify step is polynomial; the exponential factor comes entirely from not knowing which certificate to check.",
  },
  complexity: "O(2ⁿ · L)",
  followUp: "Backtracking with unit propagation (the Davis–Putnam–Logemann–Loveland (DPLL) algorithm) prunes whole blocks of assignments as soon as one clause is falsified — the same idea as n-Queens pruning, and the core of every industrial SAT solver.",
  distractors: ["for mask ← 1 to 2^n - 1 do", "for mask ← 0 to 2^n - 2 do", "m ← m mod 2"],
  visual: "sims/p-np.html",
  lesson: "lessons/11-limitations/README.md",
});

ForgeProblems.add({
  id: "subset-sum-to-partition-reduction",
  title: "Reduce SUBSET-SUM to PARTITION",
  level: 5, chapter: 11, difficulty: 2,
  topics: ["reductions", "NP-complete", "subset sum", "partition"],
  strategy: "Polynomial-time reduction",
  source: "Reduction practice (SUBSET-SUM ⇄ SET-PARTITION) · Levitin §11.3",
  summary: "Transform a SUBSET-SUM instance (X, K) into a PARTITION instance with the same yes/no answer.",
  statement: `
<p>A <b>reduction</b> turns every instance of problem A into an instance of problem B with the <b>same yes/no answer</b>, in
polynomial time. If B could be solved fast, so could A — that is how Nondeterministic Polynomial (NP)-completeness spreads from one problem to the next
(Levitin §11.3).</p>
<ul>
<li><b>SUBSET-SUM:</b> given positive integers <code>X</code> and a target <code>K</code>, is there a subset of X summing to exactly K?</li>
<li><b>PARTITION:</b> given non-negative integers <code>Y</code>, can Y be split into two groups with equal sums?</li>
</ul>
<p>Write <code>ToPartition(X, K)</code> that returns a PARTITION instance <code>Y</code> such that
<b>Y can be partitioned ⇔ X has a subset summing to K</b>. Rules: Y must contain <b>every number of X</b> (you transform, you don't
solve) plus at most <b>two</b> extra non-negative integers. Constraints: 1 ≤ K ≤ sum(X).</p>
<p>Your code must <b>not</b> search for the subset — just build Y. The grader checks both directions on every test.</p>`,
  entry: "ToPartition",
  params: ["X", "K"],
  tests: [
    { args: [[3, 5, 6, 7], 15], expect: [3, 5, 6, 7, 9], explain: "S = 21. Adding 9 gives total 30: {3, 5, 7} = 15 = {6, 9}. YES stays YES." },
    { args: [[1, 2, 7], 6], expect: [1, 2, 7, 2], explain: "No subset of {1, 2, 7} sums to 6, and [1, 2, 7, 2] (total 12) has no half of 6. NO stays NO." },
    { args: [[2, 9, 3], 11], expect: [2, 9, 3, 8], explain: "K = 11 is more than half of S = 14 — the extra number must still be non-negative." },
    { args: [[5], 5], expect: [5, 5], name: "K = S" },
    { args: [[1, 1, 1, 1, 4], 4], expect: [1, 1, 1, 1, 4, 0], name: "K = S/2", explain: "The extra number can be 0 (or left out)." },
    { args: [[2, 4, 6], 3], expect: [2, 4, 6, 6], explain: "All even numbers can't reach 3; the new instance must also be a NO." },
    { args: [[8, 3, 3], 2], expect: [8, 3, 3, 10] },
    { args: [[4, 1, 6, 2], 9], expect: [4, 1, 6, 2, 5] },
  ],
  random: {
    count: 30,
    gen: (r, i) => { const X = r.array(r.int(1, 7), 1, 12); const S = X.reduce((a, b) => a + b, 0); return [X, r.int(1, S)]; },
  },
  reference: (X, K) => { const S = X.reduce((a, b) => a + b, 0); return X.concat([Math.abs(S - 2 * K)]); },
  verify: (got, [X, K]) => {
    if (!Array.isArray(got)) return "Return a list of numbers (the PARTITION instance).";
    if (!got.every((y) => Number.isInteger(y) && y >= 0)) return "Every number in a PARTITION instance must be a non-negative integer.";
    const left = got.slice();
    for (const x of X) { const k = left.indexOf(x); if (k < 0) return `Your list lost the number ${x} from X. A reduction transforms the instance — keep every number of X.`; left.splice(k, 1); }
    if (left.length > 2) return `You added ${left.length} extra numbers; one (or two) is enough.`;
    const yesA = PackG.canReach(X, K), yesB = PackG.canPartition(got);
    if (yesA === yesB) return true;
    return yesA ? "X DOES have a subset summing to K, but your list can't be split into two equal halves — a YES instance must map to a YES instance."
      : "X has NO subset summing to K, yet your list CAN be split evenly — a NO instance must map to a NO instance.";
  },
  mutants: [
    { fn: (X, K) => { const S = X.reduce((a, b) => a + b, 0); return X.concat([S - 2 * K]); }, hint: "When K is more than half of the total S, your extra number comes out negative. Think about the two cases K ≤ S/2 and K > S/2 — what single formula covers both?" },
    { fn: (X, K) => { const S = X.reduce((a, b) => a + b, 0); return X.concat([S - K]); }, hint: "With S − K added the new total is 2S − K, so each half must be S − K/2 — that no longer lines up with 'a subset summing to K'. Work out which extra number y makes a half equal to K + y (or S − K)." },
    { fn: (X, K) => X.slice(), hint: "You returned X unchanged. That only works when K happens to be exactly half of sum(X); add one number that shifts the halfway point onto K." },
  ],
  hints: [
    "Let S = sum(X). PARTITION asks for a group summing to half the total. If you add one number y, the new total is S + y. For which y is 'half the total' a sum you can relate to K?",
    "Case K ≤ S/2: add y = S − 2K; then a subset with sum K plus y makes S − K, exactly half of 2S − 2K. Case K ≥ S/2: add y = 2K − S; now the half is K and the side without y is your subset.",
    "Both cases are one formula: append |S − 2K| to a copy of X. That's O(n) work — a polynomial-time reduction.",
  ],
  starter: {
    pseudo: `ALGORITHM ToPartition(X[0..n-1], K)
    // Output: a PARTITION instance Y with the same yes/no answer as SUBSET-SUM(X, K)
    S ← 0
    ...
    return Y`,
    js: `function ToPartition(X, K) {
  // return X plus at most two extra non-negative numbers
}`,
  },
  solution: {
    pseudo: `ALGORITHM ToPartition(X[0..n-1], K)
    S ← 0
    for i ← 0 to n - 1 do
        S ← S + X[i]
    Y ← X[0..n-1]
    append(Y, abs(S - 2 * K))
    return Y`,
    js: `function ToPartition(X, K) {
  const S = X.reduce((a, b) => a + b, 0);
  return X.concat([Math.abs(S - 2 * K)]);
}`,
    python: `def to_partition(X, K):
    return X + [abs(sum(X) - 2 * K)]`,
    explain: "Let y = |S − 2K|. If K ≤ S/2 the new total is 2(S − K) and a half is 'subset K plus y' or its complement; if K > S/2 the total is 2K and the side without y must be a subset summing to K. Both directions hold, and building Y is Θ(n) — so a fast PARTITION solver would give a fast SUBSET-SUM solver.",
  },
  complexity: "Θ(n) to build the new instance",
  followUp: "Now reverse it: reduce PARTITION to SUBSET-SUM (hint: K = total/2 when the total is even). Two-way reductions show the problems are equally hard — and chains like circuit satisfiability (CIRCUIT-SAT) → satisfiability (SAT) → 3-satisfiability (3SAT) → VERTEX-COVER → … prove whole families NP-complete.",
  distractors: ["append(Y, S - 2 * K)", "append(Y, S - K)"],
  visual: "sims/p-np.html",
  lesson: "lessons/11-limitations/README.md",
});

/* ======================================================================
   Chapter 12 — Coping with the Limitations: numerical root finding
   ====================================================================== */

ForgeProblems.add({
  id: "bisection-root",
  title: "Bisection Method",
  level: 5, chapter: 12, difficulty: 1,
  topics: ["numerical algorithms", "root finding", "bisection", "binary search"],
  strategy: "Decrease-by-half on a continuous interval",
  source: "Levitin §12.4 (bisection method)",
  summary: "Approximate a root of a polynomial on [a, b] by repeatedly halving the bracketing interval.",
  statement: `
<p>Most equations can't be solved by a formula, so we <b>approximate</b> their roots. The bisection method is binary search on a
continuous function: if f(a) and f(b) have opposite signs, a root lies between them; look at the midpoint and keep the half
that still has a sign change (Levitin §12.4).</p>
<p>The function is a polynomial given by its coefficients <code>P</code>, <b>highest degree first</b>:
<code>P = [1, 0, -1, -1]</code> means f(x) = x³ − x − 1. (Write a small helper to evaluate it — Horner's rule is perfect.)</p>
<p>Follow Levitin's version exactly so answers match:</p>
<pre>repeat:
    x ← (a + b) / 2
    if x − a &lt; eps: return x
    if f(x) = 0:    return x
    if f(x)·f(a) &lt; 0 then b ← x else a ← x</pre>
<p>Inputs satisfy <code>a &lt; b</code>, <code>f(a)·f(b) &lt; 0</code>, <code>eps &gt; 0</code>. The function may be increasing
<b>or decreasing</b>. Answers are compared with a tolerance of 10⁻⁶.</p>`,
  entry: "Bisection",
  params: ["P", "a", "b", "eps"],
  compare: "float",
  tests: [
    { args: [[1, 0, -1, -1], 0, 2, 0.01], expect: 1.3203125, explain: "x³ − x − 1 on [0, 2]: 8 halvings give 1.3203125, within 0.01 of the root (Levitin's trace)." },
    { args: [[1, 0, -2], 0, 2, 0.000001], expect: 1.4142141342163086, explain: "x² − 2: the root is √2 ≈ 1.41421356." },
    { args: [[-1, 3], 0, 10, 0.001], expect: 2.9998779296875, name: "Decreasing function", explain: "f(x) = −x + 3 has f(a) > 0 > f(b). Use the sign of f(x)·f(a), don't assume f(a) < 0." },
    { args: [[1, -1], 0, 2, 0.1], expect: 1, name: "Exact hit", explain: "The first midpoint is the root x = 1 exactly: f(x) = 0, stop." },
    { args: [[1, 0, 1, -1], 0, 1, 0.01], expect: 0.6796875, explain: "x³ + x − 1 = 0 (Levitin Exercise 12.4.5)." },
    { args: [[1, -4, 3], 2, 5, 0.0001], expect: 3.000030517578125, explain: "x² − 4x + 3 has roots 1 and 3; only 3 is inside [2, 5]." },
  ],
  random: {
    count: 20,
    gen: (r, i) => {
      // polynomial (x − root)·(x² + c) scaled by ±1, bracketed so exactly one root is inside
      const root = r.int(-20, 20) / 4, c = r.int(1, 5), s = r() < 0.5 ? 1 : -1;
      const P = [s, -s * root, s * c, -s * c * root];
      const a = root - r.int(1, 8) / 3, b = root + r.int(1, 8) / 3;
      return [P, a, b, r.pick([0.1, 0.01, 0.001, 0.0001])];
    },
  },
  reference: (P, a, b, eps) => {
    for (let it = 0; it < 200; it++) {
      const x = (a + b) / 2;
      if (x - a < eps) return x;
      const fx = PackG.horner(P, x);
      if (fx === 0) return x;
      if (fx * PackG.horner(P, a) < 0) b = x; else a = x;
    }
    return (a + b) / 2;
  },
  mutants: [
    { fn: (P, a, b, eps) => { for (let it = 0; it < 200; it++) { const x = (a + b) / 2; if (x - a < eps) return x; const fx = PackG.horner(P, x); if (fx === 0) return x; if (fx < 0) a = x; else b = x; } return (a + b) / 2; }, hint: "You move a when f(x) < 0 — that assumes f is increasing. For a decreasing function the root is on the other side. Keep the half where the sign CHANGES: test f(x)·f(a) < 0." },
    { fn: (P, a, b, eps) => { for (let it = 0; it < 200; it++) { const x = (a + b) / 2; if (b - a < eps) return x; const fx = PackG.horner(P, x); if (fx === 0) return x; if (fx * PackG.horner(P, a) < 0) b = x; else a = x; } return (a + b) / 2; }, hint: "Check your stopping test. The error of the midpoint is at most (b − a)/2 = x − a, so stop when x − a < eps (you're stopping one halving too late)." },
    { fn: (P, a, b, eps) => { for (let it = 0; it < 200; it++) { const x = (a + b) / 2; if (x - a < eps) return x; const fx = PackG.horner(P, x); if (fx * PackG.horner(P, a) < 0) b = x; else a = x; } return (a + b) / 2; }, hint: "When the midpoint is exactly a root (f(x) = 0), return it immediately — otherwise the sign test sends you away from the answer you already found." },
  ],
  hints: [
    "If f(a) and f(b) have opposite signs, a root lies between them. After you compute the midpoint x, which of the two halves [a, x] or [x, b] still has opposite signs at its ends?",
    "Write Eval(P, x) with Horner's rule: v ← 0; for each c in P do v ← v·x + c. Then loop forever (while true), computing x, checking the two stopping rules, and moving a or b.",
    "The move is: if Eval(P, x) · Eval(P, a) < 0 then b ← x else a ← x.",
  ],
  starter: {
    pseudo: `ALGORITHM Bisection(P, a, b, eps)
    // P = coefficients, highest degree first; f(a)·f(b) < 0
    while true do
        x ← (a + b) / 2
        ...

ALGORITHM Eval(P, x)
    // Horner's rule
    ...`,
    js: `function Bisection(P, a, b, eps) {
  const f = (x) => P.reduce((acc, c) => acc * x + c, 0);
  // halve [a, b] until x − a < eps
}`,
  },
  solution: {
    pseudo: `ALGORITHM Bisection(P, a, b, eps)
    while true do
        x ← (a + b) / 2
        if x - a < eps then
            return x
        fx ← Eval(P, x)
        if fx = 0 then
            return x
        if fx * Eval(P, a) < 0 then
            b ← x
        else
            a ← x

ALGORITHM Eval(P, x)
    v ← 0
    for each c in P do
        v ← v * x + c
    return v`,
    js: `function Bisection(P, a, b, eps) {
  const f = (x) => P.reduce((acc, c) => acc * x + c, 0);
  for (;;) {
    const x = (a + b) / 2;
    if (x - a < eps) return x;
    const fx = f(x);
    if (fx === 0) return x;
    if (fx * f(a) < 0) b = x; else a = x;
  }
}`,
    python: `def bisection(P, a, b, eps):
    def f(x):
        v = 0
        for c in P:
            v = v * x + c
        return v
    while True:
        x = (a + b) / 2
        if x - a < eps:
            return x
        fx = f(x)
        if fx == 0:
            return x
        if fx * f(a) < 0:
            b = x
        else:
            a = x`,
    explain: "Each iteration halves the bracket, so after n iterations |xₙ − x*| ≤ (b − a)/2ⁿ; the loop stops after about ⌈log₂((b − a)/eps)⌉ iterations — logarithmic in the required precision, exactly like binary search, but with slow (linear) convergence compared with Newton's method.",
  },
  complexity: "≈ ⌈log₂((b − a)/eps)⌉ iterations",
  followUp: "Production code always adds an iteration cap N (floating point can make x − a stop shrinking), and 'binary search on the answer' is the same idea for integer problems like 'minimum ship capacity'.",
  distractors: ["if b - a < eps then", "if fx < 0 then", "x ← a + b / 2"],
  visual: "sims/root-finding.html",
  lesson: "lessons/12-coping-with-limitations/README.md",
});

ForgeProblems.add({
  id: "false-position-root",
  title: "Method of False Position",
  level: 5, chapter: 12, difficulty: 1,
  topics: ["numerical algorithms", "root finding", "regula falsi", "interpolation"],
  strategy: "Interpolation instead of halving",
  source: "Levitin §12.4 (method of false position)",
  summary: "Run N iterations of regula falsi: cut the bracket where the secant line through (a, f(a)) and (b, f(b)) crosses zero.",
  statement: `
<p>The <b>method of false position</b> (<i>regula falsi</i>) is to bisection what interpolation search is to binary search: instead of
the midpoint it uses the x-intercept of the straight line through <code>(a, f(a))</code> and <code>(b, f(b))</code>
(Levitin §12.4):</p>
<pre>x = (a·f(b) − b·f(a)) / (f(b) − f(a))</pre>
<p>Then, like bisection, keep the sub-interval whose ends still have opposite signs.</p>
<p>Write <code>FalsePosition(P, a, b, N)</code>: the polynomial <code>P</code> is given highest-degree-first (as in <b>Bisection Method</b>),
<code>f(a)·f(b) &lt; 0</code>, and <code>N ≥ 1</code>. Perform <b>exactly N iterations</b> and return the last <code>x</code> —
except return <code>x</code> immediately if <code>f(x) = 0</code>. Each iteration: compute x; if f(x) = 0 return x; if
f(x)·f(a) &lt; 0 then b ← x else a ← x. Answers are compared with a tolerance of 10⁻⁶.</p>`,
  entry: "FalsePosition",
  params: ["P", "a", "b", "N"],
  compare: "float",
  tests: [
    { args: [[1, 0, -1, -1], 0, 2, 8], expect: 1.318070647899533, explain: "x³ − x − 1 on [0, 2]: Levitin's 8-iteration trace ends at 1.318071 (b stays at 2 the whole time)." },
    { args: [[1, 0, 1, -1], 0, 1, 5], expect: 0.6816910202728936, explain: "x³ + x − 1 (Levitin Exercise 12.4.7)." },
    { args: [[-1, 4, -3], 0, 2.5, 6], expect: 1.0081967213114753, name: "Concave function", explain: "−x² + 4x − 3 bends downward, so here the LEFT end a stays fixed and b moves toward the root 1." },
    { args: [[1, -1], 0, 2, 3], expect: 1, name: "Straight line", explain: "For a linear f the secant IS the function: the first x is the exact root." },
    { args: [[1, 0, -2], 1, 2, 4], expect: 1.4137931034482758 },
    { args: [[-1, 3], 0, 10, 2], expect: 3 },
  ],
  random: {
    count: 20,
    gen: (r, i) => {
      const root = r.int(-12, 12) / 4, c = r.int(1, 5), s = r() < 0.5 ? 1 : -1;
      const P = [s, -s * root, s * c, -s * c * root];
      return [P, root - r.int(1, 8) / 3, root + r.int(1, 8) / 3, r.int(1, 10)];
    },
  },
  reference: (P, a, b, N) => {
    let x;
    for (let n = 1; n <= N; n++) {
      const fa = PackG.horner(P, a), fb = PackG.horner(P, b);
      x = (a * fb - b * fa) / (fb - fa);
      const fx = PackG.horner(P, x);
      if (fx === 0) return x;
      if (fx * fa < 0) b = x; else a = x;
    }
    return x;
  },
  mutants: [
    { fn: (P, a, b, N) => { let x; for (let n = 1; n <= N; n++) { const fa = PackG.horner(P, a), fb = PackG.horner(P, b); x = (a * fb - b * fa) / (fb - fa); if (PackG.horner(P, x) === 0) return x; a = x; } return x; }, hint: "You always replace a. That happens to work for x³ − x − 1 (b never moves there), but in general you must keep the part where the sign changes: test f(x)·f(a) < 0 to decide whether b or a moves." },
    { fn: (P, a, b, N) => { let x; for (let n = 1; n <= N; n++) { x = (a + b) / 2; const fx = PackG.horner(P, x); if (fx === 0) return x; if (fx * PackG.horner(P, a) < 0) b = x; else a = x; } return x; }, hint: "That's bisection — you're using the midpoint. False position uses the x-intercept of the line through (a, f(a)) and (b, f(b)): x = (a·f(b) − b·f(a)) / (f(b) − f(a))." },
    { fn: (P, a, b, N) => { let x; for (let n = 1; n <= N; n++) { const fa = PackG.horner(P, a), fb = PackG.horner(P, b); x = (a * fb - b * fa) / (fa - fb); const fx = PackG.horner(P, x); if (fx === 0) return x; if (fx * fa < 0) b = x; else a = x; } return x; }, hint: "Your x lands outside [a, b] — check the sign of the denominator. It is f(b) − f(a), matching the order of the numerator a·f(b) − b·f(a)." },
  ],
  hints: [
    "Draw the line through (a, f(a)) and (b, f(b)). Where does it cross the x-axis? That point replaces the midpoint of bisection.",
    "Loop n from 1 to N. Each time: evaluate fa and fb, compute x from the formula, evaluate fx; stop early if fx = 0; otherwise move the endpoint on the same side as the sign of fx.",
    "x ← (a · fb − b · fa) / (fb − fa); then if fx · fa < 0 then b ← x else a ← x.",
  ],
  starter: {
    pseudo: `ALGORITHM FalsePosition(P, a, b, N)
    // Perform N iterations of regula falsi; return the last x
    for n ← 1 to N do
        fa ← Eval(P, a)
        fb ← Eval(P, b)
        ...
    return x

ALGORITHM Eval(P, x)
    v ← 0
    for each c in P do
        v ← v * x + c
    return v`,
    js: `function FalsePosition(P, a, b, N) {
  const f = (x) => P.reduce((acc, c) => acc * x + c, 0);
  let x;
  // N iterations
  return x;
}`,
  },
  solution: {
    pseudo: `ALGORITHM FalsePosition(P, a, b, N)
    for n ← 1 to N do
        fa ← Eval(P, a)
        fb ← Eval(P, b)
        x ← (a * fb - b * fa) / (fb - fa)
        fx ← Eval(P, x)
        if fx = 0 then
            return x
        if fx * fa < 0 then
            b ← x
        else
            a ← x
    return x

ALGORITHM Eval(P, x)
    v ← 0
    for each c in P do
        v ← v * x + c
    return v`,
    js: `function FalsePosition(P, a, b, N) {
  const f = (x) => P.reduce((acc, c) => acc * x + c, 0);
  let x;
  for (let n = 1; n <= N; n++) {
    const fa = f(a), fb = f(b);
    x = (a * fb - b * fa) / (fb - fa);
    const fx = f(x);
    if (fx === 0) return x;
    if (fx * fa < 0) b = x; else a = x;
  }
  return x;
}`,
    python: `def false_position(P, a, b, N):
    def f(t):
        v = 0
        for c in P:
            v = v * t + c
        return v
    x = None
    for _ in range(N):
        fa, fb = f(a), f(b)
        x = (a * fb - b * fa) / (fb - fa)
        fx = f(x)
        if fx == 0:
            return x
        if fx * fa < 0:
            b = x
        else:
            a = x
    return x`,
    explain: "Each iteration costs a constant number of function evaluations (Θ(deg P) each with Horner). The bracket always contains a root, so the method never diverges; it often converges faster than bisection, but when one endpoint stays stuck (as for x³ − x − 1) it can be slower — Levitin's trace shows exactly that.",
  },
  complexity: "Θ(N · deg P)",
  followUp: "The 'Illinois' fix halves f at the stuck endpoint to restore fast convergence; drop the bracket entirely and you get the secant method — the discrete cousin of Newton's method.",
  distractors: ["x ← (a + b) / 2", "x ← (a * fb - b * fa) / (fa - fb)"],
  visual: "sims/root-finding.html",
  lesson: "lessons/12-coping-with-limitations/README.md",
});

ForgeProblems.add({
  id: "newton-sqrt",
  title: "Newton's Method for Square Roots",
  level: 5, chapter: 12, difficulty: 1,
  topics: ["numerical algorithms", "Newton's method", "square root", "convergence"],
  strategy: "Tangent-line iteration",
  source: "Levitin §11.4 & §12.4 (Newton's method, Example 3)",
  summary: "Compute √D with xₙ₊₁ = ½(xₙ + D/xₙ) and report how many iterations it took.",
  statement: `
<p>Newton's method finds a root of f(x) = 0 by following tangent lines: xₙ₊₁ = xₙ − f(xₙ)/f′(xₙ). For f(x) = x² − D this becomes the
ancient, lightning-fast square-root rule (Levitin §11.4, §12.4):</p>
<pre>xₙ₊₁ = ½ (xₙ + D / xₙ),    starting from x₀ = (1 + D) / 2</pre>
<p>Write <code>NewtonSqrt(D, eps)</code> for <code>0 ≤ D ≤ 10⁶</code>. Generate x₁, x₂, … and stop at the first
<code>xₙ₊₁</code> with <code>|xₙ₊₁ − xₙ| &lt; eps</code>. Return the list <code>[xₙ₊₁, count]</code>, where <code>count</code> is how many
new values you computed (x₀ doesn't count).</p>
<p>The built-ins <code>sqrt</code> and <code>pow</code> are not allowed. The root is compared with a tolerance of 10⁻⁹; the count must be exact —
it shows off Newton's <b>quadratic convergence</b>.</p>`,
  entry: "NewtonSqrt",
  params: ["D", "eps"],
  compare: (got, exp) => {
    if (!Array.isArray(got) || got.length !== 2) return "Return a list [root, count].";
    if (typeof got[0] !== "number" || Math.abs(got[0] - exp[0]) > 1e-9 * Math.max(1, Math.abs(exp[0]))) return `Root ${got[0]} is not the expected ${exp[0]}.`;
    if (got[1] !== exp[1]) return `Root OK, but you counted ${got[1]} iterations; the expected count is ${exp[1]}.`;
    return true;
  },
  tests: [
    { args: [2, 1e-9], expect: [1.414213562373095, 4], explain: "x₀ = 1.5, x₁ ≈ 1.416667, x₂ ≈ 1.414216, x₃ ≈ 1.41421356, x₄ = x₃ to 15 digits → 4 iterations (Levitin Example 3)." },
    { args: [9, 1e-9], expect: [3, 6] },
    { args: [1, 1e-9], expect: [1, 1], name: "D = 1", explain: "x₀ = 1 is already exact: x₁ = 1 and |x₁ − x₀| = 0 < eps after one iteration." },
    { args: [1000000, 1e-9], expect: [1000, 14], name: "Large D", explain: "x₀ = 500000.5 is far away: Newton first halves repeatedly, then locks on quadratically." },
    { args: [0.25, 1e-9], expect: [0.5, 5] },
    { args: [0, 1e-9], expect: [9.313225746154785e-10, 29], name: "D = 0 (double root)", explain: "At a double root Newton loses its speed: each step only halves x. The stopping test |xₙ₊₁ − xₙ| < eps then stops near, not at, 0." },
    { args: [144, 1e-6], expect: [12, 7] },
    { args: [0.5, 1e-9], expect: [0.7071067811865475, 4] },
  ],
  random: { count: 20, gen: (r, i) => [r.int(1, 200000) / r.pick([1, 10, 100]), r.pick([1e-6, 1e-9])] },
  reference: (D, eps) => { let x = (1 + D) / 2, c = 0; for (;;) { const y = 0.5 * (x + D / x); c++; if (Math.abs(y - x) < eps) return [y, c]; x = y; } },
  forbid: ["sqrt", "pow"],
  lints: [{ re: "\\^\\s*\\(?\\s*(0?\\.5|1\\s*/\\s*2)", lang: "any", message: "Raising to the power ½ is just the built-in square root in disguise — use Newton's update ½(x + D/x) instead." }],
  mutants: [
    { fn: (D, eps) => { let x = D, c = 0; if (D === 0) x = 0.5; for (let k = 0; k < 500; k++) { const y = 0.5 * (x + D / x); c++; if (Math.abs(y - x) < eps) return [y, c]; x = y; } return [x, c]; }, hint: "Your iteration count is off because you start from x₀ = D. Use Levitin's starting value x₀ = (1 + D)/2." },
    { fn: (D, eps) => { let x = (1 + D) / 2, c = 0; for (;;) { const y = 0.5 * (x + D / x); if (Math.abs(y - x) < eps) return [y, c]; c++; x = y; } }, hint: "Your count is one too small: you increment it only when you continue. Count every new value xₙ₊₁ you compute, including the last one that passes the stopping test." },
    { fn: (D, eps) => { let x = (1 + D) / 2, c = 0; for (let k = 0; k < 500; k++) { if (Math.abs(x * x - D) < eps) return [x, c]; x = 0.5 * (x + D / x); c++; } return [x, c]; }, hint: "You stop when x² is close to D. This problem uses Levitin's criterion instead: stop when two consecutive approximations differ by less than eps, |xₙ₊₁ − xₙ| < eps." },
  ],
  hints: [
    "Each Newton step replaces x by the average of x and D/x. If x is too big, D/x is too small — why does their average get closer to √D?",
    "Start x ← (1 + D)/2 and count ← 0. Loop: compute y from x, add one to count, compare |y − x| with eps, then x ← y.",
    "Inside the loop: y ← (x + D / x) / 2; count ← count + 1; if |y − x| < eps then return [y, count].",
  ],
  starter: {
    pseudo: `ALGORITHM NewtonSqrt(D, eps)
    // Output: [approximation of √D, number of iterations]
    x ← (1 + D) / 2
    count ← 0
    while true do
        ...`,
    js: `function NewtonSqrt(D, eps) {
  let x = (1 + D) / 2, count = 0;
  // iterate x ← (x + D/x)/2 until two successive values differ by < eps
}`,
  },
  solution: {
    pseudo: `ALGORITHM NewtonSqrt(D, eps)
    x ← (1 + D) / 2
    count ← 0
    while true do
        y ← (x + D / x) / 2
        count ← count + 1
        if abs(y - x) < eps then
            return [y, count]
        x ← y`,
    js: `function NewtonSqrt(D, eps) {
  let x = (1 + D) / 2, count = 0;
  for (;;) {
    const y = (x + D / x) / 2;
    count++;
    if (Math.abs(y - x) < eps) return [y, count];
    x = y;
  }
}`,
    python: `def newton_sqrt(D, eps):
    x, count = (1 + D) / 2, 0
    while True:
        y = (x + D / x) / 2
        count += 1
        if abs(y - x) < eps:
            return [y, count]
        x = y`,
    explain: "Newton's method converges quadratically near a simple root: the number of correct digits roughly doubles every step, so a handful of iterations suffice (4 for √2). Far from the root (huge D) the early steps just halve x, costing about log₂ D extra iterations; at the double root D = 0 convergence drops to linear.",
  },
  complexity: "O(log D + log log(1/eps)) iterations",
  followUp: "Hardware and math libraries scale D into [0.25, 1) first (Levitin §11.4) so that at most four iterations are ever needed — and the famous 'fast inverse square root' trick is just a clever x₀ plus one Newton step.",
  distractors: ["y ← x + D / x", "if abs(y * y - D) < eps then", "x ← D"],
  visual: "sims/root-finding.html",
  lesson: "lessons/12-coping-with-limitations/README.md",
});

/* ======================================================================
   Chapter 12 — Backtracking
   ====================================================================== */

PackG.queens = function (n, mode) {
  // mode: "first" | "count"; variants for mutants: cols (columns only), oneDiag, shallow (base case one row early)
  const o = typeof mode === "string" ? { mode } : mode;
  const col = [];
  const safe = (r, c) => {
    for (let i = 0; i < r; i++) {
      if (col[i] === c) return false;
      if (o.cols) continue;
      if (o.oneDiag ? c - col[i] === r - i : Math.abs(col[i] - c) === r - i) return false;
    }
    return true;
  };
  const target = o.shallow ? n - 1 : n;
  const go = (r) => {
    if (r >= target) return o.mode === "count" ? 1 : true;
    let s = 0;
    for (let c = 0; c < n; c++) if (safe(r, c)) { col[r] = c; const v = go(r + 1); if (o.mode === "count") s += v; else if (v) return true; }
    return o.mode === "count" ? s : false;
  };
  const res = go(0);
  return o.mode === "count" ? res : res ? col.slice(0, n) : [];
};

ForgeProblems.add({
  id: "n-queens-first",
  title: "n-Queens: First Solution by Backtracking",
  level: 5, chapter: 12, difficulty: 2,
  topics: ["backtracking", "n-queens", "state-space tree", "recursion"],
  strategy: "Backtracking (depth-first search with pruning)",
  source: "Levitin §12.1",
  summary: "Place n non-attacking queens row by row; return the first placement found in column order, or [] if none exists.",
  statement: `
<p><b>Backtracking</b> builds a solution one component at a time and abandons a partial solution the moment it can't possibly be
completed — pruning whole subtrees of the <i>state-space tree</i> (Levitin §12.1). The n-Queens puzzle is its classic showcase:
place <code>n</code> queens on an n×n board so no two share a row, a column, or a diagonal.</p>
<p>Place queen <code>r</code> in row <code>r</code> (r = 0, 1, …), trying columns <code>0, 1, …, n − 1</code> <b>in increasing order</b>,
and backtrack when a row has no safe column. Return the <b>first</b> complete placement found as a list <code>col</code> where
<code>col[r]</code> is the (0-based) column of the queen in row r. If there is no solution, return <code>[]</code>. 1 ≤ n ≤ 10.</p>
<p>Two queens in rows i and r (i &lt; r) attack each other diagonally exactly when <code>|col[i] − col[r]| = r − i</code>.</p>`,
  entry: "Queens",
  params: ["n"],
  tests: [
    { args: [4], expect: [1, 3, 0, 2], explain: "Starting with column 0 in row 0 is a dead end; the first solution puts row 0's queen in column 1 (Levitin's 4-queens tree)." },
    { args: [1], expect: [0], explain: "One queen, one square." },
    { args: [3], expect: [], explain: "No way to place 3 queens on a 3×3 board." },
    { args: [2], expect: [] },
    { args: [5], expect: [0, 2, 4, 1, 3] },
    { args: [6], expect: [1, 3, 5, 0, 2, 4] },
    { args: [8], expect: [0, 4, 7, 5, 2, 6, 1, 3], name: "Classic 8 queens" },
    { args: [10], expect: [0, 2, 5, 7, 9, 4, 8, 1, 3, 6] },
  ],
  random: { count: 6, gen: (r, i) => [r.int(1, 9)] },
  reference: (n) => PackG.queens(n, "first"),
  mutants: [
    { fn: (n) => PackG.queens(n, { mode: "first", cols: true }), hint: "Your queens only avoid sharing a column. Queens also attack along diagonals: for rows i < r, reject the column when |col[i] − c| = r − i." },
    { fn: (n) => PackG.queens(n, { mode: "first", oneDiag: true }), hint: "You check only ONE diagonal direction (c − col[i] = r − i). The other diagonal is col[i] − c = r − i — use the absolute value to catch both." },
    { fn: (n) => { const s = PackG.queens(n, "first"); return s.map((c) => c + 1); }, hint: "Your placement looks right but shifted by one: this problem numbers columns from 0 (Levitin's figures number them from 1)." },
  ],
  hints: [
    "Think of it as a tree: level r = 'where does the queen of row r go?'. When is a node a dead end, and what should you do when you reach one?",
    "Write a recursive Place(col, r, n): if r = n you are done (return true). Otherwise, for c ← 0 to n − 1, if column c is safe given rows 0..r − 1, set col[r] ← c and recurse; if the recursion succeeds, pass true upward.",
    "Safe(col, r, c): for i ← 0 to r − 1, if col[i] = c or |col[i] − c| = r − i then return false. If every choice in a row fails, return false — the caller then tries its next column (that's the backtrack).",
  ],
  starter: {
    pseudo: `ALGORITHM Queens(n)
    // Output: col[0..n-1] (first solution in column order) or []
    col ← array(n, -1)
    if Place(col, 0, n) then
        return col
    return []

ALGORITHM Place(col, r, n)
    // place queens in rows r..n-1; return true on success
    ...`,
    js: `function Queens(n) {
  const col = Array(n).fill(-1);
  // backtrack row by row, columns in increasing order
}`,
  },
  solution: {
    pseudo: `ALGORITHM Queens(n)
    col ← array(n, -1)
    if Place(col, 0, n) then
        return col
    return []

ALGORITHM Place(col, r, n)
    if r = n then
        return true
    for c ← 0 to n - 1 do
        if Safe(col, r, c) then
            col[r] ← c
            if Place(col, r + 1, n) then
                return true
    return false

ALGORITHM Safe(col, r, c)
    for i ← 0 to r - 1 do
        if col[i] = c or abs(col[i] - c) = r - i then
            return false
    return true`,
    js: `function Queens(n) {
  const col = Array(n).fill(-1);
  const safe = (r, c) => { for (let i = 0; i < r; i++) if (col[i] === c || Math.abs(col[i] - c) === r - i) return false; return true; };
  const place = (r) => { if (r === n) return true; for (let c = 0; c < n; c++) if (safe(r, c)) { col[r] = c; if (place(r + 1)) return true; } return false; };
  return place(0) ? col : [];
}`,
    python: `def queens(n):
    col = [-1] * n
    def safe(r, c):
        return all(col[i] != c and abs(col[i] - c) != r - i for i in range(r))
    def place(r):
        if r == n:
            return True
        for c in range(n):
            if safe(r, c):
                col[r] = c
                if place(r + 1):
                    return True
        return False
    return col if place(0) else []`,
    explain: "The state-space tree has up to n^n leaves (n! with the column rule alone), but pruning at the first conflict means only a tiny fraction is generated — for n = 8 the first solution appears after exploring a few hundred nodes. The worst case is still exponential; backtracking wins on typical instances, not in theory.",
  },
  complexity: "Exponential worst case; tiny in practice for n ≤ 10",
  followUp: "Keep three boolean arrays (used columns, used ↘ diagonals r − c, used ↙ diagonals r + c) to make Safe O(1); with bitmasks this becomes the fastest known n-Queens counter. Constraint solvers generalize exactly this 'assign, check, undo' loop.",
  distractors: ["if col[i] = c or col[i] - c = r - i then", "for c ← 1 to n do", "if r = n - 1 then"],
  visual: "sims/backtracking.html",
  lesson: "lessons/12-coping-with-limitations/README.md",
});

ForgeProblems.add({
  id: "n-queens-count",
  title: "n-Queens: Count All Solutions",
  level: 5, chapter: 12, difficulty: 2,
  topics: ["backtracking", "n-queens", "counting", "recursion"],
  strategy: "Backtracking (explore the whole pruned tree)",
  source: "Levitin §12.1 (cf. Exercise 12.1.3)",
  summary: "Count every placement of n non-attacking queens on an n×n board.",
  statement: `
<p>Finding one solution lets backtracking stop early; <b>counting</b> all of them forces it to explore the entire pruned
state-space tree. That's the right mindset for "how many configurations are valid?" questions.</p>
<p>Return the number of ways to place <code>n</code> queens on an n×n board so that no two attack each other
(same row, column or diagonal), for <code>1 ≤ n ≤ 8</code>. Rotations and reflections count as different solutions.</p>`,
  entry: "QueensCount",
  params: ["n"],
  tests: [
    { args: [4], expect: 2, explain: "[1, 3, 0, 2] and its mirror image [2, 0, 3, 1]." },
    { args: [1], expect: 1 },
    { args: [3], expect: 0, explain: "No solutions for n = 2 or 3." },
    { args: [2], expect: 0 },
    { args: [5], expect: 10 },
    { args: [6], expect: 4, explain: "Fewer than for n = 5 — the counts don't grow smoothly." },
    { args: [7], expect: 40 },
    { args: [8], expect: 92, name: "Classic 8 queens", explain: "The famous 92 (12 up to symmetry)." },
  ],
  random: { count: 6, gen: (r, i) => [r.int(1, 7)] },
  reference: (n) => PackG.queens(n, "count"),
  mutants: [
    { fn: (n) => { let f = 1; for (let k = 2; k <= n; k++) f *= k; return f; }, hint: "You get n! — the number of ways to put one queen in each row AND column. You still need to reject diagonal attacks: |col[i] − c| = r − i." },
    { fn: (n) => PackG.queens(n, { mode: "count", oneDiag: true }), hint: "Your count is too high: only one diagonal direction is being checked. Compare with the absolute value |col[i] − c| = r − i." },
    { fn: (n) => PackG.queens(n, { mode: "count", shallow: true }), hint: "You count a solution one row too early (the base case fires when r = n − 1). A placement is complete only after row n − 1 has its queen, i.e. when r = n." },
  ],
  hints: [
    "Same tree as the first-solution problem. What changes when you must not stop at the first leaf?",
    "Let Count(col, r, n) return the number of completions of rows r..n − 1. The base case r = n is exactly one solution.",
    "total ← 0; for c ← 0 to n − 1: if Safe(col, r, c) then col[r] ← c; total ← total + Count(col, r + 1, n). Return total.",
  ],
  starter: {
    pseudo: `ALGORITHM QueensCount(n)
    col ← array(n, -1)
    return Count(col, 0, n)

ALGORITHM Count(col, r, n)
    // number of ways to finish rows r..n-1
    ...`,
    js: `function QueensCount(n) {
  const col = Array(n).fill(-1);
  // count all completions
}`,
  },
  solution: {
    pseudo: `ALGORITHM QueensCount(n)
    col ← array(n, -1)
    return Count(col, 0, n)

ALGORITHM Count(col, r, n)
    if r = n then
        return 1
    total ← 0
    for c ← 0 to n - 1 do
        if Safe(col, r, c) then
            col[r] ← c
            total ← total + Count(col, r + 1, n)
    return total

ALGORITHM Safe(col, r, c)
    for i ← 0 to r - 1 do
        if col[i] = c or abs(col[i] - c) = r - i then
            return false
    return true`,
    js: `function QueensCount(n) {
  const col = Array(n).fill(-1);
  const safe = (r, c) => { for (let i = 0; i < r; i++) if (col[i] === c || Math.abs(col[i] - c) === r - i) return false; return true; };
  const count = (r) => { if (r === n) return 1; let t = 0; for (let c = 0; c < n; c++) if (safe(r, c)) { col[r] = c; t += count(r + 1); } return t; };
  return count(0);
}`,
    python: `def queens_count(n):
    col = [-1] * n
    def safe(r, c):
        return all(col[i] != c and abs(col[i] - c) != r - i for i in range(r))
    def count(r):
        if r == n:
            return 1
        total = 0
        for c in range(n):
            if safe(r, c):
                col[r] = c
                total += count(r + 1)
        return total
    return count(0)`,
    explain: "The recursion adds up the leaves of the pruned state-space tree. For n = 8 it visits about 2,000 safe partial placements instead of 8^8 ≈ 16.7 million raw placements — pruning, not cleverness in the leaf test, is what makes backtracking fast.",
  },
  complexity: "Exponential, but far below n! thanks to pruning",
  followUp: "Exploit symmetry: count only placements with the first queen in the left half and double (fix up the middle column for odd n) — halving the work, a standard trick in search problems.",
  distractors: ["if r = n - 1 then", "total ← Count(col, r + 1, n)", "return 0"],
  visual: "sims/backtracking.html",
  lesson: "lessons/12-coping-with-limitations/README.md",
});

PackG.subsetSumBT = function (A, d, variant) {
  const n = A.length, suffix = Array(n + 1).fill(0);
  for (let i = n - 1; i >= 0; i--) suffix[i] = suffix[i + 1] + A[i];
  const chosen = [];
  const go = (i, s) => {
    if (s === d) return true;
    if (i >= n || s + A[i] > d || s + suffix[i] < d) return false;
    chosen.push(A[i]);
    if (go(variant === "reuse" ? i : i + 1, s + A[i])) return true;
    chosen.pop();
    return go(i + 1, s);
  };
  return go(0, 0) ? chosen.slice() : [];
};

ForgeProblems.add({
  id: "subset-sum-backtrack",
  title: "Subset-Sum by Backtracking",
  level: 5, chapter: 12, difficulty: 2,
  topics: ["backtracking", "subset sum", "pruning", "state-space tree"],
  strategy: "Backtracking with two pruning tests",
  source: "Levitin §12.1 (subset-sum problem)",
  summary: "Find a subset of sorted positive integers that sums to d, pruning branches that overshoot or can't catch up.",
  statement: `
<p>SUBSET-SUM: given positive integers <code>A[0..n-1]</code> sorted in <b>increasing</b> order and a target <code>d</code>, find a subset
whose sum is exactly <code>d</code>. Backtracking builds a binary state-space tree — for each element, "include it" or "exclude it" —
and prunes a node when (Levitin §12.1):</p>
<ul>
<li>adding the next element already overshoots: <code>s + A[i] &gt; d</code> (and, because A is sorted, so would every later one), or</li>
<li>even taking <b>all</b> remaining elements can't reach d: <code>s + A[i] + … + A[n−1] &lt; d</code>.</li>
</ul>
<p>Return the chosen elements as a list (any valid subset is accepted; each element may be used at most once), or <code>[]</code>
if no subset works. 1 ≤ n ≤ 12, 1 ≤ d.</p>`,
  entry: "SubsetSum",
  params: ["A", "d"],
  tests: [
    { args: [[3, 5, 6, 7], 15], expect: [3, 5, 7], explain: "Levitin's example: 3 + 5 + 7 = 15." },
    { args: [[1, 2, 5, 6, 8], 9], expect: [1, 2, 6], explain: "Another valid answer is [1, 8]." },
    { args: [[2, 4, 6], 5], expect: [], explain: "All even numbers: an odd target is impossible." },
    { args: [[1, 2, 3], 6], expect: [1, 2, 3], name: "Take everything" },
    { args: [[7], 7], expect: [7], name: "Single element" },
    { args: [[5, 10, 12, 13, 15, 18], 30], expect: [5, 10, 15] },
    { args: [[3, 4, 5], 13], expect: [], name: "Too big", explain: "The total is only 12 — the second pruning test stops at the root." },
    { args: [[1, 3, 4, 5], 11], expect: [], explain: "Levitin Exercise 12.1.8a: no subset of {1, 3, 4, 5} sums to 11." },
    { args: [[3, 9], 6], expect: [], name: "No reuse", explain: "3 + 3 would be 6, but each element may be used only once." },
    { args: [[1, 3, 4, 8, 9, 20], 21], expect: [1, 3, 8, 9] },
  ],
  random: {
    count: 25,
    gen: (r, i) => {
      const A = r.distinct(r.int(1, 10), 1, 30).sort((x, y) => x - y);
      const S = A.reduce((a, b) => a + b, 0);
      return [A, r.int(1, S + 3)];
    },
  },
  reference: (A, d) => PackG.subsetSumBT(A, d),
  verify: (got, [A, d]) => {
    const possible = PackG.subsetSumBT(A, d).length > 0;
    if (!Array.isArray(got)) return "Return a list of chosen elements, or [].";
    if (got.length === 0) return possible ? "A subset summing to d does exist, so [] is wrong." : true;
    if (!possible) return "No subset of A sums to d, so the answer must be [].";
    const left = A.slice();
    for (const x of got) { const k = left.indexOf(x); if (k < 0) return `${x} is not available — every element of A may be used at most once.`; left.splice(k, 1); }
    const s = got.reduce((a, b) => a + b, 0);
    return s === d ? true : `Your subset sums to ${s}, not ${d}.`;
  },
  mutants: [
    { fn: (A, d) => PackG.subsetSumBT(A, d, "reuse"), hint: "Your subset uses an element more than once. After including A[i], the next decision is about A[i + 1] — recurse with i + 1, not i." },
    { fn: (A, d) => { const n = A.length, chosen = []; const go = (i, s) => { if (s === d) return true; if (i >= n || s + A[i] >= d) return false; chosen.push(A[i]); if (go(i + 1, s + A[i])) return true; chosen.pop(); return go(i + 1, s); }; return go(0, 0) ? chosen.slice() : []; }, hint: "Your pruning test cuts off the branch where s + A[i] equals d exactly, so you never land on the target. Prune only when s + A[i] > d (strictly greater)." },
    { fn: (A, d) => { const chosen = []; let s = 0; for (const x of A) if (s + x <= d) { chosen.push(x); s += x; } return s === d ? chosen : []; }, hint: "It looks like you take each element greedily whenever it still fits and never undo a choice. Backtracking must also explore the 'exclude A[i]' branch when the 'include' branch fails — e.g. for [3, 5, 6, 7] and d = 15 you must drop 6 to make room for 7." },
  ],
  hints: [
    "At each node you know the current sum s and the next index i. When can you already tell that nothing below this node can reach d?",
    "Recursive Try(i, s): if s = d → success. If i = n, or s + A[i] > d, or s + (sum of A[i..n−1]) < d → dead end. Otherwise try including A[i] (recurse on i + 1 with s + A[i]); if that fails, try excluding it.",
    "Keep the chosen elements in a list: append(chosen, A[i]) before the 'include' recursion and remove it (removeLast) if that branch fails. Precompute the remaining sums once so the second test is O(1).",
  ],
  starter: {
    pseudo: `ALGORITHM SubsetSum(A[0..n-1], d)
    chosen ← []
    if Try(A, d, 0, 0, chosen) then
        return chosen
    return []

ALGORITHM Try(A, d, i, s, chosen)
    // true if some subset of A[i..] extends s to exactly d
    ...`,
    js: `function SubsetSum(A, d) {
  const chosen = [];
  // backtracking: include A[i] or exclude it, prune early
}`,
  },
  solution: {
    pseudo: `ALGORITHM SubsetSum(A[0..n-1], d)
    rest ← sum(A)
    chosen ← []
    if Try(A, d, 0, 0, rest, chosen) then
        return chosen
    return []

ALGORITHM Try(A, d, i, s, rest, chosen)
    if s = d then
        return true
    if i = length(A) or s + A[i] > d or s + rest < d then
        return false
    append(chosen, A[i])
    if Try(A, d, i + 1, s + A[i], rest - A[i], chosen) then
        return true
    removeLast(chosen)
    return Try(A, d, i + 1, s, rest - A[i], chosen)`,
    js: `function SubsetSum(A, d) {
  const chosen = [];
  const tryFrom = (i, s, rest) => {
    if (s === d) return true;
    if (i === A.length || s + A[i] > d || s + rest < d) return false;
    chosen.push(A[i]);
    if (tryFrom(i + 1, s + A[i], rest - A[i])) return true;
    chosen.pop();
    return tryFrom(i + 1, s, rest - A[i]);
  };
  return tryFrom(0, 0, A.reduce((a, b) => a + b, 0)) ? chosen : [];
}`,
    python: `def subset_sum(A, d):
    chosen = []
    def try_from(i, s, rest):
        if s == d:
            return True
        if i == len(A) or s + A[i] > d or s + rest < d:
            return False
        chosen.append(A[i])
        if try_from(i + 1, s + A[i], rest - A[i]):
            return True
        chosen.pop()
        return try_from(i + 1, s, rest - A[i])
    return chosen if try_from(0, 0, sum(A)) else []`,
    explain: "The tree has up to 2^(n+1) − 1 nodes, so the worst case is exponential — SUBSET-SUM is Nondeterministic Polynomial (NP)-complete. The two bounds (overshoot, can't-catch-up) each cost O(1) because 'rest' is carried along, and on typical inputs they cut the tree dramatically.",
  },
  complexity: "O(2ⁿ) worst case; pruning makes typical runs far smaller",
  followUp: "When d is small, dynamic programming solves it in Θ(n·d) (pseudo-polynomial) — the right choice for budgets in the thousands; backtracking/meet-in-the-middle wins when the numbers are huge but n is small.",
  distractors: ["if Try(A, d, i, s + A[i], rest - A[i], chosen) then", "if i = length(A) or s + A[i] ≥ d or s + rest < d then"],
  visual: "sims/backtracking.html",
  lesson: "lessons/12-coping-with-limitations/README.md",
});

PackG.colorBT = function (G, m, variant) {
  const n = G.length, color = Array(n).fill(-1);
  const go = (v) => {
    if (v === n) return true;
    for (let c = 0; c < m; c++) {
      const ok = variant === "prevOnly" ? !(v > 0 && G[v].includes(v - 1) && color[v - 1] === c) : G[v].every((w) => color[w] !== c);
      if (ok) {
        color[v] = c;
        if (go(v + 1)) return true;
        if (variant !== "noReset") color[v] = -1;
      }
    }
    return false;
  };
  if (variant === "greedy") {
    for (let v = 0; v < n; v++) { let c = 0; while (c < m && G[v].some((w) => color[w] === c)) c++; if (c === m) return []; color[v] = c; }
    return color;
  }
  return go(0) ? color : [];
};
PackG.crown = [[3, 5], [2, 4], [1, 5], [0, 4], [1, 3], [0, 2]]; // bipartite, but greedy in index order needs 3 colors
PackG.petersen = [[1, 4, 5], [0, 2, 6], [1, 3, 7], [2, 4, 8], [3, 0, 9], [0, 7, 8], [1, 8, 9], [2, 9, 5], [3, 5, 6], [4, 6, 7]];

ForgeProblems.add({
  id: "graph-coloring-m",
  title: "m-Coloring by Backtracking",
  level: 5, chapter: 12, difficulty: 2,
  topics: ["backtracking", "graph coloring", "graphs", "NP-complete"],
  strategy: "Backtracking over vertices",
  source: "Levitin Exercise 12.1.10b (graph coloring is NP-complete)",
  summary: "Color the vertices with at most m colors so no edge joins two equal colors, or report that it's impossible.",
  statement: `
<p><b>Graph coloring</b> models scheduling with conflicts: exams that share a student (an edge) can't be in the same time slot
(a color). Deciding whether <code>m</code> colors suffice is Nondeterministic Polynomial (NP)-complete for m ≥ 3, so we search with backtracking.</p>
<p>Input: an undirected graph as adjacency lists <code>G</code> (vertices <code>0..n-1</code>, every edge listed in both directions) and
<code>m ≥ 1</code>. Return a list <code>color</code> of length n with values in <code>0..m−1</code> such that the two ends of every edge
get different colors, or <code>[]</code> if no such coloring exists. Any valid coloring is accepted. n ≤ 10.</p>
<p>Plan: color vertices in order 0, 1, 2, …; for each, try colors 0..m−1 that don't clash with already-colored neighbors, and
<b>undo</b> the choice when the rest can't be completed.</p>`,
  entry: "ColorGraph",
  params: ["G", "m"],
  tests: [
    { args: [[[1, 2], [0, 2], [0, 1]], 3], expect: [0, 1, 2], explain: "A triangle needs three different colors." },
    { args: [[[1, 2], [0, 2], [0, 1]], 2], expect: [], explain: "Two colors can't color a triangle." },
    { args: [PackG.crown, 2], expect: [0, 1, 0, 1, 0, 1], name: "Crown graph", explain: "This graph is bipartite (2 colors suffice), but 'always take the first free color' in vertex order gets stuck and needs 3 — you must backtrack." },
    { args: [[[1, 4], [0, 2], [1, 3], [2, 4], [3, 0]], 2], expect: [], name: "Odd cycle C5", explain: "Cycles of odd length are not 2-colorable." },
    { args: [[[1, 4], [0, 2], [1, 3], [2, 4], [3, 0]], 3], expect: [0, 1, 0, 1, 2] },
    { args: [[[1, 2, 3], [0, 2, 3], [0, 1, 3], [0, 1, 2]], 3], expect: [], name: "K4", explain: "Four mutually adjacent vertices need 4 colors." },
    { args: [[[], [], []], 1], expect: [0, 0, 0], name: "No edges" },
    { args: [[[1, 2, 3, 4, 5], [0, 2, 5], [0, 1, 3], [0, 2, 4], [0, 3, 5], [0, 4, 1]], 3], expect: [], name: "Wheel W5", explain: "A hub joined to an odd cycle needs 4 colors." },
    { args: [[[1, 2, 3, 4, 5], [0, 2, 5], [0, 1, 3], [0, 2, 4], [0, 3, 5], [0, 4, 1]], 4], expect: [0, 1, 2, 1, 2, 3] },
    { args: [PackG.petersen, 3], expect: [0, 1, 0, 1, 2, 1, 0, 2, 2, 1], name: "Petersen graph" },
  ],
  random: {
    count: 25,
    gen: (r, i) => { const n = r.int(2, 9); return [PackG.randomGraph(r, n, r.pick([0.3, 0.5, 0.7])), r.int(2, 4)]; },
  },
  reference: (G, m) => PackG.colorBT(G, m),
  verify: (got, [G, m]) => {
    const possible = PackG.colorBT(G, m).length > 0;
    if (!Array.isArray(got)) return "Return a list of colors, or [].";
    if (got.length === 0) return possible ? `This graph CAN be colored with ${m} colors, so [] is wrong.` : true;
    if (!possible) return `This graph can't be colored with ${m} colors — the answer must be [].`;
    if (got.length !== G.length) return `Give one color per vertex (${G.length} values).`;
    for (let v = 0; v < G.length; v++) {
      if (!Number.isInteger(got[v]) || got[v] < 0 || got[v] >= m) return `Vertex ${v} has color ${got[v]}; colors must be 0..${m - 1}.`;
      for (const w of G[v]) if (got[w] === got[v]) return `Edge ${v}–${w} joins two vertices of color ${got[v]}.`;
    }
    return true;
  },
  mutants: [
    { fn: (G, m) => PackG.colorBT(G, m, "greedy"), hint: "You give each vertex the first free color and never revisit a choice. Greedy coloring can paint itself into a corner (see the crown graph): when no color fits, go BACK to the previous vertex and try its next color." },
    { fn: (G, m) => PackG.colorBT(G, m, "noReset"), hint: "After a failed attempt, reset the vertex's color to 'uncolored' (−1). Otherwise stale colors from abandoned branches block choices for earlier vertices." },
    { fn: (G, m) => PackG.colorBT(G, m, "prevOnly"), hint: "You only compare with vertex v − 1. A vertex must differ from ALL of its already-colored neighbors: loop over G[v]." },
  ],
  hints: [
    "Color vertex 0, then vertex 1, … . When you reach a vertex for which none of the m colors is allowed, what does that tell you about an earlier choice?",
    "Recursive Assign(v): if v = n, success. For c ← 0 to m − 1: if no neighbor w in G[v] has color[w] = c, set color[v] ← c and call Assign(v + 1); on success return true.",
    "If Assign(v + 1) fails, set color[v] ← −1 before trying the next c, and return false after the loop so the caller can backtrack.",
  ],
  starter: {
    pseudo: `ALGORITHM ColorGraph(G[0..n-1], m)
    color ← array(n, -1)
    if Assign(G, m, color, 0) then
        return color
    return []

ALGORITHM Assign(G, m, color, v)
    // try to color vertices v..n-1
    ...`,
    js: `function ColorGraph(G, m) {
  const color = Array(G.length).fill(-1);
  // backtracking over vertices 0..n-1
}`,
  },
  solution: {
    pseudo: `ALGORITHM ColorGraph(G[0..n-1], m)
    color ← array(n, -1)
    if Assign(G, m, color, 0) then
        return color
    return []

ALGORITHM Assign(G, m, color, v)
    if v = length(G) then
        return true
    for c ← 0 to m - 1 do
        ok ← true
        for each w in G[v] do
            if color[w] = c then
                ok ← false
        if ok then
            color[v] ← c
            if Assign(G, m, color, v + 1) then
                return true
            color[v] ← -1
    return false`,
    js: `function ColorGraph(G, m) {
  const n = G.length, color = Array(n).fill(-1);
  const assign = (v) => {
    if (v === n) return true;
    for (let c = 0; c < m; c++) {
      if (G[v].every(w => color[w] !== c)) {
        color[v] = c;
        if (assign(v + 1)) return true;
        color[v] = -1;
      }
    }
    return false;
  };
  return assign(0) ? color : [];
}`,
    python: `def color_graph(G, m):
    n = len(G)
    color = [-1] * n
    def assign(v):
        if v == n:
            return True
        for c in range(m):
            if all(color[w] != c for w in G[v]):
                color[v] = c
                if assign(v + 1):
                    return True
                color[v] = -1
        return False
    return color if assign(0) else []`,
    explain: "The state-space tree has up to mⁿ leaves; each node checks deg(v) neighbors, so the worst case is O(mⁿ · n) — exponential, as expected for an NP-complete problem. Pruning at the first clash removes most of the tree on typical graphs.",
  },
  complexity: "O(mⁿ · n) worst case",
  followUp: "Order matters: coloring the most-constrained vertex next (DSatur heuristic) prunes far more. Register allocation in compilers is graph coloring, solved with exactly these heuristics plus 'spilling' when colors run out.",
  distractors: ["if color[v - 1] = c then", "for c ← 1 to m do"],
  visual: "sims/backtracking.html",
  lesson: "lessons/12-coping-with-limitations/README.md",
});

PackG.hamExists = function (G) {
  const n = G.length, full = (1 << n) - 1;
  const dp = Array.from({ length: 1 << n }, () => Array(n).fill(false));
  dp[1][0] = true;
  for (let mask = 1; mask <= full; mask++) for (let v = 0; v < n; v++) if (dp[mask][v]) for (const w of G[v]) if (!(mask & (1 << w))) dp[mask | (1 << w)][w] = true;
  return G[0].some((v) => dp[full][v]) && n >= 3;
};
PackG.hamBT = function (G, variant) {
  const n = G.length, path = [0], used = Array(n).fill(false);
  used[0] = true;
  const ext = () => {
    const last = path[path.length - 1];
    if (path.length === n) return variant === "noClose" ? true : G[last].includes(0);
    for (const w of G[last]) if (!used[w]) {
      used[w] = true; path.push(w);
      if (ext()) return true;
      if (variant === "greedy") return false;
      path.pop(); used[w] = false;
    }
    return false;
  };
  if (!ext()) return [];
  return variant === "open" ? path.slice() : path.concat([0]);
};

ForgeProblems.add({
  id: "hamiltonian-circuit",
  title: "Hamiltonian Circuit by Backtracking",
  level: 6, chapter: 12, difficulty: 3,
  topics: ["backtracking", "Hamiltonian circuit", "graphs", "NP-complete"],
  strategy: "Backtracking over paths",
  source: "Levitin §12.1 · Exercise 12.1.10a",
  summary: "Find a cycle through every vertex exactly once, starting and ending at vertex 0, or return [] if none exists.",
  statement: `
<p>A <b>Hamiltonian circuit</b> visits every vertex of a graph exactly once and returns to its start — the skeleton of every
Traveling Salesman Problem (TSP) tour. Deciding whether one exists is Nondeterministic Polynomial (NP)-complete, but backtracking handles small graphs
well (Levitin §12.1).</p>
<p>Input: an undirected graph as adjacency lists <code>G</code> (vertices <code>0..n-1</code>, 3 ≤ n ≤ 10, each edge listed in both
directions). Return a circuit as a list of <code>n + 1</code> vertices that <b>starts and ends at 0</b>, e.g. <code>[0, 1, 2, 3, 0]</code>,
where consecutive vertices are adjacent and every vertex appears once (except 0 at both ends). Return <code>[]</code> if the graph
has no Hamiltonian circuit. Any valid circuit is accepted.</p>`,
  entry: "HamCircuit",
  params: ["G"],
  tests: [
    { args: [[[1, 2, 3], [0, 2], [0, 1, 3], [0, 2]]], expect: [0, 1, 2, 3, 0], explain: "A square 0–1–2–3 with the diagonal 0–2: go around the square." },
    { args: [[[1], [0, 2], [1, 3], [2]]], expect: [], explain: "A path 0–1–2–3 visits everything, but there is no edge 3–0 to close the circuit." },
    { args: [[[1, 2, 3], [0], [0], [0]]], expect: [], name: "Star", explain: "Leaves have degree 1 — a circuit needs every vertex to have degree ≥ 2." },
    { args: [[[1, 4], [0, 3, 2], [1, 3], [1, 2, 4], [0, 3]]], expect: [0, 1, 2, 3, 4, 0], name: "Needs backtracking", explain: "Going 0 → 1 → 3 first strands vertex 2 (or 4); back up and try 0 → 1 → 2 → 3 → 4." },
    { args: [[[1, 2, 3], [0, 2, 3], [0, 1, 3], [0, 1, 2]]], expect: [0, 1, 2, 3, 0], name: "K4" },
    { args: [PackG.petersen], expect: [], name: "Petersen graph", explain: "The famous 10-vertex, 3-regular graph with no Hamiltonian circuit." },
    { args: [[[1, 3, 4], [0, 2, 5], [1, 3, 6], [0, 2, 7], [0, 5, 7], [1, 4, 6], [2, 5, 7], [3, 4, 6]]], expect: [0, 1, 2, 3, 7, 6, 5, 4, 0], name: "Cube" },
    { args: [[[1, 2], [0, 2], [0, 1, 3, 4], [2, 4], [2, 3]]], expect: [], name: "Bow tie", explain: "Two triangles sharing vertex 2: any circuit would pass through 2 twice." },
  ],
  random: {
    count: 25,
    gen: (r, i) => { const n = r.int(3, 8); return [PackG.randomGraph(r, n, r.pick([0.4, 0.55, 0.7]))]; },
  },
  reference: (G) => PackG.hamBT(G),
  verify: (got, [G]) => {
    const n = G.length, exists = PackG.hamExists(G);
    if (!Array.isArray(got)) return "Return a list of vertices, or [].";
    if (got.length === 0) return exists ? "This graph HAS a Hamiltonian circuit, so [] is wrong." : true;
    if (!exists) return "This graph has no Hamiltonian circuit — the answer must be [].";
    if (got.length !== n + 1) return `A circuit through ${n} vertices lists ${n + 1} entries (start vertex 0 repeated at the end); yours has ${got.length}.`;
    if (got[0] !== 0 || got[n] !== 0) return "Start and end the circuit at vertex 0.";
    const seen = new Set(got.slice(0, n));
    if (seen.size !== n) return "Some vertex is visited twice (or missing).";
    for (let k = 0; k < n; k++) if (!G[got[k]].includes(got[k + 1])) return `${got[k]} → ${got[k + 1]} is not an edge of the graph.`;
    return true;
  },
  mutants: [
    { fn: (G) => PackG.hamBT(G, "noClose"), hint: "When the path already contains all n vertices you accept it — but the last vertex must also be adjacent to 0 to close the circuit. Check that edge before reporting success." },
    { fn: (G) => PackG.hamBT(G, "open"), hint: "Almost! A circuit returns to where it started: append the start vertex 0 at the end so the list has n + 1 entries." },
    { fn: (G) => PackG.hamBT(G, "greedy"), hint: "Your search commits to the first unused neighbor and never undoes it. When a branch fails, remove the vertex from the path, mark it unused again, and try the NEXT neighbor." },
  ],
  hints: [
    "Build the circuit as a path from 0, one vertex at a time. What makes a partial path a dead end, and what must be true when the path has all n vertices?",
    "Recursive Extend(path): let last be the final vertex. If the path has n vertices, succeed exactly when last is adjacent to 0. Otherwise try each unused neighbor w of last: add it, recurse, and if that fails, remove it.",
    "Keep used[0..n−1]. On the way in: used[w] ← true; append(path, w). On the way out after a failure: removeLast(path); used[w] ← false.",
  ],
  starter: {
    pseudo: `ALGORITHM HamCircuit(G[0..n-1])
    path ← [0]
    used ← array(n, false)
    used[0] ← true
    ...

ALGORITHM Extend(G, path, used)
    // try to extend path to a Hamiltonian circuit
    ...`,
    js: `function HamCircuit(G) {
  const n = G.length, path = [0], used = Array(n).fill(false);
  used[0] = true;
  // backtracking
}`,
  },
  solution: {
    pseudo: `ALGORITHM HamCircuit(G[0..n-1])
    path ← [0]
    used ← array(n, false)
    used[0] ← true
    if Extend(G, path, used) then
        append(path, 0)
        return path
    return []

ALGORITHM Extend(G, path, used)
    last ← path[length(path) - 1]
    if length(path) = length(G) then
        return 0 in G[last]
    for each w in G[last] do
        if not used[w] then
            used[w] ← true
            append(path, w)
            if Extend(G, path, used) then
                return true
            removeLast(path)
            used[w] ← false
    return false`,
    js: `function HamCircuit(G) {
  const n = G.length, path = [0], used = Array(n).fill(false);
  used[0] = true;
  const extend = () => {
    const last = path[path.length - 1];
    if (path.length === n) return G[last].includes(0);
    for (const w of G[last]) if (!used[w]) {
      used[w] = true; path.push(w);
      if (extend()) return true;
      path.pop(); used[w] = false;
    }
    return false;
  };
  return extend() ? path.concat([0]) : [];
}`,
    python: `def ham_circuit(G):
    n = len(G)
    path, used = [0], [False] * n
    used[0] = True
    def extend():
        last = path[-1]
        if len(path) == n:
            return 0 in G[last]
        for w in G[last]:
            if not used[w]:
                used[w] = True; path.append(w)
                if extend():
                    return True
                path.pop(); used[w] = False
        return False
    return path + [0] if extend() else []`,
    explain: "Fixing the start at 0 loses nothing (a circuit can be rotated). The tree has at most (n − 1)! root-to-leaf paths, so the worst case is exponential; the 'unused neighbor' rule prunes most of it on sparse graphs, and the final adjacency test turns a Hamiltonian path into a circuit.",
  },
  complexity: "O((n − 1)!) worst case",
  followUp: "Held–Karp dynamic programming decides it in Θ(2ⁿ · n²) — exponential but far below (n − 1)!, practical up to n ≈ 25. Levitin also suggests fixing the relative order of two vertices to skip mirror-image circuits.",
  distractors: ["return true", "if length(path) = length(G) - 1 then", "used[w] ← true"],
  visual: "sims/backtracking.html",
  lesson: "lessons/12-coping-with-limitations/README.md",
});

/* ======================================================================
   Chapter 12 — Approximation algorithms
   ====================================================================== */

PackG.nearestNeighbor = function (D, variant) {
  const n = D.length, seen = Array(n).fill(false), tour = [0];
  seen[0] = true;
  let cur = 0;
  for (let step = 1; step < n; step++) {
    let best = -1;
    const from = variant === "fromStart" ? 0 : cur;
    for (let j = 0; j < n; j++) if (!seen[j] && (best === -1 || (variant === "lastTie" ? D[from][j] <= D[from][best] : D[from][j] < D[from][best]))) best = j;
    seen[best] = true; tour.push(best); cur = best;
  }
  if (variant !== "open") tour.push(0);
  return tour;
};
PackG.small4 = [[0, 1, 3, 6], [1, 0, 2, 3], [3, 2, 0, 1], [6, 3, 1, 0]];
PackG.levitin5 = [[0, 4, 8, 9, 12], [4, 0, 6, 8, 9], [8, 6, 0, 10, 11], [9, 8, 10, 0, 7], [12, 9, 11, 7, 0]];

ForgeProblems.add({
  id: "tsp-nearest-neighbor",
  title: "Traveling Salesman: Nearest-Neighbor Heuristic",
  level: 5, chapter: 12, difficulty: 1,
  topics: ["approximation", "traveling salesman", "greedy", "heuristics"],
  strategy: "Greedy heuristic",
  source: "Levitin §12.3 · Exercise 12.3.2a (pseudocode for nearest neighbor)",
  summary: "Build a Traveling Salesman Problem (TSP) tour by always driving to the closest unvisited city.",
  statement: `
<p>The <b>Traveling Salesman Problem (TSP)</b> is Nondeterministic Polynomial (NP)-hard, so in practice we often settle for a <i>good</i> tour quickly. The simplest
heuristic: start somewhere and <b>always go to the nearest unvisited city</b>; when all are visited, return home (Levitin §12.3).</p>
<p>Input: a symmetric distance matrix <code>D</code> (<code>D[i][j]</code> = distance between cities i and j, n ≥ 1). Start at city
<code>0</code>. When several unvisited cities are equally near, pick the one with the <b>smallest index</b>.
Return the tour as a list of <code>n + 1</code> cities that starts and ends with 0.</p>
<p>The tour is <i>not</i> always optimal — the first example is 25% longer than the best tour — and that's fine: this is an
approximation algorithm.</p>`,
  entry: "NearestNeighbor",
  params: ["D"],
  tests: [
    { args: [PackG.small4], expect: [0, 1, 2, 3, 0], explain: "0 →(1) 1 →(2) 2 →(1) 3 →(6) 0: length 10. The optimal tour 0–1–3–2–0 has length 8, so the accuracy ratio is 10/8 = 1.25 (after Levitin §12.3)." },
    { args: [PackG.levitin5], expect: [0, 1, 2, 3, 4, 0], explain: "Length 4 + 6 + 10 + 7 + 12 = 39." },
    { args: [[[0, 2, 2, 5], [2, 0, 3, 1], [2, 3, 0, 4], [5, 1, 4, 0]]], expect: [0, 1, 3, 2, 0], name: "Tie", explain: "Cities 1 and 2 are both at distance 2 from 0 — take the smaller index, 1. From 1 the nearest is 3, not 2." },
    { args: [[[0]]], expect: [0, 0], name: "One city" },
    { args: [[[0, 7], [7, 0]]], expect: [0, 1, 0], name: "Two cities" },
    { args: [[[0, 3, 4, 2, 7], [3, 0, 4, 6, 3], [4, 4, 0, 5, 8], [2, 6, 5, 0, 6], [7, 3, 8, 6, 0]]], expect: [0, 3, 2, 1, 4, 0] },
  ],
  random: { count: 20, gen: (r, i) => [PackG.randomDist(r, r.int(2, 9))] },
  reference: (D) => PackG.nearestNeighbor(D),
  mutants: [
    { fn: (D) => PackG.nearestNeighbor(D, "open"), hint: "A tour must return to where it started. After visiting all n cities, append city 0 again (the list has n + 1 entries)." },
    { fn: (D) => PackG.nearestNeighbor(D, "fromStart"), hint: "You're measuring distances from the START city every time. 'Nearest' means nearest to the city you are currently at: use D[cur][j] and update cur after each move." },
    { fn: (D) => PackG.nearestNeighbor(D, "lastTie"), hint: "On a tie you pick the larger index (your test is ≤). Use a strict < so the first (smallest-index) nearest city wins." },
  ],
  hints: [
    "At every step you stand at some city cur. Which cities are candidates for the next move, and how do you pick among them?",
    "Keep visited[0..n−1]. Repeat n − 1 times: scan j = 0..n − 1 for the unvisited city with the smallest D[cur][j]; mark it, append it, and move cur there. Finally append 0.",
    "The scan: best ← −1; for j: if not visited[j] and (best = −1 or D[cur][j] < D[cur][best]) then best ← j.",
  ],
  starter: {
    pseudo: `ALGORITHM NearestNeighbor(D[0..n-1])
    visited ← array(n, false)
    visited[0] ← true
    tour ← [0]
    cur ← 0
    for step ← 1 to n - 1 do
        ...
    return tour`,
    js: `function NearestNeighbor(D) {
  const n = D.length;
  // start at 0, always go to the nearest unvisited city, then return to 0
}`,
  },
  solution: {
    pseudo: `ALGORITHM NearestNeighbor(D[0..n-1])
    visited ← array(n, false)
    visited[0] ← true
    tour ← [0]
    cur ← 0
    for step ← 1 to n - 1 do
        best ← -1
        for j ← 0 to n - 1 do
            if not visited[j] and (best = -1 or D[cur][j] < D[cur][best]) then
                best ← j
        visited[best] ← true
        append(tour, best)
        cur ← best
    append(tour, 0)
    return tour`,
    js: `function NearestNeighbor(D) {
  const n = D.length, visited = Array(n).fill(false), tour = [0];
  visited[0] = true;
  let cur = 0;
  for (let step = 1; step < n; step++) {
    let best = -1;
    for (let j = 0; j < n; j++) if (!visited[j] && (best === -1 || D[cur][j] < D[cur][best])) best = j;
    visited[best] = true; tour.push(best); cur = best;
  }
  tour.push(0);
  return tour;
}`,
    python: `def nearest_neighbor(D):
    n = len(D)
    visited, tour, cur = [False] * n, [0], 0
    visited[0] = True
    for _ in range(n - 1):
        best = min((j for j in range(n) if not visited[j]), key=lambda j: (D[cur][j], j))
        visited[best] = True
        tour.append(best)
        cur = best
    tour.append(0)
    return tour`,
    explain: "n − 1 moves, each scanning n cities: Θ(n²) time. The heuristic has no finite performance ratio in general (make the forced last edge huge), and on Euclidean instances its ratio is bounded only by about ½(⌈log₂ n⌉ + 1) — fast, simple, and sometimes badly wrong.",
  },
  complexity: "Θ(n²)",
  followUp: "Real routing engines use nearest neighbor only as a starting tour, then improve it with 2-opt / 3-opt local search (Levitin §12.3) — typically landing within a few percent of optimal.",
  distractors: ["if not visited[j] and (best = -1 or D[0][j] < D[0][best]) then", "if not visited[j] and (best = -1 or D[cur][j] ≤ D[cur][best]) then"],
  visual: "sims/tsp-approx.html",
  lesson: "lessons/12-coping-with-limitations/README.md",
});

PackG.twiceAround = function (D, variant) {
  const n = D.length, inTree = Array(n).fill(false), dist = Array(n).fill(Infinity), parent = Array(n).fill(-1);
  dist[0] = 0;
  for (let k = 0; k < n; k++) {
    let u = -1;
    for (let v = 0; v < n; v++) if (!inTree[v] && (u === -1 || dist[v] < dist[u])) u = v;
    inTree[u] = true;
    for (let v = 0; v < n; v++) if (!inTree[v] && D[u][v] < dist[v]) { dist[v] = D[u][v]; parent[v] = u; }
  }
  const out = [];
  const walk = (u) => {
    if (variant !== "post") out.push(u);
    for (let v = 0; v < n; v++) if (parent[v] === u) { walk(v); if (variant === "full") out.push(u); }
    if (variant === "post") out.push(u);
  };
  walk(0);
  if (variant === "full") return out;
  if (variant === "post") return out.concat([out[0]]);
  return out.concat([0]);
};

ForgeProblems.add({
  id: "tsp-twice-around-tree",
  title: "Traveling Salesman: Twice-Around-the-Tree",
  level: 6, chapter: 12, difficulty: 3,
  topics: ["approximation", "traveling salesman", "minimum spanning tree", "DFS"],
  strategy: "Minimum Spanning Tree (MST) + preorder walk with shortcuts",
  source: "Levitin §12.3 (twice-around-the-tree algorithm)",
  summary: "A 2-approximation for the Euclidean traveling salesman: build a minimum spanning tree with Prim, walk around it, skip repeated cities.",
  statement: `
<p>For Traveling Salesman Problem (TSP) instances whose distances obey the triangle inequality, the <b>twice-around-the-tree</b> algorithm guarantees a tour at most
<b>twice</b> the optimal length (Levitin §12.3):</p>
<ol>
<li>Build a <b>Minimum Spanning Tree (MST)</b> of the cities.</li>
<li>Walk around the tree (a Depth-First Search (DFS) from the start), which traverses every tree edge twice.</li>
<li>Take <b>shortcuts</b>: skip any city already visited. What remains is exactly the DFS <b>preorder</b>, then back to the start.</li>
</ol>
<p>To make the answer unique, follow these rules: build the MST with <b>Prim's algorithm starting from city 0</b> (when fringe vertices tie,
take the smallest index; change a vertex's parent only for a <i>strictly</i> shorter edge); then run the DFS from 0 visiting each vertex's
tree children in <b>increasing index order</b>. Input: symmetric distance matrix <code>D</code>, n ≥ 1. Return the tour as a list of
<code>n + 1</code> cities starting and ending with 0.</p>`,
  entry: "TwiceAroundTree",
  params: ["D"],
  tests: [
    { args: [PackG.levitin5], expect: [0, 1, 2, 3, 4, 0], explain: "Levitin's example: MST edges 0–1, 1–2, 1–3, 3–4. The walk 0,1,2,1,3,4,3,1,0 shortcut to 0,1,2,3,4,0 (length 39)." },
    { args: [PackG.small4], expect: [0, 1, 2, 3, 0], explain: "MST is the path 0–1–2–3; its preorder is the tour." },
    { args: [[[0, 2, 3, 3], [2, 0, 4, 4], [3, 4, 0, 5], [3, 4, 5, 0]]], expect: [0, 1, 2, 3, 0], name: "Star MST", explain: "Every city hangs off city 0 in the MST; children are visited in index order 1, 2, 3." },
    { args: [[[0]]], expect: [0, 0], name: "One city" },
    { args: [[[0, 5], [5, 0]]], expect: [0, 1, 0], name: "Two cities" },
    { args: [[[0, 1, 5, 6, 7], [1, 0, 4, 2, 6], [5, 4, 0, 3, 8], [6, 2, 3, 0, 9], [7, 6, 8, 9, 0]]], expect: [0, 1, 3, 2, 4, 0], explain: "MST: 0–1, 1–3, 3–2, 1–4. Preorder from 0: 0, 1, then 1’s children in index order — 3 (with its child 2), then 4." },
  ],
  random: { count: 20, gen: (r, i) => [PackG.randomDist(r, r.int(2, 9))] },
  reference: (D) => PackG.twiceAround(D),
  mutants: [
    { fn: (D) => PackG.twiceAround(D, "full"), hint: "You returned the full walk around the tree (cities repeat). Step 3 takes shortcuts: keep only the FIRST visit of each city (the preorder), then append 0." },
    { fn: (D) => PackG.twiceAround(D, "post"), hint: "Your cities come out in postorder (children before parents). Record a city when you ARRIVE at it — preorder — so the tour starts 0, then its first child, …" },
    { fn: (D) => PackG.nearestNeighbor(D), hint: "This is the nearest-neighbor tour. Twice-around-the-tree first builds a Minimum Spanning Tree (Prim from city 0) and then lists its vertices in DFS preorder." },
  ],
  hints: [
    "Why is an MST a good skeleton for a tour? (Delete one edge from any tour and you get a spanning tree — so MST weight ≤ optimal tour.)",
    "Step 1: Prim from 0 on the matrix, recording parent[v] for every v. Step 2: a recursive Walk(u) that appends u, then calls Walk(v) for every v with parent[v] = u, in increasing v.",
    "Prim in O(n²): dist[0] ← 0, others ∞; n times pick the unfinished u with smallest dist (smallest index on ties), mark it, and for each unfinished v with D[u][v] < dist[v] set dist[v] ← D[u][v], parent[v] ← u.",
  ],
  starter: {
    pseudo: `ALGORITHM TwiceAroundTree(D[0..n-1])
    parent ← Prim(D)
    tour ← []
    Walk(parent, 0, tour)
    append(tour, 0)
    return tour

ALGORITHM Prim(D[0..n-1])
    // Output: parent[v] = MST neighbor of v toward city 0 (parent[0] = -1)
    ...

ALGORITHM Walk(parent, u, tour)
    ...`,
    js: `function TwiceAroundTree(D) {
  const n = D.length;
  // 1) Prim from 0  2) DFS preorder, children in increasing index  3) back to 0
}`,
  },
  solution: {
    pseudo: `ALGORITHM TwiceAroundTree(D[0..n-1])
    parent ← Prim(D)
    tour ← []
    Walk(parent, 0, tour)
    append(tour, 0)
    return tour

ALGORITHM Prim(D[0..n-1])
    inTree ← array(n, false)
    dist ← array(n, ∞)
    parent ← array(n, -1)
    dist[0] ← 0
    for k ← 1 to n do
        u ← -1
        for v ← 0 to n - 1 do
            if not inTree[v] and (u = -1 or dist[v] < dist[u]) then
                u ← v
        inTree[u] ← true
        for v ← 0 to n - 1 do
            if not inTree[v] and D[u][v] < dist[v] then
                dist[v] ← D[u][v]
                parent[v] ← u
    return parent

ALGORITHM Walk(parent, u, tour)
    append(tour, u)
    for v ← 0 to length(parent) - 1 do
        if parent[v] = u then
            Walk(parent, v, tour)`,
    js: `function TwiceAroundTree(D) {
  const n = D.length, inTree = Array(n).fill(false), dist = Array(n).fill(Infinity), parent = Array(n).fill(-1);
  dist[0] = 0;
  for (let k = 0; k < n; k++) {
    let u = -1;
    for (let v = 0; v < n; v++) if (!inTree[v] && (u === -1 || dist[v] < dist[u])) u = v;
    inTree[u] = true;
    for (let v = 0; v < n; v++) if (!inTree[v] && D[u][v] < dist[v]) { dist[v] = D[u][v]; parent[v] = u; }
  }
  const tour = [];
  const walk = (u) => { tour.push(u); for (let v = 0; v < n; v++) if (parent[v] === u) walk(v); };
  walk(0);
  tour.push(0);
  return tour;
}`,
    python: `def twice_around_tree(D):
    n = len(D)
    in_tree, dist, parent = [False] * n, [float("inf")] * n, [-1] * n
    dist[0] = 0
    for _ in range(n):
        u = min((v for v in range(n) if not in_tree[v]), key=lambda v: (dist[v], v))
        in_tree[u] = True
        for v in range(n):
            if not in_tree[v] and D[u][v] < dist[v]:
                dist[v], parent[v] = D[u][v], u
    tour = []
    def walk(u):
        tour.append(u)
        for v in range(n):
            if parent[v] == u:
                walk(v)
    walk(0)
    return tour + [0]`,
    explain: "Prim with a matrix is Θ(n²) and the walk (scanning parent[] at each vertex) is Θ(n²), so the whole algorithm is Θ(n²). Why ratio 2: MST ≤ optimal tour (drop an edge of the tour), the walk costs 2·MST, and with the triangle inequality each shortcut never makes it longer.",
  },
  complexity: "Θ(n²) with a distance matrix",
  followUp: "Christofides' algorithm adds a minimum-weight perfect matching on the MST's odd-degree vertices and gets ratio 1.5 (Levitin §12.3) — for decades the best guarantee known for metric TSP.",
  distractors: ["if not inTree[v] and D[u][v] ≤ dist[v] then", "dist[v] ← dist[u] + D[u][v]"],
  visual: "sims/tsp-approx.html",
  lesson: "lessons/12-coping-with-limitations/README.md",
});

PackG.greedyKnap = function (w, v, W, variant) {
  const n = w.length, idx = [...Array(n).keys()];
  const key = variant === "byValue" ? (i) => v[i] : (i) => v[i] / w[i];
  idx.sort((a, b) => key(b) - key(a) || a - b);
  let load = 0, value = 0, best1 = 0;
  for (const i of idx) {
    if (load + w[i] <= W) { load += w[i]; value += v[i]; }
    else if (variant === "stop") break;
  }
  for (let i = 0; i < n; i++) if ((variant === "anySingle" || w[i] <= W) && v[i] > best1) best1 = v[i];
  return variant === "plain" ? value : Math.max(value, best1);
};

ForgeProblems.add({
  id: "knapsack-greedy-approx",
  title: "Enhanced Greedy Knapsack (2-Approximation)",
  level: 5, chapter: 12, difficulty: 2,
  topics: ["approximation", "knapsack", "greedy", "performance ratio"],
  strategy: "Greedy by value-to-weight ratio + best single item",
  source: "Levitin §12.3 (greedy algorithms for the knapsack problem)",
  summary: "Greedy by value/weight, then return the better of that and the most valuable single item that fits.",
  statement: `
<p>The 0/1 knapsack problem is Nondeterministic Polynomial (NP)-hard. A natural greedy idea — take items in decreasing order of <b>value-to-weight ratio</b>,
skipping any that don't fit — can be arbitrarily bad: with capacity W, items (weight 1, value 2) and (weight W, value W),
it takes the first item and scores 2 while the optimum is W (Levitin §12.3).</p>
<p>A tiny fix gives a guarantee: return the <b>better</b> of (a) the greedy total and (b) the value of the single most valuable
item that fits by itself. This <b>enhanced greedy</b> is never worse than half the optimum.</p>
<p>Input: weights <code>w[0..n-1]</code>, values <code>v[0..n-1]</code> (positive integers) and capacity <code>W ≥ 0</code>.
Process items in nonincreasing order of <code>v[i]/w[i]</code>; on equal ratios, the smaller index goes first. Return the
enhanced greedy's total value (a number).</p>`,
  entry: "GreedyKnapsack",
  params: ["w", "v", "W"],
  tests: [
    { args: [[7, 3, 4, 5], [42, 12, 40, 25], 10], expect: 65, explain: "Ratios 6, 4, 10, 5 → order items 2, 0, 3, 1. Take item 2 (w 4), skip item 0 (w 7 won't fit), take item 3 (w 5), skip item 1: value 65 — optimal here." },
    { args: [[1, 10], [2, 10], 10], expect: 10, name: "Why 'enhanced'", explain: "Plain greedy takes the ratio-2 item and then can't fit the other: 2. The best single item is worth 10." },
    { args: [[5, 4, 3], [10, 40, 30], 4], expect: 40, explain: "Only items 1 and 2 could fit; ratio order is 1 (10), 2 (10) — a tie, so item 1 goes first and fills the knapsack." },
    { args: [[1, 20], [2, 50], 10], expect: 2, name: "Big item doesn't fit", explain: "The most valuable item (50) weighs 20 > 10, so it can't be the single-item answer." },
    { args: [[4, 4, 4], [5, 5, 5], 3], expect: 0, name: "Nothing fits" },
    { args: [[2, 3, 4, 5], [3, 4, 5, 6], 5], expect: 7, explain: "Greedy takes items 0 and 1 (ratios 1.5, 1.33): value 7." },
    { args: [[6, 5, 5], [30, 20, 20], 10], expect: 30, explain: "Greedy takes item 0 (ratio 5) and nothing else fits: 30, while the optimum is 40 (items 1 + 2) — within the factor-2 guarantee." },
  ],
  random: {
    count: 25,
    gen: (r, i) => { const n = r.int(1, 8); return [r.array(n, 1, 20), r.array(n, 1, 40), r.int(0, 40)]; },
  },
  reference: (w, v, W) => PackG.greedyKnap(w, v, W),
  mutants: [
    { fn: (w, v, W) => PackG.greedyKnap(w, v, W, "plain"), hint: "That's the plain greedy total. The enhanced version also computes the most valuable single item that fits (w[i] ≤ W) and returns the larger of the two." },
    { fn: (w, v, W) => PackG.greedyKnap(w, v, W, "stop"), hint: "You stop at the first item that doesn't fit. Greedy just SKIPS it and keeps going — a later, lighter item may still fit." },
    { fn: (w, v, W) => PackG.greedyKnap(w, v, W, "byValue"), hint: "You're ordering items by value. Order them by value-to-weight ratio v[i]/w[i] — the payoff per unit of capacity." },
    { fn: (w, v, W) => PackG.greedyKnap(w, v, W, "anySingle"), hint: "Your 'best single item' can be an item that is heavier than the knapsack. Only consider items with w[i] ≤ W." },
  ],
  hints: [
    "Plain greedy can be fooled by one tiny, high-ratio item that blocks a huge valuable one. What cheap second answer would rescue that case?",
    "Build a list of [−v[i]/w[i], i] pairs and sort it (so larger ratios and then smaller indices come first). Walk it, adding every item that still fits. Separately find the most valuable item with w[i] ≤ W.",
    "Return max(greedyValue, bestSingle). Initialize both to 0 so 'nothing fits' returns 0.",
  ],
  starter: {
    pseudo: `ALGORITHM GreedyKnapsack(w[0..n-1], v[0..n-1], W)
    order ← []
    for i ← 0 to n - 1 do
        append(order, [-v[i] / w[i], i])
    order ← sorted(order)
    ...`,
    js: `function GreedyKnapsack(w, v, W) {
  // greedy by v/w (ties: smaller index first), then compare with the best single item that fits
}`,
  },
  solution: {
    pseudo: `ALGORITHM GreedyKnapsack(w[0..n-1], v[0..n-1], W)
    order ← []
    for i ← 0 to n - 1 do
        append(order, [-v[i] / w[i], i])
    order ← sorted(order)
    load ← 0
    value ← 0
    for (r, i) in order do
        if load + w[i] ≤ W then
            load ← load + w[i]
            value ← value + v[i]
    best ← 0
    for i ← 0 to n - 1 do
        if w[i] ≤ W and v[i] > best then
            best ← v[i]
    return max(value, best)`,
    js: `function GreedyKnapsack(w, v, W) {
  const order = w.map((_, i) => i).sort((a, b) => v[b] / w[b] - v[a] / w[a] || a - b);
  let load = 0, value = 0, best = 0;
  for (const i of order) if (load + w[i] <= W) { load += w[i]; value += v[i]; }
  for (let i = 0; i < w.length; i++) if (w[i] <= W && v[i] > best) best = v[i];
  return Math.max(value, best);
}`,
    python: `def greedy_knapsack(w, v, W):
    order = sorted(range(len(w)), key=lambda i: (-v[i] / w[i], i))
    load = value = 0
    for i in order:
        if load + w[i] <= W:
            load += w[i]
            value += v[i]
    best = max([v[i] for i in range(len(w)) if w[i] <= W], default=0)
    return max(value, best)`,
    explain: "Sorting dominates: Θ(n log n). Why ratio 2: the greedy prefix plus the first item that didn't fit is worth at least the fractional optimum, which is ≥ the true optimum OPT; that one item is ≤ bestSingle, so greedy + bestSingle ≥ OPT and the larger of the two is ≥ OPT/2.",
  },
  complexity: "Θ(n log n)",
  followUp: "Sahni's approximation scheme tries every subset of ≤ k items and completes each greedily, reaching ratio 1 + 1/k in O(k·n^(k+1)); fully polynomial schemes scale values down and run the Dynamic Programming (DP) algorithm — trading accuracy for speed on a dial.",
  distractors: ["if load + w[i] > W then break", "append(order, [-v[i], i])"],
  visual: "sims/greedy-choices.html",
  lesson: "lessons/12-coping-with-limitations/README.md",
});

PackG.firstFit = function (s, C, variant) {
  const loads = [], bin = [];
  for (let i = 0; i < s.length; i++) {
    let j;
    if (variant === "next") { j = loads.length - 1; if (j < 0 || loads[j] + s[i] > C) j = loads.length; }
    else if (variant === "best") { j = -1; for (let k = 0; k < loads.length; k++) if (loads[k] + s[i] <= C && (j === -1 || loads[k] > loads[j])) j = k; if (j === -1) j = loads.length; }
    else { j = 0; while (j < loads.length && (variant === "strict" ? loads[j] + s[i] >= C : loads[j] + s[i] > C)) j++; }
    if (j === loads.length) loads.push(0);
    loads[j] += s[i];
    bin.push(j);
  }
  return bin;
};

ForgeProblems.add({
  id: "bin-packing-first-fit",
  title: "Bin Packing: First Fit",
  level: 5, chapter: 12, difficulty: 1,
  topics: ["approximation", "bin packing", "online algorithms", "greedy"],
  strategy: "Greedy (first bin with room)",
  source: "Levitin Exercise 12.3.7 (first-fit)",
  summary: "Place each item, in the given order, into the first bin with enough room; open a new bin if none fits.",
  statement: `
<p><b>Bin packing</b> — pack items into as few equal-capacity bins as possible — is Nondeterministic Polynomial (NP)-hard; think of virtual machines (VMs) onto servers or files onto
disks. <b>First Fit (FF)</b> is the classic fast heuristic: take the items <b>in the order given</b> and put each one into the
<b>first</b> (lowest-numbered) bin that still has room; if none has room, open a new bin at the end.</p>
<p>Input: item sizes <code>s[0..n-1]</code> (integers, 1 ≤ s[i] ≤ C) and the bin capacity <code>C</code>. A bin can be filled
<b>exactly</b> to C. Return a list <code>bin</code> where <code>bin[i]</code> is the 0-based bin number item i went into.
(The number of bins used is <code>max(bin) + 1</code>.)</p>`,
  entry: "FirstFit",
  params: ["s", "C"],
  tests: [
    { args: [[4, 2, 6, 7], 10], expect: [0, 0, 1, 2], explain: "The classic example (sizes 0.4, 0.2, 0.6, 0.7 scaled by 10): 4 and 2 share bin 0, then 6 and 7 each need a new bin — 3 bins, one more than optimal." },
    { args: [[5, 5, 5, 5], 10], expect: [0, 0, 1, 1], name: "Exact fill", explain: "5 + 5 = 10 fits exactly — a full bin is allowed." },
    { args: [[6, 5, 4, 3], 10], expect: [0, 1, 0, 1], explain: "4 goes back to bin 0 (the FIRST bin with room), not just the newest bin." },
    { args: [[5, 7, 3, 2], 10], expect: [0, 1, 0, 0], explain: "3 fits in both bins; First Fit picks bin 0 even though bin 1 would be a tighter fit." },
    { args: [[10], 10], expect: [0] },
    { args: [[], 10], expect: [], name: "No items" },
    { args: [[4, 7, 2, 1, 5], 10], expect: [0, 1, 0, 0, 2], explain: "Levitin Exercise 12.3.7a's instance (scaled by 10): First Fit uses 3 bins, yet {4, 5, 1} and {7, 2} show that 2 are enough." },
    { args: [[2, 5, 4, 7, 1, 3, 8], 10], expect: [0, 0, 1, 2, 0, 1, 3] },
    { args: [[1, 1, 1, 1, 1], 2], expect: [0, 0, 1, 1, 2] },
  ],
  random: {
    count: 25,
    gen: (r, i) => { const C = r.pick([5, 10, 12, 20]); return [r.array(r.int(1, 14), 1, C), C]; },
  },
  reference: (s, C) => PackG.firstFit(s, C),
  mutants: [
    { fn: (s, C) => PackG.firstFit(s, C, "next"), hint: "You only try the most recently opened bin (that's 'Next Fit'). First Fit scans ALL open bins from bin 0 and uses the first one with room." },
    { fn: (s, C) => PackG.firstFit(s, C, "best"), hint: "You pick the fullest bin that still fits ('Best Fit'). First Fit simply takes the lowest-numbered bin with enough room." },
    { fn: (s, C) => PackG.firstFit(s, C, "strict"), hint: "A bin may be filled exactly to its capacity: an item fits when load + s[i] ≤ C, not only when it's < C." },
  ],
  hints: [
    "Keep a list loads[] with the current fill level of each open bin. For a new item, which bin do you look at first?",
    "For item i: j ← 0; while j < number of bins and loads[j] + s[i] > C, move to the next bin. If j ran past the last bin, open a new one (append a 0 to loads).",
    "Then loads[j] ← loads[j] + s[i] and bin[i] ← j.",
  ],
  starter: {
    pseudo: `ALGORITHM FirstFit(s[0..n-1], C)
    loads ← []
    bin ← array(n, -1)
    for i ← 0 to n - 1 do
        ...
    return bin`,
    js: `function FirstFit(s, C) {
  const loads = [], bin = [];
  // place each item into the first bin with room
  return bin;
}`,
  },
  solution: {
    pseudo: `ALGORITHM FirstFit(s[0..n-1], C)
    loads ← []
    bin ← array(n, -1)
    for i ← 0 to n - 1 do
        j ← 0
        while j < length(loads) and loads[j] + s[i] > C do
            j ← j + 1
        if j = length(loads) then
            append(loads, 0)
        loads[j] ← loads[j] + s[i]
        bin[i] ← j
    return bin`,
    js: `function FirstFit(s, C) {
  const loads = [], bin = [];
  for (const x of s) {
    let j = 0;
    while (j < loads.length && loads[j] + x > C) j++;
    if (j === loads.length) loads.push(0);
    loads[j] += x;
    bin.push(j);
  }
  return bin;
}`,
    python: `def first_fit(s, C):
    loads, bins = [], []
    for x in s:
        j = 0
        while j < len(loads) and loads[j] + x > C:
            j += 1
        if j == len(loads):
            loads.append(0)
        loads[j] += x
        bins.append(j)
    return bins`,
    explain: "Each item may scan every open bin, so the simple version is O(n²) (a tournament tree over bin loads makes it O(n log n)). First Fit never uses more than about 1.7 × the optimal number of bins, and in experiments it is usually within a few percent of optimal.",
  },
  complexity: "O(n²) (O(n log n) with a tree over bin loads)",
  followUp: "First Fit is an ONLINE algorithm — it never needs to see future items, which is exactly the situation of a cloud scheduler placing VMs as requests arrive.",
  distractors: ["while j < length(loads) and loads[j] + s[i] ≥ C do", "j ← length(loads) - 1"],
  visual: "sims/bin-packing.html",
  lesson: "lessons/12-coping-with-limitations/README.md",
});

PackG.ffd = function (s, C, variant) {
  let t = s.slice();
  if (variant === "asc") t.sort((a, b) => a - b); else if (variant !== "unsorted") t.sort((a, b) => b - a);
  const loads = [], bins = [];
  for (const x of t) {
    let j;
    if (variant === "next") { j = loads.length - 1; if (j < 0 || loads[j] + x > C) j = loads.length; }
    else { j = 0; while (j < loads.length && loads[j] + x > C) j++; }
    if (j === loads.length) { loads.push(0); bins.push([]); }
    loads[j] += x; bins[j].push(x);
  }
  return bins;
};

ForgeProblems.add({
  id: "bin-packing-ffd",
  title: "Bin Packing: First Fit Decreasing",
  level: 5, chapter: 12, difficulty: 2,
  topics: ["approximation", "bin packing", "sorting", "greedy"],
  strategy: "Presort (transform) + First Fit",
  source: "Levitin Exercise 12.3.8 (first-fit decreasing)",
  summary: "Sort the items from largest to smallest, then run First Fit; return the contents of each bin.",
  statement: `
<p><b>First Fit Decreasing (FFD)</b> improves First Fit with one transform: <b>sort the items in decreasing order</b> first, then place
each into the first bin with room (opening a new bin when needed). Big items get placed while there is still flexibility, and
small items fill the gaps. FFD never uses more than about 1.22 × OPT + 1 bins, where OPT is the optimal number of bins.</p>
<p>Input: sizes <code>s[0..n-1]</code> (integers, 1 ≤ s[i] ≤ C) and capacity <code>C</code>; a bin may be filled exactly to C.
Return the bins in the order they were opened, each as the <b>list of item sizes in the order they were placed</b>, e.g.
<code>[[7, 2], [6, 4]]</code>.</p>`,
  entry: "FirstFitDecreasing",
  params: ["s", "C"],
  tests: [
    { args: [[4, 2, 6, 7], 10], expect: [[7, 2], [6, 4]], explain: "Sorted: 7, 6, 4, 2. 4 joins 6 exactly (10), 2 joins 7. Two bins — First Fit on the original order needed three." },
    { args: [[4, 7, 2, 1, 5], 10], expect: [[7, 2, 1], [5, 4]], explain: "Levitin Exercise 12.3.8a's instance (scaled by 10): 2 bins — optimal, where First Fit needed 3." },
    { args: [[2, 5, 4, 7, 1, 3, 8], 10], expect: [[8, 2], [7, 3], [5, 4, 1]], explain: "3 bins for a total of 30 — optimal." },
    { args: [[3, 3, 3, 3, 3, 3], 9], expect: [[3, 3, 3], [3, 3, 3]] },
    { args: [[], 10], expect: [], name: "No items" },
    { args: [[10, 10], 10], expect: [[10], [10]], name: "Full bins" },
    { args: [[1, 1, 1, 5, 5, 5], 6], expect: [[5, 1], [5, 1], [5, 1]], explain: "Unsorted First Fit would put the three 1s together first and then need 4 bins." },
    { args: [[4, 4, 3, 3, 3, 3], 10], expect: [[4, 4], [3, 3, 3], [3]], explain: "FFD isn't always optimal: {4, 3, 3} twice uses only 2 bins." },
  ],
  random: {
    count: 25,
    gen: (r, i) => { const C = r.pick([5, 10, 12, 20]); return [r.array(r.int(1, 14), 1, C), C]; },
  },
  reference: (s, C) => PackG.ffd(s, C),
  mutants: [
    { fn: (s, C) => PackG.ffd(s, C, "unsorted"), hint: "You're packing in the original order — that's plain First Fit. FFD sorts the sizes in DECREASING order first." },
    { fn: (s, C) => PackG.ffd(s, C, "asc"), hint: "You sorted from smallest to largest. FFD places the LARGEST items first (decreasing order), so small items can fill the leftover gaps." },
    { fn: (s, C) => PackG.ffd(s, C, "next"), hint: "After sorting you only try the newest bin (Next Fit Decreasing). First Fit scans every open bin from the first one." },
  ],
  hints: [
    "Which items are hardest to place — big or small? Which should you place while all the bins are still fairly empty?",
    "t ← sorted(s) gives increasing order; walk it from the END (i from n − 1 downto 0) to get decreasing order. Then do exactly what First Fit does, keeping loads[] and bins[].",
    "When no open bin fits: append(loads, 0) and append(bins, []). Then loads[j] ← loads[j] + t[i] and append(bins[j], t[i]).",
  ],
  starter: {
    pseudo: `ALGORITHM FirstFitDecreasing(s[0..n-1], C)
    t ← sorted(s)
    bins ← []
    loads ← []
    ...
    return bins`,
    js: `function FirstFitDecreasing(s, C) {
  const bins = [], loads = [];
  // sort decreasing, then First Fit
  return bins;
}`,
  },
  solution: {
    pseudo: `ALGORITHM FirstFitDecreasing(s[0..n-1], C)
    t ← sorted(s)
    bins ← []
    loads ← []
    for i ← n - 1 downto 0 do
        j ← 0
        while j < length(loads) and loads[j] + t[i] > C do
            j ← j + 1
        if j = length(loads) then
            append(loads, 0)
            append(bins, [])
        loads[j] ← loads[j] + t[i]
        append(bins[j], t[i])
    return bins`,
    js: `function FirstFitDecreasing(s, C) {
  const t = s.slice().sort((a, b) => b - a), bins = [], loads = [];
  for (const x of t) {
    let j = 0;
    while (j < loads.length && loads[j] + x > C) j++;
    if (j === loads.length) { loads.push(0); bins.push([]); }
    loads[j] += x;
    bins[j].push(x);
  }
  return bins;
}`,
    python: `def first_fit_decreasing(s, C):
    bins, loads = [], []
    for x in sorted(s, reverse=True):
        j = 0
        while j < len(loads) and loads[j] + x > C:
            j += 1
        if j == len(loads):
            loads.append(0)
            bins.append([])
        loads[j] += x
        bins[j].append(x)
    return bins`,
    explain: "Θ(n log n) to sort plus O(n²) for the First Fit scans. Sorting is a transform-and-conquer step (Ch 6) that buys a much better guarantee: FFD uses at most 11/9·OPT + 6/9 bins, versus about 1.7·OPT for First Fit on arbitrary orders.",
  },
  complexity: "O(n²) (Θ(n log n) sort + First Fit)",
  followUp: "FFD needs all items up front (it's OFFLINE). Batch schedulers and cutting-stock software use it — or FFD as a starting point for local search — when the whole workload is known in advance.",
  distractors: ["for i ← 0 to n - 1 do", "j ← length(loads) - 1"],
  visual: "sims/bin-packing.html",
  lesson: "lessons/12-coping-with-limitations/README.md",
});

/* ======================================================================
   Chapter 12 — Branch-and-bound
   ====================================================================== */

PackG.assignDP = function (C) {
  const n = C.length, dp = Array(1 << n).fill(Infinity);
  dp[0] = 0;
  for (let mask = 0; mask < 1 << n; mask++) {
    if (dp[mask] === Infinity) continue;
    let row = 0; for (let m = mask; m; m &= m - 1) row++;
    if (row === n) continue;
    for (let j = 0; j < n; j++) if (!(mask & (1 << j))) dp[mask | (1 << j)] = Math.min(dp[mask | (1 << j)], dp[mask] + C[row][j]);
  }
  return dp[(1 << n) - 1];
};
PackG.assignMut = function (C, variant) {
  const n = C.length;
  if (variant === "greedy") { const used = Array(n).fill(false); let s = 0; for (let i = 0; i < n; i++) { let b = -1; for (let j = 0; j < n; j++) if (!used[j] && (b === -1 || C[i][j] < C[i][b])) b = j; used[b] = true; s += C[i][b]; } return s; }
  if (variant === "noUsed") return C.reduce((s, row) => s + Math.min(...row), 0);
  // "offByOne": best-first, but children are keyed by Bound(row, …) instead of Bound(row + 1, …)
  const bound = (row, cost, used) => { let lb = cost; for (let i = row; i < n; i++) { let m = Infinity; for (let j = 0; j < n; j++) if (!used[j] && C[i][j] < m) m = C[i][j]; lb += m; } return lb; };
  const Q = [{ lb: bound(0, 0, Array(n).fill(false)), row: 0, cost: 0, used: Array(n).fill(false), seq: 0 }];
  let seq = 1;
  let pops = 0;
  while (Q.length) {
    if (++pops > 800) return -1; // a learner's version would hit the step limit here
    Q.sort((a, b) => a.lb - b.lb || a.seq - b.seq);
    const x = Q.shift();
    if (x.row === n) return x.cost;
    for (let j = 0; j < n; j++) if (!x.used[j]) {
      const u = x.used.slice(); u[j] = true;
      const c = x.cost + C[x.row][j];
      Q.push({ lb: bound(x.row, c, u), row: x.row + 1, cost: c, used: u, seq: seq++ });
    }
  }
  return 0;
};
PackG.levitinAssign = [[9, 2, 7, 8], [6, 4, 3, 7], [5, 8, 1, 8], [7, 6, 9, 4]];
PackG.assign9a = [[19, 13, 27, 25, 7, 9, 28, 33, 12], [2, 3, 25, 16, 5, 8, 14, 17, 37], [23, 1, 9, 12, 32, 39, 38, 31, 12], [11, 17, 12, 27, 34, 13, 37, 4, 2], [14, 31, 30, 16, 39, 28, 26, 15, 2], [40, 8, 39, 34, 11, 20, 8, 40, 25], [35, 31, 24, 19, 21, 32, 31, 24, 27], [39, 15, 1, 8, 4, 39, 38, 7, 7], [20, 24, 12, 38, 36, 1, 39, 25, 36]];
PackG.assign9b = [[10, 24, 23, 1, 37, 35, 39, 32, 2], [39, 38, 20, 19, 1, 10, 34, 37, 23], [8, 4, 20, 40, 34, 9, 13, 29, 35], [8, 25, 38, 2, 23, 6, 26, 25, 9], [10, 13, 7, 37, 15, 3, 16, 15, 37], [34, 26, 30, 15, 10, 20, 10, 3, 5], [39, 6, 33, 40, 5, 7, 8, 13, 37], [4, 12, 2, 24, 24, 40, 15, 21, 24], [27, 36, 21, 17, 27, 30, 6, 14, 17]];

ForgeProblems.add({
  id: "assignment-branch-bound",
  title: "Assignment Problem by Branch-and-Bound",
  level: 6, chapter: 12, difficulty: 3,
  topics: ["branch-and-bound", "assignment problem", "priority queue", "lower bounds"],
  strategy: "Best-first branch-and-bound",
  source: "Levitin §12.2 (assignment problem)",
  summary: "Assign n people to n jobs at minimum total cost, pruning with a row-minimum lower bound.",
  statement: `
<p><b>Branch-and-bound</b> is backtracking for optimization: every node of the state-space tree gets a <b>bound</b> on the best
value any completion could reach, and nodes whose bound can't beat the best known solution are cut (Levitin §12.2).</p>
<p><b>Assignment problem:</b> <code>C[i][j]</code> is the cost of giving job <code>j</code> to person <code>i</code> (an n×n matrix, 1 ≤ n ≤ 9).
Each person gets exactly one job and each job one person. Return the <b>minimum total cost</b>.</p>
<p>Levitin's lower bound for a node where persons <code>0..row−1</code> already have jobs: the cost so far <b>plus</b>, for every remaining
person, the cheapest job <i>still free</i>. For Levitin's matrix below, the root bound is 2 + 3 + 1 + 4 = 10.</p>
<pre>        job0 job1 job2 job3
person0   9    2    7    8
person1   6    4    3    7
person2   5    8    1    8
person3   7    6    9    4</pre>
<p><b>Size check:</b> two tests use 9×9 matrices — 9! = 362,880 complete assignments, far more than the step limit allows if you try
them all. Your bound must prune.</p>`,
  entry: "AssignBB",
  params: ["C"],
  tests: [
    { args: [PackG.levitinAssign], expect: 13, explain: "Person 0 → job 1, 1 → job 0, 2 → job 2, 3 → job 3: 2 + 6 + 1 + 4 = 13 (Levitin's example)." },
    { args: [[[5]]], expect: 5, name: "One person" },
    { args: [[[1, 2], [1, 5]]], expect: 3, explain: "Both people prefer job 0; giving it to person 1 and job 1 to person 0 costs 2 + 1 = 3, better than 1 + 5." },
    { args: [[[4, 1, 3], [2, 0, 5], [3, 2, 2]]], expect: 5, explain: "Taking each row's cheapest free job in order would cost 1 + 2 + 2 = 5 here — but see the next test." },
    { args: [[[1, 2, 9], [1, 9, 9], [9, 1, 9]]], expect: 11, name: "Greedy trap", explain: "Row by row, 'cheapest free job' gives person 0 job 0 (1), person 1 job 1 (9) and leaves person 2 with job 2 (9): 19. The optimum 1 + 9 + 1 = 11 gives person 1 job 2 and person 2 job 1." },
    { args: [[[3, 3, 3], [3, 3, 3], [3, 3, 3]]], expect: 9, name: "All equal" },
    { args: [PackG.assign9a], expect: PackG.assignDP(PackG.assign9a), name: "9×9 (prune!)" },
    { args: [PackG.assign9b], expect: PackG.assignDP(PackG.assign9b), name: "9×9 again (prune!)" },
  ],
  random: { count: 20, gen: (r, i) => { const n = r.int(1, 6); return [Array.from({ length: n }, () => r.array(n, 1, 30))]; } },
  reference: (C) => PackG.assignDP(C),
  mutants: [
    { fn: (C) => PackG.assignMut(C, "greedy"), hint: "Giving each person, in order, the cheapest job still free is a greedy guess — it can force a later person into an expensive job. Branch on EVERY free job for the current person and use the bound to cut branches." },
    { fn: (C) => PackG.assignMut(C, "noUsed"), hint: "Your total is just the sum of row minima — several people are getting the same job. Track which jobs are already taken and skip them (in the branching AND in the bound)." },
    { fn: (C) => PackG.assignMut(C, "offByOne"), hint: "Check the row you pass to Bound for a child: after giving person 'row' a job, the child's bound must start at row + 1. Starting at row charges that person a second time, the bound overestimates, and best-first can pop a non-optimal leaf first." },
  ],
  hints: [
    "Any assignment costs at least 'cost so far + the cheapest free job of every remaining person'. How can that number let you skip whole subtrees?",
    "Best-first: a priority queue of nodes (row, cost, used[]) keyed by their lower bound. Repeatedly remove the node with the smallest bound; if row = n it is a complete assignment — and because every other node's bound is at least as big, it is optimal.",
    "Otherwise, for each free job j: u ← copy(used); u[j] ← true; c ← cost + C[row][j]; insert(Q, [row + 1, c, u], Bound(C, row + 1, c, u)). Bound sums, for i ← row..n − 1, the smallest C[i][j] with u[j] false.",
  ],
  starter: {
    pseudo: `ALGORITHM AssignBB(C[0..n-1])
    Q ← priorityQueue()
    used ← array(n, false)
    insert(Q, [0, 0, used], Bound(C, 0, 0, used))
    while not isEmpty(Q) do
        (row, cost, used) ← deleteMin(Q)
        ...

ALGORITHM Bound(C[0..n-1], row, cost, used)
    // cost + cheapest free job for each of persons row..n-1
    ...`,
    js: `function AssignBB(C) {
  const n = C.length;
  // branch-and-bound with the row-minimum lower bound
}`,
  },
  solution: {
    pseudo: `ALGORITHM AssignBB(C[0..n-1])
    Q ← priorityQueue()
    used ← array(n, false)
    insert(Q, [0, 0, used], Bound(C, 0, 0, used))
    while not isEmpty(Q) do
        (row, cost, used) ← deleteMin(Q)
        if row = n then
            return cost
        for j ← 0 to n - 1 do
            if not used[j] then
                u ← copy(used)
                u[j] ← true
                c ← cost + C[row][j]
                insert(Q, [row + 1, c, u], Bound(C, row + 1, c, u))

ALGORITHM Bound(C[0..n-1], row, cost, used)
    lb ← cost
    for i ← row to n - 1 do
        m ← ∞
        for j ← 0 to n - 1 do
            if not used[j] and C[i][j] < m then
                m ← C[i][j]
        lb ← lb + m
    return lb`,
    js: `function AssignBB(C) {
  const n = C.length;
  const bound = (row, cost, used) => {
    let lb = cost;
    for (let i = row; i < n; i++) { let m = Infinity; for (let j = 0; j < n; j++) if (!used[j] && C[i][j] < m) m = C[i][j]; lb += m; }
    return lb;
  };
  const Q = [{ lb: bound(0, 0, Array(n).fill(false)), row: 0, cost: 0, used: Array(n).fill(false) }];
  while (Q.length) {
    let k = 0; for (let t = 1; t < Q.length; t++) if (Q[t].lb < Q[k].lb) k = t;
    const x = Q.splice(k, 1)[0];
    if (x.row === n) return x.cost;
    for (let j = 0; j < n; j++) if (!x.used[j]) {
      const u = x.used.slice(); u[j] = true;
      const c = x.cost + C[x.row][j];
      Q.push({ lb: bound(x.row + 1, c, u), row: x.row + 1, cost: c, used: u });
    }
  }
}`,
    python: `import heapq
def assign_bb(C):
    n = len(C)
    def bound(row, cost, used):
        return cost + sum(min(C[i][j] for j in range(n) if not used[j]) for i in range(row, n))
    start = (False,) * n
    Q = [(bound(0, 0, start), 0, 0, start)]
    while Q:
        lb, row, cost, used = heapq.heappop(Q)
        if row == n:
            return cost
        for j in range(n):
            if not used[j]:
                u = used[:j] + (True,) + used[j + 1:]
                c = cost + C[row][j]
                heapq.heappush(Q, (bound(row + 1, c, u), row + 1, c, u))`,
    explain: "The bound never overestimates (each remaining person must pay at least their cheapest free job), and at a leaf it equals the true cost — so the first leaf removed from the min-priority queue is optimal. The worst case is still n! leaves, but on typical matrices only a few thousand nodes are generated, each costing Θ(n²) for the bound.",
  },
  complexity: "Exponential worst case; each node costs Θ(n²) to bound",
  followUp: "The assignment problem is actually in P (solvable in polynomial time): the Hungarian algorithm solves it in O(n³). Branch-and-bound shines on its Nondeterministic Polynomial (NP)-hard relatives (the Traveling Salesman Problem (TSP), scheduling), where tighter bounds from linear-programming relaxations power commercial Mixed-Integer Programming (MIP) solvers.",
  distractors: ["if not used[j] and C[i][j] > m then", "if row = n - 1 then", "u ← used"],
  visual: "sims/branch-and-bound.html",
  lesson: "lessons/12-coping-with-limitations/README.md",
});

PackG.knapDP = function (w, v, W) {
  const best = Array(W + 1).fill(0);
  for (let i = 0; i < w.length; i++) for (let c = W; c >= w[i]; c--) best[c] = Math.max(best[c], best[c - w[i]] + v[i]);
  return best[W];
};
PackG.knapMut = function (w, v, W, variant) {
  const n = w.length;
  if (variant === "greedy") { const idx = [...Array(n).keys()].sort((a, b) => v[b] / w[b] - v[a] / w[a] || a - b); let load = 0, val = 0; for (const i of idx) if (load + w[i] <= W) { load += w[i]; val += v[i]; } return val; }
  // "unsortedBound": Levitin's bound on the ORIGINAL order (unsafe); "strict": correct search but cw + w < W
  const order = variant === "unsortedBound" ? [...Array(n).keys()] : [...Array(n).keys()].sort((a, b) => v[b] / w[b] - v[a] / w[a]);
  const ww = order.map((i) => w[i]), vv = order.map((i) => v[i]);
  let best = 0;
  const go = (i, cw, cv) => {
    if (cv > best) best = cv;
    if (i === n) return;
    if (cv + (W - cw) * (vv[i] / ww[i]) <= best) return;
    if (variant === "strict" ? cw + ww[i] < W : cw + ww[i] <= W) go(i + 1, cw + ww[i], cv + vv[i]);
    go(i + 1, cw, cv);
  };
  go(0, 0, 0);
  return best;
};
PackG.big30 = { w: [482, 211, 251, 410, 163, 503, 514, 253, 296, 337, 710, 723, 383, 196, 296, 884, 942, 897, 738, 252, 360, 455, 991, 604, 378, 965, 541, 487, 568, 807], v: [782, 274, 976, 234, 188, 407, 198, 217, 111, 377, 111, 709, 480, 153, 630, 154, 441, 173, 467, 403, 542, 592, 597, 868, 454, 497, 221, 772, 817, 828], W: 6238 };
PackG.big26 = { w: [674, 383, 765, 762, 215, 737, 725, 553, 212, 986, 556, 557, 569, 629, 740, 954, 452, 446, 768, 894, 113, 999, 593, 252, 381, 939], v: [679, 403, 789, 789, 240, 722, 716, 565, 190, 977, 566, 552, 590, 619, 721, 965, 474, 463, 752, 895, 85, 999, 571, 271, 383, 947], W: 7927 };

ForgeProblems.add({
  id: "knapsack-branch-bound",
  title: "0/1 Knapsack by Branch-and-Bound",
  level: 6, chapter: 12, difficulty: 3,
  topics: ["branch-and-bound", "knapsack", "upper bounds", "pruning"],
  strategy: "Depth-first branch-and-bound with a ratio-based upper bound",
  source: "Levitin §12.2 (knapsack problem) · Exercise 12.2.5–6",
  summary: "Maximize the value of items that fit in capacity W, pruning nodes whose upper bound can't beat the best so far.",
  statement: `
<p>For a maximization problem, branch-and-bound needs an <b>upper bound</b> on what any completion of a partial solution can reach.
Levitin sorts the items by <b>value-to-weight ratio</b> (best first) and bounds a node that has decided items <code>0..i−1</code>, with
total weight <code>w</code> and value <code>v</code>, by (Levitin §12.2):</p>
<pre>ub = v + (W − w) · (vᵢ / wᵢ)     — fill the remaining room at the best remaining rate</pre>
<p>A tighter bound (Exercise 12.2.6) fills the room with whole items in ratio order and then a <i>fraction</i> of the next one — the
answer to the continuous knapsack. Either bound works here.</p>
<p>Input: weights <code>w[0..n-1]</code>, values <code>v[0..n-1]</code> (positive integers) and capacity <code>W ≥ 0</code>. Return the
<b>maximum total value</b> of a subset whose total weight is ≤ W.</p>
<p><b>Size check:</b> two tests have 26 and 30 items with weights in the hundreds — 2³⁰ ≈ 10⁹ subsets and a 30 × 6,238 table are both
too much for the step limit. Only a pruning search gets through.</p>`,
  entry: "KnapsackBB",
  params: ["w", "v", "W"],
  tests: [
    { args: [[4, 7, 5, 3], [40, 42, 25, 12], 10], expect: 65, explain: "Levitin's instance (already in ratio order 10, 6, 5, 4): items 0 and 2 → weight 9, value 65." },
    { args: [[10, 7, 8, 4], [100, 63, 56, 12], 16], expect: 119, explain: "Levitin Exercise 12.2.5: items 1 and 2 (weight 15) beat the best-ratio item 0." },
    { args: [[3, 4, 5], [30, 50, 60], 8], expect: 90, name: "Exact fill", explain: "3 + 5 = 8 fills the knapsack exactly — that must be allowed." },
    { args: [[5, 6], [10, 20], 0], expect: 0, name: "W = 0" },
    { args: [[9, 12], [50, 70], 8], expect: 0, name: "Nothing fits" },
    { args: [[1, 10], [2, 10], 10], expect: 10, explain: "The high-ratio small item is a trap: the optimum skips it." },
    { args: [[2, 3, 4, 5], [3, 4, 5, 6], 5], expect: 7 },
    { args: [PackG.big30.w, PackG.big30.v, PackG.big30.W], expect: PackG.knapDP(PackG.big30.w, PackG.big30.v, PackG.big30.W), name: "30 items (prune!)" },
    { args: [PackG.big26.w, PackG.big26.v, PackG.big26.W], expect: PackG.knapDP(PackG.big26.w, PackG.big26.v, PackG.big26.W), name: "26 items, value ≈ weight (prune!)" },
  ],
  random: { count: 25, gen: (r, i) => { const n = r.int(1, 10); return [r.array(n, 1, 30), r.array(n, 1, 60), r.int(0, 80)]; } },
  reference: (w, v, W) => PackG.knapDP(w, v, W),
  mutants: [
    { fn: (w, v, W) => PackG.knapMut(w, v, W, "greedy"), hint: "You take items greedily in ratio order and never reconsider. That's only an approximation — branch on BOTH 'take item i' and 'skip item i', and use the upper bound to cut branches." },
    { fn: (w, v, W) => PackG.knapMut(w, v, W, "unsortedBound"), hint: "Your bound uses the next item's ratio, but the items aren't sorted by ratio, so a later item may pay more per unit — the 'bound' underestimates and prunes the optimum. Sort by v/w (descending) first, or use a bound that is valid for any order." },
    { fn: (w, v, W) => PackG.knapMut(w, v, W, "strict"), hint: "An item may exactly fill the knapsack: include it when cw + w[i] ≤ W (not only when it's < W)." },
  ],
  hints: [
    "At a node you've decided items 0..i − 1. What is the most value you could possibly still add with the room left? If even that can't beat the best solution found so far, why keep going?",
    "Sort the items by v/w descending. Explore(i, cw, cv): update best with cv; stop if i = n or Bound(i, cw, cv) ≤ best; otherwise, if item i fits, explore 'take it', then explore 'skip it'.",
    "Keep best in a one-element list (best ← [0]) so every recursive call can update it. Bound(i, cw, cv) = cv + (W − cw)·(ratio of item i) — or the fractional-knapsack fill for a tighter cut.",
  ],
  starter: {
    pseudo: `ALGORITHM KnapsackBB(w[0..n-1], v[0..n-1], W)
    items ← []
    for i ← 0 to n - 1 do
        append(items, [-v[i] / w[i], w[i], v[i]])
    items ← sorted(items)
    best ← [0]
    ...
    return best[0]

ALGORITHM Explore(items, i, cw, cv, W, best)
    ...`,
    js: `function KnapsackBB(w, v, W) {
  // sort by v/w, depth-first branch-and-bound with an upper bound
}`,
  },
  solution: {
    pseudo: `ALGORITHM KnapsackBB(w[0..n-1], v[0..n-1], W)
    items ← []
    for i ← 0 to n - 1 do
        append(items, [-v[i] / w[i], w[i], v[i]])
    items ← sorted(items)
    best ← [0]
    Explore(items, 0, 0, 0, W, best)
    return best[0]

ALGORITHM Explore(items, i, cw, cv, W, best)
    if cv > best[0] then
        best[0] ← cv
    if i = length(items) then
        return
    if cv + (W - cw) * (-items[i][0]) ≤ best[0] then
        return
    if cw + items[i][1] ≤ W then
        Explore(items, i + 1, cw + items[i][1], cv + items[i][2], W, best)
    Explore(items, i + 1, cw, cv, W, best)`,
    js: `function KnapsackBB(w, v, W) {
  const items = w.map((wi, i) => [v[i] / wi, wi, v[i]]).sort((a, b) => b[0] - a[0]);
  let best = 0;
  const explore = (i, cw, cv) => {
    if (cv > best) best = cv;
    if (i === items.length) return;
    if (cv + (W - cw) * items[i][0] <= best) return;
    if (cw + items[i][1] <= W) explore(i + 1, cw + items[i][1], cv + items[i][2]);
    explore(i + 1, cw, cv);
  };
  explore(0, 0, 0);
  return best;
}`,
    python: `def knapsack_bb(w, v, W):
    items = sorted(zip(w, v), key=lambda t: -t[1] / t[0])
    best = 0
    def explore(i, cw, cv):
        nonlocal best
        best = max(best, cv)
        if i == len(items) or cv + (W - cw) * items[i][1] / items[i][0] <= best:
            return
        wi, vi = items[i]
        if cw + wi <= W:
            explore(i + 1, cw + wi, cv + vi)
        explore(i + 1, cw, cv)
    explore(0, 0, 0)
    return best`,
    explain: "Because items are in ratio order, no remaining item pays more than item i per unit of weight, so ub never underestimates — pruning when ub ≤ best is safe. Every node is a feasible subset (Levitin notes this unusual property), so best is updated at every node. Worst case O(2ⁿ); with 'take' explored first a good solution appears early and cuts most of the tree.",
  },
  complexity: "O(2ⁿ) worst case; Θ(n log n) presort",
  followUp: "Swap in the fractional-knapsack bound and 'best-first' order and you have the core of how Mixed-Integer Programming (MIP) solvers work: the linear-programming (LP) relaxation is the bound, branching fixes one variable at a time.",
  distractors: ["if cw + items[i][1] < W then", "if cv + (W - cw) * (-items[i][0]) ≥ best[0] then", "items ← sorted(w)"],
  visual: "sims/branch-and-bound.html",
  lesson: "lessons/12-coping-with-limitations/README.md",
});
