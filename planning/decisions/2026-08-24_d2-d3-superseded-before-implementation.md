# Decision — D2/D3 were superseded before implementation; there is no interim state to restore

**Date:** 2026-08-24
**Status:** Resolved (ratchet ruling — docs only, no code, no numbers)
**Decider:** B&A (product owner)
**Type:** Fast ratchet ruling, not a full Gate 2 re-run. Surfaced at Gate 4 (`writing-plans`) on the TBD-16 design.
**Amends:** `planning/decisions/2026-08-24_routing-drift-precision-and-interim-disposition.md` (D2, D3) · `planning/designs/2026-08-24_routing-drift-precision-design.md` §3.4

---

## Why this record exists

Gate 2 resolved D2 (`routing_drift` contributes a correctness-driven `null` to the headline) and D3 (`routing_path_missing` demoted to `info`, interim and reversible). **Gate 2 is docs-only by design — it writes no code.** Neither measure was ever implemented.

Writing the implementation plan surfaced the consequence. On `main` at `9869d22`:

```
src/tools/context-audit/score.ts:10   routing_path_missing: "high"           <- never demoted
src/tools/context-audit/index.ts:81   routing_drift: subscoreFromCount(...)  <- never nulled
```

So the design's §3.4 exit criterion — *"`routing_path_missing` … restored to severity `high`"* — described flipping back from a state the code was never put into. A plan step reading "restore severity to `high`" against code already at `high` is a **no-op that completes without doing anything**: precisely the latent plan defect that produces a green bar over behaviour nothing exercised.

## Why this needed a record rather than a plan edit

The net code state is identical under either reading, so the temptation was to fix the wording inside the plan and move on. That was rejected. Two of the things at stake are decision-shaped, and an execution plan may not do them alone:

1. It **changes what a decision record asserts happened.** D2/D3 read as "in force," to be "restored." The truth is "decided, superseded before implementation." That is a change of disposition, not a typo.
2. It **rewords a Gate 2 output** — §3.4's paired-restore exit criterion was itself produced by the gate.

This is categorically different from the same-day TBD-13 correction, which was a clerical mismatch inside one tracker row (a Status column disagreeing with its own Resolution text). **Editing what a decision asserts belongs in a decision record, so the reasoning travels.** A future reader must be able to find *why* the restore step disappeared, not merely notice that it did.

## Decisions

### D1 — D2 and D3 are **superseded before implementation**, not restored

The precision fix lands directly on the current code. No interim state ever existed, so there is nothing to restore. D2 and D3 stand as **recorded rulings about what the tool would have had to do had the fix been delayed** — they were correct when made, and they were overtaken by the fix arriving first.

Their substance is unchanged and is **not** re-litigated: `routing_drift` at ~17 % precision must not carry headline weight, and its findings must not render at full severity. The fix satisfies both by removing the cause rather than by managing the symptom.

### D2 — Materialise-then-revert is explicitly rejected

The considered alternative was to implement D2/D3 as decided, then implement the fix, then restore both — making the records literally true at every point.

**Rejected: it manufactures history.** Writing an interim state into the code purely so a record's tense stays accurate, then reverting it in the same plan, ships a state nobody will ever run and adds two commits that exist only to be undone. It also inverts this project's discipline: **correct the record to match reality, never reality to match the record.** The same reasoning that rejected tautological self-tuning applies — do not bend the artifact to flatter the documentation.

### D3 — §3.4's exit criterion is reworded from *restore* to *confirm*

The paired-coherence requirement that §3.4 exists to enforce is **kept in full** — the headline contribution and the finding severity must still be consistent with one another, and a fix that left them inconsistent would still be incomplete. Only the mechanism changes: the two surfaces are **confirmed correct after the fix**, rather than **restored** from a demotion that never happened.

- `routing_path_missing` — confirm it was **never lowered** and stands at `high` post-fix.
- `routing_drift` — confirm it is **scored-real** post-fix (a genuine value, not the correctness-driven `null` D2 would have imposed).

**The end-to-end check the materialise-then-revert option wanted survives**, as a normal assertion in the fix's own tests: after the fix, `routing_path_missing` is `high` **and** `routing_drift` is scored — with no lower-then-raise anywhere.

## Consequences

- `planning/designs/2026-08-24_routing-drift-precision-design.md` §3.4 is amended to the *confirm* framing and carries a pointer here. Its categorical close condition, its paired-coherence requirement, and the rest of the design are **untouched**.
- `planning/decisions/2026-08-24_routing-drift-precision-and-interim-disposition.md` gains a pointer here noting D2/D3's actual disposition.
- `src/TDD.md`'s TBD-16 row records the same, so the tracker does not keep promising a restore that will never occur.
- **TBD-16 still closes the same way:** the fix landing, plus re-validation against the pinned nine-repo corpus, under the categorical close condition. Unchanged.
- No code is written by this record, and **no number is set.** TBD-10/11/12 remain deferred.

## Non-goals

- Does not re-litigate D2/D3's substance, the fix's design, the categorical close condition, or `src/API.md`'s masked-rot disclosure. Does not touch `TBD_10_WEIGHTS` or `ROUTING_LAYER_KEYS`. Sets no threshold.
