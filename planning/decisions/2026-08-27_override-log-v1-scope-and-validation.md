# Decision — `override_log` v1 scope and field validation

**Date:** 2026-08-27
**Gate:** Gate 2 (`/decisions`), following `superpowers:brainstorming` for `override_log` (Roadmap tool #2).
**Status:** RESOLVED (design-ready). One deferral stubbed as **TBD-21**.

---

## Decision

`override_log` is a **record generator/validator**, not a repo scanner. It takes override *events* as structured input and returns a canonical, rendered override **log** plus findings for any missing required field. It reads no repository files, requires no key, and makes no network call. It is the free tier's *reasoning* act (generate + render the record); `export_record` (paid) is the *persistence* act.

This record settles every call the intake surfaced. The owner ruled each one during brainstorming; this is the durable record of the why.

---

## TBD resolved / opened

- **No pre-existing TBD** blocked this tool — it is a new build.
- **TBD-21 opened** (stub-and-continue): whether `date` is validated as a real ISO-8601 date, or only checked for presence. v1 is **presence-only**; the format check is deferred. See "Open call 2" below and the Master TBD Tracker.

---

## Context

In the B&A build loop, every gate runs in **guidance-with-override** mode (`WORKFLOW.md` §"The loop"): on detecting a gap the gate states the specific risk, names the cheaper alternative, and — if the human proceeds anyway — **logs the override** rather than stopping. "The override is the audit artifact." `prompts/problem-fit.md:81` gives the canonical form: *"proceeded past [gate] at score N/8, low on [questions], acknowledged risk [X], on [date]."*

`override_log` turns those events into a canonical, timestamped, tamper-evident-once-persisted log. The Roadmap frames it as "largely template generation from the guidance-with-override model." The starter's "mirror `context_audit`" refers to its *conventions* (structured-error envelope, `{score/findings/stats/rendered}` result, read-only, tool-owns-rendering), not to a repo scan.

---

## Options considered

**Core shape.** (A) generator/validator — input is the override event; (B) repo auditor — scan the tree for override statements; (C) hybrid. **Chosen: A.** The free/paid boundary points at A: generating the rendered record is the free reasoning act, persisting it is the paid act (`export_record`). B misreads "mirror `context_audit`" as "scan like `context_audit`."

**Required fields.** (A) full model set of 6; (B) lean 4 (`alternative`/`acknowledged_by` optional); (C) rich 8 (+ `risk_severity`, `residual_risk`). **Chosen: A** — `gate, risk, alternative, decision, acknowledged_by, date` required; `rationale` optional. A guidance-with-override record with no stated *alternative* is not a real one (the model requires a named cheaper path), and `acknowledged_by` + `date` are the "authorized by [name], on [date]" compliance anchor. Lean drops the alternative that proves the model was applied; rich adds schema the model does not require in v1.

**Cardinality.** (A) array → consolidated log; (B) single event per call. **Chosen: A** — matches the name `override_log` and lets a session emit its whole override trail at once. The tool is stateless and persists nothing, so a running log cannot be maintained across calls; the array is how a full log is formed in one call.

**Entry id.** The free tool emits a stable id hashed over the entry's **discriminator** — its identity fields `gate + date + decision`, NUL-joined, `sha256`, first 12 hex chars — mirroring `context_audit`'s `findingId` (`src/tools/context-audit/score.ts:4`), which hashes a **stable discriminator, never the measured evidence** (`src/tools/context-audit/types.ts:23`). It is deterministic over the identity fields, so it stays constant as `risk` / `alternative` / `acknowledged_by` are later completed, and an *incomplete* entry (as long as it carries any of the three identity fields) still gets one. Collision occurs only when two overrides share all three identity fields — acceptable and honest. It is a **stable id** for reference, dedup, and as the key `export_record` supersedes a prior version against — **not** a tamper-evidence guarantee: the id travels with the record, so anyone holding it can recompute it. Tamper-evidence / unfakeability is the **paid tier's** property and the free tool must not assert it.

**Finding id.** Each missing-field finding is keyed with `findingId("override_field_missing", <entry discriminator>, <missing field name>)` — the same three-argument `findingId` shape (category slot `override_field_missing`, path slot the entry discriminator, discriminator slot the field name), so each finding is uniquely and stably keyed and survives re-runs while the gap persists. Exactly the `context_audit` finding-id pattern.

> **Amendment (2026-08-27, pre-plan reviewer catch).** The original #6/#7 hashed `sha256` over the NUL-joined **normalized field values** — the moving *evidence*. That inverts `context_audit`'s principle: the id would change on any field edit, so it could never be the stable dedup / `export_record` supersede key #6 claims (persistence could only ever create new rows, never supersede), and `finding.id` was left undefined. Corrected above: the id hashes a **stable discriminator, never the moving evidence**. Principle recorded for reuse.

**Score.** `100 × fully_documented / total_entries`, rounded; a single entry is "fully documented" iff all six required fields are present (non-empty after trim). **`null` when `overrides` is empty** — never 100 over an empty denominator (mirrors `context_audit`'s null-on-empty-population rule).

**Severity map.** High: `risk`, `alternative`, `date`, `acknowledged_by` — without any of these the record is not a real, auditable guidance-with-override entry. Medium: `gate`, `decision` — context, less load-bearing.

**Missing-field behavior.** All fields are **schema-optional** so the tool never hard-refuses; a missing required field becomes a **finding**, not an error — guidance-with-override applied to the tool itself. Empty/whitespace is treated as missing (trimmed). One finding per missing required field, single category `override_field_missing`, the field name carried in `evidence` and the entry position in `entry_index`.

**Error surface.** The structured error envelope fires only for genuinely malformed input (`overrides` not an array) → `INVALID_OVERRIDES`. Absence of fields is a finding, never an error (mirrors `context_audit`: absence is scored, not thrown).

---

### Open call 1 — `gate` value: free-form vs. constrained to the five loop gates

**RESOLVED: free-form string (v1).** Overrides are not confined to the five loop gates (`problem-fit`/`intake`/`decisions`/`design-doc`/`handoff`). The guidance-with-override model is a general gate mode; domain gates outside the loop (e.g. the mine-verification domain gates described in the owner's `build_loop_explained`) take overrides at non-loop checkpoints. Constraining `gate` to the five names would wrongly reject legitimate overrides. No unknown-gate finding in v1.

### Open call 2 — `date` validation: presence-only vs. ISO-format check

**RESOLVED for v1: presence-only. Format check deferred → TBD-21.** Nothing in the tool computes on `date`; it is a rendered anchor. A missing `date` is a high-severity finding (it is half the compliance anchor); a *malformed* `date` is not caught in v1. Validating it as a real ISO-8601 date (and rendering it canonically) is a v1.1 polish, stubbed as TBD-21 so a future session does not re-discover and guess it.

---

## Rationale

Every decision follows from two fixed constraints: the **free/paid boundary** (free = reasoning, paid = record — so the free tool generates and renders but never persists or asserts tamper-evidence) and the **guidance-with-override model** (a complete record must carry the stated risk, the named alternative, and the authorized-by/date anchor — and the tool must *guide, not block*, mirroring the gates it records). The result shape and invariants mirror `context_audit` so the two tools present one surface and historical `export_record` artifacts stay comparable.

---

## Consequences

- Build proceeds to Gate 3 (`/design-doc`) with no OPEN decision.
- New tool triggers **rule 8** (`src/API.md` gains the `override_log` section, same commit) and **rule 2** (context-budget ledger re-measured with an `override_log` row; total stays under ~4k). The `src/API.md` tools-table status is **"Building"** on the branch, flipping to "Shipped" only at trunk (`finishing-a-development-branch`).
- `prompts/` is untouched → `.claude/commands/` is not regenerated (rule 1).
- **TBD-21** carries the deferred ISO-format `date` check; `override_log` ships v1 with presence-only validation.
- If a later gate surfaces a missed decision, return here (Gate 2) to log it before continuing.
