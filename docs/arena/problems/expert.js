/* Expert pack — Level 6 "Expert: Algorithm Designer" plus gentle Level 5 entries for chapters 16 and 17.
   Chapter 16 (Randomized, Amortized & Streaming): two-stack queue, reservoir sampling, Count–Min sketch, HyperLogLog.
   Chapter 17 (Senior Engineer Playbook): external-sort cost, retry backoff with jitter, LSM compaction,
   write-ahead-log recovery, DAG list scheduling on k workers.
   Chapters 10 and 13–15: Hungarian algorithm, lazy segment tree, Aho–Corasick, binary-lifting LCA,
   suffix array + LCP, Manacher.
   Most problems carry a `growth` check so that a correct but brute-force answer is flagged.
   Wrapped in an IIFE so helper names never collide with other problem files (they share one global scope). */
(function () {
  "use strict";

  const NESTED_FOR = "^( *)for\\b.*\\n(?:(?:\\1 .*)?\\n)*?\\1 +for\\b";

  /* ================================================================== */
  /* Chapter 16 · Level 5 — Queue from two stacks (amortized cost)       */
  /* ================================================================== */
  const twoStackRef = (ops) => {
    const inbox = [], outbox = [], out = [];
    let cost = 0;
    for (const op of ops) {
      if (op[0] === "enq") { inbox.push(op[1]); cost += 1; }
      else {
        if (!outbox.length) while (inbox.length) { outbox.push(inbox.pop()); cost += 2; }
        out.push(outbox.pop()); cost += 1;
      }
    }
    return [out, cost];
  };
  const twoStackOps = (r, n) => {
    const ops = []; let size = 0;
    for (let k = 0; k < n; k++) {
      if (size > 0 && r() < 0.45) { ops.push(["deq"]); size--; } else { ops.push(["enq", r.int(1, 99)]); size++; }
    }
    return ops;
  };

  ForgeProblems.add({
    id: "two-stack-queue-cost",
    title: "Queue from Two Stacks (Amortized Cost)",
    level: 5, chapter: 16, difficulty: 1,
    topics: ["amortized analysis", "stacks", "queues", "design"],
    strategy: "Lazy transfer + aggregate (accounting) analysis",
    source: "Interview classic · Cormen et al. (CLRS) Exercise 10.1-6 idea · Lesson 16, Build Card 1",
    summary: "Build a First-In First-Out (FIFO) queue from two Last-In First-Out (LIFO) stacks and count every push and pop it performs.",
    statement: `
<p>A queue is First-In First-Out (FIFO); a stack is Last-In First-Out (LIFO). With two stacks, an <b>inbox</b> and an <b>outbox</b>,
you can build a queue whose operations are <b>O(1) amortized</b> even though a single dequeue sometimes moves many elements.
This is the textbook example of the <i>accounting method</i>: every element is pushed at most twice and popped at most twice in its whole life.</p>
<p>Write <code>TwoStackQueue(ops)</code>. Each operation is <code>["enq", x]</code> or <code>["deq"]</code>; every <code>"deq"</code> is
made on a non-empty queue. Use exactly this <b>lazy</b> rule:</p>
<ul>
<li><b>enq x</b>: push x onto the inbox (cost 1).</li>
<li><b>deq</b>: <i>only if the outbox is empty</i>, move every element from the inbox to the outbox one by one
(each move is a pop plus a push: cost 2 per element). Then pop the outbox (cost 1) and output that value.</li>
</ul>
<p>Return <code>[outputs, cost]</code>: the list of dequeued values in order, and the total number of stack pushes and pops.</p>
<ul>
<li>0 ≤ number of operations ≤ 1500. <b>Efficiency:</b> the total work must be Θ(number of operations); the grader checks growth.</li>
</ul>`,
    entry: "TwoStackQueue",
    params: ["ops"],
    tests: [
      { args: [[["enq", 1], ["enq", 2], ["enq", 3], ["deq"], ["enq", 4], ["deq"], ["deq"], ["deq"]]], expect: [[1, 2, 3, 4], 16], explain: "3 pushes; the first deq moves 3 elements (6) and pops (1); enq 4 (1); two cheap pops (2); the last deq moves 4 over (2) and pops (1): 3 + 7 + 1 + 2 + 3 = 16." },
      { args: [[]], expect: [[], 0], explain: "No operations, no cost." },
      { args: [[["enq", 1], ["enq", 2], ["deq"], ["enq", 3], ["deq"], ["deq"]]], expect: [[1, 2, 3], 12], explain: "At the second deq the outbox still holds 2, so nothing moves — even though 3 is waiting in the inbox." },
      { args: [[["enq", 5], ["deq"]]], expect: [[5], 4] },
      { args: [[["enq", 7], ["deq"], ["enq", 8], ["deq"], ["enq", 9], ["deq"]]], expect: [[7, 8, 9], 12], explain: "Alternating: each element costs push + move (2) + pop = 4." },
      { args: [[["enq", 1], ["enq", 2], ["enq", 3], ["enq", 4], ["deq"], ["deq"], ["deq"], ["deq"]]], expect: [[1, 2, 3, 4], 16] },
      { args: [[["enq", 4], ["enq", 4], ["deq"], ["enq", 6], ["enq", 1], ["deq"], ["deq"], ["enq", 2], ["deq"], ["deq"]]], expect: [[4, 4, 6, 1, 2], 20] },
    ],
    random: { count: 30, gen: (r, i) => [twoStackOps(r, 2 + i * 2)] },
    reference: twoStackRef,
    growth: { metric: "steps", sizes: [64, 128, 256, 512, 1024], gen: (r, n) => [twoStackOps(r, n)], expect: "n" },
    mutants: [
      {
        fn: (ops) => { const q = [], out = []; let cost = 0; for (const op of ops) { if (op[0] === "enq") { q.push(op[1]); cost += 1; } else { const m = q.length; cost += 2 * m + 1 + 2 * (m - 1); out.push(q.shift()); } } return [out, cost]; },
        hint: "Your outputs are right but the cost is far too high: it looks like you pour the outbox back into the inbox after every dequeue. Leave elements in the outbox — they are already in FIFO order for the next dequeues.",
      },
      {
        fn: (ops) => { const inbox = [], outbox = [], out = []; let cost = 0; for (const op of ops) { if (op[0] === "enq") { inbox.push(op[1]); cost += 1; } else { while (inbox.length) { outbox.push(inbox.pop()); cost += 2; } out.push(outbox.pop()); cost += 1; } } return [out, cost]; },
        hint: "Some values come out in the wrong order. You move the inbox over even when the outbox still has elements, which buries older elements under newer ones. Transfer ONLY when the outbox is empty.",
      },
      {
        fn: (ops) => { const inbox = [], outbox = [], out = []; let cost = 0; for (const op of ops) { if (op[0] === "enq") { inbox.push(op[1]); cost += 1; } else { if (!outbox.length) while (inbox.length) { outbox.push(inbox.pop()); cost += 1; } out.push(outbox.pop()); cost += 1; } } return [out, cost]; },
        hint: "Your cost is too low. Moving one element from the inbox to the outbox is TWO stack operations: a pop from the inbox and a push onto the outbox.",
      },
    ],
    hints: [
      "Pushing everything from one stack onto another reverses it. What order does the outbox hold its elements in after such a transfer?",
      "Keep two stacks. enq pushes on the inbox. deq pops from the outbox — and only when the outbox is empty do you first pour the whole inbox into it.",
      "Inside deq: if isEmpty(outbox) then while not isEmpty(inbox) do push(outbox, pop(inbox)); cost ← cost + 2. Then append(out, pop(outbox)); cost ← cost + 1.",
    ],
    starter: {
      pseudo: `ALGORITHM TwoStackQueue(ops)
    // ops[k] = ["enq", x] or ["deq"]; return [outputs, cost]
    inbox ← stack()
    outbox ← stack()
    out ← []
    cost ← 0
    for each op in ops do
        ...
    return [out, cost]`,
      js: `function TwoStackQueue(ops) {
  const inbox = [], outbox = [], out = [];
  let cost = 0;
  // ...
  return [out, cost];
}`,
    },
    solution: {
      pseudo: `ALGORITHM TwoStackQueue(ops)
    inbox ← stack()
    outbox ← stack()
    out ← []
    cost ← 0
    for each op in ops do
        if op[0] = "enq" then
            push(inbox, op[1])
            cost ← cost + 1
        else
            if isEmpty(outbox) then
                while not isEmpty(inbox) do
                    push(outbox, pop(inbox))
                    cost ← cost + 2
            append(out, pop(outbox))
            cost ← cost + 1
    return [out, cost]`,
      js: `function TwoStackQueue(ops) {
  const inbox = [], outbox = [], out = [];
  let cost = 0;
  for (const op of ops) {
    if (op[0] === "enq") { inbox.push(op[1]); cost += 1; }
    else {
      if (outbox.length === 0) while (inbox.length) { outbox.push(inbox.pop()); cost += 2; }
      out.push(outbox.pop()); cost += 1;
    }
  }
  return [out, cost];
}`,
      python: `def two_stack_queue(ops):
    inbox, outbox, out, cost = [], [], [], 0
    for op in ops:
        if op[0] == "enq":
            inbox.append(op[1]); cost += 1
        else:
            if not outbox:
                while inbox:
                    outbox.append(inbox.pop()); cost += 2
            out.append(outbox.pop()); cost += 1
    return [out, cost]`,
      explain: "Accounting method: charge 4 per enqueue — 1 for its push, 2 prepaid for its one future move, 1 for its final pop. Each element is moved at most once, so the credit never runs out and m operations cost ≤ 4m: O(1) amortized, although one dequeue can cost Θ(n). The lazy 'transfer only when the outbox is empty' rule is exactly what keeps both the order and the bound correct.",
    },
    complexity: "O(1) amortized per operation (≤ 4 stack operations per element); a single deq can be Θ(n)",
    followUp: "Amortized is not real-time: one dequeue can stall. Okasaki's real-time queues (and 'incremental rehashing' in Redis) spread the transfer over later operations to get O(1) worst case. The same two-list queue is the standard purely functional queue in Haskell, OCaml and Clojure.",
    distractors: ["if isEmpty(inbox) then", "push(inbox, pop(outbox))", "while not isEmpty(outbox) do"],
    visual: "sims/amortized.html",
    lesson: "lessons/16-randomized-amortized-streaming/README.md",
  });

  /* ================================================================== */
  /* Chapter 16 · Level 5 — Reservoir sampling with given random draws   */
  /* ================================================================== */
  const reservoirRef = (S, k, D) => {
    const R = [];
    for (let i = 0; i < S.length; i++) {
      if (i < k) R.push(S[i]);
      else if (D[i] <= k) R[D[i] - 1] = S[i];
    }
    return R;
  };
  const reservoirGen = (r, n, k) => {
    const S = r.array(n, 1, 99);
    const D = S.map((_, i) => (i < k ? 0 : r.int(1, i + 1)));
    return [S, k, D];
  };

  ForgeProblems.add({
    id: "reservoir-sample-draws",
    title: "Reservoir Sampling (Algorithm R)",
    level: 5, chapter: 16, difficulty: 1,
    topics: ["randomized algorithms", "streaming", "sampling"],
    strategy: "One pass, O(k) memory, one random draw per item",
    source: "Vitter (1985), Algorithm R · Lesson 16, Build Card 11",
    summary: "Keep a uniform random sample of k items from a stream in one pass — replaying a given list of random draws.",
    statement: `
<p>Logging and tracing systems cannot keep every event, and they often don't know how many will arrive. <b>Reservoir sampling</b>
keeps a uniform random sample of <code>k</code> items in one pass with <code>O(k)</code> memory: item number <code>t</code>
(counting from 1) enters the sample with probability <code>k/t</code>, replacing a uniformly random slot.</p>
<p>To make the result checkable, the random numbers are given to you. <code>S[0..n-1]</code> is the stream; <code>D[0..n-1]</code> holds
the draws: for every index <code>i ≥ k</code>, <code>D[i]</code> is the value of <code>Random(1, i + 1)</code> made when item
<code>S[i]</code> (the (i+1)-th item) arrives. <code>D[i]</code> is 0 and unused for <code>i &lt; k</code>.</p>
<p>Algorithm R: the first k items fill slots <code>R[0..k-1]</code> in order. For a later item, let <code>j ← D[i]</code>;
if <code>j ≤ k</code> the item replaces slot <code>R[j − 1]</code>, otherwise it is skipped. Return the final reservoir <code>R</code>
(if <code>n &lt; k</code>, it simply holds all n items).</p>
<ul><li>0 ≤ n ≤ 1000, 1 ≤ k ≤ 20.</li></ul>`,
    entry: "Reservoir",
    params: ["S", "k", "D"],
    tests: [
      { args: [[10, 20, 30, 40, 50, 60], 2, [0, 0, 2, 4, 1, 6]], expect: [50, 30], explain: "30 draws 2 ≤ 2 → slot 1; 40 draws 4 > 2 → skipped; 50 draws 1 → slot 0; 60 draws 6 → skipped." },
      { args: [[7, 8], 3, [0, 0]], expect: [7, 8], explain: "Fewer items than k: the reservoir is just the whole stream." },
      { args: [[], 2, []], expect: [], explain: "An empty stream gives an empty sample." },
      { args: [[5, 6, 7, 8], 3, [0, 0, 0, 3]], expect: [5, 6, 8], explain: "j = 3 = k replaces the LAST slot R[2] — make sure j = k counts as 'in'." },
      { args: [[1, 2, 3, 4, 5], 1, [0, 1, 1, 4, 1]], expect: [5], explain: "k = 1: item t replaces the single slot with probability 1/t." },
      { args: [[4, 9, 2, 6, 3, 8, 1], 3, [0, 0, 0, 1, 5, 2, 3]], expect: [6, 8, 1] },
      { args: [[11, 12, 13, 14, 15, 16, 17, 18], 4, [0, 0, 0, 0, 5, 6, 7, 8]], expect: [11, 12, 13, 14], explain: "Every draw is > k, so the first four items survive." },
    ],
    random: { count: 30, gen: (r, i) => reservoirGen(r, i * 3, 1 + (i % 5)) },
    reference: reservoirRef,
    mutants: [
      {
        fn: (S, k, D) => { const R = []; for (let i = 0; i < S.length; i++) { if (i < k) R.push(S[i]); else if (D[i] < k) R[D[i] - 1] = S[i]; } return R; },
        hint: "A draw of exactly j = k never replaces anything in your version. The test is j ≤ k: there are k slots and j = k picks the last one, R[k − 1].",
      },
      {
        fn: (S, k, D) => { const R = []; for (let i = 0; i < S.length; i++) { if (i < k) R.push(S[i]); else if (D[i] <= k) R[D[i]] = S[i]; } return R; },
        hint: "Off by one on the slot: the draws are 1-based (1..i+1) but the reservoir is 0-based, so a draw j goes into R[j − 1], not R[j].",
      },
      {
        fn: (S, k) => S.slice(0, k),
        hint: "Your sample never changes after the first k items. Later items must get their chance: replace R[D[i] − 1] whenever D[i] ≤ k.",
      },
    ],
    hints: [
      "Two phases: the first k items always go in. After that, each new item either replaces one slot or is thrown away. Which given number decides that?",
      "for i ← 0 to n − 1: if i < k then R[i] ← S[i]; else j ← D[i] and, if it is small enough, overwrite a slot.",
      "The condition is j ≤ k and the slot is R[j − 1] (draws are 1-based, the array is 0-based).",
    ],
    starter: {
      pseudo: `ALGORITHM Reservoir(S[0..n-1], k, D[0..n-1])
    // D[i] = Random(1, i + 1) for the item S[i], i ≥ k
    R ← []
    for i ← 0 to n - 1 do
        ...
    return R`,
      js: `function Reservoir(S, k, D) {
  const R = [];
  // ...
  return R;
}`,
    },
    solution: {
      pseudo: `ALGORITHM Reservoir(S[0..n-1], k, D[0..n-1])
    R ← []
    for i ← 0 to n - 1 do
        if i < k then
            append(R, S[i])
        else
            j ← D[i]
            if j ≤ k then
                R[j - 1] ← S[i]
    return R`,
      js: `function Reservoir(S, k, D) {
  const R = [];
  for (let i = 0; i < S.length; i++) {
    if (i < k) R.push(S[i]);
    else if (D[i] <= k) R[D[i] - 1] = S[i];
  }
  return R;
}`,
      python: `def reservoir(S, k, D):
    R = []
    for i, x in enumerate(S):
        if i < k:
            R.append(x)
        elif D[i] <= k:
            R[D[i] - 1] = x
    return R`,
      explain: "One pass, one draw per item, O(k) memory. Uniformity: item t > k enters with probability k/t and each later item s evicts it with probability (k/s)(1/k) = 1/s, so it survives with k/t · t/(t+1) · … · (n−1)/n = k/n — the product telescopes (Lesson 16).",
    },
    complexity: "Θ(n) time, Θ(k) memory",
    followUp: "Vitter's Algorithm L skips ahead geometrically, needing only O(k log(n/k)) random numbers. For weighted sampling give each item the key u^(1/w) and keep the k largest in a heap (Efraimidis–Spirakis); distributed tracing systems merge per-shard samples the same way.",
    distractors: ["if j < k then", "R[j] ← S[i]", "if i ≤ k then"],
    visual: "sims/amortized.html",
    lesson: "lessons/16-randomized-amortized-streaming/README.md",
  });

  /* ================================================================== */
  /* Chapter 17 · Level 5 — External merge sort: passes and page I/Os    */
  /* ================================================================== */
  const extRef = (N, B) => {
    const runs0 = Math.ceil(N / B);
    let runs = runs0, passes = 1;
    while (runs > 1) { runs = Math.ceil(runs / (B - 1)); passes++; }
    return [runs0, passes, 2 * N * passes];
  };

  ForgeProblems.add({
    id: "external-sort-cost",
    title: "External Merge Sort: Passes and Page I/Os",
    level: 5, chapter: 17, difficulty: 1,
    topics: ["external memory", "sorting", "databases", "cost model"],
    strategy: "Back-of-the-envelope cost model (simulate the run counts)",
    source: "Ramakrishnan & Gehrke, Database Management Systems §13.3 (adapted) · Levitin §7.4 (the external-memory setting of B-trees) · Lesson 17, Playbook Card 8",
    summary: "Predict how many passes and page reads/writes a database needs to sort a file of N pages with B buffer pages.",
    statement: `
<p>When a database runs <code>ORDER BY</code> on a table bigger than memory, it uses <b>external merge sort</b>, and its query optimizer
must predict the cost <i>before</i> running it. In the Input/Output (I/O) cost model we count page transfers between disk and memory.</p>
<p>The file has <code>N</code> pages and the sort may use <code>B</code> buffer pages:</p>
<ul>
<li><b>Pass 0</b> reads B pages at a time, sorts them in memory and writes a sorted <i>run</i>: that gives ⌈N / B⌉ runs.</li>
<li>Each <b>merge pass</b> merges groups of <b>B − 1</b> runs into one (B − 1 input buffers plus one output buffer), so the number of runs becomes
⌈runs / (B − 1)⌉. Merge passes continue until one run is left.</li>
<li>Every pass (including pass 0) reads and writes every page once: <code>2N</code> page I/Os per pass.</li>
</ul>
<p>Return <code>[initialRuns, passes, pageIOs]</code>. Constraints: 1 ≤ N ≤ 10¹⁰, 3 ≤ B ≤ 10⁶.</p>`,
    entry: "ExternalSortCost",
    params: ["N", "B"],
    tests: [
      { args: [200, 6], expect: [34, 4, 1600], explain: "⌈200/6⌉ = 34 runs; 5-way merges: 34 → 7 → 2 → 1 (3 merge passes); 1 + 3 = 4 passes; 2 · 200 · 4 = 1600 I/Os." },
      { args: [5, 5], expect: [1, 1, 10], explain: "The whole file fits in the buffer: pass 0 alone produces the sorted result." },
      { args: [6, 3], expect: [2, 2, 24], explain: "B = 3 gives 2-way merging: 2 runs → 1." },
      { args: [1000000, 1000], expect: [1000, 3, 6000000], explain: "1000 runs, 999-way merge: 1000 → 2 → 1. Even a huge file needs few passes because the fan-in is large." },
      { args: [1, 3], expect: [1, 1, 2] },
      { args: [10000000000, 100], expect: [100000000, 6, 120000000000], explain: "10⁸ runs, 99-way: 10⁸ → 1010102 → 10204 → 104 → 2 → 1." },
      { args: [36, 6], expect: [6, 3, 216], explain: "6 runs but only 5-way merging: 6 → 2 → 1. Merging B runs at once would need a (B+1)-th buffer for output." },
      { args: [29, 4], expect: [8, 3, 174], explain: "⌈29/4⌉ = 8 (the last run is shorter); 3-way: 8 → 3 → 1." },
    ],
    random: { count: 30, gen: (r, i) => [r.int(1, 10 ** (1 + (i % 7))), r.int(3, 12)] },
    reference: extRef,
    mutants: [
      {
        fn: (N, B) => { const runs0 = Math.ceil(N / B); let runs = runs0, p = 1; while (runs > 1) { runs = Math.ceil(runs / B); p++; } return [runs0, p, 2 * N * p]; },
        hint: "Your merges combine B runs at a time. One buffer page must hold the OUTPUT of the merge, so only B − 1 runs can be merged at once: runs ← ⌈runs / (B − 1)⌉.",
      },
      {
        fn: (N, B) => { const runs0 = Math.ceil(N / B); let runs = runs0, p = 0; while (runs > 1) { runs = Math.ceil(runs / (B - 1)); p++; } return [runs0, p, 2 * N * p]; },
        hint: "Pass 0 (creating the sorted runs) is a pass too: it reads and writes the whole file. Start the pass count at 1.",
      },
      {
        fn: (N, B) => { const [a, b] = extRef(N, B); return [a, b, N * b]; },
        hint: "Each pass READS every page and WRITES every page: 2N page I/Os per pass, not N.",
      },
      {
        fn: (N, B) => { const runs0 = Math.max(1, Math.floor(N / B)); let runs = runs0, p = 1; while (runs > 1) { runs = Math.ceil(runs / (B - 1)); p++; } return [runs0, p, 2 * N * p]; },
        hint: "The initial run count rounds DOWN in your version. A leftover partial buffer still forms a (shorter) run: use ⌈N / B⌉.",
      },
    ],
    lints: [
      { re: "log", lang: "pseudo", message: "If a test with an exact power fails: floating-point logarithms can land a hair above or below an integer (log(1000)/log(10) is not exactly 3 in binary floating point), and ⌈…⌉ then jumps by one. Simulating runs ← ⌈runs / (B − 1)⌉ in a loop is exact and only takes a handful of iterations." },
    ],
    hints: [
      "How many runs exist after pass 0? And by what factor does each merge pass shrink the number of runs, given that one buffer page is needed for output?",
      "runs ← ⌈N / B⌉; passes ← 1; while runs > 1: runs ← ⌈runs / (B − 1)⌉; passes ← passes + 1.",
      "Return [⌈N / B⌉, passes, 2 · N · passes] — remember the initial run count before the loop changes it.",
    ],
    starter: {
      pseudo: `ALGORITHM ExternalSortCost(N, B)
    // N pages, B buffer pages; return [initialRuns, passes, pageIOs]
    runs0 ← ...
    passes ← ...
    ...
    return [runs0, passes, 2 * N * passes]`,
      js: `function ExternalSortCost(N, B) {
  // return [initialRuns, passes, pageIOs]
}`,
    },
    solution: {
      pseudo: `ALGORITHM ExternalSortCost(N, B)
    runs0 ← ⌈N / B⌉
    runs ← runs0
    passes ← 1
    while runs > 1 do
        runs ← ⌈runs / (B - 1)⌉
        passes ← passes + 1
    return [runs0, passes, 2 * N * passes]`,
      js: `function ExternalSortCost(N, B) {
  const runs0 = Math.ceil(N / B);
  let runs = runs0, passes = 1;
  while (runs > 1) { runs = Math.ceil(runs / (B - 1)); passes++; }
  return [runs0, passes, 2 * N * passes];
}`,
      python: `def external_sort_cost(N, B):
    runs0 = -(-N // B)
    runs, passes = runs0, 1
    while runs > 1:
        runs = -(-runs // (B - 1))
        passes += 1
    return [runs0, passes, 2 * N * passes]`,
      explain: "The loop computes passes = 1 + ⌈log_{B−1} ⌈N/B⌉⌉ exactly, in O(log_{B−1}(N/B)) iterations. The cost 2N · passes matches the external-memory lower bound Θ((N/B') log_{M/B'} (N/B')) up to constants — the reason a large fan-in (big B) matters far more than a fast CPU.",
    },
    complexity: "O(log_{B−1}(N/B)) iterations; cost 2N(1 + ⌈log_{B−1}⌈N/B⌉⌉) page I/Os",
    followUp: "Real systems do better: replacement selection (a heap in pass 0) makes runs about 2B pages long on random input, and double buffering overlaps I/O with CPU at the price of a smaller fan-in. PostgreSQL's work_mem and Spark's shuffle spill are exactly this B.",
    distractors: ["runs ← ⌈runs / B⌉", "passes ← 0", "runs0 ← ⌊N / B⌋"],
    visual: "sims/sorting-studio.html",
    lesson: "lessons/17-senior-engineer-playbook/README.md",
  });

  /* ================================================================== */
  /* Chapter 17 · Level 5 — Retry schedule: exponential backoff + jitter */
  /* ================================================================== */
  const backoffRef = (base, cap, deadline, mode, U) => {
    const out = []; let total = 0, prev = base;
    for (let a = 0; a < U.length; a++) {
      let s;
      if (mode === "full") { const e = Math.min(cap, base * Math.pow(2, a)); s = Math.floor(U[a] * (e + 1)); }
      else { s = Math.min(cap, base + Math.floor(U[a] * (3 * prev - base + 1))); prev = s; }
      if (total + s > deadline) break;
      total += s; out.push(s);
    }
    return out;
  };
  const drawList = (r, n) => Array.from({ length: n }, () => r.int(0, 99) / 100);

  ForgeProblems.add({
    id: "retry-backoff-jitter",
    title: "Retry Schedule: Exponential Backoff with Jitter",
    level: 5, chapter: 17, difficulty: 2,
    topics: ["distributed systems", "randomized algorithms", "simulation", "reliability"],
    strategy: "Simulation with a capped exponential and a retry budget",
    source: "Production classic (Amazon Web Services Architecture Blog, 'Exponential Backoff and Jitter', 2015) · Lesson 17",
    summary: "Compute a client's sleep times between retries — full jitter or decorrelated jitter — capped, and stopped by a deadline.",
    statement: `
<p>When a service fails, thousands of clients retry at once. If they all wait 1 s, 2 s, 4 s… they stay <i>synchronized</i> and hit the
service in waves (a "thundering herd"). <b>Jitter</b> spreads the retries out randomly; a <b>cap</b> bounds the wait; a <b>deadline</b>
(retry budget) stops retrying when waiting longer is pointless.</p>
<p>Write <code>BackoffSchedule(base, cap, deadline, mode, U)</code>. <code>U[a]</code> (for attempts a = 0, 1, 2, …) is a given random
draw in [0, 1). Sleep times are whole milliseconds:</p>
<ul>
<li><code>mode = "full"</code> (full jitter): <code>e ← min(cap, base · 2^a)</code>, then <code>sleep ← ⌊U[a] · (e + 1)⌋</code>, uniform in 0..e.</li>
<li><code>mode = "decorrelated"</code>: with <code>prev</code> starting at <code>base</code>,
<code>sleep ← min(cap, base + ⌊U[a] · (3 · prev − base + 1)⌋)</code>, uniform in base..3·prev before capping; then <code>prev ← sleep</code>.</li>
</ul>
<p>Keep a running total of the sleeps. Before accepting a sleep, if <code>total + sleep &gt; deadline</code>, <b>stop</b> — that retry and all later
ones are abandoned. Return the list of accepted sleeps.</p>
<ul><li>1 ≤ base ≤ 100, base ≤ cap ≤ 10⁶, 0 ≤ deadline ≤ 10⁷, 0 ≤ length(U) ≤ 60.</li></ul>`,
    entry: "BackoffSchedule",
    params: ["base", "cap", "deadline", "mode", "U"],
    tests: [
      { args: [100, 1000, 100000, "full", [0.5, 0.5, 0.5, 0.5, 0.5, 0.5]], expect: [50, 100, 200, 400, 500, 500], explain: "Ceilings e = 100, 200, 400, 800, then 1000 (capped), 1000; each sleep is ⌊0.5 · (e + 1)⌋." },
      { args: [10, 1000, 100000, "decorrelated", [0, 0.5, 0.99, 0.25]], expect: [10, 20, 60, 52], explain: "prev = 10: 10 + ⌊0 · 21⌋ = 10; 10 + ⌊0.5 · 21⌋ = 20; now prev = 20: 10 + ⌊0.99 · 51⌋ = 60; prev = 60: 10 + ⌊0.25 · 171⌋ = 52." },
      { args: [100, 1000, 700, "full", [0.9, 0.9, 0.9, 0.9]], expect: [90, 180, 360], explain: "Totals 90, 270, 630 are within the deadline 700; the next sleep ⌊0.9 · 801⌋ = 720 would reach 1350 > 700, so the client gives up." },
      { args: [10, 50, 1000, "decorrelated", [0.9, 0.9, 0.2, 0.2]], expect: [28, 50, 38, 31], explain: "The second sleep 10 + ⌊0.9 · 75⌋ = 77 is capped to 50, and prev becomes the CAPPED 50: 10 + ⌊0.2 · 141⌋ = 38, then 10 + ⌊0.2 · 105⌋ = 31." },
      { args: [5, 100, 0, "full", [0, 0.5]], expect: [0], explain: "A zero sleep fits a zero budget (0 + 0 ≤ 0); the next one (5 ms) does not." },
      { args: [5, 100, 1000, "full", []], expect: [], explain: "No retries allowed." },
      { args: [50, 400, 1000, "full", [0.99, 0.99, 0.99, 0.99, 0.99]], expect: [50, 99, 198, 396], explain: "Cap and deadline together: the fifth ceiling is capped at 400, and 743 + 396 > 1000." },
      { args: [1, 1000000, 10000000, "full", Array(45).fill(0.5)], expect: [1, 1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072, 262144, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000, 500000], explain: "The exponential hits the cap after 20 attempts; without the cap, attempt 44 would ask for 2⁴⁴ ms (over 500 years)." },
      { args: [20, 2000, 100000, "decorrelated", [0.5, 0.5, 0.5, 0.5, 0.5]], expect: [40, 70, 115, 183, 285] },
    ],
    random: { count: 30, gen: (r, i) => { const base = r.int(1, 50), cap = base * r.int(1, 40); return [base, cap, r.int(0, 20 * cap), i % 2 ? "full" : "decorrelated", drawList(r, r.int(0, 12))]; } },
    reference: backoffRef,
    mutants: [
      {
        fn: (base, cap, deadline, mode, U) => backoffRef(base, mode === "full" ? Infinity : cap, deadline, mode, U),
        hint: "Your full-jitter ceiling keeps doubling forever. Cap it BEFORE drawing: e ← min(cap, base · 2^a). (In a 64-bit language 2^a would also overflow for large a — another reason to cap early.)",
      },
      {
        fn: (base, cap, deadline, mode, U) => { const out = []; let total = 0; for (let a = 0; a < U.length; a++) { const s = mode === "full" ? Math.floor(U[a] * (Math.min(cap, base * Math.pow(2, a)) + 1)) : Math.min(cap, base + Math.floor(U[a] * (3 * base - base + 1))); if (total + s > deadline) break; total += s; out.push(s); } return out; },
        hint: "Your decorrelated sleeps never grow: the upper end must be 3 · prev, where prev is the PREVIOUS sleep (starting at base), not 3 · base. That dependence on the last sleep is what 'decorrelated' refers to.",
      },
      {
        fn: (base, cap, deadline, mode, U) => { const out = []; let total = 0, prev = base; for (let a = 0; a < U.length; a++) { let s; if (mode === "full") s = Math.floor(U[a] * (Math.min(cap, base * Math.pow(2, a)) + 1)); else { s = Math.min(cap, base + Math.floor(U[a] * (3 * prev - base + 1))); prev = s; } total += s; out.push(s); if (total > deadline) break; } return out; },
        hint: "Your schedule includes one sleep too many: you append first and check the deadline afterwards. Check total + sleep > deadline BEFORE accepting the sleep, and stop without adding it.",
      },
      {
        fn: (base, cap, deadline, mode, U) => { const out = []; let total = 0, prev = base; for (let a = 0; a < U.length; a++) { let s; if (mode === "full") s = Math.floor(U[a] * (Math.min(cap, base * Math.pow(2, a)) + 1)); else { const raw = base + Math.floor(U[a] * (3 * prev - base + 1)); s = Math.min(cap, raw); prev = raw; } if (total + s > deadline) break; total += s; out.push(s); } return out; },
        hint: "After a capped decorrelated sleep your next range is too wide: prev must be the sleep you actually used (after the cap), not the uncapped value.",
      },
    ],
    hints: [
      "This is a simulation — the only state you need is the running total and (for decorrelated) the previous sleep. What must be checked before a sleep is accepted?",
      "Loop a ← 0 to n − 1: compute the sleep s with the formula for the mode; if total + s > deadline then return the list so far; otherwise add s to total and append it.",
      "Full: s ← ⌊U[a] · (min(cap, base · 2^a) + 1)⌋. Decorrelated: s ← min(cap, base + ⌊U[a] · (3 · prev − base + 1)⌋), then prev ← s.",
    ],
    starter: {
      pseudo: `ALGORITHM BackoffSchedule(base, cap, deadline, mode, U[0..n-1])
    // mode = "full" or "decorrelated"; U[a] in [0, 1) is the draw for attempt a
    out ← []
    total ← 0
    prev ← base
    for a ← 0 to n - 1 do
        ...
    return out`,
      js: `function BackoffSchedule(base, cap, deadline, mode, U) {
  const out = [];
  let total = 0, prev = base;
  // ...
  return out;
}`,
    },
    solution: {
      pseudo: `ALGORITHM BackoffSchedule(base, cap, deadline, mode, U[0..n-1])
    out ← []
    total ← 0
    prev ← base
    for a ← 0 to n - 1 do
        if mode = "full" then
            e ← min(cap, base * 2^a)
            s ← ⌊U[a] * (e + 1)⌋
        else
            s ← min(cap, base + ⌊U[a] * (3 * prev - base + 1)⌋)
            prev ← s
        if total + s > deadline then
            return out
        total ← total + s
        append(out, s)
    return out`,
      js: `function BackoffSchedule(base, cap, deadline, mode, U) {
  const out = [];
  let total = 0, prev = base;
  for (let a = 0; a < U.length; a++) {
    let s;
    if (mode === "full") s = Math.floor(U[a] * (Math.min(cap, base * 2 ** a) + 1));
    else { s = Math.min(cap, base + Math.floor(U[a] * (3 * prev - base + 1))); prev = s; }
    if (total + s > deadline) return out;
    total += s;
    out.push(s);
  }
  return out;
}`,
      python: `def backoff_schedule(base, cap, deadline, mode, U):
    out, total, prev = [], 0, base
    for a, u in enumerate(U):
        if mode == "full":
            s = int(u * (min(cap, base * 2 ** a) + 1))
        else:
            s = min(cap, base + int(u * (3 * prev - base + 1)))
            prev = s
        if total + s > deadline:
            break
        total += s
        out.append(s)
    return out`,
      explain: "One O(1) step per attempt: Θ(n). Full jitter draws uniformly below a capped exponential, so the expected total wait after a attempts is about half the plain exponential's while the clients' retry times are spread uniformly (no waves). The deadline check before accepting a sleep enforces the retry budget exactly.",
    },
    complexity: "Θ(n) for n attempts",
    followUp: "Add a retry budget shared by all clients of a service (e.g. at most 10% extra load from retries, as gRPC and Envoy do) and only retry idempotent requests. Amazon's measurements showed full and decorrelated jitter cut total server work by more than half versus plain exponential backoff.",
    distractors: ["e ← base * 2^a", "s ← min(cap, base + ⌊U[a] * (3 * base - base + 1)⌋)", "if total > deadline then"],
    visual: "sims/growth-rates.html",
    lesson: "lessons/17-senior-engineer-playbook/README.md",
  });

  /* ================================================================== */
  /* Chapter 16 · Level 6 — Count–Min sketch with conservative update    */
  /* ================================================================== */
  const CM_P = 10007;
  const cmRef = (w, H, ops, conservative) => {
    const C = H.map(() => Array(w).fill(0)), out = [];
    const col = (i, x) => ((H[i][0] * x + H[i][1]) % CM_P) % w;
    for (const op of ops) {
      if (op[0] === "add") {
        const x = op[1], c = op[2];
        if (conservative) {
          let est = Infinity;
          for (let i = 0; i < H.length; i++) est = Math.min(est, C[i][col(i, x)]);
          for (let i = 0; i < H.length; i++) { const j = col(i, x); C[i][j] = Math.max(C[i][j], est + c); }
        } else for (let i = 0; i < H.length; i++) C[i][col(i, x)] += c;
      } else {
        let est = Infinity;
        for (let i = 0; i < H.length; i++) est = Math.min(est, C[i][col(i, op[1])]);
        out.push(est);
      }
    }
    return out;
  };
  const cmGen = (r, nOps, w, d, conservative) => {
    const H = Array.from({ length: d }, () => [r.int(1, CM_P - 1), r.int(0, CM_P - 1)]);
    const pool = r.distinct(Math.max(2, Math.min(12, Math.ceil(nOps / 3))), 0, 1000000);
    const ops = Array.from({ length: nOps }, () => (r() < 0.6 ? ["add", r.pick(pool), r.int(1, 5)] : ["query", r() < 0.85 ? r.pick(pool) : r.int(0, 1000000)]));
    return [w, H, ops, conservative];
  };
  const cmVariant = (mode) => (w, H, ops, conservative) => {
    const C = H.map(() => Array(w).fill(0)), out = [];
    const col = (i, x) => (mode === "noprime" ? (H[i][0] * x + H[i][1]) % w : ((H[i][0] * x + H[i][1]) % CM_P) % w);
    for (const op of ops) {
      if (op[0] === "add") {
        const x = op[1], c = op[2];
        if (conservative && mode !== "plain") {
          let est = Infinity;
          for (let i = 0; i < H.length; i++) est = Math.min(est, C[i][col(i, x)]);
          for (let i = 0; i < H.length; i++) { const j = col(i, x); C[i][j] = mode === "set" ? est + c : Math.max(C[i][j], est + c); }
        } else for (let i = 0; i < H.length; i++) C[i][col(i, x)] += c;
      } else {
        let est = mode === "max" ? -Infinity : Infinity;
        for (let i = 0; i < H.length; i++) { const v = C[i][col(i, op[1])]; est = mode === "max" ? Math.max(est, v) : Math.min(est, v); }
        out.push(est);
      }
    }
    return out;
  };

  ForgeProblems.add({
    id: "count-min-conservative",
    title: "Count–Min Sketch (with Conservative Update)",
    level: 6, chapter: 16, difficulty: 2,
    topics: ["streaming", "sketches", "hashing", "randomized algorithms"],
    strategy: "d hash rows × w counters; estimate = minimum over rows",
    source: "Cormode & Muthukrishnan (2005) · Estan & Varghese (2002), conservative update · Lesson 16, Build Card 9",
    summary: "Estimate item frequencies in a stream with a d × w counter matrix — and cut the overestimate with conservative update.",
    statement: `
<p>Routers, trending-topic services and query optimizers need "how often did x appear?" for millions of distinct x in a few kilobytes.
A <b>Count–Min sketch</b> keeps <code>d</code> rows of <code>w</code> counters. Row <code>i</code> has its own hash function; an item adds to
one counter per row, and the estimate is the <b>minimum</b> of its <code>d</code> counters. Collisions only ever add, so the sketch
never underestimates.</p>
<p>Hashing (fixed so the answer is checkable): with the prime <code>p = 10007</code>, row <code>i</code> uses
<code>H[i] = [a, b]</code> and sends item <code>x</code> to column <code>((a · x + b) mod 10007) mod w</code>.</p>
<p>Write <code>CountMin(w, H, ops, conservative)</code>. <code>d = length(H)</code>. Operations, in order:</p>
<ul>
<li><code>["add", x, c]</code> (c ≥ 1): if <code>conservative</code> is <code>false</code>, add c to x's counter in every row (plain update).
If <code>conservative</code> is <code>true</code>, first compute <code>est</code> = the current estimate of x, then raise each of x's counters to
<b>at least</b> <code>est + c</code> (counters already higher stay unchanged).</li>
<li><code>["query", x]</code>: <b>output</b> the current estimate of x (minimum over the rows of x's counters).</li>
</ul>
<p>Return the list of query outputs. Constraints: 1 ≤ w ≤ 64, 1 ≤ d ≤ 6, items 0 ≤ x ≤ 10⁶, up to 2000 operations; each operation must be O(d).</p>`,
    entry: "CountMin",
    params: ["w", "H", "ops", "conservative"],
    tests: [
      { args: [4, [[3, 1], [5, 2]], [["add", 1, 3], ["add", 5, 1], ["add", 2, 2], ["query", 1], ["query", 5], ["query", 2], ["query", 7]], false], expect: [4, 4, 2, 0], explain: "Items 1 and 5 land in the same column in BOTH rows (1 → (0, 3), 5 → (0, 3)), so each is estimated as 3 + 1 = 4. Item 7 was never added and its counters are 0." },
      { args: [4, [[3, 1], [5, 2]], [["add", 3336, 4], ["add", 5000, 1], ["add", 2, 2], ["query", 3336], ["query", 5000], ["query", 2], ["query", 3]], false], expect: [4, 3, 2, 0], explain: "Plain update: 5000 (columns (2, 0)) shares row 0's column 2 with 3336 and row 1's column 0 with 2, so its estimate min(5, 3) = 3 is too high (true count 1)." },
      { args: [4, [[3, 1], [5, 2]], [["add", 3336, 4], ["add", 5000, 1], ["add", 2, 2], ["query", 3336], ["query", 5000], ["query", 2], ["query", 3]], true], expect: [4, 2, 2, 0], explain: "Conservative update on the same stream: adding 5000 only raises counters to est + 1 = 1, and adding 2 raises row 1's column 0 to max(1, 0 + 2) = 2 — so 5000 is estimated 2 instead of 3." },
      { args: [5, [[7, 3]], [["query", 42], ["add", 42, 5], ["query", 42]], true], expect: [0, 5], explain: "A single row with no collisions counts exactly." },
      { args: [3, [[2, 0], [9, 1], [4, 4]], [], false], expect: [], explain: "No operations, no outputs." },
      { args: [4, [[3, 1], [5, 2]], [["add", 2, 5], ["add", 3336, 1], ["add", 3, 2], ["query", 3336], ["query", 3], ["query", 2]], true], expect: [1, 2, 5] },
      { args: [2, [[1, 0], [1, 1]], [["add", 10, 1], ["add", 20, 1], ["add", 20, 1], ["query", 10], ["query", 20], ["add", 11, 4], ["query", 10]], true], expect: [3, 3, 3], explain: "With w = 2 everything collides; the minimum over rows still never drops below the true count." },
      { args: [6, [[1234, 99], [4321, 7], [777, 500]], [["add", 999999, 2], ["add", 500000, 3], ["add", 123456, 1], ["query", 999999], ["query", 500000], ["query", 123456], ["add", 999999, 1], ["query", 999999]], false], expect: [3, 3, 1, 4], explain: "Large items, so the 'mod 10007' step really matters. 999999 (columns 4, 5, 4) has no collision-free row: 123456 shares rows 0 and 1, 500000 shares row 2 — so it is estimated 3 although its true count is 2." },
    ],
    random: { count: 30, gen: (r, i) => cmGen(r, 4 + i, r.int(2, 8), r.int(1, 4), i % 2 === 0) },
    reference: cmRef,
    growth: { metric: "steps", sizes: [64, 128, 256, 512, 1024], gen: (r, n) => cmGen(r, n, 16, 3, true), expect: "n" },
    mutants: [
      { fn: cmVariant("plain"), hint: "With conservative = true your estimates are the same as plain Count–Min. Conservative update first reads est (the current minimum) and then only RAISES each counter to max(counter, est + c) — it doesn't add c everywhere." },
      { fn: cmVariant("max"), hint: "Your estimates are too high: the answer is the MINIMUM of the item's d counters. Each counter is the true count plus collision noise, so the smallest one is the least polluted." },
      { fn: cmVariant("set"), hint: "Some of your estimates are BELOW the true count, which a Count–Min sketch must never do. In conservative update a counter that is already larger than est + c belongs partly to other items — keep it: C[i][j] ← max(C[i][j], est + c), never lower it." },
      { fn: cmVariant("noprime"), hint: "Your columns differ for large items. The hash is ((a · x + b) mod 10007) mod w — reduce modulo the prime first, then modulo w." },
    ],
    hints: [
      "Every counter an item touches holds its true count plus the counts of items that collide with it there. Why does taking the minimum over the rows give the best (and never too small) estimate?",
      "Store C as d rows of w zeros. Write a helper Col(a, b, x, w) = ((a · x + b) mod 10007) mod w. Add: loop over rows. Query: min over rows.",
      "Conservative add: est ← min over rows of C[i][Col(i, x)]; then for each row: C[i][j] ← max(C[i][j], est + c). Plain add: C[i][j] ← C[i][j] + c.",
    ],
    starter: {
      pseudo: `ALGORITHM CountMin(w, H[0..d-1], ops, conservative)
    // row i sends x to ((H[i][0] * x + H[i][1]) mod 10007) mod w
    C ← matrix(d, w, 0)
    out ← []
    for each op in ops do
        ...
    return out`,
      js: `function CountMin(w, H, ops, conservative) {
  const P = 10007, C = H.map(() => Array(w).fill(0)), out = [];
  // ...
  return out;
}`,
    },
    solution: {
      pseudo: `ALGORITHM CountMin(w, H[0..d-1], ops, conservative)
    C ← matrix(d, w, 0)
    out ← []
    for each op in ops do
        est ← ∞
        for i ← 0 to d - 1 do
            est ← min(est, C[i][Col(H[i], op[1], w)])
        if op[0] = "query" then
            append(out, est)
        else
            for i ← 0 to d - 1 do
                j ← Col(H[i], op[1], w)
                if conservative then
                    C[i][j] ← max(C[i][j], est + op[2])
                else
                    C[i][j] ← C[i][j] + op[2]
    return out

ALGORITHM Col(h, x, w)
    return ((h[0] * x + h[1]) mod 10007) mod w`,
      js: `function CountMin(w, H, ops, conservative) {
  const P = 10007, C = H.map(() => Array(w).fill(0)), out = [];
  const col = (i, x) => ((H[i][0] * x + H[i][1]) % P) % w;
  for (const op of ops) {
    let est = Infinity;
    for (let i = 0; i < H.length; i++) est = Math.min(est, C[i][col(i, op[1])]);
    if (op[0] === "query") { out.push(est); continue; }
    for (let i = 0; i < H.length; i++) {
      const j = col(i, op[1]);
      C[i][j] = conservative ? Math.max(C[i][j], est + op[2]) : C[i][j] + op[2];
    }
  }
  return out;
}`,
      python: `def count_min(w, H, ops, conservative):
    P = 10007
    C = [[0] * w for _ in H]
    col = lambda i, x: ((H[i][0] * x + H[i][1]) % P) % w
    out = []
    for op in ops:
        est = min(C[i][col(i, op[1])] for i in range(len(H)))
        if op[0] == "query":
            out.append(est)
            continue
        for i in range(len(H)):
            j = col(i, op[1])
            C[i][j] = max(C[i][j], est + op[2]) if conservative else C[i][j] + op[2]
    return out`,
      explain: "Each operation touches one counter per row: Θ(d) time, Θ(d·w) memory no matter how many distinct items there are. Invariant: every counter of x is ≥ x's true count (plain: it received every add of x; conservative: after an add, each of x's counters is ≥ old estimate + c ≥ old true count + c). So min over rows ≥ truth, and with w = ⌈e/ε⌉, d = ⌈ln(1/δ)⌉ the overestimate is ≤ εN with probability ≥ 1 − δ.",
    },
    complexity: "Θ(d) per operation, Θ(d·w) memory",
    followUp: "Conservative update can't support deletions (negative c) — use the Count sketch with a median estimator for turnstile streams. Top-k heavy hitters = Count–Min + a small heap of candidates; Redis (CMS.INCRBY) and Apache Spark's countMinSketch ship this structure.",
    distractors: ["est ← max(est, C[i][Col(H[i], op[1], w)])", "C[i][j] ← est + op[2]", "return (h[0] * x + h[1]) mod w"],
    visual: "sims/bloom-filter.html",
    lesson: "lessons/16-randomized-amortized-streaming/README.md",
  });

  /* ================================================================== */
  /* Chapter 16 · Level 6 — HyperLogLog from given 32-bit hashes         */
  /* ================================================================== */
  const hllVariant = (mode) => (b, H) => {
    const m = Math.pow(2, b), M = Array(m).fill(0);
    for (const h of H) {
      const j = h % m, w = Math.floor(h / m);
      let len = 0, t = w; while (t > 0) { t = Math.floor(t / 2); len++; }
      const rho = (32 - b) - len + (mode === "zeros" ? 0 : 1);
      M[j] = mode === "overwrite" ? rho : Math.max(M[j], rho);
    }
    let Z = 0, V = 0;
    for (let j = 0; j < m; j++) { Z += Math.pow(2, -M[j]); if (M[j] === 0) V++; }
    const alpha = 0.7213 / (1 + 1.079 / m);
    let E = alpha * m * m / Z;
    if (mode !== "nosmall" && E <= 2.5 * m && V > 0) E = m * Math.log(m / V);
    return E;
  };
  const hllRef = hllVariant("");
  const hllGen = (r, n, b) => { const pool = Array.from({ length: Math.max(1, Math.ceil(n * 0.7)) }, () => r.int(0, 4294967295)); return [b, Array.from({ length: n }, () => r.pick(pool))]; };

  ForgeProblems.add({
    id: "hyperloglog-estimate",
    title: "HyperLogLog: Count Distinct in a Few Bytes",
    level: 6, chapter: 16, difficulty: 3,
    topics: ["streaming", "sketches", "probabilistic counting", "bit manipulation"],
    strategy: "Registers of maximum leading-zero ranks + harmonic mean (+ linear counting for small counts)",
    source: "Flajolet, Fusy, Gandouet & Meunier (2007) · Lesson 16, Build Card 10",
    summary: "Turn a stream of 32-bit hash values into a HyperLogLog estimate of the number of distinct items.",
    statement: `
<p>"How many unique visitors today?" over billions of events is answered by <b>HyperLogLog</b> in Redis (<code>PFCOUNT</code>),
Google BigQuery and Presto — in about a kilobyte, with ~1% error. The idea: a random hash that starts with many zero bits is rare,
so the longest run of leading zeros seen hints at how many distinct values were hashed. Duplicates hash identically, so they change nothing.</p>
<p>Write <code>HyperLogLog(b, H)</code>. <code>H</code> lists the <b>32-bit hash values</b> (integers 0 … 2³² − 1) of the stream's items, already
computed for you. Use <code>m = 2^b</code> registers <code>M[0..m-1]</code>, all 0 at the start. For each h:</p>
<ul>
<li><code>j ← h mod m</code> (the low b bits choose the register) and <code>w ← h div m</code> (the other 32 − b bits);</li>
<li><code>ρ ← (32 − b) − BitLength(w) + 1</code>, the position of the first 1-bit of w written with 32 − b bits
(BitLength(0) = 0, so w = 0 gives ρ = 33 − b);</li>
<li><code>M[j] ← max(M[j], ρ)</code>.</li>
</ul>
<p>Then with <code>Z = Σ 2^(−M[j])</code>, <code>α = 0.7213 / (1 + 1.079 / m)</code> and <code>E = α · m² / Z</code>: if
<code>E ≤ 2.5 · m</code> and <code>V</code> registers are still 0 (V &gt; 0), return the <b>linear-counting</b> estimate
<code>m · ln(m / V)</code>; otherwise return <code>E</code>. (Answers are compared to 6 significant digits.)</p>
<ul><li>2 ≤ b ≤ 8; 0 ≤ length(H) ≤ 3000. The work must be linear in the stream length.</li></ul>`,
    entry: "HyperLogLog",
    params: ["b", "H"],
    compare: "float",
    tests: [
      { args: [2, [4294967295]], expect: 1.1507282898071234, explain: "h = 2³² − 1: j = 3, w = 2³⁰ − 1 has BitLength 30, so ρ = 30 − 30 + 1 = 1. Three registers are still 0, E ≈ 2.6 ≤ 10, so linear counting gives 4 · ln(4/3) ≈ 1.15 — one distinct item." },
      { args: [2, [4294967295, 4294967295, 4294967295]], expect: 1.1507282898071234, explain: "Duplicates can't change a maximum: the estimate is identical." },
      { args: [2, [1364076727, 821347078, 2247144487, 614249093, 3423425485, 1558924552, 415870660, 1228498187, 3262916883, 3911517328, 2476801540, 2089332083]], expect: 16.158281376473937, explain: "12 distinct hashes, every register non-zero: the raw harmonic-mean estimate E ≈ 16.2 is used (only 4 registers, so it is rough)." },
      { args: [3, [1364076727, 821347078, 2247144487, 614249093, 3423425485, 1558924552, 415870660, 1228498187, 3262916883, 3911517328, 2476801540, 2089332083]], expect: 11.090354888959125, explain: "Same stream with 8 registers: one register is still 0 and E is small, so linear counting applies." },
      { args: [4, [4258159850, 1915844612, 1902775049, 295842356, 3332450780, 978925942, 2006649307, 2059582171, 1553401324, 3464365088, 3331197039, 3108089694, 651575154, 2220902093, 1455328557, 3420773058, 2120058280, 3453652013, 3029075140, 1897519344, 163803048, 4265348610, 1651666627, 2235285516, 735831407, 2169698935, 474548090, 3880899239, 2290772599, 948267993, 3828224862, 443639032, 4285910803, 2888900671, 2968511662, 228758194, 3048496928, 1346931589, 2485367117, 3223985580]], expect: 42.58141289122494, explain: "40 distinct hashes, 16 registers: estimate ≈ 42.6 (+6%)." },
      { args: [5, []], expect: 0, explain: "Empty stream: all 32 registers are 0, so V = m and m · ln(1) = 0." },
      { args: [3, [8388608, 4294967288]], expect: 1.0682511409961806, explain: "Both hashes hit register 0 (ρ = 9, then ρ = 1): the register keeps the maximum, 9." },
    ],
    random: { count: 30, gen: (r, i) => hllGen(r, 1 + i * 3, 2 + (i % 5)) },
    reference: hllRef,
    growth: { metric: "steps", sizes: [64, 128, 256, 512, 1024], gen: (r, n) => hllGen(r, n, 4), expect: "n" },
    mutants: [
      { fn: hllVariant("zeros"), hint: "Your ρ is one too small: it counts the leading zeros of w, but HyperLogLog stores the POSITION of the first 1-bit, which is (number of leading zeros) + 1: ρ = (32 − b) − BitLength(w) + 1." },
      { fn: hllVariant("nosmall"), hint: "For small streams your estimate is far off. When E ≤ 2.5m and some registers are still 0 (V > 0), switch to linear counting: m · ln(m / V)." },
      { fn: hllVariant("overwrite"), hint: "A register must keep the MAXIMUM ρ it has ever seen: M[j] ← max(M[j], ρ). Overwriting it with the latest ρ makes the estimate depend on the order of the stream." },
    ],
    hints: [
      "Think of each hash as coin flips: a value whose first 1-bit is at position ρ has probability 2^(−ρ). If the biggest ρ you ever saw is 10, roughly how many distinct values did you hash? Why split the stream into m registers?",
      "Pass 1 over H: j ← h mod m, w ← h div m, compute BitLength(w) with a halving loop, update M[j]. Pass 2 over the registers: Z ← Z + 2^(−M[j]) and count zeros V. Then apply the formula and the small-range rule.",
      "ρ ← (32 − b) − BitLength(w) + 1. E ← α · m · m / Z with α ← 0.7213 / (1 + 1.079 / m). If E ≤ 2.5 · m and V > 0 then return m · ln(m / V).",
    ],
    starter: {
      pseudo: `ALGORITHM HyperLogLog(b, H)
    m ← 2^b
    M ← array(m, 0)
    for each h in H do
        ...
    ...

ALGORITHM BitLength(w)
    ...`,
      js: `function HyperLogLog(b, H) {
  const m = 2 ** b, M = Array(m).fill(0);
  // ...
}`,
    },
    solution: {
      pseudo: `ALGORITHM HyperLogLog(b, H)
    m ← 2^b
    M ← array(m, 0)
    for each h in H do
        j ← h mod m
        rho ← (32 - b) - BitLength(h div m) + 1
        M[j] ← max(M[j], rho)
    Z ← 0
    V ← 0
    for j ← 0 to m - 1 do
        Z ← Z + 2^(-M[j])
        if M[j] = 0 then
            V ← V + 1
    E ← 0.7213 / (1 + 1.079 / m) * m * m / Z
    if E ≤ 2.5 * m and V > 0 then
        return m * ln(m / V)
    return E

ALGORITHM BitLength(w)
    len ← 0
    while w > 0 do
        w ← w div 2
        len ← len + 1
    return len`,
      js: `function HyperLogLog(b, H) {
  const m = 2 ** b, M = Array(m).fill(0);
  for (const h of H) {
    let w = Math.floor(h / m), len = 0;
    while (w > 0) { w = Math.floor(w / 2); len++; }
    M[h % m] = Math.max(M[h % m], 32 - b - len + 1);
  }
  let Z = 0, V = 0;
  for (let j = 0; j < m; j++) { Z += 2 ** -M[j]; if (M[j] === 0) V++; }
  const E = 0.7213 / (1 + 1.079 / m) * m * m / Z;
  return E <= 2.5 * m && V > 0 ? m * Math.log(m / V) : E;
}`,
      python: `import math
def hyperloglog(b, H):
    m = 1 << b
    M = [0] * m
    for h in H:
        j, w = h & (m - 1), h >> b
        M[j] = max(M[j], (32 - b) - w.bit_length() + 1)
    Z = sum(2.0 ** -r for r in M)
    V = M.count(0)
    E = 0.7213 / (1 + 1.079 / m) * m * m / Z
    if E <= 2.5 * m and V > 0:
        return m * math.log(m / V)
    return E`,
      explain: "One pass with O(1) work per hash (BitLength takes at most 32 halvings) plus O(m) at the end: Θ(n + m) time and m small registers of memory. Each register estimates log₂ of the number of distinct values it received; the harmonic mean over the m registers tames outliers, giving standard error ≈ 1.04/√m. Linear counting (the balls-into-bins estimate) is more accurate while many registers are still empty.",
    },
    complexity: "Θ(n + m) time, m registers of ⌈log₂(33)⌉ = 6 bits",
    followUp: "Two sketches of the same b MERGE by register-wise max, so each shard of a MapReduce or each day of data can be sketched separately and combined: count-distinct over any union of days without rescanning. HyperLogLog++ (BigQuery) adds 64-bit hashes, a bias-correction table and a sparse mode for small counts.",
    distractors: ["M[j] ← rho", "rho ← (32 - b) - BitLength(h div m)", "E ← 0.7213 / (1 + 1.079 / m) * m * m * Z"],
    visual: "sims/bloom-filter.html",
    lesson: "lessons/16-randomized-amortized-streaming/README.md",
  });

  /* ================================================================== */
  /* Chapter 17 · Level 6 — LSM-tree compaction                          */
  /* ================================================================== */
  const lsmVariant = (mode) => (runs, bottom) => {
    const best = new Map();
    const order = mode === "oldest" ? runs.slice().reverse() : runs;
    order.forEach((run) => run.forEach(([k, v]) => { if (mode === "resurrect" && v === null) return; if (!best.has(k)) best.set(k, v); }));
    const drop = mode === "alwaysdrop" ? true : mode === "neverdrop" ? false : bottom;
    return [...best.keys()].sort().filter((k) => !(drop && best.get(k) === null)).map((k) => [k, best.get(k)]);
  };
  const lsmGen = (r, nRuns, pool, per, pad) => {
    const names = Array.from({ length: pool }, (_, i) => "k" + String(i).padStart(pad, "0"));
    const runs = Array.from({ length: nRuns }, () => r.distinct(Math.min(pool, r.int(0, per)), 0, pool - 1).sort((a, b) => a - b).map((i) => [names[i], r() < 0.25 ? null : r.int(1, 99)]));
    return [runs, r() < 0.5];
  };

  ForgeProblems.add({
    id: "lsm-compaction-merge",
    title: "LSM-Tree Compaction: Newest Wins, Tombstones Last",
    level: 6, chapter: 17, difficulty: 2,
    topics: ["databases", "storage engines", "k-way merge", "heaps"],
    strategy: "k-way merge with a min-heap, deduplicating equal keys",
    source: "O'Neil et al. (1996), the LSM-tree · LevelDB / RocksDB compaction · Levitin §5.1 (merging) · Lesson 13, Build Card 10",
    summary: "Merge sorted runs of a Log-Structured Merge (LSM) tree: keep only the newest version of each key and handle deletion markers correctly.",
    statement: `
<p>Write-heavy databases — Apache Cassandra, RocksDB, LevelDB, Google Bigtable — are <b>Log-Structured Merge (LSM) trees</b>: writes go to memory and are
flushed as immutable sorted files ("runs", or Sorted String Tables (SSTables)). A background <b>compaction</b> merges runs so reads stay fast.
Deletes are writes too: a <b>tombstone</b> (value <code>null</code>) says "this key is deleted".</p>
<p>Write <code>Compact(runs, bottom)</code>. <code>runs[0]</code> is the <b>newest</b> run and <code>runs[r-1]</code> the oldest. Each run is a list of
<code>[key, value]</code> pairs sorted by key with distinct keys (keys are strings, compared alphabetically). Return one merged run, sorted by key, in which:</p>
<ul>
<li>each key appears at most once, with the value from the <b>newest</b> run that contains it;</li>
<li>if the newest version is a tombstone: when <code>bottom</code> is <code>true</code> (this compaction writes the last level — nothing older exists below it)
drop the key entirely; when <code>bottom</code> is <code>false</code> keep the tombstone <code>[key, null]</code>, because it must go on hiding older
versions that live in lower levels.</li>
</ul>
<ul><li>0 ≤ r ≤ 10, up to 1500 pairs in total. <b>Efficiency:</b> O(N log r) with a k-way merge, or O(N log N); anything quadratic is flagged.</li></ul>`,
    entry: "Compact",
    params: ["runs", "bottom"],
    tests: [
      { args: [[[["b", 7], ["d", null]], [["a", 1], ["b", 2], ["d", 4]]], true], expect: [["a", 1], ["b", 7]], explain: "b: the newer 7 wins over 2. d: the newest version is a tombstone, and at the bottom level it is dropped together with the older 4." },
      { args: [[[["b", 7], ["d", null]], [["a", 1], ["b", 2], ["d", 4]]], false], expect: [["a", 1], ["b", 7], ["d", null]], explain: "Same runs, but not the bottom level: the tombstone must survive, or an even older d in a lower level would come back to life." },
      { args: [[[["m", null]], [["m", 8]], [["m", 1], ["z", 2]]], true], expect: [["z", 2]], explain: "Deleting m must hide BOTH older versions. Dropping tombstones before deduplicating would resurrect m = 8." },
      { args: [[[], [["a", null], ["c", 3]], []], false], expect: [["a", null], ["c", 3]], explain: "Empty runs are allowed." },
      { args: [[], true], expect: [], explain: "Nothing to compact." },
      { args: [[[["m", 9]], [["m", null]], [["m", 1], ["z", 2]]], true], expect: [["m", 9], ["z", 2]], explain: "A key written again after its deletion is alive: the newest version (9) wins." },
      { args: [[[["apple", 3], ["kiwi", 1]], [["banana", 2], ["kiwi", null]], [["apple", 1], ["cherry", 5], ["kiwi", 7]]], true], expect: [["apple", 3], ["banana", 2], ["cherry", 5], ["kiwi", 1]] },
      { args: [[[["x", 5]]], true], expect: [["x", 5]] },
    ],
    random: { count: 30, gen: (r, i) => lsmGen(r, r.int(1, 5), 16, 8, 2) },
    reference: lsmVariant(""),
    growth: {
      metric: "steps", sizes: [64, 128, 256, 512, 1024],
      gen: (r, n) => { const names = (i) => "k" + String(i).padStart(5, "0"); const runs = Array.from({ length: 8 }, () => r.distinct(n / 8, 0, n - 1).sort((a, b) => a - b).map((i) => [names(i), r() < 0.2 ? null : r.int(1, 99)])); return [runs, true]; },
      expect: "n log n",
    },
    lints: [
      { re: "not\\s*\\(?\\s*\\w+\\[0\\]\\s+in\\s+\\w+|contains\\s*\\(\\s*seen", lang: "pseudo", message: "If the efficiency check flagged you: checking 'have I seen this key?' against a LIST scans the whole list every time (Θ(N²) overall). Either use a map/set, or — better, and how real compaction works — merge the runs with a priority queue so equal keys arrive next to each other." },
    ],
    mutants: [
      { fn: lsmVariant("oldest"), hint: "Your merge keeps the OLDEST version of a key. runs[0] is the newest: among equal keys, the pair from the run with the smallest index wins." },
      { fn: lsmVariant("alwaysdrop"), hint: "When bottom is false you still drop tombstones. Above the last level a tombstone must be kept ([key, null]) so it keeps hiding older versions stored further down." },
      { fn: lsmVariant("neverdrop"), hint: "When bottom is true, tombstones should disappear: nothing older exists below the last level, so the marker has nothing left to hide." },
      { fn: lsmVariant("resurrect"), hint: "A deleted key comes back with an OLD value. You seem to discard tombstones before choosing the newest version; decide the newest version first, and only then drop it if it is a tombstone." },
    ],
    hints: [
      "This is the merge step of mergesort, generalized to r sorted runs. How do you always know which run holds the next smallest key? And when several runs hold the same key, which one should win?",
      "Put the head [run, position] of each non-empty run in a min-priority queue keyed by its key. Repeatedly remove the minimum, push that run's next pair, and group consecutive pops with equal keys, remembering the one from the smallest run index.",
      "When a new key shows up, first emit the previous group's winner — unless its value is null and bottom is true. Don't forget to emit the last group after the loop.",
    ],
    starter: {
      pseudo: `ALGORITHM Compact(runs[0..r-1], bottom)
    // runs[0] is the newest; each run is a sorted list of [key, value]; value null = tombstone
    Q ← priorityQueue()
    for i ← 0 to r - 1 do
        ...
    out ← []
    ...
    return out`,
      js: `function Compact(runs, bottom) {
  // k-way merge; newest (smallest run index) wins; tombstones dropped only if bottom
}`,
    },
    solution: {
      pseudo: `ALGORITHM Compact(runs[0..r-1], bottom)
    Q ← priorityQueue()
    for i ← 0 to r - 1 do
        if length(runs[i]) > 0 then
            insert(Q, [i, 0], runs[i][0][0])
    out ← []
    best ← null
    bestRun ← 0
    while not isEmpty(Q) do
        (i, p) ← deleteMin(Q)
        if p + 1 < length(runs[i]) then
            insert(Q, [i, p + 1], runs[i][p + 1][0])
        e ← runs[i][p]
        if best ≠ null and best[0] = e[0] then
            if i < bestRun then
                best ← e
                bestRun ← i
        else
            Emit(out, best, bottom)
            best ← e
            bestRun ← i
    Emit(out, best, bottom)
    return out

ALGORITHM Emit(out, e, bottom)
    if e ≠ null and (e[1] ≠ null or not bottom) then
        append(out, e)`,
      js: `function Compact(runs, bottom) {
  // a small binary heap of [key, run, pos]
  const heap = [];
  const less = (a, b) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
  const push = (x) => { heap.push(x); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (less(heap[i], heap[p])) { [heap[i], heap[p]] = [heap[p], heap[i]]; i = p; } else break; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && less(heap[l], heap[m])) m = l; if (r < heap.length && less(heap[r], heap[m])) m = r; if (m === i) break; [heap[i], heap[m]] = [heap[m], heap[i]]; i = m; } } return top; };
  runs.forEach((run, i) => { if (run.length) push([run[0][0], i, 0]); });
  const out = [];
  let lastKey;
  while (heap.length) {
    const [key, i, p] = pop();
    if (p + 1 < runs[i].length) push([runs[i][p + 1][0], i, p + 1]);
    if (key === lastKey) continue;            // ties pop newest (smallest run) first
    lastKey = key;
    const v = runs[i][p][1];
    if (v !== null || !bottom) out.push([key, v]);
  }
  return out;
}`,
      python: `import heapq
def compact(runs, bottom):
    out, last = [], object()
    # heapq.merge breaks key ties by run index, so the newest version of a key comes first
    streams = [[(k, i, v) for k, v in run] for i, run in enumerate(runs)]
    for k, i, v in heapq.merge(*streams, key=lambda t: (t[0], t[1])):
        if k == last:
            continue
        last = k
        if v is not None or not bottom:
            out.append([k, v])
    return out`,
      explain: "The heap holds at most one entry per run, so each of the N pairs costs O(log r) to push and pop: Θ(N log r) time and O(r) extra memory — compaction can stream gigabyte-sized runs through a few buffers. Correctness: equal keys pop consecutively, so each group is complete when a larger key appears; choosing the smallest run index keeps the newest version, and tombstones are dropped only after that choice, and only at the bottom level.",
    },
    complexity: "Θ(N log r) time, O(r) extra memory (streaming)",
    followUp: "Compaction trades write amplification (data rewritten once per level) for read amplification (runs a read must check). Leveled compaction (RocksDB's default) minimizes read and space amplification; size-tiered (Cassandra's default) minimizes write amplification. Tombstones that pile up before reaching the bottom level are a classic production outage in Cassandra.",
    distractors: ["if i > bestRun then", "if e[1] ≠ null then", "insert(Q, [i, p], runs[i][p][0])"],
    visual: "sims/b-tree.html",
    lesson: "lessons/13-advanced-data-structures/README.md",
  });

  /* ================================================================== */
  /* Chapter 17 · Level 6 — Write-ahead-log recovery (redo, then undo)   */
  /* ================================================================== */
  const walVariant = (mode) => (disk, records) => {
    const st = new Map(mode === "nodisk" ? [] : disk.map(([k, v]) => [k, v]));
    const win = new Set(records.filter((x) => x[0] === "commit").map((x) => x[1]));
    for (const x of records) if (x[0] === "update" && (mode !== "winnersonly" || win.has(x[1]))) st.set(x[2], x[4]);
    if (mode === "forward") { for (const x of records) if (x[0] === "update" && !win.has(x[1])) st.set(x[2], x[3]); }
    else if (mode !== "noundo" && mode !== "winnersonly") for (let i = records.length - 1; i >= 0; i--) { const x = records[i]; if (x[0] === "update" && !win.has(x[1])) st.set(x[2], x[3]); }
    return [...st.keys()].sort().filter((k) => st.get(k) !== null).map((k) => [k, st.get(k)]);
  };
  const walGen = (r, nSteps, nKeys) => {
    const keys = Array.from({ length: nKeys }, (_, i) => (nKeys <= 26 ? String.fromCharCode(97 + i) : "k" + String(i).padStart(5, "0")));
    const cur = new Map();
    keys.forEach((k) => { if (r() < 0.7) cur.set(k, r.int(1, 99)); });
    const pre = new Map(cur), records = [], lockedBy = new Map(), active = [];
    let nextT = 1;
    for (let s = 0; s < nSteps; s++) {
      if (active.length && r() < 0.25) {
        const t = active.splice(r.int(0, active.length - 1), 1)[0];
        records.push(["commit", t]);
        for (const [k, o] of [...lockedBy]) if (o === t) lockedBy.delete(k);
        continue;
      }
      let t;
      if (!active.length || r() < 0.3) { t = nextT++; active.push(t); } else t = r.pick(active);
      const k = r.pick(keys);
      if (lockedBy.has(k) && lockedBy.get(k) !== t) continue;
      const before = cur.has(k) ? cur.get(k) : null, after = r() < 0.15 ? null : r.int(1, 99);
      if (before === null && after === null) continue;
      records.push(["update", t, k, before, after]);
      lockedBy.set(k, t);
      if (after === null) cur.delete(k); else cur.set(k, after);
    }
    const disk = new Map(pre);
    for (const x of records) if (x[0] === "update" && r() < 0.4) { if (x[4] === null) disk.delete(x[2]); else disk.set(x[2], x[4]); }
    return [[...disk.keys()].sort().map((k) => [k, disk.get(k)]), records];
  };

  ForgeProblems.add({
    id: "wal-recovery-undo-redo",
    title: "Crash Recovery from a Write-Ahead Log",
    level: 6, chapter: 17, difficulty: 2,
    topics: ["databases", "recovery", "logging", "hashing"],
    strategy: "Analysis → redo (repeat history) → undo losers backwards",
    source: "Mohan et al. (1992), ARIES (simplified) · Lesson 13, Build Card 10 (write-ahead log) · Lesson 17",
    summary: "Rebuild a database's committed state after a crash: redo every logged update, then undo uncommitted transactions in reverse.",
    statement: `
<p>Every serious database (PostgreSQL, MySQL InnoDB, SQLite in WAL mode) writes a <b>Write-Ahead Log (WAL)</b> record <i>before</i> changing data,
so after a crash it can rebuild exactly the <b>committed</b> state. Pages on disk may be stale (a committed change was never flushed) or
"dirty" (an uncommitted change was flushed early to free memory) — the log fixes both.</p>
<p>Write <code>Recover(disk, records)</code>.</p>
<ul>
<li><code>disk</code>: list of <code>[key, value]</code> pairs found on disk after the crash.</li>
<li><code>records</code>: the log, oldest first. <code>["update", t, key, before, after]</code> says transaction t changed key from
<code>before</code> to <code>after</code> (<code>null</code> means "did not exist" / "deleted"); <code>["commit", t]</code> says t committed.
Transactions without a commit record were still running at the crash: they are <b>losers</b>.</li>
</ul>
<p>Recover in three phases: <b>analysis</b> (find the committed transactions), <b>redo</b> (replay every update in log order, winners and losers alike,
setting key ← after), <b>undo</b> (scan the log <b>backwards</b> and, for each update by a loser, set key ← before).
Return the final state as a list of <code>[key, value]</code> pairs sorted by key, leaving out keys whose value is <code>null</code>.</p>
<ul><li>Strict two-phase locking holds: once a transaction updates a key, no other transaction touches that key until the first one commits.
Up to 1500 records. <b>Efficiency:</b> O(L) hash-map work plus sorting the output; a list-based winner lookup (Θ(L²)) is flagged.</li></ul>`,
    entry: "Recover",
    params: ["disk", "records"],
    tests: [
      { args: [[["x", 1], ["y", 2], ["z", 3]], [["update", 1, "x", 1, 10], ["update", 2, "y", 2, 20], ["commit", 1], ["update", 2, "z", 3, 30]]], expect: [["x", 10], ["y", 2], ["z", 3]], explain: "Transaction 1 committed, so x = 10 must survive although the disk still says 1 (redo). Transaction 2 never committed: y and z go back to 2 and 3 (undo)." },
      { args: [[["x", 10], ["y", 20]], [["update", 1, "x", 1, 10], ["update", 2, "y", 2, 20], ["commit", 1]]], expect: [["x", 10], ["y", 2]], explain: "The loser's y = 20 was already flushed to disk. Replaying only the winners would leave it there; the undo phase removes it." },
      { args: [[["a", 5]], [["update", 7, "a", 5, 6], ["update", 7, "a", 6, 7]]], expect: [["a", 5]], explain: "A loser changed a twice. Undoing backwards restores 6, then 5; undoing forwards would end at 6." },
      { args: [[["a", 7], ["k", 1]], [["update", 3, "a", 5, 6], ["update", 3, "a", 6, 7]]], expect: [["a", 5], ["k", 1]], explain: "Keys the log never mentions (k) keep their disk value." },
      { args: [[["q", 4]], []], expect: [["q", 4]], explain: "An empty log: the disk is already consistent." },
      { args: [[], [["update", 1, "n", null, 3], ["commit", 1], ["update", 2, "n", 3, null], ["update", 3, "m", null, 8]]], expect: [["n", 3]], explain: "Transaction 2's delete of n and transaction 3's insert of m are undone: n = 3 is back, m no longer exists." },
      { args: [[["n", 3]], [["update", 1, "n", null, 3], ["commit", 1], ["update", 2, "n", 3, null], ["commit", 2]]], expect: [], explain: "A committed delete: after redo n is null, so it is left out of the result." },
    ],
    random: { count: 30, gen: (r, i) => walGen(r, 3 + i, 3 + (i % 6)) },
    reference: walVariant(""),
    growth: { metric: "steps", sizes: [64, 128, 256, 512, 1024], gen: (r, n) => walGen(r, n, n), expect: "n log n" },
    mutants: [
      { fn: walVariant("noundo"), hint: "Changes made by transactions that never committed are still in your result. After redo, scan the log backwards and restore the before-value of every update made by a loser." },
      { fn: walVariant("forward"), hint: "When a loser updated the same key twice, you end up with an intermediate value. Undo must walk the log BACKWARDS (newest first), so the last restore is the oldest before-value." },
      { fn: walVariant("winnersonly"), hint: "An uncommitted value that had already been flushed to disk survives in your result. Redoing only the winners isn't enough when dirty pages can be written early: repeat ALL of history, then undo the losers." },
      { fn: walVariant("nodisk"), hint: "Keys that the log never mentions are missing. Start from the disk state, then apply redo and undo on top of it." },
    ],
    lints: [
      { re: "append\\s*\\(\\s*\\w*(win|commit)\\w*", lang: "pseudo", message: "If the efficiency check flagged you: a LIST of committed transactions makes every 'is t a winner?' test a linear scan. Put them in a set (winners ← set(); add(winners, t)) so each lookup is O(1)." },
    ],
    hints: [
      "Redo sets absolute values, so replaying it is harmless even for updates that already reached the disk. What information do you need BEFORE the undo phase can start?",
      "Three loops: (1) collect committed transaction ids in a set; (2) load disk into a map, then for every update set st[key] ← after; (3) for i from the last record down to 0, if it is an update by a non-winner, set st[key] ← before.",
      "Finish with: for each k in sorted(keys(st)) do if st[k] ≠ null then append(out, [k, st[k]]).",
    ],
    starter: {
      pseudo: `ALGORITHM Recover(disk, records[0..L-1])
    // records: ["update", t, key, before, after] or ["commit", t]
    winners ← set()
    ...
    st ← map()
    ...
    return out`,
      js: `function Recover(disk, records) {
  // analysis, redo, undo (backwards), then sorted output without nulls
}`,
    },
    solution: {
      pseudo: `ALGORITHM Recover(disk, records[0..L-1])
    winners ← set()
    for each rec in records do
        if rec[0] = "commit" then
            add(winners, rec[1])
    st ← map()
    for each pair in disk do
        st[pair[0]] ← pair[1]
    for each rec in records do
        if rec[0] = "update" then
            st[rec[2]] ← rec[4]
    for i ← L - 1 downto 0 do
        rec ← records[i]
        if rec[0] = "update" and not contains(winners, rec[1]) then
            st[rec[2]] ← rec[3]
    out ← []
    for each k in sorted(keys(st)) do
        if st[k] ≠ null then
            append(out, [k, st[k]])
    return out`,
      js: `function Recover(disk, records) {
  const winners = new Set(records.filter((x) => x[0] === "commit").map((x) => x[1]));
  const st = new Map(disk);
  for (const x of records) if (x[0] === "update") st.set(x[2], x[4]);
  for (let i = records.length - 1; i >= 0; i--) {
    const x = records[i];
    if (x[0] === "update" && !winners.has(x[1])) st.set(x[2], x[3]);
  }
  return [...st.keys()].sort().filter((k) => st.get(k) !== null).map((k) => [k, st.get(k)]);
}`,
      python: `def recover(disk, records):
    winners = {x[1] for x in records if x[0] == "commit"}
    st = dict(disk)
    for x in records:
        if x[0] == "update":
            st[x[2]] = x[4]
    for x in reversed(records):
        if x[0] == "update" and x[1] not in winners:
            st[x[2]] = x[3]
    return [[k, st[k]] for k in sorted(st) if st[k] is not None]`,
      explain: "Each phase is one pass with O(1) expected hash-map work per record: Θ(L) plus Θ(K log K) to sort the K keys. Correctness: after redo every logged key holds the value of its LAST update (history repeated, whatever the disk had). Strict two-phase locking means no one touched a loser's keys after it, so undoing its updates newest-first rolls each such key back to the value before the loser's first write — exactly the committed state.",
    },
    complexity: "Θ(L + K log K) time, Θ(K) memory",
    followUp: "Real ARIES (Algorithms for Recovery and Isolation Exploiting Semantics) adds Log Sequence Numbers (LSNs) on pages so redo skips updates a page already has, checkpoints so analysis starts near the end of the log instead of the beginning, and Compensation Log Records (CLRs) so a crash DURING undo never undoes the same update twice. Raft and Kafka replicate exactly such a log between machines.",
    distractors: ["for i ← 0 to L - 1 do", "if rec[0] = \"update\" and contains(winners, rec[1]) then", "add(winners, rec[2])"],
    visual: "sims/b-tree.html",
    lesson: "lessons/17-senior-engineer-playbook/README.md",
  });

  /* ================================================================== */
  /* Chapter 13 · Level 6 — Segment tree with lazy propagation           */
  /* ================================================================== */
  const lazyVariant = (mode) => (A, ops) => {
    const n = A.length, S = Array(4 * n).fill(0), T = Array(4 * n).fill(0), out = [];
    const build = (k, l, r) => { if (l === r) { S[k] = A[l]; return; } const m = (l + r) >> 1; build(2 * k, l, m); build(2 * k + 1, m + 1, r); S[k] = S[2 * k] + S[2 * k + 1]; };
    const apply = (k, l, r, v) => { S[k] += mode === "nolen" ? v : v * (r - l + 1); T[k] += v; };
    const push = (k, l, r) => { if (mode === "nopush") return; if (T[k]) { const m = (l + r) >> 1; apply(2 * k, l, m, T[k]); apply(2 * k + 1, m + 1, r, T[k]); T[k] = 0; } };
    const add = (k, l, r, a, b, v) => { if (b < l || r < a) return; if (a <= l && r <= b) { apply(k, l, r, v); return; } push(k, l, r); const m = (l + r) >> 1; add(2 * k, l, m, a, b, v); add(2 * k + 1, m + 1, r, a, b, v); if (mode !== "norecompute") S[k] = S[2 * k] + S[2 * k + 1]; };
    const qry = (k, l, r, a, b) => { if (b < l || r < a) return 0; if (a <= l && r <= b) return S[k]; push(k, l, r); const m = (l + r) >> 1; return qry(2 * k, l, m, a, b) + qry(2 * k + 1, m + 1, r, a, b); };
    build(1, 0, n - 1);
    for (const op of ops) {
      const hi = mode === "exclusive" ? Math.max(op[1], op[2] - 1) : op[2];
      if (op[0] === "add") add(1, 0, n - 1, op[1], hi, op[3]); else out.push(qry(1, 0, n - 1, op[1], hi));
    }
    return out;
  };
  const lazyRef = (A, ops) => { const a = A.slice(), out = []; for (const op of ops) { if (op[0] === "add") { for (let i = op[1]; i <= op[2]; i++) a[i] += op[3]; } else { let t = 0; for (let i = op[1]; i <= op[2]; i++) t += a[i]; out.push(t); } } return out; };
  const lazyGen = (r, n, nOps, wide) => {
    const ops = [];
    for (let k = 0; k < nOps; k++) {
      const l = wide ? r.int(0, Math.floor(n / 4)) : r.int(0, n - 1), rr = wide ? r.int(Math.floor(n / 2), n - 1) : r.int(l, n - 1);
      ops.push(r() < 0.5 ? ["add", l, rr, r.int(-9, 9)] : ["sum", l, rr]);
    }
    return [r.array(n, -20, 20), ops];
  };

  ForgeProblems.add({
    id: "lazy-segment-tree",
    title: "Segment Tree with Lazy Propagation (Range Add, Range Sum)",
    level: 6, chapter: 13, difficulty: 3,
    topics: ["segment tree", "lazy propagation", "range queries", "divide-and-conquer"],
    strategy: "Segment tree + deferred updates (tags)",
    source: "Interview & competitive-programming classic · Lesson 13, Build Card 4",
    summary: "Support 'add v to A[l..r]' and 'sum of A[l..r]' in O(log n) each by postponing updates with lazy tags.",
    statement: `
<p>A plain segment tree updates one element in O(log n). But "add 10 to every element of A[l..r]" would touch up to n leaves.
<b>Lazy propagation</b> stops at the O(log n) nodes that exactly cover [l..r], updates their sums, and leaves a <b>tag</b>
("my children still owe +v"); the tag is pushed one level down only when a later operation needs to go below that node.</p>
<p>Write <code>RangeAddSum(A, ops)</code> for a starting array <code>A[0..n-1]</code> (n ≥ 1) and operations (0-based, inclusive, l ≤ r):</p>
<ul>
<li><code>["add", l, r, v]</code> — add v to every element of <code>A[l..r]</code>;</li>
<li><code>["sum", l, r]</code> — <b>output</b> <code>A[l] + … + A[r]</code>.</li>
</ul>
<p>Return the list of outputs. <b>Each operation must be O(log n)</b> — with n operations on wide ranges the grader expects Θ(n log n) total work;
touching every element of the range (Θ(n) per operation) is flagged.</p>
<p>Layout: arrays <code>S</code> (sums) and <code>T</code> (pending tags) of size 4n; node k has children 2k and 2k + 1; the root is node 1 covering [0..n−1].</p>`,
    entry: "RangeAddSum",
    params: ["A", "ops"],
    tests: [
      { args: [[2, 5, 1, 4, 9, 3], [["sum", 1, 4], ["add", 1, 4, 10], ["sum", 0, 5], ["sum", 4, 4], ["sum", 3, 3]]], expect: [19, 64, 19, 14], explain: "5 + 1 + 4 + 9 = 19. After +10 on four elements the total is 24 + 40 = 64; the single leaves 4 and 3 are reached through tags that must be pushed down." },
      { args: [[7], [["sum", 0, 0], ["add", 0, 0, -3], ["sum", 0, 0]]], expect: [7, 4], explain: "A one-element tree: the root is a leaf." },
      { args: [[0, 0, 0, 0, 0, 0, 0, 0], [["add", 0, 7, 1], ["add", 2, 5, 2], ["sum", 3, 3], ["sum", 0, 1], ["sum", 1, 6], ["add", 4, 4, -3], ["sum", 3, 5]]], expect: [3, 2, 14, 6], explain: "Overlapping range adds stack: element 3 received +1 and +2. The node sum after an add must grow by v × (number of elements it covers)." },
      { args: [[1, 2, 3, 4, 5], [["add", 0, 2, 5], ["sum", 2, 3], ["add", 1, 4, 1], ["sum", 0, 4], ["sum", 1, 1]]], expect: [12, 34, 8] },
      { args: [[4, -1, 6, 2], [["sum", 0, 3], ["sum", 2, 2], ["add", 3, 3, 4], ["sum", 2, 3]]], expect: [11, 6, 12] },
      { args: [[3, 3, 3, 3, 3, 3, 3], [["add", 1, 5, 2], ["add", 0, 3, -1], ["sum", 0, 6], ["sum", 4, 6], ["sum", 3, 3], ["add", 6, 6, 10], ["sum", 5, 6]]], expect: [27, 13, 4, 18], explain: "Seven elements (not a power of two): the tree is unbalanced by one level in places, which 4n slots handle." },
    ],
    random: { count: 30, gen: (r, i) => lazyGen(r, 1 + (i % 16), 3 + i, false) },
    reference: lazyRef,
    growth: { metric: "steps", sizes: [32, 64, 128, 256, 512], gen: (r, n) => lazyGen(r, n, n, true), expect: "n log n" },
    mutants: [
      { fn: lazyVariant("nopush"), hint: "Sums over parts of a range that was updated earlier come out stale. Before recursing below a node (in both add and sum), push its pending tag to the two children and clear it." },
      { fn: lazyVariant("nolen"), hint: "After a range add, sums over big nodes grow by only v. A node covering [l..r] holds the sum of (r − l + 1) elements, so its sum must grow by v · (r − l + 1)." },
      { fn: lazyVariant("norecompute"), hint: "Queries over whole big nodes miss updates made to parts of them. After the two recursive add calls, recompute S[k] ← S[2k] + S[2k + 1] so ancestors see the change." },
      { fn: lazyVariant("exclusive"), hint: "The right end r seems excluded. Both operations are inclusive: a node covering [l..r] is fully inside the query when ql ≤ l and r ≤ qr." },
    ],
    lints: [
      { re: "for\\s+\\w+\\s*←\\s*op\\[1\\]\\s+to\\s+op\\[2\\]", lang: "pseudo", message: "If the efficiency check flagged you: looping over every index of [l..r] makes each operation Θ(n). Stop at nodes that are fully inside the range, update their sum by v · length, and leave a tag." },
    ],
    hints: [
      "If a node's whole segment is inside the add range, do you really need to visit its children now? What is the smallest amount of information you could leave behind so they can be fixed later?",
      "Write helpers: Apply(k, l, r, v) adds v · (r − l + 1) to S[k] and v to T[k]; Push(k, l, r) applies T[k] to both children and clears it. Add and Query both follow the usual outside / fully inside / partial recursion.",
      "In the partial case of both Add and Query: Push(k, l, r) first, then recurse. In Add, after the two recursive calls, recompute S[k] ← S[2k] + S[2k + 1].",
    ],
    starter: {
      pseudo: `ALGORITHM RangeAddSum(A[0..n-1], ops)
    // ops[k] = ["add", l, r, v] or ["sum", l, r]
    S ← array(4 * n, 0)
    T ← array(4 * n, 0)
    Build(A, S, 1, 0, n - 1)
    out ← []
    ...
    return out

ALGORITHM Build(A, S, k, l, r)
    ...

ALGORITHM Apply(S, T, k, l, r, v)
    ...

ALGORITHM Push(S, T, k, l, r)
    ...`,
      js: `function RangeAddSum(A, ops) {
  const n = A.length, S = Array(4 * n).fill(0), T = Array(4 * n).fill(0), out = [];
  // build, apply, push, add, query ...
  return out;
}`,
    },
    solution: {
      pseudo: `ALGORITHM RangeAddSum(A[0..n-1], ops)
    S ← array(4 * n, 0)
    T ← array(4 * n, 0)
    Build(A, S, 1, 0, n - 1)
    out ← []
    for each op in ops do
        if op[0] = "add" then
            RangeAdd(S, T, 1, 0, n - 1, op[1], op[2], op[3])
        else
            append(out, RangeSum(S, T, 1, 0, n - 1, op[1], op[2]))
    return out

ALGORITHM Build(A, S, k, l, r)
    if l = r then
        S[k] ← A[l]
        return
    m ← (l + r) div 2
    Build(A, S, 2 * k, l, m)
    Build(A, S, 2 * k + 1, m + 1, r)
    S[k] ← S[2 * k] + S[2 * k + 1]

ALGORITHM Apply(S, T, k, l, r, v)
    S[k] ← S[k] + v * (r - l + 1)
    T[k] ← T[k] + v

ALGORITHM Push(S, T, k, l, r)
    if T[k] ≠ 0 then
        m ← (l + r) div 2
        Apply(S, T, 2 * k, l, m, T[k])
        Apply(S, T, 2 * k + 1, m + 1, r, T[k])
        T[k] ← 0

ALGORITHM RangeAdd(S, T, k, l, r, ql, qr, v)
    if qr < l or r < ql then
        return
    if ql ≤ l and r ≤ qr then
        Apply(S, T, k, l, r, v)
        return
    Push(S, T, k, l, r)
    m ← (l + r) div 2
    RangeAdd(S, T, 2 * k, l, m, ql, qr, v)
    RangeAdd(S, T, 2 * k + 1, m + 1, r, ql, qr, v)
    S[k] ← S[2 * k] + S[2 * k + 1]

ALGORITHM RangeSum(S, T, k, l, r, ql, qr)
    if qr < l or r < ql then
        return 0
    if ql ≤ l and r ≤ qr then
        return S[k]
    Push(S, T, k, l, r)
    m ← (l + r) div 2
    return RangeSum(S, T, 2 * k, l, m, ql, qr) + RangeSum(S, T, 2 * k + 1, m + 1, r, ql, qr)`,
      js: `function RangeAddSum(A, ops) {
  const n = A.length, S = Array(4 * n).fill(0), T = Array(4 * n).fill(0), out = [];
  const build = (k, l, r) => {
    if (l === r) { S[k] = A[l]; return; }
    const m = (l + r) >> 1; build(2 * k, l, m); build(2 * k + 1, m + 1, r);
    S[k] = S[2 * k] + S[2 * k + 1];
  };
  const apply = (k, l, r, v) => { S[k] += v * (r - l + 1); T[k] += v; };
  const push = (k, l, r) => {
    if (T[k]) { const m = (l + r) >> 1; apply(2 * k, l, m, T[k]); apply(2 * k + 1, m + 1, r, T[k]); T[k] = 0; }
  };
  const add = (k, l, r, a, b, v) => {
    if (b < l || r < a) return;
    if (a <= l && r <= b) { apply(k, l, r, v); return; }
    push(k, l, r);
    const m = (l + r) >> 1; add(2 * k, l, m, a, b, v); add(2 * k + 1, m + 1, r, a, b, v);
    S[k] = S[2 * k] + S[2 * k + 1];
  };
  const query = (k, l, r, a, b) => {
    if (b < l || r < a) return 0;
    if (a <= l && r <= b) return S[k];
    push(k, l, r);
    const m = (l + r) >> 1;
    return query(2 * k, l, m, a, b) + query(2 * k + 1, m + 1, r, a, b);
  };
  build(1, 0, n - 1);
  for (const op of ops) {
    if (op[0] === "add") add(1, 0, n - 1, op[1], op[2], op[3]);
    else out.push(query(1, 0, n - 1, op[1], op[2]));
  }
  return out;
}`,
      python: `def range_add_sum(A, ops):
    n = len(A); S = [0] * (4 * n); T = [0] * (4 * n); out = []
    def build(k, l, r):
        if l == r: S[k] = A[l]; return
        m = (l + r) // 2
        build(2*k, l, m); build(2*k+1, m+1, r); S[k] = S[2*k] + S[2*k+1]
    def apply(k, l, r, v):
        S[k] += v * (r - l + 1); T[k] += v
    def push(k, l, r):
        if T[k]:
            m = (l + r) // 2
            apply(2*k, l, m, T[k]); apply(2*k+1, m+1, r, T[k]); T[k] = 0
    def add(k, l, r, a, b, v):
        if b < l or r < a: return
        if a <= l and r <= b: apply(k, l, r, v); return
        push(k, l, r); m = (l + r) // 2
        add(2*k, l, m, a, b, v); add(2*k+1, m+1, r, a, b, v)
        S[k] = S[2*k] + S[2*k+1]
    def query(k, l, r, a, b):
        if b < l or r < a: return 0
        if a <= l and r <= b: return S[k]
        push(k, l, r); m = (l + r) // 2
        return query(2*k, l, m, a, b) + query(2*k+1, m+1, r, a, b)
    build(1, 0, n - 1)
    for op in ops:
        if op[0] == "add": add(1, 0, n - 1, op[1], op[2], op[3])
        else: out.append(query(1, 0, n - 1, op[1], op[2]))
    return out`,
      explain: "Invariant: S[k] is the true sum of node k's segment minus nothing — every pending add that concerns k is already inside S[k]; T[k] only records what k's CHILDREN still owe. Both operations recurse into at most two partially covered nodes per level and stop at fully covered ones, so each visits O(log n) nodes (at most 4 per level); a push is O(1). Total Θ(n + q log n) for q operations.",
    },
    complexity: "Θ(n) build, O(log n) per range add and range sum",
    followUp: "Tags compose: 'assign v' then 'add w' needs a combined tag (assign v + w); affine updates x ↦ ax + b compose as matrices. Booking systems use a range-add / range-max lazy tree to answer 'can this room take one more reservation in [t₁, t₂]?'; time-series databases keep similar trees for fast range rollups.",
    distractors: ["S[k] ← S[k] + v", "if ql ≤ l or r ≤ qr then", "T[k] ← v"],
    visual: "sims/segment-tree.html",
    lesson: "lessons/13-advanced-data-structures/README.md",
  });

  /* ================================================================== */
  /* Chapter 14 · Level 6 — Lowest Common Ancestor by binary lifting     */
  /* ================================================================== */
  const lcaPrep = (parent) => {
    const n = parent.length, depth = Array(n).fill(0), ch = Array.from({ length: n }, () => []);
    let root = 0;
    parent.forEach((p, v) => { if (p === -1) root = v; else ch[p].push(v); });
    const order = [root];
    for (let i = 0; i < order.length; i++) for (const c of ch[order[i]]) { depth[c] = depth[order[i]] + 1; order.push(c); }
    const par = (v) => (parent[v] === -1 ? v : parent[v]);
    return { depth, par };
  };
  const lcaRef = (parent, Q) => {
    const { depth, par } = lcaPrep(parent);
    return Q.map(([a, b]) => { let u = a, v = b; while (depth[u] > depth[v]) u = par(u); while (depth[v] > depth[u]) v = par(v); while (u !== v) { u = par(u); v = par(v); } return u; });
  };
  const lcaVariant = (mode) => (parent, Q) => {
    const { depth, par } = lcaPrep(parent);
    return Q.map(([a, b]) => {
      let u = a, v = b;
      if (mode === "lockstep") { for (let s = 0; s < 2 * parent.length && u !== v; s++) { u = par(u); v = par(v); } return u; }
      while (depth[u] > depth[v]) u = par(u);
      while (depth[v] > depth[u]) v = par(v);
      if (mode === "noequalcheck") { if (u === v) return par(u); }
      while (u !== v) { u = par(u); v = par(v); }
      return u;
    });
  };
  const treeGen = (r, n, deep) => {
    const perm = r.shuffle([...Array(n).keys()]), parent = Array(n).fill(-1);
    for (let i = 1; i < n; i++) parent[perm[i]] = perm[deep ? Math.max(0, i - 1 - r.int(0, 2)) : r.int(0, i - 1)];
    return parent;
  };
  const lcaGen = (r, n, q, deep) => { const parent = treeGen(r, n, deep); return [parent, Array.from({ length: q }, () => [r.int(0, n - 1), r.int(0, n - 1)])]; };

  ForgeProblems.add({
    id: "lca-binary-lifting",
    title: "Lowest Common Ancestor by Binary Lifting",
    level: 6, chapter: 14, difficulty: 2,
    topics: ["trees", "binary lifting", "doubling", "dynamic programming", "range queries"],
    strategy: "Preprocess 2^j-th ancestors (doubling), answer each query in O(log n)",
    source: "Bender & Farach-Colton (2000) context · competitive-programming classic · Lesson 14",
    summary: "Answer many Lowest Common Ancestor (LCA) queries on a rooted tree in O(log n) each using jump tables of 2^j-th ancestors.",
    statement: `
<p>The <b>Lowest Common Ancestor (LCA)</b> of u and v is the deepest vertex that is an ancestor of both (a vertex counts as its own ancestor).
It powers distance queries in trees (dist = depth[u] + depth[v] − 2·depth[LCA]), "merge base" in Git, taxonomy lookups, and
network routing on trees. Walking up one parent at a time costs O(depth) per query — Θ(n) on a deep tree.</p>
<p><b>Binary lifting</b> precomputes <code>up[j][v]</code> = the 2<sup>j</sup>-th ancestor of v (<code>up[j][v] = up[j−1][ up[j−1][v] ]</code>, a doubling
recurrence), then answers a query by (1) lifting the deeper vertex by the depth difference, bit by bit, and (2) lifting both vertices together by the
largest jumps that keep them apart.</p>
<p>Write <code>LCAQueries(parent, Q)</code>. The tree has vertices <code>0..n-1</code>; <code>parent[v]</code> is v's parent and exactly one vertex (the root,
not necessarily 0) has <code>parent = −1</code>. <code>Q</code> is a list of pairs <code>[u, v]</code>. Return the list of LCAs.</p>
<ul><li>1 ≤ n ≤ 1000, up to 1000 queries. <b>Efficiency:</b> Θ((n + q) log n); the grader uses deep trees where walking up step by step is Θ(n) per query.</li></ul>`,
    entry: "LCAQueries",
    params: ["parent", "Q"],
    tests: [
      { args: [[-1, 0, 0, 1, 1, 2, 4], [[3, 6], [5, 6], [4, 6], [2, 2]]], expect: [1, 0, 4, 2], explain: "Root 0 with children 1 and 2; 1 has 3 and 4; 2 has 5; 4 has 6. LCA(3, 6) = 1; LCA(5, 6) = 0; 4 is an ancestor of 6, so LCA(4, 6) = 4; LCA(v, v) = v." },
      { args: [[-1], [[0, 0]]], expect: [0], explain: "A single vertex." },
      { args: [[3, 3, 0, -1, 2], [[1, 4], [4, 2], [0, 1], [3, 4]]], expect: [3, 2, 3, 3], explain: "The root is vertex 3, not 0. Chain 3 → 0 → 2 → 4, and 1 hangs from 3." },
      { args: [[-1, 0, 1, 2, 3, 4, 5, 6, 7, 8], [[9, 4], [2, 7], [9, 9], [0, 5]]], expect: [4, 2, 9, 0], explain: "A path: the LCA is always the shallower vertex. Deep trees are where binary lifting pays off." },
      { args: [[-1, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6], [[7, 8], [7, 9], [7, 14], [10, 9], [11, 6], [13, 14]]], expect: [3, 1, 0, 4, 2, 6] },
      { args: [[4, 4, 0, 2, -1, 1, 5], [[3, 6], [6, 5], [2, 3], [1, 0]]], expect: [4, 5, 2, 4] },
    ],
    random: { count: 30, gen: (r, i) => lcaGen(r, 1 + i, 4 + (i % 7), i % 2 === 0) },
    reference: lcaRef,
    growth: { metric: "steps", sizes: [64, 128, 256, 512, 1024], gen: (r, n) => lcaGen(r, n, n, true), expect: "n log n" },
    mutants: [
      { fn: lcaVariant("lockstep"), hint: "When u and v are at different depths you get the wrong vertex. Before moving both together, lift the DEEPER one until both have the same depth (by the depth difference, bit by bit)." },
      { fn: lcaVariant("noequalcheck"), hint: "When one vertex is an ancestor of the other you answer its parent. After equalizing depths, check 'if u = v then return u' before the joint lifting loop." },
    ],
    lints: [
      { re: "\\w+\\s*←\\s*parent\\[", lang: "pseudo", message: "If the efficiency check flagged you: climbing one parent per step costs O(depth) per query, Θ(n) on a path. Precompute up[j][v] (2^j-th ancestors) and jump by powers of two." },
    ],
    hints: [
      "Any number d can be written as a sum of distinct powers of two. If you knew every vertex's 1st, 2nd, 4th, 8th… ancestor, how many jumps would climbing d levels take?",
      "Preprocess: find the root, compute depth[] and up[0][v] = parent (the root is its own parent) with a Breadth-First Search (BFS) from the root, then up[j][v] ← up[j−1][up[j−1][v]] for j = 1..LOG−1 with 2^LOG ≥ n.",
      "Query: make u the deeper vertex; for each bit j of d = depth[u] − depth[v], if it is set, u ← up[j][u]. If u = v return u. Then for j from LOG − 1 down to 0: if up[j][u] ≠ up[j][v] then move both. Answer: up[0][u].",
    ],
    starter: {
      pseudo: `ALGORITHM LCAQueries(parent[0..n-1], Q)
    // parent[root] = -1; Q = list of [u, v]
    children ← array(n, [])
    ...
    LOG ← 1
    while 2^LOG < n do
        LOG ← LOG + 1
    up ← matrix(LOG, n, 0)
    depth ← array(n, 0)
    ...
    return out

ALGORITHM Lca(up, depth, LOG, u, v)
    ...`,
      js: `function LCAQueries(parent, Q) {
  // binary lifting: up[j][v] = 2^j-th ancestor
}`,
    },
    solution: {
      pseudo: `ALGORITHM LCAQueries(parent[0..n-1], Q)
    children ← array(n, [])
    root ← 0
    for v ← 0 to n - 1 do
        if parent[v] = -1 then
            root ← v
        else
            append(children[parent[v]], v)
    LOG ← 1
    while 2^LOG < n do
        LOG ← LOG + 1
    up ← matrix(LOG, n, 0)
    depth ← array(n, 0)
    up[0][root] ← root
    order ← [root]
    i ← 0
    while i < length(order) do
        u ← order[i]
        i ← i + 1
        for each c in children[u] do
            depth[c] ← depth[u] + 1
            up[0][c] ← u
            append(order, c)
    for j ← 1 to LOG - 1 do
        for v ← 0 to n - 1 do
            up[j][v] ← up[j - 1][up[j - 1][v]]
    out ← []
    for each q in Q do
        append(out, Lca(up, depth, LOG, q[0], q[1]))
    return out

ALGORITHM Lca(up, depth, LOG, u, v)
    if depth[u] < depth[v] then
        swap u and v
    d ← depth[u] - depth[v]
    for j ← 0 to LOG - 1 do
        if (d div 2^j) mod 2 = 1 then
            u ← up[j][u]
    if u = v then
        return u
    for j ← LOG - 1 downto 0 do
        if up[j][u] ≠ up[j][v] then
            u ← up[j][u]
            v ← up[j][v]
    return up[0][u]`,
      js: `function LCAQueries(parent, Q) {
  const n = parent.length, ch = Array.from({ length: n }, () => []);
  let root = 0;
  parent.forEach((p, v) => { if (p === -1) root = v; else ch[p].push(v); });
  let LOG = 1;
  while ((1 << LOG) < n) LOG++;
  const up = Array.from({ length: LOG }, () => Array(n).fill(0)), depth = Array(n).fill(0);
  up[0][root] = root;
  const order = [root];
  for (let i = 0; i < order.length; i++) for (const c of ch[order[i]]) { depth[c] = depth[order[i]] + 1; up[0][c] = order[i]; order.push(c); }
  for (let j = 1; j < LOG; j++) for (let v = 0; v < n; v++) up[j][v] = up[j - 1][up[j - 1][v]];
  return Q.map(([a, b]) => {
    let u = a, v = b;
    if (depth[u] < depth[v]) [u, v] = [v, u];
    const d = depth[u] - depth[v];
    for (let j = 0; j < LOG; j++) if ((d >> j) & 1) u = up[j][u];
    if (u === v) return u;
    for (let j = LOG - 1; j >= 0; j--) if (up[j][u] !== up[j][v]) { u = up[j][u]; v = up[j][v]; }
    return up[0][u];
  });
}`,
      python: `def lca_queries(parent, Q):
    n = len(parent); ch = [[] for _ in range(n)]; root = 0
    for v, p in enumerate(parent):
        if p == -1: root = v
        else: ch[p].append(v)
    LOG = max(1, (n - 1).bit_length())
    up = [[0] * n for _ in range(LOG)]; depth = [0] * n
    up[0][root] = root; order = [root]
    for u in order:
        for c in ch[u]:
            depth[c] = depth[u] + 1; up[0][c] = u; order.append(c)
    for j in range(1, LOG):
        for v in range(n): up[j][v] = up[j-1][up[j-1][v]]
    out = []
    for u, v in Q:
        if depth[u] < depth[v]: u, v = v, u
        d = depth[u] - depth[v]
        for j in range(LOG):
            if d >> j & 1: u = up[j][u]
        if u != v:
            for j in range(LOG - 1, -1, -1):
                if up[j][u] != up[j][v]: u, v = up[j][u], up[j][v]
            u = up[0][u]
        out.append(u)
    return out`,
      explain: "The table has LOG = ⌈log₂ n⌉ rows filled by the doubling recurrence in Θ(n log n). A query does ≤ LOG jumps to equalize depths and ≤ LOG joint jumps. Invariant of the joint loop: u and v are at equal depth with u ≠ v, so their LCA is strictly above them; taking every jump that keeps them different leaves them as the two children of the LCA. Total Θ((n + q) log n).",
    },
    complexity: "Θ(n log n) preprocessing, Θ(log n) per query",
    followUp: "An Euler tour turns LCA into Range Minimum Query (RMQ); with a sparse table, queries become O(1) after O(n log n) preprocessing, and Tarjan's offline LCA answers all queries in near-linear time with union-find. The same doubling table answers 'k-th ancestor' and path-aggregate queries (max edge on a path) used in network design.",
    distractors: ["if up[j][u] = up[j][v] then", "return v", "for j ← 0 to LOG do"],
    visual: "sims/tree-traversals.html",
    lesson: "lessons/14-advanced-graphs/README.md",
  });

  /* ================================================================== */
  /* Chapter 15 · Level 6 — Manacher's longest palindromic substring     */
  /* ================================================================== */
  const manacherVariant = (mode) => (S) => {
    const n = S.length, m = 2 * n + 1, T = Array(m).fill("#");
    for (let i = 0; i < n; i++) T[2 * i + 1] = S[i];
    const P = Array(m).fill(0);
    let c = 0, r = 0, best = 0, bc = 0;
    for (let i = 0; i < m; i++) {
      if (i < r) P[i] = mode === "noclamp" ? P[2 * c - i] : Math.min(r - i, P[2 * c - i]);
      while (i - P[i] - 1 >= 0 && i + P[i] + 1 < m && T[i - P[i] - 1] === T[i + P[i] + 1]) P[i]++;
      if (i + P[i] > r) { c = i; r = i + P[i]; }
      if (mode === "oddonly" && T[i] === "#") continue;
      if (mode === "rightmost" ? P[i] >= best && P[i] > 0 : P[i] > best) { best = P[i]; bc = i; }
    }
    const st = (bc - best) / 2;
    return S.slice(st, st + best);
  };
  const palRef = (S) => { let b = ""; for (let i = 0; i < S.length; i++) for (let j = i + b.length; j < S.length; j++) { let ok = true; for (let x = i, y = j; x < y; x++, y--) if (S[x] !== S[y]) { ok = false; break; } if (ok && j - i + 1 > b.length) b = S.slice(i, j + 1); } return b; };

  ForgeProblems.add({
    id: "manacher-longest-palindrome",
    title: "Longest Palindromic Substring in Linear Time (Manacher)",
    level: 6, chapter: 15, difficulty: 2,
    topics: ["strings", "palindromes", "amortized analysis", "Manacher"],
    strategy: "Reuse mirrored radii inside the rightmost palindrome (amortized linear)",
    source: "Manacher (1975) · interview classic (the O(n²) version) · Lesson 15",
    summary: "Find the longest palindromic substring in Θ(n) by reusing the mirror image of radii already computed.",
    statement: `
<p>"Expand around every center" finds the longest palindrome in Θ(n²) — fine in an interview, too slow for a genome or a log file of
millions of characters, and exactly Θ(n²) on inputs like <code>aaaa…a</code>. <b>Manacher's algorithm</b> is Θ(n): inside the rightmost
palindrome found so far, a center's radius is at least the radius of its <i>mirror</i> center (clipped at the boundary), so characters
already known to match are never compared again — the same "never move the right boundary backwards" amortization as the Z-function.</p>
<p>Write <code>LongestPalindrome(S)</code> returning the longest substring of <code>S</code> that reads the same backwards. If several have the
maximum length, return the <b>leftmost</b> one. For the empty string return <code>""</code>.</p>
<p>Tip: insert a separator between characters (<code>"abba"</code> → <code>#a#b#b#a#</code>) so even- and odd-length palindromes are both
"odd" around some center; a radius P[i] in the transformed string equals the palindrome's length in S.</p>
<ul><li>0 ≤ length(S) ≤ 2000, lowercase letters. <b>Efficiency:</b> Θ(n); the grader uses strings like <code>aaaa…a</code>.</li></ul>`,
    entry: "LongestPalindrome",
    params: ["S"],
    tests: [
      { args: ["babad"], expect: "bab", explain: "\"bab\" and \"aba\" both have length 3; the leftmost wins." },
      { args: ["cbbd"], expect: "bb", explain: "An even-length palindrome: its center lies BETWEEN two characters." },
      { args: [""], expect: "", explain: "The empty string." },
      { args: ["a"], expect: "a" },
      { args: ["forgeeksskeegfor"], expect: "geeksskeeg" },
      { args: ["cbcbab"], expect: "cbc", explain: "Around the center 'b' at index 3 the mirror radius is too optimistic: reuse it only up to the right boundary, then compare characters. Otherwise you'd report \"bcbab\", which isn't a palindrome." },
      { args: ["abacdfgdcaba"], expect: "aba", explain: "A reversed copy of the string is not the same as a palindrome: \"abacd…dcaba\" is not one." },
      { args: ["aaaaa"], expect: "aaaaa" },
      { args: ["bc"], expect: "b", explain: "Every single letter is a palindrome; the leftmost is returned." },
    ],
    random: { count: 30, gen: (r, i) => [r.word(i + 2, i % 3 ? "ab" : "abc")] },
    reference: palRef,
    growth: { metric: "steps", sizes: [64, 128, 256, 512, 1024], gen: (r, n) => { const a = Array(n).fill("a"); a[r.int(0, n - 1)] = "b"; return [a.join("")]; }, expect: "n" },
    mutants: [
      { fn: manacherVariant("oddonly"), hint: "Even-length palindromes like \"bb\" are missed. Either expand around the gaps between characters too, or insert separators (#a#b#b#a#) so every palindrome has a single center." },
      { fn: manacherVariant("rightmost"), hint: "On ties you return a later palindrome. Replace the best only when a STRICTLY longer one appears, scanning left to right, so the leftmost of the longest is kept." },
      { fn: manacherVariant("noclamp"), hint: "You return a substring that isn't a palindrome. The mirror center's radius is only guaranteed inside the current palindrome: P[i] ← min(r − i, P[mirror]), then keep expanding with real character comparisons." },
    ],
    lints: [
      { re: NESTED_FOR, lang: "pseudo", message: "If the efficiency check flagged you: expanding from scratch around every center is Θ(n²) on strings like aaaa…a. Keep the rightmost palindrome (center c, right edge r) and start each new radius from its mirror's radius min(r − i, P[2c − i])." },
    ],
    hints: [
      "Suppose you already know a long palindrome centered at c that reaches position r. For a center i inside it, what does the mirror position 2c − i already tell you about i's palindrome?",
      "Build T = # S[0] # S[1] # … # (length 2n + 1) and a radius array P. Keep c and r (center and right edge of the palindrome reaching furthest right). For each i: start from the mirror's radius if i < r, expand while characters match, then update c, r and the best.",
      "P[i] ← min(r − i, P[2c − i]) when i < r. Expand while i − P[i] − 1 ≥ 0, i + P[i] + 1 < m and T[i − P[i] − 1] = T[i + P[i] + 1]. The answer starts at (bestCenter − best) div 2 in S and has length best.",
    ],
    starter: {
      pseudo: `ALGORITHM LongestPalindrome(S)
    n ← length(S)
    m ← 2 * n + 1
    T ← array(m, "#")
    for i ← 0 to n - 1 do
        T[2 * i + 1] ← S[i]
    P ← array(m, 0)
    c ← 0
    r ← 0
    ...`,
      js: `function LongestPalindrome(S) {
  // Manacher: transform with separators, reuse mirrored radii
}`,
    },
    solution: {
      pseudo: `ALGORITHM LongestPalindrome(S)
    n ← length(S)
    m ← 2 * n + 1
    T ← array(m, "#")
    for i ← 0 to n - 1 do
        T[2 * i + 1] ← S[i]
    P ← array(m, 0)
    c ← 0
    r ← 0
    best ← 0
    bestC ← 0
    for i ← 0 to m - 1 do
        if i < r then
            P[i] ← min(r - i, P[2 * c - i])
        while i - P[i] - 1 ≥ 0 and i + P[i] + 1 < m and T[i - P[i] - 1] = T[i + P[i] + 1] do
            P[i] ← P[i] + 1
        if i + P[i] > r then
            c ← i
            r ← i + P[i]
        if P[i] > best then
            best ← P[i]
            bestC ← i
    start ← (bestC - best) div 2
    return S[start..start + best - 1]`,
      js: `function LongestPalindrome(S) {
  const n = S.length, m = 2 * n + 1, T = Array(m).fill("#");
  for (let i = 0; i < n; i++) T[2 * i + 1] = S[i];
  const P = Array(m).fill(0);
  let c = 0, r = 0, best = 0, bestC = 0;
  for (let i = 0; i < m; i++) {
    if (i < r) P[i] = Math.min(r - i, P[2 * c - i]);
    while (i - P[i] - 1 >= 0 && i + P[i] + 1 < m && T[i - P[i] - 1] === T[i + P[i] + 1]) P[i]++;
    if (i + P[i] > r) { c = i; r = i + P[i]; }
    if (P[i] > best) { best = P[i]; bestC = i; }
  }
  const start = (bestC - best) / 2;
  return S.slice(start, start + best);
}`,
      python: `def longest_palindrome(S):
    T = "#" + "#".join(S) + "#" if S else "#"
    m = len(T); P = [0] * m
    c = r = best = best_c = 0
    for i in range(m):
        if i < r:
            P[i] = min(r - i, P[2 * c - i])
        while i - P[i] - 1 >= 0 and i + P[i] + 1 < m and T[i - P[i] - 1] == T[i + P[i] + 1]:
            P[i] += 1
        if i + P[i] > r:
            c, r = i, i + P[i]
        if P[i] > best:
            best, best_c = P[i], i
    start = (best_c - best) // 2
    return S[start:start + best]`,
      explain: "Every successful comparison in the while loop pushes the right edge r one step further right (a comparison inside [i, r) is never needed: the mirror already answered it), and r only grows up to m. So there are at most m successful and m failing comparisons: Θ(n) in total, even on aaaa…a where expand-around-center does n²/4.",
    },
    complexity: "Θ(n) time, Θ(n) extra space",
    followUp: "The same radius array answers 'is S[l..r] a palindrome?' in O(1) and counts all palindromic substrings (Σ ⌈P[i]/2⌉). A palindromic tree (eertree) goes further and lists every distinct palindrome in linear time — used in bioinformatics to find hairpin structures in DNA.",
    distractors: ["P[i] ← P[2 * c - i]", "if P[i] ≥ best then", "start ← bestC - best"],
    visual: "sims/string-match.html",
    lesson: "lessons/15-dp-and-interview-patterns/README.md",
  });

  /* ================================================================== */
  /* Chapter 15 · Level 6 — Suffix array (prefix doubling) + Kasai LCP   */
  /* ================================================================== */
  const lrsRef = (S) => {
    const n = S.length;
    for (let L = n - 1; L >= 1; L--) {
      const seen = new Set(), c = [];
      for (let i = 0; i + L <= n; i++) { const t = S.slice(i, i + L); if (seen.has(t)) c.push(t); seen.add(t); }
      if (c.length) return c.sort()[0];
    }
    return "";
  };
  const lrsLeftmost = (S) => {
    const n = S.length;
    for (let L = n - 1; L >= 1; L--) for (let i = 0; i + L <= n; i++) { const t = S.slice(i, i + L); if (S.indexOf(t, i + 1) !== -1) return t; }
    return "";
  };
  const lrsNonOverlap = (S) => {
    const n = S.length;
    for (let L = Math.floor(n / 2); L >= 1; L--) { const c = []; for (let i = 0; i + L <= n; i++) { const t = S.slice(i, i + L); if (S.indexOf(t, i + L) !== -1) c.push(t); } if (c.length) return c.sort()[0]; }
    return "";
  };
  const lrsTextNeighbors = (S) => { let best = ""; for (let i = 0; i + 1 < S.length; i++) { let h = 0; while (i + 1 + h < S.length && S[i + h] === S[i + 1 + h]) h++; const t = S.slice(i, i + h); if (t.length > best.length || (t.length === best.length && t < best)) best = t; } return best; };
  const periodicWord = (r, n) => { const b = r.word(8, "ab"); let w = ""; while (w.length < n) w += b; const a = w.slice(0, n).split(""); a[r.int(0, n - 1)] = "c"; return a.join(""); };

  ForgeProblems.add({
    id: "suffix-array-lrs",
    title: "Longest Repeated Substring via Suffix Array + LCP",
    level: 6, chapter: 15, difficulty: 3,
    topics: ["strings", "suffix array", "prefix doubling", "LCP array", "Kasai"],
    strategy: "Suffix array by prefix doubling (rank pairs), then Kasai's linear-time Longest Common Prefix (LCP) array",
    source: "Manber & Myers (1990), prefix doubling · Kasai et al. (2001), linear-time LCP · Lesson 15",
    summary: "Build a suffix array by prefix doubling, compute the Longest Common Prefix (LCP) array with Kasai's algorithm, and read off the longest repeated substring.",
    statement: `
<p>A <b>suffix array</b> lists the starting positions of all suffixes of S in sorted order. Together with the <b>Longest Common Prefix (LCP)</b>
array (lcp[t] = length of the common prefix of the suffixes at sa[t − 1] and sa[t]) it answers many string questions: full-text search
in O(m log n), counting distinct substrings, and the <b>longest repeated substring</b> — the maximum of the LCP array, because two occurrences
of the same substring start two suffixes that end up next to each other in sorted order.</p>
<p>Write <code>LongestRepeat(S)</code>: return the longest substring that occurs <b>at least twice</b> in S (occurrences may overlap). If several have
the maximum length, return the <b>alphabetically smallest</b>; if no character repeats, return <code>""</code>.</p>
<p>Build it the expert way:</p>
<ul>
<li><b>Prefix doubling</b>: rank suffixes by their first character; then repeatedly sort by the pair (rank[i], rank[i + k]) (−1 if i + k ≥ n),
re-rank, and double k — after round k the ranks order the suffixes by their first 2k characters. Stop when all ranks differ.</li>
<li><b>Kasai</b>: visit suffixes in TEXT order; the LCP with the suffix just before it in sorted order drops by at most 1 from one i to the next, so
the total work is linear.</li>
</ul>
<ul><li>0 ≤ length(S) ≤ 600, lowercase letters. <b>Efficiency:</b> O(n log² n) with a comparison sort per round is fine; comparing all pairs of
positions (Θ(n²) or worse) is flagged. The grader uses highly repetitive strings, where naive LCP computation is quadratic.</li></ul>`,
    entry: "LongestRepeat",
    params: ["S"],
    tests: [
      { args: ["banana"], expect: "ana", explain: "\"ana\" occurs at positions 1 and 3 — the occurrences overlap, which is allowed." },
      { args: ["abcd"], expect: "", explain: "No character repeats." },
      { args: ["aaaa"], expect: "aaa", explain: "Suffixes aaaa and aaa share 3 characters: \"aaa\" occurs at 0 and at 1." },
      { args: ["xyzxyzabcabc"], expect: "abc", explain: "\"xyz\" and \"abc\" both repeat with length 3; the alphabetically smallest is returned. In suffix-array order it is simply the FIRST maximum of the LCP array." },
      { args: ["mississippi"], expect: "issi", explain: "Positions 1 and 4, overlapping in the middle 'i'." },
      { args: [""], expect: "" },
      { args: ["a"], expect: "" },
      { args: ["abracadabra"], expect: "abra" },
      { args: ["abcab"], expect: "ab", explain: "The two copies of \"ab\" are NOT neighbors in the text — they are neighbors in the sorted list of suffixes (ab, abcab)." },
    ],
    random: { count: 30, gen: (r, i) => [r.word(i + 2, i % 3 ? "ab" : "abc")] },
    reference: lrsRef,
    growth: { metric: "steps", sizes: [32, 64, 128, 256, 512], gen: (r, n) => [periodicWord(r, n)], expect: "n log n", maxSteps: 3000000 },
    mutants: [
      { fn: lrsLeftmost, hint: "On ties you return the repeat that appears first in the text. The rule is the alphabetically smallest — in the suffix array that is the FIRST position t (in sorted order) where lcp[t] reaches the maximum; replace only on a strictly larger lcp." },
      { fn: lrsNonOverlap, hint: "Your repeats never overlap (for \"aaaa\" you return \"aa\"). Overlapping occurrences count: the LCP of the suffixes aaaa and aaa is 3." },
      { fn: lrsTextNeighbors, hint: "You compare each suffix with the NEXT POSITION in the text. The two copies of a repeat can be far apart in the text; they become neighbors only in SORTED suffix order — compare sa[t − 1] with sa[t]." },
    ],
    lints: [
      { re: NESTED_FOR, lang: "pseudo", message: "If the efficiency check flagged you: comparing every pair of positions is Θ(n²) pairs times the match length. Sort the suffixes (prefix doubling) and only compare neighbors in sorted order — with Kasai's trick those comparisons total Θ(n)." },
    ],
    hints: [
      "If a substring occurs twice, the two suffixes that start with it share that prefix. After sorting all suffixes, where do such suffixes end up relative to each other?",
      "Prefix doubling: rank[i] ← ord(S[i]); repeat { sort triples [rank[i], rank[i + k] or −1, i]; walk the sorted list giving equal pairs equal new ranks; k ← 2k } until the ranks are 0..n−1. The last sorted order is the suffix array sa, and rank is its inverse.",
      "Kasai: h ← 0; for i ← 0 to n − 1: if rank[i] > 0 then j ← sa[rank[i] − 1], extend h while S[i + h] = S[j + h], store lcp[rank[i]] ← h, and decrease h by 1 (if > 0); else h ← 0. The answer is S[sa[t]..sa[t] + lcp[t] − 1] for the first t with the largest lcp.",
    ],
    starter: {
      pseudo: `ALGORITHM LongestRepeat(S)
    n ← length(S)
    if n < 2 then
        return ""
    rank ← array(n, 0)
    for i ← 0 to n - 1 do
        rank[i] ← ord(S[i])
    k ← 1
    repeat
        ...
    until r = n - 1
    return Kasai(S, sa, rank)

ALGORITHM Kasai(S, sa, rank)
    ...`,
      js: `function LongestRepeat(S) {
  // suffix array by prefix doubling, then Kasai's LCP
}`,
    },
    solution: {
      pseudo: `ALGORITHM LongestRepeat(S)
    n ← length(S)
    if n < 2 then
        return ""
    rank ← array(n, 0)
    for i ← 0 to n - 1 do
        rank[i] ← ord(S[i])
    k ← 1
    repeat
        T ← []
        for i ← 0 to n - 1 do
            second ← -1
            if i + k < n then
                second ← rank[i + k]
            append(T, [rank[i], second, i])
        T ← sorted(T)
        sa ← array(n, 0)
        r ← 0
        for j ← 0 to n - 1 do
            if j > 0 and (T[j][0] ≠ T[j - 1][0] or T[j][1] ≠ T[j - 1][1]) then
                r ← r + 1
            sa[j] ← T[j][2]
            rank[T[j][2]] ← r
        k ← 2 * k
    until r = n - 1
    return Kasai(S, sa, rank)

ALGORITHM Kasai(S, sa, rank)
    n ← length(S)
    lcp ← array(n, 0)
    h ← 0
    for i ← 0 to n - 1 do
        if rank[i] > 0 then
            j ← sa[rank[i] - 1]
            while i + h < n and j + h < n and S[i + h] = S[j + h] do
                h ← h + 1
            lcp[rank[i]] ← h
            if h > 0 then
                h ← h - 1
        else
            h ← 0
    best ← 0
    at ← 0
    for t ← 1 to n - 1 do
        if lcp[t] > best then
            best ← lcp[t]
            at ← sa[t]
    return S[at..at + best - 1]`,
      js: `function LongestRepeat(S) {
  const n = S.length;
  if (n < 2) return "";
  let rank = [...S].map((ch) => ch.charCodeAt(0)), sa = [];
  for (let k = 1; ; k *= 2) {
    const key = (i) => [rank[i], i + k < n ? rank[i + k] : -1];
    sa = [...Array(n).keys()].sort((a, b) => key(a)[0] - key(b)[0] || key(a)[1] - key(b)[1]);
    const nr = Array(n).fill(0);
    for (let t = 1; t < n; t++) { const [a0, a1] = key(sa[t - 1]), [b0, b1] = key(sa[t]); nr[sa[t]] = nr[sa[t - 1]] + (a0 !== b0 || a1 !== b1 ? 1 : 0); }
    rank = nr;
    if (rank[sa[n - 1]] === n - 1) break;
  }
  let h = 0, best = 0, at = 0;
  const lcp = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    if (rank[i] > 0) {
      const j = sa[rank[i] - 1];
      while (i + h < n && j + h < n && S[i + h] === S[j + h]) h++;
      lcp[rank[i]] = h;
      if (h > 0) h--;
    } else h = 0;
  }
  for (let t = 1; t < n; t++) if (lcp[t] > best) { best = lcp[t]; at = sa[t]; }
  return S.slice(at, at + best);
}`,
      python: `def longest_repeat(S):
    n = len(S)
    if n < 2:
        return ""
    rank, k = [ord(c) for c in S], 1
    while True:
        key = lambda i: (rank[i], rank[i + k] if i + k < n else -1)
        sa = sorted(range(n), key=key)
        new = [0] * n
        for t in range(1, n):
            new[sa[t]] = new[sa[t - 1]] + (key(sa[t]) != key(sa[t - 1]))
        rank, k = new, 2 * k
        if rank[sa[-1]] == n - 1:
            break
    lcp, h = [0] * n, 0
    for i in range(n):
        if rank[i] > 0:
            j = sa[rank[i] - 1]
            while i + h < n and j + h < n and S[i + h] == S[j + h]:
                h += 1
            lcp[rank[i]] = h
            h = max(h - 1, 0)
        else:
            h = 0
    t = max(range(n), key=lambda t: (lcp[t], -t))
    return S[sa[t]:sa[t] + lcp[t]]`,
      explain: "Prefix doubling needs ⌈log₂ n⌉ rounds, each a Θ(n log n) sort of rank pairs: Θ(n log² n) (radix-sorting the pairs gives Θ(n log n)). Kasai is Θ(n): h decreases by at most 1 per step and never exceeds n, so the while loop runs at most 2n times overall. Correctness: the longest repeated substring is the longest common prefix of two suffixes, and the longest such prefix is always achieved by two suffixes that are adjacent in sorted order.",
    },
    complexity: "Θ(n log² n) suffix array (comparison sort), Θ(n) LCP",
    followUp: "SA-IS and DC3 build suffix arrays in Θ(n). The Burrows–Wheeler Transform (BWT) behind bzip2 and the FM-index behind DNA aligners (BWA, Bowtie) are read straight off the suffix array; search engines and code-search tools use suffix arrays for substring queries that inverted indexes can't answer.",
    distractors: ["if lcp[t] ≥ best then", "j ← sa[rank[i] + 1]", "lcp[i] ← h"],
    visual: "sims/string-match.html",
    lesson: "lessons/15-dp-and-interview-patterns/README.md",
  });

  /* ================================================================== */
  /* Chapter 10 · Level 6 — Hungarian algorithm for the assignment problem */
  /* ================================================================== */
  const assignBrute = (C) => {
    const n = C.length; let best = Infinity; const used = Array(n).fill(false);
    const go = (i, acc) => { if (i === n) { best = Math.min(best, acc); return; } for (let j = 0; j < n; j++) if (!used[j]) { used[j] = true; go(i + 1, acc + C[i][j]); used[j] = false; } };
    go(0, 0);
    return n ? best : 0;
  };
  const assignGreedy = (C) => { const n = C.length, used = Array(n).fill(false); let t = 0; for (let i = 0; i < n; i++) { let bj = -1; for (let j = 0; j < n; j++) if (!used[j] && (bj < 0 || C[i][j] < C[i][bj])) bj = j; used[bj] = true; t += C[i][bj]; } return t; };
  const rowMinSum = (C) => C.reduce((a, row) => a + Math.min(...row), 0);
  const reductionBound = (C) => { const R = C.map((row) => { const m = Math.min(...row); return row.map((x) => x - m); }); let t = rowMinSum(C); for (let j = 0; j < C.length; j++) t += Math.min(...R.map((row) => row[j])); return t; };
  const costMatrix = (r, n, lo, hi) => Array.from({ length: n }, () => r.array(n, lo, hi));

  ForgeProblems.add({
    id: "hungarian-assignment",
    title: "Assignment Problem in Θ(n³): the Hungarian Algorithm",
    level: 6, chapter: 10, difficulty: 3,
    topics: ["assignment problem", "Hungarian algorithm", "linear programming duality", "augmenting paths", "iterative improvement"],
    strategy: "Primal–dual iterative improvement: keep feasible potentials, grow the matching by shortest augmenting paths",
    source: "Kuhn (1955), Munkres (1957) · Levitin §3.4 (assignment by exhaustive search) and §10.4 (augmenting paths) · Lesson 10",
    summary: "Find the minimum-cost assignment of n workers to n jobs in Θ(n³) instead of trying all n! permutations.",
    statement: `
<p>Levitin solves the assignment problem by exhaustive search over all n! permutations (Levitin §3.4) and by branch-and-bound (§12.2), then remarks
that a much better algorithm exists. That algorithm is the <b>Hungarian method</b>: Θ(n³), so n = 1000 takes about a second instead of longer
than the age of the universe. It is iterative improvement in the style of Chapter 10 (Levitin §10.4 grows matchings by augmenting paths): keep
<b>potentials</b> u[i] (rows) and v[j] (columns) with u[i] + v[j] ≤ C[i][j] for all i, j; an edge is "tight" when equality holds. Add rows one
at a time, each time finding a shortest augmenting path in reduced costs C[i][j] − u[i] − v[j] and shifting potentials by the smallest slack
(a Dijkstra-like search). When every row is matched along tight edges, the matching is optimal by linear programming duality.</p>
<p>Write <code>Hungarian(C)</code>: <code>C</code> is an n × n cost matrix given as a list of rows (<code>C[i][j]</code> = cost of giving job j to
worker i). Return the <b>minimum total cost</b> of a perfect assignment (each worker gets exactly one job and vice versa).</p>
<ul><li>0 ≤ n ≤ 64, integer costs in [−1000, 1000]. For n = 0 return 0. <b>Efficiency:</b> Θ(n³). Trying all permutations (n!), or
bitmask dynamic programming (n · 2ⁿ), is flagged by the growth check up to n = 64.</li></ul>`,
    entry: "Hungarian",
    params: ["C"],
    tests: [
      { args: [[[9, 2, 7, 8], [6, 4, 3, 7], [5, 8, 1, 8], [7, 6, 9, 4]]], expect: 13, explain: "Levitin's §3.4 example: worker 0 → job 1 (2), worker 1 → job 0 (6), worker 2 → job 2 (1), worker 3 → job 3 (4): 2 + 6 + 1 + 4 = 13." },
      { args: [[[5]]], expect: 5, explain: "One worker, one job." },
      { args: [[[1, 2], [1, 100]]], expect: 3, explain: "Both workers prefer job 0 (cost 1). Greedy gives worker 0 job 0 and leaves worker 1 with 100; optimal is worker 0 → job 1 (2) and worker 1 → job 0 (1)." },
      { args: [[]], expect: 0, explain: "No workers: cost 0." },
      { args: [[[4, 1, 3], [2, 0, 5], [3, 2, 2]]], expect: 5, explain: "Adding each row's minimum (1 + 0 + 2 = 3) is only a lower bound: two rows want column 1." },
      { args: [[[-5, 3, 0], [2, -4, 1], [0, 0, -1]]], expect: -10, explain: "Negative costs (think: profits) work too: −5 − 4 − 1." },
      { args: [[[7, 7, 7], [7, 7, 7], [7, 7, 7]]], expect: 21, explain: "All assignments cost the same." },
      { args: [[[10, 19, 8, 15], [10, 18, 7, 17], [13, 16, 9, 14], [12, 19, 8, 18]]], expect: 49 },
      { args: [[[3, 8, 2, 10, 3], [8, 7, 2, 9, 7], [6, 4, 2, 7, 5], [8, 4, 2, 3, 5], [9, 10, 6, 9, 10]]], expect: 21 },
    ],
    random: { count: 25, gen: (r, i) => [costMatrix(r, 1 + (i % 7), i % 4 === 3 ? -20 : 0, 40)] },
    reference: assignBrute,
    growth: { metric: "steps", sizes: [4, 8, 16, 32, 64], gen: (r, n) => [costMatrix(r, n, 0, 999)], expect: "n^3", maxSteps: 2000000 },
    mutants: [
      { fn: assignGreedy, hint: "This looks greedy: each worker grabs the cheapest job still free. An early cheap choice can force a later worker into a terrible job. The Hungarian method may re-assign earlier workers along an augmenting path when a new row is added." },
      { fn: rowMinSum, hint: "You return the sum of the row minima — a LOWER bound (it's the bound branch-and-bound uses, Levitin §12.2), not an assignment: two workers may want the same job." },
      { fn: reductionBound, hint: "You stop after reducing rows and columns. That total is still only a lower bound; you must keep improving (shift potentials, find augmenting paths along zero-cost edges) until every worker is matched on a tight edge." },
    ],
    lints: [
      { re: "used\\[\\w+\\]\\s*←\\s*false|[Pp]ermut|2\\s*\\^\\s*n\\b", lang: "pseudo", message: "If the efficiency check flagged you: exhaustive search (n!) or bitmask DP (n·2ⁿ) cannot reach n = 64. Keep dual potentials u, v and add one row at a time with a shortest augmenting path — Θ(n²) per row." },
    ],
    hints: [
      "Subtracting a constant from a whole row (or column) changes every assignment's cost by the same amount, so the optimal assignment doesn't change. After such reductions, what would it mean to find an assignment using only zero-cost cells?",
      "Keep potentials u[1..n], v[0..n] and p[j] = the row matched to column j (p[0] is a helper for the row being added). For each new row i: run a Dijkstra-like search over columns using reduced costs C − u − v, keeping minv[j] (best slack) and way[j] (previous column on the path), until you reach a free column.",
      "Inside the search: mark column j0 used; relax every unused column j with cur = C[p[j0]][j] − u[p[j0]] − v[j]; pick the unused j1 with the smallest minv as delta; then add delta to u of rows on the path, subtract it from v of used columns, subtract it from minv of the others. Finally flip the path by following way[] back to column 0.",
    ],
    starter: {
      pseudo: `ALGORITHM Hungarian(C)
    // C = n × n list of rows; return the minimum total assignment cost
    n ← length(C)
    u ← array(n + 1, 0)
    v ← array(n + 1, 0)
    p ← array(n + 1, 0)
    way ← array(n + 1, 0)
    for i ← 1 to n do
        ...
    total ← 0
    for j ← 1 to n do
        total ← total + C[p[j] - 1][j - 1]
    return total`,
      js: `function Hungarian(C) {
  const n = C.length;
  // potentials u, v; p[j] = row matched to column j (1-based)
}`,
    },
    solution: {
      pseudo: `ALGORITHM Hungarian(C)
    n ← length(C)
    u ← array(n + 1, 0)
    v ← array(n + 1, 0)
    p ← array(n + 1, 0)
    way ← array(n + 1, 0)
    for i ← 1 to n do
        p[0] ← i
        j0 ← 0
        minv ← array(n + 1, ∞)
        used ← array(n + 1, false)
        repeat
            used[j0] ← true
            i0 ← p[j0]
            delta ← ∞
            j1 ← 0
            for j ← 1 to n do
                if not used[j] then
                    cur ← C[i0 - 1][j - 1] - u[i0] - v[j]
                    if cur < minv[j] then
                        minv[j] ← cur
                        way[j] ← j0
                    if minv[j] < delta then
                        delta ← minv[j]
                        j1 ← j
            for j ← 0 to n do
                if used[j] then
                    u[p[j]] ← u[p[j]] + delta
                    v[j] ← v[j] - delta
                else
                    minv[j] ← minv[j] - delta
            j0 ← j1
        until p[j0] = 0
        repeat
            j1 ← way[j0]
            p[j0] ← p[j1]
            j0 ← j1
        until j0 = 0
    total ← 0
    for j ← 1 to n do
        total ← total + C[p[j] - 1][j - 1]
    return total`,
      js: `function Hungarian(C) {
  const n = C.length, INF = Infinity;
  const u = Array(n + 1).fill(0), v = Array(n + 1).fill(0), p = Array(n + 1).fill(0), way = Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = Array(n + 1).fill(INF), used = Array(n + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = INF, j1 = 0;
      for (let j = 1; j <= n; j++) {
        if (used[j]) continue;
        const cur = C[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= n; j++) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0 !== 0);
  }
  let total = 0;
  for (let j = 1; j <= n; j++) total += C[p[j] - 1][j - 1];
  return total;
}`,
      python: `def hungarian(C):
    n = len(C); INF = float("inf")
    u = [0] * (n + 1); v = [0] * (n + 1); p = [0] * (n + 1); way = [0] * (n + 1)
    for i in range(1, n + 1):
        p[0] = i; j0 = 0
        minv = [INF] * (n + 1); used = [False] * (n + 1)
        while True:
            used[j0] = True
            i0, delta, j1 = p[j0], INF, 0
            for j in range(1, n + 1):
                if not used[j]:
                    cur = C[i0 - 1][j - 1] - u[i0] - v[j]
                    if cur < minv[j]: minv[j], way[j] = cur, j0
                    if minv[j] < delta: delta, j1 = minv[j], j
            for j in range(n + 1):
                if used[j]: u[p[j]] += delta; v[j] -= delta
                else: minv[j] -= delta
            j0 = j1
            if p[j0] == 0: break
        while j0:
            j1 = way[j0]; p[j0] = p[j1]; j0 = j1
    return sum(C[p[j] - 1][j - 1] for j in range(1, n + 1))
    # (scipy.optimize.linear_sum_assignment does this in C)`,
      explain: "Adding row i runs at most i iterations of the inner search (each marks one more column used), each Θ(n): Θ(n²) per row, Θ(n³) total. Invariant: u[i] + v[j] ≤ C[i][j] everywhere and matched pairs are tight, so the matching's cost equals Σu + Σv, the value of a feasible dual solution — by weak duality no assignment can cost less.",
    },
    complexity: "Θ(n³) time, Θ(n) extra space besides the matrix",
    followUp: "Rectangular problems (more jobs than workers) work the same with n ≤ m. Production uses: ride-hailing dispatch, matching detections to tracks in multi-object tracking (the SORT — Simple Online and Realtime Tracking — tracker), register allocation and instruction scheduling heuristics; SciPy's linear_sum_assignment uses the closely related Jonker–Volgenant algorithm. For huge sparse instances, auction algorithms parallelize well.",
    distractors: ["if minv[j] > delta then", "v[j] ← v[j] + delta", "until p[j0] ≠ 0"],
    visual: "sims/bipartite-matching.html",
    lesson: "lessons/10-iterative-improvement/README.md",
  });

  /* ================================================================== */
  /* Chapter 13 · Level 6 — Aho–Corasick multi-pattern counting          */
  /* ================================================================== */
  const acVariant = (mode) => (text, P) => {
    const nxt = [new Map()], fail = [0], hits = [0], endAt = [];
    for (const pat of P) {
      let st = 0;
      for (const ch of pat) { if (!nxt[st].has(ch)) { nxt.push(new Map()); fail.push(0); hits.push(0); nxt[st].set(ch, nxt.length - 1); } st = nxt[st].get(ch); }
      endAt.push(st);
    }
    const order = [0];
    for (let i = 0; i < order.length; i++) {
      const u = order[i];
      for (const [ch, w] of nxt[u]) {
        order.push(w);
        if (u > 0) { let f = fail[u]; while (f > 0 && !nxt[f].has(ch)) f = fail[f]; if (nxt[f].has(ch)) fail[w] = nxt[f].get(ch); }
      }
    }
    let st = 0;
    for (const ch of text) {
      if (mode === "reset") { if (!nxt[st].has(ch)) st = 0; }
      else while (st > 0 && !nxt[st].has(ch)) st = fail[st];
      if (nxt[st].has(ch)) st = nxt[st].get(ch);
      hits[st]++;
    }
    if (mode !== "nooutput") for (let i = order.length - 1; i >= 1; i--) hits[fail[order[i]]] += hits[order[i]];
    return endAt.map((e) => hits[e]);
  };
  const acRef = (text, P) => P.map((pat) => { let c = 0; for (let i = text.indexOf(pat); i !== -1; i = text.indexOf(pat, i + 1)) c++; return c; });
  const acNonOverlap = (text, P) => P.map((pat) => { let c = 0; for (let i = text.indexOf(pat); i !== -1; i = text.indexOf(pat, i + pat.length)) c++; return c; });
  const acGen = (r, n, k, alpha) => [r.word(n, alpha), Array.from({ length: k }, () => r.word(r.int(1, 4), alpha))];

  ForgeProblems.add({
    id: "aho-corasick-counts",
    title: "Aho–Corasick: Count Many Patterns in One Pass",
    level: 6, chapter: 13, difficulty: 3,
    topics: ["strings", "trie", "automata", "Aho–Corasick", "Breadth-First Search"],
    strategy: "Trie + failure links (a Knuth–Morris–Pratt (KMP) automaton for a whole dictionary), then sum hits along failure links",
    source: "Aho & Corasick (1975) · Levitin §7.2 (KMP-style shifts) · Lesson 13, Build Card 5 (tries)",
    summary: "Count the (overlapping) occurrences of every pattern in a text with one pass of an Aho–Corasick automaton.",
    statement: `
<p>Virus scanners, intrusion-detection systems (Snort), <code>grep -F</code> with many words, and content filters search a stream for
<b>thousands of patterns at once</b>. Running Knuth–Morris–Pratt (KMP) once per pattern costs Θ(k · n) for k patterns. <b>Aho–Corasick</b> builds a
trie of all patterns plus <b>failure links</b> (for each trie node, the longest proper suffix of its string that is also a trie node — KMP's
prefix function, generalized to a trie) and then reads the text <b>once</b>.</p>
<p>Write <code>MultiCount(text, P)</code>: return a list <code>counts</code> where <code>counts[i]</code> is the number of (possibly overlapping)
occurrences of <code>P[i]</code> in <code>text</code>. Patterns are non-empty and may repeat.</p>
<p>Counting efficiently: while scanning, add 1 to a <code>hits</code> counter of the automaton state you are in after each character. A pattern
ending at that position may also be a <i>suffix</i> of the current state's string (e.g. "he" inside "she"), so afterwards push the counts
down the failure links, deepest states first (reverse Breadth-First Search (BFS) order): <code>hits[fail[u]] += hits[u]</code>. Then
<code>counts[i] = hits[end state of P[i]]</code>.</p>
<ul><li>0 ≤ length(text) ≤ 2000, 1 ≤ k ≤ 400 patterns, total pattern length ≤ 2000, lowercase letters. <b>Efficiency:</b> Θ(n + total pattern length);
scanning the text once per pattern is flagged.</li></ul>`,
    entry: "MultiCount",
    params: ["text", "P"],
    tests: [
      { args: ["ushers", ["he", "she", "his", "hers"]], expect: [1, 1, 0, 1], explain: "The example from Aho and Corasick's paper: u-S-H-E-R-S contains \"she\", \"he\" (a suffix of \"she\") and \"hers\"." },
      { args: ["aaaa", ["a", "aa", "aaa"]], expect: [4, 3, 2], explain: "Overlapping occurrences all count: \"aa\" starts at 0, 1 and 2." },
      { args: ["", ["a"]], expect: [0], explain: "An empty text contains nothing." },
      { args: ["aaab", ["aab"]], expect: [1], explain: "After reading \"aaa\" the automaton must fall back from \"aa\" to \"a\" (its failure link), not to the root, or the match starting at index 1 is lost." },
      { args: ["she", ["she", "he", "e"]], expect: [1, 1, 1], explain: "All three end at the last character. The scan sits in state \"she\"; \"he\" and \"e\" are only reached through failure links." },
      { args: ["abcabc", ["abc", "bc", "c", "abcd"]], expect: [2, 2, 2, 0] },
      { args: ["abab", ["ab", "ab", "b"]], expect: [2, 2, 2], explain: "Duplicate patterns share one trie node, so they get the same count." },
      { args: ["mississippi", ["issi", "ss", "i", "ppi", "sip"]], expect: [2, 2, 4, 1, 1] },
    ],
    random: { count: 30, gen: (r, i) => acGen(r, 2 * i, 1 + (i % 6), i % 2 ? "ab" : "abc") },
    reference: acRef,
    growth: { metric: "steps", sizes: [64, 128, 256, 512, 1024], gen: (r, n) => acGen(r, n, n / 8, "ab").map((x, j) => (j === 1 ? x.map((w) => w + r.word(2, "ab")) : x)), expect: "n" },
    mutants: [
      { fn: acVariant("nooutput"), hint: "Patterns that are suffixes of other patterns (\"he\" inside \"she\") are undercounted. A hit in state u is also a hit for every state on u's failure chain: after the scan, add hits[u] into hits[fail[u]], deepest states first." },
      { fn: acVariant("reset"), hint: "On a mismatch you jump back to the root, losing the part of the current match that could start another match (text \"aaab\", pattern \"aab\"). Follow failure links instead: while s > 0 and s has no edge for ch, s ← fail[s]." },
      { fn: acNonOverlap, hint: "Overlapping occurrences are missing (\"aa\" occurs 3 times in \"aaaa\"). Never skip ahead after a match — the automaton simply continues from its current state." },
    ],
    lints: [
      { re: NESTED_FOR, lang: "pseudo", message: "If the efficiency check flagged you: scanning the text once per pattern is Θ(k · n). Build one automaton for all patterns (trie + failure links) and read the text a single time." },
    ],
    hints: [
      "In KMP, when the next character doesn't match, you fall back to the longest proper suffix of what you've matched that is still a prefix of the pattern. With many patterns stored in a trie, what's the analogous fallback for a trie node?",
      "Three phases: (1) insert every pattern into a trie (nxt[s] = map from character to child) and remember its end state; (2) BFS from the root to set fail[child]: start from f = fail[parent], follow fail links until f has an edge for the character (or f is the root), and take that edge if it exists; (3) scan the text, counting hits per state.",
      "Scan: while s > 0 and not contains(nxt[s], ch) do s ← fail[s]; if contains(nxt[s], ch) then s ← nxt[s][ch]; hits[s] ← hits[s] + 1. Finally, for the BFS order reversed (skipping the root): hits[fail[u]] ← hits[fail[u]] + hits[u].",
    ],
    starter: {
      pseudo: `ALGORITHM MultiCount(text, P[0..k-1])
    nxt ← [map()]
    fail ← [0]
    hits ← [0]
    endAt ← array(k, 0)
    for p ← 0 to k - 1 do
        s ← 0
        for each ch in P[p] do
            ...
        endAt[p] ← s
    ...
    return counts`,
      js: `function MultiCount(text, P) {
  // trie + failure links + hits pushed along failure links
}`,
    },
    solution: {
      pseudo: `ALGORITHM MultiCount(text, P[0..k-1])
    nxt ← [map()]
    fail ← [0]
    hits ← [0]
    endAt ← array(k, 0)
    for p ← 0 to k - 1 do
        s ← 0
        for each ch in P[p] do
            if not contains(nxt[s], ch) then
                append(nxt, map())
                append(fail, 0)
                append(hits, 0)
                nxt[s][ch] ← length(nxt) - 1
            s ← nxt[s][ch]
        endAt[p] ← s
    order ← [0]
    i ← 0
    while i < length(order) do
        u ← order[i]
        i ← i + 1
        for each ch in keys(nxt[u]) do
            w ← nxt[u][ch]
            append(order, w)
            if u > 0 then
                f ← fail[u]
                while f > 0 and not contains(nxt[f], ch) do
                    f ← fail[f]
                if contains(nxt[f], ch) then
                    fail[w] ← nxt[f][ch]
    s ← 0
    for each ch in text do
        while s > 0 and not contains(nxt[s], ch) do
            s ← fail[s]
        if contains(nxt[s], ch) then
            s ← nxt[s][ch]
        hits[s] ← hits[s] + 1
    for i ← length(order) - 1 downto 1 do
        u ← order[i]
        hits[fail[u]] ← hits[fail[u]] + hits[u]
    counts ← array(k, 0)
    for p ← 0 to k - 1 do
        counts[p] ← hits[endAt[p]]
    return counts`,
      js: `function MultiCount(text, P) {
  const nxt = [new Map()], fail = [0], hits = [0], endAt = [];
  for (const pat of P) {
    let s = 0;
    for (const ch of pat) {
      if (!nxt[s].has(ch)) { nxt.push(new Map()); fail.push(0); hits.push(0); nxt[s].set(ch, nxt.length - 1); }
      s = nxt[s].get(ch);
    }
    endAt.push(s);
  }
  const order = [0];
  for (let i = 0; i < order.length; i++) {
    const u = order[i];
    for (const [ch, w] of nxt[u]) {
      order.push(w);
      if (u > 0) {
        let f = fail[u];
        while (f > 0 && !nxt[f].has(ch)) f = fail[f];
        if (nxt[f].has(ch)) fail[w] = nxt[f].get(ch);
      }
    }
  }
  let s = 0;
  for (const ch of text) {
    while (s > 0 && !nxt[s].has(ch)) s = fail[s];
    if (nxt[s].has(ch)) s = nxt[s].get(ch);
    hits[s]++;
  }
  for (let i = order.length - 1; i >= 1; i--) hits[fail[order[i]]] += hits[order[i]];
  return endAt.map((e) => hits[e]);
}`,
      python: `from collections import deque
def multi_count(text, P):
    nxt, fail, hits, end_at = [{}], [0], [0], []
    for pat in P:
        s = 0
        for ch in pat:
            if ch not in nxt[s]:
                nxt.append({}); fail.append(0); hits.append(0)
                nxt[s][ch] = len(nxt) - 1
            s = nxt[s][ch]
        end_at.append(s)
    order, q = [], deque([0])
    while q:
        u = q.popleft(); order.append(u)
        for ch, w in nxt[u].items():
            q.append(w)
            if u:
                f = fail[u]
                while f and ch not in nxt[f]:
                    f = fail[f]
                fail[w] = nxt[f].get(ch, 0)
    s = 0
    for ch in text:
        while s and ch not in nxt[s]:
            s = fail[s]
        s = nxt[s].get(ch, 0)
        hits[s] += 1
    for u in reversed(order[1:]):
        hits[fail[u]] += hits[u]
    return [hits[e] for e in end_at]`,
      explain: "Building the trie is Θ(m) for total pattern length m; failure links cost O(m) overall by the same amortized argument as KMP (along one pattern's path the depth of fail drops with every inner while-step and rises by at most 1 per character). The scan is Θ(n) amortized: each character raises the depth by at most 1, and each fail step lowers it. The final push along failure links is Θ(number of states). Total Θ(n + m), independent of how many matches there are.",
    },
    complexity: "Θ(n + m) with m = total pattern length (times the cost of a map lookup)",
    followUp: "To REPORT every match (not just count), follow 'dictionary suffix links' that skip non-terminal states: Θ(n + m + matches). Real engines precompute the full transition table (a Deterministic Finite Automaton (DFA)) for byte-at-a-time speed; ClamAV, Snort/Suricata and the Rust regex crate's multi-literal search are built on Aho–Corasick.",
    distractors: ["fail[w] ← fail[u]", "hits[u] ← hits[u] + hits[fail[u]]", "for i ← 1 to length(order) - 1 do"],
    visual: "sims/trie.html",
    lesson: "lessons/13-advanced-data-structures/README.md",
  });

  /* ================================================================== */
  /* Chapter 17 · Level 6 — Critical-path list scheduling on k workers   */
  /* ================================================================== */
  const schedVariant = (mode) => (dur, deps, k) => {
    const n = dur.length, succ = Array.from({ length: n }, () => []), indeg = Array(n).fill(0);
    deps.forEach(([a, b]) => { succ[a].push(b); indeg[b]++; });
    const bl = Array(n).fill(0);
    const BL = (v) => { if (!bl[v]) { let m = 0; for (const w of succ[v]) m = Math.max(m, BL(w)); bl[v] = dur[v] + m; } return bl[v]; };
    for (let v = 0; v < n; v++) BL(v);
    if (!n) return 0;
    if (mode === "nolimit") return Math.max(...bl);
    if (mode === "lowerbound") return Math.max(Math.max(...bl), Math.ceil(dur.reduce((a, b) => a + b, 0) / k));
    const prio = mode === "lpt" ? dur : bl;
    const better = (a, b) => (mode === "fifo" ? a < b : prio[a] > prio[b] || (prio[a] === prio[b] && a < b));
    let ready = [], running = [], t = 0, idle = k, done = 0;
    const rem = indeg.slice();
    for (let i = 0; i < n; i++) if (!rem[i]) ready.push(i);
    while (done < n) {
      while (idle > 0 && ready.length) { let bi = 0; for (let q = 1; q < ready.length; q++) if (better(ready[q], ready[bi])) bi = q; const i = ready.splice(bi, 1)[0]; running.push([t + dur[i], i]); idle--; }
      t = Math.min(...running.map((x) => x[0]));
      const fin = running.filter((x) => x[0] === t);
      running = running.filter((x) => x[0] !== t);
      for (const [, i] of fin) { idle++; done++; for (const w of succ[i]) if (--rem[w] === 0) ready.push(w); }
    }
    return t;
  };
  const dagGen = (r, n, k, maxDur) => {
    const perm = r.shuffle([...Array(n).keys()]), deps = [];
    for (let i = 1; i < n; i++) { const c = r.int(0, 2), used = new Set(); for (let q = 0; q < c; q++) { const j = r.int(Math.max(0, i - 6), i - 1); if (!used.has(j)) { used.add(j); deps.push([perm[j], perm[i]]); } } }
    return [Array.from({ length: n }, () => r.int(1, maxDur)), r.shuffle(deps), k];
  };

  ForgeProblems.add({
    id: "dag-list-scheduling",
    title: "Scheduling a Task DAG on k Workers (Critical Path First)",
    level: 6, chapter: 17, difficulty: 3,
    topics: ["scheduling", "DAG", "critical path", "heaps", "event simulation", "parallelism"],
    strategy: "Longest-path priorities (dynamic programming on a DAG) + event-driven list scheduling with two heaps",
    source: "Graham (1966), list scheduling · Hu (1961), critical-path priority · Lesson 14 (DAG longest paths) · Lesson 17, Playbook Card 9",
    summary: "Simulate critical-path list scheduling of a task Directed Acyclic Graph (DAG) on k workers and return the finishing time.",
    statement: `
<p>Build systems (Bazel, make -j), data pipelines (Apache Airflow, Spark stages) and compilers' instruction schedulers all run a
<b>Directed Acyclic Graph (DAG)</b> of tasks on a limited number of workers. Finding the optimal schedule is Nondeterministic Polynomial-time hard (NP-hard), but <b>list scheduling</b> —
"whenever a worker is idle, start the best ready task" — is never worse than (2 − 1/k) times optimal (Graham), and choosing the task with the
longest remaining <b>critical path</b> first works very well in practice.</p>
<p>Write <code>ListSchedule(dur, deps, k)</code>. Tasks are <code>0..n-1</code> with integer durations <code>dur[i] ≥ 1</code>; each pair
<code>[a, b]</code> in <code>deps</code> means a must finish before b can start; <code>k ≥ 1</code> identical workers. Rules:</p>
<ul>
<li>The priority of task i is its <b>bottom level</b> bl[i] = dur[i] + max(bl of its successors) (0 if none): the length of the longest path from
the start of i to the end of the whole job.</li>
<li>Time starts at 0. At each moment t, first mark <b>every</b> task that finishes at t as done (making successors ready once all their predecessors
are done); then, while a worker is idle and some task is ready, start the ready task with the <b>highest bl</b>, breaking ties by the
<b>smaller index</b>. A task started at t finishes at t + dur. Then jump to the next finishing time.</li>
</ul>
<p>Return the <b>makespan</b>: the time the last task finishes (0 if there are no tasks).</p>
<ul><li>0 ≤ n ≤ 1000, dur ≤ 20, 1 ≤ k ≤ 8; the graph is acyclic. <b>Efficiency:</b> O((n + e) log n) with priority queues; picking the best
ready task by scanning a list can be Θ(n²) and is flagged.</li></ul>`,
    entry: "ListSchedule",
    params: ["dur", "deps", "k"],
    tests: [
      { args: [[2, 3, 1, 2], [[0, 1], [0, 2], [1, 3], [2, 3]], 2], expect: 7, explain: "Task 0 runs 0–2; then 1 (2–5) and 2 (2–3) in parallel; task 3 waits for both and runs 5–7." },
      { args: [[3, 1, 6], [], 2], expect: 6, explain: "Bottom levels 3, 1, 6: start task 2 (6) and task 0 (3) at time 0; task 1 runs 3–4. Starting in index order (0 and 1 first) would push task 2 to 1–7." },
      { args: [[6, 2, 6], [], 2], expect: 8, explain: "⌈(6 + 2 + 6) / 2⌉ = 7 is only a lower bound: tasks can't be split, and the best possible is 8." },
      { args: [[6, 5, 6, 3], [[1, 3]], 2], expect: 11, explain: "bl = [6, 8, 6, 3]: start 1 and 0 (tie 6 vs 6 → smaller index). Picking the longest DURATION first (0 and 2) would delay the chain 1 → 3 and finish at 14." },
      { args: [[4, 2, 7], [], 5], expect: 7, explain: "More workers than tasks: everything starts at 0." },
      { args: [[3, 1, 2], [[0, 1]], 1], expect: 6, explain: "One worker runs everything back to back: the sum of the durations." },
      { args: [[], [], 3], expect: 0, explain: "No tasks." },
      { args: [[1, 1, 1, 5], [[2, 3]], 2], expect: 6, explain: "Task 2 is short but leads to the long task 3, so its bottom level (6) makes it go first." },
      { args: [[3, 4, 2, 5, 3, 3], [[0, 1], [0, 5]], 3], expect: 7, explain: "Tasks 0 and 4 both finish at time 3. Complete BOTH before choosing: tasks 1 (bl 4) and 5 (bl 3) take the two free workers and task 2 runs 5–7 → 7. Handling only task 4 first would hand its worker to the low-priority task 2 and finish at 8." },
    ],
    random: { count: 30, gen: (r, i) => dagGen(r, 1 + (i % 12), r.int(1, 4), 9) },
    reference: schedVariant(""),
    growth: { metric: "steps", sizes: [64, 128, 256, 512, 1024], gen: (r, n) => dagGen(r, n, 3, 9), expect: "n log n" },
    mutants: [
      { fn: schedVariant("nolimit"), hint: "Your answer is just the critical-path length — as if there were unlimited workers. Only k tasks can run at the same time; the rest wait in the ready queue." },
      { fn: schedVariant("lowerbound"), hint: "You return max(critical path, ⌈total work / k⌉). That is a lower bound, not a schedule: tasks can't be split across workers. Simulate the schedule event by event." },
      { fn: schedVariant("fifo"), hint: "Ready tasks seem to start in index order. The rule is highest bottom level first (longest remaining path to the end), with the smaller index only breaking ties." },
      { fn: schedVariant("lpt"), hint: "You prioritize by the task's own duration. The priority is the bottom level: dur[i] PLUS the longest chain of successors after it — a short task can be urgent if a long chain waits on it." },
    ],
    lints: [
      { re: "for each \\w+ in ready|for \\w+ ← \\d+ to length\\(ready\\)", lang: "pseudo", message: "If the efficiency check flagged you: scanning the ready list for the best task costs Θ(n) per start. Keep ready tasks in a max-priority queue (and running tasks in a min-priority queue by finishing time)." },
    ],
    hints: [
      "Two separate questions: (1) how urgent is each task? — think longest path from it to the end, computed once; (2) at each moment, which tasks can run? — that's an event simulation driven by finishing times.",
      "Compute bl with a memoized recursion over successors (dynamic programming on the DAG). Keep a max-priority queue of ready tasks and a min-priority queue of running tasks keyed by finishing time. Loop: start ready tasks while workers are idle; then advance t to the smallest finishing time and complete every task that finishes at t.",
      "Encode 'highest bl, then smaller index' as one number: insert(ready, i, bl[i] · n + (n − 1 − i)) into a maxPQ. For running tasks insert the pair [finish, i] with priority finish, and complete while peek(running)[0] = t.",
    ],
    starter: {
      pseudo: `ALGORITHM ListSchedule(dur[0..n-1], deps, k)
    succ ← array(n, [])
    indeg ← array(n, 0)
    for each e in deps do
        ...
    bl ← array(n, 0)
    for i ← 0 to n - 1 do
        BL(i, dur, succ, bl)
    ready ← maxPQ()
    running ← priorityQueue()
    ...
    return t

ALGORITHM BL(v, dur, succ, bl)
    ...`,
      js: `function ListSchedule(dur, deps, k) {
  // bottom levels + event simulation with two priority queues
}`,
    },
    solution: {
      pseudo: `ALGORITHM ListSchedule(dur[0..n-1], deps, k)
    succ ← array(n, [])
    indeg ← array(n, 0)
    for each e in deps do
        append(succ[e[0]], e[1])
        indeg[e[1]] ← indeg[e[1]] + 1
    bl ← array(n, 0)
    for i ← 0 to n - 1 do
        BL(i, dur, succ, bl)
    ready ← maxPQ()
    for i ← 0 to n - 1 do
        if indeg[i] = 0 then
            insert(ready, i, bl[i] * n + (n - 1 - i))
    running ← priorityQueue()
    t ← 0
    idle ← k
    done ← 0
    while done < n do
        while idle > 0 and not isEmpty(ready) do
            i ← deleteMax(ready)
            insert(running, [t + dur[i], i], t + dur[i])
            idle ← idle - 1
        t ← peek(running)[0]
        while not isEmpty(running) and peek(running)[0] = t do
            (f, i) ← deleteMin(running)
            idle ← idle + 1
            done ← done + 1
            for each w in succ[i] do
                indeg[w] ← indeg[w] - 1
                if indeg[w] = 0 then
                    insert(ready, w, bl[w] * n + (n - 1 - w))
    return t

ALGORITHM BL(v, dur, succ, bl)
    if bl[v] = 0 then
        best ← 0
        for each w in succ[v] do
            best ← max(best, BL(w, dur, succ, bl))
        bl[v] ← dur[v] + best
    return bl[v]`,
      js: `function ListSchedule(dur, deps, k) {
  const n = dur.length, succ = Array.from({ length: n }, () => []), indeg = Array(n).fill(0);
  for (const [a, b] of deps) { succ[a].push(b); indeg[b]++; }
  const bl = Array(n).fill(0);
  const BL = (v) => { if (!bl[v]) { let m = 0; for (const w of succ[v]) m = Math.max(m, BL(w)); bl[v] = dur[v] + m; } return bl[v]; };
  for (let v = 0; v < n; v++) BL(v);
  // tiny binary heap: less(a, b) says a should come out first
  const heap = (less) => { const h = []; return {
    size: () => h.length, top: () => h[0],
    push(x) { h.push(x); let i = h.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (!less(h[i], h[p])) break; [h[i], h[p]] = [h[p], h[i]]; i = p; } },
    pop() { const top = h[0], last = h.pop(); if (h.length) { h[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < h.length && less(h[l], h[m])) m = l; if (r < h.length && less(h[r], h[m])) m = r; if (m === i) break; [h[i], h[m]] = [h[m], h[i]]; i = m; } } return top; },
  }; };
  const ready = heap((a, b) => bl[a] > bl[b] || (bl[a] === bl[b] && a < b));
  const running = heap((a, b) => a[0] < b[0]);
  for (let i = 0; i < n; i++) if (indeg[i] === 0) ready.push(i);
  let t = 0, idle = k, done = 0;
  while (done < n) {
    while (idle > 0 && ready.size()) { const i = ready.pop(); running.push([t + dur[i], i]); idle--; }
    t = running.top()[0];
    while (running.size() && running.top()[0] === t) {
      const [, i] = running.pop(); idle++; done++;
      for (const w of succ[i]) if (--indeg[w] === 0) ready.push(w);
    }
  }
  return t;
}`,
      python: `import heapq
def list_schedule(dur, deps, k):
    n = len(dur); succ = [[] for _ in range(n)]; indeg = [0] * n
    for a, b in deps:
        succ[a].append(b); indeg[b] += 1
    bl = [0] * n
    def BL(v):
        if not bl[v]:
            bl[v] = dur[v] + max((BL(w) for w in succ[v]), default=0)
        return bl[v]
    for v in range(n): BL(v)
    ready = [(-bl[i], i) for i in range(n) if indeg[i] == 0]; heapq.heapify(ready)
    running, t, idle, done = [], 0, k, 0
    while done < n:
        while idle and ready:
            _, i = heapq.heappop(ready); heapq.heappush(running, (t + dur[i], i)); idle -= 1
        t = running[0][0]
        while running and running[0][0] == t:
            _, i = heapq.heappop(running); idle += 1; done += 1
            for w in succ[i]:
                indeg[w] -= 1
                if indeg[w] == 0: heapq.heappush(ready, (-bl[w], w))
    return t`,
      explain: "Bottom levels: each vertex and edge is handled once by the memoized recursion, Θ(n + e). Simulation: every task enters and leaves each priority queue once, O(log n) each, and every edge is relaxed once: Θ((n + e) log n). Quality: at any moment either all k workers are busy or some task on a longest remaining path is running, which gives Graham's bound makespan ≤ (total work)/k + (critical path) ≤ (2 − 1/k)·OPT.",
    },
    complexity: "Θ((n + e) log n) time, Θ(n + e) memory",
    followUp: "Graham's anomalies: with list scheduling, adding a worker or shortening a task can make the makespan LONGER. Real schedulers add data locality (Spark prefers executors that already hold the input), heterogeneous machines (Heterogeneous Earliest Finish Time, HEFT), and work stealing (Cilk, Java's ForkJoinPool, Go's runtime) to balance load dynamically.",
    distractors: ["i ← deleteMin(ready)", "insert(ready, i, dur[i])", "bl[v] ← max(bl[v], BL(w, dur, succ, bl))"],
    visual: "sims/topo-sort.html",
    lesson: "lessons/17-senior-engineer-playbook/README.md",
  });
})();
