# Decision — TBD-11 bloat is measured PER-ROUTER (and per root→leaf chain), not as a flat total

**Date:** 2026-08-20
**Status:** Shape resolved (numbers still open, data-blocked)
**Decider:** B&A (product owner)
**Relates to:** TBD-11 (`context_audit` bloat thresholds). This resolves the **shape** of the bloat metric. The cutoff **numbers** (`TBD_11_*`) stay stubbed — no number is set here.
**Evidence:** `planning/calibration/2026-08-20_context-audit-run-2-post-parser-fix.md` (caveman).

---

## Context

Run-2 produced the first genuinely large external router set: **caveman**, 23 routers, **45,419** total routing tokens → `bloat` saturated to **0**. But caveman is a legitimately-structured polyglot monorepo; 45,419 / 23 ≈ **under 2,000 tokens per router**. The current `bloat` penalty (`bloat.ts:49`) keys on the **flat total** `routingTokens` across all routers, so it marks a healthy large repo as failing purely for being large.

## Decision

**Bloat is how much an agent must load to get oriented on ONE path, not how many docs a repo has.** Measure:

1. **The size of each router** (per-router token weight) — a single router that is itself huge is bloat.
2. **The total along ONE chain from root to leaf** — the cumulative orientation cost of following one routing path from the root router down to a leaf router. That chain sum, not the whole-repo sum, is what a reader actually pays to orient on a path.

A flat total across all routers is the wrong shape and is **removed** as the bloat basis. Number(s) — per-router cutoff, chain-sum cutoff, inline-ratio, depth — stay stubbed (`TODO: TBD-11`); this record fixes only the metric's shape.

## Does measuring this require anything the walk doesn't already produce?

**Per-router size: NO new data.** `walk` returns each router's `content` and `isRoot`; `tokens.ts` counts it; `scoreBloat` already computes per-router `tks` in its loop (`bloat.ts:30`) — it just currently keeps only the maximum (`topRouter`) and sums the rest into the flat total. Per-router scoring needs no new input, only a change in what the existing per-router numbers feed.

**Root→leaf chain sum: YES — it needs the router→router edge graph, which `walk` does NOT produce.** A chain is a path through "which router routes to which router." That adjacency exists only after link resolution, in `buildGraph`'s internal `edges` map (the subset where both endpoints are `isRoot`). Concretely, implementing chain measurement requires:

- **`buildGraph` to expose a router adjacency** (isRoot → isRoot resolved edges). It builds `edges` today but returns none of it.
- **`scoreBloat` to receive the graph** — its signature is `scoreBloat(walk)`; it would become `scoreBloat(walk, graph)` (or receive a prebuilt router-adjacency).
- **A longest-weighted-path computation** (max cumulative per-router tokens along any root→leaf path) over that router DAG, with **cycle handling** (the router graph can cycle — e.g. two CONTEXT.md files that reference each other — so a visited-set / cap is required).
- The current `depth` proxy (`bloat.ts:43`, `relPath.split("/").length`) is **filesystem-path depth, not chain depth**, and is replaced by the real chain measure.

So: per-router size is free from `walk`; the chain sum is the one piece that needs new plumbing (router adjacency out of `buildGraph` into `scoreBloat`).

## Consequences

- `bloat.ts` changes shape at implementation time (deferred — no code this pass): per-router penalty + per-chain penalty replace the flat-total penalty; `scoreBloat` takes the router adjacency.
- `src/API.md` / `src/CONTEXT.md` (bloat description + ledger if the tool surface changes) update in that same future commit (rules 2/8).
- Cutoff numbers stay stubbed and data-blocked; caveman's per-router (~2,000) and its heaviest chain are the first datapoints, but one repo does not set a number (rule 7).

## Non-goals

- Sets no cutoff number. Does not touch inline-ratio or the (now-superseded) flat-total constant beyond marking it for replacement.
