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

test("backtick routing path resolves to an edge: routes a dir and reaches a doc", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-bt-edge-"));
  try {
    // Router uses backtick code-span paths (the real-world convention), NOT markdown links.
    writeFileSync(join(dir, "CLAUDE.md"), "Read `src/CONTEXT.md` before working.\n");
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "src", "CONTEXT.md"), "sub context, no links\n");
    writeFileSync(join(dir, "src", "orphan.md"), "under a routed dir, never linked\n");
    const root = resolveRoot(dir);
    const g = buildGraph(root, walk(root));
    // the backtick path is a real resolving edge from a root doc
    assert.equal(g.resolvedRefsFromRoots, 1);
    assert.ok(g.routedDirs.has("src"), "backtick edge must route src/");
    // src/orphan.md is now a candidate (routed) and unreachable -> a real orphan
    assert.equal(g.orphanCount, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("router path-shaped backtick that resolves to nothing is routing_path_missing (drift), never a broken_ref", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-bt-drift-"));
  try {
    // In a ROUTER doc, a path-shaped backtick that doesn't resolve is a broken
    // route (decision 2026-08-20_router-path-drift.md), counted as drift. A
    // non-path-shaped span (`AuditResult`) stays prose.
    writeFileSync(join(dir, "CLAUDE.md"), "See `does/not/exist.md` and the `AuditResult` type.\n");
    const root = resolveRoot(dir);
    const g = buildGraph(root, walk(root));
    assert.equal(g.brokenRefCount, 0);                 // routers never emit broken_ref
    assert.equal(g.resolvedRefsFromRoots, 0);          // nothing resolved
    assert.equal(g.refsFromRoots, 1);                  // one attempted router route (the .md path); `AuditResult` stayed prose
    assert.equal(g.routingDriftCount, 1);              // the unresolvable router path counts as drift
    assert.equal(g.findings.filter((f) => f.category === "routing_path_missing").length, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("orphans guard: zero resolving edges from roots suppresses orphan enumeration", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-guard-"));
  try {
    // Reproduces the superpowers failure: the ROOT resolves no edges (prose only),
    // but a NON-root doc has a resolving markdown link, which populated routedDirs
    // and — pre-fix — made every doc under it a confident-wrong "orphan".
    writeFileSync(join(dir, "CLAUDE.md"), "Prose only. Mentions `nothing-real` (not path-shaped, stays prose).\n");
    mkdirSync(join(dir, "docs"));
    writeFileSync(join(dir, "docs", "a.md"), "a links [b](b.md)\n");   // non-root resolving edge -> routes docs/
    writeFileSync(join(dir, "docs", "b.md"), "b\n");
    writeFileSync(join(dir, "docs", "orphan.md"), "unreachable from any root\n");
    const root = resolveRoot(dir);
    const g = buildGraph(root, walk(root));
    assert.equal(g.resolvedRefsFromRoots, 0, "root resolves no routing edges");
    // guard: with no routing basis, orphans is not assessed — no phantom orphans
    assert.equal(g.orphanCount, 0);
    assert.equal(g.orphanCandidateTotal, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("orphans guard does NOT fire when the root resolves at least one edge", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-guard-off-"));
  try {
    // Root has a real resolving edge -> routing basis exists -> orphans assessed normally.
    writeFileSync(join(dir, "CLAUDE.md"), "root routes `docs/CONTEXT.md`\n");
    mkdirSync(join(dir, "docs"));
    writeFileSync(join(dir, "docs", "CONTEXT.md"), "sub, no links\n");
    writeFileSync(join(dir, "docs", "orphan.md"), "routed but unreachable\n");
    const root = resolveRoot(dir);
    const g = buildGraph(root, walk(root));
    assert.equal(g.resolvedRefsFromRoots, 1);
    assert.equal(g.orphanCount, 1, "a genuine orphan under a routed dir must still fire");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("backtick routing edges resolve root-relative too: nested router with root-relative paths", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-bt-rootrel-"));
  try {
    // Root routes to the nested router. The nested router references a doc with a
    // ROOT-RELATIVE backtick path — the real-world convention (this repo's own
    // src/CONTEXT.md writes `src/API.md`). Resolved doc-relative it would be
    // sub/sub/guide.md (missing) and the edge would drop, orphaning the target.
    writeFileSync(join(dir, "CLAUDE.md"), "See `sub/CONTEXT.md`.\n");
    mkdirSync(join(dir, "sub"));
    writeFileSync(join(dir, "sub", "CONTEXT.md"), "Guide at `sub/guide.md` (root-relative).\n");
    writeFileSync(join(dir, "sub", "guide.md"), "the guide\n");
    const root = resolveRoot(dir);
    const g = buildGraph(root, walk(root));
    assert.ok(g.routedDirs.has("sub"));
    assert.equal(g.orphanCount, 0, "root-relative backtick edge must reach sub/guide.md");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("combined [`path`](path) counts as exactly one resolving root edge, not two", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-nodbl-"));
  try {
    writeFileSync(join(dir, "CLAUDE.md"), "route via [`src/CONTEXT.md`](src/CONTEXT.md)\n");
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "src", "CONTEXT.md"), "leaf\n");
    const root = resolveRoot(dir);
    const g = buildGraph(root, walk(root));
    assert.equal(g.refsFromRoots, 1, "one logical link must not count twice");
    assert.equal(g.resolvedRefsFromRoots, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("backtick paths route only from router docs; a non-root doc's backtick citation is prose, not a reference", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-bt-scope-"));
  try {
    // Router (root) uses a backtick edge; a NON-root content doc merely cites a
    // real path in backticks. That citation must NOT count as a non-root
    // reference (it would inflate broken_refs' denominator with prose).
    writeFileSync(join(dir, "CLAUDE.md"), "root routes `docs/CONTEXT.md`\n");
    mkdirSync(join(dir, "docs"));
    writeFileSync(join(dir, "docs", "CONTEXT.md"), "leaf\n");
    writeFileSync(join(dir, "docs", "note.md"), "for background see `docs/CONTEXT.md` (a citation, not a link)\n");
    const root = resolveRoot(dir);
    const g = buildGraph(root, walk(root));
    assert.equal(g.resolvedRefsFromRoots, 1, "the router's backtick edge counts");
    assert.equal(g.refsFromNonRoots, 0, "a non-root backtick citation must not count as a reference");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("router-path drift ignores non-route tokens (globs, scopes, org/repo, env/home) — only a plain .md doc path drifts", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-drift-fp-"));
  try {
    // A router doc full of path-shaped-but-not-route backtick tokens, plus ONE
    // genuine missing .md route. Only the real route may count as drift.
    writeFileSync(join(dir, "CLAUDE.md"), [
      "MIME `application/json`, pkg `@scope/thing`, repo `Org/repo-name`,",
      "glob `skills/*/SKILL.md`, brace `a/{x,y}/z.md`, home `~/x/y.md`, env `$DIR/z.md`,",
      "and a real missing route `docs/GONE.md`.",
    ].join("\n") + "\n");
    const root = resolveRoot(dir);
    const g = buildGraph(root, walk(root));
    const rp = g.findings.filter((f) => f.category === "routing_path_missing");
    assert.equal(rp.length, 1, "only the plain .md doc route counts as a broken route");
    assert.equal(rp[0].evidence, "docs/GONE.md");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("T2a a router markdown link carrying a template placeholder is not drift", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-t2a-"));
  try {
    writeFileSync(join(dir, "CLAUDE.md"), "see [chart](chart:<chart_id>) and [gone](really-missing.md)\n");
    const c = cats(dir);
    assert.equal(c.routing_drift, 1);   // only really-missing.md; the placeholder is not a route
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("T2b a placeholder link is excluded from the drift DENOMINATOR too", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-t2b-"));
  try {
    writeFileSync(join(dir, "CLAUDE.md"), "only [chart](chart:<chart_id>)\n");
    const g = buildGraph(resolveRoot(dir), walk(resolveRoot(dir)));
    assert.equal(g.routingDriftCount, 0);
    assert.equal(g.refsFromRoots, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("T2c GLOBAL: a placeholder in a NON-router doc is not a broken_ref either", () => {
  // Design §3.2 ratified global (decision 2026-08-24 D3): a form-with-a-blank is
  // not a path in any syntax OR any doc type. The genuinely broken link survives.
  const dir = mkdtempSync(join(tmpdir(), "ca-t2c-"));
  try {
    writeFileSync(join(dir, "CLAUDE.md"), "root routes [g](docs/guide.md)\n");
    mkdirSync(join(dir, "docs"));
    writeFileSync(join(dir, "docs", "guide.md"), "[tpl](templates/{name}.md) and [real](nope.md)\n");
    const c = cats(dir);
    assert.equal(c.broken_ref, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("T2d a CommonMark <dest> wrapper is a delimiter, not a placeholder", () => {
  // `[x](<docs/gone.md>)` is a genuinely broken link written in CommonMark's
  // angle-bracket destination form. The wrapper is punctuation, not a blank to
  // fill in — if the predicate ate it, real rot would vanish silently, and a
  // vanished finding is invisible to §3.4's categorical close condition.
  // GUARD: this passes BEFORE and AFTER the change (see Step 3).
  const dir = mkdtempSync(join(tmpdir(), "ca-t2d-"));
  try {
    writeFileSync(join(dir, "CLAUDE.md"), "see [x](<docs/gone.md>)\n");
    const c = cats(dir);
    assert.equal(c.routing_drift, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("T2e a bare <token> destination is a placeholder, not a route", () => {
  // The other half of the §3.2 precedence: `<dir>` is template text, so it must
  // be excluded even though stripping the wrapper would leave a bare path.
  // The genuinely broken link beside it must still be caught.
  const dir = mkdtempSync(join(tmpdir(), "ca-t2e-"));
  try {
    writeFileSync(join(dir, "CLAUDE.md"), "see [x](<dir>) and [gone](really-missing.md)\n");
    const c = cats(dir);
    assert.equal(c.routing_drift, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
