# ∑ Summations and Recurrences Cheat Sheet

> **Use it when** you have turned a loop into a sum or a recursive algorithm into a recurrence and now need a
> closed form. The content matches what Levitin collects in Appendix A (sums) and Appendix B (recurrences), written
> in our own words with our own worked examples.
> Live, printable version: <https://normansrule.github.io/algorithm-forge/cheatsheet.html#sums>

---

## 1. Sum formulas to know by heart

| # | Sum | Closed form | Order |
|---|---|---|---|
| S1 | $\sum_{i=l}^{u} 1$ | $u - l + 1$ | — |
| S2 | $\sum_{i=1}^{n} i = 1 + 2 + \dots + n$ | $\frac{n(n+1)}{2}$ | $\Theta(n^2)$ |
| S3 | $\sum_{i=1}^{n} i^2$ | $\frac{n(n+1)(2n+1)}{6}$ | $\Theta(n^3)$ |
| S4 | $\sum_{i=1}^{n} i^k$ | $\approx \frac{n^{k+1}}{k+1}$ | $\Theta(n^{k+1})$ |
| S5 | $\sum_{i=0}^{n} a^i$ (for $a \ne 1$) | $\frac{a^{n+1} - 1}{a - 1}$ | $\Theta(a^n)$ if $a > 1$ |
| S6 | $\sum_{i=0}^{n} 2^i$ | $2^{n+1} - 1$ | $\Theta(2^n)$ |
| S7 | $\sum_{i=1}^{n} i\,2^i$ | $(n-1)2^{n+1} + 2$ | $\Theta(n 2^n)$ |
| S8 | $\sum_{i=1}^{n} \frac{1}{i}$ (harmonic) | $\approx \ln n + 0.5772$ | $\Theta(\log n)$ |
| S9 | $\sum_{i=1}^{n} \log i = \log n!$ | $\approx n \log n$ | $\Theta(n \log n)$ |
| S10 | $\sum_{i=0}^{n-1} (n - 1 - i)$ | $\frac{n(n-1)}{2}$ | $\Theta(n^2)$ |

Quick checks with $n = 4$: S2 gives $10$, S3 gives $30$, S6 (with $n = 3$) gives $15$, S7 gives $3\cdot32 + 2 = 98$ ✔.

## 2. Manipulation rules

- **Constant factor out:** $\sum c\,a_i = c\sum a_i$
- **Split a sum of terms:** $\sum (a_i \pm b_i) = \sum a_i \pm \sum b_i$
- **Split the range:** $\sum_{i=l}^{u} a_i = \sum_{i=l}^{m} a_i + \sum_{i=m+1}^{u} a_i$ for $l \le m < u$
- **Telescoping:** $\sum_{i=l}^{u} (a_i - a_{i-1}) = a_u - a_{l-1}$
- **Shift the index:** $\sum_{i=1}^{n} a_{i-1} = \sum_{j=0}^{n-1} a_j$ (substitute $j = i - 1$)
- **Bounding instead of solving:** $\sum_{i=1}^{n} f(i) \le n\cdot\max f$; for increasing $f$,
  $\int_{0}^{n} f(x)\,dx \le \sum_{i=1}^{n} f(i) \le \int_{1}^{n+1} f(x)\,dx$

## 3. From loops to sums (non-recursive algorithms)

**Recipe (Levitin §2.3):**

1. Pick the **input size** n.
2. Find the **basic operation** (usually in the innermost loop).
3. Ask whether the count depends only on n, or also on the particular input. If it varies, analyze worst, best
   (and average) cases **separately**.
4. Write the count as a **sum**, one $\sum$ per loop, using the loop's exact bounds.
5. Simplify with the formulas above; state the closed form, then the order of growth.

**Example — "are all elements distinct?" by brute force.**

```
for i ← 0 to n − 2 do
    for j ← i + 1 to n − 1 do
        if A[i] = A[j] then return false
```

Worst case (all distinct, or the only duplicate pair is the last one checked):

$$C_{worst}(n) = \sum_{i=0}^{n-2}\sum_{j=i+1}^{n-1} 1 = \sum_{i=0}^{n-2}(n-1-i) = \frac{(n-1)n}{2} \in \Theta(n^2)$$

## 4. From recursion to recurrences

**Recipe (Levitin §2.4):** size → basic operation → does the count vary by input? → **set up a recurrence with an
initial condition** → solve it (backward substitution, Master Theorem, or characteristic equation) → order of growth.

### 4.1 Backward substitution, step by step

1. Write the recurrence for $n$, then for $n-1$ (or $n/2$), and substitute it back in.
2. Repeat two or three times until you see the pattern after $i$ substitutions.
3. Write that general form with $i$.
4. Choose $i$ so the argument hits the initial condition (for example $i = n - 1$, or $i = k$ when $n = 2^k$).
5. Simplify with the sum formulas, then **check** the result on a small n.

#### Worked example A — Tower of Hanoi: $M(n) = 2M(n-1) + 1$, $M(1) = 1$

$$\begin{aligned} M(n) &= 2M(n-1) + 1 \\ &= 2[2M(n-2) + 1] + 1 = 2^2 M(n-2) + 2 + 1 \\ &= 2^3 M(n-3) + 2^2 + 2 + 1 \\ &= 2^i M(n-i) + 2^{i-1} + \dots + 2 + 1 = 2^i M(n-i) + 2^i - 1 \end{aligned}$$

Set $i = n - 1$: $M(n) = 2^{n-1}\cdot 1 + 2^{n-1} - 1 = 2^n - 1 \in \Theta(2^n)$.
Check: $M(3) = 2\cdot3 + 1 = 7 = 2^3 - 1$ ✔.

#### Worked example B — counting binary digits: $A(n) = A(\lfloor n/2 \rfloor) + 1$, $A(1) = 0$

Solve for $n = 2^k$ (the **smoothness rule** says the order of growth carries over to all n):

$$A(2^k) = A(2^{k-1}) + 1 = A(2^{k-2}) + 2 = \dots = A(2^{k-i}) + i$$

Set $i = k$: $A(2^k) = A(1) + k = k$, so $A(n) = \log_2 n \in \Theta(\log n)$.
(The exact answer for every n is $\lfloor \log_2 n \rfloor$ additions; the bit count is that plus one.)

#### Worked example C — the midterm favorite: $T(n) = T(n/2) + \log_2 n$, $T(1) = 0$

This is **not** covered by the basic Master Theorem, because $f(n) = \log n$ is not of the form $n^d$. Backward
substitution handles it. Let $n = 2^k$, so $\log_2 n = k$:

$$\begin{aligned} T(2^k) &= T(2^{k-1}) + k \\ &= T(2^{k-2}) + (k-1) + k \\ &= T(2^{k-i}) + (k - i + 1) + \dots + (k-1) + k \end{aligned}$$

Set $i = k$: $T(2^k) = T(1) + 1 + 2 + \dots + k = \frac{k(k+1)}{2}$.
Back in terms of n: $T(n) = \frac{\log_2 n\,(\log_2 n + 1)}{2} \in \Theta(\log^2 n)$.
Check: $T(4) = T(2) + 2 = (T(1) + 1) + 2 = 3$ and $\frac{2\cdot3}{2} = 3$ ✔.

#### Worked example D — $x(n) = x(n-1) + n$, $x(0) = 0$

$x(n) = x(n-2) + (n-1) + n = \dots = x(0) + 1 + 2 + \dots + n = \frac{n(n+1)}{2} \in \Theta(n^2)$.

### 4.2 Three general solutions (Levitin Appendix B, restated)

| Recurrence type | Recurrence | Unrolled solution |
|---|---|---|
| Decrease-by-one | $T(n) = T(n-1) + f(n)$ | $T(n) = T(0) + \sum_{j=1}^{n} f(j)$ |
| Decrease-by-a-constant-factor | $T(n) = T(n/b) + f(n)$, $n = b^k$ | $T(b^k) = T(1) + \sum_{j=1}^{k} f(b^j)$ |
| Divide-and-conquer | $T(n) = aT(n/b) + f(n)$, $n = b^k$ | $T(n) = n^{\log_b a}\left[T(1) + \sum_{j=1}^{k} \frac{f(b^j)}{a^j}\right]$ |

Plug $f(n) = \log_2 n$ with $b = 2$ into the second row: $\sum_{j=1}^{k} j = \frac{k(k+1)}{2}$ — example C again.

## 5. The Master Theorem

For $T(n) = a\,T(n/b) + f(n)$ with $a \ge 1$, $b \ge 2$ and $f(n) \in \Theta(n^d)$, $d \ge 0$:

| Case | Condition | Solution | Where the work is |
|---|---|---|---|
| 1 | $a < b^d$ | $T(n) \in \Theta(n^d)$ | at the **root** (the combine step dominates) |
| 2 | $a = b^d$ | $T(n) \in \Theta(n^d \log n)$ | spread **evenly** over $\log_b n$ levels |
| 3 | $a > b^d$ | $T(n) \in \Theta(n^{\log_b a})$ | at the **leaves** (there are $n^{\log_b a}$ of them) |

The same conclusions hold with O and Ω in place of Θ.

**Worked examples**

| Algorithm | Recurrence | a, b, d | Compare $a$ with $b^d$ | Result |
|---|---|---|---|---|
| Binary search | $T(n) = T(n/2) + 1$ | 1, 2, 0 | $1 = 2^0$ | $\Theta(\log n)$ |
| Mergesort | $T(n) = 2T(n/2) + n$ | 2, 2, 1 | $2 = 2^1$ | $\Theta(n \log n)$ |
| Sum of an array by halves | $T(n) = 2T(n/2) + 1$ | 2, 2, 0 | $2 > 2^0$ | $\Theta(n^{\log_2 2}) = \Theta(n)$ |
| Karatsuba multiplication | $T(n) = 3T(n/2) + n$ | 3, 2, 1 | $3 > 2^1$ | $\Theta(n^{\log_2 3}) \approx \Theta(n^{1.585})$ |
| Strassen | $T(n) = 7T(n/2) + n^2$ | 7, 2, 2 | $7 > 2^2$ | $\Theta(n^{\log_2 7}) \approx \Theta(n^{2.807})$ |
| Four half-size products | $T(n) = 4T(n/2) + n^2$ | 4, 2, 2 | $4 = 2^2$ | $\Theta(n^2 \log n)$ |
| Unbalanced combine | $T(n) = 2T(n/2) + n^2$ | 2, 2, 2 | $2 < 2^2$ | $\Theta(n^2)$ |
| Ternary split | $T(n) = 3T(n/3) + n$ | 3, 3, 1 | $3 = 3^1$ | $\Theta(n \log n)$ |

**When it does not apply:** $f(n)$ not polynomial (like $\log n$ in example C), subproblems of unequal size
(like quicksort's worst case $T(n) = T(n-1) + n$), or a subtractive recurrence ($T(n-1)$). Use substitution instead.

### Recursion-tree picture

Draw the calls level by level. Level $i$ has $a^i$ nodes, each doing $f(n/b^i)$ work, and there are $\log_b n$ levels.
Add the levels. If the level sums **shrink** geometrically, the root wins (case 1). If they are **equal**, multiply by
the number of levels (case 2). If they **grow**, the leaves win (case 3).

## 6. Linear recurrences with constant coefficients — the characteristic equation

For the **homogeneous** second-order recurrence

$$a\,x(n) + b\,x(n-1) + c\,x(n-2) = 0$$

write the **characteristic equation** $a r^2 + b r + c = 0$ and find its roots $r_1, r_2$:

| Roots | General solution |
|---|---|
| real and distinct | $x(n) = \alpha r_1^n + \beta r_2^n$ |
| real and equal ($r_1 = r_2 = r$) | $x(n) = \alpha r^n + \beta n r^n$ |
| complex $u \pm iv$ | $x(n) = \gamma^n[\alpha\cos(n\theta) + \beta\sin(n\theta)]$, $\gamma = \sqrt{u^2+v^2}$, $\theta = \arctan(v/u)$ |

Then use the two initial conditions to find $\alpha$ and $\beta$.

**Worked example E — $x(n) = 5x(n-1) - 6x(n-2)$, $x(0) = 1$, $x(1) = 4$.**
Characteristic equation: $r^2 - 5r + 6 = 0$, roots $r_1 = 2$, $r_2 = 3$. So $x(n) = \alpha 2^n + \beta 3^n$.
From $x(0)$: $\alpha + \beta = 1$. From $x(1)$: $2\alpha + 3\beta = 4$. Hence $\beta = 2$, $\alpha = -1$ and
$x(n) = 2\cdot3^n - 2^n$. Check: $x(2) = 5\cdot4 - 6\cdot1 = 14 = 18 - 4$ ✔.

**Worked example F — Fibonacci, $F(n) = F(n-1) + F(n-2)$, $F(0) = 0$, $F(1) = 1$.**
$r^2 - r - 1 = 0$ gives $\phi = \frac{1+\sqrt5}{2} \approx 1.618$ and $\hat\phi = \frac{1-\sqrt5}{2} \approx -0.618$, so
$F(n) = \frac{1}{\sqrt5}\left(\phi^n - \hat\phi^n\right)$ and $F(n) \in \Theta(\phi^n)$. Because $|\hat\phi| < 1$, $F(n)$ is
$\phi^n/\sqrt5$ rounded to the nearest integer.

**Inhomogeneous with a constant:** for $x(n) = r\,x(n-1) + c$ with $r \ne 1$, add the constant particular solution
$p = \frac{c}{1 - r}$. Tower of Hanoi: $M(n) = 2M(n-1) + 1$ gives $p = -1$, so $M(n) = \alpha 2^n - 1$, and $M(1) = 1$
forces $\alpha = 1$: $M(n) = 2^n - 1$, as in example A.

---
⬅️ [Cheat sheet page](https://normansrule.github.io/algorithm-forge/cheatsheet.html) · Lessons: [Chapter 2](../lessons/02-analysis-framework/README.md), [Chapter 5 (Master Theorem)](../lessons/05-divide-and-conquer/README.md)
