#!/usr/bin/env node
/* Runs every Playground example (docs/playground/examples.js) with its sample input and checks:
     - the code parses and the entry ALGORITHM exists
     - the sample inputs parse with the Playground's own value parser and match the header's parameters
     - the result (returned value, or the in-place argument) equals the example's expectation
     - the example runs inside the visualizer's trace budget without an error
     - Growth-lab presets with an "expect" class are fitted to that class by ForgeCheck.classify
   Usage: node tools/check-playground-examples.mjs [id-filter] [--quiet]                       */
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const ForgePseudo = require(path.join(ROOT, "docs/engine/forge-pseudo.js"));
const ForgeCheck = require(path.join(ROOT, "docs/engine/forge-check.js"));
const PGCore = require(path.join(ROOT, "docs/playground/pg-core.js"));
const PGExamples = require(path.join(ROOT, "docs/playground/examples.js"));

const argv = process.argv.slice(2);
const quiet = argv.includes("--quiet");
const filter = argv.find((a) => !a.startsWith("--"));
const show = (v) => PGCore.formatValue(v);

let bad = 0, n = 0;
const ids = new Set();
for (const ex of PGExamples.list) {
  if (filter && !ex.id.includes(filter)) continue;
  n++;
  const errs = [];
  if (ids.has(ex.id)) errs.push("duplicate id");
  ids.add(ex.id);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(ex.id)) errs.push("id must be kebab-case");
  for (const k of ["chapter", "title", "blurb", "entry", "code", "inputs"]) if (ex[k] === undefined) errs.push(`missing "${k}"`);
  if (ex.expect === undefined && !ex.expectArg) errs.push('needs "expect" or "expectArg"');
  let prog = null;
  try { prog = ForgePseudo.parse(ex.code); } catch (e) { errs.push(`parse error: ${e}`); }
  if (prog && !prog.algorithms[ex.entry]) errs.push(`no ALGORITHM named ${ex.entry}`);
  let args = null;
  if (prog && prog.algorithms[ex.entry]) {
    const params = PGCore.headerOf(prog, ex.entry);
    const names = params.map((p) => p.name);
    const extra = Object.keys(ex.inputs).filter((k) => !names.includes(k));
    if (extra.length) errs.push(`inputs for unknown parameters: ${extra.join(", ")}`);
    try { args = params.map((p) => { if (!(p.name in ex.inputs)) throw new Error(`no input for ${p.name}`); return PGCore.parseValue(ex.inputs[p.name]); }); }
    catch (e) { errs.push(`input: ${e.message}`); }
    if (args) {
      const r = ForgePseudo.run(prog, { entry: ex.entry, args: PGCore.clone(args), maxSteps: 2000000 });
      if (!r.ok) errs.push(`run error: ${r.error}`);
      else if (ex.expectArg) {
        const k = names.indexOf(ex.expectArg.param);
        if (k < 0) errs.push(`expectArg names unknown parameter ${ex.expectArg.param}`);
        else if (!PGCore.same(r.args[k], ex.expectArg.value)) errs.push(`${ex.expectArg.param} ends as ${show(r.args[k])}, expected ${show(ex.expectArg.value)}`);
      } else if (!PGCore.same(r.value, ex.expect)) errs.push(`returned ${show(r.value)}, expected ${show(ex.expect)}`);
      const t = ForgePseudo.run(prog, { entry: ex.entry, args: PGCore.clone(args), trace: true, maxTrace: 5000, maxSteps: 2000000 });
      if (!t.ok) errs.push(`trace run error: ${t.error}`);
      else if (!t.trace.length) errs.push("trace is empty");
      // round-trip the inputs through the formatter
      args.forEach((a, k) => { if (!PGCore.same(PGCore.parseValue(PGCore.formatValue(a)), a)) errs.push(`input ${names[k]} does not round-trip through formatValue`); });
      // growth preset
      const g = ex.growth;
      if (g) {
        if (!PGCore.GENERATORS[g.gen]) errs.push(`unknown growth generator ${g.gen}`);
        else {
          const roles = Object.assign(PGCore.defaultRoles(params, g.gen), g.roles || {});
          const R = PGCore.rng(7);
          const pts = [];
          let gErr = null;
          for (const size of g.sizes || []) {
            let tot = 0;
            const reps = /^(number)$/.test(g.gen) ? 1 : 2;
            for (let rep = 0; rep < reps; rep++) {
              const a = PGCore.growthArgs(params, { gen: g.gen, roles }, R, size, args);
              const res = ForgePseudo.run(prog, { entry: ex.entry, args: a, maxSteps: 20000000 });
              if (!res.ok) { gErr = `size ${size}: ${res.error}`; break; }
              tot += res.ops[g.metric || "steps"];
            }
            if (gErr) break;
            pts.push({ n: size, ops: tot / reps });
          }
          if (gErr) errs.push(`growth run error at ${gErr}`);
          else if (g.expect) {
            const fit = ForgeCheck.classify(pts);
            if (fit.cls !== g.expect) errs.push(`growth preset fitted ${fit.cls}, expected ${g.expect} (${pts.map((p) => p.n + ":" + Math.round(p.ops)).join(" ")})`);
          }
        }
      }
    }
  }
  if (errs.length) { bad++; console.log(`✗ ${ex.id}\n    ` + errs.join("\n    ")); }
  else if (!quiet) console.log(`✓ ${ex.id}`);
}
const total = PGExamples.list.length;
console.log(`${bad ? "✗" : "✓"} playground examples: ${n - bad}/${n} pass` + (filter ? "" : ` (${total} examples)`));
if (!filter && (total < 25 || total > 40)) { console.log(`✗ expected 25–40 examples, found ${total}`); bad++; }
process.exit(bad ? 1 : 0);
