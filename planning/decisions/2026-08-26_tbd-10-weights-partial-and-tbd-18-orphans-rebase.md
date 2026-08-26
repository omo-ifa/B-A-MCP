# Decision — TBD-10 weights (partial) + TBD-18 orphans re-base direction

**Date:** 2026-08-26
**Gate:** `/decisions` (Gate 2), owner-ratified (interactive).
**Evidence:** `planning/calibration/2026-08-26_context-audit-run-7-numbers-calibration.md` §4 (run-7 — the first consolidated four-sub-score audit; surfaced the two weighting blockers below).

---

## Decision

**TBD-10 — partial resolution (weights BUILT this session):**
- `coverage: 3` — the cleanest routing-health discriminator across the corpus.
- `bloat: 1` — file/doc hygiene, not routing health (principle: accuracy > bloat).
- `routing_drift: 1` — **down-weighted from the stub 3.** Post-TBD-16 it is saturated at ~100 (near-zero variance on the corpus); a floor-catcher (it still catches a genuine 0, e.g. icm), not a headline driver. A high weight only pulled headlines toward 100 and diluted the discriminating signals.
- `orphans: NOT weighted` — **gated on TBD-18.** Reported in `subscores`, but excluded from the headline until re-based.

**TBD-18 — direction resolved, RECORD-ONLY (no code this session):**
- The decided direction is to **re-base the `orphans` sub-score onto genuine-abandoned rot** (net out the TBD-14 accepted-layout classes) so it scores routing failure rather than layout style. This is a real build (the scorer must recognize the accepted classes) and needs `superpowers:brainstorming` → design first. `orphans` scoring is **untouched** this session; the `orphans` TBD-10 weight stays gated behind TBD-18 landing.

## TBDs resolved

- **TBD-10** → **partially resolved.** `coverage`/`bloat`/`routing_drift` weights are set and built; the `orphans` weight is deliberately unset (gated on TBD-18). TBD-10 stays **Open** for the `orphans` weight only.
- **TBD-18** → **direction resolved (build pending).** Re-base is the chosen direction; the build is a separate loop. TBD-18 stays **Open** until that loop lands + re-validates.

## Context

run-7 is the first run to weight all four shape-clean sub-scores together, and it exposed two blockers the stub weights (`drift:3, orphans:2, coverage:2, bloat:1`) hid:

1. **`routing_drift` saturated.** Scores across meaningful denominators: 100/n26, 100/n406, 100/n17, 100/n34, 97/n368 — only tiny-denom superpowers 75/n4 and icm 0/n1 deviate. Weighting a near-constant-100 signal joint-highest just adds a constant to every headline.
2. **`orphans` layout-dominated.** Of TBD-14's 1 077 residual orphans, only 20 are genuine-abandoned; the rest are accepted layout (route-to-directory-nested, convention/runtime-discovered, dated-archival). The sub-score (`1 − orphaned/candidates`) counts all candidates, so a low `orphans` score measures layout STYLE, not rot.

Note: the shipped stub already had `orphans: 2` despite the TBD-14 record stating "orphans stays out of TBD-10 weighting" — a latent stub/record inconsistency this decision resolves by actually removing orphans from the weighting.

## Options considered

**routing_drift weight:** down-weight to 1 (floor-catcher) · keep high (3) · defer all TBD-10 weights.
- **Chosen: down-weight to 1.** Keeps its floor-catching value (icm's 0 still registers) without letting saturation drag every headline to 100. Keeping it at 3 was rejected as knowingly miscalibrated; deferring all weights was rejected because coverage/bloat are cleanly ready now.

**orphans in the headline:** bound with a low weight (v1) · re-base to genuine-abandoned · defer.
- **Chosen: re-base (direction), record-only.** Bounding with a low weight ships a headline now but leaves the sub-score measuring style — a known defect carried forward; rejected as the permanent answer. Re-base is correct but is a real build, so it is recorded as the direction and gated, not coded here. Until it lands, orphans is simply excluded from the headline (stronger than a low weight — it cannot mislead at all).

## Rationale

The weights track what each sub-score actually measures on real repos: coverage discriminates (weight it highest), bloat is hygiene (low), drift is a saturated floor-catcher (low), and orphans currently measures the wrong thing when weighted (exclude until re-based). This is the same error-class discipline the project applied to run-6 (never weight a signal for what it is not measuring).

## Consequences

- `src/tools/context-audit/score.ts`: `TBD_10_WEIGHTS` → `{ routing_drift: 1, coverage: 3, bloat: 1 }` (typed `Partial<Record<keyof Subscores, number>>`; loop switched to `Object.entries`). **`ROUTING_LAYER_KEYS` → `["routing_drift", "coverage"]`** (orphans removed): with orphans unweighted, leaving it in the guard would let an assessed-but-unweighted orphans pass the "headline rests on a real weighted routing measurement" check and yield a bloat-only headline — the exact hole the guard exists to close. This coherence fix is entailed by de-weighting orphans and is pinned by a test.
- **Behaviour change:** headlines recompute (e.g. superset 66→80 as orphans stops cratering it; claude-mem→40 on coverage 0; icm 50 with drift 0 as floor-catcher). Built under TDD — three new `score.test.ts` tests pin the weight vector, the orphans-doesn't-move-the-headline property, and the orphans-alone-→-null guard (all RED before, GREEN after).
- `src/API.md` updated same commit (rule 8): the headline `score` description notes orphans is reported-but-unweighted and the routing-layer guard is `routing_drift`/`coverage` only. Schema shape unchanged → ledger unchanged (252, rule 2).
- `orphans` stays out of the headline until **TBD-18** re-bases it; the README true-sample stays gated on the full TBD-10 weight vector (i.e. on TBD-18).
