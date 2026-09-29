#!/usr/bin/env node
/* Validates every Arena problem:
     - required fields
     - the reference pseudocode solution PASSES (tests + budget + growth)
     - the reference JavaScript solution PASSES
     - the starter code does NOT pass
     - every mutant (known wrong answer) FAILS and is DIAGNOSED with its own hint
     - hand-written expectations agree with the JS reference oracle
   Usage:  node tools/validate-problems.mjs [file-or-id-filter] [--quiet]           */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const ForgePseudo = require(path.join(ROOT, "docs/engine/forge-pseudo.js"));
const ForgeCheck = require(path.join(ROOT, "docs/engine/forge-check.js"));

const args = process.argv.slice(2);
const quiet = args.includes("--quiet");
const filter = args.find((a) => !a.startsWith("--"));

const dir = path.join(ROOT, "docs/arena/problems");
const ctx = vm.createContext({ console, Math, JSON, Array, Object, Set, Map, Number, String, Infinity, globalThis: {} });
ctx.self = ctx;
vm.runInContext(fs.readFileSync(path.join(dir, "registry.js"), "utf8"), ctx, { filename: "registry.js" });
const manifestOrder = (() => { const m = vm.createContext({ self: {} }); try { vm.runInContext(fs.readFileSync(path.join(dir, "index.js"), "utf8"), m); } catch (e) { /* no manifest */ } return m.self.FORGE_PACKS || []; })();
const rank = (f) => { const i = manifestOrder.indexOf(f); return i < 0 ? 1e9 : i; };
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".js") && f !== "registry.js" && f !== "index.js").sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
const fileOf = {};
{ // every pack must be listed in problems/index.js, or the site will never load it
  const man = vm.createContext({ self: {} }); vm.runInContext(fs.readFileSync(path.join(dir, "index.js"), "utf8"), man);
  const listed = new Set(man.self.FORGE_PACKS || []);
  for (const f of files) if (!listed.has(f)) { console.error(`✗ ${f} is not listed in docs/arena/problems/index.js (FORGE_PACKS), so the site won't load it`); process.exitCode = 1; }
}
for (const f of files) {
  if (filter && filter.endsWith(".js") && f !== path.basename(filter)) continue;
  const before = ctx.ForgeProblems.list.length;
  try { vm.runInContext(fs.readFileSync(path.join(dir, f), "utf8"), ctx, { filename: f }); }
  catch (e) { console.error(`✗ ${f}: failed to load — ${e.stack.split("\n").slice(0, 3).join(" | ")}`); process.exitCode = 1; continue; }
  ctx.ForgeProblems.list.slice(before).forEach((p) => (fileOf[p.id] = f));
}
const problems = ctx.ForgeProblems.list.filter((p) => !filter || filter.endsWith(".js") || p.id.includes(filter));

const REQUIRED = ["id", "title", "level", "chapter", "topics", "summary", "statement", "entry", "params", "tests", "hints", "starter", "solution"];
let bad = 0, total = 0;
const t0 = Date.now();
for (const p of problems) {
  total++;
  const errs = [], warns = [];
  const t1 = Date.now();
  for (const k of REQUIRED) if (p[k] === undefined) errs.push(`missing field "${k}"`);
  if (!(p.level >= 0 && p.level <= 6)) errs.push("level must be 0..6");
  if (!(p.chapter >= 1 && p.chapter <= 17)) errs.push("chapter must be 1..17");
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.id || "")) errs.push("id must be kebab-case");
  if (!p.reference && !p.verify) errs.push("needs reference(...) or verify(...)");
  if (!p.random) warns.push("no random tests");
  if ((p.tests || []).length < 3) errs.push("needs ≥ 3 hand-written tests");
  if ((p.hints || []).length < 3) errs.push("needs ≥ 3 progressive hints");
  if (!p.starter || !p.starter.pseudo || !p.starter.js) errs.push("needs starter.pseudo and starter.js");
  if (!p.solution || !p.solution.pseudo || !p.solution.js || !p.solution.explain) errs.push("needs solution.pseudo, solution.js, solution.explain");
  if (!p.mutants || !p.mutants.length) warns.push("no mutants (common-mistake detectors)");
  if (!errs.length) {
    // expectations vs reference
    if (p.reference && !p.verify) {
      p.tests.forEach((t, i) => {
        if (!("expect" in t)) return;
        const exp = p.reference(...ForgeCheck.clone(t.args));
        const cmpP = { compare: p.compare, id: p.id };
        const ok = typeof p.compare === "function" ? p.compare(exp, t.expect, t.args) === true : ForgeCheck.check ? null : null;
        const same = typeof p.compare === "function" ? ok : (p.compare === "unordered" || p.compare === "unordered-deep")
          ? JSON.stringify([].concat(exp).map((x) => JSON.stringify(x)).sort()) === JSON.stringify([].concat(t.expect).map((x) => JSON.stringify(x)).sort()) || p.compare === "unordered-deep"
          : ForgeCheck.deepEq(exp, t.expect, p.compare === "float" ? 1e-6 : undefined);
        if (!same) errs.push(`test ${i + 1}: expect ${ForgeCheck.show(t.expect)} but reference gives ${ForgeCheck.show(exp)}`);
      });
    }
    if (p.verify) {
      p.tests.forEach((t, i) => { if ("expect" in t) { const v = p.verify(ForgeCheck.clone(t.expect), ForgeCheck.clone(t.args)); if (v !== true) errs.push(`test ${i + 1}: its own expect fails verify(): ${v}`); } });
    }
    // solutions pass
    for (const lang of ["pseudo", "js"]) {
      const rep = ForgeCheck.check(p, { lang, code: p.solution[lang] }, { mode: "submit" });
      if (rep.status !== "passed") {
        const f = rep.tests.find((t) => !t.pass);
        errs.push(`solution.${lang} does not pass: ${rep.compileError ? rep.compileError.message + " (line " + rep.compileError.line + ")" : f ? `${f.name} ${f.input} → got ${f.got || ""} expected ${f.expected || ""} ${f.why || ""} ${f.error ? f.error.message + " line " + f.error.line : ""}` : ""} ${rep.diagnosis.map((d) => d.message).join(" | ")}`.slice(0, 600));
      } else if (lang === "pseudo" && rep.growth) {
        if (!quiet) warns.push(`growth fitted ${rep.growth.fitted} (expect ${rep.growth.expect}, slope ${rep.growth.slope && rep.growth.slope.toFixed(2)})`);
      }
    }
    // starter must not pass
    const st = ForgeCheck.check(p, { lang: "pseudo", code: p.starter.pseudo }, { mode: "submit" });
    if (st.status === "passed") errs.push("starter.pseudo already passes — it should be incomplete");
    // mutants fail & are diagnosed
    (p.mutants || []).forEach((m, k) => {
      const rep = ForgeCheck.check(p, { lang: "fn", fn: m.fn, code: "" }, { mode: "submit" });
      if (rep.status === "passed") errs.push(`mutant ${k + 1} passes all tests — tests are too weak to catch: "${m.hint.slice(0, 60)}…"`);
      else if (!rep.diagnosis.some((d) => d.kind === "mutant" && d.message.includes(m.hint))) warns.push(`mutant ${k + 1} fails but is diagnosed as: ${rep.diagnosis.map((d) => d.kind).join(",") || "nothing"} (${(rep.diagnosis.find((d) => d.kind === "mutant") || {}).message || ""})`.slice(0, 300));
    });
  }
  const ms = Date.now() - t1;
  if (ms > 4000) warns.push(`slow to grade: ${ms} ms`);
  if (errs.length) { bad++; console.log(`✗ ${p.id} [${fileOf[p.id]}]\n    - ${errs.join("\n    - ")}`); if (warns.length && !quiet) console.log(`    ~ ${warns.join("\n    ~ ")}`); }
  else if (!quiet) console.log(`✓ ${p.id} (${ms} ms)${warns.length ? "\n    ~ " + warns.join("\n    ~ ") : ""}`);
}
const ids = ctx.ForgeProblems.list.map((p) => p.id);
console.log(`\n${total - bad}/${total} problems valid · ${files.length} files · ${((Date.now() - t0) / 1000).toFixed(1)} s`);
const byLevel = {}; ctx.ForgeProblems.list.forEach((p) => (byLevel[p.level] = (byLevel[p.level] || 0) + 1));
console.log("by level:", JSON.stringify(byLevel));
if (bad) process.exitCode = 1;
