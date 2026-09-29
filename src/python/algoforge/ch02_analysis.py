"""Chapter 2 - Fundamentals of the Analysis of Algorithm Efficiency.

Small algorithms whose basic operations are easy to count (Levitin §2.3 for
nonrecursive, §2.4 for recursive, §2.5 Fibonacci), plus helpers for empirical
analysis (§2.6) and for evaluating recurrences numerically.
"""

from __future__ import annotations

import math
import time
from typing import Any, Callable, Sequence

from .counters import OpCounter, tick

# ---------------------------------------------------------------------------
# Nonrecursive algorithms (Levitin §2.3)
# ---------------------------------------------------------------------------


def max_element(A: Sequence, counter: OpCounter | None = None):
    """Return the largest value in a nonempty sequence.

    Levitin §2.3 (MaxElement). Basic operation: comparison A[i] > maxval,
    done exactly n - 1 times. Time Θ(n); space O(1).
    """
    if len(A) == 0:
        raise ValueError("max_element of an empty sequence")
    maxval = A[0]
    for i in range(1, len(A)):
        tick(counter, "comparisons")
        if A[i] > maxval:
            maxval = A[i]
    return maxval


def unique_elements(A: Sequence, counter: OpCounter | None = None) -> bool:
    """Return True when no two elements of A are equal (pairwise check).

    Levitin §2.3 (UniqueElements). Basic operation: comparison A[i] = A[j].
    Worst case n(n-1)/2 comparisons, so Θ(n^2) time; space O(1).
    """
    n = len(A)
    for i in range(n - 1):
        for j in range(i + 1, n):
            tick(counter, "comparisons")
            if A[i] == A[j]:
                return False
    return True


def matrix_multiply(A: list[list], B: list[list], counter: OpCounter | None = None) -> list[list]:
    """Multiply matrices A (p x q) and B (q x r) with the definition-based triple loop.

    Levitin §2.3 (MatrixMultiplication). Basic operation: multiplication
    ("multiplications"), n^3 of them for square n x n input; also counts
    "additions". Time Θ(pqr); space Θ(pr).
    """
    p, q = len(A), len(A[0]) if A else 0
    if len(B) != q:
        raise ValueError("inner dimensions do not match")
    r = len(B[0]) if B else 0
    C = [[0] * r for _ in range(p)]
    for i in range(p):
        for j in range(r):
            total = 0
            for k in range(q):
                tick(counter, "multiplications")
                tick(counter, "additions")
                total = total + A[i][k] * B[k][j]
            C[i][j] = total
    return C


def binary_digits(n: int, counter: OpCounter | None = None) -> int:
    """Count the digits in the binary representation of a positive integer n.

    Levitin §2.3 (Binary). Basic operation: the comparison n > 1, executed
    floor(log2 n) + 1 times. Time Θ(log n); space O(1).
    """
    if n < 1:
        raise ValueError("binary_digits expects a positive integer")
    count = 1
    while True:
        tick(counter, "comparisons")
        if not n > 1:
            break
        count += 1
        n = n // 2
    return count


# ---------------------------------------------------------------------------
# Recursive algorithms (Levitin §2.4)
# ---------------------------------------------------------------------------


def binary_digits_recursive(n: int, counter: OpCounter | None = None) -> int:
    """Recursive binary digit count: BinRec(n) = BinRec(floor(n/2)) + 1.

    Levitin §2.4 (BinRec). Basic operation: the addition ("additions");
    A(n) = A(floor(n/2)) + 1, A(1) = 0, so A(n) = floor(log2 n).
    Time Θ(log n); space Θ(log n) for the call stack.
    """
    if n < 1:
        raise ValueError("binary_digits_recursive expects a positive integer")
    if n == 1:
        return 1
    result = binary_digits_recursive(n // 2, counter)
    tick(counter, "additions")
    return result + 1


def factorial(n: int, counter: OpCounter | None = None) -> int:
    """Compute n! recursively as F(n) = F(n - 1) * n, F(0) = 1.

    Levitin §2.4 (factorial). Basic operation: multiplication; M(n) = n.
    Time Θ(n) multiplications; space Θ(n) call stack.
    """
    if n < 0:
        raise ValueError("factorial expects a non-negative integer")
    if n == 0:
        return 1
    result = factorial(n - 1, counter)
    tick(counter, "multiplications")
    return result * n


def hanoi_moves(n: int, source: str = "A", target: str = "C", auxiliary: str = "B",
                counter: OpCounter | None = None) -> list[tuple[int, str, str]]:
    """List the moves (disk, from_peg, to_peg) that solve the Tower of Hanoi.

    Levitin §2.4 (Tower of Hanoi). Move n - 1 disks out of the way, move the
    largest, move the n - 1 disks back on top. M(n) = 2M(n - 1) + 1 = 2^n - 1.
    Time Θ(2^n); space Θ(n) recursion plus the Θ(2^n) output list.
    """
    moves: list[tuple[int, str, str]] = []

    def solve(k: int, src: str, dst: str, aux: str) -> None:
        if k == 0:
            return
        solve(k - 1, src, aux, dst)
        tick(counter, "moves")
        moves.append((k, src, dst))
        solve(k - 1, aux, dst, src)

    solve(n, source, target, auxiliary)
    return moves


# ---------------------------------------------------------------------------
# Fibonacci numbers four ways (Levitin §2.5)
# ---------------------------------------------------------------------------


def fib_recursive(n: int, counter: OpCounter | None = None) -> int:
    """F(n) straight from the definition F(n) = F(n-1) + F(n-2).

    Levitin §2.5. The number of additions A(n) = F(n+1) - 1 grows like
    phi^n, so time is exponential Θ(phi^n); space Θ(n) stack.
    """
    if n < 0:
        raise ValueError("fib_recursive expects n >= 0")
    if n <= 1:
        return n
    tick(counter, "additions")
    return fib_recursive(n - 1, counter) + fib_recursive(n - 2, counter)


def fib_iterative(n: int, counter: OpCounter | None = None) -> int:
    """F(n) by walking up from F(0), F(1), keeping only the last two values.

    Levitin §2.5 (the iterative algorithm). Time Θ(n) additions; space O(1).
    """
    if n < 0:
        raise ValueError("fib_iterative expects n >= 0")
    previous, current = 0, 1
    if n == 0:
        return 0
    for _ in range(n - 1):
        tick(counter, "additions")
        previous, current = current, previous + current
    return current


def fib_formula(n: int) -> int:
    """F(n) from Binet's closed form round(phi^n / sqrt(5)).

    Levitin §2.5 (explicit formula (2.11)). Time O(1) arithmetic operations,
    but floating-point precision limits it to n <= 70 here; space O(1).
    """
    if n < 0:
        raise ValueError("fib_formula expects n >= 0")
    if n > 70:
        raise ValueError("floating point is not precise enough beyond n = 70")
    phi = (1 + math.sqrt(5)) / 2
    return round(phi ** n / math.sqrt(5))


def _mat2_mult(X: list[list[int]], Y: list[list[int]], counter: OpCounter | None) -> list[list[int]]:
    tick(counter, "matrix_multiplications")
    return [
        [X[0][0] * Y[0][0] + X[0][1] * Y[1][0], X[0][0] * Y[0][1] + X[0][1] * Y[1][1]],
        [X[1][0] * Y[0][0] + X[1][1] * Y[1][0], X[1][0] * Y[0][1] + X[1][1] * Y[1][1]],
    ]


def fib_matrix(n: int, counter: OpCounter | None = None) -> int:
    """F(n) from the matrix identity [[1,1],[1,0]]^n = [[F(n+1),F(n)],[F(n),F(n-1)]].

    Levitin §2.5 (matrix method) combined with exponentiation by squaring
    (§4.4 / §6.5). Time Θ(log n) 2x2 matrix multiplications; space O(1).
    """
    if n < 0:
        raise ValueError("fib_matrix expects n >= 0")
    result = [[1, 0], [0, 1]]  # identity matrix
    base = [[1, 1], [1, 0]]
    while n > 0:
        if n % 2 == 1:
            result = _mat2_mult(result, base, counter)
        base = _mat2_mult(base, base, counter)
        n //= 2
    return result[0][1]


# ---------------------------------------------------------------------------
# OpCounter helpers and empirical analysis (Levitin §2.6)
# ---------------------------------------------------------------------------


def measure(func: Callable[..., Any], *args: Any, **kwargs: Any) -> tuple[Any, dict[str, int]]:
    """Run ``func(*args, counter=c, **kwargs)`` with a fresh counter.

    Levitin §2.6 (counting operations as an empirical metric). Returns
    ``(result, counts)`` where ``counts`` is a dict such as {"comparisons": 45}.
    Time and space: those of ``func`` plus O(1).
    """
    c = OpCounter()
    result = func(*args, counter=c, **kwargs)
    return result, c.snapshot()


def count_table(func: Callable[..., Any], make_input: Callable[[int], tuple],
                sizes: Sequence[int], operation: str) -> list[tuple[int, int]]:
    """Build a table (n, count of ``operation``) for several input sizes.

    Levitin §2.6 (plan of an empirical experiment). ``make_input(n)`` must
    return the positional-argument tuple for ``func``. Time: O(sum of the runs).
    """
    table = []
    for n in sizes:
        _, counts = measure(func, *make_input(n))
        table.append((n, counts.get(operation, 0)))
    return table


def time_function(func: Callable[..., Any], make_input: Callable[[int], tuple],
                  sizes: Sequence[int], repeats: int = 3) -> list[tuple[int, float]]:
    """Time ``func`` on inputs of each size; return (n, best seconds) pairs.

    Levitin §2.6 (measuring physical running time). Taking the best of
    several repeats reduces noise from the operating system. The input is
    rebuilt before every run so in-place algorithms get fresh data.
    Time: O(repeats x sum of the runs).
    """
    rows = []
    for n in sizes:
        best = math.inf
        for _ in range(repeats):
            args = make_input(n)
            start = time.perf_counter()
            func(*args)
            best = min(best, time.perf_counter() - start)
        rows.append((n, best))
    return rows


def growth_ratios(table: Sequence[tuple[int, float]]) -> list[float]:
    """Ratios value(n_{k+1}) / value(n_k) between consecutive table rows.

    Levitin §2.6: if n doubles and the ratio is about 2 the algorithm looks
    linear, about 4 looks quadratic, about 8 looks cubic. Time O(len(table)).
    """
    ratios = []
    for (_, a), (_, b) in zip(table, table[1:]):
        ratios.append(b / a if a else math.inf)
    return ratios


# ---------------------------------------------------------------------------
# Recurrence helpers (Levitin §2.4, Appendix B)
# ---------------------------------------------------------------------------


def evaluate_recurrence(step: Callable[[int, Callable[[int], float]], float],
                        initial: dict[int, float], n: int) -> float:
    """Evaluate a recurrence T(n) numerically with memoization.

    Levitin §2.4 / Appendix B. ``step(n, T)`` returns T(n) using calls to
    ``T(smaller)``; ``initial`` holds the base cases. Example for Hanoi:
    ``evaluate_recurrence(lambda n, T: 2 * T(n - 1) + 1, {1: 1}, 10) == 1023``.
    Time: O(one ``step`` call per distinct argument reached); space: O(memo size).
    Suitable for moderate n (Python's recursion limit applies).
    """
    memo: dict[int, float] = dict(initial)

    def T(k: int) -> float:
        if k not in memo:
            memo[k] = step(k, T)
        return memo[k]

    return T(n)


def recurrence_table(step: Callable[[int, Callable[[int], float]], float],
                     initial: dict[int, float], ns: Sequence[int]) -> list[tuple[int, float]]:
    """Return [(n, T(n)) for n in ns] - handy for guessing a closed form.

    Levitin §2.4 (method of backward substitutions, checked numerically).
    Time: O(distinct arguments reached), since the memo is shared.
    """
    memo: dict[int, float] = dict(initial)

    def T(k: int) -> float:
        if k not in memo:
            memo[k] = step(k, T)
        return memo[k]

    return [(n, T(n)) for n in ns]
