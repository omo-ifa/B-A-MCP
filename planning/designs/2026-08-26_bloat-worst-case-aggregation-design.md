# Design — worst-case-chain aggregation for `bloat` (TBD-11)

| Field | Value |
|---|---|
| **TBD** | TBD-11 (`context_audit` `bloat` sub-score) |
| **Decision** | `planning/decisions/2026-08-26_tbd-11-bloat-worst-case-aggregation.md` |
| **Forks** | `planning/decisions/2026-08-24_tbd-11-bloat-aggregation-shape.md`, `planning/decisions/2026-08-20_tbd-11-bloat-per-router-not-total.md` |
| **Evidence** | `planning/calibration/2026-08-24_context-audit-run-6-nine-repo-rerun.md` §4 |
| **Touches** | `src/tools/context-audit/bloat.ts` (aggregation only) |

## 1. Summary

Change the `bloat` sub-score from a **flat sum of per-router penalties** to a **worst-case aggregate over the heaviest root→leaf routing chain**. Router *count* stops driving the score; only a genuinely heavier or deeper *one path* lowers it. The `inline_ratio` metric is removed entirely. **No cutoff number changes** — this is a shape fix, not a calibration (rule 7).

## 2. Motivation

Run-6 (the first run with a large visible router population) showed the 2026-08-20 per-router ruling is only half-implemented: the *measurement* moved per-router, but the *aggregation* stayed a flat sum over every router. Result — the sub-score ranks router **count**, not router **bloat**:

| Repo | routers | mean tokens/router | bloat (old) |
|---|:--:|---:|:--:|
| caveman | 40 | 1 651 | **0/n40** |
| posthog | 45 | 3 451 | **0/n45** |
| superset | 2 | 5 082 | 45/n2 |
| superpowers | 1 | 2 211 | **90/n1** |

caveman's mean router (1 651) is **lighter** than superpowers' single router (2 211), yet caveman scores 0 and superpowers 90. The intent has always been: *bloat is the cost to orient on ONE path, not how many routers a repo has.* The aggregate must be tied to a path, not to the router census.

## 3. Architecture

### 3.1 The change: score the worst one path, not the sum of all routers

The router→router DAG (`graph.ts` `routerEdges`, already passed into `scoreBloat`) yields, per root→leaf chain, a token sum and a hop depth. The sub-score is driven by the **single heaviest chain** and the **deepest chain** — the worst path a reader might follow to orient. Aggregation across routers and chains is **worst-case (MAX), never SUM**.

`chainMetrics` already computes the max chain-token sum and max chain depth over the DAG (cycle-safe, memoised). No new plumbing is needed; run-6's first-ever `chain_depth=5` (posthog) confirms the edges are live.

### 3.2 The load-bearing choice: MAX-combine the token terms, ADD depth

Three penalty terms, all cutoff formulas carried forward unchanged (§4):

- **chain-token term** — from the heaviest chain's token sum.
- **single-router-token term** — from the heaviest *individual* router (`router_tokens`), taken as **MAX over routers**, never summed.
- **chain-depth term** — from the deepest chain's hop count.

```
token_penalty = max(chain_token_term, max_over_routers(single_router_token_term))
penalty       = token_penalty + chain_depth_term
subscore      = n === 0 ? null : max(0, 100 - penalty)
```

The two **token** terms combine by MAX because the heaviest router almost always *sits on* the worst chain — summing them double-counts the same tokens. The single-router term only **tops up** when a lone router's own weight exceeds what the chain term already captured. Depth is a **separate axis** (files to open, not tokens), so it **adds**. `n === 0` → `null` (not assessed; structural-confidence invariant), never a fabricated 100.

### 3.3 `inline_ratio` removed — metric and finding both

`inline_ratio` ("fraction of non-link characters") describes what a *router* is (mostly prose + a few paths), not what bloat is — broken by construction, not tuning. It fired on 8/9 repos (86 of ~117 findings), including a 262-token router, and was the main engine of the count-domination. It is removed as a penalty driver **and** as a finding; `INLINE_RATIO_CUTOFF` and `INLINE_MIN_TOKENS` are deleted with it. The per-router term reduces to `router_tokens` alone. "Large **and** mostly-prose" is already covered by the size term; "small and mostly-prose" is a healthy router.

### 3.4 Findings vs. subscore decouple

The findings array still enumerates **every** breaching router and chain — a repo with five heavy routers sees all five listed (transparency; visible FP > silent FN). Only the **subscore** switches to worst-case. Listing all, scoring the worst. The `router_tokens`, `routing_chain_weight`, and `routing_chain_depth` findings and their `discriminator` tags are unchanged; the `inline_ratio` finding is gone.

### Deliberately skipped

- **No cutoff re-derivation.** Cutoffs/slopes stay stubbed and deferred, data-blocked on external hyperlink-routed repos (rule 7). A number set on top of a fixed aggregation is a later loop.
- **No DAG change.** `routerEdges` construction in `graph.ts` is untouched.
- **No TBD-10 / TBD-12 change.** Weights and coverage are out of scope.
- **No output-schema change.** Same `bloat` sub-score field and findings-array shape → `context_audit`'s JSON schema in `src/API.md` is unaffected (only the `bloat` prose description is refreshed if it implies the old flat-sum basis, same commit, rule 8).

## 4. Decisions

All settled in `planning/decisions/2026-08-26_tbd-11-bloat-worst-case-aggregation.md`:

- **D1** — worst-case chain shape (mean rejected: dilutes a catastrophic router; per-chain-only rejected: silent on a mid-chain giant).
- **D2** — token terms MAX-combine, depth adds (avoids double-counting the heaviest-router-on-worst-chain).
- **D3** — `inline_ratio` dropped (metric + finding).
- **D4** — no cutoff number set or changed (rule 7).

## 5. Exit criterion

Not a categorical re-validation (that was TBD-14's gate). TBD-11's shape is verified by **unit tests** proving the aggregation is count-invariant and worst-case:

1. Adding N extra small (under-cutoff) routers to a fixture does **not** change the sub-score (count-invariance — the caveman defect).
2. A single oversized router raises the penalty even when no chain total breaches the chain cutoff (the mid-chain-giant case the per-router term exists to catch).
3. Two token terms on the same worst chain do not double-count (MAX, not SUM).
4. Depth contributes independently of token weight.
5. `n === 0` → `null`; no `inline_ratio` finding is ever emitted.

Cutoff numbers stay deferred; these tests bind the **shape**, not the thresholds.

## 6. Docs affected (same-commit rules)

- `src/tools/context-audit/bloat.ts` — the change.
- `src/API.md` — `bloat` description refreshed if it implies flat-sum (rule 8); schema unchanged.
- `src/TDD.md` — TBD-11 row updated with the aggregation ruling; status stays **Open** (numbers deferred), shape-blocker lifted.
- `planning/Roadmap.md` — Phase 1 TBD-11 note updated.
- Context-budget ledger (`src/CONTEXT.md`) — re-verified unchanged (rule 2; no surface change).
