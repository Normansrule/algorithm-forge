package algoforge;

import java.util.Arrays;

/** Searching and selection algorithms. Every search returns an index, or -1 when the key is absent. */
public final class Searching {

    private Searching() { }

    /** Sequential search (Levitin §3.1/§3.2): first index holding key. Θ(n) worst case. */
    public static int sequentialSearch(int[] a, int key) {
        for (int i = 0; i < a.length; i++) {
            if (a[i] == key) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Iterative binary search in a sorted array (Levitin §4.4).
     * Worst case floor(log2 n) + 1 three-way comparisons: Θ(log n).
     */
    public static int binarySearch(int[] a, int key) {
        int lo = 0;
        int hi = a.length - 1;
        while (lo <= hi) {
            int mid = (lo + hi) >>> 1;   // unsigned shift avoids int overflow of lo + hi
            if (key == a[mid]) {
                return mid;
            } else if (key < a[mid]) {
                hi = mid - 1;
            } else {
                lo = mid + 1;
            }
        }
        return -1;
    }

    /**
     * Interpolation search in a sorted array (Levitin §4.5): probe where the key "should" be.
     * About log log n + 1 probes on uniformly spread data; Θ(n) worst case.
     */
    public static int interpolationSearch(int[] a, int key) {
        int lo = 0;
        int hi = a.length - 1;
        while (lo <= hi && key >= a[lo] && key <= a[hi]) {
            int pos;
            if (a[hi] == a[lo]) {
                pos = lo;
            } else {
                pos = lo + (int) (((long) key - a[lo]) * (hi - lo) / ((long) a[hi] - a[lo]));
            }
            if (a[pos] == key) {
                return pos;
            } else if (a[pos] < key) {
                lo = pos + 1;
            } else {
                hi = pos - 1;
            }
        }
        return -1;
    }

    /**
     * The k-th smallest element (k = 1 is the minimum) by quickselect with Lomuto partitioning
     * (Levitin §4.5). Works on a copy. Average Θ(n), worst Θ(n^2).
     */
    public static int quickselect(int[] input, int k) {
        if (k < 1 || k > input.length) {
            throw new IllegalArgumentException("k must be between 1 and n");
        }
        int[] a = Arrays.copyOf(input, input.length);
        int lo = 0;
        int hi = a.length - 1;
        int target = k - 1;
        while (true) {
            int s = lomutoPartition(a, lo, hi);
            if (s == target) {
                return a[s];
            } else if (s > target) {
                hi = s - 1;
            } else {
                lo = s + 1;
            }
        }
    }

    /** Lomuto partition around p = a[lo] (Levitin §4.5); returns p's final index. Θ(n). */
    public static int lomutoPartition(int[] a, int lo, int hi) {
        int p = a[lo];
        int s = lo;
        for (int i = lo + 1; i <= hi; i++) {
            if (a[i] < p) {
                s++;
                int t = a[s];
                a[s] = a[i];
                a[i] = t;
            }
        }
        int t = a[lo];
        a[lo] = a[s];
        a[s] = t;
        return s;
    }
}
