/* Algorithm Forge · Root finding: bisection, false position, Newton, Newton for √D.
   The function is parsed by a small safe recursive-descent parser (no eval) into a closure that
   returns a dual number {v, d}: value and exact derivative (forward-mode automatic differentiation). */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const E = Forge.el, S = Forge.svg;
  Forge.page({ title: "Root Finding", chapter: "Ch 12 · Coping with Limitations" });

  /* ================================================================== safe parser */
  function tokenize(src) {
    const toks = [];
    let i = 0;
    const s = src.replace(/−/g, "-").replace(/·|×/g, "*").replace(/²/g, "^2").replace(/³/g, "^3");
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9.]/.test(c)) {
        const m = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(s.slice(i));
        if (!m) throw new Error("bad number at position " + (i + 1));
        toks.push({ t: "num", v: parseFloat(m[0]) }); i += m[0].length; continue;
      }
      if (/[a-zA-Z]/.test(c)) {
        const m = /^[a-zA-Z]+/.exec(s.slice(i))[0];
        toks.push({ t: "id", v: m.toLowerCase() }); i += m.length; continue;
      }
      if ("+-*/^()".includes(c)) { toks.push({ t: c }); i++; continue; }
      throw new Error(`unexpected “${c}”`);
    }
    return toks;
  }
  const FUNCS = {
    sin: (a) => ({ v: Math.sin(a.v), d: Math.cos(a.v) * a.d }),
    cos: (a) => ({ v: Math.cos(a.v), d: -Math.sin(a.v) * a.d }),
    exp: (a) => { const e = Math.exp(a.v); return { v: e, d: e * a.d }; },
    ln: (a) => ({ v: Math.log(a.v), d: a.d / a.v }),
    log: (a) => ({ v: Math.log(a.v), d: a.d / a.v }),
    sqrt: (a) => { const r = Math.sqrt(a.v); return { v: r, d: a.d / (2 * r) }; },
  };
  function parse(src) {
    const toks = tokenize(src);
    let p = 0;
    const peek = () => toks[p], eat = (t) => { if (!toks[p] || toks[p].t !== t) throw new Error(`expected “${t}”`); return toks[p++]; };
    const startsPrimary = (tk) => tk && (tk.t === "num" || tk.t === "id" || tk.t === "(");
    function expr() {
      let l = term();
      while (peek() && (peek().t === "+" || peek().t === "-")) {
        const op = toks[p++].t, a = l, b = term();
        l = op === "+" ? (x) => { const u = a(x), w = b(x); return { v: u.v + w.v, d: u.d + w.d }; } : (x) => { const u = a(x), w = b(x); return { v: u.v - w.v, d: u.d - w.d }; };
      }
      return l;
    }
    function term() {
      let l = unary();
      for (;;) {
        const tk = peek();
        if (tk && (tk.t === "*" || tk.t === "/")) {
          p++;
          const a = l, b = unary();
          l = tk.t === "*" ? (x) => { const u = a(x), w = b(x); return { v: u.v * w.v, d: u.d * w.v + u.v * w.d }; }
            : (x) => { const u = a(x), w = b(x); return { v: u.v / w.v, d: (u.d * w.v - u.v * w.d) / (w.v * w.v) }; };
        } else if (startsPrimary(tk)) { // implicit multiplication: 2x, 3(x+1), x sin(x)
          const a = l, b = power();
          l = (x) => { const u = a(x), w = b(x); return { v: u.v * w.v, d: u.d * w.v + u.v * w.d }; };
        } else return l;
      }
    }
    function unary() {
      if (peek() && peek().t === "-") { p++; const a = unary(); return (x) => { const u = a(x); return { v: -u.v, d: -u.d }; }; }
      if (peek() && peek().t === "+") { p++; return unary(); }
      return power();
    }
    function power() {
      const base = primary();
      if (peek() && peek().t === "^") {
        p++;
        const ex = unary();
        return (x) => {
          const u = base(x), w = ex(x);
          if (w.d === 0) { // constant exponent: works for negative bases with integer powers
            const v = Math.pow(u.v, w.v);
            return { v, d: w.v === 0 ? 0 : w.v * Math.pow(u.v, w.v - 1) * u.d };
          }
          const v = Math.pow(u.v, w.v);
          return { v, d: v * (w.d * Math.log(u.v) + (w.v * u.d) / u.v) };
        };
      }
      return base;
    }
    function primary() {
      const tk = peek();
      if (!tk) throw new Error("formula ends too early");
      if (tk.t === "num") { p++; const c = tk.v; return () => ({ v: c, d: 0 }); }
      if (tk.t === "(") { p++; const e = expr(); eat(")"); return e; }
      if (tk.t === "id") {
        p++;
        if (tk.v === "x") return (x) => ({ v: x, d: 1 });
        if (tk.v === "pi") return () => ({ v: Math.PI, d: 0 });
        if (tk.v === "e") return () => ({ v: Math.E, d: 0 });
        const fn = FUNCS[tk.v];
        if (!fn) throw new Error(`unknown name “${tk.v}”`);
        eat("(");
        const a = expr();
        eat(")");
        return (x) => fn(a(x));
      }
      throw new Error(`unexpected “${tk.t}”`);
    }
    const f = expr();
    if (p < toks.length) throw new Error(`unexpected “${toks[p].t === "num" ? toks[p].v : toks[p].v || toks[p].t}”`);
    return f;
  }

  /* ================================================================== pseudocode */
  const CODE = {
    bis: [
      "ALGORITHM Bisection(f, a, b, eps, N)",
      "    // f(a) and f(b) have opposite signs",
      "    n ← 1",
      "    while n ≤ N do",
      "        x ← (a + b) / 2",
      "        if x − a < eps then return x",
      "        fx ← f(x)",
      "        if fx = 0 then return x",
      "        if fx · f(a) < 0 then b ← x",
      "        else a ← x",
      "        n ← n + 1",
      "    return \"iteration limit\", a, b",
    ],
    fp: [
      "ALGORITHM FalsePosition(f, a, b, eps, N)",
      "    xOld ← a",
      "    for n ← 1 to N do",
      "        x ← (a·f(b) − b·f(a)) / (f(b) − f(a))",
      "        fx ← f(x)",
      "        if fx = 0 or |x − xOld| < eps then",
      "            return x",
      "        if fx · f(a) < 0 then b ← x",
      "        else a ← x",
      "        xOld ← x",
      "    return x",
    ],
    newt: [
      "ALGORITHM Newton(f, f′, x0, eps, N)",
      "    x ← x0",
      "    for n ← 0 to N − 1 do",
      "        if f′(x) = 0 then return \"flat tangent\"",
      "        xNew ← x − f(x) / f′(x)",
      "        if |xNew − x| < eps then return xNew",
      "        x ← xNew",
      "    return \"no convergence\", x",
    ],
    sqrt: [
      "ALGORITHM NewtonSqrt(D, x0, eps)",
      "    // Newton on f(x) = x² − D, f′(x) = 2x",
      "    x ← x0",
      "    repeat",
      "        xOld ← x",
      "        x ← (x + D / x) / 2",
      "    until |x − xOld| < eps",
      "    return x",
    ],
  };
  const PRESETS = {
    book: { f: "x^3 - x - 1", a: 0, b: 2, x0: 2 },
    cos: { f: "cos(x) - x", a: 0, b: 1, x0: 1 },
    sq2: { f: "x^2 - 2", a: 0, b: 2, x0: 1 },
    slow: { f: "x^10 - 1", a: 0, b: 1.3, x0: 1.3 },
    cycle: { f: "x^3 - 2*x + 2", a: -3, b: 0, x0: 0, method: "newt" },
    away: { f: "x*exp(-x)", a: -0.5, b: 0.8, x0: 2, method: "newt" },
  };

  /* ================================================================== state */
  let method = "bis", F = null, rec = null, code, ctr, player = null;
  const say = Forge.narrate($("say"));
  const stage = $("stage");
  const answered = {};
  const num = (id, dflt) => { const v = parseFloat($(id).value); return Number.isFinite(v) ? v : dflt; };
  const g6 = (x) => (!Number.isFinite(x) ? String(x) : Math.abs(x) >= 1e5 || (Math.abs(x) < 1e-4 && x !== 0) ? x.toExponential(3) : String(+x.toFixed(7)));
  const sgn = (v) => (v < 0 ? "−" : v > 0 ? "+" : "0");
  const fv = (x) => F(x).v;

  /* ================================================================== recorders */
  function recBis(a, b, eps, N, quiet) {
    const frames = [], rows = [];
    let fa = fv(a), fb = fv(b), evals = 2;
    const A0 = a, B0 = b;
    const push = (st, line, text, ask) => frames.push(Object.assign({ line, text, ask, rows: rows.slice(), c: { "iteration n": rows.length, "f evaluations": evals, "xₙ": st.x != null ? g6(st.x) : "—", "error bound (b−a)/2ⁿ": rows.length ? g6((B0 - A0) / Math.pow(2, rows.length)) : "—" } }, st));
    if (!(fa * fb < 0)) {
      push({ a, b }, 1, `f(a) = ${g6(fa)} and f(b) = ${g6(fb)} do not have opposite signs, so bisection has no guarantee that [${a}, ${b}] contains a root. Pick another bracket (look at the graph for a sign change).`);
      return { frames, xs: [], fail: true };
    }
    const need = Math.ceil(Math.log2((b - a) / eps) + 1e-12);
    push({ a, b, fa, fb }, [1, 2], `f(${g6(a)}) = ${g6(fa)} (${sgn(fa)}) and f(${g6(b)}) = ${g6(fb)} (${sgn(fb)}): opposite signs, so a root lies in between. Tolerance ε = ${eps} needs about log₂((b − a)/ε) ≈ ${need} halvings.`);
    const xs = [];
    for (let n = 1; n <= N; n++) {
      const x = (a + b) / 2;
      const fx = fv(x);
      evals++;
      xs.push(x);
      const keepLeft = fx * fa < 0;
      rows.push({ n, a, b, sa: sgn(fa), sb: sgn(fb), x, fx, err: (B0 - A0) / Math.pow(2, n) });
      const stop = x - a < eps || fx === 0;
      push({ a, b, fa, fb, x, fx, mid: true }, [4, 5, 6], `Iteration ${n}: midpoint x${sub(n)} = (${g6(a)} + ${g6(b)}) / 2 = <b>${g6(x)}</b>, f(x${sub(n)}) = ${g6(fx)}.` + (stop ? "" : ` Which half keeps the sign change?`),
        stop ? null : { q: `f(a) is ${fa < 0 ? "negative" : "positive"} and f(x${sub(n)}) = ${g6(fx)}. Which half still brackets the root?`, opts: [`left: [${g6(a)}, ${g6(x)}]`, `right: [${g6(x)}, ${g6(b)}]`], ans: keepLeft ? 0 : 1, why: keepLeft ? "f(a) and f(x) have opposite signs, so the root is in the left half and b moves to x." : "f(a) and f(x) have the same sign, so the sign change is in the right half and a moves to x." });
      if (stop) {
        push({ a, b, fa, fb, x, fx, done: true }, fx === 0 ? 7 : 5, fx === 0 ? `f(x) = 0 exactly: x = ${g6(x)} is a root.` : `x − a = ${g6(x - a)} < ε = ${eps}: stop. <b>x ≈ ${g6(x)}</b>, and |x${sub(n)} − x*| ≤ (b₁ − a₁)/2ⁿ = ${g6((B0 - A0) / Math.pow(2, n))}.`);
        return { frames, xs, root: x };
      }
      if (keepLeft) { b = x; fb = fx; } else { a = x; fa = fx; }
      push({ a, b, fa, fb, x, fx }, keepLeft ? 8 : 9, keepLeft ? `f(x) has the sign opposite to f(a), so the root is on the left: <b>b ← ${g6(x)}</b>. New bracket [${g6(a)}, ${g6(b)}], half as wide.` : `f(x) has the same sign as f(a), so the root is on the right: <b>a ← ${g6(x)}</b>. New bracket [${g6(a)}, ${g6(b)}], half as wide.`);
    }
    push({ a, b, fa, fb, done: true, x: (a + b) / 2 }, 11, `Reached N = ${N} iterations. The root is somewhere in [${g6(a)}, ${g6(b)}].`);
    return { frames, xs, root: (a + b) / 2 };
  }
  const sub = (n) => String(n).split("").map((d) => "₀₁₂₃₄₅₆₇₈₉"[+d]).join("");

  function recFP(a, b, eps, N) {
    const frames = [], rows = [];
    let fa = fv(a), fb = fv(b), evals = 2, xOld = a;
    const push = (st, line, text, ask) => frames.push(Object.assign({ line, text, ask, rows: rows.slice(), c: { "iteration n": rows.length, "f evaluations": evals, "xₙ": st.x != null ? g6(st.x) : "—", "bracket width": g6(st.b - st.a) } }, st));
    if (!(fa * fb < 0)) {
      push({ a, b }, 0, `f(a) = ${g6(fa)} and f(b) = ${g6(fb)} do not have opposite signs; false position needs a bracket around a sign change.`);
      return { frames, xs: [], fail: true };
    }
    push({ a, b, fa, fb }, 1, `Bracket [${g6(a)}, ${g6(b)}] with f(a) ${sgn(fa)} and f(b) ${sgn(fb)}. Instead of the midpoint, use where the straight line (chord) between the two end points crosses the x-axis.`);
    const xs = [];
    for (let n = 1; n <= N; n++) {
      const x = (a * fb - b * fa) / (fb - fa);
      const fx = fv(x);
      evals++;
      xs.push(x);
      const keepLeft = fx * fa < 0;
      rows.push({ n, a, b, sa: sgn(fa), sb: sgn(fb), x, fx, err: Math.abs(x - xOld) });
      const stop = fx === 0 || Math.abs(x - xOld) < eps;
      push({ a, b, fa, fb, x, fx, chord: true }, [3, 4], `Iteration ${n}: chord from (${g6(a)}, ${g6(fa)}) to (${g6(b)}, ${g6(fb)}) crosses the axis at x${sub(n)} = (a·f(b) − b·f(a)) / (f(b) − f(a)) = <b>${g6(x)}</b>; f(x${sub(n)}) = ${g6(fx)}.`,
        stop ? null : { q: `Which end of the bracket gets replaced by x${sub(n)} = ${g6(x)}?`, opts: ["b (keep the left part)", "a (keep the right part)"], ans: keepLeft ? 0 : 1, why: keepLeft ? "f(x) and f(a) differ in sign, so the root is between a and x." : "f(x) has the same sign as f(a), so a moves up to x." });
      if (stop) {
        push({ a, b, fa, fb, x, fx, done: true }, [5, 6], `|x${sub(n)} − x${sub(n - 1)}| = ${g6(Math.abs(x - xOld))} < ε = ${eps}: stop with <b>x ≈ ${g6(x)}</b>.`);
        return { frames, xs, root: x };
      }
      if (keepLeft) { b = x; fb = fx; } else { a = x; fa = fx; }
      xOld = x;
      push({ a, b, fa, fb, x, fx }, keepLeft ? [7, 9] : [8, 9], `${keepLeft ? `b ← ${g6(x)}` : `a ← ${g6(x)}`}. New bracket [${g6(a)}, ${g6(b)}].` + (keepLeft ? "" : " Notice when the same end keeps moving while the other one is stuck: that is why false position can be slow."));
    }
    push({ a, b, fa, fb, done: true, x: xOld }, 10, `Reached N = ${N} iterations without meeting the tolerance. Best estimate ${g6(xOld)}.`);
    return { frames, xs, root: xOld };
  }

  function recNewton(x0, eps, N, isSqrt, D) {
    const frames = [], rows = [];
    let x = x0, evals = 0;
    const L = isSqrt ? { init: 2, step: [4, 5], stop: 6, ret: 7, flat: 5, lim: 7 } : { init: 1, step: [2, 4], stop: 5, ret: 5, flat: 3, lim: 7 };
    const push = (st, line, text, ask) => frames.push(Object.assign({ line, text, ask, rows: rows.slice(), c: { "iteration n": rows.length, "f & f′ evaluations": evals, "xₙ": g6(st.x), "|f(xₙ)|": g6(Math.abs(fv(st.x))) } }, st));
    push({ x, hist: [] }, L.init, isSqrt ? `Compute √${D} by Newton's method on f(x) = x² − ${D}: the update x − (x² − D)/(2x) simplifies to <b>½(x + D/x)</b>, the average of x and D/x. Start at x₀ = ${g6(x0)}.` : `Start at x₀ = ${g6(x0)}, f(x₀) = ${g6(fv(x0))}. Newton replaces the curve by its tangent line and jumps to where the tangent hits zero.`);
    const xs = [];
    const hist = [x];
    for (let n = 0; n < N; n++) {
      const r = F(x);
      evals += 2;
      if (!Number.isFinite(r.v) || !Number.isFinite(r.d)) {
        push({ x, hist: hist.slice(), done: true, bad: true }, L.lim, `f or f′ is undefined at x = ${g6(x)}; Newton's method cannot continue from here.`);
        return { frames, xs, root: null, fail: true };
      }
      if (r.d === 0) {
        push({ x, hist: hist.slice(), done: true, bad: true }, L.flat, `f′(${g6(x)}) = 0: the tangent is horizontal and never meets the axis. Newton's method breaks down; choose another x₀.`);
        return { frames, xs, root: null, fail: true };
      }
      const xn = x - r.v / r.d;
      const right = xn > x;
      push({ x, hist: hist.slice(), tangent: true }, L.step, `Iteration ${n + 1}: at x${sub(n)} = ${g6(x)}, f = ${g6(r.v)} and slope f′ = ${g6(r.d)}. Follow the tangent line down to the x-axis.`,
        { q: `Will the tangent at x${sub(n)} = ${g6(x)} hit the x-axis to the left or to the right of x${sub(n)}?`, opts: ["left", "right"], ans: right ? 1 : 0, why: `x${sub(n + 1)} = x${sub(n)} − f/f′ = ${g6(x)} − (${g6(r.v)})/(${g6(r.d)}) = ${g6(xn)}: f and f′ have ${r.v * r.d > 0 ? "the same sign, so the step goes left" : "opposite signs, so the step goes right"}.` });
      xs.push(xn);
      rows.push({ n, x, xn, fxn: fv(xn), step: Math.abs(xn - x) });
      hist.push(xn);
      const conv = Math.abs(xn - x) < eps;
      if (conv) {
        push({ x: xn, hist: hist.slice(), done: true, tanFrom: x }, L.stop, `x${sub(n + 1)} = <b>${g6(xn)}</b>. |x${sub(n + 1)} − x${sub(n)}| = ${g6(Math.abs(xn - x))} < ε = ${eps}: stop. f(x${sub(n + 1)}) = ${g6(fv(xn))}.` + (isSqrt ? ` (Math.sqrt gives ${g6(Math.sqrt(D))}.)` : ""));
        return { frames, xs, root: xn };
      }
      if (!Number.isFinite(xn) || Math.abs(xn) > 1e6) {
        push({ x: xn, hist: hist.slice(), done: true, bad: true }, L.lim, `x${sub(n + 1)} = ${g6(xn)}: the iterates are running off to infinity. Newton's method <b>diverges</b> from this starting point.`);
        return { frames, xs, root: null, fail: true };
      }
      push({ x: xn, hist: hist.slice(), tanFrom: x }, isSqrt ? 5 : 6, `x${sub(n + 1)} = ${g6(x)} − (${g6(r.v)})/(${g6(r.d)}) = <b>${g6(xn)}</b>` + (rows.length >= 3 && Math.abs(xn - rows[rows.length - 3].xn) < 1e-9 && Math.abs(xn - x) > eps ? ". We have been here before: the iterates are <b>cycling</b>, so Newton will never converge from this x₀." : `. Step size ${g6(Math.abs(xn - x))} is still ≥ ε, so continue.`));
      x = xn;
    }
    const drift = Math.abs(x) > 10 * (1 + Math.abs(x0));
    push({ x, hist: hist.slice(), done: true, bad: true }, L.lim, `Reached N = ${N} iterations without the steps getting smaller than ε. No convergence from x₀ = ${g6(x0)}.` + (drift ? ` The iterates keep drifting away (now x = ${g6(x)}, where f is almost flat): Newton's method <b>diverges</b> here.` : ""));
    return { frames, xs, root: null, fail: true };
  }

  /* ================================================================== plot */
  const PW = 800, PH = 440, M = { l: 54, r: 16, t: 16, b: 34 };
  function viewFor(R) {
    let xs = [];
    if (method === "bis" || method === "fp") xs = [num("a", 0), num("b", 1)];
    else xs = [num("x0", 1)].concat(R.xs.slice(0, 3).filter((v) => Number.isFinite(v) && Math.abs(v) < 1e4));
    if (R.root != null && Number.isFinite(R.root)) xs.push(R.root);
    let lo = Math.min(...xs), hi = Math.max(...xs);
    if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
    const pad = (hi - lo) * 0.18;
    lo -= pad; hi += pad;
    const ys = [];
    for (let k = 0; k <= 300; k++) { const y = fv(lo + ((hi - lo) * k) / 300); if (Number.isFinite(y)) ys.push(y); }
    ys.sort((p, q) => p - q);
    let ylo = ys.length ? ys[Math.floor(ys.length * 0.02)] : -1, yhi = ys.length ? ys[Math.ceil(ys.length * 0.98) - 1] : 1;
    ylo = Math.min(ylo, 0); yhi = Math.max(yhi, 0);
    if (yhi - ylo < 1e-9) { ylo -= 1; yhi += 1; }
    const yp = (yhi - ylo) * 0.1;
    return { lo, hi, ylo: ylo - yp, yhi: yhi + yp };
  }
  function niceTicks(lo, hi, count) {
    const span = hi - lo, raw = span / count, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => span / s <= count) || 10 * mag;
    const out = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-12; v += step) out.push(+v.toFixed(10));
    return out;
  }
  function drawPlot(f) {
    const V = rec.view;
    const X = (x) => M.l + ((x - V.lo) / (V.hi - V.lo)) * (PW - M.l - M.r);
    const Y = (y) => M.t + ((V.yhi - y) / (V.yhi - V.ylo)) * (PH - M.t - M.b);
    const clampY = (y) => Math.max(M.t - 40, Math.min(PH - M.b + 40, y));
    stage.setAttribute("viewBox", `0 0 ${PW} ${PH}`);
    stage.innerHTML = "";
    const defs = S("defs", null, S("clipPath", { id: "plotclip" }, S("rect", { x: M.l, y: M.t, width: PW - M.l - M.r, height: PH - M.t - M.b })));
    stage.appendChild(defs);
    niceTicks(V.lo, V.hi, 8).forEach((t) => {
      stage.appendChild(S("line", { x1: X(t), y1: M.t, x2: X(t), y2: PH - M.b, stroke: "var(--line)", "stroke-width": 1 }));
      stage.appendChild(S("text", { x: X(t), y: PH - M.b + 18, "text-anchor": "middle", "font-size": 12, fill: "var(--muted)" }, String(t)));
    });
    niceTicks(V.ylo, V.yhi, 6).forEach((t) => {
      stage.appendChild(S("line", { x1: M.l, y1: Y(t), x2: PW - M.r, y2: Y(t), stroke: "var(--line)", "stroke-width": 1 }));
      stage.appendChild(S("text", { x: M.l - 6, y: Y(t) + 4, "text-anchor": "end", "font-size": 12, fill: "var(--muted)" }, String(t)));
    });
    const g = S("g", { "clip-path": "url(#plotclip)" });
    stage.appendChild(g);
    if (V.ylo < 0 && V.yhi > 0) g.appendChild(S("line", { x1: M.l, y1: Y(0), x2: PW - M.r, y2: Y(0), stroke: "var(--ink-2)", "stroke-width": 1.5 }));
    // bracket
    if (f.a != null && f.b != null && (method === "bis" || method === "fp")) {
      g.appendChild(S("rect", { x: X(f.a), y: M.t, width: Math.max(1, X(f.b) - X(f.a)), height: PH - M.t - M.b, fill: "var(--steel-soft)" }));
      [[f.a, f.fa], [f.b, f.fb]].forEach(([x, y]) => {
        if (y == null) return;
        g.appendChild(S("line", { x1: X(x), y1: M.t, x2: X(x), y2: PH - M.b, stroke: "var(--c-active)", "stroke-width": 2 }));
        g.appendChild(S("circle", { cx: X(x), cy: clampY(Y(y)), r: 6, fill: y < 0 ? "var(--c-swap)" : "var(--c-done)", stroke: "var(--panel)", "stroke-width": 2 }));
      });
    }
    // curve
    let d = "", pen = false;
    for (let k = 0; k <= 600; k++) {
      const x = V.lo + ((V.hi - V.lo) * k) / 600, y = fv(x);
      if (!Number.isFinite(y) || Math.abs(Y(y)) > 5000) { pen = false; continue; }
      d += (pen ? "L" : "M") + X(x).toFixed(1) + " " + Y(y).toFixed(1);
      pen = true;
    }
    g.appendChild(S("path", { d, fill: "none", stroke: "var(--ink)", "stroke-width": 2.2 }));
    // chord
    if (f.chord) g.appendChild(S("line", { x1: X(f.a), y1: Y(f.fa), x2: X(f.b), y2: Y(f.fb), stroke: "var(--c-compare)", "stroke-width": 2.5 }));
    // newton history + tangent
    if (f.hist) f.hist.forEach((hx, k) => {
      if (!Number.isFinite(hx)) return;
      g.appendChild(S("circle", { cx: X(hx), cy: Y(0), r: 4.5, fill: "var(--c-pivot)" }));
      if (f.hist.length <= 8 || k === f.hist.length - 1) g.appendChild(S("text", { x: X(hx), y: Y(0) + 18 + (k % 2) * 12, "text-anchor": "middle", "font-size": 11, fill: "var(--c-pivot)" }, "x" + sub(k)));
    });
    const tanAt = f.tangent ? f.x : f.tanFrom;
    if (tanAt != null && Number.isFinite(tanAt)) {
      const r = F(tanAt);
      if (Number.isFinite(r.v) && Number.isFinite(r.d)) {
        const x1 = V.lo, x2 = V.hi;
        g.appendChild(S("line", { x1: X(x1), y1: Y(r.v + r.d * (x1 - tanAt)), x2: X(x2), y2: Y(r.v + r.d * (x2 - tanAt)), stroke: "var(--c-compare)", "stroke-width": 2.5, opacity: f.tangent ? 1 : 0.5 }));
        g.appendChild(S("line", { x1: X(tanAt), y1: Y(0), x2: X(tanAt), y2: Y(r.v), stroke: "var(--c-compare)", "stroke-dasharray": "4 4", "stroke-width": 1.5 }));
        g.appendChild(S("circle", { cx: X(tanAt), cy: Y(r.v), r: 5, fill: "var(--c-compare)" }));
      }
    }
    // current approximation
    if (f.x != null && Number.isFinite(f.x) && (method === "bis" || method === "fp")) {
      const fx = fv(f.x);
      g.appendChild(S("line", { x1: X(f.x), y1: Y(0), x2: X(f.x), y2: Y(fx), stroke: "var(--c-compare)", "stroke-dasharray": "4 4", "stroke-width": 1.5 }));
      g.appendChild(S("circle", { cx: X(f.x), cy: Y(0), r: 6, fill: f.done ? "var(--c-done)" : "var(--c-compare)", stroke: "var(--panel)", "stroke-width": 2 }));
    }
    if (f.done && !f.bad && f.x != null && Number.isFinite(f.x)) {
      g.appendChild(S("circle", { cx: X(f.x), cy: Y(0), r: 9, fill: "none", stroke: "var(--c-done)", "stroke-width": 3 }));
      g.appendChild(S("text", { x: X(f.x), y: Y(0) - 14, "text-anchor": "middle", "font-size": 13, "font-weight": 700, fill: "var(--c-done)" }, "x ≈ " + g6(f.x)));
    }
    stage.appendChild(S("text", { x: M.l + 6, y: M.t + 16, "font-size": 13, fill: "var(--ink-2)" }, "f(x) = " + rec.src));
    stage.appendChild(S("rect", { x: M.l, y: M.t, width: PW - M.l - M.r, height: PH - M.t - M.b, fill: "none", stroke: "var(--line-2)" }));
  }

  /* ================================================================== iterates table */
  function drawTable(f) {
    const t = $("tbl");
    t.innerHTML = "";
    const rows = f.rows;
    if (method === "bis" || method === "fp") {
      t.appendChild(E("tr", null, ["n", "aₙ", "bₙ", "xₙ", "f(xₙ)", method === "bis" ? "(b₁−a₁)/2ⁿ" : "|xₙ − xₙ₋₁|"].map((h) => E("th", null, h))));
      rows.forEach((r, k) => t.appendChild(E("tr", { class: k === rows.length - 1 ? "cur" : "" },
        E("td", null, String(r.n)), E("td", null, g6(r.a) + r.sa), E("td", null, g6(r.b) + r.sb), E("td", null, g6(r.x)),
        E("td", { class: r.fx < 0 ? "neg" : "pos" }, g6(r.fx)), E("td", null, g6(r.err)))));
    } else {
      t.appendChild(E("tr", null, ["n", "xₙ", "xₙ₊₁", "f(xₙ₊₁)", "|xₙ₊₁ − xₙ|"].concat(method === "sqrt" ? ["correct digits"] : []).map((h) => E("th", null, h))));
      const D = num("D", 2);
      rows.forEach((r, k) => t.appendChild(E("tr", { class: k === rows.length - 1 ? "cur" : "" },
        E("td", null, String(r.n)), E("td", null, g6(r.x)), E("td", null, g6(r.xn)), E("td", { class: r.fxn < 0 ? "neg" : "pos" }, g6(r.fxn)), E("td", null, g6(r.step)),
        method === "sqrt" ? E("td", null, String(Math.max(0, Math.min(16, Math.floor(-Math.log10(Math.abs(r.xn - Math.sqrt(D)) / Math.sqrt(D) + 1e-17)))))) : null)));
    }
    if (!rows.length) t.appendChild(E("tr", null, E("td", { colspan: 6, style: { textAlign: "left" } }, "No iterations yet.")));
  }

  /* ================================================================== convergence race */
  const RACE = [["bis", "Bisection", "var(--c-active)"], ["fp", "False position", "var(--c-pivot)"], ["newt", "Newton", "var(--ember)"]];
  function drawRace() {
    const key = $("convKey"), out = $("convOut"), note = $("convNote");
    key.innerHTML = ""; out.innerHTML = "";
    const a = num("a", 0), b = num("b", 1), x0 = num("x0", 1);
    const K = 25;
    // reference root: tight bisection if bracket is valid, else a long Newton run
    let ref = null;
    if (fv(a) * fv(b) < 0) {
      let lo = a, hi = b, flo = fv(a);
      for (let k = 0; k < 200; k++) { const m = (lo + hi) / 2, fm = fv(m); if (fm === 0) { lo = hi = m; break; } if (fm * flo < 0) hi = m; else { lo = m; flo = fm; } }
      ref = (lo + hi) / 2;
    } else if (method === "sqrt") ref = Math.sqrt(num("D", 2));
    if (ref == null) { note.textContent = "The race needs a bracket [a, b] with a sign change (to know the true root x*). Set a and b around a root."; return; }
    const series = [];
    const bisSeq = (() => { const r = []; let lo = a, hi = b, flo = fv(a); for (let n = 0; n < K; n++) { const m = (lo + hi) / 2; r.push(m); const fm = fv(m); if (fm * flo < 0) hi = m; else { lo = m; flo = fm; } } return r; })();
    const fpSeq = (() => { const r = []; let lo = a, hi = b, fl = fv(a), fh = fv(b); for (let n = 0; n < K; n++) { const m = (lo * fh - hi * fl) / (fh - fl); r.push(m); const fm = fv(m); if (fm === 0) { lo = hi = m; } else if (fm * fl < 0) { hi = m; fh = fm; } else { lo = m; fl = fm; } } return r; })();
    const newtSeq = (() => { const r = []; let x = method === "bis" || method === "fp" ? b : x0; for (let n = 0; n < K; n++) { const q = F(x); if (!q.d || !Number.isFinite(q.v)) break; x = x - q.v / q.d; if (!Number.isFinite(x)) break; r.push(x); } return r; })();
    series.push(bisSeq, fpSeq, newtSeq);
    const errs = series.map((s) => s.map((x) => Math.max(1e-16, Math.abs(x - ref))));
    const W = 640, H = 250, m = { l: 56, r: 110, t: 12, b: 30 };
    const X = (n) => m.l + ((n - 1) / (K - 1)) * (W - m.l - m.r);
    const lgMax = Math.ceil(Math.max(0, ...errs.flat().map((e) => Math.log10(e))));
    const lgMin = -16;
    const Y = (e) => m.t + ((lgMax - Math.log10(e)) / (lgMax - lgMin)) * (H - m.t - m.b);
    const svg = S("svg", { viewBox: `0 0 ${W} ${H}`, style: "width:100%;display:block", role: "img", "aria-label": "Error versus iteration for the three methods" });
    for (let p = lgMax; p >= lgMin; p -= 4) {
      svg.appendChild(S("line", { x1: m.l, y1: Y(Math.pow(10, p)), x2: W - m.r, y2: Y(Math.pow(10, p)), stroke: "var(--line)" }));
      svg.appendChild(S("text", { x: m.l - 6, y: Y(Math.pow(10, p)) + 4, "text-anchor": "end", "font-size": 11, fill: "var(--muted)", "font-family": "var(--mono)" }, "1e" + p));
    }
    [1, 5, 10, 15, 20, 25].forEach((n) => svg.appendChild(S("text", { x: X(n), y: H - 10, "text-anchor": "middle", "font-size": 11, fill: "var(--muted)", "font-family": "var(--mono)" }, String(n))));
    svg.appendChild(S("text", { x: W - m.r, y: H - 10, "text-anchor": "start", "font-size": 11, fill: "var(--muted)" }, "  n"));
    errs.forEach((es, k) => {
      if (!es.length) return;
      const [, name, col] = RACE[k];
      svg.appendChild(S("path", { d: es.map((e, i) => (i ? "L" : "M") + X(i + 1).toFixed(1) + " " + Y(e).toFixed(1)).join(""), fill: "none", stroke: col, "stroke-width": 2, "stroke-linejoin": "round" }));
      es.forEach((e, i) => svg.appendChild(S("circle", { cx: X(i + 1), cy: Y(e), r: 3, fill: col })));
      const last = es.length - 1;
      svg.appendChild(S("text", { x: Math.min(W - m.r + 6, X(last + 1) + 6), y: Y(es[last]) + 4 + (k - 1) * 11, "font-size": 11, fill: "var(--ink-2)" }, name));
    });
    const guide = S("line", { x1: 0, y1: m.t, x2: 0, y2: H - m.b, stroke: "var(--muted)", "stroke-dasharray": "3 3", visibility: "hidden" });
    svg.appendChild(guide);
    const tip = E("div", { class: "tip", hidden: true });
    const hit = S("rect", { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: "transparent" });
    hit.addEventListener("mousemove", (ev) => {
      const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      const n = Math.max(1, Math.min(K, Math.round(1 + ((p.x - m.l) / (W - m.l - m.r)) * (K - 1))));
      guide.setAttribute("x1", X(n)); guide.setAttribute("x2", X(n)); guide.setAttribute("visibility", "visible");
      tip.hidden = false;
      tip.innerHTML = `<b>n = ${n}</b><br>` + RACE.map(([, name], k) => `${name}: ${errs[k][n - 1] != null ? errs[k][n - 1].toExponential(2) : "—"}`).join("<br>");
      const bx = out.getBoundingClientRect();
      tip.style.left = Math.min(ev.clientX - bx.left + 14, bx.width - 190) + "px";
      tip.style.top = ev.clientY - bx.top + 10 + "px";
    });
    hit.addEventListener("mouseleave", () => { tip.hidden = true; guide.setAttribute("visibility", "hidden"); });
    svg.appendChild(hit);
    RACE.forEach(([, name, col]) => key.appendChild(E("span", { class: "key" }, E("i", { style: { background: col } }), name)));
    out.style.position = "relative";
    out.appendChild(svg);
    out.appendChild(tip);
    note.textContent = `x* ≈ ${ref.toPrecision(15)} (bisection run to machine precision). Bisection and false position start from [${g6(a)}, ${g6(b)}]; Newton from ${method === "bis" || method === "fp" ? "b = " + g6(b) : "x₀ = " + g6(x0)}. 25 iterations each, ignoring ε; errors below 1e−16 are at machine precision.`;
  }

  /* ================================================================== predict */
  function showAsk(f, i) {
    const box = $("ask");
    if (!f.ask || !$("predict").checked) { box.hidden = true; box.innerHTML = ""; return; }
    const a = f.ask, key = method + ":" + i, got = answered[key];
    box.hidden = false;
    box.innerHTML = "";
    box.appendChild(E("div", { class: "panel-title" }, "🤔 Predict before you step"));
    box.appendChild(E("p", { html: a.q }));
    const row = E("div", { class: "row" });
    a.opts.forEach((o, k) => {
      const cls = got == null ? "btn sm" : k === a.ans ? "btn sm pick-ok" : k === got ? "btn sm pick-bad" : "btn sm";
      row.appendChild(E("button", { class: cls, disabled: got != null, onclick: () => { answered[key] = k; showAsk(f, i); } }, o));
    });
    box.appendChild(row);
    if (got == null) { if (player) player.pause(); return; }
    box.appendChild(E("div", { class: "callout fb " + (got === a.ans ? "ok" : "bad"), html: (got === a.ans ? "<b>✔ Right.</b> " : `<b>✘ Not quite: it's “${a.opts[a.ans]}”.</b> `) + a.why }));
    box.appendChild(E("div", { class: "row", style: { marginTop: "8px" } }, E("button", { class: "btn primary sm", onclick: () => player.go(i + 1) }, "Show me ▶|")));
  }

  /* ================================================================== wiring */
  function render(f, i) {
    drawPlot(f);
    drawTable(f);
    code.highlight(f.line);
    ctr.set(f.c);
    say.say(f.text);
    showAsk(f, i);
  }
  player = Forge.player($("player"), { frames: [], render, fps: 2 });

  function setupGroups() {
    const br = method === "bis" || method === "fp";
    $("g-br").hidden = !br;
    $("g-x0").hidden = br;
    $("g-D").hidden = method !== "sqrt";
    $("fx").disabled = method === "sqrt";
  }
  function run() {
    Object.keys(answered).forEach((k) => delete answered[k]);
    setupGroups();
    if (method === "sqrt") {
      const D = Math.max(0, num("D", 2));
      $("fx").value = `x^2 - ${D}`;
    }
    const src = $("fx").value.trim();
    try {
      F = parse(src);
      const probe = F(0.5);
      if (typeof probe.v !== "number") throw new Error("not a number");
      $("fx").classList.remove("bad");
      $("fxmsg").innerHTML = "Allowed: numbers, x, + − * / ^, parentheses, sin, cos, exp, ln, sqrt, pi, e. Example: <code>exp(-x) - x</code>, <code>x^3 - 2*x - 5</code>.";
    } catch (err) {
      $("fx").classList.add("bad");
      $("fxmsg").innerHTML = `<b style="color:var(--bad)">Can't read that formula: ${String(err.message).replace(/</g, "&lt;")}.</b> Allowed: numbers, x, + − * / ^, ( ), sin, cos, exp, ln, sqrt, pi, e.`;
      return;
    }
    const eps = Math.max(1e-15, num("eps", 0.01)), N = Math.max(1, Math.min(60, Math.round(num("N", 30))));
    let a = num("a", 0), b = num("b", 1);
    if (a > b) { [a, b] = [b, a]; $("a").value = a; $("b").value = b; }
    $("code").innerHTML = "";
    $("ctr").innerHTML = "";
    code = Forge.code($("code"), CODE[method]);
    let R;
    if (method === "bis") R = recBis(a, b, eps, N);
    else if (method === "fp") R = recFP(a, b, eps, N);
    else R = recNewton(num("x0", 1), eps, N, method === "sqrt", num("D", 2));
    R.src = src;
    rec = R;
    rec.view = viewFor(R);
    ctr = Forge.counters($("ctr"), R.frames[0].c);
    player.load(R.frames);
    drawRace();
  }
  $("method").onchange = () => {
    method = $("method").value;
    if (method === "sqrt") { $("x0").value = 1; $("eps").value = 0.000001; }
    else if ($("fx").disabled) { $("fx").value = PRESETS.book.f; $("x0").value = 2; }
    run();
  };
  $("preset").onchange = () => {
    const p = PRESETS[$("preset").value];
    $("fx").value = p.f; $("a").value = p.a; $("b").value = p.b; $("x0").value = p.x0;
    if (p.method) { $("method").value = p.method; method = p.method; }
    else if (method === "sqrt") { $("method").value = "bis"; method = "bis"; }
    run();
  };
  $("go").onclick = run;
  ["fx", "a", "b", "x0", "D", "eps", "N"].forEach((id) => $(id).addEventListener("keydown", (e) => { if (e.key === "Enter") run(); }));
  ["a", "b", "x0", "D", "eps", "N"].forEach((id) => $(id).addEventListener("change", run));
  $("predict").onchange = () => { if (player.frames.length) render(player.frames[player.index], player.index); };
  run();
})();
