import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveRoot } from "../../src/tools/context-audit/root.js";
import { walk } from "../../src/tools/context-audit/walk.js";
import { buildGraph } from "../../src/tools/context-audit/graph.js";

function cats(dir: string) {
  const g = buildGraph(resolveRoot(dir), walk(resolveRoot(dir)));
  return g.findings.reduce<Record<string, number>>((a, f) => ((a[f.category] = (a[f.category] ?? 0) + 1), a), {});
}

test("routing_drift from a root's missing link; broken_ref from a non-root's missing link", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-graph-"));
  try {
    // root references src/ (routed) and a missing path (drift)
    writeFileSync(join(dir, "CLAUDE.md"), "root [ctx](src/CONTEXT.md) [gone](nope.md)\n");
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "src", "CONTEXT.md"), "ctx routes [notes](notes.md)\n");        // root doc, edge exists
    writeFileSync(join(dir, "src", "notes.md"), "non-root [x](missing.md)\n");              // non-root, missing link
    const c = cats(dir);
    assert.equal(c.routing_drift, 1);   // CLAUDE.md (root) -> nope.md (missing)
    assert.equal(c.broken_ref, 1);      // src/notes.md (non-root) -> missing.md (missing)
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("orphan: routed-workspace doc unreachable from any root", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-graph2-"));
  try {
    writeFileSync(join(dir, "CLAUDE.md"), "root points at [dir](src/CONTEXT.md)\n");
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "src", "CONTEXT.md"), "no links here\n");
    writeFileSync(join(dir, "src", "orphan.md"), "unreferenced\n");   // under routed dir, unreachable
    const c = cats(dir);
    assert.equal(c.orphan, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("escapes_root and malformed links become findings, never edges", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-graph3-"));
  try {
    writeFileSync(join(dir, "CLAUDE.md"), "[up](../../secret.md) and [bad]( )\n");
    const c = cats(dir);
    assert.equal(c.escapes_root, 1);
    assert.equal(c.malformed_link, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
