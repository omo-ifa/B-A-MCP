# Decision — `broken_refs` is removed as a scored sub-score (four sub-scores replace five)

**Date:** 2026-08-20
**Status:** Resolved (output-contract change; implementation deferred to the code pass; no numbers)
**Decider:** B&A (product owner)
**Completes:** `2026-08-20_tbd-13-broken-refs-router-docs-only.md` (which demoted non-router broken links to info). This record takes the final structural step the numbers forced.
**Folds into:** TBD-10 (headline weighting now over four sub-scores).

---

## Why

TBD-13 ruled that only broken links in **router** docs count toward the score. But router-doc broken links are **exactly what `routing_drift` already measures** — same numerator (a router's link pointing at a path that doesn't exist), same source (`isRoot` docs). So a router-scoped `broken_refs` would be the same dimension as `routing_drift`, measured twice. Run-2 made this concrete: **scored router-doc broken links = 0 on all five repos**, because that count *is* `routing_drift`'s count, which was already 0. `broken_refs` has nothing left of its own to measure.

## Decision

**`routing_drift` becomes the single score for broken routing. `broken_refs` is removed** — from the `Subscores` object and from the headline weighting. Every broken link **outside** a router doc is still **reported as an `info` finding** (the user still sees it), it just does not move the number.

**Four sub-scores replace five:** `bloat`, `orphans`, `routing_drift`, `coverage`. `broken_refs` is gone.

## Consequences (output contract — same-commit at implementation)

- `Subscores` (types.ts) loses its `broken_refs` key; `src/API.md`'s `subscores` description and the run-time payload shape change from five to four. This is a **public-contract change** — `src/API.md` updates in the **same commit** (rule 8), and `src/CONTEXT.md`'s context-budget ledger is re-checked (rule 2; `outputSchema` declares `subscores` as a bare object, so the standing cost is unlikely to move, but it is re-measured).
- `broken_ref` findings become severity **`info`** (per the TBD-13 record) — reported, unscored.
- `TBD_10_WEIGHTS` still stubbed; it now ranges over four keys. Removing a sub-score is a **structural** change, not a weight number — no number is set here (rule 7).
- Headline effect measured in the TBD-13 side-by-side: superpowers 63→74, claude-mem 38→49 (artifact removed), caveman 75→66 (a genuinely clean non-router score removed — accepted, since non-router link health is not routing health).

## Non-goals

- Does not delete the `broken_ref` **finding category** (still emitted, at `info`). Does not set any weight.
