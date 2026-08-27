# SESSION_HANDOFF.md

**Purpose.** Verified continuity between Claude Code sessions. Every field below was checked from inside the repo this session, never asserted or carried forward. When this conflicts with claude-mem recall, **this file wins**. Updated at every `/handoff`.

---

## Repo state — verified 2026-08-27

- **`main` HEAD:** `a400356` (`docs: task-observer backlog review — distill Obs 22-28 into WORKFLOW.md (#61)`). Working tree **clean**. **`override_log` is built, merged, and verified on trunk** (PR #59, landed at `26c30cf`); the session's doc closeout then landed on top: **`/handoff`** (PR #60 — API.md status → Shipped, Roadmap, CLAUDE.md checklist, this file) and the **task-observer backlog review** (PR #61 — Obs 22–28 distilled into WORKFLOW.md).
- **Tests:** **158 / 158 pass**, `tsc --noEmit` clean, **Node v20+** (engines floor; developed on v25). The count rose 131 → 158 this session (+27: 24 in `test/override-log/` + 3 changed/added server & packaging assertions).
- **Merge verification (Obs 20):** PR #59 landed by **squash**; verified by **content on trunk** — all five `src/tools/override-log/*.ts` and five `test/override-log/*.test.ts` present, `overrideLogTool` wired in `src/server.ts` (import + list + handler), `### override_log` section in `src/API.md`, ledger `Total: 633` in `src/CONTEXT.md`, `TBD-21` in `src/TDD.md`; suite re-run on `main` = 158. Never by branch-SHA ancestry (`--is-ancestor` fails by design on a squash).
- **Open PRs:** the `docs/handoff-2026-08-27-override-log` PR (this handoff). `feat/override-log` merged and deleted.
- `src/API.md` parses (**7/7** JSON blocks) and matches the code as committed (both tools documented; `override_log` schema mirrors `index.ts`). No `src/ERD.md` (no database). **Context-budget ledger = 633 / ~4000** (rule 2 — `context_audit` 252 + `override_log` 381; a test asserts the combined total < 4000). `prompts/` untouched → `.claude/commands/` not regenerated (rule 1).

---

## Active design doc

- **`override_log` — canonical override-record generator:** `planning/designs/2026-08-27_override-log-design.md` — **approved + BUILT + SHIPPED (complete).** A free/keyless generator/validator (Roadmap tool #2, the differentiation hook). Turns guidance-with-override *events* into a canonical rendered override log with a completeness `score` and one finding per missing required field. Reads no files, no network, no key.
- **Plan (executed):** `docs/superpowers/plans/2026-08-27-override-log.md` — 6 TDD tasks, executed inline via `superpowers:executing-plans`; adversarially plan-reviewed before build (one Node-20 ESM fix applied) and code-reviewed after (verdict Ready-to-merge; minors applied).
- **Decision record:** `planning/decisions/2026-08-27_override-log-v1-scope-and-validation.md` — the Gate 2 ledger + the pre-plan amendment (entry-id basis).

---

## Decisions + TBDs

### Recorded this session (override_log v1)

All in `planning/decisions/2026-08-27_override-log-v1-scope-and-validation.md`. No pre-existing TBD was resolved; one was opened.

- **Core shape:** record generator/validator (not a repo scanner). "Mirror `context_audit`" = mirror its *conventions* (structured-error envelope, `{score/findings/stats/rendered}`, read-only, tool-owns-rendering), not a repo scan.
- **Required fields (6):** `gate, risk, alternative, decision, acknowledged_by, date`; `rationale` optional. All fields schema-*optional* — a missing required field is a **finding**, not a hard refusal (guidance-with-override applied to the tool itself). Empty/whitespace = missing.
- **Cardinality:** input `overrides[]` array → one consolidated log.
- **Score:** `round(100 × fully_documented / total)`; **null on empty array**.
- **Severity by FIELD, not category:** high = `risk`/`alternative`/`date`/`acknowledged_by`; medium = `gate`/`decision`. (Deliberately NOT `context_audit`'s category-keyed `SEVERITY_BY_CATEGORY` — all findings share the one category `override_field_missing`.)
- **Entry id (amended pre-plan):** stable hash over the **identity fields** `gate|date|decision`, never the moving evidence, so it survives `risk`/`alternative`/`acknowledged_by` being completed. `finding.id = stableId("override_field_missing", <entry discriminator>, <field>)`. A dedup / `export_record` supersede key — **NOT tamper-evidence** (the id travels with the record; unfakeability is the paid tier's property). `stableId` is formula-identical to `context_audit`'s `findingId` (locked by a boundary test) but is **not imported** (keeps `override_log` decoupled from `FindingCategory`).
- **Error surface:** structured `INVALID_OVERRIDES` envelope only for a non-array `overrides`; absence of fields is a finding, never an error.
- **`gate`:** free-form v1 (overrides fire at non-loop gates too).

### Open TBDs

- **TBD-21 (opened this session, stub) — `override_log` `date` format validation.** v1 checks `date` for **presence only**; ISO-8601 format validation + canonical render is the deferred v1.1 item. Nothing blocked (a missing `date` is already a high `override_field_missing` finding; a malformed one renders verbatim). `src/TDD.md`; decision record Open call 2. Resolve at a later `/decisions`; no guess (rule 7).
- **`context_audit` §4-gap `/decisions` items (design §9):** component-manifest detection, test-harness-fixture detection, bare-`docs/**` disposition — each tightens the `orphans` sub-score and is the trigger to **raise the provisional `orphans:1`** (TBD-10 stays Open only for that raise). A `context_audit` refinement, not a new tool. Plus design §9 item 6 (the D1 nested-under-unreached-directory-target residual, edge case B — accepted in v1).
- **TBD-12** — source-vs-test significance basis, `SOURCE_EXTS`, coverage-finding emission still open (`MIN_FILES=5` resolved).
- **TBD-2 / TBD-4 / TBD-5 / TBD-9 / TBD-15** — packaging / notices / pricing / `doc_drift` scope / v1.1 root.method. Open, untouched.

---

## Remaining work

- **`doc_drift` — the next free tool (Roadmap tool #3, the retention hook).** **Least bounded** — its scope is **TBD-9** (which frameworks and migration formats are in v1), still Open, and the Roadmap flags it may **cut to Phase 2** if it resists. This is a full feature loop that must **start by resolving TBD-9** (`brainstorming` → `/decisions` on TBD-9) before any design. Free/keyless (rule 3), same conventions as the two shipped tools.
- **`context_audit` §4-gap refinements** — the three `/decisions` items above; each tightens `orphans` and is the trigger to raise the provisional `orphans:1` weight. Lower priority than `doc_drift`; a refinement, not a new tool. Do NOT reopen the closed `context_audit` TBDs (10 done-provisional / 11 / 12-MIN_FILES / 14 / 16 / 18 / 19 / 20).
- **Phase-1 release** — `LICENSE` + `THIRD_PARTY_NOTICES` final + `npm publish` dry-run. **Blocked on TBD-2 / TBD-4** (bundled-component license confirmations + the ICM paraphrase call — owner rulings / external confirmation). Not fully autonomous.
- **Docs:** current on trunk once this handoff PR merges (API.md both tools `Shipped` + 7/7 JSON, ledger 633, `src/TDD.md` TBD-21, `planning/Roadmap.md` tool #2 status, `CLAUDE.md` checklist ticked, README unchanged). Nothing outstanding.

---

## Context not in the docs

- **The "mirror `context_audit`" trap.** The prior starter said "mirror `context_audit`," which read two ways: mirror its *conventions* vs. mirror its *shape* (scan the repo). It means conventions — `override_log` is a generator over structured input, not a scanner. (Logged as task-observer Obs 26: a "mirror X" instruction must name which axes are mirrored.)
- **Borrowed-primitive-inverted-invariant (Obs 27).** The design first reused `context_audit`'s id hash but fed it the *field values* (the moving evidence) — inverting `findingId`'s documented contract ("stable discriminator, never the measured evidence"). An owner review caught it pre-plan; the fix hashes the identity fields. `stableId` is a deliberate *duplication* of the formula (not an import) with a boundary test locking equivalence — the WORKFLOW Obs 5 "if duplication is deliberate, cross-reference both sides + boundary test" escape hatch. This is why touching no `context_audit` source was possible.
- **Verification commands must run on the declared runtime floor (Obs 28).** The plan's ledger-measurement one-liner used `require()` of ESM — fine on the dev machine's Node 25, throws `ERR_REQUIRE_ESM` on the stated Node-20 floor. The plan review caught it; the shipped command uses `node --input-type=module` dynamic `import()`.
- **Measured ledger cost:** `override_log` = **381** char-approx-v1 tokens, combined **633 / ~4000**. Ample headroom for `doc_drift`.
- **task-observer backlog: reviewed and cleared 2026-08-27.** All of Obs 22–28 (26/27/28 logged this session) were distilled into WORKFLOW.md's "Review-derived checklists" and marked ACTIONED (PR #61); backlog now **0 OPEN**. Obs 26's deeper fix — encoding "name which axes" into the `/handoff` next-session-starter guidance in `prompts/handoff.md` — was **declined by the owner for now** and kept as the WORKFLOW.md rule (a shipped-prompt change if ever revisited, triggering rule 1 regeneration).

---

## Next-session starter

> **Build `doc_drift` — the next free tool (Roadmap tool #3, the retention hook) — but its scope is undecided, so resolve that FIRST.** `override_log` is done and on trunk; do not reopen it. Read `CLAUDE.md`, this file, `WORKFLOW.md`, `planning/Roadmap.md` (tool ordering + the `doc_drift` line + the **Phase-2 cut** caveat), `src/CONTEXT.md` (conventions + the context-budget ledger, now **633 / ~4000**), and `src/API.md` (how the two shipped tools are shaped — mirror their *conventions*: structured-error envelope, `{score/findings/stats/rendered}` result, read-only, tool-owns-rendering; `override_log` is the closest template for a keyless tool). Confirm `git rev-parse HEAD` and `npm test` (expect **158**) first.
>
> **`doc_drift` is FREE and keyless (rule 3)** — never a key check, never a B&A-infrastructure call; that boundary is `export_record`'s alone. It is the **least-bounded** roadmap tool: **TBD-9 (its v1 scope — which frameworks and migration formats) is Open and must be resolved before any design.** The Roadmap explicitly permits **cutting `doc_drift` to Phase 2** and shipping two tools if it resists — surface that option to the owner early.
>
> Sequence: **`superpowers:brainstorming`** (intent/scope/shape — and the go/defer-to-Phase-2 call) → **`/decisions`** (Gate 2 — resolve **TBD-9** and any other open call; stub new TBDs in `src/TDD.md`) → **`/design-doc`** (Gate 3, WHAT & WHY, to `planning/designs/`) → **`superpowers:writing-plans`** (get it plan-reviewed) → **`superpowers:executing-plans`** or **`superpowers:subagent-driven-development`** under **`superpowers:test-driven-development`** → **`superpowers:requesting-code-review`** → **`superpowers:finishing-a-development-branch`** (PR, squash, verify content on trunk — Obs 20). **A new tool triggers rule 8 (`src/API.md` gains its section, same commit — flip its tools-table status to `Building` on the branch, `Shipped` only at trunk) AND rule 2 (re-measure the ledger; the combined total must stay under ~4k — a test asserts it).** Regenerate `.claude/commands/` only if `prompts/` changes (it should not for a tool).
>
> **If the owner prefers not to build `doc_drift` yet**, the two lower-priority alternatives are: (a) the three `context_audit` **§4-gap `/decisions` items** (component-manifest / test-fixture / bare-`docs/**`) — each tightens `orphans` and is the trigger to **raise the provisional `orphans:1`** (TBD-10); a `context_audit` refinement, its own `/decisions`→design→TDD loop; or (b) **Phase-1 release prep** — blocked on owner-gated **TBD-2 / TBD-4** (bundled-component notices), so not fully autonomous. **Do NOT reopen `context_audit`'s closed TBDs (10-provisional / 11 / 12-`MIN_FILES` / 14 / 16 / 18 / 19 / 20)** or `override_log`.
