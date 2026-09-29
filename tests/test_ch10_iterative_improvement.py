"""Tests for Chapter 10 - iterative improvement."""

import itertools
import random
from fractions import Fraction

import pytest

from algoforge import ch06_transform_conquer as tc
from algoforge import ch10_iterative_improvement as ii


# ---------------------------------------------------------------- simplex
def lp_brute_force(c, A, b):
    """Best objective over all vertices of {x >= 0, Ax <= b} (vertex enumeration)."""
    m, n = len(A), len(c)
    rows = [list(map(Fraction, A[i])) + [Fraction(b[i])] for i in range(m)]
    rows += [[Fraction(1 if k == j else 0) for k in range(n)] + [Fraction(0)] for j in range(n)]
    # constraint j (j >= m) means -x <= 0, but as an equality it is x_j = 0, same hyperplane
    best = None
    for combo in itertools.combinations(range(len(rows)), n):
        M = [rows[k][:n] for k in combo]
        rhs = [rows[k][n] for k in combo]
        try:
            x = tc.solve_linear_system(M, rhs, partial_pivoting=True)
        except ValueError:
            continue
        if all(xi >= 0 for xi in x) and all(sum(A[i][j] * x[j] for j in range(n)) <= b[i] for i in range(m)):
            val = sum(c[j] * x[j] for j in range(n))
            best = val if best is None or val > best else best
    return best


def test_simplex_textbook_style_example():
    # maximize 3x + 5y  s.t.  x + y <= 4, x + 3y <= 6
    r = ii.simplex([3, 5], [[1, 1], [1, 3]], [4, 6])
    assert r.status == "optimal" and r.value == 14 and r.x == [3, 1]
    assert len(r.tableaux) == len(r.pivots) + 1
    assert r.tableaux[0][-1] == [-3, -5, 0, 0, 0]


def test_simplex_unbounded_and_bad_input():
    r = ii.simplex([1, 1], [[1, -1]], [2])
    assert r.status == "unbounded" and r.x is None
    with pytest.raises(ValueError):
        ii.simplex([1], [[1]], [-1])


@pytest.mark.parametrize("rule", ["dantzig", "bland"])
def test_simplex_vs_vertex_enumeration(rule):
    rng = random.Random(1 if rule == "dantzig" else 2)
    for _ in range(80):
        n, m = rng.randint(1, 3), rng.randint(1, 4)
        A = [[rng.randint(0, 6) for _ in range(n)] for _ in range(m)]
        for j in range(n):  # make sure every variable is bounded
            A[rng.randrange(m)][j] = rng.randint(1, 6)
        b = [rng.randint(0, 20) for _ in range(m)]
        c = [rng.randint(-3, 8) for _ in range(n)]
        r = ii.simplex(c, A, b, rule=rule)
        assert r.status == "optimal"
        assert r.value == lp_brute_force(c, A, b)
        assert all(xi >= 0 for xi in r.x)
        assert all(sum(A[i][j] * r.x[j] for j in range(n)) <= b[i] for i in range(m))


# ---------------------------------------------------------------- max flow
def min_cut_brute(cap, s, t):
    vertices = sorted(set(cap) | {v for u in cap for v in cap[u]})
    others = [v for v in vertices if v not in (s, t)]
    best = None
    for r in range(len(others) + 1):
        for extra in itertools.combinations(others, r):
            S = {s, *extra}
            value = sum(c for u in cap for v, c in cap[u].items() if u in S and v not in S)
            best = value if best is None or value < best else best
    return best


def test_max_flow_small_network():
    cap = {1: {2: 2, 4: 3}, 2: {3: 5, 5: 3}, 3: {6: 2}, 4: {3: 1}, 5: {6: 4}, 6: {}}
    r = ii.max_flow(cap, 1, 6)
    assert r.value == 3
    assert sum(cap[u][v] for u, v in r.cut_edges) == r.value
    assert 1 in r.source_side and 6 not in r.source_side


def test_max_flow_equals_min_cut_random():
    rng = random.Random(3)
    for _ in range(80):
        n = rng.randint(2, 7)
        cap = {u: {} for u in range(n)}
        for u in range(n):
            for v in range(n):
                if u != v and rng.random() < 0.35:
                    cap[u][v] = rng.randint(1, 10)
        r = ii.max_flow(cap, 0, n - 1)
        assert r.value == min_cut_brute(cap, 0, n - 1)
        assert sum(cap[u][v] for u, v in r.cut_edges) == r.value
        # flow feasibility: capacity and conservation
        for (u, v), f in r.flow.items():
            assert 0 <= f <= cap[u][v]
        for x in range(1, n - 1):
            inflow = sum(f for (u, v), f in r.flow.items() if v == x)
            outflow = sum(f for (u, v), f in r.flow.items() if u == x)
            assert inflow == outflow
        out_s = sum(f for (u, v), f in r.flow.items() if u == 0) - sum(f for (u, v), f in r.flow.items() if v == 0)
        assert out_s == r.value


# ---------------------------------------------------------------- matching
def max_matching_brute(edges):
    for r in range(len(edges), 0, -1):
        for sub in itertools.combinations(edges, r):
            lefts = [u for u, _ in sub]
            rights = [v for _, v in sub]
            if len(set(lefts)) == r and len(set(rights)) == r:
                return r
    return 0


def test_bipartite_matching_vs_brute():
    left, right = [1, 2, 3, 4, 5], ["a", "b", "c", "d", "e"]
    edges = [(1, "a"), (1, "b"), (2, "a"), (2, "c"), (3, "c"), (3, "d"), (4, "d"), (5, "d"), (5, "e")]
    assert len(ii.bipartite_max_matching(left, right, edges)) == 5
    rng = random.Random(4)
    for _ in range(100):
        L = list(range(rng.randint(0, 5)))
        R = [f"r{j}" for j in range(rng.randint(0, 5))]
        edges = [(u, v) for u in L for v in R if rng.random() < 0.4]
        m = ii.bipartite_max_matching(L, R, edges)
        assert len(m) == max_matching_brute(edges)
        assert set(m) <= set(edges)
        assert len({u for u, _ in m}) == len(m) == len({v for _, v in m})


# ---------------------------------------------------------------- stable marriage
def test_gale_shapley_small():
    men = {"Bob": ["Lea", "Ann", "Sue"], "Jim": ["Lea", "Sue", "Ann"], "Tom": ["Sue", "Lea", "Ann"]}
    women = {"Ann": ["Jim", "Tom", "Bob"], "Lea": ["Tom", "Bob", "Jim"], "Sue": ["Jim", "Tom", "Bob"]}
    matching, log = ii.gale_shapley(men, women)
    assert matching == {"Bob": "Ann", "Jim": "Sue", "Tom": "Lea"}
    assert ii.is_stable(matching, men, women)
    assert log[0] == ii.Proposal("Bob", "Lea", True, None)
    assert sum(p.accepted for p in log) - sum(p.replaced is not None for p in log) == 3


def test_gale_shapley_man_optimal_vs_all_matchings():
    rng = random.Random(5)
    for _ in range(80):
        n = rng.randint(1, 5)
        men_names = [f"m{i}" for i in range(n)]
        women_names = [f"w{i}" for i in range(n)]
        men = {m: rng.sample(women_names, n) for m in men_names}
        women = {w: rng.sample(men_names, n) for w in women_names}
        matching, log = ii.gale_shapley(men, women)
        assert ii.is_stable(matching, men, women)
        assert sorted(matching.values()) == sorted(women_names)
        assert len(log) <= n * n - n + 1  # Levitin's bound on proposals
        stable = []
        for perm in itertools.permutations(women_names):
            cand = dict(zip(men_names, perm))
            if ii.is_stable(cand, men, women):
                stable.append(cand)
        for m in men_names:  # every man gets his best stable partner
            best = min(stable, key=lambda s: men[m].index(s[m]))[m]
            assert matching[m] == best
