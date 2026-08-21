# AGENTS.md Router Recognition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teach `context_audit` to read the `AGENTS.md` routing convention, dedup the `CLAUDE.md → AGENTS.md` symlink alias, and report `coverage: null` when routers are present but resolve nothing — closing the run-5 blind spot where all four approved app repos scored artifacts off invisible routers.

**Architecture:** Three coupled, behavior-only changes inside the existing `src/tools/context-audit/` module — no new files, no new tool, no MCP schema change. D1 widens the router-name set (`walk.isRootName` + the `root.ts` root-anchor predicate); `graph.ts` inherits via `doc.isRoot`. D2 adds a walk-time symlink-alias dedup. D3 adds a scoped routing-basis guard to `coverage.ts`.

**Tech Stack:** TypeScript ESM (`NodeNext`), `node:test` + `node:assert/strict`, compiled to `dist/` (`npm test` runs `tsc` via `pretest`, then `node --test "dist/test/**/*.test.js"`). Fixtures are real temp dirs via `mkdtempSync`.

**Spec:** `planning/designs/2026-08-20_agents-md-router-recognition-design.md` (read it and the two decision records it cites: `planning/decisions/2026-08-20_agents-md-router-recognition.md` and `planning/decisions/2026-08-20_headline-definite-when-significant-dirs.md`).

## Global Constraints

- **Branch + PR only — never commit to `main`** (WORKFLOW rule). This plan runs on a fresh branch off `main`.
- **`AGENTS.md` ONLY** (CLAUDE.md rule 7). Do not add `GEMINI.md`, `.cursorrules`, `.github/copilot-instructions.md`, or any other name to the router set.
- **`src/API.md` updates in the same commit as the code that changes its documented behavior** (CLAUDE.md rule 8). Each code task's commit includes its API.md edit.
- **Standing tool-definition context cost stays under ~4k tokens** (rule 2). The tool `description` and `inputSchema`/`outputSchema` in `index.ts` MUST NOT change — that keeps the budget unchanged. AGENTS.md support is documented in `src/API.md`, not in the tool description string.
- **Invariants that must not regress:** the walk never follows a symlink and never reads above root; the two `headline invariant` tests in `test/context-audit/orchestrate.test.ts` (no-router repos) stay green unchanged.
- **TDD throughout:** write the failing test, run it red, implement minimally, run it green, commit. `npm test` builds first (`pretest: tsc`), so a type error fails the test run.
- Node ≥ 20.

---

## File Structure

- `src/tools/context-audit/walk.ts` — **modify.** `isRootName` gains `AGENTS.md` (D1); the symlink branch gains alias dedup with two new helpers (D2).
- `src/tools/context-audit/root.ts` — **modify.** The root-anchor predicate (`dirHasClaudeMd`) widens to `CLAUDE.md` **or** `AGENTS.md` (D1). `CONTEXT.md` is deliberately NOT added to the root-anchor tier.
- `src/tools/context-audit/coverage.ts` — **modify.** `scoreCoverage` gains the scoped routing-basis guard; the unused `_walk` param becomes `walkRes` and is read (D3).
- `src/tools/context-audit/graph.ts` — **no change.** Keys off `doc.isRoot`; inherits the wider router set automatically.
- `src/tools/context-audit/index.ts` — **no change.** Already passes the walk result to `scoreCoverage`; `coverage.score` is already `number | null`.
- `src/API.md` — **modify** (rule 8): router-name set, root-resolution + method-label limitation, coverage guard, symlink dedup.
- `src/CONTEXT.md`, `src/TDD.md` — **modify** (Task 4): context-budget re-verify note; TBD-10/11/12 status refresh.
- `test/context-audit/root.test.ts`, `test/context-audit/walk.test.ts`, `test/context-audit/orchestrate.test.ts` — **modify:** add the tests below.
- `test/context-audit/coverage.test.ts` — **modify** (Task 3): migrate four fixtures whose routers resolve nothing (D3 legitimately changes that shape). See Task 3 Step 5.

---

## Task 1: D1 — `AGENTS.md` recognized as a router

**Files:**
- Modify: `src/tools/context-audit/walk.ts:16-18` (`isRootName`)
- Modify: `src/tools/context-audit/root.ts:15-19` (`dirHasClaudeMd`) and its caller at `root.ts:34`
- Modify: `src/API.md:45` and `src/API.md:61`
- Test: `test/context-audit/root.test.ts`, `test/context-audit/orchestrate.test.ts`

**Interfaces:**
- Consumes: `resolveRoot(path)` → `Root`; `walk(root)` → `WalkResult` with `docs[].isRoot`; `hasStructuralName(basename, "CLAUDE.md" | "AGENTS.md" | "CONTEXT.md")` (already exists, already accepts `"AGENTS.md"`).
- Produces: after this task, a file named `AGENTS.md` (case-insensitive) walks as `isRoot = true`, and a directory containing only an `AGENTS.md` anchors `resolveRoot` as `method: "claude_md"`.

- [ ] **Step 1: Write the failing anchor test** in `test/context-audit/root.test.ts`

```ts
test("D1: an AGENTS.md-only directory anchors as claude_md (widened root predicate)", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-root-agents-"));
  try {
    mkdirSync(join(dir, ".git"));
    writeFileSync(join(dir, "AGENTS.md"), "# root\n");
    const root = resolveRoot(dir);
    assert.equal(root.method, "claude_md");   // AGENTS.md now anchors, not the git fallback
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
```

If `root.test.ts` does not already import them, ensure the file has: `import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";`, `import { tmpdir } from "node:os";`, `import { join } from "node:path";`, `import { resolveRoot } from "../../src/tools/context-audit/root.js";`.

- [ ] **Step 2: Write the failing end-to-end router test** in `test/context-audit/orchestrate.test.ts`

```ts
test("D1: AGENTS.md is a router — anchors root and its backtick paths route", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-agents-"));
  try {
    mkdirSync(join(dir, ".git"));
    writeFileSync(join(dir, "AGENTS.md"), "root routes `src/CONTEXT.md`\n");
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "src", "CONTEXT.md"), "leaf\n");
    const outcome = await runContextAudit({ path: dir });
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    // AGENTS.md anchors the root (accepted v1 limitation: label stays claude_md)
    assert.equal(outcome.result.root.method, "claude_md");
    // AGENTS.md is a router: counted, and its backtick path resolved (drift assessed, not null)
    assert.ok(outcome.result.stats.routing_files >= 1);
    assert.notEqual(outcome.result.subscores.routing_drift.score, null);
    assert.ok(!outcome.result.findings.some((f) => f.category === "routing_unresolved"));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
```

- [ ] **Step 3: Run both tests to verify they fail**

Run: `npm test 2>&1 | grep -A3 "D1:"`
Expected: both FAIL — pre-change, `AGENTS.md` is not a router, so `resolveRoot` returns `git_root` (no `CLAUDE.md`) and `routing_files` is 0.

- [ ] **Step 4: Widen `isRootName` in `walk.ts`**

Replace `walk.ts:16-18`:

```ts
function isRootName(basename: string): boolean {
  return hasStructuralName(basename, "CLAUDE.md") || hasStructuralName(basename, "CONTEXT.md") || hasStructuralName(basename, "AGENTS.md");
}
```

- [ ] **Step 5: Widen the root-anchor predicate in `root.ts`**

Replace `root.ts:15-19` (rename for accuracy) and update its caller:

```ts
function dirHasRootRouter(dir: string): boolean {
  // Root anchoring recognizes CLAUDE.md OR AGENTS.md (NOT CONTEXT.md — the
  // root anchor stays the top-level agent-instructions file). readdirSync
  // returns the entry name regardless of symlink status, so a CLAUDE.md that
  // is a symlink to AGENTS.md still anchors here by name.
  try {
    return readdirSync(dir).some((n) => hasStructuralName(n, "CLAUDE.md") || hasStructuralName(n, "AGENTS.md"));
  } catch { return false; }
}
```

Then at `root.ts:34`, change `if (dirHasClaudeMd(dir))` to `if (dirHasRootRouter(dir))`.

- [ ] **Step 6: Run both tests to verify they pass**

Run: `npm test 2>&1 | grep -A3 "D1:"`
Expected: both PASS.

- [ ] **Step 7: Update `src/API.md` (rule 8)**

At `src/API.md:45`, change "the `CLAUDE.md` / `CONTEXT.md` tree" to "the `CLAUDE.md` / `AGENTS.md` / `CONTEXT.md` tree".

At `src/API.md:61`, change "resolves upward from `path` to the nearest `CLAUDE.md`" to "resolves upward from `path` to the nearest `CLAUDE.md` or `AGENTS.md`", and append this sentence to that paragraph:

```markdown
An `AGENTS.md`-only repo (no `CLAUDE.md` entry) still reports `method: "claude_md"` — an accepted v1 label limitation; a distinct `agents_md` value is a v1.1 item.
```

- [ ] **Step 8: Run the full suite (nothing else regressed) and commit**

```bash
npm test 2>&1 | tail -6
git add src/tools/context-audit/walk.ts src/tools/context-audit/root.ts src/API.md test/context-audit/root.test.ts test/context-audit/orchestrate.test.ts
git commit -m "feat(context-audit): recognize AGENTS.md as a router (D1)"
```

Expected: full suite green (prior count + 2).

---

## Task 2: D2 — `CLAUDE.md → AGENTS.md` symlink-alias dedup

**Files:**
- Modify: `src/tools/context-audit/walk.ts` (the symlink branch at `:56-60`; add `realpathSync` import; add `realRoot` computation in `walk()`; add two helpers)
- Modify: `src/API.md:138`
- Test: `test/context-audit/walk.test.ts`

**Interfaces:**
- Consumes: the walk's existing `ig` (gitignore matcher), `root.path`, `HARD_SKIP_DIRS`, `DOT_ALLOW`, `hasStructuralName`.
- Produces: a symlink whose realpath target is a structural router in walk scope emits **no** `symlink` finding and is not traversed; every other symlink is unchanged.

- [ ] **Step 1: Write the failing positive (dedup) test** in `test/context-audit/walk.test.ts`

```ts
test("D2: a CLAUDE.md -> AGENTS.md alias is deduped (no symlink finding), router scored once", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-alias-"));
  try {
    writeFileSync(join(dir, "AGENTS.md"), "# root\n");
    symlinkSync(join(dir, "AGENTS.md"), join(dir, "CLAUDE.md"));
    const res = walk(resolveRoot(dir));
    const rels = res.docs.map((d) => d.relPath).sort();
    assert.ok(rels.includes("AGENTS.md"));            // real router walked
    assert.ok(!rels.includes("CLAUDE.md"));           // alias not walked
    assert.ok(!res.findings.some((f) => f.category === "symlink"));   // alias not flagged
    assert.equal(res.docs.filter((d) => d.isRoot).length, 1);        // scored once
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
```

- [ ] **Step 2: Write the failing negative (out-of-scope target) test** in `test/context-audit/walk.test.ts`

```ts
test("D2: a symlink to an OUT-OF-SCOPE router target keeps the symlink finding (no silent drop)", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-alias-oos-"));
  try {
    writeFileSync(join(dir, "CLAUDE.md"), "# root\n");
    writeFileSync(join(dir, ".gitignore"), "ignored/\n");
    mkdirSync(join(dir, "ignored"));
    writeFileSync(join(dir, "ignored", "AGENTS.md"), "# hidden router\n");
    symlinkSync(join(dir, "ignored", "AGENTS.md"), join(dir, "alias.md"));
    const res = walk(resolveRoot(dir));
    // target is gitignored -> not in scope -> must NOT dedup; keep the finding
    assert.ok(res.findings.some((f) => f.category === "symlink" && f.file === "alias.md"));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
```

- [ ] **Step 3: Run both tests to verify they fail**

Run: `npm test 2>&1 | grep -A3 "D2:"`
Expected: the positive test FAILS (today the `CLAUDE.md` symlink produces a `symlink` finding); the negative test may pass by accident today (finding is kept) — it locks the boundary once dedup exists.

- [ ] **Step 4: Add the `realpathSync` import in `walk.ts`**

At `walk.ts:1`, add `realpathSync` to the `node:fs` import:

```ts
import { readdirSync, readFileSync, existsSync, realpathSync } from "node:fs";
```

- [ ] **Step 5: Add the two dedup helpers in `walk.ts`** (place them above `export function walk`)

```ts
// D2: a symlink whose realpath target is a structural router already in walk
// scope is a mere ALIAS (e.g. CLAUDE.md -> AGENTS.md, the convention every
// surveyed app repo ships). Dedup it: no finding, no traversal — the router is
// scored once via its own real entry. Guards: (a) target realpath is a
// structural router name, (b) it stays under root, (c) it is itself in scope.
function isPathInWalkScope(rel: string, ig: ReturnType<typeof ignore>): boolean {
  if (rel === "") return false;
  const segs = rel.split("/");
  for (let i = 0; i < segs.length - 1; i++) {          // ancestor dirs only
    const s = segs[i];
    if (HARD_SKIP_DIRS.has(s)) return false;
    if (s.startsWith(".") && !DOT_ALLOW.has(s)) return false;
  }
  if (rel === ".claude/commands" || rel.startsWith(".claude/commands/")) return false;
  if (ig.ignores(rel)) return false;
  return true;
}

function isRouterAlias(linkAbs: string, realRoot: string, ig: ReturnType<typeof ignore>): boolean {
  let target: string;
  try { target = realpathSync(linkAbs); } catch { return false; }   // broken symlink: keep finding
  if (target !== realRoot && !target.startsWith(realRoot + sep)) return false;   // (b) escapes root
  const rel = relative(realRoot, target).split(sep).join("/");
  const base = rel.split("/").pop() ?? "";
  const isRouter = hasStructuralName(base, "CLAUDE.md") || hasStructuralName(base, "CONTEXT.md") || hasStructuralName(base, "AGENTS.md");
  if (!isRouter) return false;                          // (a) target is not a router
  return isPathInWalkScope(rel, ig);                    // (c) target is in scope
}
```

- [ ] **Step 6: Compute `realRoot` once inside `walk()`**

Immediately after the `ig` gitignore matcher is built (right after `walk.ts:32`, before the `rel` helper), add:

```ts
  // realpath of root, so a symlink target under a symlinked temp root (e.g.
  // /tmp -> /private/tmp on macOS) still compares as "under root".
  let realRoot: string;
  try { realRoot = realpathSync(root.path); } catch { realRoot = root.path; }
```

- [ ] **Step 7: Rewrite the symlink branch in `walk.ts`**

Replace the current symlink branch (`walk.ts:56-60`):

```ts
      if (e.isSymbolicLink()) {
        const inScope = e.name.toLowerCase().endsWith(".md") || (!HARD_SKIP_DIRS.has(e.name) && !(e.name.startsWith(".") && !DOT_ALLOW.has(e.name)));
        // D2: a symlink that only aliases an in-scope router is deduped (no
        // finding); the router is scored via its own real entry. Never traverse.
        if (inScope && !isRouterAlias(abs, realRoot, ig)) {
          findings.push(info("symlink", relPath, "symlink encountered; recorded, not traversed", relPath, relPath));
        }
        continue;
      }
```

- [ ] **Step 8: Run both tests to verify they pass**

Run: `npm test 2>&1 | grep -A3 "D2:"`
Expected: both PASS.

- [ ] **Step 9: Confirm the existing symlink test still passes**

Run: `npm test 2>&1 | grep -A2 "never follows symlinks"`
Expected: PASS — its targets (`real/target.md`, the `real/` dir) are not structural router names, so no dedup; both `symlink` findings remain.

- [ ] **Step 10: Update `src/API.md` (rule 8) and commit**

At `src/API.md:138`, replace the "Never follows symlinks" bullet with:

```markdown
- **Never follows symlinks** — a symlink pointing at something in scope is recorded as a `symlink` finding, not traversed. The one exception is a symlink that merely **aliases a router already in scope** (e.g. `CLAUDE.md → AGENTS.md`, the convention app repos ship): it is deduped — no finding — and the router is scored once via its own real entry. The dedup applies only when the target's realpath is a structural router name, stays under root, and is itself in walk scope; otherwise the `symlink` finding is kept.
```

```bash
npm test 2>&1 | tail -6
git add src/tools/context-audit/walk.ts src/API.md test/context-audit/walk.test.ts
git commit -m "feat(context-audit): dedup CLAUDE.md->AGENTS.md symlink alias (D2)"
```

---

## Task 3: D3 — `coverage` routing-basis guard (scoped to `routing_unresolved`)

**Files:**
- Modify: `src/tools/context-audit/coverage.ts` (`scoreCoverage` signature param `_walk` → `walkRes`; add the guard after the `dirs.length === 0` check)
- Modify: `src/API.md:81`
- Test: `test/context-audit/orchestrate.test.ts` (new D3 test + migrate the TBD-12 gate test), `test/context-audit/coverage.test.ts` (migrate four fixtures)

**Interfaces:**
- Consumes: `WalkResult.docs[].isRoot` (to count routers), `GraphResult.resolvedRefsFromRoots` (the routing basis).
- Produces: `scoreCoverage` returns `{ subscore: null, n: 0 }` when `routing_files > 0 && resolvedRefsFromRoots === 0`; unchanged otherwise. `index.ts` needs no change (it already calls `scoreCoverage(root, w, g)`).

> **Fixture precision (critical — do not weaken):** for the headline to go `null`, the router must resolve **zero edges of any kind** — pure prose, no path-shaped backticks and no markdown links — so `refsFromRoots === 0` and therefore `routing_drift` is `null` too. If the router instead contains a non-resolving *path-shaped* backtick (e.g. `` `docs/x.md` ``), that is `routing_path_missing`: `routing_drift` scores **0 (not null)** and the headline is **0, not null**. Both are honest, but only the pure-prose fixture exercises the amended invariant (coverage/orphans/routing_drift all null → headline null).

- [ ] **Step 1: Write the failing test** in `test/context-audit/orchestrate.test.ts`

```ts
test("D3: routing_unresolved + a significant dir => coverage null AND headline null (amended invariant)", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-unres-sig-"));
  try {
    // Router present but resolves NOTHING (pure prose, zero path refs) -> both
    // resolvedRefsFromRoots and refsFromRoots are 0 (routing_drift null). A
    // significant source dir exists. Pre-D3: coverage 0 / headline 0. Post-D3:
    // both null -- the routing layer is present but unreadable, so not measurable.
    writeFileSync(join(dir, "CLAUDE.md"), "Routing is described in prose here, with no paths.\n");
    mkdirSync(join(dir, "src", "lib"), { recursive: true });
    for (const n of ["a", "b", "c", "d", "e"]) writeFileSync(join(dir, "src", "lib", `${n}.ts`), `export const ${n}=1;\n`);
    const outcome = await runContextAudit({ path: dir });
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.ok(outcome.result.findings.some((f) => f.category === "routing_unresolved"));
    assert.equal(outcome.result.subscores.coverage.score, null);   // was 0 pre-D3
    assert.equal(outcome.result.subscores.coverage.n, 0);
    assert.equal(outcome.result.score, null);                      // was 0 pre-D3 (all routing-layer sub-scores null)
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test 2>&1 | grep -A3 "D3:"`
Expected: FAIL — pre-change `coverage.score` is `0` (floor) and `score` is `0`, not `null`.

- [ ] **Step 3: Add the guard in `coverage.ts`**

Change the `scoreCoverage` signature at `coverage.ts:78` so the walk result is read (rename `_walk` → `walkRes`):

```ts
export function scoreCoverage(root: Root, walkRes: WalkResult, graph: GraphResult, opts?: { emitCoverageFindings?: boolean }): CoverageResult {
```

Then, immediately after the existing `if (dirs.length === 0) return { subscore: null, n: 0, findings };` line (`coverage.ts:86`), insert:

```ts
  // D3 routing-basis guard, SCOPED to routing_unresolved: routers are present
  // but resolve zero edges from any root -> coverage cannot be measured (the
  // routing layer exists but is unreadable, or genuinely broken). Report null,
  // matching orphans/routing_drift. This is NOT the bare resolvedRefsFromRoots===0
  // that those use: root_absent (routing_files === 0) is deliberately excluded so
  // it keeps floor-to-0, holding the amended headline-definite invariant
  // (planning/decisions/2026-08-20_headline-definite-when-significant-dirs.md).
  const routingFiles = walkRes.docs.filter((d) => d.isRoot).length;
  if (routingFiles > 0 && graph.resolvedRefsFromRoots === 0) return { subscore: null, n: 0, findings };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test 2>&1 | grep -A3 "D3:"`
Expected: PASS.

- [ ] **Step 5: Migrate existing coverage fixtures whose routers resolve nothing**

The D3 guard fires for `routing_files > 0 && resolvedRefsFromRoots === 0` — the shape four existing tests use **incidentally**. Those tests exist to pin coverage *emission* and *floor-to-0* on a repo whose routing IS readable, not to test the `routing_unresolved` state. Give each router a **resolving** edge to a non-significant helper file so the guard stays off and each test's original intent is preserved (the target significant dir stays uncovered → finding fires / floors to 0). Do **not** weaken the guard or delete assertions — this is a fixture correction, not a contract change.

In `test/context-audit/coverage.test.ts`, in the four tests at (current) lines **18, 100, 115, 151**, replace the router line
`writeFileSync(join(dir, "CLAUDE.md"), "# root, references nothing\n");`
with a resolving router plus a helper file:

```ts
    writeFileSync(join(dir, "CLAUDE.md"), "root routes `guide.md`\n");
    writeFileSync(join(dir, "guide.md"), "guide\n");   // real, non-significant, covered leaf: resolvedRefsFromRoots >= 1 so the D3 guard stays off
```

Why this preserves each assertion: `guide.md` resolves as a root-relative backtick route, adding a routed dir of `""` (repo root) that covers **no** significant subdirectory (the coverage check ignores the `""` routed dir via its `r !== ""` guard). So `src/`, `test/foo/`, and the gitignored `generated/` stay exactly as each test expects — subscore `0`, `n` unchanged, findings fire under the gate. Leave the other coverage tests untouched: `:35` and `:48` (git-root, no router → `routing_files === 0`, guard never fires), `:60` (below-threshold → `dirs.length === 0` early-return), `:75` (already routes a resolving edge).

In `test/context-audit/orchestrate.test.ts`, the "TBD-12 coverage gate stays off" test (current line **45**) uses `CLAUDE.md "# root"` + `src/lib`. Add the same resolving route so the guard stays off; keep the `src/lib` setup and both assertions unchanged:

```ts
    writeFileSync(join(dir, "CLAUDE.md"), "root routes `guide.md`\n");
    writeFileSync(join(dir, "guide.md"), "guide\n");
```

`src/lib` stays significant and uncovered → `coverage.score` is `0` (non-null, < 100, satisfying line 60) and no `coverage` finding fires on the default path (line 62).

- [ ] **Step 6: Run the full suite; verify the migrated and invariant tests are green**

Run: `npm test 2>&1 | tail -6` then `npm test 2>&1 | grep -E "headline invariant|uncovered-workspace|gitignored significant|test-dir severity|gate stays off"`
Expected: full suite PASS. The new D3 test passes; the two `headline invariant` tests pass unchanged (`git_root`, `routing_files === 0`, guard never fires); the four migrated fixtures pass with their original assertions intact.

- [ ] **Step 7: Update `src/API.md` (rule 8)**

At `src/API.md:81`, replace the sentence "`coverage` is NOT so guarded — it floors to 0 as a real assessed result when routing covers no significant directory." with:

```markdown
`coverage` reports null in the same routing-basis sense but SCOPED to the `routing_unresolved` state (`routing_files > 0 && resolvedRefsFromRoots === 0`): routers present but resolving nothing → coverage is not measurable → null. It still floors to 0 (a real assessed result) when routing resolves ≥1 edge but covers no significant directory, and when there are no routers at all (`root_absent`, `routing_files === 0`) — the latter preserving the headline-definite-when-significant-dirs invariant.
```

- [ ] **Step 8: Commit**

```bash
npm test 2>&1 | tail -6
git add src/tools/context-audit/coverage.ts src/API.md test/context-audit/orchestrate.test.ts test/context-audit/coverage.test.ts
git commit -m "feat(context-audit): coverage null in routing_unresolved state (D3)"
```

Expected: full suite green (the three code tasks add net +6 tests — Task 1 +2, Task 2 +2, Task 3 +1 new D3 test plus the four migrated fixtures which keep their count).

---

## Task 4: Docs — context-budget re-verify + TBD status refresh

**Files:**
- Modify: `src/CONTEXT.md` (context-budget ledger entry for `context_audit`)
- Modify: `src/TDD.md` (TBD-10/11/12 status notes)

**Interfaces:** none (documentation only).

- [ ] **Step 1: Re-verify the context-budget ledger**

Open `src/CONTEXT.md`, find the context-budget ledger entry for `context_audit`. Confirm the tool `description` and `inputSchema`/`outputSchema` in `index.ts` were not changed by Tasks 1–3 (they were not). The measured standing cost is therefore unchanged. If the ledger has a "last verified" or notes column, add a dated line: `2026-08-21: re-verified after AGENTS.md router recognition — no description/schema change, cost unchanged.` If it has no such column, leave the number and add no churn.

- [ ] **Step 2: Refresh TBD-10/11/12 notes in `src/TDD.md`**

The run-5 "gated on this fix landing" phrasing differs per row — edit each in place (do not find-and-replace one string):
- **TBD-10 (`src/TDD.md:31`)** — the note reads "...additionally gated on the `AGENTS.md` router-recognition fix landing and a nine-repo re-run." Change to: the fix has **landed** (`planning/designs/2026-08-20_agents-md-router-recognition-design.md`); numbers now gated on the nine-repo re-run only.
- **TBD-11 (`src/TDD.md:32`)** — the note reads posthog "becomes a valid datapoint only after ... lands." Change to: the fix has **landed**; posthog's root `AGENTS.md` + tree is now measurable — capture it in the nine-repo re-run.
- **TBD-12 (`src/TDD.md:33`)** — has two edits: (a) the run-5 note "re-read after the nine-repo re-run" — mark the fix **landed**; and (b) **correct the stale D3 description**: the row currently says the guard fires "at exactly zero resolved root edges (in line with orphans/routing_drift)" — that is the pre-correction **bare** condition. Replace with the final **scoped** guard: `routing_files > 0 && resolvedRefsFromRoots === 0` (the `routing_unresolved` state; `root_absent` is excluded and keeps floor-to-0).

Do not set any number (rule 7).

- [ ] **Step 3: Commit**

```bash
git add src/CONTEXT.md src/TDD.md
git commit -m "docs: re-verify context budget; refresh TBD-10/11/12 after AGENTS.md fix"
```

---

## Deliberately skipped (from the spec — do not implement)

- Any router filename beyond `AGENTS.md` (rule 7).
- Changing the tool `description` string in `index.ts` to mention `AGENTS.md` — intentionally omitted to keep the standing context budget unchanged (rule 2); `src/API.md` carries the documentation.
- A distinct `root.method: "agents_md"` value — accepted v1 label limitation; a v1.1 item.
- Following symlinks / reading above root — invariants retained.
- Threshold numbers (TBD-10/11/12), the nine-repo re-run, fenced-code-block tracking in `extractLinks`, TBD-14 orphan scope, the caveman-28 drift residue, and `CONTEXT.md` at the root-anchor tier.

---

## Self-Review

**1. Spec coverage.**
- D1 (AGENTS.md router) → Task 1 (walk `isRootName` + root anchor + API.md).
- D2 (symlink dedup, three guards) → Task 2 (`isRouterAlias` implements (a) name-check, (b) root-bound, (c) in-scope; API.md).
- D3 (coverage guard scoped to `routing_unresolved`, `root_absent` floor preserved) → Task 3 (guard + fixture-precision note + invariant-test check; API.md).
- Amended headline-definite invariant → exercised by Task 3's fixture (pure-prose router + significant dir → headline null) and guarded by the Step-5 check that the two existing invariant tests stay green.
- `root.method` label limitation → documented in Task 1 Step 7 (API.md).
- Docs affected (API.md, CONTEXT.md, TDD.md) → API.md folded into Tasks 1–3 (rule 8); CONTEXT.md + TDD.md in Task 4. The two decision records were already amended in the design pass and need no code-phase edit.
- **Existing-test regression (found by the plan review):** the D3 guard nulls coverage for the `routing_unresolved` shape, which four existing fixtures used incidentally (`coverage.test.ts:18/100/115/151`, `orchestrate.test.ts:45`). Task 3 Step 5 migrates them to a resolving router so each keeps its original intent. Verified in Step 6. Without this migration the suite goes red at Task 3.

**2. Placeholder scan.** No TBD/TODO/"handle edge cases" placeholders; every code and test step carries real content.

**3. Type consistency.** `isRootName` (walk), `dirHasRootRouter` (root), `isRouterAlias`/`isPathInWalkScope` (walk), `scoreCoverage(root, walkRes, graph, opts)` — names and signatures are consistent across tasks. `coverage.score` is already `number | null` (`types.ts` `Subscore`), so D3's `null` needs no type change. `resolvedRefsFromRoots` is an existing field on `GraphResult`. `realpathSync`, `relative`, `sep`, `ignore`, `HARD_SKIP_DIRS`, `DOT_ALLOW`, `hasStructuralName` are all already imported or defined in `walk.ts` (only `realpathSync` is newly added to the import).
