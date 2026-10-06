# 🧠 Quiz Bank — Chapters 1–12

Two parts:

- **Part 1 — 19 core questions, organized by topic.** The essentials of Levitin Chapters 1–4: what an algorithm
  is, how efficiency is measured, orders of growth, recurrences, brute force, graph traversal and
  decrease-and-conquer. Several are classic trick questions, so read the explanations even when you are right.
- **Part 2 — 58 new practice questions** in the same style, covering Levitin Chapters 1–12.

**How to use it:** answer on paper *before* opening a `<details>` block. Every explanation says **why the right
answer is right** and **why each distractor is wrong**. If you got a question right for the wrong reason, count it
as wrong. For a timed, auto-graded version, use the Arena: <https://normansrule.github.io/algorithm-forge/arena/>.

**Acronyms used on this page:** Depth-First Search (DFS), Breadth-First Search (BFS), Directed Acyclic Graph (DAG),
Traveling Salesman Problem (TSP), Minimum Spanning Tree (MST), Binary Search Tree (BST), Binary Reflected Gray Code
(BRGC), Dynamic Programming (DP), Nondeterministic Polynomial time (NP), deterministic Polynomial time (P).

---

## Contents

- [Part 1 — Core questions by topic](#part-1--core-questions-by-topic)
  - [1.1 Algorithms and programs](#11-algorithms-and-programs)
  - [1.2 Analysis framework and cost measures](#12-analysis-framework-and-cost-measures)
  - [1.3 Amortized analysis](#13-amortized-analysis)
  - [1.4 Orders of growth](#14-orders-of-growth)
  - [1.5 Recurrences](#15-recurrences)
  - [1.6 Brute force and exhaustive search](#16-brute-force-and-exhaustive-search)
  - [1.7 Graph traversal](#17-graph-traversal)
  - [1.8 Decrease-and-conquer](#18-decrease-and-conquer)
- [Part 2 — New practice questions, Chapters 1–12](#part-2--new-practice-questions-chapters-112)

---

# Part 1 — Core questions by topic

## 1.1 Algorithms and programs

**Q1.1.** Which formula describes what a program is made of?

- a) Program = Algorithm + Hardware
- b) Program = Algorithm + Data Structure
- c) Algorithm = Program + Data
- d) Program = Code + Compiler

<details><summary>Answer and explanation</summary>

**Answer: b) Program = Algorithm + Data Structure.**

**Why:** a program is a method (the algorithm) working on data organized in a particular way (the data structure).
The phrase comes from Niklaus Wirth's classic book *Algorithms + Data Structures = Programs* (1976), which Levitin
cites. The choice of data structure can change an algorithm's efficiency completely: the same graph algorithm runs
in Θ(|V|²) on an adjacency matrix and Θ(|V| + |E|) on adjacency lists.

**Why not the others:** a) Hardware runs the program but is not part of it; the same program runs on many machines.
c) This reverses the relationship: an algorithm is more abstract than a program, not built from one. d) Code and a
compiler are how a program is *expressed and translated*, not what it is conceptually made of.
</details>

## 1.2 Analysis framework and cost measures

**Q1.2.** What are the two main approaches to analyzing an algorithm's efficiency?

- a) Best case and worst case
- b) Theoretical (mathematical) and empirical (experimental)
- c) Time and space
- d) Recursive and non-recursive

<details><summary>Answer and explanation</summary>

**Answer: b) Theoretical and empirical.**

**Why:** theoretical analysis counts the basic operation as a function of input size using mathematics (sums,
recurrences). Empirical analysis runs the algorithm on sample inputs and measures counts or time
(Levitin §2.1 and §2.6; see our [empirical-analysis lab](../empirical-analysis-lab/README.md)).

**Why not the others:** a) Best and worst case are *which inputs* you analyze, within either approach. c) Time and
space are *what resource* you measure, also within either approach. d) Recursive and non-recursive describe *how the
algorithm is written*; each kind can be analyzed both ways.
</details>

**Q1.3.** True or False: "Counting the number of basic operations is different from finding the running time."

- a) True
- b) False

<details><summary>Answer and explanation</summary>

**Answer: a) True.**

**Why:** the count $C(n)$ is a machine-independent number. It is the same on a phone and on a supercomputer. The
running time is roughly $T(n) \approx c_{op}\cdot C(n)$, where $c_{op}$ is the time one basic operation takes on a
particular machine, language and compiler. Counting gives you the *order of growth* (and ratios like "doubling n
quadruples the time"). It does not give seconds. In our lab, the comparison count had constant 0.250 in both Java and
Python, while the time per comparison was about 0.2 ns in Java and about 45 ns in Python.

**Why "False" is tempting but wrong:** the count and the time are *related* (proportional, as an approximation), but
they are not the same thing. The count ignores the other operations, memory effects and the machine constant.
</details>

**Q1.4.** Space complexity of an algorithm is best described as…

- a) the size of the source code
- b) the amount of memory the algorithm uses, as a function of the input size
- c) the number of variables declared in the program
- d) the maximum input size that fits in memory

<details><summary>Answer and explanation</summary>

**Answer: b).**

**Why:** like time complexity, space complexity is a *function of n*. Usually we count the extra memory beyond the
input: for example, Θ(1) for insertion sort, Θ(n) for mergesort's buffer, and Θ(n) call-stack space for a
depth-n recursion.

**Why not the others:** a) Code length is a constant, independent of n. c) The count of variable names misses arrays
whose size depends on n, and it misses recursion depth. d) That is a property of the machine, not of the algorithm.
</details>

**Q1.5.** What is the space complexity of the recursive factorial algorithm `F(n) = F(n − 1) · n`, `F(0) = 1`?

- a) O(1)
- b) O(log n)
- c) O(n)
- d) O(n²)

<details><summary>Answer and explanation</summary>

**Answer: c) O(n).**

**Why:** each call waits for the call on n − 1 before it can multiply, so at the deepest point there are n + 1
activation records on the call stack (for n, n − 1, …, 0), each of constant size. That is Θ(n) space. (We treat each
number as taking constant space, as Levitin does.)

**Why not the others:** a) O(1) is the *iterative* loop's space, or a tail-call-optimized version, which basic
recursive factorial is not. b) O(log n) would need the size to *halve* at each call, as in binary search. d) Nothing
here is quadratic.
</details>

## 1.3 Amortized analysis

**Q1.6.** Which statements about amortized analysis are true?
I. It analyzes the running time of a *sequence* of operations performed on a data structure.
II. It focuses on the cost of *each individual* operation.
III. It finds the average running time per operation over the sequence.

- a) I only
- b) I and II
- c) I and III
- d) I, II and III

<details><summary>Answer and explanation</summary>

**Answer: c) I and III.**

**Why:** amortized analysis bounds the **total** cost of any sequence of m operations, then divides by m. That gives
an *average cost per operation over the sequence*, guaranteed even in the worst case (Levitin §1.4 and §9.2 mention
it with union–find; Tarjan formalized it). Classic example: appending to a dynamic array that doubles when full.
One append can cost Θ(n) (the copy), but any n appends cost O(n) in total, so each append costs O(1) amortized.

**Why not the others:** II is false, and that is the whole point. Amortized analysis deliberately does *not* bound
each operation individually; some operations may be expensive, as long as they are rare. So b) and d) are wrong.
a) misses III, the per-operation average that the analysis produces.

**Careful:** "average" here is **not** average-case analysis. No probability is involved. It is the worst-case
total divided by the number of operations.
</details>

## 1.4 Orders of growth

**Q1.7.** Order these from highest to lowest order of growth: (a) $2^n$, (b) $n!$, (c) $n^{100}$.

- a) a > b > c
- b) b > a > c
- c) c > b > a
- d) b > c > a

<details><summary>Answer and explanation</summary>

**Answer: b) $n! > 2^n > n^{100}$.**

**Why:** factorial beats every exponential. $n! = 1\cdot2\cdots n$ has about n factors larger than 2, and by
Stirling's formula $n!/2^n \to \infty$. Every exponential $a^n$ with $a > 1$ beats every polynomial:
$\lim n^{100}/2^n = 0$.

**Why not the others:** a) and d) put a polynomial or an exponential above $n!$. c) puts $n^{100}$ on top.
**Trap:** for "small" n, $n^{100}$ really is bigger than $2^n$. The crossover is at n = 997 (computed in Python).
Order of growth is about the limit, not about small n.
</details>

**Q1.8.** True or False: "An algorithm with a lower big-O class is always faster than one with a higher class, for all input sizes."

- a) True
- b) False

<details><summary>Answer and explanation</summary>

**Answer: b) False.**

**Why:** big-O hides constant factors and lower-order terms, and it only describes behaviour for *sufficiently
large* n. For example, $1000n$ is O(n) and $n^2$ is O(n²), yet $n^2 < 1000n$ for all n < 1000. In practice, insertion
sort (Θ(n²)) beats mergesort (Θ(n log n)) on small arrays, which is why library sorts switch to insertion sort for
small pieces.

**Why "True" is wrong:** the definition of $t(n) \in O(g(n))$ only requires $t(n) \le c\,g(n)$ for all $n \ge n_0$.
Nothing is promised below $n_0$.
</details>

## 1.5 Recurrences

**Q1.9.** Solve $T(n) = T(n-1) + n$ for $n > 1$, $T(1) = 0$.

- a) $n(n+1)/2$
- b) $n(n+1)/2 - 1$
- c) $n(n-1)/2$
- d) $n^2$

<details><summary>Answer and explanation</summary>

**Answer: b) $n(n+1)/2 - 1$.**

**Why (backward substitution):**
$T(n) = T(n-1) + n = T(n-2) + (n-1) + n = \dots = T(1) + 2 + 3 + \dots + n = 0 + \left(\frac{n(n+1)}{2} - 1\right)$.
Check: $T(2) = T(1) + 2 = 2$, and $2\cdot3/2 - 1 = 2$ ✔.

**Why not the others:** a) would need $T(1) = 1$; it ignores that the sum starts at 2. c) is the solution of
$T(n) = T(n-1) + (n-1)$. d) is the right order (Θ(n²)) but not the exact value. It is the answer to a different
problem (Q(n) in Problem Set 1).
</details>

**Q1.10.** What is the time complexity of this function?
```
ALGORITHM Mystery(n)
    if n ≤ 1 then
        return 1
    return Mystery(n div 2) + Mystery(n div 2)
```

- a) O(log n)
- b) O(n)
- c) O(n log n)
- d) O(n²)

<details><summary>Answer and explanation</summary>

**Answer: b) O(n).**

**Why:** there are **two** calls on n/2 plus constant work: $T(n) = 2T(n/2) + 1$, $T(1) = 1$. Backward substitution
gives $T(n) = 2n - 1$ for $n = 2^k$ (in Python, n = 1024 makes 2047 calls). The recursion tree has $\log_2 n$ levels,
and level i has $2^i$ calls, so the leaves alone number n.

**Why not the others:** a) O(log n) would be right if the function made **one** call, or reused the result:
`h ← Mystery(n div 2); return h + h`. That is the classic mistake here. c) needs Θ(n) work per level, but each call
does O(1). d) Nothing is quadratic.
</details>

## 1.6 Brute force and exhaustive search

**Q1.11.** Brute-force computation of $a^n$ multiplies a by itself repeatedly. Let b be the number of bits of n. Which are true?
I. $M(n) = n$ (the number of multiplications is linear in n).
II. $M(b) \approx 2^b$ (as a function of the input size in bits, it is exponential).
III. The algorithm is polynomial in the size of its input.

- a) I only
- b) I and II
- c) II and III
- d) I, II and III

<details><summary>Answer and explanation</summary>

**Answer: b) I and II.**

**Why:** the loop multiplies n times (n − 1 if it starts from a instead of 1), so I holds. Since
$2^{b-1} \le n < 2^b$, that count is $\Theta(2^b)$, so II holds. (Levitin Exercise 3.1.2; see Problem Set 2, Problem 1.)

**Why not III:** the input *size* of a number is b bits, and the work is exponential in b. "Linear in n" sounds
polynomial, but n is the *value* of the input, not its size. This distinction is exactly why factoring by trial
division is not a polynomial-time algorithm.
</details>

**Q1.12.** True or False: "Exhaustive search for the knapsack problem is O(2ⁿ), and exhaustive search for the assignment problem is O(n!)."

- a) True
- b) False

<details><summary>Answer and explanation</summary>

**Answer: a) True.**

**Why:** knapsack chooses a **subset** of n items, and there are $2^n$ subsets. Assignment chooses which job each of
n people gets, which is a **permutation**, and there are $n!$ of them (Levitin §3.4). (Counting the cost of evaluating each
candidate gives $\Theta(n2^n)$ and $\Theta(n\cdot n!)$ respectively. The dominant factors are the ones stated.)

**Why "False" is tempting:** mixing up the two candidate spaces (subsets vs. permutations) is the usual slip.
</details>

**Q1.13.** What is the time efficiency of the brute-force closest-pair algorithm for n points in k-dimensional space?

- a) O(n²)
- b) O(k·n)
- c) O(k·n²)
- d) O(n^k)

<details><summary>Answer and explanation</summary>

**Answer: c) O(k·n²).**

**Why:** there are $n(n-1)/2$ pairs, and computing one squared Euclidean distance in k dimensions takes k
subtractions, k squarings and k − 1 additions, so Θ(k) per pair. Total: $\Theta(k n^2)$. (Compare squared distances
and skip the square root, Levitin §3.3.)

**Why not the others:** a) treats k as a constant; that is fine if the question fixes k, but here k is a parameter.
b) forgets that *pairs* are examined, not points. d) confuses the dimension with the number of nested loops; the
brute force always has two loops over points, whatever k is.
</details>

## 1.7 Graph traversal

**Q1.14.** For a given undirected graph, consider two claims about Depth-First Search (DFS) forests.
A. All DFS forests of the graph (for any starting vertex and any neighbour order) have the same number of trees.
B. All DFS forests of the graph have the same number of tree edges and the same number of back edges.

- a) A only
- b) B only
- c) Both A and B
- d) Neither

<details><summary>Answer and explanation</summary>

**Answer: c) Both are true.**

**Why A:** DFS started at a vertex visits exactly that vertex's connected component before it has to restart. So
the number of trees always equals **c, the number of connected components**, whatever the starting points and
neighbour orders.

**Why B:** a tree with $n_i$ vertices has $n_i - 1$ edges, so a forest on all n vertices with c trees has
**$n - c$ tree edges**. In an undirected graph every edge is classified as a tree edge or a back edge (there are no
cross edges in an undirected DFS), so there are **$m - (n - c)$ back edges**. Both numbers depend only on n, m and c,
not on the traversal. (Checked in Python on 200 random graphs with 10 random DFS orders each.)

**Why not the others:** *which* edges are tree edges changes with the order, but *how many* does not, and neither
does the number of trees. Answers a), b) and d) each reject a claim that is true.
</details>

## 1.8 Decrease-and-conquer

**Q1.15.** The source-removal algorithm for topological sorting runs on a digraph with n vertices and m edges stored as an **adjacency matrix**. Its time efficiency is…

- a) O(n + m)
- b) O(n² + m)
- c) O(n log n + m)
- d) O(n³)

<details><summary>Answer and explanation</summary>

**Answer: b) O(n² + m).**

**Why:** with a matrix, computing all in-degrees means scanning every column, which is Θ(n²). Removing a source means
scanning its row (Θ(n)) to decrement its successors' in-degrees; over n removals that is Θ(n²) again. Keeping the
current sources in a queue avoids searching for them. The m edge updates are included in those scans, so the total is
Θ(n²). Writing it as O(n² + m) is equivalent, because $m \le n^2$.

**Why not the others:** a) O(n + m) is the running time with **adjacency lists** (Levitin Exercise 4.2.7). With a
matrix, just reading the structure costs n². c) There is no sorting or log factor anywhere. d) This is what a naive
version costs if it searches the whole matrix again for a new source after every removal: n searches × Θ(n²).
</details>

**Q1.16.** A decrease-and-conquer (decrease-by-one) algorithm generates the power set of an n-element set. Its time efficiency is…

- a) O(n)
- b) O(n²)
- c) O(2ⁿ)
- d) O(n!)

<details><summary>Answer and explanation</summary>

**Answer: c) O(2ⁿ).**

**Why:** the algorithm builds the power set of n − 1 elements, then copies it and adds the n-th element to every
copy. The number of subsets doubles each step: $P(n) = 2P(n-1)$, $P(0) = 1$, so $P(n) = 2^n$. Counting one step per
subset generated (Levitin's convention in §4.3) gives $\Theta(2^n)$. No algorithm can do better, because the output
itself has $2^n$ subsets. (If you count every element copied, it is $\Theta(n2^n)$. Either way, the class of choices
here is exponential.)

**Why not the others:** a) and b) are smaller than the output. d) $n!$ counts **permutations**, not subsets.
</details>

**Q1.17.** True or False: "Insertion sort implemented on a linked list is also O(n²)."

- a) True
- b) False

<details><summary>Answer and explanation</summary>

**Answer: a) True.**

**Why:** on a singly linked list you cannot walk backwards, so each new element is inserted by scanning the sorted
part **from its front** until the right spot is found. Linking it in is then O(1) (no shifting needed), but the
scan is still up to i comparisons for the i-th element. That gives $\sum i = \Theta(n^2)$ in the worst and average
cases (Levitin Exercise 4.1.9).

**Why "False" is tempting:** "linked lists make insertion O(1)" is true for the *link* step, but the *search* for the
insertion point dominates.
</details>

**Q1.18.** Which algorithm is the classic example of decrease-and-conquer (decrease by a constant factor)?

- a) Mergesort
- b) Binary search
- c) Selection sort
- d) Heapsort

<details><summary>Answer and explanation</summary>

**Answer: b) Binary search.**

**Why:** each comparison discards half of the array and solves **one** smaller instance of the same problem. That
is decrease-by-a-constant-factor (factor 2), with $C_w(n) = C_w(\lfloor n/2\rfloor) + 1$, which gives
$\lfloor\log_2 n\rfloor + 1$ (Levitin §4.4).

**Why not the others:** a) Mergesort solves **two** subproblems and combines them: divide-and-conquer.
c) Selection sort is the textbook's *brute-force* example (though see Q1.19 for how it can also be viewed).
d) Heapsort is transform-and-conquer (it transforms the array into a heap first).
</details>

**Q1.19.** Which statements are true?
A. Insertion sort is a decrease-and-conquer algorithm (loosely described as "recursively breaking down" the problem).
B. Euclid's algorithm for the gcd is a decrease-and-conquer algorithm.
C. Selection sort can be viewed as a decrease-and-conquer algorithm.

- a) A only
- b) A and B
- c) B and C
- d) A, B and C

<details><summary>Answer and explanation</summary>

**Answer: d) A, B and C.**

**Why each is true, in Levitin's framework:**
- **A. Insertion sort = decrease-by-one.** To sort `A[0..n-1]`, sort `A[0..n-2]` (a smaller instance), then insert
  `A[n-1]` into place (§4.1). The iterative version is the same idea written bottom-up. *Note:* "recursively
  breaking down" is loose wording. It sounds like divide-and-conquer, but the intended meaning is "reduce to a
  smaller instance".
- **B. Euclid = variable-size decrease.** $\gcd(m, n) = \gcd(n, m \bmod n)$ replaces the instance with a smaller one,
  and by how much it shrinks varies from step to step (§4.5).
- **C. Selection sort viewed as decrease-by-one.** Each pass puts the minimum of the unsorted part in its final
  place, which leaves an unsorted part one element smaller. That is the same problem on size n − 1. Levitin
  *presents* selection sort as brute force (§3.1), but the decrease-by-one reading is legitimate, and it is the
  view this question is testing.

**Why not the others:** each of a), b), c) leaves out a statement that holds under the decrease-and-conquer view.
</details>

---

# Part 2 — New practice questions, Chapters 1–12

Written for Algorithm Forge. Every numeric answer was checked in Python.

## Chapter 1 — Introduction

**N1.** How many modulo divisions does Euclid's algorithm make to compute gcd(60, 24)?

- a) 1
- b) 2
- c) 3
- d) 4

<details><summary>Answer and explanation</summary>

**Answer: b) 2.** 60 mod 24 = 12, then 24 mod 12 = 0, so the gcd is 12.
**Why not the others:** a) stops before the remainder reaches 0. c) and d) count extra steps, such as the final
"n = 0" test, which is a comparison, not a division.
</details>

**N2.** You call `gcd(24, 60)` with the smaller number first. What does the first iteration of Euclid's algorithm do?

- a) It fails; Euclid needs m ≥ n
- b) It swaps the two numbers, because 24 mod 60 = 24
- c) It computes 60 mod 24 directly
- d) It returns 24

<details><summary>Answer and explanation</summary>

**Answer: b).** `gcd(24, 60) = gcd(60, 24 mod 60) = gcd(60, 24)`. This happens at most once (Levitin Exercise 1.1.8).
**Why not the others:** a) The algorithm is correct for any order. c) It gets there, but only after the swap
iteration. d) 24 is not even the gcd (it is 12).
</details>

**N3.** A sorting algorithm is **stable** if…

- a) it never uses extra memory
- b) its running time does not depend on the input order
- c) it preserves the relative order of elements with equal keys
- d) it always makes the same number of comparisons

<details><summary>Answer and explanation</summary>

**Answer: c).** Example: sort employees by department. A stable sort keeps employees who are in the same department in their
earlier (say, alphabetical) order.
**Why not the others:** a) describes an *in-place* algorithm. b) and d) describe input-insensitive algorithms, like
selection sort, which is **not** stable.
</details>

**N4.** Which data structure best fits "serve customers in the order of their priorities"?

- a) Stack
- b) Queue
- c) Priority queue (for example, a heap)
- d) Singly linked list

<details><summary>Answer and explanation</summary>

**Answer: c).** It supports "find/delete the highest priority" and "insert" in O(log n) each when implemented as a heap.
**Why not the others:** a) A stack serves the most recent first (Last-In-First-Out). b) A queue serves in arrival
order (First-In-First-Out), ignoring priority. d) An unsorted list needs Θ(n) to find the maximum.
</details>

## Chapter 2 — Analysis framework

**N5.** In a successful sequential search where the key is equally likely to be in any of the n positions, the average number of comparisons is…

- a) n
- b) n/2
- c) (n + 1)/2
- d) log₂ n

<details><summary>Answer and explanation</summary>

**Answer: c).** $\frac{1}{n}(1 + 2 + \dots + n) = \frac{n+1}{2}$.
**Why not the others:** a) is the worst case. b) is close but not exact. d) is binary search, which needs a sorted array.
</details>

**N6.** Which statement is **false**?

- a) $n(n+1)/2 \in O(n^3)$
- b) $n(n+1)/2 \in O(n^2)$
- c) $n(n+1)/2 \in \Theta(n^2)$
- d) $n(n+1)/2 \in \Omega(n^3)$

<details><summary>Answer and explanation</summary>

**Answer: d).** Ω(n³) would require the function to grow at least as fast as n³, but $\frac{n(n+1)/2}{n^3} \to 0$.
**Why the others are true:** O is an upper bound, so a) (a loose one) and b) (a tight one) both hold. c) holds because
the function is squeezed between $n^2/2$ and $n^2$.
</details>

**N7.** How many bits are in the binary representation of n = 100?

- a) 6
- b) 7
- c) 8
- d) 100

<details><summary>Answer and explanation</summary>

**Answer: b) 7.** The formula is $\lfloor\log_2 n\rfloor + 1 = 6 + 1$, and indeed $100 = 1100100_2$.
**Why not the others:** a) forgets the +1. c) is a byte, not the minimal length. d) confuses the value with the size.
</details>

**N8.** How many moves does the recursive Tower of Hanoi make with 10 disks?

- a) 100
- b) 512
- c) 1023
- d) 1024

<details><summary>Answer and explanation</summary>

**Answer: c) 1023.** $M(n) = 2M(n-1) + 1$, $M(1) = 1$, so $M(n) = 2^n - 1$.
**Why not the others:** d) forgets the −1. b) $2^{n-1} = 512$ is how many times the **smallest** disk moves, not the total. a) is not related.
</details>

**N9.** The definition-based algorithm multiplies two n × n matrices. How many scalar multiplications does it make?

- a) n²
- b) n³
- c) 2n³
- d) n^2.807

<details><summary>Answer and explanation</summary>

**Answer: b) n³.** Each of the n² entries of the product is a dot product of length n.
**Why not the others:** a) counts entries, not the work per entry. c) counts multiplications *and* additions
(about $n^3$ of each). d) is Strassen's algorithm (Chapter 5).
</details>

**N10.** Your empirical data looks roughly like $C(n) = a n^b$. Which plot lets you read off b directly?

- a) C(n) against n on linear axes
- b) log C(n) against log n; b is the slope of the line
- c) C(n)/n against n
- d) A histogram of C(n)

<details><summary>Answer and explanation</summary>

**Answer: b).** $\log C = \log a + b\log n$ is a straight line with slope b. In our lab, the slope was 1.998 for insertion-sort comparisons.
**Why not the others:** a) shows curvature but cannot tell $n^2$ from $n^{2.2}$. c) is a ratio test for b = 1 only.
d) throws away the dependence on n.
</details>

## Chapter 3 — Brute force and exhaustive search

**N11.** How many key comparisons does selection sort make on an **already sorted** array of n elements?

- a) 0
- b) n − 1
- c) n(n − 1)/2
- d) n²

<details><summary>Answer and explanation</summary>

**Answer: c).** Selection sort always scans the whole unsorted part, whatever the input, so it makes
$\sum_{i=0}^{n-2}(n-1-i) = n(n-1)/2$ comparisons for every input. (It does make at most n − 1 swaps.)
**Why not the others:** b) is insertion sort's best case (N19). a) and d) are simply wrong counts.
</details>

**N12.** Brute-force string matching, text of length n and pattern of length m: the worst-case number of character comparisons is…

- a) n + m
- b) m(n − m + 1)
- c) n·m²
- d) n − m + 1

<details><summary>Answer and explanation</summary>

**Answer: b).** There are $n - m + 1$ alignments, and each can cost up to m comparisons. Example: text `AAAA…A`,
pattern `AA…AB`. This is Θ(nm).
**Why not the others:** a) is what the smarter algorithms of Chapter 7 approach. d) counts alignments only. c) overcounts.
</details>

**N13.** The brute-force convex-hull algorithm checks every pair of points to see whether all other points lie on one side of the line through them. Its efficiency is…

- a) Θ(n log n)
- b) Θ(n²)
- c) Θ(n³)
- d) Θ(2ⁿ)

<details><summary>Answer and explanation</summary>

**Answer: c).** There are $n(n-1)/2$ pairs, and each needs a sidedness test for the other n − 2 points.
**Why not the others:** a) is QuickHull's average or Graham scan. b) forgets the inner check. d) would be testing all subsets.
</details>

**N14.** An exhaustive search for the Traveling Salesman Problem (TSP) fixes the start city and treats a tour and its reversal as the same tour. How many distinct tours are there for 5 cities?

- a) 120
- b) 24
- c) 12
- d) 5

<details><summary>Answer and explanation</summary>

**Answer: c) 12.** Fixing the start leaves $(n-1)! = 24$ orders; each tour is counted twice (once per direction), so $24/2 = 12$.
**Why not the others:** a) is $5!$ with nothing fixed. b) forgets the reversal symmetry. d) is not a count of tours.
</details>

**N15.** What are the time efficiencies of BFS (and of DFS) with adjacency lists and with an adjacency matrix?

- a) Θ(|V| + |E|) and Θ(|V|²)
- b) Θ(|V|²) and Θ(|V| + |E|)
- c) Θ(|V| log |V|) for both
- d) Θ(|E|²) for both

<details><summary>Answer and explanation</summary>

**Answer: a).** Lists: each vertex is processed once, and each list entry once. Matrix: finding a vertex's neighbours
means scanning a whole row of length |V|.
**Why not the others:** b) swaps the two. c) and d) have no basis; there is no sorting or pair-of-edges work.
</details>

**N16.** BFS uses a ______, DFS uses a ______.

- a) stack; queue
- b) queue; stack (or recursion)
- c) heap; queue
- d) queue; heap

<details><summary>Answer and explanation</summary>

**Answer: b).** BFS processes vertices in order of discovery (First-In-First-Out). DFS always continues from the
most recently reached vertex (Last-In-First-Out, which is what the recursion stack provides).
**Why not the others:** a) is reversed. c) and d): a heap is used by best-first methods such as Dijkstra's algorithm, not by plain traversals.
</details>

## Chapter 4 — Decrease-and-conquer

**N17.** What is the worst-case number of three-way key comparisons binary search makes on a sorted array of 1000 elements?

- a) 9
- b) 10
- c) 11
- d) 500

<details><summary>Answer and explanation</summary>

**Answer: b) 10.** $C_w(n) = \lfloor\log_2 n\rfloor + 1 = 9 + 1$.
**Why not the others:** a) forgets the +1. c) is $\lceil\log_2(n+1)\rceil + 1$, one too many. d) is sequential search's average.
</details>

**N18.** In Russian peasant multiplication of 50 × 65, which values are added to form the product (the rows where the halved number is odd)?

- a) 65, 260, 2080
- b) 130, 1040, 2080
- c) 130, 520, 1040
- d) 65, 130, 1040

<details><summary>Answer and explanation</summary>

**Answer: b).** The rows (n, m) are: (50, 65), **(25, 130)**, (12, 260), (6, 520), **(3, 1040)**, **(1, 2080)**. The
odd-n rows give $130 + 1040 + 2080 = 3250 = 50\cdot65$ ✔.
**Why not the others:** each of them includes an even-n row, or misses an odd one.
</details>

**N19.** What is the best-case number of key comparisons of insertion sort?

- a) 0
- b) n − 1
- c) n log₂ n
- d) n(n − 1)/2

<details><summary>Answer and explanation</summary>

**Answer: b).** On sorted input, each element is compared once with its left neighbour and stays put. (This is also
the classic place where a buggy counter reports 0; see the [lab](../empirical-analysis-lab/README.md).)
**Why not the others:** a) is the buggy counter's value. c) is not a case of insertion sort. d) is the worst case.
</details>

**N20.** Josephus problem, every second person eliminated, n = 40 people: who survives? (Recall that J(n) is a one-bit cyclic left shift of n in binary.)

- a) 1
- b) 17
- c) 25
- d) 33

<details><summary>Answer and explanation</summary>

**Answer: b) 17.** $40 = 101000_2$. Shifting the leading 1 to the end gives $010001_2 = 17$. Also,
$J(40) = 2J(20) - 1$, $J(20) = 2J(10) - 1$, $J(10) = 2J(5) - 1$, $J(5) = 2J(2) + 1 = 3$, which gives
$J(10) = 5$, $J(20) = 9$, $J(40) = 17$. A direct simulation agrees.
**Why not the others:** these are the results of common slips, such as using the wrong recurrence case.
</details>

**N21.** What is the third bit string in the Binary Reflected Gray Code (BRGC) of length 3?

- a) 010
- b) 011
- c) 100
- d) 110

<details><summary>Answer and explanation</summary>

**Answer: b) 011.** The sequence is 000, 001, **011**, 010, 110, 111, 101, 100. Each string differs from the
previous one in exactly one bit. It is built as "0 + list(n − 1)" followed by "1 + reversed list(n − 1)".
**Why not the others:** a) is the fourth string. c) is the last. d) is the fifth. Plain binary counting would give 010 third.
</details>

**N22.** Quickselect (Lomuto partition) for the k-th smallest element has which efficiencies?

- a) Θ(n) average, Θ(n²) worst
- b) Θ(log n) average, Θ(n) worst
- c) Θ(n log n) in all cases
- d) Θ(n) in all cases

<details><summary>Answer and explanation</summary>

**Answer: a).** After partitioning it recurses into only **one** side. On average the sizes shrink geometrically,
giving about $n + n/2 + \dots \approx 2n$. A consistently bad pivot costs $(n-1) + (n-2) + \dots$, which is Θ(n²).
**Why not the others:** b) Any selection algorithm must look at every element, which already costs Ω(n). c) That is
quicksort, which recurses into **both** sides. d) needs the median-of-medians pivot rule, not Lomuto's.
</details>

**N23.** What is the average-case efficiency of interpolation search on uniformly distributed sorted keys?

- a) Θ(1)
- b) Θ(log log n)
- c) Θ(log n)
- d) Θ(√n)

<details><summary>Answer and explanation</summary>

**Answer: b).** Estimating the key's position from its value shrinks the search range very quickly on uniform data
(Levitin §4.5). The worst case is still linear.
**Why not the others:** c) is binary search. a) and d) have no basis here.
</details>

## Chapter 5 — Divide-and-conquer

**N24.** What is the worst-case number of key comparisons mergesort makes on n = 8 elements?

- a) 12
- b) 17
- c) 24
- d) 28

<details><summary>Answer and explanation</summary>

**Answer: b) 17.** $C_w(n) = 2C_w(n/2) + n - 1$, $C_w(1) = 0$, gives $n\log_2 n - n + 1 = 24 - 8 + 1 = 17$.
(Brute force over all 8! inputs confirms 17.)
**Why not the others:** c) is $n\log_2 n$ without the correction. d) is $n(n-1)/2$, the quadratic sorts. a) is below the true worst case.
</details>

**N25.** By the Master Theorem, $T(n) = 4T(n/2) + n^2$ is in…

- a) Θ(n²)
- b) Θ(n² log n)
- c) Θ(n³)
- d) Θ(n^4)

<details><summary>Answer and explanation</summary>

**Answer: b).** a = 4, b = 2, d = 2, and $a = b^d$, so this is the "all levels equal" case: $\Theta(n^d\log n)$.
**Why not the others:** a) would need $a < b^d$. c) and d) misread the formula. $n^{\log_2 4} = n^2$, not $n^4$.
</details>

**N26.** Which is true?

- a) Quicksort is stable; mergesort is not
- b) Mergesort is stable (when ties take from the left half); quicksort is not
- c) Both are stable
- d) Neither is stable

<details><summary>Answer and explanation</summary>

**Answer: b).** Mergesort's merge can always take the left element on ties, which keeps the original order.
Quicksort's long-distance swaps during partitioning can reorder equal keys.
**Why not the others:** these follow from the same two facts.
</details>

**N27.** A binary tree has n internal nodes. How many external nodes (null links) does its extended tree have?

- a) n
- b) n + 1
- c) 2n
- d) 2ⁿ

<details><summary>Answer and explanation</summary>

**Answer: b) n + 1.** Each internal node has 2 child slots, giving 2n slots. Every node except the root fills one of
them, which uses n − 1. That leaves $2n - (n-1) = n + 1$ empty slots (Levitin §5.3).
**Why not the others:** c) counts all slots. a) and d) are wrong counts.
</details>

**N28.** How many digit multiplications does Karatsuba's algorithm make for two n-digit numbers (n a power of 2)?

- a) n²
- b) n^(log₂ 3) ≈ n^1.585
- c) n log n
- d) 3n

<details><summary>Answer and explanation</summary>

**Answer: b).** $M(n) = 3M(n/2)$, $M(1) = 1$, so $M(n) = 3^{\log_2 n} = n^{\log_2 3}$.
**Why not the others:** a) is the pencil-and-paper method. c) belongs to Fast Fourier Transform-based methods. d) is far too few.
</details>

**N29.** What is the efficiency of the divide-and-conquer closest-pair algorithm (with presorting)?

- a) Θ(n²)
- b) Θ(n log n)
- c) Θ(n)
- d) Θ(n log² n)

<details><summary>Answer and explanation</summary>

**Answer: b).** $T(n) = 2T(n/2) + \Theta(n)$ gives Θ(n log n), provided the points are presorted by y so that the
strip step is linear.
**Why not the others:** a) is brute force. d) is what you get if you re-sort inside every call. c) is not achievable
this way.
</details>

## Chapter 6 — Transform-and-conquer

**N30.** What is the time efficiency of bottom-up heap construction for n keys?

- a) Θ(log n)
- b) Θ(n)
- c) Θ(n log n)
- d) Θ(n²)

<details><summary>Answer and explanation</summary>

**Answer: b).** Most nodes are near the bottom and sift down only a little. The total is fewer than 2n comparisons.
**Why not the others:** c) is top-down construction (n insertions) and heapsort. a) and d) are wrong.
</details>

**N31.** In an array heap H[1..n], which index is the parent of node 11?

- a) 5
- b) 6
- c) 10
- d) 22

<details><summary>Answer and explanation</summary>

**Answer: a) 5.** The parent is $\lfloor i/2\rfloor = \lfloor 11/2\rfloor$. (The children of 5 are 10 and 11.)
**Why not the others:** b) rounds up. c) is the sibling. d) is a child of 11.
</details>

**N32.** A new key is inserted into the **right** subtree of the **left** child of a node, and that node becomes unbalanced. Which Adelson-Velsky–Landis (AVL) tree rotation fixes it?

- a) Single right rotation (R)
- b) Single left rotation (L)
- c) Double left-right rotation (LR)
- d) No rotation is needed

<details><summary>Answer and explanation</summary>

**Answer: c).** This is the "zig-zag" case. First rotate left at the left child, then rotate right at the unbalanced node.
**Why not the others:** a) fixes the left-left case. b) fixes the right-right case. d) is wrong, since the balance factor would be ±2.
</details>

**N33.** Horner's rule evaluates a polynomial of degree n at a point with…

- a) n multiplications and n additions
- b) n(n + 1)/2 multiplications
- c) 2n multiplications
- d) log n multiplications

<details><summary>Answer and explanation</summary>

**Answer: a).** $p(x) = (\cdots((a_n x + a_{n-1})x + a_{n-2})\cdots)x + a_0$: one multiplication and one addition per coefficient after the first.
**Why not the others:** b) is the naive method that computes each power from scratch. c) is the method that keeps a running power of x. d) is not possible for general coefficients.
</details>

**N34.** What is the efficiency of the presorting-based algorithm for checking whether all n elements of an array are distinct?

- a) Θ(n)
- b) Θ(n log n)
- c) Θ(n²)
- d) Θ(log n)

<details><summary>Answer and explanation</summary>

**Answer: b).** Sort in Θ(n log n), then compare adjacent pairs in Θ(n). The sort dominates.
**Why not the others:** c) is the brute-force check of all pairs. a) needs hashing (expected, Chapter 7). d) cannot even read the input.
</details>

**N35.** True or False: in a 2-3 tree, all leaves are on the same level.

- a) True
- b) False

<details><summary>Answer and explanation</summary>

**Answer: a) True.** 2-3 trees grow **upward** by splitting nodes (a new root appears on top), so they are always
perfectly height-balanced. That is why search, insert and delete are all Θ(log n).
**Why "False" is tempting:** in an AVL tree, leaves *can* be on different levels (by at most a bounded amount), which is easy to confuse.
</details>

## Chapter 7 — Space and time trade-offs

**N36.** What is the efficiency of distribution counting sort for n keys whose values lie in a range of size r?

- a) Θ(n log n)
- b) Θ(n + r)
- c) Θ(nr)
- d) Θ(r log r)

<details><summary>Answer and explanation</summary>

**Answer: b).** One pass to count frequencies (n), prefix sums over the range (r), then one pass to place the keys (n).
It is linear when r is O(n).
**Why not the others:** a) is the lower bound for **comparison** sorts, but this algorithm makes no key comparisons.
c) and d) overcount.
</details>

**N37.** In Horspool's algorithm, the shift table for the pattern BARBER gives which shift for the character **B**?

- a) 1
- b) 2
- c) 3
- d) 6

<details><summary>Answer and explanation</summary>

**Answer: b) 2.** Look at the first m − 1 = 5 characters, BARBE. The rightmost B is at index 3, so the shift is
$m - 1 - 3 = 2$. The full table is A: 4, B: 2, E: 1, R: 3, and any other character: 6.
**Why not the others:** a) is E's shift. c) is R's. d) is the shift for characters not in the pattern.
</details>

**N38.** The load factor α of a hash table is…

- a) the number of collisions
- b) n/m, the number of keys divided by the number of cells
- c) m/n
- d) the length of the longest chain

<details><summary>Answer and explanation</summary>

**Answer: b).** With separate chaining, an average successful search makes about $1 + \alpha/2$ comparisons, so you keep α around 1.
**Why not the others:** a) and d) are outcomes that depend on α and on the hash function; they are not its definition. c) is inverted.
</details>

**N39.** In a B-tree of order m, how many children does an internal non-root node have?

- a) exactly m
- b) between ⌈m/2⌉ and m
- c) between 2 and m
- d) between 1 and m/2

<details><summary>Answer and explanation</summary>

**Answer: b).** Every node is kept at least about half full. That is what keeps the height at $O(\log_{m/2} n)$, so only a few disk reads are needed.
**Why not the others:** c) is the rule for the **root**. a) would be too rigid to allow insertions. d) is wrong.
</details>

## Chapter 8 — Dynamic Programming (DP)

**N40.** Coin-row problem: coins 6, 2, 9, 4, 7, 1 in a row, and you may not pick two adjacent coins. What is the maximum total?

- a) 17
- b) 19
- c) 22
- d) 29

<details><summary>Answer and explanation</summary>

**Answer: c) 22.** The recurrence is $F(i) = \max(c_i + F(i-2),\, F(i-1))$ with $F(0) = 0$, $F(1) = c_1$. The table is
0, 6, 6, 15, 15, 22, 22, and the choice is 6 + 9 + 7.
**Why not the others:** d) takes adjacent coins (it is the total of all six). a) and b) are what greedy choices give.
</details>

**N41.** The bottom-up DP algorithm for the 0/1 knapsack problem with n items and capacity W runs in…

- a) Θ(2ⁿ)
- b) Θ(nW)
- c) Θ(n log n)
- d) Θ(W)

<details><summary>Answer and explanation</summary>

**Answer: b).** It fills a table with $(n+1)\times(W+1)$ cells at O(1) each. This is **pseudo-polynomial**:
polynomial in the *value* W, but exponential in the number of bits of W.
**Why not the others:** a) is exhaustive search. c) is the greedy method for the *fractional* knapsack. d) ignores the items.
</details>

**N42.** What is the time efficiency of Warshall's (transitive closure) and Floyd's (all-pairs shortest paths) algorithms?

- a) Θ(n²) and Θ(n²)
- b) Θ(n³) and Θ(n³)
- c) Θ(n³) and Θ(n² log n)
- d) Θ(n + m) and Θ(n³)

<details><summary>Answer and explanation</summary>

**Answer: b).** Both use a triple loop over the intermediate vertex k and the pair (i, j), updating an n × n matrix n times.
**Why not the others:** a) is the size of the matrix, not the work. c) and d) mix in other algorithms (for example, repeated Dijkstra on sparse graphs).
</details>

**N43.** A memory-function (top-down, memoized) version of a DP algorithm…

- a) always solves more subproblems than bottom-up
- b) solves only the subproblems actually needed, each at most once
- c) has worse worst-case complexity
- d) cannot be used for knapsack

<details><summary>Answer and explanation</summary>

**Answer: b).** It combines recursion's "only what's needed" with a table's "never twice" (Levitin §8.2 applies it to knapsack).
**Why not the others:** a) is the opposite of the truth. c) The worst case is the same order. d) Knapsack is exactly Levitin's example.
</details>

## Chapter 9 — Greedy technique

**N44.** Huffman coding for A: 0.4, B: 0.3, C: 0.2, D: 0.1. What is the expected number of bits per character?

- a) 1.7
- b) 1.9
- c) 2.0
- d) 2.1

<details><summary>Answer and explanation</summary>

**Answer: b) 1.9.** Merge D + C (0.3), then that with B (0.6), then with A. The code lengths are A 1, B 2, C 3, D 3, so
$0.4\cdot1 + 0.3\cdot2 + 0.2\cdot3 + 0.1\cdot3 = 1.9$.
**Why not the others:** c) is the fixed-length 2-bit code, which Huffman beats. a) is below the entropy, about 1.846 bits, which no code can beat. d) comes from a wrong merge order.
</details>

**N45.** The greedy change-making algorithm (always take the largest coin that fits) with denominations {1, 3, 4} and amount 6 gives…

- a) the optimum, 2 coins
- b) 3 coins (4 + 1 + 1), which is not optimal
- c) no solution
- d) 6 coins

<details><summary>Answer and explanation</summary>

**Answer: b).** The greedy method takes 4, then 1, then 1. The optimum is 3 + 3, which is 2 coins. Greedy is optimal
for "canonical" systems like US coins, but not for every set of denominations; DP handles every case (Levitin §8.1).
**Why not the others:** a) is the optimum, but greedy does not find it. c) Since a 1-coin exists, there is always a solution. d) would use only 1-coins.
</details>

**N46.** True or False: Dijkstra's algorithm can give wrong shortest paths if some edge weights are negative.

- a) True
- b) False

<details><summary>Answer and explanation</summary>

**Answer: a) True.** Dijkstra finalizes a vertex as soon as it is the closest in the queue. A negative edge found
later could have given a shorter path to that already-finalized vertex. Use Bellman–Ford instead.
**Why "False" is tempting:** it does work with **zero**-weight edges, and it may happen to work on some graphs with negative edges, but it is not guaranteed.
</details>

**N47.** What is the running time of Prim's Minimum Spanning Tree (MST) algorithm with a binary min-heap and adjacency lists?

- a) Θ(|V|²)
- b) O(|E| log |V|)
- c) O(|V| + |E|)
- d) O(|E|²)

<details><summary>Answer and explanation</summary>

**Answer: b).** There are |V| delete-min operations and up to |E| priority decreases, each O(log |V|). For a connected graph, $|V| - 1 \le |E|$.
**Why not the others:** a) is the version with an unordered array (and adjacency matrix), which is better for dense graphs. c) is not achievable this way. d) has no basis.
</details>

## Chapter 10 — Iterative improvement

**N48.** The Max-Flow Min-Cut Theorem states that…

- a) the maximum flow equals the number of edges in the smallest cut
- b) the value of a maximum flow equals the minimum capacity over all cuts
- c) every cut's capacity equals the maximum flow
- d) the maximum flow is at most the minimum edge capacity

<details><summary>Answer and explanation</summary>

**Answer: b).** Every flow is at most every cut's capacity, and at the optimum the two meet. This equality is also
the proof that augmenting-path methods are optimal when they stop.
**Why not the others:** a) counts edges instead of adding capacities. c) says *every* cut, but only the minimum one matches. d) is wrong, since many paths can carry flow in parallel.
</details>

**N49.** In the Gale–Shapley stable marriage algorithm where men propose, the resulting matching is…

- a) the best possible for every woman
- b) man-optimal: each man gets the best partner he can have in any stable matching
- c) not always stable
- d) found only after n! steps

<details><summary>Answer and explanation</summary>

**Answer: b).** It is always stable, finishes after at most n² proposals, and favours the proposing side.
**Why not the others:** a) The result is woman-*pessimal*. c) It is always stable; that is the theorem. d) It is O(n²).
</details>

**N50.** The simplex method relies on which fact about linear programs?

- a) If an optimal solution exists, one exists at an extreme point (vertex) of the feasible region
- b) The optimum is always in the interior of the feasible region
- c) The feasible region is always bounded
- d) It always runs in polynomial time

<details><summary>Answer and explanation</summary>

**Answer: a).** Simplex walks from vertex to vertex, improving the objective each time (Levitin §10.1).
**Why not the others:** b) The optimum of a linear objective is on the boundary. c) The region can be unbounded, and so can the objective. d) Simplex has exponential worst cases (Klee–Minty); interior-point methods are the polynomial ones.
</details>

## Chapter 11 — Limitations of algorithm power

**N51.** What is the information-theoretic lower bound on the worst-case number of comparisons for sorting 5 elements?

- a) 5
- b) 7
- c) 10
- d) 120

<details><summary>Answer and explanation</summary>

**Answer: b) 7.** A decision tree for sorting needs 5! = 120 leaves, so its height is at least $\lceil\log_2 120\rceil = 7$
(and 7 comparisons are in fact achievable for n = 5).
**Why not the others:** d) counts leaves, not height. c) is the number of pairs. a) is too few.
</details>

**N52.** Which problem is NP-complete?

- a) Minimum Spanning Tree
- b) Single-source shortest paths (non-negative weights)
- c) Hamiltonian circuit
- d) Sorting

<details><summary>Answer and explanation</summary>

**Answer: c).** Hamiltonian circuit is in NP (a proposed circuit is easy to check) and every NP problem reduces to it.
**Why not the others:** a), b) and d) all have polynomial algorithms (Prim/Kruskal, Dijkstra, mergesort), so they are in P.
</details>

**N53.** True or False: if any single NP-complete problem can be solved in polynomial time, then P = NP.

- a) True
- b) False

<details><summary>Answer and explanation</summary>

**Answer: a) True.** Every problem in NP reduces to it in polynomial time, so a polynomial algorithm for it would give
one for all of NP.
**Why "False" is tempting:** it is easy to confuse "NP-complete" with "NP-hard problems outside NP", or to think that
each problem needs its own breakthrough.
</details>

**N54.** An adversary argument shows that merging two sorted lists of n elements each needs, in the worst case, at least how many comparisons?

- a) n
- b) 2n − 1
- c) n log n
- d) n²

<details><summary>Answer and explanation</summary>

**Answer: b) 2n − 1.** The adversary answers so that the output interleaves the lists: $a_1 < b_1 < a_2 < b_2 < \dots$.
Every one of the 2n − 1 adjacent pairs must then be compared, or the algorithm could not tell the order of that pair.
The standard merge achieves this, so it is optimal (Levitin §11.1).
**Why not the others:** a) is too few. c) and d) are more than necessary.
</details>

## Chapter 12 — Coping with the limitations

**N55.** How many solutions does the 4-queens problem have?

- a) 0
- b) 1
- c) 2
- d) 4

<details><summary>Answer and explanation</summary>

**Answer: c) 2.** They are the column placements (2, 4, 1, 3) and (3, 1, 4, 2), mirror images of each other. Backtracking finds them while pruning most of the 4⁴ placements.
**Why not the others:** a) is the answer for n = 2 and n = 3. d) counts wrongly. For reference: 8-queens has 92.
</details>

**N56.** In branch-and-bound, a node is pruned when…

- a) it is a leaf
- b) its bound is no better than the best complete solution found so far, it is infeasible, or it is a single-point subproblem
- c) its depth exceeds log n
- d) the queue is full

<details><summary>Answer and explanation</summary>

**Answer: b).** Those are the three standard reasons (Levitin §12.2). The **bound**, an optimistic estimate for
everything below the node, is what makes pruning possible.
**Why not the others:** a) Leaves are evaluated, not pruned by rule. c) and d) have nothing to do with optimality.
</details>

**N57.** Which statement about approximation algorithms for the TSP is correct?

- a) The nearest-neighbour heuristic is always within a factor 2 of the optimum
- b) The twice-around-the-tree algorithm is a 2-approximation for Euclidean instances
- c) Every TSP instance has a polynomial 1.5-approximation
- d) Approximation is impossible for the TSP

<details><summary>Answer and explanation</summary>

**Answer: b).** The MST weighs less than the optimal tour. Walking around the MST costs twice that weight, and
shortcuts never lengthen a Euclidean tour.
**Why not the others:** a) Nearest-neighbour's accuracy ratio is unbounded. c) and d) For general (non-metric)
instances, no polynomial approximation with any constant ratio exists unless P = NP. For Euclidean instances,
approximation clearly works.
</details>

**N58.** The bisection method on [0, 1] halves the interval each step. How many iterations guarantee an error below $10^{-6}$?

- a) 6
- b) 10
- c) 20
- d) 1,000,000

<details><summary>Answer and explanation</summary>

**Answer: c) 20.** The error after k steps is at most $1/2^k$. You need $2^k > 10^6$, so $k \ge \lceil\log_2 10^6\rceil = 20$.
**Why not the others:** a) confuses decimal digits with bits. b) gives only about $10^{-3}$. d) is what an exhaustive grid would need.
</details>

---

⬅️ [Practice home](../README.md) · [Practice Exam 1](../exams/practice-exam-1.md) ·
[Arena](https://normansrule.github.io/algorithm-forge/arena/)
