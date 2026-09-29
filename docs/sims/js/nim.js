/* The game of Nim (Levitin §4.5): one pile with take 1..m, and many piles with the nim sum. */
(function () {
  "use strict";
  Forge.page({ title: "The Game of Nim", chapter: "Ch 4 · Decrease-and-Conquer" });
  const $ = (id) => document.getElementById(id);
  const S = Forge.svg, E = Forge.el;
  const stage = $("stage"), board = $("board");
  const say = Forge.narrate($("say"));
  const pred = FX.predict($("predict"));
  let code = null, ctr = null, runId = 0, mode = "one";
  const one = { N: 10, m: 4, status: [], move: [] };
  const many = { piles: [3, 4, 5] };
  const game = { pos: null, turn: "you", over: false, log: [] };

  const ONE_LINES = [
    "ALGORITHM ClassifyPositions(N, m)",
    "    // W: the player to move can force a win;  L: they cannot",
    "    status[0] ← L         // no chips left: the player to move has lost",
    "    for n ← 1 to N do",
    "        status[n] ← L",
    "        for k ← 1 to min(m, n) do",
    "            if status[n − k] = L then    // taking k leaves the opponent at L",
    "                status[n] ← W;  move[n] ← k",
    "                break",
    "    return status, move",
  ];
  const MANY_LINES = [
    "ALGORITHM NimMove(n[1..I])",
    "    s ← 0",
    "    for i ← 1 to I do",
    "        s ← s ⊕ n[i]        // ⊕: add binary digits, drop carries",
    "    if s = 0 then",
    "        return \"losing: every move hands the opponent a win\"",
    "    for i ← 1 to I do",
    "        if (n[i] ⊕ s) < n[i] then",
    "            return take n[i] − (n[i] ⊕ s) chips from pile i",
  ];

  /* ------------------------------------------------------------ one pile analysis */
  function recOne() {
    const { N, m } = one, frames = [], status = [], move = [];
    let checks = 0;
    const push = (o) => frames.push(Object.assign({ status: status.slice(), move: move.slice(), checks }, o));
    status[0] = "L";
    push({ line: 2, n: 0, text: `n = 0: no chips, no move. The player to move has already lost, so 0 is a <b>losing</b> position (L).` });
    const askAt = new Set([m + 1, 2 * m + 2].filter((x) => x <= N));
    for (let n = 1; n <= N; n++) {
      if (askAt.has(n)) push({ line: 3, n, text: `Next up: n = ${n}. Every smaller position is already labeled. Decide before we check.`,
        ask: { q: `With m = ${m}, is a pile of <b>${n}</b> chips winning or losing for the player to move?`, options: [{ label: "W (winning)", value: "W" }, { label: "L (losing)", value: "L" }], answer: n % (m + 1) === 0 ? "L" : "W",
          why: n % (m + 1) === 0 ? `Every move (take 1…${m}) leaves ${n - m}…${n - 1} chips, and all of those are W for the opponent. So ${n} is L. Note ${n} mod ${m + 1} = 0.` : `Taking ${n % (m + 1)} leaves ${n - (n % (m + 1))}, an L position for the opponent.` } });
      status[n] = "L";
      let found = false;
      for (let k = 1; k <= Math.min(m, n); k++) {
        checks++;
        if (status[n - k] === "L") {
          status[n] = "W"; move[n] = k; found = true;
          push({ line: [6, 7, 8], n, k, res: true, text: `n = ${n}: taking <b>${k}</b> leaves ${n - k}, which is <b>L</b> for the opponent. So ${n} is <b>W</b>, and the winning move is "take ${k}". (${n} mod ${m + 1} = ${n % (m + 1)}.)` });
          break;
        }
        push({ line: [5, 6], n, k, text: `n = ${n}: taking ${k} leaves ${n - k}, which is W for the opponent. Not good enough; try the next move.` });
      }
      if (!found) push({ line: [4, 5], n, res: true, text: `n = ${n}: <b>every</b> move (take 1…${Math.min(m, n)}) leaves the opponent a W position. So ${n} is <b>L</b>. Notice ${n} = ${n / (m + 1)} × (m + 1).` });
    }
    const Ls = status.map((s, n) => (s === "L" ? n : null)).filter((x) => x != null);
    push({ line: 9, n: null, final: true, text: `Done. The losing positions are ${Ls.join(", ")}: exactly the multiples of m + 1 = ${m + 1}. Winning strategy: always take n mod ${m + 1} chips, leaving a multiple of ${m + 1}.` });
    one.status = status; one.move = move;
    return frames;
  }
  function drawOne(f) {
    const { N, m } = one, cw = Math.min(44, 660 / (N + 1)), W = Math.max(440, cw * (N + 1) + 110), x0 = 90, y = 150, H = 270;
    stage.setAttribute("viewBox", `0 0 ${W} ${H}`);
    stage.innerHTML = "";
    stage.appendChild(S("defs", null, ...[["g", "var(--c-done)"], ["y", "var(--c-compare)"], ["m", "var(--line-2)"]].map(([k, c]) =>
      S("marker", { id: "nim-arr-" + k, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" }, S("path", { d: "M0 0 L10 5 L0 10 z", fill: c })))));
    const cx = (n) => x0 + n * cw + cw / 2;
    // winning-move arcs below (only for classified W positions)
    f.status.forEach((s, n) => {
      if (s !== "W" || f.move[n] == null || (n === f.n && !f.res)) return;
      const a = cx(n), b = cx(n - f.move[n]), h = 14 + 7 * f.move[n];
      stage.appendChild(S("path", { d: `M${a} ${y + cw / 2 + 2} C ${a} ${y + cw / 2 + h * 1.6}, ${b} ${y + cw / 2 + h * 1.6}, ${b} ${y + cw / 2 + 4}`, fill: "none", stroke: "var(--c-done)", "stroke-width": 2.2, "marker-end": "url(#nim-arr-g)", opacity: 0.85 }));
    });
    // candidate moves from the current n (above)
    if (f.n != null && f.n > 0) {
      for (let k = 1; k <= Math.min(m, f.n); k++) {
        const a = cx(f.n), b = cx(f.n - k), h = 16 + 12 * k, cur = f.k === k;
        stage.appendChild(S("path", { d: `M${a} ${y - cw / 2 - 2} C ${a} ${y - cw / 2 - h * 1.5}, ${b} ${y - cw / 2 - h * 1.5}, ${b} ${y - cw / 2 - 4}`, fill: "none", stroke: cur ? "var(--c-compare)" : "var(--line-2)", "stroke-width": cur ? 3 : 1.5, "marker-end": `url(#nim-arr-${cur ? "y" : "m"})` }));
      }
    }
    for (let n = 0; n <= N; n++) {
      const s = n === f.n && !f.res && n > 0 ? null : f.status[n], x = x0 + n * cw;
      const fill = s === "W" ? "var(--c-done)" : s === "L" ? "var(--c-swap)" : "var(--panel-2)";
      stage.appendChild(S("rect", { x: x + 2, y: y - cw / 2, width: cw - 4, height: cw - 4, rx: 7, fill, stroke: n === f.n ? "var(--c-active)" : "var(--line-2)", "stroke-width": n === f.n ? 3 : 1 }));
      stage.appendChild(S("text", { x: x + cw / 2, y: y + 3, "text-anchor": "middle", "font-size": Math.min(15, cw * 0.4), "font-weight": 700, fill: s ? "#0d1117" : "var(--ink)" }, String(n)));
      if (s) stage.appendChild(S("text", { x: x + cw / 2, y: y - cw / 2 - 4, "text-anchor": "middle", "font-size": 10, fill: "var(--muted)", opacity: f.n != null && Math.abs(n - f.n) <= m && n <= f.n ? 0 : 1 }, s));
      stage.appendChild(S("text", { x: x + cw / 2, y: H - 10, "text-anchor": "middle", "font-size": Math.min(11, cw * 0.33), fill: n % (m + 1) === 0 ? "var(--c-swap)" : "var(--muted)" }, String(n % (m + 1))));
      if (game.pos === n && mode === "one") stage.appendChild(S("circle", { cx: x + cw / 2, cy: y - 2, r: cw * 0.62, fill: "none", stroke: "var(--steel)", "stroke-width": 3, "stroke-dasharray": "4 3" }));
    }
    stage.appendChild(S("text", { x: 12, y: H - 10, "font-size": 11, fill: "var(--muted)" }, `n mod ${m + 1}:`));
    stage.appendChild(S("text", { x: 12, y: 22, "font-size": 12, fill: "var(--muted)" }, `pile size n = 0 … ${N}, take 1 … ${m}`));
    const L = f.status.filter((s) => s === "L").length;
    ctr.set({ "positions labeled": f.status.filter(Boolean).length, "moves checked": f.checks, "L positions": L, "game pile": game.pos == null ? "—" : game.pos });
  }

  /* ----------------------------------------------------------- many piles analysis */
  const BITS = 4;
  const bin = (x) => x.toString(2).padStart(BITS, "0");
  function recMany() {
    const P = many.piles.slice(), frames = [];
    let s = 0, xors = 0, checks = 0;
    const push = (o) => frames.push(Object.assign({ piles: P.slice(), s, xors, checks }, o));
    push({ line: 1, rows: 0, text: `Piles: ${P.join(", ")}. Write each size in binary (${P.map(bin).join(", ")}). Start the nim sum at s = 0.` });
    const finalS = P.reduce((a, b) => a ^ b, 0);
    P.forEach((p, i) => {
      if (i === P.length - 1 && P.length > 1) push({ line: 2, rows: i, text: `One pile left to add. Count the 1s in each column so far, including the last row.`,
        ask: { q: `Piles ${P.join(", ")}: will the nim sum be <b>zero</b>?`, options: [{ label: "Yes, s = 0 (losing for the mover)", value: "0" }, { label: "No, s ≠ 0 (winning for the mover)", value: "1" }], answer: finalS === 0 ? "0" : "1",
          why: `s = ${P.map(bin).join(" ⊕ ")} = ${bin(finalS)}. ${finalS === 0 ? "Every column has an even number of 1s." : "At least one column has an odd number of 1s."}` } });
      const old = s; s ^= p; xors++;
      push({ line: [2, 3], rows: i + 1, cur: i, text: `s = ${bin(old)} ⊕ ${bin(p)} = <b>${bin(s)}</b>. In each column a 1 appears in the sum if that column has an odd number of 1s so far.` });
    });
    if (s === 0) {
      push({ line: [4, 5], rows: P.length, text: `The nim sum is <b>0000</b>. This is a <b>losing</b> position for the player to move: any move changes exactly one pile, which flips at least one bit of the sum and hands the opponent a nonzero sum.`, lose: true });
      return frames;
    }
    const win = P.findIndex((p) => (p ^ s) < p);
    push({ line: [4, 6], rows: P.length, text: `The nim sum ${bin(s)} is not zero, so the player to move can win. Look for a pile to shrink.`,
      ask: { q: `Nim sum s = ${bin(s)}. Which pile has the winning move (the first one with n ⊕ s &lt; n)?`, options: P.map((p, i) => ({ label: `pile ${i + 1} (${p})`, value: i })), answer: win,
        why: `Pile ${win + 1}: ${P[win]} ⊕ ${s} = ${P[win] ^ s} < ${P[win]}. Such a pile has a 1 in the leftmost column where s has a 1.` } });
    for (let i = 0; i < P.length; i++) {
      checks++;
      const t = P[i] ^ s;
      if (t < P[i]) {
        push({ line: [7, 8], rows: P.length, cur: i, target: t, text: `Pile ${i + 1}: ${P[i]} ⊕ ${s} = ${t} &lt; ${P[i]}. <b>Take ${P[i] - t}</b> chips from pile ${i + 1}, leaving ${t}. Then the nim sum becomes 0000 and the opponent is stuck in a losing position.`, winPile: i, take: P[i] - t });
        break;
      }
      push({ line: [6, 7], rows: P.length, cur: i, target: t, text: `Pile ${i + 1}: ${P[i]} ⊕ ${s} = ${t}, which is not smaller than ${P[i]}. We can't grow a pile, so no winning move here.` });
    }
    return frames;
  }
  function drawMany(f) {
    const P = f.piles, W = 760, rowH = 38, top = 50, H = top + (P.length + 2) * rowH + 30;
    stage.setAttribute("viewBox", `0 0 ${W} ${H}`);
    stage.innerHTML = "";
    const cx0 = 300, cw = 58;
    ["8", "4", "2", "1"].forEach((lab, b) => stage.appendChild(S("text", { x: cx0 + b * cw + cw / 2, y: top - 14, "text-anchor": "middle", "font-size": 12, fill: "var(--muted)" }, lab + "s")));
    P.forEach((p, i) => {
      const y = top + i * rowH, shown = i < f.rows, isCur = f.cur === i;
      stage.appendChild(S("text", { x: 60, y: y + 24, "font-size": 14, "font-weight": 700, fill: isCur ? "var(--c-active)" : "var(--ink-2)" }, `pile ${i + 1}`));
      stage.appendChild(S("text", { x: 200, y: y + 24, "text-anchor": "end", "font-size": 16, "font-weight": 700, fill: "var(--ink)" }, String(p)));
      bin(p).split("").forEach((d, b) => {
        const one = d === "1";
        stage.appendChild(S("rect", { x: cx0 + b * cw + 4, y: y + 3, width: cw - 8, height: rowH - 8, rx: 7, fill: !shown ? "var(--panel-2)" : one ? (isCur ? "var(--c-active)" : "var(--c-compare)") : "var(--panel)", stroke: "var(--line)", opacity: shown ? 1 : 0.6 }));
        stage.appendChild(S("text", { x: cx0 + b * cw + cw / 2, y: y + 24, "text-anchor": "middle", "font-size": 16, "font-weight": 700, fill: shown && one ? "#0d1117" : "var(--muted)" }, d));
      });
      if (f.target != null && isCur) stage.appendChild(S("text", { x: cx0 + 4 * cw + 16, y: y + 24, "font-size": 13, fill: f.target < p ? "var(--c-done)" : "var(--muted)" }, `${p} ⊕ s = ${f.target}${f.target < p ? `  → take ${p - f.target}` : "  (not smaller)"}`));
    });
    const ys = top + P.length * rowH + 10;
    stage.appendChild(S("line", { x1: cx0, y1: ys - 4, x2: cx0 + 4 * cw, y2: ys - 4, stroke: "var(--ink-2)", "stroke-width": 2 }));
    stage.appendChild(S("text", { x: 60, y: ys + 24, "font-size": 14, "font-weight": 700, fill: "var(--ember)" }, "nim sum s"));
    stage.appendChild(S("text", { x: 200, y: ys + 24, "text-anchor": "end", "font-size": 16, "font-weight": 700, fill: "var(--ember)" }, String(f.s)));
    bin(f.s).split("").forEach((d, b) => {
      stage.appendChild(S("rect", { x: cx0 + b * cw + 4, y: ys + 3, width: cw - 8, height: rowH - 8, rx: 7, fill: d === "1" ? "var(--ember)" : "var(--panel)", stroke: "var(--ember)" }));
      stage.appendChild(S("text", { x: cx0 + b * cw + cw / 2, y: ys + 24, "text-anchor": "middle", "font-size": 16, "font-weight": 700, fill: d === "1" ? "#1b0f05" : "var(--ink-2)" }, d));
    });
    stage.appendChild(S("text", { x: cx0 + 4 * cw + 16, y: ys + 24, "font-size": 13, "font-weight": 700, fill: f.rows === P.length ? (f.s === 0 ? "var(--c-swap)" : "var(--c-done)") : "var(--muted)" },
      f.rows < P.length ? "(adding rows…)" : f.s === 0 ? "L: losing for the mover" : "W: winning for the mover"));
    ctr.set({ piles: P.length, "nim sum": bin(f.s), "⊕ operations": f.xors, "piles checked": f.checks });
  }

  /* ------------------------------------------------------------------- game */
  function piles() { return mode === "one" ? [game.pos] : game.piles; }
  function logLine(t) { game.log.unshift(t); $("log").innerHTML = game.log.slice(0, 30).map((x) => `<div>${x}</div>`).join(""); }
  function newGame() {
    game.over = false; game.log = []; $("log").innerHTML = ""; $("hintText").textContent = "";
    if (mode === "one") game.pos = one.N; else game.piles = many.piles.slice();
    game.turn = $("first").value;
    drawBoard();
    if (game.turn === "cpu") setTimeout(cpuMove, 700);
  }
  function bestMove() {
    if (mode === "one") { const r = game.pos % (one.m + 1); return r ? { pile: 0, take: r } : null; }
    const s = game.piles.reduce((a, b) => a ^ b, 0);
    if (!s) return null;
    const i = game.piles.findIndex((p) => (p ^ s) < p);
    return { pile: i, take: game.piles[i] - (game.piles[i] ^ s) };
  }
  function randomMove() {
    if (mode === "one") return { pile: 0, take: 1 + Math.floor(Math.random() * Math.min(one.m, game.pos)) };
    const nz = game.piles.map((p, i) => i).filter((i) => game.piles[i] > 0), i = nz[Math.floor(Math.random() * nz.length)];
    return { pile: i, take: 1 + Math.floor(Math.random() * game.piles[i]) };
  }
  function apply(who, mv) {
    if (mode === "one") {
      game.pos -= mv.take;
      logLine(`${who === "you" ? "You" : "Computer"} took ${mv.take} → ${game.pos} left (${game.pos} mod ${one.m + 1} = ${game.pos % (one.m + 1)}${game.pos % (one.m + 1) === 0 ? ", L for the next player" : ""})`);
    } else {
      game.piles[mv.pile] -= mv.take;
      const s = game.piles.reduce((a, b) => a ^ b, 0);
      logLine(`${who === "you" ? "You" : "Computer"} took ${mv.take} from pile ${mv.pile + 1} → ${game.piles.join(", ")} (nim sum ${bin(s)})`);
    }
    $("hintText").textContent = "";
    const empty = piles().every((p) => p === 0);
    if (empty) { game.over = true; game.winner = who; }
    game.turn = who === "you" ? "cpu" : "you";
    drawBoard();
    if (mode === "many") { runId++; player.load(recMany()); }
    else if (lastFrame) drawOne(lastFrame);
    if (!game.over && game.turn === "cpu") setTimeout(cpuMove, 750);
  }
  function cpuMove() {
    if (game.over || game.turn !== "cpu") return;
    const mv = ($("level").value === "perfect" && bestMove()) || randomMove();
    apply("cpu", mv);
  }
  function drawBoard() {
    const W = 760;
    board.innerHTML = "";
    const P = piles(), you = game.turn === "you" && !game.over;
    if (mode === "one") {
      const n = game.pos, per = 15, r = 14, rows = Math.max(1, Math.ceil(one.N / per)), H = 30 + rows * 34;
      board.setAttribute("viewBox", `0 0 ${W} ${H}`);
      for (let k = 0; k < one.N; k++) {
        const x = 40 + (k % per) * 45, y = 24 + Math.floor(k / per) * 34, alive = k < n;
        board.appendChild(S("circle", { cx: x, cy: y, r, fill: alive ? "var(--ember)" : "none", stroke: alive ? "var(--ember-2)" : "var(--line)", "stroke-dasharray": alive ? null : "3 3", "stroke-width": 2 }));
      }
      const mv = $("moves"); mv.innerHTML = "";
      for (let k = 1; k <= one.m; k++) mv.appendChild(E("button", { class: "btn", disabled: !you || k > n, onclick: () => apply("you", { pile: 0, take: k }) }, "Take " + k));
      mv.appendChild(E("button", { class: "btn ghost", onclick: newGame }, "↺ New game"));
    } else {
      const maxP = Math.max(1, ...many.piles), r = 13, colW = Math.min(140, (W - 40) / P.length), H = 40 + maxP * 29;
      board.setAttribute("viewBox", `0 0 ${W} ${H}`);
      P.forEach((p, i) => {
        const x = 20 + i * colW + colW / 2;
        board.appendChild(S("text", { x, y: H - 6, "text-anchor": "middle", "font-size": 13, fill: "var(--ink-2)" }, `pile ${i + 1}: ${p}`));
        for (let k = 0; k < many.piles[i]; k++) {
          const y = H - 32 - k * 29, alive = k < p;
          if (!alive) { board.appendChild(S("circle", { cx: x, cy: y, r, fill: "none", stroke: "var(--line)", "stroke-dasharray": "3 3" })); continue; }
          const gEl = S("g", { class: you ? "chip-hit" : "" }, S("circle", { cx: x, cy: y, r, fill: "var(--ember)", stroke: "var(--ember-2)", "stroke-width": 2 }));
          gEl.appendChild(S("title", null, `take ${p - k} from pile ${i + 1}`));
          if (you) gEl.addEventListener("click", () => apply("you", { pile: i, take: p - k }));
          board.appendChild(gEl);
        }
      });
      const mv = $("moves"); mv.innerHTML = "";
      mv.appendChild(E("span", { class: "fx-note" }, you ? "Click a chip: it and every chip above it are removed." : ""));
      mv.appendChild(E("button", { class: "btn ghost", onclick: newGame }, "↺ New game"));
    }
    const st = $("status");
    if (game.over) { st.textContent = game.winner === "you" ? "🏆 You took the last chip. You win!" : "🤖 The computer took the last chip and wins."; st.style.color = game.winner === "you" ? "var(--ok)" : "var(--bad)"; }
    else {
      const bm = bestMove();
      st.style.color = "";
      st.textContent = game.turn === "you" ? `Your move. ${mode === "one" ? `Pile: ${game.pos}.` : `Piles: ${game.piles.join(", ")}.`}` : "Computer is thinking…";
      if (game.turn === "you" && !bm) st.textContent += " (Careful: this is a losing position for you if the computer plays perfectly.)";
    }
  }
  $("hint").onclick = () => {
    if (game.over) return;
    const bm = bestMove();
    $("hintText").textContent = !bm ? (mode === "one" ? `${game.pos} mod ${one.m + 1} = 0: no winning move exists. Take 1 and hope for a mistake.` : "Nim sum is 0: no winning move exists. Make a small move and hope for a mistake.")
      : mode === "one" ? `Take ${bm.take}: ${game.pos} mod ${one.m + 1} = ${bm.take}, which leaves ${game.pos - bm.take}, a multiple of ${one.m + 1}.` : `Take ${bm.take} from pile ${bm.pile + 1}, leaving ${game.piles[bm.pile] - bm.take}. The nim sum becomes 0000.`;
  };

  /* --------------------------------------------------------------- plumbing */
  let lastFrame = null;
  const player = Forge.player($("player"), {
    frames: [], fps: 3,
    render(f, i) {
      lastFrame = f;
      if (mode === "one") drawOne(f); else drawMany(f);
      code.highlight(f.line); say.say(f.text);
      if (f.ask) { const key = runId + ":" + i; pred.show(f.ask, key); if (pred.shouldPause(key)) player.pause(); } else pred.hide();
    },
  });
  function setMode(m) {
    mode = m;
    document.querySelectorAll("#modes button").forEach((b) => b.classList.toggle("on", b.dataset.m === m));
    $("oneCtl").classList.toggle("show", m === "one");
    $("manyCtl").classList.toggle("show", m === "many");
    $("code").innerHTML = ""; $("ctr").innerHTML = "";
    code = Forge.code($("code"), m === "one" ? ONE_LINES : MANY_LINES);
    ctr = Forge.counters($("ctr"), m === "one" ? { "positions labeled": 0, "moves checked": 0, "L positions": 0, "game pile": "—" } : { piles: 0, "nim sum": "0000", "⊕ operations": 0, "piles checked": 0 });
    $("legend").innerHTML = m === "one"
      ? `<span><i style="background:var(--c-done)"></i>W: winning for the player to move</span><span><i style="background:var(--c-swap)"></i>L: losing</span><span><i style="background:var(--c-compare);height:3px;width:16px;vertical-align:3px"></i>move being checked</span><span><i style="background:var(--c-done);height:3px;width:16px;vertical-align:3px"></i>winning move</span><span><i style="background:none;border:2px dashed var(--steel)"></i>current game position</span>`
      : `<span><i style="background:var(--c-compare)"></i>1-bits added so far</span><span><i style="background:var(--c-active)"></i>current pile</span><span><i style="background:var(--ember)"></i>nim sum bit = 1</span>`;
    load();
  }
  function load() {
    if (mode === "one") {
      one.N = Math.max(1, Math.min(30, Math.round(+$("N").value || 10))); one.m = Math.max(1, Math.min(6, Math.round(+$("M").value || 4)));
      $("N").value = one.N; $("M").value = one.m;
      game.pos = one.N;
      runId++; player.load(recOne());
    } else {
      const P = $("piles").value.split(/[\s,]+/).filter(Boolean).map(Number).filter((x) => Number.isFinite(x) && x >= 1).map((x) => Math.min(15, Math.round(x))).slice(0, 5);
      many.piles = P.length ? P : [3, 4, 5];
      $("piles").value = many.piles.join(" ");
      game.piles = many.piles.slice();
      runId++; player.load(recMany());
    }
    newGame();
  }
  document.querySelectorAll("#modes button").forEach((b) => (b.onclick = () => setMode(b.dataset.m)));
  $("oneGo").onclick = load; $("manyGo").onclick = load;
  $("oneRand").onclick = () => { $("N").value = 8 + Math.floor(Math.random() * 18); $("M").value = 2 + Math.floor(Math.random() * 4); load(); };
  $("manyRand").onclick = () => { const k = 2 + Math.floor(Math.random() * 3); $("piles").value = Array.from({ length: k }, () => 1 + Math.floor(Math.random() * 12)).join(" "); load(); };
  $("first").onchange = newGame;
  setMode("one");
})();
