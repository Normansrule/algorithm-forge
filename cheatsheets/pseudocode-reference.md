# ✍️ Forge Pseudocode — Language Reference

> **Forge Pseudocode** is the Levitin-style pseudocode used in every lesson, simulation and Practice Arena problem.
> It is not "pretend" code: the Arena runs it, counts its operations and grades it. If you can write it on an exam,
> you can run it here. Every example on this page was executed by the real interpreter
> (`docs/engine/forge-pseudo.js`) with `node tools/check-pseudocode-snippets.mjs`.
> Live, printable version: <https://normansrule.github.io/algorithm-forge/cheatsheet.html#pseudocode>

---

## 1. The shape of an algorithm

<!-- test: {"args": [[3, 9, 2, 7]], "expect": 9} -->
```
ALGORITHM MaxElement(A[0..n-1])
    // Returns the value of the largest element in A
    // Input: a non-empty array A of n numbers
    // Output: the largest value in A
    maxval ← A[0]
    for i ← 1 to n - 1 do
        if A[i] > maxval then
            maxval ← A[i]
    return maxval
```

- A program is one or more `ALGORITHM Name(parameters)` blocks. The **first** one is the entry point (the Arena
  calls the name given in the problem).
- **Indentation defines blocks** — 4 spaces per level, exactly like the book. `end`, `endif`, `od`, `{`, `}` lines are
  tolerated and ignored.
- `//` starts a comment. The header comments (purpose, Input, Output) are a habit worth keeping.
- `A[0..n-1]` in a header **binds n** to the array's length. `A[l..r]` binds `l` and `r` to the bounds the caller
  passed. `A[1..n]` gives you a 1-based view.

## 2. Values, assignment and arithmetic

<!-- test: {"args": [], "expect": 21} -->
```
ALGORITHM Arithmetic()
    a ← 7 div 2          // 3   (integer division, rounds down)
    b ← 7 mod 3          // 1
    c ← ⌈7 / 2⌉          // 4   (7 / 2 = 3.5; ⌊ ⌋ and ⌈ ⌉ round)
    d ← 2^3              // 8
    e ← min(∞, 5)        // 5
    return a + b + c + d + e
```

| You write | Meaning | Plain-keyboard alternative |
|---|---|---|
| `x ← 5` | assignment | `x <- 5` or `x := 5` |
| `=` `≠` `<` `≤` `>` `≥` | comparisons (`=` is **equality**, never assignment) | `!=` `<=` `>=` |
| `and` `or` `not` | logic, short-circuit (`and` stops at the first false) | `&&` `\|\|` `!` |
| `+ − × /` `div` `mod` `^` | arithmetic; `/` is real division; `div` rounds down | `-` `*` `**` `%` |
| `⌊x⌋` `⌈x⌉` `\|x\|` | floor, ceiling, absolute value | `floor(x)` `ceil(x)` `abs(x)` |
| `2n` `n²` | implicit multiplication and squares are fine | `2 * n`, `n^2` |
| `∞` | infinity (bigger than every number) | `infinity` |
| `true` `false` `null` | booleans and "no value" | `NIL` also means null |
| `"text"` `'a'` | strings and characters (strings can be indexed: `s[0]`) | |

Several statements can share a line when separated by `;` — for example `i ← 0; j ← n - 1`.

## 3. Decisions

<!-- test: {"args": [0], "expect": "zero"} -->
```
ALGORITHM Sign(x)
    if x < 0 then
        return "negative"
    else if x = 0 then
        return "zero"
    else
        return "positive"
```

`then` is optional, and a short body can stay on the same line: `if A[i] > m then m ← A[i]`.

## 4. Loops

<!-- test: {"args": [1234], "expect": 10} -->
```
ALGORITHM DigitSum(n)
    // while: test first, maybe zero iterations
    s ← 0
    while n > 0 do
        s ← s + n mod 10
        n ← n div 10
    return s
```

<!-- test: {"args": [13], "expect": 4} -->
```
ALGORITHM BinaryLength(n)
    // repeat … until: the body always runs at least once
    count ← 0
    repeat
        n ← n div 2
        count ← count + 1
    until n = 0
    return count
```

<!-- test: {"args": [[4, -2, 7, 12, 5]], "output": ["4", "7"]} -->
```
ALGORITHM PrintSmallPositives(A)
    // for each, with continue and break
    for each x in A do
        if x < 0 then continue       // skip to the next x
        if x > 9 then break          // leave the loop entirely
        print x
```

| Form | Example |
|---|---|
| counting up | `for i ← 0 to n - 1 do` (both ends included) |
| counting down | `for i ← n - 1 downto 0 do` |
| with a step | `for i ← 0 to n - 1 step 2 do` |
| over elements | `for each x in A do` |
| over pairs | `for (u, w) in edges do` (each element is a list like `[u, w]`) |
| while / repeat | `while cond do` · `repeat` … `until cond` |
| leave early | `break`, `continue`, `return` |

<!-- test: {"args": [[[1, 5], [2, 7], [3, 1]]], "expect": 13} -->
```
ALGORITHM TotalWeight(edges)
    total ← 0
    for (u, w) in edges do
        total ← total + w
    return total
```

## 5. Arrays, views and copies

<!-- test: {"args": [[5, 6, 7, 8]], "expect": [5, 0, 0, 8]} -->
```
ALGORITHM ClearMiddle(A[0..n-1])
    // Passing a slice passes a VIEW: the callee writes into A itself
    Clear(A[1..n-2])
    return A

ALGORITHM Clear(B[l..r])
    for i ← l to r do
        B[i] ← 0
```

<!-- test: {"args": [[1, 2, 3]], "expect": [1, 99]} -->
```
ALGORITHM CopyIsSeparate(A[0..n-1])
    // Assigning a slice makes a COPY: changing B leaves A alone
    B ← A[0..n-1]
    B[0] ← 99
    return [A[0], B[0]]
```

<!-- test: {"args": [[1, 2, 3]], "expect": [3, 2, 1]} -->
```
ALGORITHM ReverseInPlace(A[0..n-1])
    i ← 0
    j ← n - 1
    while i < j do
        swap A[i] and A[j]           // also: A[i] ↔ A[j]
        i ← i + 1
        j ← j - 1
    return A
```

- Make arrays with `array(n, fill)` and 2-D tables with `matrix(rows, cols, fill)`; read cells as `M[i, j]` or `M[i][j]`.
- List literals: `[1, 2, 3]`, `[]`. `append(L, x)` adds to the end; writing one past the end also extends the array.
- `copy A[0..m-1] to B[0..m-1]` copies element by element (Levitin's phrasing).
- `length(A)` works on arrays and strings.

<!-- test: {"args": [3], "expect": [[1, 0, 0], [0, 1, 0], [0, 0, 1]]} -->
```
ALGORITHM Identity(n)
    M ← matrix(n, n, 0)
    for i ← 0 to n - 1 do
        M[i, i] ← 1
    return M
```

## 6. Recursion and multiple results

<!-- test: {"args": [5], "expect": 120} -->
```
ALGORITHM F(n)
    // Computes n! recursively
    if n = 0 then return 1
    return F(n - 1) * n
```

<!-- test: {"args": [[4, 9, 1, 7]], "expect": 8} -->
```
ALGORITHM Spread(A[0..n-1])
    (lo, hi) ← MinMax(A)             // unpack two results
    return hi - lo

ALGORITHM MinMax(A[0..n-1])
    lo ← A[0]
    hi ← A[0]
    for i ← 1 to n - 1 do
        if A[i] < lo then lo ← A[i]
        if A[i] > hi then hi ← A[i]
    return (lo, hi)                  // returns a list [lo, hi]
```

## 7. Records (nodes)

<!-- test: {"args": [], "expect": 2} -->
```
ALGORITHM TinyTree()
    root ← new Node
    root.key ← 2
    root.left ← new Node
    root.left.key ← 1
    root.right ← null
    return Size(root)

ALGORITHM Size(t)
    if t = null then return 0
    return 1 + Size(t.left) + Size(t.right)
```

A record is created with `new Name`; fields appear when you assign them. A field that was never assigned is `null`.

## 8. Built-in data structures

| Structure | Create | Operations |
|---|---|---|
| stack | `S ← stack()` | `push(S, x)`, `pop(S)`, `top(S)`, `isEmpty(S)` |
| queue | `Q ← queue()` | `enqueue(Q, x)`, `dequeue(Q)`, `front(Q)`, `isEmpty(Q)` |
| map (dictionary) | `M ← map()` | `M[k] ← v`, `M[k]`, `contains(M, k)`, `get(M, k, default)`, `keys(M)`, `values(M)`, `remove(M, k)` |
| set | `S ← set()` | `add(S, x)`, `contains(S, x)`, `x in S` |
| priority queue | `Q ← priorityQueue()` (min) or `maxPQ()` | `insert(Q, item, priority)`, `deleteMin(Q)` / `deleteMax(Q)` (return the item), `peek(Q)`, `isEmpty(Q)` |

<!-- test: {"args": [["to", "be", "or", "not", "to", "be"]], "expect": 2} -->
```
ALGORITHM MostFrequentCount(W)
    // map: count how often each word occurs
    M ← map()
    best ← 0
    for each w in W do
        M[w] ← get(M, w, 0) + 1
        best ← max(best, M[w])
    return best
```

<!-- test: {"args": [[[1, 2], [0, 3], [0, 3], [1, 2]], 0], "expect": [0, 1, 2, 3]} -->
```
ALGORITHM BFSOrder(adj, s)
    // queue: breadth-first search from s; adj[v] lists v's neighbors
    visited ← array(length(adj), false)
    order ← []
    Q ← queue()
    enqueue(Q, s)
    visited[s] ← true
    while not isEmpty(Q) do
        v ← dequeue(Q)
        append(order, v)
        for each w in adj[v] do
            if not visited[w] then
                visited[w] ← true
                enqueue(Q, w)
    return order
```

<!-- test: {"args": [[[0, 1, 4], [0, 2, 1], [2, 1, 2], [1, 3, 1], [2, 3, 5]], 4, 0], "expect": [0, 3, 1, 4]} -->
```
ALGORITHM Dijkstra(edges, n, s)
    // priority queue: shortest distances from s; edges are [u, v, weight] (undirected)
    adj ← array(n, null)
    for v ← 0 to n - 1 do adj[v] ← []
    for each e in edges do
        append(adj[e[0]], [e[1], e[2]])
        append(adj[e[1]], [e[0], e[2]])
    dist ← array(n, ∞)
    dist[s] ← 0
    Q ← priorityQueue()
    insert(Q, s, 0)
    while not isEmpty(Q) do
        u ← deleteMin(Q)
        for (v, w) in adj[u] do
            if dist[u] + w < dist[v] then
                dist[v] ← dist[u] + w
                insert(Q, v, dist[v])
    return dist
```

## 9. More built-in functions

| Function | Result |
|---|---|
| `min(a, b, …)`, `max(…)` | smallest / largest argument (or of one list) |
| `abs`, `sqrt`, `floor`, `ceil`, `round`, `pow(a, b)` | the usual math |
| `log2(x)` or `lg(x)`, `ln(x)` | logarithms |
| `sum(A)`, `sorted(A)`, `reversed(A)`, `reverse(A)` | total; sorted copy; reversed copy; reverse in place (returns A) |
| `range(a, b)` | the list `[a, a+1, …, b]` (**both ends included**) |
| `indexOf(A, x)` | first index of x, or −1 |
| `even(n)`, `odd(n)` | parity tests |
| `ord(c)`, `chr(k)`, `int(s)`, `str(x)` | character codes and conversions |
| `random(a, b)` | a random integer in a..b (seeded, so runs repeat exactly) |
| `print x, y` | writes a line to the Output panel |
| `x in L` | membership test for lists, sets and map keys |

<!-- test: {"args": [[3, 1, 2]], "expect": [[1, 2, 3], [2, 1, 3], 6, [0, 1, 2, 3], 1]} -->
```
ALGORITHM Builtins(A)
    return [sorted(A), reverse(A), sum(A), range(0, 3), indexOf(A, 1)]
```

<!-- test: {"args": [], "output": ["x is 3"]} -->
```
x ← 3
print "x is", x
```

(Top-level lines outside any `ALGORITHM` run first — handy for quick experiments.)

## 10. What the Arena counts

When you run pseudocode, the interpreter counts operations so you can check your analysis against reality:

| Counter | What increments it |
|---|---|
| key comparisons | a relational comparison that involves an array element, like `A[j] > v` |
| comparisons | every relational comparison |
| array reads / writes | every `A[i]` read / every `A[i] ← …` |
| assignments, arithmetic, calls, swaps | what the names say |
| steps | every executed statement (a runaway loop stops at 2,000,000) |

Some problems set a **budget** (for example "at most n − 1 key comparisons") or a **growth** check (for example
"must be Θ(n log n)"), so the efficiency of your solution is graded, not just its answer.

## 11. Friendly errors (and what they mean)

<!-- test: {"args": [[1, 2]], "error": "Index 2 is outside A[0..1]"} -->
```
ALGORITHM OffByOne(A[0..n-1])
    return A[n]                      // the last element is A[n - 1]
```

| Message starts with | Usual cause |
|---|---|
| "Index … is outside A[0..n−1]" | an off-by-one loop bound (`to n` instead of `to n - 1`) |
| "I don't know the variable …" | a typo, or a variable used before its first `←` |
| "… has not been given a value yet" | reading an array cell nothing wrote to |
| "Stopped after 2,000,000 steps" | a loop whose condition never changes |
| "The recursion went too deep" | a missing or unreachable base case |

---
⬅️ [Cheat sheet page](https://normansrule.github.io/algorithm-forge/cheatsheet.html) · Full format for Arena authors: [docs/arena/PROBLEM_FORMAT.md](../docs/arena/PROBLEM_FORMAT.md) · Conventions: [Start Here](../lessons/00-start-here/README.md)
