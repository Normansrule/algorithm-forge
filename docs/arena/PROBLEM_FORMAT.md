# Arena problem format

Every Practice Arena problem is one `ForgeProblems.add({...})` call in a file under `docs/arena/problems/`.
The same object drives the problem page, the grader (`docs/engine/forge-check.js`) and the validator
(`node tools/validate-problems.mjs`). **A problem is only done when the validator prints ✓ for it.**

See `docs/arena/problems/exemplars.js` for five complete, validated examples — copy their style.

## Fields

| Field | Required | Meaning |
|---|---|---|
| `id` | ✓ | kebab-case, unique across the bank (e.g. `binary-search-first-occurrence`) |
| `title` | ✓ | short, human title |
| `level` | ✓ | 0 Foundations · 1 Brute Force & Analysis · 2 Decrease & Divide · 3 Transform & Space-Time · 4 DP, Greedy & Iterative Improvement · 5 Hard Problems & Senior Patterns |
| `chapter` | ✓ | 1–12 = Levitin chapters; 13 Advanced Data Structures, 14 Advanced Graphs, 15 DP & Interview Patterns, 16 Randomized/Amortized/Streaming, 17 Senior Playbook |
| `difficulty` | | 1 (easy) – 3 (hard) *within* the level; used for ordering |
| `topics` | ✓ | array of short tags |
| `strategy` | | design strategy in words ("Decrease-by-one", "Two pointers") |
| `source` | | "Levitin §4.2", "Levitin Exercise 3.1.4 (adapted)", "Classic exam problem", "Interview classic" |
| `summary` | ✓ | one line shown in the problem list |
| `statement` | ✓ | HTML. Explain the task, input format, output format, constraints. Paraphrase — never paste textbook text. |
| `entry` | ✓ | the ALGORITHM / function name the learner must keep (e.g. `"BinarySearch"`) |
| `params` | ✓ | parameter names shown in test inputs (e.g. `["A", "K"]`) |
| `output` | | `"return"` (default) or `{arg: k}` to grade argument k *after* the call (in-place algorithms) |
| `tests` | ✓ | ≥ 3 hand-written tests `{args: [...], expect, explain?, name?}`. The first `exampleCount` (default 3) are the visible examples used by **Run**. Include edge cases (empty, one element, duplicates, negatives, already sorted, worst case). |
| `random` | recommended | `{count, gen(r, i) → args}` generated tests, used by **Submit**. `r` is a seeded RNG: `r()`, `r.int(lo,hi)`, `r.array(n,lo,hi)`, `r.distinct(n,lo,hi)`, `r.sorted(n,lo,hi)`, `r.shuffle(xs)`, `r.pick(xs)`, `r.word(n, "ab")`. Keep sizes small (n ≤ ~60) so pseudocode stays fast. |
| `reference` | ✓ (or `verify`) | JS oracle `(...args) → expected output`. Must not mutate in ways that matter (args are cloned). |
| `verify` | | `(got, args) → true | "why it's wrong"` for problems with many valid answers (topological orders, any optimal set, …). |
| `compare` | | `"exact"` (default, floats within 1e-9), `"float"` (1e-6), `"unordered"` (list order doesn't matter), `"unordered-deep"` (list of lists, both levels unordered), or a function `(got, exp, args) → true|false|"message"` |
| `budget` | | pseudocode only: `{metric, limit(...args) → number, label, hint}`. metric ∈ `keyComparisons` (relational ops touching an array element `A[i]`), `comparisons`, `steps`, `arrayReads`, `arrayWrites`, `assignments`, `arithmetic`, `calls`, `swaps`. |
| `growth` | | pseudocode only: `{metric, sizes:[...], gen(r, n) → args, expect}` — checks the efficiency class. `expect` ∈ `"1"`, `"log n"`, `"sqrt n"`, `"n"`, `"n log n"`, `"n^2"`, `"n^2 log n"`, `"n^3"`, `"2^n"`, `"n!"`. Use ≥ 5 sizes doubling (e.g. `[16,32,64,128,256]`); keep total work under ~2M steps. Good for "must be linear / must be O(n log n)" problems. |
| `forbid` | | builtins the learner may not call (e.g. `["sorted", "max", "min"]`) |
| `mutants` | ✓ (≥ 1, ideally 2–4) | known wrong solutions `{fn(...args) → output, hint}`. If the learner's outputs match a mutant, they see its `hint`. Model the REAL mistakes students make: off-by-one bounds, `<` vs `≤`, forgetting a case, wrong base case, wrong initialization, counting in the wrong place, greedy where DP is needed… The validator checks each mutant fails some test AND is diagnosed. Add tests that expose each mutant. |
| `lints` | | `{re: "regex source", lang: "pseudo"|"js"|"any", message}` shown when the regex matches the code and the submission fails. |
| `hints` | ✓ (≥ 3) | progressive nudges: 1 = the key question/insight (no code), 2 = the structure/plan, 3 = the specific step or line. Never paste the full answer in a hint. |
| `starter` | ✓ | `{pseudo, js}` — header + a few scaffold lines with `...` gaps. Must NOT pass. Keep the exact entry name & params. |
| `solution` | ✓ | `{pseudo, js, python, explain}`. `explain` = 1–3 sentences on why it's correct and its efficiency (Θ class). The pseudocode MUST run in Forge Pseudocode and pass. |
| `complexity` | | e.g. `"Θ(n log n) comparisons"` |
| `visual` | | related simulation, e.g. `"sims/sorting-studio.html"` |
| `lesson` | | related lesson path, e.g. `"lessons/05-divide-and-conquer/README.md"` |

## Forge Pseudocode quick reference (what the interpreter supports)

```
ALGORITHM Name(A[0..n-1], K)        // A[0..n-1] binds n = length(A); A[l..r] binds l and r; A[1..n] = 1-based view
    x ← 0; y ← n − 1                // ← or <- or :=   (; separates statements on one line)
    for i ← 0 to n − 1 do …          // also: downto, step 2 ; for each x in A do … ; for (u, w) in edges do …
    while l ≤ r do …                 // = is equality; ≠ ≤ ≥ (or != <= >=); and / or / not (short-circuit)
    repeat … until cond
    if cond then … else if … else …  // "then" optional; inline bodies allowed: if A[i] > m then m ← A[i]
    m ← ⌊(l + r)/2⌋                  // ⌊ ⌋ ⌈ ⌉, div (floor division), mod, ^, ², 2n (implicit ×), |x|
    swap A[i] and A[j]               // or A[i] ↔ A[j] or swap(A[i], A[j])
    return x                          // return (a, b) returns a list
    break / continue
    Other(A[l..s − 1])               // passing a slice passes a VIEW (same array); B ← A[0..m−1] makes a COPY
    copy A[0..m−1] to B[0..m−1]
    print x, y                        // shows in the Output panel
```
Values: numbers, `∞`/`infinity`, `true`/`false`, `null`/`NIL`, strings `"abc"` / chars `'A'` (indexable), lists `[1, 2]`,
2-D `M[i, j]` or `M[i][j]`, records `t ← new Node` then `t.key ← 5`, tuples `(d, v) ← deleteMin(Q)`.

Reserved words (can't be variable names): `for to downto do while repeat until if then else return and or not div mod in
true false null break continue each` (written all-lowercase or ALL-CAPS; mixed case like `Xor` is an ordinary name).

Built-ins: `length(A)`, `array(n, fill)`, `matrix(r, c, fill)`, `copy(A)`, `append(L, x)`, `min`, `max`, `abs`, `sqrt`,
`floor`, `ceil`, `round`, `log2`/`lg`, `ln`, `pow`, `sum`, `sorted(A)` (copy), `reversed(A)` (copy), `reverse(A)` (in place), `range(a, b)`, `indexOf(A, x)`,
`even`, `odd`, `ord`, `chr`, `int`, `str`, `random(a, b)` (seeded),
stacks `stack() push(S,x) pop(S) top(S)`, queues `queue() enqueue(Q,x) dequeue(Q) front(Q)`, `isEmpty(X)`,
maps `map() M[k] ← v  contains(M,k)  get(M,k,default)  keys(M)  values(M)  remove(M,k)`, sets `set() add(S,x) contains(S,x)`,
priority queues `priorityQueue()`/`maxPQ()`, `insert(Q, item, priority)`, `deleteMin(Q)`/`deleteMax(Q)` (returns the item), `peek(Q)`.
`x in L` membership. Arrays auto-extend when you write one past the end (handy for building results).

## Checklist for a great problem
1. The statement teaches: 1–2 sentences of *why* this problem matters, then the precise task.
2. Examples show typical + edge cases, each with a one-line `explain`.
3. Hints climb: insight → plan → specific step. The learner should almost never need the answer.
4. Mutants cover the 2–4 most common wrong answers, each with a specific, kind, actionable hint.
5. Efficiency is graded when efficiency is the point (`budget` for exact counts, `growth` for Θ-class).
6. The solution explanation connects to the analysis (sum or recurrence → Θ).
7. `node tools/validate-problems.mjs <your-file>.js` prints ✓ for every problem, with no mutant warnings.
