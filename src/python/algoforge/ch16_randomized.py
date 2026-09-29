"""Chapter 16 (Beyond Levitin) - Randomized, Amortized and Streaming Algorithms.

Randomness can defeat worst-case inputs (randomized quicksort), sample fairly
(Fisher-Yates, reservoir sampling), trade exactness for tiny memory (Bloom
filter, Count-Min sketch), or test primality fast (Miller-Rabin). Every
function takes an optional ``random.Random`` so results are reproducible.
"""

from __future__ import annotations

import hashlib
import math
import random
from typing import Hashable, Iterable, Sequence

from .counters import OpCounter, tick


def randomized_quicksort(A: Sequence, rng: random.Random | None = None,
                         counter: OpCounter | None = None) -> list:
    """Quicksort with a uniformly random pivot; returns a sorted copy.

    Cormen, Leiserson, Rivest and Stein, *Introduction to Algorithms*, 3rd ed. (CLRS) §7.3. No fixed input is bad any more: the EXPECTED number of
    comparisons is about 2 n ln n ≈ 1.39 n log2 n for every input.
    Three-way partitioning keeps many equal keys fast. Expected Θ(n log n).
    """
    rng = rng or random.Random()
    A = list(A)

    def sort(lo: int, hi: int) -> None:
        while lo < hi:
            p = A[rng.randint(lo, hi)]
            lt, i, gt = lo, lo, hi  # A[lo..lt-1] < p, A[lt..i-1] == p, A[gt+1..hi] > p
            while i <= gt:
                tick(counter, "comparisons")
                if A[i] < p:
                    A[lt], A[i] = A[i], A[lt]
                    lt += 1
                    i += 1
                elif A[i] > p:
                    A[i], A[gt] = A[gt], A[i]
                    gt -= 1
                else:
                    i += 1
            # recurse on the smaller side, loop on the larger (O(log n) stack)
            if lt - lo < hi - gt:
                sort(lo, lt - 1)
                lo = gt + 1
            else:
                sort(gt + 1, hi)
                hi = lt - 1

    sort(0, len(A) - 1)
    return A


def fisher_yates_shuffle(A: Sequence, rng: random.Random | None = None) -> list:
    """Uniformly random permutation: swap each position with a random earlier-or-same one.

    Knuth's Algorithm P (Fisher-Yates). Each of the n! orders is equally
    likely. Θ(n) time; returns a shuffled copy.
    """
    rng = rng or random.Random()
    A = list(A)
    for i in range(len(A) - 1, 0, -1):
        j = rng.randint(0, i)
        A[i], A[j] = A[j], A[i]
    return A


def reservoir_sample(stream: Iterable, k: int, rng: random.Random | None = None) -> list:
    """k items chosen uniformly from a stream of unknown length, using O(k) memory.

    Vitter's Algorithm R: keep the first k; the i-th item (1-based, i > k)
    replaces a random slot with probability k / i. Θ(n) time.
    """
    rng = rng or random.Random()
    reservoir: list = []
    for i, item in enumerate(stream, start=1):
        if i <= k:
            reservoir.append(item)
        else:
            j = rng.randint(1, i)
            if j <= k:
                reservoir[j - 1] = item
    return reservoir


def _hash64(item: Hashable, seed: int) -> int:
    data = f"{seed}:{item!r}".encode()
    return int.from_bytes(hashlib.blake2b(data, digest_size=8).digest(), "big")


class BloomFilter:
    """Set membership with no false negatives and a tunable false-positive rate.

    Bloom (1970). k hash functions each set one of m bits. ``might_contain``
    is False only if the item was definitely never added. Expected false-
    positive rate after n insertions: (1 - e^(-kn/m))^k. O(k) per operation;
    m bits of space.
    """

    def __init__(self, m: int, k: int):
        if m < 1 or k < 1:
            raise ValueError("m and k must be positive")
        self.m, self.k = m, k
        self.bits = bytearray(m)
        self.n = 0

    @classmethod
    def for_capacity(cls, n: int, fp_rate: float) -> "BloomFilter":
        """Size the filter for n items and a target false-positive rate:
        m = -n ln p / (ln 2)^2 and k = (m / n) ln 2. O(m) to allocate."""
        m = max(1, math.ceil(-n * math.log(fp_rate) / (math.log(2) ** 2)))
        k = max(1, round(m / n * math.log(2)))
        return cls(m, k)

    def _positions(self, item: Hashable) -> list[int]:
        h1, h2 = _hash64(item, 1), _hash64(item, 2)
        return [(h1 + i * h2) % self.m for i in range(self.k)]  # double hashing

    def add(self, item: Hashable) -> None:
        """Set the k bits for item. O(k)."""
        for p in self._positions(item):
            self.bits[p] = 1
        self.n += 1

    def might_contain(self, item: Hashable) -> bool:
        """False means "definitely never added"; True means "probably added". O(k)."""
        return all(self.bits[p] for p in self._positions(item))

    def expected_false_positive_rate(self) -> float:
        """(1 - e^(-kn/m))^k for the n items added so far. O(1)."""
        return (1 - math.exp(-self.k * self.n / self.m)) ** self.k


class CountMinSketch:
    """Approximate item frequencies in a stream using a small depth x width table.

    Cormode & Muthukrishnan (2005). Each row hashes the item to one counter;
    the estimate is the minimum over rows. It never underestimates, and with
    width w = ceil(e / eps) and depth d = ceil(ln(1 / delta)) it overestimates
    by more than eps * N with probability at most delta. O(d) per operation.
    """

    def __init__(self, width: int, depth: int):
        self.width, self.depth = width, depth
        self.table = [[0] * width for _ in range(depth)]
        self.total = 0

    def add(self, item: Hashable, count: int = 1) -> None:
        """Record ``count`` more occurrences of item. O(depth)."""
        self.total += count
        for row in range(self.depth):
            self.table[row][_hash64(item, 100 + row) % self.width] += count

    def estimate(self, item: Hashable) -> int:
        """Upper estimate of item's count (never too small). O(depth)."""
        return min(self.table[row][_hash64(item, 100 + row) % self.width] for row in range(self.depth))


_DETERMINISTIC_BASES = (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37)


def miller_rabin(n: int, rounds: int = 20, rng: random.Random | None = None) -> bool:
    """Probabilistic primality test (Miller-Rabin).

    Write n - 1 = 2^s d with d odd; a base a "witnesses" compositeness unless
    a^d = 1 or a^(2^r d) = -1 (mod n) for some r < s. Without ``rng`` the
    fixed first-12-prime bases are used, which is exact for n < 3.3 * 10^24;
    with ``rng``, each random base errs with probability <= 1/4.
    O(rounds · log^3 n) bit operations.
    """
    if n < 2:
        return False
    small_primes = (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37)
    for p in small_primes:
        if n % p == 0:
            return n == p
    d, s = n - 1, 0
    while d % 2 == 0:
        d //= 2
        s += 1
    if rng is None:
        bases: Iterable[int] = _DETERMINISTIC_BASES
    else:
        bases = [rng.randint(2, n - 2) for _ in range(rounds)]
    for a in bases:
        x = pow(a, d, n)
        if x == 1 or x == n - 1:
            continue
        for _ in range(s - 1):
            x = pow(x, 2, n)
            if x == n - 1:
                break
        else:
            return False
    return True
