# Decision — bloat aggregates by the worst root→leaf chain (worst-case, count-free); inline_ratio dropped

**Date:** 2026-08-26
**Status:** Resolved (aggregation shape chosen + inline_ratio dropped; **cutoff NUMBERS remain Open and deferred, rule 7**)
**Decider:** B&A (product owner)
**TBD:** TBD-11 (`context_audit` bloat thresholds) — numbers remain Open and deferred
**Evidence:** `planning/calibration/2026-08-24_context-audit-run-6-nine-repo-rerun.md` §4 (Finding A)
**Forks:** `planning/decisions/2026-08-24_tbd-11-bloat-aggregation-shape.md` (authorised this loop; chose no function), `planning/decisions/2026-08-20_tbd-11-bloat-per-router-not-total.md` (per-router metric ruling — stands, not re-litigated)

---

## Why

The 2026-08-24 record (D2) authorised a build loop to settle **how per-router and per-chain penalties combine into one bounded sub-score without router count dominating**, and named three candidates — normalisation, worst-case, per-chain-only — choosing none. This record chooses.

The defect being fixed (run-6 §4 Finding A): `scoreBloat`'s `penalty` is a **flat SUM over every router**, so router *count* alone drives the score to the floor. caveman (40 routers, mean **1 651** tokens/router) scores **0/n40** while superpowers (1 router, **2 211** tokens) scores **90/n1**; superset (mean 5 082, 3× caveman's) scores 45. The sub-score ranks router **count**, not router **bloat** — the opposite of the standing intent: *bloat is the cost to orient on ONE path, not how many routers a repo has.*

## Decisions

### D1 — Aggregation shape: worst-case root→leaf chain (candidate "worst-case", chosen)

The `bloat` sub-score is driven by the **single heaviest root→leaf routing chain** — the worst one path a reader might have to follow to orient. Aggregation across routers/chains is **worst-case (MAX), never SUM**. Adding more routers cannot inflate the penalty; only a genuinely heavier or deeper path can. This is count-invariant and path-tied, satisfying the 2026-08-20 intent that the aggregate stay tied to a path, not the repo's router census.

- **`normalisation` (mean) rejected.** A mean dilutes one catastrophic router: a repo with a single 15 k-token router on a reader's path and forty tiny ones has a low mean but a real orientation problem on that path. Mean measures *average router health*, not *worst-path cost* — the wrong quantity for "cost to orient on one path".
- **`per-chain-only` rejected on the house tie-breaker (visible FP > silent FN).** Per-chain-only goes **silent** on a lone oversized router sitting mid-chain when that chain's *total* stays under the chain cutoff — a silent false negative. Worst-case keeps a bounded single-router term (D2 below) that catches exactly that case: a visible finding is preferred over a silent miss.

### D2 — The two token terms combine by MAX, not SUM; depth adds

Within the worst-case penalty there are two token-basis terms and one depth-basis term:

- **chain-token term** — from the heaviest root→leaf chain's token sum.
- **single-router-token term** — from the heaviest *individual* router (`router_tokens`), taken as **MAX over routers, never summed**.
- **chain-depth term** — from the deepest root→leaf chain's hop count.

The two **token** terms combine by `max(chain_token_term, single_router_token_term)`, **NOT** their sum. Rationale: the heaviest router almost always *sits on* the worst chain, so summing the two double-counts the same tokens. The single-router term only **tops up** the penalty when a lone router's own weight exceeds what the chain term already captured (the mid-chain-giant case from D1). Depth is a **separate axis** (number of hops to open, not tokens), independent of token weight, so it **adds** to the token penalty rather than max-combining with it.

Net penalty shape (formulas/cutoffs unchanged — see D4):

```
token_penalty = max(chain_token_term, max_over_routers(single_router_token_term))
penalty       = token_penalty + chain_depth_term
subscore      = n === 0 ? null : max(0, 100 - penalty)
```

`n === 0` (no routers measured) stays `null` — not assessed, never a fabricated 100 (structural-confidence invariant, `planning/decisions/2026-08-20_subscore-confidence-signal.md`).

### D3 — `inline_ratio` is dropped from the score entirely (not re-derived, not kept as info)

`INLINE_RATIO_CUTOFF` was flagged for re-derivation by the 2026-08-24 D3. It is **removed as a penalty driver and removed as a finding.**

"Fraction of non-link characters above X" describes **what a router is** — mostly prose with a few paths — not what bloat is. It is broken **by construction**, not by tuning: it fired on 86 of ~117 bloat findings sample-wide and on **8 of 9** repos, including a **262-token** `claude-mem/CLAUDE.md` (ratio 0.86) and superpowers' reference-quality router (0.98). It was also the main engine of the count-domination in Finding A (a +10 flat hit on nearly every router, summed).

- **`re-derive` rejected:** there is no theory of a pathology it catches that `router_tokens` does not. "Large **and** mostly-prose" is already caught by the size term; "small and mostly-prose" is just a healthy router.
- **`keep-as-info` rejected:** a finding that fires on 8/9 repos is noise whether or not it scores. Removing it from the score but leaving it in the findings list would still mislead a reader.

With `inline_ratio` gone, the per-router term reduces to **`router_tokens` alone**.

### D4 — No cutoff NUMBER is set or changed (rule 7)

This loop changes the **aggregation**, not the per-term cutoffs or slopes. The existing TBD-11 stub constants and per-term penalty formulas (`ROUTER_TOKEN_CUTOFF`, `CHAIN_TOKEN_CUTOFF`, `CHAIN_DEPTH_CUTOFF`, and their `min(cap, floor((x-cutoff)/1000)*step)` shapes) are **carried forward unchanged** and stay stubbed and deferred — they are still data-blocked (calibrate only from external hyperlink-routed repos, never from B-A-MCP's own run). `INLINE_RATIO_CUTOFF` and `INLINE_MIN_TOKENS` are **removed** with their metric. Setting any cutoff on top of the fixed aggregation is a later step; fixing the aggregation first is exactly so a number is not baked onto a degenerate base (2026-08-24 D5).

## Consequences

- **Findings vs. subscore decouple.** The findings list still enumerates **every** breaching router and chain (transparency — a repo with five heavy routers should see all five listed; visible FP > silent FN). Only the **subscore aggregation** switches to worst-case. Listing all, scoring the worst.
- Directional re-rank on run-6 (numbers deferred; ordering only): posthog (worst chain 31 427 tokens, depth 5) → low = a real heavy path; caveman (worst chain 7 437) → moderate, **no longer 0** despite 40 routers; superpowers / claude-mem → high. The sub-score now ranks by path cost, not census.
- Touches `src/tools/context-audit/bloat.ts`. The `context_audit` **output JSON schema is unchanged** (same `bloat` sub-score field, same findings array shape), so `src/API.md`'s tool schema is unaffected; the `bloat` prose description is refreshed in the same commit if its wording implies the old flat-sum basis (rule 8). No new tool or parameter → the context-budget ledger (rule 2) is unaffected; re-verified at handoff.
- **caveman's outsized influence flips sign but stays visible:** it was the degenerate 0/n40 case; under worst-case it reads as a moderate, honest score. It remains one of the two TBD-16 drift-residue repos — never silently baked in.

## Non-goals

- Sets **no** cutoff number and re-derives none. Does not touch TBD-10 weights or TBD-12 coverage. Does not change the router-DAG construction (`graph.ts` `routerEdges` already feeds `scoreBloat`; run-6's `chain_depth=5` confirms the edges are live).
