# Calibration — TBD-14 re-validation run #2 (pinned nine-repo corpus) — **CLOSE SATISFIED**

**Date:** 2026-08-26
**Tool state:** `main` at `8d7cdbf` (TBD-14 build merged, PR #35; TBD-14 re-validation run #1 merged, PR #37). `npm test` **107/107**, `tsc` clean. **Node v25.2.1.** No code changed this session (classification run).
**Purpose:** Re-run design §3.4's **categorical close condition** after the `/decisions` ruling `planning/decisions/2026-08-26_tbd-14-convention-runtime-class.md` named the unified **`convention/runtime-discovered`** accepted class. This is the run that closes TBD-14. Calibration artifact — **not** the build validation folded into PR #35, and **not** the README sample.
**Verdict:** **CLOSE SATISFIED.** Every one of the **1 077** residual orphaned documents classifies into a §3.4 named accepted class (as amended by the 2026-08-26 ruling). **Zero** residuals reached by a non-enumerated convention; **zero** "should-have-been-reached" fix defects. TBD-14 → **Resolved**; `orphans` becomes weighting-**eligible** (eligibility only — the weight NUMBER stays deferred, §5).

---

## 0. Pinned corpus — no re-clone

Same nine clones under `~/dev/ba-calibration/`, pinned at the run-6 commits (verified unchanged this session): superset `18fc2c6`, posthog `7bd2689`, cal.com `176037d`, Ghost `0cd3280`, superpowers `b36e082`, caveman `a42ef76`, claude-mem `e2d1df5`, one-skill-to-rule-them-all `281f134`, icm-architect `b20fb45`. Harness: `runContextAudit({ path })`, read-only.

---

## 1. Correction to run #1 (PR #37) — the residue total is 1 077, not 1 087

Run #1's record (`2026-08-25_context-audit-tbd-14-revalidation.md`) stated "1 146 → **1 087** (−59)". That is an **arithmetic slip**. The per-repo after-counts it listed sum to **1 077**, and its own residue breakdown (915 named + 162 unnamed) sums to **1 077**, not 1 087. The correct figures, both re-confirmed fresh this session:

| | before (pre-TBD-14 `92b74ed`) | after (`main`) | Δ |
|---|--:|--:|--:|
| superset | 113 | 112 | −1 |
| posthog | 659 | 604 | −55 |
| cal.com | 175 | 170 | −5 |
| Ghost | 11 | 10 | −1 |
| superpowers | 61 | 61 | 0 |
| caveman | 66 | 59 | −7 |
| claude-mem | 61 | 61 | 0 |
| one-skill / icm | 0 | 0 | 0 |
| **total** | **1 146** | **1 077** | **−69** |

The fix rescued **69** documents (not 59). Everything else in run #1 stands: the −55/−7/−5/−1/−1 per-repo deltas were correct; only the two totals (`1 087`, `−59`) were mis-added. Recorded here as a caught correction, per the TBD-16 run #2 precedent.

---

## 2. The correctness check — zero fix defects (the teeth)

For every residual, checked whether its parent directory is a directory-target routed by a **reached** source (`dirTargetsBySrc` ∩ reached). Such a document should have been rescued; if still flagged, the fix is wrong. **Zero across all nine repos.** The directory-only + root-restricted propagation reaches exactly what it should. The residue below is not a fix defect.

---

## 3. The 1 077 residuals — every one classifies

Applying the §3.4 accepted classes as amended by the 2026-08-26 ruling. Convention recognition is by **mechanism** (a named, verified convention reaches the file), never by a bare path prefix.

| class | count | basis |
|---|--:|---|
| **convention/runtime-discovered** | **519** | skill discovery 357 · agent-runtime config 35 · component-manifest 110 · test-harness fixtures 17 |
| **route-to-directory, nested deeper** | 349 | subdir of a routed directory-target; visible-FP floor of the directory-only depth |
| **dated-archival** | 189 | `docs/**`, `**/plans/`, `CHANGELOG/**`, dated filenames — never routed by design |
| **genuine-abandoned** | 20 | real unreferenced standalone docs — the signal the sub-score exists to produce |
| **total** | **1 077** | |

### 3.1 convention/runtime-discovered — the four enumerated conventions, each observed

- **skill discovery (357):** files under a `SKILL.md` directory — superpowers skill-support (18), claude-mem skill dirs (2), and the bulk in posthog (269, `products/*/skills/**`) and cal.com (55, `agents/skills/**`) and caveman (13).
- **agent-runtime config (35):** posthog `.claude/agents|rules/*.md` (24), claude-mem `WARP.md` + `cursor-hooks/*.md` (8), superset `.claude/projects/*/*.md` (2), Ghost `.claude/commands/shadcn-add.md` (1).
- **component-manifest content (110):** cal.com `packages/app-store/*/DESCRIPTION.md`, one per plugin (mandated by `packages/app-store/CONTRIBUTING.md`).
- **test-harness fixtures (17):** caveman `tests/caveman-compress/**` (10, globbed by `skills/caveman-compress/scripts/benchmark.py`); Ghost `ghost/core/test/utils/fixtures/import/**` (7, resolved by `ghost/core/test/utils/fixture-utils.js`). Recognized by the harness that enumerates the directory — **not** by a `test/` path prefix.

### 3.2 genuine-abandoned (20) — audited for hidden conventions, none found

Every genuine-abandoned residual was checked against the enumerated conventions and the filesystem; **none is reached by a machine convention** — each is a real human-authored doc unreferenced by any router:

- superset `INSTALL.md`, `UPDATING.md`, `db_engine_specs/METADATA_STATUS.md`, `mcp_service/ARCHITECTURE.md`, `mcp_service/PRODUCTION.md`
- posthog `AI_POLICY.md`, `COMPROMISES.md`, `rust/capture/OUTPUTS_REFACTOR_PLAN.md`
- cal.com `PERMISSIONS.md`, `headless-routing-to-booking-flow.md`, `packages/coss-ui/migration_guide.md`, `packages/coss-ui/radix_shadcn_migration_guide.md`, `packages/embeds/LIFECYCLE.md`
- Ghost `CONTEXT-MAP.md`, `apps/admin/test-utils/posts-analytics/MSW_USAGE_GUIDE.md`
- caveman `ANNOUNCEMENT.md`, `TRADEMARKS.md`, `mcp/BINARY_LICENSE.md`, `shrink/BINARY_LICENSE.md`
- claude-mem `posthog-self-driving-report.md`

**`MSW_USAGE_GUIDE.md` is the confirmation of Ruling 2's caution:** it sits under a `test-utils/` directory but is a human-read MSW guide, **not** enumerated by any harness, so mechanism-based recognition correctly leaves it a `genuine-abandoned` finding rather than swallowing it under a `test/`-path exclusion. (A handful — `INSTALL.md`, `UPDATING.md`, `BINARY_LICENSE.md`, `TRADEMARKS.md`, `ANNOUNCEMENT.md` — are standard-ish root docs that a future candidate-determination decision *might* treat as furniture; that is out of TBD-14 scope and does not affect this gate — they classify correctly as genuine-abandoned today.)

**No residual is reached by a convention outside the enumerated set.** §3.4's categorical close condition is met.

---

## 4. Close — TBD-14 Resolved

- **Every residual classifies** (519 convention/runtime-discovered + 349 route-to-dir-nested + 189 dated-archival + 20 genuine-abandoned = 1 077). No residual fits no class; no residual is reached by a non-enumerated convention.
- **Zero fix defects** (§2). The directory-granularity build is correct.
- **The `/decisions` ruling's classes did the work:** run #1's 162 unnamed residuals (E 34 + F 110 + G 18) now resolve — 161 into `convention/runtime-discovered` (E→runtime-config, F→component-manifest, G's 17 harness fixtures→test-harness), 1 (`MSW_USAGE_GUIDE.md`) correctly to `genuine-abandoned`.

**TBD-14 → Resolved.** `src/TDD.md` TBD-14 row updated. `orphans` becomes weighting-**eligible** — the exclusion pending a correctness fix is lifted, parallel to TBD-16's null lifting.

---

## 5. Downstream

- **TBD-10** — with TBD-14 closed, `orphans` joins `routing_drift` as weighting-**eligible**, but the weight **NUMBERS stay deferred** (data-blocked; external hyperlink-routed calibration repos only, never B-A-MCP's own run). `coverage` is **no longer the sole** load-bearing headline routing-layer sub-score — `orphans` and `routing_drift` are now eligible too; only `bloat` remains shape-blocked pending **TBD-11**. `TBD_10_WEIGHTS` / `ROUTING_LAYER_KEYS` untouched.
- **TBD-11** — bloat-aggregation shape, authorised/unbuilt — now the next `context_audit` loop.
- **README true-sample** — still gated behind the TBD-10/11/12 numbers. Not this record.

## Non-goals

Sets no threshold or weight number. Does not touch the accepted classes' status (they need no code). Does not change candidate determination, `routedDirs`, or `coverage`. Not the README sample.
