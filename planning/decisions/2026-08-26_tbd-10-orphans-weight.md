# Decision — TBD-10 `orphans` weight = 1 (provisional, gated on §4-gap detection)

**Date:** 2026-08-26
**Gate:** `/decisions` (Gate 2) — owner-ratified NUMBER (rule 7).
**TBD:** TBD-10 (the `orphans` weight — the last piece of the `context_audit` headline weight vector). `orphans` became weighting-**eligible** when TBD-18 closed (`planning/calibration/2026-08-26_context-audit-tbd-19-20-revalidation.md`).
**Evidence:** the TBD-19/20 re-validation numbers + a per-repo headline-impact run over the pinned nine-repo corpus (below).

---

## Decision

- **`orphans: 1`** added to `TBD_10_WEIGHTS` (`src/tools/context-audit/score.ts`). Final map: **`{routing_drift:1, coverage:3, bloat:1, orphans:1}`**.
- **`"orphans"` added to `ROUTING_LAYER_KEYS`** → `["routing_drift","coverage","orphans"]`. The prior exclusion rationale ("an assessed-but-**unweighted** orphans must not let the guard pass into a bloat-only headline") **dissolves** once orphans carries weight — a weighted orphans is a genuine routing-layer measurement and may satisfy the §5 headline guard like drift/coverage.
- **Provisional.** The weight is recorded as **provisional-gated-on-§4-gap-detection**: its ceiling is the unmodeled §4-gap accepted-layout classes, **not** signal quality. `orphans` becomes **raise-eligible** when the three deferred §4-gap `/decisions` items land (design §9: component-manifest detection, test-harness-fixture detection, bare-`docs/**` disposition). Until then it stays at 1.
- **Only the `orphans` weight changes.** `routing_drift:1`, `coverage:3`, `bloat:1` are untouched.

## Why 1

`orphans` **discriminates** — across the corpus its sub-score ranges **31–92** and moves headlines by up to ±8 (below), unlike `routing_drift` which is saturated at ~100 (near-zero variance, a floor-catcher). A discriminating signal earns weight; deferring it (option "defer") would undersell a real signal and leave the headline vector permanently incomplete.

But `orphans` still carries a **known downward bias**: the §4-gap classes (component-manifest ~110, test-harness fixtures ~17, bare `docs/**`) are counted as genuine-abandoned rot (visible FP by design, TBD-18 §4), so §4-gap-heavy repos are **systematically under-scored** (superset `orphans` = 31). Weighting `orphans` at `coverage`-level (3) would push that unmodeled bias hard into the headline — the same layout-vs-rot conflation TBD-18 spent the loop removing from the *sub-score*, re-entering via the *weight*. **Weight 1 is the largest weight that keeps the bias's headline pull bounded (~±8).** Option `orphans:2` was rejected on exactly this: it roughly doubles the bias's reach (superset 80→66 vs 80→72).

So `orphans:1` sits with `routing_drift` and `bloat` as a bounded contributor; `coverage:3` remains the sole highest — the cleanest routing-health discriminator. The bias is in the **safe direction** (over-penalize = flag more, visible), consistent with the tool's spine, and the provisional framing makes the raise path explicit.

## Headline impact (pinned corpus; orphans added to the guard)

| repo | drift | coverage | bloat | **orphans** | headline before | **headline after (o:1)** |
|---|--:|--:|--:|--:|--:|--:|
| superset | 100 | 73 | 80 | **31** | 80 | **72** |
| posthog | 100 | 87 | 55 | **70** | 83 | **81** |
| cal.com | 100 | 36 | 60 | **47** | 54 | **53** |
| Ghost | 100 | 79 | 100 | **86** | 87 | **87** |
| superpowers | 75 | 100 | 100 | **92** | 95 | **95** |
| caveman | 97 | 89 | 80 | **56** | 89 | **83** |
| claude-mem | 100 | 0 | 100 | **70** | 40 | **45** |
| one-skill | null | null | null | null | null | **null** |
| icm-architect | 0 | null | 100 | null | 50 | **50** |

`orphans` both lowers (superset −8, caveman −6 — real unreachable-doc pressure, partly §4-gap) and raises (claude-mem +5 — its `coverage` is 0 but reachability is decent) headlines; where `orphans` is null (icm, one-skill) the guard/renormalization leave the headline unchanged. No headline is destabilized; the pull is bounded as intended.

## Rejected

- **`orphans:2`** — pushes the unmodeled §4-gap downward bias harder into the headline (superset 80→66); premature until the §4-gap classes are modeled.
- **Defer the number** — undersells a discriminating signal (31–92) and leaves the headline weight vector incomplete indefinitely; the bias at weight 1 is bounded and in the safe direction, so a provisional 1 is better than nothing.
- **`orphans:3` (coverage parity)** — not offered; would let layout style dominate the headline, the TBD-18 failure re-entering via the weight.

## Consequences

- Headlines recompute across the corpus (table above). The README true-sample (a true `runContextAudit` run, gated behind this weight) can now be produced.
- **Rule 8:** `src/API.md` updates in the same build commit — the `score` and `subscores` descriptions no longer say orphans "carries NO weight"; the §5 headline-guard description now lists `routing_drift`/`coverage`/`orphans`.
- **Rule 2:** ledger re-measured (expected unchanged — a weights-map/keys edit is internal, no schema change).
- **Rule 7:** the NUMBER is owner-ratified; no value is guessed.
- **TBD-10 stays Open only for the provisional→final raise**, gated on the three §4-gap `/decisions` items. When they land, re-assess whether `orphans` earns a higher weight on the then-cleaner signal.

## Build

TDD (`superpowers:test-driven-development`): headline-recompute tests (orphans moves the headline when weighted; the guard now passes on an orphans-only routing layer; a null orphans still drops-and-renormalizes) → `src/API.md` same commit (rule 8) → ledger re-measure (rule 2) → `superpowers:requesting-code-review` → `superpowers:finishing-a-development-branch`. Update `src/TDD.md` (TBD-10 row) + `planning/Roadmap.md`.
