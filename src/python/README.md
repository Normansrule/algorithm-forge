# 🐍 `algoforge` — the Algorithm Forge Python library

A tested, beginner-readable Python implementation of every algorithm in the Algorithm Forge lessons:
Levitin's *Introduction to the Design and Analysis of Algorithms* (3rd ed.), chapters 1–12, plus six
"beyond the book" chapters (13–18) that take you to senior-engineer territory and on to the research frontier.

- **Readable over clever.** Each function is short, named after what it does, and written the way you would
  trace it by hand. No third-party packages — Python 3.10+ standard library only.
- **Cited.** Every docstring says what the function does in one line, where it lives in the book
  (for example "Levitin §4.4" or "Levitin Exercise 3.2"), and its time/space complexity.
- **Measurable.** Algorithms whose analysis matters accept an optional `counter` so you can count the
  *basic operation* (Levitin §2.1) instead of guessing.
- **Trustworthy.** Everything is covered by `pytest`, mostly with randomized tests against brute-force oracles
  (every sort against `sorted()`, dynamic programming against exhaustive search, max-flow against min-cut,
  Huffman against every possible prefix code on tiny alphabets, and so on).

## Acronyms used on this page

Depth-First Search (DFS) · Breadth-First Search (BFS) · Directed Acyclic Graph (DAG) · Binary Search Tree (BST) ·
Adelson-Velsky and Landis tree (AVL tree) · Minimum Spanning Tree (MST) · Traveling Salesman Problem (TSP) ·
Dynamic Programming (DP) · Longest Common Subsequence (LCS) · Longest Increasing Subsequence (LIS) ·
Knuth–Morris–Pratt (KMP) · Longest Proper Prefix which is also Suffix (LPS) · Least Significant Digit (LSD) ·
Conjunctive Normal Form (CNF) · Nondeterministic Polynomial time (NP) · First-Fit Decreasing (FFD) ·
Strongly Connected Components (SCC) · Least Recently Used (LRU) · Log-Structured Merge (LSM) ·
Write-Ahead Log (WAL) · Algorithms for Recovery and Isolation Exploiting Semantics (ARIES) · Input/Output (I/O) ·
Conflict-free Replicated Data Type (CRDT) · Secure Hash Algorithm (SHA) · Locality-Sensitive Hashing (LSH) ·
Number-Theoretic Transform (NTT) · Longest Common Prefix (LCP) · Burrows–Wheeler Transform (BWT) ·
First-In First-Out (FIFO) · Single-Source Shortest Paths (SSSP) · exclusive or (XOR) ·
Cormen, Leiserson, Rivest and Stein, *Introduction to Algorithms*, 3rd ed. (CLRS).

## Quick start

From the repository root:

```bash
python3 -m pip install pytest      # the only thing you need, and only for the tests
python3 -m pytest -q               # runs every test in tests/
```

To use the library in your own script or notebook without installing anything, put `src/python` on the path:

```python
import sys; sys.path.insert(0, "src/python")   # path relative to the repo root

from algoforge import ch04_decrease_conquer as dc
dc.binary_search([2, 3, 5, 7, 11, 13], 11)      # -> 4
```

Or install it in editable mode (`python3 -m pip install -e .` from the repo root) and just `import algoforge`.

## Counting basic operations

```python
from algoforge import OpCounter
from algoforge.ch03_brute_force import selection_sort
from algoforge.ch04_decrease_conquer import insertion_sort

for sort in (selection_sort, insertion_sort):
    c = OpCounter()
    sort(list(range(100)), counter=c)        # already-sorted input
    print(sort.__name__, c["comparisons"])
# selection_sort 4950   <- always n(n-1)/2
# insertion_sort 99     <- best case n - 1
```

`OpCounter` is a named tally: `c.tick("swaps")`, `c["swaps"]`, `c.total()`, `c.snapshot()`, `c.reset()`.
Each function's docstring lists the names it ticks (`"comparisons"`, `"swaps"`, `"multiplications"`,
`"additions"`, `"divisions"`, `"moves"` …).

Chapter 2 adds helpers for experiments (Levitin §2.6):

```python
from algoforge import ch02_analysis as an
from algoforge.ch02_analysis import unique_elements

table = an.count_table(unique_elements, lambda n: (list(range(n)),), [100, 200, 400], "comparisons")
# [(100, 4950), (200, 19900), (400, 79800)]
an.growth_ratios(table)          # about [4.02, 4.01] -> doubling n quadruples the work: quadratic
an.evaluate_recurrence(lambda n, T: 2 * T(n - 1) + 1, {1: 1}, 10)   # Tower of Hanoi: 1023
```

## Conventions

| Topic | Convention |
|---|---|
| Sorting | Sorts return a **new** sorted list; your input is never modified. |
| Search results | Index of the key, or `-1` when absent. |
| Graphs | Adjacency dict `{vertex: [neighbors]}`; undirected edges appear in both lists. Vertices are visited in dict order and neighbors in list order, so traces match hand traces. |
| Weighted graphs | `{u: [(v, weight), ...]}` (`ch09_greedy.edges_to_adjacency` builds it from an edge list) or an edge list `[(u, v, w)]`. |
| Matrices | Lists of lists; "no edge" is `math.inf`. |
| Polynomials | Coefficient lists are **lowest degree first**: `coeffs[i]` multiplies `x**i`. |
| Heaps | Max-heaps in 0-based lists (children of `i` are `2i+1`, `2i+2`); Levitin draws them 1-based. |
| Randomness | Randomized functions take an optional `random.Random` so runs are reproducible. |
| Exact arithmetic | Gaussian elimination and the simplex method work with `fractions.Fraction` for exact answers. |

## Every function, by chapter

"Headline cost" is the main running time from the docstring (read the docstring for best/worst/average
cases and space). Levitin references point to sections (§) or end-of-section exercises.

### Chapter 1 · Introduction — `algoforge.ch01_intro`

| Name | What it does | Headline cost | Levitin |
|---|---|---|---|
| `gcd_euclid()` | Greatest common divisor by Euclid's rule gcd(m, n) = gcd(n, m mod n). | O(log min(m, n)) | §1.1 |
| `gcd_consecutive_integer()` | gcd by trying t = min(m, n), min - 1, ... until t divides both numbers. | O(min(m, n)) | §1.1 |
| `sieve_of_eratosthenes()` | Return every prime number <= n by crossing out multiples. | O(n log log n) | §1.1 |
| `prime_factors()` | Return the prime factors of n (with repetition) in nondecreasing order. | O(sqrt(n) log log n) | §1.1 |
| `gcd_middle_school()` | gcd as the product of the prime factors common to m and n. | O(sqrt(N) log log N) | §1.1 |
| `integer_sqrt()` | Return floor(sqrt(n)) by squaring k = 0, 1, 2, ... until k*k exceeds n. | O(sqrt(n)) | Exercise 1.1 |
| `locker_doors()` | Simulate the locker-doors puzzle; return the numbers of doors left open. | O(n log n) | Exercise 1.1.12 |

### Chapter 2 · Fundamentals of the analysis of algorithm efficiency — `algoforge.ch02_analysis`

| Name | What it does | Headline cost | Levitin |
|---|---|---|---|
| `max_element()` | Return the largest value in a nonempty sequence. | Θ(n) | §2.3 |
| `unique_elements()` | Return True when no two elements of A are equal (pairwise check). | Θ(n^2) | §2.3 |
| `matrix_multiply()` | Multiply matrices A (p x q) and B (q x r) with the definition-based triple loop. | Θ(pqr) | §2.3 |
| `binary_digits()` | Count the digits in the binary representation of a positive integer n. | Θ(log n) | §2.3 |
| `binary_digits_recursive()` | Recursive binary digit count: BinRec(n) = BinRec(floor(n/2)) + 1. | Θ(log n) | §2.4 |
| `factorial()` | Compute n! recursively as F(n) = F(n - 1) * n, F(0) = 1. | Θ(n) | §2.4 |
| `hanoi_moves()` | List the moves (disk, from_peg, to_peg) that solve the Tower of Hanoi. | Θ(2^n) | §2.4 |
| `fib_recursive()` | F(n) straight from the definition F(n) = F(n-1) + F(n-2). | Θ(phi^n) | §2.5 |
| `fib_iterative()` | F(n) by walking up from F(0), F(1), keeping only the last two values. | Θ(n) | §2.5 |
| `fib_formula()` | F(n) from Binet's closed form round(phi^n / sqrt(5)). | O(1) | §2.5 |
| `fib_matrix()` | F(n) from the matrix identity [[1,1],[1,0]]^n = [[F(n+1),F(n)],[F(n),F(n-1)]]. | Θ(log n) | §2.5 |
| `measure()` | Run `func(*args, counter=c, **kwargs)` with a fresh counter. | O(1) | §2.6 |
| `count_table()` | Build a table (n, count of `operation`) for several input sizes. | O(sum of the runs) | §2.6 |
| `time_function()` | Time `func` on inputs of each size; return (n, best seconds) pairs. | O(repeats x sum of the runs) | §2.6 |
| `growth_ratios()` | Ratios value(n_{k+1}) / value(n_k) between consecutive table rows. | O(len(table)) | §2.6 |
| `evaluate_recurrence()` | Evaluate a recurrence T(n) numerically with memoization. | O(one `step` call per distinct argument reached) | §2.4 |
| `recurrence_table()` | Return [(n, T(n)) for n in ns] - handy for guessing a closed form. | O(distinct arguments reached) | §2.4 |

### Chapter 3 · Brute force and exhaustive search — `algoforge.ch03_brute_force`

| Name | What it does | Headline cost | Levitin |
|---|---|---|---|
| `selection_sort()` | Return a sorted copy: repeatedly swap the smallest remaining item into place. | Θ(n^2) | §3.1 |
| `bubble_sort()` | Return a sorted copy by swapping adjacent out-of-order neighbors. | Θ(n^2) | §3.1 |
| `bubble_sort_early_exit()` | Bubble sort that stops after a pass with no swaps. | Θ(n) | Exercise 3.1 |
| `sequential_search()` | Return the index of the first element equal to key, or -1. | Θ(n) | §3.1 |
| `sequential_search_sentinel()` | Sequential search that appends key as a sentinel so the loop needs no bounds check. | Θ(n) | §3.2 |
| `brute_force_string_match()` | Index of the first occurrence of pattern in text, or -1, by trying every shift. | O(nm) | §3.2 |
| `brute_force_string_match_all()` | Every index where pattern occurs in text (overlaps included). | O(nm) | §3.2 |
| `count_substrings_brute()` | Count substrings that start with `first` and end with `last` - check every pair. | Θ(n^2) | Exercise 3.2 |
| `count_substrings_one_pass()` | Same count in one left-to-right pass: every `last` closes all `first`s seen so far. | Θ(n) | Exercise 3.2 |
| `poly_eval_naive()` | Evaluate sum coeffs[i] * x^i, computing each power from scratch. | Θ(n^2) | Exercise 3.1 |
| `poly_eval_incremental()` | Evaluate the polynomial keeping a running power x^i (right-to-left in the book). | Θ(n) | Exercise 3.1 |
| `closest_pair_brute()` | Return (distance, p, q) for the closest two points by checking every pair. | Θ(n^2) | §3.3 |
| `ccw_order()` | Order convex-position points counterclockwise, starting at the lowest-leftmost point. | O(h log h) | — |
| `convex_hull_brute()` | Return the extreme points (hull vertices) in counterclockwise order. | Θ(n^3) | §3.3 |
| `tour_cost()` | Total length of a closed tour given as a vertex list (first == last). O(n). | O(n) | — |
| `tsp_exhaustive()` | Shortest Hamiltonian circuit by trying every tour that starts at city 0. | Θ(n!) | §3.4 |
| `knapsack_exhaustive()` | Best total value and item indices by checking all 2^n subsets. | Θ(n 2^n) | §3.4 |
| `assignment_exhaustive()` | Cheapest assignment of n people to n jobs by trying all n! permutations. | Θ(n * n!) | §3.4 |
| `partition_exhaustive()` | Indices of a subset whose sum is exactly half the total, or None. | Θ(n 2^n) | Exercise 3.4 |
| `dfs()` | Depth-First Search (DFS) of the whole graph with edge classification. | Θ(\|V\| + \|E\|) | §3.5 |
| `bfs()` | Breadth-First Search (BFS) of the whole graph with edge classification. | Θ(\|V\| + \|E\|) | §3.5 |
| `connected_components()` | Split an undirected graph into connected components using DFS. | Θ(\|V\| + \|E\|) | §3.5 |

### Chapter 4 · Decrease-and-conquer — `algoforge.ch04_decrease_conquer`

| Name | What it does | Headline cost | Levitin |
|---|---|---|---|
| `insertion_sort()` | Return a sorted copy: insert each element into the sorted part on its left. | Θ(n^2) | §4.1 |
| `insertion_sort_recursive()` | Insertion sort written as true decrease-by-one: sort A[0..n-2], then insert A[n-1]. | Θ(n^2) | §4.1 |
| `binary_insertion_sort()` | Insertion sort that finds each insertion point by binary search. | Θ(n log n) | Exercise 4.1 |
| `topological_sort_dfs()` | Topological order of a Directed Acyclic Graph (DAG) via Depth-First Search (DFS) pop order, reversed. | Θ(\|V\| + \|E\|) | §4.2 |
| `topological_sort_source_removal()` | Topological order by repeatedly deleting a source (a vertex with no incoming edges). | Θ(\|V\| + \|E\|) | §4.2 |
| `permutations_minimal_change()` | Permutations of 1..n built bottom-up by inserting n into each permutation of 1..n-1. | Θ(n!·n) | §4.3 |
| `johnson_trotter()` | Permutations of 1..n by the Johnson-Trotter algorithm (largest mobile element). | Θ(n!·n) | §4.3 |
| `lexicographic_permutations()` | Permutations of 1..n in lexicographic (dictionary) order. | Θ(n!·n) | §4.3 |
| `power_set()` | All subsets of items, by decrease-by-one: subsets without the last item, then with it. | Θ(n·2^n) | §4.3 |
| `gray_code()` | Binary reflected Gray code of order n: consecutive strings differ in one bit. | Θ(n·2^n) | §4.3 |
| `binary_search()` | Index of key in the sorted sequence A, or -1 (iterative). | Θ(log n) | §4.4 |
| `binary_search_recursive()` | Recursive binary search; same answer as `binary_search`. | Θ(log n) | §4.4 |
| `fake_coin_by_2()` | Find the single lighter coin by splitting the pile in two; return (index, weighings). | Θ(log n) | §4.4 |
| `fake_coin_by_3()` | Find the lighter coin by splitting into three piles; return (index, weighings). | Θ(log n) | Exercise 4.4 |
| `russian_peasant()` | Multiply n * m by halving n and doubling m (add m when n is odd). | Θ(log n) | §4.4 |
| `exp_by_squaring()` | Compute a^n with a^n = (a^(n/2))^2 (times a when n is odd), recursively. | Θ(log n) | §4.4 |
| `josephus()` | Survivor J(n) of the Josephus problem (every second person eliminated). | Θ(log n) | §4.4 |
| `josephus_simulate()` | Survivor by simulating the circle (every `step`-th person eliminated). | Θ(n^2) | §4.4 |
| `lomuto_partition()` | Partition A[lo..hi] in place around pivot A[lo]; return the pivot's final index. | Θ(n) | §4.5 |
| `quickselect()` | Return the k-th smallest element (k = 1 is the minimum) using Lomuto partitions. | Θ(n) | §4.5 |
| `interpolation_search()` | Index of key in sorted numeric A, probing where key "should" be by linear interpolation. | Θ(n) | §4.5 |
| `BSTNode` (class) | A node of a Binary Search Tree (BST): key, left subtree, right subtree. | — | — |
| `bst_insert()` | Insert key into the BST (duplicates go right); return the (possibly new) root. | Θ(height) | §4.5 |
| `bst_search()` | Return the node holding key, or None. | Θ(height) | §4.5 |
| `bst_max()` | Largest key in a nonempty BST: keep going right. Levitin Exercise 4.5. Θ(height). | Θ(height) | Exercise 4.5 |
| `bst_from_keys()` | Build a BST by inserting keys in the given order. Θ(n·height). | Θ(n·height) | — |
| `bst_inorder()` | Keys of a BST in sorted order (inorder traversal). Θ(n). | Θ(n) | — |
| `nim_winning_move()` | For multi-pile Nim, return (pile index, new pile size) that wins, or None if losing. | Θ(number of piles) | §4.5 |
| `nim_one_pile_winning_move()` | One-pile Nim (take 1..m chips, last to take wins): how many to take, or None. | Θ(1) | §4.5 |
| `negatives_before_positives_iterative()` | Rearrange so every negative number comes before every non-negative one (two pointers). | Θ(n) | Exercise 5.2.8 |
| `negatives_before_positives_recursive()` | Same rearrangement by decrease-by-one recursion on the unsettled middle range. | Θ(n) | Exercise 5.2.8 |

### Chapter 5 · Divide-and-conquer — `algoforge.ch05_divide_conquer`

| Name | What it does | Headline cost | Levitin |
|---|---|---|---|
| `merge()` | Merge two sorted sequences into one sorted list (stable). | Θ(n) | §5.1 |
| `mergesort()` | Return a sorted copy by top-down mergesort (split in halves, sort, merge). | Θ(n log n) | §5.1 |
| `mergesort_bottom_up()` | Return a sorted copy by merging runs of width 1, 2, 4, ... (no recursion). | Θ(n log n) | §5.1 |
| `hoare_partition()` | Partition A[lo..hi] around pivot p = A[lo] with two scans that meet in the middle. | Θ(n) | §5.2 |
| `quicksort()` | Return a sorted copy by recursive quicksort with Hoare partitioning. | Θ(n log n) | §5.2 |
| `quicksort_iterative()` | Quicksort without recursion: an explicit stack of (lo, hi) ranges. | O(log n) | Exercise 5.2 |
| `sorted_union()` | Union of two sorted sequences, sorted, with no duplicates, in one merge-like pass. | Θ(len(A) + len(B)) | Exercise 5.1 |
| `count_inversions()` | Number of pairs i < j with A[i] > A[j], counted during mergesort. | Θ(n log n) | Exercise 5.1.8 |
| `max_subarray_dc()` | Largest sum of a nonempty contiguous subarray; returns (sum, lo, hi) inclusive. | Θ(n) | §5.0 |
| `kadane()` | Largest nonempty subarray sum in one pass (Kadane's algorithm); returns (sum, lo, hi). | Θ(n) | — |
| `TreeNode` (class) | A binary tree node with a value and optional left/right children. | — | — |
| `tree_from_list()` | Build a binary tree from a level-order list where None marks a missing child. | Θ(n) | — |
| `preorder()` | Root, then left subtree, then right subtree. Levitin §5.3. Θ(n) time. | Θ(n) | §5.3 |
| `inorder()` | Left subtree, root, right subtree. Levitin §5.3. Θ(n) time. | Θ(n) | §5.3 |
| `postorder()` | Left subtree, right subtree, then root. Levitin §5.3. Θ(n) time. | Θ(n) | §5.3 |
| `tree_height()` | Height = length of the longest root-to-leaf path; the empty tree has height -1. | Θ(n) | §5.3 |
| `leaf_count()` | Number of leaves (nodes with no children). Levitin Exercise 5.3. Θ(n) time. | Θ(n) | Exercise 5.3 |
| `karatsuba()` | Multiply non-negative integers with three half-size products instead of four. | Θ(log n) | §5.4 |
| `strassen()` | Multiply square matrices with Strassen's seven products per level. | Θ(n^2) | §5.4 |
| `closest_pair_dc()` | Closest pair of points by divide-and-conquer; returns (distance, p, q). | Θ(n) | §5.5 |
| `quickhull()` | Convex hull vertices (counterclockwise, from the lowest point) by quickhull. | Θ(n log n) | §5.5 |
| `master_theorem()` | Growth class of T(n) = a T(n/b) + f(n) with f(n) in Θ(n^d), as a string. | O(1) | §5.0 |

### Chapter 6 · Transform-and-conquer — `algoforge.ch06_transform_conquer`

| Name | What it does | Headline cost | Levitin |
|---|---|---|---|
| `presort_unique()` | True when all elements are distinct: sort first, then compare neighbors. | Θ(n log n) | §6.1 |
| `presort_mode()` | Most frequent value and its count; ties go to the smallest value. | Θ(n log n) | §6.1 |
| `gaussian_elimination()` | Reduce the augmented matrix [A \| b] to upper-triangular form. | Θ(n^3) | §6.2 |
| `back_substitution()` | Solve an upper-triangular augmented system from the last row up. | Θ(n^2) | §6.2 |
| `solve_linear_system()` | Solve Ax = b by Gaussian elimination followed by back substitution. | Θ(n^3) | §6.2 |
| `AVLNode` (class) | Node of an AVL tree: key, children, height (a single node has height 0). | — | — |
| `avl_height()` | Height of an AVL subtree; the empty tree has height -1. | O(1) | — |
| `avl_insert()` | Insert key into an AVL tree and rebalance; return the new root. | Θ(log n) | §6.3 |
| `avl_inorder()` | Keys of the AVL tree in sorted order. Θ(n). | Θ(n) | — |
| `is_avl()` | Check the Binary Search Tree (BST) order, stored heights, and \|balance\| <= 1 everywhere. Θ(n). | Θ(n) | — |
| `TwoThreeNode` (class) | Node of a 2-3 tree: 1 key and 2 children (2-node) or 2 keys and 3 children (3-node). Methods: `is_leaf`. | — | — |
| `TwoThreeTree` (class) | A 2-3 tree: every leaf at the same depth, nodes hold 1 or 2 sorted keys. Methods: `search`, `insert`, `inorder`, `height`, `levels`, `is_valid`. | Θ(log n) | §6.3 |
| `heap_bottom_up()` | Build a max-heap by sifting down every parent, from the last one to the root. | Θ(n) | §6.4 |
| `heap_insert()` | Insert key into max-heap H in place by sifting it up. Levitin §6.4. Θ(log n). | Θ(log n) | §6.4 |
| `heap_top_down()` | Build a max-heap by inserting keys one at a time. | Θ(n log n) | §6.4 |
| `heap_delete_max()` | Remove and return the root of max-heap H (in place). | Θ(log n) | §6.4 |
| `is_max_heap()` | True when every parent is >= its children (parental dominance). Θ(n). | Θ(n) | — |
| `heapsort()` | Return a sorted copy: build a heap, then delete the maximum n - 1 times. | Θ(n log n) | §6.4 |
| `horner()` | Evaluate a polynomial as (...((a_n x + a_{n-1}) x + ...) x + a_0. | Θ(n) | §6.5 |
| `synthetic_division()` | Divide p(x) by (x - c); return (quotient coefficients, remainder = p(c)). | Θ(n) | §6.5 |
| `binary_exp_left_to_right()` | a^n scanning n's bits from the most significant: square, and multiply by a on a 1. | Θ(log n) | §6.5 |
| `binary_exp_right_to_left()` | a^n scanning bits from the least significant: keep a, a^2, a^4, ... on the side. | Θ(log n) | §6.5 |
| `lcm()` | Least common multiple via lcm(m, n) = m * n / gcd(m, n). | Θ(log min(m, n)) | §6.6 |
| `count_paths()` | Matrix whose (i, j) entry is the number of paths of length k from i to j. | Θ(n^3 log k) | §6.6 |
| `pairs_sum_multiple_of_60()` | Count pairs i < j with (nums[i] + nums[j]) divisible by 60, in one pass. | Θ(n) | — |
| `min_max()` | Smallest and largest elements using at most ceil(3n/2) - 2 comparisons. | Θ(n) | Exercise 5.1 |

### Chapter 7 · Space and time trade-offs — `algoforge.ch07_space_time`

| Name | What it does | Headline cost | Levitin |
|---|---|---|---|
| `comparison_counting_sort()` | Place each element by counting how many elements are smaller than it. | Θ(n^2) | §7.1 |
| `distribution_counting_sort()` | Sort integers in [low, high] using frequencies and running totals. | Θ(n + k) | §7.1 |
| `radix_sort_lsd()` | Least Significant Digit (LSD) radix sort for non-negative integers. | Θ(d(n + base)) | §7.1 |
| `bucket_sort()` | Spread numbers into equal-width buckets, insertion-sort each, concatenate. | Θ(n) | §7.1 |
| `horspool_shift_table()` | Shift table for Horspool: distance from each character's rightmost occurrence among the first m - 1 pattern characters to the pattern's end. | Θ(m) | §7.2 |
| `horspool_search()` | Index of the first occurrence of pattern in text, or -1 (Horspool's algorithm). | Θ(nm) | §7.2 |
| `good_suffix_table()` | Boyer-Moore good-suffix shifts d2(k) for matched suffix lengths k = 1..m-1. | Θ(m^3) | §7.2 |
| `boyer_moore_search()` | Index of the first occurrence of pattern in text, or -1 (Boyer-Moore). | O(nm) | §7.2 |
| `kmp_prefix_function()` | Longest Proper Prefix which is also Suffix (LPS) length for each prefix. | Θ(m) | §7.2 |
| `kmp_search_all()` | Every start index where pattern occurs in text, using the KMP table. | Θ(n + m) | — |
| `kmp_search()` | Index of the first occurrence (or -1) using Knuth-Morris-Pratt (KMP). Θ(n + m). | Θ(n + m) | — |
| `key_to_int()` | Deterministic non-negative integer code for an int or a string key. | Θ(len(key)) | — |
| `ProbeResult` (class) | Outcome of a hash-table search: found?, the stored value, key comparisons made. | — | — |
| `SeparateChainingHashTable` (class) | Hash table where each of the m cells holds a linked list (here a Python list). Methods: `load_factor`, `insert`, `search`. | Θ(n + m) | §7.3 |
| `LinearProbingHashTable` (class) | Closed hashing: on a collision try the next cell (wrapping around). Methods: `load_factor`, `insert`, `search`. | Θ(m) | §7.3 |
| `DoubleHashingHashTable` (class) | Closed hashing whose probe step comes from a second hash function. | — | §7.3 |
| `BTreeNode` (class) | A B-tree node: sorted keys and (for internal nodes) len(keys) + 1 children. | — | — |
| `BTree` (class) | A minimal B-tree of order m (each node has at most m children, m - 1 keys). Methods: `search`, `insert`, `inorder`, `height`, `is_valid`. | Θ(log n) | §7.4 |

### Chapter 8 · Dynamic programming — `algoforge.ch08_dynamic_programming`

| Name | What it does | Headline cost | Levitin |
|---|---|---|---|
| `fib_dp()` | F(n) by filling a table F[0..n] from the bottom up. | Θ(n) | §8.0 |
| `coin_row()` | Largest sum of coins with no two adjacent picked; returns (value, chosen indices). | Θ(n) | §8.1 |
| `change_making()` | Fewest coins adding up to amount; returns (count, coins) or (None, []) if impossible. | Θ(amount · m) | §8.1 |
| `robot_coin_collecting()` | Max coins a robot collects moving only right/down from top-left to bottom-right. | Θ(nm) | §8.1 |
| `grid_paths()` | Number of right/down paths from cell (0, 0) to (rows-1, cols-1) avoiding blocked cells. | Θ(rows · cols) | Exercise 8.1 |
| `binomial_coefficient()` | C(n, k) by filling Pascal's triangle row by row. | Θ(nk) | §8.1 |
| `knapsack_table()` | The full DP table F[i][j] = best value using the first i items with capacity j. | Θ(nW) | §8.2 |
| `knapsack_dp()` | 0/1 knapsack by bottom-up DP; returns (best value, chosen item indices). | Θ(nW) | §8.2 |
| `knapsack_memory_function()` | Top-down knapsack that fills only the table cells it actually needs. | Θ(nW) | §8.2 |
| `optimal_bst()` | Optimal Binary Search Tree (BST) for keys 1..n with search probabilities p_1..p_n. | Θ(n^3) | §8.3 |
| `optimal_bst_tree()` | Rebuild the optimal BST for keys i..j from the root table as nested tuples. | Θ(n) | §8.3 |
| `warshall()` | Transitive closure: R[i][j] = 1 when some directed path leads from i to j. | Θ(n^3) | §8.4 |
| `floyd()` | All-pairs shortest distances (use math.inf for "no edge", 0 on the diagonal). | Θ(n^3) | §8.4 |
| `floyd_with_paths()` | Floyd's algorithm that also records next[i][j] = first hop on a shortest i->j path. | Θ(n^3) | Exercise 8.4 |
| `floyd_path()` | Vertex list of a shortest path from i to j using the `next` table ([] if none). Θ(n). | Θ(n) | — |
| `lcs()` | Longest Common Subsequence (LCS): (length, one LCS as a list). | Θ(nm) | §8.1 |
| `edit_distance()` | Minimum insertions, deletions and substitutions turning a into b (Levenshtein). | Θ(nm) | — |
| `lis_nlogn()` | Longest strictly Increasing Subsequence (LIS) in O(n log n); returns (length, one LIS). | O(n log n) | — |

### Chapter 9 · Greedy technique — `algoforge.ch09_greedy`

| Name | What it does | Headline cost | Levitin |
|---|---|---|---|
| `edges_to_adjacency()` | Turn an edge list [(u, v, w), ...] into a weighted adjacency dict. Θ(\|E\|). | Θ(\|E\|) | — |
| `greedy_change()` | Make change using as many of the largest coin as possible, then the next... | Θ(m log m) | §9.0 |
| `activity_selection()` | Largest set of non-overlapping activities: repeatedly take the one that ends first. | Θ(n log n) | Exercise 9.1 |
| `fractional_knapsack()` | Best value when items may be split: take items by value/weight ratio, highest first. | Θ(n log n) | §12.3 |
| `prim()` | Minimum Spanning Tree (MST) grown from one vertex by always adding the cheapest fringe edge. | Θ(\|E\| log \|V\|) | §9.1 |
| `UnionFind` (class) | Disjoint subsets with union by size (quick union), as used by Kruskal. Methods: `make_set`, `find`, `union`. | O(log n) | §9.2 |
| `kruskal()` | Minimum Spanning Tree (MST) by scanning edges in weight order, skipping cycle-makers. | Θ(\|E\| log \|E\|) | §9.2 |
| `dijkstra()` | Single-source shortest paths for non-negative edge weights. | Θ((\|V\| + \|E\|) log \|V\|) | §9.3 |
| `reconstruct_path()` | Follow parent links back from target to the source; returns source..target. Θ(path). | Θ(path) | — |
| `huffman_codes()` | Optimal prefix-free binary code: repeatedly merge the two lightest trees. | Θ(n log n) | §9.4 |
| `average_code_length()` | Expected bits per symbol: sum f_i * len(code_i) / sum f_i. Levitin §9.4. Θ(n). | Θ(n) | §9.4 |
| `huffman_encode()` | Concatenate the codewords of each character. Θ(output length). | Θ(output length) | — |
| `huffman_decode()` | Decode a bit string with a prefix-free code (reads bit by bit). Θ(len(bits)). | Θ(len(bits)) | — |

### Chapter 10 · Iterative improvement — `algoforge.ch10_iterative_improvement`

| Name | What it does | Headline cost | Levitin |
|---|---|---|---|
| `SimplexResult` (class) | Outcome of `simplex`: status is "optimal" or "unbounded". | — | — |
| `simplex()` | Maximize c·x subject to A x <= b, x >= 0 (with b >= 0) by the tableau simplex method. | Θ(m(n + m)) | §10.1 |
| `MaxFlowResult` (class) | Maximum flow value, flow on each original edge, and a minimum cut. | — | — |
| `max_flow()` | Maximum flow by the shortest-augmenting-path method (Edmonds-Karp). | O(\|V\| \|E\|^2) | §10.2 |
| `bipartite_max_matching()` | Maximum matching by repeatedly finding augmenting paths with BFS. | O(\|V\| \|E\|) | §10.3 |
| `Proposal` (class) | One step of Gale-Shapley: who proposed to whom, and what happened. | — | — |
| `gale_shapley()` | Stable matching by the Gale-Shapley proposal algorithm (men propose). | Θ(n^2) | §10.4 |
| `is_stable()` | True when no man and woman both prefer each other to their partners. Θ(n^2). | Θ(n^2) | — |

### Chapter 11 · Limitations of algorithm power — `algoforge.ch11_limitations`

| Name | What it does | Headline cost | Levitin |
|---|---|---|---|
| `ceil_log2()` | Exact ceil(log2 x) for a positive integer x (no floating point). O(log x). | O(log x) | — |
| `sorting_lower_bound()` | Minimum worst-case comparisons for any comparison sort: ceil(log2 n!). | O(n log n) | §11.2 |
| `searching_lower_bound()` | Minimum worst-case three-way comparisons to search a sorted array: ceil(log2(n + 1)). | O(log n) | §11.2 |
| `decision_tree_min_height()` | Smallest height of a tree with the given branching factor and at least `leaves` leaves. | O(log leaves) | §11.2 |
| `verify_cnf()` | Check a truth assignment against a CNF formula - polynomial time (the "NP" part). | Θ(total literals) | §11.3 |
| `cnf_sat_brute()` | Try all 2^n truth assignments; return (first satisfying assignment or None, number tried). | Θ(2^n · size) | §11.3 |
| `verify_vertex_cover()` | True when every edge has an endpoint in cover (and \|cover\| <= k if k is given). | Θ(\|E\| + \|cover\|) | §11.3 |
| `vertex_cover_brute()` | A vertex cover of size <= k found by trying subsets, or None. Θ(C(n, k) · \|E\|). | Θ(C(n, k) · \|E\|) | — |
| `reduce_3sat_to_vertex_cover()` | Build a graph that has a vertex cover of size k = n + 2m iff the 3-CNF formula is satisfiable. | Θ(n + m) | §11.3 |
| `subset_sum_brute()` | Indices of a subset summing to target, by trying all subsets, or None. Θ(n 2^n). | Θ(n 2^n) | — |
| `partition_to_subset_sum()` | Partition instance -> subset-sum instance (same numbers, target = half the total). | Θ(n) | §11.3 |
| `subset_sum_to_partition()` | Subset-sum instance (non-negative nums, target) -> equivalent partition instance. | Θ(n) | — |
| `partition_brute()` | True when nums can be split into two equal-sum parts (exhaustive). Θ(n 2^n). | Θ(n 2^n) | — |

### Chapter 12 · Coping with the limitations of algorithm power — `algoforge.ch12_coping`

| Name | What it does | Headline cost | Levitin |
|---|---|---|---|
| `n_queens()` | All ways to place n non-attacking queens; returns (solutions, nodes explored). | Θ(n) | §12.1 |
| `subset_sum_backtracking()` | Every subset of positive nums summing to target; returns (index lists, nodes explored). | Θ(2^n) | §12.1 |
| `hamiltonian_circuit()` | First Hamiltonian circuit found by backtracking; returns (circuit or None, nodes). | Θ(\|V\|) | §12.1 |
| `assignment_branch_and_bound()` | Optimal assignment by best-first branch-and-bound; returns (cost, jobs, nodes generated). | O(n! · n^2) | §12.2 |
| `knapsack_branch_and_bound()` | 0/1 knapsack by best-first branch-and-bound; returns (value, items, nodes generated). | Θ(2^n) | §12.2 |
| `tsp_nearest_neighbor()` | Traveling Salesman Problem (TSP) tour that always goes to the nearest unvisited city. | Θ(n^2) | §12.3 |
| `tsp_twice_around_tree()` | TSP tour from a Minimum Spanning Tree (MST): walk around it, skipping repeat visits. | Θ(n^2) | §12.3 |
| `tsp_two_opt()` | Improve a closed tour with 2-opt moves until no 2-change shortens it. | Θ(n^2) | §12.3 |
| `knapsack_greedy_approx()` | Greedy 0/1 knapsack: add items by decreasing value/weight while they fit. | Θ(n log n) | §12.3 |
| `knapsack_approximation_scheme()` | Sahni's approximation scheme: try every subset of at most k items, then fill greedily. | O(k n^(k+1)) | §12.3 |
| `first_fit()` | Bin packing: put each item into the first bin with room, else open a new bin. | Θ(n^2) | Exercise 12.3 |
| `first_fit_decreasing()` | First-fit after sorting items from largest to smallest (First-Fit Decreasing, FFD). | Θ(n^2) | Exercise 12.3 |
| `bisection()` | Root of f in [a, b] (needs f(a), f(b) of opposite signs) by halving the interval. | — | §12.4 |
| `false_position()` | Root of f in [a, b] using the x-intercept of the secant line (regula falsi). | O(max_iter) | §12.4 |
| `newton()` | Root by Newton's method x_{n+1} = x_n - f(x_n) / f'(x_n). | O(max_iter) | §12.4 |

### Chapter 13 (beyond) · Advanced data structures — `algoforge.ch13_advanced_ds`

| Name | What it does | Headline cost | Levitin |
|---|---|---|---|
| `DynamicArray` (class) | A list that doubles its capacity when full, so append is amortized Methods: `append`, `pop`, `to_list`. | O(1) | §1.4 |
| `UnionFind` (class) | Disjoint-set forest with union by rank and path compression. Methods: `make_set`, `find`, `union`, `connected`. | O(m α(n)) | §9.2 |
| `FenwickTree` (class) | Binary Indexed Tree (Fenwick tree): prefix sums with point updates, both O(log n). Methods: `add`, `prefix_sum`, `range_sum`. | O(log n) | — |
| `SegmentTree` (class) | Segment tree for range sums with point assignment, both O(log n). Methods: `update`, `query`. | O(log n) | — |
| `Trie` (class) | Prefix tree: each edge is a character, so words sharing a prefix share a path. Methods: `insert`, `contains`, `starts_with`, `words_with_prefix`. | O(L) | — |
| `LRUCache` (class) | Least Recently Used (LRU) cache: a hash map plus a doubly linked list. Methods: `get`, `put`, `keys_most_recent_first`. | O(1) | — |

### Chapter 14 (beyond) · Advanced graph algorithms — `algoforge.ch14_advanced_graphs`

| Name | What it does | Headline cost | Levitin |
|---|---|---|---|
| `bellman_ford()` | Single-source shortest paths that allow negative weights; detects negative cycles. | Θ(\|V\| \|E\|) | — |
| `a_star_grid()` | Shortest 4-directional path on a grid with A* search and the Manhattan heuristic. | O(E log V) | — |
| `kosaraju_scc()` | Strongly Connected Components (SCC) of a digraph by Kosaraju's two-pass algorithm. | Θ(\|V\| + \|E\|) | — |
| `bridges_and_articulation_points()` | Bridges (edges whose removal disconnects) and articulation points of an undirected graph. | Θ(\|V\| + \|E\|) | — |
| `dag_longest_path()` | Longest (heaviest) path in a weighted Directed Acyclic Graph (DAG). | Θ(\|V\| + \|E\|) | — |

### Chapter 15 (beyond) · Dynamic programming and interview patterns — `algoforge.ch15_patterns`

| Name | What it does | Headline cost | Levitin |
|---|---|---|---|
| `two_sum_sorted()` | Indices i < j with A[i] + A[j] == target in a sorted array, or None (two pointers). | Θ(n) | — |
| `longest_substring_without_repeat()` | Length and first example of the longest substring with all-distinct characters. | Θ(n) | — |
| `sliding_window_max()` | Maximum of every window of k consecutive elements (monotonic deque). | Θ(n) | — |
| `next_greater_element()` | For each element, the first strictly larger element to its right (None if none). | Θ(n) | — |
| `PrefixSums` (class) | Answer range-sum queries in O(1) after an O(n) precomputation. Methods: `range_sum`. | O(1) | — |
| `ship_within_days()` | Smallest ship capacity that ships all packages, in order, within `days` days. | Θ(n log(sum)) | — |
| `merge_intervals()` | Merge overlapping (or touching) closed intervals. Θ(n log n) for the sort. | Θ(n log n) | — |
| `lis_quadratic()` | Length of the Longest strictly Increasing Subsequence (LIS) by the classic O(n^2) DP. | O(n^2) | — |
| `house_robber()` | Max sum of non-adjacent elements with two rolling variables. | O(1) | — |

### Chapter 16 (beyond) · Randomized, amortized and streaming algorithms — `algoforge.ch16_randomized`

| Name | What it does | Headline cost | Levitin |
|---|---|---|---|
| `randomized_quicksort()` | Quicksort with a uniformly random pivot; returns a sorted copy. | Θ(n log n) | — |
| `fisher_yates_shuffle()` | Uniformly random permutation: swap each position with a random earlier-or-same one. | Θ(n) | — |
| `reservoir_sample()` | k items chosen uniformly from a stream of unknown length, using O(k) memory. | O(k) | — |
| `BloomFilter` (class) | Set membership with no false negatives and a tunable false-positive rate. Methods: `for_capacity`, `add`, `might_contain`, `expected_false_positive_rate`. | O(k) | — |
| `CountMinSketch` (class) | Approximate item frequencies in a stream using a small depth x width table. Methods: `add`, `estimate`. | O(d) | — |
| `miller_rabin()` | Probabilistic primality test (Miller-Rabin). | O(rounds · log^3 n) | — |

### Chapter 17 (beyond) · Algorithms inside production systems — `algoforge.ch17_systems`

Caches, storage engines, load balancers, rate limiters and replicated databases. Pure functions where the real
thing would need a network, so every rule can be tested exhaustively.

| Name | What it does | Headline cost | Levitin |
|---|---|---|---|
| `LRUCache` (class) | LRU cache with hit/miss statistics, built on `OrderedDict` (the from-scratch version is in Chapter 13). Methods: `get`, `put`, `keys_most_recent_first`. | O(1) | — |
| `lru_hits()` | Number of hits when a page-request sequence is served by an LRU cache. | Θ(n) | — |
| `belady_hits()` | Hits of the optimal offline cache (evict the page used farthest in the future): the oracle for testing caches. | Θ(n log n) | — |
| `lsm_compact()` | Merge sorted LSM runs: the newest version of each key wins; tombstones hide older versions. | O(N log r) | §5.1 |
| `lsm_get()` | LSM read path: search runs newest to oldest; a tombstone means "deleted". | O(r log N) | §4.4 |
| `wal_recover()` | Crash recovery from a WAL: analysis, redo every update, undo losers backwards (simplified ARIES). | Θ(L) | — |
| `external_sort_plan()` | External merge sort cost model: (initial runs, passes, page I/Os) for N pages and B buffers. | O(passes) | — |
| `external_merge_sort()` | External merge sort simulated in memory: runs of `memory` items, (memory − 1)-way merges. | O(n log n) | — |
| `ConsistentHashRing` (class) | Consistent hashing: servers at hashed points (virtual nodes) on a ring; a key goes clockwise to the next point. Methods: `add_server`, `remove_server`, `lookup`, `servers`. | O(log(N · vnodes)) | — |
| `jump_consistent_hash()` | Lamping–Veach jump hash: a bucket for a 64-bit key with no memory; growing moves only 1/(n + 1) of the keys. | O(log n) | — |
| `rendezvous_hash()` | Highest Random Weight (HRW) hashing: the server with the largest hash(key, server) wins. | Θ(N) | — |
| `TokenBucket` (class) | Rate limiter with a lazy refill: capacity C, rate r tokens per second. Methods: `allow`. | O(1) | — |
| `token_bucket_decisions()` | Allow/deny for each request time, bucket full at time 0. | Θ(n) | — |
| `backoff_schedule()` | Retry sleeps: capped exponential backoff with no, full, equal or decorrelated jitter, within a deadline. | Θ(attempts) | — |
| `lamport_timestamps()` | Lamport clock of every event (local, send, receive). | Θ(events) | — |
| `vector_timestamps()` | Vector clock of every event; V(e) < V(f) exactly when e happens before f. | Θ(events · processes) | — |
| `vc_merge()` | Entry-wise maximum of two vector clocks. | Θ(processes) | — |
| `vc_compare()` | "equal", "before", "after" or "concurrent" for two vector clocks. | Θ(processes) | — |
| `raft_append_entries()` | Raft follower's log-matching check: reject on a gap or conflict, else truncate conflicts and append. | O(log + entries) | — |
| `raft_commit_index()` | Raft leader's commit rule: largest N on a majority whose entry is from the current term (the Figure 8 trap). | O(s log s) | — |
| `raft_log_up_to_date()` | Raft voting rule: is the candidate's log at least as up to date? | O(1) | — |
| `merkle_tree()` | Hash tree in an array (root at index 1), SHA-256 by default. | Θ(n) | — |
| `merkle_diff()` | Differing leaves of two replicas, descending only into subtrees whose hashes differ. | O(d log n) | — |
| `gcounter_merge()` | Merge two Grow-only Counter (G-Counter) states: entry-wise maximum (commutative, associative, idempotent). | Θ(replicas) | — |
| `GCounter` (class) | G-Counter CRDT: one slot per replica, value = sum. Methods: `increment`, `merge`, `value`. | O(1) | — |
| `PNCounter` (class) | Positive-Negative Counter (PN-Counter) CRDT: two G-Counters, value = P − N. Methods: `increment`, `decrement`, `merge`, `value`. | O(1) | — |

### Chapter 18 (beyond) · The frontier — `algoforge.ch18_frontier`

Working versions of the algorithms in [Lesson 18](../../lessons/18-the-frontier/README.md). Each docstring cites the
paper and year, and states the model behind the bound. `find_pivots` is only the pivot-finding sub-step of the
2025 shortest-path algorithm, not the whole algorithm.

| Name | What it does | Headline cost | Levitin |
|---|---|---|---|
| `natural_runs()` | Split a sequence into maximal sorted runs (strictly descending runs are reversed). | Θ(n) | — |
| `galloping_merge()` | Stable merge that switches to exponential search when one run keeps winning (Timsort). | O(n) | §5.1 |
| `min_run_length()` | Timsort's minimum run length (32..64 for n ≥ 64). | O(log n) | — |
| `timsort()` | Timsort's structure: natural runs, minrun, run stack with the corrected merge rule, galloping. Stable. | O(n log n) | §5.1 |
| `node_power()` | Powersort's power of the boundary between two neighbouring runs. | O(log n) | — |
| `powersort()` | Natural runs merged by the node-power policy (CPython 3.11+). Stable. | O(n + nH) | §5.1 |
| `pdqsort()` | Pattern-defeating quicksort: insertion sort, ninther, equal-key partition, heapsort fallback. | O(n log n) | §5.2 |
| `SkipList` (class) | Sorted set with random express lanes (Pugh). Methods: `contains`, `insert`, `delete`, `level_sizes`. | O(log n) expected | — |
| `ZipNode` (class) | A zip-tree node: key, rank, children. | — | — |
| `ZipTree` (class) | Binary search tree heap-ordered by random geometric ranks (a skip list as a tree). Methods: `random_rank`, `insert`, `delete`, `contains`, `preorder`, `inorder`, `depth`, `is_valid`. | O(log n) expected | §4.5 |
| `shrinking_cone_segments()` | Greedy ShrinkingCone segmentation: every key within ε of its segment's line. | Θ(n) | — |
| `LearnedIndex` (class) | Learned index: predict a position, then binary-search only 2ε + 1 slots. Methods: `predict`, `window`, `lookup`. | O(log s + log ε) | §4.5 |
| `CuckooHashTable` (class) | Two homes per key; at most two probes per lookup; rebuilds on long eviction chains. Methods: `get`, `put`, `delete`, `keys`. | O(1) | §7.3 |
| `CuckooFilter` (class) | Fingerprints in a cuckoo table: no false negatives, supports deletion. Methods: `insert`, `contains`, `delete`, `load_factor`, `expected_false_positive_rate`. | O(1) | — |
| `XorFilter` (class) | Static filter built by peeling; three cells XOR to the fingerprint, about 1.23 f bits per key. Methods: `contains`, `bits_per_key`. | Θ(n) build, O(1) query | — |
| `HyperLogLog` (class) | Distinct counting in m tiny registers, standard error about 1.04/√m. Methods: `add`, `estimate`, `merge`, `standard_error`. | O(1) per add | — |
| `cvm_threshold()` | Buffer size of the CVM algorithm (Chakraborty, Vinodchandran and Meel, 2022) for a (1 ± ε) answer with probability 1 − δ. | O(1) | — |
| `cvm_estimate()` | CVM distinct elements: sampling only, no hashing; halve p when the buffer fills. | O(n) expected | — |
| `CountMinSketch` (class) | Count-Min with optional conservative update; never undercounts. Methods: `for_error`, `add`, `estimate`. | O(depth) | — |
| `misra_gries()` | Heavy hitters with k − 1 counters; each count is within N/k below the truth. | O(n) amortized | — |
| `jaccard()` | Jaccard similarity of two sets. | Θ(\|A\| + \|B\|) | — |
| `minhash_signature()` | MinHash signature: the minimum of each random hash over the set. | Θ(\|items\| · hashes) | — |
| `minhash_similarity()` | Fraction of equal signature entries: an unbiased Jaccard estimate. | Θ(hashes) | — |
| `lsh_candidate_pairs()` | LSH banding: pairs equal on every row of some band. | Θ(items · bands) | — |
| `lsh_candidate_probability()` | The S-curve 1 − (1 − s^r)^b. | O(1) | — |
| `squared_distance()` | Squared Euclidean distance. | Θ(d) | — |
| `brute_force_knn()` | Exact k nearest neighbours by scanning: the oracle for vector search. | Θ(n d + n log n) | §3.3 |
| `HNSW` (class) | Small Hierarchical Navigable Small World (HNSW) index: greedy descent, then a beam search of width ef. Methods: `add`, `search`. | about O(log n) per query (empirical) | — |
| `recall_at_k()` | Fraction of the true k nearest neighbours returned. | Θ(k) | — |
| `blelloch_scan()` | Work-efficient exclusive scan by up-sweep and down-sweep (any associative operation). | Θ(n) work, Θ(log n) span | — |
| `ntt()` | NTT: the Fast Fourier Transform over integers mod 998244353. | Θ(n log n) | — |
| `ntt_multiply()` | Exact polynomial multiplication through the NTT. | Θ(n log n) | — |
| `suffix_array()` | Suffix array by prefix doubling. | O(n log² n) | — |
| `lcp_array()` | Kasai's LCP array from a suffix array. | Θ(n) | — |
| `bwt()` | Burrows–Wheeler Transform via the suffix array. | O(n log² n) | — |
| `inverse_bwt()` | Undo the BWT with the Last-to-First (LF) mapping. | Θ(n log n) | — |
| `FMIndex` (class) | FM-index backward search: count and locate patterns. Methods: `count`, `locate`. | O(m) per count | — |
| `dinic_max_flow()` | Dinic: BFS level graph plus blocking flows; returns the same `MaxFlowResult` as Chapter 10. | O(\|V\|² \|E\|) | §10.2 |
| `push_relabel_max_flow()` | FIFO push–relabel (Goldberg–Tarjan): push excess downhill, relabel when stuck. | O(\|V\|³) | §10.2 |
| `boruvka_mst()` | MST by Borůvka rounds: every component adds its cheapest outgoing edge. | O(\|E\| log \|V\|) | §9.2 |
| `delta_stepping()` | SSSP with distance buckets of width Δ: light edges inside a bucket, heavy edges after. | O(\|V\| + \|E\| + dL) average (random weights) | §9.3 |
| `find_pivots()` | The FindPivots sub-step of Duan et al. (2025): k bounded relaxation rounds, then the roots of large tight-edge trees. | O(k \|W\| + edges out of W) | §9.3 |

## Tests

`tests/` holds one file per chapter (chapters 1–2, 13–14, 15–16 and 17–18 share files). The style is:

1. **Textbook-style examples** you can check against a hand trace.
2. **Randomized tests against a brute-force oracle**, with fixed seeds so failures are reproducible.
3. **Operation-count tests** that pin down the formulas from the analysis (for example, selection sort makes
   exactly $n(n-1)/2$ comparisons; bottom-up heap construction makes $2(n - \log_2(n+1))$ comparisons in the
   worst case for a full tree).
4. **Statistical tests** for the probabilistic structures of chapters 16–18: no false negatives, and measured
   false-positive rates and estimation errors close to the theory, over fixed seeds (filters, HyperLogLog, CVM,
   Count-Min, MinHash, Locality-Sensitive Hashing, HNSW recall).

Run one chapter with `python3 -m pytest -q tests/test_ch08_dynamic_programming.py`, or a single test with `-k`.

## A note on sources

All code here is original. Algorithms are re-expressed from their standard descriptions and cited to the book
section where Levitin presents them; no book text is reproduced. "Beyond" chapters cite CLRS, Sedgewick & Wayne,
or the original papers in each docstring.
