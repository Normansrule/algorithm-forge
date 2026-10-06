"""Chapter 17 (Beyond Levitin) - Algorithms inside production systems.

The data structures and protocols a senior engineer meets in storage engines,
caches, load balancers and replicated databases. Each one is a small, exact
algorithm you can test like any other:

- caching: Least Recently Used (LRU) cache and Belady's optimal policy;
- storage: Log-Structured Merge (LSM) compaction, Write-Ahead Log (WAL)
  recovery, the external merge sort cost model;
- placement: consistent hashing (ring with virtual nodes), jump consistent
  hash, rendezvous hashing;
- traffic control: token bucket, exponential backoff with jitter;
- distributed time and agreement: Lamport clocks, vector clocks, Raft's
  log-matching and commit rules (as pure functions);
- replica repair and convergence: Merkle-tree diff, Conflict-free Replicated
  Data Type (CRDT) counters.

References are given in each docstring (papers with their year). Randomized
functions take an optional ``random.Random`` so runs are reproducible.
"""

from __future__ import annotations

import bisect
import hashlib
import heapq
import math
import random
from collections import OrderedDict
from typing import Callable, Hashable, Iterable, Sequence

from .counters import OpCounter, tick


def _hash64(item: Hashable, seed: int = 0) -> int:
    """A deterministic 64-bit hash of ``repr(item)`` (BLAKE2b), independent of PYTHONHASHSEED."""
    data = f"{seed}:{item!r}".encode()
    return int.from_bytes(hashlib.blake2b(data, digest_size=8).digest(), "big")


# ---------------------------------------------------------------------------
# Caching
# ---------------------------------------------------------------------------


class LRUCache:
    """Least Recently Used (LRU) cache with hit/miss statistics, built on ``OrderedDict``.

    The production version of the from-scratch hash map + doubly linked list
    in ``ch13_advanced_ds.LRUCache``: ``OrderedDict`` is exactly that pair of
    structures, so ``get`` and ``put`` are O(1). Sleator & Tarjan (1985)
    showed LRU is k-competitive with the optimal offline policy
    (see ``belady_hits``). Space Θ(capacity).
    """

    def __init__(self, capacity: int):
        if capacity < 1:
            raise ValueError("capacity must be positive")
        self.capacity = capacity
        self.data: OrderedDict = OrderedDict()  # least recent first, most recent last
        self.hits = 0
        self.misses = 0
        self.evicted: list = []

    def get(self, key: Hashable, default=None):
        """Value for key (marking it most recent), or ``default``. O(1)."""
        if key in self.data:
            self.data.move_to_end(key)
            self.hits += 1
            return self.data[key]
        self.misses += 1
        return default

    def put(self, key: Hashable, value) -> None:
        """Insert or update key; evict the least recently used key when over capacity. O(1)."""
        if key in self.data:
            self.data.move_to_end(key)
        self.data[key] = value
        if len(self.data) > self.capacity:
            oldest, _ = self.data.popitem(last=False)
            self.evicted.append(oldest)

    def keys_most_recent_first(self) -> list:
        """Keys from most to least recently used. Θ(n)."""
        return list(reversed(self.data))

    def __len__(self) -> int:
        return len(self.data)

    def __contains__(self, key: Hashable) -> bool:
        return key in self.data


def lru_hits(requests: Iterable[Hashable], capacity: int) -> int:
    """Number of hits when a page-request sequence is served by an LRU cache.

    On a miss the page is loaded (and becomes most recent). Sleator & Tarjan,
    "Amortized efficiency of list update and paging rules" (1985).
    Θ(len(requests)) time.
    """
    cache = LRUCache(capacity)
    for page in requests:
        if cache.get(page) is None:  # a miss (stored values are True, never None)
            cache.put(page, True)
    return cache.hits


def belady_hits(requests: Sequence[Hashable], capacity: int) -> int:
    """Hits of the optimal offline cache: on a miss, evict the page used farthest in the future.

    Belady, "A study of replacement algorithms for a virtual-storage computer"
    (1966). No online policy can beat it, so it is the oracle for testing
    caches. Θ(n log n) time with a heap of next-use times.
    """
    if capacity < 1:
        raise ValueError("capacity must be positive")
    n = len(requests)
    next_use = [math.inf] * n
    last_seen: dict = {}
    for i in range(n - 1, -1, -1):
        next_use[i] = last_seen.get(requests[i], math.inf)
        last_seen[requests[i]] = i
    cached: dict = {}  # page -> its next use time
    heap: list = []  # (-next use, i, page): farthest next use on top; stale entries skipped lazily
    hits = 0
    for i, page in enumerate(requests):
        if page in cached:
            hits += 1
        elif len(cached) == capacity:
            while True:
                neg_t, _, victim = heapq.heappop(heap)
                if cached.get(victim) == -neg_t:  # still current, not a stale entry
                    del cached[victim]
                    break
        cached[page] = next_use[i]
        heapq.heappush(heap, (-next_use[i], i, page))
    return hits


# ---------------------------------------------------------------------------
# Storage engines: LSM compaction, WAL recovery, external sorting
# ---------------------------------------------------------------------------


def lsm_compact(runs: Sequence[Sequence[tuple]], bottom: bool = True,
                counter: OpCounter | None = None) -> list[tuple]:
    """Merge sorted LSM runs: newest version of each key wins; tombstones hide older versions.

    O'Neil, Cheng, Gawlick & O'Neil, "The log-structured merge-tree (LSM-tree)"
    (1996); the merge itself is Levitin §5.1 generalized to k runs.
    ``runs[0]`` is the NEWEST run; each run is a list of (key, value) pairs
    sorted by key with distinct keys; value ``None`` is a tombstone (a delete).
    A tombstone is dropped only when ``bottom`` is True (no older level exists
    below); otherwise it is kept so it keeps hiding older versions.
    A min-heap of (key, run index) makes equal keys arrive newest first.
    O(N log r) for N pairs in r runs; ticks "heap_ops".
    """
    heap: list = []
    for r, run in enumerate(runs):
        if run:
            heap.append((run[0][0], r, 0))
    heapq.heapify(heap)
    out: list[tuple] = []
    last_key = _NO_KEY
    while heap:
        key, r, i = heapq.heappop(heap)
        tick(counter, "heap_ops")
        if i + 1 < len(runs[r]):
            heapq.heappush(heap, (runs[r][i + 1][0], r, i + 1))
            tick(counter, "heap_ops")
        if key == last_key:
            continue  # an older version of a key whose newest version was already handled
        last_key = key
        value = runs[r][i][1]
        if value is None and bottom:
            continue  # tombstone at the last level: nothing older left to hide
        out.append((key, value))
    return out


_NO_KEY = object()  # sentinel that equals no real key


def lsm_get(runs: Sequence[Sequence[tuple]], key: Hashable):
    """Read path of an LSM tree: search runs newest to oldest; a tombstone means "deleted".

    Returns the value, or None when the key is absent or deleted. Each run is
    binary-searched (Levitin §4.4), so O(r log N) for r runs; real engines skip
    most runs with a Bloom filter per run (Lesson 16).
    """
    for run in runs:
        keys = [k for k, _ in run]
        i = bisect.bisect_left(keys, key)
        if i < len(run) and run[i][0] == key:
            return run[i][1]
    return None


def wal_recover(disk: Iterable[tuple], records: Sequence[tuple]) -> list[tuple]:
    """Rebuild the committed state after a crash: analysis, redo all, undo losers backwards.

    Simplified ARIES: Mohan, Haderle, Lindsay, Pirahesh & Schwarz, "ARIES: a
    transaction recovery method ... using write-ahead logging" (1992).
    ``disk``: (key, value) pairs found on disk. ``records`` (oldest first):
    ("update", txn, key, before, after) or ("commit", txn); value None means
    "absent". Transactions with no commit record are losers.
    1. Analysis: collect the committed transactions.
    2. Redo: replay EVERY update in log order (repeat history).
    3. Undo: scan the log backwards; restore ``before`` for each loser update.
    Returns the final state as (key, value) pairs sorted by key, without
    absent keys. Θ(L) dictionary work plus sorting the output.
    """
    state = dict(disk)
    committed = {rec[1] for rec in records if rec[0] == "commit"}  # analysis
    for rec in records:  # redo
        if rec[0] == "update":
            _, _, key, _, after = rec
            state[key] = after
    for rec in reversed(records):  # undo
        if rec[0] == "update" and rec[1] not in committed:
            _, _, key, before, _ = rec
            state[key] = before
    return sorted((k, v) for k, v in state.items() if v is not None)


def external_sort_plan(N: int, B: int) -> tuple[int, int, int]:
    """Cost model of external merge sort: (initial runs, passes, page I/Os).

    Aggarwal & Vitter, "The input/output complexity of sorting and related
    problems" (1988); Knuth, *The Art of Computer Programming* (TAOCP) Vol. 3
    §5.4. The file has N pages and the sort may use B buffer pages. Pass 0
    sorts B pages at a time into ceil(N / B) runs; each merge pass merges
    B - 1 runs (one buffer is for output). Every pass reads and writes every
    page: 2N Input/Output (I/O) operations per pass, so the total is
    2N (1 + ceil(log_{B-1} ceil(N/B))). O(number of passes) time.
    """
    if N < 1 or B < 3:
        raise ValueError("need N >= 1 pages and B >= 3 buffer pages")
    runs = -(-N // B)
    initial = runs
    passes = 1
    while runs > 1:
        runs = -(-runs // (B - 1))
        passes += 1
    return initial, passes, 2 * N * passes


def external_merge_sort(items: Iterable, memory: int, fan_in: int | None = None,
                        counter: OpCounter | None = None) -> tuple[list, dict]:
    """Sort with at most ``memory`` items per run and ``fan_in``-way merges; return (sorted, stats).

    The algorithm behind ``external_sort_plan`` (Knuth, TAOCP Vol. 3 §5.4, 1973),
    simulated in memory: runs are Python lists standing in for files.
    ``fan_in`` defaults to memory - 1 (one buffer per input run, one for
    output). stats = {"runs": initial runs, "passes": passes including pass 0}.
    O(n log n) time; ticks "heap_ops" (one per item per merge pass).
    """
    if memory < 2:
        raise ValueError("memory must hold at least 2 items")
    fan_in = fan_in or memory - 1
    if fan_in < 2:
        raise ValueError("fan_in must be at least 2")
    data = list(items)
    runs = [sorted(data[i:i + memory]) for i in range(0, len(data), memory)]  # pass 0
    stats = {"runs": len(runs), "passes": 1 if runs else 0}
    while len(runs) > 1:
        merged = []
        for g in range(0, len(runs), fan_in):
            group = runs[g:g + fan_in]
            heap = [(run[0], j, 0) for j, run in enumerate(group)]
            heapq.heapify(heap)
            out = []
            while heap:
                value, j, i = heapq.heappop(heap)
                tick(counter, "heap_ops")
                out.append(value)
                if i + 1 < len(group[j]):
                    heapq.heappush(heap, (group[j][i + 1], j, i + 1))
            merged.append(out)
        runs = merged
        stats["passes"] += 1
    return (runs[0] if runs else []), stats


# ---------------------------------------------------------------------------
# Placement: consistent hashing, jump hash, rendezvous hashing
# ---------------------------------------------------------------------------


class ConsistentHashRing:
    """Consistent hashing: servers at hashed points on a ring; a key goes to the next point clockwise.

    Karger, Lehman, Leighton, Panigrahy, Levine & Lewin, "Consistent hashing and
    random trees" (1997). Each server owns ``vnodes`` virtual points, which
    evens out the load. Adding a server moves only the keys that now land on
    its points (about K / (N + 1) of K keys). Lookup O(log(N · vnodes)) by
    binary search over the sorted points; add/remove O(N · vnodes) here.
    """

    def __init__(self, vnodes: int = 64, seed: int = 0):
        if vnodes < 1:
            raise ValueError("vnodes must be positive")
        self.vnodes = vnodes
        self.seed = seed
        self.points: list[int] = []  # sorted ring positions
        self.owner: dict[int, Hashable] = {}

    def _position(self, item: Hashable) -> int:
        return _hash64(item, self.seed)

    def add_server(self, server: Hashable) -> None:
        """Place the server's virtual nodes on the ring. O(vnodes · N) with sorted insertion."""
        for v in range(self.vnodes):
            pos = self._position((server, v))
            if pos not in self.owner:  # a 64-bit collision is astronomically unlikely
                self.owner[pos] = server
                bisect.insort(self.points, pos)

    def remove_server(self, server: Hashable) -> None:
        """Take the server's virtual nodes off the ring."""
        self.points = [p for p in self.points if self.owner[p] != server]
        self.owner = {p: s for p, s in self.owner.items() if s != server}

    def lookup(self, key: Hashable) -> Hashable:
        """Server responsible for key: the first point at or after hash(key), wrapping around."""
        if not self.points:
            raise LookupError("the ring has no servers")
        i = bisect.bisect_left(self.points, self._position(("key", key)))
        if i == len(self.points):
            i = 0  # wrap past the top of the ring
        return self.owner[self.points[i]]

    def servers(self) -> set:
        """The servers currently on the ring. Θ(points)."""
        return set(self.owner.values())


def jump_consistent_hash(key: int, num_buckets: int) -> int:
    """Bucket in 0..num_buckets-1 for a 64-bit integer key, using no memory at all.

    Lamping & Veach, "A fast, minimal memory, consistent hash algorithm"
    (2014). The key seeds a linear congruential generator; the loop "jumps"
    forward through bucket numbers, and the last jump that stays below
    num_buckets is the answer. Growing from n to n + 1 buckets moves exactly
    the keys that now land in the new bucket (about 1/(n + 1) of them).
    O(log num_buckets) expected time.
    """
    if num_buckets < 1:
        raise ValueError("num_buckets must be positive")
    key &= (1 << 64) - 1
    b, j = -1, 0
    while j < num_buckets:
        b = j
        key = (key * 2862933555777941757 + 1) & ((1 << 64) - 1)
        j = int((b + 1) * (float(1 << 31) / float((key >> 33) + 1)))
    return b


def rendezvous_hash(key: Hashable, servers: Iterable[Hashable], seed: int = 0) -> Hashable:
    """Highest Random Weight (HRW) hashing: the server with the largest hash(key, server) wins.

    Thaler & Ravishankar, "Using name-based mappings to increase hit rates"
    (1998). No ring is needed; removing a server moves only its own keys.
    Θ(N) per lookup for N servers.
    """
    best, best_weight = None, -1
    for server in servers:
        weight = _hash64((key, server), seed)
        if weight > best_weight:
            best, best_weight = server, weight
    if best is None:
        raise LookupError("no servers")
    return best


# ---------------------------------------------------------------------------
# Traffic control: token bucket, backoff with jitter
# ---------------------------------------------------------------------------


class TokenBucket:
    """Rate limiter: up to ``capacity`` tokens, refilled at ``rate`` tokens per second.

    The classic traffic-shaping algorithm (used, for example, by the token
    bucket meters of Request for Comments (RFC) 2697, 1999). A request spends
    ``cost`` tokens or is denied. The refill is LAZY: nothing ticks; when a
    request arrives we add (now - last) · rate tokens, capped at capacity.
    O(1) per request. The bucket starts full at ``start``.
    """

    def __init__(self, capacity: float, rate: float, start: float = 0):
        if capacity <= 0 or rate < 0:
            raise ValueError("need capacity > 0 and rate >= 0")
        self.capacity = capacity
        self.rate = rate
        self.tokens = capacity
        self.last = start

    def allow(self, now: float, cost: float = 1) -> bool:
        """Refill for the time since the last call, then spend ``cost`` tokens if available."""
        if now < self.last:
            raise ValueError("time went backwards")
        self.tokens = min(self.capacity, self.tokens + (now - self.last) * self.rate)
        self.last = now
        if self.tokens >= cost:
            self.tokens -= cost
            return True
        return False


def token_bucket_decisions(capacity: float, rate: float, times: Iterable[float]) -> list[bool]:
    """Allow/deny decision for each request time (non-decreasing), bucket full at time 0.

    Batch driver for ``TokenBucket`` (RFC 2697, 1999). Θ(n) however far apart
    the requests are, thanks to the lazy refill.
    """
    bucket = TokenBucket(capacity, rate)
    return [bucket.allow(t) for t in times]


def backoff_schedule(base: int, cap: int, deadline: int, mode: str = "full",
                     draws: Sequence[float] | None = None, attempts: int = 10,
                     rng: random.Random | None = None) -> list[int]:
    """Sleep times (whole milliseconds) between retries: capped exponential backoff with jitter.

    Brooker, "Exponential Backoff and Jitter", Amazon Web Services (AWS)
    Architecture Blog (2015); binary exponential backoff goes back to Ethernet
    (Metcalfe & Boggs, 1976). ``draws[a]`` is a uniform number in [0, 1) for
    attempt a (generated from ``rng`` when not given). Modes:
    - "none": min(cap, base · 2^a) (no jitter: clients stay synchronized);
    - "full": uniform integer in 0..e where e = min(cap, base · 2^a);
    - "equal": e - h + uniform in 0..h where h = e // 2 (keeps at least half);
    - "decorrelated": min(cap, uniform in base..3·prev), prev starts at base.
    Retrying stops before the running total of sleeps would exceed ``deadline``.
    Θ(attempts) time.
    """
    if draws is None:
        rng = rng or random.Random()
        draws = [rng.random() for _ in range(attempts)]
    sleeps: list[int] = []
    total, prev = 0, base
    for a, u in enumerate(draws):
        e = min(cap, base * 2 ** min(a, 62))  # min(a, 62): avoid giant integers
        if mode == "none":
            sleep = e
        elif mode == "full":
            sleep = math.floor(u * (e + 1))
        elif mode == "equal":
            h = e // 2
            sleep = e - h + math.floor(u * (h + 1))
        elif mode == "decorrelated":
            sleep = min(cap, base + math.floor(u * (3 * prev - base + 1)))
            prev = sleep
        else:
            raise ValueError(f"unknown mode {mode!r}")
        if total + sleep > deadline:
            break
        total += sleep
        sleeps.append(sleep)
    return sleeps


# ---------------------------------------------------------------------------
# Logical clocks
# ---------------------------------------------------------------------------
# Events are tuples: ("local", p), ("send", p, msg_id), ("recv", p, msg_id),
# where p is a process name and every "recv" comes after its "send".


def lamport_timestamps(events: Sequence[tuple]) -> list[int]:
    """Lamport clock value of every event.

    Lamport, "Time, clocks, and the ordering of events in a distributed system"
    (1978). Each process counts its own events; a message carries the
    sender's clock, and the receiver jumps to max(own, received) + 1.
    Guarantee: if e happens before f then L(e) < L(f) (not the converse).
    Θ(number of events).
    """
    clock: dict[Hashable, int] = {}
    in_flight: dict[Hashable, int] = {}
    stamps = []
    for ev in events:
        kind, p = ev[0], ev[1]
        if kind == "recv":
            clock[p] = max(clock.get(p, 0), in_flight[ev[2]]) + 1
        else:
            clock[p] = clock.get(p, 0) + 1
            if kind == "send":
                in_flight[ev[2]] = clock[p]
        stamps.append(clock[p])
    return stamps


def vector_timestamps(events: Sequence[tuple]) -> list[dict]:
    """Vector clock of every event (a dict process -> count; missing entries are 0).

    Fidge (1988) and Mattern (1989). A process increments its own entry on every
    event; a receive first takes the entry-wise maximum with the message's
    clock. Strong guarantee: e happens before f exactly when V(e) < V(f)
    (see ``vc_compare``). Θ(events · processes).
    """
    clock: dict[Hashable, dict] = {}
    in_flight: dict[Hashable, dict] = {}
    stamps = []
    for ev in events:
        kind, p = ev[0], ev[1]
        mine = dict(clock.get(p, {}))
        if kind == "recv":
            mine = vc_merge(mine, in_flight[ev[2]])
        mine[p] = mine.get(p, 0) + 1
        clock[p] = mine
        if kind == "send":
            in_flight[ev[2]] = dict(mine)
        stamps.append(dict(mine))
    return stamps


def vc_merge(a: dict, b: dict) -> dict:
    """Entry-wise maximum of two vector clocks (Fidge, 1988; Mattern, 1989). Θ(processes)."""
    out = dict(a)
    for p, c in b.items():
        out[p] = max(out.get(p, 0), c)
    return out


def vc_compare(a: dict, b: dict) -> str:
    """Order of two vector clocks: "equal", "before" (a happened before b), "after" or "concurrent".

    Mattern (1989): a <= b when every entry of a is <= the entry of b.
    Θ(processes).
    """
    keys = set(a) | set(b)
    a_le_b = all(a.get(p, 0) <= b.get(p, 0) for p in keys)
    b_le_a = all(b.get(p, 0) <= a.get(p, 0) for p in keys)
    if a_le_b and b_le_a:
        return "equal"
    if a_le_b:
        return "before"
    if b_le_a:
        return "after"
    return "concurrent"


# ---------------------------------------------------------------------------
# Raft (pure functions on logs of terms)
# ---------------------------------------------------------------------------
# A log is a list of terms; log[i] is the term of entry i, and log[0] = 0 is
# a sentinel, so real entries are numbered from 1 as in the Raft paper.


def raft_append_entries(log: Sequence[int], prev_index: int, prev_term: int,
                        entries: Sequence[int]) -> tuple[bool, list[int]]:
    """Follower side of Raft's AppendEntries: the log-matching consistency check.

    Ongaro & Ousterhout, "In search of an understandable consensus algorithm"
    (2014), Figure 2. Reject when the follower has no entry at prev_index with
    term prev_term. Otherwise, for each new entry: if an existing entry at that
    index has a different term, delete it and everything after it; append the
    entries not already present. Entries that already match are never deleted,
    so a retried or delayed message is harmless. Returns (success, new log)
    without modifying the input. O(len(log) + len(entries)).
    """
    if prev_index >= len(log) or log[prev_index] != prev_term:
        return False, list(log)
    new = list(log)
    i = prev_index + 1
    for term in entries:
        if i < len(new) and new[i] != term:
            del new[i:]  # conflict: drop this entry and all that follow
        if i >= len(new):
            new.append(term)
        i += 1
    return True, new


def raft_commit_index(log: Sequence[int], match_index: Sequence[int], current_term: int,
                      commit_index: int) -> int:
    """Leader's new commit index: the largest N > commit_index stored on a majority with log[N] == current_term.

    Ongaro & Ousterhout (2014), Figure 2 ("Rules for Servers", leaders) and
    the Figure 8 counterexample: a leader may count replicas only for entries
    of its OWN term; older entries commit indirectly. ``match_index`` lists
    every server, leader included. The commit index never decreases.
    O(s log s) for s servers.
    """
    s = len(match_index)
    ranked = sorted(match_index, reverse=True)
    majority_stored = ranked[s // 2]  # the largest N held by more than half the servers
    for N in range(min(majority_stored, len(log) - 1), commit_index, -1):
        if log[N] == current_term:
            return N
    return commit_index


def raft_log_up_to_date(cand_last_term: int, cand_last_index: int,
                        my_last_term: int, my_last_index: int) -> bool:
    """Voting rule: grant a vote only if the candidate's log is at least as up to date as mine.

    Ongaro & Ousterhout (2014) §5.4.1: compare the terms of the last entries;
    if equal, the longer log wins. O(1).
    """
    return (cand_last_term, cand_last_index) >= (my_last_term, my_last_index)


# ---------------------------------------------------------------------------
# Replica repair and convergence: Merkle trees, CRDT counters
# ---------------------------------------------------------------------------


def _sha256_leaf(x) -> str:
    return hashlib.sha256(repr(x).encode()).hexdigest()


def _sha256_pair(x: str, y: str) -> str:
    return hashlib.sha256((x + y).encode()).hexdigest()


def merkle_tree(leaves: Sequence, leaf_hash: Callable | None = None,
                combine: Callable | None = None) -> list:
    """Hash tree in an array: T[1] is the root, node v has children 2v, 2v + 1, leaf i is T[n + i].

    Merkle, "A digital signature based on a conventional encryption function"
    (CRYPTO 1987). Defaults use Secure Hash Algorithm 256 (SHA-256). The leaf
    list is padded with None to a power of two. Θ(n) hash computations.
    """
    leaf_hash = leaf_hash or _sha256_leaf
    combine = combine or _sha256_pair
    n = 1
    while n < len(leaves):
        n *= 2
    padded = list(leaves) + [None] * (n - len(leaves))
    T: list = [None] * (2 * n)
    for i, x in enumerate(padded):
        T[n + i] = leaf_hash(x)
    for v in range(n - 1, 0, -1):
        T[v] = combine(T[2 * v], T[2 * v + 1])
    return T


def merkle_diff(A: Sequence, B: Sequence, leaf_hash: Callable | None = None,
                combine: Callable | None = None, counter: OpCounter | None = None) -> list[int]:
    """Indices of the leaves where replicas A and B differ, descending only into differing subtrees.

    Merkle (1987); used for anti-entropy repair in Dynamo-style stores
    (DeCandia et al., 2007). Compare roots; if equal, everything agrees;
    otherwise recurse into both children. With d differing leaves of n this
    makes O(d log n) node comparisons (ticks "comparisons").
    """
    if len(A) != len(B):
        raise ValueError("replicas must have the same number of blocks")
    if not A:
        return []
    TA = merkle_tree(A, leaf_hash, combine)
    TB = merkle_tree(B, leaf_hash, combine)
    n = len(TA) // 2
    diff: list[int] = []

    def compare(v: int) -> None:
        tick(counter, "comparisons")
        if TA[v] == TB[v]:
            return
        if v >= n:
            diff.append(v - n)
        else:
            compare(2 * v)
            compare(2 * v + 1)

    compare(1)
    return diff


def gcounter_merge(a: dict, b: dict) -> dict:
    """Merge two Grow-only Counter (G-Counter) states: entry-wise maximum.

    Shapiro, Preguiça, Baquero & Zawirski, "Conflict-free replicated data types"
    (2011). The maximum is commutative, associative and idempotent, so replicas
    converge whatever the order or repetition of merges. Θ(replicas).
    """
    return vc_merge(a, b)


class GCounter:
    """Grow-only Counter (G-Counter) CRDT: one slot per replica; value = sum of slots.

    Shapiro et al. (2011). A replica only ever increases its OWN slot, so the
    entry-wise maximum of two states never loses an increment. O(1) increment,
    Θ(replicas) merge and value.
    """

    def __init__(self, replica: Hashable):
        self.replica = replica
        self.counts: dict = {}

    def increment(self, amount: int = 1) -> None:
        """Add amount (>= 0) to this replica's own slot. O(1)."""
        if amount < 0:
            raise ValueError("a G-Counter can only grow")
        self.counts[self.replica] = self.counts.get(self.replica, 0) + amount

    def merge(self, other: "GCounter") -> None:
        """Absorb another replica's state (in place)."""
        self.counts = gcounter_merge(self.counts, other.counts)

    def value(self) -> int:
        """The counter's value: the sum of all slots. Θ(replicas)."""
        return sum(self.counts.values())


class PNCounter:
    """Positive-Negative Counter (PN-Counter) CRDT: two G-Counters, value = P - N.

    Shapiro et al. (2011). Increments go to P and decrements to N; both only
    grow, so merging by entry-wise maximum stays correct. O(1) update,
    Θ(replicas) merge and value.
    """

    def __init__(self, replica: Hashable):
        self.replica = replica
        self.P = GCounter(replica)
        self.N = GCounter(replica)

    def increment(self, amount: int = 1) -> None:
        """Count up: grows P. O(1)."""
        self.P.increment(amount)

    def decrement(self, amount: int = 1) -> None:
        """Count down: grows N (nothing ever shrinks). O(1)."""
        self.N.increment(amount)

    def merge(self, other: "PNCounter") -> None:
        """Absorb another replica's state: merge P with P and N with N. Θ(replicas)."""
        self.P.merge(other.P)
        self.N.merge(other.N)

    def value(self) -> int:
        """P minus N. Θ(replicas)."""
        return self.P.value() - self.N.value()
