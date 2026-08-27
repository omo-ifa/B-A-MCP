# TBD-19/20 Detector-Basis Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the two silent-FN vectors the TBD-18 §6 re-validation found — re-base D1 (route-to-dir-nested) onto the directory-target set (TBD-19), and replace D4b's `plans/`/`CHANGELOG/` directory-segment convention with a structural version-shaped-basename net (TBD-20).

**Architecture:** Two detector corrections inside `src/tools/context-audit/accepted-layout.ts`, plus a one-line exposure in `graph.ts` (flatten `dirTargetsBySrc` into a `GraphResult.dirTargets` set). No output-schema change, no new field. The `orphans` sub-score stays numerator-only and stays out of the headline weight (TBD-10). Correctness is confirmed by a later categorical re-validation on the pinned nine-repo corpus, not by this plan.

**Tech Stack:** TypeScript ESM (`NodeNext`), `node:test`, `node --test`.

**Spec:** `planning/designs/2026-08-26_orphans-genuine-abandoned-rebase-design.md` (as amended 2026-08-26 — §D1, §D4, §5, §6.2, §7) and the decision record `planning/decisions/2026-08-26_tbd-19-tbd-20-d1-basis-d4b-disposition.md`.

## Global Constraints

- **Node v25.2.1**; run the suite with `npm test` (runs `tsc --noEmit` then `node --test`). Baseline before this plan: **126/126** pass, `tsc` clean.
- **No number set** (rule 7): no threshold/weight number is introduced. `TBD_10_WEIGHTS` / `ROUTING_LAYER_KEYS` in `score.ts` are **not** touched.
- **Rule 8 (API.md, same commit):** the only surface-visible change is D4's class-name phrase `tight dated-archival` → `tight dated/versioned-archival` in `src/API.md` (two prose mentions). It rides in the **same commit** as the D4 code change (Task 3). No JSON-schema/field change.
- **Rule 2 (ledger):** internal-only change; re-measure the context-budget ledger at the end and confirm it is unchanged (expected **252 / ~4000**). Edit `src/CONTEXT.md` only if the measured number actually moves.
- **Findings enumeration, the numerator-only shape, `stats.genuine_abandoned_count`, `orphanCandidateTotal`, `routedDirs`, and reachability are unchanged.** Only which orphans are classified accepted-layout changes.
- Detectors are pure functions over already-computed structures; they never recompute reachability or touch the filesystem.

---

## Task 1: Expose `dirTargets` from `buildGraph`

Add a flattened directory-target set to `GraphResult`. Additive — no behavior change yet (nothing reads it until Task 2). The set is the union, over all source docs, of the directories each routed **as a directory target** (`dirTargetsBySrc` values). It excludes file-parent additions and root `""` — the exact pollution in `routedDirs` that silently netted MSW.

**Files:**
- Modify: `src/tools/context-audit/graph.ts` (add field to `GraphResult` interface ~L8-20; compute + return ~before L248)
- Test: `test/context-audit/graph.test.ts` (append one test)

**Interfaces:**
- Produces: `GraphResult.dirTargets: Set<string>` — flattened union of `dirTargetsBySrc` values. Consumed by Task 2's `isAcceptedLayout` call site.

- [ ] **Step 1: Write the failing test**

Append to `test/context-audit/graph.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --test-name-pattern="dirTargets exposes" test/context-audit/graph.test.ts` (after `tsc`)
Expected: FAIL — `g.dirTargets` is `undefined` (property does not exist), or `tsc` errors that `dirTargets` is not on `GraphResult`.

- [ ] **Step 3: Write minimal implementation**

In `src/tools/context-audit/graph.ts`, add the field to the `GraphResult` interface (next to `routedDirs`):

```ts
  routedDirs: Set<string>;
  dirTargets: Set<string>;   // flattened union of dirTargetsBySrc values: directories routed AS a directory target (D1's basis, TBD-19). Excludes file-parent and root "" entries.
```

Then, just before the `return {` at the end of `buildGraph`, flatten the per-source map:

```ts
  // Flatten the per-source directory-target map into one set — D1's structural
  // basis (TBD-19). This is strictly the directories some router routed AS a
  // directory, never a file-parent or root "" entry.
  const dirTargets = new Set<string>();
  for (const set of dirTargetsBySrc.values()) for (const d of set) dirTargets.add(d);
```

And add `dirTargets,` to the returned object (next to `routedDirs,`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — new test green, all prior tests still pass (127 total).

- [ ] **Step 5: Commit**

```bash
git add src/tools/context-audit/graph.ts test/context-audit/graph.test.ts
git commit -F - <<'EOF'
feat(context_audit): expose dirTargets from buildGraph (TBD-19 basis)

Flatten dirTargetsBySrc into GraphResult.dirTargets — the union of
directories routed AS a directory target, excluding the file-parent and
root "" entries that pollute routedDirs. Additive; nothing reads it yet.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 2: Re-base D1 onto `dirTargets` (TBD-19)

> **SUPERSEDED AT RE-VALIDATION — as-built differs from this task's original text.** The straight swap below (key D1 on `dirTargets` alone, drop `routedDirs` from the ctx) was built and re-validated, and the categorical re-validation showed it **reintroduces a silent FN**: docs whose immediate parent is a file-parent-routed dir but which have a *distant* `dirTargets` ancestor (the live posthog PRDs under `products/desktop/docs/plans/`, `products` a dir-target 3 levels up) get netted through the intervening file-parents. The as-built D1 therefore uses the **nearest-routing-known-ancestor rule** with **both** sets — `isRouteToDirNested(relPath, routedDirs, dirTargets)`, and `AcceptedLayoutCtx = {routedDirs, dirTargets, skillDirs}` (routedDirs is kept, not dropped). See `planning/decisions/2026-08-26_tbd-19-tbd-20-d1-basis-d4b-disposition.md` (§19.1–19.3, "Re-validation finding") and the amended design §D1 for the authoritative rule. The steps below are retained for provenance; read the decision/design for the shipped behavior.

Switch `isRouteToDirNested` off `routedDirs` and onto `dirTargets`; replace `AcceptedLayoutCtx`'s `routedDirs` field with `dirTargets` (D1 is its only consumer); update the `isAcceptedLayout` call site in `graph.ts` to pass the exposed `dirTargets`. This is the behavior change: a doc nested below a file-parent-routed directory (the MSW shape) stops being netted and is correctly counted as genuine-abandoned.

**Files:**
- Modify: `src/tools/context-audit/accepted-layout.ts` (`isRouteToDirNested` L24-29; `AcceptedLayoutCtx` L75; `isAcceptedLayout` L79-84)
- Modify: `src/tools/context-audit/graph.ts` (the `isAcceptedLayout(...)` call, ~L231)
- Test: `test/context-audit/accepted-layout.test.ts` (update D1 + isAcceptedLayout tests, add MSW regression); `test/context-audit/graph.test.ts` (add end-to-end MSW-shape genuine-abandoned test)

**Interfaces:**
- Consumes: `GraphResult.dirTargets` (Task 1).
- Produces: `isRouteToDirNested(relPath: string, dirTargets: Set<string>): boolean`; `AcceptedLayoutCtx = { dirTargets: Set<string>; skillDirs: Set<string> }`.

- [ ] **Step 1: Write the failing tests**

In `test/context-audit/accepted-layout.test.ts`, **replace** the existing "D1 route-to-dir-nested" test (L14-22) with:

```ts
test("D1 route-to-dir-nested: keys on dirTargets, not the broader routedDirs (TBD-19)", () => {
  // dirTargets = directories routed AS a directory. "src" is one; "apps/admin" is NOT
  // (in the real graph it lands in routedDirs only via a file-parent link).
  const dirTargets = new Set(["src"]);
  // nested below a directory-target -> accepted layout
  assert.equal(isRouteToDirNested("src/sub/deep.md", dirTargets), true);
  // directly inside a directory-target -> not nested
  assert.equal(isRouteToDirNested("src/direct.md", dirTargets), false);
  // outside any directory-target -> not nested
  assert.equal(isRouteToDirNested("other/x.md", dirTargets), false);
  // MSW REGRESSION: nested below a dir that is NOT a directory-target must NOT net,
  // even several levels deep (the Ghost apps/admin/.../MSW_USAGE_GUIDE.md shape).
  assert.equal(isRouteToDirNested("apps/admin/test-utils/x/MSW_USAGE_GUIDE.md", dirTargets), false);
});
```

Then **replace** the `isAcceptedLayout` test (L70-78) so its ctx uses `dirTargets`:

```ts
test("isAcceptedLayout ORs the four detectors; a plain unreferenced doc is NOT accepted", () => {
  const ctx = { dirTargets: new Set(["src"]), skillDirs: new Set(["skills/foo"]) };
  assert.equal(isAcceptedLayout("src/sub/nested.md", ctx), true);        // D1
  assert.equal(isAcceptedLayout("skills/foo/ref.md", ctx), true);        // D2
  assert.equal(isAcceptedLayout(".claude/agents/a.md", ctx), true);      // D3
  assert.equal(isAcceptedLayout("x/2020-01-01-note.md", ctx), true);     // D4
  // genuine-abandoned: directly in a directory-target, no skill/agent/date signal
  assert.equal(isAcceptedLayout("src/ORPHAN.md", ctx), false);
});
```

In `test/context-audit/graph.test.ts`, append the end-to-end regression:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `tsc` errors first (the `AcceptedLayoutCtx` literal in tests now uses `dirTargets`, which the type does not yet have; `isRouteToDirNested`'s second arg name is cosmetic but the graph call site still passes `routedDirs`). If `tsc` is made to pass by the impl below, the MSW graph test fails on `genuineAbandonedCount === 0` under the old `routedDirs` basis.

- [ ] **Step 3: Write minimal implementation**

In `src/tools/context-audit/accepted-layout.ts`:

Re-base `isRouteToDirNested` (param + doc):

```ts
// D1 — route-to-directory, nested. The doc is under a routed DIRECTORY-TARGET but
// not DIRECTLY in one (an intervening subdirectory). Keys on dirTargets — the
// directories routed AS a directory — NOT the broader routedDirs, which also holds
// file-parent and root "" entries and would silently net genuine rot (TBD-19).
export function isRouteToDirNested(relPath: string, dirTargets: Set<string>): boolean {
  const parent = parentDir(relPath);
  if (dirTargets.has(parent)) return false;               // directly in a directory-target -> not nested
  for (const a of ancestorDirs(relPath)) if (a !== parent && dirTargets.has(a)) return true;
  return false;
}
```

Update the context type (D1 is its only consumer of the field):

```ts
export interface AcceptedLayoutCtx { dirTargets: Set<string>; skillDirs: Set<string>; }
```

Update `isAcceptedLayout` to pass the new field:

```ts
export function isAcceptedLayout(relPath: string, ctx: AcceptedLayoutCtx): boolean {
  return isRouteToDirNested(relPath, ctx.dirTargets)
    || isSkillDiscovered(relPath, ctx.skillDirs)
    || isAgentRuntimeConfig(relPath)
    || isTightDatedArchival(relPath);
}
```

In `src/tools/context-audit/graph.ts`, update the call site (~L231):

```ts
        if (!isAcceptedLayout(doc.relPath, { dirTargets, skillDirs })) genuineAbandonedCount++;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all tests green (127 total). The MSW graph test now reports `genuineAbandonedCount === 1`.

- [ ] **Step 5: Commit**

```bash
git add src/tools/context-audit/accepted-layout.ts src/tools/context-audit/graph.ts test/context-audit/accepted-layout.test.ts test/context-audit/graph.test.ts
git commit -F - <<'EOF'
fix(context_audit): re-base D1 onto dirTargets, not routedDirs (TBD-19)

isRouteToDirNested keyed on routedDirs, which graph.ts pollutes with
file-parent and root "" entries; a doc nested below a dir that merely
contained a linked file (the Ghost MSW_USAGE_GUIDE.md shape) was silently
netted out of genuine-abandoned. Key on dirTargets — the directories
routed AS directory targets — restoring the structural property D1
claimed. AcceptedLayoutCtx.routedDirs -> dirTargets (D1's only consumer).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 3: Replace D4b segment convention with a structural version-shape net (TBD-20)

Drop the `plans/` and `CHANGELOG/` directory-segment rules from `isTightDatedArchival`; add a **version-shaped basename** rule (full semver, `^v?\d+\.\d+(\.\d+)+$`) — same structural class as the dated-filename rule. A live doc under `plans/` (non-dated, non-versioned) stops being netted; released version archives (`CHANGELOG/1.4.1.md`) stay netted via their basename. Update the `src/API.md` class-name phrase in the same commit (rule 8).

**Files:**
- Modify: `src/tools/context-audit/accepted-layout.ts` (`isTightDatedArchival` L61-73)
- Modify: `src/API.md` (two prose mentions of `tight dated-archival`, ~L81 and ~L113)
- Test: `test/context-audit/accepted-layout.test.ts` (replace the D4 test)

**Interfaces:**
- Produces: `isTightDatedArchival(relPath: string): boolean` — unchanged signature; nets on a dated filename **or** a version-shaped basename only.

- [ ] **Step 1: Write the failing test**

In `test/context-audit/accepted-layout.test.ts`, **replace** the D4 test (L42-53) with:

```ts
test("D4 tight dated/versioned-archival: dated filename OR version-shaped basename; segment conventions dropped (TBD-20)", () => {
  // D4a — dated filename (structural), unchanged
  assert.equal(isTightDatedArchival("posts/published-2014-12-19-hello.md"), true);
  assert.equal(isTightDatedArchival("x/plans/2026-08-25-thing.md"), true);   // dated plan still nets, via D4a
  // D4b — version-shaped basename (structural), full semver only
  assert.equal(isTightDatedArchival("CHANGELOG/1.4.1.md"), true);
  assert.equal(isTightDatedArchival("CHANGELOG/6.1.0.md"), true);
  assert.equal(isTightDatedArchival("archive/v2.0.0.md"), true);
  // ambiguous two-part forms do NOT net (counted = safe direction)
  assert.equal(isTightDatedArchival("docs/v2.md"), false);
  assert.equal(isTightDatedArchival("docs/2.0.md"), false);
  // DROPPED conventions: a live, non-dated, non-versioned doc under plans/ or CHANGELOG/
  // is NO LONGER netted (the posthog live-PRD silent-FN vector).
  assert.equal(isTightDatedArchival("products/desktop/docs/plans/browser-tabs.md"), false);
  assert.equal(isTightDatedArchival("CHANGELOG/upcoming.md"), false);
  // NOT netted: bare docs/ (spec gap — stays counted), unchanged
  assert.equal(isTightDatedArchival("docs/architecture.md"), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --test-name-pattern="D4 tight dated/versioned" test/context-audit/accepted-layout.test.ts` (after `tsc`)
Expected: FAIL — under the current code `plans/browser-tabs.md` and `CHANGELOG/upcoming.md` return `true` (asserted `false`), and the version-shape basenames return `false` (asserted `true`).

- [ ] **Step 3: Write minimal implementation**

In `src/tools/context-audit/accepted-layout.ts`, replace the `DATED_FILENAME` block and `isTightDatedArchival`:

```ts
const DATED_FILENAME = /\d{4}-\d{2}-\d{2}/;              // D4a: a full ISO-ish date anywhere in the path
const VERSION_BASENAME = /^v?\d+\.\d+(\.\d+)+$/;         // D4b: a full-semver basename (>=2 dots), e.g. 1.4.1, 6.1.0, v2.0.0

// D4 — tight dated/versioned archival. BOTH sub-rules are STRUCTURAL (self-evident
// from the filename), never a directory-name convention. D4a: a dated filename.
// D4b: a version-shaped basename (a released-version artifact by self-evidence,
// e.g. CHANGELOG/1.4.1.md). The former plans// and CHANGELOG/ directory-segment
// rules are DROPPED (TBD-20) — they were a convention guess and a silent-FN vector
// (live PRDs under plans/). Bare docs/** is still deliberately NOT netted (spec gap).
export function isTightDatedArchival(relPath: string): boolean {
  if (DATED_FILENAME.test(relPath)) return true;                       // D4a
  const base = relPath.split("/").pop()!.replace(/\.md$/i, "");        // basename without the .md extension
  if (VERSION_BASENAME.test(base)) return true;                       // D4b
  return false;
}
```

Then in `src/API.md`, update the two prose mentions of the class name from `tight dated-archival` to `tight dated/versioned-archival` (the `subscores` description ~L81 and the `stats.genuine_abandoned_count` description ~L113). Do not change any JSON key or structure — prose only.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all tests green (127 total).

- [ ] **Step 5: Commit**

```bash
git add src/tools/context-audit/accepted-layout.ts src/API.md test/context-audit/accepted-layout.test.ts
git commit -F - <<'EOF'
fix(context_audit): D4b structural version-shape, drop plans//CHANGELOG (TBD-20)

D4b netted any doc under a plans/ or CHANGELOG/ directory segment — a
convention guess that silently netted live posthog PRDs under plans/. Drop
both segment rules; net a version-shaped basename (^v?\d+\.\d+(\.\d+)+$)
instead — same structural class as the dated-filename rule, so the legit
CHANGELOG/<semver>.md archives stay netted while live docs under plans/ are
counted. API.md class-name phrase updated same commit (rule 8).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 4: Verify the whole surface (no separate commit unless the ledger moves)

**Files:**
- Read: `src/CONTEXT.md` (context-budget ledger), `src/API.md`
- Possibly modify: `src/CONTEXT.md` (only if the measured ledger number changed)

- [ ] **Step 1: Full suite + typecheck**

Run: `npm test`
Expected: **127/127** pass, `tsc` clean. (126 baseline + 1 net new test: Task 1 adds 1 to graph.test.ts, Task 2 adds 1 to graph.test.ts and replaces 2 in-place in accepted-layout.test.ts, Task 3 replaces 1 in-place. Net +2 tests → 128. Reconcile the exact count against the run and record it.)

- [ ] **Step 2: Re-measure the context-budget ledger (rule 2)**

Re-run the ledger measurement the way `src/CONTEXT.md` documents it (the standing `tools/list` tool-definition cost). Expected **unchanged at 252 / ~4000** — this change adds no output field and does not widen `outputSchema`. If it is unchanged, make no ledger edit. If it moved, update `src/CONTEXT.md` and note why.

- [ ] **Step 3: Confirm rule-8 coherence**

Re-read `src/API.md` against the final `accepted-layout.ts`: the class name reads `tight dated/versioned-archival`, the reconstruction identity `orphans.score == 1 − genuine_abandoned_count / n` is unchanged, and no JSON schema/field moved. Confirm no other doc names the dropped `plans/`/`CHANGELOG/` segment behavior as current.

---

## Self-Review

**1. Spec coverage.** Design §D1 (dirTargets basis) → Tasks 1–2. Design §D4 (version-shape, drop segments) → Task 3. §7 test list (D1 MSW regression, D4b version-shape nets, live-`plans/` stays counted, bare `docs/` stays counted, reconstruction unchanged) → Tasks 2–3 tests + existing reconstruction test (untouched, still passes). §6 close condition is the later re-validation, out of this plan's scope (noted). Rule 8 (API.md) → Task 3. Rule 2 (ledger) → Task 4.

**2. Placeholder scan.** No TBD/TODO/"handle edge cases"/"similar to" — every step carries literal code.

**3. Type consistency.** `dirTargets: Set<string>` is produced by Task 1 (`GraphResult`) and consumed by Task 2 (`AcceptedLayoutCtx`, `isRouteToDirNested`, the graph call site). `isTightDatedArchival` keeps its `(relPath: string): boolean` signature. `AcceptedLayoutCtx` goes from `{routedDirs, skillDirs}` to `{dirTargets, skillDirs}` in one task (Task 2), and the only two call sites (graph.ts, accepted-layout.test.ts) move with it.
