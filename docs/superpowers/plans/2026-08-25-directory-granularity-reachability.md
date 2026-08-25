# Directory-Granularity Reachability (TBD-14) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop `orphans` scoring the legitimate route-to-directory convention as a broken graph — a document directly contained in a routed **directory** becomes reachable.

**Architecture:** Reachability is a DFS over document→document edges seeded from router docs; a resolved edge whose target is a **directory** creates no edge, so documents under it orphan. This plan adds a distinct `routedDirTargets` set (populated only when a resolved edge's target is itself a directory) and, after the DFS, marks reachable every in-scope document **directly contained** in one of those directories — **directory-only** depth. Nothing else moves.

**Tech Stack:** TypeScript ESM (`NodeNext`), `node:test` + `node:assert/strict`, no runtime dependencies added.

**Spec:** `planning/designs/2026-08-25_directory-granularity-reachability-design.md` (WHAT & WHY; read §3.1–§3.4).

## Global Constraints

Every task's requirements implicitly include this section — values copied from the spec.

- **Propagation depth is DIRECTORY-ONLY.** A document in a **subdirectory** of a routed directory is **not** reached (§3.2). Immediate-children and full-subtree are rejected — full-subtree is the masked-rot / silent-false-negative class the whole chain refuses.
- **Propagation basis is directory TARGETS only — a new `routedDirTargets` set, NOT `routedDirs`.** `routedDirs` also holds parent-dirs recorded for *document* and non-doc-file targets; propagating from it would let a routed document rescue its siblings and break existing orphan behavior (§3.1).
- **`coverage` is NOT touched.** `routedDirs` (which `coverage` reads) is unchanged; the new set is additive. `underRoutedDir` (the candidate/subtree test) is unchanged.
- **`orphans` stays OUT of TBD-10 weighting** until this lands **and** re-validates. No weight is set or touched. `TBD_10_WEIGHTS` / `ROUTING_LAYER_KEYS` are **not** edited. No threshold or precision number anywhere.
- **Two hard invariants preserved:** never follow a symlink, never read above root. Propagation reads only the already-walked in-scope document set — no new traversal.
- **`src/API.md` updates in the same commit as the behaviour it describes** (rule 8).
- **Context-budget ledger** (`src/CONTEXT.md`, rule 2): re-measure only if the tool `description` or schema changes. Neither changes here — verified by content.
- **Exit criterion (not part of this build):** TBD-14 closes on a later **re-validation** run against the pinned nine-repo corpus under a **categorical** gate — every residual orphan classifiable as genuine-abandoned or a named accepted layout class (route-to-directory-nested, convention-discovered, dated-archival). Not a numeric bar (rule 7). This plan lands the code; it does **not** close TBD-14.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `src/tools/context-audit/graph.ts` | edge resolution, reachability, orphan accounting | Modify — add `routedDirTargets`; populate it in the directory-target branch; propagate reachability directory-only |
| `src/API.md` | MCP surface contract | Modify — one sentence in the `orphans` description |
| `test/context-audit/graph.test.ts` | graph-level behaviour tests | Modify — +3 |

No new files. `score.ts`, `coverage.ts`, `index.ts`, `links.ts`, `walk.ts`, `types.ts` are **not** modified.

---

### Task 0: Branch off `main`

`WORKFLOW.md` requires a `feat/`|`fix/` branch and forbids direct commits to `main`.

- [ ] **Step 1: Confirm a clean tree on current `main`**

```bash
git checkout main && git pull && git status --short
npm test
```
Expected: no output from `status`; **102 tests, 102 pass, 0 fail**. If the count differs, stop — this plan's red states are anchored on 102.

- [ ] **Step 2: Create the branch**

```bash
git checkout -b feat/tbd-14-dir-granularity-reachability
```

---

### Task 1: Directory-only reachability propagation

Design §3.1–§3.2. One coherent deliverable: the `routedDirTargets` set, the propagation loop, and the `src/API.md` sentence describing it.

**Files:**
- Modify: `src/tools/context-audit/graph.ts` — declare `routedDirTargets`; add it in `recordResolvedTarget`'s directory branch; add the propagation loop after the reachability DFS.
- Modify: `src/API.md` — the `orphans` sentence in the `subscores` description.
- Test: `test/context-audit/graph.test.ts`.

**Interfaces:**
- Consumes: `WalkedDoc { relPath; absPath; content; isRoot }`, `routedDirs`, `reached`, `resolvedRefsFromRoots` — all already present in `buildGraph`.
- Produces: no new exported symbol. `routedDirTargets` is module-local to `buildGraph`. Observable behaviour: `orphanCount` and the `orphan` findings shrink by the documents directly contained in directory-target directories.

- [ ] **Step 1: Write the failing tests**

Append to `test/context-audit/graph.test.ts` (the file already imports `buildGraph`, `resolveRoot`, `walk`, `cats`, and the `node:fs`/`node:os`/`node:path` helpers):

```typescript
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
  // Trap detector for the routedDirTargets-vs-routedDirs distinction (§3.1).
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
```

- [ ] **Step 2: Run the tests and confirm the EXACT red state**

Run: `npm run build && node --test dist/test/context-audit/graph.test.js`

Expected (derived from the code trace; confirm on-machine before implementing):

```
✖ T-dir-1   actual orphan: 1, expected: undefined
✖ T-dir-2   actual orphan: 2, expected: 1
✔ T-dir-3   (guard — passes before and after)
```

**Exactly these two failures (T-dir-1, T-dir-2) and no others.** T-dir-3 is a guard and must be green now. If any pre-existing test is red — in particular the existing `orphan: routed-workspace doc unreachable from any root` fixture (a `[dir](src/CONTEXT.md)` document route with an unreferenced `src/orphan.md`) — stop: that fixture is a second guard for the directory-target distinction, and a red there means the plan was misread. If `tsc` fails, `dist/` is stale and both runs report the previous build — fix the build first.

- [ ] **Step 3: Write the implementation**

In `src/tools/context-audit/graph.ts`, declare the new set next to `routedDirs` (where `routedDirs` is created at the top of `buildGraph`):

```typescript
  const routedDirTargets = new Set<string>();   // dirs that were themselves a resolved routing TARGET (reachability basis; NOT coverage)
```

In `recordResolvedTarget`, the directory-target branch currently reads:

```typescript
      if (isDir) {
        const d = targetPath.replace(/\/$/, "");
        routedDirs.add(d === "." ? "" : d);                 // directory target: the dir itself (normalize "." -> "")
      } else {
```

Add the new set alongside `routedDirs` in that branch — do not change the `routedDirs.add` line:

```typescript
      if (isDir) {
        const d = targetPath.replace(/\/$/, "");
        const norm = d === "." ? "" : d;
        routedDirs.add(norm);                               // directory target: the dir itself (normalize "." -> "")
        routedDirTargets.add(norm);                         // AND record it as a reachability-propagation basis
      } else {
```

Then, immediately **after** the reachability DFS `while` loop and **before** the `underRoutedDir` helper / orphan enumeration, insert the propagation:

```typescript
  // Directory-granularity reachability (design 2026-08-25 §3.1–§3.2): a resolved
  // edge whose target IS a directory makes the documents DIRECTLY contained in
  // that directory reachable — routing is frequently expressed over directories,
  // not documents (superset routes to directories; every doc under them otherwise
  // orphans while coverage reads healthy). DIRECTORY-ONLY depth: a document in a
  // SUBDIRECTORY of a routed directory is NOT reached — that visible-FP-never-
  // silent-FN boundary is the design's chosen error direction. Sourced from
  // routedDirTargets (directory TARGETS only), so a routed DOCUMENT does not
  // rescue its siblings and routedDirs / coverage stay untouched.
  if (routedDirTargets.size) {
    for (const doc of walkRes.docs) {
      if (doc.content === null) continue;
      const parent = doc.relPath.includes("/") ? doc.relPath.slice(0, doc.relPath.lastIndexOf("/")) : "";
      if (routedDirTargets.has(parent)) reached.add(doc.relPath);
    }
  }
```

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: **105 tests, 105 pass, 0 fail** (102 + 3). T-dir-1 and T-dir-2 now green; T-dir-3 and the existing `orphan: routed-workspace…` fixture still green. If any pre-existing test is red, stop and diagnose — do not edit the fixture.

- [ ] **Step 5: Update `src/API.md` (rule 8 — same commit as the behaviour)**

In the `subscores` description, the `orphans` sentence currently reads (in part): *"`orphans` reports null when the routing layer resolves zero edges from any root (`resolvedRefsFromRoots === 0`) — with no routing basis, 'unreachable from a routing root' is vacuous."* Append, immediately after that sentence:

```
A document directly contained in a directory that is itself a resolved routing target is reachable (route-to-directory propagation, directory-only depth), so orphans reflects routing rot rather than the legitimate route-to-directory convention; a document in a SUBDIRECTORY of a routed directory is not covered by that propagation.
```

**Escape any double quotes as `\"` — this text sits inside a JSON string.** The `orphans` sentence uses only single quotes and backticks, so no escaping is needed for the text above, but re-verify the block parses (Step 6).

- [ ] **Step 6: Verify `src/API.md` still parses**

```bash
python3 -c "
import re,json
s=open('src/API.md').read()
b=re.findall(r'\`\`\`json\n(.*?)\n\`\`\`',s,re.S)
print(len(b),'blocks'); [json.loads(x) for x in b]; print('all parse')
"
```
Expected: `4 blocks` then `all parse`.

- [ ] **Step 7: Verify scope — `coverage` / `score.ts` / `index.ts` untouched**

```bash
git diff --stat main...HEAD -- src/tools/context-audit/coverage.ts src/tools/context-audit/score.ts src/tools/context-audit/index.ts
git diff main...HEAD -- src/tools/context-audit/graph.ts | grep -iE "TBD_10_WEIGHTS|ROUTING_LAYER_KEYS|routedDirs\.delete|coverage" || echo "no coverage/weight touch"
```
Expected: **no output** from the first command (those three files untouched); the grep prints only the `routedDirs.add` context (unchanged) and `no coverage/weight touch`. If `coverage.ts`/`score.ts`/`index.ts` show any change, stop — scope leaked.

- [ ] **Step 8: Commit**

```bash
git add src/tools/context-audit/graph.ts src/API.md test/context-audit/graph.test.ts
git commit -m "feat(context_audit): directory-granularity reachability for orphans

A resolved edge whose target is a directory now makes the documents
DIRECTLY contained in that directory reachable, so orphans stops scoring
the legitimate route-to-directory convention as a broken graph (superset:
2 routers, 26 edges, coverage 73, yet 113/113 docs orphaned).

Directory-ONLY depth: a document in a subdirectory of a routed directory
is not reached — the visible-false-positive, never silent-false-negative
boundary the design chose (full-subtree would recreate the masked-rot
class the routing-drift chain refused).

Sourced from a new routedDirTargets set (directory TARGETS only), not
routedDirs, so a routed document does not rescue its siblings and
coverage's routedDirs is untouched. No new edge; the routing DAG, drift,
and coverage accounting are unchanged.

src/API.md updated in the same commit (rule 8). orphans stays out of
TBD-10 weighting until re-validation; no weight or threshold number.

Refs TBD-14."
```

---

### Task 2: Review and finish the branch

`WORKFLOW.md` requires the code reviewers before finishing and a PR rather than a direct commit to `main`. **No code is written in this task.**

- [ ] **Step 1: Final full-suite run** — `npm test`. Expected: **105 / 105**, `tsc` clean.
- [ ] **Step 2: Confirm the branch touched only what this plan authorises**

```bash
git diff --name-only main...HEAD
```
Expected exactly: `src/API.md`, `src/tools/context-audit/graph.ts`, `test/context-audit/graph.test.ts`. Anything else — especially `coverage.ts`, `score.ts`, or `index.ts` — means scope leaked; stop.

- [ ] **Step 3: Run the code reviewers.** Use `superpowers:requesting-code-review` on the branch diff. Give reviewers the spec (`planning/designs/2026-08-25_directory-granularity-reachability-design.md`) and ask specifically whether propagation is **directory-only** (T-dir-2 green) and sourced from **directory targets only** (T-dir-3 and the existing `src/orphan.md` fixture green).
- [ ] **Step 4: Address findings, then finish the branch.** Use `superpowers:receiving-code-review`, then `superpowers:finishing-a-development-branch` to open the PR against `main`. **If a reviewer surfaces a scope question the design does not settle (e.g. root-restriction of directory propagation, or whether a specific residual is an accepted layout class), STOP and take it to `/decisions`** — the ratchet.

---

## After the plan

TBD-14 does **not** close when this lands. It closes on **re-validation** against the pinned nine-repo corpus (design §3.4) under the **categorical** gate: every residual orphan classifiable as genuine-abandoned or a named accepted layout class (route-to-directory-nested, convention-discovered, dated-archival). Any residual fitting neither → `/decisions`. That is a calibration run in a later session, not a build step, and it is **not** the README sample. Only then does `orphans` become eligible for TBD-10 weighting (D3), and only its *eligibility* — the weight NUMBER stays deferred.

---

## Self-Review

**1. Spec coverage**

| Spec section | Task |
|---|---|
| §3.1 directory-target propagation, directory-only, `routedDirTargets` distinct from `routedDirs` | Task 1 — Step 3 |
| §3.2 depth = directory-only (subdir not reached) | Task 1 — T-dir-2 |
| §3.1 a routed document does not rescue siblings | Task 1 — T-dir-3 + existing fixture |
| §3.1 `coverage` / `routedDirs` untouched | Task 1 — Step 7 |
| §3.3 secondary class not resolved here (named accepted, no detector) | Out of build scope — re-validation classifies; noted in "After the plan" |
| §3.4 categorical exit, no number | "After the plan" |
| §5 `src/API.md` same commit (rule 8) | Task 1 — Step 5 |
| §5 orphans stays out of TBD-10 weighting; no weight | Global Constraints; Task 1 — Step 7 |

**2. Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to Task N". Every code step carries real code. No step references a symbol not present in the codebase or defined here (`routedDirTargets` is introduced in Step 3; `reached`, `routedDirs`, `walkRes.docs`, `recordResolvedTarget` all exist in `buildGraph`).

**3. Type consistency:** `routedDirTargets: Set<string>` — `.add(norm)` / `.has(parent)` / `.size`, all string-keyed, matching `reached: Set<string>` and `routedDirs: Set<string>`. `doc.relPath` is `string` (`WalkedDoc`). `doc.content === null` guard matches the existing enumeration's `content === null` check.

**4. Red-state note:** the T-dir-1/T-dir-2 red states are **derived from a code trace, not executed** (this was a plan-writing session; execution is deferred). Task 1 Step 2 requires confirming them on-machine before implementing — if the observed red differs, stop and reconcile before writing code.
