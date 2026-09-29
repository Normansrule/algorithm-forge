"""Chapter 15 (Beyond Levitin) - Dynamic Programming and Interview Patterns.

Reusable patterns that turn brute-force O(n^2) (or worse) scans into linear or
n log n solutions: two pointers, sliding windows, monotonic stacks and deques,
prefix sums, binary search on the answer, interval merging, and small
dynamic programming (DP) recurrences.
"""

from __future__ import annotations

from collections import deque
from typing import Sequence


def two_sum_sorted(A: Sequence[int], target: int) -> tuple[int, int] | None:
    """Indices i < j with A[i] + A[j] == target in a sorted array, or None (two pointers).

    Move the left pointer right when the sum is too small, the right pointer
    left when too big: each step discards one candidate for good. Θ(n); O(1).
    """
    i, j = 0, len(A) - 1
    while i < j:
        s = A[i] + A[j]
        if s == target:
            return i, j
        if s < target:
            i += 1
        else:
            j -= 1
    return None


def longest_substring_without_repeat(s: str) -> tuple[int, str]:
    """Length and first example of the longest substring with all-distinct characters.

    Sliding window: extend the right end; when a repeat enters, jump the left
    end past the previous copy of that character. Θ(n) time; O(alphabet) space.
    """
    last_seen: dict[str, int] = {}
    left = 0
    best_len, best_start = 0, 0
    for right, ch in enumerate(s):
        if ch in last_seen and last_seen[ch] >= left:
            left = last_seen[ch] + 1
        last_seen[ch] = right
        if right - left + 1 > best_len:
            best_len, best_start = right - left + 1, left
    return best_len, s[best_start:best_start + best_len]


def sliding_window_max(A: Sequence[float], k: int) -> list[float]:
    """Maximum of every window of k consecutive elements (monotonic deque).

    The deque holds indices whose values decrease from front to back; the
    front is always the current window's maximum. Each index enters and
    leaves once: Θ(n) time; O(k) space.
    """
    if k <= 0:
        raise ValueError("k must be positive")
    dq: deque[int] = deque()
    out = []
    for i, x in enumerate(A):
        while dq and A[dq[-1]] <= x:
            dq.pop()
        dq.append(i)
        if dq[0] <= i - k:
            dq.popleft()
        if i >= k - 1:
            out.append(A[dq[0]])
    return out


def next_greater_element(A: Sequence[float]) -> list[float | None]:
    """For each element, the first strictly larger element to its right (None if none).

    Monotonic stack of indices still waiting for their answer; a new element
    answers every smaller waiting element. Θ(n) time; O(n) space.
    """
    result: list[float | None] = [None] * len(A)
    stack: list[int] = []
    for i, x in enumerate(A):
        while stack and A[stack[-1]] < x:
            result[stack.pop()] = x
        stack.append(i)
    return result


class PrefixSums:
    """Answer range-sum queries in O(1) after an O(n) precomputation.

    P[i] = A[0] + ... + A[i-1], so sum(A[l..r]) = P[r + 1] - P[l].
    """

    def __init__(self, A: Sequence[float]):
        self.P = [0] * (len(A) + 1)
        for i, x in enumerate(A):
            self.P[i + 1] = self.P[i] + x

    def range_sum(self, lo: int, hi: int) -> float:
        """Sum of A[lo..hi] inclusive. O(1)."""
        return self.P[hi + 1] - self.P[lo]


def ship_within_days(weights: Sequence[int], days: int) -> int:
    """Smallest ship capacity that ships all packages, in order, within ``days`` days.

    Binary search on the answer: "can we ship with capacity C?" is monotone
    in C, so binary-search C in [max(weights), sum(weights)] with a greedy
    feasibility check. Θ(n log(sum)) time; O(1) space.
    """
    def days_needed(capacity: int) -> int:
        d, load = 1, 0
        for w in weights:
            if load + w > capacity:
                d += 1
                load = 0
            load += w
        return d

    lo, hi = max(weights), sum(weights)
    while lo < hi:
        mid = (lo + hi) // 2
        if days_needed(mid) <= days:
            hi = mid
        else:
            lo = mid + 1
    return lo


def merge_intervals(intervals: Sequence[tuple[float, float]]) -> list[tuple[float, float]]:
    """Merge overlapping (or touching) closed intervals. Θ(n log n) for the sort."""
    merged: list[list[float]] = []
    for start, end in sorted(intervals):
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return [(a, b) for a, b in merged]


def lis_quadratic(A: Sequence) -> int:
    """Length of the Longest strictly Increasing Subsequence (LIS) by the classic O(n^2) DP.

    L[i] = 1 + max(L[j] for j < i with A[j] < A[i]). Compare the n log n
    version in Chapter 8 (``lis_nlogn``). Θ(n^2) time; Θ(n) space.
    """
    L = [1] * len(A)
    for i in range(len(A)):
        for j in range(i):
            if A[j] < A[i] and L[j] + 1 > L[i]:
                L[i] = L[j] + 1
    return max(L, default=0)


def house_robber(A: Sequence[float]) -> float:
    """Max sum of non-adjacent elements with two rolling variables.

    Same recurrence as Levitin's coin-row problem (§8.1), but O(1) space:
    best(i) = max(best(i-1), best(i-2) + A[i]). Θ(n) time.
    """
    prev2, prev1 = 0, 0
    for x in A:
        prev2, prev1 = prev1, max(prev1, prev2 + x)
    return prev1
