# Calibration — TBD-18 orphans re-base categorical re-validation (pinned nine-repo corpus) — **CLOSE NOT SATISFIED**

**Date:** 2026-08-26
**Tool state:** branch `feat/tbd-18-orphans-rebase` at `b6d6ed7` (TBD-18 re-base built via subagent-driven-development, PR pending; 9 commits — D1–D4 detectors + `isAcceptedLayout`, `graph.ts` `genuineAbandonedCount`, `index.ts`/`types.ts` sub-score + `stats.genuine_abandoned_count`, API.md/ledger, plus the R6 root-`SKILL.md` guard). `npm test` **126/126**, `tsc` clean. **Node v25.2.1.**
**Purpose:** Design §6 categorical close condition for TBD-18 — confirm on the pinned corpus that (§6.1) every orphan the re-base moves out of the scored numerator is a true accepted-layout doc and all **20** TBD-14 genuine-abandoned residuals still count, and (§6.2) the **D4b** `plans/`/`CHANGELOG/` nets are individually not genuine rot. Only this closes TBD-18 and unblocks the `orphans` weight (a separate `/decisions`, TBD-10).
**Verdict:** **CLOSE NOT SATISFIED.** The re-base is arithmetically faithful (fidelity + reconstruction pass on all nine repos; the orphan population is unchanged at **1 077**), but the categorical check finds **two confirmed silent-false-negative vectors** — the exact forbidden direction of the design's spine:
1. **§6.1 FAILS — D1 basis over-broad.** `apps/admin/test-utils/posts-analytics/MSW_USAGE_GUIDE.md` (Ghost), one of the 20 canonical genuine-abandoned docs, is **silently netted by D1**. D1 keys on the broad `routedDirs`, which `graph.ts` populates from *file-parent* additions as well as directory-target routes; a router linking `apps/admin/README.md` puts `apps/admin` in `routedDirs`, and D1 then nets a genuine doc three levels below it. 19/20 survive; one silent FN is dispositive.
2. **§6.2 FAILS — D4b `plans/` loose on posthog.** Of 34 D4b-sole nets, 32 (superset `CHANGELOG/<version>.md`) are legitimate version archives, but **2 are live, ready-to-build PRDs** under `products/desktop/docs/plans/` — the precise silent-FN vector §6.2 was written to catch.

**Consequence:** the **build LANDS** (correct as designed, tests green, findings exhaustive, score reconstructable, and `orphans` is still excluded from the headline — zero score impact today). **TBD-18 does NOT close.** Both defects route to `/decisions` as **TBD-19** (D1 basis) and **TBD-20** (D4b disposition). The `orphans` weight (TBD-10) stays gated.

---

## 0. Pinned corpus — no re-clone (Obs 12 control)

Same nine clones under `~/dev/ba-calibration/`, verified unchanged this session at the run-6 commits: superset `18fc2c6`, posthog `7bd2689`, cal.com `176037d`, Ghost `0cd3280`, superpowers `b36e082`, caveman `a42ef76`, claude-mem `e2d1df5`, one-skill-to-rule-them-all `281f134`, icm-architect `b20fb45`. Harness: `runContextAudit({ path })` (production entrypoint) plus `walk`/`buildGraph`/`computeSkillDirs`/`isAcceptedLayout` (the real exported detector functions) for per-doc attribution. Read-only per clone.

---

## 1. Per-repo results

| repo | orphan_count | genuine_abandoned_count | netted | orphans.score | orphans.n | fidelity | reconstruction |
|---|--:|--:|--:|--:|--:|:--:|:--:|
| superset | 112 | 77 | 35 | 32 | 113 | ✓ | ✓ |
| posthog | 604 | 86 | 518 | 87 | 678 | ✓ | ✓ |
| cal.com | 170 | 9 | 161 | 96 | 218 | ✓ | ✓ |
| Ghost | 10 | 1 | 9 | 97 | 36 | ✓ | ✓ |
| superpowers | 61 | 4 | 57 | 93 | 61 | ✓ | ✓ |
| caveman | 59 | 27 | 32 | 70 | 91 | ✓ | ✓ |
| claude-mem | 61 | 18 | 43 | 70 | 61 | ✓ | ✓ |
| one-skill-to-rule-them-all | 0 | 0 | 0 | null | 0 | ✓ | ✓ |
| icm-architect | 0 | 0 | 0 | null | 0 | ✓ | ✓ |
| **total** | **1 077** | **222** | **855** | — | — | **9/9** | **9/9** |

**Cross-foot (Obs 17):** `orphan_count` total = **1 077**, identical to TBD-14 re-val #2 — the reachability/orphan population is unchanged (the re-base touches only the scored numerator, never candidacy or findings). `genuine_abandoned_count` (222) + `netted` (855) = 1 077. ✓

**Fidelity gate (Obs 19):** for every repo, the harness's independently re-derived `count(orphans where isAcceptedLayout == false)` equals both `buildGraph().genuineAbandonedCount` and the production `stats.genuine_abandoned_count`. The per-doc attribution below is therefore faithful to what the tool actually scored (no reproduced-internals drift). **9/9 PASS.**

**Reconstruction (§7):** for every repo, `orphans.score == round(100 · (1 − stats.genuine_abandoned_count / orphans.n))` (or both null at n=0). **9/9 PASS.** The score is reconstructable from output as designed.

**Detector attribution (fires; detectors overlap, so these exceed `netted`):** D1 route-to-dir-nested **647**, D2 skill-discovery **357**, D3 agent-runtime **34**, D4a dated-filename **49**, D4b `plans/`/`CHANGELOG/` **57** (of which **34 are D4b-sole** — netted with no D1/D2/D3/D4a backup). D2 (357) matches re-val #2's skill-discovery (357) exactly; D3 (34) ≈ its agent-runtime (35).

---

## 2. §6.1 — do all 20 genuine-abandoned survive? **NO — 19/20**

Checked each of the 20 canonical genuine-abandoned residuals from re-val #2 §3.2 against the tool's genuine set (note: re-val #2 listed the superset five under package-relative paths; the tool's orphan paths carry the `superset/` package prefix — the same files, matched).

- superset 5/5 counted · posthog 3/3 · cal.com 5/5 · caveman 4/4 · claude-mem 1/1 · **Ghost 1/2**.
- **Silent FN:** `apps/admin/test-utils/posts-analytics/MSW_USAGE_GUIDE.md` (Ghost) is **netted** (excluded from `genuine_abandoned_count`). It has no date → not D4a; it is **D1-sole**.

### Why D1 fires on MSW — the confirmed defect

`isRouteToDirNested(rel, routedDirs)` fires when the doc's immediate parent is not in `routedDirs` but some strict ancestor is. For MSW the routed strict-ancestor is **`apps/admin`**. `apps/admin` is in `routedDirs` **only because Ghost's root `CLAUDE.md`/`AGENTS.md` link the file `apps/admin/README.md`** — and `graph.ts` `recordResolvedTarget` adds a *doc target's parent directory* to `routedDirs`. So `apps/admin` is a **file-parent** entry, not a directory-target route.

Design §D1's intent is "nested below a routed **directory-target**" (the `dirTargetsBySrc → docsByParentDir` propagation's visible-FP floor). The implementation instead keys on the broad `routedDirs`, which also contains every parent directory of every routed *file* (and the root `""` when a root-level file is routed). That broad basis makes D1 accept any doc nested below a directory that merely *contains a linked file* — silently netting genuine rot. This is the whole-branch reviewer's Recommendation #2, now confirmed with a real casualty.

**Scope of the over-fire:** **378** nets are D1-sole (netted only by D1). Of these, **0** are netted by the root `""` ancestor alone (the R6 concern is not the driver here); every D1-sole net has a real non-root routed-ancestor directory — but, as MSW shows, that directory may be in `routedDirs` via a file link rather than a directory route. Only **one** D1-sole net is a *genuine-rot* doc (MSW); the rest are accepted-layout docs (skill/convention/gap classes) for which netting is harmless-to-correct. But one genuine silent FN is enough: §6.1 requires all 20 to survive.

> The correct D1 basis is the **directory-target** set (`dirTargetsBySrc`), which `graph.ts` already computes for reachability but does not expose. Re-basing D1 onto it (instead of `routedDirs`) is a change to D1's input set — a design decision → **TBD-19**.

---

## 3. §6.2 — D4b `plans/`/`CHANGELOG/` nets, checked individually. **FAILS**

34 docs are netted **solely** by D4b (a `plans` or `CHANGELOG` directory segment, no structural/D4a backup). Inspected each:

- **superset `CHANGELOG/<version>.md` (32):** `CHANGELOG/1.4.1.md … 6.1.0.md` — per-release version changelog archives (Apache-licensed release notes). Genuinely archival. **Correct nets.**
- **posthog `products/desktop/docs/plans/browser-tabs.md` and `.../plans/skills-tab.md` (2):** **live, current PRDs**, NOT archival:
  - `browser-tabs.md` — `# PRD: Browser Tabs …`, **`Status: ready-for-agent`**.
  - `skills-tab.md` — `# Skills Tab v2 — Implementation Plan`, **`Status: Ready to build`**, **`Last updated: 2026-06-11`**, owner named.
  - Both are indexed by a sibling `products/desktop/docs/README.md`. A routing audit flagging them as orphans is *correct* (they are real docs the routing layer does not reach); netting them under the `plans/` = archival guess **silently removes live docs from the rot score**.

This is exactly the design §5/§6.2 caution: "a repo that keeps live, must-be-routed docs under a `plans/` directory would make this a silent-FN vector." **Confirmed on posthog.** D4b is convention-tight, not structural, and this corpus breaks it → **TBD-20**.

---

## 4. Other checks

- **R6 root-`SKILL.md` guard:** two repos carry a root-level `SKILL.md` (one-skill-to-rule-them-all, icm-architect), so pre-guard their `skillDirs` would have been `{""}` and netted every doc. Both have **0 orphans** (nothing to net), so the guard's protective effect is not *exercised against rot* on this corpus — but the guard is correct and prevents the whole-repo silent-FN the reviewer identified. Kept.
- **Findings enumeration unchanged:** every one of the 1 077 unreachable candidates is still an `orphan` finding (`orphan_count` = 1 077, unchanged from re-val #2). The re-base changed only the scored numerator. ✓
- **`orphans` still excluded from the headline** (`TBD_10_WEIGHTS`/`ROUTING_LAYER_KEYS` untouched) — so none of the above affects any headline score today. ✓

---

## 5. Verdict and downstream

**TBD-18 build → LANDS** (the re-base is correct as designed; the two defects are in detector *breadth/basis*, resolvable without reverting the numerator-only shape or the `stats.genuine_abandoned_count` surfacing). **TBD-18 → stays Open (close condition not met).**

- **TBD-19 (new)** — **D1 route-to-dir-nested basis.** Re-base D1 onto directory-**target** routes (`dirTargetsBySrc`), not the broad `routedDirs` (which includes file-parent and root `""` entries). Confirmed silent FN: Ghost `MSW_USAGE_GUIDE.md`. Blocks the `orphans` weight.
- **TBD-20 (new)** — **D4b `plans/`/`CHANGELOG/` disposition.** Confirmed loose on posthog (live PRDs under `plans/`). Options (none chosen): drop D4b; tighten (e.g. require a dated filename or a version-shaped `CHANGELOG/` sibling set); keep with a documented corpus carve-out. Blocks the `orphans` weight.
- **TBD-10** — the `orphans` weight stays gated behind TBD-18 (now behind TBD-19 + TBD-20). No number set.
- **README true-sample** — still gated (behind the weight, behind this).

## Non-goals

Sets no threshold or weight number (rule 7). Does not change candidate determination, findings enumeration, `routedDirs`, or the numerator-only sub-score shape. Not the README sample. Does not itself fix D1/D4b (design decisions → TBD-19/20).

## Appendix — reproduction

Harness `tbd18-revalidation.mjs` (session scratchpad): for each pinned repo, run `runContextAudit({path})`; independently classify each `orphan` finding with `isAcceptedLayout(rel, {routedDirs: buildGraph().routedDirs, skillDirs: computeSkillDirs(walkedDocs)})`; assert re-derived genuine == `stats.genuine_abandoned_count` (fidelity, Obs 19); split nets by detector; isolate D4b-sole nets. Detector totals: D1 647 (D1-sole 378, root-only 0), D2 357, D3 34, D4a 49, D4b-any 57, D4b-sole 34.
