# Directory-Granularity Reachability (TBD-14) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop `orphans` scoring the legitimate route-to-directory convention as a broken graph — a document directly contained in a routed **directory** becomes reachable.

**Architecture:** Reachability is a DFS over document→document edges seeded from router docs; a resolved edge whose target is a **directory** creates no edge, so documents under it orphan. This plan records directory targets **per source document** (populated only when a resolved edge's target is itself a directory) and **folds propagation into the reachability DFS** so a reached document also marks reachable every in-scope document **directly contained** in a directory it routed — **directory-only** depth, **root-restricted** (only reached docs propagate). Nothing else moves.

**Tech Stack:** TypeScript ESM (`NodeNext`), `node:test` + `node:assert/strict`, no runtime dependencies added.

**Spec:** `planning/designs/2026-08-25_directory-granularity-reachability-design.md` (WHAT & WHY; read §3.1–§3.4).

## Global Constraints

Every task's requirements implicitly include this section — values copied from the spec.

- **Propagation depth is DIRECTORY-ONLY.** A document in a **subdirectory** of a routed directory is **not** reached (§3.2). Immediate-children and full-subtree are rejected — full-subtree is the masked-rot / silent-false-negative class the whole chain refuses.
- **Propagation basis is directory TARGETS only — recorded per source document, NOT `routedDirs`.** `routedDirs` also holds parent-dirs recorded for *document* and non-doc-file targets; propagating from it would let a routed document rescue its siblings and break existing orphan behavior (§3.1).
- **Propagation is ROOT-RESTRICTED — it originates only from a REACHED document** (`planning/decisions/2026-08-25_tbd-14-root-restricted-dir-propagation.md`). `recordResolvedTarget` fires from the backtick branch (routers) AND the markdown branch (any doc), so an unrestricted rule would let an abandoned non-root doc's directory link mark that directory's docs reachable — a silent false negative. Propagation is folded **into** the reachability DFS so a document's directory targets are followed exactly when that document is reached — uniform with document-edge reachability (only reached nodes propagate), and naturally transitive.
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
| `src/tools/context-audit/graph.ts` | edge resolution, reachability, orphan accounting | Modify — record directory targets per source doc; fold directory-only, root-restricted propagation into the reachability DFS |
| `src/API.md` | MCP surface contract | Modify — one sentence in the `orphans` description |
| `test/context-audit/graph.test.ts` | graph-level behaviour tests | Modify — +5 |

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

Design §3.1–§3.2 (as amended for root-restriction). One coherent deliverable: the per-source `dirTargetsBySrc` record, the DFS-folded propagation, and the `src/API.md` sentence describing it.

**Files:**
- Modify: `src/tools/context-audit/graph.ts` — declare `dirTargetsBySrc`; record targets per source in `recordResolvedTarget`'s directory branch; precompute `docsByParentDir`; fold directory propagation into the reachability DFS.
- Modify: `src/API.md` — the `orphans` sentence in the `subscores` description.
- Test: `test/context-audit/graph.test.ts`.

**Interfaces:**
- Consumes: `WalkedDoc { relPath; absPath; content; isRoot }`, `routedDirs`, `reached`, `resolvedRefsFromRoots` — all already present in `buildGraph`.
- Produces: no new exported symbol. `dirTargetsBySrc` / `docsByParentDir` are module-local to `buildGraph`. Observable behaviour: `orphanCount` and the `orphan` findings shrink by the documents directly contained in directories routed by a reached document.

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
```

> **Red-state note (state-tagging discipline).** Under root-restriction, **T-dir-1**, **T-dir-2**, and **T-dir-5** are red→green (they change from the pre-implementation `main` behaviour); **T-dir-3** and **T-dir-4** are **guards** — green before *and* after, because pre-implementation `main` does no propagation at all, so nothing is wrongly rescued either way. A guard is not a defect: T-dir-3 and T-dir-4 each fail under a *specific wrong* implementation (T-dir-3 under an all-`routedDirs` basis; T-dir-4 under flat, non-root-inclusive propagation), which the reviewer confirms by counterfactual. Do **not** relabel T-dir-4 as red-at-pre-impl — it guards the non-root-unreached corner, whose correct behaviour is *unchanged* from pre-impl.

- [ ] **Step 2: Run the tests and confirm the EXACT red state**

Run — **`;` not `&&`** so a failing `graph.test.js` cannot short-circuit anything after it, and the assertions actually execute:

```bash
npm run build; node --test dist/test/context-audit/graph.test.js
```

Expected (derived from the code trace; **confirm on-machine before implementing** and record which state each red was measured against — state-tagging discipline):

```
✖ T-dir-1   actual orphan: 1,         expected: undefined     (red -> green)
✖ T-dir-2   actual orphan: 2,         expected: 1             (red -> green)
✔ T-dir-3   (guard — green before and after)
✔ T-dir-4   (guard — green before and after; bites a FLAT impl)
✖ T-dir-5   actual orphan: 1 (leaf),  expected: undefined     (red -> green)
```

**Exactly these three failures (T-dir-1, T-dir-2, T-dir-5) and no others.** T-dir-3 and T-dir-4 are guards and must be green now (pre-impl `main` does no propagation, so neither is wrongly rescued). If any pre-existing test is red — in particular the existing `orphan: routed-workspace doc unreachable from any root` fixture (a `[dir](src/CONTEXT.md)` document route with an unreferenced `src/orphan.md`) — stop: that fixture is a second guard for the directory-target distinction, and a red there means the plan was misread. If `tsc` fails, `dist/` is stale and both runs report the previous build — fix the build first.

- [ ] **Step 3: Write the implementation**

In `src/tools/context-audit/graph.ts`, declare a **per-source** record of directory targets next to `routedDirs` (where `routedDirs` is created at the top of `buildGraph`):

```typescript
  const dirTargetsBySrc = new Map<string, Set<string>>();   // source doc relPath -> directory TARGETS it routed (reachability basis; NOT coverage)
```

In `recordResolvedTarget` (whose signature is `(srcRel, targetPath, targetAbs)`), the directory-target branch currently reads:

```typescript
      if (isDir) {
        const d = targetPath.replace(/\/$/, "");
        routedDirs.add(d === "." ? "" : d);                 // directory target: the dir itself (normalize "." -> "")
      } else {
```

Record the directory target against its **source document** — do not change the `routedDirs.add` line:

```typescript
      if (isDir) {
        const d = targetPath.replace(/\/$/, "");
        const norm = d === "." ? "" : d;
        routedDirs.add(norm);                               // directory target: the dir itself (normalize "." -> "")
        if (!dirTargetsBySrc.has(srcRel)) dirTargetsBySrc.set(srcRel, new Set());
        dirTargetsBySrc.get(srcRel)!.add(norm);             // AND record it under the doc that routed it (root-restricted propagation basis)
      } else {
```

Precompute an index of documents by their parent directory once, **immediately before the reachability DFS** (it only reads `walkRes.docs`):

```typescript
  const docsByParentDir = new Map<string, string[]>();
  for (const d of walkRes.docs) {
    if (d.content === null) continue;
    const parent = d.relPath.includes("/") ? d.relPath.slice(0, d.relPath.lastIndexOf("/")) : "";
    let arr = docsByParentDir.get(parent);
    if (!arr) { arr = []; docsByParentDir.set(parent, arr); }
    arr.push(d.relPath);
  }
```

Then **fold directory-target propagation into the reachability DFS**. The DFS `while` loop currently reads:

```typescript
  while (stack.length) {
    const cur = stack.pop()!;
    for (const nxt of edges.get(cur) ?? []) if (!reached.has(nxt)) { reached.add(nxt); stack.push(nxt); }
  }
```

Extend it so a reached document also propagates through its **directory** targets, directory-only:

```typescript
  while (stack.length) {
    const cur = stack.pop()!;
    // document edges (unchanged)
    for (const nxt of edges.get(cur) ?? []) if (!reached.has(nxt)) { reached.add(nxt); stack.push(nxt); }
    // directory-target edges (design 2026-08-25 §3.1–§3.2, root-restricted by
    // construction: only a REACHED `cur` reaches this line). A directory routed
    // by cur makes the documents DIRECTLY inside it reachable — DIRECTORY-ONLY
    // depth: a doc in a SUBDIRECTORY is not reached (the visible-FP-never-silent-
    // FN boundary). Pushing them means a doc reached via a directory route can
    // in turn propagate its own directory routes (naturally transitive).
    for (const d of dirTargetsBySrc.get(cur) ?? []) {
      for (const doc of docsByParentDir.get(d) ?? []) if (!reached.has(doc)) { reached.add(doc); stack.push(doc); }
    }
  }
```

This keeps `routedDirs` (and `coverage`) untouched, sources propagation from directory TARGETS only (so a routed document does not rescue siblings), and gates propagation on reached origin (so an unreached non-root doc's directory link rescues nothing).

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: **107 tests, 107 pass, 0 fail** (102 + 5). T-dir-1, T-dir-2, T-dir-5 now green; T-dir-3, T-dir-4 and the existing `orphan: routed-workspace…` fixture still green. If any pre-existing test is red, stop and diagnose — do not edit the fixture.

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
git diff main...HEAD -- src/tools/context-audit/graph.ts | grep -iE "TBD_10_WEIGHTS|ROUTING_LAYER_KEYS|routedDirs\.(delete|clear)|coverage" || echo "no coverage/weight touch"
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

ROOT-RESTRICTED: propagation is folded into the reachability DFS, so a
directory route propagates only from a REACHED document -- uniform with
document-edge reachability, and naturally transitive. An abandoned
non-root doc's directory link rescues nothing (that would be a silent
false negative). Sourced from directory TARGETS recorded per source doc,
not routedDirs, so a routed document does not rescue its siblings and
coverage's routedDirs is untouched. No new edge; the routing DAG, drift,
and coverage accounting are unchanged.

src/API.md updated in the same commit (rule 8). orphans stays out of
TBD-10 weighting until re-validation; no weight or threshold number.

Refs TBD-14."
```

---

### Task 2: Review and finish the branch

`WORKFLOW.md` requires the code reviewers before finishing and a PR rather than a direct commit to `main`. **No code is written in this task.**

- [ ] **Step 1: Final full-suite run** — `npm test`. Expected: **107 / 107**, `tsc` clean.
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
| §3.1 directory-target propagation, directory-only, per-source basis distinct from `routedDirs` | Task 1 — Step 3 |
| §3.1 **root-restricted** — propagation folded into the DFS, only reached docs propagate | Task 1 — Step 3 (DFS fold); T-dir-4 (unreached does not rescue), T-dir-5 (reached non-root does) |
| §3.2 depth = directory-only (subdir not reached) | Task 1 — T-dir-2 |
| §3.1 a routed document does not rescue siblings | Task 1 — T-dir-3 + existing fixture |
| §3.1 `coverage` / `routedDirs` untouched | Task 1 — Step 7 |
| §3.3 secondary class not resolved here (named accepted, no detector) | Out of build scope — re-validation classifies; noted in "After the plan" |
| §3.4 categorical exit, no number | "After the plan" |
| §5 `src/API.md` same commit (rule 8) | Task 1 — Step 5 |
| §5 orphans stays out of TBD-10 weighting; no weight | Global Constraints; Task 1 — Step 7 |

**2. Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to Task N". Every code step carries real code. No step references a symbol not present in the codebase or defined here (`dirTargetsBySrc` and `docsByParentDir` are introduced in Step 3; `reached`, `routedDirs`, `walkRes.docs`, `recordResolvedTarget` all exist in `buildGraph`).

**3. Type consistency:** `dirTargetsBySrc: Map<string, Set<string>>` — `.get(cur)`/`.set`/`.has`, string keys and string-set values; `docsByParentDir: Map<string, string[]>`. Both align with `reached: Set<string>` and `routedDirs: Set<string>`. `doc.relPath` is `string` (`WalkedDoc`). `doc.content === null` guard matches the existing enumeration's `content === null` check.

**4. Red-state note:** the T-dir-1/T-dir-2 red states are **derived from a code trace, not executed** (this was a plan-writing session; execution is deferred). Task 1 Step 2 requires confirming them on-machine before implementing — if the observed red differs, stop and reconcile before writing code.
