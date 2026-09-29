/* Pack H — Beyond the textbook: advanced data structures (Ch 13) and advanced graphs (Ch 14).
   Level 5 · senior-engineer patterns. Design / data-structure problems take a list of operations
   and return the list of outputs. Validate with:  node tools/validate-problems.mjs beyond-structures-graphs.js  */

/* ------------------------------------------------------------------ */
/* Chapter 13 · Advanced data structures                               */
/* ------------------------------------------------------------------ */

ForgeProblems.add({
  id: "min-stack-ops",
  title: "Min Stack (O(1) Minimum)",
  level: 5, chapter: 13, difficulty: 1,
  topics: ["stack", "design", "augmented data structure"],
  strategy: "Augment each stack entry with the minimum below it",
  source: "Interview classic",
  summary: "A stack that also answers “what is the smallest element?” in constant time.",
  statement: `
<p>Many structures get superpowers by storing one extra fact next to each element. A stack that can report its minimum
in Θ(1) is the smallest example of this <b>augmentation</b> idea (the same idea gives order-statistic trees and segment trees).</p>
<p>Write <code>MinStack(ops)</code>. <code>ops</code> is a list of operations, each a small list:</p>
<ul>
<li><code>["push", x]</code> — push the number <code>x</code> (no output)</li>
<li><code>["pop"]</code> — remove the top element and <b>output</b> it</li>
<li><code>["top"]</code> — <b>output</b> the top element without removing it</li>
<li><code>["min"]</code> — <b>output</b> the smallest element currently on the stack</li>
</ul>
<p>Return the list of outputs, in order. <code>pop</code>, <code>top</code> and <code>min</code> are never called on an empty stack.
Duplicates are allowed. <b>Every operation must take Θ(1) time</b> — scanning the stack for the minimum is too slow (the grader checks how
your work grows).</p>`,
  entry: "MinStack",
  params: ["ops"],
  tests: [
    { args: [[["push", 5], ["push", 2], ["push", 8], ["min"], ["pop"], ["min"], ["top"]]], expect: [2, 8, 2, 2], explain: "min is 2; popping 8 leaves 2 as both min and top." },
    { args: [[["push", 5], ["push", 2], ["pop"], ["min"]]], expect: [2, 5], explain: "After popping the minimum 2, the minimum must fall back to 5." },
    { args: [[["push", 3], ["push", 1], ["push", 1], ["pop"], ["min"]]], expect: [1, 1], explain: "Duplicates: one 1 is popped, but another 1 is still there." },
    { args: [[["push", -4], ["min"], ["top"], ["pop"]]], expect: [-4, -4, -4], explain: "One element is top, minimum and the popped value." },
    { args: [[["push", 7], ["push", 9], ["push", 6], ["push", 6], ["pop"], ["pop"], ["min"], ["push", 1], ["min"], ["pop"], ["min"]]], expect: [6, 6, 7, 1, 1, 7] },
    { args: [[["push", 2], ["push", 2], ["push", 2], ["pop"], ["pop"], ["min"], ["top"]]], expect: [2, 2, 2, 2] },
  ],
  random: {
    count: 25,
    gen: (r, i) => {
      const ops = []; let size = 0;
      const m = 4 + i * 2;
      for (let k = 0; k < m; k++) {
        const c = r();
        if (size === 0 || c < 0.45) { ops.push(["push", r.int(-9, 9)]); size++; }
        else if (c < 0.7) { ops.push(["pop"]); size--; }
        else if (c < 0.85) ops.push(["min"]);
        else ops.push(["top"]);
      }
      return [ops];
    },
  },
  reference: (ops) => {
    const S = [], out = [];
    for (const op of ops) {
      if (op[0] === "push") { const m = S.length ? Math.min(S[S.length - 1][1], op[1]) : op[1]; S.push([op[1], m]); }
      else if (op[0] === "pop") out.push(S.pop()[0]);
      else if (op[0] === "top") out.push(S[S.length - 1][0]);
      else out.push(S[S.length - 1][1]);
    }
    return out;
  },
  growth: {
    metric: "steps", sizes: [32, 64, 128, 256, 512],
    gen: (r, n) => {
      const ops = [];
      for (let k = 0; k < n / 2; k++) ops.push(["push", r.int(-1000, 1000)]);
      for (let k = 0; k < n / 2; k++) ops.push(k % 2 ? ["pop"] : ["min"]);
      return [ops];
    },
    expect: "n",
  },
  mutants: [
    {
      fn: (ops) => { const S = [], M = [], out = []; for (const op of ops) { if (op[0] === "push") { S.push(op[1]); if (!M.length || op[1] < M[M.length - 1]) M.push(op[1]); } else if (op[0] === "pop") { const x = S.pop(); if (M.length && x === M[M.length - 1]) M.pop(); out.push(x); } else if (op[0] === "top") out.push(S[S.length - 1]); else out.push(M[M.length - 1]); } return out; },
      hint: "Duplicates break your minimum: when the same minimum value is pushed twice, you only remember it once, so the first pop of that value forgets it. Record a new minimum when x ≤ the current minimum (not just <), or store the minimum next to every element.",
    },
    {
      fn: (ops) => { const S = [], out = []; let mn = Infinity; for (const op of ops) { if (op[0] === "push") { S.push(op[1]); mn = Math.min(mn, op[1]); } else if (op[0] === "pop") out.push(S.pop()); else if (op[0] === "top") out.push(S[S.length - 1]); else out.push(mn); } return out; },
      hint: "Your minimum never goes back UP after a pop. One variable can't remember what the minimum was before the latest push — you need the history. Try storing, with each element, the minimum of everything at or below it.",
    },
  ],
  hints: [
    "When you pop the current minimum, what should the new minimum be? Where could you have remembered it without scanning?",
    "Store pairs: each stack entry holds (value, minimum of this entry and everything below it). The pair on top always knows the current minimum.",
    "On push x: m ← x if the stack is empty, otherwise m ← min(x, top entry's minimum); push [x, m]. min is just top(S)[1].",
  ],
  starter: {
    pseudo: `ALGORITHM MinStack(ops)
    // ops[k] is ["push", x], ["pop"], ["top"] or ["min"]
    // Output: list of the values produced by pop / top / min
    S ← stack()
    out ← []
    for each op in ops do
        if op[0] = "push" then
            ...
    return out`,
    js: `function MinStack(ops) {
  const out = [];
  // every operation must be O(1)
  return out;
}`,
  },
  solution: {
    pseudo: `ALGORITHM MinStack(ops)
    S ← stack()
    out ← []
    for each op in ops do
        if op[0] = "push" then
            m ← op[1]
            if not isEmpty(S) then
                m ← min(m, top(S)[1])
            push(S, [op[1], m])
        else if op[0] = "pop" then
            append(out, pop(S)[0])
        else if op[0] = "top" then
            append(out, top(S)[0])
        else
            append(out, top(S)[1])
    return out`,
    js: `function MinStack(ops) {
  const S = [], out = [];
  for (const op of ops) {
    if (op[0] === "push") {
      const m = S.length ? Math.min(op[1], S[S.length - 1][1]) : op[1];
      S.push([op[1], m]);
    } else if (op[0] === "pop") out.push(S.pop()[0]);
    else if (op[0] === "top") out.push(S[S.length - 1][0]);
    else out.push(S[S.length - 1][1]);
  }
  return out;
}`,
    python: `def min_stack(ops):
    S, out = [], []
    for op in ops:
        if op[0] == "push":
            m = min(op[1], S[-1][1]) if S else op[1]
            S.append((op[1], m))
        elif op[0] == "pop":
            out.append(S.pop()[0])
        elif op[0] == "top":
            out.append(S[-1][0])
        else:
            out.append(S[-1][1])
    return out`,
    explain: "Invariant: the entry at depth d stores min(S[0..d]). A push computes it from the entry below in Θ(1); a pop simply exposes the entry below, whose stored minimum is already correct. So every operation is Θ(1) and m operations cost Θ(m), at the price of Θ(n) extra space.",
  },
  complexity: "Θ(1) per operation, Θ(n) extra space",
  followUp: "Cut the extra space: keep a second stack that only grows when x ≤ current min. Then build a min-QUEUE from two min-stacks (amortized O(1)) — that is exactly how sliding-window aggregations over a stream are done in systems like Flink.",
  distractors: ["                m ← max(m, top(S)[1])", "            append(out, pop(S))", "            m ← 0"],
  visual: "sims/heap-lab.html",
  lesson: "lessons/13-advanced-data-structures/README.md",
});

ForgeProblems.add({
  id: "union-find-ops",
  title: "Union-Find with Path Compression",
  level: 5, chapter: 13, difficulty: 1,
  topics: ["union-find", "disjoint sets", "amortized analysis", "design"],
  strategy: "Union by size + path compression",
  source: "Levitin §9.2 (extended) · Interview classic",
  summary: "Process union / same / size / count operations on n items with near-constant amortized time.",
  statement: `
<p>A <b>disjoint-set</b> (union-find) structure keeps <code>n</code> items <code>0..n-1</code> split into groups. Kruskal's algorithm
uses it (Levitin §9.2), and so do image blob labeling, compilers (type unification) and "are these two accounts the same person?" systems.</p>
<p>Write <code>UnionFindOps(n, ops)</code>. Every item starts in its own group. Each operation produces one output:</p>
<ul>
<li><code>["union", a, b]</code> — merge the groups of <code>a</code> and <code>b</code>; output <code>true</code> if they were different groups, <code>false</code> if already together</li>
<li><code>["same", a, b]</code> — output <code>true</code> if <code>a</code> and <code>b</code> are in the same group</li>
<li><code>["size", a]</code> — output the number of items in <code>a</code>'s group</li>
<li><code>["count"]</code> — output the current number of groups</li>
</ul>
<p>Return the list of outputs. <b>Efficiency matters:</b> a plain parent-pointer forest can degrade into a long chain, making each
operation Θ(n). Use <b>union by size</b> and/or <b>path compression</b> — the grader feeds you chain-building inputs and checks how your work grows.</p>`,
  entry: "UnionFindOps",
  params: ["n", "ops"],
  tests: [
    { args: [5, [["union", 0, 1], ["union", 1, 2], ["same", 0, 2], ["same", 0, 3], ["size", 2], ["count"], ["union", 2, 0], ["count"]]], expect: [true, true, true, false, 3, 3, false, 3], explain: "{0,1,2} {3} {4}: three groups. Re-uniting 2 and 0 changes nothing." },
    { args: [4, [["union", 0, 1], ["union", 2, 1], ["same", 0, 2], ["size", 0]]], expect: [true, true, true, 3], explain: "union(2, 1) must merge 2 with 1's whole group — including 0." },
    { args: [3, [["count"], ["size", 1], ["same", 1, 1]]], expect: [3, 1, true], explain: "No unions yet: every item is alone (and is in the same group as itself)." },
    { args: [1, [["count"], ["union", 0, 0], ["count"]]], expect: [1, false, 1], explain: "Uniting an item with itself does nothing." },
    { args: [8, [["union", 0, 1], ["union", 2, 3], ["union", 0, 2], ["union", 4, 5], ["union", 6, 7], ["union", 4, 6], ["union", 3, 5], ["size", 7], ["count"], ["same", 1, 6]]], expect: [true, true, true, true, true, true, true, 8, 1, true], explain: "The lesson's trace: everything ends up in one group of 8." },
    { args: [6, [["union", 5, 4], ["union", 4, 3], ["size", 3], ["union", 3, 5], ["size", 5], ["count"], ["same", 0, 5]]], expect: [true, true, 3, false, 3, 4, false] },
  ],
  random: {
    count: 25,
    gen: (r, i) => {
      const n = 2 + (i % 10) * 2;
      const ops = [];
      for (let k = 0; k < 6 + i; k++) {
        const c = r();
        if (c < 0.45) ops.push(["union", r.int(0, n - 1), r.int(0, n - 1)]);
        else if (c < 0.7) ops.push(["same", r.int(0, n - 1), r.int(0, n - 1)]);
        else if (c < 0.9) ops.push(["size", r.int(0, n - 1)]);
        else ops.push(["count"]);
      }
      return [n, ops];
    },
  },
  reference: (n, ops) => {
    const p = [...Array(n).keys()], sz = Array(n).fill(1); let groups = n; const out = [];
    const find = (x) => { while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; } return x; };
    for (const op of ops) {
      if (op[0] === "union") { let a = find(op[1]), b = find(op[2]); if (a === b) out.push(false); else { if (sz[a] < sz[b]) [a, b] = [b, a]; p[b] = a; sz[a] += sz[b]; groups--; out.push(true); } }
      else if (op[0] === "same") out.push(find(op[1]) === find(op[2]));
      else if (op[0] === "size") out.push(sz[find(op[1])]);
      else out.push(groups);
    }
    return out;
  },
  growth: {
    metric: "steps", sizes: [32, 64, 128, 256, 512],
    gen: (r, n) => {
      // two chains built in both link directions, then many queries on their deepest ends
      const h = n / 2, ops = [];
      for (let i = 0; i + 1 < h; i++) ops.push(["union", i, i + 1]);
      for (let i = h; i + 1 < n; i++) ops.push(["union", i + 1, i]);
      for (let k = 0; k < n; k++) ops.push(k % 2 ? ["same", 0, 1] : ["same", h, h + 1]);
      return [n, ops];
    },
    expect: "n log n",
  },
  mutants: [
    {
      fn: (n, ops) => { const p = [...Array(n).keys()], sz = Array(n).fill(1); let groups = n; const out = []; const find = (x) => { while (p[x] !== x) x = p[x]; return x; }; for (const op of ops) { if (op[0] === "union") { let a = find(op[1]), b = find(op[2]); if (a !== b && sz[a] < sz[b]) [a, b] = [b, a]; p[b] = a; if (a !== b) sz[a] += sz[b]; else sz[a] *= 2; groups--; out.push(true); } else if (op[0] === "same") out.push(find(op[1]) === find(op[2])); else if (op[0] === "size") out.push(sz[find(op[1])]); else out.push(groups); } return out; },
      hint: "When a and b are ALREADY in the same group, your union still reports true, lowers the group count and adds the size again. Compare the two roots first and stop (output false) if they are equal.",
    },
    {
      fn: (n, ops) => { const p = [...Array(n).keys()], sz = Array(n).fill(1); let groups = n; const out = []; const find = (x) => { while (p[x] !== x) x = p[x]; return x; }; for (const op of ops) { if (op[0] === "union") { const a = find(op[1]), b = find(op[2]); if (a === b) out.push(false); else { p[op[2]] = op[1]; sz[a] += sz[b]; groups--; out.push(true); } } else if (op[0] === "same") out.push(find(op[1]) === find(op[2])); else if (op[0] === "size") out.push(sz[find(op[1])]); else out.push(groups); } return out; },
      hint: "You are linking the items themselves (parent[b] ← a) instead of their ROOTS. If b isn't a root, that cuts b away from its old group and strands the rest of it. Always link root to root: parent[Find(b)] ← Find(a).",
    },
    {
      fn: (n, ops) => { const p = [...Array(n).keys()], sz = Array(n).fill(1); let groups = n; const out = []; const find = (x) => { while (p[x] !== x) x = p[x]; return x; }; for (const op of ops) { if (op[0] === "union") { let a = find(op[1]), b = find(op[2]); if (a === b) out.push(false); else { if (sz[a] < sz[b]) [a, b] = [b, a]; p[b] = a; sz[a] += sz[b]; groups--; out.push(true); } } else if (op[0] === "same") out.push(find(op[1]) === find(op[2])); else if (op[0] === "size") out.push(sz[op[1]]); else out.push(groups); } return out; },
      hint: "Your sizes are right only for roots. size[x] is kept up to date only at the ROOT of x's tree — look it up as size[Find(x)].",
    },
  ],
  hints: [
    "Give every group a boss (a root). Two items are together exactly when they reach the same root by following parent pointers. What keeps those paths short?",
    "Keep parent[0..n-1] (initially parent[i] = i), size[0..n-1] (initially 1) and a group counter. Write a helper Find(parent, x) that walks up to the root.",
    "Union: ra ← Find(a), rb ← Find(b); if equal output false. Otherwise hang the smaller tree's root under the larger one's, add the sizes, decrease the counter. In Find, after locating the root, walk the path again and point every node straight at the root.",
  ],
  starter: {
    pseudo: `ALGORITHM UnionFindOps(n, ops)
    // ops[k] is ["union", a, b], ["same", a, b], ["size", a] or ["count"]; items are 0..n-1
    parent ← array(n, 0)
    size ← array(n, 1)
    for i ← 0 to n - 1 do
        parent[i] ← i
    groups ← n
    out ← []
    for each op in ops do
        ...
    return out

ALGORITHM Find(parent, x)
    // return the root of x's tree (and compress the path)
    ...`,
    js: `function UnionFindOps(n, ops) {
  const parent = [...Array(n).keys()], size = Array(n).fill(1);
  let groups = n;
  const out = [];
  // ...
  return out;
}`,
  },
  solution: {
    pseudo: `ALGORITHM UnionFindOps(n, ops)
    parent ← array(n, 0)
    size ← array(n, 1)
    for i ← 0 to n - 1 do
        parent[i] ← i
    groups ← n
    out ← []
    for each op in ops do
        if op[0] = "union" then
            ra ← Find(parent, op[1])
            rb ← Find(parent, op[2])
            if ra = rb then
                append(out, false)
            else
                if size[ra] < size[rb] then
                    swap ra and rb
                parent[rb] ← ra
                size[ra] ← size[ra] + size[rb]
                groups ← groups - 1
                append(out, true)
        else if op[0] = "same" then
            append(out, Find(parent, op[1]) = Find(parent, op[2]))
        else if op[0] = "size" then
            append(out, size[Find(parent, op[1])])
        else
            append(out, groups)
    return out

ALGORITHM Find(parent, x)
    root ← x
    while parent[root] ≠ root do
        root ← parent[root]
    while parent[x] ≠ root do
        next ← parent[x]
        parent[x] ← root
        x ← next
    return root`,
    js: `function UnionFindOps(n, ops) {
  const parent = [...Array(n).keys()], size = Array(n).fill(1);
  let groups = n;
  const out = [];
  const find = (x) => {
    let root = x;
    while (parent[root] !== root) root = parent[root];
    while (parent[x] !== root) { const nx = parent[x]; parent[x] = root; x = nx; }
    return root;
  };
  for (const op of ops) {
    if (op[0] === "union") {
      let a = find(op[1]), b = find(op[2]);
      if (a === b) { out.push(false); continue; }
      if (size[a] < size[b]) [a, b] = [b, a];
      parent[b] = a; size[a] += size[b]; groups--;
      out.push(true);
    } else if (op[0] === "same") out.push(find(op[1]) === find(op[2]));
    else if (op[0] === "size") out.push(size[find(op[1])]);
    else out.push(groups);
  }
  return out;
}`,
    python: `def union_find_ops(n, ops):
    parent, size, groups, out = list(range(n)), [1] * n, n, []
    def find(x):
        root = x
        while parent[root] != root:
            root = parent[root]
        while parent[x] != root:
            parent[x], x = root, parent[x]
        return root
    for op in ops:
        if op[0] == "union":
            a, b = find(op[1]), find(op[2])
            if a == b:
                out.append(False); continue
            if size[a] < size[b]:
                a, b = b, a
            parent[b] = a; size[a] += size[b]; groups -= 1
            out.append(True)
        elif op[0] == "same":
            out.append(find(op[1]) == find(op[2]))
        elif op[0] == "size":
            out.append(size[find(op[1])])
        else:
            out.append(groups)
    return out`,
    explain: "Union by size keeps every tree's height ≤ log₂ n (a node sinks one level only when its tree at least doubles). Adding path compression makes any sequence of m operations cost O(m·α(n)), where the inverse Ackermann function α(n) ≤ 4 for any realistic n — effectively constant per operation (Tarjan 1975).",
  },
  complexity: "O(α(n)) amortized per operation",
  followUp: "Union-find can merge but never split. How would you support 'undo the last union' (hint: union by size WITHOUT path compression, plus a stack of changes)? That rollback trick powers offline dynamic connectivity — and databases use the same merge-only idea for equivalence classes in query optimizers.",
  distractors: ["                parent[op[2]] ← op[1]", "            append(out, size[op[1]])", "                parent[ra] ← rb"],
  visual: "sims/union-find.html",
  lesson: "lessons/13-advanced-data-structures/README.md",
});

ForgeProblems.add({
  id: "kth-largest-stream",
  title: "K-th Largest in a Stream",
  level: 5, chapter: 13, difficulty: 1,
  topics: ["heap", "priority queue", "streaming", "design"],
  strategy: "Size-k min-heap",
  source: "Interview classic · builds on Levitin §6.4 (heaps)",
  summary: "After each arriving number, report the k-th largest value seen so far.",
  statement: `
<p>Leaderboards ("show the 10th-best score"), latency monitors ("the 99th-percentile threshold among the top 1000 samples") and
top-k search results all ask the same question over a stream that never ends: <i>what is the k-th largest value so far?</i></p>
<p>Write <code>KthLargest(k, stream)</code>. Numbers arrive one at a time from <code>stream[0..n-1]</code>. After each arrival,
output the <b>k-th largest</b> value seen so far (counting duplicates), or <code>null</code> if fewer than <code>k</code> numbers have arrived.
Return the list of <code>n</code> outputs. 1 ≤ k.</p>
<p><b>Efficiency:</b> keep only what you need — the whole stream can't be re-sorted after every arrival. <code>sorted(…)</code> and
<code>insertAt(…)</code> are not allowed; use a priority queue (<code>priorityQueue()</code>, <code>insert(Q, x, x)</code>, <code>deleteMin(Q)</code>,
<code>peek(Q)</code>, <code>length(Q)</code>).</p>`,
  entry: "KthLargest",
  params: ["k", "stream"],
  tests: [
    { args: [3, [4, 5, 8, 2, 3, 5, 10, 9]], expect: [null, null, 4, 4, 4, 5, 5, 8], explain: "After 4, 5, 8 the 3rd largest is 4; a 2 or 3 can't beat it; the second 5 pushes it up to 5." },
    { args: [1, [3, 1, 7, 2]], expect: [3, 3, 7, 7], explain: "k = 1 is the running maximum." },
    { args: [2, [5, 5, 5]], expect: [null, 5, 5], explain: "Duplicates count: the 2nd largest of 5, 5 is 5." },
    { args: [4, [1, 2]], expect: [null, null], explain: "Fewer than k numbers ever arrive." },
    { args: [2, [-1, -7, -3, 0, -2]], expect: [null, -7, -3, -1, -1] },
    { args: [3, [9, 8, 7, 6, 10, 11, 12]], expect: [null, null, 7, 7, 8, 9, 10] },
  ],
  random: { count: 25, gen: (r, i) => { const n = 1 + i * 2; return [r.int(1, Math.max(1, Math.ceil(n / 2))), r.array(n, -20, 20)]; } },
  reference: (k, S) => { const seen = [], out = []; for (const x of S) { seen.push(x); if (seen.length < k) out.push(null); else out.push(seen.slice().sort((a, b) => b - a)[k - 1]); } return out; },
  forbid: ["sorted", "insertAt"],
  growth: { metric: "steps", sizes: [32, 64, 128, 256, 512], gen: (r, n) => [n / 2, r.array(n, 0, 100000)], expect: "n log n" },
  mutants: [
    { fn: (k, S) => { let mx = -Infinity; return S.map((x, i) => { mx = Math.max(mx, x); return i + 1 < k ? null : mx; }); }, hint: "You're reporting the LARGEST value. The k-th largest is the SMALLEST of the top k — that's why the heap should be a MIN-heap holding exactly k items, and the answer is its minimum." },
    { fn: (k, S) => { const seen = []; return S.map((x) => { seen.push(x); return seen.length < k ? null : seen.slice().sort((a, b) => a - b)[k - 1]; }); }, hint: "That's the k-th SMALLEST. Keep the k largest values instead: when a (k+1)-th item arrives, throw away the smallest one." },
    { fn: (k, S) => { const seen = []; return S.map((x) => { seen.push(x); if (seen.length < k) return null; const t = seen.slice().sort((a, b) => b - a); return t[Math.min(k, t.length - 1)]; }); }, hint: "Off by one: your heap seems to keep k + 1 items, so you report the (k+1)-th largest. Delete the minimum as soon as the size EXCEEDS k." },
    { fn: (k, S) => { const seen = []; return S.map((x) => { seen.push(x); const t = seen.slice().sort((a, b) => b - a); return t[Math.min(k, t.length) - 1]; }); }, hint: "Before k numbers have arrived there IS no k-th largest — output null until the heap holds k items." },
  ],
  hints: [
    "To know the k-th largest, which values do you actually need to keep? Is anything smaller than the current k-th largest ever useful again?",
    "Keep a MIN-heap of the k largest values seen so far. Its minimum is exactly the k-th largest.",
    "For each x: insert(Q, x, x); if length(Q) > k then deleteMin(Q). Then output peek(Q) if length(Q) = k, else null.",
  ],
  starter: {
    pseudo: `ALGORITHM KthLargest(k, stream[0..n-1])
    // Output: list of n values (null while fewer than k numbers have arrived)
    Q ← priorityQueue()
    out ← []
    for each x in stream do
        ...
    return out`,
    js: `function KthLargest(k, stream) {
  // keep only k values! (a sorted array works in JS, but think heap)
  return [];
}`,
  },
  solution: {
    pseudo: `ALGORITHM KthLargest(k, stream[0..n-1])
    Q ← priorityQueue()
    out ← []
    for each x in stream do
        insert(Q, x, x)
        if length(Q) > k then
            deleteMin(Q)
        if length(Q) = k then
            append(out, peek(Q))
        else
            append(out, null)
    return out`,
    js: `function KthLargest(k, stream) {
  const H = []; // binary min-heap
  const up = (i) => { while (i > 0) { const p = (i - 1) >> 1; if (H[p] <= H[i]) break; [H[p], H[i]] = [H[i], H[p]]; i = p; } };
  const down = (i) => { for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < H.length && H[l] < H[m]) m = l; if (r < H.length && H[r] < H[m]) m = r; if (m === i) return; [H[m], H[i]] = [H[i], H[m]]; i = m; } };
  const out = [];
  for (const x of stream) {
    H.push(x); up(H.length - 1);
    if (H.length > k) { H[0] = H.pop(); down(0); }
    out.push(H.length === k ? H[0] : null);
  }
  return out;
}`,
    python: `import heapq
def kth_largest(k, stream):
    h, out = [], []
    for x in stream:
        heapq.heappush(h, x)
        if len(h) > k:
            heapq.heappop(h)
        out.append(h[0] if len(h) == k else None)
    return out`,
    explain: "Invariant: the heap holds the k largest values seen so far, so its minimum is the k-th largest. Each arrival costs one insert and at most one delete-min on a heap of size ≤ k + 1: Θ(log k) per item, Θ(n log k) total and Θ(k) memory — independent of how long the stream runs.",
  },
  complexity: "Θ(log k) per arrival, Θ(k) memory",
  followUp: "Memory is O(k), but what if k itself is huge, like the 99th percentile of a billion latencies? Production monitoring uses approximate sketches (t-digest, HDRHistogram) that answer any percentile in fixed memory with bounded error.",
  distractors: ["    Q ← maxPQ()", "        if length(Q) ≥ k then", "            append(out, deleteMin(Q))"],
  visual: "sims/heap-lab.html",
  lesson: "lessons/13-advanced-data-structures/README.md",
});

ForgeProblems.add({
  id: "trie-prefix-count",
  title: "Trie: Count Words by Prefix",
  level: 5, chapter: 13, difficulty: 1,
  topics: ["trie", "strings", "design", "autocomplete"],
  strategy: "Prefix tree with per-node counters",
  source: "Interview classic · Lesson 13 Build Card 5",
  summary: "Insert words; answer “how many words start with p?” in time proportional to the length of p.",
  statement: `
<p>Autocomplete boxes, spell-checkers and Internet Protocol (IP) routing tables all answer <i>prefix</i> questions. A <b>trie</b>
(prefix tree) makes each question cost time proportional to the length of the prefix, no matter how many words are stored.</p>
<p>Write <code>TrieOps(ops)</code>. Operations:</p>
<ul>
<li><code>["insert", w]</code> — add word <code>w</code> to the set (inserting a word that is already there changes nothing). No output.</li>
<li><code>["count", p]</code> — <b>output</b> how many distinct stored words start with <code>p</code> (a word counts as starting with itself; <code>p</code> may be <code>""</code>).</li>
<li><code>["has", w]</code> — <b>output</b> <code>true</code> if the exact word <code>w</code> is stored.</li>
</ul>
<p>Return the list of outputs. Words use lowercase letters. <b>Each operation must cost O(length of its word)</b> — scanning the whole word list per query is too slow.</p>
<p>Forge Pseudocode tips: make nodes with <code>t ← new Node</code>, give them fields (<code>t.child ← map()</code>, <code>t.pass ← 0</code>);
test a child with <code>contains(t.child, c)</code>; strings index like arrays (<code>w[i]</code>).</p>`,
  entry: "TrieOps",
  params: ["ops"],
  tests: [
    { args: [[["insert", "car"], ["insert", "card"], ["insert", "care"], ["insert", "cat"], ["insert", "dog"], ["count", "ca"], ["count", "car"], ["has", "ca"], ["has", "card"], ["count", "x"]]], expect: [4, 3, false, true, 0], explain: "car, card, care and cat start with 'ca'; 'ca' itself is only a prefix, not a stored word." },
    { args: [[["insert", "a"], ["insert", "a"], ["count", "a"], ["count", ""]]], expect: [1, 1], explain: "Inserting 'a' twice still stores ONE word." },
    { args: [[["count", "a"], ["has", ""], ["insert", "b"], ["has", "b"], ["count", ""]]], expect: [0, false, true, 1], explain: "Empty trie first; the empty prefix matches every stored word." },
    { args: [[["insert", "an"], ["insert", "and"], ["insert", "ant"], ["count", "an"], ["has", "an"], ["insert", "and"], ["count", "a"], ["count", "ann"]]], expect: [3, true, 3, 0] },
    { args: [[["insert", "abc"], ["has", "ab"], ["has", "abcd"], ["count", "abcd"], ["insert", "ab"], ["has", "ab"], ["count", "ab"]]], expect: [false, false, 0, true, 2] },
    { args: [[["insert", "zz"], ["insert", "z"], ["insert", "zzz"], ["insert", "zz"], ["count", "z"], ["count", "zz"], ["count", "zzz"]]], expect: [3, 2, 1] },
  ],
  random: {
    count: 25,
    gen: (r, i) => {
      const ops = [];
      for (let k = 0; k < 5 + i; k++) {
        const c = r(), w = r.word(r.int(k % 7 === 6 ? 0 : 1, 4), "abc");
        if (c < 0.5 && w.length) ops.push(["insert", w]);
        else if (c < 0.8) ops.push(["count", w]);
        else ops.push(["has", w]);
      }
      return [ops];
    },
  },
  reference: (ops) => { const S = new Set(), out = []; for (const [c, w] of ops) { if (c === "insert") S.add(w); else if (c === "count") out.push([...S].filter((x) => x.startsWith(w)).length); else out.push(S.has(w)); } return out; },
  growth: {
    metric: "steps", sizes: [32, 64, 128, 256, 512],
    gen: (r, n) => { const ops = []; for (let k = 0; k < n; k++) ops.push([k % 2 ? "count" : "insert", r.word(4, "abcdefgh")]); return [ops]; },
    expect: "n",
  },
  mutants: [
    { fn: (ops) => { const L = [], out = []; for (const [c, w] of ops) { if (c === "insert") L.push(w); else if (c === "count") out.push(L.filter((x) => x.startsWith(w)).length); else out.push(L.includes(w)); } return out; }, hint: "A word inserted twice is being counted twice. Check whether the word is already stored (walk it and look at the end marker) BEFORE increasing any counters." },
    { fn: (ops) => { const S = new Set(), out = []; for (const [c, w] of ops) { if (c === "insert") S.add(w); else if (c === "count") out.push([...S].filter((x) => x.startsWith(w)).length); else out.push([...S].some((x) => x.startsWith(w))); } return out; }, hint: "has(w) says true whenever the PATH for w exists — but 'ca' being on the path to 'car' doesn't make 'ca' a word. Mark the node where each word ends (isEnd) and check that flag." },
    { fn: (ops) => { const S = new Set(), out = []; for (const [c, w] of ops) { if (c === "insert") S.add(w); else if (c === "count") out.push([...S].filter((x) => x.startsWith(w) && x !== w).length); else out.push(S.has(w)); } return out; }, hint: "count(p) is missing the word p itself when p is stored. Count a word at EVERY node on its path, including the last node (and the root, for the empty prefix)." },
  ],
  hints: [
    "Words that share a prefix share a path from the root. If every node on that path knew how many words pass through it, how fast could you answer count(p)?",
    "Node = {child: map from letter to node, pass: number of stored words through this node, isEnd: does a word end here}. Write a Walk(root, w) helper that follows w's letters and returns the node or null.",
    "Insert: if Walk finds w already marked isEnd, stop. Otherwise go down from the root creating missing children and add 1 to pass at the root and every node on the path; set isEnd at the end. count(p) = Walk(p).pass (0 if null).",
  ],
  starter: {
    pseudo: `ALGORITHM TrieOps(ops)
    // ops[k] is ["insert", w], ["count", p] or ["has", w]
    root ← NewNode()
    out ← []
    for each op in ops do
        ...
    return out

ALGORITHM NewNode()
    t ← new Node
    t.child ← map()
    t.pass ← 0
    t.isEnd ← false
    return t`,
    js: `function TrieOps(ops) {
  const newNode = () => ({ child: new Map(), pass: 0, isEnd: false });
  const root = newNode(), out = [];
  // ...
  return out;
}`,
  },
  solution: {
    pseudo: `ALGORITHM TrieOps(ops)
    root ← NewNode()
    out ← []
    for each op in ops do
        w ← op[1]
        x ← Walk(root, w)
        if op[0] = "insert" then
            if x = null or not x.isEnd then
                node ← root
                node.pass ← node.pass + 1
                for i ← 0 to length(w) - 1 do
                    if not contains(node.child, w[i]) then
                        node.child[w[i]] ← NewNode()
                    node ← node.child[w[i]]
                    node.pass ← node.pass + 1
                node.isEnd ← true
        else if op[0] = "count" then
            if x = null then append(out, 0) else append(out, x.pass)
        else
            append(out, x ≠ null and x.isEnd)
    return out

ALGORITHM NewNode()
    t ← new Node
    t.child ← map()
    t.pass ← 0
    t.isEnd ← false
    return t

ALGORITHM Walk(root, w)
    node ← root
    for i ← 0 to length(w) - 1 do
        if not contains(node.child, w[i]) then return null
        node ← node.child[w[i]]
    return node`,
    js: `function TrieOps(ops) {
  const newNode = () => ({ child: new Map(), pass: 0, isEnd: false });
  const root = newNode(), out = [];
  const walk = (w) => { let t = root; for (const c of w) { t = t.child.get(c); if (!t) return null; } return t; };
  for (const [cmd, w] of ops) {
    const x = walk(w);
    if (cmd === "insert") {
      if (x && x.isEnd) continue;
      let t = root; t.pass++;
      for (const c of w) { if (!t.child.has(c)) t.child.set(c, newNode()); t = t.child.get(c); t.pass++; }
      t.isEnd = true;
    } else if (cmd === "count") out.push(x ? x.pass : 0);
    else out.push(!!(x && x.isEnd));
  }
  return out;
}`,
    python: `def trie_ops(ops):
    def new(): return {"child": {}, "pass": 0, "end": False}
    root, out = new(), []
    def walk(w):
        t = root
        for c in w:
            t = t["child"].get(c)
            if t is None: return None
        return t
    for cmd, w in ops:
        x = walk(w)
        if cmd == "insert":
            if x and x["end"]: continue
            t = root; t["pass"] += 1
            for c in w:
                t = t["child"].setdefault(c, new()); t["pass"] += 1
            t["end"] = True
        elif cmd == "count":
            out.append(x["pass"] if x else 0)
        else:
            out.append(bool(x and x["end"]))
    return out`,
    explain: "Each node's pass counter equals the number of stored words whose path goes through it, so count(p) is one walk of |p| steps. Every operation does O(L) map lookups for a word of length L — independent of the number of stored words n — while a list scan would cost O(n·L) per query.",
  },
  complexity: "O(L) per operation for a word of length L",
  followUp: "Real routers do longest-prefix match on 32-bit Internet Protocol addresses with compressed radix tries such as Practical Algorithm To Retrieve Information Coded In Alphanumeric (PATRICIA) tries, and search engines like Lucene store their term dictionaries as compressed tries or finite-state transducers (FSTs). How would you support delete(w) so the counters stay right?",
  distractors: ["            append(out, x ≠ null)", "                    node.child[w[i]] ← node", "            if x = null then append(out, 1) else append(out, x.pass)"],
  visual: "sims/trie.html",
  lesson: "lessons/13-advanced-data-structures/README.md",
});

ForgeProblems.add({
  id: "lru-cache-ops",
  title: "Least Recently Used (LRU) Cache",
  level: 6, chapter: 13, difficulty: 3,
  topics: ["hash map", "doubly linked list", "caching", "design"],
  strategy: "Hash map + doubly linked list",
  source: "Interview classic · Lesson 13 Build Card 7",
  summary: "Simulate a Least Recently Used (LRU) cache with O(1) get and put.",
  statement: `
<p>Every layer of a computer caches: processor caches, the operating system's page cache, database buffer pools, content delivery networks.
The most common eviction rule is <b>Least Recently Used (LRU)</b>: when the cache is full, throw out the entry that was touched longest ago.</p>
<p>Write <code>LRUCache(capacity, ops)</code> for a cache holding at most <code>capacity ≥ 1</code> entries:</p>
<ul>
<li><code>["get", key]</code> — <b>output</b> the value stored for <code>key</code>, or <code>-1</code> if it isn't cached. A hit makes <code>key</code> the most recently used.</li>
<li><code>["put", key, value]</code> — store the value (overwriting an existing one) and make <code>key</code> the most recently used. If this adds a NEW key
to a full cache, first evict the least recently used key. No output.</li>
</ul>
<p>Return the list of outputs (one per <code>get</code>). <b>Both operations must be O(1)</b>: searching a list of cached keys is Θ(capacity) per operation, and the grader checks growth.</p>
<p>Forge Pseudocode tips: records via <code>x ← new Node</code> with fields like <code>x.prev</code>, <code>x.next</code>, <code>x.key</code>;
maps via <code>M ← map()</code>, <code>M[k] ← x</code>, <code>contains(M, k)</code>, <code>remove(M, k)</code>, <code>length(M)</code>.</p>`,
  entry: "LRUCache",
  params: ["capacity", "ops"],
  tests: [
    { args: [3, [["put", 1, 1], ["put", 2, 2], ["put", 3, 3], ["get", 1], ["put", 4, 4], ["get", 2], ["get", 3], ["put", 5, 5], ["get", 1], ["get", 4]]], expect: [1, -1, 3, -1, 4], explain: "The lesson's trace: get 1 saves key 1, so put 4 evicts 2; later put 5 evicts 1." },
    { args: [2, [["put", 1, 1], ["put", 2, 2], ["put", 1, 10], ["put", 3, 3], ["get", 1], ["get", 2]]], expect: [10, -1], explain: "Overwriting key 1 also refreshes it, so key 2 is the one evicted." },
    { args: [1, [["put", 1, 1], ["put", 2, 2], ["get", 1], ["get", 2]]], expect: [-1, 2], explain: "Capacity 1: every new key evicts the previous one." },
    { args: [2, [["put", 1, 1], ["put", 2, 2], ["put", 2, 20], ["get", 1], ["get", 2]]], expect: [1, 20], explain: "Updating an EXISTING key never evicts anything, even when the cache is full." },
    { args: [2, [["get", 7], ["put", 7, 70], ["get", 7]]], expect: [-1, 70] },
    { args: [3, [["put", 1, 1], ["put", 2, 2], ["put", 3, 3], ["get", 2], ["get", 1], ["put", 4, 4], ["get", 3], ["get", 2], ["get", 1], ["get", 4]]], expect: [2, 1, -1, 2, 1, 4] },
  ],
  random: {
    count: 25,
    gen: (r, i) => {
      const cap = r.int(1, 4), keys = r.int(2, 7), ops = [];
      for (let k = 0; k < 6 + i; k++) ops.push(r() < 0.5 ? ["put", r.int(1, keys), r.int(1, 99)] : ["get", r.int(1, keys)]);
      return [cap, ops];
    },
  },
  reference: (cap, ops) => {
    const M = new Map(), out = [];
    for (const op of ops) {
      if (op[0] === "get") { if (M.has(op[1])) { const v = M.get(op[1]); M.delete(op[1]); M.set(op[1], v); out.push(v); } else out.push(-1); }
      else { if (M.has(op[1])) M.delete(op[1]); else if (M.size === cap) M.delete(M.keys().next().value); M.set(op[1], op[2]); }
    }
    return out;
  },
  growth: {
    metric: "steps", sizes: [32, 64, 128, 256, 512],
    gen: (r, n) => { const ops = []; for (let k = 0; k < n; k++) ops.push(r() < 0.5 ? ["put", r.int(0, n), k] : ["get", r.int(0, n)]); return [Math.max(1, n / 4), ops]; },
    expect: "n",
  },
  mutants: [
    { fn: (cap, ops) => { const M = new Map(), out = []; for (const op of ops) { if (op[0] === "get") out.push(M.has(op[1]) ? M.get(op[1]) : -1); else { if (M.has(op[1])) M.delete(op[1]); else if (M.size === cap) M.delete(M.keys().next().value); M.set(op[1], op[2]); } } return out; }, hint: "A successful get doesn't seem to count as a use: your cache evicts in plain insertion (FIFO) order. On a hit, move the entry to the most-recent end." },
    { fn: (cap, ops) => { const M = new Map(), out = []; for (const op of ops) { if (op[0] === "get") { if (M.has(op[1])) { const v = M.get(op[1]); M.delete(op[1]); M.set(op[1], v); out.push(v); } else out.push(-1); } else { if (M.has(op[1])) M.set(op[1], op[2]); else { if (M.size === cap) M.delete(M.keys().next().value); M.set(op[1], op[2]); } } } return out; }, hint: "Overwriting an existing key updates its value but leaves it in its old place in the recency order. A put is a use too — move that entry to the most-recent end." },
    { fn: (cap, ops) => { const M = new Map(), out = []; for (const op of ops) { if (op[0] === "get") { if (M.has(op[1])) { const v = M.get(op[1]); M.delete(op[1]); M.set(op[1], v); out.push(v); } else out.push(-1); } else { if (M.has(op[1])) M.delete(op[1]); else if (M.size > cap) M.delete(M.keys().next().value); M.set(op[1], op[2]); } } return out; }, hint: "Your cache holds one entry too many. Evict when the cache already holds capacity entries (size = capacity) before adding a new key." },
    { fn: (cap, ops) => { const M = new Map(), out = []; for (const op of ops) { if (op[0] === "get") { if (M.has(op[1])) { const v = M.get(op[1]); M.delete(op[1]); M.set(op[1], v); out.push(v); } else out.push(-1); } else { if (M.size === cap) M.delete(M.keys().next().value); M.delete(op[1]); M.set(op[1], op[2]); } } return out; }, hint: "You evict whenever the cache is full — even when the put only UPDATES a key that is already cached. Check for an existing key first; only a brand-new key needs room." },
  ],
  hints: [
    "You need two things in O(1): find the entry for a key, and know which entry is the least recently used (and reorder entries as they're used). Can one structure do both?",
    "A map from key → node finds entries; a doubly linked list keeps nodes in recency order (least recent right after a head sentinel, most recent right before a tail sentinel). Unlinking a node you already hold is O(1).",
    "get hit: unlink the node and re-insert it before the tail. put new key when length(M) = capacity: the victim is head.next — unlink it and remove(M, victim.key), then insert the new node before the tail.",
  ],
  starter: {
    pseudo: `ALGORITHM LRUCache(capacity, ops)
    // ops[k] is ["get", key] or ["put", key, value]; output one value per get
    head ← new Node
    tail ← new Node
    head.next ← tail
    tail.prev ← head
    M ← map()
    out ← []
    for each op in ops do
        ...
    return out

ALGORITHM Unlink(x)
    ...

ALGORITHM InsertBefore(tail, x)
    ...`,
    js: `function LRUCache(capacity, ops) {
  const out = [];
  // hash map + doubly linked list (a JS Map remembers insertion order — that works too!)
  return out;
}`,
  },
  solution: {
    pseudo: `ALGORITHM LRUCache(capacity, ops)
    head ← new Node
    tail ← new Node
    head.next ← tail
    tail.prev ← head
    M ← map()
    out ← []
    for each op in ops do
        if contains(M, op[1]) then
            node ← M[op[1]]
            Unlink(node)
            InsertBefore(tail, node)
            if op[0] = "get" then append(out, node.value) else node.value ← op[2]
        else if op[0] = "get" then
            append(out, -1)
        else
            if length(M) = capacity then
                old ← head.next
                Unlink(old)
                remove(M, old.key)
            node ← new Node
            node.key ← op[1]
            node.value ← op[2]
            M[op[1]] ← node
            InsertBefore(tail, node)
    return out

ALGORITHM Unlink(x)
    x.prev.next ← x.next
    x.next.prev ← x.prev

ALGORITHM InsertBefore(tail, x)
    x.prev ← tail.prev
    x.next ← tail
    tail.prev.next ← x
    tail.prev ← x`,
    js: `function LRUCache(capacity, ops) {
  const head = {}, tail = {};
  head.next = tail; tail.prev = head;
  const M = new Map(), out = [];
  const unlink = (x) => { x.prev.next = x.next; x.next.prev = x.prev; };
  const insertBefore = (x) => { x.prev = tail.prev; x.next = tail; tail.prev.next = x; tail.prev = x; };
  for (const op of ops) {
    const key = op[1];
    if (M.has(key)) {
      const node = M.get(key);
      unlink(node); insertBefore(node);
      if (op[0] === "get") out.push(node.value); else node.value = op[2];
    } else if (op[0] === "get") out.push(-1);
    else {
      if (M.size === capacity) { const old = head.next; unlink(old); M.delete(old.key); }
      const node = { key, value: op[2] };
      M.set(key, node); insertBefore(node);
    }
  }
  return out;
}`,
    python: `from collections import OrderedDict
def lru_cache(capacity, ops):
    M, out = OrderedDict(), []          # OrderedDict = hash map + doubly linked list
    for op in ops:
        key = op[1]
        if key in M:
            M.move_to_end(key)
            if op[0] == "get": out.append(M[key])
            else: M[key] = op[2]
        elif op[0] == "get":
            out.append(-1)
        else:
            if len(M) == capacity:
                M.popitem(last=False)   # least recently used
            M[key] = op[2]
    return out`,
    explain: "The map finds a key's node in O(1) expected time; with prev/next pointers a node can be unlinked and re-inserted before the tail sentinel in O(1), and the least recently used node is always head.next. So every get and put is O(1) and m operations cost Θ(m); the sentinels remove all empty-list special cases.",
  },
  complexity: "O(1) per operation (expected, because of hashing)",
  followUp: "Pure LRU is fooled by one big sequential scan that flushes the whole cache. PostgreSQL uses a clock-sweep approximation, MySQL's InnoDB splits its LRU list into young and old parts, and Redis samples a few random keys instead of keeping an exact list. Which would you pick for a 64-core server, and why does a single global linked list become a lock-contention problem?",
  distractors: ["            if length(M) > capacity then", "            old ← tail.prev", "    x.prev.next ← x.prev"],
  lesson: "lessons/13-advanced-data-structures/README.md",
});

ForgeProblems.add({
  id: "fenwick-range-sum",
  title: "Fenwick Tree: Range Sums with Updates",
  level: 5, chapter: 13, difficulty: 2,
  topics: ["Fenwick tree", "binary indexed tree", "prefix sums", "range queries"],
  strategy: "Binary Indexed Tree (BIT)",
  source: "Interview classic · Lesson 13 Build Card 3 (Fenwick 1994)",
  summary: "Answer range-sum queries on an array that keeps changing, O(log n) per operation.",
  statement: `
<p>A prefix-sum array answers "sum of A[l..r]" in O(1) but needs O(n) work per update; a plain array is the reverse.
A <b>Fenwick tree</b> — also called a Binary Indexed Tree (BIT) — does both in O(log n) with just one extra array.</p>
<p>Write <code>RangeSumOps(A, ops)</code>, where <code>A[0..n-1]</code> (n ≥ 1) is the starting array and each operation is:</p>
<ul>
<li><code>["add", i, delta]</code> — <code>A[i] ← A[i] + delta</code> (0-based index). No output.</li>
<li><code>["sum", l, r]</code> — <b>output</b> <code>A[l] + … + A[r]</code> (0-based, inclusive, l ≤ r).</li>
</ul>
<p>Return the list of outputs. <b>Every operation must be O(log n)</b> (building may be O(n log n)); the grader checks growth.</p>
<p>Forge Pseudocode has no bitwise AND, so compute <code>LowBit(i)</code> (the value of i's lowest 1-bit: LowBit(6) = 2, LowBit(8) = 8)
arithmetically: double <code>p</code> starting from 1 while <code>i mod (2p) = 0</code>. Inside the update and query loops LowBit only
ever grows, so you can keep <code>p</code> from one step to the next instead of restarting at 1.</p>`,
  entry: "RangeSumOps",
  params: ["A", "ops"],
  tests: [
    { args: [[3, 2, -1, 6, 5, 4, -3, 3], [["sum", 0, 5], ["sum", 2, 5], ["add", 2, 2], ["sum", 0, 5], ["sum", 2, 2]]], expect: [19, 14, 21, 1], explain: "The lesson's trace (shifted to 0-based): A[2] goes from −1 to 1." },
    { args: [[5], [["sum", 0, 0], ["add", 0, -5], ["sum", 0, 0]]], expect: [5, 0], explain: "A one-element array." },
    { args: [[1, 1, 1, 1], [["sum", 1, 1], ["sum", 3, 3], ["sum", 0, 3], ["add", 3, 10], ["sum", 2, 3]]], expect: [1, 1, 4, 12], explain: "Single-cell ranges at both ends catch off-by-one errors." },
    { args: [[0, 0, 0, 0, 0, 0, 0], [["add", 6, 4], ["add", 0, 1], ["add", 6, 4], ["sum", 0, 6], ["sum", 1, 5], ["sum", 6, 6]]], expect: [9, 0, 8], explain: "Two adds to the same cell accumulate (they don't overwrite)." },
    { args: [[4, -2, 7, 1, 0, 9], [["sum", 1, 4], ["add", 5, -9], ["add", 1, 2], ["sum", 0, 5], ["sum", 4, 5]]], expect: [6, 12, 0] },
    { args: [[2, 7, 1, 8, 2, 8, 1, 8, 2], [["sum", 0, 8], ["sum", 7, 8], ["add", 4, 3], ["sum", 3, 5], ["sum", 4, 4]]], expect: [39, 10, 21, 5] },
  ],
  random: {
    count: 25,
    gen: (r, i) => {
      const n = 1 + i, A = r.array(n, -9, 9), ops = [];
      for (let k = 0; k < 4 + i; k++) {
        if (r() < 0.4) ops.push(["add", r.int(0, n - 1), r.int(-5, 5)]);
        else { const l = r.int(0, n - 1); ops.push(["sum", l, r.int(l, n - 1)]); }
      }
      return [A, ops];
    },
  },
  reference: (A, ops) => { const a = A.slice(), out = []; for (const op of ops) { if (op[0] === "add") a[op[1]] += op[2]; else { let s = 0; for (let i = op[1]; i <= op[2]; i++) s += a[i]; out.push(s); } } return out; },
  growth: {
    metric: "steps", sizes: [32, 64, 128, 256, 512],
    gen: (r, n) => { const ops = []; for (let k = 0; k < n; k++) { if (k % 2) ops.push(["add", r.int(0, n - 1), r.int(-5, 5)]); else { const l = r.int(0, n / 4); ops.push(["sum", l, r.int(n / 2, n - 1)]); } } return [r.array(n, -9, 9), ops]; },
    expect: "n log n",
  },
  mutants: [
    { fn: (A, ops) => { const a = A.slice(), out = []; for (const op of ops) { if (op[0] === "add") a[op[1]] += op[2]; else { let s = 0; for (let i = op[1] + 1; i <= op[2]; i++) s += a[i]; out.push(s); } } return out; }, hint: "Your sums leave out A[l]. With 1-based prefix sums, sum(l..r) (0-based) = Prefix(r + 1) − Prefix(l): subtract the prefix that ends just BEFORE l." },
    { fn: (A, ops) => { const a = A.slice(), out = []; for (const op of ops) { if (op[0] === "add") a[op[1]] += op[2]; else { let s = 0; for (let i = op[1]; i < op[2]; i++) s += a[i]; out.push(s); } } return out; }, hint: "Your sums stop one cell early — r is inclusive. The upper prefix must include A[r], i.e. Prefix(r + 1) in 1-based Fenwick indexing." },
    { fn: (A, ops) => { const a = A.slice(), out = []; for (const op of ops) { if (op[0] === "add") a[op[1]] = op[2]; else { let s = 0; for (let i = op[1]; i <= op[2]; i++) s += a[i]; out.push(s); } } return out; }, hint: "\"add\" should ADD delta to A[i], not overwrite A[i] with it. In a Fenwick tree an update is always 'add δ' along the climbing path." },
    { fn: (A, ops) => { const out = []; for (const op of ops) { if (op[0] === "sum") { let s = 0; for (let i = op[1]; i <= op[2]; i++) s += A[i]; out.push(s); } } return out; }, hint: "Your answers never change after an \"add\" — the updates are being ignored (a prefix-sum table built once can't see them). Apply every add to the tree cells that cover index i." },
  ],
  hints: [
    "Split the question in two: sum(l..r) = (sum of the first r + 1 elements) − (sum of the first l). So you only need fast PREFIX sums that survive point updates.",
    "Keep T[1..n] where T[i] stores the sum of the LowBit(i) elements ending at position i (1-based). Prefix(i) adds T[i] and jumps i ← i − LowBit(i); Add(i, δ) adds δ to T[i] and climbs i ← i + LowBit(i) while i ≤ n.",
    "Build by calling Add(j + 1, A[j]) for every j. Then \"add\" → Add(i + 1, δ); \"sum\" → Prefix(r + 1) − Prefix(l). For LowBit: p ← 1 before the loop; inside, while i mod (2p) = 0 do p ← 2p.",
  ],
  starter: {
    pseudo: `ALGORITHM RangeSumOps(A[0..n-1], ops)
    // ops[k] is ["add", i, delta] or ["sum", l, r]  (0-based, inclusive)
    T ← array(n + 1, 0)          // Fenwick tree, T[1..n] used
    ...
    return out

ALGORITHM Add(T, n, i, delta)
    // add delta at 1-based position i
    ...

ALGORITHM Prefix(T, i)
    // A[1] + ... + A[i] (1-based)
    ...`,
    js: `function RangeSumOps(A, ops) {
  const n = A.length, T = Array(n + 1).fill(0);
  const add = (i, d) => { for (; i <= n; i += i & -i) T[i] += d; };
  const prefix = (i) => { let s = 0; for (; i > 0; i -= i & -i) s += T[i]; return s; };
  // ...
}`,
  },
  solution: {
    pseudo: `ALGORITHM RangeSumOps(A[0..n-1], ops)
    T ← array(n + 1, 0)
    for j ← 0 to n - 1 do
        Add(T, n, j + 1, A[j])
    out ← []
    for each op in ops do
        if op[0] = "add" then
            Add(T, n, op[1] + 1, op[2])
        else
            append(out, Prefix(T, op[2] + 1) - Prefix(T, op[1]))
    return out

ALGORITHM Add(T, n, i, delta)
    p ← 1
    while i ≤ n do
        while i mod (2 * p) = 0 do
            p ← 2 * p
        T[i] ← T[i] + delta
        i ← i + p

ALGORITHM Prefix(T, i)
    s ← 0
    p ← 1
    while i > 0 do
        while i mod (2 * p) = 0 do
            p ← 2 * p
        s ← s + T[i]
        i ← i - p
    return s`,
    js: `function RangeSumOps(A, ops) {
  const n = A.length, T = Array(n + 1).fill(0);
  const add = (i, d) => { for (; i <= n; i += i & -i) T[i] += d; };
  const prefix = (i) => { let s = 0; for (; i > 0; i -= i & -i) s += T[i]; return s; };
  A.forEach((x, j) => add(j + 1, x));
  const out = [];
  for (const op of ops) {
    if (op[0] === "add") add(op[1] + 1, op[2]);
    else out.push(prefix(op[2] + 1) - prefix(op[1]));
  }
  return out;
}`,
    python: `def range_sum_ops(A, ops):
    n = len(A); T = [0] * (n + 1)
    def add(i, d):
        while i <= n:
            T[i] += d; i += i & -i
    def prefix(i):
        s = 0
        while i > 0:
            s += T[i]; i -= i & -i
        return s
    for j, x in enumerate(A):
        add(j + 1, x)
    out = []
    for op in ops:
        if op[0] == "add": add(op[1] + 1, op[2])
        else: out.append(prefix(op[2] + 1) - prefix(op[1]))
    return out`,
    explain: "Prefix(i) clears one 1-bit of i per step and Add(i) moves to an index with a strictly larger lowest bit, so each loop runs at most ⌊log₂ n⌋ + 1 times (and the p-doubling adds at most log₂ n more in total). So the build is Θ(n log n) and each operation O(log n), versus Θ(n) per query for a plain scan.",
  },
  complexity: "O(log n) per add / sum, n + 1 cells of memory",
  followUp: "Fenwick trees need an invertible operation, such as sums or exclusive-or (XOR). How would you support 'add δ to every element of A[l..r]' with two Fenwick trees? Time-series databases and analytics engines use exactly these prefix-aggregate structures for fast rolling-window sums.",
  distractors: ["            append(out, Prefix(T, op[2]) - Prefix(T, op[1]))", "        T[i] ← delta", "    while i ≥ 0 do"],
  visual: "sims/segment-tree.html",
  lesson: "lessons/13-advanced-data-structures/README.md",
});

ForgeProblems.add({
  id: "segment-tree-range-min",
  title: "Segment Tree: Range Minimum with Updates",
  level: 5, chapter: 13, difficulty: 2,
  topics: ["segment tree", "range queries", "divide-and-conquer", "recursion"],
  strategy: "Segment tree (divide-and-conquer over index ranges)",
  source: "Interview classic · Lesson 13 Build Card 4",
  summary: "Point-assign and range-minimum queries in O(log n) each.",
  statement: `
<p>A Fenwick tree can't answer range <b>minimum</b> (min has no inverse, so you can't "subtract" a prefix). A <b>segment tree</b> can:
it stores the answer for a tree of index ranges and combines O(log n) of them per query. It works for any associative operation.</p>
<p>Write <code>RangeMinOps(A, ops)</code> for a starting array <code>A[0..n-1]</code> (n ≥ 1) and operations:</p>
<ul>
<li><code>["set", i, v]</code> — <code>A[i] ← v</code> (0-based). No output.</li>
<li><code>["min", l, r]</code> — <b>output</b> the minimum of <code>A[l..r]</code> (0-based, inclusive, l ≤ r).</li>
</ul>
<p>Return the list of outputs. <b>Each operation must be O(log n)</b>; building may be O(n). The grader checks growth.</p>
<p>Layout tip: store the tree in an array <code>S</code> of size 4n; node <code>k</code> has children <code>2k</code> and <code>2k+1</code>, the root is node 1 and covers <code>[0..n-1]</code>.</p>`,
  entry: "RangeMinOps",
  params: ["A", "ops"],
  tests: [
    { args: [[2, 5, 1, 4, 9, 3], [["min", 0, 5], ["min", 3, 5], ["set", 2, 7], ["min", 0, 5], ["min", 1, 2]]], expect: [1, 3, 2, 5], explain: "After A[2] becomes 7 the overall minimum is back to 2." },
    { args: [[8], [["min", 0, 0], ["set", 0, -1], ["min", 0, 0]]], expect: [8, -1], explain: "A single element is its own range." },
    { args: [[4, 4, 4, 4], [["set", 1, 9], ["min", 1, 1], ["min", 0, 3], ["set", 0, 9], ["set", 2, 9], ["set", 3, 9], ["min", 0, 3]]], expect: [9, 4, 9], explain: "Raising values must raise the stored minimums too." },
    { args: [[5, 1, 6, 2, 7], [["min", 2, 3], ["min", 4, 4], ["min", 0, 1], ["set", 1, 10], ["min", 0, 2], ["min", 1, 3]]], expect: [2, 7, 1, 5, 2] },
    { args: [[3, -2, 8, -2, 0, 11, 6], [["min", 4, 6], ["set", 3, 5], ["min", 2, 6], ["set", 1, 1], ["min", 0, 6], ["min", 5, 5]]], expect: [0, 0, 0, 11] },
    { args: [[10, 20, 30, 40, 50, 60, 70, 80, 90], [["min", 8, 8], ["set", 8, 5], ["min", 0, 8], ["min", 6, 7], ["set", 0, 1], ["min", 0, 4]]], expect: [90, 5, 70, 1] },
  ],
  random: {
    count: 25,
    gen: (r, i) => {
      const n = 1 + i, A = r.array(n, -20, 20), ops = [];
      for (let k = 0; k < 4 + i; k++) {
        if (r() < 0.4) ops.push(["set", r.int(0, n - 1), r.int(-20, 20)]);
        else { const l = r.int(0, n - 1); ops.push(["min", l, r.int(l, n - 1)]); }
      }
      return [A, ops];
    },
  },
  reference: (A, ops) => { const a = A.slice(), out = []; for (const op of ops) { if (op[0] === "set") a[op[1]] = op[2]; else out.push(Math.min(...a.slice(op[1], op[2] + 1))); } return out; },
  growth: {
    metric: "steps", sizes: [32, 64, 128, 256, 512],
    gen: (r, n) => { const ops = []; for (let k = 0; k < n; k++) { if (k % 2) ops.push(["set", r.int(0, n - 1), r.int(0, 999)]); else { const l = r.int(0, n / 4); ops.push(["min", l, r.int(n / 2, n - 1)]); } } return [r.array(n, 0, 999), ops]; },
    expect: "n log n",
  },
  mutants: [
    { fn: (A, ops) => { const out = []; for (const op of ops) if (op[0] === "min") out.push(Math.min(...A.slice(op[1], op[2] + 1))); return out; }, hint: "Your minimums never react to \"set\" — it's as if the tree was built once and never updated. A point update must change the leaf and then recompute every ancestor on the way back up." },
    { fn: (A, ops) => { const a = A.slice(), out = []; for (const op of ops) { if (op[0] === "set") a[op[1]] = op[2]; else out.push(Math.min(...a.slice(op[1], Math.max(op[1] + 1, op[2])))); } return out; }, hint: "The right end r seems to be excluded. The range is inclusive: a node covering [l..r] is fully inside the query when ql ≤ l and r ≤ qr." },
    {
      fn: (A, ops) => {
        const n = A.length, S = Array(4 * n).fill(Infinity), out = [];
        const build = (k, l, r) => { if (l === r) { S[k] = A[l]; return; } const m = (l + r) >> 1; build(2 * k, l, m); build(2 * k + 1, m + 1, r); S[k] = Math.min(S[2 * k], S[2 * k + 1]); };
        const q = (k, l, r, a, b) => { if (b < l || r < a) return Infinity; if (a <= l && r <= b) return S[k]; const m = (l + r) >> 1; return Math.min(q(2 * k, l, m, a, b), q(2 * k + 1, m + 1, r, a, b)); };
        const upd = (k, l, r, i, v) => { if (l === r) { S[k] = v; return; } S[k] = Math.min(S[k], v); const m = (l + r) >> 1; if (i <= m) upd(2 * k, l, m, i, v); else upd(2 * k + 1, m + 1, r, i, v); };
        build(1, 0, n - 1);
        for (const op of ops) { if (op[0] === "set") upd(1, 0, n - 1, op[1], op[2]); else out.push(q(1, 0, n - 1, op[1], op[2])); }
        return out;
      },
      hint: "Updates that make a value BIGGER don't reach the ancestors: a node's minimum must be RECOMPUTED from its two children after the recursive call (S[k] ← min(S[2k], S[2k+1])), not combined with the new value on the way down.",
    },
  ],
  hints: [
    "Split [0..n−1] in half, and each half in half again. If every piece knew its own minimum, how many pieces do you need to cover any query range exactly?",
    "Write three recursive helpers on (node, l, r): Build (leaf = A[l], internal = min of children), Query(ql, qr) and Update(i, v).",
    "Query: if [l..r] is outside [ql..qr] return ∞; if fully inside return S[node]; otherwise return the min of both children. Update: recurse toward i, set the leaf, and on the way back recompute S[node] ← min(S[2·node], S[2·node + 1]).",
  ],
  starter: {
    pseudo: `ALGORITHM RangeMinOps(A[0..n-1], ops)
    // ops[k] is ["set", i, v] or ["min", l, r]
    S ← array(4 * n, ∞)
    Build(A, S, 1, 0, n - 1)
    out ← []
    ...
    return out

ALGORITHM Build(A, S, node, l, r)
    ...`,
    js: `function RangeMinOps(A, ops) {
  const n = A.length, S = Array(4 * n).fill(Infinity);
  // build / query / update helpers ...
}`,
  },
  solution: {
    pseudo: `ALGORITHM RangeMinOps(A[0..n-1], ops)
    S ← array(4 * n, ∞)
    Build(A, S, 1, 0, n - 1)
    out ← []
    for each op in ops do
        if op[0] = "set" then
            Update(S, 1, 0, n - 1, op[1], op[2])
        else
            append(out, Query(S, 1, 0, n - 1, op[1], op[2]))
    return out

ALGORITHM Build(A, S, node, l, r)
    if l = r then
        S[node] ← A[l]
        return
    mid ← (l + r) div 2
    Build(A, S, 2 * node, l, mid)
    Build(A, S, 2 * node + 1, mid + 1, r)
    S[node] ← min(S[2 * node], S[2 * node + 1])

ALGORITHM Query(S, node, l, r, ql, qr)
    if qr < l or r < ql then return ∞
    if ql ≤ l and r ≤ qr then return S[node]
    mid ← (l + r) div 2
    return min(Query(S, 2 * node, l, mid, ql, qr), Query(S, 2 * node + 1, mid + 1, r, ql, qr))

ALGORITHM Update(S, node, l, r, i, v)
    if l = r then
        S[node] ← v
        return
    mid ← (l + r) div 2
    if i ≤ mid then
        Update(S, 2 * node, l, mid, i, v)
    else
        Update(S, 2 * node + 1, mid + 1, r, i, v)
    S[node] ← min(S[2 * node], S[2 * node + 1])`,
    js: `function RangeMinOps(A, ops) {
  const n = A.length, S = Array(4 * n).fill(Infinity), out = [];
  const build = (k, l, r) => {
    if (l === r) { S[k] = A[l]; return; }
    const m = (l + r) >> 1; build(2 * k, l, m); build(2 * k + 1, m + 1, r);
    S[k] = Math.min(S[2 * k], S[2 * k + 1]);
  };
  const query = (k, l, r, a, b) => {
    if (b < l || r < a) return Infinity;
    if (a <= l && r <= b) return S[k];
    const m = (l + r) >> 1;
    return Math.min(query(2 * k, l, m, a, b), query(2 * k + 1, m + 1, r, a, b));
  };
  const update = (k, l, r, i, v) => {
    if (l === r) { S[k] = v; return; }
    const m = (l + r) >> 1;
    if (i <= m) update(2 * k, l, m, i, v); else update(2 * k + 1, m + 1, r, i, v);
    S[k] = Math.min(S[2 * k], S[2 * k + 1]);
  };
  build(1, 0, n - 1);
  for (const op of ops) {
    if (op[0] === "set") update(1, 0, n - 1, op[1], op[2]);
    else out.push(query(1, 0, n - 1, op[1], op[2]));
  }
  return out;
}`,
    python: `def range_min_ops(A, ops):
    n = len(A); S = [float("inf")] * (4 * n); out = []
    def build(k, l, r):
        if l == r: S[k] = A[l]; return
        m = (l + r) // 2
        build(2*k, l, m); build(2*k+1, m+1, r)
        S[k] = min(S[2*k], S[2*k+1])
    def query(k, l, r, a, b):
        if b < l or r < a: return float("inf")
        if a <= l and r <= b: return S[k]
        m = (l + r) // 2
        return min(query(2*k, l, m, a, b), query(2*k+1, m+1, r, a, b))
    def update(k, l, r, i, v):
        if l == r: S[k] = v; return
        m = (l + r) // 2
        if i <= m: update(2*k, l, m, i, v)
        else: update(2*k+1, m+1, r, i, v)
        S[k] = min(S[2*k], S[2*k+1])
    build(1, 0, n - 1)
    for op in ops:
        if op[0] == "set": update(1, 0, n - 1, op[1], op[2])
        else: out.append(query(1, 0, n - 1, op[1], op[2]))
    return out`,
    explain: "The tree has height ⌈log₂ n⌉. A query keeps recursing into at most two partially-covered nodes per level (at most 4 nodes visited per level), and an update touches one root-to-leaf path, so both are O(log n); the build visits about 2n nodes, Θ(n). Divide-and-conquer with the recurrence T(n) = 2T(n/2) + Θ(1) = Θ(n) for the build.",
  },
  complexity: "Θ(n) build, O(log n) per query / update",
  followUp: "Add 'add v to every element of A[l..r]' in O(log n) with lazy propagation (tags that say 'my children still owe +v'). Booking systems use exactly this to answer 'max concurrent reservations in this time window' after each new booking.",
  distractors: ["    if ql ≤ l or r ≤ qr then return S[node]", "    S[node] ← min(S[node], v)", "    if qr ≤ l or r ≤ ql then return ∞"],
  visual: "sims/segment-tree.html",
  lesson: "lessons/13-advanced-data-structures/README.md",
});

ForgeProblems.add({
  id: "sliding-window-max",
  title: "Sliding Window Maximum (Monotonic Deque)",
  level: 5, chapter: 13, difficulty: 2,
  topics: ["deque", "monotonic queue", "sliding window", "streaming"],
  strategy: "Monotonic deque of indices",
  source: "Interview classic",
  summary: "Maximum of every window of k consecutive elements in Θ(n) total.",
  statement: `
<p>Monitoring dashboards show "the peak value over the last k seconds" and update it every second. Recomputing the max of each
window costs Θ(n·k). A <b>monotonic deque</b> does all windows in Θ(n) total.</p>
<p>Write <code>WindowMax(A, k)</code>: given <code>A[0..n-1]</code> and <code>1 ≤ k ≤ n</code>, return the list of the maximums of the windows
<code>A[0..k-1], A[1..k], …, A[n-k..n-1]</code> (that's <code>n − k + 1</code> values).</p>
<p><b>Must be linear:</b> the grader counts array reads (<code>A[i]</code> and slices) and checks that they grow like n, even when k is large.</p>
<p>A deque in Forge Pseudocode: an array <code>D</code> plus a front index <code>head</code>; the front is <code>D[head]</code>, pop the front with
<code>head ← head + 1</code>, pop the back with <code>removeLast(D)</code>, and the deque is empty when <code>length(D) = head</code>.</p>`,
  entry: "WindowMax",
  params: ["A", "k"],
  tests: [
    { args: [[1, 3, -1, -3, 5, 3, 6, 7], 3], expect: [3, 3, 5, 5, 6, 7], explain: "Windows [1,3,−1], [3,−1,−3], [−1,−3,5], [−3,5,3], [5,3,6], [3,6,7]." },
    { args: [[9, 5, 4, 1], 2], expect: [9, 5, 4], explain: "When the maximum 9 leaves the window, the next maximum is 5 — not the newest element." },
    { args: [[4, 2, 12, 3], 1], expect: [4, 2, 12, 3], explain: "k = 1: every element is its own window." },
    { args: [[2, 7, 1, 8], 4], expect: [8], explain: "k = n: exactly one window." },
    { args: [[5, 5, 5, 5, 5], 2], expect: [5, 5, 5, 5], explain: "Ties." },
    { args: [[10, 9, 8, 7, 6, 5, 4], 3], expect: [10, 9, 8, 7, 6], explain: "Decreasing input: the maximum always sits at the front and expires first." },
    { args: [[-3, -1, -7, -2, -9, -4], 3], expect: [-1, -1, -2, -2] },
  ],
  random: { count: 25, gen: (r, i) => { const n = 1 + i * 2; return [r.array(n, -30, 30), r.int(1, n)]; } },
  reference: (A, k) => { const out = []; for (let i = 0; i + k <= A.length; i++) out.push(Math.max(...A.slice(i, i + k))); return out; },
  growth: { metric: "arrayReads", sizes: [32, 64, 128, 256, 512], gen: (r, n) => [r.array(n, 0, 1000), n / 2], expect: "n" },
  mutants: [
    { fn: (A, k) => { const out = []; for (let i = 0; i + k < A.length; i++) out.push(Math.max(...A.slice(i, i + k))); return out; }, hint: "The last window is missing: there are n − k + 1 windows. Output a maximum for every i from k − 1 through n − 1." },
    { fn: (A, k) => { const out = []; for (let i = k - 1; i < A.length; i++) out.push(Math.max(...A.slice(Math.max(0, i - k), i + 1))); return out; }, hint: "Your windows hold k + 1 elements: the front index expires one step too late. The window ending at i starts at i − k + 1, so drop D[head] when D[head] ≤ i − k." },
    { fn: (A, k) => { const out = []; let mv = -Infinity, mi = -1; for (let i = 0; i < A.length; i++) { if (mi <= i - k) { mv = A[i]; mi = i; } else if (A[i] >= mv) { mv = A[i]; mi = i; } if (i >= k - 1) out.push(mv); } return out; }, hint: "Remembering just ONE maximum isn't enough: when it slides out of the window you don't know the runner-up. Keep a deque of candidate indices whose values are decreasing from front to back." },
  ],
  hints: [
    "If A[j] ≤ A[i] and j < i, can A[j] EVER be the maximum of a window that also contains A[i]? What does that tell you about which indices are worth remembering?",
    "Keep a deque of indices whose values strictly decrease from front to back. The front is always the current window's maximum.",
    "For each i: pop from the back while A[D[last]] ≤ A[i]; append i; if D[head] ≤ i − k advance head; if i ≥ k − 1 output A[D[head]].",
  ],
  starter: {
    pseudo: `ALGORITHM WindowMax(A[0..n-1], k)
    // Output: maxima of the n − k + 1 windows of length k
    D ← []
    head ← 0
    out ← []
    for i ← 0 to n - 1 do
        ...
    return out`,
    js: `function WindowMax(A, k) {
  const D = [], out = [];   // D holds indices; use a head pointer or shift()
  return out;
}`,
  },
  solution: {
    pseudo: `ALGORITHM WindowMax(A[0..n-1], k)
    D ← []
    head ← 0
    out ← []
    for i ← 0 to n - 1 do
        while length(D) > head and A[D[length(D) - 1]] ≤ A[i] do
            removeLast(D)
        append(D, i)
        if D[head] ≤ i - k then
            head ← head + 1
        if i ≥ k - 1 then
            append(out, A[D[head]])
    return out`,
    js: `function WindowMax(A, k) {
  const D = [], out = [];
  let head = 0;
  for (let i = 0; i < A.length; i++) {
    while (D.length > head && A[D[D.length - 1]] <= A[i]) D.pop();
    D.push(i);
    if (D[head] <= i - k) head++;
    if (i >= k - 1) out.push(A[D[head]]);
  }
  return out;
}`,
    python: `from collections import deque
def window_max(A, k):
    D, out = deque(), []
    for i, x in enumerate(A):
        while D and A[D[-1]] <= x:
            D.pop()
        D.append(i)
        if D[0] <= i - k:
            D.popleft()
        if i >= k - 1:
            out.append(A[D[0]])
    return out`,
    explain: "Every index is appended once and removed at most once (from the back or the front), so the total work is Θ(n) regardless of k — amortized O(1) per element. The deque's values decrease front to back, and anything popped from the back is dominated by a newer, larger-or-equal value, so it can never be a future window's maximum.",
  },
  complexity: "Θ(n) time, O(k) extra space",
  followUp: "The same monotonic-queue trick speeds up dynamic programs of the form dp[i] = max(dp[j]) + c over a sliding range of j, and stream processors (Kafka Streams, Flink) use it for windowed max/min aggregations. What changes if the window is defined by TIME (last 60 seconds) instead of by count?",
  distractors: ["        if D[head] < i - k then", "        while length(D) > head and A[D[length(D) - 1]] ≥ A[i] do", "        if i ≥ k then"],
  visual: "sims/patterns.html",
  lesson: "lessons/13-advanced-data-structures/README.md",
});

ForgeProblems.add({
  id: "median-stream",
  title: "Running Median (Two Heaps)",
  level: 5, chapter: 13, difficulty: 2,
  topics: ["heap", "priority queue", "streaming", "median"],
  strategy: "Max-heap for the lower half, min-heap for the upper half",
  source: "Interview classic · builds on Levitin §6.4 (heaps)",
  summary: "Report the median after every arriving number in O(log n) per number.",
  statement: `
<p>Median response time, median house price, median sensor reading — the median resists outliers, so dashboards love it. But
you can't re-sort the whole stream every time a value arrives.</p>
<p>Write <code>RunningMedian(A)</code>: numbers arrive in the order <code>A[0], A[1], …, A[n-1]</code> (n ≥ 1). After each arrival output the median of
everything seen so far: the middle value for an odd count, the <b>average of the two middle values</b> for an even count (it may be a fraction like 2.5).
Return the list of <code>n</code> medians.</p>
<p><b>Efficiency:</b> O(log n) per arrival. <code>sorted(…)</code> and <code>insertAt(…)</code> are not allowed; use priority queues:
<code>maxPQ()</code> and <code>priorityQueue()</code> (min), <code>insert(Q, x, x)</code>, <code>deleteMax</code> / <code>deleteMin</code>, <code>peek(Q)</code>, <code>length(Q)</code>.</p>`,
  entry: "RunningMedian",
  params: ["A"],
  tests: [
    { args: [[5, 15, 1, 3]], expect: [5, 10, 5, 4], explain: "{5} → 5; {5,15} → 10; {1,5,15} → 5; {1,3,5,15} → (3+5)/2 = 4." },
    { args: [[1, 2]], expect: [1, 1.5], explain: "An even count averages the two middle values — and the answer can be a fraction." },
    { args: [[7]], expect: [7] },
    { args: [[2, 2, 2, 2]], expect: [2, 2, 2, 2], explain: "Duplicates." },
    { args: [[10, 9, 8, 7, 6, 5]], expect: [10, 9.5, 9, 8.5, 8, 7.5], explain: "Decreasing input keeps pushing values into the lower half." },
    { args: [[-4, 6, -1, 0, 3, -8]], expect: [-4, 1, -1, -0.5, 0, -0.5] },
  ],
  random: { count: 25, gen: (r, i) => [r.array(1 + i * 2, -50, 50)] },
  reference: (A) => { const s = [], out = []; for (const x of A) { s.push(x); s.sort((a, b) => a - b); const m = s.length; out.push(m % 2 ? s[(m - 1) / 2] : (s[m / 2 - 1] + s[m / 2]) / 2); } return out; },
  forbid: ["sorted", "insertAt"],
  growth: { metric: "steps", sizes: [32, 64, 128, 256, 512], gen: (r, n) => [r.array(n, 0, 100000)], expect: "n log n" },
  mutants: [
    { fn: (A) => { const s = []; return A.map((x) => { s.push(x); s.sort((a, b) => a - b); return s[Math.floor((s.length - 1) / 2)]; }); }, hint: "For an even count you return only the LOWER middle value. The median of an even count is the average of the two middle values: (top of the lower half + top of the upper half) / 2." },
    { fn: (A) => { const s = []; return A.map((x) => { s.push(x); s.sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; }); }, hint: "For an even count you return only the UPPER middle value. Average the two middle values instead." },
    { fn: (A) => { const s = []; return A.map((x) => { s.push(x); s.sort((a, b) => a - b); const m = s.length; return m % 2 ? s[(m - 1) / 2] : Math.floor((s[m / 2 - 1] + s[m / 2]) / 2); }); }, hint: "Your even-count medians are rounded down. Use real division (/ 2), not div — the median of 1 and 2 is 1.5." },
  ],
  hints: [
    "The median splits the data into a lower half and an upper half. Which single value from each half do you need to see?",
    "Keep the lower half in a MAX-heap and the upper half in a MIN-heap, with the lower half holding either the same number of items or one more.",
    "Insert x into the lower heap if it's empty or x ≤ its max, else into the upper heap. Rebalance by moving one top across if the sizes differ by more than allowed. Odd total → peek(low); even → (peek(low) + peek(high)) / 2.",
  ],
  starter: {
    pseudo: `ALGORITHM RunningMedian(A[0..n-1])
    low ← maxPQ()             // lower half
    high ← priorityQueue()    // upper half (min-heap)
    out ← []
    for each x in A do
        ...
    return out`,
    js: `function RunningMedian(A) {
  const out = [];
  // two heaps (JS has none built in — write a tiny binary heap, or think about how you would)
  return out;
}`,
  },
  solution: {
    pseudo: `ALGORITHM RunningMedian(A[0..n-1])
    low ← maxPQ()
    high ← priorityQueue()
    out ← []
    for each x in A do
        if isEmpty(low) or x ≤ peek(low) then
            insert(low, x, x)
        else
            insert(high, x, x)
        if length(low) > length(high) + 1 then
            y ← deleteMax(low)
            insert(high, y, y)
        else if length(high) > length(low) then
            y ← deleteMin(high)
            insert(low, y, y)
        if length(low) > length(high) then
            append(out, peek(low))
        else
            append(out, (peek(low) + peek(high)) / 2)
    return out`,
    js: `function RunningMedian(A) {
  // tiny binary heap: better(a, b) is true when a belongs above b
  const heap = (better) => {
    const h = [];
    return {
      size: () => h.length, top: () => h[0],
      push(x) { h.push(x); let i = h.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (!better(h[i], h[p])) break; [h[i], h[p]] = [h[p], h[i]]; i = p; } },
      pop() { const t = h[0], last = h.pop(); if (h.length) { h[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < h.length && better(h[l], h[m])) m = l; if (r < h.length && better(h[r], h[m])) m = r; if (m === i) break; [h[i], h[m]] = [h[m], h[i]]; i = m; } } return t; },
    };
  };
  const low = heap((a, b) => a > b), high = heap((a, b) => a < b), out = [];
  for (const x of A) {
    if (!low.size() || x <= low.top()) low.push(x); else high.push(x);
    if (low.size() > high.size() + 1) high.push(low.pop());
    else if (high.size() > low.size()) low.push(high.pop());
    out.push(low.size() > high.size() ? low.top() : (low.top() + high.top()) / 2);
  }
  return out;
}`,
    python: `import heapq
def running_median(A):
    low, high, out = [], [], []          # low is a max-heap via negation
    for x in A:
        if not low or x <= -low[0]:
            heapq.heappush(low, -x)
        else:
            heapq.heappush(high, x)
        if len(low) > len(high) + 1:
            heapq.heappush(high, -heapq.heappop(low))
        elif len(high) > len(low):
            heapq.heappush(low, -heapq.heappop(high))
        out.append(-low[0] if len(low) > len(high) else (-low[0] + high[0]) / 2)
    return out`,
    explain: "Invariant: every value in low ≤ every value in high, and |low| − |high| ∈ {0, 1}; so the median is low's max (odd total) or the average of the two tops (even). Each arrival does O(1) heap operations of O(log n) each: Θ(n log n) for the whole stream, versus Θ(n²) for keeping a sorted list.",
  },
  complexity: "O(log n) per arrival, Θ(n) memory",
  followUp: "This needs Θ(n) memory for an unbounded stream. Production telemetry (Prometheus histograms, t-digest in Elasticsearch) trades exactness for fixed memory. And if old values must EXPIRE (median of the last k), how would you delete from the middle of a heap?",
  distractors: ["            append(out, (peek(low) + peek(high)) div 2)", "        if length(low) ≥ length(high) then", "        if isEmpty(low) or x ≥ peek(low) then"],
  visual: "sims/heap-lab.html",
  lesson: "lessons/13-advanced-data-structures/README.md",
});

/* ------------------------------------------------------------------ */
/* Chapter 14 · Advanced graphs                                        */
/* ------------------------------------------------------------------ */

ForgeProblems.add({
  id: "course-schedule",
  title: "Course Schedule: Fewest Semesters",
  level: 5, chapter: 14, difficulty: 1,
  topics: ["graphs", "DAG", "topological sort", "BFS by layers"],
  strategy: "Kahn's source removal, one layer at a time",
  source: "Interview classic · extends Levitin §4.2 (source removal)",
  summary: "Take any number of courses per semester; how many semesters does the prerequisite graph force? (−1 if impossible.)",
  statement: `
<p>A plain topological sort (Levitin §4.2) gives <i>an</i> order. A senior question is: <b>how much can run in parallel?</b>
Build systems (Make, Bazel) and job schedulers ask exactly this about their dependency graphs.</p>
<p>Write <code>MinSemesters(n, prereqs)</code>. Courses are <code>0..n-1</code> (n ≥ 1). Each pair <code>[a, b]</code> in <code>prereqs</code> means
course <code>a</code> must be finished in an <b>earlier semester</b> than course <code>b</code>. You may take any number of courses in one semester.
Return the minimum number of semesters needed to take all courses, or <code>-1</code> if the prerequisites contain a cycle (then it's impossible).</p>
<p>The graph is a Directed Acyclic Graph (DAG) exactly when an answer exists. Aim for Θ(n + m) time, where m = number of pairs.</p>`,
  entry: "MinSemesters",
  params: ["n", "prereqs"],
  tests: [
    { args: [4, [[0, 1], [0, 2], [1, 3], [2, 3]]], expect: 3, explain: "Semester 1: {0}; semester 2: {1, 2} in parallel; semester 3: {3}." },
    { args: [3, [[0, 1], [1, 2], [2, 0]]], expect: -1, explain: "0 → 1 → 2 → 0 is a cycle: no course can ever start." },
    { args: [5, []], expect: 1, explain: "No prerequisites: take everything in one semester." },
    { args: [6, [[0, 1], [1, 2], [2, 3], [4, 5]]], expect: 4, explain: "The longest chain 0 → 1 → 2 → 3 has 4 courses; 4 → 5 runs alongside it." },
    { args: [5, [[0, 1], [1, 2], [3, 4], [4, 3]]], expect: -1, explain: "Part of the graph is fine, but the cycle 3 ⇄ 4 makes the whole plan impossible." },
    { args: [1, []], expect: 1 },
    { args: [7, [[5, 0], [6, 0], [0, 1], [3, 1], [1, 2], [4, 2], [6, 4]]], expect: 4 },
  ],
  random: {
    count: 25,
    gen: (r, i) => {
      const n = 1 + (i % 12), perm = r.shuffle([...Array(n).keys()]), P = [];
      for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (r() < 0.25) P.push([perm[a], perm[b]]);
      if (i % 4 === 3 && P.length) { const [a, b] = r.pick(P); P.push([b, a]); }
      return [n, r.shuffle(P)];
    },
  },
  reference: (n, P) => {
    const adj = Array.from({ length: n }, () => []), indeg = Array(n).fill(0);
    for (const [a, b] of P) { adj[a].push(b); indeg[b]++; }
    let level = [], taken = 0, sem = 0;
    for (let v = 0; v < n; v++) if (!indeg[v]) level.push(v);
    while (level.length) { sem++; taken += level.length; const nx = []; for (const u of level) for (const v of adj[u]) if (--indeg[v] === 0) nx.push(v); level = nx; }
    return taken < n ? -1 : sem;
  },
  growth: {
    metric: "steps", sizes: [32, 64, 128, 256, 512],
    gen: (r, n) => { const P = []; for (let k = 0; k < 2 * n; k++) { const a = r.int(0, n - 2); P.push([a, r.int(a + 1, n - 1)]); } return [n, P]; },
    expect: "n",
  },
  mutants: [
    {
      fn: (n, P) => { const adj = Array.from({ length: n }, () => []), indeg = Array(n).fill(0); for (const [a, b] of P) { adj[a].push(b); indeg[b]++; } let level = [], sem = 0; for (let v = 0; v < n; v++) if (!indeg[v]) level.push(v); while (level.length) { sem++; const nx = []; for (const u of level) for (const v of adj[u]) if (--indeg[v] === 0) nx.push(v); level = nx; } return sem; },
      hint: "When there's a cycle you still return a number. Count how many courses you actually took; if it's fewer than n, the rest are stuck on a cycle and the answer is −1.",
    },
    {
      fn: (n, P) => { const adj = Array.from({ length: n }, () => []), indeg = Array(n).fill(0); for (const [a, b] of P) { adj[a].push(b); indeg[b]++; } let level = [], taken = 0, sem = 0; for (let v = 0; v < n; v++) if (!indeg[v]) level.push(v); while (level.length) { sem++; taken += level.length; const nx = []; for (const u of level) for (const v of adj[u]) if (--indeg[v] === 0) nx.push(v); level = nx; } return taken < n ? -1 : sem - 1; },
      hint: "Off by one: you're counting the EDGES of the longest chain, but the question counts semesters (courses on the chain). A graph with no prerequisites still needs 1 semester.",
    },
    {
      fn: (n, P) => { const adj = Array.from({ length: n }, () => []), indeg = Array(n).fill(0); for (const [a, b] of P) { adj[a].push(b); indeg[b]++; } const q = []; for (let v = 0; v < n; v++) if (!indeg[v]) q.push(v); let seen = 0; while (q.length) { const u = q.shift(); seen++; for (const v of adj[u]) if (--indeg[v] === 0) q.push(v); } return seen < n ? -1 : n; },
      hint: "You're returning n — one course per semester. Courses whose prerequisites are all done can be taken TOGETHER: process the graph in layers (all current sources form one semester).",
    },
  ],
  hints: [
    "Which courses can be taken in semester 1? Once they're done, which courses become available for semester 2?",
    "Compute in-degrees. The current layer = all courses with in-degree 0. Taking a whole layer removes their outgoing edges and may create the next layer.",
    "Loop while the layer is non-empty: semesters ← semesters + 1; taken ← taken + length(layer); build the next layer from vertices whose in-degree drops to 0. At the end, if taken < n return −1.",
  ],
  starter: {
    pseudo: `ALGORITHM MinSemesters(n, prereqs)
    // prereqs[k] = [a, b]: a must be in an earlier semester than b
    adj ← array(n, [])
    indeg ← array(n, 0)
    for each (a, b) in prereqs do
        append(adj[a], b)
        indeg[b] ← indeg[b] + 1
    ...`,
    js: `function MinSemesters(n, prereqs) {
  // return the number of layers, or -1 if there is a cycle
}`,
  },
  solution: {
    pseudo: `ALGORITHM MinSemesters(n, prereqs)
    adj ← array(n, [])
    indeg ← array(n, 0)
    for each (a, b) in prereqs do
        append(adj[a], b)
        indeg[b] ← indeg[b] + 1
    layer ← []
    for v ← 0 to n - 1 do
        if indeg[v] = 0 then append(layer, v)
    semesters ← 0
    taken ← 0
    while length(layer) > 0 do
        semesters ← semesters + 1
        taken ← taken + length(layer)
        nextLayer ← []
        for each u in layer do
            for each v in adj[u] do
                indeg[v] ← indeg[v] - 1
                if indeg[v] = 0 then append(nextLayer, v)
        layer ← nextLayer
    if taken < n then return -1
    return semesters`,
    js: `function MinSemesters(n, prereqs) {
  const adj = Array.from({ length: n }, () => []), indeg = Array(n).fill(0);
  for (const [a, b] of prereqs) { adj[a].push(b); indeg[b]++; }
  let layer = [], semesters = 0, taken = 0;
  for (let v = 0; v < n; v++) if (indeg[v] === 0) layer.push(v);
  while (layer.length) {
    semesters++; taken += layer.length;
    const next = [];
    for (const u of layer) for (const v of adj[u]) if (--indeg[v] === 0) next.push(v);
    layer = next;
  }
  return taken < n ? -1 : semesters;
}`,
    python: `def min_semesters(n, prereqs):
    adj, indeg = [[] for _ in range(n)], [0] * n
    for a, b in prereqs:
        adj[a].append(b); indeg[b] += 1
    layer = [v for v in range(n) if indeg[v] == 0]
    semesters = taken = 0
    while layer:
        semesters += 1; taken += len(layer)
        nxt = []
        for u in layer:
            for v in adj[u]:
                indeg[v] -= 1
                if indeg[v] == 0: nxt.append(v)
        layer = nxt
    return -1 if taken < n else semesters`,
    explain: "A course lands in layer k exactly when the longest prerequisite chain ending at it has k courses, so the number of layers is the length of the longest chain — a lower bound for any schedule, and achieved by taking each layer as one semester. Every vertex and edge is handled once: Θ(n + m).",
  },
  complexity: "Θ(n + m)",
  followUp: "Now add a limit: at most k courses per semester. That version is Nondeterministic Polynomial (NP)-hard in general (it's multiprocessor scheduling with precedence). Build tools like Bazel face the same thing with a fixed number of workers — they fall back to heuristics such as 'run the task on the longest remaining chain first'.",
  distractors: ["    if taken = n then return -1", "        semesters ← length(layer)", "            for each v in adj[v] do"],
  visual: "sims/topo-sort.html",
  lesson: "lessons/14-advanced-graphs/README.md",
});

ForgeProblems.add({
  id: "grid-shortest-path-bfs",
  title: "Shortest Path in a Grid (BFS)",
  level: 5, chapter: 14, difficulty: 1,
  topics: ["graphs", "BFS", "grids", "modeling"],
  strategy: "Breadth-First Search (BFS) on an implicit graph",
  source: "Interview classic · builds on Levitin §3.5 (BFS)",
  summary: "Fewest moves from the top-left to the bottom-right of a maze of '.' and '#' cells.",
  statement: `
<p>Most graph problems in the wild don't hand you a graph — you have to <b>see</b> one. In a grid every open cell is a vertex and
every step to a neighboring open cell is an edge of weight 1, so Breadth-First Search (BFS, Levitin §3.5) finds shortest paths.</p>
<p>Write <code>GridPath(grid)</code>. <code>grid</code> is a list of <code>R</code> strings of equal length <code>C</code>; <code>'.'</code> is open and
<code>'#'</code> is a wall. Starting on the top-left cell <code>(0, 0)</code>, you may move <b>up, down, left or right</b> (no diagonals) onto open cells.
Return the minimum number of <b>moves</b> needed to reach the bottom-right cell <code>(R−1, C−1)</code>, or <code>-1</code> if it can't be reached
(including when the start or the goal is a wall).</p>
<p>Characters: <code>grid[r][c]</code> is one character, compare it with <code>'.'</code> or <code>'#'</code>. <code>matrix(R, C, -1)</code> makes a distance table.</p>`,
  entry: "GridPath",
  params: ["grid"],
  tests: [
    { args: [["..#", "#..", "#.."]], expect: 4, explain: "(0,0) → (0,1) → (1,1) → (2,1) → (2,2): 4 moves." },
    { args: [[".#", "#."]], expect: -1, explain: "Only a diagonal would connect them — and diagonals aren't allowed." },
    { args: [["."]], expect: 0, explain: "Start = goal: zero moves." },
    { args: [["#.", ".."]], expect: -1, explain: "The start itself is a wall." },
    { args: [["....", "###.", "....", ".###", "...."]], expect: 13, explain: "A snake-shaped corridor forces the long way round: 3 + 2 + 3 + 2 + 3 moves." },
    { args: [["...", "...", "..#"]], expect: -1, explain: "The goal is a wall." },
    { args: [["....", ".##.", "...."]], expect: 5 },
  ],
  random: {
    count: 25,
    gen: (r, i) => {
      const R = r.int(1, 7), C = r.int(1, 7), g = [];
      for (let a = 0; a < R; a++) { let s = ""; for (let b = 0; b < C; b++) s += (a + b > 0 && r() < 0.28) ? "#" : "."; g.push(s); }
      if (i % 5 === 4) g[0] = "#" + g[0].slice(1);
      return [g];
    },
  },
  reference: (g) => {
    const R = g.length, C = g[0].length;
    if (g[0][0] === "#" || g[R - 1][C - 1] === "#") return -1;
    const d = g.map((s) => Array(C).fill(-1)); d[0][0] = 0; const q = [[0, 0]];
    while (q.length) { const [r, c] = q.shift(); for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = r + dr, b = c + dc; if (a >= 0 && a < R && b >= 0 && b < C && g[a][b] === "." && d[a][b] < 0) { d[a][b] = d[r][c] + 1; q.push([a, b]); } } }
    return d[R - 1][C - 1];
  },
  mutants: [
    {
      fn: (g) => { const R = g.length, C = g[0].length; if (g[0][0] === "#" || g[R - 1][C - 1] === "#") return -1; const d = g.map(() => Array(C).fill(-1)); d[0][0] = 1; const q = [[0, 0]]; while (q.length) { const [r, c] = q.shift(); for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = r + dr, b = c + dc; if (a >= 0 && a < R && b >= 0 && b < C && g[a][b] === "." && d[a][b] < 0) { d[a][b] = d[r][c] + 1; q.push([a, b]); } } } return d[R - 1][C - 1]; },
      hint: "You're counting CELLS on the path, not MOVES. The start cell costs nothing: its distance is 0.",
    },
    {
      fn: (g) => { const R = g.length, C = g[0].length; if (g[0][0] === "#" || g[R - 1][C - 1] === "#") return -1; const d = g.map(() => Array(C).fill(-1)); d[0][0] = 0; const q = [[0, 0]]; while (q.length) { const [r, c] = q.shift(); for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const a = r + dr, b = c + dc; if ((dr || dc) && a >= 0 && a < R && b >= 0 && b < C && g[a][b] === "." && d[a][b] < 0) { d[a][b] = d[r][c] + 1; q.push([a, b]); } } } return d[R - 1][C - 1]; },
      hint: "Your paths cut corners diagonally. Only the 4 neighbors (r±1, c) and (r, c±1) are allowed.",
    },
    {
      fn: (g) => { const R = g.length, C = g[0].length; if (g[R - 1][C - 1] === "#") return -1; const d = g.map(() => Array(C).fill(-1)); d[0][0] = 0; const q = [[0, 0]]; while (q.length) { const [r, c] = q.shift(); for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = r + dr, b = c + dc; if (a >= 0 && a < R && b >= 0 && b < C && g[a][b] === "." && d[a][b] < 0) { d[a][b] = d[r][c] + 1; q.push([a, b]); } } } return d[R - 1][C - 1]; },
      hint: "If the START cell is a wall you still walk out of it. Check grid[0][0] before the search and return −1.",
    },
  ],
  hints: [
    "Every move costs the same (1). Which traversal visits cells in order of their distance from the start?",
    "BFS from (0, 0) with a queue of [r, c] pairs and a distance table dist (−1 = not reached yet). The first time you reach a cell, you've found its shortest distance.",
    "Pop (r, c); for each of the 4 directions compute (nr, nc); if it's inside the grid, grid[nr][nc] = '.', and dist[nr][nc] = −1, set dist[nr][nc] ← dist[r][c] + 1 and enqueue it. Answer: dist[R−1][C−1].",
  ],
  starter: {
    pseudo: `ALGORITHM GridPath(grid)
    // grid: list of R strings of length C, '.' open, '#' wall
    R ← length(grid)
    C ← length(grid[0])
    dist ← matrix(R, C, -1)
    Q ← queue()
    ...
    return dist[R - 1][C - 1]`,
    js: `function GridPath(grid) {
  const R = grid.length, C = grid[0].length;
  // BFS from (0,0)
}`,
  },
  solution: {
    pseudo: `ALGORITHM GridPath(grid)
    R ← length(grid)
    C ← length(grid[0])
    if grid[0][0] = '#' or grid[R - 1][C - 1] = '#' then return -1
    dist ← matrix(R, C, -1)
    dist[0][0] ← 0
    Q ← queue()
    enqueue(Q, [0, 0])
    dr ← [1, -1, 0, 0]
    dc ← [0, 0, 1, -1]
    while not isEmpty(Q) do
        (r, c) ← dequeue(Q)
        for k ← 0 to 3 do
            nr ← r + dr[k]
            nc ← c + dc[k]
            if nr ≥ 0 and nr < R and nc ≥ 0 and nc < C then
                if grid[nr][nc] = '.' and dist[nr][nc] = -1 then
                    dist[nr][nc] ← dist[r][c] + 1
                    enqueue(Q, [nr, nc])
    return dist[R - 1][C - 1]`,
    js: `function GridPath(grid) {
  const R = grid.length, C = grid[0].length;
  if (grid[0][0] === "#" || grid[R - 1][C - 1] === "#") return -1;
  const dist = Array.from({ length: R }, () => Array(C).fill(-1));
  dist[0][0] = 0;
  const Q = [[0, 0]];
  for (let h = 0; h < Q.length; h++) {
    const [r, c] = Q[h];
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < R && nc >= 0 && nc < C && grid[nr][nc] === "." && dist[nr][nc] === -1) {
        dist[nr][nc] = dist[r][c] + 1;
        Q.push([nr, nc]);
      }
    }
  }
  return dist[R - 1][C - 1];
}`,
    python: `from collections import deque
def grid_path(grid):
    R, C = len(grid), len(grid[0])
    if grid[0][0] == "#" or grid[-1][-1] == "#":
        return -1
    dist = [[-1] * C for _ in range(R)]
    dist[0][0] = 0
    q = deque([(0, 0)])
    while q:
        r, c = q.popleft()
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < R and 0 <= nc < C and grid[nr][nc] == "." and dist[nr][nc] == -1:
                dist[nr][nc] = dist[r][c] + 1
                q.append((nr, nc))
    return dist[R - 1][C - 1]`,
    explain: "BFS dequeues cells in nondecreasing distance order, so the first time a cell is reached is along a shortest path (all edges weigh 1). Each of the V = R·C cells is enqueued at most once and examines 4 neighbors: Θ(R·C) time and space.",
  },
  complexity: "Θ(R·C)",
  followUp: "Grow the state: 'you may break through at most one wall' becomes BFS over (row, col, wallsBroken) — the lesson's layered-graph trick. For huge maps (games, robot navigation) switch to A* with the Manhattan-distance heuristic so the search heads toward the goal instead of flooding the whole grid.",
  distractors: ["    dist[0][0] ← 1", "                if grid[nr][nc] = '#' and dist[nr][nc] = -1 then", "            if nr > 0 and nr < R and nc > 0 and nc < C then"],
  visual: "sims/graph-traversal.html",
  lesson: "lessons/14-advanced-graphs/README.md",
});

ForgeProblems.add({
  id: "network-delay-heap",
  title: "Network Delay Time (Dijkstra with a Heap)",
  level: 5, chapter: 14, difficulty: 2,
  topics: ["graphs", "shortest paths", "Dijkstra", "heap", "lazy deletion"],
  strategy: "Greedy (Dijkstra) with a binary heap and lazy deletion",
  source: "Interview classic · Levitin §9.3 + Lesson 14 Build Card 2",
  summary: "A signal starts at node k; when has every node heard it? Dijkstra in O((n + m) log n).",
  statement: `
<p>Levitin §9.3 runs Dijkstra's algorithm with a priority queue. Real networks are sparse, so the version that matters in practice
uses a <b>binary heap with lazy deletion</b>: push a fresh (distance, vertex) entry whenever a distance improves, and skip stale entries when they pop.</p>
<p>Write <code>NetworkDelay(n, times, k)</code>. Nodes are <code>0..n-1</code> (n ≥ 1). Each <code>[u, v, w]</code> in <code>times</code> is a <b>directed</b>
link: a signal at <code>u</code> reaches <code>v</code> after <code>w ≥ 0</code> time units. A signal starts at node <code>k</code> at time 0 and spreads along
every link. Return the time when the <b>last</b> node receives it (the largest shortest-path distance from <code>k</code>),
or <code>-1</code> if some node never receives it.</p>
<p><b>Efficiency:</b> O((n + m) log n). The array-scan version of Dijkstra is Θ(n²) and the grader checks growth on sparse graphs.
Heap tools: <code>H ← priorityQueue()</code>, <code>insert(H, [d, v], d)</code>, <code>(d, v) ← deleteMin(H)</code>, <code>isEmpty(H)</code>.</p>`,
  entry: "NetworkDelay",
  params: ["n", "times", "k"],
  tests: [
    { args: [4, [[1, 0, 1], [1, 2, 1], [2, 3, 1]], 1], expect: 2, explain: "From node 1: nodes 0 and 2 hear it at time 1, node 3 at time 2." },
    { args: [2, [[0, 1, 1]], 1], expect: -1, explain: "Links are one-way: starting at node 1, node 0 is never reached." },
    { args: [3, [[0, 1, 10], [0, 2, 1], [2, 1, 2]], 0], expect: 3, explain: "The detour 0 → 2 → 1 (time 3) beats the direct link (time 10), so node 1 hears it at 3." },
    { args: [1, [], 0], expect: 0, explain: "Only the start node: it has the signal at time 0." },
    { args: [3, [[0, 1, 4]], 0], expect: -1, explain: "Node 2 has no incoming link at all." },
    { args: [4, [[0, 1, 0], [1, 2, 0], [2, 3, 5], [0, 3, 7]], 0], expect: 5, explain: "Zero-time links are fine for Dijkstra (weights only need to be ≥ 0)." },
    { args: [5, [[0, 1, 2], [0, 2, 9], [1, 2, 3], [1, 3, 8], [2, 3, 1], [3, 4, 2], [2, 4, 7]], 0], expect: 8 },
  ],
  random: {
    count: 25,
    gen: (r, i) => {
      const n = 1 + (i % 10), m = r.int(0, 3 * n), T = [];
      for (let e = 0; e < m; e++) { const u = r.int(0, n - 1), v = r.int(0, n - 1); if (u !== v) T.push([u, v, r.int(0, 9)]); }
      return [n, T, r.int(0, n - 1)];
    },
  },
  reference: (n, T, k) => {
    const d = Array(n).fill(Infinity); d[k] = 0;
    for (let p = 0; p < n; p++) for (const [u, v, w] of T) if (d[u] + w < d[v]) d[v] = d[u] + w;
    const m = Math.max(...d); return m === Infinity ? -1 : m;
  },
  growth: {
    metric: "steps", sizes: [32, 64, 128, 256, 512],
    gen: (r, n) => { const T = []; for (let v = 1; v < n; v++) T.push([r.int(0, v - 1), v, r.int(1, 20)]); for (let e = 0; e < 2 * n; e++) T.push([r.int(0, n - 1), r.int(0, n - 1), r.int(1, 20)]); return [n, T, 0]; },
    expect: "n log n",
  },
  mutants: [
    { fn: (n, T, k) => { const d = Array(n).fill(Infinity); d[k] = 0; for (let p = 0; p < n; p++) for (const [u, v, w] of T) if (d[u] + w < d[v]) d[v] = d[u] + w; return d.includes(Infinity) ? -1 : d.reduce((a, b) => a + b, 0); }, hint: "You're adding up all the distances. The signal travels to every node at the same time — the answer is when the LAST node hears it: the maximum distance." },
    { fn: (n, T, k) => { const d = Array(n).fill(Infinity); d[k] = 0; for (let p = 0; p < n; p++) for (const [u, v, w] of T) if (d[u] + w < d[v]) d[v] = d[u] + w; return Math.max(...d.filter((x) => x !== Infinity)); }, hint: "Nodes that are never reached still count: if any distance is still ∞ after the search, the answer is −1." },
    {
      fn: (n, T, k) => { const adj = Array.from({ length: n }, () => []); for (const [u, v, w] of T) adj[u].push([v, w]); const d = Array(n).fill(Infinity); d[k] = 0; const H = [[0, k, 0]]; let seq = 1; while (H.length) { H.sort((a, b) => a[0] - b[0] || a[2] - b[2]); const [du, u] = H.shift(); for (const [v, w] of adj[u]) if (d[v] === Infinity) { d[v] = du + w; H.push([d[v], v, seq++]); } } const m = Math.max(...d); return m === Infinity ? -1 : m; },
      hint: "A node's distance is fixed the first time you SEE it — but a cheaper route may be found later. Update d[v] whenever du + w < d[v], push a new heap entry, and treat a vertex as final only when it is POPPED with du = d[u].",
    },
    { fn: (n, T, k) => { const d = Array(n).fill(Infinity); d[k] = 0; for (let p = 0; p < n; p++) for (const [u, v, w] of T) { if (d[u] + w < d[v]) d[v] = d[u] + w; if (d[v] + w < d[u]) d[u] = d[v] + w; } const m = Math.max(...d); return m === Infinity ? -1 : m; }, hint: "Your signal travels links in both directions. [u, v, w] is ONE-WAY: add v to u's adjacency list only." },
  ],
  hints: [
    "The last node to hear the signal is the one with the largest shortest-path distance from k. Which algorithm gives all shortest distances from one source when weights are nonnegative?",
    "Build adj[u] = list of [v, w]. Keep d[] (∞ except d[k] = 0) and a min-heap of [distance, vertex] entries; start with [0, k].",
    "Pop (du, u); if du ≠ d[u] it's stale — skip it. Otherwise relax every (v, w): if du + w < d[v], set d[v] and insert [d[v], v]. At the end, answer max(d), or −1 if that is ∞.",
  ],
  starter: {
    pseudo: `ALGORITHM NetworkDelay(n, times, k)
    // times[j] = [u, v, w]: directed link u → v taking w ≥ 0 time units
    adj ← array(n, [])
    for each (u, v, w) in times do
        append(adj[u], [v, w])
    d ← array(n, ∞)
    H ← priorityQueue()
    ...`,
    js: `function NetworkDelay(n, times, k) {
  // Dijkstra from k; answer = max distance, or -1
}`,
  },
  solution: {
    pseudo: `ALGORITHM NetworkDelay(n, times, k)
    adj ← array(n, [])
    for each (u, v, w) in times do
        append(adj[u], [v, w])
    d ← array(n, ∞)
    d[k] ← 0
    H ← priorityQueue()
    insert(H, [0, k], 0)
    while not isEmpty(H) do
        (du, u) ← deleteMin(H)
        if du = d[u] then
            for each (v, w) in adj[u] do
                if du + w < d[v] then
                    d[v] ← du + w
                    insert(H, [d[v], v], d[v])
    best ← max(d)
    if best = ∞ then return -1
    return best`,
    js: `function NetworkDelay(n, times, k) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v, w] of times) adj[u].push([v, w]);
  const d = Array(n).fill(Infinity); d[k] = 0;
  const H = [[0, k]]; // binary min-heap on [dist, vertex]
  const push = (e) => { H.push(e); let i = H.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (H[p][0] <= H[i][0]) break; [H[p], H[i]] = [H[i], H[p]]; i = p; } };
  const pop = () => { const t = H[0], last = H.pop(); if (H.length) { H[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < H.length && H[l][0] < H[m][0]) m = l; if (r < H.length && H[r][0] < H[m][0]) m = r; if (m === i) break; [H[m], H[i]] = [H[i], H[m]]; i = m; } } return t; };
  while (H.length) {
    const [du, u] = pop();
    if (du !== d[u]) continue;           // stale entry
    for (const [v, w] of adj[u]) if (du + w < d[v]) { d[v] = du + w; push([d[v], v]); }
  }
  const best = Math.max(...d);
  return best === Infinity ? -1 : best;
}`,
    python: `import heapq
def network_delay(n, times, k):
    adj = [[] for _ in range(n)]
    for u, v, w in times:
        adj[u].append((v, w))
    d = [float("inf")] * n; d[k] = 0
    H = [(0, k)]
    while H:
        du, u = heapq.heappop(H)
        if du != d[u]:
            continue                      # lazy deletion
        for v, w in adj[u]:
            if du + w < d[v]:
                d[v] = du + w
                heapq.heappush(H, (d[v], v))
    best = max(d)
    return -1 if best == float("inf") else best`,
    explain: "With nonnegative weights, the first time a vertex pops with du = d[u] its distance is final (Levitin §9.3's greedy argument). Each edge causes at most one push, so the heap sees O(m) entries: O((n + m) log n) total, versus Θ(n²) for scanning an array for the minimum each round.",
  },
  complexity: "O((n + m) log n)",
  followUp: "This is Open Shortest Path First (OSPF) routing: every router runs Dijkstra on the link-state map it has flooded. At continental scale (map apps) plain Dijkstra is too slow per query — production engines precompute contraction hierarchies so a query touches only a few thousand vertices.",
  distractors: ["        if du ≠ d[u] then", "            d[v] ← du + w", "    best ← min(d)"],
  visual: "sims/greedy-graphs.html",
  lesson: "lessons/14-advanced-graphs/README.md",
});

ForgeProblems.add({
  id: "bellman-ford",
  title: "Bellman–Ford with Negative-Cycle Detection",
  level: 5, chapter: 14, difficulty: 2,
  topics: ["graphs", "shortest paths", "negative weights", "dynamic programming"],
  strategy: "Relax every edge V − 1 times, then check once more",
  source: "Lesson 14 Build Card 1 · CLRS §24.1",
  summary: "Single-source shortest paths with negative edges; report a reachable negative cycle.",
  statement: `
<p>Dijkstra breaks on negative edges. Currency arbitrage (log-prices), the Routing Information Protocol (RIP) and
difference-constraint solvers all need <b>Bellman–Ford</b>, which tolerates negative weights and even <i>detects</i> negative cycles.</p>
<p>Write <code>BellmanFord(n, edges, s)</code>. Vertices are <code>0..n-1</code> (n ≥ 1); each <code>[u, v, w]</code> is a directed edge with any integer weight.
Return the list <code>d[0..n-1]</code> of shortest distances from <code>s</code> (use <code>∞</code> for vertices that can't be reached).
If a <b>negative cycle is reachable from s</b>, shortest distances are undefined — return the empty list <code>[]</code> instead.
A negative cycle that <code>s</code> can't reach doesn't matter.</p>
<p>Edges are given in a deliberately unlucky order, so you really may need all <code>n − 1</code> passes.</p>`,
  entry: "BellmanFord",
  params: ["n", "edges", "s"],
  tests: [
    { args: [5, [[3, 4, 1], [1, 4, 7], [1, 3, 2], [2, 3, 6], [2, 1, -3], [0, 1, 4], [0, 2, 5]], 0], expect: [0, 2, 5, 4, 5], explain: "The lesson's trace (s=0, a=1, b=2, c=3, d=4): the edge b→a of weight −3 improves a to 2, and the news needs all 4 passes to reach d." },
    { args: [5, [[3, 4, 1], [1, 4, 7], [1, 3, 2], [2, 3, 6], [2, 1, -3], [0, 1, 4], [0, 2, 5], [4, 2, -3]], 0], expect: [], explain: "Adding d→b (−3) closes the cycle b→a→c→d→b of total weight −3: distances keep falling forever." },
    { args: [3, [[0, 1, 2]], 0], expect: [0, 2, Infinity], explain: "Vertex 2 can't be reached: its distance stays ∞." },
    { args: [4, [[0, 1, 5], [2, 3, -2], [3, 2, 1]], 0], expect: [0, 5, Infinity, Infinity], explain: "The negative cycle 2 ⇄ 3 exists but s = 0 can't reach it, so the answer is normal." },
    { args: [3, [[0, 1, 2], [0, 2, 5], [2, 1, -4]], 0], expect: [0, 1, 5], explain: "A greedy (Dijkstra) choice would lock in d[1] = 2 too early." },
    { args: [1, [], 0], expect: [0] },
    { args: [4, [[2, 3, -1], [1, 2, -1], [0, 1, -1], [3, 0, 4]], 3], expect: [4, 3, 2, 0], explain: "Negative edges but no negative cycle (the cycle weighs +1)." },
  ],
  random: {
    count: 25,
    gen: (r, i) => {
      const n = 1 + (i % 8), m = r.int(0, 2 * n + 2), E = [];
      for (let e = 0; e < m; e++) E.push([r.int(0, n - 1), r.int(0, n - 1), r.int(i % 3 === 0 ? -6 : -2, 9)]);
      return [n, E, r.int(0, n - 1)];
    },
  },
  reference: (n, E, s) => {
    const d = Array(n).fill(Infinity); d[s] = 0;
    for (let p = 1; p < n; p++) for (const [u, v, w] of E) if (d[u] + w < d[v]) d[v] = d[u] + w;
    for (const [u, v, w] of E) if (d[u] + w < d[v]) return [];
    return d;
  },
  mutants: [
    { fn: (n, E, s) => { const d = Array(n).fill(Infinity); d[s] = 0; for (let p = 1; p <= n - 2; p++) { let ch = false; for (const [u, v, w] of E) if (d[u] + w < d[v]) { d[v] = d[u] + w; ch = true; } if (!ch) return d; } for (const [u, v, w] of E) if (d[u] + w < d[v]) return []; return d; }, hint: "You stop one pass too early, so a graph that simply needs every pass looks like it has a negative cycle. A shortest simple path can have n − 1 edges: run passes 1 to n − 1." },
    { fn: (n, E, s) => { const d = Array(n).fill(Infinity); d[s] = 0; for (let p = 1; p < n; p++) for (const [u, v, w] of E) if (d[u] + w < d[v]) d[v] = d[u] + w; return d; }, hint: "You never check for a negative cycle. After the n − 1 passes, try relaxing every edge once more — if anything still improves, return []." },
    { fn: (n, E, s) => { const d = Array(n).fill(1e9); d[s] = 0; for (let p = 1; p < n; p++) for (const [u, v, w] of E) if (d[u] + w < d[v]) d[v] = d[u] + w; for (const [u, v, w] of E) if (d[u] + w < d[v]) return []; return d; }, hint: "Starting distances at a big finite number breaks things: unreachable vertices get 'distances' and an unreachable negative cycle looks reachable. Start at ∞ — then ∞ + w stays ∞ and never relaxes anything." },
    { fn: (n, E, s) => { const d = Array(n).fill(Infinity), done = Array(n).fill(false); d[s] = 0; for (let it = 0; it < n; it++) { let u = -1; for (let v = 0; v < n; v++) if (!done[v] && d[v] < Infinity && (u < 0 || d[v] < d[u])) u = v; if (u < 0) break; done[u] = true; for (const [a, b, w] of E) if (a === u && !done[b] && d[u] + w < d[b]) d[b] = d[u] + w; } return d; }, hint: "This behaves like Dijkstra: once a vertex is 'done' it never improves again. With negative edges a later vertex can still offer a cheaper route — relax EVERY edge in every pass." },
  ],
  hints: [
    "After pass 1 you know the best paths that use at most 1 edge; after pass 2, at most 2 edges… How many edges can a shortest simple path have?",
    "d ← ∞ everywhere, d[s] ← 0. Repeat n − 1 times: for each [u, v, w], if d[u] + w < d[v] then d[v] ← d[u] + w. (You may stop early after a pass that changes nothing.)",
    "Then do ONE more pass over the edges: if any d[u] + w < d[v] still holds, a negative cycle is reachable — return []. Otherwise return d.",
  ],
  starter: {
    pseudo: `ALGORITHM BellmanFord(n, edges, s)
    // edges[j] = [u, v, w]; return d[0..n-1] or [] for a reachable negative cycle
    d ← array(n, ∞)
    d[s] ← 0
    for pass ← 1 to ... do
        ...
    return d`,
    js: `function BellmanFord(n, edges, s) {
  const d = Array(n).fill(Infinity);
  d[s] = 0;
  // ...
  return d;
}`,
  },
  solution: {
    pseudo: `ALGORITHM BellmanFord(n, edges, s)
    d ← array(n, ∞)
    d[s] ← 0
    for pass ← 1 to n - 1 do
        changed ← false
        for each (u, v, w) in edges do
            if d[u] + w < d[v] then
                d[v] ← d[u] + w
                changed ← true
        if not changed then return d
    for each (u, v, w) in edges do
        if d[u] + w < d[v] then return []
    return d`,
    js: `function BellmanFord(n, edges, s) {
  const d = Array(n).fill(Infinity);
  d[s] = 0;
  for (let pass = 1; pass < n; pass++) {
    let changed = false;
    for (const [u, v, w] of edges) if (d[u] + w < d[v]) { d[v] = d[u] + w; changed = true; }
    if (!changed) return d;
  }
  for (const [u, v, w] of edges) if (d[u] + w < d[v]) return [];
  return d;
}`,
    python: `def bellman_ford(n, edges, s):
    d = [float("inf")] * n
    d[s] = 0
    for _ in range(n - 1):
        changed = False
        for u, v, w in edges:
            if d[u] + w < d[v]:
                d[v] = d[u] + w; changed = True
        if not changed:
            return d
    for u, v, w in edges:
        if d[u] + w < d[v]:
            return []
    return d`,
    explain: "By induction, after pass k every d[v] is at most the length of the best path to v with ≤ k edges; a shortest simple path has ≤ n − 1 edges, so n − 1 passes suffice. If pass n can still improve, some reachable cycle has negative weight. Time Θ(n·m) in the worst case — the price of allowing negative edges (it is a dynamic program over path length).",
  },
  complexity: "Θ(n·m) time, Θ(n) space",
  followUp: "Arbitrage detection: take weights −log(rate) so a profitable currency loop becomes a negative cycle. The Routing Information Protocol is a distributed Bellman–Ford — and its 'count to infinity' problem is exactly the slow convergence you see when a link breaks.",
  distractors: ["    for pass ← 1 to n - 2 do", "    d ← array(n, 0)", "            if d[u] + w > d[v] then"],
  visual: "sims/shortest-paths-plus.html",
  lesson: "lessons/14-advanced-graphs/README.md",
});

ForgeProblems.add({
  id: "zero-one-bfs",
  title: "Fewest Edge Reversals (0-1 Breadth-First Search)",
  level: 5, chapter: 14, difficulty: 2,
  topics: ["graphs", "0-1 BFS", "deque", "modeling", "shortest paths"],
  strategy: "Model as weights {0, 1}; 0-1 Breadth-First Search (BFS) with a deque",
  source: "Interview classic · Lesson 14 Build Card 4",
  summary: "Minimum number of one-way roads to reverse so you can drive from 0 to n − 1, in linear time.",
  statement: `
<p>When every edge weighs 0 or 1, you don't need Dijkstra's heap: a <b>double-ended queue</b> (deque) suffices — this is <b>0-1 Breadth-First Search (0-1 BFS)</b>. Push a vertex reached by a 0-edge on the
<b>front</b> and one reached by a 1-edge on the <b>back</b>, and the deque stays sorted by distance — Θ(n + m) total. The hard part is seeing the weights.</p>
<p>Write <code>MinReversals(n, edges)</code>. A town has intersections <code>0..n-1</code> (n ≥ 1) and one-way roads: <code>[u, v]</code> means you may drive
<code>u → v</code>. You want to drive from <code>0</code> to <code>n − 1</code>, and you may <b>reverse</b> roads. Return the minimum number of roads to reverse,
or <code>-1</code> if even reversing roads can't connect them.</p>
<p>Model: driving a road forward costs 0; driving it backward costs 1 (you had to reverse it). Deque tip: a front stack <code>F</code> plus a back queue
<code>B</code> with a read index works — push-front = <code>append(F, v)</code>, push-back = <code>append(B, v)</code>, pop-front = <code>removeLast(F)</code>
if <code>F</code> is non-empty, else <code>B[bh]</code> and <code>bh ← bh + 1</code>.</p>`,
  entry: "MinReversals",
  params: ["n", "edges"],
  tests: [
    { args: [4, [[0, 1], [2, 1], [2, 3]]], expect: 1, explain: "Drive 0 → 1, reverse 2 → 1 to get from 1 to 2, then drive 2 → 3." },
    { args: [3, [[0, 1], [1, 2]]], expect: 0, explain: "Already drivable: no reversals." },
    { args: [3, [[1, 0], [2, 1]]], expect: 2, explain: "Both roads point the wrong way." },
    { args: [1, []], expect: 0, explain: "Start = destination." },
    { args: [4, [[0, 1], [2, 3]]], expect: -1, explain: "No road touches both halves: reversing can't help." },
    { args: [5, [[4, 0], [0, 1], [1, 2], [2, 3], [3, 4]]], expect: 0, explain: "The one-hop route needs a reversal; the four-hop route is free. Fewest reversals ≠ fewest roads." },
    { args: [6, [[1, 0], [1, 2], [3, 2], [3, 4], [5, 4], [0, 5]]], expect: 0 },
  ],
  random: {
    count: 25,
    gen: (r, i) => {
      const n = 1 + (i % 10), m = r.int(0, 2 * n), E = [];
      for (let e = 0; e < m; e++) { const u = r.int(0, n - 1), v = r.int(0, n - 1); if (u !== v) E.push([u, v]); }
      return [n, E];
    },
  },
  reference: (n, E) => {
    const d = Array(n).fill(Infinity); d[0] = 0;
    for (let p = 0; p < n; p++) for (const [u, v] of E) { if (d[u] < d[v]) d[v] = d[u]; if (d[v] + 1 < d[u]) d[u] = d[v] + 1; }
    return d[n - 1] === Infinity ? -1 : d[n - 1];
  },
  growth: {
    metric: "steps", sizes: [32, 64, 128, 256, 512],
    gen: (r, n) => { const E = []; for (let v = 1; v < n; v++) { const u = r.int(0, v - 1); E.push(r() < 0.5 ? [u, v] : [v, u]); } for (let e = 0; e < n; e++) E.push([r.int(0, n - 1), r.int(0, n - 1)]); return [n, E]; },
    expect: "n",
  },
  mutants: [
    { fn: (n, E) => { const adj = Array.from({ length: n }, () => []); for (const [u, v] of E) { adj[u].push(v); adj[v].push(u); } const d = Array(n).fill(-1); d[0] = 0; const q = [0]; for (let h = 0; h < q.length; h++) for (const v of adj[q[h]]) if (d[v] < 0) { d[v] = d[q[h]] + 1; q.push(v); } return d[n - 1]; }, hint: "You're counting ROADS on the shortest route, not REVERSALS. Driving a road the right way should cost 0; only driving against its direction costs 1." },
    { fn: (n, E) => { const adj = Array.from({ length: n }, () => []); for (const [u, v] of E) adj[u].push(v); const seen = Array(n).fill(false); seen[0] = true; const q = [0]; for (let h = 0; h < q.length; h++) for (const v of adj[q[h]]) if (!seen[v]) { seen[v] = true; q.push(v); } return seen[n - 1] ? 0 : -1; }, hint: "You only follow roads forward, so you never consider reversing one. For each road [u, v] also add the backward move v → u with cost 1." },
    { fn: (n, E) => { const d = Array(n).fill(Infinity); d[0] = 0; for (let p = 0; p < n; p++) for (const [u, v] of E) { if (d[u] + 1 < d[v]) d[v] = d[u] + 1; if (d[v] < d[u]) d[u] = d[v]; } return d[n - 1] === Infinity ? -1 : d[n - 1]; }, hint: "Your costs are swapped: following [u, v] from u to v is free (the road already points that way); going from v to u is the move that needs a reversal." },
  ],
  hints: [
    "Turn it into a shortest-path problem: what should it cost to use a road in its own direction? Against its direction?",
    "For each road [u, v]: add (v, cost 0) to adj[u] and (u, cost 1) to adj[v]. Now you need shortest paths with weights in {0, 1}.",
    "0-1 BFS: pop the front vertex u; for each (v, w) with d[u] + w < d[v], set d[v] and push v on the FRONT if w = 0, on the BACK if w = 1. Answer d[n−1], or −1 if it's ∞.",
  ],
  starter: {
    pseudo: `ALGORITHM MinReversals(n, edges)
    // edges[j] = [u, v]: one-way road u → v. Drive from 0 to n − 1.
    adj ← array(n, [])
    for each (u, v) in edges do
        append(adj[u], [v, 0])
        ...
    d ← array(n, ∞)
    d[0] ← 0
    F ← []
    B ← [0]
    bh ← 0
    ...`,
    js: `function MinReversals(n, edges) {
  // 0-1 BFS from 0 to n-1
}`,
  },
  solution: {
    pseudo: `ALGORITHM MinReversals(n, edges)
    adj ← array(n, [])
    for each (u, v) in edges do
        append(adj[u], [v, 0])
        append(adj[v], [u, 1])
    d ← array(n, ∞)
    d[0] ← 0
    F ← []
    B ← [0]
    bh ← 0
    while length(F) > 0 or bh < length(B) do
        if length(F) > 0 then
            u ← removeLast(F)
        else
            u ← B[bh]
            bh ← bh + 1
        for each (v, w) in adj[u] do
            if d[u] + w < d[v] then
                d[v] ← d[u] + w
                if w = 0 then append(F, v) else append(B, v)
    if d[n - 1] = ∞ then return -1
    return d[n - 1]`,
    js: `function MinReversals(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) { adj[u].push([v, 0]); adj[v].push([u, 1]); }
  const d = Array(n).fill(Infinity); d[0] = 0;
  const F = [], B = [0]; let bh = 0;          // deque = F (reversed) followed by B[bh..]
  while (F.length || bh < B.length) {
    const u = F.length ? F.pop() : B[bh++];
    for (const [v, w] of adj[u]) if (d[u] + w < d[v]) { d[v] = d[u] + w; (w === 0 ? F : B).push(v); }
  }
  return d[n - 1] === Infinity ? -1 : d[n - 1];
}`,
    python: `from collections import deque
def min_reversals(n, edges):
    adj = [[] for _ in range(n)]
    for u, v in edges:
        adj[u].append((v, 0)); adj[v].append((u, 1))
    d = [float("inf")] * n; d[0] = 0
    dq = deque([0])
    while dq:
        u = dq.popleft()
        for v, w in adj[u]:
            if d[u] + w < d[v]:
                d[v] = d[u] + w
                (dq.appendleft if w == 0 else dq.append)(v)
    return -1 if d[n - 1] == float("inf") else d[n - 1]`,
    explain: "The deque always holds vertices with distances D (front part) followed by D + 1 (back part), so vertices leave in nondecreasing distance order — Dijkstra's invariant without a heap. A vertex's distance can only drop from D + 1 to D after it was pushed, so each vertex is pushed at most twice and each edge is examined O(1) times: Θ(n + m), versus O((n + m) log n) for Dijkstra.",
  },
  complexity: "Θ(n + m)",
  followUp: "0-1 BFS shows up whenever some moves are 'free': grid mazes where following an arrow costs 0 and changing it costs 1, or network paths that prefer links inside your own autonomous system. With weights in {0, 1, …, k}, Dial's algorithm (k + 1 buckets) generalizes the deque.",
  distractors: ["        append(adj[v], [u, 0])", "                if w = 1 then append(F, v) else append(B, v)", "    B ← []"],
  visual: "sims/shortest-paths-plus.html",
  lesson: "lessons/14-advanced-graphs/README.md",
});

ForgeProblems.add({
  id: "dag-longest-path",
  title: "Critical Path in a Directed Acyclic Graph (DAG)",
  level: 5, chapter: 14, difficulty: 2,
  topics: ["graphs", "DAG", "dynamic programming", "topological sort", "scheduling"],
  strategy: "Dynamic programming in topological order",
  source: "Lesson 14 Build Card 7 · Critical Path Method (CPM)",
  summary: "Longest weighted path in a DAG — the shortest possible project duration.",
  statement: `
<p>Longest path is Nondeterministic Polynomial (NP)-hard in general graphs, but in a Directed Acyclic Graph (DAG) it's a one-pass dynamic program in topological order.
It's the <b>Critical Path Method (CPM)</b> of project management — and a build system's minimum wall-clock time with unlimited parallel workers.</p>
<p>Write <code>CriticalPath(n, edges)</code>. Milestones are <code>0..n-1</code> (n ≥ 1). Each <code>[u, v, w]</code> (w ≥ 1) says milestone <code>v</code>
can happen no earlier than <code>w</code> days after milestone <code>u</code>. The graph is guaranteed to be a DAG, but <b>vertex numbers are NOT in
topological order</b>. Return the length of the <b>longest path</b> (it may start and end at any vertices; a single vertex is a path of length 0).</p>
<p>Aim for Θ(n + m).</p>`,
  entry: "CriticalPath",
  params: ["n", "edges"],
  tests: [
    { args: [4, [[0, 1, 3], [0, 2, 2], [1, 3, 4], [2, 3, 6]]], expect: 8, explain: "0 → 2 → 3 takes 2 + 6 = 8 days, more than 0 → 1 → 3 (7). Milestone 3 must wait for the slower branch." },
    { args: [3, []], expect: 0, explain: "No constraints: every path is a single milestone." },
    { args: [4, [[3, 2, 5], [2, 1, 5], [1, 0, 5]]], expect: 15, explain: "Edges point from higher to lower numbers — processing vertices in index order would be wrong." },
    { args: [5, [[0, 2, 1], [1, 2, 10], [2, 3, 1], [4, 3, 2]]], expect: 11, explain: "The longest path starts at 1, not 0: every source is a possible start." },
    { args: [1, []], expect: 0 },
    { args: [6, [[5, 4, 2], [4, 0, 3], [5, 0, 1], [0, 3, 4], [2, 3, 9], [1, 2, 1]]], expect: 10, explain: "1 → 2 → 3 (10) beats 5 → 4 → 0 → 3 (9), even though the second route has more edges." },
  ],
  random: {
    count: 25,
    gen: (r, i) => {
      const n = 1 + (i % 11), perm = r.shuffle([...Array(n).keys()]), E = [];
      for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (r() < 0.3) E.push([perm[a], perm[b], r.int(1, 9)]);
      return [n, r.shuffle(E)];
    },
  },
  reference: (n, E) => {
    const memo = Array(n).fill(null);
    const best = (u) => { if (memo[u] !== null) return memo[u]; let b = 0; for (const [a, v, w] of E) if (a === u) b = Math.max(b, w + best(v)); return (memo[u] = b); };
    let m = 0; for (let u = 0; u < n; u++) m = Math.max(m, best(u)); return m;
  },
  growth: {
    metric: "steps", sizes: [32, 64, 128, 256, 512],
    gen: (r, n) => { const perm = r.shuffle([...Array(n).keys()]), E = []; for (let k = 0; k < 2 * n; k++) { const a = r.int(0, n - 2); E.push([perm[a], perm[r.int(a + 1, n - 1)], r.int(1, 9)]); } return [n, E]; },
    expect: "n",
  },
  mutants: [
    { fn: (n, E) => { const adj = Array.from({ length: n }, () => []); for (const [u, v, w] of E) adj[u].push([v, w]); const L = Array(n).fill(0); for (let u = 0; u < n; u++) for (const [v, w] of adj[u]) L[v] = Math.max(L[v], L[u] + w); return Math.max(...L); }, hint: "You're processing vertices in index order 0, 1, 2, … — but an edge can point to a SMALLER number, so L[u] may not be final when you use it. Process vertices in topological order (in-degree / source removal)." },
    { fn: (n, E) => { const memo = Array(n).fill(null); const best = (u) => { if (memo[u] !== null) return memo[u]; let b = 0; for (const [a, v, w] of E) if (a === u) b = Math.max(b, w + best(v)); return (memo[u] = b); }; return best(0); }, hint: "You only consider paths that start at vertex 0. The critical path may start at ANY source — start every L[v] at 0 (a path can begin anywhere) and take the maximum over all vertices." },
    { fn: (n, E) => { const memo = Array(n).fill(null); const best = (u) => { if (memo[u] !== null) return memo[u]; let b = 0; for (const [a, v] of E) if (a === u) b = Math.max(b, 1 + best(v)); return (memo[u] = b); }; let m = 0; for (let u = 0; u < n; u++) m = Math.max(m, best(u)); return m; }, hint: "You're counting EDGES on the longest path. Each edge carries a duration w — add w, not 1." },
  ],
  hints: [
    "Let L[v] = the length of the longest path that ENDS at v. If you already knew L[u] for every edge u → v, what is L[v]?",
    "L[v] = max(0, max over edges [u, v, w] of L[u] + w). To have every L[u] ready before v, visit vertices in topological order — source removal with in-degrees works.",
    "Kahn's loop: dequeue u; for each (v, w) in adj[u]: L[v] ← max(L[v], L[u] + w); decrease indeg[v] and enqueue v when it hits 0. The answer is the largest L value.",
  ],
  starter: {
    pseudo: `ALGORITHM CriticalPath(n, edges)
    // edges[j] = [u, v, w]; the graph is a DAG but vertex numbers are not in topological order
    adj ← array(n, [])
    indeg ← array(n, 0)
    for each (u, v, w) in edges do
        append(adj[u], [v, w])
        indeg[v] ← indeg[v] + 1
    L ← array(n, 0)
    ...`,
    js: `function CriticalPath(n, edges) {
  // longest path in a DAG via topological order
}`,
  },
  solution: {
    pseudo: `ALGORITHM CriticalPath(n, edges)
    adj ← array(n, [])
    indeg ← array(n, 0)
    for each (u, v, w) in edges do
        append(adj[u], [v, w])
        indeg[v] ← indeg[v] + 1
    L ← array(n, 0)
    Q ← queue()
    for v ← 0 to n - 1 do
        if indeg[v] = 0 then enqueue(Q, v)
    best ← 0
    while not isEmpty(Q) do
        u ← dequeue(Q)
        best ← max(best, L[u])
        for each (v, w) in adj[u] do
            L[v] ← max(L[v], L[u] + w)
            indeg[v] ← indeg[v] - 1
            if indeg[v] = 0 then enqueue(Q, v)
    return best`,
    js: `function CriticalPath(n, edges) {
  const adj = Array.from({ length: n }, () => []), indeg = Array(n).fill(0);
  for (const [u, v, w] of edges) { adj[u].push([v, w]); indeg[v]++; }
  const L = Array(n).fill(0), Q = [];
  for (let v = 0; v < n; v++) if (indeg[v] === 0) Q.push(v);
  let best = 0;
  for (let h = 0; h < Q.length; h++) {
    const u = Q[h];
    best = Math.max(best, L[u]);
    for (const [v, w] of adj[u]) {
      L[v] = Math.max(L[v], L[u] + w);
      if (--indeg[v] === 0) Q.push(v);
    }
  }
  return best;
}`,
    python: `from collections import deque
def critical_path(n, edges):
    adj, indeg = [[] for _ in range(n)], [0] * n
    for u, v, w in edges:
        adj[u].append((v, w)); indeg[v] += 1
    L = [0] * n
    q = deque(v for v in range(n) if indeg[v] == 0)
    best = 0
    while q:
        u = q.popleft()
        best = max(best, L[u])
        for v, w in adj[u]:
            L[v] = max(L[v], L[u] + w)
            indeg[v] -= 1
            if indeg[v] == 0: q.append(v)
    return best`,
    explain: "When u is dequeued, all its predecessors were dequeued earlier, so L[u] is final — the Dynamic Programming (DP) recurrence L[v] = max(0, max L[u] + w) is evaluated in a valid order. Each vertex and edge is processed once: Θ(n + m). (The same loop with min instead of max gives DAG shortest paths, even with negative weights.)",
  },
  complexity: "Θ(n + m)",
  followUp: "The tasks on the critical path have zero 'slack'; speeding up anything else doesn't shorten the project. Build tools such as Bazel and Ninja report exactly this critical path so engineers know which compile step to optimize — and schedulers start the longest-remaining-chain tasks first.",
  distractors: ["            L[v] ← min(L[v], L[u] + w)", "    for u ← 0 to n - 1 do", "            L[v] ← max(L[v], L[u] + 1)"],
  visual: "sims/topo-sort.html",
  lesson: "lessons/14-advanced-graphs/README.md",
});

ForgeProblems.add({
  id: "scc-count",
  title: "Count Strongly Connected Components",
  level: 6, chapter: 14, difficulty: 3,
  topics: ["graphs", "DFS", "strongly connected components", "Kosaraju", "Tarjan"],
  strategy: "Two Depth-First Search (DFS) passes (Kosaraju) or low-links (Tarjan)",
  source: "Lesson 14 Build Card 5 · CLRS §22.5",
  summary: "How many groups of mutually reachable vertices does a directed graph have? Θ(n + m).",
  statement: `
<p>In a directed graph, a <b>Strongly Connected Component (SCC)</b> is a maximal set of vertices that can all reach each other.
Collapsing SCCs turns any directed graph into a Directed Acyclic Graph (DAG), its <i>condensation</i> — the first step in 2-satisfiability (2-SAT) solvers, deadlock detection and
finding circular imports in a codebase.</p>
<p>Write <code>SCCCount(adj)</code>. The graph has vertices <code>0..n-1</code> (n ≥ 1) and <code>adj[v]</code> lists every <code>w</code> with an edge <code>v → w</code>.
Return the <b>number of SCCs</b>. Must run in Θ(n + m).</p>
<p>Forge Pseudocode note: variables are local to each ALGORITHM, so pass the arrays your Depth-First Search (DFS) shares (like <code>seen</code> and <code>order</code>) as
parameters — arrays are passed by reference, so the callee's changes are visible to the caller.</p>`,
  entry: "SCCCount",
  params: ["adj"],
  tests: [
    { args: [[[1], [2, 3], [0], [4], []]], expect: 3, explain: "{0, 1, 2} form a cycle; 3 and 4 are each on their own." },
    { args: [[[1], [2], []]], expect: 3, explain: "A DAG: every vertex is its own SCC." },
    { args: [[[1], [2], [3], [0]]], expect: 1, explain: "One big cycle: everybody reaches everybody." },
    { args: [[[]]], expect: 1, explain: "A single vertex is an SCC." },
    { args: [[[1], [0, 2], [3], [2]]], expect: 2, explain: "Two 2-cycles joined by the one-way edge 1 → 2: they're connected, but not STRONGLY." },
    { args: [[[], [0], [1]]], expect: 3, explain: "Edges point to lower numbers: 2 → 1 → 0." },
    { args: [[[1], [2, 4], [0, 3], [5], [5], [6], [3]]], expect: 3, explain: "{0, 1, 2}, {3, 5, 6} and {4}." },
  ],
  random: {
    count: 25,
    gen: (r, i) => {
      const n = 1 + (i % 12), adj = Array.from({ length: n }, () => []);
      const m = r.int(0, Math.floor(1.6 * n));
      for (let e = 0; e < m; e++) { const u = r.int(0, n - 1), v = r.int(0, n - 1); if (u !== v && !adj[u].includes(v)) adj[u].push(v); }
      return [adj];
    },
  },
  reference: (adj) => {
    const n = adj.length, R = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j));
    adj.forEach((ws, v) => ws.forEach((w) => (R[v][w] = true)));
    for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) if (R[i][k]) for (let j = 0; j < n; j++) if (R[k][j]) R[i][j] = true;
    const done = Array(n).fill(false); let c = 0;
    for (let v = 0; v < n; v++) if (!done[v]) { c++; for (let w = 0; w < n; w++) if (R[v][w] && R[w][v]) done[w] = true; }
    return c;
  },
  growth: {
    metric: "steps", sizes: [16, 32, 64, 128, 256],
    gen: (r, n) => { const adj = Array.from({ length: n }, () => []); for (let e = 0; e < 2 * n; e++) adj[r.int(0, n - 1)].push(r.int(0, n - 1)); return [adj]; },
    expect: "n",
  },
  mutants: [
    { fn: (adj) => { const n = adj.length, p = [...Array(n).keys()]; const f = (x) => (p[x] === x ? x : (p[x] = f(p[x]))); adj.forEach((ws, v) => ws.forEach((w) => { p[f(v)] = f(w); })); let c = 0; for (let v = 0; v < n; v++) if (f(v) === v) c++; return c; }, hint: "You're ignoring edge directions, so you count (weakly) connected pieces. In an SCC every vertex must reach every other one FOLLOWING the arrows — 0 → 1 alone doesn't put 0 and 1 together." },
    { fn: (adj) => { const n = adj.length, seen = Array(n).fill(false), order = []; const dfs = (v, out) => { seen[v] = true; for (const w of adj[v]) if (!seen[w]) dfs(w, out); out.push(v); }; for (let v = 0; v < n; v++) if (!seen[v]) dfs(v, order); seen.fill(false); let c = 0; for (let i = n - 1; i >= 0; i--) if (!seen[order[i]]) { c++; dfs(order[i], []); } return c; }, hint: "Your second pass runs on the ORIGINAL graph. Kosaraju's second pass must use the REVERSED graph (every edge flipped), in decreasing finish-time order — otherwise one DFS escapes into other components." },
    { fn: (adj) => { const n = adj.length, seen = Array(n).fill(false); const dfs = (v) => { seen[v] = true; for (const w of adj[v]) if (!seen[w]) dfs(w); }; let c = 0; for (let v = 0; v < n; v++) if (!seen[v]) { c++; dfs(v); } return c; }, hint: "You count the trees of a single DFS. One DFS tree can contain several SCCs (e.g. 0 → 1 with no way back). You need a second pass (Kosaraju) or low-link values (Tarjan) to split them." },
  ],
  hints: [
    "Two vertices are in the same SCC exactly when each can reach the other. A single DFS tells you who is reachable from v — what extra information could tell you who can reach v back?",
    "Kosaraju: (1) DFS the whole graph and record vertices in order of FINISH time; (2) reverse every edge; (3) DFS the reversed graph starting from vertices in decreasing finish time — each new DFS tree is exactly one SCC.",
    "Write DFS(G, v, seen, order) that marks v, recurses on unseen neighbors, then append(order, v). Pass 2: seen ← array(n, false); for i ← n − 1 downto 0: if not seen[order[i]] then count ← count + 1 and DFS(radj, order[i], seen, []).",
  ],
  starter: {
    pseudo: `ALGORITHM SCCCount(adj[0..n-1])
    // adj[v] lists w for every edge v → w
    radj ← array(n, [])
    ...
    return count

ALGORITHM DFS(G, v, seen, order)
    ...`,
    js: `function SCCCount(adj) {
  const n = adj.length;
  // Kosaraju or Tarjan
}`,
  },
  solution: {
    pseudo: `ALGORITHM SCCCount(adj[0..n-1])
    radj ← array(n, [])
    for u ← 0 to n - 1 do
        for each v in adj[u] do
            append(radj[v], u)
    seen ← array(n, false)
    order ← []
    for v ← 0 to n - 1 do
        if not seen[v] then DFS(adj, v, seen, order)
    seen ← array(n, false)
    count ← 0
    for i ← n - 1 downto 0 do
        if not seen[order[i]] then
            count ← count + 1
            DFS(radj, order[i], seen, [])
    return count

ALGORITHM DFS(G, v, seen, order)
    seen[v] ← true
    for each w in G[v] do
        if not seen[w] then DFS(G, w, seen, order)
    append(order, v)`,
    js: `function SCCCount(adj) {
  const n = adj.length, radj = Array.from({ length: n }, () => []);
  adj.forEach((ws, u) => ws.forEach((v) => radj[v].push(u)));
  const seen = Array(n).fill(false), order = [];
  const dfs = (G, v, out) => { seen[v] = true; for (const w of G[v]) if (!seen[w]) dfs(G, w, out); out.push(v); };
  for (let v = 0; v < n; v++) if (!seen[v]) dfs(adj, v, order);
  seen.fill(false);
  let count = 0;
  for (let i = n - 1; i >= 0; i--) if (!seen[order[i]]) { count++; dfs(radj, order[i], []); }
  return count;
}`,
    python: `import sys
def scc_count(adj):
    sys.setrecursionlimit(10000)
    n = len(adj); radj = [[] for _ in range(n)]
    for u in range(n):
        for v in adj[u]:
            radj[v].append(u)
    seen, order = [False] * n, []
    def dfs(G, v, out):
        seen[v] = True
        for w in G[v]:
            if not seen[w]: dfs(G, w, out)
        out.append(v)
    for v in range(n):
        if not seen[v]: dfs(adj, v, order)
    seen = [False] * n
    count = 0
    for v in reversed(order):
        if not seen[v]:
            count += 1; dfs(radj, v, [])
    return count`,
    explain: "The vertex that finishes last lies in a SOURCE component of the condensation DAG; in the reversed graph that component has no edges leading to unvisited components, so DFS from it collects exactly that SCC — and repeating in decreasing finish order peels off one SCC per tree. Two DFS passes plus building the reverse graph: Θ(n + m).",
  },
  complexity: "Θ(n + m)",
  followUp: "Tarjan's algorithm finds the same components in ONE DFS using low-link values and an explicit stack — and it emits them in reverse topological order of the condensation for free. For graphs with millions of vertices (package dependency graphs, call graphs) write the DFS iteratively: recursion depth n will overflow the stack.",
  distractors: ["            DFS(adj, order[i], seen, [])", "    for i ← 0 to n - 1 do", "            append(radj[u], v)"],
  visual: "sims/scc.html",
  lesson: "lessons/14-advanced-graphs/README.md",
});

ForgeProblems.add({
  id: "articulation-points",
  title: "Articulation Points (Single Points of Failure)",
  level: 6, chapter: 14, difficulty: 3,
  topics: ["graphs", "DFS", "low-link", "articulation points", "reliability"],
  strategy: "One Depth-First Search (DFS) with discovery times and low-link values (Tarjan)",
  source: "Lesson 14 Build Card 6 · CLRS Problem 22-2",
  summary: "Find every vertex whose removal disconnects part of an undirected graph — in one depth-first search.",
  statement: `
<p>An <b>articulation point</b> (cut vertex) is a vertex whose removal increases the number of connected components: a router, server or
airport hub that is a single point of failure. Trying every vertex and re-running a search costs Θ(n(n + m)); one clever Depth-First Search (DFS) does it in Θ(n + m).</p>
<p>Write <code>CutVertices(adj)</code> for an undirected graph with vertices <code>0..n-1</code> (n ≥ 1): <code>adj[v]</code> lists v's neighbors
(each edge appears in both lists; no self-loops, no repeated edges). The graph may be disconnected. Return the list of all articulation points
(any order).</p>
<p>Tools: <code>disc[v]</code> = DFS discovery time; <code>low[v]</code> = the smallest discovery time reachable from v's DFS subtree using at most one
back edge. Forge Pseudocode variables are local to each ALGORITHM, so pass shared arrays as parameters and keep the clock in a one-cell array
like <code>time ← [0]</code>.</p>`,
  entry: "CutVertices",
  params: ["adj"],
  compare: "unordered",
  tests: [
    { args: [[[1], [0, 2], [1]]], expect: [1], explain: "The path 0 – 1 – 2: removing 1 separates 0 from 2." },
    { args: [[[1, 2], [0, 2], [0, 1]]], expect: [], explain: "A triangle has no single point of failure." },
    { args: [[[1, 2], [0, 2], [0, 1, 3, 4], [2, 4], [2, 3]]], expect: [2], explain: "Two triangles sharing vertex 2 (a bowtie): 2 is the only link between them." },
    { args: [[[1, 2, 3], [0], [0], [0]]], expect: [0], explain: "A star: the DFS root 0 has three children, so it IS a cut vertex." },
    { args: [[[]]], expect: [], explain: "One isolated vertex." },
    { args: [[[1], [0], [3], [2, 4], [3]]], expect: [3], explain: "Disconnected graph: run the DFS from every unvisited vertex." },
    { args: [[[1, 3], [0, 2], [1, 3, 4], [0, 2], [2, 5, 6], [4, 6], [4, 5]]], expect: [2, 4], explain: "A square 0-1-2-3, a bridge 2 – 4, and a triangle 4-5-6." },
  ],
  random: {
    count: 25,
    gen: (r, i) => {
      const n = 1 + (i % 11), adj = Array.from({ length: n }, () => []);
      const m = r.int(0, Math.floor(1.5 * n));
      for (let e = 0; e < m; e++) { const u = r.int(0, n - 1), v = r.int(0, n - 1); if (u !== v && !adj[u].includes(v)) { adj[u].push(v); adj[v].push(u); } }
      return [adj];
    },
  },
  reference: (adj) => {
    const n = adj.length;
    const comps = (skip) => { const seen = Array(n).fill(false); let c = 0; for (let s = 0; s < n; s++) if (s !== skip && !seen[s]) { c++; const st = [s]; seen[s] = true; while (st.length) { const u = st.pop(); for (const v of adj[u]) if (v !== skip && !seen[v]) { seen[v] = true; st.push(v); } } } return c; };
    const base = comps(-1), out = [];
    for (let v = 0; v < n; v++) if (comps(v) > base - (adj[v].length === 0 ? 1 : 0)) out.push(v);
    return out;
  },
  mutants: [
    {
      fn: (adj) => { const n = adj.length, disc = Array(n).fill(-1), low = Array(n).fill(0), cut = Array(n).fill(false); let t = 0; const visit = (u, p) => { disc[u] = low[u] = t++; for (const v of adj[u]) { if (disc[v] === -1) { visit(v, u); low[u] = Math.min(low[u], low[v]); if (low[v] >= disc[u]) cut[u] = true; } else if (v !== p) low[u] = Math.min(low[u], disc[v]); } }; for (let v = 0; v < n; v++) if (disc[v] === -1) visit(v, -1); return cut.map((c, v) => (c ? v : -1)).filter((v) => v >= 0); },
      hint: "The DFS ROOT needs its own rule: low[child] ≥ disc[root] is always true, so the test would flag every root that has a child. A root is a cut vertex only if it has two or more DFS children.",
    },
    {
      fn: (adj) => { const n = adj.length, disc = Array(n).fill(-1), low = Array(n).fill(0), cut = Array(n).fill(false); let t = 0; const visit = (u, p) => { disc[u] = low[u] = t++; let ch = 0; for (const v of adj[u]) { if (disc[v] === -1) { ch++; visit(v, u); low[u] = Math.min(low[u], low[v]); if (p !== -1 && low[v] > disc[u]) cut[u] = true; } else if (v !== p) low[u] = Math.min(low[u], disc[v]); } if (p === -1 && ch > 1) cut[u] = true; }; for (let v = 0; v < n; v++) if (disc[v] === -1) visit(v, -1); return cut.map((c, v) => (c ? v : -1)).filter((v) => v >= 0); },
      hint: "Use ≥, not >: if the child's subtree can climb back only as far as u itself (low[v] = disc[u]), removing u still traps that subtree. (The strict > is the test for BRIDGES.)",
    },
    {
      fn: (adj) => { const n = adj.length, cut = []; const comps = (skip) => { const seen = Array(n).fill(false); let c = 0; for (let s = 0; s < n; s++) if (s !== skip && !seen[s]) { c++; const st = [s]; seen[s] = true; while (st.length) { const u = st.pop(); for (const v of adj[u]) if (v !== skip && !seen[v]) { seen[v] = true; st.push(v); } } } return c; }; const base = comps(-1); for (let v = 0; v < n; v++) if (adj[v].length >= 2 && comps(v) >= base) cut.push(v); return cut; },
      hint: "Every vertex with two or more neighbors isn't automatically a cut vertex — in a cycle, the neighbors stay connected around the other side. Use low-link values to see whether a child's subtree can reach ABOVE u without going through u.",
    },
  ],
  hints: [
    "In a DFS tree of an undirected graph, when does removing a non-root vertex u cut off its child v's subtree? Think about back edges from inside that subtree.",
    "Give every vertex disc[v] (discovery time) and low[v] = min(disc[v], disc of any vertex reached by a back edge from v's subtree). Non-root u is a cut vertex if some child v has low[v] ≥ disc[u]; the root is one if it has ≥ 2 children.",
    "In Visit(u, parent): set disc/low from the clock; for each neighbor v: if unvisited → count child, Visit(v, u), low[u] ← min(low[u], low[v]), test low[v] ≥ disc[u] (non-root); else if v ≠ parent → low[u] ← min(low[u], disc[v]). After the loop apply the root rule.",
  ],
  starter: {
    pseudo: `ALGORITHM CutVertices(adj[0..n-1])
    disc ← array(n, -1)
    low ← array(n, 0)
    isCut ← array(n, false)
    time ← [0]
    for v ← 0 to n - 1 do
        if disc[v] = -1 then Visit(adj, v, -1, disc, low, isCut, time)
    ...

ALGORITHM Visit(adj, u, parent, disc, low, isCut, time)
    disc[u] ← time[0]
    low[u] ← time[0]
    time[0] ← time[0] + 1
    ...`,
    js: `function CutVertices(adj) {
  const n = adj.length;
  // one DFS with disc / low
}`,
  },
  solution: {
    pseudo: `ALGORITHM CutVertices(adj[0..n-1])
    disc ← array(n, -1)
    low ← array(n, 0)
    isCut ← array(n, false)
    time ← [0]
    for v ← 0 to n - 1 do
        if disc[v] = -1 then Visit(adj, v, -1, disc, low, isCut, time)
    out ← []
    for v ← 0 to n - 1 do
        if isCut[v] then append(out, v)
    return out

ALGORITHM Visit(adj, u, parent, disc, low, isCut, time)
    disc[u] ← time[0]
    low[u] ← time[0]
    time[0] ← time[0] + 1
    children ← 0
    for each v in adj[u] do
        if disc[v] = -1 then
            children ← children + 1
            Visit(adj, v, u, disc, low, isCut, time)
            low[u] ← min(low[u], low[v])
            if parent ≠ -1 and low[v] ≥ disc[u] then isCut[u] ← true
        else if v ≠ parent then
            low[u] ← min(low[u], disc[v])
    if parent = -1 and children > 1 then isCut[u] ← true`,
    js: `function CutVertices(adj) {
  const n = adj.length, disc = Array(n).fill(-1), low = Array(n).fill(0), isCut = Array(n).fill(false);
  let time = 0;
  const visit = (u, parent) => {
    disc[u] = low[u] = time++;
    let children = 0;
    for (const v of adj[u]) {
      if (disc[v] === -1) {
        children++;
        visit(v, u);
        low[u] = Math.min(low[u], low[v]);
        if (parent !== -1 && low[v] >= disc[u]) isCut[u] = true;
      } else if (v !== parent) low[u] = Math.min(low[u], disc[v]);
    }
    if (parent === -1 && children > 1) isCut[u] = true;
  };
  for (let v = 0; v < n; v++) if (disc[v] === -1) visit(v, -1);
  return isCut.map((c, v) => (c ? v : -1)).filter((v) => v >= 0);
}`,
    python: `import sys
def cut_vertices(adj):
    sys.setrecursionlimit(10000)
    n = len(adj); disc, low, cut = [-1] * n, [0] * n, [False] * n
    time = 0
    def visit(u, parent):
        nonlocal time
        disc[u] = low[u] = time; time += 1
        children = 0
        for v in adj[u]:
            if disc[v] == -1:
                children += 1
                visit(v, u)
                low[u] = min(low[u], low[v])
                if parent != -1 and low[v] >= disc[u]:
                    cut[u] = True
            elif v != parent:
                low[u] = min(low[u], disc[v])
        if parent == -1 and children > 1:
            cut[u] = True
    for v in range(n):
        if disc[v] == -1: visit(v, -1)
    return [v for v in range(n) if cut[v]]`,
    explain: "In an undirected DFS every non-tree edge is a back edge to an ancestor. If child v's subtree has no back edge climbing above u (low[v] ≥ disc[u]), every path from that subtree to the rest of the graph passes through u. The root has no ancestors, so it matters only if it has ≥ 2 subtrees. One DFS: Θ(n + m).",
  },
  complexity: "Θ(n + m)",
  followUp: "Cloud architects run this on service-dependency graphs to find single points of failure. The natural next step is 2-vertex-connected components (blocks), which you get by also pushing edges on a stack during this same DFS — and on a million-node graph, do it iteratively.",
  distractors: ["            if low[v] ≥ disc[u] then isCut[u] ← true", "        else if v = parent then", "    if children > 1 then isCut[u] ← true"],
  visual: "sims/graph-traversal.html",
  lesson: "lessons/14-advanced-graphs/README.md",
});

ForgeProblems.add({
  id: "bridges",
  title: "Bridges (Critical Links), Parallel Edges Allowed",
  level: 6, chapter: 14, difficulty: 3,
  topics: ["graphs", "DFS", "low-link", "bridges", "multigraph"],
  strategy: "One Depth-First Search (DFS) with low-links, skipping the parent EDGE (not vertex)",
  source: "Lesson 14 Build Card 6 · Interview classic (critical connections)",
  summary: "Find every edge whose removal disconnects the graph — even when some links are doubled.",
  statement: `
<p>A <b>bridge</b> is an edge whose removal increases the number of connected components — a network cable with no backup.
Real networks often have <b>redundant parallel links</b> between the same two machines, and those are never bridges. That detail breaks
the textbook "skip the parent vertex" shortcut.</p>
<p>Write <code>Bridges(n, edges)</code>. Vertices are <code>0..n-1</code> (n ≥ 1); each <code>[u, v]</code> in <code>edges</code> is an undirected edge
(u ≠ v). The same pair may appear more than once (parallel edges). Return the list of all bridges, each written as <code>[a, b]</code> with
<code>a &lt; b</code>, in any order.</p>
<p>Aim for Θ(n + m) with one Depth-First Search (DFS). Tip: store <code>[neighbor, edgeIndex]</code> in the adjacency lists so you can recognize the exact edge you
arrived by. Forge Pseudocode variables are local to each ALGORITHM, so pass shared arrays as parameters (a clock can be <code>time ← [0]</code>).</p>`,
  entry: "Bridges",
  params: ["n", "edges"],
  compare: "unordered",
  tests: [
    { args: [3, [[0, 1], [1, 2]]], expect: [[0, 1], [1, 2]], explain: "A path: every edge is a bridge." },
    { args: [3, [[0, 1], [1, 2], [2, 0]]], expect: [], explain: "A cycle: every edge has a backup route." },
    { args: [3, [[0, 1], [1, 0], [1, 2]]], expect: [[1, 2]], explain: "0 and 1 are joined by TWO links, so neither is a bridge; 1 – 2 still is." },
    { args: [6, [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 5], [5, 3]]], expect: [[2, 3]], explain: "Two triangles joined by one edge." },
    { args: [1, []], expect: [] },
    { args: [5, [[3, 1], [0, 1], [4, 2], [2, 4]]], expect: [[1, 3], [0, 1]], explain: "Disconnected graph; write each bridge with the smaller vertex first." },
    { args: [4, [[0, 1], [1, 2], [2, 3], [3, 1], [0, 1]]], expect: [], explain: "The 0 – 1 link is doubled and 1-2-3 is a cycle: no bridges at all." },
  ],
  random: {
    count: 25,
    gen: (r, i) => {
      const n = 1 + (i % 10), m = r.int(0, Math.floor(1.4 * n) + 1), E = [];
      for (let e = 0; e < m; e++) { const u = r.int(0, n - 1), v = r.int(0, n - 1); if (u !== v) E.push([u, v]); }
      if (E.length && r() < 0.4) E.push(r.pick(E).slice().reverse());
      return [n, E];
    },
  },
  reference: (n, E) => {
    const conn = (skip, a, b) => { const adj = Array.from({ length: n }, () => []); E.forEach(([u, v], i) => { if (i !== skip) { adj[u].push(v); adj[v].push(u); } }); const seen = Array(n).fill(false); const st = [a]; seen[a] = true; while (st.length) { const u = st.pop(); for (const v of adj[u]) if (!seen[v]) { seen[v] = true; st.push(v); } } return seen[b]; };
    const out = []; E.forEach(([u, v], i) => { if (!conn(i, u, v)) out.push([Math.min(u, v), Math.max(u, v)]); });
    return out;
  },
  mutants: [
    {
      fn: (n, E) => { const adj = Array.from({ length: n }, () => []); E.forEach(([u, v]) => { adj[u].push(v); adj[v].push(u); }); const disc = Array(n).fill(-1), low = Array(n).fill(0), out = []; let t = 0; const visit = (u, p) => { disc[u] = low[u] = t++; for (const v of adj[u]) { if (disc[v] === -1) { visit(v, u); low[u] = Math.min(low[u], low[v]); if (low[v] > disc[u]) out.push([Math.min(u, v), Math.max(u, v)]); } else if (v !== p) low[u] = Math.min(low[u], disc[v]); } }; for (let v = 0; v < n; v++) if (disc[v] === -1) visit(v, -1); return out; },
      hint: "You skip every edge back to the parent VERTEX — so a second, parallel link to the parent is ignored and the pair looks like a bridge. Skip only the one EDGE you arrived by (compare edge indices, not vertices).",
    },
    {
      fn: (n, E) => { const adj = Array.from({ length: n }, () => []); E.forEach(([u, v], i) => { adj[u].push([v, i]); adj[v].push([u, i]); }); const disc = Array(n).fill(-1), low = Array(n).fill(0), out = []; let t = 0; const visit = (u, pe) => { disc[u] = low[u] = t++; for (const [v, id] of adj[u]) { if (disc[v] === -1) { visit(v, id); low[u] = Math.min(low[u], low[v]); if (low[v] >= disc[u]) out.push([Math.min(u, v), Math.max(u, v)]); } else if (id !== pe) low[u] = Math.min(low[u], disc[v]); } }; for (let v = 0; v < n; v++) if (disc[v] === -1) visit(v, -1); return out; },
      hint: "Use a strict >: if v's subtree can climb back to u itself (low[v] = disc[u]), the edge u – v lies on a cycle and is NOT a bridge. (≥ is the articulation-point test.)",
    },
    {
      fn: (n, E) => { const adj = Array.from({ length: n }, () => []); E.forEach(([u, v]) => { adj[u].push(v); adj[v].push(u); }); const disc = Array(n).fill(-1), low = Array(n).fill(0), out = []; let t = 0; const visit = (u) => { disc[u] = low[u] = t++; for (const v of adj[u]) { if (disc[v] === -1) { visit(v); low[u] = Math.min(low[u], low[v]); if (low[v] > disc[u]) out.push([Math.min(u, v), Math.max(u, v)]); } else low[u] = Math.min(low[u], disc[v]); } }; for (let v = 0; v < n; v++) if (disc[v] === -1) visit(v); return out; },
      hint: "You never find any bridge: the edge you just came down is being used as a 'back edge' to the parent, which makes low[v] ≤ disc[u] every time. Skip the edge you arrived by when updating low.",
    },
  ],
  hints: [
    "Tree edge u – v (u the parent) is a bridge exactly when nothing in v's DFS subtree has another way back up to u or above. Which number from the articulation-point problem measures 'how high can this subtree climb'?",
    "Run one DFS with disc[] and low[]. Store adj[u] as [v, edgeIndex] pairs so Visit(u, parentEdge) can ignore only the edge it came in on — a parallel copy of that edge is a legitimate back edge.",
    "For each (v, id) in adj[u]: if v is unvisited → Visit(v, id), low[u] ← min(low[u], low[v]), and if low[v] > disc[u] append [min(u, v), max(u, v)]; else if id ≠ parentEdge → low[u] ← min(low[u], disc[v]).",
  ],
  starter: {
    pseudo: `ALGORITHM Bridges(n, edges)
    adj ← array(n, [])
    for i ← 0 to length(edges) - 1 do
        append(adj[edges[i][0]], [edges[i][1], i])
        append(adj[edges[i][1]], [edges[i][0], i])
    disc ← array(n, -1)
    low ← array(n, 0)
    out ← []
    ...
    return out

ALGORITHM Visit(adj, u, parentEdge, disc, low, out, time)
    ...`,
    js: `function Bridges(n, edges) {
  // one DFS; skip the parent EDGE, not the parent vertex
}`,
  },
  solution: {
    pseudo: `ALGORITHM Bridges(n, edges)
    adj ← array(n, [])
    for i ← 0 to length(edges) - 1 do
        append(adj[edges[i][0]], [edges[i][1], i])
        append(adj[edges[i][1]], [edges[i][0], i])
    disc ← array(n, -1)
    low ← array(n, 0)
    out ← []
    time ← [0]
    for v ← 0 to n - 1 do
        if disc[v] = -1 then Visit(adj, v, -1, disc, low, out, time)
    return out

ALGORITHM Visit(adj, u, parentEdge, disc, low, out, time)
    disc[u] ← time[0]
    low[u] ← time[0]
    time[0] ← time[0] + 1
    for each (v, id) in adj[u] do
        if disc[v] = -1 then
            Visit(adj, v, id, disc, low, out, time)
            low[u] ← min(low[u], low[v])
            if low[v] > disc[u] then append(out, [min(u, v), max(u, v)])
        else if id ≠ parentEdge then
            low[u] ← min(low[u], disc[v])`,
    js: `function Bridges(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  edges.forEach(([u, v], i) => { adj[u].push([v, i]); adj[v].push([u, i]); });
  const disc = Array(n).fill(-1), low = Array(n).fill(0), out = [];
  let time = 0;
  const visit = (u, parentEdge) => {
    disc[u] = low[u] = time++;
    for (const [v, id] of adj[u]) {
      if (disc[v] === -1) {
        visit(v, id);
        low[u] = Math.min(low[u], low[v]);
        if (low[v] > disc[u]) out.push([Math.min(u, v), Math.max(u, v)]);
      } else if (id !== parentEdge) low[u] = Math.min(low[u], disc[v]);
    }
  };
  for (let v = 0; v < n; v++) if (disc[v] === -1) visit(v, -1);
  return out;
}`,
    python: `import sys
def bridges(n, edges):
    sys.setrecursionlimit(10000)
    adj = [[] for _ in range(n)]
    for i, (u, v) in enumerate(edges):
        adj[u].append((v, i)); adj[v].append((u, i))
    disc, low, out = [-1] * n, [0] * n, []
    time = 0
    def visit(u, parent_edge):
        nonlocal time
        disc[u] = low[u] = time; time += 1
        for v, eid in adj[u]:
            if disc[v] == -1:
                visit(v, eid)
                low[u] = min(low[u], low[v])
                if low[v] > disc[u]:
                    out.append([min(u, v), max(u, v)])
            elif eid != parent_edge:
                low[u] = min(low[u], disc[v])
    for v in range(n):
        if disc[v] == -1: visit(v, -1)
    return out`,
    explain: "Only tree edges can be bridges. Tree edge u – v is a bridge iff no edge other than itself connects v's subtree to u or an ancestor, i.e. low[v] > disc[u]. Skipping the arrival EDGE (by index) lets a parallel copy count as that other connection. One DFS over all vertices and edges: Θ(n + m).",
  },
  complexity: "Θ(n + m)",
  followUp: "Site-reliability teams run this on network topologies to find links with no redundancy. Removing all bridges leaves the 2-edge-connected components; contracting them turns the graph into a tree (the 'bridge tree'), which makes questions like 'which single link failure separates A from B?' easy to answer.",
  distractors: ["        else if v ≠ parentEdge then", "            if low[v] ≥ disc[u] then append(out, [min(u, v), max(u, v)])", "            if low[v] > disc[v] then append(out, [min(u, v), max(u, v)])"],
  visual: "sims/graph-traversal.html",
  lesson: "lessons/14-advanced-graphs/README.md",
});
