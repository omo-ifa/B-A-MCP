# SESSION_HANDOFF.md

**Purpose.** Verified continuity between Claude Code sessions. Every field is checked from inside the repo, never asserted. When this conflicts with claude-mem recall, this file wins. Updated at every `/handoff`.

---

## Repo state

- **Branch:** `main`. This handoff lands via `docs/handoff-2026-08-20` → PR (WORKFLOW rule: no direct commits to `main`).
- **Feature merges on `main`:** PR #1 (server bootstrap), PR #2 (`context_audit`, `28b294b`), PR #3 (sub-score confidence signal + test-dir coverage severity, `a868697`). All merge commits (not squash) — the rule-4/rule-8 same-commit pairs stay auditable.
- **Working tree:** clean before this handoff (only `SESSION_HANDOFF.md`, `src/TDD.md`, `planning/Roadmap.md` changed by the handoff itself).
- **Build/tests (verified this session on merged `main`):** `npm run build` clean; `npm test` → **50 pass / 0 fail**.

---

## Active design docs

- **`planning/designs/2026-08-18_context-audit-design.md`** — **approved and built.** §3/§4 severity reconciled this line of work (empty root `CLAUDE.md` = `critical`, matching §4 and the shipped code).
- **Decision records (this session's line of work):**
  - `planning/decisions/2026-08-20_subscore-confidence-signal.md` — every sub-score carries `n`; `n=0` → `null` ("not assessed"), never a fabricated 100.
  - `planning/decisions/2026-08-20_test-dir-coverage-severity.md` — test dirs significant at `medium` (`coverage_test`), source at `high` (`coverage`); "test dir" = any path segment exactly `test`/`tests`/`__tests__`/`spec`.
- **`planning/calibration/2026-08-19_context-audit-run-1.md`** — the first dogfood run against B-A-MCP (score 45, uncalibrated). **NOT the README sample.**

---

## Decisions + TBDs

**Resolved this session (partial — structural/policy only, numbers still open):**
- **TBD-10 structural prerequisite** — the confidence/`n` signal (decision record above). Weight NUMBERS remain open.
- **TBD-12 policy sub-question** — test-dir severity (decision record above). Threshold NUMBERS remain open.

**Open TBDs — CURRENT STUB VALUES (do not lose; canonical copy in `src/TDD.md`):**
- **TBD-10** `TBD_10_WEIGHTS` (`src/tools/context-audit/score.ts`): `broken_refs:3, routing_drift:3, orphans:2, coverage:2, bloat:1`. Principle (accuracy > bloat) + structural `n`-signal resolved; **numbers data-blocked**. Do NOT resolve from B-A-MCP's run alone.
- **TBD-11** (`src/tools/context-audit/bloat.ts`): `ROUTING_TOKEN_CUTOFF=4000`, `INLINE_RATIO_CUTOFF=0.85`, `INLINE_MIN_TOKENS=200`, `DEPTH_CUTOFF=4`. **`ROUTING_TOKEN_CUTOFF=6000` was CONSIDERED and REJECTED (2026-08-20):** run-1 proposed 4000→6000, but that number was chosen to stop the tool flagging B-A-MCP's *own* routing layer (4619 tokens) — tautological self-tuning, and one repo can't constrain the top end (needs a genuinely bloated 10k+-token router). **Stub stays 4000.** Inline-ratio/min-tokens/depth: no contrast data → unchanged.
- **TBD-12** (`src/tools/context-audit/coverage.ts`): `TBD_12_MIN_FILES=5`, `TBD_12_SOURCE_EXTS=[.ts,.js,.tsx,.jsx,.py,.go,.rs,.java,.rb]`. Test-policy resolved; threshold numbers data-blocked.
- **Other open TBDs** (see `src/TDD.md`): TBD-1/2 (claude-mem NOTICE; five bundled-component licenses — release-blocking), TBD-4 (ICM reproduce-vs-paraphrase, escalated), TBD-5 (paid price), TBD-7 (Superpowers pin), TBD-8 (launch split), TBD-9 (`doc_drift` scope).

---

## Remaining work

- **Calibration — BLOCKED on user input.** The user must name ≥2–3 **hyperlink-routed** repos (hard filter — backtick-routed repos reproduce the empty-denominator problem): ≥1 with genuinely hyperlinked `CLAUDE.md`/`CONTEXT.md`, ≥1 with a large monolithic `CLAUDE.md` (to constrain TBD-11's top end), one with no context layer at all (zero-doc floor), varied source layouts. Then: run `context_audit` against each → `calibration-run-2/3/4` → resolve TBD-10/11/12 from the fuller data → re-run vs B-A-MCP → README sample. **Do NOT resolve any threshold from B-A-MCP's run alone.**
- **Deferred minor (rides TBD-12 resolution):** per-file `.gitignore` filtering within an otherwise-significant directory (coverage counts a dir's source files without excluding individually-gitignored ones).
- **README** — release-blocking-adjacent; leads with `context_audit` + a real sample; waits for the post-calibration re-run (scorer must stop reporting `calibrated: false`).
- **Legal (release-blocking):** `LICENSE` + `THIRD_PARTY_NOTICES.md` final (TBD-1/2). `ignore` (MIT) already has its notice + Integration_Spec row.
- **Next tool:** `override_log` (Roadmap #2), then `doc_drift` (TBD-9), then the `.claude/commands/` generator, then `npm publish` dry-run.

---

## Context not in the docs

- **B-A-MCP is a poor calibration target for TBD-10/11.** Its routers use backtick code-paths (`` `src/CONTEXT.md` ``), not markdown hyperlinks, so `extractLinks` sees ~0 routing edges → `routing_drift`/`broken_ref` denominators are degenerate. Post-confidence-signal these now report `not assessed (n=0)` instead of a misleading 100. Its own plan/design docs' `[a](./a.md)` example links are read as real `broken_ref`s (11 of run-1's 13). This is why calibration needs hyperlink-routed repos.
- **Watch as a likely v1.1 finding:** if real-world `CLAUDE.md` files commonly route via backtick paths rather than markdown links, that is a **parser coverage gap** in `extractLinks` that no threshold change addresses — potentially more valuable than the thresholds. Surface it across the calibration repos; do not fix it during calibration.
- **Output contract changed** (confidence signal): `subscores` are `{ score: number|null, n: number }` per sub-score; headline `score` is `number|null`. `outputSchema` widened `score` to nullable; standing tool-definition cost re-measured to **252 / ~4000** (`src/CONTEXT.md`).
- **The TBD-12 gate** (`emitCoverageFindings`, renamed from `emitHighFindings`) is off by default; `index.ts` calls `scoreCoverage(root, w, g)` with no opts, so neither `coverage` (high) nor `coverage_test` (medium) fires on the production path.
- **`.claude/commands/` generation still does not exist.** No prompt changed this session → nothing to regenerate (rule 1 is a no-op here).

---

## Next-session starter

Paste-ready prompt for the next session:

> Continue `context_audit` calibration for the B&A MCP server. The tool is built, live, and merged to `main` (PRs #1–#3, 50/50 tests). Two design decisions landed 2026-08-20: the sub-score confidence signal (`n`; empty denominator → "not assessed", not 100) and test-dir coverage severity (`coverage_test`/medium). TBD-10/11/12 thresholds are still stubbed and **must not be resolved from B-A-MCP's own run** (backtick routing → degenerate denominators; `6000` for TBD-11 was already rejected as tautological self-tuning — see `src/TDD.md`).
>
> Read first: `CLAUDE.md`, this `SESSION_HANDOFF.md`, `planning/calibration/2026-08-19_context-audit-run-1.md`, and the two `planning/decisions/2026-08-20_*.md` records.
>
> The user will name ≥2–3 hyperlink-routed calibration repos (≥1 hyperlinked routing, ≥1 large monolithic `CLAUDE.md`, one with no context layer, varied layouts). For each: run `context_audit` (`node -e "import('./dist/src/tools/context-audit/index.js')..."`) and write `planning/calibration/2026-08-20_context-audit-run-N.md` recording the run + observations. Then resolve TBD-10/11/12 from the combined data — record each in a `planning/decisions/YYYY-MM-DD_*.md` and update `src/TDD.md` — re-run against B-A-MCP, and only then write the README sample. Note any backtick-vs-hyperlink routing you observe as a v1.1 parser-gap finding. Use `superpowers:test-driven-development` for any code change, the code reviewers before finishing, and `superpowers:finishing-a-development-branch` to integrate. Do all threshold-touching work on a branch + PR (no direct commits to `main`).

---

## Open overrides

None. (No `/problem-fit` or `/decisions` override was taken; the two 2026-08-20 design decisions were made by the product owner and recorded in `planning/decisions/`.)
