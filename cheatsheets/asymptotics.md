# 📈 Asymptotics Cheat Sheet — O, Ω, Θ and the Efficiency Classes

> **Use it when** you need to compare two running times, prove a bound, or say which efficiency class an algorithm
> is in. Everything here follows Levitin Chapter 2 (§2.1–2.2), re-expressed with our own examples.
> Live, printable version: <https://normansrule.github.io/algorithm-forge/cheatsheet.html#asymptotics>

---

## 1. The three notations in one table

Let $t(n)$ be the running time (or basic-operation count) and $g(n)$ a simple comparison function like $n^2$.

| Notation | Read it as | Formal definition (there exist $c > 0$ and $n_0$ such that for all $n \ge n_0$) | Think of it as |
|---|---|---|---|
| $t(n) \in O(g(n))$ | "big-oh": grows **no faster** than $g$ | $t(n) \le c\,g(n)$ | $t \preceq g$ — an **upper** bound |
| $t(n) \in \Omega(g(n))$ | "big-omega": grows **at least as fast** as $g$ | $t(n) \ge c\,g(n)$ | $t \succeq g$ — a **lower** bound |
| $t(n) \in \Theta(g(n))$ | "big-theta": grows **at the same rate** as $g$ | $c_2\,g(n) \le t(n) \le c_1\,g(n)$ | $t \approx g$ — a **tight** bound |

- $\Theta(g) = O(g) \cap \Omega(g)$: to prove Θ, prove both directions.
- The constants $c$, $n_0$ are yours to choose. Any that work are fine; they do not have to be the smallest.
- Only **large n** matters. Nothing is promised for $n < n_0$ (that is why a $\Theta(n^2)$ sort can beat a
  $\Theta(n \log n)$ sort on small arrays).

**Worked proof.** Show $\tfrac{1}{2}n(n-1) \in \Theta(n^2)$.
Upper: $\tfrac12 n(n-1) = \tfrac12 n^2 - \tfrac12 n \le \tfrac12 n^2$ for all $n \ge 0$, so $c_1 = \tfrac12$.
Lower: $\tfrac12 n^2 - \tfrac12 n \ge \tfrac12 n^2 - \tfrac12 n\cdot\tfrac12 n = \tfrac14 n^2$ once $n \ge 2$, so $c_2 = \tfrac14$, $n_0 = 2$. ∎

## 2. Rules you use every day

| Rule | Statement | Example |
|---|---|---|
| Constant factors vanish | $c \cdot t(n) \in \Theta(t(n))$ for any constant $c > 0$ | $5n^2 \in \Theta(n^2)$ |
| Sum rule (the bigger part wins) | If $t_1 \in O(g_1)$ and $t_2 \in O(g_2)$ then $t_1 + t_2 \in O(\max\{g_1, g_2\})$ | sort ($n \log n$) then scan ($n$) ⇒ $O(n \log n)$ |
| Polynomials | $a_k n^k + \dots + a_0 \in \Theta(n^k)$ when $a_k > 0$ | $3n^3 - 100n^2 + 7 \in \Theta(n^3)$ |
| Log base doesn't matter | $\log_a n = \log_b n / \log_b a$, a constant multiple | $\log_2 n \in \Theta(\log_{10} n)$ |
| Transitivity | $f \in O(g)$ and $g \in O(h)$ ⇒ $f \in O(h)$ | $n \in O(n \log n) \subseteq O(n^2)$ |
| Exponent bases **do** matter | $a^n \in o(b^n)$ when $a < b$ | $2^n$ is much smaller than $3^n$ |
| Log of a power | $\log(n^k) = k \log n \in \Theta(\log n)$ | $\log n^{100} \in \Theta(\log n)$ |

## 3. The limit rule — the fastest way to compare two functions

Compute

$$\lim_{n\to\infty} \frac{t(n)}{g(n)}$$

| Limit | Conclusion |
|---|---|
| $0$ | $t$ has a **smaller** order of growth: $t \in O(g)$ but $t \notin \Theta(g)$ |
| a constant $c > 0$ | **same** order: $t \in \Theta(g)$ |
| $\infty$ | $t$ has a **larger** order of growth: $t \in \Omega(g)$ but $t \notin \Theta(g)$ |

(If the limit does not exist, fall back on the definitions. That almost never happens with algorithm running times.)

### L'Hôpital's rule

If $t(n) \to \infty$ and $g(n) \to \infty$ and the derivatives exist, then

$$\lim_{n\to\infty} \frac{t(n)}{g(n)} = \lim_{n\to\infty} \frac{t'(n)}{g'(n)}$$

**Example — $\log_2 n$ vs. $\sqrt{n}$.** Derivatives: $(\log_2 n)' = \frac{1}{n \ln 2}$ and $(\sqrt n)' = \frac{1}{2\sqrt n}$.
Ratio: $\frac{2\sqrt n}{n \ln 2} = \frac{2}{\ln 2 \cdot \sqrt n} \to 0$. So **every logarithm grows slower than every square root**
(in fact slower than $n^\varepsilon$ for any $\varepsilon > 0$).

### Stirling's formula

$$n! \approx \sqrt{2\pi n}\,\left(\frac{n}{e}\right)^n$$

Two consequences you will use:

- $\log_2 n! \in \Theta(n \log n)$ — this is why no comparison sort can beat $n \log n$ (Chapter 11).
- $n!$ grows faster than $a^n$ for every fixed $a$: $\lim \frac{n!}{2^n} = \infty$.

**Example.** Compare $n!$ with $2^n$ using Stirling:
$\frac{n!}{2^n} \approx \sqrt{2\pi n}\left(\frac{n}{2e}\right)^n \to \infty$ because $\frac{n}{2e} > 1$ once $n > 5$. ∎

## 4. Handy identities

- $a^{\log_b n} = n^{\log_b a}$ (turns the Master Theorem's $a^{\log_b n}$ leaves into a power of n)
- $\log_b(xy) = \log_b x + \log_b y$, $\;\log_b(x/y) = \log_b x - \log_b y$, $\;\log_b x^k = k\log_b x$
- $2^{\log_2 n} = n$, and the number of bits of $n$ is $\lfloor \log_2 n \rfloor + 1$
- $\lfloor x \rfloor \le x < \lfloor x \rfloor + 1$ and $\lceil x \rceil - 1 < x \le \lceil x \rceil$
- Harmonic numbers: $1 + \frac12 + \dots + \frac1n = H_n \approx \ln n + 0.5772$

## 5. The basic efficiency classes

Values below are rounded; "fits in about 1 second" assumes about $10^8$ simple operations per second.

| Class | Name | $n = 10$ | $n = 10^3$ | $n = 10^6$ | Largest n in about 1 s | Typical algorithms |
|---|---|---|---|---|---|---|
| $1$ | constant | 1 | 1 | 1 | any | array access, push/pop, hash lookup (expected) |
| $\log n$ | logarithmic | 3.3 | 10 | 20 | any | binary search, balanced-tree operations, exponentiation by squaring |
| $n$ | linear | 10 | $10^3$ | $10^6$ | $\sim 10^8$ | sequential search, maximum element, counting sort (small range) |
| $n \log n$ | linearithmic | 33 | $10^4$ | $2\cdot10^7$ | $\sim 5\cdot10^6$ | mergesort, heapsort, quicksort (average), closest pair (divide-and-conquer) |
| $n^2$ | quadratic | $10^2$ | $10^6$ | $10^{12}$ | $\sim 10^4$ | selection, bubble and insertion sort; all pairs; element uniqueness by brute force |
| $n^3$ | cubic | $10^3$ | $10^9$ | $10^{18}$ | $\sim 500$ | definition-based matrix multiplication, Floyd, Warshall, Gaussian elimination |
| $2^n$ | exponential | $10^3$ | $10^{301}$ | — | $\sim 26$ | all subsets: knapsack by exhaustive search, subset-sum, Tower of Hanoi moves |
| $n!$ | factorial | $3.6\cdot10^6$ | — | — | $\sim 11$ | all permutations: Traveling Salesman Problem (TSP) by exhaustive search, assignment by exhaustive search |

**Order from slowest-growing to fastest:**
$1 < \log n < \sqrt n < n < n \log n < n^2 < n^3 < 2^n < n! < n^n$

## 6. Common traps

1. **Big-O is not "the worst case."** O/Ω/Θ describe functions. You can give a Θ bound for the best case, the worst
   case or the average case separately.
2. **"O(n²)" is not a promise of slowness.** $n \in O(n^2)$ is true — just not tight. Use Θ when you mean "exactly this rate".
3. **Input size is the size, not the value.** For a number $n$, the size is $b = \lfloor\log_2 n\rfloor + 1$ bits,
   so a loop running $n$ times is *exponential* in $b$.
4. **Drop constants only at the end.** When you count operations, keep the exact sum; simplify to Θ last.
5. **Don't compare exponents of different bases by eye:** $4^n = (2^n)^2$ is *not* $\Theta(2^n)$.

---
⬅️ [Cheat sheet page](https://normansrule.github.io/algorithm-forge/cheatsheet.html) · Lesson: [Chapter 2 · Analysis Framework](../lessons/02-analysis-framework/README.md)
