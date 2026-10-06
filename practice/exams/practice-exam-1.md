# 📝 Practice Exam 1 — Checkpoint A (Chapters 1–5): Review Guide and Fully Worked Solutions

Levitin, *Introduction to the Design and Analysis of Algorithms*, 3rd ed. · Chapters 1–5 (plus heaps from §6.4).

This page has four parts:

1. [Exam format and time tips](#1-exam-format-and-time-tips)
2. [The four kinds of questions](#2-the-four-kinds-of-questions)
3. [Part A: 5 warm-up problems, fully worked](#3-part-a--fully-worked-solutions)
4. [Part B: a four-problem practice exam, fully worked](#4-part-b--fully-worked-solutions)

Then try the brand-new [Practice Exam 2](practice-exam-2.md) under exam conditions. For the question-by-question
game plan and a recurrence cheat sheet, see [Problem-solving strategies](../problem-solving-strategies.md).

Every solution below follows the same five steps. Your own answers should follow them too:

> **Idea in plain words → Forge Pseudocode → correctness argument (invariant) → time analysis → a small trace.**

---

## 1. Exam format and time tips

- **Budget your time.** Part B has 4 problems. If you give yourself about 75 minutes, that is roughly **17 minutes
  per problem**, plus 5–7 minutes at the end to re-read your answers. Any time you have left over goes into the
  justification: that is where an answer becomes convincing.
- **Read all four problems first (2 minutes).** Start with the one you are surest of. Momentum matters.
- **Write the idea in one or two sentences before any pseudocode.** A correct idea is most of the solution.
- **Every algorithm needs three things:** pseudocode with header comments (Input and Output), a reason it is
  correct, and a count of its basic operation. "It's obviously O(n)" proves nothing. "Each iteration moves `i` or `j`
  one step toward the other, so there are at most n iterations of O(1) work each" is a complete argument.
- **Name the basic operation and the input size** at the start of every analysis (Levitin §2.1).
- **Recurrences: show every backward-substitution line** and the general *i*-th line. Then choose *i* to reach
  the initial condition and simplify. Finally, **check one value** (for example T(2) or T(4)) against the recurrence.
- **Trace on a tiny example.** Six elements are enough. It catches off-by-one errors and shows the reader the idea works.
- **When stuck**, write the brute-force solution and its complexity. Then say how you would improve it.

---

## 2. The four kinds of questions

Both parts of this practice exam use four common kinds of algorithm-design questions. Master these and few questions on Chapters 1–5 will surprise you.

| Type | What they ask | What you must show | Study |
|------|---------------|--------------------|-------|
| **① Design a linear algorithm** | Merge-style scans of sorted sequences (union, intersection, difference, remove duplicates) | Two-pointer pseudocode, a loop invariant, and "each step advances a pointer, so ≤ 2n steps" | Problems B1 and A2, Levitin Exercise 1.1.5 |
| **② Recursive + non-recursive pair** | Two versions of the same task (sum of cubes, rearranging negatives, quicksort) | A recurrence with backward substitution for the recursive version, a summation for the iterative one, and a comparison of the two | Problems A1, A5 and B2, Levitin §2.3–2.4 |
| **③ Exhaustive search + analysis** | Generate all candidates (permutations or subsets), test each one, count | A formula for the number of candidates × the cost per candidate, plus any mathematical property they ask you to prove first | Problem B3, Levitin §3.4 |
| **④ Recurrence by backward substitution** | A decrease- or divide-and-conquer description turned into T(n), then solved | The recurrence and initial condition, substitution for n = 2^k, the i-th line, the closed form, and the Θ class | Problems B4 and A5(c), Levitin §2.4, Appendix B |

Also know how to prove **lower bounds** with an adversary argument (Problem A4, Levitin §11.1–11.2) and the
**⌈3n/2⌉ − 2 min-and-max trick** (Problem A3).

---

## 3. Part A — fully worked solutions

### Problem A1 — Sum of the first n cubes: recursive vs. non-recursive

> Compute $S(n) = 1^3 + 2^3 + \dots + n^3$ with (a) a recursive algorithm and (b) a non-recursive algorithm.
> Analyze both and say which is better. (Compare with Levitin Exercise 2.4.3.)

**Idea.** $S(n) = S(n-1) + n^3$ gives a decrease-by-one recursion directly. The iterative version accumulates the same sum in a loop.

```
ALGORITHM SumCubesRec(n)
    // Computes 1^3 + 2^3 + ... + n^3 recursively
    // Input: A positive integer n
    // Output: The sum of the first n cubes
    if n = 1 then
        return 1
    return SumCubesRec(n - 1) + n * n * n
```

```
ALGORITHM SumCubesIter(n)
    // Computes 1^3 + 2^3 + ... + n^3 with a loop
    // Input: A positive integer n
    // Output: The sum of the first n cubes
    S ← 0
    for i ← 1 to n do
        S ← S + i * i * i
    return S
```

**Correctness.** Recursive: by induction on n. The base case $S(1) = 1$ holds, and if the call on $n-1$ returns
$S(n-1)$, then adding $n^3$ gives $S(n)$. Iterative: the loop invariant is *"after the iteration with index i,
$S = 1^3 + \dots + i^3$"*. It holds after i = 1, and each iteration adds exactly the next cube.

**Analysis.** Input size: n. Basic operation: multiplication.

*Recursive:* let $M(n)$ be the number of multiplications. Each call makes 2 multiplications and one recursive call on $n-1$.

$$M(n) = M(n-1) + 2 \text{ for } n > 1, \qquad M(1) = 0.$$

Backward substitution:

$$
\begin{aligned}
M(n) &= M(n-1) + 2 \\
     &= [M(n-2) + 2] + 2 = M(n-2) + 2\cdot 2 \\
     &= [M(n-3) + 2] + 2\cdot 2 = M(n-3) + 2\cdot 3 \\
     &\;\;\vdots \\
     &= M(n-i) + 2i \quad \text{(general line)} \\
     &= M(1) + 2(n-1) \quad (i = n-1) \\
     &= 2(n-1).
\end{aligned}
$$

Check: $M(2)$ should be 2 by the recurrence, and $2(2-1) = 2$. ✔ There are $n-1$ additions and $n$ calls, and the
recursion is $n$ calls deep, so the extra space is $\Theta(n)$.

*Iterative:* $M(n) = \sum_{i=1}^{n} 2 = 2n \in \Theta(n)$. It uses $\Theta(1)$ extra space.

**Comparison.** Both run in $\Theta(n)$ time. The iterative version is better in practice: no function-call
overhead and constant space instead of a $\Theta(n)$ call stack, which can overflow for large n. (Best of all is the
closed form $S(n) = \left(\frac{n(n+1)}{2}\right)^2$, which takes $\Theta(1)$ arithmetic operations.)

**Trace (n = 4):** the loop gives S = 1 → 9 → 36 → 100. The closed form gives $(4\cdot5/2)^2 = 100$. ✔

---

### Problem A2 — Union of two sorted sequences in O(n)

This is the same problem as Problem B1. The full solution is [below](#problem-b1--union-of-two-sorted-sequences-as-a-set-in-on).

---

### Problem A3 — Minimum and maximum with at most 3n/2 comparisons (transform-and-conquer)

**Idea (representation change).** The naive method (scan for the min, then scan for the max) uses $2(n-1)$ comparisons.
Instead, **transform** the list into $\lfloor n/2 \rfloor$ ordered pairs. Compare the two elements of each pair
once. The smaller one is a "loser" and can only be the minimum; the larger one is a "winner" and can only be the
maximum. So each new pair costs 3 comparisons (inside the pair, loser vs. current min, winner vs. current max)
instead of 4.

```
ALGORITHM MinMax(A[0..n-1])
    // Finds the smallest and the largest element with ⌈3n/2⌉ - 2 comparisons
    // Input: An array A[0..n-1] of n ≥ 1 numbers
    // Output: The pair (smallest, largest)
    if n mod 2 = 1 then
        mn ← A[0]
        mx ← A[0]
        i ← 1
    else
        if A[0] < A[1] then
            mn ← A[0]
            mx ← A[1]
        else
            mn ← A[1]
            mx ← A[0]
        i ← 2
    while i ≤ n - 2 do
        if A[i] < A[i + 1] then
            small ← A[i]
            big ← A[i + 1]
        else
            small ← A[i + 1]
            big ← A[i]
        if small < mn then
            mn ← small
        if big > mx then
            mx ← big
        i ← i + 2
    return (mn, mx)
```

**Correctness (invariant).** At the top of the `while` loop, `mn` and `mx` are the minimum and maximum of
`A[0..i-1]`. This holds initially (one element, or the first pair after one comparison). Each iteration folds in the
pair `A[i], A[i+1]`. The new minimum is either the old `mn` or the smaller of the pair (the larger one of the pair
cannot be a new minimum), and symmetrically for the maximum. When the loop ends, `i = n`, so the whole array has been
covered.

**Counting comparisons.**
- n even: 1 comparison for the first pair, then $(n-2)/2$ pairs × 3 = $1 + \frac{3(n-2)}{2} = \frac{3n}{2} - 2$.
- n odd: 0 comparisons to start, then $(n-1)/2$ pairs × 3 = $\frac{3(n-1)}{2}$.

Both cases equal $\lceil 3n/2 \rceil - 2 \le 3n/2$. ✔ (Checked in Python for n = 1…39. The first values are
0, 1, 3, 4, 6, 7, 9, 10, 12, 13.)

**Why is this "transform-and-conquer"?** We do not solve the problem on the original list. We first change its
representation into a list of winners and a list of losers (about n/2 each), then solve two easier problems:
the max of the winners and the min of the losers. (Presorting is another transformation, but it costs
$\Theta(n \log n)$ comparisons, which breaks the 3n/2 limit.)

**Trace** `7 2 9 4 1 8` (n = 6):

| step | pair | inside-pair | vs. min | vs. max | (mn, mx) | comparisons so far |
|------|------|-------------|---------|---------|----------|-------------------:|
| init | (7, 2) | 2 < 7 | — | — | (2, 7) | 1 |
| 1 | (9, 4) | 4 < 9 | 4 < 2? no | 9 > 7? yes | (2, 9) | 4 |
| 2 | (1, 8) | 1 < 8 | 1 < 2? yes | 8 > 9? no | (1, 9) | 7 |

That is 7 comparisons, and $3\cdot 6/2 - 2 = 7$. ✔

---

### Problem A4 — Finding the kth smallest element in a heap needs Ω(k) time

> Show that finding the kth smallest element in a (min-)heap takes at least Ω(k) time in the worst case.

**Idea (adversary argument).** An algorithm can only learn about a heap by reading cells. We build one heap and
show that if the algorithm skips any of k − 1 particular cells, we can secretly change that cell's value. The heap
stays valid, everything the algorithm read stays the same, but the correct answer changes. Since the algorithm
saw nothing different, it gives the same (now wrong) answer. So every correct algorithm must read those k − 1
cells, which takes Ω(k) time.

**The heap.** Use the array heap $H[1..n]$ (children of $i$ are $2i$ and $2i+1$), with $n \ge 2k+1$, and set
$H[i] = i$ for every $i$. It is a valid min-heap, because each parent index $\lfloor i/2 \rfloor$ is smaller than $i$.
The kth smallest value is $k$, stored in cell $k$.

**The cells that must be read.** Look at cells $c = k+1, \dots, 2k-1$ (there are $k-1$ of them). Each has a parent
$p = \lfloor c/2 \rfloor \le k-1$, and its children have indices $\ge 2k+2$.

**The adversary step.** Suppose a correct algorithm, run on $H$, never reads some cell $c$ in that range. Build
$H'$ equal to $H$ except $H'[c] = k - \tfrac12$.
- $H'$ is still a min-heap: the parent holds $p \le k-1 < k-\tfrac12$, and the children hold values $\ge 2k+2 > k-\tfrac12$.
- $H'$ agrees with $H$ on every cell the algorithm reads. So the algorithm (which decides what to read next based
  only on what it has seen) makes exactly the same reads and returns the same answer, $k$.
- But in $H'$ there are $k$ values smaller than $k$: namely $1, \dots, k-1$ and $k - \tfrac12$. So the kth smallest
  is $k - \tfrac12$, not $k$. The algorithm is wrong on $H'$, a contradiction.

Therefore every correct algorithm reads all $k-1$ cells $k+1, \dots, 2k-1$ in the worst case. Its running time is
at least $k - 1 \in \Omega(k)$. ∎

**Tiny example (k = 3, n = 7):** $H = [1,2,3,4,5,6,7]$. The cells that must be read are 4 and 5. If an algorithm
never looks at cell 4, change it to 2.5. That gives $[1,2,3,2.5,5,6,7]$, still a heap, and now the 3rd smallest is 2.5.

**Remark.** The bound is tight. Using an auxiliary priority queue of "frontier" cells gives $O(k \log k)$, and
Frederickson (1993) gave an $O(k)$ algorithm. Either way, the answer does **not** depend on n.

---

### Problem A5 — Quicksort: recursive and non-recursive, with analysis

**Idea.** Pick a pivot (here the first element), **partition** the subarray so smaller elements come before the
pivot and the rest after it, then sort the two sides. We use the Lomuto partition: one left-to-right scan that
makes exactly $m-1$ comparisons on a subarray of size $m$, which keeps the counting clean. (Levitin §5.2 uses
Hoare's two-pointer partition with about $m+1$ comparisons. The Θ-results are the same.)

```
ALGORITHM LomutoPartition(A[l..r])
    // Partitions A[l..r] around the pivot p = A[l]
    // Output: the pivot's final index s; A[l..s-1] < p ≤ A[s+1..r]
    p ← A[l]
    s ← l
    for i ← l + 1 to r do
        if A[i] < p then
            s ← s + 1
            swap A[s] and A[i]
    swap A[l] and A[s]
    return s
```

**(a) Recursive**

```
ALGORITHM Quicksort(A[l..r])
    // Sorts the subarray A[l..r] in nondecreasing order
    if l < r then
        s ← LomutoPartition(A[l..r])
        Quicksort(A[l..s-1])
        Quicksort(A[s+1..r])
```

**(b) Non-recursive.** Replace the call stack with an explicit stack of pending (l, r) segments.

```
ALGORITHM QuicksortIterative(A[0..n-1])
    // Sorts A[0..n-1] using an explicit stack instead of recursion
    S ← stack()
    push(S, 0)
    push(S, n - 1)
    while not isEmpty(S) do
        r ← pop(S)
        l ← pop(S)
        if l < r then
            s ← LomutoPartition(A[l..r])
            // push the LARGER side first so the smaller side is processed next:
            // this keeps the stack at most about log2 n segments deep
            if s - l > r - s then
                push(S, l)
                push(S, s - 1)
                push(S, s + 1)
                push(S, r)
            else
                push(S, s + 1)
                push(S, r)
                push(S, l)
                push(S, s - 1)
    return A
```

**Correctness.** After `LomutoPartition`, the pivot sits in its final sorted position `s`: everything left of it is
smaller, and everything right of it is at least as large. So sorting the two sides independently sorts the whole
segment (induction on the segment size). The iterative version does exactly the same work. The stack simply holds
the segments that the recursion would still have to sort.

**(c) Recurrence + backward substitution (recursive version).** Basic operation: the key comparison `A[i] < p`.

*Worst case* (for example, an already-sorted array, where every pivot is the minimum): one side is empty and the other has $n-1$ elements.

$$C_w(n) = C_w(n-1) + (n-1), \qquad C_w(1) = 0.$$

$$
\begin{aligned}
C_w(n) &= C_w(n-1) + (n-1) \\
       &= C_w(n-2) + (n-2) + (n-1) \\
       &= C_w(n-3) + (n-3) + (n-2) + (n-1) \\
       &\;\;\vdots \\
       &= C_w(n-i) + \sum_{j=n-i}^{n-1} j \\
       &= C_w(1) + \sum_{j=1}^{n-1} j \quad (i = n-1) \\
       &= \frac{n(n-1)}{2} \in O(n^2).
\end{aligned}
$$

*Best case* (every pivot lands in the middle), for $n = 2^k$:

$$C_b(n) = 2C_b(n/2) + (n-1), \qquad C_b(1) = 0.$$

$$
\begin{aligned}
C_b(2^k) &= 2C_b(2^{k-1}) + 2^k - 1 \\
         &= 2[2C_b(2^{k-2}) + 2^{k-1} - 1] + 2^k - 1 = 2^2 C_b(2^{k-2}) + 2\cdot 2^k - (1 + 2) \\
         &= 2^3 C_b(2^{k-3}) + 3\cdot 2^k - (1 + 2 + 4) \\
         &\;\;\vdots \\
         &= 2^i C_b(2^{k-i}) + i\cdot 2^k - (2^i - 1) \\
         &= 2^k C_b(1) + k\,2^k - 2^k + 1 \quad (i = k) \\
         &= n\log_2 n - n + 1 \in O(n \log n).
\end{aligned}
$$

Check: $C_b(2) = 2\cdot 0 + 1 = 1$, and $2\cdot1 - 2 + 1 = 1$. ✔ On average (random input), quicksort makes about
$2n\ln n \approx 1.39\,n\log_2 n$ comparisons (Levitin §5.2).

**Answer in Big-O:** worst case $O(n^2)$; best and average case $O(n \log n)$.

**(d) Counting method (non-recursive version).** Count the comparisons directly. Every segment of size $m \ge 2$
that is popped is partitioned once with $m-1$ comparisons. Segments of size 0 or 1 cost nothing.
- In the **worst case**, the segments partitioned have sizes $n, n-1, \dots, 2$, so
  $C = \sum_{m=2}^{n}(m-1) = \sum_{j=1}^{n-1} j = \frac{n(n-1)}{2} \in O(n^2)$.
- In the **best case**, the segments at recursion level $\ell$ are $2^\ell$ segments of about $n/2^\ell$ elements each, so
  every level costs fewer than $n$ comparisons. There are about $\log_2 n$ levels, so $C < n\log_2 n \in O(n\log n)$.
- **Space:** because the smaller side is always processed first, the segment being worked on at stack depth $d$
  has at most $n/2^d$ elements, so the stack never holds more than about $\log_2 n + 1$ pending segments, even in
  the worst case.

**Trace** `5 3 8 1 9 2` (Python-verified):

| pop (l, r) | pivot | comparisons | array after partition | stack after (top at right) |
|------------|-------|------------:|-----------------------|----------------------------|
| (0, 5) | 5 | 5 | `2 3 1 [5] 9 8` | (0,2), (4,5) |
| (4, 5) | 9 | 1 | `2 3 1 5 8 [9]` | (0,2), (4,4), (6,5) |
| (6, 5), (4, 4) | — | 0 | (empty or single: nothing to do) | (0,2) |
| (0, 2) | 2 | 2 | `1 [2] 3 5 8 9` | (2,2), (0,0) |
| (0, 0), (2, 2) | — | 0 | sorted ✔ | empty |

Total: 8 comparisons (the recursive version makes the same 8).

---

## 4. Part B — fully worked solutions

### Problem B1 — Union of two sorted sequences as a set, in O(n)

> A and B are sorted sequences of n elements each and may contain duplicates. Output the set $A \cup B$ as a
> sorted sequence with no duplicates, in $O(n)$ time, and justify the bound.

**Idea.** Merge the two sequences exactly as mergesort does. Because the merged stream comes out in sorted order,
equal values arrive **next to each other**, so a value is new if and only if it differs from the **last value we
output**. We never need to look further back.

```
ALGORITHM SortedUnion(A[0..n-1], B[0..m-1])
    // Computes the set union of two sorted sequences (duplicates allowed in the input)
    // Input: Sorted arrays A[0..n-1] and B[0..m-1]
    // Output: Sorted array of the distinct values that occur in A or B
    C ← array(n + m, 0)
    k ← 0                              // C[0..k-1] holds the output so far
    i ← 0
    j ← 0
    while i < n or j < m do
        if j = m or (i < n and A[i] ≤ B[j]) then
            x ← A[i]
            i ← i + 1
        else
            x ← B[j]
            j ← j + 1
        if k = 0 or C[k - 1] ≠ x then  // x is new only if it differs from the last output
            C[k] ← x
            k ← k + 1
    return C[0..k-1]
```

**Correctness (loop invariant).** At the top of each iteration:
1. `C[0..k-1]` holds, in increasing order and without repeats, exactly the distinct values of `A[0..i-1]` and `B[0..j-1]`.
2. Every value already consumed is ≤ every value not yet consumed (`A[i..n-1]` and `B[j..m-1]`), because we always take the smaller front element of two sorted sequences.

*Initialization:* nothing has been consumed, and C is empty. *Maintenance:* by (2), the next value x is ≥ everything
in C, so x is either equal to `C[k-1]` (a duplicate, skipped) or larger (new, appended at the end, which keeps C sorted).
*Termination:* the loop stops when i = n and j = m, so by (1) C is exactly the set $A \cup B$.

**Why O(n).** Every iteration consumes **exactly one** element (either i or j increases by 1), so the loop runs
exactly $n + m = 2n$ times. Each iteration does a constant amount of work (at most 3 comparisons and 1 assignment
into C). Total: $\Theta(n)$ time. The output array uses $O(n)$ extra space.

**Trace** `A = 1 2 2 5 7 7`, `B = 2 3 5 5 8 9` (Python-verified):

| take | from | value | last output | action | C |
|-----:|------|------:|-------------|--------|---|
| 1 | A | 1 | — | append | 1 |
| 2 | A | 2 | 1 | append | 1 2 |
| 3 | A | 2 | 2 | skip | 1 2 |
| 4 | B | 2 | 2 | skip | 1 2 |
| 5 | B | 3 | 2 | append | 1 2 3 |
| 6 | A | 5 | 3 | append | 1 2 3 5 |
| 7–8 | B, B | 5, 5 | 5 | skip, skip | 1 2 3 5 |
| 9 | A | 7 | 5 | append | 1 2 3 5 7 |
| 10 | A | 7 | 7 | skip | 1 2 3 5 7 |
| 11–12 | B, B | 8, 9 | 7, 8 | append, append | **1 2 3 5 7 8 9** |

12 = 2n iterations. ✔

**Common mistakes:** (1) checking `x` against *all* of C, which is $O(n^2)$; (2) inserting into a hash set and
then sorting, which is $O(n\log n)$ and ignores the fact that the input is already sorted; (3) forgetting the
leftover tail of one sequence when the other runs out (the `j = m` test above handles it).

---

### Problem B2 — Negatives before non-negatives, in linear time (two ways)

> Rearrange an array of n real numbers so that all negative elements precede all positive ones. Give (a) a
> recursive decrease-and-conquer algorithm and (b) a non-recursive algorithm, and justify that both are linear.

We treat 0 as "not negative" (it goes with the positives). Say this in your answer, since the problem does not
mention zero.

**(a) Recursive, decrease-by-one.** Look at the first element of the current segment. If it is negative, it is
already in the right zone, so shrink the segment from the left. Otherwise, swap it with the last element of the
segment. The last position now holds a non-negative number, which is in the right zone, so shrink the segment from
the right.

```
ALGORITHM NegFirst(A[l..r])
    // Rearranges A[l..r] so every negative element precedes every non-negative one
    // Input: A segment A[l..r] of real numbers (call NegFirst(A[0..n-1]))
    // Output: The same segment, rearranged in place
    if l < r then
        if A[l] < 0 then
            NegFirst(A[l+1..r])
        else
            swap A[l] and A[r]
            NegFirst(A[l..r-1])
```

*Correctness (induction on the segment size m = r − l + 1).* A segment of size 0 or 1 is trivially fine. For
$m \ge 2$: in the first branch, `A[l] < 0` stays in front, and by induction the rest is arranged correctly, so the
whole segment is too. In the second branch, after the swap `A[r] ≥ 0` sits at the back, and by induction
`A[l..r-1]` is arranged correctly; appending a non-negative at the end keeps the arrangement valid.

*Analysis.* Basic operation: the comparison `A[l] < 0`. Each call on a segment of size $m \ge 2$ makes one comparison
and one recursive call on size $m - 1$:

$$C(m) = C(m-1) + 1, \quad C(1) = 0 \;\Rightarrow\; C(m) = C(m-i) + i = C(1) + (m-1) = m - 1.$$

So $C(n) = n - 1 \in \Theta(n)$, and there are at most $n - 1$ swaps. (The recursion depth is also up to n, so the
stack uses $\Theta(n)$ space. That is one more reason to prefer version (b).)

**(b) Non-recursive, two pointers** (the idea of Hoare's partition with 0 as the pivot value):

```
ALGORITHM NegFirstIter(A[0..n-1])
    // Rearranges A so every negative element precedes every non-negative one
    // Input: An array A[0..n-1] of real numbers
    // Output: A, rearranged in place
    i ← 0
    j ← n - 1
    while i < j do
        if A[i] < 0 then
            i ← i + 1
        else if A[j] ≥ 0 then
            j ← j - 1
        else
            swap A[i] and A[j]         // A[i] ≥ 0 and A[j] < 0: both are in the wrong zone
            i ← i + 1
            j ← j - 1
    return A
```

*Invariant:* `A[0..i-1]` are all negative and `A[j+1..n-1]` are all non-negative. Each branch preserves it. When
$i \ge j$, at most one element lies between the two zones, and it cannot break the arrangement.

*Linear time:* each iteration reduces $j - i$ by at least 1. That gap starts at $n - 1$, so there are at most
$n - 1$ iterations. Each iteration makes at most 2 comparisons, giving at most $2(n-1) \in \Theta(n)$ comparisons
and at most $\lfloor n/2 \rfloor$ swaps. Extra space: $\Theta(1)$.

**Trace (b)** on `3 -1 4 -1 -5 9 -2 6` (Python-verified):

| action | i | j | array |
|--------|--:|--:|-------|
| start | 0 | 7 | `3 -1 4 -1 -5 9 -2 6` |
| A[0]=3 ≥ 0 and A[7]=6 ≥ 0 → j−− | 0 | 6 | unchanged |
| A[0]=3 ≥ 0 and A[6]=−2 < 0 → swap | 1 | 5 | `-2 -1 4 -1 -5 9 3 6` |
| A[1]=−1 < 0 → i++ | 2 | 5 | unchanged |
| A[2]=4 ≥ 0 and A[5]=9 ≥ 0 → j−− | 2 | 4 | unchanged |
| A[2]=4 ≥ 0 and A[4]=−5 < 0 → swap | 3 | 3 | `-2 -1 -5 -1 4 9 3 6` ✔ |

**Trace (a)** on the same input ends with `-2 -1 -5 -1 9 4 6 3` after 7 comparisons (= n − 1). Different order, also correct.

---

### Problem B3 — Magic squares of order n

> A magic square of order n places the numbers $1, \dots, n^2$ in an n × n grid, each exactly once, so that every
> row, every column and both main diagonals have the same sum. (a) Prove that this common sum must be
> $n(n^2+1)/2$. (b) Design an exhaustive-search algorithm that generates all magic squares of order n.
> (c) Analyze its time efficiency. (This is Levitin Exercise 3.4.10.)

**(a) The magic sum.** Let M be the common sum. The whole grid contains each of $1, 2, \dots, n^2$ exactly once, so

$$\text{total} = 1 + 2 + \dots + n^2 = \frac{n^2(n^2+1)}{2}.$$

The n rows are disjoint and together cover the grid, and each row sums to M, so the total is also $nM$. Therefore

$$nM = \frac{n^2(n^2+1)}{2} \quad\Longrightarrow\quad M = \frac{n(n^2+1)}{2}. \qquad ∎$$

(Examples: n = 3 gives 15, n = 4 gives 34, n = 5 gives 65.)

**(b) Exhaustive search.** Generate every way to place $1..n^2$ into the $n^2$ cells, meaning every permutation,
filled row by row. Keep the ones that pass the magic test.

```
ALGORITHM MagicSquares(n)
    // Generates all magic squares of order n by exhaustive search
    // Input: A positive integer n
    // Output: Every n-by-n magic square (each one is output as it is found)
    M ← matrix(n, n, 0)
    used ← array(n * n + 1, false)
    Fill(0, n, M, used)

ALGORITHM Fill(k, n, M, used)
    // Cells 0..k-1 (row-major order) are filled; try every unused number in cell k
    if k = n * n then
        if IsMagic(M, n) then
            output M                           // record a copy of this magic square
        return
    for x ← 1 to n * n do
        if not used[x] then
            used[x] ← true
            M[k div n][k mod n] ← x
            Fill(k + 1, n, M, used)
            used[x] ← false                    // undo, and try the next number

ALGORITHM IsMagic(M, n)
    // Checks the 2n + 2 line sums of a filled n-by-n grid
    target ← n * (n * n + 1) div 2
    d1 ← 0
    d2 ← 0
    for i ← 0 to n - 1 do
        rowSum ← 0
        colSum ← 0
        for j ← 0 to n - 1 do
            rowSum ← rowSum + M[i][j]
            colSum ← colSum + M[j][i]
        if rowSum ≠ target or colSum ≠ target then
            return false
        d1 ← d1 + M[i][i]
        d2 ← d2 + M[i][n - 1 - i]
    return d1 = target and d2 = target
```

*Correctness.* `Fill` generates every permutation of $1..n^2$ exactly once. Each level chooses one unused number
for the next cell, and `used` prevents repeats. `IsMagic` tests exactly the definition. So a grid is output
if and only if it is a magic square.

**(c) Time efficiency.** Input size: n. The number of complete fillings is $(n^2)!$.
- `IsMagic` does $2n^2 + 2n$ additions, so it is $\Theta(n^2)$ per filling.
- Generating the fillings: the recursion tree has $\sum_{k=0}^{n^2} \frac{(n^2)!}{(n^2-k)!} \le e\cdot (n^2)!$
  nodes, and each internal node loops over $n^2$ numbers. That is also $O(n^2 \cdot (n^2)!)$ work, the same order as
  the checking. (With a constant-time-per-permutation generator such as Johnson–Trotter, Levitin §4.3, generation
  alone would be $\Theta((n^2)!)$.)

$$T(n) \in \Theta\big((n^2)! \cdot n^2\big).$$

This grows faster than exponential. The table shows what it means in practice:

| n | magic sum | candidates $(n^2)!$ | magic squares found |
|--:|---------:|--------------------:|--------------------:|
| 3 | 15 | 362,880 | **8** (verified by running the search in Python) |
| 4 | 34 | ≈ $2.09 \times 10^{13}$ | 7,040 (known result) |
| 5 | 65 | ≈ $1.55 \times 10^{25}$ | 275,305,224 (known result) |

At $10^9$ candidates per second, n = 4 already needs about 6 hours, and n = 5 would need about $5 \times 10^8$ years.

**Pruning notes (worth a sentence on the exam):**
- **Check lines as soon as they are complete.** Reject a partial grid the moment a finished row sums to something
  other than the target. For n = 3 this single rule shrinks the search tree from 986,410 nodes to 14,554 (measured),
  and it still finds all 8 squares. This is backtracking (Levitin §12.1).
- **Compute forced cells.** The last cell of a row must equal the target minus the other n − 1 cells, so there is
  no need to try all values there.
- **Symmetry.** Rotations and reflections give 8 variants of each square. For n = 3, all 8 solutions are
  symmetric copies of a single square (the "Lo Shu" square: `2 7 6 / 9 5 1 / 4 3 8`).

Pruning speeds up the search a great deal, but the worst-case bound stays super-exponential. It is still exhaustive search.

---

### Problem B4 — Recurrence $T(n) = T(n/2) + \log_2 n$ by backward substitution

> A decrease-and-conquer algorithm reduces a problem of size n to one of size n/2, solves that recursively, and
> converts the answer back. Decreasing plus converting together take $\log n$ time, and size 1 takes constant time.
> (a) Write the recurrence. (b) Solve it by backward substitution.

**(a)** One recursive call on half the size, plus $\log_2 n$ of non-recursive work:

$$T(n) = T(n/2) + \log_2 n \quad \text{for } n > 1, \qquad T(1) = 1.$$

**(b)** Let $n = 2^k$, so that $\log_2 n = k$ and $\log_2(n/2^i) = k - i$:

$$
\begin{aligned}
T(2^k) &= T(2^{k-1}) + k \\
       &= [T(2^{k-2}) + (k-1)] + k \\
       &= [T(2^{k-3}) + (k-2)] + (k-1) + k \\
       &\;\;\vdots \\
       &= T(2^{k-i}) + (k-i+1) + \dots + (k-1) + k \quad \text{(general line)} \\
       &= T(2^0) + 1 + 2 + \dots + k \quad (i = k) \\
       &= 1 + \frac{k(k+1)}{2}.
\end{aligned}
$$

Substituting back $k = \log_2 n$:

$$T(n) = 1 + \frac{\log_2 n\,(\log_2 n + 1)}{2} = \frac{(\log_2 n)^2 + \log_2 n}{2} + 1 \in \Theta(\log^2 n).$$

**Check:** $T(2) = T(1) + 1 = 2$ and the formula gives $1 + 1 = 2$. ✔ $T(8) = T(4) + 3 = T(2) + 2 + 3 = 7$ and the
formula gives $1 + 6 = 7$. ✔ $T(1024) = 1 + 55 = 56$ (checked in Python). ✔

**For n that are not powers of 2:** $(\log n)^2$ is a smooth function and $T$ is eventually nondecreasing, so by
Levitin's **smoothness rule** (Appendix B) the $\Theta(\log^2 n)$ bound holds for all n.

**Sanity check by intuition:** there are $\log_2 n$ levels, and the level costs are $k, k-1, \dots, 1$, an
arithmetic series whose sum is about $k^2/2$.

---

➡️ Next: [Practice Exam 2](practice-exam-2.md) · [Problem-solving strategies + recurrence cheat sheet](../problem-solving-strategies.md) ·
[Quiz bank](../quizzes/README.md) · [Arena problems for Chapters 2–5](https://normansrule.github.io/algorithm-forge/arena/?chapter=4)
