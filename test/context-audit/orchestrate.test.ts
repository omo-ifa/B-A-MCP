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

test("regression: routing_drift.score is null (n=0), not a fabricated 100, when a root's only path references do not resolve", async () => {
  // Guards the confidence-signal decision (planning/decisions/2026-08-20_subscore-confidence-signal.md):
  // a root whose routing references resolve to NOTHING must report routing_drift
  // "not assessed" (n=0), never subscoreFromCount's empty-denominator 100. Now
  // that backtick code-span paths ARE recognized (resolve-only), the way to reach
  // refsFromRoots===0 is a reference that does not resolve — here a backtick path
  // to a file that does not exist. That same condition also emits routing_unresolved.
  const dir = mkdtempSync(join(tmpdir(), "ca-regr-"));
  try {
    writeFileSync(join(dir, "CLAUDE.md"), "root routes to `docs/ROUTING.md` (which does not exist)\n");
    const outcome = await runContextAudit({ path: dir });
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.result.subscores.routing_drift.score, null);
    assert.equal(outcome.result.subscores.routing_drift.n, 0);
    assert.match(outcome.result.rendered, /\| routing_drift \| not assessed \(n=0\) \|/);
    // routers present, nothing resolves -> surfaced as info, not hidden.
    assert.ok(outcome.result.findings.some((f) => f.category === "routing_unresolved"));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("info finding when routers exist but zero references resolve (possible unrecognized routing syntax)", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-unresolved-"));
  try {
    // A router is present, but nothing it references resolves (prose + a non-existent
    // backtick path). This is the shape a future third routing syntax would produce;
    // surface it every run instead of letting it read as a confident score.
    writeFileSync(join(dir, "CLAUDE.md"), "Routing lives in `some/unrecognized/syntax` that does not resolve.\n");
    const outcome = await runContextAudit({ path: dir });
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    const finding = outcome.result.findings.find((f) => f.category === "routing_unresolved");
    assert.ok(finding, "must emit a routing_unresolved finding");
    assert.equal(finding!.severity, "info");
    assert.match(finding!.message, /routing files/i);
    assert.match(finding!.message, /resolve/i);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("routing_unresolved does NOT fire when at least one router reference resolves", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-resolved-"));
  try {
    writeFileSync(join(dir, "CLAUDE.md"), "root routes `src/CONTEXT.md`\n");
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "src", "CONTEXT.md"), "leaf\n");
    const outcome = await runContextAudit({ path: dir });
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.ok(!outcome.result.findings.some((f) => f.category === "routing_unresolved"));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("Condition 1: a repo with no CLAUDE.md and no CONTEXT.md does not score as healthy routing", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-noroot-"));
  try {
    // No routing layer at all. Non-root docs cross-link cleanly (broken_refs would
    // read 100), but with no routing root the composite must NOT look healthy.
    mkdirSync(join(dir, ".git"));
    writeFileSync(join(dir, "a.md"), "a links [b](b.md)\n");
    writeFileSync(join(dir, "b.md"), "b\n");
    const outcome = await runContextAudit({ path: dir });
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.result.root.method, "git_root");
    assert.ok(outcome.result.findings.some((f) => f.category === "root_absent"));
    // The core assertion: no routing root => not a high "healthy" composite.
    const s = outcome.result.score;
    assert.ok(s === null || s < 50, `no-routing-root repo must not score healthy; got ${s}`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
