/* =====================================================================
   Playground examples — classic algorithms from the lessons, written in
   Forge Pseudocode, each with a sample input and the answer it must give.
   tools/check-playground-examples.mjs runs every one of them.

   Example fields:
     id        kebab-case; deep link: playground.html#ex=<id>
     chapter   1–18 (grouping in the gallery)
     title     shown in the gallery and the picker
     blurb     one sentence: what it does / what to watch
     entry     the ALGORITHM to call
     inputs    {param: "text as typed in the Inputs box"}
     expect    the value the call returns   (or)
     expectArg {param, value}: what an in-place algorithm leaves in that argument
     growth    optional Growth-lab preset {gen, sizes, metric, roles, expect}
     lesson    lesson folder (links to GitHub); sim: related simulation (docs/sims/…)
   ===================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PGExamples = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const CHAPTERS = {
    1: "Introduction", 2: "Analysis Framework", 3: "Brute Force & Exhaustive Search", 4: "Decrease-and-Conquer",
    5: "Divide-and-Conquer", 6: "Transform-and-Conquer", 7: "Space-Time Tradeoffs", 8: "Dynamic Programming",
    9: "Greedy Technique", 12: "Coping with Limitations", 13: "Advanced Data Structures", 15: "Interview Patterns",
    18: "The Frontier",
  };
  const LESSON = {
    1: "01-introduction", 2: "02-analysis-framework", 3: "03-brute-force", 4: "04-decrease-and-conquer", 5: "05-divide-and-conquer",
    6: "06-transform-and-conquer", 7: "07-space-time-tradeoffs", 8: "08-dynamic-programming", 9: "09-greedy",
    12: "12-coping-with-limitations", 13: "13-advanced-data-structures", 15: "15-dp-and-interview-patterns", 18: "18-the-frontier",
  };
  const SIZES = [8, 16, 32, 64, 128, 256, 512];

  const list = [
    /* ---------------- Chapter 1 ---------------- */
    {
      id: "euclid-gcd", chapter: 1, title: "Euclid's algorithm (greatest common divisor)", sim: "euclid-gcd.html",
      blurb: "Replace (m, n) by (n, m mod n) until n is 0 — the oldest algorithm still in daily use.",
      entry: "Euclid", inputs: { m: "60", n: "24" }, expect: 12,
      code: `ALGORITHM Euclid(m, n)
    // Greatest common divisor of two non-negative integers, not both zero
    while n ≠ 0 do
        r ← m mod n
        m ← n
        n ← r
    return m
`,
    },
    {
      id: "sieve", chapter: 1, title: "Sieve of Eratosthenes", sim: "euclid-gcd.html",
      blurb: "Cross out the multiples of every prime p, starting at p², and the survivors are the primes up to n.",
      entry: "Sieve", inputs: { n: "30" }, expect: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29],
      growth: { gen: "number", sizes: [64, 128, 256, 512, 1024, 2048, 4096], metric: "arrayWrites" },
      code: `ALGORITHM Sieve(n)
    // All primes from 2 up to n
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
    return L
`,
    },

    /* ---------------- Chapter 2 ---------------- */
    {
      id: "max-element", chapter: 2, title: "Largest element (the first analysis)", sim: "growth-rates.html",
      blurb: "One pass, n − 1 comparisons, every time — the textbook's first worked efficiency analysis.",
      entry: "MaxElement", inputs: { A: "[3, 41, 7, 19, 2, 56, 11]" }, expect: 56,
      growth: { gen: "random", sizes: SIZES, metric: "keyComparisons", expect: "n" },
      code: `ALGORITHM MaxElement(A[0..n-1])
    // The value of the largest element in A
    maxval ← A[0]
    for i ← 1 to n - 1 do
        if A[i] > maxval then
            maxval ← A[i]
    return maxval
`,
    },
    {
      id: "binrec", chapter: 2, title: "Binary digits, recursively", sim: "recurrence-lab.html",
      blurb: "Counts the binary digits of n by halving it. Watch the call stack grow log₂ n deep.",
      entry: "BinRec", inputs: { n: "100" }, expect: 7,
      growth: { gen: "number", sizes: [8, 32, 128, 512, 2048, 8192, 32768], metric: "calls", expect: "log n" },
      code: `ALGORITHM BinRec(n)
    // Number of digits in the binary representation of a positive integer n
    if n = 1 then
        return 1
    return BinRec(⌊n/2⌋) + 1
`,
    },

    /* ---------------- Chapter 3 ---------------- */
    {
      id: "selection-sort", chapter: 3, title: "Selection sort", sim: "sorting-studio.html",
      blurb: "Find the smallest remaining element and swap it into place: always n(n − 1)/2 comparisons.",
      entry: "SelectionSort", inputs: { A: "[89, 45, 68, 90, 29, 34, 17]" }, expect: [17, 29, 34, 45, 68, 89, 90],
      growth: { gen: "random", sizes: [8, 16, 32, 64, 128, 256], metric: "keyComparisons", expect: "n^2" },
      code: `ALGORITHM SelectionSort(A[0..n-1])
    // Sorts A in nondecreasing order
    for i ← 0 to n - 2 do
        min ← i
        for j ← i + 1 to n - 1 do
            if A[j] < A[min] then
                min ← j
        swap A[i] and A[min]
    return A
`,
    },
    {
      id: "bubble-sort", chapter: 3, title: "Bubble sort", sim: "sorting-studio.html",
      blurb: "Swap neighbours that are out of order; after pass i the i largest values have bubbled to the end.",
      entry: "BubbleSort", inputs: { A: "[89, 45, 68, 90, 29, 34, 17]" }, expect: [17, 29, 34, 45, 68, 89, 90],
      growth: { gen: "random", sizes: [8, 16, 32, 64, 128, 256], metric: "swaps", expect: "n^2" },
      code: `ALGORITHM BubbleSort(A[0..n-1])
    // Sorts A by repeatedly swapping adjacent elements that are out of order
    for i ← 0 to n - 2 do
        for j ← 0 to n - 2 - i do
            if A[j + 1] < A[j] then
                swap A[j] and A[j + 1]
    return A
`,
    },
    {
      id: "string-match", chapter: 3, title: "Brute-force string matching", sim: "string-match.html",
      blurb: "Slide the pattern one position at a time and compare left to right until a mismatch.",
      entry: "BruteForceStringMatch", inputs: { T: "NOBODY_NOTICED_HIM", P: "NOT" }, expect: 7,
      code: `ALGORITHM BruteForceStringMatch(T[0..n-1], P[0..m-1])
    // Index of the first character of the first match of P in T, or -1
    for i ← 0 to n - m do
        j ← 0
        while j < m and P[j] = T[i + j] do
            j ← j + 1
        if j = m then
            return i
    return -1
`,
    },
    {
      id: "dfs", chapter: 3, title: "Depth-first search: discovery and finish order", sim: "graph-traversal.html",
      blurb: "Go as deep as possible, back up at dead ends. Returns the order vertices are reached and the order they are finished.",
      entry: "DFSOrders", inputs: { G: "[[1, 2], [0, 3], [0, 3], [1, 2, 4], [3], []]" }, expect: [[0, 1, 3, 2, 4, 5], [2, 4, 3, 1, 0, 5]],
      growth: { gen: "graph", sizes: [16, 32, 64, 128, 256, 512], metric: "steps", expect: "n" },
      code: `ALGORITHM DFSOrders(G[0..n-1])
    // G[v] lists the neighbours of vertex v (adjacency lists)
    visited ← array(n, false)
    pre ← []
    post ← []
    for v ← 0 to n - 1 do
        if not visited[v] then
            Dfs(G, v, visited, pre, post)
    return [pre, post]

ALGORITHM Dfs(G, v, visited, pre, post)
    visited[v] ← true
    append(pre, v)
    for each w in G[v] do
        if not visited[w] then
            Dfs(G, w, visited, pre, post)
    append(post, v)
`,
    },
    {
      id: "bfs", chapter: 3, title: "Breadth-first search order", sim: "graph-traversal.html",
      blurb: "Visit vertices ring by ring with a queue: all neighbours first, then their neighbours.",
      entry: "BFSOrder", inputs: { G: "[[1, 2], [0, 3], [0, 3], [1, 2, 4], [3], []]" }, expect: [0, 1, 2, 3, 4, 5],
      growth: { gen: "graph", sizes: [16, 32, 64, 128, 256, 512], metric: "steps", expect: "n" },
      code: `ALGORITHM BFSOrder(G[0..n-1])
    // G[v] lists the neighbours of vertex v (adjacency lists)
    visited ← array(n, false)
    order ← []
    for s ← 0 to n - 1 do
        if not visited[s] then
            visited[s] ← true
            append(order, s)
            Q ← queue()
            enqueue(Q, s)
            while not isEmpty(Q) do
                v ← dequeue(Q)
                for each w in G[v] do
                    if not visited[w] then
                        visited[w] ← true
                        append(order, w)
                        enqueue(Q, w)
    return order
`,
    },

    /* ---------------- Chapter 4 ---------------- */
    {
      id: "insertion-sort", chapter: 4, title: "Insertion sort", sim: "sorting-studio.html",
      blurb: "Grow a sorted prefix; slide each new element left past the bigger ones. Try reversed input in the Growth lab.",
      entry: "InsertionSort", inputs: { A: "[89, 45, 68, 90, 29, 34, 17]" }, expect: [17, 29, 34, 45, 68, 89, 90],
      growth: { gen: "reversed", sizes: SIZES, metric: "keyComparisons", expect: "n^2" },
      code: `ALGORITHM InsertionSort(A[0..n-1])
    // Sorts A in nondecreasing order by insertion sort
    for i ← 1 to n - 1 do
        v ← A[i]
        j ← i - 1
        while j ≥ 0 and A[j] > v do
            A[j + 1] ← A[j]
            j ← j - 1
        A[j + 1] ← v
    return A
`,
    },
    {
      id: "binary-search", chapter: 4, title: "Binary search", sim: "search-lab.html",
      blurb: "Compare with the middle element and throw half the array away — about log₂ n probes.",
      entry: "BinarySearch", inputs: { A: "[3, 14, 27, 31, 39, 42, 55, 70, 74, 81, 85, 93, 98]", K: "70" }, expect: 7,
      growth: { gen: "sorted", sizes: [16, 64, 256, 1024, 4096, 16384], metric: "keyComparisons", roles: { A: "input", K: "absent" }, expect: "log n" },
      code: `ALGORITHM BinarySearch(A[0..n-1], K)
    // Index of K in the sorted array A, or -1 if K is not there
    l ← 0
    r ← n - 1
    while l ≤ r do
        m ← ⌊(l + r) / 2⌋
        if K = A[m] then
            return m
        else if K < A[m] then
            r ← m - 1
        else
            l ← m + 1
    return -1
`,
    },
    {
      id: "topo-sort", chapter: 4, title: "Topological sort (source removal)", sim: "topo-sort.html",
      blurb: "Repeatedly remove a vertex with no incoming edges. If some are left over, the graph has a cycle.",
      entry: "TopoSort", inputs: { adj: "[[2], [2], [3, 4], [4], []]" }, expect: [0, 1, 2, 3, 4],
      growth: { gen: "dag", sizes: [16, 32, 64, 128, 256, 512], metric: "steps", expect: "n" },
      code: `ALGORITHM TopoSort(adj[0..n-1])
    // adj[v] lists the vertices that v points to; returns [] if there is a cycle
    indeg ← array(n, 0)
    for v ← 0 to n - 1 do
        for each w in adj[v] do
            indeg[w] ← indeg[w] + 1
    Q ← queue()
    for v ← 0 to n - 1 do
        if indeg[v] = 0 then enqueue(Q, v)
    order ← []
    while not isEmpty(Q) do
        v ← dequeue(Q)
        append(order, v)
        for each w in adj[v] do
            indeg[w] ← indeg[w] - 1
            if indeg[w] = 0 then enqueue(Q, w)
    if length(order) < n then return []
    return order
`,
    },

    /* ---------------- Chapter 5 ---------------- */
    {
      id: "merge-sort", chapter: 5, title: "Merge sort", sim: "sorting-studio.html",
      blurb: "Split in half, sort each half recursively, merge. Θ(n log n) on every input.",
      entry: "MergeSort", inputs: { A: "[8, 3, 2, 9, 7, 1, 5, 4]" }, expect: [1, 2, 3, 4, 5, 7, 8, 9],
      growth: { gen: "random", sizes: SIZES, metric: "keyComparisons", expect: "n log n" },
      code: `ALGORITHM MergeSort(A[0..n-1])
    // Sorts A by recursive mergesort
    if n > 1 then
        B ← A[0..⌊n/2⌋ - 1]
        C ← A[⌊n/2⌋..n - 1]
        MergeSort(B)
        MergeSort(C)
        Merge(B, C, A)
    return A

ALGORITHM Merge(B[0..p-1], C[0..q-1], A[0..m-1])
    // Merges two sorted arrays into one sorted array A
    i ← 0
    j ← 0
    k ← 0
    while i < p and j < q do
        if B[i] ≤ C[j] then
            A[k] ← B[i]
            i ← i + 1
        else
            A[k] ← C[j]
            j ← j + 1
        k ← k + 1
    if i = p then
        copy C[j..q - 1] to A[k..m - 1]
    else
        copy B[i..p - 1] to A[k..m - 1]
`,
    },
    {
      id: "quicksort", chapter: 5, title: "Quicksort (Hoare partition)", sim: "sorting-studio.html",
      blurb: "Partition around a pivot, then sort both sides in place. It returns nothing — watch A change.",
      entry: "Quicksort", inputs: { A: "[5, 3, 1, 9, 8, 2, 4, 7]" }, expectArg: { param: "A", value: [1, 2, 3, 4, 5, 7, 8, 9] },
      growth: { gen: "random", sizes: SIZES, metric: "keyComparisons", expect: "n log n" },
      code: `ALGORITHM Quicksort(A[l..r])
    // Sorts the subarray A[l..r] in place
    if l < r then
        s ← HoarePartition(A[l..r])
        Quicksort(A[l..s - 1])
        Quicksort(A[s + 1..r])

ALGORITHM HoarePartition(A[l..r])
    // Partitions A[l..r] around its first element; returns the pivot's final index
    p ← A[l]
    i ← l
    j ← r + 1
    repeat
        repeat
            i ← i + 1
        until i = r or A[i] ≥ p
        repeat
            j ← j - 1
        until A[j] ≤ p
        swap A[i] and A[j]
    until i ≥ j
    swap A[i] and A[j]
    swap A[l] and A[j]
    return j
`,
    },

    /* ---------------- Chapter 6 ---------------- */
    {
      id: "heapsort", chapter: 6, title: "Heapsort", sim: "heap-lab.html",
      blurb: "Build a max-heap bottom-up, then move the maximum to the end n − 1 times. Uses 1-based indexes like the book.",
      entry: "HeapSort", inputs: { A: "[2, 9, 7, 6, 5, 8]" }, expectArg: { param: "A", value: [2, 5, 6, 7, 8, 9] },
      growth: { gen: "random", sizes: SIZES, metric: "keyComparisons", expect: "n log n" },
      code: `ALGORITHM HeapSort(A[1..n])
    // Sorts A in place: heap construction, then n - 1 maximum deletions
    for i ← ⌊n/2⌋ downto 1 do
        SiftDown(A, i, n)
    for last ← n downto 2 do
        swap A[1] and A[last]
        SiftDown(A, 1, last - 1)

ALGORITHM SiftDown(H, k, size)
    // Restores the heap property below position k (heap occupies H[1..size])
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
    H[k] ← v
`,
    },
    {
      id: "horner", chapter: 6, title: "Horner's rule", sim: "horner-binexp.html",
      blurb: "Evaluate a polynomial with n multiplications by nesting: ((aₙx + aₙ₋₁)x + …)x + a₀.",
      entry: "Horner", inputs: { P: "[-5, 1, 3, -1, 2]", x: "3" }, expect: 160,
      code: `ALGORITHM Horner(P[0..n], x)
    // P[i] is the coefficient of x^i; returns the polynomial's value at x
    p ← P[n]
    for i ← n - 1 downto 0 do
        p ← x * p + P[i]
    return p
`,
    },
    {
      id: "binary-exponentiation", chapter: 6, title: "Binary exponentiation (right to left)", sim: "horner-binexp.html",
      blurb: "Square the base and halve the exponent: aⁿ in about 2 log₂ n multiplications.",
      entry: "Power", inputs: { a: "3", n: "13" }, expect: 1594323,
      growth: { gen: "number", sizes: [8, 32, 128, 512, 2048, 8192, 32768], metric: "steps", roles: { a: "value", n: "input" }, expect: "log n" },
      code: `ALGORITHM Power(a, n)
    // a^n for an integer n ≥ 0, scanning n's binary digits right to left
    result ← 1
    while n > 0 do
        if n mod 2 = 1 then
            result ← result * a
        a ← a * a
        n ← n div 2
    return result
`,
    },

    /* ---------------- Chapter 7 ---------------- */
    {
      id: "counting-sort", chapter: 7, title: "Distribution counting sort", sim: "sorting-studio.html",
      blurb: "Count how often each value occurs, turn counts into positions, place each element — no comparisons at all.",
      entry: "DistributionCountingSort", inputs: { A: "[13, 11, 12, 13, 12, 12]", l: "11", u: "13" }, expect: [11, 12, 12, 12, 13, 13],
      growth: { gen: "few", sizes: SIZES, metric: "steps", roles: { A: "input", l: "min", u: "max" }, expect: "n" },
      code: `ALGORITHM DistributionCountingSort(A[0..n-1], l, u)
    // Sorts integers that all lie between l and u
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
    return S
`,
    },
    {
      id: "horspool", chapter: 7, title: "Horspool's string matching", sim: "string-match.html",
      blurb: "Compare right to left; on a mismatch, shift by the table entry of the text character under the pattern's last cell.",
      entry: "Horspool", inputs: { P: "BARBER", T: "JIM_SAW_ME_IN_A_BARBERSHOP" }, expect: 16,
      code: `ALGORITHM Horspool(P[0..m-1], T[0..n-1])
    // Index of the first match of P in T, or -1
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
    return -1
`,
    },
    {
      id: "kmp-prefix", chapter: 7, title: "Knuth–Morris–Pratt (KMP) prefix table", sim: "string-match.html",
      blurb: "L[i] = length of the longest proper prefix of P[0..i] that is also a suffix — the heart of the KMP matcher.",
      entry: "PrefixTable", inputs: { P: "ababaca" }, expect: [0, 0, 1, 2, 3, 0, 1],
      growth: { gen: "string", sizes: SIZES, metric: "steps", expect: "n" },
      code: `ALGORITHM PrefixTable(P[0..m-1])
    // L[i] = longest proper prefix of P[0..i] that is also its suffix
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
    return L
`,
    },

    /* ---------------- Chapter 8 ---------------- */
    {
      id: "coin-row", chapter: 8, title: "Coin-row problem", sim: "dp-studio.html",
      blurb: "Pick coins with no two adjacent for the largest total: F(i) = max(cᵢ + F(i − 2), F(i − 1)).",
      entry: "CoinRow", inputs: { C: "[5, 1, 2, 10, 6, 2]" }, expect: 17,
      growth: { gen: "random", sizes: SIZES, metric: "steps", expect: "n" },
      code: `ALGORITHM CoinRow(C[1..n])
    // Largest total of coins picked so that no two are adjacent
    F ← array(n + 1, 0)
    F[1] ← C[1]
    for i ← 2 to n do
        F[i] ← max(C[i] + F[i - 2], F[i - 1])
    return F[n]
`,
    },
    {
      id: "knapsack-dp", chapter: 8, title: "0/1 knapsack (bottom-up table)", sim: "dp-studio.html",
      blurb: "F[i, j] = best value using the first i items with capacity j. Watch the table fill row by row.",
      entry: "Knapsack", inputs: { w: "[2, 1, 3, 2]", v: "[12, 10, 20, 15]", W: "5" }, expect: 37,
      code: `ALGORITHM Knapsack(w[1..n], v[1..n], W)
    // Best total value of items (weights w, values v) that fit in capacity W
    F ← matrix(n + 1, W + 1, 0)
    for i ← 1 to n do
        for j ← 1 to W do
            if j ≥ w[i] then
                F[i, j] ← max(F[i - 1, j], v[i] + F[i - 1, j - w[i]])
            else
                F[i, j] ← F[i - 1, j]
    return F[n, W]
`,
    },
    {
      id: "lcs", chapter: 8, title: "Longest common subsequence length", sim: "dp-studio.html",
      blurb: "Match the last characters or drop one of them — an (m + 1) × (n + 1) table of answers.",
      entry: "LCSLength", inputs: { X: "ABCBDAB", Y: "BDCABA" }, expect: 4,
      code: `ALGORITHM LCSLength(X[0..m-1], Y[0..n-1])
    // Length of a longest common subsequence of X and Y
    L ← matrix(m + 1, n + 1, 0)
    for i ← 1 to m do
        for j ← 1 to n do
            if X[i - 1] = Y[j - 1] then
                L[i, j] ← L[i - 1, j - 1] + 1
            else
                L[i, j] ← max(L[i - 1, j], L[i, j - 1])
    return L[m, n]
`,
    },
    {
      id: "warshall", chapter: 8, title: "Warshall's transitive closure", sim: "warshall-floyd.html",
      blurb: "After round k, R[i, j] = 1 if j is reachable from i using only vertices 0..k in between.",
      entry: "Warshall", inputs: { A: "[[0, 1, 0, 0], [0, 0, 0, 1], [0, 0, 0, 0], [1, 0, 1, 0]]" }, expect: [[1, 1, 1, 1], [1, 1, 1, 1], [0, 0, 0, 0], [1, 1, 1, 1]],
      growth: { gen: "bitmatrix", sizes: [4, 8, 12, 16, 24, 32], metric: "steps", expect: "n^3" },
      code: `ALGORITHM Warshall(A[0..n-1, 0..n-1])
    // Transitive closure of a digraph given by its adjacency matrix
    R ← matrix(n, n, 0)
    for i ← 0 to n - 1 do
        for j ← 0 to n - 1 do
            R[i, j] ← A[i, j]
    for k ← 0 to n - 1 do
        for i ← 0 to n - 1 do
            for j ← 0 to n - 1 do
                if R[i, k] = 1 and R[k, j] = 1 then
                    R[i, j] ← 1
    return R
`,
    },
    {
      id: "floyd", chapter: 8, title: "Floyd's all-pairs shortest paths", sim: "warshall-floyd.html",
      blurb: "Allow one more intermediate vertex per round: D[i, j] ← min(D[i, j], D[i, k] + D[k, j]). ∞ means no edge.",
      entry: "Floyd", inputs: { W: "[[0, ∞, 3, ∞], [2, 0, ∞, ∞], [∞, 7, 0, 1], [6, ∞, ∞, 0]]" }, expect: [[0, 10, 3, 4], [2, 0, 5, 6], [7, 7, 0, 1], [6, 16, 9, 0]],
      growth: { gen: "weights", sizes: [4, 8, 12, 16, 24, 32], metric: "steps", expect: "n^3" },
      code: `ALGORITHM Floyd(W[0..n-1, 0..n-1])
    // Shortest-path distances between every pair of vertices
    D ← matrix(n, n, 0)
    for i ← 0 to n - 1 do
        for j ← 0 to n - 1 do
            D[i, j] ← W[i, j]
    for k ← 0 to n - 1 do
        for i ← 0 to n - 1 do
            for j ← 0 to n - 1 do
                D[i, j] ← min(D[i, j], D[i, k] + D[k, j])
    return D
`,
    },

    /* ---------------- Chapter 9 ---------------- */
    {
      id: "prim", chapter: 9, title: "Prim's minimum spanning tree (with a priority queue)", sim: "greedy-graphs.html",
      blurb: "Grow one tree, always adding the cheapest edge that reaches a new vertex. Returns the tree's total weight.",
      entry: "Prim", inputs: { n: "6", E: "[[0, 1, 3], [0, 4, 6], [0, 5, 5], [1, 2, 1], [1, 5, 4], [2, 3, 6], [2, 5, 4], [3, 4, 8], [3, 5, 5], [4, 5, 2]]" }, expect: 15,
      growth: { gen: "edges", sizes: [256, 512, 1024, 2048, 4096, 8192], metric: "steps", roles: { n: "n", E: "input" }, expect: "n log n" },
      code: `ALGORITHM Prim(n, E)
    // E lists undirected edges [u, v, w] of a connected graph on vertices 0..n-1
    adj ← array(n, [])
    for each (u, v, w) in E do
        append(adj[u], [v, w])
        append(adj[v], [u, w])
    inTree ← array(n, false)
    Q ← priorityQueue()
    insert(Q, [0, 0], 0)             // [vertex, weight of the edge that reaches it]
    total ← 0
    while not isEmpty(Q) do
        e ← deleteMin(Q)
        u ← e[0]
        if inTree[u] then continue   // a stale, more expensive entry
        inTree[u] ← true
        total ← total + e[1]
        for each (v, w) in adj[u] do
            if not inTree[v] then insert(Q, [v, w], w)
    return total
`,
    },
    {
      id: "dijkstra", chapter: 9, title: "Dijkstra's shortest paths (with a priority queue)", sim: "greedy-graphs.html",
      blurb: "Settle the closest unsettled vertex, then relax its edges. Weights must be non-negative.",
      entry: "Dijkstra", inputs: { n: "5", E: "[[0, 1, 3], [0, 3, 7], [1, 2, 4], [1, 3, 2], [2, 3, 5], [2, 4, 6], [3, 4, 4]]", s: "0" }, expect: [0, 3, 7, 5, 9],
      growth: { gen: "edges", sizes: [256, 512, 1024, 2048, 4096, 8192], metric: "steps", roles: { n: "n", E: "input", s: "value" }, expect: "n log n" },
      code: `ALGORITHM Dijkstra(n, E, s)
    // Distances from s; E lists undirected edges [u, v, w] with w ≥ 0
    adj ← array(n, [])
    for each (u, v, w) in E do
        append(adj[u], [v, w])
        append(adj[v], [u, w])
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
    return d
`,
    },
    {
      id: "huffman", chapter: 9, title: "Huffman code lengths", sim: "huffman.html",
      blurb: "Merge the two lightest trees until one is left; each merge adds one bit to every symbol inside.",
      entry: "HuffmanLengths", inputs: { F: "[35, 10, 20, 20, 15]" }, expect: [2, 3, 2, 2, 3],
      code: `ALGORITHM HuffmanLengths(F[0..n-1])
    // Codeword length of each symbol, given the symbol frequencies F
    if n = 1 then return [1]
    L ← array(n, 0)
    Q ← priorityQueue()
    for i ← 0 to n - 1 do
        insert(Q, [F[i], [i]], F[i])     // a tree = [weight, symbols inside it]
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
    return L
`,
    },

    /* ---------------- Chapter 12 ---------------- */
    {
      id: "n-queens", chapter: 12, title: "n-Queens by backtracking", sim: "backtracking.html",
      blurb: "Place one queen per row; when no column is safe, back up and move the previous queen.",
      entry: "Queens", inputs: { n: "6" }, expect: [1, 3, 5, 0, 2, 4],
      code: `ALGORITHM Queens(n)
    // col[r] = column of the queen in row r, for the first solution found
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
    // no earlier queen in the same column or on a diagonal
    for i ← 0 to r - 1 do
        if col[i] = c or abs(col[i] - c) = r - i then
            return false
    return true
`,
    },

    /* ---------------- Beyond: Chapter 13 ---------------- */
    {
      id: "union-find", chapter: 13, title: "Union-find with path compression", sim: "union-find.html",
      blurb: "Union by rank plus path compression: nearly constant time per operation. Returns how many groups remain.",
      entry: "CountGroups", inputs: { n: "8", pairs: "[[0, 1], [2, 3], [1, 3], [4, 5], [6, 6], [5, 4]]" }, expect: 4,
      code: `ALGORITHM CountGroups(n, pairs)
    // Merges the groups of each pair (a, b); returns the number of groups left
    parent ← array(n, 0)
    rank ← array(n, 0)
    for i ← 0 to n - 1 do
        parent[i] ← i
    groups ← n
    for each (a, b) in pairs do
        ra ← Find(parent, a)
        rb ← Find(parent, b)
        if ra ≠ rb then
            if rank[ra] < rank[rb] then swap ra and rb
            parent[rb] ← ra
            if rank[ra] = rank[rb] then rank[ra] ← rank[ra] + 1
            groups ← groups - 1
    return groups

ALGORITHM Find(parent, x)
    // the root of x's tree; every node on the way is re-pointed at the root
    if parent[x] ≠ x then
        parent[x] ← Find(parent, parent[x])
    return parent[x]
`,
    },
    {
      id: "fenwick", chapter: 13, title: "Fenwick tree (binary indexed tree) range sums", sim: "segment-tree.html",
      blurb: "Each cell T[i] stores the sum of a block whose length is i's lowest set bit; prefix sums take O(log n) hops.",
      entry: "FenwickSums", inputs: { A: "[3, 2, -1, 6, 5, 4, -3, 3]", queries: "[[0, 3], [2, 5], [4, 7]]" }, expect: [10, 14, 9],
      code: `ALGORITHM FenwickSums(A[0..n-1], queries)
    // For each query (l, r): A[l] + … + A[r]
    T ← array(n + 1, 0)
    for i ← 0 to n - 1 do
        Update(T, n, i + 1, A[i])
    out ← []
    for each (l, r) in queries do
        append(out, Prefix(T, r + 1) - Prefix(T, l))
    return out

ALGORITHM LowBit(i)
    // the value of i's lowest set bit, e.g. LowBit(12) = 4
    p ← 1
    while i mod (2 * p) = 0 do
        p ← 2 * p
    return p

ALGORITHM Update(T, n, i, delta)
    while i ≤ n do
        T[i] ← T[i] + delta
        i ← i + LowBit(i)

ALGORITHM Prefix(T, i)
    // A[0] + … + A[i - 1]
    s ← 0
    while i > 0 do
        s ← s + T[i]
        i ← i - LowBit(i)
    return s
`,
    },

    /* ---------------- Beyond: Chapter 15 ---------------- */
    {
      id: "kadane", chapter: 15, title: "Maximum subarray (Kadane's scan)", sim: "patterns.html",
      blurb: "Either extend the best run ending here or start fresh — one pass instead of checking all n² subarrays.",
      entry: "MaxSubarray", inputs: { A: "[-2, 1, -3, 4, -1, 2, 1, -5, 4]" }, expect: 6,
      growth: { gen: "random", sizes: SIZES, metric: "steps", expect: "n" },
      code: `ALGORITHM MaxSubarray(A[0..n-1])
    // Largest sum of a non-empty run of consecutive elements
    best ← A[0]
    cur ← A[0]
    for i ← 1 to n - 1 do
        cur ← max(A[i], cur + A[i])
        best ← max(best, cur)
    return best
`,
    },

    /* ---------------- Frontier: Chapter 18 ---------------- */
    {
      id: "skip-list", chapter: 18, title: "Skip list search (given tower heights)", sim: "skip-list.html",
      blurb: "Run right along the top level, drop down when the next key is too big. The printed log shows where each level stops.",
      entry: "SkipSearch", inputs: { K: "[3, 7, 12, 19, 25, 31, 40, 48]", H: "[1, 3, 1, 2, 1, 4, 1, 2]", key: "25" }, expect: 4,
      code: `ALGORITHM SkipSearch(K[0..n-1], H[0..n-1], key)
    // K: sorted keys; H[i]: how many levels node i's tower reaches. Returns key's index or -1
    top ← max(H)
    next ← matrix(top, n + 1, n)      // next[lev][i + 1]: next node after i on level lev (n = end, slot 0 = head)
    for lev ← 0 to top - 1 do
        after ← n
        for i ← n - 1 downto 0 do
            next[lev][i + 1] ← after
            if H[i] > lev then after ← i
        next[lev][0] ← after
    pos ← -1                          // -1 = the head, in front of every key
    for lev ← top - 1 downto 0 do
        nxt ← next[lev][pos + 1]
        while nxt < n and K[nxt] ≤ key do
            pos ← nxt
            nxt ← next[lev][pos + 1]
        print "level", lev, "stops at node", pos
    if pos ≥ 0 and K[pos] = key then
        return pos
    return -1
`,
    },
    {
      id: "cuckoo", chapter: 18, title: "Cuckoo hashing insert", sim: "cuckoo-filters.html",
      blurb: "Two tables, two hash functions; a newcomer kicks the old key out to its other table. Lookups probe just two cells.",
      entry: "CuckooInsertAll", inputs: { keys: "[20, 50, 53, 75, 100, 67, 105, 3, 36, 39]", m: "11" },
      expect: [[null, 100, null, 36, null, null, 50, null, null, 75, null], [3, 20, null, 39, 53, null, 67, null, null, 105, null]],
      code: `ALGORITHM CuckooInsertAll(keys, m)
    // Inserts every key into two tables of size m; returns [T1, T2]
    T1 ← array(m, null)
    T2 ← array(m, null)
    for each x in keys do
        if not Insert(T1, T2, m, x) then
            print "gave up on", x, "- time to rehash with new hash functions"
    return [T1, T2]

ALGORITHM Insert(T1, T2, m, x)
    // h1(x) = x mod m,  h2(x) = (x div m) mod m
    for kick ← 1 to 2 * m do
        h ← x mod m
        if T1[h] = null then
            T1[h] ← x
            return true
        y ← T1[h]                     // evict the old key from table 1 …
        T1[h] ← x
        x ← y
        h ← (x div m) mod m
        if T2[h] = null then          // … and send it to its cell in table 2
            T2[h] ← x
            return true
        y ← T2[h]
        T2[h] ← x
        x ← y
    return false
`,
    },
  ];

  list.forEach((e) => { e.chapterName = CHAPTERS[e.chapter] || ""; e.lesson = LESSON[e.chapter] || null; });
  const byId = {};
  list.forEach((e) => { byId[e.id] = e; });
  return { list, byId, CHAPTERS, get: (id) => byId[id] || null };
});
