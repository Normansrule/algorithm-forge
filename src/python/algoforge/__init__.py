"""Algorithm Forge - a tested, beginner-readable algorithms library.

One module per chapter of Levitin's *Introduction to the Design and Analysis
of Algorithms* (3rd ed.), plus six "beyond" chapters (13-18): advanced data
structures, advanced graphs, patterns, randomized and streaming algorithms,
algorithms inside production systems (17) and the research frontier (18).
Import a chapter module and call its functions, e.g.::

    from algoforge import ch04_decrease_conquer as dc
    dc.binary_search([1, 3, 5, 7], 5)   # -> 2

Pass an ``OpCounter`` to count basic operations::

    from algoforge import OpCounter, ch03_brute_force
    c = OpCounter()
    ch03_brute_force.selection_sort([4, 2, 3], counter=c)
    c["comparisons"]   # -> 3
"""

from . import (
    ch01_intro,
    ch02_analysis,
    ch03_brute_force,
    ch04_decrease_conquer,
    ch05_divide_conquer,
    ch06_transform_conquer,
    ch07_space_time,
    ch08_dynamic_programming,
    ch09_greedy,
    ch10_iterative_improvement,
    ch11_limitations,
    ch12_coping,
    ch13_advanced_ds,
    ch14_advanced_graphs,
    ch15_patterns,
    ch16_randomized,
    ch17_systems,
    ch18_frontier,
    counters,
)
from .counters import OpCounter

__version__ = "1.0.0"

__all__ = [
    "OpCounter",
    "counters",
    "ch01_intro",
    "ch02_analysis",
    "ch03_brute_force",
    "ch04_decrease_conquer",
    "ch05_divide_conquer",
    "ch06_transform_conquer",
    "ch07_space_time",
    "ch08_dynamic_programming",
    "ch09_greedy",
    "ch10_iterative_improvement",
    "ch11_limitations",
    "ch12_coping",
    "ch13_advanced_ds",
    "ch14_advanced_graphs",
    "ch15_patterns",
    "ch16_randomized",
    "ch17_systems",
    "ch18_frontier",
]
