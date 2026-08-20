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

test("directory-target edge: routedDirs gets only the directory itself, not its parent", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-graph4-"));
  try {
    // root links to a real subdirectory (src/lib), NOT to src itself.
    writeFileSync(join(dir, "CLAUDE.md"), "root [lib](src/lib)\n");
    mkdirSync(join(dir, "src", "lib"), { recursive: true });
    writeFileSync(join(dir, "src", "lib", "CONTEXT.md"), "lib context, routed via the dir link above\n");
    // unrelated doc under src/ but NOT under src/lib: must not become an orphan candidate.
    writeFileSync(join(dir, "src", "other.md"), "unrelated doc, sibling of lib, not itself linked\n");
    const root = resolveRoot(dir);
    const g = buildGraph(root, walk(root));
    assert.ok(g.routedDirs.has("src/lib"), "the directory target itself must be routed");
    assert.ok(!g.routedDirs.has("src"), "the directory target's parent must NOT be routed (old bug: add-both)");
    const orphanFindings = g.findings.filter((f) => f.category === "orphan");
    assert.equal(
      orphanFindings.length,
      0,
      "src/other.md must not be reported as an orphan: src was never routed, only src/lib was"
    );
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("denominator fields: refsFromRoots/refsFromNonRoots/orphanCandidateTotal/brokenRefCount/routingDriftCount/orphanCount", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-graph5-"));
  try {
    // CLAUDE.md (root): edge to src/CONTEXT.md (exists) + edge to nope.md (missing -> routing_drift)
    writeFileSync(join(dir, "CLAUDE.md"), "root [ctx](src/CONTEXT.md) [gone](nope.md)\n");
    mkdirSync(join(dir, "src"));
    // src/CONTEXT.md (root, structural name): edge to src/notes.md (exists)
    writeFileSync(join(dir, "src", "CONTEXT.md"), "ctx routes [notes](notes.md)\n");
    // src/notes.md (non-root, reached via CONTEXT.md's edge): edge to src/missing.md (missing -> broken_ref)
    writeFileSync(join(dir, "src", "notes.md"), "non-root [x](missing.md)\n");
    // src/orphan.md (non-root, under routed dir "src", no inbound edge): unreachable -> orphan
    writeFileSync(join(dir, "src", "orphan.md"), "unreferenced\n");

    const root = resolveRoot(dir);
    const g = buildGraph(root, walk(root));

    // Hand-computed from the edges above:
    // refsFromRoots: CLAUDE.md->src/CONTEXT.md, CLAUDE.md->nope.md, src/CONTEXT.md->src/notes.md = 3
    // refsFromNonRoots: src/notes.md->src/missing.md = 1
    // routingDriftCount: CLAUDE.md (root) -> nope.md missing = 1
    // brokenRefCount: src/notes.md (non-root) -> missing.md missing = 1
    // orphan candidates: src/notes.md (routed under "src", reached) + src/orphan.md (routed under "src", unreached) = 2
    // orphanCount: only src/orphan.md is unreached = 1
    assert.equal(g.refsFromRoots, 3);
    assert.equal(g.refsFromNonRoots, 1);
    assert.equal(g.orphanCandidateTotal, 2);
    assert.equal(g.brokenRefCount, 1);
    assert.equal(g.routingDriftCount, 1);
    assert.equal(g.orphanCount, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
