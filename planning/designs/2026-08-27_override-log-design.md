# `override_log` — canonical override-record generator

**One-line summary.** A free, keyless MCP tool that turns override *events* (a gate proceeded past a flagged gap) into a canonical, rendered override **log** with a completeness score and per-gap findings — the free tier's *reasoning* act, which `export_record` (paid) later *persists*.

---

## Motivation

The B&A build loop's differentiator is **guidance-with-override** (`WORKFLOW.md` §"The loop"): no gate silently refuses to advance. On detecting a gap it states the specific risk, names the cheaper alternative, and — if the human proceeds anyway — **logs the override** rather than stopping. "The override is the audit artifact."

Today that artifact is authored by hand: a free-form sentence dropped into a handoff (`prompts/problem-fit.md:81` gives the canonical form — *"proceeded past [gate] at score N/8, acknowledged risk [X], on [date]"*). Hand-authoring means the record drifts in shape, silently omits fields (no stated alternative, no acknowledger, no date), and cannot be checked or persisted consistently. The discipline the loop sells is exactly the discipline the record fails to enforce on itself.

`override_log` closes that gap. It takes override events as structured input and returns one canonical, timestamped log — every entry in a fixed shape, every missing required field flagged, a completeness score over the set. It is **the differentiation hook** (Roadmap tool #2): the tool that makes the loop's central promise — every override logged — concrete and verifiable.

**Who it serves.** (1) The developer running the loop inside their own Claude Code session: a consistent, complete override trail, with gaps surfaced instead of silently missing. (2) B&A's lead-generation / authority goal: the tool embodies the loop's discipline and creates the natural upsell — the free tool *generates and renders* the record (reasoning); `export_record` (paid) *persists* it as a versioned, timestamped, tamper-evident artifact (the record).

**Why now.** `context_audit` has stopped moving — its TBD cluster (10/11/12-MIN_FILES/14/16/18/19/20) is closed and verified on trunk, and the README true-sample is shipped. `override_log` is the next Roadmap item and, per the Roadmap, "largely template generation from the guidance-with-override model" — well-scoped for a single build loop.

---

## Architecture

**Surface.** One MCP tool, `override_log` (snake_case), registered through `src/server.ts` alongside `context_audit`. Code lives in a single directory, `src/tools/override-log/`, split by responsibility (tool definition + handler, types, field validation, markdown rendering) so each unit has one clear purpose and can be reasoned about in isolation.

**Input.** A single object whose only schema-required key is `overrides`, an array of override *events*:

```
{ "overrides": [ {
    "gate": "problem-fit",
    "risk": "score 2/8, low on data-readiness",
    "alternative": "run the paid Scorecard before committing",
    "decision": "proceed to intake anyway",
    "acknowledged_by": "T. Alexander",
    "date": "2026-08-27",
    "rationale": "client fixed timeline; accepts the risk"
  } ] }
```

Each event's seven fields are **all schema-optional strings**. This is deliberate: the tool must never hard-refuse a call for a missing field — a missing *required* field becomes a finding, not an error. That is guidance-with-override applied to the tool itself: it guides, it does not block. Six fields are *required for a complete record* (`gate`, `risk`, `alternative`, `decision`, `acknowledged_by`, `date`); `rationale` is genuinely optional and its absence is never faulted.

**Processing (per event).** Normalize each field (trim; empty-after-trim counts as absent). Determine which of the six required fields are present. An event is **fully documented** iff all six are present. Assign a **stable entry id** by hashing the entry's *discriminator* — its identity fields `gate + date + decision`, NUL-joined — with `sha256`, first 12 hex characters. This mirrors `context_audit`'s `findingId` (`src/tools/context-audit/score.ts:4`), which hashes a **stable discriminator, never the measured evidence** (`src/tools/context-audit/types.ts:23`): the id must stay constant as `risk` / `alternative` / `acknowledged_by` are later completed, so it can serve as the dedup key and the key `export_record` supersedes a prior version against. (Hashing the moving field values instead would change the id on every edit — the id could then only ever create new rows, never supersede.) An incomplete event still receives an id as long as it carries any identity field; two overrides collide only when they share all of `gate + date + decision`, which is acceptable and honest. Emit one finding per missing required field.

**Output** (`structuredContent`, mirroring `context_audit`'s conventions):

- `score` — `number | null`. `100 × fully_documented / total`, rounded. **`null` when `overrides` is empty** — a completeness rate over an empty set is never reported as 100 (the same null-on-empty-population rule `context_audit` uses).
- `findings[]` — each `{ id, category, severity, entry_index, message, evidence }`. `category` is `override_field_missing` (all missing-field findings share it). `id` is `findingId("override_field_missing", <entry discriminator>, <missing field name>)` — the same three-argument `findingId` shape (category slot, path slot = the entry discriminator, discriminator slot = the field name), so each finding is uniquely and stably keyed and survives re-runs while the gap persists. `severity` is keyed by the **missing field**, not by category — `context_audit`'s category-keyed `SEVERITY_BY_CATEGORY` would give every one of these findings a single severity, which is wrong here: **high** for `risk` / `alternative` / `date` / `acknowledged_by` (without any of these the record is not an auditable guidance-with-override entry — `acknowledged_by` + `date` are the "authorized by [name], on [date]" compliance anchor), **medium** for `gate` / `decision`. `evidence` carries the missing field's name; `entry_index` its position in the input array. Findings are emitted in a deterministic order.
- `stats` — `{ overrides_total, fully_documented, incomplete, fields_missing_total }`.
- `rendered` — a tool-built markdown override log: a summary header (counts + completeness %) followed by one block per entry (its id, the verbatim field values, explicit flags for any missing field, and a canonical one-line override sentence that **includes the `alternative`** — risk *plus* the named cheaper path is the guidance-with-override signal, so the one-liner carries it even though `problem-fit.md:81`'s shorthand form omits it). The tool owns this rendering; the agent displays it verbatim and never re-summarizes it.

**Result shape.** Both halves ride in one `CallToolResult`: the full JSON object as `structuredContent`, and `rendered` also as the first `text` content block (`content[0].text === structuredContent.rendered`) — the always-displayable surface for a text-only client. The declared `outputSchema` is kept intentionally minimal (nested shapes declared as bare `{ type: "object" }`), exactly as `context_audit` does, to hold the standing tool-definition cost within the ~4k-token budget (rule 2).

**Error surface.** The standard structured envelope — `{ "error": { "code", "message", "detail" } }` as a `text` block with `isError: true` and no `structuredContent` — fires only for genuinely malformed input (`overrides` absent or not an array → code `INVALID_OVERRIDES`). Absence of *fields* is never an error; it is scored and flagged as findings.

**Invariants** (the same class of contract as `context_audit`'s):

- **Read-only, and file-free** — the tool reads no repository files at all on its normal path; it takes structured input and returns structured output.
- **Keyless, no network** — free/paid boundary (rule 3): `override_log` never checks a key and never touches B&A infrastructure. Persistence and tamper-evidence are `export_record`'s alone.
- **Stateless / deterministic** — same input in, same output out. Entries render in input order (the caller's log order is meaningful); findings are sorted deterministically.
- **Tool owns rendering** — `rendered` is built by the tool from the structured result, never narrated by the agent.
- **Stable severity scale** — reuses the fixed five-level `severity` *enum* (`info`/`low`/`medium`/`high`/`critical`) so historical `export_record` artifacts stay comparable — but maps to it **by missing field**, not by category (unlike `context_audit`'s category-keyed `SEVERITY_BY_CATEGORY`).
- **Stable id, not tamper-evidence** — the entry id hashes the entry's identity fields (`gate + date + decision`), a stable discriminator, never the moving field values; it is a reference/dedup key and the key `export_record` supersedes against. It is *not* a tamper-evidence guarantee: the id travels with the record and anyone holding it can recompute it. Unfakeability is the paid tier's property; the free tool does not assert it.

### Deliberately skipped

- **Reading or scanning any repository files** — the rejected "auditor" shape. `override_log` is a generator/validator over structured input.
- **Persisting, writing, or caching the log anywhere** — `export_record`'s job (rule 3); the free tool renders in-session only.
- **ISO-8601 `date` format validation and canonical date rendering** — deferred to v1.1 (**TBD-21**). v1 checks `date` for presence only; a malformed date renders verbatim.
- **Constraining `gate`** to the five loop gates, or emitting an unknown-gate finding — `gate` is free-form (overrides fire at non-loop gates too).
- **`risk_severity` / `residual_risk` fields** (the "rich" set) — not required by the v1 model.
- **Weak-field / vagueness detection** — a present-but-thin `risk` or `alternative` passes v1; only presence is checked.
- **Automatic dedup or merge across the array** — the stable id *enables* dedup downstream, but v1 renders every supplied entry as given.
- **Any MCP prompt-surface change or `.claude/commands/` regeneration** — `prompts/` is untouched (rule 1).

---

## Decisions

Carried verbatim from the Gate 2 ledger (`planning/decisions/2026-08-27_override-log-v1-scope-and-validation.md`).

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Core shape | Record generator/validator (not a repo scanner) |
| 2 | Required fields | Full 6 — `gate, risk, alternative, decision, acknowledged_by, date`; `rationale` optional |
| 3 | Cardinality | `overrides[]` array → one consolidated log |
| 4 | Score semantics | `100 × fully_documented / total`; `null` on empty array |
| 5 | Severity map | High: `risk, alternative, date, acknowledged_by`; medium: `gate, decision` |
| 6 | Entry id framing | Stable id (ref/dedup + `export_record` supersede key), hashed over the entry **discriminator** — identity fields `gate + date + decision`, NOT the moving field values — so it survives `risk`/`alternative`/`acknowledged_by` being completed; NOT tamper-evident; "unfakeable" reserved for the paid tier |
| 7 | id primitive | Mirror `context_audit`'s `findingId` — hash a **stable discriminator, never the evidence**. Entry id = `sha256(gate\0date\0decision).slice(0,12)`; `finding.id = findingId("override_field_missing", <entry discriminator>, <missing field name>)` |
| 8 | Missing field never blocks | All fields schema-optional; gaps become findings, not errors |
| 9 | Empty/whitespace = missing | Trim; empty counts as missing |
| 10 | Finding granularity | One finding per missing required field; category `override_field_missing`, field in `evidence` + `entry_index` |
| 11 | `rationale` absence | Never a finding (optional field) |
| 12 | Entry ordering | Input order preserved; findings sorted deterministically |
| 13 | Error surface | Structured envelope only for malformed input (`overrides` not an array → `INVALID_OVERRIDES`); else always a result |
| 14 | `gate` value | Free-form v1 (overrides fire at non-loop gates too) |
| 15 | `date` validation | Presence-only v1; ISO-format check deferred |
| 16 | File layout | `src/tools/override-log/{index,types,validate,render}.ts` |

**Stubbed TBD.**

- **TBD-21** — `override_log` `date` format validation. v1 validates `date` for presence only; ISO-8601 format validation + canonical rendering is the deferred v1.1 item. Nothing blocked in v1 (a missing `date` is already a high finding; a malformed one renders verbatim). Recorded in the Master TBD Tracker (`src/TDD.md`).

---

## Docs affected

Names only — the changes themselves are the build phase's work, written in the same commit as the code they bind to.

- **`src/API.md`** (rule 8, same commit as code) — add the `override_log` tool section (input schema, output/`structuredContent` shape, result shape, error surface, invariants). Set the tools-table status to **"Building"** on the branch; it flips to **"Shipped"** only at trunk (`finishing-a-development-branch`).
- **`src/CONTEXT.md`** (rule 2, same commit as code) — add an `override_log` row to the context-budget ledger, measured with the same char-approx-v1 method; update the total and confirm it stays under ~4k.
- **`src/TDD.md`** — already updated this gate (TBD-21 stubbed). Its row updates again only when TBD-21 later resolves.
- **`planning/Roadmap.md`** — Phase-1 build-order item #2 (`override_log`) status line, updated at `/handoff` when the tool lands.
- **`CLAUDE.md`** — the Phase-1 checklist `override_log` item, ticked at completion (at `/handoff`).
- **`SESSION_HANDOFF.md`** — rewritten at `/handoff` for the next session's continuity, not now.

`prompts/` is untouched, so `.claude/commands/` is **not** regenerated (rule 1).
