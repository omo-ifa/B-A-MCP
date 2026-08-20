# Decision — TBD-13: only broken links in ROUTER docs count toward the score

**Date:** 2026-08-20
**Status:** Policy resolved (implementation deferred; no numbers)
**Decider:** B&A (product owner)
**Relates to:** TBD-13 (`broken_ref` signal quality). Resolves the scoping policy. No weight/number is set.
**Evidence:** `planning/calibration/2026-08-20_context-audit-run-2-post-parser-fix.md`.

---

## Context

Run-2 confirmed `broken_ref` is dominated by **illustrative example links in prose/teaching docs**: superpowers 24 (15 from one skill-authoring doc), claude-mem 160. Any doc that teaches markdown will contain example links, and that is not a repo defect. Meanwhile the tool's core invariant — established for backtick edges — is **the routing layer is what gets scored**.

## Decision

**Only broken links found in ROUTER docs (`isRoot`: `CLAUDE.md`/`CONTEXT.md`) count toward the score.** Broken links in non-router docs are still **reported as `info` findings** but **do not affect the number**. This is the same scoping already applied to backtick edges — the invariant is now consistent across the whole tool: the routing layer is scored; content docs are reported, not graded.

### What this means in the code model (implementation deferred)

The existing split already routes broken links by doc role:
- **Router-doc broken links → `routing_drift`** (scored via the `routing_drift` sub-score). Already router-scoped — unchanged.
- **Non-router-doc broken links → `broken_ref`** (currently scored via the `broken_refs` sub-score).

So this ruling = **demote `broken_ref` to severity `info`, and drop `broken_refs` from the scored sub-scores / headline weighting.** No new "router-scoped broken_refs" sub-score is added — that would duplicate `routing_drift`, which already is exactly "broken links in router docs."

## Side-by-side — how much of the score effect is artifact removal

Run against the five at tool `72a012a`. "Scored router-doc broken links" = `routing_drift` findings; "non-router broken links" = `broken_ref` findings (become `info`).

| Repo | run-2 headline | broken_ref findings (non-router → become info) | router-doc broken links (stay scored, = `routing_drift` findings) | `broken_refs` sub-score (run-2) | headline with `broken_refs` dropped |
|---|:--:|:--:|:--:|:--:|:--:|
| superpowers | 63 | 24 | **0** | 35 / n37 | **74** (+11, artifact removed) |
| caveman | 75 | 0 | **0** | 100 / n118 | **66** (−9, a genuinely clean score removed) |
| claude-mem | 38 | 160 | **0** | 10 / n178 | **49** (+11, artifact removed) |
| task-observer | null* | 0 | 0 | null / n0 | null* (*separate bug — see below) |
| icm-architect | null | 0 | 0 | 100 / n11 | null |

Reading:
- **Artifact removal is real** where the example-link noise lived: superpowers +11, claude-mem +11.
- caveman **drops** 9 because its non-router links were genuinely clean (100) — removing a legitimate high score, not an artifact. This is the honest trade: the sub-score was carrying real signal for caveman and noise for the teaching-doc-heavy repos; the policy call is that **non-router link health is not routing health**, so it leaves the number regardless.
- **Scored router-doc broken links = 0 on all five.** No router in the set has a broken link. Combined with the `routing_drift`-is-toothless finding (see the routing_drift analysis / TBD-10 note), this means that after TBD-13 the broken-link signal **barely affects the score at all**. That is a flagged consequence, not a contradiction: it motivates revisiting what counts as `routing_drift` (a non-resolving path-shaped backtick in a *router* is currently dropped as prose, so a broken backtick route is invisible). Do not resolve that here.

## Consequences

- Implementation (deferred, no code this pass): `broken_ref` severity `high → info`; `broken_refs` removed from `Subscores` and from `headlineScore` weighting; `src/API.md` updates same commit (rule 8). `TBD_10_WEIGHTS` still stubbed — dropping a sub-score is a structural change, not a weight number.
- TBD-13 status → **policy resolved**; the numeric weighting question folds back into TBD-10 (now over four sub-scores).

## Related bug (not TBD-13, surfaced same run)

**task-observer** (no routers) scored headline `null`; a no-context-layer repo must score **broken**, not "not assessed". Tracked in the run-2 doc; code fix deferred. Independent of this ruling.

## Non-goals

- Sets no weight. Does not change what a router-doc broken link scores (that stays `routing_drift`).
