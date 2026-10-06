# ✍️ Problem Set 2 — Brute Force and Decrease-and-Conquer (Levitin Ch 3–4), Worked Solutions

Based on exercises from Levitin, *Introduction to the Design and Analysis of Algorithms*, 3rd ed.

Each problem is restated in our own words, followed by a step-by-step solution, Forge Pseudocode, a small trace, and
a **"Self-check"** list. Try each problem before opening the solution. Problems 9–10 are challenge
problems.

| # | Topic | Levitin exercise |
|--:|-------|------------------|
| 1 | Brute-force $a^n$; computing $a^n \bmod m$ | 3.1.2 |
| 2 | Counting substrings that start with A and end with B | 3.2.8 |
| 3 | Post office minimizing the maximum distance | 3.3.3(b) |
| 4 | Partition problem by exhaustive search | 3.4.6 |
| 5 | Power set by decrease-by-one | 4.1.4 |
| 6 | Source-removal topological sorting | 4.2.5 |
| 7 | Fake coin, divide into three piles | 4.4.10 |
| 8 | Largest key in a Binary Search Tree (BST) | 4.5.7 |
| 9 | Cross edges in a Breadth-First Search (BFS) tree | 3.5.5 |
| 10 | Topological order exists ⇔ Directed Acyclic Graph (DAG); maximum number of orders | 4.2.2 |

---

## Problem 1 — Brute-force power and power mod m (Levitin Exercise 3.1.2)

**Task in our words.** (a) How efficient is computing $a^n$ by multiplying a by itself repeatedly, as a function of n
and as a function of the number of bits b of n? (b) How do you compute $a^n \bmod m$ for huge n without ever
building the gigantic number $a^n$?

**(a)** Brute force multiplies n times (or n − 1, if you start from a instead of 1): $M(n) = n \in \Theta(n)$.
The input size of a number, however, is its bit-length $b = \lfloor\log_2 n\rfloor + 1$, so $2^{b-1} \le n < 2^b$ and

$$M = n \in \Theta(2^b).$$

**Linear in the value of n, exponential in the size of n.** This is why "polynomial in n" can be misleading for
number problems.

**(b)** Reduce modulo m after **every** multiplication. This is valid because
$(x \cdot y) \bmod m = ((x \bmod m)\cdot(y \bmod m)) \bmod m$, so every intermediate value stays below m.

```
ALGORITHM PowerMod(a, n, m)
    // Computes a^n mod m without ever storing a number of m^2 size or more
    // Input: Integers a > 1, n ≥ 1, m ≥ 2
    // Output: a^n mod m
    base ← a mod m
    result ← base
    for i ← 2 to n do
        result ← (result * base) mod m
    return result
```

Invariant: after the iteration with index i, `result` = $a^i \bmod m$. Still n − 1 multiplications, but each one
involves numbers smaller than m.

**Trace:** $3^5 \bmod 7$: 3 → 9 mod 7 = 2 → 6 → 18 mod 7 = 4 → 12 mod 7 = **5**. Check: $3^5 = 243 = 34\cdot7 + 5$ ✔.

**Going further:** exponentiation by squaring (Levitin §6.5) computes $a^n \bmod m$ with only $\Theta(\log n) = \Theta(b)$
multiplications. That is how cryptography handles 2048-bit exponents.

**Self-check:** ✅ both answers for (a), with "exponential in b" stated · ✅ the modular identity
that justifies (b) · ✅ pseudocode that reduces inside the loop.

---

## Problem 2 — Substrings that start with A and end with B (Levitin Exercise 3.2.8)

**Task in our words.** Count the substrings of a text that begin with the letter A and end with the letter B.
(For example, a text like `CABAAXBYA` has 4 of them.) Give a brute-force algorithm and its efficiency class.

**Key observation.** A substring is fixed by its start and end positions. For an A at position i, the valid
substrings starting there correspond one-to-one to the B's to the right of i.

```
ALGORITHM CountAB(T[0..n-1])
    // Brute force: for each A, count the B's to its right
    // Input: A text T[0..n-1]
    // Output: Number of substrings that start with A and end with B
    count ← 0
    for i ← 0 to n - 2 do
        if T[i] = 'A' then
            for j ← i + 1 to n - 1 do
                if T[j] = 'B' then
                    count ← count + 1
    return count
```

**Worst case** (a text of n A's): the outer test runs n − 1 times, and the A at position i scans $n - 1 - i$
characters, so

$$C_{worst}(n) = (n-1) + \sum_{i=0}^{n-2}(n-1-i) = (n-1) + \frac{n(n-1)}{2} = \frac{n(n+1)}{2} - 1 \in \Theta(n^2).$$

**Trace** `CABAAXBYA`: A at position 1 sees the B's at positions 2 and 6 (2 substrings). The A's at positions 3 and 4
each see the B at position 6 (1 each). The A at position 8 sees none. Total **4** ✔ (checked in Python).

**Better (linear) algorithm, one pass:** keep `aSeen` = the number of A's so far. Each B completes one substring
with every earlier A, so add `aSeen` whenever you meet a B. That is $\Theta(n)$. (Try it: it also gives 4.)

**Self-check:** ✅ the counting observation · ✅ a correct worst-case input and summation · ✅ Θ class ·
✅ (bonus) the linear improvement.

---

## Problem 3 — Post office minimizing the maximum distance (Levitin Exercise 3.3.3(b))

**Task in our words.** n villages lie on a straight road at coordinates $x_1 < x_2 < \dots < x_n$. Build the post
office **in one of the villages** so that the distance from the farthest village is as small as possible.

**Key fact.** If the post office is at $x_i$, the farthest village is one of the two ends:
$D(i) = \max(x_i - x_1,\; x_n - x_i)$. Moving right increases the first term and decreases the second. So the best
spot is the village **closest to the midpoint** $m = (x_1 + x_n)/2$. (Without the "must be a village" rule, the
answer would be m itself.)

A direct $\Theta(n)$ algorithm that needs no case analysis:

```
ALGORITHM PostOffice(x[1..n])
    // Chooses the village that minimizes the maximum distance to any village
    // Input: Coordinates x[1..n] in increasing order, n ≥ 1
    // Output: The best location x[best]
    best ← 1
    bestD ← x[n] - x[1]
    for i ← 2 to n do
        d ← max(x[i] - x[1], x[n] - x[i])
        if d < bestD then
            best ← i
            bestD ← d
    return x[best]
```

**Why the midpoint rule is right (proof).** For any $x_i \le m$, the farthest village is $x_n$, and $x_n - x_i$
shrinks as $x_i$ grows, so among the villages left of m, the rightmost one is best. Symmetrically, among the villages
right of m, the leftmost one is best. The answer is the better of these two neighbours of m, which is whichever is
closer to m.

*Efficiency:* $\Theta(n)$ as written. Since the x's are sorted, a binary search for m finds the two neighbours in
$\Theta(\log n)$.

**Trace:** villages at 1, 2, 6, 7, 15, so m = 8. The values D(i) are 14, 13, 9, **8**, 14, and the best spot is
**7**, the village closest to 8. ✔

**Self-check:** ✅ "the farthest village is always an endpoint" · ✅ a correct argument, not only
"pick the middle village" (the median can be wrong: here the median is 6, with D = 9) · ✅ the efficiency.

---

## Problem 4 — Partition problem by exhaustive search (Levitin Exercise 3.4.6)

**Task in our words.** Given n positive integers, split them into two groups with equal sums (if possible).
Design an exhaustive-search algorithm, and try to reduce the number of subsets it has to generate.

**Ideas that cut the search:**
1. Let S be the total. If S is odd, the answer is "impossible" immediately. Otherwise we need a subset with sum S/2.
2. **Symmetry:** if B works, so does its complement. So we may assume the first number is in B. Only subsets
   containing $a_0$ need to be generated: $2^{n-1}$ instead of $2^n$.
3. **Pruning** (positive numbers only): as soon as B's sum exceeds S/2, stop extending that branch.

```
ALGORITHM Partition(A[0..n-1])
    // Exhaustive search for a subset of A whose sum is half the total
    // Input: An array A[0..n-1] of n ≥ 1 positive integers
    // Output: inB[0..n-1] marking one side of an equal-sum split, or null if none exists
    S ← 0
    for i ← 0 to n - 1 do
        S ← S + A[i]
    if S mod 2 = 1 then
        return null
    inB ← array(n, false)
    inB[0] ← true                            // by symmetry, A[0] goes into B
    if Extend(1, A[0], S div 2, A, inB) then
        return inB
    return null

ALGORITHM Extend(k, sum, target, A[0..n-1], inB)
    // B already holds some of A[0..k-1] with total "sum"; decide A[k..n-1]
    if sum = target then
        return true                          // everything else goes to the other side
    if k = n or sum > target then
        return false
    inB[k] ← true                            // branch 1: put A[k] into B
    if Extend(k + 1, sum + A[k], target, A, inB) then
        return true
    inB[k] ← false                           // branch 2: leave A[k] out
    return Extend(k + 1, sum, target, A, inB)
```

**Efficiency.** The search tree has at most $2^{n}$ nodes (it is binary with depth n − 1), and each node does O(1)
work, so the worst case is $O(2^n)$. A version that generates each subset and then **re-sums** it from scratch
costs $O(n\cdot 2^n)$, the bound most solutions quote. Either way, the algorithm is exponential; the problem is
NP-complete (Levitin §11.3), so no polynomial algorithm is known.

**Trace** `3 1 1 2 2 1`: S = 10 and the target is 5. With 3 in B, try adding 1 (sum 4), then 1 (sum 5). Target
reached: B = {3, 1, 1} and the other side is {2, 2, 1}. Both sum to 5 ✔ (the algorithm was checked against a full
subset enumeration on 3,000 random inputs).

**Self-check:** ✅ the odd-sum shortcut · ✅ some reduction of the search (symmetry, ≤ n/2 elements, or
pruning) with the count of subsets · ✅ an honest exponential efficiency class.

---

## Problem 5 — Power set by decrease-by-one (Levitin Exercise 4.1.4)

**Task in our words.** Generate all $2^n$ subsets of $\{a_1, \dots, a_n\}$ with a decrease-by-one algorithm.

**Idea.** The subsets of $\{a_1..a_n\}$ are the subsets of $\{a_1..a_{n-1}\}$ **without** $a_n$, together with those
same subsets **with** $a_n$ added. So: solve the problem for n − 1, then double the list.

```
ALGORITHM PowerSet(A[0..n-1])
    // Generates the list of all subsets of {A[0], ..., A[n-1]}
    // Notation: [] is the empty list; s + [x] is a new list: s with x appended
    if n = 0 then
        return [ [] ]                         // only the empty set
    L ← PowerSet(A[0..n-2])                   // all subsets of the first n-1 elements
    result ← copy(L)                          // subsets that do not contain A[n-1]
    for each s in L do
        append(result, s + [A[n-1]])          // the same subsets, now containing A[n-1]
    return result
```

**Analysis.** The number of subsets produced satisfies $P(n) = 2P(n-1)$, $P(0) = 1$, so $P(n) = 2^n$. If generating
one subset counts as one step (the convention in Levitin's hint for §4.3), the algorithm is $\Theta(2^n)$, and no
algorithm can do better because it must output $2^n$ objects. If you count every element copied, the total output
size is $\sum_{k} k\binom{n}{k} = n2^{n-1}$, which gives $\Theta(n\,2^n)$.

**Trace** {a, b, c}: {∅} → {∅, a} → {∅, a, b, ab} → {∅, a, b, ab, c, ac, bc, abc}. 8 = $2^3$ ✔.

**Self-check:** ✅ the "without / with $a_n$" decrease-by-one structure · ✅ a recurrence for the
number of subsets · ✅ the efficiency class, with the counting convention stated.

---

## Problem 6 — Source-removal topological sorting (Levitin Exercise 4.2.5)

**Task in our words.** Apply the source-removal algorithm to the two digraphs of Exercise 4.2.1.

> **About the figures.** The textbook draws the two digraphs as figures, and those did not survive in our text copy.
> Below we solve two **stand-in digraphs on the same vertex set a–g with the same character**: (a) is a DAG, and (b)
> contains a directed cycle, as the textbook's digraph (b) does. If your textbook's edges differ, apply exactly
> the same steps to them. The method is what matters.

**The algorithm.** Repeatedly find a **source** (a vertex with in-degree 0), output it, and delete it with all its
outgoing edges. If vertices remain but none is a source, the digraph has a cycle and no topological order exists.
Ties are broken alphabetically here.

```
ALGORITHM SourceRemoval(adj[0..n-1])
    // Topologically sorts the digraph with vertices 0..n-1 and adjacency lists adj, or reports a cycle
    indeg ← array(n, 0)
    for v ← 0 to n - 1 do                     // compute indeg[w] for every vertex w
        for each w in adj[v] do
            indeg[w] ← indeg[w] + 1
    Q ← queue()
    for v ← 0 to n - 1 do                     // queue all the sources (indeg = 0)
        if indeg[v] = 0 then
            enqueue(Q, v)
    order ← []
    while not isEmpty(Q) do
        v ← dequeue(Q)
        append(order, v)
        for each w in adj[v] do               // delete each edge (v, w)
            indeg[w] ← indeg[w] - 1
            if indeg[w] = 0 then
                enqueue(Q, w)
    if length(order) < n then
        return "not a DAG"
    return order
```

With adjacency lists this runs in $\Theta(|V| + |E|)$ time. With an adjacency matrix it is $\Theta(|V|^2)$.

**(a) Stand-in digraph A (a DAG).** Edges: a→b, a→c, b→e, b→g, c→f, d→a, d→c, g→e, g→f.
In words: d feeds a and c; a feeds b and c; b feeds e and g; c feeds f; g feeds both e and f.

| step | current sources | remove | remaining in-degrees afterwards |
|-----:|-----------------|--------|--------------------------------|
| 1 | d | d | a:0, b:1, c:1, e:2, f:2, g:1 |
| 2 | a | a | b:0, c:0, e:2, f:2, g:1 |
| 3 | b, c | b | c:0, e:1, f:2, g:0 |
| 4 | c, g | c | e:1, f:1, g:0 |
| 5 | g | g | e:0, f:0 |
| 6 | e, f | e | f:0 |
| 7 | f | f | — |

**Topological order: d, a, b, c, g, e, f.** Check: every edge points left to right in this list ✔ (verified in Python).

**(b) Stand-in digraph B (has a cycle).** Edges: a→b, b→c, b→e, c→g, d→a, d→e, e→f, f→b, g→f.

| step | current sources | remove |
|-----:|-----------------|--------|
| 1 | d | d |
| 2 | a | a |
| 3 | **none**: b, c, e, f, g all have in-degree ≥ 1 | stop |

**No topological order exists:** the remaining vertices contain the directed cycle b → e → f → b.

**Self-check:** ✅ a table of sources and removals at every step · ✅ a final order checked against
every edge · ✅ for (b), the stopping condition "no source left" **and** an actual cycle named.

---

## Problem 7 — Fake coin, divide into three (Levitin Exercise 4.4.10)

**Task in our words.** Among n coins, exactly one is fake and **lighter**. (a) Write pseudocode that splits the coins
into three piles and uses one weighing to discard two of them; it must work for every n, not only multiples of 3.
(b) Set up and solve the recurrence for the number of weighings W(n) when $n = 3^k$. (c) For large n, how many times
faster is this than splitting into two piles?

**(a) Idea.** Make two piles of equal size $k = \lceil n/3 \rceil$ and a third pile with the remaining $n - 2k$
coins ($0 \le n - 2k \le k$). Weigh pile 1 against pile 2. If one side is lighter, the fake is in it. If they balance,
it is in pile 3. Either way, **at most $\lceil n/3\rceil$ coins remain.**

```
ALGORITHM FakeCoin3(C[l..r])
    // Finds the single lighter coin among C[l..r] using a balance scale
    // Input: Coin weights C[l..r], exactly one of which is lighter
    // Output: The index of the fake coin
    n ← r - l + 1
    if n = 1 then
        return l
    k ← ⌈n / 3⌉
    result ← Weigh(C[l..l+k-1], C[l+k..l+2k-1])     // one weighing: pile 1 vs pile 2
    if result < 0 then
        return FakeCoin3(C[l..l+k-1])               // pile 1 is lighter
    else if result > 0 then
        return FakeCoin3(C[l+k..l+2k-1])            // pile 2 is lighter
    else
        return FakeCoin3(C[l+2k..r])                // balanced: pile 3 (size n - 2k ≥ 1)

ALGORITHM Weigh(P[a..b], Q[c..d])
    // One use of the balance: -1 if pile P is lighter, 1 if Q is lighter, 0 if equal
    wp ← 0
    wq ← 0
    for i ← a to b do
        wp ← wp + P[i]
    for i ← c to d do
        wq ← wq + Q[i]
    if wp < wq then
        return -1
    if wp > wq then
        return 1
    return 0
```

Why every n works: n = 2 gives k = 1, piles of 1, 1 and 0 coins, so one weighing decides. If the scale balances,
the fake must be in pile 3, which is then non-empty because the fake exists.

**(b) Recurrence.** $W(n) = W(\lceil n/3\rceil) + 1$ for $n > 1$, $W(1) = 0$. For $n = 3^k$:

$$
W(3^k) = W(3^{k-1}) + 1 = W(3^{k-2}) + 2 = \dots = W(3^{k-i}) + i = W(1) + k = k.
$$

So $W(n) = \log_3 n$ (for general n, $\lceil\log_3 n\rceil$, checked in Python for n up to 1000).

**(c) Comparison.** Splitting into two piles needs $W_2(n) = \lfloor\log_2 n\rfloor \approx \log_2 n$ weighings. The ratio is

$$\frac{\log_2 n}{\log_3 n} = \log_2 3 \approx 1.585,$$

so **about 1.6 times fewer weighings**, independent of n.

**Trace** (n = 10, fake at index 7): k = 4, piles [0..3] vs [4..7], pile 2 is lighter → 4 coins, k = 2, piles
[4, 5] vs [6, 7], pile 2 is lighter → 2 coins, k = 1, [6] vs [7], coin 7 is lighter. **3 weighings** =
$\lceil\log_3 10\rceil$ ✔.

**Self-check:** ✅ pile sizes that work for n mod 3 = 1 and n mod 3 = 2 · ✅ a recurrence with an
initial condition · ✅ $\log_2 3 \approx 1.6$ as a constant ratio.

---

## Problem 8 — Largest key in a BST (Levitin Exercise 4.5.7)

**Task in our words.** (a) Outline an algorithm that finds the largest key in a Binary Search Tree (BST). Is it
variable-size-decrease? (b) What is its worst-case efficiency class?

**(a)** In a BST, every key in a node's right subtree is larger than the node's key. So the largest key is found by
following right-child links from the root until a node has **no right child**.

```
ALGORITHM BSTMax(T)
    // Returns the largest key of a nonempty binary search tree T (T is its root node)
    v ← T
    while v.right ≠ null do
        v ← v.right
    return v.key
```

Yes, it is **variable-size decrease**. Each step replaces the tree with its right subtree, a smaller instance of the
same problem, and how much smaller depends on the tree's shape, not on a fixed constant or factor.

**(b)** The number of steps equals the length of the rightmost path. Worst case: a right-skewed tree (keys inserted
in increasing order), which gives $\Theta(n)$. For a balanced or random BST it is $\Theta(\log n)$ on average.

**Self-check:** ✅ the BST property as the reason · ✅ "variable-size decrease" with a justification ·
✅ the worst-case shape.

---

## Problem 9 (challenge) — Cross edges in a BFS tree (Levitin Exercise 3.5.5)

**Task in our words.** Prove that in a Breadth-First Search (BFS) forest of an undirected graph, a cross edge joins
two vertices whose levels are equal or differ by exactly 1.

**Proof by contradiction.** In a BFS tree, level(v) equals d(v), the minimum number of edges on a path from the root
to v. This is the key property of BFS: it discovers vertices in order of their distance. Suppose a cross edge
(u, v) had level(u) ≥ level(v) + 2. The shortest path from the root to v, followed by the edge (v, u), is a path to u
with d(v) + 1 edges. So

$$d(u) \le d(v) + 1 \le \text{level}(u) - 1 = d(u) - 1,$$

a contradiction. The same argument with u and v swapped rules out level(v) ≥ level(u) + 2. So
$|\text{level}(u) - \text{level}(v)| \le 1$. ∎

**Self-check:** ✅ stating that BFS levels are shortest-path distances · ✅ building the shorter path
through the cross edge · ✅ handling both directions.

---

## Problem 10 (challenge) — When a topological order exists (Levitin Exercise 4.2.2)

**Task in our words.** (a) Prove that a digraph has a topological order if and only if it is a Directed Acyclic
Graph (DAG). (b) What is the largest number of different topological orders a digraph with n vertices can have?

**(a, ⇒: an order exists ⇒ no directed cycle).** Suppose there is an order $v_1, \dots, v_n$ with every edge going
left to right, but the digraph also has a cycle. Let $v_k$ be the cycle's **leftmost** vertex in the order. The
cycle edge that enters $v_k$ comes from a cycle vertex that lies to the right of $v_k$, so that edge goes right to
left. Contradiction.

**(a, ⇐: DAG ⇒ an order exists).** Every non-empty DAG has a source. (If no vertex were a source, we could walk
backwards along incoming edges forever. With finitely many vertices, the walk would repeat a vertex, which means a
cycle.) Remove a source; what is left is still a DAG. Repeat. The removal order is a topological order. This is
exactly the source-removal algorithm, so its correctness *is* the proof.

**(b)** $n!$, achieved by the digraph with **no edges**, where every permutation is valid. It cannot be more,
because a topological order is a permutation of the n vertices.

**Self-check:** ✅ both directions of the "if and only if" · ✅ the "a DAG has a source" lemma ·
✅ an example that achieves n!.

---

⬅️ [Problem Set 1](set-1-foundations.md) · [Practice home](../README.md) ·
[Topological sort simulation](https://normansrule.github.io/algorithm-forge/sims/topo-sort.html) ·
[Fake-coin in the Search Lab](https://normansrule.github.io/algorithm-forge/sims/search-lab.html)
