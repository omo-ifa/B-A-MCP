# Orphans genuine-abandoned re-base — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-base the `context_audit` `orphans` sub-score so it scores genuine-abandoned rot only, netting out the four tightly-detectable TBD-14 accepted-layout classes, and surface `stats.genuine_abandoned_count` so the score is reconstructable from output.

**Architecture:** Add a new pure-function module `accepted-layout.ts` with four independent detectors + an aggregator `isAcceptedLayout`. `graph.ts` computes a `genuineAbandonedCount` alongside the unchanged `orphanCount` (findings stay exhaustive) by asking `isAcceptedLayout` about each unreachable candidate. `index.ts` points the `orphans` sub-score at `genuineAbandonedCount` and adds `stats.genuine_abandoned_count`. No detector recomputes reachability — they classify the already-computed orphan set.

**Tech Stack:** TypeScript (ESM, NodeNext), `node:test` + `node:assert/strict` only. No new dependencies.

**Spec:** `planning/designs/2026-08-26_orphans-genuine-abandoned-rebase-design.md`

## Global Constraints

- **Tie-breaker (verbatim from spec):** a visible false positive beats a silent false negative. Silent FN = scoring real rot as accepted (worse); visible FP = flagging an accepted-layout doc as rot (acceptable — still a finding). Every detector fails toward the visible direction.
- **Findings enumeration is unchanged.** Every unreachable candidate still emits its `orphan` finding. The re-base changes only the *scored numerator*, never candidacy or findings. Do NOT move any class into `FURNITURE`.
- **Denominator unchanged:** `orphanCandidateTotal` (all under-routed-dir, non-furniture, non-root candidates) stays the denominator. Sub-score is numerator-only: `orphans = 1 − genuineAbandonedCount / orphanCandidateTotal`.
- **The `orphans` weight is NOT set here** — it stays gated under TBD-10 (`TBD_10_WEIGHTS` excludes `orphans`). Do not touch `score.ts` weights.
- **Detectors run ONLY on the post-TBD-14 orphan set** (candidates ∉ `reached`). They never recompute reachability.
- **Rule 8:** `src/API.md` updates in the same commit as the schema/semantics change (Task 8).
- **Rule 2:** the context-budget ledger in `src/CONTEXT.md` is re-measured in the same commit (Task 8). Expect it UNCHANGED at 252 — `contextAuditTool.outputSchema.properties.stats` is the opaque `{ type: "object" }`, so a new stats field adds no standing tokens — but the re-measure must be run and recorded, not assumed.
- **Rule 7:** no threshold/weight NUMBER is set. The detectors are structural/convention rules, not thresholds.
- **TypeScript:** ESM with explicit `.js` import extensions on relative imports (compiled-output extension). Tests import from `../../src/tools/context-audit/<mod>.js`.

---

### Task 1: `accepted-layout.ts` — D1 route-to-directory-nested detector

**Files:**
- Create: `src/tools/context-audit/accepted-layout.ts`
- Test: `test/context-audit/accepted-layout.test.ts`

**Interfaces:**
- Consumes: nothing (pure functions over strings + `Set<string>`).
- Produces: `parentDir(relPath: string): string`; `isRouteToDirNested(relPath: string, routedDirs: Set<string>): boolean`.

**Signal (spec §D1):** a candidate whose immediate parent dir is NOT in `routedDirs` but some strict ancestor dir IS — i.e. it sits in a subdirectory below the nearest routed directory, exactly what TBD-14's directory-only propagation leaves unreached. A doc directly inside a routed dir (immediate parent ∈ `routedDirs`) is NOT nested (spec §D1 edge case — stays counted).

- [ ] **Step 1: Write the failing test**

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { parentDir, isRouteToDirNested } from "../../src/tools/context-audit/accepted-layout.js";

test("parentDir returns the directory portion, empty for root-level", () => {
  assert.equal(parentDir("a/b/c.md"), "a/b");
  assert.equal(parentDir("c.md"), "");
});

test("D1 route-to-dir-nested: nested under a routed dir is accepted; direct child is not", () => {
  const routedDirs = new Set(["src"]);
  // src/sub/deep.md — parent "src/sub" not routed, ancestor "src" routed -> nested (accepted)
  assert.equal(isRouteToDirNested("src/sub/deep.md", routedDirs), true);
  // src/direct.md — parent "src" IS routed -> directly in routed dir -> NOT nested
  assert.equal(isRouteToDirNested("src/direct.md", routedDirs), false);
  // outside any routed dir -> not nested
  assert.equal(isRouteToDirNested("other/x.md", routedDirs), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build && node --test dist/test/context-audit/accepted-layout.test.js`
Expected: FAIL — `accepted-layout.js` does not exist / exports undefined.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/tools/context-audit/accepted-layout.ts
// Detects the TBD-14 accepted-layout classes for a doc, deterministically, at
// scoring time. Pure functions over already-computed structures — they classify
// the post-TBD-14 orphan set and never recompute reachability. Any detector
// firing means "not genuine-abandoned rot", so the doc is excluded from the
// orphans sub-score numerator (it stays a candidate and a finding — see graph.ts).

export function parentDir(relPath: string): string {
  const i = relPath.lastIndexOf("/");
  return i < 0 ? "" : relPath.slice(0, i);
}

// All directory ancestors of a doc, immediate parent first, up to "" (repo root).
// "a/b/c.md" -> ["a/b", "a", ""].
function ancestorDirs(relPath: string): string[] {
  const out: string[] = [];
  let d = parentDir(relPath);
  while (true) { out.push(d); if (d === "") break; d = parentDir(d); }
  return out;
}

// D1 — route-to-directory, nested. The doc is under a routed directory but not
// DIRECTLY in one (an intervening subdirectory). Structural fact; no silent-FN.
export function isRouteToDirNested(relPath: string, routedDirs: Set<string>): boolean {
  const parent = parentDir(relPath);
  if (routedDirs.has(parent)) return false;               // directly in a routed dir -> not nested
  for (const a of ancestorDirs(relPath)) if (a !== parent && routedDirs.has(a)) return true;
  return false;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run build && node --test dist/test/context-audit/accepted-layout.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/tools/context-audit/accepted-layout.ts test/context-audit/accepted-layout.test.ts
git commit -m "feat(context_audit): D1 route-to-dir-nested detector (TBD-18)"
```

---

### Task 2: D2 skill-discovery detector + `computeSkillDirs`

**Files:**
- Modify: `src/tools/context-audit/accepted-layout.ts`
- Test: `test/context-audit/accepted-layout.test.ts` (append)

**Interfaces:**
- Consumes: `parentDir` (Task 1).
- Produces: `computeSkillDirs(docRelPaths: string[]): Set<string>`; `isSkillDiscovered(relPath: string, skillDirs: Set<string>): boolean`.

**Signal (spec §D2):** a doc has an ancestor directory that contains a walked `SKILL.md`. `SKILL.md` is walked (an in-scope `.md`, `isRoot=false`), so its directory is derivable from the doc-path set.

- [ ] **Step 1: Write the failing test**

```typescript
import { computeSkillDirs, isSkillDiscovered } from "../../src/tools/context-audit/accepted-layout.js";

test("D2 skill-discovery: a doc under a SKILL.md directory is accepted", () => {
  const docs = ["skills/foo/SKILL.md", "skills/foo/reference.md", "skills/foo/lib/util.md", "docs/guide.md"];
  const skillDirs = computeSkillDirs(docs);
  assert.deepEqual([...skillDirs].sort(), ["skills/foo"]);        // parent of the SKILL.md
  assert.equal(isSkillDiscovered("skills/foo/reference.md", skillDirs), true);   // sibling of SKILL.md
  assert.equal(isSkillDiscovered("skills/foo/lib/util.md", skillDirs), true);    // nested under the skill dir
  assert.equal(isSkillDiscovered("docs/guide.md", skillDirs), false);            // no skill ancestor
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build && node --test dist/test/context-audit/accepted-layout.test.js`
Expected: FAIL — `computeSkillDirs` / `isSkillDiscovered` not exported.

- [ ] **Step 3: Write minimal implementation**

```typescript
// Append to src/tools/context-audit/accepted-layout.ts

// All directory ancestors INCLUDING none-extra: same as ancestorDirs but exported
// use-site needs the immediate parent included, which ancestorDirs already gives.
function ancestorDirsInclusive(relPath: string): string[] {
  return ancestorDirs(relPath);   // ["a/b","a",""] — immediate parent first, up to root
}

// D2 — skill-discovery. Build the set of directories that directly contain a
// SKILL.md; a doc is skill-discovered if any ancestor directory is such a dir.
export function computeSkillDirs(docRelPaths: string[]): Set<string> {
  const s = new Set<string>();
  for (const p of docRelPaths) {
    if (p.split("/").pop()!.toLowerCase() === "skill.md") s.add(parentDir(p));
  }
  return s;
}

export function isSkillDiscovered(relPath: string, skillDirs: Set<string>): boolean {
  for (const a of ancestorDirsInclusive(relPath)) if (skillDirs.has(a)) return true;
  return false;
}
```

> Note: `ancestorDirs` is already defined in Task 1 (module-private). `ancestorDirsInclusive` is a thin alias documenting intent; if a reviewer prefers, call `ancestorDirs` directly and drop the alias. Either is acceptable — keep one name.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run build && node --test dist/test/context-audit/accepted-layout.test.js`
Expected: PASS (Task 1 + Task 2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/tools/context-audit/accepted-layout.ts test/context-audit/accepted-layout.test.ts
git commit -m "feat(context_audit): D2 skill-discovery detector (TBD-18)"
```

---

### Task 3: D3 agent-runtime config detector

**Files:**
- Modify: `src/tools/context-audit/accepted-layout.ts`
- Test: `test/context-audit/accepted-layout.test.ts` (append)

**Interfaces:**
- Produces: `isAgentRuntimeConfig(relPath: string): boolean`.

**Signal (spec §D3):** path under `.claude/**`, OR root-level `WARP.md`, OR any path containing a `cursor-hooks` directory segment. (`.cursor/`/`.windsurf/` are dot-dirs the walk excludes, so they never reach this.)

- [ ] **Step 1: Write the failing test**

```typescript
import { isAgentRuntimeConfig } from "../../src/tools/context-audit/accepted-layout.js";

test("D3 agent-runtime config: .claude/**, root WARP.md, cursor-hooks/**", () => {
  assert.equal(isAgentRuntimeConfig(".claude/agents/foo.md"), true);
  assert.equal(isAgentRuntimeConfig(".claude/projects/x/AGENT.md"), true);
  assert.equal(isAgentRuntimeConfig("WARP.md"), true);
  assert.equal(isAgentRuntimeConfig("cursor-hooks/pre.md"), true);
  assert.equal(isAgentRuntimeConfig("src/WARP.md"), false);   // WARP.md only at repo root
  assert.equal(isAgentRuntimeConfig("docs/guide.md"), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build && node --test dist/test/context-audit/accepted-layout.test.js`
Expected: FAIL — `isAgentRuntimeConfig` not exported.

- [ ] **Step 3: Write minimal implementation**

```typescript
// Append to src/tools/context-audit/accepted-layout.ts

// D3 — agent-runtime config. Path-recognition is sanctioned for THIS class by the
// TBD-14 ruling (unlike test fixtures). .claude/commands is hard-skipped by the
// walk, so it never reaches here; the rest of .claude/** is runtime config.
export function isAgentRuntimeConfig(relPath: string): boolean {
  const segs = relPath.split("/");
  if (segs[0] === ".claude") return true;
  if (relPath === "WARP.md") return true;
  if (segs.includes("cursor-hooks")) return true;
  return false;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run build && node --test dist/test/context-audit/accepted-layout.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/context-audit/accepted-layout.ts test/context-audit/accepted-layout.test.ts
git commit -m "feat(context_audit): D3 agent-runtime config detector (TBD-18)"
```

---

### Task 4: D4 tight dated-archival detector

**Files:**
- Modify: `src/tools/context-audit/accepted-layout.ts`
- Test: `test/context-audit/accepted-layout.test.ts` (append)

**Interfaces:**
- Produces: `isTightDatedArchival(relPath: string): boolean`.

**Signal (spec §D4):** D4a dated-filename — a `\d{4}-\d{2}-\d{2}` date anywhere in the path (structurally tight). D4b — a `plans` or `CHANGELOG` DIRECTORY segment (convention tight). A bare `docs/**` path is explicitly NOT netted (spec §4 gap → stays counted).

- [ ] **Step 1: Write the failing test**

```typescript
import { isTightDatedArchival } from "../../src/tools/context-audit/accepted-layout.js";

test("D4 tight dated-archival: dated filename, plans/, CHANGELOG/ — but NOT bare docs/", () => {
  // D4a — dated filename (structural)
  assert.equal(isTightDatedArchival("posts/published-2014-12-19-hello.md"), true);
  assert.equal(isTightDatedArchival("x/plans/2026-08-25-thing.md"), true);
  // D4b — plans/ and CHANGELOG/ directory segments (convention)
  assert.equal(isTightDatedArchival("skills/foo/plans/old.md"), true);
  assert.equal(isTightDatedArchival("CHANGELOG/2020.md"), true);
  // NOT netted: bare docs/ (spec gap — stays counted)
  assert.equal(isTightDatedArchival("docs/architecture.md"), false);
  // NOT netted: a file literally named plans.md (not a plans/ directory)
  assert.equal(isTightDatedArchival("plans.md"), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build && node --test dist/test/context-audit/accepted-layout.test.js`
Expected: FAIL — `isTightDatedArchival` not exported.

- [ ] **Step 3: Write minimal implementation**

```typescript
// Append to src/tools/context-audit/accepted-layout.ts

const DATED_FILENAME = /\d{4}-\d{2}-\d{2}/;   // D4a: a full ISO-ish date anywhere in the path

// D4 — tight dated-archival. D4a (dated filename) is structurally tight. D4b
// (plans/ or CHANGELOG/ DIRECTORY segment) is convention tight — the close-
// condition re-validation checks D4b nets individually (spec §6.2). Bare docs/**
// is deliberately NOT netted (spec §4 gap).
export function isTightDatedArchival(relPath: string): boolean {
  if (DATED_FILENAME.test(relPath)) return true;                       // D4a
  const dirSegs = relPath.split("/").slice(0, -1);                     // directory segments only (exclude the filename)
  if (dirSegs.includes("plans")) return true;                         // D4b
  if (dirSegs.includes("CHANGELOG")) return true;                     // D4b
  return false;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run build && node --test dist/test/context-audit/accepted-layout.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/context-audit/accepted-layout.ts test/context-audit/accepted-layout.test.ts
git commit -m "feat(context_audit): D4 tight dated-archival detector (TBD-18)"
```

---

### Task 5: `isAcceptedLayout` aggregator

**Files:**
- Modify: `src/tools/context-audit/accepted-layout.ts`
- Test: `test/context-audit/accepted-layout.test.ts` (append)

**Interfaces:**
- Consumes: D1–D4 (Tasks 1–4).
- Produces: `interface AcceptedLayoutCtx { routedDirs: Set<string>; skillDirs: Set<string> }`; `isAcceptedLayout(relPath: string, ctx: AcceptedLayoutCtx): boolean`.

- [ ] **Step 1: Write the failing test**

```typescript
import { isAcceptedLayout } from "../../src/tools/context-audit/accepted-layout.js";

test("isAcceptedLayout ORs the four detectors; a plain unreferenced doc is NOT accepted", () => {
  const ctx = { routedDirs: new Set(["src"]), skillDirs: new Set(["skills/foo"]) };
  assert.equal(isAcceptedLayout("src/sub/nested.md", ctx), true);        // D1
  assert.equal(isAcceptedLayout("skills/foo/ref.md", ctx), true);        // D2
  assert.equal(isAcceptedLayout(".claude/agents/a.md", ctx), true);      // D3
  assert.equal(isAcceptedLayout("x/2020-01-01-note.md", ctx), true);     // D4
  // genuine-abandoned: directly in a routed dir, no skill/agent/date signal
  assert.equal(isAcceptedLayout("src/ORPHAN.md", ctx), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build && node --test dist/test/context-audit/accepted-layout.test.js`
Expected: FAIL — `isAcceptedLayout` not exported.

- [ ] **Step 3: Write minimal implementation**

```typescript
// Append to src/tools/context-audit/accepted-layout.ts

export interface AcceptedLayoutCtx { routedDirs: Set<string>; skillDirs: Set<string>; }

// Any tight detector firing => the doc is accepted layout, not genuine-abandoned
// rot, so it is excluded from the orphans sub-score numerator (still a finding).
export function isAcceptedLayout(relPath: string, ctx: AcceptedLayoutCtx): boolean {
  return isRouteToDirNested(relPath, ctx.routedDirs)
    || isSkillDiscovered(relPath, ctx.skillDirs)
    || isAgentRuntimeConfig(relPath)
    || isTightDatedArchival(relPath);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run build && node --test dist/test/context-audit/accepted-layout.test.js`
Expected: PASS (all Task 1–5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/tools/context-audit/accepted-layout.ts test/context-audit/accepted-layout.test.ts
git commit -m "feat(context_audit): isAcceptedLayout aggregator (TBD-18)"
```

---

### Task 6: wire `genuineAbandonedCount` into `graph.ts`

**Files:**
- Modify: `src/tools/context-audit/graph.ts` (the `GraphResult` interface ~lines 7-20; the orphan loop ~lines 200-215; the return object ~lines 218-232)
- Test: `test/context-audit/graph.test.ts` (append)

**Interfaces:**
- Consumes: `isAcceptedLayout`, `computeSkillDirs` (Tasks 2, 5).
- Produces: `GraphResult.genuineAbandonedCount: number`.

**Behaviour:** findings, `orphanCount`, and `orphanCandidateTotal` are unchanged. A new counter increments for every unreachable candidate that is NOT accepted layout.

- [ ] **Step 1: Write the failing test**

```typescript
// Append to test/context-audit/graph.test.ts

// Test A — accepted-layout orphan (nested, D1) is a FINDING but NOT counted.
test("genuineAbandonedCount: a nested (D1-accepted) orphan is a finding but not counted", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-genuine-a-"));
  try {
    // root routes the `src` directory; docs DIRECTLY in src/ are reached, a doc
    // in src/sub/ is not (directory-only depth) -> an orphan, and D1-accepted.
    writeFileSync(join(dir, "CLAUDE.md"), "root routes `src`\n");
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
```

> **Implementer note:** Test B relies on the spec §D1 edge case — a doc *directly* inside a directory that is in `routedDirs` only because an **unreached non-root** doc routed it. That doc's immediate parent IS a routed dir, so D1 does not fire, and with no skill/agent/dated signal it is genuine-abandoned. This is the one shape that yields a non-accepted orphan (every doc *nested below* a routed dir is D1-accepted, and every doc *directly in* a dir routed by a *reached* source is itself reached). If `island/notes.md`'s directory route does not register in your run, confirm markdown links from non-root docs still populate `routedDirs` via `recordResolvedTarget` (they do in `graph.ts` today) before adjusting the fixture.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build && node --test dist/test/context-audit/graph.test.js`
Expected: FAIL — `g.genuineAbandonedCount` is `undefined`.

- [ ] **Step 3: Write minimal implementation**

Add the import at the top of `graph.ts`:

```typescript
import { isAcceptedLayout, computeSkillDirs } from "./accepted-layout.js";
```

Add `genuineAbandonedCount` to the `GraphResult` interface (after `orphanCandidateTotal`):

```typescript
  genuineAbandonedCount: number;  // orphans that are NOT accepted-layout: the sub-score numerator (spec TBD-18)
```

In the orphan block (currently `let orphanCount = 0; let orphanCandidateTotal = 0; if (resolvedRefsFromRoots > 0) { ... }`), compute `skillDirs` once and the new counter:

```typescript
  let orphanCount = 0;
  let orphanCandidateTotal = 0;
  let genuineAbandonedCount = 0;
  if (resolvedRefsFromRoots > 0) {
    const skillDirs = computeSkillDirs(walkRes.docs.filter((d) => d.content !== null).map((d) => d.relPath));
    for (const doc of walkRes.docs) {
      if (doc.isRoot || doc.content === null) continue;
      if (isFurniture(doc.relPath)) continue;
      if (!underRoutedDir(doc.relPath)) continue;
      orphanCandidateTotal++;
      if (!reached.has(doc.relPath)) {
        findings.push(f("orphan", doc.relPath, null, "in-scope doc unreachable from any routing root", doc.relPath, doc.relPath));
        orphanCount++;
        if (!isAcceptedLayout(doc.relPath, { routedDirs, skillDirs })) genuineAbandonedCount++;
      }
    }
  }
```

Add `genuineAbandonedCount` to the returned object (alongside `orphanCount`):

```typescript
    orphanCount,
    orphanCandidateTotal,
    genuineAbandonedCount,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run build && node --test dist/test/context-audit/graph.test.js`
Expected: PASS. Also run the full suite to confirm no regression: `npm test` — existing orphan tests (orphanCount/orphanCandidateTotal unchanged) still pass.

- [ ] **Step 5: Commit**

```bash
git add src/tools/context-audit/graph.ts test/context-audit/graph.test.ts
git commit -m "feat(context_audit): compute genuineAbandonedCount in graph (TBD-18)"
```

---

### Task 7: point the sub-score at `genuineAbandonedCount` + surface `stats.genuine_abandoned_count`

**Files:**
- Modify: `src/tools/context-audit/types.ts` (the `AuditStats` interface)
- Modify: `src/tools/context-audit/index.ts` (the `subscores.orphans` line ~76; the `stats` object ~lines 92-101)
- Test: `test/context-audit/orchestrate.test.ts` (append)

**Interfaces:**
- Consumes: `GraphResult.genuineAbandonedCount` (Task 6).
- Produces: `AuditStats.genuine_abandoned_count: number`; `subscores.orphans` now driven by `genuineAbandonedCount`.

- [ ] **Step 1: Write the failing test**

```typescript
// Append to test/context-audit/orchestrate.test.ts
test("orphans re-base: score is reconstructable from stats.genuine_abandoned_count", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-rebase-"));
  try {
    // root routes src/ ; nested doc under src is an orphan but accepted (D1).
    writeFileSync(join(dir, "CLAUDE.md"), "root routes `src`\n");
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "src", "reached.md"), "reached\n");
    mkdirSync(join(dir, "src", "sub"));
    writeFileSync(join(dir, "src", "sub", "nested.md"), "nested -> D1 accepted\n");
    const outcome = await runContextAudit({ path: dir });
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    const r = outcome.result;
    // the new stat is present
    assert.equal(typeof r.stats.genuine_abandoned_count, "number");
    // orphan_count counts the finding; genuine_abandoned_count is <= it
    assert.ok(r.stats.genuine_abandoned_count <= r.stats.orphan_count);
    // reconstruction: orphans.score == round(100 * (1 - genuine/candidateTotal))
    const gac = r.stats.genuine_abandoned_count;
    const os = r.subscores.orphans;
    if (os.score !== null) {
      assert.equal(os.score, Math.round(100 * (1 - gac / os.n)), "orphans.score reconstructs from genuine_abandoned_count and orphans.n");
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("orphans re-base: an all-accepted-layout repo scores ~100 (was low pre-rebase)", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-allaccepted-"));
  try {
    // root routes src/ ; the only orphan candidates are nested (D1 accepted).
    writeFileSync(join(dir, "CLAUDE.md"), "root routes `src`\n");
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "src", "reached.md"), "reached\n");
    mkdirSync(join(dir, "src", "a")); writeFileSync(join(dir, "src", "a", "x.md"), "nested accepted\n");
    mkdirSync(join(dir, "src", "b")); writeFileSync(join(dir, "src", "b", "y.md"), "nested accepted\n");
    const outcome = await runContextAudit({ path: dir });
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    const os = outcome.result.subscores.orphans;
    // every orphan candidate that is unreachable is accepted -> genuine 0 -> score 100
    assert.equal(outcome.result.stats.genuine_abandoned_count, 0);
    assert.equal(os.score, 100);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build && node --test dist/test/context-audit/orchestrate.test.js`
Expected: FAIL — `r.stats.genuine_abandoned_count` is `undefined` (and the reconstruction assertion fails because `orphans` still reads `orphanCount`).

- [ ] **Step 3: Write minimal implementation**

Add the field to `AuditStats` in `types.ts` (after `orphan_count`):

```typescript
  orphan_count: number;
  genuine_abandoned_count: number;   // orphans scored as rot (not accepted-layout); the orphans sub-score numerator
```

In `index.ts`, change the `orphans` sub-score to read the new counter:

```typescript
    orphans: subscoreFromCount(g.genuineAbandonedCount, g.orphanCandidateTotal),
```

and add the stat to the `stats` object (after `orphan_count: g.orphanCount,`):

```typescript
    orphan_count: g.orphanCount,
    genuine_abandoned_count: g.genuineAbandonedCount,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run build && node --test dist/test/context-audit/orchestrate.test.js`
Expected: PASS. Then run the full suite: `npm test` — all green, `tsc` clean.

- [ ] **Step 5: Commit**

```bash
git add src/tools/context-audit/types.ts src/tools/context-audit/index.ts test/context-audit/orchestrate.test.ts
git commit -m "feat(context_audit): orphans sub-score reads genuineAbandonedCount; surface stats.genuine_abandoned_count (TBD-18)"
```

---

### Task 8: docs — `src/API.md` (rule 8) + `src/CONTEXT.md` ledger re-measure (rule 2)

**Files:**
- Modify: `src/API.md` (the `stats` field description and the `subscores`/`orphans` description)
- Modify: `src/CONTEXT.md` (the context-budget ledger)
- Test: `test/context-audit/ledger.test.js` (existing — re-run, must still pass)

**Interfaces:** none (documentation + ledger).

- [ ] **Step 1: Re-measure the ledger (evidence before writing)**

Run: `npm run build && node --test dist/test/context-audit/ledger.test.js`
Expected: PASS (`standing cost < 4000`). Then capture the exact number:

Run: `node -e "const {contextAuditTool}=require('./dist/src/tools/context-audit/index.js');const {countTokens}=require('./dist/src/tools/context-audit/tokens.js');console.log(countTokens(JSON.stringify(contextAuditTool)))"`
Expected: `252` (unchanged — `outputSchema.properties.stats` is opaque `{ type: "object" }`, so the new field adds no standing tokens).

- [ ] **Step 2: Update `src/API.md` (rule 8)**

In the `stats` object description, document the new field (keep the existing `orphan_count` sentence):

```
"genuine_abandoned_count": the orphans scored as rot — unreachable candidates that are NOT a detected accepted-layout class (route-to-directory-nested, skill-discovery, agent-runtime config, tight dated-archival). The orphans sub-score is 1 − genuine_abandoned_count / (its n); orphan_count remains the count of every orphan finding, so genuine_abandoned_count ≤ orphan_count.
```

In the `subscores` description, update the `orphans` sentence so it states the re-based basis: the sub-score now scores **genuine-abandoned** orphans only (accepted-layout classes are still enumerated as `orphan` findings but excluded from the numerator; the sub-score is reconstructable from `stats.genuine_abandoned_count`).

- [ ] **Step 3: Update the context-budget ledger in `src/CONTEXT.md` (rule 2)**

In the ledger table's `context_audit` Notes cell, append: `2026-08-26: re-measured after surfacing stats.genuine_abandoned_count (TBD-18) — unchanged at 252, because outputSchema.properties.stats is the opaque {type:"object"} and the new field adds no standing tokens.` Keep the total at **252 / ~4000**.

- [ ] **Step 4: Verify docs consistent + full suite green**

Run: `python3 -c "import re,json;[json.loads(b) for b in re.findall(r'\`\`\`json\n(.*?)\n\`\`\`', open('src/API.md').read(), re.S)]" && echo API-json-ok`
Expected: `API-json-ok` (all JSON blocks parse).
Run: `npm test`
Expected: 115 prior + new tests, all pass, `tsc` clean.

- [ ] **Step 5: Commit**

```bash
git add src/API.md src/CONTEXT.md
git commit -m "docs(context_audit): API.md orphans re-base + stats.genuine_abandoned_count; ledger re-measured unchanged (TBD-18, rules 8+2)"
```

---

## Post-plan (NOT part of task execution — for the finishing session)

After all tasks pass: request code review (`superpowers:requesting-code-review`), then run the **categorical re-validation** on the pinned nine-repo corpus (spec §6) — including the **D4b `plans/`/`CHANGELOG/` per-net individual check** (spec §6.2) — as a calibration doc under `planning/calibration/`. Only that re-validation closes TBD-18 and unblocks the `orphans` weight (a separate `/decisions`, TBD-10). Land via `superpowers:finishing-a-development-branch` (branch + PR; verify content on trunk after a squash merge, Obs 20). Update `src/TDD.md` (TBD-18 → build landed / close pending re-val) and `planning/Roadmap.md`.

## Self-Review (author checklist — completed)

1. **Spec coverage:** §2.1 numerator-only shape → Task 7. §2.2 not-FURNITURE / findings unchanged → Global Constraints + Task 6 (findings untouched). §2.3 unchanged fields + new stat → Task 7. §3 D1–D4 detectors → Tasks 1–4. §D-aggregate → Task 5. §4 named gaps (not netted) → covered by NOT implementing rules for them (component-manifest/test-fixtures/bare-docs) + documented in API.md Task 8. §5 FP/FN → detector comments. §6 close condition → Post-plan (out of task scope, correctly). §7 tests → Tasks 1–8 test steps + reconstruction test (Task 7); rule 8 + rule 2 → Task 8. §8 out of scope (weight untouched) → Global Constraints. §9 /decisions items → Post-plan / not built. All covered.
2. **Placeholder scan:** no "TBD/TODO/handle appropriately"; every code step has real code; the one implementer-judgment note (Task 6 genuine-fixture) is explicit about why and defers the decisive contrast to Task 7, not a placeholder.
3. **Type consistency:** `parentDir`, `isRouteToDirNested`, `computeSkillDirs`, `isSkillDiscovered`, `isAgentRuntimeConfig`, `isTightDatedArchival`, `AcceptedLayoutCtx`, `isAcceptedLayout`, `GraphResult.genuineAbandonedCount`, `AuditStats.genuine_abandoned_count` — names identical across producing and consuming tasks. `subscoreFromCount(bad, total)` matches the existing signature. `stats.genuine_abandoned_count` matches the API.md text.
