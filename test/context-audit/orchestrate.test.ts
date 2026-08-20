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

test("regression: routing_drift.score is null (n=0), not a fabricated 100, when a router has NO path references at all", async () => {
  // Guards the confidence-signal decision (planning/decisions/2026-08-20_subscore-confidence-signal.md):
  // a router with nothing to check must report routing_drift "not assessed" (n=0),
  // never subscoreFromCount's empty-denominator 100. Under router-path-drift, a
  // non-resolving path IS drift, so the only way to reach refsFromRoots===0 is a
  // router that references no paths at all (pure prose). That also emits
  // routing_unresolved (routers present, nothing resolves).
  const dir = mkdtempSync(join(tmpdir(), "ca-regr-"));
  try {
    writeFileSync(join(dir, "CLAUDE.md"), "Routing conventions are described here in prose, with no paths.\n");
    const outcome = await runContextAudit({ path: dir });
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.result.subscores.routing_drift.score, null);
    assert.equal(outcome.result.subscores.routing_drift.n, 0);
    assert.match(outcome.result.rendered, /\| routing_drift \| not assessed \(n=0\) \|/);
    assert.ok(outcome.result.findings.some((f) => f.category === "routing_unresolved"));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("router-path drift: a router whose only path reference is missing scores routing_drift 0 (assessed), not null", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-drift0-"));
  try {
    writeFileSync(join(dir, "CLAUDE.md"), "See `docs/ROUTING.md` for details.\n");   // path-shaped, does not exist
    const outcome = await runContextAudit({ path: dir });
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.result.subscores.routing_drift.score, 0);   // the one router path is broken
    assert.equal(outcome.result.subscores.routing_drift.n, 1);
    assert.ok(outcome.result.findings.some((f) => f.category === "routing_path_missing"));
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

test("four scored sub-scores (broken_refs removed); a non-router broken link is an info finding", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-four-"));
  try {
    writeFileSync(join(dir, "CLAUDE.md"), "root routes `docs/CONTEXT.md`\n");
    mkdirSync(join(dir, "docs"));
    writeFileSync(join(dir, "docs", "CONTEXT.md"), "leaf\n");
    writeFileSync(join(dir, "docs", "guide.md"), "a non-router doc with a [broken](nope.md) link\n");   // broken_ref (info), unscored
    const outcome = await runContextAudit({ path: dir });
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.deepEqual(Object.keys(outcome.result.subscores).sort(), ["bloat", "coverage", "orphans", "routing_drift"]);
    const br = outcome.result.findings.find((f) => f.category === "broken_ref");
    assert.ok(br, "non-router broken link is still reported");
    assert.equal(br!.severity, "info");   // reported, not scored
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("headline invariant: no routers + a significant directory => definite low number, never null", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-inv-sig-"));
  try {
    mkdirSync(join(dir, ".git"));
    mkdirSync(join(dir, "src"));
    for (let i = 0; i < 8; i++) writeFileSync(join(dir, "src", `f${i}.ts`), "x");   // one significant dir, uncovered
    const outcome = await runContextAudit({ path: dir });
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.result.root.method, "git_root");
    assert.notEqual(outcome.result.score, null, "a repo with real dirs but no routing must score, not go null");
    assert.ok((outcome.result.score as number) < 50, "and it must score low (worst case)");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("headline invariant: no routers + no significant directory => null is acceptable (nothing to route)", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-inv-nosig-"));
  try {
    mkdirSync(join(dir, ".git"));
    writeFileSync(join(dir, "README.md"), "just docs, nothing to route\n");
    const outcome = await runContextAudit({ path: dir });
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.result.score, null);   // 0 significant dirs -> null is honest
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
