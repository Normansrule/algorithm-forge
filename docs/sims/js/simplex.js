/* Algorithm Forge — Simplex method simulation (Levitin §10.1).
   Engine (exact fractions, two-phase simplex, geometry) is pure and exported for Node tests;
   the UI part runs only in the browser. */
(function () {
  "use strict";

  /* ---------------- exact fractions ---------------- */
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a || 1; }
  class Fr {
    constructor(n, d) { d = d == null ? 1 : d; if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); this.n = n / g; this.d = d / g; if (this.n === 0) this.d = 1; }
    add(o) { return new Fr(this.n * o.d + o.n * this.d, this.d * o.d); }
    sub(o) { return new Fr(this.n * o.d - o.n * this.d, this.d * o.d); }
    mul(o) { return new Fr(this.n * o.n, this.d * o.d); }
    div(o) { return new Fr(this.n * o.d, this.d * o.n); }
    neg() { return new Fr(-this.n, this.d); }
    sign() { return Math.sign(this.n); }
    isZero() { return this.n === 0; }
    val() { return this.n / this.d; }
    cmp(o) { return Math.sign(this.n * o.d - o.n * this.d); }
    toString() { const a = Math.abs(this.n), s = this.n < 0 ? "−" : ""; return this.d === 1 ? s + a : s + a + "/" + this.d; }
  }
  Fr.of = function (s) {
    if (s instanceof Fr) return s;
    if (typeof s === "number") s = String(s);
    s = String(s).trim().replace(/−/g, "-");
    if (s === "" || s === "+") return new Fr(1);
    if (s === "-") return new Fr(-1);
    const m = s.match(/^([+-]?)(\d+(?:\.\d+)?)(?:\/(\d+(?:\.\d+)?))?$/);
    if (!m) throw new Error("not a number: " + s);
    const dec = (t) => { const [i, f = ""] = t.split("."); return new Fr(parseInt(i + f, 10), Math.pow(10, f.length)); };
    let v = dec(m[2]);
    if (m[3]) v = v.div(dec(m[3]));
    if (v.d === 0 || !isFinite(v.n)) throw new Error("bad number: " + s);
    return m[1] === "-" ? v.neg() : v;
  };
  const ZERO = new Fr(0), ONE = new Fr(1);

  /* ---------------- parsing ---------------- */
  function parseLinear(expr) {
    const s = expr.replace(/\s+/g, "").replace(/−/g, "-").replace(/\*/g, "");
    if (!s) throw new Error("empty expression");
    const re = /([+-]?)(\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?)?([xy])/gy;
    const a = [ZERO, ZERO];
    let pos = 0, m;
    while (pos < s.length) {
      re.lastIndex = pos;
      m = re.exec(s);
      if (!m || m[0] === "") throw new Error(`can't read "${expr}" — write terms like 2x, −y, 3/2y`);
      let c = m[2] ? Fr.of(m[2]) : ONE;
      if (m[1] === "-") c = c.neg();
      const k = m[3] === "x" ? 0 : 1;
      a[k] = a[k].add(c);
      pos = re.lastIndex;
    }
    return a;
  }
  function parseConstraint(line) {
    const s = line.replace(/≤|=</g, "<=").replace(/≥|=>/g, ">=").replace(/−/g, "-");
    const m = s.match(/^(.*?)(<=|>=|<|>|=)(.*)$/);
    if (!m) throw new Error(`"${line}" needs ≤, ≥ or =`);
    const op = m[2] === "<" ? "<=" : m[2] === ">" ? ">=" : m[2];
    const a = parseLinear(m[1]);
    const b = Fr.of(m[3].replace(/\s+/g, ""));
    return { a, op, b, text: line.trim() };
  }

  /* ---------------- geometry (floats) ---------------- */
  const EPS = 1e-9;
  function satisfies(con, x, y, tol) {
    tol = tol == null ? 1e-7 : tol;
    const v = con.a[0].val() * x + con.a[1].val() * y, b = con.b.val();
    if (con.op === "<=") return v <= b + tol;
    if (con.op === ">=") return v >= b - tol;
    return Math.abs(v - b) <= tol;
  }
  function clip(poly, a1, a2, b) { // keep a1 x + a2 y <= b
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const P = poly[i], Q = poly[(i + 1) % poly.length];
      const fp = a1 * P[0] + a2 * P[1] - b, fq = a1 * Q[0] + a2 * Q[1] - b;
      if (fp <= EPS) out.push(P);
      if ((fp < -EPS && fq > EPS) || (fp > EPS && fq < -EPS)) {
        const t = fp / (fp - fq);
        out.push([P[0] + t * (Q[0] - P[0]), P[1] + t * (Q[1] - P[1])]);
      }
    }
    // dedupe
    return out.filter((p, i) => { const q = out[(i + 1) % out.length]; return out.length < 2 || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-9; });
  }
  function geometry(prob) {
    const cons = prob.cons;
    // candidate points: pairwise intersections of constraint lines and the axes
    const lines = cons.map((c) => [c.a[0].val(), c.a[1].val(), c.b.val()]).concat([[1, 0, 0], [0, 1, 0]]);
    let span = 1;
    const cand = [];
    for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++) {
      const [a, b, c] = lines[i], [d, e, f] = lines[j];
      const det = a * e - b * d;
      if (Math.abs(det) < EPS) continue;
      const x = (c * e - b * f) / det, y = (a * f - c * d) / det;
      if (x >= -1e-9 && y >= -1e-9) { cand.push([x, y]); span = Math.max(span, x, y); }
    }
    cons.forEach((c) => { const b = c.b.val(); if (c.a[0].val() > EPS) span = Math.max(span, b / c.a[0].val()); if (c.a[1].val() > EPS) span = Math.max(span, b / c.a[1].val()); });
    const BIG = span * 1.6 + 1;
    let poly = [[0, 0], [BIG, 0], [BIG, BIG], [0, BIG]];
    for (const c of cons) {
      const a1 = c.a[0].val(), a2 = c.a[1].val(), b = c.b.val();
      if (c.op === "<=" || c.op === "=") poly = clip(poly, a1, a2, b);
      if (c.op === ">=" || c.op === "=") poly = clip(poly, -a1, -a2, -b);
      if (!poly.length) break;
    }
    const onBox = (p) => Math.abs(p[0] - BIG) < 1e-7 || Math.abs(p[1] - BIG) < 1e-7;
    const feasible = poly.length > 0;
    const unboundedRegion = feasible && poly.some(onBox);
    // extreme points: polygon vertices not on the artificial box
    let ext = poly.filter((p) => !onBox(p)).map((p) => [Math.abs(p[0]) < 1e-9 ? 0 : p[0], Math.abs(p[1]) < 1e-9 ? 0 : p[1]]);
    // order: keep the polygon's counterclockwise order; start at the origin (or the lowest, then leftmost, corner)
    if (ext.length) {
      let k = ext.findIndex((p) => p[0] === 0 && p[1] === 0);
      if (k < 0) { k = 0; ext.forEach((p, i) => { if (p[1] < ext[k][1] - 1e-9 || (Math.abs(p[1] - ext[k][1]) < 1e-9 && p[0] < ext[k][0])) k = i; }); }
      ext = ext.slice(k).concat(ext.slice(0, k));
    }
    const letters = "ABCDEFGHIJKLMN";
    let li = 0;
    const extreme = ext.map((p) => ({ x: p[0], y: p[1], name: p[0] === 0 && p[1] === 0 ? "O" : letters[li++] }));
    const maxc = Math.max(1, ...extreme.map((p) => Math.max(p.x, p.y)), feasible ? 0 : span);
    const view = unboundedRegion ? Math.max(4, maxc * 1.8) : maxc * 1.18;
    return { poly, feasible, unboundedRegion, extreme, BIG, view, span };
  }

  /* ---------------- two-phase simplex, recorded as frames ---------------- */
  const SLACK = ["u", "v", "w", "p", "q", "r", "s", "t"];
  const SUB = "₀₁₂₃₄₅₆₇₈₉";
  const sub = (k) => String(k).split("").map((d) => SUB[+d]).join("");

  function solve(prob) {
    const frames = [];
    const geo = geometry(prob);
    // normalise so every right-hand side is >= 0
    const cons = prob.cons.map((c) => {
      if (c.b.sign() < 0) return { a: [c.a[0].neg(), c.a[1].neg()], b: c.b.neg(), op: c.op === "<=" ? ">=" : c.op === ">=" ? "<=" : "=", text: c.text, flipped: true };
      return Object.assign({}, c, { flipped: false });
    });
    const m = cons.length;
    const cols = [{ name: "x", kind: "dec" }, { name: "y", kind: "dec" }];
    const colOf = [];
    cons.forEach((c, i) => {
      if (c.op === "<=") { colOf[i] = { s: cols.length }; cols.push({ name: SLACK[i], kind: "slack", row: i }); }
      else if (c.op === ">=") { colOf[i] = { s: cols.length }; cols.push({ name: SLACK[i], kind: "surplus", row: i }); }
      else colOf[i] = {};
    });
    cons.forEach((c, i) => { if (c.op !== "<=") { colOf[i].a = cols.length; cols.push({ name: "a" + sub(i + 1), kind: "art", row: i }); } });
    const n = cols.length;
    let T = cons.map((c, i) => {
      const row = Array.from({ length: n + 1 }, () => ZERO);
      row[0] = c.a[0]; row[1] = c.a[1];
      if (colOf[i].s != null) row[colOf[i].s] = c.op === "<=" ? ONE : ONE.neg();
      if (colOf[i].a != null) row[colOf[i].a] = ONE;
      row[n] = c.b;
      return row;
    });
    let basis = cons.map((c, i) => (c.op === "<=" ? colOf[i].s : colOf[i].a));
    let active = cols.map(() => true); // artificial columns get dropped after Phase I
    const hasArt = cols.some((c) => c.kind === "art");
    const cvec = prob.sense === "max" ? prob.c : [prob.c[0].neg(), prob.c[1].neg()];
    const ctr = { pivots: 0, ratios: 0, corners: 1 };
    const path = [];
    let phase = hasArt ? 1 : 2;

    function point() {
      let x = ZERO, y = ZERO;
      basis.forEach((b, r) => { if (b === 0) x = T[r][n]; if (b === 1) y = T[r][n]; });
      return { x: x.val(), y: y.val(), xs: x.toString(), ys: y.toString() };
    }
    function cornerName(p) {
      const e = geo.extreme.find((q) => Math.abs(q.x - p.x) < 1e-7 && Math.abs(q.y - p.y) < 1e-7);
      return e ? e.name : null;
    }
    function bfsText() {
      const vals = cols.map((c, j) => (active[j] ? (basis.indexOf(j) >= 0 ? T[basis.indexOf(j)][n] : ZERO).toString() : null)).filter((v) => v != null);
      const names = cols.filter((c, j) => active[j]).map((c) => c.name);
      return `(${names.join(", ")}) = (${vals.join(", ")})`;
    }
    function snap(obj, extra) {
      const p = point();
      const f = Object.assign({
        cols: cols.map((c, j) => (active[j] ? c.name : null)),
        kinds: cols.map((c) => c.kind),
        T: T.map((r) => r.map((v) => v.toString())),
        obj: obj ? obj.map((v) => v.toString()) : null,
        objNeg: obj ? obj.map((v, j) => j < n && v.sign() < 0) : [],
        basis: basis.map((b) => cols[b].name),
        phase, point: p, feasible: prob.cons.every((c) => satisfies(c, p.x, p.y)),
        path: path.slice(), ctr: Object.assign({}, ctr),
        zLabel: phase === 1 ? "W" : "z",
      }, extra);
      frames.push(f);
      return f;
    }
    function pivot(obj, pr, pc) {
      const pe = T[pr][pc];
      T[pr] = T[pr].map((v) => v.div(pe));
      const ops = [`new ${cols[pc].name}-row = ${cols[basis[pr]].name}-row ÷ ${pe}`];
      for (let r = 0; r < T.length; r++) {
        if (r === pr) continue;
        const f = T[r][pc];
        if (f.isZero()) continue;
        T[r] = T[r].map((v, j) => v.sub(f.mul(T[pr][j])));
        ops.push(`${cols[basis[r]].name}-row ${f.sign() > 0 ? "−" : "+"} ${absFr(f)}·(new ${cols[pc].name}-row)`);
      }
      const f = obj[pc];
      if (!f.isZero()) {
        for (let j = 0; j <= n; j++) obj[j] = obj[j].sub(f.mul(T[pr][j]));
        ops.push(`${phase === 1 ? "W" : "z"}-row ${f.sign() > 0 ? "−" : "+"} ${absFr(f)}·(new ${cols[pc].name}-row)`);
      }
      basis[pr] = pc;
      ctr.pivots++;
      return ops;
    }
    const absFr = (f) => (f.sign() < 0 ? f.neg() : f).toString();

    function loop(obj) {
      const seen = new Set();
      let bland = false;
      for (let it = 0; it < 40; it++) {
        const key = basis.join(",");
        if (seen.has(key) && !bland) bland = true;
        seen.add(key);
        const p = point();
        if (!path.length || path[path.length - 1].x !== p.x || path[path.length - 1].y !== p.y) path.push({ x: p.x, y: p.y });
        const zval = obj[n];
        const negs = [];
        for (let j = 0; j < n; j++) if (active[j] && obj[j].sign() < 0) negs.push(j);
        const cn = cornerName(p);
        const where = cn ? `corner ${cn}` : phase === 1 && !prob.cons.every((c) => satisfies(c, p.x, p.y)) ? "a point outside the feasible region" : `(${p.xs}, ${p.ys})`;
        if (!negs.length) {
          snap(obj, { line: [6, 7], kind: "optimal-test", text: `Optimality test: every entry of the ${phase === 1 ? "W" : "objective"}-row is ≥ 0, so no variable can raise ${phase === 1 ? "W" : "z"} any further. Current basic solution ${bfsText()}, at ${where}.` });
          return "optimal";
        }
        // choose entering column
        let pc = negs[0];
        if (bland) pc = negs[0];
        else negs.forEach((j) => { if (obj[j].cmp(obj[pc]) < 0) pc = j; });
        const negList = negs.map((j) => `${cols[j].name} (${obj[j]})`).join(", ");
        const askEnter = negs.length >= 2 && !bland ? {
          q: "Which variable enters the basis next?",
          options: negs.map((j) => cols[j].name), answer: cols[pc].name,
          explain: `Most negative objective-row entry: ${obj[pc]} under ${cols[pc].name}. Raising ${cols[pc].name} improves ${phase === 1 ? "W" : "z"} fastest per unit.`,
        } : null;
        snap(obj, { line: [6, 7], kind: "test", ask: askEnter, text: `Tableau for the basic ${phase === 1 ? "" : "feasible "}solution ${bfsText()} at ${where}; ${phase === 1 ? "W" : "z"} = ${zval}. Optimality test: the ${phase === 1 ? "W" : "objective"}-row still has negative entries — ${negList} — so we can do better.` });
        snap(obj, { line: 9, kind: "enter", pc, text: bland
          ? `This basis was seen before (degenerate cycling risk), so we switch to Bland's rule: the leftmost negative column, <b>${cols[pc].name}</b>, enters.`
          : `Entering variable: <b>${cols[pc].name}</b>, the column with the most negative entry (${obj[pc]}). Each unit of ${cols[pc].name} adds ${obj[pc].neg()} to ${phase === 1 ? "W" : "z"}.` });
        const rows = [];
        for (let r = 0; r < T.length; r++) if (T[r][pc].sign() > 0) rows.push(r);
        if (!rows.length) {
          snap(obj, { line: [10, 11], kind: "unbounded", pc, text: `No entry in the ${cols[pc].name}-column is positive, so raising ${cols[pc].name} never drives any basic variable to 0. ${cols[pc].name} can grow forever and so can ${phase === 1 ? "W" : "z"}: the LP is <b>unbounded</b>.` });
          return "unbounded";
        }
        const theta = T.map((row, r) => (rows.includes(r) ? row[n].div(row[pc]) : null));
        ctr.ratios += rows.length;
        let pr = rows[0];
        rows.forEach((r) => { const c = theta[r].cmp(theta[pr]); if (c < 0 || (c === 0 && bland && basis[r] < basis[pr])) pr = r; });
        const thetaStr = theta.map((t) => (t ? t.toString() : null));
        const askLeave = rows.length >= 2 ? {
          q: `θ-ratios are computed. Which basic variable departs?`,
          options: rows.map((r) => cols[basis[r]].name), answer: cols[basis[pr]].name,
          explain: `Smallest θ = ${theta[pr]} in the ${cols[basis[pr]].name}-row: it is the first basic variable to hit 0 as ${cols[pc].name} grows.`,
        } : null;
        snap(obj, { line: [12, 13], kind: "theta", pc, theta: thetaStr, ask: askLeave, text: `θ-ratios (RHS ÷ positive pivot-column entry): ${rows.map((r) => `${cols[basis[r]].name}: ${T[r][n]} ÷ ${T[r][pc]} = ${theta[r]}`).join("; ")}. ${rows.length < T.length ? "Rows with entries ≤ 0 get no ratio — they never limit the entering variable." : ""}` });
        snap(obj, { line: 14, kind: "leave", pc, pr, theta: thetaStr, text: `Departing variable: <b>${cols[basis[pr]].name}</b> (smallest θ = ${theta[pr]}). ${cols[pc].name} can rise to ${theta[pr]} before ${cols[basis[pr]].name} drops to 0. Pivot element = ${T[pr][pc]}.` });
        const leaving = cols[basis[pr]].name, entering = cols[pc].name;
        const before = point();
        const ops = pivot(obj, pr, pc);
        const after = point();
        const moved = Math.abs(after.x - before.x) > 1e-9 || Math.abs(after.y - before.y) > 1e-9;
        if (moved && prob.cons.every((c) => satisfies(c, after.x, after.y))) ctr.corners++;
        snap(obj, { line: [15, 16, 17, 18], kind: "pivot", pr, pc, lastOps: ops, text: `Pivot: ${ops.join("; ")}. Row ${pr + 1} is now labeled ${entering} (${leaving} left the basis). ${moved ? `The point moves to (${after.xs}, ${after.ys}).` : "Degenerate pivot: the basis changed but the point did not move."}` });
      }
      return "optimal";
    }

    // ---- Phase I (only if an artificial variable is needed) ----
    snap(null, { line: [1, 2], kind: "setup", text: standardFormText(prob, cons, cols, colOf) });
    let status;
    if (hasArt) {
      const W = Array.from({ length: n + 1 }, () => ZERO);
      cols.forEach((c, j) => { if (c.kind === "art") W[j] = ONE; });
      snap(W, { line: [3, 4], kind: "phase1", text: `The origin is not feasible (a ≥ or = constraint rules it out), so there is no ready-made starting corner. <b>Phase I</b>: maximize W = −(${cols.filter((c) => c.kind === "art").map((c) => c.name).join(" + ")}). The W-row starts as +1 under each artificial variable…` });
      basis.forEach((b, r) => { if (cols[b].kind === "art") for (let j = 0; j <= n; j++) W[j] = W[j].sub(T[r][j]); });
      snap(W, { line: [3, 4], kind: "phase1", text: `…then we subtract every artificial row so the basic (artificial) columns read 0. W = ${W[n]} now: the artificials still carry ${W[n].neg()} units of "infeasibility" that Phase I must drive to 0.` });
      status = loop(W);
      if (status === "optimal" && W[n].sign() < 0) {
        snap(W, { line: 5, kind: "infeasible", text: `Phase I is optimal but W = ${W[n]} < 0: the artificial variables cannot all reach 0. No point satisfies every constraint — the LP is <b>infeasible</b>.` });
        return { frames, status: "infeasible", geo, cols };
      }
      // drive remaining artificial variables out of the basis (degenerate case)
      for (let r = 0; r < T.length; r++) {
        if (cols[basis[r]].kind !== "art") continue;
        let j = 0; while (j < n && (cols[j].kind === "art" || T[r][j].isZero())) j++;
        if (j < n) pivot(W, r, j);
        else { T.splice(r, 1); basis.splice(r, 1); r--; }
      }
      cols.forEach((c, j) => { if (c.kind === "art") active[j] = false; });
      phase = 2;
      T = T.map((row) => row.map((v, j) => (j < n && !active[j] ? ZERO : v)));
    }
    const Z = Array.from({ length: n + 1 }, () => ZERO);
    Z[0] = cvec[0].neg(); Z[1] = cvec[1].neg();
    const objTxt = `${prob.sense === "max" ? "" : "−("}${fmtObj(prob.c)}${prob.sense === "max" ? "" : ")"}`;
    if (hasArt) {
      snap(Z, { line: 1, kind: "phase2", text: `Phase I reached W = 0: every artificial variable is 0, so the current basis is a genuine corner of the feasible region. Drop the artificial columns and write the real objective row (−c for maximize z = ${objTxt})…` });
    }
    const needFix = basis.some((b) => !Z[b].isZero());
    basis.forEach((b, r) => { const f = Z[b]; if (!f.isZero()) for (let j = 0; j <= n; j++) Z[j] = Z[j].sub(f.mul(T[r][j])); });
    if (hasArt || needFix) snap(Z, { line: 6, kind: "phase2", text: `${needFix ? "Clear the objective row under the basic columns (subtract multiples of their rows) so it prices only nonbasic variables. " : ""}<b>Phase II</b> starts from this corner with z = ${Z[n]}.` });
    else snap(Z, { line: 1, kind: "init", text: `Initial tableau. The objective row holds the negated coefficients of z = ${fmtObj(prob.c)}${prob.sense === "min" ? " (we maximize −f to minimize f)" : ""}. Slack variables are basic, so the starting basic feasible solution is the origin with z = 0.` });
    status = loop(Z);
    const p = point();
    if (status === "optimal") {
      const zv = prob.sense === "max" ? Z[n] : Z[n].neg();
      const cn = cornerName(p);
      snap(Z, { line: 8, kind: "done", done: true, text: `<b>Optimal.</b> x = ${p.xs}, y = ${p.ys}${cn ? ` (corner ${cn})` : ""}; ${prob.sense === "max" ? "maximum" : "minimum"} value ${zv}. Simplex visited ${path.length} basic solution${path.length > 1 ? "s" : ""} and made ${ctr.pivots} pivot${ctr.pivots === 1 ? "" : "s"} — it never looked at the other corners.` });
      return { frames, status: "optimal", value: zv, x: p.xs, y: p.ys, geo, cols };
    }
    return { frames, status, geo, cols };
  }
  function fmtObj(c) {
    const t = [];
    [["x", c[0]], ["y", c[1]]].forEach(([v, k]) => {
      if (k.isZero()) return;
      const a = k.sign() < 0 ? k.neg() : k;
      const coef = a.n === 1 && a.d === 1 ? "" : a.toString();
      t.push((k.sign() < 0 ? (t.length ? " − " : "−") : t.length ? " + " : "") + coef + v);
    });
    return t.join("") || "0";
  }
  function standardFormText(prob, cons, cols, colOf) {
    const parts = cons.map((c, i) => {
      const extra = [];
      if (colOf[i].s != null) extra.push((c.op === "<=" ? " + " : " − ") + cols[colOf[i].s].name);
      if (colOf[i].a != null) extra.push(" + " + cols[colOf[i].a].name);
      return `${fmtObj(c.a)}${extra.join("")} = ${c.b}${c.flipped ? " (multiplied by −1 first so the right side is ≥ 0)" : ""}`;
    });
    const sl = cols.filter((c) => c.kind === "slack").map((c) => c.name), su = cols.filter((c) => c.kind === "surplus").map((c) => c.name), ar = cols.filter((c) => c.kind === "art").map((c) => c.name);
    return `Standard form: ${parts.join("; ")}; all variables ≥ 0. ${sl.length ? `Slack ${sl.join(", ")} = unused room in a ≤ constraint. ` : ""}${su.length ? `Surplus ${su.join(", ")} = amount above a ≥ bound. ` : ""}${ar.length ? `Artificial ${ar.join(", ")} give Phase I a starting basis.` : ""}`;
  }

  const Engine = { Fr, parseConstraint, parseLinear, geometry, solve, fmtObj };
  if (typeof module !== "undefined" && module.exports) module.exports = Engine;
  if (typeof window === "undefined") return;

  /* =====================================================================
     UI
     ===================================================================== */
  const F = window.Forge;
  const $ = (id) => document.getElementById(id);
  F.page({ title: "Simplex Method", chapter: "Ch 10 · Iterative Improvement" });

  const PRESETS = {
    bakery: { sense: "max", c: "3,5", cons: "x + y <= 4\nx + 3y <= 6", label: "Course example: max 3x + 5y" },
    three: { sense: "max", c: "2,3", cons: "x + 2y <= 8\n3x + 2y <= 12\ny <= 3", label: "Three constraints" },
    min: { sense: "min", c: "2,3", cons: "x + y >= 4\nx + 3y >= 6\nx <= 5", label: "Minimize (needs Phase I)" },
    unbounded: { sense: "max", c: "1,1", cons: "x - y <= 1", label: "Unbounded" },
    infeasible: { sense: "max", c: "1,2", cons: "x + y <= 1\nx + y >= 3", label: "Infeasible" },
    degenerate: { sense: "max", c: "2,1", cons: "x - y <= 0\nx <= 2\ny <= 3", label: "Degenerate pivot" },
  };

  const LINES = [
    "ALGORITHM Simplex(LP)   // Levitin §10.1",
    "    T ← tableau in standard form",
    "    // slack: ≤; surplus + artificial: ≥, =",
    "    if T has artificial columns then",
    "        Phase I: maximize W = −Σ artificials",
    "        if max W < 0 then return \"infeasible\"",
    "    while true do",
    "        if all objective entries ≥ 0 then",
    "            return T   // optimal",
    "        c ← most negative objective column",
    "        if T[r, c] ≤ 0 for every row r then",
    "            return \"unbounded\"",
    "        for each row r with T[r, c] > 0 do",
    "            θ[r] ← T[r, rhs] / T[r, c]",
    "        p ← row with the smallest θ[r]",
    "        row p ← row p / T[p, c]",
    "        for each row r ≠ p (objective too) do",
    "            row r ← row r − T[r, c] · row p",
    "        basic[p] ← variable of column c",
  ];
  const code = F.code($("code"), LINES);
  const ctr = F.counters($("ctr"), { pivots: 0, "θ-ratios": 0, "corners visited": 1, phase: "II" });
  const say = F.narrate($("say"));
  const stage = $("stage");
  const zSlider = $("zs");
  let prob = null, result = null, cur = null;

  /* ---- predict widget (page-local) ---- */
  const predictBox = $("predict");
  let askKey = null;
  function showAsk(ask, key) {
    if (!ask) { if (askKey !== null) { predictBox.innerHTML = '<span class="muted small">Prediction prompts appear at decision points. With “pause to predict” on, autoplay stops there.</span>'; askKey = null; } return; }
    if (askKey === key) return;
    askKey = key;
    predictBox.innerHTML = "";
    const res = F.el("div", { class: "res" });
    const opts = F.el("div", { class: "opts" });
    ask.options.forEach((o) => opts.appendChild(F.el("button", { class: "btn sm", onclick: (e) => {
      const ok = o === ask.answer;
      opts.querySelectorAll("button").forEach((b) => (b.disabled = true));
      e.target.classList.add(ok ? "steel" : "primary");
      res.innerHTML = `${ok ? "✅ Yes!" : `❌ Not quite — it's <b>${ask.answer}</b>.`} ${ask.explain}`;
    } }, o)));
    predictBox.append(F.el("div", { class: "q" }, "🤔 Predict: " + ask.q), opts, res);
    if ($("pausePredict").checked) player.pause();
  }

  function readProblem() {
    const sense = $("sense").value;
    const cparts = [$("c1").value, $("c2").value];
    const c = cparts.map((s) => Fr.of(s || "0"));
    const lines = $("cons").value.split(/\n|;/).map((s) => s.trim()).filter(Boolean);
    if (!lines.length) throw new Error("add at least one constraint");
    if (lines.length > 6) throw new Error("at most 6 constraints, please");
    const cons = lines.map(parseConstraint);
    return { sense, c, cons };
  }

  function load() {
    $("err").textContent = "";
    try { prob = readProblem(); } catch (e) { $("err").textContent = "⚠ " + e.message; return; }
    result = solve(prob);
    const g = result.geo;
    let vpoly = g.poly;
    if (g.feasible) { vpoly = clip(vpoly, 1, 0, g.view); vpoly = clip(vpoly, 0, 1, g.view); }
    const zs = (vpoly.length ? vpoly : [[0, 0]]).map((p) => prob.c[0].val() * p[0] + prob.c[1].val() * p[1]);
    let lo = Math.min(0, ...zs), hi = Math.max(0, ...zs);
    if (!g.feasible) { hi = Math.max(1, prob.c[0].val() * g.view + prob.c[1].val() * g.view); lo = Math.min(0, hi); }
    const pad = (hi - lo) * 0.12 || 1;
    zSlider.min = lo - (prob.sense === "min" ? pad : 0); zSlider.max = hi + pad; zSlider.step = (hi - lo + pad) / 400;
    const startZ = result.status === "optimal" ? (prob.sense === "max" ? 0 : +zSlider.max) : lo;
    zSlider.value = startZ;
    $("ptable").innerHTML = "";
    const tb = F.el("table", { class: "t" }, F.el("tr", null, F.el("th", null, "corner"), F.el("th", null, "(x, y)"), F.el("th", null, prob.sense === "max" ? "z" : "f")));
    g.extreme.forEach((p) => tb.appendChild(F.el("tr", null, F.el("td", null, p.name), F.el("td", null, `(${nice(p.x)}, ${nice(p.y)})`), F.el("td", null, nice(prob.c[0].val() * p.x + prob.c[1].val() * p.y)))));
    if (g.extreme.length) $("ptable").appendChild(tb);
    $("ptable").appendChild(F.el("p", { class: "small muted", style: { margin: "8px 0 0" } },
      !g.feasible ? "No feasible points: the region is empty." : g.unboundedRegion ? "The region is unbounded (dashed edges continue forever)." : "Extreme Point Theorem: a bounded, nonempty region has an optimal solution at one of these corners."));
    askKey = "x";
    player.load(result.frames);
  }
  function nice(v) {
    if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v)).replace("-", "−");
    for (let d = 2; d <= 12; d++) if (Math.abs(v * d - Math.round(v * d)) < 1e-9) return `${Math.round(v * d)}/${d}`.replace("-", "−");
    return v.toFixed(2).replace("-", "−");
  }

  /* ---- plot ---- */
  let geomCache = null;
  function drawPlot(f) {
    const g = result.geo;
    const R = g.view;
    const W = 560, ml = 42, mr = 18, mt = 18, mb = 34;
    const pw = W - ml - mr, ph = Math.round(pw * 0.72);
    const H = ph + mt + mb;
    const sx = (x) => ml + (x / R) * pw, sy = (y) => mt + ph - (y / R) * ph;
    geomCache = { ml, mt, pw, ph, R, W, H };
    stage.setAttribute("viewBox", `0 0 ${W} ${H}`);
    stage.innerHTML = "";
    const S = F.svg;
    // grid
    const steps = [0.25, 0.5, 1, 2, 5, 10, 20, 25, 50, 100, 200, 500, 1000];
    const step = steps.find((s) => R / s <= 8) || 1000;
    for (let t = 0; t <= R + 1e-9; t += step) {
      stage.appendChild(S("line", { x1: sx(t), y1: mt, x2: sx(t), y2: mt + ph, stroke: "var(--line)", "stroke-width": 1 }));
      stage.appendChild(S("line", { x1: ml, y1: sy(t), x2: ml + pw, y2: sy(t), stroke: "var(--line)", "stroke-width": 1 }));
      stage.appendChild(S("text", { x: sx(t), y: mt + ph + 16, "text-anchor": "middle", "font-size": 11, fill: "var(--muted)" }, nice(t)));
      if (t > 0) stage.appendChild(S("text", { x: ml - 6, y: sy(t) + 4, "text-anchor": "end", "font-size": 11, fill: "var(--muted)" }, nice(t)));
    }
    stage.appendChild(S("text", { x: ml + pw, y: mt + ph + 30, "text-anchor": "end", "font-size": 12, fill: "var(--ink-2)" }, "x →"));
    stage.appendChild(S("text", { x: ml + 4, y: mt + 12, "font-size": 12, fill: "var(--ink-2)" }, "↑ y"));
    const clipId = "plotclip";
    stage.appendChild(S("defs", null, S("clipPath", { id: clipId }, S("rect", { x: ml, y: mt, width: pw, height: ph })),
      S("marker", { id: "sx-arr", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto" }, S("path", { d: "M0 0 L10 5 L0 10 z", fill: "var(--ember)" }))));
    const layer = S("g", { "clip-path": `url(#${clipId})` });
    stage.appendChild(layer);
    // feasible region
    if (g.feasible) {
      const pts = g.poly.map((p) => `${sx(Math.min(p[0], R * 1.5))},${sy(Math.min(p[1], R * 1.5))}`).join(" ");
      layer.appendChild(S("polygon", { points: pts, fill: "var(--c-done)", "fill-opacity": 0.16, stroke: "none" }));
      // edges: solid for real boundary, dashed for the artificial box (unbounded directions)
      g.poly.forEach((p, i) => {
        const q = g.poly[(i + 1) % g.poly.length];
        const onBox = (a) => Math.abs(a[0] - g.BIG) < 1e-7 || Math.abs(a[1] - g.BIG) < 1e-7;
        const art = onBox(p) && onBox(q);
        if (art) return;
        layer.appendChild(S("line", { x1: sx(p[0]), y1: sy(p[1]), x2: sx(q[0]), y2: sy(q[1]), stroke: "var(--c-done)", "stroke-width": 2.5, "stroke-dasharray": onBox(p) || onBox(q) ? "7 5" : "" }));
      });
    }
    // constraint lines (numbered badges on the lines + a key box)
    const badges = [];
    prob.cons.forEach((c, i) => {
      const a = c.a[0].val(), b = c.a[1].val(), r = c.b.val();
      const seg = lineInBox(a, b, r, R);
      if (!seg) return;
      layer.appendChild(S("line", { x1: sx(seg[0][0]), y1: sy(seg[0][1]), x2: sx(seg[1][0]), y2: sy(seg[1][1]), stroke: "var(--steel)", "stroke-width": 1.5, "stroke-opacity": 0.75 }));
      // put the badge where it is farthest from corners and other badges
      let bestPt = null, bestD = -1;
      [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8].forEach((t) => {
        const mx = sx(seg[0][0] + t * (seg[1][0] - seg[0][0])), my = sy(seg[0][1] + t * (seg[1][1] - seg[0][1]));
        const d = Math.min(1e9, ...g.extreme.map((q) => Math.hypot(sx(q.x) - mx, sy(q.y) - my)), ...badges.map((b) => Math.hypot(b[0] - mx, b[1] - my)));
        if (d > bestD) { bestD = d; bestPt = [mx, my]; }
      });
      badges.push([bestPt[0], bestPt[1], i + 1]);
    });
    badges.forEach(([x, y, k]) => {
      stage.appendChild(S("circle", { cx: x, cy: y, r: 9, fill: "var(--panel)", stroke: "var(--steel)", "stroke-width": 1.5 }));
      stage.appendChild(S("text", { x, y: y + 4, "text-anchor": "middle", "font-size": 11, "font-weight": 700, fill: "var(--steel)" }, String(k)));
    });
    const keyW = 12 + 7.2 * Math.max(...prob.cons.map((c) => c.text.length + 4)), keyH = 8 + 16 * prob.cons.length;
    const kx = ml + pw - keyW - 6, ky = mt + 6;
    stage.appendChild(S("rect", { x: kx, y: ky, width: keyW, height: keyH, rx: 6, fill: "var(--panel)", "fill-opacity": 0.92, stroke: "var(--line-2)" }));
    prob.cons.forEach((c, i) => stage.appendChild(S("text", { x: kx + 8, y: ky + 17 + 16 * i, "font-size": 11.5, fill: "var(--steel)" }, `(${i + 1}) ${c.text.replace(/<=/g, "≤").replace(/>=/g, "≥")}`)));
    // objective line for slider value
    const zv = +zSlider.value;
    const c1 = prob.c[0].val(), c2 = prob.c[1].val();
    if (c1 || c2) {
      const seg = lineInBox(c1, c2, zv, R);
      if (seg) layer.appendChild(S("line", { x1: sx(seg[0][0]), y1: sy(seg[0][1]), x2: sx(seg[1][0]), y2: sy(seg[1][1]), stroke: "var(--ember)", "stroke-width": 2.5, "stroke-dasharray": "8 5" }));
    }
    // extreme points
    g.extreme.forEach((p) => {
      const isOpt = f.done && Math.abs(p.x - f.point.x) < 1e-7 && Math.abs(p.y - f.point.y) < 1e-7;
      stage.appendChild(S("circle", { cx: sx(p.x), cy: sy(p.y), r: isOpt ? 7 : 4.5, fill: isOpt ? "var(--c-done)" : "var(--ink-2)", stroke: "var(--bg-2)", "stroke-width": 2 }));
      const right = sx(p.x) < ml + pw - 90;
      stage.appendChild(S("text", { x: sx(p.x) + (right ? 9 : -9), y: sy(p.y) - 8, "text-anchor": right ? "start" : "end", "font-size": 12, "font-weight": 700, fill: "var(--ink)" }, `${p.name} (${nice(p.x)}, ${nice(p.y)})`));
    });
    // simplex path
    const path = f.path.concat([f.point]);
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i];
      if (Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9) continue;
      stage.appendChild(S("line", { x1: sx(a.x), y1: sy(a.y), x2: sx(b.x), y2: sy(b.y), stroke: "var(--ember)", "stroke-width": 3, "marker-end": "url(#sx-arr)", opacity: 0.9 }));
    }
    // current basic solution
    if (f.point.x <= R * 1.5 && f.point.y <= R * 1.5) {
      const ok = f.feasible;
      stage.appendChild(S("circle", { cx: sx(f.point.x), cy: sy(f.point.y), r: 11, fill: "none", stroke: ok ? "var(--c-active)" : "var(--c-swap)", "stroke-width": 3, "stroke-dasharray": ok ? "" : "4 3" }));
    }
    // slider status
    const zs = (g.poly.length ? g.poly : [[0, 0]]).map((p) => c1 * p[0] + c2 * p[1]);
    const zmin = Math.min(...zs), zmax = Math.max(...zs);
    let msg;
    const best = result.status === "optimal" ? result.value.val() : null;
    const lbl = prob.sense === "max" ? "z" : "f";
    if (!g.feasible) msg = "The feasible region is empty — no level line can touch it.";
    else if (best != null && Math.abs(zv - best) <= (+zSlider.step) * 1.5) msg = `<b>${lbl} = ${nice(best)}</b>: the line only just touches the region — at the optimal corner. Push it any further and it leaves the region.`;
    else if (zv < zmin - 1e-9 || zv > zmax + 1e-9) msg = g.unboundedRegion && ((prob.sense === "max" && zv > zmax) || (prob.sense === "min" && zv < zmin)) ? `${lbl} = ${zv.toFixed(2)}: off the drawn part, but the region continues forever in this direction.` : `${lbl} = ${zv.toFixed(2)}: the line misses the feasible region — no feasible point has this value.`;
    else msg = `${lbl} = ${zv.toFixed(2)}: the line still crosses the region, so feasible points reach this value. ${prob.sense === "max" ? "Slide right" : "Slide left"} to improve.`;
    $("zmsg").innerHTML = msg;
  }
  function lineInBox(a, b, r, R) {
    const pts = [];
    const add = (x, y) => { if (x >= -1e-9 && x <= R + 1e-9 && y >= -1e-9 && y <= R + 1e-9 && !pts.some((p) => Math.hypot(p[0] - x, p[1] - y) < 1e-9)) pts.push([x, y]); };
    if (Math.abs(b) > 1e-12) { add(0, r / b); add(R, (r - a * R) / b); }
    if (Math.abs(a) > 1e-12) { add(r / a, 0); add((r - b * R) / a, R); }
    return pts.length >= 2 ? [pts[0], pts[1]] : null;
  }

  /* ---- tableau ---- */
  function drawTableau(f) {
    const host = $("tableau");
    host.innerHTML = "";
    const visCols = f.cols.map((c, j) => (c ? j : -1)).filter((j) => j >= 0);
    const n = f.cols.length;
    const hdr = F.el("tr", null, F.el("th", null, "basic"), visCols.map((j) => F.el("th", { style: j === f.pc ? { background: "var(--steel-soft)", color: "var(--steel)" } : null }, f.cols[j] + (j === f.pc ? " ↓" : ""))), F.el("th", null, "RHS"), f.theta ? F.el("th", null, "θ") : null);
    const tb = F.el("table", { class: "t" }, hdr);
    f.T.forEach((row, r) => {
      const isPr = r === f.pr;
      const tr = F.el("tr", null, F.el("th", { style: isPr ? { background: "var(--ember-soft)", color: "var(--ember)" } : null }, f.basis[r] + (isPr && f.kind === "leave" ? " ←" : "")));
      visCols.forEach((j) => {
        const td = F.el("td", null, row[j]);
        if (j === f.pc && isPr) td.className = "hl";
        else if (j === f.pc) td.style.background = "var(--steel-soft)";
        else if (isPr) td.style.background = "var(--ember-soft)";
        tr.appendChild(td);
      });
      tr.appendChild(F.el("td", { style: isPr ? { background: "var(--ember-soft)" } : null }, row[n]));
      if (f.theta) tr.appendChild(F.el("td", { style: f.theta[r] != null && isPr ? { fontWeight: 700, color: "var(--ember)" } : { color: "var(--muted)" } }, f.theta[r] != null ? f.theta[r] : "—"));
      tb.appendChild(tr);
    });
    if (f.obj) {
      const tr = F.el("tr", null, F.el("th", null, f.zLabel));
      visCols.forEach((j) => tr.appendChild(F.el("td", { style: j === f.pc ? { background: "var(--steel-soft)", fontWeight: 700 } : f.objNeg[j] ? { color: "var(--c-swap)", fontWeight: 700 } : null }, f.obj[j])));
      tr.appendChild(F.el("td", { style: { fontWeight: 700 } }, f.obj[n]));
      if (f.theta) tr.appendChild(F.el("td", null, ""));
      tr.style.borderTop = "2px solid var(--line-2)";
      tb.appendChild(tr);
    }
    host.appendChild(tb);
    $("tabcap").textContent = f.phase === 1 ? "Phase I tableau (W-row = −sum of artificials)" : "Simplex tableau";
  }

  function render(f, i) {
    cur = f;
    drawPlot(f);
    drawTableau(f);
    code.highlight(f.line);
    ctr.set({ pivots: f.ctr.pivots, "θ-ratios": f.ctr.ratios, "corners visited": f.ctr.corners, phase: f.phase === 1 ? "I" : "II" });
    say.say(f.text);
    showAsk(f.ask, i);
  }
  const player = F.player($("player"), { frames: [], render, fps: 1 });

  zSlider.addEventListener("input", () => cur && drawPlot(cur));
  // drag on the plot to move the objective line through the pointer
  function dragZ(e) {
    if (!cur || !geomCache || !(e.buttons & 1)) return;
    const pt = stage.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const m = stage.getScreenCTM(); if (!m) return;
    const p = pt.matrixTransform(m.inverse());
    const { ml, mt, pw, ph, R } = geomCache;
    const x = ((p.x - ml) / pw) * R, y = ((mt + ph - p.y) / ph) * R;
    if (x < -0.05 * R || y < -0.05 * R) return;
    zSlider.value = prob.c[0].val() * x + prob.c[1].val() * y;
    drawPlot(cur);
  }
  stage.addEventListener("pointerdown", dragZ);
  stage.addEventListener("pointermove", dragZ);
  let sweepTimer = null;
  $("sweep").onclick = () => {
    if (sweepTimer) { cancelAnimationFrame(sweepTimer); sweepTimer = null; return; }
    const target = result && result.status === "optimal" ? result.value.val() : +zSlider.max;
    const start = prob.sense === "max" ? +zSlider.min : +zSlider.max;
    const t0 = performance.now();
    const tick = (t) => {
      const u = Math.min(1, (t - t0) / 2200);
      zSlider.value = start + (target - start) * u;
      drawPlot(cur);
      sweepTimer = u < 1 ? requestAnimationFrame(tick) : null;
    };
    sweepTimer = requestAnimationFrame(tick);
  };

  function setPreset(k) {
    const p = PRESETS[k];
    $("sense").value = p.sense;
    const [a, b] = p.c.split(",");
    $("c1").value = a; $("c2").value = b;
    $("cons").value = p.cons;
    load();
  }
  const sel = $("preset");
  Object.keys(PRESETS).forEach((k) => sel.appendChild(F.el("option", { value: k }, PRESETS[k].label)));
  sel.onchange = () => setPreset(sel.value);
  $("load").onclick = load;
  $("rand").onclick = () => {
    const r = Math.random;
    const k = 2 + Math.floor(r() * 2);
    const lines = [];
    for (let i = 0; i < k; i++) {
      const a = 1 + Math.floor(r() * 4), b = 1 + Math.floor(r() * 4);
      lines.push(`${a === 1 ? "" : a}x + ${b === 1 ? "" : b}y <= ${4 + Math.floor(r() * 12)}`);
    }
    $("sense").value = "max";
    $("c1").value = 1 + Math.floor(r() * 6); $("c2").value = 1 + Math.floor(r() * 6);
    $("cons").value = lines.join("\n");
    sel.value = "";
    load();
  };
  setPreset("bakery");
})();
