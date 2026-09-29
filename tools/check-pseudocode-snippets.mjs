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
 *       error (substring expected in the error message — for "this is what goes wrong" examples).
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
      pass++;
      console.log(`✓ ${where}  ${r.entry || "(main)"}`);
    } catch (e) {
      fail++;
      console.log(`✗ ${where}  ${r.entry || "(main)"}: ${e.message.split("\n").slice(0, 6).join(" ")}  got value=${JSON.stringify(r.value)} output=${JSON.stringify(r.output)}`);
    }
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
