# 🎯 Problem-Solving Strategies — Four Common Kinds of Algorithm-Design Questions

Practice-exam, problem-set and interview questions on the material of Checkpoint A (Levitin Chapters 1–5) tend to
fall into **four common kinds**. This page gives, for each kind: a step-by-step plan, a **fill-in template** to copy onto your paper, and a **worked mini-example**.
It ends with a one-page **recurrence-solving cheat sheet**.

See it applied in full on the [Practice Exam 1 solutions](exams/practice-exam-1.md), then test yourself with
[Practice Exam 2](exams/practice-exam-2.md).

> **The universal answer shape:** Idea (1–2 sentences) → pseudocode with Input/Output comments → why it is correct
> → count the basic operation → tiny trace. Each block is a separate piece of evidence, so never skip a block.

---

## Type ① — "Design an O(n) algorithm" (merge-style scans)

**Recognize it:** "two sorted sequences", "in O(n) time", "without duplicates", "justify the running time".

**Plan:**
1. Ask what sortedness buys you. Almost always it means **equal values are adjacent** and **you can walk two pointers forward and never back up**.
2. Write a loop in which **every iteration advances at least one pointer**. That single sentence is your O(n) proof.
3. Handle the **tails** (one sequence runs out first) and the **duplicates** (compare with the last value output).
4. State an invariant about what the output holds so far.

**Template (copy and fill in — an outline with blanks, not runnable until you fill them):**

```text
ALGORITHM ______(A[0..n-1], B[0..m-1])
    // Input: sorted arrays A and B ______
    // Output: ______
    C ← array(______, 0)
    k ← 0
    i ← 0
    j ← 0
    while ______ do                    // loop while something is left to consume
        if ______ then                 // compare the fronts A[i] and B[j]
            ______                     // consume from A: i ← i + 1
        else if ______ then
            ______                     // consume from B: j ← j + 1
        else
            ______                     // equal fronts: consume one or both
        // output rule: append x only if k = 0 or C[k - 1] ≠ x
    return C[0..k-1]
```

- **Invariant:** "At the top of the loop, `C[0..k-1]` is exactly ______ for the prefixes `A[0..i-1]` and `B[0..j-1]`."
- **Time:** "Each iteration increases i or j by at least 1. They can increase at most n + m times in total, and each
  iteration costs O(1), so the running time is O(n + m) = O(n)."

**Worked mini-example — remove duplicates from ONE sorted array in place, O(n).**

```
ALGORITHM Dedup(A[0..n-1])
    // Input: A sorted array A[0..n-1]
    // Output: k, where A[0..k-1] now holds the distinct values in order
    k ← 0
    for i ← 0 to n - 1 do
        if k = 0 or A[k - 1] ≠ A[i] then
            A[k] ← A[i]
            k ← k + 1
    return k
```

Invariant: `A[0..k-1]` holds the distinct values of the original `A[0..i-1]`. The loop runs n times with O(1) work
each, so the time is Θ(n). Trace: `1 1 2 3 3 3 7` → `1 2 3 7`, k = 4.

---

## Type ② — "Give a recursive AND a non-recursive algorithm, and analyze both"

**Recognize it:** "(a) recursive (decrease-and-conquer) (b) non-recursive", "compare", "justify linear".

**Plan:**
1. Find the **self-reduction**: what smaller instance, plus O(1) work, solves the big one? For example
   S(n) = S(n−1) + n³, or "fix the first element, then recurse on the rest".
2. Recursive version: write the recurrence for the basic-operation count **and its initial condition**, then solve
   it by backward substitution.
3. Non-recursive version: turn the recursion into a loop (or two pointers) and count with a **summation**.
4. Compare: same Θ time? Then say the iterative one wins on **space** (no Θ(n) call stack) and constant factors.

**Template (an outline with blanks to fill in):**

```text
ALGORITHM ______Rec(A[l..r])                 ALGORITHM ______Iter(A[0..n-1])
    // Input: ______  Output: ______             // Input: ______  Output: ______
    if ______ then                               ______ ← ______
        return ______      // base case          for i ← ______ to ______ do
    ______                 // O(1) work              ______
    return ______Rec(A[______])                  return ______
```

- **Recursive analysis:** "Basic operation: ______. $C(n) = C(n - \_\_) + \_\_$ for $n > \_\_$, $C(\_\_) = \_\_$."
  Then the substitution lines, then "$C(n) = \_\_ \in \Theta(\_\_)$".
- **Iterative analysis:** "$C(n) = \sum_{i=\_\_}^{\_\_} \_\_ = \_\_ \in \Theta(\_\_)$."
- **Comparison sentence:** "Both are Θ(____). The iterative version uses Θ(1) extra space instead of Θ(____) stack
  space, and it avoids call overhead."

**Worked mini-example — the largest element.**

```
ALGORITHM MaxRec(A[0..n-1])
    // Output: the largest element
    if n = 1 then
        return A[0]
    m ← MaxRec(A[0..n-2])
    if A[n-1] > m then
        return A[n-1]
    return m

ALGORITHM MaxIter(A[0..n-1])
    // Output: the largest element
    m ← A[0]
    for i ← 1 to n - 1 do
        if A[i] > m then
            m ← A[i]
    return m
```

Recursive: $C(n) = C(n-1) + 1$, $C(1) = 0$, so $C(n) = C(n-i) + i = C(1) + (n-1) = n - 1$.
Iterative: $C(n) = \sum_{i=1}^{n-1} 1 = n - 1$. Both are Θ(n); the recursive version also uses Θ(n) stack space.

---

## Type ③ — "Design an exhaustive-search algorithm and analyze it" (often with a proof first)

**Recognize it:** "generate all …", "exhaustive search", "prove that the sum must be …".

**Plan:**
1. **Proof part first.** These are usually **double counting**: compute one quantity (for example, the grand total
   of all entries) in two ways and set them equal. Magic square: total $= n^2(n^2+1)/2 = n \cdot M$.
2. Name the **candidate space** exactly: all permutations of what? all subsets of what? all n-tuples?
3. Pseudocode: a generator (recursive "try every choice for the next slot") plus a **checker**.
4. Analysis: **(number of candidates) × (cost to generate + check one)**. Write the number as a formula, then give
   concrete values for small n to show how quickly it explodes.
5. Mention **pruning** (check partial solutions early) and **symmetry**, and say that they help in practice but do not
   change the worst-case class.

**Template (an outline: "output", "each choice", "place" and "undo" stand for problem-specific steps):**

```text
ALGORITHM AllSolutions(n)
    // Input: ______   Output: every ______ satisfying ______
    X ← ______                         // a partial candidate (array or matrix)
    Generate(0, X)

ALGORITHM Generate(k, X)
    // slots 0..k-1 of X are filled
    if k = ______ then                 // candidate complete
        if Check(X) then
            output X
        return
    for each choice c for slot k do    // ______ choices
        if c is still allowed then
            place c in slot k
            Generate(k + 1, X)
            undo c
```

- **Count:** "There are ______ candidates (permutations of ______, or subsets of ______). Check costs Θ(____).
  Total: Θ(______ × ______)."
- **Scale sentence:** "For n = ____ that is ____ candidates; at $10^9$ per second this takes ____."

**Worked mini-example — all subsets of n positive numbers that sum to a target t.** Candidate space: the $2^n$
subsets. Generate them by deciding "in or out" for each element (depth-n binary recursion). Check: add up the
chosen elements, Θ(n). Total $\Theta(n\,2^n)$; carrying the running sum down the recursion reduces the check to O(1)
and the total to $\Theta(2^n)$. For n = 30: $2^{30} \approx 1.07\times10^9$ subsets, about a second. For n = 60:
about $1.15\times10^{18}$, decades. Pruning: stop a branch once its sum exceeds t (valid because the numbers are positive).

---

## Type ④ — "Set up the recurrence and solve it by backward substitution"

**Recognize it:** a verbal description ("reduces size n to n/2", "takes log n time to decrease and combine",
"constant time for size 1").

**Plan:**
1. **Translate the words.** "Reduce to ONE instance of size n/b" → $T(n/b)$. "Divide into a instances" →
   $aT(n/b)$. "Decrease + combine cost f(n)" → $+ f(n)$. "Size 1 in constant time" → $T(1) = 1$ (or c).
2. **Substitute $n = b^k$** so that every $n/b^i$ is an integer. Rewrite $f(b^{k-i})$ in terms of k (for example, $\log_2 2^{k-i} = k - i$).
3. Write **at least three substitution lines**, then the **general i-th line**, then set $i = k$.
4. Evaluate the sum (arithmetic, geometric, or $\sum i$), switch back to n with $k = \log_b n$, give the **Θ class**.
5. **Check one small value** against the original recurrence (for example T(2) or T(4)).
6. For general n, cite the **smoothness rule** (Levitin Appendix B).

**Template:**

$$
\begin{aligned}
T(b^k) &= a\,T(b^{k-1}) + f(b^k) \\
       &= a^2\,T(b^{k-2}) + a\,f(b^{k-1}) + f(b^k) \\
       &= a^3\,T(b^{k-3}) + a^2 f(b^{k-2}) + a\,f(b^{k-1}) + f(b^k) \\
       &\;\;\vdots \\
       &= a^i\,T(b^{k-i}) + \sum_{j=0}^{i-1} a^j f(b^{k-j}) \\
       &= a^k\,T(1) + \sum_{j=0}^{k-1} a^j f(b^{k-j}) \qquad (i = k)
\end{aligned}
$$

**Worked mini-example — $T(n) = 2T(n/2) + 1$, $T(1) = 1$.** With $n = 2^k$:
$T(2^k) = 2T(2^{k-1}) + 1 = 4T(2^{k-2}) + 2 + 1 = 8T(2^{k-3}) + 4 + 2 + 1 = \dots = 2^iT(2^{k-i}) + (2^i - 1)$.
At $i = k$: $2^k\cdot1 + 2^k - 1 = 2n - 1 \in \Theta(n)$. Check: $T(2) = 2\cdot1 + 1 = 3 = 2\cdot2 - 1$ ✔.
(This is quiz-bank question Q1.10: `mystery(n)` makes two calls on n/2, so it is O(n), not O(log n).)

---

## 📄 One-page recurrence-solving cheat sheet

**The three methods**

| Method | When | How |
|--------|------|-----|
| Backward substitution | any single-term recurrence; the method to show your work | substitute repeatedly → pattern at step i → hit the initial condition |
| Master Theorem (Levitin §5.1) | $T(n) = aT(n/b) + f(n)$ with $f(n) \in \Theta(n^d)$ | compare $a$ with $b^d$ (below) |
| Characteristic equation (Appendix B) | linear recurrences with constant coefficients, such as Fibonacci | roots of $r^2 = r + 1$ → $\Theta(\phi^n)$ |

**Master Theorem** (Levitin's version), for $a \ge 1$, $b \ge 2$, $d \ge 0$:

$$
T(n) \in \begin{cases}
\Theta(n^d) & \text{if } a < b^d \\
\Theta(n^d \log n) & \text{if } a = b^d \\
\Theta(n^{\log_b a}) & \text{if } a > b^d
\end{cases}
$$

In words: the top level dominates, all levels tie, or the leaves dominate. It gives only the Θ class, so when a derivation is
asked for, use it to **check** a backward-substitution answer, never to replace one when substitution is asked for.

**Recurrences you should recognize on sight** (each exact solution was verified in Python)

| Recurrence | Initial condition | Exact solution | Class | Where it shows up |
|------------|-------------------|----------------|-------|-------------------|
| $T(n) = T(n-1) + c$ | $T(0) = 0$ | $cn$ | $\Theta(n)$ | recursive factorial, max, sum |
| $T(n) = T(n-1) + n$ | $T(1) = 1$ | $n(n+1)/2$ | $\Theta(n^2)$ | selection-style recursion |
| $T(n) = T(n-1) + n$ | $T(1) = 0$ | $n(n+1)/2 - 1$ | $\Theta(n^2)$ | Quiz bank Q1.9 |
| $T(n) = T(n-1) + (n-1)$ | $T(1) = 0$ | $n(n-1)/2$ | $\Theta(n^2)$ | quicksort worst case |
| $T(n) = T(n-1) + \log_2 n$ | $T(1) = 0$ | $\log_2 n!$ | $\Theta(n\log n)$ | building a heap by insertions |
| $T(n) = 2T(n-1) + 1$ | $T(1) = 1$ | $2^n - 1$ | $\Theta(2^n)$ | Tower of Hanoi |
| $T(n) = T(n-1) + T(n-2) + 1$ | $T(0) = T(1) = 1$ | $2F(n+1) - 1$ | $\Theta(\phi^n)$, $\phi \approx 1.618$ | naive Fibonacci calls |
| $T(n) = T(n/2) + 1$ | $T(1) = 1$ | $\log_2 n + 1$ | $\Theta(\log n)$ | binary search |
| $T(n) = T(n/2) + \log_2 n$ | $T(1) = 1$ | $1 + \frac{k(k+1)}{2}$, $k = \log_2 n$ | $\Theta(\log^2 n)$ | Practice Exam 1, Problem B4 |
| $T(n) = T(n/2) + n$ | $T(1) = 1$ | $2n - 1$ | $\Theta(n)$ | halving with a linear scan |
| $T(n) = T(n/3) + n$ | $T(1) = 1$ | $(3n - 1)/2$ | $\Theta(n)$ | Practice Exam 2, Question 4a |
| $T(n) = T(\lceil n/3\rceil) + 1$ | $T(1) = 0$ | $\lceil\log_3 n\rceil$ | $\Theta(\log n)$ | fake coin, three piles |
| $T(n) = 2T(n/2) + 1$ | $T(1) = 1$ | $2n - 1$ | $\Theta(n)$ | tree traversal, quiz bank Q1.10 |
| $T(n) = 2T(n/2) + n$ | $T(1) = 1$ | $n\log_2 n + n$ | $\Theta(n\log n)$ | mergesort |
| $T(n) = 2T(n/2) + n - 1$ | $T(1) = 0$ | $n\log_2 n - n + 1$ | $\Theta(n\log n)$ | quicksort best case, mergesort worst case |
| $T(n) = 3T(n/3) + n$ | $T(1) = 1$ | $n\log_3 n + n$ | $\Theta(n\log n)$ | Practice Exam 2, Question 4b |
| $T(n) = 4T(n/2) + n$ | $T(1) = 1$ | $2n^2 - n$ | $\Theta(n^2)$ | naive divide-and-conquer multiplication |
| $T(n) = 3T(n/2)$ | $T(1) = 1$ | $n^{\log_2 3}$ | $\Theta(n^{1.585})$ | Karatsuba (multiplications) |
| $T(n) = 7T(n/2)$ | $T(1) = 1$ | $n^{\log_2 7}$ | $\Theta(n^{2.807})$ | Strassen (multiplications) |

**Sums you will need**

$$\sum_{i=1}^{n} i = \frac{n(n+1)}{2} \qquad \sum_{i=1}^{n} i^2 = \frac{n(n+1)(2n+1)}{6} \qquad \sum_{i=1}^{n} i^3 = \left(\frac{n(n+1)}{2}\right)^2$$

$$\sum_{i=0}^{k} a^i = \frac{a^{k+1} - 1}{a - 1} \qquad \sum_{i=0}^{k} 2^i = 2^{k+1} - 1 \qquad \sum_{i=1}^{n} \frac1i = H_n \approx \ln n + 0.5772 \qquad \sum_{i=1}^{n}\log i = \log n! \in \Theta(n\log n)$$

**Pitfalls that cost points**
- Forgetting the **initial condition**. The class often survives, but the exact answer does not.
- Mixing up **values** and **operation counts**. Q(n) computes $n^2$ but makes only $n - 1$ multiplications (Problem Set 1, Problem 8).
- Writing $T(n/2)$ when the algorithm makes **two** calls on n/2 ($2T(n/2)$).
- Stopping at "$= \dots$" without the **general i-th line**.
- Claiming $\Theta(\log n)$ for $T(n) = T(n/2) + \log n$. Each level costs a different amount; the sum is $\Theta(\log^2 n)$.
- Measuring number-theoretic input size by **value** instead of **bits** (Problem Set 2, Problem 1).

---

⬅️ [Practice home](README.md) · [Practice Exam 1 solutions](exams/practice-exam-1.md) ·
[Recurrence Lab simulation](https://normansrule.github.io/algorithm-forge/sims/recurrence-lab.html)
