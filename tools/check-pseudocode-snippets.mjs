#!/usr/bin/env node
/* Runs every tested Forge Pseudocode snippet in the cheat sheets through the real interpreter.
 *
 * In a Markdown file, put a test comment right before a fenced code block:
 *
 *   <!-- test: {"args": [[3, 1, 2]], "expect": [1, 2, 3]} -->
 *   ```
 *   ALGORITHM Sort(A[0..n-1]) ...
 *   ```
 *
 * Keys: args (list), expect (deep-equal on the return value), output (list of printed lines),
 *       entry (algorithm name to call), argsAfter (deep-equal on the arguments after the call),
 *       error (substring expected in the error message — for "this is what goes wrong" examples),
 *       random (extra seeded random trials checked against a JavaScript oracle):
 *         {"oracle": "sort", "trials": 300, "minLen": 0, "maxLen": 40, "maxVal": 20}
 *           args = [random integer array], expect = the array sorted ascending;
 *         {"oracle": "search-sorted-distinct", "trials": 300, "minLen": 1, "maxLen": 40, "maxVal": 200}
 *           args = [strictly increasing integer array, key], expect = index of key or -1.
 * Usage: node tools/check-pseudocode-snippets.mjs [files...]   (default: cheatsheets/*.md)
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const F = require(path.join(root, "docs/engine/forge-pseudo.js"));

let files = process.argv.slice(2);
if (!files.length) files = fs.readdirSync(path.join(root, "cheatsheets")).filter((f) => f.endsWith(".md")).map((f) => path.join(root, "cheatsheets", f));

let pass = 0, fail = 0;

// Deterministic PRNG (mulberry32) so random trials are reproducible.
function rng(seed) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const ORACLES = {
  sort(R, o) {
    const n = o.minLen + Math.floor(R() * (o.maxLen - o.minLen + 1));
    const a = Array.from({ length: n }, () => Math.floor(R() * (o.maxVal + 1)));
    return { args: [a], expect: [...a].sort((x, y) => x - y) };
  },
  "search-sorted-distinct"(R, o) {
    const n = Math.max(1, o.minLen + Math.floor(R() * (o.maxLen - o.minLen + 1)));
    const set = new Set();
    while (set.size < Math.min(n, o.maxVal + 1)) set.add(Math.floor(R() * (o.maxVal + 1)));
    const a = [...set].sort((x, y) => x - y);
    const key = R() < 0.6 ? a[Math.floor(R() * a.length)] : Math.floor(R() * (o.maxVal + 1));
    return { args: [a, key], expect: a.indexOf(key) };
  },
};
function randomTrials(code, spec) {
  const o = { trials: 200, minLen: 0, maxLen: 30, maxVal: 20, ...spec.random };
  const make = ORACLES[o.oracle];
  if (!make) throw new Error(`unknown oracle "${o.oracle}"`);
  const R = rng(o.seed || 12345);
  for (let t = 0; t < o.trials; t++) {
    const c = make(R, o);
    const r = F.run(code, { args: structuredClone(c.args), entry: spec.entry });
    if (!r.ok) throw new Error(`random trial ${t} args=${JSON.stringify(c.args)} error: ${r.error}`);
    try { assert.deepEqual(r.value, c.expect); }
    catch { throw new Error(`random trial ${t} args=${JSON.stringify(c.args)} expected ${JSON.stringify(c.expect)} got ${JSON.stringify(r.value)}`); }
  }
  return o.trials;
}
for (const file of files) {
  const md = fs.readFileSync(file, "utf8");
  const re = /<!--\s*test:\s*([\s\S]*?)-->\s*\n```[^\n]*\n([\s\S]*?)\n```/g;
  let m;
  while ((m = re.exec(md))) {
    const line = md.slice(0, m.index).split("\n").length;
    const where = `${path.relative(root, file)}:${line}`;
    let spec;
    try { spec = JSON.parse(m[1]); } catch (e) { console.log(`✗ ${where}  bad test JSON: ${e.message}`); fail++; continue; }
    const args = structuredClone(spec.args || []);
    const r = F.run(m[2], { args, entry: spec.entry });
    try {
      if (spec.error) {
        assert.ok(!r.ok, "expected an error but it ran fine");
        assert.ok(String(r.error).includes(spec.error), `error was: ${r.error}`);
      } else {
        assert.ok(r.ok, "error: " + (r.error && r.error.toString()));
        if ("expect" in spec) assert.deepEqual(r.value, spec.expect);
        if (spec.output) assert.deepEqual(r.output, spec.output);
        if (spec.argsAfter) assert.deepEqual(r.args, spec.argsAfter);
      }
      const extra = spec.random ? randomTrials(m[2], spec) : 0;
      pass++;
      console.log(`✓ ${where}  ${r.entry || "(main)"}${extra ? `  + ${extra} random trials` : ""}`);
    } catch (e) {
      fail++;
      console.log(`✗ ${where}  ${r.entry || "(main)"}: ${e.message.split("\n").slice(0, 6).join(" ")}  got value=${JSON.stringify(r.value)} output=${JSON.stringify(r.output)}`);
    }
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
