# Decision — tier-2 scope (root-located routers excluded), the accepted drift `null`, and placeholder globality

**Date:** 2026-08-24
**Status:** Resolved (policy + shape; **docs only** — no code, no numbers)
**Decider:** B&A (product owner)
**TBD:** TBD-16 — remains Open; this reshapes the design before the plan is revised
**Surfaced by:** the plan review of `docs/superpowers/plans/2026-08-24-routing-drift-precision.md` (verdict REJECT, 2 CRITICAL + 1 IMPORTANT scope finding). The reviewer applied every proposed edit to a scratch tree, ran the suite at each state, and audited real repos — the findings below are observed runs, not inferences.
**Amends:** `planning/designs/2026-08-24_routing-drift-precision-design.md` §3.1, §3.2, §3.4, §3.5
**Builds on:** `planning/decisions/2026-08-24_routing-drift-precision-and-interim-disposition.md` · `planning/decisions/2026-08-24_d2-d3-superseded-before-implementation.md`

---

## D1 — An all-unanchored router yields `routing_drift: null`, and that is CORRECT

### Evidence

Tier 2 excludes an unanchored reference from **both** the drift numerator and its denominator (design §3.1). The reviewer found the consequence the design did not contemplate: when **every** path reference a router makes is unanchored, the denominator reaches zero, `subscoreFromCount(0, 0)` returns `null`, and — because `resolvedRefsFromRoots === 0` also fires the `routing_unresolved` info finding and the D3 coverage guard — `headlineScore` finds every `ROUTING_LAYER_KEYS` member null and returns `null` too.

Verified on three fixtures, baseline → patched: **`score 25` → `score null`** in each.

That contradicted §3.4 as written, which required `routing_drift` to be **scored-real** after the fix.

### Decision

**Accept the `null`.** A router whose entire reference set is unanchored genuinely **cannot be adjudicated** — there is no population to compute a rate over. Reporting a number there would be the fabrication this tool exists to avoid.

This is the **same logic as the D3 coverage guard** (`2026-08-20_agents-md-router-recognition.md` D3): routers present but the measurement not derivable → `null` ("not assessed"), never a floored or invented value. It is a **data null** in the ordinary sense — an empty population — not the correctness-driven null that D2 would have imposed. `subscoreFromCount`'s existing `n === 0 → null` contract already expresses it; no new mechanism is added.

**§3.4 was over-stated, not the behaviour.** The exit criterion is reworded: `routing_drift` is **scored-real whenever a scoreable population exists**, and `null` **only** when a router's entire reference set is unanchored.

**Scope narrowed by D2 below:** with root-located routers excluded from tier 2, their unresolvable spans count in both numerator and denominator as before, so **only nested routers can empty the denominator at all.**

## D2 — Root-located routers get NO tier 2: strict anchored-or-drift

### Evidence

Design §3.1 bounds the subtree search by "the router's own directory," explicitly because *"a repo-wide search would let any router excuse any path."* For a router sitting at the **repository root** that bound is vacuous — its directory *is* the repo — so a bare filename span is silenced by a same-named `.md` anywhere at all.

Two observed runs (see the quarantine note in D4 — these are **correctness probes**, never threshold inputs):

- One repo carries the identical prose span `` `Data_Dictionary.md` `` in both its root `CLAUDE.md` and a nested `src/CONTEXT.md`. Post-fix the root instance is **silenced** while the nested instance **still reports drift** — same repo, same text, same underlying false positive, **two opposite verdicts decided purely by which router carried it.**
- Another repo's findings drop **30 → 14**, silencing bare `` `SKILL.md` `` spans against dozens of unrelated `skills/*/SKILL.md` files.

That is far past the masked-rot exposure §3.5 accepted, which was scoped to a file surviving **"under that router."** For a root-located router, "somewhere in the repo" is not evidence that the prose meant any particular file.

### Decision

**Tier 2 requires a PROPER subtree bound.** A router located at the repository root has none, so it gets **no tier 2 at all** — strict anchored-or-drift, exactly as today. **Nested routers keep tier 2 unchanged.**

### The definition this turns on — read this before implementing

**"Root-located" means the router's `relPath` contains no `/` — it sits at the repository root.** It does **NOT** mean `isRoot`.

This distinction is load-bearing and easy to get backwards. **In this codebase `isRoot` means "is a router doc," at any depth**, and the backtick branch in `graph.ts` is already gated `if (!doc.isRoot) continue;`. Implementing this decision as "skip tier 2 when `doc.isRoot`" would therefore make tier 2 **never fire — silently deleting the entire fix.** The predicate is about **location**, not router-ness.

### The narrower alternative, considered and not taken

The reviewer offered a softer option: keep tier 2 for root-located routers but require the claimed tail to be **multi-segment**, so a bare `SKILL.md` cannot match while `references/conventions.md` still could. **Not taken** — recorded so it is not re-derived as though it were overlooked. The blanket rule is simpler, has no second threshold-shaped knob in it, and matches the principle that tier 2 is justified only by a *bounded* search. The alternative remains available if a later calibration run shows the cost is material.

### Measured cost, on the pinned corpus only

Splitting run-6's 26 prose-relative false positives by the location of the router that produced them:

| repo | drift findings | root-located router | of which prose-relative | nested | of which prose-relative |
|---|:--:|:--:|:--:|:--:|:--:|
| posthog | 27 | 0 | 0 | 27 | **17** |
| caveman | 29 | 23 | **9** | 6 | 0 |
| superpowers | 1 | 1 | 0 | 0 | 0 |
| icm-architect | 2 | 0 | 0 | 2 | 0 |

**Tier 2 still fixes 17 of 26 — every one of posthog's, the canonical case the design was written around. It gives back 9, all from caveman's root `CLAUDE.md`.** The fix keeps its centre of mass and loses its most dangerous edge.

### Consequence — §3.5 must gain a named class, or the close condition breaks

Those 9 return as drift findings. §3.4's close condition is **categorical**: *every* residual finding must be classifiable into a class §3.5 names as out of scope, or be a verified genuine broken route. "Prose-relative under a root-located router" is not currently named, so re-validation would meet 9 unclassifiable findings and bounce straight back to `/decisions`.

**§3.5 therefore gains it as a named, accepted false positive.** Precedent: `2026-08-20_router-path-drift.md` §33 recorded icm-architect's template false positives the same way, explicitly so they would not be re-diagnosed as a bug later.

## D3 — Placeholder exclusion is GLOBAL, not router-scoped

### Evidence

The reviewer found that the placeholder check's insertion point sits in the **shared** markdown branch, reached by every doc — so it also suppresses `broken_ref` findings in **non-router** docs and shrinks `refsFromNonRoots`. Verified: a non-router doc containing `[tpl](templates/{name}.md)` and `[real](nope.md)` yields `broken_ref: 2` at baseline and `broken_ref: 1` after. Untested, unmentioned in any commit message, and undocumented in `src/API.md`.

### Decision

**Ratify it as global.** §3.2's own reasoning — *"a form-with-a-blank is not a route"* — is independent of **both** the syntax it was written in **and** the kind of document it appears in. A placeholder is not a path anywhere. Scoping the exclusion to routers would mean asserting that `templates/{name}.md` is a real broken link in a non-router doc and not one in a router, which is incoherent.

**This is a ratification, not a reversal** — the behaviour the reviewer found is the behaviour the principle implies. What was wrong was that it happened undeclared, untested and undocumented.

**Scope:** the exclusion applies at the **edge-counting stage**, to any doc. It does **not** reclassify `malformed_link` or `escapes_root`, which are decided earlier and are unaffected.

**The test and the `src/API.md` `broken_ref` line land in the revised plan** (code phase, rule 8) — not here.

## D4 — The out-of-corpus runs are correctness probes and are quarantined

The two repos in D2's evidence are **not** part of the pinned calibration corpus. They were audited to answer a **correctness** question — does the bound behave as the design claims — and they answered it decisively.

**They must not leak into any threshold reasoning.** No number in TBD-10/11/12 may cite them, and **re-validation for TBD-16 is against the pinned nine-repo corpus only** (`planning/calibration/2026-08-24_context-audit-run-6-nine-repo-rerun.md` §0 — same commits, tool the only variable). This is the standing rule that rejected `6000`: a repo that is not a neutral, pinned baseline may expose a bug but may never set a number. The per-router split in D2's cost table comes from the **pinned corpus**, and only from it.

## Consequences

- **Design amended:** §3.1 (the bound + the root-located exclusion), §3.2 (globality), §3.4 (the reworded exit criterion), §3.5 (the new named class, and masked rot now applying to nested routers only).
- **The plan is to be revised and re-reviewed.** These three rulings reshape what it must implement; the 11 remaining mechanical review findings are plan-revision work and are **not** addressed here.
- **TBD-16 stays Open.** It still closes the same way: the fix landing plus re-validation against the pinned corpus under the categorical close condition.
- **No code. No number.** TBD-10/11/12 remain deferred. `TBD_10_WEIGHTS` and `ROUTING_LAYER_KEYS` untouched.

## Non-goals

- Does not re-litigate tier 2's existence, the no-edge rule, the walked-doc-set bound, or the ≥1 match rule. Does not address the mechanical review findings. Does not set a threshold, and does not adopt the multi-segment-tail alternative.
