"""Chapter 8 - Dynamic Programming (DP).

Solve overlapping subproblems once each and store the answers in a table
(Levitin §8.0). Typical recipe: (1) write a recurrence relating a solution to
smaller ones, (2) fill a table bottom-up (or memoize top-down), (3) walk the
table backward to reconstruct the actual choices.
"""

from __future__ import annotations

import bisect
import math
from typing import Sequence

from .counters import OpCounter, tick

INF = math.inf

# ---------------------------------------------------------------------------
# Three basic examples (Levitin §8.1)
# ---------------------------------------------------------------------------


def fib_dp(n: int) -> int:
    """F(n) by filling a table F[0..n] from the bottom up.

    Levitin §8.0 (the Fibonacci motivating example). Θ(n) time and space.
    """
    if n < 0:
        raise ValueError("n must be non-negative")
    F = [0] * (n + 1)
    if n >= 1:
        F[1] = 1
    for i in range(2, n + 1):
        F[i] = F[i - 1] + F[i - 2]
    return F[n]


def coin_row(coins: Sequence[float]) -> tuple[float, list[int]]:
    """Largest sum of coins with no two adjacent picked; returns (value, chosen indices).

    Levitin §8.1 (coin-row problem): F(n) = max(c_n + F(n-2), F(n-1)),
    F(0) = 0, F(1) = c_1. Θ(n) time and space (the table is kept for the
    backtrace).
    """
    n = len(coins)
    F = [0] * (n + 1)
    if n >= 1:
        F[1] = coins[0]
    for i in range(2, n + 1):
        F[i] = max(coins[i - 1] + F[i - 2], F[i - 1])
    chosen = []
    i = n
    while i >= 1:
        take = coins[i - 1] + (F[i - 2] if i >= 2 else 0)
        if take >= F[i - 1] and F[i] == take:
            chosen.append(i - 1)
            i -= 2
        else:
            i -= 1
    return F[n], sorted(chosen)


def change_making(denominations: Sequence[int], amount: int) -> tuple[int | None, list[int]]:
    """Fewest coins adding up to amount; returns (count, coins) or (None, []) if impossible.

    Levitin §8.1 (change-making problem): F(n) = min over d_j <= n of
    F(n - d_j) + 1, F(0) = 0. Θ(amount · m) time for m denominations;
    Θ(amount) space.
    """
    F = [0] + [INF] * amount
    last_coin = [0] * (amount + 1)
    for value in range(1, amount + 1):
        for d in denominations:
            if d <= value and F[value - d] + 1 < F[value]:
                F[value] = F[value - d] + 1
                last_coin[value] = d
    if F[amount] == INF:
        return None, []
    coins = []
    v = amount
    while v > 0:
        coins.append(last_coin[v])
        v -= last_coin[v]
    return int(F[amount]), sorted(coins, reverse=True)


def robot_coin_collecting(board: Sequence[Sequence[int]]) -> tuple[int, list[tuple[int, int]]]:
    """Max coins a robot collects moving only right/down from top-left to bottom-right.

    Levitin §8.1 (coin-collecting problem): F(i, j) = max(F(i-1, j),
    F(i, j-1)) + c_ij. Returns (coins, path of (row, col) cells).
    Θ(nm) time and space.
    """
    n, m = len(board), len(board[0])
    F = [[0] * m for _ in range(n)]
    for i in range(n):
        for j in range(m):
            up = F[i - 1][j] if i > 0 else -INF
            left = F[i][j - 1] if j > 0 else -INF
            best_before = 0 if i == 0 and j == 0 else max(up, left)
            F[i][j] = best_before + board[i][j]
    path = []
    i, j = n - 1, m - 1
    while True:
        path.append((i, j))
        if i == 0 and j == 0:
            break
        if i == 0:
            j -= 1
        elif j == 0:
            i -= 1
        elif F[i - 1][j] >= F[i][j - 1]:
            i -= 1
        else:
            j -= 1
    return int(F[n - 1][m - 1]), path[::-1]


def grid_paths(rows: int, cols: int, blocked: set[tuple[int, int]] | None = None) -> int:
    """Number of right/down paths from cell (0, 0) to (rows-1, cols-1) avoiding blocked cells.

    Levitin Exercise 8.1 (counting shortest grid paths). P(i, j) =
    P(i-1, j) + P(i, j-1). Θ(rows · cols) time and space.
    """
    blocked = blocked or set()
    P = [[0] * cols for _ in range(rows)]
    for i in range(rows):
        for j in range(cols):
            if (i, j) in blocked:
                P[i][j] = 0
            elif i == 0 and j == 0:
                P[i][j] = 1
            else:
                P[i][j] = (P[i - 1][j] if i > 0 else 0) + (P[i][j - 1] if j > 0 else 0)
    return P[rows - 1][cols - 1]


def binomial_coefficient(n: int, k: int, counter: OpCounter | None = None) -> int:
    """C(n, k) by filling Pascal's triangle row by row.

    Levitin §8.1 / Exercise 8.1 (Binomial): C(i, j) = C(i-1, j-1) + C(i-1, j).
    Θ(nk) additions; Θ(nk) space (the full table, as in the book).
    """
    if not 0 <= k <= n:
        return 0
    C = [[0] * (k + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        for j in range(min(i, k) + 1):
            if j == 0 or j == i:
                C[i][j] = 1
            else:
                tick(counter, "additions")
                C[i][j] = C[i - 1][j - 1] + C[i - 1][j]
    return C[n][k]


# ---------------------------------------------------------------------------
# Knapsack and memory functions (Levitin §8.2)
# ---------------------------------------------------------------------------


def knapsack_table(weights: Sequence[int], values: Sequence[float], capacity: int) -> list[list[float]]:
    """The full DP table F[i][j] = best value using the first i items with capacity j.

    Levitin §8.2: F(i, j) = max(F(i-1, j), v_i + F(i-1, j - w_i)) when
    w_i <= j, else F(i-1, j). Θ(nW) time and space.
    """
    n = len(weights)
    F = [[0] * (capacity + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        w, v = weights[i - 1], values[i - 1]
        for j in range(capacity + 1):
            F[i][j] = F[i - 1][j]
            if w <= j and v + F[i - 1][j - w] > F[i][j]:
                F[i][j] = v + F[i - 1][j - w]
    return F


def knapsack_dp(weights: Sequence[int], values: Sequence[float], capacity: int) -> tuple[float, list[int]]:
    """0/1 knapsack by bottom-up DP; returns (best value, chosen item indices).

    Levitin §8.2. Backtrace: item i is in the optimal set exactly when
    F[i][j] != F[i-1][j]. Θ(nW) time and space.
    """
    F = knapsack_table(weights, values, capacity)
    items = []
    j = capacity
    for i in range(len(weights), 0, -1):
        if F[i][j] != F[i - 1][j]:
            items.append(i - 1)
            j -= weights[i - 1]
    return F[len(weights)][capacity], sorted(items)


def knapsack_memory_function(weights: Sequence[int], values: Sequence[float],
                             capacity: int) -> tuple[float, list[tuple[int, int]]]:
    """Top-down knapsack that fills only the table cells it actually needs.

    Levitin §8.2 (MFKnapsack, the "memory function" method). Returns
    (best value, sorted list of (i, j) cells that were computed) - usually far
    fewer than all nW cells. Worst case Θ(nW) time and space.
    """
    n = len(weights)
    F: dict[tuple[int, int], float] = {}

    def solve(i: int, j: int) -> float:
        if i == 0 or j == 0:
            return 0
        if (i, j) not in F:
            if j < weights[i - 1]:
                value = solve(i - 1, j)
            else:
                value = max(solve(i - 1, j), values[i - 1] + solve(i - 1, j - weights[i - 1]))
            F[(i, j)] = value
        return F[(i, j)]

    best = solve(n, capacity)
    return best, sorted(F)


# ---------------------------------------------------------------------------
# Optimal Binary Search Trees (Levitin §8.3)
# ---------------------------------------------------------------------------


def optimal_bst(probabilities: Sequence[float]) -> tuple[float, list[list[float]], list[list[int]]]:
    """Optimal Binary Search Tree (BST) for keys 1..n with search probabilities p_1..p_n.

    Levitin §8.3: C(i, j) = min over i <= k <= j of C(i, k-1) + C(k+1, j)
    plus the sum of p_i..p_j, with C(i, i-1) = 0 and C(i, i) = p_i.
    Tables are 1-based like the book: C and R have rows 1..n+1 and columns
    0..n (row 0 unused). R[i][j] is the root key of the optimal subtree.
    Returns (average number of comparisons C[1][n], C, R).
    Θ(n^3) time; Θ(n^2) space.
    """
    n = len(probabilities)
    p = [0.0] + list(probabilities)  # 1-based
    C = [[0.0] * (n + 1) for _ in range(n + 2)]
    R = [[0] * (n + 1) for _ in range(n + 2)]
    for i in range(1, n + 1):
        C[i][i] = p[i]
        R[i][i] = i
    for d in range(1, n):  # diagonal: j - i = d
        for i in range(1, n - d + 1):
            j = i + d
            best, best_k = INF, i
            for k in range(i, j + 1):
                cost = C[i][k - 1] + C[k + 1][j]
                if cost < best:
                    best, best_k = cost, k
            R[i][j] = best_k
            C[i][j] = best + sum(p[i:j + 1])
    return (C[1][n] if n else 0.0), C, R


def optimal_bst_tree(R: list[list[int]], i: int, j: int, keys: Sequence | None = None):
    """Rebuild the optimal BST for keys i..j from the root table as nested tuples.

    Each node is (key, left, right); the empty tree is None. If ``keys`` is
    given, key k is shown as keys[k-1]. Levitin §8.3. Θ(n).
    """
    if i > j:
        return None
    k = R[i][j]
    label = keys[k - 1] if keys is not None else k
    return (label, optimal_bst_tree(R, i, k - 1, keys), optimal_bst_tree(R, k + 1, j, keys))


# ---------------------------------------------------------------------------
# Warshall's and Floyd's algorithms (Levitin §8.4)
# ---------------------------------------------------------------------------


def warshall(adjacency: Sequence[Sequence[int]]) -> list[list[int]]:
    """Transitive closure: R[i][j] = 1 when some directed path leads from i to j.

    Levitin §8.4 (Warshall): R^(k)[i][j] = R^(k-1)[i][j] or
    (R^(k-1)[i][k] and R^(k-1)[k][j]). Θ(n^3) time; Θ(n^2) space.
    """
    n = len(adjacency)
    R = [[1 if adjacency[i][j] else 0 for j in range(n)] for i in range(n)]
    for k in range(n):
        for i in range(n):
            if R[i][k]:
                for j in range(n):
                    if R[k][j]:
                        R[i][j] = 1
    return R


def floyd(weights: Sequence[Sequence[float]]) -> list[list[float]]:
    """All-pairs shortest distances (use math.inf for "no edge", 0 on the diagonal).

    Levitin §8.4 (Floyd): D[i][j] = min(D[i][j], D[i][k] + D[k][j]).
    Θ(n^3) time; Θ(n^2) space. Assumes no negative cycle.
    """
    return floyd_with_paths(weights)[0]


def floyd_with_paths(weights: Sequence[Sequence[float]]) -> tuple[list[list[float]], list[list[int | None]]]:
    """Floyd's algorithm that also records next[i][j] = first hop on a shortest i->j path.

    Levitin Exercise 8.4 (path reconstruction). Θ(n^3) time; Θ(n^2) space.
    """
    n = len(weights)
    D = [list(row) for row in weights]
    nxt: list[list[int | None]] = [[None] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i == j:
                nxt[i][j] = i
            elif D[i][j] != INF:
                nxt[i][j] = j
    for k in range(n):
        for i in range(n):
            for j in range(n):
                if D[i][k] + D[k][j] < D[i][j]:
                    D[i][j] = D[i][k] + D[k][j]
                    nxt[i][j] = nxt[i][k]
    return D, nxt


def floyd_path(nxt: Sequence[Sequence[int | None]], i: int, j: int) -> list[int]:
    """Vertex list of a shortest path from i to j using the ``next`` table ([] if none). Θ(n)."""
    if nxt[i][j] is None:
        return []
    path = [i]
    while i != j:
        i = nxt[i][j]  # type: ignore[assignment]
        path.append(i)
    return path


# ---------------------------------------------------------------------------
# Classic sequence DPs
# ---------------------------------------------------------------------------


def lcs(a: Sequence, b: Sequence) -> tuple[int, list]:
    """Longest Common Subsequence (LCS): (length, one LCS as a list).

    L[i][j] = L[i-1][j-1] + 1 if a_i = b_j else max(L[i-1][j], L[i][j-1])
    (Cormen, Leiserson, Rivest and Stein, *Introduction to Algorithms*, 3rd ed. (CLRS) §15.4; same DP style as Levitin §8.1). Θ(nm) time and space.
    """
    n, m = len(a), len(b)
    L = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if a[i - 1] == b[j - 1]:
                L[i][j] = L[i - 1][j - 1] + 1
            else:
                L[i][j] = max(L[i - 1][j], L[i][j - 1])
    out = []
    i, j = n, m
    while i > 0 and j > 0:
        if a[i - 1] == b[j - 1]:
            out.append(a[i - 1])
            i -= 1
            j -= 1
        elif L[i - 1][j] >= L[i][j - 1]:
            i -= 1
        else:
            j -= 1
    return L[n][m], out[::-1]


def edit_distance(a: Sequence, b: Sequence) -> int:
    """Minimum insertions, deletions and substitutions turning a into b (Levenshtein).

    E[i][j] = min(E[i-1][j] + 1, E[i][j-1] + 1, E[i-1][j-1] + [a_i != b_j]).
    Θ(nm) time and space.
    """
    n, m = len(a), len(b)
    E = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        E[i][0] = i
    for j in range(m + 1):
        E[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            E[i][j] = min(E[i - 1][j] + 1,
                          E[i][j - 1] + 1,
                          E[i - 1][j - 1] + (a[i - 1] != b[j - 1]))
    return E[n][m]


def lis_nlogn(A: Sequence) -> tuple[int, list]:
    """Longest strictly Increasing Subsequence (LIS) in O(n log n); returns (length, one LIS).

    Keep tails[k] = smallest possible last value of an increasing subsequence
    of length k + 1; binary-search where each new element goes (patience
    sorting idea). Θ(n log n) time; Θ(n) space.
    """
    tails: list = []        # values
    tail_idx: list[int] = []  # index in A of each tail
    parent = [-1] * len(A)
    for i, x in enumerate(A):
        k = bisect.bisect_left(tails, x)
        if k == len(tails):
            tails.append(x)
            tail_idx.append(i)
        else:
            tails[k] = x
            tail_idx[k] = i
        parent[i] = tail_idx[k - 1] if k > 0 else -1
    seq = []
    i = tail_idx[-1] if tail_idx else -1
    while i != -1:
        seq.append(A[i])
        i = parent[i]
    return len(tails), seq[::-1]
