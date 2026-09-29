#!/usr/bin/env python3
"""plot_results.py — turn the CSVs written by SortAnalysis.java into plots and fitted models.

Reads   results/comparisons.csv and results/timing.csv   (or another directory via --dir)
Writes  results/comparisons_scatter.png   every run as a dot + the theoretical average curve
        results/timing_scatter.png        every run as a dot + the fitted quadratic
        results/ratio_plot.png            C(n)/n^2 and T(n)/n^2 (should level off at a constant)
        results/loglog_plot.png           log-log plots with least-squares slope (should be ~2)
        results/fit_summary.txt           the fitted constants and the n = 10,000 predictions

Usage:  python3 plot_results.py [--dir results] [--predict 10000] [--label "Java, JIT-warmed"]
"""
from __future__ import annotations

import argparse
import csv
import math
import os
from collections import defaultdict

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

# Validated reference palette (dataviz skill): slot 1 blue for measurements, slot 2 orange for models.
BLUE, ORANGE = "#2a78d6", "#eb6834"
INK, INK2, GRID, SURFACE = "#0b0b0b", "#52514e", "#e4e3df", "#fcfcfb"

plt.rcParams.update({
    "figure.facecolor": SURFACE, "axes.facecolor": SURFACE, "savefig.facecolor": SURFACE,
    "axes.edgecolor": INK2, "axes.labelcolor": INK, "xtick.color": INK2, "ytick.color": INK2,
    "text.color": INK, "axes.grid": True, "grid.color": GRID, "grid.linewidth": 0.8,
    "axes.spines.top": False, "axes.spines.right": False, "font.size": 11,
    "axes.titlesize": 13, "axes.titleweight": "bold", "legend.frameon": False,
})


def harmonic(n: int) -> float:
    return math.fsum(1.0 / k for k in range(1, n + 1))


def expected_c(n: int) -> float:
    """Exact E[C(n)] for insertion sort on a random permutation (derived in the README)."""
    return n * (n - 1) / 4 + (n - 1) - (harmonic(n) - 1)


def read(path: str, col: str):
    xs, ys = [], []
    with open(path) as f:
        for row in csv.DictReader(f):
            xs.append(int(row["n"]))
            ys.append(float(row[col]))
    return np.array(xs, dtype=float), np.array(ys, dtype=float)


def per_size(xs, ys, fn):
    groups = defaultdict(list)
    for x, y in zip(xs, ys):
        groups[x].append(y)
    ns = np.array(sorted(groups))
    return ns, np.array([fn(groups[n]) for n in ns])


def main() -> None:
    p = argparse.ArgumentParser()
    here = os.path.dirname(os.path.abspath(__file__))
    p.add_argument("--dir", default=os.path.join(here, "results"))
    p.add_argument("--predict", type=int, default=10_000)
    p.add_argument("--label", default=None, help='run label for the timing title (default: "Java, JIT-warmed", or "Python" for a python/ directory)')
    args = p.parse_args()
    d, N = args.dir, args.predict
    label = args.label or ("Python" if os.path.basename(os.path.normpath(d)) == "python" else "Java, JIT-warmed")

    n_c, c = read(os.path.join(d, "comparisons.csv"), "comparisons")
    n_t, t = read(os.path.join(d, "timing.csv"), "time_ms")
    ns, c_mean = per_size(n_c, c, np.mean)
    _, t_med = per_size(n_t, t, np.median)
    _, t_mean = per_size(n_t, t, np.mean)

    # ---- Fits -----------------------------------------------------------------------------
    # (1) one-constant model C(n) ~ a*n^2, least squares through the origin over ALL runs
    a_c = float(np.sum(c * n_c**2) / np.sum(n_c**4))
    # (2) full quadratic a n^2 + b n + d over all runs
    q_c = np.polyfit(n_c, c, 2)
    # (3) log-log slope
    slope_c, icpt_c = np.polyfit(np.log10(n_c), np.log10(c), 1)

    # time: fit to per-size MEDIANS (robust to the odd GC pause / OS hiccup)
    a_t = float(np.sum(t_med * ns**2) / np.sum(ns**4))
    q_t = np.polyfit(ns, t_med, 2)
    slope_t, icpt_t = np.polyfit(np.log10(ns), np.log10(t_med), 1)

    exp_N = expected_c(N)
    lines = [
        f"Data: {len(c)} runs over {len(ns)} sizes ({int(ns[0])}..{int(ns[-1])}), {len(c)//len(ns)} runs per size",
        "",
        "COMPARISONS",
        f"  one-constant fit        C(n) ~ {a_c:.5f} n^2",
        f"  quadratic fit           C(n) ~ {q_c[0]:.5f} n^2 + {q_c[1]:.3f} n + {q_c[2]:.1f}",
        f"  log-log slope           {slope_c:.4f}",
        f"  mean C(n)/n^2 at n={int(ns[-1])}  {c_mean[-1] / ns[-1]**2:.5f}",
        f"  theory                  E[C(n)] = n(n-1)/4 + (n-1) - (H_n - 1)  ->  ~0.25 n^2",
        f"  prediction n={N}:  theory {exp_N:,.1f}   one-constant fit {a_c * N**2:,.0f}   "
        f"quadratic fit {np.polyval(q_c, N):,.0f}",
        "",
        "TIME (uninstrumented insertion sort, per-size median, milliseconds)",
        f"  one-constant fit        T(n) ~ {a_t:.4e} n^2 ms",
        f"  quadratic fit           T(n) ~ {q_t[0]:.4e} n^2 + {q_t[1]:.4e} n + {q_t[2]:.4f}",
        f"  log-log slope           {slope_t:.4f}",
        f"  prediction n={N}:  one-constant fit {a_t * N**2:.3f} ms   quadratic fit {np.polyval(q_t, N):.3f} ms",
        f"  implied time per comparison  {a_t / 0.25 * 1e6:.3f} ns   (T/C with C ~ n^2/4)",
    ]
    report = "\n".join(lines)
    print(report)
    with open(os.path.join(d, "fit_summary.txt"), "w") as f:
        f.write(report + "\n")

    xs = np.linspace(ns[0] * 0.95, ns[-1] * 1.03, 200)

    # ---- 1. comparisons scatter -------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.scatter(n_c, c / 1e6, s=14, color=BLUE, alpha=0.55, linewidths=0, label="one run (random array)")
    ax.plot(xs, [expected_c(int(x)) / 1e6 for x in xs], color=ORANGE, lw=2,
            label=r"theory $n(n-1)/4 + (n-1) - (H_n-1)$")
    ax.set_title("Insertion sort: key comparisons vs. input size")
    ax.set_xlabel("input size n")
    ax.set_ylabel("key comparisons C(n)  (millions)")
    ax.legend(loc="upper left")
    fig.tight_layout()
    fig.savefig(os.path.join(d, "comparisons_scatter.png"), dpi=150)
    plt.close(fig)

    # ---- 2. timing scatter ------------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.scatter(n_t, t, s=14, color=BLUE, alpha=0.55, linewidths=0, label="one run")
    ax.plot(xs, np.polyval(q_t, xs), color=ORANGE, lw=2, label="quadratic fit to per-size medians")
    ax.set_title(f"Insertion sort: running time vs. input size ({label})")
    ax.set_xlabel("input size n")
    ax.set_ylabel("time (ms)")
    ax.legend(loc="upper left")
    fig.tight_layout()
    fig.savefig(os.path.join(d, "timing_scatter.png"), dpi=150)
    plt.close(fig)

    # ---- 3. ratio plots (two panels, each with its own measure) -----------------------------
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(11, 4.3))
    a1.scatter(n_c, c / n_c**2, s=12, color=BLUE, alpha=0.45, linewidths=0, label="one run")
    a1.plot(ns, c_mean / ns**2, "o-", color=BLUE, ms=5, lw=2, label="mean per size")
    a1.axhline(0.25, color=ORANGE, lw=2, label="1/4")
    a1.set_title(r"Ratio test: $C(n)/n^2$")
    a1.set_xlabel("input size n")
    a1.set_ylabel(r"$C(n)/n^2$")
    lo, hi = float(np.min(c / n_c**2)), float(np.max(c / n_c**2))
    a1.set_ylim(lo - 0.4 * (hi - lo), hi + 0.05 * (hi - lo))
    a1.legend(loc="lower center", ncol=3, fontsize=9)
    a2.scatter(n_t, t / n_t**2 * 1e6, s=12, color=BLUE, alpha=0.45, linewidths=0, label="one run")
    a2.plot(ns, t_med / ns**2 * 1e6, "o-", color=BLUE, ms=5, lw=2, label="median per size")
    a2.axhline(a_t * 1e6, color=ORANGE, lw=2, label="fitted constant")
    a2.set_title(r"Ratio test: $T(n)/n^2$")
    a2.set_xlabel("input size n")
    a2.set_ylabel(r"$T(n)/n^2$  (ms $\times 10^{-6}$)")
    a2.set_ylim(0, np.percentile(t / n_t**2 * 1e6, 98) * 1.3)
    a2.legend(loc="upper right")
    fig.tight_layout()
    fig.savefig(os.path.join(d, "ratio_plot.png"), dpi=150)
    plt.close(fig)

    # ---- 4. log-log -------------------------------------------------------------------------
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(11, 4.3))
    for ax, xx, yy, s, b, title, ylab in (
        (a1, n_c, c, slope_c, icpt_c, "log-log: comparisons", "C(n)"),
        (a2, n_t, t, slope_t, icpt_t, "log-log: time (ms)", "T(n) ms"),
    ):
        ax.scatter(xx, yy, s=12, color=BLUE, alpha=0.5, linewidths=0, label="one run")
        ax.plot(xs, 10 ** (b + s * np.log10(xs)), color=ORANGE, lw=2, label=f"fitted slope = {s:.3f}")
        ax.set_xscale("log")
        ax.set_yscale("log")
        ax.set_title(title)
        ax.set_xlabel("input size n (log scale)")
        ax.set_ylabel(ylab + " (log scale)")
        ax.legend(loc="upper left")
    fig.tight_layout()
    fig.savefig(os.path.join(d, "loglog_plot.png"), dpi=150)
    plt.close(fig)
    print("Wrote PNGs to", d)


if __name__ == "__main__":
    main()
