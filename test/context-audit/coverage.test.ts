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

test("coverage subscore floors to 0 when no root CLAUDE.md (n = significant dirs judged, a real assessed result)", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-cov2-"));
  try {
    mkdirSync(join(dir, ".git"));                 // git root, no CLAUDE.md
    mkdirSync(join(dir, "src"));
    for (let i = 0; i < 8; i++) writeFileSync(join(dir, "src", `f${i}.ts`), "x");
    const result = run(dir);
    assert.equal(result.subscore, 0);
    assert.equal(result.n, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("coverage subscore is null (not assessed) when a root CLAUDE.md exists but no directory is significant (n=0)", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-cov3-"));
  try {
    writeFileSync(join(dir, "CLAUDE.md"), "# root, references nothing\n");
    mkdirSync(join(dir, "src"));
    // TBD-12 significance threshold is >= 5 source files; 2 is below it, so
    // src/ never becomes a significant dir and there is nothing to judge.
    for (let i = 0; i < 2; i++) writeFileSync(join(dir, "src", `f${i}.ts`), "x");
    const result = run(dir);
    assert.equal(result.subscore, null);
    assert.equal(result.n, 0);
    assert.equal(result.findings.length, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("coverage subscore is 100 and no findings when significant dirs are covered via CONTEXT.md and via routedDir", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-cov4-"));
  try {
    // root routes only to src/b (a directory link); src/a is covered purely by
    // owning its own CONTEXT.md, with no inbound link from the root at all.
    writeFileSync(join(dir, "CLAUDE.md"), "root [b](src/b)\n");
    mkdirSync(join(dir, "src", "a"), { recursive: true });
    mkdirSync(join(dir, "src", "b"), { recursive: true });
    for (let i = 0; i < 5; i++) writeFileSync(join(dir, "src", "a", `f${i}.ts`), "x");
    writeFileSync(join(dir, "src", "a", "CONTEXT.md"), "a's own context\n");
    for (let i = 0; i < 5; i++) writeFileSync(join(dir, "src", "b", `f${i}.ts`), "x");
    // no CONTEXT.md under src/b: it relies solely on being a routedDir target.

    const root = resolveRoot(dir);
    const w = walk(root);
    const g = buildGraph(root, w);
    assert.ok(g.routedDirs.has("src/b"), "sanity: root's directory link must route src/b");

    const result = scoreCoverage(root, w, g, { emitHighFindings: true }); // gate ON: still nothing should fire
    assert.equal(result.subscore, 100);
    assert.equal(result.n, 2);   // src/a and src/b are both significant and judged
    assert.equal(result.findings.filter((f) => f.category === "coverage").length, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("gate is off by default when opts is omitted entirely (not just { emitHighFindings: false })", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-cov5-"));
  try {
    writeFileSync(join(dir, "CLAUDE.md"), "# root, references nothing\n");
    mkdirSync(join(dir, "src"));
    for (let i = 0; i < 8; i++) writeFileSync(join(dir, "src", `f${i}.ts`), "x");   // uncovered significant dir

    const root = resolveRoot(dir);
    const w = walk(root);
    const g = buildGraph(root, w);
    const result = scoreCoverage(root, w, g);   // NOTE: no 4th argument at all — pins Task 10's default call shape
    assert.equal(result.findings.filter((f) => f.category === "coverage").length, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("gitignored significant directory is excluded from coverage's traversal scope (scope must match walk.ts)", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-cov6-"));
  try {
    writeFileSync(join(dir, "CLAUDE.md"), "# root, references nothing\n");
    writeFileSync(join(dir, ".gitignore"), "generated/\n");

    // gitignored, would-be-significant directory — walk.ts never descends into
    // this, so coverage must not either.
    mkdirSync(join(dir, "generated"));
    for (let i = 0; i < 8; i++) writeFileSync(join(dir, "generated", `g${i}.ts`), "x");

    // sibling, equally significant + uncovered, but NOT gitignored — proves the
    // machinery still flags a real candidate and generated/'s absence isn't a
    // blanket suppression.
    mkdirSync(join(dir, "src"));
    for (let i = 0; i < 8; i++) writeFileSync(join(dir, "src", `f${i}.ts`), "x");

    const result = run(dir, true);   // gate ON: emit HIGH findings
    const coverageFindings = result.findings.filter((f) => f.category === "coverage");

    // Pre-fix, coverage.ts re-walked with no .gitignore applied at all, so
    // generated/ was scored as a significant, uncovered dir and DID produce a
    // finding here — this assertion fails against that code.
    assert.ok(!coverageFindings.some((f) => f.file === "generated/"), "gitignored dir must not be scored");

    // The non-ignored sibling is still a genuine candidate: the gate isn't
    // just suppressing everything.
    assert.ok(coverageFindings.some((f) => f.file === "src/"), "non-ignored significant uncovered dir must still be flagged");

    // Only one significant dir is in scope (src/); it's uncovered, so subscore
    // is 0/1. If generated/ were still in scope the denominator would be 2.
    assert.equal(result.subscore, 0);
    assert.equal(result.n, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
