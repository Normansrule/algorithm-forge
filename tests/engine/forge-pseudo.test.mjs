// Run with:  node --test tests/engine
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const F = require("../../docs/engine/forge-pseudo.js");

function run(src, args, opts = {}) {
  const r = F.run(src, { args, ...opts });
  if (!r.ok && !opts.expectError) assert.fail("Unexpected error: " + (r.error && r.error.toString()));
  return r;
}

test("max element, Levitin style inline if without then", () => {
  const r = run(`ALGORITHM MaxElement(A[0..n-1])
    maxval ← A[0]
    for i ← 1 to n − 1 do
        if A[i] > maxval maxval ← A[i]
    return maxval`, [[3, 9, 2, 7]]);
  assert.equal(r.value, 9);
  assert.equal(r.ops.keyComparisons, 3);
});

test("insertion sort in place + corrected comparison counter", () => {
  const src = `ALGORITHM SortAnalysis(A[0..n-1])
    count ← 0
    for i ← 1 to n - 1 do
        v ← A[i]
        j ← i - 1
        while j ≥ 0 do
            count ← count + 1
            if A[j] > v then
                A[j + 1] ← A[j]
                j ← j - 1
            else
                break
        A[j + 1] ← v
    return count`;
  const a = [1, 2, 3, 4, 5];
  const r = run(src, [a]);
  assert.equal(r.value, 4);
  const b = [5, 4, 3, 2, 1];
  const r2 = run(src, [b]);
  assert.equal(r2.value, 10);
  assert.deepEqual(r2.args[0], [1, 2, 3, 4, 5]);
  assert.deepEqual(b, [1, 2, 3, 4, 5]); // mutated in place
});

test("euclid with semicolons and mod", () => {
  const r = run(`ALGORITHM Euclid(m, n)
    while n ≠ 0 do
        r ← m mod n; m ← n; n ← r
    return m`, [60, 24]);
  assert.equal(r.value, 12);
});

test("binary search with floor brackets", () => {
  const src = `ALGORITHM BinarySearch(A[0..n-1], K)
    l ← 0; r ← n − 1
    while l ≤ r do
        m ← ⌊(l + r)/2⌋
        if K = A[m] return m
        else if K < A[m] r ← m − 1
        else l ← m + 1
    return −1`;
  const A = [3, 14, 27, 31, 39, 42, 55, 70, 74, 81, 85, 93, 98];
  assert.equal(run(src, [A, 70]).value, 7);
  assert.equal(run(src, [A, 71]).value, -1);
});

test("quicksort with A[l..r] views and Hoare partition", () => {
  const src = `ALGORITHM Quicksort(A[l..r])
    if l < r
        s ← HoarePartition(A[l..r])
        Quicksort(A[l..s − 1])
        Quicksort(A[s + 1..r])

ALGORITHM HoarePartition(A[l..r])
    p ← A[l]
    i ← l; j ← r + 1
    repeat
        repeat i ← i + 1 until i > r or A[i] ≥ p
        repeat j ← j − 1 until A[j] ≤ p
        swap(A[i], A[j])
    until i ≥ j
    swap(A[i], A[j])
    swap(A[l], A[j])
    return j`;
  // note: i may pass r; guard via "i > r or" (short-circuit)
  const arr = [5, 3, 1, 9, 8, 2, 4, 7];
  const r = F.run(src, { args: [arr] });
  assert.ok(r.ok, r.error && r.error.toString());
  assert.deepEqual(arr, [1, 2, 3, 4, 5, 7, 8, 9]);
});

test("mergesort with copy..to and 0-based headers on views", () => {
  const src = `ALGORITHM Mergesort(A[0..n-1])
    if n > 1
        copy A[0..⌊n/2⌋ − 1] to B[0..⌊n/2⌋ − 1]
        copy A[⌊n/2⌋..n − 1] to C[0..⌈n/2⌉ − 1]
        Mergesort(B[0..⌊n/2⌋ − 1])
        Mergesort(C[0..⌈n/2⌉ − 1])
        Merge(B, C, A)

ALGORITHM Merge(B[0..p−1], C[0..q−1], A[0..p+q−1])
    i ← 0; j ← 0; k ← 0
    while i < p and j < q do
        if B[i] ≤ C[j]
            A[k] ← B[i]; i ← i + 1
        else A[k] ← C[j]; j ← j + 1
        k ← k + 1
    if i = p
        copy C[j..q − 1] to A[k..p + q − 1]
    else copy B[i..p − 1] to A[k..p + q − 1]`;
  const arr = [8, 3, 2, 9, 7, 1, 5, 4];
  const r = F.run(src, { args: [arr] });
  assert.ok(r.ok, r.error && r.error.toString());
  assert.deepEqual(arr, [1, 2, 3, 4, 5, 7, 8, 9]);
});

test("recursive binary search passing views keeps 0-based indexing", () => {
  const src = `ALGORITHM Find(A[0..n-1], K)
    if n = 0 return false
    m ← n div 2
    if A[m] = K return true
    if K < A[m] return Find(A[0..m-1], K)
    return Find(A[m+1..n-1], K)`;
  const A = [1, 3, 5, 7, 9, 11];
  assert.equal(run(src, [A, 9]).value, true);
  assert.equal(run(src, [A, 4]).value, false);
});

test("1-based header A[1..n]", () => {
  const r = run(`ALGORITHM Sum(A[1..n])
    s ← 0
    for i ← 1 to n do s ← s + A[i]
    return s`, [[1, 2, 3, 4]]);
  assert.equal(r.value, 10);
});

test("strings: brute force matching", () => {
  const src = `ALGORITHM BruteForceStringMatch(T[0..n−1], P[0..m−1])
    for i ← 0 to n − m do
        j ← 0
        while j < m and P[j] = T[i + j] do
            j ← j + 1
        if j = m return i
    return −1`;
  assert.equal(run(src, ["NOBODY_NOTICED_HIM", "NOT"]).value, 7);
  assert.equal(run(src, ["abc", "zz"]).value, -1);
});

test("2-D matrices: Floyd", () => {
  const src = `ALGORITHM Floyd(W[1..n, 1..n])
    D ← W
    for k ← 1 to n do
        for i ← 1 to n do
            for j ← 1 to n do
                D[i, j] ← min(D[i, j], D[i, k] + D[k, j])
    return D`;
  const I = Infinity;
  // 0-based matrix passed; header uses 1..n so we use a 0-based version instead:
  const src0 = src.replace("W[1..n, 1..n]", "W[0..n-1, 0..n-1]").replace(/1 to n/g, "0 to n - 1");
  const W = [[0, I, 3, I], [2, 0, I, I], [I, 7, 0, 1], [6, I, I, 0]];
  const r = run(src0, [W]);
  assert.deepEqual(r.value, [[0, 10, 3, 4], [2, 0, 5, 6], [7, 7, 0, 1], [6, 16, 9, 0]]);
});

test("graphs: recursive DFS with adjacency lists and globals", () => {
  const src = `ALGORITHM DFS(adj[0..n-1])
    mark ← array(n, 0)
    order ← []
    for v ← 0 to n - 1 do
        if mark[v] = 0 then Visit(v, adj, mark, order)
    return order

ALGORITHM Visit(v, adj, mark, order)
    mark[v] ← 1
    append(order, v)
    for each w in adj[v] do
        if mark[w] = 0 then Visit(w, adj, mark, order)`;
  const adj = [[1, 2], [0, 3], [0], [1], [5], [4]];
  assert.deepEqual(run(src, [adj]).value, [0, 1, 3, 2, 4, 5]);
});

test("BFS with a queue", () => {
  const src = `ALGORITHM BFS(adj[0..n-1], s)
    dist ← array(n, ∞)
    dist[s] ← 0
    Q ← queue()
    enqueue(Q, s)
    while not isEmpty(Q) do
        v ← dequeue(Q)
        for each w in adj[v] do
            if dist[w] = ∞ then
                dist[w] ← dist[v] + 1
                enqueue(Q, w)
    return dist`;
  const adj = [[1, 2], [0, 3], [0, 3], [1, 2, 4], [3], []];
  assert.deepEqual(run(src, [adj, 0]).value, [0, 1, 1, 2, 3, Infinity]);
});

test("Dijkstra with a priority queue and tuple unpacking", () => {
  const src = `ALGORITHM Dijkstra(adj[0..n-1], s)
    d ← array(n, ∞); d[s] ← 0
    Q ← priorityQueue()
    insert(Q, (0, s), 0)
    while not isEmpty(Q) do
        (du, u) ← deleteMin(Q)
        if du > d[u] then continue
        for each (v, w) in adj[u] do
            if d[u] + w < d[v] then
                d[v] ← d[u] + w
                insert(Q, (d[v], v), d[v])
    return d`;
  const adj = [[[1, 3], [3, 7]], [[0, 3], [2, 4], [3, 2]], [[1, 4], [4, 6], [3, 5]], [[0, 7], [1, 2], [4, 4], [2, 5]], [[2, 6], [3, 4]]];
  assert.deepEqual(run(src, [adj, 0]).value, [0, 3, 7, 5, 9]);
});

test("records: BST insert/search with new Node and null", () => {
  const src = `ALGORITHM Build(keys)
    root ← null
    for each k in keys do root ← Insert(root, k)
    return Height(root)

ALGORITHM Insert(t, k)
    if t = null
        t ← new Node
        t.key ← k; t.left ← null; t.right ← null
        return t
    if k < t.key then t.left ← Insert(t.left, k)
    else t.right ← Insert(t.right, k)
    return t

ALGORITHM Height(t)
    if t = null return −1
    return max(Height(t.left), Height(t.right)) + 1`;
  assert.equal(run(src, [[5, 3, 1, 10, 12, 7, 9]]).value, 3);
});

test("maps / dictionaries and sets", () => {
  const src = `ALGORITHM CountPairs60(A[0..n-1])
    cnt ← map()
    total ← 0
    for each x in A do
        r ← x mod 60
        need ← (60 − r) mod 60
        if contains(cnt, need) then total ← total + cnt[need]
        if contains(cnt, r) then cnt[r] ← cnt[r] + 1
        else cnt[r] ← 1
    return total`;
  assert.equal(run(src, [[30, 20, 150, 100, 40]]).value, 3);
});

test("else-if chains and repeat-until", () => {
  const src = `ALGORITHM Classify(x)
    if x < 0 then
        return "neg"
    else if x = 0 then
        return "zero"
    else
        k ← 0
        repeat
            k ← k + 1
        until k * k ≥ x
        return k`;
  assert.equal(run(src, [-4]).value, "neg");
  assert.equal(run(src, [0]).value, "zero");
  assert.equal(run(src, [10]).value, 4);
});

test("implicit multiplication, superscripts, ↔ swap, ASCII operators", () => {
  const src = `ALGORITHM T(n, A)
    x <- 2n + n² 
    A[0] ↔ A[1]
    if x >= 8 && x != 9 then return x
    return -1`;
  const A = [1, 2];
  const r = run(src, [2, A]);
  assert.equal(r.value, 8);
  assert.deepEqual(A, [2, 1]);
});

test("tower of hanoi recursion counts calls", () => {
  const src = `ALGORITHM Hanoi(n, src, dst, via)
    if n = 0 return 0
    moves ← Hanoi(n − 1, src, via, dst)
    moves ← moves + 1
    return moves + Hanoi(n − 1, via, dst, src)`;
  const r = run(src, [10, "A", "C", "B"]);
  assert.equal(r.value, 1023);
});

test("contextual words can still be variable names", () => {
  const r = run(`ALGORITHM W(n)
    step ← 0
    each ← 2
    for i ← 0 to n - 1 step 2 do step ← step + each
    print step
    return step`, [6]);
  assert.equal(r.value, 6);
  assert.deepEqual(r.output, ["6"]);
});

test("friendly errors", () => {
  const e1 = F.run(`ALGORITHM X(n)\n    return y + 1`, { args: [1] });
  assert.equal(e1.ok, false);
  assert.match(e1.error.message, /don't know the variable "y"/);
  assert.equal(e1.error.line, 2);
  const e2 = F.run(`ALGORITHM X(A[0..n-1])\n    return A[n]`, { args: [[1, 2]] });
  assert.match(e2.error.message, /Index 2 is outside A\[0\.\.1\]/);
  const e3 = F.run(`ALGORITHM X(n)\n    i ← 0\n    while i < n do\n        n ← n + 1\n        i ← i + 1\n    return i`, { args: [1], maxSteps: 10000 });
  assert.equal(e3.error.kind, "limit");
  const e4 = F.run(`ALGORITHM X(n)\n    x = 5\n    return x`, { args: [1] });
  assert.match(e4.error.message, /"=" means "is equal to"/);
  const e5 = F.run(`ALGORITHM F(n)\n    return F(n - 1)`, { args: [5] });
  assert.equal(e5.error.kind, "limit");
  const e6 = F.run(`ALGORITHM X(n)\n    for i ← 1 to n do\n    return 1`, { args: [1] });
  assert.equal(e6.error.kind, "syntax");
});

test("trace records lines, variables and touched cells", () => {
  const r = F.run(`ALGORITHM S(A[0..n-1])
    s ← 0
    for i ← 0 to n - 1 do
        s ← s + A[i]
    return s`, { args: [[4, 5, 6]], trace: true });
  assert.equal(r.value, 15);
  assert.ok(r.trace.length > 5);
  const last = r.trace[r.trace.length - 1];
  assert.equal(last.vars.s, 15);
  assert.ok(r.trace.some((f) => f.touched && f.touched.r.length));
  assert.equal(r.lineHits[4], 3);
});

/* ---- regressions found while writing the problem bank ---- */
test("Levitin DFS: helper shares the outer algorithm's counter", () => {
  const r = run(`ALGORITHM DFS(adj)
    n ← length(adj)
    mark ← array(n, 0)
    count ← 0
    for v ← 0 to n - 1 do
        if mark[v] = 0 then dfs(v)
    return mark
ALGORITHM dfs(v)
    count ← count + 1
    mark[v] ← count
    for each w in adj[v] do
        if mark[w] = 0 then dfs(w)`, [[[1, 2], [0, 3], [0], [1]]], { entry: "DFS" });
  assert.deepEqual(F.toPlain ? F.toPlain(r.value) : r.value, [1, 2, 4, 3]);
});

test("recursive helper locals stay local (no leaking between activations)", () => {
  const r = run(`ALGORITHM Sum(A[l..r])
    if l > r then return 0
    mid ← (l + r) div 2
    left ← Sum(A[l..mid - 1])
    return left + A[mid] + Sum(A[mid + 1..r])`, [[1, 2, 3, 4, 5, 6, 7]]);
  assert.equal(r.value, 28);
});

test("mixed-case words like Xor are identifiers, keywords still work", () => {
  const r = run(`ALGORITHM F(x)
    return Xor(x, 1)
ALGORITHM Xor(a, b)
    if a MOD 2 = 1 and True then return a
    return b`, [3], { entry: "F" });
  assert.equal(r.value, 3);
});

test("missing map key reads as null", () => {
  const r = run(`ALGORITHM T()
    M ← map()
    if M["a"] = null then return 1
    return 0`, []);
  assert.equal(r.value, 1);
});

test("returning a 1-based array gives its real elements", () => {
  const r = run(`ALGORITHM T(H[1..n])
    H[1] ← 99
    return H`, [[1, 2, 3]]);
  assert.deepEqual(F.toPlain ? F.toPlain(r.value) : [...r.value], [99, 2, 3]);
});

test("strings bound to a 1-based header index from 1", () => {
  const r = run(`ALGORITHM T(X[1..m])
    return [m, X[1], X[m]]`, ["abc"]);
  assert.deepEqual(F.toPlain ? F.toPlain(r.value) : r.value, [3, "a", "c"]);
});

test("copy() of a matrix is deep", () => {
  const r = run(`ALGORITHM T(A)
    R ← copy(A)
    R[0, 1] ← 7
    return A[0, 1]`, [[[1, 2], [3, 4]]]);
  assert.equal(r.value, 2);
});

test("new Node(key: 5) sets named fields", () => {
  const r = run(`ALGORITHM T()
    t ← new Node(key: 5, left: null)
    return t.key`, []);
  assert.equal(r.value, 5);
});

test("a 1-based view passed on to another 1-based header", () => {
  const r = run(`ALGORITHM X(A[1..n])
    return Y(A)
ALGORITHM Y(B[1..m])
    return [B[1], B[m], m]`, [[7, 8, 9]], { entry: "X" });
  assert.deepEqual(r.value, [7, 9, 3]);
});

test("priority queues order tuple priorities element by element", () => {
  const r = run(`ALGORITHM T()
    Q ← priorityQueue()
    insert(Q, "a", [3, 0])
    insert(Q, "b", [10, 0])
    insert(Q, "c", [2, 9])
    return deleteMin(Q)`, []);
  assert.equal(r.value, "c");
});

test("built-ins are charged their real cost (a list scan is not one step)", () => {
  const scan = run(`ALGORITHM T(A[0..n-1])
    c ← 0
    for i ← 0 to n - 1 do
        if A[i] in A then c ← c + 1
    return c`, [Array.from({ length: 200 }, (_, i) => i)]);
  assert.equal(scan.value, 200);
  assert.ok(scan.ops.steps > 200 * 100, "x in L should cost about length(L) steps");
});
