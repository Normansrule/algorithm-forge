"""Operation counters: measure the *basic operation* of an algorithm.

Levitin §2.1 says: to analyze an algorithm, pick its basic operation (the
step that dominates the running time, such as a key comparison) and count how
many times it runs. ``OpCounter`` lets you do exactly that in real code.

Example::

    >>> from algoforge.counters import OpCounter
    >>> from algoforge.ch03_brute_force import selection_sort
    >>> c = OpCounter()
    >>> selection_sort([3, 1, 2], counter=c)
    [1, 2, 3]
    >>> c["comparisons"]      # n(n-1)/2 = 3 for n = 3
    3
"""

from __future__ import annotations


class OpCounter:
    """A named tally of basic operations (comparisons, swaps, multiplications...).

    Levitin §2.1 (measuring running time by counting the basic operation).
    Every method is O(1) time; space is O(number of distinct names).
    """

    def __init__(self) -> None:
        self.counts: dict[str, int] = {}

    def tick(self, name: str = "ops", amount: int = 1) -> None:
        """Add ``amount`` to the tally called ``name``. O(1)."""
        self.counts[name] = self.counts.get(name, 0) + amount

    def get(self, name: str, default: int = 0) -> int:
        """Return the tally for ``name`` (``default`` if never ticked). O(1)."""
        return self.counts.get(name, default)

    def __getitem__(self, name: str) -> int:
        return self.counts.get(name, 0)

    def total(self) -> int:
        """Sum of every tally. O(k) for k names."""
        return sum(self.counts.values())

    def reset(self) -> None:
        """Clear every tally back to zero. O(1)."""
        self.counts.clear()

    def snapshot(self) -> dict[str, int]:
        """Return a copy of the current tallies (safe to keep). O(k)."""
        return dict(self.counts)

    def __repr__(self) -> str:
        inside = ", ".join(f"{k}={v}" for k, v in sorted(self.counts.items()))
        return f"OpCounter({inside})"


def tick(counter: OpCounter | None, name: str, amount: int = 1) -> None:
    """Tick ``counter`` if one was supplied; do nothing when it is ``None``.

    This helper keeps algorithm code short: ``tick(counter, "comparisons")``.
    O(1).
    """
    if counter is not None:
        counter.tick(name, amount)
