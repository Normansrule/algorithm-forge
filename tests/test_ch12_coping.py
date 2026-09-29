"""Tests for Chapter 12 - coping with the limitations of algorithm power."""

import itertools
import math
import random

import pytest

from algoforge import ch03_brute_force as bf
from algoforge import ch12_coping as cp

QUEENS = {1: 1, 2: 0, 3: 0, 4: 2, 5: 10, 6: 4, 7: 40, 8: 92}


@pytest.mark.parametrize("n,count", QUEENS.items())
def test_n_queens_counts(n, count):
    sols, nodes = cp.n_queens(n)
    assert len(sols) == count == len(set(sols))
    for s in sols:
        assert sorted(s) == list(range(n))
        assert len({r - c for r, c in enumerate(s)}) == n == len({r + c for r, c in enumerate(s)})
    brute_nodes = sum(n ** k for k in range(n + 1))  # full tree without pruning
    assert nodes <= brute_nodes and (nodes < brute_nodes or n <= 2)


def test_n_queens_first_solution_for_4():
    sols, _ = cp.n_queens(4)
    assert sols[0] == (1, 3, 0, 2)


def test_subset_sum_backtracking_vs_brute():
    sols, nodes = cp.subset_sum_backtracking([3, 5, 6, 7], 15)
    assert sols == [[0, 1, 3]]
    rng = random.Random(1)
    for _ in range(150):
        nums = [rng.randint(1, 15) for _ in range(rng.randint(0, 9))]
        target = rng.randint(1, 40)
        sols, _ = cp.subset_sum_backtracking(nums, target)
        truth = sorted(list(c) for r in range(len(nums) + 1)
                       for c in itertools.combinations(range(len(nums)), r)
                       if sum(nums[i] for i in c) == target)
        assert sorted(sols) == truth
    with pytest.raises(ValueError):
        cp.subset_sum_backtracking([0, 1], 1)


def test_hamiltonian_circuit():
    g = {"a": ["b", "c", "d"], "b": ["a", "c", "f"], "c": ["a", "b", "d", "e"],
         "d": ["a", "c", "e"], "e": ["c", "d", "f"], "f": ["b", "e"]}
    circuit, nodes = cp.hamiltonian_circuit(g, "a")
    assert circuit[0] == circuit[-1] == "a" and sorted(circuit[:-1]) == sorted(g)
    assert all(v in g[u] for u, v in zip(circuit, circuit[1:]))
    rng = random.Random(2)
    for _ in range(100):
        n = rng.randint(1, 7)
        g = {v: [] for v in range(n)}
        for u, v in itertools.combinations(range(n), 2):
            if rng.random() < 0.5:
                g[u].append(v)
                g[v].append(u)
        circuit, _ = cp.hamiltonian_circuit(g, 0)
        exists = n >= 3 and any(all(b in g[a] for a, b in zip((0,) + p, p + (0,)))
                                for p in itertools.permutations(range(1, n)))
        assert (circuit is not None) == exists
        if circuit:
            assert all(v in g[u] for u, v in zip(circuit, circuit[1:]))
    assert cp.hamiltonian_circuit({}) == (None, 0)


def test_assignment_branch_and_bound_vs_exhaustive():
    C = [[9, 2, 7, 8], [6, 4, 3, 7], [5, 8, 1, 8], [7, 6, 9, 4]]
    cost, jobs, nodes = cp.assignment_branch_and_bound(C)
    assert cost == 13 and jobs == [1, 0, 2, 3] and nodes < 1 + 4 + 12 + 24 + 24
    rng = random.Random(3)
    for _ in range(80):
        n = rng.randint(1, 6)
        C = [[rng.randint(1, 20) for _ in range(n)] for _ in range(n)]
        cost, jobs, _ = cp.assignment_branch_and_bound(C)
        assert cost == bf.assignment_exhaustive(C)[0] == sum(C[i][jobs[i]] for i in range(n))
        assert sorted(jobs) == list(range(n))


def test_knapsack_branch_and_bound_vs_exhaustive():
    value, items, nodes = cp.knapsack_branch_and_bound([4, 7, 5, 3], [40, 42, 25, 12], 10)
    assert value == 65 and items == [0, 2]
    rng = random.Random(4)
    for _ in range(150):
        n = rng.randint(0, 8)
        w = [rng.randint(1, 10) for _ in range(n)]
        v = [rng.randint(1, 30) for _ in range(n)]
        W = rng.randint(0, 25)
        value, items, _ = cp.knapsack_branch_and_bound(w, v, W)
        assert value == bf.knapsack_exhaustive(w, v, W)[0]
        assert sum(w[i] for i in items) <= W and sum(v[i] for i in items) == value


def random_euclidean(rng, n):
    pts = [(rng.uniform(0, 100), rng.uniform(0, 100)) for _ in range(n)]
    return [[math.dist(p, q) for q in pts] for p in pts]


def test_tsp_heuristics():
    rng = random.Random(5)
    for _ in range(40):
        n = rng.randint(3, 8)
        D = random_euclidean(rng, n)
        opt, _ = bf.tsp_exhaustive(D)
        for algo in (cp.tsp_nearest_neighbor, cp.tsp_twice_around_tree):
            cost, tour = algo(D)
            assert tour[0] == tour[-1] == 0 and sorted(tour[:-1]) == list(range(n))
            assert math.isclose(cost, bf.tour_cost(D, tour))
            assert cost >= opt - 1e-9
        cost_t, _ = cp.tsp_twice_around_tree(D)
        assert cost_t <= 2 * opt + 1e-9  # guaranteed for Euclidean instances
        start_cost, start_tour = cp.tsp_nearest_neighbor(D)
        improved_cost, improved = cp.tsp_two_opt(D, start_tour)
        assert improved_cost <= start_cost + 1e-9
        assert sorted(improved[:-1]) == list(range(n)) and improved[0] == improved[-1]


def test_nearest_neighbor_textbook_style():
    D = [[0, 1, 3, 6], [1, 0, 2, 3], [3, 2, 0, 1], [6, 3, 1, 0]]
    assert cp.tsp_nearest_neighbor(D) == (10, [0, 1, 2, 3, 0])
    assert bf.tsp_exhaustive(D)[0] == 8


def test_knapsack_approximations():
    rng = random.Random(6)
    for _ in range(100):
        n = rng.randint(1, 8)
        w = [rng.randint(1, 10) for _ in range(n)]
        v = [rng.randint(1, 30) for _ in range(n)]
        W = rng.randint(1, 25)
        opt = bf.knapsack_exhaustive(w, v, W)[0]
        g, items = cp.knapsack_greedy_approx(w, v, W)
        assert g <= opt and sum(w[i] for i in items) <= W
        assert 2 * g >= opt  # enhanced greedy is a 2-approximation
        for k in range(0, 4):
            val, items = cp.knapsack_approximation_scheme(w, v, W, k)
            assert sum(w[i] for i in items) <= W and sum(v[i] for i in items) == val
            assert val <= opt and val * (1 + 1 / k if k else 2) >= opt - 1e-9
        assert cp.knapsack_approximation_scheme(w, v, W, n)[0] == opt
    plain, _ = cp.knapsack_greedy_approx([1, 10], [2, 10], 10, enhanced=False)
    assert plain == 2  # plain greedy can be terrible
    assert cp.knapsack_greedy_approx([1, 10], [2, 10], 10)[0] == 10


def test_bin_packing():
    items = [0.4, 0.7, 0.2, 0.1, 0.5]
    assert cp.first_fit(items) == [[0.4, 0.2, 0.1], [0.7], [0.5]]
    assert cp.first_fit_decreasing(items) == [[0.7, 0.2, 0.1], [0.5, 0.4]]
    rng = random.Random(7)
    for _ in range(100):
        items = [rng.randint(1, 10) for _ in range(rng.randint(0, 20))]
        for algo in (cp.first_fit, cp.first_fit_decreasing):
            bins = algo(items, 10)
            assert sorted(x for b in bins for x in b) == sorted(items)
            assert all(sum(b) <= 10 for b in bins)
            lower = math.ceil(sum(items) / 10)
            assert lower <= len(bins) <= 2 * lower + 1
    with pytest.raises(ValueError):
        cp.first_fit([2], 1)


def test_root_finding():
    f = lambda x: x ** 3 - x - 1  # noqa: E731  (real root near 1.3247)
    df = lambda x: 3 * x ** 2 - 1  # noqa: E731
    root = 1.324717957244746
    x, log = cp.bisection(f, 0, 2, tol=1e-9)
    assert abs(x - root) < 1e-8 and len(log) <= 32
    assert all(row[1] <= row[3] <= row[2] for row in log)
    x, log = cp.false_position(f, 0, 2, tol=1e-12)
    assert abs(x - root) < 1e-9
    x, log = cp.newton(f, df, 2.0)
    assert abs(x - root) < 1e-12 and len(log) < 10
    assert cp.bisection(lambda t: t, 0, 1) == (0, [])
    with pytest.raises(ValueError):
        cp.bisection(f, 2, 3)
    with pytest.raises(ValueError):
        cp.false_position(f, 2, 3)
    with pytest.raises(ZeroDivisionError):
        cp.newton(lambda t: t * t + 1, lambda t: 2 * t, 0.0)
    sqrt2, _ = cp.newton(lambda t: t * t - 2, lambda t: 2 * t, 1.0)
    assert math.isclose(sqrt2, math.sqrt(2))
