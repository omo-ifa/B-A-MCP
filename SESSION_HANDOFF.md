# SESSION_HANDOFF.md

**Purpose.** Verified continuity between Claude Code sessions. Every field below was checked from inside the repo this session, never asserted or carried forward. When this conflicts with claude-mem recall, **this file wins**. Updated at every `/handoff`.

---

## Repo state — verified 2026-08-26

- **`main` HEAD:** `ab454bf` (`fix(context_audit): TBD-19/20 detector-basis — close TBD-18 (orphans genuine-abandoned) (#53)`). Working tree **clean**. Branch `main`.
- **Tests:** **130 / 130 pass**, `tsc --noEmit` clean, **Node v25.2.1**. TBD-19/20 added **+4** over the prior 126 (accepted-layout: D1 + D4 tests replaced in place, no net add; graph: +4 — `dirTargets` exposure, MSW end-to-end, PRD end-to-end, `''`-exclusion).
- **Merge verification (Obs 20):** PR #53 landed by **squash**; verified by **content on trunk** (the 3-arg `isRouteToDirNested`, `VERSION_BASENAME`, the `dirTargets` `''` filter, and the API.md `tight dated/versioned-archival` rename all present; the two new `planning/` docs exist; suite re-run on `main` = 130) — never by branch-SHA ancestry (`--is-ancestor` fails by design on a squash).
- **Open PRs: none.** `feat/tbd-19-20-detector-basis` merged and deleted.
- `src/API.md` parses (**4/4** JSON blocks) and matches the code (documents `stats.genuine_abandoned_count`, the four accepted-layout classes incl. `tight dated/versioned-archival`, and the reconstruction identity). No `src/ERD.md` (no database). **Context-budget ledger = 252 / ~4000** (rule 2 — re-measured this session, unchanged; the D1/D4 changes are internal to `buildGraph`/`accepted-layout`, no tool-definition or `outputSchema` change). `prompts/` untouched → `.claude/commands/` not regenerated (rule 1).

---

## Active design doc

- **TBD-18 — `orphans` genuine-abandoned re-base:** `planning/designs/2026-08-26_orphans-genuine-abandoned-rebase-design.md` — **approved + BUILT + CLOSED.** Amended this session (§D1 to the nearest-routing-known-ancestor rule, §D4 to the structural version-shape, §5 table, §6.2, §7, §9, and the new edge case B). Its §6 close condition is now **satisfied** (see re-validation below).
- **Plan (executed):** `docs/superpowers/plans/2026-08-26-tbd-19-20-detector-basis.md` — 3 TDD tasks + verify, executed inline; Task 2 carries a "superseded at re-validation" note (the straight `dirTargets` swap was refined to the two-set rule).
- **Re-validation record:** `planning/calibration/2026-08-26_context-audit-tbd-19-20-revalidation.md` — the categorical close run (verdict: **CLOSE SATISFIED**).

---

## Decisions + TBDs

### Resolved this session

- **TBD-19 (D1 basis) — Resolved.** Decision `planning/decisions/2026-08-26_tbd-19-tbd-20-d1-basis-d4b-disposition.md` (§19.1–19.3 + "Re-validation finding"). D1 re-based off the over-broad `routedDirs`. The pre-registered straight swap to `dirTargets` **re-validated to a second silent FN** (a file-parent-parented doc matched a distant `dirTargets` ancestor through intervening file-parents — the live posthog PRDs, +84 `docs/internal/**`). Shipped rule: **nearest-routing-known-ancestor**, `isRouteToDirNested(rel, routedDirs, dirTargets)` nets iff the first ancestor in `routedDirs` is a strict-ancestor dir-target; root `""` filtered from `dirTargets`.
- **TBD-20 (D4b disposition) — Resolved.** Same decision record (§20.1–20.3). Dropped the `plans/`/`CHANGELOG/` directory-segment convention (a confirmed silent-FN vector — live PRDs) for a structural version-shaped-basename net `^v?\d+\.\d+(\.\d+)+$`. `src/API.md` class-name phrase → `tight dated/versioned-archival` (rule 8, same commit).
- **TBD-18 — Resolved (close condition met).** The re-validation SATISFIED §6: fidelity 9/9, reconstruction 9/9, all **20/20** canonical genuine survive (MSW counted), the **32** D4b version-shape nets are all superset `CHANGELOG/<semver>.md` archives, both live posthog PRDs counted; orphan population unchanged at **1 077** (467 genuine + 610 netted). **`orphans` is now weighting-eligible.**
- **task-observer Obs 23 + 24 logged** (`~/.claude/projects/<id>/skill-observations/log.md`, both OPEN): #23 — a design's "structural / no silent-FN" claim is only as strong as the exact set the predicate keys on (name the set, not the concept); #24 — fixing one false-accept by replacing a predicate's set can delete a guard that prevented a *different* false-accept — re-validate both directions. Backlog now **3 OPEN** (22, 23, 24).

### Open TBDs — what's now in front of the `orphans` weight

- **TBD-10 — `orphans` weight NUMBER only.** `orphans` is now weighting-**eligible** (all four sub-scores eligible); the weight number is **still deferred / data-blocked**. Its raw sub-score still carries §4-gap noise (component-manifest ~110, test-fixture ~17, bare `docs/**`), so the weight must be set with that residual in mind. `TBD_10_WEIGHTS` (`{routing_drift:1, coverage:3, bloat:1}`) and `ROUTING_LAYER_KEYS` (`["routing_drift","coverage"]`) are **not** yet edited — adding `orphans` is the next `/decisions`.
- **§4-gap `/decisions` items (design §9):** component-manifest detection, test-harness-fixture detection, bare-`docs/**` disposition — each its own future ruling. **Design §9 item 6 (new):** the D1 nested-under-unreached-directory-target residual silent FN (edge case B) — accepted in v1 (pre-existing, empirically clean, still a visible `orphan` finding); the fix is reached-source-restricted `dirTargets`; re-open only if a corpus surfaces a real casualty.
- **TBD-12** — source-vs-test significance **basis**, `SOURCE_EXTS`, coverage-finding emission still open (`MIN_FILES=5` resolved).
- **TBD-2 / TBD-4 / TBD-5 / TBD-9 / TBD-15** — packaging / notices / pricing / doc_drift scope / v1.1 root.method. Open, untouched.

---

## Remaining work

- **TBD-10 `orphans` weight at `/decisions`** — the only piece left in the `context_audit` headline weight vector. Then the **README true-sample** (still gated behind the weight, behind this). Data-blocked; needs the owner's ratification of a number and the §4-gap noise level in mind.
- **`override_log`** — the next tool once `context_audit` stops moving (no phase shift this session).
- **Docs:** all current (API.md 4/4, ledger 252, `src/TDD.md` TBD-18/19/20 Resolved + TBD-10 updated, `planning/Roadmap.md` status line updated). Nothing outstanding.

---

## Context not in the docs

- **The calibration corpus is intact at `~/dev/ba-calibration/`** at the pinned run-6 commits (verified unchanged this session): superset `18fc2c6`, posthog `7bd2689`, cal.com `176037d`, Ghost `0cd3280`, superpowers `b36e082`, caveman `a42ef76`, claude-mem `e2d1df5`, one-skill `281f134`, icm-architect `b20fb45`. The re-validation harness (`tbd19-20-revalidation.mjs`) lived in the session scratchpad; reproduction steps + detector totals are in the calibration doc appendix. It classifies each orphan with the exported detectors under the **new** signatures — `isRouteToDirNested(rel, g.routedDirs, g.dirTargets)` and `isAcceptedLayout(rel, {routedDirs, dirTargets, skillDirs})`.
- **Why the two-set D1 is correct and complete (review #2):** the nearest-routing-known rule nets a **strict subset** of the approved `dirTargets` swap, so it cannot add an over-net the swap lacked; `dirTargets ⊆ routedDirs` holds by construction (every dir-target is added to both in `recordResolvedTarget`), so the `routedDirs` scan can never skip a genuine dir-target. Both failure directions in the netting path are visible FPs, except the one accepted residual (edge case B), which still emits a visible `orphan` finding.
- **The 86→4→206 posthog swing:** the old `routedDirs` D1 reported posthog genuine=86 (self-consistent but netting MSW-class docs); the straight `dirTargets` swap collapsed it to 4 (netting the PRD/`docs/internal` class via distant ancestors — the silent FN); the shipped two-set rule settles at 206 (counting the MSW-class docs the old form mis-netted). Higher genuine = the safe (visible-FP) direction; `orphans` carries no weight so zero headline impact.
- **`genuine_abandoned_count` is far above the ~20 true-abandoned (467 corpus-wide) by design** — the detectors deliberately leave the §4-gap classes counted (visible FP). That residual is the input to the TBD-10 weight decision, not a bug.

---

## Next-session starter

> **Set the `orphans` weight (TBD-10) — the last piece of the `context_audit` headline weight vector.** Read `CLAUDE.md`, this file, `WORKFLOW.md`, `src/TDD.md` (TBD-10 row + the now-Resolved TBD-18/19/20), and the re-validation record `planning/calibration/2026-08-26_context-audit-tbd-19-20-revalidation.md`. Confirm `git rev-parse HEAD` (`ab454bf`) and `npm test` (expect **130**) before trusting any figure; read `TBD_10_WEIGHTS`/`ROUTING_LAYER_KEYS` from `src/tools/context-audit/score.ts`.
>
> `orphans` is now weighting-**eligible** but its raw sub-score still carries §4-gap noise (component-manifest / test-fixture / bare-`docs/**`, ~127 corpus docs counted as visible FP). So the weight is a **judgment call with data, at `/decisions`** (Gate 2): either set a **low** `orphans` weight now (bounding the §4-gap pull) and add it to `TBD_10_WEIGHTS` + `ROUTING_LAYER_KEYS`, **or** defer the number until one or more §4-gap `/decisions` items (design §9 — component-manifest, test-fixture, bare-`docs/**`) tighten the sub-score. **No weight NUMBER is set without owner ratification (rule 7).** If a number is set, build it under **`superpowers:test-driven-development`** (a weights-map + `ROUTING_LAYER_KEYS` change with headline-recompute tests), update `src/API.md` in the same commit (rule 8 — the orphans-carries-weight sentence + the §5 headline guard), re-measure the ledger (rule 2), run **`superpowers:requesting-code-review`**, and land via **`superpowers:finishing-a-development-branch`** (PR, squash, verify content on trunk — Obs 20). Then the **README true-sample** (a true `runContextAudit` run, gated behind the weight). Do **not** touch findings enumeration, candidate determination, or the numerator-only `orphans` shape (out of scope). Update `src/TDD.md` + `planning/Roadmap.md` after. The design §9 residual (D1 edge case B) and the rest of TBD-12 are separate, lower-priority `/decisions` items — not this loop.
