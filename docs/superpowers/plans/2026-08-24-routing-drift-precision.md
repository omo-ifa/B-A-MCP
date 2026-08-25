# routing_drift Precision (TBD-16) Implementation Plan — revision 2

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop `routing_drift` accusing routers of broken routes when the path is real and only the base directory was guessed wrong.

**Architecture:** A third resolution outcome sits between "resolves" and "drift". In a **nested** router, a path-shaped span that resolves under neither base but matches an already-walked document inside that router's own subtree becomes an **unanchored reference** — neither a finding nor an edge, excluded from the drift numerator and denominator. A **root-located** router has no proper subtree bound and is strict anchored-or-drift. Separately, template-placeholder spans stop being treated as paths anywhere, in either link syntax and in any document type.

**Tech Stack:** TypeScript ESM (`NodeNext`), `node:test` + `node:assert/strict`, no runtime dependencies added.

**Spec:** `planning/designs/2026-08-24_routing-drift-precision-design.md`, as amended by `planning/decisions/2026-08-24_d2-d3-superseded-before-implementation.md` and `planning/decisions/2026-08-24_tier-2-scope-and-placeholder-globality.md`

---

## Revision note — what changed since revision 1

Revision 1 was **REVIEWED: REJECT** — 2 CRITICAL scope findings, 1 IMPORTANT, 11 mechanical. The two CRITICALs were **not** plan bugs; they were decisions the design had left open, and they went back through `/decisions`. This revision is written against the amended design.

| Rev-1 finding | Disposition here |
|---|---|
| CRITICAL — denominator can empty → drift `null` | Design §3.4 amended: the `null` is **accepted and correct**. Now asserted by **T4b**. |
| CRITICAL — root router's subtree bound is vacuous | Design §3.1 amended: root-located routers get **no tier 2**. Enforced by the **location gate**; asserted by **T3f**. |
| IMPORTANT — placeholder leaks to non-router `broken_ref` | **Ratified global** (D3). Now tested (**T2c**) and documented. |
| 4 — API.md unescaped quotes broke its JSON blocks | Escaped; all 4 blocks verified to parse. |
| 5 — rule 8 violated by commit ordering | Restructured to **3 tasks**, each carrying its own `src/API.md` edit. |
| 6 — `g.edges` assertion did not compile | Removed; **T3c** asserts `resolvedRefsFromRoots` instead. |
| 7 — three §5 doc rows dropped | Two decision-record pointers added to **Task 3**. |
| 8 — ledger check could not fail | Replaced with a content assertion. |
| 9 — wrong red-state prediction | **Every red state below was executed in a scratch tree and its actual output recorded.** |
| 10 — tier 2 ran before the shape gate | Moved **inside** the shape gate. |
| 11 — line citations off | Corrected against the real files. |
| 12 — Task-1 red state was a compile error | A **stub** makes it a genuine assertion failure. |
| 13 — `hasPlaceholderToken` half dead code | `{}` moved out of the earlier character class into the predicate. |
| 14 — tail normalisation stripped one `./` | Uses `posix.normalize`. |

**Every test count and red state in this plan was executed, not predicted:** baseline **76** → Task 1 **83** → Task 2 **89** → Task 3 **91**, all green, no existing test reddened at any stage.

## Global Constraints

Every task's requirements implicitly include this section.

- **No threshold or weight number is set anywhere in this plan.** TBD-10/11/12 remain deferred (rule 7).
- **`TBD_10_WEIGHTS` and `ROUTING_LAYER_KEYS` in `src/tools/context-audit/score.ts` are NOT edited.**
- **No lower-then-raise.** D2/D3 were superseded before implementation; there is no interim state. `routing_path_missing` stays `high` and `routing_drift` stays scored-real throughout — never demoted and re-promoted. **Do not add a "restore to `high`" step; the ratchet record settled that.**
- **Tier 2 gates on LOCATION, never on `isRoot`.** See the boxed warning in Task 2.
- **Tier 2 searches the already-walked document set** — never a fresh filesystem traversal.
- **Tier-2 match is "≥ 1 document in the subtree", not "exactly 1."**
- **Tier 2 creates NO edge.** It must not touch `routedDirs`, `edges`, reachability, or `resolvedRefsFromRoots`.
- **Two hard invariants preserved:** never follow a symlink; never read above root.
- **`src/API.md` updates in the same commit as the behaviour it describes** (rule 8) — which is why each task carries its own edit.
- **Context-budget ledger** (`src/CONTEXT.md`, rule 2): re-measure only if the tool `description` or schema changes. Neither changes here — **verified by content, not by `git diff`**.
- **`prompts/` untouched.** `.claude/commands/` not regenerated.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `src/tools/context-audit/links.ts` | Link extraction + the *definition* of a routing path by shape | Modify — add `hasPlaceholderToken`, tighten `isRoutingPathShape` |
| `src/tools/context-audit/graph.ts` | Edge resolution, drift/orphan/reachability accounting | Modify — global placeholder exclusion; location-gated tier 2 |
| `src/API.md` | MCP surface contract | Modify — split across Tasks 1–2 |
| `test/context-audit/links.test.ts` | Shape-definition tests | Modify — +4 |
| `test/context-audit/graph.test.ts` | Graph-level behaviour tests | Modify — +3 (Task 1), +6 (Task 2) |
| `test/context-audit/orchestrate.test.ts` | End-to-end contract tests | Modify — +2 |
| `planning/decisions/2026-08-20_router-path-drift.md` | Prior routing-path definition | Modify — pointer only |
| `planning/decisions/2026-08-20_backtick-routing-edges-and-orphans-guard.md` | Prior two-base resolution | Modify — pointer only |

`score.ts`, `index.ts`, `coverage.ts`, `bloat.ts`, `walk.ts`, `types.ts` are **not** modified. No new files.

---

### Task 1: Placeholders and bare extensions are not paths — in any syntax, in any document

Design §3.2. One coherent deliverable: the definition (`links.ts`) and the place it applies globally (`graph.ts`'s shared markdown branch), plus the `src/API.md` sentence describing both.

**Files:**
- Modify: `src/tools/context-audit/links.ts:58-73` (comment + `isRoutingPathShape`)
- Modify: `src/tools/context-audit/graph.ts:3` (import) and `graph.ts:112-114` (markdown edge branch)
- Modify: `src/API.md`
- Test: `test/context-audit/links.test.ts`, `test/context-audit/graph.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `export function hasPlaceholderToken(raw: string): boolean` in `links.ts` — consumed by Task 2. `isRoutingPathShape(raw: string): boolean` keeps its signature.

- [ ] **Step 1: Add the stub so the red state is a real assertion failure**

Without this the build fails on a missing export and **no test ever runs** — a compile gate, not a red bar. In `src/tools/context-audit/links.ts`, immediately above `isRoutingPathShape`:

```typescript
export function hasPlaceholderToken(raw: string): boolean {
  return false;   // STUB — replaced in Step 4
}
```

In the same file, narrow the existing character class so the two rules do not overlap (finding 13 — `{}` belongs to the placeholder predicate):

```typescript
  if (/[*~$]/.test(t)) return false;
```

- [ ] **Step 2: Write the failing tests**

In `test/context-audit/links.test.ts`, extend the import:

```typescript
import { extractLinks, classifyLink, isRoutingPathShape, hasPlaceholderToken } from "../../src/tools/context-audit/links.js";
```

Append:

```typescript
test("T1a isRoutingPathShape rejects template placeholders", () => {
  assert.equal(isRoutingPathShape("products/desktop/<dir>/AGENTS.md"), false);
  assert.equal(isRoutingPathShape("chart:<chart_id>.md"), false);
  assert.equal(isRoutingPathShape("docs/{name}.md"), false);
});

test("T1b isRoutingPathShape rejects a bare extension", () => {
  assert.equal(isRoutingPathShape(".md"), false);
  assert.equal(isRoutingPathShape("docs/.md"), false);
});

test("T1c isRoutingPathShape keeps leading-dot SEGMENTS", () => {
  // "no stem" is about the FINAL segment, not a leading dot anywhere.
  assert.equal(isRoutingPathShape(".claude/CLAUDE.md"), true);
  assert.equal(isRoutingPathShape(".github/copilot-instructions.md"), true);
});

test("T1d hasPlaceholderToken is syntax-independent", () => {
  assert.equal(hasPlaceholderToken("chart:<chart_id>"), true);
  assert.equal(hasPlaceholderToken("a/{b}/c.md"), true);
  assert.equal(hasPlaceholderToken("src/CONTEXT.md"), false);
});
```

Append to `test/context-audit/graph.test.ts`:

```typescript
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
```

- [ ] **Step 3: Run the tests and confirm the EXACT red state**

Run: `npm run build && node --test dist/test/context-audit/links.test.js && node --test dist/test/context-audit/graph.test.js`

Observed (executed, not predicted):

```
✖ T1a   ✖ T1b   ✔ T1c   ✖ T1d
✖ T2a  actual: 2, expected: 1
✖ T2b  actual: 1, expected: 0
✖ T2c  actual: 2, expected: 1
```

**T1c passes now and must keep passing** — it guards behaviour the change must not break. If any other test in these files is red, stop and diagnose before continuing.

- [ ] **Step 4: Write the implementation**

Replace the stub in `src/tools/context-audit/links.ts` and tighten the shape test:

```typescript
// Template placeholders are not paths in ANY link syntax, and not in any
// document type: `chart:<chart_id>` is a form with a blank in it, not a path
// that failed to resolve. Shared by the shape test below and by the markdown
// branch in graph.ts. See design §3.2 (ratified global, decision 2026-08-24 D3).
export function hasPlaceholderToken(raw: string): boolean {
  return /[<>{}]/.test(raw);
}

export function isRoutingPathShape(raw: string): boolean {
  const t = raw.trim();
  if (t === "" || /\s/.test(t)) return false;
  if (t.startsWith("-") || t.startsWith("@")) return false;
  if (/[*~$]/.test(t)) return false;
  if (hasPlaceholderToken(t)) return false;
  if (!/\.md$/i.test(t)) return false;
  // A routing path needs something to name. Tests the FINAL segment only, so a
  // leading-dot DIRECTORY (.claude/CLAUDE.md) stays valid while a bare
  // extension (".md", "docs/.md") does not.
  const last = t.slice(t.lastIndexOf("/") + 1);
  return last.toLowerCase() !== ".md";
}
```

In the doc comment directly above (`links.ts:58-66`), the excluded-marker list reads *"glob (`*` `{` `}`), home (`~`) …"*. Move the brace forms out of that sentence — they are now owned by `hasPlaceholderToken` — so the comment matches the code.

In `src/tools/context-audit/graph.ts`, extend the import on line 3:

```typescript
import { extractLinks, classifyLink, isRoutingPathShape, hasPlaceholderToken } from "./links.js";
```

And insert into the markdown branch, after the `kind !== "edge"` guard (line 112) and **before** the counter on line 114:

```typescript
      if (link.kind !== "edge" || link.targetPath === null) continue;
      // A template placeholder is not a route in ANY syntax or ANY doc type
      // (design §3.2, ratified global). Excluded from numerator AND denominator.
      if (hasPlaceholderToken(raw.targetRaw)) continue;
      // a real, non-escaping edge: count it against the right denominator population
      if (doc.isRoot) refsFromRoots++; else refsFromNonRoots++;
```

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: **83 tests, 83 pass, 0 fail** (76 baseline + 7). Observed. If any pre-existing test is red, stop and diagnose — do not edit the fixture.

- [ ] **Step 6: Update `src/API.md` (rule 8 — same commit as the behaviour)**

In the `subscores` description, append to the sentence ending *"…(category `routing_path_missing`)."*:

```
Template placeholders (`chart:<chart_id>`, `<dir>`) are not paths in either link syntax OR in any document type, and are excluded from routing counts likewise — including from non-router `broken_ref`.
```

**Escape any double quotes as `\"` — this text sits inside a JSON string in a ```json fence.** Four JSON blocks in this file parse today; they must still parse after the edit.

- [ ] **Step 7: Verify `src/API.md` still parses**

```bash
python3 -c "
import re,json
s=open('src/API.md').read()
b=re.findall(r'\`\`\`json\n(.*?)\n\`\`\`',s,re.S)
print(len(b),'blocks'); [json.loads(x) for x in b]; print('all parse')
"
```
Expected: `4 blocks` then `all parse`.

- [ ] **Step 8: Commit**

```bash
git add src/tools/context-audit/links.ts src/tools/context-audit/graph.ts src/API.md \
        test/context-audit/links.test.ts test/context-audit/graph.test.ts
git commit -m "fix(context_audit): placeholders and bare extensions are not paths, anywhere

A template placeholder is a form with a blank in it, not a path that
failed to resolve, and a bare extension names nothing. Both are
exclusions of the routing-path definition, on the reasoning that already
excludes globs and package scopes. The final-segment test keeps
leading-dot directories (.claude/CLAUDE.md) valid.

The exclusion is global, not router-scoped: a placeholder is not a path
in any syntax or any document type, so it also stops non-router
broken_ref findings. Ratified in the 2026-08-24 decision; previously
this happened undeclared and untested.

src/API.md updated in the same commit (rule 8).

Refs TBD-16."
```

---

### Task 2: Tier 2 — the location-gated unanchored reference

The core fix. Design §3.1 as amended.

> ## Read this before writing any code
>
> **The gate is LOCATION, not `isRoot`.**
>
> A **root-located** router — `relPath` containing no `/` — has no proper subtree bound, because its subtree is the whole repository. It gets **no tier 2**.
>
> In this codebase **`isRoot` means "is a router doc", at any depth**, and it *already gates the backtick branch* (`graph.ts:71`). Gating tier 2 on `isRoot` would make it **never fire — silently deleting the entire fix**. T3a would stay red and T3f would pass for the wrong reason.

**Files:**
- Modify: `src/tools/context-audit/graph.ts:2` (import `posix`), new helper before `buildGraph` (after the `f(...)` helper, which ends at line 27), call site at `graph.ts:102-107`
- Modify: `src/API.md`
- Test: `test/context-audit/graph.test.ts`

**Interfaces:**
- Consumes: `WalkedDoc { relPath: string; absPath: string; content: string | null; isRoot: boolean }` from `./walk.js` (already imported at `graph.ts:5`).
- Produces: module-private `isUnanchoredInSubtree(docs: WalkedDoc[], routerRelPath: string, rawTarget: string): boolean`. Not exported.

- [ ] **Step 1: Write the failing tests**

Append to `test/context-audit/graph.test.ts`:

```typescript
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
  const dir = mkdtempSync(join(tmpdir(), "ca-t3f-"));
  try {
    mkdirSync(join(dir, "plugins", "x"), { recursive: true });
    writeFileSync(join(dir, "CLAUDE.md"), "root mentions `SKILL.md` in prose\n");
    writeFileSync(join(dir, "plugins", "x", "SKILL.md"), "unrelated\n");
    const c = cats(dir);
    assert.equal(c.routing_path_missing, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
```

- [ ] **Step 2: Run the tests and confirm the EXACT red state**

Run: `npm run build && node --test dist/test/context-audit/graph.test.js`

Observed (executed, not predicted):

```
✖ T3a   ✖ T3b   ✖ T3c
✔ T3d   ✔ T3e   ✔ T3f
```

**T3d, T3e and T3f pass BEFORE the change and must still pass after** — they guard behaviour the fix must preserve. **T3a-vs-T3f is the trap detector:** an `isRoot`-based implementation leaves T3a red; an implementation with no location gate turns T3f red. Both must be green together.

- [ ] **Step 3: Write the implementation**

Extend the import on `src/tools/context-audit/graph.ts:2`:

```typescript
import { join, posix } from "node:path";
```

Add the helper immediately before `export function buildGraph` (the `f(...)` helper ends at line 27):

```typescript
// Tier 2 — an "unanchored reference": the span resolves under neither base the
// tool can attribute, but a walked document matching it exists inside the
// router's own subtree. Router prose routinely describes a sibling or child
// directory, so the path is real and the base is unknowable. Neither drift nor
// an edge — the tool declines to call it broken and declines to guess.
//
// LOCATION GATE (design §3.1 as amended 2026-08-24): a ROOT-LOCATED router —
// relPath with no "/" — has no proper subtree bound (its subtree is the repo),
// so it gets NO tier 2. This keys on LOCATION, never on isRoot: isRoot means
// "is a router doc" at any depth and already gates this branch, so gating on it
// would make tier 2 never fire.
//
// Searches the already-walked doc set, never the filesystem. Match is >= 1, not
// exactly 1: with no edge created there is nothing to disambiguate.
function isUnanchoredInSubtree(docs: WalkedDoc[], routerRelPath: string, rawTarget: string): boolean {
  const i = routerRelPath.lastIndexOf("/");
  if (i < 0) return false;                       // root-located router: no bound, no tier 2
  const prefix = routerRelPath.slice(0, i + 1);
  const tail = posix.normalize(rawTarget.trim().split("#")[0]);
  if (tail === "" || tail === "." || tail.startsWith("../") || posix.isAbsolute(tail)) return false;
  return docs.some((d) => d.relPath.startsWith(prefix) && (d.relPath === tail || d.relPath.endsWith("/" + tail)));
}
```

Then change the drift condition at `graph.ts:102-107` so tier 2 is checked **inside** the shape gate:

```typescript
        const missing = cands.find((c) => c.kind === "edge" && c.targetPath !== null);
        // Tier 2 is checked INSIDE the shape gate, so only .md-shaped spans ever
        // reach the doc-set scan — preserving design §3.1's "always a .md path by
        // construction" guarantee and avoiding an O(docs) scan per prose span.
        if (missing && isRoutingPathShape(raw.targetRaw)
            && !isUnanchoredInSubtree(walkRes.docs, doc.relPath, raw.targetRaw)) {
          refsFromRoots++;
          findings.push(f("routing_path_missing", doc.relPath, missing.line, "router path does not resolve to an existing file", missing.targetPath!, missing.targetPath!));
        }
```

Skipping the block skips `refsFromRoots++` as well — the numerator-and-denominator exclusion §3.1 requires.

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: **89 tests, 89 pass, 0 fail** (83 + 6). Observed. All six T3 tests green together.

**If a pre-existing test goes red, stop and diagnose — do not edit the fixture.** A prior build in this repo was nearly derailed when a new guard reddened four existing fixtures that the plan had not anticipated. (In scratch verification none went red, so a red here means the implementation diverged from this plan.)

- [ ] **Step 5: Update `src/API.md` (rule 8)**

Two edits. **Escape double quotes as `\"` — both sit inside JSON strings.**

In the `subscores` description, after the placeholder sentence added in Task 1:

```
A router path resolves doc-relative OR root-relative; a span in a NESTED router that resolves under neither base but which matches a walked document inside that router's own subtree is an \"unanchored reference\" — router prose routinely describes a sibling or child directory, so the path is real and the base is unknowable. An unanchored reference is neither drift nor an edge, and is excluded from this sub-score's numerator and denominator; a router at the repository ROOT has no proper subtree bound and is therefore strict anchored-or-drift. When a router's entire reference set is unanchored the denominator is empty and this sub-score reports `null` (`n === 0`), which is correct — there is no population to compute a rate over.
```

In the `category` enum description, replace the `routing_path_missing` sentence:

```
routing_path_missing (high) is a path-shaped backtick in a ROUTER doc that resolves to nothing anywhere that router can be held responsible for — a broken route, counted toward routing_drift, tallied separately from broken markdown links. LIMITATION: in a NESTED router, a path matching a document elsewhere in that router's subtree is treated as unanchored rather than broken, so a genuinely rotted route is not reported when a same-named file survives under the same router — a deliberate trade against the far more frequent false accusation, recorded in planning/designs/2026-08-24_routing-drift-precision-design.md §3.5.
```

- [ ] **Step 6: Verify `src/API.md` still parses**

Same command as Task 1 Step 7. Expected: `4 blocks`, `all parse`.

- [ ] **Step 7: Commit**

```bash
git add src/tools/context-audit/graph.ts src/API.md test/context-audit/graph.test.ts
git commit -m "fix(context_audit): tier-2 unanchored references are not routing drift

In a NESTED router, a path-shaped span that resolves under neither base
but matches a walked document inside that router's own subtree is an
unanchored reference: the path is real and the base is unknowable,
because router prose routinely describes a sibling or child directory.

Neither a finding nor an edge. Creating an edge would mean guessing
which of N directories the prose meant, and that guess would leak into
routedDirs, reachability, coverage and orphans while TBD-12 and TBD-14
are open. Excluded from numerator and denominator.

The gate is LOCATION, not isRoot: a root-located router (relPath with no
slash) has no proper subtree bound, so it gets no tier 2 and stays
strict anchored-or-drift. isRoot means 'is a router doc' at any depth
and already gates this branch; gating on it would make tier 2 never
fire.

Checked inside the shape gate so only .md-shaped spans reach the doc-set
scan. Searches the already-walked set, not the filesystem. Match is >= 1.

src/API.md updated in the same commit (rule 8), including the
masked-rot limitation the tier introduces.

Refs TBD-16."
```

---

### Task 3: Confirm the exit criterion; close the documentation loop

Design §3.4 as amended: both surfaces are **confirmed** consistent — never restored.

**Files:**
- Modify: `planning/decisions/2026-08-20_router-path-drift.md` (pointer only)
- Modify: `planning/decisions/2026-08-20_backtick-routing-edges-and-orphans-guard.md` (pointer only)
- Test: `test/context-audit/orchestrate.test.ts`

**Interfaces:**
- Consumes: `runContextAudit` from `src/tools/context-audit/index.js` (already imported in that file); `SEVERITY_BY_CATEGORY` from `src/tools/context-audit/score.js`.
- Produces: nothing consumed downstream.

- [ ] **Step 1: Write the tests**

Add the import to `test/context-audit/orchestrate.test.ts`:

```typescript
import { SEVERITY_BY_CATEGORY } from "../../src/tools/context-audit/score.js";
```

Append:

```typescript
test("T4a exit criterion: routing_path_missing is high AND routing_drift is scored-real", async () => {
  // Design §3.4 as amended by 2026-08-24_d2-d3-superseded-before-implementation.md:
  // both surfaces are CONFIRMED consistent, never restored. D2/D3 were never
  // implemented, so there is no interim state — assert directly, no lower-then-raise.
  const dir = mkdtempSync(join(tmpdir(), "ca-t4a-"));
  try {
    mkdirSync(join(dir, "skills"), { recursive: true });
    writeFileSync(join(dir, "CLAUDE.md"), "root routes `skills/AGENTS.md`\n");
    writeFileSync(join(dir, "skills", "AGENTS.md"), "routes `references/conventions.md`\n");
    const o = await runContextAudit({ path: dir });
    assert.equal(o.ok, true);
    const r = (o as any).result;
    const pm = r.findings.filter((x: any) => x.category === "routing_path_missing");
    assert.equal(pm.length, 1);                     // the genuine broken route survives
    assert.equal(pm[0].severity, "high");           // confirmed never lowered
    assert.equal(SEVERITY_BY_CATEGORY.routing_path_missing, "high");
    assert.equal(typeof r.subscores.routing_drift.score, "number");   // scored-real
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("T4b D1: an ALL-unanchored router yields routing_drift null, and that is correct", async () => {
  // Design §3.4 as amended by 2026-08-24_tier-2-scope-and-placeholder-globality.md D1:
  // no population to compute a rate over. An ordinary data null (n === 0), not a
  // correctness null, and it needs no new mechanism.
  const dir = mkdtempSync(join(tmpdir(), "ca-t4b-"));
  try {
    mkdirSync(join(dir, "skills", "scout", "references"), { recursive: true });
    // The root router must contribute NO resolving ref, or the denominator is
    // not empty and drift is scored-real (the ordinary case — that is T4a).
    writeFileSync(join(dir, "CLAUDE.md"), "prose only, no paths here\n");
    writeFileSync(join(dir, "skills", "AGENTS.md"), "keeps `references/conventions.md`\n");
    writeFileSync(join(dir, "skills", "scout", "references", "conventions.md"), "real\n");
    const o = await runContextAudit({ path: dir });
    const r = (o as any).result;
    assert.equal(r.subscores.routing_drift.score, null);
    assert.equal(r.subscores.routing_drift.n, 0);
    // the honest companion signal: routers present, nothing resolved
    assert.equal(r.findings.some((x: any) => x.category === "routing_unresolved"), true);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
```

- [ ] **Step 2: Run them — both must be GREEN immediately**

Run: `npm run build && node --test dist/test/context-audit/orchestrate.test.js`
Expected: **T4a PASS, T4b PASS.**

These are **confirmation** tests, not a red-green cycle: there is no interim state to flip, so they must be green the moment they are written. **If T4a fails, stop** — either Task 2 over-reached and swallowed a genuine broken route, or something lowered the severity, and both contradict the exit criterion. **If T4b fails**, tier 2 is not excluding from the denominator as §3.1 requires.

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: **91 tests, 91 pass, 0 fail** (89 + 2). Observed.

- [ ] **Step 4: Add the two decision-record pointers (design §5)**

To `planning/decisions/2026-08-20_router-path-drift.md`, under its header block:

```markdown
> **Amended 2026-08-24** — `planning/designs/2026-08-24_routing-drift-precision-design.md` §3.1–§3.2. The routing-path definition here gains a placeholder/bare-extension exclusion, and a non-resolving span in a NESTED router that matches a document inside that router's own subtree is an "unanchored reference" rather than drift. Root-located routers are unchanged by that tier and remain strict anchored-or-drift.
```

To `planning/decisions/2026-08-20_backtick-routing-edges-and-orphans-guard.md`, under its header block:

```markdown
> **Amended 2026-08-24** — `planning/designs/2026-08-24_routing-drift-precision-design.md` §3.1. §62.1's doc-relative-OR-root-relative resolution gains a third outcome between "resolves" and "drift": an unanchored reference, in NESTED routers only, which is neither an edge nor a finding.
```

- [ ] **Step 5: Verify the rule-2 ledger really is unaffected**

`git diff` cannot detect this once earlier tasks are committed (it compares the working tree to the index). Assert on content instead:

```bash
git diff --stat main...HEAD -- src/tools/context-audit/index.ts
```
Expected: **no output** — `index.ts` is untouched across the whole branch, so neither the tool `description` nor `inputSchema`/`outputSchema` changed and `src/CONTEXT.md` needs no re-measure (rule 2). If it prints anything, stop and re-measure the ledger in this commit.

- [ ] **Step 6: Commit**

```bash
git add test/context-audit/orchestrate.test.ts planning/decisions/2026-08-20_router-path-drift.md \
        planning/decisions/2026-08-20_backtick-routing-edges-and-orphans-guard.md
git commit -m "test(context_audit): confirm the exit criterion; point the amended records here

Design 3.4 as amended: both surfaces are confirmed consistent, never
restored. routing_path_missing is high and routing_drift is scored-real,
asserted directly with no lower-then-raise, since D2/D3 were superseded
before implementation.

Also asserts the D1 case the design now accepts: when a router's entire
reference set is unanchored the denominator is empty and routing_drift
reports null, which is correct — there is no population to compute a
rate over. The routing_unresolved info finding accompanies it.

Adds the two pointer edits design section 5 requires, so the 2026-08-20
records say where their definitions were amended.

Context-budget ledger unaffected: index.ts untouched across the branch,
so neither the tool description nor the schema changed (rule 2).

Refs TBD-16."
```

---

## After the plan

TBD-16 does **not** close when these tasks land. Per design §3.4 it closes on **re-validation against the pinned nine-repo corpus** (`planning/calibration/2026-08-24_context-audit-run-6-nine-repo-rerun.md` §0), under the **categorical** close condition: every residual drift finding must be classifiable into a §3.5-named out-of-scope class — which now includes **"prose-relative under a root-located router"** — or be a verified genuine broken route. Any finding fitting neither goes to `/decisions`.

Expected from the pinned corpus, per the amended design: tier 2 addresses **17 of 26** prose-relative false positives (all posthog's); **9** remain by design (all caveman's root `CLAUDE.md`), and they are the named accepted class. Placeholders account for a further **10**.

That re-validation is a calibration run, not a build step, and it is **not** the README sample.

---

## Self-Review

**1. Spec coverage**

| Spec section | Task |
|---|---|
| §3.1 third tier, no edge, walked-doc-set, ≥1 match, subtree bound | Task 2 |
| §3.1 **root-located routers get no tier 2** (amended) | Task 2 — location gate, T3f |
| §3.2 placeholder exclusion, both syntaxes | Task 1 — T1a/T1d/T2a |
| §3.2 **global, any doc type** (ratified) | Task 1 — T2c |
| §3.2 bare extension; leading-dot preserved | Task 1 — T1b/T1c |
| §3.3 markdown-link drift KEEP | Task 1 — kept; only the placeholder exclusion applies. T2a asserts a genuine md-link route still drifts. |
| §3.4 exit criterion, confirm-not-restore | Task 3 — T4a |
| §3.4 **drift `null` when all-unanchored** (amended) | Task 3 — T4b |
| §3.5 masked-rot limitation on the public surface | Task 2 Step 5 |
| §5 `src/API.md` | Tasks 1 and 2 (rule 8) |
| §5 two 2026-08-20 pointer edits | Task 3 Step 4 |
| §5 ledger no-op verified | Task 3 Step 5 |
| §5 `src/TDD.md` TBD-16 row → Resolved | **Not in this plan** — happens at re-validation, which closes TBD-16. Correctly out of scope. |
| §5 `…_routing-drift-precision-and-interim-disposition.md` pointer | **Already satisfied** — it carries its disposition-update note. No task needed. |

**2. Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to Task N". Every code step carries real code. No step references a type or function not defined here or present in the codebase. The rev-1 `g.edges` defect is gone — T3c asserts `resolvedRefsFromRoots`, which `GraphResult` actually declares (`graph.ts:7-18`).

**3. Type consistency:** `hasPlaceholderToken` named identically in Tasks 1 and 2. `isUnanchoredInSubtree(docs, routerRelPath, rawTarget)` defined and called with matching argument order. `WalkedDoc` matches `walk.ts:7`. `SEVERITY_BY_CATEGORY` matches `score.ts:8`. `GraphResult.resolvedRefsFromRoots` and `.routingDriftCount` both exist. `posix` imported before use.

**4. Empirical verification:** every red state, green state and test count in this plan was executed in a scratch copy of this repo before the plan was written — **76 → 83 → 89 → 91**, no existing test reddened at any stage, and `src/API.md`'s four JSON blocks verified to parse after both edits.
