# context_audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `context_audit` — a free, keyless, read-only MCP tool that audits a repository's `CLAUDE.md`/`CONTEXT.md` routing layer and returns a scored, unfakeable diagnosis (bloat, orphans, broken refs, routing drift, coverage gaps) as one JSON object plus a tool-rendered markdown summary.

**Architecture:** A pure MCP tool under `src/tools/context-audit/`, decomposed into focused modules (root resolution, filesystem walk, link extraction, reference graph, bloat/coverage sub-scores, scoring, rendering) wired by an orchestrator (`index.ts`) and registered through `server.ts`. Stdio, local, in-process, never touches B&A infrastructure. Stateless cold-walk every call; same tree in → same score out.

**Tech Stack:** TypeScript (ESM, `NodeNext`, explicit `.js` import extensions), `@modelcontextprotocol/sdk`, `ignore` (MIT, `.gitignore` semantics), `node:test` + `node:assert/strict` (no third-party test/assertion libs), `node:crypto` (finding-id hashing).

**Spec:** `planning/designs/2026-08-18_context-audit-design.md` (Approved 2026-08-18). The plan argues from that doc; executors read both.

## Global Constraints

Every task's requirements implicitly include this section. Values copied verbatim from the design doc and `CLAUDE.md`.

- **Free/keyless (rule 3).** `context_audit` never requires a key, never makes a network call, never persists an artifact, never touches B&A infrastructure. Free = reasoning.
- **Read-only invariants (assert in `src/API.md`, same class as the free/paid boundary):** read-only · **never reads a byte above the resolved root** · **never follows symlinks** · stateless / no cache · **tool owns rendering** (agent displays the `rendered` string verbatim) · severity scale is a stable contract · normalized (sorted) path ordering for determinism.
- **Structured error envelope (never throw to the client).** Exact shape: `{ "error": { "code": "SNAKE_CASE_ERROR_CODE", "message": "...", "detail": "optional" } }`. Never reveal a path outside the user's working tree or any B&A infrastructure detail in an error.
- **Same-commit rules.** Rule 8: `src/API.md` updates in the same commit as any tool-schema change. Rule 2: the context-budget ledger in `src/CONTEXT.md` updates (re-measured) in the same commit a tool is added/widened; standing tool-definition cost stays under **~4000 tokens**. Rule 4: `THIRD_PARTY_NOTICES.md` (and the matching `Integration_Spec.md` row) updates in the same commit as any runtime-dependency add or version-floor change.
- **`ignore` (MIT) dependency.** Added in the **walk** task (the first commit that imports it), together — same commit — with its `THIRD_PARTY_NOTICES.md` "Runtime dependencies (npm)" block, its `Integration_Spec.md` §3 row, and the `package.json` `dependencies` entry (rule 4). Not before.
- **SDK floor.** The tool returns `structuredContent` and declares an `outputSchema` (MCP spec rev `2025-06-18`, `@modelcontextprotocol/sdk ≥ 1.13.0`; installed is `1.30.0`). In the registration task (Task 11), raise the `package.json` floor from `^1.0.0` to `^1.30.0` and update the SDK version note in `THIRD_PARTY_NOTICES.md` and `Integration_Spec.md` §3 in the **same commit** (rule 4). `server.ts`'s low-level `setRequestHandler` does not validate `structuredContent` against `outputSchema`, so the schema is advisory and the error path is safe.
- **Token method.** `char-approx-v1`, constant `CHARS_PER_TOKEN = 4`, `tokens = Math.ceil(text.length / 4)`. The constant is part of the version string; changing it makes `char-approx-v2`. `stats.token_count_method` reports it.
- **TBD stubs (rule 7 — stub with `TODO: TBD-XXX`, never guess).**
  - `TODO: TBD-10` — sub-score → headline **weighting** (accuracy cluster weighted above bloat; an N/A sub-score drops and reweights). Implement with clearly-marked placeholder weights; produce a headline but flag it uncalibrated.
  - `TODO: TBD-11` — **bloat thresholds** (routing-token-weight, inline-ratio, chain-depth cutoffs → severity). Metrics are computed for real; only the cutoff constants are stubbed.
  - `TODO: TBD-12` — **coverage significance + thresholds**. **Build guard:** the `high`-severity "uncovered significant workspace" (`coverage`) finding is gated behind `TODO: TBD-12` and **must not fire on uncalibrated defaults** — emission guarded by a flag defaulting to off.
- **Severity mapping (design §4, authoritative), fixed five-level enum `info`/`low`/`medium`/`high`/`critical`:** `critical` = root absent or empty · `high` = `broken_ref`, `routing_drift`, uncovered significant workspace (gated) · `medium` = `orphan`, `escapes_root` · `low` = `malformed_link`, bloat depth/inline-ratio warning · `info` = skipped file, symlink-encountered, name-collision, non-scoring note.
  - **Flagged discrepancy (resolved in this plan, surfaced to the human):** design §3 "Failure & degradation" calls an empty `CLAUDE.md` a **high**-severity finding, while §4 maps root-absent-or-empty to **critical**. §4 is the Resolved Gate-2 ledger and wins on conflict; this plan uses **`critical`** for both absent and empty root. If the human prefers §3's "empty = high, worse-than-absent" nuance, that is a one-line severity change in `score.ts`.
- **Conventions.** ESM `NodeNext`; relative imports carry explicit `.js` extensions. Tools in `src/tools/`, kebab-case files, snake_case MCP name (`context_audit`). `server.ts` is the single place the tool list is assembled; tool files never touch `index.ts` or the transport.

---

### Task 1: Shared types + token counter

**Files:**
- Create: `src/tools/context-audit/types.ts`
- Create: `src/tools/context-audit/tokens.ts`
- Test: `test/context-audit/tokens.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `types.ts` exports: `RootMethod`, `Root`, `Severity`, `FindingCategory`, `Finding`, `Subscores`, `AuditStats`, `AuditResult` (shapes below).
  - `tokens.ts` exports: `const CHARS_PER_TOKEN = 4`, `const TOKEN_METHOD = "char-approx-v1"`, `function countTokens(text: string): number`.

Type shapes (used verbatim by every later task):

```typescript
// types.ts
export type RootMethod = "claude_md" | "git_root" | "given_path";
export interface Root { path: string; method: RootMethod; }

export type Severity = "info" | "low" | "medium" | "high" | "critical";

export type FindingCategory =
  | "orphan" | "broken_ref" | "routing_drift" | "malformed_link" | "escapes_root"
  | "coverage" | "bloat" | "root_absent" | "root_empty"
  | "name_collision" | "symlink" | "skipped";

// Public finding shape (design §3 output contract — exactly these fields).
export interface Finding {
  id: string;
  category: FindingCategory;
  severity: Severity;
  file: string;            // root-relative path; uncovered-dir path (trailing "/") for `coverage`
  line: number | null;
  message: string;
  evidence: string;        // the raw counted / moving value
}

// Internal working finding, produced by walk/graph/bloat/coverage before
// scoring. `discriminator` is the STABLE id key (never a measured value):
// the target path for link findings, the metric name for bloat, the uncovered
// directory path for coverage. `normalizeFindings` hashes it into `id`,
// derives `severity` from the category, and STRIPS `discriminator` so the
// public `Finding` stays exactly the design's seven fields.
export interface RawFinding {
  category: FindingCategory;
  file: string;
  line: number | null;
  message: string;
  evidence: string;
  discriminator: string;
}

export interface Subscores {
  bloat: number | null;
  orphans: number | null;
  broken_refs: number | null;
  routing_drift: number | null;
  coverage: number | null;
}

export interface AuditStats {
  docs_in_scope: number;
  routing_files: number;
  routing_tokens: number;
  orphan_count: number;
  files_skipped: number;
  token_count_method: string;
  calibrated: boolean;      // false while TBD-10/11/12 stubs are active
}

export interface AuditResult {
  root: Root;
  score: number;
  subscores: Subscores;
  findings: Finding[];
  stats: AuditStats;
  rendered: string;
}
```

- [ ] **Step 1: Write the failing test**

```typescript
// test/context-audit/tokens.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { countTokens, CHARS_PER_TOKEN, TOKEN_METHOD } from "../../src/tools/context-audit/tokens.js";

test("char-approx-v1 counts ceil(chars/4) and reports its method", () => {
  assert.equal(TOKEN_METHOD, "char-approx-v1");
  assert.equal(CHARS_PER_TOKEN, 4);
  assert.equal(countTokens(""), 0);
  assert.equal(countTokens("abcd"), 1);
  assert.equal(countTokens("abcde"), 2);      // ceil(5/4)
  assert.equal(countTokens("a".repeat(400)), 100);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` (runs `tsc` then `node --test "dist/test/**/*.test.js"`)
Expected: FAIL — `tokens.js` / `types.js` do not exist (compile error).

- [ ] **Step 3: Write minimal implementation**

```typescript
// tokens.ts
export const CHARS_PER_TOKEN = 4;
export const TOKEN_METHOD = "char-approx-v1";
export function countTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}
```

Create `types.ts` with the shapes above.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (tokens test green; existing `server`/`packaging` tests still green).

- [ ] **Step 5: Commit**

```bash
git add src/tools/context-audit/types.ts src/tools/context-audit/tokens.ts test/context-audit/tokens.test.ts
git commit -m "feat: context_audit shared types + char-approx-v1 token counter"
```

---

### Task 2: Root resolution

**Files:**
- Create: `src/tools/context-audit/root.ts`
- Test: `test/context-audit/root.test.ts`

**Interfaces:**
- Consumes: `Root`, `RootMethod` from `types.js`.
- Produces:
  - `function resolveRoot(givenPath: string): Root` — two-tier resolution. Throws `RootTargetError` (below) only when the target itself is unusable.
  - `class RootTargetError extends Error { code: "NO_ROUTING_ROOT"; detail?: string }`.
  - `function hasStructuralName(basename: string, name: "CLAUDE.md" | "AGENTS.md" | "CONTEXT.md"): boolean` — case-insensitive basename match (exported; reused by walk/graph).

Resolution: resolve `givenPath` to an absolute path; it must exist, be a directory, and be readable, else throw `RootTargetError`. Walk upward from that directory; the first ancestor whose `readdirSync` contains a case-insensitive `CLAUDE.md` → `{ path: thatDir, method: "claude_md" }`. If none up to the filesystem root, walk upward again for a `.git` entry → `{ method: "git_root" }`. Otherwise `{ path: absGiven, method: "given_path" }`.

- [ ] **Step 1: Write the failing test**

```typescript
// test/context-audit/root.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveRoot, hasStructuralName, RootTargetError } from "../../src/tools/context-audit/root.js";

function tmp() { return mkdtempSync(join(tmpdir(), "ca-root-")); }

test("resolves upward to nearest CLAUDE.md (case-insensitive)", () => {
  const dir = tmp();
  try {
    writeFileSync(join(dir, "claude.md"), "# root");   // lowercase, must still anchor
    const sub = join(dir, "src"); mkdirSync(sub);
    const r = resolveRoot(sub);
    assert.equal(r.method, "claude_md");
    assert.equal(r.path, dir);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("falls back to git root, then given path", () => {
  const dir = tmp();
  try {
    mkdirSync(join(dir, ".git"));
    const sub = join(dir, "pkg"); mkdirSync(sub);
    assert.equal(resolveRoot(sub).method, "git_root");
  } finally { rmSync(dir, { recursive: true, force: true }); }

  const bare = tmp();
  try {
    assert.equal(resolveRoot(bare).method, "given_path");
  } finally { rmSync(bare, { recursive: true, force: true }); }
});

test("throws NO_ROUTING_ROOT when target is missing or not a directory", () => {
  const dir = tmp();
  try {
    writeFileSync(join(dir, "file.md"), "x");
    assert.throws(() => resolveRoot(join(dir, "file.md")), (e: unknown) => e instanceof RootTargetError && e.code === "NO_ROUTING_ROOT");
    assert.throws(() => resolveRoot(join(dir, "nope")), (e: unknown) => e instanceof RootTargetError);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("hasStructuralName is case-insensitive", () => {
  assert.equal(hasStructuralName("CLAUDE.md", "CLAUDE.md"), true);
  assert.equal(hasStructuralName("claude.md", "CLAUDE.md"), true);
  assert.equal(hasStructuralName("Context.MD", "CONTEXT.md"), true);
  assert.equal(hasStructuralName("readme.md", "CLAUDE.md"), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `root.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

```typescript
// root.ts
import { readdirSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";

export class RootTargetError extends Error {
  readonly code = "NO_ROUTING_ROOT" as const;
  detail?: string;
  constructor(message: string, detail?: string) { super(message); this.detail = detail; }
}

export function hasStructuralName(basename: string, name: "CLAUDE.md" | "AGENTS.md" | "CONTEXT.md"): boolean {
  return basename.toLowerCase() === name.toLowerCase();
}

function dirHasClaudeMd(dir: string): boolean {
  try {
    return readdirSync(dir).some((n) => hasStructuralName(n, "CLAUDE.md"));
  } catch { return false; }
}

function dirHasGit(dir: string): boolean {
  try { statSync(join(dir, ".git")); return true; } catch { return false; }
}

export function resolveRoot(givenPath: string): Root {
  const abs = resolve(givenPath);
  let st;
  try { st = statSync(abs); } catch { throw new RootTargetError("target path does not exist or is not readable"); }
  if (!st.isDirectory()) throw new RootTargetError("target path is not a directory");

  for (let dir = abs; ; dir = dirname(dir)) {
    if (dirHasClaudeMd(dir)) return { path: dir, method: "claude_md" };
    if (dir === dirname(dir)) break;
  }
  for (let dir = abs; ; dir = dirname(dir)) {
    if (dirHasGit(dir)) return { path: dir, method: "git_root" };
    if (dir === dirname(dir)) break;
  }
  return { path: abs, method: "given_path" };
}
```

Add `import type { Root } from "./types.js";` at the top.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/context-audit/root.ts test/context-audit/root.test.ts
git commit -m "feat: context_audit two-tier root resolution (CLAUDE.md -> git -> given)"
```

---

### Task 3: Filesystem walk (+ `ignore` dependency, notices, integration-spec)

**Files:**
- Create: `src/tools/context-audit/walk.ts`
- Modify: `package.json` (add `ignore` to `dependencies`)
- Modify: `THIRD_PARTY_NOTICES.md` (add `ignore` block under "Runtime dependencies (npm)")
- Modify: `planning/Integration_Spec.md` (add `ignore` row to §3)
- Test: `test/context-audit/walk.test.ts`

**Interfaces:**
- Consumes: `Root` from `types.js`; `hasStructuralName` from `root.js`; `Finding` from `types.js`.
- Produces:
  - `interface WalkedDoc { relPath: string; absPath: string; content: string | null; isRoot: boolean; }` (`content` null ⇒ unreadable/binary, excluded from scoring; `isRoot` ⇒ basename is `CLAUDE.md` or `CONTEXT.md`).
  - `interface WalkResult { docs: WalkedDoc[]; findings: RawFinding[]; filesSkipped: number; }` (findings here are `symlink`, `name_collision`, `skipped` — all resolve to `info` at scoring; each carries a stable `discriminator`, and `score.ts` assigns `id`/`severity`).
  - `function walk(root: Root): WalkResult` — deterministic (entries sorted before recursion), never follows symlinks, never ascends above `root.path`.

Rules (from design §3 "The walk"):
- In scope: files whose basename ends `.md` (case-insensitive) — this already covers `AGENTS.md`/`CLAUDE.md`/`CONTEXT.md`.
- Respect `.gitignore`: load the root-level `.gitignore` (if present) into an `ignore()` instance; skip any path it matches. (v1: root `.gitignore` only; nested `.gitignore` files are a documented v1 limitation, low-risk for the routing layer.)
- Hard-skip directories regardless: `.git`, `node_modules`, `dist`, `build`, `vendor`, `.venv`, `target`, and any dotdir except `.claude` and `.github`. Also skip `.claude/commands` specifically.
- Symlinks: never follow. A symlink whose name is in scope (`.md` file) or is a directory that is not hard-skipped is recorded as a `symlink` info finding and not traversed.
- Case-insensitive collision: if one directory holds two distinct entries whose basenames collide under a structural name (possible only on a case-sensitive FS), record a `name_collision` info finding; both are still walked as docs.
- Unreadable / non-UTF-8 (binary) `.md`: record a `skipped` info finding, set `content: null`, increment `filesSkipped`.

- [ ] **Step 1: Write the failing test**

```typescript
// test/context-audit/walk.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveRoot } from "../../src/tools/context-audit/root.js";
import { walk } from "../../src/tools/context-audit/walk.js";

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "ca-walk-"));
  writeFileSync(join(dir, "CLAUDE.md"), "# root");
  mkdirSync(join(dir, "src"));
  writeFileSync(join(dir, "src", "CONTEXT.md"), "# ctx");
  writeFileSync(join(dir, "src", "notes.md"), "notes");
  mkdirSync(join(dir, "node_modules"));
  writeFileSync(join(dir, "node_modules", "pkg.md"), "should be skipped");
  writeFileSync(join(dir, ".gitignore"), "ignored.md\n");
  writeFileSync(join(dir, "ignored.md"), "gitignored");
  mkdirSync(join(dir, ".claude"));
  mkdirSync(join(dir, ".claude", "commands"));
  writeFileSync(join(dir, ".claude", "commands", "gen.md"), "generated");
  return dir;
}

test("walk collects in-scope md, honors hard-skips, .gitignore, and .claude/commands", () => {
  const dir = fixture();
  try {
    const res = walk(resolveRoot(dir));
    const rels = res.docs.map((d) => d.relPath).sort();
    assert.deepEqual(rels, ["CLAUDE.md", "src/CONTEXT.md", "src/notes.md"]);
    // node_modules, gitignored, and .claude/commands all excluded
    assert.ok(!rels.includes("ignored.md"));
    assert.ok(res.docs.find((d) => d.relPath === "CLAUDE.md")!.isRoot);
    assert.ok(res.docs.find((d) => d.relPath === "src/CONTEXT.md")!.isRoot);
    assert.ok(!res.docs.find((d) => d.relPath === "src/notes.md")!.isRoot);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("walk output is sorted and deterministic", () => {
  const dir = fixture();
  try {
    const a = walk(resolveRoot(dir)).docs.map((d) => d.relPath);
    const b = walk(resolveRoot(dir)).docs.map((d) => d.relPath);
    assert.deepEqual(a, b);
    assert.deepEqual(a, [...a].sort());
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
```

- [ ] **Step 2: Add `ignore` and run test to verify it fails**

```bash
npm install ignore
```
Run: `npm test`
Expected: FAIL — `walk.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

```typescript
// walk.ts
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import ignore from "ignore";
import { hasStructuralName } from "./root.js";
import type { Root, RawFinding } from "./types.js";

export interface WalkedDoc { relPath: string; absPath: string; content: string | null; isRoot: boolean; }
export interface WalkResult { docs: WalkedDoc[]; findings: RawFinding[]; filesSkipped: number; }

const HARD_SKIP_DIRS = new Set(["node_modules", "dist", "build", "vendor", ".venv", "target"]);
const DOT_ALLOW = new Set([".claude", ".github"]);

function info(category: RawFinding["category"], file: string, message: string, evidence: string, discriminator: string): RawFinding {
  return { category, file, line: null, message, evidence, discriminator };
}
function isRootName(basename: string): boolean {
  return hasStructuralName(basename, "CLAUDE.md") || hasStructuralName(basename, "CONTEXT.md");
}
function looksBinary(buf: Buffer): boolean {
  const n = Math.min(buf.length, 4096);
  for (let i = 0; i < n; i++) if (buf[i] === 0) return true;
  return false;
}

export function walk(root: Root): WalkResult {
  const docs: WalkedDoc[] = [];
  const findings: RawFinding[] = [];
  let filesSkipped = 0;

  const ig = ignore();
  const giPath = join(root.path, ".gitignore");
  if (existsSync(giPath)) { try { ig.add(readFileSync(giPath, "utf8")); } catch { /* unreadable .gitignore: ignore */ } }

  function rel(abs: string): string { return relative(root.path, abs).split(sep).join("/"); }

  function recurse(dir: string): void {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); }
    catch { return; } // unreadable dir: degrade, skip
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

    // detect case-insensitive structural-name collisions in this dir
    const seenLower = new Map<string, string>();
    for (const e of entries) {
      const lower = e.name.toLowerCase();
      if (isRootName(e.name) && seenLower.has(lower) && seenLower.get(lower) !== e.name) {
        findings.push(info("name_collision", rel(join(dir, e.name)), "two files collide under one structural name on a case-sensitive filesystem", e.name, rel(join(dir, e.name))));
      }
      if (isRootName(e.name)) seenLower.set(lower, e.name);
    }

    for (const e of entries) {
      const abs = join(dir, e.name);
      const relPath = rel(abs);

      if (e.isSymbolicLink()) {
        const inScope = e.name.toLowerCase().endsWith(".md") || (!HARD_SKIP_DIRS.has(e.name) && !(e.name.startsWith(".") && !DOT_ALLOW.has(e.name)));
        if (inScope) findings.push(info("symlink", relPath, "symlink encountered; recorded, not traversed", relPath, relPath));
        continue;
      }

      if (e.isDirectory()) {
        if (HARD_SKIP_DIRS.has(e.name)) continue;
        if (e.name.startsWith(".") && !DOT_ALLOW.has(e.name)) continue;
        if (relPath === ".claude/commands") continue;
        recurse(abs);
        continue;
      }

      if (!e.isFile()) continue;
      if (!e.name.toLowerCase().endsWith(".md")) continue;
      if (relPath && ig.ignores(relPath)) continue;

      let content: string | null = null;
      try {
        const buf = readFileSync(abs);
        if (looksBinary(buf)) { findings.push(info("skipped", relPath, "file is binary / non-UTF-8; excluded from scoring", "binary", relPath)); filesSkipped++; }
        else content = buf.toString("utf8");
      } catch {
        findings.push(info("skipped", relPath, "file unreadable; excluded from scoring", "unreadable", relPath)); filesSkipped++;
      }
      docs.push({ relPath, absPath: abs, content, isRoot: isRootName(e.name) });
    }
  }

  recurse(root.path);
  docs.sort((a, b) => (a.relPath < b.relPath ? -1 : a.relPath > b.relPath ? 1 : 0));
  return { docs, findings, filesSkipped };
}
```

- [ ] **Step 4: Update the dependency's obligations (rule 4, same commit)**

In `THIRD_PARTY_NOTICES.md`, under "## Runtime dependencies (npm)", replace the `> **Forthcoming:** ignore …` note with a real block:

```markdown
### ignore

- **Author:** kael (Yiyu Jia / `ignore` maintainers)
- **License:** MIT
- **Upstream:** https://github.com/kaelzhang/node-ignore
- **Pinned version:** `^<installed version from package.json>`
- **Role:** applies `.gitignore` semantics during the `context_audit` walk.
- **Modified:** No (consumed as published).
- **License text:**
​```
<paste the full MIT license text with copyright line from node_modules/ignore/LICENSE-MIT>
​```
```

In `planning/Integration_Spec.md` §3, add the row and drop the "Forthcoming: ignore" note:

```markdown
| `ignore` | MIT | `^<installed>` (`package.json`; exact pin in lockfile) | `.gitignore` semantics for the `context_audit` walk. |
```

Confirm `package.json` `dependencies.ignore` pin matches both.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (walk tests green; existing tests green).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json THIRD_PARTY_NOTICES.md planning/Integration_Spec.md \
  src/tools/context-audit/walk.ts test/context-audit/walk.test.ts
git commit -m "feat: context_audit filesystem walk; add ignore dep (+notices, integration-spec) [rule 4]"
```

---

### Task 4: Markdown link extraction + classification

**Files:**
- Create: `src/tools/context-audit/links.ts`
- Test: `test/context-audit/links.test.ts`

**Interfaces:**
- Consumes: nothing (pure string/path logic).
- Produces:
  - `type LinkKind = "edge" | "external" | "anchor" | "malformed" | "escapes_root";`
  - `interface ClassifiedLink { kind: LinkKind; targetRaw: string; targetPath: string | null; line: number; }` (`targetPath` = root-relative resolved path for `edge`; null otherwise).
  - `function extractLinks(content: string): { targetRaw: string; line: number; malformed: boolean }[]` — inline `[text](target)` links, line-numbered. (Reference-style `[text][ref]` links are out of v1 — documented limitation.)
  - `function classifyLink(raw: { targetRaw: string; line: number; malformed: boolean }, docRelPath: string): ClassifiedLink` — external (`http(s)://`, `mailto:`) and pure-anchor (`#x`) are ignored (not edges); an absolute filesystem path or a relative path resolving above the root is `escapes_root`; otherwise `edge` with a normalized root-relative `targetPath` (anchor stripped, path portion only).

Classification is root-relative math only — it never touches the filesystem (existence is Task 5's job) and never reads an escaped target.

- [ ] **Step 1: Write the failing test**

```typescript
// test/context-audit/links.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractLinks, classifyLink } from "../../src/tools/context-audit/links.js";

test("extractLinks finds inline links with line numbers and flags malformed", () => {
  const md = "intro [a](./a.md)\nline2 [b](../b.md) and [bad]( )\n";
  const links = extractLinks(md);
  assert.equal(links.length, 3);
  assert.equal(links[0].targetRaw, "./a.md");
  assert.equal(links[0].line, 1);
  assert.equal(links[1].line, 2);
  assert.equal(links.find((l) => l.targetRaw.trim() === "")!.malformed, true);
});

test("classifyLink separates edge / external / anchor / escapes_root / malformed", () => {
  const at = (raw: string, malformed = false) => classifyLink({ targetRaw: raw, line: 1, malformed }, "src/CONTEXT.md");
  assert.equal(at("./notes.md").kind, "edge");
  assert.equal(at("./notes.md").targetPath, "src/notes.md");
  assert.equal(at("planning/CONTEXT.md#routing").kind, "edge");        // anchor stripped
  assert.equal(at("planning/CONTEXT.md#routing").targetPath, "src/planning/CONTEXT.md");  // doc-relative from src/CONTEXT.md
  assert.equal(at("https://example.com").kind, "external");
  assert.equal(at("mailto:x@y.z").kind, "external");
  assert.equal(at("#section").kind, "anchor");
  assert.equal(at("../../../etc/passwd").kind, "escapes_root");        // resolves above root
  assert.equal(at("/etc/passwd").kind, "escapes_root");               // absolute
  assert.equal(at("", true).kind, "malformed");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `links.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

```typescript
// links.ts
import { posix } from "node:path";

export type LinkKind = "edge" | "external" | "anchor" | "malformed" | "escapes_root";
export interface ClassifiedLink { kind: LinkKind; targetRaw: string; targetPath: string | null; line: number; }

const LINK_RE = /\[[^\]]*\]\(([^)]*)\)/g;

export function extractLinks(content: string): { targetRaw: string; line: number; malformed: boolean }[] {
  const out: { targetRaw: string; line: number; malformed: boolean }[] = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    LINK_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = LINK_RE.exec(lines[i])) !== null) {
      const raw = m[1];
      const malformed = raw.trim() === "" || /\s/.test(raw.trim());
      out.push({ targetRaw: raw, line: i + 1, malformed });
    }
  }
  return out;
}

export function classifyLink(raw: { targetRaw: string; line: number; malformed: boolean }, docRelPath: string): ClassifiedLink {
  const base = { targetRaw: raw.targetRaw, targetPath: null, line: raw.line };
  if (raw.malformed) return { ...base, kind: "malformed" };
  const t = raw.targetRaw.trim();
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(t) || /^mailto:/i.test(t)) return { ...base, kind: "external" };
  const pathPart = t.split("#")[0];
  if (pathPart === "") return { ...base, kind: "anchor" };
  if (posix.isAbsolute(pathPart) || pathPart.startsWith("/")) return { ...base, kind: "escapes_root" };
  const docDir = posix.dirname(docRelPath);
  const resolved = posix.normalize(posix.join(docDir, pathPart));
  if (resolved === ".." || resolved.startsWith("../")) return { ...base, kind: "escapes_root" };
  return { ...base, kind: "edge", targetPath: resolved };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/context-audit/links.ts test/context-audit/links.test.ts
git commit -m "feat: context_audit markdown link extraction + classification"
```

---

### Task 5: Reference graph + graph-derived findings

**Files:**
- Create: `src/tools/context-audit/graph.ts`
- Test: `test/context-audit/graph.test.ts`

**Interfaces:**
- Consumes: `WalkResult`, `WalkedDoc` from `walk.js`; `extractLinks`, `classifyLink`, `ClassifiedLink` from `links.js`; `Root`, `Finding` from `types.js`.
- Produces:
  - `interface GraphResult { findings: RawFinding[]; routedDirs: Set<string>; orphanCount: number; orphanCandidateTotal: number; brokenRefCount: number; routingDriftCount: number; refsFromRoots: number; refsFromNonRoots: number; }` — `orphanCandidateTotal`/`refsFromRoots`/`refsFromNonRoots` are the sub-score denominators (candidates and edges actually evaluated), never raw doc totals.
  - `function buildGraph(root: Root, walk: WalkResult): GraphResult` — findings carry correct `file`/`line` per design ruling 1; ids/severity are placeholders normalized later by `score.ts`.

Finding derivation (design §3 + ruling 1). For each in-scope doc, extract+classify its links, and for each classified link:
- `malformed` → `malformed_link` finding: `file` = the doc, `line` = the link line, `evidence` = raw target.
- `escapes_root` → `escapes_root` finding: `file` = the doc, `line` = the link line, `evidence` = the escaped/absolute target (recorded, **never read**).
- `edge` → check existence on disk (`existsSync(join(root.path, targetPath))`):
  - missing + source doc `isRoot` → `routing_drift` finding (`file` = the routing doc, `line` = link line, `evidence` = missing target).
  - missing + source not a root → `broken_ref` finding (same shape).
  - exists → a real edge (for reachability). If the existing target is itself an in-scope doc, add a doc→doc edge; if it is a directory, add it to `routedDirs`; if a file, add its parent dir to `routedDirs`.
- `external` / `anchor` → ignored, no finding, no edge.

Orphans (design §4 orphan scope): candidates are in-scope docs that live under some `routedDir` (a directory a routing file references) **and** are not repo furniture and not themselves a root. Furniture denylist by basename (case-insensitive): `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `LICENSE.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, plus anything under `.github/`. Reachability = DFS from all root docs over doc→doc edges. `orphan` finding for each candidate not reached: `file` = the orphan doc, `line` = null.

- [ ] **Step 1: Write the failing test**

```typescript
// test/context-audit/graph.test.ts
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
```

> Note for the implementer: `broken_ref` vs `routing_drift` share one underlying cause (target missing) and are discriminated purely by whether the **source** doc is a routing root (`CLAUDE.md`/`CONTEXT.md`). The Step-1 fixture exercises both at once: the root `CLAUDE.md` → missing `nope.md` gives `routing_drift`; the non-root `src/notes.md` → missing `missing.md` gives `broken_ref`. No later fixture correction is needed.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `graph.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

```typescript
// graph.ts
import { existsSync } from "node:fs";
import { join } from "node:path";
import { extractLinks, classifyLink } from "./links.js";
import type { Root, RawFinding } from "./types.js";
import type { WalkResult, WalkedDoc } from "./walk.js";

export interface GraphResult {
  findings: RawFinding[];
  routedDirs: Set<string>;
  orphanCount: number;
  orphanCandidateTotal: number;   // docs eligible to be orphans (under a routed dir, non-furniture, non-root)
  brokenRefCount: number;
  routingDriftCount: number;
  refsFromRoots: number;          // classified edges existence-checked whose source doc is a root
  refsFromNonRoots: number;       // classified edges existence-checked whose source doc is not a root
}

const FURNITURE = new Set(["readme.md", "changelog.md", "contributing.md", "license.md", "security.md", "code_of_conduct.md"]);
function isFurniture(relPath: string): boolean {
  const base = relPath.split("/").pop()!.toLowerCase();
  return FURNITURE.has(base) || relPath.startsWith(".github/");
}
function f(category: RawFinding["category"], file: string, line: number | null, message: string, evidence: string, discriminator: string): RawFinding {
  return { category, file, line, message, evidence, discriminator };
}

export function buildGraph(root: Root, walkRes: WalkResult): GraphResult {
  const findings: RawFinding[] = [];
  const routedDirs = new Set<string>();
  const docByPath = new Map<string, WalkedDoc>(walkRes.docs.map((d) => [d.relPath, d]));
  const edges = new Map<string, Set<string>>();   // doc -> doc edges (in-scope targets only)
  let refsFromRoots = 0;
  let refsFromNonRoots = 0;

  for (const doc of walkRes.docs) {
    if (doc.content === null) continue;            // unreadable: excluded from scoring
    for (const raw of extractLinks(doc.content)) {
      const link = classifyLink(raw, doc.relPath);
      if (link.kind === "malformed") { findings.push(f("malformed_link", doc.relPath, link.line, "link does not parse", link.targetRaw, link.targetRaw)); continue; }
      if (link.kind === "escapes_root") { findings.push(f("escapes_root", doc.relPath, link.line, "link resolves above root or is absolute; recorded, never read", link.targetRaw, link.targetRaw)); continue; }
      if (link.kind !== "edge" || link.targetPath === null) continue;
      // a real, non-escaping edge: count it against the right denominator population
      if (doc.isRoot) refsFromRoots++; else refsFromNonRoots++;
      const targetAbs = join(root.path, link.targetPath);
      if (!existsSync(targetAbs)) {
        if (doc.isRoot) findings.push(f("routing_drift", doc.relPath, link.line, "routing file points at a path that does not exist", link.targetPath, link.targetPath));
        else findings.push(f("broken_ref", doc.relPath, link.line, "link points at a path that does not exist", link.targetPath, link.targetPath));
        continue;
      }
      // exists: record routed dir + doc->doc edge
      if (docByPath.has(link.targetPath)) {
        if (!edges.has(doc.relPath)) edges.set(doc.relPath, new Set());
        edges.get(doc.relPath)!.add(link.targetPath);
        const parent = link.targetPath.includes("/") ? link.targetPath.slice(0, link.targetPath.lastIndexOf("/")) : "";
        routedDirs.add(parent);
      } else {
        // directory or non-doc file reference
        routedDirs.add(link.targetPath.replace(/\/$/, ""));
        const parent = link.targetPath.includes("/") ? link.targetPath.slice(0, link.targetPath.lastIndexOf("/")) : link.targetPath;
        routedDirs.add(parent);
      }
    }
  }

  // reachability DFS from every root doc
  const roots = walkRes.docs.filter((d) => d.isRoot).map((d) => d.relPath);
  const reached = new Set<string>(roots);
  const stack = [...roots];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const nxt of edges.get(cur) ?? []) if (!reached.has(nxt)) { reached.add(nxt); stack.push(nxt); }
  }

  const underRoutedDir = (relPath: string): boolean => {
    for (const d of routedDirs) { if (d === "" ) { if (!relPath.includes("/")) return true; } else if (relPath === d || relPath.startsWith(d + "/")) return true; }
    return false;
  };

  let orphanCount = 0;
  let orphanCandidateTotal = 0;
  for (const doc of walkRes.docs) {
    if (doc.isRoot || doc.content === null) continue;
    if (isFurniture(doc.relPath)) continue;
    if (!underRoutedDir(doc.relPath)) continue;
    orphanCandidateTotal++;   // eligible to be an orphan: this is the denominator population
    if (!reached.has(doc.relPath)) { findings.push(f("orphan", doc.relPath, null, "in-scope doc unreachable from any routing root", doc.relPath, doc.relPath)); orphanCount++; }
  }

  return {
    findings,
    routedDirs,
    orphanCount,
    orphanCandidateTotal,
    brokenRefCount: findings.filter((x) => x.category === "broken_ref").length,
    routingDriftCount: findings.filter((x) => x.category === "routing_drift").length,
    refsFromRoots,
    refsFromNonRoots,
  };
}
```

The Step-1 fixture already exercises both categories (root `CLAUDE.md` → `routing_drift`, non-root `src/notes.md` → `broken_ref`); no fixture change is needed here.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/context-audit/graph.ts test/context-audit/graph.test.ts
git commit -m "feat: context_audit reference graph (orphan/broken_ref/routing_drift/escapes_root/malformed)"
```

---

### Task 6: Bloat sub-score (metrics real, thresholds stubbed — TBD-11)

**Files:**
- Create: `src/tools/context-audit/bloat.ts`
- Test: `test/context-audit/bloat.test.ts`

**Interfaces:**
- Consumes: `WalkResult`, `WalkedDoc` from `walk.js`; `countTokens` from `tokens.js`; `extractLinks`, `classifyLink` from `links.js`; `Finding` from `types.js`.
- Produces:
  - `interface BloatResult { subscore: number; routingTokens: number; findings: RawFinding[]; }`
  - `function scoreBloat(walk: WalkResult): BloatResult` — three metrics (routing token weight, inline-content ratio, chain depth) computed for real; cutoff constants stubbed behind `TODO: TBD-11`; findings are `bloat` category (`low` severity). Not gated (only the coverage `high` finding is gated).

Metrics:
- **routing token weight** = Σ `countTokens(content)` over routing docs (`isRoot`).
- **inline-content ratio** per routing doc = non-link characters / total characters (a router that is mostly prose/tables past a cutoff is inlining content that should be routed).
- **chain depth** = longest routing chain (root → CONTEXT.md → …) — v1 approximates via directory nesting depth of routing docs, which is stable and cheap; the exact hop-count metric is a documented v1 approximation.

- [ ] **Step 1: Write the failing test**

```typescript
// test/context-audit/bloat.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreBloat } from "../../src/tools/context-audit/bloat.js";
import type { WalkResult } from "../../src/tools/context-audit/walk.js";

function wr(docs: { relPath: string; content: string; isRoot: boolean }[]): WalkResult {
  return { docs: docs.map((d) => ({ ...d, absPath: "/x/" + d.relPath })), findings: [], filesSkipped: 0 };
}

test("routing token weight sums only routing docs; subscore in [0,100]", () => {
  const res = scoreBloat(wr([
    { relPath: "CLAUDE.md", content: "a".repeat(400), isRoot: true },   // 100 tokens
    { relPath: "src/notes.md", content: "b".repeat(4000), isRoot: false }, // not routing
  ]));
  assert.equal(res.routingTokens, 100);
  assert.ok(res.subscore >= 0 && res.subscore <= 100);
});

test("a tiny healthy router scores near 100 and emits no low finding", () => {
  const res = scoreBloat(wr([{ relPath: "CLAUDE.md", content: "[a](a.md) [b](b.md)", isRoot: true }]));
  assert.ok(res.subscore >= 90);
  assert.equal(res.findings.length, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `bloat.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

```typescript
// bloat.ts
import { countTokens } from "./tokens.js";
import { extractLinks } from "./links.js";
import type { RawFinding } from "./types.js";
import type { WalkResult } from "./walk.js";

export interface BloatResult { subscore: number; routingTokens: number; findings: RawFinding[]; }

// TODO: TBD-11 — placeholder cutoffs; calibrate from the first dogfood run.
// These are NOT resolved thresholds. char-approx-v1 tokens.
const TBD_11_ROUTING_TOKEN_CUTOFF = 4000;   // routing weight above this starts penalizing
const TBD_11_INLINE_RATIO_CUTOFF = 0.85;    // fraction of non-link chars above this = inlining
const TBD_11_DEPTH_CUTOFF = 4;              // routing nesting depth above this = deep chain

function low(file: string, message: string, evidence: string, discriminator: string): RawFinding {
  return { category: "bloat", file, line: null, message, evidence, discriminator };
}

export function scoreBloat(walk: WalkResult): BloatResult {
  const routers = walk.docs.filter((d) => d.isRoot && d.content !== null);
  const findings: RawFinding[] = [];
  let routingTokens = 0;
  let penalty = 0;

  for (const r of routers) {
    const content = r.content as string;
    const tks = countTokens(content);
    routingTokens += tks;

    const linkChars = extractLinks(content).reduce((n, l) => n + l.targetRaw.length, 0);
    const ratio = content.length === 0 ? 0 : 1 - Math.min(1, linkChars / content.length);
    if (ratio > TBD_11_INLINE_RATIO_CUTOFF && tks > 200) {   // TODO: TBD-11
      findings.push(low(r.relPath, "routing file is mostly prose/tables; consider routing content out", `inline_ratio=${ratio.toFixed(2)}`, "inline_ratio"));
      penalty += 10;
    }
    const depth = r.relPath.split("/").length - 1;
    if (depth > TBD_11_DEPTH_CUTOFF) {                        // TODO: TBD-11
      findings.push(low(r.relPath, "deep routing chain", `depth=${depth}`, "routing_chain_depth"));
      penalty += 5;
    }
  }
  if (routingTokens > TBD_11_ROUTING_TOKEN_CUTOFF) {         // TODO: TBD-11
    findings.push(low("CLAUDE.md", "total routing token weight is high", `routing_tokens=${routingTokens}`, "routing_token_weight"));
    penalty += Math.min(40, Math.floor((routingTokens - TBD_11_ROUTING_TOKEN_CUTOFF) / 1000) * 5);
  }

  const subscore = Math.max(0, 100 - penalty);
  return { subscore, routingTokens, findings };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/context-audit/bloat.ts test/context-audit/bloat.test.ts
git commit -m "feat: context_audit bloat sub-score (metrics real; thresholds stubbed TBD-11)"
```

---

### Task 7: Coverage sub-score (directory-level; significance stubbed + HIGH finding gated — TBD-12)

**Files:**
- Create: `src/tools/context-audit/coverage.ts`
- Test: `test/context-audit/coverage.test.ts`

**Interfaces:**
- Consumes: `Root`, `Finding` from `types.js`; `GraphResult` (for `routedDirs`) from `graph.js`; `WalkResult` from `walk.js`.
- Produces:
  - `interface CoverageResult { subscore: number | null; findings: RawFinding[]; }`
  - `function scoreCoverage(root: Root, walk: WalkResult, graph: GraphResult, opts?: { emitHighFindings?: boolean }): CoverageResult` — reads the **directory tree only** (existence/paths), never opens a source file. Significance classification + thresholds stubbed behind `TODO: TBD-12`. The `high`-severity uncovered-significant-workspace `coverage` finding is emitted **only** when `opts.emitHighFindings === true`; default off (the build guard). `subscore` floors to `0` when no root `CLAUDE.md` exists; returns `null` (N/A) when there are no significant directories to judge.

Coverage: a significant source directory has coverage if it contains a `CONTEXT.md` or is a `routedDir` (referenced by a routing file within N hops). Significance (source-vs-config, min file count, N) is stubbed.

- [ ] **Step 1: Write the failing test**

```typescript
// test/context-audit/coverage.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveRoot } from "../../src/tools/context-audit/root.js";
import { walk } from "../../src/tools/context-audit/walk.js";
import { buildGraph } from "../../src/tools/context-audit/graph.js";
import { scoreCoverage } from "../../src/tools/context-audit/coverage.js";

function run(dir: string, emitHighFindings = false) {
  const root = resolveRoot(dir);
  const w = walk(root);
  const g = buildGraph(root, w);
  return scoreCoverage(root, w, g, { emitHighFindings });
}

test("HIGH uncovered-workspace finding is gated: default off (TBD-12 build guard)", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-cov-"));
  try {
    writeFileSync(join(dir, "CLAUDE.md"), "# root, references nothing\n");
    mkdirSync(join(dir, "src"));
    for (let i = 0; i < 8; i++) writeFileSync(join(dir, "src", `f${i}.ts`), "x");   // uncovered significant dir
    const off = run(dir, false);
    assert.equal(off.findings.filter((f) => f.severity === "high").length, 0);       // gated: must not fire
    const on = run(dir, true);
    assert.ok(on.findings.some((f) => f.category === "coverage" && f.severity === "high"));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("coverage subscore floors to 0 when no root CLAUDE.md", () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-cov2-"));
  try {
    mkdirSync(join(dir, ".git"));                 // git root, no CLAUDE.md
    mkdirSync(join(dir, "src"));
    for (let i = 0; i < 8; i++) writeFileSync(join(dir, "src", `f${i}.ts`), "x");
    assert.equal(run(dir).subscore, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `coverage.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

```typescript
// coverage.ts
import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { Root, RawFinding } from "./types.js";
import type { WalkResult } from "./walk.js";
import type { GraphResult } from "./graph.js";

export interface CoverageResult { subscore: number | null; findings: RawFinding[]; }

const HARD_SKIP = new Set(["node_modules", "dist", "build", "vendor", ".venv", "target", ".git"]);

// TODO: TBD-12 — significance classification + thresholds are stubbed; calibrate from the first dogfood run.
const TBD_12_MIN_FILES = 5;                 // "significant" = at least this many files
const TBD_12_SOURCE_EXTS = [".ts", ".js", ".tsx", ".jsx", ".py", ".go", ".rs", ".java", ".rb"]; // provisional

function listDirs(rootPath: string): { rel: string; fileCount: number; hasContext: boolean }[] {
  const out: { rel: string; fileCount: number; hasContext: boolean }[] = [];
  function rec(abs: string): void {
    let entries;
    try { entries = readdirSync(abs, { withFileTypes: true }); } catch { return; }
    let fileCount = 0; let hasContext = false;
    for (const e of entries) {
      if (e.isFile()) {
        fileCount++;
        if (e.name.toLowerCase() === "context.md") hasContext = true;
      }
    }
    const rel = relative(rootPath, abs).split(sep).join("/");
    if (rel !== "") out.push({ rel, fileCount, hasContext });
    for (const e of entries) {
      if (e.isDirectory() && !e.isSymbolicLink() && !HARD_SKIP.has(e.name) && !(e.name.startsWith(".") && e.name !== ".github")) rec(join(abs, e.name));
    }
  }
  rec(rootPath);
  return out;
}

function isSignificant(dir: { rel: string; fileCount: number }, rootPath: string): boolean {
  // TODO: TBD-12 — provisional: a directory with >= MIN_FILES source files.
  try {
    const src = readdirSync(join(rootPath, dir.rel), { withFileTypes: true })
      .filter((e) => e.isFile() && TBD_12_SOURCE_EXTS.some((x) => e.name.toLowerCase().endsWith(x))).length;
    return src >= TBD_12_MIN_FILES;
  } catch { return false; }
}

export function scoreCoverage(root: Root, _walk: WalkResult, graph: GraphResult, opts?: { emitHighFindings?: boolean }): CoverageResult {
  const noClaudeRoot = root.method !== "claude_md";
  const dirs = listDirs(root.path).filter((d) => isSignificant(d, root.path));
  const findings: RawFinding[] = [];

  if (dirs.length === 0) return { subscore: noClaudeRoot ? 0 : null, findings };

  let covered = 0;
  for (const d of dirs) {
    const isCovered = d.hasContext || graph.routedDirs.has(d.rel) || [...graph.routedDirs].some((r) => r !== "" && d.rel.startsWith(r + "/"));
    if (isCovered) { covered++; continue; }
    // uncovered significant workspace -> HIGH, gated behind TBD-12 build guard
    if (opts?.emitHighFindings) {   // TODO: TBD-12 — do not enable until calibrated
      findings.push({ category: "coverage", file: d.rel + "/", line: null, message: "significant source directory has no routing coverage", evidence: `files=${d.fileCount}`, discriminator: d.rel + "/" });
    }
  }
  const subscore = noClaudeRoot ? 0 : Math.round((covered / dirs.length) * 100);
  return { subscore, findings };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/context-audit/coverage.ts test/context-audit/coverage.test.ts
git commit -m "feat: context_audit coverage sub-score (dir-level; significance + high finding gated TBD-12)"
```

---

### Task 8: Scoring — finding ids, severity normalization, headline weighting (TBD-10)

**Files:**
- Create: `src/tools/context-audit/score.ts`
- Test: `test/context-audit/score.test.ts`

**Interfaces:**
- Consumes: `Finding`, `Severity`, `FindingCategory`, `Subscores` from `types.js`.
- Produces:
  - `function findingId(category: FindingCategory, normalizedPath: string, discriminator: string): string` — `sha256(category + "\0" + normalizedPath + "\0" + discriminator)` hex, first 12 chars. Never includes a measured value.
  - `const SEVERITY_BY_CATEGORY: Record<FindingCategory, Severity>` — the design §4 mapping (authoritative; `root_empty` → `critical`, see the flagged discrepancy in Global Constraints).
  - `function normalizeFindings(raw: RawFinding[]): Finding[]` — derives `severity` from the category map, hashes `id` from `(category, file, discriminator)` (never from the moving `evidence`), **strips `discriminator`** so the public `Finding` keeps only the design's seven fields, and returns findings sorted by `(severity-rank desc, file, line, category)`.
  - `function subscoreFromCount(bad: number, total: number): number` — `total <= 0 ? 100 : Math.round(100 * (1 - bad / total))`.
  - `function headlineScore(subscores: Subscores): number` — weighted mean, **weights stubbed** `TODO: TBD-10` (accuracy cluster above bloat); `null` sub-scores dropped and weights renormalized.

- [ ] **Step 1: Write the failing test**

```typescript
// test/context-audit/score.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { findingId, normalizeFindings, subscoreFromCount, headlineScore, SEVERITY_BY_CATEGORY } from "../../src/tools/context-audit/score.js";
import type { RawFinding } from "../../src/tools/context-audit/types.js";

test("finding id is stable across runs and independent of measured values", () => {
  assert.equal(findingId("broken_ref", "src/CONTEXT.md", "missing.md"), findingId("broken_ref", "src/CONTEXT.md", "missing.md"));
  assert.notEqual(findingId("broken_ref", "src/CONTEXT.md", "a.md"), findingId("broken_ref", "src/CONTEXT.md", "b.md"));
});

test("severity mapping matches design §4 (root_empty critical; broken_ref high; orphan medium)", () => {
  assert.equal(SEVERITY_BY_CATEGORY.root_empty, "critical");
  assert.equal(SEVERITY_BY_CATEGORY.root_absent, "critical");
  assert.equal(SEVERITY_BY_CATEGORY.broken_ref, "high");
  assert.equal(SEVERITY_BY_CATEGORY.routing_drift, "high");
  assert.equal(SEVERITY_BY_CATEGORY.orphan, "medium");
  assert.equal(SEVERITY_BY_CATEGORY.escapes_root, "medium");
  assert.equal(SEVERITY_BY_CATEGORY.malformed_link, "low");
});

test("subscoreFromCount and headline drop N/A sub-scores", () => {
  assert.equal(subscoreFromCount(0, 0), 100);
  assert.equal(subscoreFromCount(1, 4), 75);
  const s = headlineScore({ bloat: 80, orphans: 100, broken_refs: 100, routing_drift: 100, coverage: null });
  assert.ok(s > 80 && s <= 100);   // coverage null dropped; accuracy cluster near-perfect
});

test("normalizeFindings assigns ids and sorts by severity", () => {
  const raw: RawFinding[] = [
    { category: "orphan", file: "b.md", line: null, message: "", evidence: "b.md", discriminator: "b.md" },
    { category: "broken_ref", file: "a.md", line: 3, message: "", evidence: "x.md", discriminator: "x.md" },
  ];
  const out = normalizeFindings(raw);
  assert.equal(out[0].category, "broken_ref");   // high sorts before medium
  assert.ok(out.every((f) => f.id.length === 12));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `score.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

```typescript
// score.ts
import { createHash } from "node:crypto";
import type { Finding, RawFinding, FindingCategory, Severity, Subscores } from "./types.js";

export function findingId(category: FindingCategory, normalizedPath: string, discriminator: string): string {
  return createHash("sha256").update(`${category}\0${normalizedPath}\0${discriminator}`).digest("hex").slice(0, 12);
}

export const SEVERITY_BY_CATEGORY: Record<FindingCategory, Severity> = {
  root_absent: "critical", root_empty: "critical",   // design §4 (flagged: §3 says empty=high)
  broken_ref: "high", routing_drift: "high", coverage: "high",
  orphan: "medium", escapes_root: "medium",
  malformed_link: "low", bloat: "low",
  name_collision: "info", symlink: "info", skipped: "info",
};

const RANK: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };

export function normalizeFindings(raw: RawFinding[]): Finding[] {
  const out: Finding[] = raw.map((x) => ({
    id: findingId(x.category, x.file, x.discriminator),   // stable key, never the measured evidence
    category: x.category,
    severity: SEVERITY_BY_CATEGORY[x.category],
    file: x.file,
    line: x.line,
    message: x.message,
    evidence: x.evidence,
  }));
  out.sort((a, b) =>
    RANK[b.severity] - RANK[a.severity] ||
    (a.file < b.file ? -1 : a.file > b.file ? 1 : 0) ||
    ((a.line ?? -1) - (b.line ?? -1)) ||
    (a.category < b.category ? -1 : a.category > b.category ? 1 : 0));
  return out;
}

export function subscoreFromCount(bad: number, total: number): number {
  return total <= 0 ? 100 : Math.round(100 * (1 - bad / total));
}

// TODO: TBD-10 — placeholder weights; calibrate from the first dogfood run.
// Principle (resolved): accuracy cluster weighted above bloat; N/A sub-score drops and reweights.
const TBD_10_WEIGHTS: Record<keyof Subscores, number> = {
  broken_refs: 3, routing_drift: 3, orphans: 2, coverage: 2, bloat: 1,
};

export function headlineScore(subscores: Subscores): number {
  let weighted = 0, weightSum = 0;
  for (const key of Object.keys(TBD_10_WEIGHTS) as (keyof Subscores)[]) {
    const v = subscores[key];
    if (v === null || v === undefined) continue;   // N/A dropped, weights renormalize
    weighted += v * TBD_10_WEIGHTS[key];
    weightSum += TBD_10_WEIGHTS[key];
  }
  return weightSum === 0 ? 0 : Math.round(weighted / weightSum);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/context-audit/score.ts test/context-audit/score.test.ts
git commit -m "feat: context_audit scoring — finding ids, severity map, headline weighting (stubbed TBD-10)"
```

---

### Task 9: Renderer — the `rendered` markdown

**Files:**
- Create: `src/tools/context-audit/render.ts`
- Test: `test/context-audit/render.test.ts`

**Interfaces:**
- Consumes: `AuditResult` from `types.js`.
- Produces: `function renderAudit(result: Omit<AuditResult, "rendered">): string` — deterministic markdown built entirely from the object. Must include: the resolved root + method (with a one-line weaker-claim note when method ≠ `claude_md`), the headline score, a sub-scores table (N/A shown for `null`), findings grouped by severity (id, file:line, message, evidence), the stats block (`docs_in_scope`, `routing_files`, `routing_tokens`, `files_skipped`, `token_count_method`), the mandatory disclaimer that `coverage` measures whether the routing layer **claims** the code, not whether the claim is **accurate** (that is `doc_drift`'s job), and — when `stats.calibrated === false` — an "uncalibrated (TBD-10/11/12)" note.

- [ ] **Step 1: Write the failing test**

```typescript
// test/context-audit/render.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderAudit } from "../../src/tools/context-audit/render.js";
import type { AuditResult } from "../../src/tools/context-audit/types.js";

const base: Omit<AuditResult, "rendered"> = {
  root: { path: "/repo", method: "given_path" },
  score: 72,
  subscores: { bloat: 80, orphans: 100, broken_refs: 50, routing_drift: 100, coverage: null },
  findings: [{ id: "abc123abc123", category: "broken_ref", severity: "high", file: "src/CONTEXT.md", line: 4, message: "link points at a path that does not exist", evidence: "missing.md" }],
  stats: { docs_in_scope: 3, routing_files: 2, routing_tokens: 120, orphan_count: 0, files_skipped: 0, token_count_method: "char-approx-v1", calibrated: false },
};

test("renderer emits score, weaker-claim note, coverage disclaimer, and uncalibrated note", () => {
  const md = renderAudit(base);
  assert.match(md, /72/);
  assert.match(md, /given_path/);
  assert.match(md, /accuracy|claims the code|doc_drift/i);   // coverage disclaimer present
  assert.match(md, /uncalibrated|TBD-1[012]/i);
  assert.match(md, /broken_ref/);
  assert.match(md, /N\/A/);                                   // coverage null shown as N/A
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `render.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

```typescript
// render.ts
import type { AuditResult, Finding, Severity } from "./types.js";

const ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];

export function renderAudit(result: Omit<AuditResult, "rendered">): string {
  const { root, score, subscores, findings, stats } = result;
  const lines: string[] = [];
  lines.push(`# context_audit — routing health`);
  lines.push("");
  lines.push(`**Score:** ${score}/100${stats.calibrated ? "" : "  _(uncalibrated — TBD-10/11/12 stubs active; not a published figure)_"}`);
  lines.push(`**Root:** \`${root.path}\` (resolved via \`${root.method}\`)`);
  if (root.method !== "claude_md") lines.push(`> Weaker claim: no root \`CLAUDE.md\` anchored this audit; resolved via \`${root.method}\`.`);
  lines.push("");
  lines.push(`| sub-score | value |`);
  lines.push(`|---|---|`);
  for (const [k, v] of Object.entries(subscores)) lines.push(`| ${k} | ${v === null ? "N/A" : v} |`);
  lines.push("");
  for (const sev of ORDER) {
    const group = findings.filter((f) => f.severity === sev);
    if (group.length === 0) continue;
    lines.push(`## ${sev} (${group.length})`);
    for (const f of group) lines.push(`- \`${f.id}\` **${f.category}** ${f.file}${f.line !== null ? ":" + f.line : ""} — ${f.message} _(evidence: ${f.evidence})_`);
    lines.push("");
  }
  lines.push(`## stats`);
  lines.push(`- docs_in_scope: ${stats.docs_in_scope}, routing_files: ${stats.routing_files}, routing_tokens: ${stats.routing_tokens}`);
  lines.push(`- files_skipped: ${stats.files_skipped}, token_count_method: \`${stats.token_count_method}\``);
  lines.push("");
  lines.push(`> \`coverage\` measures whether the routing layer **claims** your code, not whether the claim is **accurate** — content accuracy is \`doc_drift\`'s job.`);
  return lines.join("\n");
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/context-audit/render.ts test/context-audit/render.test.ts
git commit -m "feat: context_audit renderer (tool-owned markdown summary)"
```

---

### Task 10: Orchestrator + tool definition (`index.ts`)

**Files:**
- Create: `src/tools/context-audit/index.ts`
- Test: `test/context-audit/orchestrate.test.ts`

**Interfaces:**
- Consumes: every module above.
- Produces:
  - `const contextAuditTool: { name: "context_audit"; description: string; inputSchema: object; outputSchema: object }` — description written as an offer (not a definition); `inputSchema` = optional `path` string, `additionalProperties: false`; `outputSchema` mirrors `AuditResult`.
  - `async function runContextAudit(args: { path?: string }): Promise<{ ok: true; result: AuditResult } | { ok: false; error: { code: string; message: string; detail?: string } }>` — orchestrates resolve → walk → graph → bloat → coverage → score → render; assembles `AuditResult`; `stats.calibrated = false`; **degrade never abort** on mid-walk trouble; maps `RootTargetError` to the `NO_ROUTING_ROOT` structured error. Never leaks a path outside the working tree or any infra detail.
  - `function toCallToolResult(outcome): { content: {type:"text"; text:string}[]; structuredContent?: AuditResult; isError?: boolean }` — success: `content` = `[{type:"text", text: result.rendered}]`, `structuredContent` = the full `AuditResult`; error: `content` = `[{type:"text", text: JSON.stringify({error})}]`, `isError: true`, no `structuredContent`.

Orchestration wires each sub-score to the population it is drawn from, via `subscoreFromCount`: `orphans` = `graph.orphanCount` over `graph.orphanCandidateTotal`; `broken_refs` = `graph.brokenRefCount` over `graph.refsFromNonRoots` (edges checked from non-root docs); `routing_drift` = `graph.routingDriftCount` over `graph.refsFromRoots` (edges checked from root docs); `bloat` from `scoreBloat`; `coverage` from `scoreCoverage` (default gated — `emitHighFindings` off). The empty/absent-root findings (`root_empty` critical only when a root `CLAUDE.md` exists, was read, and is blank; `root_absent` critical when method ≠ `claude_md`) are appended before `normalizeFindings`. Denominators are never `Math.max`-patched against unrelated doc counts — a `broken_ref`/`routing_drift` sub-score reflects the fraction of *references* that are broken, nothing else.

**Rule-8 / rule-2 timing (why `src/API.md` and the ledger are not touched here).** This task commits the tool *definition* (`contextAuditTool` with its `inputSchema`/`outputSchema`) but deliberately does **not** edit `src/API.md` or the context-budget ledger. The schema is not part of the *served* MCP surface until `server.ts` registers it (Task 11), so `src/API.md` (rule 8) and the ledger (rule 2) correctly bind to the **registration** commit; documenting the tool here would describe a surface `tools/list` does not yet serve. `/handoff` and reviewers should read the Task 11 commit as the schema-landing commit.

- [ ] **Step 1: Write the failing test**

```typescript
// test/context-audit/orchestrate.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runContextAudit, toCallToolResult, contextAuditTool } from "../../src/tools/context-audit/index.js";

test("tool definition shape: name, optional path, outputSchema", () => {
  assert.equal(contextAuditTool.name, "context_audit");
  assert.equal((contextAuditTool.inputSchema as any).properties.path.type, "string");
  assert.equal((contextAuditTool.inputSchema as any).additionalProperties, false);
  assert.ok(contextAuditTool.outputSchema);
});

test("runs end-to-end on a real fixture and returns structuredContent + rendered text", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ca-e2e-"));
  try {
    writeFileSync(join(dir, "CLAUDE.md"), "root [ctx](src/CONTEXT.md) [gone](missing.md)\n");
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "src", "CONTEXT.md"), "leaf\n");
    const outcome = await runContextAudit({ path: dir });
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.result.root.method, "claude_md");
    assert.ok(outcome.result.findings.some((f) => f.category === "routing_drift"));  // missing.md
    assert.equal(outcome.result.stats.calibrated, false);
    const call = toCallToolResult(outcome);
    assert.equal(call.content[0].type, "text");
    assert.equal(call.content[0].text, outcome.result.rendered);
    assert.deepEqual(call.structuredContent, outcome.result);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("missing target yields NO_ROUTING_ROOT structured error, no structuredContent", async () => {
  const outcome = await runContextAudit({ path: join(tmpdir(), "does-not-exist-" + "zzz") });
  assert.equal(outcome.ok, false);
  if (outcome.ok) return;
  assert.equal(outcome.error.code, "NO_ROUTING_ROOT");
  const call = toCallToolResult(outcome);
  assert.equal(call.isError, true);
  assert.equal(call.structuredContent, undefined);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `index.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

```typescript
// index.ts
import { resolveRoot, RootTargetError } from "./root.js";
import { walk } from "./walk.js";
import { buildGraph } from "./graph.js";
import { scoreBloat } from "./bloat.js";
import { scoreCoverage } from "./coverage.js";
import { normalizeFindings, subscoreFromCount, headlineScore } from "./score.js";
import { renderAudit } from "./render.js";
import { TOKEN_METHOD } from "./tokens.js";
import type { AuditResult, RawFinding, Subscores } from "./types.js";

export const contextAuditTool = {
  name: "context_audit" as const,
  description:
    "Audit this repo's CLAUDE.md/CONTEXT.md routing layer. Reads your real files locally (never writes, never reads source contents) and returns a scored, unfakeable diagnosis of routing bloat, orphan docs, broken references, routing drift, and coverage gaps. Point it at a path or let it default to the working directory.",
  inputSchema: {
    type: "object",
    properties: { path: { type: "string", description: "Directory to audit; defaults to the server working directory." } },
    additionalProperties: false,
  },
  outputSchema: {
    type: "object",
    required: ["root", "score", "subscores", "findings", "stats", "rendered"],
    properties: {
      root: { type: "object", required: ["path", "method"], properties: { path: { type: "string" }, method: { enum: ["claude_md", "git_root", "given_path"] } } },
      score: { type: "number" },
      subscores: { type: "object" },
      findings: { type: "array", items: { type: "object" } },
      stats: { type: "object" },
      rendered: { type: "string" },
    },
    additionalProperties: false,
  },
};

type Outcome =
  | { ok: true; result: AuditResult }
  | { ok: false; error: { code: string; message: string; detail?: string } };

export async function runContextAudit(args: { path?: string }): Promise<Outcome> {
  let root;
  try { root = resolveRoot(args.path ?? process.cwd()); }
  catch (e) {
    if (e instanceof RootTargetError) return { ok: false, error: { code: e.code, message: e.message, detail: e.detail } };
    return { ok: false, error: { code: "AUDIT_FAILED", message: "audit could not start" } };
  }

  const w = walk(root);
  const g = buildGraph(root, w);
  const bloat = scoreBloat(w);
  const coverage = scoreCoverage(root, w, g);   // emitHighFindings defaults off (TBD-12 build guard)

  const rawFindings: RawFinding[] = [...w.findings, ...g.findings, ...bloat.findings, ...coverage.findings];

  // root_absent / root_empty (both critical per design §4; §3-vs-§4 severity discrepancy flagged in Global Constraints)
  if (root.method !== "claude_md") {
    rawFindings.push({ category: "root_absent", file: ".", line: null, message: "no root CLAUDE.md anchored this audit", evidence: root.method, discriminator: "root_absent" });
  } else {
    const claudeDoc = w.docs.find((d) => d.relPath.toLowerCase() === "claude.md");
    // "empty" only when the root was actually read; a binary/unreadable root is a `skipped` info finding from the walk, not empty.
    if (claudeDoc && claudeDoc.content !== null && claudeDoc.content.trim() === "") {
      rawFindings.push({ category: "root_empty", file: claudeDoc.relPath, line: null, message: "root CLAUDE.md exists but is empty", evidence: "empty", discriminator: "root_empty" });
    }
  }

  const subscores: Subscores = {
    bloat: bloat.subscore,
    // each sub-score's denominator is the population it is drawn from; subscoreFromCount returns 100 when that population is 0.
    orphans: subscoreFromCount(g.orphanCount, g.orphanCandidateTotal),
    broken_refs: subscoreFromCount(g.brokenRefCount, g.refsFromNonRoots),
    routing_drift: subscoreFromCount(g.routingDriftCount, g.refsFromRoots),
    coverage: coverage.subscore,
  };

  const findings = normalizeFindings(rawFindings);
  const score = headlineScore(subscores);
  const stats = {
    docs_in_scope: w.docs.length,
    routing_files: w.docs.filter((d) => d.isRoot).length,
    routing_tokens: bloat.routingTokens,
    orphan_count: g.orphanCount,
    files_skipped: w.filesSkipped,
    token_count_method: TOKEN_METHOD,
    calibrated: false,
  };
  const rendered = renderAudit({ root, score, subscores, findings, stats });
  return { ok: true, result: { root, score, subscores, findings, stats, rendered } };
}

export function toCallToolResult(outcome: Outcome) {
  if (outcome.ok) return { content: [{ type: "text" as const, text: outcome.result.rendered }], structuredContent: outcome.result };
  return { content: [{ type: "text" as const, text: JSON.stringify({ error: outcome.error }) }], isError: true };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/context-audit/index.ts test/context-audit/orchestrate.test.ts
git commit -m "feat: context_audit orchestrator + tool definition (structuredContent + rendered)"
```

---

### Task 11: Register in server; API.md; context-budget ledger; SDK floor (same-commit rules 8, 2, 4)

**Files:**
- Modify: `src/server.ts` (register `context_audit` on `ListTools` + `CallTool`)
- Modify: `test/server.test.ts` (now expects one tool)
- Modify: `test/packaging.test.ts` (installed bin lists one tool)
- Modify: `src/API.md` (full `context_audit` schema + invariants — rule 8)
- Modify: `src/CONTEXT.md` (context-budget ledger row + measurement method — rule 2)
- Modify: `package.json` (raise SDK floor if needed for `structuredContent`/`outputSchema`)
- Modify: `THIRD_PARTY_NOTICES.md` + `planning/Integration_Spec.md` §3 (SDK version note, if floor changed — rule 4)
- Create: `test/context-audit/ledger.test.ts` (asserts standing tool-definition token cost < 4000)

**Interfaces:**
- Consumes: `contextAuditTool`, `runContextAudit`, `toCallToolResult` from `tools/context-audit/index.js`.
- Produces: updated `createServer()` registering `ListToolsRequestSchema` → `{ tools: [contextAuditTool] }` and `CallToolRequestSchema` → dispatch on `name`.

- [ ] **Step 1: Update the failing tests first (server now serves one tool)**

```typescript
// test/server.test.ts — replace the zero-tools assertion
const { tools } = await client.listTools();
assert.equal(tools.length, 1);
assert.equal(tools[0].name, "context_audit");
```

Add an end-to-end call test in `test/server.test.ts`:

```typescript
test("server calls context_audit over stdio and returns rendered + structuredContent", async () => {
  const transport = new StdioClientTransport({ command: "node", args: ["dist/src/index.js"] });
  const client = new Client({ name: "b-a-mcp-test", version: "0.0.0" }, { capabilities: {} });
  await client.connect(transport);
  const res: any = await client.callTool({ name: "context_audit", arguments: { path: process.cwd() } });
  assert.ok(res.structuredContent, "structuredContent present");
  assert.equal(typeof res.structuredContent.score, "number");
  assert.equal(res.content[0].text, res.structuredContent.rendered);
  await client.close();
});
```

In `test/packaging.test.ts`, change the installed-bin assertion from `assert.deepEqual(tools, [])` to:

```typescript
assert.equal(tools.length, 1);
assert.equal(tools[0].name, "context_audit");
```

Add `test/context-audit/ledger.test.ts`:

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { contextAuditTool } from "../../src/tools/context-audit/index.js";
import { countTokens } from "../../src/tools/context-audit/tokens.js";

test("standing tool-definition cost is under the ~4000-token budget (rule 2)", () => {
  const standing = countTokens(JSON.stringify(contextAuditTool));
  assert.ok(standing < 4000, `tool definition standing cost ${standing} exceeds 4000`);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `server.ts` still returns `{ tools: [] }` and has no `CallTool` handler; ledger test may pass but server/packaging fail.

- [ ] **Step 3: Register the tool in `server.ts`**

```typescript
// server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { contextAuditTool, runContextAudit, toCallToolResult } from "./tools/context-audit/index.js";

export function createServer(): Server {
  const server = new Server(
    { name: "b-a-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [contextAuditTool] }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    if (req.params.name === contextAuditTool.name) {
      return toCallToolResult(await runContextAudit((req.params.arguments ?? {}) as { path?: string }));
    }
    return { content: [{ type: "text", text: JSON.stringify({ error: { code: "UNKNOWN_TOOL", message: `unknown tool: ${req.params.name}` } }) }], isError: true };
  });

  return server;
}
```

- [ ] **Step 4: Verify SDK floor, then update `package.json` + notices/spec if raised**

The installed SDK is `1.30.0` — well past `1.13.0`, which introduced `structuredContent`/`outputSchema` for spec rev `2025-06-18` — so the types compile with no reinstall. Raise the `dependencies["@modelcontextprotocol/sdk"]` floor from `^1.0.0` to `^1.30.0` (the installed version; the true minimum is `1.13.0`) and update the SDK **Pinned version** note in `THIRD_PARTY_NOTICES.md` and the SDK row in `Integration_Spec.md` §3 in this same commit (rule 4). Note: `server.ts` uses the low-level `Server.setRequestHandler`, which does **not** validate `structuredContent` against `outputSchema` server-side — `outputSchema` is advisory in `tools/list`, and the error path (no `structuredContent`, `isError: true`) is safe. Confirm the resolved version with `npm ls @modelcontextprotocol/sdk`.

- [ ] **Step 5: Update `src/API.md` (rule 8) and `src/CONTEXT.md` ledger (rule 2)**

In `src/API.md`, move `context_audit` from "intended" to a documented tool: input schema (optional `path`), the full output JSON schema (`root`/`score`/`subscores`/`findings`/`stats`/`rendered`), the `NO_ROUTING_ROOT` error, the result shape (`structuredContent` + `rendered` text block), and the per-tool invariants (read-only · never above root · never follows symlinks · stateless/no-cache · tool owns rendering · stable severity scale · normalized ordering).

In `src/CONTEXT.md`, replace the "— none —" ledger row and set the measurement method:

```markdown
| Tool | Standing tokens (measured) | Notes |
|------|------------------------------|-------|
| context_audit | <measured> / ~4000 | char-approx-v1 over JSON.stringify(tool definition) |

**Total: <measured> / ~4000**

**Measurement method:** `countTokens(JSON.stringify(contextAuditTool))` using char-approx-v1 (chars/4) over the serialized tool definition (name + description + input/output schema) sent in `tools/list`. Reproduced by `test/context-audit/ledger.test.ts`.
```

Fill `<measured>` from the number the ledger test computes (run it and read the value).

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — server lists + calls `context_audit`; packaging lists one tool; ledger under budget; all prior tests green.

- [ ] **Step 7: Commit** (single commit — schema + API.md + ledger + SDK floor bound together)

```bash
git add src/server.ts test/server.test.ts test/packaging.test.ts src/API.md src/CONTEXT.md \
  test/context-audit/ledger.test.ts package.json package-lock.json THIRD_PARTY_NOTICES.md planning/Integration_Spec.md
git commit -m "feat: register context_audit; API.md schema, context-budget ledger, SDK floor [rules 8,2,4]"
```

---

### Task 12: Calibration dogfood run (not the README run)

**Files:**
- Create: `planning/calibration/2026-08-18_context-audit-run-1.md` (raw run + calibration notes)

**Interfaces:**
- Consumes: the built server.
- Produces: a recorded first-run against `B-A-MCP` itself, with the readings TBD-10/11/12 need.

This is the design's mandated **calibration run**, explicitly **not** the README sample. It proves the tool end-to-end on a real repo and captures the numbers to set the stubbed thresholds. No README is written here; no threshold constant is changed here (that is a follow-up decision-resolution loop).

- [ ] **Step 1: Build and run against this repo**

```bash
npm run build
node -e "import('./dist/src/tools/context-audit/index.js').then(async m => { const o = await m.runContextAudit({ path: process.cwd() }); console.log(JSON.stringify(o.ok ? o.result : o.error, null, 2)); })"
```

- [ ] **Step 2: Record the run and the calibration readings**

Write `planning/calibration/2026-08-18_context-audit-run-1.md` containing: the full JSON result, and — for each of TBD-10/11/12 — the observed raw metric values on `B-A-MCP` (routing token weight, inline ratios, chain depth, significant-dir list + coverage) and a proposed threshold, flagged "proposed, not resolved". State in the file that the `rendered` output is NOT the README sample and that the README waits for the post-calibration re-run.

- [ ] **Step 3: Confirm invariants held on the real run**

Verify from the JSON: `root.method === "claude_md"`; no `high`-severity `coverage` finding fired (gate held — TBD-12); `stats.calibrated === false`; `stats.token_count_method === "char-approx-v1"`; no path above the repo root appears in any finding.

- [ ] **Step 4: Commit**

```bash
git add planning/calibration/2026-08-18_context-audit-run-1.md
git commit -m "docs: context_audit calibration run 1 (TBD-10/11/12 readings; not the README sample)"
```

---

## Post-plan: finishing the branch

After Task 12, run the code reviewers (`superpowers:requesting-code-review`) over the branch, address findings, then `superpowers:finishing-a-development-branch` (PR `feat/context-audit` → `main`, per WORKFLOW.md — no direct commits to `main`). The `/handoff` gate (separate) regenerates `.claude/commands/`, updates `SESSION_HANDOFF.md`, and re-verifies the four same-commit bindings. Threshold resolution for TBD-10/11/12 (turning the calibration readings into resolved constants + `planning/decisions/` records) and the README sample are a **separate follow-up loop**, not part of this build.

## Self-Review

**Spec coverage** — every design §3/§4 element maps to a task: root resolution (T2), walk/scope/gitignore/hard-skip/symlink/case-insensitive (T3), link graph + orphan/broken_ref/routing_drift/malformed/escapes_root (T4–T5), bloat metrics + TBD-11 (T6), coverage + TBD-12 gate (T7), severity enum + finding id + TBD-10 weighting (T8), tool-owned rendering + coverage disclaimer (T9), input/output schema + result shape + NO_ROUTING_ROOT + degrade-never-abort (T10), registration + API.md + ledger + SDK floor (T11), calibration sequencing (T12). Docs-affected (§5): API.md/CONTEXT.md/notices/Integration_Spec all land in their rule-bound commits; README + prompts/handoff.md + planning/decisions are correctly deferred (design §5 assigns them to the release/handoff, not the build).

**Placeholder scan** — the only `TODO:` markers are the three mandated TBD stubs (`TBD-10/11/12`), each with real computed machinery behind them; no "implement later" gaps.

**Type consistency** — `Finding` (public, 7 fields) and `RawFinding` (internal, with `discriminator`) are defined once in `types.ts` (T1); every findings-producer (walk T3, graph T5, bloat T6, coverage T7, the root_absent/root_empty pushes T10) returns `RawFinding`, and `normalizeFindings` (T8) is the sole `RawFinding[] → Finding[]` boundary — it hashes `id` from `discriminator` and strips it. `Subscores`/`AuditResult`/`Root` consumed unchanged downstream; `WalkResult`/`WalkedDoc` (T3), `GraphResult` (T5, now carrying `orphanCandidateTotal`/`refsFromRoots`/`refsFromNonRoots` as the sub-score denominators), `BloatResult` (T6), `CoverageResult` (T7) names are stable across consumers; `contextAuditTool`/`runContextAudit`/`toCallToolResult` names match between T10 (definition) and T11 (registration). Post-review fixes applied: sub-score denominators (B1), Task-4 doc-relative target assertion (B2), stable `discriminator`-based finding `id` (B3), corrected Task-5 fixture (SF4), rule-8 timing rationale (SF5), tightened orphan denominator (SF6).
