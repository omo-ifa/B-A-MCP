// test/context-audit/orchestrate.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runContextAudit, toCallToolResult, contextAuditTool } from "../../src/tools/context-audit/index.js";

test("tool definition shape: name, optional path, outputSchema", () => {
  assert.equal(contextAuditTool.name, "context_audit");
  assert.equal((contextAuditTool.inputSchema as any).properties.path.type, "string");
  assert.equal((contextAuditTool.inputSchema as any).additionalProperties, false);
  assert.ok(contextAuditTool.outputSchema);
});

test("runs end-to-end on a real fixture and returns structuredContent + rendered text", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-e2e-"));
  try {
    writeFileSync(join(dir, "CLAUDE.md"), "root [ctx](src/CONTEXT.md) [gone](missing.md)\n");
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "src", "CONTEXT.md"), "leaf\n");
    const outcome = await runContextAudit({ path: dir });
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.result.root.method, "claude_md");
    assert.ok(outcome.result.findings.some((f) => f.category === "routing_drift"));  // missing.md
    assert.equal(outcome.result.stats.calibrated, false);
    const call = toCallToolResult(outcome);
    assert.equal(call.content[0].type, "text");
    assert.equal(call.content[0].text, outcome.result.rendered);
    assert.deepEqual(call.structuredContent, outcome.result);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("missing target yields NO_ROUTING_ROOT structured error, no structuredContent", async () => {
  const outcome = await runContextAudit({ path: join(tmpdir(), "does-not-exist-" + "zzz") });
  assert.equal(outcome.ok, false);
  if (outcome.ok) return;
  assert.equal(outcome.error.code, "NO_ROUTING_ROOT");
  const call = toCallToolResult(outcome);
  assert.equal(call.isError, true);
  assert.equal(call.structuredContent, undefined);
});

test("TBD-12 coverage gate stays off end-to-end even when a significant dir is uncovered", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-cov-"));
  try {
    writeFileSync(join(dir, "CLAUDE.md"), "# root\n");
    // src/lib: 5 source files, no CONTEXT.md, never linked from any routing doc —
    // meets the stubbed significance threshold (>=5 source files) and is neither
    // CONTEXT.md-covered nor routedDir-covered, so coverage sees it as uncovered.
    mkdirSync(join(dir, "src", "lib"), { recursive: true });
    for (const name of ["a", "b", "c", "d", "e"]) {
      writeFileSync(join(dir, "src", "lib", `${name}.ts`), `export const ${name} = 1;\n`);
    }
    const outcome = await runContextAudit({ path: dir });
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    // proves the fixture genuinely exercises the coverage path (uncovered dir seen)
    assert.ok(outcome.result.subscores.coverage.score !== null && outcome.result.subscores.coverage.score < 100);
    // proves the orchestrator keeps the TBD-12 HIGH finding gated off (no opts passed to scoreCoverage)
    assert.ok(!outcome.result.findings.some((f) => f.category === "coverage"));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("regression: routing_drift.score is null (n=0), not a fabricated 100, when a root doc references paths only via non-markdown-link text", async () => {
  // This is the exact artifact the decision (planning/decisions/2026-08-20_subscore-confidence-signal.md)
  // was written to fix: extractLinks only recognizes `[text](target)` markdown
  // links as edges, so a root doc that mentions paths in backtick code-spans
  // produces zero classified edges from roots (refsFromRoots === 0). Before
  // this change, subscoreFromCount's empty-denominator branch reported 100
  // ("clean") for a routing layer that was never actually checked.
  const dir = mkdtempSync(join(tmpdir(), "ca-regr-"));
  try {
    writeFileSync(join(dir, "CLAUDE.md"), "root routes to `src/CONTEXT.md` for details, no markdown link here\n");
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "src", "CONTEXT.md"), "leaf\n");
    const outcome = await runContextAudit({ path: dir });
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.result.subscores.routing_drift.score, null);
    assert.equal(outcome.result.subscores.routing_drift.n, 0);
    assert.match(outcome.result.rendered, /\| routing_drift \| not assessed \(n=0\) \|/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
