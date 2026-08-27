# override_log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `override_log`, a free/keyless MCP tool that turns an array of guidance-with-override *events* into a canonical, rendered override log with a completeness score and per-missing-field findings.

**Architecture:** A generator/validator (no file reads, no network, no key). `runOverrideLog(args)` validates the input array, `validateOverrides` normalizes each event and derives findings + score + stats, `renderOverrideLog` builds the markdown, and `index.ts` wraps it as an MCP tool registered in `server.ts` beside `context_audit`. Result shape and invariants mirror `context_audit`'s conventions.

**Tech Stack:** TypeScript ESM (`NodeNext`), `node:crypto`, `node:test` + `node:assert/strict`, `@modelcontextprotocol/sdk`. No new dependencies.

**Spec:** `planning/designs/2026-08-27_override-log-design.md` (design), `planning/decisions/2026-08-27_override-log-v1-scope-and-validation.md` (decisions). Read both — the plan argues from them.

## Global Constraints

- **Free/keyless (CLAUDE.md rule 3):** no key check, no network call, no B&A-infrastructure call, reads no repository files. Only `export_record` (not in this package) is authenticated.
- **Read-only (API.md invariant):** the tool writes nothing and persists nothing.
- **Rule 8 (same commit):** `src/API.md` gains the `override_log` section and its tools-table status becomes **"Building"** (not "Shipped" — that flips at trunk) in the **same commit** as the code that introduces the tool schema (Task 5).
- **Rule 2 (same commit):** the context-budget ledger in `src/CONTEXT.md` is re-measured with an `override_log` row in the same commit (Task 5); the **combined** standing cost of all tool definitions stays **under ~4000 tokens** (`context_audit` alone is 252). A test enforces the combined budget.
- **Rule 1:** `prompts/` is untouched, so `.claude/commands/` is **not** regenerated.
- **Naming:** MCP tool name `override_log` (snake_case); TS files kebab-case; directory `src/tools/override-log/`.
- **Structured-error envelope (CLAUDE.md / src/CONTEXT.md):** failures return `{ error: { code, message, detail? } }` as a `text` content block with `isError: true`, never a thrown exception. Never reveal paths outside the user's tree.
- **Node v20+** engines floor; tests are TS compiled to `dist/` and run via `npm test` (`node --test "dist/test/**/*.test.js"`, `pretest` runs `tsc`).
- **Stable id, never the evidence:** ids hash a stable discriminator (identity fields), never the moving field values — mirroring `context_audit`'s `findingId` (`src/tools/context-audit/score.ts:4`, contract at `types.ts:23`).
- **Severity by field, not by category:** all findings share category `override_field_missing`; severity is keyed by the missing field, so do NOT reuse `context_audit`'s category-keyed `SEVERITY_BY_CATEGORY`.

---

## File Structure

Created:
- `src/tools/override-log/id.ts` — `stableId(a,b,c)`: the 12-hex sha256 id primitive.
- `src/tools/override-log/types.ts` — `OverrideEvent`, `OverrideFinding`, `OverrideStats`, `OverrideLogResult`, `REQUIRED_FIELDS`, `SEVERITY_BY_FIELD`.
- `src/tools/override-log/validate.ts` — `validateOverrides(overrides)` → `{ score, findings, stats, entries }`.
- `src/tools/override-log/render.ts` — `renderOverrideLog({ score, stats, entries })` → markdown.
- `src/tools/override-log/index.ts` — `overrideLogTool`, `runOverrideLog(args)`, `toCallToolResult(outcome)`.
- `test/override-log/id.test.ts`, `validate.test.ts`, `render.test.ts`, `index.test.ts`, `ledger.test.ts`.

Modified:
- `src/server.ts` — register `overrideLogTool` and route its calls.
- `test/server.test.ts`, `test/packaging.test.ts` — expect two tools.
- `src/API.md` — new tool section + tools-table status (Task 5).
- `src/CONTEXT.md` — ledger row + total (Task 5).

---

### Task 1: Commit the Gate 2/3 planning artifacts

**Files:**
- Commit (already in working tree): `planning/designs/2026-08-27_override-log-design.md`, `planning/decisions/2026-08-27_override-log-v1-scope-and-validation.md`, `src/TDD.md` (TBD-21 row), `docs/superpowers/plans/2026-08-27-override-log.md` (this plan).

- [ ] **Step 1: Confirm branch and contents**

Run: `git branch --show-current` (expect `feat/override-log`) and `git status --short`.
Expected: the four planning artifacts above are present as modified/untracked; no source files yet.

- [ ] **Step 2: Commit**

```bash
git add planning/designs/2026-08-27_override-log-design.md \
        planning/decisions/2026-08-27_override-log-v1-scope-and-validation.md \
        src/TDD.md \
        docs/superpowers/plans/2026-08-27-override-log.md
git commit -F - <<'EOF'
docs: override_log design, decisions, TBD-21, plan

Gate 2 (/decisions) + Gate 3 (/design-doc) artifacts for override_log
(Roadmap tool #2). TBD-21 stubbed (date ISO-format validation deferred).
Implementation plan under docs/superpowers/plans/.
EOF
```

---

### Task 2: `stableId` id primitive

**Files:**
- Create: `src/tools/override-log/id.ts`
- Test: `test/override-log/id.test.ts`

**Interfaces:**
- Produces: `stableId(a: string, b: string, c: string): string` — 12 lowercase hex chars.

- [ ] **Step 1: Write the failing test**

```ts
// test/override-log/id.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { stableId } from "../../src/tools/override-log/id.js";
import { findingId } from "../../src/tools/context-audit/score.js";

test("stableId returns 12 lowercase hex chars", () => {
  const id = stableId("gate", "2026-08-27", "proceed");
  assert.match(id, /^[0-9a-f]{12}$/);
});

test("stableId is deterministic for the same inputs", () => {
  assert.equal(stableId("a", "b", "c"), stableId("a", "b", "c"));
});

test("stableId changes when any input changes", () => {
  const base = stableId("a", "b", "c");
  assert.notEqual(base, stableId("a", "b", "d"));
  assert.notEqual(base, stableId("a", "x", "c"));
});

// Boundary test (deliberate-duplication cross-reference, WORKFLOW Obs 5):
// override_log's stableId MUST stay formula-identical to context_audit's
// findingId so export_record ids are comparable across tools.
test("stableId equals context_audit findingId for identical inputs", () => {
  assert.equal(
    stableId("routing_drift", "docs/x.md", "y"),
    findingId("routing_drift", "docs/x.md", "y"),
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` (or after `npx tsc`, `node --test dist/test/override-log/id.test.js`)
Expected: FAIL — `Cannot find module '.../override-log/id.js'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/tools/override-log/id.ts
import { createHash } from "node:crypto";

// Stable 12-hex id over a NUL-joined discriminator. FORMULA-IDENTICAL to
// context_audit's findingId (src/tools/context-audit/score.ts). Deliberately
// duplicated — not imported — so override_log stays decoupled from
// context_audit's FindingCategory type; a boundary test in id.test.ts locks the
// two formulas together. Hashes a STABLE discriminator, never moving evidence.
export function stableId(a: string, b: string, c: string): string {
  return createHash("sha256").update(`${a}\0${b}\0${c}`).digest("hex").slice(0, 12);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (4 id tests).

- [ ] **Step 5: Commit**

```bash
git add src/tools/override-log/id.ts test/override-log/id.test.ts
git commit -m "feat(override_log): stable id primitive, locked to findingId"
```

---

### Task 3: Types and validation core

**Files:**
- Create: `src/tools/override-log/types.ts`, `src/tools/override-log/validate.ts`
- Test: `test/override-log/validate.test.ts`

**Interfaces:**
- Consumes: `stableId` (Task 2).
- Produces:
  - `OverrideEvent` — `{ gate?, risk?, alternative?, decision?, acknowledged_by?, date?, rationale? }` (all optional strings).
  - `REQUIRED_FIELDS = ["gate","risk","alternative","decision","acknowledged_by","date"]`.
  - `SEVERITY_BY_FIELD: Record<RequiredField, Severity>`.
  - `OverrideFinding` — `{ id, category: "override_field_missing", severity, entry_index, message, evidence }`.
  - `OverrideStats` — `{ overrides_total, fully_documented, incomplete, fields_missing_total }`.
  - `OverrideLogResult` — `{ score, findings, stats, rendered }`.
  - `RenderEntry` — `{ id, index, fields: Record<string,string>, missing: string[], complete: boolean }` (exported from `validate.ts`).
  - `validateOverrides(overrides: OverrideEvent[]): { score: number|null; findings: OverrideFinding[]; stats: OverrideStats; entries: RenderEntry[] }`.

- [ ] **Step 1: Write the failing test**

```ts
// test/override-log/validate.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateOverrides } from "../../src/tools/override-log/validate.js";

const full = {
  gate: "problem-fit", risk: "score 2/8", alternative: "run the Scorecard",
  decision: "proceed", acknowledged_by: "T. Alexander", date: "2026-08-27",
};

test("a fully documented entry yields no findings and score 100", () => {
  const r = validateOverrides([full]);
  assert.equal(r.findings.length, 0);
  assert.equal(r.score, 100);
  assert.equal(r.stats.fully_documented, 1);
  assert.equal(r.stats.incomplete, 0);
  assert.equal(r.entries[0].complete, true);
});

test("empty array scores null (never 100 over an empty denominator)", () => {
  const r = validateOverrides([]);
  assert.equal(r.score, null);
  assert.equal(r.stats.overrides_total, 0);
  assert.equal(r.findings.length, 0);
});

test("each missing required field is one finding; rationale never faulted", () => {
  const r = validateOverrides([{ gate: "intake", risk: "unknown scope" }]);
  const missing = r.findings.map((f) => f.evidence).sort();
  assert.deepEqual(missing, ["acknowledged_by", "alternative", "date", "decision"]);
  assert.equal(r.findings.every((f) => f.category === "override_field_missing"), true);
  assert.equal(r.entries[0].complete, false);
});

test("severity is keyed by field, not category", () => {
  const r = validateOverrides([{}]);
  const sev = Object.fromEntries(r.findings.map((f) => [f.evidence, f.severity]));
  assert.equal(sev.risk, "high");
  assert.equal(sev.alternative, "high");
  assert.equal(sev.date, "high");
  assert.equal(sev.acknowledged_by, "high");
  assert.equal(sev.gate, "medium");
  assert.equal(sev.decision, "medium");
});

// Discriminating test (WORKFLOW Obs 15): whitespace-only must be treated as
// missing, or the trim step is silently absent while the bar stays green.
test("whitespace-only fields count as missing", () => {
  const r = validateOverrides([{ ...full, risk: "   " }]);
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].evidence, "risk");
  assert.equal(r.score, 0);
});

test("score is the rounded share of fully-documented entries", () => {
  const r = validateOverrides([full, { gate: "x" }, { gate: "y" }]); // 1 of 3
  assert.equal(r.score, 33);
  assert.equal(r.stats.fully_documented, 1);
  assert.equal(r.stats.incomplete, 2);
});

test("entry id is stable across field edits to non-identity fields", () => {
  const a = validateOverrides([full]).entries[0].id;
  const b = validateOverrides([{ ...full, risk: "reworded risk", alternative: "reworded" }]).entries[0].id;
  assert.equal(a, b); // gate+date+decision unchanged → id unchanged
});

test("entry id changes when an identity field changes", () => {
  const a = validateOverrides([full]).entries[0].id;
  const b = validateOverrides([{ ...full, decision: "defer instead" }]).entries[0].id;
  assert.notEqual(a, b);
});

test("findings are ordered by entry then required-field order", () => {
  const r = validateOverrides([{}, {}]);
  // entry 0's six findings precede entry 1's six
  assert.equal(r.findings[0].entry_index, 0);
  assert.equal(r.findings[5].entry_index, 0);
  assert.equal(r.findings[6].entry_index, 1);
  // within an entry, gate (first required field) comes first
  assert.equal(r.findings[0].evidence, "gate");
});

test("a non-object array item is treated as an all-missing entry, never throws", () => {
  const r = validateOverrides([null as any, "x" as any]);
  assert.equal(r.stats.overrides_total, 2);
  assert.equal(r.findings.filter((f) => f.entry_index === 0).length, 6);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../validate.js'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/tools/override-log/types.ts
import type { Severity } from "../context-audit/types.js";

// One override event as supplied by the caller. All fields are optional strings:
// the tool never hard-refuses a call for a missing field (guidance-with-override
// applied to the tool itself); a missing REQUIRED field becomes a finding.
export interface OverrideEvent {
  gate?: string;
  risk?: string;
  alternative?: string;
  decision?: string;
  acknowledged_by?: string;
  date?: string;
  rationale?: string;
}

// The six fields required for a COMPLETE record (rationale is genuinely optional).
export const REQUIRED_FIELDS = [
  "gate", "risk", "alternative", "decision", "acknowledged_by", "date",
] as const;
export type RequiredField = (typeof REQUIRED_FIELDS)[number];

// Severity keyed by the MISSING FIELD (NOT by category — all findings share one
// category, so a category-keyed map like context_audit's SEVERITY_BY_CATEGORY
// would give them all one severity, which is wrong here).
export const SEVERITY_BY_FIELD: Record<RequiredField, Severity> = {
  risk: "high",
  alternative: "high",
  date: "high",
  acknowledged_by: "high",
  gate: "medium",
  decision: "medium",
};

export interface OverrideFinding {
  id: string;
  category: "override_field_missing";
  severity: Severity;
  entry_index: number;
  message: string;
  evidence: string; // the missing field's name
}

export interface OverrideStats {
  overrides_total: number;
  fully_documented: number;
  incomplete: number;
  fields_missing_total: number;
}

export interface OverrideLogResult {
  score: number | null;
  findings: OverrideFinding[];
  stats: OverrideStats;
  rendered: string;
}
```

```ts
// src/tools/override-log/validate.ts
import { stableId } from "./id.js";
import { REQUIRED_FIELDS, SEVERITY_BY_FIELD } from "./types.js";
import type { OverrideEvent, OverrideFinding, OverrideStats } from "./types.js";

// All input + rationale, in a fixed key order (rationale rendered but never faulted).
const ALL_FIELDS = [
  "gate", "risk", "alternative", "decision", "acknowledged_by", "date", "rationale",
] as const;

export interface RenderEntry {
  id: string;
  index: number;
  fields: Record<string, string>; // normalized values; "" when absent
  missing: string[]; // missing required field names, in REQUIRED_FIELDS order
  complete: boolean;
}

export interface Validated {
  score: number | null;
  findings: OverrideFinding[];
  stats: OverrideStats;
  entries: RenderEntry[];
}

function norm(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function validateOverrides(overrides: OverrideEvent[]): Validated {
  const findings: OverrideFinding[] = [];
  const entries: RenderEntry[] = [];
  let fullyDocumented = 0;
  let fieldsMissingTotal = 0;

  overrides.forEach((raw, index) => {
    const e: OverrideEvent = raw && typeof raw === "object" ? raw : {};

    const fields: Record<string, string> = {};
    for (const f of ALL_FIELDS) fields[f] = norm((e as Record<string, unknown>)[f]);

    // Entry id = stable hash over the identity fields (gate|date|decision),
    // never the moving evidence — so it survives risk/alternative/acknowledged_by
    // being completed and can key export_record's supersede.
    const id = stableId(fields.gate, fields.date, fields.decision);
    const discriminator = `${fields.gate}\0${fields.date}\0${fields.decision}`;

    const missing: string[] = [];
    for (const f of REQUIRED_FIELDS) {
      if (fields[f] === "") {
        missing.push(f);
        findings.push({
          id: stableId("override_field_missing", discriminator, f),
          category: "override_field_missing",
          severity: SEVERITY_BY_FIELD[f],
          entry_index: index,
          message: `override entry ${index + 1} is missing required field \`${f}\``,
          evidence: f,
        });
      }
    }

    fieldsMissingTotal += missing.length;
    const complete = missing.length === 0;
    if (complete) fullyDocumented++;
    entries.push({ id, index, fields, missing, complete });
  });

  const total = overrides.length;
  const score = total === 0 ? null : Math.round((100 * fullyDocumented) / total);
  const stats: OverrideStats = {
    overrides_total: total,
    fully_documented: fullyDocumented,
    incomplete: total - fullyDocumented,
    fields_missing_total: fieldsMissingTotal,
  };

  return { score, findings, stats, entries };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (all validate tests).

- [ ] **Step 5: Commit**

```bash
git add src/tools/override-log/types.ts src/tools/override-log/validate.ts test/override-log/validate.test.ts
git commit -m "feat(override_log): types + validation core (completeness, findings, score)"
```

---

### Task 4: Rendered markdown log

**Files:**
- Create: `src/tools/override-log/render.ts`
- Test: `test/override-log/render.test.ts`

**Interfaces:**
- Consumes: `RenderEntry` (Task 3), `OverrideStats` (Task 3).
- Produces: `renderOverrideLog(args: { score: number|null; stats: OverrideStats; entries: RenderEntry[] }): string`.

- [ ] **Step 1: Write the failing test**

```ts
// test/override-log/render.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateOverrides } from "../../src/tools/override-log/validate.js";
import { renderOverrideLog } from "../../src/tools/override-log/render.js";

const full = {
  gate: "problem-fit", risk: "score 2/8", alternative: "run the Scorecard",
  decision: "proceed", acknowledged_by: "T. Alexander", date: "2026-08-27",
};

function render(overrides: any[]) {
  const v = validateOverrides(overrides);
  return renderOverrideLog({ score: v.score, stats: v.stats, entries: v.entries });
}

test("header, summary and completeness percent appear", () => {
  const md = render([full, { gate: "x" }]);
  assert.match(md, /# override_log/);
  assert.match(md, /2 overrides/);
  assert.match(md, /50%/); // 1 of 2 fully documented
});

test("empty log renders a notice, not a fake 100%", () => {
  const md = render([]);
  assert.match(md, /No overrides supplied/i);
  assert.doesNotMatch(md, /100%/);
});

test("the one-liner includes the cheaper alternative", () => {
  const md = render([full]);
  assert.match(md, /run the Scorecard/); // alternative must appear in the sentence
  assert.match(md, /problem-fit/);
});

test("an incomplete entry flags its missing fields", () => {
  const md = render([{ gate: "intake", risk: "unknown scope" }]);
  assert.match(md, /Missing/);
  assert.match(md, /alternative/);
  assert.match(md, /acknowledged_by/);
});

test("the entry id is shown", () => {
  const v = validateOverrides([full]);
  const md = renderOverrideLog({ score: v.score, stats: v.stats, entries: v.entries });
  assert.ok(md.includes(v.entries[0].id));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../render.js'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/tools/override-log/render.ts
import type { OverrideStats } from "./types.js";
import type { RenderEntry } from "./validate.js";

function val(v: string, label: string): string {
  return v === "" ? `_missing ${label}_` : v;
}

// The canonical one-liner. Includes the cheaper ALTERNATIVE — risk plus the named
// alternative is the guidance-with-override signal — even though problem-fit.md:81's
// shorthand omits it. Missing pieces render as explicit [unspecified ...] stubs.
function oneLiner(f: Record<string, string>): string {
  const g = f.gate || "[unspecified gate]";
  const risk = f.risk || "[unspecified risk]";
  const alt = f.alternative || "[unspecified alternative]";
  const dec = f.decision || "[unspecified decision]";
  const who = f.acknowledged_by || "[unspecified]";
  const date = f.date || "[undated]";
  return `> proceeded past **${g}** despite ${risk} — cheaper path offered: ${alt}; chose: ${dec}; authorized by ${who} on ${date}.`;
}

export function renderOverrideLog(args: {
  score: number | null;
  stats: OverrideStats;
  entries: RenderEntry[];
}): string {
  const { score, stats, entries } = args;
  const lines: string[] = [];
  lines.push(`# override_log — guidance-with-override record`);
  lines.push("");

  const pct = score === null ? "—" : `${score}%`;
  lines.push(
    `**${stats.overrides_total} overrides · ${stats.fully_documented} fully documented (${pct}) · ${stats.incomplete} incomplete**`,
  );
  lines.push("");

  if (entries.length === 0) {
    lines.push(`_No overrides supplied._`);
    return lines.join("\n");
  }

  for (const e of entries) {
    const f = e.fields;
    const status = e.complete ? "✓ documented" : "⚠ incomplete";
    const gate = f.gate || "(gate missing)";
    const date = f.date || "(date missing)";
    lines.push(`## ${e.index + 1}. \`${e.id}\` — ${gate} · ${date}  ${status}`);
    lines.push(`- **Risk:** ${val(f.risk, "risk")}`);
    lines.push(`- **Cheaper alternative:** ${val(f.alternative, "alternative")}`);
    lines.push(`- **Decision:** ${val(f.decision, "decision")}`);
    lines.push(`- **Acknowledged by:** ${val(f.acknowledged_by, "acknowledged_by")}`);
    if (f.rationale !== "") lines.push(`- **Rationale:** ${f.rationale}`);
    if (e.missing.length > 0) lines.push(`- ⚠ Missing: ${e.missing.join(", ")}`);
    lines.push("");
    lines.push(oneLiner(f));
    lines.push("");
  }

  lines.push(
    `> Generated locally by \`override_log\` (free tier) — this record is not persisted. Persist a versioned, timestamped copy with \`export_record\`.`,
  );
  return lines.join("\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (all render tests).

- [ ] **Step 5: Commit**

```bash
git add src/tools/override-log/render.ts test/override-log/render.test.ts
git commit -m "feat(override_log): markdown render (summary, per-entry, one-liner with alternative)"
```

---

### Task 5: Tool definition, handler, and same-commit docs (rules 8 + 2)

**Files:**
- Create: `src/tools/override-log/index.ts`, `test/override-log/index.test.ts`, `test/override-log/ledger.test.ts`
- Modify: `src/API.md`, `src/CONTEXT.md`

**Interfaces:**
- Consumes: `validateOverrides` (Task 3), `renderOverrideLog` (Task 4).
- Produces: `overrideLogTool` (definition object), `runOverrideLog(args: { overrides?: unknown }): Outcome`, `toCallToolResult(outcome): CallToolResult`.

- [ ] **Step 1: Write the failing tests**

```ts
// test/override-log/index.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { overrideLogTool, runOverrideLog, toCallToolResult } from "../../src/tools/override-log/index.js";

test("tool name and required input key", () => {
  assert.equal(overrideLogTool.name, "override_log");
  assert.deepEqual(overrideLogTool.inputSchema.required, ["overrides"]);
});

test("a valid call returns rendered + structuredContent, mirrored", () => {
  const out = runOverrideLog({ overrides: [{ gate: "problem-fit", risk: "r", alternative: "a", decision: "d", acknowledged_by: "who", date: "2026-08-27" }] });
  assert.equal(out.ok, true);
  const res = toCallToolResult(out);
  assert.ok(res.structuredContent);
  assert.equal((res.structuredContent as any).score, 100);
  assert.equal(res.content[0].text, (res.structuredContent as any).rendered);
});

test("missing/non-array overrides is a structured INVALID_OVERRIDES error, not a throw", () => {
  const out = runOverrideLog({} as any);
  assert.equal(out.ok, false);
  const res = toCallToolResult(out);
  assert.equal(res.isError, true);
  assert.equal(res.structuredContent, undefined);
  assert.equal(JSON.parse(res.content[0].text).error.code, "INVALID_OVERRIDES");
});

test("an empty array is valid (score null), not an error", () => {
  const out = runOverrideLog({ overrides: [] });
  assert.equal(out.ok, true);
  assert.equal((out as any).result.score, null);
});
```

```ts
// test/override-log/ledger.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { countTokens } from "../../src/tools/context-audit/tokens.js";
import { contextAuditTool } from "../../src/tools/context-audit/index.js";
import { overrideLogTool } from "../../src/tools/override-log/index.js";

// Rule 2: the COMBINED standing tool-definition cost stays under ~4000 tokens.
test("combined standing tool-definition cost is under 4000 (rule 2)", () => {
  const total =
    countTokens(JSON.stringify(contextAuditTool)) +
    countTokens(JSON.stringify(overrideLogTool));
  assert.ok(total < 4000, `combined standing cost ${total} exceeds 4000`);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../override-log/index.js'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/tools/override-log/index.ts
import { validateOverrides } from "./validate.js";
import { renderOverrideLog } from "./render.js";
import type { OverrideEvent, OverrideLogResult } from "./types.js";

export const overrideLogTool = {
  name: "override_log" as const,
  description:
    "Turn guidance-with-override events into a canonical, timestamped override log. Free and keyless: it generates and renders the record in-session and never persists it (that is export_record's job). Pass an array of override events; each missing required field is flagged and the log carries a completeness score.",
  inputSchema: {
    type: "object",
    required: ["overrides"],
    properties: {
      overrides: {
        type: "array",
        description: "Override events to record. Each field is optional; a missing required field is flagged, never rejected.",
        items: {
          type: "object",
          properties: {
            gate: { type: "string", description: "The gate/checkpoint the override was taken at." },
            risk: { type: "string", description: "The specific gap/risk the gate flagged." },
            alternative: { type: "string", description: "The cheaper/safer path the gate named." },
            decision: { type: "string", description: "What was chosen instead." },
            acknowledged_by: { type: "string", description: "Who authorized proceeding." },
            date: { type: "string", description: "When (a date string; presence checked, format not — v1)." },
            rationale: { type: "string", description: "Optional: why they proceeded." },
          },
          additionalProperties: false,
        },
      },
    },
    additionalProperties: false,
  },
  outputSchema: {
    type: "object",
    required: ["score", "findings", "stats", "rendered"],
    properties: {
      score: { type: ["number", "null"] },
      findings: { type: "array", items: { type: "object" } },
      stats: { type: "object" },
      rendered: { type: "string" },
    },
    additionalProperties: false,
  },
};

type Outcome =
  | { ok: true; result: OverrideLogResult }
  | { ok: false; error: { code: string; message: string; detail?: string } };

export function runOverrideLog(args: { overrides?: unknown }): Outcome {
  if (!args || !Array.isArray(args.overrides)) {
    return { ok: false, error: { code: "INVALID_OVERRIDES", message: "`overrides` must be an array of override events", detail: "field: overrides" } };
  }
  const { score, findings, stats, entries } = validateOverrides(args.overrides as OverrideEvent[]);
  const rendered = renderOverrideLog({ score, stats, entries });
  return { ok: true, result: { score, findings, stats, rendered } };
}

export function toCallToolResult(outcome: Outcome) {
  if (outcome.ok) return { content: [{ type: "text" as const, text: outcome.result.rendered }], structuredContent: outcome.result };
  return { content: [{ type: "text" as const, text: JSON.stringify({ error: outcome.error }) }], isError: true };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (index + ledger tests).

- [ ] **Step 5: Measure the standing cost and update the ledger (rule 2, same commit)**

Measure (ESM-safe — the dist output is ESM, so use dynamic `import()`, NOT `require()`, which throws `ERR_REQUIRE_ESM` on the Node-20 floor):

```bash
npx tsc && node --input-type=module -e "
import { countTokens } from './dist/src/tools/context-audit/tokens.js';
import { overrideLogTool } from './dist/src/tools/override-log/index.js';
import { contextAuditTool } from './dist/src/tools/context-audit/index.js';
const o = countTokens(JSON.stringify(overrideLogTool));
const c = countTokens(JSON.stringify(contextAuditTool));
console.log('override_log', o, 'context_audit', c, 'total', o + c);
"
```

Expected (per plan review, char-approx-v1): `override_log ≈ 381`, `context_audit 252`, `total ≈ 633` — well under 4000. Use the actual printed numbers.

Then, in `src/CONTEXT.md`, add an `override_log` row to the ledger table with the measured number, update the **Total** line to the measured combined figure, and note the measurement is `char-approx-v1 over JSON.stringify(overrideLogTool)`. (If the measured `override_log` value pushes the total anywhere near 4000, tighten the description/`inputSchema` field descriptions — but with `context_audit` at 252 there is ample headroom.)

- [ ] **Step 6: Add the `override_log` section to `src/API.md` (rule 8, same commit)**

In `src/API.md`, under "Tools (free, unauthenticated)":
- Update the tools table row for `override_log`: status **"Building"** (not "Shipped"), design doc `planning/designs/2026-08-27_override-log-design.md`.
- Add an `### override_log` subsection documenting: the input schema (verbatim from `index.ts`), the output/`structuredContent` shape (`score` / `findings` / `stats` / `rendered`, noting `outputSchema` is intentionally minimal with `findings`/`stats` as bare `{ type: "object" }` to hold rule-2 cost), the finding shape `{ id, category: "override_field_missing", severity, entry_index, message, evidence }` with severity keyed by field, the result shape (`content[0].text === structuredContent.rendered`), the error surface (`INVALID_OVERRIDES` for a non-array `overrides`; absence of fields is a finding, not an error), and the invariants (read-only/file-free, keyless/no-network, deterministic, tool-owns-rendering, stable-id-not-tamper-evidence).

- [ ] **Step 7: Run the full suite, then commit code + docs together**

Run: `npm test`
Expected: PASS (whole suite).

```bash
git add src/tools/override-log/index.ts \
        test/override-log/index.test.ts test/override-log/ledger.test.ts \
        src/API.md src/CONTEXT.md
git commit -m "feat(override_log): tool definition + handler; API.md section + ledger (rules 8, 2)"
```

---

### Task 6: Register the tool in the server

**Files:**
- Modify: `src/server.ts`
- Test: `test/server.test.ts`, `test/packaging.test.ts`

**Interfaces:**
- Consumes: `overrideLogTool`, `runOverrideLog`, `toCallToolResult` (Task 5).

- [ ] **Step 1: Update the failing tests (expect two tools + an override_log call)**

In `test/server.test.ts`, change the first test to expect two tools and assert both names are present:

```ts
test("server starts and lists two tools", async () => {
  const transport = new StdioClientTransport({ command: "node", args: ["dist/src/index.js"] });
  const client = new Client({ name: "b-a-mcp-test", version: "0.0.0" }, { capabilities: {} });
  await client.connect(transport);
  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  assert.deepEqual(names, ["context_audit", "override_log"]);
  await client.close();
});
```

Add a new test to `test/server.test.ts`:

```ts
test("server calls override_log over stdio and returns rendered + structuredContent", async () => {
  const transport = new StdioClientTransport({ command: "node", args: ["dist/src/index.js"] });
  const client = new Client({ name: "b-a-mcp-test", version: "0.0.0" }, { capabilities: {} });
  await client.connect(transport);
  const res: any = await client.callTool({
    name: "override_log",
    arguments: { overrides: [{ gate: "problem-fit", risk: "r", alternative: "a", decision: "d", acknowledged_by: "who", date: "2026-08-27" }] },
  });
  assert.ok(res.structuredContent, "structuredContent present");
  assert.equal(res.structuredContent.score, 100);
  assert.equal(res.content[0].text, res.structuredContent.rendered);
  await client.close();
});
```

In `test/packaging.test.ts`, update the installed-bin assertion (around line 44-46) to two tools:

```ts
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    assert.deepEqual(names, ["context_audit", "override_log"]);
```

(Also update the test title `"...lists one tool"` → `"...lists two tools"`, and in the comment on the current real line `// Run the installed binary over stdio and assert zero tools.` change the substring `zero tools` → `two tools`.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — list returns one tool (`override_log` not registered); the override_log stdio call returns `UNKNOWN_TOOL`.

- [ ] **Step 3: Register in `src/server.ts`**

```ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { contextAuditTool, runContextAudit, toCallToolResult } from "./tools/context-audit/index.js";
import { overrideLogTool, runOverrideLog, toCallToolResult as toOverrideResult } from "./tools/override-log/index.js";

export function createServer(): Server {
  const server = new Server(
    { name: "b-a-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [contextAuditTool, overrideLogTool] }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    if (req.params.name === contextAuditTool.name) {
      return toCallToolResult(await runContextAudit((req.params.arguments ?? {}) as { path?: string }));
    }
    if (req.params.name === overrideLogTool.name) {
      return toOverrideResult(runOverrideLog((req.params.arguments ?? {}) as { overrides?: unknown }));
    }
    return { content: [{ type: "text", text: JSON.stringify({ error: { code: "UNKNOWN_TOOL", message: `unknown tool: ${req.params.name}` } }) }], isError: true };
  });

  return server;
}
```

- [ ] **Step 4: Run the full suite to verify it passes**

Run: `npm test`
Expected: PASS — the whole suite, including the two-tool list, the override_log stdio call, and the unchanged UNKNOWN_TOOL test.

- [ ] **Step 5: Commit**

```bash
git add src/server.ts test/server.test.ts test/packaging.test.ts
git commit -m "feat(override_log): register tool in server (two tools live over stdio)"
```

---

## Self-Review

**Spec coverage:**
- Generator/validator, no file reads → Task 5 `runOverrideLog` (structured input only). ✓
- 6 required fields, rationale optional → Task 3 `REQUIRED_FIELDS` + tests. ✓
- Array → consolidated log → Task 3/4, input `overrides[]`. ✓
- Score = share fully documented, null on empty → Task 3 tests. ✓
- Severity high/medium map by field → Task 3 `SEVERITY_BY_FIELD` + test. ✓
- Entry id over identity fields, stable across non-identity edits → Task 3 tests; formula locked to `findingId` → Task 2 boundary test. ✓
- `finding.id = findingId("override_field_missing", <disc>, <field>)` pattern → Task 3 `validate.ts`. ✓
- Missing field never blocks; empty/whitespace = missing → Task 3 tests. ✓
- One category `override_field_missing`, field in evidence + entry_index → Task 3. ✓
- Error only for malformed input (`INVALID_OVERRIDES`) → Task 5 tests. ✓
- `gate` free-form (no unknown-gate finding) → no validation on gate value; nothing to add. ✓
- `date` presence-only (TBD-21) → `norm` presence check only; no format parse. ✓
- Result shape `content[0].text === rendered` → Task 5 `toCallToolResult` + test. ✓
- rendered: summary + per-entry + one-liner-with-alternative → Task 4 tests. ✓
- Rule 8 (API.md) + rule 2 (ledger), same commit as tool def → Task 5 steps 5–7. ✓
- Invariants (read-only/file-free, keyless, deterministic, tool-owns-rendering, stable-id-not-tamper) → design doc; realized across Tasks 2–5. ✓

**Placeholder scan:** none — every code and test step is concrete. (The only `TODO`/`TBD` reference is TBD-21, an intentional deferral documented in the tracker, not an unfinished plan step.)

**Type consistency:** `validateOverrides` returns `{ score, findings, stats, entries }` (Task 3), consumed by `renderOverrideLog({ score, stats, entries })` (Task 4) and `runOverrideLog` (Task 5). `RenderEntry` / `OverrideFinding` / `OverrideStats` names match across tasks. `stableId(a,b,c)` (Task 2) called consistently in Task 3. `overrideLogTool` / `runOverrideLog` / `toCallToolResult` names match between Task 5 and the Task 6 server import (aliased `toOverrideResult`). `Severity` imported type-only from `context-audit/types.js`.

---

## Notes for the executor

- `runOverrideLog` is synchronous (no IO); the server does not `await` it. This is intentional and differs from `runContextAudit` (async).
- Do NOT import `findingId` into `validate.ts` or `id.ts` — the duplication of the hash formula is deliberate and locked by the Task 2 boundary test only (test-time import). Importing it into production would recouple to `context_audit`'s `FindingCategory` type and fail typecheck on `"override_field_missing"`.
- Do NOT touch any `context_audit` source file. `Severity` is a type-only import; `findingId` is imported only in a test.
- After Task 6, before finishing: run `npm test` once more and confirm the count rose from 131 to the new total, and `npx tsc --noEmit` is clean.
