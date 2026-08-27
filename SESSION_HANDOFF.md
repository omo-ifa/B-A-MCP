# SESSION_HANDOFF.md

**Purpose.** Verified continuity between Claude Code sessions. Every field below was checked from inside the repo this session, never asserted or carried forward. When this conflicts with claude-mem recall, **this file wins**. Updated at every `/handoff`.

---

## Repo state — verified 2026-08-26

- **`main` HEAD:** `b79fcb8` (`feat(context_audit): weight orphans at 1 in the headline (TBD-10) (#55)`). Working tree **clean**. Branch `main`. (TBD-19/20/18 landed earlier this session at `ab454bf`/#53; the handoff doc at `3c1c9ad`/#54.)
- **Tests:** **131 / 131 pass**, `tsc --noEmit` clean, **Node v25.2.1**. TBD-10 added **+1** over 130 (a null-orphans renormalization test; the three headline tests were updated in place to the new weighted-orphans behavior).
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

### Resolved this session (cont.)

- **TBD-10 `orphans` weight — Resolved (provisional).** Decision `planning/decisions/2026-08-26_tbd-10-orphans-weight.md` (owner-ratified NUMBER, rule 7). `orphans:1` added → `TBD_10_WEIGHTS = {routing_drift:1, coverage:3, bloat:1, orphans:1}`; `"orphans"` added to `ROUTING_LAYER_KEYS`. orphans discriminates (corpus 31–92) so it earns weight; 1 (below `coverage:3`) bounds the §4-gap downward-bias headline pull (~±8). **Provisional — raise-eligible when the three §4-gap `/decisions` items land** (ceiling is §4-gap detection, not signal quality). Built under TDD (131/131), API.md same commit (rule 8), ledger 252 (rule 2). Headlines recompute (superset 80→72, caveman 89→83, claude-mem 40→45); end-to-end verified on the production path.

### Open TBDs

- **TBD-10 — stays Open ONLY for the provisional→final `orphans` raise**, gated on the three §4-gap `/decisions` items (design §9). `coverage:3`/`bloat:1`/`routing_drift:1`/`orphans:1` are the current weights; only the `orphans` raise is pending. The headline weight vector is otherwise **complete**.
- **§4-gap `/decisions` items (design §9):** component-manifest detection, test-harness-fixture detection, bare-`docs/**` disposition — each its own future ruling. **Design §9 item 6 (new):** the D1 nested-under-unreached-directory-target residual silent FN (edge case B) — accepted in v1 (pre-existing, empirically clean, still a visible `orphan` finding); the fix is reached-source-restricted `dirTargets`; re-open only if a corpus surfaces a real casualty.
- **TBD-12** — source-vs-test significance **basis**, `SOURCE_EXTS`, coverage-finding emission still open (`MIN_FILES=5` resolved).
- **TBD-2 / TBD-4 / TBD-5 / TBD-9 / TBD-15** — packaging / notices / pricing / doc_drift scope / v1.1 root.method. Open, untouched.

---

## Remaining work

- **README true-sample — now UNGATED (immediate next deliverable).** The headline weight vector is complete, so a **true `runContextAudit` run** can go in the README. Reference figures from this session's production runs (Node v25.2.1, `main` `b79fcb8`): superset headline **72**, caveman **83**, claude-mem **45**, Ghost **87**, superpowers **95**, posthog **81**, cal.com **53** (icm 50, one-skill null). Re-run live before pasting — never quote these stale. This is **brand/README prose → toggle `normal mode`** (caveman off) for the copy.
- **§4-gap `/decisions` items (design §9)** — component-manifest, test-harness-fixture, bare-`docs/**` detection. Each tightens the `orphans` sub-score and is the trigger to raise the provisional `orphans:1`. Lower priority than the README sample.
- **`override_log`** — the next tool once `context_audit` stops moving (no phase shift).
- **Docs:** all current (API.md 4/4, ledger 252 with a TBD-10 re-measure line, `src/TDD.md` TBD-10/18/19/20 updated, `planning/Roadmap.md` status line updated). Nothing outstanding.

---

## Context not in the docs

- **The calibration corpus is intact at `~/dev/ba-calibration/`** at the pinned run-6 commits (verified unchanged this session): superset `18fc2c6`, posthog `7bd2689`, cal.com `176037d`, Ghost `0cd3280`, superpowers `b36e082`, caveman `a42ef76`, claude-mem `e2d1df5`, one-skill `281f134`, icm-architect `b20fb45`. The re-validation harness (`tbd19-20-revalidation.mjs`) lived in the session scratchpad; reproduction steps + detector totals are in the calibration doc appendix. It classifies each orphan with the exported detectors under the **new** signatures — `isRouteToDirNested(rel, g.routedDirs, g.dirTargets)` and `isAcceptedLayout(rel, {routedDirs, dirTargets, skillDirs})`.
- **Why the two-set D1 is correct and complete (review #2):** the nearest-routing-known rule nets a **strict subset** of the approved `dirTargets` swap, so it cannot add an over-net the swap lacked; `dirTargets ⊆ routedDirs` holds by construction (every dir-target is added to both in `recordResolvedTarget`), so the `routedDirs` scan can never skip a genuine dir-target. Both failure directions in the netting path are visible FPs, except the one accepted residual (edge case B), which still emits a visible `orphan` finding.
- **The 86→4→206 posthog swing:** the old `routedDirs` D1 reported posthog genuine=86 (self-consistent but netting MSW-class docs); the straight `dirTargets` swap collapsed it to 4 (netting the PRD/`docs/internal` class via distant ancestors — the silent FN); the shipped two-set rule settles at 206 (counting the MSW-class docs the old form mis-netted). Higher genuine = the safe (visible-FP) direction; `orphans` carries no weight so zero headline impact.
- **`genuine_abandoned_count` is far above the ~20 true-abandoned (467 corpus-wide) by design** — the detectors deliberately leave the §4-gap classes counted (visible FP). That residual is the input to the TBD-10 weight decision, not a bug.

---

## Next-session starter

> **Produce the README true-sample — a live `context_audit` run, now ungated (the headline weight vector is complete).** Read `CLAUDE.md`, this file, `WORKFLOW.md`, and `src/API.md` (the output shape). Confirm `git rev-parse HEAD` (`b79fcb8`) and `npm test` (expect **131**) before trusting any figure.
>
> This is **README/brand prose → switch to `normal mode` first** (caveman off for the copy; and if the sample text runs through the brand-voice framework, keep it off). **Run the audit LIVE and quote the real output — never paste the stale figures from this handoff.** Decide the sample target with the owner: the cleanest illustration is a real external repo from the pinned corpus at `~/dev/ba-calibration/` (e.g. superset ≈72, caveman ≈83 — re-run to confirm), or B-A-MCP's own tree if a self-audit reads better for the pitch; the tool is the acquisition hook, so the sample should show the four sub-scores + a headline + a few real findings, rendered verbatim from `runContextAudit`. Keep the free/paid boundary intact in the copy (rule 3 — the five prompts + three audit tools are free/keyless; only `export_record` is paid). If any prompt/tool schema is touched, `src/API.md` same commit (rule 8) and re-measure the ledger (rule 2) — but a README sample alone touches neither. Land via **`superpowers:finishing-a-development-branch`** (PR, squash, verify content on trunk — Obs 20).
>
> **Lower-priority follow-ups (not this loop):** the three §4-gap `/decisions` items (design §9 — component-manifest / test-fixture / bare-`docs/**` detection), each of which tightens the `orphans` sub-score and is the trigger to raise the **provisional `orphans:1`** (TBD-10); the design §9 item 6 residual (D1 edge case B); the rest of TBD-12 (source-vs-test significance basis). Then **`override_log`** (the next tool). Do **not** re-litigate the TBD-10/18/19/20 resolutions — they are closed and verified on trunk.
