/* Tower of Hanoi — watch the recursion or play it yourself. Algorithm Forge, Chapter 2 */
(function () {
  "use strict";
  Forge.page({ title: "Tower of Hanoi", chapter: "Ch 2 · Analysis Framework" });
  const $ = (id) => document.getElementById(id);
  const S = Forge.svg;
  const PEGS = ["A", "B", "C"];
  const DISK_COLORS = ["var(--steel)", "var(--c-done)", "var(--c-compare)", "var(--ember)", "var(--c-swap)", "var(--c-pivot)", "var(--c-bar)", "var(--ember-2)"];

  const LINES = [
    "ALGORITHM Hanoi(n, src, dst, spare)",
    "    // moves n disks from peg src to peg dst",
    "    if n = 1 then",
    "        move disk 1 from src to dst",
    "    else",
    "        Hanoi(n - 1, src, spare, dst)",
    "        move disk n from src to dst",
    "        Hanoi(n - 1, spare, dst, src)",
  ];
  const code = Forge.code($("code"), LINES);
  const ctr = Forge.counters($("ctr"), { moves: 0, "2ⁿ − 1": 7, "calls made": 0, "stack depth": 0 });
  const say = Forge.narrate($("say"));
  const stage = $("stage"), treeSvg = $("tree");
  let n = 3, mode = "watch";

  /* ---------------------------------------------------------------- recursion record */
  // nodes: {id, k, from, to, via, depth, order (in-order index = its move number - 1), parent}
  function record(n) {
    const pegs = [[], [], []];
    for (let d = n; d >= 1; d--) pegs[0].push(d);
    const nodes = [], frames = [], stack = [];
    let moves = 0, calls = 0;
    const snap = (o) => frames.push(Object.assign({ pegs: pegs.map((p) => p.slice()), stack: stack.slice(), moves, calls }, o));
    function move(k, from, to, node) {
      const disk = pegs[from].pop();
      pegs[to].push(disk);
      moves++;
      node.moveFrame = frames.length;
      return disk;
    }
    let order = 0;
    function go(k, from, to, via, depth, parent, side) {
      const node = { id: nodes.length, k, from, to, via, depth, parent };
      nodes.push(node);
      calls++;
      stack.push(node.id);
      node.enter = frames.length;
      const who = parent == null ? "Start" : `Hanoi(${k + 1}, ${PEGS[nodes[parent].from]}→${PEGS[nodes[parent].to]}) makes its ${side} call`;
      const purpose = parent == null ? `move all ${k} disk${k > 1 ? "s" : ""} from ${PEGS[from]} to ${PEGS[to]}` : side === "first" ? `park the ${k} smaller disk${k > 1 ? "s" : ""} on ${PEGS[to]}, out of the way of disk ${k + 1}` : `bring the ${k} smaller disk${k > 1 ? "s" : ""} back on top of disk ${k + 1}`;
      snap({ line: parent == null ? 2 : side === "first" ? 5 : 7, node: node.id, text: `${who}: Hanoi(${k}, ${PEGS[from]}→${PEGS[to]}, spare ${PEGS[via]}), to ${purpose}.` });
      if (k === 1) {
        node.order = order++;
        move(1, from, to, node);
        snap({ line: [2, 3], node: node.id, moved: { disk: 1, from, to }, text: `n = 1 is the base case: just move disk 1 from ${PEGS[from]} to ${PEGS[to]}. (Move ${moves}.)` });
      } else {
        go(k - 1, from, via, to, depth + 1, node.id, "first");
        node.order = order++;
        move(k, from, to, node);
        snap({ line: 6, node: node.id, moved: { disk: k, from, to }, text: `Disks 1…${k - 1} are parked on ${PEGS[via]}, so disk ${k} is free: move it from ${PEGS[from]} to ${PEGS[to]}. (Move ${moves}.)` });
        go(k - 1, via, to, from, depth + 1, node.id, "second");
      }
      stack.pop();
      node.exit = frames.length; // finished before this frame index
    }
    snap({ line: 0, node: null, text: `${n} disk${n > 1 ? "s" : ""} on peg A. Goal: move them all to peg C. The recurrence M(n) = 2M(n−1) + 1, M(1) = 1 predicts 2${F12.sup(n)} − 1 = ${Math.pow(2, n) - 1} moves.` });
    go(n, 0, 2, 1, 0, null, null);
    snap({ line: [], node: null, done: true, text: `Done: ${moves} moves = 2${F12.sup(n)} − 1, made by ${calls} calls. The stack never held more than ${n} calls at once.` });
    return { frames, nodes };
  }

  /* ---------------------------------------------------------------- drawing */
  const narrow = () => (stage.getBoundingClientRect().width || 760) < 560;
  let W = 760;
  const H = 250, baseY = 222, diskH = 20;
  let pegX = [130, 380, 630];
  function diskW(d) { const max = W / 3 - 40, min = Math.min(60, max * 0.3); return min + ((d - 1) * (max - min)) / Math.max(1, n - 1); }
  function drawPegs(pegs, opt) {
    opt = opt || {};
    W = narrow() ? 480 : 760;
    pegX = [W / 6, W / 2, (5 * W) / 6];
    stage.setAttribute("viewBox", `0 0 ${W} ${H}`);
    stage.innerHTML = "";
    stage.appendChild(S("rect", { x: 20, y: baseY, width: W - 40, height: 10, rx: 5, fill: "var(--line-2)" }));
    PEGS.forEach((name, p) => {
      const g = S("g", { class: "peghit", "data-p": p });
      g.appendChild(S("rect", { class: "pad", x: pegX[p] - W / 6 + 4, y: 12, width: W / 3 - 8, height: baseY - 4, rx: 12, fill: opt.sel === p ? "var(--ember-soft)" : "transparent" }));
      g.appendChild(S("rect", { x: pegX[p] - 4, y: baseY - 190, width: 8, height: 190, rx: 4, fill: "var(--line-2)" }));
      g.appendChild(S("text", { x: pegX[p], y: baseY + 24, "text-anchor": "middle", "font-size": 14, "font-weight": 800, fill: "var(--ink-2)" }, name));
      pegs[p].forEach((d, level) => {
        const lifted = opt.sel === p && level === pegs[p].length - 1;
        const y = lifted ? 18 : baseY - (level + 1) * diskH;
        const w = diskW(d), moved = opt.moved && opt.moved.disk === d;
        g.appendChild(S("rect", { x: pegX[p] - w / 2, y: y + 1, width: w, height: diskH - 2, rx: 8, fill: DISK_COLORS[d - 1], stroke: moved ? "var(--c-swap)" : lifted ? "var(--ember)" : "var(--bg-2)", "stroke-width": moved || lifted ? 3.5 : 1.5 }));
        g.appendChild(S("text", { x: pegX[p], y: y + 15, "text-anchor": "middle", "font-size": 12.5, "font-weight": 800, fill: "#0d1117" }, String(d)));
      });
      g.addEventListener("click", () => onPeg(p));
      stage.appendChild(g);
    });
    if (opt.moved) {
      const a = pegX[opt.moved.from], b = pegX[opt.moved.to], mid = (a + b) / 2;
      stage.appendChild(S("defs", null, S("marker", { id: "harr", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto" }, S("path", { d: "M0 0 L10 5 L0 10 z", fill: "var(--c-swap)" }))));
      stage.appendChild(S("path", { d: `M${a} 26 Q${mid} 0 ${b} 26`, fill: "none", stroke: "var(--c-swap)", "stroke-width": 2, "stroke-dasharray": "5 4", "marker-end": "url(#harr)" }));
    }
  }

  let rec = null;
  function drawTree(fi, extra) {
    const nodes = rec.nodes, total = nodes.length;
    const TW = 760, levels = n, TH = 30 + levels * 46;
    treeSvg.setAttribute("viewBox", `0 0 ${TW} ${TH}`);
    treeSvg.innerHTML = "";
    const sp = (TW - 20) / total, r = Math.max(2.5, Math.min(13, sp * 0.42));
    const px = (nd) => 10 + (nd.order + 0.5) * sp, py = (nd) => 20 + nd.depth * 46;
    const onStack = new Set(extra && extra.stack ? extra.stack : []);
    nodes.forEach((nd) => { if (nd.parent != null) { const p = nodes[nd.parent]; treeSvg.appendChild(S("line", { x1: px(p), y1: py(p), x2: px(nd), y2: py(nd), stroke: "var(--line-2)", "stroke-width": sp > 6 ? 1.3 : 0.7 })); } });
    nodes.forEach((nd) => {
      let st = "pending";
      if (extra.doneFn(nd)) st = "done";
      if (onStack.has(nd.id)) st = "active";
      if (extra.current === nd.id) st = "current";
      const fill = { pending: "var(--panel-2)", done: "var(--c-done)", active: "var(--c-active)", current: "var(--c-compare)" }[st];
      treeSvg.appendChild(S("circle", { cx: px(nd), cy: py(nd), r, fill, stroke: st === "pending" ? "var(--line-2)" : fill, "stroke-width": 1.2 }));
      if (sp >= 22) {
        treeSvg.appendChild(S("text", { x: px(nd), y: py(nd) + 4, "text-anchor": "middle", "font-size": 11, "font-weight": 700, fill: st === "pending" ? "var(--ink)" : "#0d1117" }, String(nd.k)));
        treeSvg.appendChild(S("text", { x: px(nd), y: py(nd) + r + 11, "text-anchor": "middle", "font-size": 9.5, fill: "var(--muted)" }, `${PEGS[nd.from]}→${PEGS[nd.to]}`));
      }
    });
    if (sp < 22) treeSvg.appendChild(S("text", { x: TW - 12, y: TH - 6, "text-anchor": "end", "font-size": 11, fill: "var(--muted)" }, `${total} calls · labels hidden for n > 5`));
  }
  function drawStack(ids, topNote) {
    const box = $("stackList");
    box.innerHTML = "";
    if (!ids.length) { box.appendChild(Forge.el("span", { class: "muted small" }, topNote || "(empty)")); return; }
    ids.forEach((id, k) => {
      const nd = rec.nodes[id];
      box.appendChild(Forge.el("div", { class: k === ids.length - 1 ? "top" : "" }, `Hanoi(${nd.k}, ${PEGS[nd.from]}→${PEGS[nd.to]}, spare ${PEGS[nd.via]})`));
    });
  }

  /* ---------------------------------------------------------------- watch mode */
  function renderWatch(f, i) {
    drawPegs(f.pegs, { moved: f.moved });
    drawTree(i, {
      stack: f.stack,
      current: f.moved ? f.node : null,
      doneFn: (nd) => nd.exit != null && nd.exit <= i,
    });
    drawStack(f.stack, f.done ? "(empty: every call has returned)" : "(nothing called yet)");
    code.highlight(f.line);
    ctr.set({ moves: f.moves, "2ⁿ − 1": Math.pow(2, n) - 1, "calls made": f.calls, "stack depth": f.stack.length });
    say.say(f.text);
  }
  let keepP = false;
  const player = Forge.player($("player"), { frames: [], render: (f, i) => { if (!keepP) $("predict").innerHTML = ""; if (mode === "watch") renderWatch(f, i); }, fps: 3 });

  /* ---------------------------------------------------------------- manual mode */
  let man = null; // {pegs, sel, history, optimalPrefix}
  function optimalMoves() { const out = []; rec.nodes.slice().sort((a, b) => a.order - b.order).forEach((nd) => out.push([nd.from, nd.to, nd.k])); return out; }
  function nextBest(pegs) {
    // best next move from ANY legal state: to put disk k on target, first clear disks < k onto the other peg
    const where = [];
    pegs.forEach((p, pi) => p.forEach((d) => (where[d] = pi)));
    function plan(k, target) {
      if (k === 0) return null;
      const src = where[k];
      if (src === target) return plan(k - 1, target);
      const other = 3 - src - target;
      const m = plan(k - 1, other);
      return m || [src, target];
    }
    return plan(n, 2);
  }
  function renderManual(msg) {
    drawPegs(man.pegs, { sel: man.sel, moved: man.last });
    const opt = optimalMoves();
    let prefix = 0;
    while (prefix < man.history.length && prefix < opt.length && man.history[prefix][0] === opt[prefix][0] && man.history[prefix][1] === opt[prefix][1]) prefix++;
    const onPath = prefix === man.history.length;
    const ordered = rec.nodes.slice().sort((a, b) => a.order - b.order);
    drawTree(0, { stack: [], current: onPath && prefix < ordered.length ? ordered[prefix].id : null, doneFn: (nd) => nd.order < prefix });
    drawStack([], onPath ? "In play mode there is no call stack: you are the algorithm. The yellow node is the recursive solution's next move." : "You left the recursive solution's path; the tree shows how far you followed it.");
    code.highlight([]);
    const best = Math.pow(2, n) - 1;
    ctr.set({ moves: man.history.length, "2ⁿ − 1": best, "calls made": "—", "stack depth": "—" });
    const solved = man.pegs[2].length === n;
    if (solved) {
      say.say(`🎉 Solved in <b>${man.history.length}</b> moves. ${man.history.length === best ? "That is optimal: exactly 2ⁿ − 1." : `The minimum is 2ⁿ − 1 = ${best}, so ${man.history.length - best} move${man.history.length - best > 1 ? "s were" : " was"} extra.`}`);
      $("manualStatus").textContent = "solved!";
    } else {
      say.say(msg || (man.sel != null ? `Holding disk ${man.pegs[man.sel][man.pegs[man.sel].length - 1]} from ${PEGS[man.sel]}. Click the peg to drop it on (or the same peg to put it back).` : `Click a peg to pick up its top disk. ${onPath ? "So far you match the recursive solution move for move." : "You are off the recursive solution's path; that's allowed, it just costs extra moves. Try the hint."}`));
      $("manualStatus").textContent = `${man.history.length} moves · optimum ${best}`;
    }
  }
  function onPeg(p) {
    if (mode !== "manual") return;
    if (man.pegs[2].length === n) return;
    if (man.sel == null) {
      if (!man.pegs[p].length) { renderManual(`Peg ${PEGS[p]} is empty: nothing to pick up.`); return; }
      man.sel = p; man.last = null; renderManual();
      return;
    }
    const from = man.sel;
    man.sel = null;
    if (from === p) { renderManual("Put it back. Pick a disk again."); return; }
    const disk = man.pegs[from][man.pegs[from].length - 1], top = man.pegs[p][man.pegs[p].length - 1];
    if (top != null && top < disk) { renderManual(`Illegal: disk ${disk} cannot go on top of the smaller disk ${top}. Pick again.`); return; }
    man.pegs[from].pop(); man.pegs[p].push(disk);
    man.history.push([from, p, disk]);
    man.last = { disk, from, to: p };
    renderManual(`Moved disk ${disk}: ${PEGS[from]} → ${PEGS[p]}.`);
  }
  function resetManual() {
    const pegs = [[], [], []];
    for (let d = n; d >= 1; d--) pegs[0].push(d);
    man = { pegs, sel: null, history: [], last: null, snaps: [] };
    renderManual();
  }
  $("undo").onclick = () => {
    if (!man || !man.history.length) return;
    const [from, to, disk] = man.history.pop();
    man.pegs[to].pop(); man.pegs[from].push(disk);
    man.sel = null; man.last = null;
    renderManual(`Undid the move of disk ${disk}.`);
  };
  $("hint").onclick = () => {
    const m = nextBest(man.pegs);
    if (!m) return;
    man.sel = null;
    renderManual(`💡 Best next move from here: disk ${man.pegs[m[0]][man.pegs[m[0]].length - 1]} from ${PEGS[m[0]]} to ${PEGS[m[1]]}. (To put the biggest misplaced disk on its target, first clear every smaller disk onto the third peg: the same idea as the recursion.)`);
  };
  $("reset").onclick = resetManual;
  document.addEventListener("keydown", (e) => {
    if (mode !== "manual" || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
    const k = { "1": 0, "2": 1, "3": 2, a: 0, b: 1, c: 2 }[e.key.toLowerCase()];
    if (k != null) onPeg(k);
  });

  /* ---------------------------------------------------------------- setup */
  function load() {
    $("nLbl").textContent = n;
    rec = record(n);
    if (mode === "watch") player.load(rec.frames);
    else { player.pause(); resetManual(); }
  }
  function setMode(m) {
    mode = m;
    $("wrap").classList.toggle("manual", m === "manual");
    $("mWatch").classList.toggle("on", m === "watch");
    $("mPlay").classList.toggle("on", m === "manual");
    $("predict").innerHTML = "";
    load();
  }
  $("mWatch").onclick = () => setMode("watch");
  $("mPlay").onclick = () => setMode("manual");
  $("n").oninput = (e) => { n = +e.target.value; load(); };
  $("rand").onclick = () => { n = 2 + Math.floor(Math.random() * 6); $("n").value = n; load(); };

  $("predictBtn").onclick = () => {
    player.pause();
    const fr = player.frames, i = player.index;
    const k = fr.findIndex((f, x) => x > i && f.moved);
    if (k < 0) { $("predict").innerHTML = `<div class="callout">All moves are done. Press ⏮ or change n.</div>`; return; }
    const mv = fr[k].moved;
    const opts = [];
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) if (a !== b) opts.push(`${PEGS[a]}→${PEGS[b]}`);
    F12.predict($("predict"), {
      prompt: `Which move comes next (move ${fr[k].moves})? Look at the call stack: which call is running, and what does it need?`,
      choices: opts,
      answer: `${PEGS[mv.from]}→${PEGS[mv.to]}`,
      explain: `Disk ${mv.disk} moves ${PEGS[mv.from]} → ${PEGS[mv.to]}. ${mv.disk === 1 ? "Disk 1 moves on every odd-numbered move, always cycling around the pegs in the same direction." : `It is the middle step of Hanoi(${mv.disk}, …): the smaller disks have just been parked.`}`,
      onReveal: () => { keepP = true; player.go(k); keepP = false; },
    });
  };

  window.addEventListener("resize", () => { if (mode === "watch") player.go(player.index); else renderManual(); });
  load();
})();
