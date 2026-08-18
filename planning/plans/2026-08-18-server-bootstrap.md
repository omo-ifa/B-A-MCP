# server-bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an installable, `npx`-runnable stdio MCP server that registers **zero tools**, and repair the scaffold-debt docs so the first real tool (`context_audit`) builds against a clean base.

**Architecture:** A TypeScript ESM package published to npm. `src/index.ts` is the stdio entry (shebang bin); `src/server.ts` is a `createServer()` factory that constructs an MCP `Server` and registers a single `tools/list` handler returning an empty array. Verification is an integration test that connects a real MCP client over stdio and asserts the tool-set is empty, plus a packaging test that packs, installs the tarball, and runs the same assertion against the installed binary. The rest of the plan is documentation repair (rescope `src/API.md`, create `src/CONTEXT.md`, migrate the TBD tracker, correct the handoff drift).

**Tech Stack:** TypeScript 5.x · Node ≥20 (built-in `node:test` runner, top-level await) · `@modelcontextprotocol/sdk` (only runtime dependency for bootstrap) · `tsc` build · npm publish (later; not part of this plan).

**Spec:**
- `planning/designs/2026-08-18_context-audit-design.md` — §4 Decisions holds the `server-bootstrap` exit criteria this plan implements.
- `planning/designs/2026-08-18_ba-mcp-server-design.md` — the approved server shape (package, repo split, doc dispositions).

## Global Constraints

Every task's requirements implicitly include this section.

- **npm package name:** `b-a-mcp` — the lowercase form of the resolved repo name `B-A-MCP` (TBD-6, resolved). npm names must be lowercase; the GitHub repo stays `B-A-MCP`.
- **Package version:** `0.1.0` for this bootstrap.
- **Module system:** ESM only (`"type": "module"`); the MCP SDK is ESM. tsconfig `module`/`moduleResolution` = `NodeNext`.
- **Node floor:** `engines.node` = `>=20`.
- **Minimal-dep bias:** bootstrap adds exactly one runtime dependency, `@modelcontextprotocol/sdk`. No test-framework dependency — use `node:test` + `node:assert`. (`ignore` belongs to the `context_audit` plan, not this one.)
- **Zero tools:** the server registers no tools. `tools/list` returns `[]`. This is the exit criterion, not a temporary state.
- **Error envelope:** any tool error (none yet) uses the structured `{ error: { code, message, detail? } }` form from `CLAUDE.md`; never reveal paths outside the user's tree or any B&A infrastructure detail.
- **Same-commit doc rules:** `src/API.md` is the MCP surface contract (rule 8); `THIRD_PARTY_NOTICES.md` tracks bundled components (rule 4). Bootstrap changes neither a tool schema nor a bundled component, but it *rescopes* `API.md` off the raw template.
- **`prompts/` is source of truth for the gates** (rule 1); `.claude/commands/` is generated and never hand-edited. Bootstrap does not touch either.

---

## File Structure

**Created:**
- `package.json` — package manifest, bin, files whitelist, scripts, deps.
- `tsconfig.json` — TS compiler config; compiles `src/` and `test/` to `dist/`.
- `src/index.ts` — stdio entry point (shebang); wires the server to `StdioServerTransport`.
- `src/server.ts` — `createServer()` factory; registers the empty `tools/list` handler.
- `test/server.test.ts` — integration test: client-over-stdio, `listTools()` → `[]`.
- `test/packaging.test.ts` — packs, installs the tarball into a temp dir, asserts the installed bin lists zero tools.
- `src/CONTEXT.md` — `src/` conventions + the context-budget ledger (rule 2).
- `.gitignore` additions — `dist/` (already present from the initial commit; verify).

**Modified:**
- `src/API.md` — replace the raw JWT/roles/DB template with the MCP-surface shell.
- `src/TDD.md` — migrate the Master TBD Tracker: clear placeholders, create `TBD-1…9`, record `TBD-6` resolved, append `TBD-10/11/12`.
- `SESSION_HANDOFF.md` — correct the false `src/CONTEXT.md` claim; reflect that the server skeleton now exists.
- `planning/Roadmap.md` — Phase 1 prerequisites update from four to five bundled components (adds `icm-architect`).
- `planning/Integration_Spec.md` — §2 gains the `icm-architect` pinned-version row; lands same-commit with its `THIRD_PARTY_NOTICES.md` block (rule 4).
- `THIRD_PARTY_NOTICES.md` — new `icm-architect` MIT stub block (paired with the Integration_Spec row; not finalized — see Out of scope).

**Responsibility split:** `index.ts` owns process/transport wiring only; `server.ts` owns server construction and handler registration, so tool registration later has one obvious home. Tests live in `test/`, separate from `src/`, both compiled to `dist/`.

---

## Task 1: Installable server that lists zero tools

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/server.ts`
- Create: `src/index.ts`
- Test: `test/server.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces:
  - `createServer(): Server` in `src/server.ts` — constructs the MCP `Server` (`name: "b-a-mcp"`, `version: "0.1.0"`, `capabilities: { tools: {} }`) and registers a `ListToolsRequestSchema` handler returning `{ tools: [] }`.
  - Built entry at `dist/src/index.js` (the `bin` target), which connects `createServer()` to a `StdioServerTransport`.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "b-a-mcp",
  "version": "0.1.0",
  "description": "B&A build-loop gates and repo-audit tools as a local MCP server.",
  "type": "module",
  "bin": { "b-a-mcp": "dist/src/index.js" },
  "files": ["dist/src", "prompts", "LICENSE", "THIRD_PARTY_NOTICES.md", "README.md"],
  "engines": { "node": ">=20" },
  "scripts": {
    "build": "tsc",
    "pretest": "tsc",
    "test": "node --test \"dist/test/**/*.test.js\""
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/node": "^20.0.0"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": ".",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": false
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 3: Install dependencies**

Run: `npm install`
Expected: `node_modules/` populated, `package-lock.json` created, no errors. (`node_modules/` and `dist/` are already gitignored from the initial commit — confirm.)

- [ ] **Step 4: Write the failing integration test** — `test/server.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

test("server starts and lists zero tools", async () => {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/src/index.js"],
  });
  const client = new Client(
    { name: "b-a-mcp-test", version: "0.0.0" },
    { capabilities: {} }
  );
  await client.connect(transport);
  const { tools } = await client.listTools();
  assert.deepEqual(tools, []);
  await client.close();
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `tsc` errors (no `src/server.ts` / `src/index.ts`) or the spawned process exits because `dist/src/index.js` does not exist.

- [ ] **Step 6: Write `src/server.ts`**

```ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

export function createServer(): Server {
  const server = new Server(
    { name: "b-a-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [] }));

  return server;
}
```

- [ ] **Step 7: Write `src/index.ts`**

```ts
#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

const server = createServer();
const transport = new StdioServerTransport();
await server.connect(transport);
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — `tsc` compiles, `dist/src/index.js` exists, client connects, `listTools()` returns `[]`.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json src/server.ts src/index.ts test/server.test.ts
git commit -m "feat: stdio MCP server skeleton registering zero tools"
```

---

## Task 2: Packaging verification (the `npx` exit criterion)

Task 1 proves the server runs from source. This task proves the *published package* runs — that `bin`, `files`, and the build output are correct, which is the literal exit criterion ("`npx` + a client lists an empty tool-set").

**Note (network):** this test runs `npm pack` + `npm install <tarball>`, which resolves the runtime dependency `@modelcontextprotocol/sdk` from the registry — so it requires network access. Add `--prefer-offline` when a warm npm cache is available; in a fully offline CI, mark this test skipped and rely on Task 1's from-source integration test.

**Files:**
- Test: `test/packaging.test.ts`

**Interfaces:**
- Consumes: the built `dist/src/index.js` and the `package.json` `bin`/`files` fields from Task 1.
- Produces: nothing consumed downstream; this is a verification gate.

- [ ] **Step 1: Write the failing packaging test** — `test/packaging.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

test("packed tarball installs and the installed bin lists zero tools", async () => {
  const projectRoot = process.cwd();

  // Pack the current package into a temp dir.
  const stage = mkdtempSync(join(tmpdir(), "ba-mcp-pack-"));
  execFileSync("npm", ["pack", "--pack-destination", stage], {
    cwd: projectRoot,
    stdio: "pipe",
  });
  const tarball = readdirSync(stage).find((f) => f.endsWith(".tgz"));
  assert.ok(tarball, "npm pack produced a tarball");

  // Install the tarball into a clean consumer project.
  const consumer = mkdtempSync(join(tmpdir(), "ba-mcp-consumer-"));
  execFileSync("npm", ["init", "-y"], { cwd: consumer, stdio: "pipe" });
  execFileSync("npm", ["install", join(stage, tarball!)], {
    cwd: consumer,
    stdio: "pipe",
  });

  // Run the installed binary over stdio and assert zero tools.
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["--no-install", "b-a-mcp"],
    cwd: consumer,
  });
  const client = new Client(
    { name: "b-a-mcp-pack-test", version: "0.0.0" },
    { capabilities: {} }
  );
  await client.connect(transport);
  const { tools } = await client.listTools();
  assert.deepEqual(tools, []);
  await client.close();
});
```

- [ ] **Step 2: Run the test to verify it fails (or drives a real fix)**

Run: `npm test`
Expected: If `bin`/`files` are correct from Task 1, this may PASS immediately — that is acceptable for a verification task. If it FAILS, the failure identifies a packaging defect (missing `bin`, wrong path in `files`, `dist/src` not shipped). Fix `package.json` until it passes; the fix belongs in this commit.

- [ ] **Step 3: Confirm the test passes**

Run: `npm test`
Expected: PASS — both `test/server.test.ts` and `test/packaging.test.ts` green.

- [ ] **Step 4: Commit**

```bash
git add test/packaging.test.ts package.json
git commit -m "test: verify packed tarball installs and lists zero tools"
```

---

## Task 3: Rescope `src/API.md` to the MCP surface

Replace the raw template (JWT/roles/DB REST endpoints — none of which exist in this product) with the real MCP-surface contract shell. This is scaffold-debt repair, not `context_audit` design: no tool schema is added here (there are zero tools). The `context_audit` schema lands later, in the same commit as that tool (rule 8).

**Files:**
- Modify: `src/API.md` (full rewrite of body)

**Interfaces:**
- Consumes: the resolved conventions from `CLAUDE.md` (the `src/API.md` row: "MCP surface: prompt names, tool names, input/output JSON schemas").
- Produces: an `API.md` whose structure later tool commits extend.

- [ ] **Step 1: Rewrite `src/API.md`** with exactly these sections (and no residual auth/DB content):

  1. **Schema-of-record blockquote** — keep the existing rule that this file updates in the same commit as any change to the MCP surface, and that it lives in `src/` beside the code.
  2. **What this documents** — one paragraph: the MCP surface of the `b-a-mcp` stdio server — the prompts (the five gates) and the tools (the audit tools), with their input/output JSON schemas. No HTTP, no auth, no roles, no database — this server has none.
  3. **Prompts (free, unauthenticated)** — a table naming the five gates and pointing at `prompts/` as source of truth: `problem-fit`, `intake`, `decisions`, `design-doc`, `handoff`. State that prompt *bodies* live in `prompts/` and are not duplicated here; this file records their names and invocation contract only. (Registration of these prompts as MCP prompts is a later feature — note that they are not yet served.)
  4. **Tools (free, unauthenticated)** — a table with a single row of prose: **none at bootstrap.** State the intended first three (`context_audit`, `doc_drift`, `override_log`) as forthcoming, each linking to its design doc when it exists. No schema yet.
  5. **Paid tool** — one line: `export_record` is Phase 2, not part of the published package (client only).
  6. **Error format** — reference the structured `{ error: { code, message, detail? } }` envelope from `CLAUDE.md`; restate the "never reveal internal paths or B&A infrastructure" rule.
  7. **Invariants** — a short list stating the class of rules the tool surface must hold (read-only audit tools, free/paid boundary at `export_record` only). Concrete per-tool invariants (e.g. `context_audit` never reads above root) land with each tool.

- [ ] **Step 2: Verify no template residue remains**

Run: `grep -nEi 'jwt|bearer|/auth/|bcrypt|role|refresh token|POST /|deleted_at|users table' src/API.md`
Expected: no matches (an empty result). If any line matches, it is leftover template content — remove it.

- [ ] **Step 3: Verify the MCP-surface sections are present**

Run: `grep -nE '^## ' src/API.md`
Expected: headings for Prompts, Tools, Error format (and the others above) — confirming the file now describes the MCP surface.

- [ ] **Step 4: Commit**

```bash
git add src/API.md
git commit -m "docs: rescope API.md from REST template to the MCP surface"
```

---

## Task 4: Create `src/CONTEXT.md` with the context-budget ledger

`src/CONTEXT.md` does not exist (its absence is the drift Task 6 corrects). Create it: `src/` conventions plus the measured context-budget ledger required by rule 2.

**Files:**
- Create: `src/CONTEXT.md`

**Interfaces:**
- Consumes: the CLAUDE.md `src/CONTEXT.md` description ("conventions, patterns, and the context-budget ledger") and rule 2 ("standing tool-definition context cost stays under ~4k tokens").
- Produces: the ledger later tool commits update (each tool re-measures and logs its standing cost here in the same commit).

- [ ] **Step 1: Write `src/CONTEXT.md`** with these sections:

  1. **Routing header** — one paragraph: read this before writing server or tool code; it holds `src/` conventions and the context-budget ledger.
  2. **Conventions** — TypeScript ESM, `NodeNext` resolution; `index.ts` owns transport wiring, `server.ts` owns server construction and handler registration; tools live in `src/tools/` (one file per tool, kebab-case) and register through `server.ts`; tests in `test/`, `node:test` only; error envelope per `CLAUDE.md`.
  3. **Context-budget ledger** — a table `| Tool | Standing tokens (measured) | Notes |`. At bootstrap the table is empty (zero tools) with a stated total of **0 / ~4000**. State the rule verbatim: standing tool-definition cost stays under ~4k tokens; every tool added or widened re-measures and updates this row in the same commit; verified at `/handoff` (rule 2). State the measurement method to be fixed when the first tool lands (so the number is reproducible).

- [ ] **Step 2: Verify the file exists and carries the ledger**

Run: `grep -nE '4000|4k|ledger|Standing tokens' src/CONTEXT.md`
Expected: matches confirming the budget ledger section is present.

- [ ] **Step 3: Commit**

```bash
git add src/CONTEXT.md
git commit -m "docs: create src/CONTEXT.md with the context-budget ledger"
```

---

## Task 5: Migrate the Master TBD Tracker in `src/TDD.md`

The tracker holds template placeholders `TBD-001…008` and lacks the real `TBD-1…9` (which live only in `CLAUDE.md` and the server design doc). Migrate it: clear placeholders, create the real rows, record `TBD-6` resolved, then append the three `context_audit` stubs.

**Files:**
- Modify: `src/TDD.md` (Master TBD Tracker table only; leave the rest of the file's structure intact)

**Interfaces:**
- Consumes: the `TBD-1…9` descriptions from `planning/designs/2026-08-18_ba-mcp-server-design.md` (Open TBDs table) and `CLAUDE.md` (Key Open TBDs); the three stubs from `planning/designs/2026-08-18_context-audit-design.md` §4.
- Produces: the canonical tracker every future gate reads for the next free id.

- [ ] **Step 1: Replace the placeholder rows** `TBD-001…008` with the real project rows. Use the `TBD-N` (non-padded) scheme from the CLAUDE.md naming convention:

  | TBD ID | Description | Blocks | Status | Resolution |
  |---|---|---|---|---|
  | TBD-1 | Does claude-mem's upstream repo ship an Apache 2.0 `NOTICE` file? | `THIRD_PARTY_NOTICES.md` — Apache 2.0 compliance | Open | |
  | TBD-2 | Confirm each of the **five** bundled components' license from its own `LICENSE`/`plugin.json` (now includes `icm-architect`), not third-party listings | All packaging; `THIRD_PARTY_NOTICES.md`, `Integration_Spec.md` | Open | |
  | TBD-3 | Verify DO Functions free allowance against the live console (25,000 vs 90,000 GiB-s) | Cost model only — not load-bearing | Open | |
  | TBD-4 | Do B&A docs reproduce ICM (Van Clief & McDermott, 2026) expression, or paraphrase it? **Escalated:** `icm-architect` is a 905-star MIT expression of the same paper, now bundled — resolve before the notices file ships and before any copy claims the methodology as B&A-original | Publication | Open | |
  | TBD-5 | Paid-tier price and structure (one-time vs. subscription) | `export_record` checkout | Open | |
  | TBD-6 | Package/repo name | Everything — nothing scaffolds unnamed | **Resolved** | Repo `B-A-MCP`; npm package `b-a-mcp`. Recorded in `planning/decisions/`. |
  | TBD-7 | Pinned Superpowers major version | Dependency stability | Open | |
  | TBD-8 | Split launch (free tier first) or single launch? | Sequencing | Open | |
  | TBD-9 | `doc_drift` scope — which frameworks and migration formats are in scope for v1 | `doc_drift` build | Open | |

- [ ] **Step 2: Append the three `context_audit` stubs** (next free ids after the real `TBD-9`):

  | TBD ID | Description | Blocks | Status | Resolution |
  |---|---|---|---|---|
  | TBD-10 | `context_audit` sub-score → headline **weighting** function (accuracy cluster > bloat; N/A sub-score drops and reweights). Principle resolved; numbers only. Data-blocked — calibrate from the first dogfood run. | `context_audit` composite `score` | Open | |
  | TBD-11 | `context_audit` **bloat thresholds** — routing-token-weight, inline-ratio, chain-depth cutoffs → severity. Data-blocked — calibrate from the first dogfood run. | `context_audit` `bloat` sub-score | Open | |
  | TBD-12 | `context_audit` **coverage significance + thresholds** — source-vs-config classification, min file count for "significant", ancestor-coverage-within-N-hops vs own-router. Data-blocked — calibrate from the first dogfood run. **Build guard:** the `high`-severity "uncovered significant workspace" finding must be gated behind a `TODO: TBD-12` so it does not fire on uncalibrated defaults. | `context_audit` `coverage` sub-score | Open | |

  (The **Build guard** sentence in TBD-12 is the repo home for the guard that otherwise lived only in the design conversation.)

- [ ] **Step 3: Create the TBD-6 decision record** — `planning/decisions/2026-08-18_tbd-6-package-name.md`

CLAUDE.md's TBD policy and the `TDD.md` resolution workflow both require a `planning/decisions/YYYY-MM-DD_*.md` reasoning record for any resolved TBD. Write it in this same commit so the tracker row's "Recorded in `planning/decisions/`" is true, not a forward claim:

```markdown
# TBD-6 — Package / repo name

**Date:** 2026-08-18
**Status:** Resolved
**TBD:** TBD-6 (package/repo name — blocked everything; nothing scaffolds unnamed)

## Resolution
- GitHub repository: `B-A-MCP` (created and pushed public).
- npm package name: `b-a-mcp` — the lowercase form npm requires (package names must be lowercase; no uppercase or spaces).

## Reasoning
The repo name matches the CLAUDE.md Product/Repo fields. npm rejects uppercase in package names, so the published package lowercases to `b-a-mcp` while the GitHub repo keeps its casing. No scope prefix in Phase 1; a scoped name (`@org/b-a-mcp`) later is a mechanical rename, not a new decision.
```

- [ ] **Step 4: Verify the migration**

Run: `grep -nE 'TBD-00[1-8]' src/TDD.md`
Expected: no matches (placeholders gone).

Run: `grep -nE 'TBD-6\b.*Resolved|Build guard|TBD-12' src/TDD.md`
Expected: matches confirming `TBD-6` resolved and the `TBD-12` build guard is recorded.

Run: `ls planning/decisions/2026-08-18_tbd-6-package-name.md`
Expected: the decision record exists.

- [ ] **Step 5: Commit**

```bash
git add src/TDD.md planning/decisions/2026-08-18_tbd-6-package-name.md
git commit -m "docs: migrate Master TBD Tracker to real TBD-1..9, resolve TBD-6, append context_audit stubs"
```

---

## Task 6: Correct the `SESSION_HANDOFF.md` drift

`SESSION_HANDOFF.md` — a *verified-truth* doc — currently claims `src/CONTEXT.md` exists and is populated. It did not (until Task 4). It also states no server code exists (no longer true after Task 1). Correct the specific false claims so the handoff matches reality. A full handoff refresh is `/handoff`'s job; this task fixes only the drift the exit criteria name.

**Files:**
- Modify: `SESSION_HANDOFF.md`

**Interfaces:**
- Consumes: the real post-bootstrap state (server skeleton exists; `src/CONTEXT.md`, `src/API.md`, `src/TDD.md` now correct).
- Produces: an accurate continuity doc for the next session.

- [ ] **Step 1: Correct the "Confirmed present and correct" section** — the `src/` line currently reads that `API.md`, `CONTEXT.md` (with context-budget ledger), `TDD.md`, `tools/`, `client/` are present. Replace with the true state: `API.md` rescoped to the MCP surface (Task 3); `CONTEXT.md` **created this bootstrap** with the ledger (Task 4); `TDD.md` tracker migrated (Task 5). Note explicitly that `CONTEXT.md` was previously *claimed but absent* — the drift this bootstrap corrected. Also correct the same line's claim that `src/tools/` and `src/client/` exist — they do not; `src/tools/` gets its first file with `context_audit`, and `src/client/` with `export_record` (Phase 2). Remove or mark them not-yet-created.

- [ ] **Step 2: Correct the state narrative** — the lines "No build loop has run yet" / "No server or tool code exists" are now false. Update: the `server-bootstrap` step has run; an installable stdio server registering zero tools now exists under `src/`, verified by the server and packaging tests. Tools are still unbuilt; `context_audit` is next.

- [ ] **Step 3: Update "Next action"** — point at the `context_audit` plan (its own `writing-plans` pass), noting the first dogfood run is a calibration run for `TBD-10/11/12`, not the README run.

- [ ] **Step 4: Verify the false claims are gone**

Run: `grep -nE 'No server or tool code exists|No build loop has run yet' SESSION_HANDOFF.md`
Expected: no matches.

Run: `grep -nE 'CONTEXT.md' SESSION_HANDOFF.md`
Expected: a line describing `CONTEXT.md` as created this bootstrap (drift corrected), not as pre-existing.

- [ ] **Step 5: Commit**

```bash
git add SESSION_HANDOFF.md
git commit -m "docs: correct SESSION_HANDOFF drift (CONTEXT.md now exists; server skeleton landed)"
```

---

## Task 7: Update the Roadmap for the fifth bundled component

Added by the icm-architect ratchet (Decision 11). `planning/Roadmap.md`'s Phase 1 prerequisites assume four bundled components under TBD-2.

**Files:**
- Modify: `planning/Roadmap.md`

**Interfaces:**
- Consumes: Decision 11 (`planning/decisions/2026-08-18_icm-architect-scoping.md`); the design doc Revision 2 packaging table (five components).
- Produces: a Roadmap whose Phase 1 prerequisites match the five-component reality.

- [ ] **Step 1: Update the Phase 1 prerequisites** — the `TBD-2` prerequisite line assumes four bundled components. Change it to name **five**, adding `icm-architect` (RinDig, MIT) as the workspace scaffolder. Leave the other prerequisites unchanged.

- [ ] **Step 2: Verify**

Run: `grep -niE 'five|icm-architect' planning/Roadmap.md`
Expected: a match showing the prerequisite now reflects five components / names `icm-architect`.

- [ ] **Step 3: Commit**

```bash
git add planning/Roadmap.md
git commit -m "docs: Roadmap Phase 1 prerequisites cover five bundled components"
```

---

## Task 8: Add icm-architect to Integration_Spec §2 and THIRD_PARTY_NOTICES (single commit — rule 4)

Added by the icm-architect ratchet (Decision 11). This adds **stub** entries only — full notices finalization (verified license text for all five) stays out of bootstrap (see Out of scope). Rule 4 requires the Integration_Spec row and the notices block to land in the **same commit**.

**Files:**
- Modify: `planning/Integration_Spec.md` (§2 bundled-components table)
- Modify: `THIRD_PARTY_NOTICES.md` (new component block)

**Interfaces:**
- Consumes: Decision 11; the design doc Revision 2 packaging table.
- Produces: a five-row §2 table and a matching notices file; both pinned-version fields carry `TODO: TBD-2` until license verification resolves.

- [ ] **Step 1: Add the `icm-architect` row to `planning/Integration_Spec.md` §2** — component `icm-architect`, license `MIT`, pinned version `TODO: TBD-2 confirm`, notes: "Workspace scaffolder (Decision 11). B&A tools govern the structure it generates; they never generate."

- [ ] **Step 2: Add the matching MIT notice block to `THIRD_PARTY_NOTICES.md`** — name (`icm-architect`, RinDig), license MIT, upstream URL, pinned version `TODO: TBD-2`, `TODO: TBD-2` marker where the verified license text will go, unmodified statement.

- [ ] **Step 3: Verify both landed**

Run: `grep -ni 'icm-architect' planning/Integration_Spec.md THIRD_PARTY_NOTICES.md`
Expected: matches in both files.

- [ ] **Step 4: Commit (single commit — rule 4)**

```bash
git add planning/Integration_Spec.md THIRD_PARTY_NOTICES.md
git commit -m "docs: add icm-architect to Integration_Spec and THIRD_PARTY_NOTICES (five components)"
```

---

## Exit Criteria (verify all before declaring bootstrap done)

- [ ] `npm run build` compiles clean.
- [ ] `npm test` — both `test/server.test.ts` and `test/packaging.test.ts` pass (server registers zero tools; packed tarball installs and lists zero tools).
- [ ] `src/API.md` describes the MCP surface with no REST/auth/DB residue.
- [ ] `src/CONTEXT.md` exists with the context-budget ledger (total 0 / ~4000).
- [ ] `src/TDD.md` tracker holds `TBD-1…9` (no placeholders), `TBD-6` resolved, `TBD-10/11/12` appended with the `TBD-12` build guard.
- [ ] `SESSION_HANDOFF.md` no longer asserts the false `CONTEXT.md`/no-server claims.
- [ ] A `planning/decisions/` record exists for `TBD-6` resolved (created here or noted for `/handoff`).
- [ ] `planning/Roadmap.md` Phase 1 prerequisites name five bundled components (`icm-architect` added).
- [ ] `planning/Integration_Spec.md` §2 has the `icm-architect` row and `THIRD_PARTY_NOTICES.md` its MIT stub block, both `TODO: TBD-2`, in a single commit (rule 4).

---

## Self-Review (run against the spec)

**1. Spec coverage** — the `server-bootstrap` exit criteria in `context_audit` design §4: installable server ✔ (Task 1), zero tools ✔ (Task 1), `npx` + client lists empty tool-set ✔ (Task 2), `API.md` rescoped ✔ (Task 3), `CONTEXT.md` created with ledger ✔ (Task 4), `TDD.md` migrated + `TBD-6` resolved ✔ (Task 5), `SESSION_HANDOFF.md` corrected ✔ (Task 6). The `TBD-12` build-guard carry-in ✔ (Task 5, Step 2). All covered.

**2. Placeholder scan** — no "TBD/TODO/implement later" in the plan steps themselves; the only `TODO: TBD-12` is deliberate spec content (the build guard). Code steps show concrete code; doc steps enumerate exact sections and provide the exact tracker rows.

**3. Type consistency** — `createServer(): Server` is defined in Task 1 and consumed by `index.ts` in the same task; the test files use the SDK's `Client`/`StdioClientTransport` consistently; the `bin` path `dist/src/index.js` matches the `tsconfig` `outDir: dist` + `rootDir: .` layout and the `package.json` `bin` and `files` fields.

---

## Out of scope (separate features, not this plan)

- **Registering the five gate prompts as MCP prompts** — the gates exist as content in `prompts/`; serving them over MCP is its own feature.
- **The `.claude/commands/` generation build step** (rule 1) — generates commands from `prompts/` at build; separate feature.
- **`context_audit` itself** — its own `writing-plans` pass, after this lands.
- **`README`, `LICENSE`, `THIRD_PARTY_NOTICES.md` *finalization*** — README leads with a real `context_audit` run (later); the legal files' verified content (real license text for all five components) is blocked on TBD-1/TBD-2. Bootstrap adds only the `icm-architect` **stub** block (Task 8) to keep rule 4 satisfied with the Integration_Spec row; it does not finalize the notices file.
- **`npm publish`** — the release runbook (`ops/`), on a semver tag, after tools exist.
