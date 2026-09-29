"""Chapter 11 - Limitations of Algorithm Power.

How do we know an algorithm cannot be improved? Lower-bound arguments
(Levitin §11.1), decision trees (§11.2), and the theory of P (Polynomial time),
NP (Nondeterministic Polynomial time) and NP-complete problems (§11.3), where a problem is shown hard by *reducing* a
known hard problem to it.

Conjunctive Normal Form (CNF) formulas use the convention of the Center for
Discrete Mathematics and Theoretical Computer Science (DIMACS) file format: a clause is a list of non-zero ints,
``3`` means x3 and ``-3`` means NOT x3. Variables are numbered 1..n.
"""

from __future__ import annotations

import itertools
from typing import Hashable, Sequence

from .counters import OpCounter, tick
from .ch03_brute_force import partition_exhaustive

Clause = Sequence[int]

# ---------------------------------------------------------------------------
# Decision-tree lower bounds (Levitin §11.2)
# ---------------------------------------------------------------------------


def ceil_log2(x: int) -> int:
    """Exact ceil(log2 x) for a positive integer x (no floating point). O(log x)."""
    if x < 1:
        raise ValueError("x must be positive")
    return (x - 1).bit_length()


def sorting_lower_bound(n: int) -> int:
    """Minimum worst-case comparisons for any comparison sort: ceil(log2 n!).

    Levitin §11.2: a decision tree that sorts n items needs n! leaves, and a
    binary tree with L leaves has height >= ceil(log2 L). Exact integer
    arithmetic. O(n log n) bit operations.
    """
    fact = 1
    for k in range(2, n + 1):
        fact *= k
    return ceil_log2(fact)


def searching_lower_bound(n: int) -> int:
    """Minimum worst-case three-way comparisons to search a sorted array: ceil(log2(n + 1)).

    Levitin §11.2 (ternary decision trees for searching sorted arrays; binary
    search meets this bound). O(log n).
    """
    return ceil_log2(n + 1)


def decision_tree_min_height(leaves: int, branching: int = 2) -> int:
    """Smallest height of a tree with the given branching factor and at least ``leaves`` leaves.

    Levitin §11.2 (inequality h >= ceil(log_b L)). Integer loop, no rounding
    errors. O(log leaves).
    """
    if leaves < 1 or branching < 2:
        raise ValueError("need leaves >= 1 and branching >= 2")
    h, capacity = 0, 1
    while capacity < leaves:
        capacity *= branching
        h += 1
    return h


# ---------------------------------------------------------------------------
# Satisfiability: search versus verification (Levitin §11.3)
# ---------------------------------------------------------------------------


def verify_cnf(clauses: Sequence[Clause], assignment: dict[int, bool]) -> bool:
    """Check a truth assignment against a CNF formula - polynomial time (the "NP" part).

    Levitin §11.3 (a certificate can be verified quickly). Θ(total literals).
    """
    for clause in clauses:
        if not any(assignment[abs(lit)] == (lit > 0) for lit in clause):
            return False
    return True


def cnf_sat_brute(clauses: Sequence[Clause], n_vars: int,
                  counter: OpCounter | None = None) -> tuple[dict[int, bool] | None, int]:
    """Try all 2^n truth assignments; return (first satisfying assignment or None, number tried).

    Levitin §11.3 (CNF-satisfiability by exhaustive search). Θ(2^n · size)
    time; Θ(n) space.
    """
    tried = 0
    for bits in itertools.product([False, True], repeat=n_vars):
        tried += 1
        tick(counter, "assignments")
        assignment = {i + 1: bits[i] for i in range(n_vars)}
        if verify_cnf(clauses, assignment):
            return assignment, tried
    return None, tried


def verify_vertex_cover(edges: Sequence[tuple[Hashable, Hashable]], cover: Sequence[Hashable],
                        k: int | None = None) -> bool:
    """True when every edge has an endpoint in cover (and |cover| <= k if k is given).

    Levitin §11.3 (verification for the vertex-cover decision problem).
    Θ(|E| + |cover|).
    """
    chosen = set(cover)
    if k is not None and len(chosen) > k:
        return False
    return all(u in chosen or v in chosen for u, v in edges)


def vertex_cover_brute(vertices: Sequence[Hashable], edges: Sequence[tuple[Hashable, Hashable]],
                       k: int) -> list[Hashable] | None:
    """A vertex cover of size <= k found by trying subsets, or None. Θ(C(n, k) · |E|)."""
    for size in range(k + 1):
        for subset in itertools.combinations(vertices, size):
            if verify_vertex_cover(edges, subset):
                return list(subset)
    return None


def reduce_3sat_to_vertex_cover(clauses: Sequence[Clause], n_vars: int):
    """Build a graph that has a vertex cover of size k = n + 2m iff the 3-CNF formula is satisfiable.

    Classic reduction (Levitin §11.3 discusses reductions; construction as in
    Garey & Johnson). Gadgets:
      * each variable i gives an edge ("x", i, True) - ("x", i, False);
      * each clause j gives a triangle on ("c", j, 0..2);
      * clause corner ("c", j, t) is joined to the variable vertex of its literal.
    Returns (vertices, edges, k). Polynomial: Θ(n + m) vertices and edges.
    """
    vertices: list = []
    edges: list = []
    for i in range(1, n_vars + 1):
        vertices += [("x", i, True), ("x", i, False)]
        edges.append((("x", i, True), ("x", i, False)))
    for j, clause in enumerate(clauses):
        if len(clause) != 3:
            raise ValueError("every clause must have exactly 3 literals")
        corners = [("c", j, t) for t in range(3)]
        vertices += corners
        edges += [(corners[0], corners[1]), (corners[1], corners[2]), (corners[0], corners[2])]
        for t, lit in enumerate(clause):
            edges.append((corners[t], ("x", abs(lit), lit > 0)))
    return vertices, edges, n_vars + 2 * len(clauses)


# ---------------------------------------------------------------------------
# Subset-sum and partition reduce to each other
# ---------------------------------------------------------------------------


def subset_sum_brute(nums: Sequence[int], target: int) -> list[int] | None:
    """Indices of a subset summing to target, by trying all subsets, or None. Θ(n 2^n)."""
    for r in range(len(nums) + 1):
        for subset in itertools.combinations(range(len(nums)), r):
            if sum(nums[i] for i in subset) == target:
                return list(subset)
    return None


def partition_to_subset_sum(nums: Sequence[int]) -> tuple[list[int], int]:
    """Partition instance -> subset-sum instance (same numbers, target = half the total).

    Levitin §11.3 (reductions between decision problems). An odd total can
    never be split, so it maps to an impossible target (total + 1). Θ(n).
    """
    total = sum(nums)
    if total % 2:
        return list(nums), total + 1
    return list(nums), total // 2


def subset_sum_to_partition(nums: Sequence[int], target: int) -> list[int]:
    """Subset-sum instance (non-negative nums, target) -> equivalent partition instance.

    With S = sum(nums), add the two numbers 2S - t and S + t. They total 3S >
    half of 4S, so they fall on opposite sides, and the side holding 2S - t
    needs exactly t more from the original numbers. Targets outside [0, S]
    are impossible, so they map to the unsplittable instance [1]. Θ(n).
    """
    S = sum(nums)
    if target < 0 or target > S:
        return [1]
    return list(nums) + [2 * S - target, S + target]


def partition_brute(nums: Sequence[int]) -> bool:
    """True when nums can be split into two equal-sum parts (exhaustive). Θ(n 2^n)."""
    return partition_exhaustive(nums) is not None
