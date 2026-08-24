# Decision — the flat-sum bloat penalty fails the per-router intent; aggregation re-work authorised

**Date:** 2026-08-24
**Status:** Resolved (shape finding + authorisation; **implementation deferred to a separate build loop**; **no number**)
**Decider:** B&A (product owner)
**TBD:** TBD-11 (`context_audit` bloat thresholds) — numbers remain Open and deferred
**Evidence:** `planning/calibration/2026-08-24_context-audit-run-6-nine-repo-rerun.md` §4
**Forks:** `planning/decisions/2026-08-20_tbd-11-bloat-per-router-not-total.md`

---

## Why

The 2026-08-20 record ruled: *"Bloat is how much an agent must load to get oriented on ONE path, not how many docs a repo has,"* and stated that a flat total across all routers **is the wrong shape and is removed as the bloat basis.**

Run-6 is the first run with a genuinely large visible router population, and it shows that ruling is **only half-implemented**. The *metric* was moved per-router (`bloat.ts` computes per-router `tks` and a real root→leaf chain sum). The **aggregation was not**: `penalty` is still accumulated as an unnormalised sum across **every** router, so router *count* alone drives the score to the floor.

| Repo | routers | routing tokens | **mean tokens/router** | bloat |
|---|:--:|---:|---:|:--:|
| **caveman** | 40 | 66 057 | **1 651** | **0/n40** |
| **posthog** | 45 | 155 280 | 3 451 | **0/n45** |
| cal.com | 4 | 17 737 | 4 434 | 10/n4 |
| superset | 2 | 10 164 | **5 082** | 45/n2 |
| Ghost | 7 | 3 510 | 501 | 60/n7 |
| **superpowers** | 1 | 2 211 | **2 211** | **90/n1** |
| claude-mem | 1 | 262 | 262 | 90/n1 |

**caveman's mean router is 1 651 tokens — lighter than superpowers' single 2 211-token router — and it scores 0 while superpowers scores 90.** superset's mean router is **3× caveman's** and it scores 45. The sub-score is ranking router **count**, not router **bloat**. This is run-2's original complaint (a flat total fails a healthy large monorepo) reproduced one level up, against the exact record written to end it.

## Decisions

### D1 — Record that the implementation fails the per-router intent

The 2026-08-20 per-router ruling stands and is **not** re-litigated. What is recorded here is that `scoreBloat`'s **penalty aggregation** does not yet satisfy it: moving the *measurement* per-router while leaving the *aggregation* a flat sum over all routers preserves the defect the record removed. A repo is currently penalised for having many routers even when every one of them is small — the opposite of the stated intent.

### D2 — A shape re-work is authorised as its own build loop

Not designed or coded here. The loop must settle how per-router and per-chain penalties combine into one bounded sub-score without router count dominating (normalisation, worst-case, or per-chain-only are all candidates; **none is chosen here**). Constraint carried forward from 2026-08-20: bloat measures the cost of orienting on **one path**, so the aggregate must stay tied to a path, not to the repo's router census.

### D3 — `INLINE_RATIO_CUTOFF` is flagged for re-derivation

`TBD_11_INLINE_RATIO_CUTOFF = 0.85` is a **constant, not a discriminator**. It produces **86 of ~117** bloat findings sample-wide and fires on **8 of 9** repos, including:

- `claude-mem/CLAUDE.md` — **262 tokens**, ratio 0.86. A 262-token router is the opposite of bloat.
- `superpowers/CLAUDE.md` — ratio 0.98. The reference-quality router in the sample.
- Ghost's `apps/portal/CONTEXT.md` and `gifts/CONTEXT.md` — ratio **1.00**.

A router is *supposed* to be mostly prose with a few paths; "fraction of non-link characters" flags every well-formed router by construction. `TBD_11_INLINE_MIN_TOKENS = 200` is also far too low — it lets a 262-token file qualify as large enough to be "inlining". **Both are flagged for re-derivation in the same loop; neither is re-derived here.** Whether the metric survives at all — versus being replaced or dropped — is part of that loop.

### D4 — The metrics that DO discriminate are recorded

Not to be lost in the re-work: `router_tokens` fires on **26 of 100** routers sample-wide (posthog 18, caveman 5, superset 2, cal.com 1); `chain_depth` fired for the first time ever (posthog, depth 5); `chain_tokens` gives a real spread across the four repos that breach it (caveman 7 437, superset 10 164, cal.com 15 125, posthog 31 427). **These three are the metrics worth carrying weight.** Genuine top-end datapoints now exist for the first time: posthog's root `AGENTS.md` at **9 834** tokens and cal.com's `agents/skills/vercel-react-best-practices/AGENTS.md` at **15 125** tokens.

### D5 — No cutoff number is set, and the stub list is corrected

Numbers stay stubbed and deferred (rule 7). Setting a cutoff on top of a degenerate aggregation would bake the defect in.

`src/TDD.md` previously named `TBD_11_ROUTING_TOKEN_CUTOFF=4000` and `TBD_11_DEPTH_CUTOFF=4` — **neither symbol exists**; the per-router reshape renamed them. Live in `src/tools/context-audit/bloat.ts` as of this date:

```
TBD_11_ROUTER_TOKEN_CUTOFF = 3000     TBD_11_CHAIN_TOKEN_CUTOFF  = 6000
TBD_11_CHAIN_DEPTH_CUTOFF  = 4        TBD_11_INLINE_RATIO_CUTOFF = 0.85
TBD_11_INLINE_MIN_TOKENS   = 200
```

> **`TBD_11_CHAIN_TOKEN_CUTOFF = 6000` is NOT the rejected `6000`.** The rejected number was a **flat-total routing-token** cutoff, proposed in calibration run-1 to stop the tool flagging **B-A-MCP's own** routing layer — tautological self-tuning. This 6000 is a **root→leaf chain sum**: a different metric, on a different basis, arrived at independently. **The rejection stands, untouched.** Read the constants from source; do not trust a value quoted in a tracker (see task-observer observation #13).

## Consequences

- **TBD-11 numbers remain Open and deferred.** The data blocker is now cleared — real top-end datapoints exist — but a **shape** blocker replaces it.
- The re-work will touch `bloat.ts` and may change the `bloat` sub-score's meaning; `src/API.md` updates in that same commit (rule 8), and the context-budget ledger is re-measured if the tool surface changes (rule 2).
- **caveman's outsized influence stays visible:** it is the top-end router-count case here *and* one of the two drift-residue repos in TBD-16. Never silently baked in.

## Non-goals

- Sets **no** cutoff number and re-derives nothing. Does not choose the aggregation function. Does not decide whether `inline_ratio` survives. Does not touch TBD-10 weights.
