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

test("T2d a CommonMark <dest> wrapper is a delimiter: stripped, adjudicated, drifts for the RIGHT reason", () => {
  // `[x](<docs/gone.md>)` is a genuinely broken link written in CommonMark's
  // angle-bracket destination form. The wrapper is a delimiter, not a blank to
  // fill in — design §3.2 requires it stripped and adjudicated normally so a
  // broken one still drifts. NON-VACUOUS (design amendment 2026-08-25, option C;
  // observation 15): the drift must arise via the STRIPPED inner `docs/gone.md`,
  // not the literal `<docs/gone.md>` also failing existsSync. Asserting the
  // finding's evidence is the clean inner is the mutation guard — remove the
  // strip and the evidence becomes `<docs/gone.md>`, failing this test.
  const dir = mkdtempSync(join(tmpdir(), "ca-t2d-"));
  try {
    writeFileSync(join(dir, "CLAUDE.md"), "see [x](<docs/gone.md>)\n");
    const g = buildGraph(resolveRoot(dir), walk(resolveRoot(dir)));
    const drift = g.findings.filter((f) => f.category === "routing_drift");
    assert.equal(drift.length, 1);
    assert.equal(drift[0].evidence, "docs/gone.md");            // stripped, not <docs/gone.md>
    assert.ok(!drift[0].evidence.includes("<"), "the <…> wrapper must be stripped before adjudication");
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

test("T3a tier 2: NESTED router, path exists deeper in its subtree -> NOT drift", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-t3a-"));
  try {
    mkdirSync(join(dir, "skills", "scout-general", "references"), { recursive: true });
    writeFileSync(join(dir, "CLAUDE.md"), "root routes `skills/AGENTS.md`\n");
    writeFileSync(join(dir, "skills", "AGENTS.md"), "the generalist keeps `references/conventions.md`\n");
    writeFileSync(join(dir, "skills", "scout-general", "references", "conventions.md"), "real\n");
    const c = cats(dir);
    assert.equal(c.routing_path_missing, undefined);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("T3b tier 2: multiplicity is not a collision", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-t3b-"));
  try {
    mkdirSync(join(dir, "skills", "a", "references"), { recursive: true });
    mkdirSync(join(dir, "skills", "b", "references"), { recursive: true });
    writeFileSync(join(dir, "CLAUDE.md"), "root routes `skills/AGENTS.md`\n");
    writeFileSync(join(dir, "skills", "AGENTS.md"), "each keeps `references/conventions.md`\n");
    writeFileSync(join(dir, "skills", "a", "references", "conventions.md"), "one\n");
    writeFileSync(join(dir, "skills", "b", "references", "conventions.md"), "two\n");
    const c = cats(dir);
    assert.equal(c.routing_path_missing, undefined);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("T3c tier 2 creates NO edge: unanchored target stays unreachable", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-t3c-"));
  try {
    mkdirSync(join(dir, "skills", "scout-general", "references"), { recursive: true });
    writeFileSync(join(dir, "CLAUDE.md"), "root routes `skills/AGENTS.md`\n");
    writeFileSync(join(dir, "skills", "AGENTS.md"), "keeps `references/conventions.md`\n");
    writeFileSync(join(dir, "skills", "scout-general", "references", "conventions.md"), "real\n");
    const g = buildGraph(resolveRoot(dir), walk(resolveRoot(dir)));
    assert.equal(g.routingDriftCount, 0);
    // only the root's own edge resolved; tier 2 added nothing
    assert.equal(g.resolvedRefsFromRoots, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("T3d tier 2 does NOT excuse a path that exists nowhere in the subtree", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-t3d-"));
  try {
    mkdirSync(join(dir, "skills"), { recursive: true });
    writeFileSync(join(dir, "CLAUDE.md"), "root routes `skills/AGENTS.md`\n");
    writeFileSync(join(dir, "skills", "AGENTS.md"), "routes `references/conventions.md`\n");
    const c = cats(dir);
    assert.equal(c.routing_path_missing, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("T3e tier 2 is bounded: a SIBLING subtree does not excuse it", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-t3e-"));
  try {
    mkdirSync(join(dir, "alpha"), { recursive: true });
    mkdirSync(join(dir, "beta", "references"), { recursive: true });
    writeFileSync(join(dir, "CLAUDE.md"), "root routes `alpha/AGENTS.md` and `beta/`\n");
    writeFileSync(join(dir, "alpha", "AGENTS.md"), "routes `references/conventions.md`\n");
    writeFileSync(join(dir, "beta", "references", "conventions.md"), "elsewhere\n");
    const c = cats(dir);
    assert.equal(c.routing_path_missing, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("T3f ROOT-LOCATED router gets NO tier 2 (design §3.1 amended) — still drift", () => {
  // A repo-root router has no proper subtree bound; "somewhere in the repo" is
  // not evidence it meant a specific file. Strict anchored-or-drift.
  // Target is PATH-SHAPED (`x/SKILL.md`): a bare filename is no longer a route
  // (§3.5 shape exclusion 2026-08-25, pinned by T5b), so the tier-2 location
  // gate must be exercised with a valid route. `x/SKILL.md` resolves nowhere
  // yet `plugins/x/SKILL.md` exists deeper — a NESTED router would be excused by
  // tier 2; this ROOT router is not, and drifts.
  const dir = mkdtempSync(join(tmpdir(), "ca-t3f-"));
  try {
    mkdirSync(join(dir, "plugins", "x"), { recursive: true });
    writeFileSync(join(dir, "CLAUDE.md"), "root mentions `x/SKILL.md` in prose\n");
    writeFileSync(join(dir, "plugins", "x", "SKILL.md"), "unrelated\n");
    const c = cats(dir);
    assert.equal(c.routing_path_missing, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("T2f a fully-wrapped <dest> to an EXISTING file resolves as an edge, not drift", () => {
  // Design §3.2 as amended 2026-08-25 (option C), D1's mandated strip: a
  // <…>-wrapped delimiter PATH pointing at a file that exists is stripped and
  // adjudicated normally -> a routing edge, NOT a false drift. Fixes the FP the
  // strip was always meant to close; before the strip this drifted.
  const dir = mkdtempSync(join(tmpdir(), "ca-t2f-"));
  try {
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "src", "API.md"), "x\n");
    writeFileSync(join(dir, "CLAUDE.md"), "see [x](<src/API.md>)\n");
    const g = buildGraph(resolveRoot(dir), walk(resolveRoot(dir)));
    const c = g.findings.reduce<Record<string, number>>((a, f) => ((a[f.category] = (a[f.category] ?? 0) + 1), a), {});
    assert.equal(c.routing_drift, undefined);           // stripped -> resolves -> edge
    assert.equal(g.resolvedRefsFromRoots, 1);           // the wrapped path counts as a resolved route
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("T2g a broken <dest> with trailing text still DRIFTS (no silent swallow)", () => {
  // Design §3.2 as amended 2026-08-25 (option C), D2's narrowed check: a
  // markdown destination matching NEITHER enumerated placeholder form
  // (fully-wrapped token, scheme:<token>, brace form) is adjudicated normally
  // and drifts if unresolved. `[x](<docs/gone.md>#sec)` and a lone stray
  // bracket were swallowed by the old broad /[<>{}]/ fallback -> drift:0; §3.4
  // forbids that silent vanish. Both must drift now.
  const dir = mkdtempSync(join(tmpdir(), "ca-t2g-"));
  try {
    writeFileSync(join(dir, "CLAUDE.md"), "see [a](<docs/gone.md>#sec) and [b](weird}name.md)\n");
    const c = cats(dir);
    assert.equal(c.routing_drift, 2);                   // neither is a placeholder; both broken -> both drift
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("T5a a router ellipsis-segment path is not drift (design §3.5 shape exclusion)", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-t5a-"));
  try {
    mkdirSync(join(dir, "stages"), { recursive: true });
    writeFileSync(join(dir, "CLAUDE.md"), "root routes `stages/AGENTS.md`\n");
    writeFileSync(join(dir, "stages", "AGENTS.md"), "for a new run see `stages/01_.../CONTEXT.md`\n");
    const c = cats(dir);
    assert.equal(c.routing_path_missing, undefined);   // the "..." span is not a route
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("T5b a bare-filename backtick in a router is not drift (design §3.5 shape exclusion)", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-t5b-"));
  try {
    // A root router mentioning a bare filename in prose: not a route. (This is
    // the old T3f vehicle; bare filenames are no longer routes, so T3f now uses
    // a path-shaped target to keep testing the tier-2 location gate.)
    mkdirSync(join(dir, "plugins", "x"), { recursive: true });
    writeFileSync(join(dir, "CLAUDE.md"), "root mentions `SKILL.md` in prose\n");
    writeFileSync(join(dir, "plugins", "x", "SKILL.md"), "unrelated\n");
    const c = cats(dir);
    assert.equal(c.routing_path_missing, undefined);   // bare filename, no path segment
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("T-dir-1 dir-granularity: a doc directly in a routed DIRECTORY is reachable, not an orphan", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-dg1-"));
  try {
    mkdirSync(join(dir, "workspace"), { recursive: true });
    // Router routes to a DIRECTORY (trailing slash), not a document.
    writeFileSync(join(dir, "CLAUDE.md"), "root routes `workspace/`\n");
    // A document sitting DIRECTLY inside the routed directory.
    writeFileSync(join(dir, "workspace", "NOTES.md"), "a doc directly under the routed dir\n");
    const c = cats(dir);
    assert.equal(c.orphan, undefined);   // reachable via the directory route (was an orphan before)
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("T-dir-2 dir-granularity is DIRECTORY-ONLY: a doc in a SUBDIRECTORY of a routed dir stays an orphan", () => {
  // Pins the depth choice (§3.2). A full-subtree implementation would reach
  // BURIED.md and make this assert 0 — the masked-rot direction the design refused.
  const dir = mkdtempSync(join(tmpdir(), "ca-dg2-"));
  try {
    mkdirSync(join(dir, "workspace", "deep"), { recursive: true });
    writeFileSync(join(dir, "CLAUDE.md"), "root routes `workspace/`\n");
    writeFileSync(join(dir, "workspace", "NOTES.md"), "direct child — reachable\n");
    writeFileSync(join(dir, "workspace", "deep", "BURIED.md"), "one level down — not reached by a directory-only route\n");
    const c = cats(dir);
    assert.equal(c.orphan, 1);   // only workspace/deep/BURIED.md; NOTES.md is reachable
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("T-dir-3 only directory TARGETS propagate: a routed DOCUMENT does not rescue its siblings", () => {
  // Trap detector for the directory-target-vs-routedDirs distinction (§3.1).
  // `src/CONTEXT.md` is a DOCUMENT target — it records `src` into routedDirs for
  // coverage, but must NOT make src/orphan.md reachable. Green before AND after.
  const dir = mkdtempSync(join(tmpdir(), "ca-dg3-"));
  try {
    mkdirSync(join(dir, "src"), { recursive: true });
    writeFileSync(join(dir, "CLAUDE.md"), "root routes `src/CONTEXT.md`\n");
    writeFileSync(join(dir, "src", "CONTEXT.md"), "the routed document\n");
    writeFileSync(join(dir, "src", "orphan.md"), "sibling of the routed doc, never linked\n");
    const c = cats(dir);
    assert.equal(c.orphan, 1);   // src/orphan.md stays an orphan — a document route is not a directory route
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("T-dir-4 ROOT-RESTRICTED: a directory link from an UNREACHED non-root doc does NOT rescue that dir's docs", () => {
  // The trap detector for the root-restriction ruling
  // (planning/decisions/2026-08-25_tbd-14-root-restricted-dir-propagation.md).
  // stray.md is a non-root doc that never gets reached (nothing links to it) and
  // markdown-links to directory `data/`. Under FLAT propagation, data/buried.md
  // would be rescued (silent false negative). Under root-restriction it stays an
  // orphan, because stray.md is not reachable. Green before AND after — it bites
  // only a flat implementation (verified by counterfactual at review).
  const dir = mkdtempSync(join(tmpdir(), "ca-dg4-"));
  try {
    mkdirSync(join(dir, "src"), { recursive: true });
    mkdirSync(join(dir, "data"), { recursive: true });
    // A root routing basis (so orphan enumeration runs) that reaches src/CONTEXT.md only.
    writeFileSync(join(dir, "CLAUDE.md"), "root routes `src/CONTEXT.md`\n");
    writeFileSync(join(dir, "src", "CONTEXT.md"), "reached; no directory links\n");
    // An UNREACHED non-root doc whose markdown link points at a bare directory.
    writeFileSync(join(dir, "stray.md"), "unreached doc pointing at [d](data/)\n");
    writeFileSync(join(dir, "data", "buried.md"), "under a dir routed only by an unreached doc\n");
    const c = cats(dir);
    assert.equal(c.orphan, 1);   // data/buried.md only; stray.md sits under no routed dir, so it is not even a candidate
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("T-dir-5 ROOT-RESTRICTED is REACHED-based, not root-only: a REACHED non-root doc's dir link DOES propagate", () => {
  // The positive half of the ruling: propagation follows any reached document,
  // not only routers. root -> notes.md (a non-root doc edge) reaches notes.md;
  // notes.md's markdown link to `pkg/` then propagates to pkg/leaf.md.
  const dir = mkdtempSync(join(tmpdir(), "ca-dg5-"));
  try {
    mkdirSync(join(dir, "pkg"), { recursive: true });
    writeFileSync(join(dir, "CLAUDE.md"), "root routes `notes.md`\n");           // reaches notes.md (non-root doc)
    writeFileSync(join(dir, "notes.md"), "reached non-root doc, routes [p](pkg/)\n");  // dir link from a reached doc
    writeFileSync(join(dir, "pkg", "leaf.md"), "directly under a dir routed by a reached doc\n");
    const c = cats(dir);
    assert.equal(c.orphan, undefined);   // pkg/leaf.md reachable via the reached notes.md's directory route
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// Test A — accepted-layout orphan (nested, D1) is a FINDING but NOT counted.
test("genuineAbandonedCount: a nested (D1-accepted) orphan is a finding but not counted", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-genuine-a-"));
  try {
    // root routes the `src` directory; docs DIRECTLY in src/ are reached, a doc
    // in src/sub/ is not (directory-only depth) -> an orphan, and D1-accepted.
    writeFileSync(join(dir, "CLAUDE.md"), "root routes `src/`\n");   // trailing slash: a bare `src` is not a backtick path candidate (links.ts)
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "src", "reached.md"), "directly in routed src -> reached\n");
    mkdirSync(join(dir, "src", "sub"));
    writeFileSync(join(dir, "src", "sub", "nested.md"), "nested under routed src -> D1 accepted\n");
    const root = resolveRoot(dir);
    const g = buildGraph(root, walk(root));
    const orphanFiles = g.findings.filter((f) => f.category === "orphan").map((f) => f.file);
    assert.deepEqual(orphanFiles, ["src/sub/nested.md"], "the nested doc is the one orphan finding");
    assert.equal(g.orphanCount, 1, "orphanCount counts the finding");
    assert.equal(g.genuineAbandonedCount, 0, "but it is accepted-layout (D1) -> not scored as rot");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// Test B — a GENUINE orphan (unreachable, directly in a dir routed only by an
// UNREACHED non-root doc, no accepted signal) DOES increment the counter.
test("genuineAbandonedCount: a plain doc in a dir routed by an unreached non-root is counted", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-genuine-b-"));
  try {
    // root resolves ONE edge (so orphans is assessed): keep/CONTEXT.md.
    writeFileSync(join(dir, "CLAUDE.md"), "root [keep](keep/CONTEXT.md)\n");
    mkdirSync(join(dir, "keep"));
    writeFileSync(join(dir, "keep", "CONTEXT.md"), "reached leaf\n");
    // island/notes.md is NOT linked from root (unreached) and it routes the zone/
    // directory. zone therefore enters routedDirs (candidacy) but is never reached.
    mkdirSync(join(dir, "island"));
    writeFileSync(join(dir, "island", "notes.md"), "unreached; routes [z](../zone)\n");
    mkdirSync(join(dir, "zone"));
    writeFileSync(join(dir, "zone", "GENUINE.md"), "plain doc, directly in routed-but-unreached zone\n");
    const root = resolveRoot(dir);
    const g = buildGraph(root, walk(root));
    const orphanFiles = g.findings.filter((f) => f.category === "orphan").map((f) => f.file);
    assert.ok(orphanFiles.includes("zone/GENUINE.md"), "zone/GENUINE.md is an orphan finding");
    assert.equal(g.genuineAbandonedCount, 1, "it is not nested/skill/agent/dated -> genuine-abandoned, counted");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("dirTargets exposes only genuine directory-target routes, not file-parent dirs", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-graph-dt-"));
  try {
    // root routes to a DIRECTORY (src/lib) and to a FILE (apps/admin/README.md).
    writeFileSync(join(dir, "CLAUDE.md"), "root [lib](src/lib) [readme](apps/admin/README.md)\n");
    mkdirSync(join(dir, "src", "lib"), { recursive: true });
    writeFileSync(join(dir, "src", "lib", "CONTEXT.md"), "lib ctx\n");
    mkdirSync(join(dir, "apps", "admin"), { recursive: true });
    writeFileSync(join(dir, "apps", "admin", "README.md"), "admin readme\n");
    const root = resolveRoot(dir);
    const g = buildGraph(root, walk(root));
    // the DIRECTORY target is present:
    assert.ok(g.dirTargets.has("src/lib"), "src/lib was routed as a directory target");
    // the FILE-parent dir is in routedDirs but NOT a directory target:
    assert.ok(g.routedDirs.has("apps/admin"), "apps/admin is in routedDirs via the README file link");
    assert.ok(!g.dirTargets.has("apps/admin"), "apps/admin was never routed as a directory target");
    // root "" is never a directory target:
    assert.ok(!g.dirTargets.has(""), "root is not a directory target");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("MSW shape: a doc nested below a FILE-parent-routed dir is genuine-abandoned, not netted (TBD-19)", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-graph-msw-"));
  try {
    // root routes to the FILE apps/admin/README.md (furniture) -> apps/admin lands in
    // routedDirs but is NOT a directory-target. A doc nested below it is an orphan.
    writeFileSync(join(dir, "CLAUDE.md"), "root [readme](apps/admin/README.md)\n");
    mkdirSync(join(dir, "apps", "admin", "test-utils", "x"), { recursive: true });
    writeFileSync(join(dir, "apps", "admin", "README.md"), "admin readme\n");
    writeFileSync(join(dir, "apps", "admin", "test-utils", "x", "MSW_USAGE_GUIDE.md"), "a genuine human doc, unreferenced\n");
    const root = resolveRoot(dir);
    const g = buildGraph(root, walk(root));
    assert.ok(g.routedDirs.has("apps/admin"), "apps/admin routed via the README file link");
    assert.ok(!g.dirTargets.has("apps/admin"), "apps/admin is not a directory-target");
    // it IS an orphan finding AND it counts as genuine-abandoned (D1 no longer nets it):
    assert.equal(g.orphanCount, 1);
    assert.equal(g.genuineAbandonedCount, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("PRD shape: a doc whose parent is a file-parent-routed dir but a DISTANT ancestor is a dir-target is genuine-abandoned (TBD-19 refinement)", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-graph-prd-"));
  try {
    // root routes to the DIRECTORY products (dir-target) AND to a FILE deep under it,
    // making products/desktop/docs/plans a file-parent in routedDirs.
    writeFileSync(join(dir, "CLAUDE.md"), "root [prods](products) [idx](products/desktop/docs/plans/index.md)\n");
    mkdirSync(join(dir, "products", "desktop", "docs", "plans"), { recursive: true });
    writeFileSync(join(dir, "products", "desktop", "docs", "plans", "index.md"), "indexed by root\n");
    // the live PRD: parent products/desktop/docs/plans is a file-parent; products is a dir-target 3 levels up.
    writeFileSync(join(dir, "products", "desktop", "docs", "plans", "browser-tabs.md"), "# PRD: Browser Tabs\nStatus: ready-for-agent\n");
    const root = resolveRoot(dir);
    const g = buildGraph(root, walk(root));
    assert.ok(g.dirTargets.has("products"), "products is a directory-target");
    assert.ok(g.routedDirs.has("products/desktop/docs/plans") && !g.dirTargets.has("products/desktop/docs/plans"), "the plans dir is a file-parent, not a dir-target");
    // the PRD is an orphan finding AND counts as genuine-abandoned (nearest routing-known
    // ancestor is the file-parent parent, so D1 does NOT net it):
    const orphanFiles = g.findings.filter((f) => f.category === "orphan").map((f) => f.file);
    assert.ok(orphanFiles.includes("products/desktop/docs/plans/browser-tabs.md"), "the PRD is an orphan finding");
    assert.equal(g.genuineAbandonedCount, 1, "the PRD counts as genuine-abandoned, not netted");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("dirTargets excludes root '' even when a router routes to '.' (D1 cannot net the whole repo)", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-graph-dot-"));
  try {
    // a router routes to the repo root as a directory ('.') AND to a real subdir.
    writeFileSync(join(dir, "CLAUDE.md"), "root [self](.) [lib](src/lib)\n");
    mkdirSync(join(dir, "src", "lib"), { recursive: true });
    writeFileSync(join(dir, "src", "lib", "CONTEXT.md"), "lib ctx\n");
    const root = resolveRoot(dir);
    const g = buildGraph(root, walk(root));
    assert.ok(!g.dirTargets.has(""), "root '' must be filtered out of dirTargets");
    assert.ok(g.dirTargets.has("src/lib"), "a genuine subdir target is still present");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
