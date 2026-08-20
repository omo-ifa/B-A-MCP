# Decision — sub-score confidence signal (`n`), and no empty-denominator 100

**Date:** 2026-08-20
**Status:** Resolved
**Decider:** B&A (product owner)
**Relates to:** TBD-10 (headline weighting) — this resolves the *structural* prerequisite the first calibration run flagged; the weight **numbers** stay data-blocked until more repos are calibrated.

---

## Context

The first calibration run (`planning/calibration/2026-08-19_context-audit-run-1.md`) produced `routing_drift = 100` on B-A-MCP. That 100 was **not** a verified-clean routing layer — it was `subscoreFromCount`'s "empty population defaults to 100" branch firing because `refsFromRoots = 0` (this repo routes via backtick code-spans, which `extractLinks` does not treat as edges, so there were zero routing edges to check). A `100` that means *"nothing was assessed"* is indistinguishable, to the reader and to the headline-weighting function, from a `100` that means *"assessed and clean"* — and the headline (weighted at 3, the top tier) rewarded the artifact.

## Decision

A sub-score that assessed **nothing** must not report a number.

1. **Every sub-score carries an explicit `n`** — the count of things it actually assessed:
   - `broken_refs.n` = classified edges checked from non-root docs (`refsFromNonRoots`)
   - `routing_drift.n` = classified edges checked from root docs (`refsFromRoots`)
   - `orphans.n` = orphan-candidate docs (`orphanCandidateTotal`)
   - `coverage.n` = significant directories judged (`dirs.length`)
   - `bloat.n` = routing files measured (`isRoot && content !== null` count)
2. **`n = 0` → `score = null`** ("not assessed"), never `100`. The sub-score then **drops out of the weighted mean and the weights renormalize** over the sub-scores that were actually assessed.
3. **The rendered summary says "not assessed" (with `n`)** for a null sub-score — not `N/A` as a bare token, and never a number. A reader must be able to tell "clean" from "nothing to check" at a glance.
4. **The headline is `null` ("not assessed") when *every* sub-score is null** — a repo with nothing to assess does not get a fabricated composite number.
5. **Weights are unchanged.** This is a structural fix to what the score *means*, not a threshold. `TBD_10_WEIGHTS` stays stubbed (`TODO: TBD-10`) pending real calibration data.

## Distinct from the deliberate-zero case

`coverage` still **floors to `0`** when a root `CLAUDE.md` exists but the routing layer references none of the significant directories (`root.method === "claude_md"`, `covered = 0`, `dirs.length > 0`). That `0` is a *real assessed* result (there were dirs to cover and the routing claimed none), not an empty-denominator artifact, so it stays. Only `n = 0` (nothing to assess) becomes `null`.

## Consequences

- Output contract change: `Subscores` becomes `{ [k]: { score: number | null, n: number } }`; `AuditResult.score` becomes `number | null`. `src/API.md` updates in the same commit (rule 8); the standing tool-definition cost is re-measured in `src/CONTEXT.md` (rule 2) because `outputSchema` for `score` changes from `number` to nullable.
- On B-A-MCP, `routing_drift` and `broken_refs` (if their edge counts are 0) will now report `not assessed (n=0)` instead of `100`/inflated values, and the headline will reflect only the sub-scores that had something to assess. This is the intended correction and is why calibration must proceed against **hyperlink-routed** repos, where these denominators are non-zero.

## Why now (before more calibration runs)

The `n` signal changes *what the calibration measures*. Resolving the TBD-10 weight numbers from runs that still conflate "clean" with "not assessed" would bake the artifact into the rubric. The structural fix lands first; the numbers wait for data.
