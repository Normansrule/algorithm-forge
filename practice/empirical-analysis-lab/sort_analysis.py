#!/usr/bin/env python3
"""sort_analysis.py — Python twin of SortAnalysis.java (CSC 501 empirical-analysis project).

For each n in 1000, 1500, ..., 9500 it sorts TRIALS random arrays with insertion sort and records
the CORRECT comparison count (every evaluation of A[j] > v), the count the original buggy counter
would report, and the wall-clock time of an uninstrumented sort in milliseconds.

Python is roughly 50-100x slower than Java here, so the default number of trials is 20 (to match
the assignment) but you may want `--trials 3` while experimenting.

Usage:
    python3 sort_analysis.py                          # 20 trials per size -> results/python/
    python3 sort_analysis.py --trials 3 --seed 7
    python3 sort_analysis.py --sizes 1000 2000 4000   # custom sizes
"""
from __future__ import annotations

import argparse
import csv
import math
import os
import random
import statistics
import time


def sort_analysis(a: list) -> int:
    """Insertion sort with a CORRECT comparison counter (style 2: count the failed test after the loop)."""
    count = 0
    n = len(a)
    for i in range(1, n):
        v = a[i]
        j = i - 1
        while j >= 0 and a[j] > v:
            count += 1          # this comparison was TRUE
            a[j + 1] = a[j]
            j -= 1
        if j >= 0:
            count += 1          # the loop stopped because A[j] > v was FALSE: that test counts too
        a[j + 1] = v
    return count


def buggy_sort_analysis(a: list) -> int:
    """The handout's original counter: counts only TRUE comparisons (i.e. shifts)."""
    count = 0
    for i in range(1, len(a)):
        v = a[i]
        j = i - 1
        while j >= 0 and a[j] > v:
            count += 1
            a[j + 1] = a[j]
            j -= 1
        a[j + 1] = v
    return count


def insertion_sort(a: list) -> None:
    """Plain insertion sort, no counter — this is what we time."""
    for i in range(1, len(a)):
        v = a[i]
        j = i - 1
        while j >= 0 and a[j] > v:
            a[j + 1] = a[j]
            j -= 1
        a[j + 1] = v


def expected_comparisons(n: int) -> float:
    """Exact E[C(n)] for a random permutation: n(n-1)/4 + (n-1) - (H_n - 1)."""
    h = math.fsum(1.0 / k for k in range(1, n + 1))
    return n * (n - 1) / 4 + (n - 1) - (h - 1)


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--trials", type=int, default=20, help="random arrays per size (default 20)")
    p.add_argument("--seed", type=int, default=501)
    p.add_argument("--sizes", type=int, nargs="*", default=list(range(1000, 9501, 500)))
    p.add_argument("--out", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "results", "python"))
    args = p.parse_args()

    # Sanity checks from step 1 of the lab.
    assert buggy_sort_analysis([10, 20, 30, 40, 50]) == 0
    assert sort_analysis([10, 20, 30, 40, 50]) == 4
    assert sort_analysis([50, 40, 30, 20, 10]) == 10

    rng = random.Random(args.seed)
    os.makedirs(args.out, exist_ok=True)
    with open(os.path.join(args.out, "comparisons.csv"), "w", newline="") as fc, \
         open(os.path.join(args.out, "timing.csv"), "w", newline="") as ft, \
         open(os.path.join(args.out, "summary.csv"), "w", newline="") as fs:
        wc, wt, ws = csv.writer(fc), csv.writer(ft), csv.writer(fs)
        wc.writerow(["n", "trial", "comparisons", "buggy_count", "expected_exact"])
        wt.writerow(["n", "trial", "time_ms"])
        ws.writerow(["n", "trials", "mean_comparisons", "expected_exact", "mean_buggy_count",
                     "mean_time_ms", "median_time_ms"])
        print(f"{'n':>6} {'mean C(n)':>14} {'expected':>14} {'C/n^2':>8} {'mean ms':>10}")
        for n in args.sizes:
            exp = expected_comparisons(n)
            cs, bugs, ts = [], [], []
            for t in range(1, args.trials + 1):
                a = [rng.randrange(2**31 - 1) for _ in range(n)]
                b, c = a[:], a[:]
                cnt = sort_analysis(a)
                bug = buggy_sort_analysis(c)
                t0 = time.perf_counter_ns()
                insertion_sort(b)
                ms = (time.perf_counter_ns() - t0) / 1e6
                assert a == b == c == sorted(a)
                wc.writerow([n, t, cnt, bug, f"{exp:.3f}"])
                wt.writerow([n, t, f"{ms:.4f}"])
                cs.append(cnt); bugs.append(bug); ts.append(ms)
            mc = statistics.fmean(cs)
            ws.writerow([n, args.trials, f"{mc:.2f}", f"{exp:.3f}", f"{statistics.fmean(bugs):.2f}",
                         f"{statistics.fmean(ts):.4f}", f"{statistics.median(ts):.4f}"])
            print(f"{n:>6} {mc:>14.1f} {exp:>14.1f} {mc / n**2:>8.5f} {statistics.fmean(ts):>10.2f}", flush=True)
    print("Wrote", args.out)


if __name__ == "__main__":
    main()
