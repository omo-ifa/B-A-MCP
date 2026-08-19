import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveRoot } from "../../src/tools/context-audit/root.js";
import { walk } from "../../src/tools/context-audit/walk.js";
import { buildGraph } from "../../src/tools/context-audit/graph.js";
import { scoreCoverage } from "../../src/tools/context-audit/coverage.js";

function run(dir: string, emitHighFindings = false) {
  const root = resolveRoot(dir);
  const w = walk(root);
  const g = buildGraph(root, w);
  return scoreCoverage(root, w, g, { emitHighFindings });
}

test("HIGH uncovered-workspace finding is gated: default off (TBD-12 build guard)", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-cov-"));
  try {
    writeFileSync(join(dir, "CLAUDE.md"), "# root, references nothing\n");
    mkdirSync(join(dir, "src"));
    for (let i = 0; i < 8; i++) writeFileSync(join(dir, "src", `f${i}.ts`), "x");   // uncovered significant dir
    const off = run(dir, false);
    // NOTE: RawFinding carries no `severity` (added later by normalizeFindings in
    // Task 8, where SEVERITY_BY_CATEGORY.coverage === "high" always). scoreCoverage's
    // only finding type is category "coverage", so asserting on category here is
    // equivalent to asserting on the post-normalization "high" severity.
    assert.equal(off.findings.filter((f) => f.category === "coverage").length, 0);   // gated: must not fire
    const on = run(dir, true);
    assert.ok(on.findings.some((f) => f.category === "coverage"));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("coverage subscore floors to 0 when no root CLAUDE.md", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-cov2-"));
  try {
    mkdirSync(join(dir, ".git"));                 // git root, no CLAUDE.md
    mkdirSync(join(dir, "src"));
    for (let i = 0; i < 8; i++) writeFileSync(join(dir, "src", `f${i}.ts`), "x");
    assert.equal(run(dir).subscore, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
