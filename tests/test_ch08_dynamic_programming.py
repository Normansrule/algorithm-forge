"""Tests for Chapter 8 - dynamic programming (brute-force oracles on small inputs)."""

import itertools
import math
import random
from collections import deque

import pytest

from algoforge import OpCounter
from algoforge import ch03_brute_force as bf
from algoforge import ch08_dynamic_programming as dp

INF = math.inf


def test_fib_dp():
    assert [dp.fib_dp(n) for n in range(10)] == [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]


def test_coin_row():
    assert dp.coin_row([5, 1, 2, 10, 6, 2]) == (17, [0, 3, 5])
    assert dp.coin_row([]) == (0, [])
    rng = random.Random(1)
    for _ in range(200):
        coins = [rng.randint(1, 20) for _ in range(rng.randint(1, 12))]
        n = len(coins)
        brute = max(sum(coins[i] for i in s) for r in range(n + 1)
                    for s in itertools.combinations(range(n), r)
                    if all(b - a > 1 for a, b in zip(s, s[1:])))
        value, chosen = dp.coin_row(coins)
        assert value == brute == sum(coins[i] for i in chosen)
        assert all(b - a > 1 for a, b in zip(chosen, chosen[1:]))


def test_change_making_vs_bfs():
    assert dp.change_making([1, 3, 4], 6) == (2, [3, 3])
    assert dp.change_making([5, 10], 3) == (None, [])
    rng = random.Random(2)
    for _ in range(150):
        denoms = sorted(set(rng.randint(1, 12) for _ in range(rng.randint(1, 4))))
        amount = rng.randint(0, 40)
        # BFS: fewest coins = fewest steps from 0 to amount
        dist = {0: 0}
        q = deque([0])
        while q:
            v = q.popleft()
            for d in denoms:
                if v + d <= amount and v + d not in dist:
                    dist[v + d] = dist[v] + 1
                    q.append(v + d)
        count, coins = dp.change_making(denoms, amount)
        if amount in dist:
            assert count == dist[amount] == len(coins) and sum(coins) == amount
        else:
            assert count is None


def test_robot_coin_collecting_vs_all_paths():
    board = [[0, 0, 0, 0, 1, 0], [0, 1, 0, 1, 0, 0], [0, 0, 0, 1, 0, 1],
             [0, 0, 1, 0, 0, 1], [1, 0, 0, 0, 1, 0]]
    coins, path = dp.robot_coin_collecting(board)
    assert coins == sum(board[i][j] for i, j in path)
    rng = random.Random(3)
    for _ in range(100):
        n, m = rng.randint(1, 5), rng.randint(1, 5)
        board = [[rng.randint(0, 1) for _ in range(m)] for _ in range(n)]
        best = 0
        for downs in itertools.combinations(range(n + m - 2), n - 1):
            i = j = 0
            total = board[0][0]
            for step in range(n + m - 2):
                if step in downs:
                    i += 1
                else:
                    j += 1
                total += board[i][j]
            best = max(best, total)
        coins, path = dp.robot_coin_collecting(board)
        assert coins == best == sum(board[i][j] for i, j in path)
        assert path[0] == (0, 0) and path[-1] == (n - 1, m - 1)
        assert all((b[0] - a[0], b[1] - a[1]) in {(1, 0), (0, 1)} for a, b in zip(path, path[1:]))


def test_grid_paths():
    for r in range(1, 7):
        for c in range(1, 7):
            assert dp.grid_paths(r, c) == math.comb(r + c - 2, r - 1)
    assert dp.grid_paths(3, 3, {(1, 1)}) == 2
    assert dp.grid_paths(2, 2, {(0, 0)}) == 0


def test_binomial_coefficient():
    for n in range(0, 20):
        for k in range(0, n + 1):
            assert dp.binomial_coefficient(n, k) == math.comb(n, k)
    assert dp.binomial_coefficient(3, 5) == 0
    c = OpCounter()
    dp.binomial_coefficient(10, 4, c)
    assert c["additions"] == (4 - 1) * 4 // 2 + 4 * (10 - 4)  # Levitin's A(n, k) formula


def test_knapsack_dp_and_memory_function():
    w, v = [2, 1, 3, 2], [12, 10, 20, 15]
    assert dp.knapsack_dp(w, v, 5) == (37, [0, 1, 3])
    table = dp.knapsack_table(w, v, 5)
    assert table[4] == [0, 10, 15, 25, 30, 37]
    value, cells = dp.knapsack_memory_function(w, v, 5)
    assert value == 37 and len(cells) < 4 * 5
    rng = random.Random(4)
    for _ in range(150):
        n = rng.randint(0, 8)
        w = [rng.randint(1, 10) for _ in range(n)]
        v = [rng.randint(1, 30) for _ in range(n)]
        W = rng.randint(0, 25)
        best, _ = bf.knapsack_exhaustive(w, v, W)
        value, items = dp.knapsack_dp(w, v, W)
        assert value == best
        assert sum(w[i] for i in items) <= W and sum(v[i] for i in items) == value
        mf_value, cells = dp.knapsack_memory_function(w, v, W)
        assert mf_value == best and len(cells) <= n * W
        assert all(1 <= i <= n and 1 <= j <= W for i, j in cells)


def all_bst_costs(p, i, j, depth=1):
    """Yield the weighted comparison cost of every BST on keys i..j (1-based)."""
    if i > j:
        yield 0
        return
    for k in range(i, j + 1):
        for left in all_bst_costs(p, i, k - 1, depth + 1):
            for right in all_bst_costs(p, k + 1, j, depth + 1):
                yield p[k - 1] * depth + left + right


def test_optimal_bst_vs_every_tree():
    cost, C, R = dp.optimal_bst([0.1, 0.2, 0.4, 0.3])
    assert math.isclose(cost, 1.7) and R[1][4] == 3
    assert dp.optimal_bst_tree(R, 1, 4, "ABCD") == ("C", ("B", ("A", None, None), None), ("D", None, None))
    rng = random.Random(5)
    for _ in range(60):
        n = rng.randint(1, 6)
        p = [rng.randint(1, 9) for _ in range(n)]
        cost, C, R = dp.optimal_bst(p)
        assert math.isclose(cost, min(all_bst_costs(p, 1, n)))
        tree = dp.optimal_bst_tree(R, 1, n)

        def weighted(t, d=1):
            return 0 if t is None else p[t[0] - 1] * d + weighted(t[1], d + 1) + weighted(t[2], d + 1)

        assert math.isclose(weighted(tree), cost)
    assert dp.optimal_bst([])[0] == 0


def reachability(adj):
    n = len(adj)
    R = [[0] * n for _ in range(n)]
    for s in range(n):
        stack = [v for v in range(n) if adj[s][v]]
        seen = set(stack)
        while stack:
            u = stack.pop()
            R[s][u] = 1
            for v in range(n):
                if adj[u][v] and v not in seen:
                    seen.add(v)
                    stack.append(v)
    return R


def test_warshall_vs_dfs_reachability():
    rng = random.Random(6)
    for _ in range(100):
        n = rng.randint(1, 7)
        adj = [[1 if rng.random() < 0.3 else 0 for _ in range(n)] for _ in range(n)]
        assert dp.warshall(adj) == reachability(adj)


def test_floyd_vs_bellman_ford_style_relaxation():
    W = [[0, INF, 3, INF], [2, 0, INF, INF], [INF, 7, 0, 1], [6, INF, INF, 0]]
    assert dp.floyd(W) == [[0, 10, 3, 4], [2, 0, 5, 6], [7, 7, 0, 1], [6, 16, 9, 0]]
    rng = random.Random(7)
    for _ in range(80):
        n = rng.randint(1, 7)
        W = [[0 if i == j else (rng.randint(1, 20) if rng.random() < 0.4 else INF) for j in range(n)]
             for i in range(n)]
        D, nxt = dp.floyd_with_paths(W)
        for s in range(n):
            dist = [INF] * n
            dist[s] = 0
            for _ in range(n):
                for u in range(n):
                    for v in range(n):
                        if dist[u] + W[u][v] < dist[v]:
                            dist[v] = dist[u] + W[u][v]
            assert D[s] == dist
            for t in range(n):
                path = dp.floyd_path(nxt, s, t)
                if dist[t] == INF:
                    assert path == []
                else:
                    assert path[0] == s and path[-1] == t
                    assert sum(W[a][b] for a, b in zip(path, path[1:])) == dist[t]


def is_subsequence(sub, seq):
    it = iter(seq)
    return all(ch in it for ch in sub)


def test_lcs_vs_brute_force():
    assert dp.lcs("ABCBDAB", "BDCABA")[0] == 4
    rng = random.Random(8)
    for _ in range(150):
        a = "".join(rng.choice("abc") for _ in range(rng.randint(0, 8)))
        b = "".join(rng.choice("abc") for _ in range(rng.randint(0, 8)))
        best = max((r for r in range(len(a) + 1) for s in itertools.combinations(a, r)
                    if is_subsequence(s, b)), default=0)
        length, seq = dp.lcs(a, b)
        assert length == best == len(seq)
        assert is_subsequence(seq, a) and is_subsequence(seq, b)


def edit_distance_bfs(a, b, alphabet):
    """Fewest single edits from a to b, by Breadth-First Search over strings."""
    limit = max(len(a), len(b)) + 1
    dist = {a: 0}
    q = deque([a])
    while q:
        s = q.popleft()
        if s == b:
            return dist[s]
        nbrs = set()
        for i in range(len(s) + 1):
            if len(s) < limit:
                for ch in alphabet:
                    nbrs.add(s[:i] + ch + s[i:])
            if i < len(s):
                nbrs.add(s[:i] + s[i + 1:])
                for ch in alphabet:
                    nbrs.add(s[:i] + ch + s[i + 1:])
        for t in nbrs:
            if t not in dist:
                dist[t] = dist[s] + 1
                q.append(t)


def test_edit_distance():
    assert dp.edit_distance("kitten", "sitting") == 3
    assert dp.edit_distance("", "abc") == 3
    rng = random.Random(9)
    for _ in range(80):
        a = "".join(rng.choice("ab") for _ in range(rng.randint(0, 4)))
        b = "".join(rng.choice("ab") for _ in range(rng.randint(0, 4)))
        assert dp.edit_distance(a, b) == edit_distance_bfs(a, b, "ab")


def test_lis_nlogn_vs_brute():
    rng = random.Random(10)
    for _ in range(200):
        A = [rng.randint(0, 15) for _ in range(rng.randint(0, 11))]
        best = max((r for r in range(len(A) + 1) for s in itertools.combinations(A, r)
                    if all(x < y for x, y in zip(s, s[1:]))), default=0)
        length, seq = dp.lis_nlogn(A)
        assert length == best == len(seq)
        assert all(x < y for x, y in zip(seq, seq[1:])) and is_subsequence(seq, A)
