/* Systems-frontier pack — the bridge between the classics (Levels 4–5) and the research frontier (Level 7).
   Each problem is the deterministic core of a component inside a real system:
   - Chapter 14 (graphs): Dinic's blocking-flow max flow, Borůvka's parallel-friendly Minimum Spanning Tree (MST) rounds,
     Meyer–Sanders Δ-stepping shortest paths.
   - Chapter 15 (strings): the Burrows–Wheeler Transform (BWT) and its inverse by LF-mapping, Kasai's linear-time
     Longest Common Prefix (LCP) array.
   - Chapter 16 (streaming): Count Sketch with signed hashes, A-Res weighted reservoir sampling.
   - Chapter 17 (distributed systems): Lamport clocks, vector clocks, rendezvous (Highest Random Weight) hashing,
     Flexible Paxos quorum checks, consistent hashing with bounded loads.
   - Chapter 18: FM-index backward search (the engine of genome read aligners).
   Grading is deterministic: wherever a real system hashes or flips a coin, the hash values / coin flips are input.
   Wrapped in an IIFE so helper names never collide with other problem files (they share one global scope). */
(function () {
  "use strict";

  const L14 = "lessons/14-advanced-graphs/README.md";
  const L15 = "lessons/15-dp-and-interview-patterns/README.md";
  const L16 = "lessons/16-randomized-amortized-streaming/README.md";
  const L17 = "lessons/17-senior-engineer-playbook/README.md";
  const L18 = "lessons/18-the-frontier/README.md";
  const byNum = (a, b) => a - b;

  /* ---------- shared: random message-passing histories ---------- */
  // P[i] = events of process i in order: ["local"], ["send", m], ["recv", m]; every message is sent once and received once.
  const histGen = (r, n, steps) => {
    const P = Array.from({ length: n }, () => []), pending = Array.from({ length: n }, () => []);
    let mid = 1;
    for (let t = 0; t < steps; t++) {
      const i = r.int(0, n - 1), x = r();
      if (pending[i].length && x < 0.4) P[i].push(["recv", pending[i].splice(r.int(0, pending[i].length - 1), 1)[0]]);
      else if (x < 0.75 && n > 1) { let j = r.int(0, n - 2); if (j >= i) j++; P[i].push(["send", mid]); pending[j].push(mid++); }
      else P[i].push(["local"]);
    }
    pending.forEach((L, i) => L.forEach((m) => P[i].push(["recv", m])));
    return P;
  };
  // Runs the history in any causally valid order. step(i, e, msgValue) returns the value to record for the event
  // (and, for a send, the value carried by the message).
  const replay = (P, step) => {
    const n = P.length, pos = Array(n).fill(0), out = P.map(() => []), sent = new Map();
    let progress = true;
    while (progress) {
      progress = false;
      for (let i = 0; i < n; i++) {
        while (pos[i] < P[i].length) {
          const e = P[i][pos[i]];
          if (e[0] === "recv" && !sent.has(e[1])) break;
          const res = step(i, e, e[0] === "recv" ? sent.get(e[1]) : undefined);
          if (e[0] === "send") sent.set(e[1], res.carry);
          out[i].push(res.stamp);
          pos[i]++;
          progress = true;
        }
      }
    }
    return out;
  };

  /* ================================================================== */
  /* 1 · Lamport clocks and the total order they induce                   */
  /* ================================================================== */
  const lamportStamps = (P, mode) => {
    const C = Array(P.length).fill(0);
    return replay(P, (i, e, t) => {
      if (e[0] === "recv") {
        if (mode === "noplus") C[i] = Math.max(C[i], t);
        else if (mode === "overwrite") C[i] = t + 1;
        else if (mode === "ignore") C[i] = C[i] + 1;
        else C[i] = Math.max(C[i], t) + 1;
      } else C[i] += 1;
      return { stamp: C[i], carry: C[i] };
    });
  };
  const lamportRef = (P, mode) => {
    const T = lamportStamps(P, mode), all = [];
    T.forEach((row, p) => row.forEach((t, k) => all.push([t, p, k])));
    all.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
    return [T, all.map((x) => [x[1], x[2]])];
  };

  ForgeProblems.add({
    id: "lamport-clock-order",
    title: "Lamport Clocks and a Total Order of Events",
    level: 5, chapter: 17, difficulty: 1,
    topics: ["distributed systems", "logical clocks", "causality", "simulation"],
    strategy: "Simulate the processes in any causally valid order; receive = max(own, message) + 1",
    source: "Lamport (1978), \"Time, Clocks, and the Ordering of Events in a Distributed System\", Communications of the ACM 21(7):558–565",
    summary: "Give every event a Lamport timestamp, then list all events in the total order (timestamp, process id).",
    statement: `
<p>Machines in a cluster have no shared clock, and their wall clocks drift. Lamport's insight (1978) was that you rarely need real
time — you need an order that never contradicts <b>causality</b>: if event a could have influenced event b, a must come first.
Lamport clocks give exactly that with one integer per process, and they still order operations in distributed locks, version
stamps and replicated logs today.</p>
<p>The input <code>P</code> describes n processes. <code>P[i]</code> is the list of process i's events, in order; each event is
<code>["local"]</code>, <code>["send", m]</code> or <code>["recv", m]</code>, where the integer m names a message that is sent exactly
once and received exactly once. Every process i keeps a counter <code>C[i]</code>, starting at 0:</p>
<ul>
<li><b>local</b> or <b>send</b>: <code>C[i] ← C[i] + 1</code>; the event's timestamp is the new <code>C[i]</code>, and a send attaches it to message m;</li>
<li><b>recv m</b>: <code>C[i] ← max(C[i], t<sub>m</sub>) + 1</code>, where t<sub>m</sub> is the timestamp attached to m.</li>
</ul>
<p>A receive can only be processed after its send, so the processes cannot simply be handled one after another — keep a position
per process and repeatedly advance every process as far as it can go (a receive whose message has not been sent yet blocks its
process until a later pass).</p>
<p>Write <code>LamportOrder(P)</code> returning <code>[T, order]</code>: <code>T[i][k]</code> = the timestamp of process i's k-th
event (0-based k), and <code>order</code> = all events as <code>[i, k]</code> pairs sorted by timestamp, ties broken by the smaller
process id.</p>
<ul><li>1 ≤ n ≤ 5, at most 30 events; the history is always consistent (no message is received before it could have been sent).</li></ul>`,
    entry: "LamportOrder",
    params: ["P"],
    exampleCount: 3,
    tests: [
      { args: [[[["send", 1], ["local"]], [["recv", 1], ["local"]]]], expect: [[[1, 2], [2, 3]], [[0, 0], [0, 1], [1, 0], [1, 1]]], explain: "Process 0 stamps its send 1 and its local event 2. Process 1 receives a message stamped 1: max(0, 1) + 1 = 2, then 3. Two events share timestamp 2 — the smaller process id goes first." },
      { args: [[[["recv", 1]], [["local"], ["local"], ["send", 1]]]], expect: [[[4], [1, 2, 3]], [[1, 0], [1, 1], [1, 2], [0, 0]]], explain: "Process 0's first event is a receive, but message 1 hasn't been sent yet, so process 0 must wait. Process 1 stamps 1, 2, 3; now the receive gets max(0, 3) + 1 = 4." },
      { args: [[[], []]], expect: [[[], []], []], explain: "No events at all." },
      { args: [[[["local"], ["local"], ["local"]]]], expect: [[[1, 2, 3]], [[0, 0], [0, 1], [0, 2]]], explain: "One process: the clock just counts its events." },
      { args: [[[["send", 1]], [["local"], ["local"], ["local"], ["recv", 1]]]], expect: [[[1], [1, 2, 3, 4]], [[0, 0], [1, 0], [1, 1], [1, 2], [1, 3]]], explain: "The message carries timestamp 1 but the receiver is already at 3, so the receive gets max(3, 1) + 1 = 4 — the max keeps the receiver's clock from going backwards." },
      { args: [[[["send", 1], ["recv", 2]], [["recv", 1], ["send", 3]], [["local"], ["recv", 3], ["send", 2]]]], expect: [[[1, 6], [2, 3], [1, 4, 5]], [[0, 0], [2, 0], [1, 0], [1, 1], [2, 1], [2, 2], [0, 1]]], explain: "Causality travels 0 → 1 → 2 → 0, so process 0's receive must come after everything else; its timestamp 6 says so." },
      { args: [[[["send", 1], ["send", 2], ["local"]], [["recv", 2], ["recv", 1], ["local"]]]], expect: [[[1, 2, 3], [3, 4, 5]], [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]]] },
      { args: [[[["local"], ["send", 1], ["recv", 2]], [["send", 2], ["local"], ["recv", 1]], [["local"]]]], expect: [[[1, 2, 3], [1, 2, 3], [1]], [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [0, 2], [1, 2]]] },
    ],
    random: { count: 30, gen: (r, i) => [histGen(r, 1 + (i % 4), 3 + i)] },
    reference: (P) => lamportRef(P),
    mutants: [
      { fn: (P) => lamportRef(P, "noplus"), hint: "A receive sometimes gets the same timestamp as its send, so the order can put the receive before the send. After taking the max, add 1: a receive is a new event on its process." },
      { fn: (P) => lamportRef(P, "overwrite"), hint: "Some receive timestamps go backwards on their own process. The receiver keeps the larger of its own clock and the message's timestamp — max(C[i], t) + 1, not just t + 1." },
      { fn: (P) => lamportRef(P, "ignore"), hint: "Your receives ignore the message's timestamp, so an event can get a smaller timestamp than something that caused it. On a receive, first jump to the message's timestamp if it is larger." },
    ],
    hints: [
      "The only rule that crosses processes is the receive rule. Why must the receive be at least t + 1? (It happens after the send, which has timestamp t.)",
      "Keep pos[i] (next event of each process), C[i], and a map sent: message → timestamp. Loop 'while something advanced': for each process, keep handling its next event unless it is a receive whose message is not in sent yet.",
      "When all events are stamped, build triples [T[i][k], i, k], sort them (lists compare lexicographically), and keep [i, k] from each.",
    ],
    starter: {
      pseudo: `ALGORITHM LamportOrder(P)
    // P[i] = list of events ["local"] / ["send", m] / ["recv", m]
    n ← length(P)
    pos ← array(n, 0)
    C ← array(n, 0)
    T ← array(n, [])
    sent ← map()
    ...
    return [T, order]`,
      js: `function LamportOrder(P) {
  const n = P.length, pos = Array(n).fill(0), C = Array(n).fill(0), T = P.map(() => []), sent = new Map();
  // ...
  return [T, []];
}`,
    },
    solution: {
      pseudo: `ALGORITHM LamportOrder(P)
    n ← length(P)
    pos ← array(n, 0)
    C ← array(n, 0)
    T ← array(n, [])
    sent ← map()
    progress ← true
    while progress do
        progress ← false
        for i ← 0 to n - 1 do
            while pos[i] < length(P[i]) and Ready(P[i][pos[i]], sent) do
                e ← P[i][pos[i]]
                if e[0] = "recv" then
                    C[i] ← max(C[i], sent[e[1]]) + 1
                else
                    C[i] ← C[i] + 1
                if e[0] = "send" then
                    sent[e[1]] ← C[i]
                append(T[i], C[i])
                pos[i] ← pos[i] + 1
                progress ← true
    all ← []
    for i ← 0 to n - 1 do
        for k ← 0 to length(T[i]) - 1 do
            append(all, [T[i][k], i, k])
    order ← []
    for each x in sorted(all) do
        append(order, [x[1], x[2]])
    return [T, order]

ALGORITHM Ready(e, sent)
    return e[0] ≠ "recv" or contains(sent, e[1])`,
      js: `function LamportOrder(P) {
  const n = P.length, pos = Array(n).fill(0), C = Array(n).fill(0), T = P.map(() => []), sent = new Map();
  let progress = true;
  while (progress) {
    progress = false;
    for (let i = 0; i < n; i++) {
      while (pos[i] < P[i].length) {
        const e = P[i][pos[i]];
        if (e[0] === "recv" && !sent.has(e[1])) break;
        if (e[0] === "recv") C[i] = Math.max(C[i], sent.get(e[1])) + 1;
        else C[i] += 1;
        if (e[0] === "send") sent.set(e[1], C[i]);
        T[i].push(C[i]);
        pos[i]++;
        progress = true;
      }
    }
  }
  const all = [];
  T.forEach((row, i) => row.forEach((t, k) => all.push([t, i, k])));
  all.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  return [T, all.map((x) => [x[1], x[2]])];
}`,
      python: `def lamport_order(P):
    n = len(P)
    pos, C, T, sent = [0] * n, [0] * n, [[] for _ in range(n)], {}
    progress = True
    while progress:
        progress = False
        for i in range(n):
            while pos[i] < len(P[i]):
                e = P[i][pos[i]]
                if e[0] == "recv" and e[1] not in sent:
                    break
                C[i] = max(C[i], sent[e[1]]) + 1 if e[0] == "recv" else C[i] + 1
                if e[0] == "send":
                    sent[e[1]] = C[i]
                T[i].append(C[i])
                pos[i] += 1
                progress = True
    triples = sorted((T[i][k], i, k) for i in range(n) for k in range(len(T[i])))
    return [T, [[i, k] for _, i, k in triples]]`,
      explain: "Clock condition: if a happened-before b then C(a) < C(b) — along a process the counter strictly grows, and a receive is stamped above its send. Sorting by (timestamp, process id) therefore gives a total order that respects causality. Every pass of the outer loop advances at least one event (the history is consistent), so the simulation does at most E passes of O(n) each; with E events it is O(E·n + E log E).",
    },
    complexity: "O(E·n + E log E) for E events and n processes",
    followUp: "The converse fails: C(a) < C(b) does NOT mean a caused b — Lamport clocks cannot detect concurrency (that needs vector clocks, the next problem). Lamport's paper uses exactly this total order to build a mutual-exclusion algorithm; hybrid logical clocks (used by CockroachDB) combine it with physical time.",
    distractors: ["C[i] ← max(C[i], sent[e[1]])", "C[i] ← sent[e[1]] + 1", "for each x in all do"],
    visual: "sims/raft-consensus.html",
    lesson: L17,
  });

  /* ================================================================== */
  /* 2 · Vector clocks: happened-before vs. concurrent                    */
  /* ================================================================== */
  const vcStamps = (P, mode) => {
    const n = P.length, V = Array.from({ length: n }, () => Array(n).fill(0));
    return replay(P, (i, e, m) => {
      let carry;
      if (e[0] === "recv") { for (let j = 0; j < n; j++) V[i][j] = Math.max(V[i][j], m[j]); if (mode !== "norecvinc") V[i][i]++; }
      else if (e[0] === "send" && mode === "sendfirst") { carry = V[i].slice(); V[i][i]++; }
      else V[i][i]++;
      return { stamp: V[i].slice(), carry: carry || V[i].slice() };
    });
  };
  const vcLeq = (a, b) => a.every((x, j) => x <= b[j]);
  const vcRef = (P, Q, mode) => {
    if (mode === "lamport") {
      const T = lamportStamps(P);
      return Q.map(([p, a, q, b]) => (T[p][a] < T[q][b] ? "before" : T[p][a] > T[q][b] ? "after" : "concurrent"));
    }
    const V = vcStamps(P, mode);
    return Q.map(([p, a, q, b]) => {
      const x = V[p][a], y = V[q][b], same = vcLeq(x, y) && vcLeq(y, x);
      if (mode === "strict") return x.every((v, j) => v < y[j]) ? "before" : y.every((v, j) => v < x[j]) ? "after" : "concurrent";
      return !same && vcLeq(x, y) ? "before" : !same && vcLeq(y, x) ? "after" : "concurrent";
    });
  };
  const vcGen = (r, i) => {
    const n = 2 + (i % 3), P = histGen(r, n, 4 + i), ev = [];
    P.forEach((row, p) => row.forEach((_, k) => ev.push([p, k])));
    const Q = [];
    if (ev.length >= 2) for (let t = 0; t < 6; t++) { const a = r.pick(ev); let b = r.pick(ev); if (a === b) b = ev[(ev.indexOf(a) + 1) % ev.length]; Q.push([a[0], a[1], b[0], b[1]]); }
    return [P, Q];
  };

  ForgeProblems.add({
    id: "vector-clocks-happens-before",
    title: "Vector Clocks: Before, After or Concurrent?",
    level: 6, chapter: 17, difficulty: 1,
    topics: ["distributed systems", "logical clocks", "causality", "partial orders"],
    strategy: "One counter per process; receive = element-wise max, then tick; compare vectors component-wise",
    source: "Fidge (1988), \"Timestamps in Message-Passing Systems That Preserve the Partial Ordering\" (11th Australian Computer Science Conference) · Mattern (1989), \"Virtual Time and Global States of Distributed Systems\"",
    summary: "Compute vector timestamps for a message-passing history and classify pairs of events as before, after or concurrent.",
    statement: `
<p>Lamport clocks can say "a might have caused b" but never "a and b were concurrent" — and concurrency is exactly what a replicated
database must detect: two concurrent writes to the same key are a <b>conflict</b> that needs resolving, while a write that causally
follows another simply replaces it. <b>Vector clocks</b> (Fidge 1988, Mattern 1989) capture the happened-before relation exactly.</p>
<p>The history <code>P</code> uses the same encoding as the Lamport-clock problem: <code>P[i]</code> is process i's list of events
<code>["local"]</code>, <code>["send", m]</code>, <code>["recv", m]</code>. Each of the n processes keeps a vector <code>V[i][0..n−1]</code>
of zeros:</p>
<ul>
<li><b>local</b> or <b>send</b>: <code>V[i][i] ← V[i][i] + 1</code>; the event's timestamp is a <i>copy</i> of the new <code>V[i]</code>, and a send attaches that copy to the message;</li>
<li><b>recv m</b>: <code>V[i][j] ← max(V[i][j], W[j])</code> for every j, where W is the vector attached to m; then <code>V[i][i] ← V[i][i] + 1</code>.</li>
</ul>
<p>For timestamps x, y: x ≤ y means x[j] ≤ y[j] for every j. Event a <b>happened before</b> event b exactly when x ≤ y and x ≠ y.</p>
<p>Write <code>VectorClocks(P, Q)</code>. Each query <code>[p, a, q, b]</code> asks about event a of process p and event b of process q
(0-based, two different events). Answer <code>"before"</code> if the first happened before the second, <code>"after"</code> if the second
happened before the first, otherwise <code>"concurrent"</code>. Return the list of answers.</p>
<ul><li>1 ≤ n ≤ 5, at most 30 events, at most 10 queries; the history is consistent. As before, a receive must wait until its send has been processed.</li></ul>`,
    entry: "VectorClocks",
    params: ["P", "Q"],
    exampleCount: 3,
    tests: [
      { args: [[[["send", 1], ["local"]], [["local"], ["recv", 1]]], [[0, 0, 1, 1], [0, 1, 1, 1], [1, 0, 0, 1]]], expect: ["before", "concurrent", "concurrent"], explain: "Timestamps: process 0 → [1,0], [2,0]; process 1 → [0,1], then the receive merges [1,0] and ticks: [1,2]. [1,0] ≤ [1,2]: before. [2,0] vs [1,2] and [0,1] vs [2,0] are incomparable: concurrent — even though Lamport clocks would order the last pair (1 < 2)." },
      { args: [[[["send", 1]], [["recv", 1]]], [[1, 0, 0, 0]]], expect: ["after"], explain: "The receive merges [1,0] and ticks its own slot: [1,1]. The send [1,0] ≤ [1,1], so the first event of the query (the receive) comes after the second." },
      { args: [[[["local"]], [["local"]]], []], expect: [], explain: "No queries, no answers." },
      { args: [[[["send", 1], ["local"]], [["recv", 1], ["send", 2]], [["recv", 2], ["local"]]], [[0, 0, 2, 1], [0, 1, 2, 0], [2, 1, 1, 0]]], expect: ["before", "concurrent", "after"], explain: "Causality is transitive: process 0's send reaches process 2 through process 1, so it is before process 2's local event [1,2,2]. Process 0's local event [2,0,0] was never communicated — concurrent with everything on the other processes." },
      { args: [[[["local"], ["local"], ["local"]], [["local"]]], [[0, 2, 1, 0], [0, 0, 0, 2]]], expect: ["concurrent", "before"], explain: "Process 0 has done three things and process 1 one thing, but they never talked: concurrent. Within one process, earlier events are always before later ones." },
      { args: [[[["send", 1], ["recv", 2]], [["recv", 1], ["send", 2]]], [[0, 1, 1, 1], [0, 0, 0, 1], [1, 0, 0, 1]]], expect: ["after", "before", "before"] },
      { args: [[[["local"], ["send", 1], ["local"], ["recv", 2]], [["send", 2], ["recv", 1], ["local"]], [["local"], ["local"]]], [[0, 0, 1, 2], [1, 0, 0, 3], [0, 2, 1, 2], [2, 1, 0, 3], [1, 1, 0, 1]]], expect: ["before", "before", "concurrent", "concurrent", "after"] },
      { args: [[[["send", 1], ["send", 2]], [["recv", 2], ["recv", 1]]], [[0, 1, 1, 0], [0, 0, 1, 0], [1, 1, 0, 1]]], expect: ["before", "before", "after"] },
    ],
    random: { count: 30, gen: vcGen },
    reference: (P, Q) => vcRef(P, Q),
    mutants: [
      { fn: (P, Q) => vcRef(P, Q, "lamport"), hint: "You never answer \"concurrent\" for events with different timestamps — that's Lamport-clock reasoning, and Lamport clocks can't detect concurrency. Use one counter per process and compare the vectors component by component." },
      { fn: (P, Q) => vcRef(P, Q, "strict"), hint: "You call a pair concurrent whenever some component is equal. 'Before' means x[j] ≤ y[j] for EVERY j, with x ≠ y — not x[j] < y[j] everywhere." },
      { fn: (P, Q) => vcRef(P, Q, "norecvinc"), hint: "A receive can end up with exactly the same vector as its send, so the two look concurrent. After the element-wise max, tick your own slot: the receive is a new event on that process." },
      { fn: (P, Q) => vcRef(P, Q, "sendfirst"), hint: "A send's message seems not to know about the send itself, so a send and its receive come out concurrent. Tick V[i][i] first, then attach a copy of the new vector to the message." },
    ],
    hints: [
      "V[i][j] answers: how many events of process j are in the causal past of process i's current event (including itself when j = i)? With that meaning, what must a receive do to its vector?",
      "Reuse the scheduling loop from the Lamport problem (advance each process until it hits a receive whose message isn't sent yet), but store a COPY of V[i] for every event and in the sent map.",
      "For a query, let x and y be the two stored vectors. Write Leq(x, y) (all components ≤). If Leq(x, y) and x ≠ y → \"before\"; else if Leq(y, x) and x ≠ y → \"after\"; else \"concurrent\".",
    ],
    starter: {
      pseudo: `ALGORITHM VectorClocks(P, Q)
    n ← length(P)
    pos ← array(n, 0)
    V ← matrix(n, n, 0)
    stamp ← array(n, [])
    sent ← map()
    ...
    return out`,
      js: `function VectorClocks(P, Q) {
  // stamp[i][k] = vector timestamp of process i's k-th event
  return [];
}`,
    },
    solution: {
      pseudo: `ALGORITHM VectorClocks(P, Q)
    n ← length(P)
    pos ← array(n, 0)
    V ← matrix(n, n, 0)
    stamp ← array(n, [])
    sent ← map()
    progress ← true
    while progress do
        progress ← false
        for i ← 0 to n - 1 do
            while pos[i] < length(P[i]) and (P[i][pos[i]][0] ≠ "recv" or contains(sent, P[i][pos[i]][1])) do
                e ← P[i][pos[i]]
                if e[0] = "recv" then
                    for j ← 0 to n - 1 do
                        V[i][j] ← max(V[i][j], sent[e[1]][j])
                V[i][i] ← V[i][i] + 1
                if e[0] = "send" then
                    sent[e[1]] ← copy(V[i])
                append(stamp[i], copy(V[i]))
                pos[i] ← pos[i] + 1
                progress ← true
    out ← []
    for each query in Q do
        x ← stamp[query[0]][query[1]]
        y ← stamp[query[2]][query[3]]
        if Leq(x, y) and x ≠ y then
            append(out, "before")
        else if Leq(y, x) and x ≠ y then
            append(out, "after")
        else
            append(out, "concurrent")
    return out

ALGORITHM Leq(x, y)
    for j ← 0 to length(x) - 1 do
        if x[j] > y[j] then
            return false
    return true`,
      js: `function VectorClocks(P, Q) {
  const n = P.length, pos = Array(n).fill(0), V = Array.from({ length: n }, () => Array(n).fill(0));
  const stamp = P.map(() => []), sent = new Map();
  let progress = true;
  while (progress) {
    progress = false;
    for (let i = 0; i < n; i++) {
      while (pos[i] < P[i].length) {
        const e = P[i][pos[i]];
        if (e[0] === "recv" && !sent.has(e[1])) break;
        if (e[0] === "recv") { const W = sent.get(e[1]); for (let j = 0; j < n; j++) V[i][j] = Math.max(V[i][j], W[j]); }
        V[i][i]++;
        if (e[0] === "send") sent.set(e[1], V[i].slice());
        stamp[i].push(V[i].slice());
        pos[i]++;
        progress = true;
      }
    }
  }
  const leq = (x, y) => x.every((v, j) => v <= y[j]);
  return Q.map(([p, a, q, b]) => {
    const x = stamp[p][a], y = stamp[q][b], same = leq(x, y) && leq(y, x);
    return !same && leq(x, y) ? "before" : !same && leq(y, x) ? "after" : "concurrent";
  });
}`,
      python: `def vector_clocks(P, Q):
    n = len(P)
    pos, V = [0] * n, [[0] * n for _ in range(n)]
    stamp, sent = [[] for _ in range(n)], {}
    progress = True
    while progress:
        progress = False
        for i in range(n):
            while pos[i] < len(P[i]):
                e = P[i][pos[i]]
                if e[0] == "recv" and e[1] not in sent:
                    break
                if e[0] == "recv":
                    V[i] = [max(a, b) for a, b in zip(V[i], sent[e[1]])]
                V[i][i] += 1
                if e[0] == "send":
                    sent[e[1]] = V[i][:]
                stamp[i].append(V[i][:])
                pos[i] += 1
                progress = True
    leq = lambda x, y: all(a <= b for a, b in zip(x, y))
    out = []
    for p, a, q, b in Q:
        x, y = stamp[p][a], stamp[q][b]
        if leq(x, y) and x != y:
            out.append("before")
        elif leq(y, x) and x != y:
            out.append("after")
        else:
            out.append("concurrent")
    return out`,
      explain: "Invariant: V[i][j] after an event e equals the number of process-j events in e's causal past (e included). Element-wise max on receive unions the two pasts, and the tick adds the receive itself. Hence a → b exactly when V(a) ≤ V(b) and V(a) ≠ V(b) (Mattern's characterization). The simulation is O(E·n) for E events, and each query costs Θ(n).",
    },
    complexity: "O(E·n) to stamp E events; Θ(n) per query",
    followUp: "Amazon's Dynamo used vector clocks to detect conflicting writes and Riak used them (later 'dotted version vectors') to keep sibling values. A neat shortcut: for event a on process p, a → b iff V(a)[p] ≤ V(b)[p]. Senior twist: vectors grow with the number of writers, which is why production systems switched to version vectors per replica plus pruning.",
    distractors: ["if x[j] ≥ y[j] then", "sent[e[1]] ← V[i]", "V[i][j] ← V[i][j] + sent[e[1]][j]"],
    visual: "sims/raft-consensus.html",
    lesson: L17,
  });

  /* ================================================================== */
  /* 3 · Rendezvous (Highest Random Weight) hashing                        */
  /* ================================================================== */
  const hrwTop = (row, r, down, mode) => {
    const ids = row.map((_, s) => s).filter((s) => !down.includes(s));
    ids.sort((a, b) => (mode === "min" ? row[a] - row[b] || a - b : mode === "bigtie" ? row[b] - row[a] || b - a : row[b] - row[a] || a - b));
    const top = ids.slice(0, r);
    return mode === "byid" ? top.sort(byNum) : top;
  };
  const hrwRef = (H, r, down, mode) => {
    const after = H.map((row) => hrwTop(row, r, down, mode)), before = H.map((row) => hrwTop(row, r, [], mode));
    const moved = H.filter((_, k) => (mode === "setdiff" ? before[k].slice().sort(byNum).join() !== after[k].slice().sort(byNum).join() : before[k][0] !== after[k][0])).length;
    return [after, moved];
  };
  const hrwGen = (r, i) => {
    const S = 2 + (i % 5), K = 1 + r.int(0, 8), rr = r.int(1, Math.min(3, S - 1));
    const H = Array.from({ length: K }, () => Array.from({ length: S }, () => r.int(0, i % 3 === 0 ? 5 : 99)));
    const down = r.shuffle(Array.from({ length: S }, (_, s) => s)).slice(0, r.int(0, S - rr));
    return [H, rr, down.sort(byNum)];
  };

  ForgeProblems.add({
    id: "rendezvous-hashing",
    title: "Rendezvous Hashing: Highest Random Weight",
    level: 5, chapter: 17, difficulty: 2,
    topics: ["hashing", "load balancing", "replication", "distributed systems"],
    strategy: "Every (key, server) pair gets a score; a key's replicas are its r highest-scoring live servers",
    source: "Thaler & Ravishankar (1998), \"Using Name-Based Mappings to Increase Hit Rates\", IEEE/ACM Transactions on Networking 6(1):1–14",
    summary: "Pick each key's r replica servers by highest score, then count how many primaries move when servers go down.",
    statement: `
<p>When a cache or storage cluster maps keys to servers with <code>hash(key) mod n</code>, losing one server reshuffles almost every
key. <b>Rendezvous hashing</b>, also called <b>Highest Random Weight (HRW)</b> hashing, needs no ring and no table: compute a score
<code>h(key, server)</code> for every server and send the key to the server with the highest score. When a server dies, only the keys it
owned move — each to its second-best server — and picking the top r servers gives r replicas for free.</p>
<p>Here the hash scores are given: <code>H[k][s]</code> = the score of key k on server s (keys 0..K−1, servers 0..S−1). Equal scores are
broken in favour of the <b>smaller server id</b>. <code>down</code> lists the servers that have failed.</p>
<p>Write <code>Rendezvous(H, r, down)</code> returning <code>[after, moved]</code>:</p>
<ul>
<li><code>after[k]</code> = key k's r live servers with the highest scores, best first;</li>
<li><code>moved</code> = the number of keys whose <b>primary</b> (best) server differs between the full cluster (nobody down) and the cluster without <code>down</code>.</li>
</ul>
<ul><li>1 ≤ K ≤ 10, 2 ≤ S ≤ 8, 1 ≤ r ≤ S − |down|, scores are integers 0..99.</li></ul>`,
    entry: "Rendezvous",
    params: ["H", "r", "down"],
    exampleCount: 3,
    tests: [
      { args: [[[10, 50, 30], [70, 20, 40], [5, 6, 90]], 1, []], expect: [[[1], [0], [2]], 0], explain: "Each key goes to its highest score: 50 → server 1, 70 → server 0, 90 → server 2. Nobody is down, so nothing moves." },
      { args: [[[10, 50, 30], [70, 20, 40], [5, 6, 90]], 2, [1]], expect: [[[2, 0], [0, 2], [2, 0]], 1], explain: "Server 1 is down. Key 0 loses its primary and falls back to its next best (30 → server 2). Keys 1 and 2 keep their primaries — only server 1's keys move." },
      { args: [[[40, 40, 10]], 2, []], expect: [[[0, 1]], 0], explain: "Servers 0 and 1 tie at 40: the smaller id wins, so the list is [0, 1]." },
      { args: [[[1, 2, 3, 4]], 4, []], expect: [[[3, 2, 1, 0]], 0], explain: "r = S: the whole ranking, best first." },
      { args: [[[9, 1, 5], [3, 8, 2], [7, 7, 7], [0, 4, 6]], 1, [0, 2]], expect: [[[1], [1], [1], [1]], 3], explain: "Only server 1 is left, so it serves everything; keys 0, 2 and 3 had other primaries." },
      { args: [[[60, 10, 20, 30], [15, 80, 25, 35], [45, 30, 90, 10], [20, 70, 65, 5]], 2, [1]], expect: [[[0, 3], [3, 2], [2, 0], [2, 0]], 2], explain: "Server 1 was the primary of keys 1 and 3; exactly those two move, each to its next-best server. Keys 0 and 2 are untouched." },
      { args: [[[5, 5, 5], [2, 9, 9], [8, 1, 8]], 2, [0]], expect: [[[1, 2], [1, 2], [2, 1]], 2] },
      { args: [[[12, 77, 34, 77, 3], [50, 50, 49, 10, 90], [33, 21, 21, 64, 64]], 3, [4]], expect: [[[1, 3, 2], [0, 1, 2], [3, 0, 1]], 1] },
    ],
    random: { count: 30, gen: hrwGen },
    reference: (H, r, down) => hrwRef(H, r, down),
    mutants: [
      { fn: (H, r, down) => hrwRef(H, r, down, "min"), hint: "You send keys to their LOWEST score. HRW means highest random weight: the best server is the one with the largest H[k][s]." },
      { fn: (H, r, down) => hrwRef(H, r, down, "bigtie"), hint: "On equal scores your list prefers the larger server id. Break ties toward the smaller id (scan servers in increasing order and replace the best only on a strictly larger score)." },
      { fn: (H, r, down) => hrwRef(H, r, down, "byid"), hint: "Your replica lists are sorted by server id. Keep them in score order, best first — the first entry is the primary that clients contact." },
      { fn: (H, r, down) => hrwRef(H, r, down, "setdiff"), hint: "Your 'moved' counts keys whose replica SET changed. The task counts keys whose PRIMARY (first) server changed." },
    ],
    hints: [
      "For one key, the full cluster and the reduced cluster rank the servers in the same order — removing servers only deletes entries from that ranking. What does that say about which keys can change primary?",
      "Write TopR(row, r, down): r rounds of 'pick the best server that is not down and not picked yet'. Call it twice per key: with down and with [].",
      "Inside TopR, scan s ← 0 to S − 1 and take s when best = −1 or row[s] > row[best] (strictly greater keeps the smaller id on ties).",
    ],
    starter: {
      pseudo: `ALGORITHM Rendezvous(H, r, down)
    after ← []
    moved ← 0
    for each row in H do
        ...
    return [after, moved]`,
      js: `function Rendezvous(H, r, down) {
  // after[k] = best r live servers for key k (best first); moved = keys whose primary changed
  return [[], 0];
}`,
    },
    solution: {
      pseudo: `ALGORITHM Rendezvous(H, r, down)
    after ← []
    moved ← 0
    for each row in H do
        A ← TopR(row, r, down)
        B ← TopR(row, r, [])
        append(after, A)
        if A[0] ≠ B[0] then
            moved ← moved + 1
    return [after, moved]

ALGORITHM TopR(row, r, down)
    used ← set(down)
    top ← []
    for t ← 1 to r do
        best ← -1
        for s ← 0 to length(row) - 1 do
            if not contains(used, s) and (best = -1 or row[s] > row[best]) then
                best ← s
        add(used, best)
        append(top, best)
    return top`,
      js: `function Rendezvous(H, r, down) {
  const topR = (row, dead) => {
    const used = new Set(dead), top = [];
    for (let t = 0; t < r; t++) {
      let best = -1;
      for (let s = 0; s < row.length; s++) if (!used.has(s) && (best === -1 || row[s] > row[best])) best = s;
      used.add(best); top.push(best);
    }
    return top;
  };
  let moved = 0;
  const after = H.map((row) => { const A = topR(row, down); if (A[0] !== topR(row, [])[0]) moved++; return A; });
  return [after, moved];
}`,
      python: `def rendezvous(H, r, down):
    def top_r(row, dead):
        ids = [s for s in range(len(row)) if s not in dead]
        ids.sort(key=lambda s: (-row[s], s))
        return ids[:r]
    after, moved = [], 0
    for row in H:
        A = top_r(row, set(down))
        if A[0] != top_r(row, set())[0]:
            moved += 1
        after.append(A)
    return [after, moved]`,
      explain: "Each key's ranking of servers is fixed by its scores; removing servers deletes entries without reordering the rest, so a key's primary changes only if its primary was removed — the minimal-disruption property. With selection by r scans the cost is Θ(K·S·r) (or Θ(K·S log S) by sorting); real systems use r scans or a size-r heap.",
    },
    complexity: "Θ(K · S · r) for K keys, S servers, r replicas",
    followUp: "Rendezvous hashing picks replicas in Apache Ignite and in many Content Delivery Network (CDN) caches. Its weakness is Θ(S) work per lookup; with thousands of servers, systems switch to a ring, jump consistent hashing, or a 'skeleton' tree of HRW nodes. Senior twist: weighted HRW scores each server with −w_s / ln(h(key, s)) so a server with twice the weight receives twice the keys.",
    distractors: ["if not contains(used, s) and row[s] ≥ row[best] then", "if A ≠ B then", "best ← 0"],
    visual: "sims/hashing.html",
    lesson: L17,
  });

  /* ================================================================== */
  /* 4 · Flexible Paxos: quorum intersection and availability             */
  /* ================================================================== */
  const disjoint = (a, b) => !a.some((x) => b.includes(x));
  const fpxRef = (Q1, Q2, F, mode) => {
    let pair = [];
    for (let i = 0; i < Q1.length && !pair.length; i++) for (let j = 0; j < Q2.length && !pair.length; j++) if (disjoint(Q1[i], Q2[j])) pair = [i, j];
    if (mode === "classic" && !pair.length) for (let i = 0; i < Q2.length && !pair.length; i++) for (let j = i + 1; j < Q2.length && !pair.length; j++) if (disjoint(Q2[i], Q2[j])) pair = [i, j];
    const up = (q) => (mode === "some" ? q.some((x) => !F.includes(x)) : disjoint(q, F));
    const live = mode === "either" ? Q1.some(up) || Q2.some(up) : Q1.some(up) && Q2.some(up);
    return [pair, live];
  };
  const fpxGen = (r, i) => {
    const n = 3 + (i % 4), nodes = Array.from({ length: n }, (_, x) => x);
    const quorum = (sz) => r.shuffle(nodes.slice()).slice(0, sz).sort(byNum);
    const s1 = r.int(1, n), s2 = r.int(1, n);
    const Q1 = Array.from({ length: r.int(1, 4) }, () => quorum(s1)), Q2 = Array.from({ length: r.int(1, 4) }, () => quorum(s2));
    return [Q1, Q2, quorum(r.int(0, Math.min(2, n - 1)))];
  };

  ForgeProblems.add({
    id: "flexible-paxos-quorums",
    title: "Flexible Paxos: Do the Quorums Intersect?",
    level: 5, chapter: 17, difficulty: 3,
    topics: ["distributed systems", "consensus", "quorums", "sets"],
    strategy: "Brute-force all phase-1 × phase-2 pairs; availability = some quorum avoids every failed node",
    source: "Howard, Malkhi & Spiegelman (2016), \"Flexible Paxos: Quorum Intersection Revisited\" (Conference on Principles of Distributed Systems (OPODIS) 2016; arXiv:1608.06696)",
    summary: "Check that every phase-1 quorum meets every phase-2 quorum, and whether the cluster can still elect a leader and commit after some nodes fail.",
    statement: `
<p>Paxos and Raft are usually taught with <b>majorities</b>: any two majorities share a node, so a new leader always learns what an old
leader committed. Howard, Malkhi and Spiegelman (2016) showed that this is more than needed. Paxos has two phases — phase 1 (a new
leader gathers promises) and phase 2 (the leader replicates a value) — and safety only needs <b>every phase-1 quorum to intersect every
phase-2 quorum</b>. Phase-2 quorums need not intersect each other. With 10 nodes you can replicate to just 3 if leader election waits
for 8: fast commits, slower (rarer) elections.</p>
<p>Write <code>FlexiblePaxos(Q1, Q2, F)</code>. <code>Q1</code> and <code>Q2</code> are lists of quorums (each a list of node ids) for
phase 1 and phase 2; <code>F</code> is the list of failed nodes. Return <code>[pair, live]</code>:</p>
<ul>
<li><code>pair</code> = the first <code>[i, j]</code> (smallest i, then smallest j) such that <code>Q1[i]</code> and <code>Q2[j]</code> share no node,
or <code>[]</code> if every pair intersects (the system is safe);</li>
<li><code>live</code> = <code>true</code> if, with the nodes in F down, a new leader can still be elected <b>and</b> can commit: some phase-1 quorum
<b>and</b> some phase-2 quorum consist entirely of live nodes.</li>
</ul>
<ul><li>At most 8 quorums per phase, nodes are 0..9, every quorum is non-empty.</li></ul>`,
    entry: "FlexiblePaxos",
    params: ["Q1", "Q2", "F"],
    exampleCount: 3,
    tests: [
      { args: [[[0, 1], [0, 2], [1, 2]], [[0, 1], [0, 2], [1, 2]], [2]], expect: [[], true], explain: "Classic majorities of 3 nodes: every two majorities share a node. With node 2 down, {0, 1} still works for both phases." },
      { args: [[[0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]], [[0, 1], [2, 3]], [3]], expect: [[], true], explain: "Flexible: phase-1 quorums have 3 of 4 nodes, phase-2 quorums only 2 (3 + 2 > 4, so they always meet). The two phase-2 quorums {0,1} and {2,3} are disjoint — and that is fine." },
      { args: [[[0, 1]], [[1, 2], [2, 3]], []], expect: [[0, 1], true], explain: "{0, 1} and {2, 3} share nothing: a new leader using {0, 1} could miss a value committed by {2, 3}. Unsafe." },
      { args: [[[0, 1, 2]], [[0], [1], [2]], [0]], expect: [[], false], explain: "Safe (every singleton lies inside {0,1,2}), but the only phase-1 quorum needs node 0, which is down: no leader can be elected, even though phase-2 quorums {1} and {2} are alive." },
      { args: [[[0, 1, 2], [3, 4, 5]], [[0, 3], [1, 4], [2, 5]], [1]], expect: [[], true], explain: "A grid: rows for phase 1, columns for phase 2. Every row meets every column. With node 1 down, row {3,4,5} and column {0,3} survive." },
      { args: [[[0], [1]], [[1], [0]], []], expect: [[0, 0], true], explain: "The first disjoint pair in (i, j) order is Q1[0] = {0} with Q2[0] = {1}." },
      { args: [[[0, 1, 2, 3]], [[0, 4], [1, 4], [2, 4]], [4]], expect: [[], false], explain: "Every phase-2 quorum needs node 4: with it down nothing can be committed." },
      { args: [[[2, 3, 4], [0, 1, 4]], [[0, 2], [1, 3], [4]], [0, 3]], expect: [[], false] },
    ],
    random: { count: 30, gen: fpxGen },
    reference: (Q1, Q2, F) => fpxRef(Q1, Q2, F),
    mutants: [
      { fn: (Q1, Q2, F) => fpxRef(Q1, Q2, F, "classic"), hint: "You also demand that phase-2 quorums intersect each other — classic majority thinking. Flexible Paxos needs only phase-1 × phase-2 intersections." },
      { fn: (Q1, Q2, F) => fpxRef(Q1, Q2, F, "some"), hint: "You treat a quorum as available when at least one of its nodes is alive. A quorum only works if EVERY member answers: it must avoid all failed nodes." },
      { fn: (Q1, Q2, F) => fpxRef(Q1, Q2, F, "either"), hint: "Liveness needs both phases: a live phase-1 quorum to elect a leader AND a live phase-2 quorum to commit. You accept either one." },
    ],
    hints: [
      "Why is phase-2 vs phase-2 intersection unnecessary? Only one leader at a time runs phase 2 with a given ballot; the danger is a NEW leader (phase 1) missing what an old leader committed (phase 2).",
      "Write Disjoint(a, b) (no element of a is in b). Safety: double loop i over Q1, j over Q2, return the first disjoint pair. Liveness: a quorum is up when Disjoint(q, F).",
      "live ← (some q in Q1 with Disjoint(q, F)) and (some q in Q2 with Disjoint(q, F)). Use two boolean flags set inside two loops.",
    ],
    starter: {
      pseudo: `ALGORITHM FlexiblePaxos(Q1, Q2, F)
    pair ← []
    ...
    return [pair, live]

ALGORITHM Disjoint(a, b)
    ...`,
      js: `function FlexiblePaxos(Q1, Q2, F) {
  // pair = first disjoint [i, j] or []; live = both phases have a quorum with no failed node
  return [[], true];
}`,
    },
    solution: {
      pseudo: `ALGORITHM FlexiblePaxos(Q1, Q2, F)
    pair ← []
    for i ← 0 to length(Q1) - 1 do
        for j ← 0 to length(Q2) - 1 do
            if pair = [] and Disjoint(Q1[i], Q2[j]) then
                pair ← [i, j]
    up1 ← false
    for each q in Q1 do
        if Disjoint(q, F) then up1 ← true
    up2 ← false
    for each q in Q2 do
        if Disjoint(q, F) then up2 ← true
    return [pair, up1 and up2]

ALGORITHM Disjoint(a, b)
    for each x in a do
        if x in b then
            return false
    return true`,
      js: `function FlexiblePaxos(Q1, Q2, F) {
  const disjoint = (a, b) => !a.some((x) => b.includes(x));
  let pair = [];
  for (let i = 0; i < Q1.length && !pair.length; i++)
    for (let j = 0; j < Q2.length && !pair.length; j++) if (disjoint(Q1[i], Q2[j])) pair = [i, j];
  const up = (q) => disjoint(q, F);
  return [pair, Q1.some(up) && Q2.some(up)];
}`,
      python: `def flexible_paxos(Q1, Q2, F):
    disjoint = lambda a, b: not any(x in b for x in a)
    pair = next(([i, j] for i in range(len(Q1)) for j in range(len(Q2)) if disjoint(Q1[i], Q2[j])), [])
    live = any(disjoint(q, F) for q in Q1) and any(disjoint(q, F) for q in Q2)
    return [pair, live]`,
      explain: "Safety argument: a value chosen in phase 2 is stored on some Q2 quorum; any later leader completes phase 1 with some Q1 quorum, which must contain at least one of those nodes and therefore learns the value. So checking all |Q1|·|Q2| pairs decides safety, at O(|Q1|·|Q2|·q²) for quorums of size q (O(q) with hash sets). Liveness is a scan for a fully-alive quorum in each phase.",
    },
    complexity: "O(|Q1| · |Q2| · q²) safety check; O((|Q1| + |Q2|) · q · |F|) liveness",
    followUp: "For threshold quorums the rule collapses to |Q1| + |Q2| > n; grids, weighted votes and Byzantine quorums (where every two quorums must share at least f + 1 nodes, or 2f + 1 for masking quorums) follow the same kind of check. Real systems ride on this idea: Raft-based databases that place 'voters' and 'learners' across regions are choosing their Q1/Q2 trade-off. Senior twist: explicitly listed quorums are easy to check pair by pair, but systems described implicitly (weights, nested groups) can have exponentially many quorums — one reason production code sticks to thresholds and grids.",
    distractors: ["if Disjoint(q, F) then up1 ← false", "return [pair, up1 or up2]", "if x in b then return true"],
    visual: "sims/raft-consensus.html",
    lesson: L17,
  });

  /* ================================================================== */
  /* 5 · Consistent hashing with bounded loads                           */
  /* ================================================================== */
  const chblRef = (SP, KP, eps, mode) => {
    const n = SP.length, m = KP.length;
    const order = SP.map((_, i) => i).sort((a, b) => SP[a] - SP[b]);
    const cap = mode === "nocap" ? Infinity : mode === "floor" ? Math.floor(((1 + eps) * m) / n) : Math.ceil(((1 + eps) * m) / n);
    const load = Array(n).fill(0), out = [];
    for (const h of KP) {
      let j = order.findIndex((s) => (mode === "gt" ? SP[s] > h : SP[s] >= h));
      if (j < 0) j = mode === "nowrap" ? n - 1 : 0;
      let guard = 0;
      while (load[order[j]] >= cap && guard++ < n) j = (j + 1) % n;
      if (load[order[j]] >= cap) { out.push(-1); continue; }
      load[order[j]]++;
      out.push(order[j]);
    }
    return out;
  };
  const chblGen = (r, i) => {
    const n = 2 + (i % 5), SP = r.distinct(n, 0, 99), m = r.int(1, 4 * n);
    const KP = Array.from({ length: m }, () => (r() < 0.15 ? r.pick(SP) : r.int(0, 99)));
    return [SP, KP, r.pick([0.25, 0.5, 1])];
  };

  ForgeProblems.add({
    id: "consistent-hashing-bounded-loads",
    title: "Consistent Hashing with Bounded Loads",
    level: 7, chapter: 17, difficulty: 1,
    topics: ["hashing", "load balancing", "distributed systems", "research frontier"],
    strategy: "Walk clockwise from the key's hash to the first server whose load is below ⌈(1 + ε)·m/n⌉",
    source: "Mirrokni, Thorup & Zadimoghaddam (2018), \"Consistent Hashing with Bounded Loads\" (ACM-SIAM Symposium on Discrete Algorithms (SODA) 2018; arXiv:1608.01350)",
    summary: "Place keys on a hash ring, but never let a server take more than ⌈(1 + ε)·m/n⌉ keys — overflow keeps walking clockwise.",
    statement: `
<p>Plain consistent hashing sends each key to the first server clockwise on a hash ring. It moves few keys when servers come and go,
but a popular stretch of the ring can overload one server. Mirrokni, Thorup and Zadimoghaddam added a <b>capacity</b>: with m keys and
n servers and a balance parameter ε &gt; 0, no server may hold more than <code>cap = ⌈(1 + ε)·m / n⌉</code> keys. A key whose server is full
simply keeps walking clockwise to the next server with room. The maximum load is then guaranteed by construction, and they proved that the
expected number of keys moved when servers or keys come and go grows only by a factor O(1/ε²) (for ε ≤ 1) over plain consistent
hashing — and Vimeo deployed it in the HAProxy load balancer to cut its cache bandwidth dramatically.</p>
<p>Write <code>BoundedLoads(SP, KP, eps)</code>. The ring has positions 0..99. <code>SP[s]</code> = position of server s (all distinct);
<code>KP</code> = the hash positions of the keys, <b>in arrival order</b> (m = length(KP)). For each key in turn:</p>
<ul>
<li>its first candidate is the server with the smallest position <b>≥</b> the key's position; if there is none, wrap around to the server with the smallest position;</li>
<li>while the candidate already holds <code>cap</code> keys, move to the next server clockwise (wrapping around);</li>
<li>assign the key there.</li>
</ul>
<p>Return the list of assigned server ids, one per key, in arrival order.</p>
<ul><li>2 ≤ n ≤ 10, 1 ≤ m ≤ 40, ε ∈ {0.25, 0.5, 1} (exact in binary floating point).</li></ul>`,
    entry: "BoundedLoads",
    params: ["SP", "KP", "eps"],
    exampleCount: 3,
    tests: [
      { args: [[10, 40, 70], [5, 12, 15, 20, 45, 50], 0.5], expect: [0, 1, 1, 1, 2, 2], explain: "cap = ⌈1.5 · 6 / 3⌉ = 3. Keys 12, 15, 20 all land on the server at 40, which reaches its cap of 3 exactly." },
      { args: [[10, 40, 70], [12, 15, 20, 25, 45, 50, 55], 0.25], expect: [1, 1, 1, 2, 2, 2, 0], explain: "cap = ⌈1.25 · 7 / 3⌉ = ⌈2.92⌉ = 3. Key 25 finds server 1 full and walks on to server 2 (at 70). Key 55 also wants server 2, now full, so it wraps around to server 0 (at 10)." },
      { args: [[30, 60], [95, 99, 30], 1], expect: [0, 0, 0], explain: "Keys past the last server (95, 99) wrap around to the smallest position, 30. A key exactly at 30 belongs to that server (smallest position ≥ the key). cap = ⌈2 · 3 / 2⌉ = 3." },
      { args: [[50, 20, 80], [21, 22, 23, 24, 25, 26], 0.5], expect: [0, 0, 0, 2, 2, 2], explain: "Server ids are not sorted by position: server 1 sits at 20, server 0 at 50, server 2 at 80. Keys 21..26 lie just past server 1, so they belong to server 0; its cap is 3, and the rest of this hot spot spills on to server 2." },
      { args: [[10, 20, 30, 40], [15], 0.25], expect: [1], explain: "One key: cap = ⌈1.25 / 4⌉ = 1, and the key simply goes to the server at 20." },
      { args: [[10, 20, 30, 40], [11, 11, 11, 11, 11], 0.25], expect: [1, 1, 2, 2, 3], explain: "cap = ⌈1.25 · 5 / 4⌉ = ⌈1.5625⌉ = 2: server 1 takes two keys, server 2 the next two, server 3 the fifth (rounding up matters: ⌊1.5625⌋ = 1 would leave room for only 4 keys)." },
      { args: [[5, 50], [5, 6, 50, 51, 99, 0], 0.25], expect: [0, 1, 1, 0, 0, 0] },
      { args: [[90, 15, 45, 60], [44, 45, 46, 47, 91, 92, 93, 95, 10, 14], 0.5], expect: [2, 2, 3, 3, 1, 1, 1, 1, 2, 2] },
    ],
    random: { count: 30, gen: chblGen },
    reference: (SP, KP, eps) => chblRef(SP, KP, eps),
    mutants: [
      { fn: (SP, KP, eps) => chblRef(SP, KP, eps, "nocap"), hint: "Your servers can exceed the capacity — that's plain consistent hashing. Compute cap = ⌈(1 + ε)·m/n⌉ first and keep walking clockwise past full servers." },
      { fn: (SP, KP, eps) => chblRef(SP, KP, eps, "floor"), hint: "Your capacity is rounded down. Use the ceiling ⌈(1 + ε)·m/n⌉ — with the floor the total capacity can even fall below m." },
      { fn: (SP, KP, eps) => chblRef(SP, KP, eps, "gt"), hint: "A key sitting exactly on a server's position skips that server. The first candidate is the smallest server position ≥ the key's position." },
      { fn: (SP, KP, eps) => chblRef(SP, KP, eps, "nowrap"), hint: "Keys beyond the largest server position go to the LAST server in your version. The ring wraps around: they belong to the server with the smallest position." },
    ],
    hints: [
      "Two decisions per key: where does the clockwise walk start, and when does it stop? Sorting the servers by position turns 'clockwise' into 'next index, modulo n'.",
      "Precompute order = server ids sorted by position and cap = ⌈(1 + eps)·m/n⌉, and keep load[s]. For a key, find the first j with SP[order[j]] ≥ h (if none, j ← 0), then while load[order[j]] = cap do j ← (j + 1) mod n.",
      "Because n·cap ≥ m, the while loop always finds a server with room. Sort pairs [SP[s], s] to build order.",
    ],
    starter: {
      pseudo: `ALGORITHM BoundedLoads(SP[0..n-1], KP[0..m-1], eps)
    cap ← ⌈(1 + eps) * m / n⌉
    load ← array(n, 0)
    out ← []
    ...
    return out`,
      js: `function BoundedLoads(SP, KP, eps) {
  const n = SP.length, m = KP.length, cap = Math.ceil((1 + eps) * m / n);
  // ...
  return [];
}`,
    },
    solution: {
      pseudo: `ALGORITHM BoundedLoads(SP[0..n-1], KP[0..m-1], eps)
    cap ← ⌈(1 + eps) * m / n⌉
    load ← array(n, 0)
    pairs ← []
    for s ← 0 to n - 1 do
        append(pairs, [SP[s], s])
    order ← []
    for each p in sorted(pairs) do
        append(order, p[1])
    out ← []
    for each h in KP do
        j ← 0
        while j < n and SP[order[j]] < h do
            j ← j + 1
        if j = n then
            j ← 0
        while load[order[j]] ≥ cap do
            j ← (j + 1) mod n
        load[order[j]] ← load[order[j]] + 1
        append(out, order[j])
    return out`,
      js: `function BoundedLoads(SP, KP, eps) {
  const n = SP.length, m = KP.length, cap = Math.ceil((1 + eps) * m / n);
  const order = SP.map((_, s) => s).sort((a, b) => SP[a] - SP[b]), load = Array(n).fill(0);
  return KP.map((h) => {
    let j = 0;
    while (j < n && SP[order[j]] < h) j++;
    if (j === n) j = 0;
    while (load[order[j]] >= cap) j = (j + 1) % n;
    load[order[j]]++;
    return order[j];
  });
}`,
      python: `import math

def bounded_loads(SP, KP, eps):
    n, m = len(SP), len(KP)
    cap = math.ceil((1 + eps) * m / n)
    order = sorted(range(n), key=lambda s: SP[s])
    load, out = [0] * n, []
    for h in KP:
        j = next((j for j in range(n) if SP[order[j]] >= h), 0)
        while load[order[j]] >= cap:
            j = (j + 1) % n
        load[order[j]] += 1
        out.append(order[j])
    return out`,
      explain: "Since n·cap ≥ (1 + ε)·m ≥ m, a server with room always exists, so every walk ends; no server ever exceeds cap, which is the paper's max-load guarantee by construction. The paper's analysis shows that with random hashing the number of keys moved per server or key change grows only by a factor O(1/ε²) over plain consistent hashing. Here the work is O(n) per key in the worst case — O(log n + walk length) with binary search on the sorted ring.",
    },
    complexity: "O(log n + walk length) per key with binary search on the ring",
    followUp: "HAProxy exposes this as its hash-balance-factor setting for consistent-hash load balancing (Vimeo's deployment), and the paper also handles removals by pulling a waiting key back into the freed slot recursively. Senior twist: combine it with virtual nodes (each server at several ring positions) — the capacity bound still holds, and the walks get shorter.",
    distractors: ["while j < n and SP[order[j]] ≤ h do", "cap ← ⌊(1 + eps) * m / n⌋", "j ← n - 1"],
    visual: "sims/hashing.html",
    lesson: L17,
  });

  /* ---------- shared: suffix sorting for the string problems ---------- */
  const suffixArray = (T) => Array.from({ length: T.length }, (_, i) => i).sort((a, b) => { const x = T.slice(a), y = T.slice(b); return x < y ? -1 : x > y ? 1 : 0; });
  const bwtString = (T) => { const n = T.length; return suffixArray(T).map((i) => T[(i + n - 1) % n]).join(""); };
  const dnaText = (r, len, al) => Array.from({ length: len }, () => r.pick(al.split(""))).join("") + "$";

  /* ================================================================== */
  /* 6 · The Burrows–Wheeler Transform                                   */
  /* ================================================================== */
  const bwtRef = (T, mode) => {
    const n = T.length, SA = suffixArray(T);
    const pick = (i) => (mode === "F" ? T[i] : mode === "next" ? T[(i + 1) % n] : mode === "nowrap" ? (i > 0 ? T[i - 1] : "") : T[(i + n - 1) % n]);
    const L = SA.map(pick).join(""), R = mode === "runsT" ? T : L;
    let runs = 0;
    for (let i = 0; i < R.length; i++) if (i === 0 || R[i] !== R[i - 1]) runs++;
    return [L, runs];
  };

  ForgeProblems.add({
    id: "bwt-transform",
    title: "The Burrows–Wheeler Transform",
    level: 5, chapter: 15, difficulty: 2,
    topics: ["strings", "suffix arrays", "compression", "sorting"],
    strategy: "Sort the suffixes; output the character just before each one",
    source: "Burrows & Wheeler (1994), \"A Block-sorting Lossless Data Compression Algorithm\", Digital Equipment Corporation (DEC) Systems Research Center Report 124",
    summary: "Compute the Burrows–Wheeler Transform (BWT) of a text ending in $ and count the runs of equal letters it creates.",
    statement: `
<p>The <b>Burrows–Wheeler Transform (BWT)</b> is a reversible permutation of a text that tends to put equal letters next to each other —
which is why bzip2 compresses so well, and why genome aligners (the Burrows–Wheeler Aligner (BWA), Bowtie) can search billions of DNA letters in a few gigabytes.
To build it, sort all cyclic rotations of the text and read off the <b>last column</b>. When the text ends with a unique smallest
sentinel <code>$</code>, sorting the rotations is the same as sorting the suffixes, and the last letter of the rotation that starts at
position i is the letter just <i>before</i> it: <code>T[i − 1]</code> (for i = 0 that wraps around to the final <code>$</code>).</p>
<p>Write <code>BWT(T)</code> returning <code>[L, runs]</code>: <code>L</code> = the transform as a string, and <code>runs</code> = the number
of maximal blocks of equal consecutive letters in L (for example <code>"aabccc"</code> has 3 runs). The number of runs, usually called
r, is the size measure of modern compressed indexes.</p>
<ul><li><code>T</code> is lowercase letters followed by one final <code>$</code>; 1 ≤ length(T) ≤ 60. Strings can be sliced (<code>T[i..n-1]</code>) and compared with &lt;.</li></ul>`,
    entry: "BWT",
    params: ["T"],
    exampleCount: 3,
    tests: [
      { args: ["banana$"], expect: ["annb$aa", 5], explain: "Sorted suffixes: $, a$, ana$, anana$, banana$, na$, nana$. The letters before them: a, n, n, b, $, a, a. Runs: a | nn | b | $ | aa = 5." },
      { args: ["$"], expect: ["$", 1], explain: "The only rotation is $ itself." },
      { args: ["abab$"], expect: ["bb$aa", 3], explain: "Suffixes in order: $, ab$, abab$, b$, bab$. The suffix starting at 0 wraps around to the final $." },
      { args: ["aaaa$"], expect: ["aaaa$", 2], explain: "A repetitive text gives very few runs — that is what makes the BWT compress well." },
      { args: ["mississippi$"], expect: ["ipssm$pissii", 9], explain: "The classic example: T has 11 runs of its own letters, L only 9 — the gap grows on longer repetitive texts." },
      { args: ["abcde$"], expect: ["e$abcd", 6], explain: "No repetition, no grouping: every letter is its own run." },
      { args: ["cabbage$"], expect: ["ecbba$ga", 7] },
      { args: ["abracadabra$"], expect: ["ard$rcaaaabb", 8] },
    ],
    random: { count: 25, gen: (r, i) => [dnaText(r, i * 2, i % 2 ? "ab" : "abcd")] },
    reference: (T) => bwtRef(T),
    mutants: [
      { fn: (T) => bwtRef(T, "F"), hint: "Your L is just the letters of T in sorted order — that is the FIRST column of the sorted rotations. The BWT is the LAST column: the letter just before each sorted suffix." },
      { fn: (T) => bwtRef(T, "next"), hint: "You take the letter AFTER each sorted suffix's start. The last column of a rotation starting at i is the letter before it, T[i − 1]." },
      { fn: (T) => bwtRef(T, "nowrap"), hint: "Your L is one letter short: the $ is missing. For the suffix that starts at 0, 'the letter before' wraps around to T[n − 1]." },
      { fn: (T) => bwtRef(T, "runsT"), hint: "L looks right, but you count the runs of the original text. Count the runs of L — the point is how much the transform groups letters." },
    ],
    hints: [
      "Why can you sort suffixes instead of rotations? Because $ is unique and smallest, two rotations are already decided by the time either reaches its $.",
      "Build pairs [T[i..n-1], i], sort them, and for each pair append T[(i − 1 + n) mod n] to L.",
      "Count runs in one pass: runs ← runs + 1 whenever k = 0 or L[k] ≠ L[k − 1].",
    ],
    starter: {
      pseudo: `ALGORITHM BWT(T[0..n-1])
    // T ends with $; return [L, runs]
    rows ← []
    for i ← 0 to n - 1 do
        append(rows, [T[i..n-1], i])
    ...
    return [L, runs]`,
      js: `function BWT(T) {
  // return [L, runs]
  return ["", 0];
}`,
    },
    solution: {
      pseudo: `ALGORITHM BWT(T[0..n-1])
    rows ← []
    for i ← 0 to n - 1 do
        append(rows, [T[i..n-1], i])
    L ← ""
    for each row in sorted(rows) do
        L ← L + T[(row[1] - 1 + n) mod n]
    runs ← 0
    for k ← 0 to n - 1 do
        if k = 0 or L[k] ≠ L[k - 1] then
            runs ← runs + 1
    return [L, runs]`,
      js: `function BWT(T) {
  const n = T.length;
  const SA = [...Array(n).keys()].sort((a, b) => (T.slice(a) < T.slice(b) ? -1 : 1));
  const L = SA.map((i) => T[(i - 1 + n) % n]).join("");
  let runs = 0;
  for (let k = 0; k < n; k++) if (k === 0 || L[k] !== L[k - 1]) runs++;
  return [L, runs];
}`,
      python: `def bwt(T):
    n = len(T)
    SA = sorted(range(n), key=lambda i: T[i:])
    L = "".join(T[(i - 1) % n] for i in SA)
    runs = sum(1 for k in range(n) if k == 0 or L[k] != L[k - 1])
    return [L, runs]`,
      explain: "Row i of the sorted rotation matrix starts with suffix SA[i]; its last character is the one cyclically before it, so L[i] = T[SA[i] − 1]. Sorting n suffixes by comparison costs O(n log n) comparisons of up to n characters, O(n² log n) in the worst case here; real implementations build the suffix array in O(n) (SA-IS) and read L off it.",
    },
    complexity: "O(n² log n) with naive suffix sorting; Θ(n) given a suffix array",
    followUp: "bzip2 follows the BWT with move-to-front and Huffman coding. Senior twist: the r-index (Gagie, Navarro & Prezza) answers pattern queries in space proportional to the number of runs r instead of n — on highly repetitive collections (thousands of genomes, versioned documents) r is tiny compared to n.",
    distractors: ["L ← L + T[row[1]]", "L ← L + T[(row[1] + 1) mod n]", "if L[k] = L[k - 1] then"],
    visual: "sims/suffix-structures.html",
    lesson: L15,
  });

  /* ================================================================== */
  /* 7 · Inverting the BWT with the LF-mapping                           */
  /* ================================================================== */
  const ibwtRef = (L, mode) => {
    const n = L.length, cnt = new Map(), rank = [];
    for (const c of L) { const k = cnt.get(c) || 0; rank.push(mode === "rank1" ? k + 1 : k); cnt.set(c, k + 1); }
    const C = new Map();
    let tot = 0;
    for (const c of [...cnt.keys()].sort()) { if (mode === "Cle") { tot += cnt.get(c); C.set(c, tot); } else { C.set(c, tot); tot += cnt.get(c); } }
    const out = [];
    let i = 0;
    for (let k = 0; k < n - 1; k++) { out.push(L[i]); i = (C.get(L[i]) + rank[i]) % n; }
    return (mode === "noreverse" ? out.join("") : out.reverse().join("")) + "$";
  };

  ForgeProblems.add({
    id: "bwt-inverse-lf",
    title: "Undo the BWT with the LF-Mapping",
    level: 6, chapter: 15, difficulty: 2,
    topics: ["strings", "compression", "counting", "linear time"],
    strategy: "LF(i) = C[L[i]] + (occurrences of L[i] before position i); walk it backwards from the $ row",
    source: "Burrows & Wheeler (1994), \"A Block-sorting Lossless Data Compression Algorithm\", Digital Equipment Corporation Systems Research Center Report 124 · Ferragina & Manzini (2000), \"Opportunistic Data Structures with Applications\" (IEEE Symposium on Foundations of Computer Science (FOCS) 2000)",
    summary: "Recover the original text from its Burrows–Wheeler Transform in linear time using the Last-to-First (LF) mapping.",
    statement: `
<p>A compressor is useless if you can't decompress. The surprise of the <b>Burrows–Wheeler Transform (BWT)</b> is that the last column
L of the sorted rotations alone determines the text — and it can be undone in linear time with the <b>Last-to-First (LF) mapping</b>.
The same mapping drives the search of the FM-index (Full-text index in Minute space) used by DNA read aligners.</p>
<p>Facts you can use (F is the first column = the letters of L in sorted order):</p>
<ul>
<li>The k-th occurrence of a letter c in L and the k-th occurrence of c in F are the <i>same</i> letter of the text.</li>
<li>So if <code>C[c]</code> = the number of letters in L smaller than c, and <code>rank(i)</code> = the number of times <code>L[i]</code>
occurs in <code>L[0..i−1]</code>, then <code>LF(i) = C[L[i]] + rank(i)</code> is the row whose rotation starts with the letter L[i].</li>
<li>Row 0 is the rotation that starts with <code>$</code>, so <code>L[0]</code> is the letter just before the final $ — the last real letter of the text.
From row i, <code>L[i]</code> is the letter preceding row i's rotation, and <code>LF(i)</code> is the row of the rotation one step further left.</li>
</ul>
<p>Write <code>InverseBWT(L)</code> returning the original text T (which ends with <code>$</code>).</p>
<ul>
<li>L contains exactly one <code>$</code> (smaller than every letter) and lowercase letters; 1 ≤ length(L) ≤ 600.</li>
<li><b>Efficiency:</b> the grader checks that your work grows linearly with n (alphabet size is a constant). Counting
<code>L[0..i−1]</code> afresh at every step is quadratic — precompute <code>rank</code> in one pass.</li>
</ul>`,
    entry: "InverseBWT",
    params: ["L"],
    exampleCount: 3,
    tests: [
      { args: ["annb$aa"], expect: "banana$", explain: "C = {$:0, a:1, b:4, n:5}. Row 0: L[0] = a (the last letter); LF(0) = 1 + 0 = 1. L[1] = n, LF = 5 + 0 = 5; L[5] = a, LF = 1 + 1 = 2; L[2] = n, LF = 6; L[6] = a, LF = 3; L[3] = b. Read backwards: b a n a n a, then $." },
      { args: ["$"], expect: "$", explain: "The text is just the sentinel." },
      { args: ["bb$aa"], expect: "abab$", explain: "Ranks keep the two b's (and the two a's) apart: the first b in L is the first b in F." },
      { args: ["aaaa$"], expect: "aaaa$", explain: "Every step moves one row down the block of a's." },
      { args: ["ipssm$pissii"], expect: "mississippi$", explain: "The classic example, recovered letter by letter from right to left." },
      { args: ["e$abcd"], expect: "abcde$" },
      { args: ["a$"], expect: "a$", explain: "Smallest non-trivial case: one letter." },
      { args: ["ard$rcaaaabb"], expect: "abracadabra$" },
    ],
    random: { count: 25, gen: (r, i) => [bwtString(dnaText(r, i * 3, i % 3 ? "acgt" : "ab"))] },
    reference: (L) => ibwtRef(L),
    growth: { metric: "steps", sizes: [32, 64, 128, 256, 512], gen: (r, n) => [bwtString(dnaText(r, n - 1, "acgt"))], expect: "n" },
    mutants: [
      { fn: (L) => ibwtRef(L, "noreverse"), hint: "Your text comes out backwards. Walking LF moves to the LEFT in the text, so you collect the letters from last to first — reverse them (or fill an array from the end)." },
      { fn: (L) => ibwtRef(L, "rank1"), hint: "Your rank counts the current position too, so every jump lands one row too far. rank(i) counts occurrences of L[i] strictly before i (the first a has rank 0)." },
      { fn: (L) => ibwtRef(L, "Cle"), hint: "C[c] should count the letters SMALLER than c (where c's block starts in F), not the letters ≤ c (where it ends)." },
    ],
    hints: [
      "Why is the k-th 'a' in L the k-th 'a' in F? Rows that end in 'a' are ordered by what comes after that 'a' — exactly the order of the rotations that start with that 'a'.",
      "One pass over L: count[c] so far gives rank[i] (store count[L[i]] before incrementing). Then C from the sorted letters with a running total. Then n − 1 LF steps from row 0.",
      "Walk: i ← 0; repeat n − 1 times: out[k] ← L[i] for k from n − 2 down to 0, i ← C[L[i]] + rank[i]. Finally put $ at the end.",
    ],
    starter: {
      pseudo: `ALGORITHM InverseBWT(L[0..n-1])
    count ← map()
    rank ← array(n, 0)
    ...
    return T`,
      js: `function InverseBWT(L) {
  // rank[i], C[c], then walk LF from row 0
  return "";
}`,
    },
    solution: {
      pseudo: `ALGORITHM InverseBWT(L[0..n-1])
    count ← map()
    rank ← array(n, 0)
    for i ← 0 to n - 1 do
        rank[i] ← get(count, L[i], 0)
        count[L[i]] ← rank[i] + 1
    C ← map()
    total ← 0
    for each c in sorted(keys(count)) do
        C[c] ← total
        total ← total + count[c]
    out ← array(n, "$")
    i ← 0
    for k ← n - 2 downto 0 do
        out[k] ← L[i]
        i ← C[L[i]] + rank[i]
    T ← ""
    for each c in out do
        T ← T + c
    return T`,
      js: `function InverseBWT(L) {
  const n = L.length, count = new Map(), rank = [];
  for (const c of L) { const k = count.get(c) || 0; rank.push(k); count.set(c, k + 1); }
  const C = new Map();
  let total = 0;
  for (const c of [...count.keys()].sort()) { C.set(c, total); total += count.get(c); }
  const out = Array(n).fill("$");
  let i = 0;
  for (let k = n - 2; k >= 0; k--) { out[k] = L[i]; i = C.get(L[i]) + rank[i]; }
  return out.join("");
}`,
      python: `def inverse_bwt(L):
    n = len(L)
    count, rank = {}, []
    for c in L:
        rank.append(count.get(c, 0))
        count[c] = rank[-1] + 1
    C, total = {}, 0
    for c in sorted(count):
        C[c] = total
        total += count[c]
    out, i = ["$"] * n, 0
    for k in range(n - 2, -1, -1):
        out[k] = L[i]
        i = C[L[i]] + rank[i]
    return "".join(out)`,
      explain: "Equal letters keep their relative order between L and F (both are ordered by the text that follows the letter), so LF is a bijection mapping each row to the row of the rotation one step left; starting at the $ row and applying it n − 1 times visits the text from right to left. Building rank and C is one pass plus a sort of the σ distinct letters, and the walk is n − 1 constant-time steps: Θ(n + σ log σ).",
    },
    complexity: "Θ(n) time for a constant-size alphabet; Θ(n) extra space",
    followUp: "bzip2's decoder runs exactly this walk per block. Senior twist: storing rank for every position costs n words; FM-indexes keep only sampled counts plus a small bit-vector per letter (wavelet trees, succinct rank/select) so the same LF steps work in compressed space.",
    distractors: ["rank[i] ← get(count, L[i], 0) + 1", "for k ← 0 to n - 2 do", "C[c] ← total + count[c]"],
    visual: "sims/suffix-structures.html",
    lesson: L15,
  });

  /* ================================================================== */
  /* 8 · Kasai's linear-time LCP array                                   */
  /* ================================================================== */
  const kasaiRef = (T, SA, mode) => {
    const n = T.length, rank = Array(n), lcp = Array(n).fill(0);
    SA.forEach((s, i) => (rank[s] = i));
    let h = 0;
    for (let i = 0; i < n; i++) {
      if (rank[i] > 0) {
        const j = SA[rank[i] - 1];
        while (i + h < n && j + h < n && T[i + h] === T[j + h]) h++;
        lcp[rank[i]] = h;
        if (h > 0 && mode !== "nodec") h--;
      } else h = 0;
    }
    if (mode === "next") return lcp.slice(1).concat(n ? [0] : []);
    if (mode === "drop0") return lcp.slice(1);
    return lcp;
  };
  const textGen = (r, n, al) => Array.from({ length: n }, () => r.pick(al.split(""))).join("");

  ForgeProblems.add({
    id: "kasai-lcp",
    title: "Kasai's Linear-Time LCP Array",
    level: 6, chapter: 15, difficulty: 2,
    topics: ["strings", "suffix arrays", "amortized analysis", "linear time"],
    strategy: "Visit suffixes in TEXT order; the common prefix shrinks by at most one per step",
    source: "Kasai, Lee, Arimura, Arikawa & Park (2001), \"Linear-Time Longest-Common-Prefix Computation in Suffix Arrays and Its Applications\" (Combinatorial Pattern Matching (CPM) 2001)",
    summary: "Given a text and its suffix array, compute the LCP array (common prefix of each pair of neighbouring suffixes) in linear time.",
    statement: `
<p>A suffix array alone tells you the sorted order of all suffixes; the <b>Longest Common Prefix (LCP) array</b> tells you how much each
suffix shares with its neighbour in that order. Together they replace a suffix tree: longest repeated substrings, the number of distinct
substrings, and fast pattern search all fall out of the LCP array. Comparing every neighbouring pair from scratch costs Θ(n²) on texts
like <code>aaaa…</code>; Kasai et al. (2001) do it in Θ(n).</p>
<p>The trick: process the suffixes in <b>text order</b> i = 0, 1, …, n − 1, not in sorted order. If suffix i shares h letters with the suffix
just before it in sorted order, then suffix i + 1 shares at least h − 1 letters with <i>its</i> predecessor — so you never restart
the comparison from 0, you keep h and decrement it by one.</p>
<p>Write <code>Kasai(T, SA)</code>. <code>SA</code> is the suffix array of T (SA[k] = start of the k-th smallest suffix). Return
<code>lcp[0..n−1]</code> where <code>lcp[0] = 0</code> and <code>lcp[k]</code> = the length of the longest common prefix of the suffixes
starting at <code>SA[k − 1]</code> and <code>SA[k]</code>.</p>
<ul><li>0 ≤ n ≤ 512, lowercase letters. <b>Efficiency:</b> the grader checks Θ(n) growth on highly repetitive texts.</li></ul>`,
    entry: "Kasai",
    params: ["T", "SA"],
    exampleCount: 3,
    tests: [
      { args: ["banana", [5, 3, 1, 0, 4, 2]], expect: [0, 1, 3, 0, 0, 2], explain: "Sorted suffixes: a, ana, anana, banana, na, nana. Neighbours share: a/ana → 1, ana/anana → 3, anana/banana → 0, banana/na → 0, na/nana → 2." },
      { args: ["aaaa", [3, 2, 1, 0]], expect: [0, 1, 2, 3], explain: "The worst case for the naive method: comparisons would total 1 + 2 + 3 + … Kasai starts at suffix 0 (h = 3) and only decrements from there." },
      { args: ["a", [0]], expect: [0], explain: "One suffix: lcp[0] = 0 by definition." },
      { args: ["", []], expect: [], explain: "Empty text, empty array." },
      { args: ["abab", [2, 0, 3, 1]], expect: [0, 2, 0, 1], explain: "ab / abab share 2, abab / b share 0, b / bab share 1." },
      { args: ["mississippi", [10, 7, 4, 1, 0, 9, 8, 6, 3, 5, 2]], expect: [0, 1, 1, 4, 0, 0, 1, 0, 2, 1, 3], explain: "issi is the longest repeat: ississippi and issippi share 4 letters." },
      { args: ["abcd", [0, 1, 2, 3]], expect: [0, 0, 0, 0], explain: "All suffixes start with different letters." },
      { args: ["cabbage", [1, 4, 3, 2, 0, 6, 5]], expect: [0, 1, 0, 1, 0, 0, 0] },
      { args: ["aabaab", [3, 0, 4, 1, 5, 2]], expect: [0, 3, 1, 2, 0, 1] },
    ],
    random: { count: 25, gen: (r, i) => { const T = textGen(r, i * 2, i % 2 ? "ab" : "abc"); return [T, suffixArray(T)]; } },
    reference: (T, SA) => kasaiRef(T, SA),
    growth: { metric: "steps", sizes: [32, 64, 128, 256, 512], gen: (r, n) => { const T = r() < 0.5 ? "a".repeat(n) : "ab".repeat(n / 2); return [T, suffixArray(T)]; }, expect: "n" },
    mutants: [
      { fn: (T, SA) => kasaiRef(T, SA, "nodec"), hint: "Some of your values are too large: you carry h to the next suffix unchanged. The guarantee is only h − 1 — decrement h (when it is positive) after storing it." },
      { fn: (T, SA) => kasaiRef(T, SA, "next"), hint: "Your values are shifted one place: you store the common prefix of SA[k] with the NEXT suffix. lcp[k] compares SA[k] with the PREVIOUS suffix SA[k − 1], and lcp[0] = 0." },
      { fn: (T, SA) => kasaiRef(T, SA, "drop0"), hint: "Your array is one entry short. Keep lcp[0] = 0 at the front so lcp[k] lines up with SA[k]." },
    ],
    hints: [
      "Let suffix i have predecessor j in sorted order with common prefix h ≥ 1. Then suffix i + 1 and suffix j + 1 share h − 1 letters, and j + 1 sorts before i + 1. What does that say about the common prefix of i + 1 with ITS predecessor?",
      "Build rank (the inverse of SA: rank[SA[k]] = k). Loop i from 0 to n − 1 in text order, keep h between iterations, and compare suffix i with j = SA[rank[i] − 1] starting at offset h.",
      "After storing lcp[rank[i]] ← h, do 'if h > 0 then h ← h − 1'. When rank[i] = 0 there is no predecessor: set h ← 0 and move on.",
    ],
    starter: {
      pseudo: `ALGORITHM Kasai(T[0..n-1], SA)
    rank ← array(n, 0)
    lcp ← array(n, 0)
    for k ← 0 to n - 1 do
        rank[SA[k]] ← k
    h ← 0
    for i ← 0 to n - 1 do
        ...
    return lcp`,
      js: `function Kasai(T, SA) {
  const n = T.length, rank = Array(n), lcp = Array(n).fill(0);
  // ...
  return lcp;
}`,
    },
    solution: {
      pseudo: `ALGORITHM Kasai(T[0..n-1], SA)
    rank ← array(n, 0)
    lcp ← array(n, 0)
    for k ← 0 to n - 1 do
        rank[SA[k]] ← k
    h ← 0
    for i ← 0 to n - 1 do
        if rank[i] > 0 then
            j ← SA[rank[i] - 1]
            while i + h < n and j + h < n and T[i + h] = T[j + h] do
                h ← h + 1
            lcp[rank[i]] ← h
            if h > 0 then
                h ← h - 1
        else
            h ← 0
    return lcp`,
      js: `function Kasai(T, SA) {
  const n = T.length, rank = Array(n), lcp = Array(n).fill(0);
  SA.forEach((s, k) => (rank[s] = k));
  let h = 0;
  for (let i = 0; i < n; i++) {
    if (rank[i] > 0) {
      const j = SA[rank[i] - 1];
      while (i + h < n && j + h < n && T[i + h] === T[j + h]) h++;
      lcp[rank[i]] = h;
      if (h > 0) h--;
    } else h = 0;
  }
  return lcp;
}`,
      python: `def kasai(T, SA):
    n = len(T)
    rank, lcp = [0] * n, [0] * n
    for k, s in enumerate(SA):
        rank[s] = k
    h = 0
    for i in range(n):
        if rank[i] > 0:
            j = SA[rank[i] - 1]
            while i + h < n and j + h < n and T[i + h] == T[j + h]:
                h += 1
            lcp[rank[i]] = h
            if h > 0:
                h -= 1
        else:
            h = 0
    return lcp`,
      explain: "Correctness: if suffix i shares h ≥ 1 letters with its predecessor j, then j + 1 < i + 1 in sorted order and shares h − 1 letters with it, so by the sorted order i + 1's predecessor shares at least h − 1 letters as well — starting the comparison at h − 1 skips nothing. Cost: h never exceeds n and drops by at most 1 per iteration (n in total), so the inner loop increments h at most 2n times: Θ(n) overall — an aggregate argument.",
    },
    complexity: "Θ(n) time, Θ(n) extra space (rank array)",
    followUp: "With the LCP array, the longest repeated substring is max(lcp) and the number of distinct substrings is n(n + 1)/2 − Σ lcp. Senior twist: suffix-array libraries such as libsais compute the LCP array alongside the suffix array; Kärkkäinen, Manzini & Puglisi's Φ-algorithm (CPM 2009) is a more cache-friendly variant of the same idea.",
    distractors: ["j ← SA[rank[i] + 1]", "lcp[rank[i] - 1] ← h", "lcp[i] ← h"],
    visual: "sims/suffix-structures.html",
    lesson: L15,
  });

  /* ================================================================== */
  /* 9 · FM-index backward search                                       */
  /* ================================================================== */
  const fmRef = (L, P, mode) => {
    const n = L.length, cnt = new Map();
    for (const c of L) cnt.set(c, (cnt.get(c) || 0) + 1);
    const C = new Map();
    let tot = 0;
    for (const c of [...cnt.keys()].sort()) { C.set(c, mode === "Cle" ? tot + cnt.get(c) : tot); tot += cnt.get(c); }
    const occ = (c, i) => { let k = 0; const end = mode === "incl" ? Math.min(n, i + 1) : i; for (let t = 0; t < end; t++) if (L[t] === c) k++; return k; };
    return P.map((pat) => {
      let sp = 0, ep = n;
      const seq = mode === "forward" ? pat.split("") : pat.split("").reverse();
      for (const c of seq) {
        if (!C.has(c)) return 0;
        sp = C.get(c) + occ(c, sp);
        ep = C.get(c) + occ(c, ep);
        if (sp >= ep) return 0;
      }
      return ep - sp;
    });
  };
  const fmGen = (r, len, nPat, al) => {
    const T = dnaText(r, len, al), P = [];
    for (let k = 0; k < nPat; k++) {
      const m = r.int(1, 4);
      if (r() < 0.7 && len >= m) { const s = r.int(0, len - m); P.push(T.slice(s, s + m)); } else P.push(textGen(r, m, al));
    }
    return [bwtString(T), P];
  };

  ForgeProblems.add({
    id: "fm-index-count",
    title: "FM-Index: Count Matches by Backward Search",
    level: 7, chapter: 18, difficulty: 2,
    topics: ["strings", "succinct data structures", "bioinformatics", "suffix arrays"],
    strategy: "Keep the range of sorted rows that start with a suffix of the pattern; extend it one letter to the LEFT with C and Occ",
    source: "Ferragina & Manzini (2000), \"Opportunistic Data Structures with Applications\" (IEEE Symposium on Foundations of Computer Science (FOCS) 2000, pp. 390–398)",
    summary: "Given only the BWT of a text, build C and Occ and count each pattern's occurrences with |P| steps of backward search.",
    statement: `
<p>A human genome has about 3 billion letters, and a sequencing run produces hundreds of millions of short reads that must each be
located in it. The <b>FM-index</b> (Full-text index in Minute space; Ferragina &amp; Manzini, 2000) makes that possible: it stores just the
<b>Burrows–Wheeler Transform (BWT)</b> <code>L</code> of the text plus small count tables, and counts the occurrences of a pattern P in
|P| steps — <i>independent of the text length</i>. The Burrows–Wheeler Aligner (BWA) and Bowtie, the classic read aligners, are built on it.</p>
<p>In the sorted-rotation matrix, the rows that start with a given string form one contiguous range <code>[sp, ep)</code>. Process P from
its <b>last letter to its first</b>, keeping the range of rows that start with the part of P seen so far:</p>
<pre>sp ← 0;  ep ← n                     // every row starts with the empty string
for each letter c of P, right to left:
    sp ← C[c] + Occ(c, sp)
    ep ← C[c] + Occ(c, ep)
    if sp ≥ ep: the count is 0
count ← ep − sp</pre>
<ul>
<li><code>C[c]</code> = the number of letters of L smaller than c (the row where c's block begins);</li>
<li><code>Occ(c, i)</code> = the number of times c occurs in <code>L[0..i−1]</code> (so <code>Occ(c, 0) = 0</code>).</li>
</ul>
<p>Write <code>FMCount(L, P)</code>: build C and an Occ table, then return the list of occurrence counts, one per pattern in <code>P</code>.
A pattern containing a letter that never occurs in L has count 0.</p>
<ul>
<li>L is the BWT of a text ending in <code>$</code> (smallest symbol); patterns are non-empty and contain no <code>$</code>. n ≤ 1024.</li>
<li><b>Efficiency:</b> the grader runs n/8 patterns on texts of growing length n and expects Θ(n) total work — Θ(σ·n) to build Occ
(σ = alphabet size, a constant) and O(|P|) per pattern. Recomputing Occ by scanning L inside every step is too slow.</li>
</ul>`,
    entry: "FMCount",
    params: ["L", "P"],
    exampleCount: 3,
    tests: [
      { args: ["annb$aa", ["ana", "a", "ban", "nab"]], expect: [2, 3, 1, 0], explain: "L is the BWT of banana$. For \"ana\": start [0, 7); 'a' → [1, 4) (the rows a$, ana$, anana$); 'n' → [5, 7) (na$, nana$); 'a' → [2, 4) (ana$, anana$): 2 matches. \"nab\" never occurs." },
      { args: ["ipssm$pissii", ["ssi", "i", "issi", "ppi"]], expect: [2, 4, 2, 1], explain: "mississippi$: ssi occurs twice, and the two occurrences of issi overlap — the index counts both." },
      { args: ["$", ["a"]], expect: [0], explain: "An empty text (just the sentinel) contains nothing." },
      { args: ["aaaa$", ["a", "aa", "aaa", "aaaa", "aaaaa"]], expect: [4, 3, 2, 1, 0], explain: "Overlapping matches are all counted: aaaa contains aa three times." },
      { args: ["annb$aa", ["x", "banana", "na", "bananas"]], expect: [0, 1, 2, 0], explain: "Letters that never occur end the search immediately; the whole text matches once." },
      { args: ["ipssm$pissii", ["mississippi", "sis", "s", "pi", "sm"]], expect: [1, 1, 4, 1, 0], explain: "sis occurs once (mis|sis|sippi); \"sm\" uses only letters of the text but never occurs." },
      { args: ["ard$rcaaaabb", ["abra", "a", "bra", "cad", "rab"]], expect: [2, 5, 2, 1, 0] },
    ],
    random: { count: 25, gen: (r, i) => fmGen(r, 3 + i * 2, 4, i % 2 ? "acgt" : "ab") },
    reference: (L, P) => fmRef(L, P),
    growth: { metric: "steps", sizes: [64, 128, 256, 512, 1024], gen: (r, n) => fmGen(r, n - 1, n / 8, "acgt"), expect: "n" },
    mutants: [
      { fn: (L, P) => fmRef(L, P, "forward"), hint: "You read the pattern from left to right, so you are really counting the REVERSED pattern. Backward search extends the match to the left: start with P's last letter." },
      { fn: (L, P) => fmRef(L, P, "incl"), hint: "Your Occ(c, i) includes position i itself. Occ counts c in L[0..i − 1] only — Occ(c, 0) must be 0 (the table has n + 1 columns)." },
      { fn: (L, P) => fmRef(L, P, "Cle"), hint: "C[c] should be the number of letters strictly smaller than c — the first row of c's block in F. You are counting letters ≤ c." },
    ],
    hints: [
      "If rows [sp, ep) start with some string X, which rows start with cX? They are the LF-images of the rows in [sp, ep) whose L-letter is c — and LF preserves order, so they form a range too.",
      "Precompute: count each letter, C by a running total over sorted letters, and Occ[c] = an array of n + 1 prefix counts for every letter c (Occ[c][i + 1] = Occ[c][i] + 1 if L[i] = c).",
      "Then per pattern: sp ← 0, ep ← n, loop k from m − 1 downto 0 with c ← pat[k]; if c is not a key of C the answer is 0; otherwise update both ends and stop with 0 as soon as sp ≥ ep.",
    ],
    starter: {
      pseudo: `ALGORITHM FMCount(L[0..n-1], P)
    count ← map()
    ...
    out ← []
    for each pat in P do
        sp ← 0
        ep ← n
        ...
    return out`,
      js: `function FMCount(L, P) {
  // build C and Occ, then backward search for every pattern
  return P.map(() => 0);
}`,
    },
    solution: {
      pseudo: `ALGORITHM FMCount(L[0..n-1], P)
    count ← map()
    for each c in L do
        count[c] ← get(count, c, 0) + 1
    C ← map()
    Occ ← map()
    total ← 0
    for each c in sorted(keys(count)) do
        C[c] ← total
        total ← total + count[c]
        Occ[c] ← array(n + 1, 0)
        for i ← 0 to n - 1 do
            Occ[c][i + 1] ← Occ[c][i]
            if L[i] = c then Occ[c][i + 1] ← Occ[c][i + 1] + 1
    out ← []
    for each pat in P do
        sp ← 0
        ep ← n
        for k ← length(pat) - 1 downto 0 do
            c ← pat[k]
            if not contains(C, c) or sp ≥ ep then
                sp ← ep
            else
                sp ← C[c] + Occ[c][sp]
                ep ← C[c] + Occ[c][ep]
        append(out, max(0, ep - sp))
    return out`,
      js: `function FMCount(L, P) {
  const n = L.length, count = new Map();
  for (const c of L) count.set(c, (count.get(c) || 0) + 1);
  const C = new Map(), Occ = new Map();
  let total = 0;
  for (const c of [...count.keys()].sort()) {
    C.set(c, total); total += count.get(c);
    const row = Array(n + 1).fill(0);
    for (let i = 0; i < n; i++) row[i + 1] = row[i] + (L[i] === c ? 1 : 0);
    Occ.set(c, row);
  }
  return P.map((pat) => {
    let sp = 0, ep = n;
    for (let k = pat.length - 1; k >= 0 && sp < ep; k--) {
      const c = pat[k];
      if (!C.has(c)) return 0;
      sp = C.get(c) + Occ.get(c)[sp];
      ep = C.get(c) + Occ.get(c)[ep];
    }
    return Math.max(0, ep - sp);
  });
}`,
      python: `def fm_count(L, P):
    n = len(L)
    count = {}
    for c in L:
        count[c] = count.get(c, 0) + 1
    C, Occ, total = {}, {}, 0
    for c in sorted(count):
        C[c] = total
        total += count[c]
        row = [0] * (n + 1)
        for i in range(n):
            row[i + 1] = row[i] + (L[i] == c)
        Occ[c] = row
    out = []
    for pat in P:
        sp, ep = 0, n
        for c in reversed(pat):
            if c not in C or sp >= ep:
                sp = ep
                break
            sp, ep = C[c] + Occ[c][sp], C[c] + Occ[c][ep]
        out.append(max(0, ep - sp))
    return out`,
      explain: "Invariant: after processing the suffix P[k..m−1], [sp, ep) is exactly the set of sorted rows whose rotation starts with P[k..m−1]. Prepending c keeps the rows of that range whose L-letter is c and maps them with LF (= C[c] + Occ(c, ·)), which preserves their order, so the new set is the range [C[c] + Occ(c, sp), C[c] + Occ(c, ep)). The tables cost Θ(σ·n) once; each pattern then costs Θ(|P|) table lookups, independent of n.",
    },
    complexity: "Θ(σ·n) preprocessing; Θ(|P|) per count query",
    followUp: "To LOCATE matches (not just count), FM-indexes keep a sampled suffix array and walk LF until they hit a sample; to shrink Occ they store it in a wavelet tree or sampled blocks of succinct rank. Senior twist: read aligners like BWA run backward search with mismatches by branching on the letter at each step — a bounded search tree over this same recurrence.",
    distractors: ["for k ← 0 to length(pat) - 1 do", "sp ← C[c] + Occ[c][sp + 1]", "append(out, ep - sp + 1)"],
    visual: "sims/suffix-structures.html",
    lesson: L18,
  });

  /* ================================================================== */
  /* 10 · Count Sketch with signed hashes                                 */
  /* ================================================================== */
  const csRef = (H, Sg, w, U, Q, mode) => {
    const d = H.length, C = Array.from({ length: d }, () => Array(w).fill(0));
    for (const [x, c] of U) for (let r = 0; r < d; r++) C[r][H[r][x]] += Sg[r][x] * c;
    return Q.map((q) => {
      const est = [];
      for (let r = 0; r < d; r++) est.push((mode === "nosign" ? 1 : Sg[r][q]) * C[r][H[r][q]]);
      est.sort(byNum);
      if (mode === "mean") return est.reduce((a, b) => a + b, 0) / d;
      if (mode === "min") return est[0];
      return est[(d - 1) / 2];
    });
  };
  const csGen = (r, i) => {
    const d = [1, 3, 5][i % 3], w = r.int(2, 6), u = r.int(2, 10);
    const H = Array.from({ length: d }, () => Array.from({ length: u }, () => r.int(0, w - 1)));
    const Sg = Array.from({ length: d }, () => Array.from({ length: u }, () => (r() < 0.5 ? -1 : 1)));
    const heavy = r.int(0, u - 1);
    const U = Array.from({ length: r.int(0, 12) }, () => [r() < 0.4 ? heavy : r.int(0, u - 1), r.int(-3, 9)]);
    const Q = Array.from({ length: r.int(1, 5) }, () => r.int(0, u - 1));
    return [H, Sg, w, U, Q];
  };

  ForgeProblems.add({
    id: "count-sketch-estimate",
    title: "Count Sketch: Signed Counters and the Median",
    level: 6, chapter: 16, difficulty: 1,
    topics: ["streaming", "sketches", "randomized algorithms", "median"],
    strategy: "d rows of w counters; each item adds ±count to one counter per row; estimate = median over rows of sign × counter",
    source: "Charikar, Chen & Farach-Colton (2002), \"Finding Frequent Items in Data Streams\" (International Colloquium on Automata, Languages and Programming (ICALP) 2002; journal version Theoretical Computer Science 312(1), 2004)",
    summary: "Maintain a Count Sketch over a stream of signed updates and answer frequency queries with the median of signed counters.",
    statement: `
<p>A Count-Min sketch never underestimates, but its error is always upward and grows with the whole stream. The <b>Count Sketch</b>
(Charikar, Chen &amp; Farach-Colton, 2002) gives every item a random <b>sign</b> ±1 in each row as well as a counter. Colliding items now
cancel out on average, so each row's estimate is <i>unbiased</i>, and the <b>median</b> of the rows throws away the few rows where a big
collision happened. It also handles deletions and negative counts (the "turnstile" model), which Count-Min's minimum cannot.</p>
<p>The sketch has d rows and w columns of counters, all 0. The hash functions are given as tables: in row r, item x maps to column
<code>H[r][x]</code> and has sign <code>Sg[r][x]</code> ∈ {+1, −1}.</p>
<ul>
<li>update <code>[x, c]</code> (c may be negative): for every row r, <code>Count[r][H[r][x]] ← Count[r][H[r][x]] + Sg[r][x] · c</code>;</li>
<li>query x: row r's estimate is <code>Sg[r][x] · Count[r][H[r][x]]</code>; the answer is the <b>median</b> of the d row estimates (d is odd, so the median is the middle value after sorting).</li>
</ul>
<p>Write <code>CountSketch(H, Sg, w, U, Q)</code>: apply all updates in <code>U</code>, then return the estimates for the items in <code>Q</code>.</p>
<ul><li>d ∈ {1, 3, 5}, 2 ≤ w ≤ 8, items 0..11, at most 30 updates.</li></ul>`,
    entry: "CountSketch",
    params: ["H", "Sg", "w", "U", "Q"],
    exampleCount: 3,
    tests: [
      { args: [[[0, 1, 0]], [[1, 1, -1]], 2, [[0, 5], [2, 3]], [0, 1, 2]], expect: [2, 0, -2], explain: "One row. Items 0 and 2 share counter 0 with opposite signs: 5 − 3 = 2. Item 0's estimate is +2 (true 5), item 2's is −1 · 2 = −2 (true 3): a single row can be far off, in either direction." },
      { args: [[[0, 1, 2, 0], [1, 1, 0, 2], [2, 0, 1, 1]], [[1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, 1, -1]], 3, [[0, 10], [1, 4], [3, 2]], [0, 1, 3, 2]], expect: [12, 4, 2, 0], explain: "Item 1's three row estimates are 4, 14, 4 — in row 1 it collides with item 0 (with the same sign). The median, 4, ignores that bad row. Item 2 was never inserted: estimates −2, 0, 0 → 0." },
      { args: [[[0, 1], [1, 0], [1, 1]], [[1, 1], [-1, 1], [1, -1]], 2, [], [0, 1]], expect: [0, 0], explain: "Nothing inserted: every counter is 0." },
      { args: [[[0, 1, 2]], [[1, -1, 1]], 3, [[1, 7], [1, -2], [0, 4], [0, -4]], [0, 1, 2]], expect: [0, 5, 0], explain: "Turnstile updates: item 1 gets +7 then −2, item 0 is inserted and fully deleted. With no collisions the sketch is exact." },
      { args: [[[0, 0, 1], [1, 0, 0], [0, 1, 1]], [[1, 1, 1], [1, -1, 1], [-1, 1, 1]], 2, [[0, 6], [1, 6], [2, 1]], [0, 1, 2]], expect: [6, 7, 1], explain: "Item 0 collides only in row 0 (estimates 12, 6, 6 → median 6, exact). Item 1 collides in every row (12, 5, 7): the median 7 is off by one. Item 2's estimates 1, −5, 7 have median 1, exact." },
      { args: [[[1, 0, 0, 1, 2], [0, 2, 1, 1, 0], [2, 2, 0, 1, 1], [0, 1, 2, 0, 1], [1, 1, 0, 2, 2]], [[1, -1, 1, 1, -1], [-1, 1, 1, -1, 1], [1, 1, -1, 1, 1], [1, -1, -1, 1, 1], [-1, 1, 1, 1, -1]], 3, [[0, 9], [1, 3], [2, 5], [3, 1], [4, 2], [0, 1]], [0, 1, 2, 3, 4]], expect: [11, 1, 5, 3, 1] },
      { args: [[[0, 1, 1, 0]], [[1, 1, -1, -1]], 2, [[0, 2], [1, 3], [2, 1], [3, 4]], [0, 3]], expect: [-2, 2] },
    ],
    random: { count: 30, gen: csGen },
    reference: (H, Sg, w, U, Q) => csRef(H, Sg, w, U, Q),
    mutants: [
      { fn: (H, Sg, w, U, Q) => csRef(H, Sg, w, U, Q, "nosign"), hint: "Items with sign −1 come out negative. The counter stores Sg · count, so multiply by the item's sign again when you READ it: Sg[r][x] · Count[r][H[r][x]]." },
      { fn: (H, Sg, w, U, Q) => csRef(H, Sg, w, U, Q, "mean"), hint: "You average the rows. The average lets a single badly-colliding row drag the estimate far away; Count Sketch takes the MEDIAN of the d signed estimates." },
      { fn: (H, Sg, w, U, Q) => csRef(H, Sg, w, U, Q, "min"), hint: "Taking the minimum is the Count-Min rule. Here counters can be pushed down as well as up by other items, so the minimum is biased low — use the median." },
    ],
    hints: [
      "If another item y lands in x's counter in some row, its contribution to x's estimate is Sg[r][x] · Sg[r][y] · count(y). Why does that average out to zero over the random choice of signs?",
      "Store Count as matrix(d, w, 0). Updates: one loop over rows per update. Queries: collect the d values Sg[r][q] · Count[r][H[r][q]] into a list.",
      "Sort the list of d estimates and return the middle element, est[(d − 1) div 2].",
    ],
    starter: {
      pseudo: `ALGORITHM CountSketch(H, Sg, w, U, Q)
    d ← length(H)
    Count ← matrix(d, w, 0)
    ...
    return out`,
      js: `function CountSketch(H, Sg, w, U, Q) {
  const d = H.length, Count = Array.from({ length: d }, () => Array(w).fill(0));
  // ...
  return [];
}`,
    },
    solution: {
      pseudo: `ALGORITHM CountSketch(H, Sg, w, U, Q)
    d ← length(H)
    Count ← matrix(d, w, 0)
    for each u in U do
        for r ← 0 to d - 1 do
            Count[r][H[r][u[0]]] ← Count[r][H[r][u[0]]] + Sg[r][u[0]] * u[1]
    out ← []
    for each q in Q do
        est ← []
        for r ← 0 to d - 1 do
            append(est, Sg[r][q] * Count[r][H[r][q]])
        est ← sorted(est)
        append(out, est[(d - 1) div 2])
    return out`,
      js: `function CountSketch(H, Sg, w, U, Q) {
  const d = H.length, Count = Array.from({ length: d }, () => Array(w).fill(0));
  for (const [x, c] of U) for (let r = 0; r < d; r++) Count[r][H[r][x]] += Sg[r][x] * c;
  return Q.map((q) => {
    const est = [];
    for (let r = 0; r < d; r++) est.push(Sg[r][q] * Count[r][H[r][q]]);
    est.sort((a, b) => a - b);
    return est[(d - 1) / 2];
  });
}`,
      python: `def count_sketch(H, Sg, w, U, Q):
    d = len(H)
    Count = [[0] * w for _ in range(d)]
    for x, c in U:
        for r in range(d):
            Count[r][H[r][x]] += Sg[r][x] * c
    out = []
    for q in Q:
        est = sorted(Sg[r][q] * Count[r][H[r][q]] for r in range(d))
        out.append(est[(d - 1) // 2])
    return out`,
      explain: "In one row, the estimate equals the true count plus Σ Sg(x)·Sg(y)·count(y) over colliding items y; with pairwise-independent signs each term has expectation 0, so the row is unbiased with variance ≤ ‖f‖₂²/w. Chebyshev makes each row good with constant probability, and the median of d = O(log 1/δ) rows is good with probability 1 − δ. Each update and query costs Θ(d) (plus d log d to sort for the median).",
    },
    complexity: "Θ(d) per update, Θ(d log d) per query, Θ(d·w) space",
    followUp: "Count Sketch's error scales with the L2 norm of the stream (Count-Min's with the L1 norm), which is far smaller for skewed data — it is the building block for L2 heavy hitters, feature hashing in machine learning, and sketched gradient compression in federated learning. Senior twist: keep a small heap of the current top-k estimates next to the sketch and you have the paper's frequent-items algorithm.",
    distractors: ["append(est, Count[r][H[r][q]])", "append(out, est[0])", "Count[r][H[r][u[0]]] ← Count[r][H[r][u[0]]] + u[1]"],
    visual: "sims/streaming-sketches.html",
    lesson: L16,
  });

  /* ================================================================== */
  /* 11 · A-Res weighted reservoir sampling                              */
  /* ================================================================== */
  const aresRef = (W, U, k, mode) => {
    const key = (i) => (mode === "product" ? U[i] * W[i] : mode === "inverted" ? Math.pow(U[i], W[i]) : Math.pow(U[i], 1 / W[i]));
    const idx = W.map((_, i) => i).sort((a, b) => (mode === "min" ? key(a) - key(b) : key(b) - key(a)) || a - b);
    return idx.slice(0, k).sort(byNum);
  };
  const aresGen = (r, n, k) => [Array.from({ length: n }, () => r.int(1, 9)), Array.from({ length: n }, () => Math.round(r() * 1e6) / 1e6 || 0.5), k];

  ForgeProblems.add({
    id: "weighted-reservoir-a-res",
    title: "Weighted Reservoir Sampling (A-Res)",
    level: 6, chapter: 16, difficulty: 2,
    topics: ["streaming", "sampling", "randomized algorithms", "heaps"],
    strategy: "Give item i the key u_i^(1/w_i); keep the k largest keys in a size-k min-heap",
    source: "Efraimidis & Spirakis (2006), \"Weighted Random Sampling with a Reservoir\", Information Processing Letters 97(5):181–185",
    summary: "Sample k items from a weighted stream in one pass: key = u^(1/w), keep the k largest keys with a min-heap.",
    statement: `
<p>Classic reservoir sampling keeps a uniform sample of a stream of unknown length. Often items should count unequally — sample log lines
by bytes, users by activity, documents by importance. Efraimidis and Spirakis (2006) found a one-pass algorithm, <b>A-Res</b>, that is
as simple as it gets: give item i, with weight w<sub>i</sub> and a uniform random number u<sub>i</sub> ∈ (0, 1), the key
<code>u<sub>i</sub><sup>1/w<sub>i</sub></sup></code>, and keep the k items with the <b>largest keys</b>. The result is a weighted random sample
without replacement: at each step the next item chosen is picked with probability proportional to its weight among the items left.</p>
<p>Write <code>ARes(W, U, k)</code>. The random numbers are supplied: <code>U[i]</code> is item i's uniform number. Process the stream in
order with a <b>min-priority queue</b> of at most k items: while it holds fewer than k items, insert; otherwise, if the new key is
<b>strictly larger</b> than the smallest key in the queue, remove the smallest and insert the new item. Return the indices of the final
sample, sorted increasingly.</p>
<ul>
<li>0 ≤ n ≤ 1024, weights are integers 1..9, 0 &lt; U[i] &lt; 1, 1 ≤ k ≤ 8. Use <code>U[i] ^ (1 / W[i])</code>.</li>
<li><b>Efficiency:</b> with k fixed the grader expects Θ(n) growth (each heap operation costs O(log k)); storing and sorting all n keys is Θ(n log n) and too slow.</li>
</ul>`,
    entry: "ARes",
    params: ["W", "U", "k"],
    exampleCount: 3,
    tests: [
      { args: [[1, 1, 1], [0.2, 0.9, 0.5], 2], expect: [1, 2], explain: "Equal weights: the keys are just the uniform numbers, so A-Res is ordinary uniform sampling — keep the two largest, 0.9 and 0.5." },
      { args: [[1, 4], [0.6, 0.3], 1], expect: [1], explain: "Item 1 drew the smaller random number, but its weight is 4: 0.3^(1/4) ≈ 0.740 beats 0.6^(1/1) = 0.6." },
      { args: [[2, 3], [0.1, 0.2], 5], expect: [0, 1], explain: "k is larger than the stream: everything is kept." },
      { args: [[], [], 3], expect: [], explain: "An empty stream gives an empty sample." },
      { args: [[1, 2, 3, 4, 5], [0.5, 0.5, 0.5, 0.5, 0.5], 2], expect: [3, 4], explain: "With equal random numbers the heaviest items have the largest keys: 0.5^(1/4) ≈ 0.841 and 0.5^(1/5) ≈ 0.871." },
      { args: [[5, 1], [0.1, 0.6], 1], expect: [0], explain: "0.1^(1/5) ≈ 0.631 > 0.6: weight raises a small u a lot. (The tempting key u · w would pick item 1: 0.5 < 0.6.)" },
      { args: [[3, 1, 7, 2, 2, 9, 1, 4], [0.42, 0.97, 0.05, 0.66, 0.81, 0.33, 0.12, 0.58], 3], expect: [1, 4, 5] },
      { args: [[1, 9, 1, 9, 1, 9], [0.99, 0.01, 0.95, 0.02, 0.9, 0.5], 2], expect: [0, 2] },
    ],
    random: { count: 30, gen: (r, i) => aresGen(r, i * 2, 1 + (i % 5)) },
    reference: (W, U, k) => aresRef(W, U, k),
    growth: { metric: "steps", sizes: [64, 128, 256, 512, 1024], gen: (r, n) => aresGen(r, n, 4), expect: "n" },
    mutants: [
      { fn: (W, U, k) => aresRef(W, U, k, "product"), hint: "Your key looks like u · w. That is not a correct weighted sample. A-Res uses the key u^(1/w): raising to a power below 1 lifts a heavy item's key toward 1." },
      { fn: (W, U, k) => aresRef(W, U, k, "inverted"), hint: "Heavy items are being picked LESS often: your key is u^w. The exponent is 1/w — U[i] ^ (1 / W[i])." },
      { fn: (W, U, k) => aresRef(W, U, k, "min"), hint: "You keep the k SMALLEST keys. The reservoir keeps the largest keys: a min-heap lets you see (and evict) the weakest member of the sample." },
    ],
    hints: [
      "Why u^(1/w)? For two items, P(u₁^(1/w₁) > u₂^(1/w₂)) = w₁ / (w₁ + w₂) — the heavier item wins in proportion to its weight.",
      "Use Q ← priorityQueue() with the key as priority and [key, i] as the item, so peek(Q)[0] is the smallest key in the sample. Grow it to k items, then compare each new key with the smallest.",
      "if length(Q) < k then insert; else if key > peek(Q)[0] then deleteMin(Q) and insert. At the end pop everything and return sorted(indices).",
    ],
    starter: {
      pseudo: `ALGORITHM ARes(W[0..n-1], U, k)
    Q ← priorityQueue()
    for i ← 0 to n - 1 do
        key ← U[i] ^ (1 / W[i])
        ...
    return sorted(out)`,
      js: `function ARes(W, U, k) {
  // keep the k largest keys U[i] ** (1 / W[i]) in a size-k min-heap
  return [];
}`,
    },
    solution: {
      pseudo: `ALGORITHM ARes(W[0..n-1], U, k)
    Q ← priorityQueue()
    for i ← 0 to n - 1 do
        key ← U[i] ^ (1 / W[i])
        if length(Q) < k then
            insert(Q, [key, i], key)
        else if key > peek(Q)[0] then
            deleteMin(Q)
            insert(Q, [key, i], key)
    out ← []
    while not isEmpty(Q) do
        append(out, deleteMin(Q)[1])
    return sorted(out)`,
      js: `function ARes(W, U, k) {
  const heap = []; // binary min-heap of [key, index]
  const up = (i) => { while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const down = (i) => { for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) return; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } };
  for (let i = 0; i < W.length; i++) {
    const key = Math.pow(U[i], 1 / W[i]);
    if (heap.length < k) { heap.push([key, i]); up(heap.length - 1); }
    else if (key > heap[0][0]) { heap[0] = [key, i]; down(0); }
  }
  return heap.map((x) => x[1]).sort((a, b) => a - b);
}`,
      python: `import heapq

def a_res(W, U, k):
    heap = []
    for i, (w, u) in enumerate(zip(W, U)):
        key = u ** (1 / w)
        if len(heap) < k:
            heapq.heappush(heap, (key, i))
        elif key > heap[0][0]:
            heapq.heapreplace(heap, (key, i))
    return sorted(i for _, i in heap)`,
      explain: "The k items with the largest keys u^(1/w) form a weighted sample without replacement (Efraimidis & Spirakis): the largest key belongs to item i with probability w_i / Σw, and the argument repeats on the remaining items. The min-heap holds the current k largest keys; each item costs one comparison with the heap's minimum and at most one O(log k) replacement, so the pass is Θ(n log k) time and Θ(k) memory.",
    },
    complexity: "Θ(n log k) time, Θ(k) memory",
    followUp: "The same paper's A-ExpJ variant draws an 'exponential jump' so it only generates random numbers for the items that actually enter the reservoir — O(k log(n/k)) of them. Senior twist: the key trick also merges across machines (keep the global top-k keys), which is how distributed engines sample weighted data in one pass.",
    distractors: ["key ← U[i] * W[i]", "else if key < peek(Q)[0] then", "key ← U[i] ^ W[i]"],
    visual: "sims/streaming-sketches.html",
    lesson: L16,
  });

  /* ================================================================== */
  /* 12 · Dinic's algorithm: level graphs and blocking flows             */
  /* ================================================================== */
  const dinicRef = (n, E, s, t, mode) => {
    const to = [], cap = [], adj = Array.from({ length: n }, () => []);
    for (const [u, v, c] of E) { adj[u].push(to.length); to.push(v); cap.push(c); adj[v].push(to.length); to.push(u); cap.push(0); }
    const bfs = () => {
      const lv = Array(n).fill(-1), q = [s];
      lv[s] = 0;
      while (q.length) { const u = q.shift(); for (const e of adj[u]) if (cap[e] > 0 && lv[to[e]] < 0) { lv[to[e]] = lv[u] + 1; q.push(to[e]); } }
      return lv;
    };
    let flow = 0;
    const levels = [];
    for (let phase = 0; ; phase++) {
      if (mode === "once" && phase === 1) break;
      const level = bfs();
      if (level[t] < 0) break;
      levels.push(level[t]);
      const it = Array(n).fill(0);
      const push = (u, f) => {
        if (u === t) return f;
        for (; it[u] < adj[u].length; it[u]++) {
          const e = adj[u][it[u]], v = to[e];
          if (cap[e] > 0 && level[v] === level[u] + 1) {
            const d = push(v, Math.min(f, cap[e]));
            if (d > 0) { cap[e] -= d; if (mode !== "norev") cap[e + 1 - 2 * (e % 2)] += d; return d; }
          }
        }
        return 0;
      };
      for (let f = push(s, Infinity); f > 0; f = mode === "onepath" ? 0 : push(s, Infinity)) flow += f;
    }
    return [flow, levels];
  };
  const dinicCompare = (got, exp, args) => {
    if (!Array.isArray(got) || got.length !== 2 || !Array.isArray(got[1])) return "Return a list [maxFlow, levels].";
    if (got[0] !== exp[0]) return false;
    const L = got[1], X = exp[1], n = args[0];
    if (!L.length || !X.length) return L.length === X.length;
    if (L[0] !== X[0]) return "The first entry of levels must be the distance (in edges) from s to t in the original graph.";
    for (let i = 1; i < L.length; i++) if (!(L[i] > L[i - 1])) return "The level of t must strictly increase from phase to phase: keep augmenting inside one level graph until t is unreachable in it (a blocking flow), and only then rebuild the levels.";
    return L[L.length - 1] <= n - 1 || "A level of t can never exceed n − 1.";
  };
  const dinicGen = (r, i) => {
    const n = 3 + (i % 6), E = [];
    for (let k = 0; k < n * 2; k++) { const u = r.int(0, n - 1); let v = r.int(0, n - 2); if (v >= u) v++; E.push([u, v, r.int(1, 9)]); }
    return [n, E, 0, n - 1];
  };

  ForgeProblems.add({
    id: "dinic-max-flow",
    title: "Dinic's Max Flow: Level Graphs and Blocking Flows",
    level: 6, chapter: 14, difficulty: 2,
    topics: ["graphs", "maximum flow", "breadth-first search", "depth-first search"],
    strategy: "Repeat: Breadth-First Search (BFS) levels in the residual graph; push a blocking flow along level-increasing edges with Depth-First Search (DFS)",
    source: "Dinic (1970), \"Algorithm for Solution of a Problem of Maximum Flow in Networks with Power Estimation\", Soviet Mathematics Doklady 11:1277–1280 · Dinitz (2006), \"Dinitz' Algorithm: The Original Version and Even's Version\"",
    summary: "Compute a maximum flow with Dinic's phases and report the distance from s to t at the start of every phase.",
    statement: `
<p>The shortest-augmenting-path method (Edmonds–Karp) finds one path per Breadth-First Search (BFS). <b>Dinic's algorithm</b> does far more
per BFS: it labels every vertex with its BFS distance from s in the residual graph (its <b>level</b>), keeps only edges that go from
level ℓ to level ℓ + 1, and pushes paths through this <b>level graph</b> until t becomes unreachable in it — a <b>blocking flow</b>.
After each phase the s–t distance strictly grows, so there are at most n − 1 phases: O(n²m) overall, and O(m√n) on unit-capacity
graphs such as bipartite matching (which is why it is the max-flow routine of competitive programmers and of many graph libraries).</p>
<p>Write <code>Dinic(n, E, s, t)</code>. Vertices are 0..n−1 and <code>E</code> is a list of directed edges <code>[u, v, capacity]</code>
(parallel and antiparallel edges are allowed). Return <code>[maxFlow, levels]</code>, where <code>levels[p]</code> is the level of t
(its distance from s in edges) in the residual graph at the start of phase p, for every phase that still reaches t.</p>
<p>Suggested representation (this is what makes the reference's levels come out exactly the same as yours): for each input edge, in input
order, create a forward residual edge with its capacity and then its reverse edge with capacity 0, so edge ids 2j and 2j + 1 are partners;
<code>adj[u]</code> lists u's residual edge ids in creation order. In a phase, a Depth-First Search (DFS) from s tries u's edges in that order, skipping edges
whose head is not exactly one level deeper, augments one path at a time by its bottleneck, and keeps a "current edge" pointer per
vertex so dead ends are never retried. (Any correct Dinic run is accepted: the grader checks the flow value, the first level, and that
levels strictly increase.)</p>
<ul><li>2 ≤ n ≤ 10, at most 25 edges, capacities 1..20, s ≠ t.</li></ul>`,
    entry: "Dinic",
    params: ["n", "E", "s", "t"],
    exampleCount: 3,
    compare: dinicCompare,
    tests: [
      { args: [4, [[0, 1, 3], [0, 2, 2], [1, 3, 2], [2, 3, 3], [1, 2, 1]], 0, 3], expect: [5, [2, 3]], explain: "Phase 1: levels 0 | 1, 2 | 3; edge 1 → 2 joins two vertices of the same level, so it is not in the level graph. Blocking flow: 2 along 0-1-3 and 2 along 0-2-3. Phase 2: the only residual path is 0-1-2-3, of length 3: one more unit." },
      { args: [6, [[0, 1, 1], [1, 2, 1], [2, 5, 1], [0, 3, 1], [3, 2, 1], [1, 4, 1], [4, 5, 1]], 0, 5], expect: [2, [3, 5]], explain: "Phase 1 pushes 0-1-2-5, which blocks both other length-3 paths. Phase 2 needs the REVERSE residual edge 2 → 1 to reroute: 0-3-2-1-4-5 (length 5) cancels the flow on 1 → 2." },
      { args: [3, [[0, 1, 5]], 0, 2], expect: [0, []], explain: "t is unreachable: no phase runs and the flow is 0." },
      { args: [2, [[0, 1, 7]], 0, 1], expect: [7, [1]], explain: "One edge, one phase, one path." },
      { args: [4, [[0, 1, 10], [1, 0, 4], [1, 3, 6], [0, 2, 3], [2, 3, 9], [2, 1, 5]], 0, 3], expect: [9, [2]], explain: "Antiparallel edges 0 → 1 and 1 → 0 are separate edges with their own reverse partners. The min cut is {1 → 3, 0 → 2} = 6 + 3." },
      { args: [5, [[0, 1, 4], [1, 2, 4], [2, 4, 4], [0, 3, 2], [3, 4, 1], [3, 2, 2], [1, 4, 1]], 0, 4], expect: [6, [2, 3]], explain: "Phase 1 (distance 2) saturates 0-1-4 and 0-3-4; phase 2 (distance 3) fills 0-1-2-4 and 0-3-2-4." },
      { args: [6, [[0, 1, 8], [0, 2, 6], [1, 3, 3], [1, 2, 4], [2, 4, 7], [3, 5, 9], [4, 3, 5], [4, 5, 2]], 0, 5], expect: [10, [3, 4, 5]] },
      { args: [7, [[0, 1, 3], [0, 2, 3], [1, 2, 2], [1, 3, 3], [2, 4, 2], [3, 4, 4], [3, 5, 2], [4, 6, 3], [5, 6, 3], [2, 5, 1]], 0, 6], expect: [6, [3, 4]] },
    ],
    random: { count: 30, gen: dinicGen },
    reference: (n, E, s, t) => dinicRef(n, E, s, t),
    mutants: [
      { fn: (n, E, s, t) => dinicRef(n, E, s, t, "onepath"), hint: "Your levels repeat (e.g. [2, 2, 3]): you augment one path and then rebuild the levels. That is Edmonds–Karp. Keep pushing paths through the SAME level graph until no path reaches t — that blocking flow is what makes the distance grow every phase." },
      { fn: (n, E, s, t) => dinicRef(n, E, s, t, "norev"), hint: "Your flow is too small on graphs where an early path must be partly undone. When you push d along an edge, also ADD d to its reverse residual edge (the partner id), so later phases can cancel that flow." },
      { fn: (n, E, s, t) => dinicRef(n, E, s, t, "once"), hint: "You stop after the first phase. After a blocking flow, recompute the BFS levels in the new residual graph and run another phase — repeat until t is unreachable." },
    ],
    hints: [
      "Why must the s–t distance grow after a blocking flow? Every shortest path used an edge of the level graph that is now saturated, and new residual edges only point back to a lower level.",
      "Structure: Levels(…) = BFS over edges with cap > 0. Push(u, f) = DFS: if u = t return f; scan edges from it[u]; on an admissible edge (cap > 0 and level[v] = level[u] + 1) recurse with min(f, cap); on success update both partner capacities and return.",
      "Partner of residual edge e is e + 1 − 2·(e mod 2) (0 ↔ 1, 2 ↔ 3, …). Advance it[u] only when the current edge fails, and in each phase call Push(s, ∞) until it returns 0.",
    ],
    starter: {
      pseudo: `ALGORITHM Dinic(n, E, s, t)
    head ← []
    cap ← []
    adj ← array(n, [])
    for each e in E do
        ...
    flow ← 0
    levels ← []
    ...
    return [flow, levels]`,
      js: `function Dinic(n, E, s, t) {
  const to = [], cap = [], adj = Array.from({ length: n }, () => []);
  // ...
  return [0, []];
}`,
    },
    solution: {
      pseudo: `ALGORITHM Dinic(n, E, s, t)
    head ← []
    cap ← []
    adj ← array(n, [])
    for each e in E do
        append(adj[e[0]], length(head))
        append(head, e[1])
        append(cap, e[2])
        append(adj[e[1]], length(head))
        append(head, e[0])
        append(cap, 0)
    flow ← 0
    levels ← []
    level ← Levels(n, adj, head, cap, s)
    while level[t] ≥ 0 do
        append(levels, level[t])
        it ← array(n, 0)
        f ← Push(s, t, ∞, adj, head, cap, level, it)
        while f > 0 do
            flow ← flow + f
            f ← Push(s, t, ∞, adj, head, cap, level, it)
        level ← Levels(n, adj, head, cap, s)
    return [flow, levels]

ALGORITHM Levels(n, adj, head, cap, s)
    level ← array(n, -1)
    level[s] ← 0
    Q ← queue()
    enqueue(Q, s)
    while not isEmpty(Q) do
        u ← dequeue(Q)
        for each e in adj[u] do
            if cap[e] > 0 and level[head[e]] < 0 then
                level[head[e]] ← level[u] + 1
                enqueue(Q, head[e])
    return level

ALGORITHM Push(u, t, f, adj, head, cap, level, it)
    if u = t then
        return f
    while it[u] < length(adj[u]) do
        e ← adj[u][it[u]]
        if cap[e] > 0 and level[head[e]] = level[u] + 1 then
            d ← Push(head[e], t, min(f, cap[e]), adj, head, cap, level, it)
            if d > 0 then
                cap[e] ← cap[e] - d
                cap[e + 1 - 2 * (e mod 2)] ← cap[e + 1 - 2 * (e mod 2)] + d
                return d
        it[u] ← it[u] + 1
    return 0`,
      js: `function Dinic(n, E, s, t) {
  const to = [], cap = [], adj = Array.from({ length: n }, () => []);
  for (const [u, v, c] of E) { adj[u].push(to.length); to.push(v); cap.push(c); adj[v].push(to.length); to.push(u); cap.push(0); }
  const levels = [];
  let flow = 0;
  for (;;) {
    const level = Array(n).fill(-1), q = [s];
    level[s] = 0;
    while (q.length) { const u = q.shift(); for (const e of adj[u]) if (cap[e] > 0 && level[to[e]] < 0) { level[to[e]] = level[u] + 1; q.push(to[e]); } }
    if (level[t] < 0) return [flow, levels];
    levels.push(level[t]);
    const it = Array(n).fill(0);
    const push = (u, f) => {
      if (u === t) return f;
      for (; it[u] < adj[u].length; it[u]++) {
        const e = adj[u][it[u]];
        if (cap[e] > 0 && level[to[e]] === level[u] + 1) {
          const d = push(to[e], Math.min(f, cap[e]));
          if (d > 0) { cap[e] -= d; cap[e ^ 1] += d; return d; }
        }
      }
      return 0;
    };
    for (let f = push(s, Infinity); f > 0; f = push(s, Infinity)) flow += f;
  }
}`,
      python: `from collections import deque
import math, sys

def dinic(n, E, s, t):
    sys.setrecursionlimit(10000)
    to, cap, adj = [], [], [[] for _ in range(n)]
    for u, v, c in E:
        adj[u].append(len(to)); to.append(v); cap.append(c)
        adj[v].append(len(to)); to.append(u); cap.append(0)
    flow, levels = 0, []
    while True:
        level = [-1] * n
        level[s] = 0
        q = deque([s])
        while q:
            u = q.popleft()
            for e in adj[u]:
                if cap[e] > 0 and level[to[e]] < 0:
                    level[to[e]] = level[u] + 1
                    q.append(to[e])
        if level[t] < 0:
            return [flow, levels]
        levels.append(level[t])
        it = [0] * n
        def push(u, f):
            if u == t:
                return f
            while it[u] < len(adj[u]):
                e = adj[u][it[u]]
                if cap[e] > 0 and level[to[e]] == level[u] + 1:
                    d = push(to[e], min(f, cap[e]))
                    if d > 0:
                        cap[e] -= d
                        cap[e ^ 1] += d
                        return d
                it[u] += 1
            return 0
        f = push(s, math.inf)
        while f > 0:
            flow += f
            f = push(s, math.inf)`,
      explain: "Each phase ends with no s–t path in the level graph; residual edges created by the phase point from level ℓ + 1 back to ℓ, so every new s–t path is strictly longer — at most n − 1 phases. With current-edge pointers each augmenting path costs O(n) plus the edges permanently discarded, so a blocking flow takes O(nm), giving O(n²m) in total. At the end no augmenting path exists, so by the max-flow min-cut theorem the flow is maximum.",
    },
    complexity: "O(n² m) in general; O(m √n) on unit-capacity bipartite graphs",
    followUp: "Hopcroft–Karp bipartite matching is exactly Dinic on a unit-capacity network. Senior twist: the 2022 almost-linear-time max-flow algorithm of Chen, Kyng, Liu, Peng, Probst Gutenberg and Sachdeva (IEEE Symposium on Foundations of Computer Science (FOCS) 2022) uses interior-point methods instead of augmenting paths — but in practice Dinic and push–relabel remain the workhorses.",
    distractors: ["if cap[e] > 0 and level[head[e]] ≥ level[u] then", "cap[e + 1 - 2 * (e mod 2)] ← cap[e + 1 - 2 * (e mod 2)] - d", "level ← Levels(n, adj, head, cap, t)"],
    visual: "sims/flow-modern.html",
    lesson: L14,
  });

  /* ================================================================== */
  /* 13 · Borůvka's MST: rounds of cheapest outgoing edges               */
  /* ================================================================== */
  const boruvkaRef = (n, E, mode) => {
    const p = Array.from({ length: n }, (_, i) => i);
    const find = (x) => { while (p[x] !== x) x = p[x]; return x; };
    const better = (i, j) => j < 0 || E[i][2] < E[j][2] || (E[i][2] === E[j][2] && i < j);
    let rounds = 0, weight = 0;
    const chosen = [];
    for (;;) {
      const best = Array(n).fill(-1);
      E.forEach((e, i) => {
        const a = find(e[0]), b = find(e[1]);
        if (a === b) return;
        const x = mode === "vertex" ? e[0] : a, y = mode === "vertex" ? e[1] : b;
        if (better(i, best[x])) best[x] = i;
        if (better(i, best[y])) best[y] = i;
      });
      const picks = best.filter((i) => i >= 0);
      if (!picks.length) { if (mode === "extra") rounds++; break; }
      rounds++;
      for (const i of picks) {
        const a = find(E[i][0]), b = find(E[i][1]);
        if (mode === "dup") { weight += E[i][2]; chosen.push(i); if (a !== b) p[a] = b; }
        else if (a !== b) { p[a] = b; weight += E[i][2]; chosen.push(i); }
      }
      if (mode === "oneround") break;
    }
    return [rounds, weight, chosen.sort(byNum)];
  };
  const boruvkaGen = (r, i) => {
    const n = 1 + (i % 9), E = [];
    const m = n > 1 ? r.int(n - 1, 2 * n + 2) : 0;
    for (let k = 0; k < m; k++) { const u = r.int(0, n - 1); let v = r.int(0, n - 2); if (v >= u) v++; E.push([u, v, r.int(1, i % 2 ? 4 : 20)]); }
    return [n, E];
  };

  ForgeProblems.add({
    id: "boruvka-mst",
    title: "Borůvka's MST: Every Component Picks Its Cheapest Edge",
    level: 6, chapter: 14, difficulty: 1,
    topics: ["graphs", "minimum spanning tree", "union-find", "parallel algorithms"],
    strategy: "Rounds: every component adds its cheapest outgoing edge (ties by edge index); components at least halve",
    source: "Borůvka (1926), \"O jistém problému minimálním\" (About a certain minimal problem), Práce Moravské Přírodovědecké Společnosti 3:37–58 · Nešetřil, Milková & Nešetřilová (2001), English translation and commentary, Discrete Mathematics 233:3–36",
    summary: "Build a minimum spanning forest in Borůvka rounds and report the number of rounds, the total weight and the chosen edges.",
    statement: `
<p>The oldest Minimum Spanning Tree (MST) algorithm (Borůvka, 1926, designing an electricity network for Moravia) is also the most modern
one: in every <b>round</b>, <i>every</i> component independently picks its cheapest edge leaving it, and all picks are added at once.
Since each component merges with at least one other, the number of components at least halves per round — at most ⌈log₂ n⌉ rounds.
Because the picks are independent, the rounds parallelize perfectly, which is why Borůvka is the MST algorithm of Graphics Processing Unit (GPU)
and distributed graph frameworks, and a key step of the randomized linear-time MST algorithm of Karger, Klein and Tarjan.</p>
<p>Write <code>Boruvka(n, E)</code>. Vertices are 0..n−1; <code>E[i] = [u, v, w]</code> is an undirected edge with index i (the graph may be
disconnected or have parallel edges). Compare edges by weight, <b>ties broken by the smaller edge index</b> — this makes all edges distinct,
which is what guarantees the simultaneous picks can never form a cycle. Each round:</p>
<ul>
<li>for every current component, find its cheapest edge with exactly one endpoint inside it;</li>
<li>add all those edges (one edge may be picked by both of its components — add it only once) and merge the components.</li>
</ul>
<p>Stop when no component has an outgoing edge. Return <code>[rounds, totalWeight, edges]</code>: the number of rounds that added at least
one edge, the total weight of the minimum spanning forest, and the indices of its edges sorted increasingly.</p>
<ul><li>1 ≤ n ≤ 12, at most 30 edges, weights 1..20, no self-loops. A union–find (parent array + Find) is the easiest way to know components.</li></ul>`,
    entry: "Boruvka",
    params: ["n", "E"],
    exampleCount: 3,
    tests: [
      { args: [4, [[0, 1, 1], [1, 2, 2], [2, 3, 1], [0, 3, 3]]], expect: [2, 4, [0, 1, 2]], explain: "Round 1: vertices 0 and 1 both pick edge 0, vertices 2 and 3 both pick edge 2 → components {0,1} and {2,3}. Round 2: the cheaper of the two edges between them is edge 1 (weight 2)." },
      { args: [3, [[0, 1, 5], [1, 2, 5], [0, 2, 5]]], expect: [1, 10, [0, 1]], explain: "All weights tie. By index: vertex 0 picks edge 0, vertex 1 picks edge 0, vertex 2 picks edge 1. Edge 0 is added only once; the consistent tie-break never closes the triangle." },
      { args: [4, [[0, 1, 2], [2, 3, 7]]], expect: [1, 9, [0, 1]], explain: "A disconnected graph gives a spanning forest: two trees, finished in one round." },
      { args: [1, []], expect: [0, 0, []], explain: "One vertex: nothing to connect, zero rounds." },
      { args: [4, [[0, 1, 1], [2, 3, 1], [0, 2, 10], [1, 3, 2]]], expect: [2, 4, [0, 1, 3]], explain: "In round 2 the component {0, 1} must pick its cheapest leaving edge (1 → 3, weight 2), even though vertex 0's own cheapest leaving edge is the weight-10 edge." },
      { args: [8, [[0, 1, 1], [1, 2, 5], [2, 3, 1], [3, 4, 5], [4, 5, 1], [5, 6, 5], [6, 7, 1]]], expect: [2, 19, [0, 1, 2, 3, 4, 5, 6]], explain: "Round 1 pairs the vertices up with the weight-1 edges; round 2 joins the four pairs with the weight-5 edges." },
      { args: [6, [[0, 1, 4], [0, 2, 1], [1, 2, 3], [1, 3, 2], [2, 3, 5], [3, 4, 7], [4, 5, 6], [3, 5, 8], [2, 4, 9]]], expect: [2, 19, [1, 2, 3, 5, 6]] },
      { args: [7, [[0, 1, 3], [1, 2, 3], [2, 3, 3], [3, 4, 3], [4, 5, 3], [5, 6, 3], [6, 0, 3], [0, 3, 2]]], expect: [1, 17, [0, 1, 3, 4, 5, 7]] },
    ],
    random: { count: 30, gen: boruvkaGen },
    reference: (n, E) => boruvkaRef(n, E),
    mutants: [
      { fn: (n, E) => boruvkaRef(n, E, "dup"), hint: "Your total weight is too big when two components pick the same edge — you add it twice. Before adding a picked edge, check that its endpoints are still in different components (Find(u) ≠ Find(v))." },
      { fn: (n, E) => boruvkaRef(n, E, "vertex"), hint: "After the first round you pick each VERTEX's cheapest outside edge. The rule is per COMPONENT: index the best[] array by Find(u), so a whole component chooses one edge." },
      { fn: (n, E) => boruvkaRef(n, E, "oneround"), hint: "You stop after one round. One round only guarantees that components halve — repeat rounds until no component has an edge leaving it." },
      { fn: (n, E) => boruvkaRef(n, E, "extra"), hint: "Your round count is one too high: you also count the final round that finds nothing to add. Count a round only if it added at least one edge." },
    ],
    hints: [
      "Cut property: for any component, its cheapest leaving edge belongs to the MST (when weights are distinct). That is why ALL components may add their pick at the same time.",
      "Each round: best ← array(n, −1). For every edge i with a = Find(u) ≠ b = Find(v), offer i to best[a] and best[b] using 'lighter, or equal weight and smaller index'. Then add the picks.",
      "When adding pick i, recompute a = Find(u), b = Find(v); only if a ≠ b: parent[a] ← b, add the weight, record i. Repeat until a round adds nothing; return sorted(chosen).",
    ],
    starter: {
      pseudo: `ALGORITHM Boruvka(n, E)
    parent ← range(0, n - 1)
    rounds ← 0
    weight ← 0
    chosen ← []
    repeat
        best ← array(n, -1)
        ...
    until added = 0
    return [rounds, weight, sorted(chosen)]

ALGORITHM Find(parent, x)
    ...`,
      js: `function Boruvka(n, E) {
  const parent = Array.from({ length: n }, (_, i) => i);
  // ...
  return [0, 0, []];
}`,
    },
    solution: {
      pseudo: `ALGORITHM Boruvka(n, E)
    parent ← range(0, n - 1)
    rounds ← 0
    weight ← 0
    chosen ← []
    repeat
        best ← array(n, -1)
        for i ← 0 to length(E) - 1 do
            a ← Find(parent, E[i][0])
            b ← Find(parent, E[i][1])
            if a ≠ b then
                if Better(E, i, best[a]) then best[a] ← i
                if Better(E, i, best[b]) then best[b] ← i
        added ← 0
        for c ← 0 to n - 1 do
            if best[c] ≥ 0 then
                a ← Find(parent, E[best[c]][0])
                b ← Find(parent, E[best[c]][1])
                if a ≠ b then
                    parent[a] ← b
                    weight ← weight + E[best[c]][2]
                    append(chosen, best[c])
                    added ← added + 1
        if added > 0 then rounds ← rounds + 1
    until added = 0
    return [rounds, weight, sorted(chosen)]

ALGORITHM Find(parent, x)
    while parent[x] ≠ x do
        x ← parent[x]
    return x

ALGORITHM Better(E, i, j)
    return j < 0 or E[i][2] < E[j][2] or (E[i][2] = E[j][2] and i < j)`,
      js: `function Boruvka(n, E) {
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x) => { while (parent[x] !== x) x = parent[x]; return x; };
  const better = (i, j) => j < 0 || E[i][2] < E[j][2] || (E[i][2] === E[j][2] && i < j);
  let rounds = 0, weight = 0;
  const chosen = [];
  for (;;) {
    const best = Array(n).fill(-1);
    E.forEach(([u, v], i) => {
      const a = find(u), b = find(v);
      if (a === b) return;
      if (better(i, best[a])) best[a] = i;
      if (better(i, best[b])) best[b] = i;
    });
    let added = 0;
    for (const i of best) {
      if (i < 0) continue;
      const a = find(E[i][0]), b = find(E[i][1]);
      if (a !== b) { parent[a] = b; weight += E[i][2]; chosen.push(i); added++; }
    }
    if (!added) break;
    rounds++;
  }
  return [rounds, weight, chosen.sort((x, y) => x - y)];
}`,
      python: `def boruvka(n, E):
    parent = list(range(n))
    def find(x):
        while parent[x] != x:
            x = parent[x]
        return x
    better = lambda i, j: j < 0 or (E[i][2], i) < (E[j][2], j)
    rounds = weight = 0
    chosen = []
    while True:
        best = [-1] * n
        for i, (u, v, w) in enumerate(E):
            a, b = find(u), find(v)
            if a != b:
                if better(i, best[a]): best[a] = i
                if better(i, best[b]): best[b] = i
        added = 0
        for i in best:
            if i >= 0:
                a, b = find(E[i][0]), find(E[i][1])
                if a != b:
                    parent[a] = b
                    weight += E[i][2]
                    chosen.append(i)
                    added += 1
        if not added:
            break
        rounds += 1
    return [rounds, weight, sorted(chosen)]`,
      explain: "With the (weight, index) order all edges are distinct, so each picked edge is the unique lightest edge across a cut and lies in the unique minimum spanning forest; distinctness also rules out a cycle among the picks. Every component with a leaving edge merges with at least one other, so a connected part with k components has at most k/2 after a round: at most ⌈log₂ n⌉ rounds of O(m) Find-heavy work each, O(m log n) in total.",
    },
    complexity: "O(m log n): at most ⌈log₂ n⌉ rounds of O(m) work",
    followUp: "Karger–Klein–Tarjan (1995) alternate Borůvka rounds with random sampling and verification to get expected O(m) time; GPU libraries and distributed MST algorithms (the Gallager–Humblet–Spira algorithm) are Borůvka at heart. Senior twist: contracting each component into a single vertex after every round keeps the per-round cost proportional to the shrinking graph.",
    distractors: ["if E[i][2] ≤ E[best[a]][2] then best[a] ← i", "best[E[i][0]] ← i", "rounds ← rounds + 1"],
    visual: "sims/mst-modern.html",
    lesson: L14,
  });

  /* ================================================================== */
  /* 14 · Δ-stepping single-source shortest paths                        */
  /* ================================================================== */
  const dsRef = (G, s, D, mode) => {
    const n = G.length, tent = Array(n).fill(Infinity), queued = Array(n).fill(false);
    const light = (w) => (mode === "lt" ? w < D : w <= D);
    const bucket = (v) => Math.floor(tent[v] / D);
    const relaxAll = (req) => { for (const [v, x] of req) if (x < tent[v]) { tent[v] = x; queued[v] = true; } };
    const take = (i) => { const S = []; for (let v = 0; v < n; v++) if (queued[v] && bucket(v) === i) { S.push(v); queued[v] = false; } return S; };
    tent[s] = 0; queued[s] = true;
    let phases = 0;
    for (let ptr = 0; ; ptr++) {
      let i = Infinity;
      for (let v = 0; v < n; v++) if (queued[v] && (mode !== "once" || bucket(v) >= ptr)) i = Math.min(i, bucket(v));
      if (i === Infinity) break;
      if (mode === "once") ptr = i;
      const R = [];
      let S = take(i), last = S;
      while (S.length) {
        phases++;
        R.push(...S);
        last = S;
        if (mode === "seq") { for (const u of S) for (const [v, w] of G[u]) if (light(w)) relaxAll([[v, tent[u] + w]]); }
        else { const req = []; for (const u of S) for (const [v, w] of G[u]) if (light(w)) req.push([v, tent[u] + w]); relaxAll(req); }
        S = mode === "once" ? [] : take(i);
      }
      const req = [];
      for (const u of mode === "lastS" ? last : R) for (const [v, w] of G[u]) if (!light(w)) req.push([v, tent[u] + w]);
      relaxAll(req);
    }
    return [tent, phases];
  };
  const dsGen = (r, i) => {
    const n = 2 + (i % 8), G = Array.from({ length: n }, () => []);
    for (let u = 0; u < n; u++) { const deg = r.int(0, 3); for (let k = 0; k < deg; k++) { const v = r.int(0, n - 1); if (v !== u) G[u].push([v, r.int(1, 9)]); } }
    return [G, 0, r.int(1, 10)];
  };

  ForgeProblems.add({
    id: "delta-stepping-sssp",
    title: "Δ-Stepping: Shortest Paths in Parallel-Friendly Buckets",
    level: 7, chapter: 14, difficulty: 2,
    topics: ["graphs", "shortest paths", "parallel algorithms", "buckets"],
    strategy: "Buckets of width Δ; relax light edges (w ≤ Δ) in synchronous rounds until the bucket stays empty, then heavy edges once",
    source: "Meyer & Sanders (2003), \"Δ-stepping: A Parallelizable Shortest Path Algorithm\", Journal of Algorithms 49(1):114–152 (conference version: European Symposium on Algorithms (ESA) 1998)",
    summary: "Run Meyer–Sanders Δ-stepping and return the distances and the number of synchronous light-edge phases.",
    statement: `
<p>Dijkstra's algorithm settles one vertex at a time, which leaves a thousand-core machine idle; Bellman–Ford relaxes everything every
round, wasting work. <b>Δ-stepping</b> (Meyer &amp; Sanders) sits in between: vertices are kept in buckets by tentative distance,
<code>bucket = ⌊tent / Δ⌋</code>, and a whole bucket is relaxed <i>in parallel</i>. Edges are <b>light</b> if <code>w ≤ Δ</code> (they may
land back in the current bucket) and <b>heavy</b> if <code>w &gt; Δ</code> (they never do). Δ = 1 with integer weights behaves like
Dijkstra/Dial's buckets; a huge Δ is Bellman–Ford. It is the shortest-path kernel of the Graph500 benchmark and of parallel graph
libraries (Galois, the Graph Based Benchmark Suite (GBBS)).</p>
<p>Write <code>DeltaStepping(G, s, delta)</code>. <code>G[u]</code> is a list of out-edges <code>[v, w]</code> with integer weights ≥ 1.</p>
<pre>tent[v] ← ∞ for all v;  tent[s] ← 0;  s is queued
while some vertex is queued:
    i ← the smallest bucket index of a queued vertex
    R ← [ ]
    repeat while bucket i holds queued vertices:       // one PHASE per pass
        S ← all queued vertices v with ⌊tent[v]/Δ⌋ = i;  dequeue them;  R ← R + S
        requests ← [v, tent[u] + w] for every u in S and light edge [v, w] of u
        apply every request: if x &lt; tent[v] then tent[v] ← x and queue v
    requests ← [v, tent[u] + w] for every u in R and heavy edge [v, w] of u
    apply them the same way</pre>
<p>All requests of a pass are generated from the tent values <i>before</i> any of them is applied — that is what makes a pass one
parallel step. Return <code>[tent, phases]</code>, where <code>phases</code> counts the light-edge passes over all buckets
(unreachable vertices keep ∞).</p>
<ul><li>1 ≤ n ≤ 12, weights 1..9, 1 ≤ Δ ≤ 100.</li></ul>`,
    entry: "DeltaStepping",
    params: ["G", "s", "delta"],
    exampleCount: 3,
    tests: [
      { args: [[[[1, 1], [2, 3]], [[2, 1]], []], 0, 2], expect: [[0, 1, 2], 3], explain: "Δ = 2: edge 0 → 2 (w = 3) is heavy. Bucket 0: pass 1 settles 0 and puts 1 (tent 1) back into bucket 0; pass 2 scans 1, giving 2 tent 2 → bucket 1. Heavy edge 0 → 2 offers 3, too late to matter. Bucket 1: pass 3 scans vertex 2. Three phases." },
      { args: [[[[1, 4]], [[2, 4]], []], 0, 4], expect: [[0, 4, 8], 3], explain: "An edge with w = Δ is light by definition, yet it can never land back in the current bucket (tent ≥ iΔ, so tent + Δ ≥ (i + 1)Δ). Each edge lands exactly in the next bucket: one pass per bucket." },
      { args: [[[], [[0, 1]]], 0, 3], expect: [[0, Infinity], 1], explain: "Vertex 1 cannot be reached from 0 (the edge points the other way): it stays at ∞." },
      { args: [[[[1, 1], [2, 5]], [[3, 1]], [], []], 0, 2], expect: [[0, 1, 5, 2], 4], explain: "Bucket 0 needs two passes (vertex 0, then vertex 1). Heavy edges are then relaxed from EVERY vertex removed from the bucket (the set R), including vertex 0 from the first pass — that is how vertex 2 gets 5. Buckets 1 and 2 take one pass each: four phases." },
      { args: [[[[1, 2], [2, 9]], [[2, 3]], [[3, 1]], []], 0, 100], expect: [[0, 2, 5, 6], 4], explain: "With a huge Δ every edge is light and everything sits in bucket 0: the passes are exactly the rounds of Bellman–Ford. Pass 2 improves vertex 2 from 9 to 5, so it is scanned again." },
      { args: [[[[1, 3], [2, 1]], [[3, 1]], [[1, 1]], []], 0, 1], expect: [[0, 2, 1, 3], 4], explain: "Δ = 1 with integer weights: each bucket holds one distance, like Dial's algorithm; the weight-3 edge 0 → 1 is heavy and loses to the path 0 → 2 → 1." },
      { args: [[[[1, 2], [2, 2], [3, 7]], [[3, 2], [2, 1]], [[3, 1], [4, 6]], [[4, 2]], []], 0, 3], expect: [[0, 2, 2, 3, 5], 4] },
      { args: [[[[1, 5], [2, 1]], [[3, 1]], [[1, 1], [3, 6]], [[4, 3]], [[0, 1]]], 0, 2], expect: [[0, 2, 1, 3, 6], 5] },
    ],
    random: { count: 30, gen: dsGen },
    reference: (G, s, delta) => dsRef(G, s, delta),
    mutants: [
      { fn: (G, s, delta) => dsRef(G, s, delta, "once"), hint: "Some distances stay too large or ∞: vertices that re-enter the CURRENT bucket during its pass are never scanned. Keep passing over bucket i until it stays empty, and always pick the smallest non-empty bucket next." },
      { fn: (G, s, delta) => dsRef(G, s, delta, "lastS"), hint: "Heavy edges are only relaxed from the vertices of the last pass. Remember every vertex removed from the bucket (R) and relax the heavy edges of all of them." },
      { fn: (G, s, delta) => dsRef(G, s, delta, "seq"), hint: "Distances are right but your phase count is too small: you apply each relaxation immediately, so later vertices of the same pass already see the new values. Collect all requests of a pass first, then apply them." },
    ],
    hints: [
      "Why can heavy edges wait until the bucket is finished? A vertex in bucket i has tent < (i + 1)Δ; adding w > Δ lands beyond bucket i, so the result cannot affect anything still in bucket i.",
      "Helpers make it short: MinBucket (smallest ⌊tent/Δ⌋ over queued vertices, ∞ if none), TakeBucket(i) (collect and dequeue those vertices), and Relax(S, light) (build the request list for light or heavy edges, then apply it).",
      "Main loop: i ← MinBucket; while i < ∞: R ← []; S ← TakeBucket(i); while S is non-empty: phases ← phases + 1, R ← R + S, Relax(S, light), S ← TakeBucket(i). Then Relax(R, heavy) and recompute i.",
    ],
    starter: {
      pseudo: `ALGORITHM DeltaStepping(G, s, delta)
    n ← length(G)
    tent ← array(n, ∞)
    queued ← array(n, false)
    tent[s] ← 0
    queued[s] ← true
    phases ← 0
    ...
    return [tent, phases]`,
      js: `function DeltaStepping(G, s, delta) {
  const n = G.length, tent = Array(n).fill(Infinity), queued = Array(n).fill(false);
  tent[s] = 0; queued[s] = true;
  let phases = 0;
  // ...
  return [tent, phases];
}`,
    },
    solution: {
      pseudo: `ALGORITHM DeltaStepping(G, s, delta)
    n ← length(G)
    tent ← array(n, ∞)
    queued ← array(n, false)
    tent[s] ← 0
    queued[s] ← true
    phases ← 0
    i ← MinBucket(tent, queued, delta)
    while i < ∞ do
        R ← []
        S ← TakeBucket(tent, queued, delta, i)
        while length(S) > 0 do
            phases ← phases + 1
            R ← R + S
            Relax(G, tent, queued, S, delta, true)
            S ← TakeBucket(tent, queued, delta, i)
        Relax(G, tent, queued, R, delta, false)
        i ← MinBucket(tent, queued, delta)
    return [tent, phases]

ALGORITHM MinBucket(tent, queued, delta)
    i ← ∞
    for v ← 0 to length(tent) - 1 do
        if queued[v] then i ← min(i, ⌊tent[v] / delta⌋)
    return i

ALGORITHM TakeBucket(tent, queued, delta, i)
    S ← []
    for v ← 0 to length(tent) - 1 do
        if queued[v] and ⌊tent[v] / delta⌋ = i then
            append(S, v)
            queued[v] ← false
    return S

ALGORITHM Relax(G, tent, queued, S, delta, light)
    req ← []
    for each u in S do
        for each e in G[u] do
            if (e[1] ≤ delta) = light then
                append(req, [e[0], tent[u] + e[1]])
    for each r in req do
        if r[1] < tent[r[0]] then
            tent[r[0]] ← r[1]
            queued[r[0]] ← true`,
      js: `function DeltaStepping(G, s, delta) {
  const n = G.length, tent = Array(n).fill(Infinity), queued = Array(n).fill(false);
  const bucket = (v) => Math.floor(tent[v] / delta);
  const take = (i) => { const S = []; for (let v = 0; v < n; v++) if (queued[v] && bucket(v) === i) { S.push(v); queued[v] = false; } return S; };
  const relax = (S, light) => {
    const req = [];
    for (const u of S) for (const [v, w] of G[u]) if ((w <= delta) === light) req.push([v, tent[u] + w]);
    for (const [v, x] of req) if (x < tent[v]) { tent[v] = x; queued[v] = true; }
  };
  tent[s] = 0; queued[s] = true;
  let phases = 0;
  for (;;) {
    let i = Infinity;
    for (let v = 0; v < n; v++) if (queued[v]) i = Math.min(i, bucket(v));
    if (i === Infinity) return [tent, phases];
    const R = [];
    for (let S = take(i); S.length; S = take(i)) { phases++; R.push(...S); relax(S, true); }
    relax(R, false);
  }
}`,
      python: `import math

def delta_stepping(G, s, delta):
    n = len(G)
    tent, queued = [math.inf] * n, [False] * n
    tent[s], queued[s] = 0, True
    def take(i):
        S = [v for v in range(n) if queued[v] and tent[v] // delta == i]
        for v in S:
            queued[v] = False
        return S
    def relax(S, light):
        req = [(v, tent[u] + w) for u in S for v, w in G[u] if (w <= delta) == light]
        for v, x in req:
            if x < tent[v]:
                tent[v], queued[v] = x, True
    phases = 0
    while any(queued):
        i = min(tent[v] // delta for v in range(n) if queued[v])
        R, S = [], take(i)
        while S:
            phases += 1
            R += S
            relax(S, True)
            S = take(i)
        relax(R, False)
    return [tent, phases]`,
      explain: "Like Dijkstra, the smallest non-empty bucket i is final once it stays empty: every vertex with distance in [iΔ, (i+1)Δ) is reached through vertices of smaller buckets (already final) followed by light edges, and the repeated passes are Bellman–Ford restricted to bucket i. Heavy edges cannot land in bucket i, so relaxing them once afterwards is enough. Meyer & Sanders show that for random edge weights and Δ = Θ(1/d) the total work is O(n + m + d·L) on average (L = the maximum shortest-path weight), with few phases per bucket — the parallel speedup.",
    },
    complexity: "Average O(n + m + d·L) work for random weights; phases per bucket bounded by the light-path hop count",
    followUp: "Choosing Δ is the art: too small and there are many nearly-empty buckets (Dijkstra's sequential bottleneck), too large and vertices are re-relaxed many times (Bellman–Ford's wasted work). Senior twist: radius-stepping (Blelloch, Gu, Sun & Tangwongsan, 2016) adapts the step per vertex and gives provable work–depth bounds.",
    distractors: ["if (e[1] > delta) = light then", "Relax(G, tent, queued, S, delta, false)", "i ← i + 1"],
    visual: "sims/shortest-path-frontier.html",
    lesson: L14,
  });

  /* @@END@@ */
})();
