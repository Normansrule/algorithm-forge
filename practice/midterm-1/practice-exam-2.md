# 📝 Practice Exam 2 (original, Midterm-1 style)

**Rules for yourself:** closed book, 75 minutes, 4 questions (about 17 minutes each plus review). Write every answer
the way the [exam strategies](../exam-strategies.md) page shows: idea → pseudocode → correctness → analysis → tiny
trace. Only open a solution after you have written your own answer, and grade yourself with the checklist inside it.

This exam is new material written for Algorithm Forge. It follows the same four question types as Midterm 1 but
uses different problems.

---

## Questions

**Question 1 — Linear-time design (25 points).**
You are given two sorted sequences A and B, each with n elements, that may contain duplicates. Describe an
$O(n)$-time algorithm that outputs the **set difference** $A - B$ (the values that occur in A but not in B), sorted
and with no duplicates. Justify that it runs in $O(n)$ time.

**Question 2 — Recursive and non-recursive (25 points).**
Design two algorithms that decide whether an array $A[0..n-1]$ is a **palindrome** (it reads the same forwards and
backwards):
(a) a recursive decrease-and-conquer algorithm, and (b) a non-recursive algorithm.
For each one, count the element comparisons in the worst case and justify that it is linear. For (a), set up the
recurrence and solve it by backward substitution.

**Question 3 — Exhaustive search (25 points).**
A **Latin square** of order n is an n × n grid filled with the symbols 1, …, n so that every symbol appears exactly
once in each row and exactly once in each column.
(a) Prove that there are at least $n!$ different Latin squares of order n.
(b) Design an exhaustive-search algorithm that generates all Latin squares of order n.
(c) Analyze its time efficiency, and say how many candidates it examines for n = 3 and n = 4.

**Question 4 — Recurrences by backward substitution (25 points).**
(a) An algorithm reduces an instance of size n to **one** instance of size n/3, and the reduction plus the
combination take n steps. Size 1 costs 1. Write the recurrence and solve it exactly for $n = 3^k$ by backward
substitution. Give the Θ class.
(b) Now suppose the algorithm makes **three** recursive calls on size n/3 with the same n steps of extra work and
the same initial condition. Write and solve this recurrence as well, and compare it with (a).

---

## Solutions

<details>
<summary><b>Question 1 — solution</b> (click to open after you have tried it)</summary>

**Idea.** Walk through A and B with two pointers, as in merging. For the current A-value, skip every B-value that
is smaller. If the next B-value is equal, A's value is in B, so skip it. Otherwise it is in the difference. Output
it only if it differs from the last value we output (equal values are adjacent because A is sorted).

```
ALGORITHM SortedDifference(A[0..n-1], B[0..m-1])
    // Computes the set difference A - B of two sorted sequences
    // Input: Sorted arrays A[0..n-1] and B[0..m-1] (duplicates allowed)
    // Output: Sorted array of the distinct values in A that do not occur in B
    C ← array(n, 0)
    k ← 0
    i ← 0
    j ← 0
    while i < n do
        if j < m and B[j] < A[i] then
            j ← j + 1                     // this B-value can never match anything from here on
        else if j < m and B[j] = A[i] then
            i ← i + 1                     // A[i] occurs in B: not in the difference
        else                              // j = m or B[j] > A[i]: A[i] is not in B
            if k = 0 or C[k - 1] ≠ A[i] then
                C[k] ← A[i]
                k ← k + 1
            i ← i + 1
    return C[0..k-1]
```

**Invariant.** At the top of the loop, `C[0..k-1]` is exactly the sorted set of values in `A[0..i-1]` that do not
occur in B, and every value in `B[0..j-1]` is smaller than `A[i]`. So if `A[i]` occurs in B at all, it occurs at
position j or later. Since B is sorted, the first B-value ≥ `A[i]` decides whether it occurs.

**O(n).** Each iteration increases either i or j by exactly 1. So there are at most $n + m = 2n$ iterations, each
doing O(1) work. Total: $O(n)$.

**Trace** `A = 1 2 2 4 6 6 9`, `B = 2 3 3 6 7 8 8` → output `1 4 9` (14 iterations ≤ 2n = 14, Python-verified).

**Grading checklist:** handles duplicates in A (the last-output check) ✓ · handles B running out (`j < m` guards) ✓ ·
states that every step advances a pointer ✓ · has a trace ✓.
</details>

<details>
<summary><b>Question 2 — solution</b></summary>

**(a) Recursive (decrease by two).** An array is a palindrome if and only if its two ends match and the inside is a palindrome.

```
ALGORITHM IsPalindromeRec(A[l..r])
    // Decides whether A[l..r] reads the same forwards and backwards
    // Input: A segment A[l..r] (call IsPalindromeRec(A[0..n-1]))
    // Output: true or false
    if l ≥ r then
        return true                       // empty or single element
    if A[l] ≠ A[r] then
        return false
    return IsPalindromeRec(A[l+1..r-1])
```

Worst case (a palindrome, where every pair must be checked):
$C(n) = C(n-2) + 1$ for $n \ge 2$, with $C(0) = C(1) = 0$.

$$
C(n) = C(n-2) + 1 = C(n-4) + 2 = C(n-6) + 3 = \dots = C(n - 2i) + i.
$$

Take $i = \lfloor n/2 \rfloor$, so that $n - 2i \in \{0, 1\}$: $C(n) = \lfloor n/2 \rfloor \in \Theta(n)$.
The recursion depth is also $\lfloor n/2 \rfloor$, so the stack uses $\Theta(n)$ space.

**(b) Non-recursive.**

```
ALGORITHM IsPalindrome(A[0..n-1])
    // Decides whether A reads the same forwards and backwards
    for i ← 0 to ⌊n/2⌋ - 1 do
        if A[i] ≠ A[n - 1 - i] then
            return false
    return true
```

Worst case: the loop runs $\lfloor n/2 \rfloor$ times with one comparison each, so $C_{worst}(n) = \lfloor n/2 \rfloor
\in \Theta(n)$. Best case: 1 comparison (the ends differ). Extra space: $\Theta(1)$.

**Correctness (b):** the invariant is that before iteration i, `A[t] = A[n-1-t]` for all t < i. If the loop
finishes, every mirrored pair matches, which is exactly the definition of a palindrome.

**Trace:** `r a c e c a r` makes 3 comparisons and returns true. `a b c a` makes 2 comparisons (a = a, then b ≠ c)
and returns false.

**Compare:** both make the same comparisons. The iterative version wins on space.
</details>

<details>
<summary><b>Question 3 — solution</b></summary>

**(a) At least n! Latin squares.** Number the rows and columns 0..n−1. Take any permutation $\pi = (\pi_0, \dots,
\pi_{n-1})$ of the symbols 1..n and define

$$L_\pi[i][j] = \pi_{(i + j) \bmod n}.$$

- Row i is π shifted cyclically by i positions, which is still a permutation, so each symbol appears once per row.
- In column j, as i runs over 0..n−1, the index $(i + j) \bmod n$ runs over all of 0..n−1, so each symbol appears
  once per column.
- Row 0 of $L_\pi$ is π itself, so different permutations give different squares.

That makes n! different Latin squares. ∎ (In fact there are many more: 12 for n = 3 versus 3! = 6, and 576 for n = 4 versus 4! = 24.)

**(b) Exhaustive search.** Try every way to fill the $n^2$ cells with symbols from 1..n, and keep the grids that
pass the test.

```
ALGORITHM LatinSquares(n)
    // Generates every Latin square of order n by exhaustive search
    L ← matrix(n, n, 0)
    FillCell(0, n, L)

ALGORITHM FillCell(k, n, L)
    // Cells 0..k-1 (row-major) are filled; try every symbol in cell k
    if k = n * n then
        if IsLatin(L, n) then
            output L
        return
    for x ← 1 to n do
        L[k div n][k mod n] ← x
        FillCell(k + 1, n, L)

ALGORITHM IsLatin(L, n)
    // Checks that every row and every column contains each symbol exactly once
    for i ← 0 to n - 1 do
        seenRow ← array(n + 1, false)
        seenCol ← array(n + 1, false)
        for j ← 0 to n - 1 do
            if seenRow[L[i][j]] or seenCol[L[j][i]] then
                return false
            seenRow[L[i][j]] ← true
            seenCol[L[j][i]] ← true
    return true
```

**(c) Analysis.** There are $n^{n^2}$ complete grids, and `IsLatin` costs $\Theta(n^2)$ per grid. The recursion tree
has $\sum_{k=0}^{n^2} n^k < 2n^{n^2}$ nodes (for $n \ge 2$), so generation adds at most the same order. Hence

$$T(n) \in \Theta\big(n^2 \cdot n^{n^2}\big).$$

- n = 3: $3^9 = 19{,}683$ candidates, of which **12** are Latin squares.
- n = 4: $4^{16} \approx 4.29 \times 10^9$ candidates, of which **576** are Latin squares (both counts verified in Python).

**Improvement worth mentioning.** Generate each **row as a permutation**. That gives $(n!)^n$ candidates instead of
$n^{n^2}$: 216 instead of 19,683 for n = 3, and 331,776 instead of 4.29 billion for n = 4. Only the columns then
need checking. Even better, check each column as soon as a row is placed (backtracking, Levitin §12.1).
</details>

<details>
<summary><b>Question 4 — solution</b></summary>

**(a)** $T(n) = T(n/3) + n$ for $n > 1$, $T(1) = 1$. Let $n = 3^k$:

$$
\begin{aligned}
T(3^k) &= T(3^{k-1}) + 3^k \\
       &= T(3^{k-2}) + 3^{k-1} + 3^k \\
       &= T(3^{k-3}) + 3^{k-2} + 3^{k-1} + 3^k \\
       &\;\;\vdots \\
       &= T(3^{k-i}) + \sum_{j=k-i+1}^{k} 3^j \\
       &= T(1) + \sum_{j=1}^{k} 3^j \quad (i = k) \\
       &= 1 + \frac{3^{k+1} - 3}{2} = \frac{3n - 1}{2}.
\end{aligned}
$$

So $T(n) = (3n - 1)/2 \in \Theta(n)$. Check: $T(3) = T(1) + 3 = 4$ and $(9 - 1)/2 = 4$. ✔ The geometric series is
dominated by its largest term, the top-level work n.

**(b)** $T(n) = 3T(n/3) + n$ for $n > 1$, $T(1) = 1$. Let $n = 3^k$:

$$
\begin{aligned}
T(3^k) &= 3T(3^{k-1}) + 3^k \\
       &= 3[3T(3^{k-2}) + 3^{k-1}] + 3^k = 3^2 T(3^{k-2}) + 2\cdot 3^k \\
       &= 3^3 T(3^{k-3}) + 3\cdot 3^k \\
       &\;\;\vdots \\
       &= 3^i T(3^{k-i}) + i\cdot 3^k \\
       &= 3^k T(1) + k\cdot 3^k \quad (i = k) \\
       &= n + n\log_3 n.
\end{aligned}
$$

So $T(n) = n\log_3 n + n \in \Theta(n \log n)$. Check: $T(3) = 3\cdot1 + 3 = 6$ and $3\cdot1 + 3 = 6$. ✔
(Master Theorem check: $a = 3$, $b = 3$, $d = 1$, and $a = b^d$ gives $\Theta(n^d \log n)$.)

**Compare:** one call on n/3 means the work shrinks geometrically, giving linear time. Three calls on n/3 means every
level costs n, over $\log_3 n$ levels, giving $n \log n$. Both were verified in Python for $k = 0..9$.
</details>

---

⬅️ [Midterm 1 review + solutions](README.md) · [Exam strategies](../exam-strategies.md) · [Practice home](../README.md)
