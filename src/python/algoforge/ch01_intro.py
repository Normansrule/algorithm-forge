"""Chapter 1 - Introduction: what an algorithm is, told through the greatest
common divisor (gcd) and a few classic warm-ups.

Levitin §1.1 presents three different ways to compute gcd(m, n). They solve the
same problem with very different speed, which is the whole point of studying algorithms.
"""

from __future__ import annotations

from .counters import OpCounter, tick


def gcd_euclid(m: int, n: int, counter: OpCounter | None = None) -> int:
    """Greatest common divisor by Euclid's rule gcd(m, n) = gcd(n, m mod n).

    Levitin §1.1 (Euclid's algorithm). Basic operation: the ``mod`` ("divisions").
    Time O(log min(m, n)) divisions; space O(1).
    Works for any non-negative integers that are not both zero.
    """
    if m < 0 or n < 0:
        raise ValueError("gcd_euclid expects non-negative integers")
    if m == 0 and n == 0:
        raise ValueError("gcd(0, 0) is undefined")
    while n != 0:
        tick(counter, "divisions")
        m, n = n, m % n
    return m


def gcd_consecutive_integer(m: int, n: int, counter: OpCounter | None = None) -> int:
    """gcd by trying t = min(m, n), min - 1, ... until t divides both numbers.

    Levitin §1.1 (consecutive integer checking). Basic operation: each trial
    division ("divisions"). Time O(min(m, n)) in the worst case; space O(1).
    Needs both inputs positive - with a 0 the method never stops correctly,
    a pitfall the book points out.
    """
    if m <= 0 or n <= 0:
        raise ValueError("consecutive integer checking needs positive integers")
    t = min(m, n)
    while True:
        tick(counter, "divisions")
        if m % t == 0:
            tick(counter, "divisions")
            if n % t == 0:
                return t
        t -= 1


def sieve_of_eratosthenes(n: int, counter: OpCounter | None = None) -> list[int]:
    """Return every prime number <= n by crossing out multiples.

    Levitin §1.1 (sieve of Eratosthenes). Basic operation: crossing out a
    number ("eliminations"). Time O(n log log n); space O(n).
    """
    if n < 2:
        return []
    is_candidate = [True] * (n + 1)
    is_candidate[0] = is_candidate[1] = False
    p = 2
    while p * p <= n:
        if is_candidate[p]:
            # Multiples below p*p were already crossed out by smaller primes.
            for multiple in range(p * p, n + 1, p):
                if is_candidate[multiple]:
                    tick(counter, "eliminations")
                is_candidate[multiple] = False
        p += 1
    return [i for i in range(2, n + 1) if is_candidate[i]]


def prime_factors(n: int) -> list[int]:
    """Return the prime factors of n (with repetition) in nondecreasing order.

    Levitin §1.1 (step 1 and 2 of the middle-school procedure). Uses the sieve
    to get candidate primes up to sqrt(n). Time O(sqrt(n) log log n); space O(sqrt(n)).
    """
    if n < 1:
        raise ValueError("prime_factors expects a positive integer")
    factors: list[int] = []
    for p in sieve_of_eratosthenes(integer_sqrt(n)):
        while n % p == 0:
            factors.append(p)
            n //= p
    if n > 1:  # whatever is left is itself a prime larger than sqrt(original n)
        factors.append(n)
    return factors


def gcd_middle_school(m: int, n: int) -> int:
    """gcd as the product of the prime factors common to m and n.

    Levitin §1.1 (middle-school procedure, with the sieve generating primes).
    Time is dominated by factoring: O(sqrt(N) log log N) for N = max(m, n);
    space O(sqrt(N)).
    """
    if m <= 0 or n <= 0:
        raise ValueError("the middle-school procedure needs positive integers")
    fm, fn = prime_factors(m), prime_factors(n)
    # Walk both sorted factor lists like the merge step of mergesort.
    i = j = 0
    result = 1
    while i < len(fm) and j < len(fn):
        if fm[i] == fn[j]:
            result *= fm[i]
            i += 1
            j += 1
        elif fm[i] < fn[j]:
            i += 1
        else:
            j += 1
    return result


def integer_sqrt(n: int, counter: OpCounter | None = None) -> int:
    """Return floor(sqrt(n)) by squaring k = 0, 1, 2, ... until k*k exceeds n.

    Levitin Exercise 1.1 (integer square root by a simple procedure).
    Basic operation: squaring ("multiplications"). Time O(sqrt(n)); space O(1).
    """
    if n < 0:
        raise ValueError("integer_sqrt expects a non-negative integer")
    k = 0
    while True:
        tick(counter, "multiplications")
        if (k + 1) * (k + 1) > n:
            return k
        k += 1


def locker_doors(n: int, counter: OpCounter | None = None) -> list[int]:
    """Simulate the locker-doors puzzle; return the numbers of doors left open.

    Levitin Exercise 1.1.12. On pass i every i-th door is toggled. The answer
    turns out to be the perfect squares (a door has an odd number of divisors
    only when its number is a square). Basic operation: a toggle ("toggles").
    Time O(n log n) toggles (harmonic sum); space O(n).
    """
    is_open = [False] * (n + 1)
    for i in range(1, n + 1):
        for door in range(i, n + 1, i):
            tick(counter, "toggles")
            is_open[door] = not is_open[door]
    return [d for d in range(1, n + 1) if is_open[d]]
