# Decision — `orphans`' real cause is routes-to-directories-not-documents; dir-granularity reachability authorised

**Date:** 2026-08-24
**Status:** Resolved (cause identified + authorisation; **implementation deferred to a separate build loop**; no numbers)
**Decider:** B&A (product owner)
**TBD:** TBD-14 (orphan scope) — remains Open until the loop lands
**Evidence:** `planning/calibration/2026-08-24_context-audit-run-6-nine-repo-rerun.md` §7 (TBD-14 row)
**Forks:** `planning/decisions/2026-08-20_orphan-scope-layout-vs-rot.md`

---

## Why

The 2026-08-20 finding recorded superpowers' `orphans 0/n61` as a layout artifact — 43 archival `docs/**` files plus 18 convention-discovered skill support files — and attached an explicit condition: **"Do not fix on one repo. Confirm the pattern across the four approved application repos."** With the `AGENTS.md` fix landed, that confirmation now exists.

`orphans` fires on all four app repos for the first time (it was `null` on 3/4 in run-5, the guards having honestly refused to score):

| Repo | `orphans` sub-score | orphaned / candidates | note |
|---|:--:|---:|---|
| posthog | 3 | 659 / 678 | |
| cal.com | 20 | 175 / 218 | |
| **superset** | **0** | **113 / 113** | **every candidate orphaned — while `coverage` reads 73 on the same repo** |
| Ghost | 69 | 11 / 36 | |

## The cause: reachability is document-granular, but routing is directory-granular

**superset is decisive.** Its 2 routers resolve **26** edges — the routing layer is healthy and `coverage` measures **73** off it — yet **113 of 113** candidate documents are orphaned. The two numbers are not in conflict; they are reading the same routing layer at two different granularities.

superset's routers **route to directories**, not to documents. A backtick span pointing at `superset/mcp_service/` resolves, feeds `routedDirs`, and correctly raises `coverage`. But reachability asks whether each *document* is reachable, and no document is ever named — so every document is unreachable and `orphans` floors to 0.

That is `orphans` scoring a **routing style**, not a broken routing graph. It is a second layout-vs-rot class alongside the one 2026-08-20 recorded:

| class | evidence repo | what `orphans` actually measured |
|---|---|---|
| convention-discovered / archival files | superpowers | a layout choice (`docs/**` archive, directory-convention skill loading) |
| **routes-to-directories-not-documents** | **superset** | **a routing style — routing to a directory rather than enumerating its documents** |

The second class is the more consequential of the two: routing to a directory is a **legitimate and common** convention, not an edge case, and the current model penalises it maximally.

## Decisions

### D1 — Record routes-to-dirs-not-docs as the real cause

The open question in the 2026-08-20 record was framed as a **scope** problem — should orphan scope *exclude* convention-discovered files and dated archival directories, and how, without reading source. Run-6 shows the dominant driver is not scope but **granularity mismatch**: reachability is computed over documents while a large share of real routing is expressed over directories. Excluding file classes would not have fixed superset, whose 113 orphans are ordinary source-adjacent docs under directories that **are** routed.

### D2 — Directory-granularity reachability is authorised as its own build loop

Not designed or coded here. The loop must settle how a resolved edge to a **directory** propagates reachability to the documents within it — and how far (the directory itself only, its immediate children, or its subtree). That depth question is exactly where a new false-negative class could be created: propagating over a deep subtree could mark genuinely-abandoned documents reachable. **No rule is chosen here.**

The 2026-08-20 question (convention-discovered and archival files) is **not** closed by this record and carries into the same loop, now as the secondary class rather than the primary one.

### D3 — `orphans` stays out of the TBD-10 weighting until that loop lands

Consistent with the guard the 2026-08-20 record already set (*"blocks orphans carrying weight in TBD-10"*), and unchanged by run-6 — the evidence base widened from one repo to five, but the sub-score is not yet measuring what it claims. Its numbers may not be weighted into the headline composite until directory-granularity reachability lands and is re-validated against the nine-repo corpus.

> This is an **exclusion pending a correctness fix**, exactly parallel to the correctness-driven `null` that TBD-16 applies to `routing_drift` (`2026-08-24_routing-drift-precision-and-interim-disposition.md` D2). It is **not** a weighting decision and does **not** resolve any part of TBD-10.

## Consequences

- **TBD-14 remains Open**, but its question has changed shape: from "which files should orphan scope exclude" to "at what granularity is reachability computed, and how far does a directory route propagate."
- **TBD-10 is further constrained.** With `routing_drift` contributing a correctness-null (TBD-16) and `orphans` excluded here, `coverage` is currently the only routing-layer sub-score eligible to carry the headline. That narrowness is a **consequence to watch**, not an argument for relaxing either guard: §5 of `2026-08-20_backtick-routing-edges-and-orphans-guard.md` still holds, since a `coverage` measurement (including a floor of 0) is a routing-layer measurement.
- The re-work will touch reachability in `graph.ts`; `src/API.md` updates in that same commit (rule 8).

## Non-goals

- Sets **no** number and no exclusion rule. Does not choose the propagation depth. Does not close the convention-discovered/archival question from 2026-08-20. Does not touch `coverage`, whose directory-granular basis is already correct and is not implicated here.
