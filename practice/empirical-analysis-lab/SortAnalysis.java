import java.io.File;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.Arrays;
import java.util.Random;

/**
 * SortAnalysis — empirical analysis of insertion sort (Levitin §2.6, Exercises 2.6.1–2.6.3).
 *
 * For every size n = 1000, 1500, 2000, ..., 9500 (18 sizes) the program sorts TRIALS random
 * arrays (default 20 per size) and records, for every single run:
 *   - the CORRECT number of key comparisons (every evaluation of A[j] > v is counted),
 *   - the count the ORIGINAL (buggy) counter would have reported (it only counts true comparisons,
 *     i.e. shifts), so you can see the undercount in your own data,
 *   - the wall-clock time in milliseconds (System.nanoTime) of an uninstrumented insertion sort
 *     run on identical copies of the same array (best of REPS = 3 repetitions).
 *
 * Output (in the directory given as the third argument; default results/ under the working directory):
 *   results/comparisons.csv   n,trial,comparisons,buggy_count,expected_exact
 *   results/timing.csv        n,trial,time_ms
 *   results/summary.csv       n,trials,mean_comparisons,expected_exact,mean_buggy_count,mean_time_ms,median_time_ms
 *
 * Usage:
 *   javac SortAnalysis.java
 *   java SortAnalysis                 # 20 trials per size, seed 501
 *   java SortAnalysis 20 501 results  # trials, seed, output directory
 */
public class SortAnalysis {

    static final int MIN_N = 1000, MAX_N = 9500, STEP = 500;
    /** Each timed run sorts REPS identical copies and records the minimum time (filters out OS/GC noise). */
    static final int REPS = 3;

    /**
     * Corrected comparison counter (style 1: count every evaluation of A[j] > v).
     * Mirrors the Forge Pseudocode in the lab README line by line.
     */
    static long sortAnalysis(int[] a) {
        long count = 0;
        int n = a.length;
        for (int i = 1; i <= n - 1; i++) {
            int v = a[i];
            int j = i - 1;
            while (j >= 0) {
                count++;                 // A[j] > v is about to be evaluated: count it, true or false
                if (a[j] > v) {
                    a[j + 1] = a[j];
                    j--;
                } else {
                    break;               // the comparison that stops the scan was still a comparison
                }
            }
            a[j + 1] = v;
        }
        return count;
    }

    /** The ORIGINAL counter from Levitin Exercise 2.6.1, kept only to demonstrate the bug. */
    static long buggySortAnalysis(int[] a) {
        long count = 0;
        int n = a.length;
        for (int i = 1; i <= n - 1; i++) {
            int v = a[i];
            int j = i - 1;
            while (j >= 0 && a[j] > v) {
                count++;                 // BUG: only reached when the comparison was TRUE
                a[j + 1] = a[j];
                j--;
            }
            a[j + 1] = v;
        }
        return count;
    }

    /** Plain insertion sort with no counter — this is what we time. */
    static void insertionSort(int[] a) {
        for (int i = 1; i < a.length; i++) {
            int v = a[i];
            int j = i - 1;
            while (j >= 0 && a[j] > v) {
                a[j + 1] = a[j];
                j--;
            }
            a[j + 1] = v;
        }
    }

    /** Exact expected comparison count for a random permutation: n(n-1)/4 + (n-1) - (H_n - 1). */
    static double expectedComparisons(int n) {
        double h = 0;
        for (int k = 1; k <= n; k++) h += 1.0 / k;
        return n * (n - 1) / 4.0 + (n - 1) - (h - 1);
    }

    static int[] randomArray(int n, Random rng) {
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = rng.nextInt(Integer.MAX_VALUE); // duplicates are very rare
        return a;
    }

    static boolean isSorted(int[] a) {
        for (int i = 1; i < a.length; i++) if (a[i - 1] > a[i]) return false;
        return true;
    }

    static double median(double[] xs) {
        double[] s = xs.clone();
        Arrays.sort(s);
        int m = s.length / 2;
        return s.length % 2 == 1 ? s[m] : (s[m - 1] + s[m]) / 2.0;
    }

    public static void main(String[] args) throws IOException {
        int trials = args.length > 0 ? Integer.parseInt(args[0]) : 20;
        long seed = args.length > 1 ? Long.parseLong(args[1]) : 501L;
        File outDir = new File(args.length > 2 ? args[2] : "results");
        if (!outDir.exists() && !outDir.mkdirs()) throw new IOException("cannot create " + outDir);

        Random rng = new Random(seed);

        // Sanity checks on tiny inputs (see the lab README, step 1).
        int[] sorted = {10, 20, 30, 40, 50};
        System.out.printf("Sanity: already sorted n=5 -> buggy=%d, correct=%d (expected n-1 = 4)%n",
                buggySortAnalysis(sorted.clone()), sortAnalysis(sorted.clone()));
        int[] reversed = {50, 40, 30, 20, 10};
        System.out.printf("Sanity: reversed n=5       -> buggy=%d, correct=%d (expected n(n-1)/2 = 10)%n",
                buggySortAnalysis(reversed.clone()), sortAnalysis(reversed.clone()));

        // JIT warm-up: let HotSpot compile the hot loops before we start the clock.
        long sink = 0;
        for (int w = 0; w < 300; w++) {
            int[] a = randomArray(2000, rng);
            int[] b = a.clone();
            sink += sortAnalysis(a);
            insertionSort(b);
            sink += b[0];
        }
        System.out.println("Warm-up done (checksum " + sink + ")");

        try (PrintWriter comp = new PrintWriter(new File(outDir, "comparisons.csv"));
             PrintWriter time = new PrintWriter(new File(outDir, "timing.csv"));
             PrintWriter sum = new PrintWriter(new File(outDir, "summary.csv"))) {
            comp.println("n,trial,comparisons,buggy_count,expected_exact");
            time.println("n,trial,time_ms");
            sum.println("n,trials,mean_comparisons,expected_exact,mean_buggy_count,mean_time_ms,median_time_ms");

            System.out.printf("%6s %16s %16s %14s %10s%n", "n", "mean C(n)", "expected", "C/n^2", "mean ms");
            for (int n = MIN_N; n <= MAX_N; n += STEP) {
                double expected = expectedComparisons(n);
                double sumC = 0, sumBug = 0, sumT = 0;
                double[] times = new double[trials];
                for (int t = 1; t <= trials; t++) {
                    int[] a = randomArray(n, rng);
                    int[] b = a.clone();
                    int[] c = a.clone();

                    long cnt = sortAnalysis(a);
                    long bug = buggySortAnalysis(c);

                    // Time REPS sorts of identical copies and keep the fastest (least disturbed) one.
                    double ms = Double.MAX_VALUE;
                    for (int r = 0; r < REPS; r++) {
                        int[] copy = (r == REPS - 1) ? b : b.clone();
                        long t0 = System.nanoTime();
                        insertionSort(copy);
                        long t1 = System.nanoTime();
                        ms = Math.min(ms, (t1 - t0) / 1e6);
                        if (r < REPS - 1 && !isSorted(copy)) throw new IllegalStateException("not sorted!");
                    }

                    if (!isSorted(a) || !isSorted(b) || !isSorted(c)) throw new IllegalStateException("not sorted!");

                    comp.printf("%d,%d,%d,%d,%.3f%n", n, t, cnt, bug, expected);
                    time.printf("%d,%d,%.4f%n", n, t, ms);
                    sumC += cnt; sumBug += bug; sumT += ms; times[t - 1] = ms;
                }
                double meanC = sumC / trials;
                sum.printf("%d,%d,%.2f,%.3f,%.2f,%.4f,%.4f%n", n, trials, meanC, expected,
                        sumBug / trials, sumT / trials, median(times));
                System.out.printf("%6d %16.1f %16.1f %14.5f %10.3f%n", n, meanC, expected,
                        meanC / ((double) n * n), sumT / trials);
            }
        }
        System.out.println("Wrote " + new File(outDir, "comparisons.csv") + ", timing.csv, summary.csv");
    }
}
