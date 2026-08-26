# Decision — directory-route reachability propagation is ROOT-RESTRICTED (originates only from a reached doc)

**Date:** 2026-08-25
**Status:** Resolved (ruling + design/plan amendments; **docs only** — no code, no numbers). **TBD-14 does NOT close on this pass.**
**Decider:** B&A (product owner)
**TBD:** TBD-14 (orphan scope) — remains Open until the loop lands and re-validates
**Surfaced by:** the plan review of `docs/superpowers/plans/2026-08-25-directory-granularity-reachability.md` (its Task 2 Step 4 already routed this here).
**Amends:** `planning/designs/2026-08-25_directory-granularity-reachability-design.md` §3.1

---

## The question the design left open

The TBD-14 design chose a propagation **depth** (directory-only) but never settled propagation **origin** — *whose* directory edge propagates reachability. `recordResolvedTarget` in `graph.ts` fires from **two** call sites: the backtick branch (`graph.ts:110`, `isRoot`-gated — routers only) **and** the markdown branch (`graph.ts:167`, **any** document). So the plan's flat reading would let a **non-root document — even one that is itself unreached — with a markdown link to a bare directory** mark that directory's documents reachable. Reachability from an abandoned doc is not reachability from a routing root.

## The two readings

- **Flat** (the plan's first reading): any resolved directory edge propagates, regardless of whether its source document is reachable. Simpler; and it matches the existing candidate test `underRoutedDir`, which is already non-root-inclusive.
- **Root-restricted** (ruled): a directory edge propagates reachability **only when its source document is reachable from a routing root** — making directory-edge reachability consistent with the existing document-edge DFS, which only expands edges from nodes already in `reached`.

## Ruling — ROOT-RESTRICTED

A directory route propagates reachability only from a **reached** document. Roots are seeded reachable, so a router's directory route always propagates; a non-root document's directory route propagates only once that document is itself reached (via a document edge or a prior directory route). Propagation is therefore folded into the same reachability traversal as document edges, not run as a separate flat pass — one uniform rule: **only reached nodes propagate, by either edge kind.**

### Why — error direction, the deciding axis on every prior trip

**Flat propagation is a silent false-negative mechanism.** A document sitting under a directory that is linked *only* by an abandoned, unreachable non-root document would be marked reachable — so genuine orphan rot goes **unreported**. That is the same masked-rot / silent-swallow direction this chain has refused every time it appeared: TBD-16's loose C1 basename rule (a real broken route silenced by a coincidental same-name file), the CommonMark `<dest>` false-negative regression (fifth trip), and this very design's own depth choice (directory-only rejected full-subtree precisely because a deep tree would silence abandoned documents).

**Root-restriction errs toward a visible false positive** instead: a document that a human might consider reachable via a non-root link is flagged as an orphan, and the user who opens it sees at a glance that it is fine and dismisses it. **Visible false positive over silent false negative is this project's settled tie-breaker**, and it settles this the same way it settled the others.

### The candidacy-asymmetry counter-argument — examined, and it REINFORCES the ruling

The reviewer noted an asymmetry: restricting **propagation** to reached docs while leaving **candidate** determination (`underRoutedDir`) non-root-inclusive means candidacy is generous while propagation is strict. That is real — but examined, it points the same way, not against.

- **Both halves err toward *more* orphans flagged, the visible-FP direction.** Broad candidacy checks *more* documents for orphanhood; strict propagation lets *fewer* things rescue them. Both increase the orphan count in ambiguous cases — the safe, visible direction. An asymmetry that pulled the other way (narrow candidacy, broad propagation) would hide orphans; this one surfaces them.
- **A candidate is only "eligible to be checked."** Being generous about *what to examine* costs nothing but a visible flag the user can dismiss. Being strict about *what counts as reaching it* is the half where the silent-FN risk actually lives. Keeping the generous half broad and the risky half strict is coherent, not contradictory.
- **Root-restriction makes reachability itself uniform.** After the ruling there is exactly one propagation rule — only reached nodes propagate, whether the edge is to a document or to a directory. The apparent asymmetry is between *candidacy* and *reachability*, two different questions; within reachability there is no asymmetry left. Aligning directory-edge propagation with document-edge propagation is the ruling's whole point.

### The exposure is a corner — and that is not an argument for flat

Backtick routing — the dominant real-world convention — is already `isRoot`-gated at its call site, so the only documents this ruling changes are those under a directory linked by a **non-root markdown** span from an unreached document, which is rare. **Small blast radius is not a reason to take the simpler flat reading.** A small corner on the silent-false-negative side is exactly the kind of thing that ships wrong because nobody is forced to look at it — the failure is invisible by construction, so "it barely matters" becomes "it is never noticed." Small-but-wrong-direction is ruled, not waved through; the chain's whole discipline is that the error *direction* decides, independent of the count.

## Consequences

- **Design §3.1 amended:** propagation gates on **reached/root origin** — a directory edge propagates only from a document already reachable; folded into the reachability traversal so the gate is structural (only reached nodes ever propagate).
- **Plan amended:** the propagation basis changes from a flat `routedDirTargets` set to a **per-source** record (each document's directory targets), and propagation is folded into the reachability DFS so it fires only for reached source documents. A **trap-detector test** is added — a non-root markdown link to a directory from an *unreached* document must **not** rescue that directory's documents — alongside a positive test that a *reached* non-root document's directory link **does** propagate (root-restriction is reached-based, not root-only). The existing depth/target guards (T-dir-1/2/3) stay.
- **The plan's red states are re-derived** — the prior review validated the flat implementation's states, now stale under reached-origin gating. Re-validated live at re-review, with the state each red was measured against recorded (state-tagging discipline).
- **TBD-14 stays Open;** `orphans` stays out of TBD-10 weighting until this lands and re-validates. **No number.** `TBD_10_WEIGHTS` / `ROUTING_LAYER_KEYS` untouched. `coverage` untouched (it reads `routedDirs`, which is unchanged).

## Non-goals

Does not change the depth choice (directory-only stands), the directory-target-vs-`routedDirs` distinction, or the categorical exit criterion. Does not touch `coverage`. Sets no threshold or weight number.
