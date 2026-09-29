# ⏱️ Complexity Table — Every Algorithm in the Course (and Beyond)

> **Use it when** you need the running time of an algorithm at a glance, or want to compare two algorithms for the
> same job. Chapters 1–12 follow Levitin; Chapters 13–17 are the Beyond-the-textbook lessons.
> Live, filterable version: <https://normansrule.github.io/algorithm-forge/cheatsheet.html#complexity>

**How to read it.** Times count the basic operation named in the lesson (key comparisons for sorting and
searching, multiplications for arithmetic). "Space" is the **extra** memory beyond the input. In graph rows, V and E
are the numbers of vertices and edges. "Stable" means equal keys keep their input order; "in place" means Θ(1) extra
array memory (a recursion stack may still be used). A dash means the idea does not apply.

Acronyms: Greatest Common Divisor (GCD), Depth-First Search (DFS), Breadth-First Search (BFS), Traveling Salesman
Problem (TSP), Binary Search Tree (BST), Adelson-Velsky–Landis tree (AVL), Knuth–Morris–Pratt (KMP), Dynamic
Programming (DP), Longest Common Subsequence (LCS), Minimum Spanning Tree (MST), Directed Acyclic Graph (DAG),
Strongly Connected Components (SCC), Longest Increasing Subsequence (LIS), Least Recently Used (LRU), input/output (I/O),
Least Common Multiple (LCM), Boolean satisfiability (SAT), Nondeterministic Polynomial time (NP), First-Fit Decreasing (FFD).

---

## Chapters 1–2 · Introduction and the analysis framework

| Algorithm | Ch | Best | Average | Worst | Space | Stable / in place | Key idea |
|---|---|---|---|---|---|---|---|
| Euclid's GCD | 1 | Θ(1) | Θ(log n) | Θ(log n) | Θ(1) | — | gcd(m, n) = gcd(n, m mod n); worst case on consecutive Fibonacci numbers |
| Consecutive-integer GCD check | 1 | Θ(1) | — | Θ(min(m, n)) | Θ(1) | — | try t = min(m, n), min − 1, … until t divides both |
| Sieve of Eratosthenes | 1 | Θ(n log log n) | Θ(n log log n) | Θ(n log log n) | Θ(n) | — | cross out multiples of each prime p, starting at p² |
| Sequential search | 2 | Θ(1) | (n + 1)/2 if found, Θ(n) | n comparisons, Θ(n) | Θ(1) | — | scan until found; a sentinel removes the bounds check |
| Largest element | 2 | n − 1 | n − 1 | n − 1 | Θ(1) | — | keep the best so far; input-insensitive |
| Element uniqueness (brute force) | 2 | Θ(1) | — | n(n − 1)/2, Θ(n²) | Θ(1) | — | compare every pair once |
| Matrix multiplication (definition) | 2 | n³ | n³ | n³ multiplications | Θ(n²) for the result | — | each of n² entries is a length-n dot product |
| Binary digit count | 2 | Θ(log n) | Θ(log n) | ⌊log₂ n⌋ + 1 digits | Θ(1) | — | halve until 1; the recursive version adds Θ(log n) stack |
| Factorial (recursive) | 2 | n multiplications | n | n | Θ(n) stack | — | M(n) = M(n − 1) + 1 |
| Tower of Hanoi | 2 | 2ⁿ − 1 moves | 2ⁿ − 1 | 2ⁿ − 1 | Θ(n) stack | — | move n − 1 aside, move the largest, move n − 1 back |
| Fibonacci, naive recursion | 2 | Θ(φⁿ) | Θ(φⁿ) | Θ(φⁿ) calls | Θ(n) stack | — | the same subproblems recomputed exponentially often |
| Fibonacci, iterative | 2 | Θ(n) | Θ(n) | Θ(n) | Θ(1) | — | keep only the last two values |
| Fibonacci, matrix power | 2 | Θ(log n) | Θ(log n) | Θ(log n) matrix products | Θ(1) | — | power of [[1, 1], [1, 0]] by repeated squaring |

## Chapter 3 · Brute force and exhaustive search

| Algorithm | Ch | Best | Average | Worst | Space | Stable / in place | Key idea |
|---|---|---|---|---|---|---|---|
| Selection sort | 3 | n(n − 1)/2 | n(n − 1)/2 | n(n − 1)/2 comparisons | Θ(1) | not stable · in place | only n − 1 swaps — good when writes are expensive |
| Bubble sort | 3 | Θ(n²) (Θ(n) with early exit) | Θ(n²) | n(n − 1)/2 comparisons | Θ(1) | stable · in place | adjacent swaps bubble the maximum to the end |
| Brute-force string matching | 3 | Θ(m) | Θ(n) on random text | m(n − m + 1), Θ(nm) | Θ(1) | — | try every alignment of the pattern (length m) in the text (length n) |
| Closest pair (brute force) | 3 | Θ(n²) | Θ(n²) | Θ(n²) | Θ(1) | — | all n(n − 1)/2 pairs; compare squared distances |
| Convex hull (brute force) | 3 | Θ(n³) | Θ(n³) | Θ(n³) | Θ(n) | — | a pair is a hull edge if every other point is on one side |
| TSP (exhaustive search) | 3 | Θ(n!) | Θ(n!) | (n − 1)!/2 tours | Θ(n) | — | fix the start city; every tour and its reverse count once |
| Knapsack (exhaustive search) | 3 | Θ(n·2ⁿ) | Θ(n·2ⁿ) | Θ(n·2ⁿ) | Θ(n) | — | every subset of items |
| Assignment (exhaustive search) | 3 | Θ(n·n!) | Θ(n·n!) | Θ(n·n!) | Θ(n) | — | every permutation of jobs |
| DFS / BFS, adjacency matrix | 3 | Θ(V²) | Θ(V²) | Θ(V²) | Θ(V) | — | scanning a row costs V even for few neighbors |
| DFS / BFS, adjacency lists | 3 | Θ(V + E) | Θ(V + E) | Θ(V + E) | Θ(V) | — | DFS uses a stack (recursion), BFS a queue |

## Chapter 4 · Decrease-and-conquer

| Algorithm | Ch | Best | Average | Worst | Space | Stable / in place | Key idea |
|---|---|---|---|---|---|---|---|
| Insertion sort | 4 | n − 1 | ≈ n²/4 | n(n − 1)/2 comparisons | Θ(1) | stable · in place | insert A[i] into the sorted A[0..i − 1]; great on almost-sorted data |
| Topological sort (DFS or source removal) | 4 | Θ(V + E) | Θ(V + E) | Θ(V + E) | Θ(V) | — | reverse DFS finishing order, or repeatedly delete a source |
| Permutations (Johnson–Trotter, lexicographic) | 4 | Θ(n!) | Θ(n!) | Θ(n!) | Θ(n) | — | each new permutation is one adjacent swap away (Johnson–Trotter) |
| Subsets (binary counting, Gray code) | 4 | Θ(2ⁿ) | Θ(2ⁿ) | Θ(2ⁿ) | Θ(n) | — | Gray code changes exactly one element per step |
| Binary search | 4 | 1 | ≈ log₂ n | ⌊log₂ n⌋ + 1 comparisons | Θ(1) | — | discard half of the sorted range each step |
| Fake-coin problem | 4 | Θ(log n) | Θ(log n) | ⌈log₃ n⌉ weighings (3 piles) | Θ(1) | — | split into piles and weigh; the light pile holds the fake |
| Russian peasant multiplication | 4 | Θ(log n) | Θ(log n) | Θ(log n) | Θ(1) | — | halve n, double m, add m when n is odd |
| Josephus problem | 4 | Θ(log n) | Θ(log n) | Θ(log n) | Θ(1) | — | J(n) = one-bit cyclic left shift of n in binary |
| Quickselect (Lomuto) | 4 | Θ(n) | Θ(n) | Θ(n²) | Θ(1) | — | partition, then recurse into only the side holding the k-th element |
| Interpolation search | 4 | Θ(1) | Θ(log log n) on uniform keys | Θ(n) | Θ(1) | — | guess the position from the key's value |
| BST search / insert | 4 | Θ(1) | Θ(log n) (random insertions) | Θ(n) | Θ(1) | — | go left or right at each node; degenerates into a list |

## Chapter 5 · Divide-and-conquer

| Algorithm | Ch | Best | Average | Worst | Space | Stable / in place | Key idea |
|---|---|---|---|---|---|---|---|
| Mergesort | 5 | Θ(n log n) | Θ(n log n) | n log₂ n − n + 1 comparisons | Θ(n) | stable · not in place | sort halves, merge in linear time |
| Quicksort | 5 | Θ(n log n) | ≈ 1.39 n log₂ n | Θ(n²) | Θ(log n) stack (average) | not stable · in place | partition around a pivot; recurse on both sides |
| Binary tree traversals (pre/in/post) | 5 | Θ(n) | Θ(n) | Θ(n) | Θ(height) stack | — | visit root, left subtree, right subtree in some order |
| Tree height, leaf count | 5 | Θ(n) | Θ(n) | Θ(n) | Θ(height) stack | — | answer for the root from the answers for the subtrees |
| Karatsuba multiplication | 5 | Θ(n^1.585) | Θ(n^1.585) | Θ(n^1.585) digit multiplications | Θ(n) | — | three half-size products instead of four |
| Strassen matrix multiplication | 5 | Θ(n^2.807) | Θ(n^2.807) | Θ(n^2.807) | Θ(n²) | — | seven half-size products instead of eight |
| Closest pair (divide-and-conquer) | 5 | Θ(n log n) | Θ(n log n) | Θ(n log n) | Θ(n) | — | presort by x and y; only a narrow strip needs checking |
| QuickHull | 5 | Θ(n log n) | Θ(n log n) typical | Θ(n²) | Θ(n) | — | the farthest point from a line splits the problem in two |

## Chapter 6 · Transform-and-conquer

| Algorithm | Ch | Best | Average | Worst | Space | Stable / in place | Key idea |
|---|---|---|---|---|---|---|---|
| Presorting: uniqueness, mode | 6 | Θ(n log n) | Θ(n log n) | Θ(n log n) | depends on the sort | — | after sorting, equal values are neighbors |
| Gaussian elimination | 6 | Θ(n³) | Θ(n³) | ≈ n³/3 multiplications | Θ(1) extra | — | reduce to upper-triangular form, back-substitute |
| AVL tree search / insert / delete | 6 | Θ(log n) | Θ(log n) | Θ(log n) | Θ(n) nodes | — | rotations keep the two subtree heights within 1 |
| 2-3 tree search / insert | 6 | Θ(log n) | Θ(log n) | Θ(log n) | Θ(n) nodes | — | all leaves on one level; full nodes split upward |
| Heap: bottom-up construction | 6 | Θ(n) | Θ(n) | < 2n comparisons | Θ(1) | in place | sift down from the last parent to the root |
| Heap: insert, delete the root | 6 | Θ(1) | Θ(log n) | Θ(log n) | Θ(1) | in place | sift up / sift down along one path |
| Heapsort | 6 | Θ(n log n) | Θ(n log n) | Θ(n log n) | Θ(1) | not stable · in place | build a heap, then delete the maximum n − 1 times |
| Horner's rule | 6 | n | n | n multiplications and n additions | Θ(1) | — | p(x) = (…(aₙx + aₙ₋₁)x + …)x + a₀ |
| Binary exponentiation (left-to-right, right-to-left) | 6 | Θ(log n) | Θ(log n) | ≤ 2⌊log₂ n⌋ multiplications | Θ(1) | — | square for every bit of n, multiply for every 1 bit |
| LCM via GCD | 6 | Θ(1) | Θ(log n) | Θ(log n) | Θ(1) | — | lcm(m, n) = m·n / gcd(m, n) (problem reduction) |

## Chapter 7 · Space-time trade-offs

| Algorithm | Ch | Best | Average | Worst | Space | Stable / in place | Key idea |
|---|---|---|---|---|---|---|---|
| Comparison counting sort | 7 | n(n − 1)/2 | n(n − 1)/2 | n(n − 1)/2 comparisons | Θ(n) | not in place | an element's position = how many elements are smaller |
| Distribution counting sort | 7 | Θ(n + r) | Θ(n + r) | Θ(n + r) | Θ(n + r) | stable · not in place | count each value in a range of size r, prefix-sum, place |
| Radix sort (least significant digit first) | 7 | Θ(d(n + r)) | Θ(d(n + r)) | Θ(d(n + r)) | Θ(n + r) | stable | d passes of a stable sort, one per digit |
| Bucket sort | 7 | Θ(n) | Θ(n) on uniform keys | Θ(n²) | Θ(n) | stable (with insertion sort) | spread keys into buckets, sort each bucket |
| Horspool string matching | 7 | Θ(n/m) | Θ(n) on random text | Θ(nm) | Θ(alphabet) | — | shift by the table entry for the text character under the pattern's last position |
| Boyer–Moore string matching | 7 | Θ(n/m) | often sublinear | Θ(nm) in simple versions | Θ(m + alphabet) | — | bad-symbol and good-suffix shifts, take the larger |
| KMP string matching | 7 | Θ(n + m) | Θ(n + m) | Θ(n + m) | Θ(m) | — | the prefix function says how far to fall back without rereading the text |
| Hashing, separate chaining | 7 | Θ(1) | ≈ 1 + α/2 probes (successful) | Θ(n) | Θ(n + m) | — | load factor α = n/m keys per cell |
| Hashing, linear probing | 7 | Θ(1) | ≈ ½(1 + 1/(1 − α)) probes (successful) | Θ(n) | Θ(m) | — | clusters form as α approaches 1 |
| B-tree search / insert | 7 | Θ(log n) | Θ(log n) | Θ(log n): about log base m/2 of n disk reads | Θ(n) | — | wide nodes (order m) keep the tree very short |

## Chapter 8 · Dynamic programming

| Algorithm | Ch | Best | Average | Worst | Space | Stable / in place | Key idea |
|---|---|---|---|---|---|---|---|
| Coin-row problem | 8 | Θ(n) | Θ(n) | Θ(n) | Θ(n), or Θ(1) with two variables | — | F(i) = max(cᵢ + F(i − 2), F(i − 1)) |
| Change-making (DP) | 8 | Θ(nm) | Θ(nm) | Θ(nm) | Θ(n) | — | amount n, m denominations: F(n) = 1 + min over coins of F(n − dⱼ) |
| Robot coin collection | 8 | Θ(nm) | Θ(nm) | Θ(nm) | Θ(nm) | — | F(i, j) = max(F(i − 1, j), F(i, j − 1)) + coin(i, j) |
| 0/1 knapsack (bottom-up) | 8 | Θ(nW) | Θ(nW) | Θ(nW) | Θ(nW) | — | pseudo-polynomial: W is a value, not a size |
| Knapsack memory function | 8 | fewer cells | fewer cells | Θ(nW) | Θ(nW) | — | top-down recursion, computing each needed cell once |
| Binomial coefficient | 8 | Θ(nk) | Θ(nk) | Θ(nk) | Θ(k) possible | — | Pascal's rule C(n, k) = C(n − 1, k − 1) + C(n − 1, k) |
| LCS, edit distance | 8 | Θ(mn) | Θ(mn) | Θ(mn) | Θ(mn), Θ(min) for the value only | — | a 2-D table over prefixes of both strings |
| Optimal BST | 8 | Θ(n³) | Θ(n³) | Θ(n³) | Θ(n²) | — | try every root for every range; Θ(n²) with Knuth's speedup |
| Warshall (transitive closure) | 8 | Θ(n³) | Θ(n³) | Θ(n³) | Θ(n²) | — | allow intermediate vertices 1..k, one k at a time |
| Floyd (all-pairs shortest paths) | 8 | Θ(n³) | Θ(n³) | Θ(n³) | Θ(n²) | — | D[i, j] ← min(D[i, j], D[i, k] + D[k, j]) |

## Chapter 9 · Greedy technique

| Algorithm | Ch | Best | Average | Worst | Space | Stable / in place | Key idea |
|---|---|---|---|---|---|---|---|
| Prim's MST, unordered array | 9 | Θ(V²) | Θ(V²) | Θ(V²) | Θ(V) | — | grow one tree by its cheapest outgoing edge; good for dense graphs |
| Prim's MST, binary heap | 9 | O(E log V) | O(E log V) | O(E log V) | Θ(V) | — | same idea with a priority queue |
| Kruskal's MST | 9 | O(E log E) | O(E log E) | O(E log E) | Θ(V + E) | — | sort edges; add each one that joins two different trees (union–find) |
| Union–find, union by size + path compression | 9 | Θ(1) | nearly Θ(1) amortized | O(log n) for a single find | Θ(n) | — | shallow trees; flatten them while searching |
| Dijkstra, unordered array | 9 | Θ(V²) | Θ(V²) | Θ(V²) | Θ(V) | — | finalize the closest unfinished vertex; non-negative weights only |
| Dijkstra, binary heap | 9 | O(E log V) | O(E log V) | O(E log V) | Θ(V) | — | same with a priority queue |
| Huffman coding | 9 | Θ(n log n) | Θ(n log n) | Θ(n log n) | Θ(n) | — | merge the two lightest trees, repeat |
| Greedy change-making | 9 | Θ(m) | Θ(m) | Θ(m) | Θ(1) | — | largest coin first; optimal only for canonical coin systems |
| Activity selection | 9 | Θ(n log n) | Θ(n log n) | Θ(n log n) | Θ(n) | — | sort by finish time, take the earliest-finishing compatible one |
| Fractional knapsack | 9 | Θ(n log n) | Θ(n log n) | Θ(n log n) | Θ(n) | — | best value per weight first; split the last item |

## Chapter 10 · Iterative improvement

| Algorithm | Ch | Best | Average | Worst | Space | Stable / in place | Key idea |
|---|---|---|---|---|---|---|---|
| Simplex method | 10 | — | fast in practice (polynomially many pivots typical) | exponential (Klee–Minty examples) | Θ(mn) tableau | — | walk from vertex to adjacent better vertex |
| Maximum flow, shortest augmenting path | 10 | — | — | O(V E²) | Θ(V + E) | — | augment along the shortest path in the residual network (BFS) |
| Maximum bipartite matching (augmenting paths) | 10 | — | — | O(V E) | Θ(V) | — | flip an alternating path that starts and ends at free vertices |
| Stable marriage (Gale–Shapley) | 10 | Θ(n) proposals | — | Θ(n²) proposals | Θ(n²) preferences | — | free men propose in order; women trade up |

## Chapters 11–12 · Limits, and coping with them

| Algorithm | Ch | Best | Average | Worst | Space | Stable / in place | Key idea |
|---|---|---|---|---|---|---|---|
| Any comparison sort (lower bound) | 11 | — | ≥ log₂ n! | ≥ ⌈log₂ n!⌉ ≈ n log₂ n comparisons | — | — | a decision tree needs n! leaves |
| Searching a sorted array (lower bound) | 11 | — | — | ≥ ⌈log₂(n + 1)⌉ comparisons | — | — | a ternary decision tree with 2n + 1 leaves |
| SAT: verify a certificate vs. brute force | 11 | — | — | verify Θ(formula size); brute force Θ(2ⁿ · size) | — | — | NP = quick to check, not necessarily quick to find |
| Backtracking (n-queens, subset-sum, Hamiltonian circuit) | 12 | small | usually far less than the full tree | exponential | Θ(n) stack | — | extend a partial solution; back up when it can't be completed |
| Branch-and-bound (assignment, knapsack, TSP) | 12 | small | depends on the bound | exponential | up to exponential (best-first) | — | prune nodes whose bound can't beat the best solution so far |
| Nearest-neighbor TSP | 12 | Θ(n²) | Θ(n²) | Θ(n²) | Θ(n) | — | go to the closest unvisited city; accuracy ratio unbounded |
| Twice-around-the-tree TSP | 12 | Θ(n²) | Θ(n²) | Θ(n²) with Prim | Θ(n) | — | MST walk with shortcuts; ≤ 2 × optimal on Euclidean instances |
| Christofides TSP | 12 | Θ(n³) | Θ(n³) | Θ(n³) | Θ(n²) | — | MST + minimum-weight matching on odd vertices; ≤ 1.5 × optimal (metric) |
| Greedy knapsack approximation (enhanced) | 12 | Θ(n log n) | Θ(n log n) | Θ(n log n) | Θ(n) | — | best ratio first, compared with the single most valuable item: ≥ ½ optimal |
| First-fit / first-fit decreasing bin packing | 12 | Θ(n²) simple | Θ(n²) | Θ(n²) (Θ(n log n) with a tree) | Θ(n) | — | FFD uses at most about 11/9 × the optimal number of bins (plus a constant) |
| Bisection method | 12 | — | — | ⌈log₂((b − a)/ε)⌉ iterations | Θ(1) | — | halve an interval where the sign changes; always converges |
| Newton's method | 12 | — | quadratic convergence near a simple root | may diverge | Θ(1) | — | xₙ₊₁ = xₙ − f(xₙ)/f′(xₙ) |

## Chapters 13–17 · Beyond the textbook

| Algorithm | Ch | Best | Average | Worst | Space | Stable / in place | Key idea |
|---|---|---|---|---|---|---|---|
| Dynamic array append (doubling) | 13 | Θ(1) | Θ(1) amortized | Θ(n) for one resize | Θ(n) | — | double the capacity when full; total copying < 2n |
| Fenwick tree (binary indexed tree) | 13 | Θ(log n) | Θ(log n) | Θ(log n) per update or prefix query | Θ(n) | — | index i covers a range of length lowbit(i) |
| Segment tree | 13 | Θ(log n) | Θ(log n) | Θ(log n) per query/update; Θ(n) build | Θ(n) (about 4n) | — | each node stores the answer for one segment |
| Trie | 13 | Θ(L) | Θ(L) | Θ(L) per word of length L | Θ(total characters) | — | one edge per character; shared prefixes share nodes |
| Skip list | 13 | Θ(1) | Θ(log n) expected | Θ(n) | Θ(n) expected | — | random express lanes over a sorted linked list |
| LRU cache (hash map + linked list) | 13 | Θ(1) | Θ(1) | Θ(1) expected | Θ(capacity) | — | the map finds the node; the list keeps recency order |
| Red-black tree | 13 | Θ(log n) | Θ(log n) | Θ(log n) | Θ(n) | — | colors guarantee height ≤ 2 log₂(n + 1) |
| Bellman–Ford | 14 | Θ(E) (early stop) | Θ(VE) | Θ(VE) | Θ(V) | — | relax every edge V − 1 times; one more round detects a negative cycle |
| A* search | 14 | depends on the heuristic | — | O(E log V) with a consistent heuristic | Θ(V) | — | Dijkstra ordered by g + h, where h never overestimates |
| 0-1 BFS | 14 | Θ(V + E) | Θ(V + E) | Θ(V + E) | Θ(V) | — | a deque: weight-0 edges to the front, weight-1 to the back |
| SCC (Kosaraju, Tarjan) | 14 | Θ(V + E) | Θ(V + E) | Θ(V + E) | Θ(V) | — | two DFS passes (Kosaraju) or one pass with low-links (Tarjan) |
| Bridges and articulation points | 14 | Θ(V + E) | Θ(V + E) | Θ(V + E) | Θ(V) | — | low-link values from one DFS |
| DAG shortest / longest path | 14 | Θ(V + E) | Θ(V + E) | Θ(V + E) | Θ(V) | — | relax edges in topological order |
| Two pointers, sliding window | 15 | Θ(n) | Θ(n) | Θ(n) | Θ(1) or Θ(alphabet) | — | each pointer only moves forward: at most 2n steps |
| Monotonic stack / deque | 15 | Θ(n) | Θ(n) | Θ(n) | Θ(n) | — | every element is pushed and popped at most once |
| Binary search on the answer | 15 | Θ(n log R) | Θ(n log R) | Θ(n log R) | Θ(1) | — | R = range of candidate answers; a feasibility check costs n |
| Kadane's maximum subarray | 15 | Θ(n) | Θ(n) | Θ(n) | Θ(1) | — | best sum ending here = max(x, best ending before + x) |
| LIS, quadratic DP | 15 | Θ(n²) | Θ(n²) | Θ(n²) | Θ(n) | — | L(i) = 1 + max L(j) over earlier smaller elements |
| LIS, patience sorting | 15 | Θ(n log n) | Θ(n log n) | Θ(n log n) | Θ(n) | — | binary search for the pile each element joins |
| Matrix-chain order | 15 | Θ(n³) | Θ(n³) | Θ(n³) | Θ(n²) | — | interval DP over every split point |
| Held–Karp TSP | 15 | Θ(n²2ⁿ) | Θ(n²2ⁿ) | Θ(n²2ⁿ) | Θ(n2ⁿ) | — | DP over (set of visited cities, last city) |
| Merge intervals | 15 | Θ(n log n) | Θ(n log n) | Θ(n log n) | Θ(n) | — | sort by start, then sweep |
| k-way merge / top-k with a heap | 15 | Θ(N log k) | Θ(N log k) | Θ(N log k) | Θ(k) | — | a heap of size k holds one candidate per list |
| Randomized quicksort | 16 | Θ(n log n) | ≈ 1.39 n log₂ n expected | Θ(n²) (vanishingly unlikely) | Θ(log n) expected | not stable · in place | a random pivot makes every input "average" |
| Karger's min cut (one run) | 16 | Θ(n²) | Θ(n²) | Θ(n²) | Θ(n + E) | — | contract random edges; succeeds with probability ≥ 2/(n(n − 1)) |
| Miller–Rabin primality (k rounds) | 16 | O(k log³ n) | O(k log³ n) | O(k log³ n) | Θ(1) | — | error probability ≤ 4⁻ᵏ |
| Bloom filter (k hash functions) | 16 | Θ(k) | Θ(k) | Θ(k) per insert or query | m bits | — | no false negatives; false-positive rate ≈ (1 − e^(−kn/m))^k |
| Count-Min sketch | 16 | Θ(d) | Θ(d) | Θ(d) per update | Θ(d·w) | — | d rows of w counters; estimates only ever overcount |
| HyperLogLog | 16 | Θ(1) | Θ(1) | Θ(1) per item | m registers | — | standard error ≈ 1.04/√m for distinct counts |
| Reservoir sampling | 16 | Θ(n) | Θ(n) | Θ(n) | Θ(k) | — | keep item i with probability k/i |
| Fisher–Yates shuffle | 16 | Θ(n) | Θ(n) | Θ(n) | Θ(1) | in place | swap A[i] with a random A[j], j ≤ i |
| Rabin–Karp string matching | 15–16 | Θ(n + m) | Θ(n + m) expected | Θ(nm) | Θ(1) | — | rolling hash of each window; verify on a hash match |
| Z-function string matching | 15 | Θ(n + m) | Θ(n + m) | Θ(n + m) | Θ(n + m) | — | reuse the rightmost matched window ([l, r] box) |
| External merge sort | 17 | Θ((N/B) · log base M/B of (N/B)) | same | same I/Os | Θ(M) memory | stable (if runs merge stably) | sort memory-sized runs, then multi-way merge |

---
⬅️ [Cheat sheet page](https://normansrule.github.io/algorithm-forge/cheatsheet.html) · See also: [asymptotics](asymptotics.md), [summations and recurrences](summations-and-recurrences.md)
