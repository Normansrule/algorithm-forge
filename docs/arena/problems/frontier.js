/* Frontier pack — Chapter 18 "The Frontier".
   Level 7 "Modern Systems & Research Frontier": each problem is the core of a component inside a real standard library,
   database, search engine or distributed system — streaming heavy hitters, Conflict-free Replicated Data Types (CRDTs),
   Raft log replication, jump consistent hashing, Merkle anti-entropy, skip lists, cuckoo hashing and cuckoo filters,
   xor filters, Timsort's merge policy, Blelloch scans, succinct rank/select, MinHash + Locality-Sensitive Hashing (LSH),
   the Number-Theoretic Transform (NTT), Hierarchical Navigable Small World (HNSW) vector search — or an implementable,
   deterministic core of a recent research result: Powersort's node-power merge policy (2018), the CVM distinct-elements
   estimator (2022), ShrinkingCone learned-index segmentation (2019, with the PGM-index context), FindPivots from the 2025
   directed shortest-path breakthrough, and zip trees (2019).
   Level 6 (still Chapter 18): the classic algorithms that sit underneath — galloping search, introsort, 2-SAT via
   strongly connected components, Johnson's all-pairs shortest paths.
   Grading is deterministic: wherever the real system flips a coin or hashes a key, the coin flips / hash values are
   part of the input. The engine has no bitwise operators, so every "xor" or "shift" is re-expressed with div / mod.
   Wrapped in an IIFE so helper names never collide with other problem files (they share one global scope). */
(function () {
  "use strict";

  const LESSON = "lessons/18-the-frontier/README.md";
  const byKey = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

  /* ================================================================== */
  /* 1 · Misra–Gries heavy hitters                                       */
  /* ================================================================== */
  const mgRef = (S, k) => {
    const C = new Map();
    for (const x of S) {
      if (C.has(x)) C.set(x, C.get(x) + 1);
      else if (C.size < k - 1) C.set(x, 1);
      else for (const [y, c] of [...C]) { if (c === 1) C.delete(y); else C.set(y, c - 1); }
    }
    return [...C].sort((a, b) => a[0] - b[0]);
  };
  const mgGen = (r, n, k) => {
    const heavy = r.int(1, 9);
    return [Array.from({ length: n }, () => (r() < 0.4 ? heavy : r.int(1, 12))), k];
  };

  ForgeProblems.add({
    id: "misra-gries-heavy-hitters",
    title: "Misra–Gries Heavy Hitters",
    level: 7, chapter: 18, difficulty: 1,
    topics: ["streaming", "sketches", "heavy hitters", "amortized analysis"],
    strategy: "k − 1 counters + decrement-all",
    source: "Misra & Gries (1982), \"Finding repeated elements\" · Anderson et al. (2017), Apache DataSketches frequent-items sketch",
    summary: "Find every item that could occur more than n/k times in a stream, using only k − 1 counters.",
    statement: `
<p>A network router or a metrics pipeline sees far too many distinct keys to count them all. The <b>Misra–Gries</b> summary keeps
just <code>k − 1</code> counters and still guarantees: <i>every item that occurs more than n/k times in the stream is still in the
summary at the end</i> (its stored count is an underestimate by at most n/k).</p>
<p>Write <code>MisraGries(S, k)</code>. Process the stream <code>S</code> left to right with a map of counters, using exactly this rule
for each item <code>x</code>:</p>
<ul>
<li>if <code>x</code> already has a counter, add 1 to it;</li>
<li>else if fewer than <code>k − 1</code> counters exist, create a counter <code>x ↦ 1</code>;</li>
<li>else <b>decrement every counter</b> by 1 and delete the counters that reach 0 (and <code>x</code> itself is <i>not</i> stored).</li>
</ul>
<p>Return the surviving counters as a list of <code>[item, count]</code> pairs sorted by item.</p>
<ul>
<li>0 ≤ n ≤ 2000, 2 ≤ k ≤ 300, items are integers.</li>
<li><b>Efficiency:</b> the total work must stay Θ(n) even when <code>k</code> grows with n — the grader checks growth with k ≈ n/8.
(Why is that possible? Each decrement-all removes k − 1 units, and only n units were ever added.)</li>
</ul>`,
    entry: "MisraGries",
    params: ["S", "k"],
    tests: [
      { args: [[1, 2, 1, 3, 1, 2, 1], 3], expect: [[1, 3], [2, 1]], explain: "After 1, 2, 1 the two counters are {1:2, 2:1}. Item 3 finds them full: decrement-all leaves {1:1} (2 drops to 0). Then 1, 2, 1 give {1:3, 2:1}. Item 1 occurs 4 > 7/3 times, so it had to survive." },
      { args: [[], 2], expect: [], explain: "An empty stream leaves no counters." },
      { args: [[1, 2, 3, 4, 5, 6], 3], expect: [], explain: "No item occurs more than 6/3 = 2 times, and here every counter is eventually cancelled." },
      { args: [[5, 5, 5, 5], 2], expect: [[5, 4]], explain: "k = 2 is the classic majority-vote algorithm (one counter)." },
      { args: [[7, 3, 7, 9, 7, 3, 8, 7, 7, 2], 4], expect: [[2, 1], [3, 1], [7, 4]] },
      { args: [[1, 2, 3, 1, 4, 5, 6], 3], expect: [[6, 1]], explain: "Item 6 survives although it occurs only once: the summary may keep false positives, but never loses an item with more than n/k copies." },
      { args: [[4, 4, 4, 1, 2, 3, 4, 1, 1], 3], expect: [[1, 1], [4, 2]] },
      { args: [[9, 8, 9, 8, 7, 6, 9], 2], expect: [[9, 1]] },
    ],
    random: { count: 30, gen: (r, i) => mgGen(r, 1 + i * 3, 2 + (i % 5)) },
    reference: mgRef,
    growth: { metric: "steps", sizes: [64, 128, 256, 512, 1024], gen: (r, n) => [Array.from({ length: n }, () => r.int(1, n)), 2 + Math.floor(n / 8)], expect: "n" },
    mutants: [
      { fn: (S, k) => mgRef(S, k + 1), hint: "You keep one counter too many. The summary holds k − 1 counters: a new item starts a counter only while fewer than k − 1 exist." },
      {
        fn: (S, k) => { const C = new Map(); for (const x of S) { if (C.has(x)) C.set(x, C.get(x) + 1); else if (C.size < k - 1) C.set(x, 1); else { for (const [y, c] of [...C]) { if (c === 1) C.delete(y); else C.set(y, c - 1); } C.set(x, 1); } } return [...C].sort((a, b) => a[0] - b[0]); },
        hint: "After a decrement-all you also store the new item with count 1. In Misra–Gries the new item is 'spent' cancelling one unit from every counter — it is not stored.",
      },
      {
        fn: (S, k) => { const C = new Map(); for (const x of S) { if (C.has(x)) C.set(x, C.get(x) + 1); else if (C.size < k - 1) C.set(x, 1); else for (const [y, c] of [...C]) C.set(y, c - 1); } return [...C].sort((a, b) => a[0] - b[0]); },
        hint: "Counters that drop to 0 (or below) are still in your map. Delete a counter the moment it reaches 0 — that frees its slot for the next new item.",
      },
    ],
    hints: [
      "Think of each decrement-all as cancelling k distinct items at once (the new item plus one unit from each of the k − 1 counters). How often can an item with more than n/k copies be fully cancelled?",
      "Use a map C. For each x: increment if present; else create if length(C) < k − 1; else loop over keys(C), subtracting 1 and removing keys that hit 0.",
      "Iterate over a snapshot: for each y in keys(C) do — if C[y] = 1 then remove(C, y) else C[y] ← C[y] − 1. At the end, build the pairs from sorted(keys(C)).",
    ],
    starter: {
      pseudo: `ALGORITHM MisraGries(S[0..n-1], k)
    // Return the surviving [item, count] pairs, sorted by item
    C ← map()
    for each x in S do
        ...
    return ...`,
      js: `function MisraGries(S, k) {
  const C = new Map();
  // ...
  return [];
}`,
    },
    solution: {
      pseudo: `ALGORITHM MisraGries(S[0..n-1], k)
    C ← map()
    for each x in S do
        if contains(C, x) then
            C[x] ← C[x] + 1
        else if length(C) < k - 1 then
            C[x] ← 1
        else
            for each y in keys(C) do
                if C[y] = 1 then
                    remove(C, y)
                else
                    C[y] ← C[y] - 1
    out ← []
    for each y in sorted(keys(C)) do
        append(out, [y, C[y]])
    return out`,
      js: `function MisraGries(S, k) {
  const C = new Map();
  for (const x of S) {
    if (C.has(x)) C.set(x, C.get(x) + 1);
    else if (C.size < k - 1) C.set(x, 1);
    else for (const [y, c] of [...C]) { if (c === 1) C.delete(y); else C.set(y, c - 1); }
  }
  return [...C].sort((a, b) => a[0] - b[0]);
}`,
      python: `def misra_gries(S, k):
    C = {}
    for x in S:
        if x in C:
            C[x] += 1
        elif len(C) < k - 1:
            C[x] = 1
        else:
            for y in list(C):
                C[y] -= 1
                if C[y] == 0:
                    del C[y]
    return [[y, C[y]] for y in sorted(C)]`,
      explain: "Every decrement-all removes k units of 'mass' (k − 1 counters plus the discarded item), so it happens at most n/k times; an item with more than n/k copies can therefore never be fully cancelled. Each decrement-all costs Θ(k) but there are at most n/k of them, so the total work is Θ(n) — an aggregate (amortized) argument.",
    },
    complexity: "Θ(n) time (amortized), Θ(k) space; error ≤ n/k per count",
    followUp: "Apache DataSketches' frequent-items sketch is a tuned Misra–Gries (Anderson et al., 2017), and SpaceSaving (Metwally et al., 2005) is its close cousin used for 'top-k' dashboards. Senior twist: two Misra–Gries summaries can be MERGED (add counters, then subtract the (k)-th largest), which is what makes them work in distributed aggregations.",
    distractors: ["else if length(C) < k then", "remove(C, x)", "if C[y] = 0 then"],
    visual: "sims/bloom-filter.html",
    lesson: LESSON,
  });

  /* ================================================================== */
  /* 2 · PN-Counter CRDT                                                 */
  /* ================================================================== */
  const pnRun = (R, ops, mergeFn, mode) => {
    const P = Array.from({ length: R }, () => Array(R).fill(0)), N = Array.from({ length: R }, () => Array(R).fill(0)), out = [];
    for (const op of ops) {
      const r = op[1];
      if (op[0] === "inc") P[r][r] += op[2];
      else if (op[0] === "dec") { if (mode === "signed") P[r][r] -= op[2]; else N[r][r] += op[2]; }
      else if (op[0] === "merge") mergeFn(P, N, r, op[2], R);
      else out.push(P[r].reduce((a, b) => a + b, 0) - N[r].reduce((a, b) => a + b, 0));
    }
    return out;
  };
  const pnMax = (P, N, a, b, R) => { for (let i = 0; i < R; i++) { P[a][i] = Math.max(P[a][i], P[b][i]); N[a][i] = Math.max(N[a][i], N[b][i]); } };
  const pnRef = (R, ops) => pnRun(R, ops, pnMax);
  const pnGen = (r, R, m) => {
    const ops = [];
    for (let t = 0; t < m; t++) {
      const x = r();
      const a = r.int(0, R - 1);
      if (x < 0.3) ops.push(["inc", a, r.int(1, 9)]);
      else if (x < 0.5) ops.push(["dec", a, r.int(1, 9)]);
      else if (x < 0.8) { let b = r.int(0, R - 1); if (b === a) b = (a + 1) % R; ops.push(["merge", a, b]); }
      else ops.push(["read", a]);
    }
    for (let a = 0; a < R; a++) ops.push(["read", a]);
    return [R, ops];
  };

  ForgeProblems.add({
    id: "crdt-pn-counter",
    title: "Conflict-free Replicated Counter (PN-Counter)",
    level: 7, chapter: 18, difficulty: 1,
    topics: ["distributed systems", "CRDT", "eventual consistency", "replication"],
    strategy: "Per-replica vectors + element-wise max merge (a join semilattice)",
    source: "Shapiro, Preguiça, Baquero & Zawirski (2011), \"Conflict-free Replicated Data Types\" (Symposium on Stabilization, Safety, and Security of Distributed Systems, 2011)",
    summary: "Implement increments, decrements and merges of a PN-Counter so that replicas converge no matter how often or in what order they gossip.",
    statement: `
<p>Geo-replicated databases let every replica accept writes while offline and reconcile later. A <b>Conflict-free Replicated
Data Type (CRDT)</b> makes reconciliation automatic: its <i>merge</i> is commutative, associative and idempotent, so replicas that
have seen the same updates hold the same value — no matter how many times, or in which order, they exchange state.</p>
<p>The <b>Positive–Negative Counter (PN-Counter)</b> supports increment and decrement. Replica <code>r</code> (of <code>R</code> replicas, numbered 0..R−1) stores two
vectors <code>P[r][0..R−1]</code> and <code>N[r][0..R−1]</code>, all zeros at first:</p>
<ul>
<li><code>["inc", r, a]</code>: replica r adds a to its <b>own</b> slot <code>P[r][r]</code>;</li>
<li><code>["dec", r, a]</code>: replica r adds a to its own slot <code>N[r][r]</code>;</li>
<li><code>["merge", r, b]</code>: replica r receives b's full state and sets <code>P[r][i] ← max(P[r][i], P[b][i])</code> and
<code>N[r][i] ← max(N[r][i], N[b][i])</code> for every i (replica b is unchanged);</li>
<li><code>["read", r]</code>: output replica r's value <code>ΣP[r] − ΣN[r]</code>.</li>
</ul>
<p>Write <code>PNCounter(R, ops)</code> returning the list of values output by the <code>read</code> operations, in order.</p>
<ul><li>1 ≤ R ≤ 6, up to 200 operations, amounts 1..9.</li></ul>`,
    entry: "PNCounter",
    params: ["R", "ops"],
    tests: [
      { args: [2, [["inc", 0, 5], ["dec", 1, 2], ["read", 0], ["read", 1], ["merge", 0, 1], ["read", 0], ["merge", 1, 0], ["read", 1]]], expect: [5, -2, 3, 3], explain: "Before gossip each replica only knows its own updates (5 and −2). After merging both ways both read 5 − 2 = 3." },
      { args: [2, [["inc", 0, 3], ["merge", 1, 0], ["merge", 1, 0], ["read", 1]]], expect: [3], explain: "Merging the same state twice changes nothing — merge is idempotent." },
      { args: [1, []], expect: [], explain: "No reads, no output." },
      { args: [2, [["inc", 1, 4], ["inc", 0, 1], ["merge", 1, 0], ["read", 1]]], expect: [5], explain: "Replica 1 keeps its own +4 and learns replica 0's +1." },
      { args: [2, [["inc", 0, 5], ["merge", 1, 0], ["dec", 0, 3], ["merge", 1, 0], ["read", 1], ["read", 0]]], expect: [2, 2], explain: "The decrement lives in N, which only grows, so a max-merge can never 'undo' it." },
      { args: [3, [["inc", 0, 1], ["inc", 1, 2], ["inc", 2, 4], ["merge", 1, 0], ["merge", 2, 1], ["read", 2], ["read", 0], ["dec", 0, 1], ["merge", 2, 0], ["read", 2]]], expect: [7, 1, 6], explain: "Updates travel transitively: replica 2 learns replica 0's +1 through replica 1." },
      { args: [3, [["dec", 2, 6], ["merge", 0, 2], ["merge", 1, 0], ["inc", 1, 1], ["read", 1], ["merge", 2, 1], ["read", 2]]], expect: [-5, -5] },
    ],
    random: { count: 25, gen: (r, i) => pnGen(r, 2 + (i % 4), 6 + i) },
    reference: pnRef,
    mutants: [
      { fn: (R, ops) => pnRun(R, ops, (P, N, a, b) => { for (let i = 0; i < R; i++) { P[a][i] += P[b][i]; N[a][i] += N[b][i]; } }), hint: "Merging the same state twice changes your value. Merge must be idempotent: take the element-wise max of the two vectors, not the sum." },
      { fn: (R, ops) => pnRun(R, ops, (P, N, a, b) => { P[a] = P[b].slice(); N[a] = N[b].slice(); }), hint: "A replica forgets its own updates after a merge. Don't overwrite the receiver's vectors with the sender's — combine them slot by slot." },
      { fn: (R, ops) => pnRun(R, ops, pnMax, "signed"), hint: "Decrements sometimes vanish after a merge. If one vector stores the net value, max-merge prefers the older, larger number. Keep increments (P) and decrements (N) in separate grow-only vectors." },
      { fn: (R, ops) => pnRun(R, ops, (P, N, a, b) => { for (let i = 0; i < R; i++) P[a][i] = Math.max(P[a][i], P[b][i]); }), hint: "Increments propagate but decrements never reach other replicas. Merge must max-merge the N vectors too." },
    ],
    hints: [
      "Why does max-merge work? Each slot P[r][i] only ever grows, and only replica i writes slot i. So the larger of two copies is simply the newer one.",
      "Keep P and N as R × R matrices. inc/dec touch only P[r][r] / N[r][r]. merge loops i from 0 to R − 1 taking max. read sums row r of P minus row r of N.",
      "The merge body is two lines: P[r][i] ← max(P[r][i], P[b][i]) and the same for N.",
    ],
    starter: {
      pseudo: `ALGORITHM PNCounter(R, ops)
    P ← matrix(R, R, 0)
    N ← matrix(R, R, 0)
    out ← []
    for each op in ops do
        r ← op[1]
        ...
    return out`,
      js: `function PNCounter(R, ops) {
  // P[r][i], N[r][i]; return the values of the "read" operations
  return [];
}`,
    },
    solution: {
      pseudo: `ALGORITHM PNCounter(R, ops)
    P ← matrix(R, R, 0)
    N ← matrix(R, R, 0)
    out ← []
    for each op in ops do
        r ← op[1]
        if op[0] = "inc" then
            P[r][r] ← P[r][r] + op[2]
        else if op[0] = "dec" then
            N[r][r] ← N[r][r] + op[2]
        else if op[0] = "merge" then
            for i ← 0 to R - 1 do
                P[r][i] ← max(P[r][i], P[op[2]][i])
                N[r][i] ← max(N[r][i], N[op[2]][i])
        else
            append(out, sum(P[r]) - sum(N[r]))
    return out`,
      js: `function PNCounter(R, ops) {
  const P = Array.from({ length: R }, () => Array(R).fill(0));
  const N = Array.from({ length: R }, () => Array(R).fill(0));
  const out = [];
  for (const op of ops) {
    const r = op[1];
    if (op[0] === "inc") P[r][r] += op[2];
    else if (op[0] === "dec") N[r][r] += op[2];
    else if (op[0] === "merge") for (let i = 0; i < R; i++) { P[r][i] = Math.max(P[r][i], P[op[2]][i]); N[r][i] = Math.max(N[r][i], N[op[2]][i]); }
    else out.push(P[r].reduce((a, b) => a + b, 0) - N[r].reduce((a, b) => a + b, 0));
  }
  return out;
}`,
      python: `def pn_counter(R, ops):
    P = [[0] * R for _ in range(R)]
    N = [[0] * R for _ in range(R)]
    out = []
    for op in ops:
        r = op[1]
        if op[0] == "inc":
            P[r][r] += op[2]
        elif op[0] == "dec":
            N[r][r] += op[2]
        elif op[0] == "merge":
            b = op[2]
            for i in range(R):
                P[r][i] = max(P[r][i], P[b][i])
                N[r][i] = max(N[r][i], N[b][i])
        else:
            out.append(sum(P[r]) - sum(N[r]))
    return out`,
      explain: "States form a join semilattice under element-wise max: merge is commutative, associative and idempotent, and every update only moves a state upward. Hence any two replicas that have (transitively) received the same updates hold identical vectors — strong eventual consistency. Each operation costs Θ(R).",
    },
    complexity: "Θ(1) per inc/dec, Θ(R) per merge and read; Θ(R) state per replica",
    followUp: "Riak's counters, Akka Distributed Data's PNCounter and Redis Enterprise's Active-Active databases ship this exact design. Senior twist: state-based CRDTs send whole vectors; delta-state CRDTs (Almeida et al.) send only the changed slots, and the Observed-Remove Set (OR-Set) extends the idea to add/remove sets.",
    distractors: ["P[r][i] ← P[r][i] + P[op[2]][i]", "P[r] ← copy(P[op[2]])", "P[r][r] ← P[r][r] - op[2]"],
    lesson: LESSON,
  });

  /* ================================================================== */
  /* 3 · Raft leader commit index                                        */
  /* ================================================================== */
  const raftCommitRef = (log, match, term, commitIndex) => {
    const s = match.length, M = match.slice().sort((a, b) => a - b);
    const N = M[s - 1 - Math.floor(s / 2)];
    return N > commitIndex && log[N - 1] === term ? N : commitIndex;
  };
  const raftLogGen = (r, L, term) => {
    const log = []; let t = 1;
    for (let i = 0; i < L; i++) { if (r() < 0.3 && t < term) t += r.int(1, term - t); log.push(t); }
    return log;
  };

  ForgeProblems.add({
    id: "raft-leader-commit",
    title: "Raft: When May the Leader Commit?",
    level: 7, chapter: 18, difficulty: 1,
    topics: ["distributed systems", "consensus", "Raft", "order statistics"],
    strategy: "Majority = median of the match indices + the current-term rule",
    source: "Ongaro & Ousterhout (2014), \"In Search of an Understandable Consensus Algorithm\" (Raft), §5.3–5.4.2 and Figure 8",
    summary: "Given every server's match index, compute the leader's new commit index — including Raft's subtle current-term restriction.",
    statement: `
<p>In <b>Raft</b> (the consensus protocol inside etcd, Consul and many databases) the leader replicates log entries to followers and
tracks <code>matchIndex</code>: the highest log index known to be stored on each server. An entry is <b>committed</b> — safe to apply to
the state machine forever — once it is stored on a majority. But there is a famous trap (the paper's Figure 8): a leader may only
count replicas for an entry <b>from its own current term</b>; older entries become committed indirectly when a newer entry commits.</p>
<p>Write <code>LeaderCommit(log, match, term, commitIndex)</code>:</p>
<ul>
<li><code>log</code>: the leader's log as a list of terms; the entry at (1-based) index i has term <code>log[i − 1]</code>.</li>
<li><code>match[0..s−1]</code>: matchIndex of every server <i>including the leader itself</i> (whose value is <code>length(log)</code>).</li>
<li><code>term</code>: the leader's current term; <code>commitIndex</code>: the current commit index.</li>
</ul>
<p>Return the largest N &gt; commitIndex such that <b>more than half</b> of the s servers have <code>match ≥ N</code> <b>and</b>
<code>log[N − 1] = term</code>; if no such N exists, return <code>commitIndex</code> unchanged (it never decreases).</p>
<ul><li>1 ≤ s ≤ 9, 0 ≤ length(log) ≤ 40; terms in the log never decrease and never exceed <code>term</code>.</li></ul>`,
    entry: "LeaderCommit",
    params: ["log", "match", "term", "commitIndex"],
    tests: [
      { args: [[1, 1, 1], [3, 3, 1], 1, 0], expect: 3, explain: "Index 3 is on 2 of 3 servers (a majority) and is from the current term." },
      { args: [[1, 2, 4], [3, 2, 2, 1, 1], 4, 1], expect: 1, explain: "Figure 8: index 2 is on 3 of 5 servers, but it is from term 2, not the current term 4 — the leader must NOT commit it yet." },
      { args: [[3, 3, 3, 3, 3], [5, 5, 2, 2], 3, 0], expect: 2, explain: "With 4 servers a majority is 3. Only index ≤ 2 is on 3 servers (two copies of index 5 are just half)." },
      { args: [[2, 2, 2, 2, 2, 2], [6, 1, 1], 2, 4], expect: 4, explain: "The followers lag behind, but the commit index never goes backwards." },
      { args: [[1, 1], [2], 1, 0], expect: 2, explain: "A single-server cluster is its own majority." },
      { args: [[], [0, 0, 0], 1, 0], expect: 0, explain: "Nothing to commit." },
      { args: [[1, 1, 2, 3, 3, 3], [6, 5, 3, 3, 6], 3, 2], expect: 5, explain: "Sorted: 3, 3, 5, 6, 6 → index 5 is on 3 servers and has term 3." },
      { args: [[1, 2, 2, 2], [4, 4, 1, 1, 4, 1], 2, 1], expect: 1, explain: "Index 4 is on exactly 3 of 6 servers: half is not a majority." },
    ],
    random: {
      count: 30,
      gen: (r, i) => {
        const s = 1 + (i % 7), term = r.int(1, 5), L = r.int(0, 12);
        const log = raftLogGen(r, L, term);
        if (L && r() < 0.6) log[L - 1] = term;
        const match = [L].concat(Array.from({ length: s - 1 }, () => r.int(0, L)));
        return [log, r.shuffle(match), term, r.int(0, Math.max(0, L - 2))];
      },
    },
    reference: raftCommitRef,
    mutants: [
      { fn: (log, match, term, c) => { const s = match.length, M = match.slice().sort((a, b) => a - b); const N = M[s - 1 - Math.floor(s / 2)]; return N > c ? N : c; }, hint: "You commit an entry from an older term just because it is on a majority — that's exactly the Figure 8 bug. Also require log[N − 1] = term." },
      { fn: (log, match, term, c) => { const s = match.length, M = match.slice().sort((a, b) => a - b); const N = M[Math.floor(s / 2)]; return N > c && log[N - 1] === term ? N : c; }, hint: "With an even number of servers you accept an index stored on exactly half of them. A majority means MORE than s/2 servers." },
      { fn: (log, match, term, c) => { const s = match.length, M = match.slice().sort((a, b) => a - b); const N = M[s - 1 - Math.floor(s / 2)]; return log[N - 1] === term ? N : c; }, hint: "Your commit index can move backwards when followers lag. Only return N when it is larger than the current commitIndex." },
    ],
    hints: [
      "If you sort the match indices, which position holds the largest index that a majority of servers have reached?",
      "Ascending sort: the value at position s − 1 − ⌊s/2⌋ is stored on at least ⌊s/2⌋ + 1 servers. Call it N. Then apply two checks.",
      "Return N only if N > commitIndex and log[N − 1] = term. (Terms never decrease along the log, so if log[N − 1] is older, every smaller index is older too.)",
    ],
    starter: {
      pseudo: `ALGORITHM LeaderCommit(log, match[0..s-1], term, commitIndex)
    // Largest N > commitIndex on a majority with log[N − 1] = term, else commitIndex
    M ← sorted(match)
    ...
    return commitIndex`,
      js: `function LeaderCommit(log, match, term, commitIndex) {
  // ...
  return commitIndex;
}`,
    },
    solution: {
      pseudo: `ALGORITHM LeaderCommit(log, match[0..s-1], term, commitIndex)
    M ← sorted(match)
    N ← M[s - 1 - ⌊s / 2⌋]
    if N > commitIndex and log[N - 1] = term then
        return N
    return commitIndex`,
      js: `function LeaderCommit(log, match, term, commitIndex) {
  const s = match.length, M = match.slice().sort((a, b) => a - b);
  const N = M[s - 1 - Math.floor(s / 2)];
  return N > commitIndex && log[N - 1] === term ? N : commitIndex;
}`,
      python: `def leader_commit(log, match, term, commit_index):
    s = len(match)
    M = sorted(match)
    N = M[s - 1 - s // 2]
    if N > commit_index and log[N - 1] == term:
        return N
    return commit_index`,
      explain: "After sorting, at least ⌊s/2⌋ + 1 servers have match ≥ M[s − 1 − ⌊s/2⌋], and no larger index has a majority, so that value is the majority-replicated maximum (an order statistic: Θ(s log s), or Θ(s) with quickselect). Because log terms are non-decreasing, if log[N − 1] ≠ term then no index in (commitIndex, N] carries the current term either, so N or commitIndex is the answer.",
    },
    complexity: "Θ(s log s) per update (Θ(s) with selection)",
    followUp: "etcd's raft library (used by Kubernetes) computes exactly this 'quorum index' from its progress tracker on every acknowledgement. Senior twist: joint consensus during membership changes needs a majority of BOTH the old and the new configuration — take the minimum of the two quorum indices.",
    distractors: ["N ← M[⌊s / 2⌋]", "if N ≥ commitIndex then", "if log[N - 1] ≤ term then"],
    lesson: LESSON,
  });

  /* ================================================================== */
  /* 4 · Raft AppendEntries (follower side)                              */
  /* ================================================================== */
  const appendRef = (log, commitIndex, prev, prevTerm, entries, leaderCommit) => {
    if (prev > log.length || (prev > 0 && log[prev - 1] !== prevTerm)) return [false, log, commitIndex];
    for (let j = 0; j < entries.length; j++) {
      const i = prev + j;
      if (i < log.length && log[i] !== entries[j]) log = log.slice(0, i);
      if (i >= log.length) log.push(entries[j]);
    }
    if (leaderCommit > commitIndex) commitIndex = Math.min(leaderCommit, prev + entries.length);
    return [true, log, commitIndex];
  };
  const appendGen = (r) => {
    const L = r.int(0, 9);
    const leader = raftLogGen(r, L, 5);
    const c = r.int(0, L);
    const follower = leader.slice(0, c);
    const extra = r.int(0, 4);
    let t = c ? follower[c - 1] : 1;
    for (let k = 0; k < extra; k++) { t = Math.min(6, t + r.int(0, 1)); follower.push(r() < 0.5 ? t : r.int(1, 6)); }
    for (let k = 1; k < follower.length; k++) if (follower[k] < follower[k - 1]) follower[k] = follower[k - 1];
    const prev = r.int(0, L);
    const prevTerm = prev ? (r() < 0.85 ? leader[prev - 1] : r.int(1, 6)) : 0;
    const entries = leader.slice(prev, prev + r.int(0, L - prev));
    const commit = r.int(0, Math.min(c, follower.length));
    return [follower, commit, prev, prevTerm, entries, r.int(0, L)];
  };

  ForgeProblems.add({
    id: "raft-append-entries",
    title: "Raft: AppendEntries on the Follower",
    level: 7, chapter: 18, difficulty: 2,
    topics: ["distributed systems", "consensus", "Raft", "log replication"],
    strategy: "Consistency check + truncate only on a real conflict",
    source: "Ongaro & Ousterhout (2014), Raft paper, Figure 2 (AppendEntries receiver implementation, steps 2–5)",
    summary: "Implement the follower's AppendEntries rules: the log-matching check, conflict truncation and the commit-index update.",
    statement: `
<p>Raft keeps every follower's log a prefix-copy of the leader's using one Remote Procedure Call (RPC), <b>AppendEntries</b>. The
leader sends the index and term of the entry just before the new ones; if the follower's log does not contain that entry, it refuses
and the leader retries further back. The trickiest rule: a follower must truncate its log <b>only at a real conflict</b> — a stale,
delayed RPC carrying entries the follower already has must never delete newer entries.</p>
<p>Write <code>AppendEntries(log, commitIndex, prevLogIndex, prevLogTerm, entries, leaderCommit)</code> (assume the leader's term is
current). Logs are lists of terms; the entry at 1-based index i has term <code>log[i − 1]</code>. Apply Raft's receiver rules:</p>
<ol>
<li>Reply <b>false</b> (change nothing) if the log has no entry at <code>prevLogIndex</code> whose term is <code>prevLogTerm</code>.
(<code>prevLogIndex = 0</code> means "before the first entry" and always matches.)</li>
<li>For each new entry <code>entries[j]</code>, which belongs at index <code>prevLogIndex + j + 1</code>: if an existing entry there has a
<b>different</b> term, delete it and everything after it; then append any entries not already in the log.</li>
<li>If <code>leaderCommit &gt; commitIndex</code>, set <code>commitIndex ← min(leaderCommit, index of the last new entry)</code>, where the last
new entry's index is <code>prevLogIndex + length(entries)</code>.</li>
</ol>
<p>Return <code>[success, log, commitIndex]</code>.</p>
<ul><li>Logs have at most 20 entries; terms are positive and never decrease along a log.</li></ul>`,
    entry: "AppendEntries",
    params: ["log", "commitIndex", "prevLogIndex", "prevLogTerm", "entries", "leaderCommit"],
    tests: [
      { args: [[1, 1], 1, 2, 1, [2, 2], 3], expect: [true, [1, 1, 2, 2], 3], explain: "Index 2 has term 1 as the leader expects, so both entries are appended and the commit index advances to 3." },
      { args: [[1], 0, 3, 1, [1], 3], expect: [false, [1], 0], explain: "The follower has no entry at index 3 yet: refuse, so the leader backs up." },
      { args: [[1, 1, 2], 1, 3, 3, [3], 4], expect: [false, [1, 1, 2], 1], explain: "There is an entry at index 3, but its term is 2, not 3: the logs diverge there." },
      { args: [[1, 1, 2, 2, 2], 2, 2, 1, [3], 2], expect: [true, [1, 1, 3], 2], explain: "Index 3 holds term 2 but the leader sends term 3: conflict, so indices 3..5 are deleted before appending." },
      { args: [[1, 1, 2, 2], 0, 1, 1, [1], 1], expect: [true, [1, 1, 2, 2], 1], explain: "A delayed RPC re-sends index 2 (term 1), which already matches: nothing is truncated — entries 3 and 4 survive." },
      { args: [[1, 2, 2], 1, 3, 2, [], 5], expect: [true, [1, 2, 2], 3], explain: "A heartbeat (no entries) still advances the commit index — but only up to the last index this RPC vouched for, 3." },
      { args: [[1, 1, 1, 1, 1], 0, 1, 1, [1], 5], expect: [true, [1, 1, 1, 1, 1], 2], explain: "Subtle: the last NEW entry is index 2. Entries 3..5 were not checked by this RPC, so commitIndex becomes min(5, 2) = 2, not 5." },
      { args: [[1, 1], 0, 0, 0, [2], 0], expect: [true, [2], 0], explain: "prevLogIndex 0 always matches; index 1 conflicts (term 1 vs 2) so the whole log is replaced." },
      { args: [[1, 1, 3], 2, 2, 1, [1, 2, 2], 4], expect: [true, [1, 1, 1, 2, 2], 4] },
    ],
    random: { count: 35, gen: (r) => appendGen(r) },
    reference: appendRef,
    mutants: [
      { fn: (log, c, prev, pt, entries, lc) => { if (prev > log.length || (prev > 0 && log[prev - 1] !== pt)) return [false, log, c]; log = log.slice(0, prev).concat(entries); if (lc > c) c = Math.min(lc, prev + entries.length); return [true, log, c]; }, hint: "You cut the log right after prevLogIndex every time. A delayed RPC then deletes entries the follower legitimately has. Truncate only where an existing entry's term DIFFERS from the new one." },
      { fn: (log, c, prev, pt, entries, lc) => { const r = appendRef(log, c, prev, pt, entries, lc); if (r[0] && lc > c) r[2] = lc; return r; }, hint: "Your commit index jumps straight to leaderCommit. The leader may have committed entries this follower doesn't have (or has wrong versions of): cap it at the index of the last new entry." },
      { fn: (log, c, prev, pt, entries, lc) => { if (prev > log.length) return [false, log, c]; return appendRef(log.slice(0, prev).concat(prev ? [pt] : []).concat(log.slice(prev)).slice(0, Math.max(prev, log.length)), c, prev, pt, entries, lc); }, hint: "You only check that the log is long enough. The entry at prevLogIndex must also have term prevLogTerm — that's the log-matching check that makes Raft safe." },
      { fn: (log, c, prev, pt, entries, lc) => { const r = appendRef(log, c, prev, pt, entries, lc); if (r[0] && lc > c) r[2] = Math.min(lc, r[1].length); return r; }, hint: "You cap the commit index by the length of the log. Entries beyond this RPC's last new entry were never verified against the leader — cap at prevLogIndex + length(entries)." },
    ],
    hints: [
      "Three separate jobs: (1) does my log agree with the leader up to prevLogIndex? (2) merge the new entries in, deleting only on a genuine conflict; (3) advance the commit index carefully.",
      "Walk j over the entries with i ← prevLogIndex + j (the 0-based slot). If i < length(log) and log[i] ≠ entries[j], cut the log to its first i entries. If i ≥ length(log) now, append entries[j].",
      "Cutting: log ← log[0..i − 1] (a copy of the first i entries). Commit: if leaderCommit > commitIndex then commitIndex ← min(leaderCommit, prevLogIndex + length(entries)).",
    ],
    starter: {
      pseudo: `ALGORITHM AppendEntries(log, commitIndex, prevLogIndex, prevLogTerm, entries, leaderCommit)
    // Return [success, log, commitIndex]
    if prevLogIndex > length(log) then
        return [false, log, commitIndex]
    ...
    return [true, log, commitIndex]`,
      js: `function AppendEntries(log, commitIndex, prevLogIndex, prevLogTerm, entries, leaderCommit) {
  // ...
  return [true, log, commitIndex];
}`,
    },
    solution: {
      pseudo: `ALGORITHM AppendEntries(log, commitIndex, prevLogIndex, prevLogTerm, entries, leaderCommit)
    if prevLogIndex > length(log) then
        return [false, log, commitIndex]
    if prevLogIndex > 0 and log[prevLogIndex - 1] ≠ prevLogTerm then
        return [false, log, commitIndex]
    for j ← 0 to length(entries) - 1 do
        i ← prevLogIndex + j
        if i < length(log) and log[i] ≠ entries[j] then
            log ← log[0..i - 1]
        if i ≥ length(log) then
            append(log, entries[j])
    if leaderCommit > commitIndex then
        commitIndex ← min(leaderCommit, prevLogIndex + length(entries))
    return [true, log, commitIndex]`,
      js: `function AppendEntries(log, commitIndex, prev, prevTerm, entries, leaderCommit) {
  if (prev > log.length || (prev > 0 && log[prev - 1] !== prevTerm)) return [false, log, commitIndex];
  for (let j = 0; j < entries.length; j++) {
    const i = prev + j;
    if (i < log.length && log[i] !== entries[j]) log = log.slice(0, i);
    if (i >= log.length) log.push(entries[j]);
  }
  if (leaderCommit > commitIndex) commitIndex = Math.min(leaderCommit, prev + entries.length);
  return [true, log, commitIndex];
}`,
      python: `def append_entries(log, commit_index, prev, prev_term, entries, leader_commit):
    if prev > len(log) or (prev > 0 and log[prev - 1] != prev_term):
        return [False, log, commit_index]
    for j, t in enumerate(entries):
        i = prev + j
        if i < len(log) and log[i] != t:
            log = log[:i]
        if i >= len(log):
            log.append(t)
    if leader_commit > commit_index:
        commit_index = min(leader_commit, prev + len(entries))
    return [True, log, commit_index]`,
      explain: "The Log Matching Property (same index + same term ⇒ identical prefixes) means one successful check at prevLogIndex certifies the whole prefix; entries are then copied, deleting only on a term conflict, so a reordered or duplicated RPC is harmless (idempotent). Capping commitIndex at the last verified index guarantees a follower never applies an entry it hasn't matched. Work is Θ(length(entries)) plus the truncation copy.",
    },
    complexity: "Θ(length(entries) + truncated suffix) per RPC",
    followUp: "etcd, Consul, CockroachDB and TiKV all run this receiver logic. Senior twist: on rejection, a follower can reply with the term of its conflicting entry and the first index of that term so the leader skips back a whole term per round trip instead of one entry (the optimization sketched at the end of the Raft paper's §5.3).",
    distractors: ["log ← log[0..prevLogIndex - 1]", "commitIndex ← leaderCommit", "commitIndex ← min(leaderCommit, length(log))"],
    lesson: LESSON,
  });

  /* ================================================================== */
  /* 5 · Jump consistent hash (Lamping–Veach)                            */
  /* ================================================================== */
  // Real draws from the published 64-bit LCG: key ← key·2862933555777941757 + 1 (mod 2^64), R = (key >> 33) + 1.
  const jumpDraws = (key, buckets, extra) => {
    let k = BigInt(key);
    const M = (1n << 64n) - 1n, out = [];
    let b = -1, j = 0;
    while (j < buckets) {
      b = j;
      k = (k * 2862933555777941757n + 1n) & M;
      const R = Number(k >> 33n) + 1;
      out.push(R);
      j = Math.floor((b + 1) * (2147483648 / R));
    }
    for (let e = 0; e < (extra == null ? 2 : extra); e++) { k = (k * 2862933555777941757n + 1n) & M; out.push(Number(k >> 33n) + 1); }
    return out;
  };
  const jump1 = (draws, n, le) => {
    let b = -1, j = 0, t = 0;
    while (le ? j <= n : j < n) { b = j; j = Math.floor((b + 1) * (2147483648 / draws[t])); t++; }
    return b;
  };
  const jumpRef = (D, n) => [D.map((d) => jump1(d, n)), D.map((d) => jump1(d, n + 1))];
  const jumpCase = (keys, n) => [keys.map((k) => jumpDraws(k, n + 1)), n];

  ForgeProblems.add({
    id: "jump-consistent-hash",
    title: "Jump Consistent Hash",
    level: 7, chapter: 18, difficulty: 1,
    topics: ["hashing", "consistent hashing", "sharding", "randomized algorithms"],
    strategy: "Jump straight to the next bucket change (expected O(log n) jumps)",
    source: "Lamping & Veach (2014), \"A Fast, Minimal Memory, Consistent Hash Algorithm\" (Google)",
    summary: "Map keys to n shards so that growing to n + 1 shards moves only 1/(n + 1) of the keys — in a handful of arithmetic steps and zero memory.",
    statement: `
<p>When a storage cluster grows from n to n + 1 shards, plain <code>key mod n</code> moves almost every key. <b>Jump consistent hash</b>
moves only the keys that must move (about 1/(n + 1) of them, all to the new shard), needs no ring or table, and runs in expected
<b>O(log n)</b> steps. Picture each key's bucket as n grows: it stays put, then occasionally "jumps" to the newest bucket.
Instead of simulating every n, the algorithm draws a random number and jumps straight to the next bucket count at which the key moves:</p>
<pre>b ← −1;  j ← 0
while j &lt; n:
    b ← j
    R ← next draw            (a uniform integer in 1..2³¹)
    j ← ⌊(b + 1) · (2³¹ / R)⌋
return b</pre>
<p>In the real code the draws come from a 64-bit Linear Congruential Generator (LCG) seeded by the key
(<code>key ← key · 2862933555777941757 + 1</code>, <code>R = (key &gt;&gt; 33) + 1</code>). Our engine has no 64-bit integers, so the draws are
given: <code>D[k]</code> is the list of draws for key number k — more than enough of them.</p>
<p>Write <code>JumpHash(D, n)</code> returning <code>[A, B]</code>: <code>A[k]</code> = key k's bucket with n buckets, <code>B[k]</code> = its bucket
with n + 1 buckets (same draws, starting from the first). Compute <code>j</code> exactly as <code>⌊(b + 1) * (2^31 / R)⌋</code>.</p>
<ul><li>1 ≤ n ≤ 100000, up to 40 keys. Notice which keys change bucket between A and B, and where they go.</li></ul>`,
    entry: "JumpHash",
    params: ["D", "n"],
    tests: [
      { args: jumpCase([1, 2, 3, 4, 5], 1), expect: [[0, 0, 0, 0, 0], [0, 0, 0, 1, 1]], explain: "With one bucket everything is in bucket 0. Growing to 2 buckets, the keys that move go to the NEW bucket 1." },
      { args: jumpCase([42], 10), expect: [[2], [2]], explain: "Key 42 jumps to bucket 1, then to bucket 2, and its next jump would need 22 buckets — so it sits in bucket 2 for both n = 10 and n = 11." },
      { args: jumpCase([0, 7, 99, 1000, 123456], 3), expect: [[0, 0, 2, 0, 2], [0, 0, 2, 0, 3]], explain: "Growing from 3 to 4 buckets moves just one key, into the new bucket 3." },
      { args: jumpCase([11, 12, 13, 14, 15, 16, 17, 18], 7), expect: [[5, 1, 0, 5, 4, 2, 4, 4], [5, 1, 0, 5, 7, 2, 7, 4]] },
      { args: jumpCase([31, 32, 33, 34, 35, 36], 2), expect: [[1, 1, 0, 0, 0, 1], [2, 1, 0, 0, 2, 1]] },
      { args: jumpCase([5, 6, 7, 8, 9], 1000), expect: [[231, 421, 97, 191, 254], [231, 421, 97, 191, 254]], explain: "With 1000 buckets a key moves on the next growth step with probability only 1/1001." },
      { args: jumpCase([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 5), expect: [[0, 3, 3, 1, 4, 2, 0, 4, 2, 2, 2, 1], [0, 3, 3, 1, 4, 5, 0, 4, 2, 5, 5, 1]], explain: "From 5 to 6 buckets only 3 of the 12 keys move — and all of them move to the new bucket 5 (about 12/6 expected)." },
    ],
    random: { count: 25, gen: (r, i) => jumpCase(Array.from({ length: 6 }, () => r.int(0, 1000000)), r.int(1, 3 + i * i * 40)) },
    reference: jumpRef,
    growth: { metric: "steps", sizes: [64, 256, 1024, 4096, 16384, 65536], gen: (r, n) => jumpCase(Array.from({ length: 24 }, () => r.int(0, 1000000)), n), expect: "log n" },
    mutants: [
      { fn: (D, n) => [D.map((d) => jump1(d, n, true)), D.map((d) => jump1(d, n + 1, true))], hint: "Some keys land in bucket n, which doesn't exist (buckets are 0..n − 1). Keep jumping only while j < n, not j ≤ n." },
      { fn: (D, n) => [D.map((d) => d[0] % n), D.map((d) => d[0] % (n + 1))], hint: "You're using 'draw mod n'. That spreads keys evenly, but when n grows almost every key changes bucket. Follow the jump loop: b ← j, then j ← ⌊(b + 1)·(2³¹/R)⌋ with the next draw." },
      { fn: (D, n) => [D.map((d) => { let b = -1, j = 0, t = 0; while (j < n) { b = j; j = Math.floor((b + 1) * (2147483648 / d[t])); t++; } return j; }), D.map((d) => { let b = -1, j = 0, t = 0; while (j < n + 1) { b = j; j = Math.floor((b + 1) * (2147483648 / d[t])); t++; } return j; })], hint: "You return j, the first bucket count where the key would jump AGAIN — that's ≥ n. The answer is b, the last bucket it jumped to." },
    ],
    hints: [
      "Imagine adding buckets one at a time: when bucket b + 1 is added, a key moves there with probability 1/(b + 2). The jump formula samples 'the next time this key moves' directly.",
      "Write a helper Jump(draws, n) with b ← −1, j ← 0, t ← 0 and a while j < n loop that uses draws[t] and then increments t. Call it twice per key: with n and with n + 1.",
      "Inside the loop: b ← j; j ← ⌊(b + 1) * (2^31 / draws[t])⌋; t ← t + 1. Return b.",
    ],
    starter: {
      pseudo: `ALGORITHM JumpHash(D, n)
    A ← []
    B ← []
    for each draws in D do
        append(A, Jump(draws, n))
        append(B, Jump(draws, n + 1))
    return [A, B]

ALGORITHM Jump(draws, n)
    b ← -1
    j ← 0
    ...
    return b`,
      js: `function JumpHash(D, n) {
  // return [bucketsWithN, bucketsWithNPlus1]
}`,
    },
    solution: {
      pseudo: `ALGORITHM JumpHash(D, n)
    A ← []
    B ← []
    for each draws in D do
        append(A, Jump(draws, n))
        append(B, Jump(draws, n + 1))
    return [A, B]

ALGORITHM Jump(draws, n)
    b ← -1
    j ← 0
    t ← 0
    while j < n do
        b ← j
        j ← ⌊(b + 1) * (2^31 / draws[t])⌋
        t ← t + 1
    return b`,
      js: `function JumpHash(D, n) {
  const jump = (draws, n) => {
    let b = -1, j = 0, t = 0;
    while (j < n) { b = j; j = Math.floor((b + 1) * (2147483648 / draws[t])); t++; }
    return b;
  };
  return [D.map((d) => jump(d, n)), D.map((d) => jump(d, n + 1))];
}`,
      python: `def jump_hash(D, n):
    def jump(draws, n):
        b, j, t = -1, 0, 0
        while j < n:
            b = j
            j = int((b + 1) * (2**31 / draws[t]))
            t += 1
        return b
    return [[jump(d, n) for d in D], [jump(d, n + 1) for d in D]]`,
      explain: "A key sitting in bucket b survives the addition of buckets b + 2, …, j with probability (b + 1)/j, so drawing u uniform and jumping to ⌊(b + 1)/u⌋ samples the next move exactly. The expected number of jumps up to n is the harmonic sum H_n ≈ ln n, so each lookup is O(log n) time and O(1) memory; going from n to n + 1 buckets only moves keys into bucket n.",
    },
    complexity: "Expected O(log n) per key, O(1) memory",
    followUp: "Google published it for sharding storage; it suits systems whose shards are numbered 0..n − 1 and only grow or shrink at the end (e.g. data sharding in some Prometheus-compatible remote-storage and log systems). It cannot remove an arbitrary middle shard — for that, rendezvous hashing or a hash ring (used by Cassandra and Amazon Dynamo) is the tool.",
    distractors: ["while j ≤ n do", "return j", "j ← ⌊b * (2^31 / draws[t])⌋"],
    visual: "sims/hashing.html",
    lesson: LESSON,
  });
  /* ================================================================== */
  /* 6 · Merkle tree root + differing leaves (anti-entropy)              */
  /* ================================================================== */
  const MK = (x, y) => (x * 1009 + y * 9176 + 1) % 1000003;
  const merkleBuild = (L, H) => { const n = L.length, T = Array(2 * n).fill(0); for (let i = 0; i < n; i++) T[n + i] = L[i]; for (let v = n - 1; v >= 1; v--) T[v] = H(T[2 * v], T[2 * v + 1]); return T; };
  const merkleRun = (A, B, H, countMode) => {
    const n = A.length, TA = merkleBuild(A, H), TB = merkleBuild(B, H), diff = [];
    const go = (v) => {
      if (TA[v] === TB[v]) return countMode === "diffOnly" ? 0 : 1;
      if (v >= n) { diff.push(v - n); return 1; }
      return 1 + go(2 * v) + go(2 * v + 1);
    };
    const c = go(1);
    return [TA[1], TB[1], diff, c];
  };
  const merkleRef = (A, B) => merkleRun(A, B, MK);
  const merkleGen = (r, logn, changes) => {
    const n = 1 << logn, A = r.array(n, 0, 1000002), B = A.slice();
    for (let t = 0; t < changes; t++) B[r.int(0, n - 1)] = r.int(0, 1000002);
    return [A, B];
  };

  ForgeProblems.add({
    id: "merkle-tree-diff",
    title: "Merkle Trees: Find the Out-of-Sync Blocks",
    level: 7, chapter: 18, difficulty: 2,
    topics: ["hashing", "trees", "distributed systems", "divide-and-conquer"],
    strategy: "Hash tree + top-down descent into differing subtrees only",
    source: "Merkle (1987), \"A Digital Signature Based on a Conventional Encryption Function\" · DeCandia et al. (2007), Dynamo §4.7 (anti-entropy)",
    summary: "Build two Merkle trees and locate the differing leaves by descending only into subtrees whose hashes disagree.",
    statement: `
<p>Two replicas each hold n data blocks. Shipping all n blocks to compare them is expensive; a <b>Merkle tree</b> (hash tree) lets them
compare one root hash, and if it differs, recurse only into the halves whose hashes differ — about <code>d · log n</code> comparisons
for d differing blocks. Dynamo-style databases (Cassandra, Riak) repair replicas this way; Git and certificate-transparency logs rely on
the same structure.</p>
<p>Write <code>MerkleDiff(A, B)</code>. <code>A[0..n−1]</code> and <code>B[0..n−1]</code> are the leaf hashes of the two replicas (n is a power of 2).
Build each tree bottom-up: a leaf's hash is its value; an internal node with children hashes <code>x</code> (left) and <code>y</code> (right) has hash</p>
<pre>H(x, y) = (x * 1009 + y * 9176 + 1) mod 1000003</pre>
<p>Then compare top-down with this exact procedure, counting every node pair you compare:</p>
<pre>Compare(node): count one comparison
    if the two hashes are equal: stop (the whole subtree agrees)
    else if node is a leaf: report its index
    else: Compare(left child), then Compare(right child)</pre>
<p>Return <code>[rootA, rootB, diff, comparisons]</code>, where <code>diff</code> lists the differing leaf indices in increasing order.</p>
<ul><li>1 ≤ n ≤ 64, leaf values in 0..1000002. (Tip: store a tree in an array T[1..2n−1] with node v's children at 2v and 2v + 1 and leaf i at n + i.)</li></ul>`,
    entry: "MerkleDiff",
    params: ["A", "B"],
    tests: [
      { args: [[1, 2, 3, 4], [1, 2, 3, 4]], expect: [115939, 115939, [], 1], explain: "Equal roots: one comparison proves all four blocks agree." },
      { args: [[1, 2, 3, 4], [1, 2, 9, 4]], expect: [115939, 667278, [2], 5], explain: "Root differs (1), left half agrees (1), right half differs (1), then its two leaves (2): 5 comparisons." },
      { args: [[5], [6]], expect: [5, 6, [0], 1], explain: "A single block is its own root." },
      { args: [[1, 2], [2, 1]], expect: [19362, 11195, [0, 1], 3], explain: "H(x, y) ≠ H(y, x): swapping two blocks is detected." },
      { args: [[7, 7, 7, 7], [8, 8, 8, 8]], expect: [147583, 881499, [0, 1, 2, 3], 7], explain: "Everything differs: all 2n − 1 = 7 node pairs are compared." },
      { args: [[10, 20, 30, 40, 50, 60, 70, 80], [10, 21, 30, 40, 50, 60, 70, 81]], expect: [375351, 744536, [1, 7], 11], explain: "Two differing leaves in different halves: the descent forks at the root and again lower down — 11 comparisons." },
      { args: [[0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0]], expect: [744102, 744102, [], 1] },
      { args: [[3, 1, 4, 1, 5, 9, 2, 6], [3, 1, 4, 1, 5, 9, 2, 7]], expect: [357041, 842996, [7], 7], explain: "One differing block in 8 costs 2·log₂8 + 1 = 7 comparisons instead of 8 block transfers — the gap grows fast with n." },
    ],
    random: { count: 30, gen: (r, i) => merkleGen(r, i % 7, i % 4) },
    reference: merkleRef,
    mutants: [
      { fn: (A, B) => merkleRun(A, B, (x, y) => MK(y, x)), hint: "Your root hashes are wrong. Check the argument order: H(left, right) multiplies the LEFT child by 1009 and the RIGHT child by 9176 — order matters, that's how swapped blocks get noticed." },
      { fn: (A, B) => { const r = merkleRef(A, B); const d = []; A.forEach((x, i) => { if (x !== B[i]) d.push(i); }); return [r[0], r[1], d, A.length]; }, hint: "You compare every leaf directly (n comparisons). The point of the tree is to stop at the first equal subtree: start at the root and descend only where hashes differ." },
      { fn: (A, B) => merkleRun(A, B, MK, "diffOnly"), hint: "Your comparison count is too small: you count only the node pairs that DIFFER. The comparison that finds two equal subtree hashes (and stops) counts too." },
    ],
    hints: [
      "If two subtrees have equal hashes, can anything below them differ (assuming no hash collisions)? So where does the search need to go?",
      "Build T[1..2n−1] for each replica: T[n + i] ← leaf i, then for v ← n − 1 downto 1, T[v] ← H(T[2v], T[2v + 1]). Then write a recursive Compare(v) that returns how many comparisons it made.",
      "Compare(v): if TA[v] = TB[v] return 1; if v ≥ n (a leaf) append v − n to diff and return 1; otherwise return 1 + Compare(2v) + Compare(2v + 1).",
    ],
    starter: {
      pseudo: `ALGORITHM MerkleDiff(A[0..n-1], B[0..n-1])
    // Return [rootA, rootB, diff, comparisons]
    TA ← Build(A)
    TB ← Build(B)
    diff ← []
    ...

ALGORITHM Build(L[0..n-1])
    T ← array(2 * n, 0)
    ...
    return T`,
      js: `function MerkleDiff(A, B) {
  // return [rootA, rootB, diff, comparisons]
}`,
    },
    solution: {
      pseudo: `ALGORITHM MerkleDiff(A[0..n-1], B[0..n-1])
    TA ← Build(A)
    TB ← Build(B)
    diff ← []
    c ← Compare(TA, TB, 1, n, diff)
    return [TA[1], TB[1], diff, c]

ALGORITHM Build(L[0..n-1])
    T ← array(2 * n, 0)
    for i ← 0 to n - 1 do
        T[n + i] ← L[i]
    for v ← n - 1 downto 1 do
        T[v] ← (T[2 * v] * 1009 + T[2 * v + 1] * 9176 + 1) mod 1000003
    return T

ALGORITHM Compare(TA, TB, v, n, diff)
    if TA[v] = TB[v] then
        return 1
    if v ≥ n then
        append(diff, v - n)
        return 1
    return 1 + Compare(TA, TB, 2 * v, n, diff) + Compare(TA, TB, 2 * v + 1, n, diff)`,
      js: `function MerkleDiff(A, B) {
  const n = A.length;
  const H = (x, y) => (x * 1009 + y * 9176 + 1) % 1000003;
  const build = (L) => { const T = Array(2 * n).fill(0); for (let i = 0; i < n; i++) T[n + i] = L[i]; for (let v = n - 1; v >= 1; v--) T[v] = H(T[2 * v], T[2 * v + 1]); return T; };
  const TA = build(A), TB = build(B), diff = [];
  const cmp = (v) => { if (TA[v] === TB[v]) return 1; if (v >= n) { diff.push(v - n); return 1; } return 1 + cmp(2 * v) + cmp(2 * v + 1); };
  const c = cmp(1);
  return [TA[1], TB[1], diff, c];
}`,
      python: `def merkle_diff(A, B):
    n = len(A)
    H = lambda x, y: (x * 1009 + y * 9176 + 1) % 1000003
    def build(L):
        T = [0] * (2 * n)
        T[n:] = L
        for v in range(n - 1, 0, -1):
            T[v] = H(T[2 * v], T[2 * v + 1])
        return T
    TA, TB, diff = build(A), build(B), []
    def cmp(v):
        if TA[v] == TB[v]:
            return 1
        if v >= n:
            diff.append(v - n)
            return 1
        return 1 + cmp(2 * v) + cmp(2 * v + 1)
    c = cmp(1)
    return [TA[1], TB[1], diff, c]`,
      explain: "Building each tree costs n − 1 hash evaluations (Θ(n)), done once per replica. The descent visits a node only if its parent differs, i.e. only ancestors of the d differing leaves and their siblings: at most 2d·log₂n + 1 comparisons, so in-sync replicas cost Θ(1) and a few stale blocks cost Θ(d log n) instead of Θ(n) transfers.",
    },
    complexity: "Θ(n) to build; Θ(d log n) comparisons for d differing leaves",
    followUp: "Cassandra's 'nodetool repair' and Amazon Dynamo exchange Merkle trees per key range; Git names every tree and commit by a hash of its children; Bitcoin blocks and certificate-transparency logs give O(log n) inclusion proofs from the same tree. Senior twist: keep the trees incrementally updated per write instead of rebuilding them before each repair.",
    distractors: ["T[v] ← (T[2 * v + 1] * 1009 + T[2 * v] * 9176 + 1) mod 1000003", "if v > n then", "return Compare(TA, TB, 2 * v, n, diff) + Compare(TA, TB, 2 * v + 1, n, diff)"],
    visual: "sims/hashing.html",
    lesson: LESSON,
  });

  /* ================================================================== */
  /* 7 · Skip list with supplied coin flips                              */
  /* ================================================================== */
  const skipRun = (K, H, Q, mode) => {
    const key = [0], nxt = [Array(17).fill(-1)];
    let top = 0;
    const lessEq = mode === "le";
    const preds = (q, t) => { const up = []; let x = 0; for (let l = t - 1; l >= 0; l--) { while (nxt[x][l] !== undefined && nxt[x][l] !== -1 && (lessEq ? key[nxt[x][l]] <= q : key[nxt[x][l]] < q)) x = nxt[x][l]; up.push(x); } return up; };
    K.forEach((k, i) => {
      const h = mode === "plus1" ? H[i] + 1 : H[i];
      top = Math.max(top, h);
      const up = preds(k, top);
      key.push(k); const v = key.length - 1; nxt.push(Array(h).fill(-1));
      for (let l = 0; l < h; l++) { const u = up[top - 1 - l]; nxt[v][l] = nxt[u][l]; nxt[u][l] = v; }
    });
    return Q.map((q) => {
      const t = mode === "max16" ? 16 : top;
      const up = preds(q, t), path = up.map((v) => key[v]);
      if (!up.length) return [false, path];
      const last = up[up.length - 1];
      const found = lessEq ? key[last] === q && last !== 0 : nxt[last][0] !== -1 && key[nxt[last][0]] === q;
      return [found, path];
    });
  };
  const skipRef = (K, H, Q) => skipRun(K, H, Q);
  const coinHeight = (r) => { let h = 1; while (h < 16 && r() < 0.5) h++; return h; };
  const skipGen = (r, n, q) => {
    const K = r.distinct(n, 1, 10 * n + 10), H = K.map(() => coinHeight(r));
    const Q = Array.from({ length: q }, () => (r() < 0.5 && n ? r.pick(K) : r.int(1, 10 * n + 10)));
    return [K, H, Q];
  };

  ForgeProblems.add({
    id: "skip-list-search-paths",
    title: "Skip List: Insert with Coin Flips, Then Search",
    level: 7, chapter: 18, difficulty: 2,
    topics: ["skip lists", "randomized data structures", "linked lists", "ordered maps"],
    strategy: "Express lanes: search from the top level, drop down when the next key is too big",
    source: "Pugh (1990), \"Skip Lists: A Probabilistic Alternative to Balanced Trees\" (CACM)",
    summary: "Build a skip list from given node heights (the coin flips) and report each search's drop-down path.",
    statement: `
<p>A <b>skip list</b> is a sorted linked list with randomly built "express lanes": each node gets a height by flipping a coin (height
1, plus 1 for every head before the first tail), and appears in levels 0..height−1. Searching starts on the highest lane and drops
down whenever the next node would overshoot, giving expected O(log n) search and insert with no rotations — which is why Redis
uses it for sorted sets and LevelDB/RocksDB for their in-memory tables.</p>
<p>Write <code>SkipList(K, H, Q)</code>:</p>
<ul>
<li>Start with a <b>head</b> node of key 0 (all real keys are ≥ 1) that is tall enough for every level. <code>top</code> = the largest
height inserted so far (0 for an empty list).</li>
<li>Insert the distinct keys <code>K[0], K[1], …</code> in that order; key <code>K[i]</code> gets height <code>H[i]</code> (the coin flips, already
done). To insert, first update <code>top</code>, then search for <code>K[i]</code> recording at every level the last node visited, and splice
the new node in after those nodes on its levels 0..H[i]−1.</li>
<li>Then answer each query q in <code>Q</code> with <code>[found, path]</code>: search from level <code>top − 1</code> down to level 0; on each
level move right while the next node's key is <b>&lt; q</b>; <code>path</code> lists the key of the node where you stop on each level, from the
top level down (the head counts as 0). <code>found</code> tells whether the node after the level-0 stop has key q.</li>
</ul>
<p>Return the list of answers.</p>
<ul><li>0 ≤ n ≤ 600 keys, up to 600 queries, heights 1..16. <b>Efficiency:</b> expected O(log n) per operation — the grader checks
that n inserts + n queries grow like n log n, so don't scan the whole list per query.</li></ul>`,
    entry: "SkipList",
    params: ["K", "H", "Q"],
    tests: [
      { args: [[30, 10, 20], [1, 2, 1], [20, 25, 5]], expect: [[true, [10, 10]], [false, [10, 20]], [false, [0, 0]]], explain: "top = 2 (key 10 is the only tall node). For q = 20: on level 1 move to 10 (next is nothing), drop; on level 0 the next node is 20, not < 20, so stop at 10 — and the next key is 20: found." },
      { args: [[], [], [7]], expect: [[false, []]], explain: "Empty list: top = 0 levels, empty path, nothing found." },
      { args: [[5], [3], [5, 6]], expect: [[true, [0, 0, 0]], [false, [5, 5, 5]]], explain: "For q = 5 every level stops at the head (path entries are the nodes BEFORE q), and the next node is 5: found. For q = 6 every level stops at node 5." },
      { args: [[50, 40, 30, 20, 10], [1, 1, 1, 1, 1], [35]], expect: [[false, [30]]], explain: "All heights 1: a plain sorted linked list, one level, linear search." },
      { args: [[8, 4, 12, 2, 6, 10, 14], [1, 2, 1, 3, 1, 2, 1], [9, 14, 1]], expect: [[false, [2, 4, 8]], [true, [2, 10, 12]], [false, [0, 0, 0]]], explain: "q = 9: level 2 holds only 2; level 1 holds 2, 4, 10 → stop at 4; level 0 → stop at 8. The path is the 'update' array an insert of 9 would use." },
      { args: [[15, 3, 9, 21, 27], [4, 1, 2, 1, 3], [27, 22, 4]], expect: [[true, [15, 15, 15, 21]], [false, [15, 15, 15, 21]], [false, [0, 0, 0, 3]]] },
      { args: [[100, 200, 300], [2, 2, 2], [300, 150, 400]], expect: [[true, [200, 200]], [false, [100, 100]], [false, [300, 300]]] },
    ],
    random: { count: 25, gen: (r, i) => skipGen(r, 1 + i * 2, 6) },
    reference: skipRef,
    growth: { metric: "steps", sizes: [32, 64, 128, 256, 512], gen: (r, n) => skipGen(r, n, n), expect: "n log n" },
    mutants: [
      { fn: (K, H, Q) => skipRun(K, H, Q, "le"), hint: "Your path sometimes ends ON the key q itself. Move right only while the next key is strictly less than q (that's what makes the path the list of predecessors an insert needs)." },
      { fn: (K, H, Q) => skipRun(K, H, Q, "max16"), hint: "Your paths are too long: you always start at level 15. Start at the highest level actually used (top − 1), where top is the tallest node inserted." },
      { fn: (K, H, Q) => skipRun(K, H, Q, "plus1"), hint: "There seems to be one level too many. A node of height h lives on levels 0..h − 1 — h levels, not h + 1." },
    ],
    hints: [
      "Every level is a sorted linked list, and level l + 1 is a sub-list of level l. Where should a search on level l continue from when it drops to level l − 1?",
      "Store nodes in arrays: key[v] and nxt[v][l] (−1 = end). Node 0 is the head with key 0 and 16 levels. Write a helper Preds(q) that walks from level top − 1 down to 0 and records the stop node per level.",
      "Insert K[i]: top ← max(top, H[i]); up ← Preds(K[i]); create node v; for l ← 0 to H[i] − 1: u ← up[top − 1 − l]; nxt[v][l] ← nxt[u][l]; nxt[u][l] ← v.",
    ],
    starter: {
      pseudo: `ALGORITHM SkipList(K, H, Q)
    key ← [0]
    nxt ← [array(16, -1)]
    top ← 0
    for i ← 0 to length(K) - 1 do
        ...
    out ← []
    for each q in Q do
        ...
    return out

ALGORITHM Preds(key, nxt, top, q)
    // the node where the search stops on each level, top level first
    ...`,
      js: `function SkipList(K, H, Q) {
  // return [[found, path], ...]
}`,
    },
    solution: {
      pseudo: `ALGORITHM SkipList(K, H, Q)
    key ← [0]
    nxt ← [array(16, -1)]
    top ← 0
    for i ← 0 to length(K) - 1 do
        top ← max(top, H[i])
        up ← Preds(key, nxt, top, K[i])
        append(key, K[i])
        append(nxt, array(H[i], -1))
        v ← length(key) - 1
        for l ← 0 to H[i] - 1 do
            nxt[v][l] ← nxt[up[top - 1 - l]][l]
            nxt[up[top - 1 - l]][l] ← v
    out ← []
    for each q in Q do
        up ← Preds(key, nxt, top, q)
        path ← []
        for each v in up do
            append(path, key[v])
        found ← top > 0 and nxt[up[top - 1]][0] ≠ -1 and key[nxt[up[top - 1]][0]] = q
        append(out, [found, path])
    return out

ALGORITHM Preds(key, nxt, top, q)
    up ← []
    x ← 0
    for l ← top - 1 downto 0 do
        while nxt[x][l] ≠ -1 and key[nxt[x][l]] < q do
            x ← nxt[x][l]
        append(up, x)
    return up`,
      js: `function SkipList(K, H, Q) {
  const key = [0], nxt = [Array(16).fill(-1)];
  let top = 0;
  const preds = (q) => { const up = []; let x = 0; for (let l = top - 1; l >= 0; l--) { while (nxt[x][l] !== -1 && key[nxt[x][l]] < q) x = nxt[x][l]; up.push(x); } return up; };
  K.forEach((k, i) => {
    top = Math.max(top, H[i]);
    const up = preds(k);
    key.push(k); nxt.push(Array(H[i]).fill(-1));
    const v = key.length - 1;
    for (let l = 0; l < H[i]; l++) { const u = up[top - 1 - l]; nxt[v][l] = nxt[u][l]; nxt[u][l] = v; }
  });
  return Q.map((q) => {
    const up = preds(q), last = up[up.length - 1];
    const found = top > 0 && nxt[last][0] !== -1 && key[nxt[last][0]] === q;
    return [found, up.map((v) => key[v])];
  });
}`,
      python: `def skip_list(K, H, Q):
    key, nxt, top = [0], [[-1] * 16], 0
    def preds(q):
        up, x = [], 0
        for l in range(top - 1, -1, -1):
            while nxt[x][l] != -1 and key[nxt[x][l]] < q:
                x = nxt[x][l]
            up.append(x)
        return up
    for k, h in zip(K, H):
        top = max(top, h)
        up = preds(k)
        key.append(k); nxt.append([-1] * h)
        v = len(key) - 1
        for l in range(h):
            u = up[top - 1 - l]
            nxt[v][l], nxt[u][l] = nxt[u][l], v
    out = []
    for q in Q:
        up = preds(q)
        found = top > 0 and nxt[up[-1]][0] != -1 and key[nxt[up[-1]][0]] == q
        out.append([found, [key[v] for v in up]])
    return out`,
      explain: "With fair coins, level l holds about n/2^l nodes, so there are about log₂n levels, and on each level a search makes an expected ≤ 2 rightward moves before dropping (backwards analysis: each step back up the path is a 'heads' with probability 1/2). Insert = search + O(height) splices, so both are expected Θ(log n) and n inserts + n queries cost Θ(n log n).",
    },
    complexity: "Expected Θ(log n) per search/insert, Θ(n) expected space",
    followUp: "Redis sorted sets (ZADD/ZRANGE) are skip lists plus a hash map, and LevelDB/RocksDB memtables are skip lists; Java's ConcurrentSkipListMap shows the senior twist — skip lists admit simple lock-free concurrent inserts because each level is spliced with one compare-and-swap.",
    distractors: ["while nxt[x][l] ≠ -1 and key[nxt[x][l]] ≤ q do", "for l ← 15 downto 0 do", "for l ← 0 to H[i] do"],
    visual: "sims/skip-list.html",
    lesson: LESSON,
  });

  /* ================================================================== */
  /* 8 · Cuckoo hashing with a kick limit                                */
  /* ================================================================== */
  const cuckooRun = (m, keys, maxLoop, mode) => {
    const T1 = Array(m).fill(null), T2 = Array(m).fill(null);
    for (const key of keys) {
      if (mode !== "nodup" && (T1[key % m] === key || T2[Math.floor(key / m) % m] === key)) continue;
      let x = key;
      if (mode === "swaps") {
        let s = 0;
        while (x !== null && s < maxLoop) { let i = x % m; [x, T1[i]] = [T1[i], x]; s++; if (x === null || s >= maxLoop) break; i = Math.floor(x / m) % m; [x, T2[i]] = [T2[i], x]; s++; }
      } else {
        const L = mode === "minus" ? maxLoop - 1 : maxLoop;
        for (let t = 0; t < L && x !== null; t++) { let i = x % m; [x, T1[i]] = [T1[i], x]; if (x === null) break; i = Math.floor(x / m) % m; [x, T2[i]] = [T2[i], x]; }
      }
      if (x !== null) return "rehash";
    }
    return [T1, T2];
  };
  const cuckooRef = (m, keys, maxLoop) => cuckooRun(m, keys, maxLoop);

  ForgeProblems.add({
    id: "cuckoo-hashing-insert",
    title: "Cuckoo Hashing: Kick Out the Occupant",
    level: 7, chapter: 18, difficulty: 2,
    topics: ["hashing", "cuckoo hashing", "worst-case O(1) lookup"],
    strategy: "Two tables, two hash functions, evict-and-relocate with a loop limit",
    source: "Pagh & Rodler (2004), \"Cuckoo Hashing\" (Journal of Algorithms)",
    summary: "Insert keys into a two-table cuckoo hash, evicting occupants back and forth, and detect when a rehash is needed.",
    statement: `
<p><b>Cuckoo hashing</b> guarantees that a lookup probes at most <b>two</b> cells: key x may live only in <code>T1[h1(x)]</code> or
<code>T2[h2(x)]</code>. To insert, put x in its T1 cell; if someone was there, that evicted key moves to <i>its</i> T2 cell, possibly evicting
another key, which moves to its T1 cell, and so on — like a cuckoo chick pushing eggs out of the nest. If this goes on too long the
keys are stuck in a cycle and the table must be rebuilt with new hash functions.</p>
<p>Write <code>CuckooInsertAll(m, keys, maxLoop)</code> with two tables of size m (empty cells are <code>null</code>) and</p>
<pre>h1(x) = x mod m          h2(x) = (x div m) mod m</pre>
<p>Insert the keys in order with exactly Pagh and Rodler's procedure:</p>
<pre>Insert(x):
    if T1[h1(x)] = x or T2[h2(x)] = x: return          (already present)
    repeat maxLoop times:
        swap x with T1[h1(x)];  if x = null: return
        swap x with T2[h2(x)];  if x = null: return
    FAIL → rehash</pre>
<p>Return <code>[T1, T2]</code> after all inserts, or the string <code>"rehash"</code> as soon as one insert fails.</p>
<ul><li>1 ≤ m ≤ 50, up to 40 keys (non-negative integers, repeats possible), 1 ≤ maxLoop ≤ 10.</li></ul>`,
    entry: "CuckooInsertAll",
    params: ["m", "keys", "maxLoop"],
    tests: [
      { args: [5, [3, 8], 4], expect: [[null, null, null, 8, null], [3, null, null, null, null]], explain: "3 goes to T1[3]. 8 also hashes to T1[3]: it takes the cell and evicts 3, which moves to T2[(3 div 5) mod 5] = T2[0]." },
      { args: [5, [3, 8, 3], 4], expect: [[null, null, null, 8, null], [3, null, null, null, null]], explain: "The second 3 is found in T2[0], so nothing changes." },
      { args: [5, [11, 36, 61], 4], expect: "rehash", explain: "All three keys have h1 = 1 and h2 = 2: three keys, two possible cells — the evictions cycle forever." },
      { args: [7, [], 3], expect: [[null, null, null, null, null, null, null], [null, null, null, null, null, null, null]], explain: "No keys, empty tables." },
      { args: [5, [9, 5, 5, 10, 11, 21, 24], 3], expect: [[5, 11, null, null, 24], [null, 9, 10, null, 21]], explain: "The last key needs every one of its 3 rounds of evictions — one round fewer would wrongly report a rehash." },
      { args: [4, [0, 4, 8, 12, 1], 5], expect: [[12, 1, null, null], [0, 4, 8, null]] },
      { args: [3, [1, 4, 7, 10], 6], expect: [[null, 10, null], [1, 4, 7]], explain: "All four keys share h1 = 1, but their h2 cells 0, 1, 2 differ, so each newcomer pushes the previous T1 occupant into its own T2 cell." },
      { args: [3, [1, 4, 7, 10, 13], 6], expect: "rehash", explain: "Key 13 has h1 = 1 and h2 = 1: it keeps evicting the same keys around a cycle until the 6 rounds run out." },
      { args: [10, [5, 15, 25, 35, 45], 10], expect: [[null, null, null, null, null, 45, null, null, null, null], [5, 15, 25, 35, null, null, null, null, null, null]] },
    ],
    random: { count: 35, gen: (r, i) => { const m = r.int(3, 12); return [m, r.array(r.int(0, Math.round(m * 1.3)), 0, m * m - 1), r.int(1, 6)]; } },
    reference: cuckooRef,
    mutants: [
      { fn: (m, keys, L) => cuckooRun(m, keys, L, "nodup"), hint: "A repeated key gets stored twice. Before kicking anything out, check whether x is already at T1[h1(x)] or T2[h2(x)]." },
      { fn: (m, keys, L) => cuckooRun(m, keys, L, "minus"), hint: "You give up one round too early. The loop runs maxLoop times, and each round is two swaps (one in T1, one in T2)." },
      { fn: (m, keys, L) => cuckooRun(m, keys, L, "swaps"), hint: "You seem to count every single swap as a round. One round of the loop is a T1 swap followed by a T2 swap." },
    ],
    hints: [
      "Each key has exactly two possible homes. When you evict a key from its T1 home, where is the only other place it can go?",
      "Loop maxLoop times; in each round swap x into T1 at h1(x) and stop if what came out is null; otherwise swap it into T2 at h2(x) and stop if null. If x is still a key after the loop, return \"rehash\".",
      "Compute the cell index first, then swap a variable with a cell: i ← x mod m; swap x and T1[i]. (Don't write swap x and T1[x mod m] — x changes during the swap.) Then the same with i ← (x div m) mod m and T2.",
    ],
    starter: {
      pseudo: `ALGORITHM CuckooInsertAll(m, keys, maxLoop)
    T1 ← array(m, null)
    T2 ← array(m, null)
    for each key in keys do
        ...
    return [T1, T2]`,
      js: `function CuckooInsertAll(m, keys, maxLoop) {
  const T1 = Array(m).fill(null), T2 = Array(m).fill(null);
  // ...
  return [T1, T2];
}`,
    },
    solution: {
      pseudo: `ALGORITHM CuckooInsertAll(m, keys, maxLoop)
    T1 ← array(m, null)
    T2 ← array(m, null)
    for each key in keys do
        if T1[key mod m] ≠ key and T2[(key div m) mod m] ≠ key then
            x ← key
            for t ← 1 to maxLoop do
                i ← x mod m
                swap x and T1[i]
                if x = null then
                    break
                i ← (x div m) mod m
                swap x and T2[i]
                if x = null then
                    break
            if x ≠ null then
                return "rehash"
    return [T1, T2]`,
      js: `function CuckooInsertAll(m, keys, maxLoop) {
  const T1 = Array(m).fill(null), T2 = Array(m).fill(null);
  for (const key of keys) {
    if (T1[key % m] === key || T2[Math.floor(key / m) % m] === key) continue;
    let x = key;
    for (let t = 0; t < maxLoop && x !== null; t++) {
      let i = x % m; [x, T1[i]] = [T1[i], x];
      if (x === null) break;
      i = Math.floor(x / m) % m; [x, T2[i]] = [T2[i], x];
    }
    if (x !== null) return "rehash";
  }
  return [T1, T2];
}`,
      python: `def cuckoo_insert_all(m, keys, max_loop):
    T1, T2 = [None] * m, [None] * m
    for key in keys:
        if T1[key % m] == key or T2[(key // m) % m] == key:
            continue
        x = key
        for _ in range(max_loop):
            i = x % m
            x, T1[i] = T1[i], x
            if x is None:
                break
            i = (x // m) % m
            x, T2[i] = T2[i], x
            if x is None:
                break
        if x is not None:
            return "rehash"
    return [T1, T2]`,
      explain: "Lookups and deletes touch two cells: Θ(1) worst case. Pagh and Rodler show that with load below 1/2 (each table at most half full) and random hash functions an insert runs in expected O(1) time, and a failure (a cycle in the 'cuckoo graph' of cells and keys) happens with probability O(1/n), so the occasional full rehash costs O(1) amortized.",
    },
    complexity: "Θ(1) worst-case lookup; expected O(1) amortized insert at load < 1/2",
    followUp: "MemC3 (Fan, Andersen & Kaminsky, 2013) rebuilt memcached's index on optimistic cuckoo hashing with 4-way buckets, and network switches use cuckoo tables for exact-match forwarding. Senior twist: buckets of 4 slots plus a small stash push the safe load factor from 50% to over 95%.",
    distractors: ["for t ← 0 to maxLoop do", "swap x and T2[x mod m]", "if x = key then"],
    visual: "sims/cuckoo-filters.html",
    lesson: LESSON,
  });

  /* ================================================================== */
  /* 9 · Galloping search (Timsort's gallop_left)                        */
  /* ================================================================== */
  const gallopRef = (B, x) => {
    const n = B.length; let prev = -1, p = 0;
    while (p < n && B[p] < x) { prev = p; p = 2 * p + 1; }
    let lo = prev + 1, hi = Math.min(p, n);
    while (lo < hi) { const mid = Math.floor((lo + hi) / 2); if (B[mid] < x) lo = mid + 1; else hi = mid; }
    return lo;
  };
  const gallopGen = (r, n) => { const B = r.sorted(n, 0, 3 * n + 5); const k = r.int(0, n); const x = r() < 0.5 ? (k < n ? B[k] : 3 * n + 9) : r.int(-2, 3 * n + 8); return [B, x]; };

  ForgeProblems.add({
    id: "galloping-search",
    title: "Galloping Search (Timsort's Exponential Probe)",
    level: 6, chapter: 18, difficulty: 2,
    topics: ["searching", "exponential search", "sorting", "Timsort"],
    strategy: "Exponential probe, then binary search inside the last gap",
    source: "Bentley & Yao (1976), \"An almost optimal algorithm for unbounded searching\" · Tim Peters, CPython Objects/listsort.txt (gallop_left)",
    summary: "Find how many elements of a sorted run are smaller than x using about 2·log₂(k) comparisons, where k is the answer — not log₂(n).",
    statement: `
<p>When Timsort merges two runs and one run keeps "winning", it switches to <b>galloping mode</b>: instead of comparing one element at a
time it probes positions 0, 1, 3, 7, 15, … (each gap doubling) to find how far the winning streak goes, then binary-searches inside the
last gap. If the answer is k, this costs about <b>2·log₂ k</b> comparisons — far less than a linear scan (k) when k is big, and far less
than a plain binary search over the whole run (log₂ n) when k is small.</p>
<p>Write <code>Gallop(B, x)</code>: <code>B</code> is sorted in non-decreasing order; return the number of elements <b>strictly less</b> than x
(the leftmost position where x could be inserted). Use this plan:</p>
<ol>
<li>Probe p = 0, 1, 3, 7, …, (p ← 2p + 1) while <code>p &lt; n</code> and <code>B[p] &lt; x</code>, remembering the last probe that was &lt; x.</li>
<li>The answer now lies between (last successful probe) + 1 and <code>min(p, n)</code>: binary-search that range.</li>
</ol>
<p><b>Budget:</b> the grader counts comparisons involving elements of B and allows at most <code>2⌊log₂ k⌋ + 2</code> of them
(just 1 when k = 0), where k is the correct answer.</p>
<ul><li>0 ≤ n ≤ 400, integers.</li></ul>`,
    entry: "Gallop",
    params: ["B", "x"],
    tests: [
      { args: [[1, 3, 5, 7, 9, 11, 13, 15, 17, 19], 12], expect: 6, explain: "Probes B[0]=1, B[1]=3, B[3]=7 are < 12; B[7]=15 is not. Binary search in positions 4..7 finds 6 elements below 12." },
      { args: [[2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64], 1], expect: 0, explain: "B[0] ≥ 1 already: one comparison. A full binary search would spend about 5." },
      { args: [[], 5], expect: 0, explain: "Empty run: zero comparisons." },
      { args: [[1, 2, 2, 2, 3], 2], expect: 1, explain: "Duplicates: count only the elements STRICTLY less than x (leftmost insertion point)." },
      { args: [[1, 2, 3, 4, 5], 99], expect: 5, explain: "Probes 0, 1, 3 succeed, probe 7 is past the end; binary search in 4..5 confirms all 5." },
      { args: [Array.from({ length: 200 }, (_, i) => i), 3], expect: 3, explain: "k = 3 in a run of 200: budget 2⌊log₂3⌋ + 2 = 4 comparisons, so you can't binary-search the whole run." },
      { args: [Array.from({ length: 64 }, (_, i) => 2 * i), 101], expect: 51, explain: "k = 51: budget 2·5 + 2 = 12 comparisons; a linear scan would need 52." },
      { args: [[5, 5, 5, 5, 5, 5, 5, 5], 5], expect: 0 },
      { args: [[5, 5, 5, 5, 5, 5, 5, 5], 6], expect: 8 },
    ],
    random: { count: 40, gen: (r, i) => gallopGen(r, i * 9) },
    reference: gallopRef,
    budget: { metric: "keyComparisons", label: "element comparisons", limit: (B, x) => { const k = gallopRef(B, x); return k === 0 ? (B.length ? 1 : 0) : 2 * Math.floor(Math.log2(k)) + 2; }, hint: "Too many comparisons. Gallop first (probe 0, 1, 3, 7, … with p ← 2p + 1) and only binary-search the last gap between the final successful probe and the first failing one — never the whole run, and never scan one by one." },
    mutants: [
      { fn: (B, x) => B.filter((v) => v <= x).length, hint: "With duplicates of x you return a position AFTER them. Count only elements strictly less than x: use B[p] < x when probing and B[mid] < x in the binary search." },
      { fn: (B, x) => { const n = B.length; let prev = -1, p = 0; while (p < n && B[p] < x) { prev = p; p = 2 * p + 1; } if (p >= n) return n; return gallopRef(B, x); }, hint: "When the probe jumps past the end of the run you return n — but the elements between the last successful probe and the end were never checked. Binary-search the range up to min(p, n)." },
      { fn: (B, x) => { const n = B.length; let prev = -1, p = 0; while (p < n && B[p] < x) { prev = p; p = 2 * p + 1; } return prev + 1; }, hint: "You stop after galloping, returning (last successful probe) + 1. The answer can be anywhere in the gap up to the failing probe: finish with a binary search over that gap." },
    ],
    hints: [
      "If B[3] < x but B[7] ≥ x, which positions can still hold the boundary? How big is that gap compared with the answer k?",
      "Keep prev ← −1 and p ← 0. While p < n and B[p] < x: prev ← p; p ← 2p + 1. Then lo ← prev + 1 and hi ← p if p < n, else n. (Use an if: the grader counts min(…) as a comparison.)",
      "Finish with the classic leftmost binary search: while lo < hi: mid ← ⌊(lo + hi)/2⌋; if B[mid] < x then lo ← mid + 1 else hi ← mid. Return lo.",
    ],
    starter: {
      pseudo: `ALGORITHM Gallop(B[0..n-1], x)
    // number of elements of B strictly less than x
    prev ← -1
    p ← 0
    ...
    return lo`,
      js: `function Gallop(B, x) {
  // ...
}`,
    },
    solution: {
      pseudo: `ALGORITHM Gallop(B[0..n-1], x)
    prev ← -1
    p ← 0
    while p < n and B[p] < x do
        prev ← p
        p ← 2 * p + 1
    lo ← prev + 1
    hi ← n
    if p < n then
        hi ← p
    while lo < hi do
        mid ← ⌊(lo + hi) / 2⌋
        if B[mid] < x then
            lo ← mid + 1
        else
            hi ← mid
    return lo`,
      js: `function Gallop(B, x) {
  const n = B.length;
  let prev = -1, p = 0;
  while (p < n && B[p] < x) { prev = p; p = 2 * p + 1; }
  let lo = prev + 1, hi = Math.min(p, n);
  while (lo < hi) { const mid = Math.floor((lo + hi) / 2); if (B[mid] < x) lo = mid + 1; else hi = mid; }
  return lo;
}`,
      python: `def gallop(B, x):
    n, prev, p = len(B), -1, 0
    while p < n and B[p] < x:
        prev, p = p, 2 * p + 1
    lo, hi = prev + 1, min(p, n)
    while lo < hi:
        mid = (lo + hi) // 2
        if B[mid] < x:
            lo = mid + 1
        else:
            hi = mid
    return lo`,
      explain: "If the answer is k ≥ 1, the successful probes are at positions 2^j − 1 ≤ k − 1, so there are ⌊log₂k⌋ + 1 of them plus at most one failing probe; the remaining gap holds fewer than 2^⌊log₂k⌋ positions, so the binary search needs at most ⌊log₂k⌋ more. Total ≤ 2⌊log₂k⌋ + 2 = O(log k) — independent of n.",
    },
    complexity: "≤ 2⌊log₂k⌋ + 2 comparisons, k = answer",
    followUp: "CPython's list.sort, Java's Arrays.sort for objects (TimSort) and Android all gallop inside merges, with an adaptive min_gallop threshold that enters galloping after 7 consecutive wins. The same exponential search speeds up intersecting sorted posting lists in search engines.",
    distractors: ["p ← 2 * p", "while p < n and B[p] ≤ x do", "lo ← prev"],
    visual: "sims/sorting-evolution.html",
    lesson: LESSON,
  });

  /* ================================================================== */
  /* 10 · Introsort depth limit                                          */
  /* ================================================================== */
  const introRun = (A, mode) => {
    const n = A.length; let cnt = 0;
    const heap = (l, r) => {
      const m = r - l + 1;
      const sift = (i, size) => { for (;;) { let c = 2 * i + 1; if (c >= size) break; if (c + 1 < size && A[l + c + 1] > A[l + c]) c++; if (A[l + c] > A[l + i]) { [A[l + c], A[l + i]] = [A[l + i], A[l + c]]; i = c; } else break; } };
      for (let i = Math.floor(m / 2) - 1; i >= 0; i--) sift(i, m);
      for (let e = m - 1; e > 0; e--) { [A[l], A[l + e]] = [A[l + e], A[l]]; sift(0, e); }
    };
    const part = (l, r) => { const p = A[r]; let i = l - 1; for (let j = l; j < r; j++) if (A[j] <= p) { i++; [A[i], A[j]] = [A[j], A[i]]; } [A[i + 1], A[r]] = [A[r], A[i + 1]]; return i + 1; };
    const sort = (l, r, d) => {
      if (mode === "depthFirst") { if (d === 0) { heap(l, r); cnt++; return; } if (r - l + 1 <= 1) return; }
      else { if (r - l + 1 <= 1) return; if (d === 0) { heap(l, r); cnt++; return; } }
      const p = part(l, r); sort(l, p - 1, d - 1); sort(p + 1, r, d - 1);
    };
    const lim = mode === "log" ? Math.floor(Math.log2(n)) : mode === "ceil" ? 2 * Math.ceil(Math.log2(n)) : 2 * Math.floor(Math.log2(n));
    if (n >= 2) sort(0, n - 1, lim);
    return [A, cnt];
  };
  const introRef = (A) => introRun(A);

  ForgeProblems.add({
    id: "introsort-depth-limit",
    title: "Introsort: Quicksort with a Safety Net",
    level: 6, chapter: 18, difficulty: 2,
    topics: ["sorting", "quicksort", "heapsort", "worst-case guarantees"],
    strategy: "Quicksort until the recursion depth passes 2⌊log₂n⌋, then heapsort that piece",
    source: "Musser (1997), \"Introspective Sorting and Selection Algorithms\" (Software: Practice and Experience)",
    summary: "Run quicksort, but hand any subarray that is still unsorted at depth 2⌊log₂ n⌋ to heapsort — and count how often that happens.",
    statement: `
<p>Quicksort is fast on average but Θ(n²) on bad inputs (sorted data with a last-element pivot, many equal keys, or inputs crafted by an
attacker). <b>Introsort</b> watches its own recursion depth: when it exceeds <code>2⌊log₂ n⌋</code> it switches that subarray to heapsort,
which is always Θ(k log k). The result: quicksort speed in practice, Θ(n log n) guaranteed. This is what C++'s <code>std::sort</code> does.</p>
<p>Write <code>IntroSort(A)</code> that sorts <code>A</code> in place and returns <code>[A, fallbacks]</code>, where <code>fallbacks</code> counts the
subarrays handed to heapsort. Follow this exact procedure so the count is well defined:</p>
<pre>IntroSort(A[0..n−1]): if n ≥ 2: Sort(A, 0, n − 1, 2⌊log₂ n⌋)
Sort(A, l, r, depth):
    if r − l + 1 ≤ 1: return
    if depth = 0: heapsort A[l..r]; fallbacks ← fallbacks + 1; return
    p ← Partition(A, l, r)            (Lomuto: pivot A[r], move every A[j] ≤ pivot left)
    Sort(A, l, p − 1, depth − 1);  Sort(A, p + 1, r, depth − 1)</pre>
<ul><li>0 ≤ n ≤ 600. <b>Efficiency:</b> the grader feeds already-sorted arrays (quicksort's worst case here) and checks that your
comparisons grow like n log n.</li></ul>`,
    entry: "IntroSort",
    params: ["A"],
    tests: [
      { args: [[3, 1, 2]], expect: [[1, 2, 3], 0], explain: "Depth limit 2⌊log₂3⌋ = 2. Pivot 2 splits [1] | 2 | [3]: done without heapsort." },
      { args: [[1, 2, 3, 4, 5, 6, 7, 8]], expect: [[1, 2, 3, 4, 5, 6, 7, 8], 1], explain: "Sorted input: each Lomuto partition only peels off the largest element. After 6 levels (2⌊log₂8⌋) the remaining 2 elements go to heapsort." },
      { args: [[5, 5, 5, 5, 5, 5, 5, 5]], expect: [[5, 5, 5, 5, 5, 5, 5, 5], 1], explain: "All equal: with 'A[j] ≤ pivot' every element goes left — the same degenerate split." },
      { args: [[]], expect: [[], 0] },
      { args: [[7]], expect: [[7], 0] },
      { args: [[4, 1, 3, 9, 7, 2, 8, 6, 5]], expect: [[1, 2, 3, 4, 5, 6, 7, 8, 9], 0], explain: "Balanced-enough splits never reach the depth limit." },
      { args: [[16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]], expect: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], 1], explain: "Reversed input is just as bad for a last-element pivot: the splits stay lopsided and the depth limit (8) is hit." },
      { args: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]], expect: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32], 1], explain: "n = 32: depth limit 10, then the remaining 22 elements are heapsorted." },
      { args: [[2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1]], expect: [[1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2], 0] },
    ],
    random: { count: 30, gen: (r, i) => [i % 3 === 0 ? r.sorted(2 + i, 0, 9) : r.array(i * 2, 0, 3 + i)] },
    reference: introRef,
    growth: { metric: "keyComparisons", sizes: [32, 64, 128, 256, 512], gen: (r, n) => [Array.from({ length: n }, (_, i) => i)], expect: "n log n" },
    mutants: [
      { fn: (A) => introRun(A, "log"), hint: "You fall back to heapsort too often: the depth limit is 2⌊log₂ n⌋, twice the height of a perfectly balanced recursion, so ordinary unlucky splits don't trigger it." },
      { fn: (A) => introRun(A, "ceil"), hint: "Your depth limit is slightly too big for some n. Use 2⌊log₂ n⌋ (floor), e.g. 2⌊log₂ 9⌋ = 6, not 8." },
      { fn: (A) => introRun(A, "depthFirst"), hint: "You count heapsort fallbacks for subarrays of size 0 or 1. Check 'r − l + 1 ≤ 1 → return' BEFORE checking the depth." },
      { fn: (A) => [A.slice().sort((a, b) => a - b), 0], hint: "You never fall back (0 every time). Pass depth − 1 to both recursive calls and switch to heapsort when depth reaches 0." },
    ],
    hints: [
      "A balanced quicksort recursion is about log₂ n deep. If a branch is twice as deep as that, what does it tell you about the pivots so far?",
      "Write Sort(A, l, r, depth) that returns the number of fallbacks in its range: 0 for size ≤ 1; 1 after heapsorting when depth = 0; otherwise partition and add the two recursive counts with depth − 1.",
      "Heapsort a subarray with an offset: Sift(A, l, i, size) works on A[l + i]; build with i from ⌊m/2⌋ − 1 down to 0, then repeatedly swap A[l] with A[l + e] and sift the root within size e.",
    ],
    starter: {
      pseudo: `ALGORITHM IntroSort(A[0..n-1])
    count ← 0
    if n ≥ 2 then
        count ← Sort(A, 0, n - 1, 2 * ⌊log2(n)⌋)
    return [A, count]

ALGORITHM Sort(A, l, r, depth)
    // returns the number of heapsort fallbacks inside A[l..r]
    ...

ALGORITHM Partition(A, l, r)
    ...

ALGORITHM HeapSort(A, l, r)
    ...`,
      js: `function IntroSort(A) {
  let fallbacks = 0;
  // ...
  return [A, fallbacks];
}`,
    },
    solution: {
      pseudo: `ALGORITHM IntroSort(A[0..n-1])
    count ← 0
    if n ≥ 2 then
        count ← Sort(A, 0, n - 1, 2 * ⌊log2(n)⌋)
    return [A, count]

ALGORITHM Sort(A, l, r, depth)
    if r - l + 1 ≤ 1 then
        return 0
    if depth = 0 then
        HeapSort(A, l, r)
        return 1
    p ← Partition(A, l, r)
    return Sort(A, l, p - 1, depth - 1) + Sort(A, p + 1, r, depth - 1)

ALGORITHM Partition(A, l, r)
    pivot ← A[r]
    i ← l - 1
    for j ← l to r - 1 do
        if A[j] ≤ pivot then
            i ← i + 1
            swap A[i] and A[j]
    swap A[i + 1] and A[r]
    return i + 1

ALGORITHM HeapSort(A, l, r)
    m ← r - l + 1
    for i ← ⌊m / 2⌋ - 1 downto 0 do
        Sift(A, l, i, m)
    for e ← m - 1 downto 1 do
        swap A[l] and A[l + e]
        Sift(A, l, 0, e)

ALGORITHM Sift(A, l, i, size)
    c ← 2 * i + 1
    while c < size do
        if c + 1 < size and A[l + c + 1] > A[l + c] then
            c ← c + 1
        if A[l + c] ≤ A[l + i] then
            return
        swap A[l + c] and A[l + i]
        i ← c
        c ← 2 * i + 1`,
      js: `function IntroSort(A) {
  const n = A.length;
  let fallbacks = 0;
  const heap = (l, r) => {
    const m = r - l + 1;
    const sift = (i, size) => { for (;;) { let c = 2 * i + 1; if (c >= size) return; if (c + 1 < size && A[l + c + 1] > A[l + c]) c++; if (A[l + c] <= A[l + i]) return; [A[l + c], A[l + i]] = [A[l + i], A[l + c]]; i = c; } };
    for (let i = Math.floor(m / 2) - 1; i >= 0; i--) sift(i, m);
    for (let e = m - 1; e > 0; e--) { [A[l], A[l + e]] = [A[l + e], A[l]]; sift(0, e); }
  };
  const part = (l, r) => { const p = A[r]; let i = l - 1; for (let j = l; j < r; j++) if (A[j] <= p) { i++; [A[i], A[j]] = [A[j], A[i]]; } [A[i + 1], A[r]] = [A[r], A[i + 1]]; return i + 1; };
  const sort = (l, r, d) => {
    if (r - l + 1 <= 1) return;
    if (d === 0) { heap(l, r); fallbacks++; return; }
    const p = part(l, r); sort(l, p - 1, d - 1); sort(p + 1, r, d - 1);
  };
  if (n >= 2) sort(0, n - 1, 2 * Math.floor(Math.log2(n)));
  return [A, fallbacks];
}`,
      python: `def intro_sort(A):
    import math
    n, fallbacks = len(A), 0
    def sift(l, i, size):
        while 2 * i + 1 < size:
            c = 2 * i + 1
            if c + 1 < size and A[l + c + 1] > A[l + c]:
                c += 1
            if A[l + c] <= A[l + i]:
                return
            A[l + c], A[l + i] = A[l + i], A[l + c]
            i = c
    def heapsort(l, r):
        m = r - l + 1
        for i in range(m // 2 - 1, -1, -1):
            sift(l, i, m)
        for e in range(m - 1, 0, -1):
            A[l], A[l + e] = A[l + e], A[l]
            sift(l, 0, e)
    def partition(l, r):
        p, i = A[r], l - 1
        for j in range(l, r):
            if A[j] <= p:
                i += 1
                A[i], A[j] = A[j], A[i]
        A[i + 1], A[r] = A[r], A[i + 1]
        return i + 1
    def sort(l, r, d):
        nonlocal fallbacks
        if r - l + 1 <= 1:
            return
        if d == 0:
            heapsort(l, r); fallbacks += 1
            return
        p = partition(l, r)
        sort(l, p - 1, d - 1); sort(p + 1, r, d - 1)
    if n >= 2:
        sort(0, n - 1, 2 * int(math.log2(n)))
    return [A, fallbacks]`,
      explain: "Each recursion level partitions disjoint subarrays, so one level costs O(n) comparisons; the depth cap makes the quicksort part O(n log n) even on adversarial input. The pieces handed to heapsort are disjoint and each costs O(k log k), so the total stays Θ(n log n) in the worst case, while typical inputs never trigger the fallback and keep quicksort's speed.",
    },
    complexity: "Θ(n log n) worst case; O(log n) stack",
    followUp: "libstdc++'s and LLVM libc++'s std::sort are introsorts (with median-of-3 pivots and an insertion-sort cutoff). Go 1.19+ and Rust's sort_unstable moved on to pattern-defeating quicksort (pdqsort, Peters 2021) and its successor ipnsort (Rust 1.81), which also detect already-sorted runs and break up bad patterns by shuffling.",
    distractors: ["count ← Sort(A, 0, n - 1, ⌊log2(n)⌋)", "if depth = 0 and r - l + 1 ≥ 0 then", "if A[j] < pivot then"],
    visual: "sims/sorting-evolution.html",
    lesson: LESSON,
  });
  /* ================================================================== */
  /* 11 · Blelloch work-efficient scan                                   */
  /* ================================================================== */
  const blellochRun = (A, mode) => {
    const n = A.length, T = A.slice(); let work = 0, span = 0;
    for (let s = 1; s < n; s *= 2) { span++; for (let i = 0; i < n; i += 2 * s) { T[i + 2 * s - 1] += T[i + s - 1]; work++; } }
    const tree = T.slice();
    if (mode !== "noclear") T[n - 1] = 0;
    for (let s = n / 2; s >= 1; s /= 2) { span++; for (let i = 0; i < n; i += 2 * s) { const t = T[i + s - 1]; T[i + s - 1] = T[i + 2 * s - 1]; T[i + 2 * s - 1] += t; work++; } }
    if (mode === "inclusive") return [tree, T.map((v, i) => v + A[i]), work, span];
    if (mode === "halfspan") return [tree, T, work, span / 2];
    return [tree, T, work, span];
  };
  const blellochRef = (A) => blellochRun(A);

  ForgeProblems.add({
    id: "blelloch-scan",
    title: "Blelloch Scan: Prefix Sums for Thousands of Cores",
    level: 7, chapter: 18, difficulty: 1,
    topics: ["parallel algorithms", "prefix sums", "work and span", "GPU"],
    strategy: "Up-sweep (reduce) a balanced tree, then down-sweep partial sums",
    source: "Blelloch (1990), \"Prefix Sums and Their Applications\" (CMU-CS-90-190)",
    summary: "Compute an exclusive prefix sum with the up-sweep/down-sweep tree and report its work and span.",
    statement: `
<p>A sequential prefix sum is one loop — but it is inherently serial. Graphics Processing Units (GPUs) compute scans with <b>Blelloch's work-efficient algorithm</b>:
every inner loop below is a set of independent additions that could all run at the same time, so the <b>span</b> (number of parallel
rounds) is only 2·log₂n while the <b>work</b> (total additions) stays Θ(n). Scans are the building block of GPU radix sort, stream
compaction and sparse-matrix kernels.</p>
<p>Write <code>BlellochScan(A)</code> for n a power of 2. Work in a copy T of A:</p>
<pre>Up-sweep:   for s = 1, 2, 4, …, n/2:          (one parallel round each)
                for i = 0, 2s, 4s, … &lt; n:  T[i + 2s − 1] ← T[i + 2s − 1] + T[i + s − 1]
            tree ← a copy of T now
Down-sweep: T[n − 1] ← 0
            for s = n/2, …, 4, 2, 1:          (one parallel round each)
                for i = 0, 2s, 4s, … &lt; n:  t ← T[i + s − 1];  T[i + s − 1] ← T[i + 2s − 1];  T[i + 2s − 1] ← T[i + 2s − 1] + t</pre>
<p>Return <code>[tree, scan, work, span]</code>: the array after the up-sweep, T at the end (the <b>exclusive</b> prefix sums:
<code>scan[i] = A[0] + … + A[i − 1]</code>), the number of additions performed, and the number of rounds (outer-loop iterations).</p>
<ul><li>n = 2^k with 0 ≤ k ≤ 10; integers.</li></ul>`,
    entry: "BlellochScan",
    params: ["A"],
    tests: [
      { args: [[3, 1, 7, 0, 4, 1, 6, 3]], expect: [[3, 4, 7, 11, 4, 5, 6, 25], [0, 3, 4, 11, 11, 15, 16, 22], 14, 6], explain: "The up-sweep leaves pair sums, quad sums and the total 25 at the right end. The down-sweep pushes prefix sums back down: 2(n − 1) = 14 additions in 2·log₂8 = 6 rounds." },
      { args: [[5]], expect: [[5], [0], 0, 0], explain: "n = 1: no rounds; the exclusive scan of one element is [0]." },
      { args: [[2, 9]], expect: [[2, 11], [0, 2], 2, 2] },
      { args: [[1, 1, 1, 1]], expect: [[1, 2, 1, 4], [0, 1, 2, 3], 6, 4], explain: "Exclusive prefix sums of all-ones are 0, 1, 2, 3 — each element's index." },
      { args: [[4, -2, 0, 5, -1, 3, 2, 2, 0, 0, 1, -4, 6, 1, 1, 7]], expect: [[4, 2, 0, 7, -1, 2, 2, 13, 0, 0, 1, -3, 6, 7, 1, 25], [0, 4, 2, 2, 7, 6, 9, 11, 13, 13, 13, 14, 10, 16, 17, 18], 30, 8] },
      { args: [[0, 0, 0, 0, 0, 0, 0, 0]], expect: [[0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0], 14, 6] },
    ],
    random: { count: 25, gen: (r, i) => [r.array(1 << (i % 8), -9, 20)] },
    reference: blellochRef,
    growth: { metric: "steps", sizes: [64, 128, 256, 512, 1024], gen: (r, n) => [r.array(n, 0, 9)], expect: "n" },
    mutants: [
      { fn: (A) => blellochRun(A, "inclusive"), hint: "Your scan includes A[i] itself (an inclusive scan). Blelloch's down-sweep produces the EXCLUSIVE scan: scan[0] is always 0 and scan[i] = A[0] + … + A[i − 1]." },
      { fn: (A) => blellochRun(A, "noclear"), hint: "Your scan is off by the total. Before the down-sweep, replace the root (T[n − 1], which holds the total) with 0, the identity for +." },
      { fn: (A) => blellochRun(A, "halfspan"), hint: "Your span is half the expected value. Both sweeps take log₂n rounds each, so count the rounds of the down-sweep too." },
    ],
    hints: [
      "Picture a balanced binary tree over the array. The up-sweep computes every subtree's sum in place. In the down-sweep, what should a node pass to its left child, and what to its right child?",
      "Two loops with s doubling (up) then halving (down); the inner loop is for i ← 0 to n − 1 step 2 * s. Count work ← work + 1 per addition and span ← span + 1 per outer iteration.",
      "Down-sweep body: t ← T[i + s − 1]; T[i + s − 1] ← T[i + 2s − 1]; T[i + 2s − 1] ← T[i + 2s − 1] + t. The left child gets the parent's value, the right child gets parent + left-subtree sum.",
    ],
    starter: {
      pseudo: `ALGORITHM BlellochScan(A[0..n-1])
    T ← A[0..n-1]
    work ← 0
    span ← 0
    s ← 1
    while s < n do
        ...
    tree ← T[0..n-1]
    ...
    return [tree, T, work, span]`,
      js: `function BlellochScan(A) {
  // return [tree, scan, work, span]
}`,
    },
    solution: {
      pseudo: `ALGORITHM BlellochScan(A[0..n-1])
    T ← A[0..n-1]
    work ← 0
    span ← 0
    s ← 1
    while s < n do
        for i ← 0 to n - 1 step 2 * s do
            T[i + 2 * s - 1] ← T[i + 2 * s - 1] + T[i + s - 1]
            work ← work + 1
        span ← span + 1
        s ← 2 * s
    tree ← T[0..n-1]
    T[n - 1] ← 0
    s ← n div 2
    while s ≥ 1 do
        for i ← 0 to n - 1 step 2 * s do
            t ← T[i + s - 1]
            T[i + s - 1] ← T[i + 2 * s - 1]
            T[i + 2 * s - 1] ← T[i + 2 * s - 1] + t
            work ← work + 1
        span ← span + 1
        s ← s div 2
    return [tree, T, work, span]`,
      js: `function BlellochScan(A) {
  const n = A.length, T = A.slice();
  let work = 0, span = 0;
  for (let s = 1; s < n; s *= 2) { span++; for (let i = 0; i < n; i += 2 * s) { T[i + 2 * s - 1] += T[i + s - 1]; work++; } }
  const tree = T.slice();
  T[n - 1] = 0;
  for (let s = n / 2; s >= 1; s /= 2) { span++; for (let i = 0; i < n; i += 2 * s) { const t = T[i + s - 1]; T[i + s - 1] = T[i + 2 * s - 1]; T[i + 2 * s - 1] += t; work++; } }
  return [tree, T, work, span];
}`,
      python: `def blelloch_scan(A):
    n, T = len(A), A[:]
    work = span = 0
    s = 1
    while s < n:
        for i in range(0, n, 2 * s):
            T[i + 2 * s - 1] += T[i + s - 1]; work += 1
        span += 1; s *= 2
    tree = T[:]
    T[n - 1] = 0
    s = n // 2
    while s >= 1:
        for i in range(0, n, 2 * s):
            t = T[i + s - 1]
            T[i + s - 1] = T[i + 2 * s - 1]
            T[i + 2 * s - 1] += t; work += 1
        span += 1; s //= 2
    return [tree, T, work, span]`,
      explain: "Round s of each sweep performs n/(2s) independent additions, so each sweep does n/2 + n/4 + … + 1 = n − 1 additions: work 2(n − 1) = Θ(n), the same order as the serial loop, but span only 2·log₂n. By Brent's theorem p processors finish in O(n/p + log n) time — unlike the simpler Hillis–Steele scan, which has span log₂n but Θ(n log n) work.",
    },
    complexity: "Work Θ(n), span Θ(log n)",
    followUp: "NVIDIA's CUB and Thrust libraries build GPU radix sort and stream compaction on scans (modern CUB uses Merrill & Garland's single-pass 'decoupled look-back' scan). Senior twist: scans work for any associative operator — max, matrix product, even the carries of binary addition (carry-lookahead adders are a hardware scan).",
    distractors: ["T[n - 1] ← T[n - 1]", "for i ← 0 to n - 1 step s do", "T[i + s - 1] ← T[i + s - 1] + t"],
    visual: "sims/parallel-prefix.html",
    lesson: LESSON,
  });

  /* ================================================================== */
  /* 12 · Succinct rank / select                                         */
  /* ================================================================== */
  const rsRun = (B, ops, mode) => {
    const n = B.length, pre = [0];
    for (const b of B) pre.push(pre[pre.length - 1] + b);
    const total = pre[n];
    return ops.map(([t, v]) => {
      if (t === "rank") { if (mode === "incl") return pre[Math.min(v + 1, n)]; if (mode === "block") return pre[8 * Math.floor(v / 8)]; return pre[v]; }
      if (v < 1 || v > total) return -1;
      let p = 0; while (pre[p + 1] < v) p++;
      return mode === "sel1" ? p + 1 : p;
    });
  };
  const rsRef = (B, ops) => rsRun(B, ops);
  const rsGen = (r, n, q, dens) => {
    const B = Array.from({ length: n }, () => (r() < dens ? 1 : 0));
    const total = B.reduce((a, b) => a + b, 0);
    const ops = Array.from({ length: q }, () => (r() < 0.5 ? ["rank", r.int(0, n)] : ["select", r.int(1, total + 1)]));
    return [B, ops];
  };

  ForgeProblems.add({
    id: "rank-select-bitvector",
    title: "Succinct Bit Vector: Rank and Select",
    level: 7, chapter: 18, difficulty: 2,
    topics: ["succinct data structures", "bit vectors", "binary search", "preprocessing"],
    strategy: "Sampled prefix counts every 8 bits + short in-block scans",
    source: "Jacobson (1989), \"Space-efficient Static Trees and Graphs\" (FOCS) · Navarro, \"Compact Data Structures\" (2016), ch. 4",
    summary: "Answer rank (count 1s before i) and select (where is the k-th 1) queries with block counts instead of rescanning the bits.",
    statement: `
<p><b>Succinct</b> data structures store data in close to the minimum number of bits and still answer queries fast. Their workhorse is a
bit vector with two operations:</p>
<ul>
<li><code>rank(i)</code> = number of 1s in <code>B[0..i−1]</code> (0 ≤ i ≤ n);</li>
<li><code>select(k)</code> = the position of the k-th 1 (k ≥ 1, counting from the left), or −1 if there are fewer than k ones.</li>
</ul>
<p>Write <code>RankSelect(B, ops)</code>. Preprocess once: store <code>R[b]</code> = number of 1s in <code>B[0..8b−1]</code> for every block start
<code>8b ≤ n</code>. Then <code>rank(i)</code> = <code>R[i div 8]</code> plus a scan of at most 7 bits, and <code>select(k)</code> = a binary search over
R for the last block with <code>R[b] &lt; k</code>, then a scan inside that block (and maybe the next ones only if it is the last block).
Each op is <code>["rank", i]</code> or <code>["select", k]</code>; return the list of answers.</p>
<ul><li>0 ≤ n ≤ 1100, up to 1100 operations. <b>Efficiency:</b> with n bits and n queries the total must grow like n log n or better —
rescanning the bit vector for every query (Θ(n²)) is flagged.</li></ul>`,
    entry: "RankSelect",
    params: ["B", "ops"],
    tests: [
      { args: [[1, 0, 1, 1, 0, 0, 1, 0, 1, 1], [["rank", 4], ["rank", 0], ["rank", 10], ["select", 1], ["select", 4], ["select", 7]]], expect: [3, 0, 6, 0, 6, -1], explain: "rank(4) counts B[0..3] = 1,0,1,1 → 3. select(4) is the 4th one, at position 6. There are only 6 ones, so select(7) = −1." },
      { args: [[], [["rank", 0], ["select", 1]]], expect: [0, -1], explain: "Empty vector." },
      { args: [[0, 0, 0, 0, 0, 0, 0, 0, 0, 1], [["select", 1], ["rank", 9], ["rank", 10]]], expect: [9, 0, 1], explain: "The only 1 sits in the second block: R = [0, 0], so the binary search lands on block 1." },
      { args: [[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], [["select", 8], ["select", 9], ["rank", 8], ["rank", 16]]], expect: [7, 8, 8, 16], explain: "Block boundaries: the 8th one is the last bit of block 0, the 9th the first of block 1." },
      { args: [[0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], [["select", 3], ["select", 2], ["rank", 23], ["rank", 24]]], expect: [23, 8, 2, 3] },
      { args: [[1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], [["rank", 7], ["rank", 13], ["select", 10], ["select", 11], ["rank", 20]]], expect: [4, 7, 18, -1, 10] },
    ],
    random: { count: 25, gen: (r, i) => rsGen(r, i * 13, 12, [0.1, 0.5, 0.9][i % 3]) },
    reference: rsRef,
    growth: { metric: "steps", sizes: [64, 128, 256, 512, 1024], gen: (r, n) => rsGen(r, n, n, 0.3), expect: "n log n" },
    mutants: [
      { fn: (B, ops) => rsRun(B, ops, "incl"), hint: "Your rank(i) also counts bit i. rank(i) counts the 1s strictly BEFORE position i, i.e. in B[0..i−1] — so rank(0) is always 0." },
      { fn: (B, ops) => rsRun(B, ops, "sel1"), hint: "Your select answers are one too big. Positions are 0-based: select(1) on [1, 0] is 0." },
      { fn: (B, ops) => rsRun(B, ops, "block"), hint: "rank only seems right at multiples of 8. After reading R[i div 8], add the 1s in B[8·(i div 8) .. i − 1] — the partial block." },
    ],
    hints: [
      "Counting 1s from scratch costs Θ(n) per query. Which counts could you precompute once so that any rank needs only a few extra bits?",
      "Build R with one pass: keep a running count c; whenever i mod 8 = 0 (for i from 0 to n), append c to R; then add B[i] if i < n. rank(i) = R[i div 8] + Σ B[8(i div 8) .. i − 1].",
      "select(k): if k > total return −1. Binary-search b in [0, length(R) − 1] for the largest b with R[b] < k (use mid ← ⌈(lo + hi)/2⌉ and lo ← mid or hi ← mid − 1). Then walk p from 8b, adding bits, until the count reaches k.",
    ],
    starter: {
      pseudo: `ALGORITHM RankSelect(B[0..n-1], ops)
    R ← []
    c ← 0
    for i ← 0 to n do
        ...
    out ← []
    for each op in ops do
        ...
    return out`,
      js: `function RankSelect(B, ops) {
  // return the answers
}`,
    },
    solution: {
      pseudo: `ALGORITHM RankSelect(B[0..n-1], ops)
    R ← []
    c ← 0
    for i ← 0 to n do
        if i mod 8 = 0 then
            append(R, c)
        if i < n then
            c ← c + B[i]
    out ← []
    for each op in ops do
        if op[0] = "rank" then
            r ← R[op[1] div 8]
            for j ← 8 * (op[1] div 8) to op[1] - 1 do
                r ← r + B[j]
            append(out, r)
        else
            append(out, Select(B, R, c, op[1]))
    return out

ALGORITHM Select(B, R, total, k)
    if k > total then
        return -1
    lo ← 0
    hi ← length(R) - 1
    while lo < hi do
        mid ← ⌈(lo + hi) / 2⌉
        if R[mid] < k then
            lo ← mid
        else
            hi ← mid - 1
    p ← 8 * lo
    c ← R[lo] + B[p]
    while c < k do
        p ← p + 1
        c ← c + B[p]
    return p`,
      js: `function RankSelect(B, ops) {
  const n = B.length, R = [];
  let c = 0;
  for (let i = 0; i <= n; i++) { if (i % 8 === 0) R.push(c); if (i < n) c += B[i]; }
  return ops.map(([t, v]) => {
    if (t === "rank") { let r = R[Math.floor(v / 8)]; for (let j = 8 * Math.floor(v / 8); j < v; j++) r += B[j]; return r; }
    if (v > c) return -1;
    let lo = 0, hi = R.length - 1;
    while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (R[mid] < v) lo = mid; else hi = mid - 1; }
    let p = 8 * lo, cnt = R[lo] + B[p];
    while (cnt < v) { p++; cnt += B[p]; }
    return p;
  });
}`,
      python: `def rank_select(B, ops):
    n, R, c = len(B), [], 0
    for i in range(n + 1):
        if i % 8 == 0:
            R.append(c)
        if i < n:
            c += B[i]
    out = []
    for t, v in ops:
        if t == "rank":
            out.append(R[v // 8] + sum(B[8 * (v // 8):v]))
            continue
        if v > c:
            out.append(-1); continue
        lo, hi = 0, len(R) - 1
        while lo < hi:
            mid = (lo + hi + 1) // 2
            if R[mid] < v: lo = mid
            else: hi = mid - 1
        p = 8 * lo; cnt = R[lo] + B[p]
        while cnt < v:
            p += 1; cnt += B[p]
        out.append(p)
    return out`,
      explain: "Preprocessing is one Θ(n) pass storing n/8 counts. rank reads one sample and scans < 8 bits: O(1). select binary-searches the n/8 samples (O(log n)); the k-th one lies after block lo's start and before the next sample exceeding k, so the final scan stays within one block. q queries cost Θ(n + q log n). Real libraries pack 64 bits per word and use popcount, adding only o(n) bits of overhead.",
    },
    complexity: "Θ(n) preprocessing, O(1) rank, O(log n) select",
    followUp: "Rank over a Burrows–Wheeler string is the 'occ' lookup at the heart of the FM-index used by genome aligners such as BWA and Bowtie, and Elias–Fano coded posting lists in search engines are select queries over a bit vector. Senior twist: a second sampling level (one count per 512 bits plus 16-bit sub-counts) brings select to O(1) too.",
    distractors: ["for j ← 8 * (op[1] div 8) to op[1] do", "if R[mid] ≤ k then", "return p + 1"],
    visual: "sims/parallel-prefix.html",
    lesson: LESSON,
  });

  /* ================================================================== */
  /* 13 · MinHash signatures + LSH banding                               */
  /* ================================================================== */
  const lshRun = (docs, a, b, bands, rows, mode) => {
    const sig = docs.map((D) => a.map((ai, i) => Math.min(...D.map((x) => (ai * x + b[i]) % 10007))));
    const n = docs.length, seen = new Set(), pairs = [];
    if (mode === "and") { for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (sig[i].join() === sig[j].join()) pairs.push([i, j]); return pairs; }
    if (mode === "or") { for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (sig[i].some((v, t) => v === sig[j][t])) pairs.push([i, j]); return pairs; }
    for (let t = 0; t < bands; t++) {
      const M = new Map();
      for (let d = 0; d < n; d++) {
        const key = sig[d].slice(t * rows, (t + 1) * rows).join(",");
        const L = M.get(key) || [];
        for (const e of L) { const id = e * n + d; if (mode === "dup" || !seen.has(id)) { seen.add(id); pairs.push([e, d]); } }
        L.push(d); M.set(key, L);
      }
    }
    return pairs.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  };
  const lshRef = (docs, a, b, bands, rows) => lshRun(docs, a, b, bands, rows);
  const HA = [17, 31, 101, 997, 3001, 7919, 43, 57], HB = [5, 11, 13, 19, 23, 29, 2, 7];
  const lshGen = (r, n, bands, rows) => {
    const base = Array.from({ length: Math.max(1, n >> 2) }, () => r.distinct(5, 0, 9999));
    const docs = Array.from({ length: n }, () => { const D = r.pick(base).slice(); if (r() < 0.6) D[r.int(0, 4)] = r.int(0, 9999); return [...new Set(D)]; });
    return [docs, HA.slice(0, bands * rows), HB.slice(0, bands * rows), bands, rows];
  };

  ForgeProblems.add({
    id: "minhash-lsh-candidates",
    title: "MinHash + Locality-Sensitive Hashing: Find Near-Duplicates",
    level: 7, chapter: 18, difficulty: 2,
    topics: ["hashing", "similarity search", "locality-sensitive hashing", "sketches"],
    strategy: "Min-wise hash signatures, then bucket each band of the signature",
    source: "Broder (1997), \"On the resemblance and containment of documents\" · Indyk & Motwani (1998) · Leskovec, Rajaraman & Ullman, \"Mining of Massive Datasets\", ch. 3",
    summary: "Compute MinHash signatures for sets and report every pair that collides in at least one LSH band — without comparing all pairs.",
    statement: `
<p>Web crawlers, plagiarism checkers and Large Language Model (LLM) training pipelines must find near-duplicates among millions of
documents. Comparing all pairs is Θ(n²). <b>MinHash</b> shrinks each document (a set of shingle ids) to a short signature whose
entries agree with probability equal to the Jaccard similarity; <b>Locality-Sensitive Hashing (LSH)</b> then splits signatures into
bands and only pairs that agree on a whole band become candidates — found by hashing, not by pairwise comparison.</p>
<p>Write <code>LSHCandidates(docs, a, b, bands, rows)</code>:</p>
<ul>
<li><code>docs[d]</code> is a non-empty list of distinct integers in 0..9999.</li>
<li>There are <code>k = bands · rows</code> hash functions <code>h_i(x) = (a[i] · x + b[i]) mod 10007</code>.
Signature: <code>sig[d][i] = min over x in docs[d] of h_i(x)</code>.</li>
<li>Band t covers signature positions <code>t·rows .. t·rows + rows − 1</code>. Documents d &lt; e are a <b>candidate pair</b> if for
<i>some</i> band t their signatures agree on all of that band's positions.</li>
</ul>
<p>Return all candidate pairs <code>[d, e]</code> with d &lt; e, each once, sorted by d then e.</p>
<ul><li>0 ≤ n ≤ 300 documents, at most 8 elements each, k ≤ 8. <b>Efficiency:</b> use a map from band values to the documents seen
so far; the grader checks that the work grows linearly with n (no all-pairs loop).</li></ul>`,
    entry: "LSHCandidates",
    params: ["docs", "a", "b", "bands", "rows"],
    tests: [
      { args: [[[1159, 3076, 9209, 13, 1318], [1159, 3076, 9209, 13, 3972], [215, 6928, 8978], [1159, 3076, 9209, 13, 1318]], [17, 31, 101, 997], [5, 11, 13, 19], 2, 2], expect: [[0, 1], [0, 3], [1, 3]], explain: "Docs 0 and 3 are identical, so every band matches. Doc 1 shares 4 of its 5 elements with them (Jaccard 4/6) and matches on at least one band. Doc 2 is unrelated." },
      { args: [[[7]], [3, 5], [1, 1], 1, 2], expect: [], explain: "One document: no pairs." },
      { args: [[], [3], [1], 1, 1], expect: [], explain: "No documents." },
      { args: [[[586, 2734, 5606, 5088, 4214], [586, 2734, 5606, 5088, 1929], [586, 2734, 5606, 5088, 9089]], [17, 31, 101, 997], [5, 11, 13, 19], 1, 4], expect: [], explain: "One band of 4 rows demands that all four MinHashes agree: these sets are similar but not similar enough." },
      { args: [[[586, 2734, 5606, 5088, 4214], [586, 2734, 5606, 5088, 1929], [586, 2734, 5606, 5088, 9089]], [17, 31, 101, 997], [5, 11, 13, 19], 4, 1], expect: [[0, 1], [0, 2], [1, 2]], explain: "The same documents with 4 bands of 1 row: agreeing on ANY single MinHash is enough — more candidates (higher recall, lower precision)." },
      { args: [[[586, 2734, 5606, 5088, 4214], [586, 2734, 5606, 5088, 1929], [586, 2734, 5606, 5088, 9089]], [17, 31, 101, 997], [5, 11, 13, 19], 2, 2], expect: [[0, 2]], explain: "2 bands of 2 rows sit in between." },
      { args: [[[2314, 8988, 8220], [2314, 8988, 3379], [2314, 6828, 3379], [8773, 6828, 3379]], [17, 31, 101, 997, 3001, 7919], [5, 11, 13, 19, 23, 29], 3, 2], expect: [[0, 1], [1, 2], [2, 3]], explain: "A chain of small edits: neighbours collide, distant documents don't." },
      { args: [[[5, 6], [5, 6], [5, 6]], [17, 31, 101, 997], [5, 11, 13, 19], 2, 2], expect: [[0, 1], [0, 2], [1, 2]], explain: "Identical documents collide in both bands — but each pair is reported once." },
    ],
    random: { count: 20, gen: (r, i) => lshGen(r, 2 + i, [1, 2, 4][i % 3], [4, 2, 1][i % 3]) },
    reference: lshRef,
    growth: { metric: "steps", sizes: [24, 48, 96, 192, 384], gen: (r, n) => [Array.from({ length: n }, () => r.distinct(3, 0, 9999)), HA.slice(0, 4), HB.slice(0, 4), 2, 2], expect: "n" },
    mutants: [
      { fn: (docs, a, b, bands, rows) => lshRun(docs, a, b, bands, rows, "and"), hint: "You only report pairs whose WHOLE signature matches. LSH is an OR over bands: one fully matching band is enough to make a candidate." },
      { fn: (docs, a, b, bands, rows) => lshRun(docs, a, b, bands, rows, "or"), hint: "You report pairs that agree on any single MinHash. Within a band ALL rows must agree (AND inside a band, OR across bands)." },
      { fn: (docs, a, b, bands, rows) => lshRun(docs, a, b, bands, rows, "dup"), hint: "Some pairs appear more than once: they collided in several bands. Remember which pairs you already reported (e.g. a set of d · n + e codes)." },
    ],
    hints: [
      "Two documents collide in band t exactly when that slice of their signatures is equal — so use the slice itself as a map key. Who else is already in that bucket?",
      "Compute all signatures first. Then for each band: make a fresh map; for each document d build key = its band slice; every document e already stored under that key forms a pair (e, d); then add d to the bucket.",
      "Avoid duplicates with a set of codes e · n + d. At the end sort the codes; pair = [code div n, code mod n] (codes sort in the same order as the pairs).",
    ],
    starter: {
      pseudo: `ALGORITHM LSHCandidates(docs, a, b, bands, rows)
    n ← length(docs)
    sig ← []
    for each D in docs do
        ...
    seen ← set()
    codes ← []
    for t ← 0 to bands - 1 do
        buckets ← map()
        ...
    return ...`,
      js: `function LSHCandidates(docs, a, b, bands, rows) {
  // return sorted candidate pairs [d, e]
}`,
    },
    solution: {
      pseudo: `ALGORITHM LSHCandidates(docs, a, b, bands, rows)
    n ← length(docs)
    sig ← []
    for each D in docs do
        s ← []
        for i ← 0 to bands * rows - 1 do
            m ← ∞
            for each x in D do
                m ← min(m, (a[i] * x + b[i]) mod 10007)
            append(s, m)
        append(sig, s)
    seen ← set()
    codes ← []
    for t ← 0 to bands - 1 do
        buckets ← map()
        for d ← 0 to n - 1 do
            key ← []
            for i ← t * rows to t * rows + rows - 1 do
                append(key, sig[d][i])
            if not contains(buckets, key) then
                buckets[key] ← []
            for each e in buckets[key] do
                if not contains(seen, e * n + d) then
                    add(seen, e * n + d)
                    append(codes, e * n + d)
            append(buckets[key], d)
    out ← []
    for each c in sorted(codes) do
        append(out, [c div n, c mod n])
    return out`,
      js: `function LSHCandidates(docs, a, b, bands, rows) {
  const n = docs.length;
  const sig = docs.map((D) => a.map((ai, i) => Math.min(...D.map((x) => (ai * x + b[i]) % 10007))));
  const seen = new Set(), pairs = [];
  for (let t = 0; t < bands; t++) {
    const M = new Map();
    for (let d = 0; d < n; d++) {
      const key = sig[d].slice(t * rows, (t + 1) * rows).join(",");
      const L = M.get(key) || [];
      for (const e of L) if (!seen.has(e * n + d)) { seen.add(e * n + d); pairs.push([e, d]); }
      L.push(d); M.set(key, L);
    }
  }
  return pairs.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
}`,
      python: `def lsh_candidates(docs, a, b, bands, rows):
    n = len(docs)
    sig = [[min((ai * x + bi) % 10007 for x in D) for ai, bi in zip(a, b)] for D in docs]
    seen = set()
    for t in range(bands):
        buckets = {}
        for d in range(n):
            key = tuple(sig[d][t * rows:(t + 1) * rows])
            for e in buckets.get(key, []):
                seen.add((e, d))
            buckets.setdefault(key, []).append(d)
    return [list(p) for p in sorted(seen)]`,
      explain: "P[min-hash agrees] = Jaccard similarity s, so a pair collides in a given band with probability s^r and becomes a candidate with probability 1 − (1 − s^r)^b — an S-curve whose threshold is about (1/b)^(1/r). Signatures cost Θ(n·k·|D|) and bucketing Θ(n·b·r) plus the output size, instead of Θ(n²) pairwise comparisons.",
    },
    complexity: "Θ(n·k·|D| + candidates) expected",
    followUp: "AltaVista used MinHash for near-duplicate web pages; today Apache Spark's machine-learning library ships MinHashLSH and LLM data pipelines deduplicate training text this way. Senior twist: tune (bands, rows) so the S-curve threshold sits at your similarity target, then verify candidates with exact Jaccard to remove false positives.",
    distractors: ["m ← max(m, (a[i] * x + b[i]) mod 10007)", "for i ← 0 to rows - 1 do", "append(codes, d * n + e)"],
    visual: "sims/vector-search.html",
    lesson: LESSON,
  });

  /* ================================================================== */
  /* 14 · Timsort natural runs + merge-stack invariants                  */
  /* ================================================================== */
  const timRun = (A, policy) => {
    const n = A.length, runs = [], merges = [], S = [];
    const mergeAt = (k) => { merges.push([S[k], S[k + 1]]); S[k] += S[k + 1]; S.splice(k + 1, 1); };
    const collapse = () => {
      while (S.length > 1 && policy !== "none") {
        let k = S.length - 2;
        const c1 = k > 0 && S[k - 1] <= S[k] + S[k + 1], c2 = policy !== "orig" && k > 1 && S[k - 2] <= S[k - 1] + S[k];
        if (c1 || c2) { if (S[k - 1] < S[k + 1]) k--; mergeAt(k); } else if (S[k] <= S[k + 1]) mergeAt(k); else break;
      }
    };
    let lo = 0;
    while (lo < n) {
      let hi = lo + 1;
      if (hi < n) {
        if (policy === "weak" ? A[hi] <= A[lo] : A[hi] < A[lo]) { hi++; while (hi < n && (policy === "weak" ? A[hi] <= A[hi - 1] : A[hi] < A[hi - 1])) hi++; }
        else { hi++; while (hi < n && A[hi] >= A[hi - 1]) hi++; }
      }
      runs.push(hi - lo); S.push(hi - lo); collapse(); lo = hi;
    }
    while (S.length > 1) { let k = S.length - 2; if (k > 0 && S[k - 1] < S[k + 1]) k--; mergeAt(k); }
    return [runs, merges];
  };
  const timRef = (A) => timRun(A);
  const runsArray = (lens) => { const A = []; lens.forEach((L, t) => { const base = 1000 - 100 * t; for (let j = 0; j < L; j++) A.push(base + j); }); return A; };
  const timGen = (r, n) => { const A = []; while (A.length < n) { const L = r.int(1, 6), up = r() < 0.6, v = r.int(0, 50); for (let j = 0; j < L && A.length < n; j++) A.push(up ? v + j * r.int(0, 2) : v - j * r.int(1, 3)); } return [A]; };

  ForgeProblems.add({
    id: "timsort-merge-policy",
    title: "Timsort: Natural Runs and the Merge Stack",
    level: 7, chapter: 18, difficulty: 3,
    topics: ["sorting", "merge sort", "adaptive algorithms", "invariants", "Timsort"],
    strategy: "Detect natural runs; keep a stack of run lengths that grows like Fibonacci",
    source: "Tim Peters (2002), CPython Objects/listsort.txt · de Gouw, Rot, de Boer, Bubel & Hähnle (2015), \"OpenJDK's java.utils.Collection.sort() is broken\" (CAV)",
    summary: "Split an array into Timsort's natural runs and replay the merge-collapse rules (with the 2015 fix) to list every merge in order.",
    statement: `
<p>Real data is rarely random: it has sorted stretches. <b>Timsort</b> (Python's sort from 2002, Java's object sort) finds these
<b>natural runs</b> and merges them, so nearly-sorted input sorts in close to linear time. Which runs to merge, and when, is decided by a
small stack of run lengths kept "Fibonacci-shaped" — that bounds the stack at O(log n) and keeps merges balanced. In 2015 a formal
verification team found that the original check could break the invariant; the fixed rules are below.</p>
<p>Write <code>TimsortMerges(A)</code> returning <code>[runs, merges]</code>:</p>
<ol>
<li><b>Runs.</b> From position lo: if <code>A[lo+1] &lt; A[lo]</code> the run is <i>strictly descending</i> (extend while
<code>A[k] &lt; A[k−1]</code>); otherwise it is <i>non-descending</i> (extend while <code>A[k] ≥ A[k−1]</code>). A run at the last position has length 1.
(Real Timsort reverses descending runs and pads short runs to a "minrun" with insertion sort — skip both: use every natural run as found.)
<code>runs</code> lists the run lengths in order.</li>
<li><b>Merge collapse</b> after pushing each run's length onto stack S (S[top] newest). Repeat while S has ≥ 2 entries, with
k = (index of the second-from-top entry):
<pre>if (k &gt; 0 and S[k−1] ≤ S[k] + S[k+1]) or (k &gt; 1 and S[k−2] ≤ S[k−1] + S[k]):
    if S[k−1] &lt; S[k+1]: k ← k − 1
    merge entries k and k+1
else if S[k] ≤ S[k+1]: merge entries k and k+1
else: stop</pre></li>
<li><b>At the end</b>, while S has ≥ 2 entries: k ← second-from-top index; if k &gt; 0 and S[k−1] &lt; S[k+1] then k ← k − 1; merge k and k+1.</li>
</ol>
<p>"Merge entries k and k+1" records <code>[S[k], S[k+1]]</code> in <code>merges</code> and replaces both by their sum.</p>
<ul><li>0 ≤ n ≤ 1200. <b>Efficiency:</b> the bookkeeping must be Θ(n) overall (the grader checks growth).</li></ul>`,
    entry: "TimsortMerges",
    params: ["A"],
    tests: [
      { args: [[1, 2, 3, 4]], expect: [[4], []], explain: "Already sorted: one run, nothing to merge — Θ(n) total." },
      { args: [[]], expect: [[], []] },
      { args: [[5, 4, 3, 2, 1, 6, 7, 8]], expect: [[5, 3], [[5, 3]]], explain: "5,4,3,2,1 is strictly descending (5 elements); 6,7,8 ascending. The stack [5, 3] satisfies the invariant (5 > 3), so they merge only at the end." },
      { args: [[3, 3, 2, 2, 1]], expect: [[2, 2, 1], [[2, 2], [4, 1]]], explain: "Descending runs must be STRICT (so reversing them keeps the sort stable): 3,3 is a non-descending run of 2. Pushing the second 2 gives S = [2, 2] and 2 ≤ 2 forces a merge." },
      { args: [[2, 1, 4, 3, 6, 5, 8, 7]], expect: [[2, 2, 2, 2], [[2, 2], [2, 2], [4, 4]]], explain: "Four descending pairs. S = [4, 2, 2] violates S[0] > S[1] + S[2] (4 ≤ 4), so the top two merge, then 4 ≤ 4 merges again." },
      { args: [runsArray([24, 16, 5, 4, 6, 3])], expect: [[24, 16, 5, 4, 6, 3], [[5, 4], [9, 6], [16, 15], [24, 31], [55, 3]]], explain: "The 2015 counterexample shape: after merging 5 + 4 the stack is [24, 16, 9, 6]; the top three look fine, but 24 ≤ 16 + 9 — only the extra check one level deeper catches it." },
      { args: [[1, 1, 1, 0, 0, 0, 2, 2, 1, 1]], expect: [[3, 5, 2], [[3, 5], [8, 2]]], explain: "Equal neighbours extend a non-descending run: 0, 0, 0, 2, 2 is one run of 5." },
      { args: [[9, 8, 7, 1, 2, 3, 4, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5]], expect: [[4, 3, 10], [[4, 3], [7, 10]]] },
    ],
    random: { count: 30, gen: (r, i) => timGen(r, i * 4) },
    reference: timRef,
    growth: { metric: "steps", sizes: [64, 128, 256, 512, 1024], gen: (r, n) => timGen(r, n), expect: "n" },
    mutants: [
      { fn: (A) => timRun(A, "orig"), hint: "Your merges match the pre-2015 rule set. Also check one level deeper: (k > 1 and S[k−2] ≤ S[k−1] + S[k]) — without it the stack invariant can silently break." },
      { fn: (A) => timRun(A, "weak"), hint: "Your descending runs include equal elements. Descending runs must be STRICTLY descending (A[k] < A[k−1]); otherwise reversing them would swap equal keys and Timsort would lose stability." },
      { fn: (A) => timRun(A, "none"), hint: "You only merge at the very end. Run the merge-collapse loop after EVERY push so the stack stays Fibonacci-shaped (that's what keeps merges balanced and the stack O(log n))." },
    ],
    hints: [
      "Two separate pieces: a scanner that finds where each run ends, and a small stack of lengths that is fixed up after every push. You never need to move array elements to produce the answer.",
      "Run scan: hi ← lo + 1; if hi < n: if A[hi] < A[lo] then hi ← hi + 1 and extend while A[hi] < A[hi − 1], else hi ← hi + 1 and extend while A[hi] ≥ A[hi − 1]. Push hi − lo, collapse, set lo ← hi.",
      "Write MergeAt(S, k, merges): append [S[k], S[k + 1]], set S[k] ← S[k] + S[k + 1], removeAt(S, k + 1). Collapse is a while loop over length(S) > 1 with the two conditions exactly as stated, ending in break.",
    ],
    starter: {
      pseudo: `ALGORITHM TimsortMerges(A[0..n-1])
    runs ← []
    merges ← []
    S ← []
    lo ← 0
    while lo < n do
        ...
    ...
    return [runs, merges]

ALGORITHM MergeAt(S, k, merges)
    ...`,
      js: `function TimsortMerges(A) {
  const runs = [], merges = [], S = [];
  // ...
  return [runs, merges];
}`,
    },
    solution: {
      pseudo: `ALGORITHM TimsortMerges(A[0..n-1])
    runs ← []
    merges ← []
    S ← []
    lo ← 0
    while lo < n do
        hi ← lo + 1
        if hi < n and A[hi] < A[lo] then
            hi ← hi + 1
            while hi < n and A[hi] < A[hi - 1] do
                hi ← hi + 1
        else if hi < n then
            hi ← hi + 1
            while hi < n and A[hi] ≥ A[hi - 1] do
                hi ← hi + 1
        append(runs, hi - lo)
        append(S, hi - lo)
        Collapse(S, merges)
        lo ← hi
    while length(S) > 1 do
        k ← length(S) - 2
        if k > 0 and S[k - 1] < S[k + 1] then
            k ← k - 1
        MergeAt(S, k, merges)
    return [runs, merges]

ALGORITHM Collapse(S, merges)
    while length(S) > 1 do
        k ← length(S) - 2
        if (k > 0 and S[k - 1] ≤ S[k] + S[k + 1]) or (k > 1 and S[k - 2] ≤ S[k - 1] + S[k]) then
            if S[k - 1] < S[k + 1] then
                k ← k - 1
            MergeAt(S, k, merges)
        else if S[k] ≤ S[k + 1] then
            MergeAt(S, k, merges)
        else
            break

ALGORITHM MergeAt(S, k, merges)
    append(merges, [S[k], S[k + 1]])
    S[k] ← S[k] + S[k + 1]
    removeAt(S, k + 1)`,
      js: `function TimsortMerges(A) {
  const n = A.length, runs = [], merges = [], S = [];
  const mergeAt = (k) => { merges.push([S[k], S[k + 1]]); S[k] += S[k + 1]; S.splice(k + 1, 1); };
  let lo = 0;
  while (lo < n) {
    let hi = lo + 1;
    if (hi < n && A[hi] < A[lo]) { hi++; while (hi < n && A[hi] < A[hi - 1]) hi++; }
    else if (hi < n) { hi++; while (hi < n && A[hi] >= A[hi - 1]) hi++; }
    runs.push(hi - lo); S.push(hi - lo);
    while (S.length > 1) {
      let k = S.length - 2;
      if ((k > 0 && S[k - 1] <= S[k] + S[k + 1]) || (k > 1 && S[k - 2] <= S[k - 1] + S[k])) { if (S[k - 1] < S[k + 1]) k--; mergeAt(k); }
      else if (S[k] <= S[k + 1]) mergeAt(k);
      else break;
    }
    lo = hi;
  }
  while (S.length > 1) { let k = S.length - 2; if (k > 0 && S[k - 1] < S[k + 1]) k--; mergeAt(k); }
  return [runs, merges];
}`,
      python: `def timsort_merges(A):
    n, runs, merges, S = len(A), [], [], []
    def merge_at(k):
        merges.append([S[k], S[k + 1]])
        S[k] += S[k + 1]
        del S[k + 1]
    lo = 0
    while lo < n:
        hi = lo + 1
        if hi < n and A[hi] < A[lo]:
            hi += 1
            while hi < n and A[hi] < A[hi - 1]: hi += 1
        elif hi < n:
            hi += 1
            while hi < n and A[hi] >= A[hi - 1]: hi += 1
        runs.append(hi - lo); S.append(hi - lo)
        while len(S) > 1:
            k = len(S) - 2
            if (k > 0 and S[k - 1] <= S[k] + S[k + 1]) or (k > 1 and S[k - 2] <= S[k - 1] + S[k]):
                if S[k - 1] < S[k + 1]: k -= 1
                merge_at(k)
            elif S[k] <= S[k + 1]:
                merge_at(k)
            else:
                break
        lo = hi
    while len(S) > 1:
        k = len(S) - 2
        if k > 0 and S[k - 1] < S[k + 1]: k -= 1
        merge_at(k)
    return [runs, merges]`,
      explain: "Run detection compares each adjacent pair once: n − 1 comparisons. The invariants S[i] > S[i+1] + S[i+2] and S[i] > S[i+1] make run lengths grow at least like Fibonacci numbers from the top down, so the stack holds O(log n) runs and every element takes part in O(log n) merges: Θ(n log n) worst case, and Θ(n) when there are few runs. Each collapse iteration either merges (at most runs − 1 times in total) or stops, so the bookkeeping is Θ(number of runs).",
    },
    complexity: "Θ(n) bookkeeping; Θ(n log n) worst-case sort, Θ(n) on presorted input",
    followUp: "CPython used exactly these rules (fixed in 3.4.4/3.5) until Python 3.11 switched list.sort to Munro & Wild's Powersort merge policy, which picks merges from the runs' 'node powers' and is provably near-optimal; Java's Arrays.sort for objects is still TimSort. Senior twist: add minrun padding and galloping (see Galloping Search) and you have the whole algorithm.",
    distractors: ["while hi < n and A[hi] ≤ A[hi - 1] do", "if S[k] < S[k + 1] then", "if k > 0 and S[k - 1] > S[k + 1] then"],
    visual: "sims/sorting-evolution.html",
    lesson: LESSON,
  });

  /* ================================================================== */
  /* 15 · Cuckoo filter (partial-key cuckoo hashing)                     */
  /* ================================================================== */
  const cfRun = (m, b, maxKicks, ops, mode) => {
    const T = Array.from({ length: m }, () => Array(b).fill(0));
    let victim = null; const res = [];
    const alt = (i, f) => (mode === "plus" ? (i + ((f * 37) % m)) % m : ((((f * 37) % m) - i) % m + m) % m);
    const free = (i) => T[i].indexOf(0);
    for (const [op, f, i1] of ops) {
      const i2 = alt(i1, f);
      if (op === "ins") {
        if (victim) { res.push(false); continue; }
        let s = free(i1); if (s >= 0) { T[i1][s] = f; res.push(true); continue; }
        s = free(i2); if (s >= 0) { T[i2][s] = f; res.push(true); continue; }
        let cur = f, i = mode === "fromI1" ? i1 : i2, placed = false;
        for (let k = 0; k < maxKicks; k++) { const slot = k % b; [cur, T[i][slot]] = [T[i][slot], cur]; i = alt(i, cur); s = free(i); if (s >= 0) { T[i][s] = cur; placed = true; break; } }
        if (!placed) victim = [cur, i];
        res.push(true);
      } else if (op === "has") {
        res.push(T[i1].includes(f) || T[i2].includes(f) || (mode !== "novictim" && !!victim && victim[0] === f && (victim[1] === i1 || victim[1] === i2)));
      } else {
        if (mode === "delall") { let hit = false; for (const i of [i1, i2]) for (let s = 0; s < b; s++) if (T[i][s] === f) { T[i][s] = 0; hit = true; } if (hit) { res.push(true); continue; } }
        let s = T[i1].indexOf(f); if (s >= 0) { T[i1][s] = 0; res.push(true); continue; }
        s = T[i2].indexOf(f); if (s >= 0) { T[i2][s] = 0; res.push(true); continue; }
        if (victim && victim[0] === f && (victim[1] === i1 || victim[1] === i2)) { victim = null; res.push(true); continue; }
        res.push(false);
      }
    }
    return [res, T];
  };
  const cfRef = (m, b, k, ops) => cfRun(m, b, k, ops);
  const cfGen = (r, m, b, nops) => {
    const items = Array.from({ length: 2 * m * b }, () => [r.int(1, 15), r.int(0, m - 1)]);
    const ops = [];
    for (let t = 0; t < nops; t++) { const it = r.pick(items), x = r(); ops.push([x < 0.5 ? "ins" : x < 0.8 ? "has" : "del", it[0], it[1]]); }
    return [m, b, r.int(1, 6), ops];
  };

  ForgeProblems.add({
    id: "cuckoo-filter-ops",
    title: "Cuckoo Filter: Membership with Deletes",
    level: 7, chapter: 18, difficulty: 3,
    topics: ["probabilistic data structures", "cuckoo hashing", "filters", "hashing"],
    strategy: "Partial-key cuckoo hashing: the alternate bucket is computed from the fingerprint alone",
    source: "Fan, Andersen, Kaminsky & Mitzenmacher (2014), \"Cuckoo Filter: Practically Better Than Bloom\" (CoNEXT) · reference implementation github.com/efficient/cuckoofilter",
    summary: "Implement insert, lookup and delete for a cuckoo filter that stores fingerprints, relocating them with partial-key cuckoo hashing.",
    statement: `
<p>A Bloom filter answers "have I seen x?" in a few bits per item but cannot delete. A <b>cuckoo filter</b> stores a short
<b>fingerprint</b> f of each item in one of two buckets and can delete. The trick (<b>partial-key cuckoo hashing</b>): a fingerprint
evicted from its bucket must find its other bucket <i>without knowing the original item</i>, so the alternate index is computed from
the fingerprint alone and is an involution — applying it twice returns the start. The paper uses <code>i ⊕ hash(f)</code> with
⊕ = exclusive or (XOR); our engine has no bitwise operators, so we use the equally valid subtraction form, which also works when m is not a power of two:</p>
<pre>Alt(i, f) = ((f * 37) mod m − i) mod m          (so Alt(Alt(i, f), f) = i)</pre>
<p>The table has m buckets × b slots (0 = empty; fingerprints are 1..15). Every op is <code>[kind, f, i1]</code> — the item's fingerprint and
first bucket (already hashed for you); its second bucket is <code>i2 = Alt(i1, f)</code>. Also keep a one-slot <b>victim stash</b> (empty at
first), like the reference implementation.</p>
<ul>
<li><code>"ins"</code>: if the stash is occupied, the filter is full → result <code>false</code>. Else put f in the first empty slot of bucket i1, else
of i2 → <code>true</code>. Else kick: <code>cur ← f; i ← i2</code>; for kick k = 0..maxKicks−1: swap cur with slot <code>k mod b</code> of bucket i;
<code>i ← Alt(i, cur)</code>; if bucket i has an empty slot, put cur in its first one and stop. If all kicks fail, store <code>(cur, i)</code> in the
stash. Either way the result is <code>true</code> (f itself is in the table).</li>
<li><code>"has"</code>: <code>true</code> if f is in bucket i1 or i2, or the stash holds f with index i1 or i2.</li>
<li><code>"del"</code>: remove <b>one</b> copy of f — the first matching slot of bucket i1, else of i2, else the stash (if it matches as above) →
<code>true</code>; otherwise <code>false</code>. (The reference code would also try to re-insert the stashed fingerprint afterwards; we skip that.)</li>
</ul>
<p>Return <code>[results, T]</code>: one boolean per op, and the final buckets.</p>
<ul><li>1 ≤ m ≤ 8, 1 ≤ b ≤ 4, 1 ≤ maxKicks ≤ 8, up to 60 ops.</li></ul>`,
    entry: "CuckooFilter",
    params: ["m", "b", "maxKicks", "ops"],
    tests: [
      { args: [4, 2, 3, [["ins", 5, 1], ["has", 5, 1], ["has", 6, 1], ["del", 5, 1], ["has", 5, 1]]], expect: [[true, true, false, true, false], [[0, 0], [0, 0], [0, 0], [0, 0]]], explain: "5 goes into bucket 1. Fingerprint 6 is not stored, so its lookup is a true negative. After deleting 5 it is gone." },
      { args: [4, 2, 3, [["ins", 7, 2], ["ins", 7, 2], ["ins", 7, 2], ["del", 7, 2], ["has", 7, 2]]], expect: [[true, true, true, true, true], [[0, 0], [7, 0], [0, 7], [0, 0]]], explain: "Duplicates are allowed: bucket 2 takes two copies, the third goes to i2 = (7·37 mod 4 − 2) mod 4 = 1. Deleting removes ONE copy, so 7 is still present." },
      { args: [2, 1, 2, [["ins", 1, 0], ["ins", 3, 0], ["ins", 5, 0], ["has", 5, 0], ["ins", 2, 1], ["has", 1, 0], ["del", 1, 0], ["ins", 2, 1]]], expect: [[true, true, true, true, false, true, true, true], [[5], [2]]], explain: "Two slots in total. The third insert kicks fingerprints around until its 2 kicks run out and fingerprint 1 lands in the stash: the filter is full, so the next insert fails, but lookups still find 1 in the stash. Deleting 1 frees the stash, so the last insert succeeds (stashing another fingerprint)." },
      { args: [3, 1, 4, [["has", 9, 0], ["del", 9, 0]]], expect: [[false, false], [[0], [0], [0]]], explain: "Empty filter: nothing to find or delete." },
      { args: [5, 1, 4, [["ins", 5, 2], ["ins", 9, 2], ["ins", 10, 0], ["ins", 8, 0], ["has", 5, 2], ["has", 9, 2], ["has", 10, 0], ["has", 8, 0]]], expect: [[true, true, true, true, true, true, true, true], [[10], [8], [9], [5], [0]]], explain: "8's buckets 0 and 1 are full, so 8 evicts 9 from bucket 1. 9's other bucket is Alt(1, 9) = (3 − 1) mod 5 = 2, where it evicts 5, which moves to Alt(2, 5) = (0 − 2) mod 5 = 3 — empty. Every item is still found." },
      { args: [5, 2, 5, [["ins", 3, 4], ["ins", 8, 4], ["ins", 13, 4], ["ins", 3, 4], ["ins", 8, 2], ["ins", 13, 1], ["has", 3, 4], ["has", 8, 4], ["has", 13, 4], ["del", 8, 4], ["has", 8, 4], ["has", 8, 2]]], expect: [[true, true, true, true, true, false, true, true, true, true, true, true], [[0, 0], [0, 0], [13, 8], [0, 0], [3, 0]]] },
      { args: [3, 2, 2, [["ins", 4, 1], ["ins", 4, 1], ["ins", 4, 1], ["ins", 4, 1], ["ins", 4, 1], ["has", 4, 2], ["del", 4, 1], ["del", 4, 1], ["has", 4, 1]]], expect: [[true, true, true, true, true, false, true, true, true], [[4, 4], [0, 0], [0, 0]]], explain: "Five copies but only four slots in buckets 1 and 0: the fifth ends in the stash. Fingerprint 4 with first bucket 2 is a different item (its buckets are 2 and 2), so it is not found." },
    ],
    random: { count: 30, gen: (r, i) => cfGen(r, r.int(1, 5), r.int(1, 3), 8 + i) },
    reference: cfRef,
    mutants: [
      { fn: (m, b, k, ops) => cfRun(m, b, k, ops, "plus"), hint: "After kicks, some stored items can't be found (false negatives!). Your alternate-bucket function isn't an involution: (i + h) mod m applied twice doesn't return to i. Use (h − i) mod m with h = (f · 37) mod m." },
      { fn: (m, b, k, ops) => cfRun(m, b, k, ops, "delall"), hint: "A delete wipes every copy of the fingerprint. Cuckoo filters keep one copy per inserted item, so delete must remove exactly ONE matching slot (bucket i1 first, then i2)." },
      { fn: (m, b, k, ops) => cfRun(m, b, k, ops, "novictim"), hint: "Lookups miss a fingerprint that lives in the victim stash. 'has' must also check the stash (same fingerprint and its index equal to i1 or i2)." },
      { fn: (m, b, k, ops) => cfRun(m, b, k, ops, "fromI1"), hint: "Your kick chain starts in the wrong bucket. When both buckets are full, start evicting from bucket i2 (as the reference implementation does), with slot k mod b at kick k." },
    ],
    hints: [
      "When a fingerprint is evicted you only know the fingerprint and the bucket it was sitting in. Why does that suffice to compute its other bucket?",
      "Keep T as m lists of b slots and the stash as a 2-element list V = [fingerprint, index] (V[0] = 0 when empty). Write small helpers: Put(T, i, f) fills the first 0 slot, Remove(T, i, f) clears the first match.",
      "The kick loop: i ← i2; for k ← 0 to maxKicks − 1: s ← k mod b; swap f and T[i][s]; i ← ((f · 37) mod m − i) mod m; if Put(T, i, f) then return true. After the loop: V[0] ← f; V[1] ← i; return true.",
    ],
    starter: {
      pseudo: `ALGORITHM CuckooFilter(m, b, maxKicks, ops)
    T ← matrix(m, b, 0)
    V ← [0, -1]
    res ← []
    for each op in ops do
        f ← op[1]
        i1 ← op[2]
        i2 ← ((f * 37) mod m - i1) mod m
        ...
    return [res, T]`,
      js: `function CuckooFilter(m, b, maxKicks, ops) {
  // return [results, buckets]
}`,
    },
    solution: {
      pseudo: `ALGORITHM CuckooFilter(m, b, maxKicks, ops)
    T ← matrix(m, b, 0)
    V ← [0, -1]
    res ← []
    for each op in ops do
        f ← op[1]
        i1 ← op[2]
        i2 ← ((f * 37) mod m - i1) mod m
        if op[0] = "ins" then
            append(res, Insert(T, V, f, i1, i2, m, b, maxKicks))
        else if op[0] = "has" then
            append(res, f in T[i1] or f in T[i2] or (V[0] = f and (V[1] = i1 or V[1] = i2)))
        else
            append(res, Remove(T, i1, f) or Remove(T, i2, f) or Unstash(V, f, i1, i2))
    return [res, T]

ALGORITHM Insert(T, V, f, i1, i2, m, b, maxKicks)
    if V[0] ≠ 0 then
        return false
    if Put(T, i1, f) or Put(T, i2, f) then
        return true
    i ← i2
    for k ← 0 to maxKicks - 1 do
        s ← k mod b
        swap f and T[i][s]
        i ← ((f * 37) mod m - i) mod m
        if Put(T, i, f) then
            return true
    V[0] ← f
    V[1] ← i
    return true

ALGORITHM Put(T, i, f)
    for s ← 0 to length(T[i]) - 1 do
        if T[i][s] = 0 then
            T[i][s] ← f
            return true
    return false

ALGORITHM Remove(T, i, f)
    for s ← 0 to length(T[i]) - 1 do
        if T[i][s] = f then
            T[i][s] ← 0
            return true
    return false

ALGORITHM Unstash(V, f, i1, i2)
    if V[0] = f and (V[1] = i1 or V[1] = i2) then
        V[0] ← 0
        V[1] ← -1
        return true
    return false`,
      js: `function CuckooFilter(m, b, maxKicks, ops) {
  const T = Array.from({ length: m }, () => Array(b).fill(0));
  let victim = null;
  const res = [];
  const alt = (i, f) => ((((f * 37) % m) - i) % m + m) % m;
  const put = (i, f) => { const s = T[i].indexOf(0); if (s < 0) return false; T[i][s] = f; return true; };
  const rem = (i, f) => { const s = T[i].indexOf(f); if (s < 0) return false; T[i][s] = 0; return true; };
  const inStash = (f, i1, i2) => !!victim && victim[0] === f && (victim[1] === i1 || victim[1] === i2);
  for (const [op, f, i1] of ops) {
    const i2 = alt(i1, f);
    if (op === "ins") {
      if (victim) { res.push(false); continue; }
      if (put(i1, f) || put(i2, f)) { res.push(true); continue; }
      let cur = f, i = i2, placed = false;
      for (let k = 0; k < maxKicks && !placed; k++) {
        const s = k % b;
        [cur, T[i][s]] = [T[i][s], cur];
        i = alt(i, cur);
        placed = put(i, cur);
      }
      if (!placed) victim = [cur, i];
      res.push(true);
    } else if (op === "has") res.push(T[i1].includes(f) || T[i2].includes(f) || inStash(f, i1, i2));
    else if (rem(i1, f) || rem(i2, f)) res.push(true);
    else if (inStash(f, i1, i2)) { victim = null; res.push(true); }
    else res.push(false);
  }
  return [res, T];
}`,
      python: `def cuckoo_filter(m, b, max_kicks, ops):
    T = [[0] * b for _ in range(m)]
    victim = None
    res = []
    alt = lambda i, f: ((f * 37) % m - i) % m
    def put(i, f):
        if 0 in T[i]:
            T[i][T[i].index(0)] = f
            return True
        return False
    def rem(i, f):
        if f in T[i]:
            T[i][T[i].index(f)] = 0
            return True
        return False
    for op, f, i1 in ops:
        i2 = alt(i1, f)
        in_stash = victim is not None and victim[0] == f and victim[1] in (i1, i2)
        if op == "ins":
            if victim is not None:
                res.append(False); continue
            if put(i1, f) or put(i2, f):
                res.append(True); continue
            cur, i, placed = f, i2, False
            for k in range(max_kicks):
                s = k % b
                cur, T[i][s] = T[i][s], cur
                i = alt(i, cur)
                if put(i, cur):
                    placed = True; break
            if not placed:
                victim = (cur, i)
            res.append(True)
        elif op == "has":
            res.append(f in T[i1] or f in T[i2] or in_stash)
        elif rem(i1, f) or rem(i2, f):
            res.append(True)
        elif in_stash:
            victim = None; res.append(True)
        else:
            res.append(False)
    return [res, T]`,
      explain: "Because Alt is an involution, a fingerprint sitting in either of its buckets can always compute the other one, so items never get lost by relocation: no false negatives as long as you only delete what you inserted. Lookups and deletes read 2 buckets (2b slots): O(b). Inserts are expected O(1) at moderate load and bounded by maxKicks. With f-bit fingerprints and 2b candidate slots the false-positive rate is about 2b/2^f.",
    },
    complexity: "O(b) lookup/delete; insert ≤ maxKicks relocations",
    followUp: "Cuckoo filters (4 slots per bucket, ~95% load) beat Bloom filters below about 3% false-positive rate and support deletes; they appear in network caches and storage engines, and Redis Stack's probabilistic module offers a CF.ADD/CF.DEL cuckoo filter. Senior twist: for immutable sets, xor and binary fuse filters are smaller still (see the next problem).",
    distractors: ["i ← (i + (f * 37) mod m) mod m", "i ← i1", "if f in T[i1] and f in T[i2] then"],
    visual: "sims/cuckoo-filters.html",
    lesson: LESSON,
  });
  /* ================================================================== */
  /* 16 · Xor filter construction by peeling (additive variant)          */
  /* ================================================================== */
  const xorRun = (c, H, F, mode) => {
    const n = H.length, count = Array(c).fill(0), total = Array(c).fill(0);
    H.forEach((h, k) => h.forEach((x) => { count[x]++; total[x] += k; }));
    const Q = [];
    for (let x = 0; x < c; x++) if (count[x] === 1) Q.push(x);
    const order = [], cell = [];
    let head = 0;
    while (mode === "lifo" ? Q.length > 0 : head < Q.length) {
      const x = mode === "lifo" ? Q.pop() : Q[head++];
      if (mode !== "noskip" && count[x] !== 1) continue;
      const k = total[x];
      order.push(k); cell.push(x);
      for (const y of H[k]) { count[y]--; total[y] -= k; if (count[y] === 1) Q.push(y); }
    }
    if (order.length < n) return "retry";
    const B = Array(c).fill(0);
    const ts = order.map((_, t) => t);
    if (mode !== "forward") ts.reverse();
    for (const t of ts) { const k = order[t]; let v = F[k]; for (const y of H[k]) if (y !== cell[t]) v -= B[y]; B[cell[t]] = ((v % 256) + 256) % 256; }
    return [order, B];
  };
  const xorRef = (c, H, F) => xorRun(c, H, F);
  const xorGen = (r, n, slack) => {
    const s = Math.ceil((1.23 * n + slack) / 3), c = 3 * s;
    const H = Array.from({ length: n }, () => [r.int(0, s - 1), s + r.int(0, s - 1), 2 * s + r.int(0, s - 1)]);
    return [c, H, H.map(() => r.int(0, 255))];
  };

  ForgeProblems.add({
    id: "xor-filter-peeling",
    title: "Xor Filter: Build It by Peeling",
    level: 7, chapter: 18, difficulty: 3,
    topics: ["probabilistic data structures", "filters", "hypergraph peeling", "hashing"],
    strategy: "Peel cells that hold a single key, then assign values in reverse peel order",
    source: "Graf & Lemire (2020), \"Xor Filters: Faster and Smaller Than Bloom and Cuckoo Filters\" (ACM JEA) · Graf & Lemire (2022), binary fuse filters",
    summary: "Construct a static filter: peel a 3-hypergraph of keys and cells, then fill the table so each key's three cells add up to its fingerprint.",
    statement: `
<p>For a set that never changes (a blocklist, the keys of an immutable database file), an <b>xor filter</b> uses about 1.23 · 8 bits per key for a
0.4% false-positive rate — smaller than a Bloom filter — and a lookup reads exactly 3 cells. Each key k hashes to 3 cells
<code>H[k] = [h0, h1, h2]</code> of a table B and has an 8-bit fingerprint <code>F[k]</code>; the table is filled so that the three cells combine to
the fingerprint. The real filter combines with bitwise exclusive or (XOR); our engine has no bitwise operators, so we use <b>addition mod 256</b>, which works
exactly the same way (any group operation does):</p>
<pre>lookup(k) = ( B[h0] + B[h1] + B[h2] ) mod 256 = F[k] ?</pre>
<p>Filling B is a puzzle solved by <b>peeling</b>. Write <code>XorFilterBuild(c, H, F)</code> for a table of c cells (the three cells of a key are distinct):</p>
<ol>
<li>For every cell x keep <code>count[x]</code> = number of keys using it, and <code>total[x]</code> = the <b>sum of their key indices</b> (when the count is 1,
the total <i>is</i> that key's index — XOR plays this role in the real filter).</li>
<li>Put every cell with count 1 into a First-In First-Out (FIFO) queue, in increasing cell order. Repeatedly take the next cell x; if <code>count[x] ≠ 1</code>
now, skip it. Otherwise k ← total[x]: record k in <code>order</code> and x as k's own cell, then remove k from all three of its cells (decrease
counts and totals); any cell whose count drops to exactly 1 joins the back of the queue.</li>
<li>If fewer than n keys were peeled, return <code>"retry"</code> (the real construction re-hashes with a new seed).</li>
<li>Otherwise B starts all 0. Go through <code>order</code> <b>backwards</b>: for key k with own cell x, set
<code>B[x] ← (F[k] − B[y] − B[z]) mod 256</code>, where y and z are k's other two cells.</li>
</ol>
<p>Return <code>[order, B]</code>.</p>
<ul><li>0 ≤ n ≤ 600 keys, c ≈ 1.23n + 30. <b>Efficiency:</b> Θ(n + c) total — the grader checks growth, so don't rescan all cells to find the next one.</li></ul>`,
    entry: "XorFilterBuild",
    params: ["c", "H", "F"],
    tests: [
      { args: [6, [[0, 2, 4], [1, 2, 5], [0, 3, 5]], [10, 20, 30]], expect: [[1, 2, 0], [0, 20, 0, 30, 10, 0]], explain: "Queue starts [1, 3, 4]. Cell 1 holds only key 1 → peel it (cells 2 and 5 drop to count 1). Cell 3 → key 2, cell 4 → key 0. Assigning backwards: B[4] = 10, B[3] = 30, B[1] = 20; now every key's three cells add up to its fingerprint." },
      { args: [3, [[0, 1, 2], [0, 1, 2]], [5, 6]], expect: "retry", explain: "Every cell is shared by both keys: nothing can be peeled — a 2-core. Rehash and try again." },
      { args: [3, [], []], expect: [[], [0, 0, 0]], explain: "No keys: an all-zero table." },
      { args: [3, [[0, 1, 2]], [200]], expect: [[0], [200, 0, 0]], explain: "One key peels from its first cell; the other two cells stay 0." },
      { args: [7, [[0, 1, 2], [1, 2, 3], [3, 4, 5], [4, 5, 6]], [5, 3, 200, 9]], expect: [[0, 3, 1, 2], [2, 3, 0, 0, 200, 0, 65]], explain: "Key 1 can only be peeled after key 0 frees cell 1, and key 2 after key 3 frees cell 4. Backwards: B[4] = 200, B[1] = 3, then key 3 sees B[4] = 200 already set: B[6] = (9 − 200) mod 256 = 65 — values wrap around. Check key 0: 2 + 3 + 0 = 5." },
      { args: [9, [[0, 3, 6], [1, 3, 7], [1, 4, 6], [2, 5, 8]], [7, 250, 3, 100]], expect: [[0, 3, 2, 1], [7, 0, 100, 0, 3, 0, 0, 250, 0]] },
      { args: [6, [[0, 2, 4], [0, 3, 5], [1, 2, 5], [1, 3, 4]], [1, 2, 3, 4]], expect: "retry", explain: "Every cell is used exactly twice, so the queue starts empty." },
    ],
    random: { count: 30, gen: (r, i) => xorGen(r, i * 3, i % 2 ? 12 : 3) },
    reference: xorRef,
    growth: { metric: "steps", sizes: [64, 128, 256, 512, 1024], gen: (r, n) => xorGen(r, n, 40), expect: "n" },
    mutants: [
      { fn: (c, H, F) => xorRun(c, H, F, "lifo"), hint: "Your peel order differs: you take cells from the END of the list (a stack). Use a FIFO queue — keep a head index and read Q[head], so cells are processed in the order they became 'pure'." },
      { fn: (c, H, F) => xorRun(c, H, F, "forward"), hint: "Some keys' cells don't add up to their fingerprints. Assign in REVERSE peel order: the key peeled last is set first, so when a key sets its own cell, its other two cells are already final." },
      { fn: (c, H, F) => xorRun(c, H, F, "noskip"), hint: "You peel cells whose count has dropped to 0 since they were queued (their total is then meaningless). When you take a cell from the queue, skip it unless count[x] is still exactly 1." },
    ],
    hints: [
      "If a cell is used by only one key, that key can be 'solved last' — whatever its other cells end up holding, you can still set this cell to make the sum come out right. Removing that key may free up more such cells.",
      "Count keys per cell and sum their indices. Queue all count-1 cells; pop with a head pointer; skip stale cells; record (key, cell) and subtract the key from its three cells, enqueueing cells that reach count 1.",
      "Assignment: for t ← n − 1 downto 0: k ← order[t]; v ← F[k]; subtract B[y] for each y in H[k] other than cell[t]; B[cell[t]] ← v mod 256.",
    ],
    starter: {
      pseudo: `ALGORITHM XorFilterBuild(c, H, F)
    n ← length(H)
    count ← array(c, 0)
    total ← array(c, 0)
    ...
    order ← []
    cell ← []
    ...
    return [order, B]`,
      js: `function XorFilterBuild(c, H, F) {
  // return [order, B] or "retry"
}`,
    },
    solution: {
      pseudo: `ALGORITHM XorFilterBuild(c, H, F)
    n ← length(H)
    count ← array(c, 0)
    total ← array(c, 0)
    for k ← 0 to n - 1 do
        for each x in H[k] do
            count[x] ← count[x] + 1
            total[x] ← total[x] + k
    Q ← []
    for x ← 0 to c - 1 do
        if count[x] = 1 then
            append(Q, x)
    order ← []
    cell ← []
    head ← 0
    while head < length(Q) do
        x ← Q[head]
        head ← head + 1
        if count[x] = 1 then
            k ← total[x]
            append(order, k)
            append(cell, x)
            for each y in H[k] do
                count[y] ← count[y] - 1
                total[y] ← total[y] - k
                if count[y] = 1 then
                    append(Q, y)
    if length(order) < n then
        return "retry"
    B ← array(c, 0)
    for t ← n - 1 downto 0 do
        v ← F[order[t]]
        for each y in H[order[t]] do
            if y ≠ cell[t] then
                v ← v - B[y]
        B[cell[t]] ← v mod 256
    return [order, B]`,
      js: `function XorFilterBuild(c, H, F) {
  const n = H.length, count = Array(c).fill(0), total = Array(c).fill(0);
  H.forEach((h, k) => h.forEach((x) => { count[x]++; total[x] += k; }));
  const Q = [];
  for (let x = 0; x < c; x++) if (count[x] === 1) Q.push(x);
  const order = [], cell = [];
  for (let head = 0; head < Q.length; head++) {
    const x = Q[head];
    if (count[x] !== 1) continue;
    const k = total[x];
    order.push(k); cell.push(x);
    for (const y of H[k]) { count[y]--; total[y] -= k; if (count[y] === 1) Q.push(y); }
  }
  if (order.length < n) return "retry";
  const B = Array(c).fill(0);
  for (let t = n - 1; t >= 0; t--) {
    let v = F[order[t]];
    for (const y of H[order[t]]) if (y !== cell[t]) v -= B[y];
    B[cell[t]] = ((v % 256) + 256) % 256;
  }
  return [order, B];
}`,
      python: `def xor_filter_build(c, H, F):
    n = len(H)
    count, total = [0] * c, [0] * c
    for k, h in enumerate(H):
        for x in h:
            count[x] += 1; total[x] += k
    Q = [x for x in range(c) if count[x] == 1]
    order, cell, head = [], [], 0
    while head < len(Q):
        x = Q[head]; head += 1
        if count[x] != 1:
            continue
        k = total[x]
        order.append(k); cell.append(x)
        for y in H[k]:
            count[y] -= 1; total[y] -= k
            if count[y] == 1:
                Q.append(y)
    if len(order) < n:
        return "retry"
    B = [0] * c
    for t in range(n - 1, -1, -1):
        k = order[t]
        v = F[k] - sum(B[y] for y in H[k] if y != cell[t])
        B[cell[t]] = v % 256
    return [order, B]`,
      explain: "Peeling removes one key per step and touches only its 3 cells, and each cell enters the queue at most twice, so it runs in Θ(n + c). It succeeds with high probability when c ≥ 1.23n (random 3-hypergraphs below that density have an empty 2-core). In reverse peel order, a key's own cell is untouched by every key assigned after it, so setting it last makes that key's sum exact — every inserted key passes the lookup; a random non-key passes with probability 1/256.",
    },
    complexity: "Θ(n + c) construction, 3 memory reads per lookup",
    followUp: "Binary fuse filters (Graf & Lemire, 2022) place the 3 cells in nearby segments for cache locality and need only about 1.125 cells per key. Static filters like these suit immutable data — e.g. per-file key filters in log-structured storage engines or blocklists shipped to browsers. Senior twist: since construction is one pass plus a queue, it parallelizes and streams well.",
    distractors: ["x ← pop(Q)", "for t ← 0 to n - 1 do", "if count[x] ≥ 1 then"],
    visual: "sims/cuckoo-filters.html",
    lesson: LESSON,
  });

  /* ================================================================== */
  /* 17 · 2-SAT via implication graph + SCC                               */
  /* ================================================================== */
  const satSolve = (n, clauses, mode) => {
    const V = 2 * n, G = Array.from({ length: V }, () => []), R = Array.from({ length: V }, () => []);
    const lit = (x) => (x > 0 ? 2 * (x - 1) : 2 * (-x - 1) + 1), neg = (v) => (v % 2 === 0 ? v + 1 : v - 1);
    for (const [a, b] of clauses) {
      const u = lit(a), v = lit(b);
      G[neg(u)].push(v); R[v].push(neg(u));
      if (mode !== "oneEdge") { G[neg(v)].push(u); R[u].push(neg(v)); }
    }
    if (mode === "oneDir") {
      for (let i = 0; i < n; i++) { const seen = new Set([2 * i]), st = [2 * i]; while (st.length) { const x = st.pop(); for (const y of G[x]) if (!seen.has(y)) { seen.add(y); st.push(y); } } if (seen.has(2 * i + 1)) return null; }
    }
    const seen = Array(V).fill(false), order = [];
    const dfs1 = (v) => { seen[v] = true; for (const w of G[v]) if (!seen[w]) dfs1(w); order.push(v); };
    for (let v = 0; v < V; v++) if (!seen[v]) dfs1(v);
    const comp = Array(V).fill(-1); let c = 0;
    const dfs2 = (v) => { comp[v] = c; for (const w of R[v]) if (comp[w] === -1) dfs2(w); };
    for (let t = V - 1; t >= 0; t--) if (comp[order[t]] === -1) { dfs2(order[t]); c++; }
    const ans = [];
    for (let i = 0; i < n; i++) { if (comp[2 * i] === comp[2 * i + 1]) return null; ans.push(mode === "flip" ? comp[2 * i] < comp[2 * i + 1] : comp[2 * i] > comp[2 * i + 1]); }
    return ans;
  };
  const satBrute = (n, clauses) => { for (let m = 0; m < 1 << n; m++) { const val = (x) => (x > 0 ? (m >> (x - 1)) & 1 : !((m >> (-x - 1)) & 1)); if (clauses.every(([a, b]) => val(a) || val(b))) return true; } return false; };
  const satVerify = (got, args) => {
    const [n, clauses] = args;
    const sat = n <= 16 ? satBrute(n, clauses) : satSolve(n, clauses) !== null;
    if (!sat) return got === null || got === undefined ? true : "This formula is unsatisfiable (some variable is forced both true and false), so the answer must be null.";
    if (!Array.isArray(got)) return "This formula IS satisfiable — return a list of n true/false values.";
    if (got.length !== n) return `Return exactly n = ${n} values, one per variable.`;
    for (const [a, b] of clauses) {
      const val = (x) => (x > 0 ? got[x - 1] === true : got[-x - 1] === false);
      if (!val(a) && !val(b)) return `Clause (${a}, ${b}) is false under your assignment.`;
    }
    return true;
  };
  const satGen = (r, n, m, planted) => {
    const truth = Array.from({ length: n }, () => r() < 0.5), clauses = [];
    const rl = () => r.int(1, n) * (r() < 0.5 ? 1 : -1);
    while (clauses.length < m) {
      const a = rl(), b = rl();
      const val = (x) => (x > 0 ? truth[x - 1] : !truth[-x - 1]);
      if (!planted || val(a) || val(b)) clauses.push([a, b]);
    }
    return [n, clauses];
  };

  ForgeProblems.add({
    id: "two-sat-scc",
    title: "2-Satisfiability (2-SAT) in Linear Time",
    level: 6, chapter: 18, difficulty: 3,
    topics: ["satisfiability", "strongly connected components", "graphs", "reductions"],
    strategy: "Implication graph + strongly connected components in topological order",
    source: "Aspvall, Plass & Tarjan (1979), \"A linear-time algorithm for testing the truth of certain quantified boolean formulas\" (IPL)",
    summary: "Decide a formula in 2-Conjunctive Normal Form (2-CNF) and produce a satisfying assignment with the implication graph and its strongly connected components.",
    statement: `
<p>General Boolean satisfiability (SAT) is Nondeterministic Polynomial-time complete (NP-complete), but when every clause has only <b>two</b> literals it is solvable in linear time — the
classic polynomial island inside a hard problem. Each clause (a ∨ b) says "if not a then b" and "if not b then a". Draw these as edges of an
<b>implication graph</b> on the 2n literals. The formula is unsatisfiable exactly when some variable x and its negation ¬x lie in the same
<b>Strongly Connected Component (SCC)</b>; otherwise, numbering the SCCs in topological order, setting x true exactly when x's component
comes <i>after</i> ¬x's gives a satisfying assignment.</p>
<p>Write <code>TwoSAT(n, clauses)</code>. Variables are 1..n; a literal is <code>+i</code> (x_i) or <code>−i</code> (¬x_i); each clause is a pair
<code>[a, b]</code> meaning (a ∨ b). Return a list of n booleans (value of x_1..x_n) satisfying every clause, or <code>null</code> if none exists.
Any satisfying assignment is accepted.</p>
<ul><li>0 ≤ n ≤ 600, up to 1500 clauses (a clause may repeat a literal: [x, x] forces x). <b>Efficiency:</b> Θ(n + m) — the grader checks growth,
so trying assignments is out.</li></ul>`,
    entry: "TwoSAT",
    params: ["n", "clauses"],
    tests: [
      { args: [2, [[1, 2], [-1, 2], [1, -2]]], expect: [true, true], explain: "x2 must be true (the first two clauses cover both values of x1), and then (x1 ∨ ¬x2) forces x1 true." },
      { args: [1, [[1, 1], [-1, -1]]], expect: null, explain: "[1, 1] forces x1 and [−1, −1] forces ¬x1: x1 and ¬x1 imply each other — same SCC." },
      { args: [3, [[-1, 2], [-2, 3], [-3, -1]]], expect: [false, false, false], explain: "x1 → x2 → x3 → ¬x1, so x1 must be false. A path from x1 to ¬x1 alone is fine — unsatisfiable needs paths BOTH ways." },
      { args: [3, []], expect: [false, false, false], explain: "No clauses: any assignment works." },
      { args: [2, [[1, 2], [1, -2], [-1, 2], [-1, -2]]], expect: null, explain: "All four combinations are forbidden." },
      { args: [4, [[1, 2], [-2, 3], [-3, 4], [-4, -1], [2, 4]]], expect: [false, true, true, true] },
      { args: [5, [[1, -2], [2, -3], [3, -4], [4, -5], [5, 1], [-1, -5]]], expect: [true, false, false, false, false] },
      { args: [3, [[1, 2], [-1, 3], [-2, 3], [-3, 1], [-3, 2], [-1, -2]]], expect: null },
    ],
    random: { count: 30, gen: (r, i) => satGen(r, 1 + (i % 10), r.int(1, 3 * (1 + (i % 10))), i % 3 !== 0) },
    verify: satVerify,
    growth: { metric: "steps", sizes: [32, 64, 128, 256, 512], gen: (r, n) => satGen(r, n, 2 * n, true), expect: "n" },
    mutants: [
      { fn: (n, cl) => satSolve(n, cl, "flip"), hint: "Your assignment violates clauses although you detect unsatisfiability correctly. Flip the rule: x is true when x's SCC comes AFTER ¬x's in topological order (if ¬x ⇒ … ⇒ x is possible, x must be the true one)." },
      { fn: (n, cl) => satSolve(n, cl, "oneEdge"), hint: "Each clause (a ∨ b) gives TWO implications: ¬a → b and ¬b → a. With only one of them the graph misses forced consequences." },
      { fn: (n, cl) => satSolve(n, cl, "oneDir"), hint: "You report 'unsatisfiable' when x merely implies ¬x. That only forces x = false. The formula is unsatisfiable only if x and ¬x are in the same SCC (paths in BOTH directions)." },
    ],
    hints: [
      "Turn each clause into implications. When is a set of implications contradictory? Think about x ⇒ … ⇒ ¬x and ¬x ⇒ … ⇒ x together.",
      "Number literal +i as 2(i − 1) and −i as 2(i − 1) + 1, so negation flips the last bit (v + 1 or v − 1). Build G and its reverse R, then run Kosaraju: a Depth-First Search (DFS) on G recording finish order, then DFS on R in reverse finish order labelling components 0, 1, 2, …",
      "Kosaraju's second pass labels components in topological order of G. For each i: if comp[2i] = comp[2i + 1] return null; otherwise x_{i+1} ← comp[2i] > comp[2i + 1].",
    ],
    starter: {
      pseudo: `ALGORITHM TwoSAT(n, clauses)
    G ← array(2 * n, [])
    R ← array(2 * n, [])
    for each cl in clauses do
        ...
    ...
    return ans

ALGORITHM Lit(x)
    // +i → 2(i − 1), −i → 2(i − 1) + 1
    ...`,
      js: `function TwoSAT(n, clauses) {
  // return an array of n booleans, or null
}`,
    },
    solution: {
      pseudo: `ALGORITHM TwoSAT(n, clauses)
    G ← array(2 * n, [])
    R ← array(2 * n, [])
    for each cl in clauses do
        u ← Lit(cl[0])
        v ← Lit(cl[1])
        append(G[Neg(u)], v)
        append(G[Neg(v)], u)
        append(R[v], Neg(u))
        append(R[u], Neg(v))
    seen ← array(2 * n, false)
    order ← []
    for v ← 0 to 2 * n - 1 do
        if not seen[v] then
            Visit(G, v, seen, order)
    comp ← array(2 * n, -1)
    c ← 0
    for t ← 2 * n - 1 downto 0 do
        if comp[order[t]] = -1 then
            Label(R, order[t], comp, c)
            c ← c + 1
    ans ← []
    for i ← 0 to n - 1 do
        if comp[2 * i] = comp[2 * i + 1] then
            return null
        append(ans, comp[2 * i] > comp[2 * i + 1])
    return ans

ALGORITHM Lit(x)
    if x > 0 then
        return 2 * (x - 1)
    return 2 * (-x - 1) + 1

ALGORITHM Neg(v)
    if v mod 2 = 0 then
        return v + 1
    return v - 1

ALGORITHM Visit(G, v, seen, order)
    seen[v] ← true
    for each w in G[v] do
        if not seen[w] then
            Visit(G, w, seen, order)
    append(order, v)

ALGORITHM Label(R, v, comp, c)
    comp[v] ← c
    for each w in R[v] do
        if comp[w] = -1 then
            Label(R, w, comp, c)`,
      js: `function TwoSAT(n, clauses) {
  const V = 2 * n, G = Array.from({ length: V }, () => []), R = Array.from({ length: V }, () => []);
  const lit = (x) => (x > 0 ? 2 * (x - 1) : 2 * (-x - 1) + 1), neg = (v) => (v % 2 === 0 ? v + 1 : v - 1);
  for (const [a, b] of clauses) { const u = lit(a), v = lit(b); G[neg(u)].push(v); G[neg(v)].push(u); R[v].push(neg(u)); R[u].push(neg(v)); }
  const seen = Array(V).fill(false), order = [];
  const visit = (v) => { seen[v] = true; for (const w of G[v]) if (!seen[w]) visit(w); order.push(v); };
  for (let v = 0; v < V; v++) if (!seen[v]) visit(v);
  const comp = Array(V).fill(-1); let c = 0;
  const label = (v) => { comp[v] = c; for (const w of R[v]) if (comp[w] === -1) label(w); };
  for (let t = V - 1; t >= 0; t--) if (comp[order[t]] === -1) { label(order[t]); c++; }
  const ans = [];
  for (let i = 0; i < n; i++) { if (comp[2 * i] === comp[2 * i + 1]) return null; ans.push(comp[2 * i] > comp[2 * i + 1]); }
  return ans;
}`,
      python: `def two_sat(n, clauses):
    import sys
    sys.setrecursionlimit(10000)
    V = 2 * n
    G = [[] for _ in range(V)]; R = [[] for _ in range(V)]
    lit = lambda x: 2 * (x - 1) if x > 0 else 2 * (-x - 1) + 1
    neg = lambda v: v ^ 1
    for a, b in clauses:
        u, v = lit(a), lit(b)
        G[neg(u)].append(v); G[neg(v)].append(u)
        R[v].append(neg(u)); R[u].append(neg(v))
    seen, order = [False] * V, []
    def visit(v):
        seen[v] = True
        for w in G[v]:
            if not seen[w]: visit(w)
        order.append(v)
    for v in range(V):
        if not seen[v]: visit(v)
    comp, c = [-1] * V, 0
    def label(v):
        comp[v] = c
        for w in R[v]:
            if comp[w] == -1: label(w)
    for v in reversed(order):
        if comp[v] == -1:
            label(v); c += 1
    ans = []
    for i in range(n):
        if comp[2 * i] == comp[2 * i + 1]:
            return None
        ans.append(comp[2 * i] > comp[2 * i + 1])
    return ans`,
      explain: "The implication graph has 2n vertices and 2m edges and is 'skew-symmetric' (u → v iff ¬v → ¬u). If x and ¬x share an SCC, x ⇒ ¬x and ¬x ⇒ x, a contradiction. Otherwise choosing, for every variable, the literal whose component is later in topological order never lets a true literal imply a false one, so all clauses hold. Two DFS passes give Θ(n + m).",
    },
    complexity: "Θ(n + m)",
    followUp: "General SAT solvers (MiniSat, CaDiCaL) run conflict-driven clause learning, and many detect binary clauses and handle them with exactly this implication graph; package managers such as openSUSE's libsolv (behind zypper and dnf) turn dependency resolution into SAT. Senior twist: 2-SAT also solves 'choose one of two positions for each label without overlaps' problems in map labeling and scheduling.",
    distractors: ["append(ans, comp[2 * i] < comp[2 * i + 1])", "for t ← 0 to 2 * n - 1 do", "append(G[u], v)"],
    visual: "sims/scc.html",
    lesson: LESSON,
  });

  /* ================================================================== */
  /* 18 · Johnson's all-pairs shortest paths                              */
  /* ================================================================== */
  const johnsonRun = (n, E, mode) => {
    const h = Array(n).fill(0);
    for (let it = 0; it < n; it++) { let ch = false; for (const [u, v, w] of E) if (h[u] + w < h[v]) { h[v] = h[u] + w; ch = true; } if (!ch) break; }
    if (mode !== "nocheck") for (const [u, v, w] of E) if (h[u] + w < h[v]) return null;
    const adj = Array.from({ length: n }, () => []);
    for (const [u, v, w] of E) adj[u].push([v, mode === "plain" ? w : w + h[u] - h[v]]);
    const D = [];
    for (let s = 0; s < n; s++) {
      const d = Array(n).fill(Infinity), done = Array(n).fill(false);
      d[s] = 0;
      for (;;) {
        let u = -1; for (let x = 0; x < n; x++) if (!done[x] && d[x] < Infinity && (u < 0 || d[x] < d[u])) u = x;
        if (u < 0) break; done[u] = true;
        for (const [v, w] of adj[u]) if (!done[v] && d[u] + w < d[v]) d[v] = d[u] + w;
      }
      D.push(d.map((x, v) => (x === Infinity ? Infinity : mode === "plain" || mode === "noundo" ? x : x - h[s] + h[v])));
    }
    return D;
  };
  const johnsonRef = (n, E) => johnsonRun(n, E);
  const johnsonGen = (r, n, m, negCycleChance) => {
    const p = Array.from({ length: n }, () => r.int(0, 12)), E = [];
    for (let t = 0; t < m; t++) { const u = r.int(0, n - 1); let v = r.int(0, n - 1); if (v === u) v = (u + 1) % n; if (n > 1) E.push([u, v, r.int(0, 9) - p[u] + p[v]]); }
    if (n > 2 && r() < negCycleChance) { E.push([0, 1, -5]); E.push([1, 2, -5]); E.push([2, 0, 3]); }
    return [n, E];
  };

  ForgeProblems.add({
    id: "johnson-all-pairs",
    title: "Johnson's All-Pairs Shortest Paths",
    level: 6, chapter: 18, difficulty: 3,
    topics: ["shortest paths", "graphs", "reweighting", "Dijkstra", "Bellman–Ford"],
    strategy: "One Bellman–Ford for vertex potentials, then n Dijkstras on non-negative reduced weights",
    source: "Johnson (1977), \"Efficient Algorithms for Shortest Paths in Sparse Networks\" (JACM) · Cormen et al. (CLRS) §25.3",
    summary: "Compute all-pairs shortest paths on a sparse graph with negative edges by reweighting with potentials and running Dijkstra from every vertex.",
    statement: `
<p>Floyd–Warshall computes all-pairs shortest paths in Θ(n³) — fine for dense graphs, wasteful for sparse ones (road and network graphs have
m ≈ a few · n). Dijkstra from every vertex costs only Θ(n·m log n), but breaks on negative edges. <b>Johnson's algorithm</b> fixes that with
<b>potentials</b>: find h with <code>w(u,v) + h(u) − h(v) ≥ 0</code> for every edge; these reduced weights keep every shortest path shortest
(each path's length shifts by h(start) − h(end)), so Dijkstra is safe.</p>
<p>Write <code>Johnson(n, E)</code> for vertices 0..n−1 and directed edges <code>E</code> as <code>[u, v, w]</code> (w may be negative):</p>
<ol>
<li><b>Potentials:</b> Bellman–Ford from an imaginary new vertex joined to every vertex by a weight-0 edge — equivalently, start with
<code>h[v] = 0</code> for all v and relax every edge (<code>if h[u] + w &lt; h[v] then h[v] ← h[u] + w</code>) for n rounds. If any edge can still be relaxed
afterwards, there is a negative cycle: return <code>null</code>.</li>
<li><b>Dijkstra</b> from every source s using <code>w' = w + h[u] − h[v]</code>.</li>
<li>Undo the shift: <code>D[s][v] = d'(s, v) − h[s] + h[v]</code>; unreachable pairs are <code>∞</code>.</li>
</ol>
<p>Return the n × n matrix D.</p>
<ul><li>1 ≤ n ≤ 70, up to 3n edges (parallel edges allowed, no self-loops). <b>Efficiency:</b> the grader checks that your work grows like
n² log n on sparse graphs — Floyd–Warshall's n³ is flagged.</li></ul>`,
    entry: "Johnson",
    params: ["n", "E"],
    tests: [
      { args: [5, [[0, 1, 3], [0, 2, 8], [0, 4, -4], [1, 3, 1], [1, 4, 7], [2, 1, 4], [3, 0, 2], [3, 2, -5], [4, 3, 6]]], expect: [[0, 1, -3, 2, -4], [3, 0, -4, 1, -1], [7, 4, 0, 5, 3], [2, -1, -5, 0, -2], [8, 5, 1, 6, 0]], explain: "The classic 5-vertex example from CLRS §25.3: two negative edges, no negative cycle." },
      { args: [3, [[0, 1, 1], [1, 2, -3], [2, 0, 1]]], expect: null, explain: "The cycle 0 → 1 → 2 → 0 has total weight −1: shortest paths are undefined." },
      { args: [3, [[0, 1, 5]]], expect: [[0, 5, Infinity], [Infinity, 0, Infinity], [Infinity, Infinity, 0]], explain: "Unreachable pairs stay ∞ — don't 'undo the shift' on infinity." },
      { args: [1, []], expect: [[0]] },
      { args: [4, [[0, 1, 1], [0, 2, 3], [2, 1, -3], [1, 3, 2]]], expect: [[0, 0, 3, 2], [Infinity, 0, Infinity, 2], [Infinity, -3, 0, -1], [Infinity, Infinity, Infinity, 0]], explain: "Plain Dijkstra from 0 would finalize vertex 1 at distance 1 before discovering 0 → 2 → 1 of length 0. After reweighting, every edge is ≥ 0 and Dijkstra is right." },
      { args: [4, [[0, 1, 2], [1, 2, 2], [2, 3, 2], [3, 0, -6]]], expect: [[0, 2, 4, 6], [-2, 0, 2, 4], [-4, -2, 0, 2], [-6, -4, -2, 0]], explain: "A zero-weight cycle is allowed (not negative)." },
      { args: [3, [[0, 1, 4], [0, 1, -1], [1, 2, 2]]], expect: [[0, -1, 1], [Infinity, 0, 2], [Infinity, Infinity, 0]], explain: "Parallel edges: the cheaper one wins." },
    ],
    random: { count: 25, gen: (r, i) => johnsonGen(r, 1 + (i % 9), r.int(0, 3 * (1 + (i % 9))), 0.25) },
    reference: johnsonRef,
    growth: { metric: "steps", sizes: [8, 16, 24, 32, 48, 64], gen: (r, n) => johnsonGen(r, n, 3 * n, 0), expect: "n^2 log n" },
    mutants: [
      { fn: (n, E) => johnsonRun(n, E, "plain"), hint: "Some distances are too large on graphs with negative edges: plain Dijkstra finalizes a vertex before a cheaper path through a negative edge is found. Reweight with w + h[u] − h[v] first." },
      { fn: (n, E) => johnsonRun(n, E, "noundo"), hint: "Your distances are the REWEIGHTED ones. Convert back: D[s][v] = d'(s, v) − h[s] + h[v] (leave ∞ alone)." },
      { fn: (n, E) => johnsonRun(n, E, "nocheck"), hint: "You return a matrix even when there is a negative cycle. After the n rounds of relaxation, check every edge once more: if any still improves, return null." },
    ],
    hints: [
      "Suppose every vertex v has a number h(v) and you change each edge weight to w + h(u) − h(v). What happens to the length of a whole path from s to t? Does the shortest path change?",
      "Get h by Bellman–Ford with all h[v] starting at 0 (the 'virtual source'). Then for each s run Dijkstra with a priority queue on the reduced weights, and finally shift back by −h[s] + h[v].",
      "Reduced weights are ≥ 0 because h is a shortest-path distance: h[v] ≤ h[u] + w. In Dijkstra, key the priority queue by the tentative distance and re-insert a vertex whenever its distance drops (re-relaxing from a vertex popped twice is harmless).",
    ],
    starter: {
      pseudo: `ALGORITHM Johnson(n, E)
    h ← array(n, 0)
    for round ← 1 to n do
        for each e in E do
            ...
    ...
    D ← []
    for s ← 0 to n - 1 do
        append(D, Dijkstra(...))
    return D`,
      js: `function Johnson(n, E) {
  // return the n × n distance matrix, or null on a negative cycle
}`,
    },
    solution: {
      pseudo: `ALGORITHM Johnson(n, E)
    h ← array(n, 0)
    for round ← 1 to n do
        for each e in E do
            if h[e[0]] + e[2] < h[e[1]] then
                h[e[1]] ← h[e[0]] + e[2]
    for each e in E do
        if h[e[0]] + e[2] < h[e[1]] then
            return null
    adj ← array(n, [])
    for each e in E do
        append(adj[e[0]], [e[1], e[2] + h[e[0]] - h[e[1]]])
    D ← []
    for s ← 0 to n - 1 do
        d ← Dijkstra(adj, n, s)
        for v ← 0 to n - 1 do
            if d[v] ≠ ∞ then
                d[v] ← d[v] - h[s] + h[v]
        append(D, d)
    return D

ALGORITHM Dijkstra(adj, n, s)
    d ← array(n, ∞)
    d[s] ← 0
    Q ← priorityQueue()
    insert(Q, s, 0)
    while not isEmpty(Q) do
        u ← deleteMin(Q)
        for each e in adj[u] do
            if d[u] + e[1] < d[e[0]] then
                d[e[0]] ← d[u] + e[1]
                insert(Q, e[0], d[e[0]])
    return d`,
      js: `function Johnson(n, E) {
  const h = Array(n).fill(0);
  for (let it = 0; it < n; it++) for (const [u, v, w] of E) if (h[u] + w < h[v]) h[v] = h[u] + w;
  for (const [u, v, w] of E) if (h[u] + w < h[v]) return null;
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v, w] of E) adj[u].push([v, w + h[u] - h[v]]);
  const D = [];
  for (let s = 0; s < n; s++) {
    const d = Array(n).fill(Infinity), done = Array(n).fill(false);
    d[s] = 0;
    for (;;) {
      let u = -1;
      for (let x = 0; x < n; x++) if (!done[x] && d[x] < Infinity && (u < 0 || d[x] < d[u])) u = x;
      if (u < 0) break;
      done[u] = true;
      for (const [v, w] of adj[u]) if (d[u] + w < d[v]) d[v] = d[u] + w;
    }
    D.push(d.map((x, v) => (x === Infinity ? Infinity : x - h[s] + h[v])));
  }
  return D;
}`,
      python: `import heapq
def johnson(n, E):
    h = [0] * n
    for _ in range(n):
        for u, v, w in E:
            if h[u] + w < h[v]:
                h[v] = h[u] + w
    if any(h[u] + w < h[v] for u, v, w in E):
        return None
    adj = [[] for _ in range(n)]
    for u, v, w in E:
        adj[u].append((v, w + h[u] - h[v]))
    INF = float("inf")
    D = []
    for s in range(n):
        d = [INF] * n
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
        D.append([x if x == INF else x - h[s] + h[v] for v, x in enumerate(d)])
    return D`,
      explain: "h is a shortest-path distance from the virtual source, so h[v] ≤ h[u] + w(u,v): every reduced weight is ≥ 0, and a path's reduced length is its true length plus h[s] − h[t], so the same paths stay shortest. Bellman–Ford costs Θ(n·m), the n heap-based Dijkstras Θ(n·m log n); with m = O(n) that is Θ(n² log n) versus Floyd–Warshall's Θ(n³).",
    },
    complexity: "Θ(n·m log n) with a binary heap (Θ(n² log n) when m = O(n))",
    followUp: "The same potential trick lets min-cost-flow solvers (successive shortest paths) run Dijkstra on residual graphs that contain negative edges, and A* search is Dijkstra with a potential chosen as a distance-to-goal estimate. Senior twist: in 2022 Bernstein, Nanongkai & Wulff-Nilsen gave a near-linear single-source algorithm with negative weights — still built around finding good potentials.",
    distractors: ["append(adj[e[0]], [e[1], e[2]])", "d[v] ← d[v] + h[s] - h[v]", "for round ← 1 to n - 2 do"],
    visual: "sims/shortest-paths-plus.html",
    lesson: LESSON,
  });

  /* ================================================================== */
  /* 19 · NTT polynomial multiplication mod 998244353                     */
  /* ================================================================== */
  const NTT_P = 998244353;
  const mulmod = (a, b) => (((a * Math.floor(b / 32768)) % NTT_P) * 32768 + a * (b % 32768)) % NTT_P;
  const powmod = (a, e) => { let r = 1; a %= NTT_P; while (e > 0) { if (e % 2 === 1) r = mulmod(r, a); a = mulmod(a, a); e = Math.floor(e / 2); } return r; };
  const nttRec = (a, w, mm) => {
    const n = a.length;
    if (n === 1) return [a[0]];
    const E = [], O = [];
    for (let i = 0; i < n; i += 2) { E.push(a[i]); O.push(a[i + 1]); }
    const w2 = mm(w, w), Ev = nttRec(E, w2, mm), Ov = nttRec(O, w2, mm), y = Array(n).fill(0), h = n / 2;
    let x = 1;
    for (let k = 0; k < h; k++) { const t = mm(x, Ov[k]); y[k] = (Ev[k] + t) % NTT_P; y[k + h] = (Ev[k] - t + NTT_P) % NTT_P; x = mm(x, w); }
    return y;
  };
  const nttMul = (A, B, mode) => {
    const mm = mode === "float" ? (a, b) => (a * b) % NTT_P : mulmod;
    const need = A.length + B.length - 1;
    let n = 1;
    while (n < (mode === "short" ? Math.max(A.length, B.length) : need)) n *= 2;
    const fa = A.concat(Array(n - A.length).fill(0)), fb = B.concat(Array(n - B.length).fill(0));
    const w = powmod(3, (NTT_P - 1) / n);
    const X = nttRec(fa, w, mm), Y = nttRec(fb, w, mm);
    const Z = X.map((v, i) => mm(v, Y[i]));
    const C = nttRec(Z, powmod(w, NTT_P - 2), mm);
    const inv = mode === "noscale" ? 1 : powmod(n, NTT_P - 2);
    const out = C.map((v) => mm(v, inv));
    return mode === "short" ? out : out.slice(0, need);
  };
  const nttRef = (A, B) => nttMul(A, B);
  const bigCoeffs = (r, n) => Array.from({ length: n }, () => r.int(0, NTT_P - 1));

  ForgeProblems.add({
    id: "ntt-polynomial-multiply",
    title: "Number-Theoretic Transform: Multiply Polynomials Fast",
    level: 7, chapter: 18, difficulty: 3,
    topics: ["divide-and-conquer", "fast Fourier transform", "number theory", "polynomials"],
    strategy: "Evaluate at roots of unity mod p (divide-and-conquer), multiply pointwise, interpolate",
    source: "Cooley & Tukey (1965) · Pollard (1971), \"The fast Fourier transform in a finite field\" · Cormen et al. (CLRS) ch. 30",
    summary: "Multiply two polynomials modulo 998244353 in Θ(n log n) with an exact, integer-only Fast Fourier Transform.",
    statement: `
<p>Multiplying two degree-n polynomials (or two n-digit numbers) the schoolbook way costs Θ(n²). The <b>Fast Fourier Transform (FFT)</b>
does it in Θ(n log n): evaluate both polynomials at the n-th roots of unity, multiply the values pointwise, and interpolate back. The
<b>Number-Theoretic Transform (NTT)</b> is the FFT over integers modulo a prime, so it is exact — no floating-point rounding. With
<code>p = 998244353 = 119 · 2²³ + 1</code> and primitive root 3, <code>w = 3^((p−1)/n) mod p</code> is a primitive n-th root of unity for every
power of two n ≤ 2²³.</p>
<p>Write <code>PolyMultiply(A, B)</code>: <code>A[i]</code> and <code>B[i]</code> are coefficients of x^i (each in 0..p−1). Return the coefficients of
A·B modulo p, exactly <code>length(A) + length(B) − 1</code> of them. Plan:</p>
<ol>
<li>Pad both to the same power of two n ≥ length(A) + length(B) − 1 (shorter would make the product wrap around).</li>
<li>Transform recursively: <code>NTT(a, w)</code> splits a into even- and odd-indexed halves, transforms both with <code>w²</code>, and combines
<code>y[k] = E[k] + w^k·O[k]</code>, <code>y[k + n/2] = E[k] − w^k·O[k]</code> (all mod p).</li>
<li>Multiply pointwise, transform back with <code>w⁻¹ = w^(p−2)</code>, and multiply every value by <code>n⁻¹ = n^(p−2)</code> (Fermat's little theorem).</li>
</ol>
<p><b>Careful:</b> numbers are 64-bit floats, exact only up to 2⁵³ ≈ 9·10¹⁵, but a product of two values below p can reach 10¹⁸. Write a
<code>MulMod(a, b)</code> that splits b into 15-bit halves: <code>((a · (b div 32768)) mod p · 32768 + a · (b mod 32768)) mod p</code> — every
intermediate stays below 2⁴⁶.</p>
<ul><li>1 ≤ length(A), length(B) ≤ 300. <b>Efficiency:</b> the grader checks Θ(n log n) growth — schoolbook multiplication is flagged.</li></ul>`,
    entry: "PolyMultiply",
    params: ["A", "B"],
    tests: [
      { args: [[1, 2], [3, 4]], expect: [3, 10, 8], explain: "(1 + 2x)(3 + 4x) = 3 + 10x + 8x²." },
      { args: [[5], [7]], expect: [35] },
      { args: [[1, 1, 1], [1, 1, 1]], expect: [1, 2, 3, 2, 1], explain: "5 coefficients need n = 8. With n = 4 the x⁴ term would wrap around onto x⁰." },
      { args: [[998244352, 2], [998244352, 3]], expect: [1, 998244348, 6], explain: "998244352 ≡ −1, so this is (−1 + 2x)(−1 + 3x) = 1 − 5x + 6x². The products here are ~10¹⁸ — a plain a · b mod p loses digits." },
      { args: [[0, 0, 1], [1]], expect: [0, 0, 1] },
      { args: [[123456789, 987654321, 5], [3, 1000000, 999999999 % 998244353]], expect: [370370367, 883361335, 958487855, 956998306, 8778230], explain: "Big coefficients: every product must go through MulMod." },
      { args: [[1, 2, 3, 4, 5, 6, 7, 8, 9], [9, 8, 7, 6, 5, 4, 3, 2, 1]], expect: [9, 26, 50, 80, 115, 154, 196, 240, 285, 240, 196, 154, 115, 80, 50, 26, 9] },
    ],
    random: { count: 20, gen: (r, i) => [bigCoeffs(r, r.int(1, 12 + 3 * i)), bigCoeffs(r, r.int(1, 12 + 3 * i))] },
    reference: nttRef,
    growth: { metric: "steps", sizes: [16, 32, 64, 128, 256], gen: (r, n) => [bigCoeffs(r, n), bigCoeffs(r, n)], expect: "n log n" },
    mutants: [
      { fn: (A, B) => nttMul(A, B, "float"), hint: "Small inputs work but large coefficients come out wrong: a · b can exceed 2⁵³, where floating-point numbers can't hold every integer. Use the split MulMod for every product mod p." },
      { fn: (A, B) => nttMul(A, B, "short"), hint: "Your transform size is too small: the product has length(A) + length(B) − 1 coefficients, so pad to a power of two at least that big — otherwise high terms wrap around onto low ones (cyclic convolution)." },
      { fn: (A, B) => nttMul(A, B, "noscale"), hint: "Your answers are exactly n times too big (mod p). The inverse transform must be scaled: multiply every value by n⁻¹ = n^(p−2) mod p." },
    ],
    hints: [
      "Why does evaluating at the n-th roots of unity help? Because w² is an (n/2)-th root of unity, so evaluating at all n roots splits into two half-size problems: the even and odd coefficients.",
      "Helpers: MulMod(a, b), PowMod(a, e) by repeated squaring, and a recursive NTT(a, w) returning a new list. Main: pad, w ← PowMod(3, (p − 1) div n), transform both, multiply pointwise, transform back with PowMod(w, p − 2), scale by PowMod(n, p − 2).",
      "Inside NTT: E ← even entries, O ← odd entries, E ← NTT(E, w²), O ← NTT(O, w²); x ← 1; for k ← 0 to n/2 − 1: t ← MulMod(x, O[k]); y[k] ← (E[k] + t) mod p; y[k + n/2] ← (E[k] − t) mod p; x ← MulMod(x, w).",
    ],
    starter: {
      pseudo: `ALGORITHM PolyMultiply(A, B)
    p ← 998244353
    need ← length(A) + length(B) - 1
    ...
    return R

ALGORITHM MulMod(a, b)
    return ((a * (b div 32768)) mod 998244353 * 32768 + a * (b mod 32768)) mod 998244353

ALGORITHM NTT(a, w)
    n ← length(a)
    if n = 1 then
        return [a[0]]
    ...`,
      js: `function PolyMultiply(A, B) {
  const p = 998244353;
  // ...
}`,
    },
    solution: {
      pseudo: `ALGORITHM PolyMultiply(A, B)
    p ← 998244353
    need ← length(A) + length(B) - 1
    n ← 1
    while n < need do
        n ← 2 * n
    FA ← array(n, 0)
    FB ← array(n, 0)
    for i ← 0 to length(A) - 1 do
        FA[i] ← A[i]
    for i ← 0 to length(B) - 1 do
        FB[i] ← B[i]
    w ← PowMod(3, (p - 1) div n)
    FA ← NTT(FA, w)
    FB ← NTT(FB, w)
    for i ← 0 to n - 1 do
        FA[i] ← MulMod(FA[i], FB[i])
    C ← NTT(FA, PowMod(w, p - 2))
    inv ← PowMod(n, p - 2)
    R ← []
    for i ← 0 to need - 1 do
        append(R, MulMod(C[i], inv))
    return R

ALGORITHM MulMod(a, b)
    return ((a * (b div 32768)) mod 998244353 * 32768 + a * (b mod 32768)) mod 998244353

ALGORITHM PowMod(a, e)
    r ← 1
    while e > 0 do
        if e mod 2 = 1 then
            r ← MulMod(r, a)
        a ← MulMod(a, a)
        e ← e div 2
    return r

ALGORITHM NTT(a, w)
    n ← length(a)
    if n = 1 then
        return [a[0]]
    E ← []
    O ← []
    for i ← 0 to n - 1 step 2 do
        append(E, a[i])
        append(O, a[i + 1])
    E ← NTT(E, MulMod(w, w))
    O ← NTT(O, MulMod(w, w))
    y ← array(n, 0)
    x ← 1
    for k ← 0 to n div 2 - 1 do
        t ← MulMod(x, O[k])
        y[k] ← (E[k] + t) mod 998244353
        y[k + n div 2] ← (E[k] - t) mod 998244353
        x ← MulMod(x, w)
    return y`,
      js: `function PolyMultiply(A, B) {
  const p = 998244353;
  const mulmod = (a, b) => (((a * Math.floor(b / 32768)) % p) * 32768 + a * (b % 32768)) % p;
  const powmod = (a, e) => { let r = 1; while (e > 0) { if (e % 2 === 1) r = mulmod(r, a); a = mulmod(a, a); e = Math.floor(e / 2); } return r; };
  const ntt = (a, w) => {
    const n = a.length;
    if (n === 1) return [a[0]];
    const E = [], O = [];
    for (let i = 0; i < n; i += 2) { E.push(a[i]); O.push(a[i + 1]); }
    const e = ntt(E, mulmod(w, w)), o = ntt(O, mulmod(w, w)), y = Array(n).fill(0);
    let x = 1;
    for (let k = 0; k < n / 2; k++) { const t = mulmod(x, o[k]); y[k] = (e[k] + t) % p; y[k + n / 2] = (e[k] - t + p) % p; x = mulmod(x, w); }
    return y;
  };
  const need = A.length + B.length - 1;
  let n = 1;
  while (n < need) n *= 2;
  const fa = A.concat(Array(n - A.length).fill(0)), fb = B.concat(Array(n - B.length).fill(0));
  const w = powmod(3, (p - 1) / n);
  const X = ntt(fa, w), Y = ntt(fb, w);
  const C = ntt(X.map((v, i) => mulmod(v, Y[i])), powmod(w, p - 2));
  const inv = powmod(n, p - 2);
  return C.slice(0, need).map((v) => mulmod(v, inv));
}`,
      python: `def poly_multiply(A, B):
    p = 998244353
    def ntt(a, w):
        n = len(a)
        if n == 1:
            return [a[0]]
        e, o = ntt(a[0::2], w * w % p), ntt(a[1::2], w * w % p)
        y, x = [0] * n, 1
        for k in range(n // 2):
            t = x * o[k] % p
            y[k], y[k + n // 2] = (e[k] + t) % p, (e[k] - t) % p
            x = x * w % p
        return y
    need = len(A) + len(B) - 1
    n = 1
    while n < need:
        n *= 2
    w = pow(3, (p - 1) // n, p)
    X = ntt(A + [0] * (n - len(A)), w)
    Y = ntt(B + [0] * (n - len(B)), w)
    C = ntt([x * y % p for x, y in zip(X, Y)], pow(w, p - 2, p))
    inv = pow(n, p - 2, p)
    return [c * inv % p for c in C[:need]]   # Python ints are exact, no MulMod needed`,
      explain: "The transform satisfies T(n) = 2T(n/2) + Θ(n), so T(n) = Θ(n log n) by the Master Theorem; three transforms plus n pointwise products keep the total Θ(n log n). Correctness: the transform evaluates the padded polynomials at the n distinct powers of w; pointwise products are the values of A·B (degree < n, so nothing wraps), and the inverse transform with w⁻¹ divided by n interpolates them back (the roots of unity are orthogonal: Σ_j w^{jk} = 0 for k ≢ 0).",
    },
    complexity: "Θ(n log n) modular operations",
    followUp: "Big-integer libraries (GMP, FLINT) multiply huge numbers with FFT/NTT variants, and the post-quantum key-encapsulation standard ML-KEM (Module-Lattice-based Key-Encapsulation Mechanism, formerly CRYSTALS-Kyber; U.S. Federal Information Processing Standard 203) multiplies polynomials with an NTT modulo 3329 on every handshake. Senior twist: an iterative in-place version with bit-reversed order avoids the recursion's allocations — that's what production code ships.",
    distractors: ["while n < max(length(A), length(B)) do", "y[k + n div 2] ← (E[k] + t) mod 998244353", "append(R, C[i])"],
    visual: "sims/karatsuba-strassen.html",
    lesson: LESSON,
  });

  /* ================================================================== */
  /* 20 · HNSW layered greedy / beam search                               */
  /* ================================================================== */
  const hnswRun = (P, G, entry, q, ef, k, mode) => {
    const dist = (u) => { const dx = P[u][0] - q[0], dy = P[u][1] - q[1]; return dx * dx + dy * dy; };
    const less = (a, b) => { const da = dist(a), db = dist(b); return da < db || (da === db && a < b); };
    const far = (W) => W.reduce((x, y) => (less(x, y) ? y : x));
    const search = (layer, ep, ef) => {
      const visited = new Set([ep]); let C = [ep], W = [ep];
      while (C.length) {
        C.sort((a, b) => (less(a, b) ? -1 : 1));
        const c = C.shift();
        if (mode !== "nobreak" && less(far(W), c)) break;
        for (const e of G[layer][c]) {
          if (visited.has(e)) continue;
          visited.add(e);
          const closer = mode === "notie" ? dist(e) < dist(far(W)) : less(e, far(W));
          if (closer || (mode !== "nogrow" && W.length < ef)) {
            C.push(e); W.push(e);
            if (W.length > ef) { const f = far(W); W = W.filter((x) => x !== f); }
          }
        }
      }
      return W.sort((a, b) => (less(a, b) ? -1 : 1));
    };
    let ep = entry; const path = [];
    for (let l = G.length - 1; l >= 1; l--) { ep = search(l, ep, mode === "upperEf" ? ef : 1)[0]; path.push(ep); }
    return [path, search(0, ep, ef).slice(0, k)];
  };
  const hnswRef = (P, G, entry, q, ef, k) => hnswRun(P, G, entry, q, ef, k);
  const hnswBuild = (rnd, N, L, M0, M) => {
    const seen = new Set(), P = [];
    while (P.length < N) { const x = rnd(100), y = rnd(100); if (!seen.has(x * 1000 + y)) { seen.add(x * 1000 + y); P.push([x, y]); } }
    const lev = P.map(() => { let l = 0; while (l < L - 1 && rnd(3) === 0) l++; return l; });
    lev[0] = L - 1;
    const G = [];
    for (let l = 0; l < L; l++) {
      const nodes = P.map((_, i) => i).filter((i) => lev[i] >= l), adj = P.map(() => new Set());
      const d2 = (a, b) => (P[a][0] - P[b][0]) ** 2 + (P[a][1] - P[b][1]) ** 2;
      for (const u of nodes) {
        const near = nodes.filter((v) => v !== u).sort((a, b) => d2(u, a) - d2(u, b) || a - b).slice(0, l === 0 ? M0 : M);
        for (const v of near) { adj[u].add(v); adj[v].add(u); }
      }
      G.push(adj.map((s) => [...s].sort((a, b) => a - b)));
    }
    return [P, G, 0];
  };
  const lcg = (seed) => { let s = seed; return (m) => { s = (s * 1103515245 + 12345) % 2147483648; return Math.floor((s / 2147483648) * m); }; };
  const hnswCase = (seed, N, L, ef, k) => { const rnd = lcg(seed); const [P, G, e] = hnswBuild(rnd, N, L, 3, 2); return [P, G, e, [rnd(100), rnd(100)], ef, k]; };

  ForgeProblems.add({
    id: "hnsw-layered-search",
    title: "Hierarchical Navigable Small World (HNSW) Search",
    level: 7, chapter: 18, difficulty: 3,
    topics: ["vector search", "graphs", "nearest neighbors", "priority queues", "beam search"],
    strategy: "Greedy descent through sparse upper layers, then a bounded best-first (beam) search on layer 0",
    source: "Malkov & Yashunin (2018/2020), \"Efficient and Robust Approximate Nearest Neighbor Search Using Hierarchical Navigable Small World Graphs\" (IEEE Transactions on Pattern Analysis and Machine Intelligence), Algorithms 2 and 5",
    summary: "Implement HNSW's query: ef = 1 greedy search down the upper layers, then a beam search of width ef on the bottom layer, returning the k nearest found.",
    statement: `
<p>Vector databases answer "which stored embeddings are closest to this query?" over millions of points without scanning them all.
The most widely deployed index is <b>Hierarchical Navigable Small World (HNSW)</b>: a stack of proximity graphs, sparse at the top (long
jumps) and containing every point at the bottom (fine detail). A query walks greedily down the layers, then runs a <b>beam search</b> that keeps the
ef best candidates. It is <i>approximate</i> — it can miss the true nearest neighbor — but it is extremely fast.</p>
<p>Write <code>HNSWSearch(P, G, entry, q, ef, k)</code>: points <code>P[u] = [x, y]</code>; <code>G[l][u]</code> = neighbor list of node u on layer l
(empty if u is not on that layer); <code>G[0]</code> is the bottom layer, <code>G[L−1]</code> the top; <code>entry</code> is on the top layer; q = [x, y].
"Closer" always compares the pair <code>(dist², id)</code>: smaller squared distance wins, ties go to the smaller id. Use the paper's
<b>SEARCH-LAYER(ep, ef, l)</b>:</p>
<pre>visited ← {ep};  C ← {ep} (candidates);  W ← {ep} (best found)
while C is not empty:
    c ← remove the closest element of C;   f ← the furthest element of W
    if c is farther than f: break
    for each e in G[l][c] (in list order) not in visited:
        add e to visited;   f ← the furthest element of W
        if e is closer than f  or  |W| &lt; ef:
            add e to C and to W;   if |W| &gt; ef: remove the furthest element from W
return W</pre>
<p>Query: <code>ep ← entry</code>; for l from L−1 down to 1: <code>ep ← closest element of SEARCH-LAYER(ep, 1, l)</code>, recording ep in
<code>path</code>. Then <code>W ← SEARCH-LAYER(ep, ef, 0)</code>. Return <code>[path, the k closest of W in order]</code>.</p>
<ul><li>N ≤ 45 points, up to 4 layers, 1 ≤ k ≤ ef ≤ 8. Priority queues accept tuple priorities: <code>insert(Q, e, (d, e))</code>.</li></ul>`,
    entry: "HNSWSearch",
    params: ["P", "G", "entry", "q", "ef", "k"],
    exampleCount: 5,
    tests: [
      { args: [[[0, 0], [10, 0], [20, 0], [30, 0], [40, 0], [50, 0]], [[[1], [0, 2], [1, 3], [2, 4], [3, 5], [4]], [[3], [], [], [0], [], []]], 0, [47, 1], 2, 2], expect: [[3], [5, 4]], explain: "Layer 1 jumps from node 0 straight to node 3. On layer 0 the beam (ef = 2) walks 3 → 4 → 5 and stops when the best remaining candidate (node 2) is farther than everything in W." },
      { args: [[[0, 0], [5, 5]], [[[1], [0]]], 0, [5, 4], 1, 1], expect: [[], [1]], explain: "A single layer: no path; node 1 is closer to q." },
      { args: [[[0, 0], [10, 0], [0, 10], [10, 10]], [[[1, 2], [0, 3], [0, 3], [1, 2]]], 0, [5, 5], 4, 4], expect: [[], [0, 1, 2, 3]], explain: "All four corners are at the same distance: ties go to the smaller id." },
      { args: [[[50, 50], [3, 0], [60, 60], [1, 0], [0, 3]], [[[], [3], [], [4, 1], [3]]], 3, [0, 0], 2, 2], expect: [[], [3, 1]], explain: "Node 4 fills W (|W| < ef). Node 1 is exactly as far as node 4 (d² = 9 each) but has the smaller id, so the pair (9, 1) is closer than (9, 4): node 1 enters W and node 4 is evicted. Drop the id tie-break and you return [3, 4]." },
      { args: [[[5, 0], [9, 0], [0, 4], [1, 0]], [[[1, 2], [0, 3], [0], [1]]], 0, [0, 0], 2, 2], expect: [[], [2, 0]], explain: "Approximate by design: node 3 (d² = 1) is the true nearest neighbor, but it hangs off node 1 (d² = 81). When node 1 comes out of C it is already farther than the worst element of W (node 0, d² = 25), so the search stops and never sees node 3." },
      { args: hnswCase(7, 20, 3, 3, 2), expect: [[14, 14], [5, 14]] },
      { args: hnswCase(11, 30, 3, 4, 3), expect: [[10, 9], [9, 2, 14]] },
      { args: hnswCase(23, 40, 4, 2, 2), expect: [[0, 1, 1], [1, 6]] },
      { args: hnswCase(5, 25, 2, 1, 1), expect: [[13], [5]] },
      { args: hnswCase(99, 45, 4, 6, 4), expect: [[0, 0, 0], [4, 0, 27, 37]] },
    ],
    random: { count: 25, gen: (r, i) => hnswCase(1 + r.int(1, 100000), r.int(6, 40), r.int(1, 4), 1 + (i % 6), 1 + (i % 3)).map((x, j) => (j === 5 ? Math.min(x, 1 + (i % 6)) : x)) },
    reference: hnswRef,
    mutants: [
      { fn: (...a) => hnswRun(...a, "nogrow"), hint: "Your result set W never fills up: an element must ALSO be added when |W| < ef, even if it is farther than everything in W. Otherwise the beam has width 1 instead of ef." },
      { fn: (...a) => hnswRun(...a, "upperEf"), hint: "Your path through the upper layers differs. HNSW searches every layer above 0 with ef = 1 (pure greedy) and only uses the full ef on layer 0." },
      { fn: (...a) => hnswRun(...a, "notie"), hint: "Two nodes at the same distance are handled differently from the grader. Compare (dist², id) pairs everywhere — also when deciding whether a newly seen node is closer than the furthest element of W: equal distance and smaller id counts as closer." },
      { fn: (...a) => hnswRun(...a, "nobreak"), hint: "You keep expanding candidates after the closest remaining one is already farther than the worst element of W. Stop there (break) — that early exit is what makes HNSW fast, and it changes which nodes get visited." },
    ],
    hints: [
      "Two priority queues do all the work: a min-queue of candidates to expand (C) and a max-queue of the best ef found so far (W). Which one tells you when to stop?",
      "Write SearchLayer(P, G, q, ep, ef, l) with C ← priorityQueue(), W ← maxPQ(), visited ← set(), priorities (Dist(P, q, u), u). Return W's items from closest to furthest (pop them all with deleteMax and reverse).",
      "The stop test: c ← deleteMin(C); f ← peek(W); if (Dist(c), c) > (Dist(f), f) then break. Compare tuples field by field: d1 > d2 or (d1 = d2 and c > f).",
    ],
    starter: {
      pseudo: `ALGORITHM HNSWSearch(P, G, entry, q, ef, k)
    ep ← entry
    path ← []
    for l ← length(G) - 1 downto 1 do
        ...
    W ← SearchLayer(P, G, q, ep, ef, 0)
    ...

ALGORITHM SearchLayer(P, G, q, ep, ef, l)
    // returns the found nodes sorted from closest to furthest
    ...`,
      js: `function HNSWSearch(P, G, entry, q, ef, k) {
  // return [path, kNearestFound]
}`,
    },
    solution: {
      pseudo: `ALGORITHM HNSWSearch(P, G, entry, q, ef, k)
    ep ← entry
    path ← []
    for l ← length(G) - 1 downto 1 do
        ep ← SearchLayer(P, G, q, ep, 1, l)[0]
        append(path, ep)
    W ← SearchLayer(P, G, q, ep, ef, 0)
    return [path, W[0..k - 1]]

ALGORITHM SearchLayer(P, G, q, ep, ef, l)
    visited ← set([ep])
    C ← priorityQueue()
    W ← maxPQ()
    insert(C, ep, (Dist(P, q, ep), ep))
    insert(W, ep, (Dist(P, q, ep), ep))
    while not isEmpty(C) do
        c ← deleteMin(C)
        f ← peek(W)
        if Dist(P, q, c) > Dist(P, q, f) or (Dist(P, q, c) = Dist(P, q, f) and c > f) then
            break
        for each e in G[l][c] do
            if not contains(visited, e) then
                add(visited, e)
                f ← peek(W)
                if Dist(P, q, e) < Dist(P, q, f) or (Dist(P, q, e) = Dist(P, q, f) and e < f) or length(W) < ef then
                    insert(C, e, (Dist(P, q, e), e))
                    insert(W, e, (Dist(P, q, e), e))
                    if length(W) > ef then
                        deleteMax(W)
    out ← []
    while not isEmpty(W) do
        append(out, deleteMax(W))
    return reversed(out)

ALGORITHM Dist(P, q, u)
    return (P[u][0] - q[0])^2 + (P[u][1] - q[1])^2`,
      js: `function HNSWSearch(P, G, entry, q, ef, k) {
  const dist = (u) => (P[u][0] - q[0]) ** 2 + (P[u][1] - q[1]) ** 2;
  const less = (a, b) => dist(a) < dist(b) || (dist(a) === dist(b) && a < b);
  const furthest = (W) => W.reduce((x, y) => (less(x, y) ? y : x));
  const search = (ep, ef, l) => {
    const visited = new Set([ep]);
    let C = [ep], W = [ep];
    while (C.length) {
      C.sort((a, b) => (less(a, b) ? -1 : 1));
      const c = C.shift();
      if (less(furthest(W), c)) break;
      for (const e of G[l][c]) {
        if (visited.has(e)) continue;
        visited.add(e);
        if (less(e, furthest(W)) || W.length < ef) {
          C.push(e); W.push(e);
          if (W.length > ef) { const f = furthest(W); W = W.filter((x) => x !== f); }
        }
      }
    }
    return W.sort((a, b) => (less(a, b) ? -1 : 1));
  };
  let ep = entry;
  const path = [];
  for (let l = G.length - 1; l >= 1; l--) { ep = search(ep, 1, l)[0]; path.push(ep); }
  return [path, search(ep, ef, 0).slice(0, k)];
}`,
      python: `import heapq
def hnsw_search(P, G, entry, q, ef, k):
    def key(u):
        return ((P[u][0] - q[0]) ** 2 + (P[u][1] - q[1]) ** 2, u)
    def search(ep, ef, l):
        visited = {ep}
        C = [key(ep)]                    # min-heap of (dist, id)
        W = [(-key(ep)[0], -ep)]         # max-heap via negation
        while C:
            c = heapq.heappop(C)
            f = (-W[0][0], -W[0][1])
            if c > f:
                break
            for e in G[l][c[1]]:
                if e in visited:
                    continue
                visited.add(e)
                f = (-W[0][0], -W[0][1])
                if key(e) < f or len(W) < ef:
                    heapq.heappush(C, key(e))
                    heapq.heappush(W, (-key(e)[0], -e))
                    if len(W) > ef:
                        heapq.heappop(W)
        return [u for _, u in sorted((-d, -u) for d, u in W)]
    ep, path = entry, []
    for l in range(len(G) - 1, 0, -1):
        ep = search(ep, 1, l)[0]
        path.append(ep)
    return [path, search(ep, ef, 0)[:k]]`,
      explain: "Upper layers hold exponentially fewer nodes, so each greedy ef = 1 descent makes a few long hops and hands layer 0 a starting point already near q. The beam search then expands candidates in order of distance and stops once the closest unexpanded candidate is farther than the ef-th best found; with bounded degree the work is O(ef · degree · log ef) per expansion, and empirically the number of expansions grows about logarithmically with N. Larger ef trades speed for recall.",
    },
    complexity: "About O(log N) hops per layer in practice; O(ef log ef) heap work per expansion",
    followUp: "Faiss (IndexHNSWFlat), pgvector's HNSW index for PostgreSQL, and Lucene/Elasticsearch/OpenSearch vector fields all implement this search; Faiss also offers product quantization (PQ) to compress the vectors the distances are computed on. Senior twist: measure recall@k against brute force while tuning ef and the graph degree M — that curve, not raw speed, is how vector indexes are compared.",
    distractors: ["ep ← SearchLayer(P, G, q, ep, ef, l)[0]", "if Dist(P, q, e) < Dist(P, q, f) then", "deleteMin(W)"],
    visual: "sims/vector-search.html",
    lesson: LESSON,
  });

  /* ================================================================== */
  /* 21 · Powersort's node-power merge policy (Level 7 research core)    */
  /* ================================================================== */
  const psPower = (s1, n1, n2, n, starts) => {
    let a = starts ? 2 * s1 : 2 * s1 + n1, b = starts ? 2 * (s1 + n1) : 2 * s1 + 2 * n1 + n2, k = 0;
    do { k++; a *= 2; b *= 2; } while (Math.floor(a / (2 * n)) === Math.floor(b / (2 * n)));
    return k;
  };
  const psRun = (L, mode) => {
    const powers = [], merges = [];
    if (!L.length) return [powers, merges];
    const n = L.reduce((x, y) => x + y, 0), X = [];
    let s = 0, len = L[0];
    for (let i = 1; i < L.length; i++) {
      const p = psPower(s, len, L[i], n, mode === "starts");
      powers.push(p);
      while (X.length && (mode === "rev" ? X[X.length - 1][2] < p : X[X.length - 1][2] > p)) { const [s0, l0] = X.pop(); merges.push([s0, s, s + len]); s = s0; len = l0 + len; }
      X.push([s, len, p]); s += len; len = L[i];
    }
    if (mode === "bottomup") { const R = X.map((x) => x[1]).concat([len]); let cl = R[0]; for (let j = 1; j < R.length; j++) { merges.push([0, cl, cl + R[j]]); cl += R[j]; } }
    else while (X.length) { const [s0, l0] = X.pop(); merges.push([s0, s, s + len]); s = s0; len = l0 + len; }
    return [powers, merges];
  };
  const psTim = (L) => {
    const S = [], merges = []; let pos = 0;
    const ln = (k) => S[k][1];
    const mergeAt = (k) => { merges.push([S[k][0], S[k + 1][0], S[k + 1][0] + S[k + 1][1]]); S[k] = [S[k][0], S[k][1] + S[k + 1][1]]; S.splice(k + 1, 1); };
    for (const l of L) {
      S.push([pos, l]); pos += l;
      while (S.length > 1) {
        let k = S.length - 2;
        if ((k > 0 && ln(k - 1) <= ln(k) + ln(k + 1)) || (k > 1 && ln(k - 2) <= ln(k - 1) + ln(k))) { if (ln(k - 1) < ln(k + 1)) k--; mergeAt(k); }
        else if (ln(k) <= ln(k + 1)) mergeAt(k); else break;
      }
    }
    while (S.length > 1) { let k = S.length - 2; if (k > 0 && ln(k - 1) < ln(k + 1)) k--; mergeAt(k); }
    return [psRun(L)[0], merges];
  };

  ForgeProblems.add({
    id: "powersort-merge-policy",
    title: "Powersort: Merge by Node Power",
    level: 7, chapter: 18, difficulty: 2,
    topics: ["sorting", "merge sort", "adaptive algorithms", "Powersort", "nearly optimal binary search trees"],
    strategy: "Give every run boundary a depth (its power) in a virtual balanced tree; merge pending runs whose boundary is deeper than the new one",
    source: "Munro & Wild (2018), \"Nearly-Optimal Mergesorts: Fast, Practical Sorting Methods That Optimally Adapt to Existing Runs\" (European Symposium on Algorithms (ESA) 2018, LIPIcs 112), Algorithm 2 (PowerSort, NodePower) · CPython Objects/listsort.txt and Objects/listobject.c powerloop() / found_new_run() (Python 3.11+)",
    summary: "Given the lengths of the natural runs, compute each boundary's node power and list every merge Powersort performs.",
    statement: `
<p>Since Python 3.11, <code>list.sort</code> no longer uses Timsort's hand-tuned merge rules: it uses <b>Powersort</b>'s merge policy
(Munro &amp; Wild, 2018), which provably merges the runs almost as cheaply as the best possible merge tree — within O(n) of the
entropy bound n·H(run lengths). The idea: lay a perfectly balanced binary tree over the positions 0..n and give every boundary between two
neighbouring runs a <b>power</b> = the depth of the tree node that separates the two runs' <i>midpoints</i>. Deeper boundaries are merged
first, so the merge tree imitates a nearly optimal binary search tree over the runs.</p>
<p>Write <code>PowersortMerges(L)</code>. <code>L[0..r−1]</code> are the lengths of the natural runs, left to right (already found and
reversed if descending), and <code>n = ΣL</code>. Run i starts at <code>L[0] + … + L[i−1]</code>.</p>
<ol>
<li><b>Node power</b> of neighbouring runs <code>[s1, s1+n1)</code> and <code>[s1+n1, s1+n1+n2)</code>: let <code>a = 2·s1 + n1</code> and
<code>b = a + n1 + n2</code> (twice the two midpoints). The power is the smallest k ≥ 1 with
<code>⌊a·2<sup>k</sup> / (2n)⌋ ≠ ⌊b·2<sup>k</sup> / (2n)⌋</code> — the first binary digit where the midpoints, as fractions of n, differ.
Use whole numbers only (double a and b each round, compare with <code>div</code>).</li>
<li><b>Main loop</b> (the paper's Algorithm 2): the current run is run 0. For each next run i = 1..r−1: compute p = power of (current run, run i)
<i>before any merging</i>; then <b>while the stack is not empty and its top power &gt; p</b>, pop the top run and merge it with the current run
(the current run grows to the left); then push (current run, p), and run i becomes the current run.</li>
<li><b>At the end</b> pop the stack top-down, each time merging the popped run with the current run.</li>
</ol>
<p>Return <code>[powers, merges]</code>: the r − 1 powers in boundary order, and every merge as <code>[lo, mid, hi]</code> (it merges
positions lo..mid−1 with mid..hi−1), in the order performed.</p>
<ul><li>0 ≤ r ≤ 20, run lengths 1..40. (Simplifications, as in the paper: no minimum run length, no galloping. CPython's final clean-up reuses a
Timsort size rule; here you follow the paper and merge top-down.)</li></ul>`,
    entry: "PowersortMerges",
    params: ["L"],
    exampleCount: 4,
    tests: [
      { args: [[2, 2, 4]], expect: [[2,1],[[0,2,4],[0,4,8]]], explain: "n = 8. Boundary 2|2: midpoints 1 and 3 (a = 2, b = 6 out of 2n = 16) first separate at depth 2. Boundary 2|4: midpoints 3 and 6 (a = 6, b = 12) separate at the root, power 1. The stacked power 2 > 1, so [0,2) and [2,4) merge before the 4-run is pushed." },
      { args: [[10, 2, 3]], expect: [[1,2],[[10,12,15],[0,10,15]]], explain: "Three runs A, B, C: it is always optimal to merge B first with the shorter of A and C. Powersort does exactly that: boundary A|B has power 1, B|C has power 2, so nothing merges until the end, where B and C (top of the stack) merge first." },
      { args: [[]], expect: [[],[]], explain: "No runs, no boundaries, no merges." },
      { args: [[24, 16, 5, 4, 6, 3]], expect: [[1,3,2,3,4],[[24,40,45],[49,55,58],[45,49,58],[24,45,58],[0,24,58]]], explain: "The run lengths of Timsort's 2015 counterexample. Powersort needs no invariant repair: the powers alone decide the merge order." },
      { args: [[3, 2, 10]], expect: [[2,1],[[0,3,5],[0,5,15]]] },
      { args: [[1, 1, 1, 1, 1, 1, 1, 1]], expect: [[3,2,3,1,3,2,3],[[0,1,2],[2,3,4],[0,2,4],[4,5,6],[6,7,8],[4,6,8],[0,4,8]]], explain: "Equal runs give the perfectly balanced merge tree of bottom-up mergesort." },
      { args: [[7]], expect: [[],[]] },
      { args: [[4, 4]], expect: [[1],[[0,4,8]]] },
      { args: [[1, 30, 1, 1, 2, 5]], expect: [[2,1,4,5,3],[[0,1,31],[32,33,35],[31,32,35],[31,35,40],[0,31,40]]] },
      { args: [[5, 9, 2, 2, 7, 1, 3, 12, 6]], expect: [[3,2,5,3,1,4,3,2],[[0,5,14],[14,16,18],[14,18,25],[0,14,25],[25,26,29],[25,29,41],[25,41,47],[0,25,47]]] },
    ],
    random: { count: 30, gen: (r) => [Array.from({ length: r.int(0, 16) }, () => (r() < 0.2 ? r.int(10, 40) : r.int(1, 8)))] },
    reference: (L) => psRun(L),
    mutants: [
      { fn: (L) => psRun(L, "starts"), hint: "Your powers differ: the power is about the runs' MIDPOINTS, not their start positions. Use a = 2·s1 + n1 and b = a + n1 + n2 (twice the midpoints) against 2n." },
      { fn: (L) => psRun(L, "rev"), hint: "You merge when the stacked boundary is SHALLOWER than the new one. Merge while the top of the stack has a power GREATER than p: deeper boundaries are merged first, like building the merge tree from the bottom up." },
      { fn: (L) => psRun(L, "bottomup"), hint: "Your final clean-up starts at the left end. At the end, pop the stack: merge the top (rightmost pending) run with the current run, then the next one down, moving leftwards." },
      { fn: psTim, hint: "Your powers are right but the merges follow Timsort's run-length rules. Powersort looks only at powers: while top power > p, merge the top run into the current run." },
    ],
    hints: [
      "A boundary's power depends only on where the two neighbouring runs' midpoints sit inside [0, n). Two midpoints in the same half at depth 1, the same quarter at depth 2, … — the power is the first depth where they part.",
      "Keep a stack of [start, length, power]. For each new run: p ← NodePower(s, len, L[i], n); merge while top power > p; push [s, len, p]; the new run becomes current (its start is s + len). After the loop, pop and merge until the stack is empty.",
      "NodePower: a ← 2·s1 + n1; b ← a + n1 + n2; k ← 0; repeat k ← k + 1; a ← 2a; b ← 2b until a div (2n) ≠ b div (2n).",
    ],
    starter: {
      pseudo: `ALGORITHM PowersortMerges(L[0..r-1])
    powers ← []
    merges ← []
    if r = 0 then
        return [powers, merges]
    n ← sum(L)
    X ← stack()
    s ← 0
    len ← L[0]
    for i ← 1 to r - 1 do
        ...
    ...
    return [powers, merges]

ALGORITHM NodePower(s1, n1, n2, n)
    ...`,
      js: `function PowersortMerges(L) {
  const powers = [], merges = [];
  // ...
  return [powers, merges];
}`,
    },
    solution: {
      pseudo: `ALGORITHM PowersortMerges(L[0..r-1])
    powers ← []
    merges ← []
    if r = 0 then
        return [powers, merges]
    X ← stack()
    s ← 0
    len ← L[0]
    for i ← 1 to r - 1 do
        p ← NodePower(s, len, L[i], sum(L))
        append(powers, p)
        while not isEmpty(X) and top(X)[2] > p do
            e ← pop(X)
            append(merges, [e[0], s, s + len])
            s ← e[0]
            len ← e[1] + len
        push(X, [s, len, p])
        s ← s + len
        len ← L[i]
    while not isEmpty(X) do
        e ← pop(X)
        append(merges, [e[0], s, s + len])
        s ← e[0]
        len ← e[1] + len
    return [powers, merges]

ALGORITHM NodePower(s1, n1, n2, n)
    a ← 2 * s1 + n1
    b ← a + n1 + n2
    k ← 0
    repeat
        k ← k + 1
        a ← 2 * a
        b ← 2 * b
    until a div (2 * n) ≠ b div (2 * n)
    return k`,
      js: `function PowersortMerges(L) {
  const powers = [], merges = [];
  if (L.length === 0) return [powers, merges];
  const n = L.reduce((x, y) => x + y, 0);
  const power = (s1, n1, n2) => {
    let a = 2 * s1 + n1, b = a + n1 + n2, k = 0;
    do { k++; a *= 2; b *= 2; } while (Math.floor(a / (2 * n)) === Math.floor(b / (2 * n)));
    return k;
  };
  const X = [];
  let s = 0, len = L[0];
  for (let i = 1; i < L.length; i++) {
    const p = power(s, len, L[i]);
    powers.push(p);
    while (X.length && X[X.length - 1][2] > p) {
      const [s0, l0] = X.pop();
      merges.push([s0, s, s + len]);
      s = s0; len = l0 + len;
    }
    X.push([s, len, p]);
    s += len; len = L[i];
  }
  while (X.length) {
    const [s0, l0] = X.pop();
    merges.push([s0, s, s + len]);
    s = s0; len = l0 + len;
  }
  return [powers, merges];
}`,
      python: `def powersort_merges(L):
    powers, merges = [], []
    if not L:
        return [powers, merges]
    n = sum(L)
    def power(s1, n1, n2):
        a, b, k = 2 * s1 + n1, 2 * s1 + 2 * n1 + n2, 0
        while True:
            k += 1
            a, b = 2 * a, 2 * b
            if a // (2 * n) != b // (2 * n):
                return k
    X, s, ln = [], 0, L[0]
    for i in range(1, len(L)):
        p = power(s, ln, L[i])
        powers.append(p)
        while X and X[-1][2] > p:
            s0, l0, _ = X.pop()
            merges.append([s0, s, s + ln])
            s, ln = s0, l0 + ln
        X.append((s, ln, p))
        s, ln = s + ln, L[i]
    while X:
        s0, l0, _ = X.pop()
        merges.append([s0, s, s + ln])
        s, ln = s0, l0 + ln
    return [powers, merges]`,
      explain: "Powers on the stack are strictly increasing from bottom to top (CPython asserts this), so each new boundary closes exactly the subtrees that lie below it in the virtual tree; the merge tree therefore matches a nearly optimal binary search tree over the runs, and Munro & Wild prove (Theorem 6) the total merge cost is at most n·H + 2n, where H = Σ(ℓᵢ/n)·log₂(n/ℓᵢ) ≤ log₂ r. Each power costs O(log n) bit steps and each run is pushed and popped once, so the policy itself costs O(r log n) on top of the Θ(n + nH) merging.",
    },
    complexity: "O(r log n) for the policy; merging costs ≤ n·H + 2n element moves",
    followUp: "CPython 3.11+ computes exactly these powers in powerloop() and merges in found_new_run() (see Objects/listsort.txt); Munro & Wild's paper uses an O(1) count-leading-zeros formula instead of the bit loop. Senior twist: Gelling, Nebel, Smith and Wild (2023) extended the idea to multiway Powersort, merging k runs at a time to cut memory traffic.",
    distractors: ["while not isEmpty(X) and top(X)[2] < p do", "a ← 2 * s1", "until a div n ≠ b div n"],
    visual: "sims/sorting-evolution.html",
    lesson: LESSON,
  });

  /* ================================================================== */
  /* 22 · CVM distinct-elements estimator (coin flips supplied)          */
  /* ================================================================== */
  const cvmRun = (S, thresh, U, E, mode) => {
    let p = 1, e = 0;
    const X = new Set();
    for (let i = 0; i < S.length; i++) {
      const a = S[i];
      if (mode === "sticky") { if (!X.has(a) && U[i] < p) X.add(a); }
      else { X.delete(a); if (U[i] < p) X.add(a); }
      const full = mode === "over" ? X.size > thresh : X.size === thresh;
      if (full) {
        for (const x of [...X].sort((u, v) => u - v)) { if (e >= E.length && !mode) throw new Error("eviction coins ran out"); if (E[e++] === 1) X.delete(x); }
        if (mode !== "nohalf") p /= 2;
        if (mode !== "nofail" && (mode === "over" ? X.size > thresh : X.size === thresh)) return -1;
      }
    }
    return X.size / p;
  };
  const cvmGen = (r, m, vals, thresh) => {
    const S = Array.from({ length: m }, () => r.int(1, vals));
    const U = S.map(() => r.int(0, 15) / 16);
    const E = Array.from({ length: m * (thresh + 1) }, () => (r() < 0.5 ? 1 : 0));
    return [S, thresh, U, E];
  };

  ForgeProblems.add({
    id: "cvm-distinct-elements",
    title: "CVM: Counting Distinct Items with Coin Flips",
    level: 7, chapter: 18, difficulty: 1,
    topics: ["streaming", "sampling", "distinct elements", "randomized algorithms"],
    strategy: "Keep a sample in which every distinct item is present with the same probability p; halve p whenever the sample fills up",
    source: "Chakraborty, Vinodchandran & Meel (2022), \"Distinct Elements in Streams: An Algorithm for the (Text) Book\" (European Symposium on Algorithms (ESA) 2022, LIPIcs 244), Algorithm 1",
    summary: "Run the 2022 CVM estimator on a stream, using the supplied coin flips, and return |X| / p (or −1 for failure).",
    statement: `
<p>How many <i>different</i> users visited today? Counting distinct items exactly needs memory for all of them. HyperLogLog solves this with
hashing; in 2022 Chakraborty, Vinodchandran and Meel found an estimator — <b>CVM</b>, after their initials — that uses <b>no hash functions at all</b>, just
sampling, and whose correctness proof fits in a few pages. Keep a set X of at most <code>thresh</code> items and a probability p (start
p = 1). The paper's Algorithm 1, for each arriving item a:</p>
<pre>X ← X \\ {a}               // forget a's earlier coin
with probability p: X ← X ∪ {a}
if |X| = thresh:
    throw away each element of X with probability 1/2
    p ← p / 2
    if |X| = thresh: output ⊥ (fail)
output |X| / p</pre>
<p>Each distinct item seen so far is in X with probability p, so |X|/p estimates the number of distinct items; the paper proves that with
<code>thresh = ⌈12 ε⁻² log(8m/δ)⌉</code> for a stream of m items the answer is within a factor 1 ± ε with probability at least 1 − δ.</p>
<p>Write <code>CVMEstimate(S, thresh, U, E)</code> with the randomness supplied, so grading is deterministic:</p>
<ul>
<li><b>"with probability p"</b> for item <code>S[i]</code> means: keep it iff <code>U[i] &lt; p</code> (U[i] is a number in [0, 1));</li>
<li><b>"throw away with probability 1/2"</b>: visit the elements of X in <b>increasing order</b> and read the next unused value of the list
<code>E</code> for each (E is shared across all clean-ups and read left to right); throw the element away iff that value is 1;</li>
<li>return <code>|X| / p</code> (a whole number, since p is a power of 1/2), or <b>−1</b> for ⊥.</li>
</ul>
<ul><li>0 ≤ m ≤ 40 items, 2 ≤ thresh ≤ 10; E is always long enough.</li></ul>`,
    entry: "CVMEstimate",
    params: ["S", "thresh", "U", "E"],
    exampleCount: 4,
    tests: [
      { args: [[1, 2, 3, 2, 1, 4, 4, 4], 10, [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], []], expect: 4, explain: "X never fills up, so p stays 1, every item is kept and the answer is exact: 4 distinct values." },
      { args: [[5, 7, 9, 7, 3], 3, [0, 0, 0, 0.5, 0.25], [1, 0, 1]], expect: 2, explain: "After 5, 7, 9 the set is full: coins 1, 0, 1 throw out 5 and 9 and p becomes 1/2. The second 7 is first removed, then re-flipped: U = 0.5 is not < 1/2, so it is dropped. 3 is kept (0.25 < 1/2). Answer |X|/p = 1/(1/2) = 2 (the truth is 4)." },
      { args: [[1, 2], 2, [0, 0], [0, 0]], expect: -1, explain: "The clean-up throws nothing away, so X is still full: the algorithm reports failure (⊥ → −1). With a realistic thresh this has tiny probability." },
      { args: [[], 2, [], []], expect: 0, explain: "An empty stream: |X|/p = 0/1 = 0." },
      { args: [[4, 4, 4, 4], 2, [0.75, 0.75, 0.75, 0.75], []], expect: 1 },
      { args: [[3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8], 4, [0.5, 0.0625, 0.9375, 0.25, 0.125, 0.75, 0.3125, 0, 0.4375, 0.1875, 0.5625, 0.375], [0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0]], expect: 8 },
      { args: [[8, 6, 7, 5, 3, 0, 9, 8, 6, 7, 5, 3], 3, [0, 0, 0, 0.375, 0.125, 0.4375, 0.0625, 0.1875, 0.25, 0.3125, 0, 0.0625], [1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 1, 1, 0]], expect: 16 },
      { args: [[2, 2, 3, 3, 2, 2, 3, 3], 2, [0, 0, 0, 0, 0, 0, 0, 0], [1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1]], expect: 8 },
    ],
    random: { count: 30, gen: (r, i) => cvmGen(r, 4 + i, 3 + (i % 12), 2 + (i % 5)) },
    reference: (S, thresh, U, E) => cvmRun(S, thresh, U, E),
    mutants: [
      { fn: (S, t, U, E) => cvmRun(S, t, U, E, "sticky"), hint: "An item that is already in X stays there forever in your version. CVM first REMOVES the arriving item and then flips a fresh coin for it, so only its latest occurrence counts — that is what makes every distinct item present with the same probability p." },
      { fn: (S, t, U, E) => cvmRun(S, t, U, E, "nohalf"), hint: "After a clean-up the sample only represents about half of the items. Halve p (p ← p / 2) after throwing elements away — both future keep-decisions and the final |X| / p depend on it." },
      { fn: (S, t, U, E) => cvmRun(S, t, U, E, "over"), hint: "Your clean-up starts one item too late. It runs as soon as |X| = thresh (the set may never grow beyond thresh − 1 items between clean-ups)." },
      { fn: (S, t, U, E) => cvmRun(S, t, U, E, "nofail"), hint: "If the clean-up happens to throw nothing away, X is still full. The algorithm must stop right there and report failure (return −1) — check |X| = thresh again after halving p." },
    ],
    hints: [
      "Invariant to keep in mind: at every moment each distinct item seen so far is in X with probability exactly p. Removing the arriving item before re-flipping is what keeps it true for repeated items.",
      "Loop over i from 0 to m − 1: remove(X, S[i]); if U[i] < p then add it. If size(X) = thresh: for each x in sorted(X), consume E[e] (e ← e + 1) and remove x when it is 1; then p ← p / 2 and fail if X is still full.",
      "Keep one index e into E for the whole run — never restart it at 0 for a new clean-up. The answer is size(X) / p.",
    ],
    starter: {
      pseudo: `ALGORITHM CVMEstimate(S[0..m-1], thresh, U, E)
    p ← 1
    X ← set()
    e ← 0
    for i ← 0 to m - 1 do
        ...
    return ...`,
      js: `function CVMEstimate(S, thresh, U, E) {
  let p = 1, e = 0;
  const X = new Set();
  // ...
  return 0;
}`,
    },
    solution: {
      pseudo: `ALGORITHM CVMEstimate(S[0..m-1], thresh, U, E)
    p ← 1
    X ← set()
    e ← 0
    for i ← 0 to m - 1 do
        remove(X, S[i])
        if U[i] < p then
            add(X, S[i])
        if size(X) = thresh then
            for each x in sorted(X) do
                if E[e] = 1 then
                    remove(X, x)
                e ← e + 1
            p ← p / 2
            if size(X) = thresh then
                return -1
    return size(X) / p`,
      js: `function CVMEstimate(S, thresh, U, E) {
  let p = 1, e = 0;
  const X = new Set();
  for (let i = 0; i < S.length; i++) {
    X.delete(S[i]);
    if (U[i] < p) X.add(S[i]);
    if (X.size === thresh) {
      for (const x of [...X].sort((a, b) => a - b)) { if (E[e] === 1) X.delete(x); e++; }
      p /= 2;
      if (X.size === thresh) return -1;
    }
  }
  return X.size / p;
}`,
      python: `def cvm_estimate(S, thresh, U, E):
    p, e, X = 1, 0, set()
    for i, a in enumerate(S):
        X.discard(a)
        if U[i] < p:
            X.add(a)
        if len(X) == thresh:
            for x in sorted(X):
                if E[e] == 1:
                    X.discard(x)
                e += 1
            p /= 2
            if len(X) == thresh:
                return -1
    return len(X) / p`,
      explain: "Intuition: after each item, every distinct value seen so far is in X with probability p (a repeated item's old coin is discarded and its new coin succeeds with probability p; a clean-up keeps each element with probability 1/2 while p halves), so |X|/p tracks the distinct count. The paper turns this into a concentration argument showing thresh = ⌈12 ε⁻² log(8m/δ)⌉ gives a (1 ± ε)-estimate with probability ≥ 1 − δ. Each item costs O(1) expected set work plus amortized O(1) for clean-ups (a clean-up of thresh elements happens only after thresh insertions), so the run is Θ(m) with O(thresh) stored items.",
    },
    complexity: "Θ(m) time, thresh = O(ε⁻² log(m/δ)) stored items",
    followUp: "CVM stores actual items (about log n bits each), so it needs considerably more memory than HyperLogLog's 6-bit registers; its appeal is that it needs no hash function and its proof is short enough for a textbook — Senior twist: Donald Knuth's note \"The CVM Algorithm for Estimating Distinct Elements in Streams\" (2023) gives Algorithm D, which stores a random 'volatility' u with each kept item, evicts only the item with the largest u when the buffer overflows and sets p to that u — it never fails and its estimate is unbiased.",
    distractors: ["if not contains(X, S[i]) and U[i] < p then", "if size(X) > thresh then", "e ← 0"],
    visual: "sims/amortized.html",
    lesson: LESSON,
  });

  /* ================================================================== */
  /* 23 · Learned index: shrinking-cone segmentation + error windows     */
  /* ================================================================== */
  const coneSegs = (K, eps, mode) => {
    const n = K.length, segs = [];
    let s = 0, lo = 0, hi = Infinity;
    for (let i = 1; i < n; i++) {
      const d = K[i] - K[s], sl = (i - s) / d, up = (i + eps - s) / d, dn = (i - eps - s) / d;
      const inCone = mode === "strict" ? lo < sl && sl < hi : mode === "window" ? up >= lo && dn <= hi : lo <= sl && sl <= hi;
      if (inCone) { hi = Math.min(hi, up); lo = Math.max(lo, dn); }
      else { segs.push([s, i - 1]); s = i; if (mode !== "noreset") { lo = 0; hi = Infinity; } }
    }
    segs.push([s, n - 1]);
    return segs;
  };
  const coneWindow = (K, eps, segs, q, mode) => {
    let j = 0;
    while (j + 1 < segs.length && K[segs[j + 1][0]] <= q) j++;
    const [a, b] = segs[j];
    if (a === b) return [a, a];
    const d = K[b] - K[a], P = a * d + (q - K[a]) * (b - a);
    const clamp = (x) => Math.min(b, Math.max(a, x));
    if (mode === "round") { const g = Math.round(P / d); return [clamp(g - eps), clamp(g + eps)]; }
    return [clamp(Math.ceil((P - eps * d) / d)), clamp(Math.floor((P + eps * d) / d))];
  };
  const coneRun = (K, eps, Q, mode) => { const segs = coneSegs(K, eps, mode); return [segs, Q.map((q) => coneWindow(K, eps, segs, q, mode))]; };
  const coneGen = (r, n) => {
    const K = []; let k = r.int(0, 9), g = r.pick([1, 2, 3, 5]);
    while (K.length < n) { if (r() < 0.15) g = r.pick([1, 2, 3, 5, 8]); K.push(k); k += r() < 0.1 ? r.int(10, 40) : Math.max(1, g + r.int(-1, 1)); }
    const Q = Array.from({ length: 6 }, () => (r() < 0.6 ? r.pick(K) : r.int(K[0], K[n - 1])));
    return [K, r.int(1, 3), Q];
  };

  ForgeProblems.add({
    id: "learned-index-shrinking-cone",
    title: "Learned Index: Shrinking-Cone Segments and Error Windows",
    level: 7, chapter: 18, difficulty: 3,
    topics: ["learned indexes", "searching", "piecewise linear approximation", "databases"],
    strategy: "Greedy piecewise-linear fit with a guaranteed maximum error ε, then predict-and-search inside ±ε",
    source: "Galakatos, Markovitch, Binnig, Fonseca & Kraska (2019), \"FITing-Tree: A Data-aware Index Structure\" (ACM Special Interest Group on Management of Data (SIGMOD) Conference 2019), ShrinkingCone segmentation · Ferragina & Vinciguerra (2020), \"The PGM-index: a fully-dynamic compressed learned index with provable worst-case bounds\" (Proceedings of the Very Large Data Bases (VLDB) Endowment 13(8))",
    summary: "Cover sorted keys with line segments whose position error is at most ε (ShrinkingCone), then give each query its guaranteed search window.",
    statement: `
<p>A <b>learned index</b> replaces a B-tree's inner nodes with a model of "key → position". In a sorted array the position of key x is
its rank, so a few straight lines can predict it — <i>if</i> every stored key is guaranteed to lie within ε slots of its prediction, a lookup
becomes "predict, then binary-search 2ε + 1 slots". This problem builds the segments greedily with <b>ShrinkingCone</b> (from the
FITing-Tree, 2019). <i>Label: this greedy is not optimal.</i> The Piecewise Geometric Model index (PGM-index, 2020) computes the <b>fewest</b> possible ε-segments with a
convex-hull streaming algorithm (O'Rourke, 1981), which never uses more segments than ShrinkingCone.</p>
<p><b>Build</b> (<code>K[0..n−1]</code> distinct, increasing; key K[i] sits at position i). A segment has an origin (K[s], s) and every line in
it passes through the origin. Keep a cone of feasible slopes <code>[lo, hi]</code>, starting at <code>[0, ∞]</code>. For i = s+1, s+2, …, with
d = K[i] − K[s]:</p>
<ul>
<li>if the point's own slope <code>(i − s)/d</code> satisfies <code>lo ≤ (i − s)/d ≤ hi</code> (inclusive), it joins the segment and the cone
shrinks: <code>hi ← min(hi, (i + ε − s)/d)</code>, <code>lo ← max(lo, (i − ε − s)/d)</code>;</li>
<li>otherwise the segment is closed as <code>[s, i − 1]</code>, point i becomes the new origin, and the cone resets to [0, ∞].</li>
</ul>
<p>The last segment ends at n − 1. Each segment <code>[a, b]</code> uses the line through its first and last points (that slope is always
inside the final cone, so every key in it is within ε).</p>
<p><b>Lookup window</b> for a query q (K[0] ≤ q ≤ K[n−1]): take the last segment whose first key K[a] ≤ q. If a = b the window is
[a, a]. Otherwise, with d = K[b] − K[a] and the scaled prediction P = a·d + (q − K[a])·(b − a) (prediction = P/d), the window is every
whole position i with |i − P/d| ≤ ε, clamped into [a, b]: <code>[clamp(⌈(P − ε·d)/d⌉), clamp(⌊(P + ε·d)/d⌋)]</code> where
clamp(x) = min(b, max(a, x)). (Compute P with whole numbers and divide once — no rounding surprises.)</p>
<p>Write <code>ConeIndex(K, eps, Q)</code> returning <code>[segments, windows]</code>.</p>
<ul><li>1 ≤ n ≤ 45, 1 ≤ ε ≤ 3, keys are whole numbers below 2000, up to 8 queries.</li></ul>`,
    entry: "ConeIndex",
    params: ["K", "eps", "Q"],
    exampleCount: 4,
    tests: [
      { args: [[0, 1, 4, 12], 1, [4, 5]], expect: [[[0,3]],[[0,2],[1,2]]], explain: "Cone after (1,1): [0, 2]; after (4,2): [0.25, 0.75]. Point (12,3) has slope 3/12 = 0.25 = lo — inside (inclusive), so one segment [0, 3]. Query 4: P/d = 12/12 = 1, window [0, 2] holds K[2] = 4. Query 5 (not stored): prediction 1.25, window [1, 2]." },
      { args: [[1, 2, 3, 4, 50, 52, 54, 56], 1, [3, 54, 30]], expect: [[[0,3],[4,7]],[[1,3],[5,7],[3,3]]], explain: "The jump to 50 has slope 4/49 from the origin (1, 0), far below the cone, so a second segment starts at position 4 with a fresh cone. Query 30 falls in the first segment; its window is clamped to the segment's last slot." },
      { args: [[0, 1, 2, 7], 1, [7]], expect: [[[0,2],[3,3]],[[3,3]]], explain: "Point (7, 3) has slope 3/7 ≈ 0.43, outside the cone [0.5, 1.5] — even though a line within ±1 of it would cross the cone. ShrinkingCone tests the point's exact slope, because every line in a segment must pass through the origin AND keep all earlier points within ε." },
      { args: [[42], 2, [42]], expect: [[[0,0]],[[0,0]]], explain: "One key: one segment, window [0, 0]." },
      { args: [[10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 1, [10, 55, 100]], expect: [[[0,9]],[[0,1],[4,5],[8,9]]] },
      { args: [[3, 4, 9, 10, 11, 25, 26, 40, 41, 42, 43, 70], 2, [11, 26, 43, 69]], expect: [[[0,4],[5,9],[10,11]],[[2,4],[5,7],[10,11],[10,11]]] },
      { args: [[5, 6, 7, 8, 30, 31, 32, 33, 34, 35], 1, [33, 8]], expect: [[[0,3],[4,9]],[[6,8],[2,3]]] },
      { args: [[0, 2, 4, 6, 7, 8, 9, 10, 20, 30, 40], 1, [9, 30, 25]], expect: [[[0,6],[7,10]],[[5,6],[8,10],[8,9]]] },
    ],
    random: { count: 30, gen: (r, i) => coneGen(r, 1 + i) },
    reference: (K, eps, Q) => coneRun(K, eps, Q),
    mutants: [
      { fn: (K, e, Q) => coneRun(K, e, Q, "strict"), hint: "A point whose slope lands exactly on the edge of the cone still fits: the bounds came from |error| ≤ ε, which includes equality. Test lo ≤ slope ≤ hi (inclusive)." },
      { fn: (K, e, Q) => coneRun(K, e, Q, "window"), hint: "You accept a point when its ±ε slope range merely overlaps the cone. ShrinkingCone tests the point's exact slope (i − s)/d against [lo, hi]; otherwise the line through the segment's first and last points can miss earlier keys by more than ε." },
      { fn: (K, e, Q) => coneRun(K, e, Q, "noreset"), hint: "Your second and later segments split too early or too late. When a new segment starts, its cone must reset to lo = 0, hi = ∞ — the old bounds were slopes measured from the OLD origin." },
      { fn: (K, e, Q) => coneRun(K, e, Q, "round"), hint: "Your windows are sometimes one slot too wide or shifted. Don't round the prediction first: the window is every i with |i − P/d| ≤ ε, i.e. from ⌈(P − ε·d)/d⌉ to ⌊(P + ε·d)/d⌋, then clamped into the segment." },
    ],
    hints: [
      "Every line in a segment goes through its origin, so a line is just a slope. Each point (K[i], i) allows only the slopes that put it within ε — an interval. The cone is the intersection of all those intervals: a point can join only if the cone still contains a slope that works for it AND the line to it.",
      "Build: s ← 0, lo ← 0, hi ← ∞; for i ← 1 to n − 1: d ← K[i] − K[s]; if lo ≤ (i − s)/d ≤ hi then shrink the cone, else close [s, i − 1] and restart at i. Close the last segment after the loop. Then, for each query, find its segment and compute the window.",
      "Window: j ← 0; while j + 1 < length(segs) and K[segs[j + 1][0]] ≤ q do j ← j + 1. With a, b the segment ends: d ← K[b] − K[a]; P ← a·d + (q − K[a])·(b − a); lo ← ⌈(P − eps·d)/d⌉; hi ← ⌊(P + eps·d)/d⌋; clamp both into [a, b].",
    ],
    starter: {
      pseudo: `ALGORITHM ConeIndex(K[0..n-1], eps, Q)
    segs ← []
    s ← 0
    lo ← 0
    hi ← ∞
    for i ← 1 to n - 1 do
        ...
    append(segs, [s, n - 1])
    W ← []
    ...
    return [segs, W]

ALGORITHM Window(K, eps, segs, q)
    ...`,
      js: `function ConeIndex(K, eps, Q) {
  const segs = [];
  // ...
  return [segs, []];
}`,
    },
    solution: {
      pseudo: `ALGORITHM ConeIndex(K[0..n-1], eps, Q)
    segs ← []
    s ← 0
    lo ← 0
    hi ← ∞
    for i ← 1 to n - 1 do
        d ← K[i] - K[s]
        if lo ≤ (i - s) / d and (i - s) / d ≤ hi then
            hi ← min(hi, (i + eps - s) / d)
            lo ← max(lo, (i - eps - s) / d)
        else
            append(segs, [s, i - 1])
            s ← i
            lo ← 0
            hi ← ∞
    append(segs, [s, n - 1])
    W ← []
    for each q in Q do
        append(W, Window(K, eps, segs, q))
    return [segs, W]

ALGORITHM Window(K, eps, segs, q)
    j ← 0
    while j + 1 < length(segs) and K[segs[j + 1][0]] ≤ q do
        j ← j + 1
    a ← segs[j][0]
    b ← segs[j][1]
    if a = b then
        return [a, a]
    d ← K[b] - K[a]
    P ← a * d + (q - K[a]) * (b - a)
    lo ← min(b, max(a, ⌈(P - eps * d) / d⌉))
    hi ← min(b, max(a, ⌊(P + eps * d) / d⌋))
    return [lo, hi]`,
      js: `function ConeIndex(K, eps, Q) {
  const n = K.length, segs = [];
  let s = 0, lo = 0, hi = Infinity;
  for (let i = 1; i < n; i++) {
    const d = K[i] - K[s], slope = (i - s) / d;
    if (lo <= slope && slope <= hi) { hi = Math.min(hi, (i + eps - s) / d); lo = Math.max(lo, (i - eps - s) / d); }
    else { segs.push([s, i - 1]); s = i; lo = 0; hi = Infinity; }
  }
  segs.push([s, n - 1]);
  const windows = Q.map((q) => {
    let j = 0;
    while (j + 1 < segs.length && K[segs[j + 1][0]] <= q) j++;
    const [a, b] = segs[j];
    if (a === b) return [a, a];
    const d = K[b] - K[a], P = a * d + (q - K[a]) * (b - a);
    const clamp = (x) => Math.min(b, Math.max(a, x));
    return [clamp(Math.ceil((P - eps * d) / d)), clamp(Math.floor((P + eps * d) / d))];
  });
  return [segs, windows];
}`,
      python: `import math
def cone_index(K, eps, Q):
    n, segs = len(K), []
    s, lo, hi = 0, 0.0, math.inf
    for i in range(1, n):
        d = K[i] - K[s]
        if lo <= (i - s) / d <= hi:
            hi = min(hi, (i + eps - s) / d)
            lo = max(lo, (i - eps - s) / d)
        else:
            segs.append([s, i - 1])
            s, lo, hi = i, 0.0, math.inf
    segs.append([s, n - 1])
    windows = []
    for q in Q:
        j = 0
        while j + 1 < len(segs) and K[segs[j + 1][0]] <= q:
            j += 1
        a, b = segs[j]
        if a == b:
            windows.append([a, a])
            continue
        d = K[b] - K[a]
        P = a * d + (q - K[a]) * (b - a)
        clamp = lambda x: min(b, max(a, x))
        windows.append([clamp(-((eps * d - P) // d)), clamp((P + eps * d) // d)])   # exact ceil / floor
    return [segs, windows]`,
      explain: "Point i in a segment allows exactly the slopes in [(i − ε − s)/d, (i + ε − s)/d]; the cone is the intersection over the segment, so any slope in it — including the slope to the segment's last point, which was tested against the cone before it shrank — keeps every key within ε. Each key is examined once: the build is Θ(n). A lookup finds the segment (binary search over the segment keys in real systems, Θ(log #segments)) and then searches only 2ε + 1 slots, so with ε fixed the search is O(log #segments + log ε).",
    },
    complexity: "Θ(n) build; O(log #segments + log ε) lookup",
    followUp: "The PGM-index applies the same idea recursively — segment the segments' first keys — and uses the optimal O'Rourke streaming segmentation; its authors report 37.7–63.3% less space than the FITing-Tree on real data. Senior twist: ε is a dial — larger ε gives fewer segments (less memory, more cache-friendly) but wider windows; pick it so the window fits in one cache line or disk page.",
    distractors: ["if lo < (i - s) / d and (i - s) / d < hi then", "lo ← round(P / d) - eps", "append(segs, [s, i])"],
    visual: "sims/search-lab.html",
    lesson: LESSON,
  });

  /* ================================================================== */
  /* 24 · FindPivots — the bounded Bellman–Ford step of the 2025 SSSP     */
  /* ================================================================== */
  const fpCore = (G, S, D, B, k, mode) => {
    const n = G.length, d = D.slice(), W = new Set(S), Ssorted = S.slice().sort((a, b) => a - b);
    let prev = Ssorted;
    for (let i = 1; i <= k; i++) {
      const Wi = new Set();
      for (const u of prev) for (const [v, w] of G[u]) {
        const nd = d[u] + w;
        if (mode === "strict" ? nd < d[v] : nd <= d[v]) { d[v] = nd; if (mode === "nob" || nd < B) Wi.add(v); }
      }
      for (const v of Wi) W.add(v);
      prev = [...Wi].sort((a, b) => a - b);
      if (mode !== "noexit" && W.size > k * S.length) return { P: Ssorted, W: [...W].sort((a, b) => a - b), forest: true };
    }
    const kids = Array.from({ length: n }, () => []), parents = Array(n).fill(0);
    for (const u of W) for (const [v, w] of G[u]) if (W.has(v) && d[v] === d[u] + w) { kids[u].push(v); parents[v]++; }
    const size = (u) => 1 + kids[u].reduce((t, v) => t + size(v), 0);
    const P = Ssorted.filter((u) => parents[u] === 0 && (mode === "gt" ? size(u) > k : size(u) >= k));
    return { P, W: [...W].sort((a, b) => a - b), forest: [...W].every((v) => parents[v] <= 1) };
  };
  const fpRun = (G, S, D, B, k, mode) => { const o = fpCore(G, S, D, B, k, mode); return [o.P, o.W]; };
  const fpGen = (r) => {
    for (let tries = 0; ; tries++) {
      const n = r.int(5, 12), G = Array.from({ length: n }, () => []);
      for (let u = 0; u < n; u++) { const deg = r.int(0, 3); for (let t = 0; t < deg; t++) { const v = r.int(0, n - 1); if (v !== u && !G[u].some((e) => e[0] === v)) G[u].push([v, r.int(1, 9)]); } }
      const S = r.shuffle(Array.from({ length: n }, (_, i) => i)).slice(0, r.int(1, 3));
      const D = Array(n).fill(Infinity);
      S.forEach((s) => (D[s] = r.int(0, 6)));
      const T = D.slice();
      for (let it = 0; it < n; it++) for (let u = 0; u < n; u++) for (const [v, w] of G[u]) if (T[u] + w < T[v]) T[v] = T[u] + w;
      for (let v = 0; v < n; v++) if (!S.includes(v) && T[v] < Infinity && r() < 0.25) D[v] = T[v];
      const B = r.int(6, 26), k = r.int(2, 4);
      if (fpCore(G, S, D, B, k).forest || tries > 60) return [G, S, D, B, k];
    }
  };

  ForgeProblems.add({
    id: "find-pivots-bounded-relaxation",
    title: "Breaking the Sorting Barrier: FindPivots",
    level: 7, chapter: 18, difficulty: 3,
    topics: ["shortest paths", "Bellman–Ford", "graphs", "research frontier"],
    strategy: "k rounds of Bellman–Ford from a frontier set; only roots of large shortest-path trees stay expensive",
    source: "Duan, Mao, Mao, Shu & Yin (2025), \"Breaking the Sorting Barrier for Directed Single-Source Shortest Paths\" (ACM Symposium on Theory of Computing (STOC) 2025, Best Paper; arXiv:2504.17033), Algorithm 1 (FindPivots) and Lemma 3.2",
    summary: "Implement the pivot-finding step of the 2025 O(m log^(2/3) n) shortest-path algorithm: k bounded Bellman–Ford rounds, then the roots of big tight-edge trees.",
    statement: `
<p>For 40 years Dijkstra's algorithm with a Fibonacci heap, O(m + n log n), was the best for directed single-source shortest paths with real,
non-negative weights in the comparison-addition model — because Dijkstra effectively <i>sorts</i> the vertices by distance. In 2025 Duan,
Mao, Mao, Shu and Yin broke this "sorting barrier" with O(m log<sup>2/3</sup> n). Their key subroutine, <b>FindPivots</b>, avoids sorting a
large frontier S: it runs only k Bellman–Ford rounds from S. Vertices whose shortest paths are short (few hops) get finished on the spot;
only the few frontier vertices that root <i>big</i> shortest-path trees — the <b>pivots</b>, at most |W|/k of them — need the expensive,
heap-like recursive treatment.</p>
<p>Write <code>FindPivots(G, S, D, B, k)</code>, a faithful transcription of the paper's Algorithm 1. <code>G[u]</code> = list of
<code>[v, w]</code> out-edges (weights ≥ 1), <code>S</code> = the frontier, <code>D[v]</code> = the current distance estimates d̂ (∞ = not
reached yet; earlier work may already have set some), B = the distance bound, k = the number of rounds. Work on a copy d of D.</p>
<pre>W ← S;  W₀ ← S
for i ← 1 to k:
    Wᵢ ← ∅
    for each u in Wᵢ₋₁ (increasing id):
        for each [v, w] in G[u] (list order):
            if d[u] + w ≤ d[v]:       // ≤, not &lt;
                d[v] ← d[u] + w
                if d[u] + w &lt; B:
                    add v to Wᵢ
    W ← W ∪ Wᵢ
    if |W| &gt; k·|S|:
        return P = S, W            // grew fast
F ← tight edges (u, v): u, v ∈ W,
      d[v] = d[u] + w              // a forest
P ← the u ∈ S that are roots of F
      (no incoming F-edge) whose
      tree has ≥ k vertices
return P, W</pre>
<p>(The ≤ matters: see the third example. Use the current d-values while relaxing.)</p>
<p>Return <code>[P, W]</code>, both sorted increasingly. The paper assumes all paths have different lengths, which makes F a forest; the tests
are chosen so that no vertex has two tight incoming edges, so F really is a forest here too.</p>
<ul><li>n ≤ 12, 1 ≤ |S| ≤ 3, 2 ≤ k ≤ 4. In the full algorithm k = ⌊log<sup>1/3</sup> n⌋.</li></ul>`,
    entry: "FindPivots",
    params: ["G", "S", "D", "B", "k"],
    exampleCount: 4,
    tests: [
      { args: [[[[1, 3]], [[2, 2]], [[3, 1]], [], [[5, 2]], []], [0, 4], [0, Infinity, Infinity, Infinity, 1, Infinity], 100, 3], expect: [[0],[0,1,2,3,4,5]], explain: "Three rounds walk 0 → 1 → 2 → 3 and 4 → 5. |W| = 6 is not more than k·|S| = 6. Tight-edge trees: root 0 has 4 vertices (≥ 3, a pivot), root 4 only 2 — vertex 5 is already finished." },
      { args: [[[[1, 2], [2, 5]], [[3, 2]], [[4, 1]], [[5, 3]], [], []], [0], [0, Infinity, Infinity, Infinity, Infinity, Infinity], 100, 2], expect: [[0],[0,1,2]], explain: "After one round W = {0, 1, 2} already has more than k·|S| = 2 vertices: the frontier is growing fast, so FindPivots stops and keeps all of S as pivots." },
      { args: [[[[2, 3]], [[4, 4]], [[3, 2], [5, 4]], [], [], []], [0, 1], [0, 1, 3, Infinity, Infinity, Infinity], 100, 3], expect: [[0],[0,1,2,3,4,5]], explain: "Earlier work already set d̂[2] = 3. Because the test is d[u] + w ≤ d[v], vertex 2 is re-reached in round 1 and the walk continues to 3 and 5; with < it would stop at 2 (the paper's Remark: the equality lets an edge relaxed at a lower level be reused)." },
      { args: [[[[2, 3]], [[4, 4]], [[3, 2], [5, 4]], [], [], []], [0, 1], [0, 1, Infinity, Infinity, Infinity, Infinity], 6, 3], expect: [[0],[0,1,2,3,4]], explain: "Bound B = 6: vertex 5 gets d = 7 but is not added to W (7 ≥ B). Root 0's tree {0, 2, 3} has exactly k = 3 vertices, which counts (≥ k)." },
      { args: [[[[1, 2], [4, 9]], [[2, 1], [3, 3]], [], [], []], [0, 1], [0, 2, Infinity, Infinity, Infinity], 20, 3], expect: [[0],[0,1,2,3,4]], explain: "Vertex 1 is in S but d̂[1] = d̂[0] + 2, so the tight edge 0 → 1 makes it a child, not a root: one big tree, rooted at 0." },
      { args: [[[[1, 1]], [[2, 1]], [[3, 1]], [[4, 1]], []], [0], [0, Infinity, Infinity, Infinity, Infinity], 3, 4], expect: [[],[0,1,2]] },
      { args: [[[[1, 4], [2, 1]], [[3, 1]], [[1, 2], [4, 6]], [], [[3, 9]]], [0], [0, Infinity, Infinity, Infinity, Infinity], 50, 3], expect: [[0],[0,1,2,3,4]] },
      { args: [[[[3, 2]], [[3, 7]], [[4, 1]], [[5, 1]], [[6, 2]], [], []], [0, 1, 2], [0, 1, 3, Infinity, Infinity, Infinity, Infinity], 30, 2], expect: [[0,1,2],[0,1,2,3,4,5,6]] },
    ],
    random: { count: 30, gen: (r) => fpGen(r) },
    reference: (G, S, D, B, k) => fpRun(G, S, D, B, k),
    mutants: [
      { fn: (G, S, D, B, k) => fpRun(G, S, D, B, k, "strict"), hint: "Vertices whose estimate was already correct never re-enter W in your version. The relaxation test is d[u] + w ≤ d[v] — with equality — so a vertex reached at the same distance is still added to Wᵢ and keeps the walk going." },
      { fn: (G, S, D, B, k) => fpRun(G, S, D, B, k, "nob"), hint: "Your W contains vertices at distance ≥ B. Update d[v] whenever the relaxation succeeds, but add v to Wᵢ only if d[u] + w < B — FindPivots only works inside the current distance band." },
      { fn: (G, S, D, B, k) => fpRun(G, S, D, B, k, "noexit"), hint: "After each round, check whether |W| > k·|S|. If so, stop immediately and return P = S together with the current W — a frontier that grows that fast is cheap to keep whole." },
      { fn: (G, S, D, B, k) => fpRun(G, S, D, B, k, "gt"), hint: "A root whose tight-edge tree has exactly k vertices is a pivot too: the paper's condition is 'at least k vertices' (≥ k)." },
    ],
    hints: [
      "Only edges out of the vertices that changed in the previous round need relaxing (Wᵢ₋₁), exactly like a Bellman–Ford that tracks which vertices improved. After the rounds, the edges that are 'tight' (d[v] = d[u] + w) are the shortest-path tree edges found so far.",
      "Plan: d ← copy(D); inW ← set(S); prev ← sorted(S). Repeat k times: next ← set(); relax edges out of prev; add next to inW; prev ← sorted(next); early-exit check. Then count, for each u in S, whether some tight edge enters it, and the size of the tree hanging below it.",
      "Tree size: a recursive TreeSize(u) = 1 + Σ TreeSize(v) over tight edges (u, v) with v in W. A vertex u of S is a pivot iff no tight edge from W enters u and TreeSize(u) ≥ k.",
    ],
    starter: {
      pseudo: `ALGORITHM FindPivots(G, S, D, B, k)
    d ← copy(D)
    inW ← set(S)
    prev ← sorted(S)
    for i ← 1 to k do
        ...
    ...
    return [P, sorted(inW)]`,
      js: `function FindPivots(G, S, D, B, k) {
  const d = D.slice();
  // ...
  return [[], []];
}`,
    },
    solution: {
      pseudo: `ALGORITHM FindPivots(G, S, D, B, k)
    d ← copy(D)
    inW ← set(S)
    prev ← sorted(S)
    for i ← 1 to k do
        next ← set()
        for each u in prev do
            for each e in G[u] do
                if d[u] + e[1] ≤ d[e[0]] then
                    d[e[0]] ← d[u] + e[1]
                    if d[u] + e[1] < B then
                        add(next, e[0])
        prev ← sorted(next)
        for each v in prev do
            add(inW, v)
        if size(inW) > k * length(S) then
            return [sorted(S), sorted(inW)]
    P ← []
    for each u in sorted(S) do
        if not HasTightParent(G, d, inW, u) and TreeSize(G, d, inW, u) ≥ k then
            append(P, u)
    return [P, sorted(inW)]

ALGORITHM HasTightParent(G, d, inW, x)
    for each u in inW do
        for each e in G[u] do
            if e[0] = x and d[x] = d[u] + e[1] then
                return true
    return false

ALGORITHM TreeSize(G, d, inW, u)
    t ← 1
    for each e in G[u] do
        if contains(inW, e[0]) and d[e[0]] = d[u] + e[1] then
            t ← t + TreeSize(G, d, inW, e[0])
    return t`,
      js: `function FindPivots(G, S, D, B, k) {
  const d = D.slice(), W = new Set(S), byId = (a, b) => a - b;
  let prev = S.slice().sort(byId);
  for (let i = 1; i <= k; i++) {
    const next = new Set();
    for (const u of prev) for (const [v, w] of G[u]) {
      if (d[u] + w <= d[v]) { d[v] = d[u] + w; if (d[u] + w < B) next.add(v); }
    }
    prev = [...next].sort(byId);
    prev.forEach((v) => W.add(v));
    if (W.size > k * S.length) return [S.slice().sort(byId), [...W].sort(byId)];
  }
  const tight = (u, v, w) => W.has(u) && W.has(v) && d[v] === d[u] + w;
  const hasParent = (x) => [...W].some((u) => G[u].some(([v, w]) => v === x && tight(u, v, w)));
  const size = (u) => 1 + G[u].reduce((t, [v, w]) => t + (tight(u, v, w) ? size(v) : 0), 0);
  const P = S.slice().sort(byId).filter((u) => !hasParent(u) && size(u) >= k);
  return [P, [...W].sort(byId)];
}`,
      python: `def find_pivots(G, S, D, B, k):
    d, W = list(D), set(S)
    prev = sorted(S)
    for _ in range(k):
        nxt = set()
        for u in prev:
            for v, w in G[u]:
                if d[u] + w <= d[v]:
                    d[v] = d[u] + w
                    if d[u] + w < B:
                        nxt.add(v)
        prev = sorted(nxt)
        W |= nxt
        if len(W) > k * len(S):
            return [sorted(S), sorted(W)]
    tight = lambda u, v, w: u in W and v in W and d[v] == d[u] + w
    def size(u):
        return 1 + sum(size(v) for v, w in G[u] if tight(u, v, w))
    has_parent = lambda x: any(v == x and tight(u, v, w) for u in W for v, w in G[u])
    return [[u for u in sorted(S) if not has_parent(u) and size(u) >= k], sorted(W)]`,
      explain: "After k rounds, every vertex below B whose shortest path from S uses at most k edges past the frontier has its exact distance (the Bellman–Ford invariant). If W stayed small (|W| ≤ k|S|), the trees of tight edges partition W, and since a pivot's tree has ≥ k vertices there are at most |W|/k pivots (Lemma 3.2); every vertex in a small tree is already complete. The work is O(k·|W|) edge relaxations for bounded-degree graphs, which is how the full algorithm reaches O(m log^(2/3) n) with k = log^(1/3) n.",
    },
    complexity: "O(k · (edges out of W)) per call",
    followUp: "This step sits inside Bounded Multi-Source Shortest Path (BMSSP), the paper's recursive procedure, which also needs a block-based data structure supporting Insert, BatchPrepend and Pull (Lemma 3.3); the whole algorithm is deterministic and works for directed graphs with real weights. It does not beat binary-heap Dijkstra in practice yet — and Haeupler et al. (IEEE Symposium on Foundations of Computer Science (FOCS) 2024) proved Dijkstra universally optimal when the vertices must be output in sorted order, so both results stand. Senior twist: notice how 'avoid fully sorting the frontier' mirrors partial sorting in databases.",
    distractors: ["if d[u] + e[1] < d[e[0]] then", "if size(inW) ≥ k * length(S) then", "if TreeSize(G, d, inW, u) > k then"],
    visual: "sims/shortest-paths-plus.html",
    lesson: LESSON,
  });

  /* ================================================================== */
  /* 25 · Zip trees: insertion by unzipping, deletion by zipping          */
  /* ================================================================== */
  const zipSim = (ops, mode) => {
    let root = null;
    const keepL = (x, t) => (mode === "bst" ? true : mode === "le" ? x.rank <= t.rank : x.rank < t.rank);
    const keepR = (x, t) => (mode === "bst" ? true : mode === "lt" ? x.rank < t.rank : x.rank <= t.rank);
    const ins = (x, t) => {
      if (!t) return x;
      if (x.key < t.key) { if (ins(x, t.left) === x) { if (keepL(x, t)) t.left = x; else { t.left = x.right; x.right = t; return x; } } }
      else if (ins(x, t.right) === x) { if (keepR(x, t)) t.right = x; else { t.right = x.left; x.left = t; return x; } }
      return t;
    };
    const zip = (x, y) => { if (!x) return y; if (!y) return x; if (x.rank < y.rank) { y.left = zip(x, y.left); return y; } x.right = zip(x.right, y); return x; };
    const del = (key, t) => {
      if (!t) return null;
      if (key < t.key) t.left = del(key, t.left);
      else if (key > t.key) t.right = del(key, t.right);
      else if (mode === "succ" && t.left && t.right) { let m = t.right; while (m.left) m = m.left; t.key = m.key; t.rank = m.rank; t.right = del(m.key, t.right); }
      else if (mode === "succ") return t.left || t.right;
      else return zip(t.left, t.right);
      return t;
    };
    for (const o of ops) root = o[0] === "ins" ? ins({ key: o[1], rank: o[2], left: null, right: null }, root) : del(o[1], root);
    const out = [];
    const pre = (t) => { if (t) { out.push(t.key); pre(t.left); pre(t.right); } };
    pre(root);
    return out;
  };
  const zipGen = (r, m) => {
    const keys = r.shuffle(Array.from({ length: 60 }, (_, i) => i + 1)), live = [], ops = [];
    let next = 0;
    for (let t = 0; t < m; t++) {
      if (live.length && r() < 0.25) { const j = r.int(0, live.length - 1); ops.push(["del", live[j]]); live.splice(j, 1); }
      else { let rank = 0; while (rank < 4 && r() < 0.5) rank++; const key = keys[next++]; live.push(key); ops.push(["ins", key, rank]); }
    }
    return [ops];
  };

  ForgeProblems.add({
    id: "zip-tree-insert-delete",
    title: "Zip Trees: Insert by Unzipping, Delete by Zipping",
    level: 7, chapter: 18, difficulty: 2,
    topics: ["binary search trees", "randomized data structures", "skip lists", "recursion"],
    strategy: "A binary search tree max-heap-ordered by random geometric ranks (ties to the smaller key)",
    source: "Tarjan, Levy & Timmel (2019), \"Zip Trees\" (Algorithms and Data Structures Symposium (WADS) 2019; arXiv:1806.06726), §5 Algorithm 1 (recursive insert, delete, zip)",
    summary: "Insert and delete in a zip tree with supplied ranks, and return the final tree in preorder.",
    statement: `
<p>A <b>zip tree</b> (Tarjan, Levy &amp; Timmel, 2019) is a skip list redrawn as a binary search tree: each node gets a random
<b>rank</b> (rank k with probability 1/2<sup>k+1</sup> — the number of heads before the first tail, just like a skip-list node's height), and the
tree is <b>max-heap-ordered by rank, ties broken in favour of the smaller key</b>: a parent's rank is greater than its left child's and
at least its right child's. Insertion "unzips" a search path into two, deletion "zips" two paths into one — no rotations to balance, yet the
expected depth is at most 1.5·log₂ n + O(1).</p>
<p>Write <code>ZipTree(ops)</code>. Start from an empty tree and apply the operations in order:</p>
<ul>
<li><code>["ins", key, rank]</code> — insert a new key (never already present) with the given rank;</li>
<li><code>["del", key]</code> — delete a key that is present.</li>
</ul>
<p>Return the keys of the final tree in <b>preorder</b> (node, left subtree, right subtree). The paper's recursive Algorithm 1, in our
words: to insert x into the subtree rooted at t — if t is null, x is the subtree. If x.key &lt; t.key, insert x into t.left; if that call
returns x itself, then x stays t's left child when <code>x.rank &lt; t.rank</code>, otherwise x moves above t (<code>t.left ← x.right;
x.right ← t</code>) and the call returns x. Mirror image on the right, except x stays the right child when <code>x.rank ≤ t.rank</code>.
To delete, replace the node by <code>Zip(left, right)</code>: whichever root has the higher rank goes on top (ties: the <i>left</i> one, the
smaller keys), and the rest is zipped into its inner side.</p>
<ul><li>Up to 30 operations, keys 1..60, ranks 0..4. Records: <code>x ← new Node(key: 5, rank: 1)</code>; unset fields read as null.</li></ul>`,
    entry: "ZipTree",
    params: ["ops"],
    exampleCount: 4,
    tests: [
      { args: [[["ins", 5, 0], ["ins", 3, 1], ["ins", 8, 0]]], expect: [3,5,8], explain: "3 has the highest rank, so it becomes the root. 5 and 8 both have rank 0: the smaller key, 5, stays on top and 8 becomes its right child." },
      { args: [[["ins", 7, 1], ["ins", 4, 1], ["ins", 9, 1]]], expect: [4,7,9], explain: "All ranks tie, so the shape is forced by keys alone: smallest key on top, the others hang to the right — whatever the insertion order." },
      { args: [[]], expect: [], explain: "No operations: an empty tree." },
      { args: [[["ins", 50, 2], ["ins", 30, 1], ["ins", 70, 0], ["ins", 60, 1], ["ins", 20, 0], ["del", 50]]], expect: [30,20,60,70], explain: "Deleting the root zips its left spine (30, …) with its right spine (60, 70, …) in rank order: 30 and 60 tie at rank 1, so the left one, 30, goes on top." },
      { args: [[["ins", 10, 0], ["ins", 20, 0], ["ins", 30, 0], ["ins", 15, 2]]], expect: [15,10,20,30] },
      { args: [[["ins", 40, 1], ["ins", 20, 0], ["ins", 60, 0], ["ins", 10, 0], ["ins", 30, 2], ["ins", 50, 3], ["del", 30], ["ins", 35, 1]]], expect: [50,35,10,20,40,60] },
      { args: [[["ins", 4, 0], ["ins", 2, 0], ["ins", 6, 0], ["ins", 1, 2], ["ins", 3, 1], ["ins", 5, 1], ["ins", 7, 2], ["del", 1], ["del", 7]]], expect: [3,2,5,4,6] },
      { args: [[["ins", 8, 1], ["ins", 4, 0], ["ins", 12, 0], ["ins", 2, 1], ["ins", 6, 0], ["ins", 10, 1], ["ins", 14, 0], ["del", 8], ["del", 2]]], expect: [10,4,6,12,14] },
    ],
    random: { count: 30, gen: (r, i) => zipGen(r, i) },
    reference: (ops) => zipSim(ops),
    mutants: [
      { fn: (ops) => zipSim(ops, "lt"), hint: "With equal ranks your newest node climbs above the old one on both sides. The tie rule favours the SMALLER key: on the left use x.rank < t.rank to stay below, but on the right x stays below when x.rank ≤ t.rank." },
      { fn: (ops) => zipSim(ops, "le"), hint: "With equal ranks your new node never climbs. Ties go to the smaller key: a new LEFT child with the same rank as its parent has the smaller key, so it must move above (stay below only if x.rank < t.rank)." },
      { fn: (ops) => zipSim(ops, "bst"), hint: "Your tree ignores the ranks — it is a plain binary search tree, shaped by insertion order. After the recursive insert returns x, compare ranks and move x above t when it outranks t." },
      { fn: (ops) => zipSim(ops, "succ"), hint: "Insertion looks right, but deletion uses the textbook 'replace by the in-order successor', which breaks the rank (heap) order. Delete by zipping: Zip(left, right) puts the higher-ranked root on top and recurses on its inner side." },
    ],
    hints: [
      "The final shape doesn't depend on the order of operations: the node with the highest (rank, then smallest key) is the root, and the same rule applies inside each subtree. Insert and delete just restore that order locally.",
      "Write Insert(x, t) recursively, returning the new subtree root; the caller checks 'did the child call return x?'. Write Zip(x, y) for deletion: if x is null return y; if y is null return x; the higher rank wins (ties: x).",
      "Zip: if x.rank < y.rank then y.left ← Zip(x, y.left), return y; else x.right ← Zip(x.right, y), return x. Delete(key, t): recurse left/right by key; at the node itself return Zip(t.left, t.right).",
    ],
    starter: {
      pseudo: `ALGORITHM ZipTree(ops)
    root ← null
    for each o in ops do
        if o[0] = "ins" then
            ...
        else
            ...
    out ← []
    Preorder(root, out)
    return out

ALGORITHM Insert(x, t)
    ...

ALGORITHM Preorder(t, out)
    ...`,
      js: `function ZipTree(ops) {
  let root = null;
  // ...
  return [];
}`,
    },
    solution: {
      pseudo: `ALGORITHM ZipTree(ops)
    root ← null
    for each o in ops do
        if o[0] = "ins" then
            root ← Insert(new Node(key: o[1], rank: o[2]), root)
        else
            root ← Delete(o[1], root)
    out ← []
    Preorder(root, out)
    return out

ALGORITHM Insert(x, t)
    if t = null then
        return x
    if x.key < t.key then
        if Insert(x, t.left) = x then
            if x.rank < t.rank then
                t.left ← x
            else
                t.left ← x.right
                x.right ← t
                return x
    else if Insert(x, t.right) = x then
        if x.rank ≤ t.rank then
            t.right ← x
        else
            t.right ← x.left
            x.left ← t
            return x
    return t

ALGORITHM Delete(key, t)
    if key < t.key then
        t.left ← Delete(key, t.left)
    else if key > t.key then
        t.right ← Delete(key, t.right)
    else
        return Zip(t.left, t.right)
    return t

ALGORITHM Zip(x, y)
    if x = null then
        return y
    if y = null then
        return x
    if x.rank < y.rank then
        y.left ← Zip(x, y.left)
        return y
    x.right ← Zip(x.right, y)
    return x

ALGORITHM Preorder(t, out)
    if t ≠ null then
        append(out, t.key)
        Preorder(t.left, out)
        Preorder(t.right, out)`,
      js: `function ZipTree(ops) {
  const insert = (x, t) => {
    if (!t) return x;
    if (x.key < t.key) {
      if (insert(x, t.left) === x) {
        if (x.rank < t.rank) t.left = x;
        else { t.left = x.right; x.right = t; return x; }
      }
    } else if (insert(x, t.right) === x) {
      if (x.rank <= t.rank) t.right = x;
      else { t.right = x.left; x.left = t; return x; }
    }
    return t;
  };
  const zip = (x, y) => {
    if (!x) return y;
    if (!y) return x;
    if (x.rank < y.rank) { y.left = zip(x, y.left); return y; }
    x.right = zip(x.right, y); return x;
  };
  const del = (key, t) => {
    if (key < t.key) t.left = del(key, t.left);
    else if (key > t.key) t.right = del(key, t.right);
    else return zip(t.left, t.right);
    return t;
  };
  let root = null;
  for (const o of ops) root = o[0] === "ins" ? insert({ key: o[1], rank: o[2], left: null, right: null }, root) : del(o[1], root);
  const out = [];
  const pre = (t) => { if (t) { out.push(t.key); pre(t.left); pre(t.right); } };
  pre(root);
  return out;
}`,
      python: `class Node:
    def __init__(self, key, rank):
        self.key, self.rank, self.left, self.right = key, rank, None, None

def zip_tree(ops):
    def insert(x, t):
        if t is None:
            return x
        if x.key < t.key:
            if insert(x, t.left) is x:
                if x.rank < t.rank:
                    t.left = x
                else:
                    t.left, x.right = x.right, t
                    return x
        elif insert(x, t.right) is x:
            if x.rank <= t.rank:
                t.right = x
            else:
                t.right, x.left = x.left, t
                return x
        return t
    def zip_(x, y):
        if x is None: return y
        if y is None: return x
        if x.rank < y.rank:
            y.left = zip_(x, y.left)
            return y
        x.right = zip_(x.right, y)
        return x
    def delete(key, t):
        if key < t.key: t.left = delete(key, t.left)
        elif key > t.key: t.right = delete(key, t.right)
        else: return zip_(t.left, t.right)
        return t
    root = None
    for o in ops:
        root = insert(Node(o[1], o[2]), root) if o[0] == "ins" else delete(o[1], root)
    out = []
    def pre(t):
        if t:
            out.append(t.key); pre(t.left); pre(t.right)
    pre(root)
    return out`,
      explain: "Given the keys and ranks, exactly one binary search tree is heap-ordered by (rank, then smaller key) — the same uniqueness that makes treaps work — so any correct insert/delete must produce it. Insertion walks down O(depth), and the climb back moves x above every node it outranks, which is the paper's 'unzip' of the search path into the two paths x.left and x.right; deletion zips the two inner spines in rank order. With geometric ranks the expected depth is ≤ 1.5·log₂ n + O(1), so each operation takes O(log n) expected time.",
    },
    complexity: "O(log n) expected per operation; expected depth ≤ 1.5 log₂ n + O(1)",
    followUp: "Zip trees are isomorphic to skip lists (an item has rank ≥ k exactly when it reaches level k), but need only one node per item; the paper also gives iterative, rotation-free versions of both operations. Senior twist: make each rank a pair (geometric, small uniform tie-breaker) — the zip-zip trees of Gila, Goodrich & Tarjan (WADS 2023) — and the expected depth drops to about 1.39·log₂ n, matching treaps.",
    distractors: ["if x.rank ≤ t.rank then", "if x.rank > y.rank then", "t.right ← x.right"],
    visual: "sims/skip-list.html",
    lesson: LESSON,
  });
})();
