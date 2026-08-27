# SESSION_HANDOFF.md

**Purpose.** Verified continuity between Claude Code sessions. Every field below was checked from inside the repo this session, never asserted or carried forward. When this conflicts with claude-mem recall, **this file wins**. Updated at every `/handoff`.

---

## Repo state — verified 2026-08-27

- **`main` HEAD:** `fb158fc` (`feat(doc_drift): schema-of-record drift differ (free tool #3) (#65)`), with this handoff PR on top. Working tree clean once this handoff commits. **`doc_drift` is built, merged, and verified on trunk** (PR #65, squash). **All three free tools (`context_audit`, `override_log`, `doc_drift`) are now shipped — the free tier's reasoning surface is feature-complete.**
- **Tests:** **193 / 193 pass**, `tsc` clean, **Node v20+** (engines floor; developed on v25). The count rose 158 → 193 this session (+35: five new `test/doc-drift/*.test.ts` files — id 4, diff 13, analyze 7, render 4, index 6 — plus `server.test.ts`/`packaging.test.ts` updated to three tools and a `doc_drift` stdio call, and `override-log/ledger.test.ts` extended to assert the three-tool combined budget).
- **Merge verification (Obs 20):** PR #65 landed by **squash**; verified by **content on trunk** — all six `src/tools/doc-drift/*.ts` and five `test/doc-drift/*.test.ts` present, `docDriftTool` wired in `src/server.ts` (import + list + handler), `### doc_drift` section in `src/API.md`, ledger `Total: 1023` in `src/CONTEXT.md`, `TBD-9` resolved and `TBD-22/23/24` present in `src/TDD.md`; suite re-run on `main` = 193. Never by branch-SHA ancestry (`--is-ancestor` fails by design on a squash).
- **Open PRs:** this handoff PR (`docs/handoff-2026-08-27-doc-drift`). `feat/doc-drift` merged and deleted.
- `src/API.md` matches the code as committed (all three tools documented; `doc_drift` schema mirrors `index.ts`). No `src/ERD.md` (no database). **Context-budget ledger = 1023 / ~4000** (rule 2 — `context_audit` 252 + `override_log` 381 + `doc_drift` 390; `test/override-log/ledger.test.ts` asserts the combined total < 4000). `prompts/` untouched → `.claude/commands/` not regenerated (rule 1).

---

## Active design doc

- **`doc_drift` — schema-of-record drift differ:** `planning/designs/2026-08-27_doc-drift-design.md` — **approved + BUILT + SHIPPED (complete).** A free/keyless **pure structural differ** over a caller-supplied `{declared, canonical}` JSON-Schema pair (array → one consolidated report). Reads no files, no network, no key. The impure "obtain the canonical truth" step is relocated to the calling agent — that is what keeps the tool framework-agnostic and read-only.
- **Plan (executed):** `docs/superpowers/plans/2026-08-27-doc-drift.md` — 6 TDD tasks. Tasks 1–2 ran inline (`executing-plans`); Tasks 3–6 via `subagent-driven-development` (fresh implementer per task, per-task review, whole-branch review) after an owner mid-run review. Adversarially plan-reviewed pre-build (2 criticals fixed); per-task reviews 6/6 clean; whole-branch review verdict **Ready-to-merge**, zero Critical/Important.
- **Decision record:** `planning/decisions/2026-08-27_doc-drift-v1-scope-and-diff-sides.md` — the Gate 2 ledger (D1–D13), the two scoping Findings, and the Gate-3 review addenda.

---

## Decisions + TBDs

### Recorded this session (doc_drift v1)

All in `planning/decisions/2026-08-27_doc-drift-v1-scope-and-diff-sides.md`. **TBD-9 resolved**; **TBD-22/23/24 opened**.

- **Diff-sides:** provided/inline — the caller supplies both schemas (an array of `{label?, declared, canonical}` pairs). Read-files **rejected** (Findings 1–2: B-A-MCP emits no committed canonical artifact — schemas are TS literals; and the doc deliberately diverges from the minimized emitted schema).
- **Drift kinds (4) + shape:** `field_only_in_doc` (high), `field_only_in_canonical` (medium), `type_mismatch` (high), `required_drift` (high both directions), plus object-vs-leaf shape drift (emits `type_mismatch`). Severity by drift-kind.
- **Opaque `{type:object}`-no-`properties` = wildcard, excluded from the score denominator entirely** — an all-opaque/minimized schema scores `null`, never a fabricated 100 (the anti-gaming guarantee; owner's Gate-3 MUST-FIX).
- **Score:** `round(100 × in_sync / fields_compared)`, **null** on empty denominator.
- **Boundary validation:** `INVALID_PAIRS` for a non-array `pairs`, a non-object pair member, or a present-but-non-object `declared`/`canonical`; an **absent** declared/canonical stays valid; an **empty** `pairs` array is valid → `score: null`.
- **`stableId`:** duplicated (not imported), boundary-tested against `context_audit.findingId`; discriminator = identity (category + label + field-path), never the moving evidence.

### Open TBDs

- **TBD-22 (opened) — `doc_drift` canonical self-discovery / read-files mode.** v1.1; nothing blocked (provided/inline ships).
- **TBD-23 (opened) — `doc_drift` orientation walk-test.** Redundant with `context_audit`'s orphans/coverage/routing_drift until proven distinct.
- **TBD-24 (opened) — `doc_drift` framework migration/route parsing.** Phase 2 (the unbounded axis the v1 narrowing avoids).
- **TBD-21 — `override_log` `date` format validation.** v1.1 (presence-only ships).
- **`context_audit` §4-gap `/decisions` items** (component-manifest / test-fixture / bare-`docs/**` detection) — each tightens `orphans` and is the trigger to **raise the provisional `orphans:1`** (TBD-10 stays Open only for that raise). A `context_audit` refinement, not a new tool.
- **TBD-12** (rest — source-vs-test significance basis, `SOURCE_EXTS`, coverage-finding emission) still open.
- **TBD-2 / TBD-4 / TBD-5 / TBD-15** — packaging / notices / pricing / v1.1 `root.method`. Owner-gated / untouched.

---

## Remaining work

- **Phase-1 RELEASE — the next milestone now that all three free tools ship.** `LICENSE` + `THIRD_PARTY_NOTICES` final + `npm publish` dry-run from a fresh checkout. **BLOCKED on TBD-2 / TBD-4** (bundled-component license confirmations + the ICM paraphrase call — owner rulings / external confirmation). **Not fully autonomous** — surface the two owner-gated TBDs early.
- **`context_audit` §4-gap refinements — the fully-autonomous alternative.** The three `/decisions` items above; each tightens `orphans` and is the trigger to raise the provisional `orphans:1` weight (TBD-10). A `context_audit` refinement (its own `brainstorming`→`/decisions`→`/design-doc`→build loop), not a new tool. **Do NOT reopen `context_audit`'s closed TBDs** (10-provisional / 11 / 12-`MIN_FILES` / 14 / 16 / 18 / 19 / 20) or any shipped tool.
- **`doc_drift` v1.1** — TBD-21 / 22 / 23 / 24 as demand appears (each its own loop).
- **Docs:** current on trunk once this handoff PR merges (API.md all three tools `Shipped` + `doc_drift` §, ledger 1023, Roadmap tool #3 shipped + "all three free tools shipped", `CLAUDE.md` checklist ticked, `src/TDD.md` TBD-9 resolved + 22/23/24). Nothing outstanding.

---

## Context not in the docs

- **The "two findings" scoping pre-flight (task-observer Obs 30).** Before choosing an input shape, two cheap checks retired the read-files candidate: **Finding 1** — B-A-MCP emits no committed machine-readable canonical artifact (the schemas are TS literals in each tool's `index.ts`), so the canonical truth can't be self-discovered without executing (MCP-specific, not read-only) or parsing source (the rabbit hole). **Finding 2** — `src/API.md` deliberately over-specifies relative to the emitted `tools/list` schema (which is minimized to hold the rule-2 budget), so a diff against the emitted schema would false-fire on the intentional minimization. Provided/inline absorbs both: the caller picks the meaningful pair.
- **The score contradiction the owner caught at Gate-3 review.** Opaque field-paths are excluded from the denominator **entirely** (not scored in-sync) — scoring them in-sync would let a minimized schema read 100% and reward the exact Finding-2 minimization the wildcard rule exists to neutralize. Locked by discriminating tests (`diff.test.ts` opaque-root/opaque-child; `analyze.test.ts` all-opaque → null).
- **Owner mid-run review (post-Task-2) — A/B/C.** (A) reject a present-but-non-object `declared`/`canonical` at the `runDocDrift` boundary — a string-encoded schema would coerce to `{}` and misreport as all-drift; `analyze()` stays defensively lenient internally. (B) implement the object-vs-leaf shape-drift guard (`diff.ts` `shape()` + `dHas !== cHas` branch), don't merely document it. (C) verified `Severity` is imported from `context-audit/types.ts` the **same** way `override_log` does — mirror, not a new coupling.
- **Execution shape.** Tasks 1–2 inline under `executing-plans`; owner then asked to resume via `subagent-driven-development` for Tasks 3–6 (haiku implementers for the transcription tasks 3–4, sonnet for the multi-file tasks 5–6, sonnet reviewers, opus whole-branch review). No rulings were made during the SDD loop — pre-flight scan clean, all six task reviews clean, no breaker.
- **`by_kind` may exceed `drifted`** (one field-path can carry `required_drift` + `type_mismatch`); documented in `src/API.md`'s `stats` prose so a consumer does not expect them to reconcile.

---

## Next-session starter

> **All three free tools ship — the free tier is feature-complete. The next milestone is the Phase-1 RELEASE, but it is owner-gated; the fully-autonomous alternative is the `context_audit` §4-gap refinements.** `doc_drift` is done and on trunk (PR #65); do not reopen it. Read `CLAUDE.md`, this file, `WORKFLOW.md`, `planning/Roadmap.md` (Phase-1 build order — items 4–6 are the build step / ledger / `npm publish` dry-run), `src/CONTEXT.md` (conventions + the context-budget ledger, now **1023 / ~4000**), and `src/API.md`. Confirm `git rev-parse HEAD` and `npm test` (expect **193**) first.
>
> **Two paths — surface both to the owner and take the owner-gated one to them early:**
>
> 1. **Phase-1 RELEASE (owner-gated, higher value).** The three free tools are all shipped; what remains is `LICENSE` + `THIRD_PARTY_NOTICES.md` final + an `npm publish` dry-run from a fresh checkout. **This is BLOCKED on TBD-2 (confirm each of the five bundled components' license from its own files — caveman still needs `skills/caveman/` path-scoping + a commit pin) and TBD-4 (the ICM reproduce-vs-paraphrase call — the product owner's).** Both need owner rulings / external confirmation, so this is not fully autonomous — **surface the two TBDs to the owner at the top of the session.** Once they resolve: finalize the notices file (rule 4 — each bundled component's block in the same commit), then the `npm publish` dry-run; the release publishes on a semver tag (`ops/CONTEXT.md`).
>
> 2. **`context_audit` §4-gap refinements (fully autonomous).** The three open `/decisions` items — component-manifest detection, test-harness-fixture detection, bare-`docs/**` disposition — each tightens the `orphans` sub-score and is the trigger to **raise the provisional `orphans:1`** weight (TBD-10 stays Open only for that raise). A `context_audit` refinement, its own full loop: `superpowers:brainstorming` → **`/decisions`** (resolve-or-defer; stub new TBDs in `src/TDD.md`) → **`/design-doc`** (to `planning/designs/`) → **`superpowers:writing-plans`** (plan-reviewed) → **`superpowers:executing-plans`** or **`superpowers:subagent-driven-development`** under **`superpowers:test-driven-development`** → **`superpowers:requesting-code-review`** → **`superpowers:finishing-a-development-branch`** (PR, squash, verify content on trunk — Obs 20). Any output-contract change triggers rule 8 (`src/API.md` same commit) and, if a tool definition widens, rule 2 (re-measure the ledger; a test asserts the combined total < ~4000). **Do NOT reopen `context_audit`'s closed TBDs** (10-provisional / 11 / 12-`MIN_FILES` / 14 / 16 / 18 / 19 / 20) or any shipped tool.
>
> Lower-priority: **`doc_drift` v1.1** (TBD-22 canonical self-discovery / TBD-23 orientation walk-test / TBD-24 framework parsing) and **`override_log` TBD-21** (ISO-date validation) — each its own loop, only if demand appears. `.claude/commands/` regenerates only if `prompts/` changes (it should not for a tool).
