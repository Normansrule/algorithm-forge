# 🧠 Extra Practice Questions — Chapters 1–12

Forty more multiple-choice questions written for Algorithm Forge, in the same format as the
[quiz bank](README.md). They also appear in the interactive quiz at
<https://normansrule.github.io/algorithm-forge/quiz.html>, together with the course quizzes. Every numeric answer
was worked out by hand and checked with a short script.

---

## Chapter 1 — Introduction

**X1.** A "procedure" gives the right answer whenever it stops, but on some inputs it runs forever. Which requirement of an algorithm does it break?

- a) Finiteness: it must stop after a finite number of steps on every legitimate input
- b) Generality: it must work for a whole class of inputs
- c) Definiteness: each step must be unambiguous
- d) Efficiency: it must run in polynomial time

<details><summary>Answer and explanation</summary>

**Answer: a) Finiteness.**

**Why:** an algorithm must produce the output for any legitimate input in a finite amount of time. Being right
"when it stops" is not enough.

**Why not the others:** b) and c) are about which inputs are covered and how clearly steps are written. d) Efficiency
is desirable, but an exponential-time algorithm is still an algorithm.
</details>

**X2.** You run the sieve of Eratosthenes up to n = 30. After crossing out the multiples of 2, 3 and 5, why can you stop?

- a) Every composite number ≤ 30 has a prime factor ≤ √30 ≈ 5.5, so all of them are already crossed out
- b) Because 30 = 2 · 3 · 5
- c) The sieve always stops after three primes
- d) Because 7 does not divide 30

<details><summary>Answer and explanation</summary>

**Answer: a).**

**Why:** a composite number $m = p \cdot q$ with $p \le q$ has $p \le \sqrt m$. So for $m \le 30$ the smaller factor is
at most 5, and crossing out multiples of 2, 3 and 5 removes every composite. This is also why the sieve starts
crossing out the multiples of p at $p^2$.

**Why not the others:** b) and d) are coincidences of this particular n. c) The number of primes needed grows with n.
</details>

**X3.** Which structure gives constant-time access to the i-th element, but needs Θ(n) time to insert a new element at the front?

- a) An array
- b) A singly linked list
- c) A queue implemented as a linked list
- d) A stack implemented as a linked list

<details><summary>Answer and explanation</summary>

**Answer: a) An array.**

**Why:** the i-th cell's address is computed directly, but inserting at index 0 shifts all n elements one place.

**Why not the others:** a linked list inserts at the front in Θ(1) but needs Θ(i) steps to reach the i-th node. Queues and
stacks do not offer indexed access at all.
</details>

## Chapter 2 — Analysis framework

**X4.** What is the value of `count` after this code runs? `count ← 0; for i ← 1 to n do for j ← 1 to i do count ← count + 1`

- a) n²
- b) n(n + 1)/2
- c) n(n − 1)/2
- d) 2n

<details><summary>Answer and explanation</summary>

**Answer: b).**

**Why:** the inner loop runs i times, so the total is $\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$. For n = 3: 1 + 2 + 3 = 6 ✔.

**Why not the others:** c) would be the inner loop running $i - 1$ times (j from 1 to i − 1). a) would need the inner loop to
run n times every time. d) has no basis.
</details>

**X5.** How many times does the loop body run? `i ← 64; c ← 0; while i > 1 do i ← i div 2; c ← c + 1`

- a) 5
- b) 6
- c) 7
- d) 32

<details><summary>Answer and explanation</summary>

**Answer: b) 6.**

**Why:** i takes the values 64, 32, 16, 8, 4, 2, and stops at 1: six halvings, which is $\log_2 64$.

**Why not the others:** c) is the number of **values** i takes, counting the final 1 (that is the bit-count formula
$\lfloor\log_2 n\rfloor + 1$). a) is one short. d) would be subtracting instead of halving.
</details>

**X6.** Which of these functions is **not** in Θ(n log n)?

- a) log₂(n!)
- b) n · log₂(n²)
- c) n · log₂ n + 100n
- d) n^1.01

<details><summary>Answer and explanation</summary>

**Answer: d).**

**Why:** $\frac{n^{1.01}}{n\log n} = \frac{n^{0.01}}{\log n} \to \infty$, because every positive power of n eventually beats the
logarithm. So $n^{1.01}$ grows strictly faster than $n\log n$, even though it looks "almost linear".

**Why the others are Θ(n log n):** a) by Stirling's formula. b) $\log(n^2) = 2\log n$, a constant factor. c) the $100n$
term is of lower order.
</details>

**X7.** A Θ(n²) algorithm takes 1 second on an input of size 1,000. About how long should it take on size 4,000?

- a) 4 seconds
- b) 8 seconds
- c) 16 seconds
- d) 64 seconds

<details><summary>Answer and explanation</summary>

**Answer: c) 16 seconds.**

**Why:** multiplying n by 4 multiplies $n^2$ by $4^2 = 16$. This "what happens when n grows by a factor k" reasoning is
exactly what an order of growth is for.

**Why not the others:** a) is linear scaling. b) has no basis. d) is cubic scaling ($4^3$).
</details>

**X8.** Solve $C(n) = C(n-1) + 2$ for $n > 0$, $C(0) = 0$.

- a) 2n
- b) n²
- c) 2ⁿ
- d) n + 2

<details><summary>Answer and explanation</summary>

**Answer: a) 2n.**

**Why:** backward substitution gives $C(n) = C(n-i) + 2i$, and $i = n$ gives $C(n) = 2n$. Check: C(1) = 2, C(2) = 4 ✔.

**Why not the others:** c) would be $C(n) = 2C(n-1)$ (doubling, not adding 2). b) would need the added amount to grow
with n. d) fails the check C(0) = 0.
</details>

## Chapter 3 — Brute force and exhaustive search

**X9.** Bubble sort with the "stop when a pass makes no swaps" improvement runs on an array that is already sorted. How many key comparisons does it make?

- a) n − 1
- b) n(n − 1)/2
- c) 0
- d) n log₂ n

<details><summary>Answer and explanation</summary>

**Answer: a) n − 1.**

**Why:** the first pass compares every adjacent pair once, finds nothing to swap, and the algorithm stops.

**Why not the others:** b) is the count **without** the improvement (or in the worst case). c) The algorithm must look at
every pair once to know the array is sorted. d) has no basis.
</details>

**X10.** Brute-force string matching searches for the pattern `AAB` in a text of ten `A`s. How many character comparisons does it make in total?

- a) 8
- b) 24
- c) 30
- d) 10

<details><summary>Answer and explanation</summary>

**Answer: b) 24.**

**Why:** there are $n - m + 1 = 10 - 3 + 1 = 8$ alignments. At each one the first two characters match and the third
(B against A) fails: 3 comparisons each, so $8 \times 3 = 24$. This is the kind of input that makes brute force hit its
worst case $\Theta(nm)$.

**Why not the others:** a) counts alignments only. c) is $n \cdot m$, which overcounts the alignments. d) is the text length.
</details>

**X11.** How many subsets does exhaustive search examine for a knapsack instance with 20 items?

- a) 20
- b) 400
- c) 1,048,576
- d) 20! ≈ 2.4 × 10¹⁸

<details><summary>Answer and explanation</summary>

**Answer: c) $2^{20} = 1{,}048{,}576$.**

**Why:** each item is either in or out, so there are $2^n$ subsets. At 20 items that is still quick for a computer; at 60
items it would take centuries.

**Why not the others:** d) counts **orderings** (the assignment problem or the Traveling Salesman Problem), not subsets.
a) and b) are far too small.
</details>

**X12.** In a depth-first search of an **undirected** graph, a back edge connects a vertex to…

- a) an ancestor in the depth-first search tree (other than its parent)
- b) a vertex in a different tree of the forest
- c) its child
- d) a vertex on the same level of a breadth-first search tree

<details><summary>Answer and explanation</summary>

**Answer: a).**

**Why:** when depth-first search meets an already-visited vertex that is not the parent, that vertex is still "open"
above it on the current path, so the edge points back up to an ancestor. Back edges are exactly what cycles are made of.

**Why not the others:** b) Different trees are never connected by an edge in an undirected graph (they are different
components). c) An edge to a child is a tree edge. d) describes a cross edge of breadth-first search.
</details>

## Chapter 4 — Decrease-and-conquer

**X13.** Binary search looks for K = 70 in `3, 14, 27, 31, 39, 42, 55, 70, 74, 81, 85, 93, 98` (indices 0–12, middle m = ⌊(l + r)/2⌋). Which elements are compared with K, in order?

- a) 55, 81, 70
- b) 42, 74, 70
- c) 55, 74, 70
- d) 39, 81, 70

<details><summary>Answer and explanation</summary>

**Answer: a) 55, 81, 70.**

**Why:** l = 0, r = 12 gives m = 6 (55 < 70, so l = 7). Then l = 7, r = 12 gives m = 9 (81 > 70, so r = 8). Then l = 7, r = 8
gives m = 7, and A[7] = 70 is found after 3 comparisons.

**Why not the others:** they use a wrong middle index (rounding up, or 1-based positions).
</details>

**X14.** A directed graph has a topological ordering if and only if it…

- a) has no directed cycle
- b) is connected
- c) is a tree
- d) has exactly one source and one sink

<details><summary>Answer and explanation</summary>

**Answer: a).**

**Why:** a directed cycle would need each of its vertices to come before the next one, all the way around, which is
impossible. Conversely, a graph without directed cycles always has a source; remove it and repeat. That argument is the
source-removal algorithm itself.

**Why not the others:** b) and c) are neither necessary nor sufficient (a disconnected graph without cycles is fine).
d) A graph without cycles can have many sources and sinks.
</details>

**X15.** In lexicographic order, which permutation comes right after `1 3 4 2`?

- a) 1 4 2 3
- b) 1 4 3 2
- c) 1 3 2 4
- d) 2 1 3 4

<details><summary>Answer and explanation</summary>

**Answer: a) 1 4 2 3.**

**Why:** find the rightmost position i with $a_i < a_{i+1}$: that is the 3 (because 3 < 4, while 4 > 2). Swap it with the
smallest larger element to its right (the 4), giving `1 4 3 2`, then reverse the tail after that position: `1 4 2 3`.

**Why not the others:** b) forgets to reverse the tail. c) comes **before** `1 3 4 2`. d) skips many permutations.
</details>

**X16.** Computing $a^n$ by repeated squaring (using the bits of n) takes how many multiplications?

- a) Θ(log n)
- b) Θ(√n)
- c) Θ(n)
- d) Θ(n log n)

<details><summary>Answer and explanation</summary>

**Answer: a) Θ(log n).**

**Why:** there is one squaring per bit of n and at most one extra multiplication per 1-bit, so at most
$2\lfloor\log_2 n\rfloor$ multiplications.

**Why not the others:** c) is the brute-force method (multiply by a, n − 1 times). b) and d) have no basis.
</details>

## Chapter 5 — Divide-and-conquer

**X17.** Quicksort always picks the first element as its pivot. On which input does it hit its Θ(n²) worst case?

- a) An array that is already sorted
- b) An array in random order
- c) An array whose first element is its median
- d) An array of distinct values in random order

<details><summary>Answer and explanation</summary>

**Answer: a).**

**Why:** the pivot is then the minimum, so every partition splits off nothing on the left and n − 1 elements on the right:
$(n-1) + (n-2) + \dots + 1 = n(n-1)/2$ comparisons, plus one more at each level with the classic scheme.

**Why not the others:** b) and d) give Θ(n log n) on average. c) A median pivot gives the ideal balanced split.
</details>

**X18.** What does an inorder traversal of a binary search tree output?

- a) The keys in increasing order
- b) The keys level by level
- c) The root first, then the leaves
- d) The keys in insertion order

<details><summary>Answer and explanation</summary>

**Answer: a).**

**Why:** inorder visits the left subtree (smaller keys), then the root, then the right subtree (larger keys), and the same
holds recursively in every subtree.

**Why not the others:** b) is breadth-first (level-order) traversal. c) describes nothing standard. d) The tree's shape
depends on the insertion order, but the traversal does not return it.
</details>

**X19.** Mergesort's merge step combines the sorted lists `2 5 8` and `3 4 9`. How many key comparisons does it make?

- a) 3
- b) 5
- c) 6
- d) 9

<details><summary>Answer and explanation</summary>

**Answer: b) 5.**

**Why:** 2–3 (take 2), 5–3 (take 3), 5–4 (take 4), 5–9 (take 5), 8–9 (take 8). The left list is now empty, so 9 is copied
without comparing. The worst case for merging two lists with 6 elements in total is 6 − 1 = 5, reached here.

**Why not the others:** c) counts one comparison per element. a) and d) have no basis.
</details>

**X20.** By the Master Theorem, $T(n) = 8T(n/2) + n^2$ is in…

- a) Θ(n²)
- b) Θ(n² log n)
- c) Θ(n³)
- d) Θ(n⁸)

<details><summary>Answer and explanation</summary>

**Answer: c) Θ(n³).**

**Why:** a = 8, b = 2, d = 2, and $a = 8 > b^d = 4$, so the leaves dominate: $\Theta(n^{\log_2 8}) = \Theta(n^3)$. This is the
recurrence of divide-and-conquer matrix multiplication with 8 half-size products, which is exactly why Strassen's 7
products matter.

**Why not the others:** a) needs $a < b^d$. b) needs $a = b^d$. d) confuses a with the exponent.
</details>

## Chapter 6 — Transform-and-conquer

**X21.** Build a max-heap bottom-up from the array `2 9 7 6 5 8`. What is the resulting array?

- a) 9 6 8 2 5 7
- b) 9 8 7 6 5 2
- c) 9 6 7 2 5 8
- d) 2 5 6 7 8 9

<details><summary>Answer and explanation</summary>

**Answer: a) 9 6 8 2 5 7.**

**Why:** with 1-based positions, start at the last parent, position 3 (7): its child 8 is larger, so swap → `2 9 8 6 5 7`.
Position 2 (9) is larger than both children. Position 1 (2): swap with the larger child 9 → `9 2 8 6 5 7`, then keep
sifting the 2 down: swap with its larger child 6 → `9 6 8 2 5 7`.

**Why not the others:** b) is the array sorted in decreasing order, which is a heap but not what this algorithm builds.
c) forgets the first sift. d) is sorted increasing, which is not a max-heap.
</details>

**X22.** Use Horner's rule to evaluate $p(x) = 2x^3 - x^2 + 3x + 5$ at x = 2.

- a) 19
- b) 23
- c) 27
- d) 31

<details><summary>Answer and explanation</summary>

**Answer: b) 23.**

**Why:** start with 2; then 2·2 − 1 = 3; then 3·2 + 3 = 9; then 9·2 + 5 = 23. Check directly: 16 − 4 + 6 + 5 = 23 ✔.
Three multiplications for a degree-3 polynomial.

**Why not the others:** they come from sign slips or from skipping a coefficient.
</details>

**X23.** Computing lcm(m, n) as m · n / gcd(m, n) is an example of which transform-and-conquer idea?

- a) Problem reduction
- b) Instance simplification
- c) Representation change
- d) Presorting

<details><summary>Answer and explanation</summary>

**Answer: a) Problem reduction.**

**Why:** instead of solving the least common multiple problem directly, we reduce it to a problem we already solve well
(Euclid's algorithm for the greatest common divisor).

**Why not the others:** b) and d) transform the same problem's input (for example by sorting it). c) changes the data
structure (for example a heap or a balanced tree).
</details>

## Chapter 7 — Space and time trade-offs

**X24.** Horspool's algorithm builds a shift table for the pattern `TENSE` (m = 5). What is the shift for the character **E**?

- a) 1
- b) 3
- c) 4
- d) 5

<details><summary>Answer and explanation</summary>

**Answer: b) 3.**

**Why:** look only at the first m − 1 = 4 characters, `TENS`. The rightmost E among them is at index 1, so the shift is
$m - 1 - 1 = 3$. (The E at the last position is ignored.) The full table: T 4, E 3, N 2, S 1, every other character 5.

**Why not the others:** a) uses the E in the last position. d) is the shift for characters that are not in the pattern.
c) is T's shift.
</details>

**X25.** A hash table has 7 cells, h(k) = k mod 7, and uses linear probing. You insert 10, 3 and 17, in that order. In which cell does 17 end up?

- a) 3
- b) 4
- c) 5
- d) 6

<details><summary>Answer and explanation</summary>

**Answer: c) 5.**

**Why:** 10 mod 7 = 3, so 10 goes to cell 3. 3 mod 7 = 3 is taken, so 3 goes to cell 4. 17 mod 7 = 3 is taken, cell 4 is
taken, so 17 goes to cell 5. This growing run of occupied cells is called **clustering**.

**Why not the others:** a) and b) are occupied. d) probes one cell too far.
</details>

**X26.** Why do databases index data on disk with B-trees rather than binary search trees?

- a) Each node holds many keys, so the tree is very short and a search needs only a few slow disk reads
- b) B-trees use less memory than binary search trees
- c) B-trees keep their keys unsorted, which makes insertion faster
- d) Binary search trees cannot store numbers larger than 2³²

<details><summary>Answer and explanation</summary>

**Answer: a).**

**Why:** a disk read fetches a whole block. Filling a node with hundreds of keys makes the height about $\log_{m/2} n$
instead of $\log_2 n$, so a billion records need only a handful of reads.

**Why not the others:** b) Memory is not the point. c) Keys inside each node are sorted. d) is false.
</details>

## Chapter 8 — Dynamic programming

**X27.** Coins have values 1, 7 and 10. What is the minimum number of coins that make 14?

- a) 2
- b) 3
- c) 4
- d) 5

<details><summary>Answer and explanation</summary>

**Answer: a) 2** (7 + 7).

**Why:** dynamic programming computes F(a) = 1 + min over coins d ≤ a of F(a − d) for every amount up to 14, and finds
F(14) = F(7) + 1 = 2.

**Why not the others:** d) is what greedy gets (10 + 1 + 1 + 1 + 1): the largest coin first is not optimal for this
coin system. b) and c) are not optimal either.
</details>

**X28.** What is the length of a longest common subsequence of `ABCBDAB` and `BDCABA`?

- a) 3
- b) 4
- c) 5
- d) 6

<details><summary>Answer and explanation</summary>

**Answer: b) 4** (for example `BCBA` or `BDAB`).

**Why:** the dynamic-programming table L[i, j] = L[i − 1, j − 1] + 1 when the characters match, else
max(L[i − 1, j], L[i, j − 1]), ends with 4 in its corner.

**Why not the others:** a) is a common subsequence but not a longest one. c) and d) are longer than any common one.
</details>

**X29.** The bottom-up dynamic-programming table for a 0/1 knapsack instance with n = 4 items and capacity W = 5 has how many cells?

- a) 20
- b) 24
- c) 30
- d) 36

<details><summary>Answer and explanation</summary>

**Answer: c) 30.**

**Why:** rows for 0..n items and columns for capacities 0..W: $(n+1)(W+1) = 5 \times 6 = 30$. Row 0 and column 0 hold the
base cases (value 0).

**Why not the others:** a) forgets both zero rows/columns. b) and d) forget only one of them or add an extra one.
</details>

**X30.** In Floyd's algorithm, what does the entry $D^{(k)}[i, j]$ mean?

- a) The length of the shortest path from i to j whose intermediate vertices are all numbered ≤ k
- b) The length of the shortest path from i to j with at most k edges
- c) The weight of the edge from i to j after k updates
- d) The number of paths from i to j through vertex k

<details><summary>Answer and explanation</summary>

**Answer: a).**

**Why:** that meaning gives the recurrence $D^{(k)}[i, j] = \min(D^{(k-1)}[i, j],\ D^{(k-1)}[i, k] + D^{(k-1)}[k, j])$:
either the best path avoids vertex k, or it goes through k exactly once.

**Why not the others:** b) is the meaning used by the Bellman–Ford algorithm. c) and d) are not what the table stores.
</details>

## Chapter 9 — Greedy technique

**X31.** In which order does Kruskal's algorithm consider the edges?

- a) By nondecreasing weight, skipping any edge that would close a cycle
- b) In the order a breadth-first search discovers them
- c) By decreasing weight, deleting edges while the graph stays connected
- d) Only the edges leaving the tree built so far, cheapest first

<details><summary>Answer and explanation</summary>

**Answer: a).**

**Why:** Kruskal grows a forest. Sorting the edges takes $O(E\log E)$, and a union–find structure answers "would this
edge close a cycle?" almost instantly.

**Why not the others:** d) is Prim's algorithm. c) is the "reverse-delete" algorithm, which also works but is not
Kruskal's. b) has nothing to do with weights.
</details>

**X32.** Huffman coding for four symbols with probabilities A 0.5, B 0.25, C 0.125, D 0.125. What is the expected number of bits per symbol?

- a) 1.5
- b) 1.75
- c) 2
- d) 2.25

<details><summary>Answer and explanation</summary>

**Answer: b) 1.75.**

**Why:** merge C and D (0.25), then that with B (0.5), then with A. The code lengths are A 1, B 2, C 3, D 3, so
$0.5\cdot1 + 0.25\cdot2 + 0.125\cdot3 + 0.125\cdot3 = 1.75$. Because every probability is a power of ½, this equals the
entropy exactly.

**Why not the others:** c) is the fixed-length code. a) is below the entropy, which is impossible. d) comes from a wrong
merge order.
</details>

**X33.** Which change makes Dijkstra's algorithm run in O(E log V) time on a sparse graph?

- a) Keeping the unfinished vertices in a binary min-heap keyed by their tentative distance
- b) Storing the graph as an adjacency matrix
- c) Sorting all the edges first
- d) Running a depth-first search first

<details><summary>Answer and explanation</summary>

**Answer: a).**

**Why:** each of the V delete-min operations and each of the up to E distance updates then costs O(log V).

**Why not the others:** b) An adjacency matrix forces Θ(V²) just to scan neighbors. c) Sorting edges is Kruskal's idea.
d) does not help with distances.
</details>

## Chapter 10 — Iterative improvement

**X34.** In the residual network of a flow network, an augmenting path may use a backward edge. What does sending flow along a backward edge do?

- a) It cancels (reduces) flow that was sent earlier along the corresponding forward edge
- b) It sends flow against the edge's direction in the original network, which is not allowed
- c) It doubles the capacity of the edge
- d) It removes the edge from the network

<details><summary>Answer and explanation</summary>

**Answer: a).**

**Why:** backward edges let the algorithm undo an earlier bad choice: pushing x units backward along (u, v) means
reducing the flow on the real edge u → v by x. Without them, augmenting-path methods could get stuck below the maximum.

**Why not the others:** b) No flow actually moves against an edge; the flow on it just decreases. c) and d) are not what
happens.
</details>

**X35.** A matching M in a bipartite graph is maximum exactly when…

- a) there is no augmenting path with respect to M
- b) every vertex is matched
- c) M contains the cheapest edges
- d) M has at least half as many edges as there are vertices

<details><summary>Answer and explanation</summary>

**Answer: a)** (Berge's theorem).

**Why:** an augmenting path starts and ends at free vertices and alternates between edges outside and inside M. Flipping
it grows the matching by one, so a matching that has one is not maximum. The theorem says the converse holds too, which
is why the augmenting-path algorithm can stop with confidence.

**Why not the others:** b) describes a perfect matching, which may not exist. c) Edge weights are not part of this
problem. d) has no basis.
</details>

## Chapter 11 — Limitations of algorithm power

**X36.** What is the lower bound on the number of comparisons needed to find the largest of n numbers?

- a) ⌈log₂ n⌉
- b) n/2
- c) n − 1
- d) n log₂ n

<details><summary>Answer and explanation</summary>

**Answer: c) n − 1.**

**Why:** every number except the maximum must lose at least one comparison, or the algorithm could not rule it out, and
one comparison produces only one loser. The simple scan uses exactly n − 1 comparisons, so it is optimal.

**Why not the others:** a) is the bound for **searching a sorted** array. b) is too few. d) is the sorting lower bound.
</details>

**X37.** A decision problem is NP-complete when it belongs to NP and…

- a) every problem in NP can be reduced to it in polynomial time
- b) no polynomial-time algorithm for it can exist
- c) it can be solved in exponential time
- d) it can be verified in constant time

<details><summary>Answer and explanation</summary>

**Answer: a).**

**Why:** that makes it at least as hard as everything in NP. A polynomial-time algorithm for one NP-complete problem would
give one for all of NP.

**Why not the others:** b) has **not** been proven; that is the P versus NP question. c) is true of many easy problems too.
d) Verification takes polynomial time, not constant time.
</details>

## Chapter 12 — Coping with the limitations

**X38.** Can a solution of the 4-queens problem have a queen in a corner square?

- a) No: both solutions avoid all four corners
- b) Yes: every solution uses at least one corner
- c) Yes, but only in the top-left corner
- d) It depends on the order in which backtracking tries the columns

<details><summary>Answer and explanation</summary>

**Answer: a).**

**Why:** the only solutions place the queens in columns (2, 4, 1, 3) and (3, 1, 4, 2), row by row. Backtracking discovers
this quickly: a queen in column 1 of row 1 leads to a dead end in every branch.

**Why not the others:** b) and c) contradict the two solutions. d) The set of solutions does not depend on the search
order; only how fast you find them does.
</details>

**X39.** The bisection method starts on [1, 2] for $f(x) = x^2 - 2$. What is the interval after one step?

- a) [1, 1.5]
- b) [1.5, 2]
- c) [1.25, 1.5]
- d) [1, 2] — no change yet

<details><summary>Answer and explanation</summary>

**Answer: a) [1, 1.5].**

**Why:** f(1) = −1 < 0 and f(1.5) = 0.25 > 0, so the sign change (the root √2 ≈ 1.414) lies in [1, 1.5].

**Why not the others:** b) keeps the half without the sign change. c) takes two steps. d) Every step halves the interval.
</details>

**X40.** First-fit packs items of sizes 0.5, 0.7, 0.5, 0.2, 0.4, 0.2, 0.5, 0.1 (in that order) into bins of capacity 1. How many bins does it use?

- a) 3
- b) 4
- c) 5
- d) 6

<details><summary>Answer and explanation</summary>

**Answer: b) 4.**

**Why:** bin 1 gets 0.5 + 0.5; bin 2 gets 0.7 + 0.2 + 0.1; bin 3 gets 0.4 + 0.2; bin 4 gets 0.5 (it does not fit in bin 3,
which holds 0.6). The sizes add up to 3.1, so at least 4 bins are needed anyway: here first-fit is optimal.

**Why not the others:** a) is below the lower bound ⌈3.1⌉ = 4. c) and d) come from opening new bins too early.
</details>

---

⬅️ [Quiz bank](README.md) · [Practice home](../README.md) · [Interactive quiz](https://normansrule.github.io/algorithm-forge/quiz.html)
