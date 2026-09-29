# ✍️ Assignment 1 — Chapters 1–2, Worked Solutions

CSC 501 · Levitin, *Introduction to the Design and Analysis of Algorithms*, 3rd ed.

**How to use this page.** Each problem is restated in our own words (the exact wording is in your textbook). Try it
yourself first, then open the solution. Every solution shows the reasoning a grader expects to see, gives the
algorithm in Forge Pseudocode where there is one, and ends with a **"What the grader looks for"** checklist.

Problems 1–8 are required for everyone. Problems 9–10 are the extra graduate (CSC 501) problems.

| # | Topic | Levitin exercise |
|--:|-------|------------------|
| 1 | Integer square root with only + − × ÷ | 1.1.4 |
| 2 | Improving the closest-pair-of-numbers algorithm | 1.2.9 |
| 3 | Comparison counting sort: trace, stability, in-place | 1.3.1 |
| 4 | Bounds on the height of a binary tree | 1.4.6 |
| 5 | Input size, basic operation, best/worst-case dependence | 2.1.1 |
| 6 | Ordering seven functions by order of growth | 2.2.5 |
| 7 | What does `Mystery` compute? (sum of squares) | 2.3.4 |
| 8 | Recurrences for Q(n) = Q(n−1) + 2n − 1 | 2.4.4 |
| 9 | Locker doors | 1.1.12 (listed as 1.1 #11 on the course sheet) |
| 10 | Counting F(1) and F(0) calls in recursive Fibonacci | 2.5.7 (listed as 2.5 #5 on the course sheet) |

---

## Problem 1 — Integer square root (Levitin Exercise 1.1.4)

**Task in our words.** Given a positive integer n, compute its square root, using only assignment, comparison and
the four arithmetic operations. We compute $\lfloor\sqrt n\rfloor$, the largest integer whose square is ≤ n. (The
same idea gives √n to any precision; see the note at the end.)

**Idea 1 — try consecutive integers.** Square 1, 2, 3, … until the next square would exceed n. The last integer that
fits is the answer.

```
ALGORITHM IntSqrt(n)
    // Computes ⌊√n⌋ by trying consecutive integers
    // Input: A positive integer n
    // Output: The largest integer r with r * r ≤ n
    r ← 1
    while (r + 1) * (r + 1) ≤ n do
        r ← r + 1
    return r
```

This takes $\lfloor\sqrt n\rfloor$ iterations: $\Theta(\sqrt n)$. That is **exponential in the number of bits** of n,
so it is fine for small n and hopeless for a 100-digit n.

**Idea 2 — binary search on the answer** (much better). The answer lies in [1, n]. Keep an interval that must contain
it, test the middle, and halve the interval each time.

```
ALGORITHM IntSqrtBinary(n)
    // Computes ⌊√n⌋ by binary search on the answer
    // Input: A positive integer n
    // Output: The largest integer r with r * r ≤ n
    lo ← 1
    hi ← n
    while lo < hi do
        mid ← (lo + hi + 1) div 2          // round up so the interval always shrinks
        if mid * mid ≤ n then
            lo ← mid
        else
            hi ← mid - 1
    return lo
```

*Invariant:* $lo^2 \le n < (hi + 1)^2$, so the answer is always in [lo, hi]. Each iteration shrinks the interval
by about half, giving $\Theta(\log n)$ iterations.

**Trace (n = 20):**

| lo | hi | mid | mid² | decision |
|---:|---:|----:|-----:|----------|
| 1 | 20 | 11 | 121 | 121 > 20 → hi = 10 |
| 1 | 10 | 6 | 36 | 36 > 20 → hi = 5 |
| 1 | 5 | 3 | 9 | 9 ≤ 20 → lo = 3 |
| 3 | 5 | 4 | 16 | 16 ≤ 20 → lo = 4 |
| 4 | 5 | 5 | 25 | 25 > 20 → hi = 4 |

The loop stops with lo = hi = 4, so $\lfloor\sqrt{20}\rfloor = 4$. ✔ (Both versions were checked against Python's
`math.isqrt` for every n < 20,000.)

**Note — real-valued √n.** Use the same bisection on real numbers: keep $lo^2 \le n \le hi^2$ and stop when
$hi - lo < \varepsilon$. Or use Newton's iteration $x \leftarrow (x + n/x)/2$ (Levitin §12.4), which also uses only
the four operations and converges very fast.

**What the grader looks for:** ✅ only the allowed operations (no `sqrt`) · ✅ a clear stopping rule · ✅ the correct
off-by-one (answer is the last r that *fits*) · ✅ the efficiency stated (bonus: noticing that $\sqrt n$ iterations
is exponential in the input's bit-length).

---

## Problem 2 — Improving `MinDistance` (Levitin Exercise 1.2.9)

**Task in our words.** The book's algorithm finds the smallest distance $|A[i] - A[j]|$ between two elements of an
array by examining **every ordered pair** (i, j) with i ≠ j. It also computes $|A[i] - A[j]|$ twice whenever it
finds a new minimum. Improve it as much as you can.

**Improvement 1 — examine each unordered pair once.** $|A[i] - A[j]| = |A[j] - A[i]|$, so let j start at i + 1.
That also removes the `i ≠ j` test.
**Improvement 2 — compute each distance once** and keep it in a temporary variable.

```
ALGORITHM MinDistance2(A[0..n-1])
    // Minimum distance between two elements, checking each pair once
    // Input: An array A[0..n-1] of n ≥ 2 numbers
    // Output: The smallest |A[i] - A[j]| over i ≠ j
    dmin ← ∞
    for i ← 0 to n - 2 do
        for j ← i + 1 to n - 1 do
            temp ← abs(A[i] - A[j])
            if temp < dmin then
                dmin ← temp
    return dmin
```

The original made $n(n-1)$ distance evaluations (plus $n^2$ `i ≠ j` tests). This version makes exactly
$\binom{n}{2} = n(n-1)/2$, about **half the work**, but it is still $\Theta(n^2)$.

**Improvement 3 — a better algorithm altogether: presort.** After sorting, the closest pair must be **adjacent**:
for $i < j$ in sorted order, $A[j] - A[i] \ge A[i+1] - A[i]$. So one pass over neighbours suffices.

```
ALGORITHM MinDistanceSorted(A[0..n-1])
    // Minimum distance via presorting (transform-and-conquer, Levitin §6.1)
    // Input: An array A[0..n-1] of n ≥ 2 numbers
    // Output: The smallest |A[i] - A[j]| over i ≠ j
    A ← sorted(A)                          // nondecreasing order, e.g. mergesort: Θ(n log n)
    dmin ← ∞
    for i ← 0 to n - 2 do
        if A[i + 1] - A[i] < dmin then
            dmin ← A[i + 1] - A[i]
    return dmin
```

Total: $\Theta(n\log n) + \Theta(n) = \Theta(n\log n)$. (A small extra: you can stop early as soon as `dmin = 0`.)

**Trace:** `34 8 50 13 41 20` → sorted `8 13 20 34 41 50` → gaps 5, 7, 14, 7, 9 → **5**.

**What the grader looks for:** ✅ j starts at i + 1 (each pair once) · ✅ no repeated `abs` computation · ✅ the
presorting idea with the "closest pair is adjacent" justification · ✅ efficiency classes of the versions.

---

## Problem 3 — Comparison counting sort (Levitin Exercise 1.3.1)

**Task in our words.** For every element, count how many elements are smaller than it. That count is exactly its
position in the sorted output. (a) Trace it on 60, 35, 81, 98, 14, 47. (b) Is it stable? (c) Is it in place?

The algorithm (our rendering):

```
ALGORITHM ComparisonCountingSort(A[0..n-1])
    // Sorts by counting, for each element, how many elements are smaller
    // Input: An array A[0..n-1] of orderable values
    // Output: A new array S[0..n-1] with A's elements in nondecreasing order
    Count ← array(n, 0)
    S ← array(n, 0)
    for i ← 0 to n - 2 do
        for j ← i + 1 to n - 1 do
            if A[i] < A[j] then
                Count[j] ← Count[j] + 1
            else
                Count[i] ← Count[i] + 1
    for i ← 0 to n - 1 do
        S[Count[i]] ← A[i]
    return S
```

**(a) Trace.** Each row shows the Count array after the pass with that i (verified in Python):

| | A[0]=60 | A[1]=35 | A[2]=81 | A[3]=98 | A[4]=14 | A[5]=47 |
|---|---:|---:|---:|---:|---:|---:|
| initially | 0 | 0 | 0 | 0 | 0 | 0 |
| after i = 0 | 3 | 0 | 1 | 1 | 0 | 0 |
| after i = 1 | 3 | 1 | 2 | 2 | 0 | 1 |
| after i = 2 | 3 | 1 | 4 | 3 | 0 | 1 |
| after i = 3 | 3 | 1 | 4 | 5 | 0 | 1 |
| after i = 4 (final) | **3** | **1** | **4** | **5** | **0** | **2** |

How to read the first pass: 60 is compared with 35, 81, 98, 14 and 47. It is larger than 35, 14 and 47 (so
Count[0] = 3), and smaller than 81 and 98 (each of those gets +1).

Placing each element at index Count[i]: S[3] = 60, S[1] = 35, S[4] = 81, S[5] = 98, S[0] = 14, S[2] = 47, so

**S = 14, 35, 47, 60, 81, 98.**

**(b) Not stable.** When two elements are equal (`A[i] = A[j]` with i < j), the `else` branch adds 1 to
**Count[i]**. So the **earlier** equal element ends up **after** the later one. Counterexample: $2_a, 2_b$ gives
Count = [1, 0], so S = $2_b, 2_a$. The order of equal keys is reversed.
(Changing `<` to `≤` would make it stable.)

**(c) Not in place.** It uses two extra arrays of size n (Count and S): $\Theta(n)$ extra memory.

*Efficiency:* exactly $n(n-1)/2$ comparisons for every input, so $\Theta(n^2)$.

**What the grader looks for:** ✅ a Count table showing intermediate values, not just the answer · ✅ a
counterexample for stability (not just "no") · ✅ naming the extra arrays for in-place.

---

## Problem 4 — Height of a binary tree (Levitin Exercise 1.4.6)

**Task in our words.** Prove that a binary tree with n ≥ 1 vertices has height h satisfying
$\lfloor\log_2 n\rfloor \le h \le n - 1$. (Height = number of edges on the longest root-to-leaf path. A single
vertex has height 0.)

**Upper bound, $h \le n - 1$.** A longest root-to-leaf path has $h$ edges, so it passes through $h + 1$ distinct
vertices. These are some of the tree's n vertices, so $h + 1 \le n$, which gives $h \le n - 1$.
(Equality holds for a "stick" where every vertex has one child.)

**Lower bound, $\lfloor\log_2 n\rfloor \le h$.** Level ℓ (the vertices at distance ℓ from the root) holds at most
$2^\ell$ vertices, because every vertex has at most 2 children. A tree of height h has levels 0..h, so

$$n \le \sum_{\ell=0}^{h} 2^\ell = 2^{h+1} - 1 < 2^{h+1}.$$

Taking $\log_2$ gives $\log_2 n < h + 1$, so $h > \log_2 n - 1$. Since h is an integer, $h \ge \lfloor\log_2 n\rfloor$.
(Why: $\lfloor\log_2 n\rfloor \le \log_2 n < h + 1$, and the only integers below $h + 1$ are ≤ h.)
Equality holds for a complete binary tree. ∎

**Check:** n = 7, full tree: $\lfloor\log_2 7\rfloor = 2 = h$. ✔ n = 7, stick: h = 6 = n − 1. ✔

**What the grader looks for:** ✅ the per-level count $2^\ell$ · ✅ the geometric sum $2^{h+1} - 1$ · ✅ a careful
integer/floor step (the most common place to lose a point) · ✅ the path argument for the upper bound.

---

## Problem 5 — Size metric, basic operation, input dependence (Levitin Exercise 2.1.1)

**Task in our words.** For six algorithms, give (i) a natural measure of input size, (ii) the basic operation, and
(iii) whether two inputs of the same size can require different numbers of basic operations (that is, whether we
need separate best, worst and average cases).

| Algorithm | (i) input size | (ii) basic operation | (iii) count varies for same size? |
|-----------|----------------|----------------------|-----------------------------------|
| a. sum of n numbers | n | addition | **No**: always n − 1 additions |
| b. computing n! | the magnitude of n, i.e. its number of bits $b = \lfloor\log_2 n\rfloor + 1$ | multiplication | **No**: always n − 1 multiplications for a given n |
| c. largest of n numbers | n | comparison | **No** (standard scan): always n − 1 comparisons |
| d. Euclid's algorithm | magnitude (bits) of the larger number, or of the smaller one, or of both together | modulo division (`m mod n`) | **Yes**: gcd(21, 13) needs 6 divisions, gcd(21, 7) needs 1 |
| e. sieve of Eratosthenes | the magnitude of n (bits) | crossing a number off the candidate list | **No**: the work is determined by n alone |
| f. pencil-and-paper multiplication of two n-digit numbers | n (number of digits) | multiplication of two digits | **No**: always $n^2$ digit products |

*Nuance for (b) and (e):* if you measure size in **bits**, then different values of n with the same bit-length do
different amounts of work. The textbook's answer "no" means that the count depends only on the input value, not on
any other feature of the input.

**What the grader looks for:** ✅ bits as the size for number-theoretic inputs (b, d, e) · ✅ "yes" with a reason
for Euclid · ✅ digit-by-digit multiplication as the basic operation for (f).

---

## Problem 6 — Order of growth of seven functions (Levitin Exercise 2.2.5)

**Task in our words.** Arrange from slowest- to fastest-growing:
$(n-2)!$, $5\lg(n+100)^{10}$, $2^{2n}$, $0.001n^4 + 3n^3 + 1$, $\ln^2 n$, $\sqrt[3]{n}$, $3^n$.

**Step 1 — simplify each one to its class.**
- $5\lg(n+100)^{10} = 50\lg(n+100) \in \Theta(\log n)$ (the exponent comes out of the log, and $+100$ does not matter).
- $\ln^2 n = (\ln n)^2 \in \Theta(\log^2 n)$.
- $\sqrt[3]{n} = n^{1/3}$.
- $0.001n^4 + 3n^3 + 1 \in \Theta(n^4)$ (a polynomial is in the class of its leading term).
- $3^n$.
- $2^{2n} = 4^n$.
- $(n-2)!$.

**Step 2 — compare neighbours with limits.**
- $\log n$ vs. $\log^2 n$: the ratio is $1/\log n \to 0$.
- $\log^2 n$ vs. $n^{1/3}$: $\lim \frac{\ln^2 n}{n^{1/3}} = 0$ (apply L'Hôpital's rule twice; any power of a log
  grows slower than any positive power of n).
- $n^{1/3}$ vs. $n^4$: a smaller power grows slower.
- $n^4$ vs. $3^n$: every polynomial is $o(a^n)$ for $a > 1$.
- $3^n$ vs. $4^n$: $(3/4)^n \to 0$.
- $4^n$ vs. $(n-2)!$: $(n-2)! = \frac{n!}{n(n-1)}$, and by Stirling's formula $n!$ outgrows $4^n \cdot n^2$, so the ratio $\to 0$.

**Answer (lowest to highest):**

$$5\lg(n+100)^{10} \;\prec\; \ln^2 n \;\prec\; \sqrt[3]{n} \;\prec\; 0.001n^4 + 3n^3 + 1 \;\prec\; 3^n \;\prec\; 2^{2n} \;\prec\; (n-2)!$$

**⚠️ Why plugging in numbers can fool you.** Asymptotic order is about *eventually*. $\ln^2 n$ exceeds $\sqrt[3]{n}$
until n is about $2.4\times10^7$, and $50\lg(n+100)$ exceeds $\ln^2 n$ until n is about $10^{31}$ (both computed in
Python). A table of small values would put these in the wrong order. Use limits.

**What the grader looks for:** ✅ recognizing $5\lg(n+100)^{10}$ as $\Theta(\log n)$ and $2^{2n}$ as $4^n$ · ✅ a
reason for each adjacent pair, not just the final list.

---

## Problem 7 — Analyzing `Mystery(n)` (Levitin Exercise 2.3.4)

**Task in our words.** A loop starts with S ← 0 and, for i from 1 to n, adds i·i to S, then returns S.
(a) What does it compute? (b) What is its basic operation? (c) How many times is it executed?
(The textbook also asks (d) the efficiency class and (e) an improvement. They are included as a bonus.)

```
ALGORITHM Mystery(n)
    // Input: A nonnegative integer n
    S ← 0
    for i ← 1 to n do
        S ← S + i * i
    return S
```

**(a)** The sum of the first n squares:
$$S(n) = \sum_{i=1}^{n} i^2 = 1^2 + 2^2 + \dots + n^2 = \frac{n(n+1)(2n+1)}{6}.$$
Trace: n = 4 gives S = 1 → 5 → 14 → 30, and $4\cdot5\cdot9/6 = 30$. ✔

**(b)** Multiplication (`i * i`). Addition is also executed n times; multiplication is the traditional choice
because it is the more expensive operation.

**(c)** Once per iteration: $C(n) = \sum_{i=1}^{n} 1 = n$ times.

**(d, bonus)** $\Theta(n)$ as a function of n. Careful: as a function of the input's **bit-length** b, this is $\Theta(2^b)$.

**(e, bonus)** Use the closed form: `return n * (n + 1) * (2 * n + 1) div 6`. That is 3 multiplications and a division regardless of n, so it is $\Theta(1)$.

**What the grader looks for:** ✅ the closed form (not just "adds squares") · ✅ an explicit summation for the count.

---

## Problem 8 — The recursive algorithm Q(n) (Levitin Exercise 2.4.4)

**Task in our words.** `Q(n)`: if n = 1 return 1; otherwise return `Q(n − 1) + 2 * n − 1`.
(a) Find a recurrence for the values and solve it. (b) Count the multiplications. (c) Count the additions and subtractions.

```
ALGORITHM Q(n)
    // Input: A positive integer n
    if n = 1 then
        return 1
    return Q(n - 1) + 2 * n - 1
```

**(a) Values.** $Q(n) = Q(n-1) + 2n - 1$ for $n > 1$, $Q(1) = 1$. The first values are 1, 4, 9, 16, …, which suggests
$Q(n) = n^2$. *Proof by substitution:* the right-hand side is $(n-1)^2 + 2n - 1 = n^2 - 2n + 1 + 2n - 1 = n^2$ ✔, and
$Q(1) = 1 = 1^2$ ✔. Or by backward substitution:
$Q(n) = Q(n-i) + \sum_{j=n-i+1}^{n}(2j-1)$, and at $i = n-1$ this is $1 + \sum_{j=2}^{n}(2j-1) = n^2$ (the sum of the
first n odd numbers). **Q computes $n^2$.**

**(b) Multiplications.** One per call (`2 * n`):
$M(n) = M(n-1) + 1$, $M(1) = 0$, so $M(n) = M(n-i) + i = M(1) + (n-1) = n - 1$.

**(c) Additions and subtractions.** Each call does three: `n − 1` (the argument), `+`, and `− 1`.
$A(n) = A(n-1) + 3$, $A(1) = 0$, so $A(n) = 3(n-1)$.
(If you don't count the `n − 1` used to form the argument, $A(n) = 2(n-1)$. State your convention.)

**What the grader looks for:** ✅ recurrence **and** initial condition every time · ✅ a verification of the
guessed formula · ✅ a stated counting convention in (c).

---

## Problem 9 (CSC 501) — Locker doors (Levitin Exercise 1.1.12)

**Task in our words.** n lockers start closed. On pass i = 1, …, n you toggle every i-th locker. Which lockers are
open at the end, and how many are there?

**Reasoning.** Locker k is toggled on pass i exactly when i divides k. So its number of toggles equals the
**number of divisors** of k, and it ends open if and only if that number is odd.

Divisors come in pairs $(d, k/d)$: for 12 they are (1, 12), (2, 6), (3, 4). A pair collapses into a single divisor
only when $d = k/d$, that is, when $k = d^2$. So **k has an odd number of divisors exactly when k is a perfect
square.**

**Answer.** The open lockers are 1, 4, 9, 16, …, the perfect squares ≤ n. There are $\lfloor\sqrt n\rfloor$ of them.

**Trace (n = 10):** open lockers are 1, 4, 9. That is 3 = $\lfloor\sqrt{10}\rfloor$. ✔ (Locker 6 has divisors
1, 2, 3, 6, four toggles, so it ends closed.)

**What the grader looks for:** ✅ toggles = number of divisors · ✅ the pairing argument · ✅ the count $\lfloor\sqrt n\rfloor$.

---

## Problem 10 (CSC 501) — Calls to F(1) and F(0) in recursive Fibonacci (Levitin Exercise 2.5.7)

**Task in our words.** The definition-based recursive algorithm computes $F(n) = F(n-1) + F(n-2)$ with $F(0) = 0$,
$F(1) = 1$. Let $C(n)$ and $Z(n)$ be the number of times it evaluates F(1) and F(0) while computing F(n).
Prove (a) $C(n) = F(n)$ and (b) $Z(n) = F(n-1)$.

**Recurrences.** A call on n ≥ 2 makes one call on n − 1 and one on n − 2, so the base cases reached are those
reached by the two sub-calls:

$$C(n) = C(n-1) + C(n-2), \qquad Z(n) = Z(n-1) + Z(n-2) \qquad (n \ge 2),$$

with initial conditions $C(0) = 0, C(1) = 1$ (computing F(1) evaluates F(1) once) and $Z(0) = 1, Z(1) = 0$.

**(a)** C satisfies the Fibonacci recurrence with the Fibonacci initial values 0, 1, so $C(n) = F(n)$ for all n
(strong induction: if it holds for n − 1 and n − 2, then $C(n) = F(n-1) + F(n-2) = F(n)$).

**(b)** Define $F(-1) = 1$, which is consistent with $F(1) = F(0) + F(-1)$. Then the sequence $G(n) = F(n-1)$ has
$G(0) = 1$, $G(1) = 0$ and $G(n) = G(n-1) + G(n-2)$, the same recurrence and initial conditions as Z. By
induction, $Z(n) = F(n-1)$ for all $n \ge 0$. ∎

| n | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|---|--:|--:|--:|--:|--:|--:|--:|
| F(n) | 0 | 1 | 1 | 2 | 3 | 5 | 8 |
| C(n) | 0 | 1 | 1 | 2 | 3 | 5 | 8 |
| Z(n) | 1 | 0 | 1 | 1 | 2 | 3 | 5 |

(Counts produced by instrumenting the recursion in Python for n ≤ 19. They all match.)

**Why it matters:** the total number of leaves is $C(n) + Z(n) = F(n) + F(n-1) = F(n+1)$, which grows like
$\phi^n$ with $\phi \approx 1.618$. The naive recursion is exponential. See the
[Fibonacci simulation](https://normansrule.github.io/algorithm-forge/sims/fibonacci.html).

**What the grader looks for:** ✅ both initial conditions stated correctly (Z(0) = 1, Z(1) = 0 is the common
slip) · ✅ an induction argument, not just a table.

---

⬅️ [Practice home](../README.md) · ➡️ [Assignment 2](assignment-2.md) ·
[Chapter 1 lesson](../../lessons/01-introduction/README.md) · [Chapter 2 lesson](../../lessons/02-analysis-framework/README.md)
