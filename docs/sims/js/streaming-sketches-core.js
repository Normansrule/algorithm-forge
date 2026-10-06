/* =====================================================================
   Algorithm Forge — streaming-sketches core (no DOM)
   ---------------------------------------------------------------------
   Five ways to summarize a stream, all deterministic given a seed:
     Exact     : a hash set (+ true frequencies, the answer key)
     HLL       : HyperLogLog (Flajolet, Fusy, Gandouet, Meunier 2007),
                 32-bit hash, m = 2^b registers, low b bits pick the
                 register, rho = position of the first 1-bit of the other
                 32 - b bits, harmonic mean with alpha_m, linear counting
                 for small counts, large-range correction for 2^32.
     CVM       : Chakraborty, Vinodchandran, Meel (ESA 2022), Algorithm 1:
                 buffer of at most thresh items, keep each arrival with
                 probability p, halve when full, output |X| / p (or a
                 failure symbol if the halving round evicts nothing).
     Count-Min : Cormode & Muthukrishnan (2005), d rows x w counters.
     MG        : Misra & Gries (1982), k - 1 counters, decrement-all.
   Used by streaming-sketches.js in the browser and by Node checks.
   ===================================================================== */
(function (root) {
  "use strict";

  /* mulberry32, the same generator as Forge.rng */
  function rng(seed) {
    let a = (seed >>> 0) || 0x9e3779b9;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function fmix32(h) {
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16; return h >>> 0;
  }
  /** FNV-1a over the characters, then the MurmurHash3 finalizer: 32 well-mixed bits. */
  function hash32(str, seed) {
    let h = (0x811c9dc5 ^ Math.imul(seed | 0, 0x9e3779b1)) >>> 0;
    const s = String(str);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return fmix32(h >>> 0);
  }
  function bitLength(w) { let n = 0; while (w > 0) { n++; w = Math.floor(w / 2); } return n; }

  /* ---------------- exact ---------------- */
  function Exact() {
    this.freq = new Map();
    this.n = 0;
  }
  Exact.prototype.add = function (x) {
    this.n++;
    const c = this.freq.get(x) || 0;
    this.freq.set(x, c + 1);
    return { isNew: c === 0, count: c + 1 };
  };
  Exact.prototype.distinct = function () { return this.freq.size; };
  Exact.prototype.top = function (k) {
    return [...this.freq.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, k);
  };

  /* ---------------- HyperLogLog ---------------- */
  function hllAlpha(m) {
    if (m === 16) return 0.673;
    if (m === 32) return 0.697;
    if (m === 64) return 0.709;
    return 0.7213 / (1 + 1.079 / m);
  }
  function HLL(b, seed) {
    this.b = b; this.m = 1 << b; this.seed = seed | 0;
    this.M = new Uint8Array(this.m);
  }
  /** Split a hash the way the sim shows it: j = low b bits, w = the other 32 - b bits. */
  HLL.prototype.parts = function (x) {
    const h = hash32(x, this.seed);
    const j = h & (this.m - 1);
    const w = h >>> this.b;
    const bits = 32 - this.b;
    const rho = bits - bitLength(w) + 1;     // leading zeros of w (in `bits` bits) + 1
    return { h, j, w, rho, bits };
  };
  HLL.prototype.add = function (x) {
    const p = this.parts(x);
    p.old = this.M[p.j];
    p.changed = p.rho > p.old;
    if (p.changed) this.M[p.j] = p.rho;
    return p;
  };
  HLL.prototype.estimate = function () {
    const m = this.m;
    let Z = 0, V = 0;
    for (let j = 0; j < m; j++) { Z += Math.pow(2, -this.M[j]); if (this.M[j] === 0) V++; }
    const alpha = hllAlpha(m);
    const E = alpha * m * m / Z;
    if (E <= 2.5 * m && V > 0) return { est: m * Math.log(m / V), raw: E, mode: "linear", V, Z, alpha };
    const two32 = 4294967296;
    if (E > two32 / 30) return { est: -two32 * Math.log(1 - E / two32), raw: E, mode: "large", V, Z, alpha };
    return { est: E, raw: E, mode: "raw", V, Z, alpha };
  };
  HLL.prototype.bits = function () { return 5 * this.m; };   // rho <= 33 - b <= 29 fits in 5 bits for b >= 4

  /* ---------------- CVM ---------------- */
  /* The buffer X is a fixed array of thresh slots (null = empty) plus a map
     item -> slot, so the picture stays stable. Iteration order in the
     halving round is slot order; any fixed order is equally correct. */
  function CVM(thresh, seed, opts) {
    opts = opts || {};
    this.thresh = thresh; this.seed = seed;
    this.r = opts.random || rng(seed);
    this.order = opts.order || "slots";   // "sorted": visit items in increasing order (the Arena's convention)
    this.p = 1; this.size = 0;
    this.slots = new Array(thresh).fill(null);
    this.where = new Map();
    this.halvings = 0; this.failed = false; this.flips = 0;
  }
  CVM.prototype._remove = function (a) {
    const s = this.where.get(a);
    if (s === undefined) return -1;
    this.slots[s] = null; this.where.delete(a); this.size--;
    return s;
  };
  CVM.prototype._add = function (a) {
    let s = this.slots.indexOf(null);
    this.slots[s] = a; this.where.set(a, s); this.size++;
    return s;
  };
  CVM.prototype.add = function (a) {
    if (this.failed) return { failed: true, skipped: true };
    const ev = { a, pBefore: this.p, sizeBefore: this.size };
    ev.had = this._remove(a) >= 0;
    ev.u = this.r(); this.flips++;
    ev.kept = ev.u < this.p;
    ev.slot = ev.kept ? this._add(a) : -1;
    if (this.size === this.thresh) {
      const before = this.slots.slice();
      const coins = new Array(this.thresh);
      const visit = before.map((_, s) => s);
      if (this.order === "sorted") visit.sort((x, y) => (before[x] < before[y] ? -1 : before[x] > before[y] ? 1 : 0));
      for (const s of visit) {
        const c = this.r(); this.flips++;
        coins[s] = c;
        if (c < 0.5) this._remove(before[s]);
      }
      this.p /= 2; this.halvings++;
      ev.halve = { before, coins, evicted: coins.filter((c) => c < 0.5).length };
      if (this.size === this.thresh) { this.failed = true; ev.failed = true; }
    }
    ev.size = this.size; ev.p = this.p;
    return ev;
  };
  CVM.prototype.estimate = function () { return this.failed ? NaN : this.size / this.p; };
  CVM.prototype.bits = function () { return 32 * this.thresh; };

  /* ---------------- Count–Min ---------------- */
  function CountMin(d, w, seed) {
    this.d = d; this.w = w; this.seed = seed | 0; this.N = 0;
    this.C = Array.from({ length: d }, () => new Uint32Array(w));
  }
  CountMin.prototype.cols = function (x) {
    const out = [];
    for (let i = 0; i < this.d; i++) out.push(hash32(x, this.seed + 7919 * (i + 1)) % this.w);
    return out;
  };
  CountMin.prototype.add = function (x) {
    const cols = this.cols(x);
    for (let i = 0; i < this.d; i++) this.C[i][cols[i]]++;
    this.N++;
    return cols;
  };
  CountMin.prototype.query = function (x) {
    const cols = this.cols(x);
    const vals = cols.map((c, i) => this.C[i][c]);
    let est = Infinity, arg = 0;
    vals.forEach((v, i) => { if (v < est) { est = v; arg = i; } });
    return { cols, vals, est: this.d ? est : 0, arg };
  };
  CountMin.prototype.bits = function () { return 32 * this.d * this.w; };

  /* ---------------- Misra–Gries ---------------- */
  function MisraGries(k) { this.k = k; this.T = new Map(); this.decs = 0; this.N = 0; }
  MisraGries.prototype.add = function (x) {
    this.N++;
    if (this.T.has(x)) { this.T.set(x, this.T.get(x) + 1); return { kind: "inc", x }; }
    if (this.T.size < this.k - 1) { this.T.set(x, 1); return { kind: "new", x }; }
    const removed = [];
    for (const [y, c] of [...this.T.entries()]) {
      if (c - 1 === 0) { this.T.delete(y); removed.push(y); } else this.T.set(y, c - 1);
    }
    this.decs++;
    return { kind: "dec", x, removed };
  };
  MisraGries.prototype.bits = function () { return 64 * (this.k - 1); };

  /* ---------------- streams ---------------- */
  const COMMON = ("the of and to a in is it you that he was for on are with as his they be at one have this from or had by " +
    "word but what some we can out other were all there when up use your how said an each she which do their time if will way " +
    "about many then them write would like so these her long make thing see him two has look more day could go come did number " +
    "sound no most people my over know water than call first who may down side been now find any new work part take get place " +
    "made live where after back little only round man year came show every good me give our under name very through just form " +
    "sentence great think say help low line differ turn cause much mean before move right boy old too same tell does set three " +
    "want air well also play small end put home read hand port large spell add even land here must big high such follow act why " +
    "ask men change went light kind off need house picture try us again animal point mother world near build self earth father").split(" ");
  const SYL = ["ka", "lo", "mi", "ne", "ta", "ri", "so", "vu", "de", "pa", "zo", "fi", "gu", "be", "ro", "ul"];
  function vocabWord(r) {           // r = 0-based rank
    if (r < COMMON.length) return COMMON[r];
    let k = r - COMMON.length, s = "";
    do { s += SYL[k % 16]; k = Math.floor(k / 16); } while (k > 0);
    return s + SYL[(r * 7) % 16];
  }
  function zipfStream(N, seed, V, s) {
    V = V || 3000; s = s || 1.05;
    const r = rng(seed * 31 + 1);
    const cum = new Float64Array(V);
    let acc = 0;
    for (let i = 0; i < V; i++) { acc += 1 / Math.pow(i + 1, s); cum[i] = acc; }
    const out = [];
    for (let n = 0; n < N; n++) {
      const u = r() * acc;
      let lo = 0, hi = V - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < u) lo = mid + 1; else hi = mid; }
      out.push(vocabWord(lo));
    }
    return out;
  }
  function uniformStream(N, seed, U) {
    U = U || Math.max(10, Math.round(N * 0.6));
    const r = rng(seed * 31 + 2);
    const out = [];
    for (let n = 0; n < N; n++) out.push("#" + (1000 + Math.floor(r() * U)));
    return out;
  }
  const HEAVY = [["10.0.0.7", 0.18], ["10.0.0.42", 0.11], ["192.168.1.9", 0.07]];
  function heavyStream(N, seed, pool) {
    pool = pool || 3000;
    const r = rng(seed * 31 + 3);
    const out = [];
    for (let n = 0; n < N; n++) {
      let u = r(), pick = null;
      for (const [ip, f] of HEAVY) { if (u < f) { pick = ip; break; } u -= f; }
      if (!pick) { const k = Math.floor(r() * pool); pick = "172.16." + (k >> 8) + "." + (k & 255); }
      out.push(pick);
    }
    return out;
  }
  function textStream(text) {
    return String(text).toLowerCase().replace(/[^a-z0-9'\s-]+/g, " ").split(/\s+/).map((w) => w.replace(/^['-]+|['-]+$/g, "")).filter(Boolean);
  }

  /* ---------------- experiment: error vs memory ---------------- */
  /** Root-mean-square relative error over `seeds` runs, for HLL sizes and CVM thresholds. */
  function errorVsMemory(stream, opts) {
    opts = opts || {};
    const truth = new Set(stream).size;
    const seeds = opts.seeds || 12;
    const hll = (opts.bs || [4, 5, 6, 7, 8, 9, 10, 11, 12]).map((b) => {
      let se = 0;
      for (let s = 0; s < seeds; s++) {
        const H = new HLL(b, 1000 + s * 17);
        for (const x of stream) H.add(x);
        const e = H.estimate().est;
        se += Math.pow((e - truth) / truth, 2);
      }
      return { b, m: 1 << b, bits: 5 * (1 << b), rmse: Math.sqrt(se / seeds), theory: 1.04 / Math.sqrt(1 << b) };
    });
    const cvm = (opts.ts || [8, 16, 32, 64, 128, 256, 512, 1024]).map((t) => {
      let se = 0, fails = 0, runs = 0;
      for (let s = 0; s < seeds; s++) {
        const C = new CVM(t, 5000 + s * 31);
        for (const x of stream) C.add(x);
        if (C.failed) { fails++; continue; }
        runs++;
        se += Math.pow((C.estimate() - truth) / truth, 2);
      }
      return { thresh: t, bits: 32 * t, rmse: runs ? Math.sqrt(se / runs) : NaN, fails };
    });
    return { truth, hll, cvm };
  }

  const API = { rng, fmix32, hash32, bitLength, hllAlpha, Exact, HLL, CVM, CountMin, MisraGries,
    zipfStream, uniformStream, heavyStream, textStream, vocabWord, HEAVY, errorVsMemory };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.SketchCore = API;
})(typeof window !== "undefined" ? window : globalThis);
