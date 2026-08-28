# Component-Manifest Orphan Detector (D5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teach `context_audit`'s `orphans` sub-score to recognize a per-component registry-manifest file (cal.com-style `DESCRIPTION.md`) as intentional layout, not abandoned rot — via detector **D5** in `accepted-layout.ts`.

**Architecture:** `walk.ts` collects `.md` only, so `config.json` presence must be walk-supplied: the walk emits a new `configDirs` set (dirs containing a `config.json`). A new `computeManifestDirs()` (mirroring `computeSkillDirs`) turns that plus the `.md` doc list into the set of qualifying registry directories — a dir with both `config.json` and `description.md`, where ≥3 sibling dirs under the same grandparent each qualify. Detector D5 nets a `DESCRIPTION.md` iff its parent is such a dir. Pure, structural, no source read, no path prefix (preserves TBD-14 Ruling 2).

**Tech Stack:** TypeScript (ESM, NodeNext), `node:test` + `node:assert/strict`, `tsc` (via `npm run build` / `pretest`).

**Spec:** `planning/designs/2026-08-28_component-manifest-orphan-detector-design.md` (mechanism decision: `planning/decisions/2026-08-28_component-manifest-detector-mechanism.md`).

## Global Constraints

- **Free/keyless (rule 3):** detector reads only the already-walked file tree. No network, no key, no persistence.
- **Rule 2 (context-budget ledger):** no `tools/list` schema field is added → the ledger (`src/CONTEXT.md`, total 1023/~4000) is **unchanged**. Do not edit it; the combined-total assertion in `test/override-log/ledger.test.ts` must still pass.
- **Rule 8 (`src/API.md`):** the accepted-layout-class enumeration appears in **two** description strings and MUST gain `component-manifest` in the same commit as the code (Task 4).
- **Threshold = ≥3** sibling dirs (owner-ratified, L5). Marker file is literally `config.json` (L6). Both are case-insensitive basename matches (L7).
- **Does NOT raise `orphans:1`** (L9) — no change to `score.ts` `TBD_10_WEIGHTS` / `ROUTING_LAYER_KEYS`.
- **TDD:** every task writes the failing test first, watches it fail, then implements. Commit after each task.
- **Node ≥ 20**, run tests with `npm test` (runs `tsc` via `pretest`, then `node --test`).

---

### Task 1: `walk.ts` emits `configDirs`

**Files:**
- Modify: `src/tools/context-audit/walk.ts` (the `WalkResult` interface ~line 8; the `walk()` body ~lines 55–130)
- Test: `test/context-audit/walk.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `WalkResult.configDirs: Set<string>` — the set of directory relPaths that directly contain a file named `config.json` (case-insensitive). Root-level `config.json` yields `""`. Consumed by Task 2's `computeManifestDirs`.

- [ ] **Step 1: Write the failing test**

Add to `test/context-audit/walk.test.ts`:

```ts
test("walk emits configDirs for directories containing a config.json", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-walk-cfg-"));
  try {
    writeFileSync(join(dir, "CLAUDE.md"), "# root");
    mkdirSync(join(dir, "plugin-a"));
    writeFileSync(join(dir, "plugin-a", "config.json"), "{}");
    writeFileSync(join(dir, "plugin-a", "DESCRIPTION.md"), "a");
    mkdirSync(join(dir, "plain"));
    writeFileSync(join(dir, "plain", "notes.md"), "n");
    const res = walk(resolveRoot(dir));
    // config.json's parent dir is recorded...
    assert.ok(res.configDirs.has("plugin-a"));
    // ...a dir with no config.json is not...
    assert.ok(!res.configDirs.has("plain"));
    // ...and config.json is NOT added as a doc (walk stays .md-only).
    assert.ok(!res.docs.some((d) => d.relPath === "plugin-a/config.json"));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run build && node --test dist/test/context-audit/walk.test.js`
Expected: FAIL — `res.configDirs` is `undefined` (property does not exist), or a `tsc` error that `configDirs` is not on `WalkResult`.

- [ ] **Step 3: Add `configDirs` to `WalkResult` and populate it**

In `src/tools/context-audit/walk.ts`, extend the interface (line ~8):

```ts
export interface WalkResult { docs: WalkedDoc[]; findings: RawFinding[]; filesSkipped: number; configDirs: Set<string>; }
```

Declare the set beside `docs` in `walk()` (near line ~56):

```ts
  const configDirs = new Set<string>();
```

In the file-handling block (currently `if (!e.isFile()) continue; if (!e.name.toLowerCase().endsWith(".md")) continue;`), record `config.json` BEFORE the `.md` filter:

```ts
      if (!e.isFile()) continue;
      if (e.name.toLowerCase() === "config.json") configDirs.add(rel(dir));
      if (!e.name.toLowerCase().endsWith(".md")) continue;
```

Return it (line ~130):

```ts
  return { docs, findings, filesSkipped, configDirs };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run build && node --test dist/test/context-audit/walk.test.js`
Expected: PASS. (The pre-existing walk tests also still pass.)

- [ ] **Step 5: Commit**

```bash
git add src/tools/context-audit/walk.ts test/context-audit/walk.test.ts
git commit -m "feat(context_audit): walk emits configDirs (dirs containing config.json)"
```

---

### Task 2: `computeManifestDirs` + `isComponentManifest` + detector D5

**Files:**
- Modify: `src/tools/context-audit/accepted-layout.ts` (add two functions; extend `AcceptedLayoutCtx` ~line 96; extend `isAcceptedLayout` ~line 100)
- Modify: `src/tools/context-audit/graph.ts` (import; compute `manifestDirs`; pass it into the ctx literal ~line 243) — required so `tsc` stays green after the ctx gains a field
- Test: `test/context-audit/accepted-layout.test.ts`

**Interfaces:**
- Consumes: `WalkResult.configDirs` (Task 1); `parentDir` (already exported from `accepted-layout.ts`).
- Produces:
  - `computeManifestDirs(configDirs: Set<string>, docRelPaths: string[]): Set<string>` — the set of qualifying registry-entry directories.
  - `isComponentManifest(relPath: string, manifestDirs: Set<string>): boolean`.
  - `AcceptedLayoutCtx` gains `manifestDirs: Set<string>` (now four fields: `routedDirs`, `dirTargets`, `skillDirs`, `manifestDirs`).

- [ ] **Step 1: Write the failing tests**

Add to `test/context-audit/accepted-layout.test.ts` (extend the import on line 4 to include `computeManifestDirs, isComponentManifest`):

```ts
test("D5 computeManifestDirs: >=3 sibling dirs each with config.json + DESCRIPTION.md qualify", () => {
  const configDirs = new Set(["r/a", "r/b", "r/c"]);
  const docs = ["r/a/DESCRIPTION.md", "r/b/DESCRIPTION.md", "r/c/DESCRIPTION.md"];
  const md = computeManifestDirs(configDirs, docs);
  assert.deepEqual([...md].sort(), ["r/a", "r/b", "r/c"]);
});

test("D5 computeManifestDirs: exactly 2 siblings do NOT qualify (threshold is >=3)", () => {
  const configDirs = new Set(["r/a", "r/b"]);
  const docs = ["r/a/DESCRIPTION.md", "r/b/DESCRIPTION.md"];
  assert.equal(computeManifestDirs(configDirs, docs).size, 0);
});

test("D5 computeManifestDirs: config.json without DESCRIPTION.md, or vice versa, is not a candidate", () => {
  const configDirs = new Set(["r/a", "r/b", "r/c"]);   // c has config but no DESCRIPTION.md
  const docs = ["r/a/DESCRIPTION.md", "r/b/DESCRIPTION.md", "r/d/DESCRIPTION.md"]; // d has DESCRIPTION but no config
  // only a and b carry BOTH -> group of 2 -> below threshold -> none qualify
  assert.equal(computeManifestDirs(configDirs, docs).size, 0);
});

test("D5 computeManifestDirs: siblings are grouped by grandparent, not globally", () => {
  const configDirs = new Set(["g1/a", "g1/b", "g2/c"]);
  const docs = ["g1/a/DESCRIPTION.md", "g1/b/DESCRIPTION.md", "g2/c/DESCRIPTION.md"];
  // g1 has 2, g2 has 1 -> neither group reaches 3
  assert.equal(computeManifestDirs(configDirs, docs).size, 0);
});

test("D5 isComponentManifest: DESCRIPTION.md in a qualifying dir nets, case-insensitive; other files do not", () => {
  const manifestDirs = new Set(["r/a"]);
  assert.equal(isComponentManifest("r/a/DESCRIPTION.md", manifestDirs), true);
  assert.equal(isComponentManifest("r/a/description.md", manifestDirs), true);   // case-insensitive
  assert.equal(isComponentManifest("r/a/README.md", manifestDirs), false);       // not the manifest doc
  assert.equal(isComponentManifest("r/z/DESCRIPTION.md", manifestDirs), false);  // dir not qualifying
});
```

Also extend the existing `isAcceptedLayout` OR-test (currently at line ~94) so its ctx literal includes the new field and asserts D5:

```ts
test("isAcceptedLayout ORs the five detectors; a plain unreferenced doc is NOT accepted", () => {
  const ctx = { routedDirs: new Set(["src"]), dirTargets: new Set(["src"]), skillDirs: new Set(["skills/foo"]), manifestDirs: new Set(["reg/a"]) };
  assert.equal(isAcceptedLayout("src/sub/nested.md", ctx), true);        // D1
  assert.equal(isAcceptedLayout("skills/foo/ref.md", ctx), true);        // D2
  assert.equal(isAcceptedLayout(".claude/agents/a.md", ctx), true);      // D3
  assert.equal(isAcceptedLayout("x/2020-01-01-note.md", ctx), true);     // D4
  assert.equal(isAcceptedLayout("reg/a/DESCRIPTION.md", ctx), true);     // D5
  assert.equal(isAcceptedLayout("src/ORPHAN.md", ctx), false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run build 2>&1 | head; node --test dist/test/context-audit/accepted-layout.test.js`
Expected: FAIL — `tsc` errors that `computeManifestDirs`/`isComponentManifest` are not exported and that the `ctx` literal is missing `manifestDirs` (once the interface is extended in Step 3 the literal errors resolve).

- [ ] **Step 3: Implement the two functions and extend the type + disjunction**

In `src/tools/context-audit/accepted-layout.ts`, add (after the D4 block, before `AcceptedLayoutCtx`):

```ts
// D5 — component-manifest (registry-glob shape). A DESCRIPTION.md is registry
// content iff its parent dir carries BOTH a config.json and a description.md AND is
// one of >=3 sibling dirs (same grandparent) that each do — the visible artifact of
// a registry glob, never a path prefix (TBD-14 Ruling 2). configDirs is walk-supplied
// because walk collects .md only, so config.json is otherwise invisible.
export function computeManifestDirs(configDirs: Set<string>, docRelPaths: string[]): Set<string> {
  const descDirs = new Set<string>();
  for (const p of docRelPaths) {
    if (p.split("/").pop()!.toLowerCase() === "description.md") descDirs.add(parentDir(p));
  }
  // candidate = a dir that has BOTH a config.json and a description.md (never the repo root)
  const byGrand = new Map<string, string[]>();
  for (const d of descDirs) {
    if (d === "" || !configDirs.has(d)) continue;
    const g = parentDir(d);
    let arr = byGrand.get(g);
    if (!arr) { arr = []; byGrand.set(g, arr); }
    arr.push(d);
  }
  const qualifying = new Set<string>();
  for (const group of byGrand.values()) if (group.length >= 3) for (const d of group) qualifying.add(d);
  return qualifying;
}

export function isComponentManifest(relPath: string, manifestDirs: Set<string>): boolean {
  return relPath.split("/").pop()!.toLowerCase() === "description.md" && manifestDirs.has(parentDir(relPath));
}
```

Extend the interface (line ~96):

```ts
export interface AcceptedLayoutCtx { routedDirs: Set<string>; dirTargets: Set<string>; skillDirs: Set<string>; manifestDirs: Set<string>; }
```

Extend the disjunction (line ~100):

```ts
export function isAcceptedLayout(relPath: string, ctx: AcceptedLayoutCtx): boolean {
  return isRouteToDirNested(relPath, ctx.routedDirs, ctx.dirTargets)
    || isSkillDiscovered(relPath, ctx.skillDirs)
    || isAgentRuntimeConfig(relPath)
    || isTightDatedArchival(relPath)
    || isComponentManifest(relPath, ctx.manifestDirs);
}
```

- [ ] **Step 4: Wire `graph.ts` so the ctx literal is complete (fan-out fix)**

`AcceptedLayoutCtx` now has a required `manifestDirs`; the only non-test construct site is `graph.ts:243`. Update the import (line 4):

```ts
import { isAcceptedLayout, computeSkillDirs, computeManifestDirs } from "./accepted-layout.js";
```

Beside the `skillDirs` computation (line ~234), add:

```ts
    const manifestDirs = computeManifestDirs(walkRes.configDirs, walkRes.docs.filter((d) => d.content !== null).map((d) => d.relPath));
```

Update the `isAcceptedLayout` call (line ~243):

```ts
        if (!isAcceptedLayout(doc.relPath, { routedDirs, dirTargets, skillDirs, manifestDirs })) genuineAbandonedCount++;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — the new accepted-layout tests pass, and the full suite is green (`tsc` clean; the ctx literal in both `graph.ts` and the test now has all four fields).

- [ ] **Step 6: Commit**

```bash
git add src/tools/context-audit/accepted-layout.ts src/tools/context-audit/graph.ts test/context-audit/accepted-layout.test.ts
git commit -m "feat(context_audit): detector D5 component-manifest (registry-glob shape)"
```

---

### Task 3: graph-level integration proof

**Files:**
- Test: `test/context-audit/graph.test.ts` (test-only; validates Task 1+2 wiring end-to-end)

**Interfaces:**
- Consumes: `buildGraph(resolveRoot(dir), walk(resolveRoot(dir)))` → `GraphResult` with `genuineAbandonedCount` and `orphanCount` (existing fields).
- Produces: nothing (verification task).

- [ ] **Step 1: Write the failing tests**

Add to `test/context-audit/graph.test.ts`:

```ts
test("D5 integration: a >=3-entry registry's DESCRIPTION.md files are orphans but NOT genuine-abandoned", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-graph-d5-"));
  try {
    // Root routes to a FILE under packages/app-store -> that dir is a routedDir
    // (file-parent) but NOT a dirTarget, so D1 will not net the plugin docs; only D5 can.
    writeFileSync(join(dir, "CLAUDE.md"), "root [idx](packages/app-store/index.md)\n");
    mkdirSync(join(dir, "packages", "app-store"), { recursive: true });
    writeFileSync(join(dir, "packages", "app-store", "index.md"), "store index\n"); // reachable
    for (const p of ["plugin-a", "plugin-b", "plugin-c"]) {
      mkdirSync(join(dir, "packages", "app-store", p));
      writeFileSync(join(dir, "packages", "app-store", p, "config.json"), "{}");
      writeFileSync(join(dir, "packages", "app-store", p, "DESCRIPTION.md"), "d\n"); // orphan, netted by D5
    }
    // one genuinely-abandoned doc to prove the counter still catches rot
    writeFileSync(join(dir, "packages", "app-store", "plugin-a", "notes.md"), "rot\n");
    const g = buildGraph(resolveRoot(dir), walk(resolveRoot(dir)));
    // 3 DESCRIPTION.md + 1 notes.md are all orphans...
    assert.equal(g.orphanCount, 4);
    // ...but only notes.md is genuine-abandoned; the 3 registry manifests net out.
    assert.equal(g.genuineAbandonedCount, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("D5 integration: a 2-entry registry does NOT net (threshold >=3) — both DESCRIPTION.md count as rot", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-graph-d5b-"));
  try {
    writeFileSync(join(dir, "CLAUDE.md"), "root [idx](packages/app-store/index.md)\n");
    mkdirSync(join(dir, "packages", "app-store"), { recursive: true });
    writeFileSync(join(dir, "packages", "app-store", "index.md"), "store index\n");
    for (const p of ["plugin-a", "plugin-b"]) {
      mkdirSync(join(dir, "packages", "app-store", p));
      writeFileSync(join(dir, "packages", "app-store", p, "config.json"), "{}");
      writeFileSync(join(dir, "packages", "app-store", p, "DESCRIPTION.md"), "d\n");
    }
    const g = buildGraph(resolveRoot(dir), walk(resolveRoot(dir)));
    assert.equal(g.orphanCount, 2);
    assert.equal(g.genuineAbandonedCount, 2);   // below threshold -> not netted
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
```

- [ ] **Step 2: Run tests to verify they behave as expected**

Run: `npm run build && node --test dist/test/context-audit/graph.test.js`
Expected: PASS (Task 2 already wired `graph.ts`). If either fails, the wiring in Task 2 Step 4 is wrong — fix there, not here. (Sanity: temporarily reverting the Task-2 `manifestDirs` wiring makes the first test report `genuineAbandonedCount === 4`, confirming the test discriminates.)

- [ ] **Step 3: Commit**

```bash
git add test/context-audit/graph.test.ts
git commit -m "test(context_audit): D5 registry-nets integration proof (>=3 nets, 2 does not)"
```

---

### Task 4: update `src/API.md` (rule 8, same-commit contract)

**Files:**
- Modify: `src/API.md` (the `subscores` description ~line 81; the `stats.genuine_abandoned_count` description ~line 113)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing (documentation contract).

- [ ] **Step 1: Add `component-manifest` to both class enumerations**

In `src/API.md`, the `subscores` description lists "four accepted-layout classes — route-to-directory-nested, skill-discovery, agent-runtime config, and tight dated/versioned-archival". Change it to enumerate **five**, adding `component-manifest`, e.g.: "…five accepted-layout classes — route-to-directory-nested, skill-discovery, agent-runtime config, tight dated/versioned-archival, and component-manifest — are still enumerated as `orphan` findings…".

In the `stats.genuine_abandoned_count` description, the parenthetical "(route-to-directory-nested, skill-discovery, agent-runtime config, tight dated/versioned-archival)" gains `, component-manifest` before the close paren.

Do not change any other wording, field, or the schema shape.

- [ ] **Step 2: Verify both edited `json` blocks still parse (API-json-ok check)**

Run (extracts each ```json fenced block from API.md and JSON.parses it):

```bash
node -e '
const fs=require("fs");
const s=fs.readFileSync("src/API.md","utf8");
const blocks=[...s.matchAll(/```json\n([\s\S]*?)\n```/g)].map(m=>m[1]);
let n=0; for (const b of blocks){ JSON.parse(b); n++; }
console.log("json blocks parsed OK:", n);
'
```
Expected: prints `json blocks parsed OK: N` (N ≥ 1) with no `SyntaxError`. A thrown error means the edit broke JSON (likely an unescaped quote) — fix the string.

- [ ] **Step 3: Confirm the enumeration edit landed and the suite is green**

Run: `grep -c "component-manifest" src/API.md` (expect ≥ 2), then `npm test` (expect all pass; ledger assertion in `test/override-log/ledger.test.ts` still green — no schema change).

- [ ] **Step 4: Commit**

```bash
git add src/API.md
git commit -m "docs(api): add component-manifest to the accepted-layout class enumeration (rule 8)"
```

---

## Self-Review

**1. Spec coverage** — every design section maps to a task:
- Walk emits `configDirs` (design "Data shape / interface" step 1) → **Task 1**.
- `computeManifestDirs` + `manifestDirs` ctx field + D5 predicate (design steps 2–4; L2/L3/L4/L5/L6/L7) → **Task 2**.
- Netting semantics unchanged / excluded-from-numerator-still-a-finding (L8) → verified by **Task 3** (`orphanCount` includes them, `genuineAbandonedCount` excludes them).
- `orphans:1` NOT raised (L9) → no `score.ts` edit in any task. ✓
- Close condition = corpus re-validation (L10) → explicitly out of scope; not a task (its own later session under TBD-10). ✓
- Ledger unchanged (rule 2 / L11) → asserted by leaving `src/CONTEXT.md` untouched and the ledger test green (Task 2/4 Step run). ✓
- API.md required edit, both strings, json-parse-valid (L11 / rule 8) → **Task 4**. ✓
- Deferrals TBD-25/26 → already stubbed at Gate 2; no task. ✓

**2. Placeholder scan** — no "TBD/TODO/handle edge cases/similar to Task N"; every code and test step shows real content. ✓

**3. Type consistency** — `computeManifestDirs(configDirs, docRelPaths)` and `isComponentManifest(relPath, manifestDirs)` are used with those exact signatures in Task 2's tests, in `graph.ts` (Task 2 Step 4), and via `AcceptedLayoutCtx.manifestDirs` (four fields: `routedDirs`, `dirTargets`, `skillDirs`, `manifestDirs`) consistently across the interface, `graph.ts`, and both test literals. `WalkResult.configDirs` is produced in Task 1 and consumed in Task 2 Step 4 under the same name. ✓

**4. Fan-out (WORKFLOW.md Obs 22)** — adding required `manifestDirs` to `AcceptedLayoutCtx` breaks every ctx literal; the two construct sites (`graph.ts:243`, `accepted-layout.test.ts:95`) are both fixed in Task 2 (Steps 3–4), so `tsc` is green at the Task-2 commit. ✓
