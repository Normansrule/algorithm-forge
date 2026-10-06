/* =====================================================================
   Forge Pseudocode — an interpreter for Levitin-style pseudocode
   ---------------------------------------------------------------------
   Lets learners write algorithms exactly the way the textbook writes
   them, then RUN them: get results, operation counts (comparisons,
   assignments, array reads/writes, ...), per-line hit counts and a
   step-by-step trace for visualization.

       ALGORITHM MaxElement(A[0..n-1])
           maxval ← A[0]
           for i ← 1 to n - 1 do
               if A[i] > maxval
                   maxval ← A[i]
           return maxval

   API (works in browsers as window.ForgePseudo and in Node via require):
     ForgePseudo.parse(source)                       -> Program AST
     ForgePseudo.run(source | Program, options)      -> Result
        options = { entry, args, trace, maxSteps, maxDepth, maxTrace, seed, onPrint }
        Result  = { ok, value, args, ops, lineHits, output, trace, error, entry }
     ForgePseudo.ForgeError                          -> error class (has .line)

   Design notes
   - Blocks are defined by indentation (like the book). Optional "end",
     "endif", "end for", "od", "fi", "{", "}" lines are tolerated & ignored.
   - A header parameter written A[0..n-1] binds n to the length; A[l..r]
     binds l and r to the bounds of the slice the caller passed.
     Calling F(A[l..s-1]) passes a *view* of the same array (writes are
     visible to the caller), exactly as the book intends. Assigning a slice
     (B ← A[0..m-1]) makes a *copy*.
   - "=" is equality (book style). Assignment is ←, <- or :=.
   ===================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ForgePseudo = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ------------------------------------------------------------------ */
  /* Errors                                                              */
  /* ------------------------------------------------------------------ */
  class ForgeError extends Error {
    constructor(message, line, kind) {
      super(message);
      this.name = "ForgeError";
      this.line = line || null;
      this.kind = kind || "runtime"; // "syntax" | "runtime" | "limit"
    }
    toString() {
      return (this.line ? `Line ${this.line}: ` : "") + this.message;
    }
  }
  // internal control-flow signals
  class ReturnSignal { constructor(v) { this.value = v; } }
  const BREAK = { signal: "break" };
  const CONTINUE = { signal: "continue" };

  /* ------------------------------------------------------------------ */
  /* Lexer                                                               */
  /* ------------------------------------------------------------------ */
  const KEYWORDS = new Set([
    "algorithm", "function", "procedure", "for", "to", "downto", "do", "while", "repeat",
    "until", "if", "then", "else", "elseif", "elif", "return", "and", "or", "not", "div", "mod", "in",
    "true", "false", "null", "nil", "none", "break", "continue", "infinity", "xor",
  ]);
  // Words that are keywords only in certain positions (so they can still be variable names):
  // step, by, from, each, swap, print, write, copy, new, with
  const isWord = (t, w) => !!t && ((t.t === "kw" && t.v === w) || (t.t === "id" && t.v.toLowerCase() === w));
  // Unicode / ASCII operator normalization
  const SYMBOLS = [
    ["←", "ASSIGN"], ["<-", "ASSIGN"], [":=", "ASSIGN"],
    ["↔", "SWAP"], ["<->", "SWAP"], ["⇆", "SWAP"],
    ["≤", "<="], ["<=", "<="], ["≥", ">="], [">=", ">="], ["≠", "!="], ["!=", "!="], ["<>", "!="], ["==", "="],
    ["+=", "+="], ["-=", "-="], ["*=", "*="], ["++", "++"], ["--", "--"],
    ["&&", "and"], ["||", "or"], ["∧", "and"], ["∨", "or"], ["¬", "not"],
    ["..", ".."], ["**", "^"], ["×", "*"], ["·", "*"], ["÷", "/"], ["−", "-"], ["–", "-"],
    ["²", "SQ"], ["³", "CUBE"], ["⌊", "LFLOOR"], ["⌋", "RFLOOR"], ["⌈", "LCEIL"], ["⌉", "RCEIL"], ["∞", "INF"],
    ["(", "("], [")", ")"], ["[", "["], ["]", "]"], [",", ","], [";", ";"], [":", ":"], [".", "."],
    ["+", "+"], ["-", "-"], ["*", "*"], ["/", "/"], ["%", "mod"], ["^", "^"],
    ["<", "<"], [">", ">"], ["=", "="], ["!", "not"], ["|", "|"], ["{", "{"], ["}", "}"],
  ];

  SYMBOLS.sort((a, b) => b[0].length - a[0].length);
  function lexLine(text, lineNo) {
    const toks = [];
    let i = 0;
    const n = text.length;
    while (i < n) {
      const c = text[i];
      if (c === " " || c === "\t" || c === "\r") { i++; continue; }
      // comments
      if (c === "/" && text[i + 1] === "/") break;
      if (c === "#" ) break;
      if (c === "▷") break;
      // numbers (with implicit multiplication: 2n → 2 * n)
      if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(text[i + 1] || "") && text[i + 1] !== ".")) {
        let j = i;
        while (j < n && /[0-9]/.test(text[j])) j++;
        if (text[j] === "." && text[j + 1] !== "." && /[0-9]/.test(text[j + 1] || "")) {
          j++;
          while (j < n && /[0-9]/.test(text[j])) j++;
        }
        if ((text[j] === "e" || text[j] === "E") && /[0-9+-]/.test(text[j + 1] || "") && /[0-9]/.test(text[j + 2] || text[j + 1])) {
          let k = j + 1;
          if (text[k] === "+" || text[k] === "-") k++;
          if (/[0-9]/.test(text[k] || "")) { j = k; while (j < n && /[0-9]/.test(text[j])) j++; }
        }
        toks.push({ t: "num", v: parseFloat(text.slice(i, j)), line: lineNo, col: i });
        if (j < n && /[A-Za-z_]/.test(text[j]) && !/^(to|do|downto|div|mod|and|or|then|step|e\b)/i.test(text.slice(j))) {
          toks.push({ t: "*", line: lineNo, col: j, implicit: true });
        }
        i = j;
        continue;
      }
      // strings / chars
      if (c === '"' || c === "'" || c === "“" || c === "‘" || c === "’" || c === "”") {
        const close = c === "“" ? "”" : c === "‘" ? "’" : c;
        let j = i + 1, s = "";
        while (j < n && text[j] !== close && !(close === "’" && text[j] === "'") && !(close === "'" && text[j] === "’")) {
          if (text[j] === "\\" && j + 1 < n) { const e = text[j + 1]; s += e === "n" ? "\n" : e === "t" ? "\t" : e; j += 2; continue; }
          s += text[j++];
        }
        if (j >= n) throw new ForgeError("This text (string) is missing its closing quote.", lineNo, "syntax");
        toks.push({ t: "str", v: s, line: lineNo, col: i });
        i = j + 1;
        continue;
      }
      // identifiers / keywords (allow unicode letters and subscripts)
      if (/[A-Za-z_À-ɏͰ-Ͽ]/.test(c) && c !== "×" && c !== "÷") {
        let j = i;
        while (j < n && /[A-Za-z0-9_'À-ɏͰ-Ͽ₀-₉]/.test(text[j]) && text[j] !== "×" && text[j] !== "÷") {
          // stop at an apostrophe that begins a char literal like 'A'
          if (text[j] === "'" && j > i) {
            // treat trailing prime (x') as part of identifier only if followed by non-letter
            if (/[A-Za-z]/.test(text[j + 1] || "") && text[j + 2] === "'") break;
          }
          j++;
        }
        const word = text.slice(i, j);
        const lw = word.toLowerCase();
        const kwCase = word === lw || word === word.toUpperCase() || ["True", "False", "None", "Null", "Nil", "Infinity", "Algorithm", "Function", "Procedure"].includes(word);
        if (KEYWORDS.has(lw) && kwCase) {
          toks.push({ t: "kw", v: normKw(lw), raw: word, line: lineNo, col: i });
        } else toks.push({ t: "id", v: word, line: lineNo, col: i });
        i = j;
        continue;
      }
      // symbols (longest first)
      let matched = false;
      for (const [sym, kind] of SYMBOLS) {
        if (text.startsWith(sym, i)) {
          if (kind === "and" || kind === "or" || kind === "not") toks.push({ t: "kw", v: kind, raw: sym, line: lineNo, col: i });
          else toks.push({ t: kind, line: lineNo, col: i });
          i += sym.length;
          matched = true;
          break;
        }
      }
      if (matched) continue;
      throw new ForgeError(`I don't understand the character "${c}".`, lineNo, "syntax");
    }
    return toks;
  }
  function normKw(w) {
    if (w === "nil" || w === "none") return "null";
    if (w === "elif") return "elseif";
    if (w === "function" || w === "procedure") return "algorithm";
    if (w === "inf") return "infinity";
    return w;
  }

  /* ------------------------------------------------------------------ */
  /* Line splitting & block structure                                    */
  /* ------------------------------------------------------------------ */
  const END_LINE = /^\s*(end\s*(if|for|while|algorithm|function|procedure|repeat|do)?|endif|endfor|endwhile|od|fi|done|[{}])\s*;?\s*$/i;

  function splitLines(src) {
    const out = [];
    const raw = String(src).replace(/\r\n?/g, "\n").split("\n");
    raw.forEach((text, k) => {
      const lineNo = k + 1;
      const expanded = text.replace(/\t/g, "    ");
      const stripped = expanded.replace(/\/\/.*$/, "");
      if (!stripped.trim()) return;
      if (END_LINE.test(stripped)) return;
      // Input/Output doc lines like "Input: ..." without //
      if (/^\s*(input|output|requires|ensures|precondition|postcondition)\s*:/i.test(stripped)) return;
      const indent = expanded.match(/^ */)[0].length;
      let toks = lexLine(expanded, lineNo);
      // drop trailing { and leading } used by C-like writers
      while (toks.length && (toks[toks.length - 1].t === "{" || toks[toks.length - 1].t === ";")) toks.pop();
      while (toks.length && toks[0].t === "}") toks.shift();
      if (!toks.length) return;
      out.push({ indent, toks, line: lineNo, text });
    });
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Parser                                                              */
  /* ------------------------------------------------------------------ */
  class TokStream {
    constructor(toks, line) { this.toks = toks; this.i = 0; this.line = line; }
    peek(k = 0) { return this.toks[this.i + k]; }
    next() { return this.toks[this.i++]; }
    done() { return this.i >= this.toks.length; }
    isKw(v, k = 0) { const t = this.peek(k); return t && t.t === "kw" && t.v === v; }
    isT(t, k = 0) { const x = this.peek(k); return x && x.t === t; }
    eatKw(v) { if (this.isKw(v)) { this.i++; return true; } return false; }
    isWord(w, k = 0) { return isWord(this.peek(k), w); }
    eatWord(w) { if (this.isWord(w)) { this.i++; return true; } return false; }
    eat(t) { if (this.isT(t)) { return this.next(); } return null; }
    expect(t, what) {
      const x = this.peek();
      if (!x || x.t !== t) throw new ForgeError(`Expected ${what || t}${x ? " but found " + describe(x) : " at the end of the line"}.`, this.line, "syntax");
      return this.next();
    }
    expectKw(v) {
      if (!this.eatKw(v)) { const x = this.peek(); throw new ForgeError(`Expected "${v}"${x ? " but found " + describe(x) : ""}.`, this.line, "syntax"); }
    }
  }
  function describe(t) {
    if (!t) return "nothing";
    if (t.t === "id") return `"${t.v}"`;
    if (t.t === "kw") return `"${t.raw || t.v}"`;
    if (t.t === "num") return `the number ${t.v}`;
    if (t.t === "str") return `the text "${t.v}"`;
    const names = { ASSIGN: "←", "<=": "≤", ">=": "≥", "!=": "≠", LFLOOR: "⌊", RFLOOR: "⌋", LCEIL: "⌈", RCEIL: "⌉", INF: "∞", SWAP: "↔" };
    return `"${names[t.t] || t.t}"`;
  }

  // tokens that end an expression (so "if A[i] > m m ← A[i]" works)
  const EXPR_STOP_KW = new Set(["to", "downto", "step", "do", "then", "else", "and", "or", "in", "by", "until", "from"]);

  // ---- expressions (Pratt) ----
  const BINARY = {
    or: [1, "or"], xor: [1, "xor"], and: [2, "and"],
    "=": [4, "="], "!=": [4, "!="], "<": [4, "<"], "<=": [4, "<="], ">": [4, ">"], ">=": [4, ">="], inop: [4, "in"],
    "+": [5, "+"], "-": [5, "-"],
    "*": [6, "*"], "/": [6, "/"], div: [6, "div"], mod: [6, "mod"],
    "^": [8, "^"],
  };
  function binOpOf(t) {
    if (!t) return null;
    if (t.t === "kw") {
      if (t.v === "and" || t.v === "or" || t.v === "xor" || t.v === "div" || t.v === "mod") return BINARY[t.v];
      if (t.v === "in") return BINARY.inop;
      return null;
    }
    return BINARY[t.t] || null;
  }

  function parseExpr(ts, minPrec = 0, ctx = {}) {
    let left = parseUnary(ts, ctx);
    for (;;) {
      const t = ts.peek();
      const op = binOpOf(t);
      if (!op) break;
      const [prec, name] = op;
      if (prec < minPrec) break;
      if (ctx.noIn && name === "in") break;
      // "|" closes an |abs| expression; handled in primary
      ts.next();
      const rhs = parseExpr(ts, name === "^" ? prec : prec + 1, ctx); // ^ is right-assoc
      left = { k: "bin", op: name, a: left, b: rhs, line: ts.line };
      if (prec === 4) {
        // chained comparison a < b < c  →  (a < b) and (b < c)
        const t2 = ts.peek();
        const op2 = binOpOf(t2);
        if (op2 && op2[0] === 4 && op2[1] !== "in") {
          ts.next();
          const rhs2 = parseExpr(ts, 5, ctx);
          left = { k: "bin", op: "and", a: left, b: { k: "bin", op: op2[1], a: rhs, b: rhs2, line: ts.line }, line: ts.line };
        }
      }
    }
    return left;
  }

  function parseUnary(ts, ctx) {
    const t = ts.peek();
    if (!t) throw new ForgeError("An expression is missing here.", ts.line, "syntax");
    if (t.t === "-") { ts.next(); return { k: "neg", e: parseExpr(ts, 7, ctx), line: ts.line }; }
    if (t.t === "+") { ts.next(); return parseExpr(ts, 7, ctx); }
    if (t.t === "kw" && t.v === "not") { ts.next(); return { k: "not", e: parseExpr(ts, 3, ctx), line: ts.line }; }
    return parsePostfix(ts, ctx);
  }

  function parsePostfix(ts, ctx) {
    let e = parsePrimary(ts, ctx);
    for (;;) {
      if (ts.isT("[")) {
        ts.next();
        const idx = [];
        do {
          const a = parseExpr(ts, 0, { ...ctx, noIn: false });
          if (ts.eat("..")) {
            const b = parseExpr(ts, 0, ctx);
            idx.push({ k: "range", lo: a, hi: b });
          } else idx.push(a);
        } while (ts.eat(","));
        ts.expect("]", '"]"');
        for (const ix of idx) e = ix.k === "range" ? { k: "slice", obj: e, lo: ix.lo, hi: ix.hi, line: ts.line } : { k: "index", obj: e, idx: ix, line: ts.line };
        continue;
      }
      if (ts.isT(".") && ts.peek(1) && (ts.peek(1).t === "id" || ts.peek(1).t === "kw")) {
        ts.next();
        const f = ts.next();
        const name = f.t === "id" ? f.v : (f.raw || f.v);
        if (ts.isT("(")) { // method-style call: Q.push(x) → push(Q, x)
          ts.next();
          const args = [e];
          if (!ts.isT(")")) { do { args.push(parseExpr(ts, 0, ctx)); } while (ts.eat(",")); }
          ts.expect(")", '")"');
          e = { k: "call", name, args, line: ts.line, method: true };
        } else e = { k: "field", obj: e, name, line: ts.line };
        continue;
      }
      if (ts.isT("SQ") || ts.isT("CUBE")) { const p = ts.next().t === "SQ" ? 2 : 3; e = { k: "bin", op: "^", a: e, b: { k: "lit", v: p }, line: ts.line }; continue; }
      break;
    }
    return e;
  }

  function parsePrimary(ts, ctx) {
    const t = ts.next();
    if (!t) throw new ForgeError("An expression is missing here.", ts.line, "syntax");
    switch (t.t) {
      case "num": return { k: "lit", v: t.v };
      case "str": return { k: "lit", v: t.v };
      case "INF": return { k: "lit", v: Infinity };
      case "(": {
        if (ts.isT(")")) { ts.next(); return { k: "list", items: [] }; }
        const first = parseExpr(ts, 0, { ...ctx, noIn: false });
        if (ts.eat(",")) {
          const items = [first];
          do { items.push(parseExpr(ts, 0, ctx)); } while (ts.eat(","));
          ts.expect(")", '")"');
          return { k: "list", items, tuple: true };
        }
        ts.expect(")", '")"');
        return first;
      }
      case "[": {
        const items = [];
        if (!ts.isT("]")) { do { items.push(parseExpr(ts, 0, { ...ctx, noIn: false })); } while (ts.eat(",")); }
        ts.expect("]", '"]"');
        return { k: "list", items };
      }
      case "{": {
        // set / map literal {} or {1, 2}
        const items = [];
        if (!ts.isT("}")) { do { items.push(parseExpr(ts, 0, ctx)); } while (ts.eat(",")); }
        ts.expect("}", '"}"');
        return { k: "setlit", items };
      }
      case "LFLOOR": { const e = parseExpr(ts, 0, ctx); ts.expect("RFLOOR", '"⌋"'); return { k: "floor", e }; }
      case "LCEIL": { const e = parseExpr(ts, 0, ctx); ts.expect("RCEIL", '"⌉"'); return { k: "ceil", e }; }
      case "|": { const e = parseExpr(ts, 0, ctx); ts.expect("|", '"|"'); return { k: "abs", e }; }
      case "kw": {
        if (t.v === "true") return { k: "lit", v: true };
        if (t.v === "false") return { k: "lit", v: false };
        if (t.v === "null") return { k: "lit", v: null };
        if (t.v === "infinity") return { k: "lit", v: Infinity };
        throw new ForgeError(`"${t.raw || t.v}" can't start an expression here.`, ts.line, "syntax");
      }
      case "id": {
        if (t.v.toLowerCase() === "new" && ts.isT("id")) {
          const nm = ts.next();
          if (nm.v.toLowerCase() === "array" && ts.isT("[")) {
            ts.next();
            const a = parseExpr(ts, 0, ctx);
            let size = a;
            if (ts.eat("..")) { const b = parseExpr(ts, 0, ctx); size = { k: "bin", op: "+", a: { k: "bin", op: "-", a: b, b: a }, b: { k: "lit", v: 1 } }; }
            ts.expect("]", '"]"');
            return { k: "call", name: "array", args: [size], line: ts.line };
          }
          const fields = [];
          if (ts.eat("(")) {
            while (!ts.isT(")") && !ts.done()) {
              const f = ts.next();
              if (f.t !== "id" || !(ts.eat(":") || ts.eat("=") || ts.eat("ASSIGN"))) {
                throw new ForgeError(`new ${nm.v}(…) takes named fields, e.g. new ${nm.v}(key: 5, left: null) — or create it empty and then set t.key ← 5.`, ts.line, "syntax");
              }
              fields.push({ name: f.v, e: parseExpr(ts, 0, ctx) });
              if (!ts.eat(",")) break;
            }
            ts.expect(")", '")"');
          }
          return { k: "new", type: nm.v, args: [], fields, line: ts.line };
        }
        if (ts.isT("(")) {
          ts.next();
          const args = [];
          if (!ts.isT(")")) { do { args.push(parseExpr(ts, 0, { ...ctx, noIn: false })); } while (ts.eat(",")); }
          ts.expect(")", '")"');
          return { k: "call", name: t.v, args, line: ts.line };
        }
        return { k: "var", name: t.v, line: ts.line };
      }
      default:
        throw new ForgeError(`${describe(t)} can't start an expression here.`, ts.line, "syntax");
    }
  }

  // ---- statements ----
  function isLvalue(e) { return e && (e.k === "var" || e.k === "index" || e.k === "field" || e.k === "slice" || (e.k === "list" && e.items.every(isLvalue))); }

  function nameOf0(n) { return n.k === "var" ? n.name : n.k === "index" ? nameOf0(n.obj) + "[…]" : n.k === "field" ? nameOf0(n.obj) + "." + n.name : "x"; }
  /** Parse ONE simple statement from the token stream (inline bodies allowed). */
  function parseSimple(ts, L, lines, pos, ctx) {
    const t = ts.peek();
    const line = ts.line;
    const word = t.t === "id" && !(ts.isT("ASSIGN", 1) || ts.isT("[", 1) || ts.isT(".", 1) || ts.isT("=", 1) || ts.isT("+=", 1) || ts.isT("-=", 1)) ? t.v.toLowerCase() : null;
    const kind = t.t === "kw" ? t.v : (word === "write" || word === "output") ? "print" : (word === "swap" && !ts.isT("(", 1)) || word === "swap" ? "swap" : word === "print" ? "print" : word === "copy" && !ts.isT("(", 1) ? "copy" : null;
    if (kind) {
      switch (kind) {
        case "return": {
          ts.next();
          if (ts.done() || ts.isT(";")) return { k: "return", e: null, line };
          let e = parseExpr(ts);
          if (ts.isT(",")) { const items = [e]; while (ts.eat(",")) items.push(parseExpr(ts)); e = { k: "list", items, tuple: true }; }
          return { k: "return", e, line };
        }
        case "break": ts.next(); return { k: "break", line };
        case "continue": ts.next(); return { k: "continue", line };
        case "print": {
          ts.next();
          const items = [];
          if (ts.isT("(") && ts.toks[ts.toks.length - 1].t === ")") {
            ts.next();
            if (!ts.isT(")")) { do { items.push(parseExpr(ts)); } while (ts.eat(",")); }
            ts.expect(")", '")"');
          } else if (!ts.done()) { do { items.push(parseExpr(ts)); } while (ts.eat(",")); }
          return { k: "print", items, line };
        }
        case "swap": {
          ts.next();
          let a, b;
          if (ts.isT("(")) {
            ts.next(); a = parseExpr(ts); ts.expect(",", '","'); b = parseExpr(ts); ts.expect(")", '")"');
          } else {
            a = parseExpr(ts, 3, { noAnd: true });
            if (!ts.eatKw("and") && !ts.eat(",") && !ts.eatWord("with")) throw new ForgeError('Write swaps as "swap A[i] and A[j]".', line, "syntax");
            b = parseExpr(ts, 3);
          }
          return { k: "swap", a, b, line };
        }
        case "copy": {
          ts.next();
          const src = parseExpr(ts, 0, { noIn: true });
          if (!ts.eatKw("to")) throw new ForgeError('Write copies as "copy A[0..m-1] to B[0..m-1]".', line, "syntax");
          const dst = parseExpr(ts);
          return { k: "copyto", src, dst, line };
        }
      }
    }
    // expression / assignment
    const lhs = parseExpr(ts, 0, { noIn: true });
    if (ts.isT("ASSIGN") || (ts.isT("=") && isLvalue(lhs) && ctx && ctx.allowEqAssign)) {
      ts.next();
      let rhs = parseExpr(ts);
      if (ts.isT(",") && lhs.k === "list") { const items = [rhs]; while (ts.eat(",")) items.push(parseExpr(ts)); rhs = { k: "list", items, tuple: true }; }
      if (!isLvalue(lhs)) throw new ForgeError("The left side of ← must be a variable, an array cell like A[i], or a field like x.key.", line, "syntax");
      // chained assignment a ← b ← 0
      if (ts.isT("ASSIGN") && isLvalue(rhs)) { ts.next(); const v = parseExpr(ts); return { k: "block", body: [{ k: "assign", lhs: rhs, rhs: v, line }, { k: "assign", lhs, rhs, line }], line }; }
      return { k: "assign", lhs, rhs, line };
    }
    if (ts.isT("SWAP")) { ts.next(); const b = parseExpr(ts); return { k: "swap", a: lhs, b, line }; }
    if (ts.isT("+=") || ts.isT("-=") || ts.isT("*=")) {
      const op = ts.next().t[0];
      const rhs = parseExpr(ts);
      return { k: "assign", lhs, rhs: { k: "bin", op, a: lhs, b: rhs, line }, line };
    }
    if (ts.isT("++") || ts.isT("--")) {
      const op = ts.next().t === "++" ? "+" : "-";
      return { k: "assign", lhs, rhs: { k: "bin", op, a: lhs, b: { k: "lit", v: 1 }, line }, line };
    }
    if (ts.isT("=") && isLvalue(lhs)) {
      throw new ForgeError(`In pseudocode "=" means "is equal to". To store a value, write ← (or <-), e.g. "${lhs.name || "x"} ← ...".`, line, "syntax");
    }
    if (lhs.k === "bin" && lhs.op === "=" && isLvalue(lhs.a)) {
      throw new ForgeError(`In pseudocode "=" means "is equal to". To store a value, write ← (or <-), e.g. "${nameOf0(lhs.a)} ← …".`, line, "syntax");
    }
    if (lhs.k === "call") return { k: "expr", e: lhs, line };
    if (lhs.k === "var") throw new ForgeError(`"${lhs.name}" on its own doesn't do anything. Did you mean to assign it (x ← …) or call it (${lhs.name}(…))?`, line, "syntax");
    throw new ForgeError("This line computes a value but doesn't store it anywhere. Use ← to assign it.", line, "syntax");
  }

  /** Parse a sequence of lines at indentation > parentIndent starting at pos. */
  function parseBlock(lines, pos, parentIndent) {
    const body = [];
    if (pos >= lines.length || lines[pos].indent <= parentIndent) return { body, pos };
    const base = lines[pos].indent;
    while (pos < lines.length && lines[pos].indent > parentIndent) {
      if (lines[pos].indent !== base && lines[pos].indent > base) {
        // over-indented line without a header: treat as continuation block (be forgiving)
        const r = parseBlock(lines, pos, base);
        body.push(...r.body);
        pos = r.pos;
        continue;
      }
      if (lines[pos].indent < base) {
        throw new ForgeError("This line's indentation doesn't line up with the block above it.", lines[pos].line, "syntax");
      }
      const r = parseStatementLine(lines, pos);
      if (r.stmt) body.push(r.stmt);
      pos = r.pos;
    }
    return { body, pos };
  }

  /** Parse the statement that starts at lines[pos] (may consume following indented lines). */
  function parseStatementLine(lines, pos) {
    const L = lines[pos];
    const ts = new TokStream(L.toks, L.line);
    const stmt = parseCompound(ts, lines, pos, L);
    return stmt;
  }

  function parseCompound(ts, lines, pos, L) {
    const t = ts.peek();
    const line = L.line;
    const header = (k) => t.t === "kw" && t.v === k;

    if (header("algorithm")) throw new ForgeError("An ALGORITHM header can't be nested inside another block.", line, "syntax");

    if (header("for")) {
      ts.next();
      ts.eatWord("each");
      // for each x in S / for x in S / for (u, v) in E
      let varNode;
      if (ts.isT("(")) varNode = parsePrimary(ts, {});
      else varNode = { k: "var", name: ts.expect("id", "a loop variable name").v };
      if (ts.eatKw("in") || (ts.isT("id") && ts.peek().v === "of" && ts.next())) {
        const coll = parseExpr(ts, 0, { noIn: false });
        ts.eatKw("do");
        const { body, pos: np } = inlineOrBlock(ts, lines, pos, L);
        return { stmt: { k: "foreach", v: varNode, coll, body, line }, pos: np };
      }
      if (!ts.eat("ASSIGN") && !ts.eat("=") && !ts.eatWord("from")) throw new ForgeError('Write loops as "for i ← 0 to n - 1 do" or "for each x in A do".', line, "syntax");
      const from = parseExpr(ts);
      let dir = 1;
      if (ts.eatKw("downto")) dir = -1;
      else if (!ts.eatKw("to")) throw new ForgeError('A counting loop needs "to" or "downto", e.g. "for i ← 1 to n do".', line, "syntax");
      const to = parseExpr(ts);
      let step = null;
      if (ts.eatWord("step") || ts.eatWord("by")) step = parseExpr(ts);
      ts.eatKw("do");
      const { body, pos: np } = inlineOrBlock(ts, lines, pos, L);
      return { stmt: { k: "for", v: varNode.name, from, to, dir, step, body, line }, pos: np };
    }

    if (header("while")) {
      ts.next();
      const cond = parseExpr(ts);
      ts.eatKw("do");
      const { body, pos: np } = inlineOrBlock(ts, lines, pos, L);
      return { stmt: { k: "while", cond, body, line }, pos: np };
    }

    if (header("repeat")) {
      ts.next();
      let body, np;
      if (!ts.done()) {
        // one-line: repeat S until C
        const inner = [];
        while (!ts.done() && !ts.isKw("until")) { inner.push(parseSimple(ts, L, lines, pos)); ts.eat(";"); }
        body = inner; np = pos + 1;
        if (ts.eatKw("until")) return { stmt: { k: "repeat", body, cond: parseExpr(ts), line }, pos: np };
      } else {
        const r = parseBlock(lines, pos + 1, L.indent);
        body = r.body; np = r.pos;
      }
      if (np >= lines.length) throw new ForgeError('This "repeat" needs a matching "until" line.', line, "syntax");
      const U = lines[np];
      const uts = new TokStream(U.toks, U.line);
      if (!uts.eatKw("until")) throw new ForgeError('Expected an "until …" line to close the repeat loop.', U.line, "syntax");
      const cond = parseExpr(uts);
      return { stmt: { k: "repeat", body, cond, line }, pos: np + 1 };
    }

    if (header("if")) {
      ts.next();
      const cond = parseExpr(ts);
      ts.eatKw("then");
      ts.eat(":");
      let thenBody, np;
      let elseBody = null;
      if (!ts.done()) {
        // inline then-part; may have inline "else"
        thenBody = [];
        while (!ts.done() && !ts.isKw("else")) {
          thenBody.push(parseInlineStmt(ts, lines, pos, L));
          if (!ts.eat(";")) break;
        }
        if (ts.eatKw("else")) {
          if (ts.isKw("if")) { const r = parseCompound(ts, lines, pos, L); elseBody = [r.stmt]; np = r.pos; return { stmt: { k: "if", cond, then: thenBody, else: elseBody, line }, pos: np }; }
          elseBody = [];
          while (!ts.done()) { elseBody.push(parseInlineStmt(ts, lines, pos, L)); if (!ts.eat(";")) break; }
        }
        if (!ts.done()) throw new ForgeError(`Unexpected ${describe(ts.peek())} after the if-statement.`, line, "syntax");
        np = pos + 1;
        // block lines may still follow (e.g. "if x then" with nothing) — only when inline part empty
      } else {
        const r = parseBlock(lines, pos + 1, L.indent);
        thenBody = r.body; np = r.pos;
        if (!thenBody.length) throw new ForgeError('This "if" has no body. Indent the lines that belong to it.', line, "syntax");
      }
      // else / else if lines at same indent
      if (elseBody === null && np < lines.length && lines[np].indent === L.indent) {
        const E = lines[np];
        const ets = new TokStream(E.toks, E.line);
        if (ets.isKw("elseif") || (ets.isKw("else") && ets.isKw("if", 1))) {
          if (ets.isKw("else")) ets.next();
          // re-use if parser by faking an "if" line
          const fake = { ...E, toks: [{ t: "kw", v: "if", line: E.line }, ...ets.toks.slice(ets.i + 1)] };
          const sub = lines.slice();
          sub[np] = fake;
          const r = parseCompound(new TokStream(fake.toks, E.line), sub, np, fake);
          elseBody = [r.stmt];
          np = r.pos;
        } else if (ets.eatKw("else")) {
          ets.eat(":");
          if (!ets.done()) {
            elseBody = [];
            while (!ets.done()) { elseBody.push(parseInlineStmt(ets, lines, np, E)); if (!ets.eat(";")) break; }
            np = np + 1;
          } else {
            const r = parseBlock(lines, np + 1, E.indent);
            elseBody = r.body; np = r.pos;
          }
        }
      }
      return { stmt: { k: "if", cond, then: thenBody, else: elseBody, line }, pos: np };
    }

    if (header("else") || header("elseif")) throw new ForgeError('This "else" doesn\'t line up with an "if" above it (check the indentation).', line, "syntax");
    if (header("until")) throw new ForgeError('This "until" has no matching "repeat" above it at the same indentation.', line, "syntax");

    // simple statement(s) separated by ;
    const stmts = [];
    for (;;) {
      stmts.push(parseInlineStmt(ts, lines, pos, L));
      if (!ts.eat(";")) break;
      if (ts.done()) break;
    }
    if (!ts.done()) {
      const x = ts.peek();
      if (x.t === "kw" && (x.v === "do" || x.v === "then")) throw new ForgeError(`Unexpected "${x.v}". Did you forget "for", "while" or "if" at the start?`, line, "syntax");
      throw new ForgeError(`Unexpected ${describe(x)}. Put one statement per line (or separate them with ;).`, line, "syntax");
    }
    // a simple statement followed by an indented block is an error
    if (pos + 1 < lines.length && lines[pos + 1].indent > L.indent) {
      const nxt = lines[pos + 1];
      throw new ForgeError(`Line ${nxt.line} is indented more than line ${line}, but line ${line} doesn't start a block (for / while / if / repeat).`, nxt.line, "syntax");
    }
    return { stmt: stmts.length === 1 ? stmts[0] : { k: "block", body: stmts, line }, pos: pos + 1 };
  }

  /** A statement that appears inline (after do / then / else). Supports nested inline if/for/while. */
  function parseInlineStmt(ts, lines, pos, L) {
    const t = ts.peek();
    if (t && t.t === "kw" && (t.v === "if" || t.v === "for" || t.v === "while")) {
      // inline compound: parse on a sub-stream; its body is the rest of this line (+ following block)
      const r = parseCompound(ts, lines, pos, L);
      return r.stmt;
    }
    return parseSimple(ts, L, lines, pos);
  }

  function inlineOrBlock(ts, lines, pos, L) {
    if (!ts.done()) {
      const body = [];
      for (;;) { body.push(parseInlineStmt(ts, lines, pos, L)); if (!ts.eat(";") || ts.done()) break; }
      if (!ts.done()) throw new ForgeError(`Unexpected ${describe(ts.peek())} at the end of the loop header.`, L.line, "syntax");
      // allow extra block lines after an inline body too
      const r = parseBlock(lines, pos + 1, L.indent);
      return { body: body.concat(r.body), pos: r.pos };
    }
    const r = parseBlock(lines, pos + 1, L.indent);
    if (!r.body.length) throw new ForgeError("This loop has no body. Indent the lines that belong inside it.", L.line, "syntax");
    return r;
  }

  /** Parse an ALGORITHM header's parameter list. */
  function parseParams(ts) {
    const params = [];
    if (!ts.eat("(")) return params;
    if (ts.eat(")")) return params;
    do {
      const nameTok = ts.expect("id", "a parameter name");
      const p = { name: nameTok.v, dims: [] };
      while (ts.eat("[")) {
        do {
          const lo = parseExpr(ts);
          let hi = null;
          if (ts.eat("..")) hi = parseExpr(ts);
          p.dims.push({ lo, hi });
        } while (ts.eat(","));
        ts.expect("]", '"]"');
      }
      // optional ": type"
      if (ts.eat(":")) { while (!ts.done() && !ts.isT(",") && !ts.isT(")")) ts.next(); }
      params.push(p);
    } while (ts.eat(","));
    ts.expect(")", '")"');
    return params;
  }

  function parse(src) {
    const lines = splitLines(src);
    const algorithms = {};
    const order = [];
    const main = [];
    let pos = 0;
    while (pos < lines.length) {
      const L = lines[pos];
      const ts = new TokStream(L.toks, L.line);
      if (ts.isKw("algorithm")) {
        ts.next();
        const nameTok = ts.expect("id", "the algorithm's name");
        const params = parseParams(ts);
        ts.eat(":");
        // body: following lines until next header at indent <= L.indent
        let end = pos + 1;
        while (end < lines.length && !(lines[end].toks[0].t === "kw" && lines[end].toks[0].v === "algorithm" && lines[end].indent <= L.indent)) end++;
        const bodyLines = lines.slice(pos + 1, end);
        let body = [];
        if (bodyLines.length) {
          const minIndent = Math.min(...bodyLines.map((x) => x.indent));
          const r = parseBlock(bodyLines, 0, minIndent - 1);
          if (r.pos < bodyLines.length) throw new ForgeError("I couldn't make sense of the indentation here.", bodyLines[r.pos].line, "syntax");
          body = r.body;
        }
        if (algorithms[nameTok.v]) throw new ForgeError(`There are two algorithms named ${nameTok.v}.`, L.line, "syntax");
        algorithms[nameTok.v] = { name: nameTok.v, params, body, line: L.line };
        order.push(nameTok.v);
        pos = end;
      } else {
        // top-level statements (a "main" script)
        const r = parseStatementLine(lines, pos);
        if (r.stmt) main.push(r.stmt);
        pos = r.pos;
      }
    }
    return { algorithms, order, main, source: String(src) };
  }

  /* ------------------------------------------------------------------ */
  /* Runtime values                                                      */
  /* ------------------------------------------------------------------ */
  /** A window onto part of an array, e.g. what a callee sees for A[3..7] bound to X[0..n-1]. */
  class View {
    constructor(base, off, len) { this.base = base; this.off = off; this.len = len; }
  }
  class PQ { constructor(max) { this.h = []; this.max = !!max; this.seq = 0; } }
  const isArr = (x) => Array.isArray(x) || x instanceof View;
  const lengthOf = (x) => (x instanceof View ? x.len : x.length);
  function toArray(x) {
    if (Array.isArray(x)) return x;
    if (x instanceof View) return x.base.slice(Math.max(0, x.off), x.off + x.len);
    if (typeof x === "string") return x.split("");
    if (x instanceof Set) return [...x];
    if (x instanceof Map) return [...x.keys()];
    if (x instanceof PQ) return x.h.map((e) => e.item);
    throw new Error("not iterable");
  }

  function fmt(v, depth = 0) {
    if (v === null || v === undefined) return "null";
    if (v === Infinity) return "∞";
    if (v === -Infinity) return "-∞";
    if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(+v.toFixed(6));
    if (typeof v === "string") return depth ? JSON.stringify(v) : v;
    if (typeof v === "boolean") return v ? "true" : "false";
    if (depth > 3) return "…";
    if (isArr(v)) return "[" + toArray(v).map((x) => fmt(x, depth + 1)).join(", ") + "]";
    if (v instanceof Set) return "{" + [...v].map((x) => fmt(x, depth + 1)).join(", ") + "}";
    if (v instanceof Map) return "{" + [...v].map(([k, x]) => fmt(k, depth + 1) + ": " + fmt(x, depth + 1)).join(", ") + "}";
    if (v instanceof PQ) return "PQ" + fmt(v.h.map((e) => e.item), depth + 1);
    if (typeof v === "object") return (v.__type || "") + "{" + Object.keys(v).filter((k) => k !== "__type" && k !== "__id").map((k) => k + ": " + fmt(v[k], depth + 1)).join(", ") + "}";
    return String(v);
  }

  /** Convert runtime value → plain JS (Views flattened, Maps → objects) for test comparison. */
  function toPlain(v, seen = new Map()) {
    if (v instanceof View) return toArray(v).map((x) => toPlain(x, seen));
    if (Array.isArray(v)) { if (seen.has(v)) return seen.get(v); const out = []; seen.set(v, out); v.forEach((x) => out.push(toPlain(x, seen))); return out; }
    if (v instanceof Set) return [...v].map((x) => toPlain(x, seen));
    if (v instanceof Map) { const o = {}; for (const [k, x] of v) o[k] = toPlain(x, seen); return o; }
    if (v instanceof PQ) return v.h.map((e) => toPlain(e.item, seen));
    if (v && typeof v === "object") { if (seen.has(v)) return seen.get(v); const o = {}; seen.set(v, o); for (const k of Object.keys(v)) if (k !== "__id") o[k] = toPlain(v[k], seen); return o; }
    return v;
  }

  /* ------------------------------------------------------------------ */
  /* Interpreter                                                         */
  /* ------------------------------------------------------------------ */
  function newOps() {
    return { steps: 0, comparisons: 0, keyComparisons: 0, assignments: 0, arrayReads: 0, arrayWrites: 0, arithmetic: 0, calls: 0, swaps: 0, maxDepth: 0 };
  }

  function containsIndex(node) {
    if (!node || typeof node !== "object") return false;
    if (node.k === "index") return true;
    if (node.k === "call") return false; // key(x) style calls don't count as element access
    for (const key of ["a", "b", "e", "obj"]) if (node[key] && containsIndex(node[key])) return true;
    return false;
  }

  function run(srcOrProg, options) {
    const opt = Object.assign({ args: [], trace: false, maxSteps: 2000000, maxDepth: 3000, maxTrace: 4000, seed: 12345 }, options || {});
    const ops = newOps();
    const lineHits = {};
    const output = [];
    const trace = [];
    let prog;
    const result = { ok: false, value: undefined, args: undefined, ops, lineHits, output, trace, error: null, entry: null };
    try {
      prog = typeof srcOrProg === "string" ? parse(srcOrProg) : srcOrProg;
    } catch (e) {
      result.error = e instanceof ForgeError ? e : new ForgeError(String(e.message || e), null, "syntax");
      return result;
    }
    // seeded RNG for random()
    let seed = opt.seed >>> 0;
    const rand = () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

    let depth = 0;
    const callStack = [];
    let curLine = null;
    let touched = null; // {r:[[name,idx]], w:[[name,idx]]} for trace

    function limitCheck(line) {
      ops.steps++;
      if (ops.steps > opt.maxSteps) {
        throw new ForgeError(`Stopped after ${opt.maxSteps.toLocaleString()} steps — either a loop never ends, or the algorithm is far slower than this input size allows (e.g. exponential work where a polynomial method exists). Check that every loop's variable moves toward its end condition, and look for repeated work.`, line, "limit");
      }
    }

    function snapshotFrame(frame, line) {
      if (!opt.trace || trace.length >= opt.maxTrace) return;
      const vars = {};
      for (const [k, v] of frame.vars) {
        if (k.startsWith("__")) continue;
        vars[k] = snap(v);
      }
      trace.push({ line, fn: frame.fn, depth, vars, stack: callStack.map((c) => c.fn), touched: touched ? { r: touched.r.slice(0, 12), w: touched.w.slice(0, 12) } : null, out: output.length });
    }
    function snap(v, d = 0) {
      if (v instanceof View) return { __view: true, base: v.base.slice(0, 200).map((x) => snap(x, d + 1)), off: v.off, len: v.len };
      if (Array.isArray(v)) return d > 2 ? "[…]" : v.slice(0, 200).map((x) => snap(x, d + 1));
      if (v instanceof Map) return { __map: [...v].slice(0, 50).map(([k, x]) => [k, snap(x, d + 1)]) };
      if (v instanceof Set) return { __set: [...v].slice(0, 50) };
      if (v instanceof PQ) return { __pq: v.h.map((e) => [e.key, snap(e.item, d + 1)]) };
      if (v && typeof v === "object") return d > 2 ? "{…}" : fmt(v);
      return v;
    }

    /* ---- variable lookup ---- */
    /** Levitin often shares a counter between an outer algorithm and its recursive helper
     *  (e.g. DFS's count, Tarjan's index). A name that isn't local is looked up in the frames of
     *  the CALLING algorithms (innermost first, skipping other activations of the same algorithm),
     *  and remembered so that a later write in this frame goes to the same place. */
    function outerFrame(frame, name) {
      if (frame.outer && frame.outer.has(name)) return frame.outer.get(name);
      for (let k = callStack.length - 1; k >= 0; k--) {
        const f = callStack[k];
        if (f === frame || f.fn === frame.fn) continue;
        if (f.vars.has(name)) { (frame.outer || (frame.outer = new Map())).set(name, f); return f; }
      }
      return null;
    }
    function lookup(frame, name, line) {
      if (frame.vars.has(name)) return frame.vars.get(name);
      const of = outerFrame(frame, name);
      if (of) return of.vars.get(name);
      if (globals.has(name)) return globals.get(name);
      const lower = name.toLowerCase();
      for (const k of frame.vars.keys()) if (k.toLowerCase() === lower) throw new ForgeError(`I don't know "${name}". Did you mean "${k}"? (Names are case-sensitive.)`, line);
      if (prog.algorithms[name] || BUILTINS[name]) throw new ForgeError(`"${name}" is an algorithm/function — call it with parentheses: ${name}(…).`, line);
      throw new ForgeError(`I don't know the variable "${name}" yet. Give it a value first (e.g. ${name} ← 0) or check the spelling.`, line);
    }

    /* ---- indexing ---- */
    function checkIndex(obj, i, line, nameHint) {
      if (typeof i !== "number" || !Number.isFinite(i)) throw new ForgeError(`Array index must be a number, but got ${fmt(i, 1)}.`, line);
      if (!Number.isInteger(i)) throw new ForgeError(`Array index ${fmt(i)} isn't a whole number. Use ⌊…⌋ or div to round down.`, line);
      const len = lengthOf(obj);
      if (i < 0 || i >= len) throw new ForgeError(`Index ${i} is outside ${nameHint || "the array"}[0..${len - 1}]${len === 0 ? " (the array is empty)" : ""}.`, line);
    }
    function getIndex(obj, i, line, nameHint) {
      if (obj instanceof Map) {
        const key = mapKey(i);
        if (!obj.has(key)) return null; // a missing key reads as null (contains(M, key) tests explicitly)
        return obj.get(key);
      }
      if (typeof obj === "string") { checkIndex(obj, i, line, nameHint); return obj[i]; }
      if (obj instanceof View) { checkIndex(obj, i, line, nameHint); ops.arrayReads++; const v = obj.base[obj.off + i]; if (v === undefined) throw new ForgeError(`${nameHint || "The array"}[${i}] has not been given a value yet.`, line); return v; }
      if (Array.isArray(obj)) {
        checkIndex(obj, i, line, nameHint);
        ops.arrayReads++;
        const v = obj[i];
        if (v === undefined) throw new ForgeError(`${nameHint || "The array"}[${i}] has not been given a value yet.`, line);
        return v;
      }
      if (obj === null || obj === undefined) throw new ForgeError(`Can't index into null${nameHint ? ` (${nameHint} is null)` : ""}.`, line);
      throw new ForgeError(`${nameHint || "This value"} is not an array, so it can't be indexed with [ ].`, line);
    }
    function setIndex(obj, i, v, line, nameHint) {
      if (obj instanceof Map) { obj.set(mapKey(i), v); return; }
      if (typeof obj === "string") throw new ForgeError("Text (strings) can't be changed in place. Build a new array of characters instead.", line);
      if (obj instanceof View) { checkIndex(obj, i, line, nameHint); ops.arrayWrites++; obj.base[obj.off + i] = v; return; }
      if (Array.isArray(obj)) {
        if (typeof i !== "number" || !Number.isInteger(i) || i < 0) throw new ForgeError(`Can't store at index ${fmt(i, 1)} — indexes are whole numbers ≥ 0.`, line);
        if (i > obj.length + 1000000) throw new ForgeError(`Index ${i} is far past the end of the array (length ${obj.length}).`, line);
        ops.arrayWrites++;
        obj[i] = v; // auto-extends (handy for building result arrays)
        return;
      }
      throw new ForgeError(`${nameHint || "This value"} is not an array, so you can't store into it with [ ].`, line);
    }
    function mapKey(k) { return isArr(k) ? JSON.stringify(toPlain(k)) : k; }
    function nameOf(node) {
      if (!node) return null;
      if (node.k === "var") return node.name;
      if (node.k === "index") { const b = nameOf(node.obj); return b ? b + "[…]" : null; }
      if (node.k === "field") { const b = nameOf(node.obj); return b ? b + "." + node.name : null; }
      return null;
    }

    /* ---- expression evaluation ---- */
    function num(v, line, what) {
      if (typeof v === "number") return v;
      if (typeof v === "boolean") return v ? 1 : 0;
      throw new ForgeError(`${what || "Arithmetic"} needs numbers, but got ${fmt(v, 1)}${v === null ? " (null)" : ""}.`, line);
    }
    function eq(a, b) {
      if (a === b) return true;
      if (typeof a === "number" && typeof b === "number") return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
      if (isArr(a) && isArr(b)) { const x = toArray(a), y = toArray(b); return x.length === y.length && x.every((v, k) => eq(v, y[k])); }
      if ((a === null || a === undefined) && (b === null || b === undefined)) return true;
      return false;
    }
    function cmp(a, b, line) {
      if (typeof a === "number" && typeof b === "number") return a < b ? -1 : a > b ? 1 : 0;
      if (typeof a === "string" && typeof b === "string") return a < b ? -1 : a > b ? 1 : 0;
      if (isArr(a) && isArr(b)) { // lexicographic (useful for pairs)
        const x = toArray(a), y = toArray(b);
        for (let k = 0; k < Math.min(x.length, y.length); k++) { const c = cmp(x[k], y[k], line); if (c) return c; }
        return x.length - y.length;
      }
      if (typeof a === "boolean" && typeof b === "boolean") return (a ? 1 : 0) - (b ? 1 : 0);
      throw new ForgeError(`Can't compare ${fmt(a, 1)} with ${fmt(b, 1)} using < or >.`, line);
    }
    function truthy(v, line) {
      if (typeof v === "boolean") return v;
      if (v === null || v === undefined) return false;
      if (typeof v === "number") return v !== 0;
      throw new ForgeError(`A condition must be true or false, but this one is ${fmt(v, 1)}.`, line);
    }

    function evaluate(e, frame) {
      switch (e.k) {
        case "lit": return e.v;
        case "var": return lookup(frame, e.name, e.line || curLine);
        case "list": return e.items.map((x) => evaluate(x, frame));
        case "setlit": return new Set(e.items.map((x) => evaluate(x, frame)));
        case "neg": ops.arithmetic++; return -num(evaluate(e.e, frame), curLine);
        case "not": return !truthy(evaluate(e.e, frame), curLine);
        case "floor": return Math.floor(num(evaluate(e.e, frame), curLine, "⌊ ⌋"));
        case "ceil": return Math.ceil(num(evaluate(e.e, frame), curLine, "⌈ ⌉"));
        case "abs": return Math.abs(num(evaluate(e.e, frame), curLine));
        case "index": {
          const obj = evaluate(e.obj, frame);
          const i = evaluate(e.idx, frame);
          const r = getIndex(obj, i, curLine, nameOf(e.obj));
          if (touched && e.obj.k === "var") touched.r.push([e.obj.name, i]);
          return r;
        }
        case "slice": {
          const obj = evaluate(e.obj, frame);
          const lo = num(evaluate(e.lo, frame), curLine), hi = num(evaluate(e.hi, frame), curLine);
          return sliceCopy(obj, lo, hi, nameOf(e.obj));
        }
        case "field": {
          const obj = evaluate(e.obj, frame);
          if (obj === null || obj === undefined) throw new ForgeError(`Can't read .${e.name} of null (${nameOf(e.obj) || "the value"} is null).`, curLine);
          if (e.name === "length" || e.name === "size") { if (isArr(obj) || typeof obj === "string") return lengthOf(obj); if (obj instanceof Map || obj instanceof Set) return obj.size; }
          if (typeof obj !== "object") throw new ForgeError(`${fmt(obj, 1)} has no field "${e.name}".`, curLine);
          return obj[e.name] === undefined ? null : obj[e.name];
        }
        case "new": {
          const o = { __type: e.type };
          for (const f of e.fields || []) o[f.name] = evaluate(f.e, frame);
          return o;
        }
        case "call": return callFn(e, frame);
        case "bin": return evalBin(e, frame);
      }
      throw new ForgeError("Unknown expression.", curLine);
    }

    /** Built-ins are not free: charge their real work to the step counter so the efficiency (growth) check
     *  sees a linear scan hidden inside contains(…)/indexOf(…)/x in L, an O(n log n) sorted(…), etc. */
    function charge(k) {
      if (!(k > 0)) return;
      ops.steps += Math.ceil(k);
      if (ops.steps > opt.maxSteps) limitCheck(curLine);
    }
    const lg = (n) => Math.max(1, Math.ceil(Math.log2(Math.max(2, n))));
    function sliceCopy(obj, lo, hi, name) {
      if (typeof obj === "string") { charge(hi - lo + 1); return obj.slice(lo, hi + 1); }
      if (!isArr(obj)) throw new ForgeError(`${name || "This value"} is not an array, so it can't be sliced with [a..b].`, curLine);
      const len = lengthOf(obj);
      if (hi < lo) return [];
      if (lo < 0 || hi >= len) throw new ForgeError(`The range [${lo}..${hi}] goes outside ${name || "the array"}[0..${len - 1}].`, curLine);
      const base = obj instanceof View ? obj.base : obj, off = obj instanceof View ? obj.off : 0;
      ops.arrayReads += hi - lo + 1;
      charge(hi - lo + 1);
      return base.slice(off + lo, off + hi + 1);
    }

    function evalBin(e, frame) {
      const op = e.op;
      if (op === "and") { const a = evaluate(e.a, frame); if (!truthy(a, curLine)) return false; return truthy(evaluate(e.b, frame), curLine); }
      if (op === "or") { const a = evaluate(e.a, frame); if (truthy(a, curLine)) return true; return truthy(evaluate(e.b, frame), curLine); }
      if (op === "xor") { return truthy(evaluate(e.a, frame), curLine) !== truthy(evaluate(e.b, frame), curLine); }
      const a = evaluate(e.a, frame);
      const b = evaluate(e.b, frame);
      switch (op) {
        case "=": case "!=": case "<": case "<=": case ">": case ">=": {
          ops.comparisons++;
          if (e.isKey === undefined) e.isKey = containsIndex(e.a) || containsIndex(e.b);
          if (e.isKey) ops.keyComparisons++;
          if (op === "=") return eq(a, b);
          if (op === "!=") return !eq(a, b);
          const c = cmp(a, b, curLine);
          return op === "<" ? c < 0 : op === "<=" ? c <= 0 : op === ">" ? c > 0 : c >= 0;
        }
        case "in": {
          if (b instanceof Map) return b.has(mapKey(a));
          if (b instanceof Set) return b.has(a);
          if (typeof b === "string") { charge(b.length); return b.includes(a); }
          if (isArr(b)) { charge(lengthOf(b)); return toArray(b).some((x) => eq(x, a)); }
          throw new ForgeError(`"in" needs a list, set, map or text on the right.`, curLine);
        }
        case "+":
          ops.arithmetic++;
          if (typeof a === "string" || typeof b === "string") return fmt(a) + fmt(b);
          if (isArr(a) && isArr(b)) return toArray(a).concat(toArray(b));
          return num(a, curLine, "+") + num(b, curLine, "+");
        case "-": ops.arithmetic++; return num(a, curLine, "−") - num(b, curLine, "−");
        case "*": ops.arithmetic++; return num(a, curLine, "×") * num(b, curLine, "×");
        case "/": {
          ops.arithmetic++;
          const d = num(b, curLine, "/");
          if (d === 0) throw new ForgeError("Division by zero.", curLine);
          return num(a, curLine, "/") / d;
        }
        case "div": {
          ops.arithmetic++;
          const d = num(b, curLine, "div");
          if (d === 0) throw new ForgeError("Division by zero (div).", curLine);
          return Math.floor(num(a, curLine, "div") / d);
        }
        case "mod": {
          ops.arithmetic++;
          const d = num(b, curLine, "mod");
          if (d === 0) throw new ForgeError("mod by zero.", curLine);
          const x = num(a, curLine, "mod");
          return ((x % d) + d) % d;
        }
        case "^": ops.arithmetic++; return Math.pow(num(a, curLine, "^"), num(b, curLine, "^"));
      }
      throw new ForgeError(`Unknown operator ${op}.`, curLine);
    }

    /* ---- assignment targets ---- */
    function assignTo(lhs, v, frame) {
      ops.assignments++;
      if (lhs.k === "var") {
        if (!frame.vars.has(lhs.name) && frame.outer && frame.outer.has(lhs.name)) { frame.outer.get(lhs.name).vars.set(lhs.name, v); return; }
        if (!frame.vars.has(lhs.name) && globals.has(lhs.name)) { globals.set(lhs.name, v); return; }
        frame.vars.set(lhs.name, v);
        return;
      }
      if (lhs.k === "index") {
        const obj = evaluate(lhs.obj, frame);
        const i = evaluate(lhs.idx, frame);
        setIndex(obj, i, v, curLine, nameOf(lhs.obj));
        if (touched && lhs.obj.k === "var") touched.w.push([lhs.obj.name, i]);
        return;
      }
      if (lhs.k === "field") {
        const obj = evaluate(lhs.obj, frame);
        if (obj === null || obj === undefined || typeof obj !== "object") throw new ForgeError(`Can't set .${lhs.name} on ${fmt(obj, 1)}.`, curLine);
        obj[lhs.name] = v;
        return;
      }
      if (lhs.k === "list") {
        const vals = isArr(v) ? toArray(v) : null;
        if (!vals || vals.length !== lhs.items.length) throw new ForgeError(`Can't unpack ${fmt(v, 1)} into ${lhs.items.length} variables.`, curLine);
        lhs.items.forEach((t, k) => assignTo(t, vals[k], frame));
        ops.assignments--; // counted per element
        return;
      }
      if (lhs.k === "slice") {
        const obj = evaluate(lhs.obj, frame);
        const lo = num(evaluate(lhs.lo, frame), curLine);
        const src = toArray(v);
        src.forEach((x, k) => setIndex(obj, lo + k, x, curLine, nameOf(lhs.obj)));
        return;
      }
      throw new ForgeError("Can't assign to this.", curLine);
    }

    /* ---- calls ---- */
    function callFn(e, frame) {
      const algo = prog.algorithms[e.name];
      if (algo) {
        // bind arguments: slices passed to calls become views (by reference)
        const vals = e.args.map((a) => (a.k === "slice" ? makeViewArg(a, frame) : evaluate(a, frame)));
        return invoke(algo, vals, e.line || curLine);
      }
      const CAP_OK = /^(Random|Min|Max|Length|Abs|Floor|Ceil|Sqrt|Log2|Append|Push|Pop|Enqueue|Dequeue|IsEmpty|Print)$/;
      const b = BUILTINS[e.name] || (e.name === e.name.toUpperCase() || CAP_OK.test(e.name) ? BUILTINS[e.name.toLowerCase()] || BUILTINS[Object.keys(BUILTINS).find((k) => k.toLowerCase() === e.name.toLowerCase())] : undefined);
      if (b) {
        const vals = e.args.map((a) => evaluate(a, frame));
        return b(vals, curLine, e);
      }
      const near = Object.keys(prog.algorithms).find((k) => k.toLowerCase() === e.name.toLowerCase());
      if (near) throw new ForgeError(`There's no algorithm "${e.name}" — did you mean "${near}"?`, curLine);
      throw new ForgeError(`I don't know a function or algorithm called "${e.name}".`, curLine);
    }
    function makeViewArg(a, frame) {
      const obj = evaluate(a.obj, frame);
      const lo = num(evaluate(a.lo, frame), curLine), hi = num(evaluate(a.hi, frame), curLine);
      if (typeof obj === "string") return { __slice: true, base: obj, lo, hi };
      if (!isArr(obj)) throw new ForgeError(`${nameOf(a.obj) || "This value"} is not an array, so it can't be sliced.`, curLine);
      const base = obj instanceof View ? obj.base : obj, off = obj instanceof View ? obj.off : 0;
      const len = lengthOf(obj);
      if (hi >= lo && (lo < 0 || hi >= len)) throw new ForgeError(`The range [${lo}..${hi}] goes outside ${nameOf(a.obj) || "the array"}[0..${len - 1}].`, curLine);
      return { __slice: true, base, off, lo, hi, parentOff: off };
    }

    function bindParam(p, v, frame, line) {
      // plain parameter
      if (!p.dims.length) {
        if (v && v.__slice) v = sliceArgToValue(v);
        frame.vars.set(p.name, v);
        return;
      }
      const d = p.dims[0];
      // header A[lo..hi]
      let arr = v, argLo = 0, argHi;
      if (v && v.__slice) {
        if (typeof v.base === "string") { arr = v.base.slice(v.lo, v.hi + 1); argLo = 0; argHi = arr.length - 1; }
        else { arr = v; argLo = v.lo; argHi = v.hi; }
      } else if (isArr(v) || typeof v === "string") {
        argLo = 0; argHi = lengthOf(v) - 1;
      } else {
        // scalar passed where an array was declared — just bind it
        frame.vars.set(p.name, v);
        return;
      }
      const loIsVar = d.lo && d.lo.k === "var";
      if (loIsVar) {
        // A[l..r] style: bind the whole underlying array + the bounds
        const base = v && v.__slice ? (v.off ? new View(v.base, v.off, v.base.length - v.off) : v.base) : v;
        frame.vars.set(p.name, base);
        frame.vars.set(d.lo.name, argLo);
        if (d.hi) bindHi(d.hi, argHi, frame, argLo);
      } else {
        // A[0..n-1] style: callee indexes from its own lo (usually 0; A[1..n] also works)
        const c = d.lo ? num(evaluate(d.lo, frame), line) : 0;
        const count = Math.max(0, argHi - argLo + 1);
        let val;
        if (v && v.__slice && typeof v.base !== "string") {
          const absStart = (v.off || 0) + argLo; // where the caller's slice begins in the base array
          if (c === 0 && absStart === 0 && count === v.base.length) val = v.base;
          else val = new View(v.base, absStart - c, count + c); // callee index c ↦ base[absStart]
        } else if (c === 0) val = arr;
        else if (typeof arr === "string") val = new View(arr.split(""), -c, count + c);
        else if (arr instanceof View) {
          // re-base an existing view: its real elements start at base[max(off, 0)]
          const realStart = Math.max(0, arr.off), realCount = arr.len - (realStart - arr.off);
          val = new View(arr.base, realStart - c, realCount + c);
          if (d.hi) { bindHi(d.hi, c + realCount - 1, frame, c); frame.vars.set(p.name, val); return; }
        }
        else if (isArr(arr)) val = new View(arr, -c, count + c);
        else val = arr;
        frame.vars.set(p.name, val);
        if (d.hi) bindHi(d.hi, c + count - 1, frame, c);
      }
      // 2-D: M[0..n-1, 0..m-1]
      if (p.dims.length > 1 && isArr(frame.vars.get(p.name))) {
        const rows = toArray(frame.vars.get(p.name));
        const d2 = p.dims[1];
        if (rows.length && isArr(rows[0]) && d2.hi) bindHi(d2.hi, lengthOf(rows[0]) - 1, frame, 0);
      }
    }
    function bindHi(hiExpr, hiVal, frame) {
      // hi written as  n-1  → n = hiVal+1 ;  as  n → n = hiVal ; as a constant → ignore
      if (hiExpr.k === "var") { if (!frame.vars.has(hiExpr.name)) frame.vars.set(hiExpr.name, hiVal); return; }
      if (hiExpr.k === "bin" && (hiExpr.op === "-" || hiExpr.op === "+") && hiExpr.a.k === "var" && hiExpr.b.k === "lit") {
        const v = hiExpr.op === "-" ? hiVal + hiExpr.b.v : hiVal - hiExpr.b.v;
        if (!frame.vars.has(hiExpr.a.name)) frame.vars.set(hiExpr.a.name, v);
      }
    }
    function sliceArgToValue(s) {
      if (typeof s.base === "string") return s.base.slice(s.lo, s.hi + 1);
      return new View(s.base, (s.off || 0) + s.lo, Math.max(0, s.hi - s.lo + 1));
    }

    const globals = new Map();
    let returnedFromEntry = false;

    function invoke(algo, vals, line) {
      ops.calls++;
      depth++;
      if (depth > ops.maxDepth) ops.maxDepth = depth;
      if (depth > opt.maxDepth) throw new ForgeError(`Recursion went more than ${opt.maxDepth} calls deep — is your base case reached? (Check the "if n = …" that stops the recursion.)`, line, "limit");
      const frame = { fn: algo.name, vars: new Map() };
      if (vals.length !== algo.params.length) {
        throw new ForgeError(`${algo.name} expects ${algo.params.length} input${algo.params.length === 1 ? "" : "s"} (${algo.params.map((p) => p.name).join(", ")}) but was given ${vals.length}.`, line);
      }
      algo.params.forEach((p, k) => bindParam(p, vals[k], frame, line));
      callStack.push(frame);
      try {
        execBlock(algo.body, frame);
        return null;
      } catch (sig) {
        if (sig instanceof ReturnSignal) { if (depth === 1) returnedFromEntry = true; return sig.value; }
        if (sig === BREAK || sig === CONTINUE) throw new ForgeError(`"${sig.signal}" was used outside of a loop.`, curLine, "syntax");
        throw sig;
      } finally {
        callStack.pop();
        depth--;
      }
    }

    /* ---- statements ---- */
    function execBlock(body, frame) {
      for (const s of body) exec(s, frame);
    }
    function hit(line) { lineHits[line] = (lineHits[line] || 0) + 1; }

    function exec(s, frame) {
      curLine = s.line || curLine;
      if (s.k !== "block") { limitCheck(s.line); hit(s.line); }
      if (opt.trace) touched = { r: [], w: [] };
      switch (s.k) {
        case "block": execBlock(s.body, frame); return;
        case "assign": {
          let v = evaluate(s.rhs, frame);
          if (v && v.__slice) v = sliceArgToValue(v);
          assignTo(s.lhs, v, frame);
          snapshotFrame(frame, s.line);
          return;
        }
        case "expr": evaluate(s.e, frame); snapshotFrame(frame, s.line); return;
        case "print": {
          const txt = s.items.map((x) => fmt(evaluate(x, frame))).join(" ");
          output.push(txt);
          if (opt.onPrint) opt.onPrint(txt);
          snapshotFrame(frame, s.line);
          return;
        }
        case "return": {
          const v = s.e ? evaluate(s.e, frame) : null;
          snapshotFrame(frame, s.line);
          throw new ReturnSignal(v && v.__slice ? sliceArgToValue(v) : v);
        }
        case "break": throw BREAK;
        case "continue": throw CONTINUE;
        case "swap": {
          // freeze the index expressions first, so "swap x and T[x]" writes to the T[x] it read
          const freeze = (lhs) => (lhs && lhs.k === "index" ? { ...lhs, obj: freeze(lhs.obj), idx: { k: "lit", v: evaluate(lhs.idx, frame) } } : lhs);
          const ta = freeze(s.a), tb = freeze(s.b);
          const a = evaluate(ta, frame), b = evaluate(tb, frame);
          ops.swaps++;
          assignTo(ta, b, frame);
          assignTo(tb, a, frame);
          ops.assignments -= 2;
          snapshotFrame(frame, s.line);
          return;
        }
        case "copyto": {
          const src = evaluate(s.src, frame);
          const vals = toArray(src);
          if (s.dst.k === "slice") {
            let obj;
            try { obj = evaluate(s.dst.obj, frame); } catch (e) { obj = []; assignTo(s.dst.obj, obj, frame); }
            const lo = num(evaluate(s.dst.lo, frame), curLine);
            vals.forEach((x, k) => setIndex(obj, lo + k, x, curLine, nameOf(s.dst.obj)));
          } else assignTo(s.dst, vals.slice(), frame);
          snapshotFrame(frame, s.line);
          return;
        }
        case "if": {
          const c = truthy(evaluate(s.cond, frame), s.line);
          snapshotFrame(frame, s.line);
          if (c) execBlock(s.then, frame);
          else if (s.else) execBlock(s.else, frame);
          return;
        }
        case "while": {
          for (;;) {
            curLine = s.line;
            limitCheck(s.line);
            hit(s.line);
            if (opt.trace) touched = { r: [], w: [] };
            const c = truthy(evaluate(s.cond, frame), s.line);
            snapshotFrame(frame, s.line);
            if (!c) break;
            try { execBlock(s.body, frame); } catch (sig) { if (sig === BREAK) break; if (sig === CONTINUE) continue; throw sig; }
          }
          return;
        }
        case "repeat": {
          for (;;) {
            try { execBlock(s.body, frame); } catch (sig) { if (sig === BREAK) break; if (sig !== CONTINUE) throw sig; }
            curLine = s.line;
            limitCheck(s.line);
            if (truthy(evaluate(s.cond, frame), s.line)) break;
          }
          return;
        }
        case "for": {
          const from = num(evaluate(s.from, frame), s.line, "The loop start");
          const to = num(evaluate(s.to, frame), s.line, "The loop end");
          const step = s.step ? num(evaluate(s.step, frame), s.line, "The loop step") : 1;
          if (step <= 0) throw new ForgeError("A loop step must be positive (use downto to count down).", s.line);
          ops.assignments++;
          for (let i = from; s.dir > 0 ? i <= to : i >= to; i += s.dir * step) {
            frame.vars.set(s.v, i);
            curLine = s.line;
            if (opt.trace) touched = { r: [], w: [] };
            snapshotFrame(frame, s.line);
            try { execBlock(s.body, frame); } catch (sig) { if (sig === BREAK) break; if (sig === CONTINUE) { continue; } throw sig; }
            limitCheck(s.line);
            hit(s.line);
          }
          return;
        }
        case "foreach": {
          const coll = evaluate(s.coll, frame);
          let items;
          try { items = toArray(coll); } catch (e) { throw new ForgeError(`Can't loop over ${fmt(coll, 1)} — "for each" needs a list, set, map or text.`, s.line); }
          items = items.slice();
          for (const x of items) {
            assignTo(s.v, x, frame);
            ops.assignments--;
            curLine = s.line;
            if (opt.trace) touched = { r: [], w: [] };
            snapshotFrame(frame, s.line);
            try { execBlock(s.body, frame); } catch (sig) { if (sig === BREAK) break; if (sig === CONTINUE) continue; throw sig; }
            limitCheck(s.line);
            hit(s.line);
          }
          return;
        }
      }
      throw new ForgeError("Unknown statement.", s.line);
    }

    /* ---- built-in functions ---- */
    const need = (vals, n, name, line) => { if (vals.length < n) throw new ForgeError(`${name}(…) needs ${n} input${n === 1 ? "" : "s"}.`, line); };
    /** priorities may be numbers, strings or tuples/lists (compared element by element, like < on lists) */
    function keyCmp(a, b) {
      if (isArr(a) && isArr(b)) {
        const x = toArray(a), y = toArray(b);
        for (let k = 0; k < Math.min(x.length, y.length); k++) { const c = keyCmp(x[k], y[k]); if (c) return c; }
        return x.length - y.length;
      }
      return a < b ? -1 : a > b ? 1 : 0;
    }
    function pqPush(q, item, key) {
      const h = q.h; const node = { key, item, seq: q.seq++ };
      charge(lg(h.length + 1));
      h.push(node);
      let i = h.length - 1;
      const less = (a, b) => { const c = keyCmp(a.key, b.key); return q.max ? (c > 0 || (c === 0 && a.seq < b.seq)) : (c < 0 || (c === 0 && a.seq < b.seq)); };
      while (i > 0) { const p = (i - 1) >> 1; if (less(h[i], h[p])) { [h[i], h[p]] = [h[p], h[i]]; i = p; } else break; }
    }
    function pqPop(q, line) {
      const h = q.h;
      if (!h.length) throw new ForgeError("Can't remove from an empty priority queue.", line);
      charge(lg(h.length));
      const less = (a, b) => { const c = keyCmp(a.key, b.key); return q.max ? (c > 0 || (c === 0 && a.seq < b.seq)) : (c < 0 || (c === 0 && a.seq < b.seq)); };
      const top = h[0], last = h.pop();
      if (h.length) {
        h[0] = last;
        let i = 0;
        for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < h.length && less(h[l], h[m])) m = l; if (r < h.length && less(h[r], h[m])) m = r; if (m === i) break; [h[i], h[m]] = [h[m], h[i]]; i = m; }
      }
      return top;
    }
    const BUILTINS = {
      length: (v, line) => { need(v, 1, "length", line); const x = v[0]; if (isArr(x) || typeof x === "string") return lengthOf(x); if (x instanceof Map || x instanceof Set) return x.size; if (x instanceof PQ) return x.h.length; throw new ForgeError(`length(…) needs an array or text, not ${fmt(x, 1)}.`, line); },
      array: (v, line) => { need(v, 1, "array", line); const n = num(v[0], line, "array size"); if (n < 0 || !Number.isInteger(n)) throw new ForgeError("array(n) needs a whole number n ≥ 0.", line); const fill = v.length > 1 ? v[1] : 0; return Array.from({ length: n }, () => (isArr(fill) ? toArray(fill).slice() : fill)); },
      matrix: (v, line) => { need(v, 2, "matrix", line); const r = num(v[0], line), c = num(v[1], line); const fill = v.length > 2 ? v[2] : 0; return Array.from({ length: r }, () => Array.from({ length: c }, () => fill)); },
      min: (v, line) => { const overArray = v.length === 1 && isArr(v[0]); const xs = overArray ? toArray(v[0]) : v; charge(xs.length - 1); if (!xs.length) throw new ForgeError("min of nothing.", line); ops.comparisons += xs.length - 1; if (overArray) ops.keyComparisons += xs.length - 1; return xs.reduce((a, b) => (cmp(b, a, line) < 0 ? b : a)); },
      max: (v, line) => { const overArray = v.length === 1 && isArr(v[0]); const xs = overArray ? toArray(v[0]) : v; charge(xs.length - 1); if (!xs.length) throw new ForgeError("max of nothing.", line); ops.comparisons += xs.length - 1; if (overArray) ops.keyComparisons += xs.length - 1; return xs.reduce((a, b) => (cmp(b, a, line) > 0 ? b : a)); },
      abs: (v, line) => Math.abs(num(v[0], line)),
      sqrt: (v, line) => { const x = num(v[0], line); if (x < 0) throw new ForgeError("sqrt of a negative number.", line); return Math.sqrt(x); },
      floor: (v, line) => Math.floor(num(v[0], line)),
      ceil: (v, line) => Math.ceil(num(v[0], line)),
      round: (v, line) => Math.round(num(v[0], line)),
      trunc: (v, line) => Math.trunc(num(v[0], line)),
      log2: (v, line) => Math.log2(num(v[0], line)),
      lg: (v, line) => Math.log2(num(v[0], line)),
      "log₂": (v, line) => Math.log2(num(v[0], line)),
      ln: (v, line) => Math.log(num(v[0], line)),
      log: (v, line) => (v.length > 1 ? Math.log(num(v[0], line)) / Math.log(num(v[1], line)) : Math.log2(num(v[0], line))),
      exp: (v, line) => Math.exp(num(v[0], line)),
      pow: (v, line) => Math.pow(num(v[0], line), num(v[1], line)),
      sin: (v, line) => Math.sin(num(v[0], line)), cos: (v, line) => Math.cos(num(v[0], line)),
      int: (v, line) => (typeof v[0] === "string" ? parseInt(v[0], 10) : Math.trunc(num(v[0], line))),
      str: (v) => fmt(v[0]),
      ord: (v, line) => { if (typeof v[0] !== "string") throw new ForgeError("ord(c) needs a character.", line); return v[0].charCodeAt(0); },
      chr: (v, line) => String.fromCharCode(num(v[0], line)),
      even: (v, line) => num(v[0], line) % 2 === 0,
      odd: (v, line) => Math.abs(num(v[0], line) % 2) === 1,
      random: (v, line) => { if (!v.length) return rand(); const a = num(v[0], line), b = num(v[1], line); return a + Math.floor(rand() * (b - a + 1)); },
      copy: (v, line) => { const x = v[0]; if (isArr(x)) charge(lengthOf(x)); else if (x instanceof Map || x instanceof Set) charge(x.size); const deep = (a) => toArray(a).map((y) => (isArr(y) ? deep(y) : y)); if (isArr(x)) return deep(x); if (x instanceof Map) return new Map(x); if (x instanceof Set) return new Set(x); if (x && typeof x === "object") return { ...x }; return x; },
      sum: (v, line) => { const xs = v.length === 1 && isArr(v[0]) ? toArray(v[0]) : v; charge(xs.length - 1); ops.arithmetic += Math.max(0, xs.length - 1); return xs.reduce((a, b) => a + num(b, line), 0); },
      sorted: (v, line) => { const xs = toArray(v[0]).slice(); const w = xs.length > 1 ? xs.length * lg(xs.length) : 0; charge(w); ops.comparisons += w; xs.sort((a, b) => cmp(a, b, line)); return xs; },
      reverse: (v, line) => { const x = v[0]; if (isArr(x) || typeof x === "string") charge(lengthOf(x)); if (Array.isArray(x)) { x.reverse(); return x; } if (typeof x === "string") return x.split("").reverse().join(""); return toArray(x).reverse(); },
      reversed: (v) => (charge(isArr(v[0]) || typeof v[0] === "string" ? lengthOf(v[0]) : 0), typeof v[0] === "string" ? v[0].split("").reverse().join("") : toArray(v[0]).slice().reverse()),
      range: (v, line) => { const a = v.length > 1 ? num(v[0], line) : 0, b = v.length > 1 ? num(v[1], line) : num(v[0], line) - 1; const out = []; for (let i = a; i <= b; i++) out.push(i); charge(out.length); return out; },
      append: (v, line) => { need(v, 2, "append", line); if (!Array.isArray(v[0])) throw new ForgeError("append(L, x) needs a list L.", line); v[0].push(v[1]); ops.arrayWrites++; return v[0]; },
      insertAt: (v, line) => { charge(lengthOf(v[0]) - num(v[1], line) + 1); v[0].splice(num(v[1], line), 0, v[2]); return v[0]; },
      removeAt: (v, line) => { const i = num(v[1], line); checkIndex(v[0], i, line); charge(lengthOf(v[0]) - i); return v[0].splice(i, 1)[0]; },
      removeLast: (v, line) => { if (!lengthOf(v[0])) throw new ForgeError("removeLast on an empty list.", line); return v[0].pop(); },
      concat: (v) => (charge(v.reduce((a, x) => a + (isArr(x) ? lengthOf(x) : 1), 0)), v).reduce((acc, x) => acc.concat(toArray(x)), []),
      indexOf: (v) => { const xs = toArray(v[0]); for (let k = 0; k < xs.length; k++) if (eq(xs[k], v[1])) { charge(k + 1); return k; } charge(xs.length); return -1; },
      // stacks & queues (plain arrays under the hood so they display nicely)
      stack: () => [], queue: () => [], list: () => [],
      push: (v, line) => { need(v, 2, "push", line); v[0].push(v[1]); return v[0]; },
      pop: (v, line) => { if (!lengthOf(v[0])) throw new ForgeError("pop from an empty stack.", line); return v[0].pop(); },
      top: (v, line) => { if (!lengthOf(v[0])) throw new ForgeError("top of an empty stack.", line); return v[0][v[0].length - 1]; },
      peek: (v, line) => { if (v[0] instanceof PQ) { if (!v[0].h.length) throw new ForgeError("peek at an empty priority queue.", line); return v[0].h[0].item; } if (!lengthOf(v[0])) throw new ForgeError("peek at an empty stack.", line); return v[0][v[0].length - 1]; },
      enqueue: (v, line) => { need(v, 2, "enqueue", line); v[0].push(v[1]); return v[0]; },
      dequeue: (v, line) => { if (!lengthOf(v[0])) throw new ForgeError("dequeue from an empty queue.", line); return v[0].shift(); },
      front: (v, line) => { if (!lengthOf(v[0])) throw new ForgeError("front of an empty queue.", line); return v[0][0]; },
      isEmpty: (v) => { const x = v[0]; if (x instanceof PQ) return x.h.length === 0; if (x instanceof Map || x instanceof Set) return x.size === 0; return lengthOf(x) === 0; },
      empty: (v) => BUILTINS.isEmpty(v),
      size: (v, line) => BUILTINS.length(v, line),
      // maps & sets
      map: () => new Map(), dict: () => new Map(),
      set: (v) => new Set(v.length ? toArray(v[0]) : []),
      contains: (v, line) => { const [c, k] = v; if (c instanceof Map) return c.has(mapKey(k)); if (c instanceof Set) return c.has(k); if (typeof c === "string") { charge(c.length); return c.includes(k); } charge(lengthOf(c)); return toArray(c).some((x) => eq(x, k)); },
      add: (v, line) => { if (!(v[0] instanceof Set)) throw new ForgeError("add(S, x) needs a set S (make one with set()).", line); v[0].add(v[1]); return v[0]; },
      remove: (v, line) => { const [c, k] = v; if (c instanceof Map) c.delete(mapKey(k)); else if (c instanceof Set) c.delete(k); else throw new ForgeError("remove(C, x) needs a map or a set.", line); return c; },
      keys: (v) => (charge(v[0].size), [...v[0].keys()]),
      values: (v) => (charge(v[0].size), [...v[0].values()]),
      get: (v, line) => { const [m, k, d] = v; if (m instanceof Map) return m.has(mapKey(k)) ? m.get(mapKey(k)) : (v.length > 2 ? d : null); return getIndex(m, k, line); },
      // priority queues (min by default)
      priorityQueue: () => new PQ(false), minPQ: () => new PQ(false), maxPQ: () => new PQ(true), pq: () => new PQ(false),
      insert: (v, line) => { if (!(v[0] instanceof PQ)) throw new ForgeError("insert(Q, item, priority) needs a priority queue (make one with priorityQueue()).", line); pqPush(v[0], v[1], v.length > 2 ? v[2] : v[1]); return v[0]; },
      deleteMin: (v, line) => pqPop(v[0], line).item,
      deleteMax: (v, line) => pqPop(v[0], line).item,
      extractMin: (v, line) => pqPop(v[0], line).item,
      heapPush: (v, line) => BUILTINS.insert(v, line),
      heapPop: (v, line) => pqPop(v[0], line).item,
      decreaseKey: (v, line) => { const q = v[0]; const s0 = ops.steps; const it = q.h.find((e) => eq(e.item, v[1])); if (it) { it.key = v[2]; const items = q.h.splice(0); items.forEach((e) => pqPush(q, e.item, e.key)); } else pqPush(q, v[1], v[2]); ops.steps = s0; charge(lg(q.h.length)); return q; },
      infinity: () => Infinity,
      print: (v) => { const t = v.map((x) => fmt(x)).join(" "); output.push(t); if (opt.onPrint) opt.onPrint(t); return null; },
    };

    /* ---- go ---- */
    try {
      // run top-level statements first (they may define globals or call algorithms)
      const topFrame = { fn: "(main)", vars: globals };
      callStack.push(topFrame);
      execBlock(prog.main, topFrame);
      callStack.pop();
      let entry = opt.entry;
      if (!entry || !prog.algorithms[entry]) {
        if (entry && !prog.algorithms[entry]) {
          const names = prog.order.join(", ") || "none";
          if (opt.entryRequired) throw new ForgeError(`I expected an ALGORITHM named ${entry}(…) but found: ${names}. Keep the name from the starter code.`, null, "syntax");
        }
        entry = prog.order[0];
      }
      result.entry = entry || null;
      if (entry) {
        const args = opt.args || [];
        const value = invoke(prog.algorithms[entry], args, prog.algorithms[entry].line);
        result.value = toPlain(value);
        result.returned = returnedFromEntry; // false when the entry algorithm finished without a return statement
        result.args = args.map((a) => toPlain(a));
      }
      result.ok = true;
    } catch (e) {
      if (e instanceof ForgeError) result.error = e;
      else if (e instanceof RangeError) result.error = new ForgeError("The recursion went too deep for the browser. Check your base case, or use a loop instead.", curLine, "limit");
      else if (e instanceof ReturnSignal) { result.ok = true; result.value = toPlain(e.value); }
      else result.error = new ForgeError("Internal error: " + (e && e.message ? e.message : String(e)), curLine, "runtime");
    }
    return result;
  }

  return { parse, run, ForgeError, format: (v) => fmt(v), version: "1.0.0" };
});
