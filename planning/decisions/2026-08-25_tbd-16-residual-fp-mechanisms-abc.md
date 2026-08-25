# Decision — TBD-16 residual FP mechanisms A/B/C: four accepted classes and two authorized shape exclusions

**Date:** 2026-08-25
**Status:** Resolved (six dispositions; **docs only** — no code, no numbers). **TBD-16 does NOT close on this pass.**
**Decider:** B&A (product owner)
**TBD:** TBD-16 — remains Open
**Surfaced by:** the re-validation run (`planning/calibration/2026-08-25_context-audit-tbd-16-revalidation.md`) — its §3.4 categorical gate failed on 7 residual false positives from three unnamed mechanisms. **Sixth ratchet trip.**
**Amends:** `planning/designs/2026-08-24_routing-drift-precision-design.md` §3.5 (scoped)

---

## The problem

The re-validation reproduced the predicted headline (drift 59→28, 17/26 prose-relative fixed, 9 given back) but §3.4 is categorical: every residual must be a §3.5-named accepted class or a verified genuine broken route. Seven residuals fit neither, from three mechanisms §3.5 did not name — **(A)** lexical placeholders, **(B)** prose reference/citation, **(C)** prose-relative under a nested router with the target outside the exact-tail match. Boundary measurement (this session, pinned corpus, counts settled) split each mechanism on its merits. Six dispositions follow.

## The governing distinction — accepted class vs. shape exclusion

§3.5 describes **what the tool actually does**. An **accepted-FP class** is true the moment it is ruled — the tool already produces that FP, and naming it lets re-validation classify it instead of bouncing the gate. A **shape exclusion** is **not yet true** — the tool still flags those spans today; writing them into §3.5 as *handled* would assert behavior the code lacks, the same doc-asserts-nonexistent-behavior trap as the earlier `src/API.md` `<dir>` line (`2026-08-25_placeholder-vs-commonmark-destination-precedence.md`). So the four accepted classes enter §3.5 now; the two shape exclusions get a **forward-reference** (authorized-pending), not an accepted-class entry, and become true only when their build loop lands.

## A — lexical placeholders (2 findings) → **SPLITS**

- **`...` ellipsis** (icm `stages/01_.../CONTEXT.md`) → **SHAPE EXCLUSION** (authorized, pending). A literal `...` segment is unambiguously not a path. **Measured: no real path in any of the nine repos contains `...`** — zero false-negative risk. This is a completeness fix in the lineage of §3.2's bare-extension and glob exclusions: a definition of what a routing path *is by shape*, not a filter.
- **compound/lexical placeholder** (posthog `signals-scout-foo/SKILL.md`) → **ACCEPTED §3.5 class**. `signals-scout-foo` is **indistinguishable from the real `signals-scout-*` family** (30+ real dirs: `-apm`, `-conversations`, …); `foo` is a fill-in-the-blank the prose marks ("Creating a **new** …") and nothing syntactic does. No bare `foo`/`bar`/`example`/`sample` directory exists in the corpus, but that is not the point — the placeholder here is a *compound* that mimics a real name. A shape rule keyed on placeholder words would be an arbitrary word-list with a false-negative risk on any real name of that shape (rule 7). Prose-only marker → accepted, not fixed.

## B — prose reference / citation (3 findings) → **SPLITS**

- **bare filename with no path segment** (posthog `CONTEXT.md` nav-label example; caveman `SKILL.md` file-**type** mention) → **SHAPE EXCLUSION** (authorized, pending). **Measured: no resolving bare-filename (`.md`, no slash) route exists anywhere in the corpus** — "a bare filename is not a route" carries zero measured false-negative. Same lineage as A's `...` — a shape definition.
- **path-shaped provenance citation** (caveman `engine/CLAUDE.md` → `bench/agent/README.md`) → **ACCEPTED §3.5 class, WITH A NAMED LIMITATION.** This citation *has* path segments (`bench/agent/`), so no shape rule reaches it and #5 breaks any "bare = citation" tell. The only signal is the surrounding prose (a parenthetical provenance note), which **the tool does not read**. **Named limitation:** the tool can misread a path-shaped reference written as prose citation as a broken route; distinguishing citation from route needs prose semantics it does not have. This is the citation-vs-route boundary — the tool's foundational "pointing-somewhere vs. mentioning-something" line — and it is accepted, named, not fixed.

## C — prose-relative under a nested router, target outside exact-tail (2 findings) → **SPLITS into opposite legal dispositions**

Surfacing C as a split — two findings under one label with **opposite** legal dispositions — is the ratchet working at the **measurement** layer: had "C" been dispositioned as one mechanism, one of the two would have shipped wrong.

- **C2 — ancestor-located** (posthog `.../features/canvas/AGENTS.md` → `docs/CANVAS-FREEFORM-REACT-PLAN.md`, real file at the ancestor `products/desktop/docs/`) → **ACCEPTED §3.5 class.** The target is **outside** the router's own subtree, up the tree. The only fix is to resolve against ancestors, and ancestor-up-to-root ≈ a repo-wide search — the bound §3.1 **already rejected** ("a repo-wide search would let any router excuse any path"). Parent-only is arbitrary and still a bound change. **There is exactly one legal disposition: accept the class.**
- **C1 — in-subtree exact-tail-miss** (icm `assets/templates/CLAUDE.md` → `setup/questionnaire.md`, real file `assets/templates/questionnaire.md` in the router's **own** dir; tier 2's exact-tail match missed it because the prose prepended a nonexistent `setup/`) → **ACCEPTED §3.5 class.** A within-subtree loosening does *not* touch the bound, so C1 looked narrowly fixable. Measurement killed the fix:
  - **The only rule that reaches #7 is basename-only** (final segment), the maximum-masking variant. A stricter final-2-segment suffix rule matches nothing (the real file has no `setup/` parent), so there is no middle rule — the minimum that fixes C1 is the maximum-masking one.
  - **Yield = 1, non-recurring.** #7 is the only in-subtree exact-tail-miss in the nine repos.
  - **Masking(b) = 4.** The loose rule silences four currently-flagged findings by coincidental basename collision to an *unrelated* same-named file — including a **34-way** `SKILL.md` collision under posthog `products/signals/skills/`. That is the silent-swallow direction the whole chain refuses (§3.4).
  - **Masking(a) = 0** genuine-broken re-excused — the one point in the rule's favor, and not enough: buying one visible FP fix opens a large latent masked-rot surface.

  **Corroboration.** The same loose C1 rule would *also* have masked **A's `...` ellipsis** (→ the router's own `assets/templates/CONTEXT.md`) and **B's #5** (→ `engine/README.md`) by coincidental collision. That basename-in-subtree silences A- and B-class FPs *by accident* is independent confirmation that it is the wrong instrument, and that the A/B **shape/prose** dispositions above — not a looser tier-2 — are the coherent ones.

## Summary of the six dispositions

| mechanism | disposition | where it lands |
|---|---|---|
| A `...` ellipsis | shape exclusion | forward-reference (pending build loop) |
| A compound placeholder (`-foo`) | accepted §3.5 class | §3.5 now |
| B bare filename (`CONTEXT.md`, `SKILL.md`) | shape exclusion | forward-reference (pending build loop) |
| B path-shaped citation (`bench/agent/README.md`) | accepted §3.5 class + named limitation | §3.5 now |
| C2 ancestor-located | accepted §3.5 class | §3.5 now |
| C1 in-subtree exact-tail-miss | accepted §3.5 class | §3.5 now |

## The close path — TBD-16 stays OPEN

TBD-16 does **not** close on this docs pass. Close requires, in order:

1. **A build loop** implementing the two shape exclusions (`...`-segment and bare-filename-with-no-path-segment) — design → `superpowers:writing-plans` → `superpowers:test-driven-development` → code review → `superpowers:finishing-a-development-branch`. The shape exclusions carry their own `src/API.md` edit in that loop (rule 8); **no `src/API.md` change on this pass** (no code changed).
2. **Re-validation run #2** against the pinned nine-repo corpus — the **only** thing that closes TBD-16 under §3.4's categorical gate. After the shape exclusions land, the `...` and bare-filename residuals should disappear; the four accepted classes let run #2 classify their residuals as accepted rather than unclassifiable.

**D2/D3 stay unconfirmed** (routing_drift not scored-real, routing_path_missing not confirmed `high`) until run #2 passes. The four accepted classes need **no code** — they are what lets the next re-validation classify those residuals.

## Consequences

- **§3.5 amended (scoped):** four accepted classes added; two shape exclusions added only as a forward-reference (authorized-pending), explicitly not as handled behavior.
- **`src/TDD.md` TBD-16 row** updated with the six dispositions and the two-step close path.
- **No `src/API.md` change** this pass — no code changed. **No threshold or weight number.** TBD-10/11/12 untouched; `TBD_10_WEIGHTS` / `ROUTING_LAYER_KEYS` not edited.

## Non-goals

Does not implement the shape exclusions (their own build loop). Does not widen tier 2's subtree bound (§3.1 rejected it; C2's disposition depends on that rejection standing). Does not re-open the placeholder globality, the CommonMark `<dest>` handling, tier-2 scope, or the exit-criterion mechanism. Sets no threshold.
