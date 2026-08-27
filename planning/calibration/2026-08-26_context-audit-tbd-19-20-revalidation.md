# Calibration — TBD-19/20 close re-validation (pinned nine-repo corpus) — **CLOSE SATISFIED**

**Date:** 2026-08-26
**Tool state:** branch `feat/tbd-19-20-detector-basis` (D1 re-based onto the nearest-routing-known-ancestor rule using both `routedDirs` and `dirTargets`; D4b replaced by a structural version-shaped-basename net; `dirTargets` exposed from `buildGraph` with root `""` filtered). `npm test` **130/130**, `tsc` clean. **Node v25.2.1.**
**Purpose:** the design §6 categorical close condition for TBD-18, re-run after resolving the two silent-FN vectors the first re-validation found (`planning/calibration/2026-08-26_context-audit-tbd-18-revalidation.md`): **TBD-19** (D1 basis) and **TBD-20** (D4b disposition). Decision: `planning/decisions/2026-08-26_tbd-19-tbd-20-d1-basis-d4b-disposition.md`.
**Verdict:** **CLOSE SATISFIED.** Fidelity + reconstruction pass on all nine repos; the orphan population is unchanged at **1 077**; **all 20** canonical genuine-abandoned residuals survive (including Ghost `MSW_USAGE_GUIDE.md`, the TBD-19 casualty); the **32** D4b version-shape nets are individually all genuine version archives; and the **2 live posthog PRDs** flip to **counted** (the TBD-20 casualty). No genuine rot is silently netted. TBD-19 + TBD-20 are resolved and TBD-18's close condition is met.

---

## 0. Pinned corpus — no re-clone (Obs 12 control)

Same nine clones under `~/dev/ba-calibration/`, verified unchanged this session at the run-6 commits: superset `18fc2c6`, posthog `7bd2689`, cal.com `176037d`, Ghost `0cd3280`, superpowers `b36e082`, caveman `a42ef76`, claude-mem `e2d1df5`, one-skill-to-rule-them-all `281f134`, icm-architect `b20fb45`. Harness: `runContextAudit({ path })` (production entrypoint) plus `walk`/`buildGraph`/`computeSkillDirs`/`isAcceptedLayout` and the individual detector functions (the real exported code) for per-doc attribution. Read-only per clone.

---

## 1. Per-repo results

| repo | orphan_count | genuine_abandoned_count | netted | orphans.score | orphans.n | fidelity | reconstruction |
|---|--:|--:|--:|--:|--:|:--:|:--:|
| superset | 112 | 78 | 34 | 31 | 113 | ✓ | ✓ |
| posthog | 604 | 206 | 398 | 70 | 678 | ✓ | ✓ |
| cal.com | 170 | 115 | 55 | 47 | 218 | ✓ | ✓ |
| Ghost | 10 | 5 | 5 | 86 | 36 | ✓ | ✓ |
| superpowers | 61 | 5 | 56 | 92 | 61 | ✓ | ✓ |
| caveman | 59 | 40 | 19 | 56 | 91 | ✓ | ✓ |
| claude-mem | 61 | 18 | 43 | 70 | 61 | ✓ | ✓ |
| one-skill-to-rule-them-all | 0 | 0 | 0 | null | 0 | ✓ | ✓ |
| icm-architect | 0 | 0 | 0 | null | 0 | ✓ | ✓ |
| **total** | **1 077** | **467** | **610** | — | — | **9/9** | **9/9** |

**Cross-foot (Obs 17):** `orphan_count` total = **1 077**, identical to the TBD-18 re-val and TBD-14 re-val #2 — the reachability/orphan population is unchanged (the fixes touch only the scored numerator's detector bases, never candidacy or findings). `genuine_abandoned_count` (467) + `netted` (610) = 1 077. ✓

**Fidelity gate (Obs 19):** for every repo, the harness's independently re-derived `count(orphans where isAcceptedLayout == false)` equals both `buildGraph().genuineAbandonedCount` and the production `stats.genuine_abandoned_count`. The per-doc attribution below is therefore faithful to what the tool scored. **9/9 PASS.**

**Reconstruction (§7):** for every repo, `orphans.score == round(100 · (1 − stats.genuine_abandoned_count / orphans.n))` (or both null at n=0). **9/9 PASS.**

**Detector attribution (nets fire; detectors overlap, so these exceed `netted`):** D1 route-to-dir-nested **309**, D2 skill-discovery **357**, D3 agent-runtime **34**, D4a dated-filename **49**, D4b version-shaped basename **32**.

---

## 2. §6.1 — do all 20 genuine-abandoned survive? **YES — 20/20**

Each of the 20 canonical genuine-abandoned residuals (TBD-14 re-val #2 §3.2) was checked against the tool's genuine set (matched by path suffix; superset paths carry the `superset/` prefix). **All 20 are counted** — superset 5/5, posthog 3/3, cal.com 5/5, Ghost **2/2**, caveman 4/4, claude-mem 1/1.

- **Ghost `apps/admin/test-utils/posts-analytics/MSW_USAGE_GUIDE.md` is now COUNTED** — the TBD-18 re-val's single §6.1 failure (19/20) is closed. Under the refined D1, MSW's nearest routing-known ancestor is `apps/admin` (a strict-ancestor **file-parent**, in `routedDirs` via the linked `apps/admin/README.md`, not a directory-target), so D1 does not fire and MSW is scored as genuine-abandoned.

## 3. §6.2 — the version-shape nets, checked individually. **PASS**

**32 docs are netted solely by D4b** (version-shaped basename, no D1/D2/D3/D4a backup) — **all are superset `CHANGELOG/<semver>.md`** release archives (`1.4.1.md … 6.1.0.md`, full 3-component semver). Every one is a genuine per-release version archive; **none is a live doc.** The convention rule that broke on-corpus is gone (no `plans/`/`CHANGELOG/` directory-segment netting), and the structural version-shape rule reproduces exactly the legitimate CHANGELOG nets without the guess.

- **The 2 live posthog PRDs are now COUNTED** — `products/desktop/docs/plans/browser-tabs.md` (`Status: ready-for-agent`) and `.../plans/skills-tab.md` (`Status: Ready to build`), the TBD-18 re-val's §6.2 casualties, are both scored as genuine-abandoned. Two mechanisms now protect them: (a) D4b no longer nets a `plans/` segment (they are not version-shaped, not dated); (b) the refined D1 does not net them either — their nearest routing-known ancestor is the file-parent `products/desktop/docs/plans`, not the distant directory-target `products`.

## 4. The TBD-19 refinement — why the first fix was not enough

The TBD-18 re-val recommended re-basing D1 from `routedDirs` onto `dirTargets`. Building that straight swap and re-running this re-validation surfaced a **second silent FN in the opposite direction**: dropping the `routedDirs` guard let a doc whose immediate parent is a file-parent-routed dir fall through to the ancestor scan and match a **distant** `dirTargets` ancestor *through* the intervening file-parent directories. Measured casualties of the straight swap: the 2 live posthog PRDs (netted via `products` 3 levels up) **plus 84 posthog `docs/internal/**` docs** of the same shape — posthog genuine collapsed to **4** (should be ≥ its 3 canonical). The straight swap **failed §6.2** (PRDs still netted).

The refined D1 keys on the **nearest routing-known ancestor** — the first ancestor in `routedDirs`, scanning up — and nets only if that ancestor is a strict-ancestor **directory-target**. `routedDirs` restores the guard's shielding (a doc whose closest routing context is a file-parent is treated as sitting in an active directory → counted, the safe direction); `dirTargets` removes the MSW over-net (a strict-ancestor file-parent no longer nets). Result: posthog genuine settles at **206** (the MSW-class docs the old `routedDirs` D1 also mis-netted are now correctly counted), and **both failure directions are visible FPs**, never silent FNs. This is the Obs-15 discriminating case — the same deep path nets or not depending on whether its nearest routing-known ancestor is a directory-target — which no single-set rule can express.

## 5. Other checks

- **Findings enumeration unchanged:** every one of the 1 077 unreachable candidates is still an `orphan` finding (`orphan_count` = 1 077, unchanged). The fixes changed only the scored numerator. ✓
- **`orphans` still excluded from the headline** (`TBD_10_WEIGHTS`/`ROUTING_LAYER_KEYS` untouched) — none of the above affects any headline score today. ✓
- **Root `""` guard:** `dirTargets` filters out root `""` (from a rare literal `.` directory route), so D1 can never treat the whole repo as one routed directory. No corpus repo exercises a `.` route (numbers identical with and without the filter), so the guard is defensive; it makes the "excludes root" invariant hold by construction (reviewer Minor #1). ✓
- **§4 named gaps stay counted (by design):** genuine_abandoned_count (467) is far above the ~20 true-abandoned because the detectors deliberately do **not** net the §4 resister classes (component-manifest ~110, test-harness fixtures ~17, bare `docs/**`) — those stay counted as visible FPs pending their own `/decisions` items. This is the intended boundary, not a regression; it is the visible-FP direction and `orphans` carries no weight.

## 6. Verdict and downstream

**CLOSE SATISFIED → TBD-19, TBD-20 RESOLVED; TBD-18's close condition met.** The `orphans` sub-score now scores genuine-abandoned rot with no silent FN in the detector basis. `orphans` becomes weighting-**eligible**; setting the weight is a **separate** `/decisions` (TBD-10, still data-blocked — no number set here), and the README true-sample follows that.

## Non-goals

Sets no threshold or weight number (rule 7). Does not change candidate determination, findings enumeration, `routedDirs`/reachability, or the numerator-only sub-score shape. Not the README sample.

## Appendix — reproduction

Harness `tbd19-20-revalidation.mjs` (session scratchpad): for each pinned repo, `runContextAudit({path})`; independently classify each `orphan` finding with the exported detectors — `isRouteToDirNested(rel, g.routedDirs, g.dirTargets)`, `isSkillDiscovered`, `isAgentRuntimeConfig`, `isTightDatedArchival`, and `isAcceptedLayout(rel, {routedDirs, dirTargets, skillDirs})`; assert re-derived genuine == `g.genuineAbandonedCount` == production `stats.genuine_abandoned_count` (fidelity, Obs 19) and the reconstruction identity; attribute nets by detector; isolate the D4b version-shape-sole nets; confirm the 20 canonical genuine survive and the 2 posthog PRDs are counted. Detector totals: D1 309, D2 357, D3 34, D4a 49, D4b 32.
